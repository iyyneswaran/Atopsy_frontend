# Implementation plan

Inspected 6 November 2026. The requested folder existed but was empty. The old UI is a separate Vite app. No old UI files or components are used.

1. Establish a strict TypeScript Next.js App Router app, Tailwind and a custom dark design system; use TanStack Query for cached reads, invalidation and live run polling.
2. Preserve the Express bearer-token and rotating HTTP-only refresh-cookie contract through a streaming same-origin gateway. All intelligence operations use the existing Express `/intelligence` gateway.
3. Build expanded/collapsed navigation, search, breadcrumbs, reusable states, accessible native dialogs and restrained CSS animation.
4. Build the overview from `/intelligence/dashboard`, `/investigations` and case snapshots. Processing is the pending-examination metric; stage success is explicitly labelled, never represented as investigation completion.
5. Implement case CRUD/assignment, case-scoped evidence acquisition and verified originals, analysis versions/stages/findings/reviews/hypotheses/retrieval, generated Markdown/JSON reports, audit history and profile/password settings.
6. Validate against the already running synthetic environment, including case creation, upload, analysis and reports. Inspect screenshots at 1024, 1440 and 1920 pixels; run lint, strict type checking and a production build.

## Contract boundaries

- Prisma owns users, sessions, investigations and the evidence registry. Python evidence UUIDs join the registry and pipeline source. Runs snapshot evidence and have versioned stages; reviews and hypotheses are append-only revisions.
- Cases use OPEN / IN_PROGRESS / REVIEW / CLOSED / ARCHIVED and numeric priorities 0–5. Only admins can enumerate users. Case creation/editing is ADMIN or INVESTIGATOR; case scope is creator/assignee/admin.
- Active Python routes are in `backend/ai/app/api/v1/endpoints/intelligence.py`, mounted by `app/main.py`. Older pipeline/autopsy/timeline prototype routes are not mounted.
- No organizations, workspace switching, notification feed, profile editing, historical KPI trends, or clinical examiner assignment exists. User assignment is case assignment; examinations represent persisted analysis runs.
- Reports are generated JSON or Markdown snapshots, not signed medical reports or PDF exports.
- Existing backend source changes are preserved. A baseline source hash manifest is stored under verification for an end-of-task comparison.
