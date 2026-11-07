export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export interface Envelope<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: Pagination;
}
export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
export type Role = 'ADMIN' | 'INVESTIGATOR' | 'FORENSIC_EXPERT';
export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
}
export interface User extends Person {
  email: string;
  role: Role;
  isEmailVerified?: boolean;
  isActive?: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}
export type CaseStatus = 'OPEN' | 'IN_PROGRESS' | 'REVIEW' | 'CLOSED' | 'ARCHIVED';
export interface Investigation {
  id: string;
  caseNumber: string;
  title: string;
  description: string;
  status: CaseStatus;
  priority: number;
  assignedToId: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  assignedTo: Person | null;
  createdBy: Person;
  _count?: { evidence: number; autopsyReports: number };
  evidence?: { id: string; type: string; fileName: string; fileSize: number; createdAt: string }[];
  autopsyReports?: {
    id: string;
    subjectName: string | null;
    causeOfDeath: string | null;
    createdAt: string;
  }[];
}
export interface CaseInput {
  title: string;
  description: string;
  priority: number;
  assignedToId?: string | null;
  status?: CaseStatus;
}
export interface CaseRecord {
  id: string;
  case_number: string;
  title: string;
  description: string;
  status: CaseStatus;
  created_by: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}
export interface Dashboard {
  total_investigations: number;
  active_investigations: number;
  total_evidence: number;
  processing: number;
  pending_reviews: number;
  unresolved_anomalies: number;
  failed_jobs: Run[];
  recent_cases: CaseRecord[];
  activity: Audit[];
}
export interface Run {
  id: string;
  case_id: string;
  requested_by: string;
  version: number;
  request_key: string;
  fingerprint: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'PARTIAL' | 'FAILED';
  evidence_ids: string[];
  retry_of: string | null;
  warnings: Json[] | null;
  error: string | null;
  changes: Json;
  created_at: string;
  completed_at: string | null;
}
export interface Stage {
  id: string;
  run_id: string;
  scope: string;
  name: string;
  status: string;
  output: Json;
  record_id: string | null;
  reused_from: string | null;
  warnings: Json[] | null;
  error: string | null;
  duration_ms: number | null;
  started_at: string | null;
  completed_at: string | null;
}
export interface Evidence {
  id: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  sha256_hash: string;
  category: string;
  tags: string[] | null;
  created_at: string;
  status: string;
}
export interface SourceSpan {
  page: number;
  start_char: number;
  end_char: number;
  raw_text: string;
}
export interface Entity {
  entity_id: string;
  entity_type: string;
  raw_value: string;
  canonical_value: Json;
  confidence: number;
  evidence_id: string;
  document_name: string;
  metadata: Record<string, Json>;
  provenance: { source_spans?: SourceSpan[]; [key: string]: unknown };
}
export type ReviewState =
  'DETECTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'DISMISSED' | 'CORRECTED' | 'RESOLVED';
export interface Review {
  id: string;
  run_id: string;
  target_id: string;
  state: ReviewState;
  note: string;
  correction: string | null;
  user_id: string;
  created_at: string;
}
export interface Assessment {
  run_id: string;
  target_id: string;
  assessment: 'CONSISTENT' | 'INCONSISTENT' | 'NEUTRAL' | 'UNKNOWN';
  note: string;
}
export interface Hypothesis {
  id: string;
  hypothesis_id: string;
  version: number;
  description: string;
  notes: string;
  status: 'DRAFT' | 'UNDER_REVIEW' | 'REVIEWED';
  assessments: Assessment[];
  created_at: string;
}
export interface Snapshot {
  case: CaseRecord;
  run: Run | null;
  evidence: Evidence[];
  stages: Stage[];
  entities: Entity[];
  reviews: Review[];
  hypotheses: Hypothesis[];
  limitations: string[];
  correlation?: Json;
  temporal?: Json;
  tod?: Json;
  anomalies?: Json;
}
export interface Audit {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string;
  detail: Json;
  created_at: string;
}
export interface PageData<T> {
  items: T[];
  total: number;
}
export interface UploadResult {
  results: {
    evidence_file_id?: string;
    filename?: string;
    original_filename?: string;
    status: string;
    error?: string;
    sha256_hash?: string;
  }[];
  run: Run | null;
}
export interface Answer {
  answer: string;
  citations: {
    evidence_id: string;
    document_name: string;
    page: number;
    original_text: string;
    entity_id: string;
    relationship: string;
    uncertainty: string;
    confidence: number;
  }[];
  limitations: string[];
  run_id: string | null;
}
