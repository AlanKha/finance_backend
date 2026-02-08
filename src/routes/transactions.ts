import { Router, type Request, type Response } from "express";
import {
  loadCleanTransactions,
  saveCleanTransactions,
  loadOverrides,
  saveOverrides,
} from "../lib/store";

const router = Router();

router.get("/api/transactions", (req: Request, res: Response) => {
  let transactions = loadCleanTransactions();

  const { account, category, startDate, endDate, search, sort } = req.query;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;

  if (account) {
    const acct = (account as string).toLowerCase();
    transactions = transactions.filter((tx) =>
      tx.account_label?.toLowerCase().includes(acct),
    );
  }
  if (category) {
    const cat = (category as string).toLowerCase();
    transactions = transactions.filter(
      (tx) => (tx.category as string)?.toLowerCase() === cat,
    );
  }
  if (startDate) {
    transactions = transactions.filter((tx) => tx.date >= (startDate as string));
  }
  if (endDate) {
    transactions = transactions.filter((tx) => tx.date <= (endDate as string));
  }
  if (search) {
    const q = (search as string).toLowerCase();
    transactions = transactions.filter((tx) =>
      tx.description?.toLowerCase().includes(q),
    );
  }

  // Sort
  const sortParam = (sort as string) || "date_desc";
  if (sortParam === "date_asc") {
    transactions.sort((a, b) => a.date.localeCompare(b.date));
  } else if (sortParam === "amount_asc") {
    transactions.sort((a, b) => a.amount - b.amount);
  } else if (sortParam === "amount_desc") {
    transactions.sort((a, b) => b.amount - a.amount);
  } else {
    transactions.sort((a, b) => b.date.localeCompare(a.date));
  }

  const total = transactions.length;
  const start = (page - 1) * limit;
  const paginated = transactions.slice(start, start + limit);

  res.json({
    data: paginated,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

router.patch("/api/transactions/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const { category } = req.body;

  if (!category || typeof category !== "string") {
    res.status(400).json({ error: "category is required" });
    return;
  }

  // Save override
  const overrides = loadOverrides();
  overrides[id] = category;
  saveOverrides(overrides);

  // Update in clean transactions
  const transactions = loadCleanTransactions();
  const tx = transactions.find((t) => t.id === id);
  if (!tx) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  tx.category = category;
  saveCleanTransactions(transactions);

  res.json({ success: true, transaction: tx });
});

export default router;
