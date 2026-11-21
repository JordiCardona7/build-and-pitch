/** Browser-native regression suite: no test dependencies in the shared package.
 * Import runBoardRegressionTests() from a Vite-served blank page. Real SVG
 * measurements + a deterministic RAF clock exercise the original failure modes. */
import { el, makeCtx, type BoardElements } from "../engine/context";
import { BoardPlayer, silentSpeaker } from "../engine/player";
import { drawOps } from "../ops";
import { parseLesson } from "../parseLesson";
import { operationExamples } from "../examples";
import type { Lesson, Op, Speaker } from "../types";

const assert: (condition: unknown, message: string) => asserts condition = (
  condition,
  message,
) => {
  if (!condition) throw new Error(message);
};
const lesson = (draw: Op[], say = ""): Lesson => ({
  id: "test",
  title: "Prueba",
  error_code: null,
  level: null,
  steps: [{ say, draw }],
});
function fixture(): BoardElements {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 1000 600");
  document.body.appendChild(svg);
  return {
    svg,
    defs: el("defs", {}, svg),
    main: el("g", {}, svg),
    aside: el("g", {}, svg),
    marker: el("g", {}, svg),
    eraser: el("g", {}, svg),
  };
}
export async function runBoardRegressionTests(
  additionalLessons: Lesson[] = [],
): Promise<string[]> {
  const originalRequest = window.requestAnimationFrame;
  const originalCancel = window.cancelAnimationFrame;
  let now = 0;
  let nextId = 0;
  const frames = new Map<number, FrameRequestCallback>();
  window.requestAnimationFrame = (callback) => {
    frames.set(++nextId, callback);
    return nextId;
  };
  window.cancelAnimationFrame = (id) => {
    frames.delete(id);
  };
  const tick = async (count = 1): Promise<void> => {
    for (let i = 0; i < count; i++) {
      now += 1000 / 60;
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((callback) => callback(now));
      for (let flush = 0; flush < 10; flush++) await Promise.resolve();
    }
  };
  const until = async (
    predicate: () => boolean,
    message = "La operación no terminó",
  ): Promise<void> => {
    for (let i = 0; i < 12000; i++) {
      if (predicate()) return;
      await tick();
      if (i % 100 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
    }
    throw new Error(message);
  };
  const finish = async (task: Promise<unknown>): Promise<void> => {
    let done = false;
    let error: unknown;
    void task.then(
      () => {
        done = true;
      },
      (reason) => {
        error = reason;
        done = true;
      },
    );
    await until(() => done);
    if (error) throw error;
  };
  const passed: string[] = [];
  const test = async (
    name: string,
    run: () => Promise<void>,
  ): Promise<void> => {
    await run();
    passed.push(name);
  };
  try {
    await test("Las 12 operaciones dibujan; una op desconocida se ignora", async () => {
      const view = fixture();
      const abort = new AbortController();
      const ctx = makeCtx(view, view.main, abort.signal);
      ctx.speed = 4;
      const ops = Object.values(operationExamples)
        .map((item) => item.op)
        .filter((op) => op.op !== "clear");
      await finish(drawOps([...ops, { op: "futura" } as unknown as Op], ctx));
      assert(
        view.main.querySelector("text") && view.main.querySelector("path"),
        "Faltan trazos",
      );
      await finish(drawOps([{ op: "clear" }], ctx));
      assert(
        !view.main.childNodes.length && !ctx.resources.childNodes.length,
        "Clear dejó basura o clips",
      );
      assert(
        view.eraser.getAttribute("visibility") === "hidden",
        "El borrador quedó visible",
      );
      abort.abort();
      view.svg.remove();
    });
    for (const kind of ["pie", "bar"] as const)
      await test(`La pausa congela ${kind} a medio coloreado`, async () => {
        const view = fixture();
        const player = new BoardPlayer(view, () => silentSpeaker);
        const task = player.play(lesson([operationExamples[kind].op]));
        await until(() =>
          kind === "pie"
            ? !!view.main.querySelector("path[fill-opacity]")?.getAttribute("d")
            : !!view.main.querySelector("g path"),
        );
        await tick(3);
        player.pause();
        const snapshot = view.main.innerHTML + view.marker.outerHTML;
        await tick(60);
        assert(
          snapshot === view.main.innerHTML + view.marker.outerHTML,
          "Cambió el trazo estando pausado",
        );
        player.resume();
        await finish(task);
        assert(player.state === "done", "No reanudó");
        player.dispose();
        view.svg.remove();
      });
    await test("La aclaración conserva el trazo principal y espera resume()", async () => {
      const view = fixture();
      const player = new BoardPlayer(view, () => silentSpeaker);
      const task = player.play(
        lesson([
          { op: "line", x1: 30, y1: 30, x2: 970, y2: 570, color: "verde" },
        ]),
      );
      await until(
        () =>
          !!view.main.querySelector("path") &&
          Number(view.main.querySelector("path")?.style.strokeDashoffset) < 900,
      );
      player.pause();
      const snapshot = view.main.innerHTML;
      await finish(
        player.playAside([
          {
            say: "",
            draw: [
              {
                op: "write",
                text: "Otra forma",
                x: 60,
                y: 90,
                color: "naranja",
              },
            ],
          },
        ]),
      );
      assert(player.state === "paused", "La aclaración reanudó por su cuenta");
      assert(
        snapshot === view.main.innerHTML && !view.aside.childNodes.length,
        "Se alteró la clase principal",
      );
      assert(
        view.marker.getAttribute("color") === "#15803D",
        "No restauró el color del marcador",
      );
      await tick(60);
      assert(snapshot === view.main.innerHTML, "El fondo siguió avanzando");
      player.resume();
      await finish(task);
      player.dispose();
      view.svg.remove();
    });
    await test("La aclaración restaura el marcador durante el coloreado de una barra", async () => {
      const view = fixture();
      const player = new BoardPlayer(view, () => silentSpeaker);
      const task = player.play(
        lesson([
          {
            op: "bar",
            x: 80,
            y: 200,
            w: 600,
            h: 100,
            parts: 6,
            shade: 5,
            color: "naranja",
          },
        ]),
      );
      await until(() => !!view.main.querySelector("g path"));
      await tick(20);
      player.pause();
      const position = view.marker.getAttribute("transform");
      const ink = view.marker.getAttribute("color");
      await finish(
        player.playAside([
          {
            say: "",
            draw: [
              { op: "write", text: "Otra idea", x: 70, y: 80, color: "azul" },
            ],
          },
        ]),
      );
      assert(
        view.marker.getAttribute("transform") === position &&
          view.marker.getAttribute("color") === ink,
        "El marcador saltó al volver al coloreado",
      );
      player.resume();
      await finish(task);
      player.dispose();
      view.svg.remove();
    });
    await test("Interrumpir el borrado muestra marcador en la aclaración y restaura el borrador", async () => {
      const view = fixture();
      const player = new BoardPlayer(view, () => silentSpeaker);
      const task = player.play(
        lesson([
          { op: "write", text: "Borramos", x: 70, y: 80 },
          { op: "clear" },
        ]),
      );
      await until(() => view.eraser.getAttribute("visibility") !== "hidden");
      await tick(3);
      player.pause();
      const eraserPosition = view.eraser.getAttribute("transform");
      const aside = player.playAside([
        {
          say: "",
          draw: [{ op: "write", text: "Una aclaración", x: 70, y: 80 }],
        },
      ]);
      await tick(3);
      assert(
        view.marker.getAttribute("visibility") !== "hidden" &&
          view.eraser.getAttribute("visibility") === "hidden",
        "La aclaración heredó el borrador congelado",
      );
      await finish(aside);
      assert(
        view.marker.getAttribute("visibility") === "hidden" &&
          view.eraser.getAttribute("visibility") !== "hidden" &&
          view.eraser.getAttribute("transform") === eraserPosition,
        `No restauró el borrado congelado: marcador=${view.marker.getAttribute('visibility')}, borrador=${view.eraser.getAttribute('visibility')}, posición=${view.eraser.getAttribute('transform')}, esperada=${eraserPosition}`,
      );
      player.resume();
      await finish(task);
      player.dispose();
      view.svg.remove();
    });
    await test("Interrumpir repite solo la oración interrumpida, aunque stop no resuelva", async () => {
      const view = fixture();
      const calls: string[] = [];
      let stops = 0;
      const speaker: Speaker = {
        speak: (text) => {
          calls.push(text);
          return calls.length === 2
            ? new Promise(() => undefined)
            : Promise.resolve("ok");
        },
        stop: () => {
          stops++;
        },
      };
      const player = new BoardPlayer(view, () => speaker);
      const task = player.play(
        lesson([{ op: "wait", ms: 2000 }], "Primera oración. Segunda oración."),
      );
      await until(() => calls.length === 2);
      player.pause();
      await tick(30);
      player.resume();
      await finish(task);
      assert(
        calls.join("|") ===
          "Primera oración.|Segunda oración.|Segunda oración.",
        "Se repitió la oración equivocada",
      );
      assert(stops > 0, "No detuvo la voz");
      player.dispose();
      view.svg.remove();
    });
    await test("Un checkpoint espera respuesta y sobrevive a una aclaración", async () => {
      const view = fixture();
      let prompt = "";
      let done = 0;
      const player = new BoardPlayer(view, () => silentSpeaker, {
        onCheckpoint: (value) => {
          prompt = value;
        },
        onDone: () => {
          done++;
        },
      });
      const item = lesson([]);
      const first = item.steps[0];
      assert(first, "Falta el primer paso");
      first.checkpoint = { prompt: "¿Cuántos sextos?", answer: "5" };
      const task = player.play(item);
      await until(() => !!prompt);
      await tick(30);
      assert(done === 0, "Se saltó el checkpoint");
      await finish(player.playAside([{ say: "", draw: [] }]));
      player.answerCheckpoint("");
      await tick(3);
      assert(done === 0, "Aceptó respuesta vacía");
      player.answerCheckpoint("5");
      player.resume();
      await finish(task);
      assert(Number(done) === 1, "No terminó exactamente una vez");
      player.dispose();
      view.svg.remove();
    });
    await test("Cambiar de lección cancela trazos y callbacks anteriores", async () => {
      const view = fixture();
      let done = 0;
      const player = new BoardPlayer(view, () => silentSpeaker, {
        onDone: () => {
          done++;
        },
      });
      const first = player.play(lesson([operationExamples.pie.op]));
      await until(() => !!view.main.querySelector("path"));
      await finish(
        player.play(
          lesson([{ op: "write", text: "Nueva clase", x: 60, y: 80 }]),
        ),
      );
      await finish(first);
      await tick(120);
      assert(
        done === 1 &&
          !view.main.querySelector("path") &&
          view.main.textContent === "Nueva clase",
        "Persistió una ejecución anterior",
      );
      assert(
        view.defs.querySelectorAll("defs").length === 1,
        "Se filtraron recursos",
      );
      player.dispose();
      assert(frames.size === 0, "Quedaron animaciones al desmontar");
      view.svg.remove();
    });
    await test("Dos pizarras mantienen marcadores independientes", async () => {
      const a = fixture();
      const b = fixture();
      const one = new BoardPlayer(a, () => silentSpeaker);
      const two = new BoardPlayer(b, () => silentSpeaker);
      const taskA = one.play(
        lesson([{ op: "line", x1: 20, y1: 20, x2: 100, y2: 100 }]),
      );
      const taskB = two.play(
        lesson([{ op: "line", x1: 700, y1: 300, x2: 900, y2: 500 }]),
      );
      await finish(Promise.all([taskA, taskB]));
      assert(
        a.marker.getAttribute("transform") !==
          b.marker.getAttribute("transform"),
        "El marcador usa estado global",
      );
      one.dispose();
      two.dispose();
      a.svg.remove();
      b.svg.remove();
    });
    await test("El texto se ajusta al lienzo y clear elimina sus recursos", async () => {
      const view = fixture();
      const abort = new AbortController();
      const ctx = makeCtx(view, view.main, abort.signal);
      ctx.speed = 4;
      await finish(
        drawOps(
          [
            {
              op: "write",
              text: "Una explicación que debe caber dentro de la pizarra aunque sea larga",
              x: 700,
              y: 590,
              size: 80,
            },
          ],
          ctx,
        ),
      );
      const text = view.main.querySelector("text");
      assert(text, "Falta texto");
      const box = text.getBBox();
      assert(
        box.x >= 0 && box.x + box.width <= 1000 && box.y + box.height <= 600,
        "El texto se sale",
      );
      await finish(drawOps([{ op: "clear" }], ctx));
      assert(!ctx.resources.childNodes.length, "Quedaron clips");
      abort.abort();
      view.svg.remove();
    });
    await test("El JSON inválido muestra errores y permite ops futuras", async () => {
      let caught = false;
      try {
        parseLesson("{");
      } catch {
        caught = true;
      }
      assert(caught, "Aceptó JSON roto");
      caught = false;
      try {
        parseLesson(
          JSON.stringify({
            title: "Prueba",
            steps: [{ say: "", draw: [{ op: "pie", cx: 0 }] }],
          }),
        );
      } catch {
        caught = true;
      }
      assert(caught, "Aceptó una tortilla sin campos");
      const result = parseLesson(
        JSON.stringify({
          title: "Prueba",
          steps: [{ say: "", draw: [{ op: "futura" }] }],
        }),
      );
      assert(result.steps.length === 1, "Rechazó una op futura");
      assert(
        parseLesson(
          JSON.stringify({
            title: "Prueba",
            steps: [{ say: "", draw: [], checkpoint: null }],
          }),
        ).steps.length === 1,
        "Rechazó checkpoint null de P1",
      );
    });
    for (const item of additionalLessons)
      await test(`Lección reproducible: ${item.title}`, async () => {
        const view = fixture();
        const review = (): void => {
          const texts = [...view.main.querySelectorAll("text")];
          for (const [i, a] of texts.entries())
            for (const b of texts.slice(i + 1)) {
              if (
                a.dataset.boardFraction &&
                a.dataset.boardFraction === b.dataset.boardFraction
              )
                continue;
              const aa = a.getBBox();
              const bb = b.getBBox();
              if (
                Math.min(aa.x + aa.width, bb.x + bb.width) -
                  Math.max(aa.x, bb.x) >
                  5 &&
                Math.min(aa.y + aa.height, bb.y + bb.height) -
                  Math.max(aa.y, bb.y) >
                  5
              )
                console.warn(
                  `Revisar encimado (${item.id}, paso ${player.currentStep + 1}): «${a.textContent}» / «${b.textContent}»`,
                );
            }
        };
        const player = new BoardPlayer(view, () => silentSpeaker, {
          onCheckpoint: () => player.answerCheckpoint("Respuesta de prueba"),
          onStepChange: review,
        });
        player.setSpeed(4);
        await finish(player.play(parseLesson(JSON.stringify(item))));
        review();
        assert(player.state === "done", "La lección no terminó");
        player.dispose();
        view.svg.remove();
      });
    return passed;
  } finally {
    window.requestAnimationFrame = originalRequest;
    window.cancelAnimationFrame = originalCancel;
    document.querySelectorAll("body > svg").forEach((svg) => svg.remove());
  }
}
