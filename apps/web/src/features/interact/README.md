# Interacción y clase — P4

Se consume el cliente, los tipos y los componentes de P1/P3. No se modifican
contratos, rutas, dependencias, backend ni archivos del motor de P2.

## Estado actual

- `useSpeaker()` usa `api.tts` por defecto y permite inyectar otro transporte
  para pruebas. Se divide por oraciones, admite AbortSignal y stop inmediato.
  Un fallo/501/timeout de TTS usa el navegador. Solo se seleccionan voces
  españolas; se esperan hasta 2 s si aún están cargando. Sin voz española se
  informa el problema; la página de clase permite seguir con subtítulos.
- `useInterruptTriggers` admite botón, espacio, palma y frases. Los sensores
  requieren activación del alumno. El vídeo se procesa localmente.
- MediaPipe usa el WASM 0.10.35, alineado con el lockfile publicado por P3.
  El gesto exige palma abierta, confianza 0.7, muñeca arriba y 600 ms continuos;
  necesita bajar la mano antes de repetir y respeta un enfriamiento de 3 s.
- El reconocimiento normaliza tildes y filtra el eco del speaker. La captura
  de dudas termina tras 1.2 s de silencio, 10 s sin voz o un máximo de 45 s.
- `InterruptOverlay` permite dictar o escribir; la clase conecta pausa,
  `api.ask`, aclaración de P2 y reanudación. Las respuestas tardías no se aplican
  a una clase nueva. Si falla la aclaración, el alumno decide cómo seguir.

## Rutas P4

- `/sandbox/interaccion`: prueba de voz, sensores y captura de dudas.
- `/alumno`: nombre, salón opcional y acceso a ambas puertas.
- `/alumno/problema`: problema dibujado, foto, polling y resultado. Se validan
  imágenes de hasta 8 MB. Una baja confianza necesita revisión y no se presenta
  como un error confirmado. El verde requiere confirmación del servidor.
- `/alumno/explicame`: quiz recibido de P1 y clase según el nivel devuelto.
- `/clase?diagnosis=...` o `/clase?lesson=...`: reproductor de P2, interrupción,
  aclaración y explicación final. El inicio requiere clic; los sensores son
  opcionales. El avance se comunica a P1 sin inventar aciertos ni semáforos.

## Verificación realizada

- `npm run check`: tipos, ESLint y compilación de la aplicación completa.
- 36 pruebas: motores de interacción, hooks y persistencia de la sesión.
  El ejecutor `tsx` y `react-test-renderer` se usaron desde un entorno temporal;
  no se agregaron al manifiesto compartido.
- Navegador, con `VITE_USE_MOCKS=true`: entrada como Kevin, tres preguntas,
  clase en modo subtítulos, pausa por botón, pregunta escrita, aclaración,
  reanudación hasta el final y retroalimentación a su explicación.
- Navegador, con mocks: problema, carga de PNG sintético, polling y resultado
  de error con acceso a su clase. Esto prueba el flujo, no la visión real.

## Pendientes reales

- Integrar la rama `p2/pizarra-viva` en main, incluidos sus archivos
  `public/board/caveat-latin.ttf` y `Caveat-OFL.txt`. Los módulos de P2 se
  consumieron localmente y no deben incluirse en el commit/PR de P4.
- Probar Grok Voice con el backend y su configuración real. Los mocks de P1
  devuelven 501 para TTS. Este navegador integrado no ofrece voz española.
- Medir mano y micrófono reales en el equipo y lugar de la demo. El modelo
  de mano y el reconocimiento del navegador pueden requerir conexión.
- Verificar el cambio del semáforo docente con la API real y hojas reales;
  los mocks actuales tienen respuestas y estados de ejemplo.
- Grabar el video de respaldo cuando la demo integrada tenga audio real.
