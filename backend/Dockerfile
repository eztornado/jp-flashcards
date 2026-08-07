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

# Instalar dependencias de producción
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

# Healthcheck que verifica el puerto con 127.0.0.1 (IPv4) en lugar de localhost (IPv6)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=10 \
  CMD node -e "const net=require('net');const s=new net.Socket();const t=setTimeout(()=>s.destroy(),8000);s.connect(3000,'127.0.0.1',()=>{clearTimeout(t);s.end();process.exit(0)});s.on('error',()=>process.exit(1))"

# CMD normal de la aplicación
CMD node dist/index.js
