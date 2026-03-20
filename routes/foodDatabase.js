const express = require("express");
const router = express.Router();
const { sheets, SPREADSHEET_ID } = require("../google");
const {
  parseSheetRow,
  badRequest,
} = require("../utils/validation");
const { cacheGet, invalidateByPrefix } = require("../middleware/cache");

const {
  readPriceDatabaseState,
  getEditablePriceUpdates,
} = require("../services/priceDatabaseSheet");

function toSheetRange(sheetName, range) {
  const escaped = String(sheetName).replace(/'/g, "''");
  return `'${escaped}'!${range}`;
}

function invalidateFoodCaches() {
  invalidateByPrefix("/food-database");
  invalidateByPrefix("/price-database");
  invalidateByPrefix("/recipes");
  invalidateByPrefix("/reference");
  invalidateByPrefix("/diet-log");
}

// =====================
// GET FOOD DATABASE
// =====================
router.get("/bootstrap", cacheGet(60000), async (req, res, next) => {
  try {
    const state = await readPriceDatabaseState();
    res.json({
      foods: state.foods,
      meta: {
        sheetName: state.sheetName,
        headers: state.headers,
        editableFields: state.editableFields,
        availableLabels: state.availableLabels,
        availableCategories: state.availableCategories,
      },
    });
  } catch (err) {
    err.publicMessage = "Failed to fetch food database bootstrap";
    next(err);
  }
});

router.get("/", cacheGet(60000), async (req, res, next) => {
  try {
    const state = await readPriceDatabaseState();
    res.json(state.foods);
  } catch (err) {
    err.publicMessage = "Failed to fetch food database";
    next(err);
  }
});

// =====================
// ADD FOOD ITEM
// =====================
router.post("/", async (req, res, next) => {
  try {
    res.status(405).json({
      error:
        "PRICE_DATABASE is formula-driven. Creating new rows is disabled until backend-managed formulas are implemented.",
    });
  } catch (err) {
    err.publicMessage = "Failed to add food item";
    next(err);
  }
});

// =====================
// UPDATE FOOD ITEM
// =====================
router.put("/:row", async (req, res, next) => {
  try {
    const row = parseSheetRow(req.params.row);
    if (!row) {
      return badRequest(res, "Invalid row number");
    }

    const state = await readPriceDatabaseState();
    const existing = state.foods.find((food) => food.row === row);
    if (!existing) {
      return res.status(404).json({ error: "Food item not found" });
    }

    const { error, updates } = getEditablePriceUpdates(state, req.body || {});
    if (error) {
      return badRequest(res, error);
    }
    if (!updates.length) {
      return badRequest(
        res,
        "Only price can be updated from PRICE_DATABASE",
      );
    }

    await Promise.all(
      updates.map((update) =>
        sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: toSheetRange(state.sheetName, `${update.columnLetter}${row}`),
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [[update.value]],
          },
        }),
      ),
    );
    invalidateFoodCaches();

    res.json({ success: true });
  } catch (err) {
    err.publicMessage = "Failed to update food item";
    next(err);
  }
});

// =====================
// DELETE FOOD ITEM
// =====================
router.delete("/:row", async (req, res, next) => {
  try {
    res.status(405).json({
      error:
        "PRICE_DATABASE rows are formula-driven. Deleting rows is disabled from the API.",
    });
  } catch (err) {
    err.publicMessage = "Failed to delete food item";
    next(err);
  }
});

module.exports = router;
