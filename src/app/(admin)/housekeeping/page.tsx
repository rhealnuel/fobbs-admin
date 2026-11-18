"use client";
import { useState } from "react";
import { useDB, useStore } from "@/store/store";
import { Badge, Button, Card, Empty, Field, Modal, PageHeader, Select, Stat, Textarea, useAct } from "@/components/ui";
import { fmtDT } from "@/lib/utils";
import type { HkStatus, Room } from "@/types";

const COLS: { hk: HkStatus; next?: HkStatus; verb?: string }[] = [
  { hk: "Dirty", next: "Cleaning in Progress", verb: "Start cleaning" }, { hk: "Cleaning in Progress", next: "Awaiting Inspection", verb: "Submit for inspection" },
  { hk: "Awaiting Inspection", next: "Clean / Ready", verb: "Approve & release" }, { hk: "Clean / Ready" },
];
export default function Housekeeping() {
  const db = useDB(); const { can, hkAdvance, createMaintenance } = useStore(); const act = useAct();
  const [issue, setIssue] = useState<null | { roomId: string; text: string; kind: string }>(null); const [reject, setReject] = useState<Room | null>(null); const [why, setWhy] = useState("");
  const needing = db.rooms.filter((r) => r.active && r.hk !== "Clean / Ready"); const ready = db.rooms.filter((r) => r.active && r.hk === "Clean / Ready" && r.status === "Available");
  const lastChange = (r: Room) => r.history[0]?.at ?? ""; const overdue = (r: Room) => r.hk === "Dirty" && lastChange(r) && Date.now() - Date.parse(lastChange(r)) > 3 * 3600e3;
  const cat = (id: string) => db.categories.find((c) => c.id === id)?.name;
  return (
    <>
      <PageHeader title="Housekeeping" sub="A checked-out room is not sellable until it has been cleaned, inspected and released." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5"><Stat label="Need cleaning" value={needing.filter((r) => r.hk === "Dirty").length} tone={needing.some((r) => r.hk === "Dirty") ? "gold" : undefined} /><Stat label="Being cleaned" value={needing.filter((r) => r.hk === "Cleaning in Progress").length} /><Stat label="Awaiting inspection" value={needing.filter((r) => r.hk === "Awaiting Inspection").length} /><Stat label="Ready for guests" value={ready.length} /><Stat label="Overdue" value={needing.filter(overdue).length} tone={needing.some(overdue) ? "red" : undefined} sub="Dirty for 3+ hours" /></div>
      <div className="mt-5 grid gap-4 lg:grid-cols-4">
        {COLS.map((c) => { const rooms = c.hk === "Clean / Ready" ? ready : needing.filter((r) => r.hk === c.hk); return (
          <section key={c.hk} className="border border-black/10 bg-cream/40"><h2 className="flex items-center justify-between border-b border-black/10 bg-white px-3 py-2.5 text-sm font-semibold">{c.hk}<span className="bg-black/[.07] px-1.5 text-xs">{rooms.length}</span></h2>
            <div className="space-y-2 p-2">{rooms.map((r) => (
              <div key={r.id} className="border border-black/10 bg-white p-3"><div className="flex items-center justify-between"><p className="font-serif text-xl">Room {r.number}</p>{overdue(r) && <Badge tone="red">Overdue</Badge>}{r.status === "Occupied" && <Badge>Occupied</Badge>}</div><p className="text-xs text-muted">{cat(r.categoryId)} · {r.floor} floor</p>{r.notes && <p className="mt-1 text-xs">{r.notes}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {c.next && (c.next === "Clean / Ready" ? can("housekeeping.inspect") : can("housekeeping.update")) && <Button size="sm" variant="gold" onClick={() => act(hkAdvance(r.id, c.next!), `Room ${r.number}: ${c.next}`)}>{c.verb}</Button>}
                  {c.hk === "Awaiting Inspection" && can("housekeeping.inspect") && <Button size="sm" onClick={() => { setReject(r); setWhy(""); }}>Send back</Button>}
                  {can("housekeeping.update") && <Button size="sm" onClick={() => setIssue({ roomId: r.id, text: "", kind: "Damaged item" })}>Report issue</Button>}</div></div>))}
              {!rooms.length && <p className="px-2 py-6 text-center text-xs text-muted">None</p>}</div></section>); })}
      </div>
      {!needing.length && <Card className="mt-5"><Empty title="Every room is clean" hint="Rooms appear here after check-out." /></Card>}
      <Modal open={!!issue} onClose={() => setIssue(null)} title={issue ? `Report issue · Room ${db.rooms.find((r) => r.id === issue.roomId)?.number}` : ""} width="max-w-md" footer={<><Button onClick={() => setIssue(null)}>Cancel</Button><Button variant="gold" onClick={() => { if (issue && act(createMaintenance({ roomId: issue.roomId, facility: "", issue: `${issue.kind}: ${issue.text}`, priority: "Medium" }), "Maintenance request submitted")) setIssue(null); }}>Submit request</Button></>}>
        {issue && <div className="space-y-4"><Field label="Type"><Select value={issue.kind} onChange={(e) => setIssue({ ...issue, kind: e.target.value })}>{["Damaged item", "Missing item", "Maintenance needed"].map((k) => <option key={k}>{k}</option>)}</Select></Field><Field label="Describe the issue"><Textarea value={issue.text} onChange={(e) => setIssue({ ...issue, text: e.target.value })} /></Field></div>}
      </Modal>
      <Modal open={!!reject} onClose={() => setReject(null)} title={`Send Room ${reject?.number} back`} width="max-w-md" footer={<><Button onClick={() => setReject(null)}>Cancel</Button><Button variant="gold" disabled={!why.trim()} onClick={() => { if (reject && act(hkAdvance(reject.id, "Dirty", why), "Room sent back for re-cleaning")) setReject(null); }}>Send back</Button></>}><Field label="What needs fixing?"><Textarea value={why} onChange={(e) => setWhy(e.target.value)} /></Field></Modal>
    </>
  );
}
