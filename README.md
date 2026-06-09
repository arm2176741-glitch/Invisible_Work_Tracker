InvisibleWorkTracker (FieldProof)
Spring Boot backend for roofing contractor job documentation.
Roofing crews currently track field work through group texts, scattered camera rolls, and verbal updates. When a dispute comes up weeks later — an insurance claim, a warranty question, a customer saying work wasn't done — there's nothing to show. This is being built to fix that.
The idea is simple: workers log what they did on a job site. Photos, GPS location, timestamps. Foremen and owners review it. If something gets disputed, the documentation is already there.

What's built
Auth is done and tested end-to-end:

User registration and login
BCrypt password hashing
Database-backed session tokens (not JWT)
SHA-256 hashed token storage — raw token goes to client, hash goes to DB
Session invalidation on logout
Protected /auth/me endpoint
Custom Spring Security filter chain
Global JSON error handling
MySQL for runtime, H2 for tests
Integration tests covering the main auth flows


Stack

Java 17
Spring Boot 4
Spring Security
Spring Data JPA / Hibernate
MySQL
Gradle
Lombok


Running locally
Set your database password as an environment variable — don't hardcode it.
powershell$env:DB_PASSWORD="your_local_password"
.\gradlew.bat bootRun
The app expects a local MySQL database named invisible_work_tracker_dev with a user iwt_user. Application properties fall back to those defaults if no environment variables are set.
propertiesspring.datasource.url=${DB_URL:jdbc:mysql://localhost:3306/invisible_work_tracker_dev}
spring.datasource.username=${DB_USERNAME:iwt_user}
spring.datasource.password=${DB_PASSWORD:}

Running tests
powershell.\gradlew.bat test
Uses H2 in-memory — no MySQL needed. Tests cover registration, duplicate registration, login, the /auth/me endpoint, logout, and token rejection after logout.

API
Base URL: http://localhost:8080
POST /auth/register     { email, password, name }
POST /auth/login        { email, password } → returns session token
GET  /auth/me           Authorization: Bearer <token>
POST /auth/logout       Authorization: Bearer <token> → 204
Login response:
json{
  "token": "...",
  "message": "Login successful"
}

Auth design
Custom database-backed sessions instead of JWT. On login the backend generates a cryptographically random token. The raw token is returned to the client and sent as a Bearer header on subsequent requests. Only the SHA-256 hash of that token is stored in the database — if the DB were compromised the stored hashes can't be used to log in.
SessionTokenFilter handles validation on every protected request. Account lockout kicks in after 5 failed attempts.

Project structure
src/main/java/com/iwt/invisibleworktracker/
├── config/       security config, password encoder
├── controller/   auth endpoints
├── dto/          request and response shapes
├── entity/       User, Session
├── exception/    global error handler
├── repository/   UserRepository, SessionRepository
├── security/     SessionTokenFilter
└── service/      auth business logic

What's next
WorkEntry — the first real product feature. Workers log job activity: job name, address, work type, description, status, date. Users can only access their own entries.
After that, a minimal frontend: login, create a work entry, list my entries, logout. Something a real contractor can actually use.
Organization and crew management (owners, foremen, workers) comes later once the core loop is working.
