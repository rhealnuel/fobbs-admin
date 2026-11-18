"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useDB, useStore } from "@/store/store";
import { Badge, Button, Card, Modal, PageHeader, SearchBox, Segmented, Select, useAct, Field } from "@/components/ui";
import { addDays, cn, fmtDate, overlaps, todayISO } from "@/lib/utils";
import { freeRooms, holdsRoom } from "@/lib/calc";
import type { Reservation } from "@/types";
import Link from "next/link";

const TONE: Record<string, string> = { "Checked In": "bg-[#2f5f9a] text-white", Confirmed: "bg-[#1f6a36] text-white", "Pending Payment": "bg-[#d99a1c] text-black", "Checked Out": "bg-black/25 text-black" };

export default function Calendar() {
  const db = useDB(); const { can, assignRoom } = useStore(); const act = useAct(); const router = useRouter(); const today = todayISO();
  const [view, setView] = useState<"7" | "14" | "30">("14"); const [start, setStart] = useState(addDays(today, -1)); const [cat, setCat] = useState(""); const [q, setQ] = useState(""); const [pick, setPick] = useState<Reservation | null>(null); const [target, setTarget] = useState("");
  const days = Number(view); const dates = useMemo(() => Array.from({ length: days }, (_, i) => addDays(start, i)), [start, days]);
  const rooms = db.rooms.filter((r) => r.active && (!cat || r.categoryId === cat) && (!q || r.number.toLowerCase().includes(q.toLowerCase())));
  const unassigned = db.reservations.filter((r) => !r.roomId && holdsRoom(r) && dates.some((d) => overlaps(d, addDays(d, 1), r.checkIn, r.checkOut)) && (!cat || r.categoryId === cat));
  const colW = view === "30" ? 34 : view === "14" ? 58 : 110;
  const diff = (a: string, b: string) => Math.round((Date.parse(b + "T12:00:00") - Date.parse(a + "T12:00:00")) / 864e5);
  const bar = (r: Reservation) => { const st = Math.min(days, Math.max(0, diff(dates[0], r.checkIn))); const en = Math.min(days, Math.max(0, diff(dates[0], r.checkOut))); return { startCol: st, len: en - st }; };
  const g = (id: string) => db.guests.find((x) => x.id === id)?.name ?? "";
  const grid = `${190}px repeat(${days}, minmax(${colW}px, 1fr))`;
  const Row = ({ label, sub, reservations, maint }: { label: string; sub: string; reservations: Reservation[]; maint?: string }) => (
    <div className="relative grid border-b border-black/[.07]" style={{ gridTemplateColumns: grid, minHeight: 44 }}>
      <div className="sticky left-0 z-10 flex items-center gap-2 border-r border-black/10 bg-white px-3 py-1"><div><p className="font-serif text-base leading-none">{label}</p><p className="text-[11px] text-muted">{sub}</p></div>{maint && <Badge>{maint}</Badge>}</div>
      {dates.map((d) => <div key={d} className={cn("border-r border-black/[.05]", d === today && "bg-[#fffaf0]", (new Date(d + "T12:00").getDay() % 6 === 0) && "bg-black/[.02]")} />)}
      {reservations.map((r) => { const { startCol, len } = bar(r); if (len <= 0) return null; return (
        <button key={r.id} onClick={() => { setPick(r); setTarget(""); }} title={`${r.ref} · ${g(r.guestId)} · ${fmtDate(r.checkIn)} → ${fmtDate(r.checkOut)} · ${r.status}`} className={cn("absolute top-1.5 h-[30px] truncate border-x border-white/60 px-2 text-left text-xs font-medium", TONE[r.status] ?? "bg-black/20")}
          style={{ left: `calc(190px + ${startCol} * ((100% - 190px) / ${days}))`, width: `calc(${len} * ((100% - 190px) / ${days}))` }}>{g(r.guestId)}</button>); })}
    </div>
  );
  const pickRooms = pick ? freeRooms(db, pick.categoryId, pick.checkIn, pick.checkOut, pick.id) : [];
  return (
    <>
      <PageHeader title="Availability Calendar" sub="Check-in date is inclusive, check-out date is exclusive: one guest can leave on the day another arrives." />
      <Card pad={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-black/10 p-4">
          <Segmented value={view} onChange={setView} options={[{ value: "7", label: "Week" }, { value: "14", label: "2 weeks" }, { value: "30", label: "Month" }]} />
          <div className="flex items-center gap-1"><Button size="sm" aria-label="Earlier" onClick={() => setStart(addDays(start, -days))}><ChevronLeft size={15} /></Button><Button size="sm" onClick={() => setStart(addDays(today, -1))}>Today</Button><Button size="sm" aria-label="Later" onClick={() => setStart(addDays(start, days))}><ChevronRight size={15} /></Button></div>
          <span className="text-sm text-muted">{fmtDate(dates[0])} – {fmtDate(dates[days - 1])}</span>
          <div className="ml-auto flex flex-wrap gap-2"><Select aria-label="Category" className="w-48" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories</option>{db.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select><SearchBox value={q} onChange={setQ} placeholder="Find a room" className="w-40" /></div>
        </div>
        <div className="scroll-thin overflow-x-auto"><div style={{ minWidth: 190 + days * colW }}>
          <div className="grid border-b border-black/10 bg-cream/60 text-xs" style={{ gridTemplateColumns: grid }}><div className="sticky left-0 z-10 bg-cream px-3 py-2 font-semibold uppercase text-[#666]">Room</div>
            {dates.map((d) => { const dt = new Date(d + "T12:00"); return <div key={d} className={cn("border-r border-black/[.05] px-1 py-1.5 text-center", d === today && "bg-gold/25 font-bold")}><p className="text-muted">{dt.toLocaleDateString("en-GB", { weekday: "short" }).slice(0, view === "30" ? 1 : 3)}</p><p>{dt.getDate()}{view !== "30" && <span className="text-muted"> {dt.toLocaleDateString("en-GB", { month: "short" })}</span>}</p></div>; })}</div>
          {db.categories.filter((c) => !cat || c.id === cat).map((c) => { const rs = rooms.filter((r) => r.categoryId === c.id); if (!rs.length) return null; return (
            <div key={c.id}><p className="border-b border-black/10 bg-black px-3 py-1.5 text-xs uppercase text-champagne">{c.name}</p>
              {rs.map((r) => <Row key={r.id} label={r.number} sub={`${r.floor} floor`} maint={["Maintenance", "Out of Service"].includes(r.status) ? r.status : r.status === "Cleaning" ? "Cleaning" : undefined} reservations={db.reservations.filter((x) => x.roomId === r.id && (holdsRoom(x) || x.status === "Checked Out"))} />)}</div>); })}
          {unassigned.length > 0 && <div><p className="border-b border-black/10 bg-[#8a5a00] px-3 py-1.5 text-xs uppercase text-white">Needs a room ({unassigned.length})</p>{unassigned.map((r) => <Row key={r.id} label="—" sub={r.ref} reservations={[r]} />)}</div>}
        </div></div>
        <div className="flex flex-wrap gap-4 border-t border-black/10 px-4 py-3 text-xs">{Object.entries(TONE).map(([k, v]) => <span key={k} className="flex items-center gap-1.5"><i className={cn("h-3 w-5", v.split(" ")[0])} />{k}</span>)}<span className="flex items-center gap-1.5"><i className="h-3 w-5 border border-black/20 bg-[#fffaf0]" />Today</span></div>
      </Card>
      <Modal open={!!pick} onClose={() => setPick(null)} title={pick ? `${pick.ref} · ${g(pick.guestId)}` : ""} width="max-w-md" footer={<><Button onClick={() => pick && router.push(`/reservations/${pick.id}`)}>Open reservation</Button>{pick && ["Confirmed", "Pending Payment", "Checked In"].includes(pick.status) && (can("reservations.assign") || can("reservations.reassign")) && <Button variant="gold" disabled={!target} onClick={() => { if (pick && act(assignRoom(pick.id, target), "Room updated")) setPick(null); }}>{pick.roomId ? "Move to room" : "Assign room"}</Button>}</>}>
        {pick && <div className="space-y-3 text-sm"><div className="flex gap-2"><Badge>{pick.status}</Badge><Badge tone="dark">{db.categories.find((c) => c.id === pick.categoryId)?.name}</Badge></div><p>{fmtDate(pick.checkIn)} → {fmtDate(pick.checkOut)} · {pick.roomId ? `Room ${db.rooms.find((r) => r.id === pick.roomId)?.number}` : "No room assigned"}</p>
          {["Confirmed", "Pending Payment", "Checked In"].includes(pick.status) && (can("reservations.assign") || can("reservations.reassign")) && <Field label={pick.roomId ? "Reassign to a free room" : "Assign a free room"}><Select value={target} onChange={(e) => setTarget(e.target.value)}><option value="">Choose a room</option>{pickRooms.filter((r) => r.id !== pick.roomId).map((r) => <option key={r.id} value={r.id}>Room {r.number} · {r.status}</option>)}</Select></Field>}
        </div>}
      </Modal>
    </>
  );
}
