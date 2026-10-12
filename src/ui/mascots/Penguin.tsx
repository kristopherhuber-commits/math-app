// Pip the penguin: celebration (design.md §4.2, R-HELP-7: never in help, never on a wrong answer).
// Geometry from docs/design/mockups/_src/gen.py `penguin()`. Named parts; poses are transforms of
// those parts, and the movement itself is CSS (rewards.css), so reduced motion can switch it off.
import type { AccessoryKind } from '../../engine/rewards';
import { color } from '../theme/tokens';
import { useWearing } from '../wardrobe';
import { Flower } from './Flower';

export type PenguinPose = 'idle' | 'cheer' | 'hop' | 'slide' | 'clap';

function Feet() {
  return (
    <g>
      <ellipse cx="-16" cy="58" rx="14" ry="6" fill={color.beak} />
      <ellipse cx="16" cy="58" rx="14" ry="6" fill={color.beak} />
    </g>
  );
}

/** Flippers: down at the sides (idle, hop), up (cheer), back (slide) or together in front (clap). */
function Flipper({ side, pose }: { side: 'left' | 'right'; pose: PenguinPose }) {
  const s = side === 'left' ? -1 : 1;
  const [cx, cy, angle] =
    pose === 'cheer'
      ? [44, -14, 35]
      : pose === 'clap'
        ? [12, 6, -30]
        : pose === 'slide'
          ? [42, 22, 60]
          : pose === 'hop'
            ? [44, 8, -30]
            : [40, 14, -15];
  return (
    <ellipse
      className={`penguin-flipper penguin-flipper-${side}`}
      cx={s * cx}
      cy={cy}
      rx="10"
      ry="26"
      transform={`rotate(${s * angle} ${s * cx} ${cy})`}
      fill={color.penguin}
    />
  );
}

function Body() {
  return (
    <g>
      <ellipse cx="0" cy="10" rx="40" ry="50" fill={color.penguin} />
      <ellipse cx="0" cy="20" rx="28" ry="38" fill={color.artEye} />
    </g>
  );
}

const PENGUIN_FLOWERS: [number, number][] = [
  [-25, -50],
  [-14, -59],
  [0, -62],
  [14, -59],
  [25, -50],
];

/** A cape behind the body that flares out at the sides, with a gold clasp at the neck. */
function Cape({ fresh }: { fresh: boolean }) {
  return (
    <path
      className={`accessory accessory-cape${fresh ? ' accessory-new' : ''}`}
      d="M-24,-10 Q-56,30 -50,56 Q0,66 50,56 Q56,30 24,-10 Z"
      fill={color.coral}
    />
  );
}

