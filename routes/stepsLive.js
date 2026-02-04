const express = require("express");
const router = express.Router();
const { sheets, SPREADSHEET_ID } = require("../google");

/*
====================================
GET LIVE STEPS (UI)
====================================
*/
router.get("/", async (req, res) => {
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Steps_Live!A2:C",
      valueRenderOption: "FORMATTED_VALUE",
    });

    res.json(result.data.values || []);
  } catch (err) {
    console.error("Fetch steps failed:", err);
    res.status(500).json({ error: "Failed to fetch steps" });
  }
});

/*
====================================
UPSERT LIVE STEPS (ANDROID)
====================================
*/
router.post("/", async (req, res) => {
  try {
    const { date, steps_live } = req.body;

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
          values: [[date, steps_live, time]],
        },
      });
    } else {
      // INSERT
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "Steps_Live!A:C",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[date, steps_live, time]],
        },
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Live steps failed:", err);
    res.status(500).json({ error: "Failed to save steps" });
  }
});

module.exports = router;
