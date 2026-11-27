import { useState, type FormEvent } from "react"
import { NavHeader } from "@/components/layout/NavHeader"
import { TabBar } from "@/components/layout/TabBar"
import type { Role, Tab, WorkNotice } from "@/types"
import { formatDateTime } from "@/utils/format"

type NewWorkNotice = Pick<WorkNotice, "place" | "time" | "activity">

const AULAS = Array.from({ length: 16 }, (_, index) => `Aula ${index + 1}`)

const AREAS = [
  "Sala de usos múltiples",
  "Robótica",
  "Dirección",
  "Happy",
  "Coordinación Planta Alta",
  "Música",
  "Taekwondo",
  "Psicología",
  "Enfermería",
  "Pasillo planta baja",
  "Baños planta alta",
  "Taller pintura",
]

type LocationTab = "aulas" | "areas" | "otro"
export function AvisosScreen({
  notices,
  role,
  currentUserId,
  onCreateNotice,
  onCancelNotice,
  onBack,
  onTab,
  tab,
}: {
  notices: WorkNotice[]
  role: Role
  currentUserId: string
  onCreateNotice: (notice: NewWorkNotice) => Promise<void>
  onCancelNotice: (id: string) => Promise<void>
  onBack: () => void
  onTab: (t: Tab) => void
  tab: Tab
}) {
  const [place, setPlace] = useState("")
  const [locationOpen, setLocationOpen] = useState(false)
  const [locationTab, setLocationTab] = useState<LocationTab>("aulas")
  const [otherLocation, setOtherLocation] = useState("")
  const [time, setTime] = useState("")
  const [activity, setActivity] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [confirmNoticeId, setConfirmNoticeId] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState("")
  const visibleNotices = (
    role === "tecnico"
      ? notices.filter((notice) => notice.createdByUid === currentUserId)
      : notices
  ).sort(
    (a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0),
  )
  const displayedNotices =
    role === "tecnico" && !showAll ? visibleNotices.slice(0, 3) : visibleNotices
  const noticeToCancel = visibleNotices.find(
    (notice) => notice.id === confirmNoticeId,
  )

  function selectLocation(location: string) {
    setPlace(location)
    setLocationOpen(false)
    setOtherLocation("")
    setError("")
  }

  function confirmOtherLocation() {
    const value = otherLocation.trim()
    if (!value) {
      setError("Especifica una ubicación.")
      return
    }
    selectLocation(value)
  }

  async function submitNotice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanPlace = place.trim()
    const cleanActivity = activity.trim()
    if (!cleanPlace || !time || !cleanActivity) {
      setError(
        "Selecciona una ubicación y completa la hora y el trabajo.",
      )
      return
    }
    setSaving(true)
    setError("")

    try {
      await onCreateNotice({
        place: cleanPlace,
        time,
        activity: cleanActivity,
      })
      setPlace("")
      setOtherLocation("")
      setLocationOpen(false)
      setTime("")
      setActivity("")
      setFormOpen(false)
    } catch (saveError) {
      console.error("Error al publicar el aviso de trabajo:", saveError)
      setError("No se pudo publicar el aviso. Inténtalo nuevamente.")
    } finally {
      setSaving(false)
    }
  }

  async function confirmCancelNotice() {
    if (!confirmNoticeId || cancelling) return
    setCancelling(true)
    setCancelError("")

    try {
      await onCancelNotice(confirmNoticeId)
      setConfirmNoticeId(null)
    } catch (cancelNoticeError) {
      console.error("Error al cancelar el aviso de trabajo:", cancelNoticeError)
      setCancelError("No se pudo cancelar el aviso. Inténtalo nuevamente.")
    } finally {
      setCancelling(false)
    }
  }

  return (
    <>
      <NavHeader />
      <div className="min-h-0 flex-1 overflow-y-auto bg-[#f4f6fb] px-4 py-5">
        <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#17c3ce]">
          Trabajos en el colegio
        </p>

        {role === "tecnico" && (
          <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h1 className="text-sm font-extrabold text-[#0e1f4d]">
              ¿Trabajarás en algún lugar?
            </h1>
            <button
              type="button"
              onClick={() => {
                setError("")

                setFormOpen(true)
              }}
              className="mt-3 w-full rounded-full bg-[#17c3ce] py-3 text-sm font-extrabold text-white transition hover:bg-[#12a8b3]"
            >
              Publicar aviso
            </button>
          </section>
        )}

        <section className="space-y-3">
          <h1 className="text-sm font-extrabold text-[#0e1f4d]">
            Avisos publicados
          </h1>
          {displayedNotices.map((notice) => {
            const isCancelled = notice.status === "Cancelado"

            return role === "tecnico" ? (
              <article
                key={notice.id}
                className={`relative rounded-2xl border bg-white p-3 pr-12 shadow-sm ${
                  isCancelled
                    ? "border-slate-200 opacity-70"
                    : "border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="min-w-0 truncate text-sm font-extrabold text-[#0e1f4d]">
                    {notice.place}
                  </h3>
                  <span className="shrink-0 rounded-full bg-cyan-50 px-2 py-1 text-[10px] font-extrabold text-cyan-800">
                    {notice.time}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-snug text-slate-600">
                  {notice.activity}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {isCancelled && (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">
                      Cancelado
                    </span>
                  )}
                  <span className="text-[10px] font-semibold text-slate-400">
                    {formatDateTime(notice.createdAt)}
                  </span>
                </div>
                {!isCancelled && (
                  <div className="absolute right-2 top-2">
                    <button
                      type="button"
                      aria-label={`Opciones del aviso en ${notice.place}`}
                      aria-haspopup="menu"
                      aria-expanded={openMenuId === notice.id}
                      onClick={() =>
                        setOpenMenuId((openId) =>
                          openId === notice.id ? null : notice.id,
                        )
                      }
                      className="h-8 w-8 rounded-lg text-xl font-extrabold leading-none text-slate-400 transition hover:bg-slate-100 hover:text-[#0e1f4d]"
                    >
                      ⋮
                    </button>
                    {openMenuId === notice.id && (
                      <div
                        role="menu"
                        className="absolute right-0 top-9 z-10 min-w-36 rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
                      >
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setOpenMenuId(null)

                            setCancelError("")

                            setConfirmNoticeId(notice.id)
                          }}
                          className="w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-xs font-extrabold text-red-600 transition hover:bg-red-50"
                        >
                          Cancelar aviso
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            ) : (
              <article
                key={notice.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="min-w-0 text-sm font-extrabold text-[#0e1f4d]">
                    {notice.place}
                  </h3>
                  <span className="shrink-0 rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-extrabold text-cyan-800">
                    {notice.time}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                  {notice.activity}
                </p>
                {isCancelled && (
                  <p className="mt-2 text-xs font-bold text-red-700">
                    Aviso cancelado
                  </p>
                )}
                <p className="mt-3 text-[10px] font-semibold text-slate-400">
                  Publicado por {notice.createdBy} ·{" "}
                  {formatDateTime(notice.createdAt)}
                </p>
              </article>
            )
          })}
          {visibleNotices.length === 0 && (
            <p className="rounded-2xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-400">
              Aún no hay avisos publicados.
            </p>
          )}
          {role === "tecnico" && visibleNotices.length > 3 && (
            <button
              type="button"
              onClick={() => setShowAll((expanded) => !expanded)}
              className="w-full rounded-full border border-[#17c3ce] bg-[#17c3ce]/10 py-2.5 text-xs font-extrabold text-[#0e1f4d] transition hover:bg-[#17c3ce]/20"
            >
              {showAll ? "Ver menos" : "Ver más"}
            </button>
          )}
        </section>
      </div>
      <TabBar
        active={tab}
        onChange={onTab}
        admin={role === "admin"}
        technician={role === "tecnico"}
      />

      {formOpen && role === "tecnico" && (
        <div className="absolute inset-0 z-20 flex items-end overflow-y-auto bg-[#0e1f4d]/40 p-3 sm:items-center sm:justify-center">
          <form
            onSubmit={(event) => void submitNotice(event)}
            className="my-auto max-h-full w-full space-y-3 overflow-y-auto rounded-[26px] bg-white p-5 shadow-xl sm:max-w-md"
          >
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#17c3ce]">
                Aviso general
              </p>
              <h2 className="mt-1 text-lg font-extrabold text-[#0e1f4d]">
                Publicar aviso
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <label className="mb-1 block text-xs font-bold text-slate-600">
                  Salón/Área
                </label>
                <button
                  type="button"
                  aria-haspopup="dialog"
                  aria-expanded={locationOpen}
                  onClick={() => {
                    setLocationTab("aulas")
                    setError("")
                    setLocationOpen(true)
                  }}
                  className={`flex min-h-[42px] w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                    place
                      ? "border-[#17c3ce] bg-white font-semibold text-[#0e1f4d]"
                      : "border-slate-200 bg-slate-50 font-normal text-slate-400"
                  }`}
                >
                  <span className="truncate">
                    {place || "Selecciona ubicación"}
                  </span>
                  <span className="shrink-0 text-[#17c3ce]">▼</span>
                </button>
              </div>
              <label className="min-w-0 block text-xs font-bold text-slate-600">
                Hora
                <input
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  required
                  className="mt-1 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2.5 text-sm font-normal text-slate-700 focus:border-[#17c3ce] focus:outline-none"
                />
              </label>
            </div>
            <label className="block text-xs font-bold text-slate-600">
              ¿Qué trabajo realizarás?
              <textarea
                value={activity}
                onChange={(event) => setActivity(event.target.value)}
                maxLength={1000}
                required
                rows={3}
                placeholder="Describe el trabajo que realizarás"
                className="mt-1 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-700 focus:border-[#17c3ce] focus:outline-none"
              />
            </label>
            {error && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700"
              >
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-full bg-[#17c3ce] py-3 text-sm font-extrabold text-white transition hover:bg-[#12a8b3] disabled:opacity-50"
            >
              {saving ? "Publicando..." : "Publicar aviso"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setFormOpen(false)}
              className="w-full rounded-full border border-slate-200 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
          </form>
        </div>
      )}

      {formOpen && locationOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50"
          onClick={() => setLocationOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Seleccionar salón o área"
            onClick={(event) => event.stopPropagation()}
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-[28px] bg-white shadow-2xl"
            style={{
              paddingBottom: "max(20px, env(safe-area-inset-bottom))",
            }}
          >
            <div className="flex justify-center pb-2 pt-3">
              <div className="h-1.5 w-10 rounded-full bg-slate-300" />
            </div>

            <div className="flex items-center justify-between px-5 pb-4 pt-2">
              <div>
                <h3 className="text-lg font-extrabold text-[#0e1f4d]">
                  Selecciona la ubicación
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  ¿Dónde realizarás el trabajo?
                </p>
              </div>
              <button
                type="button"
                aria-label="Cerrar selector"
                onClick={() => setLocationOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-500 active:scale-95"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-2 px-5 pb-5">
              {[
                { id: "aulas", label: "Aulas" },
                { id: "areas", label: "Talleres y Áreas" },
                { id: "otro", label: "Otro" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setLocationTab(tab.id as LocationTab)}
                  className={`min-h-[42px] flex-1 rounded-full px-2 text-xs font-extrabold transition-all ${
                    locationTab === tab.id
                      ? "bg-[#0e1f4d] text-white shadow-md"
                      : "bg-slate-100 text-slate-500 active:bg-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {locationTab === "aulas" && (
              <div className="px-5 pb-5">
                <p className="mb-3 text-xs font-bold text-slate-500">
                  SELECCIONA UN AULA
                </p>
                <div className="grid grid-cols-4 gap-2.5">
                  {AULAS.map((aula) => (
                    <button
                      key={aula}
                      type="button"
                      onClick={() => selectLocation(aula)}
                      className={`min-h-[58px] rounded-xl border text-xs font-extrabold transition-all active:scale-95 ${
                        place === aula
                          ? "border-[#0e1f4d] bg-[#0e1f4d] text-white"
                          : "border-slate-200 bg-slate-50 text-[#0e1f4d] active:border-[#17c3ce] active:bg-[#e6fafc]"
                      }`}
                    >
                      {aula}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {locationTab === "areas" && (
              <div className="px-5 pb-5">
                <p className="mb-3 text-xs font-bold text-slate-500">
                  SELECCIONA UN TALLER O ÁREA
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {AREAS.map((area) => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => selectLocation(area)}
                      className={`min-h-[58px] rounded-xl border px-3 py-3 text-center text-xs font-bold transition-all active:scale-[0.98] ${
                        place === area
                          ? "border-[#0e1f4d] bg-[#0e1f4d] text-white"
                          : "border-slate-200 bg-slate-50 text-[#0e1f4d] active:border-[#17c3ce] active:bg-[#e6fafc]"
                      }`}
                    >
                      {area}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {locationTab === "otro" && (
              <div className="px-5 pb-5">
                <label className="mb-2 block text-sm font-bold text-[#0e1f4d]">
                  Especifica la ubicación:
                </label>
                <textarea
                  value={otherLocation}
                  onChange={(event) => setOtherLocation(event.target.value)}
                  rows={3}
                  maxLength={150}
                  placeholder="Ej. Pasillo frente a cafetería"
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#17c3ce] focus:outline-none focus:ring-2 focus:ring-[#17c3ce]/20"
                />
                <button
                  type="button"
                  onClick={confirmOtherLocation}
                  disabled={!otherLocation.trim()}
                  className="mt-4 min-h-[48px] w-full rounded-full bg-[#17c3ce] text-sm font-extrabold text-white shadow-md transition active:scale-[0.98] disabled:opacity-40"
                >
                  Confirmar ubicación
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {confirmNoticeId && noticeToCancel && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0e1f4d]/40 p-5">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cancel-work-notice-title"
            className="w-full rounded-2xl bg-white p-5 shadow-xl sm:max-w-md"
          >
            <h2
              id="cancel-work-notice-title"
              className="text-base font-extrabold text-[#0e1f4d]"
            >
              ¿Cancelar este aviso?
            </h2>
            <p className="mt-2 text-xs text-slate-500">
              Se cancelará el aviso de trabajo para {noticeToCancel.place}.
            </p>
            {cancelError && (
              <p
                role="alert"
                className="mt-3 text-xs font-semibold text-red-600"
              >
                {cancelError}
              </p>
            )}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={cancelling}
                onClick={() => setConfirmNoticeId(null)}
                className="rounded-xl border border-slate-200 py-2.5 text-xs font-extrabold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                Volver
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={() => void confirmCancelNotice()}
                className="rounded-xl bg-red-600 py-2.5 text-xs font-extrabold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {cancelling ? "Cancelando..." : "Cancelar aviso"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
