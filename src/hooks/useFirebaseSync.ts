
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
  where,
} from "firebase/firestore";

import { auth, db, firebaseConfigured } from "@/lib/firebase";
import type {
  AppSpace,
  AppUser,
  MaterialRequest,
  Report,
  Role,
  Screen,
} from "@/types";

interface Setters {
  user: User | null;
  setUser: Dispatch<SetStateAction<User | null>>;
  role: Role;
  setRole: Dispatch<SetStateAction<Role>>;
  setAuthLoading: Dispatch<SetStateAction<boolean>>;
  setScreen: Dispatch<SetStateAction<Screen>>;
  setAppUsers: Dispatch<SetStateAction<AppUser[]>>;
  setSpaces: Dispatch<SetStateAction<AppSpace[]>>;
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
  role,
  setRole,
  setAuthLoading,
  setScreen,
  setAppUsers,
  setSpaces,
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
          setRole("docente");
          setAuthLoading(false);
          setScreen({ name: "login" });
          return;
        }

        setRole("docente");

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
        const errorCode =
          "code" in error && typeof error.code === "string"
            ? error.code
            : "desconocido";
        console.error("Error de autenticación:", errorCode, error.message);
        setAuthLoading(false);
      }
    );
  }, [setUser, setRole, setAuthLoading, setScreen]);

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
      setSpaces([]);
      return;
    }

    return onSnapshot(
      collection(d, "spaces"),
      (snap) => {
        console.log("Espacios recibidos de Firebase:", snap.size);

        setSpaces(
          snap.docs.map(
            (spaceDoc) => ({
              id: spaceDoc.id,
              ...spaceDoc.data(),
            }) as AppSpace
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
  }, [user, setSpaces]);

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

    const reportsCollection = collection(d, "reports");
    const q =
      role === "docente"
        ? query(reportsCollection, where("reportedByUid", "==", user.uid))
        : query(reportsCollection, orderBy("createdAt", "desc"));

    return onSnapshot(
      q,
      (snap) => {
        console.log("Reportes recibidos de Firebase:", snap.size);

        const syncedReports = snap.docs.map(
          (reportDoc) =>
            ({
              id: reportDoc.id,
              ...reportDoc.data(),
            }) as Report
        );
        if (role === "docente") {
          syncedReports.sort(
            (a, b) =>
              (b.createdAt?.toMillis() ?? 0) -
              (a.createdAt?.toMillis() ?? 0)
          );
        }
        setReports(syncedReports);
      },
      (error) => {
        console.error(
          "Error al cargar reportes:",
          error.code,
          error.message
        );
      }
    );
  }, [user, role, setReports]);
}
