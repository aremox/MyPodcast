# === BUILD STAGE ===
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npx nx build api --configuration=production

# === PRODUCTION STAGE ===
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy built output and generated package.json
COPY --from=builder /app/dist/apps/api ./

RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup
USER appuser

EXPOSE 3000

CMD ["node", "main.js"]
