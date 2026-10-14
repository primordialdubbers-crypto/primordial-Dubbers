# PDI Voice Artist Ranking System — Implementation Blueprint

## Decisions
- Rank demotion enabled when approved deductions cross thresholds.
- Casting directors recommend; admins approve sensitive deductions.
- Browser recording and file uploads supported.

## Stack
React + TypeScript + Vite, Tailwind, shadcn/ui, TanStack Query; Express + TypeScript, MongoDB Atlas (Mongoose), private S3-compatible storage, queue worker.

## Rank thresholds
ED 0-999; C 1000-4999; B 5000-11999; A 12000-24999; S >=25000. Display progression capped at 50000. Balance nonnegative.

## Collections
users: _id, displayName, emailNormalized, passwordHash, roles[], status, createdAt
artistProfiles: userId unique, bio, voiceTypes[], publicOptIn, rankPoints, currentRank, performanceAverage, version
challenges: title, description, difficulty, mediaAssetId, startsAt, deadlineAt, status, createdBy, permittedRoles[]
mediaAssets: ownerId, objectKey, mimeType, bytes, durationMs, checksum, scanStatus, visibility
submissions: studentId, challengeId, mediaAssetId, takeNumber, status, createdAt, reviewedAt
reviews: submissionId, reviewerId, rubricVersion, scores{acting,timing,pronunciation,expression,audio}, total, feedback[], status, createdAt
pointProposals: studentId, submissionId?, reviewId?, kind, amount, reasonCode, rationale, requestedBy, status, decidedBy?, decidedAt?, idempotencyKey
pointTransactions: studentId, delta, balanceAfter, proposalId?, reasonCode, actorId, createdAt, reversalOf?, idempotencyKey unique
rankEvents: studentId, previousRank, nextRank, oldPoints, newPoints, transactionId, createdAt
appeals: studentId, pointTransactionId, statement, status, decidedBy?, decidedAt?
notifications: recipientId, type, payload, readAt?, createdAt
auditLogs: actorId, action, targetType, targetId, metadata, createdAt

## Important indexes
users.emailNormalized unique; artistProfiles.userId unique; submissions(studentId,challengeId,takeNumber) unique; reviews(submissionId,reviewerId) unique; pointTransactions.idempotencyKey unique; pointTransactions(studentId,createdAt); pointProposals(status,createdAt); rankEvents(studentId,createdAt); notifications(recipientId,readAt,createdAt).

## Points transaction algorithm
1. Validate session, role, and proposal permissions.
2. Start MongoDB transaction (replica set required).
3. Check proposal status and unique idempotency key; reject duplicate processing.
4. Load artist profile; calculate newBalance=max(0,oldBalance+delta) or reject deduction exceeding balance per policy.
5. Write immutable transaction, update profile balance and rank, insert rank event if changed, update proposal status.
6. Commit; enqueue notification via transactional outbox (preferred) so retry is safe.
7. Never edit historical transactions; reversal adds a new opposite entry with reference.

## API routes (v1)
POST /auth/register, /auth/login, /auth/logout, GET /auth/me
GET /ranks, GET /leaderboard, GET /artists/:id/public
GET /me/dashboard, GET /me/points, GET /me/rank-history, GET /me/notifications
GET /challenges, POST /admin/challenges, PATCH /admin/challenges/:id
POST /uploads/presign, POST /uploads/complete
POST /submissions, GET /me/submissions, GET /director/submissions
POST /director/submissions/:id/reviews, POST /director/point-proposals
GET /admin/point-proposals, POST /admin/point-proposals/:id/approve, POST /admin/point-proposals/:id/reject
POST /me/appeals, GET /admin/appeals, POST /admin/appeals/:id/resolve
GET /admin/audit-logs, PATCH /admin/rank-rules

## Recording
Use MediaRecorder/getUserMedia after user permission; detect supported MIME; local preview; stop tracks; max duration and size; upload with short-lived presigned URL; server verify ownership, type, size, checksum, malware scan and transcoding; private playback via signed URLs. Browser video and recorded voice sync requires explicit offset adjustment and careful handling of latency.

## Security
HttpOnly Secure SameSite cookies, CSRF protection for cookie-auth mutations, Argon2id passwords, rate limits, request validation, role and resource authorization, private object storage, expiring signed URLs, virus scan, content rights policy, encrypted transport, backups, monitoring, audit trails. No direct client-side point writes.

## Implementation order
1. Monorepo setup and UI design system.
2. Authentication/RBAC and user profiles.
3. Rank/points ledger, atomic transactions, tests.
4. Challenges, storage, submissions.
5. Director review workflow and admin approvals.
6. Student dashboard, history, leaderboard, notifications.
7. Browser recording and synchronized preview.
8. Appeals, analytics, security hardening, launch.

## Test cases
Threshold boundaries: 0,999,1000,4999,5000,11999,12000,24999,25000; 50000 cap; deduction below zero; concurrent credits; duplicate approval requests; repeated submission; reversal; unauthorized director review; revoked storage access; expired upload; malformed audio; appeal resolution; failed worker retry.
