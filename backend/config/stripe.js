const Stripe = require('stripe');

// Initialize Stripe only when a secret key is configured. The app must boot
// (and tests must run) without Stripe credentials, so `stripe` is null when
// unconfigured and every payment handler checks `isConfigured()` first.
const secretKey = process.env.STRIPE_SECRET_KEY;
const stripe = secretKey ? new Stripe(secretKey) : null;

const isConfigured = () => Boolean(stripe);

// Subscription plans. Amounts are in the smallest currency unit (cents).
const PLANS = {
  // Amounts in cents: $299 / month, $2990 / year (10 months — 2 free).
  monthly: { label: 'شهري', amount: 29900, currency: 'usd', interval: 'month' },
  yearly: { label: 'سنوي', amount: 299000, currency: 'usd', interval: 'year' },
};

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

module.exports = { stripe, isConfigured, PLANS, WEBHOOK_SECRET };
