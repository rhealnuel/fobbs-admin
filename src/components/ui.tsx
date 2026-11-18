"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Info, Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── buttons ─────────────────────────────────────────────── */
type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "gold" | "dark" | "outline" | "ghost" | "danger"; size?: "sm" | "md" | "lg"; loading?: boolean };
export function Button({ variant = "outline", size = "md", loading, className, children, disabled, ...p }: BtnProps) {
  const v = { gold: "bg-gold text-black hover:bg-champagne", dark: "bg-black text-white hover:bg-charcoal", outline: "border border-black/20 bg-white hover:border-gold", ghost: "hover:bg-black/5", danger: "bg-[#9b2c2c] text-white hover:bg-[#7f2222]" }[variant];
  const s = { sm: "h-8 px-3 text-xs", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-base" }[size];
  return <button {...p} disabled={disabled || loading} className={cn("inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45", v, s, className)}>{loading && <Loader2 size={14} className="animate-spin" />}{children}</button>;
}

/* ── badges ──────────────────────────────────────────────── */
const TONES: Record<string, string> = {
  green: "bg-[#e6f2e8] text-[#1f6a36]", amber: "bg-[#fbf0d6] text-[#8a5a00]", red: "bg-[#f8e3e1] text-[#9b2c2c]", blue: "bg-[#e3edf8] text-[#235a96]",
  gold: "bg-[#f4ecd4] text-[#7a5f14]", grey: "bg-black/[.06] text-[#555]", dark: "bg-black text-champagne", purple: "bg-[#eee6f6] text-[#5b3a8a]",
};
const STATUS_TONE: Record<string, string> = {
  Available: "green", Occupied: "blue", Reserved: "gold", Cleaning: "amber", Maintenance: "red", "Out of Service": "grey",
  "Pending Payment": "amber", Confirmed: "green", "Checked In": "blue", "Checked Out": "grey", Cancelled: "red", "No-show": "red", "Refund Pending": "amber", Refunded: "grey",
  Unpaid: "red", "Part paid": "amber", Paid: "green",
  Dirty: "red", "Cleaning in Progress": "amber", "Awaiting Inspection": "purple", "Clean / Ready": "green",
  Draft: "grey", Submitted: "gold", Accepted: "blue", Preparing: "amber", Ready: "green", Served: "blue", Completed: "grey",
  Reported: "amber", Assigned: "blue", "In Progress": "amber", Resolved: "green", Closed: "grey",
  Low: "grey", Medium: "blue", High: "amber", Urgent: "red",
  Open: "blue", Approved: "green", Rejected: "red", Flagged: "amber", Active: "green", Suspended: "amber", Deactivated: "grey",
};
export function Badge({ children, tone, dot }: { children: React.ReactNode; tone?: string; dot?: boolean }) {
  const t = tone ?? STATUS_TONE[String(children)] ?? "grey";
  return <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap px-2 py-0.5 text-xs font-semibold", TONES[t])}>{dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}{children}</span>;
}

/* ── layout bits ─────────────────────────────────────────── */
export function Card({ title, action, children, className, pad = true }: { title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={cn("border border-black/10 bg-white", className)}>
      {(title || action) && <header className="flex min-h-12 items-center justify-between gap-3 border-b border-black/10 px-4 py-2"><h2 className="font-serif text-lg text-balance">{title}</h2>{action}</header>}
      <div className={pad ? "p-4" : ""}>{children}</div>
    </section>
  );
}
export function Stat({ label, value, sub, tone, href }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "gold" | "red"; href?: string }) {
  const body = (<><p className="text-xs uppercase text-muted">{label}</p><p className={cn("mt-1 font-serif text-2xl", tone === "red" && "text-[#9b2c2c]")}>{value}</p>{sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}</>);
  const cls = cn("block border border-black/10 bg-white p-4", tone === "gold" && "border-l-2 border-l-gold", href && "transition-colors hover:border-gold");
  return href ? <a href={href} className={cls}>{body}</a> : <div className={cls}>{body}</div>;
}
export function PageHeader({ title, sub, actions }: { title: string; sub?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="font-serif text-2xl text-balance md:text-3xl">{title}</h1>{sub && <p className="mt-1 text-sm text-muted">{sub}</p>}</div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
export function Empty({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return <div className="grid place-items-center gap-1 px-6 py-12 text-center"><p className="font-serif text-lg">{title}</p>{hint && <p className="max-w-sm text-sm text-muted">{hint}</p>}{action && <div className="mt-3">{action}</div>}</div>;
}
export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "error" | "ok"; children: React.ReactNode }) {
  const m = { info: ["bg-[#e3edf8] text-[#235a96]", Info], warn: ["bg-[#fbf0d6] text-[#8a5a00]", AlertTriangle], error: ["bg-[#f8e3e1] text-[#9b2c2c]", AlertTriangle], ok: ["bg-[#e6f2e8] text-[#1f6a36]", CheckCircle2] }[tone] as [string, typeof Info];
  const I = m[1]; return <div className={cn("flex items-start gap-2 px-3 py-2 text-sm", m[0])}><I size={16} className="mt-0.5 shrink-0" /><div>{children}</div></div>;
}

/* ── forms ───────────────────────────────────────────────── */
const inputCls = "h-10 w-full border border-black/20 bg-white px-3 text-sm outline-none transition-colors placeholder:text-black/35 focus:border-gold disabled:bg-black/[.04]";
export function Field({ label, hint, error, children, className }: { label: string; hint?: string; error?: string; children: React.ReactNode; className?: string }) {
  return <label className={cn("block text-sm", className)}><span className="mb-1 block text-xs font-semibold uppercase text-[#555]">{label}</span>{children}{hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}{error && <span className="mt-1 block text-xs text-[#9b2c2c]">{error}</span>}</label>;
}
export const Input = ({ className, ...p }: React.InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cn(inputCls, className)} />;
export const Select = ({ className, children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cn(inputCls, "pr-8", className)}>{children}</select>;
export const Textarea = ({ className, ...p }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={cn(inputCls, "h-auto min-h-20 py-2", className)} />;
export function SearchBox({ value, onChange, placeholder = "Search", className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return <div className={cn("relative", className)}><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="pl-9" /></div>;
}
export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return <div role="tablist" className="inline-flex border border-black/20 bg-white">{options.map((o) => <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)} className={cn("h-9 whitespace-nowrap px-3 text-sm font-medium transition-colors", value === o.value ? "bg-black text-champagne" : "hover:bg-black/5")}>{o.label}</button>)}</div>;
}
export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: { value: T; label: string; count?: number }[] }) {
  return <div role="tablist" className="scroll-thin flex gap-6 overflow-x-auto border-b border-black/10">{tabs.map((t) => <button key={t.value} role="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)} className={cn("-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 py-3 text-sm font-medium", value === t.value ? "border-gold text-black" : "border-transparent text-muted hover:text-black")}>{t.label}{t.count !== undefined && <span className="bg-black/[.07] px-1.5 text-xs">{t.count}</span>}</button>)}</div>;
}

/* ── modal & drawer ──────────────────────────────────────── */
export function Modal({ open, onClose, title, children, footer, width = "max-w-lg" }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode; width?: string }) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/55" />
        <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center p-3">
          <Dialog.Popup className={cn("pointer-events-auto flex max-h-[92dvh] w-full flex-col bg-white outline-none", width)}>
            <header className="flex items-center justify-between border-b border-black/10 px-5 py-3"><Dialog.Title className="font-serif text-xl text-balance">{title}</Dialog.Title><Dialog.Close aria-label="Close" className="grid size-9 place-items-center hover:bg-black/5"><X size={18} /></Dialog.Close></header>
            <div className="scroll-thin overflow-y-auto p-5">{children}</div>
            {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-black/10 bg-cream/60 px-5 py-3">{footer}</footer>}
          </Dialog.Popup>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Drawer({ open, onClose, title, children, footer, width = "max-w-xl" }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode; width?: string }) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/45" />
        <Dialog.Popup className={cn("fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-xl outline-none", width)}>
          <header className="flex items-center justify-between border-b border-black/10 px-5 py-3"><Dialog.Title className="font-serif text-xl text-balance">{title}</Dialog.Title><Dialog.Close aria-label="Close" className="grid size-9 place-items-center hover:bg-black/5"><X size={18} /></Dialog.Close></header>
          <div className="scroll-thin flex-1 overflow-y-auto p-5">{children}</div>
          {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-black/10 bg-cream/60 px-5 py-3">{footer}</footer>}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
/** Destructive or irreversible actions use an AlertDialog. */
export function Confirm({ open, onClose, onConfirm, title, message, confirmLabel = "Confirm", danger, reasonLabel, optional }: { open: boolean; onClose: () => void; onConfirm: (reason: string) => void; title: string; message: React.ReactNode; confirmLabel?: string; danger?: boolean; reasonLabel?: string; optional?: boolean }) {
  const [reason, setReason] = useState(""); useEffect(() => { if (open) setReason(""); }, [open]);
  return (
    <AlertDialog.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/55" />
        <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center p-3">
          <AlertDialog.Popup className="pointer-events-auto flex max-h-[92dvh] w-full max-w-md flex-col bg-white outline-none">
            <header className="border-b border-black/10 px-5 py-3"><AlertDialog.Title className="font-serif text-xl text-balance">{title}</AlertDialog.Title></header>
            <AlertDialog.Description render={<div />} className="space-y-3 overflow-y-auto p-5 text-sm">{message}{reasonLabel && <Field label={reasonLabel}><Textarea value={reason} onChange={(e) => setReason(e.target.value)} autoFocus /></Field>}</AlertDialog.Description>
            <footer className="flex flex-wrap justify-end gap-2 border-t border-black/10 bg-cream/60 px-5 py-3"><Button onClick={onClose}>Back</Button><Button variant={danger ? "danger" : "gold"} disabled={!!reasonLabel && !optional && !reason.trim()} onClick={() => onConfirm(reason)}>{confirmLabel}</Button></footer>
          </AlertDialog.Popup>
        </div>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

/* ── toasts ──────────────────────────────────────────────── */
interface T { id: number; kind: "ok" | "error" | "warn"; text: string }
const ToastCtx = createContext<(kind: T["kind"], text: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [list, setList] = useState<T[]>([]);
  const push = useCallback((kind: T["kind"], text: string) => { const id = Date.now() + Math.random(); setList((l) => [...l, { id, kind, text }]); setTimeout(() => setList((l) => l.filter((x) => x.id !== id)), kind === "error" ? 6000 : 3500); }, []);
  return (
    <ToastCtx.Provider value={push}>{children}
      <div aria-live="polite" className="no-print fixed bottom-4 right-4 z-60 flex w-[min(92vw,380px)] flex-col gap-2">
        {list.map((t) => <div key={t.id} role="status" className={cn("flex items-start gap-2 border-l-4 bg-black px-4 py-3 text-sm text-white shadow-xl", t.kind === "ok" ? "border-gold" : t.kind === "warn" ? "border-amber-400" : "border-red-500")}>
          {t.kind === "ok" ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-champagne" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-300" />}<span>{t.text}</span></div>)}
      </div>
    </ToastCtx.Provider>
  );
}
/** Run a store action and toast the outcome. */
export function useAct() {
  const toast = useToast();
  return useCallback((r: { ok: boolean; error?: string; warning?: string }, success?: string) => { if (!r.ok) toast("error", r.error ?? "Something went wrong."); else { if (success) toast("ok", success); if (r.warning) toast("warn", r.warning); } return r.ok; }, [toast]);
}

/* ── data table with search/sort/pagination ──────────────── */
export interface Col<T> { key: string; header: string; cell: (r: T) => React.ReactNode; sort?: (r: T) => string | number; className?: string; hideBelow?: "md" | "lg" }
export function DataTable<T>({ rows, cols, rowKey, onRow, pageSize = 10, empty, initialSort }: { rows: T[]; cols: Col<T>[]; rowKey: (r: T) => string; onRow?: (r: T) => void; pageSize?: number; empty?: React.ReactNode; initialSort?: { key: string; dir: 1 | -1 } }) {
  const [sort, setSort] = useState(initialSort ?? null); const [page, setPage] = useState(0);
  const sorted = useMemo(() => { if (!sort) return rows; const c = cols.find((x) => x.key === sort.key); if (!c?.sort) return rows; return [...rows].sort((a, b) => { const x = c.sort!(a), y = c.sort!(b); return (x < y ? -1 : x > y ? 1 : 0) * sort.dir; }); }, [rows, sort, cols]);
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize)); const cur = Math.min(page, pages - 1);
  useEffect(() => { setPage(0); }, [rows.length]);
  const slice = sorted.slice(cur * pageSize, cur * pageSize + pageSize);
  const hide = (h?: string) => (h === "md" ? "hidden md:table-cell" : h === "lg" ? "hidden lg:table-cell" : "");
  if (!rows.length) return <>{empty ?? <Empty title="Nothing to show" />}</>;
  return (
    <div>
      <div className="scroll-thin overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead><tr className="border-b border-black/10 bg-cream/50 text-xs uppercase text-[#666]">
            {cols.map((c) => <th key={c.key} className={cn("px-3 py-2.5 font-semibold", hide(c.hideBelow), c.className)} aria-sort={sort?.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : undefined}>
              {c.sort ? <button className="flex items-center gap-1 uppercase hover:text-black" onClick={() => setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === 1 ? -1 : 1 } : { key: c.key, dir: 1 }))}>{c.header}<span className="text-gold">{sort?.key === c.key ? (sort.dir === 1 ? "↑" : "↓") : ""}</span></button> : c.header}</th>)}
          </tr></thead>
          <tbody>{slice.map((r) => (
            <tr key={rowKey(r)} onClick={onRow ? () => onRow(r) : undefined} className={cn("border-b border-black/[.07] last:border-0", onRow && "cursor-pointer hover:bg-cream/50")}>
              {cols.map((c) => <td key={c.key} className={cn("px-3 py-3 align-middle", hide(c.hideBelow), c.className)}>{c.cell(r)}</td>)}</tr>))}</tbody>
        </table>
      </div>
      {pages > 1 && <div className="flex items-center justify-between border-t border-black/10 px-3 py-2 text-xs text-muted">
        <span>{cur * pageSize + 1}–{Math.min(sorted.length, cur * pageSize + pageSize)} of {sorted.length}</span>
        <div className="flex items-center gap-1"><button aria-label="Previous page" disabled={cur === 0} onClick={() => setPage(cur - 1)} className="grid h-8 w-8 place-items-center border border-black/15 disabled:opacity-30"><ChevronLeft size={15} /></button><span className="px-2">Page {cur + 1} / {pages}</span><button aria-label="Next page" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)} className="grid h-8 w-8 place-items-center border border-black/15 disabled:opacity-30"><ChevronRight size={15} /></button></div>
      </div>}
    </div>
  );
}

