import { useState } from "react";
import { NavHeader } from "@/components/layout/NavHeader";
import { TabBar } from "@/components/layout/TabBar";
import { PRIORITY_DOT, STATUS_BADGE } from "@/constants";
import type { Category, MaterialRequest, Report, Tab } from "@/types";
import { timeAgo } from "@/utils/format";

export function AdminScreen({
  reports, requests, onTab, tab, onOpenFailures, onOpenMaterials, onOpenApoyos, onOpenReport, onNewReport, onCancelReport, onAddSpace, spaces,
}: {
  reports: Report[];
  requests: MaterialRequest[];
  onTab: (t: Tab) => void;
  tab: Tab;
  onOpenFailures: () => void;
  onOpenMaterials: () => void;
  onOpenApoyos: () => void;
  onOpenReport: (id: string) => void;
  onNewReport: (cat?: Category) => void;
  onCancelReport: (id: string) => void;
  onAddSpace: (name: string) => void;
  spaces: string[];
}) {
  const [newSpace, setNewSpace] = useState("");
  const incomingReports = reports.filter((r) => r.role !== "admin" && r.status !== "Resuelto" && r.status !== "Cancelado").slice(0, 5);
  const activeFailures = reports.filter((report) => report.status !== "Resuelto" && report.status !== "Cancelado").length;
  const pendingRequests = requests.filter((request) => request.status === "Pendiente de aprobación" && request.tipo !== "apoyo_externo");
  const pendingApoyos = requests.filter((request) => request.status === "Pendiente de aprobación" && request.tipo === "apoyo_externo");
  const [openReport, setOpenReport] = useState<string | null>(null);
  const [confirmReport, setConfirmReport] = useState<string | null>(null);
  const adminReports = reports.filter((report) => report.role === "admin" && report.status !== "Cancelado").slice(0, 3);

  return (
    <>
      <NavHeader title="Administracion" />
      <div className="flex-1 overflow-y-auto bg-[#f4f6fb] px-4 py-5 scrollbar-hide">
        <div className="mb-5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#17c3ce]">Panel de control</p>
          <h1 className="text-[#0e1f4d] text-xl font-extrabold mt-1">Resumen operativo</h1>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <button onClick={onOpenFailures} className="text-left rounded-2xl bg-[#0e1f4d] p-4 text-white shadow-sm hover:bg-[#172b62] transition">
            <p className="text-3xl font-extrabold">{activeFailures}</p>
            <p className="text-xs font-bold text-white/70 mt-1">Fallas activas</p>
          </button>
          <button onClick={onOpenMaterials} className="text-left rounded-2xl bg-amber-50 border border-amber-200 p-4 text-amber-900 hover:bg-amber-100 transition">
            <p className="text-3xl font-extrabold">{pendingRequests.length}</p>
            <p className="text-xs font-bold text-amber-700 mt-1">Material pendiente</p>
          </button>
          <button onClick={onOpenApoyos} className="col-span-2 text-left rounded-2xl bg-purple-50 border border-purple-200 p-4 text-purple-900 hover:bg-purple-100 transition">
            <p className="text-3xl font-extrabold">{pendingApoyos.length}</p>
            <p className="text-xs font-bold text-purple-700 mt-1">Apoyo externo pendiente</p>
          </button>
        </div>

        <div className="space-y-4">
          <section className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
            <h3 className="text-[#0e1f4d] text-sm font-extrabold mb-3">Reportes recibidos</h3>
            {incomingReports.length === 0 ? (
              <p className="text-gray-400 text-xs text-center py-4">Sin reportes nuevos</p>
            ) : (
              <div className="space-y-2">
                {incomingReports.map((r) => (
                  <button key={r.id} type="button" onClick={() => onOpenReport(r.id)} className="w-full text-left bg-[#f8fafc] rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm border border-gray-100 hover:border-[#17c3ce]/50 transition">
                    <span className={`w-2.5 h-2.5 rounded-full flex-none ${PRIORITY_DOT[r.priority]}`} />
                    <span className="flex-1 min-w-0">
                      <span className="block truncate text-xs text-[#0e1f4d] font-semibold">{r.elemento} · {r.salon}</span>
                      <span className="block text-[10px] text-gray-400">{r.reportedBy} · {timeAgo(r.createdAt)}</span>
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-none ${STATUS_BADGE[r.status]}`}>{r.status}</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
            <h2 className="text-[#0e1f4d] text-lg font-extrabold leading-snug mb-3">¿Qué problema desea reportar hoy?</h2>
            <button onClick={() => onNewReport()} className="w-full bg-[#17c3ce] text-white font-extrabold py-3 rounded-full text-sm hover:bg-[#12a8b3] transition-all">Reportar nueva falla</button>
          </section>

          <section className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
            <h3 className="text-[#0e1f4d] text-sm font-extrabold mb-3">Mis reportes recientes</h3>
            {adminReports.length === 0 ? (
              <p className="text-gray-400 text-xs text-center py-4">Sin reportes aún</p>
            ) : (
              <div className="space-y-2">
                {adminReports.map((report) => (
                  <div key={report.id}>
                    <div className="bg-[#f8fafc] rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm border border-gray-100">
                      <span className={`w-2.5 h-2.5 rounded-full flex-none ${PRIORITY_DOT[report.priority]}`} />
                      <span className="flex-1 min-w-0 truncate text-xs text-[#0e1f4d] font-semibold">{report.elemento} · {report.salon}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-none ${STATUS_BADGE[report.status]}`}>{report.status}</span>
                      {report.status !== "Resuelto" && (
                        <div className="relative">
                          <button type="button" aria-label={`Opciones de ${report.elemento}`} onClick={() => setOpenReport(openReport === report.id ? null : report.id)} className="w-7 h-7 rounded-lg text-slate-400 text-sm font-extrabold leading-none hover:bg-slate-200 transition">...</button>
                          {openReport === report.id && (
                            <div className="absolute right-0 top-8 z-10 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                              <button type="button" onClick={() => { setOpenReport(null); setConfirmReport(report.id); }} className="whitespace-nowrap rounded-lg px-3 py-2 text-xs font-extrabold text-red-600 hover:bg-red-50">Cancelar reporte</button>
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

          <section className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
            <h3 className="text-[#0e1f4d] text-sm font-extrabold mb-3">Agregar espacio</h3>
            <div className="flex gap-2">
              <input value={newSpace} onChange={(e) => setNewSpace(e.target.value)} placeholder="Ej. Biblioteca" className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#17c3ce]" />
              <button type="button" onClick={() => { onAddSpace(newSpace); setNewSpace(""); }} className="rounded-xl bg-[#17c3ce] px-4 py-2.5 text-xs font-extrabold text-white hover:bg-[#12a8b3] transition">Agregar</button>
            </div>
            {spaces.length > 0 && <p className="text-slate-400 text-[10px] font-bold mt-3">Agregados: {spaces.join(", ")}</p>}
          </section>
        </div>
      </div>
      <TabBar active={tab} onChange={onTab} admin />
      {confirmReport && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0e1f4d]/30 p-5">
          <div className="w-full rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-[#0e1f4d] text-base font-extrabold">¿Cancelar este reporte?</h3>
            <p className="text-slate-500 text-xs mt-2">Esta acción retirará el reporte de tu lista.</p>
            <div className="grid grid-cols-2 gap-2 mt-5">
              <button type="button" onClick={() => setConfirmReport(null)} className="rounded-xl border border-slate-200 py-2.5 text-xs font-extrabold text-slate-600 hover:bg-slate-50">Volver</button>
              <button type="button" onClick={() => { onCancelReport(confirmReport); setConfirmReport(null); }} className="rounded-xl bg-red-600 py-2.5 text-xs font-extrabold text-white hover:bg-red-700">Cancelar reporte</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
