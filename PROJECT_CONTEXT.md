# CyberSage — Project Context for AI Assistants

Use this document as the starting context when asking an AI assistant to explain,
debug, extend, or review this repository. Treat the source code and package
manifests as authoritative if anything here differs from the implementation.
This is a static summary of the current code, not a security certification.

## Copy/paste project brief

CyberSage is a full-stack web application for passive web-security
configuration auditing. The frontend is a React 18 single-page app built with
Vite. The backend is a Node.js/Express REST API using MongoDB through Mongoose.
An authenticated user submits a publicly accessible URL; the backend performs
a read-only HTTP GET, collects response headers and cookie/HTTPS metadata,
evaluates a local set of security-configuration rules, calculates a score and
grade, saves the result, and returns it to the UI. Users can see dashboards,
search and manage their own scan history, inspect detailed findings, request
Gemini-generated explanations (with a rule-based fallback), and download PDF
reports. Admins have separate platform-wide user and scan management features.

This is a passive configuration checker, not a vulnerability scanner or
penetration-testing tool. It does not inject payloads, fuzz endpoints, brute
force, or attempt exploitation. Preserve this scope if changing scan behavior.
Keep the existing React/Vite frontend, Express/Mongoose backend, MongoDB data
model, and `/api` contracts unless a task explicitly asks to change them.
Check both sides of an API change: frontend service callers and backend routes
/controllers. Do not assume an email delivery or token-refresh flow exists.

## Product behavior and main user flows

1. **Account access:** users sign up or log in with email/password. The
   backend hashes passwords using bcryptjs and issues a signed JWT. The browser
   stores the JWT and user snapshot in `localStorage`; API requests send the
   JWT in the standard Bearer authorization header. Private routes require authentication, and the
   `/admin` page additionally requires the `admin` role.
2. **Run a scan:** the user enters a URL in the scanner page. The browser does
   basic format validation; the backend performs URL, protocol, hostname,
   address, DNS-resolution, and port checks before making a request.
3. **Analyze:** the API makes a passive GET request, follows a configured
   limited number of redirects, collects response headers and cookies, checks
   HTTPS/HTTP-to-HTTPS behavior, applies the local rule engine, calculates a
   score/grade, and stores the scan.
4. **Review results:** the scanner shows score, grade, severity, findings,
   positive checks, headers, cookie/HTTPS/server details, and an AI analysis
   panel. A database-backed history page supports search, status filtering,
   sorting, pagination, deletion, and report download. A scan-detail page
   loads a prior scan.
5. **Dashboard:** authenticated users see aggregate counts, average score,
   findings by severity, recent scans, and a seven-day score trend.
6. **AI explanation:** the backend calls Google Gemini using scan data and
   requests structured JSON. It caches the full explanation on the scan. When
   Gemini is unavailable or its output cannot be parsed, the service returns a
   rule-based fallback.
7. **Reporting:** a PDF is generated server-side from a completed scan and
   streamed to the user.
8. **Admin:** admins can see platform-wide metrics, browse users and scans,
   update another user's role, and delete another user's account and scans.

## Architecture and important source locations

### Frontend: `frontend/`

- Entrypoint: `frontend/index.html` → `frontend/src/main.jsx` →
  `frontend/src/App.jsx`.
- `App.jsx` defines public authentication routes and authenticated routes
  nested under the shared layout. `PrivateRoute` and `AdminRoute` are route
  guards.
- `src/pages/` contains auth (`Login`, `Signup`, `ForgotPassword`,
  `ResetPassword`), dashboard (`Dashboard`, `Profile`), scanner (`Scanner`),
  history (`ScanHistory`, `ScanDetail`), and admin (`AdminPanel`) pages.
- `src/components/` contains layout, route guards, shared UI, dashboard
  metrics/charts, and the AI explanation panel.
- `src/context/AuthContext.jsx` owns shared authentication state and login,
  signup, logout, and profile-refresh actions. Hooks in `src/hooks/` manage
  auth, scanning, history, dashboard data, and AI requests.
- `src/services/` contains Axios-backed API clients, separated by auth, scan,
  dashboard, AI, report, and admin concerns. `src/services/api.js` configures
  the shared Axios client and Bearer-token/error interceptors.
- `src/utils/` holds constants and formatting/helpers; `src/index.css` holds
  application styles.
