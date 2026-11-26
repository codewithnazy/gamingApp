import { previousDay } from './streak';

export { previousDay };

const pad = (n: number) => String(n).padStart(2, '0');

/** A local calendar date as "YYYY-MM-DD" (the key used by the daily reward, challenge and streak). */
export function dateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
