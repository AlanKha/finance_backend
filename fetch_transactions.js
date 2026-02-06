require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Stripe = require('stripe');

const stripeEnv = process.env.stripe_env || 'sandbox';
const stripe_secret_key = process.env[`stripe_${stripeEnv}_secret_key`];

if (!stripe_secret_key) {
  console.error(`Missing stripe_${stripeEnv}_secret_key in .env`);
  process.exit(1);
}

console.log(`Stripe mode: ${stripeEnv}`);
const stripe = new Stripe(stripe_secret_key);
const DATA_DIR = path.join(__dirname, 'data');
const ACCOUNT_FILE = path.join(DATA_DIR, 'linked_account.json');
const TX_FILE = path.join(DATA_DIR, 'transactions.json');

function loadLocal() {
  try {
    return JSON.parse(fs.readFileSync(TX_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveLocal(transactions) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(TX_FILE, JSON.stringify(transactions, null, 2));
}

function accountLabel(acct) {
  return [acct.institution, acct.display_name, acct.last4 ? `****${acct.last4}` : null]
    .filter(Boolean)
    .join(' ') || acct.id;
}

function printTable(transactions) {
  if (transactions.length === 0) {
    console.log('No transactions found.');
    return;
  }

  const header = 'DATE        | AMOUNT     | STATUS  | ACCOUNT                      | DESCRIPTION';
  const divider = '-'.repeat(header.length);
  console.log(header);
  console.log(divider);

  for (const tx of transactions) {
    const date = new Date(tx.transacted_at * 1000).toISOString().slice(0, 10);
    const dollars = Math.abs(tx.amount) / 100;
    const sign = tx.amount < 0 ? '-$' : '+$';
    const amount = `${sign}${dollars.toFixed(2)}`.padStart(10);
    const statusStr = (tx.status || '').padEnd(7);
    const acctStr = (tx.account_label || tx.account_id || '').padEnd(28);
    const desc = tx.description || '';
    console.log(`${date}  | ${amount} | ${statusStr} | ${acctStr} | ${desc}`);
  }

  console.log(`\n${transactions.length} transaction(s)`);
}

async function refreshAccount(accountId) {
  await stripe.financialConnections.accounts.refresh(accountId, {
    features: ['transactions'],
  });

  const MAX_ATTEMPTS = 30;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const account = await stripe.financialConnections.accounts.retrieve(accountId);
    const status = account.transaction_refresh?.status;

    if (status === 'succeeded') return;
    if (status === 'failed') throw new Error('Transaction refresh failed');
    if (i === MAX_ATTEMPTS - 1) throw new Error('Refresh timed out after 60s');

    await new Promise((r) => setTimeout(r, 2000));
  }
}

async function fetchTransactions(accountId) {
  const txs = [];
  let startingAfter;

  while (true) {
    const params = { account: accountId, limit: 100 };
    if (startingAfter) params.starting_after = startingAfter;

    const page = await stripe.financialConnections.transactions.list(params);
    txs.push(...page.data);

    if (!page.has_more) break;
    startingAfter = page.data[page.data.length - 1].id;
  }

  return txs;
}

async function main() {
  const args = process.argv.slice(2);
  const fetchAll = args.includes('--all');
  const displayName = args.filter((a) => a !== '--all').join(' ').trim();

  if (!fetchAll && !displayName) {
    console.error('Usage: bun run fetch <display_name>');
    console.error('       bun run fetch --all');
    process.exit(1);
  }

  // Load linked accounts
  let accountData;
  try {
    accountData = JSON.parse(fs.readFileSync(ACCOUNT_FILE, 'utf8'));
  } catch {
    console.error('No linked accounts found. Run `bun run link` first.');
    process.exit(1);
  }

  let accounts = accountData.accounts || [];
  if (accounts.length === 0) {
    console.error('No linked accounts found. Run `bun run link` first.');
    process.exit(1);
  }

  if (displayName) {
    const match = accounts.filter(
      (a) => a.display_name && a.display_name.toLowerCase() === displayName.toLowerCase()
    );
    if (match.length === 0) {
      console.error(`No account found with display_name "${displayName}".`);
      console.error('Available accounts:');
      for (const a of accounts) {
        console.error(`  - ${a.display_name || '(no name)'} [${accountLabel(a)}]`);
      }
      process.exit(1);
    }
    accounts = match;
  }

  // Load existing local transactions
  const existing = loadLocal();
  const knownIds = new Set(existing.map((tx) => tx.id));
  console.log(`Local store: ${existing.length} transaction(s)`);
  console.log(`Fetching ${accounts.length} account(s)\n`);

  const newTxs = [];

  for (const acct of accounts) {
    const label = accountLabel(acct);
    console.log(`[${label}] Refreshing...`);

    try {
      await refreshAccount(acct.id);
    } catch (err) {
      console.error(`[${label}] Refresh failed: ${err.message}, skipping.`);
      continue;
    }

    console.log(`[${label}] Fetching transactions...`);

    try {
      const txs = await fetchTransactions(acct.id);
      let added = 0;
      for (const tx of txs) {
        if (!knownIds.has(tx.id)) {
          tx.account_id = acct.id;
          tx.account_label = label;
          newTxs.push(tx);
          knownIds.add(tx.id);
          added++;
        }
      }
      console.log(`[${label}] ${added} new, ${txs.length} total from Stripe.`);
    } catch (err) {
      console.error(`[${label}] Fetch failed: ${err.message}, skipping.`);
      continue;
    }
  }

  // Append new transactions, sort, and save
  const all = [...existing, ...newTxs];
  all.sort((a, b) => b.transacted_at - a.transacted_at);
  saveLocal(all);

  console.log(`\n${newTxs.length} new transaction(s), ${all.length} total stored locally.\n`);

  if (displayName) {
    const accountIds = new Set(accounts.map((a) => a.id));
    printTable(all.filter((tx) => accountIds.has(tx.account_id)));
  } else {
    printTable(all);
  }
}

main();
