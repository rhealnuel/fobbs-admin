"use client";
import { useEffect, useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { useDB, useStore } from "@/store/store";
import type { NewReservation } from "@/store/store";
import type { PayMethod, Reservation } from "@/types";
import { Badge, Button, Field, Input, KV, Modal, Notice, Select, Textarea, useAct } from "@/components/ui";
import { addDays, fmtDate, fmtDT, money, nights, todayISO } from "@/lib/utils";
import { categoryFree, freeRooms, paidFor, resBalance, resPayStatus } from "@/lib/calc";

export const PAY_METHODS: PayMethod[] = ["Cash", "Bank transfer", "POS/Card"];
export const SOURCES = ["Phone", "WhatsApp", "Email", "Walk-in", "Agent / corporate", "Other"];
export const ID_TYPES = ["National ID (NIN)", "Driver's licence", "International passport", "Voter's card", "Other"];

/* ── create reservation / walk-in ─────────────────────────── */
export function ReservationModal({ open, onClose, walkIn = false, onCreated }: { open: boolean; onClose: () => void; walkIn?: boolean; onCreated?: (id: string) => void }) {
  const db = useDB(); const { createReservation, checkIn } = useStore(); const act = useAct();
  const blank = (): NewReservation & { idType: string; idNumber: string; checkNow: boolean } => ({ guestName: "", phone: "", email: "", categoryId: db.categories.find((c) => c.bookable)?.id ?? "", checkIn: todayISO(), checkOut: addDays(todayISO(), 1), guests: 1, requests: "", source: walkIn ? "Walk-in" : "Phone", payMethod: "Cash", payAmount: 0, payRef: "", roomId: "", idType: ID_TYPES[0], idNumber: "", checkNow: walkIn });
  const [f, setF] = useState(blank); const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setF(blank()); /* eslint-disable-next-line */ }, [open]);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const cat = db.categories.find((c) => c.id === f.categoryId); const n = nights(f.checkIn, f.checkOut); const total = (cat?.price ?? 0) * n;
  const valid = f.checkOut > f.checkIn; const free = valid && cat ? categoryFree(db, cat.id, f.checkIn, f.checkOut) : 0;
  const rooms = valid && cat ? freeRooms(db, cat.id, f.checkIn, f.checkOut).filter((r) => !walkIn || r.status === "Available") : [];
  const submit = () => {
    setBusy(true);
    const r = createReservation({ ...f, roomId: f.roomId || null, payAmount: Number(f.payAmount) || 0 }, walkIn);
    if (r.ok && walkIn && f.checkNow && r.id) { if (!f.roomId) { act({ ok: false, error: "Reservation saved, but choose a room to check the guest in." }); } else { const c = checkIn(r.id, { idType: f.idType, idNumber: f.idNumber }); if (!c.ok) act({ ok: false, error: `Booked, but check-in failed: ${c.error}` }); else act(c, "Guest registered and checked in"); } }
    else act(r, "Reservation created");
    setBusy(false); if (r.ok) { onClose(); if (r.id) onCreated?.(r.id); }
  };
  return (
    <Modal open={open} onClose={onClose} title={walkIn ? "Walk-in registration" : "New reservation"} width="max-w-3xl" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="gold" loading={busy} onClick={submit}>{walkIn && f.checkNow ? "Register & check in" : "Create reservation"}</Button></>}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Guest name"><Input value={f.guestName} onChange={(e) => set("guestName", e.target.value)} /></Field>
        <Field label="Phone number"><Input inputMode="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
        <Field label="Email" hint="Optional"><Input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="Booking source"><Select value={f.source} onChange={(e) => set("source", e.target.value)}>{SOURCES.map((s) => <option key={s}>{s}</option>)}</Select></Field>
        <Field label="Accommodation category"><Select value={f.categoryId} onChange={(e) => { set("categoryId", e.target.value); set("roomId", ""); }}>{db.categories.filter((c) => c.bookable).map((c) => <option key={c.id} value={c.id}>{c.name} · {money(c.price)}/night</option>)}</Select></Field>
        <Field label="Guests" hint={cat ? `Sleeps up to ${cat.maxGuests}` : ""}><Input type="number" min={1} value={f.guests} onChange={(e) => set("guests", Number(e.target.value))} /></Field>
        <Field label="Check-in"><Input type="date" min={walkIn ? undefined : todayISO()} value={f.checkIn} onChange={(e) => { set("checkIn", e.target.value); if (f.checkOut <= e.target.value) set("checkOut", addDays(e.target.value, 1)); set("roomId", ""); }} /></Field>
        <Field label="Check-out"><Input type="date" min={addDays(f.checkIn, 1)} value={f.checkOut} onChange={(e) => { set("checkOut", e.target.value); set("roomId", ""); }} /></Field>
        <Field label={walkIn ? "Physical room" : "Physical room (optional, can be assigned later)"} className="md:col-span-2"><Select value={f.roomId ?? ""} onChange={(e) => set("roomId", e.target.value)}><option value="">{walkIn ? "Choose an available room" : "Assign later"}</option>{rooms.map((r) => <option key={r.id} value={r.id}>Room {r.number} · {r.floor} floor</option>)}</Select></Field>
        <div className="md:col-span-2">{!valid ? <Notice tone="error">Check-out must be after check-in.</Notice> : free < 1 ? <Notice tone="error">No {cat?.name} units are free for these dates. Try another category or dates.</Notice> : <Notice tone="ok">{free} {cat?.name} unit{free === 1 ? "" : "s"} free · {n} night{n === 1 ? "" : "s"} · total <b>{money(total)}</b></Notice>}</div>
        <Field label="Special requests" className="md:col-span-2"><Textarea value={f.requests} onChange={(e) => set("requests", e.target.value)} /></Field>
        <div className="border-t border-black/10 pt-4 md:col-span-2"><p className="mb-3 font-serif text-lg">Payment {walkIn ? "" : "(optional)"}</p>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Method"><Select value={f.payMethod} onChange={(e) => set("payMethod", e.target.value as PayMethod)}>{PAY_METHODS.map((m) => <option key={m}>{m}</option>)}</Select></Field>
            <Field label="Amount received (₦)"><Input type="number" min={0} value={f.payAmount || ""} onChange={(e) => set("payAmount", Number(e.target.value))} placeholder="0" /></Field>
            {f.payMethod === "Bank transfer" && <Field label="Transfer reference"><Input value={f.payRef} onChange={(e) => set("payRef", e.target.value)} /></Field>}
          </div>
          <p className="mt-2 text-xs text-muted">Reservations stay <b>Pending Payment</b> until a verified payment is on file. Cash and card count immediately; transfers need verification.</p>
        </div>
        {walkIn && <div className="border-t border-black/10 pt-4 md:col-span-2"><p className="mb-3 font-serif text-lg">Identification</p>
          <div className="grid gap-4 md:grid-cols-2"><Field label="ID type"><Select value={f.idType} onChange={(e) => set("idType", e.target.value)}>{ID_TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field><Field label="ID number"><Input value={f.idNumber} onChange={(e) => set("idNumber", e.target.value)} /></Field></div>
          <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={f.checkNow} onChange={(e) => set("checkNow", e.target.checked)} className="h-4 w-4 accent-[#c9a348]" />Complete check-in now (needs a verified payment and a ready room)</label></div>}
      </div>
    </Modal>
  );
}

