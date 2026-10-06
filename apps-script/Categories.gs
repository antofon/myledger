// Categories.gs: transaction -> budget category rules and sign normalization

// ─────────────────────────────────────────
// CATEGORY MAPPING
// ─────────────────────────────────────────
/**
 * Maps a transaction to one of the 12 budget categories with ordered
 * substring rules. First match wins, so rule order matters.
 * @param {string} plaidCategory Plaid's legacy category path, joined with ' > '
 * @param {string} merchantName Plaid's enriched merchant_name
 * @param {string} txName Plaid's transaction name, used as a fallback
 * @return {string} budget category
 */
function mapCategory(plaidCategory, merchantName, txName) {
  // Representative examples. Extend with your own merchant patterns.
  const merchant = (merchantName || txName || '').toLowerCase();
  const category = (plaidCategory || '').toLowerCase();

  // ── PAYCHECK / INCOME ──
  if (merchant.includes('payroll') ||
      merchant.includes('adp') || merchant.includes('gusto') ||
      merchant.includes('direct dep') || merchant.includes('paycheck') ||
      txName && txName.toLowerCase().includes('des:payroll')) {
    return 'Paycheck';
  }

  // ── TRANSFERS (internal moves between accounts) ──
  if (merchant.includes('zelle') || merchant.includes('transfer') ||
    merchant.includes('from savings') || merchant.includes('to checking') ||
    merchant.includes('from checking') || merchant.includes('to savings') ||
    merchant.includes('external transfer') || merchant.includes('ach transfer') ||
    merchant.includes('vault') ||
    category.includes('transfer')) {
  return 'Transfer';
}

  // ── GROCERIES ──
  if (merchant.includes('instacart') || merchant.includes('walmart') ||
      merchant.includes('whole foods') || merchant.includes('wholefoods') ||
      merchant.includes('target') || merchant.includes('kroger') ||
      merchant.includes('trader joe') || merchant.includes('costco') ||
      merchant.includes('sam\'s club') || merchant.includes('aldi') ||
      merchant.includes('grocery') || merchant.includes('supermarket')) {
    return 'Groceries';
  }

  // ── GUILT-FREE SPENDING (restaurants, fast food, takeout) ──
  if (merchant.includes('uber eats') || merchant.includes('doordash') ||
      merchant.includes('grubhub') || merchant.includes('postmates') ||
      merchant.includes('domino') || merchant.includes('pizza') ||
      merchant.includes('chick-fil-a') || merchant.includes('chik-fil-a') ||
      merchant.includes('chickfila') || merchant.includes('wingstop') ||
      merchant.includes('wing stop') || merchant.includes('panda express') ||
      merchant.includes('chipotle') || merchant.includes('mcdonald') ||
      merchant.includes('starbucks') || merchant.includes('taco bell') ||
      merchant.includes('taco') || merchant.includes('burger king') ||
      merchant.includes('wendy') || merchant.includes('subway') ||
      merchant.includes('panera') || merchant.includes('olive garden') ||
      merchant.includes('applebee') || merchant.includes('chili\'s') ||
      merchant.includes('denny') || merchant.includes('ihop') ||
      merchant.includes('five guys') || merchant.includes('shake shack') ||
      merchant.includes('raising cane') || merchant.includes('cane\'s') ||
      merchant.includes('popeye') || merchant.includes('kfc') ||
      merchant.includes('sonic') || merchant.includes('boba') ||
      merchant.includes('coffee') || merchant.includes('cafe') ||
      merchant.includes('smoothie') ||
      merchant.includes('restaurant') || merchant.includes('grill') ||
      merchant.includes('sushi') || merchant.includes('ramen') ||
      merchant.includes('bbq') || merchant.includes('wings')) {
    return 'Guilt-Free Spending';
  }

  // ── SUBSCRIPTIONS ──
  if (merchant.includes('spotify') || merchant.includes('netflix') ||
      merchant.includes('hulu') || merchant.includes('disney') ||
      merchant.includes('youtube') || merchant.includes('amazon prime') ||
      merchant.includes('apple.com/bill') || merchant.includes('icloud') ||
      merchant.includes('google one') || merchant.includes('adobe') ||
      merchant.includes('microsoft 365') || merchant.includes('dropbox')) {
    return 'Subscriptions';
  }

  // ── DEBT PAYMENTS ──
  if (merchant.includes('loan payment') || merchant.includes('student loan') ||
      merchant.includes('auto loan') || merchant.includes('credit card payment') ||
      merchant.includes('bill pay') ||
      category.includes('loan') || category.includes('credit card payment')) {
    return 'Debt';
  }

  // ── HEALTH ──
  if (merchant.includes('cvs') || merchant.includes('walgreen') ||
      merchant.includes('rite aid') || merchant.includes('pharmacy') ||
      merchant.includes('doctor') || merchant.includes('clinic') ||
      merchant.includes('hospital') || merchant.includes('dental') ||
      merchant.includes('vision') || merchant.includes('optician') ||
      merchant.includes('health') || merchant.includes('medical') ||
      category.includes('medical') || category.includes('pharmacy')) {
    return 'Health';
  }

  // ── GAS / FUEL ──
  if (merchant.includes('shell') || merchant.includes('chevron') ||
      merchant.includes('exxon') || merchant.includes('mobil') ||
      merchant.includes('bp ') || merchant.includes('arco') ||
      merchant.includes('76 ') || merchant.includes('valero') ||
      merchant.includes('circle k') || merchant.includes('fuel') ||
      (merchant.includes('gas') && !merchant.includes('gas station') === false)) {
    return 'Miscellaneous Expenses';
  }

  // ── TRAVEL ──
  if (merchant.includes('united airlines') || merchant.includes('delta') ||
      merchant.includes('southwest') || merchant.includes('american airlines') ||
      merchant.includes('jetblue') || merchant.includes('spirit airlines') ||
      merchant.includes('hotel') || merchant.includes('marriott') ||
      merchant.includes('hilton') || merchant.includes('airbnb') ||
      merchant.includes('expedia') || merchant.includes('kayak') ||
      merchant.includes('lyft') || merchant.includes('uber') ||
      category.includes('travel') || category.includes('airline') ||
      category.includes('hotel') || category.includes('lodging')) {
    return 'Travel';
  }

  // ── HOUSEHOLD ──
  if (merchant.includes('rent') || merchant.includes('hoa') ||
      merchant.includes('electric') || merchant.includes('water bill') ||
      merchant.includes('internet') || merchant.includes('at&t') ||
      merchant.includes('verizon') || merchant.includes('t-mobile') ||
      category.includes('utilities')) {
    return 'Household';
  }

  // ── GIFTS ──
  if (category.includes('gift') || merchant.includes('etsy') ||
      merchant.includes('1-800-flowers') || merchant.includes('hallmark')) {
    return 'Gifts';
  }

  // ── INVESTMENTS ──
if (merchant.includes('robinhood') || merchant.includes('fidelity') ||
    merchant.includes('schwab') || merchant.includes('vanguard') ||
    merchant.includes('etrade') || merchant.includes('webull') ||
    merchant.includes('coinbase') || merchant.includes('binance') ||
    merchant.includes('sofi invest') || merchant.includes('acorns') ||
    merchant.includes('stash') || merchant.includes('m1 finance') ||
    category.includes('investment') || category.includes('brokerage') ||
    category.includes('stock') || category.includes('crypto')) {
  return 'Investments';
}

  return 'Miscellaneous Expenses';
}

// ─────────────────────────────────────────
// SIGN NORMALIZATION
// Plaid: positive = expense, negative = income/credit
// We flip so: positive = you spent, negative = you received
// ─────────────────────────────────────────
/**
 * Flips Paycheck amounts to positive. Plaid reports inflows as negative.
 * @param {number} amount Plaid amount (positive = money out)
 * @param {string} category result of mapCategory
 * @return {number}
 */
function normalizeAmount(amount, category) {
  // Paychecks and credits come in as negative from Plaid — flip to positive
  if (category === 'Paycheck') return Math.abs(amount);
  // Everything else stays as-is (positive = expense)
  return amount;
}
