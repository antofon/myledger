// Dashboard.gs: KPI cards, category table and donut chart

// ─────────────────────────────────────────
// DASHBOARD — Auto-generated spending summary
// Creates/updates a "Dashboard" sheet with
// polished category breakdown + chart
// ─────────────────────────────────────────
 
/**
 * Rebuilds the Dashboard tab: KPI cards (spent, income, net, budget left),
 * a spending-by-category table against budget targets, and a donut chart.
 * Creates the tab on first run.
 */
function updateDashboard() {
  var ss         = SpreadsheetApp.getActiveSpreadsheet();
  var plaidSheet = ss.getSheetByName('Plaid_Transactions');
  var TZ         = 'America/Los_Angeles';
 
  if (!plaidSheet) { Logger.log('❌ No Plaid_Transactions sheet'); return; }
 
  // ── GET OR CREATE DASHBOARD SHEET ──
  var dash = ss.getSheetByName('Dashboard');
  if (!dash) {
    dash = ss.insertSheet('Dashboard');
    // Move to first position
    ss.setActiveSheet(dash);
    ss.moveActiveSheet(1);
  }
 
  // Clear everything
  dash.clear();
  var maxRows = dash.getMaxRows();
  var maxCols = dash.getMaxColumns();
  if (maxCols < 9) dash.insertColumnsAfter(maxCols, 9 - maxCols);
  dash.getRange(1, 1, dash.getMaxRows(), dash.getMaxColumns()).setBackground('#f8f9fa');
  dash.getRange(1, 1, dash.getMaxRows(), dash.getMaxColumns()).setFontFamily('Google Sans');
 
  // Remove existing charts
  var charts = dash.getCharts();
  charts.forEach(function(chart) { dash.removeChart(chart); });
 
  // ── READ TRANSACTIONS ──
  var data = plaidSheet.getDataRange().getValues();
  if (data.length < 2) { Logger.log('ℹ️ No transactions'); return; }
 
  var now = new Date();
  var monthName = Utilities.formatDate(now, TZ, 'MMMM yyyy');
 
  // ── AGGREGATE BY CATEGORY ──
  var categoryTotals = {};
  var totalSpending  = 0;
  var totalIncome    = 0;
  var totalTransfers = 0;
  var txCount        = 0;
 
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
 
    var cat    = String(row[3] || 'Uncategorized');
    var amount = typeof row[2] === 'number' ? row[2] : parseFloat(row[2]) || 0;
 
    txCount++;
 
    if (cat === 'Paycheck') {
      totalIncome += amount;
    } else if (cat === 'Transfer') {
      totalTransfers += amount;
    } else if (cat === 'Investments') {
      // Track but don't count as spending
    } else {
      categoryTotals[cat] = (categoryTotals[cat] || 0) + amount;
      totalSpending += amount;
    }
  }
 
  // Sort categories by amount descending
  var sortedCategories = Object.keys(categoryTotals).sort(function(a, b) {
    return categoryTotals[b] - categoryTotals[a];
  });
 
  // ── BUDGET TARGETS (same as Mar_2026) ──
  var budgets = {
    'Debt':                   500,
    'Household':              300,
    'Groceries':              400,
    'Subscriptions':          75,
    'Guilt-Free Spending':    200,
    'Health':                 50,
    'Travel':                 100,
    'Gifts':                  50,
    'Miscellaneous Expenses': 100
  };
  var totalBudget = Object.keys(budgets).reduce(function(s, k) { return s + budgets[k]; }, 0);
 
  // ── COLORS PER CATEGORY ──
  var catColors = {
    'Debt':                   '#e53935',
    'Household':              '#8e24aa',
    'Groceries':              '#43a047',
    'Subscriptions':          '#1e88e5',
    'Guilt-Free Spending':    '#fb8c00',
    'Health':                 '#00acc1',
    'Travel':                 '#5e35b1',
    'Gifts':                  '#d81b60',
    'Miscellaneous Expenses': '#6d4c41'
  };
 
  var currentRow = 1;
 
  // ═══════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════
  dash.getRange(currentRow, 1, 1, 9).merge();
  dash.getRange(currentRow, 1).setValue('💰 MyLedger Dashboard — ' + monthName);
  dash.getRange(currentRow, 1, 1, 9)
    .setBackground('#1a1f36')
    .setFontColor('white')
    .setFontWeight('bold')
    .setFontSize(16)
    .setVerticalAlignment('middle');
  dash.setRowHeight(currentRow, 45);
  currentRow++;
 
  // Subtitle with last updated
  dash.getRange(currentRow, 1, 1, 9).merge();
  dash.getRange(currentRow, 1).setValue('Last updated: ' + Utilities.formatDate(now, TZ, 'MMM d, yyyy h:mm a') + '  •  ' + txCount + ' transactions');
  dash.getRange(currentRow, 1)
    .setFontColor('#666666')
    .setFontSize(10);
  currentRow += 2;
 
  // ═══════════════════════════════════════
  // KPI CARDS ROW
  // ═══════════════════════════════════════
  var kpiRow = currentRow;
 
  // Card 1: Total Spent
  dash.getRange(kpiRow, 1, 2, 2).merge();
  dash.getRange(kpiRow, 1)
    .setValue('Total Spent\n$' + totalSpending.toFixed(2))
    .setBackground('#ffffff')
    .setFontSize(13)
    .setFontWeight('bold')
    .setVerticalAlignment('middle')
    .setHorizontalAlignment('center')
    .setWrap(true);
  dash.setRowHeight(kpiRow, 30);
  dash.setRowHeight(kpiRow + 1, 30);
 
  // Card 2: Total Income
  dash.getRange(kpiRow, 3, 2, 2).merge();
  dash.getRange(kpiRow, 3)
    .setValue('Total Income\n$' + totalIncome.toFixed(2))
    .setBackground('#ffffff')
    .setFontSize(13)
    .setFontWeight('bold')
    .setVerticalAlignment('middle')
    .setHorizontalAlignment('center')
    .setWrap(true)
    .setFontColor('#2e7d32');
 
  // Card 3: Net (Income - Spending)
  var net = totalIncome - totalSpending;
  dash.getRange(kpiRow, 5, 2, 2).merge();
  dash.getRange(kpiRow, 5)
    .setValue('Net\n$' + net.toFixed(2))
    .setBackground('#ffffff')
    .setFontSize(13)
    .setFontWeight('bold')
    .setVerticalAlignment('middle')
    .setHorizontalAlignment('center')
    .setWrap(true)
    .setFontColor(net >= 0 ? '#2e7d32' : '#d32f2f');
 
  // Card 4: Budget Remaining
  var budgetRemaining = totalBudget - totalSpending;
  dash.getRange(kpiRow, 7, 2, 2).merge();
  dash.getRange(kpiRow, 7)
    .setValue('Budget Left\n$' + budgetRemaining.toFixed(2))
    .setBackground('#ffffff')
    .setFontSize(13)
    .setFontWeight('bold')
    .setVerticalAlignment('middle')
    .setHorizontalAlignment('center')
    .setWrap(true)
    .setFontColor(budgetRemaining >= 0 ? '#2e7d32' : '#d32f2f');
 
  currentRow = kpiRow + 3;
 
  // ═══════════════════════════════════════
  // SPENDING BY CATEGORY TABLE
  // ═══════════════════════════════════════
  dash.getRange(currentRow, 1, 1, 7).merge();
  dash.getRange(currentRow, 1).setValue('Spending by Category');
  dash.getRange(currentRow, 1)
    .setFontSize(13)
    .setFontWeight('bold')
    .setFontColor('#1a1f36');
  currentRow++;
 
  // Column headers
  dash.getRange(currentRow, 1, 1, 7).setValues([[
    'Category', 'Spent', 'Budget', 'Remaining', '% Used', '% of Total', ''
  ]]);
  dash.getRange(currentRow, 1, 1, 7)
    .setBackground('#1a1f36')
    .setFontColor('white')
    .setFontWeight('bold')
    .setFontSize(10);
  currentRow++;
 
  // Data rows
  var tableStartRow = currentRow;
  sortedCategories.forEach(function(cat, idx) {
    var spent     = categoryTotals[cat];
    var budget    = budgets[cat] || 0;
    var remaining = budget - spent;
    var pctUsed   = budget > 0 ? (spent / budget * 100) : 0;
    var pctTotal  = totalSpending > 0 ? (spent / totalSpending * 100) : 0;
 
    dash.getRange(currentRow, 1, 1, 7).setValues([[
      cat,
      spent,
      budget,
      remaining,
      pctUsed > 0 ? pctUsed / 100 : 0,
      pctTotal / 100,
      ''
    ]]);
 
    // Formatting
    var bg = idx % 2 === 0 ? '#ffffff' : '#f0f2f5';
    dash.getRange(currentRow, 1, 1, 7).setBackground(bg);
    dash.getRange(currentRow, 2, 1, 3).setNumberFormat('$#,##0.00');
    dash.getRange(currentRow, 5, 1, 2).setNumberFormat('0.0%');
 
    // Color the remaining column
    if (remaining < 0) {
      dash.getRange(currentRow, 4).setFontColor('#d32f2f').setFontWeight('bold');
    } else {
      dash.getRange(currentRow, 4).setFontColor('#2e7d32');
    }
 
    // Color bar indicator in col 1
    var color = catColors[cat] || '#607d8b';
    dash.getRange(currentRow, 1).setFontColor(color).setFontWeight('bold');
 
    currentRow++;
  });
 
  // Totals row
  dash.getRange(currentRow, 1, 1, 7).setValues([[
    'TOTAL', totalSpending, totalBudget, totalBudget - totalSpending, 
    totalBudget > 0 ? totalSpending / totalBudget : 0, 1, ''
  ]]);
  dash.getRange(currentRow, 1, 1, 7)
    .setBackground('#1a1f36')
    .setFontColor('white')
    .setFontWeight('bold');
  dash.getRange(currentRow, 2, 1, 3).setNumberFormat('$#,##0.00');
  dash.getRange(currentRow, 5, 1, 2).setNumberFormat('0.0%');
  var tableEndRow = currentRow;
  currentRow += 2;
 
  // ═══════════════════════════════════════
  // DONUT CHART — Spending by Category
  // ═══════════════════════════════════════
  var chartDataStart = tableStartRow;
  var chartDataEnd   = tableEndRow - 1; // exclude totals row
 
  var chart = dash.newChart()
    .setChartType(Charts.ChartType.PIE)
    .addRange(dash.getRange(chartDataStart, 1, chartDataEnd - chartDataStart + 1, 1))  // categories
    .addRange(dash.getRange(chartDataStart, 2, chartDataEnd - chartDataStart + 1, 1))  // amounts
    .setPosition(tableStartRow, 8, 0, 0) // place to the right of the table
    .setOption('title', 'Spending by Category')
    .setOption('pieHole', 0.4)
    .setOption('legend', { position: 'right', textStyle: { fontSize: 10 } })
    .setOption('chartArea', { width: '80%', height: '80%' })
    .setOption('width', 420)
    .setOption('height', 300)
    .setOption('backgroundColor', '#f8f9fa')
    .build();
 
  dash.insertChart(chart);
 
  // ═══════════════════════════════════════
  // COLUMN WIDTHS
  // ═══════════════════════════════════════
  dash.setColumnWidth(1, 200);
  dash.setColumnWidth(2, 100);
  dash.setColumnWidth(3, 100);
  dash.setColumnWidth(4, 110);
  dash.setColumnWidth(5, 80);
  dash.setColumnWidth(6, 90);
  dash.setColumnWidth(7, 10); // thin spacer
 
  // Freeze header
  dash.setFrozenRows(2);
 
  Logger.log('✅ Dashboard updated for ' + monthName);
}
