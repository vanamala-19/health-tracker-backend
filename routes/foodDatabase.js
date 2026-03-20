const express = require("express");
const router = express.Router();
const { sheets, SPREADSHEET_ID } = require("../google");
const {
  parseSheetRow,
  badRequest,
} = require("../utils/validation");
const { cacheGet, invalidateByPrefix } = require("../middleware/cache");

const {
  readFoodDatabaseState,
  validateFoodCreatePayload,
  createFoodAppendRow,
  getEditableFoodUpdates,
  getFoodRowClearRange,
} = require("../services/foodDatabaseSheet");

function toSheetRange(sheetName, range) {
  const escaped = String(sheetName).replace(/'/g, "''");
  return `'${escaped}'!${range}`;
}

function invalidateFoodCaches() {
  invalidateByPrefix("/food-database");
  invalidateByPrefix("/recipes");
  invalidateByPrefix("/reference");
  invalidateByPrefix("/diet-log");
}

// =====================
// GET FOOD DATABASE
// =====================
router.get("/bootstrap", cacheGet(60000), async (req, res, next) => {
  try {
    const state = await readFoodDatabaseState();
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
    const state = await readFoodDatabaseState();
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
    const state = await readFoodDatabaseState();
    const payloadError = validateFoodCreatePayload(req.body, state);
    if (payloadError) {
      return badRequest(res, payloadError);
    }

    const values = createFoodAppendRow(state, req.body);

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: toSheetRange(state.sheetName, "A:ZZ"),
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [values],
      },
    });
    invalidateFoodCaches();

    res.json({ success: true });
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

    const state = await readFoodDatabaseState();
    const existing = state.foods.find((food) => food.row === row);
    if (!existing) {
      return res.status(404).json({ error: "Food item not found" });
    }

    const { error, updates } = getEditableFoodUpdates(state, req.body || {});
    if (error) {
      return badRequest(res, error);
    }
    if (!updates.length) {
      return badRequest(
        res,
        "Only editable food fields can be updated (price, labels, category, notes)",
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
    const row = parseSheetRow(req.params.row);
    if (!row) {
      return badRequest(res, "Invalid row number");
    }

    const state = await readFoodDatabaseState();

    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: getFoodRowClearRange(state, row),
    });
    invalidateFoodCaches();

    res.json({ success: true });
  } catch (err) {
    err.publicMessage = "Failed to delete food item";
    next(err);
  }
});

module.exports = router;
