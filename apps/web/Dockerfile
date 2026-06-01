# === BUILD STAGE ===
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN apk add --no-cache python3 make g++ libc6-compat && \
    npm install --ignore-scripts

COPY . .
RUN npx nx build web --configuration=production

# === PRODUCTION STAGE ===
FROM nginx:alpine AS runner

# Copy custom nginx config
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built Angular app
COPY --from=builder /app/dist/apps/web/browser /usr/share/nginx/html

# Upgrade Alpine packages to fix known vulnerabilities (e.g. libxml2 CVE-2026-6732)
RUN apk upgrade --no-cache

# Non-root user
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
