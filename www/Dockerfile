# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app

ARG WRENCHIT_FRONTEND_GOOGLE_MAPS_API_KEY=Paste-Key-Here
ENV WRENCHIT_FRONTEND_GOOGLE_MAPS_API_KEY=${WRENCHIT_FRONTEND_GOOGLE_MAPS_API_KEY}

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build && node -e "const fs=require('fs'); const p='/app/dist/config.js'; const k=process.env.WRENCHIT_FRONTEND_GOOGLE_MAPS_API_KEY || 'Paste-Key-Here'; let t=fs.readFileSync(p,'utf8'); t=t.replace('__WRENCHIT_FRONTEND_GOOGLE_MAPS_API_KEY__', k); fs.writeFileSync(p,t);"

# ---- serve stage ----
FROM caddy:2-alpine
WORKDIR /srv

COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
