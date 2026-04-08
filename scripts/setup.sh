#!/bin/bash
# scripts/setup.sh — SIEM Home Lab Setup Script
set -euo pipefail

echo "╔═══════════════════════════════════════════╗"
echo "║   SIEM Home Lab — Setup & Deploy Script   ║"
echo "╚═══════════════════════════════════════════╝"

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

# ─── 1. Generate self-signed SSL cert if not present ─────
if [ ! -f "./certs/server.crt" ]; then
    echo ""
    echo "🔐 Generating self-signed SSL certificate..."
    mkdir -p ./certs
    openssl req -x509 -nodes -days 365 \
        -newkey rsa:2048 \
        -keyout ./certs/server.key \
        -out ./certs/server.crt \
        -subj "/C=US/ST=Lab/L=HomeLab/O=SIEM/CN=localhost" \
        2>/dev/null
    echo "   ✅ Certificate generated at ./certs/"
else
    echo "   ✅ SSL certificate already exists"
fi

# ─── 2. Create .env if not present ───────────────────────
if [ ! -f ".env" ]; then
    echo ""
    echo "📝 Creating .env from template..."
    cp api/.env.example .env
    echo "   ⚠️  Edit .env with your settings before production use"
fi

# ─── 3. Build frontend ──────────────────────────────────
echo ""
echo "🏗️  Building React frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
fi
npm run build
cd "$PROJECT_DIR"
echo "   ✅ Frontend built at frontend/dist/"

# ─── 4. Start Docker services ───────────────────────────
echo ""
echo "🐳 Starting Docker services..."
docker-compose up -d --build

# ─── 5. Tail logs briefly then show status ──────────────
echo ""
echo "📋 Tailing logs for 10 seconds..."
timeout 10 docker-compose logs -f 2>/dev/null || true

echo ""
echo "═══════════════════════════════════════════"
echo "📊 Service Status:"
echo "═══════════════════════════════════════════"
docker-compose ps

echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║           Deployment Complete!            ║"
echo "╠═══════════════════════════════════════════╣"
echo "║  Dashboard:  https://localhost             ║"
echo "║  API:        https://localhost/api          ║"
echo "║  Wazuh UI:   https://localhost:5601         ║"
echo "║  Health:     https://localhost/health        ║"
echo "║                                            ║"
echo "║  Login:      admin / admin123              ║"
echo "╚═══════════════════════════════════════════╝"
