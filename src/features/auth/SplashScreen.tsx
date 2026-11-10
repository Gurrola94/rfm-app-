import { useEffect, useRef, useState } from "react";
import logoRfm from "@/assets/logo_buhsab.png";

// Posición de los ojos dentro del logo (en % del tamaño de la imagen)
const EYES = [
  { left: "29.3%", top: "32.5%" },
  { left: "63.6%", top: "32.4%" },
];

/** Pantalla de bienvenida: el logo aparece difuminándose, el búho parpadea y se abre el login. */
export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const leave = setTimeout(() => setLeaving(true), 2600);
    const done = setTimeout(() => doneRef.current(), 3100);
    return () => { clearTimeout(leave); clearTimeout(done); };
  }, []);

  return (
    <div
      onClick={onDone}
      className={`flex-1 flex items-center justify-center bg-[#0e1f4d] cursor-pointer transition-opacity duration-500 ${leaving ? "opacity-0" : "opacity-100"}`}
    >
      <div className="splash-logo relative w-44 h-44">
        <img src={logoRfm} alt="BUHSAB RFM" className="w-full h-full object-contain" />
        {EYES.map((eye, i) => (
          <span key={i} className="splash-eyelid" style={{ left: eye.left, top: eye.top }} />
        ))}
      </div>
    </div>
  );
}
