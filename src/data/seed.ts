// ─────────────────────────────────────────────────────────────────────────────
// DEMONSTRATION DATA ONLY. Names, room counts, prices and figures below are made
// up so the prototype can be reviewed. Replace with the hotel's real inventory,
// price list and staff when the backend is connected.
// ─────────────────────────────────────────────────────────────────────────────
import type { DB, Guest, Order, OrderItem, OrderStatus, Payment, PayMethod, Product, Reservation, ResStatus, Room, Shift, StockMove } from "@/types";
import { DEFAULT_ROLES } from "@/config/permissions";
import { addDays, iso, nights } from "@/lib/utils";

export const DEMO_PASSWORD = "demo1234";

export function buildSeed(): DB {
  const today = iso(new Date());
  const D = (n: number) => addDays(today, n);
  const ts = (dayOffset: number, h: number, m = 0) => { const d = new Date(D(dayOffset) + "T00:00:00"); d.setHours(h, m, 0, 0); return d.toISOString(); };
  const minsAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString();
  let seq = 10040;
  const id = (p: string) => `${p}${++seq}`;

  const mk = (id: string, name: string, roleId: string, dept: "Hotel" | "Lounge" | "Management", extra: string[] = []) => ({
    id, name, email: `${roleId.replace("_", ".")}${id === "s10" ? "2" : ""}@fobbs.demo`, phone: `080${String(10000000 + Number(id.slice(1)) * 137).slice(0, 8)}`,
    roleId, extraRoleIds: extra, dept, status: "Active" as const, password: DEMO_PASSWORD,
  });
  const staff = [
    mk("s1", "Chidi Okeke", "owner", "Management"), mk("s2", "Ngozi Bello", "manager", "Management"),
    mk("s3", "Tola Adeyemi", "receptionist", "Hotel"), mk("s4", "Emeka Nwosu", "accountant", "Management"),
    mk("s5", "Funke Balogun", "hk_supervisor", "Hotel"), mk("s6", "Sade Ojo", "housekeeping", "Hotel"),
    mk("s7", "Musa Ibrahim", "maintenance", "Hotel"), mk("s8", "Kemi Lawal", "lounge_manager", "Lounge"),
    mk("s9", "Bola Akande", "waiter", "Lounge"), mk("s10", "Uche Eze", "waiter", "Lounge"),
    mk("s11", "Tunde Salami", "bartender", "Lounge"), mk("s12", "Amina Yusuf", "cashier", "Lounge"),
    mk("s13", "Ife Coker", "stock_controller", "Lounge"),
  ];
  staff[9].email = "waiter2@fobbs.demo";

  const categories = [
    { id: "c1", slug: "standard-room", name: "Standard Room", description: "A comfortable room for solo travellers and couples.", photo: "rooms/standard-room-01.jpg", price: 45000, maxGuests: 2, bed: "Queen bed", bathrooms: 1, amenities: ["Air conditioning", "Wi-Fi", "TV"], bookable: true, published: true },
    { id: "c2", slug: "deluxe-room", name: "Deluxe Room", description: "More space and a more considered finish.", photo: "rooms/deluxe-room-01.jpg", price: 65000, maxGuests: 2, bed: "King bed", bathrooms: 1, amenities: ["Air conditioning", "Wi-Fi", "TV", "Mini fridge"], bookable: true, published: true },
    { id: "c3", slug: "executive-room", name: "Executive Room", description: "Our most spacious hotel room category.", photo: "rooms/executive-room-01.jpg", price: 85000, maxGuests: 3, bed: "King bed + sofa bed", bathrooms: 1, amenities: ["Air conditioning", "Wi-Fi", "TV", "Work desk"], bookable: true, published: true },
    { id: "c4", slug: "one-bedroom-apartment", name: "One-Bedroom Apartment", description: "A separate bedroom and living area for longer stays.", photo: "apartments/one-bedroom-apartment.jpg", price: 110000, maxGuests: 3, bed: "King bed", bathrooms: 1, amenities: ["Kitchenette", "Living area", "Wi-Fi"], bookable: true, published: true },
    { id: "c5", slug: "two-bedroom-apartment", name: "Two-Bedroom Apartment", description: "Room for families and groups travelling together.", photo: "apartments/two-bedroom-apartment.jpg", price: 150000, maxGuests: 5, bed: "King + twin beds", bathrooms: 2, amenities: ["Kitchenette", "Living area", "Wi-Fi"], bookable: true, published: false },
  ];
  const price = Object.fromEntries(categories.map((c) => [c.id, c.price]));

  const rm = (n: string, c: string, f: string, status: Room["status"] = "Available", hk: Room["hk"] = "Clean / Ready", notes = ""): Room =>
    ({ id: `r${n}`, number: n, categoryId: c, floor: f, notes, status, hk, active: true, history: [{ at: ts(-14, 9), by: "s2", text: "Room registered" }] });
  const rooms: Room[] = [
    rm("101", "c1", "1st", "Occupied", "Clean / Ready"), rm("102", "c1", "1st"), rm("103", "c1", "1st", "Cleaning", "Dirty"),
    rm("201", "c2", "2nd", "Occupied"), rm("202", "c2", "2nd", "Occupied"), rm("203", "c2", "2nd"),
    rm("301", "c3", "3rd"), rm("302", "c3", "3rd", "Maintenance", "Clean / Ready", "Air-conditioning fault reported"),
    rm("A1", "c4", "Annex"), rm("A2", "c4", "Annex"), rm("B1", "c5", "Annex"),
  ];

  const guests: Guest[] = [
    ["Adaeze Obi", "08031110001", "adaeze.obi@example.com"], ["Samuel Johnson", "08031110002", "sam.johnson@example.com"],
    ["Fatima Abdullahi", "08031110003", "fatima.a@example.com"], ["David Mensah", "08031110004", "d.mensah@example.com"],
    ["Ruth Eze", "08031110005", "ruth.eze@example.com"], ["Michael Adeniyi", "08031110006", "m.adeniyi@example.com"],
    ["Blessing Okon", "08031110007", "blessing.okon@example.com"], ["Ibrahim Danjuma", "08031110008", "i.danjuma@example.com"],
    ["Grace Williams", "08031110009", "grace.w@example.com"], ["Tobi Ajayi", "08031110010", "tobi.ajayi@example.com"],
  ].map(([name, phone, email], i) => ({ id: `g${i + 1}`, name, phone, email, idType: i % 2 ? "NIN" : "Driver's licence", idNumber: `DEMO-${1000 + i}`, notes: i === 1 ? "Prefers a quiet room, high floor." : "", preferences: i === 0 ? "Late check-out where possible" : "" }));

  // reservations: [guest, cat, room|null, ciOffset, coOffset, status, source, paidShare]
  type Row = [number, string, string | null, number, number, ResStatus, string, number];
  const rows: Row[] = [
    [0, "c1", "101", -2, 1, "Checked In", "Website", 1], [1, "c2", "201", -1, 2, "Checked In", "Phone", 0.5],
    [2, "c1", "102", 0, 2, "Confirmed", "Website", 1], [3, "c3", null, 0, 3, "Confirmed", "Website", 0.5],
    [4, "c4", null, 0, 4, "Pending Payment", "Website", 0], [5, "c2", "202", -3, 0, "Checked In", "Walk-in", 1],
    [6, "c5", null, 1, 4, "Confirmed", "Phone", 0.3], [7, "c1", "103", 2, 3, "Confirmed", "Website", 1],
    [8, "c2", "203", 3, 6, "Confirmed", "Phone", 1], [9, "c3", "302", -5, -2, "Checked Out", "Website", 1],
    [0, "c2", "201", -9, -7, "Checked Out", "Website", 1], [2, "c1", "101", 5, 8, "Confirmed", "Website", 1],
    [1, "c4", "A2", -1, 1, "Cancelled", "Website", 0], [3, "c5", "B1", -6, -4, "No-show", "Phone", 0],
    [4, "c3", null, 6, 9, "Pending Payment", "Website", 0],
  ];
  const reservations: Reservation[] = []; const payments: Payment[] = [];
  const methods: PayMethod[] = ["Bank transfer", "Cash", "POS/Card"];
  rows.forEach(([g, c, r, a, b, status, source, share], i) => {
    const n = nights(D(a), D(b)); const amount = n * price[c]; const rid = `res${i + 1}`;
    const online = source === "Website";
    reservations.push({
      id: rid, ref: `FOB-${10040 + i * 7}`, guestId: guests[g].id, categoryId: c, roomId: r ? `r${r}` : null, checkIn: D(a), checkOut: D(b), guests: 2, requests: i === 1 ? "High floor, extra pillows" : "",
      source, status, amount, createdBy: online ? "system" : "s3", createdAt: ts(Math.min(a - 4, -1), 11),
      actualIn: ["Checked In", "Checked Out"].includes(status) ? ts(a, 14, 20) : undefined, actualOut: status === "Checked Out" ? ts(b, 10, 40) : undefined,
      history: [{ at: ts(Math.min(a - 4, -1), 11), by: online ? "system" : "s3", text: `Reservation created via ${source}` }],
    });
    if (share > 0) payments.push({ id: `pay_${rid}`, kind: "hotel", refId: rid, amount: Math.round(amount * share), method: methods[i % 3], staffId: online ? "system" : "s3", at: i === 2 ? ts(0, 8, 30) : ts(Math.min(a - 4, -1), 11, 5), verified: true });
  });
  const unpaidHistory = reservations.find((r) => r.id === "res13"); if (unpaidHistory) unpaidHistory.history.push({ at: ts(-2, 9), by: "s3", text: "Cancelled: guest changed plans" });

  // maintenance
  const maintenance = [
    { id: "m1", roomId: "r302", facility: "Room 302", issue: "Air conditioning not cooling", priority: "High" as const, status: "In Progress" as const, assignedTo: "s7", reportedBy: "s6", at: ts(-1, 15), log: [{ at: ts(-1, 15), by: "s6", text: "Reported by housekeeping" }, { at: ts(-1, 16), by: "s5", text: "Assigned to Musa Ibrahim" }] },
    { id: "m2", roomId: null, facility: "Reception area", issue: "Flickering ceiling light", priority: "Low" as const, status: "Reported" as const, assignedTo: null, reportedBy: "s3", at: ts(0, 8), log: [{ at: ts(0, 8), by: "s3", text: "Reported by reception" }] },
  ];

  // lounge
  const prod = (idn: string, name: string, category: string, p: number, cost: number, unit: string, stock: number, lowAt: number): Product =>
    ({ id: idn, name, category, price: p, cost, sku: idn.toUpperCase(), unit, track: true, active: true, stock, lowAt });
  const products: Product[] = [
    prod("p1", "Lager Beer", "Beer", 2500, 1700, "Bottle", 120, 24), prod("p2", "Stout Beer", "Beer", 2800, 1900, "Bottle", 60, 24),
    prod("p3", "Premium Spirit", "Spirits", 3500, 2200, "Shot", 90, 20), prod("p4", "Red Wine", "Wine", 4500, 2900, "Glass", 40, 12),
    prod("p5", "House Cocktail", "Cocktails", 5000, 2100, "Glass", 70, 15), prod("p6", "Soft Drink", "Soft Drinks", 1000, 550, "Can", 200, 36),
    prod("p7", "Bottled Water", "Water", 700, 300, "Bottle", 180, 36), prod("p8", "Snack Plate", "Food", 4000, 2400, "Unit", 8, 10),
  ];
  const openingStock = Object.fromEntries(products.map((p) => [p.id, p.stock]));
  const stock: StockMove[] = [];
  const tables = ["T01", "T02", "T03", "T04", "T05", "T06", "T07", "T08"];

  const shifts: Shift[] = [
    { id: "sh1", staffId: "s9", start: minsAgo(260), end: null, float: 20000, status: "Open" },
    { id: "sh2", staffId: "s10", start: minsAgo(250), end: null, float: 20000, status: "Open" },
    { id: "sh3", staffId: "s10", start: ts(-1, 17), end: ts(-1, 23, 59), float: 15000, status: "Submitted" },
    { id: "sh4", staffId: "s9", start: ts(-1, 17), end: ts(-1, 23, 55), float: 15000, status: "Approved", reviewedBy: "s8", managerNote: "Collections matched records." },
  ];
  const orders: Order[] = []; const lp = (p: string) => products.find((x) => x.id === p)!;
  const mkOrder = (waiter: string, shiftId: string, status: OrderStatus, type: Order["type"], table: string | null, customer: string, lines: [string, number][], atMin: number, pay: PayMethod | null | [PayMethod, number][], atISO?: string, discount = 0) => {
    const items: OrderItem[] = lines.map(([pid, qty]) => ({ productId: pid, name: lp(pid).name, price: lp(pid).price, qty }));
    const oid = id("o"); const at = atISO ?? minsAgo(atMin);
    orders.push({ id: oid, ref: `ORD-${oid.slice(1)}`, type, table, customer, items, note: "", status, waiterId: waiter, shiftId, at, discount, history: [{ at, by: waiter, text: "Order submitted" }] });
    const total = items.reduce((s, i) => s + i.price * i.qty, 0) - discount;
    if (status !== "Cancelled" && status !== "Draft") items.forEach((i) => { lp(i.productId).stock -= i.qty; stock.push({ id: id("sm"), productId: i.productId, qty: -i.qty, type: "Sale", at, staffId: waiter, reason: `Order ${oid}` }); });
    if (Array.isArray(pay)) pay.forEach(([m, a]) => payments.push({ id: id("pay"), kind: "lounge", refId: oid, amount: a, method: m, staffId: waiter, at, shiftId, verified: m !== "Bank transfer" }));
    else if (pay) payments.push({ id: id("pay"), kind: "lounge", refId: oid, amount: total, method: pay, staffId: waiter, at, shiftId, verified: pay !== "Bank transfer" });
  };
  // today
  mkOrder("s9", "sh1", "Completed", "Table order", "T02", "", [["p1", 4], ["p8", 1]], 200, "Cash");
  mkOrder("s9", "sh1", "Served", "Customer tab", "T04", "Tab: Mr Daniel", [["p3", 3], ["p5", 2]], 150, null);
  mkOrder("s10", "sh2", "Completed", "Walk-in order", null, "", [["p6", 3], ["p7", 2]], 140, "Cash");
  mkOrder("s10", "sh2", "Completed", "Table order", "T06", "", [["p4", 2], ["p5", 2]], 110, "POS/Card");
  mkOrder("s9", "sh1", "Completed", "Table order", "T01", "", [["p2", 6]], 95, "Bank transfer");
  mkOrder("s10", "sh2", "Preparing", "Table order", "T03", "", [["p1", 2], ["p3", 2]], 12, null);
  mkOrder("s9", "sh1", "Submitted", "Table order", "T05", "", [["p5", 3], ["p6", 1]], 3, null);
  mkOrder("s10", "sh2", "Ready", "Walk-in order", null, "", [["p1", 2]], 20, null);
  mkOrder("s9", "sh1", "Cancelled", "Table order", "T07", "", [["p3", 1]], 80, null);
  orders[orders.length - 1].cancelReason = "Customer left before order was prepared";
  // yesterday (for reconciliation review)
  const y = (h: number, m = 0) => ts(-1, h, m);
  mkOrder("s10", "sh3", "Completed", "Table order", "T03", "", [["p1", 10], ["p3", 4]], 0, "Cash", y(19));
  mkOrder("s10", "sh3", "Completed", "Table order", "T05", "", [["p5", 6]], 0, "Cash", y(20, 30));
  mkOrder("s10", "sh3", "Completed", "Customer tab", "T08", "Tab: Group booking", [["p4", 6], ["p2", 8]], 0, [["Bank transfer", 30000], ["POS/Card", 20000]], y(21), 0);
  mkOrder("s10", "sh3", "Completed", "Walk-in order", null, "", [["p6", 8]], 0, "POS/Card", y(22));
  mkOrder("s9", "sh4", "Completed", "Table order", "T01", "", [["p1", 8]], 0, "Cash", y(19, 15));
  mkOrder("s9", "sh4", "Completed", "Table order", "T02", "", [["p5", 4], ["p8", 2]], 0, "Bank transfer", y(21, 10));
  // reconcile yesterday's: sh3 short on cash by ₦5,000; sh4 exact
  const sums = (sh: string) => { const by = { cash: 0, transfer: 0, pos: 0 }; payments.filter((p) => p.shiftId === sh).forEach((p) => { if (p.method === "Cash") by.cash += p.amount; else if (p.method === "Bank transfer") by.transfer += p.amount; else by.pos += p.amount; }); return by; };
  const s3 = sums("sh3"), s4 = sums("sh4");
  shifts[2].actual = { cash: s3.cash - 5000, transfer: s3.transfer, pos: s3.pos }; shifts[2].staffNote = "Change given to a customer; may not have been recorded.";
  shifts[3].actual = s4;
  // opening stock purchases so stock history reconciles
  products.forEach((p) => stock.push({ id: id("sm"), productId: p.id, qty: openingStock[p.id] , type: "Purchase", at: ts(-3, 10), staffId: "s13", reason: "Opening stock (demo)" }));
  // purchases are recorded against opening stock + sales already deducted above
  products.forEach((p) => { const sold = stock.filter((s) => s.productId === p.id && s.type === "Sale").reduce((a, s) => a - s.qty, 0); const m = stock.find((s) => s.productId === p.id && s.type === "Purchase"); if (m) m.qty = p.stock + sold; });

  const activity = [
    { id: "a1", staffId: "s3", action: "Check-in completed", record: "FOB-10040 · Room 101", at: ts(-2, 14, 20) },
    { id: "a2", staffId: "s8", action: "Reconciliation approved", record: "Shift sh4 · Bola Akande", at: ts(-1, 23, 58), reason: "Collections matched records." },
    { id: "a3", staffId: "s1", action: "Staff permissions changed", record: "Role: Cashier", at: ts(-3, 9), prev: "—", next: "Added: payments.record" },
  ];
  const notices = [
    { id: "n1", text: "New online reservation FOB-10082", href: "/reservations", at: minsAgo(35), read: false, perm: "reservations.view" },
    { id: "n2", text: "Low stock: Snack Plate (8 left)", href: "/lounge/inventory", at: minsAgo(60), read: false, perm: "stock.view" },
    { id: "n3", text: "Reconciliation submitted by Uche Eze has a cash shortage", href: "/lounge/reconciliation", at: ts(-1, 23, 59), read: false, perm: "recon.review" },
    { id: "n4", text: "Room 302 marked for maintenance", href: "/maintenance", at: ts(-1, 15), read: true, perm: "maintenance.view" },
  ];
  return { staff, roles: DEFAULT_ROLES, categories, rooms, guests, reservations, payments, maintenance, products, orders, shifts, stock, activity, notices,
    expenses: [
      { id: "ex1", category: "Cleaning supplies", amount: 18500, description: "Detergents and linen softener (demo)", method: "Cash", staffId: "s5", at: ts(-2, 10), status: "Approved", reviewedBy: "s2" },
      { id: "ex2", category: "Utilities", amount: 42000, description: "Generator diesel (demo)", method: "Bank transfer", staffId: "s2", at: ts(-1, 9), status: "Pending", receipt: "diesel-receipt.jpg" },
    ],
    refunds: [],
    settings: {
      tables, hotelName: "FOBBS Apartment and Suites", address: "Address to be confirmed", phone: "", email: "", whatsapp: "", currency: "NGN (₦)", timezone: "Africa/Lagos",
      checkInTime: "14:00", checkOutTime: "12:00", cancellationPolicy: "Cancellation terms to be confirmed by management.", confirmationNote: "Thank you for choosing FOBBS.",
      loungeName: "FOBBS Lounge", receiptFooter: "Thank you. Please drink responsibly.", expenseCategories: ["Stock purchases", "Maintenance", "Utilities", "Cleaning supplies", "Staff expenses", "Other operational expenses"],
      notify: { booking: true, payment: true, lowStock: true, shift: true, recon: true },
    }, seq };
}
