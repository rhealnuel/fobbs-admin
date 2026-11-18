"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Download, Plus } from "lucide-react";
import { useDB, useStore } from "@/store/store";
import { Badge, Button, Card, DataTable, Empty, PageHeader, SearchBox, Select, Input, type Col } from "@/components/ui";
import { ReservationModal, SOURCES } from "@/components/hotel";
import { downloadCSV, fmtDate, money } from "@/lib/utils";
import { paidFor, resPayStatus } from "@/lib/calc";
import type { Reservation, ResStatus } from "@/types";

const STATUSES: ResStatus[] = ["Pending Payment", "Confirmed", "Checked In", "Checked Out", "Cancelled", "No-show", "Refund Pending", "Refunded"];

export default function ReservationsPage() {
  const db = useDB(); const { can } = useStore(); const router = useRouter();
  const [q, setQ] = useState(""); const [status, setStatus] = useState(""); const [pay, setPay] = useState(""); const [cat, setCat] = useState(""); const [src, setSrc] = useState(""); const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [open, setOpen] = useState(false);
  const g = (id: string) => db.guests.find((x) => x.id === id);
  const rows = useMemo(() => db.reservations.filter((r) => {
    const gu = g(r.guestId); const s = q.trim().toLowerCase();
    if (s && ![r.ref, gu?.name, gu?.phone].some((v) => v?.toLowerCase().includes(s))) return false;
    if (status && r.status !== status) return false; if (cat && r.categoryId !== cat) return false; if (src && r.source !== src) return false; if (pay && resPayStatus(db, r) !== pay) return false;
    if (from && r.checkIn < from) return false; if (to && r.checkIn > to) return false; return true;
  }), [db, q, status, pay, cat, src, from, to]); // eslint-disable-line react-hooks/exhaustive-deps
  const cols: Col<Reservation>[] = [
    { key: "ref", header: "Reference", cell: (r) => <span className="font-medium">{r.ref}</span>, sort: (r) => r.ref },
    { key: "guest", header: "Guest", cell: (r) => <><p>{g(r.guestId)?.name}</p><p className="text-xs text-muted">{g(r.guestId)?.phone}</p></>, sort: (r) => g(r.guestId)?.name ?? "" },
    { key: "cat", header: "Category", cell: (r) => <><p>{db.categories.find((c) => c.id === r.categoryId)?.name}</p><p className="text-xs text-muted">{r.roomId ? `Room ${db.rooms.find((x) => x.id === r.roomId)?.number}` : "Room not assigned"}</p></>, hideBelow: "md" },
    { key: "in", header: "Check-in", cell: (r) => fmtDate(r.checkIn), sort: (r) => r.checkIn },
    { key: "out", header: "Check-out", cell: (r) => fmtDate(r.checkOut), sort: (r) => r.checkOut, hideBelow: "lg" },
    { key: "amt", header: "Amount", cell: (r) => money(r.amount), sort: (r) => r.amount, hideBelow: "lg", className: "text-right" },
    { key: "pay", header: "Payment", cell: (r) => <Badge>{resPayStatus(db, r)}</Badge>, hideBelow: "md" },
    { key: "status", header: "Status", cell: (r) => <Badge>{r.status}</Badge>, sort: (r) => r.status },
  ];
  const exportCSV = () => downloadCSV("reservations.csv", [["Reference", "Guest", "Phone", "Category", "Room", "Check-in", "Check-out", "Nights", "Amount", "Paid", "Payment status", "Status", "Source"], ...rows.map((r) => [r.ref, g(r.guestId)?.name ?? "", g(r.guestId)?.phone ?? "", db.categories.find((c) => c.id === r.categoryId)?.name ?? "", db.rooms.find((x) => x.id === r.roomId)?.number ?? "", r.checkIn, r.checkOut, Math.round((Date.parse(r.checkOut) - Date.parse(r.checkIn)) / 864e5), r.amount, paidFor(db, r.id), resPayStatus(db, r), r.status, r.source])]);
  const clear = () => { setQ(""); setStatus(""); setPay(""); setCat(""); setSrc(""); setFrom(""); setTo(""); };
  return (
    <>
      <PageHeader title="Reservations" sub={`${db.reservations.length} reservations · online bookings and manual entries`} actions={<><Button onClick={exportCSV}><Download size={15} />Export CSV</Button>{can("reservations.create") && <Button variant="gold" onClick={() => setOpen(true)}><Plus size={15} />New reservation</Button>}</>} />
      <Card pad={false}>
        <div className="grid gap-3 border-b border-black/10 p-4 md:grid-cols-4 xl:grid-cols-8">
          <SearchBox value={q} onChange={setQ} placeholder="Reference, guest or phone" className="md:col-span-2" />
          <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</Select>
          <Select aria-label="Payment status" value={pay} onChange={(e) => setPay(e.target.value)}><option value="">All payments</option><option>Unpaid</option><option>Part paid</option><option>Paid</option></Select>
          <Select aria-label="Category" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories</option>{db.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          <Select aria-label="Source" value={src} onChange={(e) => setSrc(e.target.value)}><option value="">All sources</option><option>Website</option>{SOURCES.map((s) => <option key={s}>{s}</option>)}</Select>
          <Input type="date" aria-label="Check-in from" value={from} onChange={(e) => setFrom(e.target.value)} title="Check-in from" /><Input type="date" aria-label="Check-in to" value={to} onChange={(e) => setTo(e.target.value)} title="Check-in to" />
        </div>
        <DataTable rows={rows} cols={cols} rowKey={(r) => r.id} onRow={(r) => router.push(`/reservations/${r.id}`)} initialSort={{ key: "in", dir: -1 }}
          empty={<Empty title="No reservations match" hint="Try clearing a filter." action={<Button onClick={clear}>Clear filters</Button>} />} />
      </Card>
      <ReservationModal open={open} onClose={() => setOpen(false)} onCreated={(id) => router.push(`/reservations/${id}`)} />
    </>
  );
}
