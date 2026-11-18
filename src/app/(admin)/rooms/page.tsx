"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useDB, useStore } from "@/store/store";
import { Badge, Button, Card, Confirm, DataTable, Drawer, Empty, Field, Input, KV, Modal, PageHeader, SearchBox, Select, Textarea, useAct, type Col } from "@/components/ui";
import { currentResFor, roomDisplayStatus } from "@/lib/calc";
import { fmtDT, fmtDate } from "@/lib/utils";
import type { Room, RoomStatus } from "@/types";
import Link from "next/link";

export default function RoomsPage() { return <Suspense><Rooms /></Suspense>; }

function Rooms() {
  const db = useDB(); const { can, addRoom, editRoom, setRoomStatus, setRoomActive } = useStore(); const act = useAct(); const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? ""); const [cat, setCat] = useState(""); const [st, setSt] = useState("");
  const [sel, setSel] = useState<string | null>(null); const [form, setForm] = useState<null | { id?: string; number: string; categoryId: string; floor: string; notes: string }>(null); const [deact, setDeact] = useState(false);
  const rows = useMemo(() => db.rooms.filter((r) => (!q || r.number.toLowerCase().includes(q.toLowerCase()) || r.notes.toLowerCase().includes(q.toLowerCase())) && (!cat || r.categoryId === cat) && (!st || roomDisplayStatus(db, r) === st)), [db, q, cat, st]);
  const room = db.rooms.find((r) => r.id === sel); const catName = (id: string) => db.categories.find((c) => c.id === id)?.name;
  const cols: Col<Room>[] = [
    { key: "n", header: "Room", cell: (r) => <span className="font-serif text-lg">{r.number}</span>, sort: (r) => r.number },
    { key: "c", header: "Category", cell: (r) => catName(r.categoryId), sort: (r) => catName(r.categoryId) ?? "" },
    { key: "f", header: "Floor", cell: (r) => r.floor, hideBelow: "md" },
    { key: "s", header: "Status", cell: (r) => <span className="flex flex-wrap gap-1">{r.active ? <Badge>{roomDisplayStatus(db, r)}</Badge> : <Badge tone="grey">Deactivated</Badge>}{r.status === "Cleaning" && <Badge>{r.hk}</Badge>}</span> },
    { key: "g", header: "Current guest", cell: (r) => { const x = currentResFor(db, r.id); return x ? db.guests.find((g) => g.id === x.guestId)?.name : <span className="text-muted">—</span>; }, hideBelow: "lg" },
  ];
  const statusOptions: RoomStatus[] = ["Available", "Cleaning", "Maintenance", "Out of Service"];
  return (
    <>
      <PageHeader title="Room Management" sub="Every physical room has its own record. Room status is separate from reservation status." actions={can("rooms.create") ? <Button variant="gold" onClick={() => setForm({ number: "", categoryId: db.categories[0]?.id ?? "", floor: "", notes: "" })}><Plus size={15} />Add room</Button> : undefined} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">{(["Available", "Reserved", "Occupied", "Cleaning", "Maintenance"] as const).map((s) => <button key={s} onClick={() => setSt(st === s ? "" : s)} className={`border p-3 text-left ${st === s ? "border-gold bg-[#fffaf0]" : "border-black/10 bg-white hover:border-gold"}`}><p className="text-xs uppercase text-muted">{s}</p><p className="font-serif text-2xl">{db.rooms.filter((r) => r.active && roomDisplayStatus(db, r) === s).length}</p></button>)}</div>
      <Card pad={false}>
        <div className="grid gap-3 border-b border-black/10 p-4 md:grid-cols-4"><SearchBox value={q} onChange={setQ} placeholder="Room number or notes" className="md:col-span-2" />
          <Select aria-label="Category" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories</option>{db.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          <Select aria-label="Status" value={st} onChange={(e) => setSt(e.target.value)}><option value="">All statuses</option>{["Available", "Reserved", "Occupied", "Cleaning", "Maintenance", "Out of Service"].map((s) => <option key={s}>{s}</option>)}</Select></div>
        <DataTable rows={rows} cols={cols} rowKey={(r) => r.id} onRow={(r) => setSel(r.id)} pageSize={12} empty={<Empty title="No rooms match" />} />
      </Card>

      <Drawer open={!!room} onClose={() => setSel(null)} title={room ? `Room ${room.number}` : ""}>
        {room && <div className="space-y-5">
          <div className="flex flex-wrap gap-2">{room.active ? <Badge>{roomDisplayStatus(db, room)}</Badge> : <Badge tone="grey">Deactivated</Badge>}<Badge tone="dark">{catName(room.categoryId)}</Badge></div>
          <dl><KV k="Floor" v={room.floor || "—"} /><KV k="Housekeeping" v={<Badge>{room.hk}</Badge>} /><KV k="Internal notes" v={room.notes || "—"} />
            <KV k="Current reservation" v={(() => { const x = currentResFor(db, room.id); return x ? <Link href={`/reservations/${x.id}`} className="underline decoration-gold underline-offset-4">{x.ref} · {db.guests.find((g) => g.id === x.guestId)?.name}</Link> : "None"; })()} /></dl>
          {can("rooms.status") && room.active && <div><p className="mb-2 text-xs font-semibold uppercase text-[#555]">Change status</p><div className="flex flex-wrap gap-2">{statusOptions.filter((s) => s !== room.status).map((s) => <Button key={s} size="sm" onClick={() => act(setRoomStatus(room.id, s), `Room ${room.number} → ${s}`)}>{s === "Available" ? "Mark available" : s === "Cleaning" ? "Mark as cleaning" : s === "Maintenance" ? "Mark for maintenance" : "Out of service"}</Button>)}</div>
            <p className="mt-2 text-xs text-muted">Rooms can only be made Available when housekeeping has released them and no maintenance is open. Rooms become Occupied through check-in.</p></div>}
          <div className="flex flex-wrap gap-2">{can("rooms.edit") && <Button onClick={() => setForm({ id: room.id, number: room.number, categoryId: room.categoryId, floor: room.floor, notes: room.notes })}>Edit room</Button>}{can("rooms.edit") && <Button variant={room.active ? "danger" : "outline"} onClick={() => (room.active ? setDeact(true) : act(setRoomActive(room.id, true), "Room reactivated"))}>{room.active ? "Deactivate" : "Reactivate"}</Button>}</div>
          <div><p className="mb-2 font-serif text-lg">Room history</p><ol className="space-y-2 text-sm">{room.history.slice(0, 15).map((h, i) => <li key={i} className="border-l-2 border-gold/60 pl-3"><p>{h.text}</p><p className="text-xs text-muted">{db.staff.find((s) => s.id === h.by)?.name ?? h.by} · {fmtDT(h.at)}</p></li>)}</ol>
            <p className="mb-2 mt-4 text-xs font-semibold uppercase text-[#555]">Reservations on this room</p><ul className="space-y-1 text-sm">{db.reservations.filter((x) => x.roomId === room.id).sort((a, b) => b.checkIn.localeCompare(a.checkIn)).slice(0, 6).map((x) => <li key={x.id}><Link href={`/reservations/${x.id}`} className="flex justify-between hover:text-gold"><span>{x.ref} · {fmtDate(x.checkIn)} → {fmtDate(x.checkOut)}</span><Badge>{x.status}</Badge></Link></li>)}</ul></div>
        </div>}
      </Drawer>
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Edit room" : "Add physical room"} width="max-w-md" footer={<><Button onClick={() => setForm(null)}>Cancel</Button><Button variant="gold" onClick={() => { if (!form) return; const r = form.id ? editRoom(form.id, form) : addRoom(form); if (act(r, form.id ? "Room updated" : "Room added")) setForm(null); }}>Save room</Button></>}>
        {form && <div className="space-y-4"><Field label="Room number" hint="Must be unique"><Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} /></Field>
          <Field label="Accommodation category"><Select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>{db.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
          <Field label="Floor"><Input value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} placeholder="e.g. 2nd" /></Field>
          <Field label="Internal notes"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field></div>}
      </Modal>
      <Confirm open={deact} onClose={() => setDeact(false)} danger title="Deactivate this room?" confirmLabel="Deactivate" message={<p>Room {room?.number} will be removed from available inventory. Rooms with active or upcoming reservations cannot be deactivated.</p>} onConfirm={() => { if (room && act(setRoomActive(room.id, false), "Room deactivated")) setDeact(false); }} />
    </>
  );
}
