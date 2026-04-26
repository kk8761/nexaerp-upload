/**
 * Session Management Routes
 * Provides APIs for listing and revoking user sessions
 * 
 * **Validates: Requirements 5.8**
 */

const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { getSessionManager } = require('../services/sessionManager');

const router = express.Router();

// ── GET /api/sessions ─────────────────────────────────────
// Get all active sessions for the current user
router.get('/', protect, async (req, res, next) => {
  try {
    const sessionManager = getSessionManager();
    const sessions = await sessionManager.getUserSessions(req.user._id.toString());

    // Add current session indicator
    const currentSessionId = req.sessionId;
    const sessionsWithCurrent = sessions.map(session => ({
      ...session,
      isCurrent: session.sessionId === currentSessionId
    }));

    res.json({
      success: true,
      sessions: sessionsWithCurrent,
      count: sessionsWithCurrent.length
    });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/sessions/:sessionId ───────────────────────
// Revoke a specific session
router.delete('/:sessionId', protect, async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const sessionManager = getSessionManager();

    // Get session to verify ownership
    const session = await sessionManager.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found or already expired'
      });
    }

    // Verify user owns this session
    if (session.userId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only revoke your own sessions'
      });
    }

    const revoked = await sessionManager.revokeSession(sessionId);

    if (revoked) {
      res.json({
        success: true,
        message: 'Session revoked successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/sessions ──────────────────────────────────
// Revoke all sessions except current (logout from all other devices)
router.delete('/', protect, async (req, res, next) => {
  try {
    const sessionManager = getSessionManager();
    const currentSessionId = req.sessionId;
    
    // Get all user sessions
    const sessions = await sessionManager.getUserSessions(req.user._id.toString());
    
    // Revoke all except current
    let revokedCount = 0;
    for (const session of sessions) {
      if (session.sessionId !== currentSessionId) {
        await sessionManager.revokeSession(session.sessionId);
        revokedCount++;
      }
    }

    res.json({
      success: true,
      message: `Revoked ${revokedCount} session(s)`,
      revokedCount
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/sessions/logout ─────────────────────────────
// Logout from current session
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

// ── GET /api/sessions/stats ───────────────────────────────
// Get session statistics (admin only)
router.get('/stats', protect, authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const sessionManager = getSessionManager();
    const stats = await sessionManager.getStats();

    res.json({
      success: true,
      stats
    });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/sessions/admin/:userId ────────────────────
// Admin: Revoke all sessions for a specific user
router.delete('/admin/:userId', protect, authorize('owner', 'admin'), async (req, res, next) => {
  try {
    const { userId } = req.params;
    const sessionManager = getSessionManager();

    const revokedCount = await sessionManager.revokeAllUserSessions(userId);

    res.json({
      success: true,
      message: `Revoked ${revokedCount} session(s) for user ${userId}`,
      revokedCount
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
