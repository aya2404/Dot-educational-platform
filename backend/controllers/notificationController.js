const mongoose = require('mongoose');
const Notification = require('../models/Notification');

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

// All handlers are strictly scoped to the authenticated user (req.user). A user
// can only ever see or mutate their own notifications — recipient is never taken
// from the client. Reads are additionally tenant-scoped (Super Admin excepted).

// Build the base owner filter, adding the tenant scope for non-superadmins.
// Missing req.tenantId falls back to 'default' with a warning.
const scopedFilter = (req, extra = {}) => {
  if (!req.tenantId) {
    console.warn('notificationController: req.tenantId missing — defaulting to "default" tenant');
  }
  const filter = { recipient: req.user._id, ...extra };
  if (req.user?.role !== 'superadmin') {
    filter.tenantId = req.tenantId || 'default';
  }
  return filter;
};

const getMyNotifications = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const filter = scopedFilter(req);

    const [items, unreadCount, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments({ ...filter, isRead: false }),
      Notification.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: items,
      unreadCount,
      page,
      hasMore: skip + items.length < total,
    });
  } catch (error) {
    console.error('getMyNotifications error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments(scopedFilter(req, { isRead: false }));
    return res.json({ success: true, unreadCount });
  } catch (error) {
    console.error('getUnreadCount error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

const markRead = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرف الإشعار غير صالح' });
    }

    // Scope to the owner AND tenant: a notification belonging to another user (or
    // another tenant) simply is not found for this caller (404) — no cross-user
    // or cross-tenant access, no information leak.
    const notification = await Notification.findOne(scopedFilter(req, { _id: req.params.id }));

    if (!notification) {
      return res.status(404).json({ success: false, message: 'الإشعار غير موجود' });
    }

    if (!notification.isRead) {
      notification.isRead = true;
      await notification.save();
    }

    return res.json({ success: true, data: notification });
  } catch (error) {
    console.error('markRead error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

const markAllRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      scopedFilter(req, { isRead: false }),
      { $set: { isRead: true } }
    );
    return res.json({ success: true, modified: result.modifiedCount || 0 });
  } catch (error) {
    console.error('markAllRead error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

const deleteNotification = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرف الإشعار غير صالح' });
    }

    // Owner- and tenant-scoped: a notification belonging to another user or
    // tenant is simply not found (404), so it can never be deleted cross-boundary.
    const notification = await Notification.findOneAndDelete(
      scopedFilter(req, { _id: req.params.id })
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'الإشعار غير موجود' });
    }

    return res.json({ success: true, message: 'تم حذف الإشعار' });
  } catch (error) {
    console.error('deleteNotification error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

module.exports = {
  getMyNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  deleteNotification,
};
