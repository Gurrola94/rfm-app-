import type { Category } from "./models";

export type Screen =
  | { name: "login" }
  | { name: "home" }
  | { name: "nueva"; preCategory?: Category; returnTo?: "home" | "admin" }
  | { name: "mantenimiento" }
  | { name: "detalle"; reportId: string; returnTo: "mantenimiento" | "admin-fallas" | "historial" | "admin" }
  | { name: "historial" }
  | { name: "perfil" }
  | { name: "admin" }
  | { name: "admin-fallas" }
  | { name: "admin-materiales" }
  | { name: "admin-apoyos" }
  | { name: "admin-materiales-historial" }
  | { name: "usuarios" }
  | { name: "usuarios-list"; role: "tecnico" | "docente" | "all" };
