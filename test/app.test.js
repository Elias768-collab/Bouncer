import test, { before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import jwt from "jsonwebtoken";
import { slidingWindow } from "../src/algorithms/slidingWindow.js";

import app from "../src/app.js";
import { redisClient } from "../src/redis/client.js";

before(async () => {
    // Wait for Redis to connect before running Redis-dependent tests.
    if (redisClient.isReady) {
        return;
    }

    await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            redisClient.off("ready", onReady);
            reject(new Error("Redis did not become ready within 10 seconds."));
        }, 10_000);

        const onReady = () => {
            clearTimeout(timeout);
            resolve();
        };

        redisClient.once("ready", onReady);
    });
});


beforeEach(async () => {
    // Reset the dedicated test database before every test
    await redisClient.flushDb();
});

after(async () => {
    await redisClient.quit();
});

test("guest request receives the configured rate-limit headers", async () => {

    const response = await request(app).get("/");

    assert.equal(response.status, 200);
    assert.equal(response.body.message, "Bouncer API is running");
    assert.match(response.body.clientKey, /^ip:/);

    assert.equal(response.headers["x-ratelimit-limit"], "10");
    assert.equal(response.headers["x-ratelimit-remaining"], "9");
    assert.ok(response.headers["x-ratelimit-reset"]);
});

test("guest request is rejected after reaching the rate limit", async () => {

    for (let i = 0; i < 10; i++) {
        const response = await request(app).get("/");
        assert.equal(response.status, 200);
    }

    const blockedResponse = await request(app).get("/");

    assert.equal(blockedResponse.status, 429);
    assert.equal(
        blockedResponse.body.message,
        "Too many requests. Please try again later."
    );
    assert.equal(blockedResponse.headers["x-ratelimit-limit"], "10");
    assert.equal(blockedResponse.headers["x-ratelimit-remaining"], "0");
    assert.ok(blockedResponse.headers["retry-after"]);
});

test("request with an invalid JWT is rejected", async () => {
    const response = await request(app)
        .get("/")
        .set("Authorization", "Bearer invalid.token.value");

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Invalid or expired token");
});

test("request with an expired JWT is rejected", async () => {
    const expiredToken = jwt.sign(
        {
            sub: "test-user-001",
            tier: "free",
            exp: Math.floor(Date.now() / 1000) - 60
        },
        process.env.JWT_SECRET,
        { algorithm: "HS256" }
    );

    const response = await request(app)
        .get("/")
        .set("Authorization", `Bearer ${expiredToken}`);

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Invalid or expired token");
});

test("free-tier user receives the configured rate limit", async () => {
    const token = jwt.sign(
        {
            sub: "free-test-user",
            tier: "free"
        },
        process.env.JWT_SECRET,
        {
            algorithm: "HS256",
            expiresIn: "1h"
        }
    );

    const response = await request(app)
        .get("/")
        .set("Authorization", `Bearer ${token}`);

    assert.equal(response.status, 200);
    assert.equal(response.headers["x-ratelimit-limit"], "15");
    assert.equal(response.headers["x-ratelimit-remaining"], "14");
    assert.match(response.body.clientKey, /^user:/);
});

test("premium-tier user receives the configured rate limit", async () => {
    const token = jwt.sign(
        {
            sub: "premium-test-user",
            tier: "premium"
        },
        process.env.JWT_SECRET,
        {
            algorithm: "HS256",
            expiresIn: "1h"
        }
    );

    const response = await request(app)
        .get("/")
        .set("Authorization", `Bearer ${token}`);

    assert.equal(response.status, 200);
    assert.equal(response.headers["x-ratelimit-limit"], "25");
    assert.equal(response.headers["x-ratelimit-remaining"], "24");
    assert.match(response.body.clientKey, /^user:/);
});

test("concurrent guest requests never exceed the rate limit", async () => {
    const totalRequests = 20;

    // Send 20 requests without waiting for each one to finish.
    const responses = await Promise.all(
        Array.from(
            { length: totalRequests },
            () => request(app).get("/")
        )
    );

    const successfulRequests = responses.filter(
        (response) => response.status === 200
    );

    const rejectedRequests = responses.filter(
        (response) => response.status === 429
    );

    // Only 10 requests should be allowed for a guest.
    assert.equal(successfulRequests.length, 10);

    // The remaining 10 requests should be rejected.
    assert.equal(rejectedRequests.length, 10);
});

test("expired requests leave the sliding window", async () => {
    const clientKey = `expiry-test-${Date.now()}`;
    const limit = 2;
    const window = 60;
    const startTime = Math.floor(Date.now() / 1000);

    // Fill the window with two requests.
    const first = await slidingWindow(clientKey, limit, window);
    const second = await slidingWindow(clientKey, limit, window);

    assert.equal(first.allowed, true);
    assert.equal(second.allowed, true);
    assert.equal(second.requestCount, 2);

    // A third request within the same window should be rejected.
    const blocked = await slidingWindow(clientKey, limit, window);

    assert.equal(blocked.allowed, false);
    assert.equal(blocked.requestCount, 2);

    // Move all existing request timestamps outside the window.
    const redisKey = `rate-limit:${clientKey}`;

    const storedRequests = await redisClient.zRange(redisKey, 0, -1);

    await redisClient.zAdd(
        redisKey,
        storedRequests.map((value) => ({
            score: startTime - window - 1,
            value
        }))
    );

    // The Lua script should remove the expired requests.
    const afterExpiry = await slidingWindow(clientKey, limit, window);

    assert.equal(afterExpiry.allowed, true);
    assert.equal(afterExpiry.requestCount, 1);

    // Clean up the test's Redis key.
    await redisClient.del(redisKey);
});


test("request is allowed when the Redis rate-limit check fails", async () => {
    // Save the real Redis method so we can restore it after the test.
    const originalEval = redisClient.eval;
    const originalConsoleError = console.error;

    try {
        // Simulate Redis failing during the rate-limit check.
        redisClient.eval = async () => {
            throw new Error("Simulated Redis failure");
        };

        // Silence the expected error log during this test.
        console.error = () => {};

        const response = await request(app).get("/");

        // Fail-open means the request should still reach the route.
        assert.equal(response.status, 200);
        assert.equal(response.body.message, "Bouncer API is running");
    } finally {
        // Restore both methods so other tests are unaffected.
        redisClient.eval = originalEval;
        console.error = originalConsoleError;
    }
});