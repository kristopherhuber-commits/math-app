import type { TopicId } from '../../engine/config';
import { parentStrings } from '../strings';

export interface MissedFilter {
  topic?: TopicId;
  from?: string;
  to?: string;
  code?: string;
}

export function Missed(props: { filter: MissedFilter; onFilter: (f: MissedFilter) => void }) {
  void props;
  return (
    <h1 className="title" tabIndex={-1}>
      {parentStrings.missed.title}
    </h1>
  );
}
