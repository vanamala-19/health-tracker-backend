const express = require("express");
const router = express.Router();
const { sheets, SPREADSHEET_ID } = require("../google");

// =====================
// GET FOOD DATABASE
// =====================
router.get("/", async (req, res) => {
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Food_Database!A2:F",
      valueRenderOption: "UNFORMATTED_VALUE",
    });

    const rows = result.data.values || [];

    const formatted = rows.map((row, index) => ({
      row: index + 2,
      name: row[0],
      unit: row[1],
      calories: Number(row[2]),
      protein: Number(row[3]),
      carbs: Number(row[4]),
      fat: Number(row[5]),
    }));

    res.json(formatted);
  } catch (err) {
    console.error("Fetch food database failed:", err);
    res.status(500).json({ error: "Failed to fetch food database" });
  }
});

// =====================
// ADD FOOD ITEM
// =====================
router.post("/", async (req, res) => {
  try {
    const { name, unit, calories, protein, carbs, fat } = req.body;

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "Food_Database!A:F",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[name, unit, calories, protein, carbs, fat]],
      },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Add food failed:", err);
    res.status(500).json({ error: "Failed to add food item" });
  }
});

// =====================
// UPDATE FOOD ITEM
// =====================
router.put("/:row", async (req, res) => {
  try {
    const row = Number(req.params.row);
    const { name, unit, calories, protein, carbs, fat } = req.body;

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Food_Database!A${row}:F${row}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[name, unit, calories, protein, carbs, fat]],
      },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Update food failed:", err);
    res.status(500).json({ error: "Failed to update food item" });
  }
});

// =====================
// DELETE FOOD ITEM
// =====================
router.delete("/:row", async (req, res) => {
  try {
    const row = Number(req.params.row);

    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `Food_Database!A${row}:F${row}`,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Delete food failed:", err);
    res.status(500).json({ error: "Failed to delete food item" });
  }
});

module.exports = router;
