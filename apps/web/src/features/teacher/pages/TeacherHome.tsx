import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/shared/api";
import {
  Button,
  Card,
  EmptyState,
  Modal,
  ScribbleLoader,
} from "@/shared/ui";
import { loadClass, saveClass } from "../lib/classStorage";

export function TeacherHome() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [classroom, setClassroom] = useState(loadClass);
  const [className, setClassName] = useState("");
  const [keyText, setKeyText] = useState("1/2 + 1/3 = 3/6 + 2/6 = 5/6");
  const [keyPreview, setKeyPreview] = useState<{
    id: string;
    summary: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const classDetail = useQuery({
    queryKey: ["class", classroom?.code],
    queryFn: () => api.getClass(classroom!.code),
    enabled: Boolean(classroom?.code),
  });

  const createClass = useMutation({
    mutationFn: () => api.createClass(className.trim()),
    onSuccess: (res) => {
      saveClass(res);
      setClassroom(res);
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const createAssignment = useMutation({
    mutationFn: () =>
      api.createAssignment(classroom!.code, { text: keyText }),
    onSuccess: (res) => {
      setKeyPreview({
        id: res.id,
        summary: `Ejercicio: ${res.exercise.text} · Respuesta: ${res.key_answer.n}/${res.key_answer.d}`,
      });
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  if (!classroom) {
    return (
      <main className="mx-auto max-w-lg px-4 py-12 sm:px-6">
        <h1 className="mb-2 font-display text-3xl font-extrabold">Tu salón</h1>
        <p className="mb-6 text-ink-soft">
          Creá un salón y te damos un código para tus alumnos.
        </p>
        <Card className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium">Nombre del salón</span>
            <input
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="Mate 1B — Carmen"
              className="w-full rounded-card border border-line bg-paper px-4 py-3 outline-none ring-marker-blue focus:ring-2"
            />
          </label>
          {error ? <p className="text-sm text-marker-red">{error}</p> : null}
          <Button
            size="lg"
            disabled={!className.trim() || createClass.isPending}
            onClick={() => createClass.mutate()}
          >
            {createClass.isPending ? "Creando…" : "Crear salón"}
          </Button>
        </Card>
      </main>
    );
  }

  const assignments = classDetail.data?.assignments ?? [];

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-hand text-xl text-marker-blue">{classroom.code}</p>
          <h1 className="font-display text-3xl font-extrabold">{classroom.name}</h1>
        </div>
        <Button
          size="lg"
          onClick={() => createAssignment.mutate()}
          disabled={createAssignment.isPending}
        >
          Nueva tarea
        </Button>
      </div>

      {error ? (
        <p className="mb-4 rounded-card bg-marker-red/10 px-4 py-3 text-sm text-marker-red">
          {error}
        </p>
      ) : null}

      {createAssignment.isPending ? (
        <div className="mb-6">
          <ScribbleLoader label="Leyendo la clave…" />
        </div>
      ) : null}

      {classDetail.isLoading ? (
        <ScribbleLoader label="Cargando tareas…" />
      ) : classDetail.isError ? (
        <EmptyState
          title="No pude cargar las tareas"
          description="Algo se trabó. Probemos otra vez."
          action={
            <Button variant="secondary" onClick={() => classDetail.refetch()}>
              Reintentar
            </Button>
          }
        />
      ) : !assignments.length ? (
        <EmptyState
          title="Todavía no hay tareas"
          description="Subí la clave del ejercicio y empezá a leer hojas."
          action={
            <Button onClick={() => createAssignment.mutate()}>Nueva tarea</Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {assignments.map((a) => (
            <li key={a.id}>
              <Link to={`/docente/tarea/${a.id}`}>
                <Card className="flex items-center justify-between transition hover:border-marker-blue/40">
                  <div>
                    <p className="font-semibold text-ink">{a.exercise.text}</p>
                    <p className="text-sm text-ink-soft">Tarea {a.id}</p>
                  </div>
                  <span className="text-sm font-medium text-marker-blue">
                    Abrir →
                  </span>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={Boolean(keyPreview)}
        title="¿Esto es la clave?"
        onClose={() => setKeyPreview(null)}
      >
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium">Clave (texto)</span>
            <textarea
              value={keyText}
              onChange={(e) => setKeyText(e.target.value)}
              rows={3}
              className="w-full rounded-card border border-line bg-paper px-4 py-3 outline-none ring-marker-blue focus:ring-2"
            />
          </label>
          <p className="rounded-card bg-paper-2 px-4 py-3 text-ink">
            {keyPreview?.summary}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setKeyPreview(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!keyPreview) return;
                void qc.invalidateQueries({ queryKey: ["class", classroom.code] });
                navigate(`/docente/tarea/${keyPreview.id}`);
              }}
            >
              Confirmar
            </Button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
