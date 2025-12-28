const express = require("express");
const router = express.Router();
const { sheets, SPREADSHEET_ID } = require("../google");

// Diet daily summary
router.get("/summary", async (req, res) => {
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Diet_Daily_Summary!A2:E",
      valueRenderOption: "FORMATTED_VALUE",
    });
    res.json(result.data.values || []);
  } catch {
    res.status(500).json({ error: "Failed to fetch diet summary" });
  }
});

// Body weight
router.get("/weight", async (req, res) => {
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Body_Weight!A2:B",
      valueRenderOption: "FORMATTED_VALUE",
    });
    res.json(result.data.values || []);
  } catch {
    res.status(500).json({ error: "Failed to fetch weight data" });
  }
});

// Workout summary
router.get("/workout-summary", async (req, res) => {
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Workout_Daily_Summary!A2:D",
      valueRenderOption: "FORMATTED_VALUE",
    });
    res.json(result.data.values || []);
  } catch {
    res.status(500).json({ error: "Failed to fetch workout summary" });
  }
});

module.exports = router;