/* ── record payment ───────────────────────────────────────── */
export function PayDialog({ open, onClose, res }: { open: boolean; onClose: () => void; res: Reservation | null }) {
  const db = useDB(); const { recordHotelPayment } = useStore(); const act = useAct();
  const bal = res ? resBalance(db, res) : 0; const [amt, setAmt] = useState(0); const [m, setM] = useState<PayMethod>("Cash"); const [ref, setRef] = useState("");
  useEffect(() => { if (open) { setAmt(bal); setM("Cash"); setRef(""); } /* eslint-disable-next-line */ }, [open]);
  if (!res) return null;
  return (
    <Modal open={open} onClose={onClose} title={`Record payment · ${res.ref}`} width="max-w-md" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="gold" onClick={() => { if (act(recordHotelPayment(res.id, Number(amt), m, ref), "Payment recorded")) onClose(); }}>Record payment</Button></>}>
      <div className="space-y-4"><KV k="Booking amount" v={money(res.amount)} /><KV k="Already paid" v={money(paidFor(db, res.id))} /><KV k="Outstanding" v={<b>{money(bal)}</b>} />
        <Field label="Method"><Select value={m} onChange={(e) => setM(e.target.value as PayMethod)}>{PAY_METHODS.map((x) => <option key={x}>{x}</option>)}</Select></Field>
        <Field label="Amount (₦)"><Input type="number" min={0} value={amt || ""} onChange={(e) => setAmt(Number(e.target.value))} /></Field>
        {m === "Bank transfer" && <><Field label="Transfer reference"><Input value={ref} onChange={(e) => setRef(e.target.value)} /></Field><Notice tone="warn">Transfers are not treated as received until a manager or accountant verifies them against the bank statement.</Notice></>}
      </div>
    </Modal>
  );
}

