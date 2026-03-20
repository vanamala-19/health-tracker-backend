const express = require("express");
const router = express.Router();
const { sheets, SPREADSHEET_ID } = require("../google");
const { cacheGet } = require("../middleware/cache");
const {
  readPriceDatabaseState,
  deriveProteinSourceReferenceData,
  deriveLowCalorieReferenceData,
} = require("../services/priceDatabaseSheet");

function normalizeHeader(value, fallbackIndex) {
  const text = String(value || "").trim();
  if (!text) return `col${fallbackIndex + 1}`;
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || `col${fallbackIndex + 1}`;
}

function toRange(sheetName, range) {
  const escaped = String(sheetName).replace(/'/g, "''");
  return `'${escaped}'!${range}`;
}

async function readSheetRecords(sheetName) {
  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: toRange(sheetName, "A1:Z1"),
  });
  const dataRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: toRange(sheetName, "A2:Z"),
  });

  const headers = headerRes.data.values?.[0] || [];
  const rows = dataRes.data.values || [];

  const normalizedHeaders = headers.map((h, i) => normalizeHeader(h, i));

  const items = rows
    .filter((row) => row.some((cell) => String(cell || "").trim()))
    .map((row) => {
      const item = {};
      row.forEach((cell, i) => {
        item[normalizedHeaders[i] || `col${i + 1}`] = cell;
      });
      return item;
    });

  const names = Array.from(
    new Set(
      items
        .map((item) => String(item[normalizedHeaders[0]] || "").trim())
        .filter(Boolean),
    ),
  );

  return { headers: normalizedHeaders, items, names };
}

async function readSheetRecordsFromCandidates(candidates) {
  let lastError = null;
  for (const sheetName of candidates) {
    try {
      return await readSheetRecords(sheetName);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("Sheet lookup failed");
}

router.get("/protein-sources", cacheGet(60000), async (req, res, next) => {
  try {
    let data = deriveProteinSourceReferenceData(await readPriceDatabaseState());
    if (!data.names.length) {
      data = await readSheetRecordsFromCandidates([
        "Protein Source",
        "Protein Source ",
        "Protein_Source",
      ]);
    }
    res.json(data);
  } catch (err) {
    err.publicMessage = "Failed to fetch protein source references";
    next(err);
  }
});

router.get("/calorie-free", cacheGet(60000), async (req, res, next) => {
  try {
    let data = deriveLowCalorieReferenceData(await readPriceDatabaseState());
    if (!data.names.length) {
      data = await readSheetRecordsFromCandidates([
        "calories free",
        "Calories Free",
        "calorie free",
      ]);
    }
    res.json(data);
  } catch (err) {
    err.publicMessage = "Failed to fetch low-calorie references";
    next(err);
  }
});

module.exports = router;
