const test = require("node:test");
const assert = require("node:assert/strict");
const {
  parseSheetRow,
  toFiniteNumber,
  isValidDateInput,
} = require("../utils/validation");

test("parseSheetRow accepts valid rows only", () => {
  assert.equal(parseSheetRow("2"), 2);
  assert.equal(parseSheetRow(99), 99);
  assert.equal(parseSheetRow("1"), null);
  assert.equal(parseSheetRow("2.5"), null);
  assert.equal(parseSheetRow("abc"), null);
});

test("toFiniteNumber parses finite numeric values", () => {
  assert.equal(toFiniteNumber("10"), 10);
  assert.equal(toFiniteNumber(12.5), 12.5);
  assert.equal(toFiniteNumber(""), null);
  assert.equal(toFiniteNumber("NaN"), null);
});

test("isValidDateInput validates date strings", () => {
  assert.equal(isValidDateInput("2026-03-03"), true);
  assert.equal(isValidDateInput("invalid-date"), false);
  assert.equal(isValidDateInput(""), false);
});
