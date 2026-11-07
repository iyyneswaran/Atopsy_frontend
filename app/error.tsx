'use client';
import { Button, Logo } from '@/components/ui/primitives';
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="boot-screen">
      <Logo />
      <h1>Something interrupted this view.</h1>
      <p>Your investigation records remain on the server. Try loading this page again.</p>
      <Button onClick={reset}>Reload view</Button>
    </div>
  );
}
