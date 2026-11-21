import { BRAND } from "@/shared/brand";
import { Card } from "@/shared/ui";

const slides = [
  {
    title: "El problema",
    body: "PISA Guatemala: solo el 8 % de los de 15 años alcanza el mínimo en mates. Un plan para 40. Práctica sin respuesta a tiempo.",
  },
  {
    title: "No es un chat",
    body: "Un muro de texto no muestra el razonamiento. Sacamos a la IA del chat y la pusimos en una pizarra.",
  },
  {
    title: "Evidencia",
    body: "Ver dibujar enseña más que diagramas listos (Fiorella & Mayer). Voz + imagen > texto. IA sin guardas empeora resultados (Bastani et al.).",
  },
  {
    title: "La demo",
    body: "Docente sube clave + hojas → semáforo por tipo de error → el alumno ve su error en la pizarra → pasa a verde.",
  },
  {
    title: "Sostenibilidad",
    body: "Gratis para el alumno (límite diario). Licencia por docente/colegio. 1 salón gratis. Escuelas públicas vía alianzas.",
  },
  {
    title: "Siguientes pasos",
    body: "Más temas, más grados, offline real, apps nativas. Hoy: solo suma de fracciones con distinto denominador.",
  },
];

/** Guion visual del pitch (F3). No está en la tabla de rutas del PRD; es apoyo interno. */
export function Pitch() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <div>
        <p className="font-hand text-2xl text-marker-blue">{BRAND.name}</p>
        <h1 className="font-display text-4xl font-extrabold">{BRAND.tagline}</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {slides.map((slide, i) => (
          <Card key={slide.title} className="min-h-[180px]">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
              {i + 1} / {slides.length}
            </p>
            <h2 className="mb-2 font-display text-2xl font-bold">{slide.title}</h2>
            <p className="text-ink-soft">{slide.body}</p>
          </Card>
        ))}
      </div>
    </main>
  );
}
