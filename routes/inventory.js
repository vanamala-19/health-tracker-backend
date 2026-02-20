const express = require("express");
const router = express.Router();
const { sheets, SPREADSHEET_ID } = require("../google");

/* =====================
   GET INVENTORY
===================== */

router.get("/", async (req, res) => {
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
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

/* =====================
   ADD INVENTORY ITEM
===================== */

router.post("/", async (req, res) => {
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
    res.status(500).json({ error: "Failed to add inventory item" });
  }
});

/* =====================
   UPDATE INVENTORY
   (Quantity / Purchase Date / Notes)
===================== */

router.put("/:row", async (req, res) => {
  try {
    const row = Number(req.params.row);
    const { quantity, purchaseDate, notes } = req.body;

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
    res.status(500).json({ error: "Failed to update inventory" });
  }
});

/* =====================
   DELETE INVENTORY
===================== */

router.delete("/:row", async (req, res) => {
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

module.exports = router;
