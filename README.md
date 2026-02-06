# finance_backend

Pulls bank transactions via Stripe Financial Connections. Two modes: a one-time local server to link bank accounts through Stripe's modal, and a CLI script to refresh and dump transactions on demand. Supports multiple accounts -- each transaction is tagged with the account it came from.

Designed to be run weekly by an automated agent (e.g. OpenClaw) after the initial account link.

## How it works

1. **`link_server.js`** starts an Express server on port 3000 that serves a single-page frontend. Clicking "Connect Bank Account" opens Stripe's Financial Connections modal, which walks you through bank login. On success, the server creates a Stripe Customer (if one doesn't exist) and appends the linked account (with institution name, display name, last4) to `data/linked_account.json`. You can link multiple accounts by clicking the button again.

2. **`fetch_transactions.js`** loops over every linked account, refreshes transaction data from Stripe, and fetches all transactions. Only new transactions (by ID) are appended to the local store at `data/transactions.json`. Each transaction is tagged with `account_id` and `account_label` so you can tell which card/account it came from. The full history is printed as a table sorted by date descending.

## Setup

```bash
npm install
```

Create a `.env` file with your Stripe keys (lowercase):

```bash
stripe_publishable_key=pk_test_...
stripe_secret_key=sk_test_...
```

## Usage

### Link bank accounts

```bash
npm run link
```

Open <http://localhost:3000>, click "Connect Bank Account", complete the flow. Repeat for each account you want to link. Ctrl+C when done. Accounts are stored in `data/linked_account.json`.

### Fetch transactions

```bash
npm run fetch
```

Output:

```bash
Local store: 0 transaction(s)
Linked accounts: 2

[Chase Checking ****1234] Refreshing...
[Chase Checking ****1234] Fetching transactions...
[Chase Checking ****1234] 15 new, 15 total from Stripe.
[Amex Platinum ****5678] Refreshing...
[Amex Platinum ****5678] Fetching transactions...
[Amex Platinum ****5678] 8 new, 8 total from Stripe.

23 new transaction(s), 23 total stored locally.

DATE        | AMOUNT     | STATUS  | ACCOUNT                      | DESCRIPTION
---------------------------------------------------------------------------------
2026-02-05  |    -$12.50 | posted  | Chase Checking ****1234      | WHOLE FOODS MKT
2026-02-04  |   +$500.00 | posted  | Chase Checking ****1234      | DIRECT DEPOSIT
2026-02-03  |    -$45.00 | posted  | Amex Platinum ****5678       | AMAZON.COM

23 transaction(s)
```

### Weekly automation (OpenClaw)

After the initial link, the only command needed on a schedule is:

```bash
node fetch_transactions.js
```

It reads credentials from `.env` and linked accounts from `data/linked_account.json`, refreshes each account, appends any new transactions to the local store at `data/transactions.json`, and prints them to stdout. If one account fails to refresh, it logs the error and continues with the rest. Exit code 0 on success, 1 if no accounts are linked.

If an account becomes stale or disconnected, re-run `npm run link` to re-link.

## File structure

```bash
.env                         # Stripe API keys (gitignored)
link_server.js               # Express server for account linking
public/index.html            # Frontend with Stripe.js modal
fetch_transactions.js        # CLI script to refresh + print transactions
data/linked_account.json     # Linked accounts list (gitignored)
data/transactions.json       # Local transaction store (gitignored)
```
