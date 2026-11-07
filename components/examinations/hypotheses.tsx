'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Save, X } from 'lucide-react';
import { Badge, Button, EmptyState, Modal } from '@/components/ui/primitives';
import { service } from '@/services/investigations';
import { useToast } from '@/components/providers';
import type { Assessment, Hypothesis, Snapshot } from '@/types/api';
import { humanize } from '@/lib/utils';
export function Hypotheses({ snapshot }: { snapshot: Snapshot }) {
  const [editing, setEditing] = useState<Hypothesis | 'new' | null>(null);
  return (
    <div className="panel">
      <div className="panel-heading">
        <h2>Investigator hypotheses</h2>
        <Button variant="secondary" onClick={() => setEditing('new')}>
          <Plus size={16} /> Add hypothesis
        </Button>
      </div>
      {snapshot.hypotheses.length ? (
        <div className="hypothesis-grid">
          {snapshot.hypotheses.map((h) => (
            <article className="finding-card" key={h.hypothesis_id}>
              <div className="finding-heading">
                <span className="eyebrow">REVISION {h.version}</span>
                <Badge status={h.status} />
              </div>
              <h3>{h.description}</h3>
              <p className="muted preserve-lines">{h.notes}</p>
              {h.assessments.length > 0 && (
                <ul className="assessment-list">
                  {h.assessments.map((a, i) => (
                    <li key={i}>
                      <Badge status={a.assessment} />
                      <span>
                        {snapshot.entities.find((e) => e.entity_id === a.target_id)?.raw_value ||
                          a.target_id}
                        <small>{a.note}</small>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Button variant="secondary" onClick={() => setEditing(h)}>
                Create revision
              </Button>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Make the reasoning explicit"
          description="Record competing hypotheses and assess them against observations. These are investigator judgments."
        >
          <Button variant="secondary" onClick={() => setEditing('new')}>
            <Plus size={16} /> Add hypothesis
          </Button>
        </EmptyState>
      )}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'New hypothesis' : 'Revise hypothesis'}
        wide
      >
        {editing && (
          <HypothesisForm
            snapshot={snapshot}
            initial={editing === 'new' ? undefined : editing}
            onDone={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
}
function HypothesisForm({
  snapshot,
  initial,
  onDone,
}: {
  snapshot: Snapshot;
  initial?: Hypothesis;
  onDone: () => void;
}) {
  const [description, setDescription] = useState(initial?.description || '');
  const [notes, setNotes] = useState(initial?.notes || '');
  const [status, setStatus] = useState<Hypothesis['status']>(initial?.status || 'DRAFT');
  const [assessments, setAssessments] = useState<Assessment[]>(initial?.assessments || []);
  const [target, setTarget] = useState('');
  const cache = useQueryClient();
  const toast = useToast();
  const save = useMutation({
    mutationFn: () =>
      service.hypothesis(snapshot.case.id, {
        hypothesis_id: initial?.hypothesis_id,
        description: description.trim(),
        notes,
        status,
        assessments,
      }),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ['snapshot', snapshot.case.id] });
      void cache.invalidateQueries({ queryKey: ['audit', snapshot.case.id] });
      toast('Hypothesis revision saved');
      onDone();
    },
  });
  return (
    <form
      className="modal-body stack-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!save.isPending) save.mutate();
      }}
    >
      <label>
        Hypothesis
        <textarea
          required
          maxLength={10000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </label>
      <label>
        Investigator notes
        <textarea
          maxLength={10000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </label>
      <label>
        Status
        <select value={status} onChange={(e) => setStatus(e.target.value as Hypothesis['status'])}>
          {['DRAFT', 'UNDER_REVIEW', 'REVIEWED'].map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </select>
      </label>
      <div className="form-section-heading">Observation assessments</div>
      {snapshot.run && (
        <div className="inline-form">
          <select
            aria-label="Observation to assess"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          >
            <option value="">Choose an extracted observation</option>
            {snapshot.entities
              .filter((e) => !assessments.some((a) => a.target_id === e.entity_id))
              .map((e) => (
                <option key={e.entity_id} value={e.entity_id}>
                  {e.raw_value}
                </option>
              ))}
          </select>
          <Button
            variant="secondary"
            type="button"
            disabled={!target}
            onClick={() => {
              setAssessments((a) => [
                ...a,
                { run_id: snapshot.run!.id, target_id: target, assessment: 'UNKNOWN', note: '' },
              ]);
              setTarget('');
            }}
          >
            Add
          </Button>
        </div>
      )}
      {assessments.map((assessment, i) => (
        <div className="assessment-editor" key={`${assessment.target_id}-${i}`}>
          <strong>
            {snapshot.entities.find((e) => e.entity_id === assessment.target_id)?.raw_value ||
              assessment.target_id}
          </strong>
          <div className="inline-form">
            <select
              aria-label={`Assessment ${i + 1}`}
              value={assessment.assessment}
              onChange={(e) =>
                setAssessments((a) =>
                  a.map((v, index) =>
                    index === i
                      ? { ...v, assessment: e.target.value as Assessment['assessment'] }
                      : v,
                  ),
                )
              }
            >
              {['CONSISTENT', 'INCONSISTENT', 'NEUTRAL', 'UNKNOWN'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <input
              placeholder="Assessment note"
              aria-label={`Assessment note ${i + 1}`}
              value={assessment.note}
              maxLength={10000}
              onChange={(e) =>
                setAssessments((a) =>
                  a.map((v, index) => (index === i ? { ...v, note: e.target.value } : v)),
                )
              }
            />
            <button
              className="icon-button"
              type="button"
              aria-label={`Remove assessment ${i + 1}`}
              onClick={() => setAssessments((a) => a.filter((_, index) => index !== i))}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ))}
      {save.error && (
        <p className="form-error" role="alert">
          {save.error.message}
        </p>
      )}
      <div className="modal-footer">
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button busy={save.isPending} disabled={!description.trim()}>
          <Save size={16} /> Save revision
        </Button>
      </div>
    </form>
  );
}