- UI styling uses Tailwind CSS 3 with a dark cybersecurity theme. Motion uses
  Framer Motion; charts use Chart.js with react-chartjs-2; icons use
  react-icons.
- Environment variable `VITE_API_URL` sets the API base URL. The default is
  `http://localhost:5000/api`. Vite serves on port 5173 and proxies `/api` to
  port 5000 for local development.

### Backend: `backend/`

- Entrypoint: `backend/server.js`. It configures Express, Helmet, CORS, JSON
  parsing, request logging, rate limits, health check, API routers, 404/error
  handling, and graceful HTTP shutdown.
- `routes/` declares the HTTP surface and input validation. `controllers/`
  implements endpoint orchestration and response shaping.
- `models/` contains the Mongoose `User` and `Scan` schemas.
- `scanner/httpScanner.js` performs the target HTTP request and extracts
  response data. `utils/urlValidator.js` validates scan targets.
- `ruleEngine/` contains the rule definitions, execution engine, and score
  calculator.
- `ai/` builds prompts and calls Gemini; `services/pdfReportService.js`
  generates reports.
- `middlewares/` contains JWT authorization, role restriction, input
  validation/sanitization, and centralized error handling.
- `database/connection.js` connects to MongoDB with retry behavior.
  `config/config.js` reads environment settings and supplies defaults.
  `utils/logger.js` configures Winston console and rotating file logs.

### Layers and request/data flow

The backend is a modular monolith, not a set of microservices:

`Express router → middleware/validation → controller → scanner/rule/AI/report
service and/or Mongoose model → MongoDB → JSON or file response`

The browser communicates with it over REST/JSON under `/api`. There is no
message broker, job worker, GraphQL API, or separate identity provider in the
visible application code. Scans are awaited inside the HTTP request rather
than dispatched to a background queue.

## HTTP API inventory

All paths below are prefixed with `/api`. Authentication uses an HTTP
Authorization header carrying a Bearer JWT. Unless marked public, routes require JWT
authentication; all `/admin` routes also require the `admin` role.

| Area | Method and path | Access | Purpose |
|---|---|---|---|
| Auth | `POST /auth/signup` | Public | Create account and return user/JWT |
| Auth | `POST /auth/login` | Public | Authenticate and return user/JWT |
| Auth | `POST /auth/forgot-password` | Public | Create reset token response |
| Auth | `POST /auth/reset-password/:token` | Public | Set password from valid reset token |
| Auth | `GET /auth/profile` | User | Read current profile |
| Auth | `PUT /auth/profile` | User | Update name/email |
| Auth | `PUT /auth/change-password` | User | Change password after verifying current password |
| Scan | `POST /scan` | User | Run a passive scan |
| Scan | `GET /scan/history` | User | Paginated history; optional status, domain, search, sort |
| Scan | `GET /scan/:id` | Owner | Get full scan |
| Scan | `GET /scan/:id/headers` | Owner | Get stored response headers |
| Scan | `DELETE /scan/:id` | Owner | Delete own scan |
| Dashboard | `GET /dashboard/stats` | User | Dashboard aggregates, recent scans, trend |
| Dashboard | `GET /dashboard/summary` | User | Compact scan count/latest scan |
| AI | `POST /ai/explain/:scanId` | Owner | Generate or return cached full explanation; supports `?regenerate=true` |
| AI | `GET /ai/explain/:scanId` | Owner | Read cached explanation |
| AI | `POST /ai/finding/:scanId/:ruleId` | Owner | Request explanation of one finding |
| Report | `GET /report/:scanId/pdf` | Owner | Generate/download PDF |
| Report | `GET /report/:scanId/meta` | Owner | Read report metadata |
| Admin | `GET /admin/stats` | Admin | Platform metrics |
| Admin | `GET /admin/users` | Admin | Paginated/filterable users |
| Admin | `GET /admin/users/:id` | Admin | User details and recent scan statistics |
| Admin | `PUT /admin/users/:id/role` | Admin | Change user/admin role |
| Admin | `DELETE /admin/users/:id` | Admin | Delete user and their scans |
| Admin | `GET /admin/scans` | Admin | Paginated/filterable scans across users |

Validation is largely implemented with express-validator. Responses generally
use `{ success, message?, data? }`; errors use `{ success: false, message,
errors? }`, with stack details in development for server errors.

