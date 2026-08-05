# Despliegue Docker en Coolify

Guía para desplegar JP Flashcards en Coolify con persistencia de datos.

## Requisitos Previos

- Servidor con Coolify instalado
- Dominio configurado (opcional)
- Acceso a Docker en el servidor

## Configuración en Coolify

### 1. Crear Nuevo Proyecto

1. En Coolify, crear un nuevo proyecto
2. Seleccionar "Docker Compose" como tipo de despliegue
3. Conectar tu repositorio Git

### 2. Configurar Variables de Entorno

En el panel de Coolify, configura las siguientes variables (opcionales):

```bash
# Para IA local (Ollama)
OLLAMA_HOST=http://ollama:11434
OLLAMA_MODEL=llama3.1

# Para IA en la nube (zAI)
ZAI_API_KEY=tu_api_key
ZAI_MODEL=glm-4-flash
```

### 3. Configurar Volúmenes Persistentes

Coolify detectará automáticamente el volumen `jp-data` y lo configurará como persistente.

Para configurar la ruta específica en el servidor:

1. Ve a "Volumes" en tu proyecto Coolify
2. Encuentra el volumen `jp_jp-data`
3. Configura la ruta del host (ej: `/var/lib/coolify/volumes/jp-flashcards/data`)

### 4. Desplegar

1. Haz commit de los cambios en tu repositorio
2. Coolify detectará los cambios automáticamente
3. El despliegue comenzará de forma automática

## Volúmenes y Persistencia

### Estructura de Volúmenes

```
jp-data/              # Volumen persistente
└── words.sqlite      # Base de datos SQLite
```

### Backup Manual

Para hacer backup del volumen:

```bash
# En el servidor
docker cp jp-flashcards-backend-1:/app/data /backup/jp-flashcards-$(date +%Y%m%d)
```

### Restaurar Backup

```bash
# En el servidor
docker cp /backup/jp-flashcards-20250105 jp-flashcards-backend-1:/app/data
```

## Rutas de Acceso

- **Frontend**: `http://tu-dominio.com` o `http://ip-servidor`
- **Backend API**: `http://tu-dominio.com/api/`

## Health Checks

El sistema incluye health checks automáticos:

- **Backend**: Verifica `/api/random` cada 30s
- **Frontend**: Verifica página principal cada 30s

## Actualizaciones

1. Haz push al repositorio
2. Coolify detecta los cambios
3. Reconstruye y despliega automáticamente

## Troubleshooting

### Ver Logs

```bash
# Backend
docker logs jp-flashcards-backend -f

# Frontend
docker logs jp-flashcards-frontend -f
```

### Acceder a la Base de Datos

```bash
docker exec -it jp-flashcards-backend sh
ls -la /app/data/
```

### Recrear Contenedores

```bash
docker-compose down
docker-compose up -d
```

## Configuración de Dominio

1. En Coolify, configura tu dominio para el servicio frontend
2. Coolify configurará automáticamente SSL con Let's Encrypt

## Seguridad

- Los contenedores corren como usuario no-root (`node`)
- Solo el puerto 80 es expuesto externamente
- El backend solo es accesible desde el frontend
- Usa variables de entorno para datos sensibles
