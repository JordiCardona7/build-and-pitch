# PRD — [NOMBRE]
> **Sacamos a la IA del chat y la pusimos en una pizarra.**
> Versión 1.0 · Hackathon Build & Pitch · UVG · 21 nov 2026 · Track 02 EdTech
> El nombre del producto está pendiente. En el código se usa una sola constante (`BRAND.name` en `apps/web/src/shared/brand.ts`); nunca lo escribas a mano en otro lado.

---

## 1. Resumen

[NOMBRE] es una plataforma web donde una IA **enseña en una pizarra**, no en un chat. Un marcador escribe, dibuja tortillas partidas y barras que se colorean, y encierra en rojo el paso exacto donde te equivocaste, mientras una voz te explica. Si te pierdes, **levantas la mano o dices "no entendí"**: la pizarra se detiene a medio trazo, te lo explica de otra forma en una hoja aparte y retoma donde iba.

Tiene **dos puertas** que comparten el mismo motor:

| Puerta | Quién | Qué pasa |
|---|---|---|
| **Aula** | El docente | Sube la clave del ejercicio y fotos de las hojas resueltas a mano. La IA encuentra el paso exacto del error de cada alumno y arma un **semáforo** del salón agrupado por tipo de error. Cada alumno recibe una clase sobre *su* error. |
| **Solo** | El alumno | "**No sé nada, explícame**": averigua qué sabe y arranca desde ahí. "**Ponme un problema**": lo resuelve en papel, sube la foto, la IA lo califica, le explica su error en la pizarra y le pone otro problema ajustado. Lo que practica solo, el docente lo ve en su semáforo. |

**Alcance de contenido: solo suma de fracciones con distinto denominador (1ro básico, 13–15 años).** No es un tutor genérico; es una experiencia profunda para un tema donde los estudiantes se quedan atrás y sobre el cual se construye el álgebra.

---

## 2. Problema

- **PISA 2025 Guatemala:** solo el **8 %** de los estudiantes de 15 años alcanzó el nivel mínimo en matemáticas.
- **Un plan para 40:** el docente enseña igual a todos; no sabe a tiempo quién se perdió ni *en qué*.
- **Práctica sin respuesta:** se hacen ejercicios, pero nadie dice a tiempo qué está mal y por qué.
- **Casa sin herramientas:** el alumno que quiere estudiar solo no tiene a quién preguntar.
- **El chat no enseña bien:** un muro de texto no muestra el razonamiento, y si no entiendes una parte tienes que leer otro muro. Un ChatGPT sin guardas hizo que estudiantes rindieran **17 % peor** al quitárselo (Bastani et al., PNAS 2025).

### Respaldo científico (para el pitch y para decisiones de diseño)
| Hallazgo | Fuente | Cómo lo usamos |
|---|---|---|
| Ver al instructor **dibujar** enseña más que ver diagramas ya hechos; la mano/marcador visible importa. | Fiorella & Mayer (UCSB, 2015–2016) | Trazo progresivo con un marcador visible. Nada aparece "de golpe". |
| Ver dibujos generados en vivo + **explicar con tus palabras** produce efectos grandes (d > 1.0). | Fiorella, Stull, Kuhlmann & Mayer, *J. Educ. Psych.* 2020 | Cada clase termina pidiendo al alumno que explique. |
| Voz + imagen > texto en pantalla; segmentos al ritmo del alumno; voz humana y conversacional. | Principios de Mayer (modalidad, segmentación, redundancia, voz, personalización) | La pizarra escribe poco; la voz explica. Pausar/interrumpir = segmentación. |
| La IA sin guardas se vuelve muleta; con diseño pedagógico, no. | Bastani et al., *PNAS* 2025 | La IA no da la respuesta: diagnostica, explica el error y pone a practicar. |
| El dominio de fracciones predice el rendimiento posterior en álgebra y matemática. | Siegler et al., *Psychological Science* 2012 (verificar cita) | Justifica enfocar todo en fracciones. |
| Videos de dibujo tipo Khan enganchan más que diapositivas. | Guo, Kim & Rubin, L@S 2014 (6.9 M sesiones) | Estética de pizarra, no de presentación. |

---

## 3. Usuarios

**Persona 1 — Profe Carmen**, 34 años, docente de Matemática en un instituto de Mixco. Tres secciones de 1ro básico, 38–42 alumnos cada una. Califica en papel los fines de semana. Tiene teléfono Android y una laptop. *Quiere saber rápido quién no entendió y qué hacer con ellos sin dar 40 clases distintas.*

