require('dotenv').config();
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

const DATA_DIR = path.join(__dirname, 'data');
const ACCOUNT_FILE = path.join(DATA_DIR, 'linked_account.json');
const TX_FILE = path.join(DATA_DIR, 'transactions.json');

function loadTransactions() {
  try {
    return JSON.parse(fs.readFileSync(TX_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveTransactions(transactions) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(TX_FILE, JSON.stringify(transactions, null, 2));
}

function loadAccounts() {
  try {
    return JSON.parse(fs.readFileSync(ACCOUNT_FILE, 'utf8'));
  } catch {
    return { accounts: [] };
  }
}

function saveAccounts(data) {
  fs.writeFileSync(ACCOUNT_FILE, JSON.stringify(data, null, 2));
}

function accountLabel(acct) {
  return [acct.name, acct.mask ? acct.mask : null]
    .filter(Boolean)
    .join(' ') || acct.account_id;
}

function formatAmount(amount) {
  // Plaid: positive = money out (debit), negative = money in (credit)
  const sign = amount > 0 ? '-$' : '+$';
  return `${sign}${Math.abs(amount).toFixed(2)}`;
}

function printTable(transactions) {
  if (transactions.length === 0) {
    console.log('No transactions found.');
    return;
  }

  const header = 'DATE        | AMOUNT     | CATEGORY              | ACCOUNT              | DESCRIPTION';
  const divider = '-'.repeat(header.length);
  console.log(header);
  console.log(divider);

  for (const tx of transactions) {
    const date = tx.date;
    const amount = formatAmount(tx.amount).padStart(10);
    const category = (tx.personal_finance_category?.primary || '').padEnd(21);
    const acct = (tx.account_label || '').padEnd(20);
    const desc = tx.merchant_name || tx.name || '';
    console.log(`${date}  | ${amount} | ${category} | ${acct} | ${desc}`);
  }

  console.log(`\n${transactions.length} transaction(s)`);
}

async function syncAccount(accessToken, cursor) {
  const added = [];
  const modified = [];
  const removed = [];
  let nextCursor = cursor || '';
  let hasMore = true;

  while (hasMore) {
    const response = await plaidClient.transactionsSync({
      access_token: accessToken,
      cursor: nextCursor,
    });
    const data = response.data;

    added.push(...data.added);
    modified.push(...data.modified);
    removed.push(...data.removed);

    hasMore = data.has_more;
    nextCursor = data.next_cursor;
  }

  return { added, modified, removed, cursor: nextCursor };
}

async function main() {
  const accountData = loadAccounts();
  const accounts = accountData.accounts || [];

  if (accounts.length === 0) {
    console.error('No linked accounts found. Run `npm run link` first.');
    process.exit(1);
  }

  let transactions = loadTransactions();
  const txById = new Map(transactions.map((tx) => [tx.transaction_id, tx]));

  console.log(`Local store: ${transactions.length} transaction(s)`);
  console.log(`Linked accounts: ${accounts.length}\n`);

  // Group accounts by access_token (one Plaid Item can have multiple accounts)
  const byToken = new Map();
  for (const acct of accounts) {
    if (!byToken.has(acct.access_token)) {
      byToken.set(acct.access_token, { accounts: [], cursor: acct.cursor || '' });
    }
    byToken.get(acct.access_token).accounts.push(acct);
  }

  const linkedAccountIds = new Set(accounts.map((a) => a.account_id));
  let totalAdded = 0;
  let totalModified = 0;
  let totalRemoved = 0;

  for (const [accessToken, group] of byToken) {
    const labels = group.accounts.map(accountLabel).join(', ');
    console.log(`[${labels}] Syncing...`);

    try {
      const result = await syncAccount(accessToken, group.cursor);

      // Process added
      for (const tx of result.added) {
        if (!linkedAccountIds.has(tx.account_id)) continue;
        if (txById.has(tx.transaction_id)) continue;

        const acct = accounts.find((a) => a.account_id === tx.account_id);
        const stored = {
          transaction_id: tx.transaction_id,
          account_id: tx.account_id,
          date: tx.date,
          amount: tx.amount,
          name: tx.name,
          merchant_name: tx.merchant_name,
          personal_finance_category: tx.personal_finance_category || null,
          pending: tx.pending,
          account_label: acct ? accountLabel(acct) : tx.account_id,
        };
        txById.set(tx.transaction_id, stored);
        totalAdded++;
      }

      // Process modified
      for (const tx of result.modified) {
        if (!txById.has(tx.transaction_id)) continue;
        const existing = txById.get(tx.transaction_id);
        existing.date = tx.date;
        existing.amount = tx.amount;
        existing.name = tx.name;
        existing.merchant_name = tx.merchant_name;
        existing.personal_finance_category = tx.personal_finance_category || null;
        existing.pending = tx.pending;
        totalModified++;
      }

      // Process removed
      for (const tx of result.removed) {
        if (txById.delete(tx.transaction_id)) totalRemoved++;
      }

      // Save cursor back to all accounts sharing this access_token
      for (const acct of group.accounts) {
        acct.cursor = result.cursor;
      }

      console.log(`[${labels}] +${result.added.length} added, ${result.modified.length} modified, ${result.removed.length} removed from Plaid.`);
    } catch (err) {
      console.error(`[${labels}] Sync failed: ${err.response?.data?.error_message || err.message}, skipping.`);
      continue;
    }
  }

  // Save updated cursors
  saveAccounts(accountData);

  // Sort by date descending and save
  transactions = Array.from(txById.values());
  transactions.sort((a, b) => b.date.localeCompare(a.date));
  saveTransactions(transactions);

  console.log(`\n${totalAdded} added, ${totalModified} modified, ${totalRemoved} removed. ${transactions.length} total stored locally.\n`);
  printTable(transactions);
}

main();
