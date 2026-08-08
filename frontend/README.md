# FieldProof React Web Frontend

This folder is the current FieldProof web UI.

The existing Spring Boot app and static frontend remain in `src/main/resources/static`.
Those static files are legacy browser-prototype files. For current UI review, review this
Vite app instead.

## Current Stack

- React
- TypeScript
- Vite
- Tailwind CSS v4
- shadcn/ui with the Base Nova preset
- Base UI primitives
- Geist font

## Run Locally

If `node` is not available in your terminal yet, restart PowerShell or IntelliJ.
If it still does not resolve, temporarily prepend Node to PATH:

```powershell
$env:PATH = 'C:\Program Files\nodejs;' + $env:PATH
```

Then:

```powershell
npm install
npm run dev
```

The current UI runs at the Vite URL, usually:

```text
http://localhost:5173
```

From the repo root, checks can be run with:

```powershell
cd frontend
npm run build
npm run lint
```

## Current UI Scope

The React frontend is the production-direction UI. The static frontend should only be used
as historical reference or for backend smoke testing.

Current anchor components:

- `AppShell`
- `AppSidebar`
- `DashboardPage`
- `CreateWorkEntryStep`
- `AddEvidenceStep`
- `GenerateReportStep`
- `OperationalSummary`
- `WorkspaceCard`
- `WorkEntryList`
- `ReportPreviewPage`
- shared `Button`
- onboarding state helpers in `src/lib/onboarding.ts`
- shared API client in `src/lib/api.ts`
- shared domain types

Current onboarding flow:

```text
CREATE_WORKSPACE
-> CREATE_WORK_ENTRY
-> ADD_EVIDENCE
-> GENERATE_REPORT
-> REVIEW_REPORT
-> COMPLETE
```

Implemented in React:

- Step 1: create workspace
- Step 2: create first job
- Step 3: add Before / During / After evidence with captions
- Step 4: generate proof report
- Step 5: review/share report
- Operational dashboard with unified job status: Active jobs, Needs photos, Ready for report, Ready to send

Initial shadcn components installed:

- `badge`
- `button`
- `card`
- `dialog`
- `input`
- `label`
- `separator`
- `sonner`
- `textarea`

The generated `button` component has been adapted to preserve FieldProof's
`primary`, `secondary`, `ghost`, `sm`, and `md` variants.

## Explicitly Out Of Scope

- React Native
- Expo
- offline synchronization
- GPS/camera native APIs
- speculative backend endpoints
- PDF generation

The React app now calls the Spring Boot API for the first-account workflow where backend
contracts exist, while still keeping UI-side state for the guided experience.
