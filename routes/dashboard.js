const express = require("express");
const router = express.Router();
const { sheets, SPREADSHEET_ID } = require("../google");
const { cacheGet } = require("../middleware/cache");

async function getSheetValues(range) {
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  return result.data.values || [];
}

router.get("/dashboard", cacheGet(30000), async (req, res, next) => {
  try {
    const [dietDaily, weight, workoutSummary] = await Promise.all([
      getSheetValues("Diet_Daily_Summary!A2:E"),
      getSheetValues("Body_Weight!A2:B"),
      getSheetValues("Workout_Daily_Summary!A2:B"),
    ]);

    res.json({ dietDaily, weight, workoutSummary });
  } catch (err) {
    err.publicMessage = "Failed to fetch dashboard bundle";
    next(err);
  }
});

// Diet daily summary
router.get("/", cacheGet(30000), async (req, res, next) => {
  try {
    res.json(await getSheetValues("Diet_Daily_Summary!A2:E"));
  } catch (err) {
    err.publicMessage = "Failed to fetch diet summary";
    next(err);
  }
});

// Body weight
router.get("/weight", cacheGet(30000), async (req, res, next) => {
  try {
    res.json(await getSheetValues("Body_Weight!A2:B"));
  } catch (err) {
    err.publicMessage = "Failed to fetch weight data";
    next(err);
  }
});

// Workout summary
router.get("/workout-summary", cacheGet(30000), async (req, res, next) => {
  try {
    res.json(await getSheetValues("Workout_Daily_Summary!A2:B"));
  } catch (err) {
    err.publicMessage = "Failed to fetch workout summary";
    next(err);
  }
});

module.exports = router;
