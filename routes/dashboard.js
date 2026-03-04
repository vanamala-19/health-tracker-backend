const express = require("express");
const router = express.Router();
const { sheets, SPREADSHEET_ID } = require("../google");
const { cacheGet } = require("../middleware/cache");

// Diet daily summary
router.get("/", cacheGet(30000), async (req, res, next) => {
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Diet_Daily_Summary!A2:E",
      valueRenderOption: "UNFORMATTED_VALUE",
    });
    res.json(result.data.values || []);
  } catch (err) {
    err.publicMessage = "Failed to fetch diet summary";
    next(err);
  }
});

// Body weight
router.get("/weight", cacheGet(30000), async (req, res, next) => {
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Body_Weight!A2:B",
      valueRenderOption: "UNFORMATTED_VALUE",
    });
    res.json(result.data.values || []);
  } catch (err) {
    err.publicMessage = "Failed to fetch weight data";
    next(err);
  }
});

// Workout summary
router.get("/workout-summary", cacheGet(30000), async (req, res, next) => {
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Workout_Daily_Summary!A2:B",
      valueRenderOption: "UNFORMATTED_VALUE",
    });
    res.json(result.data.values || []);
  } catch (err) {
    err.publicMessage = "Failed to fetch workout summary";
    next(err);
  }
});

module.exports = router;