## Scan semantics and scoring

- Target URL validation adds `https://` when no HTTP scheme is supplied,
  permits only HTTP/HTTPS, rejects known local/private hostnames and private
  or reserved IP ranges, checks DNS answers for private IPs, and permits
  explicit ports 80, 443, 8080, or 8443.
- The scanner performs GET requests only. It collects lowercase response
  headers, parsed `Set-Cookie` flags (`Secure`, `HttpOnly`, `SameSite`),
  response status/time, redirect data, and basic HTTPS/server metadata.
- The checked categories include HTTPS and HTTP→HTTPS redirect, security
  headers (including CSP and HSTS), technology disclosure, cookie flags, and
  permissive CORS. The rule engine records evidence, severity, category,
  recommendations, and reference links. Positive results are separated from
  negative findings.
- Scoring starts at 100, subtracts each negative finding's configured
  `scoreImpact`, clamps the result to 0–100, and assigns a grade: A+ (90+), A
  (80–89), B (70–79), C (55–69), D (40–54), F (below 40). The source
  `rules.js` currently contains 24 rule definitions, although its file header
  describes 25.
- A scan document is created in `running` state before the request; it is then
  updated to `completed` or `failed`. This is a synchronous request flow, not
  a durable/background job lifecycle.

## Data model

MongoDB is accessed through Mongoose. The application has two primary models;
Mongoose uses the corresponding `users` and `scans` collections by default.

### User (`backend/models/User.js`)

- `name` (required, trimmed, length 2–50)
- `email` (required, unique, lowercase, trimmed, validated)
- `password` (required, minimum length 8, bcrypt-hashed before save, excluded
  from query results by default)
- `role` (`user` or `admin`, defaults to `user`)
- `isVerified` (boolean, defaults false)
- `resetPasswordToken` and `resetPasswordExpires` (hidden from ordinary query
  results; token is hashed before storage)
- `lastLogin`; Mongoose `createdAt` and `updatedAt`

### Scan (`backend/models/Scan.js`)

- `userId`: required ObjectId reference to `User`
- `url`, `domain`, `status` (`pending`, `running`, `completed`, `failed`)
- `score` (0–100 or null), `grade` (A+, A, B, C, D, F, or null)
- `findings[]`: `ruleId`, `title`, `severity`, `category`, `description`,
  `risk`, `recommendation`, `evidence`, `reference`, and `scoreImpact`
- `findingsSummary`: total and severity counts
- `headers`: map of raw response header names/values
- `cookies[]`: name, secure, httpOnly, sameSite, and issues
- `httpsInfo`: enabled, redirectsToHttps, TLS version, certificate validity,
  HSTS and HSTS max-age fields
- `serverInfo`: status code, server header, redirect count, final URL, and
  response time
- `aiExplanation`: summary, why-it-matters, top risks, quick wins, and
  generated timestamp (see implementation notes below)
- `scanDuration`, `error`, timestamps

Useful indexes support user/time, user/status, creation-time, and domain
queries. There are no SQL tables or explicit transaction boundaries in the
application. `Scan.userId` is the primary declared model relationship.

## Technology and package manifests

### Backend (`backend/package.json`)

- JavaScript, CommonJS, Node.js; no `engines` runtime version is specified.
- Express `^4.22.2`, Mongoose `^8.24.1`, Axios `^1.18.1`
- `@google/generative-ai ^0.21.0`, `pdf-lib ^1.17.1`
- `bcryptjs ^2.4.3`, `jsonwebtoken ^9.0.3`
- `cors ^2.8.6`, `helmet ^7.2.0`, `express-rate-limit ^7.5.1`,
  `express-validator ^7.3.2`, `validator ^13.15.35`
- `dotenv ^16.6.1`, `morgan ^1.11.0`, `winston ^3.19.0`
- Dev: `nodemon ^3.1.14`
- Scripts: `npm run dev`, `npm start`. The `npm test` script is a placeholder
  that exits with an error; no backend test suite is configured by that
  script.

### Frontend (`frontend/package.json`)

