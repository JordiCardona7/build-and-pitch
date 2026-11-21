export class ApiError extends Error {
  status: number;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
  }
}

async function parseError(res: Response): Promise<never> {
  let detail = "Algo se trabó. Probemos otra vez.";
  try {
    const data = (await res.json()) as { detail?: string };
    if (data.detail) detail = data.detail;
  } catch {
    /* ignore */
  }
  throw new ApiError(res.status, detail);
}

export async function httpJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`/api${path}`, init);
  if (!res.ok) await parseError(res);
  return res.json() as Promise<T>;
}

export async function httpForm<T>(
  path: string,
  form: FormData,
  method: "POST" | "PATCH" = "POST",
): Promise<T> {
  const res = await fetch(`/api${path}`, { method, body: form });
  if (!res.ok) await parseError(res);
  return res.json() as Promise<T>;
}
