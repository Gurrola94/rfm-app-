import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { collection, doc, serverTimestamp, Timestamp, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { NavHeader } from "@/components/layout/NavHeader";
import { CATEGORIES, PRIORITY_LABELS } from "@/constants";
import type { Category, Priority, Report, Role, Status } from "@/types";

export function NuevaFallaScreen({
  user, role, preCategory, onBack, demoMode, onDemoAdd, areas, nextFolio,
}: {
  user: User; role: Role; preCategory?: Category; onBack: () => void;
  demoMode?: boolean; onDemoAdd?: (r: Report) => void;
  areas: string[]; nextFolio: string;
}) {
  const isLockedByCategory = Boolean(preCategory);
  const [salon, setSalon] = useState("");
  const [elemento, setElemento] = useState<string>(preCategory ?? "Minisplit/Clima");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("Media");
  const [category, setCategory] = useState<Category>(preCategory ?? "Minisplit/Clima");
  const [horarioInicio, setHorarioInicio] = useState("");
  const [horarioFin, setHorarioFin] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (preCategory) {
      setCategory(preCategory);
      setElemento(preCategory);
    }
  }, [preCategory]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    const reportedBy = user.displayName || user.email?.split("@")[0] || "Usuario";
    if (demoMode) {
      onDemoAdd?.({
        id: `demo-${Date.now()}`,
        folio: nextFolio,
        category, priority, salon, elemento, description,
        horarioInicio, horarioFin,
        status: "Pendiente",
        reportedBy,
        reportedByUid: user.uid ?? "demo",
        role,
        createdAt: Timestamp.now(),
      });
      setSent(true);
      setSending(false);
      setTimeout(onBack, 1500);
      return;
    }
    try {
      const reportRef = doc(collection(db!, "reports"));
      const counterRef = doc(db!, "counters", "reports");
      await runTransaction(db!, async (tx) => {
        const snap = await tx.get(counterRef);
        const next = (snap.exists() ? (snap.data().last as number) : 0) + 1;
        tx.set(counterRef, { last: next });
        tx.set(reportRef, {
          folio: String(next),
          category, priority, salon, elemento, description,
          horarioInicio, horarioFin,
          status: "Pendiente" as Status,
          reportedBy,
          reportedByUid: user.uid,
          role,
          createdAt: serverTimestamp(),
        });
      });
      setSent(true);
      setTimeout(onBack, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white gap-4">
        <div className="text-5xl">✅</div>
        <p className="text-[#0e1f4d] font-extrabold text-lg">¡Reporte enviado!</p>
        <p className="text-gray-400 text-sm">Volviendo al inicio...</p>
      </div>
    );
  }

  return (
    <>
      <NavHeader title={role === "admin" ? "Administracion" : role === "tecnico" ? "Tecnico" : "Docente"} />
      <div className="flex-1 overflow-y-auto bg-[#f3f6fb] px-5 py-6 scrollbar-hide">
        <div className="flex h-full flex-col justify-center">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] space-y-5">
            <h2 className="text-[#0e1f4d] text-base font-extrabold">¿Dónde está el problema?</h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[#0e1f4d] text-xs font-bold mb-1 block">Salón/Área:</label>
                <div className="relative">
                  <select
                    required
                    form="nueva-falla-form"
                    value={salon}
                    onChange={(e) => setSalon(e.target.value)}
                    className="w-full appearance-none border border-slate-200 rounded-xl px-3 py-2.5 pr-8 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:border-[#17c3ce] transition"
                  >
                    <option value="" disabled>Selecciona un aula o área</option>
                    {areas.map((area) => <option key={area} value={area}>{area}</option>)}
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">▼</span>
                </div>
              </div>
              <div>
                <label className="text-[#0e1f4d] text-xs font-bold mb-1 block">Elemento específico:</label>
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
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">▼</span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-[#0e1f4d] text-xs font-bold mb-1 block">Descripción del problema:</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Agrega una descripción corta del problema"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-slate-50 resize-none focus:outline-none focus:border-[#17c3ce] transition"
              />
            </div>

            <div>
              <label className="text-[#0e1f4d] text-xs font-bold mb-1 block">Horario disponible para reparar:</label>
              <div className="grid grid-cols-2 gap-3">
                <input type="time" required form="nueva-falla-form" value={horarioInicio} onChange={(e) => setHorarioInicio(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:border-[#17c3ce] transition" />
                <input type="time" required form="nueva-falla-form" value={horarioFin} onChange={(e) => setHorarioFin(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:border-[#17c3ce] transition" />
              </div>
            </div>

            <div>
              <label className="text-[#0e1f4d] text-xs font-bold mb-1 block">Prioridad percibida:</label>
              <div className="flex gap-2">
                {(["Urgente", "Media", "Baja"] as Priority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex-1 py-2 rounded-full text-xs font-extrabold border transition-all ${
                      priority === p
                        ? p === "Urgente" ? "bg-red-500 text-white border-red-500"
                          : p === "Media" ? "bg-amber-400 text-white border-amber-400"
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
              <label className="text-[#0e1f4d] text-xs font-bold mb-1 block">Fotografía (Opcional):</label>
              <button type="button" className="bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-slate-200 transition">
                + Tomar foto
              </button>
            </div>
          </div>
        </div>
      </div>

      <form id="nueva-falla-form" onSubmit={handleSubmit} className="flex gap-3 px-5 py-3 bg-white border-t border-slate-100 flex-none">
        <button type="button" onClick={onBack} className="flex-1 border border-slate-300 text-slate-600 font-bold py-2.5 rounded-full text-sm hover:bg-slate-50 transition">
          Cancelar
        </button>
        <button type="submit" disabled={sending} className="flex-1 bg-[#17c3ce] text-white font-extrabold py-2.5 rounded-full text-sm hover:bg-[#12a8b3] active:scale-95 transition-all shadow disabled:opacity-60">
          {sending ? "Enviando..." : "Enviar Reporte"}
        </button>
      </form>
    </>
  );
}
