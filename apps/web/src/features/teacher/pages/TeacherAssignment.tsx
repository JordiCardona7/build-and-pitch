import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  api,
  useBoardPolling,
  useMeta,
  type Diagnosis,
  type ErrorCode,
} from "@/shared/api";
import {
  Button,
  CameraCapture,
  EmptyState,
  PhotoCard,
  ScribbleLoader,
  StatusChip,
  StickyNote,
  TrafficLight,
  useToast,
} from "@/shared/ui";
import { useProjectorMode } from "../hooks/useProjectorMode";
import { loadClass } from "../lib/classStorage";

type LocalSheet = {
  localId: string;
  diagnosis: Diagnosis;
};

export function TeacherAssignment() {
  const { assignmentId = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const projector = useProjectorMode();
  const classroom = loadClass();
  const [sheets, setSheets] = useState<LocalSheet[]>([]);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const prevVerde = useRef<Set<string>>(new Set());
  const verdeReady = useRef(false);

  const meta = useMeta();
  const boardQuery = useBoardPolling(assignmentId);

  useEffect(() => {
    const board = boardQuery.data;
    if (!board) return;
    const verdes = new Set(
      board.groups
        .flatMap((g) => g.students)
        .filter((s) => s.status === "verde")
        .map((s) => s.id),
    );
    if (verdeReady.current) {
      for (const id of verdes) {
        if (!prevVerde.current.has(id)) {
          const student = board.groups
            .flatMap((g) => g.students)
            .find((s) => s.id === id);
          if (student) toast(`¡${student.name} pasó a verde! 🎉`);
        }
      }
    }
    prevVerde.current = verdes;
    verdeReady.current = true;
  }, [boardQuery.data, toast]);

  const seed = useMutation({
    mutationFn: () => {
      const code = classroom?.code ?? boardQuery.data?.class_code;
      if (!code) throw new Error("No hay código de salón. Creá uno primero.");
      return api.seedDemo(code);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["board", assignmentId] });
      toast("Salón demo cargado");
    },
  });

  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      const results: LocalSheet[] = [];
      for (const file of files) {
        const diagnosis = await api.uploadSheet(assignmentId, file);
        results.push({ localId: diagnosis.id, diagnosis });
      }
      return results;
    },
    onSuccess: (results) => {
      setSheets((prev) => [...results, ...prev]);
      for (const sheet of results) {
        void pollDiagnosis(sheet.diagnosis.id);
      }
    },
  });

  async function pollDiagnosis(id: string) {
    for (let i = 0; i < 70; i++) {
      const d = await api.getDiagnosis(id);
      setSheets((prev) =>
        prev.map((s) => (s.diagnosis.id === id ? { ...s, diagnosis: d } : s)),
      );
      if (d.status !== "pending") {
        void qc.invalidateQueries({ queryKey: ["board", assignmentId] });
        return;
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  const reviewGroup = useMemo(
    () => boardQuery.data?.groups.find((g) => g.error_code === "REVISAR"),
    [boardQuery.data],
  );

  const errorGroups = useMemo(
    () =>
      boardQuery.data?.groups.filter(
        (g) => g.error_code !== "REVISAR" && g.error_code !== "CORRECTO",
      ) ?? [],
    [boardQuery.data],
  );

  const correctGroup = useMemo(
    () => boardQuery.data?.groups.find((g) => g.error_code === "CORRECTO"),
    [boardQuery.data],
  );

  if (projector) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <p className="mb-2 text-center text-sm text-ink-soft">
          Modo proyector · tocá P para salir
        </p>
        <h1 className="mb-8 text-center font-display text-4xl font-extrabold md:text-5xl">
          Semáforo del salón
        </h1>
        {boardQuery.data ? (
          <TrafficLight counts={boardQuery.data.counts} huge />
        ) : (
          <ScribbleLoader label="Armando el semáforo…" />
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/docente" className="text-sm text-marker-blue hover:underline">
            ← Mis tareas
          </Link>
          <h1 className="mt-2 font-display text-3xl font-extrabold">
            {boardQuery.data?.exercise.text ?? "Tarea"}
          </h1>
          <p className="text-ink-soft">
            Salón {classroom?.code ?? boardQuery.data?.class_code ?? "—"} · tipografías grandes con tecla P
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={() => seed.mutate()}
          disabled={seed.isPending}
        >
          Cargar salón demo
        </Button>
      </div>

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold">Subir hojas</h2>
        <CameraCapture onFiles={(files) => upload.mutate(files)} />
        {upload.isError ? (
          <p className="text-sm text-marker-red">
            No pude subir alguna foto. Probemos otra vez.
          </p>
        ) : null}
        {sheets.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {sheets.map((sheet, i) => (
                <motion.div
                  key={sheet.localId}
                  initial={{ opacity: 0, y: -24, rotate: -2 }}
                  animate={{ opacity: 1, y: 0, rotate: (i % 3) - 1 }}
                  className="origin-top"
                >
                  <PhotoCard
                    imageUrl={sheet.diagnosis.image_url || undefined}
                    name={sheet.diagnosis.student_name || undefined}
                    pending={sheet.diagnosis.status === "pending"}
                    statusLabel={
                      sheet.diagnosis.status === "done"
                        ? sheet.diagnosis.feedback
                        : sheet.diagnosis.status === "needs_review"
                          ? "Hay que revisar"
                          : undefined
                    }
                    errorBox={sheet.diagnosis.error_box}
                    onClick={
                      sheet.diagnosis.status !== "pending"
                        ? () => {
                            navigate(
                              `/docente/tarea/${assignmentId}/hoja/${sheet.diagnosis.id}`,
                            );
                          }
                        : undefined
                    }
                    footer={
                      !sheet.diagnosis.student_name ||
                      sheet.diagnosis.student_name === "Sin nombre" ? (
                        <NameFix
                          diagnosisId={sheet.diagnosis.id}
                          errorCode={sheet.diagnosis.error_code}
                          onSaved={(name) =>
                            setSheets((prev) =>
                              prev.map((s) =>
                                s.diagnosis.id === sheet.diagnosis.id
                                  ? {
                                      ...s,
                                      diagnosis: {
                                        ...s.diagnosis,
                                        student_name: name,
                                      },
                                    }
                                  : s,
                              ),
                            )
                          }
                        />
                      ) : null
                    }
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : null}
      </section>

      <section className="space-y-5">
        <h2 className="font-display text-2xl font-bold">Semáforo</h2>
        {boardQuery.isLoading ? (
          <ScribbleLoader label="Armando el semáforo…" />
        ) : boardQuery.isError ? (
          <EmptyState
            title="No pude cargar el semáforo"
            description="Algo se trabó. Probemos otra vez."
            action={
              <Button variant="secondary" onClick={() => boardQuery.refetch()}>
                Reintentar
              </Button>
            }
          />
        ) : boardQuery.data && boardQuery.data.total === 0 ? (
          <EmptyState
            title="Todavía no hay hojas"
            description="Subí fotos o cargá el salón demo para ver el semáforo."
          />
        ) : boardQuery.data ? (
          <>
            <TrafficLight counts={boardQuery.data.counts} huge />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {errorGroups.map((group, i) => (
                <StickyNote
                  key={group.error_code}
                  color={i % 3 === 0 ? "yellow" : i % 3 === 1 ? "pink" : "blue"}
                  rotation={(i % 5) - 2}
                  title={group.label}
                >
                  <div className="mb-3 flex flex-wrap gap-2">
                    {group.students.map((s) => (
                      <StatusChip
                        key={s.id}
                        layoutId={s.id}
                        name={s.name}
                        status={s.status}
                        onClick={() => {
                          if (!s.last_diagnosis_id) return;
                          navigate(
                            `/docente/tarea/${assignmentId}/hoja/${s.last_diagnosis_id}`,
                          );
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`/clase?lesson=error:${group.error_code}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button variant="secondary">Proyectar clase</Button>
                    </a>
                    {group.students[0]?.last_diagnosis_id ? (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          const id = group.students[0]?.last_diagnosis_id;
                          if (!id) return;
                          setShareUrl(
                            `${window.location.origin}/clase?diagnosis=${id}`,
                          );
                        }}
                      >
                        Enviar al alumno
                      </Button>
                    ) : null}
                  </div>
                </StickyNote>
              ))}

              {reviewGroup ? (
                <StickyNote color="gray" rotation={1} title="Revisar">
                  <div className="flex flex-wrap gap-2">
                    {reviewGroup.students.map((s) => (
                      <StatusChip
                        key={s.id}
                        layoutId={s.id}
                        name={s.name}
                        status={s.status}
                        onClick={() => {
                          if (!s.last_diagnosis_id) return;
                          navigate(
                            `/docente/tarea/${assignmentId}/hoja/${s.last_diagnosis_id}`,
                          );
                        }}
                      />
                    ))}
                  </div>
                </StickyNote>
              ) : null}

              {correctGroup ? (
                <StickyNote color="blue" rotation={-1} title={correctGroup.label}>
                  <div className="flex flex-wrap gap-2">
                    {correctGroup.students.map((s) => (
                      <StatusChip
                        key={s.id}
                        layoutId={s.id}
                        name={s.name}
                        status={s.status}
                      />
                    ))}
                  </div>
                </StickyNote>
              ) : null}
            </div>
            {meta.data ? (
              <p className="text-xs text-ink-soft">
                Etiquetas desde /meta · demo {meta.data.demo_mode ? "sí" : "no"}
              </p>
            ) : null}
          </>
        ) : null}
      </section>

      {shareUrl ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-card bg-card p-6 shadow-warm">
            <h3 className="font-display text-xl font-bold">Link para el alumno</h3>
            <p className="break-all text-sm text-ink-soft">{shareUrl}</p>
            <div className="flex justify-center rounded-card bg-paper p-4">
              <QRCodeSVG value={shareUrl} size={160} />
            </div>
            <Button className="w-full" onClick={() => setShareUrl(null)}>
              Listo
            </Button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function NameFix({
  diagnosisId,
  errorCode,
  onSaved,
}: {
  diagnosisId: string;
  errorCode: ErrorCode | null;
  onSaved: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const save = useMutation({
    mutationFn: () =>
      api.patchDiagnosis(diagnosisId, {
        error_code: errorCode,
        student_name: name.trim(),
      }),
    onSuccess: (d) => onSaved(d.student_name),
  });

  return (
    <div className="flex gap-2 pt-1">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre del alumno"
        className="min-w-0 flex-1 rounded-pill border border-line bg-paper px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-marker-blue"
      />
      <Button
        variant="secondary"
        disabled={!name.trim() || save.isPending}
        onClick={() => save.mutate()}
      >
        Guardar
      </Button>
    </div>
  );
}
