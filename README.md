# JP Flashcards

App de tarjetas para estudiar japonés (Kanji, Romaji y traducción en español).
Incluye **frontend** (React + Mantine) y **backend** (Express + SQLite), sin usuarios.

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

En dos terminales:

```bash
# 1) Backend
cd backend
npm i
npm run dev
# → corre en http://localhost:3000

# 2) Frontend
cd ../frontend
npm i
npm run dev
# → abre http://localhost:5173
```

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
- **Backend**: `backend/data/words.sqlite`

### Docker
- **Volumen**: `jp-data:/app/data`
- **Backup**: `docker cp jp-flashcards-backend-1:/app/data ./backup`

## 🔧 Configuración

### Variables de Entorno

```bash
# Backend (Opcional - para IA)
OLLAMA_HOST=http://ollama:11434  # Para IA local
OLLAMA_MODEL=llama3.1
ZAI_API_KEY=tu_key               # Para IA en la nube
ZAI_MODEL=glm-4-flash
```

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
- Soporte para Ollama (local) o zAI (nube)
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
