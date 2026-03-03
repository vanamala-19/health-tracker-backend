const express = require("express");
const router = express.Router();
const { sheets, SPREADSHEET_ID } = require("../google");
const {
  parseSheetRow,
  isNonEmptyString,
  isValidDateInput,
  badRequest,
} = require("../utils/validation");
const { invalidateByPrefix } = require("../middleware/cache");

function validateDietPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return "Request body is required";
  }
  if (!isValidDateInput(payload.date)) {
    return "Valid date is required";
  }
  if (!isNonEmptyString(payload.time)) {
    return "time is required";
  }
  if (!isNonEmptyString(payload.mealType)) {
    return "mealType is required";
  }
  return null;
}

// =====================
// GET DIET LOG
// =====================
router.get("/", async (req, res, next) => {
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Diet_Log!A2:R",
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
    err.publicMessage = "Failed to fetch diet log";
    next(err);
  }
});

// =====================
// ADD DIET LOG (NEW MEAL)
// =====================
router.post("/", async (req, res, next) => {
  try {
    const payloadError = validateDietPayload(req.body);
    if (payloadError) {
      return badRequest(res, payloadError);
    }

    const {
      date,
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
      notes,
      calories,
      protein,
      carbs,
      fats,
      mealItems = [], // receive meal items from frontend
    } = req.body;

    const day = new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
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
            notes, // M
            calories, // N
            protein, // O
            carbs, // P
            fats, // Q
            JSON.stringify(mealItems || []), // R store meal items as JSON string
          ],
        ],
      },
    });
    invalidateByPrefix("/summary");

    res.json({ success: true });
  } catch (err) {
    err.publicMessage = "Failed to save diet log";
    next(err);
  }
});

// =====================
// UPDATE DIET LOG (EDIT)
// 🔥 FIXED VERSION
// =====================
router.put("/:row", async (req, res, next) => {
  try {
    const row = parseSheetRow(req.params.row);
    if (!row) {
      return badRequest(res, "Invalid row number");
    }

    const payloadError = validateDietPayload(req.body);
    if (payloadError) {
      return badRequest(res, payloadError);
    }

    const {
      date,
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
      notes,
      calories,
      protein,
      carbs,
      fats,
      mealItems = [], // receive meal items from frontend
    } = req.body;

    const day = new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
    });

    const values = [
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
        notes, // M
        calories, // N
        protein, // O
        carbs, // P
        fats, // Q
        JSON.stringify(mealItems || []), // R store meal items as JSON string
      ],
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Diet_Log!A${row}:R${row}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
    invalidateByPrefix("/summary");

    res.json({ success: true });
  } catch (err) {
    err.publicMessage = "Failed to update diet log";
    next(err);
  }
});

// =====================
// DELETE DIET LOG
// =====================
router.delete("/:row", async (req, res, next) => {
  try {
    const row = parseSheetRow(req.params.row);
    if (!row) {
      return badRequest(res, "Invalid row number");
    }

    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `Diet_Log!A${row}:R${row}`,
    });
    invalidateByPrefix("/summary");

    res.json({ success: true });
  } catch (err) {
    err.publicMessage = "Failed to delete diet log";
    next(err);
  }
});

module.exports = router;
