// Carga de variables de entorno.
// IMPORTANTE: este módulo debe importarse como PRIMER import de index.ts.
// En ESM todos los imports se evalúan antes del cuerpo del módulo, así que
// llamar a dotenv.config() dentro de index.ts llega demasiado tarde para
// módulos que leen process.env al cargarse (p. ej. auth/utils.ts).
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Tanto en src/ (tsx) como en dist/ (build) el .env vive un nivel arriba.
// DOTENV_CONFIG_PATH permite sobrescribirlo si hiciera falta.
const envPath = process.env.DOTENV_CONFIG_PATH || path.resolve(__dirname, "..", ".env");
dotenv.config({ path: envPath });
