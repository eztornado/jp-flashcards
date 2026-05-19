import express from "express";
import cors from "cors";
import Database from "better-sqlite3";
import { z } from "zod";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import * as XLSX from "xlsx";
import axios from "axios";
import dotenv from "dotenv";

// Cargar variables de entorno
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DB path (../data/words.sqlite)
const dbPath = path.resolve(__dirname, "..", "data", "words.sqlite");
const db = new Database(dbPath);

// Ensure table exists
db.exec(`
CREATE TABLE IF NOT EXISTS words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kanji TEXT NOT NULL,
  romaji TEXT,
  translation TEXT NOT NULL
);
`);

db.exec(`
CREATE UNIQUE INDEX IF NOT EXISTS idx_words_kanji_romaji
ON words (kanji, romaji);
`);

// Crear tabla para historial de chat
db.exec(`
CREATE TABLE IF NOT EXISTS chat_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);
`);

// Configuración de zAI GLM
const ZAI_API_KEY = process.env.ZAI_API_KEY || "";
const ZAI_MODEL = process.env.ZAI_MODEL || "glm-4-flash";
const ZAI_BASE_URL = "https://open.bigmodel.cn/api/paas/v4";

// Configuración de Ollama Local
const OLLAMA_HOST =
  process.env.OLLAMA_HOST || "http://cos-alicante.netbird.vpn";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1";
const OLLAMA_BASE_URL = `${OLLAMA_HOST}/api/generate`;

// Función auxiliar para llamar al modelo de IA (soporta zAI y Ollama)
async function callLLM(
  messages: any[],
  model: string,
  apiKey?: string,
  baseUrls?: any,
): Promise<string> {
  try {
    // Verificar si estamos usando Ollama
    const isOllama = OLLAMA_HOST.includes("cos-alicante") || process.env.OLLAMA_HOST;

    if (isOllama) {
      // Llamada a Ollama
      const response = await axios.post(
        OLLAMA_BASE_URL,
        {
          model: OLLAMA_MODEL,
          prompt: messages
            .filter((m) => m.role !== "system") // Ollama no usa role: system
            .map((m) => `${m.role}: ${m.content}`)
            .join("\n"),
          options: {
            temperature: 0.7,
            top_p: 0.9,
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      return (response.data.response || "Lo siento, no pude generar una respuesta.");
    } else if (apiKey) {
      // Llamada a zAI GLM (retrocompatibilidad)
      const response = await axios.post(
        `${baseUrls.zAI}/chat/completions`,
        {
          model: model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 500,
          stream: false,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      return (
        response.data.choices[0]?.message?.content ||
        "Lo siento, no pude generar una respuesta."
      );
    }

    throw new Error("No hay configuración de IA disponible");
  } catch (error: any) {
    const isOllama = OLLAMA_HOST.includes("cos-alicante") || process.env.OLLAMA_HOST;
    console.error(
      `Error calling ${isOllama ? "Ollama" : "zAI GLM"}:`,
      error.response?.data || error.message
    );
    throw new Error(
      error.response?.data?.error?.message ||
        `Error al comunicarse con el modelo de IA (${isOllama ? "Ollama" : "zAI"})`
    );
  }
}

// Función helper para llamar a zAI GLM (mantenida para compatibilidad)
async function callZAIGLM(messages: any[]): Promise<string> {
  return callLLM(messages, ZAI_MODEL, ZAI_API_KEY, { zAI: ZAI_BASE_URL });
}

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

// Schemas
const WordCreate = z.object({
  kanji: z.string().min(1),
  romaji: z.string().optional().default(""),
  translation: z.string().min(1),
});
const WordUpdate = z.object({
  kanji: z.string().min(1),
  romaji: z.string().optional().default(""),
  translation: z.string().min(1),
});

// Helpers
function rowToWord(row: any) {
  return {
    id: row.id,
    kanji: row.kanji,
    romaji: row.romaji ?? "",
    translation: row.translation,
  };
}

// GET /api/random
app.get("/api/random", (req, res) => {
  const row = db.prepare("SELECT * FROM words ORDER BY RANDOM() LIMIT 1").get();
  if (!row) return res.status(404).json({ error: "No words found" });
  return res.json(rowToWord(row));
});

// GET /api/words?search=&page=1&pageSize=20
app.get("/api/words", (req, res) => {
  const search = (req.query.search as string | undefined)?.trim() ?? "";
  const page = Math.max(parseInt((req.query.page as string) || "1", 10), 1);
  const pageSize = Math.min(
    Math.max(parseInt((req.query.pageSize as string) || "20", 10), 1),
    100,
  );
  const offset = (page - 1) * pageSize;

  let where = "";
  let params: any[] = [];
  if (search) {
    where = "WHERE kanji LIKE ? OR romaji LIKE ? OR translation LIKE ?";
    const like = `%${search}%`;
    params = [like, like, like];
  }
  const totalRow = db
    .prepare(`SELECT COUNT(*) as cnt FROM words ${where}`)
    .get(...params);
  const total = (totalRow as any).cnt as number;

  const rows = db
    .prepare(`SELECT * FROM words ${where} ORDER BY id DESC LIMIT ? OFFSET ?`)
    .all(...params, pageSize, offset);
  const items = rows.map(rowToWord);

  res.json({ items, total, page, pageSize });
});

// POST /api/words
app.post("/api/words", (req, res) => {
  const parsed = WordCreate.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });
  const { kanji, romaji, translation } = parsed.data;
  const stmt = db.prepare(
    "INSERT INTO words (kanji, romaji, translation) VALUES (?, ?, ?)",
  );
  const info = stmt.run(kanji, romaji ?? "", translation);
  const row = db
    .prepare("SELECT * FROM words WHERE id = ?")
    .get(info.lastInsertRowid);
  res.status(201).json(rowToWord(row));
});

// PUT /api/words/:id
app.put("/api/words/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id))
    return res.status(400).json({ error: "Invalid id" });
  const parsed = WordUpdate.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });
  const { kanji, romaji, translation } = parsed.data;
  const stmt = db.prepare(
    "UPDATE words SET kanji=?, romaji=?, translation=? WHERE id=?",
  );
  const info = stmt.run(kanji, romaji ?? "", translation, id);
  if (info.changes === 0) return res.status(404).json({ error: "Not found" });
  const row = db.prepare("SELECT * FROM words WHERE id = ?").get(id);
  res.json(rowToWord(row));
});

