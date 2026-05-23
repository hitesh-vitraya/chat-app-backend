const router = require('express').Router();
const { searchUsers } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.get('/search', protect, searchUsers);

module.exports = router;
