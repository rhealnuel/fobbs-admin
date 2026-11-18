"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useStore } from "@/store/store";
import { Button, Field, Input, Notice } from "@/components/ui";

export default function ForgotPassword() {
  const { db } = useStore(); const [email, setEmail] = useState(""); const [sent, setSent] = useState(false); const [err, setErr] = useState("");
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (!/^\S+@\S+\.\S+$/.test(email)) { setErr("Enter a valid email address."); return; } setErr(""); setSent(true); };
  const known = db?.staff.some((s) => s.email.toLowerCase() === email.trim().toLowerCase());
  return (
    <div className="grid min-h-dvh place-items-center px-5">
      <div className="w-full max-w-md">
        <Image src="/images/logo/fobbs-logo.png" alt="FOBBS" width={1000} height={860} className="mb-6 h-16 w-auto" />
        <h1 className="font-serif text-3xl">Reset your password</h1>
        {sent ? (
          <div className="mt-6 space-y-4">
            <Notice tone="ok">If an active staff account exists for <b>{email}</b>, a reset link will be sent. For security we show the same message either way.</Notice>
            <Notice tone="info">Prototype note: no email is sent from this demo{known ? ". In the live system the link would arrive in the inbox above" : ""}. A manager can also reset your password from Staff Management.</Notice>
            <Link href="/login" className="inline-flex items-center gap-2 text-sm underline decoration-gold underline-offset-4"><ArrowLeft size={14} />Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <p className="text-sm text-muted">Enter your work email and we will send you a reset link.</p>
            {err && <Notice tone="error">{err}</Notice>}
            <Field label="Work email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus /></Field>
            <Button type="submit" variant="gold" size="lg" className="w-full">Send reset link</Button>
            <Link href="/login" className="inline-flex items-center gap-2 text-sm underline decoration-gold underline-offset-4"><ArrowLeft size={14} />Back to sign in</Link>
          </form>
        )}
      </div>
    </div>
  );
}
