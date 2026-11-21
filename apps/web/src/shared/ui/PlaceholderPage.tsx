type PlaceholderPageProps = {
  title: string;
  owner: string;
  path: string;
};

/** Página vacía de esqueleto: nombre + dueño. Cada rol la reemplaza. */
export function PlaceholderPage({ title, owner, path }: PlaceholderPageProps) {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-3 px-6 py-16">
      <p className="font-hand text-2xl text-marker-blue">{path}</p>
      <h1 className="text-3xl font-extrabold text-ink">{title}</h1>
      <p className="text-ink-soft">
        Página vacía · Dueño: <span className="font-semibold text-ink">{owner}</span>
      </p>
    </main>
  );
}
