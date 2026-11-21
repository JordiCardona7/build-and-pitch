import { useState } from "react";
import { Link } from "react-router-dom";
import { api, useStudent, type LightStatus } from "@/shared/api";
import { Button, Card, ScribbleLoader, Stars } from "@/shared/ui";
import { friendlyError } from "../message";
import { clearSession, loadSession, saveSession, type SoloSession } from "../session";

const statusCopy: Record<LightStatus, string> = {
  rojo: "Todavía hay un paso por entender.",
  amarillo: "Ya viste la clase. Sigue practicando.",
  verde: "¡Ya estás en verde!",
  revisar: "Vamos a mirar tu hoja con calma.",
};

export function StudentHome() {
  const [session, setSession] = useState<SoloSession | null>(() => loadSession());
  const [name, setName] = useState("");
  const [classCode, setClassCode] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const student = useStudent(session?.id);

  const enter = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Escribe tu nombre para empezar.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const created = await api.createStudent(trimmed, classCode.trim() || undefined);
      const next: SoloSession = {
        id: created.id,
        name: created.name,
        classCode: created.class_code,
        difficulty: 1,
        targetError: null,
        postLessonStreak: 0,
        lessonArmed: false,
      };
      saveSession(next);
      setSession(next);
    } catch (cause) {
      setError(friendlyError(cause, "No pude entrar. Probemos otra vez."));
    } finally {
      setSaving(false);
    }
  };

  const leave = () => {
    clearSession();
    setSession(null);
    setName("");
    setClassCode("");
  };

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-widest text-marker-blue">Tu espacio</p>
        <h1 className="font-display text-4xl font-extrabold text-ink">
          {session ? `Hola, ${session.name}` : "Vamos a practicar fracciones"}
        </h1>
        <p className="max-w-xl text-ink-soft">
          Suma de fracciones con distinto denominador. Tú marcas el ritmo.
        </p>
      </header>

      {!session ? (
        <Card className="space-y-4">
          <label className="block space-y-2 font-semibold" htmlFor="student-name">
            ¿Cómo te llamas?
            <input
              id="student-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={40}
              autoComplete="name"
              className="w-full rounded-xl border border-line bg-paper p-3 font-normal focus-visible:outline focus-visible:outline-2 focus-visible:outline-marker-blue"
            />
          </label>
          <label className="block space-y-2 font-semibold" htmlFor="class-code">
            Código del salón
            <span className="ml-2 font-normal text-ink-soft">opcional</span>
            <input
              id="class-code"
              value={classCode}
              onChange={(event) => setClassCode(event.target.value)}
              maxLength={20}
              placeholder="Por ejemplo, MAT-1B"
              className="w-full rounded-xl border border-line bg-paper p-3 font-normal focus-visible:outline focus-visible:outline-2 focus-visible:outline-marker-blue"
            />
          </label>
          {error ? <p role="alert" className="text-ink-soft">{error}</p> : null}
          <Button size="lg" disabled={saving} onClick={() => void enter()}>
            {saving ? "Entrando…" : "Entrar"}
          </Button>
        </Card>
      ) : (
        <>
          <Card className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              {student.isLoading ? <ScribbleLoader label="Buscando tus estrellas…" /> : null}
              {student.data ? (
                <>
                  <Stars value={student.data.stars} />
                  <p className="text-ink-soft">{statusCopy[student.data.status]}</p>
                </>
              ) : null}
              {student.isError ? <p className="text-ink-soft">No pude cargar tus estrellas. Puedes seguir practicando.</p> : null}
            </div>
            <Button variant="ghost" onClick={leave}>No soy yo</Button>
          </Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link to="/alumno/explicame" className="rounded-card border border-line bg-card p-6 shadow-warm transition hover:-translate-y-0.5">
              <p className="font-hand text-2xl text-marker-orange">Desde cero</p>
              <h2 className="mt-2 font-display text-2xl font-bold">No sé nada, explícame</h2>
              <p className="mt-2 text-ink-soft">Tres preguntas cortas y una clase desde donde te quedaste.</p>
            </Link>
            <Link to="/alumno/problema" className="rounded-card border border-line bg-sticky-yellow p-6 shadow-warm transition hover:-translate-y-0.5">
              <p className="font-hand text-2xl text-ink">A practicar</p>
              <h2 className="mt-2 font-display text-2xl font-bold">Ponme un problema</h2>
              <p className="mt-2 text-ink-soft">Lo resuelves en papel, subes la foto y te explico el paso exacto.</p>
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
