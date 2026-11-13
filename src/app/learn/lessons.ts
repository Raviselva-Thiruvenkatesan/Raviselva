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
import { PLANES_POLYGONS as BIM_PLANES } from './bim/planes-polygons';
import { MATRICES_TRANSFORMS as BIM_MATRICES } from './bim/matrices-transforms';
import { ROTATIONS_IN_DEPTH as BIM_ROTATIONS } from './bim/rotations-in-depth';
import { GEOMETRY_SOLIDS as BIM_SOLIDS } from './bim/geometry-solids';
import { MASTER_GEOMETRY as BIM_MASTER } from './bim/master-geometry';
import { FOUNDATIONS as SQL_FOUNDATIONS } from './sql/foundations';
import { CHANGING_DATA as SQL_CHANGING } from './sql/changing-data';
import { FUNCTIONS as SQL_FUNCTIONS } from './sql/functions';
import { JOINS as SQL_JOINS } from './sql/joins';
import { GROUPING as SQL_GROUPING } from './sql/grouping';
import { ADVANCED as SQL_ADVANCED } from './sql/advanced';
import { PROGRAMMABILITY as SQL_PROGRAMMABILITY } from './sql/programmability';
import { PERFORMANCE as SQL_PERFORMANCE } from './sql/performance';
import { MASTER as SQL_MASTER } from './sql/master';
import { FOUNDATIONS as VK_FOUNDATIONS } from './vulkan/foundations';
import { FIRST_TRIANGLE as VK_FIRST_TRIANGLE } from './vulkan/first-triangle';
import { BUFFERS_MEMORY as VK_BUFFERS_MEMORY } from './vulkan/buffers-memory';
import { IMAGES_3D as VK_IMAGES_3D } from './vulkan/images-3d';
import { ENGINE_ARCHITECTURE as VK_ENGINE_ARCHITECTURE } from './vulkan/engine-architecture';

/** Written lessons per track. Only the lesson page imports this, so lesson text stays out of other pages. */
const LESSONS: Record<string, Lesson[]> = {
  csharp: [...GETTING_STARTED, ...CONTROL_FLOW, ...LOOPS_ARRAYS_METHODS, ...OOP_BASICS, ...OOP_ADVANCED, ...WORKING_WITH_DATA, ...DATA_AND_DELEGATES, ...FUNCTIONAL, ...PATTERNS_MEMORY, ...ADVANCED, ...MASTER, ...EXPERT],
  dsa: [...FOUNDATIONS, ...LINEAR, ...SEARCH_SORT, ...TECHNIQUES, ...TREES, ...GRAPHS, ...DESIGN, ...DSA_MASTER],
  'bim-math': [...BIM_FOUNDATIONS, ...BIM_VECTORS, ...BIM_LINES, ...BIM_PLANES, ...BIM_MATRICES, ...BIM_ROTATIONS, ...BIM_SOLIDS, ...BIM_MASTER],
  sql: [...SQL_FOUNDATIONS, ...SQL_CHANGING, ...SQL_FUNCTIONS, ...SQL_JOINS, ...SQL_GROUPING, ...SQL_ADVANCED, ...SQL_PROGRAMMABILITY, ...SQL_PERFORMANCE, ...SQL_MASTER],
  vulkan: [...VK_FOUNDATIONS, ...VK_FIRST_TRIANGLE, ...VK_BUFFERS_MEMORY, ...VK_IMAGES_3D, ...VK_ENGINE_ARCHITECTURE]
};

export function findLesson(track: string, slug: string): Lesson | undefined {
  return LESSONS[track]?.find(l => l.slug === slug);
}

export function lessonSlugs(track: string): string[] {
  return (LESSONS[track] ?? []).map(l => l.slug);
}
