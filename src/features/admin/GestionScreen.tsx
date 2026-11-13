import { useState } from "react";
import { NavHeader } from "@/components/layout/NavHeader";
import { TabBar } from "@/components/layout/TabBar";
import type { AppSpace, Tab } from "@/types";

export function GestionScreen({
  onOpenUsers,
  onOpenSpaces,
  onTab,
  tab,
}: {
  onOpenUsers: () => void;
  onOpenSpaces: () => void;
  onTab: (t: Tab) => void;
  tab: Tab;
}) {
  return (
    <>
      <NavHeader title="Gestión" />
      <div className="flex-1 bg-[#f4f6fb] px-4 py-5">
        <p className="mb-4 text-sm font-bold text-slate-500">
          ¿Qué deseas gestionar?
        </p>
        <div className="space-y-3">
          <button
            type="button"
            onClick={onOpenUsers}
            className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-[#17c3ce]/60"
          >
            <span className="block text-base font-extrabold text-[#0e1f4d]">
              Usuarios
            </span>
            <span className="mt-1 block text-xs text-slate-500">
              Administra los usuarios y sus roles
            </span>
          </button>
          <button
            type="button"
            onClick={onOpenSpaces}
            className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-[#17c3ce]/60"
          >
            <span className="block text-base font-extrabold text-[#0e1f4d]">
              Espacios
            </span>
            <span className="mt-1 block text-xs text-slate-500">
              Administra los espacios de la institución
            </span>
          </button>
        </div>
      </div>
      <TabBar active={tab} onChange={onTab} admin />
    </>
  );
}

export function EspaciosScreen({
  spaces,
  onAddSpace,
  onUpdateSpace,
  onDeleteSpace,
  onBack,
  onTab,
  tab,
}: {
  spaces: AppSpace[];
  onAddSpace: (name: string) => Promise<void>;
  onUpdateSpace: (space: AppSpace, name: string) => Promise<void>;
  onDeleteSpace: (space: AppSpace) => Promise<void>;
  onBack: () => void;
  onTab: (t: Tab) => void;
  tab: Tab;
}) {
  const [searchText, setSearchText] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "alphabetical">(
    "newest",
  );
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [openSpaceMenuId, setOpenSpaceMenuId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<
    | { kind: "form"; mode: "add" | "edit"; space?: AppSpace; name: string }
    | { kind: "confirm"; mode: "add" | "edit"; space?: AppSpace; name: string }
    | { kind: "confirm"; mode: "delete"; space: AppSpace }
    | null
  >(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const normalizedSearch = searchText.trim().toLocaleLowerCase("es-MX");
  const visibleSpaces = spaces
    .filter((space) =>
      space.name.toLocaleLowerCase("es-MX").includes(normalizedSearch),
    )
    .sort((a, b) => {
      if (sortBy === "alphabetical") {
        return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
      }

      const aCreatedAt = a.createdAt?.toMillis() ?? null;
      const bCreatedAt = b.createdAt?.toMillis() ?? null;
      if (aCreatedAt === null && bCreatedAt === null) {
        return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
      }
      if (aCreatedAt === null) return 1;
      if (bCreatedAt === null) return -1;
      return sortBy === "newest"
        ? bCreatedAt - aCreatedAt
        : aCreatedAt - bCreatedAt;
    });

  function startAdd() {
    setError("");
    setDialog({ kind: "form", mode: "add", name: "" });
  }

  function startEdit(space: AppSpace) {
    setError("");
    setOpenSpaceMenuId(null);
    setDialog({ kind: "form", mode: "edit", space, name: space.name });
  }

  function requestSave() {
    if (!dialog || dialog.kind !== "form") return;
    const cleanName = dialog.name.trim();
    if (!cleanName) {
      setError("Escribe el nombre del espacio.");
      return;
    }

    if (
      spaces.some(
        (space) =>
          space.id !== dialog.space?.id &&
          space.name.toLocaleLowerCase("es-MX") ===
            cleanName.toLocaleLowerCase("es-MX"),
      )
    ) {
      setError("Ese espacio ya está registrado.");
      return;
    }

    setError("");
    setDialog({
      kind: "confirm",
      mode: dialog.mode,
      space: dialog.space,
      name: cleanName,
    });
  }

  async function confirmAction() {
    if (!dialog || dialog.kind !== "confirm") return;
    setSaving(true);
    setError("");
    try {
      if (dialog.mode === "delete") {
        await onDeleteSpace(dialog.space);
      } else if (dialog.mode === "edit" && dialog.space) {
        await onUpdateSpace(dialog.space, dialog.name);
      } else {
        await onAddSpace(dialog.name);
      }
      setDialog(null);
    } catch (err) {
      console.error("Error al guardar cambios del espacio:", err);
      setError(
        dialog.mode === "delete"
          ? "No se pudo eliminar el espacio. Inténtalo nuevamente."
          : dialog.mode === "edit"
            ? "No se pudo editar el espacio. Inténtalo nuevamente."
            : "No se pudo agregar el espacio. Inténtalo nuevamente.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <NavHeader title="Espacios"/>
      <div className="flex min-h-0 flex-1 flex-col bg-[#f4f6fb]">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#17c3ce]">
            Directorio
          </p>
          <h1 className="mb-4 mt-1 text-xl font-extrabold text-[#0e1f4d]">
            Espacios registrados
          </h1>

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
                  placeholder="Buscar espacio..."
                  aria-label="Buscar espacio"
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
                          sortBy === value
                            ? "text-[#17c3ce]"
                            : "text-[#0e1f4d]"
                        }`}
                      >
                        {optionLabel}
                      </button>
                    ))}
                  </div>
                )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            {visibleSpaces.length > 0 ? (
                <ul className="space-y-2">
                  {visibleSpaces.map((space) => (
                    <li
                      key={space.id}
                      className="relative flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5"
                    >
                      <span className="min-w-0 flex-1 break-words text-sm font-semibold text-[#0e1f4d]">
                        {space.name}
                      </span>
                      <button
                        type="button"
                        aria-label={`Opciones de ${space.name}`}
                        aria-haspopup="menu"
                        aria-expanded={openSpaceMenuId === space.id}
                        onClick={() =>
                          setOpenSpaceMenuId((openId) =>
                            openId === space.id ? null : space.id,
                          )
                        }
                        className="shrink-0 rounded-lg px-2 py-1 text-xl leading-none text-slate-500 transition hover:bg-slate-200 hover:text-[#0e1f4d]"
                      >
                        ⋮
                      </button>
                      {openSpaceMenuId === space.id && (
                        <div
                          role="menu"
                          className="absolute right-2 top-full z-10 mt-1 min-w-32 rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => startEdit(space)}
                            className="w-full rounded-lg px-3 py-2 text-left text-xs font-bold text-[#0e1f4d] transition hover:bg-slate-100"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setOpenSpaceMenuId(null);
                              setError("");
                              setDialog({ kind: "confirm", mode: "delete", space });
                            }}
                            className="w-full rounded-lg px-3 py-2 text-left text-xs font-bold text-red-700 transition hover:bg-red-50"
                          >
                            Eliminar
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
            ) : (
                <p className="py-4 text-center text-xs text-slate-400">
                  {normalizedSearch
                    ? "No se encontraron espacios con esa búsqueda."
                    : "No hay espacios registrados."}
                </p>
            )}
          </div>
        </div>

        <div className="flex-none border-t border-slate-100 bg-white px-4 py-3">
          <button
            type="button"
            onClick={startAdd}
            className="w-full rounded-full bg-[#17c3ce] py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#12a8b3]"
          >
            Agregar espacio
          </button>
        </div>
      </div>
      <TabBar active={tab} onChange={onTab} admin />

      {dialog && (
        <div className="absolute inset-0 z-20 flex items-end bg-[#0e1f4d]/40 p-3 sm:items-center sm:justify-center">
          <div className="w-full space-y-4 rounded-[26px] bg-white p-5 shadow-xl sm:max-w-md">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#17c3ce]">
                Gestión de espacios
              </p>
              <h2 className="mt-1 text-lg font-extrabold text-[#0e1f4d]">
                {dialog.kind === "confirm"
                  ? dialog.mode === "delete"
                    ? "Eliminar espacio"
                    : dialog.mode === "edit"
                      ? "Confirmar cambios"
                      : "Confirmar espacio"
                  : dialog.mode === "edit"
                    ? "Editar espacio"
                    : "Agregar espacio"}
              </h2>
            </div>

            {dialog.kind === "form" ? (
              <>
                <label
                  htmlFor="space-name"
                  className="block text-xs font-bold text-slate-600"
                >
                  Nombre del espacio
                </label>
                <input
                  id="space-name"
                  autoFocus
                  value={dialog.name}
                  onChange={(event) => {
                    setDialog({ ...dialog, name: event.target.value });
                    setError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !saving) requestSave();
                  }}
                  placeholder="Ej. Biblioteca"
                  disabled={saving}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 transition focus:border-[#17c3ce] focus:outline-none"
                />
              </>
            ) : (
              <p className="text-sm text-slate-600">
                {dialog.mode === "delete"
                  ? `¿Deseas eliminar el espacio "${dialog.space.name}"?`
                  : dialog.mode === "edit"
                    ? `¿Confirmas cambiar el nombre a "${dialog.name}"?`
                    : `¿Confirmas agregar el espacio "${dialog.name}"?`}
              </p>
            )}

            {error && (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={() =>
                dialog.kind === "form"
                  ? requestSave()
                  : void confirmAction()
              }
              disabled={saving}
              className="w-full rounded-full bg-[#17c3ce] py-3 text-sm font-extrabold text-white transition hover:bg-[#12a8b3] disabled:opacity-50"
            >
              {saving
                ? dialog.kind === "confirm" && dialog.mode === "delete"
                  ? "Eliminando..."
                  : dialog.kind === "confirm" && dialog.mode === "edit"
                    ? "Guardando..."
                    : "Agregando..."
                : dialog.kind === "form"
                  ? dialog.mode === "edit"
                    ? "Guardar"
                    : "Agregar"
                  : dialog.mode === "delete"
                    ? "Sí, eliminar"
                    : "Confirmar"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!saving) {
                  setDialog(null);
                  setError("");
                }
              }}
              disabled={saving}
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
