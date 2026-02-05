# finance_backend

Pulls bank transactions via Stripe Financial Connections. Two modes: a one-time local server to link your bank account through Stripe's modal, and a CLI script to refresh and dump transactions on demand.

Designed to be run weekly by an automated agent (e.g. OpenClaw) after the initial account link.

## How it works

1. **`link_server.js`** starts an Express server on port 3000 that serves a single-page frontend. Clicking "Connect Bank Account" opens Stripe's Financial Connections modal, which walks you through bank login. On success, the server creates a Stripe Customer (if one doesn't exist), saves the `customer_id` and `fca_account_id` to `data/linked_account.json`, and attempts to subscribe to ongoing transaction refreshes.

2. **`fetch_transactions.js`** reads the saved account ID, tells Stripe to refresh transaction data, polls until the refresh completes (up to 60s), then fetches all transactions with pagination and prints them as a table sorted by date descending.

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

### Link a bank account (one-time)

```bash
npm run link
```

Open <http://localhost:3000>, click "Connect Bank Account", complete the flow, then Ctrl+C the server. This writes `data/linked_account.json` with the linked account ID.

### Fetch transactions

```bash
npm run fetch
```

Output:

```bash
Refreshing transactions...
Waiting for refresh to complete...
Refresh complete.
Fetching transactions...

DATE        | AMOUNT     | STATUS  | DESCRIPTION
-------------------------------------------------
2026-02-05  |    -$12.50 | posted  | WHOLE FOODS MKT
2026-02-04  |   +$500.00 | posted  | DIRECT DEPOSIT

2 transaction(s)
```

### Weekly automation (OpenClaw)

After the initial link, the only command needed on a schedule is:

```bash
node fetch_transactions.js
```

It reads credentials from `.env` and the linked account from `data/linked_account.json`, refreshes transactions from Stripe, and prints them to stdout. Exit code 0 on success, 1 on any failure.

If the linked account becomes stale or disconnected, re-run `npm run link` to re-link.

## File structure

```bash
.env                         # Stripe API keys (gitignored)
link_server.js               # Express server for account linking
public/index.html            # Frontend with Stripe.js modal
fetch_transactions.js        # CLI script to refresh + print transactions
data/linked_account.json     # Created at runtime (gitignored)
```
