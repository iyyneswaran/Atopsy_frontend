import Link from 'next/link';
import { ArrowUpRight, FileText } from 'lucide-react';
import { Badge, Priority } from '@/components/ui/primitives';
import { date, initials, personName } from '@/lib/utils';
import type { Investigation } from '@/types/api';
export function CaseTable({
  items,
  compact = false,
}: {
  items: Investigation[];
  compact?: boolean;
}) {
  return (
    <div className="table-scroll">
      <table className="data-table case-table">
        <thead>
          <tr>
            <th>Case / Reference</th>
            <th>Assigned to</th>
            {!compact && <th>Priority</th>}
            <th>Last updated</th>
            <th>Status</th>
            <th>
              <span className="sr-only">Open case</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <Link href={`/cases/${item.id}`} className="case-cell">
                  <span className="table-file">
                    <FileText size={17} />
                  </span>
                  <div>
                    <strong>{item.title}</strong>
                    <small className="mono">{item.caseNumber}</small>
                  </div>
                </Link>
              </td>
              <td>
                <span className="person-cell">
                  {item.assignedTo && (
                    <span className="mini-avatar">{initials(item.assignedTo)}</span>
                  )}
                  {personName(item.assignedTo)}
                </span>
              </td>
              {!compact && (
                <td>
                  <Priority value={item.priority} />
                </td>
              )}
              <td className="muted nowrap">{date(item.updatedAt, true)}</td>
              <td>
                <Badge status={item.status} />
              </td>
              <td>
                <Link
                  className="icon-button"
                  href={`/cases/${item.id}`}
                  aria-label={`Open ${item.title}`}
                >
                  <ArrowUpRight size={16} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
