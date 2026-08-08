import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import readline from "readline";
import { hashPassword } from "../auth/utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_PATH = process.env.DATA_PATH || path.resolve(__dirname, "..", "..", "..", "data");
const dbPath = path.join(DATA_PATH, "words.sqlite");

const db = new Database(dbPath);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

function hideQuery(query: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;

    stdin.setRawMode(true);
    stdout.write(query);

    let password = "";

    const onData = (char: Buffer) => {
      const charStr = char.toString();
      if (charStr === "\n" || charStr === "\r" || charStr === "") {
        stdin.setRawMode(false);
        stdin.removeListener("data", onData);
        stdout.write("\n");
        rl.close();
        resolve(password);
      } else if (charStr === "") {
        // Ctrl+C
        process.exit();
      } else if (charStr === "") {
        // Backspace
        if (password.length > 0) {
          password = password.slice(0, -1);
        }
      } else {
        password += charStr;
      }
    };

    stdin.on("data", onData);
  });
}

async function main() {
  console.log("\n=== Create Admin User ===\n");

  const username = await question("Username (min 3 chars, alphanumeric): ");

  if (username.length < 3) {
    console.error("Error: Username must be at least 3 characters");
    process.exit(1);
  }

  if (!/^[a-zA-Z0-9]+$/.test(username)) {
    console.error("Error: Username must be alphanumeric");
    process.exit(1);
  }

  // Check if user exists
  const existingUser = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (existingUser) {
    console.error("Error: User already exists");
    process.exit(1);
  }

  const password = await hideQuery("Password (min 8 chars): ");

  if (password.length < 8) {
    console.error("Error: Password must be at least 8 characters");
    process.exit(1);
  }

  const confirmPassword = await hideQuery("Confirm password: ");

  if (password !== confirmPassword) {
    console.error("Error: Passwords do not match");
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  const info = db
    .prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)")
    .run(username, passwordHash, "ADMIN");

  console.log(`\n✓ Admin user created successfully (ID: ${info.lastInsertRowid})`);
  console.log(`  Username: ${username}`);
  console.log(`  Role: ADMIN\n`);

  db.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
