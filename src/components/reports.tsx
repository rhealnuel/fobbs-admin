"use client";
import { useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";
import { useDB, useStore } from "@/store/store";
import type { DB } from "@/types";
import { BarChart, Button, Card, Empty, Input, Segmented, Stat } from "@/components/ui";
import { addDays, cn, downloadCSV, fmtDate, fmtShort, localDay, money, overlaps, todayISO } from "@/lib/utils";
import { orderGross, orderTotal, paidFor, resBalance, shiftSummary, orderBalance } from "@/lib/calc";

export function useRange(days = 7) { const [from, setFrom] = useState(addDays(todayISO(), -(days - 1))); const [to, setTo] = useState(todayISO()); return { from, to, setFrom, setTo }; }
type R = ReturnType<typeof useRange>;
export function RangeBar({ r, title }: { r: R; title: string }) {
  const { can } = useStore(); const preset = (n: number) => { r.setFrom(addDays(todayISO(), -(n - 1))); r.setTo(todayISO()); };
  return (
    <div className="no-print mb-4 flex flex-wrap items-end gap-3 border border-black/10 bg-white p-3">
      <label className="text-xs font-semibold uppercase text-[#555]">From<Input type="date" className="mt-1 w-44" value={r.from} max={r.to} onChange={(e) => r.setFrom(e.target.value)} /></label>
      <label className="text-xs font-semibold uppercase text-[#555]">To<Input type="date" className="mt-1 w-44" value={r.to} min={r.from} onChange={(e) => r.setTo(e.target.value)} /></label>
      <div className="flex gap-1"><Button size="sm" onClick={() => preset(1)}>Today</Button><Button size="sm" onClick={() => preset(7)}>7 days</Button><Button size="sm" onClick={() => preset(30)}>30 days</Button><Button size="sm" onClick={() => preset(90)}>90 days</Button></div>
      <div className="ml-auto"><Button onClick={() => window.print()}><Printer size={15} />Print {title}</Button></div>
    </div>
  );
}
const inR = (iso: string, r: R) => { const d = localDay(iso); return d >= r.from && d <= r.to; };
const inRD = (d: string, r: R) => d >= r.from && d <= r.to;
export const daysIn = (r: R) => { const out: string[] = []; for (let d = r.from; d <= r.to && out.length < 400; d = addDays(d, 1)) out.push(d); return out; };

export interface Column { h: string; money?: boolean; right?: boolean }
export function Section({ title, cols, rows, csv, note, total }: { title: string; cols: Column[]; rows: (string | number)[][]; csv: string; note?: string; total?: (string | number)[] }) {
  const { can } = useStore(); const fmt = (c: Column, v: string | number) => (c.money && typeof v === "number" ? (v < 0 ? `−${money(-v)}` : money(v)) : v);
  return (
    <Card title={title} pad={false} action={can("reports.export") ? <Button size="sm" className="no-print" onClick={() => downloadCSV(csv, [cols.map((c) => c.h), ...rows, ...(total ? [total] : [])])}><Download size={14} />CSV</Button> : undefined}>
      {rows.length ? <div className="scroll-thin overflow-x-auto"><table className="w-full min-w-[420px] text-sm"><thead><tr className="border-b border-black/10 bg-cream/50 text-left text-xs uppercase text-[#666]">{cols.map((c) => <th key={c.h} className={cn("px-4 py-2 font-semibold", (c.money || c.right) && "text-right")}>{c.h}</th>)}</tr></thead>
        <tbody>{rows.map((row, i) => <tr key={i} className="border-b border-black/[.06]">{row.map((v, j) => <td key={j} className={cn("px-4 py-2", (cols[j].money || cols[j].right) && "text-right")}>{fmt(cols[j], v)}</td>)}</tr>)}
          {total && <tr className="font-semibold">{total.map((v, j) => <td key={j} className={cn("px-4 py-2", (cols[j].money || cols[j].right) && "text-right")}>{fmt(cols[j], v)}</td>)}</tr>}</tbody></table></div> : <Empty title="No data for this period" />}
      {note && <p className="border-t border-black/10 px-4 py-2 text-xs text-muted">{note}</p>}
    </Card>
  );
}
const sortDesc = (o: Record<string, number>): [string, number][] => Object.entries(o).sort((a, b) => b[1] - a[1]);
const add = (o: Record<string, number>, k: string, v: number) => { o[k] = (o[k] ?? 0) + v; };
const weekStart = (d: string) => { const dt = new Date(d + "T12:00:00"); const g = (dt.getDay() + 6) % 7; return addDays(d, -g); };
const group = (d: string, mode: "day" | "week" | "month") => (mode === "day" ? d : mode === "week" ? weekStart(d) : d.slice(0, 7));

/* ── data helpers ─────────────────────────────────────── */
export function revenue(db: DB, r: R) {
  const pays = db.payments.filter((p) => inR(p.at, r)); const gross = (k: string) => pays.filter((p) => p.kind === k && p.amount > 0).reduce((s, p) => s + p.amount, 0); const refunds = -pays.filter((p) => p.amount < 0).reduce((s, p) => s + p.amount, 0);
  const exp = db.expenses.filter((e) => e.status === "Approved" && inR(e.at, r)).reduce((s, e) => s + e.amount, 0);
  const hotel = gross("hotel"), lounge = gross("lounge");
  return { pays, hotel, lounge, refunds, exp, net: hotel + lounge - refunds, operating: hotel + lounge - refunds - exp };
}
function trendRows(db: DB, r: R, mode: "day" | "week" | "month") {
  const m: Record<string, [number, number]> = {}; db.payments.filter((p) => inR(p.at, r)).forEach((p) => { const k = group(localDay(p.at), mode); const e = (m[k] ??= [0, 0]); e[p.kind === "hotel" ? 0 : 1] += p.amount; });
  return Object.keys(m).sort().map((k) => ({ k, hotel: m[k][0], lounge: m[k][1] }));
}
export function TrendChart({ db, r }: { db: DB; r: R }) {
  const [mode, setMode] = useState<"day" | "week" | "month">("day"); const t = trendRows(db, r, mode);
  return (<Card title="Revenue trend" action={<Segmented value={mode} onChange={setMode} options={[{ value: "day", label: "Daily" }, { value: "week", label: "Weekly" }, { value: "month", label: "Monthly" }]} />}>
    {t.length ? <BarChart height={170} money data={t.map((x) => ({ label: mode === "month" ? x.k.slice(2) : fmtShort(x.k).slice(0, 6), value: x.hotel + x.lounge }))} /> : <Empty title="No payments in this period" />}
    <p className="mt-2 text-xs text-muted">Hotel and lounge revenue combined; the table below separates them. Refunds are netted off.</p></Card>);
}

/* ── FINANCIAL REPORT ─────────────────────────────────── */
export function FinanceReport() {
  const db = useDB(); const r = useRange(30); const v = revenue(db, r); const mode = "day" as const;
  const byCat: Record<string, number> = {}; v.pays.filter((p) => p.kind === "hotel").forEach((p) => { const res = db.reservations.find((x) => x.id === p.refId); add(byCat, db.categories.find((c) => c.id === res?.categoryId)?.name ?? "Other", p.amount); });
  const byProd: Record<string, number> = {}; db.orders.filter((o) => !["Draft", "Cancelled"].includes(o.status) && inR(o.at, r)).forEach((o) => o.items.forEach((i) => add(byProd, i.name, i.price * i.qty)));
  const byMethod: Record<string, [number, number]> = {}; v.pays.filter((p) => p.amount > 0).forEach((p) => { const e = (byMethod[p.method] ??= [0, 0]); e[p.verified ? 0 : 1] += p.amount; });
  const expCat: Record<string, number> = {}; db.expenses.filter((e) => e.status === "Approved" && inR(e.at, r)).forEach((e) => add(expCat, e.category, e.amount));
  const outstandingHotel = db.reservations.filter((x) => ["Confirmed", "Checked In", "Checked Out"].includes(x.status) && resBalance(db, x) > 0); const outstandingLounge = db.orders.filter((o) => !["Draft", "Cancelled"].includes(o.status) && orderBalance(db, o) > 0);
  const shifts = db.shifts.filter((s) => s.status !== "Open" && inRD(localDay(s.start), r));
  const setl = { cash: 0, transferV: 0, transferU: 0, pos: 0 }; v.pays.filter((p) => p.amount > 0).forEach((p) => { if (p.method === "Cash") setl.cash += p.amount; else if (p.method === "POS/Card") setl.pos += p.amount; else p.verified ? (setl.transferV += p.amount) : (setl.transferU += p.amount); });
  const days = daysIn(r).length;
  return (
    <div className="print-area space-y-5">
      <RangeBar r={r} title="report" />
      <p className="hidden print:block">{db.settings.hotelName} · Financial report · {fmtDate(r.from)} to {fmtDate(r.to)}</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"><Stat label="Hotel revenue" value={money(v.hotel)} /><Stat label="Lounge revenue" value={money(v.lounge)} /><Stat label="Refunds paid" value={money(v.refunds)} /><Stat label="Net revenue" value={money(v.net)} tone="gold" /><Stat label="Approved expenses" value={money(v.exp)} /><Stat label="Operating result" value={money(v.operating)} sub="Recorded costs only" /></div>
      <TrendChart db={db} r={r} />
      <div className="grid gap-5 xl:grid-cols-2">
        <Section title="Revenue by accommodation category" csv="revenue-by-category.csv" cols={[{ h: "Category" }, { h: "Net received", money: true }]} rows={sortDesc(byCat)} note="Hotel payments net of refunds." />
        <Section title="Revenue by product" csv="revenue-by-product.csv" cols={[{ h: "Product" }, { h: "Sales", money: true }]} rows={sortDesc(byProd)} note="Order value net of cancelled orders; before discounts." />
        <Section title="Revenue by payment method" csv="revenue-by-method.csv" cols={[{ h: "Method" }, { h: "Verified", money: true }, { h: "Unverified", money: true }]} rows={Object.entries(byMethod).map(([k, [a, b]]) => [k, a, b])} />
        <Section title="Expenses by category" csv="expenses.csv" cols={[{ h: "Category" }, { h: "Approved", money: true }]} rows={sortDesc(expCat)} total={["Total", v.exp]} />
        <Section title="Refunds" csv="refunds.csv" cols={[{ h: "Date" }, { h: "Reference" }, { h: "Status" }, { h: "Amount", money: true }]} rows={db.refunds.filter((f) => inR(f.at, r)).map((f) => [fmtShort(f.at), (f.kind === "hotel" ? db.reservations.find((x) => x.id === f.refId)?.ref : db.orders.find((o) => o.id === f.refId)?.ref) ?? f.refId, f.status, f.amount])} />
        <Section title="Cash and bank settlement" csv="settlement.csv" cols={[{ h: "Channel" }, { h: "Amount", money: true }]} rows={[["Cash recorded", setl.cash], ["Bank transfers (verified)", setl.transferV], ["Bank transfers (awaiting verification)", setl.transferU], ["POS / card", setl.pos]]} note="Unverified transfers are not treated as settled until checked against bank evidence." />
      </div>
      <Section title="Outstanding balances" csv="outstanding.csv" cols={[{ h: "Type" }, { h: "Reference" }, { h: "Who" }, { h: "Balance", money: true }]}
        rows={[...outstandingHotel.map((x) => ["Hotel", x.ref, db.guests.find((g) => g.id === x.guestId)?.name ?? "", resBalance(db, x)] as (string | number)[]), ...outstandingLounge.map((o) => ["Lounge", o.ref, o.customer || o.table || o.type, orderBalance(db, o)] as (string | number)[])]} total={["Total", "", "", outstandingHotel.reduce((s, x) => s + resBalance(db, x), 0) + outstandingLounge.reduce((s, o) => s + orderBalance(db, o), 0)]} />
      <Section title="Shift reconciliation" csv="shift-reconciliation.csv" cols={[{ h: "Staff" }, { h: "Shift start" }, { h: "Recorded", money: true }, { h: "Actual", money: true }, { h: "Difference", money: true }, { h: "Status" }]}
        rows={shifts.map((s) => { const sm = shiftSummary(db, s.id); const a = s.actual ? s.actual.cash + s.actual.transfer + s.actual.pos : 0; return [db.staff.find((x) => x.id === s.staffId)?.name ?? "", fmtShort(s.start), sm.collected, a, s.actual ? a - sm.collected : 0, s.status]; })} />
      <p className="text-xs text-muted">{days} day period. Payments are grouped by the date they were recorded.</p>
    </div>
  );
}

/* ── LOUNGE REPORT ────────────────────────────────────── */
export function LoungeReport() {
  const db = useDB(); const r = useRange(7); const orders = db.orders.filter((o) => !["Draft", "Cancelled"].includes(o.status) && inR(o.at, r));
  const total = orders.reduce((s, o) => s + orderTotal(o), 0); const w: Record<string, number> = {}, p: Record<string, number> = {}, c: Record<string, number> = {}, m: Record<string, number> = {};
  orders.forEach((o) => { add(w, db.staff.find((s) => s.id === o.waiterId)?.name ?? "", orderTotal(o)); o.items.forEach((i) => { add(p, i.name, i.price * i.qty); add(c, db.products.find((x) => x.id === i.productId)?.category ?? "Other", i.price * i.qty); }); });
  db.payments.filter((x) => x.kind === "lounge" && x.amount > 0 && inR(x.at, r)).forEach((x) => add(m, x.method, x.amount));
  const moves = db.stock.filter((s) => inR(s.at, r)); const loss: Record<string, [number, number, number]> = {}; moves.filter((s) => ["Breakage", "Wastage", "Complimentary"].includes(s.type)).forEach((s) => { const n = db.products.find((x) => x.id === s.productId)?.name ?? ""; const e = (loss[n] ??= [0, 0, 0]); e[["Breakage", "Wastage", "Complimentary"].indexOf(s.type)] += -s.qty; });
  const shifts = db.shifts.filter((s) => s.status !== "Open" && inRD(localDay(s.start), r));
  return (
    <div className="print-area space-y-5"><RangeBar r={r} title="report" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label="Net sales" value={money(total)} tone="gold" /><Stat label="Orders" value={orders.length} /><Stat label="Average order" value={money(orders.length ? total / orders.length : 0)} /><Stat label="Discounts given" value={money(orders.reduce((s, o) => s + o.discount, 0))} /></div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Section title="Sales by waiter" csv="sales-by-waiter.csv" cols={[{ h: "Waiter" }, { h: "Net sales", money: true }]} rows={sortDesc(w)} total={["Total", total]} />
        <Section title="Sales by payment method" csv="sales-by-method.csv" cols={[{ h: "Method" }, { h: "Received", money: true }]} rows={sortDesc(m)} />
        <Section title="Sales by product" csv="sales-by-product.csv" cols={[{ h: "Product" }, { h: "Sales", money: true }]} rows={sortDesc(p)} />
        <Section title="Sales by category" csv="sales-by-category.csv" cols={[{ h: "Category" }, { h: "Sales", money: true }]} rows={sortDesc(c)} />
        <Section title="Stock wastage and losses" csv="wastage.csv" cols={[{ h: "Product" }, { h: "Breakage", right: true }, { h: "Wastage", right: true }, { h: "Complimentary", right: true }]} rows={Object.entries(loss).map(([k, [a, b, d]]) => [k, a, b, d])} />
        <Section title="Stock movement summary" csv="stock-movement.csv" cols={[{ h: "Product" }, { h: "In", right: true }, { h: "Out", right: true }, { h: "Now", right: true }]} rows={db.products.filter((x) => x.track).map((x) => [x.name, moves.filter((s) => s.productId === x.id && s.qty > 0).reduce((a, s) => a + s.qty, 0), -moves.filter((s) => s.productId === x.id && s.qty < 0).reduce((a, s) => a + s.qty, 0), x.stock])} />
      </div>
      <Section title="Shift reconciliation" csv="lounge-reconciliation.csv" cols={[{ h: "Staff" }, { h: "Date" }, { h: "Net sales", money: true }, { h: "Cash difference", money: true }, { h: "Status" }]} rows={shifts.map((s) => { const sm = shiftSummary(db, s.id); return [db.staff.find((x) => x.id === s.staffId)?.name ?? "", fmtShort(s.start), sm.net, s.actual ? s.actual.cash - sm.cash : 0, s.status]; })} />
    </div>
  );
}

/* ── HOTEL REPORT ─────────────────────────────────────── */
export function HotelReport() {
  const db = useDB(); const r = useRange(14); const rooms = db.rooms.filter((x) => x.active).length; const days = daysIn(r);
  const occ = days.map((d) => { const n = db.reservations.filter((x) => ["Checked In", "Checked Out", "Confirmed"].includes(x.status) && overlaps(d, addDays(d, 1), x.checkIn, x.checkOut)).length; return { d, n, pct: Math.round((n / Math.max(1, rooms)) * 100) }; });
  const inRange = db.reservations.filter((x) => inRD(x.checkIn, r)); const byStatus: Record<string, number> = {}, bySrc: Record<string, number> = {}, revCat: Record<string, number> = {};
  inRange.forEach((x) => { add(byStatus, x.status, 1); add(bySrc, x.source, 1); });
  db.payments.filter((p) => p.kind === "hotel" && inR(p.at, r)).forEach((p) => add(revCat, db.categories.find((c) => c.id === db.reservations.find((x) => x.id === p.refId)?.categoryId)?.name ?? "Other", p.amount));
  const g = (id: string) => db.guests.find((x) => x.id === id)?.name ?? "";
  const hist: Record<string, [number, number]> = {}; db.reservations.filter((x) => ["Checked In", "Checked Out"].includes(x.status)).forEach((x) => { const e = (hist[g(x.guestId)] ??= [0, 0]); e[0] += 1; e[1] += paidFor(db, x.id); });
  return (
    <div className="print-area space-y-5"><RangeBar r={r} title="report" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label="Average occupancy" value={`${Math.round(occ.reduce((s, x) => s + x.pct, 0) / Math.max(1, occ.length))}%`} tone="gold" /><Stat label="Reservations (by check-in)" value={inRange.length} /><Stat label="Check-ins" value={db.reservations.filter((x) => x.actualIn && inR(x.actualIn, r)).length} /><Stat label="Cancellations" value={inRange.filter((x) => ["Cancelled", "Refund Pending", "Refunded", "No-show"].includes(x.status)).length} /></div>
      <Card title="Occupancy by night"><BarChart height={150} data={occ.slice(-31).map((x) => ({ label: String(new Date(x.d + "T12:00").getDate()), value: x.pct }))} /><p className="mt-2 text-xs text-muted">Percentage of {rooms} active rooms held each night (check-in inclusive, check-out exclusive).</p></Card>
      <div className="grid gap-5 xl:grid-cols-2">
        <Section title="Reservations by status" csv="reservations-by-status.csv" cols={[{ h: "Status" }, { h: "Count", right: true }]} rows={sortDesc(byStatus)} />
        <Section title="Reservations by source" csv="reservations-by-source.csv" cols={[{ h: "Source" }, { h: "Count", right: true }]} rows={sortDesc(bySrc)} />
        <Section title="Revenue by room category" csv="hotel-revenue-by-category.csv" cols={[{ h: "Category" }, { h: "Received", money: true }]} rows={sortDesc(revCat)} />
        <Section title="Guest history" csv="guest-history.csv" cols={[{ h: "Guest" }, { h: "Stays", right: true }, { h: "Paid", money: true }]} rows={Object.entries(hist).sort((a, b) => b[1][1] - a[1][1]).map(([k, [n, t]]) => [k, n, t])} />
      </div>
      <Section title="Check-ins and check-outs" csv="checkins-checkouts.csv" cols={[{ h: "Reference" }, { h: "Guest" }, { h: "Room" }, { h: "Checked in" }, { h: "Checked out" }]} rows={db.reservations.filter((x) => (x.actualIn && inR(x.actualIn, r)) || (x.actualOut && inR(x.actualOut, r))).map((x) => [x.ref, g(x.guestId), db.rooms.find((y) => y.id === x.roomId)?.number ?? "—", x.actualIn ? fmtShort(x.actualIn) : "—", x.actualOut ? fmtShort(x.actualOut) : "—"])} />
      <Section title="Cancellations and no-shows" csv="cancellations.csv" cols={[{ h: "Reference" }, { h: "Guest" }, { h: "Check-in" }, { h: "Status" }, { h: "Amount", money: true }]} rows={inRange.filter((x) => ["Cancelled", "Refund Pending", "Refunded", "No-show"].includes(x.status)).map((x) => [x.ref, g(x.guestId), fmtShort(x.checkIn), x.status, x.amount])} />
    </div>
  );
}

/* ── BUSINESS REPORT ──────────────────────────────────── */
export function BusinessReport() {
  const db = useDB(); const r = useRange(30); const v = revenue(db, r); const exp = db.expenses.filter((e) => e.status === "Approved" && inR(e.at, r)); const ec: Record<string, number> = {}; exp.forEach((e) => add(ec, e.category, e.amount));
  return (
    <div className="print-area space-y-5"><RangeBar r={r} title="report" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label="Combined revenue" value={money(v.hotel + v.lounge)} tone="gold" /><Stat label="Refunds" value={money(v.refunds)} /><Stat label="Approved expenses" value={money(v.exp)} /><Stat label="Net operating result" value={money(v.operating)} sub="Only costs that were recorded" /></div>
      <TrendChart db={db} r={r} />
      <div className="grid gap-5 xl:grid-cols-2"><Section title="Hotel and lounge revenue" csv="combined-revenue.csv" cols={[{ h: "Stream" }, { h: "Gross received", money: true }]} rows={[["Hotel", v.hotel], ["Lounge", v.lounge], ["Refunds", -v.refunds]]} total={["Net", v.net]} /><Section title="Expense summary" csv="expense-summary.csv" cols={[{ h: "Category" }, { h: "Approved", money: true }]} rows={sortDesc(ec)} total={["Total", v.exp]} /></div>
      <p className="text-xs text-muted">Net operating performance is only meaningful when all costs (payroll, rent, stock purchases, utilities) are recorded as expenses. Until then treat it as a partial figure.</p>
    </div>
  );
}
