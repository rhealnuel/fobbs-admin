"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Mail, Printer } from "lucide-react";
import { useDB, useStore } from "@/store/store";
import { Badge, Button, Card, Confirm, Empty, Field, Input, KV, Modal, Notice, PageHeader, Select, Textarea, useAct } from "@/components/ui";
import { CheckInDialog, CheckOutDialog, PayDialog } from "@/components/hotel";
import { fmtDate, fmtDT, money, nights, todayISO, addDays } from "@/lib/utils";
import { freeRooms, paidFor, resBalance, resPayStatus } from "@/lib/calc";

export default function ReservationDetail() {
  const { id } = useParams<{ id: string }>(); const db = useDB(); const { can, assignRoom, editReservation, cancelReservation, markNoShow } = useStore(); const act = useAct();
  const [dlg, setDlg] = useState<"" | "pay" | "in" | "out" | "room" | "edit" | "cancel" | "noshow" | "refund">("");
  const r = db.reservations.find((x) => x.id === id);
  if (!r) return <Empty title="Reservation not found" action={<Link href="/reservations" className="underline">Back to reservations</Link>} />;
  const guest = db.guests.find((g) => g.id === r.guestId)!; const cat = db.categories.find((c) => c.id === r.categoryId); const room = db.rooms.find((x) => x.id === r.roomId);
  const who = (s: string) => db.staff.find((x) => x.id === s)?.name ?? (s === "system" ? "Online booking" : s);
  const pays = db.payments.filter((p) => p.refId === r.id); const paid = paidFor(db, r.id); const bal = resBalance(db, r);
  const editable = ["Pending Payment", "Confirmed"].includes(r.status); const live = ["Pending Payment", "Confirmed", "Checked In"].includes(r.status);
  const mail = () => { const body = `Dear ${guest.name},%0D%0A%0D%0AYour booking ${r.ref} at ${db.settings.hotelName} is ${r.status.toLowerCase()}.%0D%0A${cat?.name}, ${fmtDate(r.checkIn)} to ${fmtDate(r.checkOut)} (${nights(r.checkIn, r.checkOut)} nights).%0D%0ATotal: ${money(r.amount)}. Paid: ${money(paid)}.%0D%0ACheck-in from ${db.settings.checkInTime}, check-out by ${db.settings.checkOutTime}.%0D%0A${encodeURIComponent(db.settings.cancellationPolicy)}%0D%0A${encodeURIComponent(db.settings.confirmationNote)}`; window.location.href = `mailto:${guest.email}?subject=Booking%20confirmation%20${r.ref}&body=${body}`; };
  return (
    <>
      <Link href="/reservations" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-black"><ArrowLeft size={14} />All reservations</Link>
      <PageHeader title={r.ref} sub={<span className="flex flex-wrap items-center gap-2"><Badge>{r.status}</Badge><Badge>{resPayStatus(db, r)}</Badge><span>{guest.name} · {cat?.name}</span></span>}
        actions={<>
          <Button onClick={() => window.print()}><Printer size={15} />Print</Button>
          {guest.email && <Button onClick={mail}><Mail size={15} />Send confirmation</Button>}
          {r.status === "Confirmed" && can("frontdesk.checkin") && <Button variant="gold" onClick={() => setDlg("in")}>Check in</Button>}
          {r.status === "Checked In" && can("frontdesk.checkout") && <Button variant="gold" onClick={() => setDlg("out")}>Check out</Button>}
        </>} />
      {r.status === "Pending Payment" && <div className="mb-4"><Notice tone="warn">Awaiting a verified payment. {pays.some((p) => !p.verified) ? "A bank transfer is recorded but not verified yet. A manager or accountant can verify it under Finance → Payments." : "Record a payment to confirm this booking."}</Notice></div>}
      {r.status === "Refund Pending" && <div className="mb-4"><Notice tone="warn">Cancelled with payment on file. A refund request for up to {money(paid)} is in Finance → Refunds, where it needs approval and then payout.</Notice></div>}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card title="Stay" action={<div className="no-print flex flex-wrap gap-2">
            {editable && can("reservations.edit") && <Button size="sm" onClick={() => setDlg("edit")}>Edit / change dates</Button>}
            {live && (can("reservations.assign") || can("reservations.reassign")) && <Button size="sm" onClick={() => setDlg("room")}>{r.roomId ? "Change room" : "Assign room"}</Button>}</div>}>
            <dl className="grid gap-x-8 md:grid-cols-2">
              <KV k="Category" v={cat?.name} /><KV k="Physical room" v={room ? `Room ${room.number} (${room.floor} floor)` : <span className="text-[#9b2c2c]">Not assigned</span>} />
              <KV k="Check-in" v={fmtDate(r.checkIn)} /><KV k="Check-out" v={fmtDate(r.checkOut)} /><KV k="Nights" v={nights(r.checkIn, r.checkOut)} /><KV k="Guests" v={r.guests} />
              <KV k="Booking source" v={r.source} /><KV k="Created by" v={`${who(r.createdBy)} · ${fmtDT(r.createdAt)}`} />
              {r.actualIn && <KV k="Actual check-in" v={fmtDT(r.actualIn)} />}{r.actualOut && <KV k="Actual check-out" v={fmtDT(r.actualOut)} />}
            </dl>
            {r.requests && <p className="mt-3 border-t border-black/10 pt-3 text-sm"><b className="font-medium">Special requests:</b> {r.requests}</p>}
          </Card>
          <Card title="Payments" action={r.status !== "Cancelled" && r.status !== "No-show" && r.status !== "Refunded" && can("payments.record") && bal > 0 ? <Button size="sm" variant="gold" className="no-print" onClick={() => setDlg("pay")}>Record payment</Button> : undefined}>
            <div className="grid grid-cols-3 gap-3 text-center"><div className="bg-cream/60 p-3"><p className="text-xs text-muted">Booking amount</p><p className="font-serif text-xl">{money(r.amount)}</p></div><div className="bg-cream/60 p-3"><p className="text-xs text-muted">Paid</p><p className="font-serif text-xl">{money(paid)}</p></div><div className={`p-3 ${bal > 0 ? "bg-[#f8e3e1]" : "bg-[#e6f2e8]"}`}><p className="text-xs text-muted">Outstanding</p><p className="font-serif text-xl">{money(bal)}</p></div></div>
            {pays.length ? <ul className="mt-4 divide-y divide-black/[.07] text-sm">{pays.map((p) => <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span>{fmtDT(p.at)} · {p.method}{p.note ? ` · ${p.note}` : ""}<span className="block text-xs text-muted">Recorded by {who(p.staffId)}</span></span><span className="flex items-center gap-2">{!p.verified && <Badge tone="amber">Awaiting verification</Badge>}<b>{money(p.amount)}</b></span></li>)}</ul> : <p className="mt-4 text-sm text-muted">No payments recorded yet.</p>}
          </Card>
          <Card title="Activity history"><ol className="space-y-3 text-sm">{[...r.history].reverse().map((h, i) => <li key={i} className="border-l-2 border-gold/60 pl-3"><p>{h.text}</p><p className="text-xs text-muted">{who(h.by)} · {fmtDT(h.at)}</p></li>)}</ol></Card>
        </div>
        <div className="space-y-5">
          <Card title="Guest"><dl><KV k="Name" v={<Link className="underline decoration-gold underline-offset-4" href={`/guests?q=${encodeURIComponent(guest.name)}`}>{guest.name}</Link>} /><KV k="Phone" v={guest.phone} /><KV k="Email" v={guest.email || "—"} />{can("guests.sensitive") && <KV k="ID" v={guest.idNumber ? `${guest.idType} · ${guest.idNumber}` : "Not recorded"} />}</dl></Card>
          <Card title="Actions"><div className="no-print flex flex-col gap-2">
            {r.status === "Confirmed" && can("reservations.cancel") && <Button onClick={() => setDlg("noshow")}>Mark as no-show</Button>}
            {editable && can("reservations.cancel") && <Button variant="danger" onClick={() => setDlg("cancel")}>Cancel reservation</Button>}
            {r.status === "Refund Pending" && can(["refunds.approve", "refunds.process"]) && <Link href="/finance/refunds" className="inline-flex h-10 items-center justify-center bg-gold px-4 text-sm font-semibold hover:bg-champagne">Open refund request</Link>}
            {!live && !["Refund Pending"].includes(r.status) && <p className="text-sm text-muted">No further actions. This record is closed.</p>}
            {live && r.status === "Checked In" && <p className="text-sm text-muted">Guest is in house. Use Check out when they leave.</p>}</div></Card>
        </div>
      </div>

      <PayDialog open={dlg === "pay"} onClose={() => setDlg("")} res={r} />
      <CheckInDialog open={dlg === "in"} onClose={() => setDlg("")} res={r} />
      <CheckOutDialog open={dlg === "out"} onClose={() => setDlg("")} res={r} />
      <RoomDialog open={dlg === "room"} onClose={() => setDlg("")} res={r} />
      <EditDialog open={dlg === "edit"} onClose={() => setDlg("")} res={r} />
      <Confirm open={dlg === "cancel"} onClose={() => setDlg("")} title="Cancel this reservation?" danger confirmLabel="Cancel reservation" reasonLabel="Reason for cancelling" message={<p>{r.ref} for {guest.name} will be cancelled{paid > 0 ? `, and a refund request for up to ${money(paid)} will be raised` : ""}. This is recorded in the audit log.</p>} onConfirm={(reason) => { if (act(cancelReservation(r.id, reason), "Reservation cancelled")) setDlg(""); }} />
      <Confirm open={dlg === "noshow"} onClose={() => setDlg("")} title="Mark as no-show?" danger confirmLabel="Mark no-show" message={<p>The guest did not arrive. The room is released for these dates.</p>} onConfirm={() => { if (act(markNoShow(r.id), "Marked as no-show")) setDlg(""); }} />
    </>
  );
}

