export default function requireUser(req, res, next) {
  const userId = (req.headers['x-user-id'] || '').toString().trim();
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: missing x-user-id' });
  }
  req.userId = userId;
  next();
}


