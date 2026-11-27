/* eslint-disable require-jsdoc, max-len */
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {
  onDocumentCreated,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";
import {initializeApp} from "firebase-admin/app";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {getMessaging} from "firebase-admin/messaging";

// Inicializar Firebase Admin.
initializeApp();

const db = getFirestore();
const messaging = getMessaging();

// Enviar notificaciones a una lista de dispositivos.
async function enviarNotificacion(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, string>,
) {
  if (tokens.length === 0) {
    console.log("No hay dispositivos registrados para recibir notificaciones.");
    return;
  }

  // Firebase permite enviar hasta 500 tokens por solicitud.
  for (let i = 0; i < tokens.length; i += 500) {
    const bloque = tokens.slice(i, i + 500);

    const response = await messaging.sendEachForMulticast({
      tokens: bloque,
      notification: {
        title,
        body,
      },
      data,
      android: {
        priority: "high",
        notification: {
          channelId: "default",
        },
      },
    });

    console.log(
      `Notificaciones enviadas: ${response.successCount}. Fallidas: ${response.failureCount}.`,
    );
  }
}

// Obtener los tokens de los dispositivos de un usuario.
async function obtenerTokensUsuario(uid: string): Promise<string[]> {
  const devices = await db
    .collection("users")
    .doc(uid)
    .collection("devices")
    .get();

  return devices.docs
    .map((device) => device.data().token)
    .filter((token): token is string =>
      typeof token === "string" && token.length > 0,
    );
}

// Obtener los tokens de todos los técnicos.
async function obtenerTokensTecnicos(): Promise<string[]> {
  const tecnicos = await db
    .collection("users")
    .where("role", "==", "tecnico")
    .get();

  const resultados = await Promise.all(
    tecnicos.docs.map((tecnico) =>
      obtenerTokensUsuario(tecnico.id),
    ),
  );

  return [...new Set(resultados.flat())];
}

// 1. Notificar a los técnicos cuando se crea un reporte.
export const notificarNuevoReporte = onDocumentCreated(
  {
    document: "reports/{reportId}",
    region: "us-central1",
  },
  async (event) => {
    const reporte = event.data?.data();

    if (!reporte) return;

    // Solo avisar por reportes creados por docentes.
    if (reporte.role !== "docente") return;

    const tokens = await obtenerTokensTecnicos();

    const folio = String(reporte.folio ?? "");
    const salon = String(reporte.salon ?? "Ubicación no especificada");
    const elemento = String(reporte.elemento ?? "Equipo");

    await enviarNotificacion(
      tokens,
      "Nueva falla reportada",
      `Folio ${folio}: ${elemento} - ${salon}`,
      {
        type: "nuevo_reporte",
        reportId: event.params.reportId,
        folio,
      },
    );

    console.log(
      `Notificación de nuevo reporte procesada: ${event.params.reportId}`,
    );
  },
);

// 2. Notificar al docente cuando su reporte se resuelve.
export const notificarReporteResuelto = onDocumentUpdated(
  {
    document: "reports/{reportId}",
    region: "us-central1",
  },
  async (event) => {
    const antes = event.data?.before.data();
    const despues = event.data?.after.data();

    if (!antes || !despues) return;

    // Avisar únicamente cuando cambia a Resuelto.
    if (
      antes.status === "Resuelto" ||
      despues.status !== "Resuelto"
    ) {
      return;
    }

    const docenteUid = despues.reportedByUid;

    if (
      typeof docenteUid !== "string" ||
      !docenteUid
    ) {
      console.log("El reporte no tiene un docente asociado.");
      return;
    }

    const tokens = await obtenerTokensUsuario(docenteUid);

    const folio = String(despues.folio ?? "");

    await enviarNotificacion(
      tokens,
      "¡Tu reporte fue resuelto!",
      `El reporte con folio ${folio} ya fue atendido.`,
      {
        type: "reporte_resuelto",
        reportId: event.params.reportId,
        folio,
      },
    );

    console.log(
      `Notificación de reporte resuelto procesada: ${event.params.reportId}`,
    );
  },
);

// Función existente para crear reportes.
export const crearReporte = onCall(
  {region: "us-central1"},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión para enviar un reporte.",
      );
    }

    const auth = request.auth;
    const uid = auth.uid;

    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists || userSnap.data()?.role !== "docente") {
      throw new HttpsError(
        "permission-denied",
        "No tienes permiso para crear reportes.",
      );
    }

    const data = request.data ?? {};

    const {
      category,
      priority,
      salon,
      elemento,
      description,
    } = data;

    const camposTexto = {
      category,
      priority,
      salon,
      elemento,
      description,
    };

    for (const [campo, valor] of Object.entries(camposTexto)) {
      if (typeof valor !== "string" || !valor.trim()) {
        throw new HttpsError(
          "invalid-argument",
          `El campo ${campo} es obligatorio.`,
        );
      }
    }

    if (!["Urgente", "Media", "Baja"].includes(priority)) {
      throw new HttpsError(
        "invalid-argument",
        "La prioridad seleccionada no es válida.",
      );
    }

    const counterRef = db.collection("counters").doc("reports");
    const reportRef = db.collection("reports").doc();

    const folio = await db.runTransaction(async (transaction) => {
      const counterSnap = await transaction.get(counterRef);

      const last = counterSnap.exists ?
        Number(counterSnap.data()?.last ?? 0) :
        0;

      if (!Number.isSafeInteger(last) || last < 0) {
        throw new HttpsError(
          "internal",
          "El contador de reportes tiene un valor inválido.",
        );
      }

      const next = last + 1;

      transaction.set(counterRef, {last: next});

      transaction.set(reportRef, {
        folio: String(next),
        category: category.trim(),
        priority,
        salon: salon.trim(),
        elemento: elemento.trim(),
        description: description.trim(),
        status: "Pendiente",
        reportedBy:
          auth.token.name ||
          auth.token.email?.split("@")[0] ||
          "Usuario",
        reportedByUid: uid,
        role: "docente",
        createdAt: FieldValue.serverTimestamp(),
      });

      return String(next);
    });

    return {
      success: true,
      folio,
      reportId: reportRef.id,
    };
  },
);
