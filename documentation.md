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