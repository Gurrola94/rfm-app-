import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { NavHeader } from "@/components/layout/NavHeader";
import { CATEGORIES, PRIORITY_LABELS } from "@/constants";
import type { Category, Priority, Report, Role } from "@/types";

const AULAS = Array.from(
  { length: 16 },
  (_, index) => `Aula ${index + 1}`
);

const AREAS = [
  "Sala de usos múltiples",
  "Robótica",
  "Dirección",
  "Happy",
  "Coordinación Planta Alta",
  "Música",
  "Taekwondo",
  "Psicología",
  "Enfermería",
  "Pasillo planta baja",
  "Baños planta alta",
  "Taller pintura",
];

type LocationTab = "aulas" | "areas" | "otro";

export function NuevaFallaScreen({
  user,
  role,
  preCategory,
  onBack,
  demoMode,
  onDemoAdd,
  nextFolio,
}: {
  user: User;
  role: Role;
  preCategory?: Category;
  onBack: () => void;
  demoMode?: boolean;
  onDemoAdd?: (r: Report) => void;
  areas: string[];
  nextFolio: string;
}) {
  const isLockedByCategory = Boolean(preCategory);

  const [salon, setSalon] = useState("");
  const [elemento, setElemento] = useState<string>(
    preCategory ?? "Minisplit/Clima"
  );
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("Media");
  const [category, setCategory] = useState<Category>(
    preCategory ?? "Minisplit/Clima"
  );

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Estados del nuevo selector de ubicación.
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationTab, setLocationTab] = useState<LocationTab>("aulas");
  const [otherLocation, setOtherLocation] = useState("");

  // Permite cerrar el selector con la tecla Escape.
  useEffect(() => {
    if (!locationOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLocationOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [locationOpen]);

  // Actualiza la categoría cuando se selecciona una categoría previa.
  useEffect(() => {
    if (preCategory) {
      setCategory(preCategory);
      setElemento(preCategory);
    }
  }, [preCategory]);

  // Selecciona una ubicación y cierra el panel.
  function selectLocation(location: string) {
    setSalon(location);
    setLocationOpen(false);
    setOtherLocation("");
  }

  // Confirma una ubicación personalizada.
  function confirmOtherLocation() {
    const value = otherLocation.trim();

    if (!value) {
      alert("Especifica una ubicación.");
      return;
    }

    selectLocation(value);
  }

  // Envía el reporte a Firestore o al modo de demostración.
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (sending) return;

    if (!salon.trim() || !elemento.trim()) {
      alert("Completa todos los campos obligatorios.");
      return;
    }

    setSending(true);

    const reportedBy =
      user.displayName || user.email?.split("@")[0] || "Usuario";

    // Modo de demostración.
    if (demoMode) {
      try {
        onDemoAdd?.({
          id: `demo-${Date.now()}`,
          folio: nextFolio,
          category,
          priority,
          salon,
          elemento,
          description,
          status: "Pendiente",
          reportedBy,
          reportedByUid: user.uid || "demo",
          role,
          createdAt: Timestamp.now(),
        });

        setSent(true);
        setTimeout(onBack, 1500);
      } catch (err) {
        console.error("Error al crear el reporte de demostración:", err);
        alert("No se pudo crear el reporte de demostración.");
      } finally {
        setSending(false);
      }

      return;
    }

    try {
      if (!db) {
        throw new Error("Firebase no está configurado.");
      }

      if (role !== "docente" && role !== "admin") {
        throw new Error("No tienes permisos para crear reportes.");
      }
      const reporteRef = await addDoc(collection(db, "reports"), {
        folio: nextFolio,
        category,
        priority,
        salon: salon.trim(),
        elemento: elemento.trim(),
        description: description.trim(),
        status: "Pendiente",
        reportedBy,
        reportedByUid: user.uid,
        role,
        createdAt: serverTimestamp(),
      });

      console.log("Reporte creado correctamente:", reporteRef.id);

      setSent(true);
      setTimeout(onBack, 1500);
    } catch (err) {
      console.error("Error al enviar el reporte:", err);

      const mensaje =
        err instanceof Error
          ? err.message
          : "Ocurrió un error inesperado.";

      alert(`No se pudo enviar el reporte: ${mensaje}`);
    } finally {
      setSending(false);
    }
  }

  // Pantalla de confirmación.
  if (sent) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white gap-4">
        <div className="text-5xl">✅</div>
        <p className="text-[#0B1942] font-extrabold text-lg">
          ¡Reporte enviado!
        </p>
        <p className="text-gray-400 text-sm">
          Volviendo al inicio...
        </p>
      </div>
    );
  }

  return (
    <>
      <NavHeader
        title={
          role === "admin"
            ? "Administracion"
            : role === "tecnico"
              ? "Tecnico"
              : "Docente"
        }
      />

      <div className="flex-1 overflow-y-auto bg-[#f3f6fb] px-5 py-6 scrollbar-hide">
        <div className="flex h-full flex-col justify-center">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] space-y-5">
            <h2 className="text-[#0B1942] text-base font-extrabold">
              ¿Dónde está el problema?
            </h2>

            <div className="grid grid-cols-2 gap-3">
              {/* SELECTOR VISUAL DE SALÓN / ÁREA */}
              <div>
                <label className="text-[#0B1942] text-xs font-bold mb-1 block">
                  Salón/Área:
                </label>

                <button
                  type="button"
                  aria-haspopup="dialog"
                  aria-expanded={locationOpen}
                  onClick={() => {
                    setLocationTab("aulas");
                    setLocationOpen(true);
                  }}
                  className={`w-full min-h-[44px] flex items-center justify-between gap-2 border rounded-xl px-3 py-2.5 text-sm text-left transition active:scale-[0.98] ${
                    salon
                      ? "border-[#00B8C8] bg-white text-[#0B1942] font-semibold"
                      : "border-slate-200 bg-slate-50 text-slate-400"
                  }`}
                >
                  <span className="truncate">
                    {salon || "Selecciona un aula o área"}
                  </span>

                  <span className="text-[#00B8C8] shrink-0">
                    ▼
                  </span>
                </button>
              </div>

              {/* ELEMENTO ESPECÍFICO */}
              <div>
                <label className="text-[#0B1942] text-xs font-bold mb-1 block">
                  Elemento específico:
                </label>

                <div className="relative">
                  <select
                    value={elemento}
                    onChange={(e) => {
                      setElemento(e.target.value);
                      setCategory(e.target.value as Category);
                    }}
                    disabled={isLockedByCategory}
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm appearance-none focus:outline-none transition pr-7 ${
                      isLockedByCategory
                        ? "border-slate-300 bg-slate-200 text-slate-600 cursor-not-allowed"
                        : "border-slate-200 bg-white text-slate-700 focus:border-[#00B8C8]"
                    }`}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">
                    ▼
                  </span>
                </div>
              </div>
            </div>

            {/* DESCRIPCIÓN */}
            <div>
              <label className="text-[#0B1942] text-xs font-bold mb-1 block">
                Descripción del problema:
              </label>

              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Agrega una descripción corta del problema"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-slate-50 resize-none focus:outline-none focus:border-[#00B8C8] transition"
              />
            </div>

            {/* PRIORIDAD */}
            <div>
              <label className="text-[#0B1942] text-xs font-bold mb-1 block">
                Prioridad percibida:
              </label>

              <div className="flex gap-2">
                {(["Urgente", "Media", "Baja"] as Priority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex-1 py-2 rounded-full text-xs font-extrabold border transition-all ${
                      priority === p
                        ? p === "Urgente"
                          ? "bg-red-500 text-white border-red-500"
                          : p === "Media"
                            ? "bg-amber-400 text-white border-amber-400"
                            : "bg-green-500 text-white border-green-500"
                        : "border-slate-200 text-slate-500 bg-white"
                    }`}
                  >
                    {PRIORITY_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>

            {/* OPCIONAL: TOMAR FOTO */}
            <div>
              <p className="text-[#0B1942] text-xs font-bold mb-2">
                Opcional:
              </p>

              <button
                type="button"
                className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-200"
              >
                + Tomar foto
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* BOTONES INFERIORES */}
      <form
        id="nueva-falla-form"
        onSubmit={handleSubmit}
        className="flex gap-3 px-5 py-3 bg-white border-t border-slate-100 flex-none"
      >
        <button
          type="button"
          onClick={onBack}
          className="flex-1 border border-slate-300 text-slate-600 font-bold py-2.5 rounded-full text-sm hover:bg-slate-50 transition"
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={sending}
          className="flex-1 bg-[#00B8C8] text-white font-extrabold py-2.5 rounded-full text-sm hover:bg-[#009EAC] active:scale-95 transition-all shadow disabled:opacity-60"
        >
          {sending ? "Enviando..." : "Enviar Reporte"}
        </button>
      </form>

      {/* BOTTOM SHEET DE UBICACIONES */}
      {locationOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50"
          onClick={() => setLocationOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Seleccionar salón o área"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[85vh] overflow-y-auto overscroll-contain rounded-t-[28px] bg-white shadow-2xl animate-in slide-in-from-bottom duration-200"
            style={{
              paddingBottom: "max(20px, env(safe-area-inset-bottom))",
            }}
          >
            {/* INDICADOR SUPERIOR */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1.5 rounded-full bg-slate-300" />
            </div>

            {/* ENCABEZADO */}
            <div className="flex items-center justify-between px-5 pt-2 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-[#0B1942]">
                  Selecciona la ubicación
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  ¿Dónde se encuentra el problema?
                </p>
              </div>

              <button
                type="button"
                aria-label="Cerrar selector"
                onClick={() => setLocationOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 text-lg active:scale-95"
              >
                ✕
              </button>
            </div>

            {/* PESTAÑAS */}
            <div className="flex gap-2 px-5 pb-5">
              {[
                { id: "aulas", label: "Aulas" },
                { id: "areas", label: "Talleres y Áreas" },
                { id: "otro", label: "Otro" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setLocationTab(tab.id as LocationTab)}
                  className={`flex-1 min-h-[42px] px-2 rounded-full text-xs font-extrabold transition-all ${
                    locationTab === tab.id
                      ? "bg-[#0B1942] text-white shadow-md"
                      : "bg-slate-100 text-slate-500 active:bg-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* CONTENIDO: AULAS */}
            {locationTab === "aulas" && (
              <div className="px-5 pb-5">
                <p className="text-xs font-bold text-slate-500 mb-3">
                  SELECCIONA UN AULA
                </p>

                <div className="grid grid-cols-4 gap-2.5">
                  {AULAS.map((aula) => (
                    <button
                      key={aula}
                      type="button"
                      onClick={() => selectLocation(aula)}
                      className={`min-h-[58px] rounded-xl border text-xs font-extrabold transition-all active:scale-95 ${
                        salon === aula
                          ? "bg-[#0B1942] border-[#0B1942] text-white"
                          : "bg-slate-50 border-slate-200 text-[#0B1942] active:bg-[#E6FAFC] active:border-[#00B8C8]"
                      }`}
                    >
                      {aula}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* CONTENIDO: TALLERES Y ÁREAS */}
            {locationTab === "areas" && (
              <div className="px-5 pb-5">
                <p className="text-xs font-bold text-slate-500 mb-3">
                  SELECCIONA UN TALLER O ÁREA
                </p>

                <div className="grid grid-cols-2 gap-2.5">
                  {AREAS.map((area) => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => selectLocation(area)}
                      className={`min-h-[58px] rounded-xl border px-3 py-3 text-xs font-bold text-center transition-all active:scale-[0.98] ${
                        salon === area
                          ? "bg-[#0B1942] border-[#0B1942] text-white"
                          : "bg-slate-50 border-slate-200 text-[#0B1942] active:bg-[#E6FAFC] active:border-[#00B8C8]"
                      }`}
                    >
                      {area}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* CONTENIDO: OTRO */}
            {locationTab === "otro" && (
              <div className="px-5 pb-5">
                <label className="block text-sm font-bold text-[#0B1942] mb-2">
                  Especifica la ubicación:
                </label>

                <textarea
                  value={otherLocation}
                  onChange={(e) => setOtherLocation(e.target.value)}
                  rows={3}
                  placeholder="Especifica el área (ej. Pasillo frente a cafetería)"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 resize-none focus:outline-none focus:border-[#00B8C8] focus:ring-2 focus:ring-[#00B8C8]/20"
                />

                <button
                  type="button"
                  onClick={confirmOtherLocation}
                  disabled={!otherLocation.trim()}
                  className="w-full mt-4 min-h-[48px] rounded-full bg-[#00B8C8] text-white font-extrabold text-sm shadow-md transition active:scale-[0.98] disabled:opacity-40"
                >
                  Confirmar ubicación
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
