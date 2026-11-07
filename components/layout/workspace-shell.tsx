'use client';
import { useEffect, useState, useSyncExternalStore, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  ArrowUpRight,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  Fingerprint,
  FlaskConical,
  Folder,
  Home,
  Layers3,
  LayoutGrid,
  LogOut,
  Search,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { useAuth, useToast } from '@/components/providers';
import { ErrorState, Logo, Skeleton } from '@/components/ui/primitives';
import { useCases } from '@/hooks/queries';
import { humanize, initials, personName } from '@/lib/utils';

const nav = [
  { path: 'overview', label: 'Overview', icon: LayoutGrid },
  { path: 'cases', label: 'Cases', icon: Folder },
  { path: 'evidence', label: 'Evidence', icon: Layers3 },
  { path: 'examinations', label: 'Examinations', icon: FlaskConical },
  { path: 'reports', label: 'Reports', icon: FileText },
  { path: 'activity', label: 'Activity', icon: Activity },
];
const subscribeSidebar = (callback: () => void) => {
  window.addEventListener('storage', callback);
  window.addEventListener('atopsy:sidebar', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('atopsy:sidebar', callback);
  };
};
const readSidebar = () => localStorage.getItem('atopsy.sidebar') === 'collapsed';
export function WorkspaceShell({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!auth.loading && !auth.user && !auth.error) router.replace('/login');
  }, [auth.loading, auth.user, auth.error, router]);
  if (auth.loading)
    return (
      <div className="boot-screen">
        <Logo />
        <Skeleton rows={3} />
      </div>
    );
  if (auth.error)
    return (
      <div className="boot-screen">
        <Logo />
        <ErrorState error={auth.error} retry={() => void auth.reload()} />
        <Link className="text-link" href="/login">
          Return to sign in
        </Link>
      </div>
    );
  if (!auth.user)
    return (
      <div className="boot-screen">
        <Logo />
        <p>Opening your secure workspace…</p>
      </div>
    );
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
function AuthenticatedShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(subscribeSidebar, readSidebar, () => false);
  const [search, setSearch] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const recent = useCases({ limit: 3, sortBy: 'updatedAt', sortOrder: 'desc' });
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        document.getElementById('global-search')?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);
  const toggle = () => {
    localStorage.setItem('atopsy.sidebar', collapsed ? 'expanded' : 'collapsed');
    window.dispatchEvent(new Event('atopsy:sidebar'));
  };
  const currentPage = pathname.split('/')[1];
  const pageLabel =
    currentPage === 'settings'
      ? 'Settings'
      : nav.find((n) => n.path === currentPage)?.label || 'Workspace';
  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    router.push(`/cases?search=${encodeURIComponent(search.trim())}`);
  };
  return (
    <div className={`app-shell ${collapsed ? 'is-collapsed' : ''}`}>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar" aria-label="Main navigation">
        <div className="sidebar-brand">
          <Link href="/overview" aria-label="ATOPSY overview">
            <Logo compact={collapsed} />
          </Link>
          <button
            onClick={toggle}
            className="sidebar-toggle icon-button"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
          >
            {collapsed ? <ChevronsRight size={17} /> : <ChevronsLeft size={17} />}
          </button>
        </div>
        <div className="workspace-label" title="Your accessible investigations">
          <Layers3 size={19} />
          <div>
            <span>Investigation workspace</span>
            <small>{humanize(user!.role)}</small>
          </div>
          <ShieldCheck size={15} />
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <nav>
          {nav.map(({ path, label, icon: Icon }) => (
            <Link
              href={`/${path}`}
              key={path}
              className={`nav-link ${currentPage === path ? 'active' : ''}`}
              aria-current={currentPage === path ? 'page' : undefined}
              title={collapsed ? label : undefined}
            >
              <Icon size={19} strokeWidth={1.7} />
              <span>{label}</span>
              {currentPage === path && <i />}
            </Link>
          ))}
        </nav>
        {!collapsed && (
          <section className="recent-cases">
            <div className="section-label">
              <span>Recent cases</span>
              <Link href="/cases" aria-label="View all cases">
                <ArrowUpRight size={15} />
              </Link>
            </div>
            {recent.isPending ? (
              <Skeleton rows={2} />
            ) : recent.isError ? (
              <p className="muted small">Recent cases unavailable.</p>
            ) : recent.data?.data.length ? (
              recent.data.data.map((item) => (
                <Link href={`/cases/${item.id}`} key={item.id} className="recent-case">
                  <span
                    className={`status-dot ${['CLOSED', 'ARCHIVED'].includes(item.status) ? 'dim' : ''}`}
                  />
                  <div>
                    <strong title={item.caseNumber}>{item.title}</strong>
                    <small>{humanize(item.status)}</small>
                  </div>
                </Link>
              ))
            ) : (
              <p className="muted small">Your recent investigations will appear here.</p>
            )}
          </section>
        )}
        <div className="sidebar-bottom">
          <Link
            href="/settings"
            className={`nav-link ${currentPage === 'settings' ? 'active' : ''}`}
            title={collapsed ? 'Settings' : undefined}
          >
            <Settings size={19} />
            <span>Settings</span>
          </Link>
          <div className="profile-row">
            <Link href="/settings" className="profile-link" title={personName(user)}>
              <span className="avatar">{initials(user)}</span>
              <div>
                <strong>{personName(user)}</strong>
                <small>{humanize(user!.role)}</small>
              </div>
            </Link>
            <button
              className="icon-button logout-button"
              title="Sign out"
              aria-label="Sign out"
              disabled={loggingOut}
              onClick={async () => {
                setLoggingOut(true);
                try {
                  await logout();
                  router.replace('/login');
                } catch (e) {
                  toast((e as Error).message, true);
                } finally {
                  setLoggingOut(false);
                }
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace-main">
        <div className="topbar">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <Link href="/overview" aria-label="Overview">
              <Home size={16} />
            </Link>
            <span>/</span>
            <span>Workspace</span>
            <span>/</span>
            <Link href={`/${currentPage}`}>{pageLabel}</Link>
            {pathname.split('/').length > 2 && (
              <>
                <ChevronRight size={13} />
                <span>Case details</span>
              </>
            )}
          </nav>
          <div className="topbar-actions">
            <form className="global-search" onSubmit={submitSearch}>
              <Search size={16} />
              <input
                id="global-search"
                aria-label="Search cases"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search investigations…"
              />
              <kbd>⌘ K</kbd>
            </form>
            <Link href="/settings" className="avatar avatar-small" aria-label="Your profile">
              {initials(user)}
            </Link>
          </div>
        </div>
        <main id="main-content" className="page-content" key={pathname}>
          {children}
        </main>
        <footer className="workspace-footer">
          <span>
            <Fingerprint size={13} /> ATOPSY · Investigation workspace
          </span>
          <span>Evidence-led. Human-reviewed.</span>
        </footer>
      </div>
    </div>
  );
}
