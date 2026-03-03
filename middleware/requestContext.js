const crypto = require("crypto");

function buildRequestId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "unknown";
}

function requestContext(req, res, next) {
  const requestId = req.headers["x-request-id"] || buildRequestId();
  const startAt = process.hrtime.bigint();

  req.requestId = String(requestId);
  res.setHeader("X-Request-Id", req.requestId);

  res.on("finish", () => {
    const elapsedNs = process.hrtime.bigint() - startAt;
    const durationMs = Number(elapsedNs / BigInt(1000000));
    const log = {
      level: "info",
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      durationMs,
      ip: getClientIp(req),
    };
    console.log(JSON.stringify(log));
  });

  next();
}

module.exports = requestContext;
