import { Lesson } from '../learn.types';
import { cs } from '../csharp/cs';

export const LINEAR: Lesson[] = [
  // ------------------------------------------------------------------ 6
  {
    slug: 'arrays-in-memory',
    title: 'Arrays in memory',
    summary: 'Why reading any element of an array takes one step, why inserting in the middle does not, and how memory layout and the CPU cache make arrays so fast.',
    minutes: 13,
    blocks: [
      { type: 'p', text: 'The array is the most important data structure of all. Almost every other structure (lists, stacks, queues, hash tables, heaps) is built on top of one. To use them well you need to know what an array really is in memory.' },
      { type: 'h2', text: 'One unbroken block' },
      { type: 'p', text: 'An array is a single **contiguous** block of memory: element 0, then element 1 directly after it, then element 2, with no gaps. Every element has the same size, so the computer can work out where any element lives with one small calculation:' },
      { type: 'code', title: 'Address formula', code: cs`
address of a[i] = start address + i × element size

int[] a (4 bytes per int), starting at 0x1000:
a[0] → 0x1000    a[1] → 0x1004    a[2] → 0x1008    a[3] → 0x100C`, output: '' },
      { type: 'p', text: 'One multiplication and one addition, whether the index is 3 or 3 million. That is why reading or writing `a[i]` is **O(1)**. It is called **random access**: you can jump to any position directly.' },
      { type: 'widget', name: 'array-memory' },
      { type: 'h2', text: 'The price: inserting and deleting' },
      { type: 'p', text: 'Because there are no gaps, putting a value **between** two elements means moving every element after it one slot to the right. Removing one means moving them all left to close the hole. The cost depends on the position: free at the end, n moves at the front.' },
      { type: 'code', title: 'InsertAt.cs', code: cs`
// The array has spare room; count = how many slots are in use
static void InsertAt(int[] a, ref int count, int index, int value)
{
    if (count == a.Length) throw new InvalidOperationException("Array is full");

    for (int i = count; i > index; i--)   // shift right, starting from the end
        a[i] = a[i - 1];

    a[index] = value;
    count++;
}

int[] data = new int[8] { 10, 20, 30, 40, 0, 0, 0, 0 };
int count = 4;
InsertAt(data, ref count, 1, 15);
Console.WriteLine(string.Join(", ", data[..count]));`, output: '10, 15, 20, 30, 40' },
      { type: 'note', kind: 'warn', text: 'Shift from the **end** when moving right. If you start at the insert position and go forward, each copy overwrites the value you need next, and the whole tail fills with the same number.' },
      { type: 'table', head: ['Operation', 'Cost', 'Why'], rows: [
        ['Read / write `a[i]`', '`O(1)`', 'Address formula'],
        ['Search an unsorted array', '`O(n)`', 'Must check each element'],
        ['Search a sorted array', '`O(log n)`', 'Binary search (next module)'],
        ['Insert / delete at the end (with spare room)', '`O(1)`', 'Nothing moves'],
        ['Insert / delete at index i', '`O(n − i)`, so `O(n)`', 'Elements after i shift'],
        ['Grow the array', '`O(n)`', 'Impossible in place: allocate a bigger block and copy']
      ] },
      { type: 'h2', text: 'What a C# array looks like in memory' },
      { type: 'p', text: 'In .NET an array is an object on the heap. It starts with a small header (about 24 bytes on 64-bit: type information, a sync block and the length), followed by the elements. So `new int[1000]` takes about 24 + 4,000 bytes. The length is stored in the header, which is why `a.Length` is O(1) and why .NET can check every index and throw `IndexOutOfRangeException` instead of reading random memory.' },
      { type: 'p', text: 'What the elements contain depends on the type:' },
      { type: 'ul', items: [
        '**Value types** (`int`, `double`, structs like a `Point3D`): the values themselves sit side by side in the block.',
        '**Reference types** (classes, `string`): the block holds 8-byte **references**, and the objects live somewhere else on the heap. Walking the array means jumping to a different memory location for every element.'
      ] },
      { type: 'h2', text: 'The CPU cache: why arrays are faster than Big-O says' },
      { type: 'p', text: 'Reading from main memory is slow (around 100 ns). The CPU therefore loads memory in **cache lines** of 64 bytes and keeps them in a small, very fast cache. When you read `a[0]` of an `int[]`, `a[1]` to `a[15]` arrive in the same trip for free. Code that walks memory in order uses every byte it fetches; code that jumps around wastes most of each trip.' },
      { type: 'code', title: 'CacheOrder.cs', code: cs`
const int N = 4000;
var grid = new double[N, N];   // C# stores rows one after another (row-major)

double sum = 0;

// Fast: the inner loop walks along a row, through memory in order
for (int r = 0; r < N; r++)
    for (int c = 0; c < N; c++)
        sum += grid[r, c];

// Same Big-O, often several times slower: the inner loop jumps a whole row (32 KB) each step
for (int c = 0; c < N; c++)
    for (int r = 0; r < N; r++)
        sum += grid[r, c];`, output: '' },
      { type: 'note', kind: 'info', text: 'Both loops are O(n²) and do exactly the same additions. The only difference is the memory order. This “cache-friendliness” is a big reason why arrays and `List<T>` beat linked lists in practice, even when Big-O says they should be equal.' },
      { type: 'quiz', question: 'An `int[]` starts at address 0x2000. What is the address of `a[5]`?', options: ['0x2005', '0x2014', '0x2020', '0x2050'], answer: 1, explain: '0x2000 + 5 × 4 = 0x2000 + 20 = 0x2000 + 0x14 = 0x2014.' },
      { type: 'quiz', question: 'An array holds 1,000 elements with room for more. Which operation moves the most elements?', options: ['Insert at index 999', 'Insert at index 0', 'Read `a[500]`', 'Overwrite `a[0]`'], answer: 1, explain: 'Inserting at the front shifts all 1,000 elements one slot right. Reads and overwrites move nothing.' },
      { type: 'exercise', task: 'A sorted array has `count` used slots and spare room at the end. Write `InsertSorted(int[] a, ref int count, int value)` that puts `value` in the right place so the array stays sorted. Example: `{ 3, 8, 15, 42 }` + 10 → `3, 8, 10, 15, 42`.', hint: 'Start from the last used element and walk left. While the element is bigger than `value`, copy it one slot right. Stop when you find a smaller one; the gap is where `value` goes.', solution: cs`
static void InsertSorted(int[] a, ref int count, int value)
{
    if (count == a.Length) throw new InvalidOperationException("Array is full");

    int i = count - 1;
    while (i >= 0 && a[i] > value)
    {
        a[i + 1] = a[i];   // make room
        i--;
    }
    a[i + 1] = value;
    count++;
}

int[] a = new int[8] { 3, 8, 15, 42, 0, 0, 0, 0 };
int n = 4;
InsertSorted(a, ref n, 10);
InsertSorted(a, ref n, 1);
Console.WriteLine(string.Join(", ", a[..n]));`, output: '1, 3, 8, 10, 15, 42' }
    ],
    keyPoints: [
      'An array is one contiguous block, so `a[i]` is found with one calculation: O(1) random access.',
      'Inserting or deleting in the middle shifts the following elements: O(n).',
      'An array cannot grow; making it bigger means allocating a new block and copying.',
      'Walking memory in order is cache-friendly and can be many times faster than jumping around.'
    ]
  },

  // ------------------------------------------------------------------ 7
  {
    slug: 'dynamic-arrays',
    title: 'Dynamic arrays: how List<T> grows',
    summary: 'Build your own List<T>, see why it doubles its capacity, and understand amortised O(1): why Add is fast on average even though resizing is slow.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'Arrays have a fixed size, but most of the time you do not know in advance how many items you will have. A **dynamic array** solves this. It keeps a normal array with some spare room, plus a **count** of how many slots are used. When the array is full, it allocates a bigger one and copies everything over. `List<T>` in .NET is exactly this.' },
      { type: 'h2', text: 'Count vs Capacity' },
      { type: 'ul', items: [
        '**Count**: how many items you have added.',
        '**Capacity**: how many items fit in the hidden array before it must grow.'
      ] },
      { type: 'code', title: 'Capacity.cs', code: cs`
var list = new List<int>();
Console.WriteLine($"Start: Count {list.Count}, Capacity {list.Capacity}");

for (int i = 1; i <= 9; i++)
{
    list.Add(i);
    Console.Write($"{list.Capacity} ");
}`, output: 'Start: Count 0, Capacity 0\n4 4 4 4 8 8 8 8 16 ' },
      { type: 'p', text: 'The first `Add` allocates room for 4. The 5th finds it full, so a new array of 8 is created and the 4 items are copied over. The 9th grows it to 16. Try it, and compare with a list that grows by a fixed 4 slots each time:' },
      { type: 'widget', name: 'list-growth' },
      { type: 'h2', text: 'Build your own List<T>' },
      { type: 'code', title: 'SimpleList.cs', code: cs`
public class SimpleList<T>
{
    private T[] _items = new T[4];
    private int _count;

    public int Count => _count;
    public int Capacity => _items.Length;

    public T this[int index]
    {
        get
        {
            if ((uint)index >= (uint)_count) throw new ArgumentOutOfRangeException(nameof(index));
            return _items[index];
        }
        set
        {
            if ((uint)index >= (uint)_count) throw new ArgumentOutOfRangeException(nameof(index));
            _items[index] = value;
        }
    }

    public void Add(T item)
    {
        if (_count == _items.Length)
            Grow();                       // rare: O(n)
        _items[_count++] = item;          // usual case: O(1)
    }

    public void RemoveAt(int index)
    {
        if ((uint)index >= (uint)_count) throw new ArgumentOutOfRangeException(nameof(index));
        _count--;
        // shift everything after index one slot left
        Array.Copy(_items, index + 1, _items, index, _count - index);
        _items[_count] = default!;        // let the GC free the old reference
    }

    private void Grow()
    {
        var bigger = new T[_items.Length * 2];
        Array.Copy(_items, bigger, _count);
        _items = bigger;                  // the old array becomes garbage
    }
}`, output: '' },
      { type: 'note', kind: 'tip', text: '`(uint)index >= (uint)_count` checks both `index < 0` and `index >= _count` in one comparison: a negative int cast to `uint` becomes a huge number. .NET’s own `List<T>` uses this trick.' },
      { type: 'h2', text: 'Amortised O(1): why doubling works' },
      { type: 'p', text: 'A single `Add` that triggers a resize is O(n): it copies every item. So how can we say `Add` is O(1)? Look at the **total** work for n adds with doubling. Resizes happen at 4, 8, 16, 32… items, and copy 4 + 8 + 16 + … + n/2 items. That sum is less than n. So n adds cost at most n writes plus fewer than n copies: **under 2n steps in total, about 2 per Add**. The rare expensive Add is “paid for” by the many cheap ones. This is called **amortised O(1)**.' },
      { type: 'table', head: ['Growth rule', 'Copies for n adds', 'Cost per Add (average)'], rows: [
        ['Double the capacity', 'fewer than n', '`O(1)` amortised'],
        ['Grow by 1.5× (also common)', 'about 2n', '`O(1)` amortised'],
        ['Add a fixed 4 (or 100) slots', 'about n² / 8', '`O(n)`: the whole thing is O(n²)']
      ] },
      { type: 'note', kind: 'info', text: 'Amortised is not the same as average case. Average case is about random inputs. Amortised is a **guarantee** about any sequence of operations: no matter what you do, the total cost of n Adds is O(n).' },
      { type: 'h2', text: 'Practical tips' },
      { type: 'ul', items: [
        'If you know roughly how many items you will add, say so: `new List<Beam>(beamCount)`. No resizes at all.',
        '`list.EnsureCapacity(n)` grows once ahead of a big batch of adds.',
        'Capacity never shrinks on its own. After removing most items from a huge list, `TrimExcess()` gives the memory back.',
        'Removing many items with `RemoveAt` in a loop is O(n²). Use `RemoveAll(predicate)`, which compacts the list in one O(n) pass.'
      ] },
      { type: 'table', head: ['`List<T>` operation', 'Cost'], rows: [
        ['`list[i]`, `Count`', '`O(1)`'],
        ['`Add`', '`O(1)` amortised'],
        ['`Insert(i, x)`, `RemoveAt(i)`', '`O(n − i)`'],
        ['`Contains`, `IndexOf`, `Remove(x)`', '`O(n)`'],
        ['`RemoveAll(pred)`', '`O(n)`'],
        ['`Sort()`', '`O(n log n)`']
      ] },
      { type: 'quiz', question: 'A `List<int>` has Count 8 and Capacity 8. What happens on the next `Add`?', options: [
        'The new item goes into slot 9 of the same array.',
        'A new array of capacity 16 is allocated, the 8 items are copied, then the new item is added.',
        'An exception is thrown.',
        'The list becomes a linked list.'
      ], answer: 1, explain: 'A full list doubles: allocate 16 slots, copy 8 items, store the new one. Count becomes 9.' },
      { type: 'quiz', question: 'Why does `List<T>` double its capacity instead of adding a fixed 10 slots?', options: [
        'Doubling uses less memory.',
        'With doubling, resizes become rare enough that n Adds cost O(n) in total; a fixed step makes it O(n²).',
        'Arrays must have a power-of-two length.',
        'It does not matter, both are the same.'
      ], answer: 1, explain: 'Doubling makes the total copying a geometric series that sums to less than n. A fixed step causes a resize every 10 Adds, each copying everything.' },
      { type: 'exercise', task: 'This code removes all negative readings from a list but gets slow with a million items. Explain why, then rewrite it to be O(n) in two ways: with `RemoveAll`, and by hand with a read and a write index.', hint: 'Each `RemoveAt` shifts all later items. For the manual version, copy every reading you keep to the write position, then remove the leftover tail once with `RemoveRange`.', solution: cs`
var readings = new List<int> { 5, -2, 7, -1, -9, 3 };

// Slow: each RemoveAt shifts the rest → O(n²)
// for (int i = readings.Count - 1; i >= 0; i--)
//     if (readings[i] < 0) readings.RemoveAt(i);

// Fast 1: one pass inside .NET
var a = new List<int>(readings);
a.RemoveAll(x => x < 0);

// Fast 2: compact by hand
var b = new List<int>(readings);
int write = 0;
for (int read = 0; read < b.Count; read++)
    if (b[read] >= 0) b[write++] = b[read];
b.RemoveRange(write, b.Count - write);   // drop the tail once

Console.WriteLine(string.Join(", ", a));
Console.WriteLine(string.Join(", ", b));`, output: '5, 7, 3\n5, 7, 3' }
    ],
    keyPoints: [
      'A dynamic array is an array with spare room plus a count; `List<T>` is one.',
      'When full it allocates a bigger array (double the size in .NET) and copies everything.',
      'Doubling makes `Add` **amortised O(1)**: n Adds cost fewer than 2n steps in total.',
      'Pre-size lists when you know the count, and use `RemoveAll` instead of `RemoveAt` in a loop.'
    ]
  },

  // ------------------------------------------------------------------ 8
  {
    slug: 'linked-lists',
    title: 'Singly linked lists',
    summary: 'Chain nodes together with references, implement add, find and remove, reverse a list in place, and learn the fast/slow pointer trick.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'An array keeps its elements side by side. A **linked list** does the opposite: each element lives in its own small object, called a **node**, anywhere on the heap. Each node holds a value and a reference to the **next** node. The list itself only needs to remember the first node, the **head**. The last node’s `Next` is `null`.' },
      { type: 'code', title: 'Node.cs', code: cs`
// Build 3 → 8 → 15 by hand
var head = new Node<int>(3);
head.Next = new Node<int>(8);
head.Next.Next = new Node<int>(15);

for (var n = head; n != null; n = n.Next)   // the standard way to walk a list
    Console.Write($"{n.Value} → ");
Console.WriteLine("null");

public class Node<T>
{
    public T Value;
    public Node<T>? Next;
    public Node(T value) => Value = value;
}`, output: '3 → 8 → 15 → null' },
      { type: 'p', text: 'Because nodes are linked, not packed together, you can add or remove at the front by changing a couple of references. Nothing has to shift. The price is that there is no address formula: to reach the 500th node you must follow 500 `Next` references. Try the operations:' },
      { type: 'widget', name: 'linked-list' },
      { type: 'h2', text: 'A complete singly linked list' },
      { type: 'code', title: 'SinglyLinkedList.cs', code: cs`
public class SinglyLinkedList<T>
{
    private Node<T>? _head, _tail;
    public int Count { get; private set; }

    public void AddFirst(T value)                  // O(1)
    {
        var node = new Node<T>(value) { Next = _head };
        _head = node;
        _tail ??= node;                            // first node is also the tail
        Count++;
    }

    public void AddLast(T value)                   // O(1) thanks to _tail
    {
        var node = new Node<T>(value);
        if (_tail is null) _head = _tail = node;
        else { _tail.Next = node; _tail = node; }
        Count++;
    }

    public bool Contains(T value)                  // O(n)
    {
        for (var n = _head; n != null; n = n.Next)
            if (EqualityComparer<T>.Default.Equals(n.Value, value)) return true;
        return false;
    }

    public bool Remove(T value)                    // O(n) to find, O(1) to unlink
    {
        Node<T>? prev = null;
        for (var n = _head; n != null; prev = n, n = n.Next)
        {
            if (!EqualityComparer<T>.Default.Equals(n.Value, value)) continue;

            if (prev is null) _head = n.Next;      // removing the head
            else prev.Next = n.Next;               // skip over n
            if (n == _tail) _tail = prev;          // removing the tail
            Count--;
            return true;
        }
        return false;
    }
}`, output: '' },
      { type: 'note', kind: 'warn', text: 'Most linked list bugs are forgotten edge cases. Always test: an empty list, a list with one node, removing the head, and removing the tail. Drawing the boxes and arrows on paper before coding helps a lot.' },
      { type: 'h2', text: 'Array vs linked list' },
      { type: 'table', head: ['Operation', 'Array / List<T>', 'Singly linked list'], rows: [
        ['Access by index', '`O(1)`', '`O(n)`'],
        ['Add / remove at the front', '`O(n)`', '`O(1)`'],
        ['Add at the end', '`O(1)` amortised', '`O(1)` with a tail reference'],
        ['Insert after a node you already have', '`O(n)` (shift)', '`O(1)`'],
        ['Search', '`O(n)`', '`O(n)`'],
        ['Memory per element', 'Just the value', 'Value + reference + object header'],
        ['Cache-friendly', 'Yes', 'No: nodes are scattered']
      ] },
      { type: 'note', kind: 'info', text: 'In everyday .NET code, `List<T>` almost always wins, even for many inserts, because of the CPU cache. Linked lists matter as building blocks (hash table buckets, LRU caches, adjacency lists) and they appear in a lot of interview questions, because they test careful pointer handling.' },
      { type: 'h2', text: 'Classic: reverse a linked list' },
      { type: 'p', text: 'Turn every arrow around. Walk the list with three references: `prev` (already reversed part), `current`, and `next` (saved before we break the link).' },
      { type: 'code', title: 'Reverse.cs', code: cs`
static Node<int>? Reverse(Node<int>? head)
{
    Node<int>? prev = null;
    var current = head;
    while (current != null)
    {
        var next = current.Next;   // 1. remember the rest of the list
        current.Next = prev;       // 2. turn this arrow around
        prev = current;            // 3. step forward
        current = next;
    }
    return prev;                   // prev is the new head
}

var head = new Node<int>(1) { Next = new Node<int>(2) { Next = new Node<int>(3) } };
for (var n = Reverse(head); n != null; n = n.Next) Console.Write(n.Value + " ");`, output: '3 2 1 ' },
      { type: 'p', text: 'O(n) time, O(1) extra space: no new nodes are created, only references change.' },
      { type: 'h2', text: 'The fast and slow pointer trick' },
      { type: 'p', text: 'Move one reference one step at a time and another two steps at a time. When the fast one reaches the end, the slow one is in the **middle**. If the list has a **cycle** (some node points back to an earlier one), the fast pointer laps the slow one and they meet. This is Floyd’s cycle detection, and it needs no extra memory.' },
      { type: 'code', title: 'HasCycle.cs', code: cs`
static bool HasCycle(Node<int>? head)
{
    var slow = head;
    var fast = head;
    while (fast?.Next != null)
    {
        slow = slow!.Next;          // 1 step
        fast = fast.Next.Next;      // 2 steps
        if (slow == fast) return true;
    }
    return false;                   // fast fell off the end: no cycle
}`, output: '' },
      { type: 'quiz', question: 'What does this line do inside a loop over a linked list?\n`prev.Next = current.Next;`', options: ['Inserts a new node', 'Removes `current` from the list', 'Reverses the list', 'Moves `prev` forward'], answer: 1, explain: '`prev` now skips over `current` and points at the node after it. `current` is no longer reachable from the list.' },
      { type: 'quiz', question: 'Why is getting the 1000th element O(n) in a linked list but O(1) in an array?', options: [
        'Linked lists store fewer elements.',
        'Nodes are not stored in one block, so there is no address formula: you must follow Next references one by one.',
        'Linked lists are always sorted.',
        'Arrays use a hash table internally.'
      ], answer: 1, explain: 'Each node can be anywhere in memory. The only way to find node 1000 is to start at the head and hop 999 times.' },
      { type: 'exercise', task: 'Write `Middle(Node<int> head)` that returns the value of the middle node in one pass, without counting the nodes first. For an even number of nodes return the second of the two middle nodes. Test with 1 → 2 → 3 → 4 → 5 and 1 → 2 → 3 → 4 → 5 → 6.', hint: 'Fast and slow pointers: move slow one step and fast two steps while `fast != null && fast.Next != null`.', solution: cs`
static int Middle(Node<int> head)
{
    var slow = head;
    var fast = head;
    while (fast != null && fast.Next != null)
    {
        slow = slow.Next!;
        fast = fast.Next.Next;
    }
    return slow.Value;
}

static Node<int> Build(params int[] values)
{
    Node<int>? head = null;
    for (int i = values.Length - 1; i >= 0; i--)
        head = new Node<int>(values[i]) { Next = head };
    return head!;
}

Console.WriteLine(Middle(Build(1, 2, 3, 4, 5)));
Console.WriteLine(Middle(Build(1, 2, 3, 4, 5, 6)));`, output: '3\n4' }
    ],
    keyPoints: [
      'A linked list is a chain of nodes; each node holds a value and a `Next` reference.',
      'Adding or removing at the front is O(1); reaching the k-th node is O(k).',
      'Keep a tail reference to make adding at the end O(1).',
      'Reversal and fast/slow pointers are the classic linked list techniques; always test empty, one-node, head and tail cases.'
    ]
  },

  // ------------------------------------------------------------------ 9
  {
    slug: 'doubly-linked-lists',
    title: 'Doubly and circular linked lists',
    summary: 'Add a Prev reference to remove any node in O(1), use .NET’s LinkedList<T>, close the list into a circle, and build an LRU cache.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'A singly linked list can only walk forward, which makes some operations awkward: to remove a node you first need the node **before** it, and removing the last node means walking the whole list to find the new tail. A **doubly linked list** gives every node two references: `Next` and `Prev`.' },
      { type: 'code', title: 'DNode.cs', code: cs`
public class DNode<T>
{
    public T Value;
    public DNode<T>? Prev, Next;
    public DNode(T value) => Value = value;
}

// null ← A ⇄ B ⇄ C ⇄ D → null      (head = A, tail = D)`, output: '' },
      { type: 'p', text: 'With `Prev`, a node knows both neighbours. If you have a reference to a node, you can unlink it in O(1) without searching. Step through the pointer changes:' },
      { type: 'widget', name: 'dll-rewire' },
      { type: 'table', head: ['Operation', 'Singly linked', 'Doubly linked'], rows: [
        ['Add / remove first', '`O(1)`', '`O(1)`'],
        ['Add last (with tail)', '`O(1)`', '`O(1)`'],
        ['Remove last', '`O(n)`: need the node before the tail', '`O(1)`: `tail.Prev`'],
        ['Remove a node you hold a reference to', '`O(n)`: find its predecessor', '`O(1)`'],
        ['Walk backwards', 'Not possible', '`O(n)`'],
        ['Extra memory per node', '1 reference', '2 references']
      ] },
      { type: 'h2', text: 'LinkedList<T> in .NET' },
      { type: 'p', text: '.NET’s `LinkedList<T>` is a doubly linked list. Its nodes are `LinkedListNode<T>` objects, and methods that take a node are O(1):' },
      { type: 'code', title: 'Playlist.cs', code: cs`
var playlist = new LinkedList<string>();
playlist.AddLast("Intro");
playlist.AddLast("Song A");
var outro = playlist.AddLast("Outro");        // returns the node

var b = playlist.AddBefore(outro, "Song B");  // O(1): we hold the node
playlist.AddFirst("Warm-up");
playlist.Remove(b);                           // O(1) unlink by node

Console.WriteLine(string.Join(" → ", playlist));
Console.WriteLine($"First: {playlist.First!.Value}, Last: {playlist.Last!.Value}");
Console.WriteLine($"Before Outro: {outro.Previous!.Value}");`, output: 'Warm-up → Intro → Song A → Outro\nFirst: Warm-up, Last: Outro\nBefore Outro: Song A' },
      { type: 'note', kind: 'warn', text: '`playlist.Remove("Song A")` (by value) must first search for the node: O(n). Only the overloads that take a `LinkedListNode<T>` are O(1). Keep references to nodes you will need to remove later.' },
      { type: 'h2', text: 'Circular linked lists' },
      { type: 'p', text: 'In a **circular** list the last node’s `Next` points back to the first node (and in a doubly circular list, the first node’s `Prev` points to the last). There is no `null` at the end; you stop when you are back where you started. Circular lists are handy for things that go round and round: players taking turns, round-robin scheduling of tasks, or a repeating animation sequence.' },
      { type: 'code', title: 'Turns.cs', code: cs`
// A circular singly linked list of players
var a = new Node<string>("Asha");
var b = new Node<string>("Bala");
var c = new Node<string>("Chen");
a.Next = b; b.Next = c; c.Next = a;          // close the circle

var turn = a;
for (int i = 0; i < 7; i++)
{
    Console.Write(turn.Value + " ");
    turn = turn.Next!;                       // never null
}`, output: 'Asha Bala Chen Asha Bala Chen Asha ' },
      { type: 'note', kind: 'info', text: 'Inside .NET, `LinkedList<T>` is actually stored as a **circular** doubly linked list: `First.Previous` would be the last node. The public API hides this (`Last.Next` returns `null`), but it is why `Last` is O(1) without a separate tail field.' },
      { type: 'h2', text: 'Sentinel (dummy) nodes' },
      { type: 'p', text: 'Many edge cases come from `head` or `tail` being `null`. A common trick is a permanent **sentinel** node that sits before the first real node (and often after the last). The list is never truly empty, so every insert and remove can use the same code with no special cases for the ends.' },
      { type: 'h2', text: 'Real use: an LRU cache' },
      { type: 'p', text: 'An **LRU (least recently used) cache** keeps the N most recently used items and throws away the oldest when it is full. Browsers, databases and BIM viewers that load model files on demand all use this idea. It needs two things at once: find an item by key quickly (a `Dictionary`) and move items to the front or drop the oldest quickly (a doubly linked list). Together, every operation is O(1).' },
      { type: 'code', title: 'LruCache.cs', code: cs`
var cache = new LruCache(2);
cache.Put("A", "Tower A.ifc");
cache.Put("B", "Tower B.ifc");
Console.WriteLine(cache.Get("A"));                  // A is now most recent
cache.Put("C", "Tower C.ifc");                      // full: evicts B
Console.WriteLine(cache.Get("B") ?? "B was evicted");
Console.WriteLine(cache.Get("C"));

public class LruCache
{
    private readonly int _capacity;
    private readonly Dictionary<string, LinkedListNode<(string Key, string Value)>> _map = new();
    private readonly LinkedList<(string Key, string Value)> _order = new();   // front = most recent

    public LruCache(int capacity) => _capacity = capacity;

    public string? Get(string key)
    {
        if (!_map.TryGetValue(key, out var node)) return null;
        _order.Remove(node);          // O(1): we have the node
        _order.AddFirst(node);        // mark as most recently used
        return node.Value.Value;
    }

    public void Put(string key, string value)
    {
        if (_map.TryGetValue(key, out var existing))
            _order.Remove(existing);
        else if (_map.Count == _capacity)
        {
            var oldest = _order.Last!;            // least recently used
            _order.RemoveLast();
            _map.Remove(oldest.Value.Key);
        }
        _map[key] = _order.AddFirst((key, value));
    }
}`, output: 'Tower A.ifc\nB was evicted\nTower C.ifc' },
      { type: 'quiz', question: 'You hold a reference to a node in the middle of a doubly linked list. How long does it take to remove it?', options: ['`O(1)`', '`O(log n)`', '`O(n)`', 'It depends on the value'], answer: 0, explain: 'The node knows both neighbours: `node.Prev.Next = node.Next; node.Next.Prev = node.Prev;`. No search needed.' },
      { type: 'quiz', question: 'How do you know when to stop walking a circular linked list?', options: ['When `Next` is null', 'When you are back at the node you started from', 'After `Count` steps only', 'You cannot walk it'], answer: 1, explain: 'There is no null in a circular list. Remember the start node and stop when you reach it again (counting steps also works if you track `Count`).' },
      { type: 'exercise', task: 'Using `LinkedList<int>` with the numbers 1 to 8, remove every second node (2, 4, 6, 8) in a single pass, using node references so each removal is O(1).', hint: 'Walk with `var node = list.First;`. Save `node.Next` before removing it, because a removed node’s `Next` becomes null.', solution: cs`
var list = new LinkedList<int>(Enumerable.Range(1, 8));

var node = list.First;
while (node?.Next != null)
{
    var toRemove = node.Next;     // the second of each pair
    node = toRemove.Next;         // move on first: toRemove.Next becomes null after Remove
    list.Remove(toRemove);        // O(1) by node
}

Console.WriteLine(string.Join(" ", list));`, output: '1 3 5 7' }
    ],
    keyPoints: [
      'A doubly linked list adds a `Prev` reference, so any node you hold can be removed in O(1).',
      '.NET’s `LinkedList<T>` is doubly linked; only the node-based methods are O(1).',
      'In a circular list the last node links back to the first; stop when you return to the start.',
      'Dictionary + doubly linked list = LRU cache with O(1) get and put.'
    ]
  },

  // ------------------------------------------------------------------ 10
  {
    slug: 'stacks',
    title: 'Stacks and their uses',
    summary: 'Last in, first out: implement a stack on an array, check balanced brackets, build undo/redo, evaluate expressions and meet the monotonic stack pattern.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'A **stack** is a collection where you only touch the **top**. You **push** an item onto the top and **pop** the top item off. The last item in is the first item out: **LIFO**. Think of a stack of plates, or steel sections loaded onto a truck: the last one loaded is the first one unloaded.' },
      { type: 'table', head: ['Operation', 'Meaning', 'Cost'], rows: [
        ['`Push(x)`', 'Put x on top', '`O(1)` amortised'],
        ['`Pop()`', 'Remove and return the top', '`O(1)`'],
        ['`Peek()`', 'Look at the top without removing it', '`O(1)`'],
        ['`Count`', 'How many items', '`O(1)`']
      ] },
      { type: 'p', text: 'You already use stacks every day: the **call stack** of your program, **Undo** in any editor, the **Back** button in a browser. In algorithms, stacks appear whenever you must handle the most recent unfinished thing first.' },
      { type: 'h2', text: 'A stack is just an array with a top index' },
      { type: 'code', title: 'ArrayStack.cs', code: cs`
public class ArrayStack<T>
{
    private T[] _items = new T[4];
    private int _count;                       // also the index of the next free slot

    public int Count => _count;

    public void Push(T item)
    {
        if (_count == _items.Length)
            Array.Resize(ref _items, _items.Length * 2);   // double when full
        _items[_count++] = item;
    }

    public T Pop()
    {
        if (_count == 0) throw new InvalidOperationException("Stack is empty");
        T item = _items[--_count];
        _items[_count] = default!;            // release the reference
        return item;
    }

    public T Peek() => _count > 0 ? _items[_count - 1] : throw new InvalidOperationException("Stack is empty");
}`, output: '' },
      { type: 'p', text: 'Pushing and popping only touch the end of the array, so nothing ever shifts. .NET’s `Stack<T>` works exactly like this.' },
      { type: 'h2', text: 'Balanced brackets' },
      { type: 'p', text: 'Compilers and editors must check that every `(`, `[` and `{` is closed by the right partner in the right order. A stack makes this easy: push every opening bracket; on a closing bracket, the top of the stack must be its partner.' },
      { type: 'widget', name: 'bracket-checker' },
      { type: 'code', title: 'IsBalanced.cs', code: cs`
static bool IsBalanced(string code)
{
    var stack = new Stack<char>();
    foreach (char c in code)
    {
        switch (c)
        {
            case '(' or '[' or '{':
                stack.Push(c);
                break;
            case ')' or ']' or '}':
                char expected = c == ')' ? '(' : c == ']' ? '[' : '{';
                if (!stack.TryPop(out char top) || top != expected)
                    return false;             // nothing open, or wrong partner
                break;
        }
    }
    return stack.Count == 0;                  // anything left was never closed
}

Console.WriteLine(IsBalanced("if (a[i] > 0) { f(x); }"));
Console.WriteLine(IsBalanced("Math.Max(a[0], b[1)]"));`, output: 'True\nFalse' },
      { type: 'h2', text: 'Undo and redo with two stacks' },
      { type: 'code', title: 'UndoRedo.cs', code: cs`
var undo = new Stack<string>();
var redo = new Stack<string>();

void Do(string action)  { undo.Push(action); redo.Clear(); Console.WriteLine($"do   {action}"); }
void Undo()             { if (undo.TryPop(out var a)) { redo.Push(a); Console.WriteLine($"undo {a}"); } }
void Redo()             { if (redo.TryPop(out var a)) { undo.Push(a); Console.WriteLine($"redo {a}"); } }

Do("move beam");
Do("rotate column");
Undo();
Undo();
Redo();`, output: 'do   move beam\ndo   rotate column\nundo rotate column\nundo move beam\nredo move beam' },
      { type: 'note', kind: 'tip', text: 'A new action clears the redo stack. Otherwise “redo” could replay an action on top of a state it was never meant for.' },
      { type: 'h2', text: 'Evaluating expressions' },
      { type: 'p', text: 'Calculators and compilers often turn `(3 + 4) * 2` into **postfix** form (`3 4 + 2 *`), where each operator comes after its two operands. Postfix needs no brackets and is evaluated with one stack: push numbers; for an operator, pop two numbers, apply it, push the result.' },
      { type: 'code', title: 'Postfix.cs', code: cs`
static double EvalPostfix(string expr)
{
    var stack = new Stack<double>();
    foreach (var token in expr.Split(' ', StringSplitOptions.RemoveEmptyEntries))
    {
        if (double.TryParse(token, out double number)) { stack.Push(number); continue; }

        double right = stack.Pop(), left = stack.Pop();   // note the order!
        stack.Push(token switch
        {
            "+" => left + right,
            "-" => left - right,
            "*" => left * right,
            "/" => left / right,
            _ => throw new FormatException($"Unknown operator {token}")
        });
    }
    return stack.Pop();
}

Console.WriteLine(EvalPostfix("3 4 + 2 *"));      // (3 + 4) * 2
Console.WriteLine(EvalPostfix("10 2 8 * + 3 -")); // 10 + 2 * 8 - 3`, output: '14\n23' },
      { type: 'h2', text: 'Pattern: the monotonic stack' },
      { type: 'p', text: 'A powerful interview pattern: for each element, find the **next greater element** to its right. The naive way checks every pair (O(n²)). With a stack of indexes still waiting for an answer, each index is pushed and popped once: **O(n)**.' },
      { type: 'code', title: 'NextGreater.cs', code: cs`
static int[] NextGreater(int[] a)
{
    var result = new int[a.Length];
    Array.Fill(result, -1);
    var waiting = new Stack<int>();             // indexes, values decreasing from bottom to top

    for (int i = 0; i < a.Length; i++)
    {
        while (waiting.Count > 0 && a[waiting.Peek()] < a[i])
            result[waiting.Pop()] = a[i];       // a[i] is the answer for everything smaller
        waiting.Push(i);
    }
    return result;                               // still waiting → no greater element (-1)
}

Console.WriteLine(string.Join(", ", NextGreater([2, 1, 5, 3, 6])));`, output: '5, 5, 6, 6, -1' },
      { type: 'quiz', question: 'Push 1, push 2, push 3, pop, push 4, pop, pop. What is left on the stack?', options: ['1', '1, 2', '3', 'Nothing'], answer: 0, explain: '[1] → [1,2] → [1,2,3] → pop 3 → [1,2] → [1,2,4] → pop 4 → pop 2 → [1].' },
      { type: 'quiz', question: 'Why is `(]` not balanced, even though it has one opening and one closing bracket?', options: ['The count is wrong.', 'When `]` arrives the top of the stack is `(`, which is not its partner.', 'Round brackets cannot contain square ones.', 'The stack is empty at the end.'], answer: 1, explain: 'Matching is checked against the most recent unclosed bracket, the top of the stack. `]` needs `[` on top.' },
      { type: 'exercise', task: 'Remove adjacent pairs of equal letters repeatedly until none are left. Example: `"abbaca"` → remove `bb` → `"aaca"` → remove `aa` → `"ca"`. Solve it in one O(n) pass with a stack.', hint: 'For each letter: if it equals the top of the stack, pop (the pair cancels); otherwise push it. The stack holds the answer, bottom to top.', solution: cs`
static string RemoveDuplicates(string s)
{
    var stack = new Stack<char>();
    foreach (char c in s)
    {
        if (stack.Count > 0 && stack.Peek() == c) stack.Pop();
        else stack.Push(c);
    }
    var chars = stack.ToArray();      // ToArray returns top first
    Array.Reverse(chars);
    return new string(chars);
}

Console.WriteLine(RemoveDuplicates("abbaca"));
Console.WriteLine(RemoveDuplicates("azxxzy"));`, output: 'ca\nay' }
    ],
    keyPoints: [
      'A stack is **LIFO**: push and pop at the top, both O(1).',
      'It is just an array (or List) where you only use the end; .NET provides `Stack<T>`.',
      'Use a stack when the most recent unfinished thing must be handled first: brackets, undo, expressions, the call stack.',
      'A **monotonic stack** turns “next greater element” problems from O(n²) into O(n).'
    ]
  },

  // ------------------------------------------------------------------ 11
  {
    slug: 'queues',
    title: 'Queues, circular buffers and deques',
    summary: 'First in, first out: why a List makes a slow queue, how a circular buffer gives O(1) at both ends, using Queue<T>, and when you need a deque.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'A **queue** is the fair version of a stack: items leave in the order they arrived. You **enqueue** at the back and **dequeue** from the front: **FIFO**, first in, first out. Print jobs, customer support tickets, messages between services, and the steps of breadth-first search all use queues.' },
      { type: 'table', head: ['Operation', 'Meaning', 'Cost'], rows: [
        ['`Enqueue(x)`', 'Add x at the back', '`O(1)` amortised'],
        ['`Dequeue()`', 'Remove and return the front item', '`O(1)`'],
        ['`Peek()`', 'Look at the front item', '`O(1)`'],
        ['`Count`', 'How many items', '`O(1)`']
      ] },
      { type: 'h2', text: 'The slow way: a List' },
      { type: 'p', text: 'The obvious idea is `list.Add(x)` to enqueue and `list.RemoveAt(0)` to dequeue. But removing index 0 shifts every other item one slot left, so each dequeue is O(n), and processing n items costs O(n²).' },
      { type: 'h2', text: 'The fast way: a circular buffer' },
      { type: 'p', text: 'Instead of moving the items, move the **front marker**. Keep two indexes: `head` (where the next item will be taken) and `tail` (where the next item will be written). Both only move forward, and when they reach the end of the array they **wrap around** to index 0 using `% capacity`. The array behaves like a ring.' },
      { type: 'widget', name: 'ring-buffer' },
      { type: 'code', title: 'RingQueue.cs', code: cs`
public class RingQueue<T>
{
    private T[] _items;
    private int _head;      // index of the front item
    private int _tail;      // index where the next item goes
    private int _count;

    public RingQueue(int capacity = 4) => _items = new T[capacity];
    public int Count => _count;

    public void Enqueue(T item)
    {
        if (_count == _items.Length) Grow();
        _items[_tail] = item;
        _tail = (_tail + 1) % _items.Length;     // wrap around
        _count++;
    }

    public T Dequeue()
    {
        if (_count == 0) throw new InvalidOperationException("Queue is empty");
        T item = _items[_head];
        _items[_head] = default!;
        _head = (_head + 1) % _items.Length;     // wrap around
        _count--;
        return item;
    }

    private void Grow()
    {
        var bigger = new T[_items.Length * 2];
        for (int i = 0; i < _count; i++)         // copy in queue order, front first
            bigger[i] = _items[(_head + i) % _items.Length];
        _items = bigger;
        _head = 0;
        _tail = _count;
    }
}`, output: '' },
      { type: 'note', kind: 'warn', text: 'When the buffer grows, you cannot simply copy the array as it is: the queue may wrap around the end. Copy the items in queue order (from `head`, wrapping) so the new array starts with the front item at index 0.' },
      { type: 'h2', text: 'Queue<T> in .NET' },
      { type: 'p', text: '.NET’s `Queue<T>` is a growable circular buffer, just like the one above.' },
      { type: 'code', title: 'Jobs.cs', code: cs`
var jobs = new Queue<string>();
jobs.Enqueue("Export IFC");
jobs.Enqueue("Generate drawings");
jobs.Enqueue("Send report");

Console.WriteLine($"Next up: {jobs.Peek()}");

while (jobs.TryDequeue(out var job))
    Console.WriteLine($"Running {job} ({jobs.Count} left)");`, output: 'Next up: Export IFC\nRunning Export IFC (2 left)\nRunning Generate drawings (1 left)\nRunning Send report (0 left)' },
      { type: 'note', kind: 'tip', text: '`Dequeue()` on an empty queue throws `InvalidOperationException`. In loops, `TryDequeue(out var x)` is cleaner and safe.' },
      { type: 'h2', text: 'Deque: a double-ended queue' },
      { type: 'p', text: 'A **deque** (say “deck”) allows adding and removing at **both** ends in O(1). It can act as a stack, a queue, or both at once, and it is the key structure of the “sliding window maximum” technique you will meet later. A circular buffer supports it naturally: moving `head` backwards is `(head - 1 + capacity) % capacity`.' },
      { type: 'p', text: '.NET has no class called `Deque<T>`. Use `LinkedList<T>` (`AddFirst`, `AddLast`, `RemoveFirst`, `RemoveLast` are all O(1)), or write a circular-buffer deque when performance matters.' },
      { type: 'h2', text: 'Other queues you will meet' },
      { type: 'table', head: ['Type', 'Order', 'Where'], rows: [
        ['`Queue<T>`', 'First in, first out', 'Single-threaded work lists, BFS'],
        ['`PriorityQueue<TElement, TPriority>`', 'Smallest priority first', 'Schedulers, Dijkstra (see Heaps lesson)'],
        ['`ConcurrentQueue<T>`', 'FIFO, thread-safe', 'Several threads adding and taking work'],
        ['`Channel<T>`', 'FIFO, async producer/consumer', 'Background processing pipelines']
      ] },
      { type: 'quiz', question: 'Enqueue 1, 2, 3, then Dequeue twice, then Enqueue 4. What is the front item?', options: ['1', '2', '3', '4'], answer: 2, explain: '[1,2,3] → dequeue 1 → dequeue 2 → [3] → enqueue 4 → [3,4]. The front is 3.' },
      { type: 'quiz', question: 'A circular buffer has capacity 8 and `tail = 7`. After one Enqueue, what is `tail`?', options: ['8', '0', '7', '1'], answer: 1, explain: '`tail = (7 + 1) % 8 = 0`. It wraps around to the start of the array.' },
      { type: 'exercise', task: 'Write a `RecentCounter` class. `Ping(int t)` records a request at time `t` milliseconds (times only increase) and returns how many requests happened in the last 3000 ms, including this one (the range `[t − 3000, t]`). Pings at 1, 100, 3001, 3002 should return 1, 2, 3, 3.', hint: 'Keep the times in a `Queue<int>`. On each ping, enqueue `t`, then dequeue from the front while the oldest time is less than `t − 3000`.', solution: cs`
var counter = new RecentCounter();
foreach (int t in new[] { 1, 100, 3001, 3002 })
    Console.Write(counter.Ping(t) + " ");

public class RecentCounter
{
    private readonly Queue<int> _times = new();

    public int Ping(int t)
    {
        _times.Enqueue(t);
        while (_times.Peek() < t - 3000)
            _times.Dequeue();           // too old, never needed again
        return _times.Count;
    }
}`, output: '1 2 3 3 ' }
    ],
    keyPoints: [
      'A queue is **FIFO**: enqueue at the back, dequeue from the front, both O(1).',
      'A List with `RemoveAt(0)` is an O(n) dequeue; a **circular buffer** moves indexes instead of items.',
      'Head and tail wrap around with `% capacity`; when growing, copy items in queue order.',
      'A deque allows O(1) at both ends; in .NET use `LinkedList<T>` or a circular buffer.'
    ]
  }
];
