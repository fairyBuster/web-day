# ===== Stage 1: Build frontend (Vite) =====
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies dulu supaya cache layer terpisah dari source
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# VITE_API_URL: isi saat build kalau ingin panggil backend langsung dari
# browser (butuh CORS di backend). Kosong (default) = /api diproxy nginx.
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ===== Stage 2: Serve hasil build dengan nginx =====
FROM nginx:1.27-alpine
# Template nginx: ${API_PROXY_TARGET} diisi otomatis dari env saat container start
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
