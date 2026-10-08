import type { Tab } from "@/types";

export function TabBar({ active, onChange, admin = false }: { active: Tab; onChange: (t: Tab) => void; admin?: boolean }) {
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
