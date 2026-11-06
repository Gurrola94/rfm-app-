import { useState } from "react";
import type { AppUser } from "@/types";

export function UserList({
  users,
  currentUserId,
  onEditUser,
  onDeleteUser,
}: {
  users: AppUser[];
  currentUserId: string;
  onEditUser: (user: AppUser) => void;
  onDeleteUser: (id: string) => Promise<void>;
}) {
  const [openUser, setOpenUser] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function confirmDelete() {
    if (!userToDelete || deleting) return;
    setDeleting(true);
    setDeleteError("");

    try {
      await onDeleteUser(userToDelete.id);
      setUserToDelete(null);
    } catch (error) {
      console.error("Error al eliminar el usuario:", error);
      setDeleteError(
        "No se pudo eliminar el usuario. Verifica los permisos e inténtalo nuevamente.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="mb-2 space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
        {users.map((appUser) => (
          <div
            key={appUser.id}
            className="relative flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#17c3ce]/15 text-xs font-extrabold text-[#0e1f4d]">
              {(appUser.email || "?").charAt(0).toUpperCase()}
            </div>
            <span className="min-w-0 flex-1 truncate text-xs font-bold text-[#0e1f4d]">
              {appUser.email || "Sin correo registrado"}
            </span>
            {appUser.id !== currentUserId && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setOpenUser((openId) =>
                      openId === appUser.id ? null : appUser.id,
                    )
                  }
                  aria-label={`Opciones de ${appUser.email}`}
                  aria-haspopup="menu"
                  aria-expanded={openUser === appUser.id}
                  className="rounded-lg px-1 text-xl leading-none text-slate-400 transition hover:bg-slate-200 hover:text-[#0e1f4d]"
                >
                  ⋮
                </button>
                {openUser === appUser.id && (
                  <div
                    role="menu"
                    className="absolute right-2 top-10 z-10 min-w-32 rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setOpenUser(null);
                        onEditUser(appUser);
                      }}
                      className="w-full rounded-lg px-3 py-2 text-left text-xs font-bold text-[#0e1f4d] transition hover:bg-slate-100"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setOpenUser(null);
                        setDeleteError("");
                        setUserToDelete(appUser);
                      }}
                      className="w-full rounded-lg px-3 py-2 text-left text-xs font-bold text-red-700 transition hover:bg-red-50"
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
        {users.length === 0 && (
          <p className="py-3 text-center text-xs text-slate-400">
            No hay usuarios registrados
          </p>
        )}
      </div>

      {userToDelete && (
        <div className="absolute inset-0 z-20 flex items-end bg-[#0e1f4d]/40 p-3 sm:items-center sm:justify-center">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-user-title"
            className="w-full space-y-4 rounded-[26px] bg-white p-5 shadow-xl sm:max-w-md"
          >
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-red-600">
                Administración de usuarios
              </p>
              <h2
                id="delete-user-title"
                className="mt-1 text-lg font-extrabold text-[#0e1f4d]"
              >
                ¿Eliminar usuario?
              </h2>
            </div>
            <p className="break-words text-sm text-slate-600">
              ¿Seguro que deseas eliminar la cuenta de {userToDelete.email}?
              Esta acción no se puede deshacer desde la aplicación.
            </p>
            {deleteError && (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {deleteError}
              </p>
            )}
            <button
              type="button"
              onClick={() => void confirmDelete()}
              disabled={deleting}
              className="w-full rounded-full bg-red-600 py-3 text-sm font-extrabold text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? "Eliminando..." : "Sí, eliminar"}
            </button>
            <button
              type="button"
              onClick={() => setUserToDelete(null)}
              disabled={deleting}
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
