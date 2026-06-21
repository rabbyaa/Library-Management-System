const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to YOUR database - SP26_DB_LMS
const MONGODB_URI = 'mongodb://localhost:27017/SP26_DB_LMS';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;

db.on('error', console.error.bind(console, '❌ MongoDB Connection Error:'));
db.once('open', async () => {
    console.log('✅ Connected to MongoDB Database: SP26_DB_LMS');
    await initializeDatabase();
});

async function initializeDatabase() {
    try {
        // Check if collections exist, create if not
        const collections = await db.db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        
        // Create users collection for authentication
        if (!collectionNames.includes('users')) {
            await db.db.createCollection('users');
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await db.db.collection('users').insertOne({
                username: 'admin',
                password: hashedPassword,
                role: 'admin',
                name: 'System Administrator',
                email: 'admin@bookflow.com',
                createdAt: new Date()
            });
            console.log('✅ Admin user created: admin / admin123');
        }
        
        // Create books collection if not exists
        if (!collectionNames.includes('books')) {
            await db.db.createCollection('books');
            // Add sample books
            await db.db.collection('books').insertMany([
                { book_id: 1, title: "Database System Concepts", isbn: "978-0078022159", category_name: "Computer Science", publisher_name: "McGraw-Hill", total_copies: 5, available_copies: 5, author_name: "Silberschatz", shelf_location: "A-01", created_at: new Date() },
                { book_id: 2, title: "Introduction to Algorithms", isbn: "978-0262033848", category_name: "Computer Science", publisher_name: "MIT Press", total_copies: 4, available_copies: 4, author_name: "Cormen", shelf_location: "A-02", created_at: new Date() },
                { book_id: 3, title: "Sapiens: A Brief History", isbn: "978-0062316097", category_name: "History", publisher_name: "HarperCollins", total_copies: 6, available_copies: 6, author_name: "Harari", shelf_location: "B-01", created_at: new Date() },
                { book_id: 4, title: "Clean Code", isbn: "978-0132350884", category_name: "Computer Science", publisher_name: "Prentice Hall", total_copies: 3, available_copies: 3, author_name: "Martin", shelf_location: "A-03", created_at: new Date() }
            ]);
            console.log('✅ Sample books added');
        }
        
        // Create members collection
        if (!collectionNames.includes('members')) {
            await db.db.createCollection('members');
            await db.db.collection('members').insertMany([
                { member_id: 1, name: "John Doe", email: "john@example.com", phone: "1234567890", membership_type: "Standard", status: "Active", total_borrowed: 0, total_fines: 0, join_date: new Date() },
                { member_id: 2, name: "Jane Smith", email: "jane@example.com", phone: "0987654321", membership_type: "Premium", status: "Active", total_borrowed: 0, total_fines: 0, join_date: new Date() }
            ]);
            console.log('✅ Sample members added');
        }
        
        // Create borrows collection
        if (!collectionNames.includes('borrows')) {
            await db.db.createCollection('borrows');
            console.log('✅ Borrows collection created');
        }
        
        // Create fines collection
        if (!collectionNames.includes('fines')) {
            await db.db.createCollection('fines');
            console.log('✅ Fines collection created');
        }
        
        console.log('📚 All collections ready');
        console.log(`📊 Available collections: ${collectionNames.join(', ')}`);
    } catch (error) {
        console.error('Error initializing database:', error);
    }
}

// Helper function to get collection
const getCollection = (name) => db.db.collection(name);

// ============= AUTHENTICATION MIDDLEWARE =============
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }
    
    try {
        const decoded = jwt.verify(token, 'BOOKFLOW_SECRET_KEY_2024');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
    }
};

const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required.' });
    }
    next();
};

// ============= AUTHENTICATION ROUTES =============
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log(`Login attempt: ${username}`);
        
        const usersCollection = getCollection('users');
        const user = await usersCollection.findOne({ username });
        
        if (!user) {
            console.log(`User not found: ${username}`);
            return res.status(401).json({ success: false, message: 'Invalid username or password.' });
        }
        
        // Compare password (supports both hashed and plain text for backward compatibility)
        let isValid = false;
        if (user.password.startsWith('$2a$')) {
            isValid = await bcrypt.compare(password, user.password);
        } else {
            isValid = (user.password === password);
        }
        
        if (!isValid) {
            console.log(`Invalid password for: ${username}`);
            return res.status(401).json({ success: false, message: 'Invalid username or password.' });
        }
        
        const token = jwt.sign(
            { 
                id: user._id, 
                username: user.username, 
                role: user.role,
                memberId: user.memberId 
            },
            'BOOKFLOW_SECRET_KEY_2024',
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            token,
            user: {
                username: user.username,
                role: user.role,
                name: user.name,
                memberId: user.memberId
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error during login.' });
    }
});

