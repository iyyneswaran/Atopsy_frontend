'use client';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Download,
  Eye,
  FileText,
  Fingerprint,
  Search,
  ShieldCheck,
  UploadCloud,
  X,
} from 'lucide-react';
import { useSnapshot } from '@/hooks/queries';
import {
  Button,
  Badge,
  EmptyState,
  ErrorState,
  Modal,
  Pagination,
  Skeleton,
} from '@/components/ui/primitives';
import { useToast } from '@/components/providers';
import { bytes, date, humanize } from '@/lib/utils';
import { download, request, uploadFiles } from '@/lib/api/client';
import { service } from '@/services/investigations';
import type { Evidence, UploadResult } from '@/types/api';

export function EvidenceWorkspace({ caseId }: { caseId: string }) {
  const query = useSnapshot(caseId);
  const [upload, setUpload] = useState(false);
  const [detail, setDetail] = useState<Evidence | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('newest');
  const items = (query.data?.evidence || [])
    .filter(
      (e) =>
        (!category || e.category === category) &&
        `${e.original_filename} ${e.sha256_hash} ${e.tags?.join(' ')}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === 'name'
        ? a.original_filename.localeCompare(b.original_filename)
        : b.created_at.localeCompare(a.created_at),
    );
  return (
    <>
      <div className="panel">
        <div className="panel-heading">
          <h2>
            <LayersIcon /> Evidence register{' '}
            <span className="count-pill">{query.data?.evidence.length ?? '—'}</span>
          </h2>
          <Button onClick={() => setUpload(true)}>
            <UploadCloud size={16} /> Upload evidence
          </Button>
        </div>
        <div className="filter-bar">
          <div className="search-field">
            <Search size={16} />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              aria-label="Search evidence"
              placeholder="Search filename, tag or SHA-256…"
            />
          </div>
          <select
            aria-label="Evidence category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All file categories</option>
            {Array.from(new Set(query.data?.evidence.map((e) => e.category))).map((c) => (
              <option key={c} value={c}>
                {humanize(c)}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            aria-label="Sort evidence"
          >
            <option value="newest">Newest first</option>
            <option value="name">Filename</option>
          </select>
        </div>
        {query.isPending ? (
          <Skeleton rows={5} />
        ) : query.isError ? (
          <ErrorState error={query.error} retry={() => void query.refetch()} />
        ) : items.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Evidence file</th>
                  <th>Category</th>
                  <th>Size</th>
                  <th>Registered</th>
                  <th>Status</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {items.slice((page - 1) * 10, page * 10).map((evidence) => (
                  <tr key={evidence.id}>
                    <td>
                      <button className="case-cell text-button" onClick={() => setDetail(evidence)}>
                        <span className="table-file">
                          <FileText size={18} />
                        </span>
                        <div>
                          <strong>{evidence.original_filename}</strong>
                          <small>
                            {evidence.tags?.map(humanize).join(' · ') || evidence.mime_type}
                          </small>
                        </div>
                      </button>
                    </td>
                    <td>{humanize(evidence.category)}</td>
                    <td className="muted nowrap">{bytes(evidence.file_size)}</td>
                    <td className="muted nowrap">{date(evidence.created_at)}</td>
                    <td>
                      <Badge status={evidence.status} />
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label={`Inspect ${evidence.original_filename}`}
                        onClick={() => setDetail(evidence)}
                      >
                        <Eye size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title={
              search || category
                ? 'No matching evidence'
                : 'Every investigation starts with evidence'
            }
            description={
              search || category
                ? 'Adjust your search or file category.'
                : 'Register original files to preserve their identity and begin examination.'
            }
          >
            {!search && !category && (
              <Button onClick={() => setUpload(true)}>
                <UploadCloud size={16} /> Upload evidence
              </Button>
            )}
          </EmptyState>
        )}
        <Pagination page={page} size={10} total={items.length} onPage={setPage} />
      </div>
      <div className="inline-note">
        <ShieldCheck size={16} /> Original downloads are verified against the stored SHA-256
        checksum.
      </div>
      <Modal
        title="Register evidence"
        subtitle="Preserve the original. Start a traceable examination."
        open={upload}
        onClose={() => setUpload(false)}
      >
        {upload && <UploadForm caseId={caseId} onClose={() => setUpload(false)} />}
      </Modal>
      <Modal
        title="Evidence details"
        subtitle={detail?.original_filename}
        open={!!detail}
        onClose={() => setDetail(null)}
        wide
      >
        {detail && <EvidenceDetail key={detail.id} caseId={caseId} evidence={detail} />}
      </Modal>
    </>
  );
}
function LayersIcon() {
  return <Fingerprint size={18} />;
}
function UploadForm({ caseId, onClose }: { caseId: string; onClose: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState('DOCUMENT');
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<UploadResult | null>(null);
  const cache = useQueryClient();
  const toast = useToast();
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const choose = (chosen: File[]) => {
    setError('');
    setResult(null);
    if (!chosen.length) return;
    if (chosen.length > 20) {
      setError('Choose up to 20 files per upload.');
      return;
    }
    if (chosen.some((f) => !f.size || f.size > 500 * 1024 * 1024)) {
      setError('Files must be nonempty and no larger than 500 MB each.');
      return;
    }
    setFiles(chosen);
  };
  return (
    <form
      className="modal-body stack-form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy || !files.length) return;
        setBusy(true);
        setError('');
        setResult(null);
        setProgress(0);
        controller.current = new AbortController();
        try {
          const response = await uploadFiles(
            caseId,
            files,
            category,
            setProgress,
            controller.current.signal,
          );
          setResult(response);
          const count = response.results.filter((r) => r.status === 'COMPLETED').length;
          if (count) {
            toast(`${count} evidence ${count === 1 ? 'file registered' : 'files registered'}`);
            setFiles([]);
          }
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
          void cache.invalidateQueries({ queryKey: ['snapshot', caseId] });
          void cache.invalidateQueries({ queryKey: ['case', caseId] });
          void cache.invalidateQueries({ queryKey: ['cases'] });
          void cache.invalidateQueries({ queryKey: ['dashboard'] });
          void cache.invalidateQueries({ queryKey: ['runs', caseId] });
          void cache.invalidateQueries({ queryKey: ['audit', caseId] });
        }
      }}
    >
      <label>
        Evidence classification
        <select disabled={busy} value={category} onChange={(e) => setCategory(e.target.value)}>
          {['DOCUMENT', 'AUTOPSY_REPORT', 'TOXICOLOGY', 'WITNESS', 'INQUEST', 'CCTV', 'SCENE'].map(
            (c) => (
              <option key={c} value={c}>
                {humanize(c)}
              </option>
            ),
          )}
        </select>
      </label>
      <label
        className={`dropzone ${busy ? 'disabled' : ''}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!busy) choose(Array.from(e.dataTransfer.files));
        }}
      >
        <UploadCloud size={30} strokeWidth={1.3} />
        <strong>Drop evidence files here</strong>
        <span>or click to browse · up to 20 files, 500 MB each</span>
        <input
          type="file"
          multiple
          disabled={busy}
          aria-label="Choose evidence files"
          onChange={(e) => choose(Array.from(e.target.files || []))}
        />
      </label>
      <p className="field-hint">
        Text documents, PDFs and images can be examined. Other supported originals may be retained
        with an explicit extraction limitation.
      </p>
      {files.length > 0 && (
        <ul className="upload-files">
          {files.map((file, i) => (
            <li key={`${file.name}-${i}`}>
              <FileText size={16} />
              <span>
                {file.name}
                <small>{bytes(file.size)}</small>
              </span>
              <button
                type="button"
                className="icon-button"
                disabled={busy}
                aria-label={`Remove ${file.name}`}
                onClick={() => setFiles((current) => current.filter((_, index) => index !== i))}
              >
                <X size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {busy && (
        <div className="upload-progress" role="status">
          <div>
            <span>
              {progress < 100 ? 'Transferring originals…' : 'Validating and registering evidence…'}
            </span>
            <strong>{progress}%</strong>
          </div>
          <progress value={progress} max={100} />
        </div>
      )}
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      {result && (
        <div className="upload-results" aria-live="polite">
          {result.results.map((r, i) => (
            <div key={i}>
              <Badge status={r.status} />
              <span>{r.filename || r.original_filename || `File ${i + 1}`}</span>
              {r.error && <p className="field-error">{r.error}</p>}
            </div>
          ))}
          {result.run && (
            <p className="muted">Examination version {result.run.version} has been queued.</p>
          )}
        </div>
      )}
      <div className="modal-footer">
        <Button
          variant="secondary"
          type="button"
          onClick={busy ? () => controller.current?.abort() : onClose}
        >
          {busy ? 'Cancel transfer' : result ? 'Done' : 'Cancel'}
        </Button>
        <Button type="submit" busy={busy} disabled={!files.length}>
          <UploadCloud size={16} /> Register {files.length || ''}{' '}
          {files.length === 1 ? 'file' : 'files'}
        </Button>
      </div>
    </form>
  );
}
function EvidenceDetail({ caseId, evidence }: { caseId: string; evidence: Evidence }) {
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  const previewable = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'text/plain',
    'text/csv',
    'application/json',
  ].includes(evidence.mime_type);
  return (
    <div className="modal-body">
      <dl className="detail-grid">
        <div>
          <dt>Filename</dt>
          <dd>{evidence.original_filename}</dd>
        </div>
        <div>
          <dt>File type</dt>
          <dd>{evidence.mime_type}</dd>
        </div>
        <div>
          <dt>Size</dt>
          <dd>{bytes(evidence.file_size)}</dd>
        </div>
        <div>
          <dt>Registered</dt>
          <dd>{date(evidence.created_at, true)}</dd>
        </div>
        <div className="span-2">
          <dt>SHA-256 fingerprint</dt>
          <dd className="hash-value">{evidence.sha256_hash}</dd>
        </div>
        <div className="span-2">
          <dt>Evidence ID</dt>
          <dd className="mono">{evidence.id}</dd>
        </div>
      </dl>
      <div className="action-row">
        <Button
          variant="secondary"
          busy={busy}
          disabled={!previewable || !!url || !!text}
          onClick={async () => {
            setBusy(true);
            setError('');
            try {
              const response = await request(service.originalPath(caseId, evidence.id));
              const blob = await response.blob();
              if (
                evidence.mime_type.startsWith('text/') ||
                evidence.mime_type === 'application/json'
              )
                setText(await blob.text());
              else setUrl(URL.createObjectURL(blob));
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Eye size={16} /> Verify & preview
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            void download(
              service.originalPath(caseId, evidence.id),
              evidence.original_filename,
            ).catch((e) => toast(e.message, true))
          }
        >
          <Download size={16} /> Download original
        </Button>
      </div>
      {!previewable && (
        <p className="muted small">
          Preview is unavailable for this file type. Download the verified original to inspect it.
        </p>
      )}
      {error && <ErrorState error={new Error(error)} />}
      {text && <pre className="document-preview">{text}</pre>}
      {url && (
        <iframe
          className="file-preview"
          sandbox=""
          src={url}
          title={`Preview of ${evidence.original_filename}`}
        />
      )}
    </div>
  );
}
