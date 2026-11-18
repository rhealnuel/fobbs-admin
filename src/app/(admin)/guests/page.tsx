"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { useDB, useStore } from "@/store/store";
import { Badge, Button, Card, DataTable, Drawer, Empty, Field, KV, PageHeader, SearchBox, Textarea, useAct, type Col } from "@/components/ui";
import { downloadCSV, fmtDate, money } from "@/lib/utils";
import { paidFor, resBalance } from "@/lib/calc";
import type { Guest } from "@/types";

export default function GuestsPage() { return <Suspense><Guests /></Suspense>; }
function Guests() {
  const db = useDB(); const { can, updateGuest } = useStore(); const act = useAct(); const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? ""); const [sel, setSel] = useState<string | null>(null); const [notes, setNotes] = useState(""); const [prefs, setPrefs] = useState("");
  const stats = (g: Guest) => { const rs = db.reservations.filter((r) => r.guestId === g.id); const live = rs.filter((r) => !["Cancelled", "No-show", "Refunded"].includes(r.status)); return { rs, stays: rs.filter((r) => ["Checked In", "Checked Out"].includes(r.status)).length, spent: rs.reduce((s, r) => s + paidFor(db, r.id), 0), owed: live.reduce((s, r) => s + (["Checked In", "Checked Out", "Confirmed"].includes(r.status) ? resBalance(db, r) : 0), 0) }; };
  const rows = useMemo(() => db.guests.filter((g) => !q.trim() || [g.name, g.email, g.phone].some((v) => v.toLowerCase().includes(q.trim().toLowerCase()))), [db, q]);
  const g = db.guests.find((x) => x.id === sel);
  useEffect(() => { if (g) { setNotes(g.notes); setPrefs(g.preferences); } }, [g?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const cols: Col<Guest>[] = [
    { key: "n", header: "Guest", cell: (x) => <span className="font-medium">{x.name}</span>, sort: (x) => x.name },
    { key: "p", header: "Phone", cell: (x) => x.phone, hideBelow: "md" }, { key: "e", header: "Email", cell: (x) => x.email || "—", hideBelow: "lg" },
    { key: "b", header: "Bookings", cell: (x) => stats(x).rs.length, sort: (x) => stats(x).rs.length },
    { key: "s", header: "Total spent", cell: (x) => money(stats(x).spent), sort: (x) => stats(x).spent, className: "text-right" },
    { key: "o", header: "Outstanding", cell: (x) => { const o = stats(x).owed; return o > 0 ? <Badge tone="amber">{money(o)}</Badge> : <span className="text-muted">—</span>; }, hideBelow: "md" },
  ];
  return (
    <>
      <PageHeader title="Guests" sub="Central guest directory built from reservations" actions={can("guests.export") ? <Button onClick={() => downloadCSV("guests.csv", [["Name", "Phone", "Email", "Bookings", "Total spent"], ...rows.map((x) => [x.name, x.phone, x.email, stats(x).rs.length, stats(x).spent])])}><Download size={15} />Export CSV</Button> : undefined} />
      <Card pad={false}><div className="border-b border-black/10 p-4"><SearchBox value={q} onChange={setQ} placeholder="Name, email or phone" className="max-w-md" /></div>
        <DataTable rows={rows} cols={cols} rowKey={(x) => x.id} onRow={(x) => setSel(x.id)} empty={<Empty title="No guests found" />} /></Card>
      <Drawer open={!!g} onClose={() => setSel(null)} title={g?.name ?? ""} footer={g && <Button variant="gold" onClick={() => act(updateGuest(g.id, { notes, preferences: prefs }), "Guest notes saved")}>Save notes</Button>}>
        {g && <div className="space-y-5"><dl><KV k="Phone" v={g.phone} /><KV k="Email" v={g.email || "—"} />{can("guests.sensitive") ? <KV k="Identification" v={g.idNumber ? `${g.idType} · ${g.idNumber}` : "Not recorded"} /> : <KV k="Identification" v={<span className="text-muted">Restricted</span>} />}<KV k="Completed stays" v={stats(g).stays} /><KV k="Total amount spent" v={money(stats(g).spent)} /><KV k="Outstanding balance" v={money(stats(g).owed)} /></dl>
          <Field label="Preferences"><Textarea value={prefs} onChange={(e) => setPrefs(e.target.value)} /></Field><Field label="Internal notes" hint="Visible to staff only"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          <div><p className="mb-2 font-serif text-lg">Booking history</p><ul className="divide-y divide-black/[.07] text-sm">{stats(g).rs.map((r) => <li key={r.id}><Link href={`/reservations/${r.id}`} className="flex items-center justify-between gap-2 py-2 hover:text-gold"><span>{r.ref}<span className="block text-xs text-muted">{fmtDate(r.checkIn)} → {fmtDate(r.checkOut)} · {money(r.amount)}</span></span><Badge>{r.status}</Badge></Link></li>)}</ul></div></div>}
      </Drawer>
    </>
  );
}
