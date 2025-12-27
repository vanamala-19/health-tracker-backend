const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");

const app = express();
app.use(cors());

// --------------------
// Google Sheets Auth
// --------------------
const auth = new google.auth.GoogleAuth({
  keyFile: "credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

const SPREADSHEET_ID = "1zrwp89llivNkI7lfV3ewRvL_TNhmQBAustMwUDeFMrk";

// --------------------
// ROUTES
// --------------------

// Health check
app.get("/", (req, res) => {
  res.send("Health Tracker Backend is running 🚀");
});

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
    console.error("Summary error:", err.message);
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
    console.error("Weight error:", err.message);
    res.status(500).json({ error: "Failed to fetch weight data" });
  }
});

// Workout daily summary
app.get("/workout-summary", async (req, res) => {
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Workout_Daily_Summary!A2:D",
      valueRenderOption: "FORMATTED_VALUE",
    });

    res.json(result.data.values || []);
  } catch (err) {
    console.error("Workout error:", err.message);
    res.status(500).json({ error: "Failed to fetch workout summary" });
  }
});

// List all sheet names (debug helper)
app.get("/sheets", async (req, res) => {
  try {
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const sheetNames = meta.data.sheets.map((s) => s.properties.title);

    res.json(sheetNames);
  } catch (err) {
    console.error("Sheets error:", err.message);
    res.status(500).json({ error: "Failed to fetch sheet names" });
  }
});

// diet logs
app.get("/diet-log", async (req, res) => {
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Diet_Log!A2:R",
      valueRenderOption: "FORMATTED_VALUE",
    });

    res.json(result.data.values || []);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch diet log" });
  }
});

app.post("/diet-log", express.json(), async (req, res) => {
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
            "", // M Image link (later)
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save diet log" });
  }
});

app.delete("/diet-log/:row", async (req, res) => {
  try {
    const row = Number(req.params.row);

    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `Diet_Log!A${row}:R${row}`,
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete meal" });
  }
});

app.put("/diet-log/:row", express.json(), async (req, res) => {
  try {
    const row = Number(req.params.row);

    const values = [
      [
        req.body.date,
        req.body.day,
        req.body.time,
        req.body.mealType,
        req.body.context,
        req.body.proteinSource,
        req.body.veggies,
        req.body.carbsFood,
        req.body.fatsFood,
        req.body.portionNotes,
        req.body.hunger,
        req.body.fullness,
        "",
        req.body.notes,
        req.body.calories,
        req.body.protein,
        req.body.carbs,
        req.body.fats,
      ],
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Diet_Log!A${row}:R${row}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update meal" });
  }
});

// =====================
// INVENTORY
// =====================

// GET inventory
app.get("/inventory", async (req, res) => {
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Inventory!A2:I",
      valueRenderOption: "FORMATTED_VALUE",
    });

    res.json(result.data.values || []);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

// ADD inventory item
app.post("/inventory", express.json(), async (req, res) => {
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
      notes,
    } = req.body;

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "Inventory!A:I",
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
            notes,
          ],
        ],
      },
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to add inventory" });
  }
});

// DELETE inventory item
app.delete("/inventory/:row", async (req, res) => {
  try {
    const row = Number(req.params.row);

    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `Inventory!A${row}:I${row}`,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Inventory delete error:", err.message);
    res.status(500).json({ error: "Failed to delete inventory" });
  }
});

// --------------------
// SERVER START
// --------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
