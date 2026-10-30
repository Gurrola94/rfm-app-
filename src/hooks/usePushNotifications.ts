import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import type { User } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Role } from "@/types";

const isNative = Capacitor.isNativePlatform();

/**
 * Registra el celular para recibir avisos de nuevos reportes.
 * Solo aplica a técnicos y administradores, dentro de la app instalada (no en el navegador).
 * Guarda el token del celular en la colección "fcmTokens" (un documento por usuario).
 */
export function usePushNotifications(user: User | null, role: Role) {
  useEffect(() => {
    if (!isNative || !user || !db) return;
    if (role !== "tecnico" && role !== "admin") return;

    const firestore = db;
    let cancelled = false;
    const handles: Array<Promise<{ remove: () => Promise<void> }>> = [];

    async function register() {
      try {
        let perm = await PushNotifications.checkPermissions();
        if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
          perm = await PushNotifications.requestPermissions();
        }
        if (perm.receive !== "granted" || cancelled) return;

        handles.push(
          PushNotifications.addListener("registration", async (token) => {
            try {
              await setDoc(
                doc(firestore, "fcmTokens", user!.uid),
                {
                  token: token.value,
                  email: (user!.email ?? "").toLowerCase(),
                  role,
                  platform: Capacitor.getPlatform(),
                  updatedAt: serverTimestamp(),
                },
                { merge: true }
              );
            } catch (err) {
              console.error("No se pudo guardar el token de notificaciones:", err);
            }
          })
        );
        handles.push(
          PushNotifications.addListener("registrationError", (err) => {
            console.error("Error al registrar notificaciones:", err);
          })
        );

        await PushNotifications.register();
      } catch (err) {
        console.error("Notificaciones no disponibles:", err);
      }
    }

    void register();

    return () => {
      cancelled = true;
      handles.forEach((h) => void h.then((l) => l.remove()).catch(() => {}));
    };
  }, [user, role]);
}
