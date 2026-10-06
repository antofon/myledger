// Fetch.gs: fetch windows, the Plaid /transactions/get call, scheduled + test entry points

// ─────────────────────────────────────────
// CURRENT MONTH DATE RANGE
// Always restricts to current month only
// ─────────────────────────────────────────
/**
 * First and last day of the current month as yyyy-MM-dd (Los Angeles time).
 * @return {{startDate: string, endDate: string}}
 */
function getCurrentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  return {
    startDate: Utilities.formatDate(firstDay, 'America/Los_Angeles', 'yyyy-MM-dd'),
    endDate:   Utilities.formatDate(lastDay,  'America/Los_Angeles', 'yyyy-MM-dd')
  };
}

// ─────────────────────────────────────────
// FETCH DATE RANGE — for scheduled runs
// Sunday  → pull Wed through Sat
// Wednesday → pull Sun through Tue
// ─────────────────────────────────────────
/**
 * Fetch window for scheduled runs. Sunday pulls Wed to Sat, any other day
 * pulls the previous Sun to Tue. The start is clamped to the 1st of the month.
 * @return {{startDate: string, endDate: string}}
 */
function getDateRange() {
  const today = new Date();
  const day = today.getDay();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let startDate, endDate;

  if (day === 0) {
    const wed = new Date(today); wed.setDate(today.getDate() - 4);
    const sat = new Date(today); sat.setDate(today.getDate() - 1);
    // Don't go before start of current month
    const effectiveStart = wed < monthStart ? monthStart : wed;
    startDate = Utilities.formatDate(effectiveStart, 'America/Los_Angeles', 'yyyy-MM-dd');
    endDate   = Utilities.formatDate(sat, 'America/Los_Angeles', 'yyyy-MM-dd');
  } else {
    const sun = new Date(today); sun.setDate(today.getDate() - 3);
    const tue = new Date(today); tue.setDate(today.getDate() - 1);
    const effectiveStart = sun < monthStart ? monthStart : sun;
    startDate = Utilities.formatDate(effectiveStart, 'America/Los_Angeles', 'yyyy-MM-dd');
    endDate   = Utilities.formatDate(tue, 'America/Los_Angeles', 'yyyy-MM-dd');
  }

  return { startDate, endDate };
}

// ─────────────────────────────────────────
// CORE FETCH — shared by fetchTransactions + test_fetch
// ─────────────────────────────────────────
/**
 * Calls /transactions/get for each linked Item and appends new, posted
 * transactions to Plaid_Transactions. Skips rows whose transaction_id is
 * already in the sheet, skips pending transactions, and returns early when
 * PLAID_PAUSED is 'true'.
 * Side effects: writes rows, sets dropdown validation, re-sorts the sheet.
 * @param {string} startDate yyyy-MM-dd
 * @param {string} endDate yyyy-MM-dd
 * @param {number} countPerBank max transactions per Item (default 500)
 * @return {number} rows added
 */
