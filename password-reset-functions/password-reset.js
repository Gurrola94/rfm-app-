const { createHash, randomInt, timingSafeEqual } = require("node:crypto");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { FieldValue, getFirestore, Timestamp } = require("firebase-admin/firestore");
const { defineSecret, defineString } = require("firebase-functions/params");
const { HttpsError, onCall } = require("firebase-functions/v2/https");

initializeApp();

const db = getFirestore();
const resendApiKey = defineSecret("RESEND_API_KEY");
const resetCodePepper = defineSecret("PASSWORD_RESET_CODE_PEPPER");
const resetEmailFrom = defineString("PASSWORD_RESET_EMAIL_FROM");
const resetCollection = "passwordResetCodes";
const codeLifetimeMs = 10 * 60 * 1000;
const resendCooldownMs = 60 * 1000;
const maxAttempts = 5;

function normalizeEmail(value) {
  if (typeof value !== "string") {
    throw new HttpsError("invalid-argument", "Ingresa un correo válido.");
  }
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError("invalid-argument", "Ingresa un correo válido.");
  }
  return email;
}

function codeDigest(uid, code) {
  return createHash("sha256")
    .update(`${resetCodePepper.value()}:${uid}:${code}`)
    .digest("hex");
}

function digestMatches(expectedHex, actualHex) {
  const expected = Buffer.from(expectedHex, "hex");
  const actual = Buffer.from(actualHex, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

async function findRegisteredAccount(email) {
  let user;
  try {
    user = await getAuth().getUserByEmail(email);
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      throw new HttpsError("not-found", "No encontramos una cuenta de autenticación con ese correo.");
    }
    throw error;
  }

  const userRecord = await db.collection("users").where("email", "==", email).limit(1).get();
  if (userRecord.empty) {
    throw new HttpsError("not-found", "El correo existe en autenticación, pero no está registrado en la base de datos de usuarios.");
  }
  return user;
}

exports.requestPasswordResetCode = onCall(
  { region: "us-central1", secrets: [resendApiKey, resetCodePepper], maxInstances: 5 },
  async (request) => {
    const email = normalizeEmail(request.data?.email);
    const user = await findRegisteredAccount(email);
    const resetRef = db.collection(resetCollection).doc(user.uid);
    const now = Date.now();
    const previous = await resetRef.get();
    const previousSentAt = previous.get("sentAtMs");
    if (typeof previousSentAt === "number" && now - previousSentAt < resendCooldownMs) {
      throw new HttpsError("resource-exhausted", "Espera un minuto antes de solicitar otro código.");
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    await resetRef.set({
      email,
      codeHash: codeDigest(user.uid, code),
      createdAt: FieldValue.serverTimestamp(),
      sentAtMs: now,
      expiresAtMs: now + codeLifetimeMs,
      attempts: 0,
      verifiedUntilMs: null,
    });

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey.value()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: resetEmailFrom.value(),
          to: [email],
          subject: "Código para restablecer tu contraseña",
          html: `<div style="font-family:Arial,sans-serif;color:#0e1f4d;max-width:520px;margin:auto"><h2>Recuperación de contraseña</h2><p>Ingresa este código en la aplicación para continuar:</p><p style="font-size:30px;font-weight:700;letter-spacing:8px;color:#17a8b3">${code}</p><p>El código vence en 10 minutos. Si no solicitaste este cambio, ignora este mensaje.</p></div>`,
        }),
      });
      if (!response.ok) {
        throw new Error(`El proveedor de correo respondió ${response.status}.`);
      }
    } catch (error) {
      await resetRef.delete();
      console.error("Password reset email delivery failed", error);
      throw new HttpsError("unavailable", "No se pudo enviar el correo. Intenta de nuevo más tarde.");
    }

    return { sent: true };
  },
);

