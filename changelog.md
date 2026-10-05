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


## 2026-10-2
## Week 2: Sliding Window Rate Limiting

### Added

* Implemented the sliding-window rate limiting algorithm using Redis Sorted Sets.
* Added `src/algorithms/slidingWindow.js` to connect the Node.js application to the Redis Lua script.
* Added `src/scripts/slidingWindow.lua` to perform the rate-limit operation atomically inside Redis.
* Added unique request IDs using `randomUUID()` so multiple requests can be stored even when they occur within the same second.
* Added sliding-window-aware `X-RateLimit-Reset` calculation based on the oldest request currently inside the window.
* Added accurate `Retry-After` calculation based on when the oldest request will leave the sliding window.

### Changed

* Replaced the fixed-window `INCR + EXPIRE` logic in `rateLimiter.js` with the sliding-window algorithm.
* Rate-limit headers are now calculated from the current sliding-window state.
* `rateLimiter.js` now receives the request allowance, current request count, and reset timestamp from the sliding-window algorithm.

### Implementation

* Redis Sorted Sets store request timestamps as scores.
* Expired requests are removed with `ZREMRANGEBYSCORE`.
* Current requests are counted with `ZCARD`.
* New requests are recorded with `ZADD`.
* Redis key expiration is maintained with `EXPIRE`.
* Lua ensures the check-and-record operation happens atomically.

### Testing

* Confirmed requests within the configured 10-request window are allowed.
* Confirmed the 11th request receives `HTTP 429 Too Many Requests`.
* Confirmed `X-RateLimit-Remaining` decreases correctly from 9 to 0.
* Confirmed `X-RateLimit-Reset` identifies when the oldest request leaves the window.
* Confirmed `Retry-After` reports the remaining wait time instead of always returning the full 60-second window.
* Confirmed requests become available again as older requests leave the sliding window.

### Milestone Status

**Completed:** Core sliding-window rate limiting is working and manually tested successfully.

### Next

* Add authenticated client identification using JWT/user IDs.
* Apply different rate limits for guest, free, and premium clients.
* Add automated tests and concurrent load testing.
