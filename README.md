# FOBBS Admin

Private hotel + lounge management dashboard for FOBBS Apartment and Suites.
Same stack as the public site: Next.js 16 (App Router), React 19, Tailwind 4, TypeScript, lucide-react, Base UI (dialogs).

## Run
```bash
npm install
npm run dev      # http://localhost:3000
```
Sign in from the login page using the **Demonstration accounts** panel (password `demo1234`).
Each role sees a different menu, which shows how permissions work.

## IMPORTANT: this is a front-end prototype
- All data is **demonstration data** (`src/data/seed.ts`): rooms, prices, products, staff and figures are invented.
- State lives in the browser (`src/store/store.tsx`, localStorage). "Reset demo data" is in the profile menu.
- Business rules (availability overlap, check-in/out, stock, reconciliation, permissions) are enforced in the store so the UI behaves correctly,
  **but they must be re-implemented on the backend**. Front-end permission checks are not security.
- Emails, file uploads, photo storage and payment gateways are not connected.

## Where things are
- `src/config/permissions.ts`  permission list, default roles, sidebar navigation
- `src/store/store.tsx`        every action and its business rule (maps 1:1 to future API endpoints)
- `src/lib/calc.ts`            availability, balances, shift summaries
- `src/components/ui.tsx`      design system (buttons, badges, tables, dialogs, toasts, charts)
- `src/app/(admin)/...`        one route per module

## Built (working)
Login, forgot password, overview, reservations (+details), front desk (check-in, walk-in, check-out), rooms, accommodation categories,
availability calendar, guests, housekeeping, maintenance, lounge overview, POS, orders, bar queue, products, inventory,
staff shifts, shift reconciliation (staff + manager/accountant review), payments, staff, roles & permissions, activity logs, notifications.

## Not built yet (shown in the menu with their phase)
Tables & customer tabs, lounge reports, expenses, refunds page, financial reports, reports & analytics, settings.

## Known simplifications
One room per reservation (no multi-room bookings); no photo upload; no portion/recipe stock; stock is deducted when an order is submitted.
