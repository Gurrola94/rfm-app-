
import { useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import { auth, db, firebaseConfigured } from "@/lib/firebase";
import type {
  AppUser,
  MaterialRequest,
  Report,
  Role,
  Screen,
} from "@/types";

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

/**
 * Sincroniza los datos con Firebase.
 * Las consultas se activan solamente cuando existe una sesión autenticada.
 */
export function useFirebaseSync({
  user,
  setUser,
  setAuthLoading,
  setScreen,
  setAppUsers,
  setExtraSpaces,
  setMaterialRequests,
  setReports,
  onSessionRestored,
}: Setters) {
  // Conserva la última versión de la función de recuperación de sesión.
  const restoreRef = useRef(onSessionRestored);
  restoreRef.current = onSessionRestored;

  // Recupera la sesión y el rol del usuario.
  useEffect(() => {
    const a = auth;

    if (!firebaseConfigured || !a) {
      setAuthLoading(false);
      return;
    }

    return onAuthStateChanged(
      a,
      async (authenticatedUser) => {
        console.log(
          "Estado de autenticación:",
          authenticatedUser ? "Sesión iniciada" : "Sin sesión"
        );

        setUser(authenticatedUser);

        if (!authenticatedUser) {
          setAuthLoading(false);
          setScreen({ name: "login" });
          return;
        }

        try {
          const d = db;

          if (d) {
            const snap = await getDoc(
              doc(d, "users", authenticatedUser.uid)
            );

            const role = snap.data()?.role;

            if (
              role === "docente" ||
              role === "tecnico" ||
              role === "admin"
            ) {
              restoreRef.current(authenticatedUser, role);
            }
          }
        } catch (error) {
          console.error("No se pudo restaurar la sesión:", error);
        }

        setAuthLoading(false);
      },
      (error) => {
        console.error(
          "Error de autenticación:",
          error.code,
          error.message
        );
        setAuthLoading(false);
      }
    );
  }, [setUser, setAuthLoading, setScreen]);

  // Usuarios.
  useEffect(() => {
    const d = db;

    if (!firebaseConfigured || !d || !user) {
      setAppUsers([]);
      return;
    }

    return onSnapshot(
      collection(d, "users"),
      (snap) => {
        console.log("Usuarios recibidos de Firebase:", snap.size);

        setAppUsers(
          snap.docs.map(
            (userDoc) =>
              ({
                id: userDoc.id,
                ...userDoc.data(),
              }) as AppUser
          )
        );
      },
      (error) => {
        console.error(
          "Error al cargar usuarios:",
          error.code,
          error.message
        );
      }
    );
  }, [user, setAppUsers]);

  // Espacios.
  useEffect(() => {
    const d = db;

    if (!firebaseConfigured || !d || !user) {
      setExtraSpaces([]);
      return;
    }

    return onSnapshot(
      collection(d, "spaces"),
      (snap) => {
        console.log("Espacios recibidos de Firebase:", snap.size);

        setExtraSpaces(
          snap.docs.map(
            (spaceDoc) => spaceDoc.data().name as string
          )
        );
      },
      (error) => {
        console.error(
          "Error al cargar espacios:",
          error.code,
          error.message
        );
      }
    );
  }, [user, setExtraSpaces]);

  // Solicitudes de material.
  useEffect(() => {
    const d = db;

    if (!firebaseConfigured || !d || !user) {
      setMaterialRequests([]);
      return;
    }

    const q = query(
      collection(d, "materialRequests"),
      orderBy("createdAt", "desc")
    );

    return onSnapshot(
      q,
      (snap) => {
        console.log(
          "Solicitudes de material recibidas:",
          snap.size
        );

        setMaterialRequests(
          snap.docs.map(
            (requestDoc) =>
              ({
                id: requestDoc.id,
                ...requestDoc.data(),
              }) as MaterialRequest
          )
        );
      },
      (error) => {
        console.error(
          "Error al cargar solicitudes de material:",
          error.code,
          error.message
        );
      }
    );
  }, [user, setMaterialRequests]);

  // Reportes.
  useEffect(() => {
    const d = db;

    if (!firebaseConfigured || !d || !user) {
      setReports([]);
      return;
    }

    const q = query(
      collection(d, "reports"),
      orderBy("createdAt", "desc")
    );

    return onSnapshot(
      q,
      (snap) => {
        console.log("Reportes recibidos de Firebase:", snap.size);

        setReports(
          snap.docs.map(
            (reportDoc) =>
              ({
                id: reportDoc.id,
                ...reportDoc.data(),
              }) as Report
          )
        );
      },
      (error) => {
        console.error(
          "Error al cargar reportes:",
          error.code,
          error.message
        );
      }
    );
  }, [user, setReports]);
}
