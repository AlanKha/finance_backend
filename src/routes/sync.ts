import { Router, type Request, type Response } from "express";
import { syncFromStripe } from "../lib/transactions";
import { cleanAllTransactions } from "../lib/cleaning";

const router = Router();

router.post("/api/sync", async (req: Request, res: Response) => {
  try {
    const { accountIds } = req.body || {};
    const fetchResult = await syncFromStripe(accountIds);
    const cleaned = cleanAllTransactions();
    res.json({
      fetch: fetchResult,
      clean: { count: cleaned.length },
    });
  } catch (err: unknown) {
    console.error("Sync error:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/api/sync/fetch", async (req: Request, res: Response) => {
  try {
    const { accountIds } = req.body || {};
    const result = await syncFromStripe(accountIds);
    res.json(result);
  } catch (err: unknown) {
    console.error("Fetch error:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/api/sync/clean", (_req: Request, res: Response) => {
  try {
    const cleaned = cleanAllTransactions();
    res.json({ count: cleaned.length });
  } catch (err: unknown) {
    console.error("Clean error:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
