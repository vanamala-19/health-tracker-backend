const express = require("express");
const router = express.Router();
const { sheets, SPREADSHEET_ID } = require("../google");

// =====================
// GET SHIFT LOG
// =====================
router.get("/", async (req, res) => {
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Shift_Log!A2:M",
      valueRenderOption: "FORMATTED_VALUE",
    });

    res.json(result.data.values || []);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch shift log" });
  }
});

// =====================
// ADD SHIFT LOG ENTRY
// =====================
router.post("/", async (req, res) => {
  try {
    const {
      date,
      day,
      dayType,
      shift,
      workMode,
      gymTime,
      proteinAnchor,
      proteinTarget,
      anchorHit,
      gymDone,
      gymType,
      dayStatus,
      notes,
    } = req.body;

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "Shift_Log!A:M",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            date,
            day,
            dayType,
            shift,
            workMode,
            gymTime,
            proteinAnchor,
            proteinTarget,
            anchorHit,
            gymDone,
            gymType,
            dayStatus,
            notes,
          ],
        ],
      },
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to save shift log" });
  }
});

// =====================
// UPDATE SHIFT LOG ROW
// =====================
router.put("/:row", async (req, res) => {
  try {
    const row = Number(req.params.row);

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Shift_Log!A${row}:M${row}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [req.body.values] },
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update shift log" });
  }
});

// =====================
// DELETE SHIFT LOG ROW
// =====================
router.delete("/:row", async (req, res) => {
  try {
    const row = Number(req.params.row);

    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `Shift_Log!A${row}:M${row}`,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete shift log" });
  }
});

module.exports = router;
