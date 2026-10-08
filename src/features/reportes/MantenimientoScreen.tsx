import { NavHeader } from "@/components/layout/NavHeader";
import { TabBar } from "@/components/layout/TabBar";
import { CAT_ICON, PRIORITY_BADGE, PRIORITY_DOT, PRIORITY_LABELS, STATUS_BADGE } from "@/constants";
import type { Report, Tab } from "@/types";
import { formatDateTime } from "@/utils/format";

export function MantenimientoScreen({
  reports, onDetail, onTab, tab, readOnly = false, title = "Mantenimiento", admin = false,
}: {
  reports: Report[]; onDetail: (id: string) => void; onTab: (t: Tab) => void; tab: Tab;
  readOnly?: boolean; title?: string; admin?: boolean;
}) {
  const pending = reports.filter((r) => r.status !== "Resuelto" && r.status !== "Cancelado");

  return (
    <>
      <NavHeader title={title} />
      <div className="flex-1 overflow-y-auto bg-[#f4f6fb] px-4 pt-5 pb-4 scrollbar-hide">
        <h2 className="text-[#0e1f4d] text-base font-extrabold mb-3">
          Reportes pendientes ({pending.length})
        </h2>
        <div className="space-y-3">
          {pending.map((r) => (
            <div
              key={r.id}
              className={`bg-white rounded-2xl p-4 shadow-sm border-l-4 ${
                r.priority === "Urgente" ? "border-red-500" : r.priority === "Media" ? "border-amber-400" : "border-green-500"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2.5 h-2.5 rounded-full flex-none ${PRIORITY_DOT[r.priority]}`} />
                <span className={`text-xs font-extrabold ${PRIORITY_BADGE[r.priority]}`}>{PRIORITY_LABELS[r.priority]}</span>
              </div>
              <p className="text-[#0e1f4d] text-sm font-extrabold leading-snug mb-0.5">{CAT_ICON[r.category]} {r.elemento} · {r.salon}</p>
              <p className="text-gray-400 text-xs">{formatDateTime(r.createdAt)} | {r.reportedBy}</p>
              {r.horarioInicio && <p className="text-gray-400 text-xs mt-0.5">Horario para reparar: {r.horarioInicio} – {r.horarioFin}</p>}
              <p className="mt-1.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[r.status]}`}>{r.status}</span>
                {r.status === "Pendiente" && r.motivoPendiente && <span className="text-[11px] text-slate-500 ml-2">Pausado: {r.motivoPendiente}</span>}
              </p>
              {(!readOnly || admin) && <div className="flex gap-2 mt-3 flex-wrap">
                <button onClick={() => onDetail(r.id)} className="text-xs font-bold text-[#0e1f4d] border border-gray-200 px-3 py-1.5 rounded-full hover:bg-gray-50 transition">
                  Ver detalles
                </button>
                {!readOnly && <button className="text-xs font-bold text-[#17c3ce] border border-[#17c3ce]/30 px-3 py-1.5 rounded-full hover:bg-[#17c3ce]/10 transition">
                  Notificar arreglo 🔔
                </button>}
              </div>}
            </div>
          ))}
          {pending.length === 0 && (
            <div className="text-center py-14 text-gray-400 text-sm">Sin reportes pendientes 🎉</div>
          )}
        </div>
      </div>
      <TabBar active={tab} onChange={onTab} admin={admin} />
    </>
  );
}
