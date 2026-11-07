import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="boot-screen">
      <div className="eyebrow">404 · PAGE NOT FOUND</div>
      <h1>This page isn’t in the workspace.</h1>
      <Link href="/overview" className="button button-primary">
        Return to overview
      </Link>
    </div>
  );
}
