import { Component, computed, signal } from '@angular/core';

type Algo = 'naive' | 'kmp' | 'rk';
type Kind = 'start' | 'match' | 'miss' | 'found' | 'jump' | 'hash' | 'spurious' | 'done';
interface Frame { shift: number; j: number; kind: Kind; comps: number; found: number[]; say: string; wh?: number }

/** Longest proper prefix that is also a suffix, for every prefix of p (the KMP failure table). */
export function lpsTable(p: string): number[] {
  const lps = Array(p.length).fill(0);
  for (let i = 1, len = 0; i < p.length;) {
    if (p[i] === p[len]) lps[i++] = ++len;
    else if (len > 0) len = lps[len - 1];
    else lps[i++] = 0;
  }
  return lps;
}

const code = (c: string) => c.charCodeAt(0) - 64;   // A = 1 … Z = 26

function frames(t: string, p: string, algo: Algo, mod: number): Frame[] {
  const n = t.length, m = p.length, f: Frame[] = [], found: number[] = [];
  let comps = 0;
  const push = (shift: number, j: number, kind: Kind, say: string, wh?: number) => f.push({ shift, j, kind, comps, found: [...found], say, wh });
  if (!m || m > n) return [{ shift: 0, j: -1, kind: 'done', comps: 0, found: [], say: 'Type a pattern no longer than the text.' }];

  if (algo === 'naive') {
    push(0, -1, 'start', 'Brute force: line the pattern up at every position and compare left to right.');
    for (let s = 0; s + m <= n; s++) {
      let j = 0;
      for (; j < m; j++) {
        comps++;
        if (t[s + j] !== p[j]) { push(s, j, 'miss', `${t[s + j]} ≠ ${p[j]}: slide the pattern one place right and start again from its first letter.`); break; }
        push(s, j, 'match', `${t[s + j]} = ${p[j]}.`);
      }
      if (j === m) { found.push(s); push(s, -1, 'found', `Match at position ${s}.`); }
    }
  } else if (algo === 'kmp') {
    const lps = lpsTable(p);
    push(0, -1, 'start', `KMP: the table under the pattern says, for each prefix, how long a piece of it is also its start. On a mismatch, slide so that piece lines up, and never re-read text letters.`);
    for (let i = 0, j = 0; i < n;) {
      comps++;
      if (t[i] === p[j]) {
        push(i - j, j, 'match', `${t[i]} = ${p[j]}.`);
        i++; j++;
        if (j === m) {
          found.push(i - m);
          push(i - m, -1, 'found', `Match at position ${i - m}. Keep the overlap of length ${lps[m - 1]} and continue.`);
          j = lps[m - 1];
        }
      } else if (j > 0) {
        push(i - j, j, 'miss', `${t[i]} ≠ ${p[j]}. The ${j} letters before already matched, and the longest of their prefixes that is also a suffix has length ${lps[j - 1]}.`);
        const nj = lps[j - 1];
        push(i - nj, -1, 'jump', `Slide by ${j - nj} so those ${nj} letter${nj === 1 ? '' : 's'} line up without being compared again. The text pointer stays at position ${i}.`);
        j = nj;
      } else {
        push(i, 0, 'miss', `${t[i]} ≠ ${p[0]} at the very start of the pattern: move on to the next text letter.`);
        i++;
      }
    }
  } else {
    const B = 31;
    let pow = 1;
    for (let k = 1; k < m; k++) pow = (pow * B) % mod;
    let ph = 0, wh = 0;
    for (let k = 0; k < m; k++) { ph = (ph * B + code(p[k])) % mod; wh = (wh * B + code(t[k])) % mod; }
    push(0, -1, 'start', `Rabin-Karp: turn the pattern into a number, hash = ${ph} (base ${B}, mod ${mod}). Slide a window along the text, updating its hash in O(1): drop the left letter, add the right one.`, wh);
    for (let s = 0; s + m <= n; s++) {
      if (s > 0) wh = ((wh - code(t[s - 1]) * pow % mod + mod) * B + code(t[s + m - 1])) % mod;
      if (wh !== ph) { push(s, -1, 'hash', `Window hash ${wh} ≠ ${ph}: cannot be a match, no letters compared.`, wh); continue; }
      let j = 0;
      for (; j < m; j++) { comps++; if (t[s + j] !== p[j]) break; }
      if (j === m) { found.push(s); push(s, -1, 'found', `Hash ${wh} = ${ph}, and checking the ${m} letters confirms it: match at position ${s}.`, wh); }
      else push(s, j, 'spurious', `Hash ${wh} = ${ph}, but the letters differ at pattern position ${j}: a spurious hit (two strings with the same hash). Always check the letters.`, wh);
    }
  }
  push(-1, -1, 'done', '');
  return f;
}