function Head({ wearing, fresh }: { wearing: readonly AccessoryKind[]; fresh?: AccessoryKind }) {
  // An accessory just put on gets `accessory-new`, so it drops into place (rewards.css).
  const acc = (kind: AccessoryKind) => `accessory accessory-${kind}${kind === fresh ? ' accessory-new' : ''}`;
  return (
    <g className="penguin-head">
      <circle cx="0" cy="-34" r="30" fill={color.penguin} />
      <g className="mascot-eyes">
        <ellipse cx="-10" cy="-32" rx="11" ry="12" fill={color.artEye} />
        <ellipse cx="10" cy="-32" rx="11" ry="12" fill={color.artEye} />
        <circle cx="-9" cy="-31" r="4" fill={color.artPupil} />
        <circle cx="9" cy="-31" r="4" fill={color.artPupil} />
        <circle cx="-7.5" cy="-33" r="1.4" fill={color.artEye} />
        <circle cx="10.5" cy="-33" r="1.4" fill={color.artEye} />
      </g>
      <path d="M-7,-20 L7,-20 L0,-11 Z" fill={color.beak} />
      <circle cx="-20" cy="-20" r="4" fill={color.shell} opacity="0.8" />
      <circle cx="20" cy="-20" r="4" fill={color.shell} opacity="0.8" />
      {wearing.includes('scarf') && (
        <g className={acc('scarf')}>
          <path d="M-30,-10 Q0,4 30,-10 L30,-1 Q0,13 -30,-1 Z" fill={color.coral} />
          <rect x="12" y="-2" width="9" height="22" rx="4" fill={color.coral} transform="rotate(-12 16 -2)" />
        </g>
      )}
      {wearing.includes('bowtie') && (
        <g className={acc('bowtie')}>
          <path d="M0,6 L-13,-1 L-13,13 Z M0,6 L13,-1 L13,13 Z" fill={color.star} />
          <circle cx="0" cy="6" r="3.5" fill={color.coral} />
        </g>
      )}
      {wearing.includes('sunglasses') && (
        <g className={acc('sunglasses')}>
          <rect x="-22" y="-39" width="20" height="14" rx="5" fill={color.artPupil} />
          <rect x="2" y="-39" width="20" height="14" rx="5" fill={color.artPupil} />
          <path d="M-2,-33 L2,-33" stroke={color.artPupil} strokeWidth="3" />
        </g>
      )}
      {wearing.includes('hat') && (
        <g className={acc('hat')}>
          <ellipse cx="0" cy="-60" rx="24" ry="5" fill={color.coral} />
          <rect x="-15" y="-82" width="30" height="23" rx="4" fill={color.coral} />
          <rect x="-15" y="-66" width="30" height="5" fill={color.star} />
        </g>
      )}
      {wearing.includes('flowers') && (
        <g className={acc('flowers')}>
          <path d="M-27,-48 Q0,-72 27,-48" stroke={color.turtle} strokeWidth="3" fill="none" />
          {PENGUIN_FLOWERS.map(([x, y], i) => (
            <Flower key={i} x={x} y={y} r={4} petal={i % 2 ? color.star : color.coral} />
          ))}
        </g>
      )}
      {wearing.includes('headphones') && (
        <g className={acc('headphones')}>
          <path
            d="M-31,-30 Q-31,-70 0,-70 Q31,-70 31,-30"
            stroke={color.coral}
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
          />
          <rect x="-39" y="-42" width="13" height="22" rx="6" fill={color.star} />
          <rect x="26" y="-42" width="13" height="22" rx="6" fill={color.star} />
        </g>
      )}
      {wearing.includes('crown') && (
        <g className={acc('crown')}>
          <path d="M-18,-58 L-18,-78 L-9,-68 L0,-84 L9,-68 L18,-78 L18,-58 Z" fill={color.star} />
          <circle cx="0" cy="-63" r="3.5" fill={color.coral} />
          <circle cx="-11" cy="-63" r="2.4" fill={color.primary} />
          <circle cx="11" cy="-63" r="2.4" fill={color.primary} />
        </g>
      )}
    </g>
  );
}

export function Penguin({
  pose = 'idle',
  size = 96,
  className,
  fresh,
}: {
  pose?: PenguinPose;
  size?: number;
  className?: string;
  /** An accessory just put on (dress up): it drops into place. */
  fresh?: AccessoryKind | undefined;
}) {
  const wearing = useWearing('penguin');
  // A hat or a crown needs room above the head; headphones and flowers a little.
  const top =
    wearing.includes('hat') || wearing.includes('crown')
      ? -88
      : wearing.includes('headphones') || wearing.includes('flowers')
        ? -74
        : -70;
  const height = 66 - top;
  // Clapping flippers sit in front of the body; the others behind it.
  const flippers = (
    <>
      <Flipper side="left" pose={pose} />
      <Flipper side="right" pose={pose} />
    </>
  );
  return (
    <svg
      className={`penguin ${className ?? ''}`}
      data-pose={pose}
      viewBox={`-64 ${top} 128 ${height}`}
      width={size}
      height={(size * height) / 128}
      aria-hidden="true"
      focusable="false"
    >
      <g className="penguin-figure" transform={pose === 'slide' ? 'rotate(-18 0 20)' : undefined}>
        {wearing.includes('cape') && <Cape fresh={fresh === 'cape'} />}
        <Feet />
        {pose !== 'clap' && flippers}
        <Body />
        {wearing.includes('cape') && <circle cx="0" cy="-2" r="4" fill={color.star} />}
        {pose === 'clap' && flippers}
        <Head wearing={wearing} fresh={fresh} />
      </g>
    </svg>
  );
}
