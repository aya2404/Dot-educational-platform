const mongoose = require('mongoose');

// A user's paid subscription, mirrored from Stripe via webhooks.
const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'المستخدم مطلوب'],
    },

    plan: {
      type: String,
      enum: ['monthly', 'yearly'],
    },

    status: {
      type: String,
      enum: ['active', 'canceled', 'expired'],
      default: 'active',
    },

    stripeCustomerId: { type: String, default: '' },
    stripeSubscriptionId: { type: String, default: '' },

    startDate: { type: Date },
    endDate: { type: Date },

    // Multi-tenancy isolation key (inherited from the subscribing user).
    tenantId: {
      type: String,
      required: true,
      default: 'default',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

subscriptionSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
