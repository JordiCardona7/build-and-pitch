import type {
  Assignment,
  Board,
  ClassRoom,
  Diagnosis,
  ErrorCode,
  Exercise,
  MetaResponse,
  StudentSummary,
} from "../types";

export const ERROR_LABELS: Record<ErrorCode, string> = {
  SUMA_DIRECTA: "Sumaron también los de abajo",
  NUMERADOR_SIN_AJUSTAR: "No ajustaron el numerador",
  SUMA_DENOMINADORES: "Sumaron los denominadores al final",
  AMPLIFICACION_INCORRECTA: "Amplificaron mal",
  DENOMINADOR_NO_COMUN: "Elegieron un denominador que no sirve",
  MULTIPLICA: "Multiplicaron en vez de sumar",
  ERROR_ARITMETICO: "Se equivocaron en la cuenta",
  OTRO: "Otro error",
};

export const metaMock: MetaResponse = {
  error_labels: ERROR_LABELS,
  level_labels: {
    CONCEPTO_FRACCION: "Qué es una fracción",
    EQUIVALENCIA: "Fracciones equivalentes",
    DENOMINADOR_COMUN: "Denominador común",
    SUMA: "Sumar con distinto denominador",
  },
  demo_mode: true,
};

export const exerciseDemo: Exercise = {
  id: "ex-demo-1",
  a: { n: 1, d: 2 },
  b: { n: 1, d: 3 },
  text: "1/2 + 1/3",
};

