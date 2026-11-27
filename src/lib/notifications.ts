
import { Capacitor } from "@capacitor/core";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import { doc, setDoc, serverTimestamp, Firestore } from "firebase/firestore";

export async function registerDeviceToken(
  userId: string,
  db: Firestore
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const platform = Capacitor.getPlatform();

  if (platform !== "android" && platform !== "ios") return;

  let permission = await FirebaseMessaging.checkPermissions();

  if (permission.receive !== "granted") {
    permission = await FirebaseMessaging.requestPermissions();
  }

  if (permission.receive !== "granted") {
    console.log("El usuario no autorizó las notificaciones.");
    return;
  }

  const result = await FirebaseMessaging.getToken();
  const token = result.token;

  if (!token) return;

  const deviceId = encodeURIComponent(token);

  await setDoc(
    doc(db, "users", userId, "devices", deviceId),
    {
      token,
      platform,
      updatedAt: serverTimestamp(),
    }
  );

  console.log("Dispositivo registrado para notificaciones.");
}
