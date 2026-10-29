import { useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot, orderBy, query } from "firebase/firestore";
import { auth, db, firebaseConfigured } from "@/lib/firebase";
import type { AppUser, MaterialRequest, Report, Role, Screen } from "@/types";

interface Setters {
  user: User | null;
  setUser: Dispatch<SetStateAction<User | null>>;
  setAuthLoading: Dispatch<SetStateAction<boolean>>;
  setScreen: Dispatch<SetStateAction<Screen>>;
  setAppUsers: Dispatch<SetStateAction<AppUser[]>>;
  setExtraSpaces: Dispatch<SetStateAction<string[]>>;
  setMaterialRequests: Dispatch<SetStateAction<MaterialRequest[]>>;
  setReports: Dispatch<SetStateAction<Report[]>>;
  onSessionRestored: (user: User, role: Role) => void;
}

/** Escucha en tiempo real a Firebase (sesión, usuarios, espacios, material y reportes). */
export function useFirebaseSync({
  user, setUser, setAuthLoading, setScreen, setAppUsers, setExtraSpaces, setMaterialRequests, setReports,
  onSessionRestored,
}: Setters) {
  // Guarda la última versión de la función para usarla dentro del listener de sesión
  const restoreRef = useRef(onSessionRestored);
  restoreRef.current = onSessionRestored;

  // Firebase Auth listener: si hay sesión guardada, restaura el rol y la pantalla
  useEffect(() => {
    const a = auth;
    if (!firebaseConfigured || !a) {
      setAuthLoading(false);
      return;
    }
    return onAuthStateChanged(a, async (u) => {
      setUser(u);

      if (!u) {
        setAuthLoading(false);
        setScreen({ name: "login" });
        return;
      }

      try {
        const d = db;
        if (d) {
          const snap = await getDoc(doc(d, "users", u.uid));
          const role = snap.data()?.role;
          if (role === "docente" || role === "tecnico" || role === "admin") {
            restoreRef.current(u, role);
          }
        }
      } catch (error) {
        console.error("No se pudo restaurar la sesión:", error);
      }

      setAuthLoading(false);
    });
  }, []);

  // Registered application users — used by the administrator directory
  useEffect(() => {
    const d = db;
    if (!firebaseConfigured || !d || !user) {
      setAppUsers([]);
      return;
    }
    return onSnapshot(collection(d, "users"), (snap) => {
      setAppUsers(snap.docs.map((userDoc) => ({ id: userDoc.id, ...userDoc.data() } as AppUser)));
    });
  }, [user]);

  // Espacios agregados por el administrador
  useEffect(() => {
    const d = db;
    if (!firebaseConfigured || !d || !user) {
      setExtraSpaces([]);
      return;
    }
    return onSnapshot(collection(d, "spaces"), (snap) => {
      setExtraSpaces(snap.docs.map((s) => s.data().name as string));
    });
  }, [user]);

  // Material requests listener — used by the administrator dashboard
  useEffect(() => {
    const d = db;
    if (!firebaseConfigured || !d || !user) {
      setMaterialRequests([]);
      return;
    }
    const q = query(collection(d, "materialRequests"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setMaterialRequests(snap.docs.map((requestDoc) => ({ id: requestDoc.id, ...requestDoc.data() } as MaterialRequest)));
    });
  }, [user]);

  // Firestore real-time listener — only when configured
  useEffect(() => {
    const d = db;
    if (!firebaseConfigured || !d || !user) {
      setReports([]);
      return;
    }
    const q = query(collection(d, "reports"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setReports(snap.docs.map((reportDoc) => ({ id: reportDoc.id, ...reportDoc.data() } as Report)));
    });
  }, [user]);
}