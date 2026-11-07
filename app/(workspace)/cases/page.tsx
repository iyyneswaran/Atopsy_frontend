import { Suspense } from 'react';
import { CasesPage } from '@/components/cases/cases-page';
import { Skeleton } from '@/components/ui/primitives';
export default function Page() {
  return (
    <Suspense fallback={<Skeleton />}>
      <CasesPage />
    </Suspense>
  );
}
