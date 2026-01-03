const express = require("express");
const router = express.Router();
const { sheets, SPREADSHEET_ID } = require("../google");

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
router.get("/", async (req, res) => {
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Shift_Log!A2:M",
      valueRenderOption: "FORMATTED_VALUE",
    });

    res.json(result.data.values || []);
  } catch (err) {
    console.error("GET shift-log error:", err);
    res.status(500).json({ error: "Failed to fetch shift log" });
  }
});

// =====================
// UPDATE SHIFT LOG (SAFE PARTIAL UPDATE)
// =====================
router.put("/:row", async (req, res) => {
  try {
    const row = Number(req.params.row);

    const { shift, workMode, anchorHit, gymDone, notes } = req.body;

    // ✅ ONLY editable columns
    // D → Shift
    // E → WorkMode
    // I → Anchor Hit
    // J → Gym Done
    // M → Notes
    const values = [
      [
        shift || "", // D
        workMode || "", // E
        "", // F (Gym Time - untouched)
        "", // G (Protein Anchor - untouched)
        "", // H (Protein Target - untouched)
        anchorHit || "", // I
        gymDone || "", // J
        "", // K (Gym Type - untouched)
        "", // L (Day Status - untouched)
        notes || "", // M
      ],
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Shift_Log!D${row}:M${row}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("UPDATE shift-log error:", err);
    res.status(500).json({ error: "Failed to update shift log" });
  }
});

// =====================
// DELETE SHIFT LOG ROW (RARE USE)
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
    console.error("DELETE shift-log error:", err);
    res.status(500).json({ error: "Failed to delete shift log" });
  }
});

module.exports = router;
