import { CATEGORY_RULES } from "../category_rules";
import type { StoredTransaction, CleanTransaction, CategoryOverrides } from "./types";
import { loadTransactions, saveCleanTransactions, loadOverrides } from "./store";

const DROP_FIELDS = [
  "object",
  "account",
  "livemode",
  "updated",
  "account_id",
  "transaction_refresh",
  "transacted_at",
];

export function categorize(
  description: string,
  transactionId: string,
  overrides: CategoryOverrides,
): string {
  if (overrides[transactionId]) return overrides[transactionId];
  for (const [pattern, category] of CATEGORY_RULES) {
    if (pattern.test(description)) return category;
  }
  return "N/A";
}

export function cleanTransaction(
  tx: StoredTransaction,
  overrides: CategoryOverrides,
): CleanTransaction {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(tx)) {
    if (!DROP_FIELDS.includes(key)) {
      cleaned[key] = value;
    }
  }
  cleaned.category = categorize(tx.description || "", tx.id, overrides);

  if (typeof tx.transacted_at === "number") {
    const d = new Date(tx.transacted_at * 1000);
    cleaned.date = d.toISOString().slice(0, 10);
    cleaned.year = d.getFullYear();
    cleaned.month = d.getMonth() + 1;
  }

  const st = tx.status_transitions as Record<string, unknown> | undefined;
  if (st) {
    const normalized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(st)) {
      if (typeof val === "number") {
        normalized[key] = new Date(val * 1000).toISOString().slice(0, 10);
      } else {
        normalized[key] = val;
      }
    }
    cleaned.status_transitions = normalized;
  }

  return cleaned as CleanTransaction;
}

export function cleanAllTransactions(): CleanTransaction[] {
  const transactions = loadTransactions();
  const overrides = loadOverrides();

  const cleaned = transactions
    .filter((tx) => tx.amount < 0)
    .map((tx) => cleanTransaction(tx, overrides));

  saveCleanTransactions(cleaned);
  return cleaned;
}
