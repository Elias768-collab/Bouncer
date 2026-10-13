import test, { beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import jwt from "jsonwebtoken";

import app from "../src/app.js";
import { redisClient } from "../src/redis/client.js";


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