// ============= BOOK MANAGEMENT =============
// Get all books
app.get('/api/books', authenticateToken, async (req, res) => {
    try {
        const books = await getCollection('books').find({}).toArray();
        const formattedBooks = books.map(book => ({
            bookId: book.book_id,
            title: book.title,
            isbn: book.isbn,
            category: book.category_name,
            publisher: book.publisher_name,
            totalCopies: book.total_copies,
            availableCopies: book.available_copies,
            author: book.author_name || 'Unknown',
            shelfLocation: book.shelf_location
        }));
        res.json({ success: true, data: formattedBooks, count: formattedBooks.length });
    } catch (error) {
        console.error('Error fetching books:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch books.' });
    }
});

// Get single book
app.get('/api/books/:id', authenticateToken, async (req, res) => {
    try {
        const book = await getCollection('books').findOne({ book_id: parseInt(req.params.id) });
        if (!book) {
            return res.status(404).json({ success: false, message: 'Book not found.' });
        }
        res.json({ success: true, data: book });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch book.' });
    }
});

// Add new book (Admin only)
app.post('/api/books', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { title, isbn, category, publisher, totalCopies, author, shelfLocation } = req.body;
        
        // Get next book ID
        const books = await getCollection('books').find({}).toArray();
        const newId = books.length > 0 ? Math.max(...books.map(b => b.book_id)) + 1 : 1;
        
        const newBook = {
            book_id: newId,
            title: title,
            isbn: isbn,
            category_name: category,
            publisher_name: publisher,
            total_copies: totalCopies,
            available_copies: totalCopies,
            author_name: author || '',
            shelf_location: shelfLocation || '',
            created_at: new Date()
        };
        
        await getCollection('books').insertOne(newBook);
        res.json({ success: true, message: 'Book added successfully.', bookId: newId });
    } catch (error) {
        console.error('Error adding book:', error);
        res.status(500).json({ success: false, message: 'Failed to add book.' });
    }
});

// Update book (Admin only)
app.put('/api/books/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const bookId = parseInt(req.params.id);
        const { title, isbn, category, publisher, totalCopies, author, shelfLocation } = req.body;
        
        const result = await getCollection('books').updateOne(
            { book_id: bookId },
            { 
                $set: {
                    title: title,
                    isbn: isbn,
                    category_name: category,
                    publisher_name: publisher,
                    total_copies: totalCopies,
                    author_name: author,
                    shelf_location: shelfLocation,
                    updated_at: new Date()
                }
            }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: 'Book not found.' });
        }
        
        res.json({ success: true, message: 'Book updated successfully.' });
    } catch (error) {
        console.error('Error updating book:', error);
        res.status(500).json({ success: false, message: 'Failed to update book.' });
    }
});

// Delete book (Admin only)
app.delete('/api/books/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const bookId = parseInt(req.params.id);
        const result = await getCollection('books').deleteOne({ book_id: bookId });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: 'Book not found.' });
        }
        
        res.json({ success: true, message: 'Book deleted successfully.' });
    } catch (error) {
        console.error('Error deleting book:', error);
        res.status(500).json({ success: false, message: 'Failed to delete book.' });
    }
});

// ============= MEMBER MANAGEMENT =============
// Get all members (Admin only)
app.get('/api/members', authenticateToken, isAdmin, async (req, res) => {
    try {
        const members = await getCollection('members').find({}).toArray();
        res.json({ success: true, data: members });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch members.' });
    }
});

// Add new member (Admin only)
app.post('/api/members', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { name, email, phone, membershipType, address } = req.body;
        
        const members = await getCollection('members').find({}).toArray();
        const newId = members.length > 0 ? Math.max(...members.map(m => m.member_id)) + 1 : 1;
        
        const newMember = {
            member_id: newId,
            name: name,
            email: email,
            phone: phone || '',
            membership_type: membershipType || 'Standard',
            status: 'Active',
            total_borrowed: 0,
            total_fines: 0,
            address: address || '',
            join_date: new Date()
        };
        
        await getCollection('members').insertOne(newMember);
        res.json({ success: true, message: 'Member added successfully.', memberId: newId });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to add member.' });
    }
});

