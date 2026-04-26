/**
 * Auth Routes — Register, Login, Me, Logout
 * Integrated with Redis session management
 */

const express = require('express');
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const User           = require('../models/User');
const { protect }    = require('../middleware/auth');
const { getSessionManager } = require('../services/sessionManager');

const router = express.Router();

// Token generator
const signToken = (user) => jwt.sign(
  { id: user._id, email: user.email, role: user.role, storeId: user.storeId, name: user.name },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
);

// ── POST /api/auth/register ───────────────────────────────
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('businessName').trim().notEmpty().withMessage('Business name is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { name, email, password, businessName, businessType, phone, role } = req.body;

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const allowedRole = ['cashier', 'storekeeper', 'delivery', 'accountant'].includes(role) ? role : 'owner';

    const user = await User.create({
      name, email, password,
      businessName, businessType: businessType || 'grocery',
      phone, role: allowedRole,
      storeId: `store-${Date.now()}`,
      avatar: name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    });

    const token = signToken(user);

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: user.toJSON()
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/login ──────────────────────────────────
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account deactivated. Contact admin.' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = signToken(user);

    // Create session
    const sessionManager = getSessionManager();
    const sessionId = await sessionManager.createSession(
      user._id.toString(),
      token,
      {
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || 'unknown'
      }
    );

    res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      sessionId,
      user: user.toJSON()
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/auth/me ──────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, user: req.user });
});

// ── POST /api/auth/logout ─────────────────────────────────
router.post('/logout', protect, async (req, res, next) => {
  try {
    const sessionManager = getSessionManager();
    const sessionId = req.sessionId;

    if (sessionId) {
      await sessionManager.revokeSession(sessionId);
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/auth/preferences ──────────────────────────
router.patch('/preferences', protect, async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { preferences: { ...req.user.preferences, ...req.body } } },
      { new: true, runValidators: true }
    );
    res.json({ success: true, preferences: user.preferences });
  } catch (err) { next(err); }
});

// ── PATCH /api/auth/theme ─────────────────────────────────
router.patch('/theme', protect, async (req, res, next) => {
  try {
    const { theme } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { 'preferences.theme': theme },
      { new: true }
    );
    res.json({ success: true, theme: user.preferences.theme });
  } catch (err) { next(err); }
});

// ── POST /api/auth/add-staff ──────────────────────────────
router.post('/add-staff', protect, async (req, res, next) => {
  if (!['owner', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Only owners/managers can add staff' });
  }
  try {
    const { name, email, password, role, phone } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ success: false, message: 'Email already in use' });

    const staff = await User.create({
      name, email, password: password || 'nexaerp123',
      role: role || 'cashier',
      phone,
      businessName: req.user.businessName,
      businessType: req.user.businessType,
      storeId: req.user.storeId,
      avatar: name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    });

    res.status(201).json({ success: true, message: 'Staff account created!', user: staff.toJSON() });
  } catch (err) { next(err); }
});

module.exports = router;