// DELETE /api/words/:id
app.delete("/api/words/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id))
    return res.status(400).json({ error: "Invalid id" });
  const info = db.prepare("DELETE FROM words WHERE id=?").run(id);
  if (info.changes === 0) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

// ============ QUIZ ENDPOINTS ============

// GET /api/quiz/matching - Obtener palabras para quiz de unir
app.get("/api/quiz/matching", (req, res) => {
  // Filtrar palabras que no tienen español en el romaji
  const words = db
    .prepare(
      `
    SELECT * FROM words
    WHERE romaji NOT LIKE '%ción%'
    AND romaji NOT LIKE '%dad%'
    AND romaji NOT LIKE '%mente%'
    AND romaji NOT LIKE '%ar %'
    AND romaji NOT LIKE '%er %'
    AND romaji NOT LIKE '%ir %'
    AND romaji NOT GLOB '*[áéíóúñÁÉÍÓÚÑ]*'
    ORDER BY RANDOM()
    LIMIT 5
  `,
    )
    .all();

  if (words.length < 5) {
    // Si no hay suficientes palabras filtradas, obtener cualquiera
    const allWords = db
      .prepare("SELECT * FROM words ORDER BY RANDOM() LIMIT 5")
      .all();
    return res.json(allWords.map(rowToWord));
  }

  res.json(words.map(rowToWord));
});

// GET /api/quiz/translation - Obtener una palabra para quiz de traducción
app.get("/api/quiz/translation", (req, res) => {
  const mode = (req.query.mode as string) || "jp-to-es"; // 'jp-to-es' o 'es-to-jp'

  // Obtener una palabra aleatoria (filtrada)
  const word = db
    .prepare(
      `
    SELECT * FROM words
    WHERE romaji NOT LIKE '%ción%'
    AND romaji NOT GLOB '*[áéíóúñÁÉÍÓÚÑ]*'
    ORDER BY RANDOM()
    LIMIT 1
  `,
    )
    .get();

  if (!word) {
    const anyWord = db
      .prepare("SELECT * FROM words ORDER BY RANDOM() LIMIT 1")
      .get();
    return res.json({ word: rowToWord(anyWord), mode });
  }

  res.json({ word: rowToWord(word), mode });
});

// GET /api/quiz/fill-romaji - Obtener palabra para completar romaji
app.get("/api/quiz/fill-romaji", (req, res) => {
  // Solo palabras con romaji válido y de al menos 3 caracteres
  const word = db
    .prepare(
      `
    SELECT * FROM words
    WHERE romaji != ''
    AND LENGTH(romaji) >= 3
    AND romaji NOT LIKE '%ción%'
    AND romaji NOT GLOB '*[áéíóúñÁÉÍÓÚÑ]*'
    ORDER BY RANDOM()
    LIMIT 1
  `,
    )
    .get();

  if (!word) {
    return res.status(404).json({ error: "No suitable words found" });
  }

  const fullWord = rowToWord(word);
  const romaji = fullWord.romaji || "";

  // Ocultar aproximadamente 40% de los caracteres
  const hideRatio = 0.4;
  const charsToHide = Math.max(1, Math.floor(romaji.length * hideRatio));

  // Crear máscara con guiones bajos
  let maskedRomaji = romaji.split("");
  const positions = new Set<number>();

  // Seleccionar posiciones aleatorias para ocultar
  while (positions.size < charsToHide) {
    positions.add(Math.floor(Math.random() * romaji.length));
  }

  positions.forEach((pos) => {
    maskedRomaji[pos] = "_";
  });

  res.json({
    ...fullWord,
    maskedRomaji: maskedRomaji.join(""),
    positions: Array.from(positions),
  });
});

// POST /api/quiz/check - Verificar respuesta de quiz
app.post("/api/quiz/check", (req, res) => {
  const { wordId, answer, type } = req.body;

  const word = db.prepare("SELECT * FROM words WHERE id = ?").get(wordId);
  if (!word) {
    return res.status(404).json({ error: "Word not found" });
  }

  let isCorrect = false;
  let correctAnswer = "";

  switch (type) {
    case "translation-jp-to-es":
      correctAnswer = word.translation;
      isCorrect =
        answer.toLowerCase().trim() === word.translation.toLowerCase().trim();
      break;

    case "translation-es-to-jp":
      correctAnswer = word.kanji;
      isCorrect = answer.trim() === word.kanji.trim();
      break;

    case "fill-romaji":
      correctAnswer = word.romaji || "";
      isCorrect =
        answer.toLowerCase().trim() ===
        (word.romaji || "").toLowerCase().trim();
      break;

    default:
      return res.status(400).json({ error: "Invalid quiz type" });
  }

  res.json({ isCorrect, correctAnswer });
});

// GET /api/quiz/stats - Obtener estadísticas de quiz (opcional)
app.get("/api/quiz/stats", (req, res) => {
  // Por ahora solo devolvemos el total de palabras disponibles
  const total = db.prepare("SELECT COUNT(*) as count FROM words").get() as any;
  const filtered = db
    .prepare(
      `
    SELECT COUNT(*) as count FROM words
    WHERE romaji NOT GLOB '*[áéíóúñÁÉÍÓÚÑ]*'
  `,
    )
    .get() as any;

  res.json({
    totalWords: total.count,
    validWords: filtered.count,
  });
});

// POST /api/import (multipart/form-data)  field: file (xlsx)
app.post("/api/import", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Falta el archivo 'file' (.xlsx)" });
    }

    const wb = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = wb.SheetNames.includes("All") ? "All" : wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    if (!ws) {
      return res
        .status(400)
        .json({ error: "No se encontró hoja válida en el Excel" });
    }

    // Obtenemos filas como objetos, manteniendo strings vacíos
    const rows = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });

    // Normalizador de claves flexibles (acepta varias variantes)
    const key = (obj: any, names: string[]) => {
      const keys = Object.keys(obj);
      const found = keys.find((k) =>
        names.includes(String(k).toLowerCase().trim()),
      );
      return found ? String(obj[found]) : "";
    };

    // transacción + sentencias preparadas
    const insertStmt = db.prepare(
      `INSERT INTO words (kanji, romaji, translation) VALUES (?, ?, ?)
       ON CONFLICT(kanji, romaji) DO UPDATE SET translation=excluded.translation`,
    );

    let inserted = 0,
      updated = 0,
      skipped = 0;
    const errors: Array<{ row: number; reason: string }> = [];

    const tx = db.transaction((items: any[]) => {
      for (let i = 0; i < items.length; i++) {
        const r = items[i];

        const kanji = key(r, ["japanese", "kanji", "word"]).trim();
        const romaji = key(r, [
          "pronounciation",
          "pronunciation",
          "romaji",
        ]).trim();
        const translation = key(r, [
          "translation",
          "spanish",
          "es",
          "traduccion",
        ]).trim();

        if (!kanji || !translation) {
          skipped++;
          continue;
        }

        try {
          const info = insertStmt.run(kanji, romaji, translation);
          // better-sqlite3: info.changes === 1 ⇒ insert, === 0 ⇒ update (por upsert)
          if (info.changes === 1) inserted++;
          else updated++;
        } catch (e: any) {
          errors.push({
            row: i + 2 /* +2 por cabecera 1-based */,
            reason: e?.message || "Error desconocido",
          });
        }
      }
    });

    tx(rows);

    return res.json({
      sheet: sheetName,
      totalRows: rows.length,
      inserted,
      updated,
      skipped,
      errors,
    });
  } catch (err: any) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Error procesando el Excel", details: err?.message });
  }
});