**Persona 2 — Kevin**, 14 años, 1ro básico. Copió el procedimiento de la pizarra, pero en el examen sumó 1/2 + 1/3 = 2/5. Le da pena preguntar frente al salón. En casa tiene el teléfono de su mamá y a veces la compu del café internet. *Quiere entenderlo sin que nadie se dé cuenta de que no entendió.*

---

## 4. Objetivos y métricas

**Objetivo del hackathon:** ganar el track EdTech demostrando en vivo que alguien **comprende algo que le costaba** y que el docente **sabe a quién ayudar y en qué**.

**Criterios de éxito de la demo (no negociables):**
1. Del upload de una foto real de una hoja escrita a mano al diagnóstico correcto en **< 15 s**.
2. La pizarra dibuja **fluido a 60 fps**, voz y trazo sincronizados.
3. Una interrupción en vivo (mano o voz) **pausa a medio trazo en < 1 s** y la clase retoma exactamente donde iba.
4. Un alumno pasa de **rojo a verde** en el semáforo frente al jurado.
5. La demo funciona **aunque falle el internet** (lecciones y diagnósticos de respaldo guardados, y video grabado).

**Métricas de producto (para el pitch, como visión):** % de alumnos que pasan a verde tras una clase, tiempo que ahorra el docente al calificar, errores más frecuentes por salón.

---

## 5. Alcance

### MUST (sin esto no hay demo)
- **M1. Diagnóstico por foto (docente):** subir clave + fotos de hojas → transcripción por pasos, paso del error, código de error, explicación corta, confianza.
- **M2. Semáforo:** salón agrupado por tipo de error, en rojo/amarillo/verde; ver la hoja de cada alumno con el error marcado; el docente confirma o corrige el diagnóstico.
- **M3. Pizarra Viva:** reproduce lecciones (JSON de pasos `say` + `draw`) con trazo a mano, marcador visible, **tortillas (círculos)**, **barras**, fracciones verticales, flechas, círculos de error; voz sincronizada; subtítulos.
- **M4. Interrupción:** botón ✋ + **mano levantada a la cámara** + **frases de voz** ("no entendí", "me perdí", "espera", "no le entiendo", "otra vez"). Pausa, hoja de aclaración con otra representación, regreso.
- **M5. Puerta Solo – "Ponme un problema":** problema generado → foto de la hoja → diagnóstico → clase del error → nuevo problema ajustado al error.
- **M6. Lecciones por cada código de error**, pregeneradas y personalizables con los números del alumno.
- **M7. Datos de respaldo:** salón demo con ~25 alumnos, 3–4 hojas reales fotografiadas y sus diagnósticos guardados.

### SHOULD (si hay tiempo, en este orden)
- **S1. Puerta Solo – "No sé nada, explícame":** mini diagnóstico de 3 preguntas tocables/orales → nivel de entrada → clase desde ese nivel.
- **S2.** Al final de la clase, el alumno **explica con su voz** y la IA le da retroalimentación en una frase.
- **S3.** Voz de **Grok Voice** (respaldo automático: voz del navegador).
- **S4.** En la foto de la hoja, **círculo rojo sobre el paso equivocado** (coordenadas de la IA).
- **S5.** Celebración al pasar a verde (animación de tiza/confeti suave + sonido).

### WON'T (para la diapositiva de "siguientes pasos")
Otros temas, otros grados, que el docente suba "su método", modo offline real, apps nativas, login con cuentas reales, rankings entre alumnos, detección de emociones por cámara, idiomas mayas.

---

## 6. Experiencia — flujos

### 6.1 Puerta Aula (docente)
1. **Inicio docente** → "Nueva tarea".
2. **Clave:** foto o texto del ejercicio resuelto (ej. `1/2 + 1/3 = 3/6 + 2/6 = 5/6`). La app muestra lo que leyó: *"Ejercicio: 1/2 + 1/3 · Respuesta: 5/6"* → el docente confirma.
3. **Hojas:** el docente toma fotos (cámara o galería, varias a la vez). Cada foto entra como una tarjeta con estado *"Leyendo…"* (animación de marcador garabateando). El nombre del alumno se lee de la hoja; si no se puede, el docente lo escribe.
4. **Semáforo:** aparecen grupos tipo *notas adhesivas* por error: "Suma numeradores y denominadores — 14 alumnos". Contadores grandes rojo/amarillo/verde. Los diagnósticos de baja confianza van a una columna gris *"Revisar"*.
5. **Detalle de alumno:** foto de su hoja con el paso marcado, transcripción paso a paso, diagnóstico de la IA, botón **Confirmar** / **Cambiar error**.
6. **Clases:** por cada grupo, botón "Ver clase" (para proyectarla al grupo) y "Compartir con alumnos" (link/QR por alumno).
7. En vivo, el semáforo se actualiza cuando los alumnos avanzan (polling 2–3 s).

