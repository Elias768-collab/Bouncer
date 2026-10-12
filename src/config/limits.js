export const rateLimits = {

    // Maximum request allowed within the rolling time window
    guest: {
        requests: 10,
        window: 60
    },

    free: {
        requests: 15,
        window: 60
    },

    premium: {
        requests: 25,
        window: 60
    },
};