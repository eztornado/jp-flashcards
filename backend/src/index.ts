import express, { Request } from "express";
import cors from "cors";
import Database from "better-sqlite3";
import { z } from "zod";
import path from "path";
import { fileURLToPath } from "url";
import multer, { FileFilterCallback } from "multer";
import * as XLSX from "xlsx";
import axios from "axios";
import dotenv from "dotenv";

// Extender tipos de Express para multer
declare global {
  namespace Express {
    interface Request {
      file?: Express.Multer.File;
    }
  }
}

// Cargar variables de entorno
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DB path con soporte para Docker y local
const DATA_PATH = process.env.DATA_PATH || path.resolve(__dirname, "..", "data");
const dbPath = path.join(DATA_PATH, "words.sqlite");

console.log(`[INFO] Database path: ${dbPath}`);
console.log(`[INFO] DATA_PATH: ${DATA_PATH}`);

// Asegurar que el directorio de datos existe
import fs from "fs";
if (!fs.existsSync(DATA_PATH)) {
  console.log(`[INFO] Creating data directory: ${DATA_PATH}`);
  fs.mkdirSync(DATA_PATH, { recursive: true });
}

let db: Database.Database;
try {
  db = new Database(dbPath);
  console.log('[INFO] Database connected successfully');
} catch (error) {
  console.error('[ERROR] Failed to initialize database:', error);
  process.exit(1);
}

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

// Crear tabla para kanji exclusivo
db.exec(`
CREATE TABLE IF NOT EXISTS kanji (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kanji TEXT NOT NULL,
  onyomi TEXT,
  kunyomi TEXT,
  translation TEXT NOT NULL
);
`);

