// api/src/services/db.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const logger = require('../config/logger');
const User = require('../models/User');

const defaultPasswords = {
  admin: process.env.ADMIN_DEFAULT_PASSWORD || process.env.ADMIN_PASS || 'admin123',
  analyst: process.env.ANALYST_DEFAULT_PASSWORD || 'analyst123',
  viewer: process.env.VIEWER_DEFAULT_PASSWORD || 'viewer123'
};

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error("MONGODB_URI is not defined in the environment variables");
    }
    await mongoose.connect(mongoURI);
    logger.info('Connected to MongoDB.');
    // Seed default users if empty
    const count = await User.countDocuments();
    if (count === 0) {
      const seedUsers = [
        { u: 'admin', e: 'admin@siem.local', p: defaultPasswords.admin, r: 'admin' },
        { u: 'analyst', e: 'analyst@siem.local', p: defaultPasswords.analyst, r: 'analyst' },
        { u: 'viewer', e: 'viewer@siem.local', p: defaultPasswords.viewer, r: 'viewer' }
      ];

      for (const user of seedUsers) {
        const hash = bcrypt.hashSync(user.p, 12);
        await User.create({
          id: crypto.randomUUID(),
          username: user.u,
          email: user.e,
          passwordHash: hash,
          role: user.r
        });
      }
      logger.info('Seeded default users into MongoDB.');
    }

    // Compatibility fix: if this looks like an untouched seeded admin user,
    // align it with configured/default bootstrap admin password.
    const adminUser = await User.findOne({ username: 'admin' });

    if (adminUser && adminUser.email === 'admin@siem.local' && !adminUser.lastLogin) {
      const hash = bcrypt.hashSync(defaultPasswords.admin, 12);
      adminUser.passwordHash = hash;
      adminUser.failedLoginAttempts = 0;
      adminUser.lockedUntil = null;
      await adminUser.save();
      logger.info('Aligned default admin credentials for bootstrap compatibility.');
    }

  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = { connectDB };
