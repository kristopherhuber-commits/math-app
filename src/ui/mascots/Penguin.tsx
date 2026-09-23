// Pip the penguin: celebration (design.md §4.2, R-HELP-7: never in help, never on a wrong answer).
// Geometry from docs/design/mockups/_src/gen.py `penguin()`. Named parts; poses are transforms of
// those parts, and the movement itself is CSS (rewards.css), so reduced motion can switch it off.
import { color } from '../theme/tokens';

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

function Head() {
  return (
    <g className="penguin-head">
      <circle cx="0" cy="-34" r="30" fill={color.penguin} />
      <ellipse cx="-10" cy="-32" rx="11" ry="12" fill={color.artEye} />
      <ellipse cx="10" cy="-32" rx="11" ry="12" fill={color.artEye} />
      <circle cx="-9" cy="-31" r="4" fill={color.artPupil} />
      <circle cx="9" cy="-31" r="4" fill={color.artPupil} />
      <circle cx="-7.5" cy="-33" r="1.4" fill={color.artEye} />
      <circle cx="10.5" cy="-33" r="1.4" fill={color.artEye} />
      <path d="M-7,-20 L7,-20 L0,-11 Z" fill={color.beak} />
      <circle cx="-20" cy="-20" r="4" fill={color.shell} opacity="0.8" />
      <circle cx="20" cy="-20" r="4" fill={color.shell} opacity="0.8" />
    </g>
  );
}

export function Penguin({
  pose = 'idle',
  size = 96,
  className,
}: {
  pose?: PenguinPose;
  size?: number;
  className?: string;
}) {
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
      viewBox="-64 -70 128 136"
      width={size}
      height={(size * 136) / 128}
      aria-hidden="true"
      focusable="false"
    >
      <g className="penguin-figure" transform={pose === 'slide' ? 'rotate(-18 0 20)' : undefined}>
        <Feet />
        {pose !== 'clap' && flippers}
        <Body />
        {pose === 'clap' && flippers}
        <Head />
      </g>
    </svg>
  );
}
