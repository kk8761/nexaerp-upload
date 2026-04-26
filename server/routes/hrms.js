/**
 * NexaERP — HRMS Routes (Attendance & Leaves)
 */
const router = require('express').Router();
const auth = require('../middleware/auth');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const AuditLog = require('../models/AuditLog');

// ── Attendance ──────────────────────────────────────────────────

// GET /api/hrms/attendance
router.get('/attendance', auth, async (req, res) => {
  try {
    const records = await Attendance.find({ storeId: req.user.storeId })
      .sort({ date: -1, employeeName: 1 });
    res.json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/hrms/attendance/clock-in
router.post('/attendance/clock-in', auth, async (req, res) => {
  try {
    const date = new Date().toISOString().split('T')[0];
    const record = await Attendance.findOneAndUpdate(
      { storeId: req.user.storeId, employeeId: req.user._id, date },
      { 
        clockIn: new Date(), 
        status: 'present', 
        employeeName: req.user.name,
        branch: req.user.branch || 'main'
      },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/hrms/attendance/clock-out
router.post('/attendance/clock-out', auth, async (req, res) => {
  try {
    const date = new Date().toISOString().split('T')[0];
    const record = await Attendance.findOne({ storeId: req.user.storeId, employeeId: req.user._id, date });
    if (!record || !record.clockIn) return res.status(400).json({ success: false, message: 'No clock-in record found for today' });

    record.clockOut = new Date();
    record.hoursWorked = (record.clockOut - record.clockIn) / 3600000;
    await record.save();

    res.json({ success: true, data: record });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── Leaves ──────────────────────────────────────────────────────

// GET /api/hrms/leaves
router.get('/leaves', auth, async (req, res) => {
  try {
    const leaves = await Leave.find({ storeId: req.user.storeId }).sort({ from: -1 });
    res.json({ success: true, data: leaves });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/hrms/leaves/apply
router.post('/leaves/apply', auth, async (req, res) => {
  try {
    const leave = await Leave.create({
      ...req.body,
      storeId: req.user.storeId,
      employeeId: req.user._id,
      employeeName: req.user.name,
    });
    res.status(201).json({ success: true, data: leave });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
