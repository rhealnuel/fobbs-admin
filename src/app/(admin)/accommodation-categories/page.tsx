"use client";
import Image from "next/image";
import { useState } from "react";
import { Plus, Users, BedDouble } from "lucide-react";
import { useDB, useStore } from "@/store/store";
import { Badge, Button, Card, Field, Input, Modal, Notice, PageHeader, Select, Textarea, useAct } from "@/components/ui";
import { money } from "@/lib/utils";
import { categoryFree, roomDisplayStatus } from "@/lib/calc";
import type { Category } from "@/types";

const PHOTOS = [["rooms/standard-room-01.jpg", "Standard room photo"], ["rooms/deluxe-room-01.jpg", "Deluxe room photo"], ["rooms/executive-room-01.jpg", "Executive room photo"], ["apartments/one-bedroom-apartment.jpg", "One-bedroom apartment photo"], ["apartments/two-bedroom-apartment.jpg", "Two-bedroom apartment photo"]];
const blank = { name: "", description: "", photo: PHOTOS[0][0], price: 0, maxGuests: 2, bed: "", bathrooms: 1, amenities: [] as string[], bookable: true, published: false };

export default function Categories() {
  const db = useDB(); const { can, saveCategory } = useStore(); const act = useAct(); const [f, setF] = useState<null | (Omit<Category, "id" | "slug"> & { id?: string })>(null); const [am, setAm] = useState("");
  const manage = can("categories.manage");
  return (
    <>
      <PageHeader title="Accommodation Categories" sub="Categories are what guests see on the public website. Each category is made up of separately registered physical rooms." actions={manage ? <Button variant="gold" onClick={() => { setF({ ...blank }); setAm(""); }}><Plus size={15} />New category</Button> : undefined} />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {db.categories.map((c) => { const rooms = db.rooms.filter((r) => r.categoryId === c.id && r.active); const avail = rooms.filter((r) => roomDisplayStatus(db, r) === "Available").length; return (
          <article key={c.id} className="border border-black/10 bg-white">
            <div className="relative aspect-[4/3] bg-charcoal"><Image src={`/images/${c.photo}`} alt={c.name} fill sizes="(min-width:1280px) 33vw, 50vw" className="object-cover" />
              <div className="absolute left-3 top-3 flex gap-1.5"><Badge tone={c.published ? "green" : "grey"}>{c.published ? "Published" : "Draft"}</Badge>{!c.bookable && <Badge tone="red">Booking off</Badge>}</div></div>
            <div className="p-4"><h2 className="font-serif text-2xl">{c.name}</h2><p className="mt-1 line-clamp-2 text-sm text-muted">{c.description}</p>
              <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm"><span className="flex items-center gap-1.5"><Users size={14} className="text-gold" />Up to {c.maxGuests}</span><span className="flex items-center gap-1.5"><BedDouble size={14} className="text-gold" />{c.bed || "Bed type not set"}</span></p>
              <p className="mt-3 font-serif text-xl">{money(c.price)}<span className="font-sans text-sm text-muted"> / night</span></p>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-black/10 pt-3 text-center text-xs"><div><p className="font-serif text-xl">{rooms.length}</p><p className="text-muted">Physical units</p></div><div><p className="font-serif text-xl">{avail}</p><p className="text-muted">Available now</p></div><div><p className="font-serif text-xl">{categoryFree(db, c.id, new Date().toISOString().slice(0, 10), new Date(Date.now() + 864e5).toISOString().slice(0, 10))}</p><p className="text-muted">Bookable tonight</p></div></div>
              {manage && <div className="mt-4 flex gap-2"><Button className="flex-1" onClick={() => { setF({ ...c }); setAm(""); }}>Edit</Button><Button onClick={() => act(saveCategory({ ...c, bookable: !c.bookable }), c.bookable ? "Booking turned off" : "Booking turned on")}>{c.bookable ? "Pause booking" : "Enable booking"}</Button></div>}</div>
          </article>); })}
      </div>
      <Modal open={!!f} onClose={() => setF(null)} title={f?.id ? "Edit category" : "New accommodation category"} width="max-w-2xl" footer={<><Button onClick={() => setF(null)}>Cancel</Button><Button variant="gold" onClick={() => { if (f && act(saveCategory(f), "Category saved")) setF(null); }}>Save category</Button></>}>
        {f && <div className="grid gap-4 md:grid-cols-2">
          <Field label="Category name" className="md:col-span-2"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Description" className="md:col-span-2"><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          <Field label="Cover photograph" hint="Choose from images in /public/images. Uploading arrives with the backend." className="md:col-span-2"><Select value={f.photo} onChange={(e) => setF({ ...f, photo: e.target.value })}>{PHOTOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
          <Field label="Base price per night (₦)"><Input type="number" min={0} value={f.price || ""} onChange={(e) => setF({ ...f, price: Number(e.target.value) })} /></Field>
          <Field label="Maximum guests"><Input type="number" min={1} value={f.maxGuests} onChange={(e) => setF({ ...f, maxGuests: Number(e.target.value) })} /></Field>
          <Field label="Bed type"><Input value={f.bed} onChange={(e) => setF({ ...f, bed: e.target.value })} /></Field>
          <Field label="Bathrooms"><Input type="number" min={0} value={f.bathrooms} onChange={(e) => setF({ ...f, bathrooms: Number(e.target.value) })} /></Field>
          <div className="md:col-span-2"><Field label="Amenities"><div className="flex gap-2"><Input value={am} onChange={(e) => setAm(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && am.trim()) { e.preventDefault(); setF({ ...f, amenities: [...f.amenities, am.trim()] }); setAm(""); } }} placeholder="Type an amenity and press Enter" /><Button onClick={() => { if (am.trim()) { setF({ ...f, amenities: [...f.amenities, am.trim()] }); setAm(""); } }}>Add</Button></div></Field>
            <div className="mt-2 flex flex-wrap gap-1.5">{f.amenities.map((a, i) => <button key={i} onClick={() => setF({ ...f, amenities: f.amenities.filter((_, j) => j !== i) })} className="bg-cream px-2 py-1 text-xs hover:bg-[#f8e3e1]" title="Remove">{a} ×</button>)}</div></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#c9a348]" checked={f.bookable} onChange={(e) => setF({ ...f, bookable: e.target.checked })} />Open for booking</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#c9a348]" checked={f.published} onChange={(e) => setF({ ...f, published: e.target.checked })} />Published on the public website</label>
          <div className="md:col-span-2"><Notice tone="info">A category is not a room. Add physical rooms under Room Management; availability is counted from them.</Notice></div>
        </div>}
      </Modal>
    </>
  );
}
