import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type ErrorCode } from "@/shared/api";
import {
  Button,
  Card,
  EmptyState,
  PhotoCard,
  ScribbleLoader,
} from "@/shared/ui";

export function TeacherSheetDetail() {
  const { assignmentId = "", diagnosisId = "" } = useParams();
  const qc = useQueryClient();
  const [selectedError, setSelectedError] = useState<ErrorCode | "CORRECTO" | null>(
    null,
  );

  const meta = useQuery({
    queryKey: ["meta"],
    queryFn: () => api.getMeta(),
  });

  const diagnosis = useQuery({
    queryKey: ["diagnosis", diagnosisId],
    queryFn: () => api.getDiagnosis(diagnosisId),
    enabled: Boolean(diagnosisId),
  });

  const patch = useMutation({
    mutationFn: (error: ErrorCode | "CORRECTO" | null) =>
      api.patchDiagnosis(diagnosisId, {
        error_code: error === "CORRECTO" || error === null ? null : error,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["diagnosis", diagnosisId] });
      void qc.invalidateQueries({ queryKey: ["board", assignmentId] });
    },
  });

  if (diagnosis.isLoading) {
    return (
      <main className="py-20">
        <ScribbleLoader label="Abriendo la hoja…" />
      </main>
    );
  }

  if (diagnosis.isError || !diagnosis.data) {
    return (
      <main className="mx-auto max-w-lg px-4 py-12">
        <EmptyState
          title="No encontré esa hoja"
          description="Algo se trabó o el enlace ya no sirve."
          action={
            <Link to={`/docente/tarea/${assignmentId}`}>
              <Button variant="secondary">Volver al semáforo</Button>
            </Link>
          }
        />
      </main>
    );
  }

  const d = diagnosis.data;
  const activeError = selectedError ?? d.error_code ?? "CORRECTO";
  const codes = (Object.keys(meta.data?.error_labels ?? {}) as ErrorCode[]) || [];

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-2 sm:px-6">
      <div>
        <Link
          to={`/docente/tarea/${assignmentId}`}
          className="text-sm text-marker-blue hover:underline"
        >
          ← Volver al semáforo
        </Link>
        <h1 className="mt-3 mb-4 font-display text-3xl font-extrabold">
          {d.student_name}
        </h1>
        <PhotoCard
          imageUrl={d.image_url}
          name={d.student_name}
          errorBox={d.error_box}
          statusLabel={d.feedback}
          className="max-w-md"
        />
      </div>

      <div className="space-y-5">
        <Card>
          <h2 className="mb-3 font-display text-xl font-bold">Transcripción</h2>
          <ol className="space-y-2">
            {d.transcript.map((line) => (
              <li
                key={line.index}
                className={
                  line.index === d.error_line
                    ? "rounded-card bg-marker-red/10 px-3 py-2 font-medium text-marker-red"
                    : "px-3 py-1 text-ink"
                }
              >
                {line.text}
              </li>
            ))}
          </ol>
        </Card>

        <Card className="space-y-3">
          <h2 className="font-display text-xl font-bold">Diagnóstico</h2>
          <p className="text-ink">{d.feedback}</p>
          <p className="text-sm text-ink-soft">
            Confianza: {Math.round(d.confidence * 100)}%
            {d.teacher_override ? " · Corregido por docente" : ""}
          </p>
          {d.note ? (
            <p className="text-sm text-marker-orange">{d.note}</p>
          ) : null}

          <div className="space-y-2 pt-2">
            <p className="text-sm font-medium">Confirmar o cambiar error</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedError("CORRECTO")}
                className={`rounded-pill px-3 py-1.5 text-sm ring-1 ${
                  activeError === "CORRECTO" || activeError === null
                    ? "bg-light-green/20 text-marker-green ring-light-green"
                    : "bg-paper ring-line"
                }`}
              >
                Sin error
              </button>
              {codes.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setSelectedError(code)}
                  className={`rounded-pill px-3 py-1.5 text-sm ring-1 ${
                    activeError === code
                      ? "bg-marker-blue/10 text-marker-blue ring-marker-blue"
                      : "bg-paper ring-line"
                  }`}
                >
                  {meta.data?.error_labels[code] ?? code}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              onClick={() => patch.mutate(d.error_code ?? "CORRECTO")}
              disabled={patch.isPending}
            >
              Confirmar
            </Button>
            <Button
              variant="secondary"
              onClick={() => patch.mutate(activeError)}
              disabled={patch.isPending}
            >
              Cambiar error
            </Button>
            <a
              href={`/clase?diagnosis=${d.id}`}
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="ghost">Ver clase</Button>
            </a>
          </div>
          {patch.isError ? (
            <p className="text-sm text-marker-red">No pude guardar. Probemos otra vez.</p>
          ) : null}
          {patch.isSuccess ? (
            <p className="text-sm text-marker-green">Listo, quedó guardado.</p>
          ) : null}
        </Card>
      </div>
    </main>
  );
}
