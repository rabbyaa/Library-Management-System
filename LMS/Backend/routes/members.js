const express = require('express');
const router = express.Router();
const Member = require('../models/Member');

// GET all members
router.get('/', async (req, res) => {
    try {
        const members = await Member.find().sort({ member_id: 1 });
        res.json({
            success: true,
            count: members.length,
            data: members
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET single member
router.get('/:id', async (req, res) => {
    try {
        const member = await Member.findOne({ member_id: parseInt(req.params.id) });
        if (!member) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }
        res.json({ success: true, data: member });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST create member
router.post('/', async (req, res) => {
    try {
        const lastMember = await Member.findOne().sort({ member_id: -1 });
        const newMemberId = lastMember ? lastMember.member_id + 1 : 1;
        
        const member = new Member({
            ...req.body,
            member_id: newMemberId
        });
        
        const savedMember = await member.save();
        res.status(201).json({ success: true, data: savedMember });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// PUT update member
router.put('/:id', async (req, res) => {
    try {
        const member = await Member.findOneAndUpdate(
            { member_id: parseInt(req.params.id) },
            req.body,
            { new: true, runValidators: true }
        );
        if (!member) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }
        res.json({ success: true, data: member });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// DELETE member
router.delete('/:id', async (req, res) => {
    try {
        const member = await Member.findOneAndDelete({ member_id: parseInt(req.params.id) });
        if (!member) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }
        res.json({ success: true, message: 'Member deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;