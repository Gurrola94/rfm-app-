import logoRfm from "@/assets/logo_buhsab.png";

export function NavHeader({ title, onBack }: { title?: string; onBack?: () => void }) {
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
