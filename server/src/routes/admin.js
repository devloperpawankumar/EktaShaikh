import express from 'express';
import VoiceMessage from '../models/VoiceMessage.js';
import requireAdmin from '../middleware/requireAdmin.js';
import {
  isAdminConfigured,
  verifyAdminPassword,
  createAdminToken,
  getAdminTokenTTL,
  verifyAdminToken,
} from '../utils/adminAuth.js';

const router = express.Router();

router.post('/login', (req, res) => {
  if (!isAdminConfigured()) {
    return res.status(503).json({ error: 'Admin access is not configured' });
  }
  const { password } = req.body || {};
  if (typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({ error: 'Password is required' });
  }
  if (!verifyAdminPassword(password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  try {
    const token = createAdminToken();
    const payload = verifyAdminToken(token);
    return res.json({
      token,
      expiresAt: payload?.exp || null,
      expiresInMs: getAdminTokenTTL(),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create admin session', details: err?.message });
  }
});

router.get('/session', requireAdmin, (req, res) => {
  const { exp, iat } = req.adminSession || {};
  res.json({
    ok: true,
    issuedAt: iat,
    expiresAt: exp,
  });
});

router.get('/recordings', requireAdmin, async (req, res) => {
  try {
    const { search, ownerId, limit, sort } = req.query;
    const filter = { type: 'user' };
    if (ownerId) {
      filter.ownerId = ownerId;
    }
    if (search && typeof search === 'string') {
      const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { title: regex },
        { transcript: regex },
        { ownerId: regex },
      ];
    }
    const limitNumber = Math.max(1, Math.min(Number(limit) || 50, 200));
    const sortOption = sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 };
    const items = await VoiceMessage.find(filter).sort(sortOption).limit(limitNumber).lean();
    res.json({ items });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load recordings', details: error?.message });
  }
});

router.patch('/recordings/:id', requireAdmin, async (req, res) => {
  try {
    const updates = {};
    if (typeof req.body?.title === 'string') {
      updates.title = req.body.title.trim();
    }
    if (typeof req.body?.transcript === 'string') {
      updates.transcript = req.body.transcript;
    }
    if (typeof req.body?.ownerId === 'string') {
      updates.ownerId = req.body.ownerId.trim();
    }
    const item = await VoiceMessage.findOneAndUpdate(
      { _id: req.params.id, type: 'user' },
      { $set: updates },
      { new: true, runValidators: true },
    ).lean();
    if (!item) {
      return res.status(404).json({ error: 'Recording not found' });
    }
    res.json({ item });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update recording', details: error?.message });
  }
});

router.delete('/recordings/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const item = await VoiceMessage.findOneAndDelete({ _id: id, type: 'user' }).lean();
    if (!item) {
      return res.status(404).json({ error: 'Recording not found' });
    }
    res.json({ ok: true, deletedId: id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete recording', details: error?.message });
  }
});

export default router;


