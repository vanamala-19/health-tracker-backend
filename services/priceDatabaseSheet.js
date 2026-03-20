const PRICE_SHEET_CANDIDATES = [
  "PRICE_DATABASE",
  "Price_Database",
  "Price Database",
];

const HEADER_ALIASES = {
  name: ["food_item", "food_name", "food", "name", "item"],
  price: ["price", "cost", "mrp", "rate", "price_inr"],
  priceUnit: ["price_unit", "unit", "rate_unit"],
  rupeesPerGram: [
    "rupees_per_gram_piece",
    "rupees_per_gram_or_piece",
    "rupees_per_gram",
  ],
  pricePer10gProtein: [
    "price_per_10gms_protein",
    "price_per_10_grams_protein",
    "price_per_10g_protein",
  ],
  caloriesPer10gProtein: [
    "calories_for_10gms_of_protein",
    "calories_for_10_grams_of_protein",
    "calories_for_10g_protein",
  ],
  weightKgPer10gProtein: [
    "weight_in_kg_per_10_gms_of_protein",
    "weight_in_kg_per_10_grams_of_protein",
    "weight_in_kg_per_10g_protein",
  ],
  fatPer10gProtein: [
    "fat_per_10_gms_of_protein",
    "fat_per_10_grams_of_protein",
    "fat_per_10g_protein",
  ],
  carbsPer10gProtein: [
    "carbs_per_10_grams_of_protein",
    "carbs_per_10_gms_of_protein",
    "carbs_per_10g_protein",
  ],
  proteinPerGram: ["protein_per_gram", "protein_per_g"],
  caloriesPerGram: [
    "calories_per_gram",
    "calories_per_g",
    "kcal_per_gram",
    "kcal_per_g",
  ],
  fatPerGram: ["fat_per_gram", "fat_per_g", "fats_per_gram", "fats_per_g"],
  carbsPerGram: [
    "carbs_per_gram",
    "carbs_per_g",
    "carbohydrates_per_gram",
    "carbohydrates_per_g",
  ],
};

function normalizeHeader(value, fallbackIndex) {
  const text = String(value || "").trim();
  if (!text) return `col${fallbackIndex + 1}`;
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || `col${fallbackIndex + 1}`
  );
}

