# IAR-ERP — PROJECT AUDIT & API INTEGRATION PLAN

## 1. Existing Architecture
The application is a monolithic Server-Side Rendered (SSR) web application. It uses Node.js and Express.js to serve EJS templates. 
- **Core Framework:** Node.js (v26.x) + Express (v5.x)
- **View Engine:** EJS
- **Database:** SQLite (better-sqlite3)
- **Auth:** Session-based (express-session with custom SQLite store), protected by CSRF (csrf-csrf v4) and Argon2 password hashing.

## 2. Database Tables & Relationships
The SQLite database (`academy.sqlite`) is highly normalized and uses Foreign Keys (enabled via PRAGMA). Key tables include:
- **Users & Auth:** `users`, `user_sessions`, `audit_logs`
- **Academy Core:** `batches` (fixed 5), `students`, `student_batch_history`, `teachers`
- **Attendance:** `attendance`, `teacher_attendance`
- **Sessions:** `batch_sessions`, `batch_session_teachers`
- **Finance (Ledger-based):** `student_fee_ledger`, `payments`, `invoices`, `expenses`, `financial_closings`
- **Academics:** `assessments`, `assessment_results`, `assignments`, `courses`
- **Holidays:** `holidays`, `holiday_batches`

## 3. Authentication & Authorization
- **Web:** Uses `express-session` (HttpOnly cookies). Role-based access control (RBAC) via `roleMiddleware.js`.
- **Roles:** `admin`, `teacher`. (Both teachers have identical operational permissions).
- **Mobile Read-Only:** Web app enforces `access_mode = mobile_readonly` globally via `mobileReadOnly.js` middleware.

## 4. Existing Modules
1. Dashboard & Analytics
2. Student Management
3. Admission Management
4. Teacher Management
5. Batch Management
6. Student & Teacher Attendance
7. Batch Session Tracking
8. Holiday Calendar
9. Smart Fee Management & Payments (No automatic invoicing)
10. Expenses & Financials
11. Academic Performance, Exams & Results
12. Notifications
13. Reports (PDF/CSV)
14. AI Academy Assistant (Rule-based)
15. Backup & Restore

## 5. Risks & Constraints
- **Concurrency:** SQLite uses WAL mode, but heavy API write operations must use the existing `db.transaction()` wrappers to avoid locking.
- **Session Clash:** The web app relies on session cookies. API clients (Desktop/Android) should ideally use Token-based Authentication (e.g., JWT) to avoid cross-origin cookie issues.
- **Mobile Restrictions:** We cannot rely on the User-Agent header. The API must require a specific header or claim (e.g., `Client-Type: android`) to enforce strict read-only behavior.

---

## API INTEGRATION PLAN (Phase 2 Preview)

**Base URL:** `https://<domain>/api/v1/`

**1. Authentication Strategy:**
- We will add an API-specific login endpoint (`POST /api/v1/auth/login`).
- Instead of sessions, we will generate a **JWT (JSON Web Token)** or a secure Bearer Token.
- Passwords will be verified using the existing `argon2.verify()` logic.
- The token will include the user's role (`admin` or `teacher`) and client type (`desktop` or `android`).

**2. Read-Only Enforcement (Android):**
- Android app requests will include the token with `client_type: 'android'`.
- A new middleware `apiMobileReadOnly.js` will intercept all `POST`, `PUT`, `PATCH`, and `DELETE` requests. If the token says `android`, it will return `403 Forbidden`.

**3. Code Structure Additions (Without touching existing code):**
- `routes/api/v1/` (New API routes)
- `controllers/api/v1/` (New API controllers)
- `middleware/api/` (JWT auth, API validation)
- We will only add **one line** to `server.js`: `app.use('/api/v1', apiRoutes);` right above the 404 handler.

**4. Reuse of Business Logic:**
- The API controllers will directly import and use the existing services (e.g., `studentService.js`, `feeService.js`, `paymentService.js`) to ensure financial rules and calculations remain 100% consistent.