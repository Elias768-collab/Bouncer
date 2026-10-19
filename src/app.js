// Importing express into the application
import express from "express";

import { verifyToken } from "./middleware/verifyToken.js";
import { identifyClient } from "./middleware/identifyClient.js";
import { rateLimiter } from "./middleware/rateLimiter.js";

// Creating express application instance
const app = express();

// Trust the three proxy in front of the Render web service
app.set("trust proxy", 3);

app.get("/", verifyToken, identifyClient, rateLimiter, (req, res) => {
    res.json({
        message: "Bouncer API is running",
        clientKey: req.clientKey
    });
});

export default app;
