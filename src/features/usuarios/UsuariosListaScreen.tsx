import { NavHeader } from "@/components/layout/NavHeader";
import { TabBar } from "@/components/layout/TabBar";
import { UserList } from "@/features/usuarios/components/UserList";
import type { AppUser, Tab } from "@/types";

export function UsuariosListaScreen({ role, users, onDeleteUser, onTab, tab }: {
  role: "tecnico" | "docente" | "all";
  users: AppUser[];
  onDeleteUser: (id: string) => void;
  onTab: (t: Tab) => void;
  tab: Tab;
}) {
  const label = role === "all" ? "Todos los usuarios" : role === "tecnico" ? "Tecnicos" : "Docentes";
  return (
    <>
      <NavHeader title="Administracion" />
      <div className="flex-1 overflow-y-auto bg-[#f4f6fb] px-4 py-5 scrollbar-hide">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#17c3ce]">Directorio</p>
        <h1 className="text-[#0e1f4d] text-xl font-extrabold mt-1 mb-5">{label}</h1>
        <UserList users={role === "all" ? users : users.filter((user) => user.role === role)} onDeleteUser={onDeleteUser} />
      </div>
      <TabBar active="usuarios" onChange={onTab} admin />
    </>
  );
}
