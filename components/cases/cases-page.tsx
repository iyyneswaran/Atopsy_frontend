'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Folder, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { useCases } from '@/hooks/queries';
import { useAuth } from '@/components/providers';
import {
  Button,
  EmptyState,
  ErrorState,
  PageHeader,
  Pagination,
  Skeleton,
} from '@/components/ui/primitives';
import { CaseForm } from './case-form';
import { CaseTable } from './case-table';
import { humanize } from '@/lib/utils';
export function CasesPage() {
  const params = useSearchParams();
  return (
    <CasesContent key={params.get('search') || ''} initialSearch={params.get('search') || ''} />
  );
}
function CasesContent({ initialSearch }: { initialSearch: string }) {
  const [search, setSearch] = useState(initialSearch);
  const [debounced, setDebounced] = useState(search);
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [create, setCreate] = useState(false);
  const { user } = useAuth();
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  const query = useCases({ search: debounced, status, sortBy, sortOrder, page, limit: 12 });
  return (
    <>
      <PageHeader
        title="Cases"
        description="A focused view of every investigation in your workspace."
        eyebrow="CASE MANAGEMENT"
      >
        {user?.role !== 'FORENSIC_EXPERT' && (
          <Button onClick={() => setCreate(true)}>
            <Plus size={17} /> New case
          </Button>
        )}
      </PageHeader>
      <div className="panel">
        <div className="panel-heading">
          <h2>
            <Folder size={18} /> Investigations{' '}
            <span className="count-pill">{query.data?.meta?.total ?? '—'}</span>
          </h2>
          <span className="small muted">Your authorized cases</span>
        </div>
        <div className="filter-bar">
          <div className="search-field">
            <Search size={16} />
            <input
              aria-label="Search investigations"
              placeholder="Search by title, case number or description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="filter-controls">
            <SlidersHorizontal size={16} />
            <select
              aria-label="Filter case status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              {['OPEN', 'IN_PROGRESS', 'REVIEW', 'CLOSED', 'ARCHIVED'].map((s) => (
                <option key={s} value={s}>
                  {humanize(s)}
                </option>
              ))}
            </select>
            <select
              aria-label="Sort cases"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
            >
              <option value="updatedAt">Last updated</option>
              <option value="createdAt">Date created</option>
              <option value="priority">Priority</option>
              <option value="title">Title</option>
            </select>
            <select
              aria-label="Sort direction"
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value);
                setPage(1);
              }}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
        {query.isPending ? (
          <Skeleton rows={6} />
        ) : query.isError ? (
          <ErrorState error={query.error} retry={() => void query.refetch()} />
        ) : query.data.data.length ? (
          <CaseTable items={query.data.data} />
        ) : (
          <EmptyState
            title={
              search || status
                ? 'No matching investigations'
                : 'Your first investigation starts here'
            }
            description={
              search || status
                ? 'Try a different search or status filter.'
                : 'Create a case to keep evidence, examinations and findings together.'
            }
          >
            {!search && !status && user?.role !== 'FORENSIC_EXPERT' && (
              <Button onClick={() => setCreate(true)}>
                <Plus size={16} /> Create new case
              </Button>
            )}
          </EmptyState>
        )}
        <Pagination page={page} total={query.data?.meta?.total || 0} size={12} onPage={setPage} />
      </div>
      <CaseForm open={create} onClose={() => setCreate(false)} />
    </>
  );
}
