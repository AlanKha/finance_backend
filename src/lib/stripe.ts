import Stripe from "stripe";

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

export const stripe = new Stripe(stripe_secret_key);
export { stripe_publishable_key, stripeEnv };
