import type { Category, Priority, Status } from "@/types";

export const PRIORITY_LABELS: Record<Priority, string> = {
  Urgente: "Urgente",
  Media: "Media",
  Baja: "Baja",
};
export const PRIORITY_DOT: Record<Priority, string> = {
  Urgente: "bg-red-500",
  Media: "bg-amber-400",
  Baja: "bg-green-500",
};
export const PRIORITY_BADGE: Record<Priority, string> = {
  Urgente: "text-red-600",
  Media: "text-amber-600",
  Baja: "text-green-600",
};
export const STATUS_BADGE: Record<Status, string> = {
  Pendiente: "bg-yellow-100 text-yellow-700",
  "En proceso": "bg-blue-100 text-blue-700",
  Resuelto: "bg-green-100 text-green-700",
  Cancelado: "bg-red-100 text-red-700",
};
export const CAT_ICON: Record<Category, string> = {
  "Minisplit/Clima": "❄️",
  "Chapas/Puertas": "🚪",
  Eléctrico: "💡",
  Mobiliario: "🪑",
  Plomería: "🔧",
  Tecnología: "💻",
};
export const CATEGORIES: Category[] = ["Minisplit/Clima", "Chapas/Puertas", "Eléctrico", "Mobiliario", "Plomería", "Tecnología"];
export const PRIORITIES: Priority[] = ["Urgente", "Media", "Baja"];
export const STATUSES: Status[] = ["Pendiente", "En proceso", "Resuelto"];
export const AREAS = ["Aula 1", "Aula 2", "Aula 3", "Aula 4", "Aula 5", "Aula 6", "Aula 7", "Aula 8", "Aula 9", "Aula 10", "Aula 11", "Aula 12", "Aula 13", "Aula 14", "Aula 15", "Aula 16", "Cinema", "Sala de usos múltiple", "Robótica", "Computación", "Dirección", "Happy", "Oficina Principal", "Coordinación Planta Alta", "Música", "Taekwondo", "Psicología",  "Enfermería"];
