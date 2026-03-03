const express = require("express");
const router = express.Router();
const { sheets, SPREADSHEET_ID } = require("../google");
const {
  isNonEmptyString,
  isValidDateInput,
  toFiniteNumber,
  badRequest,
} = require("../utils/validation");

/*
====================================
GET WORKOUTS (UI / WEB APP)
====================================
*/
router.get("/", async (req, res) => {
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Workouts_Log!A2:H",
      valueRenderOption: "FORMATTED_VALUE",
    });

    res.json(result.data.values || []);
  } catch (err) {
    console.error("Fetch workouts failed:", err);
    res.status(500).json({ error: "Failed to fetch workouts" });
  }
});

/*
====================================
ADD WORKOUT (ANDROID / GOOGLE FIT)
====================================
*/
router.post("/", async (req, res) => {
  try {
    const {
      date,
      start_time,
      end_time,
      activity_type,
      workout_name,
      duration_min,
      source_app,
      steps_today,
    } = req.body;

    if (!isValidDateInput(date)) {
      return badRequest(res, "Valid date is required");
    }
    if (!isNonEmptyString(start_time) || !isNonEmptyString(end_time)) {
      return badRequest(res, "start_time and end_time are required");
    }
    if (!isNonEmptyString(activity_type)) {
      return badRequest(res, "activity_type is required");
    }
    if (toFiniteNumber(duration_min) === null) {
      return badRequest(res, "duration_min must be a number");
    }
    if (steps_today !== undefined && toFiniteNumber(steps_today) === null) {
      return badRequest(res, "steps_today must be a number");
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "Workouts_Log!A:H",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            date,
            start_time,
            end_time,
            activity_type,
            workout_name,
            duration_min,
            source_app,
            steps_today,
          ],
        ],
      },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Add workout failed:", err);
    res.status(500).json({ error: "Failed to save workout" });
  }
});

module.exports = router;
