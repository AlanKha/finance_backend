import { Router, type Request, type Response } from "express";
import {
  getCategoryBreakdown,
  getMonthlyBreakdown,
  getWeeklyBreakdown,
} from "../lib/analytics";

const router = Router();

function extractFilters(query: Request["query"]) {
  return {
    startDate: query.startDate as string | undefined,
    endDate: query.endDate as string | undefined,
    account: query.account as string | undefined,
    category: query.category as string | undefined,
  };
}

router.get("/api/analytics/categories", (req: Request, res: Response) => {
  res.json(getCategoryBreakdown(extractFilters(req.query)));
});

router.get("/api/analytics/monthly", (req: Request, res: Response) => {
  res.json(getMonthlyBreakdown(extractFilters(req.query)));
});

router.get("/api/analytics/weekly", (req: Request, res: Response) => {
  res.json(getWeeklyBreakdown(extractFilters(req.query)));
});

export default router;
