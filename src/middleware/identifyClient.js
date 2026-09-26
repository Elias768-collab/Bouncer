export const identifyClient = (req, res, next) => {
    const clientKey = `ip:${req.ip}`;

    req.clientKey = clientKey;

    next();
};