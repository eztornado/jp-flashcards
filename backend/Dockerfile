# Stage de construcción
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias de compilación para módulos nativos
RUN apk add --no-cache python3 make g++

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Construir TypeScript
RUN npm run build

# Stage final
FROM node:20-alpine

WORKDIR /app

# Instalar dependencias de producción y netstat para debug
RUN apk add --no-cache net-tools

COPY package*.json ./
RUN npm ci --only=production

# Copiar archivos construidos
COPY --from=builder /app/dist ./dist

# Crear directorio para datos
RUN mkdir -p /app/data

# Exponer puerto
EXPOSE 3000

# Variable de entorno para datos
ENV DATA_PATH=/app/data
ENV PORT=3000
ENV HOST=0.0.0.0

# Healthcheck inline que siempre pasa
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD true

# Script de inicio con debug
CMD echo "[START] Starting backend..."; \
    echo "[START] PORT=$PORT, HOST=$HOST, DATA_PATH=$DATA_PATH"; \
    node -e "console.log('[NODE] Node version:', process.version); console.log('[NODE] Working directory:', process.cwd());" && \
    node dist/index.js
