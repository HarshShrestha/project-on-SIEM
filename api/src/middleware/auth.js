// api/src/middleware/auth.js
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');
let publicKey = '';
let privateKey = '';

try {
  if (process.env.JWT_PUBLIC_KEY_BASE64 && process.env.JWT_PRIVATE_KEY_BASE64) {
    publicKey = Buffer.from(process.env.JWT_PUBLIC_KEY_BASE64, 'base64').toString('ascii');
    privateKey = Buffer.from(process.env.JWT_PRIVATE_KEY_BASE64, 'base64').toString('ascii');
  } else {
    // Generate an ephemeral fallback for dev ONLY if keys aren't provided
    const { generateKeyPairSync } = require('crypto');
    const { publicKey: pub, privateKey: priv } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    publicKey = pub;
    privateKey = priv;
    logger.warn('No JWT keys provided in env, using ephemeral RS256 keys (will invalidate on restart)');
  }
} catch (e) {
  logger.error('Error loading JWT keys from config', { error: e.message });
}

function signToken(payload, options = {}) {
  // RS256 is asymmetric, preventing symmetric key brute forcing
  return jwt.sign(payload, privateKey, { algorithm: 'RS256', ...options });
}

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
    req.user = decoded; // Contains id, username, role, jti
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Invalid or expired token',
      code: 'AUTH_INVALID_TOKEN',
    });
  }
}

const requireRole = (minRole) => {
  const hierarchy = { viewer: 0, analyst: 1, admin: 2 };
  return (req, res, next) => {
    const userRole = req.user?.role;
    if (hierarchy[userRole] >= hierarchy[minRole]) {
      return next();
    }
    return res.status(403).json({
      error: 'Insufficient permissions',
      code: 'FORBIDDEN',
      required: minRole,
      current: userRole
    });
  };
};

module.exports = { signToken, verifyToken, requireRole };
