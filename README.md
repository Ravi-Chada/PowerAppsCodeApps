# PowerAppsCodeApps

A collection of Power Platform Code App demos.

## Available Demos

1. **Customer Feedback Assistant**  
   Capture customer feedback, classify sentiment, and route follow-up tasks.
2. **Expense Approval Automation**  
   Submit expenses, validate policy rules, and trigger manager approvals.
3. **Field Service Dispatch**  
   Create service tickets, assign technicians, and track visit completion.

## Demo Structure

Each demo lives in `/demos/<demo-name>` and includes a focused README with:
- Scenario overview
- Power Platform components used
- Suggested extension ideas

## Code Apps Best Practices

Here's a practical set of Code Apps best practices, grounded against current Microsoft Learn docs (Code Apps went GA Feb 5, 2026 — this reflects GA guidance).

1. **Project setup & tooling**
   - Use the official Microsoft template (React 19 + Vite + `power-apps` SDK). It wires up the `powerApps()` Vite plugin and local dev middleware.
   - Adopt the npm-based CLI (`power-apps` client library v1.0.4+), replacing older `pac code` commands.
   - Use TypeScript strict mode.
   - If you're not using the official template's `powerApps()` plugin, add `base: './'` to `vite.config.ts` so asset paths work on the Power Platform CDN.
2. **Architecture — keep the layers clean**
   - Keep UI and data access separate; use a service layer for connector/Dataverse calls.
   - Don't handle auth tokens in app code; Power Apps host auth handles Entra ID/OAuth/consent.
   - Keep a single source of truth in Dataverse (or your chosen source).
3. **Connectors & data**
   - Prefer generated typed services over hand-rolled fetch calls.
   - Design with DLP policy constraints in mind.
   - Push multi-step side-effect logic to Power Automate flows.
   - Page and filter at the source; avoid full-table client pulls.
4. **Security & governance**
   - Validate Power Apps Premium licensing early.
   - Ensure the environment has Code Apps enabled.
   - Treat sharing and access controls as enterprise-governed.
   - Service principals cannot own Code Apps; use user ownership.
5. **ALM & deployment**
   - Code Apps are Git-native in your repo, but don't use built-in Power Platform Git integration.
   - Promote through environments (dev → test → prod).
   - Use CI/CD for lint, type-check, build, and deploy.
6. **Performance & UX**
   - Optimize bundle size with code-splitting/lazy-loading.
   - Design explicit loading/empty/error states.
   - Show progress indicators for longer operations.
7. **Error handling & observability**
   - Integrate Azure Application Insights for production telemetry.
   - Surface connector failures clearly and support sensible retry paths.
8. **Design around limitations**
   - No Power Platform Git integration (use your own repo).
   - No SharePoint forms integration.
   - No Power BI data integration function (embedding via Power Apps visual is still possible).
   - Service principals can't create/own code apps.