const SHEET_SVG = (name: string, wrong: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="520" viewBox="0 0 400 520">
  <rect width="400" height="520" fill="#fffef8"/>
  <text x="28" y="48" font-family="Georgia, serif" font-size="28" fill="#1F2430">${name}</text>
  <text x="28" y="110" font-family="Georgia, serif" font-size="32" fill="#1F2430">1/2 + 1/3</text>
  <text x="28" y="170" font-family="Georgia, serif" font-size="32" fill="#1F2430">= ${wrong}</text>
  <line x1="24" y1="80" x2="360" y2="80" stroke="#E4D9C6"/>
</svg>`)}`;

const names = [
  "Kevin", "María", "José", "Ana", "Luis", "Sofía", "Diego", "Valeria",
  "Carlos", "Elena", "Pedro", "Camila", "Andrés", "Lucía", "Miguel",
  "Isabella", "Jorge", "Fernanda", "Pablo", "Daniela", "Ricardo",
  "Gabriela", "Héctor", "Paula", "Tomás",
];

function makeStudent(
  i: number,
  status: StudentSummary["status"],
  error_code: ErrorCode | null,
  diagnosisId: string | null,
): StudentSummary {
  return {
    id: `stu-${i + 1}`,
    name: names[i] ?? `Alumno ${i + 1}`,
    status,
    error_code,
    stars: status === "verde" ? 2 : status === "amarillo" ? 1 : 0,
    last_diagnosis_id: diagnosisId,
    source: i < 3 ? "aula" : "demo",
  };
}

function buildDemoBoard(assignmentId: string, classCode: string): Board {
  const students: StudentSummary[] = [
    makeStudent(0, "rojo", "SUMA_DIRECTA", "diag-kevin"),
    makeStudent(1, "rojo", "NUMERADOR_SIN_AJUSTAR", "diag-maria"),
    makeStudent(2, "revisar", "OTRO", "diag-jose"),
    ...Array.from({ length: 11 }, (_, i) =>
      makeStudent(i + 3, "rojo", "SUMA_DIRECTA", null),
    ),
    ...Array.from({ length: 4 }, (_, i) =>
      makeStudent(i + 14, "amarillo", "SUMA_DIRECTA", null),
    ),
    ...Array.from({ length: 3 }, (_, i) =>
      makeStudent(i + 18, "verde", null, null),
    ),
    ...Array.from({ length: 2 }, (_, i) =>
      makeStudent(i + 21, "rojo", "ERROR_ARITMETICO", null),
    ),
    makeStudent(23, "rojo", "MULTIPLICA", null),
    makeStudent(24, "amarillo", "AMPLIFICACION_INCORRECTA", null),
  ];

  const byError = new Map<string, StudentSummary[]>();
  for (const s of students) {
    const key =
      s.status === "revisar"
        ? "REVISAR"
        : s.status === "verde" || !s.error_code
          ? "CORRECTO"
          : s.error_code;
    const list = byError.get(key) ?? [];
    list.push(s);
    byError.set(key, list);
  }

  const groups: Board["groups"] = [];
  for (const [code, list] of byError) {
    if (code === "REVISAR") {
      groups.push({ error_code: "REVISAR", label: "Revisar", students: list });
    } else if (code === "CORRECTO") {
      groups.push({
        error_code: "CORRECTO",
        label: "Lo resolvieron bien",
        students: list,
      });
    } else {
      const ec = code as ErrorCode;
      groups.push({
        error_code: ec,
        label: `${list.length} ${ERROR_LABELS[ec].toLowerCase()}`,
        students: list,
      });
    }
  }

  return {
    class_code: classCode,
    assignment_id: assignmentId,
    exercise: exerciseDemo,
    counts: {
      rojo: students.filter((s) => s.status === "rojo").length,
      amarillo: students.filter((s) => s.status === "amarillo").length,
      verde: students.filter((s) => s.status === "verde").length,
      revisar: students.filter((s) => s.status === "revisar").length,
    },
    total: students.length,
    groups,
  };
}

const initialDiagnoses: Record<string, Diagnosis> = {
  "diag-kevin": {
    id: "diag-kevin",
    status: "done",
    student_name: "Kevin",
    exercise: exerciseDemo,
    image_url: SHEET_SVG("Kevin", "2/5"),
    transcript: [
      { index: 0, text: "1/2 + 1/3", ok: true },
      { index: 1, text: "2/5", ok: false },
    ],
    final_answer: { n: 2, d: 5 },
    correct: false,
    error_code: "SUMA_DIRECTA",
    error_line: 1,
    error_box: { x: 0.08, y: 0.28, w: 0.35, h: 0.12 },
    feedback: "Sumaste también los de abajo.",
    confidence: 0.92,
    teacher_override: false,
    note: null,
  },
  "diag-maria": {
    id: "diag-maria",
    status: "done",
    student_name: "María",
    exercise: exerciseDemo,
    image_url: SHEET_SVG("María", "2/6"),
    transcript: [
      { index: 0, text: "1/2 + 1/3", ok: true },
      { index: 1, text: "3/6 + 2/6", ok: true },
      { index: 2, text: "2/6", ok: false },
    ],
    final_answer: { n: 2, d: 6 },
    correct: false,
    error_code: "NUMERADOR_SIN_AJUSTAR",
    error_line: 2,
    error_box: { x: 0.08, y: 0.28, w: 0.3, h: 0.12 },
    feedback: "Cambiaste al denominador común, pero no ajustaste los de arriba.",
    confidence: 0.81,
    teacher_override: false,
    note: null,
  },
  "diag-jose": {
    id: "diag-jose",
    status: "needs_review",
    student_name: "José",
    exercise: exerciseDemo,
    image_url: SHEET_SVG("José", "?"),
    transcript: [
      { index: 0, text: "1/2 + 1/3", ok: true },
      { index: 1, text: "letra poco clara", ok: false },
    ],
    final_answer: null,
    correct: false,
    error_code: "OTRO",
    error_line: 1,
    error_box: null,
    feedback: "No pude leer bien esta hoja.",
    confidence: 0.42,
    teacher_override: false,
    note: null,
  },
};

export const store = {
  classroom: { code: "MAT-1B", name: "Mate 1B — Carmen" } as ClassRoom,
  assignments: [
    {
      id: "asg-1",
      class_code: "MAT-1B",
      title: "Suma de fracciones — hoja 1",
      exercise: exerciseDemo,
      key_answer: { n: 5, d: 6 },
      key_transcript: [
        { index: 0, text: "1/2 + 1/3", ok: true },
        { index: 1, text: "3/6 + 2/6", ok: true },
        { index: 2, text: "5/6", ok: true },
      ],
      created_at: new Date().toISOString(),
    },
  ] as Assignment[],
  diagnoses: { ...initialDiagnoses } as Record<string, Diagnosis>,
  boards: {
    "asg-1": buildDemoBoard("asg-1", "MAT-1B"),
  } as Record<string, Board>,
};

export function reseedDemo(classCode: string, assignmentId: string): Board {
  store.boards[assignmentId] = buildDemoBoard(assignmentId, classCode);
  return store.boards[assignmentId]!;
}

export function delay(ms = 400): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
