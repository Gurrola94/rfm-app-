import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";

const isNative = Capacitor.isNativePlatform();

/** Barra de estado con íconos claros sobre el azul de la app (solo en iPhone / Android). */
export function useStatusBarStyle() {
  useEffect(() => {
    if (!isNative) return;
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  }, []);
}

/** Botón "atrás" de Android: ejecuta `onBack`; si no hay a dónde regresar, `onExit` cierra la app. */
export function useAndroidBackButton(onBack: () => boolean) {
  const handler = useRef(onBack);
  handler.current = onBack;

  useEffect(() => {
    if (!isNative) return;
    const listener = CapacitorApp.addListener("backButton", () => {
      if (!handler.current()) CapacitorApp.exitApp();
    });
    return () => { void listener.then((l) => l.remove()); };
  }, []);
}
