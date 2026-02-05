require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Stripe = require('stripe');

const { stripe_secret_key } = process.env;

if (!stripe_secret_key) {
  console.error('Missing stripe_secret_key in .env');
  process.exit(1);
}

const stripe = new Stripe(stripe_secret_key);
const DATA_FILE = path.join(__dirname, 'data', 'linked_account.json');

async function main() {
  // Load linked account
  let data;
  try {
    data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    console.error('No linked account found. Run `npm run link` first.');
    process.exit(1);
  }

  const { fca_account_id } = data;
  if (!fca_account_id) {
    console.error('No linked account found. Run `npm run link` first.');
    process.exit(1);
  }

  // Step A: Refresh transactions
  console.log('Refreshing transactions...');
  try {
    await stripe.financialConnections.accounts.refresh(fca_account_id, {
      features: ['transactions'],
    });
  } catch (err) {
    console.error('Refresh failed:', err.message);
    process.exit(1);
  }

  // Step B: Poll for completion
  console.log('Waiting for refresh to complete...');
  const MAX_ATTEMPTS = 30;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    try {
      const account = await stripe.financialConnections.accounts.retrieve(fca_account_id);
      const status = account.transaction_refresh?.status;

      if (status === 'succeeded') {
        console.log('Refresh complete.');
        break;
      }
      if (status === 'failed') {
        console.error('Transaction refresh failed.');
        process.exit(1);
      }
      if (i === MAX_ATTEMPTS - 1) {
        console.error('Refresh timed out after 60s.');
        process.exit(1);
      }
    } catch (err) {
      console.error('Poll error:', err.message);
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  // Step C: List transactions with pagination
  console.log('Fetching transactions...\n');
  const transactions = [];
  let startingAfter;

  try {
    while (true) {
      const params = { account: fca_account_id, limit: 100 };
      if (startingAfter) params.starting_after = startingAfter;

      const page = await stripe.financialConnections.transactions.list(params);
      transactions.push(...page.data);

      if (!page.has_more) break;
      startingAfter = page.data[page.data.length - 1].id;
    }
  } catch (err) {
    console.error('Failed to list transactions:', err.message);
    process.exit(1);
  }

  if (transactions.length === 0) {
    console.log('No transactions found.');
    return;
  }

  // Sort by transacted_at descending
  transactions.sort((a, b) => b.transacted_at - a.transacted_at);

  // Format and print table
  const header = 'DATE        | AMOUNT     | STATUS  | DESCRIPTION';
  const divider = '-'.repeat(header.length);
  console.log(header);
  console.log(divider);

  for (const tx of transactions) {
    const date = new Date(tx.transacted_at * 1000).toISOString().slice(0, 10);
    const dollars = Math.abs(tx.amount) / 100;
    const sign = tx.amount < 0 ? '-$' : '+$';
    const amount = `${sign}${dollars.toFixed(2)}`.padStart(10);
    const statusStr = (tx.status || '').padEnd(7);
    const desc = tx.description || '';
    console.log(`${date}  | ${amount} | ${statusStr} | ${desc}`);
  }

  console.log(`\n${transactions.length} transaction(s)`);
}

main();
