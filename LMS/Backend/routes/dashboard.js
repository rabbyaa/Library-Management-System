const express = require('express');
const router = express.Router();
const Book = require('../models/Book');
const Member = require('../models/Member');
const Borrow = require('../models/Borrow');
const Fine = require('../models/Fine');

router.get('/stats', async (req, res) => {
    try {
        const totalBooks = await Book.countDocuments();
        const totalMembers = await Member.countDocuments();
        const activeBorrows = await Borrow.countDocuments({ status: 'Borrowed', return_date: null });
        const overdueBooks = await Borrow.countDocuments({ 
            status: 'Borrowed', 
            due_date: { $lt: new Date() },
            return_date: null
        });
        const totalFinesUnpaid = await Fine.countDocuments({ status: 'Unpaid' });
        const totalFinesAmount = await Fine.aggregate([
            { $match: { status: 'Unpaid' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        
        const recentBorrows = await Borrow.find()
            .sort({ borrow_date: -1 })
            .limit(10);
        
        const categoryStats = await Book.aggregate([
            { $group: { _id: '$category_name', count: { $sum: 1 } } }
        ]);
        
        res.json({
            success: true,
            data: {
                totalBooks,
                totalMembers,
                activeBorrows,
                overdueBooks,
                totalFinesUnpaid,
                totalFinesAmount: totalFinesAmount[0]?.total || 0,
                recentBorrows,
                categoryStats
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;