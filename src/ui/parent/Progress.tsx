import { parentStrings } from '../strings';
import type { MissedFilter } from './Missed';

export function Progress(props: { onOpenMissed: (f: MissedFilter) => void }) {
  void props;
  return (
    <h1 className="title" tabIndex={-1}>
      {parentStrings.progress.title}
    </h1>
  );
}
