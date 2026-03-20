const FOOD_SHEET_CANDIDATES = [
  "FOOD_DATABASE",
  "Food_Database",
  "Food Database",
];

const HEADER_ALIASES = {
  name: ["food_item", "food_name", "food", "name", "item"],
  unit: [
    "unit_g",
    "unit",
    "unit_grams",
    "unit_gm",
    "serving_size_g",
    "serving_size",
    "grams",
  ],
  calories: ["calories", "kcal", "energy", "energy_kcal"],
  protein: ["protein", "protein_g"],
  carbs: [
    "carbs",
    "carb",
    "carbohydrates",
    "carbohydrate",
    "carbs_g",
    "carbohydrates_g",
  ],
  fat: ["fat", "fats", "fat_g", "fats_g"],
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
  price: ["price", "cost", "mrp", "rate", "price_inr"],
  labels: ["labels", "label", "tags", "tag", "food_labels", "options"],
  category: ["category", "categories", "group", "type"],
  notes: ["notes", "note", "remarks", "remark", "comments", "comment"],
};

const PROTEIN_SOURCE_KEYWORDS = [
  "protein",
  "protein source",
  "high protein",
  "lean protein",
];
const LOW_CALORIE_KEYWORDS = [
  "low calorie",
  "low calories",
  "low cal",
  "low-calorie",
  "low-cal",
  "calorie free",
  "veggie",
  "vegetable",
  "fruit",
];

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

function normalizeKeywordText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function splitListValue(value) {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((item) => asText(item))
          .filter(Boolean),
      ),
    );
  }

  return Array.from(
    new Set(
      asText(value)
        .split(/[,\n;|]+/g)
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  );
}

