// Typed mirror of tokens.css (docs/design.md §2). Values are CSS variable references,
// so inline styles stay token-only and follow the theme.

const v = (name: string) => `var(--${name})` as const;

export const color = {
  bg: v('bg'),
  surface: v('surface'),
  surfaceSunken: v('surface-sunken'),
  line: v('line'),
  ink: v('ink'),
  inkMuted: v('ink-muted'),
  primary: v('primary'),
  onPrimary: v('on-primary'),
  primarySoft: v('primary-soft'),
  varBg: v('var-bg'),
  varInk: v('var-ink'),
  varLine: v('var-line'),
  constBg: v('const-bg'),
  constInk: v('const-ink'),
  constLine: v('const-line'),
  helpBg: v('help-bg'),
  helpInk: v('help-ink'),
  turtle: v('turtle'),
  turtleDark: v('turtle-dark'),
  turtleShell: v('turtle-shell'),
  turtlePlate: v('turtle-plate'),
  turtleBelly: v('turtle-belly'),
  artEye: v('art-eye'),
  artPupil: v('art-pupil'),
  shell: v('shell'),
  coral: v('coral'),
  success: v('success'),
  successSoft: v('success-soft'),
  amber: v('amber'),
  amberSoft: v('amber-soft'),
} as const;

export const space = [
  v('space-1'),
  v('space-2'),
  v('space-3'),
  v('space-4'),
  v('space-5'),
  v('space-6'),
  v('space-7'),
  v('space-8'),
] as const;

export const radius = {
  sm: v('radius-sm'),
  key: v('radius-key'),
  md: v('radius-md'),
  lg: v('radius-lg'),
  pill: v('radius-pill'),
} as const;

export const duration = {
  fast: v('dur-fast'),
  base: v('dur-base'),
  slow: v('dur-slow'),
  celebrate: v('dur-celebrate'),
} as const;

export type ColorToken = keyof typeof color;
