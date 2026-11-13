import { useState } from "react";
import { NavHeader } from "@/components/layout/NavHeader";
import { TabBar } from "@/components/layout/TabBar";
import { CAT_ICON, PRIORITY_BADGE, PRIORITY_LABELS, STATUS_BADGE } from "@/constants";
import type { Report, Tab } from "@/types";
import { formatDateTime } from "@/utils/format";

export function AdminMyReportsScreen({
  reports,
  currentUserId,
  onDetail,
  onCancelReport,
  onTab,
  tab,
}: {
  reports: Report[];
  currentUserId: string;
  onDetail: (id: string) => void;
  onCancelReport: (id: string) => Promise<void>;
  onTab: (tab: Tab) => void;
  tab: Tab;
}) {
  const [openReport, setOpenReport] = useState<string | null>(null);
  const [confirmReport, setConfirmReport] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  const adminReports = reports
    .filter((report) => report.role === "admin" && report.reportedByUid === currentUserId && report.status !== "Cancelado")
    .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));

  async function handleConfirmCancel() {
    if (!confirmReport || cancelling) return;
    setCancelling(true);
    setCancelError("");
    try {
      await onCancelReport(confirmReport);
      setConfirmReport(null);
    } catch (error) {
      console.error("Error al cancelar el reporte:", error);
      setCancelError("No se pudo cancelar el reporte. Inténtalo nuevamente.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <>
      <NavHeader title="Administracion" />
      <div className="flex-1 overflow-y-auto bg-[#f4f6fb] px-4 pt-5 pb-4 scrollbar-hide">
        <h1 className="mb-3 text-base font-extrabold text-[#0e1f4d]">Mis reportes</h1>
        <div className="space-y-2">
          {adminReports.map((report) => (
            <article
              key={report.id}
              className="relative rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-[#17c3ce]/60"
            >
              <button
                type="button"
                onClick={() => onDetail(report.id)}
                aria-label={`Ver reporte ${report.folio ?? report.elemento}`}
                className="w-full text-left"
              >
                <div className="mb-0.5 flex items-center justify-between gap-2 pr-8">
                  <span className={`text-xs font-extrabold ${PRIORITY_BADGE[report.priority]}`}>
                    {PRIORITY_LABELS[report.priority]}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_BADGE[report.status]}`}>
                    {report.status}
                  </span>
                </div>
                <p className="text-sm font-extrabold leading-snug text-[#0e1f4d]">
                  {CAT_ICON[report.category]} {report.elemento} · {report.salon}
                </p>
                <p className="mt-0.5 text-[11px] text-gray-400">
                  {report.folio ? `Folio ${report.folio} · ` : ""}
                  {formatDateTime(report.createdAt)}
                </p>
              </button>
              {report.status !== "Resuelto" && (
                <div className="absolute right-3 top-3">
                  <button
                    type="button"
                    aria-label={`Opciones del reporte ${report.folio ?? report.id}`}
                    aria-haspopup="menu"
                    aria-expanded={openReport === report.id}
                    onClick={() =>
                      setOpenReport((openId) => openId === report.id ? null : report.id)
                    }
                    className="h-7 w-7 rounded-lg text-xl font-extrabold leading-none text-slate-400 transition hover:bg-slate-100 hover:text-[#0e1f4d]"
                  >
                    ⋮
                  </button>
                  {openReport === report.id && (
                    <div
                      role="menu"
                      className="absolute right-0 top-8 z-10 min-w-36 rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setOpenReport(null);
                          setCancelError("");
                          setConfirmReport(report.id);
                        }}
                        className="w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-xs font-extrabold text-red-600 transition hover:bg-red-50"
                      >
                        Cancelar reporte
                      </button>
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
          {adminReports.length === 0 && (
            <p className="py-14 text-center text-sm text-gray-400">Sin reportes aún</p>
          )}
        </div>
      </div>
      <TabBar active={tab} onChange={onTab} admin />
      {confirmReport && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0e1f4d]/40 p-5">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cancel-admin-report-title"
            className="w-full rounded-2xl bg-white p-5 shadow-xl"
          >
            <h2 id="cancel-admin-report-title" className="text-base font-extrabold text-[#0e1f4d]">
              ¿Cancelar este reporte?
            </h2>
            <p className="mt-2 text-xs text-slate-500">
              Esta acción retirará el reporte de tu lista.
            </p>
            {cancelError && (
              <p role="alert" className="mt-3 text-xs font-semibold text-red-600">
                {cancelError}
              </p>
            )}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={cancelling}
                onClick={() => setConfirmReport(null)}
                className="rounded-xl border border-slate-200 py-2.5 text-xs font-extrabold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                Volver
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={() => void handleConfirmCancel()}
                className="rounded-xl bg-red-600 py-2.5 text-xs font-extrabold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {cancelling ? "Cancelando..." : "Cancelar reporte"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