### 6.2 Puerta Solo (alumno)
**Entrada:** pantalla con dos botones grandes: **"No sé nada, explícame"** y **"Ponme un problema"**. Si viene de un link del docente, entra directo a *su* clase.

**"Ponme un problema" (MUST):**
1. Muestra el problema escrito a mano en una mini pizarra: *"Resuelve en tu hoja: 2/5 + 1/4"*.
2. "Ya lo resolví" → cámara → foto.
3. *"Revisando tu hoja…"* → resultado: si está bien, celebración y otro problema más difícil; si no, muestra **su foto con el paso marcado** + *"Te equivocaste aquí: sumaste los de abajo."* → botón **"Explícamelo en la pizarra"**.
4. Pizarra Viva con la lección de ese error **usando sus números**.
5. Al terminar: "Explícame con tus palabras" (S2) → nuevo problema elegido para atacar ese mismo error.
6. Dos aciertos seguidos después de la clase → **verde**.

**"No sé nada, explícame" (SHOULD):**
1. Tres preguntas rápidas, tocables, dibujadas: ¿qué parte de la tortilla está pintada? · ¿1/2 y 2/4 son iguales? · ¿cuánto es 1/4 + 1/4?
2. Según dónde se rompe → nivel: `CONCEPTO_FRACCION`, `EQUIVALENCIA`, `DENOMINADOR_COMUN` o `SUMA`.
3. Pizarra desde ese nivel → al final, "Ponme un problema".

### 6.3 Pizarra Viva (compartida)
- Pantalla completa, pizarra blanca 1000×600 (escala a cualquier tamaño, sin deformarse).
- Arriba: título de la clase y progreso por pasos (puntos). Abajo: subtítulo de lo que dice la voz y botón ✋.
- Indicadores discretos: 🎥 "levanta la mano si te pierdes" y 🎙️ "di *no entendí*" con estado activo/inactivo.
- **Interrupción:** el trazo se congela, aparece *"Te escucho…"*, el alumno dice su duda (o la escribe). La pizarra **pasa la hoja** (animación de página) a una hoja amarilla de aclaración, explica con otra representación (si usaba barras → tortillas o quetzales), dice *"¿Ahora sí? Sigamos"* y regresa la hoja; continúa la oración donde iba.
- Cada clase termina con: *"Tu turno: explícamelo con tus palabras"* y un problema de verificación.

### 6.4 Guion de la demo (3 minutos)
1. **(0:00) El problema:** 8 % PISA. Contraste: un chat tirando un muro de texto.
2. **(0:30) En el aula:** el docente sube la clave y 3 fotos de hojas reales. El semáforo se arma solo (salón demo ya cargado de ~25). *"14 alumnos suman numeradores y denominadores."* Abre la hoja de Kevin: el error marcado.
3. **(1:15) Esa noche, en casa:** Kevin entra a la Puerta Solo, "Ponme un problema". Lo resuelve en papel, sube foto, se equivoca. Pizarra Viva. **Un miembro del jurado levanta la mano** y pregunta. La pizarra se detiene, aclara con tortillas, retoma.
4. **(2:30) Al día siguiente:** Kevin resuelve bien el problema de verificación → en el semáforo de la profe pasa a **verde**.
5. **(2:50) Cierre:** "No es un chat. Es una pizarra que te ve equivocarte y te enseña exactamente eso."

---

## 7. Requisitos funcionales

### RF-1 Diagnóstico de hojas (backend, Grok visión)
- Entrada: imagen (JPG/PNG/HEIC→JPG, ≤ 8 MB, se redimensiona a 1600 px lado largo) + clave del ejercicio.
- Salida (ver `docs/CONTRACTS.md` → `Diagnosis`): transcripción por renglón, respuesta final, ¿correcta?, código de error, índice del paso equivocado, explicación corta en español para el alumno, confianza 0–1, y (S4) caja aproximada del paso equivocado.
- **Híbrido:** la IA transcribe y propone el error; **el backend verifica con reglas** la respuesta final (fracciones equivalentes cuentan como correctas) y la consistencia del código de error. Si la IA y las reglas discrepan o confianza < 0.6 → `needs_review`.
- Respuestas equivalentes no simplificadas (10/12) son **correctas** con observación "puedes simplificar".

