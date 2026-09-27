export const rateLimits = {
   
    // Number of request that can be made by client 
    guest: {
        requests: 10,
        window: 60
    },
    
    free: {
        requests: 15,
        window: 60
    },

    premuim: {
        requests: 25,
        window: 60
    },
};