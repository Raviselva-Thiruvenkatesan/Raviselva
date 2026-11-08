import { Component, computed, signal } from '@angular/core';
import { GNode, layoutGeneral } from './tree-layout';

const START = ['beam', 'bear', 'bolt', 'bolts', 'brace', 'column'];
const MAX_WORDS = 10;

interface TrieNode { children: Map<string, TrieNode>; word: boolean }

function buildTrie(words: string[]): TrieNode {
  const root: TrieNode = { children: new Map(), word: false };
  for (const w of words) {
    let n = root;
    for (const ch of w) {
      if (!n.children.has(ch)) n.children.set(ch, { children: new Map(), word: false });
      n = n.children.get(ch)!;
    }
    n.word = true;
  }
  return root;
}

/** Convert to the layout format; each node's id is the prefix that leads to it. */
function toG(n: TrieNode, prefix: string): GNode {
  const kids = [...n.children.entries()].sort((x, y) => x[0].localeCompare(y[0])).map(([ch, c]) => toG(c, prefix + ch));
  return { id: prefix || '^', label: prefix ? prefix[prefix.length - 1] : '', children: kids };
}

/** A trie of words: shared prefixes share nodes, and a prefix search follows one path. */
@Component({
  selector: 'w-trie-viz',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>A trie (prefix tree)</h3></div>
      <p class="w-hint">Each edge is one letter. A word is the path from the root to a node marked with a double ring. Words that start the same share the start of their path.</p>

      <svg [attr.viewBox]="'0 0 ' + svgW() + ' ' + lay().height" class="tree" role="img" [attr.aria-label]="'Trie containing ' + words().join(', ')">
        @for (e of lay().edges; track e.id) { <line [attr.x1]="e.x1" [attr.y1]="e.y1" [attr.x2]="e.x2" [attr.y2]="e.y2" class="edge" [class.path]="onPath(e.to)" [class.sub]="inSub(e.to)" /> }
        @for (n of lay().nodes; track n.id) {
          <g class="node" [class.root]="n.id === '^'" [class.path]="onPath(n.id)" [class.sub]="inSub(n.id)" [class.word]="isWord(n.id)">
            @if (isWord(n.id)) { <circle [attr.cx]="n.x" [attr.cy]="n.y" r="15" class="ring" /> }
            <circle [attr.cx]="n.x" [attr.cy]="n.y" [attr.r]="n.id === '^' ? 6 : 12" />
            <text [attr.x]="n.x" [attr.y]="n.y + 4" text-anchor="middle">{{ n.label }}</text>
          </g>
        }
      </svg>

      <div class="w-controls mt-2">
        <label class="w-label m-0" for="trie-prefix">Prefix</label>
        <input id="trie-prefix" class="w-field mono inp" [value]="prefix()" (input)="prefix.set(clean($any($event.target).value)); note.set('')" placeholder="e.g. bo" />
        <label class="w-label m-0" for="trie-add">New word</label>
        <input id="trie-add" class="w-field mono inp" [value]="draft()" (input)="draft.set(clean($any($event.target).value))" (keydown.enter)="add()" placeholder="e.g. bracket" />
        <button type="button" class="w-btn primary" (click)="add()">Insert</button>
        <button type="button" class="w-btn" (click)="reset()">Reset</button>
      </div>
      <div class="w-msg" [class.ok]="!!prefix() && matches().length > 0" [class.err]="!!prefix() && matches().length === 0" [class.info]="!prefix()" aria-live="polite"><span>{{ message() }}</span></div>
      <div class="small mt-2">Words <b>{{ words().length }}</b> · Letters in all words <b>{{ letters() }}</b> · Trie nodes <b>{{ lay().nodes.length - 1 }}</b>&nbsp;<span class="text-muted">(shared prefixes are stored once)</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .tree { width: 100%; max-width: 520px; max-height: 360px; display: block; margin: 0 auto; }
    .edge { stroke: var(--border-color); stroke-width: 2; }
    .edge.path { stroke: #f59e0b; stroke-width: 3; }
    .edge.sub { stroke: rgba(16, 185, 129, 0.7); }
    .node circle { fill: var(--bg-main); stroke: rgba(139, 92, 246, 0.55); stroke-width: 1.5; transition: all 0.2s; }
    .node .ring { fill: none; stroke: rgba(139, 92, 246, 0.8); stroke-width: 1.5; }
    .node.root circle { fill: var(--text-muted); stroke: none; }
    .node text { font-size: 12px; font-weight: 700; fill: var(--text-main); }
    .node.path circle:not(.ring) { fill: rgba(245, 158, 11, 0.32); stroke: #f59e0b; }
    .node.sub circle:not(.ring) { fill: rgba(16, 185, 129, 0.25); stroke: #10b981; }
    .inp { width: 7.5rem; }
  `]
})
export class TrieVizWidget {
  words = signal<string[]>([...START]);
  prefix = signal('bo');
  draft = signal('');
  note = signal('');

  trie = computed(() => buildTrie(this.words()));
  lay = computed(() => layoutGeneral(toG(this.trie(), ''), 34, 42, 20));
  svgW = computed(() => Math.max(this.lay().width, 200));
  wordSet = computed(() => new Set(this.words()));
  letters = computed(() => this.words().reduce((s, w) => s + w.length, 0));
  /** Does the prefix exist as a path in the trie? */
  found = computed(() => {
    let n: TrieNode | undefined = this.trie();
    for (const ch of this.prefix()) { n = n?.children.get(ch); if (!n) return false; }
    return true;
  });
  matches = computed(() => (this.found() ? [...this.words()].filter(w => w.startsWith(this.prefix())).sort() : []));
  message = computed(() => {
    const p = this.prefix(), note = this.note();
    if (!p) return note || 'Type a prefix to follow its path from the root.';
    if (!this.found()) return `${note}Follow the letters of “${p}” from the root: the path breaks off, so no word starts with “${p}”. Checked at most ${p.length} letters.`;
    return `${note}Followed ${p.length} letter${p.length > 1 ? 's' : ''} from the root. Everything below that node starts with “${p}”: ${this.matches().join(', ')}.${this.wordSet().has(p) ? ` “${p}” is itself a word (double ring).` : ''}`;
  });

  clean(v: string) { return v.toLowerCase().replace(/[^a-z]/g, '').slice(0, 10); }
  onPath(id: string) { const p = this.prefix(); return !!p && this.found() && id !== '^' && p.startsWith(id); }
  inSub(id: string) { const p = this.prefix(); return !!p && this.found() && id.length > p.length && id.startsWith(p); }
  isWord(id: string) { return this.wordSet().has(id); }

  add() {
    const w = this.draft();
    if (!w) return this.note.set('Type a word to insert first. ');
    if (this.wordSet().has(w)) return this.note.set(`“${w}” is already in the trie. `);
    if (this.words().length >= MAX_WORDS) return this.note.set(`This demo holds at most ${MAX_WORDS} words. Reset to start again. `);
    const before = this.lay().nodes.length;
    this.words.update(ws => [...ws, w]);
    const added = this.lay().nodes.length - before;
    this.note.set(added === 0
      ? `Inserted “${w}”: no new nodes; the path already existed, so it only marks that node as a word end. `
      : `Inserted “${w}”: ${added} new node${added === 1 ? '' : 's'} for ${w.length} letters${added < w.length ? ` (the first ${w.length - added} were already there)` : ''}. `);
    this.draft.set('');
  }
  reset() { this.words.set([...START]); this.note.set(''); this.prefix.set('bo'); }
}
