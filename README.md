# finance_backend

Pulls bank transactions via Plaid with automatic categorization (`personal_finance_category`). Two modes: a one-time local server to link bank accounts through Plaid Link, and a CLI script to sync and dump transactions on demand. Supports multiple accounts -- each transaction is tagged with the account it came from and its spending category.

Designed to be run weekly by an automated agent (e.g. OpenClaw) after the initial account link.

## How it works

1. **`link_server.js`** starts an Express server on port 3000 that serves a single-page frontend. Clicking "Connect Bank Account" opens Plaid Link, which walks you through bank login. On success, the server exchanges the public token for an access token and saves the linked account (with name, mask, type) to `data/linked_account.json`. You can link multiple accounts by clicking the button again.

2. **`fetch_transactions.js`** loops over every linked account, uses Plaid's `/transactions/sync` endpoint (cursor-based incremental fetching) to pull new/modified/removed transactions, and updates the local store at `data/transactions.json`. Each transaction includes `personal_finance_category` for budgeting. The full history is printed as a table sorted by date descending.

## Setup

```bash
npm install
```

Create a `.env` file with your Plaid keys:

```bash
plaid_client_id=...
plaid_sandbox_secret=...
plaid_production_secret=...
plaid_env=sandbox
```

Set `plaid_env` to `sandbox` or `production`. The correct secret is selected automatically.

## Usage

### Link bank accounts

```bash
npm run link
```

Open <http://localhost:3000>, click "Connect Bank Account", complete the flow. In sandbox, use test credentials (`user_good` / `pass_good`). Repeat for each account you want to link. Ctrl+C when done. Accounts are stored in `data/linked_account.json`.

### Fetch transactions

```bash
npm run fetch
```

Output:

```bash
Local store: 0 transaction(s)
Linked accounts: 1

[Plaid Checking 0000] Syncing...
[Plaid Checking 0000] +12 added, 0 modified, 0 removed from Plaid.

12 added, 0 modified, 0 removed. 12 total stored locally.

DATE        | AMOUNT     | CATEGORY              | ACCOUNT              | DESCRIPTION
-------------------------------------------------------------------------------------
2026-02-05  |    -$12.50 | FOOD_AND_DRINK        | Plaid Checking 0000  | Whole Foods
2026-02-04  |   +$500.00 | INCOME                | Plaid Checking 0000  | Direct Deposit
2026-02-03  |    -$45.00 | GENERAL_MERCHANDISE   | Plaid Checking 0000  | Amazon

12 transaction(s)
```

Subsequent runs use cursor-based sync -- only new/modified transactions are fetched, no duplicates.

### Weekly automation (OpenClaw)

After the initial link, the only command needed on a schedule is:

```bash
node fetch_transactions.js
```

It reads credentials from `.env` and linked accounts from `data/linked_account.json`, syncs each account incrementally via cursor, updates the local store at `data/transactions.json`, and prints them to stdout. If one account fails to sync, it logs the error and continues with the rest. Exit code 0 on success, 1 if no accounts are linked.

If an account becomes stale or disconnected, re-run `npm run link` to re-link.

## File structure

```bash
.env                         # Plaid API keys (gitignored)
link_server.js               # Express server for account linking via Plaid Link
public/index.html            # Frontend with Plaid Link SDK
fetch_transactions.js        # CLI script to sync + print transactions
data/linked_account.json     # Linked accounts with access tokens and cursors (gitignored)
data/transactions.json       # Local transaction store (gitignored)
```
