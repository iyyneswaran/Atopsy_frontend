'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader, EmptyState } from '@/components/ui/primitives';
import { CaseScope } from './case-scope';
import { EvidenceWorkspace } from '@/components/evidence/evidence-workspace';
import { ExaminationWorkspace } from '@/components/examinations/examination-workspace';
import { ReportsWorkspace } from '@/components/reports/reports-workspace';
import { ActivityWorkspace } from '@/components/activity/activity-workspace';
const modules = {
  evidence: {
    title: 'Evidence',
    description: 'Original sources. Preserved identity. A clear chain of investigation.',
  },
  examinations: {
    title: 'Examinations',
    description: 'Follow the analysis, inspect the sources and review the findings.',
  },
  reports: {
    title: 'Reports',
    description: 'Bring evidence and investigative reasoning into a traceable record.',
  },
  activity: {
    title: 'Activity',
    description: 'A chronological record of actions across your investigations.',
  },
};
export function ModulePage({ module }: { module: keyof typeof modules }) {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get('case') || '';
  const info = modules[module];
  return (
    <>
      <PageHeader
        title={info.title}
        description={info.description}
        eyebrow="INVESTIGATION WORKSPACE"
      />
      <CaseScope
        value={id}
        onChange={(value) =>
          router.replace(`/${module}${value ? `?case=${encodeURIComponent(value)}` : ''}`)
        }
      />
      {id ? (
        <div key={id}>
          {module === 'evidence' ? (
            <EvidenceWorkspace caseId={id} />
          ) : module === 'examinations' ? (
            <ExaminationWorkspace caseId={id} />
          ) : module === 'reports' ? (
            <ReportsWorkspace caseId={id} />
          ) : (
            <ActivityWorkspace caseId={id} />
          )}
        </div>
      ) : module === 'activity' ? (
        <ActivityWorkspace />
      ) : (
        <div className="panel">
          <EmptyState
            title="Choose an investigation"
            description={`Select a case above to explore its ${module}. Records stay grouped with their investigation.`}
          />
        </div>
      )}
    </>
  );
}
