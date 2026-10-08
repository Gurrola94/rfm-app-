import { useState } from "react";
import type { AppUser } from "@/types";

export function UserList({ users, onDeleteUser }: { users: AppUser[]; onDeleteUser: (id: string) => void }) {
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
