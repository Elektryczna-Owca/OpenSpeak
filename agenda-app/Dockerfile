# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# --- deps: install all dependencies ---
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# --- builder: generate Prisma client and build Next.js ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

# --- migrate-deps: prisma CLI + dotenv for `prisma migrate deploy` at startup.
# Installed as a real npm tree so the CLI's transitive deps and .bin links exist;
# versions are read from package.json to stay in sync with the app.
FROM base AS migrate-deps
COPY package.json ./
RUN node -e "const p=require('./package.json');require('fs').writeFileSync('package.json',JSON.stringify({dependencies:{prisma:p.dependencies.prisma,dotenv:p.devDependencies.dotenv}}))" \
 && npm install --omit=dev

# --- runner: minimal production image ---
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Standalone server bundle includes a trimmed node_modules.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# Prisma migrations + schema for `prisma migrate deploy` at startup.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
# Merge the prisma CLI tree over the standalone bundle's trimmed node_modules.
COPY --from=migrate-deps --chown=nextjs:nodejs /app/node_modules ./node_modules

USER nextjs
EXPOSE 3001

CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node server.js"]
