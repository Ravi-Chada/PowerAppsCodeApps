# Field Service Dispatch

## Scenario
Develop a Code App for intake, assignment, and completion tracking of field service tickets.

## Power Platform Components
- **Power Apps**: Dispatcher and technician mobile views
- **Power Automate**: Ticket assignment and status update notifications
- **Dataverse**: Service tickets and status history
- **Power BI (optional)**: Operational reporting dashboard

## Suggested Extensions
- [x] Add geo-priority logic for assignments
- [x] Add offline mode handling for technician updates

## What's Implemented
This Code App (Vite + React 19 + Fluent UI v9) implements the scenario with four screens:

- **Intake** — log a ticket with customer, location, category, and urgency, with a **live
  geo-priority preview** that scores and explains the ticket as you type (the first suggested
  extension).
- **Dispatch Board** — the unassigned queue **ordered by geo-priority score**, with SLA badges
  and a master/detail assign view (technician, email, scheduled time) plus a per-ticket
  "why this priority" explanation and status history.
- **My Jobs** — the technician view with **offline mode handling** (the second suggested
  extension): advance a job through En Route → On Site → Completed, capture resolution notes,
  and keep working with no connection — updates are buffered locally and **replayed automatically
  when connectivity returns**.
- **Insights** — KPIs (total, open, completed, SLA breaches), average resolution time, and
  breakdowns by status, category, and urgency.

Data is stored in two Dataverse tables (prefix `fsd`): `fsd_ticket` and an `fsd_statuslog`
audit trail linked by lookup.

A **Power Automate cloud flow** (`scripts/provision-flow.ps1`) handles assignment and
status-update notifications server-side.

### Ticket notifications cloud flow (`scripts/provision-flow.ps1`)
An automated cloud flow, **FSD - Ticket Notifications**, triggers when an `fsd_ticket` row is
created or modified (filtered to the `status`, `technician name`, and `technician email`
columns). When a technician email is present, it emails that technician — via the Office 365
Outlook connector — a summary of the ticket and its current status, so assignment and every
subsequent status change are notified automatically without the app having to send mail itself.

The script registers the flow in Dataverse as a **draft**. After running it, open Power Automate,
bind the **Microsoft Dataverse** and **Office 365 Outlook** connections, then turn the flow on.

### Geo-priority logic (`src/lib/priority.ts`)
Each ticket is scored 0–100 from three weighted factors so dispatchers work the queue in the
most sensible order:

- **Urgency** (50%) — customer-facing severity.
- **Proximity** (25%) — great-circle (haversine) distance from the dispatch depot; closer jobs
  reduce windshield time.
- **SLA pressure** (25%) — how much of the urgency-based SLA window has already elapsed.

The result includes a banded label (Critical / High / Medium / Low) and a human-readable
breakdown of the factors. Keeping the scoring in the data layer means it can later be swapped
for a Power Automate flow or routing service without touching any screen.

### Offline mode handling (`src/lib/offline.ts`)
Technicians frequently lose connectivity in the field (basements, rural sites). Status updates
are buffered in `localStorage` and replayed automatically once `navigator.onLine` reports the
device is back online. The UI advances optimistically so the technician is never blocked, and a
banner shows the offline state and the number of updates waiting to sync.

### Runtime theme packs (`src/theme/`)
A shared theme-token contract (`ThemePack`) lets the app switch skins at runtime without
redesigning any screen — every screen is built on semantic Fluent v9 tokens, so swapping the
pack's `Theme` reskins the whole UI. Ships with **Default**, **Night Shift** (a high-contrast
teal theme for low-light field work), and **Halloween** (a seasonal pumpkin-orange theme with a
spooky purple header) packs; the selection is persisted per user via `localStorage` and reloads
on app start. Change it from the palette button in the header. New packs only need to implement
the contract and register in `THEME_PACKS`.

## Data Model
| Table | Logical name | Key columns |
| --- | --- | --- |
| Ticket | `fsd_ticket` | title, customer, address/city, latitude/longitude, category, urgency, status, priority score, SLA hours, technician, scheduled/reported/assigned/completed timestamps, resolution notes |
| Status Log | `fsd_statuslog` | summary, status, technician, notes, logged-on, `fsd_ticketid` lookup → Ticket |

## Getting Started
```powershell
# 1. Provision Dataverse tables (one-time; requires: az login to the org tenant)
./scripts/provision-tables.ps1 -EnvironmentUrl "https://<your-org>.crm.dynamics.com"

# 2. (Optional) Seed sample ticket data
./scripts/seed-data.ps1 -EnvironmentUrl "https://<your-org>.crm.dynamics.com"

# 3. (Optional) Provision the ticket-notification cloud flow (created as a draft)
./scripts/provision-flow.ps1 -EnvironmentUrl "https://<your-org>.crm.dynamics.com"

# 4. Install dependencies and run locally
npm install
npm run dev
```

Update the `environmentId` in `power.config.json` to match your environment, then use
`npm run build` to produce the production bundle in `./dist`.

> **Tip:** to try offline mode, open the app, go to **My Jobs**, then toggle offline in your
> browser DevTools (Network → Offline). Advance a job and watch the update queue; switch back
> online to see it sync automatically.
