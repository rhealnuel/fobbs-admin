import type { Metadata } from "next";
import "@fontsource-variable/playfair-display";
import "@fontsource-variable/dm-sans";
import "./globals.css";
import { StoreProvider } from "@/store/store";
import { ToastProvider } from "@/components/ui";

export const metadata: Metadata = { title: { default: "FOBBS Admin", template: "%s | FOBBS Admin" }, description: "Private hotel and lounge management for FOBBS Apartment and Suites.", robots: { index: false, follow: false } };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <StoreProvider><ToastProvider>{children}</ToastProvider></StoreProvider>
      </body>
    </html>
  );
}