- JavaScript/JSX, ES modules; React `^18.3.1`, React DOM `^18.3.1`
- Vite `^5.3.1`, React plugin `^4.3.1`, React Router DOM `^6.24.0`
- Axios `^1.7.2`, Framer Motion `^11.2.12`, React Icons `^5.2.1`
- Chart.js `^4.4.3`, react-chartjs-2 `^5.2.0`
- Tailwind CSS `^3.4.4`, PostCSS `^8.4.38`, Autoprefixer `^10.4.19`
- ESLint `^8.57.0` and React-related ESLint plugins
- Scripts: `npm run dev`, `npm run build`, `npm run preview`, `npm run lint`.
  There is no frontend test script in this manifest.

The root is not an npm workspace/monorepo manifest; install and run commands
are performed separately in `backend/` and `frontend/`. Lockfiles are present
for both packages. `node_modules/` is excluded from the source summary.

## Local setup

1. Install a compatible Node.js/npm runtime (the repository does not pin an
   exact Node version).
2. In `backend/`, install dependencies, copy `.env.example` to `.env`, set
   `MONGO_URI` and a strong `JWT_SECRET`, then run `npm run dev`. The API
   defaults to port 5000 and MongoDB defaults to the local `cybersage`
   database.
3. In `frontend/`, install dependencies and run `npm run dev`. Vite defaults
   to port 5173 and proxies `/api` to the local backend. Set `VITE_API_URL`
   only if the API base URL differs.
4. Gemini explanations need `GEMINI_API_KEY`; without it, the backend returns
   fallback explanations. No live `.env` values or credentials belong in this
   context document or in prompts.

Backend configuration documented in `.env.example` includes server/CORS,
MongoDB, JWT and reset expiry, Gemini model/key, email SMTP settings,
rate-limiting values, scanner timeout/redirect limit, and admin email. Review
`backend/config/config.js` and actual consumers before relying on a setting:
not every declared setting is necessarily wired into runtime behavior.

## Current implementation caveats for future work

These are observations from the current source and are useful when diagnosing
behavior; they are not assumptions about intended product policy.

- Password-reset email delivery is not implemented. The controller logs the
  reset URL and exposes the reset token/URL in development; the SMTP
  configuration is not used by a mailer in the inspected code.
- Refresh JWT secrets/expiry are configured, but there is no refresh-token API
  route or client refresh flow. Current auth uses the access JWT.
- Signup sets `isVerified: false`; no email-verification flow was found.
- The single-finding AI prompt asks for `simpleExplanation`, `impact`,
  `howToFix`, and `codeSnippet`, but the response parser validates the full
  scan explanation keys (`summary`, `whyItMatters`, etc.). This appears to make
  normal single-finding Gemini output fail validation and take its fallback
  path.
- The full-AI controller prepares fields such as `codeExample`,
  `technicalDetails`, `disclaimer`, and `generatedBy` for persistence, while
  the Mongoose `aiExplanation` sub-schema only declares `summary`,
  `whyItMatters`, `topRisks`, `quickWins`, and `generatedAt`. Mongoose's
  default strict schema behavior may discard undeclared subdocument fields;
  verify persistence and UI behavior before extending this feature.
- `frontend/src/utils/constants.js` lists a Reports navigation entry, but the
  actual `Layout` navigation and route table do not expose a standalone
  reports page; report downloads are available from scan history/detail flows.
- The backend rule file header says 25 rules, but static enumeration finds 24
  rule IDs. Check the actual array when documenting or extending coverage.
- Scan result data is gathered and processed synchronously in the API request;
  do not describe it as queued, scheduled, or asynchronously polled work.
- The backend's npm `test` command is a placeholder; do not claim that tests
  pass unless an actual test command/suite has been added and run.

## Guidance for future AI requests

- Start from the actual source and package manifests; this context may become
  stale.
- Keep changes focused on the requested behavior. Preserve existing API
  response shapes, auth/ownership checks, scan semantics, and Mongoose fields
  unless a requirement explicitly changes them.
- For endpoint changes, trace the route → controller/model/service and the
  frontend service/page/hook caller.
- Do not call this system a penetration tester or claim it finds application
  code vulnerabilities; its implemented checks are passive HTTP
  configuration checks.
- Never read, print, or commit `backend/.env` or `frontend/.env`; use
  `.env.example` for configuration names and safe defaults.
- Treat any security-sensitive change (especially URL validation, outbound
  request behavior, auth, token storage, and admin ownership boundaries) as
  requiring targeted security review and tests.
