import { useEffect, useId, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/shared/ui";
import { useQuestionCapture } from "./useQuestionCapture";

export type InterruptOverlayProps = {
  open: boolean;
  onQuestion(question: string): void;
  onCancel(): void;
  /** Solo activar si el alumno ya eligió usar el micrófono. */
  listen?: boolean;
};

export function InterruptOverlay({ open, onQuestion, onCancel, listen = false }: InterruptOverlayProps) {
  const capture = useQuestionCapture();
  const { start, cancel } = capture;
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(true);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();
  const fieldId = useId();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open) { cancel(); dialog?.close(); return; }
    setDraft("");
    setEditing(!listen);
    dialog?.showModal();
    textareaRef.current?.focus();
    if (listen) void start();
    return () => { cancel(); dialog?.close(); };
  }, [open, listen, start, cancel]);

  const listening = capture.status === "active" || capture.status === "loading";
  const question = editing ? draft : capture.transcript;
  const dismiss = () => { cancel(); onCancel(); };
  return <dialog ref={dialogRef} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); dismiss(); }} className="m-auto w-full max-w-xl overflow-visible rounded-2xl border border-line bg-sticky-yellow p-0 text-ink shadow-xl backdrop:bg-ink/40">
    {open && <motion.form initial={reduceMotion ? false : { opacity: 0, y: 12, rotate: -1 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: 0.22 }} className="space-y-5 p-6 sm:p-8" onSubmit={(event) => { event.preventDefault(); if (question.trim()) { cancel(); onQuestion(question.trim()); } }}>
      <div className="flex items-center justify-between gap-4">
        <h2 id={titleId} className="text-3xl font-bold">Te escucho…</h2>
        <div aria-hidden="true" className="flex h-8 items-center gap-1 text-marker-blue">{[3, 5, 8, 5, 3].map((height, index) => <motion.span key={index} className="w-1 rounded-full bg-current" style={{ height: height * 3 }} animate={listening && !reduceMotion ? { scaleY: [0.4, 1, 0.4] } : { scaleY: 0.6 }} transition={{ duration: 0.7, repeat: listening && !reduceMotion ? Infinity : 0, delay: index * 0.1 }} />)}</div>
      </div>
      <p className="text-ink-soft">La pizarra está en pausa. Cuéntame qué parte te confundió.</p>
      <p role="status" className="min-h-6 text-sm">{capture.status === "denied" ? "No pudimos usar el micrófono. Puedes escribir tu duda." : capture.status === "unsupported" || capture.status === "error" ? "Puedes escribir tu duda para seguir." : listening ? "Estoy escuchando tu duda…" : "Escribe tu duda o usa el micrófono."}</p>
      <div>
        <label htmlFor={fieldId} className="mb-2 block font-semibold">¿Qué parte vemos otra vez?</label>
        <textarea ref={textareaRef} id={fieldId} value={question} maxLength={600} rows={3} placeholder="Por ejemplo: ¿por qué cambia el número de arriba?" className="w-full resize-none rounded-xl border border-line bg-card p-4 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-marker-blue" onChange={(event) => { cancel(); setEditing(true); setDraft(event.target.value); }} />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" disabled={listening} onClick={() => { setEditing(false); void start(); }}>🎙️ Dictar mi duda</Button>
        <Button type="submit" disabled={!question.trim()}>Preguntar</Button>
        <Button variant="secondary" onClick={dismiss}>Seguir sin preguntar</Button>
      </div>
    </motion.form>}
  </dialog>;
}
