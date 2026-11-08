import { Lesson } from './learn.types';
import { GETTING_STARTED } from './csharp/getting-started';
import { CONTROL_FLOW } from './csharp/control-flow';
import { LOOPS_ARRAYS_METHODS } from './csharp/loops-arrays-methods';
import { OOP_BASICS } from './csharp/oop-basics';
import { OOP_ADVANCED } from './csharp/oop-advanced';
import { WORKING_WITH_DATA } from './csharp/working-with-data';
import { DATA_AND_DELEGATES } from './csharp/data-and-delegates';
import { FUNCTIONAL } from './csharp/functional';
import { PATTERNS_MEMORY } from './csharp/patterns-memory';
import { ADVANCED } from './csharp/advanced';
import { MASTER } from './csharp/master';
import { EXPERT } from './csharp/expert';
import { FOUNDATIONS } from './dsa/foundations';
import { LINEAR } from './dsa/linear';
import { SEARCH_SORT } from './dsa/search-sort';
import { TECHNIQUES } from './dsa/techniques';
import { TREES } from './dsa/trees';
import { GRAPHS } from './dsa/graphs';
import { DESIGN } from './dsa/design';
import { MASTER as DSA_MASTER } from './dsa/master';
import { FOUNDATIONS as BIM_FOUNDATIONS } from './bim/foundations';
import { VECTORS as BIM_VECTORS } from './bim/vectors';
import { LINES_CURVES as BIM_LINES } from './bim/lines-curves';

/** Written lessons per track. Only the lesson page imports this, so lesson text stays out of other pages. */
const LESSONS: Record<string, Lesson[]> = {
  csharp: [...GETTING_STARTED, ...CONTROL_FLOW, ...LOOPS_ARRAYS_METHODS, ...OOP_BASICS, ...OOP_ADVANCED, ...WORKING_WITH_DATA, ...DATA_AND_DELEGATES, ...FUNCTIONAL, ...PATTERNS_MEMORY, ...ADVANCED, ...MASTER, ...EXPERT],
  dsa: [...FOUNDATIONS, ...LINEAR, ...SEARCH_SORT, ...TECHNIQUES, ...TREES, ...GRAPHS, ...DESIGN, ...DSA_MASTER],
  'bim-math': [...BIM_FOUNDATIONS, ...BIM_VECTORS, ...BIM_LINES]
};

export function findLesson(track: string, slug: string): Lesson | undefined {
  return LESSONS[track]?.find(l => l.slug === slug);
}

export function lessonSlugs(track: string): string[] {
  return (LESSONS[track] ?? []).map(l => l.slug);
}
