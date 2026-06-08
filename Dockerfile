# ── Dependency builder (Alpine — fast, small) ────────────────────────────────
FROM node:20.17.0-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
COPY .npmrc ./
RUN npm ci --only=production

FROM node:20.17.0-alpine AS dev-dependencies
WORKDIR /app
COPY package*.json ./
COPY .npmrc ./
RUN npm ci

# ── Production image (Ubuntu 24.04 + MySQL 8.4 + Node.js 20) ─────────────────
FROM ubuntu:24.04 AS production

ENV DEBIAN_FRONTEND=noninteractive

# Install MySQL 8.4 Community Server + Node.js 20 + helpers
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ca-certificates curl gnupg lsb-release && \
    # Node.js 20 via NodeSource
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    # MySQL 8.4 via official apt repo
    curl -fsSL https://repo.mysql.com/RPM-GPG-KEY-mysql-2023 | gpg --dearmor -o /usr/share/keyrings/mysql.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/mysql.gpg] http://repo.mysql.com/apt/ubuntu noble mysql-8.4" \
        > /etc/apt/sources.list.d/mysql.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends mysql-community-server && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy production node_modules from builder
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application source
COPY . .

# Entrypoint script must be executable
RUN chmod +x bin/entrypoint.sh

# MySQL data directory — mount a named volume here for persistence
VOLUME ["/var/lib/mysql"]

# Auth web UI + external MySQL access (Workbench / PowerBI)
EXPOSE 3000 3307

ENTRYPOINT ["bin/entrypoint.sh"]

# ── Development image (Node-only Alpine — fast rebuilds) ─────────────────────
FROM node:20.17.0-alpine AS development

WORKDIR /app

COPY --from=dev-dependencies /app/node_modules ./node_modules
COPY . .

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

ENTRYPOINT ["node", "bin/index.mjs"]