// DELETE /api/words  -> elimina TODAS las filas
app.delete("/api/words", (req, res) => {
  // borra todo
  const info = db.prepare("DELETE FROM words").run();
  // opcional: resetea autoincrement
  try {
    db.exec("DELETE FROM sqlite_sequence WHERE name='words'");
  } catch {}
  // opcional: compacta el fichero
  try {
    db.exec("VACUUM");
  } catch {}

  res.json({ deleted: info.changes });
});

// ============ CHAT ENDPOINTS ============

// GET /api/chat/test - Verificar que el modelo de IA está configurado correctamente
app.get("/api/chat/test", async (req, res) => {
  // Intentar detectar si Ollama está configurado
  const isOllamaConfigured = process.env.OLLAMA_HOST;
  const ollamaUrl = process.env.OLLAMA_HOST || "";

  if (!isOllamaConfigured && !ZAI_API_KEY) {
    return res.status(500).json({
      configured: false,
      error: "Ningún modelo de IA está configurado",
      help: "Configura ZAI_API_KEY para usar zAI, o OLLAMA_HOST para usar Ollama local.",
    });
  }

  try {
    // Preparar mensajes de prueba
    const testMessages = [{ role: "user", content: "Hola, ¿cómo estás?" }];

    // Llamar al modelo de IA (función unificada)
    const testResponse = await callLLM(
      testMessages,
      isOllamaConfigured ? OLLAMA_MODEL : ZAI_MODEL,
      isOllamaConfigured ? undefined : ZAI_API_KEY,
      {
        zAI: ZAI_BASE_URL,
      },
    );

    res.json({
      configured: true,
      model: isOllamaConfigured ? OLLAMA_MODEL : ZAI_MODEL,
      service: isOllamaConfigured ? "Ollama" : "zAI",
      testResponse,
      message: `IA (${isOllamaConfigured ? "Ollama" : "zAI"}) está configurado correctamente!`,
    });
  } catch (error: any) {
    const service = process.env.OLLAMA_HOST ? "Ollama" : "zAI";
    res.status(500).json({
      configured: false,
      error: error.message,
      help: `Verifica que tu ${service} API key es válida (zAI: https://open.bigmodel.cn/ | Ollama: http://cos-alicante.netbird.vpn)`,
    });
  }
});

