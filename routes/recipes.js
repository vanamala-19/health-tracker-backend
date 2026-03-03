const express = require("express");
const router = express.Router();
const { sheets, SPREADSHEET_ID } = require("../services/sheets");
const { cacheGet } = require("../middleware/cache");

/*
Sheets used:
- Recipes
- Recipe_Ingredients
- Recipe_Cards
*/

// =====================
// GET ALL RECIPES
// =====================
router.get("/", cacheGet(60000), async (req, res, next) => {
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Recipes!A2:G",
    });

    const recipes = (result.data.values || []).map((r) => ({
      id: r[0],
      name: r[1],
      category: r[2],
      servings: Number(r[3]),
      caloriesPerServing: Number(r[4]),
      proteinPerServing: Number(r[5]), // ✅ FIX
      notes: r[6] || "", // ✅ FIX
    }));

    res.json(recipes);
  } catch (err) {
    err.publicMessage = "Failed to load recipes";
    next(err);
  }
});

// =====================
// GET SINGLE RECIPE
// =====================
router.get("/:id", cacheGet(60000), async (req, res, next) => {
  const recipeId = req.params.id;

  try {
    const [recipeRes, ingredientRes, cardRes] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "Recipes!A2:G",
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "Recipe_Ingredients!A2:D",
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "Recipe_Cards!A2:F",
      }),
    ]);

    // -----------------
    // Recipe
    // -----------------
    const recipeRows = recipeRes.data.values || [];
    const recipeRow = recipeRows.find((r) => r[0] === recipeId);

    if (!recipeRow) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    const recipe = {
      id: recipeRow[0],
      name: recipeRow[1],
      category: recipeRow[2],
      servings: Number(recipeRow[3]),
      caloriesPerServing: Number(recipeRow[4]),
      proteinPerServing: Number(recipeRow[5]), // ✅ FIX
      notes: recipeRow[6] || "", // ✅ FIX
    };

    // -----------------
    // Ingredients
    // -----------------
    const ingredients = (ingredientRes.data.values || [])
      .filter((i) => i[0] === recipeId)
      .map((i) => ({
        item: i[1],
        quantity: i[2],
        unit: i[3],
      }));

    // -----------------
    // Cards
    // -----------------
    const cards = (cardRes.data.values || [])
      .filter((c) => c[0] === recipeId)
      .map((c) => ({
        type: c[1],
        title: c[2],
        instruction: c[3],
        flame: c[4] || "",
        time: c[5] || "",
      }));

    res.json({
      recipe,
      ingredients,
      cards,
    });
  } catch (err) {
    err.publicMessage = "Failed to load recipe";
    next(err);
  }
});

module.exports = router;
