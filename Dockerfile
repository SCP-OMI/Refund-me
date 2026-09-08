# syntax=docker/dockerfile:1
FROM node:20-bookworm-slim AS base

# Prisma needs OpenSSL during both generation and Next.js builds.
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
# The runtime image installs system Chromium; npm must not download another copy.
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Dependencies stage - install all dependencies including dev dependencies
FROM base AS deps
WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json* ./

# Install all dependencies (including dev dependencies for build)
RUN --mount=type=cache,id=refund-npm,target=/root/.npm,sharing=locked npm ci --ignore-scripts --no-audit --no-fund
COPY prisma ./prisma/
RUN npx prisma generate

# Production dependencies stage - only production dependencies
FROM base AS prod-deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install only production dependencies
RUN --mount=type=cache,id=refund-npm,target=/root/.npm,sharing=locked npm ci --omit=dev --ignore-scripts --no-audit --no-fund
COPY prisma ./prisma/
RUN npx prisma generate

# Builder stage - build the application
FROM base AS builder
WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy package files and prisma schema (for build process)
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Copy source files (this layer invalidates only when source changes)
COPY src ./src
COPY public ./public
COPY next.config.ts ./
COPY tsconfig.json ./
COPY server.ts ./
COPY postcss.config.mjs ./
COPY components.json ./

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN --mount=type=cache,id=refund-next,target=/app/.next/cache npm run build && npm run build:server

FROM base AS runner
WORKDIR /app

# Install Chromium and dependencies for Puppeteer
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    dumb-init \
    chromium \
    fonts-liberation \
    libnss3 \
    libxss1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libgbm-dev \
    && rm -rf /var/lib/apt/lists/*

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --home /home/nextjs nextjs && \
    mkdir -p /home/nextjs && \
    chown nextjs:nodejs /home/nextjs

ENV HOME=/home/nextjs


ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV WS_PORT=3000
ENV HOSTNAME="0.0.0.0"

# Puppeteer configuration
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

COPY --chown=nextjs:nodejs scripts/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

RUN mkdir -p /app/public/uploads && \
    chown -R nextjs:nodejs /app/public/uploads && \
    chmod -R 775 /app/public/uploads

USER nextjs

EXPOSE 3000

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["./docker-entrypoint.sh"]
