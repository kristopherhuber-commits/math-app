// The shop (R-RWD-4 as the parent reshaped it, M6): real rewards bought with shells to spend. Buying
// takes the shells at once and leaves a request a grown-up gives or cancels. No timers, no pressure:
// an item the learner can't buy yet says how many more shells it needs.
import { useCallback, useEffect, useState } from 'react';
import { shellsShort } from '../../engine/rewards';
import type { ShopItem } from '../../data/db';
import { logError } from '../../data/errors';
import { buy, loadShop, type ShopSnapshot } from '../../data/rewards';
import { ShopArt } from '../components/ShopArt';
import { ShellIcon } from '../components/TopBar';
import { Penguin } from '../mascots/Penguin';
import { shopStrings as s } from '../strings';

export function Shop({ onHome }: { onHome: () => void }) {
  const [shop, setShop] = useState<ShopSnapshot | null>(null);
  const [asking, setAsking] = useState<ShopItem | null>(null);
  const [message, setMessage] = useState('');
  const refresh = useCallback(
    () =>
      void loadShop()
        .then(setShop)
        .catch((e: unknown) => logError('loadShop', e)),
    [],
  );
  useEffect(refresh, [refresh]);
  if (!shop) return <main className="home" />;

  return (
    <main className="home shop">
      <header className="home-header">
        <div>
          <button type="button" className="btn btn-outline btn-small" onClick={onHome}>
            {s.home}
          </button>
          <h1 className="display">{s.title}</h1>
        </div>
        <span className="home-counter">
          <ShellIcon size={40} />
          <span>
            <strong>{shop.balance}</strong>
            <span className="label muted">{s.toSpend}</span>
          </span>
        </span>
      </header>
      <p className="shop-message" role="status">
        {message}
      </p>
      <ul className="shop-grid">
        {shop.items.map((item) => {
          const short = shellsShort(shop.balance, item.price);
          return (
            <li key={item.id} className="card shop-card">
              <ShopArt id={item.id} image={item.image} label={s.pictureOf(item.name)} />
              <h2 className="title">{item.name}</h2>
              {item.note && <p className="shop-note">{item.note}</p>}
              <p className="shop-price">
                <ShellIcon size={28} /> {s.price(item.price)}
              </p>
              {asking?.id === item.id ? (
                <div className="shop-confirm" role="alertdialog" aria-label={s.sure(item.name, item.price)}>
                  <p>{s.sure(item.name, item.price)}</p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setAsking(null);
                      void buy(item.id)
                        .then((r) => setMessage(r.ok ? s.bought(item.name) : s.more(r.short)))
                        .then(refresh)
                        .catch((e: unknown) => logError('buy', e));
                    }}
                  >
                    {s.yes}
                  </button>
                  <button type="button" className="btn btn-outline" onClick={() => setAsking(null)}>
                    {s.no}
                  </button>
                </div>
              ) : short > 0 ? (
                <p className="shop-short">{s.more(short)}</p>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setMessage('');
                    setAsking(item);
                  }}
                >
                  {s.buy}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {shop.pending.length > 0 && (
        <section className="card shop-pending" aria-labelledby="pending-title">
          <Penguin size={72} pose="clap" />
          <div>
            <h2 id="pending-title" className="title">
              {s.waitingTitle}
            </h2>
            <ul>
              {shop.pending.map((p) => (
                <li key={p.id}>{s.waiting(p.name)}</li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </main>
  );
}
