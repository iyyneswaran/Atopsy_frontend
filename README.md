# ATOPSY frontend

A new, self-contained Next.js App Router application. The Vite frontend and existing Express/FastAPI backend are not changed. The interface follows the supplied ATOPSY dashboard composition and restrained violet card treatment, with real backend records throughout.

## Run locally

Requirements: Node 20.9+ (tested with Node 22), the existing Express gateway, FastAPI intelligence service and their configured PostgreSQL database.

```powershell
cd C:\Users\pdee5\OneDrive\Desktop\Autopsy\atopsy_frontend
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open **http://127.0.0.1:3001**. Port 3001 avoids the existing frontend on 3000. Sign in with an existing backend account, or create an account using the existing signup endpoint. No credentials are bundled into the client.

The current repository has a synthetic local backend launcher documented in `../backend/LOCAL_RUNBOOK.md`. Reuse its running services; do not start duplicate instances. The new frontend does not start, migrate, seed or otherwise reconfigure the backend.

## Configuration

| Variable                   | Default                        | Purpose                                                              |
| -------------------------- | ------------------------------ | -------------------------------------------------------------------- |
| `BACKEND_API_URL`          | `http://127.0.0.1:5000/api/v1` | Server-side address of the existing Express API                      |
| `NEXT_PUBLIC_API_BASE_URL` | `/api/v1`                      | Browser API base; retain the same-origin default for cookie handling |

The Next.js route handler relays the existing API paths and streamed bodies. It forwards the bearer token and backend HTTP-only refresh cookie, preserves cookie path `/api/v1/auth`, and forwards downloads. It does not implement business logic or own a database. JSON errors, FastAPI detail errors, per-file upload failures and transport failures remain visible. Mutating cross-origin browser requests are rejected by the relay.

Access tokens use local storage, consistent with the existing browser authentication mechanism. Refresh requests are single-flight and serialized across tabs with Web Locks where available. Logout clears query caches and redirects to sign-in; password changes require a fresh login because the backend revokes sessions. For production, serve the frontend over HTTPS and use the backend's production cookie/security configuration. Configure the deployment reverse proxy to allow required upload sizes and processing timeouts.

## Features

- Overview with real active-case, queued/processing-run and evidence counts; recorded stage duration and case activity.
- Persistent 252px expanded / 76px collapsed navigation, tooltips, keyboard search and breadcrumbs.
- Searchable, filtered, server-paginated case listing; validated creation, edit, assignment and archive workflows.
- Case-scoped evidence register, classification, drag/drop upload progress, per-file results, SHA-256 metadata and verified original preview/download.
- Examination versions, polling, stage outputs, retries, source-provenance observations, review revisions, anomaly leads, hypotheses with observation assessments, and cited evidence retrieval.
- Actual server-generated Markdown and JSON reports; preview, version selection and export.
- Recent workspace activity and complete paginated case audit history.
- Profile, password change, and role-gated user administration.
- Keyboard-accessible native dialogs, loading/error/empty states, drawn success mark and subtle masked border orbit; reduced-motion support.

## Commands

```powershell
npm run lint
npm run typecheck
npm run build
npm start
npm run test:e2e
```

The Playwright test uses installed Google Chrome and the running frontend/backend. It creates an isolated `@example.test` account and clearly labelled synthetic records through the real APIs; it never deletes existing investigations. Run it only against a disposable or synthetic environment. `E2E_BASE_URL` can point at another local test deployment. Test artifacts and screenshots are under `verification/` and Playwright's ignored output folders. The test contains assertions, not production fallback data.

## Structure

`app/` contains routes and the transport gateway. `components/` groups focused feature components and UI primitives. `services/` owns endpoint operations; `lib/api/` owns transport/session handling; `types/` mirrors backend contracts. `hooks/` centralizes cached reads and polling. `styles/globals.css` defines the visual system and desktop breakpoints. The font is bundled locally, so builds need no Google Fonts request.

See [API integration](docs/API_INTEGRATION.md), [implementation plan](docs/IMPLEMENTATION_PLAN.md), and [validation](docs/VALIDATION.md).

## Honest boundaries

There is no backend support for organizations/workspace switching, notifications, arbitrary profile editing, historical KPI comparisons, appointment scheduling or signed/PDF medical reports. These are not fabricated. Examinations represent persisted analysis runs; the pending count is queued/processing runs, not a clinical scheduling queue. Case investigator assignment is not a separate examiner model. Stage success is not a percentage of investigation completeness. Evidence, examinations and reports are selected by case because the active intelligence API is case-scoped.

The backend's automated analysis limitations remain visible beside findings and in reports. Missing or partial outputs are shown explicitly; unsupported media may remain valid originals while document extraction fails. There is no evidence-delete endpoint in the active intelligence API, so the UI does not offer destructive removal.
