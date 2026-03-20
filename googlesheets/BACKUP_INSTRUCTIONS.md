# Google Sheet Backup and Recovery Instructions

## Manual Backup

### How to back up data

1. **Download as CSV (per tab)**
- Open [Google Sheet](https://docs.google.com/spreadsheets/d/1zrwp89llivNkI7lfV3ewRvL_TNhmQBAustMwUDeFMrk/edit?usp=sharing)
- Go to `File -> Download -> CSV` (run once for each important tab)
- Save with timestamp, e.g. `diet-log-backup-2026-03-03.csv`

2. **Download as Excel (all tabs at once)**
- `File -> Download -> Microsoft Excel (.xlsx)`
- Stores all tabs in one file

3. **Use version history**
- `File -> Version history -> See version history`
- Restore a known-good version if needed

---

## Optional Automated Backup

```javascript
// Example: backup Diet_Log to JSON
async function backupDietLog(sheets, SPREADSHEET_ID, fs) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "Diet_Log!A1:R1000",
  });

  const timestamp = new Date().toISOString();
  const backupFile = `backup-diet-log-${timestamp}.json`;
  fs.writeFileSync(backupFile, JSON.stringify(response.data.values || []));
}
```

---

## Recovery Steps

1. **Restore from version history**
- Open the sheet
- `File -> Version history -> See version history`
- Pick a version before issue occurred
- Click **Restore this version**

2. **Restore from CSV/XLSX backup**
- Create a new tab with the original tab name
- Import backup file via `File -> Import -> Upload`
- Verify headers and column order before using app

---

## Critical Tab Names Used by Backend

- `Diet_Log`
- `Inventory`
- `Recipes`
- `Shift_Log`
- `FOOD_DATABASE`
- `Body_Weight`
- `Workout_Daily_Summary`

If any of these names change, update backend route ranges first.

---

## Best Practices

- Keep backup files in `health-tracker-backend/googlesheets/backups/`.
- Keep sheet sharing as `Restricted`.
- Share with service account email from `credentials.json`.
- Before bulk edits, export an XLSX snapshot.
