import { redisClient } from "../redis/client.js";
import { rateLimits } from "../config/limits.js";
import { setRateLimitHeaders } from "../utils/responseHeader.js";

export const rateLimiter = async (req, res, next) => {
    const clientKey = req.clientKey;
    const limit = rateLimits.guest;

    const redisKey = `rate-limit:${clientKey}`;

    try {
        const requestCount = await redisClient.incr(redisKey);

        if (requestCount === 1) {
            await redisClient.expire(redisKey, limit.window);
        }

        const ttl = await redisClient.ttl(redisKey);

        setRateLimitHeaders(
            res,
            limit.requests,
            requestCount,
            ttl
        );

        if (requestCount > limit.requests) {
            // Tell the client how many seconds it should wait before retrying.
            res.set("Retry-After", ttl);

            return res.status(429).json({
                message: "Too many requests. please try again later"
            });
        }
 
        next()
    } catch (error) {
        console.error("Rate limiter error:", error);
        next(error);
    }
};