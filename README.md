# InvisibleWorkTracker / FieldProof

InvisibleWorkTracker, also called FieldProof, is a Spring Boot backend for roofing contractor field documentation and proof-of-work tracking.

The goal is to give roofing crews a simple way to record job-site activity, keep work documentation organized, and make completed work easier to verify later.

This repo currently contains the backend API.

## Current Status

The project is in active development. The authentication foundation is implemented and covered by integration tests. The next major feature is the WorkEntry backend.

Implemented so far:

— User registration
— User login
— BCrypt password hashing
— Database-backed bearer session tokens
— SHA-256 hashed session token storage
— Logout and session invalidation
— Protected `/auth/me` endpoint
— Custom Spring Security filter
— Global JSON error handling
— MySQL runtime configuration
— H2 test configuration
— Auth integration tests

## Why This Project Exists

Roofing companies often rely on text messages, scattered photos, memory, and verbal updates to track field work. That can make it hard to prove what happened on a job site after the work is done.

FieldProof is being built to support job-site work documentation, proof of completed work, crew accountability, timestamped field activity, manager review, future photo and GPS documentation, and future crew and organization management.

The long-term idea is for workers to document field activity while foremen, managers, and owners review that documentation from higher levels of the company.

## Tech Stack

— Java 17
— Spring Boot 4
— Spring Security
— Spring Data JPA
— Hibernate
— MySQL
— H2 for tests
— Gradle
— Lombok
— Postman

## Project Structure

```text
src/main/java/com/iwt/invisibleworktracker
├── config
├── controller
├── dto
├── entity
├── exception
├── repository
├── security
└── service
```

Package responsibilities:

— `config` — Spring and security configuration
— `controller` — REST API endpoints
— `dto` — request and response objects
— `entity` — database models
— `exception` — global error handling
— `repository` — database access
— `security` — token filter and security helpers
— `service` — business logic

## Authentication Design

This project uses custom database-backed bearer sessions instead of JWT.

When a user logs in, the backend generates a secure random token. The raw token is returned to the client, but only a SHA-256 hash of the token is stored in the database.

Future requests send the raw token like this:

```http
Authorization: Bearer <token>
```

The `SessionTokenFilter` validates the token, checks the session in the database, and sets the authenticated user in the Spring Security context.

## API Endpoints

Base URL for local development:

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

## Local Development

Database credentials are handled with environment variables.

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

Do not commit real database passwords.

## Running Tests

```powershell
.\gradlew.bat test
```

Current tests cover the main authentication flow, including registration, duplicate registration, login, protected `/auth/me`, logout, and token rejection after logout.

## Roadmap

### Phase 1: Auth Foundation

Status: implemented and covered by integration tests.

### Phase 2: WorkEntry Backend

Next planned feature.

Planned fields:

```text
id
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

Main rule: users should only be able to access their own WorkEntries.

### Phase 3: Simple Frontend

After the WorkEntry backend is working, the first frontend version will focus on a small usable loop: login, load current user, create WorkEntry, list my WorkEntries, and logout.

### Phase 4: Crew and Organization Management

Later versions may add organizations, crews, and role-based access for owners, managers, foremen, and workers.

## Current Goal

The immediate goal is to move from authentication infrastructure into the first real product feature: WorkEntry documentation for roofing job activity.


