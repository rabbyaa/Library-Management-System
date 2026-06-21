const mongoose = require('mongoose');

const borrowSchema = new mongoose.Schema({
    member: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Member',
        required: true
    },
    book: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Book',
        required: true
    },
    borrowDate: {
        type: Date,
        default: Date.now
    },
    dueDate: {
        type: Date,
        required: true
    },
    returnDate: Date,
    status: {
        type: String,
        enum: ['Borrowed', 'Returned', 'Overdue'],
        default: 'Borrowed'
    },
    fine: {
        amount: {
            type: Number,
            default: 0
        },
        paid: {
            type: Boolean,
            default: false
        },
        paidDate: Date
    },
    transactionLog: [{
        action: String,
        staff: String,
        timestamp: Date
    }]
});

module.exports = mongoose.model('Borrow', borrowSchema);