# ── Dependency builder (Alpine, fast) ────────────────────────────────────────
FROM node:20.17.0-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
COPY .npmrc ./
RUN npm ci --only=production

# ── Production image (Ubuntu 24.04 + MySQL 8.4 + Node 20) ────────────────────
FROM ubuntu:24.04 AS production

ENV DEBIAN_FRONTEND=noninteractive

# Install Node.js 20 and MySQL 8.4
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl ca-certificates gnupg lsb-release openssl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && curl -fsSL https://repo.mysql.com/RPM-GPG-KEY-mysql-2023 | gpg --dearmor -o /usr/share/keyrings/mysql.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/mysql.gpg] http://repo.mysql.com/apt/ubuntu noble mysql-8.4-lts" \
         > /etc/apt/sources.list.d/mysql.list \
    && apt-get update && apt-get install -y --no-install-recommends \
         mysql-community-server \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy production node_modules from builder
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application source
COPY . .

# Copy and set entrypoint
RUN chmod +x /app/bin/entrypoint.sh

EXPOSE 3000
EXPOSE 3306

ENTRYPOINT ["/app/bin/entrypoint.sh"]

# ── Development image (Node-only Alpine, fast rebuilds) ───────────────────────
FROM node:20.17.0-alpine AS development

WORKDIR /app

RUN npm install -g nodemon

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

EXPOSE 3000

ENTRYPOINT ["node", "bin/index.mjs"]
