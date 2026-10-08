import { useState } from "react";
import { collection, addDoc, doc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AvancesList } from "@/features/reportes/components/AvancesList";
import { NavHeader } from "@/components/layout/NavHeader";
import { CAT_ICON, PRIORITY_BADGE, PRIORITY_LABELS, STATUS_BADGE } from "@/constants";
import type { Avance, MaterialRequest, Report, Role } from "@/types";
import { formatDateTime } from "@/utils/format";
import { compressImage } from "@/utils/image";

export function DetalleScreen({
  report, onBack, demoMode, onDemoUpdate, onMaterialRequest, onRequestStatus, requesterName, viewerRole, materialRequests, isHistory = false,
}: {
  report: Report; onBack: () => void;
  viewerRole: Role;
  materialRequests: MaterialRequest[];
  isHistory?: boolean;
  demoMode?: boolean; onDemoUpdate?: (id: string, data: Partial<Report>) => void;
  onMaterialRequest?: (request: MaterialRequest) => void;
  onRequestStatus?: (id: string, status: "Aprobada" | "Rechazada" | "Cancelada") => void;
  requesterName?: string;
}) {
  const [saving, setSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<"avance" | "material" | "apoyo" | "ver-avances" | "ver-material" | null>(null);
  const [progressStatus, setProgressStatus] = useState<"En proceso" | "Pendiente">("En proceso");
  const [pendingReason, setPendingReason] = useState("Alumnos en clase");
  const [progressNotes, setProgressNotes] = useState("");
  const [evidenceName, setEvidenceName] = useState("");
  const [evidenceFoto, setEvidenceFoto] = useState("");
  const [material, setMaterial] = useState("");
  const [materialObservation, setMaterialObservation] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [apoyo, setApoyo] = useState("");
  const [apoyoObs, setApoyoObs] = useState("");
  const [fotoResuelto, setFotoResuelto] = useState("");

  async function persistReport(data: Partial<Report>) {
    if (demoMode) {
      onDemoUpdate?.(report.id, data);
    } else {
      await updateDoc(doc(db!, "reports", report.id), data);
    }
  }

  async function handleProgressSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const nuevoAvance: Avance = {
        fecha: Timestamp.now(),
        estado: progressStatus,
        notas: progressNotes,
        por: requesterName || "Técnico",
        ...(progressStatus === "Pendiente" ? { motivo: pendingReason } : {}),
        ...(evidenceName ? { evidenciaNombre: evidenceName } : {}),
        ...(evidenceFoto ? { foto: evidenceFoto } : {}),
      };
      await persistReport({
        status: progressStatus,
        motivoPendiente: progressStatus === "Pendiente" ? pendingReason : "",
        notasAvance: progressNotes,
        evidenciaNombre: evidenceName,
        avances: [...(report.avances ?? []), nuevoAvance],
      });
      setProgressNotes("");
      setEvidenceName("");
      setEvidenceFoto("");
      setModal(null);
      setActionMessage("Avance registrado");
    } catch (err) {
      console.error(err);
      setActionMessage("No se pudo completar la acción");
    } finally {
      setSaving(false);
    }
  }

  async function handleMaterialSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (demoMode) {
        onMaterialRequest?.({
          id: `material-${Date.now()}`,
          reportId: report.id,
          tipo: "material",
          material,
          observation: materialObservation,
          estimatedCost: Number(estimatedCost) || 0,
          requestedBy: requesterName || "Técnico de mantenimiento",
          status: "Pendiente de aprobación",
          createdAt: null,
        });
        setActionMessage("Solicitud de material enviada");
      } else {
        const request = await addDoc(collection(db!, "materialRequests"), {
          reportId: report.id,
          tipo: "material",
          material,
          observation: materialObservation,
          estimatedCost: Number(estimatedCost) || 0,
          requestedBy: requesterName || "Técnico de mantenimiento",
          status: "Pendiente de aprobación",
          createdAt: serverTimestamp(),
        });
        await addDoc(collection(db!, "notifications"), {
          type: "solicitud_material",
          requestId: request.id,
          reportId: report.id,
          title: "Nueva solicitud de material",
          message: material,
          status: "No leída",
          createdAt: serverTimestamp(),
        });
        setActionMessage("Solicitud enviada a Administración");
      }
      setMaterial("");
      setMaterialObservation("");
      setEstimatedCost("");
      setModal(null);
    } catch (err) {
      console.error(err);
      setActionMessage("No se pudo enviar la solicitud");
    } finally {
      setSaving(false);
    }
  }

  async function handleApoyoSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (demoMode) {
        onMaterialRequest?.({
          id: `apoyo-${Date.now()}`,
          reportId: report.id,
          tipo: "apoyo_externo",
          material: apoyo,
          observation: apoyoObs,
          estimatedCost: 0,
          requestedBy: requesterName || "Técnico de mantenimiento",
          status: "Pendiente de aprobación",
          createdAt: Timestamp.now(),
        });
      } else {
        const request = await addDoc(collection(db!, "materialRequests"), {
          reportId: report.id,
          tipo: "apoyo_externo",
          material: apoyo,
          observation: apoyoObs,
          estimatedCost: 0,
          requestedBy: requesterName || "Técnico de mantenimiento",
          status: "Pendiente de aprobación",
          createdAt: serverTimestamp(),
        });
        await addDoc(collection(db!, "notifications"), {
          type: "solicitud_apoyo_externo",
          requestId: request.id,
          reportId: report.id,
          title: "Nueva solicitud de apoyo externo",
          message: apoyo,
          status: "No leída",
          createdAt: serverTimestamp(),
        });
      }
      setActionMessage("Solicitud de apoyo externo enviada a Administración");
      setApoyo("");
      setApoyoObs("");
      setModal(null);
    } catch (err) {
      console.error(err);
      setActionMessage("No se pudo enviar la solicitud");
    } finally {
      setSaving(false);
    }
  }

  async function handleFotoResuelto(file?: File) {
    if (!file) return;
    try {
      setFotoResuelto(await compressImage(file));
    } catch (err) {
      console.error(err);
      setActionMessage("No se pudo cargar la foto");
    }
  }

  async function handleResolve() {
    setSaving(true);
    try {
      await persistReport({ status: "Resuelto", ...(fotoResuelto ? { fotoResuelto } : {}) });
      setActionMessage("Reporte marcado como resuelto");
      setTimeout(onBack, 1400);
    } catch (err) {
      console.error(err);
      setActionMessage("No se pudo completar la acción");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <NavHeader title={viewerRole === "admin" ? "Administracion" : viewerRole === "tecnico" ? "Tecnico" : "Docente"} />
      <div className="flex-none bg-white px-5 py-2.5 border-b border-gray-100">
        <button
          onClick={onBack}
          className="border border-slate-200 bg-white text-[#0e1f4d] text-xs font-extrabold px-3 py-2 rounded-xl shadow-sm hover:bg-slate-50 transition"
        >
          <span className="text-[#17c3ce] mr-1">‹</span> Volver
        </button>
      </div>
      <div className="flex-1 overflow-y-auto bg-white px-5 py-4 space-y-4 scrollbar-hide">
        <div className="relative flex items-center justify-between">
          <h2 className="text-[#0e1f4d] text-base font-extrabold">Detalles del reporte</h2>
          {viewerRole !== "docente" && <div className="relative">
            <button
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Más opciones"
                className="w-9 h-9 rounded-xl border border-slate-200 bg-white text-[#0e1f4d] text-lg font-extrabold leading-none hover:bg-slate-50 transition"
            >
              ...
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-11 z-10 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_12px_30px_rgba(15,23,42,0.16)]">
                {viewerRole === "admin" ? (
                  <>
                    <button onClick={() => { setMenuOpen(false); setModal("ver-avances"); }} className="w-full rounded-xl px-3 py-2.5 text-left text-xs font-extrabold text-blue-700 hover:bg-blue-50 transition">{isHistory ? "Ver notas" : "Ver avances"}</button>
                    <button onClick={() => { setMenuOpen(false); setModal("ver-material"); }} className="w-full rounded-xl px-3 py-2.5 text-left text-xs font-extrabold text-amber-700 hover:bg-amber-50 transition">Ver material solicitado</button>
                  </>
                ) : viewerRole === "tecnico" && isHistory ? (
                  <>
                    <button onClick={() => { setMenuOpen(false); setModal("ver-avances"); }} className="w-full rounded-xl px-3 py-2.5 text-left text-xs font-extrabold text-blue-700 hover:bg-blue-50 transition">Ver notas</button>
                    <button onClick={() => { setMenuOpen(false); setModal("ver-material"); }} className="w-full rounded-xl px-3 py-2.5 text-left text-xs font-extrabold text-amber-700 hover:bg-amber-50 transition">Ver material solicitado</button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => { setMenuOpen(false); setModal("avance"); }}
                      disabled={saving}
                      className="w-full rounded-xl px-3 py-2.5 text-left text-xs font-extrabold text-blue-700 hover:bg-blue-50 transition disabled:opacity-60"
                    >
                      Registrar avance
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); setModal("material"); }}
                      disabled={saving}
                      className="w-full rounded-xl px-3 py-2.5 text-left text-xs font-extrabold text-amber-700 hover:bg-amber-50 transition disabled:opacity-60"
                    >
                      Solicitar material
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); setModal("apoyo"); }}
                      disabled={saving}
                      className="w-full rounded-xl px-3 py-2.5 text-left text-xs font-extrabold text-purple-700 hover:bg-purple-50 transition disabled:opacity-60"
                    >
                      Apoyo externo
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); setModal("ver-material"); }}
                      className="w-full rounded-xl px-3 py-2.5 text-left text-xs font-extrabold text-slate-600 hover:bg-slate-50 transition"
                    >
                      Historial de material
                    </button>
                  </>
                )}
              </div>
            )}
          </div>}
        </div>

        <div className="bg-gray-50 rounded-2xl p-4 space-y-1.5 text-xs">
          <p><span className="font-bold text-gray-400">Folio:</span> <span className="text-[#0e1f4d] font-extrabold ml-1">{(report.folio ?? report.id).replace(/[^a-z0-9]/gi, "").toUpperCase()}</span></p>
          <p><span className="font-bold text-gray-400">Fecha y hora:</span> <span className="text-[#0e1f4d] font-bold ml-1">{formatDateTime(report.createdAt)}</span></p>
          {report.horarioInicio && <p><span className="font-bold text-gray-400">Horario para reparar:</span> <span className="text-[#0e1f4d] font-bold ml-1">{report.horarioInicio} – {report.horarioFin}</span></p>}
          <p><span className="font-bold text-gray-400">Ubicación:</span> <span className="text-[#0e1f4d] font-bold ml-1">{report.salon}</span></p>
          <p><span className="font-bold text-gray-400">Solicitante:</span> <span className="text-[#0e1f4d] font-bold ml-1">{report.reportedBy}</span></p>
          <p><span className="font-bold text-gray-400">Categoría:</span> <span className="text-[#0e1f4d] font-bold ml-1">{CAT_ICON[report.category]} {report.category}</span></p>
          <p><span className="font-bold text-gray-400">Elemento:</span> <span className="text-[#0e1f4d] font-bold ml-1">{report.elemento}</span></p>
          <p><span className="font-bold text-gray-400">Prioridad:</span> <span className={`font-extrabold ml-1 ${PRIORITY_BADGE[report.priority]}`}>{PRIORITY_LABELS[report.priority]}</span></p>
          <p><span className="font-bold text-gray-400">Estado:</span> <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ml-1 ${STATUS_BADGE[report.status]}`}>{report.status}</span></p>
          {report.motivoPendiente && <p><span className="font-bold text-gray-400">Motivo pendiente:</span> <span className="text-[#0e1f4d] font-bold ml-1">{report.motivoPendiente}</span></p>}
          {report.description && <p><span className="font-bold text-gray-400">Descripción:</span> <span className="text-[#0e1f4d] ml-1">{report.description}</span></p>}
        </div>

        <div>
          <p className="text-xs font-bold text-gray-400 mb-1.5">Foto del reporte:</p>
          <div className="w-full h-32 bg-gradient-to-b from-sky-200 to-green-200 rounded-2xl flex items-end justify-center overflow-hidden">
            <div className="w-full h-10 bg-green-400 rounded-t-full" />
          </div>
        </div>

        {((report.avances?.length ?? 0) > 0 || report.notasAvance) && (
          <div>
            <p className="text-xs font-bold text-gray-400 mb-1.5">Avances del técnico:</p>
            <AvancesList report={report} />
          </div>
        )}

        {report.fotoResuelto && (
          <div>
            <p className="text-xs font-bold text-gray-400 mb-1.5">Evidencia de la reparación:</p>
            <img src={report.fotoResuelto} alt="Evidencia de la reparación" className="w-full rounded-2xl object-cover" />
          </div>
        )}

      </div>

      {modal === "avance" && (
        <div className="absolute inset-0 z-20 flex items-end bg-[#0e1f4d]/30 p-3">
          <form onSubmit={handleProgressSubmit} className="w-full rounded-[26px] bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#17c3ce]">Seguimiento</p>
                <h3 className="text-[#0e1f4d] text-lg font-extrabold">Registrar avance</h3>
              </div>
              <button type="button" onClick={() => setModal(null)} className="text-slate-400 text-xl px-2">×</button>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">Cambio de estado</label>
              <div className="grid grid-cols-2 gap-2">
                {(["En proceso", "Pendiente"] as const).map((statusOption) => (
                  <button
                    key={statusOption}
                    type="button"
                    onClick={() => setProgressStatus(statusOption)}
                    className={`rounded-xl border py-2.5 text-xs font-extrabold transition ${progressStatus === statusOption ? "border-[#17c3ce] bg-[#17c3ce]/10 text-[#0e1f4d]" : "border-slate-200 text-slate-500"}`}
                  >
                    {statusOption === "Pendiente" ? "Pausado / Pendiente" : statusOption}
                  </button>
                ))}
              </div>
            </div>
            {progressStatus === "Pendiente" && (
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">Motivo de pendiente</label>
                <select value={pendingReason} onChange={(e) => setPendingReason(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#17c3ce]">
                  <option>Alumnos en clase</option>
                  <option>Falta de material</option>
                  <option>Falta de personal</option>
                  <option>Falta de herramienta</option>
                  <option>Esperando empresa externa</option>
                </select>
              </div>
            )}
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">Notas / Avance</label>
              <textarea required value={progressNotes} onChange={(e) => setProgressNotes(e.target.value)} rows={3} placeholder="Se detectó que el filtro está tapado, se regresará a las 2:00 pm cuando salgan los niños" className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#17c3ce]" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">Foto de evidencia (Opcional)</label>
              <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-xs font-bold text-slate-500 hover:bg-slate-100 transition">
                {evidenceName || "Seleccionar fotografía"}
                <input type="file" accept="image/*" onChange={(e) => {
                  const f = e.target.files?.[0];
                  setEvidenceName(f?.name ?? "");
                  setEvidenceFoto("");
                  if (f) compressImage(f, 600, 0.6).then(setEvidenceFoto).catch(() => setActionMessage("No se pudo cargar la foto"));
                }} className="hidden" />
              </label>
            </div>
            <button type="submit" disabled={saving} className="w-full rounded-full bg-[#17c3ce] py-3 text-sm font-extrabold text-white hover:bg-[#12a8b3] transition disabled:opacity-60">{saving ? "Guardando..." : "Guardar avance"}</button>
          </form>
        </div>
      )}

      {modal === "material" && (
        <div className="absolute inset-0 z-20 flex items-end bg-[#0e1f4d]/30 p-3">
          <form onSubmit={handleMaterialSubmit} className="w-full rounded-[26px] bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#17c3ce]">Administración</p>
                <h3 className="text-[#0e1f4d] text-lg font-extrabold">Solicitar material</h3>
              </div>
              <button type="button" onClick={() => setModal(null)} className="text-slate-400 text-xl px-2">×</button>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">Material / Herramienta requerida</label>
              <input required value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="Gas refrigerante R410a, capacitor de 45 mf" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#17c3ce]" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">Urgencia / Observación</label>
              <textarea required value={materialObservation} onChange={(e) => setMaterialObservation(e.target.value)} rows={3} placeholder="Se necesita para reparar minisplit de Aula 112" className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#17c3ce]" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">Costo aproximado</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input required type="number" min="0" step="0.01" value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} placeholder="0.00" className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-7 pr-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#17c3ce]" />
              </div>
            </div>
            <button type="submit" disabled={saving} className="w-full rounded-full bg-[#0e1f4d] py-3 text-sm font-extrabold text-white hover:bg-[#172b62] transition disabled:opacity-60">{saving ? "Enviando..." : "Enviar solicitud"}</button>
          </form>
        </div>
      )}

      {modal === "apoyo" && (
        <div className="absolute inset-0 z-20 flex items-end bg-[#0e1f4d]/30 p-3">
          <form onSubmit={handleApoyoSubmit} className="w-full rounded-[26px] bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#17c3ce]">Administración</p>
                <h3 className="text-[#0e1f4d] text-lg font-extrabold">Apoyo externo</h3>
              </div>
              <button type="button" onClick={() => setModal(null)} className="text-slate-400 text-xl px-2">×</button>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">Apoyo requerido</label>
              <input required value={apoyo} onChange={(e) => setApoyo(e.target.value)} placeholder="Empresa o servicio de plomería" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#17c3ce]" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">Observación</label>
              <textarea required value={apoyoObs} onChange={(e) => setApoyoObs(e.target.value)} rows={3} placeholder="La tubería principal requiere cambio y no contamos con el equipo" className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#17c3ce]" />
            </div>
            <button type="submit" disabled={saving} className="w-full rounded-full bg-[#0e1f4d] py-3 text-sm font-extrabold text-white hover:bg-[#172b62] transition disabled:opacity-60">{saving ? "Enviando..." : "Enviar solicitud"}</button>
          </form>
        </div>
      )}

      {modal === "ver-avances" && (
        <div className="absolute inset-0 z-20 flex items-end bg-[#0e1f4d]/30 p-3">
          <div className="w-full max-h-[82%] overflow-y-auto rounded-[26px] bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#17c3ce]">Seguimiento del técnico</p>
                <h3 className="text-[#0e1f4d] text-lg font-extrabold">{isHistory ? "Notas del técnico" : "Avances registrados"}</h3>
              </div>
              <button type="button" onClick={() => setModal(null)} aria-label="Cerrar" className="text-slate-400 text-xl px-2">×</button>
            </div>
            <p className="text-xs"><span className="font-bold text-slate-500">Estado actual:</span> <span className="font-extrabold text-[#0e1f4d]">{report.status}</span>{report.motivoPendiente && <span className="text-slate-500"> · {report.motivoPendiente}</span>}</p>
            <AvancesList report={report} />
          </div>
        </div>
      )}

      {modal === "ver-material" && (
        <div className="absolute inset-0 z-20 flex items-end bg-[#0e1f4d]/30 p-3">
          <div className="w-full max-h-[82%] overflow-y-auto rounded-[26px] bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#17c3ce]">Solicitudes del técnico</p>
                <h3 className="text-[#0e1f4d] text-lg font-extrabold">Material solicitado</h3>
              </div>
              <button type="button" onClick={() => setModal(null)} aria-label="Cerrar" className="text-slate-400 text-xl px-2">×</button>
            </div>
            <div className="space-y-2">
              {materialRequests.filter((request) => request.reportId === report.id).map((request) => (
                <div key={request.id} className="rounded-xl bg-slate-50 p-3">
                  {request.tipo === "apoyo_externo" && <span className="inline-block mb-1 text-[10px] font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">Apoyo externo</span>}
                  <p className="text-sm font-extrabold text-[#0e1f4d]">{request.material}</p>
                  <p className="text-xs text-slate-600 mt-1">{request.observation}</p>
                  {request.tipo !== "apoyo_externo" && <p className="text-xs font-bold text-emerald-700 mt-2">Costo aproximado: ${(request.estimatedCost ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>}
                  <p className="text-[10px] text-slate-400 mt-1">{request.status} · {formatDateTime(request.createdAt)}</p>
                  {request.status === "Pendiente de aprobación" && viewerRole === "tecnico" && !isHistory && (
                    <button type="button" onClick={() => onRequestStatus?.(request.id, "Cancelada")} className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-extrabold text-red-600 hover:bg-red-100">Cancelar petición</button>
                  )}
                </div>
              ))}
              {materialRequests.filter((request) => request.reportId === report.id).length === 0 && (
                <p className="rounded-xl bg-slate-50 py-6 text-center text-xs text-slate-500">No se ha solicitado material para este reporte.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {viewerRole === "tecnico" && !isHistory && <div className="flex flex-col items-center gap-2 px-5 pt-3 pb-6 bg-white border-t border-gray-100 flex-none">
        {actionMessage && <p className="text-center text-xs font-bold text-emerald-600">{actionMessage}</p>}
        <label className="flex w-full max-w-xs cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 transition">
          {fotoResuelto ? <img src={fotoResuelto} alt="Evidencia" className="h-8 w-8 rounded object-cover" /> : <span aria-hidden="true">📷</span>}
          {fotoResuelto ? "Cambiar foto de lo reparado" : "Foto de lo reparado (evidencia)"}
          <input type="file" accept="image/*" capture="environment" onChange={(e) => void handleFotoResuelto(e.target.files?.[0])} className="hidden" />
        </label>
        <button onClick={() => void handleResolve()} disabled={saving || report.status === "Cancelado"} className="w-full max-w-xs bg-[#17c3ce] text-white font-extrabold py-3 px-5 rounded-full text-sm hover:bg-[#12a8b3] transition disabled:opacity-60">
          {saving ? "Guardando..." : "Marcar como resuelto"}
        </button>
      </div>}
    </>
  );
}
