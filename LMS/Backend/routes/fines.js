const express = require('express');
const router = express.Router();
const Fine = require('../models/Fine');
const Member = require('../models/Member');

// GET all fines
router.get('/', async (req, res) => {
    try {
        const fines = await Fine.find().sort({ createdAt: -1 });
        res.json({ success: true, count: fines.length, data: fines });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET unpaid fines
router.get('/unpaid', async (req, res) => {
    try {
        const fines = await Fine.find({ status: 'Unpaid' });
        res.json({ success: true, count: fines.length, data: fines });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT pay fine
router.put('/pay/:id', async (req, res) => {
    try {
        const fine = await Fine.findOne({ fine_id: parseInt(req.params.id) });
        if (!fine) {
            return res.status(404).json({ success: false, message: 'Fine not found' });
        }
        
        fine.status = 'Paid';
        fine.paid_date = new Date();
        await fine.save();
        
        // Update member's total fines
        const member = await Member.findOne({ member_id: fine.member_id });
        if (member) {
            member.total_fines = Math.max(0, member.total_fines - fine.amount);
            await member.save();
        }
        
        res.json({ success: true, data: fine });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

module.exports = router;