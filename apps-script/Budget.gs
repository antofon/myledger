// Budget.gs: monthly budget tab (template + updater)

// ═══════════════════════════════════════════════════════════════
// BUDGET SHEET — SIMPLIFIED CATEGORY-BASED STRUCTURE
// Setup function + auto-updater
// ═══════════════════════════════════════════════════════════════


// ─────────────────────────────────────────
// SETUP: Rebuilds Mar_2026 with clean structure
// Run once to create the template, then updateBudgetSheet
// populates transactions into it automatically.
//
// ⚠️  This WIPES and rebuilds the entire Mar_2026 sheet.
// ─────────────────────────────────────────
/**
 * Wipes and rebuilds the Mar_2026 budget tab: one section per spending
 * category with its budget target, then Spending Summary, Income and Take
 * Home. Run once, then updateBudgetSheet fills it in.
 */
function setupBudgetTemplate() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Mar_2026');

  if (!sheet) {
    sheet = ss.insertSheet('Mar_2026');
  }

  // Clear everything
  sheet.clear();
  sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).clearDataValidations();
  sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).breakApart();
  sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).setBackground(null);
  sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).setFontWeight('normal');
  sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).setFontColor(null);

  // ── COLUMN HEADERS ──
  var headers = ['Category', 'Budget', 'Actual', 'Remaining', 'Amount', 'Account', 'Date', 'Week', 'Notes'];
  sheet.getRange(1, 1, 1, 9).setValues([headers]);
  sheet.getRange(1, 1, 1, 9)
    .setBackground('#4a86c8')
    .setFontColor('white')
    .setFontWeight('bold')
    .setFontSize(11);

  // ── SPENDING CATEGORIES with budget targets ──
  // Order matches your original sheet flow
  var categories = [
    { name: 'Debt',                   budget: 500 },
    { name: 'Household',              budget: 300 },
    { name: 'Groceries',              budget: 400 },
    { name: 'Subscriptions',          budget: 75 },
    { name: 'Guilt-Free Spending',    budget: 200 },
    { name: 'Health',                 budget: 50 },
    { name: 'Travel',                 budget: 100 },
    { name: 'Gifts',                  budget: 50 },
    { name: 'Miscellaneous Expenses', budget: 100 }
  ];

  var currentRow = 2;

  // ── TITLE ROW ──
  sheet.getRange(currentRow, 1, 1, 9).merge();
  sheet.getRange(currentRow, 1).setValue('SPENDING');
  sheet.getRange(currentRow, 1, 1, 9)
    .setBackground('#1a1f36')
    .setFontColor('white')
    .setFontWeight('bold')
    .setFontSize(12);
  currentRow++;

  // ── BUILD EACH CATEGORY SECTION ──
  categories.forEach(function(cat) {
    // Category header row
    sheet.getRange(currentRow, 1).setValue(cat.name);
    sheet.getRange(currentRow, 2).setValue(cat.budget);
    sheet.getRange(currentRow, 3).setValue(0);    // Actual (updated by script)
    sheet.getRange(currentRow, 4).setValue(cat.budget);  // Remaining (updated by script)
    sheet.getRange(currentRow, 1, 1, 9)
      .setBackground('#4a86c8')
      .setFontColor('white')
      .setFontWeight('bold');
    sheet.getRange(currentRow, 2, 1, 3).setNumberFormat('$#,##0.00');
    currentRow++;

    // Sub-header for transaction columns
    sheet.getRange(currentRow, 1, 1, 9).setValues([[
      '', '', '', '', 'Amount', 'Account', 'Date', 'Week', 'Notes'
    ]]);
    sheet.getRange(currentRow, 1, 1, 9)
      .setBackground('#e8eaf6')
      .setFontWeight('bold')
      .setFontSize(9);
    currentRow++;

    // Placeholder row (transactions will be inserted above the spacer)
    // Leave one blank row as a marker — the script inserts ABOVE this
    sheet.getRange(currentRow, 1).setValue('— no transactions yet —');
    sheet.getRange(currentRow, 1, 1, 9)
      .setFontColor('#999999')
      .setFontStyle('italic');
    currentRow++;

    // Blank spacer
    currentRow++;
  });

  // ── SPENDING SUMMARY ──
  sheet.getRange(currentRow, 1, 1, 9).merge();
  sheet.getRange(currentRow, 1).setValue('SPENDING SUMMARY');
  sheet.getRange(currentRow, 1, 1, 9)
    .setBackground('#1a1f36')
    .setFontColor('white')
    .setFontWeight('bold')
    .setFontSize(12);
  currentRow++;

  var totalBudget = categories.reduce(function(sum, c) { return sum + c.budget; }, 0);

  var summaryRows = [
    ['Total Budget',  totalBudget, '', ''],
    ['Total Actual',  0, '', ''],
    ['Total Remaining', totalBudget, '', '']
  ];

  summaryRows.forEach(function(row) {
    sheet.getRange(currentRow, 1).setValue(row[0]);
    sheet.getRange(currentRow, 2).setValue(row[1]);
    sheet.getRange(currentRow, 1, 1, 9).setFontWeight('bold');
    sheet.getRange(currentRow, 2).setNumberFormat('$#,##0.00');
    currentRow++;
  });

  currentRow++; // spacer

  // ── INCOME SECTION ──
  sheet.getRange(currentRow, 1, 1, 9).merge();
  sheet.getRange(currentRow, 1).setValue('INCOME');
  sheet.getRange(currentRow, 1, 1, 9)
    .setBackground('#2e7d32')
    .setFontColor('white')
    .setFontWeight('bold')
    .setFontSize(12);
  currentRow++;

  var incomeRows = [
    ['Work Income',                4000],
    ['Projected Additional Income', 500],
    ['Actual Additional Income',    0],
    ['Projected Income',           4500],
    ['Actual Income',              0]
  ];

  incomeRows.forEach(function(row) {
    sheet.getRange(currentRow, 1).setValue(row[0]);
    sheet.getRange(currentRow, 2).setValue(row[1]);
    sheet.getRange(currentRow, 1, 1, 9).setFontWeight('bold');
    sheet.getRange(currentRow, 2).setNumberFormat('$#,##0.00');
    currentRow++;
  });

  currentRow++; // spacer

  // ── TAKE HOME SECTION ──
  sheet.getRange(currentRow, 1, 1, 9).merge();
  sheet.getRange(currentRow, 1).setValue('TAKE HOME');
  sheet.getRange(currentRow, 1, 1, 9)
    .setBackground('#f57f17')
    .setFontColor('white')
    .setFontWeight('bold')
    .setFontSize(12);
  currentRow++;

  var takeHomeRows = [
    ['Projected Take Home', 0],   // Projected Income - Total Budget
    ['Actual Take Home',    0]    // Actual Income - Total Actual
  ];

  takeHomeRows.forEach(function(row) {
    sheet.getRange(currentRow, 1).setValue(row[0]);
    sheet.getRange(currentRow, 2).setValue(row[1]);
    sheet.getRange(currentRow, 1, 1, 9).setFontWeight('bold');
    sheet.getRange(currentRow, 2).setNumberFormat('$#,##0.00');
    currentRow++;
  });

  // ── COLUMN WIDTHS ──
  sheet.setColumnWidth(1, 250);  // Category/Merchant
  sheet.setColumnWidth(2, 110);  // Budget
  sheet.setColumnWidth(3, 110);  // Actual
  sheet.setColumnWidth(4, 110);  // Remaining
  sheet.setColumnWidth(5, 110);  // Amount
  sheet.setColumnWidth(6, 130);  // Account
  sheet.setColumnWidth(7, 110);  // Date
  sheet.setColumnWidth(8, 80);   // Week
  sheet.setColumnWidth(9, 200);  // Notes

  Logger.log('✅ Mar_2026 budget template created. Run updateBudgetSheet() to populate transactions.');
}


