const express = require("express");
const router = express.Router();
const { sheets, SPREADSHEET_ID } = require("../google");

// GET diet log
router.get("/", async (req, res) => {
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Diet_Log!A2:R",
      valueRenderOption: "FORMATTED_VALUE",
    });
    res.json(result.data.values || []);
  } catch {
    res.status(500).json({ error: "Failed to fetch diet log" });
  }
});

// ADD diet log
router.post("/", async (req, res) => {
  try {
    const {
      date,
      mealType,
      context,
      proteinSource,
      veggies,
      carbsFood,
      fatsFood,
      portionNotes,
      hunger,
      fullness,
      notes,
      calories,
      protein,
      carbs,
      fats,
    } = req.body;

    const day = new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
    });

    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "Diet_Log!A:R",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            date,
            day,
            time,
            mealType,
            context,
            proteinSource,
            veggies,
            carbsFood,
            fatsFood,
            portionNotes,
            hunger,
            fullness,
            "",
            notes,
            calories,
            protein,
            carbs,
            fats,
          ],
        ],
      },
    });

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to save diet log" });
  }
});

// UPDATE diet log
router.put("/:row", async (req, res) => {
  try {
    const row = Number(req.params.row);

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Diet_Log!A${row}:R${row}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [req.body.values] },
    });

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to update diet log" });
  }
});

// DELETE diet log
router.delete("/:row", async (req, res) => {
  try {
    const row = Number(req.params.row);

    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `Diet_Log!A${row}:R${row}`,
    });

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete diet log" });
  }
});

module.exports = router;
