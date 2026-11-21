/* Hooks de datos con polling (@tanstack/react-query, instalado por P3).   DUEÑO: P1
   Requiere <QueryClientProvider> en la raíz de la app (lo pone P3 en app/). */
import { useQuery } from "@tanstack/react-query";
import { api } from "./client";
import type { Diagnosis } from "./types";

/** Polling cada 1.5 s mientras la hoja está "pending"; se detiene solo al terminar. */
export function useDiagnosisPolling(id: string | null | undefined) {
  return useQuery({
    queryKey: ["diagnosis", id],
    queryFn: () => api.getDiagnosis(id as string),
    enabled: !!id,
    refetchInterval: (q) => ((q.state.data as Diagnosis | undefined)?.status === "pending" ? 1500 : false),
  });
}

/** Semáforo: se refresca cada 2.5 s (los alumnos avanzan en vivo). */
export function useBoardPolling(assignmentId: string | null | undefined, intervalMs = 2500) {
  return useQuery({
    queryKey: ["board", assignmentId],
    queryFn: () => api.getBoard(assignmentId as string),
    enabled: !!assignmentId,
    refetchInterval: intervalMs,
  });
}

export function useMeta() {
  return useQuery({ queryKey: ["meta"], queryFn: api.meta, staleTime: Infinity });
}

export function useStudent(id: string | null | undefined) {
  return useQuery({ queryKey: ["student", id], queryFn: () => api.getStudent(id as string), enabled: !!id });
}
