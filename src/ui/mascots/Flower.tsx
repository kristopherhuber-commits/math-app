// A small flower for the flower crowns (R-RWD-4 cosmetics). Decorative SVG; tokens only.
import { color } from '../theme/tokens';

/** A five-petal flower for the flower crowns. */
export function Flower({ x, y, petal, r = 3 }: { x: number; y: number; petal: string; r?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <circle key={a} cx="0" cy={-r} r={r * 0.75} fill={petal} transform={`rotate(${a})`} />
      ))}
      <circle cx="0" cy="0" r={r * 0.6} fill={color.artEye} />
    </g>
  );
}
