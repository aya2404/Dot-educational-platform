const mongoose = require('mongoose');

// Definition of an achievable badge. Badges are per-tenant (a tenant can define
// its own set); `name` is unique within a tenant. Awards live in UserBadge.
const CRITERIA_TYPES = [
  'submission_count',
  'streak_days',
  'lecture_completion',
  'course_completion',
  'chat_messages',
  'perfect_score',
];

const badgeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'اسم الشارة مطلوب'],
      trim: true,
    },

    description: {
      type: String,
      required: [true, 'وصف الشارة مطلوب'],
      trim: true,
    },

    // react-icons name, e.g. "FaFire" / "FaTrophy" — resolved on the frontend.
    icon: {
      type: String,
      required: [true, 'أيقونة الشارة مطلوبة'],
      trim: true,
    },

    color: {
      type: String,
      required: [true, 'لون الشارة مطلوب'],
      trim: true,
    },

    criteria: {
      type: String,
      required: [true, 'معايير الشارة مطلوبة'],
      trim: true,
    },

    criteriaType: {
      type: String,
      enum: CRITERIA_TYPES,
      required: true,
    },

    criteriaValue: {
      type: Number,
      required: true,
      min: 1,
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

// A badge name is unique within its tenant (but two tenants may reuse a name).
badgeSchema.index({ tenantId: 1, name: 1 }, { unique: true });

badgeSchema.statics.CRITERIA_TYPES = CRITERIA_TYPES;

module.exports = mongoose.model('Badge', badgeSchema);
