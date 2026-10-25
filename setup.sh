#!/bin/bash
# ==========================================
# SyncPlay Backend 1-Click Server Setup
# Compatible with Ubuntu 20.04 / 22.04 / 24.04
# ==========================================

set -e

echo "🚀 [1/5] Updating system packages..."
apt-get update -y
apt-get install -y curl wget git python3 python3-pip ffmpeg build-essential ufw

echo "📦 [2/5] Installing yt-dlp & cloudflared..."
pip3 install --no-cache-dir yt-dlp || apt-get install -y yt-dlp

# Install cloudflared for free HTTPS & NAT bypass
if ! command -v cloudflared &> /dev/null; then
    wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O /usr/local/bin/cloudflared
    chmod +x /usr/local/bin/cloudflared
fi

echo "🟢 [3/5] Installing Node.js 20 & PM2..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pm2

echo "📂 [4/5] Setting up SyncPlay Backend..."
APP_DIR="/var/www/syncplay"
rm -rf $APP_DIR
mkdir -p $APP_DIR
git clone https://github.com/yudasss/syncplay.git $APP_DIR
cd $APP_DIR/backend

echo "⚙️ [5/5] Installing dependencies and starting server..."
npm install --production

# Allow port 3001 through firewall
ufw allow 3001/tcp 2>/dev/null || true

# Start backend with PM2
pm2 delete syncplay 2>/dev/null || true
pm2 start server.js --name "syncplay"

# Start cloudflared tunnel with PM2
pm2 delete tunnel 2>/dev/null || true
pm2 start "cloudflared tunnel --protocol http2 --url http://localhost:3001" --name "tunnel"

pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

# Wait 5 seconds for tunnel to establish
sleep 6

PUBLIC_IP=$(curl -s ifconfig.me || curl -s icanhazip.com || echo "YOUR_VPS_IP")
TUNNEL_URL=$(grep -o 'https://[-a-zA-Z0-9\.]*\.trycloudflare\.com' /root/.pm2/logs/tunnel-out.log /root/.pm2/logs/tunnel-error.log 2>/dev/null | head -n 1 || echo "")

echo ""
echo "=========================================================="
echo "🎉 SyncPlay Backend BERHASIL AKTIF 24 JAM DI CLOUD!"
echo "=========================================================="
if [ -n "$TUNNEL_URL" ]; then
    echo "👉 URL HTTPS (Rekomendasi Utama): ${TUNNEL_URL}/api"
fi
echo "👉 URL Direct IP: http://${PUBLIC_IP}:3001/api"
echo ""
echo "Masukkan salah satu URL di atas ke menu Pengaturan di aplikasi HP Anda."
echo "Sekarang laptop Anda BEBAS DIMATIKAN SELAMANYA!"
echo "=========================================================="
