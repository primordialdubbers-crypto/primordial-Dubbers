# Instructions for coding agents — PDI Voice Artist Ranking System
Read `docs/PDI_MASTER_PRD.md` and `docs/ORIGINAL_TECHNICAL_BLUEPRINT.md` before making changes. Use `docs/assets/pdi-ranking-reference.jpg` only as visual inspiration.

1. The master PRD is the product source of truth. Preserve the user's locked decisions: demotion on approved deductions, director recommendations/admin sensitive deduction approval, both recording and upload.
2. Do not start by generating the entire app in one unreviewable step. Inspect repository first, summarize gaps, create a numbered implementation plan and acceptance tests, then implement the first phase.
3. Prefer React + TypeScript + Tailwind + shadcn/ui frontend and Node/Express + MongoDB backend; explain deviations before making them.
4. No hard-coded points in UI or client-side authoritative rank changes. Ledger and rank updates must be transactional, idempotent, audited and permission checked.
5. Never store actual media in MongoDB; use private object storage. Never expose storage credentials or secrets. Include .env.example only.
6. Build responsive, accessible UI with dark cinematic PDI theme, not a static copy of the poster.
7. Test each feature: unit, API integration, authorization, rank boundaries, duplicate approvals, and key user journeys.
8. Stop and ask when business policy is ambiguous, especially deductions and copyright permissions. Document assumptions in `docs/DECISIONS.md`.
9. After each phase, report files changed, commands run, test results, unfinished items and next phase. Do not claim tests passed unless executed.
10. Do not delete existing user code or overwrite data without explicit permission.
