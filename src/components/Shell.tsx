"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, ChevronDown, ChevronsLeft, Hotel, LogOut, Martini, Menu, RotateCcw, Search, X } from "lucide-react";
import { useStore } from "@/store/store";
import { NAV, type NavItem } from "@/config/permissions";
import Icon from "@/components/Icon";
import { Badge, Denied, Empty, Loading } from "@/components/ui";
import { ago, cn } from "@/lib/utils";

const flat = NAV.flatMap((s) => s.items);
export function navFor(path: string): NavItem | undefined { return [...flat].sort((a, b) => b.href.length - a.href.length).find((n) => path === n.href || path.startsWith(n.href + "/")); }
export function landingFor(can: (p: string | string[]) => boolean): string {
  if (can(["reservations.view", "reports.hotel", "reports.lounge", "reports.financial"])) return "/dashboard";
  const first = flat.find((n) => n.built && n.perm !== "*" && can(n.perm)); return first?.href ?? "/dashboard";
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const { db, user, can, logout, resetDemo } = useStore(); const path = usePathname(); const router = useRouter();
  const [collapsed, setCollapsed] = useState(false); const [mobile, setMobile] = useState(false);
  useEffect(() => { if (db && !user) router.replace("/login"); }, [db, user, router]);
  useEffect(() => setMobile(false), [path]);
  const role = user && db ? db.roles.find((r) => r.id === user.roleId) : null;
  const hasHotel = can(NAV[1].items.flatMap((i) => i.perm).filter((p) => p !== "*")); const hasLounge = can(NAV[2].items.flatMap((i) => i.perm).filter((p) => p !== "*"));
  const mod: "hotel" | "lounge" = path.startsWith("/lounge") || (!hasHotel && hasLounge) ? "lounge" : "hotel";
  const sections = useMemo(() => NAV.filter((s) => s.module === "both" || s.module === mod).map((s) => ({ ...s, items: s.items.filter((i) => i.perm === "*" || can(i.perm)) })).filter((s) => s.items.length), [mod, can]);
  if (!db || !user) return <Loading label="Opening FOBBS Admin…" />;
  const nav = navFor(path); const allowed = !nav || nav.perm === "*" || can(nav.perm);
  const unread = db.notices.filter((n) => !n.read && can(n.perm)).length;
  const SidebarBody = (
    <div className="flex h-full flex-col bg-black text-white">
      <div className={cn("flex h-[68px] shrink-0 items-center border-b border-gold/30", collapsed ? "justify-center" : "px-5")}>
        <Link href="/dashboard" aria-label="FOBBS Admin home"><Image src="/images/logo/fobbs-logo-light.png" alt="FOBBS Apartment and Suites" width={1000} height={860} className={cn("w-auto", collapsed ? "h-9" : "h-[52px]")} priority /></Link>
      </div>
      <nav aria-label="Main" className="scroll-thin flex-1 overflow-y-auto py-3">
        {sections.map((s) => (
          <div key={s.title} className="mb-3">
            {!collapsed && <p className="px-5 pb-1 pt-2 text-[11px] uppercase text-champagne/60">{s.title}</p>}
            {collapsed && <div className="mx-4 my-2 border-t border-white/10" />}
            {s.items.map((i) => { const active = i.href === "/lounge" ? path === "/lounge" : path === i.href || path.startsWith(i.href + "/"); return (
              <Link key={i.href} href={i.href} title={collapsed ? i.label : undefined} aria-current={active ? "page" : undefined}
                className={cn("flex items-center gap-3 border-l-2 py-2.5 text-sm transition-colors", collapsed ? "justify-center px-0" : "px-5", active ? "border-gold bg-white/[.07] text-champagne" : "border-transparent text-white/75 hover:bg-white/5 hover:text-white")}>
                <Icon name={i.icon} size={17} className="shrink-0" />{!collapsed && <span className="flex-1 leading-tight">{i.label}</span>}
                {!collapsed && !i.built && <span className="text-[10px] text-white/35">{i.phase}</span>}
                {!collapsed && i.href === "/notifications" && unread > 0 && <span className="bg-gold px-1.5 text-[11px] font-bold text-black">{unread}</span>}
              </Link>); })}
          </div>
        ))}
      </nav>
      <button onClick={() => setCollapsed((c) => !c)} className="hidden h-11 items-center justify-center gap-2 border-t border-white/10 text-xs text-white/55 hover:text-white lg:flex" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}><ChevronsLeft size={16} className={collapsed ? "rotate-180" : ""} />{!collapsed && "Collapse"}</button>
    </div>
  );
  return (
    <div className="min-h-dvh">
      <aside className={cn("no-print fixed inset-y-0 left-0 z-30 hidden transition-[width] lg:block", collapsed ? "w-[68px]" : "w-[264px]")}>{SidebarBody}</aside>
      {mobile && <div className="fixed inset-0 z-40 lg:hidden" onMouseDown={(e) => e.target === e.currentTarget && setMobile(false)} style={{ background: "rgba(0,0,0,.5)" }}><div className="h-full w-[280px]">{SidebarBody}</div><button aria-label="Close menu" onClick={() => setMobile(false)} className="absolute left-[288px] top-3 grid h-10 w-10 place-items-center bg-black text-white"><X size={18} /></button></div>}
      <div className={cn("transition-[padding]", collapsed ? "lg:pl-[68px]" : "lg:pl-[264px]")}>
        <Header onMenu={() => setMobile(true)} mod={mod} hasBoth={hasHotel && hasLounge} unread={unread} roleName={role?.name ?? ""} onReset={resetDemo} onLogout={() => { logout(); router.replace("/login"); }} path={path} />
        <main className="mx-auto max-w-[1500px] p-4 md:p-6">{allowed ? (nav && !nav.built ? <ComingSoon item={nav} /> : children) : <Denied />}</main>
      </div>
    </div>
  );
}

