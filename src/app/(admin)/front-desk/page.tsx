"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { UserPlus } from "lucide-react";
import { useDB, useStore } from "@/store/store";
import { Badge, Button, Card, Empty, PageHeader, SearchBox, Stat, Tabs } from "@/components/ui";
import { CheckInDialog, CheckOutDialog, PayDialog, ReservationModal } from "@/components/hotel";
import { fmtDate, fmtDT, money, todayISO } from "@/lib/utils";
import { resBalance, roomDisplayStatus } from "@/lib/calc";
import type { Reservation } from "@/types";

export default function FrontDesk() {
  const db = useDB(); const { can } = useStore(); const today = todayISO();
  const [tab, setTab] = useState<"arrivals" | "inhouse" | "all">("arrivals"); const [q, setQ] = useState(""); const [dlg, setDlg] = useState<{ kind: "in" | "out" | "pay"; id: string } | null>(null); const [walk, setWalk] = useState(false);
  const g = (id: string) => db.guests.find((x) => x.id === id);
  const match = (r: Reservation) => { const s = q.trim().toLowerCase(); return !s || [r.ref, g(r.guestId)?.name, g(r.guestId)?.phone].some((v) => v?.toLowerCase().includes(s)); };
  const arrivalsToday = db.reservations.filter((r) => r.checkIn === today && ["Confirmed", "Pending Payment", "Checked In"].includes(r.status));
  const pendingIn = arrivalsToday.filter((r) => r.status !== "Checked In"); const inHouse = db.reservations.filter((r) => r.status === "Checked In");
  const outToday = inHouse.filter((r) => r.checkOut <= today); const availRooms = db.rooms.filter((r) => r.active && roomDisplayStatus(db, r) === "Available").length;
  const list = useMemo(() => {
    if (q.trim()) return db.reservations.filter((r) => ["Confirmed", "Pending Payment", "Checked In"].includes(r.status) && match(r));
    if (tab === "arrivals") return db.reservations.filter((r) => ["Confirmed", "Pending Payment"].includes(r.status) && r.checkIn <= today);
    if (tab === "inhouse") return inHouse;
    return db.reservations.filter((r) => ["Confirmed", "Pending Payment"].includes(r.status) && r.checkIn > today);
  }, [db, tab, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const res = dlg ? db.reservations.find((r) => r.id === dlg.id) ?? null : null;
  return (
    <>
      <PageHeader title="Front Desk" sub="Arrivals, departures and walk-ins" actions={can("frontdesk.walkin") ? <Button variant="gold" onClick={() => setWalk(true)}><UserPlus size={15} />Walk-in guest</Button> : undefined} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"><Stat label="Expected arrivals" value={arrivalsToday.length} /><Stat label="Pending check-ins" value={pendingIn.length} tone={pendingIn.length ? "gold" : undefined} /><Stat label="Expected departures" value={db.reservations.filter((r) => r.checkOut === today && ["Checked In", "Checked Out"].includes(r.status)).length} /><Stat label="Pending check-outs" value={outToday.length} tone={outToday.length ? "gold" : undefined} /><Stat label="Guests in house" value={inHouse.length} /><Stat label="Rooms available" value={availRooms} /></div>
      <Card className="mt-5" pad={false}>
        <div className="space-y-3 border-b border-black/10 p-4"><SearchBox value={q} onChange={setQ} placeholder="Find a guest: booking reference, name or phone number" className="max-w-xl" />{!q && <Tabs value={tab} onChange={setTab} tabs={[{ value: "arrivals", label: "Arrivals due", count: db.reservations.filter((r) => ["Confirmed", "Pending Payment"].includes(r.status) && r.checkIn <= today).length }, { value: "inhouse", label: "In house", count: inHouse.length }, { value: "all", label: "Upcoming", count: db.reservations.filter((r) => ["Confirmed", "Pending Payment"].includes(r.status) && r.checkIn > today).length }]} />}</div>
        {list.length ? <ul className="divide-y divide-black/[.07]">{list.map((r) => { const gu = g(r.guestId); const room = db.rooms.find((x) => x.id === r.roomId); const bal = resBalance(db, r); return (
          <li key={r.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <div className="min-w-[200px] flex-1"><Link href={`/reservations/${r.id}`} className="font-medium hover:text-gold">{gu?.name}</Link><p className="text-xs text-muted">{r.ref} · {gu?.phone}</p></div>
            <div className="min-w-[160px] text-sm"><p>{db.categories.find((c) => c.id === r.categoryId)?.name}</p><p className="text-xs text-muted">{room ? `Room ${room.number}${room.status !== "Available" && r.status !== "Checked In" ? ` (${room.status.toLowerCase()})` : ""}` : "Room not assigned"} · {fmtDate(r.checkIn)} → {fmtDate(r.checkOut)}</p></div>
            <div className="flex items-center gap-2"><Badge>{r.status}</Badge>{bal > 0 && r.status !== "Pending Payment" && <Badge tone="amber">Owes {money(bal)}</Badge>}</div>
            <div className="ml-auto flex gap-2">
              {r.status === "Pending Payment" && can("payments.record") && <Button size="sm" onClick={() => setDlg({ kind: "pay", id: r.id })}>Record payment</Button>}
              {["Confirmed", "Pending Payment"].includes(r.status) && can("frontdesk.checkin") && <Button size="sm" variant="gold" onClick={() => setDlg({ kind: "in", id: r.id })}>Check in</Button>}
              {r.status === "Checked In" && can("frontdesk.checkout") && <Button size="sm" variant={r.checkOut <= today ? "gold" : "outline"} onClick={() => setDlg({ kind: "out", id: r.id })}>Check out</Button>}
            </div></li>); })}</ul> : <Empty title={q ? "No matching active reservation" : tab === "arrivals" ? "No arrivals waiting" : tab === "inhouse" ? "No guests in house" : "No upcoming arrivals"} hint={q ? "Check the reference or spelling, or register the guest as a walk-in." : undefined} action={q && can("frontdesk.walkin") ? <Button variant="gold" onClick={() => setWalk(true)}>Register walk-in</Button> : undefined} />}
      </Card>
      <p className="mt-3 text-xs text-muted">After check-out a room moves to Cleaning and cannot be sold again until housekeeping has cleaned and released it.</p>
      <CheckInDialog open={dlg?.kind === "in"} onClose={() => setDlg(null)} res={res} />
      <CheckOutDialog open={dlg?.kind === "out"} onClose={() => setDlg(null)} res={res} />
      <PayDialog open={dlg?.kind === "pay"} onClose={() => setDlg(null)} res={res} />
      <ReservationModal open={walk} onClose={() => setWalk(false)} walkIn />
    </>
  );
}
