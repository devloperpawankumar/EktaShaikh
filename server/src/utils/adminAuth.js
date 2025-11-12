import crypto from 'crypto';

const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || '').trim();
const ADMIN_TOKEN_SECRET = (process.env.ADMIN_TOKEN_SECRET || ADMIN_PASSWORD || '').trim();
const TOKEN_TTL_MS = Number(process.env.ADMIN_TOKEN_TTL_MS || 1000 * 60 * 60 * 12); // default 12h

function getSecret() {
  if (!ADMIN_TOKEN_SECRET) {
    throw new Error('ADMIN_TOKEN_SECRET or ADMIN_PASSWORD must be configured');
  }
  return ADMIN_TOKEN_SECRET;
}

export function isAdminConfigured() {
  return Boolean(ADMIN_PASSWORD);
}

export function verifyAdminPassword(password) {
  if (!isAdminConfigured()) return false;
  if (typeof password !== 'string' || password.length === 0) return false;
  try {
    const provided = Buffer.from(password);
    const expected = Buffer.from(ADMIN_PASSWORD);
    if (provided.length !== expected.length) {
      return false;
    }
    return crypto.timingSafeEqual(provided, expected);
  } catch {
    return false;
  }
}

export function createAdminToken() {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + TOKEN_TTL_MS;
  const payload = JSON.stringify({
    iat: issuedAt,
    exp: expiresAt,
    rand: crypto.randomBytes(18).toString('hex'),
  });
  const payloadBase64 = Buffer.from(payload).toString('base64url');
  const signature = crypto.createHmac('sha256', getSecret()).update(payloadBase64).digest('base64url');
  return `${payloadBase64}.${signature}`;
}

export function verifyAdminToken(token) {
  if (typeof token !== 'string' || token.length < 10) return null;
  const [payloadBase64, signature] = token.split('.');
  if (!payloadBase64 || !signature) return null;
  const expectedSignature = crypto.createHmac('sha256', getSecret()).update(payloadBase64).digest('base64url');
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (sigBuffer.length !== expectedBuffer.length) return null;
  try {
    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;
  } catch {
    return null;
  }
  try {
    const decoded = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
    if (!decoded?.exp || typeof decoded.exp !== 'number') return null;
    if (Date.now() > decoded.exp) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function getAdminTokenTTL() {
  return TOKEN_TTL_MS;
}


