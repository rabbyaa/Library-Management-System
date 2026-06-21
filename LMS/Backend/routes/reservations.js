const express = require('express');
const router = express.Router();
const Reservation = require('../models/Reservation');

// GET all reservations
router.get('/', async (req, res) => {
    try {
        const reservations = await Reservation.find().sort({ reservation_date: -1 });
        res.json({ success: true, count: reservations.length, data: reservations });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET pending reservations
router.get('/pending', async (req, res) => {
    try {
        const reservations = await Reservation.find({ status: 'Pending' });
        res.json({ success: true, count: reservations.length, data: reservations });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST create reservation
router.post('/', async (req, res) => {
    try {
        const lastReservation = await Reservation.findOne().sort({ reservation_id: -1 });
        const newReservationId = lastReservation ? lastReservation.reservation_id + 1 : 1;
        
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 14);
        
        const reservation = new Reservation({
            ...req.body,
            reservation_id: newReservationId,
            expiry_date: expiryDate,
            reservation_date: new Date()
        });
        
        const savedReservation = await reservation.save();
        res.status(201).json({ success: true, data: savedReservation });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// PUT cancel reservation
router.put('/cancel/:id', async (req, res) => {
    try {
        const reservation = await Reservation.findOne({ reservation_id: parseInt(req.params.id) });
        if (!reservation) {
            return res.status(404).json({ success: false, message: 'Reservation not found' });
        }
        
        reservation.status = 'Cancelled';
        reservation.cancelled_date = new Date();
        await reservation.save();
        
        res.json({ success: true, data: reservation });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

module.exports = router;