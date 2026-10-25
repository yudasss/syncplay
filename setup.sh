#!/bin/bash
# ==========================================
# SyncPlay Backend 1-Click Server Setup
# Compatible with Ubuntu 20.04 / 22.04 / 24.04
# ==========================================

set -e

echo "🚀 [1/5] Updating system packages..."
sudo apt-get update -y
sudo apt-get install -y curl wget git python3 python3-pip ffmpeg build-essential

echo "📦 [2/5] Installing yt-dlp..."
sudo pip3 install --no-cache-dir yt-dlp || sudo apt-get install -y yt-dlp

echo "🟢 [3/5] Installing Node.js 20 & PM2..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2

echo "📂 [4/5] Setting up SyncPlay Backend..."
APP_DIR="/var/www/syncplay"
sudo rm -rf $APP_DIR
sudo mkdir -p $APP_DIR
sudo git clone https://github.com/yudasss/syncplay.git $APP_DIR
cd $APP_DIR/backend

echo "⚙️ [5/5] Installing dependencies and starting server..."
npm install --production

# Allow port 3001 through firewall
sudo ufw allow 3001/tcp || true

# Start with PM2 (auto-restart on crash & reboot)
pm2 delete syncplay 2>/dev/null || true
pm2 start server.js --name "syncplay"
pm2 save
pm2 startup | tail -n 1 | bash 2>/dev/null || true

# Get public IP
PUBLIC_IP=$(curl -s ifconfig.me || curl -s icanhazip.com || echo "YOUR_VPS_IP")

echo ""
echo "=========================================================="
echo "🎉 SyncPlay Backend BERHASIL AKTIF 24 JAM!"
echo "=========================================================="
echo "👉 URL Server Anda: http://${PUBLIC_IP}:3001/api"
echo ""
echo "Masukkan URL di atas ke menu Pengaturan di aplikasi HP Anda."
echo "Sekarang server musik Anda sudah aktif 24 jam nonstop!"
echo "=========================================================="
