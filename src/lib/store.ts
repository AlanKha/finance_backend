import fs from "fs";
import path from "path";
import type {
  AccountData,
  LinkedAccount,
  StoredTransaction,
  CleanTransaction,
  CategoryOverrides,
} from "./types";

export const DATA_DIR = path.join(import.meta.dir, "..", "..", "data");
const ACCOUNT_FILE = path.join(DATA_DIR, "linked_account.json");
const TX_FILE = path.join(DATA_DIR, "transactions.json");
const CLEAN_FILE = path.join(DATA_DIR, "transactions_clean.json");
const OVERRIDES_FILE = path.join(DATA_DIR, "category_overrides.json");

export function readAccountData(): AccountData {
  try {
    return JSON.parse(fs.readFileSync(ACCOUNT_FILE, "utf8"));
  } catch {
    return { accounts: [] };
  }
}

export function writeAccountData(data: AccountData): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(ACCOUNT_FILE, JSON.stringify(data, null, 2));
}

export function loadTransactions(): StoredTransaction[] {
  try {
    return JSON.parse(fs.readFileSync(TX_FILE, "utf8"));
  } catch {
    return [];
  }
}

export function saveTransactions(transactions: StoredTransaction[]): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(TX_FILE, JSON.stringify(transactions, null, 2));
}

export function loadCleanTransactions(): CleanTransaction[] {
  try {
    return JSON.parse(fs.readFileSync(CLEAN_FILE, "utf8"));
  } catch {
    return [];
  }
}

export function saveCleanTransactions(transactions: CleanTransaction[]): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(CLEAN_FILE, JSON.stringify(transactions, null, 2));
}

export function loadOverrides(): CategoryOverrides {
  try {
    return JSON.parse(fs.readFileSync(OVERRIDES_FILE, "utf8"));
  } catch {
    return {};
  }
}

export function saveOverrides(overrides: CategoryOverrides): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(overrides, null, 2));
}

export function accountLabel(acct: LinkedAccount): string {
  return (
    [
      acct.institution,
      acct.display_name,
      acct.last4 ? `****${acct.last4}` : null,
    ]
      .filter(Boolean)
      .join(" ") || acct.id
  );
}
