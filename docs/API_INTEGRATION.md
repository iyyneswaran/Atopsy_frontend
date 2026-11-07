# API integration reference

Verified against the active source routes, not the obsolete prototype endpoints. All browser requests use `NEXT_PUBLIC_API_BASE_URL` (default `/api/v1`). The same-origin transport points to the existing Express gateway configured by `BACKEND_API_URL`.

## Endpoint map

| Frontend feature                 | Method and backend path (after `/api/v1`)                   | Contract                                                                                                           |
| -------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Sign in                          | POST `/auth/login`                                          | `{ email, password }` → `{ user, accessToken }` and HTTP-only `refreshToken` cookie                                |
| Account creation                 | POST `/auth/signup`                                         | `{ firstName, lastName, email, password }`; signup does not imply login                                            |
| Session refresh                  | POST `/auth/refresh-token`                                  | Cookie → rotated cookie and `{ accessToken }`; one concurrent refresh                                              |
| Profile                          | GET `/auth/me`                                              | Identity, role, verification, last login and creation dates                                                        |
| Sign out                         | POST `/auth/logout`                                         | Invalidates session; clears refresh cookie                                                                         |
| Password                         | POST `/auth/change-password`                                | `{ currentPassword, newPassword }`; backend invalidates sessions                                                   |
| Case list and search             | GET `/investigations`                                       | `search`, `status`, `page`, `limit`, `sortBy`, `sortOrder`                                                         |
| Case creation                    | POST `/investigations`                                      | `{ title, description, priority?, assignedToId? }`; server-generated case number                                   |
| Case details                     | GET `/investigations/:id`                                   | Assigned/creating user, evidence registry and registered autopsy summaries                                         |
| Edit, assign, archive            | PATCH `/investigations/:id`                                 | Optional title, description, status, numeric priority and nullable assignedToId; archive sets ARCHIVED             |
| Dashboard                        | GET `/intelligence/dashboard`                               | Actual counts, latest cases, recent audit activity and failed/partial runs                                         |
| Case evidence / examination      | GET `/intelligence/cases/:id`                               | `run_id?`; evidence, run, stages, entities, reviews, hypotheses, outputs and limitations                           |
| Evidence acquisition             | POST `/intelligence/cases/:id/evidence`                     | Multipart repeated `files`, `category`; returns `results[]` and optional queued `run`                              |
| Verify/preview/download original | GET `/intelligence/cases/:id/evidence/:evidenceId/original` | SHA-256 checked by backend, original bytes and `X-Evidence-SHA256`                                                 |
| Examination history              | GET `/intelligence/cases/:id/runs`                          | `limit`, `offset` → `{ items, total }`                                                                             |
| Run / retry                      | POST `/intelligence/cases/:id/runs`                         | `{ request_key, retry_of? }` → versioned run; UI polls only active runs                                            |
| Finding review                   | POST `/intelligence/cases/:id/reviews`                      | `{ run_id, target_id, state, note, correction? }`; target must belong to case/version                              |
| Hypothesis revisions             | POST `/intelligence/cases/:id/hypotheses`                   | `{ hypothesis_id?, description, notes, status, assessments[] }`; each assessment references a real observation/run |
| Evidence retrieval               | POST `/intelligence/cases/:id/assistant`                    | `{ query, run_id? }` → answer, citations, uncertainty and limitations                                              |
| Full case audit history          | GET `/intelligence/cases/:id/audit`                         | `limit`, `offset` → `{ items, total }`                                                                             |
| Preview/export report            | GET `/intelligence/cases/:id/report`                        | `format=markdown                                                                                                   | json`, `run_id?`; actual generated file, records an export audit event |
| Admin directory                  | GET `/users`                                                | Paginated `search`, `page`, `limit`; ADMIN only                                                                    |
| Admin role                       | PATCH `/users/:id/role`                                     | `{ role }`                                                                                                         |
| Admin account access             | PATCH `/users/:id/deactivate` or `/reactivate`              | Deactivation invalidates the target's sessions                                                                     |

## Schema and semantics

