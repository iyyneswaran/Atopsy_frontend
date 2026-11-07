'use client';
import { useState } from 'react';
import { Folder, Search } from 'lucide-react';
import { useCase, useCases } from '@/hooks/queries';
import { EmptyState, ErrorState, Pagination, Skeleton } from '@/components/ui/primitives';
export function CaseScope({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const cases = useCases({ search, page, limit: 20, sortBy: 'updatedAt', sortOrder: 'desc' });
  const selected = useCase(value);
  return (
    <div className="case-scope panel">
      <div className="scope-label">
        <Folder size={18} />
        <div>
          <strong>Investigation context</strong>
          <small>Choose a case to access its records</small>
        </div>
      </div>
      <div className="scope-controls">
        <div className="search-field">
          <Search size={15} />
          <input
            aria-label="Find case for module"
            placeholder="Find a case…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          value={value}
          aria-label="Select investigation"
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select an investigation</option>
          {selected.data && !cases.data?.data.some((item) => item.id === value) && (
            <option value={value}>
              {selected.data.title} · {selected.data.caseNumber}
            </option>
          )}
          {cases.data?.data.map((item) => (
            <option value={item.id} key={item.id}>
              {item.title} · {item.caseNumber}
            </option>
          ))}
        </select>
      </div>
      {cases.isPending && <Skeleton rows={1} />}
      {cases.isError && <ErrorState error={cases.error} retry={() => void cases.refetch()} />}
      {cases.data && cases.data.data.length === 0 && (
        <EmptyState title="No matching cases" description="Try another title or case number." />
      )}
      {(cases.data?.meta?.total || 0) > 20 && (
        <Pagination page={page} size={20} total={cases.data!.meta!.total} onPage={setPage} />
      )}
    </div>
  );
}
