const express = require("express");
const router = express.Router();
const { sheets, SPREADSHEET_ID } = require("../google");

/* =========================
   GET INVENTORY
========================= */
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

/* =========================
   ADD INVENTORY ITEM
========================= */
router.post("/", async (req, res) => {
  try {
    const {
      name,
      category,
      quantity,
      unit,
      minQuantity,
      shelfLifeDays,
      purchaseDate,
      expiryDate,
      status,
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
            shelfLifeDays,
            purchaseDate,
            expiryDate,
            status,
            notes,
          ],
        ],
      },
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to add inventory item" });
  }
});

/* =========================
   MODIFY QUANTITY (NEW)
========================= */
router.patch("/:row/quantity", async (req, res) => {
  try {
    const row = Number(req.params.row);
    const { delta, purchaseDate } = req.body;

    // Read current quantity
    const current = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `Inventory!C${row}`,
    });

    const currentQty = Number(current.data.values?.[0]?.[0] || 0);
    const newQty = currentQty + Number(delta);

    if (newQty < 0) {
      return res.status(400).json({ error: "Quantity cannot be negative" });
    }

    // Update quantity + purchase date
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Inventory!C${row}:G${row}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[newQty, purchaseDate || ""]],
      },
    });

    res.json({ success: true, quantity: newQty });
  } catch (err) {
    res.status(500).json({ error: "Failed to modify quantity" });
  }
});

/* =========================
   DELETE INVENTORY ITEM
========================= */
router.delete("/:row", async (req, res) => {
  try {
    const row = Number(req.params.row);
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `Inventory!A${row}:J${row}`,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete inventory" });
  }
});

module.exports = router;
