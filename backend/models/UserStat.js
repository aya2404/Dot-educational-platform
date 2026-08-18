const mongoose = require('mongoose');

// Live gamification counters for a single student (exactly one doc per student).
// Mutated only server-side by the gamification engine — never from client input.
const userStatSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'الطالب مطلوب'],
      unique: true,
    },

    totalXp: { type: Number, default: 0 },
    submissionCount: { type: Number, default: 0 },
    perfectScores: { type: Number, default: 0 },
    streakDays: { type: Number, default: 0 },
    lastActivityDate: { type: Date, default: null },
    lecturesCompleted: { type: Number, default: 0 },
    coursesCompleted: { type: Number, default: 0 },
    chatMessagesSent: { type: Number, default: 0 },

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

module.exports = mongoose.model('UserStat', userStatSchema);
