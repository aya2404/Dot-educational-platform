const mongoose = require('mongoose');

// Junction record: a badge awarded to a student. The unique {student, badge}
// index guarantees a badge can never be awarded to the same student twice.
const userBadgeSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'الطالب مطلوب'],
      index: true,
    },

    badge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Badge',
      required: [true, 'الشارة مطلوبة'],
    },

    awardedAt: {
      type: Date,
      default: Date.now,
    },

    // Multi-tenancy isolation key. Legacy/unspecified records fall back to the
    // shared 'default' tenant.
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

// A student can hold each badge at most once.
userBadgeSchema.index({ student: 1, badge: 1 }, { unique: true });

module.exports = mongoose.model('UserBadge', userBadgeSchema);
