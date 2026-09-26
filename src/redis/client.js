// Loading variables from .env
import "dotenv/config";

// importing tools to communicate with Redis server
import { createClient } from "redis";

export const redisClient = createClient({
    url: process.env.REDIS_URL,
});

// If an error is encountered 
redisClient.on("error", (error) => {
    console.log("Redis client error:", error);
});


await redisClient.connect();