# Sheet schema

The workbook has six tabs. Four are set up by hand with the headers below; `Dashboard` and the monthly budget tab (`Mar_2026`) are created by the script.

Two dropdowns are applied by the script:

- **My_Category**: Groceries, Guilt-Free Spending, Subscriptions, Debt, Health, Travel, Gifts, Miscellaneous Expenses, Household, Paycheck, Transfer, Investments
- **Mine_Family**: Mine, Family, Split

---

## Plaid_Transactions

Written by `runFetch`, one row per posted transaction, re-sorted newest first after every write.

| Col | Column | Type | Description |
|---|---|---|---|
| A | Date | date (yyyy-MM-dd) | Plaid `date` |
| B | Merchant | text | `original_description`, else `merchant_name`, else `name` |
| C | Amount | number | Plaid amount, positive = money out. Paycheck rows are flipped to positive |
| D | My_Category | dropdown | Result of `mapCategory`, editable by hand |
| E | Plaid_Category | text | Plaid's legacy `category` path joined with ` > ` |
| F | Account | text | `BANK1` to `BANK4`, from the Script Property the token came from |
| G | Plaid_ID | text | Plaid `transaction_id`, used for deduplication |
| H | Mine_Family | dropdown | Defaults to `Mine` |
| I | Split_Pct | text | Blank by default, filled by hand for `Split` rows. Shown on Weekly_View, not used in totals |
| J | Notes | text | Blank by default, filled by hand |

## Manual_Transactions

Filled by hand for cash and anything Plaid can't see. The script doesn't read this tab; `setup_new_month` clears it.

| Col | Column | Type | Description |
|---|---|---|---|
| A | Date | date | Transaction date |
| B | Description | text | What it was |
| C | Amount | number | Positive = money out |
| D | My_Category | dropdown | Budget category |
| E | Account | text | Where the money came from |
| F | Mine_Family | dropdown | Mine, Family or Split |
| G | Receipt / Note | text | Free text |
| H | Reconciled | text | Manual reconciliation flag |

## All_Transactions

A sorted view of `Plaid_Transactions`, built by a formula in `A2`:

```
=QUERY(Plaid_Transactions!A2:J, "select A,B,C,D,F,H,I,J where A is not null order by A desc", 0)
```

The row 1 headers were laid out for a planned merge of Plaid and manual rows (`Source` = Plaid or Manual). The query only reads `Plaid_Transactions` and returns 8 columns, so the last headers don't line up yet:

| Col | Header | What the query puts there |
|---|---|---|
| A | Date | Date |
| B | Description | Merchant |
| C | Amount | Amount |
| D | My_Category | My_Category |
| E | Account | Account |
| F | Mine_Family | Mine_Family |
| G | Source | Split_Pct (mismatch) |
| H | Transaction ID | Notes (mismatch) |
| I | Month | nothing |

## Weekly_View

Rebuilt by `updateWeeklyView` from row 2 down on every run (row 1 holds headers from an earlier layout that the script doesn't write). For each Sunday to Saturday week, oldest week first:

| Row | Contents |
|---|---|
| Week header | `Week of Mar 8, 2026`, merged across 9 columns |
| Column header | Date, Merchant, Amount, Category, Account, Mine/Family, Split%, Notes, Source |
| Transactions | One row per transaction in the week, oldest first. Source is always `Plaid` |
| Category Breakdown | One row per spending category with its weekly total, largest first |
| Total | Week label, total spent, and Paycheck income if there was any |
| Spacer | Blank row |

Paycheck, Transfer and Investments rows are listed but left out of the breakdown and the total.

## Dashboard

Created by `updateDashboard` on first run (moved to the first tab position) and fully rebuilt every run:

- Title with the current month, plus a last-updated line with the transaction count
- KPI cards: Total Spent, Total Income, Net, Budget Left
- Spending by Category table: Category, Spent, Budget, Remaining, % Used, % of Total, and a TOTAL row
- Donut chart of spending by category

Totals cover every row currently in `Plaid_Transactions`.

## Mar_2026 (monthly budget tab)

Created by `setupBudgetTemplate`, filled by `updateBudgetSheet`.

| Col | Column | Description |
|---|---|---|
| A | Category | Category name on header rows, merchant on transaction rows |
| B | Budget | Monthly target (category header rows) |
| C | Actual | Spent so far, written by the script |
| D | Remaining | Budget minus Actual, red when negative |
| E | Amount | Transaction amount |
| F | Account | `BANK1 CC`, `BANK2 CC`, `BANK3 Checking`, `BANK4 Savings` |
| G | Date | Transaction date |
| H | Week | Week of the month (`Week 1` to `Week 5`) |
| I | Notes | `plaid:<transaction_id>`, used for deduplication |

Layout, top to bottom:

1. **SPENDING**: one section per spending category (header row with Budget / Actual / Remaining, a sub-header, then its transactions)
2. **SPENDING SUMMARY**: Total Budget, Total Actual, Total Remaining
3. **INCOME**: Work Income, Projected Additional Income, Actual Additional Income, Projected Income, Actual Income
4. **TAKE HOME**: Projected Take Home, Actual Take Home

The budget targets and income figures in this repo are round example numbers.
