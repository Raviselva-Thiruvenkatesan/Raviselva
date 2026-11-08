import { Component, input } from '@angular/core';
import { Block } from '../learn.types';
import { RichTextComponent } from './rich-text.component';
import { CodeViewComponent } from './code-view.component';
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
    VirtualDispatchWidget, AbstractShapesWidget, InterfacePlugWidget, ValueRefWidget, EnumFlagsWidget
  ],
  template: `
    @for (b of blocks(); track $index) {
      @switch (b.type) {
        @case ('h2') { <h2 [id]="anchor(b.text)">{{ b.text }}</h2> }
        @case ('p') { <p><app-rt [text]="b.text" /></p> }
        @case ('ul') { <ul>@for (i of b.items; track $index) { <li><app-rt [text]="i" /></li> }</ul> }
        @case ('ol') { <ol>@for (i of b.items; track $index) { <li><app-rt [text]="i" /></li> }</ol> }
        @case ('code') { <app-code [code]="b.code" [title]="b.title ?? 'Program.cs'" [output]="b.output ?? ''" /> }
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
            <details><summary>Show the solution</summary><app-code [code]="b.solution" title="Solution.cs" [output]="b.output ?? ''" /></details>
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

  anchor(text: string) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
}
