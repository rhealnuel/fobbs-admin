"use client";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useDB, useStore } from "@/store/store";
import { Badge, Button, Card, Field, Input, Modal, Notice, PageHeader, Select, useAct } from "@/components/ui";
import { PERMISSION_GROUPS } from "@/config/permissions";
import { cn } from "@/lib/utils";

export default function Roles() {
  const db = useDB(); const { saveRole } = useStore(); const act = useAct(); const [sel, setSel] = useState("receptionist"); const role = db.roles.find((r) => r.id === sel) ?? db.roles[0];
  const [perms, setPerms] = useState<string[]>(role.permissions); const [name, setName] = useState(role.name); const [add, setAdd] = useState<null | { name: string; scope: "hotel" | "lounge" | "both" }>(null);
  useEffect(() => { setPerms(role.permissions); setName(role.name); }, [role.id, role.permissions, role.name]);
  const locked = role.id === "owner"; const dirty = JSON.stringify([...perms].sort()) !== JSON.stringify([...role.permissions].sort()) || name !== role.name;
  const toggle = (k: string) => setPerms((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  const users = db.staff.filter((s) => s.roleId === role.id || s.extraRoleIds.includes(role.id)).length;
  return (
    <>
      <PageHeader title="Roles & Permissions" sub="Role-based access control. The interface hides what a role cannot do, and the backend must enforce the same rules." actions={<Button variant="gold" onClick={() => setAdd({ name: "", scope: "hotel" })}><Plus size={15} />New role</Button>} />
      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <Card pad={false} title="Roles"><ul>{db.roles.map((r) => <li key={r.id}><button onClick={() => setSel(r.id)} className={cn("flex w-full items-center justify-between gap-2 border-l-2 px-4 py-3 text-left text-sm hover:bg-cream/60", r.id === sel ? "border-gold bg-cream" : "border-transparent")}><span>{r.name}</span><span className="text-xs text-muted">{r.permissions.length}</span></button></li>)}</ul></Card>
        <Card title={<span className="flex items-center gap-2">{role.name}<Badge tone="grey">{role.scope === "both" ? "Hotel + Lounge" : role.scope === "hotel" ? "Hotel" : "Lounge"}</Badge></span>} action={<div className="flex items-center gap-2"><span className="hidden text-xs text-muted md:inline">{users} staff</span><Button variant="gold" disabled={locked || !dirty} onClick={() => act(saveRole({ id: role.id, name, scope: role.scope, permissions: perms }), "Permissions saved and logged")}>Save changes</Button></div>}>
          {locked && <div className="mb-4"><Notice tone="info">The owner role always holds every permission and cannot be reduced.</Notice></div>}
          {!locked && <div className="mb-4 max-w-sm"><Field label="Role name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field></div>}
          <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">{PERMISSION_GROUPS.map((g) => <fieldset key={g.group}><legend className="mb-2 border-b border-black/10 pb-1 font-serif text-lg">{g.group}</legend>
            {g.items.map((i) => <label key={i.key} className="flex min-h-9 items-center gap-2.5 text-sm"><input type="checkbox" className="size-4 accent-[#c9a348]" disabled={locked} checked={locked || perms.includes(i.key)} onChange={() => toggle(i.key)} />{i.label}</label>)}</fieldset>)}</div>
        </Card>
      </div>
      <Modal open={!!add} onClose={() => setAdd(null)} title="New role" width="max-w-md" footer={<><Button onClick={() => setAdd(null)}>Cancel</Button><Button variant="gold" onClick={() => { if (add) { const r = saveRole({ name: add.name, scope: add.scope, permissions: [] }); if (act(r, "Role created. Now choose its permissions.")) { setAdd(null); if (r.id) setSel(r.id); } } }}>Create role</Button></>}>
        {add && <div className="space-y-4"><Field label="Role name"><Input value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} /></Field><Field label="Area"><Select value={add.scope} onChange={(e) => setAdd({ ...add, scope: e.target.value as "hotel" | "lounge" | "both" })}><option value="hotel">Hotel</option><option value="lounge">Lounge</option><option value="both">Hotel + Lounge</option></Select></Field></div>}
      </Modal>
    </>
  );
}
