import { Component, input } from '@angular/core';
import { Block } from '../learn.types';
import { RichTextComponent } from './rich-text.component';
import { CodeViewComponent } from './code-view.component';
import { CodeLang } from './highlight';
import { QuizComponent } from './quiz.component';
import { PipelineWidget } from '../widgets/pipeline.widget';
import { CodeAnatomyWidget } from '../widgets/code-anatomy.widget';
import { VariableBoxesWidget } from '../widgets/variable-boxes.widget';
import { ConversionLabWidget } from '../widgets/conversion-lab.widget';
import { OperatorLabWidget } from '../widgets/operator-lab.widget';
import { StringLabWidget } from '../widgets/string-lab.widget';
import { IfFlowWidget } from '../widgets/if-flow.widget';
import { SwitchMatchWidget } from '../widgets/switch-match.widget';
import { LoopStepperWidget } from '../widgets/loop-stepper.widget';
import { ArrayVizWidget } from '../widgets/array-viz.widget';
import { CallStackWidget } from '../widgets/call-stack.widget';
import { LoopControlWidget } from '../widgets/loop-control.widget';
import { Grid2dWidget } from '../widgets/grid-2d.widget';
import { ParamPassingWidget } from '../widgets/param-passing.widget';
import { RecursionWidget } from '../widgets/recursion.widget';
import { DebuggerWidget } from '../widgets/debugger.widget';
import { ClassObjectsWidget } from '../widgets/class-objects.widget';
import { ConstructorFlowWidget } from '../widgets/constructor-flow.widget';
import { PropertyGuardWidget } from '../widgets/property-guard.widget';
import { AccessMatrixWidget } from '../widgets/access-matrix.widget';
import { StaticCounterWidget } from '../widgets/static-counter.widget';
import { InheritanceTreeWidget } from '../widgets/inheritance-tree.widget';
import { VirtualDispatchWidget } from '../widgets/virtual-dispatch.widget';
import { AbstractShapesWidget } from '../widgets/abstract-shapes.widget';
import { InterfacePlugWidget } from '../widgets/interface-plug.widget';
import { ValueRefWidget } from '../widgets/value-ref.widget';
import { EnumFlagsWidget } from '../widgets/enum-flags.widget';
import { FormatLabWidget } from '../widgets/format-lab.widget';
import { DateLabWidget } from '../widgets/date-lab.widget';
import { ExceptionFlowWidget } from '../widgets/exception-flow.widget';
import { ListDictWidget } from '../widgets/list-dict.widget';
import { StackQueueSetWidget } from '../widgets/stack-queue-set.widget';
import { GenericBoxWidget } from '../widgets/generic-box.widget';
import { NullSafetyWidget } from '../widgets/null-safety.widget';
import { FileSimWidget } from '../widgets/file-sim.widget';
import { JsonLabWidget } from '../widgets/json-lab.widget';
import { DelegatePipeWidget } from '../widgets/delegate-pipe.widget';
import { LambdaBuilderWidget } from '../widgets/lambda-builder.widget';
import { EventBusWidget } from '../widgets/event-bus.widget';
import { ExtensionChainWidget } from '../widgets/extension-chain.widget';
import { LinqPipelineWidget } from '../widgets/linq-pipeline.widget';
import { LinqGroupWidget } from '../widgets/linq-group.widget';
import { PatternMatchWidget } from '../widgets/pattern-match.widget';
import { TupleLabWidget } from '../widgets/tuple-lab.widget';
import { GcSimWidget } from '../widgets/gc-sim.widget';
import { UsingScopeWidget } from '../widgets/using-scope.widget';
import { YieldStepperWidget } from '../widgets/yield-stepper.widget';
import { AsyncTimelineWidget } from '../widgets/async-timeline.widget';
import { ParallelCoresWidget } from '../widgets/parallel-cores.widget';
import { RaceConditionWidget } from '../widgets/race-condition.widget';
import { ReflectionInspectorWidget } from '../widgets/reflection-inspector.widget';
import { SpanSliceWidget } from '../widgets/span-slice.widget';
import { SolidImpactWidget } from '../widgets/solid-impact.widget';
import { PatternLabWidget } from '../widgets/pattern-lab.widget';
import { DiLifetimesWidget } from '../widgets/di-lifetimes.widget';
import { TestRunnerWidget } from '../widgets/test-runner.widget';
import { BenchmarkLabWidget } from '../widgets/benchmark-lab.widget';
import { PointerMemoryWidget } from '../widgets/pointer-memory.widget';
import { SourceGenWidget } from '../widgets/source-gen.widget';
import { ArchitectureLayersWidget } from '../widgets/architecture-layers.widget';
import { LookupRaceWidget } from '../widgets/lookup-race.widget';
import { GrowthChartWidget } from '../widgets/growth-chart.widget';
import { StepCounterWidget } from '../widgets/step-counter.widget';
import { SpaceMeterWidget } from '../widgets/space-meter.widget';
import { CallTreeWidget } from '../widgets/call-tree.widget';
import { ArrayMemoryWidget } from '../widgets/array-memory.widget';
import { ListGrowthWidget } from '../widgets/list-growth.widget';
import { LinkedListWidget } from '../widgets/linked-list.widget';
import { DllRewireWidget } from '../widgets/dll-rewire.widget';
import { BracketCheckerWidget } from '../widgets/bracket-checker.widget';
import { RingBufferWidget } from '../widgets/ring-buffer.widget';
import { BinarySearchWidget } from '../widgets/binary-search.widget';
import { BoundsFinderWidget } from '../widgets/bounds-finder.widget';
import { SortStepperWidget } from '../widgets/sort-stepper.widget';
import { MergeVizWidget } from '../widgets/merge-viz.widget';
import { QuickVizWidget } from '../widgets/quick-viz.widget';
import { CountingSortWidget } from '../widgets/counting-sort.widget';
import { SortKeysWidget } from '../widgets/sort-keys.widget';
import { HashBucketsWidget } from '../widgets/hash-buckets.widget';
import { PairFinderWidget } from '../widgets/pair-finder.widget';
import { TwoPointersWidget } from '../widgets/two-pointers.widget';
import { SlidingWindowWidget } from '../widgets/sliding-window.widget';
import { PrefixSumsWidget } from '../widgets/prefix-sums.widget';
import { BitLabWidget } from '../widgets/bit-lab.widget';
import { TreeAnatomyWidget } from '../widgets/tree-anatomy.widget';
import { TraversalStepperWidget } from '../widgets/traversal-stepper.widget';
import { BstLabWidget } from '../widgets/bst-lab.widget';
import { AvlVizWidget } from '../widgets/avl-viz.widget';
import { HeapVizWidget } from '../widgets/heap-viz.widget';
import { TrieVizWidget } from '../widgets/trie-viz.widget';
import { GraphStoreWidget } from '../widgets/graph-store.widget';
import { BfsGridWidget } from '../widgets/bfs-grid.widget';
import { DfsStepperWidget } from '../widgets/dfs-stepper.widget';
import { TopoSortWidget } from '../widgets/topo-sort.widget';
import { DijkstraVizWidget } from '../widgets/dijkstra-viz.widget';
import { BellmanFloydWidget } from '../widgets/bellman-floyd.widget';
import { MstVizWidget } from '../widgets/mst-viz.widget';
import { UnionFindWidget } from '../widgets/union-find.widget';
import { IntervalSchedulerWidget } from '../widgets/interval-scheduler.widget';
import { RecurrenceTreeWidget } from '../widgets/recurrence-tree.widget';
import { NQueensWidget } from '../widgets/n-queens.widget';
import { DpTableWidget } from '../widgets/dp-table.widget';
import { GridPathsWidget } from '../widgets/grid-paths.widget';
import { LcsTableWidget } from '../widgets/lcs-table.widget';
import { SegmentTreeWidget } from '../widgets/segment-tree.widget';
import { StringMatchWidget } from '../widgets/string-match.widget';
import { QuadtreeWidget } from '../widgets/quadtree.widget';
import { ConvexHullWidget } from '../widgets/convex-hull.widget';
import { TspExplorerWidget } from '../widgets/tsp-explorer.widget';
import { PatternPickerWidget } from '../widgets/pattern-picker.widget';
import { WallAnatomyWidget } from '../widgets/wall-anatomy.widget';
import { Axes3dWidget } from '../widgets/axes-3d.widget';
import { ToleranceLabWidget } from '../widgets/tolerance-lab.widget';
import { AngleDialWidget } from '../widgets/angle-dial.widget';
import { RoofPitchWidget } from '../widgets/roof-pitch.widget';
import { PointVectorWidget } from '../widgets/point-vector.widget';
import { VectorAddWidget } from '../widgets/vector-add.widget';
import { UnitVectorWidget } from '../widgets/unit-vector.widget';
import { DotProductWidget } from '../widgets/dot-product.widget';
import { CrossProductWidget } from '../widgets/cross-product.widget';
import { Vec3CalcWidget } from '../widgets/vec3-calc.widget';
import { ParamLineWidget } from '../widgets/param-line.widget';
import { ClosestPointWidget } from '../widgets/closest-point.widget';
import { LineIntersectWidget } from '../widgets/line-intersect.widget';
import { ThreePointArcWidget } from '../widgets/three-point-arc.widget';
import { PolylineLabWidget } from '../widgets/polyline-lab.widget';
import { BezierWidget } from '../widgets/bezier.widget';
import { PlaneEqWidget } from '../widgets/plane-eq.widget';
import { PointPlaneWidget } from '../widgets/point-plane.widget';
import { LinePlaneWidget } from '../widgets/line-plane.widget';
import { ShoelaceWidget } from '../widgets/shoelace.widget';
import { PipTriangulateWidget } from '../widgets/pip-triangulate.widget';
import { PolyBooleanWidget } from '../widgets/poly-boolean.widget';
import { Matrix2dWidget } from '../widgets/matrix-2d.widget';
import { RotationWidget } from '../widgets/rotation.widget';
import { HomogeneousWidget } from '../widgets/homogeneous.widget';
import { ComposeWidget } from '../widgets/compose.widget';
import { LocalWorldWidget } from '../widgets/local-world.widget';
import { MirrorWidget } from '../widgets/mirror.widget';
import { GimbalWidget } from '../widgets/gimbal.widget';
import { QuaternionWidget } from '../widgets/quaternion.widget';
import { SlerpWidget } from '../widgets/slerp.widget';
import { BboxWidget } from '../widgets/bbox.widget';
import { MeshWidget } from '../widgets/mesh.widget';
import { RayTriangleWidget } from '../widgets/ray-triangle.widget';
import { SatWidget } from '../widgets/sat.widget';
import { VolumeWidget } from '../widgets/volume.widget';
import { SectionWidget } from '../widgets/section.widget';
import { RobustWidget } from '../widgets/robust.widget';
import { GeorefWidget } from '../widgets/georef.widget';
import { CameraWidget } from '../widgets/camera.widget';
import { NurbsWidget } from '../widgets/nurbs.widget';
import { SpatialWidget } from '../widgets/spatial.widget';
import { RoomEngineWidget } from '../widgets/room-engine.widget';
import { DbAnatomyWidget } from '../widgets/db-anatomy.widget';
import { TypeFitWidget } from '../widgets/type-fit.widget';
import { SelectBuilderWidget } from '../widgets/select-builder.widget';
import { WhereLabWidget } from '../widgets/where-lab.widget';
import { NullLogicWidget } from '../widgets/null-logic.widget';
import { SortPageWidget } from '../widgets/sort-page.widget';
import { TableDesignerWidget } from '../widgets/table-designer.widget';
import { InsertLabWidget } from '../widgets/insert-lab.widget';
import { UpdateDeleteWidget } from '../widgets/update-delete.widget';
import { ConstraintGuardWidget } from '../widgets/constraint-guard.widget';
import { IdentityGapsWidget } from '../widgets/identity-gaps.widget';
import { AlterImpactWidget } from '../widgets/alter-impact.widget';
import { SqlStringWidget } from '../widgets/sql-string.widget';
import { RoundLabWidget } from '../widgets/round-lab.widget';
import { DatediffLineWidget } from '../widgets/datediff-line.widget';
import { CaseFlowWidget } from '../widgets/case-flow.widget';
import { ConvertMatrixWidget } from '../widgets/convert-matrix.widget';
import { KeyFollowWidget } from '../widgets/key-follow.widget';
import { JoinLabWidget } from '../widgets/join-lab.widget';
import { PairMatrixWidget } from '../widgets/pair-matrix.widget';
import { SetVennWidget } from '../widgets/set-venn.widget';
import { NormalFormsWidget } from '../widgets/normal-forms.widget';
import { AggNullWidget } from '../widgets/agg-null.widget';
import { GroupBucketsWidget } from '../widgets/group-buckets.widget';
import { CorrelatedWidget } from '../widgets/correlated.widget';
import { ExistsProbeWidget } from '../widgets/exists-probe.widget';
import { CteChainWidget } from '../widgets/cte-chain.widget';
import { BomExplodeWidget } from '../widgets/bom-explode.widget';
import { RankTiesWidget } from '../widgets/rank-ties.widget';
import { WindowFrameWidget } from '../widgets/window-frame.widget';
import { PivotTurnWidget } from '../widgets/pivot-turn.widget';
import { ApplyRunnerWidget } from '../widgets/apply-runner.widget';
import { JsonPathWidget } from '../widgets/json-path.widget';
import { MergeSyncWidget } from '../widgets/merge-sync.widget';
import { ViewCheckWidget } from '../widgets/view-check.widget';
import { BatchSplitWidget } from '../widgets/batch-split.widget';
import { ProcCallWidget } from '../widgets/proc-call.widget';
import { UdfKindsWidget } from '../widgets/udf-kinds.widget';
import { TryCatchFlowWidget } from '../widgets/try-catch-flow.widget';
import { TriggerAuditWidget } from '../widgets/trigger-audit.widget';
import { BtreePagesWidget } from '../widgets/btree-pages.widget';
import { PageSplitWidget } from '../widgets/page-split.widget';
import { LookupTippingWidget } from '../widgets/lookup-tipping.widget';
import { PlanReaderWidget } from '../widgets/plan-reader.widget';
import { SargCheckWidget } from '../widgets/sarg-check.widget';
import { ParamSniffWidget } from '../widgets/param-sniff.widget';
import { TxStepperWidget } from '../widgets/tx-stepper.widget';
import { IsolationLabWidget } from '../widgets/isolation-lab.widget';
import { DeadlockCycleWidget } from '../widgets/deadlock-cycle.widget';
import { TemporalTimelineWidget } from '../widgets/temporal-timeline.widget';
import { InjectionLabWidget } from '../widgets/injection-lab.widget';
import { SchemaMapWidget } from '../widgets/schema-map.widget';
import { RoundTripsWidget } from '../widgets/round-trips.widget';

