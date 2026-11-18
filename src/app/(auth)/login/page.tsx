"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useStore } from "@/store/store";
import { landingFor } from "@/components/Shell";
import { Button, Field, Input, Notice } from "@/components/ui";
import { DEMO_PASSWORD } from "@/data/seed";

export default function LoginPage() {
  const { db, user, login, can } = useStore(); const router = useRouter();
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [show, setShow] = useState(false); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { if (user) router.replace(landingFor(can)); }, [user, can, router]);
  const submit = (e?: React.FormEvent, em = email, p = pw) => {
    e?.preventDefault(); setErr(""); if (!em.trim() || !p) { setErr("Enter your email and password."); return; }
    setBusy(true); const r = login(em, p); setBusy(false); if (!r.ok) setErr(r.error ?? "Could not sign in.");
  };
  const demo = db?.staff.filter((s) => s.status === "Active") ?? [];
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-black lg:block">
        <Image src="/images/rooms/deluxe-room-01.jpg" alt="" fill sizes="50vw" className="object-cover opacity-40" priority />
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <Image src="/images/logo/fobbs-logo-light.png" alt="FOBBS Apartment and Suites" width={1000} height={860} className="h-24 w-auto self-start" priority />
          <div><p className="font-serif text-4xl leading-tight">Hotel and lounge,<br />one calm workspace.</p><p className="mt-4 max-w-sm text-white/70">Reservations, rooms, the bar and the books, for authorised FOBBS staff only.</p></div>
        </div>
      </div>
      <div className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <Image src="/images/logo/fobbs-logo.png" alt="FOBBS" width={1000} height={860} className="mb-6 h-16 w-auto lg:hidden" />
          <p className="flex items-center gap-2 text-xs uppercase text-gold"><LockKeyhole size={14} />Staff access</p>
          <h1 className="mt-2 font-serif text-3xl">Sign in to FOBBS Admin</h1>
          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            {err && <Notice tone="error">{err}</Notice>}
            <Field label="Work email"><Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@fobbs.com" /></Field>
            <Field label="Password"><div className="relative"><Input type={show ? "text" : "password"} autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} className="pr-11" /><button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-0 top-0 grid h-10 w-10 place-items-center text-muted">{show ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></Field>
            <div className="flex items-center justify-between text-sm"><span className="text-muted">Each employee has their own login.</span><Link href="/forgot-password" className="underline decoration-gold underline-offset-4">Forgot password?</Link></div>
            <Button type="submit" variant="gold" size="lg" className="w-full" loading={busy}>Sign in</Button>
          </form>
          <div className="mt-8 border border-dashed border-gold/60 bg-cream/60 p-4">
            <p className="text-xs font-semibold uppercase text-[#7a5f14]">Demonstration accounts</p>
            <p className="mt-1 text-xs text-muted">Prototype only. Pick a role to see how the menu and permissions change. Password for all: <code className="bg-white px-1">{DEMO_PASSWORD}</code></p>
            <div className="mt-3 flex flex-wrap gap-1.5">{demo.map((s) => <button key={s.id} onClick={() => submit(undefined, s.email, DEMO_PASSWORD)} className="border border-black/15 bg-white px-2.5 py-1.5 text-xs hover:border-gold">{db?.roles.find((r) => r.id === s.roleId)?.name}<span className="text-muted"> · {s.name.split(" ")[0]}</span></button>)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
