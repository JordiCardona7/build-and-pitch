type StarsProps = {
  value: number;
  max?: number;
};

export function Stars({ value, max = 3 }: StarsProps) {
  return (
    <div className="flex gap-1" aria-label={`${value} de ${max} estrellas`}>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={i < value ? "text-marker-orange" : "text-line"}
        >
          ★
        </span>
      ))}
    </div>
  );
}
