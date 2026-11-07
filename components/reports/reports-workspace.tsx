'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileCheck2, FileJson, FileText, Eye } from 'lucide-react';
import { useSnapshot } from '@/hooks/queries';
import { service } from '@/services/investigations';
import { download, request } from '@/lib/api/client';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Pagination,
  Skeleton,
} from '@/components/ui/primitives';
import { date } from '@/lib/utils';
import { useToast } from '@/components/providers';
export function ReportsWorkspace({ caseId }: { caseId: string }) {
  const [version, setVersion] = useState('');
  const [page, setPage] = useState(1);
  const query = useSnapshot(caseId, version || undefined);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const toast = useToast();
  const runs = useQuery({
    queryKey: ['runs', caseId, page],
    queryFn: () => service.runs(caseId, (page - 1) * 20),
  });
  const run = query.data?.run;
  const exportReport = async (format: 'json' | 'markdown') => {
    if (!run) return;
    setBusy(format);
    setError('');
    try {
      await download(
        service.reportPath(caseId, format, run.id),
        `atopsy-${caseId}-v${run.version}.${format === 'json' ? 'json' : 'md'}`,
      );
      toast('Report exported');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  };
  return (
    <>
      <div className="panel">
        <div className="panel-heading">
          <h2>
            <FileText size={18} /> Investigation reports
          </h2>
          <select
            aria-label="Report analysis version"
            value={version}
            onChange={(e) => {
              setVersion(e.target.value);
              setPreview('');
              setError('');
            }}
            disabled={!!busy}
          >
            <option value="">Latest analysis version</option>
            {runs.data?.items.map((item) => (
              <option key={item.id} value={item.id}>
                Version {item.version} · {item.status}
              </option>
            ))}
          </select>
        </div>
        {runs.error && <ErrorState error={runs.error} retry={() => void runs.refetch()} />}
        {(runs.data?.total || 0) > 20 && (
          <Pagination page={page} size={20} total={runs.data!.total} onPage={setPage} />
        )}
        {query.isPending ? (
          <Skeleton rows={4} />
        ) : query.error ? (
          <ErrorState error={query.error} retry={() => void query.refetch()} />
        ) : !run ? (
          <EmptyState
            title="An examination comes before a report"
            description="Upload evidence and run an analysis to create a report from recorded findings, source references and reviews."
          />
        ) : (
          <div className="report-content">
            <div className="report-cover">
              <div className="report-cover-symbol">
                <FileCheck2 size={48} strokeWidth={1} />
              </div>
              <div className="eyebrow">ATOPSY / INVESTIGATION REPORT</div>
              <h2>{query.data!.case.title}</h2>
              <span className="mono">{query.data!.case.case_number}</span>
              <div className="report-cover-bottom">
                <span>VERSION {String(run.version).padStart(2, '0')}</span>
                <Badge status={run.status} />
              </div>
            </div>
            <div className="report-description">
              <div className="eyebrow">EVIDENCE & ANALYSIS</div>
              <h2>A traceable record of the investigation.</h2>
              <p>
                Export the selected analysis version, evidence fingerprints, findings, investigator
                reviews, hypotheses and case audit history.
              </p>
              <dl className="detail-grid">
                <div>
                  <dt>Analysis created</dt>
                  <dd>{date(run.created_at, true)}</dd>
                </div>
                <div>
                  <dt>Source evidence</dt>
                  <dd>{run.evidence_ids.length} files</dd>
                </div>
                <div>
                  <dt>Observations</dt>
                  <dd>{query.data!.entities.length}</dd>
                </div>
                <div>
                  <dt>Analysis status</dt>
                  <dd>
                    <Badge status={run.status} />
                  </dd>
                </div>
              </dl>
              <div className="action-row">
                <Button
                  busy={busy === 'markdown'}
                  disabled={!!busy}
                  onClick={() => void exportReport('markdown')}
                >
                  <Download size={16} /> Markdown report
                </Button>
                <Button
                  variant="secondary"
                  busy={busy === 'json'}
                  disabled={!!busy}
                  onClick={() => void exportReport('json')}
                >
                  <FileJson size={16} /> JSON export
                </Button>
                <Button
                  variant="ghost"
                  busy={busy === 'preview'}
                  disabled={!!busy}
                  onClick={async () => {
                    setBusy('preview');
                    setError('');
                    try {
                      const response = await request(
                        service.reportPath(caseId, 'markdown', run.id),
                      );
                      setPreview(await response.text());
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy('');
                    }
                  }}
                >
                  <Eye size={16} /> Preview
                </Button>
              </div>
              <p className="field-hint">
                Reviews and hypotheses reflect their state at export time. The report preserves
                their version references. This is an investigation report, not a signed clinical
                opinion.
              </p>
            </div>
          </div>
        )}
        {error && <ErrorState error={new Error(error)} />}
      </div>
      {preview && (
        <section className="panel">
          <div className="panel-heading">
            <h2>Report preview</h2>
            <span className="small muted">Generated Markdown · version {run?.version}</span>
          </div>
          <pre className="report-preview">{preview}</pre>
        </section>
      )}
    </>
  );
}
