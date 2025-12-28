const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");

const app = express();
app.use(cors());
app.use(express.json());

// =====================
// GOOGLE SHEETS AUTH
// =====================
const auth = new google.auth.GoogleAuth({
  keyFile: "credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

const SPREADSHEET_ID = "1zrwp89llivNkI7lfV3ewRvL_TNhmQBAustMwUDeFMrk";

// =====================
// HEALTH CHECK
// =====================
app.get("/", (req, res) => {
  res.send("✅ Health Tracker Backend is running");
});

// =====================
// DASHBOARD DATA
// =====================

// Diet daily summary
app.get("/summary", async (req, res) => {
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Diet_Daily_Summary!A2:E",
      valueRenderOption: "FORMATTED_VALUE",
    });
    res.json(result.data.values || []);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch diet summary" });
  }
});

// Body weight
app.get("/weight", async (req, res) => {
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Body_Weight!A2:B",
      valueRenderOption: "FORMATTED_VALUE",
    });
    res.json(result.data.values || []);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch weight data" });
  }
});

// Workout summary
app.get("/workout-summary", async (req, res) => {
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Workout_Daily_Summary!A2:D",
      valueRenderOption: "FORMATTED_VALUE",
    });
    res.json(result.data.values || []);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch workout summary" });
  }
});

// =====================
// DIET LOG
// =====================

// GET diet log
app.get("/diet-log", async (req, res) => {
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
app.post("/diet-log", async (req, res) => {
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
            date, // A
            day, // B
            time, // C
            mealType, // D
            context, // E
            proteinSource, // F
            veggies, // G
            carbsFood, // H
            fatsFood, // I
            portionNotes, // J
            hunger, // K
            fullness, // L
            "", // M Image
            notes, // N
            calories, // O
            protein, // P
            carbs, // Q
            fats, // R
          ],
        ],
      },
    });

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to save diet log" });
  }
});

// DELETE diet log row
app.delete("/diet-log/:row", async (req, res) => {
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

// UPDATE diet log row
app.put("/diet-log/:row", async (req, res) => {
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

// =====================
// INVENTORY (WITH FIBER)
// =====================

// Inventory columns (IMPORTANT):
// A Name
// B Category
// C Quantity
// D Unit
// E Calories/unit
// F Protein/unit
// G Carbs/unit
// H Fats/unit
// I Fiber/unit
// J Notes

// GET inventory
app.get("/inventory", async (req, res) => {
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
app.post("/inventory", async (req, res) => {
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

// UPDATE inventory row
app.put("/inventory/:row", async (req, res) => {
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

// DELETE inventory row
app.delete("/inventory/:row", async (req, res) => {
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

// =====================
// START SERVER
// =====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
