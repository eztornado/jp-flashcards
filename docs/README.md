# JP Flashcards - Documentación de IA

## Resumen de Cambios

Este proyecto ha sido actualizado para soportar **ambos sistemas de IA**: **zAI** (API externa) y **Ollama** (local). Esto te permite:

1. **Usar Ollama local** (gratis, privado, sin límites)
2. **Usar zAI** (API externa, gratuita con límites generosos)
3. **Usar ambos simultáneamente** (Ollama como principal, zAI como fallback)

## 📁 Estructura de Archivos

```
jp-flashcards/
├── backend/
│   ├── src/index.ts              # Código principal (modificado para Ollama)
│   ├── .env.example              # Ejemplo para zAI (retrocompatibilidad)
│   └── .env.ollama.example       # Ejemplo para Ollama (nuevo)
├── frontend/
│   └── ...
├── docs/
│   ├── README.md                 # Este archivo
│   ├── OLLAMA.md                 # Documentación detallada de Ollama
│   └── ZAI_SETUP.md              # Guías actualizadas
```

## 🚀 Inicio Rápido

### Configuración para Ollama (Recomendado)

```bash
# 1. Configura Ollama en el servidor remoto
ollama serve llama3.1
# Servidor disponible en: http://cos-alicante.netbird.vpn:11434

# 2. Configura el backend
cd backend
cp .env.ollama.example .env
nano .env

# Edita .env para usar Ollama:
OLLAMA_HOST=http://cos-alicante.netbird.vpn
OLLAMA_MODEL=llama3.1

# 3. Inicia el backend
npm run dev
```

### Configuración para zAI (Retrocompatibilidad)

```bash
cd backend
cp .env.example .env
nano .env

# Edita .env para usar zAI:
ZAI_API_KEY=tu-clave-de-zai-aqui
ZAI_MODEL=glm-4-flash

npm run dev
```

### Usar Ambos (Ollama + zAI como Backup)

```env
# Ollama prioritario
OLLAMA_HOST=http://cos-alicante.netbird.vpn
OLLAMA_MODEL=llama3.1

# zAI como backup
ZAI_API_KEY=tu-clave-de-zai-aqui
ZAI_MODEL=glm-4-flash
```

## 📖 Documentación Completa

| Archivo | Descripción |
|---------|-------------|
| [**OLLAMA.md**](OLLAMA.md) | Guía completa para usar Ollama localmente |
| [**ZAI_SETUP.md**](ZAI_SETUP.md) | Guías actualizadas con opciones de IA |
| [**README.md**](../../README.md) | README principal del proyecto |

## 🔧 Detección Automática

El backend detecta automáticamente qué IA usar:

```javascript
// 1. Prioridad Ollama
if (OLLAMA_HOST) → Usa Ollama

// 2. Fallback zAI
else if (ZAI_API_KEY) → Usa zAI

// 3. Error
else → "Ningún modelo de IA está configurado"
```

## 🎯 Pasos Siguientes

1. **Lee [OLLAMA.md](OLLAMA.md)** para configurar Ollama localmente
2. **Configura el `.env`** con tu preferencia (Ollama o zAI)
3. **Reinicia el backend** para aplicar los cambios
4. **Prueba con**: `curl http://localhost:3000/api/chat/test`

## 🐛 Solución de Problemas Comunes

### "Ningún modelo de IA está configurado"
```env
# Añade OLLAMA_HOST o ZAI_API_KEY en .env
OLLAMA_HOST=http://cos-alicante.netbird.vpn
# O
ZAI_API_KEY=tu-clave-de-zai-aqui
```

### "Ollama is not running"
```bash
# Inicia Ollama
ollama serve

# O instala un modelo primero
ollama pull llama3.1
ollama serve
```

### "Model not found"
```bash
# Instala el modelo configurado
ollama pull llama3.1  # O el que hayas configurado
```

## 💡 Ventajas de Esta Actualización

✅ **Flexibilidad**: Elige entre local o API  
✅ **Retrocompatibilidad**: Sigue funcionando con zAI  
✅ **Privacidad**: Opción local total con Ollama  
✅ **Gratis**: Sin costos con Ollama  
✅ **Sin límites**: Uso ilimitado  

---

¡Disfruta de la máxima flexibilidad con tu IA local! 🎌🤖
