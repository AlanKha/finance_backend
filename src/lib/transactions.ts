import type Stripe from "stripe";
import { stripe } from "./stripe";
import type { StoredTransaction, LinkedAccount } from "./types";
import {
  readAccountData,
  loadTransactions,
  saveTransactions,
  accountLabel,
} from "./store";

async function refreshAccount(accountId: string): Promise<void> {
  await stripe.financialConnections.accounts.refresh(accountId, {
    features: ["transactions"],
  });

  const MAX_ATTEMPTS = 30;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const account =
      await stripe.financialConnections.accounts.retrieve(accountId);
    const status = account.transaction_refresh?.status;

    if (status === "succeeded") return;
    if (status === "failed") throw new Error("Transaction refresh failed");
    if (i === MAX_ATTEMPTS - 1) throw new Error("Refresh timed out after 60s");

    await new Promise((r) => setTimeout(r, 2000));
  }
}

async function fetchTransactions(
  accountId: string,
): Promise<Stripe.FinancialConnections.Transaction[]> {
  const txs: Stripe.FinancialConnections.Transaction[] = [];
  let startingAfter: string | undefined;

  while (true) {
    const params: Stripe.FinancialConnections.TransactionListParams = {
      account: accountId,
      limit: 100,
    };
    if (startingAfter) params.starting_after = startingAfter;

    const page = await stripe.financialConnections.transactions.list(params);
    txs.push(...page.data);

    if (!page.has_more) break;
    startingAfter = page.data[page.data.length - 1].id;
  }

  return txs;
}

export interface SyncResult {
  newCount: number;
  totalCount: number;
  errors: string[];
}

export async function syncFromStripe(
  accountIds?: string[],
): Promise<SyncResult> {
  const accountData = readAccountData();
  let accounts = accountData.accounts;

  if (accounts.length === 0) {
    return { newCount: 0, totalCount: 0, errors: ["No linked accounts found"] };
  }

  if (accountIds && accountIds.length > 0) {
    const idSet = new Set(accountIds);
    accounts = accounts.filter((a) => idSet.has(a.id));
    if (accounts.length === 0) {
      return {
        newCount: 0,
        totalCount: 0,
        errors: ["No matching accounts found"],
      };
    }
  }

  const existing = loadTransactions();
  const knownIds = new Set(existing.map((tx) => tx.id));
  const newTxs: StoredTransaction[] = [];
  const errors: string[] = [];

  for (const acct of accounts) {
    const label = accountLabel(acct);

    try {
      await refreshAccount(acct.id);
    } catch (err: unknown) {
      errors.push(`[${label}] Refresh failed: ${(err as Error).message}`);
      continue;
    }

    try {
      const txs = await fetchTransactions(acct.id);
      for (const tx of txs) {
        if (!knownIds.has(tx.id)) {
          const stored: StoredTransaction = {
            ...tx,
            account_id: acct.id,
            account_label: label,
          };
          newTxs.push(stored);
          knownIds.add(tx.id);
        }
      }
    } catch (err: unknown) {
      errors.push(`[${label}] Fetch failed: ${(err as Error).message}`);
      continue;
    }
  }

  const all = [...existing, ...newTxs];
  all.sort((a, b) => b.transacted_at - a.transacted_at);
  saveTransactions(all);

  return { newCount: newTxs.length, totalCount: all.length, errors };
}
