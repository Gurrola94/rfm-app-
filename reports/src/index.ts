
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {initializeApp} from "firebase-admin/app";
import {getFirestore, FieldValue} from "firebase-admin/firestore";

// Inicializar Firebase Admin.
initializeApp();

// Obtener la instancia de Firestore.
const db = getFirestore();

// Función para crear reportes desde la aplicación.
export const crearReporte = onCall(
  {region: "us-central1"},
  async (request) => {
    // Verificar que el usuario haya iniciado sesión.
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión para enviar un reporte."
      );
    }

    // Guardar los datos de autenticación en una constante.
    // Así TypeScript sabe que el usuario ya está autenticado.
    const auth = request.auth;
    const uid = auth.uid;

    // Consultar el perfil del usuario en Firestore.
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();

    // Solo los usuarios con rol docente pueden crear reportes.
    if (!userSnap.exists || userSnap.data()?.role !== "docente") {
      throw new HttpsError(
        "permission-denied",
        "No tienes permiso para crear reportes."
      );
    }

    // Obtener los datos enviados por la aplicación.
    const data = request.data ?? {};

    const {
      category,
      priority,
      salon,
      elemento,
      description,
      horarioInicio,
      horarioFin,
    } = data;

    // Validar que los campos obligatorios sean textos no vacíos.
    const camposTexto = {
      category,
      priority,
      salon,
      elemento,
      description,
      horarioInicio,
      horarioFin,
    };

    for (const [campo, valor] of Object.entries(camposTexto)) {
      if (typeof valor !== "string" || !valor.trim()) {
        throw new HttpsError(
          "invalid-argument",
          `El campo ${campo} es obligatorio.`
        );
      }
    }

    // Validar la prioridad seleccionada.
    if (!["Urgente", "Media", "Baja"].includes(priority)) {
      throw new HttpsError(
        "invalid-argument",
        "La prioridad seleccionada no es válida."
      );
    }

    // Preparar las referencias del contador y del reporte.
    const counterRef = db.collection("counters").doc("reports");
    const reportRef = db.collection("reports").doc();

    // Generar el folio y guardar ambos documentos
    // dentro de una transacción para evitar duplicados.
    const folio = await db.runTransaction(async (transaction) => {
      const counterSnap = await transaction.get(counterRef);

      const last = counterSnap.exists ?
        Number(counterSnap.data()?.last ?? 0) :
        0;

      // Verificar que el contador tenga un valor válido.
      if (!Number.isSafeInteger(last) || last < 0) {
        throw new HttpsError(
          "internal",
          "El contador de reportes tiene un valor inválido."
        );
      }

      const next = last + 1;

      // Actualizar el contador del folio.
      transaction.set(counterRef, {last: next});

      // Guardar el nuevo reporte.
      transaction.set(reportRef, {
        folio: String(next),
        category: category.trim(),
        priority,
        salon: salon.trim(),
        elemento: elemento.trim(),
        description: description.trim(),
        horarioInicio,
        horarioFin,
        status: "Pendiente",

        // Obtener el nombre o correo del usuario autenticado.
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

    // Devolver la confirmación a la aplicación.
    return {
      success: true,
      folio,
      reportId: reportRef.id,
    };
  }
);
