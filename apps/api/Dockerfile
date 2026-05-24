# === BUILD STAGE ===
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN apk add --no-cache python3 make g++ libc6-compat && \
    npm install --ignore-scripts

COPY . .
RUN npx nx build api --configuration=production && \
    node -e "const fs=require('fs'); const root=JSON.parse(fs.readFileSync('./package.json')); const dist=JSON.parse(fs.readFileSync('./dist/apps/api/package.json')); dist.overrides=root.overrides; fs.writeFileSync('./dist/apps/api/package.json', JSON.stringify(dist, null, 2));"

# === PRODUCTION STAGE ===
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy built output and generated package.json
COPY --from=builder /app/dist/apps/api ./

RUN npm install --omit=dev --ignore-scripts && npm cache clean --force

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup
USER appuser

EXPOSE 3000

CMD ["node", "main.js"]
