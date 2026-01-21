const jwt = require('jsonwebtoken');
require('dotenv').config();

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'basketball_secret_123', {
        expiresIn: '30d',
    });
};

module.exports = generateToken;
