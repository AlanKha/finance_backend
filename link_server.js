require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const Stripe = require("stripe");

const stripeEnv = process.env.stripe_env || "sandbox";
const stripe_secret_key = process.env[`stripe_${stripeEnv}_secret_key`];
const stripe_publishable_key =
  process.env[`stripe_${stripeEnv}_publishable_key`];

if (!stripe_secret_key || !stripe_publishable_key) {
  console.error(
    `Missing stripe_${stripeEnv}_secret_key or stripe_${stripeEnv}_publishable_key in .env`,
  );
  process.exit(1);
}

console.log(`Stripe mode: ${stripeEnv}`);
const stripe = new Stripe(stripe_secret_key);
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "linked_account.json");

function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return { accounts: [] };
  }
}

function writeData(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

app.get("/config", (_req, res) => {
  res.json({ publishableKey: stripe_publishable_key });
});

app.post("/create-session", async (_req, res) => {
  try {
    let data = readData();

    if (!data.customer_id) {
      const customer = await stripe.customers.create();
      data.customer_id = customer.id;
      writeData(data);
    }

    const session = await stripe.financialConnections.sessions.create({
      account_holder: { type: "customer", customer: data.customer_id },
      permissions: ["transactions"],
      prefetch: ["transactions"],
    });

    res.json({ clientSecret: session.client_secret });
  } catch (err) {
    console.error("Error creating session:", err);
    const message =
      err.type === "StripeAuthenticationError"
        ? "Invalid Stripe API key"
        : err.message;
    res.status(500).json({ error: message });
  }
});

app.post("/save-account", async (req, res) => {
  try {
    const { accountId, institution, displayName, last4 } = req.body;
    if (!accountId) {
      return res.status(400).json({ error: "accountId is required" });
    }

    // Subscribe to ongoing transaction refreshes (best-effort — the session's
    // prefetch already handled the initial data pull, and in test mode the
    // account may be inactive which makes subscribe fail).
    try {
      await stripe.financialConnections.accounts.subscribe(accountId, {
        features: ["transactions"],
      });
    } catch (subErr) {
      console.warn(
        "Subscribe skipped (account may be inactive):",
        subErr.message,
      );
    }

    const data = readData();

    // Skip if this account is already linked
    if (!data.accounts.some((a) => a.id === accountId)) {
      data.accounts.push({
        id: accountId,
        institution: institution || null,
        display_name: displayName || null,
        last4: last4 || null,
        linked_at: new Date().toISOString(),
      });
      writeData(data);
    }

    res.json({ success: true, accountId });
  } catch (err) {
    console.error("Error saving account:", err);
    const message =
      err.type === "StripeInvalidRequestError"
        ? `Stripe error: ${err.message}`
        : err.message;
    res.status(500).json({ error: message });
  }
});

app.listen(3000, () => {
  console.log("Link server running at http://localhost:3000");
});
