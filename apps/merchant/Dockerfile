FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
COPY apps/merchant/package*.json ./apps/merchant/
COPY packages/shared/package*.json ./packages/shared/
RUN npm ci --workspace=apps/merchant --workspace=packages/shared --include-workspace-root

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build:merchant

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/apps/merchant/.next ./apps/merchant/.next
COPY --from=builder /app/apps/merchant/public ./apps/merchant/public
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3002
CMD ["node", "apps/merchant/.next/standalone/server.js"]
