// Parent › Rewards (M6): the learner's shop requests to give or cancel (cancel refunds the shells),
// the history, shells to spend and lifetime shells, and the price of each item.
import { useCallback, useEffect, useState } from 'react';
import { isValidPrice } from '../../engine/rewards';
import type { Redemption } from '../../data/db';
import { logError } from '../../data/errors';
import {
  cancelRedemption,
  listRedemptions,
  loadShop,
  markGiven,
  setPrice,
  type ShopSnapshot,
} from '../../data/rewards';
import { parentStrings } from '../strings';

const s = parentStrings.rewards;
const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

function PriceRow({
  id,
  name,
  price,
  onSaved,
}: {
  id: string;
  name: string;
  price: number;
  onSaved: () => void;
}) {
  const [text, setText] = useState(String(price));
  const [note, setNote] = useState('');
  return (
    <form
      className="setting-row"
      onSubmit={(e) => {
        e.preventDefault();
        const p = Number(text);
        if (!isValidPrice(p)) return setNote(s.priceInvalid);
        void setPrice(id, p)
          .then(() => {
            setNote(s.priceSaved);
            onSaved();
          })
          .catch((err: unknown) => logError('setPrice', err));
      }}
    >
      <label className="price-field">
        <span className="setting-label">{name}</span>
        <input
          className="text-input"
          inputMode="numeric"
          value={text}
          aria-label={s.priceOf(name)}
          onChange={(e) => {
            setText(e.target.value);
            setNote('');
          }}
        />
      </label>
      <button type="submit" className="btn btn-small btn-outline">
        {s.savePrice}
      </button>
      <span className="label muted" role="status">
        {note}
      </span>
    </form>
  );
}

export function RewardsPage() {
  const [shop, setShop] = useState<ShopSnapshot | null>(null);
  const [history, setHistory] = useState<Redemption[]>([]);
  const [confirm, setConfirm] = useState<string | null>(null);
  const refresh = useCallback(
    () =>
      void Promise.all([loadShop(), listRedemptions()])
        .then(([sh, h]) => {
          setShop(sh);
          setHistory(h.filter((x) => x.status !== 'requested'));
        })
        .catch((e: unknown) => logError('loadRewards', e)),
    [],
  );
  useEffect(refresh, [refresh]);
  if (!shop) return null;
  const run = (p: Promise<void>) => void p.then(refresh).catch((e: unknown) => logError('redemption', e));

  return (
    <>
      <h1 className="title" tabIndex={-1}>
        {s.title}
      </h1>
      <p className="parent-sub">{s.counts(shop.balance, shop.lifetime)}</p>
      <div className="settings-grid">
        <section className="parent-card" aria-label={s.requests}>
          <h2>{s.requests}</h2>
          {shop.pending.length === 0 && <p className="muted">{s.none}</p>}
          <ul className="queue-list">
            {shop.pending.map((r) => (
              <li key={r.id} className="queue-card">
                <div className="queue-text">
                  <strong>{r.name}</strong>
                  <span className="label muted">{s.requested(r.price, when(r.requestedAt))}</span>
                </div>
                {confirm === r.id ? (
                  <div className="confirm" role="alertdialog" aria-label={s.cancel}>
                    <p>{s.confirmCancel(r.name, r.price)}</p>
                    <div className="queue-actions">
                      <button
                        type="button"
                        className="btn btn-small btn-primary"
                        onClick={() => {
                          setConfirm(null);
                          run(cancelRedemption(r.id));
                        }}
                      >
                        {s.yes}
                      </button>
                      <button
                        type="button"
                        className="btn btn-small btn-outline"
                        onClick={() => setConfirm(null)}
                      >
                        {s.no}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="queue-actions">
                    <button
                      type="button"
                      className="btn btn-small btn-primary"
                      onClick={() => run(markGiven(r.id))}
                    >
                      {s.given}
                    </button>
                    <button
                      type="button"
                      className="btn btn-small btn-outline"
                      onClick={() => setConfirm(r.id)}
                    >
                      {s.cancel}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="parent-card" aria-label={s.prices}>
          <h2>{s.prices}</h2>
          <p className="muted">{s.pricesSub}</p>
          {shop.items.map((i) => (
            <PriceRow key={i.id} id={i.id} name={i.name} price={i.price} onSaved={refresh} />
          ))}
        </section>

        <section className="parent-card" aria-label={s.history}>
          <h2>{s.history}</h2>
          {history.length === 0 && <p className="muted">{s.noHistory}</p>}
          <ul className="done-list">
            {history.map((r) => (
              <li key={r.id}>
                <strong>{r.name}</strong>
                <span className="label muted">
                  {s.status[r.status]} · {r.resolvedAt ? when(r.resolvedAt) : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
