import type { DB, Order, PayStatus, Reservation, Room } from "@/types";
import { overlaps, todayISO, nights as nightsFn } from "@/lib/utils";

export const ACTIVE_RES = ["Pending Payment", "Confirmed", "Checked In"] as const;
export const isActiveRes = (r: Reservation) => (ACTIVE_RES as readonly string[]).includes(r.status);
/** Reservations that still hold inventory on the calendar (includes checked-out for history display). */
export const holdsRoom = (r: Reservation) => isActiveRes(r);

export const paidFor = (db: DB, refId: string) => db.payments.filter((p) => p.refId === refId).reduce((s, p) => s + p.amount, 0);
export const resBalance = (db: DB, r: Reservation) => Math.max(0, r.amount - paidFor(db, r.id));
export const payStatus = (total: number, paid: number): PayStatus => (paid <= 0 ? "Unpaid" : paid >= total ? "Paid" : "Part paid");
export const resPayStatus = (db: DB, r: Reservation) => payStatus(r.amount, paidFor(db, r.id));

export const orderGross = (o: Order) => o.items.reduce((s, i) => s + i.price * i.qty, 0);
export const orderTotal = (o: Order) => Math.max(0, orderGross(o) - o.discount);
export const orderPaid = (db: DB, o: Order) => paidFor(db, o.id);
export const orderBalance = (db: DB, o: Order) => (o.status === "Cancelled" ? 0 : Math.max(0, orderTotal(o) - orderPaid(db, o)));
export const orderPayStatus = (db: DB, o: Order) => payStatus(orderTotal(o), orderPaid(db, o));

export const usableRooms = (db: DB, catId: string) => db.rooms.filter((r) => r.categoryId === catId && r.active && r.status !== "Maintenance" && r.status !== "Out of Service");

/** Is this physical room free of overlapping active reservations for [ci, co)? */
export function roomFree(db: DB, roomId: string, ci: string, co: string, excludeId?: string) {
  return !db.reservations.some((r) => r.id !== excludeId && r.roomId === roomId && holdsRoom(r) && overlaps(ci, co, r.checkIn, r.checkOut));
}
/** Physical rooms of a category that could take these dates. */
export function freeRooms(db: DB, catId: string, ci: string, co: string, excludeId?: string) {
  return usableRooms(db, catId).filter((r) => roomFree(db, r.id, ci, co, excludeId));
}
/** Units left in a category = usable rooms minus overlapping reservations of that category (assigned or not). */
export function categoryFree(db: DB, catId: string, ci: string, co: string, excludeId?: string) {
  const held = db.reservations.filter((r) => r.id !== excludeId && r.categoryId === catId && holdsRoom(r) && overlaps(ci, co, r.checkIn, r.checkOut)).length;
  return Math.max(0, usableRooms(db, catId).length - held);
}

export function roomDisplayStatus(db: DB, room: Room, today = todayISO()): Room["status"] | "Reserved" {
  if (room.status !== "Available") return room.status;
  return db.reservations.some((r) => r.roomId === room.id && r.status === "Confirmed" && r.checkIn === today) ? "Reserved" : "Available";
}
export const currentResFor = (db: DB, roomId: string) => db.reservations.find((r) => r.roomId === roomId && r.status === "Checked In");

export function shiftSummary(db: DB, shiftId: string) {
  const orders = db.orders.filter((o) => o.shiftId === shiftId && o.status !== "Draft");
  const live = orders.filter((o) => o.status !== "Cancelled");
  const cancelled = orders.filter((o) => o.status === "Cancelled");
  const gross = live.reduce((s, o) => s + orderGross(o), 0);
  const discounts = live.reduce((s, o) => s + o.discount, 0);
  const voids = cancelled.reduce((s, o) => s + orderGross(o), 0);
  const net = gross - discounts;
  const pays = db.payments.filter((p) => p.shiftId === shiftId);
  const sum = (m: string) => pays.filter((p) => p.method === m).reduce((s, p) => s + p.amount, 0);
  const cash = sum("Cash"), transfer = sum("Bank transfer"), pos = sum("POS/Card");
  const collected = cash + transfer + pos;
  return { orders: live.length, cancelled: cancelled.length, gross, discounts, voids, net, cash, transfer, pos, collected, outstanding: Math.max(0, net - collected), unverified: pays.filter((p) => !p.verified).length, unverifiedAmount: pays.filter((p) => !p.verified).reduce((s, p) => s + p.amount, 0) };
}
export const nightsOf = (r: Reservation) => nightsFn(r.checkIn, r.checkOut);
