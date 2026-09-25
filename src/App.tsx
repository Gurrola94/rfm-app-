import { useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  deleteDoc,
} from "firebase/firestore";
import { auth, db, firebaseConfigured } from "./firebase";
import logoRfm from "@/assets/logo_rfm.png";

/* ─── Demo data ─────────────────────────────────────────── */
const DEMO_REPORTS: Report[] = [
  {
    id: "demo-1",
    category: "Minisplit/Clima",
    priority: "Urgente",
    status: "En proceso",
    salon: "Aula 112",
    elemento: "Minisplit",
    description: "Fuga de agua en minisplit - Aula 112",
    reportedBy: "Profe Luis",
    reportedByUid: "demo-uid",
    role: "docente",
    createdAt: null,
  },
  {
    id: "demo-2",
    category: "Eléctrico",
    priority: "Baja",
    status: "Resuelto",
    salon: "Laboratorio",
    elemento: "Foco",
    description: "Reemplazo de foco - Laboratorio",
    reportedBy: "Maestra Lila",
    reportedByUid: "demo-uid-2",
    role: "docente",
    createdAt: null,
    acciones: "Se reemplazó el foco fundido.",
    materiales: "Foco LED 20W",
  },
  {
    id: "demo-3",
    category: "Plomería",
    priority: "Media",
    status: "Pendiente",
    salon: "Baño planta baja",
    elemento: "Tubería",
    description: "Fuga de agua en los baños",
    reportedBy: "Prefecto Torres",
    reportedByUid: "demo-uid-3",
    role: "docente",
    createdAt: null,
  },
];

const DEMO_MATERIAL_REQUESTS: MaterialRequest[] = [
  {
    id: "material-demo-1",
    reportId: "demo-1",
    material: "Gas refrigerante R410a",
    observation: "Se necesita para reparar minisplit de Aula 112",
    requestedBy: "Técnico de mantenimiento",
    status: "Pendiente de aprobación",
    createdAt: null,
  },
];

const DEMO_USERS: AppUser[] = [
  { id: "user-demo-1", email: "tecnico@b", role: "tecnico", temporaryPassword: "Tecnico123" },
  { id: "user-demo-2", email: "maria@buhsab.mx", role: "docente" },
  { id: "user-demo-3", email: "luis@buhsab.mx", role: "docente" },
];

/* ─── Types ─────────────────────────────────────────────── */
type Role = "docente" | "tecnico" | "admin";
type Priority = "Urgente" | "Media" | "Baja";
type Status = "Pendiente" | "En proceso" | "Resuelto" | "Cancelado";
type Category = "Minisplit/Clima" | "Chapas/Puertas" | "Eléctrico" | "Mobiliario" | "Plomería" | "Otro";
type Tab = "home" | "usuarios" | "reportes" | "perfil";

interface Report {
  id: string;
  category: Category;
  priority: Priority;
  status: Status;
  salon: string;
  elemento: string;
  description: string;
  reportedBy: string;
  reportedByUid: string;
  role: Role;
  createdAt: Timestamp | null;
  acciones?: string;
  materiales?: string;
  photoUrl?: string;
  motivoPendiente?: string;
  notasAvance?: string;
  evidenciaNombre?: string;
}

interface MaterialRequest {
  id: string;
  reportId: string;
  material: string;
  observation: string;
  requestedBy: string;
  status: "Pendiente de aprobación" | "Aprobada" | "Rechazada";
  createdAt: Timestamp | null;
  estimatedCost?: number;
}

interface AppUser {
  id: string;
  email: string;
  role: "tecnico" | "docente" | "admin";
  temporaryPassword?: string;
}

/* ─── Helpers ───────────────────────────────────────────── */
function timeAgo(ts: Timestamp | null): string {
  if (!ts) return "Ahora";
  const diff = Math.floor((Date.now() - ts.toMillis()) / 1000);
  if (diff < 60) return "Hace un momento";
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`;
  return `Hace ${Math.floor(diff / 86400)} días`;
}

function formatDateTime(ts: Timestamp | null): string {
  if (!ts) return "Fecha no disponible";
  const date = ts.toDate();
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

const PRIORITY_LABELS: Record<Priority, string> = {
  Urgente: "Urgente",
  Media: "Media",
  Baja: "Baja",
};
const PRIORITY_DOT: Record<Priority, string> = {
  Urgente: "bg-red-500",
  Media: "bg-amber-400",
  Baja: "bg-green-500",
};
const PRIORITY_BADGE: Record<Priority, string> = {
  Urgente: "text-red-600",
  Media: "text-amber-600",
  Baja: "text-green-600",
};
const STATUS_BADGE: Record<Status, string> = {
  Pendiente: "bg-yellow-100 text-yellow-700",
  "En proceso": "bg-blue-100 text-blue-700",
  Resuelto: "bg-green-100 text-green-700",
  Cancelado: "bg-red-100 text-red-700",
};
const CAT_ICON: Record<Category, string> = {
  "Minisplit/Clima": "❄️",
  "Chapas/Puertas": "🚪",
  Eléctrico: "💡",
  Mobiliario: "🪑",
  Plomería: "🔧",
  Otro: "🔩",
};
const CATEGORIES: Category[] = ["Minisplit/Clima", "Chapas/Puertas", "Eléctrico", "Mobiliario", "Plomería", "Otro"];
const PRIORITIES: Priority[] = ["Urgente", "Media", "Baja"];
const STATUSES: Status[] = ["Pendiente", "En proceso", "Resuelto"];
const AREAS = ["Aula 1", "Aula 2", "Aula 3", "Cinema", "Sala de usos múltiple", "Robótica", "Computación"];

/* ─── Shell ─────────────────────────────────────────────── */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="size-full flex items-center justify-center bg-slate-300"
      style={{ fontFamily: "'Nunito', sans-serif" }}
    >
      <div className="relative w-full max-w-sm h-full max-h-[820px] bg-white overflow-hidden flex flex-col shadow-2xl rounded-3xl">
        {children}
      </div>
    </div>
  );
}

/* ─── NavHeader ─────────────────────────────────────────── */
function NavHeader({ title, onBack }: { title?: string; onBack?: () => void }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-[#0e1f4d] flex-none shadow-[0_10px_30px_rgba(14,31,77,0.18)]">
      <img src={logoRfm} alt="RFM BUHSAB" className="w-8 h-8 object-contain rounded" />
      <span className="text-[#17c3ce] font-extrabold text-sm tracking-[0.18em]">RFM</span>
      {onBack && (
        <button onClick={onBack} className="text-white text-sm font-semibold ml-1 flex items-center gap-1">
          <span className="text-[#17c3ce]">‹</span> Volver
        </button>
      )}
      <div className="flex-1" />
      {title && <span className="text-white text-sm font-bold">{title}</span>}
    </div>
  );
}

/* ─── Tab bar ───────────────────────────────────────────── */
function TabBar({ active, onChange, admin = false }: { active: Tab; onChange: (t: Tab) => void; admin?: boolean }) {
  return (
    <div className="flex bg-white border-t border-gray-100 flex-none">
      {((admin ? ["home", "usuarios", "reportes", "perfil"] : ["home", "reportes", "perfil"]) as Tab[]).map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ${active === t ? "text-[#17c3ce]" : "text-gray-400"}`}
        >
          {t === "home" && <HomeIcon />}
          {t === "usuarios" && <UsersIcon />}
          {t === "reportes" && <ListIcon />}
          {t === "perfil" && <PersonIcon />}
          <span className="text-[10px] font-bold capitalize">{t}</span>
        </button>
      ))}
    </div>
  );
}

const HomeIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>;
const ListIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" /></svg>;
const PersonIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" /></svg>;
const UsersIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11a4 4 0 1 0-3.9-5A4 4 0 0 0 16 11zm-8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm8 2c-2.7 0-8 1.3-8 4v2h16v-2c0-2.7-5.3-4-8-4zM8 13c-2.2 0-6 1.1-6 3.3V19h4v-1c0-1.1.5-2.1 1.4-2.9.4-.4.9-.7 1.4-.9A6.7 6.7 0 0 0 8 13z" /></svg>;

/* ════════════════════════════════════════════════════════════
   SCREEN 1 — Login
════════════════════════════════════════════════════════════ */
function LoginScreen({ onLogin, demoMode }: { onLogin: (u: User | null, role: Role) => void; demoMode?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const emailPlaceholder = "correo@buhsab.mx";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (isRegister && password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    // Demo mode: skip Firebase, use email to decide role
    if (demoMode) {
      const normalized = email.toLowerCase();
      const role: Role = isRegister ? "docente" : normalized === "admin@b" ? "admin" : normalized === "tecnico@b" ? "tecnico" : "docente";
      setTimeout(() => { onLogin(null, role); setLoading(false); }, 600);
      return;
    }
    if (email.toLowerCase() === "admin@b" || email.toLowerCase() === "tecnico@b") {
      onLogin(null, email.toLowerCase() === "admin@b" ? "admin" : "tecnico");
      setLoading(false);
      return;
    }
    try {
      let cred;
      if (isRegister) {
        cred = await createUserWithEmailAndPassword(auth!, email, password);
        await addDoc(collection(db!, "users"), { email, role: "docente", createdAt: serverTimestamp() });
      } else {
        cred = await signInWithEmailAndPassword(auth!, email, password);
      }
      onLogin(cred.user, isRegister ? "docente" : email.toLowerCase().includes("tecnico") ? "tecnico" : "docente");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setError(msg.replace("Firebase: ", "").replace(/\(auth.*\)\.?/, ""));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#0e1f4d] px-8">
      <div className="mb-8 flex flex-col items-center gap-2">
        <img src={logoRfm} alt="BUHSAB RFM" className="w-28 h-28 object-contain" />
      </div>

      <h2 className="text-white text-xl font-extrabold mb-5 self-start">
        {isRegister ? "Crear cuenta" : "Inicia sesión"}
      </h2>

      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <div>
          <label className="text-white text-xs font-bold mb-1 block">Correo:</label>
          <input
            type="text"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={emailPlaceholder}
            className="w-full bg-white/10 border border-white/20 text-white placeholder-white/40 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#17c3ce] transition"
          />
        </div>
        <div>
          <label className="text-white text-xs font-bold mb-1 block">Contraseña:</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-white/10 border border-white/20 text-white placeholder-white/40 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#17c3ce] transition"
          />
          {!isRegister && (
            <button type="button" className="block ml-auto mt-2 text-right text-xs font-bold text-white/70 hover:text-[#f7e7a3] transition-colors">
              ¿Olvidaste tu contraseña?
            </button>
          )}
        </div>
        {isRegister && (
          <div>
            <label className="text-white text-xs font-bold mb-1 block">Confirmar contraseña:</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white/10 border border-white/20 text-white placeholder-white/40 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#17c3ce] transition"
            />
          </div>
        )}

        {error && (
          <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-3 py-2 text-red-300 text-xs">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#17c3ce] text-white font-extrabold py-3 rounded-full text-sm mt-2 hover:bg-[#12a8b3] active:scale-95 transition-all disabled:opacity-60"
        >
          {loading ? "Cargando..." : isRegister ? "Registrar" : "Iniciar sesión"}
        </button>
      </form>

      <div className="flex items-center justify-center mt-7 text-sm">
        <button
          type="button"
          onClick={() => { setIsRegister(!isRegister); setConfirmPassword(""); setError(""); }}
          className="text-white/70 hover:text-[#f7e7a3] transition-colors duration-200"
        >
          {isRegister ? "Ya tengo cuenta" : "Regístrate"}
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   SCREEN 2 — Home Docente
════════════════════════════════════════════════════════════ */
function HomeScreen({
  user, role, reports, onNewReport, onTab, tab, onCancelReport,
}: {
  user: User; role: Role; reports: Report[];
  onNewReport: (cat?: Category) => void;
  onCancelReport?: (id: string) => void;
  onTab: (t: Tab) => void; tab: Tab;
}) {
  const myReports = reports.filter((r) => r.reportedByUid === user.uid && r.status !== "Cancelado").slice(0, 3);
  const [openReport, setOpenReport] = useState<string | null>(null);
  const [confirmReport, setConfirmReport] = useState<string | null>(null);

  return (
    <>
      <NavHeader title="Docente" />
      <div className="flex-1 overflow-y-auto bg-[#f4f6fb] scrollbar-hide">
        <div className="px-4 pt-5 pb-4 space-y-4">
          <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <h2 className="text-[#0e1f4d] text-lg font-extrabold leading-snug mb-3">
              ¿Qué problema desea reportar hoy?
            </h2>

            <button
              onClick={() => onNewReport()}
              className="w-full bg-[#17c3ce] text-white font-extrabold py-3 rounded-full text-sm shadow-md hover:bg-[#12a8b3] active:scale-95 transition-all"
            >
              Reportar nueva falla
            </button>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <h3 className="text-[#0e1f4d] text-sm font-extrabold mb-3">Selección rápida por categoría</h3>
            <div className="grid grid-cols-3 gap-3">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => onNewReport(cat)}
                  className="bg-[#f8fafc] rounded-2xl p-3 flex flex-col items-center gap-1.5 shadow-sm hover:shadow-md active:scale-95 transition-all border border-gray-100"
                >
                  <span className="text-2xl">{CAT_ICON[cat]}</span>
                  <span className="text-[10px] text-[#0e1f4d] font-bold text-center leading-tight">{cat}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <h3 className="text-[#0e1f4d] text-sm font-extrabold mb-3">Mis reportes recientes</h3>
            {myReports.length === 0 ? (
              <p className="text-gray-400 text-xs text-center py-4">Sin reportes aún</p>
            ) : (
              <div className="space-y-2">
                {myReports.map((r) => (
                  <div key={r.id} className="bg-[#f8fafc] rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm border border-gray-100">
                    <span className={`w-2.5 h-2.5 rounded-full flex-none ${PRIORITY_DOT[r.priority]}`} />
                    <span className="flex-1 text-xs text-[#0e1f4d] font-semibold leading-snug">{r.elemento} · {r.salon}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-none ${STATUS_BADGE[r.status]}`}>
                        {r.status}
                      </span>
                      {r.status !== "Resuelto" && r.status !== "Cancelado" && onCancelReport && (
                        <div className="relative">
                          <button
                            type="button"
                            aria-label={`Opciones de ${r.description}`}
                            onClick={() => setOpenReport(openReport === r.id ? null : r.id)}
                            className="w-7 h-7 rounded-lg text-slate-400 text-sm font-extrabold leading-none hover:bg-slate-200 transition"
                          >
                            ...
                          </button>
                          {openReport === r.id && (
                            <div className="absolute right-0 top-8 z-10 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                              <button
                                type="button"
                                onClick={() => { setOpenReport(null); setConfirmReport(r.id); }}
                                className="whitespace-nowrap rounded-lg px-3 py-2 text-xs font-extrabold text-red-600 hover:bg-red-50"
                              >
                                Cancelar reporte
                              </button>
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
        </div>
      </div>
      <TabBar active={tab} onChange={onTab} />
      {confirmReport && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0e1f4d]/30 p-5">
          <div className="w-full rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-[#0e1f4d] text-base font-extrabold">¿Cancelar este reporte?</h3>
            <p className="text-slate-500 text-xs mt-2">Esta acción retirará el reporte de tu lista.</p>
            <div className="grid grid-cols-2 gap-2 mt-5">
              <button type="button" onClick={() => setConfirmReport(null)} className="rounded-xl border border-slate-200 py-2.5 text-xs font-extrabold text-slate-600 hover:bg-slate-50">Volver</button>
              <button type="button" onClick={() => { onCancelReport?.(confirmReport); setConfirmReport(null); }} className="rounded-xl bg-red-600 py-2.5 text-xs font-extrabold text-white hover:bg-red-700">Cancelar reporte</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ════════════════════════════════════════════════════════════
   SCREEN 3 — Nueva falla
════════════════════════════════════════════════════════════ */
function NuevaFallaScreen({
  user, role, preCategory, onBack, demoMode, onDemoAdd,
}: {
  user: User; role: Role; preCategory?: Category; onBack: () => void;
  demoMode?: boolean; onDemoAdd?: (r: Report) => void;
}) {
  const isLockedByCategory = Boolean(preCategory);
  const [salon, setSalon] = useState("");
  const [elemento, setElemento] = useState<string>(preCategory ?? "Minisplit/Clima");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("Media");
  const [category, setCategory] = useState<Category>(preCategory ?? "Minisplit/Clima");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (preCategory) {
      setCategory(preCategory);
      setElemento(preCategory);
    }
  }, [preCategory]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    const reportedBy = user.displayName || user.email?.split("@")[0] || "Usuario";
    if (demoMode) {
      onDemoAdd?.({
        id: `demo-${Date.now()}`,
        category, priority, salon, elemento, description,
        status: "Pendiente",
        reportedBy,
        reportedByUid: user.uid ?? "demo",
        role,
        createdAt: null,
      });
      setSent(true);
      setSending(false);
      setTimeout(onBack, 1500);
      return;
    }
    try {
      await addDoc(collection(db!, "reports"), {
        category, priority, salon, elemento, description,
        status: "Pendiente" as Status,
        reportedBy,
        reportedByUid: user.uid,
        role,
        createdAt: serverTimestamp(),
      });
      setSent(true);
      setTimeout(onBack, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white gap-4">
        <div className="text-5xl">✅</div>
        <p className="text-[#0e1f4d] font-extrabold text-lg">¡Reporte enviado!</p>
        <p className="text-gray-400 text-sm">Volviendo al inicio...</p>
      </div>
    );
  }

  return (
    <>
      <NavHeader title={role === "admin" ? "Administracion" : role === "tecnico" ? "Tecnico" : "Docente"} />
      <div className="flex-1 overflow-y-auto bg-[#f3f6fb] px-5 py-6 scrollbar-hide">
        <div className="flex h-full flex-col justify-center">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] space-y-5">
            <h2 className="text-[#0e1f4d] text-base font-extrabold">¿Dónde está el problema?</h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[#0e1f4d] text-xs font-bold mb-1 block">Salón/Área:</label>
                <div className="relative">
                  <select
                    required
                    value={salon}
                    onChange={(e) => setSalon(e.target.value)}
                    className="w-full appearance-none border border-slate-200 rounded-xl px-3 py-2.5 pr-8 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:border-[#17c3ce] transition"
                  >
                    <option value="" disabled>Selecciona un aula o área</option>
                    {AREAS.map((area) => <option key={area} value={area}>{area}</option>)}
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">▼</span>
                </div>
              </div>
              <div>
                <label className="text-[#0e1f4d] text-xs font-bold mb-1 block">Elemento específico:</label>
                <div className="relative">
                  <select
                    value={elemento}
                    onChange={(e) => {
                      setElemento(e.target.value);
                      setCategory(e.target.value as Category);
                    }}
                    disabled={isLockedByCategory}
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm appearance-none focus:outline-none transition pr-7 ${
                      isLockedByCategory
                        ? "border-slate-300 bg-slate-200 text-slate-600 cursor-not-allowed"
                        : "border-slate-200 bg-white text-slate-700 focus:border-[#17c3ce]"
                    }`}
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">▼</span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-[#0e1f4d] text-xs font-bold mb-1 block">Descripción del problema:</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Agrega una descripción corta del problema"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-slate-50 resize-none focus:outline-none focus:border-[#17c3ce] transition"
              />
            </div>

            <div>
              <label className="text-[#0e1f4d] text-xs font-bold mb-1 block">Prioridad percibida:</label>
              <div className="flex gap-2">
                {(["Urgente", "Media", "Baja"] as Priority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex-1 py-2 rounded-full text-xs font-extrabold border transition-all ${
                      priority === p
                        ? p === "Urgente" ? "bg-red-500 text-white border-red-500"
                          : p === "Media" ? "bg-amber-400 text-white border-amber-400"
                          : "bg-green-500 text-white border-green-500"
                        : "border-slate-200 text-slate-500 bg-white"
                    }`}
                  >
                    {PRIORITY_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[#0e1f4d] text-xs font-bold mb-1 block">Fotografía (Opcional):</label>
              <button type="button" className="bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-slate-200 transition">
                + Tomar foto
              </button>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3 px-5 py-3 bg-white border-t border-slate-100 flex-none">
        <button type="button" onClick={onBack} className="flex-1 border border-slate-300 text-slate-600 font-bold py-2.5 rounded-full text-sm hover:bg-slate-50 transition">
          Cancelar
        </button>
        <button type="submit" disabled={sending} className="flex-1 bg-[#17c3ce] text-white font-extrabold py-2.5 rounded-full text-sm hover:bg-[#12a8b3] active:scale-95 transition-all shadow disabled:opacity-60">
          {sending ? "Enviando..." : "Enviar Reporte"}
        </button>
      </form>
    </>
  );
}

/* ════════════════════════════════════════════════════════════
   SCREEN 4 — Mantenimiento (Técnico)
════════════════════════════════════════════════════════════ */
function MantenimientoScreen({
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
              {!readOnly && <div className="flex gap-2 mt-3 flex-wrap">
                <button onClick={() => onDetail(r.id)} className="text-xs font-bold text-[#0e1f4d] border border-gray-200 px-3 py-1.5 rounded-full hover:bg-gray-50 transition">
                  Ver detalles
                </button>
                <button className="text-xs font-bold text-[#17c3ce] border border-[#17c3ce]/30 px-3 py-1.5 rounded-full hover:bg-[#17c3ce]/10 transition">
                  Notificar arreglo 🔔
                </button>
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

/* ════════════════════════════════════════════════════════════
   SCREEN 5 — Detalle del reporte
════════════════════════════════════════════════════════════ */
function DetalleScreen({
  report, onBack, demoMode, onDemoUpdate, onMaterialRequest,
}: {
  report: Report; onBack: () => void;
  demoMode?: boolean; onDemoUpdate?: (id: string, data: Partial<Report>) => void;
  onMaterialRequest?: (request: MaterialRequest) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<"avance" | "material" | null>(null);
  const [progressStatus, setProgressStatus] = useState<"En proceso" | "Pendiente">("En proceso");
  const [pendingReason, setPendingReason] = useState("Alumnos en clase");
  const [progressNotes, setProgressNotes] = useState("");
  const [evidenceName, setEvidenceName] = useState("");
  const [material, setMaterial] = useState("");
  const [materialObservation, setMaterialObservation] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");

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
      await persistReport({
        status: progressStatus,
        motivoPendiente: progressStatus === "Pendiente" ? pendingReason : "",
        notasAvance: progressNotes,
        evidenciaNombre: evidenceName,
      });
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
          material,
          observation: materialObservation,
          estimatedCost: Number(estimatedCost) || 0,
          requestedBy: "Técnico de mantenimiento",
          status: "Pendiente de aprobación",
          createdAt: null,
        });
        setActionMessage("Solicitud de material enviada");
      } else {
        const request = await addDoc(collection(db!, "materialRequests"), {
          reportId: report.id,
          material,
          observation: materialObservation,
          estimatedCost: Number(estimatedCost) || 0,
          requestedBy: report.reportedBy,
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

  async function handleResolve() {
    setSaving(true);
    try {
      await persistReport({ status: "Resuelto" });
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
      <NavHeader title="Tecnico" />
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
          <div className="relative">
            <button
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Más opciones"
                className="w-9 h-9 rounded-xl border border-slate-200 bg-white text-[#0e1f4d] text-lg font-extrabold leading-none hover:bg-slate-50 transition"
            >
              ...
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-11 z-10 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_12px_30px_rgba(15,23,42,0.16)]">
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
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4 space-y-1.5 text-xs">
          <p><span className="font-bold text-gray-400">Ubicación:</span> <span className="text-[#0e1f4d] font-bold ml-1">{report.salon}</span></p>
          <p><span className="font-bold text-gray-400">Solicitante:</span> <span className="text-[#0e1f4d] font-bold ml-1">{report.reportedBy}</span></p>
          <p><span className="font-bold text-gray-400">Categoría:</span> <span className="text-[#0e1f4d] font-bold ml-1">{CAT_ICON[report.category]} {report.category}</span></p>
          <p><span className="font-bold text-gray-400">Elemento:</span> <span className="text-[#0e1f4d] font-bold ml-1">{report.elemento}</span></p>
          <p><span className="font-bold text-gray-400">Prioridad:</span> <span className={`font-extrabold ml-1 ${PRIORITY_BADGE[report.priority]}`}>{PRIORITY_LABELS[report.priority]}</span></p>
          {report.description && <p><span className="font-bold text-gray-400">Descripción:</span> <span className="text-[#0e1f4d] ml-1">{report.description}</span></p>}
        </div>

        <div>
          <p className="text-xs font-bold text-gray-400 mb-1.5">Foto del reporte:</p>
          <div className="w-full h-32 bg-gradient-to-b from-sky-200 to-green-200 rounded-2xl flex items-end justify-center overflow-hidden">
            <div className="w-full h-10 bg-green-400 rounded-t-full" />
          </div>
        </div>

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
                <input type="file" accept="image/*" onChange={(e) => setEvidenceName(e.target.files?.[0]?.name ?? "")} className="hidden" />
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

      <div className="flex flex-col items-center gap-2 px-5 pt-3 pb-6 bg-white border-t border-gray-100 flex-none">
        {actionMessage && <p className="text-center text-xs font-bold text-emerald-600">{actionMessage}</p>}
        <button onClick={() => void handleResolve()} disabled={saving || report.status === "Cancelado"} className="w-full max-w-xs bg-[#17c3ce] text-white font-extrabold py-3 px-5 rounded-full text-sm hover:bg-[#12a8b3] transition disabled:opacity-60">
          {saving ? "Guardando..." : "Marcar como resuelto"}
        </button>
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════
   SCREEN 6 — Historial
════════════════════════════════════════════════════════════ */
function HistorialScreen({ reports, materialRequests, role, onTab, tab }: { reports: Report[]; materialRequests: MaterialRequest[]; role: Role; onTab: (t: Tab) => void; tab: Tab }) {
  const currentDate = new Date();
  const monthName = currentDate.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  const isCurrentMonth = (timestamp: Timestamp | null) => {
    if (!timestamp) return true;
    const date = timestamp.toDate();
    return date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();
  };
  const visibleReports = reports.filter((report) => report.status === "Resuelto");
  const monthlyReports = visibleReports.filter((report) => isCurrentMonth(report.createdAt));
  const monthlyPurchases = materialRequests.filter((request) => request.status === "Aprobada" && isCurrentMonth(request.createdAt));
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
            <div key={r.id} className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
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
            </div>
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

/* ─── Administrador ─────────────────────────────────────── */
function AdminScreen({
  reports, requests, onTab, tab, onOpenFailures, onOpenMaterials, onNewReport, onCancelReport,
}: {
  reports: Report[];
  requests: MaterialRequest[];
  onTab: (t: Tab) => void;
  tab: Tab;
  onOpenFailures: () => void;
  onOpenMaterials: () => void;
  onNewReport: (cat?: Category) => void;
  onCancelReport: (id: string) => void;
}) {
  const activeFailures = reports.filter((report) => report.status !== "Resuelto" && report.status !== "Cancelado").length;
  const pendingRequests = requests.filter((request) => request.status === "Pendiente de aprobación");
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
        </div>

        <div className="space-y-4">
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
                  <div key={report.id} className="bg-[#f8fafc] rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm border border-gray-100">
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
                ))}
              </div>
            )}
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

function AdminMaterialScreen({
  requests, onRequestStatus, onTab, tab,
}: {
  requests: MaterialRequest[];
  onRequestStatus: (id: string, status: "Aprobada" | "Rechazada") => void;
  onTab: (t: Tab) => void;
  tab: Tab;
}) {
  const pendingRequests = requests.filter((request) => request.status === "Pendiente de aprobación");

  return (
    <>
      <NavHeader title="Administracion" />
      <div className="flex-1 overflow-y-auto bg-[#f4f6fb] px-4 py-5 scrollbar-hide">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#17c3ce]">Finanzas / Administración</p>
        <h1 className="text-[#0e1f4d] text-xl font-extrabold mt-1 mb-5">Material pendiente</h1>
        <div className="space-y-3">
          {pendingRequests.map((request) => (
            <div key={request.id} className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-lg flex-none">🧰</div>
                <div className="min-w-0 flex-1">
                  <p className="text-[#0e1f4d] text-sm font-extrabold leading-snug">{request.material}</p>
                  <p className="text-slate-500 text-xs mt-1 leading-snug">{request.observation}</p>
                  <p className="text-emerald-700 text-xs font-extrabold mt-2">Costo aproximado: ${(request.estimatedCost ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
                  <p className="text-slate-400 text-[10px] font-bold mt-2">Solicitado por {request.requestedBy} · {timeAgo(request.createdAt)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <button onClick={() => onRequestStatus(request.id, "Rechazada")} className="rounded-xl border border-red-200 bg-red-50 py-2.5 text-xs font-extrabold text-red-600 hover:bg-red-100 transition">Rechazar</button>
                <button onClick={() => onRequestStatus(request.id, "Aprobada")} className="rounded-xl bg-[#17c3ce] py-2.5 text-xs font-extrabold text-white hover:bg-[#12a8b3] transition">Aprobar compra</button>
              </div>
            </div>
          ))}
          {pendingRequests.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 py-12 text-center text-sm text-slate-400">No hay autorizaciones pendientes</div>}
        </div>
      </div>
      <TabBar active={tab} onChange={onTab} admin />
    </>
  );
}

/* ─── Perfil ─────────────────────────────────────────────── */
function UsuariosScreen({ users, onAddTechnician, onDeleteUser, onOpenUsers, onViewAllUsers, onTab, tab }: {
  users: AppUser[];
  onAddTechnician: (email: string, temporaryPassword: string, role: "tecnico" | "admin") => void;
  onDeleteUser: (id: string) => void;
  onOpenUsers: (role: "tecnico" | "docente") => void;
  onViewAllUsers: () => void;
  onTab: (t: Tab) => void;
  tab: Tab;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<"tecnico" | "admin">("tecnico");
  const [selectedMetric, setSelectedMetric] = useState<"total" | "tecnico" | "docente" | "admin">("total");
  const technicians = users.filter((user) => user.role === "tecnico");
  const teachers = users.filter((user) => user.role === "docente");
  const admins = users.filter((user) => user.role === "admin");
  const metricList = [
    { key: "total", label: "Total", count: users.length, style: "bg-[#0e1f4d] text-white" },
    { key: "tecnico", label: "Técnicos", count: technicians.length, style: "bg-[#17c3ce] text-white" },
    { key: "docente", label: "Docentes", count: teachers.length, style: "bg-white text-[#0e1f4d] border border-slate-200" },
    { key: "admin", label: "Admins", count: admins.length, style: "bg-amber-50 text-amber-900 border border-amber-200" },
  ] as const;

  const visibleUsers = selectedMetric === "total" ? users : users.filter((user) => user.role === selectedMetric);

  function submitTechnician(e: React.FormEvent) {
    e.preventDefault();
    onAddTechnician(email, temporaryPassword, selectedRole);
    setEmail("");
    setTemporaryPassword("");
    setSelectedRole("tecnico");
    setFormOpen(false);
  }

  return (
    <>
      <NavHeader title="Administracion" />
      <div className="flex-1 overflow-y-auto bg-[#f4f6fb] px-4 py-5 scrollbar-hide">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#17c3ce]">Directorio</p>
        <h1 className="text-[#0e1f4d] text-xl font-extrabold mt-1 mb-5">Usuarios registrados</h1>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {metricList.map((metric) => (
            <button
              key={metric.key}
              type="button"
              onClick={() => setSelectedMetric(metric.key)}
              className={`rounded-2xl p-3 text-left shadow-sm transition ${metric.style} ${selectedMetric === metric.key ? "ring-2 ring-[#17c3ce] scale-[1.01]" : ""}`}
            >
              <p className="text-2xl font-extrabold leading-none">{metric.count}</p>
              <p className="text-[9px] font-bold mt-2 uppercase tracking-[0.12em] opacity-75">{metric.label}</p>
            </button>
          ))}
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-3 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#0e1f4d]">
              {selectedMetric === "total" ? "Todos" : selectedMetric === "tecnico" ? "Técnicos" : selectedMetric === "docente" ? "Docentes" : "Administradores"}
            </p>
            <span className="text-[10px] font-extrabold text-slate-500">{visibleUsers.length}</span>
          </div>

          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {visibleUsers.slice(0, 2).map((appUser) => (
              <div key={appUser.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                <div className="w-8 h-8 rounded-full bg-[#17c3ce]/15 flex items-center justify-center text-[#0e1f4d] text-xs font-extrabold">{appUser.email.charAt(0).toUpperCase()}</div>
                <span className="flex-1 min-w-0 truncate text-xs font-bold text-[#0e1f4d]">{appUser.email}</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">{appUser.role}</span>
              </div>
            ))}
            {visibleUsers.length === 0 && <p className="text-center text-xs text-slate-400 py-3">No hay usuarios registrados</p>}
          </div>
          {visibleUsers.length > 2 && (
            <button type="button" onClick={onViewAllUsers} className="w-full mt-3 rounded-xl border border-[#17c3ce]/40 py-2 text-xs font-extrabold text-[#0e1f4d] hover:bg-[#17c3ce]/10 transition">
              Ver mas
            </button>
          )}
        </div>
      </div>
      <div className="flex-none bg-white border-t border-slate-100 px-4 py-3">
        <button onClick={() => setFormOpen(true)} className="w-full rounded-full bg-[#17c3ce] py-3 text-sm font-extrabold text-white hover:bg-[#12a8b3] transition">Agregar usuario</button>
      </div>
      <TabBar active={tab} onChange={onTab} admin />
      {formOpen && (
        <div className="absolute inset-0 z-20 flex items-end bg-[#0e1f4d]/30 p-3">
          <form onSubmit={submitTechnician} className="w-full rounded-[26px] bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#17c3ce]">Nuevo acceso</p><h2 className="text-[#0e1f4d] text-lg font-extrabold mt-1">Agregar usuario</h2></div>
              <button type="button" onClick={() => setFormOpen(false)} className="text-slate-400 text-xl px-2">×</button>
            </div>

            <div className="rounded-full bg-slate-100 p-1 flex gap-1">
              {(["tecnico", "admin"] as const).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSelectedRole(role)}
                  className={`flex-1 rounded-full px-3 py-2 text-xs font-extrabold transition ${selectedRole === role ? "bg-[#0e1f4d] text-white shadow-sm" : "text-slate-500"}`}
                >
                  {role === "tecnico" ? "Tecnico" : "Administrador"}
                </button>
              ))}
            </div>

            <input required type="text" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={selectedRole === "tecnico" ? "Correo del técnico" : "Correo del administrador"} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:border-[#17c3ce]" />
            <input required type="password" value={temporaryPassword} onChange={(e) => setTemporaryPassword(e.target.value)} placeholder="Contraseña temporal" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:border-[#17c3ce]" />
            <button type="submit" className="w-full rounded-full bg-[#0e1f4d] py-3 text-sm font-extrabold text-white hover:bg-[#172b62] transition">Guardar {selectedRole === "tecnico" ? "técnico" : "administrador"}</button>
          </form>
        </div>
      )}
    </>
  );
}

function UsuariosListaScreen({ role, users, onDeleteUser, onTab, tab }: {
  role: "tecnico" | "docente" | "all";
  users: AppUser[];
  onDeleteUser: (id: string) => void;
  onTab: (t: Tab) => void;
  tab: Tab;
}) {
  const label = role === "all" ? "Todos los usuarios" : role === "tecnico" ? "Tecnicos" : "Docentes";
  return (
    <>
      <NavHeader title="Administracion" />
      <div className="flex-1 overflow-y-auto bg-[#f4f6fb] px-4 py-5 scrollbar-hide">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#17c3ce]">Directorio</p>
        <h1 className="text-[#0e1f4d] text-xl font-extrabold mt-1 mb-5">{label}</h1>
        <UserList users={role === "all" ? users : users.filter((user) => user.role === role)} onDeleteUser={onDeleteUser} />
      </div>
      <TabBar active="usuarios" onChange={onTab} admin />
    </>
  );
}

function UserList({ users, onDeleteUser }: { users: AppUser[]; onDeleteUser: (id: string) => void }) {
  const [openUser, setOpenUser] = useState<string | null>(null);

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-3 mb-2 space-y-2">
      {users.map((appUser) => (
        <div key={appUser.id} className="relative flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
          <div className="w-8 h-8 rounded-full bg-[#17c3ce]/15 flex items-center justify-center text-[#0e1f4d] text-xs font-extrabold">{appUser.email.charAt(0).toUpperCase()}</div>
          <span className="flex-1 min-w-0 truncate text-xs font-bold text-[#0e1f4d]">{appUser.email}</span>
          <button onClick={() => setOpenUser(openUser === appUser.id ? null : appUser.id)} aria-label={`Opciones de ${appUser.email}`} className="text-slate-400 text-lg leading-none px-1 hover:text-[#0e1f4d]">...</button>
          {openUser === appUser.id && <div className="absolute right-2 top-10 z-10 rounded-xl border border-slate-200 bg-white p-1 shadow-lg"><button onClick={() => { if (window.confirm(`¿Seguro que deseas eliminar la cuenta de ${appUser.email}?`)) { onDeleteUser(appUser.id); setOpenUser(null); } }} className="whitespace-nowrap rounded-lg px-3 py-2 text-xs font-extrabold text-red-600 hover:bg-red-50">Eliminar cuenta</button></div>}
        </div>
      ))}
      {users.length === 0 && <p className="text-center text-xs text-slate-400 py-3">No hay usuarios registrados</p>}
    </div>
  );
}

function PerfilScreen({ user, role, onLogout, onTab, tab }: {
  user: User; role: Role; onLogout: () => void; onTab: (t: Tab) => void; tab: Tab;
}) {
  const name = user.displayName || user.email?.split("@")[0] || "Usuario";
  return (
    <>
      <NavHeader title={role === "admin" ? "Administracion" : role === "tecnico" ? "Tecnico" : "Docente"} />
      <div className="flex-1 flex flex-col items-center bg-[#f4f6fb] px-5 pt-8 pb-4 overflow-y-auto scrollbar-hide">
        <img src={logoRfm} alt="BUHSAB" className="w-20 h-20 object-contain mb-3" />
        <p className="text-[#0e1f4d] text-lg font-extrabold">{name}</p>
        <span className="bg-[#17c3ce]/20 text-[#17c3ce] text-xs font-extrabold px-3 py-1 rounded-full mt-1 capitalize">{role}</span>
        <div className="mt-6 w-full space-y-2">
          {[
            ["Institución", "Colegio BUHSAB Bicultural"],
            ["Correo", user.email ?? ""],
          ].map(([k, v]) => (
            <div key={k} className="bg-white rounded-2xl px-4 py-3 flex justify-between border border-gray-100 shadow-sm">
              <span className="text-gray-400 text-xs font-bold">{k}</span>
              <span className="text-[#0e1f4d] text-xs font-extrabold text-right max-w-[55%] truncate">{v}</span>
            </div>
          ))}
        </div>
        <button
          onClick={onLogout}
          className="mt-8 w-full border border-red-300 text-red-500 font-extrabold py-3 rounded-full text-sm hover:bg-red-50 transition"
        >
          Cerrar sesión
        </button>
      </div>
      <TabBar active={tab} onChange={onTab} admin={role === "admin"} />
    </>
  );
}

/* ════════════════════════════════════════════════════════════
   ROOT
════════════════════════════════════════════════════════════ */
type Screen =
  | { name: "login" }
  | { name: "home" }
  | { name: "nueva"; preCategory?: Category; returnTo?: "home" | "admin" }
  | { name: "mantenimiento" }
  | { name: "detalle"; reportId: string }
  | { name: "historial" }
  | { name: "perfil" }
  | { name: "admin" }
  | { name: "admin-fallas" }
  | { name: "admin-materiales" }
  | { name: "usuarios" }
  | { name: "usuarios-list"; role: "tecnico" | "docente" | "all" };

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>("docente");
  const [authLoading, setAuthLoading] = useState(firebaseConfigured);
  const [screen, setScreen] = useState<Screen>({ name: "login" });
  const [tab, setTab] = useState<Tab>("home");
  const [reports, setReports] = useState<Report[]>(firebaseConfigured ? [] : DEMO_REPORTS);
  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>(firebaseConfigured ? [] : DEMO_MATERIAL_REQUESTS);
  const [appUsers, setAppUsers] = useState<AppUser[]>(firebaseConfigured ? [] : DEMO_USERS);
  // Demo mode user substitute
  const [demoUser] = useState({ uid: "demo-uid", email: "demo@buhsab.mx", displayName: "Demo" });

  // Firebase Auth listener — only when configured
  useEffect(() => {
    const a = auth;
    if (!firebaseConfigured || !a) return;
    return onAuthStateChanged(a, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (!u) setScreen({ name: "login" });
    });
  }, []);

  // Registered application users — used by the administrator directory
  useEffect(() => {
    const d = db;
    if (!firebaseConfigured || !d) return;
    return onSnapshot(collection(d, "users"), (snap) => {
      setAppUsers(snap.docs.map((userDoc) => ({ id: userDoc.id, ...userDoc.data() } as AppUser)));
    });
  }, []);

  // Material requests listener — used by the administrator dashboard
  useEffect(() => {
    const d = db;
    if (!firebaseConfigured || !d) return;
    const q = query(collection(d, "materialRequests"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setMaterialRequests(snap.docs.map((requestDoc) => ({ id: requestDoc.id, ...requestDoc.data() } as MaterialRequest)));
    });
  }, []);

  // Firestore real-time listener — only when configured
  useEffect(() => {
    const d = db;
    if (!firebaseConfigured || !d) return;
    const q = query(collection(d, "reports"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setReports(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Report)));
    });
  }, []);

  const effectiveUser = firebaseConfigured ? user : (demoUser as unknown as User);

  function handleLogin(u: User | null, r: Role) {
    setUser(u);
    setRole(r);
    setScreen(r === "tecnico" ? { name: "mantenimiento" } : r === "admin" ? { name: "admin" } : { name: "home" });
    setTab("home");
  }

  async function handleRequestStatus(id: string, status: "Aprobada" | "Rechazada") {
    if (firebaseConfigured && db) {
      await updateDoc(doc(db, "materialRequests", id), { status });
    } else {
      setMaterialRequests((current) => current.map((request) => request.id === id ? { ...request, status } : request));
    }
  }

  async function handleAddTechnician(email: string, temporaryPassword: string, role: "tecnico" | "admin") {
    const newUser: AppUser = {
      id: `user-${Date.now()}`,
      email,
      role,
      temporaryPassword,
    };
    if (firebaseConfigured && db) {
      const created = await addDoc(collection(db, "users"), {
        email,
        role,
        temporaryPassword,
        createdAt: serverTimestamp(),
      });
      setAppUsers((current) => [...current, { ...newUser, id: created.id }]);
    } else {
      setAppUsers((current) => [...current, newUser]);
    }
  }

  async function handleDeleteUser(id: string) {
    if (firebaseConfigured && db) {
      await deleteDoc(doc(db, "users", id));
    }
    setAppUsers((current) => current.filter((appUser) => appUser.id !== id));
  }

  async function handleCancelReportByTeacher(id: string) {
    if (firebaseConfigured && db) {
      await updateDoc(doc(db, "reports", id), { status: "Cancelado" });
    }
    setReports((current) => current.map((report) => report.id === id ? { ...report, status: "Cancelado" } : report));
  }

  async function handleLogout() {
    if (firebaseConfigured && auth) await signOut(auth);
    setUser(null);
    setScreen({ name: "login" });
    setTab("home");
  }

  function handleTab(t: Tab) {
    setTab(t);
    if (t === "home") setScreen(role === "tecnico" ? { name: "mantenimiento" } : role === "admin" ? { name: "admin" } : { name: "home" });
    else if (t === "usuarios" && role === "admin") setScreen({ name: "usuarios" });
    else if (t === "reportes") setScreen({ name: "historial" });
    else if (t === "perfil") setScreen({ name: "perfil" });
  }

  const selectedReport = screen.name === "detalle"
    ? reports.find((r) => r.id === (screen as { name: "detalle"; reportId: string }).reportId)
    : undefined;

  if (authLoading) {
    return (
      <Shell>
        <div className="flex-1 flex items-center justify-center bg-[#0e1f4d]">
          <img src={logoRfm} alt="RFM" className="w-24 h-24 object-contain animate-pulse" />
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {/* Demo banner */}
      {!firebaseConfigured && screen.name !== "login" && (
        <div className="bg-amber-400 text-[#0e1f4d] text-[10px] font-extrabold text-center py-1 flex-none">
          MODO DEMO — configura Firebase para guardar datos reales
        </div>
      )}

      {screen.name === "login" && (
        <LoginScreen onLogin={handleLogin} demoMode={!firebaseConfigured} />
      )}

      {screen.name === "home" && effectiveUser && (
        <HomeScreen
          user={effectiveUser} role={role} reports={reports}
          onNewReport={(cat) => setScreen({ name: "nueva", preCategory: cat })}
          onCancelReport={role === "docente" ? handleCancelReportByTeacher : undefined}
          onTab={handleTab} tab={tab}
        />
      )}

      {screen.name === "nueva" && effectiveUser && (
        <NuevaFallaScreen
          user={effectiveUser} role={role}
          preCategory={(screen as { name: "nueva"; preCategory?: Category }).preCategory}
          onBack={() => setScreen((screen as { name: "nueva"; returnTo?: "home" | "admin" }).returnTo === "admin" ? { name: "admin" } : { name: "home" })}
          demoMode={!firebaseConfigured}
          onDemoAdd={(r) => setReports((prev) => [r, ...prev])}
        />
      )}

      {screen.name === "mantenimiento" && (
        <MantenimientoScreen
          reports={reports}
          onDetail={(id) => setScreen({ name: "detalle", reportId: id })}
          onTab={handleTab} tab={tab}
        />
      )}

      {screen.name === "admin-fallas" && (
        <MantenimientoScreen reports={reports} onDetail={() => undefined} onTab={handleTab} tab={tab} readOnly title="Administracion" admin />
      )}

      {screen.name === "admin-materiales" && (
        <AdminMaterialScreen requests={materialRequests} onRequestStatus={(id, status) => void handleRequestStatus(id, status)} onTab={handleTab} tab={tab} />
      )}

      {screen.name === "detalle" && selectedReport && (
        <DetalleScreen
          report={selectedReport}
          onBack={() => setScreen({ name: "mantenimiento" })}
          demoMode={!firebaseConfigured}
          onDemoUpdate={(id, data) =>
            setReports((prev) => prev.map((r) => r.id === id ? { ...r, ...data } : r))
          }
          onMaterialRequest={(request) => setMaterialRequests((current) => [request, ...current])}
        />
      )}

      {screen.name === "historial" && (
        <HistorialScreen reports={reports} materialRequests={materialRequests} role={role} onTab={handleTab} tab={tab} />
      )}

      {screen.name === "usuarios" && (
        <UsuariosScreen users={appUsers} onAddTechnician={(email, temporaryPassword, role) => void handleAddTechnician(email, temporaryPassword, role)} onDeleteUser={(id) => void handleDeleteUser(id)} onOpenUsers={(userRole) => setScreen({ name: "usuarios-list", role: userRole })} onViewAllUsers={() => setScreen({ name: "usuarios-list", role: "all" })} onTab={handleTab} tab={tab} />
      )}

      {screen.name === "usuarios-list" && (
        <UsuariosListaScreen role={screen.role} users={appUsers} onDeleteUser={(id) => void handleDeleteUser(id)} onTab={handleTab} tab={tab} />
      )}

      {screen.name === "perfil" && effectiveUser && (
        <PerfilScreen user={effectiveUser} role={role} onLogout={handleLogout} onTab={handleTab} tab={tab} />
      )}

      {screen.name === "admin" && (
        <AdminScreen
          reports={reports}
          requests={materialRequests}
          onTab={handleTab}
          tab={tab}
          onOpenFailures={() => setScreen({ name: "admin-fallas" })}
          onOpenMaterials={() => setScreen({ name: "admin-materiales" })}
          onNewReport={(cat) => setScreen({ name: "nueva", preCategory: cat, returnTo: "admin" })}
          onCancelReport={(id) => void handleCancelReportByTeacher(id)}
        />
      )}
    </Shell>
  );
}
