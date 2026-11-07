'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { KeyRound, ShieldCheck, UserRound, Users } from 'lucide-react';
import { useAuth, useToast } from '@/components/providers';
import {
  Badge,
  Button,
  ErrorState,
  Modal,
  PageHeader,
  Pagination,
  Skeleton,
} from '@/components/ui/primitives';
import { api, token } from '@/lib/api/client';
import { service } from '@/services/investigations';
import { date, humanize, initials, personName } from '@/lib/utils';
import type { Role, User } from '@/types/api';
export function SettingsPage() {
  const { user } = useAuth();
  const profile = useQuery({
    queryKey: ['profile'],
    queryFn: () => api<User>('/auth/me').then((r) => r.data),
  });
  const person = profile.data || user!;
  return (
    <>
      <PageHeader
        title="Settings"
        description="Your identity, account security and workspace access."
        eyebrow="ACCOUNT"
      />
      <div className="settings-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>
              <UserRound size={18} /> Your profile
            </h2>
          </div>
          <div className="panel-body">
            <div className="settings-person">
              <span className="avatar avatar-large">{initials(person)}</span>
              <div>
                <h2>{personName(person)}</h2>
                <p>{person.email}</p>
              </div>
            </div>
            {profile.error && (
              <ErrorState error={profile.error} retry={() => void profile.refetch()} />
            )}
            <dl className="detail-grid">
              <div>
                <dt>Role</dt>
                <dd>{humanize(person.role)}</dd>
              </div>
              <div>
                <dt>Account created</dt>
                <dd>{date(person.createdAt)}</dd>
              </div>
              <div>
                <dt>Last sign in</dt>
                <dd>{date(person.lastLoginAt, true)}</dd>
              </div>
              <div>
                <dt>Email verification</dt>
                <dd>{person.isEmailVerified ? 'Verified' : 'Not verified'}</dd>
              </div>
              <div className="span-2">
                <dt>User ID</dt>
                <dd className="mono">{person.id}</dd>
              </div>
            </dl>
            <div className="inline-note">
              <ShieldCheck size={16} /> Your role and case assignments determine which
              investigations you can access.
            </div>
            <p className="field-hint">
              Profile details are read-only. Contact your administrator to update your identity.
            </p>
          </div>
        </section>
        <PasswordForm />
      </div>
      {user?.role === 'ADMIN' && <UserManagement />}
    </>
  );
}
function PasswordForm() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const { endSession } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const save = useMutation({
    mutationFn: () =>
      api('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      }),
    onSuccess: () => {
      token.clear();
      endSession();
      toast('Password changed. Sign in with your new password.');
      router.replace('/login');
    },
  });
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>
          <KeyRound size={18} /> Password & security
        </h2>
      </div>
      <form
        className="panel-body stack-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!save.isPending && next === confirm) save.mutate();
        }}
      >
        <label>
          Current password
          <input
            type="password"
            required
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </label>
        <label>
          New password
          <input
            type="password"
            required
            minLength={8}
            maxLength={128}
            pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[@$!%*?&])[A-Za-z0-9@$!%*?&]{8,128}"
            autoComplete="new-password"
            aria-label="New password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
          <small className="field-hint">
            8–128 characters; uppercase, lowercase, number, and one of @$!%*?&.
          </small>
        </label>
        <label>
          Confirm new password
          <input
            type="password"
            required
            autoComplete="new-password"
            aria-label="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {confirm && confirm !== next && (
            <small className="field-error">Passwords do not match.</small>
          )}
        </label>
        {save.error && (
          <p role="alert" className="form-error">
            {save.error.message}
          </p>
        )}
        <p className="field-hint">
          Changing your password ends your active sessions. You’ll sign in again.
        </p>
        <Button busy={save.isPending} disabled={!current || !next || next !== confirm}>
          Update password
        </Button>
      </form>
    </section>
  );
}
function UserManagement() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<User | null>(null);
  const [role, setRole] = useState<Role>('INVESTIGATOR');
  const [action, setAction] = useState('role');
  const { user } = useAuth();
  const toast = useToast();
  const cache = useQueryClient();
  const users = useQuery({
    queryKey: ['users', search, page],
    queryFn: () => service.users(search, page),
  });
  const save = useMutation({
    mutationFn: () =>
      api(`/users/${selected!.id}/${action}`, {
        method: 'PATCH',
        ...(action === 'role' ? { body: JSON.stringify({ role }) } : {}),
      }),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ['users'] });
      toast('Account access updated');
      setSelected(null);
    },
  });
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>
          <Users size={18} /> User administration
        </h2>
        <input
          aria-label="Search users"
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>
      {users.isPending ? (
        <Skeleton />
      ) : users.error ? (
        <ErrorState error={users.error} retry={() => void users.refetch()} />
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Access</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.data.data.map((person) => (
                <tr key={person.id}>
                  <td>
                    <strong>{personName(person)}</strong>
                    <small className="table-subtext">{person.email}</small>
                  </td>
                  <td>{humanize(person.role)}</td>
                  <td>
                    <Badge status={person.isActive ? 'ACTIVE' : 'DEACTIVATED'} />
                  </td>
                  <td>
                    <div className="action-row">
                      <Button
                        variant="ghost"
                        disabled={person.id === user?.id}
                        onClick={() => {
                          setSelected(person);
                          setRole(person.role);
                          setAction('role');
                          save.reset();
                        }}
                      >
                        Change role
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={person.id === user?.id}
                        onClick={() => {
                          setSelected(person);
                          setAction(person.isActive ? 'deactivate' : 'reactivate');
                          save.reset();
                        }}
                      >
                        {person.isActive ? 'Deactivate' : 'Reactivate'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} size={50} total={users.data?.meta?.total || 0} onPage={setPage} />
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={action === 'role' ? 'Change account role' : `${humanize(action)} account`}
        subtitle={selected ? personName(selected) : ''}
      >
        <div className="modal-body stack-form">
          {action === 'role' ? (
            <label>
              Role
              <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                {['ADMIN', 'INVESTIGATOR', 'FORENSIC_EXPERT'].map((r) => (
                  <option key={r} value={r}>
                    {humanize(r)}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p>
              {action === 'deactivate'
                ? 'This account will lose access and its active sessions will be invalidated.'
                : 'This account will be able to sign in again.'}
            </p>
          )}
          {save.error && <ErrorState error={save.error} />}
          <div className="modal-footer">
            <Button variant="secondary" onClick={() => setSelected(null)}>
              Cancel
            </Button>
            <Button busy={save.isPending} onClick={() => save.mutate()}>
              Confirm change
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
