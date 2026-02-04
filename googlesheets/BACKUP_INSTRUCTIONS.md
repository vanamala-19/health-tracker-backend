# Google Sheet Backup & Recovery Instructions

## Manual Backup

### How to Backup Your Data

1. **Download as CSV** (Recommended for quick backup):
   - Open [Google Sheet](https://docs.google.com/spreadsheets/d/1zrwp89llivNkI7lfV3ewRvL_TNhmQBAustMwUDeFMrk/edit?usp=sharing)
   - Go to **File → Download → CSV** (for each sheet)
   - Save to backup folder with timestamp: `diet-log-backup-2024-02-04.csv`

2. **Download as Excel** (For all sheets at once):
   - **File → Download → Microsoft Excel (.xlsx)**
   - Contains all sheets in one file

3. **Version History** (Built-in Google Drive):
   - Right-click sheet in Google Drive
   - **Version History → See all versions**
   - Can restore any previous version

---

## Automated Backup (Optional Setup)

### Using Google Sheets API

```javascript
// Example: Periodic backup to local JSON files
async function backupSheet() {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "Diet Log!A1:L1000",
  });

  const timestamp = new Date().toISOString();
  const backupFile = `backup-diet-log-${timestamp}.json`;
  fs.writeFileSync(backupFile, JSON.stringify(response.data.values));
}

// Run daily via cron job or scheduler
```

---

## Recovery Instructions

### If Data is Accidentally Deleted

1. **Use Google Drive Version History**:
   - Open the [Google Sheet](https://docs.google.com/spreadsheets/d/1zrwp89llivNkI7lfV3ewRvL_TNhmQBAustMwUDeFMrk/edit?usp=sharing)
   - Click **File → Version history → See all versions**
   - Select the version before deletion
   - Click **Restore this version**

2. **Restore from CSV Backup**:
   - Download the backup CSV
   - Delete the corrupted sheet
   - Create new sheet with same name
   - Import CSV data: **File → Import → Upload**

3. **Contact Google Drive Support**:
   - If nothing works, Google keeps deleted files for 30 days
   - Go to Google Drive trash and restore from there

---

## Prevention Best Practices

✅ **Do:**

- Keep backup CSVs in `/googlesheets/backups/` folder
- Share sheet with team members (not just service account)
- Review edit history regularly
- Test API changes in development first

❌ **Don't:**

- Give unrestricted edit access
- Delete columns without backup
- Clear data without version history check
- Share credentials.json publicly

---

## Sheet Access Levels

- **Owner:** Can delete, share, change permissions
- **Editor:** Can add/edit/delete data rows
- **Viewer:** Can only view data (read-only)

### Recommended Setup:

- Service Account: **Editor** (for API)
- Team Members: **Editor** (for manual updates)
- Public Link: **Viewer** (if needed for sharing)

---

## Regular Maintenance

**Weekly:**

- Check for errors in data entries
- Verify API is reading correct data

**Monthly:**

- Download backup CSV
- Review version history
- Ensure formulas are working (if any)

**Quarterly:**

- Archive old data (move to Archive sheet)
- Clean up duplicates or invalid entries
- Update this documentation if schema changes
