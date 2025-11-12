import { verifyAdminToken } from '../utils/adminAuth.js';

export default function requireAdmin(req, res, next) {
  const authHeader = (req.headers.authorization || '').trim();
  let token = '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    token = authHeader.slice(7).trim();
  }
  if (!token && typeof req.headers['x-admin-token'] === 'string') {
    token = req.headers['x-admin-token'].trim();
  }
  const session = verifyAdminToken(token);
  if (!session) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }
  req.adminSession = session;
  return next();
}