### RF-2 Taxonomía de errores (suma con distinto denominador)
| Código | Descripción | Ejemplo con 1/2 + 1/3 |
|---|---|---|
| `SUMA_DIRECTA` | Suma numeradores y denominadores | 2/5 |
| `NUMERADOR_SIN_AJUSTAR` | Cambia al denominador común pero no ajusta numeradores | 2/6 |
| `SUMA_DENOMINADORES` | Convierte bien pero suma también los denominadores | 3/6 + 2/6 = 5/12 |
| `AMPLIFICACION_INCORRECTA` | Multiplica el numerador por un factor equivocado | 1/2 → 2/6 (multiplicó por 2 en vez de 3) |
| `DENOMINADOR_NO_COMUN` | Elige un denominador que no es múltiplo común | usa 5 o 8 |
| `MULTIPLICA` | Multiplica en vez de sumar | 1/6 |
| `ERROR_ARITMETICO` | Procedimiento correcto, cuenta mal | 3/6 + 2/6 = 6/6 |
| `OTRO` | No encaja; va a revisión del docente | — |

### RF-3 Semáforo
- Estados por alumno: `rojo` (error sin clase), `amarillo` (vio la clase o está practicando), `verde` (resolvió bien el problema de verificación o no tuvo error), `revisar` (gris, confianza baja).
- El docente puede cambiar el código de error; queda marcado como "corregido por docente" y la clase asignada cambia.
- Incluye práctica hecha en la Puerta Solo por alumnos de ese salón.

### RF-4 Lecciones
- Formato único (ver contratos): `steps[]` con `say` (voz) y `draw` (ops), opcional `checkpoint`.
- Una lección base por código de error y por nivel (`CONCEPTO_FRACCION`, `EQUIVALENCIA`, `DENOMINADOR_COMUN`, `SUMA`).
- **Personalización:** el backend sustituye los números del alumno (`{a}`, `{b}`, `{wrong}`, `{right}`) en plantillas o pide a Grok una versión con esos números; resultado cacheado.
- Reglas pedagógicas: paso 1 muestra el ejercicio del alumno y encierra su error; usa tortillas o barras para que *vea* por qué; máx. 7 pasos; `say` ≤ 35 palabras; contexto guatemalteco (tortillas, quetzales, terrenos); último paso pide explicar con sus palabras.

### RF-5 Interrupción
- Disparadores: botón ✋, tecla espacio, **mano levantada ≥ 0.6 s** sobre la altura del hombro (MediaPipe en el navegador), **frases clave** detectadas en reconocimiento de voz continuo mientras la clase corre.
- Mientras la voz de la pizarra habla, se ignora el reconocimiento de su propio audio (eco).
- Tiempo de pausa < 1 s; la oración interrumpida se repite al reanudar.
- Aclaración: Grok genera 1–3 pasos con otra representación; respaldo local si falla.

### RF-6 Problemas (Puerta Solo)
- Generador determinista en backend: pares `a/b + c/d` con denominadores 2–12, distintos, dificultad 1–3 (1: uno múltiplo del otro; 2: coprimos pequeños; 3: mcm no trivial).
- Si el último error fue X, el siguiente problema está diseñado para provocar/verificar X.

---

## 8. Requisitos no funcionales
- **Visual (prioridad alta):** ver `docs/DESIGN.md`. La app debe sentirse terminada: estados vacíos, de carga y de error diseñados; nada de spinners genéricos ni texto de relleno.
- **Rendimiento:** pizarra a 60 fps en una laptop de gama media; primera carga < 3 s en red local.
- **Responsivo:** docente optimizado para laptop/proyector (≥ 1280 px) y usable en teléfono; alumno optimizado para teléfono y laptop.
- **Idioma:** español de Guatemala, de tú, cálido. Nada de inglés visible.
- **Accesibilidad:** subtítulos siempre visibles, contraste AA, todo usable con teclado.
- **Privacidad (para el pitch):** fotos de hojas solo del salón; sin rostros guardados; la cámara de la mano se procesa en el navegador y no se envía.
- **Robustez de demo:** modo `DEMO` que usa datos guardados si la API tarda > 12 s.