Express wraps responses in `{ success, message, data, meta? }`; intelligence responses generally wrap `{ success, data }`. Express pagination metadata includes `total`, `page`, `limit`, `totalPages`, `hasNext`, `hasPrev`. Errors can be Express `{ message, error: { code, details } }`, FastAPI `{ detail: string | validation[] }`, or transport failures. The client retains status codes and field validation messages.

Case title is 3–200 characters, description 10–5000, priority integer 0–5. Status is OPEN, IN_PROGRESS, REVIEW, CLOSED or ARCHIVED. ADMIN and INVESTIGATOR can create/edit cases. FORENSIC_EXPERT can access assigned/created cases and use case intelligence, but not mutate case records. The server enforces creator/assignee/admin scope; the UI is not an authorization boundary.

Uploads accept 1–20 files. The default ingestion maximum is 500 MB per file; the server remains authoritative when deployment limits differ. Accepted classifications are DOCUMENT, AUTOPSY_REPORT, TOXICOLOGY, WITNESS, INQUEST, CCTV and SCENE. Successful HTTP acquisition responses can still contain FAILED file results; these are rendered as failures, never counted as successful registration. Successfully acquired documents automatically queue analysis.

Run statuses are QUEUED, PROCESSING, COMPLETED, PARTIAL and FAILED. Stage statuses include PENDING, RUNNING, SUCCEEDED, PARTIAL, FAILED and SKIPPED. Per-evidence stages are acquisition, ocr, extraction, structuring and normalization. Case stages are correlation, temporal, tod and anomalies. Durations come from `duration_ms`; cached stages may report zero. Stage success is calculated from actual records and explicitly labelled as such.

Review states: DETECTED, UNDER_REVIEW, ACCEPTED, DISMISSED, CORRECTED, RESOLVED. A correction requires revised assertion text. Hypotheses have DRAFT, UNDER_REVIEW or REVIEWED status and CONSISTENT, INCONSISTENT, NEUTRAL or UNKNOWN observation assessments. Revisions preserve prior records.

Node uses camelCase fields. Python's mapped shared models use snake_case fields, e.g. `case_number`, `created_at`, `resource_id`. Both are modelled separately in `types/api.ts`. Naive Python timestamps are interpreted as UTC, consistent with the shared models' UTC writes; display uses browser locale time. Source span page indices are zero-based and displayed one-based.

## Relationships and ownership

Prisma/PostgreSQL: User → sessions/refresh tokens, created and assigned Investigations. Investigation → evidence registry and autopsy reports. The Python acquisition path inserts the same evidence UUID into both registry and evidence_files. CasePipelineRun belongs to a case and snapshots evidence IDs; PipelineStage belongs to a run and is scoped to a document or the case. FindingReview references the case/run/target. HypothesisRevision references the case, investigator and version. AuditLog records case-scoped actions. No new database is introduced.

## Feature limits

No trend or date-range dashboard endpoint exists, so the overview shows a current date label rather than a nonfunctional date filter. Dashboard `processing` is the number of queued/processing analysis runs. `pending_reviews` counts entities awaiting review and is displayed separately. Original evidence access is verified and logged; previews render text as text or sandbox an allowlisted file type. Reports are live exports of a selected analysis version with current human reviews/hypotheses and revision references. They are not signed medical reports.

Workspace switching, notifications and profile editing are absent. Only admins can enumerate the user directory; other investigators can assign themselves or retain/clear the current assignee. The active API does not expose a global paginated evidence/report list, so those workspaces use a searchable paginated case selector. Legacy unmounted `/pipeline`, `/autopsy`, `/analysis` and `/timeline` routes are intentionally unused.

## Source references

- `backend/server/src/auth/` and `middlewares/authenticate.ts`
- `backend/server/src/modules/investigations/` and `modules/users/`
- `backend/server/src/modules/intelligence/intelligence.routes.ts`
- `backend/server/prisma/schema.prisma`
- `backend/ai/app/main.py`
- `backend/ai/app/api/v1/endpoints/intelligence.py`
- `backend/ai/app/services/case_intelligence.py` and `case_pipeline_orchestrator.py`
