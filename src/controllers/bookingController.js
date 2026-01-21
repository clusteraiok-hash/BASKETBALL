const Booking = require('../models/Booking');
const User = require('../models/User');

// @desc    Create new booking
// @route   POST /api/bookings
exports.createBooking = async (req, res) => {
    const { type, month, players, amount } = req.body;

    const booking = await Booking.create({
        type,
        month,
        players,
        amount,
        UserId: req.user.id,
    });

    res.status(201).json(booking);
};

// @desc    Get logged in user bookings
// @route   GET /api/bookings/my
exports.getMyBookings = async (req, res) => {
    const bookings = await Booking.findAll({
        where: { UserId: req.user.id },
        order: [['createdAt', 'DESC']],
    });
    res.json(bookings);
};

// @desc    Get all bookings (Admin)
// @route   GET /api/bookings
exports.getAllBookings = async (req, res) => {
    const bookings = await Booking.findAll({
        include: [{ model: User, attributes: ['name', 'email'] }],
        order: [['createdAt', 'DESC']],
    });
    res.json(bookings);
};

// @desc    Update booking status
// @route   PATCH /api/bookings/:id
exports.updateBookingStatus = async (req, res) => {
    const booking = await Booking.findByPk(req.params.id);

    if (booking) {
        booking.status = req.body.status || booking.status;
        booking.paymentId = req.body.paymentId || booking.paymentId;
        if (req.body.status === 'confirmed') {
            booking.confirmedAt = new Date();
        }

        const updatedBooking = await booking.save();
        res.json(updatedBooking);
    } else {
        res.status(404).json({ message: 'Booking not found' });
    }
};
