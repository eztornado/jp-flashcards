---
id: spec-pdf-export
type: module-design
title: Exportaciones del admin: PDF, mazos Anki y lecciones imprimibles
status: draft
---

# Exportaciones del admin: PDF, mazos Anki y lecciones imprimibles

## Propósito

Módulo de exportación del backend (`backend/src/exports/`) para llevarse el contenido de la app fuera de ella: listados PDF de vocabulario y kanji, mazos Anki (.apkg) para estudio con repetición espaciada, y PDFs imprimibles de las lecciones. Punto común: el texto japonés exige soporte específico (fuente CJK en PDF, formato .apkg para Anki, Chromium para el HTML de las lecciones).

## Contrato

Todos los endpoints comparten: `requireRole("ADMIN")` salvo el de lecciones (login de cualquier rol), mismo `WHERE ... LIKE` que los endpoints de listado para `?search=` (donde aplica), orden **id ascendente** (decisión de producto: orden natural del temario, no el id DESC de las tablas del admin), y lista vacía → fichero con mensaje/mazo sin notas en lugar de error. El frontend descarga vía `api.get(..., { responseType: 'blob' })` para que el interceptor aporte el JWT; un `<a href>` directo no sirve porque no llevaría el header de autorización.

- `GET /api/export/words.pdf?search=` → `vocabulario.pdf` (Kanji / Romaji / Traducción).
- `GET /api/export/kanji.pdf?search=` → `kanji.pdf` (Kanji / Onyomi / Kunyomi / Traducción).
- `GET /api/export/words.apkg?search=` → `vocabulario.apkg`, mazo `JP Flashcards::Vocabulario`.
- `GET /api/export/kanji.apkg?search=` → `kanji.apkg`, mazo `JP Flashcards::Kanji`.
- `GET /api/export/lessons/:id.pdf` → PDF imprimible de la lección `<id>` con su diseño original.

## Decisiones

### PDF (`pdf.ts`)

- **Generación en backend, no en el navegador** (decisión del usuario): descarga en un clic desde los botones "Exportar PDF" del admin, independiente del navegador. Alternativas descartadas: jsPDF en frontend (fuente CJK dentro del bundle JS) y vista imprimible + `window.print()` (dos pasos).
- **pdfkit con NotoSansJP-Regular.ttf estática** (5,7 MB) versionada en `backend/src/assets/`: pdfkit subsetting al generar, así que los PDFs finales pesan pocos KB aunque la fuente sea grande. La fuente variable de Google Fonts no sirve: pdfkit la abre en su instancia Thin.
- **tsc no copia binarios a `dist/`**: el script `build` de backend copia `src/assets` → `dist/assets`; `resolveFontPath()` prueba `src/` (dev con tsx) y `dist/` (producción) antes de fallar.
- Los .apkg llevan tag `jp-flashcards` en todas las notas.
- Sin negrita real en los PDFs de vocabulario/kanji: solo se versiona NotoSansJP-Regular (la jerarquía visual se hace con tamaño y color).
- Errores de streaming a mitad de PDF no se pueden deshacer (headers ya enviados); se loguean en consola.
- El PDF de lección necesita Chromium disponible: en dev sin Chrome instalado falla con mensaje claro (resolver `CHROMIUM_PATH`).

### Anki (`anki.ts`)

- **`.apkg` real, no TSV** (decisión del usuario): importación en un clic con doble clic en el fichero, sin mapear columnas; alternativo TSV descartado por requerir configuración manual al importar. Generado con `anki-apkg-export` 5.0.0 (esquema legacy `collection.anki2`, probado por su autor contra Anki 26.09; `ankipack` descartada por menos rodada).
- **Dirección japonés → español** (decisión del usuario): 1 tarjeta por registro; cara delantera el japonés, trasera lectura + traducción. La opción "ambas direcciones" (reconocimiento + producción) se descartó por duplicar el mazo.
- **noteIds estables** (`words-<id>` / `kanji-<id>`): re-importar un mazo actualizado actualiza las notas en Anki en lugar de duplicarlas.
- Modelos custom con campos separados (Palabra/Romaji/Traducción; Kanji/Onyomi/Kunyomi/Traducción) y CSS compartido: japonés grande y centrado, lecturas en gris.

### Lecciones (`lesson-pdf.ts`)

- **Chromium headless** (decisión del usuario): única opción que respeta el HTML de la lección tal cual (tablas, cajas de color, tipografía); pdfkit y vista imprimible descartados. Generado con `puppeteer-core` (sin Chromium empaquetado, usa el del sistema; render de una lección real probado: A4, japonés y fondos intactos).
- Endpoint `GET /api/export/lessons/:id.pdf`: **requiere login de cualquier rol** (USER o ADMIN, sin `requireRole`, como los endpoints de quiz). Las lecciones no son públicas en la app (`/lecciones/:id` va tras `ProtectedRoute`), así que el PDF tampoco lo es; el diseño original decía "público" y se corrigió al implementarlo.
- CSS de impresión inyectado (fondo blanco, sin sombra, ancho completo), `<details>` abiertos antes de renderizar, A4 con `printBackground: true` y márgenes 12 mm, timeout de 30 s y `browser.close()` en finally.
- `executablePath` resoluble por varios nombres + override `CHROMIUM_PATH`: dev usa Chrome local, el contenedor el `chromium` de Alpine.
- **Docker**: stage final del backend Dockerfile suma `chromium` y `font-noto-cjk` (fuente japonesa del contenedor; coste ~250-300 MB de imagen, aceptado en el diseño).
- Un PDF por lección (decisión del usuario); descartado el "libro completo" con todas concatenadas.

## Limitaciones conocidas

- Los .apkg llevan tag `jp-flashcards` en todas las notas.

## Post-mortem

- pdfkit añade una página en blanco si el pie de página cae fuera del `maxY` de la página (dispara el autoPageBreak aunque el texto quepa): al dibujar el pie con `bufferPages` hay que anular `doc.page.margins.bottom` durante el dibujado y restaurarlo después.
