import { api } from '@/lib/api/client';
import type {
  Answer,
  Assessment,
  Audit,
  CaseInput,
  Dashboard,
  Hypothesis,
  Investigation,
  PageData,
  Review,
  ReviewState,
  Run,
  Snapshot,
  User,
} from '@/types/api';
export const queryString = (values: Record<string, string | number | undefined>) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values))
    if (value !== undefined && value !== '') params.set(key, String(value));
  return params.size ? `?${params}` : '';
};
const path = (id: string) => `/intelligence/cases/${encodeURIComponent(id)}`;
export const service = {
  dashboard: () => api<Dashboard>('/intelligence/dashboard').then((r) => r.data),
  cases: (params: Record<string, string | number | undefined> = {}) =>
    api<Investigation[]>(`/investigations${queryString(params)}`),
  case: (id: string) =>
    api<Investigation>(`/investigations/${encodeURIComponent(id)}`).then((r) => r.data),
  createCase: (body: CaseInput) =>
    api<Investigation>('/investigations', { method: 'POST', body: JSON.stringify(body) }).then(
      (r) => r.data,
    ),
  updateCase: (id: string, body: Partial<CaseInput>) =>
    api<Investigation>(`/investigations/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }).then((r) => r.data),
  deleteCase: (id: string) =>
    api<null>(`/investigations/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  snapshot: (id: string, run?: string) =>
    api<Snapshot>(`${path(id)}${queryString({ run_id: run })}`).then((r) => r.data),
  runs: (id: string, offset = 0) =>
    api<PageData<Run>>(`${path(id)}/runs?limit=20&offset=${offset}`).then((r) => r.data),
  startRun: (id: string, retry?: string, key = crypto.randomUUID()) =>
    api<Run>(`${path(id)}/runs`, {
      method: 'POST',
      body: JSON.stringify({ request_key: key, retry_of: retry }),
    }).then((r) => r.data),
  audit: (id: string, offset = 0) =>
    api<PageData<Audit>>(`${path(id)}/audit?limit=20&offset=${offset}`).then((r) => r.data),
  review: (
    id: string,
    body: {
      run_id: string;
      target_id: string;
      state: ReviewState;
      note: string;
      correction?: string;
    },
  ) => api<Review>(`${path(id)}/reviews`, { method: 'POST', body: JSON.stringify(body) }),
  hypothesis: (
    id: string,
    body: {
      hypothesis_id?: string;
      description: string;
      notes: string;
      status: Hypothesis['status'];
      assessments: Assessment[];
    },
  ) => api<Hypothesis>(`${path(id)}/hypotheses`, { method: 'POST', body: JSON.stringify(body) }),
  ask: (id: string, query: string, run_id?: string) =>
    api<Answer>(`${path(id)}/assistant`, {
      method: 'POST',
      body: JSON.stringify({ query, run_id }),
    }).then((r) => r.data),
  users: (search = '', page = 1) =>
    api<User[]>(`/users${queryString({ limit: 50, search, page })}`),
  originalPath: (id: string, evidence: string) =>
    `${path(id)}/evidence/${encodeURIComponent(evidence)}/original`,
  reportPath: (id: string, format: string, run?: string) =>
    `${path(id)}/report${queryString({ format, run_id: run })}`,
};
