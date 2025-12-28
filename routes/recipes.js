const express = require("express");
const router = express.Router();
const { sheets, SPREADSHEET_ID } = require("../services/sheets");

/*
Sheets used:
- Recipes
- Recipe_Ingredients
- Recipe_Cards
*/

// =====================
// GET ALL RECIPES
// =====================
router.get("/", async (req, res) => {
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Recipes!A2:F",
    });

    const recipes = (result.data.values || []).map((r) => ({
      id: r[0],
      name: r[1],
      category: r[2],
      servings: Number(r[3]),
      caloriesPerServing: Number(r[4]),
      notes: r[5] || "",
    }));

    res.json(recipes);
  } catch (err) {
    res.status(500).json({ error: "Failed to load recipes" });
  }
});

// =====================
// GET SINGLE RECIPE (WITH INGREDIENTS + CARDS)
// =====================
router.get("/:id", async (req, res) => {
  const recipeId = req.params.id;

  try {
    const [recipeRes, ingredientRes, cardRes] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "Recipes!A2:F",
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
    const recipeRow = recipeRes.data.values.find((r) => r[0] === recipeId);

    if (!recipeRow) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    const recipe = {
      id: recipeRow[0],
      name: recipeRow[1],
      category: recipeRow[2],
      servings: Number(recipeRow[3]),
      caloriesPerServing: Number(recipeRow[4]),
      notes: recipeRow[5] || "",
    };

    // -----------------
    // Ingredients
    // -----------------
    const ingredients = (ingredientRes.data.values || [])
      .filter((i) => i[0] === recipeId)
      .map((i) => ({
        item: i[1],
        quantity: Number(i[2]),
        unit: i[3],
      }));

    // -----------------
    // Cards
    // -----------------
    const cards = (cardRes.data.values || [])
      .filter((c) => c[0] === recipeId)
      .map((c) => ({
        type: c[1], // info / prep / cook / finish / log
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
    console.error(err);
    res.status(500).json({ error: "Failed to load recipe" });
  }
});

module.exports = router;
