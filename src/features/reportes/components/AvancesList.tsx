import { STATUS_BADGE } from "@/constants";
import type { Report } from "@/types";
import { formatDateTime } from "@/utils/format";

export function AvancesList({ report }: { report: Report }) {
  const avances = report.avances ?? [];
  if (avances.length === 0) {
    return <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">{report.notasAvance || report.acciones || "El técnico aún no registra avances."}</p>;
  }
  return (
    <div className="space-y-2">
      {[...avances].reverse().map((a, i) => (
        <div key={i} className="rounded-xl bg-slate-50 p-3 text-xs space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[a.estado]}`}>{a.estado === "Pendiente" ? "Pausado" : a.estado}</span>
            <span className="text-[10px] text-slate-400">{formatDateTime(a.fecha)}{a.por ? ` · ${a.por}` : ""}</span>
          </div>
          {a.motivo && <p><span className="font-bold text-slate-500">Motivo:</span> <span className="text-[#0e1f4d]">{a.motivo}</span></p>}
          <p className="text-[#0e1f4d]">{a.notas}</p>
          {a.foto ? <img src={a.foto} alt="Evidencia del avance" className="w-full rounded-xl object-cover" /> : a.evidenciaNombre && <p className="text-slate-400">Evidencia: {a.evidenciaNombre}</p>}
        </div>
      ))}
    </div>
  );
}
