import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// La fuente se resuelve en tiempo de ejecución: en dev (tsx desde src/) está
// junto al código; en producción el script de build la copia a dist/assets/.
// Si tsc no copia assets, se prueban varias rutas.
function resolveFontPath() {
    const candidates = [
        path.resolve(__dirname, "../assets/NotoSansJP-Regular.ttf"),
        path.resolve(process.cwd(), "src/assets/NotoSansJP-Regular.ttf"),
        path.resolve(process.cwd(), "dist/assets/NotoSansJP-Regular.ttf"),
    ];
    for (const candidate of candidates) {
        if (fs.existsSync(candidate))
            return candidate;
    }
    throw new Error("NotoSansJP-Regular.ttf no encontrada (backend/src/assets)");
}
const PAGE_MARGIN = 36;
const ROW_FONT_SIZE = 10;
/**
 * Genera un PDF A4 con una tabla (cabecera repetida en cada página, filas
 * alternas y texto envuelto dentro de la columna) y lo envía por la respuesta
 * HTTP como attachment. La fuente japonesa se incrusta subsetting: solo se
 * incluyen los glifos usados.
 */
export function sendTablePdf(res, filename, options) {
    const fontPath = resolveFontPath();
    const doc = new PDFDocument({
        size: "A4",
        margin: PAGE_MARGIN,
        bufferPages: true,
        autoFirstPage: true,
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
    doc.pipe(res);
    const contentWidth = doc.page.width - PAGE_MARGIN * 2;
    const colWidths = options.colWidths.map((w) => (w / options.colWidths.reduce((a, b) => a + b, 0)) * contentWidth);
    const headerHeight = 22;
    const rowPadding = 5;
    // --- Cabecera del documento ---
    doc.font(fontPath).fontSize(18).fillColor("#1a1b1e").text(options.title);
    const generated = new Date().toLocaleString("es-ES");
    const countLabel = options.rows.length === 1 ? "1 registro" : `${options.rows.length} registros`;
    doc
        .fontSize(9)
        .fillColor("#868e96")
        .text(`Generado el ${generated} · ${countLabel}`);
    doc.moveDown(0.75);
    const startY = doc.y;
    const drawTableHeader = (y) => {
        doc.rect(PAGE_MARGIN, y, contentWidth, headerHeight).fill("#e9ecef");
        doc.fillColor("#343a40").fontSize(ROW_FONT_SIZE);
        let x = PAGE_MARGIN;
        for (let i = 0; i < options.headers.length; i++) {
            doc.text(options.headers[i], x + rowPadding, y + 5, {
                width: colWidths[i] - rowPadding * 2,
                align: "left",
                lineBreak: false,
            });
            x += colWidths[i];
        }
        return y + headerHeight;
    };
    const drawRow = (row, y, shaded) => {
        // Mide primero para conocer la altura de la fila (texto envuelto)
        doc.font(fontPath).fontSize(ROW_FONT_SIZE);
        const cellHeights = row.map((cell, i) => {
            const h = doc.heightOfString(cell || "—", {
                width: colWidths[i] - rowPadding * 2,
            });
            return h + rowPadding * 2;
        });
        const rowHeight = Math.max(...cellHeights, 18);
        if (shaded) {
            doc
                .rect(PAGE_MARGIN, y, contentWidth, rowHeight)
                .fill("#f8f9fa");
        }
        doc.fillColor("#212529");
        let x = PAGE_MARGIN;
        for (let i = 0; i < row.length; i++) {
            doc.text(row[i] || "—", x + rowPadding, y + rowPadding, {
                width: colWidths[i] - rowPadding * 2,
                align: "left",
            });
            x += colWidths[i];
        }
        return y + rowHeight;
    };
    const tableBottom = doc.page.height - PAGE_MARGIN - 16; // margen para el pie
    let y = drawTableHeader(startY);
    if (options.rows.length === 0) {
        doc
            .fillColor("#868e96")
            .fontSize(ROW_FONT_SIZE)
            .text(options.emptyMessage ?? "No hay registros.", PAGE_MARGIN, y + 10, {
            width: contentWidth,
        });
    }
    else {
        for (let r = 0; r < options.rows.length; r++) {
            // Reserva espacio para la fila más alta posible de esta fila
            doc.font(fontPath).fontSize(ROW_FONT_SIZE);
            const previewHeights = options.rows[r].map((cell, i) => doc.heightOfString(cell || "—", {
                width: colWidths[i] - rowPadding * 2,
            }));
            const needed = Math.max(...previewHeights, 8) + rowPadding * 2;
            if (y + needed > tableBottom) {
                doc.addPage();
                y = drawTableHeader(PAGE_MARGIN);
            }
            y = drawRow(options.rows[r], y, r % 2 === 1);
        }
    }
    // --- Pie: "Página X de Y" en todas las páginas ---
    // Se anula el margen inferior de la página al dibujar el pie para que
    // pdfkit no interprete la posición como "no cabe" y añada una página en
    // blanco (receta estándar con bufferPages).
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        const bottomMargin = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;
        doc
            .font(fontPath)
            .fontSize(8)
            .fillColor("#adb5bd")
            .text(`Página ${i + 1 - range.start} de ${range.count}`, PAGE_MARGIN, doc.page.height - PAGE_MARGIN + 12, { width: contentWidth, align: "center", lineBreak: false });
        doc.page.margins.bottom = bottomMargin;
    }
    doc.end();
}
