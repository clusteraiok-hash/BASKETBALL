const express = require('express');
const router = express.Router();
const {
    createBooking,
    getMyBookings,
    getAllBookings,
    updateBookingStatus,
} = require('../controllers/bookingController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, createBooking)
    .get(protect, admin, getAllBookings);

router.get('/my', protect, getMyBookings);
router.patch('/:id', protect, admin, updateBookingStatus);

module.exports = router;
