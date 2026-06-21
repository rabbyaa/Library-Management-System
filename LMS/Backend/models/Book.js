const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    isbn: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        enum: ['Computer Science', 'Mathematics', 'Literature', 'History', 'Science']
    },
    publisher: {
        name: String,
        country: String
    },
    authors: [{
        firstName: String,
        lastName: String,
        nationality: String
    }],
    totalCopies: {
        type: Number,
        required: true,
        min: 0
    },
    availableCopies: {
        type: Number,
        required: true,
        min: 0
    },
    shelfLocation: String,
    condition: {
        type: String,
        enum: ['New', 'Good', 'Fair', 'Damaged'],
        default: 'Good'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Book', bookSchema);