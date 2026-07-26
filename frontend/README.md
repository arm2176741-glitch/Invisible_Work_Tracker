# FieldProof React Web Frontend

This folder is the production web migration foundation for FieldProof.

The existing Spring Boot app and static frontend remain in `src/main/resources/static`.
This React app starts as a separate workspace so the migration can happen without breaking
the current working prototype.

## Current stack

- React
- TypeScript
- Vite
- Tailwind CSS v4
- shadcn/ui with the Base Nova preset
- Base UI primitives
- Geist font

## Run locally

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

From the repo root, you can run:

```powershell
cd frontend
npm run build
npm run lint
```

## Migration rule

The static frontend is the visual/workflow reference.
The React frontend should turn approved patterns into reusable components instead of copying
every static file line-for-line.

Current anchor components:

- `AppShell`
- `AppSidebar`
- `DashboardPage`
- `CreateWorkspaceDialog`
- `CreateWorkEntryStep`
- `OperationalSummary`
- `WorkspaceCard`
- `WorkEntryList`
- `ReportPreviewPage`
- shared `Button`
- onboarding state helpers in `src/lib/onboarding.ts`
- shared domain types

Current onboarding flow:

```text
CREATE_WORKSPACE
→ CREATE_WORK_ENTRY
→ ADD_EVIDENCE
→ GENERATE_REPORT
→ REVIEW_REPORT
→ COMPLETE
```

Implemented in React mock state:

- Step 1: create workspace
- Step 2: create first work entry

Next milestone:

- Step 3: add Before / During / After evidence with captions

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

## Explicitly out of scope for this folder right now

- React Native
- Expo
- offline synchronization
- GPS/camera native APIs
- speculative backend endpoints
- PDF generation

The React app is currently using local/mock onboarding state. Backend integration should happen after the proof-report flow is stable enough to justify API contracts.
