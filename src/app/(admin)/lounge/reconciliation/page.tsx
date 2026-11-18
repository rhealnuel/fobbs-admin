"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useDB, useStore } from "@/store/store";
import type { Shift } from "@/types";
import { Badge, Button, Card, Confirm, DataTable, Empty, Field, Input, Notice, PageHeader, Segmented, Tabs, Textarea, useAct, type Col } from "@/components/ui";
import { cn, fmtDT, money } from "@/lib/utils";
import { shiftSummary } from "@/lib/calc";

type Sum = ReturnType<typeof shiftSummary>;
const diffTone = (d: number) => (d === 0 ? "text-[#1f6a36]" : "text-[#9b2c2c]");
const diffText = (d: number) => (d === 0 ? "Matches" : d < 0 ? `Shortage ${money(-d)}` : `Surplus ${money(d)}`);

/** Expected vs actual comparison. Shortages are loud, matches are calm. */
function Compare({ sum, actual }: { sum: Sum; actual: { cash: number; transfer: number; pos: number } | null }) {
  const rows = [["Cash handed over", sum.cash, actual?.cash], ["Bank transfers", sum.transfer, actual?.transfer], ["POS / card settlements", sum.pos, actual?.pos]] as const;
  const totalExp = sum.collected, totalAct = actual ? actual.cash + actual.transfer + actual.pos : null;
  return (
    <div className="scroll-thin overflow-x-auto"><table className="w-full min-w-[480px] text-sm"><thead><tr className="border-b border-black/10 text-left text-xs uppercase text-muted"><th className="py-2">Collection</th><th className="text-right">Recorded by system</th><th className="text-right">Actual</th><th className="text-right">Difference</th></tr></thead>
      <tbody>{rows.map(([k, exp, act]) => { const d = act == null ? null : act - exp; return <tr key={k} className={cn("border-b border-black/[.07]", d != null && d !== 0 && "bg-[#fdf0ee]")}><td className="py-3">{k}</td><td className="text-right">{money(exp)}</td><td className="text-right">{act == null ? "—" : money(act)}</td><td className={cn("text-right font-semibold", d == null ? "" : diffTone(d))}>{d == null ? "—" : d === 0 ? "Matches" : `${d < 0 ? "−" : "+"}${money(Math.abs(d))}`}</td></tr>; })}
        <tr className="font-semibold"><td className="py-3">Total</td><td className="text-right">{money(totalExp)}</td><td className="text-right">{totalAct == null ? "—" : money(totalAct)}</td><td className={cn("text-right", totalAct == null ? "" : diffTone(totalAct - totalExp))}>{totalAct == null ? "—" : totalAct - totalExp === 0 ? "Matches" : `${totalAct - totalExp < 0 ? "−" : "+"}${money(Math.abs(totalAct - totalExp))}`}</td></tr></tbody></table></div>
  );
}
function Breakdown({ sum }: { sum: Sum }) {
  const rows: [string, number, boolean?][] = [["Orders", sum.orders], ["Gross sales", sum.gross], ["Discounts", -sum.discounts], ["Voids & cancellations", sum.voids], ["Net sales", sum.net, true], ["Outstanding customer tabs / unpaid", sum.outstanding]];
  return <dl className="text-sm">{rows.map(([k, v, b]) => <div key={k} className={cn("flex justify-between border-b border-black/[.07] py-2", b && "font-semibold")}><dt className={b ? "" : "text-muted"}>{k}</dt><dd>{k === "Orders" ? v : v < 0 ? `−${money(-v)}` : money(v)}</dd></div>)}</dl>;
}

export default function Reconciliation() {
  const db = useDB(); const { can } = useStore(); const mineOK = can("shift.own"), review = can("recon.review") || can("recon.settle") || can("recon.approve");
  const [mode, setMode] = useState<"mine" | "review">(review ? "review" : "mine");
  return (
    <>
      <PageHeader title="Shift Reconciliation" sub="Compare what the system recorded with what was actually collected. A difference is something to investigate, not a conclusion." actions={mineOK && review ? <Segmented value={mode} onChange={setMode} options={[{ value: "mine", label: "My shift" }, { value: "review", label: "Review" }]} /> : undefined} />
      {mode === "mine" && mineOK ? <MyShift /> : review ? <Review /> : <Empty title="Nothing to reconcile" />}
    </>
  );
}

