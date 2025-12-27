const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");

const app = express();
app.use(cors());

// --------------------
// Google Sheets Auth
// --------------------
const auth = new google.auth.GoogleAuth({
  keyFile: "credentials.json", // Render secret file
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
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

// --------------------
// SERVER START
// --------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
