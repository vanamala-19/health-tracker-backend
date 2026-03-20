const express = require("express");
const router = express.Router();
const { sheets, SPREADSHEET_ID } = require("../google");
const {
  parseSheetRow,
  isNonEmptyString,
  isValidDateInput,
  badRequest,
} = require("../utils/validation");
const { cacheGet, invalidateByPrefix } = require("../middleware/cache");
const {
  readFoodDatabaseState,
  deriveProteinSourceReferenceData,
  deriveLowCalorieReferenceData,
} = require("../services/foodDatabaseSheet");

function mapDietRows(rows) {
  return rows.map((row, index) => ({
    row: index + 2,
    values: row,
  }));
}

function normalizeHeader(value, fallbackIndex) {
  const text = String(value || "").trim();
  if (!text) return `col${fallbackIndex + 1}`;
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || `col${fallbackIndex + 1}`
  );
}

function mapReferenceRows(headers, rows) {
  const normalizedHeaders = headers.map((h, i) => normalizeHeader(h, i));
  const items = rows
    .filter((row) => row.some((cell) => String(cell || "").trim()))
    .map((row) => {
      const item = {};
      row.forEach((cell, i) => {
        item[normalizedHeaders[i] || `col${i + 1}`] = cell;
      });
      return item;
    });

  return {
    headers: normalizedHeaders,
    items,
    names: Array.from(
      new Set(
        items
          .map((item) => String(item[normalizedHeaders[0]] || "").trim())
          .filter(Boolean),
      ),
    ),
  };
}

function toRange(sheetName, range) {
  const escaped = String(sheetName).replace(/'/g, "''");
  return `'${escaped}'!${range}`;
}

async function readReferenceRowsFromCandidates(candidates) {
  let lastError = null;

  for (const sheetName of candidates) {
    try {
      const [headerRes, dataRes] = await Promise.all([
        sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: toRange(sheetName, "A1:Z1"),
        }),
        sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: toRange(sheetName, "A2:Z"),
        }),
      ]);

      return mapReferenceRows(
        headerRes.data.values?.[0] || [],
        dataRes.data.values || [],
      );
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("Reference sheet lookup failed");
}

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
    res.json(mapDietRows(rows));
  } catch (err) {
    err.publicMessage = "Failed to fetch diet log";
    next(err);
  }
});

router.get("/bootstrap", cacheGet(30000), async (req, res, next) => {
  try {
    const [dietRes, foodState] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "Diet_Log!A2:R",
        valueRenderOption: "UNFORMATTED_VALUE",
      }),
      readFoodDatabaseState(),
    ]);

    let proteinSources = deriveProteinSourceReferenceData(foodState);
    let lowCalorie = deriveLowCalorieReferenceData(foodState);

    if (!proteinSources.names.length) {
      proteinSources = await readReferenceRowsFromCandidates([
        "Protein Source",
        "Protein Source ",
        "Protein_Source",
      ]);
    }

    if (!lowCalorie.names.length) {
      lowCalorie = await readReferenceRowsFromCandidates([
        "calories free",
        "Calories Free",
        "calorie free",
      ]);
    }

    res.json({
      meals: mapDietRows(dietRes.data.values || []),
      foodDatabase: foodState.foods,
      proteinSources,
      lowCalorie,
    });
  } catch (err) {
    err.publicMessage = "Failed to fetch diet bootstrap data";
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
