"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useDB, useStore } from "@/store/store";
import type { Product } from "@/types";
import { Badge, Button, Card, DataTable, Empty, Field, Input, Modal, Notice, PageHeader, SearchBox, Select, useAct, type Col } from "@/components/ui";
import { money } from "@/lib/utils";

const UNITS = ["Bottle", "Can", "Glass", "Shot", "Unit"]; const CATS = ["Beer", "Spirits", "Wine", "Cocktails", "Soft Drinks", "Water", "Food", "Other"];
type F = Omit<Product, "id" | "stock"> & { id?: string; stock?: number };
export default function Products() {
  const db = useDB(); const { can, saveProduct } = useStore(); const act = useAct(); const [q, setQ] = useState(""); const [cat, setCat] = useState(""); const [f, setF] = useState<F | null>(null);
  const cost = can("products.cost"); const manage = can("products.manage");
  const sold = (id: string) => db.orders.filter((o) => !["Draft", "Cancelled"].includes(o.status)).reduce((s, o) => s + o.items.filter((i) => i.productId === id).reduce((a, i) => a + i.qty, 0), 0);
  const rows = db.products.filter((p) => (!q || p.name.toLowerCase().includes(q.toLowerCase()) || p.sku.toLowerCase().includes(q.toLowerCase())) && (!cat || p.category === cat));
  const cols: Col<Product>[] = [
    { key: "n", header: "Product", cell: (p) => <><p className="font-medium">{p.name}</p><p className="text-xs text-muted">{p.sku} · {p.unit}</p></>, sort: (p) => p.name }, { key: "c", header: "Category", cell: (p) => p.category, sort: (p) => p.category, hideBelow: "md" },
    { key: "p", header: "Price", cell: (p) => money(p.price), sort: (p) => p.price, className: "text-right" },
    ...(cost ? [{ key: "m", header: "Margin", cell: (p: Product) => (p.cost != null ? `${Math.round(((p.price - p.cost) / p.price) * 100)}%` : "—"), hideBelow: "lg" as const, className: "text-right" }] : []),
    { key: "s", header: "Stock", cell: (p) => (p.track ? p.stock : "—"), sort: (p) => p.stock, className: "text-right", hideBelow: "md" }, { key: "x", header: "Units sold", cell: (p) => sold(p.id), sort: (p) => sold(p.id), className: "text-right", hideBelow: "lg" },
    { key: "a", header: "Status", cell: (p) => <Badge tone={p.active ? "green" : "grey"}>{p.active ? "Active" : "Inactive"}</Badge> },
  ];
  return (
    <>
      <PageHeader title="Products & Pricing" sub="Everything sold in the lounge is configured here. Nothing is hard-coded in the POS." actions={manage ? <Button variant="gold" onClick={() => setF({ name: "", category: "Beer", price: 0, cost: null, sku: "", unit: "Bottle", track: true, active: true, lowAt: 10 })}><Plus size={15} />Add product</Button> : undefined} />
      <Card pad={false}><div className="grid gap-3 border-b border-black/10 p-4 md:grid-cols-4"><SearchBox value={q} onChange={setQ} placeholder="Name or SKU" className="md:col-span-2" /><Select aria-label="Category" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories</option>{CATS.map((c) => <option key={c}>{c}</option>)}</Select></div>
        <DataTable rows={rows} cols={cols} rowKey={(p) => p.id} onRow={manage ? (p) => setF({ ...p }) : undefined} empty={<Empty title="No products yet" hint="Add your first product to make it available in the POS." />} /></Card>
      <Modal open={!!f} onClose={() => setF(null)} title={f?.id ? "Edit product" : "Add product"} width="max-w-2xl" footer={<><Button onClick={() => setF(null)}>Cancel</Button><Button variant="gold" onClick={() => { if (f && act(saveProduct(f), "Product saved")) setF(null); }}>Save product</Button></>}>
        {f && <div className="grid gap-4 md:grid-cols-2"><Field label="Product name" className="md:col-span-2"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Category"><Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</Select></Field><Field label="Sold by"><Select value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })}>{UNITS.map((u) => <option key={u}>{u}</option>)}</Select></Field>
          <Field label="Selling price (₦)"><Input type="number" min={0} value={f.price || ""} onChange={(e) => setF({ ...f, price: Number(e.target.value) })} /></Field>
          {cost ? <Field label="Cost price (₦)" hint="Visible to authorised roles only"><Input type="number" min={0} value={f.cost ?? ""} onChange={(e) => setF({ ...f, cost: e.target.value === "" ? null : Number(e.target.value) })} /></Field> : <div />}
          <Field label="SKU / code"><Input value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value })} /></Field><Field label="Low-stock alert at"><Input type="number" min={0} value={f.lowAt} onChange={(e) => setF({ ...f, lowAt: Number(e.target.value) })} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-[#c9a348]" checked={f.track} onChange={(e) => setF({ ...f, track: e.target.checked })} />Track stock</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-[#c9a348]" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />Available for sale</label>
          <div className="md:col-span-2"><Notice tone="info">Product photographs and portion recipes (for example, one bottle yielding several shots) need file storage and a recipe model, planned with the backend. Price changes are written to the activity log.</Notice></div></div>}
      </Modal>
    </>
  );
}
