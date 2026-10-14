# PDI Voice Artist Ranking System — Master Product Requirements Document
Version 2.1 | Status: approved planning baseline | Owner: Primordial Dubbers India

## Mission
Build a responsive, secure voice-artist academy and audition platform where students dub scenes, submit browser-recorded or uploaded audio, casting directors assess quality and recommend points, and admins manage awards, sensitive deductions, and automatic rank promotion/demotion. Use the supplied ranking poster as brand inspiration, not as a complete UI specification.

## Locked product decisions
1. Rank demotion IS enabled: after an approved negative point transaction, recalculate current rank immediately.
2. Casting directors submit evaluations and point recommendations. Admins approve sensitive deductions; MVP default is admin approval for all point changes, with later configurable auto-approval for routine awards.
3. Students can both record audio in-browser and upload pre-recorded audio.
4. All points are server-authoritative, auditable, nonnegative in balance, and never modified directly by the client.
5. Student performance reviews use a 100-point rubric; review score is separate from rank points.

## Roles
- Public visitor: landing page, rules, public opted-in leaderboard, login/registration.
- Student: view challenges, record/upload submissions, review own history and feedback, track points/rank, appeal deductions, edit own profile.
- Casting director: view assigned submissions, playback media, rubric scoring, timestamped feedback, recommend awards/deductions, shortlist artists, manage assigned casting opportunities.
- Admin: manage users/roles, challenges, director assignments, approval queue, deductions, appeals, rank configuration, audits and moderation. Super-admin can manage sensitive settings and admin permissions.

## Rank thresholds
- ED: 0–999, Entry / Beginner
- C: 1,000–4,999, Developing Artist
- B: 5,000–11,999, Intermediate Artist
- A: 12,000–24,999, Advanced Artist
- S: 25,000–50,000, Elite / Professional Artist
Clarification to resolve before production: whether points above 50,000 are capped or continue accumulating with S rank. Default proposal: balance may exceed 50,000 while rank remains S, preserving ledger fidelity; show 50,000 as display milestone. Never silently discard earned points.

## Award catalog (admin configurable)
- Valid audition submitted: +20
- Training session completed: +50
- Excellent performance review: +50
- Approved dubbing role: +100
- Difficult scene mastery: +100
- Quality & consistency milestone: +200
These are suggested business rules; avoid automatically awarding for spam/duplicate submissions. Enforce unique award event keys.

## Suggested deduction policy (admin configurable)
- Minor pronunciation issue: -10
- Repeated lip sync issue: -20
- Audio quality after warning: -25
- Missed approved deadline: -30
- Repeated incomplete submission: -40
- Plagiarism/fraud: manual investigation, no automatic penalty.
Deductions need category, human-readable reason, relevant evidence, director recommendation or admin initiation, admin approval for sensitive actions, student notification and appeal path. Ordinary performance weaknesses should primarily be coaching feedback, not punitive deductions. Document policy and proportionality before rollout.

## Review rubric (100 total)
- Voice acting and emotion: 25
- Lip sync and timing: 20
- Pronunciation: 20
- Character expression: 20
- Audio quality: 15
Allow timestamp-specific comments and optional evidence. Review scores must not directly mutate rank points. A separately approved point proposal does.

## Screen inventory (17 primary screens)
PUBLIC (4): 1 Landing; 2 Rank system/rules; 3 Public leaderboard; 4 Login/registration.
STUDENT (6): 5 Dashboard; 6 Audition library; 7 Dubbing studio; 8 My submissions; 9 Feedback/points ledger/appeals; 10 Profile/achievements.
DIRECTOR (3): 11 Review queue; 12 Evaluation workspace; 13 Casting board.
ADMIN (4): 14 Overview; 15 User management; 16 Reviews/approval/appeals; 17 System settings (rank rules, point catalog, challenges, audit logs as tabs).
Provide responsive desktop/tablet/mobile designs, empty/loading/error states, accessible controls and permissions-driven navigation.

## Core workflows
A. Student selects challenge -> watches permitted reference video -> records via MediaRecorder with microphone permission OR uploads audio -> previews and syncs -> submits -> receives status -> director reviews -> proposal -> admin approval -> atomic points posting -> rank recalculation -> notification.
B. Admin approves a deduction -> transaction appended -> balance adjusted with floor zero -> rank recalculated -> rank event logged -> student sees reason and can appeal -> successful appeal posts reversing transaction (never deletes original).
C. Duplicate submission/reward retries must not duplicate points; use idempotency keys and unique indexes.
D. Leaderboards rank opted-in artists by current points with deterministic tie-breakers. Keep private data private.

## Suggested stack
Monorepo: apps/web React + TypeScript + Vite, Tailwind CSS, shadcn/ui, React Router, TanStack Query, Wavesurfer.js, Recharts, Framer Motion; apps/api Node.js + Express + TypeScript, MongoDB Atlas + Mongoose; packages/shared-types and packages/validation (Zod); object storage for media; worker/queue for processing/notifications. Choose a consistent secure authentication implementation (HttpOnly cookies, CSRF protection, secure sessions or carefully implemented refresh-token scheme). No secrets in source control.

