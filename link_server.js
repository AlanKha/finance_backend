require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');

const { plaid_client_id, plaid_sandbox_secret, plaid_production_secret, plaid_env } = process.env;

if (!plaid_client_id) {
  console.error('Missing plaid_client_id in .env');
  process.exit(1);
}

const secret = plaid_env === 'production' ? plaid_production_secret : plaid_sandbox_secret;

if (!secret) {
  console.error(`Missing plaid_${plaid_env || 'sandbox'}_secret in .env`);
  process.exit(1);
}

const config = new Configuration({
  basePath: PlaidEnvironments[plaid_env || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': plaid_client_id,
      'PLAID-SECRET': secret,
      'Plaid-Version': '2020-09-14',
    },
  },
});
const plaidClient = new PlaidApi(config);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'linked_account.json');

function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return { accounts: [] };
  }
}

function writeData(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

app.post('/create-link-token', async (_req, res) => {
  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: 'user-1' },
      client_name: 'Finance Backend',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en',
    });
    res.json({ link_token: response.data.link_token });
  } catch (err) {
    console.error('Error creating link token:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.error_message || err.message });
  }
});

app.post('/exchange-token', async (req, res) => {
  try {
    const { public_token, accounts: metadataAccounts } = req.body;
    if (!public_token) {
      return res.status(400).json({ error: 'public_token is required' });
    }

    const exchangeResponse = await plaidClient.itemPublicTokenExchange({ public_token });
    const { access_token, item_id } = exchangeResponse.data;

    const data = readData();

    for (const acct of (metadataAccounts || [])) {
      if (data.accounts.some((a) => a.account_id === acct.id)) continue;

      data.accounts.push({
        access_token,
        item_id,
        account_id: acct.id,
        name: acct.name || null,
        mask: acct.mask || null,
        type: acct.type || null,
        subtype: acct.subtype || null,
        linked_at: new Date().toISOString(),
      });
    }

    writeData(data);
    res.json({ success: true });
  } catch (err) {
    console.error('Error exchanging token:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.error_message || err.message });
  }
});

app.listen(3000, () => {
  console.log('Link server running at http://localhost:3000');
});
