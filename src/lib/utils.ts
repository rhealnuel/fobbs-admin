import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export const cn = (...a: ClassValue[]) => twMerge(clsx(a));
export const money = (n: number) => `₦${(Math.round(n) || 0).toLocaleString("en-NG")}`;
export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const todayISO = () => iso(new Date());
export const addDays = (s: string, n: number) => { const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n); return iso(d); };
export const nights = (a: string, b: string) => Math.max(0, Math.round((Date.parse(b + "T12:00:00") - Date.parse(a + "T12:00:00")) / 864e5));
export const overlaps = (a1: string, a2: string, b1: string, b2: string) => a1 < b2 && b1 < a2; // check-in inclusive, check-out exclusive
export const fmtDate = (s: string) => new Date(s.length === 10 ? s + "T12:00:00" : s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
export const fmtShort = (s: string) => new Date(s.length === 10 ? s + "T12:00:00" : s).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
export const fmtTime = (s: string) => new Date(s).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
export const fmtDT = (s: string) => `${fmtShort(s)}, ${fmtTime(s)}`;
export const nowISO = () => new Date().toISOString();
export const dayOf = (s: string) => s.slice(0, 10);
export const localDay = (s: string) => iso(new Date(s));
export const ago = (s: string) => { const m = Math.round((Date.now() - Date.parse(s)) / 60000); if (m < 1) return "just now"; if (m < 60) return `${m} min ago`; const h = Math.round(m / 60); if (h < 24) return `${h} hr ago`; return `${Math.round(h / 24)} d ago`; };
export function downloadCSV(name: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const blob = new Blob([rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href);
}