---

## 9. Arquitectura

```
apps/web  (React + Vite + TypeScript + Tailwind + Framer Motion)
  ├─ features/board      Pizarra: motor de trazo, ops, reproductor de lecciones     (P2)
  ├─ features/interact   Voz (TTS), oído (STT + frases clave), mano (MediaPipe),
  │                      controlador de interrupción                                (P4)
  ├─ features/teacher    Puerta Aula: tareas, subida de fotos, semáforo, detalle     (P3)
  ├─ features/student    Puerta Solo: inicio, problema, resultado, explícame         (P4)
  ├─ shared/ui           Sistema de diseño: componentes base                         (P3)
  ├─ shared/api          Cliente HTTP + tipos + mocks                                (P1)
  └─ shared/brand.ts     Nombre y textos de marca                                    (P3)

apps/api  (Python 3.11 + FastAPI + SQLModel/SQLite)                                (P1)
  └─ app/
     ├─ main.py               app, CORS, montaje de routers
     ├─ schemas.py            modelos Pydantic = espejo de CONTRACTS.md
     ├─ routers/              teacher.py, student.py, lessons.py, interact.py, meta.py
     ├─ services/vision.py    Grok visión → transcripción + diagnóstico
     ├─ services/rules.py     verificación con reglas (fracciones)
     ├─ services/lessons.py   plantillas, personalización y caché de lecciones
     ├─ services/problems.py  generador de problemas
     ├─ services/voice.py     proxy a Grok Voice TTS
     └─ data/                 lecciones pregeneradas, hojas demo, salón demo
```

- **IA:** API de xAI (compatible con SDK de OpenAI, `base_url=https://api.x.ai/v1`). Modelo con visión para diagnóstico; modelo de texto para lecciones/aclaraciones; Grok Voice para TTS. Nombres exactos de modelo en variables de entorno.
- **Persistencia:** SQLite (archivo local). Imágenes en `apps/api/storage/`.
- **Sin login:** el docente crea un salón y obtiene un código (ej. `MAT-1B`); el alumno entra con su nombre y, opcionalmente, ese código.

---

## 10. Plan de trabajo
Ver `docs/WORKFLOW.md` (ramas, propiedad de archivos, horarios de integración) y `docs/roles/P1..P4.md` (tareas detalladas de cada persona).

| Fase | Tiempo | Resultado |
|---|---|---|
| F0 Arranque | 0:00–0:45 | Repo con esqueleto, contratos congelados, mocks; cada quien corre su parte aislada |
| F1 Núcleo | 0:45–3:30 | Diagnóstico real con Grok; pizarra con todas las ops; semáforo con mocks; voz e interrupción por botón |
| Integración 1 | 3:30–4:00 | Flujo docente de punta a punta con API real |
| F2 Magia | 4:00–6:30 | Mano y frases de voz; Puerta Solo "Ponme un problema"; lecciones personalizadas; pulido visual |
| Integración 2 | 6:30–7:00 | Demo completa de punta a punta |
| F3 Cierre | 7:00–8:30 | **Congelar funciones**, bugs, pulido, datos demo, **grabar video**, ensayo del pitch ×3 |

---

## 11. Riesgos
| Riesgo | Mitigación |
|---|---|
| La IA lee mal la letra a mano | Clave del docente + verificación con reglas + estado "revisar" + hojas demo escritas con letra clara |
| API lenta o sin internet en el evento | Diagnósticos y lecciones guardados; modo DEMO; video de respaldo |
| Ruido del salón activa o bloquea la voz | Frases clave específicas + botón ✋ siempre visible |
| Cámara sin buena luz para la mano | Umbral ajustable + botón ✋ |
| Conflictos de Git entre 4 | Propiedad de carpetas, contratos congelados, PR pequeños (ver WORKFLOW) |
| El jurado lo ve como "tutor genérico" | Tema único, error específico, docente al centro, contexto Guatemala |

---

## 12. Modelo de sostenibilidad (diapositiva)
- **Gratis para el alumno** en la Puerta Solo con límite diario.
- **Licencia por docente o por colegio** para la Puerta Aula (semáforo, salones ilimitados); **1 salón gratis por docente** y gratis para escuelas públicas vía alianzas (MINEDUC, ONGs, fundaciones).
- Costos: el diagnóstico por foto y la voz son los costos variables; las lecciones se cachean y se reutilizan entre miles de alumnos con el mismo error.
