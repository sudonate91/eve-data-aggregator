# Use Node.js 20.17.0 as specified in package.json
FROM node:20.17.0-alpine AS base

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY .npmrc ./

# Install dependencies
FROM base AS dependencies
RUN npm ci --only=production

# Development dependencies
FROM base AS dev-dependencies
RUN npm ci

# Production image
FROM node:20.17.0-alpine AS production

WORKDIR /app

# Copy production dependencies
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application files
COPY . .

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Expose port if needed (for future web interface)
# EXPOSE 3000

# Run the CLI application
ENTRYPOINT ["node", "bin/index.mjs"]

# Development image
FROM node:20.17.0-alpine AS development

WORKDIR /app

# Copy all dependencies (including dev)
COPY --from=dev-dependencies /app/node_modules ./node_modules

# Copy application files
COPY . .

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Run the CLI application
ENTRYPOINT ["node", "bin/index.mjs"]
