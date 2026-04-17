// api/src/services/db.js
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');
const logger = require('../config/logger');

const dbPath = path.join(__dirname, '../../users.db');
const db = new Database(dbPath);

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
    { u: 'admin', e: 'admin@siem.local', p: process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@123!', r: 'admin' },
    { u: 'analyst', e: 'analyst@siem.local', p: process.env.ANALYST_DEFAULT_PASSWORD || 'Analyst@123!', r: 'analyst' },
    { u: 'viewer', e: 'viewer@siem.local', p: process.env.VIEWER_DEFAULT_PASSWORD || 'Viewer@123!', r: 'viewer' }
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

module.exports = db;
