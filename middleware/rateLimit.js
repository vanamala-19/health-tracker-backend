const DEFAULT_WINDOW_MS = 60 * 1000;
const DEFAULT_MAX_WRITES = 120;

const buckets = new Map();

function parsePositiveInt(value, fallback) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    return fallback;
  }
  return num;
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "unknown";
}

function writeRateLimiter(req, res, next) {
  const method = (req.method || "").toUpperCase();
  const isReadOnly = method === "GET" || method === "HEAD" || method === "OPTIONS";
  if (isReadOnly) {
    return next();
  }

  const windowMs = parsePositiveInt(process.env.RATE_LIMIT_WINDOW_MS, DEFAULT_WINDOW_MS);
  const maxWrites = parsePositiveInt(process.env.RATE_LIMIT_MAX_WRITES, DEFAULT_MAX_WRITES);
  const now = Date.now();
  const key = getClientIp(req);

  const current = buckets.get(key);
  if (!current || now >= current.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return next();
  }

  if (current.count >= maxWrites) {
    const retryAfterSec = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    res.setHeader("Retry-After", String(retryAfterSec));
    return res.status(429).json({
      error: "Too many write requests. Please retry later.",
      retryAfterSec,
    });
  }

  current.count += 1;
  return next();
}

module.exports = writeRateLimiter;
