import { useEffect, useState } from 'react';
import { useSettings } from '../settings';

const QUERY = '(prefers-reduced-motion: reduce)';

/** R-NF-3: the OS setting, or the parent's "reduce motion" setting (R-PAR-5). */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.(QUERY).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia?.(QUERY);
    if (!mq) return;
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return useSettings().reduceMotion || reduced;
}
