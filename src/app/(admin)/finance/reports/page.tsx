"use client";
import { PageHeader } from "@/components/ui";
import { FinanceReport } from "@/components/reports";
export default function Page() { return <><PageHeader title="Financial Reports" sub="Hotel and lounge revenue are kept separate. Filter by date, export CSV or print." /><FinanceReport /></>; }
