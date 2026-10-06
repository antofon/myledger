// WeeklyView.gs: Sunday to Saturday weekly breakdown

// ─────────────────────────────────────────
// WEEKLY VIEW UPDATER — FIXED
// Fixes: (1) unmerge leftover cells before rebuild
//        (2) timezone-safe date parsing via Utilities.formatDate
//        (3) batch write for reliability
// ─────────────────────────────────────────
/**
 * Rebuilds Weekly_View from Plaid_Transactions: one block per Sunday to
 * Saturday week with its transactions, a category breakdown and a total.
 * Paycheck, Transfer and Investments are listed but not counted as spending.
 */
function updateWeeklyView() {
  const ss         = SpreadsheetApp.getActiveSpreadsheet();
  const plaidSheet = ss.getSheetByName('Plaid_Transactions');
  const weekSheet  = ss.getSheetByName('Weekly_View');
  const TZ         = 'America/Los_Angeles';
 
  // ── CLEAR: content, formatting, AND merges ──
  const lastRow = weekSheet.getLastRow();
  const lastCol = weekSheet.getLastColumn() || 9;
  if (lastRow > 1) {
    const clearRange = weekSheet.getRange(2, 1, lastRow - 1, lastCol);
    clearRange.breakApart();          // ← UNMERGE first
    clearRange.clearContent();
    clearRange.setBackground(null);
    clearRange.setFontWeight('normal');
    clearRange.setFontColor(null);
  }
 
  // ── READ Plaid_Transactions ──
  const data = plaidSheet.getDataRange().getValues();
  if (data.length < 2) return;
 
  // ── TIMEZONE-SAFE date string from any cell value ──
  function toDateStr(val) {
    if (!val) return null;
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return null;
      return Utilities.formatDate(val, TZ, 'yyyy-MM-dd');
    }
    // String like "2026-03-09" → build a safe local-noon Date to avoid UTC-midnight shift
    var s = String(val).trim();
    var parts = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (parts) {
      // Create date at noon UTC so timezone offset never flips the calendar day
      var d = new Date(Date.UTC(+parts[1], +parts[2] - 1, +parts[3], 12, 0, 0));
      return Utilities.formatDate(d, TZ, 'yyyy-MM-dd');
    }
    // Fallback: try native parse with noon trick
    var d2 = new Date(s + 'T12:00:00');
    if (isNaN(d2.getTime())) return null;
    return Utilities.formatDate(d2, TZ, 'yyyy-MM-dd');
  }
 
  // ── WEEK START (Sunday) from a "yyyy-MM-dd" string ──
  function getWeekStartStr(dateStr) {
    var parts = dateStr.split('-');
    var d = new Date(+parts[0], +parts[1] - 1, +parts[2]); // local date
    var day = d.getDay(); // 0=Sun
    d.setDate(d.getDate() - day);
    // Return padded string
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + mm + '-' + dd;
  }
 
  // ── FORMAT "Mar 8, 2026" from "yyyy-MM-dd" ──
  function fmtLabel(dateStr) {
    var parts = dateStr.split('-');
    var d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    return Utilities.formatDate(d, TZ, 'MMM d, yyyy');
  }
 
  // ── GROUP transactions by Sun–Sat week ──
  var weekMap = {};
 
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var dateStr = toDateStr(row[0]);
    if (!dateStr) continue;
 
    var weekKey = getWeekStartStr(dateStr);
 
    if (!weekMap[weekKey]) {
      var weekEndParts = weekKey.split('-');
      var we = new Date(+weekEndParts[0], +weekEndParts[1] - 1, +weekEndParts[2]);
      we.setDate(we.getDate() + 6);
      weekMap[weekKey] = {
        label:  'Week of ' + fmtLabel(weekKey),
        rows:   [],
        totals: {}
      };
    }
 
    weekMap[weekKey].rows.push({
      dateStr: dateStr,
      date:    dateStr,          // write the clean string
      merchant:   row[1] || '',
      amount:     typeof row[2] === 'number' ? row[2] : parseFloat(row[2]) || 0,
      category:   row[3] || '',
      account:    row[5] || '',
      mineFamily: row[7] || '',
      splitPct:   row[8] || '',
      notes:      row[9] || '',
    });
  }
 
  // ── SORT weeks chronologically (string compare works with yyyy-MM-dd) ──
  var sortedWeeks = Object.keys(weekMap).sort(function(a, b) {
    return a.localeCompare(b);
  });
 
  // ── BUILD all output rows in memory ──
  // Each entry: { values: [9 cols], style: 'header'|'subheader'|'tx'|'breakdownHeader'|'breakdown'|'total'|'spacer' }
  var output = [];
 
  sortedWeeks.forEach(function(weekKey) {
    var week = weekMap[weekKey];
 
    // Sort transactions within week by date ascending
    week.rows.sort(function(a, b) {
      return a.dateStr.localeCompare(b.dateStr);
    });
 
    // Week header
    output.push({
      values: [week.label, '', '', '', '', '', '', '', ''],
      style:  'header'
    });
 
    // Column sub-headers
    output.push({
      values: ['Date', 'Merchant', 'Amount', 'Category', 'Account', 'Mine/Family', 'Split%', 'Notes', 'Source'],
      style:  'subheader'
    });
 
    // Transaction rows
    var rowIndex = 0;
    week.rows.forEach(function(tx) {
      output.push({
        values: [tx.date, tx.merchant, parseFloat(tx.amount), tx.category, tx.account, tx.mineFamily, tx.splitPct, tx.notes, 'Plaid'],
        style:  rowIndex % 2 === 1 ? 'txAlt' : 'tx'
      });
      rowIndex++;
 
      // Accumulate category totals (skip Paycheck, Transfer, Investments)
      var cat    = tx.category;
      var amount = parseFloat(tx.amount) || 0;
      if (cat !== 'Paycheck' && cat !== 'Transfer' && cat !== 'Investments') {
        week.totals[cat] = (week.totals[cat] || 0) + amount;
      }
    });
 
    // Category breakdown header
    output.push({
      values: ['── Category Breakdown ──', '', '', '', '', '', '', '', ''],
      style:  'breakdownHeader'
    });
 
    // Category lines sorted by amount desc
    var entries = [];
    for (var cat in week.totals) {
      entries.push([cat, week.totals[cat]]);
    }
    entries.sort(function(a, b) { return b[1] - a[1]; });
    entries.forEach(function(entry) {
      output.push({
        values: [entry[0], '', entry[1].toFixed(2), '', '', '', '', '', ''],
        style:  'breakdown'
      });
    });
 
    // Total row
    var totalSpend  = Object.keys(week.totals).reduce(function(sum, k) { return sum + week.totals[k]; }, 0);
    var paycheckRows = week.rows.filter(function(r) { return r.category === 'Paycheck'; });
    var totalIncome  = paycheckRows.reduce(function(sum, r) { return sum + (parseFloat(r.amount) || 0); }, 0);
 
    var incomeNote = totalIncome > 0 ? 'Income: $' + totalIncome.toFixed(2) : '';
    output.push({
      values: [week.label + ' - Total Spent', '', '$' + totalSpend.toFixed(2), '', incomeNote, '', '', '', ''],
      style:  'total',
      hasIncome: totalIncome > 0
    });
 
    // Spacer
    output.push({
      values: ['', '', '', '', '', '', '', '', ''],
      style:  'spacer'
    });
  });
 
  if (output.length === 0) return;
 
  // ── BATCH WRITE all values at once ──
  var allValues = output.map(function(r) { return r.values; });
  weekSheet.getRange(2, 1, allValues.length, 9).setValues(allValues);
 
  // ── APPLY formatting row-by-row ──
  output.forEach(function(row, idx) {
    var sheetRow = idx + 2; // offset for header row 1
    var range    = weekSheet.getRange(sheetRow, 1, 1, 9);
 
    switch (row.style) {
      case 'header':
        range.merge();
        range.setBackground('#1a1f36')
             .setFontColor('white')
             .setFontWeight('bold')
             .setFontSize(11);
        break;
 
      case 'subheader':
        range.setBackground('#e8eaf6')
             .setFontWeight('bold')
             .setFontSize(10);
        break;
 
      case 'txAlt':
        range.setBackground('#f8f9ff');
        break;
 
      case 'breakdownHeader':
        range.setBackground('#e3f2fd')
             .setFontWeight('bold');
        break;
 
      case 'breakdown':
        range.setBackground('#f1f8ff');
        break;
 
      case 'total':
        range.setBackground('#1a1f36')
             .setFontColor('white')
             .setFontWeight('bold');
        if (row.hasIncome) {
          weekSheet.getRange(sheetRow, 5).setFontColor('white');
        }
        break;
 
      // 'tx' and 'spacer' get no extra formatting
    }
  });
 
  // ── DATE FORMAT for transaction rows only (not headers/summaries) ──
  output.forEach(function(row, idx) {
    if (row.style === 'tx' || row.style === 'txAlt') {
      weekSheet.getRange(idx + 2, 1).setNumberFormat('yyyy-mm-dd');
    }
  });
 
  Logger.log('✅ Weekly_View updated with Sun–Sat week grouping');
}
