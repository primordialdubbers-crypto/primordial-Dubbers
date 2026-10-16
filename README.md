# PDI Voice Artist Ranking System

An authoritative, full-stack voice dubbing academy and artist ranking platform built for **Primordial Dubbers India (PDI)**.

---

## 📁 Repository Structure (Folder Guide)

The repository is organized into a clean, modern monorepo where each folder has a single, clear responsibility:

```
Ranking_System/
├── apps/
│   ├── api/             # 🛠️ Backend Server (Node.js + Express + MongoDB + Vitest)
│   │   ├── src/         # API routes, Mongoose models, RBAC, services, transaction runner
│   │   ├── test/        # Automated API integration and unit test suite (89+ tests)
│   │   └── package.json # Backend dependencies and scripts
│   │
│   ├── web/             # 🌐 Web Application (React 18 + Vite + Tailwind CSS + Lucide)
│   │   ├── src/         # Pages, components, audio recorder studio, auth context
│   │   └── package.json # Frontend dependencies and Vite configuration
│   │
│   └── android/         # 📱 Android Mobile App (Capacitor Native Shell)
│       └── app/         # Native Android Studio project structure & assets
│
├── packages/
│   └── shared/          # 📦 Shared Domain Library (TypeScript)
│       ├── src/         # Common TypeScript types, Zod schemas, rank calculation & rubric rules
│       └── package.json # Shared package referenced by both api and web
│
├── docs/                # 📚 Product Documentation & Architecture
│   ├── PDI_MASTER_PRD.md               # Master Product Requirements Document (PRD v2.1)
│   ├── ORIGINAL_TECHNICAL_BLUEPRINT.md # Architecture blueprint
│   ├── IMPLEMENTATION_PLAN.md          # Multi-phase roadmap and milestones
│   └── DECISIONS.md                    # Architectural decision records (ADRs)
│
├── .env.example         # ⚙️ Example environment configuration
├── package.json         # 🚀 Root workspace scripts (dev, build, test, db:init)
└── README.md            # 📖 This documentation file
```

---

## ⚡ Quick Start & Available Scripts

Run all commands from the repository root:

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the web frontend application (Vite dev server on `http://localhost:5173`) |
| `npm run dev:web` | Starts the web frontend on port 5173 |
| `npm run dev:api` | Starts the backend API server with live reloading on port 4000 |
| `npm run db:init` | Populates MongoDB with default challenges, auditions, artist profiles, and admin account |
| `npm test` | Runs the full automated backend test suite (89+ tests passing) |
| `npm run build` | Builds all packages (shared, api, web) and synchronizes Capacitor Android |
| `npm run android:sync` | Synchronizes web build artifacts into the Capacitor Android app |
| `npm run android:open` | Opens the native Android project in Android Studio |

---

## 🔐 Default Admin Account & MongoDB Auto-Initialization

Whenever the backend API starts (`npm run dev:api`), it automatically runs an `ensureAdminUser()` routine that inspects MongoDB:

- **If no administrator exists**, it automatically creates the default administrator account with a bcrypt-hashed password in MongoDB and provisions the corresponding `artistProfiles` record.
- **Dynamic Authentication**: All user and administrator logins authenticate dynamically against MongoDB via `POST /api/v1/auth/login`.

### Default Credentials:
- **Admin Console**: `primordialdubbers@gmail.com` / `Admin@123456` *(Role: admin, superadmin)*

To customize default admin credentials, configure environment variables in `.env`:
```bash
ADMIN_DEFAULT_EMAIL=primordialdubbers@gmail.com
ADMIN_DEFAULT_PASSWORD=Admin@123456
ADMIN_INVITE_TOKEN=pdi_admin_invite_secret_dev
```

---

## 🎯 100% Dynamic Architecture (No Static Data)

Every dashboard, ledger, talent board, audition list, and challenge view is strictly dynamic and powered by MongoDB:
1. **Public Leaderboard**: Dynamic sorted query of verified artist profiles with real-time tier and search filters (`/api/v1/leaderboard`).
2. **Student Dashboard & Auditions**: Real-time take history, submission status, audio playback, and 100-point director rubric reviews (`/api/v1/submissions/my`).
3. **Browser Dubbing Studio**: In-browser audio recording via MediaRecorder API, live microphone VU meters, and synchronization with active MongoDB challenges.
4. **Director Evaluation Workspace**: Live audition review queue with synchronized dual audio/video playback and a 100-point rubric breakdown (`/api/v1/director/review-queue`).
5. **Admin Console & Approval Queue**: Real-time point proposals and sensitive deduction approvals (`/api/v1/admin/point-proposals`).
6. **Immutable Points Ledger**: Transactional point ledger with non-negative balance enforcement, demotion triggers, and student appeal resolution (`/api/v1/me/points`, `/api/v1/me/appeals`).
7. **Clean Empty States**: Clean, user-friendly empty state cards are rendered whenever a database collection has no records (e.g., *"No submissions yet"*, *"No challenges currently active"*).

---

## 🏆 Official PDI Rank Hierarchy

| Tier | Rank Title | Verified Point Threshold | Eligibility / Priority |
| :---: | :--- | :--- | :--- |
| **ED** | Baseline Artist | 0 – 999 pts | Academy entry tier |
| **C** | Developing Dubber | 1,000 – 4,999 pts | Fundamental lip-sync and character voice takes |
| **B** | Intermediate Artist | 5,000 – 11,999 pts | Commercial voiceover and broadcast dubbing |
| **A** | Advanced Talent | 12,000 – 24,999 pts | Lead animation roles and multi-language takes |
| **S** | Elite Priority | 25,000+ pts | Direct casting priority for major productions |

*Note: Demotion is strictly enabled upon approved deductions. An artist whose balance drops below a tier threshold is demoted immediately with an automated notification.*

---

## 🛡️ Testing & Verification

Run the entire automated test suite:
```bash
npm test
```
Vitest executes all integration and unit tests covering:
- Administrator auto-initialization in MongoDB
- Authentication, session security & RBAC permissions
- Atomic ledger mutations & rank boundary calculations
- Proposal idempotency & duplicate review prevention
- Student deduction appeals & administrative reversals
- Audition submission processing & director 100-point rubric scoring
# primordial-Dubbers
