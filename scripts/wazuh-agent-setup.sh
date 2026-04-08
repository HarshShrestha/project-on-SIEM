#!/bin/bash
# scripts/wazuh-agent-setup.sh — Wazuh Agent Installation for Ubuntu 22.04
# Usage: ./wazuh-agent-setup.sh <MANAGER_IP>
set -euo pipefail

MANAGER_IP="${1:?Usage: $0 <MANAGER_IP>}"

echo "╔═══════════════════════════════════════════╗"
echo "║     Wazuh Agent Setup — Ubuntu 22.04      ║"
echo "║     Manager IP: ${MANAGER_IP}              "
echo "╚═══════════════════════════════════════════╝"

# ─── 1. Add Wazuh repository ────────────────────────────
echo ""
echo "📦 Adding Wazuh APT repository..."
curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | gpg --no-default-keyring --keyring gnupg-ring:/usr/share/keyrings/wazuh.gpg --import && chmod 644 /usr/share/keyrings/wazuh.gpg
echo "deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/4.x/apt/ stable main" | tee /etc/apt/sources.list.d/wazuh.list

# ─── 2. Install Wazuh agent ─────────────────────────────
echo ""
echo "📥 Installing wazuh-agent..."
apt-get update
WAZUH_MANAGER="${MANAGER_IP}" apt-get install -y wazuh-agent

# ─── 3. Configure manager address ───────────────────────
echo ""
echo "⚙️  Configuring manager address..."
sed -i "s|<address>.*</address>|<address>${MANAGER_IP}</address>|" /var/ossec/etc/ossec.conf

# ─── 4. Enable syslog monitoring ────────────────────────
echo ""
echo "📋 Enabling syslog monitoring..."
cat >> /var/ossec/etc/ossec.conf << 'SYSLOG_EOF'

  <!-- Syslog monitoring -->
  <localfile>
    <log_format>syslog</log_format>
    <location>/var/log/syslog</location>
  </localfile>

  <localfile>
    <log_format>syslog</log_format>
    <location>/var/log/auth.log</location>
  </localfile>

  <localfile>
    <log_format>syslog</log_format>
    <location>/var/log/dpkg.log</location>
  </localfile>

  <localfile>
    <log_format>apache</log_format>
    <location>/var/log/nginx/access.log</location>
  </localfile>
SYSLOG_EOF

# ─── 5. Enable and start service ────────────────────────
echo ""
echo "🚀 Starting Wazuh agent..."
systemctl daemon-reload
systemctl enable wazuh-agent
systemctl start wazuh-agent

# ─── 6. Verify ──────────────────────────────────────────
echo ""
echo "✅ Verifying agent status..."
sleep 3
systemctl status wazuh-agent --no-pager

echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║        Agent Installation Complete!       ║"
echo "╠═══════════════════════════════════════════╣"
echo "║  Agent Status: $(systemctl is-active wazuh-agent)                ║"
echo "║  Manager: ${MANAGER_IP}                    "
echo "║                                           ║"
echo "║  Verify on manager:                       ║"
echo "║  /var/ossec/bin/agent_control -l           ║"
echo "╚═══════════════════════════════════════════╝"
