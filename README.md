# InvisibleWorkTracker / FieldProof

Spring Boot backend for FieldProof, a roofing contractor field documentation and proof-of-work app.

Roofing crews often track field work through texts, camera rolls, and verbal updates. That works in the moment, but it becomes hard to verify later when there is a warranty question, insurance issue, customer dispute, or manager review.

FieldProof is being built to give crews a simple way to record job-site activity and keep that documentation tied to the right user, company, and job.

## Current Status

The project is in active development. The authentication foundation is implemented and covered by integration tests. The first organization foundation slice is also implemented, so authenticated users can create companies, automatically become organization owners, and list their active organizations.

A small static frontend is included so the auth flow and organization flow can be tested from the browser.

Built so far:

- User registration and login
- BCrypt password hashing
- Database-backed bearer session tokens
- SHA-256 hashed session token storage
- 30-day session expiration
- Logout and session invalidation
- Protected `/auth/me` endpoint
- Account lockout after repeated failed login attempts
- Custom Spring Security token filter
- Global JSON error handling
- MySQL runtime configuration
- H2 test configuration
- Auth integration tests
- Organization creation and listing
- Creator automatically receives an active `OWNER` membership
- Organization integration tests
- Local H2 profile for browser testing without MySQL
- Basic static login/register/logout frontend
- Static organization create/list frontend panel

The next backend milestone is WorkEntry, the first core proof-of-work feature. Work entries will belong to organizations so access can be limited to users with active organization memberships.

## Tech Stack

- Java 17
- Spring Boot 4
- Spring Security
- Spring Data JPA
- Hibernate
- MySQL
- H2 for tests and local browser testing
- Gradle
- Lombok
- HTML, CSS, and vanilla JavaScript for the current static frontend

## Project Structure

