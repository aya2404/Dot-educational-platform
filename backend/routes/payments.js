const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createCheckoutSession,
  handleWebhook,
  getMySubscription,
  cancelSubscription,
} = require('../controllers/paymentController');

// PUBLIC — Stripe posts events here. The raw body is required for signature
// verification (server.js skips JSON parsing for this exact path).
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Everything below requires authentication.
router.use(protect);

router.post('/create-checkout', createCheckoutSession);
router.get('/subscription', getMySubscription);
router.post('/cancel', cancelSubscription);

module.exports = router;
