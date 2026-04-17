// api/src/services/db.js
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');
const logger = require('../config/logger');

const dbPath = path.join(__dirname, '../../users.db');
const db = new Database(dbPath);

const defaultPasswords = {
  admin: process.env.ADMIN_DEFAULT_PASSWORD || process.env.ADMIN_PASS || 'admin123',
  analyst: process.env.ANALYST_DEFAULT_PASSWORD || 'analyst123',
  viewer: process.env.VIEWER_DEFAULT_PASSWORD || 'viewer123'
};

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('viewer', 'analyst', 'admin')),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    lastLogin DATETIME,
    isActive BOOLEAN DEFAULT 1,
    failedLoginAttempts INTEGER DEFAULT 0,
    lockedUntil DATETIME,
    mustChangePassword BOOLEAN DEFAULT 0
  );
  
  CREATE TABLE IF NOT EXISTS refresh_tokens (
    tokenHash TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    expiresAt DATETIME NOT NULL,
    revoked BOOLEAN DEFAULT 0,
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Seed default users if empty
const count = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
if (count === 0) {
  const crypto = require('crypto');
  const insert = db.prepare(`
    INSERT INTO users (id, username, email, passwordHash, role)
    VALUES (?, ?, ?, ?, ?)
  `);

  const seedUsers = [
    { u: 'admin', e: 'admin@siem.local', p: defaultPasswords.admin, r: 'admin' },
    { u: 'analyst', e: 'analyst@siem.local', p: defaultPasswords.analyst, r: 'analyst' },
    { u: 'viewer', e: 'viewer@siem.local', p: defaultPasswords.viewer, r: 'viewer' }
  ];

  const seedTx = db.transaction((users) => {
    for (const user of users) {
      const hash = bcrypt.hashSync(user.p, 12);
      insert.run(crypto.randomUUID(), user.u, user.e, hash, user.r);
    }
  });

  seedTx(seedUsers);
  logger.info('Seeded default users into SQLite DB.');
}

// Compatibility fix: if this looks like an untouched seeded admin user,
// align it with configured/default bootstrap admin password.
const adminUser = db
  .prepare('SELECT id, email, lastLogin FROM users WHERE username = ? COLLATE NOCASE')
  .get('admin');

if (adminUser && adminUser.email === 'admin@siem.local' && !adminUser.lastLogin) {
  const hash = bcrypt.hashSync(defaultPasswords.admin, 12);
  db.prepare('UPDATE users SET passwordHash = ?, failedLoginAttempts = 0, lockedUntil = NULL WHERE id = ?')
    .run(hash, adminUser.id);
  logger.info('Aligned default admin credentials for bootstrap compatibility.');
}

module.exports = db;