// ─────────────────────────────────────────
// UPDATE BUDGET SHEET
// Reads Plaid_Transactions, inserts into
// the simplified category sections, and
// updates Actual/Remaining/Take Home.
// ─────────────────────────────────────────
/**
 * Inserts new spending transactions into their category sections on the
 * Mar_2026 tab (deduped on the plaid:<id> note), then recomputes Actual,
 * Remaining, the spending summary, Actual Income and Take Home.
 */
function updateBudgetSheet() {
  var ss          = SpreadsheetApp.getActiveSpreadsheet();
  var plaidSheet  = ss.getSheetByName('Plaid_Transactions');
  var budgetSheet = ss.getSheetByName('Mar_2026');
  var TZ          = 'America/Los_Angeles';

  var ACCOUNT_MAP = {
    'BANK1':  'BANK1 CC',
    'BANK2':  'BANK2 CC',
    'BANK3':  'BANK3 Checking',
    'BANK4':  'BANK4 Savings'
  };

  // All spending categories that get transaction rows
  var SPENDING_CATEGORIES = [
    'Debt', 'Household', 'Groceries', 'Subscriptions',
    'Guilt-Free Spending', 'Health', 'Travel', 'Gifts',
    'Miscellaneous Expenses'
  ];

  if (!plaidSheet || !budgetSheet) {
    Logger.log('❌ Missing Plaid_Transactions or Mar_2026 sheet');
    return;
  }

  // ── READ TRANSACTIONS ──
  var txData = plaidSheet.getDataRange().getValues();
  if (txData.length < 2) { Logger.log('ℹ️ No transactions'); return; }

  var transactions = [];
  for (var i = 1; i < txData.length; i++) {
    var row = txData[i];
    if (!row[0]) continue;
    var dateStr = toDateStr_(row[0]);
    if (!dateStr) continue;

    transactions.push({
      date:       dateStr,
      merchant:   String(row[1] || ''),
      amount:     typeof row[2] === 'number' ? row[2] : parseFloat(row[2]) || 0,
      category:   String(row[3] || ''),
      account:    String(row[5] || ''),
      plaidId:    String(row[6] || ''),
      mineFamily: String(row[7] || '')
    });
  }

  // ── HELPER: week number in month ──
  function getMonthWeek(dateStr) {
    var parts = dateStr.split('-');
    var day = parseInt(parts[2], 10);
    return 'Week ' + Math.ceil(day / 7);
  }

  // ── COLLECT existing Plaid IDs in budget sheet (for dedup) ──
  var budgetData = budgetSheet.getDataRange().getValues();
  var existingPlaidIds = new Set();
  for (var r = 0; r < budgetData.length; r++) {
    var note = String(budgetData[r][8] || '');
    var match = note.match(/plaid:(\S+)/);
    if (match) existingPlaidIds.add(match[1]);
  }

  // ── GROUP new transactions by category ──
  var txByCategory = {};
  SPENDING_CATEGORIES.forEach(function(cat) { txByCategory[cat] = []; });

  transactions.forEach(function(tx) {
    // Skip non-spending categories
    if (tx.category === 'Transfer' || tx.category === 'Paycheck' || tx.category === 'Investments') return;
    // Skip already-inserted
    if (tx.plaidId && existingPlaidIds.has(tx.plaidId)) return;
    // Put in matching bucket
    if (txByCategory[tx.category]) {
      txByCategory[tx.category].push(tx);
    } else {
      // Fallback: anything unmapped goes to Miscellaneous
      txByCategory['Miscellaneous Expenses'].push(tx);
    }
  });

  // ═══════════════════════════════════════
  // PHASE 1: INSERT TRANSACTIONS
  // ═══════════════════════════════════════

  // For each category, find its "— no transactions yet —" or sub-header row
  // and insert new transactions above the placeholder.
  // Process from BOTTOM of sheet upward so row shifts don't affect earlier categories.

  var insertPlan = []; // { category, insertRow, txList }

  SPENDING_CATEGORIES.forEach(function(catName) {
    var txList = txByCategory[catName];
    if (txList.length === 0) return;

    // Re-read sheet each time (rows shift after inserts)
    var data = budgetSheet.getDataRange().getValues();

    // Find the category header row
    var headerRow = -1;
    for (var r = 0; r < data.length; r++) {
      if (String(data[r][0]).trim() === catName && String(data[r][1]).trim() !== '') {
        headerRow = r;
        break;
      }
    }
    if (headerRow < 0) {
      Logger.log('⚠️ Category header not found: ' + catName);
      return;
    }

    // Find insertion point: the "— no transactions yet —" row or
    // the first blank row after the sub-header
    var insertRow = -1;
    for (var r = headerRow + 1; r < data.length; r++) {
      var cellA = String(data[r][0]).trim();
      // Stop at next category header or section header
      if (SPENDING_CATEGORIES.indexOf(cellA) >= 0 && r > headerRow + 1) break;
      if (cellA === 'SPENDING SUMMARY' || cellA === 'INCOME' || cellA === 'TAKE HOME') break;

      if (cellA === '— no transactions yet —' || cellA === '') {
        insertRow = r + 1; // 1-indexed sheet row
        break;
      }
    }

    if (insertRow < 0) {
      // Fallback: insert right after sub-header (headerRow + 2)
      insertRow = headerRow + 3; // header=0-idx, subheader=+1, insert at +2 → sheet row +3
    }

    insertPlan.push({
      category:  catName,
      insertRow: insertRow,
      txList:    txList
    });
  });

  // Sort by insertRow DESCENDING
  insertPlan.sort(function(a, b) { return b.insertRow - a.insertRow; });

  var insertCount = 0;
  insertPlan.forEach(function(plan) {
    plan.txList.sort(function(a, b) { return a.date.localeCompare(b.date); });
    var numRows = plan.txList.length;

    // Remove "— no transactions yet —" placeholder if present
    var data = budgetSheet.getDataRange().getValues();
    for (var r = 0; r < data.length; r++) {
      if (String(data[r][0]).trim() === '— no transactions yet —') {
        // Check if this is in the right category section
        // Find nearest category header above
        for (var h = r - 1; h >= 0; h--) {
          if (SPENDING_CATEGORIES.indexOf(String(data[h][0]).trim()) >= 0) {
            if (String(data[h][0]).trim() === plan.category) {
              budgetSheet.getRange(r + 1, 1, 1, 9).clearContent();
              budgetSheet.getRange(r + 1, 1, 1, 9).setFontColor(null).setFontStyle(null);
              // Use this row as first insert point
              plan.insertRow = r + 1;
            }
            break;
          }
        }
      }
    }

    // Insert rows if we need more than the placeholder slot
    if (numRows > 1) {
      budgetSheet.insertRowsBefore(plan.insertRow + 1, numRows - 1);
    }

    // Write transactions
    plan.txList.forEach(function(tx, idx) {
      var writeRow = plan.insertRow + idx;
      budgetSheet.getRange(writeRow, 1, 1, 9).setValues([[
        tx.merchant,                              // A: Merchant
        '',                                       // B: (Budget col, blank for tx rows)
        '',                                       // C: (Actual col, blank for tx rows)
        '',                                       // D: (Remaining col, blank for tx rows)
        typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount) || 0,  // E: Amount
        ACCOUNT_MAP[tx.account] || tx.account,    // F: Account
        tx.date,                                  // G: Date
        getMonthWeek(tx.date),                    // H: Week
        'plaid:' + tx.plaidId                     // I: Plaid ID
      ]]);
      budgetSheet.getRange(writeRow, 5).setNumberFormat('$#,##0.00');
      // Alternate row shading
      if (idx % 2 === 1) {
        budgetSheet.getRange(writeRow, 1, 1, 9).setBackground('#f8f9ff');
      } else {
        budgetSheet.getRange(writeRow, 1, 1, 9).setBackground(null);
      }
      insertCount++;
    });

    Logger.log('📥 Inserted ' + numRows + ' transactions into ' + plan.category);
  });

  Logger.log('📥 Total transactions inserted: ' + insertCount);


  // ═══════════════════════════════════════
  // PHASE 2: UPDATE ACTUAL / REMAINING / SUMMARIES
  // ═══════════════════════════════════════

  // Re-read sheet after all inserts
  var finalData = budgetSheet.getDataRange().getValues();
  var finalRows = finalData.length;

  // Sum ALL transactions per category (not just new ones — use Plaid_Transactions directly)
  var actualByCategory = {};
  SPENDING_CATEGORIES.forEach(function(cat) { actualByCategory[cat] = 0; });

  transactions.forEach(function(tx) {
    if (tx.category === 'Transfer' || tx.category === 'Paycheck' || tx.category === 'Investments') return;
    if (actualByCategory.hasOwnProperty(tx.category)) {
      actualByCategory[tx.category] += tx.amount;
    } else {
      actualByCategory['Miscellaneous Expenses'] += tx.amount;
    }
  });

  // Update each category header row
  var totalActual = 0;
  var totalBudget = 0;

  for (var r = 0; r < finalRows; r++) {
    var cellA = String(finalData[r][0]).trim();

    if (SPENDING_CATEGORIES.indexOf(cellA) >= 0) {
      var budget = typeof finalData[r][1] === 'number' ? finalData[r][1] : parseFloat(finalData[r][1]) || 0;
      var actual = actualByCategory[cellA] || 0;
      var remaining = budget - actual;

      budgetSheet.getRange(r + 1, 3).setValue(actual);      // Actual
      budgetSheet.getRange(r + 1, 4).setValue(remaining);   // Remaining
      budgetSheet.getRange(r + 1, 3, 1, 2).setNumberFormat('$#,##0.00');

      // Color remaining red if over budget, green if under
      if (remaining < 0) {
        budgetSheet.getRange(r + 1, 4).setFontColor('#d32f2f');
      } else {
        budgetSheet.getRange(r + 1, 4).setFontColor('#2e7d32');
      }

      totalBudget += budget;
      totalActual += actual;

      Logger.log('📊 ' + cellA + ': Budget $' + budget.toFixed(2) + ' | Actual $' + actual.toFixed(2) + ' | Remaining $' + remaining.toFixed(2));
    }
  }

  // ── Update Spending Summary ──
  var totalRemaining = totalBudget - totalActual;
  for (var r = 0; r < finalRows; r++) {
    var cellA = String(finalData[r][0]).trim();
    if (cellA === 'Total Budget') {
      budgetSheet.getRange(r + 1, 2).setValue(totalBudget);
      budgetSheet.getRange(r + 1, 2).setNumberFormat('$#,##0.00');
    }
    if (cellA === 'Total Actual') {
      budgetSheet.getRange(r + 1, 2).setValue(totalActual);
      budgetSheet.getRange(r + 1, 2).setNumberFormat('$#,##0.00');
    }
    if (cellA === 'Total Remaining') {
      budgetSheet.getRange(r + 1, 2).setValue(totalRemaining);
      budgetSheet.getRange(r + 1, 2).setNumberFormat('$#,##0.00');
      budgetSheet.getRange(r + 1, 2).setFontColor(totalRemaining < 0 ? '#d32f2f' : '#2e7d32');
    }
  }

  // ── Update Income ──
  var actualIncome = 0;
  transactions.forEach(function(tx) {
    if (tx.category === 'Paycheck') actualIncome += tx.amount;
  });

  var projectedIncome = 0;
  for (var r = 0; r < finalRows; r++) {
    var cellA = String(finalData[r][0]).trim();
    if (cellA === 'Actual Income') {
      budgetSheet.getRange(r + 1, 2).setValue(actualIncome);
      budgetSheet.getRange(r + 1, 2).setNumberFormat('$#,##0.00');
    }
    if (cellA === 'Projected Income') {
      projectedIncome = typeof finalData[r][1] === 'number' ? finalData[r][1] : parseFloat(finalData[r][1]) || 0;
    }
  }

  // ── Update Take Home ──
  for (var r = 0; r < finalRows; r++) {
    var cellA = String(finalData[r][0]).trim();
    if (cellA === 'Projected Take Home') {
      budgetSheet.getRange(r + 1, 2).setValue(projectedIncome - totalBudget);
      budgetSheet.getRange(r + 1, 2).setNumberFormat('$#,##0.00');
    }
    if (cellA === 'Actual Take Home') {
      var actualTakeHome = actualIncome - totalActual;
      budgetSheet.getRange(r + 1, 2).setValue(actualTakeHome);
      budgetSheet.getRange(r + 1, 2).setNumberFormat('$#,##0.00');
      budgetSheet.getRange(r + 1, 2).setFontColor(actualTakeHome < 0 ? '#d32f2f' : '#2e7d32');
    }
  }

  Logger.log('✅ Budget sheet updated!');
  Logger.log('  Transactions inserted: ' + insertCount);
  Logger.log('  Total Budget: $' + totalBudget.toFixed(2));
  Logger.log('  Total Actual: $' + totalActual.toFixed(2));
  Logger.log('  Actual Income: $' + actualIncome.toFixed(2));
}


// ─────────────────────────────────────────
// MANUAL TRIGGERS
// ─────────────────────────────────────────
function updateBudget_manual() {
  updateBudgetSheet();
  Logger.log('✅ Manual budget update complete');
}
