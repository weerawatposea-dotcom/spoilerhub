# ── Stage 1: Install dependencies ─────────────────
FROM oven/bun:1.3 AS deps
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production=false

# ── Stage 2: Build ────────────────────────────────
FROM oven/bun:1.3 AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time env (Railway injects these)
ARG DATABASE_URL
ARG AUTH_SECRET
ARG NEXT_PUBLIC_APP_URL

ENV DATABASE_URL=${DATABASE_URL}
ENV AUTH_SECRET=${AUTH_SECRET}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN bun run build

# ── Stage 3: Production ──────────────────────────
FROM oven/bun:1.3-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Copy built output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/messages ./messages

EXPOSE 3000

CMD ["bun", "server.js"]
