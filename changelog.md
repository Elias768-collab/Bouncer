# CHANGELOG

## 2026-09-26

### Initial Project Setup

- Initialized the Bouncer Express application.
- Configured environment variables with dotenv.
- Added Redis as the project's storage layer.
- Added Docker Compose for local Redis development.
- Connected the Node.js application to Redis.
- Created the Redis client module.
- Created the `identifyClient` middleware.
- Implemented IP-based client identification.
- Attached the generated client key to the Express request.
- Tested client identification successfully through the root endpoint.
- Initialized Git with `main` as the primary branch.

## 2026-09-27

### Fixed-Window Rate Limiting

- Added guest rate-limit configuration of 10 requests per 60 seconds.
- Implemented the first version of the rate limiter middleware.
- Added Redis `INCR` for request counting.
- Added Redis `EXPIRE` to control the fixed request window.
- Added HTTP 429 responses when the request limit is exceeded.
- Connected client identification and rate-limiting middleware.
- Tested successfully: the 11th request is blocked after 10 allowed requests.

## 2026-9-28

### Rate-Limit Response Headers

- Added `X-RateLimit-Limit` response header.
- Added `X-RateLimit-Remaining` response header.
- Added `X-RateLimit-Reset` response header.
- Added `Retry-After` header for blocked requests.
- Created a reusable `setRateLimitHeaders` utility.
- Used Redis TTL to calculate the remaining rate-limit window.
- Tested rate-limit headers successfully with `curl`.
- Verified HTTP 429 responses include retry information.