function MyShift() {
  const db = useDB(); const { user, submitShift } = useStore(); const act = useAct();
  const shift = db.shifts.find((s) => s.staffId === user?.id && ["Open", "Rejected"].includes(s.status)) ?? null; const last = db.shifts.filter((s) => s.staffId === user?.id && !["Open", "Rejected"].includes(s.status)).sort((a, b) => b.start.localeCompare(a.start))[0];
  const [a, setA] = useState({ cash: "", transfer: "", pos: "" }); const [note, setNote] = useState(""); const [ok, setOk] = useState(false);
  useEffect(() => { setA({ cash: "", transfer: "", pos: "" }); setNote(""); }, [shift?.id]);
  if (!shift) return <Card>{last ? <><p className="mb-3 text-sm text-muted">No open shift. Your most recent shift:</p><div className="mb-4 flex items-center gap-2"><Badge>{last.status}</Badge><span className="text-sm">{fmtDT(last.start)}</span></div><Compare sum={shiftSummary(db, last.id)} actual={last.actual ?? null} />{last.managerNote && <div className="mt-4"><Notice tone="info">Manager note: {last.managerNote}</Notice></div>}</> : <Empty title="No shift to reconcile" hint="Start a shift, take orders, then come back here to close it." action={<Link href="/lounge/shifts" className="inline-flex h-10 items-center bg-gold px-4 text-sm font-semibold hover:bg-champagne">Go to Staff Shifts</Link>} />}</Card>;
  const sum = shiftSummary(db, shift.id); const filled = a.cash !== "" && a.transfer !== "" && a.pos !== ""; const act_ = { cash: Number(a.cash), transfer: Number(a.transfer), pos: Number(a.pos) };
  const cashDiff = filled ? act_.cash - sum.cash : 0;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-5">
        {shift.status === "Rejected" && <Notice tone="error">Your reconciliation was sent back. Manager note: <b>{shift.managerNote}</b>. Review and resubmit.</Notice>}
        <Card title="What the system recorded"><p className="mb-3 text-xs text-muted">Shift started {fmtDT(shift.start)} · opening float {money(shift.float)} (not part of sales)</p><Breakdown sum={sum} />
          {sum.unverified > 0 && <div className="mt-3"><Notice tone="warn">{sum.unverified} bank transfer{sum.unverified === 1 ? "" : "s"} ({money(sum.unverifiedAmount)}) are not verified yet. They will be checked against the bank statement before approval.</Notice></div>}</Card>
      </div>
      <Card title="What you actually collected">
        <div className="space-y-4"><Field label="Cash handed over (₦)"><Input type="number" min={0} value={a.cash} onChange={(e) => setA({ ...a, cash: e.target.value })} /></Field><Field label="Bank transfers received (₦)"><Input type="number" min={0} value={a.transfer} onChange={(e) => setA({ ...a, transfer: e.target.value })} /></Field><Field label="POS / card settlements (₦)"><Input type="number" min={0} value={a.pos} onChange={(e) => setA({ ...a, pos: e.target.value })} /></Field></div>
        {filled && <div className="mt-5 space-y-3"><Compare sum={sum} actual={act_} />{cashDiff !== 0 && <Notice tone="warn">{diffText(cashDiff)} in cash. Add a short explanation below. A difference is reviewed by the manager; it is not treated as theft or deducted automatically.</Notice>}</div>}
        <div className="mt-4"><Field label="Note for the manager" hint={cashDiff !== 0 ? "Recommended: explain the difference" : "Optional"}><Textarea value={note} onChange={(e) => setNote(e.target.value)} /></Field></div>
        <Button variant="gold" size="lg" className="mt-4 w-full" disabled={!filled} onClick={() => setOk(true)}>Submit reconciliation &amp; end shift</Button>
      </Card>
      <Confirm open={ok} onClose={() => setOk(false)} title="Submit and end your shift?" confirmLabel="Submit" message={<p>Your shift will close and go to the lounge manager for review. You cannot change the figures after submitting{filled && cashDiff !== 0 ? `, and the ${diffText(cashDiff).toLowerCase()} will be flagged for investigation` : ""}.</p>} onConfirm={() => { if (act(submitShift(shift.id, act_, note), "Reconciliation submitted")) setOk(false); }} />
    </div>
  );
}