/** Renders a lesson's content blocks, including interactive widgets, quizzes and exercises. */
@Component({
  selector: 'app-lesson-blocks',
  standalone: true,
  imports: [
    RichTextComponent, CodeViewComponent, QuizComponent,
    PipelineWidget, CodeAnatomyWidget, VariableBoxesWidget, ConversionLabWidget, OperatorLabWidget, StringLabWidget,
    IfFlowWidget, SwitchMatchWidget, LoopStepperWidget, ArrayVizWidget, CallStackWidget,
    LoopControlWidget, Grid2dWidget, ParamPassingWidget, RecursionWidget, DebuggerWidget,
    ClassObjectsWidget, ConstructorFlowWidget, PropertyGuardWidget, AccessMatrixWidget, StaticCounterWidget, InheritanceTreeWidget,
    VirtualDispatchWidget, AbstractShapesWidget, InterfacePlugWidget, ValueRefWidget, EnumFlagsWidget,
    FormatLabWidget, DateLabWidget, ExceptionFlowWidget, ListDictWidget, StackQueueSetWidget,
    GenericBoxWidget, NullSafetyWidget, FileSimWidget, JsonLabWidget, DelegatePipeWidget,
    LambdaBuilderWidget, EventBusWidget, ExtensionChainWidget, LinqPipelineWidget, LinqGroupWidget,
    PatternMatchWidget, TupleLabWidget, GcSimWidget, UsingScopeWidget, YieldStepperWidget,
    AsyncTimelineWidget, ParallelCoresWidget, RaceConditionWidget, ReflectionInspectorWidget, SpanSliceWidget,
    SolidImpactWidget, PatternLabWidget, DiLifetimesWidget, TestRunnerWidget, BenchmarkLabWidget,
    PointerMemoryWidget, SourceGenWidget, ArchitectureLayersWidget,
    LookupRaceWidget, GrowthChartWidget, StepCounterWidget, SpaceMeterWidget, CallTreeWidget,
    ArrayMemoryWidget, ListGrowthWidget, LinkedListWidget, DllRewireWidget, BracketCheckerWidget, RingBufferWidget,
    BinarySearchWidget, BoundsFinderWidget, SortStepperWidget, MergeVizWidget, QuickVizWidget, CountingSortWidget, SortKeysWidget,
    HashBucketsWidget, PairFinderWidget, TwoPointersWidget, SlidingWindowWidget, PrefixSumsWidget, BitLabWidget,
    TreeAnatomyWidget, TraversalStepperWidget, BstLabWidget, AvlVizWidget, HeapVizWidget, TrieVizWidget,
    GraphStoreWidget, BfsGridWidget, DfsStepperWidget, TopoSortWidget, DijkstraVizWidget, BellmanFloydWidget, MstVizWidget, UnionFindWidget,
    IntervalSchedulerWidget, RecurrenceTreeWidget, NQueensWidget, DpTableWidget, GridPathsWidget, LcsTableWidget,
    SegmentTreeWidget, StringMatchWidget, QuadtreeWidget, ConvexHullWidget, TspExplorerWidget, PatternPickerWidget,
    WallAnatomyWidget, Axes3dWidget, ToleranceLabWidget, AngleDialWidget, RoofPitchWidget,
    PointVectorWidget, VectorAddWidget, UnitVectorWidget, DotProductWidget, CrossProductWidget, Vec3CalcWidget,
    ParamLineWidget, ClosestPointWidget, LineIntersectWidget, ThreePointArcWidget, PolylineLabWidget, BezierWidget,
    PlaneEqWidget, PointPlaneWidget, LinePlaneWidget, ShoelaceWidget, PipTriangulateWidget, PolyBooleanWidget,
    Matrix2dWidget, RotationWidget, HomogeneousWidget, ComposeWidget, LocalWorldWidget, MirrorWidget, GimbalWidget, QuaternionWidget, SlerpWidget,
    BboxWidget, MeshWidget, RayTriangleWidget, SatWidget, VolumeWidget, SectionWidget,
    RobustWidget, GeorefWidget, CameraWidget, NurbsWidget, SpatialWidget, RoomEngineWidget,
    DbAnatomyWidget, TypeFitWidget, SelectBuilderWidget, WhereLabWidget, NullLogicWidget, SortPageWidget,
    TableDesignerWidget, InsertLabWidget, UpdateDeleteWidget, ConstraintGuardWidget, IdentityGapsWidget, AlterImpactWidget,
    SqlStringWidget, RoundLabWidget, DatediffLineWidget, CaseFlowWidget, ConvertMatrixWidget,
    KeyFollowWidget, JoinLabWidget, PairMatrixWidget, SetVennWidget, NormalFormsWidget,
    AggNullWidget, GroupBucketsWidget, CorrelatedWidget, ExistsProbeWidget, CteChainWidget, BomExplodeWidget,
    RankTiesWidget, WindowFrameWidget, PivotTurnWidget, ApplyRunnerWidget, JsonPathWidget, MergeSyncWidget,
    ViewCheckWidget, BatchSplitWidget, ProcCallWidget, UdfKindsWidget, TryCatchFlowWidget, TriggerAuditWidget,
    BtreePagesWidget, PageSplitWidget, LookupTippingWidget, PlanReaderWidget, SargCheckWidget, ParamSniffWidget,
    TxStepperWidget, IsolationLabWidget, DeadlockCycleWidget, TemporalTimelineWidget, InjectionLabWidget, SchemaMapWidget, RoundTripsWidget
  ],
  template: `
    @for (b of blocks(); track $index) {
      @switch (b.type) {
        @case ('h2') { <h2 [id]="anchor(b.text)">{{ b.text }}</h2> }
        @case ('p') { <p><app-rt [text]="b.text" /></p> }
        @case ('ul') { <ul>@for (i of b.items; track $index) { <li><app-rt [text]="i" /></li> }</ul> }
        @case ('ol') { <ol>@for (i of b.items; track $index) { <li><app-rt [text]="i" /></li> }</ol> }
        @case ('code') { <app-code [code]="b.code" [title]="b.title ?? ((b.lang ?? lang()) === 'sql' ? 'Query.sql' : 'Program.cs')" [lang]="b.lang ?? lang()" [output]="b.output ?? ''" /> }
        @case ('note') {
          <aside class="callout {{ b.kind }}">
            <i class="bi" [class.bi-lightbulb]="b.kind === 'tip'" [class.bi-exclamation-triangle]="b.kind === 'warn'" [class.bi-info-circle]="b.kind === 'info'" aria-hidden="true"></i>
            <div><strong>{{ b.kind === 'tip' ? 'Tip' : b.kind === 'warn' ? 'Common mistake' : 'Good to know' }}</strong>
              <p><app-rt [text]="b.text" /></p></div>
          </aside>
        }
        @case ('table') {
          <div class="table-wrap">
            <table>
              <thead><tr>@for (h of b.head; track $index) { <th scope="col">{{ h }}</th> }</tr></thead>
              <tbody>@for (r of b.rows; track $index) { <tr>@for (c of r; track $index) { <td><app-rt [text]="c" /></td> }</tr> }</tbody>
            </table>
          </div>
        }
        @case ('quiz') { <app-quiz [question]="b.question" [options]="b.options" [answer]="b.answer" [explain]="b.explain" /> }
        @case ('exercise') {
          <section class="exercise" aria-label="Practice exercise">
            <div class="ex-head"><i class="bi bi-pencil-square" aria-hidden="true"></i> Practice</div>
            <p><app-rt [text]="b.task" /></p>
            @if (b.hint) {
              <details><summary>Show a hint</summary><p><app-rt [text]="b.hint" /></p></details>
            }
            <details><summary>Show the solution</summary><app-code [code]="b.solution" [title]="(b.lang ?? lang()) === 'sql' ? 'Solution.sql' : 'Solution.cs'" [lang]="b.lang ?? lang()" [output]="b.output ?? ''" /></details>
          </section>
        }
        @case ('widget') {
          @switch (b.name) {
            @case ('dotnet-pipeline') { <w-dotnet-pipeline /> }
            @case ('code-anatomy') { <w-code-anatomy /> }
            @case ('variable-boxes') { <w-variable-boxes /> }
            @case ('conversion-lab') { <w-conversion-lab /> }
            @case ('operator-lab') { <w-operator-lab /> }
            @case ('string-lab') { <w-string-lab /> }
            @case ('if-flow') { <w-if-flow /> }
            @case ('switch-match') { <w-switch-match /> }
            @case ('loop-stepper') { <w-loop-stepper /> }
            @case ('array-viz') { <w-array-viz /> }
            @case ('call-stack') { <w-call-stack /> }
            @case ('loop-control') { <w-loop-control /> }
            @case ('grid-2d') { <w-grid-2d /> }
            @case ('param-passing') { <w-param-passing /> }
            @case ('recursion') { <w-recursion /> }
            @case ('debugger') { <w-debugger /> }
            @case ('class-objects') { <w-class-objects /> }
            @case ('constructor-flow') { <w-constructor-flow /> }
            @case ('property-guard') { <w-property-guard /> }
            @case ('access-matrix') { <w-access-matrix /> }
            @case ('static-counter') { <w-static-counter /> }
            @case ('inheritance-tree') { <w-inheritance-tree /> }
            @case ('virtual-dispatch') { <w-virtual-dispatch /> }
            @case ('abstract-shapes') { <w-abstract-shapes /> }
            @case ('interface-plug') { <w-interface-plug /> }
            @case ('value-ref') { <w-value-ref /> }
            @case ('enum-flags') { <w-enum-flags /> }
            @case ('format-lab') { <w-format-lab /> }
            @case ('date-lab') { <w-date-lab /> }
            @case ('exception-flow') { <w-exception-flow /> }
            @case ('list-dict') { <w-list-dict /> }
            @case ('stack-queue-set') { <w-stack-queue-set /> }
            @case ('generic-box') { <w-generic-box /> }
            @case ('null-safety') { <w-null-safety /> }
            @case ('file-sim') { <w-file-sim /> }
            @case ('json-lab') { <w-json-lab /> }
            @case ('delegate-pipe') { <w-delegate-pipe /> }
            @case ('lambda-builder') { <w-lambda-builder /> }
            @case ('event-bus') { <w-event-bus /> }
            @case ('extension-chain') { <w-extension-chain /> }
            @case ('linq-pipeline') { <w-linq-pipeline /> }
            @case ('linq-group') { <w-linq-group /> }
            @case ('pattern-match') { <w-pattern-match /> }
            @case ('tuple-lab') { <w-tuple-lab /> }
            @case ('gc-sim') { <w-gc-sim /> }
            @case ('using-scope') { <w-using-scope /> }
            @case ('yield-stepper') { <w-yield-stepper /> }
            @case ('async-timeline') { <w-async-timeline /> }
            @case ('parallel-cores') { <w-parallel-cores /> }
            @case ('race-condition') { <w-race-condition /> }
            @case ('reflection-inspector') { <w-reflection-inspector /> }
            @case ('span-slice') { <w-span-slice /> }
            @case ('solid-impact') { <w-solid-impact /> }
            @case ('pattern-lab') { <w-pattern-lab /> }
            @case ('di-lifetimes') { <w-di-lifetimes /> }
            @case ('test-runner') { <w-test-runner /> }
            @case ('benchmark-lab') { <w-benchmark-lab /> }
            @case ('pointer-memory') { <w-pointer-memory /> }
            @case ('source-gen') { <w-source-gen /> }
            @case ('architecture-layers') { <w-architecture-layers /> }
            @case ('lookup-race') { <w-lookup-race /> }
            @case ('growth-chart') { <w-growth-chart /> }
            @case ('step-counter') { <w-step-counter /> }
            @case ('space-meter') { <w-space-meter /> }
            @case ('call-tree') { <w-call-tree /> }
            @case ('array-memory') { <w-array-memory /> }
            @case ('list-growth') { <w-list-growth /> }
            @case ('linked-list') { <w-linked-list /> }
            @case ('dll-rewire') { <w-dll-rewire /> }
            @case ('bracket-checker') { <w-bracket-checker /> }
            @case ('ring-buffer') { <w-ring-buffer /> }
            @case ('binary-search') { <w-binary-search /> }
            @case ('bounds-finder') { <w-bounds-finder /> }
            @case ('sort-stepper') { <w-sort-stepper /> }
            @case ('merge-viz') { <w-merge-viz /> }
            @case ('quick-viz') { <w-quick-viz /> }
            @case ('counting-sort') { <w-counting-sort /> }
            @case ('sort-keys') { <w-sort-keys /> }
            @case ('hash-buckets') { <w-hash-buckets /> }
            @case ('pair-finder') { <w-pair-finder /> }
            @case ('two-pointers') { <w-two-pointers /> }
            @case ('sliding-window') { <w-sliding-window /> }
            @case ('prefix-sums') { <w-prefix-sums /> }
            @case ('bit-lab') { <w-bit-lab /> }
            @case ('tree-anatomy') { <w-tree-anatomy /> }
            @case ('traversal-stepper') { <w-traversal-stepper /> }
            @case ('bst-lab') { <w-bst-lab /> }
            @case ('avl-viz') { <w-avl-viz /> }
            @case ('heap-viz') { <w-heap-viz /> }
            @case ('trie-viz') { <w-trie-viz /> }
            @case ('graph-store') { <w-graph-store /> }
            @case ('bfs-grid') { <w-bfs-grid /> }
            @case ('dfs-stepper') { <w-dfs-stepper /> }
            @case ('topo-sort') { <w-topo-sort /> }
            @case ('dijkstra-viz') { <w-dijkstra-viz /> }
            @case ('bellman-floyd') { <w-bellman-floyd /> }
            @case ('mst-viz') { <w-mst-viz /> }
            @case ('union-find') { <w-union-find /> }
            @case ('interval-scheduler') { <w-interval-scheduler /> }
            @case ('recurrence-tree') { <w-recurrence-tree /> }
            @case ('n-queens') { <w-n-queens /> }
            @case ('dp-table') { <w-dp-table /> }
            @case ('grid-paths') { <w-grid-paths /> }
            @case ('lcs-table') { <w-lcs-table /> }
            @case ('segment-tree') { <w-segment-tree /> }
            @case ('string-match') { <w-string-match /> }
            @case ('quadtree') { <w-quadtree /> }
            @case ('convex-hull') { <w-convex-hull /> }
            @case ('tsp-explorer') { <w-tsp-explorer /> }
            @case ('pattern-picker') { <w-pattern-picker /> }
            @case ('wall-anatomy') { <w-wall-anatomy /> }
            @case ('axes-3d') { <w-axes-3d /> }
            @case ('tolerance-lab') { <w-tolerance-lab /> }
            @case ('angle-dial') { <w-angle-dial /> }
            @case ('roof-pitch') { <w-roof-pitch /> }
            @case ('point-vector') { <w-point-vector /> }
            @case ('vector-add') { <w-vector-add /> }
            @case ('unit-vector') { <w-unit-vector /> }
            @case ('dot-product') { <w-dot-product /> }
            @case ('cross-product') { <w-cross-product /> }
            @case ('vec3-calc') { <w-vec3-calc /> }
            @case ('param-line') { <w-param-line /> }
            @case ('closest-point') { <w-closest-point /> }
            @case ('line-intersect') { <w-line-intersect /> }
            @case ('three-point-arc') { <w-three-point-arc /> }
            @case ('polyline-lab') { <w-polyline-lab /> }
            @case ('bezier') { <w-bezier /> }
            @case ('plane-eq') { <w-plane-eq /> }
            @case ('point-plane') { <w-point-plane /> }
            @case ('line-plane') { <w-line-plane /> }
            @case ('shoelace') { <w-shoelace /> }
            @case ('pip-triangulate') { <w-pip-triangulate /> }
            @case ('poly-boolean') { <w-poly-boolean /> }
            @case ('matrix-2d') { <w-matrix-2d /> }
            @case ('rotation') { <w-rotation /> }
            @case ('homogeneous') { <w-homogeneous /> }
            @case ('compose') { <w-compose /> }
            @case ('local-world') { <w-local-world /> }
            @case ('mirror') { <w-mirror /> }
            @case ('gimbal') { <w-gimbal /> }
            @case ('quaternion') { <w-quaternion /> }
            @case ('slerp') { <w-slerp /> }
            @case ('bbox') { <w-bbox /> }
            @case ('mesh') { <w-mesh /> }
            @case ('ray-triangle') { <w-ray-triangle /> }
            @case ('sat') { <w-sat /> }
            @case ('volume') { <w-volume /> }
            @case ('section') { <w-section /> }
            @case ('robust') { <w-robust /> }
            @case ('georef') { <w-georef /> }
            @case ('camera') { <w-camera /> }
            @case ('nurbs') { <w-nurbs /> }
            @case ('spatial') { <w-spatial /> }
            @case ('room-engine') { <w-room-engine /> }
            @case ('db-anatomy') { <w-db-anatomy /> }
            @case ('type-fit') { <w-type-fit /> }
            @case ('select-builder') { <w-select-builder /> }
            @case ('where-lab') { <w-where-lab /> }
            @case ('null-logic') { <w-null-logic /> }
            @case ('sort-page') { <w-sort-page /> }
            @case ('table-designer') { <w-table-designer /> }
            @case ('insert-lab') { <w-insert-lab /> }
            @case ('update-delete') { <w-update-delete /> }
            @case ('constraint-guard') { <w-constraint-guard /> }
            @case ('identity-gaps') { <w-identity-gaps /> }
            @case ('alter-impact') { <w-alter-impact /> }
            @case ('sql-string') { <w-sql-string /> }
            @case ('round-lab') { <w-round-lab /> }
            @case ('datediff-line') { <w-datediff-line /> }
            @case ('case-flow') { <w-case-flow /> }
            @case ('convert-matrix') { <w-convert-matrix /> }
            @case ('key-follow') { <w-key-follow /> }
            @case ('join-inner') { <w-join-lab /> }
            @case ('join-outer') { <w-join-lab [outer]="true" /> }
            @case ('pair-matrix') { <w-pair-matrix /> }
            @case ('set-venn') { <w-set-venn /> }
            @case ('normal-forms') { <w-normal-forms /> }
            @case ('agg-null') { <w-agg-null /> }
            @case ('group-buckets') { <w-group-buckets /> }
            @case ('correlated') { <w-correlated /> }
            @case ('exists-probe') { <w-exists-probe /> }
            @case ('cte-chain') { <w-cte-chain /> }
            @case ('bom-explode') { <w-bom-explode /> }
            @case ('rank-ties') { <w-rank-ties /> }
            @case ('window-frame') { <w-window-frame /> }
            @case ('pivot-turn') { <w-pivot-turn /> }
            @case ('apply-runner') { <w-apply-runner /> }
            @case ('json-path') { <w-json-path /> }
            @case ('merge-sync') { <w-merge-sync /> }
            @case ('view-check') { <w-view-check /> }
            @case ('batch-split') { <w-batch-split /> }
            @case ('proc-call') { <w-proc-call /> }
            @case ('udf-kinds') { <w-udf-kinds /> }
            @case ('try-catch-flow') { <w-try-catch-flow /> }
            @case ('trigger-audit') { <w-trigger-audit /> }
            @case ('btree-pages') { <w-btree-pages /> }
            @case ('page-split') { <w-page-split /> }
            @case ('lookup-tipping') { <w-lookup-tipping /> }
            @case ('plan-reader') { <w-plan-reader /> }
            @case ('sarg-check') { <w-sarg-check /> }
            @case ('param-sniff') { <w-param-sniff /> }
            @case ('tx-stepper') { <w-tx-stepper /> }
            @case ('isolation-lab') { <w-isolation-lab /> }
            @case ('deadlock-cycle') { <w-deadlock-cycle /> }
            @case ('temporal-timeline') { <w-temporal-timeline /> }
            @case ('injection-lab') { <w-injection-lab /> }
            @case ('schema-map') { <w-schema-map /> }
            @case ('round-trips') { <w-round-trips /> }
          }
        }
      }
    }
  `,
  styles: [`
    :host { display: block; font-size: 1.05rem; line-height: 1.8; }
    h2 { font-size: 1.4rem; font-weight: 700; margin: 2.25rem 0 0.75rem; scroll-margin-top: 90px; }
    p, ul, ol { margin-bottom: 1.1rem; }
    ul, ol { padding-left: 1.4rem; }
    ul { list-style: disc; }
    ol { list-style: decimal; }
    li { margin-bottom: 0.4rem; }
    .callout { display: flex; gap: 12px; padding: 0.9rem 1.1rem; margin: 1.5rem 0; border-radius: 12px; border-left: 4px solid var(--purple); background: rgba(139, 92, 246, 0.08); }
    .callout i { font-size: 1.2rem; color: var(--purple); }
    .callout.warn { border-left-color: #f59e0b; background: rgba(245, 158, 11, 0.09); }
    .callout.warn i { color: #f59e0b; }
    .callout.info { border-left-color: #0ea5e9; background: rgba(14, 165, 233, 0.08); }
    .callout.info i { color: #0ea5e9; }
    .callout strong { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .callout p { margin: 0.15rem 0 0; font-size: 0.98rem; }
    .table-wrap { overflow-x: auto; margin: 1.25rem 0; border-radius: 12px; border: 1px solid var(--border-color); }
    table { width: 100%; border-collapse: collapse; font-size: 0.93rem; line-height: 1.5; }
    th, td { padding: 0.55rem 0.85rem; text-align: left; border-bottom: 1px solid var(--border-color); vertical-align: top; }
    th { background: rgba(139, 92, 246, 0.08); font-weight: 700; white-space: nowrap; }
    tr:last-child td { border-bottom: 0; }
    .exercise { margin: 1.75rem 0; padding: 1rem 1.1rem; border-radius: 16px; border: 1.5px dashed rgba(16, 185, 129, 0.5); background: rgba(16, 185, 129, 0.05); }
    .ex-head { font-size: 0.78rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #059669; margin-bottom: 0.3rem; }
    details { margin-top: 0.5rem; }
    summary { cursor: pointer; font-weight: 600; color: var(--purple); font-size: 0.95rem; }
    details p { margin: 0.5rem 0 0; }
  `]
})
export class LessonBlocksComponent {
  blocks = input.required<Block[]>();
  /** Language of the track's code samples: sets highlighting and default file names. */
  lang = input<CodeLang>('cs');

  anchor(text: string) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
}
