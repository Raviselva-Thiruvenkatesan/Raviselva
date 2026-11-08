/**
 * Learn section data model. Lesson content is plain data rendered with normal Angular bindings
 * (no HTML strings), so it works under the strict CSP and nothing in it can inject markup.
 *
 * Text fields support two inline marks:  `code`  and  **bold**.
 */

/** Names of the interactive diagrams a lesson can embed (see lesson-blocks.component.ts). */
export type WidgetName =
  | 'dotnet-pipeline'
  | 'code-anatomy'
  | 'variable-boxes'
  | 'conversion-lab'
  | 'operator-lab'
  | 'string-lab'
  | 'if-flow'
  | 'switch-match'
  | 'loop-stepper'
  | 'array-viz'
  | 'call-stack'
  | 'loop-control'
  | 'grid-2d'
  | 'param-passing'
  | 'recursion'
  | 'debugger';

export type Block =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'code'; code: string; title?: string; output?: string }
  | { type: 'note'; kind: 'tip' | 'warn' | 'info'; text: string }
  | { type: 'table'; head: string[]; rows: string[][] }
  | { type: 'widget'; name: WidgetName }
  | { type: 'quiz'; question: string; options: string[]; answer: number; explain: string }
  | { type: 'exercise'; task: string; hint?: string; solution: string; output?: string };

export interface Lesson {
  slug: string;
  title: string;
  summary: string;
  minutes: number;
  blocks: Block[];
  /** Short recap shown at the end of the lesson. */
  keyPoints: string[];
}

export type Level = 'Beginner' | 'Intermediate' | 'Advanced' | 'Master';

export interface Topic {
  slug: string;
  title: string;
  /** True once the lesson is written (it must then exist in the track's lesson map). */
  ready?: boolean;
}

export interface Module {
  title: string;
  level: Level;
  topics: Topic[];
}

export interface Track {
  slug: string;
  title: string;
  short: string;
  icon: string;          // bootstrap-icons class
  description: string;
  live: boolean;
  modules: Module[];
}
