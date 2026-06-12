# CranBania — The Town Hall (Kanban + ITSM + Agile + Prince2 board)
# TypeScript/Next.js  — Port 8071
#
# Multi-stage build:
#   deps    → production node_modules only (no devDeps in runner)
#   builder → full build with devDeps + next build (output: standalone)
#   runner  → minimal Alpine image, non-root user, wget healthcheck
#
# Requires next.config.ts: output: "standalone"
# Build: docker build -t cranbania:latest .
# Run:   docker run -p 8071:8071 --env-file .env cranbania:latest

# ── Stage 1: production deps ──────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# ── Stage 2: full build ───────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── Stage 3: minimal runner ───────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8071
ENV HOSTNAME=0.0.0.0

# non-root system user (UID 1001 / GID 1001)
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs \
 && apk add --no-cache wget

# standalone server + static assets
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# MCP server entrypoint (alongside Next.js)
COPY --from=builder --chown=nextjs:nodejs /app/mcp ./mcp

# production node_modules for any server-side scripts
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

USER nextjs
EXPOSE 8071

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD wget --spider -q http://localhost:8071/api/board || exit 1

# server.js is emitted by Next.js standalone output
CMD ["node", "server.js"]
