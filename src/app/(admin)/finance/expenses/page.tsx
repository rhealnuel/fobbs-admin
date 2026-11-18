"use client";
import { useMemo, useState } from "react";
import { Download, Plus } from "lucide-react";
import { useDB, useStore } from "@/store/store";
import type { Expense, PayMethod } from "@/types";
import { Badge, Button, Card, Confirm, DataTable, Drawer, Empty, Field, Input, KV, Modal, Notice, PageHeader, Select, Stat, Textarea, useAct, type Col } from "@/components/ui";
import { PAY_METHODS } from "@/components/hotel";
import { downloadCSV, fmtDT, localDay, money } from "@/lib/utils";

const TONE = { Pending: "amber", Approved: "green", Rejected: "red" } as const;
export default function Expenses() {
  const db = useDB(); const { can, user, addExpense, reviewExpense } = useStore(); const act = useAct();
  const [cat, setCat] = useState(""); const [st, setSt] = useState(""); const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [sel, setSel] = useState<string | null>(null); const [dlg, setDlg] = useState<"" | "reject">("");
  const [f, setF] = useState<null | { category: string; amount: number; description: string; method: PayMethod; receipt: string }>(null);
  const who = (id: string) => db.staff.find((s) => s.id === id)?.name ?? id; const approver = can("reports.financial");
  const rows = useMemo(() => db.expenses.filter((e) => (!cat || e.category === cat) && (!st || e.status === st) && (!from || localDay(e.at) >= from) && (!to || localDay(e.at) <= to)), [db, cat, st, from, to]);
  const e = db.expenses.find((x) => x.id === sel); const tot = (s: string) => db.expenses.filter((x) => x.status === s).reduce((a, x) => a + x.amount, 0);
  const cols: Col<Expense>[] = [
    { key: "t", header: "Date", cell: (x) => fmtDT(x.at), sort: (x) => x.at }, { key: "c", header: "Category", cell: (x) => <><p className="font-medium">{x.category}</p><p className="text-xs text-muted">{x.description}</p></>, sort: (x) => x.category },
    { key: "w", header: "Recorded by", cell: (x) => who(x.staffId), hideBelow: "lg" }, { key: "m", header: "Method", cell: (x) => x.method, hideBelow: "md" }, { key: "a", header: "Amount", cell: (x) => money(x.amount), sort: (x) => x.amount, className: "text-right" },
    { key: "s", header: "Status", cell: (x) => <Badge tone={TONE[x.status]}>{x.status}</Badge> },
  ];
  return (
    <>
      <PageHeader title="Expenses" sub="Record spending with its receipt and submit it for approval." actions={<><Button onClick={() => downloadCSV("expenses.csv", [["Date", "Category", "Description", "Amount", "Method", "Recorded by", "Status"], ...rows.map((x) => [x.at, x.category, x.description, x.amount, x.method, who(x.staffId), x.status])])}><Download size={15} />Export CSV</Button><Button variant="gold" onClick={() => setF({ category: db.settings.expenseCategories[0], amount: 0, description: "", method: "Cash", receipt: "" })}><Plus size={15} />Record expense</Button></>} />
      <div className="mb-4 grid grid-cols-3 gap-3"><Stat label="Awaiting approval" value={money(tot("Pending"))} tone={tot("Pending") ? "gold" : undefined} /><Stat label="Approved" value={money(tot("Approved"))} /><Stat label="Rejected" value={money(tot("Rejected"))} /></div>
      <Card pad={false}><div className="grid gap-3 border-b border-black/10 p-4 md:grid-cols-4"><Select aria-label="Category" value={cat} onChange={(x) => setCat(x.target.value)}><option value="">All categories</option>{db.settings.expenseCategories.map((c) => <option key={c}>{c}</option>)}</Select><Select aria-label="Status" value={st} onChange={(x) => setSt(x.target.value)}><option value="">All statuses</option><option>Pending</option><option>Approved</option><option>Rejected</option></Select><Input type="date" aria-label="From" value={from} onChange={(x) => setFrom(x.target.value)} /><Input type="date" aria-label="To" value={to} onChange={(x) => setTo(x.target.value)} /></div>
        <DataTable rows={rows} cols={cols} rowKey={(x) => x.id} onRow={(x) => setSel(x.id)} initialSort={{ key: "t", dir: -1 }} empty={<Empty title="No expenses recorded" />} /></Card>
      <Drawer open={!!e} onClose={() => setSel(null)} title={e?.category ?? ""} footer={e && e.status === "Pending" && approver && <><Button variant="danger" onClick={() => setDlg("reject")}>Reject</Button><Button variant="gold" onClick={() => { if (act(reviewExpense(e.id, "Approved", ""), "Expense approved")) setSel(null); }}>Approve</Button></>}>
        {e && <div className="space-y-4"><Badge tone={TONE[e.status]}>{e.status}</Badge><p>{e.description}</p><dl><KV k="Amount" v={<b>{money(e.amount)}</b>} /><KV k="Payment method" v={e.method} /><KV k="Recorded by" v={who(e.staffId)} /><KV k="Date" v={fmtDT(e.at)} /><KV k="Receipt" v={e.receipt ?? "None attached"} />{e.reviewedBy && <KV k="Reviewed by" v={who(e.reviewedBy)} />}{e.reviewNote && <KV k="Review note" v={e.reviewNote} />}</dl>{e.status === "Pending" && e.staffId === user?.id && <Notice tone="info">A different person must approve an expense you recorded.</Notice>}</div>}
      </Drawer>
      <Confirm open={dlg === "reject"} onClose={() => setDlg("")} danger title="Reject this expense?" confirmLabel="Reject" reasonLabel="Reason" message={<p>The person who recorded it will see your reason.</p>} onConfirm={(r) => { if (e && act(reviewExpense(e.id, "Rejected", r), "Expense rejected")) { setDlg(""); setSel(null); } }} />
      <Modal open={!!f} onClose={() => setF(null)} title="Record expense" footer={<><Button onClick={() => setF(null)}>Cancel</Button><Button variant="gold" onClick={() => { if (f && act(addExpense({ ...f, receipt: f.receipt || undefined }), "Submitted for approval")) setF(null); }}>Submit for approval</Button></>}>
        {f && <div className="grid gap-4 md:grid-cols-2"><Field label="Category"><Select value={f.category} onChange={(x) => setF({ ...f, category: x.target.value })}>{db.settings.expenseCategories.map((c) => <option key={c}>{c}</option>)}</Select></Field><Field label="Amount (₦)"><Input type="number" min={0} value={f.amount || ""} onChange={(x) => setF({ ...f, amount: Number(x.target.value) })} /></Field>
          <Field label="Description" className="md:col-span-2"><Textarea value={f.description} onChange={(x) => setF({ ...f, description: x.target.value })} /></Field><Field label="Paid by"><Select value={f.method} onChange={(x) => setF({ ...f, method: x.target.value as PayMethod })}>{PAY_METHODS.map((m) => <option key={m}>{m}</option>)}</Select></Field>
          <Field label="Supporting receipt" hint="Only the file name is kept in this prototype; real upload arrives with the backend."><Input type="file" accept="image/*,.pdf" onChange={(x) => setF({ ...f, receipt: x.target.files?.[0]?.name ?? "" })} /></Field></div>}
      </Modal>
    </>
  );
}
