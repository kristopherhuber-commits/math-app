// Parent › Rewards (M6): the learner's shop requests to give or cancel (cancel refunds the shells),
// the history, shells to spend and lifetime shells, and the price of each item.
import { useCallback, useEffect, useState } from 'react';
import { isValidBalance, isValidPrice, isValidShellsTable, type ShellsPerStars } from '../../engine/rewards';
import type { Redemption } from '../../data/db';
import { logError } from '../../data/errors';
import {
  cancelRedemption,
  listRedemptions,
  loadShop,
  markGiven,
  setBalance,
  setImage,
  setPrice,
  setShellsPerStars,
  type ShopSnapshot,
} from '../../data/rewards';
import { GiftIcon } from '../components/GiftIcon';
import { parentStrings } from '../strings';
import { fileToShopImage } from './image';

const s = parentStrings.rewards;
const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** The shells she has to spend, set by hand (the lifetime total and its cosmetics stay as earned). */
function BalanceForm({ balance, onSaved }: { balance: number; onSaved: () => void }) {
  const [text, setText] = useState(String(balance));
  const [note, setNote] = useState('');
  return (
    <form
      className="setting-row"
      onSubmit={(e) => {
        e.preventDefault();
        const n = Number(text);
        if (!isValidBalance(n)) return setNote(s.balanceInvalid);
        void setBalance(n)
          .then(() => {
            setNote(s.saved);
            onSaved();
          })
          .catch((err: unknown) => logError('setBalance', err));
      }}
    >
      <label className="price-field">
        <span className="setting-label">{s.balance}</span>
        <input
          className="text-input"
          inputMode="numeric"
          value={text}
          aria-label={s.balance}
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

/** Shells per 3, 2 and 1 star answer (R-RWD-4 default 3 / 2 / 1). */
function PerStarsForm({ table, onSaved }: { table: ShellsPerStars; onSaved: () => void }) {
  const [text, setText] = useState({ 3: String(table[3]), 2: String(table[2]), 1: String(table[1]) });
  const [note, setNote] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const t = { 1: Number(text[1]), 2: Number(text[2]), 3: Number(text[3]) };
        if (!isValidShellsTable(t)) return setNote(s.perStarsInvalid);
        void setShellsPerStars(t)
          .then(() => {
            setNote(s.saved);
            onSaved();
          })
          .catch((err: unknown) => logError('setShellsPerStars', err));
      }}
    >
      {([3, 2, 1] as const).map((k) => (
        <label key={k} className="setting-row price-field">
          <span className="setting-label">{s.perStars(k)}</span>
          <input
            className="text-input"
            inputMode="numeric"
            value={text[k]}
            aria-label={s.perStars(k)}
            onChange={(e) => {
              setText({ ...text, [k]: e.target.value });
              setNote('');
            }}
          />
        </label>
      ))}
      <div className="setting-row">
        <button type="submit" className="btn btn-small btn-outline">
          {s.savePrice}
        </button>
        <span className="label muted" role="status">
          {note}
        </span>
      </div>
    </form>
  );
}

/** An item's picture: add or replace from a file, or remove. Kept on this device only. */
function PictureRow({
  id,
  name,
  image,
  onSaved,
}: {
  id: string;
  name: string;
  image?: string;
  onSaved: () => void;
}) {
  const [note, setNote] = useState('');
  const save = (img: string | null, done: string) =>
    void setImage(id, img)
      .then(() => {
        setNote(done);
        onSaved();
      })
      .catch((err: unknown) => {
        setNote(s.pictureBad);
        void logError('setImage', err);
      });
  return (
    <div className="setting-row picture-row">
      <span className="picture-preview">
        {image ? <img src={image} alt={s.pictureOf(name)} /> : <GiftIcon />}
      </span>
      <span className="setting-label">{name}</span>
      <label className="btn btn-small btn-outline file-btn">
        {image ? s.pictureChange : s.pictureAdd}
        <input
          type="file"
          accept="image/*"
          className="visually-hidden"
          aria-label={s.pictureFor(name)}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            void fileToShopImage(f)
              .then((img) => save(img, s.pictureSaved))
              .catch(() => setNote(s.pictureBad));
          }}
        />
      </label>
      {image && (
        <button
          type="button"
          className="btn btn-small btn-outline"
          onClick={() => save(null, s.pictureRemoved)}
        >
          {s.pictureRemove}
        </button>
      )}
      <span className="label muted" role="status">
        {note}
      </span>
    </div>
  );
}

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

        <section className="parent-card" aria-label={s.shells}>
          <h2>{s.shells}</h2>
          <p className="muted">{s.shellsSub}</p>
          <BalanceForm key={shop.balance} balance={shop.balance} onSaved={refresh} />
          <h3 className="setting-label">{s.perAnswer}</h3>
          <p className="muted">{s.perAnswerSub}</p>
          <PerStarsForm table={shop.shellsPerStars} onSaved={refresh} />
        </section>

        <section className="parent-card" aria-label={s.prices}>
          <h2>{s.prices}</h2>
          <p className="muted">{s.pricesSub}</p>
          {shop.items.map((i) => (
            <PriceRow key={i.id} id={i.id} name={i.name} price={i.price} onSaved={refresh} />
          ))}
        </section>

        <section className="parent-card" aria-label={s.pictures}>
          <h2>{s.pictures}</h2>
          <p className="muted">{s.picturesSub}</p>
          {shop.items.map((i) => (
            <PictureRow
              key={i.id}
              id={i.id}
              name={i.name}
              {...(i.image ? { image: i.image } : {})}
              onSaved={refresh}
            />
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
