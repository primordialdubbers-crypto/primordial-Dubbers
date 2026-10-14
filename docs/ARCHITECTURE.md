# PDI Voice Artist Ranking System — Architecture Specification

## 1. System Topology Overview
The PDI Voice Artist Ranking System is organized as a modular, type-safe monorepo:
```
Ranking_System/
├── apps/
│   ├── api/                 # Node.js + Express + TypeScript Backend
│   │   ├── src/
│   │   │   ├── config/      # Environment, DB, tokens configuration
│   │   │   ├── middleware/  # Auth (JWT/Cookie), RBAC, Rate-limiting, Error handling
│   │   │   ├── models/      # Mongoose schemas (User, ArtistProfile, etc.)
│   │   │   ├── routes/      # Express route controllers (/api/v1/auth, etc.)
│   │   │   ├── services/    # Business logic (Ledger, RankEngine, AuthService)
│   │   │   └── app.ts       # Express app setup
│   │   └── test/            # Integration & unit tests (Vitest / Jest)
│   └── web/                 # React + TypeScript + Vite Frontend
│       ├── src/
│       │   ├── components/  # Atomic UI elements, Navbars, Sidebars, Modals
│       │   ├── layouts/     # PublicLayout, StudentLayout, DirectorLayout, AdminLayout
│       │   ├── pages/       # Screen views (Landing, Auth, Dashboards, Queue, Approvals)
│       │   ├── context/     # AuthContext, ThemeContext, QueryClient
│       │   └── theme/       # Design tokens (Combo 03 for User, Combo 05 for Admin)
├── packages/
│   └── shared/              # Shared TypeScript definitions, Enums, Zod validation
└── docs/                    # PRD, Architecture, Decisions, Implementation Plan
```

---

## 2. Security & RBAC Architecture

### Roles Matrix
| Capability | Public Visitor | Student | Casting Director | Admin | Super-admin |
|---|:---:|:---:|:---:|:---:|:---:|
| View Landing, Rules, Public Leaderboard | Yes | Yes | Yes | Yes | Yes |
| Register (default: Student) & Login | Yes | Yes | Yes | Yes | Yes |
| View Challenges & Audition Library | No | Yes | Yes | Yes | Yes |
| Submit Audition (Record / Upload) | No | Yes | No | No | No |
| View Own Submissions, Ledger & Profile | No | Yes | No | No | No |
| Submit Deduction Appeal | No | Yes | No | No | No |
| View Assigned Review Queue | No | No | Yes | Yes | Yes |
| Evaluate Submissions (100-pt Rubric) | No | No | Yes | Yes | Yes |
| Propose Point Awards / Deductions | No | No | Yes | Yes | Yes |
| Approve / Reject Point Proposals | No | No | No | Yes | Yes |
| Resolve Appeals | No | No | No | Yes | Yes |
| Manage Users, Challenges & System Settings | No | No | No | Yes | Yes |
| Manage Sensitive Admin Roles & Audit Logs | No | No | No | No | Yes |

### Authentication Foundation (Phase 1)
1. **Password Security**:
   - Industry-standard hashing using Argon2id / Bcrypt with configurable cost parameters.
   - Password policy: Minimum 8 characters, requiring mixed alphanumeric characters.
2. **Session & Tokens**:
   - Dual-token capability: Secure, HttpOnly, SameSite=Strict cookies for browser clients with Bearer token authorization fallback for API/mobile clients.
   - JWT payload carries user ID, email, roles list, and active status.
   - Token expiration: Short-lived access tokens (15m-1h) paired with refresh token cycle.
3. **Defense in Depth**:
   - `helmet` security headers.
   - Rate limiting on authentication routes (preventing brute-force).
   - Strict Zod schema validation on request payloads before hitting business logic.
   - Centralized error handler preventing information leakage (stack traces obscured in production).

---

## 3. Database & Data Models

### Core Collections
1. **`users`**:
   - `_id`: ObjectId
   - `email`: String (lowercase, trimmed, unique index)
   - `displayName`: String
   - `passwordHash`: String
   - `roles`: Array of Enums (`student`, `director`, `admin`, `superadmin`)
   - `status`: Enum (`active`, `suspended`, `pending_verification`)
   - `createdAt`, `updatedAt`: Timestamps
2. **`artistProfiles`**:
   - `_id`: ObjectId
   - `userId`: ObjectId (unique FK -> `users`)
   - `displayName`: String
   - `bio`: String
   - `voiceTypes`: Array of Strings
   - `publicOptIn`: Boolean (default: true for leaderboard visibility)
   - `rankPoints`: Number (default: 0, nonnegative)
   - `currentRank`: Enum (`ED`, `C`, `B`, `A`, `S`)
   - `performanceAverage`: Number
   - `version`: Number (optimistic locking)
3. **`pointProposals`** (Phase 2 & 3):
   - Proposal metadata, requester, requested delta, reason, status (`pending`, `approved`, `rejected`), idempotencyKey.
4. **`pointTransactions`** (Phase 2 & 3):
   - Immutable append-only ledger entries with `balanceBefore`, `balanceAfter`, `delta`, `idempotencyKey` unique.
5. **`rankEvents`** (Phase 2):
   - Audit trail of all rank changes (`oldRank`, `newRank`, `triggeringTransactionId`).

---

## 4. Frontend Design System & Theme Engine

### Color Themes & Visual Identity
1. **Admin Panel Theme** (Combo 05):
   - Primary Accent: Lime Sprout (`#E4FD97`)
   - Secondary / Surface Accent: Fresh Canopy (`#2D3E2C`)
   - Theme context provides `theme-admin` class styling administrative dashboards, queues, and configuration panels.
2. **User / Student Theme** (Combo 03):
   - Primary Accent: Cyber Lime (`#B6FF00`)
   - Secondary Accent / Container: Charcoal Violet (`#3C1A47`)
   - Theme context provides `theme-user` styling student studio, audition cards, and profile hero.
3. **Dark Cinematic Canvas**:
   - Deep Background: `#080D17`
   - Dark Card / Elevated Surface: `#121D30`
   - Border / Divider: `#1E2C45`
   - Text Primary: `#F8FAFC`, Secondary: `#94A3B8`
4. **Rank Tokens**:
   - ED: `#8A99AD`
   - C: `#4E97C2`
   - B: `#168DFF`
   - A: `#D5A02E`
   - S: `#D95436`