// GET /api/chat/sessions - Obtener todas las sesiones de chat
app.get("/api/chat/sessions", (req, res) => {
  const sessions = db
    .prepare(
      `
    SELECT s.*, COUNT(m.id) as message_count
    FROM chat_sessions s
    LEFT JOIN chat_messages m ON s.id = m.session_id
    GROUP BY s.id
    ORDER BY s.updated_at DESC
  `,
    )
    .all();
  res.json(sessions);
});

// POST /api/chat/sessions - Crear nueva sesión
app.post("/api/chat/sessions", (req, res) => {
  const { topic } = req.body;
  const stmt = db.prepare("INSERT INTO chat_sessions (topic) VALUES (?)");
  const info = stmt.run(topic || "Chat General");
  const session = db
    .prepare("SELECT * FROM chat_sessions WHERE id = ?")
    .get(info.lastInsertRowid);
  res.status(201).json(session);
});

// GET /api/chat/sessions/:id/messages - Obtener mensajes de una sesión
app.get("/api/chat/sessions/:id/messages", (req, res) => {
  const sessionId = Number(req.params.id);
  const messages = db
    .prepare(
      "SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC",
    )
    .all(sessionId);
  res.json(messages);
});

// POST /api/chat/sessions/:id/messages - Enviar mensaje y obtener respuesta
app.post("/api/chat/sessions/:id/messages", async (req, res) => {
  const sessionId = Number(req.params.id);
  const { message, language = "ja" } = req.body;

  // Verificar si hay algún modelo de IA configurado
  const isOllamaConfigured = !!process.env.OLLAMA_HOST;

  if (!isOllamaConfigured && !ZAI_API_KEY) {
    return res.status(500).json({
      error: "Ningún modelo de IA está configurado",
      help: "Configura ZAI_API_KEY para usar zAI, o OLLAMA_HOST para usar Ollama local.",
    });
  }

  try {
    // Guardar mensaje del usuario
    const userStmt = db.prepare(
      "INSERT INTO chat_messages (session_id, role, content) VALUES (?, ?, ?)",
    );
    userStmt.run(sessionId, "user", message);

    // Obtener historial de la conversación
    const history = db
      .prepare(
        "SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC",
      )
      .all(sessionId);

    // Obtener palabras aleatorias del vocabulario para contexto
    const randomWords = db
      .prepare(
        "SELECT kanji, romaji, translation FROM words ORDER BY RANDOM() LIMIT 10",
      )
      .all();

    const vocabContext = randomWords
      .map((w: any) => `${w.kanji} (${w.romaji}): ${w.translation}`)
      .join("\n");

    // Preparar el prompt del sistema según el idioma
    const systemPrompt =
      language === "ja"
        ? `Eres un tutor de japonés amigable y servicial. Tu objetivo es ayudar al estudiante a practicar japonés de forma natural y educativa.
         Responde principalmente en japonés, pero puedes incluir explicaciones breves en español entre paréntesis cuando sea útil para el aprendizaje.
         Usa un nivel de japonés apropiado para estudiantes intermedios. Incluye furigana ocasionalmente para kanji difíciles.
         Aquí hay algunas palabras del vocabulario del estudiante que podrías usar en la conversación si es relevante:\n${vocabContext}
         Mantén las respuestas concisas pero educativas.`
        : `Eres un tutor de japonés amigable y servicial. Responde en español pero puedes incluir palabras o frases en japonés cuando sea educativo.
         El estudiante está aprendiendo japonés y quiere practicar.
         Aquí hay algunas palabras del vocabulario del estudiante:\n${vocabContext}
         Puedes hacer referencias a estas palabras si es relevante para la conversación.`;

    // Crear el array de mensajes para zAI GLM
    const messages: any[] = [
      { role: "system", content: systemPrompt },
      ...history.slice(-10).map((m: any) => ({
        // Limitar a últimos 10 mensajes para no exceder límites
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    // Llamar a zAI GLM
    const assistantMessage = await callZAIGLM(messages);

    // Guardar respuesta del asistente
    const assistantStmt = db.prepare(
      "INSERT INTO chat_messages (session_id, role, content) VALUES (?, ?, ?)",
    );
    const info = assistantStmt.run(sessionId, "assistant", assistantMessage);

    // Actualizar timestamp de la sesión
    db.prepare(
      "UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    ).run(sessionId);

    // Devolver la respuesta
    const savedMessage = db
      .prepare("SELECT * FROM chat_messages WHERE id = ?")
      .get(info.lastInsertRowid);
    res.json(savedMessage);
  } catch (error: any) {
    console.error("Error en chat:", error);
    res.status(500).json({
      error: "Error processing chat message",
      details: error?.message,
    });
  }
});

// DELETE /api/chat/sessions/:id - Eliminar una sesión y sus mensajes
app.delete("/api/chat/sessions/:id", (req, res) => {
  const sessionId = Number(req.params.id);

  // Primero eliminar mensajes
  db.prepare("DELETE FROM chat_messages WHERE session_id = ?").run(sessionId);

  // Luego eliminar sesión
  const info = db
    .prepare("DELETE FROM chat_sessions WHERE id = ?")
    .run(sessionId);

  if (info.changes === 0) {
    return res.status(404).json({ error: "Session not found" });
  }

  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "rpi4.netbird.vpn"; // 0.0.0.0 = todas las interfaces

app.listen(PORT, HOST, () => {
  console.log(`Backend listening on http://${HOST}:${PORT}`);
});
