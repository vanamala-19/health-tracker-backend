# Google Sheets Database Reference

## Active Database

**Spreadsheet ID:** `1zrwp89llivNkI7lfV3ewRvL_TNhmQBAustMwUDeFMrk`

**Direct Link:** [Open Google Sheet](https://docs.google.com/spreadsheets/d/1zrwp89llivNkI7lfV3ewRvL_TNhmQBAustMwUDeFMrk/edit?usp=sharing)

---

## Backend-Used Sheet Structure

### Sheet: `Diet_Log`
- **Primary endpoint:** `/diet-log`
- **Ranges used:** `Diet_Log!A2:R`, `Diet_Log!A:R`
- **Notes:** Diet entries + macro columns used by dashboard/summary.

### Sheet: `Inventory`
- **Primary endpoint:** `/inventory`
- **Ranges used:** `Inventory!A2:J`, `Inventory!A:J`

### Sheet: `Recipes`
- **Primary endpoint:** `/recipes`
- **Ranges used:** `Recipes!A2:G`

### Sheet: `Shift_Log`
- **Primary endpoint:** `/shift-log`
- **Ranges used:** `Shift_Log!A2:M`, `Shift_Log!A:M`

### Sheet: `Food_Database`
- **Primary endpoint:** `/food-database`
- **Ranges used:** `Food_Database!A2:F`, `Food_Database!A:F`

### Sheet: `Protein Source`
- **Reference endpoint:** `/reference/protein-sources`
- **Ranges used:** `Protein Source!A1:Z1`, `Protein Source!A2:Z`

### Sheet: `calories free`
- **Reference endpoint:** `/reference/calorie-free`
- **Ranges used:** `calories free!A1:Z1`, `calories free!A2:Z`

### Sheet: `Body_Weight`
- **Summary endpoint:** `/summary/weight`
- **Range used:** `Body_Weight!A2:B`

### Sheet: `Workout_Daily_Summary`
- **Summary endpoint:** `/summary/workout-summary`
- **Range used:** `Workout_Daily_Summary!A2:F`
- **Write path:** `POST /workouts` with `{ "date": "YYYY-MM-DD", "status": "Done|Skipped" }`

---

## Backend Configuration

- **Sheets client:** `health-tracker-backend/services/sheets.js`
- **Route mounts:** `health-tracker-backend/index.js`
- **Authentication:** service account via `credentials.json`

---

## Important Notes

- Do not rename tabs listed above unless backend ranges are updated in code.
- Do not reorder/delete expected columns for active routes.
- Keep header rows intact.
- Use ISO date format (`YYYY-MM-DD`) where applicable.
