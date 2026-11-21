import { useRef } from "react";
import { Button } from "./Button";

type CameraCaptureProps = {
  multiple?: boolean;
  label?: string;
  onFiles: (files: File[]) => void;
};

export function CameraCapture({
  multiple = true,
  label = "Subir fotos",
  onFiles,
}: CameraCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-card border-2 border-dashed border-line bg-paper-2/60 p-6">
        <div className="pointer-events-none absolute left-3 top-3 h-6 w-6 border-l-2 border-t-2 border-marker-blue" />
        <div className="pointer-events-none absolute right-3 top-3 h-6 w-6 border-r-2 border-t-2 border-marker-blue" />
        <div className="pointer-events-none absolute bottom-3 left-3 h-6 w-6 border-b-2 border-l-2 border-marker-blue" />
        <div className="pointer-events-none absolute bottom-3 right-3 h-6 w-6 border-b-2 border-r-2 border-marker-blue" />

        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="font-hand text-2xl text-ink">Encuaadra la hoja</p>
          <p className="max-w-xs text-sm text-ink-soft">
            Cámara o galería. Podés subir varias a la vez.
          </p>
          <Button onClick={() => inputRef.current?.click()}>{label}</Button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          const list = e.target.files ? Array.from(e.target.files) : [];
          if (list.length) onFiles(list);
          e.target.value = "";
        }}
      />
    </div>
  );
}
