const Notification = require('../models/Notification');
const User = require('../models/User');

// Fire-and-forget notification helpers. These NEVER throw — a notification
// failure must not break the primary business operation (enrolment, grading,
// content creation). Errors are logged and swallowed.
//
// Multi-tenancy: every notification is stamped with the recipient's tenant so
// reads can be tenant-scoped. The tenant is derived from the recipient user
// (unless the caller already supplied `payload.tenantId`); a missing/unknown
// recipient falls back to the shared 'default' tenant.

const resolveTenantId = async (recipientId) => {
  try {
    const user = await User.findById(recipientId).select('tenantId');
    return user?.tenantId || 'default';
  } catch {
    return 'default';
  }
};

const resolveTenantMap = async (recipientIds) => {
  const map = new Map();
  try {
    const users = await User.find({ _id: { $in: recipientIds } }).select('tenantId');
    users.forEach((user) => map.set(user._id.toString(), user.tenantId || 'default'));
  } catch {
    /* swallowed — callers fall back to 'default' per recipient */
  }
  return map;
};

const notify = async (recipientId, payload = {}) => {
  try {
    if (!recipientId) return null;
    const tenantId = payload.tenantId || (await resolveTenantId(recipientId));
    return await Notification.create({ recipient: recipientId, ...payload, tenantId });
  } catch (error) {
    console.error('notify error:', error.message);
    return null;
  }
};

const notifyMany = async (recipientIds, payload = {}) => {
  try {
    const ids = (recipientIds || []).filter(Boolean);
    if (ids.length === 0) return [];

    // Resolve each recipient's tenant in a single query (unless the caller
    // already supplied an explicit tenant for the whole batch).
    const tenantById = payload.tenantId ? null : await resolveTenantMap(ids);

    const docs = ids.map((recipient) => ({
      recipient,
      ...payload,
      tenantId: payload.tenantId || tenantById.get(recipient.toString()) || 'default',
    }));

    // Bulk insert; `ordered: false` so one bad doc can't abort the rest.
    return await Notification.insertMany(docs, { ordered: false });
  } catch (error) {
    console.error('notifyMany error:', error.message);
    return [];
  }
};

module.exports = { notify, notifyMany };
