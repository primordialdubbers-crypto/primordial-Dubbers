# PDI Voice Artist Ranking System — Implementation Plan

This implementation plan aligns strictly with `docs/PDI_MASTER_PRD.md` and `AGENTS.md`. It outlines the 8 phased deliverables, acceptance criteria, security checkpoints, and the immediate execution boundary for Phase 1.

---

## Phase Breakdown

### Phase 1: Repository Foundation, Design System, Authentication & Server-Side RBAC (Current Target)
- **Scope**:
  - Monorepo structure (`packages/shared`, `apps/api`, `apps/web`).
  - Shared TypeScript contracts: Roles, Rank tiers, User DTOs, Zod validation schemas.
  - Express API foundation: Config, Helmet, CORS, Cookie-parser, Rate limiting, MongoDB connection.
  - User & ArtistProfile Mongoose models with proper indexes.
  - Authentication engine: Password hashing (Bcrypt/Argon2), JWT signing/verification, HttpOnly cookie support, Auth middleware, and Role-Based Access Control (`requireAuth`, `requireRole`).
  - Auth routes: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`.
  - Frontend foundation: React 18 + Vite + Tailwind CSS + Lucide React + React Router.
  - Grounded Color Themes:
    - User UI theme (`#3C1A47` Charcoal Violet, `#B6FF00` Cyber Lime - Combo 03).
    - Admin UI theme (`#2D3E2C` Fresh Canopy, `#E4FD97` Lime Sprout - Combo 05).
    - Dark cinematic esports baseline (`#080D17`, `#121D30`, rank badges).
  - Responsive layouts: PublicLayout, StudentLayout, DirectorLayout, AdminLayout with navigation guards and user state.
  - Automated tests: Integration tests verifying registration, login, logout, password hashing, and RBAC route security.

### Phase 2: Artist Profiles, Points Ledger & Atomic Rank Engine
- **Scope**:
  - `pointTransactions` immutable collection, `pointProposals` collection, `rankEvents` audit collection.
  - ACID transaction algorithm for points addition/deduction.
  - Strict rank threshold calculator (ED: 0-999, C: 1000-4999, B: 5000-11999, A: 12000-24999, S: >=25000).
  - Demotion handling when approved deductions cross boundaries.
  - Idempotency key deduplication.
  - Unit and boundary test suites (0, 999, 1000, 4999, 5000, 11999, 12000, 24999, 25000, 50000+).

### Phase 3: Director Recommendations & Admin Approval Queue
- **Scope**:
  - Director point proposal endpoint (`POST /api/v1/director/point-proposals`).
  - Admin approval/rejection endpoints with transaction commit and audit logging.
  - Appeals submission (`POST /api/v1/me/appeals`) and admin resolution (`POST /api/v1/admin/appeals/:id/resolve`).
  - Transaction reversal logic (additive inverse entry).

### Phase 4: Challenges, Audition Library & Media Storage Abstraction
- **Scope**:
  - Challenges CRUD and role permissions.
  - Media asset metadata model and presigned upload intent abstraction.
  - Secure validation: MIME verification, duration/size limits, antivirus/scan status hook.
  - Student submissions collection and take management.

### Phase 5: Director Evaluation Workspace & 100-Point Rubric
- **Scope**:
  - Review queue for casting directors (`GET /api/v1/director/review-queue`).
  - 100-point rubric submission: Acting (25), Timing (20), Pronunciation (20), Expression (20), Audio (15).
  - Timestamped comments and qualitative feedback.
  - Clear separation between rubric scoring and rank point proposal generation.

### Phase 6: Browser Dubbing Studio & Media Playback
- **Scope**:
  - Web Audio / MediaRecorder browser recording with permission prompts and MIME detection.
  - Waveform visualization (Wavesurfer.js) and reference video player.
  - Latency / sync offset adjustment slider (-500ms to +500ms).
  - Pre-submission preview and re-record controls.

### Phase 7: Leaderboards, Notifications, Achievements & Casting Board
- **Scope**:
  - Public and opted-in artist leaderboard with deterministic tie-breaking.
  - In-app notification system (points awarded, rank changed, appeal resolved).
  - Casting Director shortlist and talent search board.

### Phase 8: Hardening, E2E Verification & Production Deployment Prep
- **Scope**:
  - Comprehensive E2E test runs.
  - Security audit: CSRF, rate limits, OWASP top 10 compliance, sanitization.
  - Accessibility audit (WCAG AA compliant contrast, keyboard navigation).
  - Production build optimizations and Docker/deployment configuration.

---

## Phase 1 Acceptance Checklist
- [x] Monorepo workspace initialized with clean package management.
- [x] Shared validation schemas (Zod) and TypeScript types for User, Role, Rank, and Auth.
- [x] Express backend configured with Helmet, CORS, Cookie parser, Rate limiting, and Mongo connection.
- [x] User registration with email normalization, password hashing, and role defaulting.
- [x] Authentication tokens (JWT) and HttpOnly cookie issuance.
- [x] Server-side RBAC middleware (`requireAuth`, `requireRole`) blocking unauthorized access.
- [x] Responsive React frontend with Vite, Tailwind CSS, Lucide icons, and React Router.
- [x] Color theme variables implemented for Admin (`#2D3E2C`, `#E4FD97`) and User (`#3C1A47`, `#B6FF00`).
- [x] Public, Student, Director, and Admin layout wrappers with responsive navigation and authorization guards.
- [x] Automated test suite executed verifying auth flows and RBAC security boundaries.

---

## Phase 2 Acceptance Checklist
- [x] Immutable `pointTransactions` collection schema with `balanceBefore`, `balanceAfter`, `delta`, `idempotencyKey` unique index.
- [x] `pointProposals` collection schema for Director recommendations and Admin approvals queue.
- [x] `rankEvents` audit collection for tracking promotions and demotions.
- [x] Multi-document ACID transaction runner with MongoDB replica set support and graceful standalone fallback for local test environments.
- [x] Server-authoritative nonnegative balance protection (`Math.max(0, oldBalance + delta)`).
- [x] Strict rank threshold engine: ED (0-999), C (1,000-4,999), B (5,000-11,999), A (12,000-24,999), S (>=25,000).
- [x] Authoritative demotion on approved negative point deductions crossing boundaries.
- [x] Idempotency key deduplication preventing duplicate transactions on retried requests.
- [x] Comprehensive automated test suite (41 tests passing) covering transactions, idempotency, promotions, demotions, balance clamping, and RBAC guards.
- [x] Accompanying frontend views: Points Ledger (`PointsLedgerPage.tsx`), Artist Profile (`ArtistProfilePage.tsx`), Public Artist Card (`PublicArtistProfilePage.tsx`), and Admin Command queue (`AdminOverview.tsx`).
- [x] Full monorepo build verified clean (`npm run build`).

