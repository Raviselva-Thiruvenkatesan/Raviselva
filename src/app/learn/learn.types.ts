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
  | 'debugger'
  | 'class-objects'
  | 'constructor-flow'
  | 'property-guard'
  | 'access-matrix'
  | 'static-counter'
  | 'inheritance-tree'
  | 'virtual-dispatch'
  | 'abstract-shapes'
  | 'interface-plug'
  | 'value-ref'
  | 'enum-flags'
  | 'format-lab'
  | 'date-lab'
  | 'exception-flow'
  | 'list-dict'
  | 'stack-queue-set'
  | 'generic-box'
  | 'null-safety'
  | 'file-sim'
  | 'json-lab'
  | 'delegate-pipe'
  | 'lambda-builder'
  | 'event-bus'
  | 'extension-chain'
  | 'linq-pipeline'
  | 'linq-group'
  | 'pattern-match'
  | 'tuple-lab'
  | 'gc-sim'
  | 'using-scope'
  | 'yield-stepper'
  | 'async-timeline'
  | 'parallel-cores'
  | 'race-condition'
  | 'reflection-inspector'
  | 'span-slice'
  | 'solid-impact'
  | 'pattern-lab'
  | 'di-lifetimes'
  | 'test-runner'
  | 'benchmark-lab'
  | 'pointer-memory'
  | 'source-gen'
  | 'architecture-layers'
  // DSA
  | 'lookup-race'
  | 'growth-chart'
  | 'step-counter'
  | 'space-meter'
  | 'call-tree'
  | 'array-memory'
  | 'list-growth'
  | 'linked-list'
  | 'dll-rewire'
  | 'bracket-checker'
  | 'ring-buffer'
  | 'binary-search'
  | 'bounds-finder'
  | 'sort-stepper'
  | 'merge-viz'
  | 'quick-viz'
  | 'counting-sort'
  | 'sort-keys'
  | 'hash-buckets'
  | 'pair-finder'
  | 'two-pointers'
  | 'sliding-window'
  | 'prefix-sums'
  | 'bit-lab'
  | 'tree-anatomy'
  | 'traversal-stepper'
  | 'bst-lab'
  | 'avl-viz'
  | 'heap-viz'
  | 'trie-viz'
  | 'graph-store'
  | 'bfs-grid'
  | 'dfs-stepper'
  | 'topo-sort'
  | 'dijkstra-viz'
  | 'bellman-floyd'
  | 'mst-viz'
  | 'union-find'
  | 'interval-scheduler'
  | 'recurrence-tree'
  | 'n-queens'
  | 'dp-table'
  | 'grid-paths'
  | 'lcs-table'
  | 'segment-tree'
  | 'string-match'
  | 'quadtree'
  | 'convex-hull'
  | 'tsp-explorer'
  | 'pattern-picker'
  // BIM Math
  | 'wall-anatomy'
  | 'axes-3d'
  | 'tolerance-lab'
  | 'angle-dial'
  | 'roof-pitch'
  | 'point-vector'
  | 'vector-add'
  | 'unit-vector'
  | 'dot-product'
  | 'cross-product'
  | 'vec3-calc'
  | 'param-line'
  | 'closest-point'
  | 'line-intersect'
  | 'three-point-arc'
  | 'polyline-lab'
  | 'bezier'
  | 'plane-eq'
  | 'point-plane'
  | 'line-plane'
  | 'shoelace'
  | 'pip-triangulate'
  | 'poly-boolean'
  | 'matrix-2d'
  | 'rotation'
  | 'homogeneous'
  | 'compose'
  | 'local-world'
  | 'mirror'
  | 'gimbal'
  | 'quaternion'
  | 'slerp'
  | 'bbox'
  | 'mesh'
  | 'ray-triangle'
  | 'sat'
  | 'volume'
  | 'section'
  | 'robust'
  | 'georef'
  | 'camera'
  | 'nurbs'
  | 'spatial'
  | 'room-engine'
  // SQL Server
  | 'db-anatomy'
  | 'type-fit'
  | 'select-builder'
  | 'where-lab'
  | 'null-logic'
  | 'sort-page'
  | 'table-designer'
  | 'insert-lab'
  | 'update-delete'
  | 'constraint-guard'
  | 'identity-gaps'
  | 'alter-impact'
  | 'sql-string'
  | 'round-lab'
  | 'datediff-line'
  | 'case-flow'
  | 'convert-matrix'
  | 'key-follow'
  | 'join-inner'
  | 'join-outer'
  | 'pair-matrix'
  | 'set-venn'
  | 'normal-forms'
  | 'agg-null' | 'group-buckets' | 'correlated' | 'exists-probe' | 'cte-chain' | 'bom-explode'
  | 'rank-ties' | 'window-frame' | 'pivot-turn' | 'apply-runner' | 'json-path' | 'merge-sync'
  | 'view-check' | 'batch-split' | 'proc-call' | 'udf-kinds' | 'try-catch-flow' | 'trigger-audit'
  | 'btree-pages' | 'page-split' | 'lookup-tipping' | 'plan-reader' | 'sarg-check' | 'param-sniff'
  | 'tx-stepper' | 'isolation-lab' | 'deadlock-cycle' | 'temporal-timeline' | 'injection-lab' | 'schema-map' | 'round-trips'
  // Vulkan
  | 'gpu-frame' | 'version-bits' | 'enumerate-twice' | 'vk-loader' | 'device-picker' | 'queue-families' | 'vk-lifetime'
  | 'validation-catch' | 'present-modes' | 'image-view' | 'ndc-coords' | 'pipeline-state' | 'cmd-lifecycle' | 'image-layouts' | 'frames-in-flight'
  | 'vertex-layout' | 'memory-types' | 'staging-flow' | 'index-grid' | 'std140-layout' | 'per-draw-data' | 'allocator-sim'
  | 'mvp-pipeline' | 'depth-precision' | 'texture-sampler' | 'obj-parser' | 'mip-chain' | 'msaa-coverage' | 'orbit-camera'
  | 'engine-layers' | 'deletion-timeline' | 'draw-sort' | 'bindless-table' | 'spirv-words' | 'render-graph' | 'parallel-recording';

export type Block =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'code'; code: string; title?: string; output?: string; /** Overrides the track's language (a C# sample in the SQL track). */ lang?: 'cs' | 'sql' }
  | { type: 'note'; kind: 'tip' | 'warn' | 'info'; text: string }
  | { type: 'table'; head: string[]; rows: string[][] }
  | { type: 'widget'; name: WidgetName }
  | { type: 'quiz'; question: string; options: string[]; answer: number; explain: string }
  | { type: 'exercise'; task: string; hint?: string; solution: string; output?: string; lang?: 'cs' | 'sql' };

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