function joinListValue(value) {
  return splitListValue(value).join(", ");
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

function listIncludesKeyword(values, keywords) {
  const normalizedValues = values
    .map((value) => normalizeKeywordText(value))
    .filter(Boolean);

  return keywords.some((keyword) => {
    const normalizedKeyword = normalizeKeywordText(keyword);
    return normalizedValues.some((value) => value.includes(normalizedKeyword));
  });
}

function deriveReferencePayload(foods, keywords) {
  const names = Array.from(
    new Set(
      foods
        .filter((food) =>
          listIncludesKeyword(
            [
              ...(food.labels || []),
              food.category,
              food.notes,
            ].filter(Boolean),
            keywords,
          ),
        )
        .map((food) => food.name)
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));

  return {
    headers: ["name"],
    items: names.map((name) => ({ name })),
    names,
  };
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

function mapFoodRecord(rowEntry, normalizedHeaders, headerMap) {
  const { rowNumber, values } = rowEntry;

  const name = asText(getCell(values, headerMap.name));
  const unit = toFiniteNumberOrNull(getCell(values, headerMap.unit)) ?? 100;
  const calories = toFiniteNumberOrZero(getCell(values, headerMap.calories));
  const protein = toFiniteNumberOrZero(getCell(values, headerMap.protein));
  const carbs = toFiniteNumberOrZero(getCell(values, headerMap.carbs));
  const fat = toFiniteNumberOrZero(getCell(values, headerMap.fat));
  const price = toFiniteNumberOrNull(getCell(values, headerMap.price));
  const labels = splitListValue(getCell(values, headerMap.labels));
  const category = asText(getCell(values, headerMap.category));
  const notes = asText(getCell(values, headerMap.notes));

  const unitBase = unit || 100;
  const proteinPerGram =
    toFiniteNumberOrNull(getCell(values, headerMap.proteinPerGram)) ??
    (unitBase ? protein / unitBase : 0);
  const caloriesPerGram =
    toFiniteNumberOrNull(getCell(values, headerMap.caloriesPerGram)) ??
    (unitBase ? calories / unitBase : 0);
  const fatPerGram =
    toFiniteNumberOrNull(getCell(values, headerMap.fatPerGram)) ??
    (unitBase ? fat / unitBase : 0);
  const carbsPerGram =
    toFiniteNumberOrNull(getCell(values, headerMap.carbsPerGram)) ??
    (unitBase ? carbs / unitBase : 0);

  const fields = {};
  values.forEach((cell, index) => {
    fields[normalizedHeaders[index] || `col${index + 1}`] = cell;
  });

  return {
    row: rowNumber,
    name,
    unit,
    calories,
    protein,
    carbs,
    fat,
    proteinPerGram,
    caloriesPerGram,
    fatPerGram,
    carbsPerGram,
    price,
    labels,
    labelText: joinListValue(labels),
    category,
    notes,
    searchText: [name, category, notes, ...labels].filter(Boolean).join(" "),
    fields,
  };
}

function buildFoodDatabaseState(input = {}) {
  const headers = input.headers || [];
  const normalizedHeaders = headers.map((header, index) =>
    normalizeHeader(header, index),
  );
  const headerMap = buildHeaderMap(normalizedHeaders);
  const rowEntries = normalizeRowEntries(input.rows);
  const foods = rowEntries
    .map((entry) => mapFoodRecord(entry, normalizedHeaders, headerMap))
    .filter((food) => food.name);

  const availableLabels = Array.from(
    new Set(foods.flatMap((food) => food.labels)),
  ).sort((a, b) => a.localeCompare(b));
  const availableCategories = Array.from(
    new Set(foods.map((food) => food.category).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));
  const editableFields = ["price", "labels", "category", "notes"].filter(
    (field) => hasColumn(headerMap[field]),
  );

  return {
    sheetName: input.sheetName || FOOD_SHEET_CANDIDATES[0],
    headers,
    normalizedHeaders,
    headerMap,
    foods,
    editableFields,
    availableLabels,
    availableCategories,
  };
}

async function readFoodDatabaseState() {
  const { sheets, SPREADSHEET_ID } = require("../google");
  let lastError = null;

  for (const sheetName of FOOD_SHEET_CANDIDATES) {
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

      return buildFoodDatabaseState({
        sheetName,
        headers: headerRes.data.values?.[0] || [],
        rows: dataRes.data.values || [],
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Unable to read FOOD_DATABASE sheet");
}

function validateFoodCreatePayload(payload, state) {
  if (!payload || typeof payload !== "object") {
    return "Request body is required";
  }
  if (!asText(payload.name)) {
    return "name is required";
  }
  if (hasColumn(state.headerMap.unit) && toFiniteNumberOrNull(payload.unit) === null) {
    return "unit must be a number";
  }

  for (const field of ["calories", "protein", "carbs", "fat", "price"]) {
    if (payload[field] === undefined || payload[field] === null || payload[field] === "") {
      continue;
    }
    if (toFiniteNumberOrNull(payload[field]) === null) {
      return `${field} must be a number`;
    }
  }

  return null;
}

function createFoodAppendRow(state, payload) {
  const values = new Array(Math.max(state.headers.length, 1)).fill("");
  const setValue = (field, value) => {
    const index = state.headerMap[field];
    if (!hasColumn(index) || value === undefined) return;
    values[index] = value;
  };

  setValue("name", asText(payload.name));
  if (payload.unit !== undefined) setValue("unit", Number(payload.unit));
  if (payload.calories !== undefined && payload.calories !== "") {
    setValue("calories", Number(payload.calories));
  }
  if (payload.protein !== undefined && payload.protein !== "") {
    setValue("protein", Number(payload.protein));
  }
  if (payload.carbs !== undefined && payload.carbs !== "") {
    setValue("carbs", Number(payload.carbs));
  }
  if (payload.fat !== undefined && payload.fat !== "") {
    setValue("fat", Number(payload.fat));
  }
  if (payload.price !== undefined && payload.price !== "") {
    setValue("price", Number(payload.price));
  }
  if (payload.labels !== undefined) {
    setValue("labels", joinListValue(payload.labels));
  }
  if (payload.category !== undefined) {
    setValue("category", asText(payload.category));
  }
  if (payload.notes !== undefined) {
    setValue("notes", asText(payload.notes));
  }

  return values;
}

function getEditableFoodUpdates(state, payload) {
  const updates = [];

  const pushUpdate = (field, value) => {
    const index = state.headerMap[field];
    if (!hasColumn(index)) return;
    updates.push({
      field,
      columnLetter: getColumnLetter(index),
      value,
    });
  };

  if (payload.price !== undefined) {
    if (payload.price === null || payload.price === "") {
      pushUpdate("price", "");
    } else {
      const numericPrice = toFiniteNumberOrNull(payload.price);
      if (numericPrice === null) {
        return { error: "price must be a number" };
      }
      pushUpdate("price", numericPrice);
    }
  }

  if (payload.labels !== undefined) {
    pushUpdate("labels", joinListValue(payload.labels));
  }

  if (payload.category !== undefined) {
    pushUpdate("category", asText(payload.category));
  }

  if (payload.notes !== undefined) {
    pushUpdate("notes", asText(payload.notes));
  }

  return { updates };
}

function getFoodRowClearRange(state, rowNumber) {
  const lastColumnIndex = Math.max(state.headers.length - 1, 25);
  return toRange(
    state.sheetName,
    `A${rowNumber}:${getColumnLetter(lastColumnIndex)}${rowNumber}`,
  );
}

function deriveProteinSourceReferenceData(state) {
  return deriveReferencePayload(state.foods, PROTEIN_SOURCE_KEYWORDS);
}

function deriveLowCalorieReferenceData(state) {
  return deriveReferencePayload(state.foods, LOW_CALORIE_KEYWORDS);
}

module.exports = {
  FOOD_SHEET_CANDIDATES,
  buildFoodDatabaseState,
  readFoodDatabaseState,
  validateFoodCreatePayload,
  createFoodAppendRow,
  getEditableFoodUpdates,
  getFoodRowClearRange,
  deriveProteinSourceReferenceData,
  deriveLowCalorieReferenceData,
};
