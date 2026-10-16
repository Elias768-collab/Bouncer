// Loading variables from .env
import "dotenv/config";

// importing tools to communicate with Redis server
import { createClient } from "redis";

export const redisClient = createClient({
    url: process.env.REDIS_URL,

    // Reject commands while Redis is disconnected instead of queuing them.
    // This allows the rate limiter's fail-open handler to run promptly.
    disableOfflineQueue: true,


    // Limit automatic reconnection attempts
    socket: {
        reconnectStrategy(retries) {
    // Keep retrying, but cap the delay at 3 seconds.
    // This allows Bouncer to recover when Redis returns.
    return Math.min(retries * 500, 3000);
}
    }
});

// If an error is encountered 
redisClient.on("error", (error) => {
    const message = error?.message || "Unknown Redis connection error";
    console.error(`[Redis] ${message}`);
});

// Start connecting to Redis without blocking Express startup.
// The client will continue reconnecting if Redis is temporarily unavailable.
redisClient.connect().catch((error) => {
    console.error(
        "Initial Redis connection failed. Bouncer will continue in fail-open mode:",
        error.message
    );
});