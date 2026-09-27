// Importing express into the application
import express from "express";

import { identifyClient } from "./middleware/identifyClient.js";
import { rateLimiter } from "./middleware/rateLimiter.js";

// Creating express application instance
const app = express();

app.get("/", identifyClient, rateLimiter, (req, res) => {
    res.json({
        message: "Bouncer API is running",
        clientKey: req.clientKey
    });
});

export default app;

