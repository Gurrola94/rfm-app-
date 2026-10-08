import { Timestamp } from "firebase/firestore";
import { NavHeader } from "@/components/layout/NavHeader";
import { TabBar } from "@/components/layout/TabBar";
import { PRIORITY_BADGE, PRIORITY_DOT, PRIORITY_LABELS, STATUS_BADGE } from "@/constants";
import type { MaterialRequest, Report, Role, Tab } from "@/types";
import { formatDateTime } from "@/utils/format";

export function HistorialScreen({ reports, materialRequests, role, onDetail, onTab, tab }: { reports: Report[]; materialRequests: MaterialRequest[]; role: Role; onDetail: (id: string) => void; onTab: (t: Tab) => void; tab: Tab }) {
  const currentDate = new Date();
  const monthName = currentDate.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  const isCurrentMonth = (timestamp: Timestamp | null) => {
    if (!timestamp) return true;
    const date = timestamp.toDate();
    return date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();
  };
  const visibleReports = reports.filter((report) => report.status === "Resuelto");
  const monthlyReports = visibleReports.filter((report) => isCurrentMonth(report.createdAt));
  const monthlyPurchases = materialRequests.filter((request) => request.status === "Aprobada" && request.tipo !== "apoyo_externo" && isCurrentMonth(request.createdAt));
  const totalExpenses = monthlyPurchases.reduce((total, request) => total + (request.estimatedCost ?? 0), 0);

  return (
    <>
      <NavHeader title={role === "admin" ? "Administracion" : role === "tecnico" ? "Tecnico" : "Docente"} />
      <div className="flex-1 overflow-y-auto bg-[#f4f6fb] px-4 pt-5 pb-4 scrollbar-hide">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-[#0e1f4d] text-base font-extrabold">Historial de reportes</h2>
          {role === "admin" && (
            <button type="button" className="rounded-xl bg-emerald-600 px-3 py-2 text-[11px] font-extrabold text-white hover:bg-emerald-500 transition flex items-center gap-1.5 shadow-sm">
              <span aria-hidden="true">↓</span> Descargar excel
            </button>
          )}
        </div>
        <div className="space-y-2">
          {visibleReports.map((r) => (
            <button key={r.id} type="button" onClick={() => onDetail(r.id)} className="w-full text-left bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 hover:border-[#17c3ce]/50 transition">
              <div className="flex items-start gap-3">
                <span className={`w-3 h-3 rounded-full flex-none mt-0.5 ${PRIORITY_DOT[r.priority]}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-extrabold ${PRIORITY_BADGE[r.priority]}`}>{PRIORITY_LABELS[r.priority]}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[r.status]}`}>{r.status}</span>
                  </div>
                  <p className="text-[#0e1f4d] text-sm font-semibold mt-0.5 leading-snug">{r.elemento} · {r.salon}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{formatDateTime(r.createdAt)}</p>
                </div>
              </div>
            </button>
          ))}
          {visibleReports.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">Sin reportes registrados</div>
          )}
        </div>
      </div>
      <TabBar active={tab} onChange={onTab} admin={role === "admin"} />
    </>
  );
}
