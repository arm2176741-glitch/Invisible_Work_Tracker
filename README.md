# FieldProof

## Rights Notice

Copyright (c) 2026 Arman. All rights reserved.

This project is proprietary. The source code is not licensed for copying, modification, distribution, or commercial use without written permission.

## What FieldProof Is

FieldProof is a contractor proof-of-work platform for documenting jobsite work and turning that documentation into customer-ready proof reports.

The core product loop is:

```text
Create workspace
-> create work entry
-> add job documentation
-> add Before / During / After evidence
-> generate proof report
-> review customer-ready report
```

The product is being built around one practical problem:

```text
Contractors often need to prove what happened on a job, but their evidence is scattered across camera rolls, texts, notes, and memory.
```

FieldProof is intended to help contractors protect payment, reputation, and customer trust by keeping work documentation organized under the correct company, job, user, and report.

## Current Status

FieldProof is in active development.

For UI review, use the React/Vite frontend in:

```text
frontend/
```

That is the app behind the recent `localhost:5173` / `127.0.0.1:5173` screenshots.

The Spring Boot static files in:

```text
src/main/resources/static/
```

are legacy browser-prototype files kept for historical reference and backend smoke testing. They are not the current FieldProof product UI.

The project currently contains:

- A permanent Spring Boot backend.
- A MySQL-backed data model.
- A working authentication foundation.
- Organization/workspace foundations.
- Work-entry, photo evidence, and report foundations in the existing prototype/backend direction.
- A React web frontend in `/frontend`.
- A polished first-account flow: Workspace -> Job -> Photos -> Report -> Share.
- An operational dashboard with action-oriented job status.

The React web frontend is now the production-direction UI. The older static frontend remains useful as historical reference and for backend/browser testing, but it is not the final frontend direction.

## Current React Web Progress

The React frontend currently includes:

- Login / create-account screen.
- Cinematic FieldProof visual direction.
- Dashboard shell and sidebar.
- Onboarding state machine.
- Step 1: create workspace.
- Step 2: create first work entry.
- Step 3: add Before / During / After evidence.
- Step 4: generate a proof report.
- Step 5: review and share the report.
- Operational dashboard state.
- Unified job-status workflow row.
- Work-entry list.
- Workspace summary card.
- Report preview screen.
- Secure share-link flow.
- Reusable product-level dashboard components.
- shadcn/ui and Base UI primitives adapted to the FieldProof style.

The onboarding state machine currently models:

```text
CREATE_WORKSPACE
CREATE_WORK_ENTRY
ADD_EVIDENCE
GENERATE_REPORT
REVIEW_REPORT
COMPLETE
```

## Current Backend Progress

The Spring Boot backend foundation includes:

- User registration and login.
- BCrypt password hashing.
- Database-backed bearer session tokens.
- SHA-256 hashed session token storage.
- 30-day session expiration.
- Logout and session invalidation.
- Protected `/auth/me` endpoint.
- Account lockout after repeated failed login attempts.
- Custom Spring Security token filter.
- Global JSON error handling.
- MySQL runtime configuration.
- H2 test configuration.
- Auth integration tests.
- Organization creation and listing.
- Automatic active `OWNER` membership for organization creators.
- Reusable organization access helper for organization-scoped features.
- Organization integration tests.

The backend remains the permanent engine for:

- authentication
- users
- workspaces / organizations
- memberships
- work entries
- photo metadata
- reports
- immutable report snapshots
- permissions
- future API sharing with mobile

## Tech Stack

Backend:

- Java 17
- Spring Boot
- Spring Security
- Spring Data JPA
- Hibernate
- MySQL
- H2 for tests/local profile
- Gradle
- Lombok

Frontend:

- React
- TypeScript
- Vite
- Tailwind CSS v4
- shadcn/ui
- Base UI primitives
- Geist font

Future mobile direction:

- React Native
- Expo
- TypeScript

