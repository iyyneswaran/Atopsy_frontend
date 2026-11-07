import type { Person, Stage } from '@/types/api';
export const humanize = (text: string) =>
  text
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^./, (c) => c.toUpperCase());
export const personName = (person?: Person | null) =>
  person ? `${person.firstName} ${person.lastName}` : 'Unassigned';
export const initials = (person?: Person | null) =>
  person ? `${person.firstName[0] || ''}${person.lastName[0] || ''}` : '—';
export function date(value?: string | null, time = false) {
  if (!value) return '—';
  // Python emits naive UTC timestamps for shared records.
  const normalized = /[zZ]$|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(time ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(parsed);
}
export const bytes = (size: number) =>
  size < 1024
    ? `${size} B`
    : size < 1048576
      ? `${(size / 1024).toFixed(1)} KB`
      : `${(size / 1048576).toFixed(1)} MB`;
export const stageNames: Record<string, string> = {
  acquisition: 'Acquisition',
  ocr: 'Document reading',
  extraction: 'Extraction',
  structuring: 'Entity structuring',
  normalization: 'Normalization',
  correlation: 'Correlation',
  temporal: 'Temporal analysis',
  tod: 'Time of death',
  anomalies: 'Anomaly detection',
};
export const stageOrder = Object.keys(stageNames);
export function stageGroups(stages: Stage[]) {
  return stageOrder.flatMap((name) => {
    const items = stages.filter((s) => s.name === name);
    if (!items.length) return [];
    return [
      {
        name,
        label: stageNames[name],
        items,
        duration: items.reduce((n, s) => n + (s.duration_ms || 0), 0),
        status: items.some((s) => s.status === 'FAILED')
          ? 'FAILED'
          : items.some((s) => s.status === 'PARTIAL')
            ? 'PARTIAL'
            : items.every((s) => s.status === 'SUCCEEDED')
              ? 'SUCCEEDED'
              : items.some((s) => s.status === 'RUNNING')
                ? 'RUNNING'
                : items.every((s) => s.status === 'SKIPPED')
                  ? 'SKIPPED'
                  : 'PENDING',
      },
    ];
  });
}
