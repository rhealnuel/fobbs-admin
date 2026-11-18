"use client";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { useDB, useStore } from "@/store/store";
import type { Payment } from "@/types";
import { Badge, Button, Card, DataTable, Empty, Input, PageHeader, SearchBox, Select, Stat, useAct, type Col } from "@/components/ui";
import { downloadCSV, fmtDT, localDay, money } from "@/lib/utils";

export default function Payments() {
  const db = useDB(); const { can, verifyPayment } = useStore(); const act = useAct();
  const [q, setQ] = useState(""); const [kind, setKind] = useState(""); const [m, setM] = useState(""); const [v, setV] = useState(""); const [who, setWho] = useState(""); const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const ref = (p: Payment) => (p.kind === "hotel" ? db.reservations.find((r) => r.id === p.refId)?.ref : db.orders.find((o) => o.id === p.refId)?.ref) ?? p.refId;
  const sname = (id: string) => db.staff.find((s) => s.id === id)?.name ?? (id === "system" ? "Online payment" : id);
  const rows = useMemo(() => db.payments.filter((p) => (!q || ref(p).toLowerCase().includes(q.toLowerCase()) || (p.note ?? "").toLowerCase().includes(q.toLowerCase())) && (!kind || p.kind === kind) && (!m || p.method === m) && (!v || (v === "verified") === p.verified) && (!who || p.staffId === who) && (!from || localDay(p.at) >= from) && (!to || localDay(p.at) <= to)).sort((a, b) => b.at.localeCompare(a.at)), [db, q, kind, m, v, who, from, to]); // eslint-disable-line react-hooks/exhaustive-deps
  const sum = (k: string) => rows.filter((p) => p.kind === k).reduce((s, p) => s + p.amount, 0); const pending = rows.filter((p) => !p.verified);
  const cols: Col<Payment>[] = [
    { key: "t", header: "When", cell: (p) => fmtDT(p.at), sort: (p) => p.at }, { key: "r", header: "Reference", cell: (p) => <><span className="font-medium">{ref(p)}</span><span className="block text-xs text-muted">{p.note ?? ""}</span></> },
    { key: "k", header: "Revenue", cell: (p) => <Badge tone={p.kind === "hotel" ? "gold" : "blue"}>{p.kind === "hotel" ? "Hotel" : "Lounge"}</Badge> }, { key: "m", header: "Method", cell: (p) => p.method, hideBelow: "md" },
    { key: "s", header: "Recorded by", cell: (p) => sname(p.staffId), hideBelow: "lg" }, { key: "a", header: "Amount", cell: (p) => <span className={p.amount < 0 ? "text-[#9b2c2c]" : ""}>{money(p.amount)}</span>, sort: (p) => p.amount, className: "text-right" },
    { key: "v", header: "Status", cell: (p) => (p.verified ? <Badge tone="green">Verified</Badge> : can("recon.settle") || can("recon.review") ? <Button size="sm" variant="gold" onClick={(e) => { e.stopPropagation(); act(verifyPayment(p.id), "Transfer verified"); }}>Verify</Button> : <Badge tone="amber">Unverified</Badge>) },
  ];
  return (
    <>
      <PageHeader title="Payments" sub="Hotel and lounge revenue are kept separate. Transfers count as settled only once verified." actions={<Button onClick={() => downloadCSV("payments.csv", [["When", "Reference", "Revenue", "Method", "Recorded by", "Amount", "Verified", "Note"], ...rows.map((p) => [p.at, ref(p), p.kind, p.method, sname(p.staffId), p.amount, p.verified ? "Yes" : "No", p.note ?? ""])])}><Download size={15} />Export CSV</Button>} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label="Hotel (filtered)" value={money(sum("hotel"))} /><Stat label="Lounge (filtered)" value={money(sum("lounge"))} /><Stat label="Transactions" value={rows.length} /><Stat label="Awaiting verification" value={pending.length} sub={money(pending.reduce((s, p) => s + p.amount, 0))} tone={pending.length ? "red" : undefined} /></div>
      <Card pad={false}><div className="grid gap-3 border-b border-black/10 p-4 md:grid-cols-4 xl:grid-cols-7"><SearchBox value={q} onChange={setQ} placeholder="Booking / order ref" className="md:col-span-2" />
        <Select aria-label="Revenue" value={kind} onChange={(e) => setKind(e.target.value)}><option value="">Hotel + lounge</option><option value="hotel">Hotel</option><option value="lounge">Lounge</option></Select>
        <Select aria-label="Method" value={m} onChange={(e) => setM(e.target.value)}><option value="">All methods</option><option>Cash</option><option>Bank transfer</option><option>POS/Card</option></Select>
        <Select aria-label="Status" value={v} onChange={(e) => setV(e.target.value)}><option value="">All statuses</option><option value="verified">Verified</option><option value="unverified">Unverified</option></Select>
        <Select aria-label="Staff" value={who} onChange={(e) => setWho(e.target.value)}><option value="">All staff</option>{db.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
        <div className="grid grid-cols-2 gap-2"><Input type="date" aria-label="From" value={from} onChange={(e) => setFrom(e.target.value)} /><Input type="date" aria-label="To" value={to} onChange={(e) => setTo(e.target.value)} /></div></div>
        <DataTable rows={rows} cols={cols} rowKey={(p) => p.id} pageSize={12} initialSort={{ key: "t", dir: -1 }} empty={<Empty title="No payments match" />} /></Card>
    </>
  );
}
