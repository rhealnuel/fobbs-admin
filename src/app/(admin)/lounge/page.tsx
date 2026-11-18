"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useDB } from "@/store/store";
import { BarChart, Card, Meter, PageHeader, Segmented, Stat } from "@/components/ui";
import { addDays, fmtShort, localDay, money, todayISO } from "@/lib/utils";
import { orderTotal } from "@/lib/calc";

export default function LoungeOverview() {
  const db = useDB(); const today = todayISO(); const [range, setRange] = useState<"7" | "30">("7");
  const D = useMemo(() => {
    const live = db.orders.filter((o) => !["Draft", "Cancelled"].includes(o.status)); const t = live.filter((o) => localDay(o.at) === today);
    const sales = (day: string) => live.filter((o) => localDay(o.at) === day).reduce((s, o) => s + orderTotal(o), 0);
    const n = Number(range); const daily = Array.from({ length: n }, (_, i) => { const d = addDays(today, i - (n - 1)); return { label: n > 7 ? String(new Date(d + "T12:00").getDate()) : fmtShort(d).slice(0, 6), value: sales(d) }; });
    const pm: Record<string, number> = {}; db.payments.filter((p) => p.kind === "lounge" && localDay(p.at) === today).forEach((p) => { pm[p.method] = (pm[p.method] ?? 0) + p.amount; });
    const wt: Record<string, number> = {}; t.forEach((o) => { const n_ = db.staff.find((s) => s.id === o.waiterId)?.name ?? o.waiterId; wt[n_] = (wt[n_] ?? 0) + orderTotal(o); });
    const bp: Record<string, number> = {}, bc: Record<string, number> = {}; live.filter((o) => localDay(o.at) >= addDays(today, -6)).forEach((o) => o.items.forEach((i) => { bp[i.name] = (bp[i.name] ?? 0) + i.qty; const c = db.products.find((p) => p.id === i.productId)?.category ?? "Other"; bc[c] = (bc[c] ?? 0) + i.price * i.qty; }));
    const sort = (o: Record<string, number>) => Object.entries(o).sort((a, b) => b[1] - a[1]);
    return { t, total: t.reduce((s, o) => s + orderTotal(o), 0), daily, pm: sort(pm), wt: sort(wt), bp: sort(bp).slice(0, 5), bc: sort(bc) };
  }, [db, today, range]);
  const low = db.products.filter((p) => p.active && p.track && p.stock <= p.lowAt); const open = (s: string[]) => db.orders.filter((o) => s.includes(o.status)).length;
  const unpaid = db.orders.filter((o) => ["Served", "Ready", "Preparing", "Accepted", "Submitted"].includes(o.status)).length;
  const Rank = ({ rows, money: m = true }: { rows: [string, number][]; money?: boolean }) => { const max = Math.max(1, ...rows.map((r) => r[1])); return rows.length ? <ul className="space-y-2.5">{rows.map(([k, v]) => <li key={k} className="text-sm"><div className="flex justify-between"><span>{k}</span><span>{m ? money(v) : v}</span></div><Meter value={v} max={max} /></li>)}</ul> : <p className="text-sm text-muted">No data yet today.</p>; };
  return (
    <>
      <PageHeader title="Lounge Overview" sub="Live view of today's trading" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Stat label="Sales today" value={money(D.total)} tone="gold" /><Stat label="Orders today" value={D.t.length} href="/lounge/orders" /><Stat label="Active waiters" value={new Set(db.shifts.filter((s) => s.status === "Open").map((s) => s.staffId)).size} /><Stat label="Active shifts" value={db.shifts.filter((s) => s.status === "Open").length} href="/lounge/shifts" />
        <Stat label="Awaiting preparation" value={open(["Submitted", "Accepted", "Preparing"])} href="/lounge/bar" /><Stat label="Ready for collection" value={open(["Ready"])} href="/lounge/bar" /><Stat label="Orders not yet paid" value={unpaid} sub="Open and unpaid" href="/lounge/orders" />
        <Stat label="Pending reconciliations" value={db.shifts.filter((s) => ["Submitted", "Flagged"].includes(s.status)).length} tone={db.shifts.some((s) => ["Submitted", "Flagged"].includes(s.status)) ? "red" : undefined} href="/lounge/reconciliation" /><Stat label="Low-stock products" value={low.length} tone={low.length ? "red" : undefined} href="/lounge/inventory" />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card title="Daily sales" className="xl:col-span-2" action={<Segmented value={range} onChange={setRange} options={[{ value: "7", label: "7 days" }, { value: "30", label: "30 days" }]} />}><BarChart data={D.daily} money height={190} /><p className="mt-2 text-xs text-muted">Net of discounts, excluding cancelled orders. Demonstration data covers only the last two days.</p></Card>
        <Card title="Sales by payment method (today)"><Rank rows={D.pm as [string, number][]} /></Card>
        <Card title="Sales by waiter (today)"><Rank rows={D.wt as [string, number][]} /></Card>
        <Card title="Best-selling products (7 days)"><Rank rows={D.bp as [string, number][]} money={false} /></Card>
        <Card title="Sales by category (7 days)"><Rank rows={D.bc as [string, number][]} /></Card>
      </div>
      {low.length > 0 && <Card title="Low stock" className="mt-5" action={<Link href="/lounge/inventory" className="text-xs underline">Manage stock</Link>}><div className="flex flex-wrap gap-2">{low.map((p) => <span key={p.id} className="bg-[#f8e3e1] px-2.5 py-1 text-sm text-[#9b2c2c]">{p.name}: {p.stock} left</span>)}</div></Card>}
    </>
  );
}
