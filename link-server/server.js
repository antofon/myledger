const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

// Credentials come from .env (copy .env.example). Start with: node --env-file=.env server.js
const CLIENT_ID = process.env.PLAID_CLIENT_ID;
const SECRET = process.env.PLAID_SECRET;
const PLAID_ENV = process.env.PLAID_ENV || 'sandbox';
const PLAID_BASE = `https://${PLAID_ENV}.plaid.com`;
const PORT = process.env.PORT || 3000;

if (!CLIENT_ID || !SECRET) {
  console.error('Missing PLAID_CLIENT_ID or PLAID_SECRET. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

// Create link token
app.post('/create-link-token', async (req, res) => {
  try {
    const response = await fetch(`${PLAID_BASE}/link/token/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        secret: SECRET,
        client_name: 'My Finance Tracker',
        country_codes: ['US'],
        language: 'en',
        user: { client_user_id: 'user-finance-tracker' },
        products: ['transactions']
      })
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Exchange public token for access token
app.post('/exchange-token', async (req, res) => {
  try {
    const response = await fetch(`${PLAID_BASE}/item/public_token/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        secret: SECRET,
        public_token: req.body.public_token
      })
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT} (Plaid ${PLAID_ENV})`);
  console.log(`   Open http://localhost:${PORT}/plaid_link.html in Chrome`);
});
