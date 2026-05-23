const router = require('express').Router();
const { getConversations, getMessages, startConversation } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

router.get('/conversations', protect, getConversations);
router.get('/messages/:conversationId', protect, getMessages);
router.post('/start', protect, startConversation);

module.exports = router;
