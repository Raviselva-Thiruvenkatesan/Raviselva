import { Component, signal } from '@angular/core';

type Layout = 'Undefined' | 'ColorAttachmentOptimal' | 'TransferDstOptimal' | 'ShaderReadOnlyOptimal' | 'PresentSrcKhr';
interface Step { use: string; needs: Layout; why: string }
const STEPS: Step[] = [
  { use: 'Acquire the swapchain image', needs: 'Undefined', why: 'A freshly acquired image is treated as Undefined: its old contents are not needed, because the frame clears it.' },
  { use: 'Draw the triangle into it', needs: 'ColorAttachmentOptimal', why: 'Rendering writes colour through the attachment hardware, which wants ColorAttachmentOptimal.' },
  { use: 'Hand it to the screen', needs: 'PresentSrcKhr', why: 'QueuePresent requires PresentSrcKhr, the arrangement the display engine reads.' }
];
const CHOICES: Layout[] = ['ColorAttachmentOptimal', 'TransferDstOptimal', 'ShaderReadOnlyOptimal', 'PresentSrcKhr'];

/** Choose the layout for each use of a swapchain image in one frame. */
@Component({
  selector: 'w-image-layouts',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>One frame’s layouts</h3></div>
      <ol class="steps">
        @for (s of steps; track s.use; let i = $index) {
          <li [class.done]="i < at()" [class.now]="i === at()">
            <span class="use">{{ s.use }}</span>
            <span class="mono lay">{{ i < at() || i === 0 ? s.needs : '?' }}</span>
          </li>
        }
      </ol>
      @if (at() < steps.length) {
        <p class="w-hint">Barrier before “{{ steps[at()].use }}”: change the layout from <b class="mono">{{ steps[at() - 1].needs }}</b> to …</p>
        <div class="w-controls" role="group" aria-label="New layout">
          @for (c of choices; track c) { <button type="button" class="w-btn small mono" (click)="choose(c)">{{ c }}</button> }
        </div>
      } @else {
        <div class="code mono">
          <div>Barrier: Undefined → ColorAttachmentOptimal</div>
          <div class="ind">wait: ColorAttachmentOutput · then: ColorAttachmentOutput, ColorAttachmentWrite</div>
          <div>BeginRendering … Draw … EndRendering</div>
          <div>Barrier: ColorAttachmentOptimal → PresentSrcKhr</div>
          <div class="ind">wait: ColorAttachmentOutput, ColorAttachmentWrite · then: nothing (the present waits on a semaphore)</div>
        </div>
        <button type="button" class="w-btn" (click)="restart()"><i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i> Start again</button>
      }
      <div class="w-msg" [class.err]="bad()" [class.ok]="!bad() && at() > 1" [class.info]="!bad() && at() <= 1" aria-live="polite"><span>{{ msg() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.74rem; padding: 3px 8px; }
    .steps { list-style: none; padding: 0; margin: 0 0 0.6rem; display: flex; flex-direction: column; gap: 5px; }
    .steps li { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; padding: 6px 10px; border-radius: 10px; border: 1.5px solid var(--border-color); font-size: 0.84rem; }
    .steps li.done { border-color: #10b981; }
    .steps li.now { border-color: #8b5cf6; background: rgba(139, 92, 246, 0.1); }
    .use { font-weight: 700; }
    .lay { font-size: 0.78rem; color: var(--text-muted); }
    .code { background: #0f172a; color: #e2e8f0; border-radius: 10px; padding: 8px 12px; font-size: 0.74rem; margin: 0.4rem 0; }
    .code .ind { color: #94a3b8; padding-left: 1rem; }
  `]
})
export class ImageLayoutsWidget {
  readonly steps = STEPS;
  readonly choices = CHOICES;
  at = signal(1);
  bad = signal(false);
  msg = signal(STEPS[0].why + ' Now choose the layout for drawing.');

  choose(c: Layout) {
    const step = STEPS[this.at()];
    if (c === step.needs) {
      this.bad.set(false);
      this.msg.set(step.why);
      this.at.update(i => i + 1);
      return;
    }
    this.bad.set(true);
    const hints: Partial<Record<Layout, string>> = {
      TransferDstOptimal: 'TransferDstOptimal is for copy and clear commands (as in lesson 7’s CmdClearColorImage), not for rendering.',
      ShaderReadOnlyOptimal: 'ShaderReadOnlyOptimal is for images a shader samples, such as textures. Nothing samples this image.',
      PresentSrcKhr: 'PresentSrcKhr is only for handing the image to the screen. Drawing into it in this layout is a validation error.',
      ColorAttachmentOptimal: 'The image is already in ColorAttachmentOptimal. Presenting needs PresentSrcKhr.'
    };
    this.msg.set('Not valid here. ' + (hints[c] ?? ''));
  }
  restart() { this.at.set(1); this.bad.set(false); this.msg.set(STEPS[0].why + ' Now choose the layout for drawing.'); }
}
