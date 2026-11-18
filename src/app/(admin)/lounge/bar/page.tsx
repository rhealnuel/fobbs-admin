"use client";
import { useEffect, useState } from "react";
import { useDB, useStore } from "@/store/store";
import { Button, Empty, PageHeader, useAct } from "@/components/ui";
import { NEXT_LABEL } from "@/components/lounge";
import { cn, ago } from "@/lib/utils";
import type { Order, OrderStatus } from "@/types";

const COLS: { s: OrderStatus; title: string }[] = [{ s: "Submitted", title: "New" }, { s: "Accepted", title: "Accepted" }, { s: "Preparing", title: "Preparing" }, { s: "Ready", title: "Ready for collection" }];
export default function Bar() {
  const db = useDB(); const { advanceOrder } = useStore(); const act = useAct(); const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 20000); return () => clearInterval(t); }, []);
  const who = (id: string) => db.staff.find((s) => s.id === id)?.name ?? id; const open = db.orders.filter((o) => ["Submitted", "Accepted", "Preparing", "Ready"].includes(o.status));
  const card = (o: Order) => (
    <article key={o.id} className={cn("border bg-white p-4", o.status === "Submitted" ? "border-gold border-l-4" : "border-black/10")}>
      <div className="flex items-start justify-between gap-2"><div><p className="font-serif text-3xl leading-none">{o.table ?? (o.type === "Takeaway" ? "Takeaway" : "Walk-in")}</p><p className="mt-1 text-xs text-muted">{o.ref} · {who(o.waiterId)}{o.customer ? ` · ${o.customer}` : ""}</p></div><span className="shrink-0 text-xs text-muted">{ago(o.at)}</span></div>
      <ul className="my-3 space-y-1 border-y border-black/10 py-3">{o.items.map((i, k) => <li key={k} className="flex gap-3 text-lg"><b className="w-8 shrink-0 text-gold">{i.qty}×</b><span>{i.name}</span></li>)}</ul>
      {o.note && <p className="mb-3 bg-[#fbf0d6] px-2 py-1.5 text-sm">Note: {o.note}</p>}
      <Button variant={o.status === "Submitted" ? "gold" : "dark"} size="lg" className="w-full" onClick={() => act(advanceOrder(o.id))}>{NEXT_LABEL[o.status]}</Button>
    </article>
  );
  return (
    <>
      <PageHeader title="Bar Order Queue" sub={`${open.length} open order${open.length === 1 ? "" : "s"} · refreshes automatically, and instantly across tabs on this device`} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{COLS.map((c) => { const list = open.filter((o) => o.status === c.s).sort((a, b) => a.at.localeCompare(b.at)); return (
        <section key={c.s}><h2 className="mb-2 flex items-center justify-between bg-black px-3 py-2 text-sm font-semibold text-champagne">{c.title}<span className="bg-white/15 px-1.5 text-xs text-white">{list.length}</span></h2>
          <div className="space-y-3">{list.map(card)}{!list.length && <div className="border border-dashed border-black/15 py-8"><Empty title="Nothing here" /></div>}</div></section>); })}</div>
    </>
  );
}
