const crypto = require("crypto");
const SESSION_COOKIE_NAME = "ht_session";
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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

function getCookieValue(req, key) {
  const cookieHeader = req.headers.cookie || "";
  if (!cookieHeader) return "";

  const pairs = cookieHeader.split(";");
  for (const pair of pairs) {
    const idx = pair.indexOf("=");
    if (idx <= 0) continue;
    const k = pair.slice(0, idx).trim();
    if (k !== key) continue;
    const raw = pair.slice(idx + 1).trim();
    try {
      return decodeURIComponent(raw);
    } catch (_e) {
      return raw;
    }
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

function getSessionSecret() {
  return (
    process.env.SESSION_SECRET ||
    process.env.AUTH_TOKEN ||
    process.env.LOGIN_PASSWORD ||
    ""
  );
}

function getSessionTtlMs() {
  const value = Number(process.env.SESSION_TTL_MS);
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_TTL_MS;
  return value;
}

function createSessionToken() {
  const secret = getSessionSecret();
  if (!secret) return "";

  const payload = {
    exp: Date.now() + getSessionTtlMs(),
  };

  const payloadPart = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signaturePart = crypto
    .createHmac("sha256", secret)
    .update(payloadPart)
    .digest("base64url");

  return `${payloadPart}.${signaturePart}`;
}

function hasValidSession(req) {
  const secret = getSessionSecret();
  if (!secret) return false;

  const token = getCookieValue(req, SESSION_COOKIE_NAME);
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [payloadPart, signaturePart] = parts;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payloadPart)
    .digest("base64url");

  if (!safeCompare(signaturePart, expectedSignature)) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8"));
    return Number(payload.exp) > Date.now();
  } catch (_e) {
    return false;
  }
}

function buildCookieAttributes(maxAgeSeconds) {
  const sameSite = process.env.SESSION_SAME_SITE || "None";
  const secureSetting = process.env.SESSION_SECURE;
  const secure =
    typeof secureSetting === "string"
      ? secureSetting.toLowerCase() === "true"
      : sameSite.toLowerCase() === "none";

  const attrs = [
    "Path=/",
    "HttpOnly",
    `SameSite=${sameSite}`,
    `Max-Age=${maxAgeSeconds}`,
  ];

  if (secure) {
    attrs.push("Secure");
  }

  return attrs.join("; ");
}

function createSessionCookie() {
  const token = createSessionToken();
  if (!token) return "";

  const ttlSeconds = Math.max(1, Math.floor(getSessionTtlMs() / 1000));
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; ${buildCookieAttributes(ttlSeconds)}`;
}

function clearSessionCookie() {
  return `${SESSION_COOKIE_NAME}=; ${buildCookieAttributes(0)}`;
}

function authMiddleware(req, res, next) {
  const method = (req.method || "").toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return next();
  }

  if (hasValidSession(req)) {
    return next();
  }

  const expectedToken = process.env.AUTH_TOKEN;
  if (!expectedToken) {
    return res.status(401).json({
      error: "Unauthorized",
      details: "Login required for write access",
    });
  }

  const providedToken = getAuthToken(req);

  if (!providedToken || !safeCompare(providedToken, expectedToken)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  return next();
}

module.exports = authMiddleware;
module.exports.createSessionCookie = createSessionCookie;
module.exports.clearSessionCookie = clearSessionCookie;
module.exports.hasValidSession = hasValidSession;
module.exports.safeCompare = safeCompare;
