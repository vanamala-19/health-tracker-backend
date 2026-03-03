const cacheStore = new Map();

function parsePositiveInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function getCacheTtlMs(defaultMs) {
  return parsePositiveInt(process.env.READ_CACHE_TTL_MS, defaultMs);
}

function cacheGet(defaultTtlMs = 30000) {
  return (req, res, next) => {
    const method = (req.method || "").toUpperCase();
    if (method !== "GET") {
      return next();
    }

    const ttlMs = getCacheTtlMs(defaultTtlMs);
    const key = req.originalUrl || req.url;
    const now = Date.now();
    const cached = cacheStore.get(key);

    if (cached && cached.expiresAt > now) {
      res.setHeader("X-Cache", "HIT");
      return res.json(cached.value);
    }

    const originalJson = res.json.bind(res);
    res.json = (payload) => {
      cacheStore.set(key, {
        value: payload,
        expiresAt: Date.now() + ttlMs,
      });
      res.setHeader("X-Cache", "MISS");
      return originalJson(payload);
    };

    return next();
  };
}

function invalidateByPrefix(prefix) {
  const match = String(prefix || "").trim();
  if (!match) return;

  for (const key of cacheStore.keys()) {
    if (key.startsWith(match)) {
      cacheStore.delete(key);
    }
  }
}

function clearCache() {
  cacheStore.clear();
}

module.exports = {
  cacheGet,
  invalidateByPrefix,
  clearCache,
};
