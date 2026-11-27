import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "mx.buhsab.rfm",
  appName: "RFM BUHSAB",
  webDir: "dist",
  backgroundColor: "#0e1f4d",
  plugins: {
    // Área segura: en Android el contenido llega hasta los bordes y la app usa env(safe-area-inset-*)
    SystemBars: {
      insetsHandling: "css",
      initialViewportFitValueHint: "cover",
    },
  },
};

export default config;
