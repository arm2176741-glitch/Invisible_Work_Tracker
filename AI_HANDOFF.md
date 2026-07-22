# FieldProof AI Handoff

## Product summary

FieldProof is a contractor proof-of-work SaaS.

The core product promise is:

> FieldProof helps contractors document work, prove completion, and generate professional proof reports in minutes.

The target customer is a contractor or small contracting company that needs better job documentation, organized before/during/after photo evidence, and customer-ready proof reports.

## Current architecture

### Permanent backend

- Java
- Spring Boot
- MySQL
- REST API
- Authentication
- Users
- Organizations/company workspaces
- Organization memberships
- Work entries
- Photo metadata
- Report generation and report preview data

The Spring Boot backend is the permanent application engine. Do not replace it.

### Existing static frontend

Path:

```text
src/main/resources/static
```

Purpose:

- Working prototype
- Visual reference
- Workflow blueprint

The static frontend is still the working app prototype. It should not be deleted during migration.

### New React production frontend

Path:

```text
frontend/
```

Stack:

- React
- TypeScript
- Vite
- Tailwind CSS v4
- shadcn/ui using the Base Nova preset
- Base UI primitives
- lucide-react icons

Purpose:

- Production web frontend migration target
- Componentized replacement for the static frontend
- Currently uses mock FieldProof data

## Current completed product loop in the existing app

The current static/Spring Boot flow can:

1. Sign in
2. Create/select a company workspace
3. Create work entries
4. Add before/during/after photos
5. Add photo captions
6. Mark a work entry completed
7. Enforce report-readiness requirements
8. Generate a report
9. Open a report preview
10. Display report evidence images

Important report-readiness rules currently being developed:

- A final report requires at least one BEFORE photo.
- A final report requires at least one AFTER photo.
- A final report requires a meaningful work-performed summary.
- A final report requires the work entry status to be COMPLETED.

## Current React frontend state

The React app is a foundation, not a full replacement yet.

It currently has:

- `LoginPage`
- `AppShell`
- `AppSidebar`
- `DashboardPage`
- `WorkspaceCard`
- `WorkEntryList`
- `ReportPreviewPage`
- shared domain types
- shared mock data
- shadcn UI components

Current React login behavior:

- Mock auth only
- Any non-empty email and password signs in
- After signing in, the mock dashboard appears

React is not yet connected to the Spring Boot API.

## Important current limitation

The React login page is intentionally basic and currently unpolished.

The next UI task should be to make the login screen match the FieldProof visual direction:

- dark cinematic background
- premium centered auth card
- FieldProof brand mark
- clear product copy
- dark inputs
- strong amber sign-in button
- clean validation state

After that, wire login to the real backend auth endpoints.

## Local commands

### Backend

From repo root:

```powershell
.\gradlew.bat test --console=plain
.\gradlew.bat bootRun
```

### React frontend

From repo root:

```powershell
cd frontend
$env:PATH = 'C:\Program Files\nodejs;' + $env:PATH
npm install
npm run dev
npm run build
npm run lint
```

The Vite dev server usually opens at:

```text
http://localhost:5173
```

## Migration strategy

Do not rewrite the whole app at once.

Use the existing static frontend as the visual/workflow reference.

Migrate one vertical slice at a time:

1. Login/auth
2. Current user/session restore
3. Workspace selection/state
4. Dashboard data
5. Work entry list/detail
6. Create work entry modal
7. Photo upload/captions
8. Report generation
9. Report preview images

Each migrated slice should:

- use real backend API data
- preserve the working static behavior
- include loading/error states
- keep permission and workspace boundaries in mind

## Out of scope right now

Do not build these in the current React web migration:

- React Native
- Expo
- native camera access
- GPS/location tracking
- offline synchronization
- photo upload queues
- resumable uploads
- background uploads
- push notifications
- speculative backend endpoints
- PDF generation before the report preview loop is stable

The future mobile app is planned, but this repo task is the React web foundation.

## Recommended next tasks

### Task 1: Polish React login UI

Goal:

Make the React login screen feel like a real FieldProof product screen, not a default form.

Files likely involved:

```text
frontend/src/components/auth/LoginPage.tsx
frontend/src/index.css
```

### Task 2: Wire React login to backend auth

Goal:

Replace mock auth with real Spring Boot login/current-user behavior.

Expected app state:

```text
not authenticated -> LoginPage
authenticated -> AppShell + DashboardPage
session expired -> LoginPage with message
```

### Task 3: Connect React dashboard to real workspace/work-entry/report APIs

Goal:

Replace mock dashboard data with Spring Boot responses while keeping the same visual layout.

## Notes for future AI agents

- Preserve existing working behavior.
- Do not delete the static frontend until React fully covers the core loop.
- Do not commit `node_modules`, `dist`, `build`, or uploaded real photos.
- Avoid unsupported claims like "tamper-proof."
- Prefer product language like:
  - proof-ready
  - organized job documentation
  - before-and-after evidence
  - customer-ready proof report
  - proof you can stand behind
