const express = require('express');
const router = express.Router();
const { getUsers, getUserProfile } = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/', protect, admin, getUsers);
router.get('/profile', protect, getUserProfile);

module.exports = router;
