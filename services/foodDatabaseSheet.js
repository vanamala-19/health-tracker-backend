const FOOD_SHEET_CANDIDATES = [
  "FOOD_DATABASE",
  "Food_Database",
  "Food Database",
];

const HEADER_ALIASES = {
  name: ["food_item", "food_name", "food", "name", "item"],
  unit: ["unit_g", "unit", "unit_gms", "unit_grams"],
  calories: ["calories", "kcal"],
  protein: ["protein"],
  carbs: ["carbs", "carbohydrates"],
  fat: ["fat", "fats"],
  proteinPerGram: ["protein_per_gram", "protein_per_g"],
  caloriesPerGram: ["calories_per_gram", "calories_per_g", "kcal_per_gram"],
  fatPerGram: ["fat_per_gram", "fat_per_g", "fats_per_gram"],
  carbsPerGram: ["carbs_per_gram", "carbs_per_g", "carbohydrates_per_gram"],
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
  if (value === undefined || value === null || value === "") return null;
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

function hasColumn(index) {
  return Number.isInteger(index) && index >= 0;
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

function getCell(rowValues, index) {
  if (!hasColumn(index)) return "";
  return rowValues[index];
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
  const unit = toFiniteNumberOrNull(getCell(values, headerMap.unit)) ?? 100;
  const calories = toFiniteNumberOrZero(getCell(values, headerMap.calories));
  const protein = toFiniteNumberOrZero(getCell(values, headerMap.protein));
  const carbs = toFiniteNumberOrZero(getCell(values, headerMap.carbs));
  const fat = toFiniteNumberOrZero(getCell(values, headerMap.fat));
  const proteinPerGram =
    toFiniteNumberOrNull(getCell(values, headerMap.proteinPerGram)) ??
    (unit ? protein / unit : 0);
  const caloriesPerGram =
    toFiniteNumberOrNull(getCell(values, headerMap.caloriesPerGram)) ??
    (unit ? calories / unit : 0);
  const fatPerGram =
    toFiniteNumberOrNull(getCell(values, headerMap.fatPerGram)) ??
    (unit ? fat / unit : 0);
  const carbsPerGram =
    toFiniteNumberOrNull(getCell(values, headerMap.carbsPerGram)) ??
    (unit ? carbs / unit : 0);

  const fields = {};
  values.forEach((cell, index) => {
    fields[normalizedHeaders[index] || `col${index + 1}`] = cell;
  });

  return {
    row: rowNumber,
    name: asText(getCell(values, headerMap.name)),
    unit,
    calories,
    protein,
    carbs,
    fat,
    proteinPerGram,
    caloriesPerGram,
    fatPerGram,
    carbsPerGram,
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

  const editableFields = ["name", "unit", "calories", "protein", "carbs", "fat"].filter(
    (field) => hasColumn(headerMap[field]),
  );

  return {
    sheetName: input.sheetName || FOOD_SHEET_CANDIDATES[0],
    headers,
    normalizedHeaders,
    headerMap,
    foods,
    editableFields,
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

function getEditableFoodUpdates(state, payload) {
  const updates = [];

  for (const field of ["name", "unit", "calories", "protein", "carbs", "fat"]) {
    if (!(field in (payload || {}))) continue;

    const index = state.headerMap[field];
    if (!hasColumn(index)) continue;

    if (field === "name") {
      const name = asText(payload.name);
      if (!name) {
        return { error: "name is required" };
      }

      updates.push({
        field,
        columnLetter: getColumnLetter(index),
        value: name,
      });
      continue;
    }

    const value = toFiniteNumberOrNull(payload[field]);
    if (value === null) {
      return { error: `${field} must be a number` };
    }

    updates.push({
      field,
      columnLetter: getColumnLetter(index),
      value,
    });
  }

  return { updates };
}

function buildFoodAppendRow(state, payload) {
  const name = asText(payload?.name);
  const unit = toFiniteNumberOrNull(payload?.unit);
  const calories = toFiniteNumberOrNull(payload?.calories);
  const protein = toFiniteNumberOrNull(payload?.protein);
  const carbs = toFiniteNumberOrNull(payload?.carbs);
  const fat = toFiniteNumberOrNull(payload?.fat);

  if (!name) return { error: "name is required" };
  if (unit === null) return { error: "unit must be a number" };
  if (calories === null) return { error: "calories must be a number" };
  if (protein === null) return { error: "protein must be a number" };
  if (carbs === null) return { error: "carbs must be a number" };
  if (fat === null) return { error: "fat must be a number" };

  const maxIndex = Math.max(
    state.headerMap.name,
    state.headerMap.unit,
    state.headerMap.calories,
    state.headerMap.protein,
    state.headerMap.carbs,
    state.headerMap.fat,
  );
  const values = Array.from({ length: Math.max(maxIndex + 1, 6) }, () => "");

  if (hasColumn(state.headerMap.name)) values[state.headerMap.name] = name;
  if (hasColumn(state.headerMap.unit)) values[state.headerMap.unit] = unit;
  if (hasColumn(state.headerMap.calories)) values[state.headerMap.calories] = calories;
  if (hasColumn(state.headerMap.protein)) values[state.headerMap.protein] = protein;
  if (hasColumn(state.headerMap.carbs)) values[state.headerMap.carbs] = carbs;
  if (hasColumn(state.headerMap.fat)) values[state.headerMap.fat] = fat;

  return { values };
}

module.exports = {
  FOOD_SHEET_CANDIDATES,
  buildFoodDatabaseState,
  readFoodDatabaseState,
  getEditableFoodUpdates,
  buildFoodAppendRow,
};
