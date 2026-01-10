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
      valueRenderOption: "FORMATTED_VALUE",
    });

    res.json(result.data.values || []);
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

    // Read existing row to preserve untouched columns
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `Inventory!A${row}:J${row}`,
      valueRenderOption: "FORMATTED_VALUE",
    });

    const r = existing.data.values?.[0];
    if (!r) return res.status(404).json({ error: "Row not found" });

    const updatedRow = [
      r[0], // Item Name
      r[1], // Category
      quantity ?? r[2], // Quantity
      r[3], // Unit
      r[4], // Min Quantity
      r[5], // Shelf Life
      purchaseDate ?? r[6], // Purchase Date
      "", // Expiry (formula)
      "", // Status (formula)
      notes ?? r[9], // Notes
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Inventory!A${row}:J${row}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [updatedRow] },
    });

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
