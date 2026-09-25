// A practice session (requirements §4): the questions of an assignment, free practice in one topic,
// or a fixed level from a link. The Session chooses each question (topic, level, seed), mounts the
// right practice screen for it, and applies what a solved question earns (R-SES, R-ADP, R-RWD).
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { TopicId } from '../../engine/config';
import { newSeed } from '../../engine/rng';
import { freeAdapt, freeStart, rightFirstTime, type FreeState } from '../../engine/adaptive';
import { useSettings } from '../settings';
import { useWardrobe } from '../wardrobe';
import { saveAttempt } from '../../data/attempts';
import { logError } from '../../data/errors';
import type { Attempt } from '../../data/db';
import {
  assignmentProgress,
  finishAttempt,
  getAssignment,
  nextAssignmentQuestion,
  practiceSettings,
  shellCount,
  type FinishEvents,
} from '../../data/progress';
import { TopBar, type TopBarProgress } from '../components/TopBar';
import { CelebrationProvider } from '../practice/question';
import { isTileLevel } from '../practice/tileReducer';
import { topicStrings } from '../strings';
import { Celebration, StreakCelebration } from '../components/Celebration';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { EquationPractice } from './EquationPractice';
import { McPractice } from './McPractice';
import { NcPractice } from './NcPractice';
import { TileEquation } from './TileEquation';

export type SessionKind =
  | { kind: 'assignment'; id: string }
  /** Free practice: a level the learner picked, or Adaptive (starts at 3, faster rules; parent decision). */
  | { kind: 'free'; topic: TopicId; level: number | 'adaptive' }
  /** `?topic=…&level=…[&seed=…]`: for the parent and tests; no adaptive or reward changes. */
  | { kind: 'fixed'; topic: TopicId; level: number; seed?: number };

interface Current {
  topic: TopicId;
  level: number;
  seed: number;
  itemIndex?: number;
  adaptive: boolean;
  rewarded: boolean;
  progress: TopBarProgress;
  key: number;
}

interface Props {
  kind: SessionKind;
  currency: string;
  naturalIncludesZero: boolean;
  onHome: () => void;
  onSummary: (assignmentId: string) => void;
}

