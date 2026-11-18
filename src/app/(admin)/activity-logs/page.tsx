"use client";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { useDB } from "@/store/store";
import { Button, Card, DataTable, Empty, Input, PageHeader, SearchBox, Select, type Col } from "@/components/ui";
import { downloadCSV, fmtDT, localDay } from "@/lib/utils";
import type { Activity } from "@/types";

export default function Logs() {
  const db = useDB(); const [q, setQ] = useState(""); const [who, setWho] = useState(""); const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const name = (id: string) => db.staff.find((s) => s.id === id)?.name ?? "System";
  const rows = useMemo(() => db.activity.filter((a) => (!q || [a.action, a.record, a.reason, a.prev, a.next].some((v) => v?.toLowerCase().includes(q.toLowerCase()))) && (!who || a.staffId === who) && (!from || localDay(a.at) >= from) && (!to || localDay(a.at) <= to)), [db, q, who, from, to]);
  const cols: Col<Activity>[] = [
    { key: "t", header: "When", cell: (a) => <span className="whitespace-nowrap">{fmtDT(a.at)}</span>, sort: (a) => a.at }, { key: "s", header: "Staff", cell: (a) => name(a.staffId), sort: (a) => name(a.staffId) },
    { key: "a", header: "Action", cell: (a) => <span className="font-medium">{a.action}</span>, sort: (a) => a.action }, { key: "r", header: "Record", cell: (a) => a.record },
    { key: "c", header: "Change", cell: (a) => (a.prev || a.next ? <span className="text-xs"><span className="text-muted">{a.prev ?? "—"}</span> → {a.next ?? "—"}</span> : <span className="text-muted">—</span>), hideBelow: "md" },
    { key: "w", header: "Reason", cell: (a) => a.reason ?? <span className="text-muted">—</span>, hideBelow: "lg" },
  ];
  return (
    <>
      <PageHeader title="Activity Logs" sub="Audit trail. Entries cannot be edited or deleted from this screen." actions={<Button onClick={() => downloadCSV("activity-log.csv", [["When", "Staff", "Action", "Record", "Previous", "New", "Reason"], ...rows.map((a) => [a.at, name(a.staffId), a.action, a.record, a.prev ?? "", a.next ?? "", a.reason ?? ""])])}><Download size={15} />Export CSV</Button>} />
      <Card pad={false}><div className="grid gap-3 border-b border-black/10 p-4 md:grid-cols-5"><SearchBox value={q} onChange={setQ} placeholder="Action, record or reason" className="md:col-span-2" />
        <Select aria-label="Staff" value={who} onChange={(e) => setWho(e.target.value)}><option value="">All staff</option>{db.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
        <Input type="date" aria-label="From" value={from} onChange={(e) => setFrom(e.target.value)} /><Input type="date" aria-label="To" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <DataTable rows={rows} cols={cols} rowKey={(a) => a.id} pageSize={15} initialSort={{ key: "t", dir: -1 }} empty={<Empty title="No log entries match" />} /></Card>
    </>
  );
}
