const express = require("express");
const router = express.Router();
const { sheets, SPREADSHEET_ID } = require("../google");
const {
  isNonEmptyString,
  isValidDateInput,
  badRequest,
} = require("../utils/validation");
const { invalidateByPrefix } = require("../middleware/cache");

function normalizeDateKey(value) {
  if (!value) return "";
  const raw = String(value).trim();
  if (!raw) return "";

  if (raw.includes("/")) {
    const [d, m, y] = raw.split("/");
    if (d && m && y) {
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }

  const dt = new Date(raw);
  if (!Number.isNaN(dt.getTime())) {
    return dt.toISOString().slice(0, 10);
  }
  return raw;
}

function normalizeStatus(status) {
  const s = String(status || "")
    .trim()
    .toLowerCase();
  if (["done", "workout", "workout completed", "completed", "yes"].includes(s)) {
    return "Workout completed";
  }
  if (["skipped", "skip", "rest", "no", "cancelled"].includes(s)) {
    return "Rest";
  }
  return null;
}

/*
====================================
GET WORKOUTS (UI / WEB APP)
====================================
*/
router.get("/", async (req, res, next) => {
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Workout_Daily_Summary!A2:B",
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
    if (!isValidDateInput(date)) {
      return badRequest(res, "Valid date is required");
    }
    if (!isNonEmptyString(status)) {
      return badRequest(res, "status is required");
    }

    const normalizedStatus = normalizeStatus(status);
    if (!normalizedStatus) {
      return badRequest(res, "status must be Workout completed or Rest");
    }

    const normalizedDate = normalizeDateKey(date);
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Workout_Daily_Summary!A2:B",
      valueRenderOption: "FORMATTED_VALUE",
    });
    const rows = existing.data.values || [];
    const existingIndex = rows.findIndex(
      (r) => normalizeDateKey(r[0]) === normalizedDate,
    );

    if (existingIndex >= 0) {
      const rowNumber = existingIndex + 2;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Workout_Daily_Summary!A${rowNumber}:B${rowNumber}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[normalizedDate, normalizedStatus]] },
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "Workout_Daily_Summary!A:B",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[normalizedDate, normalizedStatus]] },
      });
    }

    invalidateByPrefix("/summary");

    res.json({ success: true });
  } catch (err) {
    err.publicMessage = "Failed to save workout";
    next(err);
  }
});

module.exports = router;
