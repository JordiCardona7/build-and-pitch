export function celebrate(): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  void import("canvas-confetti").then(({ default: confetti }) => {
    const probe = document.createElement("span");
    probe.className = "text-marker-orange";
    document.body.append(probe);
    const orange = getComputedStyle(probe).color;
    probe.className = "text-marker-blue";
    const blue = getComputedStyle(probe).color;
    probe.className = "text-marker-green";
    const green = getComputedStyle(probe).color;
    probe.remove();
    void confetti({
      particleCount: 90,
      spread: 72,
      origin: { y: 0.72 },
      colors: [orange, blue, green],
      disableForReducedMotion: true,
    });
  });
}
