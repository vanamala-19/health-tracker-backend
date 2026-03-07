const { google } = require("googleapis");

const auth = new google.auth.GoogleAuth({
  keyFile: "credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

const SPREADSHEET_ID = "1zrwp89llivNkI7lfV3ewRvL_TNhmQBAustMwUDeFMrk";

let initPromise = null;
let lastReadyOkAt = 0;
let lastReadyError = null;

async function warmSheetsConnection() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      await auth.getClient();
      await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "Diet_Log!A1:A1",
        majorDimension: "ROWS",
      });
      lastReadyOkAt = Date.now();
      lastReadyError = null;
      return true;
    } catch (error) {
      lastReadyError = error;
      throw error;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

function getSheetsHealth() {
  return {
    ready: Boolean(lastReadyOkAt),
    lastReadyOkAt,
    lastReadyError,
  };
}

module.exports = {
  sheets,
  SPREADSHEET_ID,
  warmSheetsConnection,
  getSheetsHealth,
};
