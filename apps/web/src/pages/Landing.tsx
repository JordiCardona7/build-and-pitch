import { Link } from "react-router-dom";
import { BRAND } from "@/shared/brand";
import { Button } from "@/shared/ui";

export function Landing() {
  return (
    <main className="mx-auto grid min-h-[calc(100vh-3.5rem)] max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2">
      <div className="space-y-6">
        <p className="font-hand text-2xl text-marker-blue">{BRAND.name}</p>
        <h1 className="max-w-xl font-display text-4xl font-extrabold leading-tight text-ink md:text-5xl">
          {BRAND.tagline}
        </h1>
        <p className="max-w-md text-lg text-ink-soft">
          Una pizarra que identifica tus puntos débiles y te ayuda a fortalecerlos.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link to="/docente">
            <Button size="lg" className="w-full sm:w-auto">
              Soy docente
            </Button>
          </Link>
          <Link to="/alumno">
            <Button size="lg" variant="secondary" className="w-full sm:w-auto">
              Soy alumno
            </Button>
          </Link>
        </div>
      </div>

      <div className="relative">
        <div className="rounded-card border-[10px] border-board-frame bg-board p-6 shadow-warm">
          <svg viewBox="0 0 320 200" className="h-auto w-full" aria-hidden>
            <text
              x="24"
              y="48"
              className="fill-ink"
              style={{ fontFamily: "Caveat, cursive", fontSize: 28 }}
            >
              1/2 + 1/3
            </text>
            <text
              x="24"
              y="96"
              className="fill-marker-red"
              style={{ fontFamily: "Caveat, cursive", fontSize: 28 }}
            >
              ≠ 2/5
            </text>
            <ellipse
              cx="52"
              cy="88"
              rx="42"
              ry="28"
              fill="none"
              stroke="#D62828"
              strokeWidth="2.5"
              strokeDasharray="5 3"
            />
            <circle
              cx="220"
              cy="120"
              r="48"
              fill="none"
              stroke="#EA7A12"
              strokeWidth="3"
            />
            <path
              d="M220 72 L220 168 M172 120 L268 120"
              stroke="#EA7A12"
              strokeWidth="2"
            />
            <path
              d="M220 72 A48 48 0 0 1 268 120 L220 120 Z"
              fill="#EA7A12"
              opacity="0.35"
            />
          </svg>
          <div className="mt-3 flex justify-center gap-2">
            <span className="h-3 w-8 rounded-full bg-marker-blue" />
            <span className="h-3 w-8 rounded-full bg-marker-red" />
            <span className="h-3 w-8 rounded-full bg-marker-green" />
          </div>
        </div>
        <p className="mt-3 text-center font-hand text-xl text-ink-soft">
          El marcador escribe. La voz explica.
        </p>
      </div>
    </main>
  );
}
