# BOUNCER DOCUMENTATION

## Project Overview

Bouncer is a standalone Express-based rate-limiting service designed to control how frequently clients can make requests to an API.

The service uses Redis as its data store for tracking request activity.

## Current Architecture

- Node.js + Express — application and HTTP server
- Redis — request tracking and rate-limit storage
- Docker Compose — local Redis environment
- dotenv — environment variable management
- Git/GitHub — version control and project history

## Client Identification

Bouncer currently identifies clients using their IP address.

The `identifyClient` middleware creates a client key in the format:

`ip:<IP address>`

The key is attached to the Express request object as `req.clientKey` so that subsequent middleware can use it.

Authentication-based identification using a user ID can be added later when JWT authentication is introduced.

## Redis Connection

Redis runs locally through Docker using the official Redis 7 Alpine image.

The application connects to Redis through the `REDIS_URL` environment variable.

The Redis client is initialized as a shared client in:

`src/redis/client.js`

## Design Direction

The project is being developed incrementally.

The current focus is establishing the infrastructure and request flow before implementing the actual rate-limiting algorithms.

Bouncer was upgraded from a fixed-window counter to a sliding-window rate limiter.

The sliding-window implementation uses a Redis Sorted Set to store individual requests for each client.

Each request:
- uses the client key as the Redis key
- uses the current Unix timestamp as the Sorted Set score
- receives a unique request ID as the Sorted Set member

Before counting requests, the Lua script removes requests that have fallen outside the current time window.

The Lua script then:
1. Removes expired requests.
2. Counts requests remaining in the window.
3. Rejects the request if the configured limit has been reached.
4. Otherwise records the new request.
5. Returns the request count and the timestamp when the oldest request will leave the window.

Lua is used so the check-and-record operation happens atomically inside Redis, preventing race conditions between concurrent requests.

Rate-limit response headers are calculated from the sliding-window state. Retry-After is based on when the oldest request will expire rather than always returning the full window duration.

The implementation was tested manually by sending requests to the protected endpoint. Ten requests were accepted, the eleventh was rejected with HTTP 429, and requests became available again as older requests left the sliding window.