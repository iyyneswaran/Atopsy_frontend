# Validation

Validated 7 November 2026 against the existing isolated synthetic PostgreSQL environment, Express gateway on port 5000 and FastAPI intelligence service on port 8001. Browser tests exercised the production Next.js server on `http://127.0.0.1:3001` using installed Google Chrome.

## Completed checks

- `npm run lint`: passed, no warnings or errors.
- `npm run typecheck`: passed; the production build also performs TypeScript validation.
- `npm run build`: passed, including all application routes and the streamed API transport.
- `tests/workflow.spec.ts`: real backend acceptance workflow passed.
- `tests/resilience.spec.ts`: adverse-path and accessibility interaction checks passed.
- Production dependency audit: no known runtime dependency vulnerabilities reported at validation time. This is not a complete security assessment; development tooling has separate advisories.
- Backend source integrity: **223 source/schema files checked, zero changed** relative to the initial SHA-256 baseline. Runtime tests create explicitly synthetic database records and original evidence files, not source changes.

## Real backend workflow

The browser test creates an isolated synthetic account, signs in, checks the empty overview, validates required case fields, creates a case and verifies the success SVG only after confirmation. It then edits status/assignment, retrieves the persisted case, uploads two uniquely identified synthetic text documents and inspects a checksum-verified original.

The test waits for a real COMPLETED analysis, saves an accepted finding review and a hypothesis revision, retrieves source-cited injury observations, previews and downloads server-generated Markdown/JSON reports, and reads recorded audit events. It checks global case search, status filtering, all module routes, profile retrieval, expired-access-token recovery through the real refresh cookie and sign-out. No uncaught browser exceptions were recorded.

## Adverse paths and interaction checks

- Actual signup through the browser and subsequent login.
- Reduced-motion mode disables the revolving card animation.
- Case dialog focuses the title input and closes with Escape.
- One explicitly intercepted HTTP 503 verifies visible create failure and absence of the success animation. This is a test-only injected fault; no mocked success data enters the application.
- Empty file validation; actual server rejection of unsupported executable MIME; actual per-file duplicate rejection. An overall HTTP success envelope does not mask individual file failures.
- A valid synthetic DOCX original is acquired but the current document reader rejects the format. The failed run and preserved original remain visible. Retry creates version 2 through the actual API.
- Examination tabs support arrow-key navigation.
- Archive sets the real case status to ARCHIVED; unknown case access displays the backend error.
- Password change invalidates sessions; login with the new password succeeds.

## Visual inspection

Screenshots were inspected at **1024, 1440 and 1920 pixels**. No document-level horizontal overflow was detected. The medium layout places the case action beneath the three metrics; large and extra-large layouts use the reference's four-card row. Sidebar preference survives reload. Screenshots wait for the width transition to complete before capture.

Artifacts in `verification/`:

- `overview-1024.png`, `overview-1440.png`, `overview-1920.png`
- `overview-collapsed.png`
- `case-created.png`, `examination.png`
- `live-workflow.json` (synthetic case ID and browser-exception result)
- `backend-integrity.json`, `dependency-audit.json`

## Scope and remaining limits

Chrome desktop was tested; this is not exhaustive cross-browser, assistive-technology or load testing. Native PDF/image previews, near-limit 500 MB uploads, administrative role/access mutations and large paginated datasets have not received live browser acceptance coverage. Those interfaces use the inspected API contracts but are not represented as independently validated.

Automated forensic outputs remain subject to the backend's displayed limitations. Reports are actual Markdown/JSON investigation exports, not signed clinical/PDF reports. No notifications, workspace switching, historical KPI trends or unsupported profile editing were fabricated. The UI preserves server timestamps; consistency of timestamps written by separate backend services is a backend concern and was not altered.

The suite uses only clearly labelled synthetic accounts/cases and does not remove existing investigations. Test records remain for traceability. Re-run only against a synthetic or disposable backend. Playwright reuses a running frontend or starts the previously built production app; the backend must already be available.
