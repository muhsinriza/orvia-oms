# Stage 1: Build React/Vite frontend
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Caddy serves static files + proxies /api
FROM caddy:2-alpine
COPY --from=build /app/dist /srv/www
COPY Caddyfile /etc/caddy/Caddyfile
