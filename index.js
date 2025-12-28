const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/dashboard", require("./routes/dashboard"));
app.use("/diet-log", require("./routes/diet"));
app.use("/inventory", require("./routes/inventory"));
app.use("/recipes", require("./routes/recipes"));

// Health check
app.get("/", (req, res) => {
  res.send("✅ Health Tracker Backend is running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