export function Session({ kind, currency, naturalIncludesZero, onHome, onSummary }: Props) {
  const [cur, setCur] = useState<Current | null>(null);
  const [stars, setStars] = useState(0);
  const [shells, setShells] = useState(0);
  const [events, setEvents] = useState<FinishEvents | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const osReduced = useReducedMotion();
  const [streak, setStreak] = useState<number | null>(null);
  /** Questions started in this session (free practice and fixed levels count from 1). */
  const started = useRef(0);
  /** Free practice, R-HELP-6: the level to stay at after a walkthrough. */
  const stayAt = useRef<number | null>(null);
  const bounds = useSettings().levelBounds;
  const wardrobe = useWardrobe();
  /** Adaptive free practice: this session's own level and window (the stored level is left alone). */
  const free = useRef<FreeState | null>(
    kind.kind === 'free' && kind.level === 'adaptive' ? freeStart(bounds[kind.topic]) : null,
  );
  /** The solved question's finishAttempt; Next waits for it so progress is stored first. */
  const pending = useRef<Promise<FinishEvents> | null>(null);
  const advancing = useRef(false);

  /** The next question, or null when the assignment is done. */
  const load = useCallback(async (): Promise<Current | null> => {
    const n = ++started.current;
    if (kind.kind === 'assignment') {
      const a = await getAssignment(kind.id);
      if (!a || a.status === 'done') return null;
      const [q, p] = await Promise.all([nextAssignmentQuestion(a), assignmentProgress(a)]);
      if (!q) return null;
      setStars(p.stars);
      // Grouped: the position within the item (mockup 08); mixed: within the whole assignment.
      const progress =
        a.order === 'mixed'
          ? { n: q.index + 1, total: p.total }
          : { n: (p.done[q.itemIndex] ?? 0) + 1, total: a.items[q.itemIndex]!.count };
      return {
        topic: q.topic,
        level: q.level,
        seed: q.seed,
        itemIndex: q.itemIndex,
        adaptive: q.adaptive,
        rewarded: true,
        progress,
        key: n,
      };
    }
    if (kind.kind === 'free') {
      const level = stayAt.current ?? (kind.level === 'adaptive' ? free.current!.level : kind.level);
      return {
        topic: kind.topic,
        level,
        seed: newSeed(),
        // The stored (assignment) level only moves in assignments; free practice keeps its own.
        adaptive: false,
        rewarded: true,
        progress: { n },
        key: n,
      };
    }
    const seed = n === 1 && kind.seed !== undefined ? kind.seed : newSeed();
    return {
      topic: kind.topic,
      level: kind.level,
      seed,
      adaptive: false,
      rewarded: false,
      progress: { n },
      key: n,
    };
  }, [kind]);

  const advance = useCallback(async () => {
    const next = await load();
    if (!next) {
      if (kind.kind === 'assignment') onSummary(kind.id);
      else onHome();
      return;
    }
    setEvents(null);
    setCur(next);
  }, [load, kind, onHome, onSummary]);

  useEffect(() => {
    void Promise.all([shellCount(), practiceSettings()]).then(([s, p]) => {
      setShells(s);
      setReduceMotion(p.reduceMotion);
    });
    // The first question. State is set after awaiting storage, never synchronously here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void advance();
    // Once per session; `advance` is stable for a given `kind`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tag = useCallback(
    (a: Attempt): Attempt =>
      kind.kind === 'assignment' && cur?.itemIndex !== undefined
        ? { ...a, assignmentId: kind.id, itemIndex: cur.itemIndex }
        : kind.kind === 'fixed'
          ? { ...a, fixed: true }
          : a,
    [kind, cur],
  );

  const onSave = useCallback((a: Attempt) => void saveAttempt(tag(a)), [tag]);

  const onSolved = useCallback(
    (a: Attempt) => {
      if (!cur) return;
      let levelUp: number | undefined;
      if (kind.kind === 'free') {
        // R-HELP-6: after a walkthrough, the same level next; a level change applies after that.
        stayAt.current = a.maxHint === 3 ? a.level : null;
        if (free.current && a.level === free.current.level) {
          const r = freeAdapt(
            free.current,
            rightFirstTime({ maxHint: a.maxHint, wrongTries: a.wrongTries ?? 0 }),
            bounds[kind.topic],
          );
          free.current = { level: r.level, recent: r.recent };
          if (r.change === 'promote') levelUp = r.level;
        }
      }
      const fallback: FinishEvents = { stars: a.stars ?? 1, shells, badges: [] };
      pending.current = finishAttempt(tag(a), { adaptive: cur.adaptive, rewarded: cur.rewarded }).catch(
        (e: unknown) => {
          // R-NF-5: never surface storage errors to the learner.
          void logError('finishAttempt', e);
          return fallback;
        },
      );
      void pending.current.then((e) => {
        if (e.unlocked?.length) wardrobe.refresh();
        setEvents(levelUp !== undefined ? { ...e, levelUp } : e);
        if (e.streak?.milestone) setStreak(e.streak.days);
        setStars((s) => s + e.stars);
        if (cur.rewarded) setShells(e.shells);
      });
    },
    [cur, kind, shells, tag, bounds, wardrobe],
  );

  const onNext = useCallback(() => {
    if (advancing.current) return;
    advancing.current = true;
    void (pending.current ?? Promise.resolve(null))
      .then((e) => {
        pending.current = null;
        if (e?.assignmentDone) onSummary(e.assignmentDone);
        else return advance();
      })
      .finally(() => {
        advancing.current = false;
      });
  }, [advance, onSummary]);

  const closeStreak = useCallback(() => setStreak(null), []);

  if (!cur) return <div className="screen" />;

  const common = { level: cur.level, seed: cur.seed, onSave, onSolved, onNext };
  const screen = (): ReactNode => {
    switch (cur.topic) {
      case 'NC':
        return <NcPractice key={cur.key} {...common} naturalIncludesZero={naturalIncludesZero} />;
      case 'RD':
      case 'FDP':
      case 'PC':
        return <McPractice key={cur.key} {...common} topic={cur.topic} currency={currency} />;
      case 'EQ':
        // R-ANS-5: levels 1–2 use the tile builder, levels 3+ typed steps.
        return isTileLevel(cur.level) ? (
          <TileEquation key={cur.key} {...common} />
        ) : (
          <EquationPractice key={cur.key} {...common} />
        );
    }
  };

  const celebration = events ? (
    <Celebration events={events} reduced={reduceMotion || osReduced} showShells={cur.rewarded} />
  ) : null;

  return (
    <div className="screen">
      <TopBar
        title={topicStrings.name[cur.topic]}
        progress={cur.progress}
        stars={stars}
        shells={shells}
        onHome={onHome}
      />
      <CelebrationProvider value={celebration}>{screen()}</CelebrationProvider>
      {streak !== null && <StreakCelebration days={streak} onClose={closeStreak} />}
    </div>
  );
}
