const express = require("express");
const cors = require("cors");

const dietRoutes = require("./routes/diet");
const inventoryRoutes = require("./routes/inventory");
const recipeRoutes = require("./routes/recipes");
const dashboardRoutes = require("./routes/dashboard");

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.send("✅ Health Tracker Backend Running");
});

// Mount routes
app.use("/diet-log", dietRoutes);
app.use("/inventory", inventoryRoutes);
app.use("/recipes", recipeRoutes);
app.use("/summary", dashboardRoutes);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
