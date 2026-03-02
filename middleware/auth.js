const crypto = require("crypto");

function getAuthToken(req) {
  const authHeader = req.headers.authorization;

  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  const apiKey = req.headers["x-api-key"];
  if (typeof apiKey === "string") {
    return apiKey.trim();
  }

  return "";
}

function safeCompare(a, b) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function authMiddleware(req, res, next) {
  const expectedToken = process.env.AUTH_TOKEN;

  if (!expectedToken) {
    console.error("AUTH_TOKEN is not set. Rejecting protected requests.");
    return res.status(503).json({
      error: "Server auth not configured",
      details: "Set AUTH_TOKEN in backend environment",
    });
  }

  const providedToken = getAuthToken(req);

  if (!providedToken || !safeCompare(providedToken, expectedToken)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  return next();
}

module.exports = authMiddleware;
