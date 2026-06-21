const express = require('express');
const router = express.Router();
const Borrow = require('../models/Borrow');
const Book = require('../models/Book');
const Member = require('../models/Member');
const Fine = require('../models/Fine');

// GET all borrows
router.get('/', async (req, res) => {
    try {
        const borrows = await Borrow.find().sort({ borrow_date: -1 });
        res.json({
            success: true,
            count: borrows.length,
            data: borrows
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET active borrows
router.get('/active', async (req, res) => {
    try {
        const borrows = await Borrow.find({ status: 'Borrowed', return_date: null });
        res.json({ success: true, count: borrows.length, data: borrows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET overdue borrows
router.get('/overdue', async (req, res) => {
    try {
        const today = new Date();
        const borrows = await Borrow.find({ 
            status: 'Borrowed', 
            due_date: { $lt: today },
            return_date: null
        });
        res.json({ success: true, count: borrows.length, data: borrows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST issue a book
router.post('/issue', async (req, res) => {
    try {
        const { member_id, book_id } = req.body;
        
        // Check if book is available
        const book = await Book.findOne({ book_id: book_id });
        if (!book) {
            return res.status(404).json({ success: false, message: 'Book not found' });
        }
        if (book.available_copies <= 0) {
            return res.status(400).json({ success: false, message: 'No copies available' });
        }
        
        // Check member
        const member = await Member.findOne({ member_id: member_id });
        if (!member) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }
        
        // Calculate due date (14 days from now)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14);
        
        // Get last borrow ID
        const lastBorrow = await Borrow.findOne().sort({ borrow_id: -1 });
        const newBorrowId = lastBorrow ? lastBorrow.borrow_id + 1 : 1;
        
        // Create borrow record
        const borrow = new Borrow({
            borrow_id: newBorrowId,
            member_id: member_id,
            book_id: book_id,
            book_title: book.title,
            borrow_date: new Date(),
            due_date: dueDate,
            status: 'Borrowed'
        });
        
        await borrow.save();
        
        // Update book available copies
        book.available_copies -= 1;
        await book.save();
        
        // Update member total borrowed
        member.total_borrowed += 1;
        await member.save();
        
        res.status(201).json({ success: true, data: borrow });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// PUT return a book
router.put('/return/:id', async (req, res) => {
    try {
        const borrow = await Borrow.findOne({ borrow_id: parseInt(req.params.id) });
        if (!borrow) {
            return res.status(404).json({ success: false, message: 'Borrow record not found' });
        }
        
        if (borrow.status === 'Returned') {
            return res.status(400).json({ success: false, message: 'Book already returned' });
        }
        
        const returnDate = new Date();
        borrow.return_date = returnDate;
        
        // Check if overdue
        let fineAmount = 0;
        let daysLate = 0;
        if (returnDate > borrow.due_date) {
            daysLate = Math.ceil((returnDate - borrow.due_date) / (1000 * 60 * 60 * 24));
            fineAmount = daysLate * 10; // $10 per day
            borrow.status = 'Overdue';
        } else {
            borrow.status = 'Returned';
        }
        
        await borrow.save();
        
        // Update book available copies
        const book = await Book.findOne({ book_id: borrow.book_id });
        book.available_copies += 1;
        await book.save();
        
        // Update member total borrowed
        const member = await Member.findOne({ member_id: borrow.member_id });
        member.total_borrowed -= 1;
        
        // Create fine if applicable
        if (fineAmount > 0) {
            const lastFine = await Fine.findOne().sort({ fine_id: -1 });
            const newFineId = lastFine ? lastFine.fine_id + 1 : 1;
            
            const fine = new Fine({
                fine_id: newFineId,
                borrow_id: borrow.borrow_id,
                member_id: member.member_id,
                member_name: member.name,
                amount: fineAmount,
                days_late: daysLate,
                rate_per_day: 10,
                status: 'Unpaid'
            });
            await fine.save();
            
            member.total_fines += fineAmount;
        }
        
        await member.save();
        
        res.json({ success: true, data: borrow, fine_amount: fineAmount });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

module.exports = router;