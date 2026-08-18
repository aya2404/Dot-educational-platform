const mongoose = require('mongoose');

const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const { resolveCourseAccess } = require('../utils/courseAccess');
const { triggerActivity } = require('../utils/gamification');
const { notifyMany } = require('../utils/notifications');

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

// Resolve the caller's tenant. Missing req.tenantId (should not happen after the
// protect middleware) falls back to the shared 'default' tenant with a warning.
const getTenantId = (req) => {
  if (!req.tenantId) {
    console.warn('chatController: req.tenantId missing — defaulting to "default" tenant');
  }
  return req.tenantId || 'default';
};

// Load a chat the caller participates in, tenant-scoped (Super Admin excepted).
// Returns null when the chat does not exist / the caller is not a participant /
// it belongs to another tenant — callers respond 404 in every case.
const findParticipantChat = async (req, chatId) => {
  if (!isValidObjectId(chatId)) {
    return null;
  }
  const filter = { _id: chatId, participants: req.user._id };
  if (req.user?.role !== 'superadmin') {
    filter.tenantId = getTenantId(req);
  }
  return Chat.findOne(filter);
};

// POST /api/chats — find or create a direct chat with another user, or a course
// group chat. Body: { userId } for a 1:1, or { courseId } for a course group.
const getOrCreateChat = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { userId, courseId } = req.body;

    // ---- Course group chat ----
    if (courseId) {
      const access = await resolveCourseAccess({ courseId, user: req.user });
      if (!access.course) {
        return res.status(access.statusCode).json({ success: false, message: access.message });
      }

      let chat = await Chat.findOne({ course: access.course._id, isGroupChat: true, tenantId });
      if (!chat) {
        chat = await Chat.create({
          participants: [req.user._id],
          course: access.course._id,
          isGroupChat: true,
          tenantId,
        });
      } else if (!chat.participants.some((p) => p.toString() === req.user._id.toString())) {
        chat.participants.push(req.user._id);
        await chat.save();
      }

      await chat.populate('participants', 'name role');
      await chat.populate('course', 'name');
      return res.status(200).json({ success: true, data: chat });
    }

    // ---- Direct 1:1 chat ----
    if (!userId || !isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: 'معرف المستخدم غير صالح' });
    }
    if (userId.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'لا يمكنك بدء محادثة مع نفسك' });
    }

    // The target must exist and (unless Super Admin) share the caller's tenant.
    const target = await User.findById(userId).select('tenantId isActive');
    if (!target || (req.user.role !== 'superadmin' && target.tenantId !== tenantId)) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    let chat = await Chat.findOne({
      isGroupChat: false,
      tenantId,
      participants: { $all: [req.user._id, target._id], $size: 2 },
    });

    if (!chat) {
      chat = await Chat.create({
        participants: [req.user._id, target._id],
        isGroupChat: false,
        tenantId,
      });
    }

    await chat.populate('participants', 'name role');
    return res.status(200).json({ success: true, data: chat });
  } catch (error) {
    console.error('getOrCreateChat error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

// GET /api/chats — the caller's chats, most recent first, tenant-scoped.
const getMyChats = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const filter = { participants: req.user._id };
    if (req.user?.role !== 'superadmin') {
      filter.tenantId = tenantId;
    }

    const chats = await Chat.find(filter)
      .populate('participants', 'name role')
      .populate('course', 'name')
      .sort({ updatedAt: -1 });

    return res.json({ success: true, count: chats.length, data: chats });
  } catch (error) {
    console.error('getMyChats error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

// GET /api/chats/:chatId/messages — paginated, oldest-first within the page.
const getMessages = async (req, res) => {
  try {
    const chat = await findParticipantChat(req, req.params.chatId);
    if (!chat) {
      return res.status(404).json({ success: false, message: 'المحادثة غير موجودة' });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Message.find({ chat: chat._id })
        .populate('sender', 'name role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Message.countDocuments({ chat: chat._id }),
    ]);

    return res.json({
      success: true,
      data: items.reverse(), // ascending within the page for a natural thread
      page,
      hasMore: skip + items.length < total,
    });
  } catch (error) {
    console.error('getMessages error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

// POST /api/chats/:chatId/messages — send a message (sender is marked as read).
const sendMessage = async (req, res) => {
  try {
    const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
    if (!content) {
      return res.status(400).json({ success: false, message: 'لا يمكن إرسال رسالة فارغة' });
    }

    const chat = await findParticipantChat(req, req.params.chatId);
    if (!chat) {
      return res.status(404).json({ success: false, message: 'المحادثة غير موجودة' });
    }

    const message = await Message.create({
      chat: chat._id,
      sender: req.user._id,
      content,
      readBy: [req.user._id],
      tenantId: chat.tenantId, // inherit the chat's tenant
    });

    // Bump the chat so it surfaces to the top of participants' lists.
    await Chat.updateOne({ _id: chat._id }, { $set: { updatedAt: new Date() } });

    // Privacy: alert the OTHER participants that *something* arrived — never the
    // sender's name or the message text. The red badge increments; users must
    // open the chat to see who sent what. Fire-and-forget (notifyMany never throws).
    const recipients = chat.participants.filter(
      (participant) => participant.toString() !== req.user._id.toString()
    );
    notifyMany(recipients, {
      type: 'CHAT_MESSAGE',
      title: 'دردشة',
      message: 'رسالة جديدة في الدردشة',
      // Clicking navigates to the course page (group chats only; direct chats
      // have no course, so no link). Never reveals the sender or content.
      link: chat.course ? `/student/course/${chat.course}` : '',
      tenantId: chat.tenantId,
    });

    // Gamification: reward students for participating in course chat. Fire-and-
    // forget and student-only (staff messages don't earn XP).
    if (req.user.role === 'student') {
      triggerActivity(req.user._id, 'chat_message');
    }

    await message.populate('sender', 'name role');
    return res.status(201).json({ success: true, data: message });
  } catch (error) {
    console.error('sendMessage error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

// PATCH /api/chats/:chatId/read — mark every message in the chat read by caller.
const markMessagesAsRead = async (req, res) => {
  try {
    const chat = await findParticipantChat(req, req.params.chatId);
    if (!chat) {
      return res.status(404).json({ success: false, message: 'المحادثة غير موجودة' });
    }

    const result = await Message.updateMany(
      { chat: chat._id, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );

    return res.json({ success: true, modified: result.modifiedCount || 0 });
  } catch (error) {
    console.error('markMessagesAsRead error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

module.exports = {
  getOrCreateChat,
  getMyChats,
  getMessages,
  sendMessage,
  markMessagesAsRead,
};
