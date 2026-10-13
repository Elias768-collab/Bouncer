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

## Client Identification and Authentication

Bouncer supports guest and authenticated client identification through middleware.

### Middleware Request Flow

Requests to the protected root endpoint pass through the following middleware in order:

1. `verifyToken` — checks an optional bearer JWT.
2. `identifyClient` — assigns the client key and rate-limit tier.
3. `rateLimiter` — applies the configured rate limit using the sliding-window algorithm.

### Guest Clients

Requests without an Authorization header continue as guests. The `identifyClient` middleware identifies a guest by IP address and creates a client key in this format:

`ip:<IP address>`

The key is attached to the Express request as `req.clientKey`, and the client's tier is set to `guest`.

### Authenticated Clients

Requests with a bearer token are verified by `src/middleware/verifyToken.js` using `jsonwebtoken` and the `JWT_SECRET` environment variable. Only the HS256 algorithm is accepted.

The middleware checks the token signature and expiration, and requires:
- A non-empty string `sub` claim identifying the user.
- A `tier` claim equal to `free` or `premium`.
- A numeric `exp` claim.

After successful verification, the middleware attaches the verified user ID and tier to `req.user`.

The `identifyClient` middleware then uses the verified user ID to create a key in this format:

`user:<user ID>`

The user's verified tier is assigned to `req.clientTier`. Invalid, expired, malformed, or otherwise unacceptable supplied tokens receive HTTP 401 instead of being treated as guest requests.

### Configured Rate Limits

Rate limits are defined in `src/config/limits.js`:

| Tier | Requests | Window |
|---|---:|---:|
| Guest | 10 | 60 seconds |
| Free | 15 | 60 seconds |
| Premium | 25 | 60 seconds |

The `rateLimiter` middleware selects the configuration using `req.clientTier`. Authenticated identity and tier values must come from the verified JWT, not from arbitrary request fields.

### Authentication Scope

Bouncer currently verifies JWTs issued using the configured shared secret. A separate authentication service or production token-issuing endpoint is not part of the current implementation. Locally generated development tokens are used to test authenticated tiers.
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

## Automated Testing

Bouncer uses Node.js's built-in test runner and Supertest to test HTTP endpoints without manually starting the Express server for each test.

### Running the Tests

Start the Redis container before running the test suite:

```bash
docker compose up -d
```

Run the tests using a dedicated Redis database (`1`) so test cleanup does not clear the development database (`0`):

```bash
REDIS_URL=redis://localhost:6379/1 npm test
```

The test suite uses `node --test` and connects to Redis through the application's existing Redis client. It clears the selected test database before each test and closes the Redis connection after the suite finishes.

**Important:** Database `1` is reserved for automated tests. Do not point the test suite at the development database.

### Current Test Coverage

The automated tests verify:

1. Guest requests return the expected rate-limit headers.
2. Guests are blocked after reaching the configured limit of 10 requests per 60 seconds.
3. Requests containing an invalid JWT are rejected with HTTP `401`.
4. Requests containing an expired JWT are rejected with HTTP `401`.
5. Authenticated free-tier users receive a limit of 15 requests per 60 seconds.
6. Authenticated premium-tier users receive a limit of 25 requests per 60 seconds.

### Testing Tools

- **Node.js test runner (`node:test`):** Runs the automated tests.
- **Node.js assertions (`node:assert/strict`):** Checks response status codes, headers, and response bodies.
- **Supertest:** Sends HTTP requests to the Express application during tests.
- **jsonwebtoken:** Creates test JWTs for authentication scenarios.
- **Redis:** Stores rate-limit data during testing.

### Current Status and Limitations

All six current automated tests pass.

The suite covers basic guest rate limiting, JWT rejection, and tier-specific rate-limit headers. It does not yet fully test concurrent requests, sliding-window expiry over time, or every possible authentication and configuration failure.
