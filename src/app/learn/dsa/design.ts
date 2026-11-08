import { Lesson } from '../learn.types';
import { cs } from '../csharp/cs';

export const DESIGN: Lesson[] = [
  // ------------------------------------------------------------------ 39
  {
    slug: 'greedy',
    title: 'Greedy algorithms',
    summary: 'Build a solution one locally best choice at a time, learn when that is provably optimal (interval scheduling, coins, fractional knapsack) and when it fails, and how to argue that a greedy rule is correct.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'A **greedy algorithm** builds its answer step by step, and at each step takes the choice that looks best **right now**, without ever going back. It is usually simple and fast. The hard part is not writing it but knowing whether it is **correct**: for some problems the locally best choice always leads to the best overall answer, and for others it leads you astray.' },
      { type: 'p', text: 'You have already met three greedy algorithms: Dijkstra (always finalise the closest place), Prim and Kruskal (always take the cheapest safe edge). Each came with a reason why greedy works there.' },
      { type: 'h2', text: 'Scheduling: which rule is right?' },
      { type: 'p', text: 'One tower crane, many booking requests, each with a start and end time. Accept as many as possible without overlaps. Three greedy rules sound reasonable: earliest start, shortest booking, earliest finish. Only one is always optimal. Try them:' },
      { type: 'widget', name: 'interval-scheduler' },
      { type: 'p', text: '**Earliest finish** wins, and we can prove it with an **exchange argument**: take any optimal schedule. Its first booking ends no earlier than the booking that finishes first overall, so swapping it for that one still leaves a valid schedule of the same size. Repeat for the rest. The greedy choice is never worse than what an optimal answer does.' },
      { type: 'code', title: 'IntervalScheduling.cs', code: cs`
var bookings = new List<(string Id, int Start, int End)>
{
    ("A", 6, 9), ("B", 9, 12), ("C", 8, 10), ("D", 12, 15),
    ("E", 15, 18), ("F", 14, 16), ("G", 5, 18), ("H", 10, 11)
};

var chosen = new List<string>();
int freeFrom = int.MinValue;
foreach (var b in bookings.OrderBy(b => b.End))      // earliest finish first
{
    if (b.Start < freeFrom) continue;                 // clashes with the last one taken
    chosen.Add(b.Id);
    freeFrom = b.End;
}
Console.WriteLine($"{chosen.Count}: {string.Join(", ", chosen)}");`, output: '4: A, H, D, E' },
      { type: 'p', text: 'Sorting is O(n log n); the scan is O(n). Trying every subset of bookings would be O(2ⁿ).' },
      { type: 'h2', text: 'Making change' },
      { type: 'p', text: 'To pay an amount with the fewest coins, the greedy rule is “always use the biggest coin that fits”. For normal currencies (1, 2, 5, 10, 20, …) this is optimal. For other coin systems it is not:' },
      { type: 'code', title: 'GreedyChange.cs', code: cs`
Console.WriteLine(string.Join(" + ", GreedyChange(48, new[] { 20, 10, 5, 2, 1 })));
Console.WriteLine(string.Join(" + ", GreedyChange(6, new[] { 4, 3, 1 })));   // 3 + 3 is better

static List<int> GreedyChange(int amount, int[] coinsLargestFirst)
{
    var used = new List<int>();
    foreach (int c in coinsLargestFirst)
        while (amount >= c) { used.Add(c); amount -= c; }
    return used;
}`, output: '20 + 20 + 5 + 2 + 1\n4 + 1 + 1' },
      { type: 'p', text: 'With coins 4, 3 and 1, greedy pays 6 as 4 + 1 + 1 (three coins), but 3 + 3 needs only two. Taking the 4 felt best but blocked the better answer. Problems like this need **dynamic programming** (later in this module), which considers every option without trying every combination.' },
      { type: 'h2', text: 'Fractional knapsack' },
      { type: 'p', text: 'A truck can carry 50 kg. Materials have a value and a weight, and you may take **part** of any material. Greedy by **value per kilogram** is optimal: fill up with the most valuable material per kg first. (If items cannot be split, the “0/1 knapsack”, greedy fails and you need DP again.)' },
      { type: 'code', title: 'FractionalKnapsack.cs', code: cs`
var items = new[]
{
    (Name: "Steel", Value: 60, Weight: 10),
    (Name: "Copper", Value: 100, Weight: 20),
    (Name: "Timber", Value: 120, Weight: 30)
};

double capacity = 50, total = 0;
foreach (var it in items.OrderByDescending(i => (double)i.Value / i.Weight))   // best value per kg first
{
    double take = Math.Min(it.Weight, capacity);
    total += take * it.Value / it.Weight;
    capacity -= take;
    Console.WriteLine($"{it.Name}: {take} of {it.Weight} kg");
    if (capacity == 0) break;
}
Console.WriteLine($"Value: {total}");`, output: 'Steel: 10 of 10 kg\nCopper: 20 of 20 kg\nTimber: 20 of 30 kg\nValue: 240' },
      { type: 'h2', text: 'How to approach a greedy idea' },
      { type: 'ol', items: [
        'State the greedy rule precisely (“sort by end time, take whatever fits”).',
        'Hunt for a counterexample with small inputs, as the widget does for earliest start and shortest first. Most wrong greedy rules fail on 3 or 4 items.',
        'If you cannot break it, argue it: an exchange argument (“swapping an optimal choice for the greedy one never makes things worse”) is the usual proof.',
        'If it does break, think about dynamic programming.'
      ] },
      { type: 'table', head: ['Problem', 'Greedy rule', 'Optimal?'], rows: [
        ['Most non-overlapping bookings', 'Earliest finish', 'Yes'],
        ['Fewest coins, standard currency', 'Biggest coin first', 'Yes'],
        ['Fewest coins, any coin set', 'Biggest coin first', 'No: use DP'],
        ['Fractional knapsack', 'Best value per weight', 'Yes'],
        ['0/1 knapsack', 'Best value per weight', 'No: use DP'],
        ['Minimum spanning tree', 'Cheapest safe edge', 'Yes'],
        ['Compression codes (Huffman)', 'Merge the two rarest symbols', 'Yes']
      ] },
      { type: 'quiz', question: 'Why does “earliest start” fail for interval scheduling?', options: ['It is too slow', 'A booking that starts early may last very long and block many others', 'It cannot handle ties', 'It needs the bookings sorted by end'], answer: 1, explain: 'In the widget, the all-day hire starts first and blocks everything, giving 1 instead of 4.' },
      { type: 'quiz', question: 'Coins are 1, 5 and 6. What does greedy pay for 10, and what is optimal?', options: ['6 + 1 + 1 + 1 + 1 (5 coins); optimal 5 + 5 (2 coins)', '5 + 5 for both', '6 + 4', 'Greedy is optimal here'], answer: 0, explain: 'Greedy takes the 6 first and then needs four 1s. Two 5s would do.' },
      { type: 'exercise', task: 'Each truck trip can carry at most two loads, with a total weight up to `limit`. Find the fewest trips for all loads. `{ 3, 2, 2, 1 }` with limit 3 → 3 trips; `{ 3, 5, 3, 4 }` with limit 5 → 4 trips. Use a greedy rule.', hint: 'Sort the loads. The heaviest remaining load must go on some trip; pair it with the lightest remaining load if they fit together, otherwise it goes alone. Two pointers make this O(n log n).', solution: cs`
Console.WriteLine(MinTrips(new[] { 3, 2, 2, 1 }, 3));
Console.WriteLine(MinTrips(new[] { 3, 5, 3, 4 }, 5));

static int MinTrips(int[] loads, int limit)
{
    var w = loads.OrderBy(x => x).ToArray();
    int light = 0, heavy = w.Length - 1, trips = 0;
    while (light <= heavy)
    {
        if (w[light] + w[heavy] <= limit) light++;   // the lightest rides along
        heavy--;                                      // the heaviest always goes now
        trips++;
    }
    return trips;
}`, output: '3\n4' }
    ],
    keyPoints: [
      'Greedy algorithms take the locally best choice and never undo it: simple and fast.',
      'They are only correct for some problems; test small counterexamples first.',
      'Prove a greedy rule with an exchange argument: the greedy choice is never worse than an optimal one.',
      'Earliest finish, standard coins, fractional knapsack, MST and Dijkstra are greedy successes; general coin sets and 0/1 knapsack need DP.'
    ]
  },

  // ------------------------------------------------------------------ 40
  {
    slug: 'divide-and-conquer',
    title: 'Divide and conquer',
    summary: 'Split a problem into smaller copies of itself, solve them recursively and combine the results: fast exponentiation, maximum subarray, counting inversions, the master theorem, and parallelism.',
    minutes: 15,
    blocks: [
      { type: 'p', text: '**Divide and conquer** solves a problem in three moves: **divide** it into smaller problems of the same kind, **conquer** each one recursively (tiny ones are solved directly), and **combine** their answers. You have seen it already: binary search, merge sort and quick sort are all divide and conquer.' },
      { type: 'table', head: ['Algorithm', 'Divide', 'Conquer', 'Combine'], rows: [
        ['Binary search', 'Look at the middle', 'One half', 'Nothing'],
        ['Merge sort', 'Split in half', 'Both halves', 'Merge: O(n)'],
        ['Quick sort', 'Partition around a pivot: O(n)', 'Both sides', 'Nothing'],
        ['Fast power', 'Halve the exponent', 'One half', 'Square it']
      ] },
      { type: 'h2', text: 'Fast exponentiation' },
      { type: 'p', text: 'Computing xⁿ by multiplying n times is O(n). But x¹³ = x⁶ · x⁶ · x, and x⁶ = x³ · x³. Solving the half-size problem once and squaring it gives **O(log n)** multiplications. With a modulo after each step, the numbers stay small; this is the heart of RSA encryption.' },
      { type: 'code', title: 'FastPower.cs', code: cs`
Console.WriteLine(Power(3, 13));
Console.WriteLine(Power(2, 62));
Console.WriteLine(ModPow(7, 1_000_000_000, 1_000_000_007));

static long Power(long x, int n)
{
    if (n == 0) return 1;
    long half = Power(x, n / 2);                        // one problem of half the size
    return n % 2 == 0 ? half * half : half * half * x;  // combine
}

static long ModPow(long x, long n, long mod)            // the same idea, as a loop
{
    long result = 1;
    x %= mod;
    while (n > 0)
    {
        if ((n & 1) == 1) result = result * x % mod;    // this bit of n is set
        x = x * x % mod;
        n >>= 1;
    }
    return result;
}`, output: '1594323\n4611686018427387904\n312556845' },
      { type: 'p', text: 'A billion as the exponent needs only about 30 squarings. .NET has this built in as `BigInteger.ModPow`.' },
      { type: 'h2', text: 'How fast is a divide-and-conquer algorithm?' },
      { type: 'p', text: 'Write the cost as a **recurrence**: T(n) = a·T(n/b) + f(n), where a is the number of subproblems, n/b their size and f(n) the work to divide and combine. Merge sort is T(n) = 2T(n/2) + n. Draw the recursion tree and add up each level:' },
      { type: 'widget', name: 'recurrence-tree' },
      { type: 'p', text: 'The **master theorem** summarises the three cases for f(n) = nᵈ, comparing d with log_b a:' },
      { type: 'table', head: ['Case', 'Meaning', 'Result', 'Example'], rows: [
        ['d > log_b a', 'Top level dominates', 'O(nᵈ)', 'Quickselect: O(n)'],
        ['d = log_b a', 'Every level equal', 'O(nᵈ log n)', 'Merge sort: O(n log n); binary search: O(log n)'],
        ['d < log_b a', 'Leaves dominate', 'O(n^(log_b a))', 'Karatsuba: O(n^1.58)']
      ] },
      { type: 'p', text: 'The lesson of Karatsuba: multiplying two n-digit numbers by splitting each in half naively needs 4 half-size products, which is still O(n²). A clever identity needs only **3**, and that alone makes it O(n^1.58). Reducing the number of subproblems matters more than speeding up the combine step.' },
      { type: 'h2', text: 'Maximum subarray' },
      { type: 'p', text: 'Daily profit or loss on a project: which run of consecutive days earned the most? Split the days in half. The best run is entirely in the left half, entirely in the right half, or it **crosses the middle**. The first two are recursive calls; the crossing one is the best sum ending at the middle plus the best sum starting just after it, found in O(n). T(n) = 2T(n/2) + n = **O(n log n)**.' },
      { type: 'code', title: 'MaxSubarray.cs', code: cs`
int[] profit = { 3, -8, 5, -1, 6, -9, 4, 2, -3 };
Console.WriteLine(MaxSub(profit, 0, profit.Length - 1));

static int MaxSub(int[] a, int lo, int hi)
{
    if (lo == hi) return a[lo];                          // one day: nothing to split
    int mid = lo + (hi - lo) / 2;
    int left = MaxSub(a, lo, mid);
    int right = MaxSub(a, mid + 1, hi);

    int sum = 0, bestLeft = int.MinValue;                // best run ending at mid
    for (int i = mid; i >= lo; i--) { sum += a[i]; bestLeft = Math.Max(bestLeft, sum); }
    sum = 0;
    int bestRight = int.MinValue;                        // best run starting at mid + 1
    for (int i = mid + 1; i <= hi; i++) { sum += a[i]; bestRight = Math.Max(bestRight, sum); }

    return Math.Max(Math.Max(left, right), bestLeft + bestRight);
}`, output: '10' },
      { type: 'note', kind: 'info', text: 'This problem also has an O(n) dynamic programming solution (Kadane’s algorithm, in the grids and sequences lesson). Divide and conquer is not always the fastest approach, but it is often the easiest to reason about.' },
      { type: 'h2', text: 'Divide and conquer runs in parallel' },
      { type: 'p', text: 'The subproblems are independent, so they can run on different CPU cores. `Parallel.Invoke` runs two halves at once; below a size threshold, do the work sequentially, because starting a task costs more than adding a few thousand numbers.' },
      { type: 'code', title: 'ParallelSum.cs', code: cs`
int[] data = Enumerable.Range(1, 1_000_000).ToArray();
Console.WriteLine(Sum(data, 0, data.Length));

static long Sum(int[] a, int lo, int hi)                 // sums a[lo..hi)
{
    if (hi - lo <= 50_000)                               // small: just loop
    {
        long s = 0;
        for (int i = lo; i < hi; i++) s += a[i];
        return s;
    }
    int mid = lo + (hi - lo) / 2;
    long left = 0, right = 0;
    Parallel.Invoke(() => left = Sum(a, lo, mid), () => right = Sum(a, mid, hi));
    return left + right;
}`, output: '500000500000' },
      { type: 'quiz', question: 'T(n) = 2T(n/2) + n. What is the running time?', options: ['O(n)', 'O(n log n)', 'O(n²)', 'O(log n)'], answer: 1, explain: 'log₂ 2 = 1 = d: every level does n work, and there are log n levels. This is merge sort.' },
      { type: 'quiz', question: 'How many multiplications does fast exponentiation need for x¹⁰²⁴?', options: ['1024', 'About 512', 'About 10', '1'], answer: 2, explain: '1024 = 2¹⁰, so ten squarings: x², x⁴, x⁸, …, x¹⁰²⁴.' },
      { type: 'exercise', task: 'Count the **inversions** in an array: pairs (i, j) with i < j but a[i] > a[j]. It measures how unsorted the data is. `{ 5, 3, 8, 1, 4 }` has 6. Do it in O(n log n) by changing merge sort: when an item from the right half is placed before the items still waiting in the left half, each of those forms an inversion with it.', hint: 'In the merge step, when `right[j] < left[i]`, all of `left[i..]` are bigger than `right[j]`: add `left.Length - i` to the count.', solution: cs`
Console.WriteLine(CountInversions(new[] { 5, 3, 8, 1, 4 }));
Console.WriteLine(CountInversions(new[] { 1, 2, 3, 4 }));
Console.WriteLine(CountInversions(new[] { 4, 3, 2, 1 }));

static long CountInversions(int[] a)
{
    if (a.Length < 2) return 0;
    int mid = a.Length / 2;
    var left = a[..mid];
    var right = a[mid..];
    long count = CountInversions(left) + CountInversions(right);   // both halves are now sorted

    int i = 0, j = 0, k = 0;
    while (i < left.Length && j < right.Length)
    {
        if (left[i] <= right[j]) a[k++] = left[i++];
        else
        {
            count += left.Length - i;      // right[j] jumps ahead of every remaining left item
            a[k++] = right[j++];
        }
    }
    while (i < left.Length) a[k++] = left[i++];
    while (j < right.Length) a[k++] = right[j++];
    return count;
}`, output: '6\n0\n6' }
    ],
    keyPoints: [
      'Divide into smaller copies, conquer recursively, combine the answers.',
      'Costs follow recurrences T(n) = aT(n/b) + f(n); the master theorem gives the result.',
      'Fewer subproblems beats a faster combine step (Karatsuba: 3 instead of 4).',
      'Independent subproblems run naturally in parallel, above a size threshold.'
    ]
  },

  // ------------------------------------------------------------------ 41
  {
    slug: 'backtracking',
    title: 'Backtracking',
    summary: 'Explore every possible solution by making a choice, recursing, and undoing the choice: permutations, subsets with a target sum, n queens, and how pruning makes exponential searches practical.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'Some problems have no clever shortcut: you have to try the possibilities. **Backtracking** does that systematically. It builds a solution one choice at a time; as soon as a partial solution cannot possibly work, it gives up on it, **undoes** the last choice and tries the next one. It is DFS over the tree of all partial solutions.' },
      { type: 'p', text: 'Every backtracking function has the same three moves:' },
      { type: 'ol', items: [
        '**Choose**: add one option to the partial solution.',
        '**Explore**: recurse to make the next choice.',
        '**Un-choose**: remove that option again, so the next option starts from a clean state.'
      ] },
      { type: 'code', title: 'Permutations.cs', code: cs`
var crews = new[] { "Asha", "Bala", "Chen" };
var current = new List<string>();
var used = new bool[crews.Length];
Permute();

void Permute()
{
    if (current.Count == crews.Length)               // a complete order
    {
        Console.WriteLine(string.Join(" → ", current));
        return;
    }
    for (int i = 0; i < crews.Length; i++)
    {
        if (used[i]) continue;
        used[i] = true; current.Add(crews[i]);       // choose
        Permute();                                   // explore
        current.RemoveAt(current.Count - 1);         // un-choose
        used[i] = false;
    }
}`, output: 'Asha → Bala → Chen\nAsha → Chen → Bala\nBala → Asha → Chen\nBala → Chen → Asha\nChen → Asha → Bala\nChen → Bala → Asha' },
      { type: 'p', text: 'n items have n! orders: 6 for 3 crews, 3.6 million for 10. Backtracking is exponential by nature. What makes it usable is **pruning**: cutting off whole branches the moment they cannot lead to a valid answer.' },
      { type: 'h2', text: 'Pruning: n queens' },
      { type: 'p', text: 'Place n queens on an n × n board so that none attacks another. There are 4,426,165,368 ways to put 8 queens on 64 squares. Placing one queen per row, and **never placing a queen on an attacked square**, cuts the search to about two thousand placements.' },
      { type: 'widget', name: 'n-queens' },
      { type: 'code', title: 'Queens.cs', code: cs`
for (int n = 1; n <= 8; n++)
    Console.Write($"{n}:{CountQueens(n)} ");

static int CountQueens(int n)
{
    var cols = new bool[n];
    var diag1 = new bool[2 * n];          // r + c is the same along one diagonal
    var diag2 = new bool[2 * n];          // r − c is the same along the other
    return Place(0);

    int Place(int r)
    {
        if (r == n) return 1;             // all rows filled: one solution
        int count = 0;
        for (int c = 0; c < n; c++)
        {
            if (cols[c] || diag1[r + c] || diag2[r - c + n]) continue;   // attacked: prune
            cols[c] = diag1[r + c] = diag2[r - c + n] = true;            // choose
            count += Place(r + 1);                                       // explore
            cols[c] = diag1[r + c] = diag2[r - c + n] = false;           // un-choose
        }
        return count;
    }
}`, output: '1:1 2:0 3:0 4:2 5:10 6:4 7:40 8:92 ' },
      { type: 'p', text: 'The three `bool` arrays answer “is this square attacked?” in O(1) instead of checking every queen. Fast checks and early pruning are what separate a backtracking solution that finishes in milliseconds from one that runs for hours.' },
      { type: 'h2', text: 'Subsets with a target sum' },
      { type: 'p', text: 'Which stock lengths add up to exactly 10 m? Each length is either in or out. Sorting first allows a strong prune: if this length is already too long, all later ones are too, so **stop the loop** instead of just skipping.' },
      { type: 'code', title: 'TargetSum.cs', code: cs`
int[] pieces = { 2, 3, 5, 7 };          // sorted ascending
var pick = new List<int>();
Find(0, 10);

void Find(int start, int remaining)
{
    if (remaining == 0) { Console.WriteLine(string.Join(" + ", pick)); return; }
    for (int i = start; i < pieces.Length; i++)
    {
        if (pieces[i] > remaining) break;       // prune: every later piece is longer still
        pick.Add(pieces[i]);                    // choose
        Find(i + 1, remaining - pieces[i]);     // explore (each piece used at most once)
        pick.RemoveAt(pick.Count - 1);          // un-choose
    }
}`, output: '2 + 3 + 5\n3 + 7' },
      { type: 'h2', text: 'Where backtracking is used' },
      { type: 'ul', items: [
        'Puzzles: sudoku, crosswords, n queens.',
        'Combinatorial search: all subsets, combinations or orders that satisfy some rules.',
        'Constraint problems: timetables, shift rosters, assigning crews to tasks with restrictions.',
        'Parsing and pattern matching (regular expression engines backtrack).'
      ] },
      { type: 'note', kind: 'warn', text: 'Backtracking is exponential in the worst case. If the same partial problems keep coming back (“how best to fill the remaining 6 m with the remaining pieces?”), store their answers: that is dynamic programming, the next three lessons.' },
      { type: 'quiz', question: 'What is the purpose of the “un-choose” step?', options: ['To save memory', 'To restore the state, so the next option is tried from the same starting point', 'To print the solution', 'To prune the search'], answer: 1, explain: 'Without it, choices from one branch would leak into the next branch.' },
      { type: 'quiz', question: 'In TargetSum.cs, why `break` instead of `continue` when a piece is too long?', options: ['It is a style choice', 'The array is sorted, so every later piece is too long as well', 'To avoid duplicates', 'Because break is faster than continue'], answer: 1, explain: 'Sorting turns a skip of one item into a skip of the whole rest of the loop.' },
      { type: 'exercise', task: 'Print every string of n pairs of **balanced brackets**. For n = 3 there are 5: `((()))`, `(()())`, `(())()`, `()(())`, `()()()`.', hint: 'Build the string one character at a time. You may add `(` while fewer than n are open in total, and `)` while it would close an open one (closed < opened). When the length is 2n, print it.', solution: cs`
var sb = new System.Text.StringBuilder();
Build(0, 0, 3);

void Build(int open, int close, int n)
{
    if (sb.Length == 2 * n) { Console.WriteLine(sb); return; }
    if (open < n)
    {
        sb.Append('(');
        Build(open + 1, close, n);
        sb.Length--;                      // un-choose
    }
    if (close < open)
    {
        sb.Append(')');
        Build(open, close + 1, n);
        sb.Length--;
    }
}`, output: '((()))\n(()())\n(())()\n()(())\n()()()' }
    ],
    keyPoints: [
      'Backtracking = choose, explore, un-choose: DFS over partial solutions.',
      'It is exponential; pruning invalid branches early is what makes it practical.',
      'Fast validity checks (like the diagonal arrays in n queens) matter as much as the pruning itself.',
      'If identical subproblems repeat, switch to dynamic programming.'
    ]
  },

  // ------------------------------------------------------------------ 42
  {
    slug: 'dp-intro',
    title: 'Dynamic programming: the idea',
    summary: 'Recognise overlapping subproblems and optimal substructure, solve them top-down with memoisation or bottom-up with a table, and apply it to counting stairs, fewest coins and non-adjacent picks.',
    minutes: 15,
    blocks: [
      { type: 'p', text: '**Dynamic programming** (DP) is for problems where a recursive solution keeps solving **the same smaller problems again and again**. Instead of recomputing them, DP solves each one once and stores the answer. It often turns an exponential algorithm into a polynomial one. The name is historical and slightly misleading; “clever recursion with a cache” is closer.' },
      { type: 'h2', text: 'Two signs that DP applies' },
      { type: 'ul', items: [
        '**Optimal substructure**: the answer to the problem can be built from answers to smaller versions of the same problem.',
        '**Overlapping subproblems**: those smaller problems are needed many times. (In merge sort they are not: each half is sorted once. That is divide and conquer, not DP.)'
      ] },
      { type: 'h2', text: 'Example: climbing stairs' },
      { type: 'p', text: 'You climb n steps, taking 1 or 2 at a time. How many different ways are there? Think about the **last move**: you arrived either from step n − 1 (a single step) or from step n − 2 (a double step). So `ways(n) = ways(n − 1) + ways(n − 2)`, with ways(0) = ways(1) = 1. Written as plain recursion this is the Fibonacci tree from the recursion lesson: about 1.6ⁿ calls.' },
      { type: 'widget', name: 'dp-table' },
      { type: 'h2', text: 'Top-down: memoisation' },
      { type: 'p', text: 'Keep the recursive code, but store each answer in a dictionary or array the first time it is computed. Every n is computed once: **O(n)**.' },
      { type: 'h2', text: 'Bottom-up: tabulation' },
      { type: 'p', text: 'Or skip recursion entirely: fill an array from the smallest cases upwards, so that every value you need is already there. No recursion means no stack overflow, and often the table can be shrunk: here only the last two values are ever needed.' },
      { type: 'code', title: 'Stairs.cs', code: cs`
var memo = new Dictionary<int, long>();
Console.WriteLine(WaysMemo(50));
Console.WriteLine(WaysTable(50));
Console.WriteLine(WaysTwoVariables(50));

long WaysMemo(int n)                               // top-down
{
    if (n <= 1) return 1;
    if (memo.TryGetValue(n, out long known)) return known;
    return memo[n] = WaysMemo(n - 1) + WaysMemo(n - 2);
}

static long WaysTable(int n)                       // bottom-up
{
    var ways = new long[n + 1];
    ways[0] = 1;
    ways[1] = 1;
    for (int i = 2; i <= n; i++)
        ways[i] = ways[i - 1] + ways[i - 2];
    return ways[n];
}

static long WaysTwoVariables(int n)                // bottom-up, O(1) memory
{
    long prev = 1, cur = 1;
    for (int i = 2; i <= n; i++)
        (prev, cur) = (cur, prev + cur);
    return cur;
}`, output: '20365011074\n20365011074\n20365011074' },
      { type: 'p', text: 'The plain recursion for n = 50 would make about 40 billion calls. The DP versions do 49 additions.' },
      { type: 'h2', text: 'The DP recipe' },
      { type: 'ol', items: [
        '**Define the state**: what does one subproblem mean? (“ways[i] = number of ways to reach step i”, “best[a] = fewest coins for amount a”).',
        '**Find the recurrence**: how is a state built from smaller states? Thinking about the *last* decision usually works.',
        '**Base cases**: the smallest states, answered directly.',
        '**Order**: compute states so that dependencies are ready (usually increasing size).',
        '**Answer**: which state (or combination) is the final answer?'
      ] },
      { type: 'h2', text: 'Fewest coins, done right' },
      { type: 'p', text: 'The greedy lesson showed that “biggest coin first” fails for coins 1, 3 and 4. DP considers every possible **last coin**: `best[a] = 1 + min(best[a − c])` over all coins c ≤ a. Try it in the widget above with the second button.' },
      { type: 'code', title: 'MinCoins.cs', code: cs`
Console.WriteLine(MinCoins(6, new[] { 1, 3, 4 }));    // 3 + 3
Console.WriteLine(MinCoins(10, new[] { 1, 3, 4 }));   // 3 + 3 + 4
Console.WriteLine(MinCoins(7, new[] { 2, 4 }));       // impossible

static int MinCoins(int amount, int[] coins)
{
    var best = new int[amount + 1];
    Array.Fill(best, int.MaxValue);                    // "not possible yet"
    best[0] = 0;
    for (int a = 1; a <= amount; a++)
        foreach (int c in coins)
            if (c <= a && best[a - c] != int.MaxValue)
                best[a] = Math.Min(best[a], best[a - c] + 1);   // c as the last coin
    return best[amount] == int.MaxValue ? -1 : best[amount];
}`, output: '2\n3\n-1' },
      { type: 'p', text: 'Time **O(amount × number of coins)**, memory O(amount). Compare with trying all combinations of coins, which grows exponentially with the amount.' },
      { type: 'table', head: ['', 'Top-down (memoisation)', 'Bottom-up (tabulation)'], rows: [
        ['Code', 'Recursive, close to the recurrence', 'Loops, needs a fill order'],
        ['Computes', 'Only the states actually needed', 'Every state'],
        ['Risk', 'Deep recursion can overflow the stack', 'None'],
        ['Memory tricks', 'Hard', 'Easy to keep only the last row(s)']
      ] },
      { type: 'quiz', question: 'Which problem is NOT a good fit for DP?', options: ['Number of ways to climb stairs', 'Fewest coins for an amount', 'Sorting with merge sort', 'Longest common subsequence'], answer: 2, explain: 'Merge sort’s halves never overlap: each subproblem is solved once anyway. DP pays off only when subproblems repeat.' },
      { type: 'quiz', question: 'ways[i] = ways[i − 1] + ways[i − 2]. In what order must a bottom-up loop fill the table?', options: ['From n down to 0', 'Increasing i, so the two previous values are ready', 'Any order', 'Even indexes first'], answer: 1, explain: 'Each value depends on smaller indexes, so compute them first.' },
      { type: 'exercise', task: 'Inspection sites along a road each have a value. You cannot inspect two **neighbouring** sites on the same day. Find the largest total value. `{ 2, 7, 9, 3, 1 }` → 12 (2 + 9 + 1); `{ 5, 1, 1, 5 }` → 10 (5 + 5). Write the recurrence, then a bottom-up loop with O(1) memory.', hint: 'For site i you either skip it (best up to i − 1) or take it (its value + best up to i − 2). best[i] = max(best[i − 1], best[i − 2] + value[i]). Keep only the last two bests.', solution: cs`
Console.WriteLine(BestInspections(new[] { 2, 7, 9, 3, 1 }));
Console.WriteLine(BestInspections(new[] { 5, 1, 1, 5 }));

static int BestInspections(int[] value)
{
    int beforePrev = 0, prev = 0;            // best up to i − 2 and up to i − 1
    foreach (int v in value)
    {
        int cur = Math.Max(prev, beforePrev + v);   // skip this site, or take it
        beforePrev = prev;
        prev = cur;
    }
    return prev;
}`, output: '12\n10' }
    ],
    keyPoints: [
      'DP applies when the answer is built from smaller answers and those subproblems repeat.',
      'Top-down memoisation caches a recursive solution; bottom-up tabulation fills a table in dependency order.',
      'Recipe: state, recurrence (think about the last decision), base cases, order, answer.',
      'DP fixes problems where greedy fails, such as fewest coins for any coin set.'
    ]
  },

  // ------------------------------------------------------------------ 43
  {
    slug: 'dp-classic',
    title: 'Dynamic programming: grids and sequences',
    summary: 'Apply DP to two-dimensional grids (counting paths around obstacles, cheapest route) and to sequences (longest increasing subsequence, maximum subarray with Kadane’s algorithm).',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'The two most common shapes of DP problems are **grids**, where a cell’s answer comes from its neighbours, and **sequences**, where the answer for position i comes from earlier positions. Once you recognise the shape, the recipe from the last lesson does the rest.' },
      { type: 'h2', text: 'Counting paths on a grid' },
      { type: 'p', text: 'A robot (or a cable) goes from the top-left corner of a site plan to the bottom-right, moving only right or down, and some cells are blocked. How many different routes are there? The last move into a cell came either from above or from the left, so `paths[r, c] = paths[r − 1, c] + paths[r, c − 1]`, and a blocked cell has 0.' },
      { type: 'widget', name: 'grid-paths' },
      { type: 'code', title: 'GridPaths.cs', code: cs`
string[] site =
{
    "......",
    "..#...",
    "...#..",
    "......",
    "..#..."
};
Console.WriteLine(CountPaths(site));

static long CountPaths(string[] g)
{
    int rows = g.Length, cols = g[0].Length;
    var paths = new long[rows, cols];
    for (int r = 0; r < rows; r++)
        for (int c = 0; c < cols; c++)
        {
            if (g[r][c] == '#') continue;                        // blocked: stays 0
            if (r == 0 && c == 0) { paths[r, c] = 1; continue; }
            long fromAbove = r > 0 ? paths[r - 1, c] : 0;
            long fromLeft = c > 0 ? paths[r, c - 1] : 0;
            paths[r, c] = fromAbove + fromLeft;
        }
    return paths[rows - 1, cols - 1];
}`, output: '30' },
      { type: 'h2', text: 'The cheapest route' },
      { type: 'p', text: 'Same grid shape, different question: each cell has a cost, and we want the cheapest right/down route. Replace “+” with “min”: `best[r, c] = cost[r, c] + min(best above, best left)`. To recover the route itself, walk back from the corner, always to the cheaper neighbour.' },
      { type: 'code', title: 'MinPathSum.cs', code: cs`
int[,] cost =
{
    { 1, 3, 1, 2, 8, 1 },
    { 1, 5, 1, 9, 1, 2 },
    { 4, 2, 1, 3, 2, 6 },
    { 7, 1, 8, 1, 1, 2 },
    { 2, 4, 1, 5, 3, 1 }
};
Console.WriteLine(MinPathSum(cost));

static int MinPathSum(int[,] cost)
{
    int rows = cost.GetLength(0), cols = cost.GetLength(1);
    var best = new int[cols];                       // one row is enough
    for (int r = 0; r < rows; r++)
        for (int c = 0; c < cols; c++)
        {
            if (r == 0 && c == 0) best[c] = cost[0, 0];
            else if (r == 0) best[c] = best[c - 1] + cost[r, c];          // only from the left
            else if (c == 0) best[c] = best[c] + cost[r, c];              // only from above
            else best[c] = Math.Min(best[c], best[c - 1]) + cost[r, c];   // above vs left
        }
    return best[cols - 1];
}`, output: '15' },
      { type: 'p', text: 'Notice the memory trick: `best[c]` still holds the value from the row above until it is overwritten, so one array of length `cols` replaces the whole table. Time O(rows × cols), memory O(cols).' },
      { type: 'note', kind: 'info', text: 'This works because moves only go right or down, so the grid has no cycles. If the route could go in any direction, it would be a shortest-path problem: Dijkstra, from the Graphs module.' },
      { type: 'h2', text: 'Longest increasing subsequence' },
      { type: 'p', text: 'Monthly readings `{ 3, 10, 2, 1, 20, 4, 6, 7 }`. What is the longest run of readings that keeps increasing, if you may skip some (a **subsequence**, not necessarily consecutive)? State: `lis[i]` = length of the longest increasing subsequence that **ends** at i. Recurrence: look at every earlier j with a smaller value and extend the best one.' },
      { type: 'code', title: 'Lis.cs', code: cs`
int[] readings = { 3, 10, 2, 1, 20, 4, 6, 7 };
Console.WriteLine(Lis(readings));
Console.WriteLine(LisFast(readings));

static int Lis(int[] a)                                   // O(n²)
{
    var lis = new int[a.Length];
    for (int i = 0; i < a.Length; i++)
    {
        lis[i] = 1;                                       // just a[i] on its own
        for (int j = 0; j < i; j++)
            if (a[j] < a[i]) lis[i] = Math.Max(lis[i], lis[j] + 1);
    }
    return a.Length == 0 ? 0 : lis.Max();
}

static int LisFast(int[] a)                               // O(n log n)
{
    var tails = new List<int>();     // tails[k] = smallest end of an increasing run of length k + 1
    foreach (int x in a)
    {
        int pos = tails.BinarySearch(x);
        if (pos < 0) pos = ~pos;                          // where x would be inserted
        if (pos == tails.Count) tails.Add(x);             // extends the longest run
        else tails[pos] = x;                              // a smaller end for that length
    }
    return tails.Count;
}`, output: '4\n4' },
      { type: 'p', text: 'The O(n log n) version keeps, for every length, the smallest value an increasing run of that length can end with, and uses binary search (with the `~index` trick from the searching lesson) to update it. It is a good example of DP and binary search working together.' },
      { type: 'h2', text: 'Sequence DP: the pattern' },
      { type: 'table', head: ['Problem', 'State', 'Recurrence'], rows: [
        ['Stairs', 'ways to reach i', 'ways[i−1] + ways[i−2]'],
        ['Non-adjacent picks', 'best up to i', 'max(best[i−1], best[i−2] + v[i])'],
        ['Longest increasing subsequence', 'longest ending at i', '1 + max(lis[j]) for j < i with a[j] < a[i]'],
        ['Maximum subarray (Kadane)', 'best sum ending at i', 'max(a[i], end[i−1] + a[i])']
      ] },
      { type: 'quiz', question: 'In the grid-paths problem, why does each cell only look at the cell above and the cell to the left?', options: ['To save memory', 'Because moves only go right or down, so the last move into a cell came from one of those two', 'Because the grid is square', 'It also needs the diagonal'], answer: 1, explain: 'Thinking about the last move gives the recurrence directly.' },
      { type: 'quiz', question: 'For { 5, 1, 6, 2, 7, 3, 8 }, what is the length of the longest increasing subsequence?', options: ['3', '4', '5', '7'], answer: 1, explain: 'For example 5, 6, 7, 8 or 1, 2, 3, 8. No increasing subsequence of length 5 exists.' },
      { type: 'exercise', task: 'Implement **Kadane’s algorithm**: the largest sum of a run of consecutive values, in O(n) time and O(1) memory. `{ -2, 1, -3, 4, -1, 2, 1, -5, 4 }` → 6 (4 − 1 + 2 + 1); the profit data from the divide-and-conquer lesson `{ 3, -8, 5, -1, 6, -9, 4, 2, -3 }` → 10.', hint: 'State: the best sum of a run that **ends** at the current position. Either extend the previous run or start fresh here: `endingHere = max(x, endingHere + x)`. Track the largest value it ever takes.', solution: cs`
Console.WriteLine(Kadane(new[] { -2, 1, -3, 4, -1, 2, 1, -5, 4 }));
Console.WriteLine(Kadane(new[] { 3, -8, 5, -1, 6, -9, 4, 2, -3 }));

static int Kadane(int[] a)
{
    int endingHere = a[0], best = a[0];
    for (int i = 1; i < a.Length; i++)
    {
        endingHere = Math.Max(a[i], endingHere + a[i]);   // start fresh or extend
        best = Math.Max(best, endingHere);
    }
    return best;
}`, output: '6\n10' }
    ],
    keyPoints: [
      'Grid DP: a cell’s answer comes from the neighbours its last move came from.',
      'Counting uses “+”, optimising uses “min” or “max”; walk back from the end to recover the route.',
      'Rolling arrays cut memory from O(rows × cols) to O(cols).',
      'Sequence DP: define the state as “the best ending at i”; LIS and Kadane are the classic examples.'
    ]
  },

  // ------------------------------------------------------------------ 44
  {
    slug: 'dp-advanced',
    title: 'Dynamic programming: knapsack, LCS and edit distance',
    summary: 'Solve two-dimensional DP problems: the 0/1 knapsack with item reconstruction, the longest common subsequence behind diff tools, and edit distance behind spell checkers.',
    minutes: 16,
    blocks: [
      { type: 'p', text: 'The hardest-looking DP problems use a **two-dimensional state**: “the best answer using the first i items with capacity w”, or “comparing the first i letters of one word with the first j of another”. The recipe is the same as before; the table is just a grid.' },
      { type: 'h2', text: '0/1 knapsack' },
      { type: 'p', text: 'A truck can carry 10 tonnes. Each load has a weight and a value, and each is taken whole or not at all. Which loads maximise the value? Greedy by value per tonne fails here (unlike the fractional version). State: `best[i, w]` = the best value using the first i loads with capacity w. For load i there are two choices: **leave it** (`best[i − 1, w]`) or **take it** if it fits (`value + best[i − 1, w − weight]`).' },
      { type: 'code', title: 'Knapsack.cs', code: cs`
(string Name, int Weight, int Value)[] loads =
{
    ("Rebar", 5, 10), ("Bolts", 4, 40), ("Panels", 6, 30), ("Anchors", 3, 50)
};
int capacity = 10, n = loads.Length;

var best = new int[n + 1, capacity + 1];          // row 0: no loads, value 0
for (int i = 1; i <= n; i++)
{
    var (_, wt, val) = loads[i - 1];
    for (int w = 0; w <= capacity; w++)
    {
        best[i, w] = best[i - 1, w];                                   // leave load i
        if (wt <= w) best[i, w] = Math.Max(best[i, w], val + best[i - 1, w - wt]);   // take it
    }
}
Console.WriteLine($"Best value: {best[n, capacity]}");

// Walk back: if the value changed from the row above, load i was taken
var taken = new List<string>();
for (int i = n, w = capacity; i > 0; i--)
    if (best[i, w] != best[i - 1, w]) { taken.Add(loads[i - 1].Name); w -= loads[i - 1].Weight; }
taken.Reverse();
Console.WriteLine(string.Join(", ", taken));`, output: 'Best value: 90\nBolts, Anchors' },
      { type: 'p', text: 'Time and memory **O(n × capacity)**. If you only need the value, one row is enough: loop w **downwards** so that each load is used at most once (`best[w] = max(best[w], val + best[w − wt])`). Looping upwards would let a load be taken again and again, which is the “unbounded” knapsack.' },
      { type: 'note', kind: 'info', text: 'O(n × capacity) depends on the **size of the number** capacity, not just on n. With a capacity of a billion it is useless. The knapsack problem is NP-hard in general (see the Master module); DP is fast only when the capacity is small.' },
      { type: 'h2', text: 'Longest common subsequence' },
      { type: 'p', text: 'What is the longest sequence of letters that appears, in order, in both of two words? Comparing two files line by line is the same question with lines instead of letters: everything in the LCS is unchanged, everything else was added or removed. That is how `diff` and Git show changes.' },
      { type: 'p', text: 'State: `L[i, j]` = LCS length of the first i letters of A and the first j letters of B. If the last letters match, they extend the LCS of the shorter prefixes (diagonal + 1). If not, drop the last letter of one word or the other and take the better result.' },
      { type: 'widget', name: 'lcs-table' },
      { type: 'code', title: 'Lcs.cs', code: cs`
Console.WriteLine(Lcs("STEEL", "STEAL"));
Console.WriteLine(Lcs("ABCBDAB", "BDCABA"));

static string Lcs(string a, string b)
{
    var L = new int[a.Length + 1, b.Length + 1];
    for (int i = 1; i <= a.Length; i++)
        for (int j = 1; j <= b.Length; j++)
            L[i, j] = a[i - 1] == b[j - 1]
                ? L[i - 1, j - 1] + 1                       // match: extend the diagonal
                : Math.Max(L[i - 1, j], L[i, j - 1]);       // drop a letter from one side

    var sb = new System.Text.StringBuilder();              // walk back to read the letters
    for (int i = a.Length, j = b.Length; i > 0 && j > 0;)
    {
        if (a[i - 1] == b[j - 1]) { sb.Insert(0, a[i - 1]); i--; j--; }
        else if (L[i - 1, j] >= L[i, j - 1]) i--;
        else j--;
    }
    return $"{L[a.Length, b.Length]} \"{sb}\"";
}`, output: '4 "STEL"\n4 "BCBA"' },
      { type: 'h2', text: 'Edit distance' },
      { type: 'p', text: 'How many single-letter **inserts, deletes or replacements** turn one word into another? This is the Levenshtein distance. Spell checkers suggest the dictionary words at the smallest distance from what you typed; it also matches slightly misspelled names in data imports. State: `D[i, j]` for the first i letters of A and j of B. If the letters match, copy the diagonal; otherwise 1 + the cheapest of replace (diagonal), delete (above) and insert (left).' },
      { type: 'code', title: 'EditDistance.cs', code: cs`
Console.WriteLine(EditDistance("KITTEN", "SITTING"));
Console.WriteLine(EditDistance("STEEL", "STEAL"));
Console.WriteLine(EditDistance("COLUMN", "COLUMNS"));
Console.WriteLine(EditDistance("BEAM", "BEAM"));

static int EditDistance(string a, string b)
{
    var D = new int[a.Length + 1, b.Length + 1];
    for (int i = 0; i <= a.Length; i++) D[i, 0] = i;     // delete everything
    for (int j = 0; j <= b.Length; j++) D[0, j] = j;     // insert everything
    for (int i = 1; i <= a.Length; i++)
        for (int j = 1; j <= b.Length; j++)
            D[i, j] = a[i - 1] == b[j - 1]
                ? D[i - 1, j - 1]                                      // letters match: free
                : 1 + Math.Min(D[i - 1, j - 1], Math.Min(D[i - 1, j], D[i, j - 1]));   // replace, delete, insert
    return D[a.Length, b.Length];
}`, output: '3\n1\n1\n0' },
      { type: 'table', head: ['Problem', 'State', 'Time', 'Used in'], rows: [
        ['0/1 knapsack', 'first i items, capacity w', 'O(n · W)', 'Loading, budgeting, cutting stock'],
        ['Longest common subsequence', 'prefixes i and j', 'O(n · m)', 'diff, Git, DNA comparison'],
        ['Edit distance', 'prefixes i and j', 'O(n · m)', 'Spell check, fuzzy search, data cleaning']
      ] },
      { type: 'quiz', question: 'In the knapsack table, why does `best[i, w]` look at row i − 1 when taking load i?', options: ['To save time', 'So that load i is used at most once: the remaining capacity is filled from the first i − 1 loads only', 'Because row i is not filled yet', 'It should look at row i'], answer: 1, explain: 'Looking at row i would allow load i to be taken again: that is the unbounded knapsack.' },
      { type: 'quiz', question: 'What is the edit distance between “BEAM” and “BEAMS”?', options: ['0', '1', '4', '5'], answer: 1, explain: 'One insert (the S).' },
      { type: 'exercise', task: 'Can a set of loads be split into two groups with **exactly equal** total weight (one for each truck)? `{ 1, 5, 11, 5 }` → True (11 and 1 + 5 + 5); `{ 1, 2, 3, 5 }` → False. Use a one-dimensional knapsack-style table of booleans.', hint: 'If the total is odd, it is impossible. Otherwise ask: can some subset reach total / 2? `can[s]` = some subset sums to s. For each load, loop s downwards from target to the load’s weight: `can[s] |= can[s − weight]`.', solution: cs`
Console.WriteLine(CanSplitEvenly(new[] { 1, 5, 11, 5 }));
Console.WriteLine(CanSplitEvenly(new[] { 1, 2, 3, 5 }));

static bool CanSplitEvenly(int[] loads)
{
    int total = loads.Sum();
    if (total % 2 != 0) return false;
    int target = total / 2;
    var can = new bool[target + 1];
    can[0] = true;                                  // the empty group
    foreach (int w in loads)
        for (int s = target; s >= w; s--)           // downwards: each load used once
            can[s] |= can[s - w];
    return can[target];
}`, output: 'True\nFalse' }
    ],
    keyPoints: [
      '0/1 knapsack: best[i, w] = max(leave item i, take it + best of the rest); walk back to find the items.',
      'Loop capacity downwards in a 1-D table to use each item once; upwards allows repeats.',
      'LCS and edit distance fill a table over two prefixes; the traceback gives the actual alignment.',
      'Two-dimensional DP is O(n · m) time; often one row of memory is enough when only the value is needed.'
    ]
  }
];
