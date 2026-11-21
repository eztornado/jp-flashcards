import AnkiExport from "anki-apkg-export";
// CSS compartido por los modelos de tarjeta: japonés grande y centrado,
// lecturas en gris por debajo.
const CARD_CSS = `
.card { font-family: sans-serif; font-size: 32px; text-align: center; color: #212529; }
.reading { font-size: 20px; color: #868e96; }
.meaning { font-size: 24px; }
hr#answer { border: none; border-top: 1px solid #dee2e6; margin: 12px 0; }
`;
/**
 * Genera un mazo .apkg (formato collection.anki2, compatible con todas las
 * apps de Anki) y lo envía por la respuesta HTTP como attachment.
 */
export async function sendAnkiDeck(res, filename, options) {
    const apkg = await AnkiExport.create(options.deckName);
    try {
        const modelId = apkg.addModel({
            name: options.modelName,
            fields: options.fields,
            sortField: options.sortField,
            css: CARD_CSS,
            templates: [
                {
                    name: "Significado",
                    questionFormat: options.questionFormat,
                    answerFormat: options.answerFormat,
                    requiredFields: [options.fields[0]],
                },
            ],
        });
        for (const note of options.notes) {
            apkg.addNote(Object.fromEntries(note.values.map((value, i) => [options.fields[i], value])), { modelId, noteId: note.noteId, tags: ["jp-flashcards"] });
        }
        const buffer = await apkg.save();
        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
        res.end(buffer);
    }
    finally {
        apkg.close();
    }
}
