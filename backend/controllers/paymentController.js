const Subscription = require('../models/Subscription');
const { stripe, isConfigured, PLANS, WEBHOOK_SECRET } = require('../config/stripe');

const getTenantId = (req) => {
  if (!req.tenantId) {
    console.warn('paymentController: req.tenantId missing — defaulting to "default" tenant');
  }
  return req.tenantId || 'default';
};

const clientOrigin = () =>
  ((process.env.CLIENT_ORIGIN || '').split(',')[0].trim() || 'http://localhost:3000').replace(/\/+$/, '');

const notConfigured = (res) =>
  res.status(503).json({ success: false, message: 'نظام الدفع غير مُهيأ (STRIPE_SECRET_KEY مفقود)' });

// POST /api/payments/create-checkout — start a Stripe Checkout subscription.
const createCheckoutSession = async (req, res) => {
  try {
    if (!isConfigured()) return notConfigured(res);

    const tenantId = getTenantId(req);
    const plan = PLANS[req.body.plan] ? req.body.plan : null;
    if (!plan) {
      return res.status(400).json({ success: false, message: 'الخطة غير صالحة' });
    }
    const planConfig = PLANS[plan];

    // Reuse an existing Stripe customer if this user already has one.
    const existing = await Subscription.findOne({ user: req.user._id });
    const origin = clientOrigin();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: existing?.stripeCustomerId || undefined,
      client_reference_id: req.user._id.toString(),
      metadata: { userId: req.user._id.toString(), tenantId, plan },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: planConfig.currency,
            unit_amount: planConfig.amount,
            recurring: { interval: planConfig.interval },
            product_data: { name: `اشتراك ${planConfig.label}` },
          },
        },
      ],
      success_url: `${origin}/pricing?status=success`,
      cancel_url: `${origin}/pricing?status=cancel`,
    });

    return res.json({ success: true, url: session.url });
  } catch (error) {
    console.error('createCheckoutSession error:', error.message);
    return res.status(500).json({ success: false, message: 'تعذر بدء عملية الدفع' });
  }
};

// Upsert a subscription record from a Stripe object (webhook-driven).
const upsertSubscription = async ({ userId, tenantId, plan, status, customerId, subscriptionId, endDate }) => {
  if (!userId) return;
  await Subscription.findOneAndUpdate(
    { user: userId },
    {
      user: userId,
      ...(tenantId ? { tenantId } : {}),
      ...(plan ? { plan } : {}),
      status,
      ...(customerId ? { stripeCustomerId: customerId } : {}),
      ...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
      ...(status === 'active' ? { startDate: new Date() } : {}),
      ...(endDate ? { endDate } : {}),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

// POST /api/payments/webhook — PUBLIC. Verifies the Stripe signature against the
// RAW request body (see server.js — express.raw for this route only).
const handleWebhook = async (req, res) => {
  if (!isConfigured() || !WEBHOOK_SECRET) {
    return res.status(503).send('Stripe not configured');
  }

  let event;
  try {
    const signature = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(req.body, signature, WEBHOOK_SECRET);
  } catch (error) {
    console.error('webhook signature verification failed:', error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await upsertSubscription({
          userId: session.metadata?.userId || session.client_reference_id,
          tenantId: session.metadata?.tenantId,
          plan: session.metadata?.plan,
          status: 'active',
          customerId: session.customer,
          subscriptionId: session.subscription,
        });
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const sub = await Subscription.findOne({ stripeCustomerId: invoice.customer });
        if (sub) {
          sub.status = 'active';
          if (invoice.lines?.data?.[0]?.period?.end) {
            sub.endDate = new Date(invoice.lines.data[0].period.end * 1000);
          }
          await sub.save();
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await Subscription.findOneAndUpdate(
          { stripeSubscriptionId: subscription.id },
          { status: 'canceled' }
        );
        break;
      }
      default:
        break;
    }
    return res.json({ received: true });
  } catch (error) {
    console.error('webhook handling error:', error.message);
    return res.status(500).send('Webhook handler failed');
  }
};

// GET /api/payments/subscription — the caller's current subscription (or none).
const getMySubscription = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const filter = { user: req.user._id };
    if (req.user.role !== 'superadmin') filter.tenantId = tenantId;

    const subscription = await Subscription.findOne(filter).sort({ updatedAt: -1 });
    if (!subscription) {
      return res.json({ success: true, data: { status: 'none' } });
    }
    return res.json({ success: true, data: subscription });
  } catch (error) {
    console.error('getMySubscription error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

// POST /api/payments/cancel — cancel at period end.
const cancelSubscription = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const filter = { user: req.user._id, status: 'active' };
    if (req.user.role !== 'superadmin') filter.tenantId = tenantId;

    const subscription = await Subscription.findOne(filter);
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'لا يوجد اشتراك نشط' });
    }

    if (isConfigured() && subscription.stripeSubscriptionId) {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }

    subscription.status = 'canceled';
    await subscription.save();
    return res.json({ success: true, data: subscription });
  } catch (error) {
    console.error('cancelSubscription error:', error.message);
    return res.status(500).json({ success: false, message: 'تعذر إلغاء الاشتراك' });
  }
};

module.exports = {
  createCheckoutSession,
  handleWebhook,
  getMySubscription,
  cancelSubscription,
};
