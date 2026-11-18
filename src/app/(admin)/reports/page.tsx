"use client";
import { useState } from "react";
import { useStore } from "@/store/store";
import { Denied, PageHeader, Tabs } from "@/components/ui";
import { BusinessReport, HotelReport, LoungeReport } from "@/components/reports";

export default function Reports() {
  const { can } = useStore(); const avail = [can("reports.hotel") && "hotel", can("reports.lounge") && "lounge", can("reports.financial") && "business"].filter(Boolean) as ("hotel" | "lounge" | "business")[];
  const [tab, setTab] = useState<"hotel" | "lounge" | "business">(avail[0] ?? "hotel"); if (!avail.length) return <Denied />;
  const label = { hotel: "Hotel", lounge: "Lounge", business: "Business" };
  return (<><PageHeader title="Reports & Analytics" sub="Business-wide reporting with date filters, CSV export and print" /><div className="mb-4"><Tabs value={tab} onChange={setTab} tabs={avail.map((v) => ({ value: v, label: label[v] }))} /></div>{tab === "hotel" ? <HotelReport /> : tab === "lounge" ? <LoungeReport /> : <BusinessReport />}</>);
}