function toRange(sheetName, range) {
  const escaped = String(sheetName).replace(/'/g, "''");
  return `'${escaped}'!${range}`;
}

function toFiniteNumberOrNull(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toFiniteNumberOrZero(value) {
  return toFiniteNumberOrNull(value) ?? 0;
}

function asText(value) {
  return String(value ?? "").trim();
}

function getColumnLetter(index) {
  let dividend = Number(index) + 1;
  let column = "";

  while (dividend > 0) {
    const modulo = (dividend - 1) % 26;
    column = String.fromCharCode(65 + modulo) + column;
    dividend = Math.floor((dividend - modulo) / 26);
  }

  return column || "A";
}

function findHeaderIndex(normalizedHeaders, aliases) {
  for (const alias of aliases) {
    const index = normalizedHeaders.indexOf(alias);
    if (index !== -1) return index;
  }
  return -1;
}

function buildHeaderMap(normalizedHeaders) {
  return Object.fromEntries(
    Object.entries(HEADER_ALIASES).map(([field, aliases]) => [
      field,
      findHeaderIndex(normalizedHeaders, aliases),
    ]),
  );
}

function hasColumn(index) {
  return Number.isInteger(index) && index >= 0;
}

function getCell(rowValues, index) {
  if (!hasColumn(index)) return "";
  return rowValues[index];
}

function uniqueStrings(values) {
  return Array.from(
    new Set(
      (values || [])
        .map((value) => asText(value))
        .filter(Boolean),
    ),
  );
}

function nameIncludesAny(name, keywords) {
  const normalizedName = asText(name).toLowerCase();
  return keywords.some((keyword) => normalizedName.includes(keyword));
}

function deriveFoodCategory(food) {
  if (food.proteinPerGram >= 0.08) return "Protein";
  if (food.caloriesPerGram > 0 && food.caloriesPerGram <= 0.5) {
    return "Low Calorie";
  }
  return "General";
}

function deriveFoodLabels(food) {
  const labels = [];

  if (food.proteinPerGram >= 0.18) {
    labels.push("high protein");
  } else if (food.proteinPerGram >= 0.08) {
    labels.push("protein source");
  }

  if (food.pricePer10gProtein !== null && food.pricePer10gProtein <= 10) {
    labels.push("budget protein");
  }

  if (
    food.caloriesPer10gProtein !== null &&
    food.caloriesPer10gProtein <= 70
  ) {
    labels.push("lean protein");
  }

  if (food.fatPer10gProtein !== null && food.fatPer10gProtein <= 2) {
    labels.push("low fat");
  }

  if (food.carbsPer10gProtein !== null && food.carbsPer10gProtein <= 10) {
    labels.push("low carb");
  }

  if (food.caloriesPerGram > 0 && food.caloriesPerGram <= 0.5) {
    labels.push("low calorie");
  }

  if (nameIncludesAny(food.name, ["shrimp", "prawns", "chicken", "fish", "egg"])) {
    labels.push("animal protein");
  }

  if (
    nameIncludesAny(food.name, [
      "tofu",
      "soya",
      "soy",
      "paneer",
      "curd",
      "chickpea",
      "besan",
    ])
  ) {
    labels.push("veg option");
  }

  return uniqueStrings(labels);
}

function normalizeRowEntries(rows) {
  return (rows || [])
    .map((entry, index) => {
      if (Array.isArray(entry)) {
        return { rowNumber: index + 2, values: entry };
      }

      return {
        rowNumber: entry?.rowNumber ?? entry?.row ?? index + 2,
        values: Array.isArray(entry?.values) ? entry.values : [],
      };
    })
    .filter(({ values }) =>
      values.some((cell) => String(cell || "").trim().length > 0),
    );
}

function mapPriceRecord(rowEntry, normalizedHeaders, headerMap) {
  const { rowNumber, values } = rowEntry;

  const proteinPerGram = toFiniteNumberOrZero(
    getCell(values, headerMap.proteinPerGram),
  );
  const caloriesPerGram = toFiniteNumberOrZero(
    getCell(values, headerMap.caloriesPerGram),
  );
  const fatPerGram = toFiniteNumberOrZero(getCell(values, headerMap.fatPerGram));
  const carbsPerGram = toFiniteNumberOrZero(
    getCell(values, headerMap.carbsPerGram),
  );

  const draftFood = {
    row: rowNumber,
    name: asText(getCell(values, headerMap.name)),
    unit: 1,
    calories: caloriesPerGram,
    protein: proteinPerGram,
    carbs: carbsPerGram,
    fat: fatPerGram,
    price: toFiniteNumberOrNull(getCell(values, headerMap.price)),
    priceUnit: asText(getCell(values, headerMap.priceUnit)),
    rupeesPerGram: toFiniteNumberOrNull(getCell(values, headerMap.rupeesPerGram)),
    pricePer10gProtein: toFiniteNumberOrNull(
      getCell(values, headerMap.pricePer10gProtein),
    ),
    caloriesPer10gProtein: toFiniteNumberOrNull(
      getCell(values, headerMap.caloriesPer10gProtein),
    ),
    weightKgPer10gProtein: toFiniteNumberOrNull(
      getCell(values, headerMap.weightKgPer10gProtein),
    ),
    fatPer10gProtein: toFiniteNumberOrNull(
      getCell(values, headerMap.fatPer10gProtein),
    ),
    carbsPer10gProtein: toFiniteNumberOrNull(
      getCell(values, headerMap.carbsPer10gProtein),
    ),
    proteinPerGram,
    caloriesPerGram,
    fatPerGram,
    carbsPerGram,
  };

  const category = deriveFoodCategory(draftFood);
  const labels = deriveFoodLabels(draftFood);
  const fields = {};
  values.forEach((cell, index) => {
    fields[normalizedHeaders[index] || `col${index + 1}`] = cell;
  });

  return {
    ...draftFood,
    category,
    labels,
    labelText: labels.join(", "),
    notes: "",
    searchText: [
      draftFood.name,
      category,
      draftFood.priceUnit,
      ...labels,
    ]
      .filter(Boolean)
      .join(" "),
    fields,
  };
}

function buildPriceDatabaseState(input = {}) {
  const headers = input.headers || [];
  const normalizedHeaders = headers.map((header, index) =>
    normalizeHeader(header, index),
  );
  const headerMap = buildHeaderMap(normalizedHeaders);
  const rowEntries = normalizeRowEntries(input.rows);
  const foods = rowEntries
    .map((entry) => mapPriceRecord(entry, normalizedHeaders, headerMap))
    .filter((food) => food.name);

  const availableLabels = Array.from(
    new Set(foods.flatMap((food) => food.labels)),
  ).sort((a, b) => a.localeCompare(b));
  const availableCategories = Array.from(
    new Set(foods.map((food) => food.category).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));
  const editableFields = hasColumn(headerMap.price) ? ["price"] : [];

  return {
    sheetName: input.sheetName || PRICE_SHEET_CANDIDATES[0],
    headers,
    normalizedHeaders,
    headerMap,
    foods,
    editableFields,
    availableLabels,
    availableCategories,
  };
}

async function readPriceDatabaseState() {
  const { sheets, SPREADSHEET_ID } = require("../google");
  let lastError = null;

  for (const sheetName of PRICE_SHEET_CANDIDATES) {
    try {
      const [headerRes, dataRes] = await Promise.all([
        sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: toRange(sheetName, "A1:ZZ1"),
        }),
        sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: toRange(sheetName, "A2:ZZ"),
          valueRenderOption: "UNFORMATTED_VALUE",
        }),
      ]);

      return buildPriceDatabaseState({
        sheetName,
        headers: headerRes.data.values?.[0] || [],
        rows: dataRes.data.values || [],
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Unable to read PRICE_DATABASE sheet");
}

function getEditablePriceUpdates(state, payload) {
  const updates = [];
  const index = state.headerMap.price;

  if (payload.price === undefined) {
    return { updates };
  }

  if (!hasColumn(index)) {
    return { error: "price is not editable in PRICE_DATABASE" };
  }

  if (payload.price === null || payload.price === "") {
    updates.push({
      field: "price",
      columnLetter: getColumnLetter(index),
      value: "",
    });
    return { updates };
  }

  const numericPrice = toFiniteNumberOrNull(payload.price);
  if (numericPrice === null) {
    return { error: "price must be a number" };
  }

  updates.push({
    field: "price",
    columnLetter: getColumnLetter(index),
    value: numericPrice,
  });

  return { updates };
}

function deriveProteinSourceReferenceData(state) {
  const names = state.foods
    .filter((food) => food.proteinPerGram >= 0.08)
    .sort((a, b) => {
      const aValue = Number.isFinite(a.pricePer10gProtein)
        ? a.pricePer10gProtein
        : Number.POSITIVE_INFINITY;
      const bValue = Number.isFinite(b.pricePer10gProtein)
        ? b.pricePer10gProtein
        : Number.POSITIVE_INFINITY;
      if (aValue !== bValue) return aValue - bValue;
      return a.name.localeCompare(b.name);
    })
    .map((food) => food.name);

  return {
    headers: ["name"],
    items: names.map((name) => ({ name })),
    names,
  };
}

function deriveLowCalorieReferenceData(state) {
  const names = state.foods
    .filter((food) => food.caloriesPerGram > 0 && food.caloriesPerGram <= 0.5)
    .sort((a, b) => {
      if (a.caloriesPerGram !== b.caloriesPerGram) {
        return a.caloriesPerGram - b.caloriesPerGram;
      }
      return a.name.localeCompare(b.name);
    })
    .map((food) => food.name);

  return {
    headers: ["name"],
    items: names.map((name) => ({ name })),
    names,
  };
}

module.exports = {
  PRICE_SHEET_CANDIDATES,
  buildPriceDatabaseState,
  readPriceDatabaseState,
  getEditablePriceUpdates,
  deriveProteinSourceReferenceData,
  deriveLowCalorieReferenceData,
};
