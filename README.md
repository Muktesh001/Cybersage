# CyberSage

## AI-Powered Passive Web Security Configuration Auditor

CyberSage is a full-stack web security configuration auditing platform designed to identify common security misconfigurations in publicly accessible web applications.

The platform performs controlled, read-only HTTP analysis to evaluate HTTPS configuration, security headers, cookies, CORS policies, and server information. A rule-based Security Rule Engine analyzes the collected configuration, assigns risk severity, calculates a security score, and provides evidence and remediation recommendations.

CyberSage also integrates Google Gemini to convert technical security findings into understandable explanations and actionable remediation guidance.

> CyberSage focuses on passive security configuration auditing. It does not perform vulnerability exploitation or penetration testing.

---

## Features

### Security Configuration Auditing

CyberSage analyzes publicly observable security configurations including:

* HTTPS availability
* HTTP to HTTPS redirection
* HTTP Strict Transport Security (HSTS)
* Content Security Policy (CSP)
* X-Frame-Options
* X-Content-Type-Options
* Referrer-Policy
* Permissions-Policy
* Cross-Origin-Opener-Policy (COOP)
* Cross-Origin-Embedder-Policy (COEP)
* Cross-Origin-Resource-Policy (CORP)
* Cache-Control
* CORS configuration
* Cookie security attributes
* Server information disclosure
* X-Powered-By disclosure
* Deprecated security headers

### Rule-Based Security Analysis

The Security Rule Engine evaluates predefined security rules and generates findings containing:

* Rule ID
* Finding title
* Severity
* Evidence
* Description
* Recommendation
* Score impact

The rule engine provides deterministic security detection and scoring rather than relying on AI to decide whether a configuration is insecure.

### Security Score

Every scan starts with a baseline score of 100.

Score impacts from detected security findings are deducted from the baseline and the final score is limited to the range 0–100.

| Score    | Grade |
| -------- | ----- |
| 90–100   | A+    |
| 80–89    | A     |
| 70–79    | B     |
| 55–69    | C     |
| 40–54    | D     |
| Below 40 | F     |

### AI-Assisted Security Explanation

Google Gemini is used to provide:

* Security finding explanations
* Security impact
* Risk understanding
* Quick-win recommendations
* Remediation guidance
* Developer-oriented explanations

AI is used as an explanation and remediation layer. The authoritative detection, severity classification, and score are determined by the rule engine.

A rule-based fallback is available when the AI service is unavailable or its response cannot be processed.

### Dashboard

The dashboard provides:

* Overall security statistics
* Average security score
* Findings by severity
* Recent scans
* Seven-day score trends
* Scan summaries

### Scan History

Users can:

* View previous scans
* Search scan history
* Filter scan status
* Sort results
* View detailed scan results
* Delete scans
* Download security reports

### PDF Reports

CyberSage generates server-side PDF reports containing security assessment results and findings.

### Authentication

CyberSage provides:

* User registration
* User login
* JWT-based authentication
* Password hashing using bcrypt
* Profile management
* Password change
* Password reset functionality

### Admin Management

Administrators can access platform-wide information including:

* User statistics
* Scan statistics
* User management
* Scan management
* User role management

---

# System Architecture

CyberSage follows a modular full-stack architecture consisting of a React frontend, Express backend, security scanning and rule-processing services, AI analysis, and MongoDB.

```text
                         ┌─────────────────────────┐
                         │        User             │
                         │  Web Browser / Client    │
                         └────────────┬────────────┘
                                      │
                                      │ HTTP / REST API
                                      ▼
                         ┌─────────────────────────┐
                         │     React Frontend      │
                         │      React + Vite       │
                         │                         │
                         │  Dashboard              │
                         │  Scan Interface         │
                         │  Results                 │
                         │  History                 │
                         │  Authentication         │
                         │  Admin Panel             │
                         └────────────┬────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │    Express Backend      │
                         │        Node.js           │
                         │                         │
                         │  API Routes             │
                         │  Controllers             │
                         │  Middleware              │
                         │  Validation              │
                         └────────────┬────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
          ┌─────────────────┐ ┌────────────────┐ ┌─────────────────┐
          │ Security        │ │ Rule Engine    │ │ Authentication  │
          │ Scanner         │ │                │ │                 │
          │                 │ │ Security Rules │ │ JWT             │
          │ HTTP/HTTPS      │ │ Severity       │ │ bcrypt          │
          │ Headers         │ │ Evidence       │ │ Authorization   │
          │ Cookies         │ │ Score Impact    │ │                 │
          │ CORS            │ │ Recommendations│ │                 │
          │ Server Info     │ │                │ │                 │
          └────────┬────────┘ └───────┬────────┘ └─────────────────┘
                   │                  │
                   └──────────┬───────┘
                              │
                              ▼
                   ┌──────────────────────┐
                   │    Scan Result       │
                   │                      │
                   │ Findings              │
                   │ Severity              │
                   │ Score                 │
                   │ Grade                 │
                   │ Evidence              │
                   └───────────┬──────────┘
                               │
                 ┌─────────────┴──────────────┐
                 │                            │
                 ▼                            ▼
      ┌────────────────────┐       ┌────────────────────┐
      │ Google Gemini AI   │       │     MongoDB        │
      │                    │       │                    │
      │ Explanation        │       │ Users              │
      │ Impact             │       │ Scans              │
      │ Quick Wins         │       │ Findings           │
      │ Remediation        │       │ Headers            │
      └──────────┬─────────┘       │ Cookies            │
                 │                 │ AI Explanation     │
                 │                 └────────────────────┘
                 ▼
      ┌─────────────────────────┐
      │ Security Report         │
      │                         │
      │ Dashboard               │
      │ Detailed Results        │
      │ Scan History            │
      │ PDF Report              │
      └─────────────────────────┘
```

