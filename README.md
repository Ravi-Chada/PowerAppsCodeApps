# PowerAppsCodeApps
A collection of Power Apps hosted Code Apps for Demo Purpose


Here's a practical set of Code Apps best practices, grounded against the current Microsoft Learn docs (Code Apps went GA Feb 5, 2026 — so this reflects the GA guidance, not preview). 

1. Project setup & tooling
Use the official Microsoft template (React 19 + Vite + 
power-apps
 SDK). It wires up the powerApps() Vite plugin and the local dev middleware for you.
Adopt the new npm-based CLI. Starting with the client library v1.0.4+, there's an npm CLI that's replacing the older pac code commands (which are being deprecated). Teach the path that won't be deprecated.
TypeScript in strict mode. The whole value of Code Apps over canvas is typed models and tooling — lean into it.
Gotcha to call out: if you're not using the official template's powerApps() plugin, you must add base: './' to 
vite.config.ts
, or Vite emits absolute asset paths that break on the Power Platform CDN.
2. Architecture — keep the layers clean
The platform owns auth, hosting, connectors, and governance; your code owns UI, state, logic, and routing. Respect that boundary:

Separate UI from data access. Put connector/Dataverse calls in a service layer, not inside components. Components render; services talk to data.
Don't reinvent auth. You never handle tokens — the Power Apps host manages Entra ID, OAuth, and consent. Don't add your own auth code or store secrets.
One system of record. Use Dataverse (or your chosen source) as the source of truth; don't scatter state across local component state.
3. Connectors & data
Call connectors through the generated typed services, not hand-rolled fetch calls — you get type safety and the platform handles auth/DLP.
Be DLP-aware. Code apps obey your org's Data Loss Prevention policies. Pick connectors that pass your tenant's DLP, or the app fails at launch.
Push heavy logic server-side. For multi-step side effects (email, docs, notifications), let Power Automate own it rather than orchestrating from the client — cleaner, more reliable, easier to govern.
Page and filter at the source. Query only what you need from Dataverse; don't pull whole tables to filter client-side.
4. Security & governance
Plan licensing early: end users need a Power Apps Premium license to run a code app. Confirm before you promise a rollout.
Environment must be enabled: an admin has to toggle "Power Apps code apps" on the environment. Use environment groups/rules to manage at scale.
Sharing follows canvas-app limits, and Conditional Access / app quarantine apply. Treat it like a governed enterprise app, not a free-form website.
Note: Service Principals can't own code apps — plan ownership around real user accounts.
5. ALM & deployment
Source control is the point — Code Apps are Git-native in your repo. But ⚠️ they don't use Power Platform's built-in Git integration, so manage versioning through your own repo + pipelines.
Promote dev → test → prod through environments; build with npm run build then push to the platform.
Wire up CI/CD like any web app — lint, type-check, build, deploy.
6. Performance & UX
Optimize the bundle — it's a real SPA, so code-split, lazy-load routes, and watch bundle size.
Design for loading/empty/error states explicitly — connector calls are network calls.
Show progress for long operations (the automation may take a few seconds).
7. Error handling & observability
Set up Azure Application Insights (documented for Code Apps) so you have real telemetry in production.
Handle connector failures gracefully — surface a friendly message, retry where sensible, never leave the user staring at a frozen form.
8. Know the limitations — design around them
Worth a slide so participants don't hit walls mid-build:

No Power Platform Git integration (use your own repo)
No SharePoint forms integration
No Power BI data integration function (but the app can be embedded in a Power BI report via the Power Apps visual)
Service Principals can't create/own code apps
