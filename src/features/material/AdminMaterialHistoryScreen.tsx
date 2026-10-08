import { useState } from "react";
import { NavHeader } from "@/components/layout/NavHeader";
import { TabBar } from "@/components/layout/TabBar";
import type { MaterialRequest, Tab } from "@/types";
import { formatDateTime } from "@/utils/format";

export function AdminMaterialHistoryScreen({ requests, onTab, tab }: {
  requests: MaterialRequest[];
  onTab: (t: Tab) => void;
  tab: Tab;
}) {
  const [statusFilter, setStatusFilter] = useState<"Todas" | "Aprobada" | "Rechazada">("Todas");
  const [dateFilter, setDateFilter] = useState("");
  const history = requests.filter((request) => request.status === "Aprobada" || request.status === "Rechazada");
  const filteredRequests = history.filter((request) => {
    const matchesStatus = statusFilter === "Todas" || request.status === statusFilter;
    const requestDate = request.createdAt?.toDate();
    const requestDateKey = requestDate
      ? `${requestDate.getFullYear()}-${String(requestDate.getMonth() + 1).padStart(2, "0")}-${String(requestDate.getDate()).padStart(2, "0")}`
      : "";
    return matchesStatus && (!dateFilter || requestDateKey === dateFilter);
  });

  return (
    <>
      <NavHeader title="Administracion" />
      <div className="flex-1 overflow-y-auto bg-[#f4f6fb] px-4 py-5 scrollbar-hide">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#17c3ce]">Finanzas / Administración</p>
        <h1 className="text-[#0e1f4d] text-xl font-extrabold mt-1 mb-5">Historial de materiales</h1>

        <div className="mb-4 rounded-2xl bg-white border border-slate-200 p-3 space-y-3">
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
            {(["Todas", "Aprobada", "Rechazada"] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-lg py-2 text-[10px] font-extrabold transition ${statusFilter === status ? "bg-white text-[#0e1f4d] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                {status === "Todas" ? "Todos" : status === "Aprobada" ? "Aprobado" : "Rechazado"}
              </button>
            ))}
          </div>
          <label className="block">
            <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-500">Filtrar por fecha</span>
            <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#17c3ce]" />
          </label>
          {dateFilter && <button type="button" onClick={() => setDateFilter("")} className="text-xs font-bold text-[#0e1f4d] underline">Limpiar fecha</button>}
        </div>

        <div className="space-y-3">
          {filteredRequests.map((request) => (
            <div key={request.id} className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {request.tipo === "apoyo_externo" && <span className="inline-block mb-1 text-[10px] font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">Apoyo externo</span>}
                  <p className="text-[#0e1f4d] text-sm font-extrabold leading-snug">{request.material}</p>
                  <p className="text-slate-500 text-xs mt-1 leading-snug">{request.observation}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-extrabold ${request.status === "Aprobada" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                  {request.status}
                </span>
              </div>
              {request.tipo !== "apoyo_externo" && <p className="text-emerald-700 text-xs font-extrabold mt-3">Costo aproximado: ${(request.estimatedCost ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>}
              <p className="text-slate-400 text-[10px] font-bold mt-2">Solicitado por {request.requestedBy} · {formatDateTime(request.createdAt)}</p>
            </div>
          ))}
          {filteredRequests.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 py-12 text-center text-sm text-slate-400">No hay materiales para estos filtros</div>}
        </div>
      </div>
      <TabBar active={tab} onChange={onTab} admin />
    </>
  );
}
