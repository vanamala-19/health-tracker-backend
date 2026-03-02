const express = require("express");
const cors = require("cors");

const authMiddleware = require("./middleware/auth");
const authRoutes = require("./routes/auth");
const dietRoutes = require("./routes/diet");
const inventoryRoutes = require("./routes/inventory");
const recipeRoutes = require("./routes/recipes");
const dashboardRoutes = require("./routes/dashboard");
const shiftLogRoutes = require("./routes/shiftLog");
const workoutsRoutes = require("./routes/workouts");
const stepsLiveRoutes = require("./routes/stepsLive");
const foodDatabaseRoutes = require("./routes/foodDatabase");

const app = express();

const allowedOrigins = (process.env.FRONTEND_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (!allowedOrigins.length || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Health check remains public.
app.get("/", (req, res) => {
  res.send("Health Tracker Backend Running");
});

// Public auth endpoints (login/logout/status).
app.use("/auth", authRoutes);

// Protect all API routes.
app.use(authMiddleware);

// Mount routes
app.use("/diet-log", dietRoutes);
app.use("/inventory", inventoryRoutes);
app.use("/recipes", recipeRoutes);
app.use("/summary", dashboardRoutes);
app.use("/shift-log", shiftLogRoutes);
app.use("/workouts", workoutsRoutes);
app.use("/steps-live", stepsLiveRoutes);
app.use("/food-database", foodDatabaseRoutes);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
