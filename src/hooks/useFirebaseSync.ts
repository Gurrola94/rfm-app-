import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { auth, db, firebaseConfigured } from "@/lib/firebase";
import type { AppUser, MaterialRequest, Report, Screen } from "@/types";

interface Setters {
  setUser: Dispatch<SetStateAction<User | null>>;
  setAuthLoading: Dispatch<SetStateAction<boolean>>;
  setScreen: Dispatch<SetStateAction<Screen>>;
  setAppUsers: Dispatch<SetStateAction<AppUser[]>>;
  setExtraSpaces: Dispatch<SetStateAction<string[]>>;
  setMaterialRequests: Dispatch<SetStateAction<MaterialRequest[]>>;
  setReports: Dispatch<SetStateAction<Report[]>>;
}

/** Escucha en tiempo real a Firebase (sesión, usuarios, espacios, material y reportes). */
export function useFirebaseSync({
  setUser, setAuthLoading, setScreen, setAppUsers, setExtraSpaces, setMaterialRequests, setReports,
}: Setters) {
  // Firebase Auth listener — only when configured
  useEffect(() => {
    const a = auth;
    if (!firebaseConfigured || !a) return;
    return onAuthStateChanged(a, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (!u) setScreen({ name: "login" });
    });
  }, []);

  // Registered application users — used by the administrator directory
  useEffect(() => {
    const d = db;
    if (!firebaseConfigured || !d) return;
    return onSnapshot(collection(d, "users"), (snap) => {
      setAppUsers(snap.docs.map((userDoc) => ({ id: userDoc.id, ...userDoc.data() } as AppUser)));
    });
  }, []);

  // Espacios agregados por el administrador
  useEffect(() => {
    const d = db;
    if (!firebaseConfigured || !d) return;
    return onSnapshot(collection(d, "spaces"), (snap) => {
      setExtraSpaces(snap.docs.map((s) => s.data().name as string));
    });
  }, []);

  // Material requests listener — used by the administrator dashboard
  useEffect(() => {
    const d = db;
    if (!firebaseConfigured || !d) return;
    const q = query(collection(d, "materialRequests"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setMaterialRequests(snap.docs.map((requestDoc) => ({ id: requestDoc.id, ...requestDoc.data() } as MaterialRequest)));
    });
  }, []);

  // Firestore real-time listener — only when configured
  useEffect(() => {
    const d = db;
    if (!firebaseConfigured || !d) return;
    const q = query(collection(d, "reports"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setReports(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Report)));
    });
  }, []);
}
