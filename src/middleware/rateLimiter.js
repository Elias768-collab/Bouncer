import { redisClient } from "../redis/client.js";
import { rateLimits } from "../config/limits.js";

export const rateLimiter = async (req, res, next) => {
    const clientKey = req.clientKey;
    const limit = rateLimits.guest;

    const redisKey = `rate-limit:${clientKey}`;

    try {
        const requestCount = await redisClient.incr(redisKey);

        if (requestCount === 1) {
            await redisClient.expire(redisKey, limit.window);
        }

        if (requestCount > limit.requests) {
            return res.status(429).json({
                message: "Too many requests. please try again after 60 seconds"
            });
        }
 
        next()
    } catch (error) {
        console.error("Rate limiter error:", error);
        next(error);
    }
};