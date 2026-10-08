import { useState } from "react";
import { User } from "firebase/auth";
import { NavHeader } from "@/components/layout/NavHeader";
import { TabBar } from "@/components/layout/TabBar";
import { CATEGORIES, CAT_ICON, PRIORITY_DOT, STATUS_BADGE } from "@/constants";
import type { Category, Report, Role, Tab } from "@/types";

export function HomeScreen({
  user, role, reports, onNewReport, onTab, tab, onCancelReport,
}: {
  user: User; role: Role; reports: Report[];
  onNewReport: (cat?: Category) => void;
  onCancelReport?: (id: string) => void;
  onTab: (t: Tab) => void; tab: Tab;
}) {
  const myReports = reports.filter((r) => r.reportedByUid === user.uid && r.status !== "Cancelado").slice(0, 3);
  const [openReport, setOpenReport] = useState<string | null>(null);
  const [confirmReport, setConfirmReport] = useState<string | null>(null);

  return (
    <>
      <NavHeader title="Docente" />
      <div className="flex-1 overflow-y-auto bg-[#f4f6fb] scrollbar-hide">
        <div className="px-4 pt-5 pb-4 space-y-4">
          <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <h2 className="text-[#0e1f4d] text-lg font-extrabold leading-snug mb-3">
              ¿Qué problema desea reportar hoy?
            </h2>

            <button
              onClick={() => onNewReport()}
              className="w-full bg-[#17c3ce] text-white font-extrabold py-3 rounded-full text-sm shadow-md hover:bg-[#12a8b3] active:scale-95 transition-all"
            >
              Reportar nueva falla
            </button>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <h3 className="text-[#0e1f4d] text-sm font-extrabold mb-3">Selección rápida por categoría</h3>
            <div className="grid grid-cols-3 gap-3">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => onNewReport(cat)}
                  className="bg-[#f8fafc] rounded-2xl p-3 flex flex-col items-center gap-1.5 shadow-sm hover:shadow-md active:scale-95 transition-all border border-gray-100"
                >
                  <span className="text-2xl">{CAT_ICON[cat]}</span>
                  <span className="text-[10px] text-[#0e1f4d] font-bold text-center leading-tight">{cat}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <h3 className="text-[#0e1f4d] text-sm font-extrabold mb-3">Mis reportes recientes</h3>
            {myReports.length === 0 ? (
              <p className="text-gray-400 text-xs text-center py-4">Sin reportes aún</p>
            ) : (
              <div className="space-y-2">
                {myReports.map((r) => (
                  <div key={r.id} className="bg-[#f8fafc] rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm border border-gray-100">
                    <span className={`w-2.5 h-2.5 rounded-full flex-none ${PRIORITY_DOT[r.priority]}`} />
                    <span className="flex-1 text-xs text-[#0e1f4d] font-semibold leading-snug">{r.elemento} · {r.salon}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-none ${STATUS_BADGE[r.status]}`}>
                        {r.status}
                      </span>
                      {r.status !== "Resuelto" && r.status !== "Cancelado" && onCancelReport && (
                        <div className="relative">
                          <button
                            type="button"
                            aria-label={`Opciones de ${r.description}`}
                            onClick={() => setOpenReport(openReport === r.id ? null : r.id)}
                            className="w-7 h-7 rounded-lg text-slate-400 text-sm font-extrabold leading-none hover:bg-slate-200 transition"
                          >
                            ...
                          </button>
                          {openReport === r.id && (
                            <div className="absolute right-0 top-8 z-10 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                              <button
                                type="button"
                                onClick={() => { setOpenReport(null); setConfirmReport(r.id); }}
                                className="whitespace-nowrap rounded-lg px-3 py-2 text-xs font-extrabold text-red-600 hover:bg-red-50"
                              >
                                Cancelar reporte
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
      <TabBar active={tab} onChange={onTab} />
      {confirmReport && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0e1f4d]/30 p-5">
          <div className="w-full rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-[#0e1f4d] text-base font-extrabold">¿Cancelar este reporte?</h3>
            <p className="text-slate-500 text-xs mt-2">Esta acción retirará el reporte de tu lista.</p>
            <div className="grid grid-cols-2 gap-2 mt-5">
              <button type="button" onClick={() => setConfirmReport(null)} className="rounded-xl border border-slate-200 py-2.5 text-xs font-extrabold text-slate-600 hover:bg-slate-50">Volver</button>
              <button type="button" onClick={() => { onCancelReport?.(confirmReport); setConfirmReport(null); }} className="rounded-xl bg-red-600 py-2.5 text-xs font-extrabold text-white hover:bg-red-700">Cancelar reporte</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
