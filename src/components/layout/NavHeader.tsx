import logoRfm from "@/assets/logo_buhsab.png";

export function NavHeader({
  title,
  onBack,
  onOpenNotices,
}: {
  title?: string;
  onBack?: () => void;
  onOpenNotices?: () => void;
}) {
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
      {onOpenNotices && (
        <button
          type="button"
          onClick={onOpenNotices}
          aria-label="Abrir avisos de trabajo"
          title="Avisos de trabajo"
          className="ml-2 flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#17c3ce]"
        >
          <svg
            aria-hidden="true"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
            <path d="M10 21h4" />
          </svg>
        </button>
      )}
    </div>
  );
}
