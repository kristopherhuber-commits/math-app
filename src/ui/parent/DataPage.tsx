// Data (R-PAR-6, R-NF-5): export everything to a JSON file, import one (with a confirmation step and a
// schema-version check), reset progress (with a confirmation step), and the in-app error list.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ErrorEntry } from '../../data/db';
import {
  exportData,
  exportFileName,
  importData,
  parseImport,
  resetProgress,
  type ExportFile,
} from '../../data/backup';
import { clearErrors, listErrors, logError } from '../../data/errors';
import { localDay } from '../../data/progress';
import { parentStrings } from '../strings';

const s = parentStrings.data;

export function DataPage({ onChanged }: { onChanged: () => void }) {
  const [status, setStatus] = useState('');
  const [pending, setPending] = useState<{ data: ExportFile; from: number } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const file = useRef<HTMLInputElement>(null);

  const refreshErrors = useCallback(
    () =>
      void listErrors()
        .then(setErrors)
        .catch((e: unknown) => logError('listErrors', e)),
    [],
  );
  useEffect(refreshErrors, [refreshErrors]);

  const download = () =>
    void exportData()
      .then((data) => {
        const url = URL.createObjectURL(
          new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
        );
        const a = document.createElement('a');
        a.href = url;
        a.download = exportFileName(localDay());
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      })
      .catch((e: unknown) => logError('exportData', e));

  const choose = (f: File | undefined) => {
    if (!f) return;
    void f
      .text()
      .then((text) => {
        const r = parseImport(text);
        if (r.ok) {
          setPending({ data: r.data, from: r.fromVersion });
          setStatus('');
        } else {
          setPending(null);
          setStatus(r.reason === 'newer' ? s.importNewer(r.version) : s.importBad);
        }
      })
      .catch(() => setStatus(s.importBad))
      .finally(() => {
        if (file.current) file.current.value = '';
      });
  };

  return (
    <>
      <h1 className="title" tabIndex={-1}>
        {s.title}
      </h1>
      <p className="parent-sub" role="status">
        {status}
      </p>
      <div className="data-grid">
        <section className="parent-card" aria-label={s.exportTitle}>
          <h2>{s.exportTitle}</h2>
          <p>{s.exportSub}</p>
          <button type="button" className="btn btn-primary" onClick={download}>
            {s.export}
          </button>
        </section>

        <section className="parent-card" aria-label={s.importTitle}>
          <h2>{s.importTitle}</h2>
          <p>{s.importSub}</p>
          {pending ? (
            <div role="alertdialog" aria-label={s.importTitle} className="confirm">
              <p>
                {s.importConfirm(pending.data.attempts.length, pending.data.assignments.length, pending.from)}
              </p>
              <div className="queue-actions">
                <button
                  type="button"
                  className="btn btn-small btn-primary"
                  onClick={() => {
                    const data = pending.data;
                    setPending(null);
                    void importData(data)
                      .then(() => {
                        setStatus(s.importDone);
                        onChanged();
                        refreshErrors();
                      })
                      .catch((e: unknown) => logError('importData', e));
                  }}
                >
                  {s.importYes}
                </button>
                <button type="button" className="btn btn-small btn-outline" onClick={() => setPending(null)}>
                  {s.cancel}
                </button>
              </div>
            </div>
          ) : (
            <label className="btn btn-outline file-btn">
              {s.import}
              <input
                ref={file}
                type="file"
                accept="application/json,.json"
                className="visually-hidden"
                onChange={(e) => choose(e.target.files?.[0])}
              />
            </label>
          )}
        </section>

        <section className="parent-card" aria-label={s.resetTitle}>
          <h2>{s.resetTitle}</h2>
          <p>{s.resetSub}</p>
          {confirmReset ? (
            <div role="alertdialog" aria-label={s.resetTitle} className="confirm">
              <p>{s.resetConfirm}</p>
              <div className="queue-actions">
                <button
                  type="button"
                  className="btn btn-small btn-primary"
                  onClick={() => {
                    setConfirmReset(false);
                    void resetProgress()
                      .then(() => setStatus(s.resetDone))
                      .catch((e: unknown) => logError('resetProgress', e));
                  }}
                >
                  {s.resetYes}
                </button>
                <button
                  type="button"
                  className="btn btn-small btn-outline"
                  onClick={() => setConfirmReset(false)}
                >
                  {s.cancel}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn btn-outline" onClick={() => setConfirmReset(true)}>
              {s.reset}
            </button>
          )}
        </section>
      </div>

      <section className="parent-card error-list" aria-label={s.errorsTitle}>
        <h2>{s.errorsTitle}</h2>
        <p className="muted">{s.errorsSub}</p>
        {errors.length === 0 ? (
          <p>{s.errorsNone}</p>
        ) : (
          <>
            <ol>
              {errors.map((e) => (
                <li key={e.id}>
                  <p>
                    <strong>{new Date(e.at).toLocaleString()}</strong> · <code>{e.where}</code> · {e.message}
                  </p>
                  {e.stack && (
                    <details>
                      <summary className="label muted">{s.errorsStack}</summary>
                      <pre>{e.stack}</pre>
                    </details>
                  )}
                </li>
              ))}
            </ol>
            <button
              type="button"
              className="btn btn-small btn-outline"
              onClick={() => void clearErrors().then(refreshErrors)}
            >
              {s.errorsClear}
            </button>
          </>
        )}
      </section>
    </>
  );
}
