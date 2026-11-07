import { Suspense } from 'react';
import { ModulePage } from '@/components/layout/module-page';
import { Skeleton } from '@/components/ui/primitives';
export default function Page() {
  return (
    <Suspense fallback={<Skeleton />}>
      <ModulePage module="evidence" />
    </Suspense>
  );
}
