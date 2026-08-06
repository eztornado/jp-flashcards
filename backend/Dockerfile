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

# Instalar dependencias de producción y su-exec
RUN apk add --no-cache su-exec

COPY package*.json ./
RUN npm ci --only=production

# Copiar archivos construidos
COPY --from=builder /app/dist ./dist

# Crear directorio para datos
RUN mkdir -p /app/data

# Copiar entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Exponer puerto
EXPOSE 3000

# Variable de entorno para datos
ENV DATA_PATH=/app/data

# Healthcheck simplificado - verificar que el puerto está abierto
HEALTHCHECK --interval=15s --timeout=10s --start-period=120s --retries=30 \
  CMD node -e 'const net=require("net");const s=new net.Socket();s.connect(3000,"localhost",()=>{s.end();process.exit(0)});s.on("error",()=>process.exit(1));setTimeout(()=>process.exit(1),5000)'

# Usar entrypoint para arreglar permisos y ejecutar como node
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
