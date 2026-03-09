const express = require("express");
const cors = require("cors");
const writeRateLimiter = require("./middleware/rateLimit");
const requestContext = require("./middleware/requestContext");
const errorHandler = require("./middleware/errorHandler");
const {
  sheets,
  SPREADSHEET_ID,
  warmSheetsConnection,
  getSheetsHealth,
} = require("./google");

const dietRoutes = require("./routes/diet");
const inventoryRoutes = require("./routes/inventory");
const recipeRoutes = require("./routes/recipes");
const dashboardRoutes = require("./routes/dashboard");
const shiftLogRoutes = require("./routes/shiftLog");
const workoutsRoutes = require("./routes/workouts");
const stepsLiveRoutes = require("./routes/stepsLive");
const foodDatabaseRoutes = require("./routes/foodDatabase");
const referenceRoutes = require("./routes/reference");

const app = express();
app.set("trust proxy", 1);

const allowedOrigins = (process.env.FRONTEND_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (!allowedOrigins.length || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
  }),
);

// Explicit CORS headers for all responses (Vercel serverless fix)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || !allowedOrigins.length) {
    res.header("Access-Control-Allow-Origin", origin || "*");
  }
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", process.env.FRONTEND_ORIGINS);
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  next();
});

app.use(requestContext);
app.use(express.json());
app.use(writeRateLimiter);

// Health check remains public.
app.get("/", (req, res) => {
  res.send("Health Tracker Backend Running");
});
app.get("/health/live", (req, res) => {
  res.json({ ok: true, uptimeSec: Math.round(process.uptime()) });
});
app.get("/health/ready", async (req, res, next) => {
  try {
    const health = getSheetsHealth();
    if (health.ready) {
      return res.json({ ok: true, warmedAt: health.lastReadyOkAt });
    }

    await warmSheetsConnection();
    res.json({ ok: true, warmedAt: Date.now() });
  } catch (err) {
    err.status = 503;
    err.publicMessage = "Service not ready";
    next(err);
  }
});

// Mount routes
app.use("/diet-log", dietRoutes);
app.use("/inventory", inventoryRoutes);
app.use("/recipes", recipeRoutes);
app.use("/summary", dashboardRoutes);
app.use("/shift-log", shiftLogRoutes);
app.use("/workouts", workoutsRoutes);
app.use("/steps-live", stepsLiveRoutes);
app.use("/food-database", foodDatabaseRoutes);
app.use("/reference", referenceRoutes);
app.use((req, res) => {
  res
    .status(404)
    .json({ error: "Not found", requestId: req.requestId || null });
});
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  warmSheetsConnection().catch((err) => {
    console.warn("Initial Sheets warmup failed:", err.message);
  });
});
