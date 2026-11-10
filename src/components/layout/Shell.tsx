export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="size-full flex items-center justify-center bg-slate-300"
      style={{ fontFamily: "'Nunito', sans-serif" }}
    >
      {/* En el celular ocupa toda la pantalla; en pantallas grandes se muestra como marco de teléfono */}
      <div className="relative w-full h-full bg-white overflow-hidden flex flex-col sm:max-w-sm sm:max-h-[820px] sm:shadow-2xl sm:rounded-3xl">
        {/* Áreas seguras (muesca / barra de estado y barra de gestos). En escritorio miden 0 */}
        <div className="flex-none bg-[#0e1f4d]" style={{ height: "env(safe-area-inset-top, 0px)" }} />
        {children}
        <div className="flex-none bg-white" style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
      </div>
    </div>
  );
}
