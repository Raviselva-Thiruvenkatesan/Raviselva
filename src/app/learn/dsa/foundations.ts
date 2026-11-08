import { Lesson } from '../learn.types';
import { cs } from '../csharp/cs';

export const FOUNDATIONS: Lesson[] = [
  // ------------------------------------------------------------------ 1
  {
    slug: 'what-is-dsa',
    title: 'What are data structures and algorithms?',
    summary: 'What the two words mean, why the way you store data decides how fast your program is, and how this course is organised.',
    minutes: 10,
    blocks: [
      { type: 'p', text: 'Every program does two things: it **keeps data** (beams, users, orders, pixels) and it **does work** with that data (search, sort, add up, find a path). Data structures and algorithms are simply the study of doing those two things well.' },
      { type: 'ul', items: [
        'A **data structure** is a way of organising data in memory so that the operations you need are fast. An array, a list, a dictionary and a tree are all data structures.',
        'An **algorithm** is a precise, step-by-step recipe that turns an input into the right output in a finite number of steps. “Check each beam until you find the one with this ID” is an algorithm.'
      ] },
      { type: 'p', text: 'The two go together. The right structure makes a simple algorithm fast; the wrong one makes even a clever algorithm slow. Try it: the same question asked of the same data, stored three different ways.' },
      { type: 'widget', name: 'lookup-race' },
      { type: 'note', kind: 'info', text: 'Think of a steel yard. If beams are dumped in one pile, finding beam B-742 means checking them one by one. If they are stacked in order of their number, you can jump to the middle and halve the search each time. If every beam has a labelled rack, you walk straight to it. Same beams, three “data structures”.' },
      { type: 'h2', text: 'Why learn this if .NET already has List and Dictionary?' },
      { type: 'p', text: 'You will rarely write your own hash table at work, but you choose between structures every day, and the wrong choice is one of the most common causes of slow software. Knowing how they work inside tells you which one to pick and what it costs.' },
      { type: 'ul', items: [
        '**Performance:** a check that takes 1 second on 1,000 elements might take 11 days on a million if the algorithm is O(n²). BIM models easily have a million elements.',
        '**Interviews:** almost every developer interview has DSA questions, from freshers to senior roles.',
        '**Problem solving:** many “hard” problems become easy once you recognise them as a known pattern: a graph search, a sliding window, a heap.'
      ] },
      { type: 'h2', text: 'The main data structures at a glance' },
      { type: 'table', head: ['Structure', 'In .NET', 'Fast at', 'Slow at'], rows: [
        ['Array', '`int[]`', 'Read/write by index', 'Growing, inserting in the middle'],
        ['Dynamic array', '`List<T>`', 'Index access, adding at the end', 'Inserting/removing at the front, searching'],
        ['Linked list', '`LinkedList<T>`', 'Inserting/removing at a known node', 'Access by index'],
        ['Stack', '`Stack<T>`', 'Push/pop at the top (last in, first out)', 'Anything below the top'],
        ['Queue', '`Queue<T>`', 'Add at back, take from front (first in, first out)', 'Anything in the middle'],
        ['Hash table', '`Dictionary<K,V>`, `HashSet<T>`', 'Lookup by key', 'Keeping things in order'],
        ['Balanced tree', '`SortedDictionary<K,V>`, `SortedSet<T>`', 'Ordered data, ranges, min/max', 'Slower than hashing for plain lookups'],
        ['Heap', '`PriorityQueue<T,P>`', 'Always taking the smallest/most urgent item', 'Searching for an arbitrary item'],
        ['Graph', '(you build it)', 'Connections: networks, routes, dependencies', 'Depends on how it is stored']
      ] },
      { type: 'p', text: 'Do not worry about memorising this table. Every row has its own lesson later, with a visual of how it works inside.' },
      { type: 'h2', text: 'Your first algorithm' },
      { type: 'p', text: 'Finding the largest value is a classic first algorithm. It is precise (no guessing), it always finishes, and it is correct for every non-empty input.' },
      { type: 'code', title: 'MaxLoad.cs', code: cs`
static int Max(int[] values)
{
    if (values.Length == 0)
        throw new ArgumentException("Need at least one value.");

    int best = values[0];               // assume the first is the largest
    for (int i = 1; i < values.Length; i++)
    {
        if (values[i] > best)           // found a bigger one?
            best = values[i];
    }
    return best;
}

int[] loads = { 12, 45, 7, 88, 23 };
Console.WriteLine(Max(loads));`, output: '88' },
      { type: 'p', text: 'A good algorithm description answers four questions: what is the **input**, what is the **output**, what are the **steps**, and how do we know it is **correct** (here: after each step, `best` is the largest value seen so far).' },
      { type: 'h2', text: 'How we judge an algorithm' },
      { type: 'ol', items: [
        '**Correct:** it gives the right answer for every valid input, including edge cases (empty input, one element, duplicates, negative numbers).',
        '**Time:** how the number of steps grows as the input grows. This is **Big-O**, the next lesson.',
        '**Memory:** how much extra memory it needs (space complexity).',
        '**Simple:** easy to read, test and change. A clever algorithm nobody understands is a risk.'
      ] },
      { type: 'note', kind: 'tip', text: 'All examples in this course are in C#. If you are new to C#, the free C# course on this site covers everything used here: loops, arrays, methods, classes, generics and collections.' },
      { type: 'h2', text: 'How this course is organised' },
      { type: 'table', head: ['Module', 'What you will learn'], rows: [
        ['Foundations', 'Big-O, counting steps, memory cost, recursion trees'],
        ['Linear data structures', 'Arrays, dynamic arrays, linked lists, stacks, queues'],
        ['Searching and sorting', 'Binary search and the important sorting algorithms'],
        ['Hashing and techniques', 'Hash tables, two pointers, sliding window, prefix sums, bits'],
        ['Trees', 'Binary trees, BSTs, balanced trees, heaps, tries'],
        ['Graphs', 'BFS, DFS, topological sort, shortest paths, spanning trees, union-find'],
        ['Algorithm design', 'Greedy, divide and conquer, backtracking, dynamic programming'],
        ['Master level', 'Segment trees, string matching, spatial indexes, geometry, hard problems']
      ] },
      { type: 'quiz', question: 'Which statement is true?', options: [
        'A data structure is a recipe for solving a problem.',
        'An algorithm is a way of storing data in memory.',
        'The same algorithm can be fast or slow depending on the data structure it works on.',
        'If the computer is fast enough, the choice of data structure does not matter.'
      ], answer: 2, explain: 'The structure decides what is cheap. Searching by ID is one step in a Dictionary but n steps in an unsorted list. A faster computer only divides the time by a constant; it cannot fix a bad growth rate.' },
      { type: 'quiz', question: 'You need to check, many times, whether an element ID has already been processed. Which structure fits best?', options: ['`int[]`', '`List<int>` with `Contains`', '`HashSet<int>`', '`Stack<int>`'], answer: 2, explain: '`HashSet<int>.Contains` takes about one step whatever the size. `List.Contains` checks the items one by one.' },
      { type: 'exercise', task: 'Write `FirstLongerThan(double[] lengths, double limit)` that returns the **index** of the first beam longer than `limit`, or `-1` if there is none. Test it with `{ 6.5, 9.0, 14.2, 3.1, 12.8 }` and a limit of 12.', hint: 'Loop with an index, return as soon as you find a match, and return -1 after the loop.', solution: cs`
static int FirstLongerThan(double[] lengths, double limit)
{
    for (int i = 0; i < lengths.Length; i++)
    {
        if (lengths[i] > limit)
            return i;          // stop at the first match
    }
    return -1;                 // checked everything, none found
}

double[] beams = { 6.5, 9.0, 14.2, 3.1, 12.8 };
Console.WriteLine(FirstLongerThan(beams, 12));
Console.WriteLine(FirstLongerThan(beams, 20));`, output: '2\n-1' }
    ],
    keyPoints: [
      'A **data structure** organises data so certain operations are fast; an **algorithm** is a precise recipe that solves a problem.',
      'The same question can take 1 step or a million steps depending on how the data is stored.',
      'Judge algorithms by correctness first, then time, memory and simplicity.',
      '.NET already provides most structures; DSA teaches you which one to choose and why.'
    ]
  },

  // ------------------------------------------------------------------ 2
  {
    slug: 'big-o',
    title: 'Measuring speed: Big-O notation',
    summary: 'Describe how an algorithm’s work grows with the input size, learn the common growth rates, and the rules for simplifying Big-O.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'How do you say one algorithm is faster than another? Seconds are a poor measure: the same code runs at different speeds on a laptop and a server, and the time changes with the input. Instead we count **how many basic steps** the algorithm does for an input of size **n**, and we ask one question: **as n grows, how fast does the work grow?**' },
      { type: 'p', text: '**Big-O notation** is the short way to write that growth. `O(n)` means “the work grows in proportion to n”: twice the data, about twice the work. `O(n²)` means twice the data, four times the work.' },
      { type: 'widget', name: 'growth-chart' },
      { type: 'h2', text: 'The common growth rates' },
      { type: 'table', head: ['Big-O', 'Name', 'Typical example', 'n doubles → work'], rows: [
        ['`O(1)`', 'Constant', 'Read `array[i]`, `Dictionary` lookup', 'stays the same'],
        ['`O(log n)`', 'Logarithmic', 'Binary search in sorted data', '+1 step'],
        ['`O(n)`', 'Linear', 'One loop over the data, finding the max', '× 2'],
        ['`O(n log n)`', 'Linearithmic', 'Merge sort, `Array.Sort`', 'a bit more than × 2'],
        ['`O(n²)`', 'Quadratic', 'Comparing every pair (nested loops)', '× 4'],
        ['`O(n³)`', 'Cubic', 'Three nested loops, naive matrix multiply', '× 8'],
        ['`O(2ⁿ)`', 'Exponential', 'Trying every subset', 'squared!'],
        ['`O(n!)`', 'Factorial', 'Trying every order (permutation)', 'astronomical']
      ] },
      { type: 'note', kind: 'info', text: '`log n` in computing means log base 2: how many times you can halve n before reaching 1. log₂ 1,000 ≈ 10, log₂ 1,000,000 ≈ 20, log₂ 1,000,000,000 ≈ 30. That is why binary search over a billion sorted items needs only about 30 checks.' },
      { type: 'h2', text: 'Rule 1: drop the constants' },
      { type: 'p', text: 'Big-O describes the **shape** of growth, not the exact count. An algorithm that does `3n + 5` steps is `O(n)`. One that loops twice over the data (`2n`) is still `O(n)`. Constants depend on the machine and compiler; the shape does not.' },
      { type: 'code', title: 'Constants.cs', code: cs`
// 2n steps → O(n)
int min = int.MaxValue, max = int.MinValue;
foreach (int x in data) if (x < min) min = x;
foreach (int x in data) if (x > max) max = x;

// n/2 steps → still O(n)
for (int i = 0; i < data.Length / 2; i++)
    (data[i], data[^(i + 1)]) = (data[^(i + 1)], data[i]);`, output: '' },
      { type: 'h2', text: 'Rule 2: keep only the biggest term' },
      { type: 'p', text: 'If an algorithm does `n² + n + 100` steps, the `n²` part dominates as n grows (for n = 10,000 it is 100,000,000 against 10,100). So it is `O(n²)`.' },
      { type: 'code', title: 'BiggestTerm.cs', code: cs`
// Part 1: O(n)
foreach (var beam in beams) Validate(beam);

// Part 2: O(n²): every pair
for (int i = 0; i < beams.Length; i++)
    for (int j = i + 1; j < beams.Length; j++)
        CheckClash(beams[i], beams[j]);

// Total: O(n + n²) = O(n²)`, output: '' },
      { type: 'h2', text: 'Rule 3: different inputs get different letters' },
      { type: 'p', text: 'If a method works on two collections of unrelated sizes, do not call both “n”. Looping over `a` and then over `b` is `O(a + b)`. Looping over `b` inside a loop over `a` is `O(a × b)`.' },
      { type: 'code', title: 'TwoInputs.cs', code: cs`
// O(a + b)
foreach (var c in columns) Draw(c);
foreach (var b in beams) Draw(b);

// O(a × b)
foreach (var c in columns)
    foreach (var b in beams)
        if (Touches(c, b)) Connect(c, b);`, output: '' },
      { type: 'h2', text: 'Best, average and worst case' },
      { type: 'p', text: 'The same algorithm can do different amounts of work for different inputs of the same size. Linear search finds the first element in 1 step (best case), but a missing element needs n steps (worst case). On average it checks about half.' },
      { type: 'table', head: ['Case', 'Linear search', 'Used for'], rows: [
        ['Best', '`O(1)`: it is the first element', 'Rarely useful on its own'],
        ['Average', '`O(n)`: about n/2 checks', 'Typical real-world behaviour'],
        ['Worst', '`O(n)`: last element or not found', 'Guarantees: “never slower than this”']
      ] },
      { type: 'p', text: 'When people say “binary search is O(log n)” without saying which case, they mean the **worst case**. It is a promise: no input of size n will take longer.' },
      { type: 'h2', text: 'Big-O, Big-Ω and Big-Θ' },
      { type: 'ul', items: [
        '**Big-O** (O): an upper bound. “It grows no faster than this.”',
        '**Big-Omega** (Ω): a lower bound. “It grows at least this fast.” Any comparison sort is Ω(n log n).',
        '**Big-Theta** (Θ): both at once. “It grows exactly like this.” Merge sort is Θ(n log n).'
      ] },
      { type: 'p', text: 'In everyday conversation and interviews, people say Big-O and mean the tight bound. That is fine; just know the other two exist.' },
      { type: 'note', kind: 'warn', text: 'Big-O is about large inputs. For small n, constants matter: a simple O(n²) insertion sort can beat O(n log n) merge sort on 10 items. That is why .NET’s `Array.Sort` switches to insertion sort for small pieces. Big-O tells you how it **scales**, not which is faster on tiny data.' },
      { type: 'quiz', question: 'An algorithm does `5n² + 300n + 2000` steps. What is its Big-O?', options: ['`O(5n²)`', '`O(n²)`', '`O(n² + n)`', '`O(2000)`'], answer: 1, explain: 'Drop the constants (5, 300, 2000) and keep only the term that grows fastest: n².' },
      { type: 'quiz', question: 'An O(n²) algorithm takes 2 seconds for 10,000 items. About how long for 20,000 items?', options: ['2 seconds', '4 seconds', '8 seconds', '16 seconds'], answer: 2, explain: 'Doubling n multiplies n² by 4, so about 2 × 4 = 8 seconds.' },
      { type: 'quiz', question: 'Binary search on 1,000,000 sorted items needs about 20 checks. About how many for 2,000,000?', options: ['20', '21', '40', '400'], answer: 1, explain: 'O(log n): doubling n adds just one halving step.' },
      { type: 'exercise', task: 'Give the Big-O of each method below (n = `a.Length`).', hint: 'Count loops: one after another add, one inside another multiply, a fixed number of steps is O(1).', solution: cs`
int First(int[] a) => a[0];                       // O(1)

int Sum(int[] a)                                   // O(n)
{
    int s = 0;
    foreach (int x in a) s += x;
    return s;
}

bool HasPairWithSum(int[] a, int target)           // O(n²)
{
    for (int i = 0; i < a.Length; i++)
        for (int j = i + 1; j < a.Length; j++)
            if (a[i] + a[j] == target) return true;
    return false;
}

int SumFirstTen(int[] a)                           // O(1): at most 10 steps
{
    int s = 0;
    for (int i = 0; i < Math.Min(10, a.Length); i++) s += a[i];
    return s;
}` }
    ],
    keyPoints: [
      'Big-O describes how the work **grows** with the input size n, not the exact time.',
      'Common rates from fast to slow: O(1), O(log n), O(n), O(n log n), O(n²), O(2ⁿ), O(n!).',
      'Drop constants, keep the biggest term, and use different letters for different inputs.',
      'Unless stated otherwise, Big-O means the worst case.'
    ]
  },

  // ------------------------------------------------------------------ 3
  {
    slug: 'analysing-code',
    title: 'Counting steps in real code',
    summary: 'Work out the Big-O of real C# by looking at loop shapes, spot the hidden loops inside .NET methods, and know what input sizes each growth rate can handle.',
    minutes: 13,
    blocks: [
      { type: 'p', text: 'You do not need maths to find the Big-O of most code. Look at the **loops** and ask how many times the innermost line runs. A few simple rules cover nearly everything:' },
      { type: 'table', head: ['Code shape', 'Rule', 'Result'], rows: [
        ['Plain statements, no loops', 'A fixed number of steps', '`O(1)`'],
        ['One loop over n items', 'Body runs n times', '`O(n)`'],
        ['Loops one after another', '**Add** them, keep the biggest', '`O(n) + O(n) = O(n)`'],
        ['A loop inside a loop', '**Multiply** them', '`O(n) × O(n) = O(n²)`'],
        ['A loop that halves (or doubles) its variable', 'Runs log₂ n times', '`O(log n)`'],
        ['A method call inside a loop', 'Multiply by the cost of the call', 'loop × call']
      ] },
      { type: 'p', text: 'Check the rules with real numbers. This counter actually runs each loop and counts how often the inner line executes:' },
      { type: 'widget', name: 'step-counter' },
      { type: 'note', kind: 'tip', text: 'The “vs half n” column is the quickest test of Big-O. When n doubles: about ×1 means O(1) or O(log n), ×2 means O(n), a bit over ×2 means O(n log n), ×4 means O(n²).' },
      { type: 'h2', text: 'Inner loops that depend on the outer loop' },
      { type: 'p', text: 'When the inner loop starts at `i + 1`, it runs n−1 times, then n−2, then n−3… down to 0. That adds up to n(n−1)/2, about half of n². Half is a constant, so it is still `O(n²)`. This shape appears whenever you compare every pair of items once.' },
      { type: 'h2', text: 'Hidden loops in .NET methods' },
      { type: 'p', text: 'A single line can hide a whole loop. This is the most common reason that innocent-looking C# becomes slow:' },
      { type: 'code', title: 'Duplicates.cs', code: cs`
// Looks like one loop, but List.Contains is another loop inside → O(n²)
static bool HasDuplicateSlow(List<string> ids)
{
    var seen = new List<string>();
    foreach (var id in ids)
    {
        if (seen.Contains(id)) return true;   // O(n) scan every time!
        seen.Add(id);
    }
    return false;
}

// HashSet lookups take about one step each → O(n)
static bool HasDuplicateFast(List<string> ids)
{
    var seen = new HashSet<string>();
    foreach (var id in ids)
    {
        if (!seen.Add(id)) return true;       // Add returns false if already there
    }
    return false;
}`, output: '' },
      { type: 'p', text: 'With 100,000 IDs the slow version does up to 5 billion string comparisons; the fast version about 100,000 hash lookups. Know the cost of the methods you call:' },
      { type: 'table', head: ['Operation', 'Cost'], rows: [
        ['`list[i]`, `array[i]`, `list.Count`', '`O(1)`'],
        ['`list.Add(x)`', '`O(1)` on average (amortised; see Dynamic arrays)'],
        ['`list.Contains(x)`, `IndexOf`, `Remove(x)`', '`O(n)`: scans the list'],
        ['`list.Insert(0, x)`, `list.RemoveAt(0)`', '`O(n)`: shifts every element'],
        ['`dict[key]`, `TryGetValue`, `ContainsKey`, `HashSet.Contains`', '`O(1)` on average'],
        ['`Array.Sort`, `list.Sort`, LINQ `OrderBy`', '`O(n log n)`'],
        ['LINQ `Where`, `Select`, `Any`, `First`, `Count()`', '`O(n)` when enumerated'],
        ['`.ToList()`, `.ToArray()`', '`O(n)` time and `O(n)` memory'],
        ['`s = s + x` in a loop (strings)', '`O(n²)` in total: copies the whole string each time. Use `StringBuilder`.']
      ] },
      { type: 'note', kind: 'warn', text: 'LINQ inside a loop is a classic trap: `foreach (var b in beams) { var col = columns.First(c => c.Id == b.ColumnId); }` is O(beams × columns). Build a `Dictionary` of columns by Id once before the loop and it becomes O(beams + columns).' },
      { type: 'h2', text: 'What input size can each growth rate handle?' },
      { type: 'p', text: 'A modern CPU does roughly 100 million simple steps per second. That gives a useful rule of thumb for “will this finish in about a second?”, and it is exactly how competitive programmers choose an algorithm from the input limits:' },
      { type: 'table', head: ['Largest n for ~1 second', 'Algorithm must be'], rows: [
        ['about 10', '`O(n!)`'],
        ['about 20–25', '`O(2ⁿ)`'],
        ['about 500', '`O(n³)`'],
        ['about 10,000', '`O(n²)`'],
        ['about 1–10 million', '`O(n log n)`'],
        ['about 100 million', '`O(n)`'],
        ['anything', '`O(log n)` or `O(1)`']
      ] },
      { type: 'quiz', question: 'What is the Big-O of this code?\n`for (int i = 1; i < n; i *= 2) for (int j = 0; j < n; j++) count++;`', options: ['`O(n)`', '`O(log n)`', '`O(n log n)`', '`O(n²)`'], answer: 2, explain: 'The outer loop doubles `i`, so it runs about log₂ n times. The inner loop runs n times each time. Multiply: O(n log n).' },
      { type: 'quiz', question: '`foreach (var b in beams) if (names.Contains(b.Name)) count++;` where `names` is a `List<string>`. What is the cost, and what is the fix?', options: [
        'O(beams), nothing to fix',
        'O(beams × names); turn `names` into a `HashSet<string>` first',
        'O(names); sort the beams',
        'O(beams²); use a for loop instead of foreach'
      ], answer: 1, explain: '`List.Contains` scans the whole list for every beam. Build a `HashSet` once (O(names)), then each lookup is about O(1): total O(beams + names).' },
      { type: 'exercise', task: 'This method counts how many IDs from `a` also appear in `b`. Give its Big-O, then rewrite it to be O(a + b).', hint: 'Which line hides a loop? Which structure answers “is it in there?” in one step?', solution: cs`
// Original: O(a × b) because List.Contains scans b each time
static int CommonSlow(List<int> a, List<int> b)
{
    int count = 0;
    foreach (int x in a)
        if (b.Contains(x)) count++;
    return count;
}

// Faster: O(a + b)
static int CommonFast(List<int> a, List<int> b)
{
    var inB = new HashSet<int>(b);     // O(b), once
    int count = 0;
    foreach (int x in a)               // O(a)
        if (inB.Contains(x)) count++;  // O(1) each
    return count;
}

Console.WriteLine($"Common: {CommonFast([1, 2, 3, 4], [3, 4, 5])}");`, output: 'Common: 2' }
    ],
    keyPoints: [
      'Loops one after another add; loops inside loops multiply; halving loops are O(log n).',
      'A method call inside a loop multiplies the loop by the cost of the call.',
      '`List.Contains`, `IndexOf`, `Insert(0, …)` and LINQ queries are hidden O(n) loops.',
      'About 100 million simple steps per second: O(n²) is fine for 10,000 items, not for a million.'
    ]
  },

  // ------------------------------------------------------------------ 4
  {
    slug: 'space-complexity',
    title: 'Memory cost: space complexity',
    summary: 'Measure how much extra memory an algorithm needs, spot hidden memory such as recursion and copies, and trade memory for speed on purpose.',
    minutes: 11,
    blocks: [
      { type: 'p', text: 'Time is not the only cost. An algorithm also needs **memory**, and memory runs out too: an `OutOfMemoryException`, a `StackOverflowException`, or simply an app that slows down because the garbage collector is busy. **Space complexity** uses the same Big-O language to describe how memory use grows with n.' },
      { type: 'p', text: 'We usually count **auxiliary (extra) space**: the memory the algorithm needs on top of the input it was given. Summing an array needs a couple of variables (O(1) extra), even though the array itself holds n numbers.' },
      { type: 'widget', name: 'space-meter' },
      { type: 'h2', text: 'What uses memory?' },
      { type: 'table', head: ['Source', 'Example', 'Extra space'], rows: [
        ['A few local variables', '`int total, i;`', '`O(1)`'],
        ['A new array or collection sized by n', '`new int[n]`, `new List<T>(items)`', '`O(n)`'],
        ['Copies made by LINQ', '`.ToList()`, `.ToArray()`, `.OrderBy(...)`', '`O(n)`'],
        ['String building', 'Each `s + x` creates a new string', 'up to `O(n)` per step'],
        ['Recursion', 'Each call waiting on the stack', '`O(depth)`'],
        ['A table of pairs', '`new bool[n, n]`', '`O(n²)`']
      ] },
      { type: 'h2', text: 'Recursion uses hidden memory' },
      { type: 'p', text: 'Every method call that has not finished keeps a **stack frame** with its parameters and local variables. A recursive method that goes n calls deep uses O(n) stack space even if it creates no arrays. The default stack for a .NET thread is about 1 MB, so very deep recursion crashes with `StackOverflowException`, which cannot be caught.' },
      { type: 'code', title: 'StackDepth.cs', code: cs`
// O(n) extra space: n + 1 frames alive at the deepest point
static long SumTo(int n) => n == 0 ? 0 : n + SumTo(n - 1);

// O(1) extra space: same answer with a loop
static long SumToLoop(int n)
{
    long total = 0;
    for (int i = 1; i <= n; i++) total += i;
    return total;
}

Console.WriteLine(SumToLoop(1_000_000));
// SumTo(1_000_000) would most likely crash with StackOverflowException`, output: '500000500000' },
      { type: 'h2', text: 'Trading memory for time' },
      { type: 'p', text: 'Many fast algorithms are fast **because** they use extra memory. The duplicate check from the last lesson went from O(n²) time to O(n) time by spending O(n) memory on a `HashSet`. Caching results (memoisation, next lesson) is the same deal. This trade-off is usually worth it, because memory is cheap and waiting is expensive, but it is a choice, not a free lunch.' },
      { type: 'table', head: ['Approach', 'Time', 'Extra space'], rows: [
        ['Compare every pair', '`O(n²)`', '`O(1)`'],
        ['Sort first, then compare neighbours', '`O(n log n)`', '`O(1)` to `O(n)` depending on the sort'],
        ['Remember what you have seen in a `HashSet`', '`O(n)`', '`O(n)`']
      ] },
      { type: 'h2', text: 'In-place algorithms' },
      { type: 'p', text: 'An **in-place** algorithm changes the input directly and needs only O(1) extra memory, like reversing an array by swapping from both ends. In-place code saves memory and is often faster (fewer allocations, better use of the CPU cache), but it modifies the caller’s data. If the caller still needs the original, make a copy or document the behaviour clearly.' },
      { type: 'h2', text: 'How big is “n” in bytes?' },
      { type: 'table', head: ['Item', 'Size in .NET (64-bit)', '1 million of them'], rows: [
        ['`bool`, `byte`', '1 byte', '1 MB'],
        ['`int`, `float`', '4 bytes', '4 MB'],
        ['`long`, `double`', '8 bytes', '8 MB'],
        ['A reference to an object', '8 bytes', '8 MB (plus the objects)'],
        ['A small class object', '24+ bytes (header + fields)', '24+ MB'],
        ['`Point3D` struct of 3 doubles', '24 bytes', '24 MB']
      ] },
      { type: 'note', kind: 'info', text: 'O(n²) memory gets out of hand fast: a `double[n, n]` distance table for 50,000 points is 50,000 × 50,000 × 8 bytes = 20 GB. When a table would be that big, look for an algorithm that does not need every pair stored.' },
      { type: 'quiz', question: 'What is the extra space of `int[] Doubled(int[] a) => a.Select(x => x * 2).ToArray();`?', options: ['`O(1)`', '`O(log n)`', '`O(n)`', '`O(n²)`'], answer: 2, explain: '`ToArray()` creates a new array with n elements.' },
      { type: 'quiz', question: 'A recursive method calls itself with `n - 1` until `n == 0` and uses only a few local variables. What is its extra space?', options: ['`O(1)`: there are no arrays', '`O(n)`: n stack frames', '`O(log n)`', '`O(n²)`'], answer: 1, explain: 'Each unfinished call keeps a stack frame, and n calls are waiting at the deepest point.' },
      { type: 'exercise', task: 'A **sorted** array may contain repeated values. Remove the repeats **in place** so the first k slots hold each value once, and return k. Use O(1) extra space. Example: `{ 1, 1, 2, 3, 3, 3, 7 }` → k = 4 and the array starts `1, 2, 3, 7`.', hint: 'Keep a “write” index. Walk through the array with a “read” index; when the value differs from the last one written, copy it to the write position and move the write index forward.', solution: cs`
static int RemoveDuplicates(int[] a)
{
    if (a.Length == 0) return 0;
    int write = 1;                          // a[0] is always kept
    for (int read = 1; read < a.Length; read++)
    {
        if (a[read] != a[write - 1])        // a new value
            a[write++] = a[read];
    }
    return write;
}

int[] data = { 1, 1, 2, 3, 3, 3, 7 };
int k = RemoveDuplicates(data);
Console.WriteLine($"{k}: {string.Join(", ", data[..k])}");`, output: '4: 1, 2, 3, 7' }
    ],
    keyPoints: [
      'Space complexity describes how **extra** memory grows with n, in Big-O.',
      'New arrays, `ToList()`/`ToArray()`, string building and recursion depth all use memory.',
      'Fast algorithms often trade memory for time (HashSet, caching); make that choice consciously.',
      'In-place algorithms use O(1) extra space but change the input.'
    ]
  },

  // ------------------------------------------------------------------ 5
  {
    slug: 'recursion-for-dsa',
    title: 'Recursion, call trees and memoisation',
    summary: 'See recursion as a tree of calls, work out its cost from the tree, fix repeated work with memoisation, and recognise the recursion patterns behind famous algorithms.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'Many DSA algorithms (tree traversal, merge sort, quick sort, depth-first search, backtracking, dynamic programming) are recursive. To analyse them you need one new picture: the **call tree**.' },
      { type: 'note', kind: 'info', text: 'Quick recap: a recursive method calls itself on a smaller problem. It needs a **base case** that stops the recursion and a **recursive case** that moves towards it. The C# course lesson “Recursion” covers the basics step by step.' },
      { type: 'h2', text: 'The cost of recursion = number of calls × work per call' },
      { type: 'p', text: 'The Fibonacci numbers are 0, 1, 1, 2, 3, 5, 8, 13…: each is the sum of the two before. The definition turns directly into code:' },
      { type: 'code', title: 'Fib.cs', code: cs`
long calls = 0;                      // counts every call

long Fib(int n)
{
    calls++;
    if (n <= 1) return n;            // base cases: Fib(0) = 0, Fib(1) = 1
    return Fib(n - 1) + Fib(n - 2);  // two recursive calls
}

Console.WriteLine($"Fib(30) = {Fib(30)}, calls = {calls:N0}");`, output: 'Fib(30) = 832040, calls = 2,692,537' },
      { type: 'p', text: 'Short, correct, and terribly slow. Each call does O(1) work, but there are millions of calls. Draw the calls as a tree and the reason is obvious:' },
      { type: 'widget', name: 'call-tree' },
      { type: 'p', text: 'Every call splits into two, so the tree roughly doubles in size with each extra n: **O(2ⁿ)** calls (more precisely about 1.6ⁿ). Most of them are repeats: Fib(2) is calculated again and again.' },
      { type: 'h2', text: 'Memoisation: remember answers you already have' },
      { type: 'p', text: 'If a recursive method is called with the same argument many times and always returns the same answer, store each answer the first time and look it up after that. This is called **memoisation** (from “memo”, a note to yourself).' },
      { type: 'code', title: 'FibMemo.cs', code: cs`
static long Fib(int n, Dictionary<int, long> memo)
{
    if (n <= 1) return n;
    if (memo.TryGetValue(n, out long known)) return known;   // already solved

    long result = Fib(n - 1, memo) + Fib(n - 2, memo);
    memo[n] = result;                                         // remember it
    return result;
}

Console.WriteLine(Fib(90, new Dictionary<int, long>()));`, output: '2880067194370816120' },
      { type: 'p', text: 'Now each Fib(k) is calculated once: about 2n calls, **O(n)** time and O(n) memory for the memo and the stack. Fib(90) is instant, while the plain version would need about 9 billion billion calls.' },
      { type: 'h2', text: 'Or skip recursion: build up from the bottom' },
      { type: 'p', text: 'Once you see that each value depends only on the two before it, you can compute from the bottom up with a loop and keep just two variables: O(n) time and **O(1)** space. This bottom-up style is the heart of **dynamic programming**, which has its own lessons later.' },
      { type: 'code', title: 'FibLoop.cs', code: cs`
static long Fib(int n)
{
    long a = 0, b = 1;               // Fib(0), Fib(1)
    for (int i = 0; i < n; i++)
        (a, b) = (b, a + b);         // slide the window forward
    return a;
}

Console.WriteLine(Fib(90));`, output: '2880067194370816120' },
      { type: 'table', head: ['Version', 'Time', 'Extra space'], rows: [
        ['Plain recursion', '`O(2ⁿ)`', '`O(n)` stack'],
        ['Recursion + memo', '`O(n)`', '`O(n)` memo + stack'],
        ['Bottom-up loop', '`O(n)`', '`O(1)`']
      ] },
      { type: 'h2', text: 'Recursion patterns you will meet again' },
      { type: 'p', text: 'The shape of the call tree tells you the cost. These four shapes cover most algorithms in this course:' },
      { type: 'table', head: ['Pattern', 'Each call…', 'Cost', 'Example'], rows: [
        ['Linear', 'makes one call on n − 1', '`O(n)`', 'Sum of a list, factorial'],
        ['Halving', 'makes one call on n / 2', '`O(log n)`', 'Binary search, fast power'],
        ['Divide and conquer', 'makes two calls on n / 2, plus O(n) work', '`O(n log n)`', 'Merge sort'],
        ['Branching', 'makes two calls on n − 1 (or n − 1 and n − 2)', '`O(2ⁿ)`', 'Plain Fibonacci, all subsets']
      ] },
      { type: 'p', text: 'Here is a halving recursion. To compute xⁿ, compute x^(n/2) once and square it. Each call halves n, so it needs only about log₂ n calls instead of n multiplications:' },
      { type: 'code', title: 'Power.cs', code: cs`
static long Power(long x, int n)
{
    if (n == 0) return 1;
    long half = Power(x, n / 2);     // ONE recursive call on n/2
    return n % 2 == 0 ? half * half : half * half * x;
}

Console.WriteLine(Power(2, 10));
Console.WriteLine(Power(3, 5));`, output: '1024\n243' },
      { type: 'note', kind: 'warn', text: 'Writing `Power(x, n / 2) * Power(x, n / 2)` looks equivalent but makes **two** calls on n/2 each time. The tree branches and the cost goes back to O(n). Store the half in a variable and call once.' },
      { type: 'note', kind: 'tip', text: 'C# does not guarantee tail-call optimisation, so a recursion thousands of levels deep can overflow the stack. When the depth can grow with the input (a long linked list, a deep tree from user data), prefer a loop or an explicit `Stack<T>`.' },
      { type: 'quiz', question: 'A recursive method makes one call on `n / 2` and does O(1) other work. What is its time complexity?', options: ['`O(1)`', '`O(log n)`', '`O(n)`', '`O(2ⁿ)`'], answer: 1, explain: 'n is halved on every call, so there are about log₂ n calls, each doing O(1) work.' },
      { type: 'quiz', question: 'Why is plain recursive Fibonacci slow?', options: [
        'Recursion is always slower than loops.',
        'Each call does a lot of work.',
        'The same subproblems are solved over and over, so the number of calls grows exponentially.',
        'The `long` type is slow.'
      ], answer: 2, explain: 'Each call is cheap, but the call tree has about 1.6ⁿ nodes, mostly repeats. Memoisation removes the repeats.' },
      { type: 'exercise', task: 'You can climb a staircase 1 or 2 steps at a time. Write `Ways(int n)` that returns how many different ways there are to reach step n (Ways(0) = 1, Ways(1) = 1). Make it fast enough for n = 50 using memoisation.', hint: 'The last move was either 1 step (from n − 1) or 2 steps (from n − 2), so Ways(n) = Ways(n − 1) + Ways(n − 2). Store answers in a `long[]` of size n + 1.', solution: cs`
static long Ways(int n, long[] memo)
{
    if (n <= 1) return 1;
    if (memo[n] != 0) return memo[n];
    return memo[n] = Ways(n - 1, memo) + Ways(n - 2, memo);
}

Console.WriteLine(Ways(10, new long[11]));
Console.WriteLine(Ways(50, new long[51]));`, output: '89\n20365011074' }
    ],
    keyPoints: [
      'Draw recursion as a call tree: cost = number of calls × work per call.',
      'Two calls on n − 1 give an exponential tree; one call on n / 2 gives O(log n).',
      '**Memoisation** stores each answer the first time and turns repeated work into lookups.',
      'Bottom-up loops can give the same speed with O(1) space; this leads to dynamic programming.'
    ]
  }
];
