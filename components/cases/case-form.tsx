'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, FilePlus2 } from 'lucide-react';
import { Button, Modal, SuccessMark } from '@/components/ui/primitives';
import { useAuth, useToast } from '@/components/providers';
import { service } from '@/services/investigations';
import { ApiError } from '@/lib/api/client';
import type { Investigation } from '@/types/api';
import { humanize, personName } from '@/lib/utils';

const schema = z.object({
  title: z.string().trim().min(3, 'Use at least 3 characters.').max(200),
  description: z
    .string()
    .trim()
    .min(10, 'Describe the investigation in at least 10 characters.')
    .max(5000),
  priority: z.number().int().min(0).max(5),
  assignedToId: z.string(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'REVIEW', 'CLOSED', 'ARCHIVED']),
});
type Fields = z.infer<typeof schema>;
export function CaseForm({
  open,
  onClose,
  investigation,
}: {
  open: boolean;
  onClose: () => void;
  investigation?: Investigation;
}) {
  const [saving, setSaving] = useState(false);
  return (
    <Modal
      open={open}
      onClose={onClose}
      locked={saving}
      title={investigation ? 'Edit investigation' : 'Create new case'}
      subtitle={
        investigation
          ? 'Update the investigation record.'
          : 'A clear starting point for your investigation.'
      }
    >
      {open && <CaseFormBody investigation={investigation} onClose={onClose} onBusy={setSaving} />}
    </Modal>
  );
}
function CaseFormBody({
  investigation,
  onClose,
  onBusy,
}: {
  investigation?: Investigation;
  onClose: () => void;
  onBusy: (busy: boolean) => void;
}) {
  const { user } = useAuth();
  const cache = useQueryClient();
  const toast = useToast();
  const [created, setCreated] = useState<Investigation | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const users = useQuery({
    queryKey: ['users', userSearch],
    queryFn: () => service.users(userSearch),
    enabled: user?.role === 'ADMIN',
  });
  const form = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: investigation?.title || '',
      description: investigation?.description || '',
      priority: investigation?.priority || 0,
      assignedToId: investigation?.assignedToId || '',
      status: investigation?.status || 'OPEN',
    },
  });
  const save = useMutation({
    onMutate: () => onBusy(true),
    onSettled: () => onBusy(false),
    mutationFn: (values: Fields) => {
      const body = {
        title: values.title,
        description: values.description,
        priority: values.priority,
        ...(investigation
          ? { status: values.status, assignedToId: values.assignedToId || null }
          : values.assignedToId
            ? { assignedToId: values.assignedToId }
            : {}),
      };
      return investigation ? service.updateCase(investigation.id, body) : service.createCase(body);
    },
    onSuccess: (result) => {
      void cache.invalidateQueries({ queryKey: ['cases'] });
      void cache.invalidateQueries({ queryKey: ['dashboard'] });
      void cache.invalidateQueries({ queryKey: ['case', result.id] });
      void cache.invalidateQueries({ queryKey: ['snapshot', result.id] });
      if (investigation) {
        toast('Investigation updated');
        onClose();
      } else setCreated(result);
    },
    onError: (error) => {
      if (error instanceof ApiError)
        for (const [name, message] of Object.entries(error.fields))
          if (name in form.getValues()) form.setError(name as keyof Fields, { message });
    },
  });
  if (created)
    return (
      <div className="success-panel">
        <SuccessMark />
        <div className="eyebrow">READY FOR INVESTIGATION</div>
        <h2>Case created successfully</h2>
        <p>{created.title}</p>
        <code>{created.caseNumber}</code>
        <Link href={`/cases/${created.id}`} className="button button-primary" onClick={onClose}>
          Open investigation <ArrowRight size={16} />
        </Link>
        <Button variant="ghost" onClick={onClose}>
          Back to workspace
        </Button>
      </div>
    );
  return (
    <form
      onSubmit={form.handleSubmit((values) => {
        if (!save.isPending) save.mutate(values);
      })}
      className="stack-form modal-body"
    >
      <div className="form-section-heading">
        <FilePlus2 size={17} /> Investigation details
      </div>
      <label>
        Case title{' '}
        <span className="required" aria-hidden="true">
          *
        </span>
        <input
          {...form.register('title')}
          aria-label="Case title"
          data-autofocus
          aria-required="true"
          placeholder="A concise subject or reference"
          maxLength={200}
          aria-invalid={!!form.formState.errors.title}
          autoFocus
        />
        {form.formState.errors.title && (
          <small className="field-error">{form.formState.errors.title.message}</small>
        )}
      </label>
      <label>
        Description{' '}
        <span className="required" aria-hidden="true">
          *
        </span>
        <textarea
          {...form.register('description')}
          aria-label="Description"
          aria-required="true"
          placeholder="Describe the context, known details and scope of this investigation…"
          rows={4}
          maxLength={5000}
          aria-invalid={!!form.formState.errors.description}
        />
        {form.formState.errors.description && (
          <small className="field-error">{form.formState.errors.description.message}</small>
        )}
      </label>
      <div className="form-grid">
        <label>
          Priority
          <select aria-label="Priority" {...form.register('priority', { valueAsNumber: true })}>
            {['Routine', 'Low', 'Normal', 'Elevated', 'High', 'Urgent'].map((label, value) => (
              <option key={value} value={value}>
                P{value} · {label}
              </option>
            ))}
          </select>
        </label>
        {investigation ? (
          <label>
            Case status
            <select aria-label="Case status" {...form.register('status')}>
              {['OPEN', 'IN_PROGRESS', 'REVIEW', 'CLOSED', 'ARCHIVED'].map((status) => (
                <option key={status} value={status}>
                  {humanize(status)}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="field-note">
            A unique case number is generated when the case is created.
          </div>
        )}
      </div>
      {user?.role === 'ADMIN' && (
        <label>
          Find an investigator
          <input
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="Search the user directory…"
          />
        </label>
      )}
      <label>
        Assigned investigator
        <select aria-label="Assigned investigator" {...form.register('assignedToId')}>
          <option value="">Unassigned</option>
          <option value={user!.id}>{personName(user)} (you)</option>
          {investigation?.assignedTo && investigation.assignedTo.id !== user?.id && (
            <option value={investigation.assignedTo.id}>
              {personName(investigation.assignedTo)}
            </option>
          )}
          {users.data?.data
            .filter(
              (u) =>
                u.id !== user?.id && u.id !== investigation?.assignedToId && u.isActive !== false,
            )
            .map((u) => (
              <option key={u.id} value={u.id}>
                {personName(u)}
              </option>
            ))}
        </select>
        {users.isError && (
          <small className="field-error">Directory unavailable: {users.error.message}</small>
        )}
        {user?.role !== 'ADMIN' && (
          <small className="field-hint">
            You can assign yourself. Directory-wide assignment is available to administrators.
          </small>
        )}
      </label>
      {save.isError && (
        <div className="form-error" role="alert">
          {save.error.message}
        </div>
      )}
      <div className="modal-footer">
        <Button type="button" variant="secondary" onClick={onClose} disabled={save.isPending}>
          Cancel
        </Button>
        <Button type="submit" busy={save.isPending}>
          {investigation ? 'Save changes' : 'Create case'}
          <ArrowRight size={16} />
        </Button>
      </div>
    </form>
  );
}
