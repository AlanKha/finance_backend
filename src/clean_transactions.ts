import fs from "fs";
import path from "path";
import { CATEGORY_RULES } from "./category_rules";

const DATA_DIR = path.join(import.meta.dir, "..", "data");
const TX_FILE = path.join(DATA_DIR, "transactions.json");
const CLEAN_FILE = path.join(DATA_DIR, "transactions_clean.json");
const SUMMARY_FILE = path.join(DATA_DIR, "category_summary.json");

const DROP_FIELDS = [
  "object",
  "account",
  "livemode",
  "updated",
  "account_id",
  "transaction_refresh",
  "transacted_at",
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

function buildSummary(txs: Record<string, unknown>[]) {
  const categories: Record<string, number> = {};
  for (const tx of txs) {
    const cat = tx.category as string;
    categories[cat] = (categories[cat] || 0) + 1;
  }
  return Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => {
      const matched = txs.filter((tx) => tx.category === category);
      const total = matched.reduce((sum, tx) => sum + (tx.amount as number), 0);
      return { category, count, total_cents: total, total: `$${(Math.abs(total) / 100).toFixed(2)}` };
    });
}

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
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

  // Write totals
  fs.writeFileSync(CLEAN_FILE, JSON.stringify(cleaned, null, 2));
  const summary = buildSummary(cleaned);
  fs.writeFileSync(SUMMARY_FILE, JSON.stringify(summary, null, 2));

  console.log(`Cleaned ${cleaned.length} transaction(s)`);
  console.log(`Dropped fields: ${DROP_FIELDS.join(", ")}`);

  console.log("\nCategory breakdown:");
  for (const s of summary) {
    console.log(`  ${s.category}: ${s.count}`);
  }

  if (uncategorized.length > 0) {
    const unique = [...new Set(uncategorized)];
    console.log(`\nUncategorized descriptions (${unique.length}):`);
    for (const desc of unique) {
      console.log(`  - ${desc}`);
    }
  }

  // Write weekly breakdowns
  const WEEKLY_DIR = path.join(DATA_DIR, "weekly");
  fs.mkdirSync(WEEKLY_DIR, { recursive: true });

  const weeks: Record<string, Record<string, unknown>[]> = {};
  for (const tx of cleaned) {
    const date = tx.date as string | undefined;
    if (!date) continue;
    const week = getWeekStart(date);
    if (!weeks[week]) weeks[week] = [];
    weeks[week].push(tx);
  }

  const sortedWeeks = Object.keys(weeks).sort();
  for (const week of sortedWeeks) {
    const weekDir = path.join(WEEKLY_DIR, week);
    fs.mkdirSync(weekDir, { recursive: true });
    fs.writeFileSync(path.join(weekDir, "transactions_clean.json"), JSON.stringify(weeks[week], null, 2));
    fs.writeFileSync(path.join(weekDir, "category_summary.json"), JSON.stringify(buildSummary(weeks[week]), null, 2));
  }

  console.log(`\nWeekly breakdowns: ${sortedWeeks.length} week(s) in data/weekly/`);
  for (const week of sortedWeeks) {
    console.log(`  ${week}/ (${weeks[week].length} transactions)`);
  }

  console.log(`\nSaved to ${CLEAN_FILE}`);
  console.log(`Summary saved to ${SUMMARY_FILE}`);
}

main();
