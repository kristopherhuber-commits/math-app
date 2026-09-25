// Drawn shop pictures (parent request, 2026-09-25): original cartoons, not Starbucks' photo or
// Roblox's logo, so the public repo holds no one else's artwork. Each one pictures the reward plainly
// and carries a caption-like label, so it's clear what the learner is buying. Tokens only (art colours).
import type { ReactNode } from 'react';
import { color } from '../theme/tokens';
import { GiftIcon } from './GiftIcon';

/** A tall iced pink drink with strawberry slices, ice and a straw. */
function DrinkArt() {
  return (
    <svg viewBox="0 0 120 150" width="136" height="170" aria-hidden="true" focusable="false">
      <circle cx="60" cy="78" r="58" fill={color.primarySoft} />
      {/* straw */}
      <rect x="66" y="6" width="8" height="70" rx="3" fill={color.turtle} transform="rotate(12 70 40)" />
      {/* cup: a clear glass with the pink drink inside */}
      <path
        d="M30 34 L90 34 L82 138 Q60 144 38 138 Z"
        fill={color.surface}
        stroke={color.line}
        strokeWidth="3"
      />
      <path d="M33 50 L87 50 L81 134 Q60 140 39 134 Z" fill={color.shell} />
      {/* ice */}
      <rect x="40" y="54" width="16" height="14" rx="3" fill={color.surface} opacity="0.75" />
      <rect x="62" y="60" width="15" height="13" rx="3" fill={color.surface} opacity="0.75" />
      <rect x="48" y="84" width="14" height="12" rx="3" fill={color.surface} opacity="0.7" />
      {/* strawberry slices */}
      {[
        [48, 108],
        [70, 92],
        [62, 120],
      ].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${i * 40 - 30}) scale(1.5)`}>
          <path d="M0 -10 Q10 -8 8 4 Q0 12 -8 4 Q-10 -8 0 -10 Z" fill={color.coral} />
          <path d="M0 -5 Q5 -4 4 3 Q0 7 -4 3 Q-5 -4 0 -5 Z" fill={color.shell} />
          <path d="M-6 -10 L-2 -13 L0 -9 L2 -13 L6 -10 Q0 -7 -6 -10 Z" fill={color.turtle} />
          <circle cx="-3" cy="-2" r="1" fill={color.star} />
          <circle cx="3" cy="0" r="1" fill={color.star} />
          <circle cx="0" cy="5" r="1" fill={color.star} />
        </g>
      ))}
      {/* rim */}
      <rect
        x="27"
        y="30"
        width="66"
        height="7"
        rx="3"
        fill={color.surface}
        stroke={color.line}
        strokeWidth="2"
      />
    </svg>
  );
}

/** A gift card with a big gold coin and "2,000": the amount of Robux on the card. */
function RobuxCardArt() {
  return (
    <svg viewBox="0 0 170 120" width="200" height="141" aria-hidden="true" focusable="false">
      <rect x="6" y="14" width="158" height="96" rx="12" fill={color.penguin} />
      <rect x="6" y="30" width="158" height="12" fill={color.surface} opacity="0.15" />
      {/* a gold coin (a plain hexagon stamp, not Roblox's logo) */}
      <circle cx="52" cy="72" r="28" fill={color.star} />
      <circle cx="52" cy="72" r="22" fill="none" stroke={color.beak} strokeWidth="3" />
      <path
        d="M52 58 L64 65 L64 79 L52 86 L40 79 L40 65 Z"
        fill="none"
        stroke={color.beak}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <text x="90" y="70" fill={color.star} fontSize="23" fontWeight="900" fontFamily="inherit">
        2,000
      </text>
      <text x="90" y="92" fill={color.onParentNav} fontSize="14" fontWeight="800" fontFamily="inherit">
        ROBUX
      </text>
    </svg>
  );
}

const ART: Record<string, { draw: () => ReactNode }> = {
  treat: { draw: DrinkArt },
  robux: { draw: RobuxCardArt },
};

/**
 * The picture for a shop item: the parent's own picture if they added one, else the drawn cartoon
 * for that item, else a gift box. Always paired with the item's name on the card.
 */
export function ShopArt({ id, image, label }: { id: string; image?: string | undefined; label: string }) {
  const art = ART[id];
  return (
    <span className="shop-picture" role="img" aria-label={label}>
      {image ? <img src={image} alt="" /> : art ? art.draw() : <GiftIcon />}
    </span>
  );
}
