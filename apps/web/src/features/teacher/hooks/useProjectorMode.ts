import { useEffect, useState } from "react";

/** Tecla P: tipografías más grandes, foco en semáforo. */
export function useProjectorMode() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "p" || e.key === "P") {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        setOn((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return on;
}
