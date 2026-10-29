# Lecciones: flujo de trabajo

Este directorio es el **taller de trabajo** para crear nuevas lecciones. Las lecciones que
sirve la web viven en el directorio raíz `html/` como ficheros `.html` autocontenidos; aquí
se preparan las imágenes de las que salen.

## Cómo funciona el sistema

- El backend lee las lecciones directamente del directorio `html/` (configurable con la
  variable de entorno `LESSONS_PATH`; en Docker se monta como volumen). No hay tabla de
  lecciones en la base de datos.
- Cada fichero `html/L<n>-<m>.html` es una lección: el identificador es el nombre del fichero
  sin extensión (p. ej. `L1-1`), el título se saca del `<h1>` del documento y la descripción
  del `<meta name="description">`.
- El listado se ordena de forma natural por el código `L<n>-<m>` (L1-1, L1-3, L2-1, …).
- El panel de administración puede crear, editar y borrar lecciones: cada operación escribe
  o elimina el fichero correspondiente en `html/` (el título y la descripción se guardan
  dentro del propio HTML).

## Flujo para crear una lección nueva

1. Crea aquí una carpeta con el código de la lección, siguiendo la numeración del libro de
   gramática (p. ej. `L16-1`, `L16-2`…).
2. Mete en la carpeta:
   - una captura de la página del libro de gramática japonesa que explica el punto, y
   - fotos de las notas gramaticales del libro japonés-español que apoyan esa explicación.
3. Pide la conversión: con las imágenes de la carpeta se genera la lección completa
   (explicaciones, ejemplos, vocabulario y repaso) leyendo la captura japonesa y las notas
   en español, complementando con lo que haga falta.
4. El resultado se guarda como `html/L<n>-<m>.html` y aparece automáticamente en la web al
   recargar.

## Convenciones del HTML de una lección

- Documento **autocontenible**: CSS interno (tema verde), sin dependencias externas y
  **sin JavaScript** (la web lo renderiza en un iframe aislado con sandbox).
- `<h1>L<n>-<m>: título</h1>` como encabezado y
  `<meta name="description" content="...">` en el `<head>` con un resumen en español.
- Secciones habituales: índice de puntos gramaticales (`.indice`), explicaciones con
  ejemplos (`.ej`), puntos clave (`.clave`), tabla de vocabulario y repaso final con
  `<details>` para las respuestas.

## Cómo se generaron las lecciones actuales

Las 43 lecciones existentes (`L1-1` a `L15-2`) se crearon carpeta a carpeta: se leyó la
captura del libro de gramática japonesa de cada una junto con las fotos de las notas
gramaticales japonés-español, se transcribió y estructuró el contenido (explicación de cada
punto con sus ejemplos, vocabulario y repaso), se complementó con aclaraciones o ejemplos
adicionales donde convenía, y se escribió cada lección como un `.html` autocontenible
siguiendo las convenciones de arriba.
