const express = require("express");
const cors = require("cors");

const authMiddleware = require("./middleware/auth");
const dietRoutes = require("./routes/diet");
const inventoryRoutes = require("./routes/inventory");
const recipeRoutes = require("./routes/recipes");
const dashboardRoutes = require("./routes/dashboard");
const shiftLogRoutes = require("./routes/shiftLog");
const workoutsRoutes = require("./routes/workouts");
const stepsLiveRoutes = require("./routes/stepsLive");
const foodDatabaseRoutes = require("./routes/foodDatabase");

const app = express();
app.use(cors());
app.use(express.json());

// Health check remains public.
app.get("/", (req, res) => {
  res.send("Health Tracker Backend Running");
});

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
