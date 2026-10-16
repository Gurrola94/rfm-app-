import { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, User } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "@/lib/firebase";
import logoRfm from "@/assets/logo_buhsab.png";
import type { Role } from "@/types";

export function LoginScreen({ onLogin, demoMode }: { onLogin: (u: User | null, role: Role, email?: string) => void; demoMode?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetStep, setResetStep] = useState<"email" | "code" | "password">("email");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const emailPlaceholder = "correo@buhsab.mx";

  function closeResetModal() {
    setResetOpen(false);
    setResetStep("email");
    setResetEmail("");
    setResetCode("");
    setResetPassword("");
    setResetConfirmPassword("");
    setResetError("");
  }

  function resetErrorMessage(resetError: unknown) {
    if (!(resetError instanceof Error)) return "Ocurrió un error. Intenta de nuevo.";
    const code = "code" in resetError && typeof resetError.code === "string" ? resetError.code : "";
    if (code.endsWith("not-found")) return "No encontramos una cuenta registrada con ese correo.";
    if (code.endsWith("invalid-argument")) return resetError.message;
    if (code.endsWith("resource-exhausted")) return resetError.message || "Se alcanzó el límite de intentos. Intenta más tarde.";
    if (code.endsWith("deadline-exceeded")) return "El código venció. Solicita uno nuevo.";
    return resetError.message.replace(/^Firebase:\s*/, "") || "No se pudo completar la recuperación.";
  }

  async function handleRequestResetCode(event: React.FormEvent) {
    event.preventDefault();
    setResetError("");
    if (!functions || demoMode) {
      setResetError("La recuperación por correo no está disponible en modo demostración.");
      return;
    }
    setResetLoading(true);
    try {
      const requestCode = httpsCallable<{ email: string }, { sent: boolean }>(functions, "requestPasswordResetCode");
      await requestCode({ email: resetEmail.trim() });
      setResetStep("code");
    } catch (requestError) {
      setResetError(resetErrorMessage(requestError));
    } finally {
      setResetLoading(false);
    }
  }

  async function handleVerifyResetCode(event: React.FormEvent) {
    event.preventDefault();
    setResetError("");
    if (!functions) return;
    setResetLoading(true);
    try {
      const verifyCode = httpsCallable<{ email: string; code: string }, { valid: boolean }>(functions, "verifyPasswordResetCode");
      await verifyCode({ email: resetEmail.trim(), code: resetCode.trim() });
      setResetStep("password");
    } catch (verificationError) {
      setResetError(resetErrorMessage(verificationError));
    } finally {
      setResetLoading(false);
    }
  }

  async function handleCompletePasswordReset(event: React.FormEvent) {
    event.preventDefault();
    setResetError("");
    if (resetPassword !== resetConfirmPassword) {
      setResetError("Las contraseñas no coinciden.");
      return;
    }
    if (resetPassword.length < 6) {
      setResetError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (!functions) return;
    setResetLoading(true);
    try {
      const completeReset = httpsCallable<{ email: string; code: string; newPassword: string }, { updated: boolean }>(functions, "completePasswordReset");
      await completeReset({ email: resetEmail.trim(), code: resetCode.trim(), newPassword: resetPassword });
      closeResetModal();
      setError("Contraseña actualizada. Ya puedes iniciar sesión.");
    } catch (completionError) {
      setResetError(resetErrorMessage(completionError));
    } finally {
      setResetLoading(false);
    }
  }

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
            <button type="button" onClick={() => { setResetOpen(true); setResetEmail(email); setResetError(""); }} className="block ml-auto mt-2 text-right text-xs font-bold text-white/70 hover:text-[#f7e7a3] transition-colors">
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
      {resetOpen && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#07112d]/70 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="password-reset-title" className="w-full rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#17c3ce]">Recuperación de cuenta</p>
                <h2 id="password-reset-title" className="mt-1 text-lg font-extrabold text-[#0e1f4d]">
                  {resetStep === "email" ? "Restablecer contraseña" : resetStep === "code" ? "Verifica tu correo" : "Crea una contraseña nueva"}
                </h2>
              </div>
              <button type="button" onClick={closeResetModal} aria-label="Cerrar" className="-mr-2 -mt-2 rounded-lg px-2 py-1 text-xl text-slate-400 hover:bg-slate-100">×</button>
            </div>

            {resetStep === "email" && (
              <form onSubmit={handleRequestResetCode} className="mt-4 space-y-3">
                <p className="text-xs leading-relaxed text-slate-500">Ingresa el correo asociado a tu cuenta. Te enviaremos un código de verificación.</p>
                <input required type="email" autoComplete="email" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} placeholder={emailPlaceholder} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 focus:outline-none focus:border-[#17c3ce]" />
                {resetError && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{resetError}</p>}
                <button type="submit" disabled={resetLoading} className="w-full rounded-full bg-[#17c3ce] py-3 text-sm font-extrabold text-white hover:bg-[#12a8b3] disabled:opacity-60">{resetLoading ? "Enviando..." : "Enviar código"}</button>
              </form>
            )}

            {resetStep === "code" && (
              <form onSubmit={handleVerifyResetCode} className="mt-4 space-y-3">
                <p className="text-xs leading-relaxed text-slate-500">Escribe el código de 6 dígitos enviado a <strong className="text-slate-700">{resetEmail}</strong>.</p>
                <input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={resetCode} onChange={(event) => setResetCode(event.target.value.replace(/\D/g, ""))} placeholder="000000" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-center text-lg font-extrabold tracking-[0.3em] text-slate-800 focus:outline-none focus:border-[#17c3ce]" />
                {resetError && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{resetError}</p>}
                <button type="submit" disabled={resetLoading} className="w-full rounded-full bg-[#17c3ce] py-3 text-sm font-extrabold text-white hover:bg-[#12a8b3] disabled:opacity-60">{resetLoading ? "Verificando..." : "Verificar código"}</button>
              </form>
            )}

            {resetStep === "password" && (
              <form onSubmit={handleCompletePasswordReset} className="mt-4 space-y-3">
                <input required type="password" minLength={6} autoComplete="new-password" value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} placeholder="Nueva contraseña" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 focus:outline-none focus:border-[#17c3ce]" />
                <input required type="password" minLength={6} autoComplete="new-password" value={resetConfirmPassword} onChange={(event) => setResetConfirmPassword(event.target.value)} placeholder="Confirmar nueva contraseña" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 focus:outline-none focus:border-[#17c3ce]" />
                {resetError && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{resetError}</p>}
                <button type="submit" disabled={resetLoading} className="w-full rounded-full bg-[#17c3ce] py-3 text-sm font-extrabold text-white hover:bg-[#12a8b3] disabled:opacity-60">{resetLoading ? "Actualizando..." : "Guardar contraseña"}</button>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
