import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LessonPlayer, silentSpeaker } from "@/features/board";
import { api, type QuizItem } from "@/shared/api";
import { Button, EmptyState, ScribbleLoader } from "@/shared/ui";
import { friendlyError } from "../message";
import { loadSession } from "../session";
import { quizLesson } from "../sketches";
import { recoverMissingStudent } from "../recoverSession";

export function StudentExplain() {
  const navigate = useNavigate();
  const [session] = useState(() => loadSession());
  const [items, setItems] = useState<QuizItem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const answered = useRef(new Set<string>());

  useEffect(() => {
    if (!session) return;
    let cancel = false;
    api.explainQuiz(session.id)
      .then((quiz) => {
        if (!cancel) setItems(quiz.items);
      })
      .catch((cause: unknown) => {
        if (cancel) return;
        if (recoverMissingStudent(cause, session.id, navigate)) return;
        setError(friendlyError(cause, "No pude cargar las preguntas. Probemos otra vez."));
      });
    return () => {
      cancel = true;
    };
  }, [session, navigate]);

  if (!session) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <EmptyState
          title="Primero dime tu nombre"
          description="Con tu nombre armo la clase desde donde te quedaste."
          action={<Link to="/alumno" className="font-semibold text-marker-blue">Volver al inicio</Link>}
        />
      </main>
    );
  }

  const current = items?.[index];

  const choose = async (option: string) => {
    if (!current || sending || answered.current.has(current.id)) return;
    answered.current.add(current.id);
    const nextAnswers = { ...answers, [current.id]: option };
    setAnswers(nextAnswers);
    if (index < (items?.length ?? 0) - 1) {
      setIndex(index + 1);
      return;
    }
    setSending(true);
    setError("");
    try {
      const result = await api.submitQuiz(session.id, nextAnswers);
      navigate(`/clase?lesson=${encodeURIComponent(result.lesson_id)}`);
    } catch (cause) {
      if (recoverMissingStudent(cause, session.id, navigate)) return;
      setError(friendlyError(cause, "No pude armar tu clase. Probemos otra vez."));
      setSending(false);
      answered.current.delete(current.id);
    }
  };

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-widest text-marker-blue">No sé nada, explícame</p>
        <h1 className="font-display text-3xl font-extrabold">Tres preguntas, sin prisa</h1>
        <p className="text-ink-soft">Toca la respuesta que te parezca. Luego te explico desde ahí.</p>
      </header>

      {!items && !error ? <ScribbleLoader label="Dibujando la primera pregunta…" /> : null}
      {items?.length === 0 && <EmptyState title="Todavía no hay preguntas" description="Puedes empezar practicando un problema." action={<Link to="/alumno/problema" className="text-marker-blue underline">Ponme un problema</Link>} />}
      {error ? (
        <EmptyState
          title="Algo se trabó"
          description={error}
          action={<Button onClick={() => window.location.reload()}>Probar otra vez</Button>}
        />
      ) : null}

      {current ? (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-ink-soft">Pregunta {index + 1} de {items?.length}</p>
          <LessonPlayer
            key={current.id}
            lesson={quizLesson(current.id, current.prompt, current.draw)}
            speak={silentSpeaker}
            autoPlay
            controls={false}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {current.options.map((option) => (
              <Button key={option} variant="secondary" size="lg" disabled={sending} onClick={() => void choose(option)}>
                {option}
              </Button>
            ))}
          </div>
          {sending ? <ScribbleLoader label="Armando tu clase…" /> : null}
        </div>
      ) : null}
    </main>
  );
}
