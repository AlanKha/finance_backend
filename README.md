# finance_backend

Pulls bank transactions via Stripe Financial Connections, cleans them for personal finance tracking, and generates weekly spending breakdowns by category.

Designed to be run weekly by an automated agent (e.g. OpenClaw) after the initial account link.

## How it works

1. **`link_server.ts`** starts an Express server on port 3000 that serves a single-page frontend. Clicking "Connect Bank Account" opens Stripe's Financial Connections modal, which walks you through bank login. On success, the server creates a Stripe Customer (if one doesn't exist) and appends the linked account (with institution name, display name, last4) to `data/linked_account.json`. You can link multiple accounts by clicking the button again.

2. **`fetch_transactions.ts`** loops over every linked account, refreshes transaction data from Stripe, and fetches all transactions. Only new transactions (by ID) are appended to the local store at `data/transactions.json`. Each transaction is tagged with `account_id` and `account_label` so you can tell which card/account it came from.

3. **`clean_transactions.ts`** reads the raw transaction store, strips irrelevant Stripe metadata, normalizes dates, and categorizes each transaction by matching descriptions against regex rules in `category_rules.ts`. Outputs:
   - `data/transactions_clean.json` — all cleaned transactions
   - `data/category_summary.json` — totals per category
   - `data/weekly/<date>/` — per-week `transactions_clean.json` and `category_summary.json`, where `<date>` is the Sunday start of that week

## Setup

```bash
bun install
```

Create a `.env` file with your Stripe keys (lowercase):

```bash
stripe_publishable_key=pk_test_...
stripe_secret_key=sk_test_...
```

## Usage

### Link bank accounts

```bash
bun run link
```

Open <http://localhost:3000>, click "Connect Bank Account", complete the flow. Repeat for each account you want to link. Ctrl+C when done. Accounts are stored in `data/linked_account.json`.

### Fetch transactions

```bash
bun run fetch --all
bun run fetch <display_name>
```

Refreshes each linked account from Stripe, appends new transactions to `data/transactions.json`, and prints a table sorted by date descending.

### Clean & categorize

```bash
bun run clean
```

Output:

```bash
Cleaned 209 transaction(s)
Dropped fields: object, account, livemode, updated, account_id, transaction_refresh, transacted_at

Category breakdown:
  Dining: 105
  Transfer: 18
  Transit: 17
  Superstore: 14
  ...

Weekly breakdowns: 13 week(s) in data/weekly/
  2025-11-02/ (1 transactions)
  2025-11-09/ (1 transactions)
  ...
```

Categories are defined in `src/category_rules.ts`. Unmatched descriptions are printed at the end so you can add new rules.

### Weekly automation

After the initial link, the only commands needed on a schedule are:

```bash
bun run fetch --all
bun run clean
```

If an account becomes stale or disconnected, re-run `bun run link` to re-link.

## File structure

```bash
.env                                    # Stripe API keys (gitignored)
src/link_server.ts                      # Express server for account linking
src/fetch_transactions.ts               # CLI script to refresh + fetch transactions
src/clean_transactions.ts               # Cleans, categorizes, and generates summaries
src/category_rules.ts                   # Regex-to-category mapping
public/index.html                       # Frontend with Stripe.js modal
data/linked_account.json                # Linked accounts list (gitignored)
data/transactions.json                  # Raw transaction store (gitignored)
data/transactions_clean.json            # Cleaned transactions (gitignored)
data/category_summary.json              # Category totals (gitignored)
data/weekly/<date>/                     # Per-week breakdowns (gitignored)
    transactions_clean.json
    category_summary.json
```
