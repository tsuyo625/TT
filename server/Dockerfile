# Use Ubuntu for newer GLIBC (2.38+)
FROM ubuntu:24.04

# Install Node.js 22 and dependencies
RUN apt-get update && apt-get install -y \
    curl \
    python3 \
    make \
    g++ \
    openssl \
    ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application code
COPY src ./src
COPY start.sh ./start.sh
RUN chmod +x start.sh

ENV NODE_ENV=production

EXPOSE 443/udp

CMD ["./start.sh"]
