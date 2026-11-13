import { Component, computed, signal } from '@angular/core';

const CAPACITY = 1024;
const COLORS = ['#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#14b8a6', '#6366f1', '#ef4444'];
interface Piece { id: number; offset: number; size: number }
interface Range { offset: number; size: number }

/** A 1 KiB block with a first-fit allocator: allocate aligned pieces, free them, and watch the free list. */
@Component({
  selector: 'w-allocator-sim',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>First fit in a 1 KiB block</h3></div>
      <div class="w-controls" role="group" aria-label="Size">
        <span class="lbl">Size</span>
        @for (s of sizes; track s) { <button type="button" class="w-btn small mono" [class.on]="size() === s" [attr.aria-pressed]="size() === s" (click)="size.set(s)">{{ s }}</button> }
      </div>
      <div class="w-controls" role="group" aria-label="Alignment">
        <span class="lbl">Alignment</span>
        @for (a of aligns; track a) { <button type="button" class="w-btn small mono" [class.on]="align() === a" [attr.aria-pressed]="align() === a" (click)="align.set(a)">{{ a }}</button> }
      </div>
      <div class="w-controls">
        <button type="button" class="w-btn" (click)="allocate()"><i class="bi bi-plus-lg" aria-hidden="true"></i> Allocate</button>
        <button type="button" class="w-btn" [disabled]="pieces().length < 2" (click)="freeEveryOther()">Free every other</button>
        <button type="button" class="w-btn" (click)="reset()"><i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i> Reset</button>
      </div>
      <svg viewBox="0 0 512 46" class="bar" role="img" [attr.aria-label]="summary()">
        <rect x="0" y="4" width="512" height="28" class="free" />
        @for (p of pieces(); track p.id) {
          <rect [attr.x]="p.offset / 2" y="4" [attr.width]="p.size / 2" height="28" [attr.fill]="color(p.id)" class="piece" (click)="free(p)">
            <title>Piece {{ p.id }}: offset {{ p.offset }}, {{ p.size }} bytes (click to free)</title>
          </rect>
        }
        @for (t of ticks; track t) { <text [attr.x]="t / 2" y="44" class="tick" [class.end]="t === 1024">{{ t }}</text> }
      </svg>
      <p class="w-hint">Click a piece to free it. Free ranges: <span class="mono">{{ freeText() }}</span></p>
      <div class="pieces">
        @for (p of pieces(); track p.id) {
          <button type="button" class="w-btn small mono" (click)="free(p)" [attr.aria-label]="'Free piece ' + p.id"><span class="dot" [style.background]="color(p.id)"></span>#{{ p.id }} &#64;{{ p.offset }}, {{ p.size }} B</button>
        }
      </div>
      <div class="w-msg" [class.err]="failed()" [class.info]="!failed()" aria-live="polite"><span>{{ msg() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.74rem; padding: 3px 8px; }
    .lbl { font-size: 0.8rem; font-weight: 700; align-self: center; min-width: 4.6rem; }
    .bar { width: 100%; display: block; margin: 0.5rem 0 0.2rem; }
    .free { fill: var(--bg-main); stroke: var(--border-color); }
    .piece { stroke: #fff; stroke-width: 0.6; cursor: pointer; }
    .tick { font-size: 8px; fill: var(--text-muted); }
    .tick.end { text-anchor: end; }
    .pieces { display: flex; flex-wrap: wrap; gap: 4px; margin: 0.3rem 0; }
    .dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 4px; }
  `]
})
export class AllocatorSimWidget {
  readonly sizes = [40, 64, 100, 200, 300];
  readonly aligns = [16, 64, 256];
  readonly ticks = [0, 256, 512, 768, 1024];
  size = signal(100);
  align = signal(64);
  pieces = signal<Piece[]>([]);
  freeList = signal<Range[]>([{ offset: 0, size: CAPACITY }]);
  failed = signal(false);
  msg = signal('An empty block: one free range of 1,024 bytes. Allocate a few pieces with different alignments.');
  private next = 1;

  color(id: number) { return COLORS[(id - 1) % COLORS.length]; }
  freeText = computed(() => this.freeList().map(r => `[${r.offset}, ${r.offset + r.size})`).join(' ') || 'none');
  freeBytes = computed(() => this.freeList().reduce((s, r) => s + r.size, 0));
  largest = computed(() => Math.max(0, ...this.freeList().map(r => r.size)));
  summary = computed(() => `${this.pieces().length} pieces, ${this.freeBytes()} bytes free in ${this.freeList().length} ranges`);

  allocate() {
    const size = this.size(), align = this.align();
    const list = this.freeList().slice();
    for (let i = 0; i < list.length; i++) {
      const { offset: start, size: length } = list[i];
      const aligned = Math.ceil(start / align) * align;
      if (aligned + size > start + length) continue;
      const parts: Range[] = [];
      if (aligned > start) parts.push({ offset: start, size: aligned - start });
      if (aligned + size < start + length) parts.push({ offset: aligned + size, size: start + length - aligned - size });
      list.splice(i, 1, ...parts);
      this.freeList.set(list);
      const p = { id: this.next++, offset: aligned, size };
      this.pieces.update(ps => [...ps, p].sort((a, b) => a.offset - b.offset));
      this.failed.set(false);
      this.msg.set(aligned > start
        ? `Piece #${p.id} at offset ${aligned}: the first range that fits starts at ${start}, rounded up to a multiple of ${align}, leaving a ${aligned - start}-byte gap before it.`
        : `Piece #${p.id} at offset ${aligned}: the start of the first range that fits, already a multiple of ${align}.`);
      return;
    }
    this.failed.set(true);
    this.msg.set(this.freeBytes() < size
      ? `The block is full: only ${this.freeBytes()} bytes are free, less than the ${size} requested.`
      : `No free range can hold ${size} bytes aligned to ${align}. ${this.freeBytes()} bytes are free in total, but the largest range is ${this.largest()}: that is fragmentation.`);
  }

  free(p: Piece) {
    const list = this.freeList().slice();
    let i = 0;
    while (i < list.length && list[i].offset < p.offset) i++;
    list.splice(i, 0, { offset: p.offset, size: p.size });
    let merged = 0;
    if (i + 1 < list.length && p.offset + p.size === list[i + 1].offset) { list[i] = { offset: p.offset, size: list[i].size + list[i + 1].size }; list.splice(i + 1, 1); merged++; }
    if (i > 0 && list[i - 1].offset + list[i - 1].size === list[i].offset) { list[i - 1] = { offset: list[i - 1].offset, size: list[i - 1].size + list[i].size }; list.splice(i, 1); merged++; }
    this.freeList.set(list);
    this.pieces.update(ps => ps.filter(x => x.id !== p.id));
    this.failed.set(false);
    this.msg.set(`Freed #${p.id}` + (merged ? `, merged with ${merged === 2 ? 'both neighbours' : 'a free neighbour'} into one range.` : '. Its neighbours are in use, so it stays a separate free range.'));
  }

  freeEveryOther() {
    const victims = this.pieces().filter((_, i) => i % 2 === 0);
    victims.forEach(p => this.free(p));
    this.msg.set(`Freed ${victims.length} pieces: ${this.freeBytes()} bytes free, scattered over ${this.freeList().length} ranges (largest ${this.largest()}). Now try a large size.`);
  }

  reset() {
    this.pieces.set([]);
    this.freeList.set([{ offset: 0, size: CAPACITY }]);
    this.next = 1;
    this.failed.set(false);
    this.msg.set('An empty block: one free range of 1,024 bytes. Allocate a few pieces with different alignments.');
  }
}