Mobile is future planning only. The current production work is the React web frontend and Spring Boot backend.

## Project Structure

```text
frontend
`-- current React + TypeScript + Vite frontend

src/main/java/com/iwt/invisibleworktracker
|-- config
|-- controller
|-- dto
|-- entity
|-- exception
|-- repository
|-- security
`-- service

src/main/resources/static
`-- legacy/static browser prototype
```

## Running the React Frontend

From the repo root:

```powershell
cd frontend
$env:PATH = 'C:\Program Files\nodejs;' + $env:PATH
npm run dev
```

Then open the Vite URL, usually:

```text
http://localhost:5173
```

This is the current UI review target.

Frontend checks:

```powershell
cd frontend
$env:PATH = 'C:\Program Files\nodejs;' + $env:PATH
npm run build
npm run lint
```

Current lint note:

```text
The shadcn `button.tsx` and `badge.tsx` files currently produce Fast Refresh warnings because they export component helpers/constants from the same file.
```

These are warnings, not build failures.

## Running the Spring Boot Backend

### Local H2 profile

Fastest local backend run:

```powershell
.\gradlew.bat bootRun --args="--spring.profiles.active=local"
```

Then open:

```text
http://localhost:8080
```

The local H2 profile resets data when the app stops.

### MySQL profile

The app reads database credentials from environment variables.

Example:

```powershell
$env:DB_PASSWORD="your_local_db_password"
.\gradlew.bat bootRun
```

Do not commit real database passwords.

## Running Backend Tests

```powershell
.\gradlew.bat test
```

The backend test suite uses H2, so MySQL is not required for tests.

## Current Product Roadmap

### 1. React onboarding loop

Status: implemented as the current product prototype.

Goal:

```text
Create workspace
-> create work entry
-> add evidence
-> generate report
-> review report
```

Current status:

- Step 1 workspace creation is implemented.
- Step 2 job creation is implemented.
- Step 3 photo evidence is implemented.
- Step 4 report generation is implemented.
- Step 5 report review/share is implemented.
- The operational dashboard now presents the workflow as Active jobs, Needs photos, Ready for report, and Ready to send.

### 2. Evidence and report loop

Current technical loop:

```text
Add Before / During / After evidence
-> attach captions
-> mark evidence ready
-> generate report
-> view report
```

This is the main FieldProof value loop.

### 3. Backend/API hardening

The React flow now uses Spring Boot contracts for the first-account workflow where
backend APIs exist:

```text
POST /organizations
POST /work-entries
POST /work-entries/{id}/photos
POST /work-entries/{id}/report
GET /reports/{id}
```

Near-term backend work should focus on:

- a single dashboard aggregate endpoint
- durable job/report routes and filters
- immutable report evidence assets
- report versioning
- production database migrations

### 4. Report PDF

The report is the customer-facing deliverable.

Future PDF work should be generated from a stable report snapshot, not from mutable dashboard UI.

### 5. Future mobile app

Future mobile is intended for field users:

```text
assigned jobs
photo capture
notes
checklists
address confirmation
offline-safe documentation
sync when online
```

Do not build React Native, Expo, offline sync, GPS, or photo-upload queues in the current web migration unless explicitly scoped.

## Business Direction

FieldProof is not meant to be generic photo storage.

The sharper business wedge is:

```text
Evidence-to-report software for contractors.
```

Potential customer value:

- protect payment
- reduce disputes
- document job completion
- create professional customer reports
- organize job evidence
- improve customer trust
- protect contractor reputation

The strongest validation question is:

```text
Tell me about the last time a customer questioned your work, delayed payment, or claimed something was incomplete. What proof did you have?
```

## Current Priority

The current best technical priority is:

```text
Polish the React operational workflow, wire durable dashboard filters/routes, and keep the backend API contracts aligned with the FieldProof proof-report loop.
```

The current best business priority is:

```text
Show the proof-report flow to contractors and learn whether it solves a painful enough problem to pay for.
```