## Core collections and relationships
- users: _id, email unique, passwordHash or authProvider, roles[], status, timestamps
- artistProfiles: userId unique FK, displayName, rankPoints, currentRank, performanceAverage, voiceTypes[], publicOptIn, counters, timestamps
- challenges: _id, title, sceneDescription, difficulty, allowedMediaId, deadline, createdBy, status, policyVersion
- mediaAssets: _id, ownerId, storageKey, type, mimeType, size, duration, processingStatus, createdAt
- submissions: _id, studentId, challengeId, audioAssetId, syncOffsetMs, status, submittedAt, attemptNumber
- reviews: _id, submissionId, directorId, rubricScores, totalScore, feedback, timestampComments[], status, timestamps
- pointProposals: _id, studentId, reviewId?, sourceType, sourceId, delta, category, reason, evidenceIds[], status, requestedBy, decidedBy?, decidedAt?, policyVersion, idempotencyKey
- pointTransactions: _id, studentId, proposalId?, delta, balanceBefore, balanceAfter, actorId, reason, sourceId, reversalOf?, createdAt, idempotencyKey unique
- rankEvents: _id, studentId, oldRank, newRank, triggeringTransactionId, createdAt
- appeals: _id, studentId, transactionId, reason, evidenceIds[], status, resolution, resolvedBy, timestamps
- notifications: _id, recipientId, type, payload, readAt, createdAt
- achievements: _id, code, title, rules; artistAchievements: studentId, achievementId, grantedAt
- auditLogs: _id, actorId, action, entityType, entityId, metadata, createdAt
Index foreign keys and queries; use transactions for ledger/balance/rank event consistency. MongoDB transaction deployment must support transactions.

## Rank algorithm
rankFor(points): if >=25000 S; else if >=12000 A; else if >=5000 B; else if >=1000 C; else ED. When an approved proposal is posted, within one database transaction: check idempotency, read current balance with concurrency protection, calculate next balance max(0, current+delta) or reject deductions exceeding balance (choose explicit policy), append immutable point transaction, update artistProfile balance/rank, append rankEvent if changed, mark proposal applied, append audit record; queue notification via outbox or after committed event. Handle simultaneous approvals correctly. Reject unauthorized or self-approval where policy forbids it.

## API plan (versioned /api/v1)
POST /auth/register, /auth/login, /auth/logout, GET /auth/me
GET /me/dashboard, GET /me/points, GET /me/submissions, GET /me/notifications
GET /challenges, GET /challenges/:id, POST /admin/challenges, PATCH /admin/challenges/:id
POST /media/upload-intent, POST /media/complete, GET /media/:id/playback-url
POST /submissions, GET /submissions/:id
GET /director/review-queue, POST /director/submissions/:id/reviews, POST /director/point-proposals
GET /admin/point-proposals, POST /admin/point-proposals/:id/approve, POST /admin/point-proposals/:id/reject
POST /me/appeals, GET /admin/appeals, POST /admin/appeals/:id/resolve
GET /leaderboard, GET /admin/audit-logs, GET/PATCH /admin/rank-rules
Validate inputs, authorize every route, paginate lists, define consistent error responses and API documentation.

## Browser dubbing studio
Request microphone permission only on user action. Use MediaRecorder with capability detection; browser support and MIME formats vary. Show timer, stop, replay, re-record, upload fallback, waveform, reference scene player, optional sync offset, upload progress, failed-upload retry, and consent. Do not claim precise automatic lip sync scoring without implementing it. Never assume reference clips are licensed; use owned/licensed content and private playback URLs. Enforce file size, duration, MIME signature, malware scanning and media transcoding policies.

## Design system and visual direction
Dark cinematic professional esports dashboard. Colors: background #080D17, surface #121D30, electric blue #168DFF, gold #D5A02E, S-rank warm red #D95436, text near white. Typography: Inter for body, Rajdhani for headings/ranks. Rank badges: ED silver/grey, C steel, B electric blue, A gold, S red/gold. Avoid poster-like overcrowding; use cards, large spacing, responsive navigation, accessible contrast, reduced-motion support. Include profile hero, XP progress, review cards, leaderboards, media waveform, admin tables, clear confirmation dialogs.

## Security and integrity
Server RBAC, strong password hashing, email verification/reset, HttpOnly Secure SameSite cookies, CSRF defense where applicable, rate limiting, input validation, upload signature/size checks, signed private media URLs, object-level ownership checks, audit logs, immutable ledger, idempotency, transactions, secrets management, backups, monitoring, and no exposed admin route as substitute for authorization. Privacy and consent for audio recordings. No public student profile by default without opt-in.

## Acceptance criteria
- Student can sign in and submit a browser recording and an uploaded file.
- Director can review only assigned submissions and submit rubric scores plus feedback.
- Sensitive negative point proposal cannot affect balance before admin approval.
- Approved +100 at 4,950 promotes C to B; approved -100 at 5,040 demotes B to C.
- Student sees reason, timestamp, rank history, ledger, and appeal flow.
- Repeated approval requests never double-credit/debit.
- Unauthorized student/director cannot call admin mutations.
- All 17 screens have responsive layouts and loading/error/empty states.
- Media is private and access-controlled; public leaderboard respects opt-in.

## Implementation phases
1. Repository, design tokens, layouts, authentication, RBAC.
2. Artist profiles, points ledger, rank calculator, transactions, tests.
3. Admin approvals/deductions, appeals, audit trail.
4. Challenge library, secure media uploads, student submissions.
5. Director review queue and evaluation rubric.
6. Browser recorder, playback, sync offset and review comments.
7. Leaderboards, notifications, achievements and casting board.
8. End-to-end tests, accessibility, security audit, deployment.

## Open questions (do not invent policy)
- S rank balance behavior above 50,000; default suggested above.
- Deduction floor: reject excess or cap to available balance; recommend reject with explicit feedback.
- Who may register as a casting director; recommend admin invitation.
- Maximum recording/upload size and allowed formats; set via config after hosting choice.
- Reward stacking rules and duplicate audition eligibility.
- Legal rights to dubbing reference scenes, privacy policy, retention/deletion period.

## Deliverable expectations
Produce working code, migrations/indexes, sample seed data clearly labeled as demo, API docs, tests, .env.example, deployment notes, and a changelog. Never fake functionality in production; show honest placeholders until implemented.
