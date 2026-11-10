import { NavHeader } from "@/components/layout/NavHeader";
import { TabBar } from "@/components/layout/TabBar";
import type { MaterialRequest, Tab } from "@/types";
import { timeAgo } from "@/utils/format";

export function AdminMaterialScreen({
  requests, onRequestStatus, onViewHistory, onTab, tab, kind = "material",
}: {
  requests: MaterialRequest[];
  onRequestStatus: (id: string, status: "Aprobada" | "Rechazada") => void;
  onViewHistory: () => void;
  onTab: (t: Tab) => void;
  tab: Tab;
  kind?: "material" | "apoyo_externo";
}) {
  const pendingRequests = requests.filter((request) =>
    request.status === "Pendiente de aprobación" && (kind === "apoyo_externo" ? request.tipo === "apoyo_externo" : request.tipo !== "apoyo_externo"));

  return (
    <>
      <NavHeader title="Administracion" />
      <div className="flex-1 overflow-y-auto bg-[#f4f6fb] px-4 py-5 scrollbar-hide">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#17c3ce]">Finanzas / Administración</p>
        <h1 className="text-[#0e1f4d] text-xl font-extrabold mt-1 mb-5">{kind === "apoyo_externo" ? "Apoyo externo pendiente" : "Material pendiente"}</h1>
        <div className="space-y-3">
          {pendingRequests.map((request) => (
            <div key={request.id} className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-lg flex-none">🧰</div>
                <div className="min-w-0 flex-1">
                  {request.tipo === "apoyo_externo" && <span className="inline-block mb-1 text-[10px] font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">Apoyo externo</span>}
                  <p className="text-[#0e1f4d] text-sm font-extrabold leading-snug">{request.material}</p>
                  <p className="text-slate-500 text-xs mt-1 leading-snug">{request.observation}</p>
                  {request.tipo !== "apoyo_externo" && <p className="text-emerald-700 text-xs font-extrabold mt-2">Costo aproximado: ${(request.estimatedCost ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>}
                  <p className="text-slate-400 text-[10px] font-bold mt-2">Solicitado por {request.requestedBy} · {timeAgo(request.createdAt)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <button onClick={() => onRequestStatus(request.id, "Rechazada")} className="rounded-xl border border-red-200 bg-red-50 py-2.5 text-xs font-extrabold text-red-600 hover:bg-red-100 transition">Rechazar</button>
                <button onClick={() => onRequestStatus(request.id, "Aprobada")} className="rounded-xl bg-[#17c3ce] py-2.5 text-xs font-extrabold text-white hover:bg-[#12a8b3] transition">{request.tipo === "apoyo_externo" ? "Autorizar apoyo" : "Aprobar compra"}</button>
              </div>
            </div>
          ))}
          {pendingRequests.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 py-12 text-center text-sm text-slate-400">No hay autorizaciones pendientes</div>}
        </div>
      </div>
      <div className="flex-none bg-white border-t border-slate-100 px-4 py-3">
        <button type="button" onClick={onViewHistory} className="w-full rounded-full border border-[#17c3ce] py-3 text-sm font-extrabold text-[#0e1f4d] hover:bg-[#17c3ce]/10 transition">
          Ver historial
        </button>
      </div>
      <TabBar active={tab} onChange={onTab} admin />
    </>
  );
}
