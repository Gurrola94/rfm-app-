import { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  type User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db, firebaseConfigured } from "@/lib/firebase";
import logoRfm from "@/assets/logo_buhsab.png";
import type { Role } from "@/types";

interface LoginScreenProps {
  onLogin: (user: User | null, role: Role, email?: string) => void;
  demoMode?: boolean;
}

export function LoginScreen({
  onLogin,
  demoMode = false,
}: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const emailPlaceholder = "correo@buhsab.mx";

  // Comprueba que el rol almacenado sea uno de los permitidos.
  function isValidRole(role: unknown): role is Role {
    return (
      role === "docente" ||
      role === "tecnico" ||
      role === "admin"
    );
  }

  // Convierte errores frecuentes de Firebase en mensajes claros.
  function getErrorMessage(err: unknown): string {
    const code =
      typeof err === "object" &&
      err !== null &&
      "code" in err
        ? String(err.code)
        : "";

    switch (code) {
      case "auth/invalid-email":
        return "El correo electrónico no es válido.";
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "El correo o la contraseña son incorrectos.";
      case "auth/email-already-in-use":
        return "Este correo ya tiene una cuenta registrada.";
      case "auth/weak-password":
        return "La contraseña debe tener al menos 6 caracteres.";
      case "auth/too-many-requests":
        return "Demasiados intentos. Inténtalo más tarde.";
      case "auth/network-request-failed":
        return "No se pudo conectar. Revisa tu conexión a internet.";
      case "auth/operation-not-allowed":
        return "El método de acceso no está habilitado en Firebase.";
      default:
        return "Ocurrió un error. Inténtalo nuevamente.";
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    // No permitir accesos simulados desde la pantalla de autenticación.
    if (demoMode || !firebaseConfigured || !auth || !db) {
      setError(
        "Firebase no está configurado. El inicio de sesión real no está disponible."
      );
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError("Ingresa tu correo y contraseña.");
      return;
    }

    if (isRegister && password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        // El registro público solo puede crear cuentas de docentes.
        const credential = await createUserWithEmailAndPassword(
          auth,
          normalizedEmail,
          password
        );

        try {
          // El UID de Authentication identifica el perfil en Firestore.
          await setDoc(doc(db, "users", credential.user.uid), {
            uid: credential.user.uid,
            email: normalizedEmail,
            role: "docente",
            createdAt: serverTimestamp(),
          });
        } catch {
          // Evita dejar una sesión activa si no se pudo crear el perfil.
          await signOut(auth);
          setError(
            "La cuenta se creó, pero no se pudo guardar su perfil. Contacta al administrador."
          );
          return;
        }

        onLogin(
          credential.user,
          "docente",
          normalizedEmail
        );
        return;
      }

      // Verifica las credenciales mediante Firebase Authentication.
      const credential = await signInWithEmailAndPassword(
        auth,
        normalizedEmail,
        password
      );

      // Consulta el perfil asociado al UID autenticado.
      const profileRef = doc(db, "users", credential.user.uid);
      const profileSnapshot = await getDoc(profileRef);

      if (!profileSnapshot.exists()) {
        await signOut(auth);
        setError(
          "Tu cuenta no tiene un perfil autorizado. Contacta al administrador."
        );
        return;
      }

      const profile = profileSnapshot.data();

      if (!isValidRole(profile.role)) {
        await signOut(auth);
        setError(
          "Tu perfil no tiene un rol válido. Contacta al administrador."
        );
        return;
      }

      // El rol procede del perfil, nunca del correo electrónico.
      onLogin(
        credential.user,
        profile.role,
        credential.user.email ?? normalizedEmail
      );
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  // Envía un correo para restablecer la contraseña.
  async function handlePasswordReset() {
    setError("");

    if (!firebaseConfigured || !auth) {
      setError("Firebase no está configurado.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Escribe tu correo para recuperar tu contraseña.");
      return;
    }

    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
      setError(
        "Si la cuenta existe, recibirás instrucciones para restablecer tu contraseña."
      );
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#0e1f4d] px-8">
      <div className="mb-8 flex flex-col items-center gap-2">
        <img
          src={logoRfm}
          alt="BUHSAB RFM"
          className="w-28 h-28 object-contain"
        />
      </div>

      <h2 className="text-white text-xl font-extrabold mb-5 self-start">
        {isRegister ? "Crear cuenta de docente" : "Inicia sesión"}
      </h2>

      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <div>
          <label className="text-white text-xs font-bold mb-1 block">
            Correo:
          </label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={emailPlaceholder}
            className="w-full bg-white/10 border border-white/20 text-white placeholder-white/40 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#17c3ce] transition"
          />
        </div>

        <div>
          <label className="text-white text-xs font-bold mb-1 block">
            Contraseña:
          </label>
          <input
            type="password"
            required
            autoComplete={isRegister ? "new-password" : "current-password"}
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            className="w-full bg-white/10 border border-white/20 text-white placeholder-white/40 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#17c3ce] transition"
          />

          {!isRegister && (
            <button
              type="button"
              disabled={loading}
              onClick={handlePasswordReset}
              className="block ml-auto mt-2 text-right text-xs font-bold text-white/70 hover:text-[#f7e7a3] transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </button>
          )}
        </div>

        {isRegister && (
          <div>
            <label className="text-white text-xs font-bold mb-1 block">
              Confirmar contraseña:
            </label>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite tu contraseña"
              className="w-full bg-white/10 border border-white/20 text-white placeholder-white/40 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#17c3ce] transition"
            />
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="bg-red-500/20 border border-red-400/30 rounded-xl px-3 py-2 text-red-300 text-xs"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#17c3ce] text-white font-extrabold py-3 rounded-full text-sm mt-2 hover:bg-[#12a8b3] active:scale-95 transition-all disabled:opacity-60"
        >
          {loading
            ? "Cargando..."
            : isRegister
              ? "Crear cuenta"
              : "Iniciar sesión"}
        </button>
      </form>

      <div className="flex items-center justify-center mt-7 text-sm">
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setIsRegister(!isRegister);
            setConfirmPassword("");
            setPassword("");
            setError("");
          }}
          className="text-white/70 hover:text-[#f7e7a3] transition-colors duration-200"
        >
          {isRegister
            ? "Ya tengo cuenta"
            : "¿Eres docente? Regístrate"}
        </button>
      </div>
    </div>
  );
}
