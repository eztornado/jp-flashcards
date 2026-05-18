# 🎌 Configuración del Chat con Ollama - JP Flashcards

## 🆓 ¡Ahora con IA local con Ollama!

Hemos agregado soporte para **Ollama**, permitiéndote usar modelos de IA locales sin depender de APIs externas. Esta actualización mantiene la retrocompatibilidad con zAI.

## 🚀 Inicio Rápido con Ollama

### 1. Instala Ollama

Primero, asegúrate de tener [Ollama instalado](https://ollama.com/download):

```bash
# Instala Ollama en tu sistema
# macOS, Linux y Windows tienen instaladores disponibles en ollama.com
```

### 2. Instala modelos recomendados

```bash
# Llama 3.1 (recomendado)
ollama pull llama3.1

# Alternativas más rápidas
ollama pull gemma2:9b
ollama pull mistral:nemo:latest

# Para dispositivos más potentes
ollama pull llama3.1:8b
```

### 3. Configura tu servidor Ollama remoto

Para usar Ollama en tu servidor remoto:

```bash
# En el servidor donde corre Ollama
ollama serve

# Ollama estará disponible en http://cos-alicante.netbird.vpn:11434
```

### 4. Configura el archivo .env

```bash
cd backend
cp .env.ollama.example .env  # Crea copia con variables Ollama
nano .env  # Edita según necesites
```

**Opción A: Usar solo Ollama** (descomenta estas líneas):
```env
# Configuración de Ollama Local
OLLAMA_HOST=http://cos-alicante.netbird.vpn
OLLAMA_MODEL=llama3.1

# ¡Opcional! Para zAI (retrocompatibilidad)
# ZAI_API_KEY=tu-clave-de-zai-aqui
# ZAI_MODEL=glm-4-flash
```

**Opción B: Usar ambos (Ollama prioritario)**:
```env
# Ollama Local (prioridad)
OLLAMA_HOST=http://cos-alicante.netbird.vpn
OLLAMA_MODEL=llama3.1

# Y también zAI (como backup/fallback)
ZAI_API_KEY=tu-clave-de-zai-aqui
ZAI_MODEL=glm-4-flash
```

### 5. Reinicia el backend

```bash
cd backend
npm run dev
```

### 6. Prueba la configuración

```bash
curl http://localhost:3000/api/chat/test
```

Verás la respuesta confirmando que Ollama está funcionando correctamente.

## 🤖 Modelos Disponibles en Ollama

### llama3.1 (Recomendado)
- **Velocidad**: Rápido y eficiente
- **Calidad**: Excelente comprensión de contexto
- **Ideal para**: Uso general y aprendizaje de japonés

### gemma2:9b
- **Velocidad**: Muy rápido
- **Calidad**: Muy buena
- **Ideal para**: Dispositivos con recursos limitados

### mistral:nemo:latest
- **Velocidad**: Rápido
- **Calidad**: Buena
- **Ideal para**: Respuestas cortas y directas

### Alternativas adicionales:
```bash
ollama pull codellama      # Para consultas técnicas
ollama pull phi3           # Rápido y eficiente
ollama pull qwen2.5:7b     # Multilingüe
```

## 💬 Características del Chat

### Funcionalidad completa mantenida:

✅ **Conversaciones temáticas**
- Chat General
- Conversación Diaria  
- Comida y Bebida
- Viajes
- Compras
- Música y Entretenimiento
- Estudio

✅ **Modos de idioma**
- **Modo Japonés**: Inmersión con explicaciones en español
- **Modo Español**: Aprendizaje gradual

✅ **Integración con vocabulario**
- Usa las palabras de tu base de datos
- Contexto personalizado en cada conversación

✅ **TTS (Text-to-Speech)**
- Pronunciación nativa
- Disponible para todos los mensajes

## 🔌 Diferencias entre zAI y Ollama

| Característica | zAI | Ollama |
|---------------|-----|--------|
| **Costo** | Gratis (Flash) / Pagado | Gratis |
| **Privacidad** | Servidores externos | Local |
| **Velocidad** | Depende de la API | Local (más rápido) |
| **Configuración** | API Key | Pull de modelos |
| **Modelos** | Limitados a zAI | Miles disponibles |

## 💰 Ventajas de Ollama

1. **Totalmente gratuito**: Sin costos de API
2. **Privacidad total**: Todo local
3. **Sin límites**: Usilos ilimitados
4. **Multitud de modelos**: Elige el mejor para cada tarea
5. **Independencia**: No dependes de terceros

## 🔧 Personalización Avanzada

### Cambiar el modelo de Ollama

Edita en `.env`:
```env
OLLAMA_MODEL=llama3.1:latest  # Cambia el modelo
```

### Usar Ollama local en tu dispositivo

```bash
# En tu Raspberry Pi o dispositivo local
ollama serve  # Corre en http://localhost:11434

# O en tu red local
OLLAMA_HOST=http://192.168.1.100:11434
OLLAMA_MODEL=llama3.1
```

### Streaming de respuestas

Ollama soporta streaming nativo. Para activarlo:

```env
OLLAMA_STREAM=true  # Desactivado por defecto
```

## 🐛 Solución de Problemas

### Error: "Ollama is not running"
```bash
# Verifica que Ollama está corriendo
ollama list

# Inicia el servidor
ollama serve
```

### Error: "Model not found"
```bash
# Instala el modelo que configuraste
OLLAMA_MODEL=llama3.1
ollama pull llama3.1
```

### Error: "Connection refused"
```bash
# Verifica que el servidor Ollama esté corriendo
curl http://cos-alicante.netbird.vpn:11434/api/tags

# O si es local
curl http://localhost:11434/api/tags
```

### Ollama responde lento
- Usa modelos más pequeños (gemma2:9b)
- Aumenta RAM/swap en el servidor
- Usa modelos quantizados (q4_k_m, q5_k_m)

### Las respuestas están en chino
- El prompt del sistema está en español/japonés
- Ollama respone en el idioma del prompt

## 🌐 Configurar Ollama como Servicio

### En Ubuntu/Debian

Crea `/etc/systemd/system/ollama.service`:

```ini
[Unit]
Description=Ollama Service
After=network.target

[Service]
User=usuario
ExecStart=/usr/local/bin/ollama serve
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable ollama
sudo systemctl start ollama
```

## 📊 Comparación de Rendimiento

| Modelo | Precisión | Velocidad | RAM Uso |
|--------|-----------|-----------|---------|
| llama3.1:8b | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 6-8 GB |
| gemma2:9b | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 5-7 GB |
| mistral:nemo | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 4-6 GB |
| llama3.1:70b | ⭐⭐⭐⭐⭐ | ⭐⭐ | 35+ GB |

## 🎯 Tips para Mejores Resultados

1. **Selecciona el modelo adecuado**:
   - `llama3.1` para uso general
   - `gemma2:9b` para velocidad
   - Modelos más grandes para precisión

2. **Optimiza el contexto**:
   - Usa menos mensajes en el historial
   - Mantén contexto relevante

3. **Experimenta temperaturas**:
   - `temperature: 0.1-0.5` para respuestas precisas
   - `temperature: 0.7-0.9` para creatividad

## 🔄 Migración de zAI a Ollama

Si estás usando zAI y quieres migrar a Ollama:

1. **Configura Ollama** en `.env`
2. **Guarda tu API key de zAI** (por ahora)
3. **Prueba ambos** comparando resultados
4. **Descomenta Ollama** y comenta zAI cuando esté listo

```env
# Antes (zAI)
ZAI_API_KEY=...
# OLLAMA_HOST=...

# Ahora (Ollama)
OLLAMA_HOST=http://cos-alicante.netbird.vpn
# ZAI_API_KEY=...
```

## 📚 Recursos Adicionales

- [Documentación de Ollama](https://ollama.com/docs)
- [Modelos disponibles](https://ollama.com/library)
- [Ollama API](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Fine-tuning](https://ollama.com/docs/fine-tuning)

## 🚀 Próximas Mejoras Sugeridas

- [ ] Implementar quantización de modelos
- [ ] Sistema de caché de respuestas
- [ ] Comparador de modelos automático
- [ ] Interfaz web para gestión de modelos
- [ ] Fine-tuning personalizado de modelos

## 🎌 Próximos Pasos

### ¿Quieres mejorar el rendimiento?

1. **Actualiza a GPU**: Para inferencia acelerada
2. **Prueba modelos cuantizados**: q4_k_m, q5_k_m
3. **Configura Ollama con CUDA**: Para GPU NVIDIA

```bash
# Ollama con GPU NVIDIA
ollama run llama3.1

# Ollama con CPU
ollama run llama3.1
```

---

¡Disfruta aprendiendo japonés con IA local! 🎌🤖

**Nota**: Puedes usar ambos sistemas (zAI y Ollama) simultáneamente para comparar resultados y elegir el mejor según tu situación.
