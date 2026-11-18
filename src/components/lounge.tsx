"use client";
import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { useDB, useStore } from "@/store/store";
import type { Order, PayMethod } from "@/types";
import { Badge, Button, Confirm, Drawer, Field, Input, KV, Modal, Notice, Select, Textarea, useAct } from "@/components/ui";
import { fmtDT, money } from "@/lib/utils";
import { orderBalance, orderGross, orderPaid, orderPayStatus, orderTotal } from "@/lib/calc";
import { PAY_METHODS } from "@/components/hotel";

export const FLOW = ["Submitted", "Accepted", "Preparing", "Ready", "Served"] as const;
export const NEXT_LABEL: Record<string, string> = { Submitted: "Accept", Accepted: "Start preparing", Preparing: "Mark ready", Ready: "Mark served" };

export function OrderDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const db = useDB(); const { can, advanceOrder, cancelOrder, applyDiscount, payOrder, verifyPayment } = useStore(); const act = useAct();
  const o = db.orders.find((x) => x.id === id) ?? null; const [dlg, setDlg] = useState<"" | "pay" | "cancel" | "disc">("");
  const [amt, setAmt] = useState(0); const [m, setM] = useState<PayMethod>("Cash"); const [ref, setRef] = useState(""); const [d, setD] = useState(0); const [why, setWhy] = useState("");
  useEffect(() => { setDlg(""); }, [id]);
  const who = (s: string) => db.staff.find((x) => x.id === s)?.name ?? s;
  if (!o) return <Drawer open={false} onClose={onClose} title="" children={null} />;
  const bal = orderBalance(db, o); const pays = db.payments.filter((p) => p.refId === o.id); const closed = ["Cancelled", "Completed"].includes(o.status);
  const next = ({ Submitted: "Accepted", Accepted: "Preparing", Preparing: "Ready", Ready: "Served" } as Record<string, Order["status"]>)[o.status];
  return (
    <>
      <Drawer open={!!o} onClose={onClose} title={o.ref} footer={<><Button onClick={() => window.print()}><Printer size={15} />Print receipt</Button>{can("payments.record") && bal > 0 && !["Draft"].includes(o.status) && <Button variant="gold" onClick={() => { setAmt(bal); setM("Cash"); setRef(""); setDlg("pay"); }}>Record payment</Button>}</>}>
        <div className="print-area space-y-5">
          <div className="hidden print:block"><p className="font-serif text-xl">{db.settings.loungeName}</p><p className="text-sm">Receipt {o.ref}</p><p className="text-xs">{db.settings.receiptFooter}</p></div>
          <div className="flex flex-wrap gap-2"><Badge>{o.status}</Badge><Badge>{orderPayStatus(db, o)}</Badge><Badge tone="grey">{o.type}</Badge></div>
          <dl><KV k="Waiter" v={who(o.waiterId)} /><KV k="Table" v={o.table ?? "—"} /><KV k="Customer" v={o.customer || "—"} /><KV k="Placed" v={fmtDT(o.at)} />{o.note && <KV k="Order note" v={o.note} />}{o.cancelReason && <KV k="Cancelled because" v={o.cancelReason} />}</dl>
          <table className="w-full text-sm"><thead><tr className="border-b border-black/10 text-left text-xs uppercase text-muted"><th className="py-1.5">Item</th><th className="text-right">Qty</th><th className="text-right">Price</th><th className="text-right">Amount</th></tr></thead><tbody>{o.items.map((i, k) => <tr key={k} className="border-b border-black/[.06]"><td className="py-2">{i.name}</td><td className="text-right">{i.qty}</td><td className="text-right">{money(i.price)}</td><td className="text-right">{money(i.price * i.qty)}</td></tr>)}</tbody></table>
          <dl><KV k="Subtotal" v={money(orderGross(o))} />{o.discount > 0 && <KV k={`Discount${o.discountReason ? ` (${o.discountReason})` : ""}`} v={`−${money(o.discount)}`} />}<KV k="Total" v={<b>{money(orderTotal(o))}</b>} /><KV k="Paid" v={money(orderPaid(db, o))} /><KV k="Balance" v={<b className={bal > 0 ? "text-[#9b2c2c]" : ""}>{money(bal)}</b>} /></dl>
          {pays.length > 0 && <div><p className="mb-1 font-serif text-lg">Payments</p>{pays.map((p) => <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-black/[.06] py-2 text-sm"><span>{p.method} · {who(p.staffId)}<span className="block text-xs text-muted">{fmtDT(p.at)}{p.note ? ` · ref ${p.note}` : ""}</span></span><span className="flex items-center gap-2">{!p.verified && (can("recon.settle") || can("recon.review") ? <Button size="sm" onClick={() => act(verifyPayment(p.id), "Transfer verified")}>Verify transfer</Button> : <Badge tone="amber">Awaiting verification</Badge>)}<b>{money(p.amount)}</b></span></div>)}</div>}
          <div className="no-print flex flex-wrap gap-2">{next && can("bar.process") || (next === "Served" && can("pos.create")) ? <Button onClick={() => act(advanceOrder(o.id), `Order ${next}`)}>{NEXT_LABEL[o.status]}</Button> : null}
            {!closed && o.status !== "Draft" && can("pos.discount") && <Button onClick={() => { setD(o.discount); setWhy(o.discountReason ?? ""); setDlg("disc"); }}>Apply discount</Button>}
            {!closed && can("pos.cancel") && <Button variant="danger" onClick={() => setDlg("cancel")}>Cancel order</Button>}</div>
          {!closed && !can("pos.cancel") && <p className="no-print text-xs text-muted">Submitted orders cannot be edited or removed by waiters. Ask a manager to amend or cancel.</p>}
          <div><p className="mb-1 font-serif text-lg">Order history</p><ol className="space-y-1.5 text-sm">{o.history.map((h, i) => <li key={i} className="border-l-2 border-gold/60 pl-3">{h.text}<span className="block text-xs text-muted">{who(h.by)} · {fmtDT(h.at)}</span></li>)}</ol></div>
        </div>
      </Drawer>
      <Modal open={dlg === "pay"} onClose={() => setDlg("")} title={`Payment · ${o.ref}`} width="max-w-md" footer={<><Button onClick={() => setDlg("")}>Cancel</Button><Button variant="gold" onClick={() => { if (act(payOrder(o.id, Number(amt), m, ref), "Payment recorded")) setDlg(""); }}>Record</Button></>}>
        <div className="space-y-4"><KV k="Balance due" v={<b>{money(bal)}</b>} /><Field label="Method"><Select value={m} onChange={(e) => setM(e.target.value as PayMethod)}>{PAY_METHODS.map((x) => <option key={x}>{x}</option>)}</Select></Field><Field label="Amount (₦)" hint="Enter less than the balance for a part payment."><Input type="number" min={0} value={amt || ""} onChange={(e) => setAmt(Number(e.target.value))} /></Field>
          {m === "Bank transfer" && <><Field label="Transfer reference"><Input value={ref} onChange={(e) => setRef(e.target.value)} /></Field><Notice tone="warn">A transfer is not counted as settled until it is verified. A customer or waiter saying it was sent is not evidence.</Notice></>}</div>
      </Modal>
      <Modal open={dlg === "disc"} onClose={() => setDlg("")} title="Apply discount" width="max-w-md" footer={<><Button onClick={() => setDlg("")}>Cancel</Button><Button variant="gold" onClick={() => { if (act(applyDiscount(o.id, Number(d), why), "Discount applied and logged")) setDlg(""); }}>Apply</Button></>}>
        <div className="space-y-4"><Field label="Discount amount (₦)"><Input type="number" min={0} value={d || ""} onChange={(e) => setD(Number(e.target.value))} /></Field><Field label="Reason"><Textarea value={why} onChange={(e) => setWhy(e.target.value)} /></Field></div>
      </Modal>
      <Confirm open={dlg === "cancel"} onClose={() => setDlg("")} danger title={`Cancel ${o.ref}?`} confirmLabel="Cancel order" reasonLabel="Reason for cancelling" message={<p>{o.status === "Served" ? "This order was already served, so stock is not returned automatically." : "Items go back into stock."} The cancellation is recorded against your name.</p>} onConfirm={(r) => { if (act(cancelOrder(o.id, r), "Order cancelled")) setDlg(""); }} />
    </>
  );
}
