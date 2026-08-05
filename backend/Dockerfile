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

# Crear directorio para datos con permisos
RUN mkdir -p /app/data && chown -R node:node /app/data

# Cambiar a usuario no-root
USER node

# Exponer puerto
EXPOSE 3000

# Variable de entorno para datos
ENV DATA_PATH=/app/data

# Healthcheck simplificado - verificar que el proceso está corriendo
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=5 \
  CMD node -e "const http = require('http'); const options = { host: 'localhost', port: 3000, path: '/api/random', timeout: 2000 }; const req = http.get(options, (r) => { if (r.statusCode === 200 || r.statusCode === 404) process.exit(0); else process.exit(1); }); req.on('error', () => process.exit(1)); req.setTimeout(2000, () => { req.destroy(); process.exit(1); });"

# Iniciar aplicación
CMD ["node", "dist/index.js"]
