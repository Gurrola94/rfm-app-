import { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, User } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import logoRfm from "@/assets/logo_buhsab.png";
import type { Role } from "@/types";

export function LoginScreen({ onLogin, demoMode }: { onLogin: (u: User | null, role: Role, email?: string) => void; demoMode?: boolean }) {
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
      setTimeout(() => { onLogin(null, role, email); setLoading(false); }, 600);
      return;
    }
    if (email.toLowerCase() === "admin@b" || email.toLowerCase() === "tecnico@b") {
      onLogin(null, email.toLowerCase() === "admin@b" ? "admin" : "tecnico", email);
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
      onLogin(cred.user, isRegister ? "docente" : email.toLowerCase().includes("tecnico") ? "tecnico" : "docente", email);
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