export function KV({ k, v }: { k: string; v: React.ReactNode }) { return <div className="flex items-baseline justify-between gap-4 border-b border-black/[.07] py-2 text-sm last:border-0"><dt className="text-muted">{k}</dt><dd className="text-right font-medium">{v}</dd></div>; }
export function Loading({ label = "Loading…" }: { label?: string }) { return <div className="grid min-h-[40vh] place-items-center text-sm text-muted"><span className="flex items-center gap-2"><Loader2 className="animate-spin" size={16} />{label}</span></div>; }
export function Denied() { return <Empty title="You don't have access to this page" hint="Your role doesn't include the permission this area needs. Ask a manager if you think this is a mistake." />; }

/* ── tiny SVG charts ─────────────────────────────────────── */
export function BarChart({ data, height = 160, money = false }: { data: { label: string; value: number }[]; height?: number; money?: boolean }) {
  const max = Math.max(1, ...data.map((d) => d.value)); const w = 100 / Math.max(1, data.length);
  return (
    <div>
      <svg viewBox={`0 0 100 ${height / 4}`} preserveAspectRatio="none" className="w-full" style={{ height }} role="img" aria-label="Bar chart">
        {[0.25, 0.5, 0.75].map((g) => <line key={g} x1="0" x2="100" y1={(height / 4) * g} y2={(height / 4) * g} stroke="rgba(0,0,0,.07)" strokeWidth=".3" />)}
        {data.map((d, i) => { const h = (d.value / max) * (height / 4 - 2); return <rect key={d.label} x={i * w + w * 0.2} width={w * 0.6} y={height / 4 - h} height={h} fill={i === data.length - 1 ? "#c9a348" : "#151515"}><title>{`${d.label}: ${money ? "₦" : ""}${d.value.toLocaleString()}`}</title></rect>; })}
      </svg>
      <div className="mt-1 flex">{data.map((d) => <span key={d.label} className="flex-1 truncate text-center text-[11px] text-muted">{d.label}</span>)}</div>
    </div>
  );
}
export function Meter({ value, max, tone = "gold" }: { value: number; max: number; tone?: "gold" | "red" | "green" }) {
  const pct = max <= 0 ? 0 : Math.min(100, (value / max) * 100); return <div className="h-2 w-full bg-black/[.08]"><div className={cn("h-full", tone === "gold" ? "bg-gold" : tone === "red" ? "bg-[#9b2c2c]" : "bg-[#1f6a36]")} style={{ width: `${pct}%` }} /></div>;
}
