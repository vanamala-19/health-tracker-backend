const express = require("express");
const router = express.Router();
const { sheets, SPREADSHEET_ID } = require("../google");
const {
  isNonEmptyString,
  isValidDateInput,
  toFiniteNumber,
  badRequest,
} = require("../utils/validation");
const { invalidateByPrefix } = require("../middleware/cache");

/*
====================================
GET WORKOUTS (UI / WEB APP)
====================================
*/
router.get("/", async (req, res, next) => {
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Workouts_Log!A2:H",
      valueRenderOption: "FORMATTED_VALUE",
    });

    res.json(result.data.values || []);
  } catch (err) {
    err.publicMessage = "Failed to fetch workouts";
    next(err);
  }
});

/*
====================================
ADD WORKOUT (ANDROID / GOOGLE FIT)
====================================
*/
router.post("/", async (req, res, next) => {
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
    invalidateByPrefix("/summary");

    res.json({ success: true });
  } catch (err) {
    err.publicMessage = "Failed to save workout";
    next(err);
  }
});

module.exports = router;
