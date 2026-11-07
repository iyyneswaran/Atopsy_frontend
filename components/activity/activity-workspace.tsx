'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Activity, ChevronDown, Search } from 'lucide-react';
import { service } from '@/services/investigations';
import { useDashboard } from '@/hooks/queries';
import { EmptyState, ErrorState, Pagination, Skeleton } from '@/components/ui/primitives';
import { date, humanize } from '@/lib/utils';
import type { Audit } from '@/types/api';
export function ActivityWorkspace({ caseId }: { caseId?: string }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const history = useQuery({
    queryKey: ['audit', caseId, page],
    queryFn: () => service.audit(caseId!, (page - 1) * 20),
    enabled: !!caseId,
  });
  const dashboard = useDashboard();
  const loading = caseId ? history.isPending : dashboard.isPending;
  const error = caseId ? history.error : dashboard.error;
  const records = (caseId ? history.data?.items : dashboard.data?.activity) || [];
  const filtered = records.filter((r) =>
    `${r.action} ${r.user_id} ${r.resource_id}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="panel">
      <div className="panel-heading">
        <h2>
          <Activity size={18} /> {caseId ? 'Case audit history' : 'Recent workspace activity'}
        </h2>
        <span className="small muted">
          {caseId ? 'Recorded server events' : 'Latest 20 events'}
        </span>
      </div>
      <div className="filter-bar">
        <div className="search-field">
          <Search size={16} />
          <input
            aria-label="Search visible activity"
            placeholder="Filter this page by action, actor or case ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      {loading ? (
        <Skeleton rows={5} />
      ) : error ? (
        <ErrorState
          error={error}
          retry={() => void (caseId ? history.refetch() : dashboard.refetch())}
        />
      ) : filtered.length ? (
        <div className="audit-list">
          {filtered.map((record) => (
            <AuditRow record={record} key={record.id} showCase={!caseId} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No activity to display"
          description={
            search ? 'Try another search on this page.' : 'Recorded case actions will appear here.'
          }
        />
      )}
      {caseId ? (
        <Pagination page={page} size={20} total={history.data?.total || 0} onPage={setPage} />
      ) : (
        <div className="panel-note">
          Select an investigation above for its complete, paginated history.
        </div>
      )}
    </div>
  );
}
function AuditRow({ record, showCase }: { record: Audit; showCase: boolean }) {
  return (
    <details className="audit-row">
      <summary>
        <span className="audit-icon">
          <Activity size={16} />
        </span>
        <div>
          <strong>{humanize(record.action)}</strong>
          <small>
            {date(record.created_at, true)} · Actor{' '}
            {record.user_id ? `${record.user_id.slice(0, 8)}…` : 'System'}
          </small>
        </div>
        <ChevronDown size={16} />
      </summary>
      <div className="audit-detail">
        {showCase && (
          <Link className="text-link" href={`/cases/${record.resource_id}?tab=activity`}>
            Open investigation
          </Link>
        )}
        <dl className="detail-grid">
          <div>
            <dt>Event ID</dt>
            <dd className="mono">{record.id}</dd>
          </div>
          <div>
            <dt>Actor ID</dt>
            <dd className="mono">{record.user_id || 'System'}</dd>
          </div>
        </dl>
        {record.detail !== null && (
          <pre className="json-preview">{JSON.stringify(record.detail, null, 2)}</pre>
        )}
      </div>
    </details>
  );
}
