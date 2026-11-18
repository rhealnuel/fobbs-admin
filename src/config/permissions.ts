import type { Role } from "@/types";

export const PERMISSION_GROUPS: { group: string; items: { key: string; label: string }[] }[] = [
  { group: "Reservations", items: [
    { key: "reservations.view", label: "View" }, { key: "reservations.create", label: "Create" }, { key: "reservations.edit", label: "Edit" },
    { key: "reservations.cancel", label: "Cancel" }, { key: "reservations.dates", label: "Change dates" },
    { key: "reservations.assign", label: "Assign room" }, { key: "reservations.reassign", label: "Reassign room" } ] },
  { group: "Front desk", items: [
    { key: "frontdesk.checkin", label: "Check in" }, { key: "frontdesk.checkout", label: "Check out" }, { key: "frontdesk.walkin", label: "Create walk-in bookings" } ] },
  { group: "Rooms & categories", items: [
    { key: "rooms.view", label: "View rooms" }, { key: "rooms.create", label: "Create rooms" }, { key: "rooms.edit", label: "Edit rooms" },
    { key: "rooms.status", label: "Change room status" }, { key: "categories.manage", label: "Manage accommodation categories" } ] },
  { group: "Guests", items: [{ key: "guests.view", label: "View guests" }, { key: "guests.sensitive", label: "View ID details" }, { key: "guests.export", label: "Export guest records" }] },
  { group: "Housekeeping & maintenance", items: [
    { key: "housekeeping.view", label: "View housekeeping" }, { key: "housekeeping.update", label: "Update cleaning status" }, { key: "housekeeping.inspect", label: "Inspect & release rooms" },
    { key: "maintenance.view", label: "View maintenance" }, { key: "maintenance.manage", label: "Manage maintenance" } ] },
  { group: "Lounge POS", items: [
    { key: "lounge.view", label: "View lounge overview" }, { key: "pos.create", label: "Create orders" }, { key: "pos.edit", label: "Edit draft orders" },
    { key: "pos.submit", label: "Submit orders" }, { key: "pos.cancel", label: "Cancel orders" }, { key: "pos.discount", label: "Apply discounts" },
    { key: "bar.process", label: "Process bar queue" }, { key: "products.manage", label: "Manage products & prices" }, { key: "products.cost", label: "See cost prices" } ] },
  { group: "Payments", items: [
    { key: "payments.view", label: "View payments" }, { key: "payments.record", label: "Record payments" },
    { key: "refunds.approve", label: "Approve refunds" }, { key: "refunds.process", label: "Process refunds" } ] },
  { group: "Inventory", items: [
    { key: "stock.view", label: "View stock" }, { key: "stock.add", label: "Add stock" }, { key: "stock.adjust", label: "Adjust stock" }, { key: "stock.approve", label: "Approve stock adjustments" } ] },
  { group: "Shifts & reconciliation", items: [
    { key: "shift.own", label: "Run own shift & submit reconciliation" }, { key: "recon.review", label: "Review reconciliation" },
    { key: "recon.approve", label: "Approve reconciliation" }, { key: "recon.settle", label: "View financial settlements" } ] },
  { group: "Staff management", items: [
    { key: "staff.view", label: "View staff" }, { key: "staff.create", label: "Create staff" }, { key: "staff.edit", label: "Edit staff" },
    { key: "staff.roles", label: "Assign roles & edit permissions" }, { key: "staff.suspend", label: "Suspend accounts" } ] },
  { group: "Reports & audit", items: [
    { key: "reports.hotel", label: "View hotel reports" }, { key: "reports.lounge", label: "View lounge reports" }, { key: "reports.financial", label: "View financial reports" },
    { key: "reports.export", label: "Export reports" }, { key: "logs.view", label: "View activity logs" } ] },
];
export const ALL_PERMS = PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.key));
const p = (...k: string[]) => k;
const pick = (...prefixes: string[]) => ALL_PERMS.filter((k) => prefixes.some((x) => k === x || k.startsWith(x + ".")));

export const DEFAULT_ROLES: Role[] = [
  { id: "owner", name: "Super Admin / Owner", scope: "both", system: true, permissions: ALL_PERMS },
  { id: "manager", name: "Manager", scope: "hotel", permissions: ALL_PERMS.filter((k) => !["staff.roles", "refunds.process"].includes(k) && !k.startsWith("stock.approve")) },
  { id: "receptionist", name: "Receptionist", scope: "hotel", permissions: p("reservations.view", "reservations.create", "reservations.edit", "reservations.assign", "reservations.reassign", "reservations.dates", "frontdesk.checkin", "frontdesk.checkout", "frontdesk.walkin", "rooms.view", "guests.view", "guests.sensitive", "payments.record", "payments.view", "housekeeping.view", "maintenance.view") },
  { id: "accountant", name: "Accountant", scope: "both", permissions: p("reservations.view", "guests.view", "payments.view", "refunds.approve", "refunds.process", "recon.review", "recon.settle", "reports.hotel", "reports.lounge", "reports.financial", "reports.export", "lounge.view", "stock.view") },
  { id: "housekeeping", name: "Housekeeping", scope: "hotel", permissions: p("rooms.view", "housekeeping.view", "housekeeping.update", "maintenance.view", "maintenance.manage") },
  { id: "hk_supervisor", name: "Housekeeping Supervisor", scope: "hotel", permissions: p("rooms.view", "housekeeping.view", "housekeeping.update", "housekeeping.inspect", "maintenance.view", "maintenance.manage") },
  { id: "maintenance", name: "Maintenance", scope: "hotel", permissions: p("rooms.view", "maintenance.view", "maintenance.manage", "housekeeping.view") },
  { id: "lounge_manager", name: "Lounge Manager", scope: "lounge", permissions: [...pick("lounge", "pos", "bar", "products", "stock"), "recon.review", "recon.approve", "shift.own", "payments.view", "payments.record", "reports.lounge", "reports.export", "staff.view"] },
  { id: "waiter", name: "Waiter", scope: "lounge", permissions: p("lounge.view", "pos.create", "pos.edit", "pos.submit", "payments.record", "shift.own") },
  { id: "bartender", name: "Bartender", scope: "lounge", permissions: p("bar.process", "stock.view", "shift.own") },
  { id: "cashier", name: "Cashier", scope: "lounge", permissions: p("lounge.view", "pos.create", "pos.submit", "payments.view", "payments.record", "shift.own") },
  { id: "lounge_accountant", name: "Lounge Accountant", scope: "lounge", permissions: p("lounge.view", "payments.view", "recon.review", "recon.settle", "reports.lounge", "reports.export", "stock.view") },
  { id: "stock_controller", name: "Stock Controller", scope: "lounge", permissions: p("lounge.view", "stock.view", "stock.add", "stock.adjust", "products.manage", "shift.own") },
];

