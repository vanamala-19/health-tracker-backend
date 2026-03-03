const test = require("node:test");
const assert = require("node:assert/strict");
const writeRateLimiter = require("../middleware/rateLimit");

function makeRes() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test("rate limiter skips GET requests", () => {
  const req = { method: "GET", headers: {}, ip: "10.0.0.1" };
  const res = makeRes();
  let called = false;
  writeRateLimiter(req, res, () => {
    called = true;
  });
  assert.equal(called, true);
  assert.equal(res.statusCode, 200);
});

test("rate limiter blocks after configured write threshold", () => {
  const oldWindow = process.env.RATE_LIMIT_WINDOW_MS;
  const oldMax = process.env.RATE_LIMIT_MAX_WRITES;
  process.env.RATE_LIMIT_WINDOW_MS = "60000";
  process.env.RATE_LIMIT_MAX_WRITES = "2";

  try {
    const req = { method: "POST", headers: {}, ip: "10.0.0.2" };

    let called = 0;
    writeRateLimiter(req, makeRes(), () => {
      called += 1;
    });
    writeRateLimiter(req, makeRes(), () => {
      called += 1;
    });

    const res = makeRes();
    writeRateLimiter(req, res, () => {
      called += 1;
    });

    assert.equal(called, 2);
    assert.equal(res.statusCode, 429);
    assert.equal(typeof res.headers["Retry-After"], "string");
    assert.equal(
      res.body.error,
      "Too many write requests. Please retry later.",
    );
  } finally {
    if (oldWindow === undefined) delete process.env.RATE_LIMIT_WINDOW_MS;
    else process.env.RATE_LIMIT_WINDOW_MS = oldWindow;

    if (oldMax === undefined) delete process.env.RATE_LIMIT_MAX_WRITES;
    else process.env.RATE_LIMIT_MAX_WRITES = oldMax;
  }
});
