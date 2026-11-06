import type { Category, Role } from "./models";

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
  | { name: "gestion" }
  | { name: "usuarios" }
  | { name: "espacios" }
  | { name: "usuarios-list"; role: Role | "all" };
