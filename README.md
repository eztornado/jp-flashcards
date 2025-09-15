# JP Flashcards

App de tarjetas para estudiar japonés (Kanji, Romaji y traducción en español).  
Incluye **frontend** (React + Mantine) y **backend** (Express + SQLite), sin usuarios.

## Contenido
- **data/words.sqlite** → base de datos SQLite ya pre-cargada con 100 palabras del Excel que adjuntaste (hoja "All").
- **backend** → API REST (Express + TypeScript + better-sqlite3).
- **frontend** → React + Vite + Mantine.

## Requisitos
- Node 18+

## Cómo arrancar en desarrollo
En dos terminales:

```bash
# 1) Backend
cd backend
npm i
npm run dev
# → corre en http://localhost:5174

# 2) Frontend
cd ../frontend
npm i
npm run dev
# → abre http://localhost:5173
```

El frontend proxya /api al backend, así que no hace falta configurar CORS en dev.

## Build de producción (opcional)
Puedes construir el frontend y servirlo con cualquier servidor estático, manteniendo el backend por separado o sirviendo ambos desde nginx/caddy.

## Endpoints API principales
- `GET /api/random` → devuelve una palabra aleatoria.
- `GET /api/words?search=&page=&pageSize=` → lista paginada.
- `POST /api/words` → crea palabra. Body: `{ kanji, romaji?, translation }`
- `PUT /api/words/:id` → edita palabra.
- `DELETE /api/words/:id` → elimina palabra.

## Notas
- El Excel que usaste tiene columnas: **japanese**, **pronounciation** (romaji) y **translation**.
- Si más adelante quieres importar las ~3000 palabras, repite el proceso generando otra base, o añade un endpoint de importación.
