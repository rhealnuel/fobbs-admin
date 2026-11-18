"use client";
import { useMemo, useState } from "react";
import { Plus, Printer } from "lucide-react";
import { useDB, useStore } from "@/store/store";
import type { Order, PayMethod } from "@/types";
import { Badge, Button, Card, Confirm, Drawer, Empty, Field, Input, KV, Modal, Notice, PageHeader, Select, Tabs, useAct } from "@/components/ui";
import { OrderDrawer } from "@/components/lounge";
import { PAY_METHODS } from "@/components/hotel";
import { cn, fmtDT, money } from "@/lib/utils";
import { orderBalance, orderTotal } from "@/lib/calc";

const OPEN = ["Submitted", "Accepted", "Preparing", "Ready", "Served"];
export default function TablesPage() {
  const db = useDB(); const { can, saveSettings, transferOrder, payTab } = useStore(); const act = useAct();
  const [tab, setTab] = useState<"tables" | "tabs">("tables"); const [selTable, setSelTable] = useState<string | null>(null); const [selTab, setSelTab] = useState<string | null>(null); const [order, setOrder] = useState<string | null>(null);
  const [newT, setNewT] = useState<string | null>(null); const [rm, setRm] = useState<string | null>(null); const [move, setMove] = useState<{ id: string; to: string } | null>(null);
  const [pay, setPay] = useState<{ amt: number; m: PayMethod; ref: string } | null>(null);
  const manage = can("products.manage"); const who = (id: string) => db.staff.find((s) => s.id === id)?.name ?? id;
  const openAt = (t: string) => db.orders.filter((o) => o.table === t && OPEN.includes(o.status) || (o.table === t && o.status === "Completed" && false));
  const unpaidAt = (t: string) => db.orders.filter((o) => o.table === t && !["Draft", "Cancelled"].includes(o.status) && orderBalance(db, o) > 0);
  const tabs = useMemo(() => { const m = new Map<string, Order[]>(); db.orders.filter((o) => o.type === "Customer tab" && o.customer && o.status !== "Draft").forEach((o) => m.set(o.customer, [...(m.get(o.customer) ?? []), o])); return [...m.entries()].map(([name, orders]) => { const live = orders.filter((o) => o.status !== "Cancelled"); const total = live.reduce((s, o) => s + orderTotal(o), 0); const bal = live.reduce((s, o) => s + orderBalance(db, o), 0); return { name, orders, total, bal, paid: total - bal, closed: bal === 0 && live.every((o) => o.status === "Completed") }; }).sort((a, b) => Number(a.closed) - Number(b.closed) || b.bal - a.bal); }, [db]);
  const t = tabs.find((x) => x.name === selTab);
  return (
    <>
      <PageHeader title="Tables & Customer Tabs" sub="See which tables are in use, move orders with authorisation, and settle running tabs." actions={manage ? <Button variant="gold" onClick={() => setNewT("")}><Plus size={15} />Add table</Button> : undefined} />
      <div className="mb-4"><Tabs value={tab} onChange={setTab} tabs={[{ value: "tables", label: "Tables", count: db.settings.tables.length }, { value: "tabs", label: "Customer tabs", count: tabs.filter((x) => !x.closed).length }]} /></div>
      {tab === "tables" ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
          {db.settings.tables.map((tb) => { const o = openAt(tb); const bal = unpaidAt(tb).reduce((s, x) => s + orderBalance(db, x), 0); return (
            <button key={tb} onClick={() => setSelTable(tb)} className={cn("min-h-28 border bg-white p-3 text-left hover:border-gold", o.length ? "border-gold border-l-4" : "border-black/10")}>
              <p className="font-serif text-2xl">{tb}</p><Badge tone={o.length ? "gold" : "green"}>{o.length ? "In use" : "Available"}</Badge>
              <p className="mt-2 text-xs text-muted">{o.length ? `${o.length} active order${o.length === 1 ? "" : "s"}` : "No active orders"}</p>{bal > 0 && <p className="text-xs font-semibold text-[#9b2c2c]">{money(bal)} unpaid</p>}</button>); })}
          {!db.settings.tables.length && <div className="col-span-full"><Empty title="No tables configured" hint="Add tables so waiters can assign orders to them." /></div>}
        </div>
      ) : (
        <Card pad={false}>{tabs.length ? <ul className="divide-y divide-black/[.07]">{tabs.map((x) => <li key={x.name}><button onClick={() => setSelTab(x.name)} className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left hover:bg-cream/50"><div><p className="font-medium">{x.name}</p><p className="text-xs text-muted">{x.orders.length} order{x.orders.length === 1 ? "" : "s"} · total {money(x.total)} · paid {money(x.paid)}</p></div><div className="flex items-center gap-3">{x.bal > 0 && <b className="text-[#9b2c2c]">{money(x.bal)} due</b>}<Badge tone={x.closed ? "grey" : "gold"}>{x.closed ? "Settled" : "Open"}</Badge></div></button></li>)}</ul> : <Empty title="No customer tabs yet" hint="Choose “Tab” in the POS to start a running tab for a customer." />}</Card>
      )}

      <Drawer open={!!selTable} onClose={() => setSelTable(null)} title={`Table ${selTable ?? ""}`}>
        {selTable && <div className="space-y-4">{openAt(selTable).length ? openAt(selTable).map((o) => <div key={o.id} className="border border-black/10 p-3"><div className="flex items-center justify-between"><button onClick={() => setOrder(o.id)} className="font-medium underline decoration-gold underline-offset-4">{o.ref}</button><Badge>{o.status}</Badge></div><p className="text-xs text-muted">{who(o.waiterId)} · {fmtDT(o.at)} · {money(orderTotal(o))}</p><ul className="mt-2 text-sm">{o.items.map((i, k) => <li key={k}>{i.qty}× {i.name}</li>)}</ul>
          {can("pos.cancel") && <div className="mt-3 flex gap-2"><Select aria-label="Move to table" value={move?.id === o.id ? move.to : ""} onChange={(e) => setMove({ id: o.id, to: e.target.value })}><option value="">Move to…</option>{db.settings.tables.filter((x) => x !== selTable).map((x) => <option key={x}>{x}</option>)}</Select><Button disabled={move?.id !== o.id || !move.to} onClick={() => { if (move && act(transferOrder(o.id, move.to), `Moved to ${move.to}`)) setMove(null); }}>Move</Button></div>}</div>) : <Notice tone="ok">This table has no active orders.</Notice>}
          {manage && !openAt(selTable).length && <Button variant="danger" onClick={() => setRm(selTable)}>Remove table</Button>}</div>}
      </Drawer>
      <Drawer open={!!t} onClose={() => setSelTab(null)} title={t ? `Tab: ${t.name}` : ""} footer={t && <><Button onClick={() => window.print()}><Printer size={15} />Print bill</Button>{can("payments.record") && t.bal > 0 && <Button variant="gold" onClick={() => setPay({ amt: t.bal, m: "Cash", ref: "" })}>Record payment</Button>}</>}>
        {t && <div className="print-area space-y-4"><div className="hidden print:block"><p className="font-serif text-xl">{db.settings.loungeName}</p><p className="text-sm">Bill for {t.name}</p></div><div className="grid grid-cols-3 gap-3 text-center"><div className="bg-cream/60 p-3"><p className="text-xs text-muted">Total</p><p className="font-serif text-xl">{money(t.total)}</p></div><div className="bg-cream/60 p-3"><p className="text-xs text-muted">Paid</p><p className="font-serif text-xl">{money(t.paid)}</p></div><div className={cn("p-3", t.bal > 0 ? "bg-[#f8e3e1]" : "bg-[#e6f2e8]")}><p className="text-xs text-muted">Balance</p><p className="font-serif text-xl">{money(t.bal)}</p></div></div>
          {t.orders.map((o) => <div key={o.id} className="border-b border-black/[.07] pb-2 text-sm"><div className="flex justify-between"><button onClick={() => setOrder(o.id)} className="font-medium">{o.ref}{o.table ? ` · ${o.table}` : ""}</button><span>{o.status === "Cancelled" ? <Badge>Cancelled</Badge> : money(orderTotal(o))}</span></div><ul className="text-muted">{o.items.map((i, k) => <li key={k}>{i.qty}× {i.name}</li>)}</ul></div>)}
          {t.closed && <Notice tone="ok">Tab fully settled. Final bill is ready to print.</Notice>}</div>}
      </Drawer>
      <Modal open={!!pay} onClose={() => setPay(null)} title={`Tab payment · ${t?.name ?? ""}`} width="max-w-md" footer={<><Button onClick={() => setPay(null)}>Cancel</Button><Button variant="gold" onClick={() => { if (t && pay && act(payTab(t.name, Number(pay.amt), pay.m, pay.ref), "Payment recorded")) setPay(null); }}>Record</Button></>}>
        {pay && t && <div className="space-y-4"><KV k="Tab balance" v={<b>{money(t.bal)}</b>} /><Field label="Method"><Select value={pay.m} onChange={(e) => setPay({ ...pay, m: e.target.value as PayMethod })}>{PAY_METHODS.map((m) => <option key={m}>{m}</option>)}</Select></Field><Field label="Amount (₦)" hint="Part payments are allowed. Oldest orders are settled first, and no order can be charged twice."><Input type="number" min={0} value={pay.amt || ""} onChange={(e) => setPay({ ...pay, amt: Number(e.target.value) })} /></Field>{pay.m === "Bank transfer" && <Field label="Transfer reference"><Input value={pay.ref} onChange={(e) => setPay({ ...pay, ref: e.target.value })} /></Field>}</div>}
      </Modal>
      <Modal open={newT !== null} onClose={() => setNewT(null)} title="Add table" width="max-w-sm" footer={<><Button onClick={() => setNewT(null)}>Cancel</Button><Button variant="gold" onClick={() => { if (newT !== null && act(saveSettings({ tables: [...db.settings.tables, newT] }), "Table added")) setNewT(null); }}>Add</Button></>}><Field label="Table name or number"><Input value={newT ?? ""} onChange={(e) => setNewT(e.target.value)} placeholder="e.g. T09 or VIP 1" autoFocus /></Field></Modal>
      <Confirm open={!!rm} onClose={() => setRm(null)} danger title={`Remove table ${rm}?`} confirmLabel="Remove" message={<p>The table disappears from the POS. Past orders keep their table name.</p>} onConfirm={() => { if (rm && act(saveSettings({ tables: db.settings.tables.filter((x) => x !== rm) }), "Table removed")) { setRm(null); setSelTable(null); } }} />
      <OrderDrawer id={order} onClose={() => setOrder(null)} />
    </>
  );
}
