import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/** R-NF-3: the OS setting. The parent's "reduce motion" setting (R-PAR-5) joins this in M5. */
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
  return reduced;
}
