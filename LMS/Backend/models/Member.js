const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    phone: String,
    joinDate: {
        type: Date,
        default: Date.now
    },
    membershipType: {
        type: String,
        enum: ['Standard', 'Premium', 'Student', 'Faculty'],
        default: 'Standard'
    },
    membershipDetails: {
        maxBooks: Number,
        durationDays: Number
    },
    status: {
        type: String,
        enum: ['Active', 'Expired', 'Suspended'],
        default: 'Active'
    },
    totalBorrowed: {
        type: Number,
        default: 0
    },
    fines: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model('Member', memberSchema);