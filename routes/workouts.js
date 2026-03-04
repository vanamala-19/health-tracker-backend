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
    const { date, status } = req.body || {};

    // Simple mode: date + status (Done / Skipped)
    if (isValidDateInput(date) && isNonEmptyString(status)) {
      const normalizedStatus = status.trim().toLowerCase();
      if (!["done", "skipped"].includes(normalizedStatus)) {
        return badRequest(res, "status must be Done or Skipped");
      }

      const simpleRow = [
        date,
        "", // day (sheet formula/manual optional)
        "", // workout name
        "", // duration
        normalizedStatus === "done" ? 1 : 0, // sets proxy
        normalizedStatus === "done" ? "Workout" : "Skipped",
      ];

      const existing = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "Workout_Daily_Summary!A2:F",
        valueRenderOption: "FORMATTED_VALUE",
      });
      const rows = existing.data.values || [];
      const existingIndex = rows.findIndex((r) => String(r[0] || "") === date);

      if (existingIndex >= 0) {
        const rowNumber = existingIndex + 2;
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `Workout_Daily_Summary!E${rowNumber}:F${rowNumber}`,
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [
              [
                normalizedStatus === "done" ? 1 : 0,
                normalizedStatus === "done" ? "Workout" : "Skipped",
              ],
            ],
          },
        });
      } else {
        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: "Workout_Daily_Summary!A:F",
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [simpleRow] },
        });
      }
      invalidateByPrefix("/summary");

      return res.json({ success: true, mode: "simple" });
    }

    // Legacy mode kept for backward compatibility with old app payload.
    const {
      start_time,
      end_time,
      activity_type,
      workout_name,
      duration_min,
      source_app,
      steps_today,
    } = req.body || {};

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

    res.json({ success: true, mode: "legacy" });
  } catch (err) {
    err.publicMessage = "Failed to save workout";
    next(err);
  }
});

module.exports = router;
