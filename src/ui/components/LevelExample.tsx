// An example question for a topic's level (the requirements §6–7 level tables), for the free-practice
// level picker and the parent's level lock.
import type { TopicId } from '../../engine/config';
import { strings, topicStrings } from '../strings';
import { Rich, Tex } from './Math';

export function LevelExample({ topic, level }: { topic: TopicId; level: number }) {
  if (topic === 'EQ') return <Rich text={strings.home.levelExamples[level] ?? ''} />;
  return <Tex text={topicStrings.levelExamples[topic]?.[level - 1] ?? ''} />;
}