function ComingSoon({ item }: { item: NavItem }) {
  return (<div className="mx-auto max-w-xl border border-black/10 bg-white py-10"><Empty title={item.label} hint={`This module is scheduled for ${item.phase} of the build plan and is not part of the first design review. It is shown in the menu so the structure is visible, but it has no working screen yet.`} action={<Link href="/dashboard" className="inline-flex h-10 items-center bg-gold px-4 text-sm font-semibold hover:bg-champagne">Back to overview</Link>} /></div>);
}

function Crumbs({ path }: { path: string }) {
  const { db } = useStore(); const parts = path.split("/").filter(Boolean); const nav = navFor(path);
  const crumbs: { label: string; href?: string }[] = [{ label: "FOBBS", href: "/dashboard" }];
  if (nav && nav.href !== "/dashboard") crumbs.push({ label: nav.label, href: path === nav.href ? undefined : nav.href });
  else if (!nav) crumbs.push({ label: parts[0] ?? "" });
  if (nav && path !== nav.href) { const id = parts[parts.length - 1]; const r = db?.reservations.find((x) => x.id === id); crumbs.push({ label: r?.ref ?? id }); }
  const title = crumbs[crumbs.length - 1].label;
  return <div className="min-w-0"><ol className="flex items-center gap-1.5 text-xs text-muted">{crumbs.map((c, i) => <li key={i} className="flex items-center gap-1.5 truncate">{i > 0 && <span>/</span>}{c.href ? <Link href={c.href} className="hover:text-black">{c.label}</Link> : <span className="text-black">{c.label}</span>}</li>)}</ol><p className="truncate font-serif text-lg leading-tight">{nav?.label ?? title}</p></div>;
}

