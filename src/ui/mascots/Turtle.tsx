// Shelly the turtle: help (design.md §4.1, R-HELP-7). Geometry from docs/design/mockups/_src/gen.py
// `turtle()`. Named parts; poses are transforms of those parts. Decorative only (aria-hidden).
import { color } from '../theme/tokens';

export type TurtlePose = 'idle' | 'wave' | 'think' | 'point' | 'nod';

const PLATES: [number, number][] = [
  [0, 0],
  [-24, 6],
  [24, 6],
  [-12, -16],
  [12, -16],
];

function Shell() {
  return (
    <g>
      <ellipse cx="0" cy="8" rx="52" ry="36" fill={color.turtleDark} />
      <ellipse cx="0" cy="4" rx="46" ry="30" fill={color.turtleShell} />
      {PLATES.map(([x, y]) => (
        <polygon
          key={`${x},${y}`}
          points={`${x - 9},${y} ${x - 4},${y - 8} ${x + 4},${y - 8} ${x + 9},${y} ${x + 4},${y + 8} ${x - 4},${y + 8}`}
          fill={color.turtlePlate}
          opacity="0.9"
        />
      ))}
      <ellipse cx="0" cy="36" rx="50" ry="6" fill={color.turtleBelly} />
    </g>
  );
}

function Head({ transform }: { transform?: string }) {
  return (
    <g transform={transform}>
      <circle cx="-62" cy="-2" r="22" fill={color.turtle} />
      <circle cx="-70" cy="-8" r="6" fill={color.artEye} />
      <circle cx="-71" cy="-7" r="3.4" fill={color.artPupil} />
      <circle cx="-55" cy="-8" r="6" fill={color.artEye} />
      <circle cx="-56" cy="-7" r="3.4" fill={color.artPupil} />
      <path
        d="M-72,6 Q-63,13 -54,6"
        stroke={color.artPupil}
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="-76" cy="2" r="3.5" fill={color.shell} opacity="0.8" />
      <circle cx="-48" cy="2" r="3.5" fill={color.shell} opacity="0.8" />
    </g>
  );
}

function Flipper({ side, transform }: { side: 'front' | 'back'; transform?: string }) {
  const cx = side === 'front' ? -38 : 34;
  const cy = side === 'front' ? 30 : 32;
  return <ellipse cx={cx} cy={cy} rx="14" ry="9" fill={color.turtle} transform={transform} />;
}

/** The raised flipper for `wave`; for `point` it reaches forward towards the term. */
function RaisedFlipper({ pose }: { pose: 'wave' | 'point' }) {
  return pose === 'wave' ? (
    <ellipse cx="46" cy="-18" rx="9" ry="15" transform="rotate(35 46 -18)" fill={color.turtle} />
  ) : (
    <ellipse cx="-80" cy="24" rx="16" ry="7" transform="rotate(-25 -80 24)" fill={color.turtle} />
  );
}

const HEAD: Record<TurtlePose, string | undefined> = {
  idle: undefined,
  wave: undefined,
  think: 'rotate(-10 -62 -2)',
  point: 'translate(-4 0)',
  nod: 'rotate(12 -62 -2) translate(0 3)',
};

export function Turtle({
  pose = 'idle',
  size = 64,
  className,
}: {
  pose?: TurtlePose;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={`turtle ${className ?? ''}`}
      data-pose={pose}
      viewBox="-100 -40 160 84"
      width={size}
      height={(size * 84) / 160}
      aria-hidden="true"
      focusable="false"
    >
      <Flipper side="front" {...(pose === 'point' ? { transform: 'translate(-6 -4)' } : {})} />
      <Flipper side="back" />
      {(pose === 'wave' || pose === 'point') && <RaisedFlipper pose={pose} />}
      <Shell />
      <Head {...(HEAD[pose] ? { transform: HEAD[pose] } : {})} />
    </svg>
  );
}
