const mongoose = require('mongoose');

const fineSchema = new mongoose.Schema({
    fine_id: { type: Number, unique: true },
    borrow_id: { type: Number, unique: true },
    member_id: Number,
    member_name: String,
    amount: Number,
    days_late: Number,
    rate_per_day: Number,
    status: { type: String, enum: ['Paid', 'Unpaid'], default: 'Unpaid' },
    paid_date: Date,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Fine', fineSchema);