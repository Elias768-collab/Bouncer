import jwt from "jsonwebtoken";

export const verifyToken =(req, res, next) => {
    const authHeader = req.headers.authorization;

    // Allow request without a token to continue as guests.
    if(!authHeader) {
        return next();
    }

    // Require the Bearer token format.
    if(!authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Invalid authorization format."
        });
    }

    const token = authHeader.split(" ")[1];

    if(!token) {
        return res.status(401).json({
            message: "Authorization token is missing."
        })
    }
    try {
        const payload = jwt.verify(
            token,
            process.env.JWT_SECRET,
            {algorithms: ["HS256"] }
        );

        // Accept only tokens containing the claims Bouncer requires.
        if (
            typeof payload === "string" ||
            typeof payload.sub !== "string" ||
            payload.sub.trim() === "" ||
            !["free", "premium"].includes(payload.tier) ||
            typeof payload.exp !== "number"
        ) {
            return res.status(401).json({
                message: "Invalid token payload."
            });
        }

        // Store verified identity and tier for later middleware.
        req.user ={
            id: payload.sub,
            tier: payload.tier
        };

        next();

    } catch(error) {
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
};