"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useDB, useStore } from "@/store/store";
import { Badge, Button, Card, DataTable, Drawer, Empty, Field, Input, Modal, Notice, PageHeader, Select, Tabs, Textarea, useAct, type Col } from "@/components/ui";
import { ago, fmtDT } from "@/lib/utils";
import type { Maintenance, MaintStatus } from "@/types";

const FLOW: MaintStatus[] = ["Reported", "Assigned", "In Progress", "Resolved", "Closed"];
export default function MaintenancePage() {
  const db = useDB(); const { can, createMaintenance, updateMaintenance } = useStore(); const act = useAct();
  const [tab, setTab] = useState<"open" | "done">("open"); const [sel, setSel] = useState<string | null>(null); const [form, setForm] = useState<null | { roomId: string; facility: string; issue: string; priority: Maintenance["priority"] }>(null); const [resolution, setResolution] = useState("");
  const manage = can("maintenance.manage"); const open = db.maintenance.filter((m) => !["Resolved", "Closed"].includes(m.status)); const done = db.maintenance.filter((m) => ["Resolved", "Closed"].includes(m.status));
  const m = db.maintenance.find((x) => x.id === sel); const who = (id: string | null) => db.staff.find((s) => s.id === id)?.name ?? "Unassigned";
  const cols: Col<Maintenance>[] = [
    { key: "f", header: "Location", cell: (r) => <span className="font-medium">{r.facility}</span>, sort: (r) => r.facility }, { key: "i", header: "Issue", cell: (r) => r.issue },
    { key: "p", header: "Priority", cell: (r) => <Badge>{r.priority}</Badge>, sort: (r) => ["Urgent", "High", "Medium", "Low"].indexOf(r.priority) }, { key: "s", header: "Status", cell: (r) => <Badge>{r.status}</Badge> },
    { key: "a", header: "Assigned", cell: (r) => who(r.assignedTo), hideBelow: "md" }, { key: "t", header: "Reported", cell: (r) => ago(r.at), sort: (r) => r.at, hideBelow: "lg" },
  ];
  const next = m ? FLOW[FLOW.indexOf(m.status) + 1] : undefined;
  return (
    <>
      <PageHeader title="Maintenance" sub="Rooms with open maintenance are held out of inventory." actions={manage || can("housekeeping.update") ? <Button variant="gold" onClick={() => setForm({ roomId: "", facility: "", issue: "", priority: "Medium" })}><Plus size={15} />New request</Button> : undefined} />
      <Card pad={false}><div className="px-4"><Tabs value={tab} onChange={setTab} tabs={[{ value: "open", label: "Open", count: open.length }, { value: "done", label: "Resolved & closed", count: done.length }]} /></div>
        <DataTable rows={tab === "open" ? open : done} cols={cols} rowKey={(r) => r.id} onRow={(r) => setSel(r.id)} initialSort={{ key: "p", dir: 1 }} empty={<Empty title={tab === "open" ? "No open requests" : "Nothing resolved yet"} />} /></Card>
      <Drawer open={!!m} onClose={() => setSel(null)} title={m?.facility ?? ""} footer={m && manage && next && <Button variant="gold" onClick={() => { if (act(updateMaintenance(m.id, { status: next }, resolution), `Marked ${next}`)) setResolution(""); }}>Mark {next}</Button>}>
        {m && <div className="space-y-4"><div className="flex gap-2"><Badge>{m.status}</Badge><Badge>{m.priority}</Badge></div><p>{m.issue}</p><p className="text-sm text-muted">Reported by {who(m.reportedBy)} · {fmtDT(m.at)}</p>
          {manage && !["Resolved", "Closed"].includes(m.status) && <Field label="Assigned to"><Select value={m.assignedTo ?? ""} onChange={(e) => act(updateMaintenance(m.id, { assignedTo: e.target.value || null }), "Assignment saved")}><option value="">Unassigned</option>{db.staff.filter((s) => ["maintenance", "housekeeping", "hk_supervisor"].includes(s.roleId)).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>}
          {manage && next === "Resolved" && <Field label="Resolution notes"><Textarea value={resolution} onChange={(e) => setResolution(e.target.value)} /></Field>}
          {m.roomId && !["Resolved", "Closed"].includes(m.status) && <Notice tone="warn">Room {db.rooms.find((r) => r.id === m.roomId)?.number} cannot be made available until this is resolved.</Notice>}
          <div><p className="mb-2 font-serif text-lg">Progress</p><ol className="space-y-2 text-sm">{[...m.log].reverse().map((l, i) => <li key={i} className="border-l-2 border-gold/60 pl-3"><p>{l.text}</p><p className="text-xs text-muted">{who(l.by)} · {fmtDT(l.at)}</p></li>)}</ol></div>
          <p className="text-xs text-muted">Photo attachments need file storage and arrive with the backend.</p></div>}
      </Drawer>
      <Modal open={!!form} onClose={() => setForm(null)} title="New maintenance request" width="max-w-md" footer={<><Button onClick={() => setForm(null)}>Cancel</Button><Button variant="gold" onClick={() => { if (form && act(createMaintenance(form), "Request created")) setForm(null); }}>Create request</Button></>}>
        {form && <div className="space-y-4"><Field label="Room"><Select value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value })}><option value="">Not a room (facility)</option>{db.rooms.map((r) => <option key={r.id} value={r.id}>Room {r.number}</option>)}</Select></Field>
          {!form.roomId && <Field label="Facility"><Input value={form.facility} onChange={(e) => setForm({ ...form, facility: e.target.value })} placeholder="e.g. Reception, parking, generator" /></Field>}
          <Field label="Describe the issue"><Textarea value={form.issue} onChange={(e) => setForm({ ...form, issue: e.target.value })} /></Field>
          <Field label="Priority"><Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Maintenance["priority"] })}>{["Low", "Medium", "High", "Urgent"].map((p) => <option key={p}>{p}</option>)}</Select></Field></div>}
      </Modal>
    </>
  );
}
