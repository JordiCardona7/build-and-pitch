# Sistema de diseño — "Escolar cálido"

> Meta: que el jurado diga *"esto se ve como un producto real"*. Que el docente sienta confianza y el alumno de 14 años sienta que es **suyo**, no "cosa del colegio".
> Dueño: **P3**. Todos lo usan. Tokens en `apps/web/tailwind.config.ts` y `apps/web/src/styles/globals.css`.

## 1. Concepto
Un **escritorio de estudio bien iluminado**: papel crema, cuaderno, notas adhesivas, marcadores de colores y una **pizarra blanca** que es la protagonista. Cálido y tangible, pero con la limpieza y el ritmo de una app moderna (espaciado generoso, tipografía fuerte, animaciones suaves). Nunca infantil: nada de mascotas caricaturescas ni colores chillones.

**Referencias de sensación:** Notion (orden y calma) + Duolingo (celebraciones) + la textura de un cuaderno real.

## 2. Color

| Token | Hex | Uso |
|---|---|---|
| `paper` | `#FBF6EC` | Fondo general de la app (papel crema) |
| `paper-2` | `#F3EBDD` | Secciones, barras laterales |
| `card` | `#FFFFFF` | Tarjetas |
| `ink` | `#1F2430` | Texto principal (tinta) |
| `ink-soft` | `#5B6170` | Texto secundario |
| `line` | `#E4D9C6` | Bordes, divisores (como renglones) |
| `board` | `#FFFFFF` | La pizarra |
| `board-frame` | `#C9CDD3` | Marco de aluminio de la pizarra |
| `marker-blue` | `#1D4ED8` | Color principal de marca / acciones |
| `marker-red` | `#D62828` | Errores, círculos rojos |
| `marker-green` | `#15803D` | Correcto |
| `marker-purple` | `#7C3AED` | Énfasis |
| `marker-orange` | `#EA7A12` | Tortillas, calidez |
| `sticky-yellow` | `#FFE58A` | Notas adhesivas, aclaraciones |
| `sticky-pink` | `#FFC9D6` | Notas adhesivas |
| `sticky-blue` | `#C7E3FF` | Notas adhesivas |
| `light-red` | `#EF4444` | Semáforo rojo |
| `light-yellow` | `#F5B700` | Semáforo amarillo |
| `light-green` | `#22C55E` | Semáforo verde |
| `light-gray` | `#A8A29E` | "Revisar" |

Reglas: el **azul marcador** es el color de acción (botones primarios). El rojo **solo** significa error. Fondos siempre crema, nunca blanco puro de pared a pared (excepto la pizarra).

## 3. Tipografía
| Rol | Fuente | Uso |
|---|---|---|
| Títulos | **Bricolage Grotesque** 700–800 | Moderna con carácter juvenil |
| Interfaz | **Inter** 400–700 | Todo el texto de UI |
| A mano | **Caveat** 600–700 | Lo que escribe la pizarra, notas adhesivas, acentos ("¡Bien!") |

Escala: 14 / 16 / 18 / 22 / 28 / 36 / 48. Números grandes del semáforo: 56–72, Bricolage 800.

## 4. Forma y textura
- Bordes redondeados: tarjetas 16 px, botones 999 px (píldora), notas adhesivas 4 px con leve rotación (−2° a 2°).
- Sombras suaves y cálidas: `0 1px 0 #E4D9C6, 0 8px 24px rgba(91,70,40,.08)`.
- **Textura de papel** muy sutil en el fondo (ruido SVG al 3–4 % de opacidad).
- Detalles de "cuaderno": renglones tenues en áreas de texto largo, cinta adhesiva (washi) en esquinas de fotos de hojas.

## 5. Componentes clave (en `shared/ui`)
- `Button` (primary azul, secondary contorno tinta, ghost) — se hunde 2 px al presionar.
- `Card`, `StickyNote` (color + rotación), `PhotoCard` (foto de hoja con cinta y marca roja del error).
- `TrafficLight` (semáforo vertical con 3 luces que brillan), `StatusChip` (alumno con color de estado).
- `ScribbleLoader`: **el cargador oficial** — un marcador garabateando una línea. Prohibido el spinner genérico.
- `Stars`, `ProgressDots`, `EmptyState` (ilustración a mano + frase cálida), `Toast` ("¡Kevin pasó a verde!").
- `CameraCapture` (marco tipo hoja con guías de esquinas para encuadrar la foto).

## 6. La pizarra
- Pizarra blanca con **marco de aluminio** (gris claro con brillo), ligera sombra, bandeja con 3 marcadores dibujados abajo (decorativo).
- El **marcador** que escribe se ve siempre: tapa del color que está usando, sombra suave. (P2: imagen SVG de mano opcional si se ve bien.)
- Trazos con leve irregularidad (no perfectos), tinta con opacidad 0.95, el coloreado con 0.35–0.4.
- La **hoja de aclaración** es una nota adhesiva amarilla grande que entra deslizando con rotación leve y sale igual.
- Subtítulos debajo, Inter 20 px, en una franja de papel.

## 7. Movimiento (Framer Motion)
- Entradas: 200–300 ms, `easeOut`, desplazamiento de 8–12 px.
- Cambios de estado del semáforo: el chip del alumno **salta de grupo** con animación de layout (`layout` + `AnimatePresence`), y brilla al cambiar a verde.
- Celebración a verde: estrellas de tiza + confeti suave 1.2 s. Sin sonidos estridentes.
- Respeta `prefers-reduced-motion` (la pizarra sigue dibujando, pero sin confeti).

## 8. Voz y tono (textos)
De tú, cálido, corto, guatemalteco sin forzar. El error nunca es culpa: *"Aquí te confundiste, es de los errores más comunes"*.
| ❌ | ✅ |
|---|---|
| "Respuesta incorrecta." | "Casi. Te confundiste aquí 👇" |
| "Procesando imagen…" | "Revisando tu hoja…" |
| "Error 500" | "Algo se trabó. Probemos otra vez." |
| "Alumnos con error tipo A" | "14 sumaron también los de abajo" |

## 9. Pantallas y su "momento wow"
| Pantalla | Momento wow |
|---|---|
| Docente – subir hojas | Las fotos caen como hojas sobre el escritorio y cada una "se lee" con un marcador que la recorre |
| Docente – semáforo | Notas adhesivas por error que se llenan de nombres en vivo; contadores enormes |
| Docente – detalle | La foto de la hoja con el paso equivocado encerrado en rojo a mano |
| Alumno – inicio | Dos tarjetas grandes: "No sé nada, explícame" / "Ponme un problema" |
| Alumno – resultado | Su propia foto con el error marcado y una frase amable |
| Pizarra | El marcador dibujando tortillas mientras habla; la pausa al levantar la mano |
| Verde | El chip de Kevin cambia a verde en el tablero de la profe |
