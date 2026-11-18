"use client";
import Link from "next/link";
import { useState } from "react";
import { useDB, useStore } from "@/store/store";
import { Button, Card, Empty, PageHeader, Segmented } from "@/components/ui";
import { ago, cn } from "@/lib/utils";

export default function Notifications() {
  const db = useDB(); const { can, markNotice } = useStore(); const [f, setF] = useState<"all" | "unread">("all");
  const list = db.notices.filter((n) => can(n.perm) && (f === "all" || !n.read));
  return (
    <>
      <PageHeader title="Notifications" sub="Only alerts relevant to your role are shown." actions={<><Segmented value={f} onChange={setF} options={[{ value: "all", label: "All" }, { value: "unread", label: "Unread" }]} /><Button onClick={() => markNotice()}>Mark all read</Button></>} />
      <Card pad={false}>{list.length ? <ul className="divide-y divide-black/[.07]">{list.map((n) => <li key={n.id}><Link href={n.href} onClick={() => markNotice(n.id)} className={cn("flex items-center justify-between gap-4 border-l-2 px-4 py-3.5 hover:bg-cream/50", n.read ? "border-transparent" : "border-gold bg-[#fffaf0]")}><span className={n.read ? "text-muted" : "font-medium"}>{n.text}</span><span className="shrink-0 text-xs text-muted">{ago(n.at)}</span></Link></li>)}</ul> : <Empty title={f === "unread" ? "You are all caught up" : "No notifications"} hint="New bookings, low stock and reconciliation alerts will appear here." />}</Card>
    </>
  );
}
