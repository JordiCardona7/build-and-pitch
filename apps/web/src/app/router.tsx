import { createBrowserRouter } from "react-router-dom";
import { Layout } from "@/app/Layout";
import { Landing } from "@/pages/Landing";
import { BoardSandbox } from "@/pages/sandbox/BoardSandbox";
import { InteractSandbox } from "@/pages/sandbox/InteractSandbox";
import { TeacherHome } from "@/features/teacher/pages/TeacherHome";
import { TeacherAssignment } from "@/features/teacher/pages/TeacherAssignment";
import { TeacherSheetDetail } from "@/features/teacher/pages/TeacherSheetDetail";
import { StudentHome } from "@/features/student/pages/StudentHome";
import { StudentProblem } from "@/features/student/pages/StudentProblem";
import { StudentExplain } from "@/features/student/pages/StudentExplain";
import { ClassPage } from "@/features/student/pages/ClassPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Landing /> },
      { path: "docente", element: <TeacherHome /> },
      { path: "docente/tarea/:assignmentId", element: <TeacherAssignment /> },
      {
        path: "docente/tarea/:assignmentId/hoja/:diagnosisId",
        element: <TeacherSheetDetail />,
      },
      { path: "alumno", element: <StudentHome /> },
      { path: "alumno/problema", element: <StudentProblem /> },
      { path: "alumno/explicame", element: <StudentExplain /> },
      { path: "clase", element: <ClassPage /> },
      { path: "sandbox/pizarra", element: <BoardSandbox /> },
      { path: "sandbox/interaccion", element: <InteractSandbox /> },
    ],
  },
]);