/* ── check-in ─────────────────────────────────────────────── */
export function CheckInDialog({ open, onClose, res }: { open: boolean; onClose: () => void; res: Reservation | null }) {
  const db = useDB(); const { checkIn, assignRoom } = useStore(); const act = useAct();
  const [idType, setIdType] = useState(ID_TYPES[0]); const [idNo, setIdNo] = useState(""); const [roomId, setRoomId] = useState("");
  const guest = res ? db.guests.find((g) => g.id === res.guestId) : null;
  useEffect(() => { if (open && res) { setIdType(guest?.idType || ID_TYPES[0]); setIdNo(guest?.idNumber ?? ""); setRoomId(res.roomId ?? ""); } /* eslint-disable-next-line */ }, [open, res?.id]);
  const options = useMemo(() => (res ? freeRooms(db, res.categoryId, res.checkIn, res.checkOut, res.id) : []), [db, res]);
  if (!res || !guest) return null;
  const room = db.rooms.find((r) => r.id === roomId); const bal = resBalance(db, res); const ps = resPayStatus(db, res);
  const roomProblem = !roomId ? "No room assigned yet." : room && room.status !== "Available" ? `Room ${room.number} is ${room.status.toLowerCase()}${room.hk !== "Clean / Ready" ? ` (${room.hk.toLowerCase()})` : ""}.` : "";
  const go = () => {
    if (roomId !== res.roomId) { if (!act(assignRoom(res.id, roomId))) return; }
    if (act(checkIn(res.id, { idType, idNumber: idNo }), `${guest.name} checked in to Room ${room?.number}`)) onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title={`Check in · ${res.ref}`} width="max-w-xl" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="gold" disabled={!!roomProblem || res.status === "Pending Payment"} onClick={go}>Complete check-in</Button></>}>
      <div className="space-y-4">
        <div className="border border-black/10 bg-cream/50 p-3 text-sm"><p className="font-serif text-lg">{guest.name}</p><p className="text-muted">{guest.phone} · {db.categories.find((c) => c.id === res.categoryId)?.name} · {fmtDate(res.checkIn)} → {fmtDate(res.checkOut)} ({nights(res.checkIn, res.checkOut)} nights)</p></div>
        {res.status === "Pending Payment" && <Notice tone="error">Payment has not been verified, so this reservation is not confirmed yet. Record a payment (or verify the pending transfer) before check-in.</Notice>}
        {res.status !== "Pending Payment" && bal > 0 && <Notice tone="warn">Payment status: <b>{ps}</b>. Outstanding {money(bal)} must be cleared before check-out.</Notice>}
        <Field label="Assigned room" hint="You can change the room if the replacement is free for these dates."><Select value={roomId} onChange={(e) => setRoomId(e.target.value)}><option value="">Choose a room</option>{options.map((r) => <option key={r.id} value={r.id}>Room {r.number} · {r.status}{r.hk !== "Clean / Ready" ? ` · ${r.hk}` : ""}</option>)}</Select></Field>
        {roomProblem && <Notice tone="error">{roomProblem} Choose a room marked Available.</Notice>}
        <div className="grid gap-4 md:grid-cols-2"><Field label="ID type (verified)"><Select value={idType} onChange={(e) => setIdType(e.target.value)}>{ID_TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field><Field label="ID number"><Input value={idNo} onChange={(e) => setIdNo(e.target.value)} /></Field></div>
        <p className="text-xs text-muted">Actual check-in time will be recorded as now ({fmtDT(new Date().toISOString())}).</p>
      </div>
    </Modal>
  );
}

