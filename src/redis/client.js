// Loading variables from .env
import "dotenv/config";

// importing tools to communicate with Redis server
import { createClient } from "redis";

export const redisClient = createClient({
    url: process.env.REDIS_URL,

    // Limit automatic reconnection attempts
    socket: {
        reconnectStrategy(retries) {
            if(retries >=5 ) {
                return new Error("Redis reconnection limit reached");
            }

            // Wait longer between attempts, up to 3 seconds
            return Math.min(retries * 500, 3000);
        }
    }
});

// If an error is encountered 
redisClient.on("error", (error) => {
    console.log("Redis client error:", error.message);
});


await redisClient.connect();