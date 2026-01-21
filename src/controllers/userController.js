const User = require('../models/User');

// @desc    Get all users (Admin)
// @route   GET /api/users
exports.getUsers = async (req, res) => {
    const users = await User.findAll({
        attributes: { exclude: ['password'] },
        order: [['createdAt', 'DESC']],
    });
    res.json(users);
};

// @desc    Get user profile
// @route   GET /api/users/profile
exports.getUserProfile = async (req, res) => {
    const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password'] },
    });
    if (user) {
        res.json(user);
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};
