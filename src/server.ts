import express from "express";
import path from "path";
import { stripe_publishable_key, stripeEnv } from "./lib/stripe";
import accountRoutes from "./routes/accounts";
import transactionRoutes from "./routes/transactions";
import syncRoutes from "./routes/sync";
import analyticsRoutes from "./routes/analytics";

const app = express();

app.use(express.json());
app.use(express.static(path.join(import.meta.dir, "..", "public")));

app.get("/config", (_req, res) => {
  res.json({ publishableKey: stripe_publishable_key });
});

app.use(accountRoutes);
app.use(transactionRoutes);
app.use(syncRoutes);
app.use(analyticsRoutes);

console.log(`Stripe mode: ${stripeEnv}`);

app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
