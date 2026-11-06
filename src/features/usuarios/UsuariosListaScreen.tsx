import { useState } from "react";
import { NavHeader } from "@/components/layout/NavHeader";
import { TabBar } from "@/components/layout/TabBar";
import { UserList } from "@/features/usuarios/components/UserList";
import type { AppUser, Role, Tab } from "@/types";

type UserSort = "newest" | "oldest" | "alphabetical";

export function UsuariosListaScreen({ role, users, currentUserId, onDeleteUser, onUpdateUserRole, onTab, tab }: {
  role: "tecnico" | "docente" | "admin" | "all";
  users: AppUser[];
  currentUserId: string;
  onDeleteUser: (id: string) => Promise<void>;
  onUpdateUserRole: (id: string, role: Role) => Promise<void>;
  onTab: (t: Tab) => void;
  tab: Tab;
}) {
  const [searchText, setSearchText] = useState("");
  const [sortBy, setSortBy] = useState<UserSort>("newest");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>("docente");
  const [savingRole, setSavingRole] = useState(false);
  const [editError, setEditError] = useState("");
  const label = role === "all" ? "Todos los usuarios" : role === "tecnico" ? "Técnicos" : role === "admin" ? "Administradores" : "Docentes";
  const roleUsers = role === "all" ? users : users.filter((user) => user.role === role);
  const normalizedSearch = searchText.trim().toLocaleLowerCase("es-MX");
  const visibleUsers = roleUsers
    .filter((user) =>
      `${user.email} ${user.role}`.toLocaleLowerCase("es-MX").includes(normalizedSearch),
    )
    .sort((a, b) => {
      if (sortBy === "alphabetical") {
        return a.email.localeCompare(b.email, "es", { sensitivity: "base" });
      }

      const aCreatedAt = a.createdAt?.toMillis() ?? null;
      const bCreatedAt = b.createdAt?.toMillis() ?? null;
      if (aCreatedAt === null && bCreatedAt === null) return 0;
      if (aCreatedAt === null) return 1;
      if (bCreatedAt === null) return -1;
      return sortBy === "newest"
        ? bCreatedAt - aCreatedAt
        : aCreatedAt - bCreatedAt;
    });

  function openEditor(appUser: AppUser) {
    setEditingUser(appUser);
    setSelectedRole(appUser.role);
    setEditError("");
  }

  async function saveRole() {
    if (!editingUser || savingRole) return;
    setSavingRole(true);
    setEditError("");
    try {
      await onUpdateUserRole(editingUser.id, selectedRole);
      setEditingUser(null);
    } catch (error) {
      console.error("Error al actualizar el rol:", error);
      setEditError(
        "No se pudo actualizar el rol. Verifica los permisos e inténtalo nuevamente.",
      );
    } finally {
      setSavingRole(false);
    }
  }

  return (
    <>
      <NavHeader title="Administracion" />
      <div className="flex-1 overflow-y-auto bg-[#f4f6fb] px-4 py-5 scrollbar-hide">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#17c3ce]">Directorio</p>
        <h1 className="text-[#0e1f4d] text-xl font-extrabold mt-1 mb-5">{label}</h1>
        <div className="mb-3 flex items-center gap-2">
          <label className="group flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition focus-within:border-[#17c3ce]">
            <svg
              aria-hidden="true"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4 flex-none text-slate-400 transition-colors group-focus-within:text-[#17c3ce]"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
            <input
              type="text"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Buscar usuario..."
              aria-label="Buscar usuario"
              className="min-w-0 flex-1 border-0 bg-transparent text-xs text-[#0e1f4d] outline-none ring-0 placeholder:text-slate-400 focus:border-0 focus:outline-none focus:ring-0"
            />
          </label>

          <div className="relative flex-none">
            <button
              type="button"
              onClick={() => setSortMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={sortMenuOpen}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2.5 text-[10px] font-extrabold text-[#0e1f4d] shadow-sm transition hover:border-[#17c3ce]/60"
            >
              <svg
                aria-hidden="true"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4 text-[#17c3ce]"
              >
                <path d="M7 3v18m0 0-4-4m4 4 4-4M17 21V3m0 0-4 4m4-4 4 4" />
              </svg>
              Ordenar por
            </button>
            {sortMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-10 mt-1 min-w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
              >
                {([
                  ["newest", "Más recientes"],
                  ["oldest", "Más antiguos"],
                  ["alphabetical", "Alfabéticamente"],
                ] as const).map(([value, optionLabel]) => (
                  <button
                    key={value}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setSortBy(value);
                      setSortMenuOpen(false);
                    }}
                    className={`w-full rounded-lg px-3 py-2 text-left text-xs font-bold transition hover:bg-slate-100 ${
                      sortBy === value ? "text-[#17c3ce]" : "text-[#0e1f4d]"
                    }`}
                  >
                    {optionLabel}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {visibleUsers.length > 0 ? (
          <UserList
            users={visibleUsers}
            currentUserId={currentUserId}
            onEditUser={openEditor}
            onDeleteUser={onDeleteUser}
          />
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-xs text-slate-400">
            {normalizedSearch
              ? "No se encontraron usuarios con esa búsqueda."
              : "No hay usuarios registrados."}
          </div>
        )}
      </div>
      <TabBar active="usuarios" onChange={onTab} admin />

      {editingUser && (
        <div className="absolute inset-0 z-20 flex items-end bg-[#0e1f4d]/40 p-3 sm:items-center sm:justify-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-user-title"
            className="w-full space-y-4 rounded-[26px] bg-white p-5 shadow-xl sm:max-w-md"
          >
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#17c3ce]">
                Administración de usuarios
              </p>
              <h2
                id="edit-user-title"
                className="mt-1 text-lg font-extrabold text-[#0e1f4d]"
              >
                Editar rol
              </h2>
              <p className="mt-2 break-words text-sm text-slate-600">
                {editingUser.email}
              </p>
            </div>

            <label
              htmlFor="full-list-user-role"
              className="block text-xs font-bold text-slate-600"
            >
              Selecciona el nuevo rol
            </label>
            <select
              id="full-list-user-role"
              value={selectedRole}
              onChange={(event) => setSelectedRole(event.target.value as Role)}
              disabled={savingRole}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-[#0e1f4d] focus:border-[#17c3ce] focus:outline-none"
            >
              <option value="docente">Docente</option>
              <option value="tecnico">Técnico</option>
              <option value="admin">Administrador</option>
            </select>

            {editError && (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {editError}
              </p>
            )}

            <button
              type="button"
              onClick={() => void saveRole()}
              disabled={savingRole}
              className="w-full rounded-full bg-[#17c3ce] py-3 text-sm font-extrabold text-white transition hover:bg-[#12a8b3] disabled:opacity-50"
            >
              {savingRole ? "Guardando..." : "Guardar cambios"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingUser(null);
                setEditError("");
              }}
              disabled={savingRole}
              className="w-full rounded-full border border-slate-200 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
