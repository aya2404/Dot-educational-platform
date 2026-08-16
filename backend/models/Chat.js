const mongoose = require('mongoose');

// A conversation between two users (direct) or a course group. Participants and
// tenant are always derived server-side; a chat is tenant-isolated like every
// other resource.
const chatSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],

    // Optional course association (set for course group chats).
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
    },

    isGroupChat: {
      type: Boolean,
      default: false,
    },

    // Multi-tenancy isolation key (inherited from the participants/course).
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

// Fast "my chats, most recent first" lookup.
chatSchema.index({ participants: 1, updatedAt: -1 });

module.exports = mongoose.model('Chat', chatSchema);
