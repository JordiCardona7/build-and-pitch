const KEY = "bp.class";

export type StoredClass = { code: string; name: string };

export function loadClass(): StoredClass | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredClass;
  } catch {
    return null;
  }
}

export function saveClass(classroom: StoredClass) {
  localStorage.setItem(KEY, JSON.stringify(classroom));
}
