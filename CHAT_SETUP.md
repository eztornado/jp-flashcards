# 🎌 Configuración del Chat con IA - JP Flashcards

## 📦 Instalación de dependencias

### Backend
```bash
cd backend
npm install
```

### Frontend
```bash
cd frontend
npm install
```

## 🔑 Configuración de OpenAI API

### 1. Obtener API Key
1. Ve a [OpenAI Platform](https://platform.openai.com/)
2. Crea una cuenta o inicia sesión
3. Ve a **API Keys** → **Create new secret key**
4. Copia la clave generada

### 2. Configurar el archivo .env
```bash
cd backend
cp .env.example .env
nano .env  # o usa tu editor preferido
```

Añade tu clave:
```env
OPENAI_API_KEY=sk-tu-clave-de-openai-aqui
```

## 🚀 Iniciar la aplicación

### Terminal 1 - Backend:
```bash
cd backend
npm run dev
# El servidor correrá en http://localhost:5174
```

### Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
# La aplicación estará en http://localhost:2000
```

## 💬 Características del Chat

### Funcionalidades principales:

#### 1. **Conversaciones temáticas**
- 💬 **Chat General**: Conversación libre sobre cualquier tema
- ☕ **Conversación Diaria**: Saludos, tiempo, actividades cotidianas
- 🍜 **Comida y Bebida**: Restaurantes, platos japoneses, preferencias
- ✈️ **Viajes**: Destinos, transporte, alojamiento
- 🛍️ **Compras**: Tiendas, precios, productos
- 🎵 **Música y Entretenimiento**: Películas, música, hobbies
- 📚 **Estudio**: Aprendizaje del japonés, gramática, vocabulario

#### 2. **Modos de idioma**
- **🇯🇵 Modo Japonés**: 
  - El asistente responde principalmente en japonés
  - Incluye explicaciones breves en español entre paréntesis
  - Usa furigana para kanji difíciles
  - Ideal para inmersión y práctica avanzada

- **🇪🇸 Modo Español**: 
  - El asistente responde en español
  - Incluye términos y frases en japonés
  - Explicaciones detalladas de gramática
  - Perfecto para principiantes

#### 3. **Integración con vocabulario**
- Usa palabras de tu base de datos personal
- El chat conoce tu nivel y adapta las respuestas
- Refuerza el vocabulario que estás estudiando

#### 4. **Text-to-Speech (TTS)**
- 🔊 Reproduce automáticamente respuestas en japonés
- Botón individual para escuchar cada mensaje
- Voces nativas cuando están disponibles

#### 5. **Gestión de sesiones**
- 💾 Historial persistente de conversaciones
- 📝 Múltiples chats simultáneos
- 🗑️ Eliminar conversaciones individuales
- 📊 Contador de mensajes por sesión

## 🎯 Cómo usar el Chat

1. **Crear una nueva conversación**:
   - Click en "Nuevo Chat"
   - Selecciona un tema
   - Click en "Crear Conversación"

2. **Cambiar modo de idioma**:
   - Usa el selector en la parte superior
   - Cambia entre Japonés y Español en cualquier momento

3. **Enviar mensajes**:
   - Escribe tu mensaje en el idioma seleccionado
   - Presiona Enter o click en el botón de enviar
   - Espera la respuesta del asistente

4. **Usar TTS**:
   - Las respuestas en japonés se reproducen automáticamente
   - Click en 🔊 para repetir cualquier mensaje

5. **Gestionar conversaciones**:
   - Click en una conversación del sidebar para abrirla
   - Usa el menú ⋮ para eliminar conversaciones

## 💰 Costos y Límites

### OpenAI Pricing (GPT-3.5-turbo)
- **Input**: $0.0015 / 1K tokens
- **Output**: $0.002 / 1K tokens
- **Promedio por mensaje**: ~$0.001-0.003

### Estimaciones de uso
- **Usuario casual** (50 mensajes/mes): ~$0.10-0.15/mes
- **Usuario regular** (200 mensajes/mes): ~$0.40-0.60/mes
- **Usuario intensivo** (1000 mensajes/mes): ~$2-3/mes

### Cambiar a GPT-4 (opcional)
Si quieres respuestas más avanzadas, edita `backend/src/index.ts`:
```typescript
// Línea ~386
model: "gpt-4",  // Cambiar de "gpt-3.5-turbo"
```
**Nota**: GPT-4 es ~20x más caro que GPT-3.5

## 🔧 Personalización

### Modificar el comportamiento del chat
Edita los prompts en `backend/src/index.ts`:
```typescript
// Línea ~320 - Prompt para modo Japonés
const systemPrompt = language === 'ja' 
  ? `Tu prompt personalizado aquí...`
```

### Añadir nuevos temas
Edita `frontend/src/pages/Chat.tsx`:
```typescript
const CHAT_TOPICS = [
  // Añade tus temas aquí
  { value: 'business', label: '💼 Negocios' },
]
```

### Cambiar límite de tokens
En `backend/src/index.ts`:
```typescript
max_tokens: 500,  // Aumentar para respuestas más largas
```

## 🐛 Solución de problemas

### Error: "OpenAI API key not configured"
- Verifica que el archivo `.env` existe y contiene tu clave
- Reinicia el servidor backend después de añadir la clave

### El TTS no funciona
- Verifica que tu navegador soporta Web Speech API
- Prueba en Chrome/Edge para mejor compatibilidad
- Asegúrate de tener voces japonesas instaladas en tu sistema

### Las respuestas son muy lentas
- Normal: OpenAI puede tardar 1-3 segundos
- Considera usar GPT-3.5-turbo en lugar de GPT-4
- Verifica tu conexión a internet

## 🚀 Mejoras futuras sugeridas

- [ ] **Traducción real** con Google Translate API
- [ ] **Corrección gramatical** automática
- [ ] **Exportar conversaciones** a PDF/Markdown
- [ ] **Ejercicios interactivos** basados en la conversación
- [ ] **Voice input** con reconocimiento de voz
- [ ] **Análisis de progreso** y estadísticas
- [ ] **Modo offline** con modelos locales (Llama, etc.)
- [ ] **Compartir conversaciones** con otros estudiantes
- [ ] **Gamificación** con puntos y logros

## 📚 Recursos adicionales

- [OpenAI Documentation](https://platform.openai.com/docs)
- [Mantine UI Components](https://mantine.dev/)
- [React Router](https://reactrouter.com/)
- [Better SQLite3](https://github.com/WiseLibs/better-sqlite3)

---

¡Disfruta practicando japonés con tu asistente de IA! 🎌