function runFetch(startDate, endDate, countPerBank) {
  const props    = PropertiesService.getScriptProperties();

  // ── PAUSE PLAID API, FREE API REQUESTS EXHAUSTED ON 8/26/26, 8:11AM PST ──
  if (props.getProperty('PLAID_PAUSED') === 'true') {
    Logger.log('⏸️ Plaid calls paused. Set PLAID_PAUSED to false to resume.');
    return 0;
  }

  const clientId = props.getProperty('PLAID_CLIENT_ID');
  const secret   = props.getProperty('PLAID_SECRET');
  const env      = props.getProperty('PLAID_ENV');
  const baseUrl  = `https://${env}.plaid.com`;

  const tokenKeys = ['PLAID_TOKEN_BANK1', 'PLAID_TOKEN_BANK2', 'PLAID_TOKEN_BANK3', 'PLAID_TOKEN_BANK4'];
  const ss        = SpreadsheetApp.getActiveSpreadsheet();
  const sheet     = ss.getSheetByName('Plaid_Transactions');

  // Get existing Plaid IDs to avoid duplicates
  const existingIds = new Set();
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const idCol = sheet.getRange(2, 7, lastRow - 1, 1).getValues();
    idCol.forEach(row => { if (row[0]) existingIds.add(row[0]); });
  }

  let newRows = [];

  tokenKeys.forEach(tokenKey => {
    const accessToken = props.getProperty(tokenKey);
    if (!accessToken || accessToken.includes('PASTE_') || accessToken.includes('YOUR_REAL')) {
      Logger.log(`⚠️ Skipping ${tokenKey} — token not set`);
      return;
    }

    try {
      const response = UrlFetchApp.fetch(`${baseUrl}/transactions/get`, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          client_id:    clientId,
          secret:       secret,
          access_token: accessToken,
          start_date:   startDate,
          end_date:     endDate,
          options: { count: countPerBank || 500, offset: 0, include_original_description: true }
        })
      });

      const data = JSON.parse(response.getContentText());

      if (data.error_code) {
        Logger.log(`❌ Plaid error for ${tokenKey}: ${data.error_message}`);
        return;
      }

      const transactions = data.transactions || [];
      Logger.log(`📥 ${tokenKey}: ${transactions.length} transactions`);

      transactions.forEach(tx => {
        if (existingIds.has(tx.transaction_id)) return;
        if (tx.pending) return;

        const txName        = tx.name || '';
        const plaidCategory = tx.category ? tx.category.join(' > ') : '';
        const myCategory    = mapCategory(plaidCategory, tx.merchant_name, txName);
        const amount        = normalizeAmount(tx.amount, myCategory);
        const accountLabel  = tokenKey.replace('PLAID_TOKEN_', '');

        // Column B merchant name priority:
        // 1. original_description (raw bank string e.g. "DOMAINREG.COM* A1B2C3")
        // 2. merchant_name (Plaid's enriched name e.g. "Domainreg", often incomplete)
        // 3. txName (transaction name fallback)
        // Raw string is preferred for more reliable mapCategory matching
        newRows.push([
          tx.date,
          tx.original_description || tx.merchant_name || txName,
          amount,
          myCategory,
          plaidCategory,
          accountLabel,
          tx.transaction_id,
          'Mine',
          '',
          ''
        ]);

        existingIds.add(tx.transaction_id);
      });

    } catch (err) {
      Logger.log(`❌ Error fetching ${tokenKey}: ${err.message}`);
    }
  });

  // Sort all new rows by date descending before writing
  newRows.sort((a, b) => new Date(b[0]) - new Date(a[0]));

  if (newRows.length > 0) {
    const insertRow = sheet.getLastRow() + 1;
    sheet.getRange(insertRow, 1, newRows.length, 10).setValues(newRows);

    // Apply dropdown to Mine_Family column
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['Mine', 'Family', 'Split'], true)
      .build();
    sheet.getRange(insertRow, 8, newRows.length, 1).setDataValidation(rule);

    // Apply dropdown to My_Category column
    const catRule = SpreadsheetApp.newDataValidation()
      .requireValueInList([
        'Groceries', 'Guilt-Free Spending', 'Subscriptions', 'Debt',
        'Health', 'Travel', 'Gifts', 'Miscellaneous Expenses',
        'Household', 'Paycheck', 'Transfer', 'Investments'
      ], true)
      .build();
    sheet.getRange(insertRow, 4, newRows.length, 1).setDataValidation(catRule);

    // Sort entire sheet by date descending (keep header in row 1)
    const totalRows = sheet.getLastRow();
    if (totalRows > 2) {
      sheet.getRange(2, 1, totalRows - 1, 10).sort({ column: 1, ascending: false });
    }

    Logger.log(`✅ Added ${newRows.length} new transactions`);
  } else {
    Logger.log('ℹ️ No new transactions to add');
  }

  return newRows.length;
}

// ─────────────────────────────────────────
// MAIN FETCH FUNCTION — runs on Wed + Sun
// ─────────────────────────────────────────
/**
 * Trigger entry point (time-driven, Wednesday and Sunday 8 AM). Fetches the
 * scheduled window, rebuilds Weekly_View, the budget sheet and the Dashboard,
 * emails the report on Sundays, then runs the month-end check.
 */
function fetchTransactions() {
  const { startDate, endDate } = getDateRange();
  Logger.log(`Fetching: ${startDate} to ${endDate}`);

  const count = runFetch(startDate, endDate, 500);

  updateWeeklyView();
  updateBudgetSheet();
  updateDashboard();
  // Email report on Sundays
  if (new Date().getDay() === 0) emailReport();

  // Month-end alert
  checkMonthEnd();
}

// ─────────────────────────────────────────
// TEST FETCH — current month only
// ─────────────────────────────────────────
/**
 * Testing helper: clears Plaid_Transactions and refetches the current month.
 */
function test_fetch() {
  const { startDate, endDate } = getCurrentMonthRange();
  Logger.log(`TEST: Fetching current month ${startDate} to ${endDate}`);

  // Clear existing data first
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Plaid_Transactions');
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, 10).clearContent();

  const count = runFetch(startDate, endDate, 500);

  if (count > 0) {
    Logger.log(`✅ Test fetch complete! ${count} transactions written to Plaid_Transactions. Sorted by date, current month only.`);
  } else {
    Logger.log('ℹ️ No transactions returned. Check your tokens in setup_properties.');
  }
}
