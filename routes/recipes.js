// Get full recipe by ID
app.get("/recipes/:id", async (req, res) => {
  const recipeId = req.params.id;

  try {
    // 1️⃣ Recipe metadata
    const metaRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Recipes!A2:F",
    });

    const recipeRow = (metaRes.data.values || []).find(
      (r) => r[0] === recipeId
    );

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

    // 2️⃣ Ingredients
    const ingRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Recipe_Ingredients!A2:D",
    });

    const ingredients = (ingRes.data.values || [])
      .filter((r) => r[0] === recipeId)
      .map((r) => ({
        name: r[1],
        quantity: Number(r[2]),
        unit: r[3],
      }));

    // 3️⃣ Cards
    const cardRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Recipe_Cards!A2:G",
    });

    const cards = (cardRes.data.values || [])
      .filter((r) => r[0] === recipeId)
      .sort((a, b) => Number(a[1]) - Number(b[1]))
      .map((r) => ({
        order: Number(r[1]),
        type: r[2],
        title: r[3],
        instruction: r[4],
        flame: r[5] || "",
        time: r[6] || "",
      }));

    res.json({
      recipe,
      ingredients,
      cards,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch recipe" });
  }
});
