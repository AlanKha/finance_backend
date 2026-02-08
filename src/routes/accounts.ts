import { Router, type Request, type Response } from "express";
import Stripe from "stripe";
import { stripe } from "../lib/stripe";
import { readAccountData, writeAccountData } from "../lib/store";

const router = Router();

router.get("/api/accounts", (_req: Request, res: Response) => {
  const data = readAccountData();
  res.json(data.accounts);
});

router.post("/create-session", async (_req: Request, res: Response) => {
  try {
    const data = readAccountData();

    if (!data.customer_id) {
      const customer = await stripe.customers.create();
      data.customer_id = customer.id;
      writeAccountData(data);
    }

    const session = await stripe.financialConnections.sessions.create({
      account_holder: { type: "customer", customer: data.customer_id },
      permissions: ["transactions"],
      prefetch: ["transactions"],
    });

    res.json({ clientSecret: session.client_secret });
  } catch (err: unknown) {
    console.error("Error creating session:", err);
    const stripeErr = err as Stripe.errors.StripeError;
    const message =
      stripeErr.type === "StripeAuthenticationError"
        ? "Invalid Stripe API key"
        : stripeErr.message;
    res.status(500).json({ error: message });
  }
});

router.post("/save-account", async (req: Request, res: Response) => {
  try {
    const { accountId, institution, displayName, last4 } = req.body;
    if (!accountId) {
      res.status(400).json({ error: "accountId is required" });
      return;
    }

    try {
      await stripe.financialConnections.accounts.subscribe(accountId, {
        features: ["transactions"],
      });
    } catch (subErr: unknown) {
      console.warn(
        "Subscribe skipped (account may be inactive):",
        (subErr as Error).message,
      );
    }

    const data = readAccountData();

    if (!data.accounts.some((a) => a.id === accountId)) {
      data.accounts.push({
        id: accountId,
        institution: institution || null,
        display_name: displayName || null,
        last4: last4 || null,
        linked_at: new Date().toISOString(),
      });
      writeAccountData(data);
    }

    res.json({ success: true, accountId });
  } catch (err: unknown) {
    console.error("Error saving account:", err);
    const stripeErr = err as Stripe.errors.StripeError;
    const message =
      stripeErr.type === "StripeInvalidRequestError"
        ? `Stripe error: ${stripeErr.message}`
        : stripeErr.message;
    res.status(500).json({ error: message });
  }
});

export default router;
