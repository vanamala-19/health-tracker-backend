function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = Number.isInteger(err?.status) ? err.status : 500;
  const message =
    typeof err?.message === "string" && status < 500
      ? err.message
      : err?.publicMessage || "Internal server error";

  console.error(
    JSON.stringify({
      level: "error",
      requestId: req.requestId || "unknown",
      method: req.method,
      path: req.originalUrl || req.url,
      status,
      message: err?.message || "Unknown error",
      stack: err?.stack || null,
    }),
  );

  return res.status(status).json({
    error: message,
    requestId: req.requestId || null,
  });
}

module.exports = errorHandler;
