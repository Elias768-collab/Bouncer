
import "dotenv/config";

// Read a positive integer from an environment variable.
// Use the supplied default when the variable is not set.
const getPositiveInteger = (name, defaultValue) => {
    const value = process.env[name];

    if (value === undefined || value.trim() === "") {
        return defaultValue;
    }

    const parsedValue = Number(value);

    if (!Number.isSafeInteger(parsedValue) || parsedValue <= 0) {
        throw new Error(
            `Invalid configuration: ${name} must be a positive integer.`
        );
    }

    return parsedValue;
};

export const rateLimits = {
    guest: {
        requests: getPositiveInteger("GUEST_RATE_LIMIT", 10),
        window: getPositiveInteger("GUEST_RATE_WINDOW_SECONDS", 60),
    },

    free: {
        requests: getPositiveInteger("FREE_RATE_LIMIT", 15),
        window: getPositiveInteger("FREE_RATE_WINDOW_SECONDS", 60),
    },

    premium: {
        requests: getPositiveInteger("PREMIUM_RATE_LIMIT", 25),
        window: getPositiveInteger("PREMIUM_RATE_WINDOW_SECONDS", 60),
    },
};
