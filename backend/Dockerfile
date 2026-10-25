FROM node:20-bullseye-slim

# Install Python3, ffmpeg, and yt-dlp for audio streaming
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    build-essential \
    && pip3 install --no-cache-dir yt-dlp \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy backend code
COPY . .

ENV PORT=3001
ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "server.js"]
