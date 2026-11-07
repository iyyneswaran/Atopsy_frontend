'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Archive,
  CalendarDays,
  FileText,
  FlaskConical,
  Layers3,
  Pencil,
  UserRound,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCase, useSnapshot } from '@/hooks/queries';
import {
  Badge,
  Button,
  ErrorState,
  Modal,
  PageHeader,
  Priority,
  Skeleton,
} from '@/components/ui/primitives';
import { useAuth, useToast } from '@/components/providers';
import { date, personName } from '@/lib/utils';
import { CaseForm } from './case-form';
import { EvidenceWorkspace } from '@/components/evidence/evidence-workspace';
import { ExaminationWorkspace } from '@/components/examinations/examination-workspace';
import { ReportsWorkspace } from '@/components/reports/reports-workspace';
import { ActivityWorkspace } from '@/components/activity/activity-workspace';
import { service } from '@/services/investigations';

const tabs = [
  ['overview', 'Overview'],
  ['evidence', 'Evidence'],
  ['examination', 'Examination'],
  ['reports', 'Reports'],
  ['activity', 'Activity'],
];
export function CaseDetails({ id }: { id: string }) {
  const query = useCase(id);
  const snapshot = useSnapshot(id);
  const params = useSearchParams();
  const { user } = useAuth();
  const cache = useQueryClient();
  const toast = useToast();
  const [edit, setEdit] = useState(false);
  const [archive, setArchive] = useState(false);
  const selected = params.get('tab') || 'overview';
  const tab = tabs.some(([key]) => key === selected) ? selected : 'overview';
  const archiveCase = useMutation({
    mutationFn: () => service.updateCase(id, { status: 'ARCHIVED' }),
    onSuccess: () => {
      setArchive(false);
      void cache.invalidateQueries({ queryKey: ['case', id] });
      void cache.invalidateQueries({ queryKey: ['cases'] });
      void cache.invalidateQueries({ queryKey: ['dashboard'] });
      toast('Case archived');
    },
  });
  if (query.isPending) return <Skeleton rows={6} />;
  if (query.error) return <ErrorState error={query.error} retry={() => void query.refetch()} />;
  const item = query.data;
  return (
    <>
      <Link href="/cases" className="back-link">
        <ArrowLeft size={15} /> All investigations
      </Link>
      <PageHeader
        title={item.title}
        eyebrow={item.caseNumber}
        description={`Created ${date(item.createdAt)} · ${personName(item.createdBy)}`}
      >
        <Badge status={item.status} />
        {user?.role !== 'FORENSIC_EXPERT' && (
          <Button variant="secondary" onClick={() => setEdit(true)}>
            <Pencil size={15} /> Edit case
          </Button>
        )}
      </PageHeader>
      <nav className="tabs" aria-label="Case sections">
        {tabs.map(([key, label]) => (
          <Link
            key={key}
            className={tab === key ? 'active' : ''}
            href={`/cases/${id}?tab=${key}`}
            aria-current={tab === key ? 'page' : undefined}
          >
            {label}
            {key === 'evidence' && snapshot.data && (
              <span className="count-pill">{snapshot.data.evidence.length}</span>
            )}
          </Link>
        ))}
      </nav>
      {tab === 'overview' && (
        <div className="case-overview-grid">
          <section className="panel">
            <div className="panel-heading">
              <h2>Investigation brief</h2>
              <FileText size={18} />
            </div>
            <div className="panel-body">
              <p className="case-description">{item.description}</p>
              <dl className="detail-grid">
                <div>
                  <dt>
                    <UserRound size={14} /> Assigned investigator
                  </dt>
                  <dd>{personName(item.assignedTo)}</dd>
                </div>
                <div>
                  <dt>Priority</dt>
                  <dd>
                    <Priority value={item.priority} />
                  </dd>
                </div>
                <div>
                  <dt>
                    <CalendarDays size={14} /> Opened
                  </dt>
                  <dd>{date(item.createdAt, true)}</dd>
                </div>
                <div>
                  <dt>Last updated</dt>
                  <dd>{date(item.updatedAt, true)}</dd>
                </div>
                <div>
                  <dt>Case ID</dt>
                  <dd className="mono">{item.id}</dd>
                </div>
                <div>
                  <dt>Closed</dt>
                  <dd>{date(item.closedAt, true)}</dd>
                </div>
              </dl>
            </div>
          </section>
          <section className="panel">
            <div className="panel-heading">
              <h2>Case workspace</h2>
            </div>
            <div className="workspace-shortcuts">
              <Link href={`/cases/${id}?tab=evidence`}>
                <Layers3 size={22} />
                <div>
                  <strong>Evidence register</strong>
                  <small>
                    {snapshot.data
                      ? `${snapshot.data.evidence.length} registered files`
                      : 'View original evidence'}
                  </small>
                </div>
                <ArrowRight size={16} />
              </Link>
              <Link href={`/cases/${id}?tab=examination`}>
                <FlaskConical size={22} />
                <div>
                  <strong>Examination</strong>
                  <small>
                    {snapshot.data?.run
                      ? `Version ${snapshot.data.run.version} · ${snapshot.data.run.status.toLowerCase()}`
                      : 'View analysis stages and findings'}
                  </small>
                </div>
                <ArrowRight size={16} />
              </Link>
              <Link href={`/cases/${id}?tab=reports`}>
                <FileText size={22} />
                <div>
                  <strong>Investigation report</strong>
                  <small>Review and export recorded findings</small>
                </div>
                <ArrowRight size={16} />
              </Link>
            </div>
          </section>
          {Boolean(item.autopsyReports?.length) && (
            <section className="panel span-2">
              <div className="panel-heading">
                <h2>Registered autopsy report summaries</h2>
              </div>
              <div className="panel-body">
                {item.autopsyReports!.map((report) => (
                  <div key={report.id} className="registered-report">
                    <strong>{report.subjectName || 'Unnamed subject'}</strong>
                    <p>{report.causeOfDeath || 'Cause of death not recorded'}</p>
                    <small>
                      {date(report.createdAt)} · {report.id}
                    </small>
                  </div>
                ))}
              </div>
            </section>
          )}
          {user?.role !== 'FORENSIC_EXPERT' && item.status !== 'ARCHIVED' && (
            <div className="archive-section span-2">
              <div>
                <h3>Archive investigation</h3>
                <p>
                  Keep the case and its evidence accessible while removing it from active counts.
                </p>
              </div>
              <Button variant="secondary" onClick={() => setArchive(true)}>
                <Archive size={16} /> Archive case
              </Button>
            </div>
          )}
        </div>
      )}
      {tab === 'evidence' && <EvidenceWorkspace caseId={id} />}
      {tab === 'examination' && <ExaminationWorkspace caseId={id} />}
      {tab === 'reports' && <ReportsWorkspace caseId={id} />}
      {tab === 'activity' && <ActivityWorkspace caseId={id} />}
      <CaseForm open={edit} onClose={() => setEdit(false)} investigation={item} />
      <Modal
        title="Archive this investigation?"
        subtitle={item.title}
        open={archive}
        onClose={() => setArchive(false)}
      >
        <div className="modal-body stack-form">
          <p>The case status will become Archived. You can reopen it using Edit case.</p>
          {archiveCase.error && <ErrorState error={archiveCase.error} />}
          <div className="modal-footer">
            <Button variant="secondary" onClick={() => setArchive(false)}>
              Cancel
            </Button>
            <Button busy={archiveCase.isPending} onClick={() => archiveCase.mutate()}>
              Archive case
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