---

# Scan Processing Flow

```text
User submits authorized URL
            │
            ▼
     URL Validation
            │
            ▼
     Network / Host Checks
            │
            ▼
       HTTP Request
            │
            ▼
 ┌───────────────────────────┐
 │ Collect Public Information│
 │                           │
 │ HTTPS                     │
 │ Redirects                 │
 │ Security Headers          │
 │ Cookies                   │
 │ CORS                      │
 │ Server Information        │
 └─────────────┬─────────────┘
               │
               ▼
       Normalize Scan Data
               │
               ▼
      Security Rule Engine
               │
               ▼
     Findings + Severity
               │
               ▼
      Security Score/Grade
               │
               ▼
       Google Gemini AI
               │
               ▼
 AI Explanation + Remediation
               │
               ▼
          MongoDB
               │
               ▼
 Dashboard / History / PDF
```

---

# Security Assessment Scope

CyberSage evaluates security configuration conditions across the following categories.

## 1. HTTPS and Transport Security

* HTTPS availability
* HTTP to HTTPS redirection
* HSTS presence
* HSTS configuration

## 2. Security Headers

* Content Security Policy
* X-Frame-Options
* X-Content-Type-Options
* Referrer-Policy
* Permissions-Policy
* Cross-Origin-Opener-Policy
* Cross-Origin-Embedder-Policy
* Cross-Origin-Resource-Policy
* Cache-Control
* CORS configuration

## 3. Cookie Security

CyberSage evaluates cookie attributes such as:

* Secure
* HttpOnly
* SameSite

It can identify potentially insecure cookie configurations.

## 4. Information Disclosure

The scanner checks for unnecessary technology disclosure through:

* Server header
* X-Powered-By header
* Other observable server information

---

# What CyberSage Does Not Perform

CyberSage is a passive configuration auditing platform and does not perform:

### Penetration Testing

* SQL Injection exploitation
* Cross-Site Scripting exploitation
* CSRF exploitation
* Authentication bypass
* Vulnerability exploitation

### Infrastructure Security Testing

* Port scanning
* Firewall testing
* DNS security testing
* TLS cipher analysis
* Infrastructure vulnerability scanning

### Application Security Testing

* Business logic testing
* API discovery
* Input validation testing
* Authorization testing

### Performance Testing

* Load testing
* Stress testing
* Performance benchmarking

CyberSage only analyzes publicly observable security configuration information through controlled requests.

---

# Technology Stack

## Frontend

* React 18
* Vite
* Tailwind CSS
* Framer Motion
* Chart.js
* React Chart.js 2
* React Icons
* Axios

## Backend

* Node.js
* Express.js
* Mongoose
* Axios
* CommonJS

## Database

* MongoDB

## Authentication & Security

* JWT
* bcryptjs
* Bearer Authentication
* Role-based authorization

## Artificial Intelligence

* Google Gemini

## Reporting

* Server-side PDF generation

---

# Project Structure

```text
CyberSage/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── routes/
│   │   └── ...
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── server/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── scanner/
│   ├── ...
│   └── package.json
│
├── .gitignore
├── README.md
└── ...
```

---

# Main API Endpoints

## Authentication

```text
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/forgot-password
POST /api/auth/reset-password/:token
GET  /api/auth/profile
PUT  /api/auth/profile
PUT  /api/auth/change-password
```

## Scanning

```text
POST   /api/scan
GET    /api/scan/history
GET    /api/scan/:id
GET    /api/scan/:id/headers
DELETE /api/scan/:id
```

## Dashboard

```text
GET /api/dashboard/stats
GET /api/dashboard/summary
```

## AI Analysis

```text
POST /api/ai/explain/:scanId
POST /api/ai/finding/:scanId/:ruleId
```

## Reports

```text
GET /api/report/:scanId/pdf
GET /api/report/:scanId/meta
```

## Administration

Administrative endpoints are available under:

```text
/api/admin
```

---

# Installation

## Prerequisites

Make sure the following are installed:

* Node.js
* npm
* MongoDB
* Git

---

## 1. Clone the Repository

```bash
git clone https://github.com/Muktesh001/Cybersage.git
```

Move into the project:

