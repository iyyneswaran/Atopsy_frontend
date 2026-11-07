'use client';
import Link from 'next/link';
import { useState } from 'react';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Clock3,
  FilePlus2,
  FileText,
  Flag,
  FlaskConical,
  Folder,
  Layers3,
  Plus,
  RefreshCw,
  UserRound,
} from 'lucide-react';
import { useCases, useDashboard, useSnapshot } from '@/hooks/queries';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  PageHeader,
  Priority,
  Skeleton,
} from '@/components/ui/primitives';
import { CaseForm } from '@/components/cases/case-form';
import { CaseTable } from '@/components/cases/case-table';
import { useAuth } from '@/components/providers';
import { date, personName, stageGroups } from '@/lib/utils';
import type { Investigation, Snapshot } from '@/types/api';

export function Overview() {
  const dashboard = useDashboard();
  const cases = useCases({ limit: 6, sortBy: 'updatedAt', sortOrder: 'desc' });
  const { user } = useAuth();
  const [create, setCreate] = useState(false);
  const [selected, setSelected] = useState('');
  const featured =
    cases.data?.data.find((c) => c.id === selected) ||
    cases.data?.data.find((c) => !['CLOSED', 'ARCHIVED'].includes(c.status)) ||
    cases.data?.data[0];
  const snapshot = useSnapshot(featured?.id || '');
  const data = dashboard.data;
  return (
    <>
      <PageHeader
        title="Investigation Overview"
        description="Monitor case progress, evidence and examination activity."
      >
        <div className="date-chip">
          <CalendarDays size={16} />
          <span>{date(new Date().toISOString())}</span>
        </div>
        <button
          className="icon-button bordered"
          aria-label="Refresh overview"
          onClick={() => {
            void dashboard.refetch();
            void cases.refetch();
            void snapshot.refetch();
          }}
          disabled={dashboard.isFetching}
        >
          <RefreshCw size={16} className={dashboard.isFetching ? 'spin' : ''} />
        </button>
      </PageHeader>
      {dashboard.isError && (
        <ErrorState error={dashboard.error} retry={() => void dashboard.refetch()} />
      )}
      <div className="overview-metrics">
        {dashboard.isPending ? (
          <Skeleton rows={3} cards />
        ) : (
          <>
            <Metric
              icon={<Folder size={22} />}
              label="Active Cases"
              value={data?.active_investigations}
              detail={data ? `${data.total_investigations} total investigations` : 'Unavailable'}
            >
              <div className="metric-meter" title="Active cases as a share of all cases">
                <i
                  style={{
                    width: `${data?.total_investigations ? (data.active_investigations / data.total_investigations) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className="metric-caption">
                <span>Active</span>
                <span>Closed & archived</span>
              </div>
            </Metric>
            <Metric
              icon={<FlaskConical size={22} />}
              label="Pending Examinations"
              value={data?.processing}
              detail="Analysis runs queued or processing"
            >
              <div className="metric-secondary">
                <span className="status-dot amber" />
                <strong>{data?.pending_reviews ?? '—'}</strong>
                <span>entities awaiting review</span>
              </div>
            </Metric>
            <Metric
              icon={<Layers3 size={22} />}
              label="Evidence Items"
              value={data?.total_evidence}
              detail="Registered across your cases"
            >
              <div className="metric-secondary">
                <span className="status-dot" />
                <span>Originals with SHA-256 integrity checks</span>
              </div>
            </Metric>
          </>
        )}
        <div className="create-card border-orbit">
          <div className="create-card-content">
            <FilePlus2 size={25} strokeWidth={1.4} />
            <h2>Create New Case</h2>
            <p>
              Register an investigation.
              <br />
              Start connecting the evidence.
            </p>
          </div>
          {user?.role !== 'FORENSIC_EXPERT' ? (
            <Button onClick={() => setCreate(true)}>
              <Plus size={18} /> New case
            </Button>
          ) : (
            <Link className="button button-secondary" href="/cases">
              View investigations <ArrowRight size={16} />
            </Link>
          )}
          <div className="card-contours" aria-hidden="true" />
        </div>
      </div>
      <section className="panel active-investigations">
        <div className="panel-heading">
          <h2>Active Investigations</h2>
          <div className="panel-heading-actions">
            {cases.data && cases.data.data.length > 1 && (
              <select
                className="compact-select"
                aria-label="Select featured investigation"
                value={featured?.id || ''}
                onChange={(e) => setSelected(e.target.value)}
              >
                {cases.data.data.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            )}
            <Link href="/cases" className="text-link">
              View all <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
        {cases.isPending ? (
          <Skeleton rows={4} />
        ) : cases.isError ? (
          <ErrorState error={cases.error} retry={() => void cases.refetch()} />
        ) : !featured ? (
          <EmptyState
            title="A workspace ready for discovery"
            description="Create your first case to see evidence, analysis stages and investigation activity here."
          >
            {user?.role !== 'FORENSIC_EXPERT' && (
              <Button onClick={() => setCreate(true)}>
                <Plus size={16} /> Create your first case
              </Button>
            )}
          </EmptyState>
        ) : (
          <div className="investigation-content">
            <div className="investigation-main">
              <FeaturedHeader item={featured} snapshot={snapshot.data} />
              {snapshot.isPending ? (
                <Skeleton rows={2} />
              ) : snapshot.isError ? (
                <ErrorState error={snapshot.error} retry={() => void snapshot.refetch()} />
              ) : (
                snapshot.data && <StageChart snapshot={snapshot.data} />
              )}
            </div>
            <div className="investigation-workflow">
              <div className="subheading">
                <h3>Examination workflow</h3>
                <Activity size={16} />
              </div>
              {snapshot.data?.stages.length ? (
                <Workflow snapshot={snapshot.data} />
              ) : (
                <div className="workflow-empty">
                  <div className="workflow-node done">
                    <Check size={13} />
                  </div>
                  <div>
                    <strong>Case registered</strong>
                    <p>{date(featured.createdAt)}</p>
                    <div className="workflow-next">
                      <span />
                      Upload evidence to start an examination.
                    </div>
                    <Link className="text-link" href={`/cases/${featured.id}?tab=evidence`}>
                      Add evidence <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
      <section className="panel recent-panel">
        <div className="panel-heading">
          <h2>Recent Case Activity</h2>
          <Link className="text-link" href="/activity">
            View history <ArrowRight size={15} />
          </Link>
        </div>
        {cases.isPending ? (
          <Skeleton rows={3} />
        ) : cases.isError ? (
          <ErrorState error={cases.error} />
        ) : cases.data.data.length ? (
          <CaseTable compact items={cases.data.data.slice(0, 4)} />
        ) : (
          <EmptyState
            title="No case activity yet"
            description="Your recently updated investigations will appear here."
          />
        )}
      </section>
      {data && (data.failed_jobs.length > 0 || data.unresolved_anomalies > 0) && (
        <div className="overview-notice">
          <span className="status-dot amber" />
          <span>
            {data.unresolved_anomalies} unresolved anomaly leads · {data.failed_jobs.length} failed
            or partial analysis runs
          </span>
          <Link href="/examinations" className="text-link">
            Review examinations <ArrowRight size={14} />
          </Link>
        </div>
      )}
      <CaseForm open={create} onClose={() => setCreate(false)} />
    </>
  );
}
function Metric({
  icon,
  label,
  value,
  detail,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
  detail: string;
  children: React.ReactNode;
}) {
  return (
    <article className="metric-card border-orbit">
      <div className="metric-top">
        <div className="metric-icon">{icon}</div>
        <span>{label}</span>
      </div>
      <div className="metric-value">
        {value === undefined ? '—' : String(value).padStart(2, '0')}
      </div>
      <p className="metric-detail">{detail}</p>
      <div className="metric-bottom">{children}</div>
    </article>
  );
}
function FeaturedHeader({ item, snapshot }: { item: Investigation; snapshot?: Snapshot }) {
  const succeeded = snapshot?.stages.filter((s) => s.status === 'SUCCEEDED').length || 0;
  const total = snapshot?.stages.length || 0;
  return (
    <>
      <div className="featured-header">
        <span className="featured-icon">
          <FileText size={23} />
        </span>
        <div className="featured-title">
          <div>
            <Link href={`/cases/${item.id}`}>{item.title}</Link>
            <Badge status={item.status} />
          </div>
          <p className="mono">{item.caseNumber}</p>
        </div>
        <Link
          href={`/cases/${item.id}`}
          className="icon-button"
          aria-label={`Open featured case ${item.title}`}
        >
          <ArrowUpRight size={19} />
        </Link>
      </div>
      <div className="case-facts">
        <div>
          <UserRound size={15} />
          <span>
            Assigned investigator<strong>{personName(item.assignedTo)}</strong>
          </span>
        </div>
        <div>
          <CalendarDays size={15} />
          <span>
            Opened<strong>{date(item.createdAt)}</strong>
          </span>
        </div>
        <div>
          <Clock3 size={15} />
          <span>
            Last updated<strong>{date(item.updatedAt)}</strong>
          </span>
        </div>
        <div>
          <Flag size={15} />
          <span>
            Priority
            <Priority value={item.priority} />
          </span>
        </div>
      </div>
      {total > 0 && (
        <div className="stage-progress">
          <span>
            <strong>{succeeded}</strong> / {total} stages succeeded
          </span>
          <div className="progress-track">
            <i style={{ width: `${(succeeded / total) * 100}%` }} />
          </div>
          {snapshot?.run && <Badge status={snapshot.run.status} />}
        </div>
      )}
    </>
  );
}
function StageChart({ snapshot }: { snapshot: Snapshot }) {
  const groups = stageGroups(snapshot.stages);
  const max = Math.max(...groups.map((g) => g.duration), 1);
  return (
    <div className="stage-chart">
      <div className="subheading">
        <h3>Examination timeline</h3>
        <span className="small muted">
          {snapshot.run
            ? `Version ${snapshot.run.version} · recorded stage duration`
            : 'No examination started'}
        </span>
      </div>
      {groups.length ? (
        <>
          <div className="stage-bars">
            {groups.map((group) => (
              <div
                key={group.name}
                className="stage-bar-column"
                title={`${group.label}: ${(group.duration / 1000).toFixed(2)} seconds · ${group.status}`}
              >
                <span>
                  {group.duration >= 1000
                    ? `${(group.duration / 1000).toFixed(1)}s`
                    : `${Math.round(group.duration)}ms`}
                </span>
                <div className="stage-bar-track">
                  <i
                    className={group.status === 'FAILED' ? 'failed' : ''}
                    style={{
                      height: `${group.duration ? Math.max(3, (group.duration / max) * 100) : 0}%`,
                    }}
                  />
                </div>
                <small>{group.label}</small>
              </div>
            ))}
          </div>
          <div className="chart-footnote">
            <span className="status-dot" />
            Actual processing time · cached stages may show 0 ms
          </div>
        </>
      ) : (
        <div className="chart-empty">
          <div className="empty-chart-lines" />
          <FlaskConical size={23} />
          <p>Evidence is the starting point.</p>
          <span>Upload a file to see its examination stages here.</span>
          <Link className="text-link" href={`/cases/${snapshot.case.id}?tab=evidence`}>
            Register evidence <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </div>
  );
}
function Workflow({ snapshot }: { snapshot: Snapshot }) {
  const groups = stageGroups(snapshot.stages);
  const buckets = [
    { label: 'Evidence acquisition', keys: ['acquisition'] },
    { label: 'Reading & extraction', keys: ['ocr', 'extraction'] },
    { label: 'Structuring & normalization', keys: ['structuring', 'normalization'] },
    { label: 'Case intelligence', keys: ['correlation', 'temporal', 'tod', 'anomalies'] },
  ];
  return (
    <ol className="workflow">
      {buckets.map((bucket) => {
        const items = groups.filter((g) => bucket.keys.includes(g.name));
        const done = items.length > 0 && items.every((s) => s.status === 'SUCCEEDED');
        const failed = items.some((s) => ['FAILED', 'PARTIAL', 'SKIPPED'].includes(s.status));
        return (
          <li key={bucket.label}>
            <span className={`workflow-node ${done ? 'done' : failed ? 'failed' : ''}`}>
              {done ? <Check size={13} /> : <span />}
            </span>
            <div>
              <strong>{bucket.label}</strong>
              <p>
                {done
                  ? 'Stages completed successfully'
                  : failed
                    ? 'Requires attention · inspect stages'
                    : 'Awaiting stage completion'}
              </p>
            </div>
          </li>
        );
      })}
      <li className="workflow-link">
        <Link href={`/cases/${snapshot.case.id}?tab=examination`} className="text-link">
          Open examination <ArrowRight size={14} />
        </Link>
      </li>
    </ol>
  );
}
