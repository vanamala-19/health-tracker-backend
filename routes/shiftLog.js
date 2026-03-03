const express = require("express");
const router = express.Router();
const { sheets, SPREADSHEET_ID } = require("../google");
const { parseSheetRow, badRequest } = require("../utils/validation");

/*
Shift_Log columns (A → M)

A Date              (AUTO)
B Day               (AUTO)
C Day Type          (AUTO)
D Shift             ✅ editable
E WorkMode          ✅ editable
F Gym Time          (AUTO)
G Protein Anchor    (AUTO)
H Protein Target    (AUTO)
I Anchor Hit        ✅ editable
J Gym Done          ✅ editable
K Gym Type          (AUTO)
L Day Status        (AUTO)
M Notes             ✅ editable
*/

// =====================
// GET SHIFT LOG
// =====================
router.get("/", async (req, res, next) => {
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Shift_Log!A2:M",
      valueRenderOption: "UNFORMATTED_VALUE",
    });

    const rows = result.data.values || [];
    res.json(
      rows.map((row, index) => ({
        row: index + 2,
        values: row,
      })),
    );
  } catch (err) {
    err.publicMessage = "Failed to fetch shift log";
    next(err);
  }
});

// =====================
// UPDATE SHIFT LOG (TRULY SAFE PATCH)
// =====================
router.put("/:row", async (req, res, next) => {
  try {
    const row = parseSheetRow(req.params.row);
    if (!row) {
      return badRequest(res, "Invalid row number");
    }

    const { shift, workMode, anchorHit, gymDone, notes } = req.body;

    const updates = [];

    if (shift !== undefined) {
      updates.push({ range: `Shift_Log!D${row}`, value: shift });
    }

    if (workMode !== undefined) {
      updates.push({ range: `Shift_Log!E${row}`, value: workMode });
    }

    if (anchorHit !== undefined) {
      updates.push({ range: `Shift_Log!I${row}`, value: anchorHit });
    }

    if (gymDone !== undefined) {
      updates.push({ range: `Shift_Log!J${row}`, value: gymDone });
    }

    if (notes !== undefined) {
      updates.push({ range: `Shift_Log!M${row}`, value: notes });
    }

    if (!updates.length) {
      return res.json({ success: true });
    }

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: updates.map((u) => ({
          range: u.range,
          values: [[u.value]],
        })),
      },
    });

    res.json({ success: true });
  } catch (err) {
    err.publicMessage = "Failed to update shift log safely";
    next(err);
  }
});

// =====================
// DELETE SHIFT LOG ROW (RARE)
// =====================
router.delete("/:row", async (req, res, next) => {
  try {
    const row = parseSheetRow(req.params.row);
    if (!row) {
      return badRequest(res, "Invalid row number");
    }

    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `Shift_Log!A${row}:M${row}`,
    });

    res.json({ success: true });
  } catch (err) {
    err.publicMessage = "Failed to delete shift log";
    next(err);
  }
});

module.exports = router;