```bash
cd Cybersage
```

---

# 2. Install Frontend Dependencies

```bash
cd client
npm install
```

---

# 3. Install Backend Dependencies

Open another terminal or return to the root:

```bash
cd ../server
npm install
```

---

# 4. Environment Variables

Create the required environment files locally.

Example:

```text
server/.env
```

Do not commit `.env` files to GitHub.

A `.env.example` file should contain variable names without real secrets.

Example:

```env
PORT=
MONGO_URI=
JWT_SECRET=
GEMINI_API_KEY=
```

Use your own local values.

---

# 5. Start the Backend

From the server directory:

```bash
npm start
```

or use the development command defined in the project.

---

# 6. Start the Frontend

From the client directory:

```bash
npm run dev
```

Vite will provide the local development URL.

---

# Security and Privacy

CyberSage is designed for authorized and publicly accessible targets.

Users should only scan websites for which they have permission to perform security configuration assessment.

The scanner performs controlled HTTP requests and does not intentionally exploit vulnerabilities.

Sensitive credentials, API keys, JWT secrets, database credentials, and environment configuration must never be committed to the repository.

---

# Security Rule Engine

The Security Rule Engine is the deterministic core of CyberSage.

The general processing model is:

```text
Collected Configuration
          │
          ▼
    Rule Evaluation
          │
          ▼
 ┌────────────────────┐
 │ Security Finding   │
 │                    │
 │ Rule ID            │
 │ Evidence           │
 │ Severity           │
 │ Recommendation     │
 │ Score Impact       │
 └─────────┬──────────┘
           │
           ▼
     Score Calculation
           │
           ▼
       Final Grade
```

This approach separates authoritative security detection from AI-generated explanations.

---

# AI Analysis

CyberSage integrates Google Gemini as an AI-assisted explanation layer.

The AI receives structured scan findings and generates developer-oriented security guidance.

The AI analysis can help explain:

```text
Security Finding
       │
       ▼
Why it matters
       │
       ▼
Potential impact
       │
       ▼
Quick wins
       │
       ▼
How to fix
```

The rule engine remains responsible for the actual security finding and score.

If AI processing fails or is unavailable, CyberSage can provide rule-based fallback guidance.

---

# Database Model

CyberSage primarily uses two important data entities.

## User

```text
User
├── name
├── email
├── password
├── role
├── isVerified
├── resetToken
├── resetTokenExpiry
├── lastLogin
└── timestamps
```

## Scan

```text
Scan
├── userId
├── url
├── domain
├── status
├── score
├── grade
├── findings
├── findingsSummary
├── headers
├── cookies
├── httpsInfo
├── serverInfo
├── aiExplanation
├── scanDuration
├── error
└── timestamps
```

---

# Security Scoring

CyberSage starts each assessment with:

```text
100 points
```

Detected negative findings reduce the score according to their configured rule impact.

```text
Final Score = 100 - Total Score Impact
```

The resulting score is constrained between:

```text
0 and 100
```

The score is then converted into a security grade.

---

# Research Contribution

CyberSage combines multiple security-assessment capabilities within a single developer-oriented platform:

1. Passive web security configuration assessment
2. Deterministic rule-based security analysis
3. Severity-based finding classification
4. Quantitative security scoring
5. AI-assisted security explanation
6. Actionable remediation guidance
7. Dashboard-based security monitoring
8. Scan history and reporting

The primary focus is to make security configuration analysis easier to understand and act upon, especially for developers and users who may not have extensive cybersecurity expertise.

---

# Future Enhancements

Potential future improvements include:

* Conversational security assistant
* Expanded security rule coverage
* Improved AI remediation explanations
* Automated remediation verification
* Scheduled security scans
* Email notifications
* Advanced TLS analysis
* Additional report formats
* Security trend monitoring
* More comprehensive API security checks
* Integration with CI/CD pipelines

---

# Collaboration

CyberSage uses Git branches and pull requests for collaborative development.

Recommended workflow:

```text
main
 │
 ├── feature/scanner
 ├── feature/ai-analysis
 ├── feature/dashboard
 ├── feature/pdf-report
 └── fix/security-rule
```

Create a feature branch:

```bash
git checkout -b feature/your-feature
```

Make changes and commit:

```bash
git add .
git commit -m "Describe your change"
```

Push the branch:

```bash
git push -u origin feature/your-feature
```

Create a Pull Request on GitHub and merge into `main` after review.

---

# Git Workflow

Update your local repository:

```bash
git checkout main
git pull origin main
```

Create a new feature branch:

```bash
git checkout -b feature/new-feature
```

After development:

```bash
git add .
git commit -m "Add new feature"
git push -u origin feature/new-feature
```

---

# Contributors

CyberSage is developed as a final-year Computer Science and Engineering project.

**Project Repository:**
https://github.com/Muktesh001/Cybersage

---

# License

This project is intended for educational and research purposes.

Before adding an open-source license, choose an appropriate license based on how you want others to use, modify, and distribute the project.
