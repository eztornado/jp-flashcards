---
id: spec-pdf-export
type: module-design
title: Exportaciones del admin: PDF y mazos Anki
status: draft
---

# Exportaciones del admin: PDF y mazos Anki

## Propósito

Módulo de exportación del backend (`backend/src/exports/`) para llevarse el contenido de la app fuera de ella: listados PDF de vocabulario y kanji, y mazos Anki (.apkg) para estudio con repetición espaciada. Punto común: el texto japonés exige soporte específico (fuente CJK en PDF, formato .apkg para Anki).

## Contrato

Todos los endpoints comparten: `requireRole("ADMIN")`, mismo `WHERE ... LIKE` que los endpoints de listado para `?search=`, orden **id ascendente** (decisión de producto: orden natural del temario, no el id DESC de las tablas del admin), y lista vacía → fichero con mensaje/mazo sin notas en lugar de error. El frontend descarga vía `api.get(..., { responseType: 'blob' })` para que el interceptor aporte el JWT; un `<a href>` directo no sirve porque no llevaría el header de autorización.

- `GET /api/export/words.pdf?search=` → `vocabulario.pdf` (Kanji / Romaji / Traducción).
- `GET /api/export/kanji.pdf?search=` → `kanji.pdf` (Kanji / Onyomi / Kunyomi / Traducción).
- `GET /api/export/words.apkg?search=` → `vocabulario.apkg`, mazo `JP Flashcards::Vocabulario`.
- `GET /api/export/kanji.apkg?search=` → `kanji.apkg`, mazo `JP Flashcards::Kanji`.

## Decisiones

### PDF (`pdf.ts`)

- **Generación en backend, no en el navegador** (decisión del usuario): descarga en un clic desde los botones "Exportar PDF" del admin, independiente del navegador. Alternativas descartadas: jsPDF en frontend (fuente CJK dentro del bundle JS) y vista imprimible + `window.print()` (dos pasos).
- **pdfkit con NotoSansJP-Regular.ttf estática** (5,7 MB) versionada en `backend/src/assets/`: pdfkit subsetting al generar, así que los PDFs finales pesan pocos KB aunque la fuente sea grande. La fuente variable de Google Fonts no sirve: pdfkit la abre en su instancia Thin.
- **tsc no copia binarios a `dist/`**: el script `build` de backend copia `src/assets` → `dist/assets`; `resolveFontPath()` prueba `src/` (dev con tsx) y `dist/` (producción) antes de fallar.
- Sin negrita real: solo se versiona NotoSansJP-Regular (la jerarquía visual se hace con tamaño y color).
- Errores de streaming a mitad de PDF no se pueden deshacer (headers ya enviados); se loguean en consola.

### Anki (`anki.ts`)

- **`.apkg` real, no TSV** (decisión del usuario): importación en un clic con doble clic en el fichero, sin mapear columnas; alternativo TSV descartado por requerir configuración manual al importar. Generado con `anki-apkg-export` 5.0.0 (esquema legacy `collection.anki2`, probado por su autor contra Anki 26.09; `ankipack` descartada por menos rodada).
- **Dirección japonés → español** (decisión del usuario): 1 tarjeta por registro; cara delantera el japonés, trasera lectura + traducción. La opción "ambas direcciones" (reconocimiento + producción) se descartó por duplicar el mazo.
- **noteIds estables** (`words-<id>` / `kanji-<id>`): re-importar un mazo actualizado actualiza las notas en Anki en lugar de duplicarlas.
- Modelos custom con campos separados (Palabra/Romaji/Traducción; Kanji/Onyomi/Kunyomi/Traducción) y CSS compartido: japonés grande y centrado, lecturas en gris.

## Limitaciones conocidas

- Los .apkg llevan tag `jp-flashcards` en todas las notas.

## Post-mortem

- pdfkit añade una página en blanco si el pie de página cae fuera del `maxY` de la página (dispara el autoPageBreak aunque el texto quepa): al dibujar el pie con `bufferPages` hay que anular `doc.page.margins.bottom` durante el dibujado y restaurarlo después.
