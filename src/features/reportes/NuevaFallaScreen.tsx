
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
import { takePhoto } from "@/utils/image";

export function NuevaFallaScreen({
  user,
  role,
  preCategory,
  onBack,
  demoMode,
  onDemoAdd,
  areas,
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
  const [horarioInicio, setHorarioInicio] = useState("");
  const [horarioFin, setHorarioFin] = useState("");
  const [foto, setFoto] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Actualiza la categoría cuando se selecciona una categoría previa.
  useEffect(() => {
    if (preCategory) {
      setCategory(preCategory);
      setElemento(preCategory);
    }
  }, [preCategory]);

  // Envía el reporte a Firestore o al modo de demostración.
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Evita envíos duplicados mientras se procesa la solicitud.
    if (sending) return;

    // Comprueba los campos obligatorios.
    if (
      !salon.trim() ||
      !elemento.trim() ||
      !description.trim() ||
      !horarioInicio ||
      !horarioFin
    ) {
      alert("Completa todos los campos obligatorios.");
      return;
    }

    setSending(true);

    const reportedBy =
      user.displayName || user.email?.split("@")[0] || "Usuario";

    // Modo de demostración: conserva el funcionamiento anterior.
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
          horarioInicio,
          horarioFin,
          ...(foto ? { foto } : {}),
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
      // Verifica que Firebase esté configurado.
      if (!db) {
        throw new Error("Firebase no está configurado.");
      }

      // Solo los docentes pueden crear reportes.
      if (role !== "docente") {
        throw new Error("Solo los docentes pueden crear reportes.");
      }

      // Crea el documento directamente en Firestore.
      const reporteRef = await addDoc(collection(db, "reports"), {
        folio: nextFolio,
        category,
        priority,
        salon: salon.trim(),
        elemento: elemento.trim(),
        description: description.trim(),
        horarioInicio,
        horarioFin,
        ...(foto ? { foto } : {}),
        status: "Pendiente",
        reportedBy,
        reportedByUid: user.uid,
        role: "docente",
        createdAt: serverTimestamp(),
      });

      // Muestra el identificador del reporte creado.
      console.log("Reporte creado correctamente:", reporteRef.id);

      // Muestra la confirmación y regresa a la pantalla anterior.
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

  // Abre la cámara (o la galería) para adjuntar una foto al reporte.
  async function handleTomarFoto() {
    try {
      const f = await takePhoto("prompt");
      if (f) setFoto(f);
    } catch (err) {
      console.error(err);
      alert("No se pudo abrir la cámara.");
    }
  }

  // Pantalla de confirmación después de enviar el reporte.
  if (sent) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white gap-4">
        <div className="text-5xl">✅</div>
        <p className="text-[#0e1f4d] font-extrabold text-lg">
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
            <h2 className="text-[#0e1f4d] text-base font-extrabold">
              ¿Dónde está el problema?
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[#0e1f4d] text-xs font-bold mb-1 block">
                  Salón/Área:
                </label>

                <div className="relative">
                  <select
                    required
                    form="nueva-falla-form"
                    value={salon}
                    onChange={(e) => setSalon(e.target.value)}
                    className="w-full appearance-none border border-slate-200 rounded-xl px-3 py-2.5 pr-8 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:border-[#17c3ce] transition"
                  >
                    <option value="" disabled>
                      Selecciona un aula o área
                    </option>

                    {areas.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>

                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">
                    ▼
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[#0e1f4d] text-xs font-bold mb-1 block">
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
                        : "border-slate-200 bg-white text-slate-700 focus:border-[#17c3ce]"
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

            <div>
              <label className="text-[#0e1f4d] text-xs font-bold mb-1 block">
                Descripción del problema:
              </label>

              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Agrega una descripción corta del problema"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-slate-50 resize-none focus:outline-none focus:border-[#17c3ce] transition"
              />
            </div>

            <div>
              <label className="text-[#0e1f4d] text-xs font-bold mb-1 block">
                Horario disponible para reparar:
              </label>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="time"
                  required
                  form="nueva-falla-form"
                  value={horarioInicio}
                  onChange={(e) => setHorarioInicio(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:border-[#17c3ce] transition"
                />

                <input
                  type="time"
                  required
                  form="nueva-falla-form"
                  value={horarioFin}
                  onChange={(e) => setHorarioFin(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:border-[#17c3ce] transition"
                />
              </div>
            </div>

            <div>
              <label className="text-[#0e1f4d] text-xs font-bold mb-1 block">
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

            <div>
              <label className="text-[#0e1f4d] text-xs font-bold mb-1 block">
                Fotografía (Opcional):
              </label>

              <button
                type="button"
                onClick={() => void handleTomarFoto()}
                className="bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-slate-200 transition"
              >
                {foto ? "Foto lista · toca para cambiarla" : "+ Tomar foto"}
              </button>
              {foto && <img src={foto} alt="Foto del reporte" className="mt-2 h-24 w-24 rounded-xl object-cover" />}
            </div>
          </div>
        </div>
      </div>

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
          className="flex-1 bg-[#17c3ce] text-white font-extrabold py-2.5 rounded-full text-sm hover:bg-[#12a8b3] active:scale-95 transition-all shadow disabled:opacity-60"
        >
          {sending ? "Enviando..." : "Enviar Reporte"}
        </button>
      </form>
    </>
  );
}
