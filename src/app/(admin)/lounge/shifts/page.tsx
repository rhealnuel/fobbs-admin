"use client";
import Link from "next/link";
import { useState } from "react";
import { useDB, useStore } from "@/store/store";
import type { Shift } from "@/types";
import { Badge, Button, Card, DataTable, Empty, Field, Input, Notice, PageHeader, Stat, useAct, type Col } from "@/components/ui";
import { fmtDT, money } from "@/lib/utils";
import { shiftSummary } from "@/lib/calc";

export default function Shifts() {
  const db = useDB(); const { user, can, startShift } = useStore(); const act = useAct(); const [float, setFloat] = useState(0);
  const mine = db.shifts.find((s) => s.staffId === user?.id && s.status === "Open"); const sm = mine ? shiftSummary(db, mine.id) : null; const name = (id: string) => db.staff.find((s) => s.id === id)?.name ?? id;
  const seeAll = can("recon.review") || can("recon.settle"); const list = db.shifts.filter((s) => seeAll || s.staffId === user?.id);
  const cols: Col<Shift>[] = [
    { key: "w", header: "Staff", cell: (s) => name(s.staffId), sort: (s) => name(s.staffId) }, { key: "a", header: "Started", cell: (s) => fmtDT(s.start), sort: (s) => s.start }, { key: "e", header: "Ended", cell: (s) => (s.end ? fmtDT(s.end) : <Badge tone="blue">In progress</Badge>), hideBelow: "md" },
    { key: "o", header: "Orders", cell: (s) => shiftSummary(db, s.id).orders, className: "text-right" }, { key: "n", header: "Net sales", cell: (s) => money(shiftSummary(db, s.id).net), className: "text-right" }, { key: "s", header: "Status", cell: (s) => <Badge>{s.status}</Badge> },
  ];
  return (
    <>
      <PageHeader title="Staff Shifts" sub="Every order and payment is tied to a staff member and a shift. A shift must have a clear start and end." />
      {can("shift.own") && (mine && sm ? (
        <Card title="Your open shift" className="mb-5" action={<Link href="/lounge/reconciliation" className="inline-flex h-10 items-center bg-gold px-4 text-sm font-semibold hover:bg-champagne">Close shift &amp; reconcile</Link>}>
          <p className="mb-3 text-sm text-muted">Started {fmtDT(mine.start)} · opening float {money(mine.float)}</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5"><Stat label="Orders" value={sm.orders} /><Stat label="Net sales" value={money(sm.net)} /><Stat label="Cash" value={money(sm.cash)} /><Stat label="Transfers" value={money(sm.transfer)} /><Stat label="Card / POS" value={money(sm.pos)} /></div>
        </Card>
      ) : (
        <Card title="Start your shift" className="mb-5"><div className="flex flex-wrap items-end gap-3"><Field label="Opening cash float (₦)" hint="Enter 0 if you have no float"><Input type="number" min={0} className="w-56" value={float || ""} onChange={(e) => setFloat(Number(e.target.value))} /></Field><Button variant="gold" onClick={() => act(startShift(Number(float) || 0), "Shift started. You can now take orders.")}>Start shift</Button></div></Card>
      ))}
      {!can("shift.own") && <div className="mb-5"><Notice tone="info">Your role can view shifts but does not run its own.</Notice></div>}
      <Card title={seeAll ? "All shifts" : "Your shifts"} pad={false}><DataTable rows={list} cols={cols} rowKey={(s) => s.id} initialSort={{ key: "a", dir: -1 }} empty={<Empty title="No shifts yet" />} /></Card>
    </>
  );
}
