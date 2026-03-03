const express = require("express");
const router = express.Router();
const { sheets, SPREADSHEET_ID } = require("../google");
const {
  parseSheetRow,
  isNonEmptyString,
  toFiniteNumber,
  isValidDateInput,
  badRequest,
} = require("../utils/validation");

/* =====================
   GET INVENTORY
===================== */

router.get("/", async (req, res, next) => {
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Inventory!A2:J",
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
    err.publicMessage = "Failed to fetch inventory";
    next(err);
  }
});

/* =====================
   ADD INVENTORY ITEM
===================== */

router.post("/", async (req, res, next) => {
  try {
    const {
      name,
      category,
      quantity,
      unit,
      minQuantity,
      shelfLife,
      purchaseDate,
      notes,
    } = req.body;

    if (!isNonEmptyString(name)) return badRequest(res, "name is required");
    if (!isNonEmptyString(category)) return badRequest(res, "category is required");
    if (!isNonEmptyString(unit)) return badRequest(res, "unit is required");
    if (toFiniteNumber(quantity) === null) return badRequest(res, "quantity must be a number");
    if (toFiniteNumber(minQuantity) === null) {
      return badRequest(res, "minQuantity must be a number");
    }
    if (purchaseDate && !isValidDateInput(purchaseDate)) {
      return badRequest(res, "purchaseDate is invalid");
    }

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
            minQuantity,
            shelfLife,
            purchaseDate || "",
            "", // Expiry → handled by sheet formula
            "", // Status → handled by sheet formula
            notes || "",
          ],
        ],
      },
    });

    res.json({ success: true });
  } catch (err) {
    err.publicMessage = "Failed to add inventory item";
    next(err);
  }
});

/* =====================
   UPDATE INVENTORY
   (Quantity / Purchase Date / Notes)
===================== */

router.put("/:row", async (req, res, next) => {
  try {
    const row = parseSheetRow(req.params.row);
    if (!row) {
      return badRequest(res, "Invalid row number");
    }
    const { quantity, purchaseDate, notes } = req.body;

    if (
      quantity === undefined &&
      purchaseDate === undefined &&
      notes === undefined
    ) {
      return badRequest(res, "At least one field is required");
    }

    if (quantity !== undefined && toFiniteNumber(quantity) === null) {
      return badRequest(res, "quantity must be a number");
    }

    if (purchaseDate !== undefined && purchaseDate !== "" && !isValidDateInput(purchaseDate)) {
      return badRequest(res, "purchaseDate is invalid");
    }

    // Update Quantity (Column C)
    if (quantity !== undefined) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Inventory!C${row}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[quantity]] },
      });
    }

    // Update Purchase Date (Column G)
    if (purchaseDate !== undefined) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Inventory!G${row}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[purchaseDate]] },
      });
    }

    // Update Notes (Column J)
    if (notes !== undefined) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Inventory!J${row}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[notes]] },
      });
    }

    res.json({ success: true });
  } catch (err) {
    err.publicMessage = "Failed to update inventory";
    next(err);
  }
});

/* =====================
   DELETE INVENTORY
===================== */

router.delete("/:row", async (req, res, next) => {
  try {
    const row = parseSheetRow(req.params.row);
    if (!row) {
      return badRequest(res, "Invalid row number");
    }
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `Inventory!A${row}:J${row}`,
    });
    res.json({ success: true });
  } catch (err) {
    err.publicMessage = "Failed to delete inventory";
    next(err);
  }
});

module.exports = router;
