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
      range: "Diet_Log!A2:H",
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

// --------------------
// SERVER START
// --------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
