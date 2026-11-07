'use client';
import { humanize } from '@/lib/utils';
import type { Json } from '@/types/api';
// Preserve all engine fields, including uncertainty and provenance, without interpreting them as HTML.
export function DataTree({ value, depth = 0 }: { value: Json | undefined; depth?: number }) {
  if (value === undefined || value === null) return <span className="muted">Not available</span>;
  if (typeof value !== 'object')
    return (
      <span className="data-value">
        {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
      </span>
    );
  const entries = Array.isArray(value)
    ? value.map((item, i) => [String(i + 1), item] as const)
    : Object.entries(value);
  if (!entries.length) return <span className="muted">No records</span>;
  return (
    <div className="data-tree">
      {entries.map(([key, item]) =>
        typeof item === 'object' && item !== null ? (
          <details key={key} open={depth < 1 && entries.length < 8}>
            <summary>
              {humanize(key)}{' '}
              <span className="count-pill">
                {Array.isArray(item) ? item.length : Object.keys(item).length}
              </span>
            </summary>
            <DataTree value={item} depth={depth + 1} />
          </details>
        ) : (
          <div className="data-pair" key={key}>
            <span>{humanize(key)}</span>
            <DataTree value={item} depth={depth + 1} />
          </div>
        ),
      )}
    </div>
  );
}
