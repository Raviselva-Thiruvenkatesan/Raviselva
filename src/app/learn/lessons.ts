import { Lesson } from './learn.types';
import { GETTING_STARTED } from './csharp/getting-started';
import { CONTROL_FLOW } from './csharp/control-flow';
import { LOOPS_ARRAYS_METHODS } from './csharp/loops-arrays-methods';
import { OOP_BASICS } from './csharp/oop-basics';

/** Written lessons per track. Only the lesson page imports this, so lesson text stays out of other pages. */
const LESSONS: Record<string, Lesson[]> = {
  csharp: [...GETTING_STARTED, ...CONTROL_FLOW, ...LOOPS_ARRAYS_METHODS, ...OOP_BASICS]
};

export function findLesson(track: string, slug: string): Lesson | undefined {
  return LESSONS[track]?.find(l => l.slug === slug);
}

export function lessonSlugs(track: string): string[] {
  return (LESSONS[track] ?? []).map(l => l.slug);
}
