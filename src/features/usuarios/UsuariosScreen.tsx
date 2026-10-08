import { useState } from "react";
import { NavHeader } from "@/components/layout/NavHeader";
import { TabBar } from "@/components/layout/TabBar";
import type { AppUser, Tab } from "@/types";

export function UsuariosScreen({ users, onAddTechnician, onDeleteUser, onOpenUsers, onViewAllUsers, onTab, tab }: {
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