export interface NavItem { href: string; label: string; icon: string; perm: string | string[]; built: boolean; phase?: string }
export interface NavSection { title: string; module: "hotel" | "lounge" | "both"; items: NavItem[] }
export const NAV: NavSection[] = [
  { title: "Main", module: "both", items: [
    { href: "/dashboard", label: "Overview", icon: "LayoutDashboard", perm: "*", built: true },
    { href: "/notifications", label: "Notifications", icon: "Bell", perm: "*", built: true } ] },
  { title: "Hotel operations", module: "hotel", items: [
    { href: "/reservations", label: "Reservations", icon: "CalendarCheck", perm: "reservations.view", built: true },
    { href: "/front-desk", label: "Front Desk", icon: "ConciergeBell", perm: ["frontdesk.checkin", "frontdesk.checkout", "frontdesk.walkin"], built: true },
    { href: "/rooms", label: "Room Management", icon: "DoorOpen", perm: "rooms.view", built: true },
    { href: "/accommodation-categories", label: "Accommodation Categories", icon: "Layers", perm: ["categories.manage", "rooms.view"], built: true },
    { href: "/availability", label: "Availability Calendar", icon: "CalendarRange", perm: ["reservations.view", "rooms.view"], built: true },
    { href: "/guests", label: "Guests", icon: "Users", perm: "guests.view", built: true },
    { href: "/housekeeping", label: "Housekeeping", icon: "SprayCan", perm: "housekeeping.view", built: true },
    { href: "/maintenance", label: "Maintenance", icon: "Wrench", perm: "maintenance.view", built: true } ] },
  { title: "Lounge management", module: "lounge", items: [
    { href: "/lounge", label: "Lounge Overview", icon: "Wine", perm: "lounge.view", built: true },
    { href: "/lounge/pos", label: "Point of Sale (POS)", icon: "ShoppingBag", perm: "pos.create", built: true },
    { href: "/lounge/orders", label: "Orders", icon: "ClipboardList", perm: ["lounge.view", "pos.create"], built: true },
    { href: "/lounge/tables", label: "Tables & Customer Tabs", icon: "Armchair", perm: ["lounge.view", "pos.create"], built: true },
    { href: "/lounge/bar", label: "Bar Order Queue", icon: "GlassWater", perm: "bar.process", built: true },
    { href: "/lounge/products", label: "Products & Pricing", icon: "Tag", perm: "products.manage", built: true },
    { href: "/lounge/inventory", label: "Inventory & Stock", icon: "Boxes", perm: "stock.view", built: true },
    { href: "/lounge/shifts", label: "Staff Shifts", icon: "Clock", perm: "shift.own", built: true },
    { href: "/lounge/reconciliation", label: "Shift Reconciliation", icon: "Scale", perm: ["shift.own", "recon.review"], built: true },
    { href: "/lounge/reports", label: "Lounge Reports", icon: "BarChart3", perm: "reports.lounge", built: true } ] },
  { title: "Finance", module: "both", items: [
    { href: "/finance/payments", label: "Payments", icon: "Banknote", perm: "payments.view", built: true },
    { href: "/finance/expenses", label: "Expenses", icon: "Receipt", perm: ["reports.financial", "stock.add"], built: true },
    { href: "/finance/refunds", label: "Refunds", icon: "Undo2", perm: ["refunds.approve", "refunds.process"], built: true },
    { href: "/finance/reports", label: "Financial Reports", icon: "LineChart", perm: "reports.financial", built: true } ] },
  { title: "Management", module: "both", items: [
    { href: "/staff", label: "Staff Management", icon: "UserCog", perm: "staff.view", built: true },
    { href: "/settings/roles", label: "Roles & Permissions", icon: "ShieldCheck", perm: "staff.roles", built: true },
    { href: "/activity-logs", label: "Activity Logs", icon: "History", perm: "logs.view", built: true },
    { href: "/reports", label: "Reports & Analytics", icon: "PieChart", perm: ["reports.hotel", "reports.lounge", "reports.financial"], built: true },
    { href: "/settings", label: "Settings", icon: "Settings", perm: "*", built: true } ] },
];
