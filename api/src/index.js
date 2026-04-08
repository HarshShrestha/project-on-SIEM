// src/index.js
require('dotenv').config();

const express = require('express');
const http = require('http');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { WebSocketServer } = require('ws');

const logger = require('./config/logger');
const { verifyToken } = require('./middleware/auth');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');
const wazuh = require('./services/wazuh');

// Route imports
const authRoutes = require('./routes/auth');
const alertRoutes = require('./routes/alerts');
const agentRoutes = require('./routes/agents');
const statsRoutes = require('./routes/stats');
const rulesRoutes = require('./routes/rules');
const healthRoutes = require('./routes/health');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// ─── Global Middleware ───────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", 'wss:', 'ws:'],
    },
  },
}));

app.use(cors({
  origin: process.env.REACT_APP_URL || 'http://localhost:3000',
  credentials: true,
}));

app.use(compression());
app.use(express.json());
app.use(requestLogger);

// Rate limiter — 100 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests', code: 'RATE_LIMIT', status: 429 },
});
app.use('/api/', limiter);

// ─── Routes ─────────────────────────────────────────────────
// Public
app.use('/health', healthRoutes);
app.use('/api/auth', authRoutes);

// Protected
app.use('/api/alerts', verifyToken, alertRoutes);
app.use('/api/agents', verifyToken, agentRoutes);
app.use('/api/agent', verifyToken, agentRoutes);
app.use('/api/stats', verifyToken, statsRoutes);
app.use('/api/rules', verifyToken, rulesRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// ─── WebSocket Server (/ws/alerts) ──────────────────────────
const wss = new WebSocketServer({ server, path: '/ws/alerts' });

let lastSeenTimestamp = new Date().toISOString();

wss.on('connection', (ws, req) => {
  logger.info('WebSocket client connected', { ip: req.socket.remoteAddress });

  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('close', () => {
    logger.info('WebSocket client disconnected');
  });

  ws.on('error', (err) => {
    logger.error('WebSocket error', { error: err.message });
  });
});

// Heartbeat — disconnect dead clients every 30s
const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => clearInterval(heartbeat));

// Poll Wazuh for new alerts every 5 seconds and broadcast
const pollInterval = setInterval(async () => {
  if (wss.clients.size === 0) return;

  try {
    const newAlerts = await wazuh.getLatestAlerts(lastSeenTimestamp);
    if (newAlerts.length > 0) {
      lastSeenTimestamp = newAlerts[0].timestamp || new Date().toISOString();

      const payload = JSON.stringify({
        type: 'new_alerts',
        data: newAlerts,
        timestamp: new Date().toISOString(),
      });

      wss.clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(payload);
        }
      });

      logger.debug(`Broadcast ${newAlerts.length} new alerts to ${wss.clients.size} clients`);
    }
  } catch (err) {
    logger.debug('Alert poll error', { error: err.message });
  }
}, 5000);

// ─── Graceful Shutdown ──────────────────────────────────────
function shutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully...`);
  clearInterval(pollInterval);
  clearInterval(heartbeat);

  wss.clients.forEach((client) => client.close());
  wss.close();

  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });

  // Force close after 10s
  setTimeout(() => process.exit(1), 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ─── Start Server ───────────────────────────────────────────
server.listen(PORT, () => {
  logger.info(`🚀 SIEM API Server running on port ${PORT}`);
  logger.info(`📡 WebSocket available at ws://localhost:${PORT}/ws/alerts`);
  logger.info(`🏥 Health check at http://localhost:${PORT}/health`);
});
