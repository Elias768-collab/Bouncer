export const identifyClient = (req, res, next) => {
    if (req.user) {
        // Authenticated client: use the verified JWT identity
        req.clientKey = `user:${req.user.id}`;
        req.clientTier = req.user.tier;
    } else {
        // Guest client: use the IP address.
        req.clientKey = `ip:${req.ip}`;
        req.clientTier = "guest";
    }

    next();

};
