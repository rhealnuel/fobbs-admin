"use client";
import { useMemo, useState } from "react";
import { useDB, useStore } from "@/store/store";
import type { Product } from "@/types";
import { Badge, Button, Card, DataTable, Empty, Field, Input, Modal, PageHeader, SearchBox, Select, Tabs, useAct, type Col } from "@/components/ui";
import { fmtDT } from "@/lib/utils";

type Kind = "Purchase" | "Received" | "Breakage" | "Wastage" | "Complimentary" | "Adjustment+" | "Adjustment-";
export default function Inventory() {
  const db = useDB(); const { can, stockIn, stockOut } = useStore(); const act = useAct(); const [tab, setTab] = useState<"stock" | "moves">("stock"); const [q, setQ] = useState(""); const [f, setF] = useState<null | { p: Product; kind: Kind; qty: number; reason: string }>(null); const [mp, setMp] = useState("");
  const rows = db.products.filter((p) => p.track && (!q || p.name.toLowerCase().includes(q.toLowerCase()))); const low = rows.filter((p) => p.active && p.stock <= p.lowAt);
  const moves = useMemo(() => db.stock.filter((m) => !mp || m.productId === mp).slice(0, 200), [db, mp]); const pn = (id: string) => db.products.find((p) => p.id === id)?.name ?? id;
  const cols: Col<Product>[] = [
    { key: "n", header: "Product", cell: (p) => <><p className="font-medium">{p.name}</p><p className="text-xs text-muted">{p.category} · {p.unit}</p></>, sort: (p) => p.name },
    { key: "s", header: "In stock", cell: (p) => <span className="font-serif text-xl">{p.stock}</span>, sort: (p) => p.stock, className: "text-right" },
    { key: "sold", header: "Sold (all time)", cell: (p) => Math.abs(db.stock.filter((m) => m.productId === p.id && m.type === "Sale").reduce((s, m) => s + m.qty, 0)) - db.stock.filter((m) => m.productId === p.id && m.type === "Sale reversal").reduce((s, m) => s + m.qty, 0), className: "text-right", hideBelow: "md" },
    { key: "l", header: "Alert level", cell: (p) => p.lowAt, className: "text-right", hideBelow: "lg" }, { key: "st", header: "Status", cell: (p) => (p.stock <= 0 ? <Badge tone="red">Out of stock</Badge> : p.stock <= p.lowAt ? <Badge tone="amber">Low</Badge> : <Badge tone="green">OK</Badge>) },
    { key: "a", header: "", cell: (p) => <div className="flex justify-end gap-1.5">{can("stock.add") && <Button size="sm" onClick={() => setF({ p, kind: "Received", qty: 0, reason: "" })}>Receive</Button>}{can("stock.adjust") && <Button size="sm" onClick={() => setF({ p, kind: "Breakage", qty: 0, reason: "" })}>Record loss / adjust</Button>}</div> },
  ];
  const submit = () => { if (!f) return; const r = f.kind === "Purchase" || f.kind === "Received" ? stockIn(f.p.id, Number(f.qty), f.kind, f.reason) : f.kind === "Adjustment+" ? stockOut(f.p.id, Number(f.qty), "Adjustment", f.reason, 1) : stockOut(f.p.id, Number(f.qty), f.kind === "Adjustment-" ? "Adjustment" : f.kind, f.reason, -1); if (act(r, "Stock updated")) setF(null); };
  return (
    <>
      <PageHeader title="Inventory & Stock" sub="Stock is deducted when an order is submitted and returned if it is cancelled before service." />
      {low.length > 0 && <div className="mb-4 flex flex-wrap gap-2">{low.map((p) => <span key={p.id} className="bg-[#fbf0d6] px-2.5 py-1 text-sm text-[#8a5a00]">{p.name}: {p.stock} left</span>)}</div>}
      <Card pad={false}><div className="px-4"><Tabs value={tab} onChange={setTab} tabs={[{ value: "stock", label: "Current stock" }, { value: "moves", label: "Movement history" }]} /></div>
        {tab === "stock" ? <><div className="border-b border-black/10 p-4"><SearchBox value={q} onChange={setQ} placeholder="Search products" className="max-w-sm" /></div><DataTable rows={rows} cols={cols} rowKey={(p) => p.id} empty={<Empty title="No tracked products" />} /></>
          : <><div className="border-b border-black/10 p-4"><Select aria-label="Product" className="max-w-xs" value={mp} onChange={(e) => setMp(e.target.value)}><option value="">All products</option>{db.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></div>
            <DataTable rows={moves} rowKey={(m) => m.id} pageSize={12} empty={<Empty title="No movements" />} cols={[{ key: "t", header: "When", cell: (m) => fmtDT(m.at) }, { key: "p", header: "Product", cell: (m) => pn(m.productId) }, { key: "y", header: "Type", cell: (m) => <Badge tone={m.qty > 0 ? "green" : "grey"}>{m.type}</Badge> }, { key: "q", header: "Qty", cell: (m) => <b>{m.qty > 0 ? `+${m.qty}` : m.qty}</b>, className: "text-right" }, { key: "w", header: "By", cell: (m) => db.staff.find((s) => s.id === m.staffId)?.name ?? "—", hideBelow: "md" }, { key: "r", header: "Reason", cell: (m) => m.reason, hideBelow: "lg" }]} /></>}</Card>
      <Modal open={!!f} onClose={() => setF(null)} title={f ? `${f.p.name} · ${f.p.stock} in stock` : ""} width="max-w-md" footer={<><Button onClick={() => setF(null)}>Cancel</Button><Button variant="gold" onClick={submit}>Save</Button></>}>
        {f && <div className="space-y-4"><Field label="Movement"><Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as Kind })}>{can("stock.add") && <><option value="Received">Stock received</option><option value="Purchase">New purchase</option></>}{can("stock.adjust") && <><option value="Breakage">Breakage</option><option value="Wastage">Wastage</option><option value="Complimentary">Complimentary item</option><option value="Adjustment-">Adjustment: remove</option><option value="Adjustment+">Adjustment: add</option></>}</Select></Field>
          <Field label="Quantity"><Input type="number" min={1} value={f.qty || ""} onChange={(e) => setF({ ...f, qty: Number(e.target.value) })} /></Field><Field label="Reason / supplier / reference" hint={["Received", "Purchase"].includes(f.kind) ? "Optional" : "Required"}><Input value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field></div>}
      </Modal>
    </>
  );
}
