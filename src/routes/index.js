const router = require('express').Router();
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const chatRoutes = require('./chatRoutes');

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/chat', chatRoutes);

module.exports = router;