function Header({ onMenu, mod, hasBoth, unread, roleName, onLogout, onReset, path }: { onMenu: () => void; mod: "hotel" | "lounge"; hasBoth: boolean; unread: number; roleName: string; onLogout: () => void; onReset: () => void; path: string }) {
  const { db, user, can, markNotice } = useStore(); const router = useRouter();
  const [menu, setMenu] = useState<"" | "bell" | "me">(""); const [q, setQ] = useState(""); const ref = useRef<HTMLElement>(null);
  useEffect(() => { const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setMenu(""); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  const results = useMemo(() => {
    const s = q.trim().toLowerCase(); if (s.length < 2 || !db) return [];
    const out: { label: string; sub: string; href: string }[] = [];
    if (can("reservations.view")) db.reservations.forEach((r) => { const g = db.guests.find((x) => x.id === r.guestId); if ([r.ref, g?.name, g?.phone].some((v) => v?.toLowerCase().includes(s))) out.push({ label: `${r.ref} · ${g?.name}`, sub: `Reservation · ${r.status}`, href: `/reservations/${r.id}` }); });
    if (can("guests.view")) db.guests.forEach((g) => { if ([g.name, g.phone, g.email].some((v) => v.toLowerCase().includes(s))) out.push({ label: g.name, sub: `Guest · ${g.phone}`, href: `/guests?q=${encodeURIComponent(g.name)}` }); });
    if (can("rooms.view")) db.rooms.forEach((r) => { if (r.number.toLowerCase().includes(s)) out.push({ label: `Room ${r.number}`, sub: `Room · ${r.status}`, href: `/rooms?q=${r.number}` }); });
    if (can(["lounge.view", "pos.create"])) db.orders.forEach((o) => { if (o.ref.toLowerCase().includes(s)) out.push({ label: o.ref, sub: `Order · ${o.status}`, href: `/lounge/orders?q=${o.ref}` }); });
    return out.slice(0, 8);
  }, [q, db, can]);
  const mine = db ? db.notices.filter((n) => can(n.perm)).slice(0, 6) : [];
  return (
    <header ref={ref} className="no-print sticky top-0 z-20 flex h-[68px] items-center gap-3 border-b border-black/10 bg-warm px-4 md:px-6">
      <button onClick={onMenu} className="grid h-10 w-10 place-items-center border border-black/15 lg:hidden" aria-label="Open menu"><Menu size={18} /></button>
      <div className="min-w-0 flex-1 lg:flex-none lg:basis-[260px]"><Crumbs path={path} /></div>
      <div className="relative hidden flex-1 md:block md:max-w-md">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search bookings, guests, rooms, orders" aria-label="Global search" className="h-10 w-full border border-black/15 bg-white pl-9 pr-3 text-sm outline-none focus:border-gold" />
        {q.trim().length >= 2 && <div className="absolute inset-x-0 top-11 border border-black/10 bg-white shadow-xl">{results.length ? results.map((r, i) => <button key={i} onClick={() => { setQ(""); router.push(r.href); }} className="block w-full border-b border-black/5 px-3 py-2 text-left last:border-0 hover:bg-cream"><p className="text-sm font-medium">{r.label}</p><p className="text-xs text-muted">{r.sub}</p></button>) : <p className="px-3 py-3 text-sm text-muted">No matches you have access to.</p>}</div>}
      </div>
      <div className="ml-auto flex items-center gap-2">
        {hasBoth && <div className="hidden border border-black/15 bg-white sm:flex" role="group" aria-label="Module switcher">
          <button onClick={() => router.push("/dashboard")} aria-pressed={mod === "hotel"} className={cn("flex h-10 items-center gap-1.5 px-3 text-sm", mod === "hotel" ? "bg-black text-champagne" : "hover:bg-black/5")}><Hotel size={15} />Hotel</button>
          <button onClick={() => router.push("/lounge")} aria-pressed={mod === "lounge"} className={cn("flex h-10 items-center gap-1.5 px-3 text-sm", mod === "lounge" ? "bg-black text-champagne" : "hover:bg-black/5")}><Martini size={15} />Lounge</button>
        </div>}
        <div className="relative" ref={undefined}>
          <button onClick={() => setMenu(menu === "bell" ? "" : "bell")} className="relative grid h-10 w-10 place-items-center border border-black/15 bg-white hover:border-gold" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}><Bell size={17} />{unread > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center bg-gold px-1 text-[10px] font-bold text-black">{unread}</span>}</button>
          {menu === "bell" && <div className="absolute right-0 top-11 z-10 w-[min(92vw,360px)] border border-black/10 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-black/10 px-3 py-2"><p className="font-serif">Notifications</p><button className="text-xs underline" onClick={() => markNotice()}>Mark all read</button></div>
            {mine.length ? mine.map((n) => <button key={n.id} onClick={() => { markNotice(n.id); setMenu(""); router.push(n.href); }} className={cn("block w-full border-b border-black/5 px-3 py-2.5 text-left hover:bg-cream", !n.read && "border-l-2 border-l-gold bg-[#fffaf0]")}><p className="text-sm">{n.text}</p><p className="text-xs text-muted">{ago(n.at)}</p></button>) : <p className="px-3 py-4 text-sm text-muted">Nothing new.</p>}
            <Link href="/notifications" onClick={() => setMenu("")} className="block px-3 py-2 text-center text-sm font-semibold hover:bg-cream">View all</Link>
          </div>}
        </div>
        <div className="relative">
          <button onClick={() => setMenu(menu === "me" ? "" : "me")} className="flex h-10 items-center gap-2 border border-black/15 bg-white pl-1 pr-2 hover:border-gold" aria-label="Profile menu">
            <span className="grid h-8 w-8 place-items-center bg-black text-xs font-bold text-champagne">{user?.name.split(" ").map((x) => x[0]).join("").slice(0, 2)}</span>
            <span className="hidden text-left leading-tight md:block"><span className="block text-sm font-medium">{user?.name}</span><span className="block text-[11px] text-muted">{roleName}</span></span><ChevronDown size={14} className="hidden md:block" />
          </button>
          {menu === "me" && <div className="absolute right-0 top-11 z-10 w-64 border border-black/10 bg-white shadow-xl">
            <div className="border-b border-black/10 p-3"><p className="font-medium">{user?.name}</p><p className="text-xs text-muted">{user?.email}</p><div className="mt-2 flex flex-wrap gap-1"><Badge tone="dark">{roleName}</Badge>{user?.extraRoleIds.map((r) => <Badge key={r} tone="gold">{db?.roles.find((x) => x.id === r)?.name}</Badge>)}</div></div>
            <button onClick={() => { if (confirm("Reset all demonstration data to its starting state?")) { onReset(); setMenu(""); } }} className="flex w-full items-center gap-2 px-3 py-2.5 text-sm hover:bg-cream"><RotateCcw size={15} />Reset demo data</button>
            <button onClick={onLogout} className="flex w-full items-center gap-2 border-t border-black/10 px-3 py-2.5 text-sm hover:bg-cream"><LogOut size={15} />Log out</button>
          </div>}
        </div>
      </div>
    </header>
  );
}
