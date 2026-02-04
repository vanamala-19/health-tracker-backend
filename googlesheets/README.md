# Google Sheets Database Reference

## Active Database

**Spreadsheet ID:** `1zrwp89llivNkI7lfV3ewRvL_TNhmQBAustMwUDeFMrk`

**Access URL (Shareable Link):**

```
https://docs.google.com/spreadsheets/d/1zrwp89llivNkI7lfV3ewRvL_TNhmQBAustMwUDeFMrk/edit?usp=sharing
```

**Direct Link:** [Open Google Sheet](https://docs.google.com/spreadsheets/d/1zrwp89llivNkI7lfV3ewRvL_TNhmQBAustMwUDeFMrk/edit?usp=sharing)

---

## Sheet Structure

### 📋 Sheet 1: Diet Log

- **Columns:** Date | Meal Type | Context | Protein Source | Veggies | Carbs Food | Fats Food | Portion Notes | Calories | Protein | Carbs | Fats
- **API Endpoint:** `/diet-log`
- **Data Range:** `Diet Log!A2:L1000`

### 📦 Sheet 2: Inventory

- **Columns:** Item | Category | Quantity | Unit | Min Qty | Current Qty | Purchase Date | Expiry Date | Status | Notes
- **API Endpoint:** `/inventory`
- **Data Range:** `Inventory!A2:J1000`

### 🍳 Sheet 3: Recipes

- **Columns:** Recipe Name | Category | Servings | Calories | Protein | Carbs | Fats | Instructions
- **API Endpoint:** `/recipes`
- **Data Range:** `Recipes!A2:H1000`

### ⏰ Sheet 4: Shift Log

- **Columns:** Date | Shift Type | Hours | Notes | Status
- **API Endpoint:** `/shift-log`
- **Data Range:** `Shift Log!A2:E1000`

### 📊 Sheet 5: Summary/Dashboard

- **Purpose:** Aggregated metrics and calculations
- **API Endpoint:** `/summary`
- **Data Range:** `Summary!A1:D100`

---

## Backend Configuration

**File:** `health-tracker-backend/google.js`

```javascript
const SPREADSHEET_ID = "1zrwp89llivNkI7lfV3ewRvL_TNhmQBAustMwUDeFMrk";
```

**Authentication:** Uses `credentials.json` (Google Service Account)

---

## How to Update Database

1. Open the [Google Sheet](https://docs.google.com/spreadsheets/d/1zrwp89llivNkI7lfV3ewRvL_TNhmQBAustMwUDeFMrk/edit)
2. Add/Edit data in the corresponding sheet
3. Backend automatically reads updated data on next API call
4. Frontend displays updated information

---

## Important Notes

⚠️ **Do NOT:**

- Delete columns or change column order (API expects specific indices)
- Change sheet names (backend routes reference these names)
- Delete header row

✅ **Do:**

- Add new data rows
- Update existing data
- Keep column structure consistent
- Use proper data formats (dates as YYYY-MM-DD)

---

## Service Account Email

Share the Google Sheet with the service account email from `credentials.json`:

- Check `credentials.json` file for `"client_email"` value
- Grant **Editor** permission

---

## Related Files

- `health-tracker-backend/google.js` - Google Sheets API configuration
- `health-tracker-backend/services/sheets.js` - Sheets service helper
- `health-tracker-backend/routes/*` - API routes that fetch from sheets
