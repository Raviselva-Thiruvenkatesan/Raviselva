import { Lesson } from '../learn.types';
import { cs } from '../csharp/cs';

export const SEARCH_SORT: Lesson[] = [
  // ------------------------------------------------------------------ 12
  {
    slug: 'linear-binary-search',
    title: 'Linear search and binary search',
    summary: 'Search unsorted data one item at a time, then halve the search space on sorted data with binary search, and use the .NET methods correctly.',
    minutes: 13,
    blocks: [
      { type: 'p', text: 'Searching (“is this value here, and where?”) is one of the most common things programs do. There are two basic strategies, and which one you can use depends on one question: **is the data sorted?**' },
      { type: 'h2', text: 'Linear search: check everything' },
      { type: 'p', text: 'Look at each element in turn until you find the target or run out of elements. It works on any data, sorted or not.' },
      { type: 'code', title: 'LinearSearch.cs', code: cs`
static int LinearSearch(int[] a, int target)
{
    for (int i = 0; i < a.Length; i++)
        if (a[i] == target) return i;
    return -1;   // not found
}`, output: '' },
      { type: 'p', text: 'Best case 1 check, worst case n checks: **O(n)**. For a few hundred items, or a search you do only once, this is perfectly fine and the simplest correct answer.' },
      { type: 'h2', text: 'Binary search: halve the problem' },
      { type: 'p', text: 'If the array is **sorted**, you can do far better. Look at the middle element. If it is the target, done. If the target is bigger, it can only be in the right half; if smaller, only in the left half. Throw the other half away and repeat. Like looking up a word in a dictionary: you never read every page.' },
      { type: 'widget', name: 'binary-search' },
      { type: 'code', title: 'BinarySearch.cs', code: cs`
static int BinarySearch(int[] a, int target)
{
    int lo = 0, hi = a.Length - 1;          // the range that may still contain target
    while (lo <= hi)
    {
        int mid = lo + (hi - lo) / 2;       // middle of the range
        if (a[mid] == target) return mid;
        if (a[mid] < target) lo = mid + 1;  // discard the left half (and mid)
        else hi = mid - 1;                  // discard the right half (and mid)
    }
    return -1;                              // range is empty: not found
}

int[] lengths = { 3, 7, 11, 15, 18, 22, 27, 31 };
Console.WriteLine(BinarySearch(lengths, 22));
Console.WriteLine(BinarySearch(lengths, 20));`, output: '5\n-1' },
      { type: 'note', kind: 'warn', text: 'Write `mid = lo + (hi - lo) / 2`, not `(lo + hi) / 2`. For very large arrays `lo + hi` can overflow `int` and become negative. This exact bug sat in Java’s standard library for nine years.' },
      { type: 'h2', text: 'How fast is it?' },
      { type: 'p', text: 'Every check halves the remaining range. Starting from n items, after k checks about n / 2ᵏ remain, so at most about log₂ n + 1 checks are needed: **O(log n)**.' },
      { type: 'table', head: ['Sorted items', 'Linear search (worst)', 'Binary search (worst)'], rows: [
        ['1,000', '1,000 checks', '10 checks'],
        ['1,000,000', '1,000,000 checks', '20 checks'],
        ['1,000,000,000', '1,000,000,000 checks', '30 checks']
      ] },
      { type: 'h2', text: 'Binary search in .NET' },
      { type: 'p', text: '`Array.BinarySearch` and `List<T>.BinarySearch` are built in. When the value is not found they return a **negative** number: the bitwise complement (`~`) of the index where it **would** be inserted. That is useful for inserting into a sorted list.' },
      { type: 'code', title: 'DotNetBinarySearch.cs', code: cs`
int[] a = { 3, 7, 11, 15 };

Console.WriteLine(Array.BinarySearch(a, 11));   // found at index 2

int r = Array.BinarySearch(a, 8);
Console.WriteLine(r);                           // not found: negative
Console.WriteLine(~r);                          // 8 would go at index 2

// Keep a List sorted while inserting
var sorted = new List<int> { 3, 7, 11, 15 };
int pos = sorted.BinarySearch(8);
sorted.Insert(pos >= 0 ? pos : ~pos, 8);
Console.WriteLine(string.Join(", ", sorted));`, output: '2\n-3\n2\n3, 7, 8, 11, 15' },
      { type: 'note', kind: 'warn', text: 'Binary search on unsorted data does not throw an error. It just returns wrong answers. The data must be sorted by the same rule you search with (same comparer, same direction).' },
      { type: 'h2', text: 'Should I sort first?' },
      { type: 'p', text: 'Sorting costs O(n log n). For **one** search, a linear search (O(n)) is cheaper. If you search **many** times in data that does not change, sort once and every search becomes O(log n). If you only need “is it there?” and never need order, a `HashSet<T>` is even faster: O(1) per lookup.' },
      { type: 'table', head: ['Situation', 'Best choice'], rows: [
        ['Small or unsorted data, few searches', 'Linear search'],
        ['Sorted data, many searches, need order or ranges', 'Binary search'],
        ['Only “contains?” or lookup by key', '`HashSet<T>` / `Dictionary<K,V>`']
      ] },
      { type: 'quiz', question: 'Binary search on 64 sorted items: at most how many checks?', options: ['6', '7', '32', '64'], answer: 1, explain: 'log₂ 64 = 6 halvings bring the range down to one item, plus one final check: 7.' },
      { type: 'quiz', question: '`Array.BinarySearch(a, 50)` returns `-5`. What does it mean?', options: ['50 is at index 5', '50 is at index −5', '50 is not there; it would be inserted at index 4', 'The array is not sorted'], answer: 2, explain: '~(−5) = 4. A negative result is the complement of the insertion point.' },
      { type: 'exercise', task: 'Write `SearchInsert(int[] a, int target)` for a sorted array with no duplicates. Return the index of `target` if found, otherwise the index where it would be inserted to keep the array sorted. For `{ 1, 3, 5, 6 }`: 5 → 2, 2 → 1, 7 → 4, 0 → 0. Use binary search.', hint: 'Run the normal binary search. When the loop ends without finding the target, `lo` is exactly the insertion point.', solution: cs`
static int SearchInsert(int[] a, int target)
{
    int lo = 0, hi = a.Length - 1;
    while (lo <= hi)
    {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == target) return mid;
        if (a[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return lo;   // first index whose value is bigger than target
}

int[] a = { 1, 3, 5, 6 };
foreach (int t in new[] { 5, 2, 7, 0 })
    Console.Write(SearchInsert(a, t) + " ");`, output: '2 1 4 0 ' }
    ],
    keyPoints: [
      'Linear search works on any data and is O(n).',
      'Binary search needs sorted data and halves the range each step: O(log n).',
      'Use `mid = lo + (hi - lo) / 2` to avoid overflow.',
      '.NET’s `BinarySearch` returns `~insertionPoint` when the value is missing.'
    ]
  },

  // ------------------------------------------------------------------ 13
  {
    slug: 'binary-search-variants',
    title: 'Binary search: bounds and searching for answers',
    summary: 'Turn every binary search into “find the first true”, handle duplicates with lower and upper bound, and binary-search over possible answers instead of array positions.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'The basic binary search finds **a** matching index. Real questions are often different: “where does the first 12 start?”, “how many beams are between 4 m and 8 m long?”, “what is the smallest crane capacity that works?”. One idea solves all of them.' },
      { type: 'h2', text: 'The key idea: find the first true' },
      { type: 'p', text: 'Ask a yes/no question about each position, such as “is `a[i] >= 12`?”. In a sorted array the answers always look like **F F F F T T T**: all false, then all true. Binary search can find the boundary, the **first true**, in O(log n), whatever the question is, as long as the answers have that shape.' },
      { type: 'widget', name: 'bounds-finder' },
      { type: 'h2', text: 'Lower bound and upper bound' },
      { type: 'ul', items: [
        '**Lower bound** of x: the first index with `a[i] >= x`. If x is present, this is its first occurrence.',
        '**Upper bound** of x: the first index with `a[i] > x`. This is just after the last occurrence.',
        'The number of copies of x is `upper − lower`. Values in a range `[from, to]` are `UpperBound(to) − LowerBound(from)`.'
      ] },
      { type: 'code', title: 'Bounds.cs', code: cs`
// Half-open range [lo, hi): hi starts at Length, "past the end" is a valid answer
static int LowerBound(int[] a, int x)
{
    int lo = 0, hi = a.Length;
    while (lo < hi)
    {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] >= x) hi = mid;    // mid could be the first true: keep it
        else lo = mid + 1;            // mid is false: the answer is after it
    }
    return lo;                        // lo == hi: the first true (or Length)
}

static int UpperBound(int[] a, int x)
{
    int lo = 0, hi = a.Length;
    while (lo < hi)
    {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] > x) hi = mid;
        else lo = mid + 1;
    }
    return lo;
}

int[] a = { 2, 4, 4, 4, 7, 7, 9, 12, 12, 12, 12, 15 };
Console.WriteLine($"12 starts at {LowerBound(a, 12)}, count {UpperBound(a, 12) - LowerBound(a, 12)}");
Console.WriteLine($"values in [4, 9]: {UpperBound(a, 9) - LowerBound(a, 4)}");`, output: '12 starts at 7, count 4\nvalues in [4, 9]: 6' },
      { type: 'note', kind: 'tip', text: 'This one template (`lo < hi`, `hi = mid` when true, `lo = mid + 1` when false) never loops forever and never skips the answer. Learn it once and change only the condition.' },
      { type: 'h2', text: 'Binary search on the answer' },
      { type: 'p', text: 'Sometimes there is no array to search at all. Instead you search over **possible answers**. If you can write a check “does answer X work?”, and the check is monotonic (once X works, every bigger X works too), then the answers again look like F F F T T T, and binary search finds the smallest X that works.' },
      { type: 'p', text: 'Example: drawing tasks take `[7, 2, 5, 10, 8]` hours and must be split, **in order**, among 2 drafters. What is the smallest possible maximum workload for one drafter? A limit of 10 does not work (it needs 4 drafters); 32 (everything to one person) always works. Somewhere in between is the smallest limit that works.' },
      { type: 'code', title: 'SplitWork.cs', code: cs`
// Can the tasks be split, in order, into at most k groups, each with total <= limit?
static bool CanSplit(int[] tasks, int k, int limit)
{
    int groups = 1, current = 0;
    foreach (int t in tasks)
    {
        if (current + t > limit) { groups++; current = 0; }   // start a new drafter
        current += t;
    }
    return groups <= k;
}

static int MinLargestWorkload(int[] tasks, int k)
{
    int lo = tasks.Max(), hi = tasks.Sum();   // the answer is somewhere in here
    while (lo < hi)
    {
        int mid = lo + (hi - lo) / 2;
        if (CanSplit(tasks, k, mid)) hi = mid; // works: try smaller
        else lo = mid + 1;                     // too small: go bigger
    }
    return lo;
}

Console.WriteLine(MinLargestWorkload([7, 2, 5, 10, 8], 2));`, output: '18' },
      { type: 'p', text: 'The check is O(n) and the answer range is up to S = sum of all tasks, so the whole thing is **O(n log S)**. The same pattern solves “minimum capacity to ship within D days”, “smallest bar length that can be cut into k pieces”, “minimum speed to finish in time” and many more.' },
      { type: 'h2', text: 'Last true: the integer square root' },
      { type: 'p', text: 'When the answers look like T T T F F F and you want the **last** true, move `lo` up on true. Round `mid` **up** so the range always shrinks:' },
      { type: 'code', title: 'ISqrt.cs', code: cs`
// Largest x with x * x <= n
static long ISqrt(long n)
{
    long lo = 0, hi = n;
    while (lo < hi)
    {
        long mid = lo + (hi - lo + 1) / 2;   // round up, or lo = mid could loop forever
        if (mid <= n / mid) lo = mid;        // mid*mid <= n, written to avoid overflow
        else hi = mid - 1;
    }
    return lo;
}

Console.WriteLine(ISqrt(26));
Console.WriteLine(ISqrt(1_000_000));`, output: '5\n1000' },
      { type: 'note', kind: 'warn', text: 'The two classic binary search bugs: an infinite loop when `lo = mid` with `mid` rounded down (the range stops shrinking), and an off-by-one when the loop condition and the updates do not agree (`lo <= hi` belongs with `hi = mid - 1`; `lo < hi` belongs with `hi = mid`). Pick one template and stick to it.' },
      { type: 'quiz', question: 'In `{ 1, 3, 3, 3, 8 }`, what are LowerBound(3) and UpperBound(3)?', options: ['1 and 3', '1 and 4', '0 and 4', '2 and 4'], answer: 1, explain: 'The first 3 is at index 1; the first value greater than 3 (the 8) is at index 4. Count = 4 − 1 = 3.' },
      { type: 'quiz', question: 'When can you binary-search over possible answers?', options: [
        'Whenever the input array is sorted',
        'When the check “does X work?” is monotonic: once true, it stays true for bigger X',
        'Only for integer square roots',
        'When the answer is less than 1,000'
      ], answer: 1, explain: 'Monotonic answers form F…F T…T, which is exactly what binary search needs. The input itself does not have to be sorted.' },
      { type: 'exercise', task: 'Given a sorted array that may contain duplicates, return the first and last index of `target`, or `(-1, -1)` if it is missing. For `{ 5, 7, 7, 8, 8, 10 }`: 8 → (3, 4), 6 → (−1, −1). Use LowerBound and UpperBound.', hint: 'first = LowerBound(target). If first is past the end or `a[first] != target`, it is missing. Otherwise last = UpperBound(target) − 1.', solution: cs`
static (int First, int Last) SearchRange(int[] a, int target)
{
    int first = LowerBound(a, target);
    if (first == a.Length || a[first] != target) return (-1, -1);
    return (first, UpperBound(a, target) - 1);
}

int[] a = { 5, 7, 7, 8, 8, 10 };
Console.WriteLine(SearchRange(a, 8));
Console.WriteLine(SearchRange(a, 6));`, output: '(3, 4)\n(-1, -1)' }
    ],
    keyPoints: [
      'Every binary search can be phrased as “find the first true” on F…F T…T answers.',
      'Lower bound = first `a[i] >= x`, upper bound = first `a[i] > x`; their difference counts copies.',
      'Binary search on the answer: if “does X work?” is monotonic, search the range of X.',
      'Use one template consistently to avoid infinite loops and off-by-one errors.'
    ]
  },

  // ------------------------------------------------------------------ 14
  {
    slug: 'simple-sorts',
    title: 'Bubble, selection and insertion sort',
    summary: 'Three simple O(n²) sorting algorithms, how they differ in comparisons, swaps and stability, and why insertion sort is still used inside .NET today.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'Sorting means putting items in order. It makes searching fast (binary search), makes duplicates sit next to each other, and makes reports readable. The three simple sorts below are not what you use for a million items, but they teach the basic moves every sorting algorithm uses, and one of them is still used inside professional libraries.' },
      { type: 'widget', name: 'sort-stepper' },
      { type: 'h2', text: 'Bubble sort' },
      { type: 'p', text: 'Walk through the array comparing neighbours and swap them if they are in the wrong order. After the first pass the largest value has “bubbled” to the end. Repeat on the rest. If a whole pass makes no swaps, the array is sorted and you can stop early.' },
      { type: 'code', title: 'BubbleSort.cs', code: cs`
static void BubbleSort(int[] a)
{
    for (int pass = 0; pass < a.Length - 1; pass++)
    {
        bool swapped = false;
        for (int j = 0; j < a.Length - 1 - pass; j++)   // the last 'pass' items are done
        {
            if (a[j] > a[j + 1])
            {
                (a[j], a[j + 1]) = (a[j + 1], a[j]);
                swapped = true;
            }
        }
        if (!swapped) break;   // already sorted
    }
}`, output: '' },
      { type: 'h2', text: 'Selection sort' },
      { type: 'p', text: 'Find the smallest value in the unsorted part and swap it to the front of that part. Repeat. It always does the same number of comparisons, but at most n − 1 swaps, which helps when writing to memory is expensive.' },
      { type: 'code', title: 'SelectionSort.cs', code: cs`
static void SelectionSort(int[] a)
{
    for (int i = 0; i < a.Length - 1; i++)
    {
        int min = i;
        for (int j = i + 1; j < a.Length; j++)
            if (a[j] < a[min]) min = j;

        if (min != i) (a[i], a[min]) = (a[min], a[i]);
    }
}`, output: '' },
      { type: 'h2', text: 'Insertion sort' },
      { type: 'p', text: 'Keep the left part sorted. Take the next value (the “key”), and shift bigger values one place right until you find the key’s spot, exactly like sorting playing cards in your hand.' },
      { type: 'code', title: 'InsertionSort.cs', code: cs`
static void InsertionSort(int[] a)
{
    for (int i = 1; i < a.Length; i++)
    {
        int key = a[i];
        int j = i - 1;
        while (j >= 0 && a[j] > key)   // shift bigger values right
        {
            a[j + 1] = a[j];
            j--;
        }
        a[j + 1] = key;                // drop the key into the gap
    }
}

int[] data = { 5, 2, 8, 1, 9, 3, 7, 4 };
InsertionSort(data);
Console.WriteLine(string.Join(" ", data));`, output: '1 2 3 4 5 7 8 9' },
      { type: 'h2', text: 'Comparing them' },
      { type: 'table', head: ['', 'Bubble', 'Selection', 'Insertion'], rows: [
        ['Best case', '`O(n)` (sorted, early exit)', '`O(n²)`', '`O(n)` (sorted)'],
        ['Average / worst', '`O(n²)`', '`O(n²)`', '`O(n²)`'],
        ['Swaps / writes', 'Many', 'At most n − 1 swaps', 'Many shifts'],
        ['Extra memory', '`O(1)`', '`O(1)`', '`O(1)`'],
        ['Stable?', 'Yes', 'No', 'Yes'],
        ['Good for', 'Teaching', 'Few writes', 'Small or nearly sorted data']
      ] },
      { type: 'p', text: 'A sort is **stable** if items with equal keys keep their original order. Sort a beam schedule by profile with a stable sort and the beams within each profile stay in the order they were. Selection sort is not stable because its long-distance swap can jump an item over an equal one. Stability gets its own section in the .NET sorting lesson.' },
      { type: 'h2', text: 'Why insertion sort still matters' },
      { type: 'p', text: 'Insertion sort does very little work when the data is **nearly sorted**: each item only shifts a short distance, so it approaches O(n). For tiny arrays it also beats the clever algorithms, because it has almost no overhead. That is why .NET’s `Array.Sort` switches to insertion sort for pieces of 16 elements or fewer.' },
      { type: 'note', kind: 'info', text: 'An **inversion** is a pair of items in the wrong order. Insertion sort does exactly one shift per inversion. A sorted array has 0 inversions; a reversed one has n(n−1)/2. That is why the input order changes its running time so much.' },
      { type: 'quiz', question: 'Which simple sort makes at most n − 1 swaps?', options: ['Bubble sort', 'Selection sort', 'Insertion sort', 'None of them'], answer: 1, explain: 'Selection sort does one swap per position at most. It still needs n(n−1)/2 comparisons.' },
      { type: 'quiz', question: 'A list of 10,000 readings is already sorted except for two neighbouring values. Which simple sort finishes fastest?', options: ['Selection sort', 'Insertion sort (or bubble with early exit)', 'They are all O(n²) here', 'None: you must use quick sort'], answer: 1, explain: 'Insertion sort makes one shift for the single inversion and about n comparisons: O(n). Selection sort always does n(n−1)/2 comparisons.' },
      { type: 'exercise', task: 'Change insertion sort to sort beam lengths (`double[]`) in **descending** order: `{ 4.5, 6.0, 3.0, 7.2, 6.0 }` → `7.2, 6, 6, 4.5, 3`.', hint: 'Only the comparison in the while loop changes: shift values that are smaller than the key.', solution: cs`
static void InsertionSortDescending(double[] a)
{
    for (int i = 1; i < a.Length; i++)
    {
        double key = a[i];
        int j = i - 1;
        while (j >= 0 && a[j] < key)   // was: a[j] > key
        {
            a[j + 1] = a[j];
            j--;
        }
        a[j + 1] = key;
    }
}

double[] lengths = { 4.5, 6.0, 3.0, 7.2, 6.0 };
InsertionSortDescending(lengths);
Console.WriteLine(string.Join(", ", lengths));`, output: '7.2, 6, 6, 4.5, 3' }
    ],
    keyPoints: [
      'Bubble, selection and insertion sort are O(n²) in the average and worst case and need O(1) extra memory.',
      'Insertion sort is O(n) on nearly sorted data and is used for small pieces inside `Array.Sort`.',
      'Selection sort minimises swaps but is not stable.',
      'A stable sort keeps equal items in their original order.'
    ]
  },

  // ------------------------------------------------------------------ 15
  {
    slug: 'merge-sort',
    title: 'Merge sort',
    summary: 'Divide the array in half, sort each half, merge the sorted halves: a guaranteed O(n log n), stable sort, and the merge step you will reuse in many problems.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'Merge sort is the classic **divide and conquer** algorithm. It rests on one easy fact: merging two lists that are **already sorted** into one sorted list is fast. You only ever need to compare the two front items.' },
      { type: 'ol', items: [
        '**Divide:** split the array into two halves.',
        '**Conquer:** sort each half (recursively, with merge sort).',
        '**Combine:** merge the two sorted halves.'
      ] },
      { type: 'p', text: 'The recursion stops at pieces of one item, which are sorted by definition. Try the merge step first, then watch the whole sort:' },
      { type: 'widget', name: 'merge-viz' },
      { type: 'h2', text: 'The code' },
      { type: 'code', title: 'MergeSort.cs', code: cs`
static void MergeSort(int[] a)
{
    var buffer = new int[a.Length];          // one shared buffer: O(n) extra memory
    Sort(a, buffer, 0, a.Length - 1);
}

static void Sort(int[] a, int[] buffer, int lo, int hi)
{
    if (lo >= hi) return;                    // 0 or 1 item: already sorted
    int mid = lo + (hi - lo) / 2;
    Sort(a, buffer, lo, mid);                // sort the left half
    Sort(a, buffer, mid + 1, hi);            // sort the right half
    Merge(a, buffer, lo, mid, hi);           // combine
}

static void Merge(int[] a, int[] buffer, int lo, int mid, int hi)
{
    int i = lo, j = mid + 1, k = lo;
    while (i <= mid && j <= hi)
        buffer[k++] = a[i] <= a[j] ? a[i++] : a[j++];   // <= keeps it stable
    while (i <= mid) buffer[k++] = a[i++];              // leftovers
    while (j <= hi)  buffer[k++] = a[j++];
    Array.Copy(buffer, lo, a, lo, hi - lo + 1);         // copy back
}

int[] data = { 38, 27, 43, 3, 9, 82, 10, 1 };
MergeSort(data);
Console.WriteLine(string.Join(" ", data));`, output: '1 3 9 10 27 38 43 82' },
      { type: 'note', kind: 'tip', text: 'Using `<=` (not `<`) when the two front items are equal takes the **left** one first. Equal items therefore keep their original order, which makes merge sort **stable**.' },
      { type: 'h2', text: 'Why O(n log n)?' },
      { type: 'p', text: 'Draw the recursion as a tree. Each level splits every piece in half, so there are **log₂ n levels**. At every level, the merges together touch each of the n items once: **O(n) work per level**. Total: O(n) × log n = **O(n log n)**. This holds for every input, sorted, reversed or random: merge sort has no bad case.' },
      { type: 'table', head: ['Property', 'Merge sort'], rows: [
        ['Time (best, average, worst)', '`O(n log n)`'],
        ['Extra memory', '`O(n)` for the buffer (+ `O(log n)` stack)'],
        ['Stable', 'Yes'],
        ['In place', 'No (for arrays)']
      ] },
      { type: 'h2', text: 'Where merge sort shines' },
      { type: 'ul', items: [
        '**Guaranteed performance:** no input can make it slow, which matters for real-time or safety-related code.',
        '**Stability:** sorting by several keys one after another works.',
        '**Linked lists:** merging relinks nodes, so it needs no extra buffer and no random access. It is the standard way to sort a linked list.',
        '**Huge data (external sorting):** sort chunks that fit in memory, write them to disk, then merge the sorted files. Databases do exactly this for big `ORDER BY` queries.'
      ] },
      { type: 'note', kind: 'info', text: 'The merge idea appears far beyond sorting: combining two sorted query results, merging sorted change logs, finding the union or intersection of two sorted ID lists, and counting inversions in O(n log n).' },
      { type: 'quiz', question: 'How many levels of splitting does merge sort need for 1,024 items?', options: ['2', '10', '512', '1,024'], answer: 1, explain: '1,024 = 2¹⁰, so halving 10 times reaches pieces of one item.' },
      { type: 'quiz', question: 'What is the main disadvantage of merge sort on arrays?', options: ['It is O(n²) on sorted input', 'It is not stable', 'It needs O(n) extra memory for merging', 'It only works on integers'], answer: 2, explain: 'Merging into place is complicated, so array merge sort uses a buffer as big as the input.' },
      { type: 'exercise', task: 'Two sorted arrays of beam IDs may share some IDs. Merge them into one sorted list **without duplicates** in a single O(a + b) pass. `{ 1, 3, 5, 7 }` and `{ 2, 3, 6, 7, 9 }` → `1 2 3 5 6 7 9`.', hint: 'Use the merge loop. When the two front values are equal, take one and advance both indexes. Only add a value if it differs from the last one added.', solution: cs`
static List<int> Union(int[] a, int[] b)
{
    var result = new List<int>();
    int i = 0, j = 0;
    while (i < a.Length || j < b.Length)
    {
        int v;
        if (j >= b.Length || (i < a.Length && a[i] < b[j])) v = a[i++];
        else if (i >= a.Length || b[j] < a[i]) v = b[j++];
        else { v = a[i]; i++; j++; }            // equal: take once

        if (result.Count == 0 || result[^1] != v)
            result.Add(v);
    }
    return result;
}

Console.WriteLine(string.Join(" ", Union([1, 3, 5, 7], [2, 3, 6, 7, 9])));`, output: '1 2 3 5 6 7 9' }
    ],
    keyPoints: [
      'Merge sort splits in half, sorts each half recursively, and merges the sorted halves.',
      'Merging two sorted lists is O(n): compare only the front items.',
      'log n levels × O(n) per level = O(n log n) for every input.',
      'It is stable but needs O(n) extra memory on arrays; it is ideal for linked lists and huge files.'
    ]
  },

  // ------------------------------------------------------------------ 16
  {
    slug: 'quick-sort',
    title: 'Quick sort',
    summary: 'Partition around a pivot, recurse on both sides, see why a bad pivot makes it O(n²), and how .NET’s introsort and quickselect build on it.',
    minutes: 16,
    blocks: [
      { type: 'p', text: 'Quick sort is also divide and conquer, but it does the hard work **before** recursing instead of after. Pick one value, the **pivot**, and rearrange the array so every smaller value is on its left and every larger value is on its right. The pivot is now in its final position. Then sort the left part and the right part the same way. No merge step is needed.' },
      { type: 'widget', name: 'quick-viz' },
      { type: 'h2', text: 'Partitioning (Lomuto scheme)' },
      { type: 'p', text: 'Put the pivot at the end. Walk through the other values with `j`, and keep a boundary `i`: everything before `i` is smaller than the pivot. When `a[j]` is smaller, swap it to position `i` and move the boundary. Finally swap the pivot to position `i`.' },
      { type: 'code', title: 'QuickSort.cs', code: cs`
static void QuickSort(int[] a, int lo, int hi)
{
    if (lo >= hi) return;
    int p = Partition(a, lo, hi);    // pivot ends at index p, in its final place
    QuickSort(a, lo, p - 1);         // smaller values
    QuickSort(a, p + 1, hi);         // bigger values
}

static int Partition(int[] a, int lo, int hi)
{
    int mid = lo + (hi - lo) / 2;
    (a[mid], a[hi]) = (a[hi], a[mid]);   // use the middle value as pivot, moved to the end
    int pivot = a[hi];

    int i = lo;                          // a[lo..i-1] < pivot
    for (int j = lo; j < hi; j++)
    {
        if (a[j] < pivot)
        {
            (a[i], a[j]) = (a[j], a[i]);
            i++;
        }
    }
    (a[i], a[hi]) = (a[hi], a[i]);       // pivot into its final place
    return i;
}

int[] data = { 7, 2, 9, 4, 10, 1, 6, 3, 8, 5 };
QuickSort(data, 0, data.Length - 1);   // sort the whole array
Console.WriteLine(string.Join(" ", data));`, output: '1 2 3 4 5 6 7 8 9 10' },
      { type: 'h2', text: 'Good pivots, bad pivots' },
      { type: 'p', text: 'If the pivot splits the array roughly in half every time, there are about log n levels, each doing O(n) work: **O(n log n)**. If the pivot is always the smallest or largest value, each partition removes only one item. Then there are n levels: **O(n²)**, and the recursion can be deep enough to overflow the stack. Taking the **last** item as pivot on already sorted data does exactly that; try it in the widget above.' },
      { type: 'table', head: ['Pivot choice', 'Effect'], rows: [
        ['First or last item', 'Simple, but O(n²) on sorted or reversed input, which is common in practice'],
        ['Middle item', 'Fixes sorted input; some crafted inputs are still bad'],
        ['Random item', 'Bad cases become extremely unlikely, for any input'],
        ['Median of three (first, middle, last)', 'Cheap and good in practice; used in many libraries']
      ] },
      { type: 'h2', text: 'Quick sort in .NET: introsort' },
      { type: 'p', text: '`Array.Sort`, `List<T>.Sort` and `Span<T>.Sort` use **introsort** (introspective sort): quick sort with a median-of-three pivot, plus two safety nets. Pieces of 16 or fewer items are finished with **insertion sort**. If the recursion gets suspiciously deep (a bad-pivot input), it switches to **heap sort**, which is always O(n log n). You get quick sort’s speed with a guaranteed worst case.' },
      { type: 'table', head: ['Property', 'Quick sort'], rows: [
        ['Time', 'Average `O(n log n)`, worst `O(n²)`'],
        ['Extra memory', '`O(log n)` stack on average (in place otherwise)'],
        ['Stable', 'No'],
        ['In practice', 'Usually the fastest comparison sort on arrays: tight loops, cache-friendly']
      ] },
      { type: 'note', kind: 'info', text: 'Why is quick sort usually faster than merge sort, when both are O(n log n)? It sorts in place (no buffer to copy to and from) and its inner loop is a simple scan through memory, which the CPU cache loves.' },
      { type: 'h2', text: 'Bonus: quickselect' },
      { type: 'p', text: 'To find the k-th smallest value you do not need to sort everything. After one partition you know the pivot’s exact rank. If it is the one you want, stop; otherwise continue in **one** side only. On average that is n + n/2 + n/4 + … ≈ 2n steps: **O(n)**.' },
      { type: 'code', title: 'QuickSelect.cs', code: cs`
// k = 1 means the smallest value
static int KthSmallest(int[] a, int k)
{
    int lo = 0, hi = a.Length - 1, target = k - 1;
    while (true)
    {
        int p = Partition(a, lo, hi);   // the same Partition as above
        if (p == target) return a[p];
        if (p < target) lo = p + 1;     // the answer is on the right
        else hi = p - 1;                // the answer is on the left
    }
}

Console.WriteLine(KthSmallest([7, 2, 9, 4, 10, 1, 6, 3, 8, 5], 3));`, output: '3' },
      { type: 'quiz', question: 'After one call to `Partition`, what do you know for sure?', options: [
        'The whole array is sorted.',
        'The pivot is in its final sorted position; everything left of it is smaller and everything right is not smaller.',
        'The left half is sorted.',
        'The smallest value is at index 0.'
      ], answer: 1, explain: 'Partition only guarantees the pivot’s position and which side each value is on. Both sides are still unsorted.' },
      { type: 'quiz', question: 'Quick sort with “last item as pivot” is given an array that is already sorted. What happens?', options: ['It finishes in O(n)', 'It runs in O(n log n) as usual', 'Every partition removes only the pivot, so it is O(n²) and recursion is n levels deep', 'It throws an exception'], answer: 2, explain: 'The last item is the largest, so each partition leaves n − 1 items on one side. This is the classic worst case.' },
      { type: 'exercise', task: 'An array contains only 0s, 1s and 2s (for example, status codes). Sort it in **one pass** with O(1) extra space: `{ 2, 0, 2, 1, 1, 0 }` → `0 0 1 1 2 2`. This is the “Dutch national flag” problem, a three-way partition.', hint: 'Keep three regions with indexes `low`, `mid`, `high`: 0s before `low`, 1s between `low` and `mid`, 2s after `high`. Look at `a[mid]`: a 0 swaps to `low` (advance both), a 1 just advances `mid`, a 2 swaps to `high` (decrease `high`, do not advance `mid`).', solution: cs`
static void SortColors(int[] a)
{
    int low = 0, mid = 0, high = a.Length - 1;
    while (mid <= high)
    {
        if (a[mid] == 0)
        {
            (a[low], a[mid]) = (a[mid], a[low]);
            low++; mid++;
        }
        else if (a[mid] == 1)
        {
            mid++;
        }
        else
        {
            (a[mid], a[high]) = (a[high], a[mid]);
            high--;            // the swapped-in value is unchecked: keep mid
        }
    }
}

int[] a = { 2, 0, 2, 1, 1, 0 };
SortColors(a);
Console.WriteLine(string.Join(" ", a));`, output: '0 0 1 1 2 2' }
    ],
    keyPoints: [
      'Quick sort partitions around a pivot (smaller left, bigger right), then sorts each side.',
      'Average O(n log n), in place, not stable; a bad pivot gives O(n²).',
      '.NET uses introsort: quick sort + insertion sort for small pieces + heap sort as a safety net.',
      'Quickselect finds the k-th smallest value in O(n) on average.'
    ]
  },

  // ------------------------------------------------------------------ 17
  {
    slug: 'counting-radix-sort',
    title: 'Counting sort and radix sort',
    summary: 'Why comparison sorts cannot beat O(n log n), and how counting sort and radix sort beat it anyway for small integer keys.',
    minutes: 13,
    blocks: [
      { type: 'p', text: 'Every sort so far works by **comparing** two items. It can be proved that any comparison-based sort needs about **n log n** comparisons in the worst case. There are n! possible orders of n items, and each yes/no comparison can at best halve the remaining possibilities, so you need log₂(n!) ≈ n log₂ n comparisons to identify the right one.' },
      { type: 'p', text: 'To go faster you must stop comparing and use the **values themselves**. That only works when the keys are small whole numbers (or can be split into them), but when they are, the speed-up is real.' },
      { type: 'h2', text: 'Counting sort' },
      { type: 'p', text: 'If every value is between 0 and k − 1, make an array of k counters. One pass counts how often each value appears. A running total turns counts into positions (“values ≤ 3 fill the first 7 slots”). A final pass places each item directly into its slot.' },
      { type: 'widget', name: 'counting-sort' },
      { type: 'code', title: 'CountingSort.cs', code: cs`
static int[] CountingSort(int[] a)
{
    if (a.Length == 0) return a;
    int min = a.Min(), max = a.Max();
    var count = new int[max - min + 1];          // k = range of values

    foreach (int v in a) count[v - min]++;       // 1. count

    for (int i = 1; i < count.Length; i++)       // 2. running totals = end positions
        count[i] += count[i - 1];

    var output = new int[a.Length];
    for (int i = a.Length - 1; i >= 0; i--)      // 3. place, right to left = stable
        output[--count[a[i] - min]] = a[i];
    return output;
}

Console.WriteLine(string.Join(" ", CountingSort([4, 1, 3, 4, 0, 2, 1, 4, 3, 1])));
Console.WriteLine(string.Join(" ", CountingSort([3, -2, 0, 3, 1])));`, output: '0 1 1 1 2 3 3 4 4 4\n-2 0 1 3 3' },
      { type: 'p', text: 'Time **O(n + k)**, extra space O(n + k). When k is small compared with n (exam marks 0 to 100, floor numbers, ages, status codes) this beats any comparison sort. When k is huge (values up to a billion), the counter array becomes the problem.' },
      { type: 'note', kind: 'tip', text: 'Walking the input right to left in step 3 makes counting sort **stable**: equal values are placed from the back, so they end up in their original order. Radix sort depends on this.' },
      { type: 'h2', text: 'Radix sort' },
      { type: 'p', text: 'Radix sort handles large numbers by sorting on **one digit at a time**, starting with the least significant digit (LSD). Each pass is a stable counting sort with only 10 possible keys (0 to 9). After the ones pass, the tens pass, and the hundreds pass, the numbers are fully sorted, because the stable passes keep the earlier digit order inside each group.' },
      { type: 'code', title: 'RadixSort.cs', code: cs`
// LSD radix sort for non-negative integers, base 10
static void RadixSort(int[] a)
{
    if (a.Length == 0) return;
    int max = a.Max();
    var output = new int[a.Length];

    for (int exp = 1; max / exp > 0; exp *= 10)          // 1, 10, 100, ...
    {
        var count = new int[10];
        foreach (int v in a) count[v / exp % 10]++;
        for (int d = 1; d < 10; d++) count[d] += count[d - 1];
        for (int i = a.Length - 1; i >= 0; i--)          // stable
            output[--count[a[i] / exp % 10]] = a[i];
        Array.Copy(output, a, a.Length);
    }
}

int[] data = { 170, 45, 75, 90, 802, 24, 2, 66 };
RadixSort(data);
Console.WriteLine(string.Join(" ", data));`, output: '2 24 45 66 75 90 170 802' },
      { type: 'p', text: 'With d digits and base b, radix sort is **O(d × (n + b))**. For 32-bit integers, real implementations use base 256 (one byte per pass): just 4 passes over the data, whatever n is.' },
      { type: 'table', head: ['Algorithm', 'Time', 'Works for', 'Stable'], rows: [
        ['Comparison sorts (merge, quick)', '`O(n log n)`', 'Anything you can compare', 'Merge: yes, quick: no'],
        ['Counting sort', '`O(n + k)`', 'Small integer range k', 'Yes'],
        ['Radix sort', '`O(d × (n + b))`', 'Integers, fixed-length strings', 'Yes'],
        ['Bucket sort', '`O(n)` on average', 'Values spread evenly over a known range', 'Depends']
      ] },
      { type: 'note', kind: 'info', text: '**Bucket sort** is the cousin for decimals: split a known range (say 0 to 1) into n buckets, drop each value into its bucket, sort each small bucket, and concatenate. If values are spread evenly, each bucket holds about one item and the whole sort is O(n).' },
      { type: 'quiz', question: 'You must sort 10 million survey answers, each an integer from 1 to 5. Which sort is best?', options: ['Bubble sort', 'Merge sort', 'Counting sort', 'Quick sort with a random pivot'], answer: 2, explain: 'k = 5 is tiny, so counting sort is O(n + 5): two quick passes over the data, no comparisons.' },
      { type: 'quiz', question: 'Why must each pass of LSD radix sort be stable?', options: [
        'Otherwise it would be O(n²)',
        'So that the order produced by earlier (less significant) digits is kept for numbers with the same current digit',
        'Because counting sort is always stable',
        'It does not need to be'
      ], answer: 1, explain: 'After sorting by tens, numbers with the same tens digit must stay in ones-digit order, or the earlier pass is lost.' },
      { type: 'exercise', task: 'Sort the letters of a lowercase word with counting sort: `"algorithms"` → `"aghilmorst"`. Use an array of 26 counters.', hint: '`count[c - \'a\']++` for each character, then append each letter `count[i]` times. `StringBuilder.Append(char, repeatCount)` helps (add `using System.Text;`).', solution: cs`
using System.Text;

static string SortLetters(string s)
{
    var count = new int[26];
    foreach (char c in s) count[c - 'a']++;

    var sb = new StringBuilder(s.Length);
    for (int i = 0; i < 26; i++)
        sb.Append((char)('a' + i), count[i]);
    return sb.ToString();
}

Console.WriteLine(SortLetters("algorithms"));`, output: 'aghilmorst' }
    ],
    keyPoints: [
      'Comparison sorts cannot beat about n log n comparisons in the worst case.',
      'Counting sort counts each value and places items directly: O(n + k) for keys in a range of k.',
      'Radix sort applies a stable counting sort digit by digit: O(d × (n + b)).',
      'These sorts only work for integer-like keys; for general objects use a comparison sort.'
    ]
  },

  // ------------------------------------------------------------------ 18
  {
    slug: 'sorting-in-dotnet',
    title: 'Sorting in .NET: stability and comparers',
    summary: 'Choose between Array.Sort, List.Sort and LINQ OrderBy, sort by several keys, write correct comparers, and avoid the classic sorting bugs.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'In real code you will almost never write your own sort. .NET’s built-in sorts are fast and well tested. What you **do** need to get right is which method to call, how to describe the order you want, and whether equal items may be reordered.' },
      { type: 'table', head: ['Method', 'Algorithm', 'Changes the original?', 'Stable?'], rows: [
        ['`Array.Sort(a)`, `list.Sort()`, `span.Sort()`', 'Introsort', 'Yes, sorts in place', 'No'],
        ['`items.OrderBy(...)`, `ThenBy(...)` (LINQ)', 'Stable sort of keys', 'No, returns a new sequence', 'Yes'],
        ['`items.Order()` (.NET 7+)', 'Same as OrderBy with the item itself as key', 'No', 'Yes']
      ] },
      { type: 'h2', text: 'Stability matters' },
      { type: 'p', text: 'A **stable** sort keeps items with equal keys in their original order. That matters when the input already has a meaningful order, such as beams listed in erection sequence that you now want grouped by profile, or when you sort by one key and then by another.' },
      { type: 'widget', name: 'sort-keys' },
      { type: 'note', kind: 'warn', text: '`List<T>.Sort` and `Array.Sort` are **not** guaranteed to be stable. If equal items must keep their order, use LINQ `OrderBy`, or add a tie-breaker (such as the original index) to your comparison.' },
      { type: 'h2', text: 'Sorting by several keys' },
      { type: 'code', title: 'MultiKey.cs', code: cs`
var beams = new List<Beam>
{
    new("B1", "IPE300", 6.0), new("B2", "HEA200", 4.5),
    new("B3", "IPE300", 4.5), new("B4", "HEA200", 6.0)
};

// LINQ: readable, stable, returns a new list
var byProfileThenLongest = beams
    .OrderBy(b => b.Profile)
    .ThenByDescending(b => b.Length)
    .ToList();

foreach (var b in byProfileThenLongest)
    Console.WriteLine($"{b.Name} {b.Profile} {b.Length:0.0}");

// In place with a Comparison<T> lambda (no new list)
beams.Sort((x, y) =>
{
    int c = string.Compare(x.Profile, y.Profile, StringComparison.Ordinal);
    return c != 0 ? c : y.Length.CompareTo(x.Length);   // y before x = descending
});

record Beam(string Name, string Profile, double Length);`, output: 'B4 HEA200 6.0\nB2 HEA200 4.5\nB1 IPE300 6.0\nB3 IPE300 4.5' },
      { type: 'h2', text: 'Three ways to define an order' },
      { type: 'ul', items: [
        '**`IComparable<T>`** on the type itself: its natural order. `int`, `string`, `DateTime` already have one. Then `list.Sort()` needs no arguments.',
        '**`IComparer<T>`**: a separate object describing an order. Useful when there are several orders, or you cannot change the type. `Comparer<T>.Create(lambda)` makes one from a lambda.',
        '**`Comparison<T>`**: a plain lambda `(x, y) => int`, accepted by `List<T>.Sort` and `Array.Sort`.'
      ] },
      { type: 'code', title: 'Comparable.cs', code: cs`
var levels = new List<Level> { new("Roof", 12.0), new("Ground", 0.0), new("First", 4.0) };
levels.Sort();                                         // uses CompareTo
Console.WriteLine(string.Join(", ", levels.Select(l => l.Name)));

class Level : IComparable<Level>
{
    public string Name { get; }
    public double Elevation { get; }
    public Level(string name, double elevation) => (Name, Elevation) = (name, elevation);

    // negative: this comes first, 0: equal, positive: other comes first
    public int CompareTo(Level? other) => other is null ? 1 : Elevation.CompareTo(other.Elevation);
}`, output: 'Ground, First, Roof' },
      { type: 'h2', text: 'Classic sorting bugs' },
      { type: 'p', text: '**1. Subtracting to compare.** `(x, y) => x - y` looks clever but overflows: for `int.MinValue` and `1` the result wraps around to a large positive number, so the order is wrong. Always use `x.CompareTo(y)`.' },
      { type: 'p', text: '**2. Text order surprises.** Strings are compared character by character, so `"B10"` comes before `"B2"` (because `1` < `2`). The default comparer is also culture-sensitive. For IDs and file names, decide explicitly:' },
      { type: 'code', title: 'StringOrder.cs', code: cs`
var names = new List<string> { "apple", "Banana", "cherry" };

names.Sort(StringComparer.Ordinal);            // by character code: capitals first
Console.WriteLine(string.Join(" ", names));

names.Sort(StringComparer.OrdinalIgnoreCase);  // ignore case, culture-independent
Console.WriteLine(string.Join(" ", names));

var marks = new List<string> { "B10", "B2", "B1" };
marks.Sort(StringComparer.Ordinal);
Console.WriteLine(string.Join(" ", marks));    // text order, not number order`, output: 'Banana apple cherry\napple Banana cherry\nB1 B10 B2' },
      { type: 'p', text: '**3. Inconsistent comparers.** A comparer must be consistent: if a < b and b < c then a < c, and comparing an item with itself gives 0. A comparer that uses random numbers or rounds values unevenly can make `Sort` throw `InvalidOperationException` (“IComparer.Compare() method returns inconsistent results”) or produce garbage.' },
      { type: 'p', text: '**4. Sorting what you only need partly.** If you need only the 10 longest beams out of a million, sorting everything is O(n log n). A `PriorityQueue` of size 10 does it in O(n log 10), see the heaps lesson.' },
      { type: 'quiz', question: 'You need beams grouped by level but, within each level, still in their original erection order. Which call is guaranteed correct?', options: ['`beams.Sort((x, y) => x.Level.CompareTo(y.Level))`', '`Array.Sort(beamArray, comparer)`', '`beams.OrderBy(b => b.Level).ToList()`', 'Any of them'], answer: 2, explain: 'Only LINQ OrderBy guarantees stability. `List.Sort` and `Array.Sort` may reorder beams with the same level.' },
      { type: 'quiz', question: 'Why is `list.Sort((x, y) => x - y)` dangerous for `int`s?', options: ['It sorts in descending order', 'The subtraction can overflow and give the wrong sign', 'It is not allowed by the compiler', 'It is O(n²)'], answer: 1, explain: 'With very large or very small values, x − y overflows. `x.CompareTo(y)` never overflows.' },
      { type: 'exercise', task: 'Drawing numbers look like `"A-10"`, `"A-2"`, `"B-1"`, `"A-1"`. Sort them by the letter, then by the **number** (so A-2 comes before A-10). Expected: `A-1, A-2, A-10, B-1`.', hint: 'Split on `-`. Order by the first part, then by `int.Parse` of the second part.', solution: cs`
var drawings = new List<string> { "A-10", "A-2", "B-1", "A-1" };

var sorted = drawings
    .OrderBy(d => d.Split('-')[0], StringComparer.Ordinal)
    .ThenBy(d => int.Parse(d.Split('-')[1]))
    .ToList();

Console.WriteLine(string.Join(", ", sorted));`, output: 'A-1, A-2, A-10, B-1' }
    ],
    keyPoints: [
      '`Array.Sort` / `List.Sort` use introsort: fast, in place, but not stable.',
      'LINQ `OrderBy` / `ThenBy` is stable and returns a new sequence.',
      'Define order with `IComparable<T>`, `IComparer<T>` or a `Comparison<T>` lambda, using `CompareTo`, never subtraction.',
      'Be explicit about string order (`StringComparer.Ordinal`, `OrdinalIgnoreCase`) and sort numbers inside IDs as numbers.'
    ]
  }
];