// ============= BORROWING MANAGEMENT =============
// Get all borrows (Admin only)
app.get('/api/borrows', authenticateToken, isAdmin, async (req, res) => {
    try {
        const borrows = await getCollection('borrows').find({}).sort({ borrow_date: -1 }).toArray();
        res.json({ success: true, data: borrows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch borrows.' });
    }
});

// Get my borrows (for members)
app.get('/api/borrows/my', authenticateToken, async (req, res) => {
    try {
        let query = {};
        if (req.user.role !== 'admin' && req.user.memberId) {
            query = { member_id: req.user.memberId };
        }
        const borrows = await getCollection('borrows').find(query).sort({ borrow_date: -1 }).toArray();
        res.json({ success: true, data: borrows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch borrows.' });
    }
});

// Issue a book (Borrow)
app.post('/api/borrows/issue', authenticateToken, async (req, res) => {
    try {
        const { bookId, memberId } = req.body;
        
        // Determine which member is borrowing
        let actualMemberId = memberId;
        if (req.user.role !== 'admin') {
            actualMemberId = req.user.memberId;
            if (!actualMemberId) {
                return res.status(400).json({ success: false, message: 'No member profile linked to this account.' });
            }
        }
        
        // Check if book exists and has available copies
        const book = await getCollection('books').findOne({ book_id: parseInt(bookId) });
        if (!book) {
            return res.status(404).json({ success: false, message: 'Book not found.' });
        }
        if (book.available_copies <= 0) {
            return res.status(400).json({ success: false, message: 'No copies available for borrowing.' });
        }
        
        // Check if member exists and is active
        const member = await getCollection('members').findOne({ member_id: actualMemberId });
        if (!member) {
            return res.status(404).json({ success: false, message: 'Member not found.' });
        }
        if (member.status !== 'Active') {
            return res.status(400).json({ success: false, message: 'Member account is not active.' });
        }
        
        // Check borrowing limit based on membership type
        const limits = { Standard: 3, Premium: 7, Student: 5, Faculty: 10 };
        const maxBooks = limits[member.membership_type] || 3;
        if (member.total_borrowed >= maxBooks) {
            return res.status(400).json({ success: false, message: `Borrowing limit reached (${maxBooks} books max).` });
        }
        
        // Calculate due date (14 days from now)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14);
        
        // Get next borrow ID
        const borrows = await getCollection('borrows').find({}).toArray();
        const newId = borrows.length > 0 ? Math.max(...borrows.map(b => b.borrow_id)) + 1 : 1;
        
        // Create borrow record
        const newBorrow = {
            borrow_id: newId,
            member_id: actualMemberId,
            book_id: parseInt(bookId),
            book_title: book.title,
            borrow_date: new Date(),
            due_date: dueDate,
            status: 'Borrowed',
            created_at: new Date(),
            created_by: req.user.username
        };
        
        await getCollection('borrows').insertOne(newBorrow);
        
        // Update book available copies
        await getCollection('books').updateOne(
            { book_id: parseInt(bookId) },
            { $inc: { available_copies: -1 } }
        );
        
        // Update member total borrowed
        await getCollection('members').updateOne(
            { member_id: actualMemberId },
            { $inc: { total_borrowed: 1 } }
        );
        
        res.json({ 
            success: true, 
            message: 'Book borrowed successfully.', 
            borrowId: newId,
            dueDate: dueDate
        });
    } catch (error) {
        console.error('Error issuing book:', error);
        res.status(500).json({ success: false, message: 'Failed to issue book.' });
    }
});

// Return a book
app.put('/api/borrows/return/:id', authenticateToken, async (req, res) => {
    try {
        const borrowId = parseInt(req.params.id);
        const borrow = await getCollection('borrows').findOne({ borrow_id: borrowId });
        
        if (!borrow) {
            return res.status(404).json({ success: false, message: 'Borrow record not found.' });
        }
        
        // Check permission (admin can return any, users can only return their own)
        if (req.user.role !== 'admin' && req.user.memberId !== borrow.member_id) {
            return res.status(403).json({ success: false, message: 'You can only return your own borrowed books.' });
        }
        
        if (borrow.status === 'Returned') {
            return res.status(400).json({ success: false, message: 'Book already returned.' });
        }
        
        const returnDate = new Date();
        let fineAmount = 0;
        let daysLate = 0;
        
        // Calculate fine if overdue
        if (returnDate > new Date(borrow.due_date)) {
            daysLate = Math.ceil((returnDate - new Date(borrow.due_date)) / (1000 * 60 * 60 * 24));
            fineAmount = daysLate * 10;
            
            // Add fine record
            await getCollection('fines').insertOne({
                borrow_id: borrowId,
                member_id: borrow.member_id,
                amount: fineAmount,
                days_late: daysLate,
                status: 'Unpaid',
                created_at: new Date()
            });
            
            // Update member fines
            await getCollection('members').updateOne(
                { member_id: borrow.member_id },
                { $inc: { total_fines: fineAmount } }
            );
        }
        
        // Update borrow record
        await getCollection('borrows').updateOne(
            { borrow_id: borrowId },
            { 
                $set: { 
                    return_date: returnDate, 
                    status: 'Returned',
                    fine_amount: fineAmount
                }
            }
        );
        
        // Update book available copies
        await getCollection('books').updateOne(
            { book_id: borrow.book_id },
            { $inc: { available_copies: 1 } }
        );
        
        // Update member total borrowed
        await getCollection('members').updateOne(
            { member_id: borrow.member_id },
            { $inc: { total_borrowed: -1 } }
        );
        
        res.json({ 
            success: true, 
            message: 'Book returned successfully.',
            fineAmount: fineAmount,
            daysLate: daysLate
        });
    } catch (error) {
        console.error('Error returning book:', error);
        res.status(500).json({ success: false, message: 'Failed to return book.' });
    }
});

// ============= FINE MANAGEMENT =============
app.get('/api/fines', authenticateToken, async (req, res) => {
    try {
        let query = {};
        if (req.user.role !== 'admin' && req.user.memberId) {
            query = { member_id: req.user.memberId };
        }
        const fines = await getCollection('fines').find(query).sort({ created_at: -1 }).toArray();
        res.json({ success: true, data: fines });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch fines.' });
    }
});

app.put('/api/fines/pay/:id', authenticateToken, async (req, res) => {
    try {
        const fineId = req.params.id;
        const fine = await getCollection('fines').findOne({ _id: new mongoose.Types.ObjectId(fineId) });
        
        if (!fine) {
            return res.status(404).json({ success: false, message: 'Fine not found.' });
        }
        
        // Check permission
        if (req.user.role !== 'admin' && req.user.memberId !== fine.member_id) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }
        
        await getCollection('fines').updateOne(
            { _id: new mongoose.Types.ObjectId(fineId) },
            { $set: { status: 'Paid', paid_date: new Date() } }
        );
        
        await getCollection('members').updateOne(
            { member_id: fine.member_id },
            { $inc: { total_fines: -fine.amount } }
        );
        
        res.json({ success: true, message: 'Fine paid successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to pay fine.' });
    }
});

// ============= DASHBOARD STATISTICS =============
app.get('/api/dashboard', authenticateToken, async (req, res) => {
    try {
        const totalBooks = await getCollection('books').countDocuments();
        const totalMembers = await getCollection('members').countDocuments();
        const activeBorrows = await getCollection('borrows').countDocuments({ status: 'Borrowed' });
        const overdueBorrows = await getCollection('borrows').countDocuments({
            status: 'Borrowed',
            due_date: { $lt: new Date() }
        });
        const unpaidFines = await getCollection('fines').countDocuments({ status: 'Unpaid' });
        
        let myBorrows = 0;
        if (req.user.memberId) {
            myBorrows = await getCollection('borrows').countDocuments({ 
                member_id: req.user.memberId, 
                status: 'Borrowed' 
            });
        }
        
        res.json({
            success: true,
            data: {
                totalBooks,
                totalMembers,
                activeBorrows,
                overdueBorrows,
                unpaidFines,
                myBorrows,
                userRole: req.user.role
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard data.' });
    }
});

// ============= TRANSACTIONS (Audit Log) =============
app.get('/api/transactions', authenticateToken, isAdmin, async (req, res) => {
    try {
        // Get recent borrow/return activities
        const transactions = await getCollection('borrows')
            .find({})
            .sort({ created_at: -1 })
            .limit(50)
            .toArray();
        res.json({ success: true, data: transactions });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch transactions.' });
    }
});

// ============= ROOT ENDPOINT =============
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'BOOKFLOW API Server is running',
        database: 'SP26_DB_LMS',
        endpoints: {
            auth: '/api/auth/login',
            books: '/api/books',
            members: '/api/members',
            borrows: '/api/borrows',
            fines: '/api/fines',
            dashboard: '/api/dashboard'
        }
    });
});

// ============= START SERVER =============
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`📚 BOOKFLOW Library Management System`);
    console.log(`========================================`);
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`💾 Database: SP26_DB_LMS`);
    console.log(`🔐 Admin Login: admin / admin123`);
    console.log(`========================================\n`);
});