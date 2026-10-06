// Reports.gs: Sunday email, month-end reminder, new-month reset

// ─────────────────────────────────────────
// EMAIL REPORT — sends .xlsx every Sunday
// ─────────────────────────────────────────
/**
 * Emails the workbook as .xlsx to EMAIL_TO with category totals in the body.
 * Totals cover every row currently in Plaid_Transactions.
 */
function emailReport() {
  const props   = PropertiesService.getScriptProperties();
  const emailTo = props.getProperty('EMAIL_TO');
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const sheetId = ss.getId();

  const today    = new Date();
  const dateStr  = Utilities.formatDate(today, 'America/Los_Angeles', 'MMM dd, yyyy');
  const fileName = `MyLedger_Report_${Utilities.formatDate(today, 'America/Los_Angeles', 'yyyy-MM-dd')}.xlsx`;

  const url   = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
  const token = ScriptApp.getOAuthToken();
  const blob  = UrlFetchApp.fetch(url, { headers: { Authorization: `Bearer ${token}` } })
                  .getBlob().setName(fileName);

  // Build spending summary for email body
  const plaidSheet = ss.getSheetByName('Plaid_Transactions');
  const data = plaidSheet.getDataRange().getValues().slice(1).filter(r => r[0]);

  const categoryTotals = {};
  data.forEach(row => {
    const cat    = row[3];
    const amount = parseFloat(row[2]) || 0;
    if (cat === 'Paycheck' || cat === 'Transfer') return;
    categoryTotals[cat] = (categoryTotals[cat] || 0) + amount;
  });

  const paycheckTotal = data
    .filter(r => r[3] === 'Paycheck')
    .reduce((sum, r) => sum + (parseFloat(r[2]) || 0), 0);

  const totalSpending = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

  let summaryLines = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => `  ${cat}: $${amt.toFixed(2)}`)
    .join('\n');

  MailApp.sendEmail({
    to:      emailTo,
    subject: `💰 MyLedger Weekly Report — ${dateStr}`,
    body:
      `Hi Name,\n\nHere's your weekly finance report for ${dateStr}.\n\n` +
      `📊 MARCH SPENDING SUMMARY\n` +
      `─────────────────────────\n` +
      `${summaryLines}\n\n` +
      `Total Spent: $${totalSpending.toFixed(2)}\n` +
      (paycheckTotal > 0 ? `Total Paycheck Income: $${paycheckTotal.toFixed(2)}\n` : '') +
      `\nFull breakdown attached as Excel file.\n\n` +
      `Next fetch: Wednesday 8am\n\n— MyLedger`,
    attachments: [blob]
  });

  Logger.log(`✅ Email sent to ${emailTo}`);
}

// ─────────────────────────────────────────
// MONTH END ALERT
// ─────────────────────────────────────────
/**
 * On the last day of the month, emails a reminder to set up next month's
 * workbook. Only fires if something calls it on that day.
 */
function checkMonthEnd() {
  const props   = PropertiesService.getScriptProperties();
  const emailTo = props.getProperty('EMAIL_TO');
  const today   = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (tomorrow.getMonth() !== today.getMonth()) {
    const monthName = Utilities.formatDate(tomorrow, 'America/Los_Angeles', 'MMMM yyyy');
    MailApp.sendEmail({
      to:      emailTo,
      subject: `📅 New Month Starting — Set Up ${monthName}`,
      body:
        `Hi Name,\n\n${Utilities.formatDate(today, 'America/Los_Angeles', 'MMMM')} is now closed.\n\n` +
        `To set up ${monthName}:\n\n` +
        `1. Open Google Drive\n` +
        `2. Make a copy of this spreadsheet\n` +
        `3. Rename it "${monthName.replace(' ', '_')}"\n` +
        `4. Open it → Extensions → Apps Script → Run setup_new_month\n\n` +
        `Your fixed bills (loans, subscriptions) will be pre-filled automatically.\n\n— MyLedger`
    });
    Logger.log(`✅ Month-end alert sent for ${monthName}`);
  }
}

// ─────────────────────────────────────────
// NEW MONTH SETUP
// ─────────────────────────────────────────
/**
 * Clears the transaction tabs and resets the variable categories on the
 * monthly budget tab. Run by hand in the new month's copy.
 */
function setup_new_month() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  ['Plaid_Transactions', 'Manual_Transactions', 'All_Transactions', 'Weekly_View'].forEach(name => {
    const sheet   = ss.getSheetByName(name);
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  });

  const monthSheet = ss.getSheets().find(s =>
    s.getName().match(/[A-Z][a-z]+_\d{4}/)
  );

  if (monthSheet) {
    const data = monthSheet.getDataRange().getValues();
    for (let i = 0; i < data.length; i++) {
      monthSheet.getRange(i + 1, 7).clearContent();
      if (data[i][5] === 'No' || data[i][5] === 'N/A') {
        monthSheet.getRange(i + 1, 6).setValue('No');
      }
      if (['Guilt-Free Spending', 'Miscellaneous Expenses', 'Gifts'].includes(data[i][0])) {
        monthSheet.getRange(i + 1, 2).clearContent();
      }
    }
    Logger.log('✅ Budget sheet reset for new month');
  }

  Logger.log('✅ New month setup complete. All transaction sheets cleared. Fixed bills preserved.');
}
