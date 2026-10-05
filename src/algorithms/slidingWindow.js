import { redisClient } from "../redis/client.js";

// Importing a tool that makes a random unique ID
import { randomUUID } from "crypto";

// Importing a tool to read a file
import { readFile } from "fs/promises";

// Load the Lua script so that Redis can execute it
const slidingWindowScript = await readFile(
    new URL("../scripts/slidingWindow.lua", import.meta.url),
    "utf-8"
);

export const slidingWindow = async(clientKey,limit, window) => {
    // Redis key used to store this client's request timestamp.
    const redisKey = `rate-limit:${clientKey}`;

    // Unix timestamp in seconds.
    const now = Math.floor(Date.now() / 1000);

    // Every request needs a unique member in the Redis Sorted Set.
    const requestId = randomUUID();

    const result = await redisClient.eval(slidingWindowScript, {
        keys: [redisKey],
        arguments: [
            String(now),
            String(window),
            String(limit),
            requestId
        ]
    });

    // Lua returns [1, requestCount] when allowed
    // and [0, requestCount] when rejected.
    const [allowed, requestCount, resetAt] = result;

    return {
        allowed: Number(allowed) === 1,
        requestCount,
        resetAt
    };
};