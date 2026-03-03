function parseSheetRow(value) {
  const row = Number(value);
  if (!Number.isInteger(row) || row < 2) {
    return null;
  }
  return row;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function toFiniteNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function isValidDateInput(value) {
  if (!isNonEmptyString(value)) {
    return false;
  }
  const date = new Date(value);
  return Number.isFinite(date.getTime());
}

function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

module.exports = {
  parseSheetRow,
  isNonEmptyString,
  toFiniteNumber,
  isValidDateInput,
  badRequest,
};
