# Exportación PDF de listados (vocabulario y kanji)

## Propósito

Módulo de generación de PDFs del backend (`backend/src/exports/pdf.ts`) para exportar el listado completo de vocabulario y de kanji desde el backoffice administrador. Cubre el soporte de texto japonés en PDF, que ninguna librería renderiza sin incrustar una fuente CJK.

## Contrato

- `GET /api/export/words.pdf?search=` → `vocabulario.pdf` (columnas Kanji / Romaji / Traducción).
- `GET /api/export/kanji.pdf?search=` → `kanji.pdf` (columnas Kanji / Onyomi / Kunyomi / Traducción).
- Ambos requieren rol ADMIN (`requireRole`). Respuesta `application/pdf` con `Content-Disposition: attachment`.
- `search` replica el mismo `WHERE ... LIKE` que los endpoints de listado; sin `search` se exporta todo.
- Orden **id ascendente** (decisión de producto: orden natural del temario, no el id DESC de las tablas del admin).
- Listado vacío → PDF con cabecera y mensaje "No hay registros...", no un error.

## Decisiones

- **Generación en backend, no en el navegador** (decisión del usuario): descarga en un clic desde el botón "Exportar PDF" de las tabs Vocabulario/Kanji del admin, independiente del navegador. Alternativas descartadas: jsPDF en frontend (fuente CJK dentro del bundle JS) y vista imprimible + `window.print()` (dos pasos).
- **pdfkit con NotoSansJP-Regular.ttf estática** (5,7 MB) versionada en `backend/src/assets/`: pdfkit subsetting al generar, así que los PDFs finales pesan pocos KB aunque la fuente sea grande. La fuente variable de Google Fonts no sirve: pdfkit la abre en su instancia Thin.
- **tsc no copia binarios a `dist/`**: el script `build` de backend copia `src/assets` → `dist/assets`; `resolveFontPath()` prueba `src/` (dev con tsx) y `dist/` (producción) antes de fallar.
- El frontend descarga vía `api.get(..., { responseType: 'blob' })` para que el interceptor aporte el JWT; no sirve un `<a href>` directo porque no llevaría el header de autorización.

## Limitaciones conocidas

- Sin negrita real: solo se versiona NotoSansJP-Regular (la jerarquía visual se hace con tamaño y color).
- Errores de streaming a mitad de PDF no se pueden deshacer (headers ya enviados); se loguean en consola.

## Post-mortem

- pdfkit añade una página en blanco si el pie de página cae fuera del `maxY` de la página (dispara el autoPageBreak aunque el texto quepa): al dibujar el pie con `bufferPages` hay que anular `doc.page.margins.bottom` durante el dibujado y restaurarlo después.
