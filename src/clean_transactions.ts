import fs from "fs";
import path from "path";
import { CATEGORY_RULES } from "./category_rules";

const DATA_DIR = path.join(import.meta.dir, "..", "data");
const TX_FILE = path.join(DATA_DIR, "transactions.json");
const CLEAN_FILE = path.join(DATA_DIR, "transactions_clean.json");

const DROP_FIELDS = [
  "object",
  "account",
  "livemode",
  "updated",
  "account_id",
  "transacted_at, 'transaction_refresh",
];

const uncategorized: string[] = [];

function categorize(description: string): string {
  for (const [pattern, category] of CATEGORY_RULES) {
    if (pattern.test(description)) return category;
  }
  uncategorized.push(description);
  return "N/A";
}

function clean(tx: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(tx)) {
    if (!DROP_FIELDS.includes(key)) {
      cleaned[key] = value;
    }
  }
  cleaned.category = categorize((tx.description as string) || "");

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

  return cleaned;
}

function main(): void {
  let transactions: Record<string, unknown>[];
  try {
    transactions = JSON.parse(fs.readFileSync(TX_FILE, "utf8"));
  } catch {
    console.error(`Could not read ${TX_FILE}. Run \`bun run fetch\` first.`);
    process.exit(1);
  }

  const cleaned = transactions.map(clean);
  fs.writeFileSync(CLEAN_FILE, JSON.stringify(cleaned, null, 2));

  console.log(`Cleaned ${cleaned.length} transaction(s)`);
  console.log(`Dropped fields: ${DROP_FIELDS.join(", ")}`);

  const categories: Record<string, number> = {};
  for (const tx of cleaned) {
    const cat = tx.category as string;
    categories[cat] = (categories[cat] || 0) + 1;
  }
  console.log("\nCategory breakdown:");
  for (const [cat, count] of Object.entries(categories).sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`  ${cat}: ${count}`);
  }

  if (uncategorized.length > 0) {
    const unique = [...new Set(uncategorized)];
    console.log(`\nUncategorized descriptions (${unique.length}):`);
    for (const desc of unique) {
      console.log(`  - ${desc}`);
    }
  }

  console.log(`\nSaved to ${CLEAN_FILE}`);
}

main();
