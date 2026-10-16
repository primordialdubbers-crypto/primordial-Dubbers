# Architectural & Product Decisions Record (ADR)
**Project**: PDI Voice Artist Ranking System  
**Baseline Date**: 2026-10-14  
**Source of Truth**: `docs/PDI_MASTER_PRD.md`

---

## 1. Locked Product Decisions (Non-Negotiable Baseline)
1. **Rank Demotion Enabled**:
   - Approved negative point transactions (deductions) cause an immediate recalculation of the artist's rank.
   - Example: A student at 5,040 points (Rank B) receiving an approved deduction of -100 drops to 4,940 points (Rank C).
2. **Director Recommendation vs. Admin Approval**:
   - Casting Directors review submissions, score rubrics, and *recommend* awards or deductions.
   - Points are never directly credited or debited by a Casting Director.
   - Admins (or superadmins) must review and approve proposals in the Approval Queue before any point ledger transaction is committed.
3. **Dual Submission Modalities**:
   - Students can record audio directly in-browser using `MediaRecorder` or upload pre-recorded audio files.
   - Browser audio recording must allow playback preview, re-recording, and sync offset adjustment against reference clips.
4. **Server-Authoritative Ledger & Nonnegative Balance**:
   - Rank points are completely server-authoritative. Clients never calculate or mutate balances.
   - Points transactions are immutable and append-only.
   - Artist balance is strictly non-negative: `newBalance = max(0, oldBalance + delta)`.
   - Reversals (e.g. from approved appeals) are recorded as distinct new transactions referencing the original transaction, never by deleting or modifying past entries.
5. **Separate 100-Point Review Rubric**:
   - Submission evaluations use a 100-point rubric:
     - Voice acting and emotion: 25
     - Lip sync and timing: 20
     - Pronunciation: 20
     - Character expression: 20
     - Audio quality: 15
   - Review rubric scores evaluate artistic quality and do NOT automatically translate into rank points without an approved proposal.

---

## 2. Visual Theme & Design System Decision
1. **User / Student / Public Interface Theme** (Combo 03):
   - **Charcoal Violet**: `#3C1A47` (deep rich container, accents, header gradients)
   - **Cyber Lime**: `#B6FF00` (high-voltage neon active accents, primary CTA highlights, progress indicators)
   - Base cinematic esports background: `#080D17` and surface `#121D30`
2. **Admin & Moderation Panel Theme** (Combo 05):
   - **Fresh Canopy**: `#2D3E2C` (executive command surfaces, dark military-slate green borders and headers)
   - **Lime Sprout**: `#E4FD97` (admin brand primary, approval accents, status badges, operational highlights)
3. **Official Rank Badge Colors**:
   - **ED Rank** (0–999, Entry / Beginner): Silver Slate (`#8A99AD`)
   - **C Rank** (1,000–4,999, Developing Artist): Steel Azure (`#4E97C2`)
   - **B Rank** (5,000–11,999, Intermediate Artist): Electric Blue (`#168DFF`)
   - **A Rank** (12,000–24,999, Advanced Artist): Imperial Gold (`#D5A02E`)
   - **S Rank** (25,000–50,000+, Elite / Professional): Crimson Flame (`#D95436` / `#FF5722`)

---

## 3. Working Assumptions & Unresolved Policy Items
1. **S-Rank Points Above 50,000**:
   - *Working Assumption*: Points continue accumulating above 50,000 to preserve ledger fidelity and lifetime ranking score; 50,000 serves as the primary visual mastery milestone.
2. **Deductions Exceeding Current Balance**:
   - *Working Assumption*: If a proposed deduction exceeds current balance, the ledger clamps balance at 0 (nonnegative invariant) while recording the exact delta requested, or the admin can adjust the deduction amount before approving.
3. **Role Provisioning Policy**:
   - Public registration defaults strictly to `student`.
   - Casting Director and Admin roles require invitation or administrative promotion by an existing Admin / Superadmin.
4. **Media Storage**:
   - Local development and test environments use local asset streaming or mock S3 adapter; production uses S3/Cloud Storage presigned URLs with access control. No audio files are stored in MongoDB.

---

## 4. Staff Ranking System Partition
1. **Separation from Students**:
   - Academy Staff (Casting Directors, Lead Executive Directors, Administrators) have distinct merit rank progression (`STAFF_RANK_TIERS`: Junior Reviewer, Evaluator, Casting Director, Senior Director, Lead Executive Director).
   - Staff profiles are partitioned with `profileType: 'staff'` and excluded from public student leaderboards and talent casting boards to prevent mix-ups.
2. **Staff Role-Gated Leaderboard**:
   - Access to `/api/v1/leaderboard?type=staff` is restricted exclusively to authenticated staff/directors/admins (403 forbidden for students and unauthenticated visitors).
3. **Admin Direct Points Console for Staff**:
   - Administrators can award points directly to staff members for evaluation, casting, QC, and mentorship via dedicated staff classification presets.

---

## 5. Concurrent Session Limit & Authentication Security
1. **2 Active Sessions Cap**:
   - Single user accounts are capped at a maximum of 2 concurrent device/browser sessions to prevent credential sharing and unauthorized multi-device access.
   - 3rd login attempts return HTTP `429 Too Many Requests` (`ACTIVE_SESSION_LIMIT_EXCEEDED`).
2. **User-Empowered Eviction**:
   - If limit is reached, users can choose "Log Out Other Devices & Sign In Here" (`forceLogoutOthers: true`), which invalidates previous sessions immediately.
3. **Session Revocation on Logout**:
   - Explicit `/logout` removes the caller's specific `sessionId` from the active sessions array, freeing up the device slot for subsequent logins.
4. **Brute Force Protection**:
   - Dedicated rate limiter on `/api/v1/auth/login` restricts requests to 25 attempts per 15 minutes per IP.

