FROM node:20-bullseye-slim

# Install Python3, ffmpeg, and yt-dlp
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    build-essential \
    && pip3 install --no-cache-dir yt-dlp \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Set up user with UID 1000 for Hugging Face Spaces / standard non-root
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# Install backend dependencies
COPY --chown=user backend/package*.json ./
RUN npm install --production

# Copy backend source
COPY --chown=user backend/ ./

# Port 7860 is the default port for Hugging Face Spaces (and fallback to PORT env)
ENV PORT=7860
ENV NODE_ENV=production
EXPOSE 7860

CMD ["node", "server.js"]
