import { Suspense } from 'react';
import { CaseDetails } from '@/components/cases/case-details';
import { Skeleton } from '@/components/ui/primitives';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<Skeleton />}>
      <CaseDetails id={id} />
    </Suspense>
  );
}
