const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");

function getLoginPassword() {
  return process.env.LOGIN_PASSWORD || process.env.AUTH_TOKEN || "";
}

router.post("/login", (req, res) => {
  const expectedPassword = getLoginPassword();
  if (!expectedPassword) {
    return res.status(503).json({
      error: "Login not configured",
      details: "Set LOGIN_PASSWORD (or AUTH_TOKEN) in backend environment",
    });
  }

  const providedPassword = String(req.body?.password || "").trim();
  if (!providedPassword || !authMiddleware.safeCompare(providedPassword, expectedPassword)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const cookie = authMiddleware.createSessionCookie();
  if (!cookie) {
    return res.status(503).json({
      error: "Session not configured",
      details: "Set SESSION_SECRET (or AUTH_TOKEN/LOGIN_PASSWORD) in backend environment",
    });
  }

  res.setHeader("Set-Cookie", cookie);
  return res.json({ success: true });
});

router.post("/logout", (req, res) => {
  res.setHeader("Set-Cookie", authMiddleware.clearSessionCookie());
  res.json({ success: true });
});

router.get("/status", (req, res) => {
  res.json({ authenticated: authMiddleware.hasValidSession(req) });
});

module.exports = router;