db.exec(`
CREATE UNIQUE INDEX IF NOT EXISTS idx_kanji_kanji
ON kanji (kanji);
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

// Crear tabla para lecciones generadas desde capturas (OCR + Ollama)
db.exec(`
CREATE TABLE IF NOT EXISTS lessons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  html TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

// Configuración de zAI GLM
const ZAI_API_KEY = process.env.ZAI_API_KEY || "";
const ZAI_MODEL = process.env.ZAI_MODEL || "glm-4-flash";
const ZAI_BASE_URL = "https://open.bigmodel.cn/api/paas/v4";

// Configuración de Ollama Local
const OLLAMA_HOST = process.env.OLLAMA_HOST || "";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1";
// Configuración del microservicio OCR (reigreengroup)
const OCR_BASE_URL = (process.env.OCR_BASE_URL || "https://ocr.reigreengroup.com").replace(/\/$/, "");
const OCR_API_KEY = process.env.OCR_API_KEY || "";
const OLLAMA_CHAT_URL = OLLAMA_HOST
  ? `${OLLAMA_HOST.replace(/\/$/, '')}/api/chat`
  : "";

// Función auxiliar para llamar al modelo de IA (soporta zAI y Ollama)
async function callLLM(
  messages: any[],
  model: string,
  apiKey?: string,
  baseUrls?: any,
  extraOptions?: { temperature?: number; num_ctx?: number; max_tokens?: number },
): Promise<string> {
  try {
    // Verificar si estamos usando Ollama
    const isOllama = !!OLLAMA_HOST;

    if (isOllama) {
      // Llamada a Ollama usando /api/chat
      const ollamaMessages = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      console.log("[Ollama Request] URL:", OLLAMA_CHAT_URL);
      console.log("[Ollama Request] Model:", OLLAMA_MODEL);
      console.log("[Ollama Request] Messages:", ollamaMessages);

      const response = await axios.post(
        OLLAMA_CHAT_URL,
        {
          model: OLLAMA_MODEL,
          messages: ollamaMessages,
          stream: false,
          options: {
            temperature: extraOptions?.temperature ?? 0.7,
            top_p: 0.9,
            ...(extraOptions?.num_ctx ? { num_ctx: extraOptions.num_ctx } : {}),
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("[Ollama Response] Status:", response.status);
      console.log("[Ollama Response] Data:", JSON.stringify(response.data, null, 2));

      const reply = response.data.message?.content || response.data.response || "";
      if (!reply) {
        console.error("[Ollama Error] Empty response, full data:", response.data);
        return "Lo siento, no pude generar una respuesta.";
      }
      return reply;
    } else if (apiKey) {
      // Llamada a zAI GLM (retrocompatibilidad)
      const response = await axios.post(
        `${baseUrls.zAI}/chat/completions`,
        {
          model: model,
          messages: messages,
          temperature: extraOptions?.temperature ?? 0.7,
          max_tokens: extraOptions?.max_tokens ?? 500,
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
    const isOllama = !!OLLAMA_HOST;
    console.error(
      `[LLM Error] ${isOllama ? "Ollama" : "zAI GLM"}:`,
      error.response?.data || error.message
    );
    if (error.response) {
      console.error("[LLM Error] Status:", error.response.status);
      console.error("[LLM Error] Headers:", error.response.headers);
    }
    throw new Error(
      error.response?.data?.error?.message ||
        `Error al comunicarse con el modelo de IA (${isOllama ? "Ollama" : "zAI"})`
    );
  }
}

// Función auxiliar para llamar al microservicio OCR de Reigreengroup.
// Recibe el buffer del archivo (imagen o PDF) y devuelve el texto extraído (ocr_result).
async function callOCR(fileBuffer: Buffer, docType: string = "general"): Promise<string> {
  if (!OCR_API_KEY) throw new Error("El servicio OCR no está configurado (falta OCR_API_KEY)");

  const response = await axios.post(
    `${OCR_BASE_URL}/ocr`,
    {
      file: fileBuffer.toString("base64"),
      doc_type: docType,
    },
    {
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": OCR_API_KEY,
      },
      timeout: 600_000, // el OCR con LLM puede tardar varios minutos
      maxBodyLength: Infinity,
    }
  );

  const ocrResult = response.data?.ocr_result;
  if (!ocrResult || typeof ocrResult !== "string") {
    console.error("[OCR Error] Unexpected response:", JSON.stringify(response.data));
    throw new Error("El servicio OCR devolvió una respuesta inesperada");
  }
  return ocrResult;
}

// Extrae el primer bloque JSON válido del texto de respuesta del modelo
// (soporta ```json ... ```, texto antes/después, etc.)
function extractJson<T>(text: string): T {
  // Quitar fences de código
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {}

  // Buscar primer array u objeto balanceado
  for (const [open, close] of [
    ["[", "]"],
    ["{", "}"],
  ] as const) {
    const start = cleaned.indexOf(open);
    if (start === -1) continue;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (escaped) { escaped = false; continue; }
      if (ch === "\\") { escaped = true; continue; }
      if (ch === '"') inString = !inString;
      if (inString) continue;
      if (ch === open) depth++;
      else if (ch === close) {
        depth--;
        if (depth === 0) {
          const candidate = cleaned.slice(start, i + 1);
          return JSON.parse(candidate) as T;
        }
      }
    }
  }
  throw new Error("No se pudo extraer JSON válido de la respuesta del modelo");
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

const KanjiCreate = z.object({
  kanji: z.string().min(1).max(50),
  onyomi: z.string().max(255).optional(),
  kunyomi: z.string().max(255).optional(),
  translation: z.string().min(1).max(255),
});
const KanjiUpdate = z.object({
  kanji: z.string().min(1).max(50),
  onyomi: z.string().max(255).optional(),
  kunyomi: z.string().max(255).optional(),
  translation: z.string().min(1).max(255),
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

function rowToKanji(row: any) {
  return {
    id: row.id,
    kanji: row.kanji,
    onyomi: row.onyomi ?? "",
    kunyomi: row.kunyomi ?? "",
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

// ============ KANJI ENDPOINTS ============

// GET /api/kanji/random
app.get("/api/kanji/random", (req, res) => {
  const row = db.prepare("SELECT * FROM kanji ORDER BY RANDOM() LIMIT 1").get();
  if (!row) return res.status(404).json({ error: "No kanji found" });
  return res.json(rowToKanji(row));
});

// GET /api/kanji?search=&page=1&pageSize=20
app.get("/api/kanji", (req, res) => {
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
    where = "WHERE kanji LIKE ? OR onyomi LIKE ? OR kunyomi LIKE ? OR translation LIKE ?";
    const like = `%${search}%`;
    params = [like, like, like, like];
  }
  const totalRow = db
    .prepare(`SELECT COUNT(*) as cnt FROM kanji ${where}`)
    .get(...params);
  const total = (totalRow as any).cnt as number;

  const rows = db
    .prepare(`SELECT * FROM kanji ${where} ORDER BY id DESC LIMIT ? OFFSET ?`)
    .all(...params, pageSize, offset);
  const items = rows.map(rowToKanji);

  res.json({ items, total, page, pageSize });
});

// POST /api/kanji
app.post("/api/kanji", (req, res) => {
  const parsed = KanjiCreate.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });
  const { kanji, onyomi, kunyomi, translation } = parsed.data;
  const stmt = db.prepare(
    "INSERT INTO kanji (kanji, onyomi, kunyomi, translation) VALUES (?, ?, ?, ?)",
  );
  const info = stmt.run(kanji, onyomi ?? "", kunyomi ?? "", translation);
  const row = db
    .prepare("SELECT * FROM kanji WHERE id = ?")
    .get(info.lastInsertRowid);
  res.status(201).json(rowToKanji(row));
});

// PUT /api/kanji/:id
app.put("/api/kanji/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id))
    return res.status(400).json({ error: "Invalid id" });
  const parsed = KanjiUpdate.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });
  const { kanji, onyomi, kunyomi, translation } = parsed.data;
  const stmt = db.prepare(
    "UPDATE kanji SET kanji=?, onyomi=?, kunyomi=?, translation=? WHERE id=?",
  );
  const info = stmt.run(kanji, onyomi ?? "", kunyomi ?? "", translation, id);
  if (info.changes === 0) return res.status(404).json({ error: "Not found" });
  const row = db.prepare("SELECT * FROM kanji WHERE id = ?").get(id);
  res.json(rowToKanji(row));
});

// DELETE /api/kanji/:id
app.delete("/api/kanji/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id))
    return res.status(400).json({ error: "Invalid id" });
  const info = db.prepare("DELETE FROM kanji WHERE id=?").run(id);
  if (info.changes === 0) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

// DELETE /api/kanji  -> elimina TODOS los kanji
app.delete("/api/kanji", (req, res) => {
  const info = db.prepare("DELETE FROM kanji").run();
  try {
    db.exec("DELETE FROM sqlite_sequence WHERE name='kanji'");
  } catch {}
  try {
    db.exec("VACUUM");
  } catch {}
  res.json({ deleted: info.changes });
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

  const row = db.prepare("SELECT * FROM words WHERE id = ?").get(wordId);
  if (!row) {
    return res.status(404).json({ error: "Word not found" });
  }

  const word = rowToWord(row);
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

// ============ IMPORT POR OCR (microservicio OCR + Ollama) ============

// POST /api/import/ocr (multipart/form-data, campo "file": imagen o PDF)
// Extrae el texto de la imagen vía OCR y lo estructuriza en palabras
// compatibles con la tabla `words`. NO inserta nada: devuelve los items
// para que el admin los revise antes de guardar.
app.post("/api/import/ocr", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Falta el archivo 'file'" });
    }
    const isImage = req.file.mimetype?.startsWith("image/");
    if (!isImage && req.file.mimetype !== "application/pdf") {
      return res.status(400).json({ error: "El archivo debe ser una imagen o un PDF" });
    }

    const docType = (req.body?.doc_type as string) || "vocabulario_japones";
    console.log(`[OCR Import] Procesando ${req.file.originalname} (${req.file.mimetype}, doc_type=${docType})`);

    // 1) Extracción de texto con el microservicio OCR
    const ocrText = await callOCR(req.file.buffer, docType);

    // 2) Estructurización con el modelo de texto de Ollama
    const structured = await callLLM(
      [
        {
          role: "system",
          content:
            "Eres un asistente experto en japonés y en procesar texto extraído por OCR de libros/hojas de vocabulario. " +
            "Recibirás texto crudo extraído por OCR de una hoja de vocabulario japonés-español. " +
            "Tu tarea es devolver UNICAMENTE un array JSON válido (sin markdown, sin explicaciones) con todas las palabras detectadas, " +
            "con este formato exacto por elemento: {\"kanji\": \"...\", \"romaji\": \"...\", \"translation\": \"...\"}. " +
            "Reglas: 'kanji' es la palabra japonesa tal como aparece (kanji/kana); 'romaji' es su lectura en rōmaji " +
            "(si el texto muestra hiragana o furigana, conviértela a rōmaji estilo Hepburn sin macrones); " +
            "'translation' es la traducción al español (si el material está en otro idioma, tradúcelo al español). " +
            "Ignora encabezados, números de página, símbolos decorativos y basura de OCR. " +
            "Si una fila está ilegible u omítela. No inventes palabras que no estén en el texto.",
        },
        {
          role: "user",
          content: `Texto extraído por OCR:\n\n${ocrText}`,
        },
      ],
      OLLAMA_MODEL,
      undefined,
      { zAI: ZAI_BASE_URL }
    );

    let items: Array<{ kanji: string; romaji: string; translation: string }> = [];
    try {
      items = extractJson<Array<{ kanji?: string; romaji?: string; translation?: string }>>(structured)
        .filter((i) => i && typeof i.kanji === "string" && typeof i.translation === "string" && i.kanji.trim() && i.translation.trim())
        .map((i) => ({
          kanji: i.kanji!.trim(),
          romaji: (i.romaji ?? "").trim(),
          translation: i.translation!.trim(),
        }));
    } catch (e: any) {
      console.error("[OCR Import] Error parseando JSON:", e?.message, "\nRespuesta:", structured);
      return res.status(502).json({
        error: "No se pudo estructurar el texto extraído",
        details: e?.message,
        ocrText,
      });
    }

    res.json({
      totalItems: items.length,
      items,
      ocrTextPreview: ocrText.slice(0, 2000),
    });
  } catch (err: any) {
    console.error("[OCR Import] Error:", err?.response?.data || err?.message);
    return res.status(500).json({
      error: err?.message || "Error procesando la imagen con OCR",
    });
  }
});

// POST /api/import/ocr/save  Body: { items: [{kanji, romaji, translation}] }
// Guarda las palabras revisadas en la BD (upsert sobre kanji+romaji)
const OcrSaveBody = z.object({
  items: z.array(
    z.object({
      kanji: z.string().min(1),
      romaji: z.string().optional().default(""),
      translation: z.string().min(1),
    })
  ).min(1),
});

app.post("/api/import/ocr/save", (req, res) => {
  const parsed = OcrSaveBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const insertStmt = db.prepare(
    `INSERT INTO words (kanji, romaji, translation) VALUES (?, ?, ?)
     ON CONFLICT(kanji, romaji) DO UPDATE SET translation=excluded.translation`
  );

  let inserted = 0,
    updated = 0;
  const tx = db.transaction((items: any[]) => {
    for (const item of items) {
      const info = insertStmt.run(item.kanji, item.romaji ?? "", item.translation);
      if (info.changes === 1) inserted++;
      else updated++;
    }
  });

  tx(parsed.data.items);

  res.json({ inserted, updated, total: parsed.data.items.length });
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

// ============ LECCIONES (capturas -> páginas HTML) ============

const LessonCreate = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional().default(""),
  html: z.string().min(1),
});
const LessonUpdate = LessonCreate;

function rowToLesson(row: any, includeHtml = true) {
  const base = {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
  return includeHtml ? { ...base, html: row.html } : base;
}

// GET /api/lessons - listado de lecciones (sin el HTML pesado)
app.get("/api/lessons", (req, res) => {
  const rows = db
    .prepare("SELECT id, title, description, created_at, updated_at FROM lessons ORDER BY id DESC")
    .all();
  res.json(rows.map((r) => rowToLesson(r, false)));
});

// GET /api/lessons/:id - lección completa
app.get("/api/lessons/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
  const row = db.prepare("SELECT * FROM lessons WHERE id = ?").get(id);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(rowToLesson(row));
});

// POST /api/lessons - crear lección (html revisado/editado en el admin)
app.post("/api/lessons", (req, res) => {
  const parsed = LessonCreate.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { title, description, html } = parsed.data;
  const info = db
    .prepare("INSERT INTO lessons (title, description, html) VALUES (?, ?, ?)")
    .run(title, description ?? "", html);
  const row = db.prepare("SELECT * FROM lessons WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(rowToLesson(row));
});

// PUT /api/lessons/:id
app.put("/api/lessons/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
  const parsed = LessonUpdate.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { title, description, html } = parsed.data;
  const info = db
    .prepare(
      "UPDATE lessons SET title=?, description=?, html=?, updated_at=CURRENT_TIMESTAMP WHERE id=?"
    )
    .run(title, description ?? "", html, id);
  if (info.changes === 0) return res.status(404).json({ error: "Not found" });
  const row = db.prepare("SELECT * FROM lessons WHERE id = ?").get(id);
  res.json(rowToLesson(row));
});

// DELETE /api/lessons/:id
app.delete("/api/lessons/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
  const info = db.prepare("DELETE FROM lessons WHERE id=?").run(id);
  if (info.changes === 0) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

// POST /api/lessons/generate (multipart/form-data, campo "files": imágenes o PDFs)
// Procesa las capturas con OCR y genera una página explicativa HTML completa.
// NO guarda nada: devuelve el HTML para previsualizar/editar antes de crear la lección.
app.post("/api/lessons/generate", upload.array("files"), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "Falta al menos un archivo en 'files'" });
    }
    for (const f of files) {
      const okType = f.mimetype?.startsWith("image/") || f.mimetype === "application/pdf";
      if (!okType) {
        return res.status(400).json({ error: `Archivo no soportado: ${f.originalname} (${f.mimetype})` });
      }
    }

    // 1) OCR secuencial de cada captura
    const sections: string[] = [];
    for (let i = 0; i < files.length; i++) {
      console.log(`[Lesson Generate] OCR ${i + 1}/${files.length}: ${files[i].originalname}`);
      const text = await callOCR(files[i].buffer, "leccion_japones");
      sections.push(`--- CAPTURA ${i + 1} (${files[i].originalname}) ---\n${text}`);
    }
    const ocrText = sections.join("\n\n");

    // 2) Generación de la página explicativa completa
    const lessonPrompt =
      "Eres un profesor de japonés experto en crear material didáctico. " +
      "Recibirás el texto extraído por OCR de una o varias capturas de una lección de japonés (de una escuela o manual). " +
      "Tu tarea es convertir ese contenido en una PÁGINA EXPLICATIVA COMPLETA en HTML para que el estudiante la consulte siempre.\n\n" +
      "Requisitos del HTML:\n" +
      "- Devuelve UNICAMENTE código HTML completo, empezando por <!DOCTYPE html> y terminando con </html>. Sin markdown ni explicaciones.\n" +
      "- Incluye un <style> interno con diseño limpio, moderno y responsive (fuentes legibles, colores suaves, espaciados generosos, tablas y listas bien estilizadas).\n" +
      "- Estructura: título de la lección (<h1>), índice de contenidos si hay varias secciones, explicaciones claras de gramática y vocabulario, " +
      "tablas de vocabulario (japonés, lectura en rōmaji, español), ejemplos de uso con frases de ejemplo, y puntos clave destacados.\n" +
      "- Todo el contenido textual explicativo debe estar EN ESPAÑOL; conserva en japonés (con rōmaji entre paréntesis) las palabras, frases y ejemplos.\n" +
      "- Corrige errores evidentes del OCR usando contexto de japonés, pero NO inventes contenido que contradiga la fuente. Si algo es ilegible, indícalo sutilmente.\n" +
      "- Añade una sección final de repaso/resumen con los puntos más importantes de la lección.";

    console.log("[Lesson Generate] Llamando al modelo para generar HTML...");
    const html = await callLLM(
      [
        { role: "system", content: lessonPrompt },
        { role: "user", content: `Texto extraído por OCR:\n\n${ocrText}` },
      ],
      OLLAMA_MODEL,
      undefined,
      { zAI: ZAI_BASE_URL },
      { temperature: 0.4, num_ctx: 16384, max_tokens: 8000 }
    );

    // Limpiar posibles fences de código alrededor del HTML
    const cleanHtml = html
      .replace(/^\s*```(?:html)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    if (!cleanHtml.toLowerCase().includes("<html")) {
      return res.status(502).json({
        error: "El modelo no devolvió un documento HTML válido",
        rawPreview: cleanHtml.slice(0, 1000),
      });
    }

    // Extraer título del <h1> o <title> si existe
    let suggestedTitle = "";
    const h1Match = cleanHtml.match(/<h1[^>]*>(.*?)<\/h1>/is);
    const titleMatch = cleanHtml.match(/<title[^>]*>(.*?)<\/title>/is);
    const stripTags = (s: string) => s.replace(/<[^>]+>/g, "").trim();
    suggestedTitle = (h1Match && stripTags(h1Match[1])) || (titleMatch && stripTags(titleMatch[1])) || "";

    res.json({
      html: cleanHtml,
      suggestedTitle: suggestedTitle.slice(0, 200),
      capturesProcessed: files.length,
    });
  } catch (err: any) {
    console.error("[Lesson Generate] Error:", err?.response?.data || err?.message);
    return res.status(500).json({
      error: err?.message || "Error generando la lección",
    });
  }
});

// ============ CHAT ENDPOINTS ============

// GET /api/chat/test - Verificar que el modelo de IA está configurado correctamente
app.get("/api/chat/test", async (req, res) => {
  // Intentar detectar si Ollama está configurado
  const isOllamaConfigured = !!OLLAMA_HOST;
  const ollamaUrl = OLLAMA_HOST || "";

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
    const service = OLLAMA_HOST ? "Ollama" : "zAI";
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
  const isOllamaConfigured = !!OLLAMA_HOST;

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

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0"; // 0.0.0.0 = todas las interfaces

const server = app.listen(PORT, HOST, () => {
  console.log(`Backend listening on http://${HOST}:${PORT}`);
});

// Handler global de errores no tratados
process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Promise Rejection detected!');
  if (reason instanceof Error) {
    console.error(`[ERROR] ${reason.message}`);
  }
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('[FATAL] Uncaught Exception detected!');
  console.error(`[ERROR] ${error?.message || error?.toString() || 'Unknown'}`);
  process.exit(1);
});

// Manejar errores del servidor
server.on('error', (error: any) => {
  console.error('[ERROR] Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`[ERROR] Port ${PORT} is already in use`);
  }
  process.exit(1);
});
