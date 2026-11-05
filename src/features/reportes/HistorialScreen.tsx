import { useState } from "react";
import { Timestamp } from "firebase/firestore";
import { NavHeader } from "@/components/layout/NavHeader";
import { TabBar } from "@/components/layout/TabBar";
import {
  PRIORITY_BADGE,
  PRIORITY_DOT,
  PRIORITY_LABELS,
  STATUS_BADGE,
} from "@/constants";
import type { MaterialRequest, Priority, Report, Role, Tab } from "@/types";
import { formatDateTime } from "@/utils/format";

type HistoryStatus = Extract<
  Report["status"],
  "Resuelto" | "En proceso" | "Pendiente"
>;
type DateFilterMode = "" | "day" | "month";

const MONTHS = Array.from({ length: 12 }, (_, month) =>
  new Date(2024, month, 1).toLocaleDateString("es-MX", { month: "long" }),
);

function formatLocalDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function HistorialScreen({
  reports,
  materialRequests,
  role,
  onDetail,
  onTab,
  tab,
}: {
  reports: Report[];
  materialRequests: MaterialRequest[];
  role: Role;
  onDetail: (id: string) => void;
  onTab: (t: Tab) => void;
  tab: Tab;
}) {
  const currentDate = new Date();
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<HistoryStatus | "">("");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "">("");
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>("");
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [monthYear, setMonthYear] = useState(String(currentDate.getFullYear()));

  const isCurrentMonth = (timestamp: Timestamp | null) => {
    if (!timestamp) return true;
    const date = timestamp.toDate();
    return (
      date.getMonth() === currentDate.getMonth() &&
      date.getFullYear() === currentDate.getFullYear()
    );
  };
  const visibleReports = reports.filter((report) => report.status !== "Cancelado");
  const monthlyReports = visibleReports.filter(
    (report) =>
      report.status === "Resuelto" &&
      isCurrentMonth(report.createdAt),
  );
  const monthlyPurchases = materialRequests.filter(
    (request) =>
      request.status === "Aprobada" &&
      request.tipo !== "apoyo_externo" &&
      isCurrentMonth(request.createdAt),
  );
  const totalExpenses = monthlyPurchases.reduce(
    (total, request) => total + (request.estimatedCost ?? 0),
    0,
  );

  const normalizedSearch = searchText.trim().toLocaleLowerCase("es-MX");
  const filteredReports = visibleReports.filter((report) => {
    const searchMatches =
      !normalizedSearch ||
      [
        report.folio,
        report.salon,
        report.category,
        report.reportedBy,
        report.elemento,
        report.description,
      ]
        .filter(Boolean)
        .some((value) =>
          value!.toLocaleLowerCase("es-MX").includes(normalizedSearch),
        );
    const statusMatches = !statusFilter || report.status === statusFilter;
    const priorityMatches =
      !priorityFilter || report.priority === priorityFilter;

    let dateMatches = true;
    if (dateFilterMode === "day" && selectedDay) {
      dateMatches =
        report.createdAt !== null &&
        formatLocalDate(report.createdAt.toDate()) === selectedDay;
    } else if (
      dateFilterMode === "month" &&
      selectedMonth !== null &&
      monthYear.trim() !== "" &&
      Number.isInteger(Number(monthYear))
    ) {
      dateMatches =
        report.createdAt !== null &&
        report.createdAt.toDate().getMonth() === selectedMonth &&
        report.createdAt.toDate().getFullYear() === Number(monthYear);
    }

    return searchMatches && statusMatches && priorityMatches && dateMatches;
  });

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
      <div className="flex-1 overflow-y-auto bg-[#f4f6fb] px-4 pt-5 pb-4 scrollbar-hide">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-extrabold text-[#0e1f4d]">
            Historial de reportes
          </h2>
          {role === "admin" && (
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-[11px] font-extrabold text-white shadow-sm transition hover:bg-emerald-500"
            >
              <span aria-hidden="true">↓</span> Descargar excel
            </button>
          )}
        </div>

        <label className="group mb-3 flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition focus-within:border-[#17c3ce]">
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            className="block h-4 w-4 flex-none text-slate-400 transition-colors group-focus-within:text-[#17c3ce]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>
          <input
            type="text"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Buscar por folio, aula, categoría o usuario..."
            aria-label="Buscar reportes"
            className="min-w-0 flex-1 border-0 bg-transparent text-xs text-[#0e1f4d] outline-none ring-0 placeholder:text-slate-400 focus:border-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
          />
        </label>

        <div className="mb-3">
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-[11px] font-bold text-slate-600">
              Filtrar por:
            </span>
            <div className="grid min-w-0 flex-1 grid-cols-3 gap-2">
              <div className="relative min-w-0">
                <select
                  aria-label="Estado"
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as HistoryStatus | "")
                  }
                  className="w-full min-w-0 appearance-none rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-left text-[10px] font-bold text-[#0e1f4d] shadow-sm transition hover:border-[#17c3ce]/60 focus:border-[#17c3ce] focus:outline-none focus:ring-0"
                >
                  <option value="">Estado</option>
                  <option value="Resuelto">Resuelto</option>
                  <option value="En proceso">En proceso</option>
                  <option value="Pendiente">Pendiente</option>
                </select>
                <svg aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#17c3ce]" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.22 7.47a.75.75 0 0 1 1.06 0L10 11.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="relative min-w-0">
                <select
                  aria-label="Prioridad"
                  value={priorityFilter}
                  onChange={(event) =>
                    setPriorityFilter(event.target.value as Priority | "")
                  }
                  className="w-full min-w-0 appearance-none rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-left text-[10px] font-bold text-[#0e1f4d] shadow-sm transition hover:border-[#17c3ce]/60 focus:border-[#17c3ce] focus:outline-none focus:ring-0"
                >
                  <option value="">Prioridad</option>
                  <option value="Baja">Baja</option>
                  <option value="Media">Media</option>
                  <option value="Urgente">Urgente</option>
                </select>
                <svg aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#17c3ce]" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.22 7.47a.75.75 0 0 1 1.06 0L10 11.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="relative min-w-0">
                <select
                  aria-label="Fecha"
                  value={dateFilterMode}
                  onChange={(event) =>
                    setDateFilterMode(event.target.value as DateFilterMode)
                  }
                  className="w-full min-w-0 appearance-none rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-left text-[10px] font-bold text-[#0e1f4d] shadow-sm transition hover:border-[#17c3ce]/60 focus:border-[#17c3ce] focus:outline-none focus:ring-0"
                >
                  <option value="">Fecha</option>
                  <option value="day">Día</option>
                  <option value="month">Mes</option>
                </select>
                <svg aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#17c3ce]" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.22 7.47a.75.75 0 0 1 1.06 0L10 11.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {dateFilterMode === "day" && (
            <div className="mt-2">
              <label
                htmlFor="history-day-filter"
                className="sr-only"
              >
                Elegir día
              </label>
              <input
                id="history-day-filter"
                type="date"
                value={selectedDay}
                onChange={(event) => setSelectedDay(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-[#0e1f4d]"
              />
            </div>
          )}

          {dateFilterMode === "month" && (
            <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3">
              <label
                htmlFor="history-year-filter"
                className="mb-2 block text-[11px] font-bold text-[#0e1f4d]"
              >
                Año
              </label>
              <input
                id="history-year-filter"
                type="number"
                min="1"
                step="1"
                value={monthYear}
                onChange={(event) => setMonthYear(event.target.value)}
                className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-[#0e1f4d]"
              />
              <div className="grid grid-cols-3 gap-2">
                {MONTHS.map((month, index) => (
                  <button
                    key={month}
                    type="button"
                    onClick={() => setSelectedMonth(index)}
                    aria-pressed={selectedMonth === index}
                    className={`rounded-lg px-2 py-2 text-xs font-semibold capitalize transition ${
                      selectedMonth === index
                        ? "bg-[#17c3ce] text-white"
                        : "bg-slate-50 text-[#0e1f4d] hover:bg-slate-100"
                    }`}
                  >
                    {month}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {filteredReports.map((report) => (
            <button
              key={report.id}
              type="button"
              onClick={() => onDetail(report.id)}
              className="w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 text-left shadow-sm transition hover:border-[#17c3ce]/50"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 h-3 w-3 flex-none rounded-full ${PRIORITY_DOT[report.priority]}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-xs font-extrabold ${PRIORITY_BADGE[report.priority]}`}
                    >
                      {PRIORITY_LABELS[report.priority]}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_BADGE[report.status]}`}
                    >
                      {report.status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm font-semibold leading-snug text-[#0e1f4d]">
                    {report.elemento} · {report.salon}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {formatDateTime(report.createdAt)}
                  </p>
                </div>
              </div>
            </button>
          ))}
          {filteredReports.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-400">
              No hay reportes que coincidan con los filtros
            </div>
          )}
        </div>
      </div>
      <TabBar active={tab} onChange={onTab} admin={role === "admin"} />
    </>
  );
}
