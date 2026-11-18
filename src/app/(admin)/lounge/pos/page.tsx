"use client";
import Link from "next/link";
import { useState } from "react";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useDB, useStore } from "@/store/store";
import type { OrderType } from "@/types";
import { Button, Drawer, Field, Input, Notice, SearchBox, Select, Textarea, useAct } from "@/components/ui";
import { cn, money } from "@/lib/utils";
import { orderBalance } from "@/lib/calc";

const TYPES: OrderType[] = ["Table order", "Walk-in order", "Customer tab", "Takeaway"];
export default function POS() {
  const db = useDB(); const { user, can, createOrder, deleteDraft } = useStore(); const act = useAct();
  const [q, setQ] = useState(""); const [cat, setCat] = useState("All"); const [type, setType] = useState<OrderType>("Table order"); const [table, setTable] = useState(""); const [customer, setCustomer] = useState(""); const [note, setNote] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({}); const [disc, setDisc] = useState(0); const [discWhy, setDiscWhy] = useState(""); const [draftId, setDraftId] = useState<string | undefined>(); const [sheet, setSheet] = useState(false); const [busy, setBusy] = useState(false);
  const shift = db.shifts.find((s) => s.staffId === user?.id && s.status === "Open");
  const cats = ["All", ...Array.from(new Set(db.products.filter((p) => p.active).map((p) => p.category)))];
  const products = db.products.filter((p) => p.active && (cat === "All" || p.category === cat) && (!q || p.name.toLowerCase().includes(q.toLowerCase()) || p.sku.toLowerCase().includes(q.toLowerCase())));
  const lines = Object.entries(cart).filter(([, n]) => n > 0).map(([id, qty]) => { const p = db.products.find((x) => x.id === id)!; return { productId: id, name: p.name, price: p.price, qty }; });
  const gross = lines.reduce((s, l) => s + l.price * l.qty, 0); const total = Math.max(0, gross - disc); const count = lines.reduce((s, l) => s + l.qty, 0);
  const inUse = new Set(db.orders.filter((o) => o.table && !["Draft", "Cancelled", "Completed"].includes(o.status)).map((o) => o.table));
  const openTabs = Array.from(new Set(db.orders.filter((o) => o.type === "Customer tab" && o.customer && o.status !== "Cancelled" && orderBalance(db, o) > 0).map((o) => o.customer)));
  const drafts = db.orders.filter((o) => o.status === "Draft" && o.waiterId === user?.id);
  const add = (id: string, d: number) => { const p = db.products.find((x) => x.id === id)!; const n = Math.max(0, (cart[id] ?? 0) + d); if (p.track && n > p.stock) { act({ ok: false, error: `Only ${p.stock} ${p.name} in stock.` }); return; } setCart({ ...cart, [id]: n }); };
  const reset = () => { setCart({}); setNote(""); setDisc(0); setDiscWhy(""); setDraftId(undefined); setCustomer(""); setTable(""); };
  const input = () => ({ type, table: type === "Walk-in order" || type === "Takeaway" ? null : table || null, customer, note, items: lines, discount: disc, discountReason: discWhy });
  const submit = () => { setBusy(true); const r = createOrder(input(), true, draftId); setBusy(false); if (act(r, "Order sent to the bar")) { reset(); setSheet(false); } };
  const draft = () => { const r = createOrder(input(), false, draftId); if (act(r, "Draft saved")) { reset(); setSheet(false); } };
  const resume = (id: string) => { const o = db.orders.find((x) => x.id === id)!; setType(o.type); setTable(o.table ?? ""); setCustomer(o.customer); setNote(o.note); setDisc(o.discount); setDiscWhy(o.discountReason ?? ""); setCart(Object.fromEntries(o.items.map((i) => [i.productId, i.qty]))); setDraftId(id); };

  const cart_ = (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b border-black/10 p-4">
        <div role="group" aria-label="Order type" className="grid grid-cols-4 border border-black/20">{TYPES.map((t) => <button key={t} aria-pressed={type === t} onClick={() => setType(t)} className={cn("h-11 px-1 text-xs font-semibold sm:text-sm", type === t ? "bg-black text-champagne" : "bg-white hover:bg-black/5")}>{({ "Table order": "Table", "Walk-in order": "Walk-in", "Customer tab": "Tab", Takeaway: "Takeaway" } as Record<string, string>)[t]}</button>)}</div>
        {type === "Table order" && <Field label="Table"><Select value={table} onChange={(e) => setTable(e.target.value)}><option value="">Choose a table</option>{db.settings.tables.map((t) => <option key={t} value={t}>{t}{inUse.has(t) ? " · in use" : ""}</option>)}</Select></Field>}
        {(type === "Customer tab" || type === "Table order") && <Field label={type === "Customer tab" ? "Customer name (tab)" : "Customer name or reference (optional)"}><Input list="open-tabs" value={customer} onChange={(e) => setCustomer(e.target.value)} />{type === "Customer tab" && <datalist id="open-tabs">{openTabs.map((t) => <option key={t} value={t} />)}</datalist>}</Field>}
        {type === "Customer tab" && <Field label="Table (optional)"><Select value={table} onChange={(e) => setTable(e.target.value)}><option value="">No table</option>{db.settings.tables.map((t) => <option key={t}>{t}</option>)}</Select></Field>}
      </div>
      <div className="scroll-thin min-h-32 flex-1 overflow-y-auto p-4">
        {lines.length ? <ul className="divide-y divide-black/[.07]">{lines.map((l) => <li key={l.productId} className="flex items-center gap-2 py-2.5"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{l.name}</p><p className="text-xs text-muted">{money(l.price)} each</p></div>
          <div className="flex items-center"><button aria-label={`Fewer ${l.name}`} onClick={() => add(l.productId, -1)} className="grid size-10 place-items-center border border-black/20 hover:border-gold"><Minus size={15} /></button><span className="w-9 text-center font-semibold">{l.qty}</span><button aria-label={`More ${l.name}`} onClick={() => add(l.productId, 1)} className="grid size-10 place-items-center border border-black/20 hover:border-gold"><Plus size={15} /></button></div>
          <p className="w-20 text-right text-sm">{money(l.price * l.qty)}</p><button aria-label={`Remove ${l.name}`} onClick={() => setCart({ ...cart, [l.productId]: 0 })} className="grid size-9 place-items-center text-muted hover:text-[#9b2c2c]"><Trash2 size={15} /></button></li>)}</ul>
          : <div className="grid h-full place-items-center py-8 text-center text-sm text-muted"><p>Tap a drink to start the order.</p></div>}
      </div>
      <div className="space-y-3 border-t border-black/10 p-4">
        <Field label="Order note"><Textarea className="min-h-14" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. no ice, serve together" /></Field>
        {can("pos.discount") && <div className="grid grid-cols-2 gap-2"><Field label="Discount (₦)"><Input type="number" min={0} value={disc || ""} onChange={(e) => setDisc(Number(e.target.value))} /></Field>{disc > 0 && <Field label="Reason"><Input value={discWhy} onChange={(e) => setDiscWhy(e.target.value)} /></Field>}</div>}
        <dl className="text-sm"><div className="flex justify-between py-0.5"><dt className="text-muted">Subtotal</dt><dd>{money(gross)}</dd></div>{disc > 0 && <div className="flex justify-between py-0.5"><dt className="text-muted">Discount</dt><dd>−{money(disc)}</dd></div>}<div className="flex justify-between border-t border-black/10 pt-2 font-serif text-2xl"><dt>Total</dt><dd>{money(total)}</dd></div></dl>
        <div className="grid grid-cols-[1fr_auto] gap-2"><Button variant="gold" size="lg" loading={busy} disabled={!lines.length || !can("pos.submit")} onClick={submit}>Submit to bar</Button><Button size="lg" disabled={!lines.length} onClick={draft}>Save draft</Button></div>
        {(lines.length > 0 || draftId) && <button onClick={() => { if (draftId) deleteDraft(draftId); reset(); }} className="w-full text-xs text-muted underline">Clear order</button>}
      </div>
    </div>
  );
  return (
    <>
      {!shift && <div className="mb-4"><Notice tone="warn">You have no open shift, so orders cannot be submitted. <Link href="/lounge/shifts" className="font-semibold underline">Start your shift</Link> first.</Notice></div>}
      <div className="grid gap-5 lg:grid-cols-[1fr_400px]">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-3"><SearchBox value={q} onChange={setQ} placeholder="Search drinks and food" className="min-w-52 flex-1" />{drafts.length > 0 && <div className="flex items-center gap-1.5 text-xs text-muted">Drafts:{drafts.map((d) => <button key={d.id} onClick={() => resume(d.id)} className="border border-black/20 bg-white px-2 py-1 text-black hover:border-gold">{d.ref}</button>)}</div>}</div>
          <div className="scroll-thin mb-4 flex gap-2 overflow-x-auto pb-1">{cats.map((c) => <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c} className={cn("h-11 shrink-0 border px-4 text-sm font-medium", cat === c ? "border-black bg-black text-champagne" : "border-black/20 bg-white hover:border-gold")}>{c}</button>)}</div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => { const out = p.track && p.stock <= 0; const n = cart[p.id] ?? 0; return (
              <button key={p.id} disabled={out || !can("pos.create")} onClick={() => add(p.id, 1)} className={cn("relative flex min-h-28 flex-col justify-between border bg-white p-3 text-left hover:border-gold disabled:opacity-45", n > 0 ? "border-gold" : "border-black/10")}>
                <div><p className="text-xs text-muted">{p.category} · {p.unit}</p><p className="mt-0.5 font-medium leading-snug">{p.name}</p></div>
                <div className="mt-2 flex items-end justify-between"><span className="font-serif text-lg">{money(p.price)}</span><span className={cn("text-xs", p.track && p.stock <= p.lowAt ? "font-semibold text-[#9b2c2c]" : "text-muted")}>{out ? "Out of stock" : p.track ? `${p.stock} left` : ""}</span></div>
                {n > 0 && <span className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center bg-gold text-xs font-bold text-black">{n}</span>}</button>); })}
            {!products.length && <p className="col-span-full py-10 text-center text-sm text-muted">No products match. Products are managed under Products &amp; Pricing.</p>}
          </div>
        </div>
        <aside className="hidden self-start border border-black/10 bg-white lg:sticky lg:top-24 lg:block lg:h-[calc(100dvh-8rem)]">{cart_}</aside>
      </div>
      <div className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-black/10 bg-white p-3 lg:hidden" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
        <Button variant="gold" size="lg" className="w-full" onClick={() => setSheet(true)}><ShoppingBag size={18} />{count ? `View order · ${count} item${count === 1 ? "" : "s"} · ${money(total)}` : "Order is empty"}</Button></div>
      <div className="h-20 lg:hidden" />
      <Drawer open={sheet} onClose={() => setSheet(false)} title="Current order" width="max-w-md"><div className="-m-5 h-[calc(100dvh-60px)]">{cart_}</div></Drawer>
    </>
  );
}
