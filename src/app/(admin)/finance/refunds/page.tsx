"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useDB, useStore } from "@/store/store";
import type { Refund } from "@/types";
import { Badge, Button, Card, Confirm, DataTable, Empty, Field, Input, KV, Modal, Notice, PageHeader, Select, Tabs, Textarea, useAct, type Col } from "@/components/ui";
import { fmtDT, money } from "@/lib/utils";

const TONE = { Requested: "amber", Approved: "blue", Rejected: "red", Completed: "green" } as const;
export default function Refunds() {
  const db = useDB(); const { can, user, requestRefund, decideRefund, completeRefund } = useStore(); const act = useAct();
  const [tab, setTab] = useState<"requests" | "payout" | "history">("requests"); const [sel, setSel] = useState<string | null>(null); const [dlg, setDlg] = useState<"" | "reject">(""); const [nr, setNr] = useState<null | { paymentId: string; amount: number; reason: string }>(null);
  const who = (id: string) => db.staff.find((s) => s.id === id)?.name ?? id;
  const ref = (f: Refund) => (f.kind === "hotel" ? db.reservations.find((x) => x.id === f.refId) : db.orders.find((o) => o.id === f.refId))?.ref ?? f.refId;
  const list = db.refunds.filter((f) => (tab === "requests" ? f.status === "Requested" : tab === "payout" ? f.status === "Approved" : ["Completed", "Rejected"].includes(f.status)));
  const f = db.refunds.find((x) => x.id === sel);
  const refundable = (pid: string, amt: number) => amt - db.refunds.filter((x) => x.paymentId === pid && x.status !== "Rejected").reduce((s, x) => s + x.amount, 0);
  const options = useMemo(() => db.payments.filter((p) => p.amount > 0 && refundable(p.id, p.amount) > 0).sort((a, b) => b.at.localeCompare(a.at)), [db]); // eslint-disable-line react-hooks/exhaustive-deps
  const cols: Col<Refund>[] = [
    { key: "t", header: "Requested", cell: (x) => fmtDT(x.at), sort: (x) => x.at }, { key: "r", header: "Reference", cell: (x) => <><span className="font-medium">{ref(x)}</span><span className="block text-xs text-muted">{x.kind === "hotel" ? "Hotel booking" : "Lounge order"}</span></> },
    { key: "w", header: "By", cell: (x) => who(x.requestedBy), hideBelow: "md" }, { key: "a", header: "Amount", cell: (x) => money(x.amount), className: "text-right", sort: (x) => x.amount }, { key: "s", header: "Status", cell: (x) => <Badge tone={TONE[x.status]}>{x.status}</Badge> },
  ];
  const orig = f ? db.payments.find((p) => p.id === f.paymentId) : null;
  return (
    <>
      <PageHeader title="Refunds" sub="Every refund points to the original payment, needs approval from a different person, and is then paid out." actions={can(["payments.record", "refunds.approve", "refunds.process"]) ? <Button variant="gold" onClick={() => setNr({ paymentId: "", amount: 0, reason: "" })}><Plus size={15} />New refund request</Button> : undefined} />
      <Card pad={false}><div className="px-4"><Tabs value={tab} onChange={setTab} tabs={[{ value: "requests", label: "Awaiting approval", count: db.refunds.filter((x) => x.status === "Requested").length }, { value: "payout", label: "Approved, to pay out", count: db.refunds.filter((x) => x.status === "Approved").length }, { value: "history", label: "History" }]} /></div>
        <DataTable rows={list} cols={cols} rowKey={(x) => x.id} onRow={(x) => setSel(x.id)} initialSort={{ key: "t", dir: -1 }} empty={<Empty title="Nothing here" hint="Cancelling a paid reservation creates a refund request automatically." />} /></Card>
      <Modal open={!!f} onClose={() => setSel(null)} title={f ? `Refund · ${ref(f)}` : ""} width="max-w-md" footer={f && <>
        {f.status === "Requested" && can("refunds.approve") && <><Button variant="danger" onClick={() => setDlg("reject")}>Reject</Button><Button variant="gold" onClick={() => { if (act(decideRefund(f.id, "Approved", ""), "Refund approved")) setSel(null); }}>Approve</Button></>}
        {f.status === "Approved" && can("refunds.process") && <Button variant="gold" onClick={() => { if (act(completeRefund(f.id), "Refund paid out and recorded")) setSel(null); }}>Record payout</Button>}</>}>
        {f && <div className="space-y-4"><Badge tone={TONE[f.status]}>{f.status}</Badge><dl><KV k="Amount" v={<b>{money(f.amount)}</b>} /><KV k="Reason" v={f.reason} /><KV k="Original payment" v={orig ? `${orig.method} · ${money(orig.amount)} · ${fmtDT(orig.at)}` : "—"} /><KV k="Requested by" v={who(f.requestedBy)} />{f.reviewedBy && <KV k="Decided by" v={who(f.reviewedBy)} />}{f.reviewNote && <KV k="Decision note" v={f.reviewNote} />}{f.completedBy && <KV k="Paid out by" v={`${who(f.completedBy)} · ${fmtDT(f.completedAt!)}`} />}</dl>
          {f.kind === "hotel" && <Link href={`/reservations/${f.refId}`} className="text-sm underline decoration-gold underline-offset-4">Open the booking</Link>}
          {f.status === "Requested" && f.requestedBy === user?.id && <Notice tone="info">You raised this, so someone else must approve it.</Notice>}
          {f.status === "Requested" && !can("refunds.approve") && <Notice tone="info">Waiting for someone with refund approval permission.</Notice>}</div>}
      </Modal>
      <Confirm open={dlg === "reject"} onClose={() => setDlg("")} danger title="Reject this refund?" confirmLabel="Reject" reasonLabel="Reason" message={<p>The reservation (if any) returns to Cancelled with no refund.</p>} onConfirm={(r) => { if (f && act(decideRefund(f.id, "Rejected", r), "Refund rejected")) { setDlg(""); setSel(null); } }} />
      <Modal open={!!nr} onClose={() => setNr(null)} title="New refund request" width="max-w-lg" footer={<><Button onClick={() => setNr(null)}>Cancel</Button><Button variant="gold" onClick={() => { if (nr && act(requestRefund(nr.paymentId, Number(nr.amount), nr.reason), "Refund request submitted")) setNr(null); }}>Submit request</Button></>}>
        {nr && <div className="space-y-4"><Field label="Original payment" hint="Refunds must reference a recorded payment."><Select value={nr.paymentId} onChange={(e) => { const p = db.payments.find((x) => x.id === e.target.value); setNr({ ...nr, paymentId: e.target.value, amount: p ? refundable(p.id, p.amount) : 0 }); }}><option value="">Choose a payment</option>{options.map((p) => <option key={p.id} value={p.id}>{(p.kind === "hotel" ? db.reservations.find((r) => r.id === p.refId)?.ref : db.orders.find((o) => o.id === p.refId)?.ref) ?? p.refId} · {p.kind === "hotel" ? "Hotel" : "Lounge"} · {p.method} · {money(refundable(p.id, p.amount))} refundable</option>)}</Select></Field>
          <Field label="Refund amount (₦)"><Input type="number" min={0} value={nr.amount || ""} onChange={(e) => setNr({ ...nr, amount: Number(e.target.value) })} /></Field><Field label="Reason"><Textarea value={nr.reason} onChange={(e) => setNr({ ...nr, reason: e.target.value })} /></Field></div>}
      </Modal>
    </>
  );
}
