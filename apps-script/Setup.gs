// ============================================================
// PERSONAL FINANCE TRACKER — Apps Script v2
// Plaid → Google Sheets → Weekly Email
// Updated: fixes ordering, categories, date range, sign flip,
//          new Paycheck + Transfer categories
// ============================================================

// ─────────────────────────────────────────
// STEP 1: RUN THIS FIRST — stores your tokens securely
// ─────────────────────────────────────────
/**
 * One-time setup: writes Plaid credentials, access tokens and the report
 * recipient into Script Properties. Fill the values in locally, run once,
 * then restore the placeholders so no secret stays in code. The same keys
 * can be set by hand under Project Settings > Script Properties.
 */
function setup_properties() {
  const props = PropertiesService.getScriptProperties();
  props.setProperties({
    PLAID_PAUSED:        'false',             // set to 'true' to stop all Plaid calls without touching triggers
    PLAID_CLIENT_ID:     'PASTE_CLIENT_ID',
    PLAID_SECRET:        'PASTE_SECRET',
    PLAID_ENV:           'sandbox',           // 'production' for real bank data (Limited Production, Trial or full Production)
    PLAID_TOKEN_BANK1:   'PASTE_ACCESS_TOKEN_BANK1',
    PLAID_TOKEN_BANK2:   'PASTE_ACCESS_TOKEN_BANK2',
    PLAID_TOKEN_BANK3:   'PASTE_ACCESS_TOKEN_BANK3',
    PLAID_TOKEN_BANK4:   'PASTE_ACCESS_TOKEN_BANK4',
    EMAIL_TO:            'you@example.com'
  });
  Logger.log('✅ Properties saved successfully.');
}

// ─────────────────────────────────────────
// MYLEDGER MENU
// ─────────────────────────────────────────
 
/** Adds the 💰 MyLedger menu to the spreadsheet. */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('💰 MyLedger')
    .addItem('📥 Fetch Transactions (Current Month)', 'menu_fetchCurrentMonth')
    .addItem('📥 Fetch Transactions (Scheduled Range)', 'menu_fetchScheduledRange')
    .addSeparator()
    .addItem('📊 Update Weekly View', 'menu_updateWeeklyView')
    .addItem('📋 Update Budget Sheet', 'menu_updateBudgetSheet')
    .addItem('📈 Update Dashboard', 'menu_updateDashboard')
    .addSeparator()
    .addItem('📧 Send Weekly Report', 'menu_sendReport')
    .addToUi();
}
 
function menu_fetchCurrentMonth() {
  var ui = SpreadsheetApp.getUi();
  ui.alert('⏳ Fetching...', 'Pulling all transactions for the current month. This may take a moment.', ui.ButtonSet.OK);
 
  var range = getCurrentMonthRange();
 
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Plaid_Transactions');
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, 10).clearContent();
 
  var count = runFetch(range.startDate, range.endDate, 500);
 
  ui.alert('✅ Done!', 'Fetched ' + count + ' transactions for ' + range.startDate + ' to ' + range.endDate + '.', ui.ButtonSet.OK);
}
 
function menu_fetchScheduledRange() {
  var ui = SpreadsheetApp.getUi();
  var range = getDateRange();
  ui.alert('⏳ Fetching...', 'Pulling transactions for ' + range.startDate + ' to ' + range.endDate + '.', ui.ButtonSet.OK);
 
  var count = runFetch(range.startDate, range.endDate, 500);
 
  ui.alert('✅ Done!', 'Fetched ' + count + ' transactions (' + range.startDate + ' to ' + range.endDate + ').', ui.ButtonSet.OK);
}
 
function menu_updateWeeklyView() {
  updateWeeklyView();
  SpreadsheetApp.getUi().alert('✅ Weekly View updated!');
}
 
function menu_updateBudgetSheet() {
  var ui = SpreadsheetApp.getUi();
  var data = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Mar_2026').getDataRange().getValues();
  
  // Check if template exists by looking for SPENDING header
  var hasTemplate = data.some(function(row) { 
    return String(row[0]).trim() === 'SPENDING'; 
  });
  
  if (!hasTemplate) {
    setupBudgetTemplate();
  }
  
  updateBudgetSheet();
  ui.alert('✅ Budget sheet updated!');
}

function menu_updateDashboard() {
  updateDashboard();
  SpreadsheetApp.getUi().alert('✅ Dashboard updated!');
}

function menu_sendReport() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.alert('📧 Send Report', 'Send weekly finance report to your email now?', ui.ButtonSet.YES_NO);
  if (response !== ui.Button.YES) return;
  
  emailReport();
  ui.alert('✅ Report sent to your email!');
}
