/** Caché por speaker: repetir una oración no vuelve a pedir ni descargar su audio. */
export function createTtsCache(transport: (text: string) => Promise<Blob>) {
  const ready = new Map<string, Blob>();
  const pending = new Map<string, Promise<Blob>>();
  let bytes = 0;
  let unavailable: { error: unknown; until: number } | undefined;
  return (text: string): Promise<Blob> => {
    const cached = ready.get(text);
    if (cached) {
      ready.delete(text); ready.set(text, cached);
      return Promise.resolve(cached);
    }
    const existing = pending.get(text);
    if (existing) return existing;
    if (unavailable && unavailable.until > Date.now()) return Promise.reject(unavailable.error);
    const request = Promise.resolve().then(() => transport(text)).then((blob) => {
      if (!blob.size) throw new Error("El audio llegó vacío.");
      if (blob.size <= 8 * 1024 * 1024) {
        ready.set(text, blob);
        bytes += blob.size;
        while (ready.size > 32 || bytes > 8 * 1024 * 1024) {
          const oldest = ready.keys().next().value;
          if (oldest === undefined) break;
          bytes -= ready.get(oldest)?.size ?? 0;
          ready.delete(oldest);
        }
      }
      return blob;
    }).catch((error: unknown) => {
      if (typeof error === "object" && error !== null && "status" in error && error.status === 501) {
        unavailable = { error, until: Date.now() + 30_000 };
      }
      throw error;
    }).finally(() => pending.delete(text));
    pending.set(text, request);
    return request;
  };
}
