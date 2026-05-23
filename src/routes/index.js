const router = require('express').Router();
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const chatRoutes = require('./chatRoutes');
const userRoutes = require('./userRoutes');

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/chat', chatRoutes);
router.use('/users', userRoutes);

module.exports = router;
