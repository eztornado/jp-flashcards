#!/usr/bin/env node
const Database = require("better-sqlite3");
const bcrypt = require("bcrypt");
const readline = require("readline");
const path = require("path");

const DATA_PATH = process.env.DATA_PATH || path.join(__dirname, "data");
const dbPath = path.join(DATA_PATH, "words.sqlite");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  console.log("\n🔐 Crear nuevo administrador\n");

  const username = await question("Username: ");
  if (!username || username.length < 3) {
    console.error("❌ Username debe tener al menos 3 caracteres");
    process.exit(1);
  }

  const password = await question("Password (mínimo 8 caracteres): ");
  if (!password || password.length < 8) {
    console.error("❌ Password debe tener al menos 8 caracteres");
    process.exit(1);
  }

  const confirm = await question("Confirmar password: ");
  if (password !== confirm) {
    console.error("❌ Los passwords no coinciden");
    process.exit(1);
  }

  const db = new Database(dbPath);

  // One-time bootstrap: solo crear si no existe ningún ADMIN
  const existingAdmin = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'ADMIN'").get();
  if (existingAdmin.count > 0) {
    console.error("❌ Ya existe un administrador. Usa la API para crear más usuarios.");
    console.error("   Para resetear, modifica la BD directamente.");
    process.exit(1);
  }

  const existing = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (existing) {
    console.error(`❌ El usuario '${username}' ya existe`);
    process.exit(1);
  }

  const password_hash = await bcrypt.hash(password, 10);

  const stmt = db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'ADMIN')");
  const info = stmt.run(username, password_hash);

  console.log(`\n✅ Administrador creado (ID: ${info.lastInsertRowid})`);
  console.log(`   Username: ${username}`);
  console.log(`   Role: ADMIN\n`);

  rl.close();
  db.close();
}

main().catch(console.error);
