# 🎌 Configuración del Chat con zAI GLM - JP Flashcards

## 🆓 ¡Ahora con IA completamente GRATIS!

Hemos migrado de OpenAI a **zAI GLM-4.5-Flash**, un modelo de IA potente y **100% gratuito** para uso personal.

## 🚀 Inicio Rápido

### 1. Obtén tu API Key GRATIS

1. Ve a [https://open.bigmodel.cn/](https://open.bigmodel.cn/)
2. Regístrate con tu email (es gratis)
3. En el dashboard, ve a "API Keys" 
4. Crea una nueva API key
5. ¡Copia tu key!

> **Nota**: La interfaz puede estar en chino. Busca "API密钥" o "API Keys" en el menú.

### 2. Configura el archivo .env

```bash
cd backend
cp .env.example .env
nano .env  # o usa tu editor preferido
```

Añade tu clave:
```env
ZAI_API_KEY=tu-clave-de-zai-aqui
ZAI_MODEL=glm-4-flash
```

### 3. Instala las dependencias

```bash
cd backend
npm install
```

### 4. Inicia la aplicación

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## 🤖 Modelos Disponibles de zAI

### GLM-4-Flash (GRATIS) ✨ Recomendado
- **Coste**: ¡GRATIS!
- **Velocidad**: Muy rápida
- **Calidad**: Excelente para chat y aprendizaje
- **Límites**: Generosos para uso personal
- **Ideal para**: Práctica diaria de japonés

### GLM-4-Plus (De pago)
- **Coste**: ~$0.014/1K tokens
- **Velocidad**: Rápida
- **Calidad**: Superior, respuestas más detalladas
- **Ideal para**: Usuarios avanzados

### GLM-4-Vision (De pago)
- **Coste**: ~$0.014/1K tokens
- **Características**: Puede analizar imágenes
- **Ideal para**: Reconocimiento de kanji escritos

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

## 🔧 Personalización Avanzada

### Cambiar el comportamiento del asistente

Edita los prompts en `backend/src/index.ts`:

```typescript
const systemPrompt = language === 'ja' 
  ? `Tu prompt personalizado en japonés...`
  : `Tu prompt personalizado en español...`;
```

### Ajustar parámetros del modelo

En la función `callZAIGLM`:

```typescript
{
  model: ZAI_MODEL,
  messages: messages,
  temperature: 0.7,  // 0.1-1.0 (más alto = más creativo)
  max_tokens: 500,    // Máximo de tokens en la respuesta
  top_p: 0.9,        // Diversidad del vocabulario
  stream: false       // true para respuestas en streaming
}
```

## 💰 Comparación de Costos

| Servicio | Modelo | Costo por mensaje* | Mensual (1000 msgs) |
|----------|--------|-------------------|---------------------|
| OpenAI | GPT-3.5 | ~$0.002 | ~$2.00 |
| OpenAI | GPT-4 | ~$0.04 | ~$40.00 |
| **zAI** | **GLM-4-Flash** | **GRATIS** 🎉 | **GRATIS** 🎉 |
| zAI | GLM-4-Plus | ~$0.001 | ~$1.00 |

*Estimado por mensaje promedio de chat

## 🌏 Ventajas de zAI GLM

1. **Multilingüe nativo**: Excelente soporte para japonés, chino, español e inglés
2. **Optimizado para Asia**: Mejor comprensión de contextos culturales asiáticos
3. **Gratis para siempre**: El modelo Flash seguirá siendo gratuito
4. **Sin censura excesiva**: Más flexible que otros modelos
5. **Baja latencia**: Servidores optimizados

## 🐛 Solución de Problemas

### Error: "zAI API key not configured"
- Verifica que el archivo `.env` existe
- Confirma que la variable `ZAI_API_KEY` está configurada
- Reinicia el servidor después de añadir la clave

### Las respuestas están en chino
- Asegúrate de que el prompt del sistema esté en español/japonés
- El modelo es multilingüe y responderá en el idioma del prompt

### Error de límite de tasa (Rate Limit)
- El plan gratuito tiene límites generosos pero no infinitos
- Espera unos minutos si alcanzas el límite
- Considera GLM-4-Plus para uso intensivo

### Las respuestas son muy cortas
- Aumenta `max_tokens` en la configuración
- Ajusta el prompt para pedir respuestas más detalladas

## 📚 Recursos Adicionales

- [Documentación de zAI GLM](https://open.bigmodel.cn/dev/api)
- [Guía de migración de OpenAI](https://docs.z.ai/guides/migration/openai)
- [Ejemplos de código](https://github.com/zhipuai/zhipu-api-examples)
- [Comunidad y soporte](https://discord.gg/zhipuai)

## 🎯 Tips para Mejores Resultados

1. **Sé específico**: GLM-4 responde mejor a instrucciones claras
2. **Usa contexto**: Menciona el nivel de japonés del estudiante
3. **Feedback iterativo**: El modelo aprende del contexto de la conversación
4. **Experimenta**: Prueba diferentes temperaturas para variar las respuestas

## 🚀 Próximas Mejoras Sugeridas

- [ ] Implementar streaming de respuestas
- [ ] Añadir caché de respuestas comunes
- [ ] Sistema de puntuación basado en IA
- [ ] Detección automática de nivel JLPT
- [ ] Modo de conversación por voz
- [ ] Análisis de progreso con IA

---

¡Disfruta aprendiendo japonés con IA gratuita! 🎌🤖

**Nota**: zAI es un servicio chino pero completamente legal y seguro de usar internacionalmente. Los datos se procesan según estándares internacionales de privacidad.
