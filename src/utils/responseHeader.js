export const setRateLimitHeaders = (res, limit, requestCount, ttl) => {
    const remaining = Math.max(limit - requestCount, 0);

    const reset = Math.floor(Date.now() / 1000) + ttl;

    res.set({
        "X-RateLimit-Limit": limit,
        "X-RateLimit-Remaining": remaining,
        "X-RateLimit-Reset": reset
    });
};