```text
src/main/java/com/iwt/invisibleworktracker
|-- config
|-- controller
|-- dto
|-- entity
|-- exception
|-- repository
|-- security
`-- service
```

Package responsibilities:

- `config` - Spring and security configuration
- `controller` - REST API endpoints
- `dto` - request and response objects
- `entity` - database models
- `exception` - global error handling
- `repository` - database access
- `security` - bearer token filter and security helpers
- `service` - business logic

Static frontend files live in:

```text
src/main/resources/static
```

## Authentication Design

This project uses custom database-backed bearer sessions instead of JWT.

Login flow:

```text
User submits email and password
Password is checked with BCrypt
Backend generates a secure random token
Raw token is returned to the client
SHA-256 hash of the token is stored in the database
Client sends the raw token as a Bearer token on future requests
```

Authenticated requests use:

```http
Authorization: Bearer <token>
```

The `SessionTokenFilter` validates the token, checks that the session is still valid and not expired, and then sets the authenticated user in the Spring Security context.

## API Endpoints

Local base URL:

```text
http://localhost:8080
```

### Register

```http
POST /auth/register
```

Request body:

```json
{
  "email": "test@example.com",
  "password": "Password123!",
  "name": "Test User"
}
```

### Login

```http
POST /auth/login
```

Request body:

```json
{
  "email": "test@example.com",
  "password": "Password123!"
}
```

Example response:

```json
{
  "token": "example-session-token",
  "message": "Login successful"
}
```

### Current User

```http
GET /auth/me
Authorization: Bearer <token>
```

### Logout

```http
POST /auth/logout
Authorization: Bearer <token>
```

Expected response:

```text
204 No Content
```

### Create Organization

```http
POST /organizations
Authorization: Bearer <token>
```

Request body:

```json
{
  "name": "Desert Roofing"
}
```

Example response:

```json
{
  "id": 1,
  "name": "Desert Roofing",
  "active": true,
  "createdByUserId": 1,
  "role": "OWNER",
  "createdAt": "2026-06-23T10:00:00",
  "updatedAt": "2026-06-23T10:00:00"
}
```

Rules:

- The request must be authenticated.
- Organization names are trimmed before storage.
- Organization names cannot be blank or longer than 150 characters.
- Duplicate organization names are allowed.
- The creator automatically becomes an active `OWNER`.

### List Organizations

```http
GET /organizations
Authorization: Bearer <token>
```

Example response:

```json
[
  {
    "id": 1,
    "name": "Desert Roofing",
    "active": true,
    "createdByUserId": 1,
    "role": "OWNER",
    "createdAt": "2026-06-23T10:00:00",
    "updatedAt": "2026-06-23T10:00:00"
  }
]
```

Only organizations where the authenticated user has an active membership are returned.

## Running Locally

The app uses environment variables for local database credentials. Do not commit real database passwords.

### Option 1: Run with local H2

This is the fastest way to test the browser frontend. It does not require MySQL.

```powershell
.\gradlew.bat bootRun --args="--spring.profiles.active=local"
```

Then open:

```text
http://localhost:8080
```

The `local` profile uses an in-memory H2 database. Data is reset when the app stops.

### Option 2: Run with MySQL

Example `application.properties` pattern:

```properties
spring.datasource.url=${DB_URL:jdbc:mysql://localhost:3306/invisible_work_tracker_dev}
spring.datasource.username=${DB_USERNAME:iwt_user}
spring.datasource.password=${DB_PASSWORD:}
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
```

PowerShell example:

```powershell
$env:DB_PASSWORD="your_local_db_password"
.\gradlew.bat bootRun
```

Then open:

```text
http://localhost:8080
```

## Frontend Browser Testing

The static frontend supports:

- Register
- Login
- Logout
- Current user display
- Organization creation
- Organization listing

Browser flow:

```text
Start the app
Open http://localhost:8080
Create an account or sign in
Create an organization
Confirm it appears as "Organization Name — OWNER"
Refresh the page
Confirm organizations load again
Logout
```

## Running Tests

```powershell
.\gradlew.bat test
```

The test suite uses an H2 in-memory database, so MySQL is not required for tests.

Current tests cover:

- Registration
- Duplicate registration
- Invalid request validation
- Login
- Wrong password rejection
- Password length validation
- Account lockout
- Session expiration window
- Protected `/auth/me`
- Logout
- Token rejection after logout
- Password hash not being exposed by `/auth/me`
- Organization endpoints requiring authentication
- Organization name validation
- Organization name trimming
- Duplicate organization names
- Automatic active owner membership creation
- Listing organizations for the authenticated user
- Empty organization list responses
- Tenant isolation between users
- Excluding inactive memberships from organization listing

## Roadmap

### Phase 1: Auth Foundation

Status: implemented and covered by integration tests.

### Phase 2: Organization Foundation

Status: first slice implemented and covered by integration tests.

The goal is to support multiple companies before building work entries. A user can belong to more than one organization, and the user who creates an organization becomes its owner.

Implemented model:

```text
User
Organization
OrganizationMembership
MembershipRole
MembershipStatus
```

Initial roles:

```text
OWNER
MANAGER
FOREMAN
WORKER
```

### Phase 3: WorkEntry Backend

After the organization foundation, WorkEntry will become the first core product feature.

Planned fields:

```text
id
organization
user
jobName
jobAddress
workType
description
status
workDate
createdAt
updatedAt
```

Planned endpoints:

```http
POST /work-entries
GET /work-entries
GET /work-entries/{id}
PUT /work-entries/{id}
DELETE /work-entries/{id}
```

Main rule:

```text
Users should only access work entries for organizations they belong to.
```

### Phase 4: Field Documentation Workflow

Later versions may add:

- Photo upload
- GPS capture
- Daily work timelines
- Manager review
- Crew assignment
- Employee hours
- Proof-of-work reports

## Current Goal

The immediate goal is to move from the completed authentication and organization foundations into WorkEntry, where real job-site documentation can be tied to the correct organization and user.
