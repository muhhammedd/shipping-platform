FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
COPY apps/courier/package*.json ./apps/courier/
COPY packages/shared/package*.json ./packages/shared/
RUN npm ci --workspace=apps/courier --workspace=packages/shared --include-workspace-root

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build:courier

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/apps/courier/.next ./apps/courier/.next
COPY --from=builder /app/apps/courier/public ./apps/courier/public
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3003
CMD ["node", "apps/courier/.next/standalone/server.js"]
