"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useDB, useStore } from "@/store/store";
import { Badge, Button, Card, Confirm, DataTable, Drawer, Empty, Field, Input, KV, Modal, Notice, PageHeader, SearchBox, Select, useAct, type Col } from "@/components/ui";
import { ago, fmtDT } from "@/lib/utils";
import type { Staff } from "@/types";

export default function StaffPage() {
  const db = useDB(); const { user, can, createStaff, updateStaff, setStaffStatus, resetPassword } = useStore(); const act = useAct();
  const [q, setQ] = useState(""); const [sel, setSel] = useState<string | null>(null); const [form, setForm] = useState<null | { name: string; email: string; phone: string; roleId: string; dept: Staff["dept"]; password: string }>(null);
  const [pw, setPw] = useState(""); const [susp, setSusp] = useState<Staff | null>(null);
  const role = (id: string) => db.roles.find((r) => r.id === id)?.name ?? id;
  const rows = db.staff.filter((s) => !q.trim() || [s.name, s.email, role(s.roleId)].some((v) => v.toLowerCase().includes(q.trim().toLowerCase())));
  const s = db.staff.find((x) => x.id === sel); const mine = s ? db.activity.filter((a) => a.staffId === s.id).slice(0, 8) : []; const shifts = s ? db.shifts.filter((x) => x.staffId === s.id).slice(0, 5) : [];
  const cols: Col<Staff>[] = [
    { key: "n", header: "Name", cell: (x) => <><p className="font-medium">{x.name}</p><p className="text-xs text-muted">{x.email}</p></>, sort: (x) => x.name },
    { key: "r", header: "Role", cell: (x) => <span className="flex flex-wrap gap-1"><Badge tone="dark">{role(x.roleId)}</Badge>{x.extraRoleIds.map((r) => <Badge key={r} tone="gold">{role(r)}</Badge>)}</span> },
    { key: "d", header: "Department", cell: (x) => x.dept, hideBelow: "md", sort: (x) => x.dept }, { key: "s", header: "Status", cell: (x) => <Badge>{x.status}</Badge> },
    { key: "l", header: "Last activity", cell: (x) => { const a = db.activity.find((y) => y.staffId === x.id); return a ? ago(a.at) : "—"; }, hideBelow: "lg" },
  ];
  return (
    <>
      <PageHeader title="Staff Management" sub="Every employee has their own login. Shared accounts are not allowed." actions={can("staff.create") ? <Button variant="gold" onClick={() => setForm({ name: "", email: "", phone: "", roleId: "receptionist", dept: "Hotel", password: "" })}><Plus size={15} />New staff account</Button> : undefined} />
      <Card pad={false}><div className="border-b border-black/10 p-4"><SearchBox value={q} onChange={setQ} placeholder="Name, email or role" className="max-w-md" /></div><DataTable rows={rows} cols={cols} rowKey={(x) => x.id} onRow={(x) => setSel(x.id)} empty={<Empty title="No staff found" />} /></Card>
      <Drawer open={!!s} onClose={() => setSel(null)} title={s?.name ?? ""}>
        {s && <div className="space-y-5"><div className="flex gap-2"><Badge>{s.status}</Badge><Badge tone="dark">{role(s.roleId)}</Badge></div>
          <dl><KV k="Email" v={s.email} /><KV k="Phone" v={s.phone} /><KV k="Department" v={s.dept} /></dl>
          {can("staff.roles") ? <div className="space-y-3"><Field label="Primary role"><Select value={s.roleId} disabled={s.id === user?.id} onChange={(e) => act(updateStaff(s.id, { roleId: e.target.value }), "Role updated")}>{db.roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select></Field>
            <Field label="Additional role" hint="One employee can hold more than one role only when explicitly authorised."><Select value={s.extraRoleIds[0] ?? ""} onChange={(e) => act(updateStaff(s.id, { extraRoleIds: e.target.value ? [e.target.value] : [] }), "Roles updated")}><option value="">None</option>{db.roles.filter((r) => r.id !== s.roleId).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select></Field></div> : <Notice tone="info">You can view staff but not change roles.</Notice>}
          <div className="flex flex-wrap gap-2">
            {can("staff.suspend") && s.id !== user?.id && (s.status === "Active" ? <><Button onClick={() => setSusp(s)}>Suspend</Button><Button variant="danger" onClick={() => act(setStaffStatus(s.id, "Deactivated"), "Account deactivated")}>Deactivate</Button></> : <Button variant="gold" onClick={() => act(setStaffStatus(s.id, "Active"), "Account reactivated")}>Reactivate</Button>)}</div>
          {can("staff.edit") && <div className="border-t border-black/10 pt-4"><Field label="Reset password" hint="Set a temporary password (8+ characters) and share it privately."><div className="flex gap-2"><Input value={pw} onChange={(e) => setPw(e.target.value)} /><Button onClick={() => { if (act(resetPassword(s.id, pw), "Password reset")) setPw(""); }}>Reset</Button></div></Field></div>}
          <div><p className="mb-2 font-serif text-lg">Recent activity</p>{mine.length ? <ul className="space-y-2 text-sm">{mine.map((a) => <li key={a.id}><b className="font-medium">{a.action}</b> <span className="text-muted">· {a.record} · {ago(a.at)}</span></li>)}</ul> : <p className="text-sm text-muted">No activity yet.</p>}</div>
          <div><p className="mb-2 font-serif text-lg">Shifts</p>{shifts.length ? <ul className="space-y-1 text-sm">{shifts.map((x) => <li key={x.id} className="flex justify-between"><span>{fmtDT(x.start)}</span><Badge>{x.status}</Badge></li>)}</ul> : <p className="text-sm text-muted">No lounge shifts.</p>}</div></div>}
      </Drawer>
      <Modal open={!!form} onClose={() => setForm(null)} title="New staff account" footer={<><Button onClick={() => setForm(null)}>Cancel</Button><Button variant="gold" onClick={() => { if (form && act(createStaff(form), "Account created")) setForm(null); }}>Create account</Button></>}>
        {form && <div className="grid gap-4 md:grid-cols-2"><Field label="Full name" className="md:col-span-2"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field><Field label="Work email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field><Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Role"><Select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>{db.roles.filter((r) => can("staff.roles") || r.id !== "owner").map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select></Field><Field label="Department"><Select value={form.dept} onChange={(e) => setForm({ ...form, dept: e.target.value as Staff["dept"] })}><option>Hotel</option><option>Lounge</option><option>Management</option></Select></Field>
          <Field label="Temporary password" hint="8+ characters" className="md:col-span-2"><Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field></div>}
      </Modal>
      <Confirm open={!!susp} onClose={() => setSusp(null)} title={`Suspend ${susp?.name}?`} confirmLabel="Suspend" message={<p>They will be unable to sign in until reactivated. Their past records stay intact.</p>} onConfirm={() => { if (susp && act(setStaffStatus(susp.id, "Suspended"), "Account suspended")) setSusp(null); }} />
    </>
  );
}
