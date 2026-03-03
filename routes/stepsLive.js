const express = require("express");
const router = express.Router();
const { sheets, SPREADSHEET_ID } = require("../google");
const {
  isValidDateInput,
  toFiniteNumber,
  badRequest,
} = require("../utils/validation");

// Prevent duplicate inserts for the same date when concurrent requests arrive.
const dateLocks = new Map();

async function withDateLock(dateKey, work) {
  const previous = dateLocks.get(dateKey) || Promise.resolve();
  let release;
  const current = new Promise((resolve) => {
    release = resolve;
  });

  dateLocks.set(dateKey, previous.then(() => current));

  await previous;
  try {
    return await work();
  } finally {
    release();
    if (dateLocks.get(dateKey) === current) {
      dateLocks.delete(dateKey);
    }
  }
}

/*
====================================
GET LIVE STEPS (UI)
====================================
*/
router.get("/", async (req, res, next) => {
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Steps_Live!A2:C",
      valueRenderOption: "FORMATTED_VALUE",
    });

    res.json(result.data.values || []);
  } catch (err) {
    err.publicMessage = "Failed to fetch steps";
    next(err);
  }
});

/*
====================================
UPSERT LIVE STEPS (ANDROID)
====================================
*/
router.post("/", async (req, res, next) => {
  try {
    const { date, steps_live } = req.body;
    if (!isValidDateInput(date)) {
      return badRequest(res, "Valid date is required");
    }
    const liveSteps = toFiniteNumber(steps_live);
    if (liveSteps === null || liveSteps < 0) {
      return badRequest(res, "steps_live must be a non-negative number");
    }

    await withDateLock(String(date).trim(), async () => {
      const existing = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "Steps_Live!A2:C",
      });

      const rows = existing.data.values || [];
      const index = rows.findIndex((r) => r[0] === date);
      const time = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      if (index >= 0) {
        // UPDATE
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `Steps_Live!A${index + 2}:C${index + 2}`,
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [[date, liveSteps, time]],
          },
        });
      } else {
        // INSERT
        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: "Steps_Live!A:C",
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [[date, liveSteps, time]],
          },
        });
      }
    });

    res.json({ success: true });
  } catch (err) {
    err.publicMessage = "Failed to save steps";
    next(err);
  }
});

module.exports = router;
