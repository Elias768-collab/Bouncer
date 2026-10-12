import { rateLimits } from "../config/limits.js";
import { slidingWindow } from "../algorithms/slidingWindow.js";


export const rateLimiter = async (req, res, next) => {
    const clientKey = req.clientKey;
    const limit = rateLimits[req.clientTier];

    // Ensure the client has a valid configured tier
    if (!limit) {
        return res.status(500).json({
            message: "Rate limit configuration error."
        });
    }

    try {
        const result = await slidingWindow(
            clientKey,
            limit.requests,
            limit.window
        );

        const { allowed, requestCount, resetAt } = result;

        const remaining = Math.max(
            limit.requests - requestCount,
            0
        );

        // Tell the client the maximum number of requests allowed.
        res.set("X-RateLimit-Limit", limit.requests);

        // Tell the client how many requests remain.
        res.set("X-RateLimit-Remaining", remaining);

        // Tell the client when the oldest request leaves the window.
        res.set("X-RateLimit-Reset", resetAt);

        if (!allowed) {
            // Calculate how many seconds until the oldest request expires.
            const retryAfter = Math.max(
                resetAt - Math.floor(Date.now() / 1000),
                0
            );

            res.set("Retry-After", retryAfter);

            return res.status(429).json({
                message: "Too many requests. Please try again later."
            });
        }

        next();
    } catch (error) {
        console.error("Rate limiter error:", error);
        next(error);
    }
};