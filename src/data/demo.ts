import type { AppUser, MaterialRequest, Report } from "@/types";

export const DEMO_REPORTS: Report[] = [
  {
    id: "demo-1",
    category: "Minisplit/Clima",
    priority: "Urgente",
    status: "En proceso",
    salon: "Aula 112",
    elemento: "Minisplit",
    description: "Fuga de agua en minisplit - Aula 112",
    reportedBy: "Profe Luis",
    reportedByUid: "demo-uid",
    role: "docente",
    createdAt: null,
  },
  {
    id: "demo-2",
    category: "Eléctrico",
    priority: "Baja",
    status: "Resuelto",
    salon: "Laboratorio",
    elemento: "Foco",
    description: "Reemplazo de foco - Laboratorio",
    reportedBy: "Maestra Lila",
    reportedByUid: "demo-uid-2",
    role: "docente",
    createdAt: null,
    acciones: "Se reemplazó el foco fundido.",
    materiales: "Foco LED 20W",
  },
  {
    id: "demo-3",
    category: "Plomería",
    priority: "Media",
    status: "Pendiente",
    salon: "Baño planta baja",
    elemento: "Tubería",
    description: "Fuga de agua en los baños",
    reportedBy: "Prefecto Torres",
    reportedByUid: "demo-uid-3",
    role: "docente",
    createdAt: null,
  },
];

export const DEMO_MATERIAL_REQUESTS: MaterialRequest[] = [
  {
    id: "material-demo-1",
    reportId: "demo-1",
    material: "Gas refrigerante R410a",
    observation: "Se necesita para reparar minisplit de Aula 112",
    requestedBy: "Técnico de mantenimiento",
    status: "Pendiente de aprobación",
    createdAt: null,
  },
];

export const DEMO_USERS: AppUser[] = [
  { id: "user-demo-1", email: "tecnico@b", role: "tecnico", temporaryPassword: "Tecnico123" },
  { id: "user-demo-2", email: "maria@buhsab.mx", role: "docente" },
  { id: "user-demo-3", email: "luis@buhsab.mx", role: "docente" },
];
