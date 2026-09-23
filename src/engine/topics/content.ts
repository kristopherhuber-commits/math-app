// Learner-facing content from the engine is an id plus params; src/ui/strings.ts renders the text
// (R-NF-4, R-HELP-5).

export type Params = Record<string, string>;

export interface HintContent {
  id: string;
  params: Params;
}

export type HintTier = 1 | 2 | 3;

export const content = (id: string, params: Params = {}): HintContent => ({ id, params });
