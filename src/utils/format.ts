import { Timestamp } from "firebase/firestore";

export function timeAgo(ts: Timestamp | null): string {
  if (!ts) return "Ahora";
  const diff = Math.floor((Date.now() - ts.toMillis()) / 1000);
  if (diff < 60) return "Hace un momento";
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`;
  return `Hace ${Math.floor(diff / 86400)} días`;
}

export function formatDateTime(ts: Timestamp | null): string {
  if (!ts) return "Fecha no disponible";
  const date = ts.toDate();
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
