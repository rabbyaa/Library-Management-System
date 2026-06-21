const express = require('express');
const router = express.Router();
const Book = require('../models/Book');

// GET all books
router.get('/', async (req, res) => {
    try {
        const books = await Book.find().sort({ book_id: 1 });
        res.json({
            success: true,
            count: books.length,
            data: books
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET single book by ID
router.get('/:id', async (req, res) => {
    try {
        const book = await Book.findOne({ book_id: parseInt(req.params.id) });
        if (!book) {
            return res.status(404).json({ success: false, message: 'Book not found' });
        }
        res.json({ success: true, data: book });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET books by category
router.get('/category/:category', async (req, res) => {
    try {
        const books = await Book.find({ category_name: req.params.category });
        res.json({ success: true, count: books.length, data: books });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST create new book
router.post('/', async (req, res) => {
    try {
        const lastBook = await Book.findOne().sort({ book_id: -1 });
        const newBookId = lastBook ? lastBook.book_id + 1 : 1;
        
        const book = new Book({
            ...req.body,
            book_id: newBookId
        });
        
        const savedBook = await book.save();
        res.status(201).json({ success: true, data: savedBook });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// PUT update book
router.put('/:id', async (req, res) => {
    try {
        const book = await Book.findOneAndUpdate(
            { book_id: parseInt(req.params.id) },
            req.body,
            { new: true, runValidators: true }
        );
        if (!book) {
            return res.status(404).json({ success: false, message: 'Book not found' });
        }
        res.json({ success: true, data: book });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// DELETE book
router.delete('/:id', async (req, res) => {
    try {
        const book = await Book.findOneAndDelete({ book_id: parseInt(req.params.id) });
        if (!book) {
            return res.status(404).json({ success: false, message: 'Book not found' });
        }
        res.json({ success: true, message: 'Book deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// SEARCH books
router.get('/search/:query', async (req, res) => {
    try {
        const books = await Book.find({
            $or: [
                { title: { $regex: req.params.query, $options: 'i' } },
                { isbn: { $regex: req.params.query, $options: 'i' } },
                { category_name: { $regex: req.params.query, $options: 'i' } }
            ]
        });
        res.json({ success: true, count: books.length, data: books });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;