import { SilsonGeneration } from '../domain/types';

/** 실손 세대 자동 태깅 — 가입일 기준 (docs/05 §1) */
export function tagGeneration(subscribedOn?: string): SilsonGeneration | undefined {
  if (!subscribedOn) return undefined;
  if (subscribedOn <= '2009-09-30') return 1;
  if (subscribedOn <= '2017-03-31') return 2;
  if (subscribedOn <= '2021-06-30') return 3;
  return 4;
}
