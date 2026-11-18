"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Category, Expense, Settings, DB, HkStatus, Maintenance, MaintStatus, Order, OrderItem, OrderStatus, OrderType, PayMethod, Product, Reservation, Role, Room, RoomStatus, Staff } from "@/types";
import { buildSeed } from "@/data/seed";
import { addDays, nights, nowISO, todayISO } from "@/lib/utils";
import { categoryFree, currentResFor, freeRooms, holdsRoom, orderBalance, orderTotal, paidFor, resBalance, roomFree, shiftSummary } from "@/lib/calc";

const KEY = "fobbs-admin-demo-v3";
const SESSION = "fobbs-admin-session-v2";
export interface Res { ok: boolean; error?: string; id?: string; warning?: string }
const fail = (error: string): Res => ({ ok: false, error });
const ok = (id?: string, warning?: string): Res => ({ ok: true, id, warning });

export interface NewReservation { guestName: string; phone: string; email: string; categoryId: string; checkIn: string; checkOut: string; guests: number; requests: string; source: string; payMethod?: PayMethod; payAmount?: number; payRef?: string; roomId?: string | null }
export interface OrderInput { type: OrderType; table: string | null; customer: string; note: string; items: OrderItem[]; discount: number; discountReason?: string }

export function useStoreInternal() {
  const [db, setDb] = useState<DB | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const dbRef = useRef<DB | null>(null);
  const uidRef = useRef<string | null>(null);

  useEffect(() => {
    let data: DB | null = null;
    try { const raw = localStorage.getItem(KEY); if (raw) data = JSON.parse(raw); } catch { /* ignore */ }
    if (!data) { data = buildSeed(); try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* ignore */ } }
    dbRef.current = data; setDb(data);
    try { const s = sessionStorage.getItem(SESSION); if (s && data.staff.some((x) => x.id === s && x.status === "Active")) { uidRef.current = s; setUserId(s); } } catch { /* ignore */ }
  }, []);

  useEffect(() => { const h = (e: StorageEvent) => { if (e.key === KEY && e.newValue) { try { const n = JSON.parse(e.newValue) as DB; dbRef.current = n; setDb(n); } catch { /* ignore */ } } }; window.addEventListener("storage", h); return () => window.removeEventListener("storage", h); }, []);

  const commit = (d: DB) => { dbRef.current = d; setDb(d); try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* ignore */ } };
  const user = db && userId ? db.staff.find((s) => s.id === userId) ?? null : null;

  const permsOf = useCallback((d: DB, uid: string | null) => {
    const s = d.staff.find((x) => x.id === uid); if (!s) return new Set<string>();
    const set = new Set<string>(); [s.roleId, ...s.extraRoleIds].forEach((rid) => d.roles.find((r) => r.id === rid)?.permissions.forEach((p) => set.add(p))); return set;
  }, []);
  const can = useCallback((perm: string | string[]) => {
    if (!db || !userId) return false; if (perm === "*") return true;
    const set = permsOf(db, userId); return (Array.isArray(perm) ? perm : [perm]).some((p) => set.has(p));
  }, [db, userId, permsOf]);

  /** Run a mutation on a cloned DB; commit only if it succeeds. */
  function tx(fn: (d: DB, uid: string, can: (p: string) => boolean) => Res): Res {
    const cur = dbRef.current, uid = uidRef.current; if (!cur || !uid) return fail("Not signed in");
    const d: DB = structuredClone(cur); const set = permsOf(d, uid);
    const r = fn(d, uid, (p) => set.has(p)); if (r.ok) commit(d); return r;
  }
  const nid = (d: DB, p: string) => `${p}${++d.seq}`;
  const log = (d: DB, uid: string, action: string, record: string, extra: { prev?: string; next?: string; reason?: string } = {}) => d.activity.unshift({ id: nid(d, "a"), staffId: uid, action, record, at: nowISO(), ...extra });
  const note = (d: DB, text: string, href: string, perm: string, kind?: keyof Settings["notify"]) => { if (kind && d.settings.notify[kind] === false) return; d.notices.unshift({ id: nid(d, "n"), text, href, at: nowISO(), read: false, perm }); };
  const resNote = (r: Reservation, by: string, text: string) => r.history.push({ at: nowISO(), by, text });
  const roomLog = (r: Room, by: string, text: string) => r.history.unshift({ at: nowISO(), by, text });
  const NO = "You do not have permission to do this.";

  // ── auth ───────────────────────────────────────────────────────────────
  const login = (email: string, password: string): Res => {
    const d = dbRef.current; if (!d) return fail("Still loading");
    const s = d.staff.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!s || s.password !== password) return fail("Email or password is incorrect.");
    if (s.status !== "Active") return fail(`This account is ${s.status.toLowerCase()}. Contact a manager.`);
    uidRef.current = s.id; setUserId(s.id); try { sessionStorage.setItem(SESSION, s.id); } catch { /* ignore */ }
    const n = structuredClone(d); log(n, s.id, "Staff login", s.name); commit(n); return ok(s.id);
  };
  const logout = () => { const d = dbRef.current, u = uidRef.current; if (d && u) { const n = structuredClone(d); log(n, u, "Staff logout", d.staff.find((s) => s.id === u)?.name ?? ""); commit(n); } uidRef.current = null; setUserId(null); try { sessionStorage.removeItem(SESSION); } catch { /* ignore */ } };
  const resetDemo = () => { const n = buildSeed(); commit(n); };

  // ── reservations ───────────────────────────────────────────────────────
  const addPaymentTo = (d: DB, uid: string, kind: "hotel" | "lounge", refId: string, amount: number, method: PayMethod, note_?: string, shiftId?: string) => {
    const verified = method !== "Bank transfer";
    const p = { id: nid(d, "pay"), kind, refId, amount, method, staffId: uid, at: nowISO(), verified, note: note_, shiftId };
    d.payments.push(p); if (!verified) note(d, `Bank transfer of ₦${amount.toLocaleString()} awaiting verification`, "/finance/payments", "recon.review", "payment"); return p;
  };
  const confirmIfPaid = (d: DB, r: Reservation, uid: string) => {
    if (r.status === "Pending Payment" && d.payments.some((p) => p.refId === r.id && p.verified && p.amount > 0)) { r.status = "Confirmed"; resNote(r, uid, "Payment verified. Reservation confirmed"); }
  };

  const createReservation = (i: NewReservation, walkIn = false): Res => tx((d, uid, has) => {
    if (!has(walkIn ? "frontdesk.walkin" : "reservations.create")) return fail(NO);
    if (!i.guestName.trim() || !i.phone.trim()) return fail("Guest name and phone number are required.");
    if (i.email && !/^\S+@\S+\.\S+$/.test(i.email)) return fail("Enter a valid email address.");
    if (!i.checkIn || !i.checkOut) return fail("Choose check-in and check-out dates.");
    if (i.checkOut <= i.checkIn) return fail("Check-out must be after check-in.");
    if (i.checkIn < todayISO() && !walkIn) return fail("Check-in cannot be in the past.");
    const cat = d.categories.find((c) => c.id === i.categoryId); if (!cat) return fail("Choose an accommodation category.");
    if (i.guests > cat.maxGuests) return fail(`${cat.name} sleeps up to ${cat.maxGuests} guests.`);
    if (categoryFree(d, cat.id, i.checkIn, i.checkOut) < 1) return fail(`No ${cat.name} units are free for those dates.`);
    let roomId: string | null = i.roomId ?? null;
    if (roomId) { const ok_ = freeRooms(d, cat.id, i.checkIn, i.checkOut).some((r) => r.id === roomId); if (!ok_) return fail("That room is not free for the selected dates."); }
    let guest = d.guests.find((g) => g.phone === i.phone.trim() || (i.email && g.email.toLowerCase() === i.email.toLowerCase()));
    if (!guest) { guest = { id: nid(d, "g"), name: i.guestName.trim(), phone: i.phone.trim(), email: i.email.trim(), idType: "", idNumber: "", notes: "", preferences: "" }; d.guests.push(guest); }
    const amount = nights(i.checkIn, i.checkOut) * cat.price;
    const rid = nid(d, "res"); const ref = `FOB-${d.seq + 100}`;
    const r: Reservation = { id: rid, ref, guestId: guest.id, categoryId: cat.id, roomId, checkIn: i.checkIn, checkOut: i.checkOut, guests: i.guests, requests: i.requests, source: i.source, status: "Pending Payment", amount, createdBy: uid, createdAt: nowISO(), history: [] };
    resNote(r, uid, `Reservation created (${i.source})`); d.reservations.unshift(r);
    if (i.payAmount && i.payAmount > 0 && i.payMethod) {
      if (i.payAmount > amount) return fail("Payment is more than the booking amount.");
      if (i.payMethod === "Bank transfer" && !i.payRef?.trim()) return fail("Enter the transfer reference.");
      addPaymentTo(d, uid, "hotel", rid, i.payAmount, i.payMethod, i.payRef); resNote(r, uid, `Payment of ₦${i.payAmount.toLocaleString()} recorded (${i.payMethod})`); confirmIfPaid(d, r, uid);
    }
    log(d, uid, walkIn ? "Walk-in reservation created" : "Reservation created", `${ref} · ${guest.name}`);
    note(d, `New ${walkIn ? "walk-in" : i.source.toLowerCase()} reservation ${ref}`, `/reservations/${rid}`, "reservations.view", "booking");
    return ok(rid);
  });

  const recordHotelPayment = (resId: string, amount: number, method: PayMethod, ref?: string): Res => tx((d, uid, has) => {
    if (!has("payments.record")) return fail(NO);
    const r = d.reservations.find((x) => x.id === resId); if (!r) return fail("Reservation not found.");
    if (["Cancelled", "No-show", "Refunded"].includes(r.status)) return fail("This reservation is closed to new payments.");
    if (!(amount > 0)) return fail("Enter an amount greater than zero.");
    if (amount > resBalance(d, r)) return fail("Amount is more than the outstanding balance.");
    if (method === "Bank transfer" && !ref?.trim()) return fail("Enter the transfer reference so it can be verified.");
    addPaymentTo(d, uid, "hotel", resId, amount, method, ref); resNote(r, uid, `Payment of ₦${amount.toLocaleString()} recorded (${method})${method === "Bank transfer" ? " · awaiting verification" : ""}`);
    confirmIfPaid(d, r, uid); log(d, uid, "Payment recorded", `${r.ref} · ${method}`, { next: `₦${amount.toLocaleString()}` });
    return ok();
  });

  const assignRoom = (resId: string, roomId: string): Res => tx((d, uid, has) => {
    const r = d.reservations.find((x) => x.id === resId); if (!r) return fail("Reservation not found.");
    const reassign = !!r.roomId; if (!has(reassign ? "reservations.reassign" : "reservations.assign")) return fail(NO);
    if (!holdsRoom(r)) return fail("This reservation is no longer active.");
    const room = d.rooms.find((x) => x.id === roomId); if (!room || !room.active) return fail("Room not found.");
    if (room.categoryId !== r.categoryId) return fail("Choose a room in the booked category, or change the category first.");
    if (["Maintenance", "Out of Service"].includes(room.status)) return fail(`Room ${room.number} is ${room.status.toLowerCase()}.`);
    if (!roomFree(d, roomId, r.checkIn, r.checkOut, r.id)) return fail(`Room ${room.number} has an overlapping reservation.`);
    const old = d.rooms.find((x) => x.id === r.roomId);
    if (r.status === "Checked In") {
      if (room.status !== "Available") return fail(`Room ${room.number} is not ready (${room.status}).`);
      if (old) { old.status = "Cleaning"; old.hk = "Dirty"; roomLog(old, uid, `Guest moved out to Room ${room.number}`); }
      room.status = "Occupied"; roomLog(room, uid, `Guest moved in from Room ${old?.number ?? "?"}`);
    }
    r.roomId = roomId; resNote(r, uid, old ? `Room changed from ${old.number} to ${room.number}` : `Room ${room.number} assigned`);
    log(d, uid, old ? "Room reassigned" : "Room assigned", `${r.ref}`, { prev: old?.number, next: room.number }); return ok();
  });

  const editReservation = (resId: string, patch: { checkIn?: string; checkOut?: string; guests?: number; requests?: string; categoryId?: string }): Res => tx((d, uid, has) => {
    if (!has("reservations.edit")) return fail(NO);
    const r = d.reservations.find((x) => x.id === resId); if (!r) return fail("Reservation not found.");
    if (!["Pending Payment", "Confirmed"].includes(r.status)) return fail("Only reservations that have not checked in can be edited.");
    const ci = patch.checkIn ?? r.checkIn, co = patch.checkOut ?? r.checkOut, catId = patch.categoryId ?? r.categoryId;
    const datesChanged = ci !== r.checkIn || co !== r.checkOut, catChanged = catId !== r.categoryId;
    if ((datesChanged) && !has("reservations.dates")) return fail("You cannot change reservation dates.");
    if (co <= ci) return fail("Check-out must be after check-in.");
    const cat = d.categories.find((c) => c.id === catId)!; const g = patch.guests ?? r.guests;
    if (g > cat.maxGuests) return fail(`${cat.name} sleeps up to ${cat.maxGuests} guests.`);
    if (datesChanged || catChanged) {
      if (categoryFree(d, catId, ci, co, r.id) < 1) return fail("No units free in that category for those dates.");
      if (r.roomId && !catChanged && !roomFree(d, r.roomId, ci, co, r.id)) return fail("The assigned room is not free for the new dates. Reassign the room first.");
    }
    const prev = `${r.checkIn}→${r.checkOut} · ${d.categories.find((c) => c.id === r.categoryId)?.name} · ${r.amount}`;
    if (catChanged) { r.roomId = null; }
    r.checkIn = ci; r.checkOut = co; r.categoryId = catId; r.guests = g; r.requests = patch.requests ?? r.requests; r.amount = nights(ci, co) * cat.price;
    resNote(r, uid, `Reservation updated${catChanged ? " (category changed, room unassigned)" : ""}`);
    log(d, uid, datesChanged ? "Reservation dates changed" : "Reservation edited", r.ref, { prev, next: `${ci}→${co} · ${cat.name} · ${r.amount}` });
    return ok();
  });

  const cancelReservation = (resId: string, reason: string): Res => tx((d, uid, has) => {
    if (!has("reservations.cancel")) return fail(NO);
    const r = d.reservations.find((x) => x.id === resId); if (!r) return fail("Reservation not found.");
    if (!["Pending Payment", "Confirmed"].includes(r.status)) return fail("Only reservations that have not checked in can be cancelled.");
    if (!reason.trim()) return fail("A reason is required to cancel.");
    r.status = paidFor(d, r.id) > 0 ? "Refund Pending" : "Cancelled"; resNote(r, uid, `Cancelled: ${reason}`);
    log(d, uid, "Reservation cancelled", r.ref, { reason }); if (r.status === "Refund Pending") raiseRefund(d, uid, r, `Cancelled: ${reason}`);
    return ok();
  });
  const markNoShow = (resId: string): Res => tx((d, uid, has) => {
    if (!has("reservations.cancel")) return fail(NO); const r = d.reservations.find((x) => x.id === resId); if (!r || r.status !== "Confirmed") return fail("Only confirmed reservations can be marked no-show.");
    r.status = paidFor(d, r.id) > 0 ? "Refund Pending" : "No-show"; resNote(r, uid, "Marked as no-show"); log(d, uid, "Reservation marked no-show", r.ref); if (r.status === "Refund Pending") raiseRefund(d, uid, r, "No-show"); return ok();
  });
  const raiseRefund = (d: DB, uid: string, r: Reservation, reason: string) => {
    const pays = d.payments.filter((p) => p.refId === r.id && p.amount > 0); const biggest = [...pays].sort((x, y) => y.amount - x.amount)[0]; if (!biggest) return;
    d.refunds.unshift({ id: nid(d, "rf"), kind: "hotel", refId: r.id, paymentId: biggest.id, amount: paidFor(d, r.id), reason, status: "Requested", requestedBy: uid, at: nowISO() });
    note(d, `Refund request awaiting approval for ${r.ref}`, "/finance/refunds", "refunds.approve");
  };
  const refundable = (d: DB, paymentId: string) => { const p = d.payments.find((x) => x.id === paymentId); if (!p) return 0; return p.amount - d.refunds.filter((x) => x.paymentId === paymentId && x.status !== "Rejected").reduce((s, x) => s + x.amount, 0); };
  const requestRefund = (paymentId: string, amount: number, reason: string): Res => tx((d, uid, has) => {
    if (!has("payments.record") && !has("refunds.approve") && !has("refunds.process")) return fail(NO);
    const p = d.payments.find((x) => x.id === paymentId); if (!p || p.amount <= 0) return fail("Choose the original payment to refund."); if (!reason.trim()) return fail("Enter a refund reason.");
    const left = refundable(d, paymentId); if (!(amount > 0) || amount > left) return fail(`Refund must be between ₦1 and ₦${left.toLocaleString()} for this payment.`);
    d.refunds.unshift({ id: nid(d, "rf"), kind: p.kind, refId: p.refId, paymentId, amount, reason, status: "Requested", requestedBy: uid, at: nowISO() });
    log(d, uid, "Refund requested", p.kind === "hotel" ? d.reservations.find((r) => r.id === p.refId)?.ref ?? "" : d.orders.find((o) => o.id === p.refId)?.ref ?? "", { next: `₦${amount.toLocaleString()}`, reason }); note(d, "Refund request awaiting approval", "/finance/refunds", "refunds.approve"); return ok();
  });
  const decideRefund = (id: string, decision: "Approved" | "Rejected", text: string): Res => tx((d, uid, has) => {
    if (!has("refunds.approve")) return fail(NO); const f = d.refunds.find((x) => x.id === id); if (!f || f.status !== "Requested") return fail("This request has already been decided.");
    if (f.requestedBy === uid) return fail("A different person must approve a refund you requested."); if (decision === "Rejected" && !text.trim()) return fail("Add a reason for rejecting.");
    f.status = decision; f.reviewedBy = uid; f.reviewNote = text;
    if (decision === "Rejected" && f.kind === "hotel") { const r = d.reservations.find((x) => x.id === f.refId); if (r?.status === "Refund Pending" && !d.refunds.some((x) => x.refId === r.id && ["Requested", "Approved"].includes(x.status))) { r.status = "Cancelled"; resNote(r, uid, `Refund rejected: ${text}`); } }
    log(d, uid, decision === "Approved" ? "Refund approved" : "Refund rejected", f.refId, { reason: text, next: `₦${f.amount.toLocaleString()}` }); return ok();
  });
  const completeRefund = (id: string): Res => tx((d, uid, has) => {
    if (!has("refunds.process")) return fail(NO); const f = d.refunds.find((x) => x.id === id); if (!f || f.status !== "Approved") return fail("Only approved refunds can be paid out.");
    const orig = d.payments.find((x) => x.id === f.paymentId)!; d.payments.push({ id: nid(d, "pay"), kind: f.kind, refId: f.refId, amount: -f.amount, method: orig.method, staffId: uid, at: nowISO(), verified: true, note: `Refund of ${orig.id}: ${f.reason}` });
    f.status = "Completed"; f.completedAt = nowISO(); f.completedBy = uid;
    if (f.kind === "hotel") { const r = d.reservations.find((x) => x.id === f.refId); if (r?.status === "Refund Pending" && paidFor(d, r.id) <= 0) { r.status = "Refunded"; resNote(r, uid, "Refund completed"); } else if (r) resNote(r, uid, `Refund of ₦${f.amount.toLocaleString()} paid out`); }
    log(d, uid, "Refund completed", f.refId, { next: `₦${f.amount.toLocaleString()}`, reason: f.reason }); return ok();
  });

  const checkIn = (resId: string, opts: { idType: string; idNumber: string }): Res => tx((d, uid, has) => {
    if (!has("frontdesk.checkin")) return fail(NO);
    const r = d.reservations.find((x) => x.id === resId); if (!r) return fail("Reservation not found.");
    if (r.status === "Pending Payment") return fail("Payment has not been verified. Record or verify a payment first.");
    if (r.status !== "Confirmed") return fail(`A ${r.status.toLowerCase()} reservation cannot be checked in.`);
    if (r.checkIn > todayISO()) return fail("Check-in date has not arrived yet.");
    if (!r.roomId) return fail("Assign a physical room before check-in.");
    const room = d.rooms.find((x) => x.id === r.roomId)!;
    if (room.status !== "Available") return fail(`Room ${room.number} is not ready (${room.status}${room.hk !== "Clean / Ready" ? ", " + room.hk.toLowerCase() : ""}). Assign another room.`);
    if (!opts.idType.trim() || !opts.idNumber.trim()) return fail("Verify the guest's identification before check-in.");
    const g = d.guests.find((x) => x.id === r.guestId)!; g.idType = opts.idType; g.idNumber = opts.idNumber;
    r.status = "Checked In"; r.actualIn = nowISO(); room.status = "Occupied"; resNote(r, uid, `Checked in to Room ${room.number}`); roomLog(room, uid, `Guest checked in (${r.ref})`);
    log(d, uid, "Check-in completed", `${r.ref} · Room ${room.number}`); return ok();
  });
  const checkOut = (resId: string): Res => tx((d, uid, has) => {
    if (!has("frontdesk.checkout")) return fail(NO);
    const r = d.reservations.find((x) => x.id === resId); if (!r || r.status !== "Checked In") return fail("This guest is not checked in.");
    if (resBalance(d, r) > 0) return fail(`Outstanding balance of ₦${resBalance(d, r).toLocaleString()}. Record the final payment first.`);
    const room = d.rooms.find((x) => x.id === r.roomId); r.status = "Checked Out"; r.actualOut = nowISO();
    if (room) { room.status = "Cleaning"; room.hk = "Dirty"; roomLog(room, uid, `Guest checked out (${r.ref}). Awaiting housekeeping`); }
    resNote(r, uid, "Checked out"); log(d, uid, "Check-out completed", `${r.ref} · Room ${room?.number ?? "?"}`);
    note(d, `Room ${room?.number} needs cleaning after check-out`, "/housekeeping", "housekeeping.view"); return ok();
  });

  // ── rooms / categories / housekeeping / maintenance ───────────────────
  const addRoom = (i: { number: string; categoryId: string; floor: string; notes: string }): Res => tx((d, uid, has) => {
    if (!has("rooms.create")) return fail(NO); const n = i.number.trim(); if (!n) return fail("Room number is required.");
    if (d.rooms.some((r) => r.number.toLowerCase() === n.toLowerCase())) return fail(`Room ${n} already exists. Room numbers must be unique.`);
    if (!d.categories.some((c) => c.id === i.categoryId)) return fail("Choose a category.");
    d.rooms.push({ id: nid(d, "r"), number: n, categoryId: i.categoryId, floor: i.floor, notes: i.notes, status: "Available", hk: "Clean / Ready", active: true, history: [{ at: nowISO(), by: uid, text: "Room registered" }] });
    log(d, uid, "Room added", `Room ${n}`); return ok();
  });
  const editRoom = (roomId: string, patch: { number?: string; categoryId?: string; floor?: string; notes?: string }): Res => tx((d, uid, has) => {
    if (!has("rooms.edit")) return fail(NO); const r = d.rooms.find((x) => x.id === roomId); if (!r) return fail("Room not found.");
    if (patch.number && patch.number !== r.number && d.rooms.some((x) => x.number.toLowerCase() === patch.number!.toLowerCase())) return fail("That room number is already used.");
    if (patch.categoryId && patch.categoryId !== r.categoryId) { if (d.reservations.some((x) => x.roomId === r.id && holdsRoom(x))) return fail("This room has active reservations. Reassign them before changing its category."); roomLog(r, uid, "Category changed"); }
    Object.assign(r, Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined))); log(d, uid, "Room edited", `Room ${r.number}`); return ok();
  });
  const setRoomStatus = (roomId: string, status: RoomStatus): Res => tx((d, uid, has) => {
    if (!has("rooms.status")) return fail(NO); const r = d.rooms.find((x) => x.id === roomId); if (!r) return fail("Room not found.");
    if (r.status === "Occupied") return fail("A guest is in this room. Check them out first.");
    let warning: string | undefined;
    if (status === "Available") {
      if (d.maintenance.some((m) => m.roomId === r.id && !["Resolved", "Closed"].includes(m.status))) return fail("Unresolved maintenance on this room. Resolve it first.");
      if (r.hk !== "Clean / Ready") return fail("The room has not been cleaned and released by housekeeping.");
      if (currentResFor(d, r.id)) return fail("A checked-in reservation conflicts with this change.");
    }
    if (status === "Occupied") return fail("Rooms become Occupied through guest check-in.");
    if (status === "Cleaning") r.hk = "Dirty";
    if (status === "Maintenance" && !d.maintenance.some((m) => m.roomId === r.id && !["Resolved", "Closed"].includes(m.status))) {
      d.maintenance.unshift({ id: nid(d, "m"), roomId: r.id, facility: `Room ${r.number}`, issue: "Marked for maintenance from Room Management", priority: "Medium", status: "Reported", assignedTo: null, reportedBy: uid, at: nowISO(), log: [{ at: nowISO(), by: uid, text: "Request created automatically" }] });
    }
    if (["Maintenance", "Out of Service"].includes(status)) { const n = d.reservations.filter((x) => x.roomId === r.id && ["Confirmed", "Pending Payment"].includes(x.status) && x.checkOut >= todayISO()).length; if (n) warning = `${n} upcoming reservation(s) are assigned to this room. Reassign them.`; }
    const prev = r.status; r.status = status; roomLog(r, uid, `Status ${prev} → ${status}`); log(d, uid, "Room status changed", `Room ${r.number}`, { prev, next: status }); return ok(undefined, warning);
  });
  const setRoomActive = (roomId: string, active: boolean): Res => tx((d, uid, has) => {
    if (!has("rooms.edit")) return fail(NO); const r = d.rooms.find((x) => x.id === roomId); if (!r) return fail("Room not found.");
    if (!active && d.reservations.some((x) => x.roomId === r.id && holdsRoom(x) && x.checkOut >= todayISO())) return fail("Active or upcoming reservations use this room. Reassign them first.");
    r.active = active; roomLog(r, uid, active ? "Reactivated" : "Deactivated"); log(d, uid, active ? "Room activated" : "Room deactivated", `Room ${r.number}`); return ok();
  });
  const saveCategory = (c: Omit<Category, "id" | "slug"> & { id?: string }): Res => tx((d, uid, has) => {
    if (!has("categories.manage")) return fail(NO); if (!c.name.trim()) return fail("Category name is required."); if (!(c.price > 0)) return fail("Enter a base price per night."); if (!(c.maxGuests >= 1)) return fail("Maximum guests must be at least 1.");
    const slug = c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    if (c.id) { const e = d.categories.find((x) => x.id === c.id); if (!e) return fail("Category not found."); const prev = `₦${e.price.toLocaleString()}`; Object.assign(e, c, { slug }); log(d, uid, "Category edited", e.name, e.price !== c.price ? { prev, next: `₦${c.price.toLocaleString()}` } : {}); return ok(e.id); }
    if (d.categories.some((x) => x.slug === slug)) return fail("A category with that name already exists.");
    const id = nid(d, "c"); d.categories.push({ ...c, id, slug }); log(d, uid, "Category created", c.name); return ok(id);
  });

  const hkAdvance = (roomId: string, to: HkStatus, noteText?: string): Res => tx((d, uid, has) => {
    const r = d.rooms.find((x) => x.id === roomId); if (!r) return fail("Room not found.");
    if (to === "Clean / Ready" ? !has("housekeeping.inspect") : !has("housekeeping.update")) return fail(to === "Clean / Ready" ? "Only a supervisor can inspect and release a room." : NO);
    const order: HkStatus[] = ["Dirty", "Cleaning in Progress", "Awaiting Inspection", "Clean / Ready"];
    const from = r.hk;
    if (to === "Dirty" && from === "Awaiting Inspection") { /* inspection rejected */ } else if (order.indexOf(to) !== order.indexOf(from) + 1) return fail(`Cannot move from ${from} to ${to}.`);
    if (r.status === "Occupied" && to !== "Dirty") { /* in-house service, allowed */ }
    r.hk = to; roomLog(r, uid, `Housekeeping: ${from} → ${to}${noteText ? ` (${noteText})` : ""}`);
    if (to === "Clean / Ready" && r.status === "Cleaning") { r.status = "Available"; roomLog(r, uid, "Released to inventory"); }
    log(d, uid, "Housekeeping status changed", `Room ${r.number}`, { prev: from, next: to, reason: noteText }); return ok();
  });
  const createMaintenance = (i: { roomId: string | null; facility: string; issue: string; priority: Maintenance["priority"] }): Res => tx((d, uid, has) => {
    if (!has("maintenance.manage") && !has("housekeeping.update") && !has("reservations.view")) return fail(NO); if (!i.issue.trim()) return fail("Describe the issue.");
    const room = d.rooms.find((r) => r.id === i.roomId);
    d.maintenance.unshift({ id: nid(d, "m"), roomId: i.roomId, facility: room ? `Room ${room.number}` : i.facility || "Facility", issue: i.issue, priority: i.priority, status: "Reported", assignedTo: null, reportedBy: uid, at: nowISO(), log: [{ at: nowISO(), by: uid, text: "Request created" }] });
    log(d, uid, "Maintenance request created", room ? `Room ${room.number}` : i.facility); note(d, `New maintenance request: ${i.issue}`, "/maintenance", "maintenance.view"); return ok();
  });
  const updateMaintenance = (id: string, patch: { status?: MaintStatus; assignedTo?: string | null }, text?: string): Res => tx((d, uid, has) => {
    if (!has("maintenance.manage")) return fail(NO); const m = d.maintenance.find((x) => x.id === id); if (!m) return fail("Request not found.");
    if (patch.assignedTo !== undefined) { m.assignedTo = patch.assignedTo; if (patch.assignedTo && m.status === "Reported") m.status = "Assigned"; m.log.push({ at: nowISO(), by: uid, text: `Assigned to ${d.staff.find((s) => s.id === patch.assignedTo)?.name}` }); }
    if (patch.status) { m.status = patch.status; m.log.push({ at: nowISO(), by: uid, text: `Status: ${patch.status}${text ? ` · ${text}` : ""}` }); }
    if (m.status === "Resolved" || m.status === "Closed") {
      const room = d.rooms.find((r) => r.id === m.roomId);
      if (room && room.status === "Maintenance" && !d.maintenance.some((x) => x.id !== m.id && x.roomId === room.id && !["Resolved", "Closed"].includes(x.status))) { room.status = "Cleaning"; room.hk = "Dirty"; roomLog(room, uid, "Maintenance resolved. Needs cleaning before release"); }
    }
    log(d, uid, "Maintenance updated", m.facility, { next: m.status }); return ok();
  });

  // ── guests ─────────────────────────────────────────────────────────────
  const updateGuest = (id: string, patch: { notes?: string; preferences?: string }): Res => tx((d, uid, has) => {
    if (!has("guests.view")) return fail(NO); const g = d.guests.find((x) => x.id === id); if (!g) return fail("Guest not found."); Object.assign(g, patch); log(d, uid, "Guest notes updated", g.name); return ok();
  });

  // ── lounge ─────────────────────────────────────────────────────────────
  const openShiftOf = (d: DB, uid: string) => d.shifts.find((s) => s.staffId === uid && s.status === "Open");
  const stockMove = (d: DB, uid: string, productId: string, qty: number, type: DB["stock"][number]["type"], reason: string) => {
    const p = d.products.find((x) => x.id === productId)!; if (p.track) p.stock += qty; d.stock.unshift({ id: nid(d, "sm"), productId, qty, type, at: nowISO(), staffId: uid, reason });
    if (p.track && p.stock <= p.lowAt && qty < 0) note(d, `Low stock: ${p.name} (${p.stock} left)`, "/lounge/inventory", "stock.view", "lowStock");
  };
  const validateOrder = (d: DB, i: OrderInput): string | null => {
    if (!i.items.length) return "Add at least one item."; if (i.type === "Table order" && !i.table) return "Choose a table."; if (i.type === "Customer tab" && !i.customer.trim()) return "Enter the customer name for the tab.";
    for (const it of i.items) { const p = d.products.find((x) => x.id === it.productId); if (!p || !p.active) return `${it.name} is not available.`; if (p.track && it.qty > p.stock) return `Only ${p.stock} ${p.name} in stock.`; }
    return null;
  };
  const createOrder = (i: OrderInput, submit: boolean, draftId?: string): Res => tx((d, uid, has) => {
    if (!has("pos.create")) return fail(NO); if (submit && !has("pos.submit")) return fail("You cannot submit orders.");
    if (i.discount > 0 && !has("pos.discount")) return fail("You are not authorised to apply discounts.");
    if (i.discount > 0 && !i.discountReason?.trim()) return fail("Enter a reason for the discount.");
    const err = i.items.length ? (submit ? validateOrder(d, i) : null) : "Add at least one item."; if (err) return fail(err);
    const sh = openShiftOf(d, uid); if (submit && !sh) return fail("Start your shift before submitting orders.");
    let o = draftId ? d.orders.find((x) => x.id === draftId) : undefined;
    if (o && (o.status !== "Draft" || o.waiterId !== uid)) return fail("Only your own drafts can be edited.");
    if (!o) { const id = nid(d, "o"); o = { id, ref: `ORD-${String(d.seq).padStart(5, "0")}`, type: i.type, table: i.table, customer: i.customer, items: i.items, note: i.note, status: "Draft", waiterId: uid, shiftId: null, at: nowISO(), discount: 0, history: [{ at: nowISO(), by: uid, text: "Draft created" }] }; d.orders.unshift(o); }
    Object.assign(o, { type: i.type, table: i.table, customer: i.customer, items: i.items, note: i.note, discount: i.discount, discountReason: i.discountReason });
    if (i.discount > orders_gross(i.items)) return fail("Discount is more than the order total.");
    if (submit) {
      o.status = "Submitted"; o.shiftId = sh!.id; o.at = nowISO(); o.history.push({ at: nowISO(), by: uid, text: "Order submitted to the bar" });
      o.items.forEach((it) => stockMove(d, uid, it.productId, -it.qty, "Sale", `Order ${o!.ref}`));
      if (i.discount > 0) log(d, uid, "Discount applied", o.ref, { next: `₦${i.discount.toLocaleString()}`, reason: i.discountReason });
      log(d, uid, "Order created", `${o.ref}${o.table ? " · " + o.table : ""}`); note(d, `New lounge order ${o.ref}${o.table ? " (" + o.table + ")" : ""}`, "/lounge/bar", "bar.process");
    }
    return ok(o.id);
  });
  const orders_gross = (items: OrderItem[]) => items.reduce((s, i) => s + i.price * i.qty, 0);
  const deleteDraft = (id: string): Res => tx((d, uid) => { const o = d.orders.find((x) => x.id === id); if (!o || o.status !== "Draft" || o.waiterId !== uid) return fail("Only your own drafts can be discarded."); d.orders = d.orders.filter((x) => x.id !== id); return ok(); });

  const NEXT: Partial<Record<OrderStatus, OrderStatus>> = { Submitted: "Accepted", Accepted: "Preparing", Preparing: "Ready", Ready: "Served" };
  const advanceOrder = (id: string, to?: OrderStatus): Res => tx((d, uid, has) => {
    const o = d.orders.find((x) => x.id === id); if (!o) return fail("Order not found.");
    const next = NEXT[o.status]; if (!next || (to && to !== next)) return fail(`An order that is ${o.status.toLowerCase()} cannot move to ${to ?? "the next stage"}.`);
    if (!has("bar.process") && !(next === "Served" && has("pos.create"))) return fail(NO);
    o.status = next; o.history.push({ at: nowISO(), by: uid, text: `Marked ${next}` });
    if (next === "Ready") note(d, `Order ${o.ref} is ready${o.table ? " for " + o.table : ""}`, "/lounge/orders", "pos.create");
    if (next === "Served" && orderBalance(d, o) === 0) { o.status = "Completed"; o.history.push({ at: nowISO(), by: uid, text: "Fully paid. Order completed" }); }
    return ok();
  });
  const cancelOrder = (id: string, reason: string): Res => tx((d, uid, has) => {
    if (!has("pos.cancel")) return fail("Cancelling a submitted order needs manager authorisation."); const o = d.orders.find((x) => x.id === id); if (!o) return fail("Order not found.");
    if (!reason.trim()) return fail("A reason is required."); if (["Cancelled", "Completed"].includes(o.status)) return fail(`A ${o.status.toLowerCase()} order cannot be cancelled.`);
    if (paidFor(d, o.id) > 0) return fail("This order has payments. Refund them before cancelling.");
    const before = o.status; o.status = "Cancelled"; o.cancelReason = reason; o.history.push({ at: nowISO(), by: uid, text: `Cancelled: ${reason}` });
    if (before !== "Draft") { if (["Submitted", "Accepted", "Preparing", "Ready"].includes(before)) o.items.forEach((it) => stockMove(d, uid, it.productId, it.qty, "Sale reversal", `Cancelled ${o.ref}`)); }
    log(d, uid, "Order cancelled", o.ref, { reason, prev: before }); return ok();
  });
  const applyDiscount = (id: string, amount: number, reason: string): Res => tx((d, uid, has) => {
    if (!has("pos.discount")) return fail("You are not authorised to apply discounts."); const o = d.orders.find((x) => x.id === id); if (!o) return fail("Order not found.");
    if (["Cancelled", "Completed"].includes(o.status)) return fail("This order is closed."); if (!(amount >= 0) || amount > orders_gross(o.items) - paidFor(d, o.id)) return fail("Invalid discount amount."); if (!reason.trim()) return fail("Enter a reason.");
    const prev = o.discount; o.discount = amount; o.discountReason = reason; o.history.push({ at: nowISO(), by: uid, text: `Discount set to ₦${amount.toLocaleString()}: ${reason}` }); log(d, uid, "Discount applied", o.ref, { prev: `₦${prev}`, next: `₦${amount}`, reason }); return ok();
  });
  const payOrder = (id: string, amount: number, method: PayMethod, ref?: string): Res => tx((d, uid, has) => {
    if (!has("payments.record")) return fail(NO); const o = d.orders.find((x) => x.id === id); if (!o) return fail("Order not found.");
    if (["Draft", "Cancelled"].includes(o.status)) return fail("This order cannot take payment."); if (!(amount > 0)) return fail("Enter an amount.");
    if (amount > orderBalance(d, o)) return fail("Amount is more than the balance due.");
    if (method === "Bank transfer" && !ref?.trim()) return fail("Enter the transfer reference. Transfers are verified before they count as settled.");
    const sh = openShiftOf(d, uid)?.id ?? (d.shifts.find((x) => x.id === o.shiftId && ["Open", "Rejected"].includes(x.status))?.id); if (!sh) return fail("Start a shift to record payments.");
    const shift = d.shifts.find((s) => s.id === sh); if (shift && !["Open", "Rejected"].includes(shift.status)) return fail("That shift is already closed for reconciliation.");
    addPaymentTo(d, uid, "lounge", o.id, amount, method, ref, sh); o.history.push({ at: nowISO(), by: uid, text: `Payment ₦${amount.toLocaleString()} (${method})` });
    if (o.status === "Served" && orderBalance(d, o) === 0) { o.status = "Completed"; o.history.push({ at: nowISO(), by: uid, text: "Fully paid. Order completed" }); }
    log(d, uid, "Payment recorded", o.ref, { next: `₦${amount.toLocaleString()} ${method}` }); return ok();
  });
  const payTab = (customer: string, amount: number, method: PayMethod, ref?: string): Res => tx((d, uid, has) => {
    if (!has("payments.record")) return fail(NO); const tab = d.orders.filter((o) => o.type === "Customer tab" && o.customer === customer && !["Draft", "Cancelled"].includes(o.status) && orderBalance(d, o) > 0).sort((a, b) => a.at.localeCompare(b.at));
    const due = tab.reduce((s, o) => s + orderBalance(d, o), 0); if (!(amount > 0)) return fail("Enter an amount."); if (amount > due) return fail("Amount is more than the tab balance.");
    if (method === "Bank transfer" && !ref?.trim()) return fail("Enter the transfer reference."); const sh = openShiftOf(d, uid)?.id; if (!sh) return fail("Start a shift to record payments.");
    let left = amount; for (const o of tab) { if (left <= 0) break; const pay = Math.min(left, orderBalance(d, o)); addPaymentTo(d, uid, "lounge", o.id, pay, method, ref, sh); left -= pay; o.history.push({ at: nowISO(), by: uid, text: `Tab payment ₦${pay.toLocaleString()} (${method})` }); if (o.status === "Served" && orderBalance(d, o) === 0) { o.status = "Completed"; o.history.push({ at: nowISO(), by: uid, text: "Fully paid. Order completed" }); } }
    log(d, uid, "Tab payment recorded", `Tab: ${customer}`, { next: `₦${amount.toLocaleString()} ${method}` }); return ok();
  });
  const transferOrder = (id: string, to: string): Res => tx((d, uid, has) => {
    if (!has("pos.cancel")) return fail("Moving an order between tables needs manager authorisation."); const o = d.orders.find((x) => x.id === id); if (!o || ["Draft", "Cancelled", "Completed"].includes(o.status)) return fail("Only open orders can be moved.");
    if (!d.settings.tables.includes(to)) return fail("Choose a valid table."); const prev = o.table; o.table = to; o.history.push({ at: nowISO(), by: uid, text: `Moved from ${prev ?? "no table"} to ${to}` }); log(d, uid, "Order moved", o.ref, { prev: prev ?? "—", next: to }); return ok();
  });
  const verifyPayment = (id: string): Res => tx((d, uid, has) => {
    if (!has("recon.settle") && !has("recon.review")) return fail(NO); const p = d.payments.find((x) => x.id === id); if (!p) return fail("Payment not found."); if (p.verified) return ok();
    p.verified = true; log(d, uid, "Transfer verified", `${p.kind === "hotel" ? d.reservations.find((r) => r.id === p.refId)?.ref : d.orders.find((o) => o.id === p.refId)?.ref}`, { next: `₦${p.amount.toLocaleString()}`, reason: p.note });
    if (p.kind === "hotel") { const r = d.reservations.find((x) => x.id === p.refId); if (r) confirmIfPaid(d, r, uid); } return ok();
  });

  const saveProduct = (p: Omit<Product, "id" | "stock"> & { id?: string; stock?: number }): Res => tx((d, uid, has) => {
    if (!has("products.manage")) return fail(NO); if (!p.name.trim()) return fail("Product name is required."); if (!(p.price > 0)) return fail("Enter a selling price.");
    if (p.id) { const e = d.products.find((x) => x.id === p.id)!; const prev = e.price; Object.assign(e, p, { stock: e.stock, cost: has("products.cost") ? p.cost : e.cost }); log(d, uid, "Product edited", e.name, prev !== p.price ? { prev: `₦${prev}`, next: `₦${p.price}` } : {}); return ok(e.id); }
    const id = nid(d, "p"); d.products.push({ ...p, id, stock: p.stock ?? 0, cost: has("products.cost") ? p.cost : null }); log(d, uid, "Product created", p.name); return ok(id);
  });
  const stockIn = (productId: string, qty: number, type: "Purchase" | "Received", reason: string): Res => tx((d, uid, has) => {
    if (!has("stock.add")) return fail(NO); if (!(qty > 0)) return fail("Enter a quantity greater than zero."); stockMove(d, uid, productId, qty, type, reason || type); log(d, uid, `Stock ${type.toLowerCase()}`, d.products.find((p) => p.id === productId)!.name, { next: `+${qty}` }); return ok();
  });
  const stockOut = (productId: string, qty: number, type: "Breakage" | "Wastage" | "Complimentary" | "Adjustment", reason: string, direction: 1 | -1 = -1): Res => tx((d, uid, has) => {
    if (!has("stock.adjust")) return fail(NO); if (!(qty > 0)) return fail("Enter a quantity greater than zero."); if (!reason.trim()) return fail("A reason is required for stock removals and adjustments.");
    const p = d.products.find((x) => x.id === productId)!; if (direction < 0 && qty > p.stock) return fail(`Only ${p.stock} in stock.`);
    stockMove(d, uid, productId, direction * qty, type, reason); log(d, uid, `Stock ${type.toLowerCase()}`, p.name, { next: `${direction < 0 ? "-" : "+"}${qty}`, reason }); return ok();
  });

  // ── shifts & reconciliation ────────────────────────────────────────────
  const startShift = (float: number): Res => tx((d, uid, has) => {
    if (!has("shift.own")) return fail(NO); if (openShiftOf(d, uid)) return fail("You already have an open shift."); if (!(float >= 0)) return fail("Enter the opening cash float (0 if none).");
    const id = nid(d, "sh"); d.shifts.unshift({ id, staffId: uid, start: nowISO(), end: null, float, status: "Open" }); log(d, uid, "Shift started", `Float ₦${float.toLocaleString()}`); return ok(id);
  });
  const submitShift = (shiftId: string, actual: { cash: number; transfer: number; pos: number }, staffNote: string): Res => tx((d, uid, has) => {
    if (!has("shift.own")) return fail(NO); const s = d.shifts.find((x) => x.id === shiftId); if (!s || s.staffId !== uid) return fail("Shift not found.");
    if (!["Open", "Rejected"].includes(s.status)) return fail("This shift has already been submitted.");
    const busy = d.orders.filter((o) => o.shiftId === s.id && ["Submitted", "Accepted", "Preparing", "Ready"].includes(o.status)).length;
    if (busy) return fail(`${busy} order(s) are still in progress at the bar. Wait until they are served or cancelled.`);
    if ([actual.cash, actual.transfer, actual.pos].some((n) => !(n >= 0) || Number.isNaN(n))) return fail("Enter all actual collections (0 where none).");
    s.actual = actual; s.staffNote = staffNote; s.end = nowISO(); s.status = "Submitted"; s.managerNote = s.status === "Submitted" ? s.managerNote : undefined;
    const sm = shiftSummary(d, s.id); const diff = actual.cash - sm.cash;
    log(d, uid, "Shift reconciliation submitted", `Shift ${s.id}`, { next: `Cash difference ₦${diff.toLocaleString()}` });
    note(d, `${d.staff.find((x) => x.id === uid)?.name} submitted reconciliation${diff !== 0 ? ` with a ${diff < 0 ? "shortage" : "surplus"}` : ""}`, "/lounge/reconciliation", "recon.review", diff !== 0 ? "recon" : "shift"); return ok();
  });
  const reviewShift = (shiftId: string, decision: "Approved" | "Rejected" | "Flagged", text: string): Res => tx((d, uid, has) => {
    if (decision === "Approved" ? !has("recon.approve") : !has("recon.review")) return fail(NO);
    const s = d.shifts.find((x) => x.id === shiftId); if (!s) return fail("Shift not found."); if (s.status === "Approved") return fail("Approved reconciliations are closed. Use the correction process.");
    if (!["Submitted", "Flagged"].includes(s.status)) return fail("This shift has not been submitted.");
    if (decision !== "Approved" && !text.trim()) return fail("Add a note explaining the decision.");
    const sm = shiftSummary(d, s.id); if (decision === "Approved" && sm.unverified > 0) return fail(`${sm.unverified} bank transfer(s) are still unverified. Verify them first.`);
    s.status = decision; s.reviewedBy = uid; s.managerNote = [s.managerNote, text].filter(Boolean).join(" | ");
    log(d, uid, decision === "Approved" ? "Reconciliation approved" : decision === "Rejected" ? "Reconciliation rejected" : "Reconciliation flagged for accountant", `Shift ${s.id}`, { reason: text });
    if (decision !== "Approved") note(d, `Reconciliation ${decision.toLowerCase()}: ${d.staff.find((x) => x.id === s.staffId)?.name}`, "/lounge/reconciliation", decision === "Flagged" ? "recon.settle" : "shift.own"); return ok();
  });

  // ── staff & roles ──────────────────────────────────────────────────────
  const createStaff = (i: { name: string; email: string; phone: string; roleId: string; dept: Staff["dept"]; password: string }): Res => tx((d, uid, has) => {
    if (!has("staff.create")) return fail(NO); if (!i.name.trim()) return fail("Name is required."); if (!/^\S+@\S+\.\S+$/.test(i.email)) return fail("Enter a valid email."); if (i.password.length < 8) return fail("Temporary password needs at least 8 characters.");
    if (d.staff.some((s) => s.email.toLowerCase() === i.email.toLowerCase())) return fail("A staff member with this email already exists. Each employee needs their own account.");
    const id = nid(d, "s"); d.staff.push({ id, name: i.name.trim(), email: i.email.trim(), phone: i.phone, roleId: i.roleId, extraRoleIds: [], dept: i.dept, status: "Active", password: i.password }); log(d, uid, "Staff account created", i.name, { next: d.roles.find((r) => r.id === i.roleId)?.name }); return ok(id);
  });
  const updateStaff = (id: string, patch: Partial<Pick<Staff, "name" | "phone" | "roleId" | "extraRoleIds" | "dept">>): Res => tx((d, uid, has) => {
    if (!has("staff.edit")) return fail(NO); const s = d.staff.find((x) => x.id === id); if (!s) return fail("Staff not found.");
    if (("roleId" in patch || "extraRoleIds" in patch) && !has("staff.roles")) return fail("You cannot assign roles.");
    if (s.id === uid && "roleId" in patch && patch.roleId !== s.roleId) return fail("You cannot change your own role.");
    const prev = d.roles.find((r) => r.id === s.roleId)?.name; Object.assign(s, patch); if (patch.roleId) log(d, uid, "Staff role changed", s.name, { prev, next: d.roles.find((r) => r.id === s.roleId)?.name }); else log(d, uid, "Staff profile edited", s.name); return ok();
  });
  const setStaffStatus = (id: string, status: Staff["status"]): Res => tx((d, uid, has) => {
    if (!has("staff.suspend")) return fail(NO); const s = d.staff.find((x) => x.id === id); if (!s) return fail("Staff not found."); if (s.id === uid) return fail("You cannot suspend your own account.");
    if (s.roleId === "owner" && status !== "Active") return fail("The owner account cannot be suspended."); s.status = status; log(d, uid, `Account ${status.toLowerCase()}`, s.name); return ok();
  });
  const resetPassword = (id: string, pw: string): Res => tx((d, uid, has) => {
    if (!has("staff.edit")) return fail(NO); if (pw.length < 8) return fail("Password needs at least 8 characters."); const s = d.staff.find((x) => x.id === id); if (!s) return fail("Staff not found."); s.password = pw; log(d, uid, "Password reset", s.name); return ok();
  });
  const saveRole = (r: { id?: string; name: string; scope: Role["scope"]; permissions: string[] }): Res => tx((d, uid, has) => {
    if (!has("staff.roles")) return fail(NO); if (!r.name.trim()) return fail("Role name is required.");
    if (r.id) { const e = d.roles.find((x) => x.id === r.id)!; if (e.id === "owner") return fail("The owner role always has every permission."); const a = new Set(e.permissions), b = new Set(r.permissions); const added = r.permissions.filter((p) => !a.has(p)), removed = e.permissions.filter((p) => !b.has(p));
      e.name = r.name; e.scope = r.scope; e.permissions = r.permissions; log(d, uid, "Staff permissions changed", `Role: ${e.name}`, { prev: removed.length ? `Removed: ${removed.join(", ")}` : "—", next: added.length ? `Added: ${added.join(", ")}` : "—" }); return ok(e.id); }
    const id = r.name.toLowerCase().replace(/[^a-z0-9]+/g, "_"); if (d.roles.some((x) => x.id === id)) return fail("A role with that name already exists."); d.roles.push({ id, name: r.name, scope: r.scope, permissions: r.permissions }); log(d, uid, "Role created", r.name); return ok(id);
  });

  const addExpense = (i: { category: string; amount: number; description: string; method: PayMethod; receipt?: string }): Res => tx((d, uid, has) => {
    if (!has("reports.financial") && !has("stock.add")) return fail(NO); if (!(i.amount > 0)) return fail("Enter an amount."); if (!i.description.trim()) return fail("Describe the expense."); if (!i.category) return fail("Choose a category.");
    d.expenses.unshift({ id: nid(d, "ex"), ...i, staffId: uid, at: nowISO(), status: "Pending" }); log(d, uid, "Expense submitted", i.category, { next: `₦${i.amount.toLocaleString()}` }); note(d, `Expense awaiting approval: ${i.category}`, "/finance/expenses", "reports.financial"); return ok();
  });
  const reviewExpense = (id: string, decision: "Approved" | "Rejected", text: string): Res => tx((d, uid, has) => {
    if (!has("reports.financial")) return fail(NO); const e = d.expenses.find((x) => x.id === id); if (!e || e.status !== "Pending") return fail("Already decided."); if (e.staffId === uid) return fail("A different person must approve an expense you submitted.");
    if (decision === "Rejected" && !text.trim()) return fail("Add a reason."); e.status = decision; e.reviewedBy = uid; e.reviewNote = text; log(d, uid, `Expense ${decision.toLowerCase()}`, e.category, { next: `₦${e.amount.toLocaleString()}`, reason: text }); return ok();
  });
  const saveSettings = (patch: Partial<Settings>): Res => tx((d, uid, has) => {
    if (!has("staff.roles")) return fail(NO); if (patch.tables) { const t = patch.tables.map((x) => x.trim()).filter(Boolean); if (new Set(t.map((x) => x.toLowerCase())).size !== t.length) return fail("Table names must be unique."); patch.tables = t; }
    if (patch.hotelName !== undefined && !patch.hotelName.trim()) return fail("Hotel name is required."); if (patch.email && !/^\S+@\S+\.\S+$/.test(patch.email)) return fail("Enter a valid email address.");
    Object.assign(d.settings, patch); log(d, uid, "Settings changed", Object.keys(patch).join(", ")); return ok();
  });
  const changePassword = (current: string, next: string): Res => tx((d, uid) => {
    const s = d.staff.find((x) => x.id === uid)!; if (s.password !== current) return fail("Current password is incorrect."); if (next.length < 8) return fail("New password needs at least 8 characters."); if (next === current) return fail("Choose a different password.");
    s.password = next; log(d, uid, "Password changed", s.name); return ok();
  });

  const markNotice = (id?: string) => { const d = dbRef.current; if (!d) return; const n = structuredClone(d); n.notices.forEach((x) => { if (!id || x.id === id) x.read = true; }); commit(n); };

  return {
    db, user, can, login, logout, resetDemo,
    createReservation, recordHotelPayment, assignRoom, editReservation, cancelReservation, markNoShow, checkIn, checkOut,
    addRoom, editRoom, setRoomStatus, setRoomActive, saveCategory, hkAdvance, createMaintenance, updateMaintenance, updateGuest,
    createOrder, deleteDraft, advanceOrder, cancelOrder, applyDiscount, payOrder, payTab, transferOrder, verifyPayment, requestRefund, decideRefund, completeRefund, addExpense, reviewExpense, saveSettings, changePassword, saveProduct, stockIn, stockOut,
    startShift, submitShift, reviewShift, createStaff, updateStaff, setStaffStatus, resetPassword, saveRole, markNotice,
  };
}

export type Store = ReturnType<typeof useStoreInternal>;
const Ctx = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: React.ReactNode }) { const s = useStoreInternal(); const v = useMemo(() => s, [s.db, s.user]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>; }
export function useStore() { const s = useContext(Ctx); if (!s) throw new Error("useStore outside provider"); return s; }
/** The loaded database. Pages render only after hydration, so this is never null inside the shell. */
export function useDB(): DB { const { db } = useStore(); return db as DB; }
export { addDays };
