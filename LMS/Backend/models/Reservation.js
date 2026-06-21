const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
    reservation_id: { type: Number, unique: true },
    member_id: Number,
    member_name: String,
    book_id: Number,
    book_title: String,
    reservation_date: Date,
    status: { type: String, enum: ['Pending', 'Fulfilled', 'Cancelled'], default: 'Pending' },
    expiry_date: Date,
    fulfilled_date: Date,
    cancelled_date: Date,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Reservation', reservationSchema);