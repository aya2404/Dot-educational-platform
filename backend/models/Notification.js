const mongoose = require('mongoose');

// In-app notification. The recipient is always derived server-side from a real
// workflow (enrolment, grading, published content) — never from client input.
const NOTIFICATION_TYPES = [
  'COURSE_ENROLLED',
  'NEW_TASK',
  'COURSE_ANNOUNCEMENT',
  'SUBMISSION_GRADED',
  'BADGE_AWARDED',
  'CHAT_MESSAGE',
  'CERTIFICATE_ISSUED',
];

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'المستلم مطلوب'],
    },

    type: {
      type:     String,
      enum:     NOTIFICATION_TYPES,
      required: true,
    },

    title: {
      type:     String,
      required: true,
      trim:     true,
    },

    message: {
      type:    String,
      default: '',
      trim:    true,
    },

    // Optional related course + a relative in-app link for click-through.
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'Course',
    },

    link: {
      type:    String,
      default: '',
      trim:    true,
    },

    isRead: {
      type:    Boolean,
      default: false,
    },

    // Multi-tenancy isolation key. A notification belongs to its recipient's
    // tenant; legacy/unspecified records fall back to the shared 'default' tenant.
    tenantId: {
      type:     String,
      required: true,
      default:  'default',
      index:    true,
    },
  },
  {
    timestamps: true,
  }
);

// Newest-first listing per recipient, and an efficient unread lookup.
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

notificationSchema.statics.TYPES = NOTIFICATION_TYPES;

module.exports = mongoose.model('Notification', notificationSchema);
