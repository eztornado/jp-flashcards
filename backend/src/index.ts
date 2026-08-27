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

// Crear tabla para usuarios
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('USER', 'ADMIN')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

db.exec(`
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username
ON users(username);
`);
