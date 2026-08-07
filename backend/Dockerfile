# Stage de construcción
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias de compilación para módulos nativos
RUN apk add --no-cache python3 make g++

# Copiar package files y crear directorios necesarios
COPY . .

# Instalar dependencias de producción (incluyendo headers para better-sqlite3)
RUN npm ci --only=production || npm ci

# Copiar código fuente
COPY . .

# Construir TypeScript
RUN npm run build

# Stage final
FROM node:20-alpine

WORKDIR /app

# Instalar dependencias de producción
COPY package*.json ./
RUN npm ci --only=production || npm ci

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

# CMD normal de la aplicación
CMD node dist/index.js
