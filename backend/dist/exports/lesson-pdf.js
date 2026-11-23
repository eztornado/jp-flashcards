import fs from "fs";
import puppeteer from "puppeteer-core";
// Chromium viene del sistema: en el contenedor (apk chromium) y en dev
// (Chrome instalado localmente). CHROMIUM_PATH permite sobreescribirlo.
function resolveChromiumPath() {
    const candidates = [
        process.env.CHROMIUM_PATH,
        "/usr/bin/chromium-browser",
        "/usr/bin/chromium",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/google-chrome",
    ].filter(Boolean);
    for (const candidate of candidates) {
        if (fs.existsSync(candidate))
            return candidate;
    }
    throw new Error("Chromium no encontrado (instala chromium en el contenedor o define CHROMIUM_PATH)");
}
// CSS de impresión: mantiene los colores de la lección pero elimina lo que
// no tiene sentido en papel (sombra de la tarjeta, fondo gris del body,
// ancho máximo de pantalla) y apunta los <details> para que se impriman
// desplegados (ver openDetails()).
const PRINT_CSS = `
@media print {
  body { background: #fff !important; padding: 0 !important; }
  main { box-shadow: none !important; border-radius: 0 !important; max-width: none !important; }
}
`;
async function renderLessonPdf(html) {
    const browser = await puppeteer.launch({
        executablePath: resolveChromiumPath(),
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"],
    });
    try {
        const page = await browser.newPage();
        await page.setContent(html.replace(/<\/head>/i, `<style>${PRINT_CSS}</style></head>`), { waitUntil: "load", timeout: 30000 });
        await page.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
        return (await page.pdf({
            format: "A4",
            printBackground: true,
            margin: { top: "12mm", bottom: "12mm", left: "12mm", right: "12mm" },
            timeout: 30000,
        }));
    }
    finally {
        await browser.close();
    }
}
/**
 * Genera el PDF de una lección (HTML autocontenido) con Chromium headless,
 * respetando su diseño, y lo envía por la respuesta HTTP como attachment.
 */
export async function sendLessonPdf(res, lessonId, html) {
    const pdf = await renderLessonPdf(html);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(lessonId)}.pdf"`);
    res.end(pdf);
}
