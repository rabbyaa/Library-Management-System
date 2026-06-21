const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = 'mongodb://localhost:27017/SP26_DB_LMS';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const db = mongoose.connection;

db.on('error', (error) => {
    console.error('❌ MongoDB Connection Error:', error);
});

db.once('open', () => {
    console.log('✅ Connected to MongoDB: SP26_DB_LMS');
    console.log('📚 Collections available:', Object.keys(db.collections));
});

// API Routes
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Library Management System API',
        database: 'SP26_DB_LMS',
        status: 'Running',
        endpoints: {
            books: '/api/books',
            members: '/api/members',
            borrows: '/api/borrows',
            dashboard: '/api/dashboard'
        }
    });
});

// Get all books
app.get('/api/books', async (req, res) => {
    try {
        const books = await db.collection('books').find({}).toArray();
        res.json({
            success: true,
            count: books.length,
            data: books
        });
    } catch (error) {
        console.error('Error fetching books:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get single book
app.get('/api/books/:id', async (req, res) => {
    try {
        const book = await db.collection('books').findOne({ book_id: parseInt(req.params.id) });
        if (!book) {
            return res.status(404).json({ success: false, message: 'Book not found' });
        }
        res.json({ success: true, data: book });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create book
app.post('/api/books', async (req, res) => {
    try {
        const books = await db.collection('books').find({}).toArray();
        const newId = books.length > 0 ? Math.max(...books.map(b => b.book_id)) + 1 : 1;
        
        const newBook = {
            book_id: newId,
            ...req.body,
            createdAt: new Date()
        };
        
        await db.collection('books').insertOne(newBook);
        res.json({ success: true, data: newBook });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get all members
app.get('/api/members', async (req, res) => {
    try {
        const members = await db.collection('members').find({}).toArray();
        res.json({
            success: true,
            count: members.length,
            data: members
        });
    } catch (error) {
        console.error('Error fetching members:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get single member
app.get('/api/members/:id', async (req, res) => {
    try {
        const member = await db.collection('members').findOne({ member_id: parseInt(req.params.id) });
        if (!member) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }
        res.json({ success: true, data: member });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create member
app.post('/api/members', async (req, res) => {
    try {
        const members = await db.collection('members').find({}).toArray();
        const newId = members.length > 0 ? Math.max(...members.map(m => m.member_id)) + 1 : 1;
        
        const newMember = {
            member_id: newId,
            ...req.body,
            join_date: new Date(),
            status: 'Active',
            total_borrowed: 0,
            total_fines: 0
        };
        
        await db.collection('members').insertOne(newMember);
        res.json({ success: true, data: newMember });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get all borrows
app.get('/api/borrows', async (req, res) => {
    try {
        const borrows = await db.collection('borrows').find({}).toArray();
        res.json({
            success: true,
            count: borrows.length,
            data: borrows
        });
    } catch (error) {
        console.error('Error fetching borrows:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Issue a book
app.post('/api/borrows/issue', async (req, res) => {
    try {
        const { member_id, book_id } = req.body;
        
        // Check if book exists and has available copies
        const book = await db.collection('books').findOne({ book_id: parseInt(book_id) });
        if (!book) {
            return res.status(404).json({ success: false, message: 'Book not found' });
        }
        if (book.available_copies <= 0) {
            return res.status(400).json({ success: false, message: 'No copies available' });
        }
        
        // Check if member exists
        const member = await db.collection('members').findOne({ member_id: parseInt(member_id) });
        if (!member) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }
        
        // Get membership limits
        const membershipLimits = { Standard: 3, Premium: 7, Student: 5, Faculty: 10 };
        const maxBooks = membershipLimits[member.membership_type] || 3;
        
        if (member.total_borrowed >= maxBooks) {
            return res.status(400).json({ success: false, message: 'Member has reached borrowing limit' });
        }
        
        // Calculate due date (14 days from now)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14);
        
        // Get borrow count for new ID
        const borrows = await db.collection('borrows').find({}).toArray();
        const newId = borrows.length > 0 ? Math.max(...borrows.map(b => b.borrow_id)) + 1 : 1;
        
        // Create borrow record
        const newBorrow = {
            borrow_id: newId,
            member_id: parseInt(member_id),
            book_id: parseInt(book_id),
            book_title: book.title,
            borrow_date: new Date(),
            due_date: dueDate,
            status: 'Borrowed',
            createdAt: new Date()
        };
        
        await db.collection('borrows').insertOne(newBorrow);
        
        // Update book available copies
        await db.collection('books').updateOne(
            { book_id: parseInt(book_id) },
            { $inc: { available_copies: -1 } }
        );
        
        // Update member total borrowed
        await db.collection('members').updateOne(
            { member_id: parseInt(member_id) },
            { $inc: { total_borrowed: 1 } }
        );
        
        res.json({ success: true, data: newBorrow });
    } catch (error) {
        console.error('Error issuing book:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Return a book
app.put('/api/borrows/return/:id', async (req, res) => {
    try {
        const borrowId = parseInt(req.params.id);
        const borrow = await db.collection('borrows').findOne({ borrow_id: borrowId });
        
        if (!borrow) {
            return res.status(404).json({ success: false, message: 'Borrow record not found' });
        }
        
        if (borrow.status === 'Returned') {
            return res.status(400).json({ success: false, message: 'Book already returned' });
        }
        
        const returnDate = new Date();
        let fineAmount = 0;
        
        // Calculate fine if overdue
        if (returnDate > new Date(borrow.due_date)) {
            const daysLate = Math.ceil((returnDate - new Date(borrow.due_date)) / (1000 * 60 * 60 * 24));
            fineAmount = daysLate * 10;
        }
        
        // Update borrow record
        await db.collection('borrows').updateOne(
            { borrow_id: borrowId },
            { 
                $set: { 
                    return_date: returnDate,
                    status: fineAmount > 0 ? 'Overdue' : 'Returned',
                    fine_amount: fineAmount
                }
            }
        );
        
        // Update book available copies
        await db.collection('books').updateOne(
            { book_id: borrow.book_id },
            { $inc: { available_copies: 1 } }
        );
        
        // Update member total borrowed
        await db.collection('members').updateOne(
            { member_id: borrow.member_id },
            { $inc: { total_borrowed: -1 } }
        );
        
        // Update member fines if applicable
        if (fineAmount > 0) {
            await db.collection('members').updateOne(
                { member_id: borrow.member_id },
                { $inc: { total_fines: fineAmount } }
            );
        }
        
        res.json({ 
            success: true, 
            message: 'Book returned successfully',
            fine_amount: fineAmount 
        });
    } catch (error) {
        console.error('Error returning book:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Dashboard stats
app.get('/api/dashboard', async (req, res) => {
    try {
        const totalBooks = await db.collection('books').countDocuments();
        const totalMembers = await db.collection('members').countDocuments();
        const activeBorrows = await db.collection('borrows').countDocuments({ status: 'Borrowed' });
        const overdueBorrows = await db.collection('borrows').countDocuments({
            status: 'Borrowed',
            due_date: { $lt: new Date() }
        });
        
        const booksByCategory = await db.collection('books').aggregate([
            { $group: { _id: '$category_name', count: { $sum: 1 } } }
        ]).toArray();
        
        const recentBorrows = await db.collection('borrows')
            .find({})
            .sort({ borrow_date: -1 })
            .limit(5)
            .toArray();
        
        res.json({
            success: true,
            data: {
                totalBooks,
                totalMembers,
                activeBorrows,
                overdueBorrows,
                booksByCategory,
                recentBorrows
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📚 API endpoints:`);
    console.log(`   - GET  /`);
    console.log(`   - GET  /api/books`);
    console.log(`   - GET  /api/members`);
    console.log(`   - GET  /api/borrows`);
    console.log(`   - GET  /api/dashboard`);
    console.log(`   - POST /api/books`);
    console.log(`   - POST /api/members`);
    console.log(`   - POST /api/borrows/issue`);
    console.log(`   - PUT  /api/borrows/return/:id`);
});