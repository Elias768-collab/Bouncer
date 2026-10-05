--KEYS[1] = Rdis client for this client
--ARGV[1] = current timestamp
--ARGV[2] = window size in seconds
--ARGV[3] = maximum number of requests allowed
--ARGV[4] = unique ID for this request


local key = KEYS[1]

local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local requestId = ARGV[4]

--calculate the beginning of the current sliding window.
local windowStart = now - window

--Remove requests that are older than the current window.
redis.call("ZREMRANGEBYSCORE", key, 0, windowStart)

--Count how mmany request are currently inside the window.
local requestCount = redis.call("ZCARD", key)

-- If the client has already reached the limit, reject the request.
if requestCount >= limit then

    local oldestRequest = redis.call("ZRANGE", key, 0, 0, "WITHSCORES")
    local oldestTimestamp = tonumber(oldestRequest[2])

    return {0, requestCount, oldestTimestamp + window}

end

-- Record the new request using its timestamp as the score.
redis.call("ZADD", key, now, requestId)

-- Keep the Redis key alive for the duration of the window.
redis.call("EXPIRE", key, window)

-- Get the oldest request after adding the new request.
local oldestRequest = redis.call("ZRANGE", key, 0, 0, "WITHSCORES")
local oldestTimestamp = tonumber(oldestRequest[2])

-- Return whether the request was allowed, the current count,
-- and when the oldest request will leave the window.
return {1, requestCount + 1, oldestTimestamp + window}
