
import { useState } from "react";
import { NavHeader } from "@/components/layout/NavHeader";
import { TabBar } from "@/components/layout/TabBar";
import type { AppUser, Role, Tab } from "@/types";

export function UsuariosScreen({
  users,
  currentUserId,
  onUpdateRole,
  onDeleteUser,
  onTab,
  tab,
}: {
  users: AppUser[];
  currentUserId: string;
  onUpdateRole: (id: string, role: Role) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  onTab: (t: Tab) => void;
  tab: Tab;
}) {
  const [selectedMetric, setSelectedMetric] = useState<
    "total" | "tecnico" | "docente" | "admin"
  >("total");

  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>("docente");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const technicians = users.filter((user) => user.role === "tecnico");
  const teachers = users.filter((user) => user.role === "docente");
  const admins = users.filter((user) => user.role === "admin");

  const metricList = [
    {
      key: "total",
      label: "Total",
      count: users.length,
      style: "bg-[#0e1f4d] text-white",
    },
    {
      key: "tecnico",
      label: "Técnicos",
      count: technicians.length,
      style: "bg-[#17c3ce] text-white",
    },
    {
      key: "docente",
      label: "Docentes",
      count: teachers.length,
      style: "bg-white text-[#0e1f4d] border border-slate-200",
    },
    {
      key: "admin",
      label: "Administradores",
      count: admins.length,
      style: "bg-amber-50 text-amber-900 border border-amber-200",
    },
  ] as const;

  const visibleUsers =
    selectedMetric === "total"
      ? users
      : users.filter((user) => user.role === selectedMetric);

  function openEditor(appUser: AppUser) {
    setEditingUser(appUser);
    setSelectedRole(appUser.role);
    setError("");
  }

  async function saveRole() {
    if (!editingUser || saving) return;

    if (editingUser.id === currentUserId) {
      setError("No puedes cambiar tu propio rol.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await onUpdateRole(editingUser.id, selectedRole);
      setEditingUser(null);
    } catch (err) {
      console.error("Error al actualizar el rol:", err);
      setError(
        "No se pudo actualizar el rol. Verifica los permisos de Firebase e inténtalo nuevamente."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser(appUser: AppUser) {
    if (appUser.id === currentUserId || deletingId || saving) return;

    const confirmed = window.confirm(
      `¿Estás seguro de eliminar el perfil de ${appUser.email}?\n\nEsta acción no se puede deshacer desde la aplicación.`
    );

    if (!confirmed) return;

    setDeletingId(appUser.id);
    setError("");

    try {
      await onDeleteUser(appUser.id);

      if (editingUser?.id === appUser.id) {
        setEditingUser(null);
      }
    } catch (err) {
      console.error("Error al eliminar el usuario:", err);
      setError(
        "No se pudo eliminar el perfil. Verifica los permisos de Firebase e inténtalo nuevamente."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <NavHeader title="Administración" />

      <div className="flex-1 overflow-y-auto bg-[#f4f6fb] px-4 py-5">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#17c3ce]">
          Directorio
        </p>

        <h1 className="mt-1 mb-5 text-xl font-extrabold text-[#0e1f4d]">
          Usuarios registrados
        </h1>

        <div className="mb-4 grid grid-cols-2 gap-2">
          {metricList.map((metric) => (
            <button
              key={metric.key}
              type="button"
              onClick={() => setSelectedMetric(metric.key)}
              className={`rounded-2xl p-3 text-left shadow-sm transition ${
                metric.style
              } ${
                selectedMetric === metric.key
                  ? "ring-2 ring-[#17c3ce] scale-[1.01]"
                  : ""
              }`}
            >
              <p className="text-2xl font-extrabold leading-none">
                {metric.count}
              </p>
              <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.12em] opacity-75">
                {metric.label}
              </p>
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#0e1f4d]">
              {selectedMetric === "total"
                ? "Todos los usuarios"
                : selectedMetric === "tecnico"
                  ? "Técnicos"
                  : selectedMetric === "docente"
                    ? "Docentes"
                    : "Administradores"}
            </p>

            <span className="text-[10px] font-extrabold text-slate-500">
              {visibleUsers.length}
            </span>
          </div>

          <div className="space-y-2">
            {visibleUsers.map((appUser) => (
              <div
                key={appUser.id}
                className="flex items-center gap-2 rounded-xl bg-slate-50 p-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#17c3ce]/15 text-sm font-extrabold text-[#0e1f4d]">
                  {(appUser.email || "?").charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="break-words text-xs font-bold text-[#0e1f4d]">
                    {appUser.email || "Sin correo registrado"}
                  </p>

                  <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">
                    {appUser.role === "docente"
                      ? "Docente"
                      : appUser.role === "tecnico"
                        ? "Técnico"
                        : "Administrador"}
                  </p>
                </div>

                {appUser.id !== currentUserId && (
                  <div className="flex shrink-0 flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditor(appUser)}
                      disabled={deletingId !== null || saving}
                      className="rounded-lg bg-[#0e1f4d] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#172b62] disabled:opacity-50"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => void deleteUser(appUser)}
                      disabled={deletingId !== null || saving}
                      className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                    >
                      {deletingId === appUser.id ? "Eliminando..." : "Eliminar"}
                    </button>
                  </div>
                )}
              </div>
            ))}

            {visibleUsers.length === 0 && (
              <p className="py-6 text-center text-xs text-slate-400">
                No hay usuarios registrados en esta categoría.
              </p>
            )}
          </div>
        </div>

        {error && !editingUser && (
          <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>

      <TabBar active={tab} onChange={onTab} admin />

      {editingUser && (
        <div className="absolute inset-0 z-20 flex items-end bg-[#0e1f4d]/40 p-3 sm:items-center sm:justify-center">
          <div className="w-full space-y-4 rounded-[26px] bg-white p-5 shadow-xl sm:max-w-md">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#17c3ce]">
                Administración de usuarios
              </p>

              <h2 className="mt-1 text-lg font-extrabold text-[#0e1f4d]">
                Editar rol
              </h2>

              <p className="mt-2 break-words text-sm text-slate-600">
                {editingUser.email}
              </p>
            </div>

            <label
              htmlFor="user-role"
              className="block text-xs font-bold text-slate-600"
            >
              Selecciona el nuevo rol
            </label>

            <select
              id="user-role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as Role)}
              disabled={saving}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-[#0e1f4d] focus:border-[#17c3ce] focus:outline-none"
            >
              <option value="docente">Docente</option>
              <option value="tecnico">Técnico</option>
              <option value="admin">Administrador</option>
            </select>

            {error && (
              <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={() => void saveRole()}
              disabled={saving}
              className="w-full rounded-full bg-[#17c3ce] py-3 text-sm font-extrabold text-white transition hover:bg-[#12a8b3] disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingUser(null);
                setError("");
              }}
              disabled={saving}
              className="w-full rounded-full border border-slate-200 py-3 text-sm font-bold text-slate-600 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
