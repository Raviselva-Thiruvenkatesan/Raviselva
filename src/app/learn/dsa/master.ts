import { Lesson } from '../learn.types';
import { cs } from '../csharp/cs';

export const MASTER: Lesson[] = [
  // ------------------------------------------------------------------ 45
  {
    slug: 'segment-fenwick-trees',
    title: 'Segment trees and Fenwick trees',
    summary: 'Answer range queries (sum, minimum, maximum) and apply updates in O(log n) each: how a segment tree splits ranges, the compact bottom-up version, and the tiny Fenwick tree built on one bit trick.',
    minutes: 16,
    blocks: [
      { type: 'p', text: 'Prefix sums answer “total from day l to day r” in O(1), but only while the data never changes: correcting one value means rebuilding up to n prefix entries. A plain array is the opposite: updates are O(1) and range sums are O(n). When you need **both** many queries and many updates, as with live sensor readings, stock levels or a leaderboard, you need a structure in between.' },
      { type: 'table', head: ['Structure', 'Range query', 'Point update', 'Notes'], rows: [
        ['Plain array', 'O(n)', 'O(1)', 'Fine for a few queries'],
        ['Prefix-sum array', 'O(1)', 'O(n)', 'Fine when data never changes'],
        ['Segment tree', 'O(log n)', 'O(log n)', 'Any associative operation: sum, min, max, gcd'],
        ['Fenwick tree', 'O(log n)', 'O(log n)', 'Sums (and other invertible operations), very compact']
      ] },
      { type: 'h2', text: 'The segment tree' },
      { type: 'p', text: 'A **segment tree** is a binary tree over the array. Each leaf holds one value; each inner node holds the sum of its two children, which is the sum of a whole range. The root holds the sum of everything. A range query walks down from the root: a node completely inside the range contributes its stored sum, a node completely outside is skipped, and only nodes that are partly inside look at their children.' },
      { type: 'widget', name: 'segment-tree' },
      { type: 'p', text: 'At each level at most two nodes are “partly inside” (the two ends of the range), so a query visits O(log n) nodes. An update changes one leaf and then the sums on its path to the root: also O(log n).' },
      { type: 'code', title: 'SegmentTree.cs', code: cs`
int[] tonnes = { 5, 8, 6, 3, 9, 2, 7, 4 };
var tree = new SegmentTree(tonnes);
Console.WriteLine($"Days 2-6: {tree.Query(2, 6)}");
Console.WriteLine($"All days: {tree.Query(0, 7)}");
tree.Update(4, 1);                                   // day 4 corrected from 9 to 1
Console.WriteLine($"Days 2-6: {tree.Query(2, 6)}");

class SegmentTree
{
    private readonly int[] sum;
    private readonly int n;

    public SegmentTree(int[] values)
    {
        n = values.Length;
        sum = new int[4 * n];                        // always enough room
        Build(1, 0, n - 1, values);
    }

    private void Build(int node, int lo, int hi, int[] v)
    {
        if (lo == hi) { sum[node] = v[lo]; return; }
        int mid = (lo + hi) / 2;
        Build(2 * node, lo, mid, v);                 // children of node k are 2k and 2k + 1
        Build(2 * node + 1, mid + 1, hi, v);
        sum[node] = sum[2 * node] + sum[2 * node + 1];
    }

    public int Query(int l, int r) => Query(1, 0, n - 1, l, r);

    private int Query(int node, int lo, int hi, int l, int r)
    {
        if (r < lo || hi < l) return 0;              // outside: skip
        if (l <= lo && hi <= r) return sum[node];    // inside: use the stored sum
        int mid = (lo + hi) / 2;                     // partly inside: ask both children
        return Query(2 * node, lo, mid, l, r) + Query(2 * node + 1, mid + 1, hi, l, r);
    }

    public void Update(int i, int value) => Update(1, 0, n - 1, i, value);

    private void Update(int node, int lo, int hi, int i, int value)
    {
        if (lo == hi) { sum[node] = value; return; }
        int mid = (lo + hi) / 2;
        if (i <= mid) Update(2 * node, lo, mid, i, value);
        else Update(2 * node + 1, mid + 1, hi, i, value);
        sum[node] = sum[2 * node] + sum[2 * node + 1];   // fix the sums on the way back up
    }
}`, output: 'Days 2-6: 27\nAll days: 44\nDays 2-6: 19' },
      { type: 'p', text: 'The tree is stored in an array exactly like a heap: node 1 is the root and node k has children 2k and 2k + 1. An array of 4n entries is always big enough, whatever n is.' },
      { type: 'h2', text: 'Any associative operation' },
      { type: 'p', text: 'Nothing above depends on “sum” except the combine step. Replace `+` with `Math.Min` and 0 with `int.MaxValue`, and you get range minimum queries. Max, gcd, “count of defects”, even “matrix product” work the same way, as long as the operation is **associative**: (a ∘ b) ∘ c = a ∘ (b ∘ c).' },
      { type: 'p', text: 'There is also a shorter **bottom-up** version: put the leaves at positions n to 2n − 1, fill the parents backwards, and answer queries by walking both ends of the range upwards together. No recursion, half the memory:' },
      { type: 'code', title: 'RangeMin.cs', code: cs`
int[] temps = { 14, 9, 17, 6, 11, 8, 20, 12 };       // midday temperatures, days 0-7
int n = temps.Length;
var t = new int[2 * n];
for (int i = 0; i < n; i++) t[n + i] = temps[i];                   // leaves at n .. 2n - 1
for (int i = n - 1; i >= 1; i--) t[i] = Math.Min(t[2 * i], t[2 * i + 1]);

Console.WriteLine(Min(0, 2));
Console.WriteLine(Min(3, 6));
Console.WriteLine(Min(4, 7));

int Min(int l, int r)                                // inclusive range l..r
{
    int best = int.MaxValue;
    for (l += n, r += n + 1; l < r; l /= 2, r /= 2)
    {
        if (l % 2 == 1) best = Math.Min(best, t[l++]);   // l is a right child: take it, move right
        if (r % 2 == 1) best = Math.Min(best, t[--r]);   // r is a right child: take its left sibling
    }
    return best;
}`, output: '9\n6\n8' },
      { type: 'note', kind: 'info', text: 'To **add a value to a whole range** in O(log n), segment trees use **lazy propagation**: a node remembers “everything below me still needs +5” and only pushes that down when a query has to look inside. It is the standard tool for problems like “raise every price from l to r by 10%, then ask for range totals”.' },
      { type: 'h2', text: 'The Fenwick tree' },
      { type: 'p', text: 'A **Fenwick tree** (or binary indexed tree) does prefix sums and updates in O(log n) with just one array of n + 1 numbers and two tiny loops. Cell `t[i]` (counting from 1) stores the sum of the `lowbit(i)` values that end at position i, where `lowbit(i) = i & -i` is the lowest set bit of i: t[6] covers 2 values (6 = 110₂), t[8] covers 8 (8 = 1000₂), t[7] covers 1.' },
      { type: 'ul', items: [
        '**Prefix sum up to i:** add t[i], then jump to `i -= i & -i` (remove the lowest bit), until i is 0. For i = 7: t[7] + t[6] + t[4].',
        '**Update at i:** add the change to t[i], then jump to `i += i & -i`, until past the end. These are exactly the cells whose range contains i.',
        '**Range sum l..r:** prefix(r) − prefix(l − 1).'
      ] },
      { type: 'p', text: 'Switch the widget to **Fenwick tree** to see which cells a query adds and subtracts.' },
      { type: 'code', title: 'Fenwick.cs', code: cs`
int[] tonnes = { 5, 8, 6, 3, 9, 2, 7, 4 };
var fw = new Fenwick(tonnes.Length);
for (int i = 0; i < tonnes.Length; i++) fw.Add(i, tonnes[i]);

Console.WriteLine($"Days 0-6: {fw.PrefixSum(6)}");
Console.WriteLine($"Days 2-6: {fw.RangeSum(2, 6)}");
fw.Add(4, -8);                                       // day 4: 9 -> 1
Console.WriteLine($"Days 2-6: {fw.RangeSum(2, 6)}");

class Fenwick
{
    private readonly int[] t;                        // 1-based: t[i] covers the (i & -i) values ending at i
    public Fenwick(int n) => t = new int[n + 1];

    public void Add(int index, int delta)
    {
        for (int i = index + 1; i < t.Length; i += i & -i) t[i] += delta;
    }

    public int PrefixSum(int index)                  // sum of values 0..index
    {
        int s = 0;
        for (int i = index + 1; i > 0; i -= i & -i) s += t[i];
        return s;
    }

    public int RangeSum(int l, int r) => PrefixSum(r) - (l > 0 ? PrefixSum(l - 1) : 0);
}`, output: 'Days 0-6: 40\nDays 2-6: 27\nDays 2-6: 19' },
      { type: 'table', head: ['', 'Segment tree', 'Fenwick tree'], rows: [
        ['Memory', '2n to 4n', 'n + 1'],
        ['Code', '30–50 lines', '10 lines'],
        ['Operations', 'Any associative (min, max, gcd, …)', 'Sums and other invertible operations'],
        ['Range updates', 'Yes, with lazy propagation', 'Range add with a second tree'],
        ['Typical use', 'Range min/max, complex merges', 'Running totals, counting, rankings']
      ] },
      { type: 'h2', text: 'A classic trick: counting with a Fenwick tree' },
      { type: 'p', text: 'Index the Fenwick tree by **value** instead of position, and add 1 for each value seen. Then `PrefixSum(v)` answers “how many values seen so far are ≤ v?” in O(log n). This counts inversions, ranks scores on a live leaderboard and answers “how many earlier deliveries were lighter than this one?”.' },
      { type: 'quiz', question: 'Why does a segment tree query visit only O(log n) nodes?', options: ['It caches previous answers', 'At each level at most two nodes are partly inside the range; the rest are fully inside or outside and are not explored', 'The tree has only log n nodes', 'It uses binary search on the values'], answer: 1, explain: 'Only the nodes at the two ends of the range need to look at their children, so the work per level is constant and there are log n levels.' },
      { type: 'quiz', question: 'In a Fenwick tree, which cells does the prefix sum up to position 12 (1-based) add?', options: ['t[12] and t[8]', 't[12], t[11] and t[10]', 't[12], t[8] and t[4]', 't[8] and t[4]'], answer: 0, explain: '12 = 1100₂. Remove the lowest bit: 1000₂ = 8. Remove it again: 0. So t[12] (covering 9–12) + t[8] (covering 1–8).' },
      { type: 'exercise', task: 'For loads arriving in the order `{ 3, 1, 4, 1, 5, 2 }`, print for each load how many **earlier** loads were strictly lighter: `0 0 2 0 4 2`. Use a Fenwick tree indexed by weight so each answer takes O(log n).', hint: 'Before adding weight w, the answer is the prefix sum up to w − 1. Then add 1 at position w.', solution: cs`
int[] loads = { 3, 1, 4, 1, 5, 2 };
int max = loads.Max();
var t = new int[max + 1];                            // Fenwick tree over weights 1..max
var result = new List<int>();
foreach (int w in loads)
{
    result.Add(CountUpTo(w - 1));                    // earlier loads strictly lighter
    for (int i = w; i <= max; i += i & -i) t[i]++;   // record this weight
}
Console.WriteLine(string.Join(" ", result));

int CountUpTo(int i)
{
    int s = 0;
    for (; i > 0; i -= i & -i) s += t[i];
    return s;
}`, output: '0 0 2 0 4 2' }
    ],
    keyPoints: [
      'Prefix sums are fast to query but slow to update; segment and Fenwick trees make both O(log n).',
      'A segment tree stores the combined value of each range; a query uses fully covered nodes and skips the rest.',
      'Any associative operation works in a segment tree; lazy propagation adds O(log n) range updates.',
      'A Fenwick tree is one array and two loops built on i & -i; it handles prefix sums, range sums and counting.'
    ]
  },

  // ------------------------------------------------------------------ 46
  {
    slug: 'string-matching',
    title: 'String matching: KMP and Rabin-Karp',
    summary: 'Find every occurrence of a pattern in a text: why brute force can be O(n·m), how KMP never re-reads a letter using its failure table, how Rabin-Karp compares rolling hashes, and what .NET does for you.',
    minutes: 16,
    blocks: [
      { type: 'p', text: 'Searching for a word in a document, a gene in DNA, a code in a log file, a virus signature in a file: all are **string matching**. The text has length n, the pattern length m. The obvious method tries every alignment and compares letter by letter. Usually it fails fast, but on unlucky inputs (text `AAAA…A`, pattern `AAAB`) every alignment almost matches, and the cost is **O(n·m)**.' },
      { type: 'code', title: 'BruteForce.cs', code: cs`
Console.WriteLine(string.Join(", ", FindAll("AABAACAADAABAABA", "AABA")));

static List<int> FindAll(string text, string pattern)
{
    var found = new List<int>();
    for (int s = 0; s + pattern.Length <= text.Length; s++)   // every alignment
    {
        int j = 0;
        while (j < pattern.Length && text[s + j] == pattern[j]) j++;
        if (j == pattern.Length) found.Add(s);
    }
    return found;
}`, output: '0, 9, 12' },
      { type: 'p', text: 'Step through the three algorithms on the same input and compare the “letters compared” counter. Try your own text, such as `AAAAAAAAAAAAAAAB` with pattern `AAAB`, to see brute force at its worst.' },
      { type: 'widget', name: 'string-match' },
      { type: 'h2', text: 'KMP: never look back' },
      { type: 'p', text: 'When brute force hits a mismatch after matching j letters, it slides by one and re-reads letters it has already seen. But it already **knows** those j letters: they are the first j letters of the pattern. The **Knuth-Morris-Pratt** algorithm precomputes, for every prefix of the pattern, the length of its longest proper prefix that is also a suffix (the **failure** or **LPS** table). After a mismatch, the pattern slides so that this prefix lines up with the text, and comparison continues **at the same text position**.' },
      { type: 'table', head: ['Pattern', 'A', 'B', 'A', 'B', 'C', 'A', 'B', 'A', 'B'], rows: [
        ['LPS', '0', '0', '1', '2', '0', '1', '2', '3', '4']
      ] },
      { type: 'p', text: 'Read the table like this: after matching `ABAB` (LPS 2), its last two letters `AB` are also its first two. If the next letter fails, the pattern can slide so those two letters line up, without comparing them again.' },
      { type: 'code', title: 'Kmp.cs', code: cs`
Console.WriteLine(string.Join(" ", BuildLps("ABABCABAB")));
Console.WriteLine(string.Join(", ", Search("ABABDABACDABABCABAB", "ABABCABAB")));
Console.WriteLine(string.Join(", ", Search("AABAACAADAABAABA", "AABA")));

static int[] BuildLps(string p)
{
    var lps = new int[p.Length];
    int len = 0;                                     // length of the current prefix that is also a suffix
    for (int i = 1; i < p.Length; )
    {
        if (p[i] == p[len]) lps[i++] = ++len;        // extend it
        else if (len > 0) len = lps[len - 1];        // fall back to a shorter one
        else lps[i++] = 0;
    }
    return lps;
}

static List<int> Search(string text, string p)
{
    var lps = BuildLps(p);
    var found = new List<int>();
    for (int i = 0, j = 0; i < text.Length; )
    {
        if (text[i] == p[j])
        {
            i++; j++;
            if (j == p.Length) { found.Add(i - j); j = lps[j - 1]; }   // keep the overlap
        }
        else if (j > 0) j = lps[j - 1];              // slide the pattern; i stays where it is
        else i++;
    }
    return found;
}`, output: '0 0 1 2 0 1 2 3 4\n10\n0, 9, 12' },
      { type: 'p', text: 'The text index `i` only ever moves forward, and every fallback of `j` is paid for by an earlier step forward, so the search is **O(n)** and building the table is **O(m)**: O(n + m) in total, even in the worst case.' },
      { type: 'h2', text: 'Rabin-Karp: compare numbers, not letters' },
      { type: 'p', text: 'Rabin-Karp turns strings into numbers with a **hash**: treat the letters as digits in base B and take the result modulo a large prime M. Comparing two numbers is O(1). The trick is the **rolling hash**: when the window slides one place right, the new hash is computed from the old one in O(1), by removing the left letter’s contribution and adding the new right letter.' },
      { type: 'code', title: 'RabinKarp.cs', code: cs`
Console.WriteLine(string.Join(", ", RabinKarp("AABAACAADAABAABA", "AABA")));

static List<int> RabinKarp(string text, string p)
{
    const long B = 256, M = 1_000_000_007;
    int m = p.Length;
    var found = new List<int>();
    if (m > text.Length) return found;

    long high = 1;                                   // B^(m-1) mod M: the weight of the leftmost letter
    for (int i = 1; i < m; i++) high = high * B % M;

    long ph = 0, wh = 0;
    for (int i = 0; i < m; i++)
    {
        ph = (ph * B + p[i]) % M;
        wh = (wh * B + text[i]) % M;
    }

    for (int s = 0; ; s++)
    {
        if (wh == ph && string.CompareOrdinal(text, s, p, 0, m) == 0) found.Add(s);   // same hash: check letters
        if (s + m == text.Length) break;
        wh = (wh - text[s] * high % M + M) % M;      // drop the left letter
        wh = (wh * B + text[s + m]) % M;             // bring in the right letter
    }
    return found;
}`, output: '0, 9, 12' },
      { type: 'note', kind: 'warn', text: 'Different strings can share a hash (a **collision**, or spurious hit), so a hash match must always be confirmed letter by letter. In the widget, turn on the tiny modulus to see spurious hits. With a large prime M they are rare, and the expected time is O(n + m).' },
      { type: 'p', text: 'Rabin-Karp shines when searching for **many patterns of the same length** at once (put all pattern hashes in a hash set) and for finding repeated substrings, as plagiarism checkers and file-deduplication tools do.' },
      { type: 'h2', text: 'In real .NET code' },
      { type: 'p', text: 'You rarely write these yourself. `string.IndexOf`, `Contains` and `Span.IndexOf` are heavily optimised with vector (SIMD) instructions and scan many characters per CPU step. One thing matters a lot, though: pass **`StringComparison.Ordinal`** (or `OrdinalIgnoreCase`) when you mean exact characters. `IndexOf(string)` without it uses the current culture’s rules, which is slower and can give surprising results.' },
      { type: 'code', title: 'Ordinal.cs', code: cs`
string log = "ERR;OK;ERR;ERR;OK;ERRATA";
int count = 0;
for (int i = log.IndexOf("ERR", StringComparison.Ordinal); i >= 0;
     i = log.IndexOf("ERR", i + 1, StringComparison.Ordinal))
    count++;
Console.WriteLine(count);
Console.WriteLine(log.Contains("ok", StringComparison.OrdinalIgnoreCase));`, output: '4\nTrue' },
      { type: 'table', head: ['Algorithm', 'Time', 'Best for'], rows: [
        ['Brute force', 'O(n·m) worst, fast in practice', 'Short patterns, everyday text'],
        ['KMP', 'O(n + m) guaranteed', 'Streams (never re-reads), worst-case guarantees'],
        ['Rabin-Karp', 'O(n + m) expected', 'Many patterns at once, repeated substrings'],
        ['Boyer-Moore', 'Often less than n comparisons', 'Long patterns over large alphabets; skips ahead'],
        ['Aho-Corasick', 'O(n + total pattern length + matches)', 'Thousands of patterns: virus scanners, word filters']
      ] },
      { type: 'quiz', question: 'Why is KMP O(n + m) even in the worst case?', options: ['It uses hashing', 'The text pointer never moves backwards; mismatches only shorten the matched part using the precomputed table', 'It skips every other letter', 'It sorts the text first'], answer: 1, explain: 'Each text letter is passed once; the fallbacks of j are bounded by the number of forward steps taken.' },
      { type: 'quiz', question: 'Two windows have the same Rabin-Karp hash as the pattern. What must the algorithm do?', options: ['Report both as matches', 'Compare the letters of each window with the pattern to rule out a collision', 'Recompute the hash with another base', 'Nothing: equal hashes mean equal strings'], answer: 1, explain: 'Hashes are many-to-one. Equal hash means “maybe equal”; only the letter check confirms it.' },
      { type: 'exercise', task: 'Use the LPS table to find the **shortest repeating unit** of a string: `ABCABCABC` → `ABC`, `ABAB` → `AB`, `ABCAB` → `ABCAB` (no repetition), `AAAA` → `A`.', hint: 'Let p = n − lps[n − 1]. If n is divisible by p, the first p letters repeat to form the whole string; otherwise the string is its own unit.', solution: cs`
foreach (var s in new[] { "ABCABCABC", "ABAB", "ABCAB", "AAAA" })
    Console.WriteLine($"{s}: {Unit(s)}");

static string Unit(string s)
{
    var lps = new int[s.Length];
    for (int i = 1, len = 0; i < s.Length; )
    {
        if (s[i] == s[len]) lps[i++] = ++len;
        else if (len > 0) len = lps[len - 1];
        else lps[i++] = 0;
    }
    int period = s.Length - lps[^1];
    return s.Length % period == 0 ? s[..period] : s;
}`, output: 'ABCABCABC: ABC\nABAB: AB\nABCAB: ABCAB\nAAAA: A' }
    ],
    keyPoints: [
      'Brute-force matching is O(n·m) in the worst case because it re-reads text after every mismatch.',
      'KMP precomputes the longest prefix-that-is-also-a-suffix table and never moves backwards in the text: O(n + m).',
      'Rabin-Karp compares rolling hashes in O(1) per window and confirms hash matches letter by letter.',
      'In .NET, use IndexOf / Contains with StringComparison.Ordinal; they are vectorised and fast.'
    ]
  },

  // ------------------------------------------------------------------ 47
  {
    slug: 'spatial-indexes',
    title: 'Spatial indexes: grids, quadtrees and BVH',
    summary: 'Find points in an area, nearest neighbours and colliding objects without checking everything: uniform grids, quadtrees, k-d trees, R-trees and bounding volume hierarchies, and when to use each.',
    minutes: 15,
    blocks: [
      { type: 'p', text: '“Which sensors are inside this zone?”, “which crane is nearest to this load?”, “does this pipe clash with any beam?”. Questions about **position** cannot use an ordinary sorted list or hash table, because position has two (or three) dimensions. Checking every object is O(n) per question, and for clash detection between all pairs it is O(n²). A **spatial index** groups objects by where they are, so that whole regions can be skipped at once.' },
      { type: 'h2', text: 'Uniform grid (spatial hashing)' },
      { type: 'p', text: 'Divide the area into equal square cells and keep a list of the objects in each cell, for example in a `Dictionary` keyed by the cell coordinates. A search looks only in the cells that overlap the search area.' },
      { type: 'code', title: 'Grid.cs', code: cs`
var sensors = new (string Id, double X, double Y)[]
{
    ("S1", 12, 8), ("S2", 47, 15), ("S3", 51, 22), ("S4", 55, 18), ("S5", 90, 75),
    ("S6", 33, 61), ("S7", 58, 26), ("S8", 72, 40), ("S9", 5, 95), ("S10", 49, 30)
};

const double Cell = 20;
var grid = new Dictionary<(int, int), List<(string Id, double X, double Y)>>();
foreach (var s in sensors)
{
    var key = ((int)(s.X / Cell), (int)(s.Y / Cell));
    if (!grid.TryGetValue(key, out var list)) grid[key] = list = new();
    list.Add(s);
}

var (x1, y1, x2, y2) = (40.0, 10.0, 60.0, 28.0);     // the search zone
var found = new List<string>();
int checkedCount = 0;
for (int cx = (int)(x1 / Cell); cx <= (int)(x2 / Cell); cx++)
    for (int cy = (int)(y1 / Cell); cy <= (int)(y2 / Cell); cy++)
        if (grid.TryGetValue((cx, cy), out var list))
            foreach (var s in list)
            {
                checkedCount++;
                if (s.X >= x1 && s.X <= x2 && s.Y >= y1 && s.Y <= y2) found.Add(s.Id);
            }
Console.WriteLine($"Found {string.Join(", ", found)}");
Console.WriteLine($"Checked {checkedCount} of {sensors.Length}");`, output: 'Found S2, S4, S3, S7\nChecked 5 of 10' },
      { type: 'p', text: 'Grids are simple, fast to update (moving an object means moving it between two lists) and ideal when objects are **spread evenly** and similar in size: particles, game characters, delivery vans on a city map. Their weakness is **clustering**: if most objects sit in a few cells, those cells are scanned point by point and the grid is no better than a list.' },
      { type: 'h2', text: 'Quadtree: adapt to the data' },
      { type: 'p', text: 'A **quadtree** starts with one square. When a square holds more than a few points, it splits into four quarters, and so on. Crowded areas end up with many small squares, empty areas with a few big ones. A search descends only into squares that overlap the search area, skipping every other subtree. In 3D the same idea is an **octree** (eight children).' },
      { type: 'widget', name: 'quadtree' },
      { type: 'p', text: 'The box starts at the edge of the dense cluster in the top right. Switch between the three indexes and compare “sensors checked”, then click elsewhere to move the box. The quadtree’s small squares there let it reject most of the cluster; the grid has to scan its crowded cells completely.' },
      { type: 'code', title: 'Quadtree.cs', code: cs`
var sensors = new (string Id, double X, double Y)[]
{
    ("S1", 12, 8), ("S2", 47, 15), ("S3", 51, 22), ("S4", 55, 18), ("S5", 90, 75),
    ("S6", 33, 61), ("S7", 58, 26), ("S8", 72, 40), ("S9", 5, 95), ("S10", 49, 30)
};
var root = new QuadTree(0, 0, 100);
foreach (var s in sensors) root.Insert(s.Id, s.X, s.Y);

var found = new List<string>();
int visited = root.Query(40, 10, 60, 28, found);
Console.WriteLine($"Found {string.Join(", ", found)}");
Console.WriteLine($"Visited {visited} squares");

class QuadTree(double x, double y, double size)
{
    const int Capacity = 2;
    readonly List<(string Id, double X, double Y)> points = new();
    QuadTree[]? kids;

    public void Insert(string id, double px, double py)
    {
        if (kids != null) { Child(px, py).Insert(id, px, py); return; }
        points.Add((id, px, py));
        if (points.Count > Capacity && size > 1)                 // too crowded: split into four
        {
            double h = size / 2;
            kids = [new(x, y, h), new(x + h, y, h), new(x, y + h, h), new(x + h, y + h, h)];
            foreach (var p in points) Child(p.X, p.Y).Insert(p.Id, p.X, p.Y);
            points.Clear();
        }
    }

    QuadTree Child(double px, double py) =>
        kids![(px >= x + size / 2 ? 1 : 0) + (py >= y + size / 2 ? 2 : 0)];

    public int Query(double x1, double y1, double x2, double y2, List<string> found)
    {
        if (x2 < x || x1 >= x + size || y2 < y || y1 >= y + size) return 0;   // no overlap: skip it all
        int visited = 1;
        foreach (var p in points)
            if (p.X >= x1 && p.X <= x2 && p.Y >= y1 && p.Y <= y2) found.Add(p.Id);
        if (kids != null) foreach (var k in kids) visited += k.Query(x1, y1, x2, y2, found);
        return visited;
    }
}`, output: 'Found S2, S3, S4, S7\nVisited 7 squares' },
      { type: 'h2', text: 'Nearest neighbour: k-d trees' },
      { type: 'p', text: 'A **k-d tree** is a binary search tree for points: the root splits the points by x at the median, its children split by y, their children by x again, and so on. To find the **nearest** point, descend to the leaf where the query point would go, then walk back up, exploring the other side of a split only if the circle around the best distance so far crosses the splitting line. On typical data this is O(log n) per query. In very high dimensions (hundreds of features, as in AI embeddings) every split gets crossed, and approximate methods such as HNSW graphs take over.' },
      { type: 'h2', text: 'Objects with size: R-trees and BVH' },
      { type: 'p', text: 'Beams, pipes, rooms and parcels are not points. Wrap each object in an **axis-aligned bounding box** (AABB): its minimum and maximum x and y (and z). Two boxes overlap only if they overlap on every axis, a check of a few comparisons. If the boxes do not overlap, the objects certainly do not either; if they do, a precise (expensive) test decides.' },
      { type: 'code', title: 'BoundingBox.cs', code: cs`
var crane = new Box(10, 10, 30, 40);
var scaffold = new Box(25, 35, 50, 60);
var hut = new Box(60, 0, 80, 20);
Console.WriteLine(crane.Overlaps(scaffold));
Console.WriteLine(crane.Overlaps(hut));
Console.WriteLine(Box.Union(crane, scaffold));

record struct Box(double MinX, double MinY, double MaxX, double MaxY)
{
    public bool Overlaps(Box o) =>
        MinX <= o.MaxX && o.MinX <= MaxX && MinY <= o.MaxY && o.MinY <= MaxY;   // overlap on both axes

    public static Box Union(Box a, Box b) =>                                    // the box around both
        new(Math.Min(a.MinX, b.MinX), Math.Min(a.MinY, b.MinY), Math.Max(a.MaxX, b.MaxX), Math.Max(a.MaxY, b.MaxY));
}`, output: 'True\nFalse\nBox { MinX = 10, MinY = 10, MaxX = 50, MaxY = 60 }' },
      { type: 'p', text: 'A **bounding volume hierarchy** (BVH) groups nearby objects and puts a box around each group, then groups the groups, up to one box around everything. A query (a ray, a box, another object) tests the top box and descends only into children it touches. Game engines and ray tracers use BVHs for collisions and lighting; BIM software uses the same idea for clash detection between thousands of building elements. An **R-tree** is the database version of the same idea, kept balanced like a B-tree on disk: PostGIS spatial indexes are R-trees, while SQL Server uses a multi-level grid.' },
      { type: 'table', head: ['Index', 'Good for', 'Watch out for'], rows: [
        ['Uniform grid', 'Evenly spread, similar-sized, moving objects', 'Clusters; choosing the cell size'],
        ['Quadtree / octree', 'Uneven point data, zoomable maps', 'Deep trees when many points coincide'],
        ['k-d tree', 'Nearest-neighbour queries on static points', 'Many updates; very high dimensions'],
        ['R-tree', 'Rectangles and shapes on disk (databases, GIS)', 'More complex to implement'],
        ['BVH', 'Collisions, ray casting, clash detection', 'Rebuilding when many objects move']
      ] },
      { type: 'quiz', question: 'Most points are in one corner of the map. Which index adapts best?', options: ['A uniform grid with large cells', 'A quadtree, which subdivides only where points are crowded', 'A sorted list by x', 'A hash set'], answer: 1, explain: 'The quadtree splits crowded squares into smaller ones, so searches there stay selective; empty regions cost almost nothing.' },
      { type: 'quiz', question: 'Two bounding boxes do not overlap. What can you conclude about the objects inside them?', options: ['Nothing', 'They certainly do not overlap', 'They overlap', 'They touch at a corner'], answer: 1, explain: 'Each object lies inside its box, so separated boxes mean separated objects. Overlapping boxes only mean “maybe”.' },
      { type: 'exercise', task: 'Count the pairs of sensors closer than 10 m to each other, using a grid with 10 m cells so that each sensor is only compared with sensors in its own cell and the 8 neighbouring cells. For the given points, print the number of close pairs, the distance checks made and the number of all pairs.', hint: 'Two points closer than the cell size are always in the same or adjacent cells. Compare each pair once with `j > i`, and compare squared distances to avoid square roots.', solution: cs`
const double R = 10;
var pts = new (double X, double Y)[] { (1, 1), (4, 5), (12, 3), (25, 25), (27, 22), (40, 40), (9, 9), (45, 41) };

var grid = new Dictionary<(int, int), List<int>>();
for (int i = 0; i < pts.Length; i++)
{
    var key = ((int)Math.Floor(pts[i].X / R), (int)Math.Floor(pts[i].Y / R));
    if (!grid.TryGetValue(key, out var list)) grid[key] = list = new();
    list.Add(i);
}

int pairs = 0, checks = 0;
for (int i = 0; i < pts.Length; i++)
{
    int cx = (int)Math.Floor(pts[i].X / R), cy = (int)Math.Floor(pts[i].Y / R);
    for (int dx = -1; dx <= 1; dx++)
        for (int dy = -1; dy <= 1; dy++)
            if (grid.TryGetValue((cx + dx, cy + dy), out var list))
                foreach (int j in list)
                    if (j > i)                                    // each pair once
                    {
                        checks++;
                        double ex = pts[i].X - pts[j].X, ey = pts[i].Y - pts[j].Y;
                        if (ex * ex + ey * ey < R * R) pairs++;
                    }
}
Console.WriteLine($"{pairs} close pairs, {checks} checks, {pts.Length * (pts.Length - 1) / 2} pairs in total");`, output: '6 close pairs, 8 checks, 28 pairs in total' }
    ],
    keyPoints: [
      'Spatial indexes group objects by position so that whole regions can be skipped.',
      'A uniform grid is simplest and great for evenly spread objects; clusters defeat it.',
      'Quadtrees (octrees in 3D) subdivide only where data is dense; k-d trees answer nearest-neighbour queries.',
      'Objects with size go in bounding boxes; BVHs and R-trees are hierarchies of boxes for collisions, clash detection and databases.'
    ]
  },

  // ------------------------------------------------------------------ 48
  {
    slug: 'computational-geometry',
    title: 'Computational geometry basics',
    summary: 'The cross product as the one tool behind most geometry code: left or right turns, segment intersection, polygon area with the shoelace formula, point in polygon, and the convex hull in O(n log n).',
    minutes: 16,
    blocks: [
      { type: 'p', text: 'Site plans, CAD drawings, maps, games and robots all need geometry: do two walls cross, how big is this plot, is this point inside the boundary, what is the shortest fence around these pegs? Almost all of it is built on one operation, the **cross product**, and on one rule: **avoid floating-point division when you can**, because rounding errors make “exactly on the line” impossible to test.' },
      { type: 'h2', text: 'Left, right or straight: the cross product' },
      { type: 'p', text: 'For three points O, A, B, the cross product of the vectors OA and OB is `(A.X − O.X)·(B.Y − O.Y) − (A.Y − O.Y)·(B.X − O.X)`. Its **sign** says which way you turn when walking O → A → B: positive means left (counter-clockwise), negative means right (clockwise), zero means the three points are on one line. Its **size** is twice the area of the triangle OAB. With integer coordinates it is exact.' },
      { type: 'code', title: 'Orientation.cs', code: cs`
using Pt = (long X, long Y);

Pt a = (0, 0), b = (10, 0);                          // a wall from A to B
Console.WriteLine(Turn(a, b, (5, 4)));
Console.WriteLine(Turn(a, b, (5, -3)));
Console.WriteLine(Turn(a, b, (20, 0)));

static long Cross(Pt o, Pt a, Pt b) => (a.X - o.X) * (b.Y - o.Y) - (a.Y - o.Y) * (b.X - o.X);

static string Turn(Pt o, Pt a, Pt b) => Cross(o, a, b) switch
{
    > 0 => "left (counter-clockwise)",
    < 0 => "right (clockwise)",
    _ => "straight (collinear)"
};`, output: 'left (counter-clockwise)\nright (clockwise)\nstraight (collinear)' },
      { type: 'p', text: 'The `using Pt = (long X, long Y);` line (C# 12) gives the tuple type a short name. `long` keeps the products from overflowing for coordinates up to about a billion.' },
      { type: 'h2', text: 'Do two segments cross?' },
      { type: 'p', text: 'Segments P1P2 and Q1Q2 cross properly when P1 and P2 lie on **opposite sides** of the line through Q1Q2, and Q1 and Q2 lie on opposite sides of the line through P1P2: four cross products with opposite signs. If a cross product is zero, a point lies on the other line, and a simple bounding-box check tells whether it is actually on the segment (touching at an end, or overlapping on one line).' },
      { type: 'code', title: 'Intersect.cs', code: cs`
using Pt = (long X, long Y);

Console.WriteLine(Intersects((0, 0), (10, 10), (0, 10), (10, 0)));   // an X
Console.WriteLine(Intersects((0, 0), (10, 0), (0, 5), (10, 5)));     // parallel
Console.WriteLine(Intersects((0, 0), (10, 0), (10, 0), (10, 8)));    // touching at an end
Console.WriteLine(Intersects((0, 0), (4, 0), (6, 0), (10, 0)));      // same line, with a gap

static long Cross(Pt o, Pt a, Pt b) => (a.X - o.X) * (b.Y - o.Y) - (a.Y - o.Y) * (b.X - o.X);

static bool OnSegment(Pt p, Pt q, Pt r) =>           // r is collinear with pq: is it between them?
    Math.Min(p.X, q.X) <= r.X && r.X <= Math.Max(p.X, q.X) &&
    Math.Min(p.Y, q.Y) <= r.Y && r.Y <= Math.Max(p.Y, q.Y);

static bool Intersects(Pt p1, Pt p2, Pt q1, Pt q2)
{
    long d1 = Cross(q1, q2, p1), d2 = Cross(q1, q2, p2);
    long d3 = Cross(p1, p2, q1), d4 = Cross(p1, p2, q2);
    if (Math.Sign(d1) * Math.Sign(d2) < 0 && Math.Sign(d3) * Math.Sign(d4) < 0) return true;   // proper crossing
    return (d1 == 0 && OnSegment(q1, q2, p1)) || (d2 == 0 && OnSegment(q1, q2, p2))
        || (d3 == 0 && OnSegment(p1, p2, q1)) || (d4 == 0 && OnSegment(p1, p2, q2));
}`, output: 'True\nFalse\nTrue\nFalse' },
      { type: 'h2', text: 'Area of a polygon: the shoelace formula' },
      { type: 'p', text: 'List the corners of a polygon in order. For each edge from corner a to corner b add `a.X·b.Y − b.X·a.Y` (the cross product of the two position vectors). Half the absolute total is the area, for **any** simple polygon, convex or not. The sign of the total even tells you the direction: positive for counter-clockwise corners.' },
      { type: 'code', title: 'Area.cs', code: cs`
using Pt = (long X, long Y);

Pt[] plot = [(0, 0), (40, 0), (40, 20), (20, 20), (20, 50), (0, 50)];   // an L-shaped plot, metres
Console.WriteLine($"Area: {Area(plot)} square metres");

static double Area(Pt[] poly)
{
    long twice = 0;
    for (int i = 0; i < poly.Length; i++)
    {
        Pt a = poly[i], b = poly[(i + 1) % poly.Length];
        twice += a.X * b.Y - b.X * a.Y;              // doubled signed area of the triangle (origin, a, b)
    }
    return Math.Abs(twice) / 2.0;
}`, output: 'Area: 1400 square metres' },
      { type: 'h2', text: 'Is a point inside a polygon?' },
      { type: 'p', text: 'Cast a ray from the point to the right and count how many polygon edges it crosses. An odd count means inside, even means outside (every time the ray crosses the boundary it switches between inside and outside). This **ray casting** test is O(n) for n edges and works for concave shapes too.' },
      { type: 'code', title: 'PointInPolygon.cs', code: cs`
using Pt = (double X, double Y);

Pt[] plot = [(0, 0), (40, 0), (40, 20), (20, 20), (20, 50), (0, 50)];
foreach (Pt p in new Pt[] { (10, 40), (30, 40), (30, 10) })
    Console.WriteLine($"{p}: {(Inside(plot, p) ? "inside" : "outside")}");

static bool Inside(Pt[] poly, Pt p)
{
    bool inside = false;
    for (int i = 0, j = poly.Length - 1; i < poly.Length; j = i++)
    {
        Pt a = poly[i], b = poly[j];
        if ((a.Y > p.Y) != (b.Y > p.Y) &&                          // the edge spans the ray's height
            p.X < (b.X - a.X) * (p.Y - a.Y) / (b.Y - a.Y) + a.X)    // and crosses it to the right of p
            inside = !inside;
    }
    return inside;
}`, output: '(10, 40): inside\n(30, 40): outside\n(30, 10): inside' },
      { type: 'h2', text: 'The convex hull' },
      { type: 'p', text: 'The **convex hull** of a set of points is the smallest convex polygon containing them all: the shape of a rubber band stretched around pegs. It is the shortest fence, the outline of a point cloud, and the first step of many other algorithms (farthest pair, collision shapes, minimum bounding box).' },
      { type: 'p', text: '**Andrew’s monotone chain** sorts the points by x, then walks left to right building the lower edge. Each new point is checked against the last two points kept: if the turn is not a left turn, the last point lies inside the hull and is removed (perhaps several times). Then the same walk from right to left builds the upper edge.' },
      { type: 'widget', name: 'convex-hull' },
      { type: 'code', title: 'ConvexHull.cs', code: cs`
using Pt = (int X, int Y);

Pt[] pegs = [(30, 60), (70, 230), (120, 140), (150, 40), (160, 260), (200, 120),
             (230, 210), (260, 70), (270, 170), (100, 90), (190, 190), (60, 150)];
var hull = ConvexHull(pegs);
Console.WriteLine(string.Join(" ", hull));
Console.WriteLine($"{hull.Count} of {pegs.Length} pegs");

static long Cross(Pt o, Pt a, Pt b) => (long)(a.X - o.X) * (b.Y - o.Y) - (long)(a.Y - o.Y) * (b.X - o.X);

static List<Pt> ConvexHull(Pt[] points)
{
    var p = points.OrderBy(q => q.X).ThenBy(q => q.Y).ToArray();
    if (p.Length < 3) return p.ToList();
    var h = new List<Pt>();
    foreach (var q in p)                                         // lower edge, west to east
    {
        while (h.Count >= 2 && Cross(h[^2], h[^1], q) <= 0) h.RemoveAt(h.Count - 1);
        h.Add(q);
    }
    int lower = h.Count;
    for (int i = p.Length - 2; i >= 0; i--)                      // upper edge, east to west
    {
        while (h.Count > lower && Cross(h[^2], h[^1], p[i]) <= 0) h.RemoveAt(h.Count - 1);
        h.Add(p[i]);
    }
    h.RemoveAt(h.Count - 1);                                     // the first point came round again
    return h;
}`, output: '(30, 60) (150, 40) (260, 70) (270, 170) (230, 210) (160, 260) (70, 230)\n7 of 12 pegs' },
      { type: 'p', text: 'Sorting costs O(n log n). In the walk every point is added once and removed at most once, so it is O(n). The `<= 0` removes collinear points too; use `< 0` to keep them on the fence.' },
      { type: 'table', head: ['Problem', 'Tool', 'Time'], rows: [
        ['Left or right turn', 'Cross product sign', 'O(1)'],
        ['Do two segments cross?', 'Four cross products', 'O(1)'],
        ['Polygon area', 'Shoelace formula', 'O(n)'],
        ['Point in polygon', 'Ray casting', 'O(n)'],
        ['Convex hull', 'Monotone chain', 'O(n log n)'],
        ['Any two of n segments cross?', 'Sweep line (Bentley-Ottmann)', 'O((n + k) log n)'],
        ['Closest pair of points', 'Divide and conquer, or a grid', 'O(n log n)']
      ] },
      { type: 'note', kind: 'warn', text: 'With `double` coordinates, a point that should be exactly on a line usually gives a cross product like 1e-15. Use integers (millimetres instead of metres) when you can; otherwise compare with a small tolerance, `Math.Abs(c) < 1e-9`, chosen to suit your units.' },
      { type: 'quiz', question: 'The cross product for O → A → B is −12. What does it tell you?', options: ['The points are collinear', 'Walking O → A → B turns right (clockwise), and triangle OAB has area 6', 'The turn is left, area 12', 'A is closer to O than B'], answer: 1, explain: 'Negative means clockwise. The absolute value is twice the triangle’s area.' },
      { type: 'quiz', question: 'A ray from a point crosses the polygon boundary 4 times. Where is the point?', options: ['Inside', 'Outside', 'On the boundary', 'Cannot tell'], answer: 1, explain: 'Each crossing toggles inside/outside. An even number of crossings means the ray started outside.' },
      { type: 'exercise', task: 'Write `IsConvex` for a polygon given in order: it is convex when all turns along the boundary go the same way. The square should print `True`, the L-shaped plot `False`.', hint: 'Compute the cross product at every corner (corner i, i + 1, i + 2, wrapping around). Convex means you never see both a positive and a negative value.', solution: cs`
using Pt = (long X, long Y);

Pt[] square = [(0, 0), (10, 0), (10, 10), (0, 10)];
Pt[] plot = [(0, 0), (40, 0), (40, 20), (20, 20), (20, 50), (0, 50)];
Console.WriteLine(IsConvex(square));
Console.WriteLine(IsConvex(plot));

static bool IsConvex(Pt[] poly)
{
    bool left = false, right = false;
    for (int i = 0; i < poly.Length; i++)
    {
        Pt a = poly[i], b = poly[(i + 1) % poly.Length], c = poly[(i + 2) % poly.Length];
        long cr = (b.X - a.X) * (c.Y - a.Y) - (b.Y - a.Y) * (c.X - a.X);
        if (cr > 0) left = true;
        if (cr < 0) right = true;
    }
    return !(left && right);                         // every turn the same way
}`, output: 'True\nFalse' }
    ],
    keyPoints: [
      'The cross product’s sign gives the turn direction (left, right, straight); its size is twice a triangle’s area.',
      'Segment intersection, polygon area (shoelace) and point-in-polygon (ray casting) are all built on it.',
      'Andrew’s monotone chain finds the convex hull in O(n log n): sort, then pop points that do not turn left.',
      'Prefer integer coordinates; with doubles, compare against a tolerance instead of zero.'
    ]
  },

  // ------------------------------------------------------------------ 49
  {
    slug: 'np-complete',
    title: 'Hard problems: P, NP and approximation',
    summary: 'Why some problems have no known fast algorithm: P, NP and NP-completeness explained without the jargon, how to recognise a hard problem, and what to do instead: exact search for small inputs, pseudo-polynomial DP, approximation and heuristics.',
    minutes: 16,
    blocks: [
      { type: 'p', text: 'Every algorithm so far ran in **polynomial time**: O(n), O(n log n), O(n³). Some problems that look just as innocent have no known polynomial algorithm at all. Recognising them saves you from hunting for a clever solution that probably does not exist, and points you to the techniques that work instead.' },
      { type: 'table', head: ['Easy (polynomial)', 'Looks similar, but hard'], rows: [
        ['Shortest path between two places', 'Longest simple path'],
        ['Minimum spanning tree (connect all sites cheaply)', 'Travelling salesman (visit all sites in one round)'],
        ['Euler circuit (use every road once)', 'Hamiltonian cycle (visit every place once)'],
        ['Fractional knapsack', '0/1 knapsack, subset sum'],
        ['Colouring a map with 2 colours', 'Colouring with 3 colours'],
        ['2-SAT (rules with 2 conditions)', '3-SAT (rules with 3 conditions)']
      ] },
      { type: 'h2', text: 'P and NP in plain words' },
      { type: 'ul', items: [
        '**P** is the class of yes/no problems that can be **solved** in polynomial time. Is there a route of at most 40 km from the yard to the site? Dijkstra answers that.',
        '**NP** is the class of yes/no problems where a proposed answer can be **checked** in polynomial time. Is there a round trip through all 20 sites of at most 100 km? Hard to find, but if someone hands you a round, you can add up its length in O(n) and check.',
        'Every problem in P is in NP (if you can solve it, you can check an answer). The great open question, **P = NP?**, asks whether every quickly checkable problem is also quickly solvable. Most researchers believe not, and a proof either way is worth a US$1 million Millennium Prize.'
      ] },
      { type: 'code', title: 'CheckVsSearch.cs', code: cs`
int[] loads = { 34, 4, 12, 5, 2, 27, 19, 8 };        // can a truck carry exactly 50?
int target = 50;

int[] claim = { 0, 1, 2 };                           // someone claims: 34 + 4 + 12
Console.WriteLine($"Claim checked: {claim.Sum(i => loads[i]) == target}");   // O(n)

int solutions = 0;
for (int mask = 0; mask < 1 << loads.Length; mask++) // finding one ourselves: every subset, 2^n
{
    int sum = 0;
    for (int i = 0; i < loads.Length; i++)
        if ((mask & (1 << i)) != 0) sum += loads[i];
    if (sum == target) solutions++;
}
Console.WriteLine($"Searched {1 << loads.Length} subsets, {solutions} hit {target}");`, output: 'Claim checked: True\nSearched 256 subsets, 4 hit 50' },
      { type: 'p', text: 'Checking took 3 additions. Searching took 256 subsets for 8 loads; for 60 loads it would be 2⁶⁰ ≈ 10¹⁸. That gap between checking and finding is the heart of NP.' },
      { type: 'h2', text: 'NP-complete: the hardest of them' },
      { type: 'p', text: 'A problem is **NP-complete** if it is in NP and every other NP problem can be **reduced** to it: translated in polynomial time into an instance of it. So a fast algorithm for any single NP-complete problem would give fast algorithms for all of them. Thousands are known, among them travelling salesman (the yes/no version), subset sum, 0/1 knapsack, graph colouring, scheduling with deadlines, Sudoku on n × n boards, and SAT, the first one proved (Cook, 1971). Problems at least this hard but not necessarily yes/no, such as “find the **shortest** round”, are called **NP-hard**.' },
      { type: 'note', kind: 'tip', text: 'Signs that a problem may be NP-hard: it asks for the best **subset**, **order** or **assignment** among exponentially many, and small changes to one choice affect all the others. If a problem smells like travelling salesman, knapsack or colouring in disguise, it probably is.' },
      { type: 'h2', text: 'Exact for small n, good enough for large n' },
      { type: 'p', text: 'Here is travelling salesman with real numbers. The exact method tries every round; the greedy nearest-neighbour method and the 2-opt local search are approximations. Add sites and watch the exact work explode while the approximations stay close:' },
      { type: 'widget', name: 'tsp-explorer' },
      { type: 'p', text: 'When a problem is NP-hard, you have several practical options:' },
      { type: 'ol', items: [
        '**Small inputs: exact search.** Brute force or backtracking with pruning handles n ≤ 10–12. Bitmask DP (Held-Karp for TSP) is O(n²·2ⁿ), good up to about 20–25.',
        '**Small numbers: pseudo-polynomial DP.** 0/1 knapsack is O(n·W): fast when the capacity W is a few thousand, even though it is exponential in the number of digits of W.',
        '**Approximation with a guarantee.** Some algorithms promise to be within a factor of the optimum: the vertex cover method below is at most 2× optimal; Christofides’ algorithm for TSP with real distances is at most 1.5×.',
        '**Heuristics and local search.** Greedy construction plus improvement (2-opt, simulated annealing, genetic algorithms) gives excellent answers in practice with no guarantee.',
        '**Special structure.** The general problem is hard, but yours may not be: colouring is easy on trees, many problems are polynomial on graphs with small treewidth.',
        '**Solvers.** SAT solvers and integer linear programming solvers (such as Google OR-Tools) solve industrial instances with thousands of variables.'
      ] },
      { type: 'code', title: 'HeldKarp.cs', code: cs`
int[,] d =                                          // driving minutes between the yard (0) and 4 sites
{
    { 0, 12, 10, 19, 8 },
    { 12, 0, 3, 7, 2 },
    { 10, 3, 0, 6, 20 },
    { 19, 7, 6, 0, 4 },
    { 8, 2, 20, 4, 0 }
};
int n = d.GetLength(0), full = 1 << n, inf = int.MaxValue / 2;
var best = new int[full, n];                        // best[set, j]: shortest path from 0 visiting set, ending at j
for (int s = 0; s < full; s++) for (int j = 0; j < n; j++) best[s, j] = inf;
best[1, 0] = 0;

for (int s = 1; s < full; s += 2)                   // every set containing the yard (bit 0)
    for (int j = 0; j < n; j++)
    {
        if ((s & (1 << j)) == 0 || best[s, j] == inf) continue;
        for (int k = 0; k < n; k++)
            if ((s & (1 << k)) == 0)                // extend the path to a new site k
            {
                int t = s | (1 << k);
                best[t, k] = Math.Min(best[t, k], best[s, j] + d[j, k]);
            }
    }

int answer = inf;
for (int j = 1; j < n; j++) answer = Math.Min(answer, best[full - 1, j] + d[j, 0]);
Console.WriteLine($"Shortest round: {answer} minutes");
Console.WriteLine($"DP states: {full * n}, brute-force orders: {Factorial(n - 1)}");

static long Factorial(int k) => k <= 1 ? 1 : k * Factorial(k - 1);`, output: 'Shortest round: 32 minutes\nDP states: 160, brute-force orders: 24' },
      { type: 'p', text: 'For 5 places brute force is smaller, but the growth is what matters: at n = 20, brute force needs 19! ≈ 1.2 × 10¹⁷ orders while Held-Karp needs about 20² · 2²⁰ ≈ 4 × 10⁸ steps. Still exponential, but feasible.' },
      { type: 'h2', text: 'An approximation with a guarantee' },
      { type: 'p', text: 'A **vertex cover** picks junctions so that every corridor has a guard at one end or the other; we want as few guards as possible (NP-hard). The simple rule “find a corridor with no guard and put guards at **both** ends” is never more than twice the optimum: the corridors it picks share no ends, and any cover needs at least one guard on each of them.' },
      { type: 'code', title: 'VertexCover.cs', code: cs`
var corridors = new[] { ("A", "B"), ("A", "C"), ("B", "C"), ("B", "D"), ("C", "E"), ("D", "E"), ("D", "F") };

var cover = new HashSet<string>();
foreach (var (u, v) in corridors)
    if (!cover.Contains(u) && !cover.Contains(v)) { cover.Add(u); cover.Add(v); }   // guard both ends
Console.WriteLine($"2-approximation: {string.Join(", ", cover.Order())} ({cover.Count})");

var junctions = corridors.SelectMany(c => new[] { c.Item1, c.Item2 }).Distinct().ToArray();
int best = junctions.Length;
string bestSet = "";
for (int mask = 0; mask < 1 << junctions.Length; mask++)   // exact: try every subset
{
    var set = junctions.Where((_, i) => (mask & (1 << i)) != 0).ToHashSet();
    if (set.Count < best && corridors.All(c => set.Contains(c.Item1) || set.Contains(c.Item2)))
    {
        best = set.Count;
        bestSet = string.Join(", ", set.Order());
    }
}
Console.WriteLine($"Optimal: {bestSet} ({best})");`, output: '2-approximation: A, B, C, D, E, F (6)\nOptimal: A, C, D (3)' },
      { type: 'p', text: 'Here the approximation hits its worst case exactly: 6 guards against an optimum of 3. Usually it does better, but the guarantee is what lets you trust it on inputs too large to check.' },
      { type: 'quiz', question: 'What does it mean that a problem is in NP?', options: ['It cannot be solved by any computer', 'A proposed answer can be checked in polynomial time', 'It needs exponential time', 'It is not polynomial'], answer: 1, explain: 'NP is about checking, not solving. Every problem in P is also in NP.' },
      { type: 'quiz', question: 'Your scheduling problem turns out to be NP-hard, and real inputs have 2,000 jobs. What is the sensible approach?', options: ['Brute force on a faster computer', 'Give up', 'A heuristic or local search, an approximation algorithm, or an optimisation solver', 'Binary search'], answer: 2, explain: 'Exact search is hopeless at that size. Practical tools give near-optimal answers quickly, sometimes with a proven bound.' },
      { type: 'exercise', task: 'Run the **nearest-neighbour** heuristic on the distance matrix from HeldKarp.cs: start at the yard (0), always drive to the closest unvisited place, and finally return to the yard. Print the route and its length, and compare with the optimum of 32.', hint: 'Keep a `visited` array. At each step scan all places for the unvisited one with the smallest `d[here, k]`.', solution: cs`
int[,] d =
{
    { 0, 12, 10, 19, 8 },
    { 12, 0, 3, 7, 2 },
    { 10, 3, 0, 6, 20 },
    { 19, 7, 6, 0, 4 },
    { 8, 2, 20, 4, 0 }
};
int n = d.GetLength(0), here = 0, total = 0;
var visited = new bool[n];
visited[0] = true;
var route = new List<int> { 0 };
for (int step = 1; step < n; step++)
{
    int next = -1;
    for (int k = 0; k < n; k++)
        if (!visited[k] && (next < 0 || d[here, k] < d[here, next])) next = k;
    total += d[here, next];
    visited[next] = true;
    route.Add(next);
    here = next;
}
total += d[here, 0];                                 // drive back to the yard
route.Add(0);
Console.WriteLine($"{string.Join(" -> ", route)}: {total} minutes (optimum 32)");`, output: '0 -> 4 -> 1 -> 2 -> 3 -> 0: 38 minutes (optimum 32)' }
    ],
    keyPoints: [
      'P: solvable in polynomial time. NP: answers checkable in polynomial time. Whether P = NP is unknown.',
      'NP-complete problems (TSP, knapsack, subset sum, colouring, SAT) are equally hard: a fast algorithm for one would solve all.',
      'Recognise them by “best subset, order or assignment” among exponentially many options.',
      'In practice: exact search for small n, pseudo-polynomial DP, approximations with guarantees, heuristics and solvers.'
    ]
  },

  // ------------------------------------------------------------------ 50
  {
    slug: 'problem-solving-strategy',
    title: 'How to solve any DSA problem',
    summary: 'A repeatable method for unfamiliar problems: understand it, let the constraints choose the complexity, start from brute force, spot the pattern, optimise, test with edge cases and a stress test, and explain your reasoning.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'You now know the main data structures and algorithms. The last skill is choosing among them when a problem does not say which one it wants. Strong problem solvers are not people who have memorised every trick; they follow a method that turns “I have no idea” into a working, tested solution.' },
      { type: 'h2', text: 'The method' },
      { type: 'ol', items: [
        '**Understand.** Restate the problem in your own words. Work through the examples by hand. Ask what the input and output are exactly, and what happens in edge cases (empty input, one element, duplicates, negative numbers).',
        '**Read the constraints.** The input size tells you the complexity you need (see the widget). n ≤ 20 invites 2ⁿ; n ≤ 10⁵ demands O(n log n).',
        '**Brute force first.** Write down the obvious solution and its complexity, even if it is too slow. It proves you understand the problem, and it becomes your test oracle later.',
        '**Find the bottleneck and the pattern.** What does the brute force repeat? Which clue in the wording points to a known technique?',
        '**Optimise.** Precompute (prefix sums, sorting), trade memory for time (hash maps, memoisation), or change the approach (greedy, DP, graph search).',
        '**Code it cleanly.** Good names, small functions, no cleverness you cannot explain.',
        '**Test.** The examples, then edge cases, then a stress test against the brute force.',
        '**Analyse.** State the final time and space complexity, and why it is correct.'
      ] },
      { type: 'widget', name: 'pattern-picker' },
      { type: 'h2', text: 'Clues in the wording' },
      { type: 'table', head: ['If the problem says…', 'Think of'], rows: [
        ['Sorted array, “first / last position”, “minimum value that works”', 'Binary search (on the index or on the answer)'],
        ['Contiguous subarray or substring, “longest / shortest window”', 'Sliding window, prefix sums'],
        ['Pair or triple with a target sum', 'Hash map, or sort + two pointers'],
        ['“Seen before?”, counting, grouping', 'Hash set / dictionary'],
        ['Top k, k-th largest, merge sorted lists, running median', 'Heap'],
        ['Matching brackets, “next greater element”, undo', 'Stack (monotonic stack)'],
        ['Shortest path, fewest steps (equal costs)', 'BFS'],
        ['Shortest path with weights', 'Dijkstra (Bellman-Ford if negative)'],
        ['Dependencies, prerequisites, build order', 'Topological sort'],
        ['Groups that merge, “connected?”', 'Union-find'],
        ['“Number of ways”, “minimum cost”, choices that overlap', 'Dynamic programming'],
        ['“All combinations / permutations / arrangements”', 'Backtracking'],
        ['Prefixes, autocomplete, many words', 'Trie'],
        ['Range queries with updates', 'Fenwick or segment tree']
      ] },
      { type: 'h2', text: 'A worked example' },
      { type: 'p', text: '“Given the weights of n loads and a crane limit, find two loads that together weigh exactly the limit.” Constraints: n ≤ 10⁵, so O(n²) = 10¹⁰ is too slow and we need about O(n log n). Brute force checks every pair. The bottleneck is the inner loop asking “is there a partner for this load?”. That question is a lookup, so either sort and use two pointers, or remember what we have seen in a hash set:' },
      { type: 'code', title: 'ThreeVersions.cs', code: cs`
int[] loads = { 14, 3, 9, 21, 6, 11 };
int limit = 20;
Console.WriteLine(BruteForce(loads, limit));
Console.WriteLine(SortedPointers(loads, limit));
Console.WriteLine(HashLookup(loads, limit));

static (int, int)? BruteForce(int[] a, int target)          // O(n^2): every pair
{
    for (int i = 0; i < a.Length; i++)
        for (int j = i + 1; j < a.Length; j++)
            if (a[i] + a[j] == target) return (a[i], a[j]);
    return null;
}

static (int, int)? SortedPointers(int[] a, int target)      // O(n log n): sort, then close in from both ends
{
    var s = a.Order().ToArray();
    for (int l = 0, r = s.Length - 1; l < r; )
    {
        int sum = s[l] + s[r];
        if (sum == target) return (s[l], s[r]);
        if (sum < target) l++; else r--;
    }
    return null;
}

static (int, int)? HashLookup(int[] a, int target)          // O(n): remember what we have seen
{
    var seen = new HashSet<int>();
    foreach (int x in a)
    {
        if (seen.Contains(target - x)) return (target - x, x);
        seen.Add(x);
    }
    return null;
}`, output: '(14, 6)\n(6, 14)\n(14, 6)' },
      { type: 'p', text: 'Both fast versions are correct; which is better depends on the follow-up. Need the original positions? The hash version keeps them easily. Little extra memory allowed? Sort in place and use two pointers. Saying this out loud is part of a good answer.' },
      { type: 'h2', text: 'Test like you mean it' },
      { type: 'ul', items: [
        '**Edge cases:** empty input, a single element, all elements equal, already sorted, reverse sorted, negative numbers and zero, the largest allowed values (overflow!), no valid answer.',
        '**Off-by-one:** check the first and last positions, inclusive versus exclusive ranges, loops that should run zero times.',
        '**Stress test:** generate thousands of small random inputs, run the slow-but-obvious solution and the fast one, and stop at the first difference. It finds bugs that no hand-written example does.'
      ] },
      { type: 'code', title: 'StressTest.cs', code: cs`
var rng = new Random(42);
for (int test = 1; test <= 1000; test++)
{
    int[] a = Enumerable.Range(0, rng.Next(1, 12)).Select(_ => rng.Next(-20, 21)).ToArray();
    int slow = SlowMaxSubarray(a), fast = Kadane(a);
    if (slow != fast)
    {
        Console.WriteLine($"Mismatch on [{string.Join(", ", a)}]: {slow} vs {fast}");
        return;
    }
}
Console.WriteLine("All 1000 random tests agree");

static int SlowMaxSubarray(int[] a)                 // obviously correct, O(n^2)
{
    int best = int.MinValue;
    for (int i = 0; i < a.Length; i++)
    {
        int sum = 0;
        for (int j = i; j < a.Length; j++) { sum += a[j]; best = Math.Max(best, sum); }
    }
    return best;
}

static int Kadane(int[] a)                          // the fast one we want to trust, O(n)
{
    int best = a[0], here = a[0];
    for (int i = 1; i < a.Length; i++)
    {
        here = Math.Max(a[i], here + a[i]);
        best = Math.Max(best, here);
    }
    return best;
}`, output: 'All 1000 random tests agree' },
      { type: 'note', kind: 'tip', text: 'Keep the random inputs **small** (a handful of elements, small values). When a stress test fails, a 4-element counterexample is easy to trace by hand; a 10,000-element one is not. Fix the seed so the failure can be reproduced.' },
      { type: 'h2', text: 'When you are stuck' },
      { type: 'ul', items: [
        'Solve a smaller or simpler version: n = 1, 2, 3; one dimension instead of two; no constraint X.',
        'Draw it: the array with pointers, the graph, the recursion tree, the DP table.',
        'Ask what you would precompute if you could: sorted order, prefix sums, positions in a hash map.',
        'Reverse it: work backwards from the goal, or ask for the complement (“count the bad ones and subtract”).',
        'Binary search on the answer: if “can it be done with X?” is easy to check and gets easier as X grows, search for the smallest X.',
        'Model it as a graph: states are nodes, moves are edges, and the answer is a shortest path.'
      ] },
      { type: 'h2', text: 'Where to go from here' },
      { type: 'p', text: 'Practise little and often: one or two problems a day beats a weekend marathon. After solving a problem, read other solutions and note the technique in your own words. Revisit problems you failed a week later and solve them from scratch. Over time the clue table above becomes instinct, and new problems start to look like old friends.' },
      { type: 'quiz', question: 'A problem allows n ≤ 18. What does that suggest?', options: ['An O(log n) formula', 'An exponential approach such as trying all 2ⁿ subsets or bitmask DP is intended', 'It must be O(n)', 'Nothing: constraints are irrelevant'], answer: 1, explain: '2¹⁸ ≈ 260,000, so trying every subset is fast. Such small limits are a deliberate hint.' },
      { type: 'quiz', question: 'Why write a brute-force solution even when it is too slow?', options: ['It is required by the compiler', 'It shows you understand the problem, reveals the bottleneck, and serves as a test oracle for the fast solution', 'It is always fast enough', 'To use more memory'], answer: 1, explain: 'The brute force is the reference answer in a stress test, and seeing what it repeats is often how you find the optimisation.' },
      { type: 'exercise', task: 'Daily concrete output (all positive) is `{ 4, 2, 7, 1, 5 }`. For each target in `{ 5, 13, 20 }`, find the first day (0-based) on which the **running total** reaches the target, or −1 if it never does: `1 2 -1`. There may be 100,000 days and 100,000 targets, so each answer must be fast. Name the techniques you combine.', hint: 'Running totals of positive values form an increasing prefix-sum array, so each question is a lower-bound binary search: O(n) once, then O(log n) per target.', solution: cs`
int[] output = { 4, 2, 7, 1, 5 };
int[] targets = { 5, 13, 20 };

var prefix = new int[output.Length];                // prefix sums: increasing, because outputs are positive
for (int i = 0; i < output.Length; i++) prefix[i] = output[i] + (i > 0 ? prefix[i - 1] : 0);
Console.WriteLine(string.Join(" ", targets.Select(t => FirstDay(prefix, t))));

static int FirstDay(int[] prefix, int target)       // lower-bound binary search
{
    int lo = 0, hi = prefix.Length;                 // hi = "not found"
    while (lo < hi)
    {
        int mid = (lo + hi) / 2;
        if (prefix[mid] >= target) hi = mid; else lo = mid + 1;
    }
    return lo == prefix.Length ? -1 : lo;
}`, output: '1 2 -1' }
    ],
    keyPoints: [
      'Follow a method: understand, read the constraints, brute force, find the pattern, optimise, code, test, analyse.',
      'Input limits reveal the intended complexity; the wording reveals the technique.',
      'A brute-force solution is your test oracle: stress-test the fast solution against it on small random inputs.',
      'When stuck: simplify, draw, precompute, reverse, binary search on the answer, or model it as a graph.'
    ]
  }
];
