import { Component, computed, signal } from '@angular/core';

interface Family { flags: string[]; count: number }
type Profile = 'intel' | 'discrete';
type Job = 'draw' | 'compute' | 'upload';
const PROFILES: Record<Profile, { label: string; families: Family[] }> = {
  intel: { label: 'This PC: Intel Iris Xe (measured)', families: [
    { flags: ['Graphics', 'Compute', 'Transfer', 'SparseBinding'], count: 1 },
    { flags: ['VideoDecode'], count: 2 }
  ] },
  discrete: { label: 'A typical discrete GPU (example)', families: [
    { flags: ['Graphics', 'Compute', 'Transfer', 'SparseBinding'], count: 16 },
    { flags: ['Transfer', 'SparseBinding'], count: 2 },
    { flags: ['Compute', 'Transfer', 'SparseBinding'], count: 8 }
  ] }
};
const JOBS: { id: Job; label: string }[] = [
  { id: 'draw', label: 'Draw the frame' },
  { id: 'compute', label: 'Async compute (culling)' },
  { id: 'upload', label: 'Background mesh upload' }
];

/** Which queue family each kind of work should use, on a simple GPU and on a typical discrete one. */
@Component({
  selector: 'w-queue-families',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Which queue family?</h3></div>
      <div class="w-controls" role="group" aria-label="GPU">
        @for (p of profileIds; track p) {
          <button type="button" class="w-btn small" [class.on]="profile() === p" [attr.aria-pressed]="profile() === p" (click)="profile.set(p)">{{ profiles[p].label }}</button>
        }
      </div>
      <div class="w-controls" role="group" aria-label="Work">
        @for (j of jobs; track j.id) {
          <button type="button" class="w-btn small" [class.on]="job() === j.id" [attr.aria-pressed]="job() === j.id" (click)="job.set(j.id)">{{ j.label }}</button>
        }
      </div>
      <div class="fams">
        @for (f of families(); track $index; let i = $index) {
          <div class="fam" [class.pick]="i === chosen()" [class.gfx]="i === graphics() && i !== chosen()">
            <div class="fh">Family {{ i }} <span class="cnt">{{ f.count }} {{ f.count === 1 ? 'queue' : 'queues' }}</span></div>
            <div class="flags">@for (fl of f.flags; track fl) { <span class="flag" [class.need]="fl === needFlag()">{{ fl }}</span> }</div>
            @if (i === chosen()) { <div class="tagline">chosen</div> } @else if (i === graphics()) { <div class="tagline muted">drawing runs here</div> }
          </div>
        }
      </div>
      <div class="w-msg" [class.ok]="parallel()" [class.info]="!parallel()" aria-live="polite"><span>{{ note() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.78rem; padding: 4px 9px; }
    .fams { display: grid; grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); gap: 8px; }
    .fam { border: 1.5px solid var(--border-color); border-radius: 12px; padding: 8px 10px; background: var(--bg-main); }
    .fam.pick { border-color: #8b5cf6; background: rgba(139, 92, 246, 0.12); }
    .fam.gfx { border-style: dashed; }
    .fh { font-weight: 800; font-size: 0.88rem; }
    .cnt { font-weight: 600; color: var(--text-muted); font-size: 0.78rem; margin-left: 4px; }
    .flags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
    .flag { font-size: 0.7rem; padding: 1px 7px; border-radius: 999px; border: 1px solid var(--border-color); }
    .flag.need { border-color: #8b5cf6; color: #7c3aed; font-weight: 800; }
    .tagline { font-size: 0.72rem; font-weight: 800; color: #7c3aed; margin-top: 6px; text-transform: uppercase; letter-spacing: 0.05em; }
    .tagline.muted { color: var(--text-muted); }
  `]
})
export class QueueFamiliesWidget {
  readonly profiles = PROFILES;
  readonly profileIds: Profile[] = ['intel', 'discrete'];
  readonly jobs = JOBS;
  profile = signal<Profile>('intel');
  job = signal<Job>('upload');

  families = computed(() => PROFILES[this.profile()].families);
  private has = (f: Family, x: string) => f.flags.includes(x);
  graphics = computed(() => this.families().findIndex(f => this.has(f, 'Graphics')));
  needFlag = computed(() => ({ draw: 'Graphics', compute: 'Compute', upload: 'Transfer' }[this.job()]));
  chosen = computed(() => {
    const fs = this.families(), g = this.graphics();
    if (this.job() === 'draw') return g;
    if (this.job() === 'compute') { const c = fs.findIndex(f => this.has(f, 'Compute') && !this.has(f, 'Graphics')); return c >= 0 ? c : g; }
    let t = fs.findIndex(f => this.has(f, 'Transfer') && !this.has(f, 'Graphics') && !this.has(f, 'Compute'));
    if (t < 0) t = fs.findIndex(f => (this.has(f, 'Transfer') || this.has(f, 'Compute')) && !this.has(f, 'Graphics'));
    return t >= 0 ? t : g;
  });
  parallel = computed(() => this.job() !== 'draw' && this.chosen() !== this.graphics());
  note = computed(() => {
    if (this.job() === 'draw') return 'Drawing needs a family with Graphics. Every GPU that can show a window has one.';
    if (this.parallel()) return this.job() === 'upload'
      ? 'A transfer-only family: its copy engines move data while family 0 keeps drawing, so streaming a big model does not stutter the view.'
      : 'A compute-only family: culling can overlap with drawing (async compute). You must synchronise the two queues with semaphores.';
    return this.profile() === 'intel'
      ? 'This GPU has no separate family, so the work goes to family 0 and takes turns with drawing. Your engine still works; it just cannot overlap the two.'
      : 'No separate family suits this job here, so it shares the graphics family.';
  });
}
