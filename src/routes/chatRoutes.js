const router = require('express').Router();
const { getConversations, getMessages } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

router.get('/conversations', protect, getConversations);
router.get('/messages/:conversationId', protect, getMessages);

module.exports = router;
