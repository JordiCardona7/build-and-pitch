import { useRef, useState } from "react";
import {
  LessonPlayer,
  type Lesson,
  type Op,
  type PlayerHandle,
  type PlayerState,
} from "../../features/board";
import {
  asideSteps,
  demoLesson,
  operationExamples,
} from "../../features/board/examples";
import { parseLesson } from "../../features/board/parseLesson";
import { api } from "../../shared/api/client";
import { Button } from "../../shared/ui/Button";
import { ScribbleLoader } from "../../shared/ui/ScribbleLoader";

export function BoardSandbox({ lessons = [] }: { lessons?: Lesson[] }) {
  const player = useRef<PlayerHandle>();
  const [lesson, setLesson] = useState(demoLesson);
  const [json, setJson] = useState(JSON.stringify(demoLesson, null, 2));
  const [error, setError] = useState("");
  const [speed, setSpeed] = useState(1);
  const [state, setState] = useState<PlayerState>("idle");
  const [busy, setBusy] = useState(false);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [apiLessons, setApiLessons] = useState<Lesson[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const availableLessons = [
    ...new Map(
      [...lessons, ...apiLessons].map((item) => [item.id, item]),
    ).values(),
  ];
  const run = (next: Lesson): void => {
    setError("");
    setLesson(next);
    void player.current
      ?.play(next)
      .catch(() =>
        setError("Algo se trabó. Intenta reproducir la lección otra vez."),
      );
  };
  const preview = (): void => {
    try {
      run(parseLesson(json));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Revisa el formato de la lección.",
      );
    }
  };
  const drawOne = (op: Op): void => {
    const sample: Op[] =
      op.op === "clear"
        ? [
            {
              op: "write",
              text: "Borramos para probar otra idea",
              x: 110,
              y: 260,
              size: 46,
            },
            { op: "wait", ms: 400 },
            op,
          ]
        : op.op === "wait"
          ? [
              { op: "write", text: "Hacemos una pausa…", x: 120, y: 220 },
              op,
              {
                op: "write",
                text: "y seguimos.",
                x: 120,
                y: 310,
                color: "azul",
              },
            ]
          : [op];
    run({
      id: `board:op:${op.op}`,
      title: operationExamples[op.op].label,
      error_code: null,
      level: null,
      steps: [{ say: "", draw: sample }],
    });
  };
  const clarify = async (): Promise<void> => {
    setBusy(true);
    try {
      await player.current?.playAside(asideSteps);
    } catch {
      setError("No pudimos abrir la aclaración. Puedes seguir con la clase.");
    } finally {
      setBusy(false);
    }
  };
  const loadLessons = async (): Promise<void> => {
    setLoadingLessons(true);
    setError("");
    try {
      const meta = await api.meta();
      const ids = [
        ...Object.keys(meta.error_labels).map((code) => `error:${code}`),
        ...Object.keys(meta.level_labels).map((level) => `level:${level}`),
      ];
      const loaded = await Promise.all(ids.map((id) => api.getLesson(id)));
      setApiLessons(loaded);
      setSelectedId(loaded[0]?.id ?? "");
    } catch {
      setError(
        "No pudimos abrir las lecciones del servidor. Puedes seguir con la clase de prueba o pegar un JSON.",
      );
    } finally {
      setLoadingLessons(false);
    }
  };
  return (
    <main className="min-h-screen bg-paper px-4 py-8 font-sans text-ink sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-semibold text-marker-blue">
              Laboratorio de la pizarra
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Las ideas se entienden viéndolas.
            </h1>
            <p className="mt-2 text-ink-soft">
              Prueba un trazo, detén el marcador y sigue justo donde ibas.
            </p>
          </div>
          <span className="rounded-full border border-line bg-card px-4 py-2 text-sm text-ink-soft">
            Funciona sin conexión
          </span>
        </header>
        <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            <LessonPlayer
              lesson={lesson}
              speed={speed}
              onReady={(handle) => {
                player.current = handle;
              }}
              onStateChange={setState}
            />
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-line bg-paper-2 p-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => run(lesson)}
              >
                Desde el inicio
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={busy || !["playing", "paused"].includes(state)}
                onClick={() => void clarify()}
              >
                Ver otra explicación
              </Button>
              <label className="flex items-center gap-2 text-sm font-semibold">
                Ritmo
                <select
                  aria-label="Velocidad de reproducción"
                  className="rounded-lg border border-line bg-card px-2 py-2"
                  value={speed}
                  onChange={(event) => setSpeed(Number(event.target.value))}
                >
                  {[0.5, 1, 1.5, 2, 4].map((value) => (
                    <option key={value} value={value}>
                      {value}×
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <aside className="space-y-5">
            <section className="rounded-2xl border border-line bg-card p-5">
              <h2 className="mb-2 text-lg font-bold">
                Un marcador, muchas formas
              </h2>
              <p className="mb-4 text-sm text-ink-soft">
                Cada botón empieza una prueba nueva.
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.values(operationExamples).map(({ label, op }) => (
                  <Button
                    type="button"
                    variant="secondary"
                    key={op.op}
                    onClick={() => drawOne(op)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </section>
            <section className="rounded-2xl border border-line bg-sticky-yellow p-5">
              <h2 className="mb-2 text-lg font-bold">Una clase para probar</h2>
              <p className="mb-4 text-sm">
                Medios, tercios y una pregunta para comprobar que vamos juntos.
              </p>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setJson(JSON.stringify(demoLesson, null, 2));
                  run(demoLesson);
                }}
              >
                Ver la clase de fracciones
              </Button>
            </section>
            <section className="rounded-2xl border border-line bg-card p-5">
              <h2 className="mb-3 text-lg font-bold">Lecciones del servidor</h2>
              <Button
                type="button"
                variant="secondary"
                disabled={loadingLessons}
                onClick={() => void loadLessons()}
              >
                {loadingLessons ? "Abriendo lecciones…" : "Cargar lecciones"}
              </Button>
              {loadingLessons && (
                <ScribbleLoader label="Abriendo lecciones…" className="mt-3" />
              )}
              {availableLessons.length > 0 && (
                <>
                  <label
                    htmlFor="server-lesson"
                    className="mb-2 mt-4 block text-sm font-semibold"
                  >
                    Elige una clase
                  </label>
                  <select
                    id="server-lesson"
                    className="w-full rounded-lg border border-line bg-paper px-2 py-3 text-sm"
                    value={selectedId || availableLessons[0]?.id}
                    onChange={(event) => setSelectedId(event.target.value)}
                  >
                    {availableLessons.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    className="mt-3"
                    onClick={() => {
                      const next = availableLessons.find(
                        (item) =>
                          item.id === (selectedId || availableLessons[0]?.id),
                      );
                      if (next) {
                        setJson(JSON.stringify(next, null, 2));
                        run(next);
                      }
                    }}
                  >
                    Ver esta clase
                  </Button>
                </>
              )}
            </section>
          </aside>
        </div>
        <section className="mt-8 rounded-2xl border border-line bg-card p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Prueba tu propia lección</h2>
              <p className="mt-1 text-sm text-ink-soft">
                Pega el JSON con título y pasos. La voz de respaldo aquí es
                silenciosa.
              </p>
            </div>
            <Button type="button" onClick={preview}>
              Previsualizar lección
            </Button>
          </div>
          <label htmlFor="lesson-json" className="sr-only">
            JSON de la lección
          </label>
          <textarea
            id="lesson-json"
            spellCheck={false}
            className="min-h-64 w-full rounded-xl border border-line bg-paper p-4 font-mono text-sm leading-relaxed focus:outline-marker-blue"
            value={json}
            onChange={(event) => setJson(event.target.value)}
          />
          {error && (
            <p role="alert" className="mt-3 font-medium text-marker-red">
              {error}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
export default BoardSandbox;
