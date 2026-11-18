"use client";
import Link from "next/link";
import { useMemo } from "react";
import { useDB, useStore } from "@/store/store";
import { Badge, BarChart, Card, Empty, Meter, PageHeader, Stat } from "@/components/ui";
import { addDays, ago, fmtShort, localDay, money, overlaps, todayISO } from "@/lib/utils";
import { orderTotal, orderGross, paidFor, resPayStatus, roomDisplayStatus } from "@/lib/calc";

export default function Dashboard() {
  const db = useDB(); const { can, user } = useStore(); const today = todayISO();
  const D = useMemo(() => {
    const rooms = db.rooms.filter((r) => r.active); const disp = rooms.map((r) => roomDisplayStatus(db, r, today));
    const count = (s: string) => disp.filter((x) => x === s).length;
    const guestName = (id: string) => db.guests.find((g) => g.id === id)?.name ?? "";
    const arrivals = db.reservations.filter((r) => r.checkIn === today && ["Confirmed", "Pending Payment", "Checked In"].includes(r.status));
    const departures = db.reservations.filter((r) => r.checkOut === today && ["Checked In", "Checked Out"].includes(r.status));
    const inHouse = db.reservations.filter((r) => r.status === "Checked In");
    const pays = db.payments.filter((p) => localDay(p.at) === today);
    const hotelRev = pays.filter((p) => p.kind === "hotel").reduce((s, p) => s + p.amount, 0); const loungeRev = pays.filter((p) => p.kind === "lounge").reduce((s, p) => s + p.amount, 0);
    const by = (m: string) => pays.filter((p) => p.method === m).reduce((s, p) => s + p.amount, 0);
    const occ = (day: string) => db.reservations.filter((r) => ["Checked In", "Checked Out", "Confirmed"].includes(r.status) && overlaps(day, addDays(day, 1), r.checkIn, r.checkOut)).length;
    const trend = Array.from({ length: 7 }, (_, i) => { const day = addDays(today, i - 6); return { label: fmtShort(day).slice(0, 6), value: Math.round((occ(day) / Math.max(1, rooms.length)) * 100) }; });
    const cats = db.categories.map((c) => { const rs = rooms.filter((r) => r.categoryId === c.id); return { c, total: rs.length, occupied: rs.filter((r) => r.status === "Occupied").length, free: rs.filter((r) => roomDisplayStatus(db, r, today) === "Available").length }; });
    const todays = db.orders.filter((o) => localDay(o.at) === today && !["Draft", "Cancelled"].includes(o.status));
    const sales = todays.reduce((s, o) => s + orderTotal(o), 0);
    const best: Record<string, number> = {}; todays.forEach((o) => o.items.forEach((i) => { best[i.name] = (best[i.name] ?? 0) + i.qty; }));
    return { rooms, count, guestName, arrivals, departures, inHouse, hotelRev, loungeRev, by, trend, cats, todays, sales, best: Object.entries(best).sort((a, b) => b[1] - a[1]).slice(0, 5), activeShifts: db.shifts.filter((s) => s.status === "Open").length, pendingRecon: db.shifts.filter((s) => ["Submitted", "Flagged"].includes(s.status)).length, occPct: Math.round((disp.filter((x) => x === "Occupied").length / Math.max(1, rooms.length)) * 100) };
  }, [db, today]);
  const hotel = can("reservations.view"), lounge = can("lounge.view"), fin = can(["payments.view", "reports.financial"]);
  const pending = db.reservations.filter((r) => r.status === "Pending Payment"); const cancelled = db.reservations.filter((r) => ["Cancelled", "Refund Pending"].includes(r.status)).slice(0, 3);
  const recent = [...db.reservations].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);
  const acts = (can("logs.view") ? db.activity : db.activity.filter((a) => a.staffId === user?.id)).slice(0, 8);
  const who = (id: string) => db.staff.find((s) => s.id === id)?.name ?? "System";
  return (
    <>
      <PageHeader title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, ${user?.name.split(" ")[0]}`} sub={new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) + " · Demonstration data"} />
      {hotel && <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Stat label="Total rooms" value={D.rooms.length} href="/rooms" /><Stat label="Available" value={D.count("Available")} tone="gold" href="/rooms" /><Stat label="Occupied" value={D.count("Occupied")} href="/rooms" /><Stat label="Reserved today" value={D.count("Reserved")} href="/availability" /><Stat label="In maintenance" value={D.count("Maintenance")} href="/maintenance" />
        <Stat label="Arrivals today" value={D.arrivals.length} href="/front-desk" /><Stat label="Departures today" value={D.departures.length} href="/front-desk" /><Stat label="Guests in house" value={D.inHouse.length} href="/front-desk" />
        {fin ? <><Stat label="Hotel revenue today" value={money(D.hotelRev)} href="/finance/payments" /><Stat label="Lounge revenue today" value={money(D.loungeRev)} href="/finance/payments" /></> : null}
      </div>}
      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        {hotel && <Card title="Occupancy overview" className="xl:col-span-2">
          <div className="grid gap-6 md:grid-cols-[180px_1fr]">
            <div><p className="font-serif text-5xl">{D.occPct}<span className="text-2xl">%</span></p><p className="text-sm text-muted">{D.count("Occupied")} of {D.rooms.length} rooms occupied</p><div className="mt-3"><Meter value={D.count("Occupied")} max={D.rooms.length} /></div>
              <p className="mt-2 text-xs text-muted">{D.count("Available")} available · {D.count("Cleaning")} cleaning</p></div>
            <div><p className="mb-1 text-xs uppercase text-muted">Occupancy % · last 7 days</p><BarChart data={D.trend} height={120} /></div>
          </div>
          <div className="mt-5 divide-y divide-black/[.07] border-t border-black/10">{D.cats.map(({ c, total, occupied, free }) => <div key={c.id} className="grid grid-cols-[1fr_auto] items-center gap-4 py-2.5 text-sm md:grid-cols-[200px_1fr_auto]"><span>{c.name}</span><span className="hidden md:block"><Meter value={occupied} max={total} /></span><span className="text-xs text-muted">{occupied}/{total} occupied · {free} free</span></div>)}</div>
        </Card>}
        {hotel && <Card title="Today's reservations" action={<Link href="/reservations" className="text-xs underline">All</Link>}>
          <div className="space-y-4 text-sm">
            <div><p className="mb-1 text-xs uppercase text-muted">Upcoming check-ins ({D.arrivals.filter((r) => r.status !== "Checked In").length})</p>{D.arrivals.filter((r) => r.status !== "Checked In").map((r) => <Link key={r.id} href={`/reservations/${r.id}`} className="flex items-center justify-between py-1 hover:text-gold"><span>{D.guestName(r.guestId)}</span><Badge>{r.status}</Badge></Link>)}{!D.arrivals.filter((r) => r.status !== "Checked In").length && <p className="text-muted">None remaining.</p>}</div>
            <div><p className="mb-1 text-xs uppercase text-muted">Upcoming check-outs ({D.departures.filter((r) => r.status === "Checked In").length})</p>{D.departures.filter((r) => r.status === "Checked In").map((r) => <Link key={r.id} href={`/reservations/${r.id}`} className="flex items-center justify-between py-1 hover:text-gold"><span>{D.guestName(r.guestId)}</span><span className="text-muted">Room {db.rooms.find((x) => x.id === r.roomId)?.number}</span></Link>)}{!D.departures.filter((r) => r.status === "Checked In").length && <p className="text-muted">None remaining.</p>}</div>
            <div><p className="mb-1 text-xs uppercase text-muted">Pending payments ({pending.length})</p>{pending.slice(0, 3).map((r) => <Link key={r.id} href={`/reservations/${r.id}`} className="flex items-center justify-between py-1 hover:text-gold"><span>{r.ref}</span><span>{resPayStatus(db, r)}</span></Link>)}</div>
            <div><p className="mb-1 text-xs uppercase text-muted">Recently created</p>{recent.map((r) => <Link key={r.id} href={`/reservations/${r.id}`} className="flex items-center justify-between py-1 hover:text-gold"><span>{r.ref} · {D.guestName(r.guestId)}</span><span className="text-xs text-muted">{ago(r.createdAt)}</span></Link>)}</div>
            {cancelled.length > 0 && <div><p className="mb-1 text-xs uppercase text-muted">Cancelled</p>{cancelled.map((r) => <Link key={r.id} href={`/reservations/${r.id}`} className="flex items-center justify-between py-1 hover:text-gold"><span>{r.ref}</span><Badge>{r.status}</Badge></Link>)}</div>}
          </div>
        </Card>}
        {lounge && <Card title="Lounge performance" action={<Link href="/lounge" className="text-xs underline">Open lounge</Link>}>
          <div className="grid grid-cols-2 gap-3"><div><p className="text-xs text-muted">Sales today</p><p className="font-serif text-2xl">{money(D.sales)}</p></div><div><p className="text-xs text-muted">Orders</p><p className="font-serif text-2xl">{D.todays.length}</p></div><div><p className="text-xs text-muted">Active waiter shifts</p><p className="font-serif text-2xl">{D.activeShifts}</p></div><div><p className="text-xs text-muted">Pending reconciliations</p><p className={`font-serif text-2xl ${D.pendingRecon ? "text-[#9b2c2c]" : ""}`}>{D.pendingRecon}</p></div></div>
          <p className="mb-1 mt-4 text-xs uppercase text-muted">Best sellers today</p>
          {D.best.length ? D.best.map(([n, q]) => <div key={n} className="flex items-center justify-between py-1 text-sm"><span>{n}</span><span className="text-muted">{q} sold</span></div>) : <p className="text-sm text-muted">No sales yet today.</p>}
        </Card>}
        {fin && <Card title="Financial summary (today)">
          <dl className="text-sm">{[["Hotel revenue", D.hotelRev], ["Lounge revenue", D.loungeRev], ["Cash collections", D.by("Cash")], ["Transfer collections", D.by("Bank transfer")], ["Card / POS collections", D.by("POS/Card")]].map(([k, v]) => <div key={k as string} className="flex justify-between border-b border-black/[.07] py-2 last:border-0"><dt className="text-muted">{k}</dt><dd className="font-medium">{money(v as number)}</dd></div>)}</dl>
          <p className="mt-2 text-xs text-muted">Transfers count once recorded; unverified transfers are flagged on the Payments page.</p>
        </Card>}
        <Card title="Recent activity" className={hotel || lounge ? "" : "xl:col-span-3"} action={can("logs.view") ? <Link href="/activity-logs" className="text-xs underline">All</Link> : undefined}>
          {acts.length ? <ul className="space-y-3 text-sm">{acts.map((a) => <li key={a.id} className="border-l-2 border-gold/60 pl-3"><p><b className="font-medium">{a.action}</b> <span className="text-muted">· {a.record}</span></p><p className="text-xs text-muted">{who(a.staffId)} · {ago(a.at)}</p></li>)}</ul> : <Empty title="No activity yet" />}
        </Card>
      </div>
    </>
  );
}
