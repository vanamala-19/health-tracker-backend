const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildPriceDatabaseState,
  getEditablePriceUpdates,
  deriveProteinSourceReferenceData,
  deriveLowCalorieReferenceData,
} = require("../services/priceDatabaseSheet");

test("buildPriceDatabaseState maps PRICE_DATABASE fields into frontend food records", () => {
  const state = buildPriceDatabaseState({
    sheetName: "PRICE_DATABASE",
    headers: [
      "Food Item",
      "Price",
      "Price Unit",
      "Rupees per gram/ piece",
      "price per 10gms protein",
      "calories for 10gms of protein",
      "weight in kg per 10 gms of protein",
      "Fat per 10 gms of protein",
      "carbs per 10 grams of protein",
      "protein per gram",
      "calories per gram",
      "fat per gram",
      "carbs per gram",
    ],
    rows: [
      [
        "Raw shrimp / prawns",
        700,
        "1000 gms",
        0.7,
        33.33,
        45.24,
        0.048,
        0.48,
        0,
        0.21,
        0.95,
        0.01,
        0,
      ],
      [
        "Cucumber (raw)",
        40,
        "1000 gms",
        0.04,
        57.14,
        228.57,
        1.429,
        1.43,
        57.14,
        0.01,
        0.16,
        0,
        0.04,
      ],
    ],
  });

  assert.equal(state.foods.length, 2);
  assert.equal(state.foods[0].name, "Raw shrimp / prawns");
  assert.equal(state.foods[0].unit, 1);
  assert.equal(state.foods[0].protein, 0.21);
  assert.equal(state.foods[0].calories, 0.95);
  assert.equal(state.foods[0].priceUnit, "1000 gms");
  assert.equal(state.foods[0].pricePer10gProtein, 33.33);
  assert.ok(state.foods[0].labels.includes("high protein"));
  assert.ok(state.foods[0].labels.includes("animal protein"));
  assert.equal(state.foods[1].category, "Low Calorie");
  assert.ok(state.foods[1].labels.includes("low calorie"));
  assert.deepEqual(state.editableFields, ["price"]);
});

test("getEditablePriceUpdates only allows price changes", () => {
  const state = buildPriceDatabaseState({
    headers: ["Food Item", "Price", "Price Unit", "protein per gram"],
    rows: [],
  });

  const result = getEditablePriceUpdates(state, {
    price: 360,
    proteinPerGram: 0.22,
  });

  assert.equal(result.error, undefined);
  assert.equal(result.updates.length, 1);
  assert.equal(result.updates[0].field, "price");
  assert.equal(result.updates[0].value, 360);
});

test("deriveProteinSourceReferenceData ranks protein foods from PRICE_DATABASE", () => {
  const state = buildPriceDatabaseState({
    headers: [
      "Food Item",
      "price per 10gms protein",
      "protein per gram",
      "calories per gram",
      "fat per gram",
      "carbs per gram",
    ],
    rows: [
      ["Soya chunks (dry)", 2.31, 0.52, 3.45, 0.01, 0.33],
      ["Egg white", 9.93, 0.11, 0.52, 0, 0],
      ["Papaya", 100, 0.01, 0.43, 0, 0.11],
    ],
  });

  const proteinSources = deriveProteinSourceReferenceData(state);

  assert.deepEqual(proteinSources.names, ["Soya chunks (dry)", "Egg white"]);
});

test("deriveLowCalorieReferenceData picks low-calorie foods from PRICE_DATABASE", () => {
  const state = buildPriceDatabaseState({
    headers: ["Food Item", "protein per gram", "calories per gram", "fat per gram", "carbs per gram"],
    rows: [
      ["Cucumber (raw)", 0.01, 0.16, 0, 0.04],
      ["Tomato (raw)", 0.01, 0.18, 0, 0.04],
      ["Raw chicken breast (boneless)", 0.22, 1.2, 0.03, 0],
    ],
  });

  const lowCalorie = deriveLowCalorieReferenceData(state);

  assert.deepEqual(lowCalorie.names, ["Cucumber (raw)", "Tomato (raw)"]);
});
