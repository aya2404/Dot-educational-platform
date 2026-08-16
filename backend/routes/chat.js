const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getOrCreateChat,
  getMyChats,
  getMessages,
  sendMessage,
  markMessagesAsRead,
} = require('../controllers/chatController');

// Every chat route requires authentication and is scoped to req.user / tenant.
router.use(protect);

router.get('/', getMyChats);
router.post('/', getOrCreateChat);
router.get('/:chatId/messages', getMessages);
router.post('/:chatId/messages', sendMessage);
router.patch('/:chatId/read', markMessagesAsRead);

module.exports = router;
