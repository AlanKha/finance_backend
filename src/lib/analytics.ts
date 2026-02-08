import type { CleanTransaction } from "./types";
import { loadCleanTransactions } from "./store";

interface Filters {
  startDate?: string;
  endDate?: string;
  account?: string;
  category?: string;
}

function applyFilters(
  transactions: CleanTransaction[],
  filters: Filters,
): CleanTransaction[] {
  let filtered = transactions;

  if (filters.startDate) {
    filtered = filtered.filter((tx) => tx.date >= filters.startDate!);
  }
  if (filters.endDate) {
    filtered = filtered.filter((tx) => tx.date <= filters.endDate!);
  }
  if (filters.account) {
    const acct = filters.account.toLowerCase();
    filtered = filtered.filter(
      (tx) => tx.account_label?.toLowerCase().includes(acct),
    );
  }
  if (filters.category) {
    const cat = filters.category.toLowerCase();
    filtered = filtered.filter(
      (tx) => (tx.category as string)?.toLowerCase() === cat,
    );
  }

  return filtered;
}

export function getCategoryBreakdown(filters: Filters) {
  const transactions = applyFilters(loadCleanTransactions(), filters);

  const categories: Record<string, { count: number; total_cents: number }> = {};
  for (const tx of transactions) {
    const cat = tx.category as string;
    if (!categories[cat]) categories[cat] = { count: 0, total_cents: 0 };
    categories[cat].count++;
    categories[cat].total_cents += tx.amount;
  }

  return Object.entries(categories)
    .sort((a, b) => a[1].total_cents - b[1].total_cents)
    .map(([category, data]) => ({
      category,
      count: data.count,
      total_cents: data.total_cents,
      total: `$${(Math.abs(data.total_cents) / 100).toFixed(2)}`,
    }));
}

export function getMonthlyBreakdown(filters: Filters) {
  const transactions = applyFilters(loadCleanTransactions(), filters);

  const months: Record<string, { count: number; total_cents: number }> = {};
  for (const tx of transactions) {
    const key = `${tx.year}-${String(tx.month).padStart(2, "0")}`;
    if (!months[key]) months[key] = { count: 0, total_cents: 0 };
    months[key].count++;
    months[key].total_cents += tx.amount;
  }

  return Object.entries(months)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, data]) => ({
      month,
      count: data.count,
      total_cents: data.total_cents,
      total: `$${(Math.abs(data.total_cents) / 100).toFixed(2)}`,
    }));
}

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

export function getWeeklyBreakdown(filters: Filters) {
  const transactions = applyFilters(loadCleanTransactions(), filters);

  const weeks: Record<string, { count: number; total_cents: number }> = {};
  for (const tx of transactions) {
    if (!tx.date) continue;
    const week = getWeekStart(tx.date);
    if (!weeks[week]) weeks[week] = { count: 0, total_cents: 0 };
    weeks[week].count++;
    weeks[week].total_cents += tx.amount;
  }

  return Object.entries(weeks)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week_start, data]) => ({
      week_start,
      count: data.count,
      total_cents: data.total_cents,
      total: `$${(Math.abs(data.total_cents) / 100).toFixed(2)}`,
    }));
}
