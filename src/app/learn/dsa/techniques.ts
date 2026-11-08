import { Lesson } from '../learn.types';
import { cs } from '../csharp/cs';

export const TECHNIQUES: Lesson[] = [
  // ------------------------------------------------------------------ 19
  {
    slug: 'hash-tables',
    title: 'How hash tables work',
    summary: 'See how Dictionary and HashSet find a key in O(1): hash codes, buckets, collisions, load factor and resizing, and the Equals/GetHashCode rules your own keys must follow.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'You have used `Dictionary<TKey, TValue>` and `HashSet<T>` since the C# course, and you know lookups are “instant”. Searching a list is O(n), binary search is O(log n), so how can a lookup take the same time for 10 keys and 10 million? The answer is the **hash table**, probably the most useful data structure in everyday programming.' },
      { type: 'h2', text: 'The idea: compute where the key lives' },
      { type: 'p', text: 'An array gives O(1) access **by index**. A hash table turns any key into an index:' },
      { type: 'ol', items: [
        'Compute the key’s **hash code**: a number made from the key’s contents (`key.GetHashCode()`). Equal keys always give the same number.',
        'Turn it into a slot number: `bucket = hash % bucketCount`.',
        'Store the entry in that bucket. To find the key later, compute the same bucket and look only there.'
      ] },
      { type: 'p', text: 'No scanning, no sorting: the key itself tells you where to look. That is why `ContainsKey` does not slow down as the dictionary grows.' },
      { type: 'widget', name: 'hash-buckets' },
      { type: 'h2', text: 'Collisions are normal' },
      { type: 'p', text: 'There are far more possible keys than buckets, so two different keys will sometimes land in the same bucket. This is a **collision**, and every hash table must handle it. There are two common ways:' },
      { type: 'ul', items: [
        '**Chaining**: each bucket holds a small list of entries. A lookup goes to the bucket and compares the key with each entry in that list. .NET’s `Dictionary` and `HashSet` work this way (the chains are stored inside one array of entries for speed).',
        '**Open addressing**: if the slot is taken, try the next slot (or another computed one) until a free one is found. Python’s dict and many C++ tables use this.'
      ] },
      { type: 'p', text: 'Either way, a lookup is fast only if chains stay short. That depends on two things: a **good hash function** that spreads keys evenly, and **enough buckets**.' },
      { type: 'h2', text: 'Load factor and resizing' },
      { type: 'p', text: 'The **load factor** is `count / bucketCount`, the average chain length. When it gets too high, the table allocates a bigger bucket array (.NET roughly doubles it, to a prime number) and **re-inserts every entry**, because `hash % bucketCount` changes when the bucket count changes. A resize is O(n), but it happens rarely, so like `List<T>` growth the **average** cost per insert stays O(1).' },
      { type: 'table', head: ['Operation', 'Average', 'Worst case'], rows: [
        ['`Add`, `Remove`', 'O(1)', 'O(n) (resize, or every key in one bucket)'],
        ['`ContainsKey`, `TryGetValue`, `Contains`', 'O(1)', 'O(n) (every key in one bucket)'],
        ['Iterate all entries', 'O(n)', 'O(n)'],
        ['Find the smallest key, or keys in a range', 'O(n): no order kept', 'O(n)']
      ] },
      { type: 'note', kind: 'tip', text: 'If you know roughly how many items you will add, pass a capacity: `new Dictionary<string, Beam>(50_000)`. The table is created big enough and never has to resize while you fill it.' },
      { type: 'h2', text: 'Keys must follow the equality rules' },
      { type: 'p', text: 'A hash table relies on two methods of the key: `GetHashCode()` to find the bucket and `Equals()` to compare entries inside it. The rule: **if two keys are Equal, they must have the same hash code.** By default a **class** uses reference equality: two separate objects with the same data are different keys. A **record** (or a struct) compares by value, and generates both methods for you.' },
      { type: 'code', title: 'KeyEquality.cs', code: cs`
var byClass = new Dictionary<GridPointClass, string>();
byClass[new GridPointClass(2, 3)] = "Column C1";
Console.WriteLine(byClass.ContainsKey(new GridPointClass(2, 3)));   // a different object

var byRecord = new Dictionary<GridPoint, string>();
byRecord[new GridPoint(2, 3)] = "Column C1";
Console.WriteLine(byRecord.ContainsKey(new GridPoint(2, 3)));       // equal by value

class GridPointClass
{
    public int X { get; }
    public int Y { get; }
    public GridPointClass(int x, int y) { X = x; Y = y; }
}

record GridPoint(int X, int Y);`, output: 'False\nTrue' },
      { type: 'p', text: 'If you must use a class as a key, override both methods. `HashCode.Combine` mixes several fields into one good hash code:' },
      { type: 'code', title: 'CustomKey.cs', code: cs`
class GridPointClass : IEquatable<GridPointClass>
{
    public int X { get; }
    public int Y { get; }
    public GridPointClass(int x, int y) { X = x; Y = y; }

    public bool Equals(GridPointClass? other) => other is not null && X == other.X && Y == other.Y;
    public override bool Equals(object? obj) => Equals(obj as GridPointClass);
    public override int GetHashCode() => HashCode.Combine(X, Y);
}`, output: '' },
      { type: 'note', kind: 'warn', text: 'Never change a key’s fields after adding it. The entry stays in the bucket of its **old** hash code, so the dictionary can no longer find it, even with the same object. Keys should be immutable: records with `init` properties, strings, numbers.' },
      { type: 'note', kind: 'info', text: 'In .NET, `string.GetHashCode()` is randomised every time the program starts, to protect web servers from attacks that send many colliding keys. Never save hash codes to a file or database; use them only inside one running process.' },
      { type: 'quiz', question: 'A dictionary has 1,000 buckets and 1,000,000 keys, all with the same hash code. How long does `ContainsKey` take?', options: ['O(1), dictionaries are always O(1)', 'O(log n)', 'O(n): every key is in the same chain', 'It throws an exception'], answer: 2, explain: 'All keys land in one bucket, so a lookup compares against up to a million entries. O(1) is the average with a good hash, not a guarantee.' },
      { type: 'quiz', question: 'Why does a hash table re-insert every entry when it resizes?', options: ['To sort them', 'Because each entry’s bucket is hash % bucketCount, which changes with the new count', 'To remove duplicates', 'It does not; it only copies the array'], answer: 1, explain: 'With 8 buckets a hash of 21 goes to bucket 5; with 16 buckets it goes to bucket 5 as well, but a hash of 13 moves from 5 to 13. Every entry must be placed again.' },
      { type: 'exercise', task: 'Build a tiny hash set of `int`s with chaining: `SimpleIntSet(int bucketCount)` with `Add(int x)` (returns false if already present), `Contains(int x)` and `Count`. Use an array of `List<int>` as the buckets. Adding 5, 9, 13, 2, 9 to a set with 4 buckets should give Count 4, `Contains(13)` true, `Contains(6)` false. (No resizing needed.)', hint: 'Bucket index: `(x.GetHashCode() & int.MaxValue) % buckets.Length`. The `& int.MaxValue` clears the sign bit so negative numbers do not give a negative index.', solution: cs`
var set = new SimpleIntSet(4);
foreach (int x in new[] { 5, 9, 13, 2, 9 }) set.Add(x);
Console.WriteLine(set.Count);
Console.WriteLine(set.Contains(13));
Console.WriteLine(set.Contains(6));

class SimpleIntSet
{
    private readonly List<int>[] _buckets;
    public int Count { get; private set; }

    public SimpleIntSet(int bucketCount)
    {
        _buckets = new List<int>[bucketCount];
        for (int i = 0; i < bucketCount; i++) _buckets[i] = new List<int>();
    }

    private List<int> BucketFor(int x) => _buckets[(x.GetHashCode() & int.MaxValue) % _buckets.Length];

    public bool Contains(int x) => BucketFor(x).Contains(x);

    public bool Add(int x)
    {
        if (Contains(x)) return false;   // a set holds each value once
        BucketFor(x).Add(x);
        Count++;
        return true;
    }
}`, output: '4\nTrue\nFalse' }
    ],
    keyPoints: [
      'A hash table turns a key into a bucket index with `hash % bucketCount`, so lookups do not scan.',
      'Collisions are normal; .NET chains entries that share a bucket.',
      'Average O(1) needs a good hash and a low load factor; resizing keeps the average cost O(1).',
      'Equal keys must have equal hash codes. Use records or override `Equals` and `GetHashCode`, and never mutate a key.'
    ]
  },

  // ------------------------------------------------------------------ 20
  {
    slug: 'hashing-problems',
    title: 'Solving problems with HashSet and Dictionary',
    summary: 'Five patterns that turn O(n²) loops into a single O(n) pass: seen-before, counting, complement lookup, grouping by a key and set operations.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'Many slow programs share the same shape: a loop inside a loop, where the inner loop **searches** for something. If that search can become a hash lookup, the inner loop disappears and O(n²) becomes O(n). This lesson collects the patterns you will use again and again.' },
      { type: 'h2', text: 'Pattern 1: have I seen this before?' },
      { type: 'p', text: 'Duplicate detection with two loops compares every pair. With a `HashSet` you check each item once. `HashSet.Add` returns `false` when the value is already there, which makes the code very short.' },
      { type: 'code', title: 'Duplicates.cs', code: cs`
string[] ids = { "B-12", "C-7", "B-40", "C-7", "S-3", "B-12" };

var seen = new HashSet<string>();
var duplicates = new List<string>();
foreach (var id in ids)
    if (!seen.Add(id))          // false: it was already in the set
        duplicates.Add(id);

Console.WriteLine(string.Join(", ", duplicates));`, output: 'C-7, B-12' },
      { type: 'h2', text: 'Pattern 2: counting' },
      { type: 'p', text: 'A `Dictionary<key, int>` is a tally sheet. `GetValueOrDefault` returns 0 for a key that is not there yet, so one line counts everything.' },
      { type: 'code', title: 'Counting.cs', code: cs`
string[] sections = { "IPE200", "HEA160", "IPE200", "SHS100", "IPE200", "HEA160" };

var count = new Dictionary<string, int>();
foreach (var s in sections)
    count[s] = count.GetValueOrDefault(s) + 1;

foreach (var (section, n) in count)
    Console.WriteLine($"{section}: {n}");`, output: 'IPE200: 3\nHEA160: 2\nSHS100: 1' },
      { type: 'note', kind: 'warn', text: 'A `Dictionary` happens to return entries in insertion order if you never remove anything, but this is **not guaranteed**. If order matters, sort the result (`count.OrderByDescending(p => p.Value)`) or use `SortedDictionary`.' },
      { type: 'h2', text: 'Pattern 3: look up the partner (complement)' },
      { type: 'p', text: 'The classic interview question “find two numbers that add up to a target” is O(n²) with two loops. Turn it around: for each value `x`, the partner you need is `target − x`. Keep a dictionary of the values seen so far and ask it for the partner.' },
      { type: 'widget', name: 'pair-finder' },
      { type: 'code', title: 'TwoSum.cs', code: cs`
static (int, int)? TwoSum(int[] a, int target)
{
    var indexOf = new Dictionary<int, int>();          // value -> index
    for (int i = 0; i < a.Length; i++)
    {
        if (indexOf.TryGetValue(target - a[i], out int j))
            return (j, i);                              // partner seen earlier
        indexOf[a[i]] = i;
    }
    return null;
}

int[] lengths = { 7, 2, 11, 4, 9, 6, 3, 8 };
Console.WriteLine(TwoSum(lengths, 10));
Console.WriteLine(TwoSum(lengths, 30)?.ToString() ?? "none");`, output: '(3, 5)\nnone' },
      { type: 'p', text: 'Notice the order: check for the partner **before** adding the current value. Otherwise, for a target of 8, the value 4 would pair with itself.' },
      { type: 'h2', text: 'Pattern 4: group by a key' },
      { type: 'p', text: 'To put items into groups, compute a key for each item and use a `Dictionary<key, List<item>>`. The trick is choosing a key that is equal for items that belong together. For anagrams (same letters, different order), sorting the letters gives such a key: “listen” and “silent” both become “eilnst”.' },
      { type: 'code', title: 'Anagrams.cs', code: cs`
string[] words = { "listen", "silent", "enlist", "stone", "notes", "tones", "beam" };

var groups = new Dictionary<string, List<string>>();
foreach (var w in words)
{
    string key = new string(w.OrderBy(c => c).ToArray());   // sorted letters
    if (!groups.TryGetValue(key, out var list))
        groups[key] = list = new List<string>();
    list.Add(w);
}

foreach (var g in groups.Values)
    Console.WriteLine(string.Join(" ", g));`, output: 'listen silent enlist\nstone notes tones\nbeam' },
      { type: 'p', text: 'LINQ’s `GroupBy` and `ToLookup` do exactly this internally.' },
      { type: 'h2', text: 'Pattern 5: compare two collections' },
      { type: 'p', text: '“Which beams in the design are not installed yet?” With lists that is a nested loop. `HashSet` has set operations built in: `ExceptWith` (difference), `IntersectWith` (common items), `UnionWith` and `SetEquals`.' },
      { type: 'code', title: 'SetCompare.cs', code: cs`
var designed = new HashSet<string> { "B-1", "B-2", "B-3", "B-4" };
var installed = new HashSet<string> { "B-2", "B-4", "B-9" };

var missing = new HashSet<string>(designed);
missing.ExceptWith(installed);                 // designed but not installed

var unexpected = new HashSet<string>(installed);
unexpected.ExceptWith(designed);               // installed but not in the design

Console.WriteLine("Missing: " + string.Join(", ", missing));
Console.WriteLine("Not in design: " + string.Join(", ", unexpected));`, output: 'Missing: B-1, B-3\nNot in design: B-9' },
      { type: 'table', head: ['Question', 'Tool', 'Time'], rows: [
        ['Any duplicates? First repeat?', '`HashSet.Add` returns false', 'O(n)'],
        ['How many of each?', '`Dictionary<key, int>`', 'O(n)'],
        ['Is there a partner that…?', '`Dictionary<value, index>`, look up the complement', 'O(n)'],
        ['Group items that belong together', '`Dictionary<key, List<T>>` or `GroupBy`', 'O(n)'],
        ['What is in A but not B?', '`HashSet.ExceptWith`', 'O(n + m)']
      ] },
      { type: 'note', kind: 'info', text: 'The price is memory: each pattern stores up to n extra entries. If memory is tight and the data can be sorted, sorting plus two pointers (next lesson) solves many of the same problems in O(n log n) time and O(1) extra space.' },
      { type: 'quiz', question: 'You need to know whether any two drawings share the same title, among 200,000 drawings. Which is fastest?', options: ['Compare every pair', 'Sort the titles, then compare neighbours', 'Add each title to a HashSet and stop when Add returns false', 'Binary search every title'], answer: 2, explain: 'One pass with O(1) set operations: O(n). Sorting works too, but is O(n log n).' },
      { type: 'quiz', question: 'In TwoSum, what goes wrong if you add `a[i]` to the dictionary before looking up `target − a[i]`?', options: ['Nothing', 'An item can pair with itself, e.g. 5 + 5 for target 10 when there is only one 5', 'It becomes O(n²)', 'It throws a KeyNotFoundException'], answer: 1, explain: 'The current item would already be in the dictionary and could be found as its own partner.' },
      { type: 'exercise', task: 'Write `LongestConsecutive(int[] a)` that returns the length of the longest run of consecutive whole numbers, in any order in the array, in O(n). For `{ 100, 4, 200, 1, 3, 2 }` the run 1, 2, 3, 4 gives 4. For `{ 9, 1, 8, 7, 3 }` the answer is 3.', hint: 'Put everything in a HashSet. A number starts a run only if `x − 1` is not in the set. From each start, count upwards while `x + len` is in the set. Each number is counted once in total.', solution: cs`
static int LongestConsecutive(int[] a)
{
    var set = new HashSet<int>(a);
    int best = 0;
    foreach (int x in set)
    {
        if (set.Contains(x - 1)) continue;   // not the start of a run
        int len = 1;
        while (set.Contains(x + len)) len++;
        best = Math.Max(best, len);
    }
    return best;
}

Console.WriteLine(LongestConsecutive(new[] { 100, 4, 200, 1, 3, 2 }));
Console.WriteLine(LongestConsecutive(new[] { 9, 1, 8, 7, 3 }));`, output: '4\n3' }
    ],
    keyPoints: [
      'If an inner loop only searches, replace it with a hash lookup: O(n²) becomes O(n).',
      '`HashSet.Add` returning false detects repeats; `Dictionary` + `GetValueOrDefault` counts.',
      'For pair problems, look up the complement in a dictionary of what you have already seen.',
      'Group with a well-chosen key; compare collections with `ExceptWith` / `IntersectWith`. The cost is O(n) extra memory.'
    ]
  },

  // ------------------------------------------------------------------ 21
  {
    slug: 'two-pointers',
    title: 'Two pointers',
    summary: 'Walk two indexes through an array, from both ends or in the same direction, to solve pair, partition and in-place problems in O(n) with no extra memory.',
    minutes: 13,
    blocks: [
      { type: 'p', text: 'A **two-pointer** algorithm keeps two indexes into the data and moves them according to simple rules. Each step moves at least one pointer, and neither ever moves back, so the whole thing is O(n). You already met one: the merge step of merge sort walks one pointer through each half.' },
      { type: 'p', text: 'There are two main shapes:' },
      { type: 'ul', items: [
        '**Opposite ends**: one pointer starts at the left, one at the right, and they move towards each other. Used on sorted data and for reversing or mirroring.',
        '**Same direction** (often called slow and fast, or read and write): both start on the left; one scans every item, the other moves only when something is kept.'
      ] },
      { type: 'widget', name: 'two-pointers' },
      { type: 'h2', text: 'Opposite ends: a pair with a given sum' },
      { type: 'p', text: 'In a **sorted** array, look at the smallest and the largest value. If their sum is too small, the smallest value is useless: even with the largest partner it does not reach the target, so move left forward. If the sum is too big, the largest value is useless, so move right back. Each step rules out one value for good.' },
      { type: 'code', title: 'PairWithSum.cs', code: cs`
static (int, int)? PairWithSum(int[] sorted, int target)
{
    int left = 0, right = sorted.Length - 1;
    while (left < right)
    {
        int sum = sorted[left] + sorted[right];
        if (sum == target) return (left, right);
        if (sum < target) left++;      // need a bigger sum
        else right--;                  // need a smaller sum
    }
    return null;
}

int[] a = { 1, 3, 4, 6, 8, 9, 11, 14 };
Console.WriteLine(PairWithSum(a, 13));
Console.WriteLine(PairWithSum(a, 21)?.ToString() ?? "none");`, output: '(2, 5)\nnone' },
      { type: 'p', text: 'Compare with the dictionary version of the last lesson: both are O(n) time, but two pointers needs **O(1) extra memory**. The price is that the data must be sorted. If it is not, sorting first costs O(n log n).' },
      { type: 'note', kind: 'tip', text: 'Three numbers that add up to a target (“3Sum”): sort, then for each item run this two-pointer search on the rest. O(n²), instead of O(n³) with three loops.' },
      { type: 'h2', text: 'Same direction: remove repeats in place' },
      { type: 'p', text: 'In a sorted array, repeats sit next to each other. A **read** pointer visits every item. A **write** pointer marks where the next value to keep goes. When read finds a new value, copy it to write and advance write. Nothing is shifted, and no second array is needed.' },
      { type: 'code', title: 'RemoveDuplicates.cs', code: cs`
static int RemoveDuplicates(int[] a)
{
    if (a.Length == 0) return 0;
    int write = 1;                          // a[0] is always kept
    for (int read = 1; read < a.Length; read++)
        if (a[read] != a[write - 1])        // a new value
            a[write++] = a[read];
    return write;                           // number of values kept
}

int[] spans = { 2, 2, 3, 3, 3, 5, 8, 8, 9 };
int n = RemoveDuplicates(spans);
Console.WriteLine(n);
Console.WriteLine(string.Join(", ", spans[..n]));`, output: '5\n2, 3, 5, 8, 9' },
      { type: 'p', text: 'The same read/write shape filters an array in place for any condition: “keep only beams longer than 6 m”, “move all zeros to the end”. It is how `List<T>.RemoveAll` works internally, which is why `RemoveAll` is O(n) while calling `Remove` in a loop is O(n²).' },
      { type: 'h2', text: 'Opposite ends: mirroring' },
      { type: 'p', text: 'Comparing or swapping the first and last item, then moving inwards, reverses an array or checks if text reads the same both ways. The pointers can also skip items, here spaces and punctuation:' },
      { type: 'code', title: 'Palindrome.cs', code: cs`
static bool IsPalindrome(string s)
{
    int i = 0, j = s.Length - 1;
    while (i < j)
    {
        if (!char.IsLetterOrDigit(s[i])) { i++; continue; }
        if (!char.IsLetterOrDigit(s[j])) { j--; continue; }
        if (char.ToLowerInvariant(s[i]) != char.ToLowerInvariant(s[j])) return false;
        i++; j--;
    }
    return true;
}

Console.WriteLine(IsPalindrome("Never odd or even"));
Console.WriteLine(IsPalindrome("Steel beam"));`, output: 'True\nFalse' },
      { type: 'h2', text: 'When does two pointers apply?' },
      { type: 'table', head: ['Clue in the problem', 'Shape'], rows: [
        ['Sorted array, pair or triple with a sum or difference', 'Opposite ends'],
        ['Reverse, mirror, palindrome', 'Opposite ends'],
        ['Remove, filter or compact in place', 'Same direction (read / write)'],
        ['Merge two sorted lists', 'One pointer per list'],
        ['Linked list: middle node, detect a cycle', 'Slow and fast (fast moves 2 steps)']
      ] },
      { type: 'quiz', question: 'In PairWithSum, the sum is less than the target. Why is it safe to discard `sorted[left]` for ever?', options: ['Because it was already compared once', 'Because its biggest possible partner, sorted[right], is still not enough, and all other remaining partners are smaller', 'Because the array has no duplicates', 'It is not safe; that is a bug'], answer: 1, explain: 'sorted[right] is the largest value still in play. If even that is too small a partner, no other partner can work.' },
      { type: 'quiz', question: 'What is the extra memory used by RemoveDuplicates?', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], answer: 0, explain: 'Only two integer indexes. The array is changed in place.' },
      { type: 'exercise', task: 'Given a sorted array that may contain negative numbers, return a new array of the **squares**, also sorted. For `{ -7, -3, 2, 3, 11 }` the answer is `4, 9, 9, 49, 121`. Do it in O(n), without sorting.', hint: 'The biggest square is at one of the two ends (a big negative or a big positive). Compare the squares at left and right, write the bigger one at the end of the result, and move that pointer inwards. Fill the result from the back.', solution: cs`
static int[] SortedSquares(int[] a)
{
    var result = new int[a.Length];
    int left = 0, right = a.Length - 1;
    for (int k = a.Length - 1; k >= 0; k--)
    {
        int l = a[left] * a[left], r = a[right] * a[right];
        if (l > r) { result[k] = l; left++; }
        else { result[k] = r; right--; }
    }
    return result;
}

Console.WriteLine(string.Join(", ", SortedSquares(new[] { -7, -3, 2, 3, 11 })));`, output: '4, 9, 9, 49, 121' }
    ],
    keyPoints: [
      'Two indexes that only move forward (or inward) give O(n) time and O(1) extra memory.',
      'Opposite ends on sorted data: move the pointer that can no longer be part of an answer.',
      'Read/write pointers filter or remove repeats in place; this is how `RemoveAll` is O(n).',
      'Compared with a hash table, two pointers saves memory but usually needs sorted data.'
    ]
  },

  // ------------------------------------------------------------------ 22
  {
    slug: 'sliding-window',
    title: 'Sliding window',
    summary: 'Solve “best run of consecutive items” problems in O(n) by updating a window as it moves: fixed-size windows, growing and shrinking windows, and windows with a dictionary.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'Many questions are about **consecutive** items: the busiest 3 days, the longest stretch under a weight limit, the longest piece of text without a repeated letter. The slow way recomputes every possible stretch from scratch. A **sliding window** keeps one stretch (the window) and updates it as it moves: add what enters on the right, remove what leaves on the left.' },
      { type: 'h2', text: 'Fixed-size window' },
      { type: 'p', text: 'Steel deliveries per day are `{ 4, 2, 7, 1, 8, 3, 5, 6, 2, 9 }` tonnes. Which 3 consecutive days were the busiest? Adding up each 3-day window separately does k additions per window: O(n·k). But two neighbouring windows share all but one day, so moving the window needs only **one addition and one subtraction**.' },
      { type: 'widget', name: 'sliding-window' },
      { type: 'code', title: 'FixedWindow.cs', code: cs`
static (int best, int start) MaxWindowSum(int[] a, int k)
{
    int sum = 0;
    for (int i = 0; i < k; i++) sum += a[i];       // the first window
    int best = sum, start = 0;
    for (int r = k; r < a.Length; r++)
    {
        sum += a[r] - a[r - k];                     // add the new day, drop the oldest
        if (sum > best) { best = sum; start = r - k + 1; }
    }
    return (best, start);
}

int[] loads = { 4, 2, 7, 1, 8, 3, 5, 6, 2, 9 };
var (most, firstDay) = MaxWindowSum(loads, 3);
Console.WriteLine($"Busiest 3 days: {most} t, starting day {firstDay}");`, output: 'Busiest 3 days: 17 t, starting day 7' },
      { type: 'p', text: 'The same idea gives moving averages (divide the window sum by k), the number of defects in every 100 consecutive welds, and so on. Anything you can **add and remove** in O(1) can live in a window.' },
      { type: 'h2', text: 'Variable-size window: grow and shrink' },
      { type: 'p', text: 'Now the question is “what is the longest run of days whose total stays within 12 t?”. The window size is not fixed. The rule:' },
      { type: 'ol', items: [
        'Move `right` one step and add that item (grow).',
        'While the window breaks the rule (sum > limit), remove the item at `left` and move `left` forward (shrink).',
        'The window is now valid. Record it if it is the best so far.'
      ] },
      { type: 'code', title: 'GrowShrink.cs', code: cs`
static (int length, int start) LongestWithin(int[] a, int limit)
{
    int left = 0, sum = 0, bestLen = 0, bestStart = 0;
    for (int right = 0; right < a.Length; right++)
    {
        sum += a[right];                    // grow on the right
        while (sum > limit)                 // too much: shrink from the left
            sum -= a[left++];
        if (right - left + 1 > bestLen) { bestLen = right - left + 1; bestStart = left; }
    }
    return (bestLen, bestStart);
}

int[] loads = { 4, 2, 7, 1, 8, 3, 5, 6, 2, 9 };
var (days, startDay) = LongestWithin(loads, 12);
Console.WriteLine($"Longest run within 12 t: {days} days from day {startDay}");`, output: 'Longest run within 12 t: 3 days from day 1' },
      { type: 'p', text: 'It looks like a loop inside a loop, but it is **O(n)**: `right` moves n times and `left` moves at most n times in total, because it never goes back. Count the total moves of each pointer, not the nesting of the loops.' },
      { type: 'note', kind: 'warn', text: 'Grow-and-shrink relies on “adding an item makes the sum bigger, removing makes it smaller”. With **negative numbers** that is no longer true, and the window can shrink too early. For sums with negatives, use prefix sums (next lesson) instead.' },
      { type: 'h2', text: 'A window with a dictionary' },
      { type: 'p', text: 'The window can hold more than a sum. Here it tracks which characters are inside, to find the longest piece of text with no repeated character. A dictionary remembers where each character was last seen, so `left` can jump straight past the earlier copy.' },
      { type: 'code', title: 'LongestUnique.cs', code: cs`
static int LongestUnique(string s)
{
    var lastSeen = new Dictionary<char, int>();
    int left = 0, best = 0;
    for (int right = 0; right < s.Length; right++)
    {
        if (lastSeen.TryGetValue(s[right], out int prev) && prev >= left)
            left = prev + 1;                 // jump past the earlier copy
        lastSeen[s[right]] = right;
        best = Math.Max(best, right - left + 1);
    }
    return best;
}

Console.WriteLine(LongestUnique("abcabcbb"));   // "abc"
Console.WriteLine(LongestUnique("pwwkew"));     // "wke"`, output: '3\n3' },
      { type: 'table', head: ['Problem says…', 'Window'], rows: [
        ['“every k consecutive…”, moving average', 'Fixed size k'],
        ['“longest run such that…”', 'Grow, and shrink while the rule is broken; record after shrinking'],
        ['“shortest run such that…”', 'Grow until the rule holds, then shrink while it still holds, recording each time'],
        ['Rule about distinct or repeated items', 'Window plus a HashSet or Dictionary of counts']
      ] },
      { type: 'quiz', question: 'The grow-and-shrink code has a `while` loop inside a `for` loop. Why is it O(n) and not O(n²)?', options: ['The while loop runs at most once', '`left` only moves forward, so it moves at most n times over the whole run', 'Because the array is sorted', 'It is O(n²)'], answer: 1, explain: 'Each item enters the window once and leaves at most once: at most 2n pointer moves in total.' },
      { type: 'quiz', question: 'Window size k = 4, the window sum is 20. The item entering is 7 and the item leaving is 3. New sum?', options: ['24', '27', '16', '30'], answer: 0, explain: '20 + 7 − 3 = 24. One addition and one subtraction, whatever k is.' },
      { type: 'exercise', task: 'Write `MinLengthAtLeast(int[] a, int target)` that returns the length of the **shortest** run of consecutive positive numbers whose sum is at least `target`, or 0 if there is none. `{ 2, 3, 1, 2, 4, 3 }` with target 7 → 2 (the run 4, 3). `{ 1, 1, 1 }` with target 5 → 0.', hint: 'Grow on the right. While the sum is at least the target, record the length and shrink from the left: you are looking for the smallest window that still works.', solution: cs`
static int MinLengthAtLeast(int[] a, int target)
{
    int left = 0, sum = 0, best = int.MaxValue;
    for (int right = 0; right < a.Length; right++)
    {
        sum += a[right];
        while (sum >= target)                  // valid: try to make it shorter
        {
            best = Math.Min(best, right - left + 1);
            sum -= a[left++];
        }
    }
    return best == int.MaxValue ? 0 : best;
}

Console.WriteLine(MinLengthAtLeast(new[] { 2, 3, 1, 2, 4, 3 }, 7));
Console.WriteLine(MinLengthAtLeast(new[] { 1, 1, 1 }, 5));`, output: '2\n0' }
    ],
    keyPoints: [
      'A sliding window updates a run of consecutive items with what enters and leaves, instead of recomputing it.',
      'Fixed-size windows cost one add and one remove per step: O(n) instead of O(n·k).',
      'Variable windows grow on the right and shrink on the left; both pointers only move forward, so it is O(n).',
      'Grow-and-shrink on sums needs non-negative values; a dictionary inside the window handles “distinct” rules.'
    ]
  },

  // ------------------------------------------------------------------ 23
  {
    slug: 'prefix-sums',
    title: 'Prefix sums and difference arrays',
    summary: 'Precompute running totals once to answer any range-sum question in O(1), count subarrays with a target sum, sum rectangles in a grid, and apply range updates in O(1) with a difference array.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'Imagine a report screen where the user picks any range of days and sees the total delivered. Adding up the range each time is O(n) per question. With thousands of questions over the same data, there is a better way: do a little work **once**, and every question afterwards is O(1).' },
      { type: 'h2', text: 'The prefix array' },
      { type: 'p', text: 'Make an array one longer than the data, where `prefix[i]` is the total of the first `i` items (`prefix[0]` is 0). Then the total of items `l` to `r` is everything up to `r` minus everything before `l`:' },
      { type: 'p', text: '`sum(a[l..r]) = prefix[r + 1] − prefix[l]`' },
      { type: 'widget', name: 'prefix-sums' },
      { type: 'code', title: 'PrefixSums.cs', code: cs`
int[] a = { 3, 1, 4, 1, 5, 9, 2, 6 };

var prefix = new int[a.Length + 1];          // prefix[0] = 0
for (int i = 0; i < a.Length; i++)
    prefix[i + 1] = prefix[i] + a[i];
Console.WriteLine(string.Join(" ", prefix));

int RangeSum(int l, int r) => prefix[r + 1] - prefix[l];
Console.WriteLine(RangeSum(2, 5));            // 4 + 1 + 5 + 9
Console.WriteLine(RangeSum(0, 7));            // everything`, output: '0 3 4 8 9 14 23 25 31\n19\n31' },
      { type: 'note', kind: 'tip', text: 'The extra 0 at the front is what makes the formula work for ranges that start at index 0, without any `if`. It is the most common trick in this topic: if you get off-by-one errors, check that your prefix array has length n + 1.' },
      { type: 'p', text: 'Building costs O(n) time and O(n) memory; each query is O(1). It only works while the data does not change. If values change between queries, use a Fenwick tree or segment tree (Master module), which do both in O(log n).' },
      { type: 'h2', text: 'Prefix sums plus a dictionary' },
      { type: 'p', text: '“How many runs of consecutive items add up to exactly k?” A run from `i` to `j` has sum `prefix[j + 1] − prefix[i]`. So, walking left to right with a running sum, the number of runs **ending here** with sum k is the number of earlier prefix sums equal to `sum − k`. Keep those counts in a dictionary. Unlike the sliding window, this works with **negative** numbers too.' },
      { type: 'code', title: 'CountSubarrays.cs', code: cs`
static int CountSubarrays(int[] a, int k)
{
    var seen = new Dictionary<int, int> { [0] = 1 };   // prefix sum -> how many times
    int sum = 0, count = 0;
    foreach (int x in a)
    {
        sum += x;
        count += seen.GetValueOrDefault(sum - k);       // runs ending here with sum k
        seen[sum] = seen.GetValueOrDefault(sum) + 1;
    }
    return count;
}

// [1, 2], [3], [2, 3, -2] and [3, -2, 2]
Console.WriteLine(CountSubarrays(new[] { 1, 2, 3, -2, 2 }, 3));`, output: '4' },
      { type: 'h2', text: 'In two dimensions' },
      { type: 'p', text: 'The same idea works on a grid, for example loads on a floor plate divided into cells. `P[r, c]` holds the total of the rectangle from the top-left corner to just before (r, c). Any rectangle’s total is then four lookups: take the big rectangle, subtract the strip above and the strip to the left, and add back the corner that was subtracted twice.' },
      { type: 'code', title: 'Prefix2D.cs', code: cs`
int[,] g = { { 1, 2, 3 }, { 4, 5, 6 }, { 7, 8, 9 } };
int rows = 3, cols = 3;

var P = new int[rows + 1, cols + 1];
for (int r = 0; r < rows; r++)
    for (int c = 0; c < cols; c++)
        P[r + 1, c + 1] = g[r, c] + P[r, c + 1] + P[r + 1, c] - P[r, c];

// total of rows 1..2, columns 1..2  (5 + 6 + 8 + 9)
int s = P[3, 3] - P[1, 3] - P[3, 1] + P[1, 1];
Console.WriteLine(s);`, output: '28' },
      { type: 'h2', text: 'The reverse trick: difference arrays' },
      { type: 'p', text: 'Prefix sums make **range questions** cheap. Difference arrays make **range updates** cheap. Say you plan crews: “2 extra people on days 1–4”, “5 people on days 3–6”, and so on. Updating every day of every range is O(length) per update. Instead, record only where each change **starts** and **stops**: `diff[start] += n` and `diff[end + 1] −= n`. At the end, one running total over `diff` gives the real value for every day.' },
      { type: 'code', title: 'DifferenceArray.cs', code: cs`
int days = 8;
var diff = new int[days + 1];                  // one extra slot for "end + 1"

void AddCrew(int start, int end, int people)
{
    diff[start] += people;                     // from start on: + people
    diff[end + 1] -= people;                   // from end + 1 on: back to before
}

AddCrew(1, 4, 2);
AddCrew(3, 6, 5);
AddCrew(0, 7, 1);

var crew = new int[days];
int running = 0;
for (int d = 0; d < days; d++)
{
    running += diff[d];                        // a prefix sum rebuilds the values
    crew[d] = running;
}
Console.WriteLine(string.Join(" ", crew));`, output: '1 3 3 8 8 6 6 1' },
      { type: 'p', text: 'Each update is O(1), whatever the length of the range, and rebuilding is one O(n) pass at the end. This is how booking systems, timeline overlaps (“how many tasks run on each day?”) and paint-the-range problems are solved efficiently.' },
      { type: 'quiz', question: 'prefix = { 0, 5, 7, 12, 20 }. What is the sum of a[1..3]?', options: ['15', '13', '20', '8'], answer: 0, explain: 'prefix[4] − prefix[1] = 20 − 5 = 15.' },
      { type: 'quiz', question: 'With a difference array of 10 days, how many cells does “add 3 to days 2–8” change?', options: ['1', '2', '7', '10'], answer: 1, explain: 'diff[2] += 3 and diff[9] −= 3. Two cells, whatever the range length.' },
      { type: 'exercise', task: 'Write `PivotIndex(int[] a)` that returns the first index where the sum of everything to its left equals the sum of everything to its right (the item itself is in neither), or −1. `{ 1, 7, 3, 6, 5, 6 }` → 3 (1 + 7 + 3 = 11 = 5 + 6). `{ 1, 2, 3 }` → −1. Use O(1) extra memory.', hint: 'You do not need the whole prefix array. Compute the total once. Walking left to right with a running `left` sum, the right sum is `total − left − a[i]`.', solution: cs`
static int PivotIndex(int[] a)
{
    int total = a.Sum(), left = 0;
    for (int i = 0; i < a.Length; i++)
    {
        if (left == total - left - a[i]) return i;
        left += a[i];
    }
    return -1;
}

Console.WriteLine(PivotIndex(new[] { 1, 7, 3, 6, 5, 6 }));
Console.WriteLine(PivotIndex(new[] { 1, 2, 3 }));`, output: '3\n-1' }
    ],
    keyPoints: [
      '`prefix[i]` = total of the first i items; any range sum is `prefix[r + 1] − prefix[l]`, O(1).',
      'Give the prefix array length n + 1 with a leading 0 to avoid special cases.',
      'Prefix sums + a dictionary count runs with a given sum, even with negative numbers.',
      'A difference array makes range updates O(1); a running total at the end rebuilds the values.'
    ]
  },

  // ------------------------------------------------------------------ 24
  {
    slug: 'bit-manipulation',
    title: 'Bit manipulation',
    summary: 'Work directly with the bits of an integer: the bitwise operators, setting and testing single bits, classic tricks such as powers of two and XOR, and using bits to represent sets.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'An `int` is 32 bits, each 0 or 1. Every bit is a power of two: the number is the sum of the powers whose bit is 1. 13 is 8 + 4 + 1, so its bits are `1101`. Bit manipulation means using operators that work on all bits at once. It is fast (one CPU instruction) and compact (32 yes/no flags in one int).' },
      { type: 'code', title: 'Binary.cs', code: cs`
int x = 0b1101;                                   // binary literal: 13
Console.WriteLine(x);
Console.WriteLine(Convert.ToString(x, 2));         // back to binary text
Console.WriteLine(Convert.ToString(200, 2).PadLeft(8, '0'));
int mask = 0b_1111_0000;                          // _ separates digits for reading
Console.WriteLine(mask);`, output: '13\n1101\n11001000\n240' },
      { type: 'h2', text: 'The bitwise operators' },
      { type: 'table', head: ['Operator', 'Name', 'Each result bit is 1 when…', '12 op 10 (1100, 1010)'], rows: [
        ['`a & b`', 'AND', 'both bits are 1', '`1000` = 8'],
        ['`a | b`', 'OR', 'at least one bit is 1', '`1110` = 14'],
        ['`a ^ b`', 'XOR', 'the bits differ', '`0110` = 6'],
        ['`~a`', 'NOT', 'the bit was 0', '−13 (all 32 bits flipped)'],
        ['`a << n`', 'left shift', 'bits move n places left (× 2ⁿ)', '12 << 2 = 48'],
        ['`a >> n`', 'right shift', 'bits move n places right (÷ 2ⁿ, rounding down)', '12 >> 1 = 6']
      ] },
      { type: 'widget', name: 'bit-lab' },
      { type: 'code', title: 'Operators.cs', code: cs`
int a = 0b1100, b = 0b1010;
Console.WriteLine(Convert.ToString(a & b, 2));
Console.WriteLine(Convert.ToString(a | b, 2));
Console.WriteLine(Convert.ToString(a ^ b, 2));    // leading zero is not printed
Console.WriteLine(a << 2);
Console.WriteLine(a >> 1);
Console.WriteLine(~a);`, output: '1000\n1110\n110\n48\n6\n-13' },
      { type: 'p', text: 'Why is `~12` equal to −13? Negative numbers are stored in **two’s complement**: `−x` is `~x + 1`. So `~x` is always `−x − 1`. The top bit is the sign bit.' },
      { type: 'h2', text: 'Setting, clearing, toggling and testing one bit' },
      { type: 'p', text: '`1 << k` is a number with only bit k set: a **mask**. Combine it with the operators to work on one bit without touching the others:' },
      { type: 'code', title: 'SingleBits.cs', code: cs`
int flags = 0;
flags |= 1 << 3;                        // set bit 3
flags |= 1 << 0;                        // set bit 0
Console.WriteLine(Convert.ToString(flags, 2).PadLeft(8, '0'));

bool has3 = (flags & (1 << 3)) != 0;    // test bit 3
flags &= ~(1 << 0);                     // clear bit 0
flags ^= 1 << 5;                        // toggle bit 5
Console.WriteLine(has3);
Console.WriteLine(Convert.ToString(flags, 2).PadLeft(8, '0'));`, output: '00001001\nTrue\n00101000' },
      { type: 'note', kind: 'warn', text: 'Always put brackets around bitwise expressions. `==` binds more tightly than `&`, so `flags & 8 == 0` means `flags & (8 == 0)` and does not compile. Write `(flags & 8) == 0`.' },
      { type: 'p', text: 'This is exactly what a C# `[Flags]` enum does behind the scenes (see the enums lesson in the C# course): each named value is one bit, `|` combines them and `HasFlag` tests with `&`.' },
      { type: 'h2', text: 'Classic tricks' },
      { type: 'ul', items: [
        '`(x & 1) == 0`: x is even (the lowest bit is the 1s place).',
        '`x & (x − 1)`: removes the lowest 1 bit. Subtracting 1 flips the lowest 1 to 0 and the zeros below it to 1, so AND clears them all.',
        '`x > 0 && (x & (x − 1)) == 0`: x is a power of two (exactly one 1 bit).',
        '`x & −x`: keeps only the lowest 1 bit. Fenwick trees (Master module) are built on this.',
        '`x ^ x == 0` and `x ^ 0 == x`: XOR cancels pairs.'
      ] },
      { type: 'code', title: 'Tricks.cs', code: cs`
using System.Numerics;

static bool IsPowerOfTwo(int x) => x > 0 && (x & (x - 1)) == 0;

Console.WriteLine(IsPowerOfTwo(64));
Console.WriteLine(IsPowerOfTwo(96));
Console.WriteLine(BitOperations.PopCount(0b1011_0110u));   // number of 1 bits
Console.WriteLine(BitOperations.Log2(1000u));              // highest set bit
Console.WriteLine(int.IsPow2(1024));                       // built in since .NET 7`, output: 'True\nFalse\n5\n9\nTrue' },
      { type: 'p', text: 'Because XOR cancels pairs, XOR-ing a list where every value appears twice except one leaves exactly that one value, in O(n) time and O(1) memory:' },
      { type: 'code', title: 'SingleNumber.cs', code: cs`
int[] tags = { 4, 7, 2, 7, 4 };
int single = 0;
foreach (int t in tags) single ^= t;    // pairs cancel out
Console.WriteLine(single);`, output: '2' },
      { type: 'h2', text: 'Bits as a set: every combination' },
      { type: 'p', text: 'With n items, an n-bit number can say “in” or “out” for each one. Counting from 0 to 2ⁿ − 1 visits **every subset** exactly once. Here are all combinations of three load cases:' },
      { type: 'code', title: 'Subsets.cs', code: cs`
string[] loads = { "dead", "live", "wind" };

for (int mask = 0; mask < 1 << loads.Length; mask++)
{
    var picked = new List<string>();
    for (int i = 0; i < loads.Length; i++)
        if ((mask & (1 << i)) != 0) picked.Add(loads[i]);   // bit i set: item i is in

    string bits = Convert.ToString(mask, 2).PadLeft(loads.Length, '0');
    Console.WriteLine($"{bits}: {(picked.Count == 0 ? "none" : string.Join(" + ", picked))}");
}`, output: '000: none\n001: dead\n010: live\n011: dead + live\n100: wind\n101: dead + wind\n110: live + wind\n111: dead + live + wind' },
      { type: 'p', text: 'There are 2ⁿ subsets, so this is only practical for small n (up to about 20–25). The same “set as bits” idea powers some dynamic programming solutions later in the course.' },
      { type: 'h2', text: 'Shifting negative numbers' },
      { type: 'p', text: '`>>` on an `int` copies the sign bit in from the left, so negative numbers stay negative (it divides by 2ⁿ, rounding down). C# 11 added `>>>`, which always shifts in zeros:' },
      { type: 'code', title: 'Shifts.cs', code: cs`
int n = -16;
Console.WriteLine(n >> 2);     // sign kept: -4
Console.WriteLine(n >>> 28);   // zeros shifted in: the top 4 bits, 1111`, output: '-4\n15' },
      { type: 'note', kind: 'info', text: 'Do not use bit tricks just to look clever. `x * 2` and `x / 2` are just as fast as shifts after the compiler optimises them, and much clearer. Use bits for flags, masks, sets, hashing and the algorithms that really need them.' },
      { type: 'quiz', question: 'What is `12 & (12 − 1)`?', options: ['11', '8', '4', '0'], answer: 1, explain: '12 = 1100, 11 = 1011. AND gives 1000 = 8: the lowest 1 bit (the 4) was removed.' },
      { type: 'quiz', question: 'Which expression sets bit 4 of `x` and leaves the other bits alone?', options: ['`x & (1 << 4)`', '`x | (1 << 4)`', '`x ^ 4`', '`x << 4`'], answer: 1, explain: 'OR with a mask turns that bit on. `&` with the mask would test it (and clear every other bit); `^` with 4 flips bit 2.' },
      { type: 'exercise', task: 'Write `Hamming(int a, int b)`: the number of bit positions where `a` and `b` differ. `Hamming(1, 4)` = 2 (001 vs 100), `Hamming(3, 1)` = 1, `Hamming(255, 0)` = 8. Count the bits yourself with the `x & (x − 1)` trick instead of `PopCount`.', hint: 'XOR gives a 1 exactly where the bits differ. Then count the 1 bits: each `x &= x − 1` removes one, so loop until x is 0.', solution: cs`
static int Hamming(int a, int b)
{
    int x = a ^ b, count = 0;   // 1 where the bits differ
    while (x != 0)
    {
        x &= x - 1;             // remove the lowest 1 bit
        count++;
    }
    return count;
}

Console.WriteLine(Hamming(1, 4));
Console.WriteLine(Hamming(3, 1));
Console.WriteLine(Hamming(255, 0));`, output: '2\n1\n8' }
    ],
    keyPoints: [
      '`&` keeps or tests bits, `|` sets them, `^` flips them, `~` inverts all, `<<` / `>>` shift (× / ÷ by powers of two).',
      '`1 << k` is a mask for bit k; always bracket bitwise expressions before comparing.',
      '`x & (x − 1)` clears the lowest 1 bit; a power of two has exactly one 1 bit; XOR cancels pairs.',
      'An n-bit mask can represent a subset of n items; counting 0 … 2ⁿ − 1 visits every subset.'
    ]
  }
];
