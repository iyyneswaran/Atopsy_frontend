'use client';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ArrowUpRight, Search, Sparkles } from 'lucide-react';
import { service } from '@/services/investigations';
import { download } from '@/lib/api/client';
import { Button } from '@/components/ui/primitives';
import { useToast } from '@/components/providers';
export function CaseAssistant({ caseId, runId }: { caseId: string; runId?: string }) {
  const [question, setQuestion] = useState('');
  const toast = useToast();
  const ask = useMutation({ mutationFn: () => service.ask(caseId, question.trim(), runId) });
  return (
    <div className="panel">
      <div className="panel-heading">
        <h2>
          <Sparkles size={18} /> Search the evidence
        </h2>
        <span className="small muted">Source-cited retrieval</span>
      </div>
      <div className="panel-body">
        <p className="muted">
          Ask for documented injuries, toxicology findings or unreviewed observations in this
          analysis version.
        </p>
        <form
          className="assistant-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!ask.isPending) ask.mutate();
          }}
        >
          <Search size={18} />
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What injuries are documented?"
            minLength={3}
            maxLength={4000}
            required
            aria-label="Question about case evidence"
          />
          <Button busy={ask.isPending} disabled={question.trim().length < 3}>
            Find sources <ArrowUpRight size={15} />
          </Button>
        </form>
        {ask.error && (
          <div className="form-error" role="alert">
            {ask.error.message}
          </div>
        )}
        {ask.data && (
          <div className="assistant-answer">
            <h3>{ask.data.answer}</h3>
            {ask.data.citations.map((c, index) => (
              <article key={`${c.entity_id}-${index}`} className="citation">
                <span className="eyebrow">
                  SOURCE {index + 1} · PAGE {c.page}
                </span>
                <blockquote>{c.original_text}</blockquote>
                <p>{c.relationship}</p>
                <div className="citation-footer">
                  <span>
                    {c.document_name} · {c.uncertainty} · {Math.round(c.confidence * 100)}%
                    extraction confidence
                  </span>
                  <button
                    className="text-link"
                    onClick={() =>
                      void download(
                        service.originalPath(caseId, c.evidence_id),
                        c.document_name,
                      ).catch((e) => toast(e.message, true))
                    }
                  >
                    Verified source <ArrowUpRight size={14} />
                  </button>
                </div>
              </article>
            ))}
            <details className="limitations">
              <summary>Retrieval limitations</summary>
              <ul>
                {ask.data.limitations.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
