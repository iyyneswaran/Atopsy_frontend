'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, SquarePen } from 'lucide-react';
import { Badge, Button, EmptyState, Modal, Pagination } from '@/components/ui/primitives';
import { service } from '@/services/investigations';
import { useToast } from '@/components/providers';
import { date, humanize } from '@/lib/utils';
import type { Entity, Json, ReviewState, Snapshot } from '@/types/api';
import { DataTree } from './data-tree';
interface Target {
  id: string;
  label: string;
  data: Json;
}
export function Findings({ snapshot }: { snapshot: Snapshot }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<Target | null>(null);
  const items = snapshot.entities.filter((e) =>
    `${e.raw_value} ${e.entity_type} ${e.document_name}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const anomaly =
    snapshot.anomalies &&
    typeof snapshot.anomalies === 'object' &&
    !Array.isArray(snapshot.anomalies)
      ? snapshot.anomalies
      : {};
  const leads = ['anomalies', 'contradictions'].flatMap((key) =>
    Array.isArray(anomaly[key]) ? (anomaly[key] as Json[]) : [],
  );
  return (
    <>
      <div className="panel">
        <div className="panel-heading">
          <h2>
            Extracted observations <span className="count-pill">{snapshot.entities.length}</span>
          </h2>
          <span className="small muted">Source assertions · require review</span>
        </div>
        <div className="filter-bar">
          <div className="search-field">
            <Search size={16} />
            <input
              aria-label="Search findings"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search observations, entity type or source…"
            />
          </div>
        </div>
        {items.length ? (
          <div className="findings-list">
            {items.slice((page - 1) * 8, page * 8).map((entity) => (
              <EntityCard
                key={entity.entity_id}
                entity={entity}
                snapshot={snapshot}
                onReview={() =>
                  setTarget({
                    id: entity.entity_id,
                    label: humanize(entity.entity_type),
                    data: entity as unknown as Json,
                  })
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No extracted observations"
            description={
              search
                ? 'Try another search.'
                : 'Review the examination stages for extraction results or limitations.'
            }
          />
        )}
        <Pagination page={page} size={8} total={items.length} onPage={setPage} />
      </div>
      <div className="panel">
        <div className="panel-heading">
          <h2>
            Anomaly & contradiction leads <span className="count-pill">{leads.length}</span>
          </h2>
        </div>
        {leads.length ? (
          <div className="findings-list">
            {leads.map((lead, index) => {
              if (!lead || typeof lead !== 'object' || Array.isArray(lead)) return null;
              const id = typeof lead.finding_id === 'string' ? lead.finding_id : '';
              const reviews = snapshot.reviews.filter((r) => r.target_id === id);
              const label = String(
                lead.description || lead.title || lead.finding_type || `Finding ${index + 1}`,
              );
              return (
                <article className="finding-card" key={id || index}>
                  <div className="finding-heading">
                    <h3>{label}</h3>
                    <Badge status={reviews.at(-1)?.state || 'DETECTED'} />
                  </div>
                  <DataTree value={lead} />
                  <Button
                    variant="secondary"
                    disabled={!id}
                    onClick={() => setTarget({ id, label, data: lead })}
                  >
                    <SquarePen size={15} /> Review finding
                  </Button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="panel-note">
            No anomaly or contradiction leads in this analysis version. This does not establish that
            the evidence is free of inconsistencies.
          </div>
        )}
      </div>
      <Modal
        open={!!target}
        onClose={() => setTarget(null)}
        title="Review observation"
        subtitle={target?.label}
      >
        {target && snapshot.run && (
          <ReviewForm
            key={target.id}
            caseId={snapshot.case.id}
            runId={snapshot.run.id}
            target={target}
            onDone={() => setTarget(null)}
          />
        )}
      </Modal>
    </>
  );
}
function EntityCard({
  entity,
  snapshot,
  onReview,
}: {
  entity: Entity;
  snapshot: Snapshot;
  onReview: () => void;
}) {
  const reviews = snapshot.reviews.filter((r) => r.target_id === entity.entity_id);
  const latest = reviews.at(-1);
  return (
    <article className="finding-card">
      <div className="finding-heading">
        <span className="eyebrow">{humanize(entity.entity_type)}</span>
        <Badge status={latest?.state || 'DETECTED'} />
      </div>
      <h3>
        {typeof entity.canonical_value === 'string' ? entity.canonical_value : entity.raw_value}
      </h3>
      <p className="muted small">
        {entity.document_name} · Extraction confidence {Math.round(entity.confidence * 100)}%
      </p>
      {entity.provenance.source_spans?.slice(0, 3).map((span, index) => (
        <blockquote key={index}>
          {span.raw_text}
          <cite>
            Source page {span.page + 1} · characters {span.start_char}–{span.end_char}
          </cite>
        </blockquote>
      ))}
      <div className="finding-footer">
        <details>
          <summary>Metadata & provenance</summary>
          <DataTree value={entity as unknown as Json} />
        </details>
        <Button variant="secondary" onClick={onReview}>
          <SquarePen size={14} /> Review
        </Button>
      </div>
      {latest && (
        <div className="review-note">
          <strong>{humanize(latest.state)}</strong> · {latest.note}
          {latest.correction && <p>Correction: {latest.correction}</p>}
          <small>{date(latest.created_at, true)}</small>
        </div>
      )}
      {reviews.length > 1 && (
        <details className="review-history">
          <summary>{reviews.length} review revisions</summary>
          {reviews.map((review) => (
            <p key={review.id}>
              {humanize(review.state)} · {review.note} · {date(review.created_at, true)}
            </p>
          ))}
        </details>
      )}
    </article>
  );
}
function ReviewForm({
  caseId,
  runId,
  target,
  onDone,
}: {
  caseId: string;
  runId: string;
  target: Target;
  onDone: () => void;
}) {
  const [state, setState] = useState<ReviewState>('UNDER_REVIEW');
  const [note, setNote] = useState('');
  const [correction, setCorrection] = useState('');
  const cache = useQueryClient();
  const toast = useToast();
  const save = useMutation({
    mutationFn: () =>
      service.review(caseId, {
        run_id: runId,
        target_id: target.id,
        state,
        note: note.trim(),
        ...(state === 'CORRECTED' ? { correction: correction.trim() } : {}),
      }),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ['snapshot', caseId] });
      void cache.invalidateQueries({ queryKey: ['dashboard'] });
      void cache.invalidateQueries({ queryKey: ['audit', caseId] });
      toast('Review saved to the case history');
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
      <div className="inline-note">
        This adds a review revision. The original extraction remains preserved.
      </div>
      <label>
        Review decision
        <select value={state} onChange={(e) => setState(e.target.value as ReviewState)}>
          {['DETECTED', 'UNDER_REVIEW', 'ACCEPTED', 'DISMISSED', 'CORRECTED', 'RESOLVED'].map(
            (s) => (
              <option key={s}>{s}</option>
            ),
          )}
        </select>
      </label>
      <label>
        Reason / review note
        <textarea
          required
          minLength={1}
          maxLength={10000}
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Record the basis for your decision…"
        />
      </label>
      {state === 'CORRECTED' && (
        <label>
          Revised assertion
          <textarea
            required
            maxLength={10000}
            value={correction}
            onChange={(e) => setCorrection(e.target.value)}
          />
        </label>
      )}
      {save.error && (
        <p className="form-error" role="alert">
          {save.error.message}
        </p>
      )}
      <div className="modal-footer">
        <Button variant="secondary" type="button" onClick={onDone}>
          Cancel
        </Button>
        <Button
          busy={save.isPending}
          disabled={!note.trim() || (state === 'CORRECTED' && !correction.trim())}
        >
          Save review
        </Button>
      </div>
    </form>
  );
}
