'use client';
import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, FolderSearch, LoaderCircle, X } from 'lucide-react';
import { humanize } from '@/lib/utils';

export function Button({
  children,
  busy,
  variant = 'primary',
  className = '',
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  busy?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}) {
  return (
    <button
      {...props}
      disabled={disabled || busy}
      className={`button button-${variant} ${className}`}
    >
      {busy && <LoaderCircle size={16} className="spin" />}
      {children}
    </button>
  );
}
export function Badge({ status }: { status: string }) {
  const color = ['CLOSED', 'SUCCEEDED', 'COMPLETED', 'ACCEPTED', 'RESOLVED', 'REVIEWED'].includes(
    status,
  )
    ? 'green'
    : ['FAILED', 'CRITICAL', 'HIGH'].includes(status)
      ? 'red'
      : ['IN_PROGRESS', 'PROCESSING', 'RUNNING', 'QUEUED', 'PARTIAL', 'UNDER_REVIEW'].includes(
            status,
          )
        ? 'amber'
        : ['REVIEW', 'CORRECTED'].includes(status)
          ? 'violet'
          : 'neutral';
  return (
    <span className={`badge badge-${color}`}>
      <i />
      {humanize(status)}
    </span>
  );
}
export function Priority({ value }: { value: number }) {
  return (
    <span className={`priority priority-${value >= 4 ? 'high' : value >= 2 ? 'medium' : 'low'}`}>
      P{value}
      <span>{['Routine', 'Low', 'Normal', 'Elevated', 'High', 'Urgent'][value] || value}</span>
    </span>
  );
}
export function PageHeader({
  title,
  description,
  children,
  eyebrow,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children && <div className="header-actions">{children}</div>}
    </header>
  );
}
export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <div className="error-state" role="alert">
      <AlertCircle size={22} />
      <div>
        <strong>We couldn’t complete this request</strong>
        <p>{error instanceof Error ? error.message : 'Please try again.'}</p>
      </div>
      {retry && (
        <Button variant="secondary" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  );
}
export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <FolderSearch size={27} strokeWidth={1.4} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function Skeleton({ rows = 4, cards = false }: { rows?: number; cards?: boolean }) {
  return (
    <div
      className={cards ? 'skeleton-cards' : 'skeleton-list'}
      role="status"
      aria-label="Loading data"
    >
      {Array.from({ length: rows }, (_, i) => (
        <div className="skeleton" key={i} />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
export function Modal({
  title,
  subtitle,
  open,
  onClose,
  children,
  wide = false,
  locked = false,
}: {
  title: string;
  subtitle?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  locked?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !ref.current?.open) {
      ref.current?.showModal();
      ref.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    }
    if (!open && ref.current?.open) ref.current?.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? 'modal-wide' : ''}`}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        if (!locked) onClose();
      }}
      onClick={(event) => {
        if (!locked && event.target === event.currentTarget) {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            onClose();
        }
      }}
    >
      <div className="modal-header">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button
          className="icon-button"
          onClick={onClose}
          disabled={locked}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Pagination({
  page,
  total,
  size,
  onPage,
}: {
  page: number;
  total: number;
  size: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="pagination">
      <span>
        {total
          ? `${(page - 1) * size + 1}–${Math.min(page * size, total)} of ${total}`
          : '0 results'}
      </span>
      <div>
        <button
          className="icon-button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          aria-label="Previous page"
        >
          <ArrowLeft size={16} />
        </button>
        <span>
          Page {page} of {Math.max(1, Math.ceil(total / size))}
        </span>
        <button
          className="icon-button"
          disabled={page * size >= total}
          onClick={() => onPage(page + 1)}
          aria-label="Next page"
        >
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
export function SuccessMark() {
  return (
    <svg className="success-mark" viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="27" />
      <path d="m19 32 9 9 18-19" />
    </svg>
  );
}
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <path d="M3 32 18 6h5l15 26H27l-7-13-7 13H3Z" fill="currentColor" />
        <path d="m15 28 5-9 5 9H15Z" fill="#a78bfa" opacity=".55" />
      </svg>
      {!compact && (
        <div>
          <strong>ATOPSY</strong>
          <small>Forensic Investigation Suite</small>
        </div>
      )}
    </div>
  );
}