/** Brute force, KMP and Rabin-Karp searching for a pattern, compared by letters examined. */
@Component({
  selector: 'w-string-match',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Finding a pattern in text</h3></div>
      <div class="w-controls" role="group" aria-label="Algorithm">
        @for (a of algos; track a.id) { <button type="button" class="w-btn" [class.on]="algo() === a.id" (click)="setAlgo(a.id)" [attr.aria-pressed]="algo() === a.id">{{ a.label }}</button> }
      </div>
      <div class="w-controls">
        <label class="w-label m-0" for="sm-t">Text</label>
        <input id="sm-t" class="w-field mono txt" [value]="text()" (input)="setText($any($event.target).value)" />
        <label class="w-label m-0" for="sm-p">Pattern</label>
        <input id="sm-p" class="w-field mono pat" [value]="pat()" (input)="setPat($any($event.target).value)" />
        @if (algo() === 'rk') {
          <button type="button" class="w-btn" [class.on]="mod() === 11" (click)="setMod(mod() === 11 ? 101 : 11)" [attr.aria-pressed]="mod() === 11">Tiny modulus (11)</button>
        }
      </div>

      <div class="tscroll">
        <div class="strip mono">
          <div class="crow">
            @for (ch of tChars(); track $index; let i = $index) {
              <span class="c t" [class.win]="inWindow(i)" [class.hit]="isHit(i)" [class.ok]="f().kind === 'match' && i === f().shift + f().j" [class.bad]="(f().kind === 'miss' || f().kind === 'spurious') && i === f().shift + f().j">{{ ch }}</span>
            }
          </div>
          @if (f().shift >= 0) {
            <div class="crow">
              @for (k of pad(); track k) { <span class="c blank"></span> }
              @for (ch of pChars(); track $index; let j = $index) {
                <span class="c p" [class.ok]="(f().kind === 'match' && j === f().j) || f().kind === 'found'" [class.bad]="(f().kind === 'miss' || f().kind === 'spurious') && j === f().j" [class.seen]="f().kind === 'match' || f().kind === 'miss' ? j < f().j : false">{{ ch }}</span>
              }
            </div>
            @if (algo() === 'kmp') {
              <div class="crow">
                @for (k of pad(); track k) { <span class="c blank"></span> }
                @for (v of lps(); track $index) { <span class="c lps">{{ v }}</span> }
              </div>
            }
          }
          <div class="crow">
            @for (ch of tChars(); track $index; let i = $index) { <span class="c idx">{{ i }}</span> }
          </div>
        </div>
      </div>

      <div class="w-controls mt-2">
        <button type="button" class="w-btn primary" (click)="idx.set(idx() + 1)" [disabled]="atEnd()">Step</button>
        <button type="button" class="w-btn" (click)="idx.set(fr().length - 1)">Finish</button>
        <button type="button" class="w-btn" (click)="idx.set(0)">Restart</button>
        <span class="small">Letters compared <b>{{ f().comps }}</b>@if (algo() === 'rk' && f().wh !== undefined) {&nbsp;· window hash <b>{{ f().wh }}</b>}</span>
      </div>
      <div class="w-msg" [class.ok]="f().kind === 'found' || f().kind === 'done'" [class.err]="f().kind === 'miss' || f().kind === 'spurious'" [class.info]="!['found', 'done', 'miss', 'spurious'].includes(f().kind)" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .txt { width: 15rem; max-width: 100%; text-transform: uppercase; }
    .pat { width: 7rem; text-transform: uppercase; }
    .strip { display: inline-flex; flex-direction: column; gap: 3px; padding: 2px; }
    .crow { display: flex; gap: 2px; }
    .c { width: 1.45rem; height: 1.6rem; display: inline-flex; align-items: center; justify-content: center; border-radius: 5px; font-weight: 700; font-size: 0.85rem; flex: none; }
    .c.t { border: 1px solid var(--border-color); background: var(--bg-main); }
    .c.t.win { border-color: #8b5cf6; background: rgba(139, 92, 246, 0.14); }
    .c.t.hit { box-shadow: inset 0 -3px 0 #10b981; }
    .c.p { border: 1.5px solid rgba(139, 92, 246, 0.55); background: rgba(139, 92, 246, 0.1); }
    .c.ok { border-color: #10b981; background: rgba(16, 185, 129, 0.35); }
    .c.bad { border-color: #ef4444; background: rgba(239, 68, 68, 0.3); }
    .c.seen { background: rgba(16, 185, 129, 0.15); }
    .c.lps { font-size: 0.7rem; color: #0891b2; height: 1rem; }
    .c.idx { font-size: 0.6rem; color: var(--text-muted); font-weight: 500; height: 0.9rem; }
    @media (max-width: 480px) {
      .c { width: 1.05rem; font-size: 0.75rem; }
      .c.idx { font-size: 0.5rem; }
    }
  `]
})
export class StringMatchWidget {
  readonly algos: { id: Algo; label: string }[] = [
    { id: 'naive', label: 'Brute force' },
    { id: 'kmp', label: 'KMP' },
    { id: 'rk', label: 'Rabin-Karp' }
  ];
  algo = signal<Algo>('naive');
  text = signal('AABAACAADAABAABA');
  pat = signal('AABA');
  mod = signal(101);
  idx = signal(0);

  tChars = computed(() => [...this.text()]);
  pChars = computed(() => [...this.pat()]);
  lps = computed(() => lpsTable(this.pat()));
  fr = computed(() => frames(this.text(), this.pat(), this.algo(), this.mod()));
  f = computed(() => this.fr()[Math.min(this.idx(), this.fr().length - 1)]);
  atEnd = computed(() => this.idx() >= this.fr().length - 1);
  pad = computed(() => Array.from({ length: Math.max(0, this.f().shift) }, (_, i) => i));

  /** Brute-force comparisons for the same input, to compare against. */
  naiveComps = computed(() => frames(this.text(), this.pat(), 'naive', 101).at(-1)!.comps);

  inWindow(i: number) { const s = this.f().shift; return s >= 0 && i >= s && i < s + this.pat().length; }
  isHit(i: number) { const m = this.pat().length; return this.f().found.some(s => i >= s && i < s + m); }

  message = computed(() => {
    const f = this.f();
    if (f.kind !== 'done') return f.say;
    const n = this.text().length, m = this.pat().length;
    if (!m || m > n) return 'Type a pattern no longer than the text.';
    const where = f.found.length ? `Found at ${f.found.join(', ')}` : 'No match';
    if (this.algo() === 'naive') return `${where}. ${f.comps} letters compared. Worst case O(n·m): on text like AAAA…AB with pattern AAAB, every alignment nearly matches before failing.`;
    if (this.algo() === 'kmp') return `${where}. ${f.comps} letters compared (brute force: ${this.naiveComps()}). The text pointer never moves backwards, so KMP is O(n + m) even in the worst case.`;
    return `${where}. ${f.comps} letters compared (brute force: ${this.naiveComps()}). Only windows whose hash equals the pattern’s are checked. Expected O(n + m); a bad hash with many collisions degrades towards O(n·m).`;
  });

  private clean(v: string, max: number) { return v.toUpperCase().replace(/[^A-Z]/g, '').slice(0, max); }
  setText(v: string) { this.text.set(this.clean(v, 22)); this.idx.set(0); }
  setPat(v: string) { this.pat.set(this.clean(v, 8)); this.idx.set(0); }
  setAlgo(a: Algo) { this.algo.set(a); this.idx.set(0); }
  setMod(m: number) { this.mod.set(m); this.idx.set(0); }
}