function Review() {
  const db = useDB(); const { can, reviewShift, verifyPayment } = useStore(); const act = useAct();
  const [tab, setTab] = useState<"pending" | "flagged" | "approved" | "all">("pending"); const [sel, setSel] = useState<string | null>(null); const [dlg, setDlg] = useState<"" | "approve" | "reject" | "flag">(""); const [text, setText] = useState("");
  const name = (id: string) => db.staff.find((s) => s.id === id)?.name ?? id;
  const closed = db.shifts.filter((s) => s.status !== "Open"); const list = closed.filter((s) => tab === "all" || (tab === "pending" && s.status === "Submitted") || (tab === "flagged" && ["Flagged", "Rejected"].includes(s.status)) || (tab === "approved" && s.status === "Approved")).sort((a, b) => b.start.localeCompare(a.start));
  const s = db.shifts.find((x) => x.id === sel) ?? null; const sum = s ? shiftSummary(db, s.id) : null;
  useEffect(() => { if (!sel && list[0]) setSel(list[0].id); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps
  const cols: Col<Shift>[] = [
    { key: "w", header: "Staff", cell: (x) => <span className="font-medium">{name(x.staffId)}</span> },
    { key: "d", header: "Difference", cell: (x) => { if (!x.actual) return "—"; const sm = shiftSummary(db, x.id); const d = x.actual.cash + x.actual.transfer + x.actual.pos - sm.collected; return <span className={cn("font-semibold", diffTone(d))}>{d === 0 ? "Matches" : `${d < 0 ? "−" : "+"}${money(Math.abs(d))}`}</span>; } },
    { key: "s", header: "Status", cell: (x) => <Badge>{x.status}</Badge> },
  ];
  const pays = s ? db.payments.filter((p) => p.shiftId === s.id) : []; const orders = s ? db.orders.filter((o) => o.shiftId === s.id && o.status !== "Draft") : [];
  const act_ = s?.actual; const totalDiff = s && act_ && sum ? act_.cash + act_.transfer + act_.pos - sum.collected : 0;
  return (
    <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
      <Card pad={false}><div className="px-4"><Tabs value={tab} onChange={setTab} tabs={[{ value: "pending", label: "Pending", count: closed.filter((x) => x.status === "Submitted").length }, { value: "flagged", label: "Flagged", count: closed.filter((x) => ["Flagged", "Rejected"].includes(x.status)).length }, { value: "approved", label: "Approved" }, { value: "all", label: "All" }]} /></div>
        <DataTable rows={list} cols={cols} rowKey={(x) => x.id} onRow={(x) => setSel(x.id)} pageSize={8} empty={<Empty title="Nothing here" hint="Submitted shifts will appear for review." />} /></Card>
      {s && sum ? (
        <div className="space-y-5">
          <Card title={`${name(s.staffId)} · ${fmtDT(s.start)}`} action={<Badge>{s.status}</Badge>}>
            {act_ && <div className={cn("mb-4 flex flex-wrap items-baseline justify-between gap-2 border-l-4 p-3", totalDiff === 0 ? "border-[#1f6a36] bg-[#e6f2e8]" : "border-[#9b2c2c] bg-[#f8e3e1]")}><div><p className="text-xs uppercase text-muted">Overall result</p><p className={cn("font-serif text-3xl", diffTone(totalDiff))}>{diffText(totalDiff)}</p></div><p className="max-w-xs text-xs text-muted">Investigate before approving. A shortage is not automatically theft and must not be deducted from salary without due process.</p></div>}
            <Compare sum={sum} actual={act_ ?? null} />
            {s.staffNote && <p className="mt-3 border-l-2 border-gold pl-3 text-sm"><b className="font-medium">Staff note:</b> {s.staffNote}</p>}
            {s.managerNote && <p className="mt-2 border-l-2 border-black/30 pl-3 text-sm"><b className="font-medium">Review notes:</b> {s.managerNote}</p>}
          </Card>
          <div className="grid gap-5 xl:grid-cols-2"><Card title="Sales breakdown"><Breakdown sum={sum} /></Card>
            <Card title="Bank transfers to verify">{pays.filter((p) => p.method === "Bank transfer").length ? <ul className="divide-y divide-black/[.07] text-sm">{pays.filter((p) => p.method === "Bank transfer").map((p) => <li key={p.id} className="flex items-center justify-between gap-2 py-2"><span>{money(p.amount)}<span className="block text-xs text-muted">{db.orders.find((o) => o.id === p.refId)?.ref}{p.note ? ` · ref ${p.note}` : ""}</span></span>{p.verified ? <Badge tone="green">Verified</Badge> : (can("recon.settle") || can("recon.review")) ? <Button size="sm" variant="gold" onClick={() => act(verifyPayment(p.id), "Transfer verified against evidence")}>Verify</Button> : <Badge tone="amber">Unverified</Badge>}</li>)}</ul> : <p className="text-sm text-muted">No transfers on this shift.</p>}<p className="mt-3 text-xs text-muted">Verify only against the bank statement or other transaction evidence, never on someone's word.</p></Card></div>
          <Card title={`Orders (${orders.length})`} pad={false}><div className="scroll-thin max-h-64 overflow-y-auto"><table className="w-full text-sm"><tbody>{orders.map((o) => <tr key={o.id} className="border-b border-black/[.06]"><td className="px-4 py-2 font-medium">{o.ref}</td><td>{o.table ?? o.type}</td><td><Badge>{o.status}</Badge></td><td className="px-4 text-right">{money(o.items.reduce((a, i) => a + i.price * i.qty, 0) - o.discount)}</td></tr>)}</tbody></table></div></Card>
          {["Submitted", "Flagged"].includes(s.status) && <div className="flex flex-wrap gap-2">
            {can("recon.approve") && <Button variant="gold" onClick={() => { setText(""); setDlg("approve"); }}>Approve</Button>}{can("recon.review") && <><Button onClick={() => { setText(""); setDlg("flag"); }}>Flag for accountant</Button><Button variant="danger" onClick={() => { setText(""); setDlg("reject"); }}>Reject</Button></>}
            {sum.unverified > 0 && <p className="self-center text-xs text-[#8a5a00]">Verify {sum.unverified} transfer(s) before approving.</p>}</div>}
          {s.status === "Approved" && <Notice tone="ok">Approved and closed. Changes now need the authorised correction process and are audit-logged.</Notice>}
        </div>) : <Card><Empty title="Select a shift to review" /></Card>}
      <Confirm open={dlg !== ""} onClose={() => setDlg("")} title={dlg === "approve" ? "Approve reconciliation?" : dlg === "reject" ? "Reject reconciliation?" : "Flag for accountant review?"} danger={dlg === "reject"} confirmLabel={dlg === "approve" ? "Approve & close" : dlg === "reject" ? "Reject" : "Flag"} reasonLabel={dlg === "approve" ? "Investigation note (optional)" : "Reason"} optional={dlg === "approve"}
        message={<p>{dlg === "approve" ? "Approving closes the record. It cannot be edited afterwards without an audited correction." : dlg === "reject" ? "The shift returns to the staff member to review and resubmit." : "The accountant will see this shift in their review queue."}</p>}
        onConfirm={(r) => { if (s && act(reviewShift(s.id, dlg === "approve" ? "Approved" : dlg === "reject" ? "Rejected" : "Flagged", r || (dlg === "approve" ? "Approved after review" : "")), dlg === "approve" ? "Reconciliation approved" : dlg === "reject" ? "Sent back to staff" : "Flagged for accountant")) setDlg(""); }} />
    </div>
  );
}