function RoomDialog({ open, onClose, res }: { open: boolean; onClose: () => void; res: ReturnType<typeof useDB>["reservations"][number] }) {
  const db = useDB(); const { assignRoom } = useStore(); const act = useAct(); const [rid, setRid] = useState("");
  useEffect(() => { if (open) setRid(res.roomId ?? ""); }, [open, res.roomId]);
  const opts = freeRooms(db, res.categoryId, res.checkIn, res.checkOut, res.id);
  return (
    <Modal open={open} onClose={onClose} title={res.roomId ? "Change room" : "Assign room"} width="max-w-md" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="gold" disabled={!rid || rid === res.roomId} onClick={() => { if (act(assignRoom(res.id, rid), "Room updated")) onClose(); }}>Save</Button></>}>
      <div className="space-y-3"><p className="text-sm text-muted">Only rooms of the booked category that are free for {fmtDate(res.checkIn)} → {fmtDate(res.checkOut)} are listed. A room can never hold two overlapping reservations.</p>
        <Field label="Room"><Select value={rid} onChange={(e) => setRid(e.target.value)}><option value="">Choose a room</option>{opts.map((r) => <option key={r.id} value={r.id}>Room {r.number} · {r.status}{r.hk !== "Clean / Ready" ? ` · ${r.hk}` : ""}</option>)}</Select></Field>
        {!opts.length && <Notice tone="error">No rooms of this category are free for these dates.</Notice>}
        {res.status === "Checked In" && <Notice tone="info">Guest is in house: the new room must be Available now. The old room goes to housekeeping.</Notice>}</div>
    </Modal>
  );
}
function EditDialog({ open, onClose, res }: { open: boolean; onClose: () => void; res: ReturnType<typeof useDB>["reservations"][number] }) {
  const db = useDB(); const { editReservation, can } = useStore(); const act = useAct();
  const [f, setF] = useState({ checkIn: res.checkIn, checkOut: res.checkOut, guests: res.guests, requests: res.requests, categoryId: res.categoryId });
  useEffect(() => { if (open) setF({ checkIn: res.checkIn, checkOut: res.checkOut, guests: res.guests, requests: res.requests, categoryId: res.categoryId }); }, [open, res]);
  const cat = db.categories.find((c) => c.id === f.categoryId); const total = (cat?.price ?? 0) * nights(f.checkIn, f.checkOut);
  const noDates = !can("reservations.dates");
  return (
    <Modal open={open} onClose={onClose} title="Edit reservation" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="gold" onClick={() => { if (act(editReservation(res.id, f), "Reservation updated")) onClose(); }}>Save changes</Button></>}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Check-in"><Input type="date" disabled={noDates} min={todayISO()} value={f.checkIn} onChange={(e) => setF({ ...f, checkIn: e.target.value, checkOut: f.checkOut <= e.target.value ? addDays(e.target.value, 1) : f.checkOut })} /></Field>
        <Field label="Check-out"><Input type="date" disabled={noDates} value={f.checkOut} onChange={(e) => setF({ ...f, checkOut: e.target.value })} /></Field>
        <Field label="Category" className="md:col-span-2" hint="Changing category clears the assigned room."><Select value={f.categoryId} onChange={(e) => setF({ ...f, categoryId: e.target.value })}>{db.categories.filter((c) => c.bookable).map((c) => <option key={c.id} value={c.id}>{c.name} · {money(c.price)}/night</option>)}</Select></Field>
        <Field label="Guests"><Input type="number" min={1} value={f.guests} onChange={(e) => setF({ ...f, guests: Number(e.target.value) })} /></Field>
        <div className="flex items-end text-sm">New total: <b className="ml-1">{money(total)}</b>{total !== res.amount && <span className="ml-2 text-muted">(was {money(res.amount)})</span>}</div>
        <Field label="Special requests" className="md:col-span-2"><Textarea value={f.requests} onChange={(e) => setF({ ...f, requests: e.target.value })} /></Field>
        {noDates && <div className="md:col-span-2"><Notice tone="info">You can edit guests and requests, but changing dates needs the “Change dates” permission.</Notice></div>}
      </div>
    </Modal>
  );
}