exports.verifyPasswordResetCode = onCall(
  { region: "us-central1", secrets: [resetCodePepper], maxInstances: 5 },
  async (request) => {
    const email = normalizeEmail(request.data?.email);
    const code = typeof request.data?.code === "string" ? request.data.code.trim() : "";
    if (!/^\d{6}$/.test(code)) {
      throw new HttpsError("invalid-argument", "Ingresa el código de 6 dígitos recibido por correo.");
    }
    const user = await findRegisteredAccount(email);
    const resetRef = db.collection(resetCollection).doc(user.uid);
    const reset = await resetRef.get();
    if (!reset.exists || reset.get("email") !== email) {
      throw new HttpsError("not-found", "No hay una solicitud de recuperación activa para este correo.");
    }
    const expiresAtMs = reset.get("expiresAtMs");
    if (typeof expiresAtMs !== "number" || Date.now() > expiresAtMs) {
      await resetRef.delete();
      throw new HttpsError("deadline-exceeded", "El código venció. Solicita uno nuevo.");
    }

    let result = "invalid";
    await db.runTransaction(async (transaction) => {
      const current = await transaction.get(resetRef);
      if (!current.exists) {
        result = "missing";
        return;
      }
      const attempts = current.get("attempts") || 0;
      if (attempts >= maxAttempts) {
        transaction.delete(resetRef);
        result = "locked";
        return;
      }
      const expectedHash = current.get("codeHash");
      if (typeof expectedHash === "string" && digestMatches(expectedHash, codeDigest(user.uid, code))) {
        transaction.update(resetRef, { verifiedUntilMs: Date.now() + 5 * 60 * 1000 });
        result = "verified";
        return;
      }
      transaction.update(resetRef, { attempts: attempts + 1 });
      result = attempts + 1 >= maxAttempts ? "locked" : "invalid";
    });

    if (result === "verified") return { valid: true };
    if (result === "locked") throw new HttpsError("resource-exhausted", "Se agotaron los intentos. Solicita un código nuevo.");
    if (result === "missing") throw new HttpsError("not-found", "No hay una solicitud de recuperación activa para este correo.");
    throw new HttpsError("permission-denied", "El código ingresado no es correcto.");
  },
);

exports.completePasswordReset = onCall(
  { region: "us-central1", secrets: [resetCodePepper], maxInstances: 5 },
  async (request) => {
    const email = normalizeEmail(request.data?.email);
    const code = typeof request.data?.code === "string" ? request.data.code.trim() : "";
    const newPassword = typeof request.data?.newPassword === "string" ? request.data.newPassword : "";
    if (!/^\d{6}$/.test(code)) {
      throw new HttpsError("invalid-argument", "El código de recuperación no es válido.");
    }
    if (newPassword.length < 6) {
      throw new HttpsError("invalid-argument", "La contraseña debe tener al menos 6 caracteres.");
    }

    const user = await findRegisteredAccount(email);
    const resetRef = db.collection(resetCollection).doc(user.uid);
    const now = Date.now();
    let result = "invalid";
    await db.runTransaction(async (transaction) => {
      const reset = await transaction.get(resetRef);
      if (!reset.exists || reset.get("email") !== email) {
        result = "missing";
        return;
      }
      if (now > reset.get("expiresAtMs") || now > reset.get("verifiedUntilMs")) {
        transaction.delete(resetRef);
        result = "expired";
        return;
      }
      const attempts = reset.get("attempts") || 0;
      if (attempts >= maxAttempts) {
        transaction.delete(resetRef);
        result = "locked";
        return;
      }
      if (reset.get("consumed") === true) {
        result = "used";
        return;
      }
      const expectedHash = reset.get("codeHash");
      if (typeof expectedHash !== "string" || !digestMatches(expectedHash, codeDigest(user.uid, code))) {
        transaction.update(resetRef, { attempts: attempts + 1 });
        result = attempts + 1 >= maxAttempts ? "locked" : "invalid";
        return;
      }
      transaction.update(resetRef, { consumed: true, consumedAt: Timestamp.now() });
      result = "ready";
    });

    if (result === "missing") throw new HttpsError("not-found", "No hay una solicitud de recuperación activa para este correo.");
    if (result === "expired") throw new HttpsError("deadline-exceeded", "El código venció. Solicita uno nuevo.");
    if (result === "locked") throw new HttpsError("resource-exhausted", "Se agotaron los intentos. Solicita un código nuevo.");
    if (result === "used") throw new HttpsError("already-exists", "Este código ya fue utilizado.");
    if (result !== "ready") throw new HttpsError("permission-denied", "El código ingresado no es correcto.");

    try {
      await getAuth().updateUser(user.uid, { password: newPassword });
      await resetRef.delete();
    } catch (error) {
      await resetRef.update({ consumed: false, consumedAt: FieldValue.delete() });
      console.error("Password reset update failed", error);
      throw new HttpsError("internal", "No se pudo actualizar la contraseña. Intenta de nuevo.");
    }

    return { updated: true };
  },
);
