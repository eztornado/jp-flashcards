# JP Flashcards

App de tarjetas para estudiar japonés (Kanji, Romaji y traducción en español).
Incluye **frontend** (React + Mantine) y **backend** (Express + SQLite), sin usuarios.

Proyecto ejemplo producción: https://jpflags.tornadocore.es/

## 🌟 Características

- 📚 **Vocabulario y Kanji**: Dos listas separadas para estudiar
- 🔊 **Text-to-Speech**: Pronunciación en japonés nativo
- 🧠 **Quiz**: Múltiples modos de estudio (emparejar, traducción, completar)
- 💬 **Chat AI**: Práctica de conversación con IA
- 🗄️ **Base de datos SQLite**: Ligera y sin dependencias
- 🐳 **Docker**: Despliegue fácil con Docker Compose
- 🔄 **Coolify**: Optimizado para despliegue en Coolify

## Contenido
- **backend** → API REST (Express + TypeScript + better-sqlite3).
- **frontend** → React + Vite + Mantine.
- **docker-compose.yml** → Configuración Docker para producción.

## Requisitos

### Desarrollo Local
- Node 18+
- npm

### Producción (Docker)
- Docker
- Docker Compose

## 🚀 Cómo arrancar

### Desarrollo Local

1. Configura las variables de entorno del backend:

```bash
cp backend/.env.example backend/.env
# Edita backend/.env: JWT_SECRET, OCR_API_KEY y el proveedor de IA
```

2. Crea el usuario administrador (solo la primera vez):

```bash
cd backend
npm i
npm run create-admin
```

3. En dos terminales:

```bash
# 1) Backend
cd backend
npm run dev
# → corre en http://localhost:3000

# 2) Frontend
cd ../frontend
npm i
npm run dev
# → abre http://localhost:2000 (el proxy /api apunta al backend)
```

> El frontend usa rutas relativas `/api/...`; en desarrollo Vite las proxya a
> `http://127.0.0.1:3000` (ver `frontend/vite.config.ts`), igual que nginx en producción.

### Producción con Docker

#### Opción 1: Docker Compose (Recomendado para Coolify)

```bash
# Construir y iniciar
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener
docker-compose down
```

#### Opción 2: Script de Build

```bash
./docker-build.sh
```

### Despliegue en Coolify

Ver [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) para instrucciones detalladas.

## 📡 Endpoints API principales

### Vocabulario
- `GET /api/random` → devuelve una palabra aleatoria
- `GET /api/words?search=&page=&pageSize=` → lista paginada
- `POST /api/words` → crea palabra. Body: `{ kanji, romaji?, translation }`
- `PUT /api/words/:id` → edita palabra
- `DELETE /api/words/:id` → elimina palabra

### Kanji
- `GET /api/kanji/random` → devuelve un kanji aleatorio
- `GET /api/kanji?search=&page=&pageSize=` → lista paginada
- `POST /api/kanji` → crea kanji. Body: `{ kanji, onyomi?, kunyomi?, translation }`
- `PUT /api/kanji/:id` → edita kanji
- `DELETE /api/kanji/:id` → elimina kanji

### Chat
- `GET /api/chat/sessions` → lista sesiones de chat
- `POST /api/chat/sessions` → crea nueva sesión
- `POST /api/chat/sessions/:id/messages` → envía mensaje

## 💾 Persistencia de Datos

### Local
- **Backend**: `backend/data/words.sqlite` (ignorado por git, ver `.gitignore`)

### Docker / Coolify
- **Volumen**: `jp-data:/app/data`
- **Backup**: `docker cp <contenedor>:/app/data ./backup`

> ⚠️ La base de datos **no forma parte de la imagen** (Dockerfile sólo copia
> `dist/` y `.dockerignore` excluye `data`), y en runtime se sirve desde el
> volumen `jp-data` montado en `/app/data`. Por eso un despliegue no puede
> sobrescribir los datos de producción.
>
> Para que se mantenga así: no uses `docker compose down -v` (elimina volúmenes)
> y no cambies el montaje por un bind-mount a `./backend/data`.

## 🔧 Configuración

### Variables de Entorno

```bash
# Backend
# - Seguridad (obligatorio)
JWT_SECRET=un-secreto-largo-y-aleatorio

# - IA (opcional)
OLLAMA_HOST=http://ollama:11434  # Para IA local
OLLAMA_MODEL=llama3.1
ZAI_API_KEY=tu_key               # Para IA en la nube
ZAI_MODEL=glm-4-flash

# - OCR (necesario para importar vocabulario y generar lecciones)
OCR_BASE_URL=https://ocr.reigreengroup.com
OCR_API_KEY=tu-clave-del-servicio-ocr
OCR_LESSON_DOC_TYPE=scan   # scan | table
OCR_VOCAB_DOC_TYPE=table   # table
```

> ⚠️ El OCR sólo acepta los `doc_type` documentados por el servicio
> (`general`, `contrato`, `table`, `handwriting`, `scan`, `auto_detect`, `company_*`).
> Valores inventados como `leccion_japones` hacen que el servicio aplique su
> prompt de facturas y devuelva datos sin relación con el documento.

## 📂 Estructura del Proyecto

```
jp-flashcards/
├── backend/
│   ├── src/
│   │   └── index.ts          # API principal
│   ├── data/                  # Base de datos SQLite (local)
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── App.tsx       # Flashcards principales
│   │   │   ├── Admin.tsx     # Gestión de vocabulario/kanji
│   │   │   ├── Quiz.tsx      # Quizzes interactivos
│   │   │   └── Chat.tsx      # Chat con IA
│   │   └── main.tsx
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml
├── coolify-compose.yml        # Configuración optimizada para Coolify
└── DOCKER_DEPLOYMENT.md       # Guía de despliegue
```

## 🧪 Funcionalidades

### 📱 Vocabulario
- Tarjetas de estudio con kanji + romaji
- Pronunciación con TTS
- Importación desde Excel
- Búsqueda y filtrado

### 🈚 Kanji
- Lecturas Onyomi y Kunyomi
- Múltiples significados
- Gestión separada del vocabulario

### 🎮 Quiz
- **Emparejar**: Une palabras con traducciones
- **Traducción**: JP ↔ ES
- **Romaji**: Completa la pronunciación

### 💬 Chat con IA
- Práctica de conversación
- Soporte para IA local (llama.cpp > Ollama) o zAI (nube, solo si hay ZAI_API_KEY)
- Contexto del vocabulario

## 🛠️ Troubleshooting

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
sqlite3 /app/data/words.sqlite
```

### Recrear Contenedores
```bash
docker-compose down
docker-compose up -d --build
```

## 📄 Licencia

Proyecto personal para estudio de japonés.
