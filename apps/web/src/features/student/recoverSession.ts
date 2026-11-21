import type { NavigateFunction } from "react-router-dom";
import { ApiError } from "../../shared/api/errors";
import { clearSession, loadSession } from "./session";

export function recoverMissingStudent(error: unknown, studentId: string, navigate: NavigateFunction): boolean {
  // Un 404 de problema/foto no significa que se haya perdido el alumno.
  if (!(error instanceof ApiError) || error.status !== 404 || !/^No encontré a ese alumno[.!]?$/i.test(error.detail.trim())) return false;
  // Una respuesta tardía de otra sesión no debe borrar la identidad actual.
  if (loadSession()?.id !== studentId) return true;
  clearSession();
  void navigate("/alumno", { replace: true });
  return true;
}
