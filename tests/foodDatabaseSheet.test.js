const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildFoodDatabaseState,
  createFoodAppendRow,
  getEditableFoodUpdates,
  deriveProteinSourceReferenceData,
  deriveLowCalorieReferenceData,
} = require("../services/foodDatabaseSheet");

test("buildFoodDatabaseState maps canonical nutrition and metadata fields", () => {
  const state = buildFoodDatabaseState({
    sheetName: "FOOD_DATABASE",
    headers: [
      "Food Item",
      "Unit (g)",
      "Calories",
      "Protein",
      "Carbs",
      "Fat",
      "protein per gram",
      "calories per gram",
      "fat per gram",
      "carbs per gram",
      "Price",
      "Labels",
      "Category",
      "Notes",
    ],
    rows: [
      [
        "Cooked chicken (boneless)",
        100,
        165,
        31,
        0,
        3.5,
        0.31,
        1.65,
        0.04,
        0,
        220,
        "protein, lean",
        "Protein Source",
        "sheet formula row",
      ],
    ],
  });

  assert.equal(state.foods.length, 1);
  assert.equal(state.foods[0].name, "Cooked chicken (boneless)");
  assert.equal(state.foods[0].unit, 100);
  assert.equal(state.foods[0].proteinPerGram, 0.31);
  assert.equal(state.foods[0].price, 220);
  assert.deepEqual(state.foods[0].labels, ["protein", "lean"]);
  assert.equal(state.foods[0].category, "Protein Source");
  assert.ok(state.editableFields.includes("price"));
  assert.ok(state.editableFields.includes("labels"));
  assert.ok(state.editableFields.includes("category"));
  assert.ok(state.editableFields.includes("notes"));
});

test("createFoodAppendRow aligns payload to detected headers", () => {
  const state = buildFoodDatabaseState({
    headers: [
      "Food Item",
      "Unit (g)",
      "Calories",
      "Protein",
      "Carbs",
      "Fat",
      "Price",
      "Labels",
      "Category",
      "Notes",
    ],
    rows: [],
  });

  const values = createFoodAppendRow(state, {
    name: "Tofu",
    unit: 100,
    calories: 76,
    protein: 15.5,
    carbs: 2,
    fat: 4,
    price: 55,
    labels: ["protein", "veg"],
    category: "Protein",
    notes: "Good for meal builder",
  });

  assert.equal(values[state.headerMap.name], "Tofu");
  assert.equal(values[state.headerMap.unit], 100);
  assert.equal(values[state.headerMap.price], 55);
  assert.equal(values[state.headerMap.labels], "protein, veg");
  assert.equal(values[state.headerMap.category], "Protein");
});

test("getEditableFoodUpdates only returns safe editable columns", () => {
  const state = buildFoodDatabaseState({
    headers: ["Food Item", "Price", "Labels", "Category", "Notes"],
    rows: [],
  });

  const result = getEditableFoodUpdates(state, {
    price: 60,
    labels: "protein, pantry",
    category: "Protein",
    notes: "updated",
    protein: 50,
  });

  assert.equal(result.error, undefined);
  assert.equal(result.updates.length, 4);
  assert.deepEqual(
    result.updates.map((entry) => entry.field).sort(),
    ["category", "labels", "notes", "price"],
  );
});

test("derive reference payloads from FOOD_DATABASE labels", () => {
  const state = buildFoodDatabaseState({
    headers: ["Food Item", "Labels", "Category"],
    rows: [
      ["Chicken breast", "protein, lean", "Protein Source"],
      ["Cucumber", "low calorie, veggie", "Vegetable"],
      ["Cooked rice", "carb", "Carb"],
    ],
  });

  const proteinSources = deriveProteinSourceReferenceData(state);
  const lowCalorie = deriveLowCalorieReferenceData(state);

  assert.deepEqual(proteinSources.names, ["Chicken breast"]);
  assert.deepEqual(lowCalorie.names, ["Cucumber"]);
});
