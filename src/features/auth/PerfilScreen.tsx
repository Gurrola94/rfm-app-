import { User } from "firebase/auth";
import logoRfm from "@/assets/logo_buhsab.png";
import { NavHeader } from "@/components/layout/NavHeader";
import { TabBar } from "@/components/layout/TabBar";
import type { Role, Tab } from "@/types";

export function PerfilScreen({ user, role, onLogout, onTab, tab }: {
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
