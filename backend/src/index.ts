import express from "express";
import cors from "cors";
import Database from "better-sqlite3";
import { z } from "zod";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import * as XLSX from "xlsx";

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

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20 MB
});


// Schemas
const WordCreate = z.object({
  kanji: z.string().min(1),
  romaji: z.string().optional().default(""),
  translation: z.string().min(1)
});
const WordUpdate = z.object({
  kanji: z.string().min(1),
  romaji: z.string().optional().default(""),
  translation: z.string().min(1)
});

// Helpers
function rowToWord(row: any) {
  return { id: row.id, kanji: row.kanji, romaji: row.romaji ?? "", translation: row.translation };
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
  const pageSize = Math.min(Math.max(parseInt((req.query.pageSize as string) || "20", 10), 1), 100);
  const offset = (page - 1) * pageSize;

  let where = "";
  let params: any[] = [];
  if (search) {
    where = "WHERE kanji LIKE ? OR romaji LIKE ? OR translation LIKE ?";
    const like = `%${search}%`;
    params = [like, like, like];
  }
  const totalRow = db.prepare(`SELECT COUNT(*) as cnt FROM words ${where}`).get(...params);
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
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { kanji, romaji, translation } = parsed.data;
  const stmt = db.prepare("INSERT INTO words (kanji, romaji, translation) VALUES (?, ?, ?)");
  const info = stmt.run(kanji, romaji ?? "", translation);
  const row = db.prepare("SELECT * FROM words WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(rowToWord(row));
});

// PUT /api/words/:id
app.put("/api/words/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
  const parsed = WordUpdate.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { kanji, romaji, translation } = parsed.data;
  const stmt = db.prepare("UPDATE words SET kanji=?, romaji=?, translation=? WHERE id=?");
  const info = stmt.run(kanji, romaji ?? "", translation, id);
  if (info.changes === 0) return res.status(404).json({ error: "Not found" });
  const row = db.prepare("SELECT * FROM words WHERE id = ?").get(id);
  res.json(rowToWord(row));
});

// DELETE /api/words/:id
app.delete("/api/words/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
  const info = db.prepare("DELETE FROM words WHERE id=?").run(id);
  if (info.changes === 0) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
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
      return res.status(400).json({ error: "No se encontró hoja válida en el Excel" });
    }

    // Obtenemos filas como objetos, manteniendo strings vacíos
    const rows = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });

    // Normalizador de claves flexibles (acepta varias variantes)
    const key = (obj: any, names: string[]) => {
      const keys = Object.keys(obj);
      const found = keys.find(k => names.includes(String(k).toLowerCase().trim()));
      return found ? String(obj[found]) : "";
    };

    // transacción + sentencias preparadas
    const insertStmt = db.prepare(
        `INSERT INTO words (kanji, romaji, translation) VALUES (?, ?, ?)
       ON CONFLICT(kanji, romaji) DO UPDATE SET translation=excluded.translation`
    );

    let inserted = 0, updated = 0, skipped = 0;
    const errors: Array<{ row: number; reason: string }> = [];

    const tx = db.transaction((items: any[]) => {
      for (let i = 0; i < items.length; i++) {
        const r = items[i];

        const kanji = key(r, ["japanese", "kanji", "word"]).trim();
        const romaji = key(r, ["pronounciation", "pronunciation", "romaji"]).trim();
        const translation = key(r, ["translation", "spanish", "es", "traduccion"]).trim();

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
          errors.push({ row: i + 2 /* +2 por cabecera 1-based */, reason: e?.message || "Error desconocido" });
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
      errors
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Error procesando el Excel", details: err?.message });
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


const PORT = process.env.PORT || 5174;
app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});

