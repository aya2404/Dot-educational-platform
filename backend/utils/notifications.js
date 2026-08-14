const Notification = require('../models/Notification');

// Fire-and-forget notification helpers. These NEVER throw — a notification
// failure must not break the primary business operation (enrolment, grading,
// content creation). Errors are logged and swallowed.

const notify = async (recipientId, payload) => {
  try {
    if (!recipientId) return null;
    return await Notification.create({ recipient: recipientId, ...payload });
  } catch (error) {
    console.error('notify error:', error.message);
    return null;
  }
};

const notifyMany = async (recipientIds, payload) => {
  try {
    const docs = (recipientIds || [])
      .filter(Boolean)
      .map((recipient) => ({ recipient, ...payload }));

    if (docs.length === 0) return [];

    // Bulk insert; `ordered: false` so one bad doc can't abort the rest.
    return await Notification.insertMany(docs, { ordered: false });
  } catch (error) {
    console.error('notifyMany error:', error.message);
    return [];
  }
};

module.exports = { notify, notifyMany };
