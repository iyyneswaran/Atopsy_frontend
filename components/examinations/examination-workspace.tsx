'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock3, FlaskConical, Play, RefreshCw } from 'lucide-react';
import { useSnapshot } from '@/hooks/queries';
import { service } from '@/services/investigations';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Pagination,
  Skeleton,
} from '@/components/ui/primitives';
import { date, stageNames } from '@/lib/utils';
import { useToast } from '@/components/providers';
import { Findings } from './finding-review';
import { DataTree } from './data-tree';
import { Hypotheses } from './hypotheses';
import { CaseAssistant } from './case-assistant';
export function ExaminationWorkspace({ caseId }: { caseId: string }) {
  const [version, setVersion] = useState('');
  const [runPage, setRunPage] = useState(1);
  const [tab, setTab] = useState('stages');
  const snapshot = useSnapshot(caseId, version || undefined);
  const cache = useQueryClient();
  const toast = useToast();
  const runs = useQuery({
    queryKey: ['runs', caseId, runPage],
    queryFn: () => service.runs(caseId, (runPage - 1) * 20),
  });
  const start = useMutation({
    mutationFn: (retry?: string) => service.startRun(caseId, retry),
    onSuccess: (run) => {
      setVersion(run.id);
      void cache.invalidateQueries({ queryKey: ['snapshot', caseId] });
      void cache.invalidateQueries({ queryKey: ['runs', caseId] });
      void cache.invalidateQueries({ queryKey: ['dashboard'] });
      toast(`Examination version ${run.version} queued`);
    },
  });
  const data = snapshot.data;
  const active = ['QUEUED', 'PROCESSING'].includes(data?.run?.status || '');
  return (
    <>
      <div className="panel">
        <div className="panel-heading">
          <h2>
            <FlaskConical size={18} /> Examination workspace
          </h2>
          <div className="action-row">
            <select
              aria-label="Analysis version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
            >
              <option value="">Latest version</option>
              {runs.data?.items.map((run) => (
                <option key={run.id} value={run.id}>
                  Version {run.version} · {run.status}
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
              busy={start.isPending}
              disabled={!data?.evidence.length || active}
              onClick={() => start.mutate(undefined)}
            >
              <Play size={15} /> Run analysis
            </Button>
          </div>
        </div>
        {runs.error && <ErrorState error={runs.error} retry={() => void runs.refetch()} />}
        {(runs.data?.total || 0) > 20 && (
          <Pagination page={runPage} size={20} total={runs.data!.total} onPage={setRunPage} />
        )}
        {snapshot.isPending ? (
          <Skeleton rows={4} />
        ) : snapshot.error ? (
          <ErrorState error={snapshot.error} retry={() => void snapshot.refetch()} />
        ) : !data?.run ? (
          <EmptyState
            title="Ready when the evidence is"
            description="Upload evidence to automatically queue an analysis. Its recorded stages and findings will appear here."
          />
        ) : (
          <>
            <div className="run-summary">
              <div>
                <span className="eyebrow">ANALYSIS VERSION {data.run.version}</span>
                <h3>
                  Evidence examination <Badge status={data.run.status} />
                </h3>
                <p>
                  <Clock3 size={14} /> {date(data.run.created_at, true)} ·{' '}
                  {data.run.evidence_ids.length} evidence files ·{' '}
                  {data.stages.filter((s) => s.status === 'SUCCEEDED').length}/{data.stages.length}{' '}
                  stages succeeded
                </p>
              </div>
              {['FAILED', 'PARTIAL'].includes(data.run.status) && (
                <Button
                  variant="secondary"
                  busy={start.isPending}
                  onClick={() => start.mutate(data.run!.id)}
                >
                  <RefreshCw size={15} /> Retry as new version
                </Button>
              )}
            </div>
            {active && (
              <div className="processing-note">
                <span className="pulse-dot" /> Examination in progress. Stage status updates
                automatically.
              </div>
            )}
            {data.run.error && <div className="form-error">{data.run.error}</div>}
            {Boolean(data.run.warnings?.length) && (
              <details className="limitations">
                <summary>Run warnings ({data.run.warnings!.length})</summary>
                <DataTree value={data.run.warnings} />
              </details>
            )}
          </>
        )}
        {start.error && <ErrorState error={start.error} />}
      </div>
      {data?.run && (
        <>
          <div
            className="tabs"
            role="tablist"
            aria-label="Examination sections"
            onKeyDown={(event) => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              const buttons = Array.from(
                event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
              );
              const current = buttons.indexOf(event.target as HTMLButtonElement);
              const next =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? buttons.length - 1
                    : (current + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) %
                      buttons.length;
              buttons[next]?.focus();
              buttons[next]?.click();
            }}
          >
            {[
              ['stages', 'Pipeline stages'],
              ['findings', 'Findings & reviews'],
              ['intelligence', 'Case intelligence'],
              ['hypotheses', 'Hypotheses'],
              ['assistant', 'Evidence search'],
            ].map(([key, label]) => (
              <button
                key={key}
                role="tab"
                id={`examination-tab-${key}`}
                aria-controls="examination-panel"
                tabIndex={tab === key ? 0 : -1}
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={tab === key ? 'active' : ''}
              >
                {label}
              </button>
            ))}
          </div>
          <div
            role="tabpanel"
            id="examination-panel"
            aria-labelledby={`examination-tab-${tab}`}
            tabIndex={0}
          >
            {tab === 'stages' && (
              <div className="panel">
                <div className="panel-heading">
                  <h2>Recorded pipeline stages</h2>
                  <span className="small muted">
                    Immutable outputs · version {data.run.version}
                  </span>
                </div>
                <div className="stage-list">
                  {data.stages.map((stage) => (
                    <details key={stage.id} className="stage-row">
                      <summary>
                        <span className={`stage-status-light ${stage.status.toLowerCase()}`} />
                        <div>
                          <strong>{stageNames[stage.name] || stage.name}</strong>
                          <small>
                            {stage.scope === 'case'
                              ? 'Case-level analysis'
                              : data.evidence.find((e) => e.id === stage.scope)
                                  ?.original_filename || stage.scope}
                          </small>
                        </div>
                        {stage.reused_from && <span className="small muted">Cached</span>}
                        <span className="stage-duration">
                          {((stage.duration_ms || 0) / 1000).toFixed(2)}s
                        </span>
                        <Badge status={stage.status} />
                      </summary>
                      <div className="stage-output">
                        {stage.error && <div className="form-error">{stage.error}</div>}
                        <div className="small muted">
                          Started {date(stage.started_at, true)} · Completed{' '}
                          {date(stage.completed_at, true)}
                        </div>
                        {Boolean(stage.warnings?.length) && <DataTree value={stage.warnings} />}
                        <DataTree value={stage.output} />
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            )}
            {tab === 'findings' && <Findings snapshot={data} />}
            {tab === 'intelligence' && (
              <div className="intelligence-panels">
                {[
                  ['correlation', 'Evidence correlation'],
                  ['temporal', 'Temporal intelligence'],
                  ['tod', 'Experimental time-of-death estimates'],
                  ['anomalies', 'Anomaly detection output'],
                ].map(([key, label]) => (
                  <section className="panel" key={key}>
                    <div className="panel-heading">
                      <h2>{label}</h2>
                    </div>
                    <div className="panel-body">
                      <DataTree
                        value={data[key as 'correlation' | 'temporal' | 'tod' | 'anomalies']}
                      />
                    </div>
                  </section>
                ))}
              </div>
            )}
            {tab === 'hypotheses' && <Hypotheses snapshot={data} />}
            {tab === 'assistant' && <CaseAssistant caseId={caseId} runId={data.run.id} />}
          </div>
          <details className="limitations">
            <summary>Interpretation & analysis limitations</summary>
            <ul>
              {data.limitations.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </details>
        </>
      )}
    </>
  );
}
