import type { MissedFilter } from '../../data/stats';
import { parentStrings } from '../strings';

export type { MissedFilter };

export function Missed(props: { filter: MissedFilter; onFilter: (f: MissedFilter) => void }) {
  void props;
  return (
    <h1 className="title" tabIndex={-1}>
      {parentStrings.missed.title}
    </h1>
  );
}
