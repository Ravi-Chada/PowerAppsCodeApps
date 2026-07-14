# Expense Approval Automation

## Scenario
Create a Code App that helps employees submit expenses and routes requests through policy-aware approvals.

## Power Platform Components
- **Power Apps**: Expense submission and approval screens
- **Power Automate**: Multi-step approval and notification flow
- **Dataverse**: Expense records and audit trail
- **AI Builder (optional)**: Receipt data extraction

## Suggested Extensions
- [x] Add policy rule checks before submission
- [x] Add SLA tracking for approval turnaround time

## What's Implemented
This Code App (Vite + React 19 + Fluent UI v9) implements the scenario with four screens:

- **Submit Expense** — capture purpose, employee, amount, category, payment method, merchant,
  date, receipt URL, with **live policy checks** (the first suggested extension).
- **Pending Approvals** — review queued requests, see policy flags, approve/reject with notes,
  and view the full approval audit trail.
- **Track & SLA** — filter by status/category and watch **approval turnaround time** against a
  72‑hour SLA (the second suggested extension), plus mark approved expenses reimbursed.
- **Insights** — KPIs (totals, pending, approved $, average turnaround, SLA breaches),
  spend-by-category, and status breakdown.

Data is stored in two Dataverse tables (prefix `expaa`): `expaa_expense` and an `expaa_approval`
audit trail linked by lookup.

### Policy rules (`src/lib/policy.ts`)
Per-category caps, receipt-required-over-$25, future/stale-date checks, and a justification
requirement for high-value claims. Blocking rules prevent submission; warnings flag for review.

### Runtime theme packs (`src/theme/`)
A shared theme-token contract (`ThemePack`) lets the app switch skins at runtime without
redesigning any screen — every screen is built on semantic Fluent v9 tokens, so swapping the
pack's `Theme` reskins the whole UI. Ships with **Default** and **Halloween** packs; the
selection is persisted per user via `localStorage` and changed from the palette button in the
header. New seasonal packs only need to implement the contract and register in `THEME_PACKS`.

## Getting Started
```powershell
# 1. Provision Dataverse tables (one-time; requires: az login to the org tenant)
./scripts/provision-tables.ps1 -EnvironmentUrl "https://<your-org>.crm.dynamics.com"

# 2. (Optional) Seed sample expense data
./scripts/seed-data.ps1 -EnvironmentUrl "https://<your-org>.crm.dynamics.com"

# 3. Install dependencies and run locally
npm install
npm run dev
```

Update the `environmentId` in `power.config.json` to match your environment, then use
`npm run build` to produce the production bundle in `./dist`.
