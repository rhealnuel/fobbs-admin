"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { useDB } from "@/store/store";
import { Badge, Card, DataTable, Empty, Input, PageHeader, SearchBox, Select, type Col } from "@/components/ui";
import { OrderDrawer } from "@/components/lounge";
import { fmtDT, localDay, money } from "@/lib/utils";
import { orderPayStatus, orderTotal } from "@/lib/calc";
import type { Order } from "@/types";

export default function OrdersPage() { return <Suspense><Orders /></Suspense>; }
function Orders() {
  const db = useDB(); const sp = useSearchParams(); const [q, setQ] = useState(sp.get("q") ?? ""); const [st, setSt] = useState(""); const [ps, setPs] = useState(""); const [tb, setTb] = useState(""); const [day, setDay] = useState(""); const [sel, setSel] = useState<string | null>(null);
  const who = (id: string) => db.staff.find((s) => s.id === id)?.name ?? id;
  const rows = useMemo(() => db.orders.filter((o) => { const s = q.trim().toLowerCase(); return (!s || [o.ref, who(o.waiterId), o.customer].some((v) => v.toLowerCase().includes(s))) && (!st || o.status === st) && (!tb || o.table === tb) && (!day || localDay(o.at) === day) && (!ps || (o.status !== "Cancelled" && orderPayStatus(db, o) === ps)); }), [db, q, st, ps, tb, day]); // eslint-disable-line react-hooks/exhaustive-deps
  const cols: Col<Order>[] = [
    { key: "r", header: "Order", cell: (o) => <span className="font-medium">{o.ref}</span>, sort: (o) => o.ref }, { key: "t", header: "Table / customer", cell: (o) => <>{o.table ?? o.type}<span className="block text-xs text-muted">{o.customer}</span></>, hideBelow: "md" },
    { key: "w", header: "Waiter", cell: (o) => who(o.waiterId), hideBelow: "lg" }, { key: "a", header: "Placed", cell: (o) => fmtDT(o.at), sort: (o) => o.at, hideBelow: "md" },
    { key: "m", header: "Total", cell: (o) => money(orderTotal(o)), sort: (o) => orderTotal(o), className: "text-right" }, { key: "p", header: "Payment", cell: (o) => (o.status === "Cancelled" || o.status === "Draft" ? <span className="text-muted">—</span> : <Badge>{orderPayStatus(db, o)}</Badge>) }, { key: "s", header: "Status", cell: (o) => <Badge>{o.status}</Badge> },
  ];
  return (
    <>
      <PageHeader title="Orders" sub="Submitted orders can only be changed through an authorised amendment or cancellation." />
      <Card pad={false}><div className="grid gap-3 border-b border-black/10 p-4 md:grid-cols-3 xl:grid-cols-6"><SearchBox value={q} onChange={setQ} placeholder="Reference, waiter or customer" className="md:col-span-2" />
        <Select aria-label="Status" value={st} onChange={(e) => setSt(e.target.value)}><option value="">All statuses</option>{["Draft", "Submitted", "Accepted", "Preparing", "Ready", "Served", "Completed", "Cancelled"].map((s) => <option key={s}>{s}</option>)}</Select>
        <Select aria-label="Payment" value={ps} onChange={(e) => setPs(e.target.value)}><option value="">All payments</option><option>Unpaid</option><option>Part paid</option><option>Paid</option></Select>
        <Select aria-label="Table" value={tb} onChange={(e) => setTb(e.target.value)}><option value="">All tables</option>{db.settings.tables.map((t) => <option key={t}>{t}</option>)}</Select><Input type="date" aria-label="Date" value={day} onChange={(e) => setDay(e.target.value)} /></div>
        <DataTable rows={rows} cols={cols} rowKey={(o) => o.id} onRow={(o) => setSel(o.id)} initialSort={{ key: "a", dir: -1 }} empty={<Empty title="No orders match" hint="Orders created in the POS appear here." />} /></Card>
      <OrderDrawer id={sel} onClose={() => setSel(null)} />
    </>
  );
}
