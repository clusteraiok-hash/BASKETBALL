const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Booking = sequelize.define('Booking', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    type: {
        type: DataTypes.ENUM('weekly', 'monthly'),
        allowNull: false
    },
    month: {
        type: DataTypes.STRING, // e.g., "2026-01"
        allowNull: false
    },
    players: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    },
    amount: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('pending', 'confirmed', 'cancelled', 'expired'),
        defaultValue: 'pending'
    },
    paymentId: {
        type: DataTypes.STRING,
        allowNull: true
    },
    confirmedAt: {
        type: DataTypes.DATE,
        allowNull: true
    }
});

module.exports = Booking;