/* ── check-out ────────────────────────────────────────────── */
export function CheckOutDialog({ open, onClose, res }: { open: boolean; onClose: () => void; res: Reservation | null }) {
  const db = useDB(); const { recordHotelPayment, checkOut } = useStore(); const act = useAct();
  const [m, setM] = useState<PayMethod>("Cash"); const [ref, setRef] = useState(""); const [done, setDone] = useState(false);
  useEffect(() => { if (open) { setM("Cash"); setRef(""); setDone(false); } }, [open]);
  if (!res) return null; const guest = db.guests.find((g) => g.id === res.guestId)!; const bal = resBalance(db, res); const room = db.rooms.find((r) => r.id === res.roomId);
  const pays = db.payments.filter((p) => p.refId === res.id);
  const go = () => { if (bal > 0 && !act(recordHotelPayment(res.id, bal, m, ref), "Final payment recorded")) return; if (act(checkOut(res.id), `${guest.name} checked out. Room ${room?.number} sent to housekeeping`)) setDone(true); };
  return (
    <Modal open={open} onClose={onClose} title={done ? "Checked out" : `Check out · ${res.ref}`} width="max-w-xl" footer={done ? <><Button onClick={onClose}>Close</Button><Button variant="gold" onClick={() => window.print()}><Printer size={15} />Print receipt</Button></> : <><Button onClick={onClose}>Cancel</Button><Button variant="gold" onClick={go}>{bal > 0 ? `Collect ${money(bal)} & check out` : "Complete check-out"}</Button></>}>
      <div className="print-area space-y-4">
        <div><p className="font-serif text-xl">{db.settings.hotelName}</p><p className="text-sm text-muted">{done ? "Receipt" : "Final bill"} · {res.ref} · {guest.name}</p></div>
        <dl><KV k={`Accommodation (${db.categories.find((c) => c.id === res.categoryId)?.name}, Room ${room?.number ?? "—"}, ${nights(res.checkIn, res.checkOut)} nights)`} v={money(res.amount)} /><KV k="Additional charges" v="None recorded" /><KV k="Payments received" v={money(paidFor(db, res.id))} />{pays.map((p) => <div key={p.id} className="flex justify-between pl-4 text-xs text-muted"><span>{fmtDT(p.at)} · {p.method}{p.verified ? "" : " (unverified)"}</span><span>{money(p.amount)}</span></div>)}<KV k="Balance due" v={<b className={bal > 0 ? "text-[#9b2c2c]" : ""}>{money(bal)}</b>} /></dl>
        {!done && bal > 0 && <div className="no-print space-y-3"><Notice tone="warn">Collect the outstanding balance to complete check-out.</Notice><div className="grid gap-4 md:grid-cols-2"><Field label="Payment method"><Select value={m} onChange={(e) => setM(e.target.value as PayMethod)}>{PAY_METHODS.map((x) => <option key={x}>{x}</option>)}</Select></Field>{m === "Bank transfer" && <Field label="Transfer reference"><Input value={ref} onChange={(e) => setRef(e.target.value)} /></Field>}</div></div>}
        {done && <Badge tone="green">Check-out complete · {fmtDT(new Date().toISOString())}</Badge>}
      </div>
    </Modal>
  );
}
