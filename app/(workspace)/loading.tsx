import { Skeleton } from '@/components/ui/primitives';
export default function Loading() {
  return (
    <>
      <Skeleton rows={4} cards />
      <Skeleton rows={5} />
    </>
  );
}
