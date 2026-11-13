import { Component, signal } from '@angular/core';

type State = 'Initial' | 'Recording' | 'Executable' | 'Pending';
interface Action { id: string; label: string }
const ACTIONS: Action[] = [
  { id: 'begin', label: 'BeginCommandBuffer' },
  { id: 'cmd', label: 'CmdDraw' },
  { id: 'end', label: 'EndCommandBuffer' },
  { id: 'submit', label: 'QueueSubmit2' },
  { id: 'finish', label: 'GPU finishes (fence signalled)' },
  { id: 'reset', label: 'ResetCommandBuffer' }
];
const STATES: State[] = ['Initial', 'Recording', 'Executable', 'Pending'];

/** Step a command buffer through its states; invalid calls are flagged as the validation layer would. */
@Component({
  selector: 'w-cmd-lifecycle',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>A command buffer’s life</h3></div>
      <div class="states" role="list">
        @for (s of states; track s) {
          <div class="st" role="listitem" [class.on]="state() === s" [attr.aria-current]="state() === s">{{ s }}</div>
        }
      </div>
      <div class="w-controls" role="group" aria-label="Calls">
        @for (a of actions; track a.id) {
          <button type="button" class="w-btn small" (click)="act(a)">{{ a.label }}</button>
        }
        <button type="button" class="w-btn small" (click)="restart()"><i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i> Start again</button>
      </div>
      <div class="log mono">
        @for (l of log(); track $index) { <div [class.bad]="l.bad">{{ l.text }}</div> }
      </div>
      <div class="w-msg" [class.err]="lastBad()" [class.info]="!lastBad()" aria-live="polite"><span>{{ msg() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.76rem; padding: 3px 8px; }
    .states { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 0.6rem; }
    .st { flex: 1 1 6rem; text-align: center; padding: 8px 4px; border-radius: 10px; border: 1.5px solid var(--border-color); font-weight: 700; font-size: 0.82rem; }
    .st.on { border-color: #8b5cf6; background: rgba(139, 92, 246, 0.15); color: #7c3aed; }
    .log { background: #0f172a; color: #e2e8f0; border-radius: 10px; padding: 8px 12px; font-size: 0.75rem; min-height: 3.2rem; max-height: 8rem; overflow-y: auto; margin: 0.5rem 0; }
    .log .bad { color: #fca5a5; }
  `]
})
export class CmdLifecycleWidget {
  readonly states = STATES;
  readonly actions = ACTIONS;
  state = signal<State>('Initial');
  commands = signal(0);
  log = signal<{ text: string; bad: boolean }[]>([]);
  msg = signal('Allocated from the pool: the buffer starts in the Initial state. Record a frame and submit it.');
  lastBad = signal(false);

  act(a: Action) {
    const s = this.state();
    let next: State | null = null, err = '', note = '';
    switch (a.id) {
      case 'begin':
        if (s === 'Pending') err = 'The GPU is still executing this buffer. Wait for its fence first; re-recording now is the bug the frames-in-flight lesson prevents.';
        else if (s === 'Recording') err = 'Already recording. Call EndCommandBuffer first.';
        else { next = 'Recording'; this.commands.set(0); note = s === 'Executable' ? 'Begin on an executable buffer resets it implicitly (allowed because the pool has the ResetCommandBuffer flag).' : 'Recording: Cmd* calls now add commands.'; }
        break;
      case 'cmd':
        if (s !== 'Recording') err = 'Cmd* functions only work while recording.';
        else { this.commands.update(n => n + 1); note = `Recorded (${this.commands()} command${this.commands() === 1 ? '' : 's'} so far). Nothing has run on the GPU yet.`; }
        break;
      case 'end':
        if (s !== 'Recording') err = 'EndCommandBuffer needs a buffer in the Recording state.';
        else { next = 'Executable'; note = 'Executable: ready to submit, as often as you like.'; }
        break;
      case 'submit':
        if (s !== 'Executable') err = s === 'Pending' ? 'Submitted already and still running. With OneTimeSubmit it may only be submitted once anyway.' : 'Only an executable buffer can be submitted. Finish recording first.';
        else { next = 'Pending'; note = 'Pending: the GPU owns it now. Do not touch it until the fence says it is done.'; }
        break;
      case 'finish':
        if (s !== 'Pending') err = 'Nothing is running: the buffer has not been submitted.';
        else { next = 'Executable'; note = 'Back to Executable (or Invalid, if it was recorded with OneTimeSubmit). Safe to reset or re-record.'; }
        break;
      case 'reset':
        if (s === 'Pending') err = 'Resetting a pending buffer is invalid: the GPU is still reading it.';
        else { next = 'Initial'; note = 'Reset: empty again, back to Initial.'; }
        break;
    }
    if (next) this.state.set(next);
    this.lastBad.set(!!err);
    this.msg.set(err ? 'Validation error: ' + err : note);
    this.log.update(l => [...l.slice(-7), { text: `${a.label}${err ? '  ✗ invalid' : ''}  → ${this.state()}`, bad: !!err }]);
  }
  restart() { this.state.set('Initial'); this.commands.set(0); this.log.set([]); this.lastBad.set(false); this.msg.set('Allocated from the pool: the buffer starts in the Initial state. Record a frame and submit it.'); }
}
