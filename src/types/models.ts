import { Timestamp } from "firebase/firestore";

export type Role = "docente" | "tecnico" | "admin";
export type Priority = "Urgente" | "Media" | "Baja";
export type Status = "Pendiente" | "En proceso" | "Resuelto" | "Cancelado";
export type Category = "Minisplit/Clima" | "Chapas/Puertas" | "Eléctrico" | "Mobiliario" | "Plomería" | "Tecnología";
export type Tab = "home" | "usuarios" | "reportes" | "perfil";

export interface Avance {
  fecha: Timestamp;
  estado: "En proceso" | "Pendiente";
  notas: string;
  por?: string;
  motivo?: string;
  evidenciaNombre?: string;
  foto?: string;
}

export interface Report {
  id: string;
  folio?: string;
  category: Category;
  priority: Priority;
  status: Status;
  salon: string;
  elemento: string;
  description: string;
  reportedBy: string;
  reportedByUid: string;
  role: Role;
  createdAt: Timestamp | null;
  acciones?: string;
  materiales?: string;
  photoUrl?: string;
  motivoPendiente?: string;
  notasAvance?: string;
  evidenciaNombre?: string;
  horarioInicio?: string;
  horarioFin?: string;
  fotoResuelto?: string;
  avances?: Avance[];
}

export interface MaterialRequest {
  id: string;
  reportId: string;
  material: string;
  observation: string;
  requestedBy: string;
  status: "Pendiente de aprobación" | "Aprobada" | "Rechazada" | "Cancelada";
  createdAt: Timestamp | null;
  estimatedCost?: number;
  tipo?: "material" | "apoyo_externo";
}

export interface AppUser {
  id: string;
  email: string;
  role: "tecnico" | "docente" | "admin";
  temporaryPassword?: string;
}
