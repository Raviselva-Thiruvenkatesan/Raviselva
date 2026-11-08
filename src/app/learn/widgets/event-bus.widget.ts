import { Component, DestroyRef, inject, signal } from '@angular/core';

interface Sub { id: string; label: string; icon: string; reaction: string }

const SUBS: Sub[] = [
  { id: 'Viewport', label: 'Viewport', icon: 'bi-box', reaction: 'refreshes the 3D view' },
  { id: 'StatusBar', label: 'StatusBar', icon: 'bi-info-square', reaction: 'shows "Saved at 10:42"' },
  { id: 'AutoBackup', label: 'AutoBackup', icon: 'bi-cloud-arrow-up', reaction: 'copies the file to the backup folder' }
];

/** A publisher raises an event; only the subscribed objects react, and the publisher doesn't know who they are. */
@Component({
  selector: 'w-event-bus',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Publisher and subscribers</h3></div>
      <p class="w-hint">Subscribe some objects to <span class="mono">model.Saved</span>, then call <span class="mono">Save()</span>. The Model never knows who is listening.</p>

      <div class="stage">
        <div class="pub">
          <i class="bi bi-file-earmark-binary" aria-hidden="true"></i>
          <strong class="mono">Model</strong>
          <small class="mono">public event EventHandler&lt;SavedEventArgs&gt;? Saved;</small>
          <button type="button" class="w-btn primary mt-2 mono" (click)="save()">model.Save()</button>
        </div>
        <div class="subs">
          @for (s of subs; track s.id) {
            <div class="sub" [class.on]="on().includes(s.id)" [class.flash]="flash().includes(s.id)">
              <div class="d-flex align-items-center gap-2">
                <i class="bi {{ s.icon }}" aria-hidden="true"></i><strong class="mono">{{ s.label }}</strong>
                <button type="button" class="w-btn mono ms-auto" (click)="toggle(s.id)" [attr.aria-pressed]="on().includes(s.id)">{{ on().includes(s.id) ? '-=' : '+=' }}</button>
              </div>
              <small class="mono">model.Saved {{ on().includes(s.id) ? '+=' : '−' }} On{{ s.id }}Saved</small>
              @if (flash().includes(s.id)) { <small class="react">→ {{ s.reaction }}</small> }
            </div>
          }
        </div>
      </div>

      <div class="w-controls mt-3 mb-0">
        <button type="button" class="w-btn mono" (click)="hack()">model.Saved = null;  <span class="c">(from outside)</span></button>
        <button type="button" class="w-btn mono" (click)="hack2()">model.Saved?.Invoke(…)  <span class="c">(from outside)</span></button>
      </div>
      <div class="w-msg" [class.err]="err()" [class.info]="!err()" aria-live="polite">
        <i class="bi" [class.bi-x-octagon]="err()" [class.bi-broadcast]="!err()" aria-hidden="true"></i><span>{{ msg() }}</span>
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .stage { display: grid; gap: 12px; grid-template-columns: minmax(0, 1fr); align-items: start; }
    @media (min-width: 680px) { .stage { grid-template-columns: 220px minmax(0, 1fr); } }
    .pub { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 4px; padding: 12px; border-radius: 14px; border: 2px solid var(--purple); background: rgba(139, 92, 246, 0.07); }
    .pub i { font-size: 1.8rem; color: var(--purple); }
    .pub small { font-size: 0.68rem; color: var(--text-muted); word-break: break-word; }
    .subs { display: grid; gap: 8px; }
    .sub { padding: 8px 10px; border-radius: 12px; border: 1.5px dashed var(--border-color); opacity: 0.6; transition: all 0.25s; display: grid; gap: 2px; }
    .sub.on { opacity: 1; border-style: solid; border-color: rgba(14, 165, 233, 0.6); }
    .sub.flash { background: rgba(16, 185, 129, 0.14); border-color: #10b981; }
    .sub small { font-size: 0.74rem; color: var(--text-muted); }
    .sub .react { color: #059669; font-weight: 600; }
    .sub .w-btn { padding: 2px 10px; }
    .c { color: var(--text-muted); font-size: 0.75rem; }
  `]
})
export class EventBusWidget {
  subs = SUBS;
  on = signal<string[]>(['Viewport', 'StatusBar']);
  flash = signal<string[]>([]);
  err = signal(false);
  msg = signal('Two objects are subscribed. Press model.Save().');
  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor() {
    inject(DestroyRef).onDestroy(() => this.timers.forEach(clearTimeout));
  }

  toggle(id: string) {
    this.flash.set([]);
    this.err.set(false);
    const has = this.on().includes(id);
    this.on.update(l => (has ? l.filter(x => x !== id) : [...l, id]));
    this.msg.set(has ? `${id} unsubscribed with -=. It will no longer be notified (and can be garbage collected).` : `${id} subscribed with +=.`);
  }

  save() {
    this.timers.forEach(clearTimeout);
    this.flash.set([]);
    this.err.set(false);
    const list = this.on();
    if (!list.length) {
      this.msg.set('Saved, but nobody is subscribed: Saved is null, so Saved?.Invoke(this, e) does nothing.');
      return;
    }
    list.forEach((id, i) => this.timers.push(setTimeout(() => this.flash.update(f => [...f, id]), 300 * (i + 1))));
    this.msg.set(`Save() wrote the file, then raised Saved?.Invoke(this, new SavedEventArgs(path)). ${list.length} handler(s) ran, in subscription order.`);
  }

  hack() {
    this.err.set(true);
    this.msg.set('error CS0070: The event \'Model.Saved\' can only appear on the left hand side of += or -= (except when used from within the type \'Model\'). Outside code can subscribe and unsubscribe, but can’t wipe other subscribers.');
  }

  hack2() {
    this.err.set(true);
    this.msg.set('error CS0070 again: only the Model itself may raise its event. That is the difference between an event and a plain public delegate field.');
  }
}
