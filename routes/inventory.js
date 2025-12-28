const express = require("express");
const router = express.Router();
const { sheets, SPREADSHEET_ID } = require("../google");

// GET inventory
router.get("/", async (req, res) => {
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Inventory!A2:J",
      valueRenderOption: "FORMATTED_VALUE",
    });
    res.json(result.data.values || []);
  } catch {
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

// ADD inventory item
router.post("/", async (req, res) => {
  try {
    const {
      name,
      category,
      quantity,
      unit,
      calories,
      protein,
      carbs,
      fats,
      fiber,
      notes,
    } = req.body;

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "Inventory!A:J",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            name,
            category,
            quantity,
            unit,
            calories,
            protein,
            carbs,
            fats,
            fiber,
            notes,
          ],
        ],
      },
    });

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to add inventory" });
  }
});

// UPDATE inventory
router.put("/:row", async (req, res) => {
  try {
    const row = Number(req.params.row);
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Inventory!A${row}:J${row}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [req.body.values] },
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to update inventory" });
  }
});

// DELETE inventory
router.delete("/:row", async (req, res) => {
  try {
    const row = Number(req.params.row);
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `Inventory!A${row}:J${row}`,
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete inventory" });
  }
});

module.exports = router;

// =====================
// RECIPES
// =====================

// Get all recipes
app.get("/recipes", async (req, res) => {
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Recipes!A2:F",
      valueRenderOption: "FORMATTED_VALUE",
    });

    const rows = result.data.values || [];

    const recipes = rows.map((r) => ({
      id: r[0],
      name: r[1],
      category: r[2],
      servings: Number(r[3]),
      caloriesPerServing: Number(r[4]),
      notes: r[5] || "",
    }));

    res.json(recipes);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch recipes" });
  }
});
