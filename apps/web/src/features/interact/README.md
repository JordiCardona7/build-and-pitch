# P4 — Interacción, alumno y respaldo de demo

Cambios exclusivos de `features/interact`, `features/student` y la sandbox de
interacción. Se consumen los contratos, API, pizarra y componentes publicados
por P1/P2/P3. No se manejan llaves ni se cambia la configuración del backend.

## Implementación

- Speaker con `api.tts` por defecto. Separa oraciones, conserva audio reciente,
  comparte peticiones pendientes y reutiliza el audio al reanudar. La caché está
  limitada a 32 oraciones/8 MB; un 501 evita repetir la petición durante 30 s.
  La espera de TTS es de 16 s, compatible con el límite de 15 s del backend.
  `stop()` y AbortSignal cancelan inmediatamente incluso durante esa espera.
- Respaldo del navegador exclusivamente en español; nunca se selecciona una voz
  inglesa. Si no existe voz, la clase permite continuar con subtítulos.
- Interrupción por botón, espacio, frases y palma abierta durante 600 ms.
  Enfriamiento de mano de 3 s y nueva activación solo después de bajarla.
  Cámara procesada localmente con MediaPipe 0.10.35. Cámara y micrófono optativos.
- Reconocimiento es-GT con respaldo es-MX, reinicio controlado y filtro del eco.
  La duda termina después de 1.2 s de silencio. Cancelar siempre libera la escucha.
- Clase: cargar, clic para empezar, pausa, pregunta, aclaración y reanudación.
  Si la API de aclaración falla o supera 10 s se usan tres pasos locales con otra
  representación. Se conservan los operandos cuando pueden leerse de la lección;
  en otros casos se etiqueta el dibujo como un nuevo ejemplo. No se aplican
  respuestas tardías a otra clase y no se envían preguntas duplicadas.
- El avance se guarda con P1, se actualizan las estrellas y se ofrece reintento
  si falla el guardado. No se arma una racha local cuando el servidor no lo guardó.
- Práctica: foto <=8 MB, polling limitado, revisión de baja confianza, resultado,
  clase del error y nuevo problema dirigido. Después de la clase, el primer
  acierto conserva tipo y dificultad; el segundo permite avanzar. Mostrar verde
  exige dos aciertos y confirmación del servidor. Una hoja pendiente, fallida o
  en revisión nunca cuenta como acierto.
- Quiz inicial con protección contra doble respuesta, manejo de vacío y clase
  del nivel devuelto por P1. Explicación final dictada o escrita.
- Grabador en `/sandbox/interaccion`: pantalla, audio compartido y micrófono
  opcional, límite de 4 min/64 MB, vista previa y descarga WebM/MP4 según soporte.
  Solo guarda localmente. Detener, salir, denegar permisos o recibir permisos
  tardíos libera los dispositivos y evita grabaciones en segundo plano.

## Validación de este cierre

- `npm run check`: TypeScript estricto, ESLint y build de toda la web.
- 59 pruebas automáticas de voz, interrupción, captura, sesión, caché, grabación,
  respaldo pedagógico y racha. Ejecutadas sin dispositivos físicos ni xAI.
  Se usó un ejecutor de pruebas temporal; no se cambió el package compartido.
- API FastAPI local, sin credenciales de xAI: crear alumno, problema dirigido,
  quiz, clase, preguntar, explicar, guardar avance y respuesta 501 de TTS.
- Navegador con API local y `VITE_USE_MOCKS=false` solo en el proceso de prueba:
  entrar como Kevin P4, responder quiz, manejar voz no configurada, iniciar con
  subtítulos, interrumpir, preguntar, ver aclaración, reanudar hasta terminar y
  recibir retroalimentación a su explicación escrita.
- Ya se había probado el flujo de foto y diagnóstico con mocks y PNG sintético.
  Eso verifica el frontend; no valida la precisión de la visión real de P1.

## Frontera con P1 y verificación en el lugar

P4 solo llama `api.tts`; P1 proporciona su servicio y configuración. No se pidió,
almacenó ni usó una llave xAI. El audio real de Grok sigue pendiente de comprobar
con el servicio configurado por P1; la respuesta 501 sí se verificó realmente.

El backend publicado usa `VERIFY_STREAK=1` por defecto para la demo. Para que el
semáforo docente también respete los dos aciertos del PRD, P1 debe publicar su
servicio con `VERIFY_STREAK=2`. P4 no cambia esa configuración ni simula verde.
Los mocks de P1 tienen estados de ejemplo; P1 debe hacerlos evolucionar para
ensayar el semáforo completo sin backend.

En la laptop y la red de la demo quedan las pruebas físicas: sostener la palma,
decir cada frase con la voz de la pizarra sonando y medir que se pausa en <1 s.
Los tests de dispositivos simulados no sustituyen esa medición.

## Grabar el respaldo final

1. Abrir `/sandbox/interaccion` y dejarla abierta como control de grabación.
2. Abrir la demo en otra pestaña, con la voz y API que haya configurado P1.
3. Pulsar «Grabar respaldo», elegir la pestaña de la demo y compartir su audio.
   Activar el micrófono opcional si se desea incluir la pregunta del jurado.
4. Seguir PRD §6.4: semáforo -> Kevin -> foto -> clase -> mano/duda -> verde.
5. Volver al control, detener, revisar el video y descargarlo. La interfaz avisa
   si no llegó audio; ese archivo no sirve como respaldo de una demo con voz.

El archivo final de la demo todavía no está grabado. Requiere seleccionar la
pestaña en el navegador y tener el audio real listo; no se presenta una grabación
silenciosa ni un test simulado como el video final.
