import { Lesson } from '../learn.types';
import { cs } from './cs';

export const PATTERNS_MEMORY: Lesson[] = [
  // ------------------------------------------------------------------ pattern matching
  {
    slug: 'pattern-matching',
    title: 'Pattern matching',
    summary: 'Test the shape of data and pull values out in one step: type, property, relational, logical and list patterns with is and switch.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'Code often asks several questions at once: “is this object a Beam, and is it longer than 8 m?”. **Pattern matching** lets you test a value’s type and contents, and capture parts of it into variables, in a single readable expression.' },
      { type: 'h2', text: 'is with a type pattern' },
      { type: 'code', title: 'TypePattern.cs', code: cs`
object item = new Beam("B1", 9.5);

// old way: test, then cast
if (item is Beam)
{
    var b1 = (Beam)item;
    Console.WriteLine(b1.Mark);
}

// pattern: test and declare a typed variable together
if (item is Beam b && b.Length > 8)
    Console.WriteLine($"{b.Mark} is a long beam");

record Beam(string Mark, double Length);`, output: 'B1\nB1 is a long beam' },
      { type: 'h2', text: 'switch expressions with patterns' },
      { type: 'widget', name: 'pattern-match' },
      { type: 'table', head: ['Pattern', 'Matches when…', 'Example'], rows: [
        ['constant', 'equal to a constant', '`null`, `0`, `"IPE300"`'],
        ['type', 'the value is that type (declares a variable)', '`Beam b`'],
        ['relational', 'compared to a constant', '`> 8`, `<= 0`'],
        ['logical', 'combined with and / or / not', '`>= 1 and <= 5`, `not null`'],
        ['property', 'properties match nested patterns', '`{ Length: > 8, Profile: "IPE300" }`'],
        ['discard', 'anything', '`_`'],
        ['`when` guard', 'an extra boolean condition', '`int n when n % 2 == 0`']
      ] },
      { type: 'h2', text: 'Property patterns on real data' },
      { type: 'code', title: 'Properties.cs', code: cs`
static string Classify(Beam b) => b switch
{
    { Length: <= 0 } => "invalid",
    { Profile: "HEA200" or "HEA300", Length: > 6 } => "heavy span",
    { Length: > 8 } => "long",
    { Length: < 2 } => "stub",
    _ => "standard"
};

Console.WriteLine(Classify(new Beam("B1", "HEA200", 7.5)));
Console.WriteLine(Classify(new Beam("B2", "IPE200", 1.2)));

record Beam(string Mark, string Profile, double Length);`, output: 'heavy span\nstub' },
      { type: 'h2', text: 'not null' },
      { type: 'code', code: cs`
if (selected is not null) Highlight(selected);
if (input is not (null or ""))  Process(input);`, title: 'NotNull.cs' },
      { type: 'h2', text: 'Tuple patterns' },
      { type: 'code', title: 'TuplePattern.cs', code: cs`
static string Rps(string a, string b) => (a, b) switch
{
    ("rock", "scissors") or ("scissors", "paper") or ("paper", "rock") => "A wins",
    var (x, y) when x == y => "draw",
    _ => "B wins"
};
Console.WriteLine(Rps("paper", "rock"));`, output: 'A wins' },
      { type: 'h2', text: 'List patterns (C# 11)' },
      { type: 'code', title: 'ListPattern.cs', code: cs`
static string Describe(int[] v) => v switch
{
    [] => "empty",
    [var only] => $"one item: {only}",
    [var first, .., var last] => $"from {first} to {last}",
};
Console.WriteLine(Describe(new[] { 4, 8, 15, 16 }));`, output: 'from 4 to 16' },
      { type: 'note', kind: 'tip', text: 'The compiler checks switch expressions: it warns if some input isn’t covered (no `_` arm) and errors if an arm can never be reached because an earlier one already covers it. Order arms from most specific to most general.' },
      { type: 'quiz', question: 'What does `obj is Beam { Length: > 6 } b` do?', options: ['Casts obj to Beam without checking', 'Checks obj is a Beam with Length > 6 and, if so, stores it in b', 'Sets Length to 6', 'Compile error'], answer: 1, explain: 'It combines a type test, a property pattern and a variable declaration.' },
      { type: 'quiz', question: 'In a switch expression, why should `_ => …` come last?', options: ['It is faster', 'It matches everything, so arms after it could never run', 'C# requires alphabetical order', 'It doesn’t matter'], answer: 1, explain: 'Arms are tested in order; the compiler reports later arms as unreachable.' },
      { type: 'exercise', task: 'Write `static string Shipping(decimal weightKg, bool express)` with a switch expression on the tuple `(weightKg, express)`: ≤ 1 kg express → "Rs 150", ≤ 1 kg → "Rs 60", ≤ 10 kg express → "Rs 400", ≤ 10 kg → "Rs 180", anything heavier → "Freight". Negative weight → throw.', solution: cs`
static string Shipping(decimal weightKg, bool express) => (weightKg, express) switch
{
    ( < 0, _) => throw new ArgumentOutOfRangeException(nameof(weightKg)),
    ( <= 1, true) => "Rs 150",
    ( <= 1, false) => "Rs 60",
    ( <= 10, true) => "Rs 400",
    ( <= 10, false) => "Rs 180",
    _ => "Freight"
};

Console.WriteLine(Shipping(0.5m, true));
Console.WriteLine(Shipping(7m, false));
Console.WriteLine(Shipping(25m, true));`, output: 'Rs 150\nRs 180\nFreight' }
    ],
    keyPoints: [
      '`is` and `switch` can test type, values and properties in one expression.',
      'Patterns: type, constant, relational, `and`/`or`/`not`, property, tuple, list, `_`.',
      'Arms are tested top to bottom; put specific ones first and `_` last.',
      'Patterns declare typed variables, removing manual casts.'
    ]
  },

  // ------------------------------------------------------------------ tuples
  {
    slug: 'tuples-deconstruction',
    title: 'Tuples and deconstruction',
    summary: 'Group a few values without writing a class, return several results from a method, and unpack them into variables.',
    minutes: 11,
    blocks: [
      { type: 'p', text: 'Sometimes a method naturally produces several results: minimum and maximum, a success flag and a value, a coordinate pair. Writing a class for each is overkill, and `out` parameters are clumsy. A **tuple** groups a few values into one lightweight value.' },
      { type: 'code', title: 'Tuples.cs', code: cs`
(string, double) a = ("B1", 6.0);             // unnamed: Item1, Item2
(string Mark, double Length) b = ("B2", 4.5); // named elements
var c = (Mark: "B3", Length: 7.2);            // names in the literal

Console.WriteLine(a.Item1);
Console.WriteLine(b.Mark);
Console.WriteLine(c);                          // nice ToString`, output: 'B1\nB2\n(B3, 7.2)' },
      { type: 'h2', text: 'Returning several values' },
      { type: 'widget', name: 'tuple-lab' },
      { type: 'code', title: 'Stats.cs', code: cs`
static (double Min, double Max, double Avg) Stats(double[] v)
    => (v.Min(), v.Max(), v.Average());

var s = Stats(new[] { 12.5, 40, 22, 8.5 });
Console.WriteLine($"min {s.Min}, max {s.Max}, avg {s.Avg}");`, output: 'min 8.5, max 40, avg 20.75' },
      { type: 'h2', text: 'Deconstruction' },
      { type: 'code', title: 'Deconstruct.cs', code: cs`
var (min, max, avg) = Stats(new[] { 12.5, 40, 22, 8.5 });   // three new variables
var (_, top, _) = Stats(new[] { 3.0, 9.0 });                 // _ discards
Console.WriteLine($"{min} {max} {avg} {top}");

// swap without a temporary variable
int x = 1, y = 2;
(x, y) = (y, x);
Console.WriteLine($"{x} {y}");

// deconstruct in a foreach over a dictionary
var weights = new Dictionary<string, double> { ["IPE200"] = 22.4, ["IPE300"] = 42.2 };
foreach (var (profile, kg) in weights)
    Console.WriteLine($"{profile}: {kg}");`, output: '8.5 40 20.75 9\n2 1\nIPE200: 22.4\nIPE300: 42.2' },
      { type: 'h2', text: 'Deconstructing your own types' },
      { type: 'code', title: 'Point.cs', code: cs`
public readonly struct Point3(double x, double y, double z)
{
    public double X { get; } = x;
    public double Y { get; } = y;
    public double Z { get; } = z;

    public void Deconstruct(out double x, out double y, out double z)
        => (x, y, z) = (X, Y, Z);
}

var (px, py, _) = new Point3(1, 2, 3);
Console.WriteLine($"{px}, {py}");
// records get Deconstruct automatically from their positional parameters`, output: '1, 2' },
      { type: 'h2', text: 'Tuples vs classes and records' },
      { type: 'table', head: ['Use', 'When'], rows: [
        ['tuple', 'a quick, local grouping: a private method’s result, a LINQ intermediate value'],
        ['record', 'the data has meaning across your program (a Section, an ExportResult) or is public API'],
        ['class', 'the data also has behaviour and identity']
      ] },
      { type: 'note', kind: 'info', text: 'Tuples (`ValueTuple`) are value types and their elements are mutable fields. Tuples with the same element types and values are equal with `==`. Element names are only a compile-time convenience.' },
      { type: 'quiz', question: 'What does `var (a, _) = (5, 9);` do?', options: ['a = 5, the 9 is discarded', 'a = 9', 'Creates a tuple named a', 'Compile error'], answer: 0, explain: 'Deconstruction by position; `_` throws the second value away.' },
      { type: 'quiz', question: 'How do you swap x and y with tuples?', options: ['`x = y; y = x;`', '`(x, y) = (y, x);`', '`Swap(x, y);`', '`x <=> y;`'], answer: 1, explain: 'The right side is evaluated first into a tuple, then deconstructed into x and y.' },
      { type: 'exercise', task: 'Write `static (int Quotient, int Remainder) Divide(int a, int b)` and use deconstruction to print 17 ÷ 5 as “3 remainder 2”. Then use it to convert 200 minutes into hours and minutes.', solution: cs`
static (int Quotient, int Remainder) Divide(int a, int b) => (a / b, a % b);

var (q, r) = Divide(17, 5);
Console.WriteLine($"{q} remainder {r}");

var (hours, minutes) = Divide(200, 60);
Console.WriteLine($"{hours} h {minutes} min");`, output: '3 remainder 2\n3 h 20 min' }
    ],
    keyPoints: [
      'Tuples group a few values: `(string Mark, double Length)`.',
      'Return tuples to give back several results without `out` or a new class.',
      'Deconstruct with `var (a, b) = …`; use `_` to discard.',
      'Prefer records/classes for data that matters beyond one method.'
    ]
  },

  // ------------------------------------------------------------------ memory and GC
  {
    slug: 'memory-and-gc',
    title: 'Memory: stack, heap and garbage collection',
    summary: 'Where your variables and objects really live, how the garbage collector frees memory, and how to write code that creates less garbage.',
    minutes: 16,
    blocks: [
      { type: 'p', text: 'You never call `delete` in C#, yet memory is freed. This lesson explains how, because understanding memory is the key to fast, smooth software, especially in 3D and BIM tools that handle millions of objects.' },
      { type: 'h2', text: 'Stack and heap' },
      { type: 'table', head: ['', 'Stack', 'Heap'], rows: [
        ['Holds', 'method frames: parameters and local variables (value types, and references)', 'objects created with `new` (class instances, arrays, strings, boxed values)'],
        ['Size', 'small (about 1 MB per thread)', 'large (as much as the machine allows)'],
        ['Freed', 'automatically when the method returns', 'by the garbage collector, some time after nothing references the object'],
        ['Speed', 'extremely fast', 'allocation is fast; collection costs time']
      ] },
      { type: 'code', title: 'WhereItLives.cs', code: cs`
void Calculate()
{
    int count = 3;                       // stack: the value 3
    double[] loads = new double[count];  // stack: reference → heap: the array
    var beam = new Beam("B1");           // stack: reference → heap: the Beam object
    Point3 p = new Point3(1, 2, 3);      // struct local: stack, no heap allocation
}   // the frame is gone; the array and Beam are now unreachable garbage` },
      { type: 'note', kind: 'info', text: 'Simplification alert: a value type stored inside a class (a field) or an array lives on the heap with that object. The rule is “value types live where they are declared”.' },
      { type: 'h2', text: 'How the garbage collector works' },
      { type: 'ol', items: [
        '**Mark**: starting from the **roots** (local variables on every thread’s stack, static fields, CPU registers), follow every reference and mark each object reached.',
        '**Sweep / compact**: everything not marked is garbage. Its memory is reclaimed, and surviving objects may be moved together to avoid gaps.',
        '**Promote**: survivors move to an older **generation**.'
      ] },
      { type: 'widget', name: 'gc-sim' },
      { type: 'h2', text: 'Generations' },
      { type: 'p', text: 'Most objects die young: temporary strings, LINQ iterators, short-lived lists. So .NET collects **generation 0** (new objects) very often and cheaply, generation 1 less often, and **generation 2** (long-lived objects like your loaded model) rarely, because a gen-2 collection must examine much more memory. Objects larger than about 85 KB go straight to the **Large Object Heap**, collected with gen 2.' },
      { type: 'h2', text: 'Why it matters for performance' },
      { type: 'p', text: 'While the GC works, your threads may pause. In a 3D viewport rendering 60 frames per second, each frame has about 16 ms; allocating lots of garbage every frame triggers frequent collections and visible stutter. Fewer allocations → fewer collections → smoother apps.' },
      { type: 'code', title: 'LessGarbage.cs', code: cs`
// ✗ allocates a new list and an iterator every frame
void OnFrame()
{
    var visible = members.Where(m => m.IsVisible).ToList();
    Draw(visible);
}

// ✓ reuse one list; clear it instead of re-creating it
private readonly List<Member> _visible = new(capacity: 10_000);
void OnFrameFast()
{
    _visible.Clear();
    foreach (var m in members)
        if (m.IsVisible) _visible.Add(m);
    Draw(_visible);
}` },
      { type: 'h2', text: 'Habits that reduce allocations' },
      { type: 'ul', items: [
        'Use `StringBuilder` instead of `+=` in loops.',
        'Reuse collections in hot paths (`Clear()` instead of `new`). Give lists an initial capacity when you know the size.',
        'Use small `struct`s for points and vectors stored in large arrays.',
        'Avoid boxing: use generic collections, not `object` or `ArrayList`.',
        'Use `ArrayPool<T>.Shared` and `Span<T>` (covered later) for temporary buffers.',
        '**Measure first**: Visual Studio’s Diagnostic Tools and the .NET profilers show allocations and GC pauses.'
      ] },
      { type: 'note', kind: 'warn', text: 'Don’t call `GC.Collect()` yourself to “clean up”. The runtime tunes collections far better than manual calls, and forcing a full collection usually makes things slower.' },
      { type: 'h2', text: 'Memory leaks in a managed language' },
      { type: 'p', text: 'The GC frees only **unreachable** objects. If something still references an object you no longer need, it is never freed. Common causes: forgotten event subscriptions, static lists that only grow, caches without a size limit, and closures capturing big objects.' },
      { type: 'quiz', question: 'When can the garbage collector free an object?', options: ['As soon as a method returns', 'When nothing reachable from the roots references it any more', 'After exactly one second', 'Only when you call GC.Collect()'], answer: 1, explain: 'Objects are collected once they are unreachable, at a time chosen by the runtime.' },
      { type: 'quiz', question: 'Why are generation-0 collections cheap?', options: ['They skip marking', 'They only examine young objects, and most of those are already dead', 'They run on the GPU', 'They never move objects'], answer: 1, explain: 'Gen 0 is small and mostly garbage, so there is little live data to process.' },
      { type: 'exercise', task: 'This method is called 60 times per second and causes GC stutter. Rewrite it to allocate nothing per call (hint: reuse a field).\n`double[] GetDepths(Member[] ms) { var d = new double[ms.Length]; for (int i = 0; i < ms.Length; i++) d[i] = ms[i].Depth; return d; }`', solution: cs`
private double[] _depths = Array.Empty<double>();

ReadOnlySpan<double> GetDepths(Member[] ms)
{
    if (_depths.Length < ms.Length)
        _depths = new double[ms.Length];        // grows rarely, then reused

    for (int i = 0; i < ms.Length; i++)
        _depths[i] = ms[i].Depth;

    return _depths.AsSpan(0, ms.Length);       // a view, no copy
}` }
    ],
    keyPoints: [
      'Method frames live on the stack; objects from `new` live on the heap.',
      'The GC marks objects reachable from roots and frees the rest.',
      'Generations make collections cheap: most objects die young.',
      'Fewer allocations in hot paths means fewer GC pauses and smoother apps.'
    ]
  },

  // ------------------------------------------------------------------ IDisposable
  {
    slug: 'idisposable',
    title: 'IDisposable and using',
    summary: 'Release files, connections and native resources at the right moment with Dispose and using, and implement IDisposable in your own classes.',
    minutes: 12,
    blocks: [
      { type: 'p', text: 'The garbage collector manages **memory**. But some objects hold resources the GC knows nothing about: open files, database connections, network sockets, GPU buffers, native handles from libraries like VTK. These must be released **as soon as you are done**, not whenever the GC happens to run. That is the job of `IDisposable`.' },
      { type: 'code', code: cs`
public interface IDisposable
{
    void Dispose();     // "release your resources now"
}`, title: 'IDisposable.cs' },
      { type: 'widget', name: 'using-scope' },
      { type: 'h2', text: 'The using statement' },
      { type: 'code', title: 'Using.cs', code: cs`
using (var conn = new SqlConnection(connectionString))
{
    conn.Open();
    // … query …
}   // conn.Dispose() is called here, even if an exception was thrown

// C# 8+: using declaration, disposed at the end of the enclosing block
using var reader = new StreamReader("members.csv");
string? header = reader.ReadLine();` },
      { type: 'p', text: 'A `using` statement is shorthand for `try { … } finally { obj?.Dispose(); }`. If a type implements `IDisposable`, use it inside `using` unless something else owns it.' },
      { type: 'h2', text: 'Implementing IDisposable' },
      { type: 'code', title: 'RenderBuffer.cs', code: cs`
public sealed class RenderBuffer : IDisposable
{
    private IntPtr _gpuHandle;          // a native resource
    private readonly FileStream _log;   // a managed disposable we own
    private bool _disposed;

    public RenderBuffer(string logPath)
    {
        _gpuHandle = NativeGpu.Allocate(1024 * 1024);
        _log = File.OpenWrite(logPath);
    }

    public void Draw()
    {
        ObjectDisposedException.ThrowIf(_disposed, this);   // .NET 7+
        // … use the buffer …
    }

    public void Dispose()
    {
        if (_disposed) return;          // safe to call twice
        NativeGpu.Free(_gpuHandle);
        _gpuHandle = IntPtr.Zero;
        _log.Dispose();                 // dispose what you own
        _disposed = true;
    }
}` },
      { type: 'ul', items: [
        'Dispose everything your object **owns** that is disposable.',
        'Make `Dispose` safe to call more than once.',
        'After disposal, throw `ObjectDisposedException` if someone uses the object.',
        'For non-sealed classes with native resources, look up the full “dispose pattern” with `protected virtual void Dispose(bool disposing)` and a finalizer, or better, wrap the handle in a `SafeHandle`.'
      ] },
      { type: 'h2', text: 'IAsyncDisposable' },
      { type: 'code', code: cs`
await using var stream = new FileStream("big.bin", FileMode.Create);
await stream.WriteAsync(data);`, title: 'AsyncUsing.cs' },
      { type: 'note', kind: 'warn', text: 'Don’t dispose objects you didn’t create and don’t own, such as a stream passed into your method or a shared `HttpClient`. Disposing something another part of the program still uses causes `ObjectDisposedException` there.' },
      { type: 'quiz', question: 'What does the garbage collector NOT manage for you?', options: ['Memory of normal objects', 'Unreachable strings', 'Open file handles and database connections at the right time', 'Arrays'], answer: 2, explain: 'The GC frees memory eventually; resources like files need deterministic release via Dispose.' },
      { type: 'quiz', question: 'A `using` statement is equivalent to…', options: ['A loop', 'try / finally that calls Dispose', 'try / catch that ignores errors', 'A lock'], answer: 1, explain: 'Dispose runs in a finally block, so it runs even if an exception is thrown.' },
      { type: 'exercise', task: 'Create a class `Timer3D : IDisposable` that starts a `Stopwatch` in its constructor and, in `Dispose`, prints “<name> took X ms”. Use it with `using` around a loop that sums 1 to 10 million, so the time is printed automatically at the end of the block.', solution: cs`
using System.Diagnostics;

using (new Timer3D("Sum loop"))
{
    long sum = 0;
    for (int i = 1; i <= 10_000_000; i++) sum += i;
    Console.WriteLine(sum);
}

public sealed class Timer3D : IDisposable
{
    private readonly string _name;
    private readonly Stopwatch _sw = Stopwatch.StartNew();
    public Timer3D(string name) => _name = name;
    public void Dispose() => Console.WriteLine($"{_name} took {_sw.ElapsedMilliseconds} ms");
}`, output: '50000005000000\nSum loop took 9 ms' }
    ],
    keyPoints: [
      '`IDisposable.Dispose()` releases non-memory resources immediately.',
      'Always wrap disposable objects you create in `using`.',
      '`using` = try/finally with Dispose; it runs even on exceptions.',
      'Implement IDisposable when your class owns disposable or native resources.'
    ]
  },

  // ------------------------------------------------------------------ iterators
  {
    slug: 'iterators-yield',
    title: 'Iterators and yield',
    summary: 'Produce sequences lazily with yield return: how iterators pause and resume, why that saves memory, and how LINQ is built on them.',
    minutes: 12,
    blocks: [
      { type: 'p', text: '`foreach` works on anything that implements `IEnumerable<T>`. You can create such sequences yourself without writing an enumerator class: a method that uses `yield return` becomes an **iterator**, producing its values one at a time, only when asked.' },
      { type: 'widget', name: 'yield-stepper' },
      { type: 'h2', text: 'Writing an iterator' },
      { type: 'code', title: 'GridLines.cs', code: cs`
static IEnumerable<double> GridPositions(double start, double spacing, int count)
{
    for (int i = 0; i < count; i++)
        yield return start + i * spacing;   // hand out one value, then pause
}

foreach (double x in GridPositions(0, 6.0, 5))
    Console.Write($"{x} ");`, output: '0 6 12 18 24' },
      { type: 'ul', items: [
        'The return type must be `IEnumerable<T>` (or `IEnumerator<T>`, or `IAsyncEnumerable<T>`).',
        'Calling the method runs **none** of its code; it returns an iterator object.',
        'Each `MoveNext` (each `foreach` step) runs until the next `yield return`, then pauses with all local variables kept.',
        '`yield break;` ends the sequence early.'
      ] },
      { type: 'h2', text: 'Infinite and huge sequences' },
      { type: 'code', title: 'Lazy.cs', code: cs`
static IEnumerable<long> Fibonacci()
{
    long a = 0, b = 1;
    while (true)                    // infinite, but only computed on demand
    {
        yield return a;
        (a, b) = (b, a + b);
    }
}

Console.WriteLine(string.Join(", ", Fibonacci().Take(10)));

// Read a 5 GB log, matching lines only, with tiny memory use
static IEnumerable<string> ErrorLines(string path)
{
    foreach (string line in File.ReadLines(path))
        if (line.Contains("ERROR")) yield return line;
}`, output: '0, 1, 1, 2, 3, 5, 8, 13, 21, 34' },
      { type: 'p', text: 'This is how LINQ works internally: `Where`, `Select` and `Take` are iterators that pull items from the previous step one by one. A whole query processes one item at a time end-to-end instead of building intermediate lists.' },
      { type: 'h2', text: 'Recursive data: walking a tree' },
      { type: 'code', title: 'Assembly.cs', code: cs`
public class Part
{
    public string Name { get; init; } = "";
    public List<Part> Children { get; } = new();

    public IEnumerable<Part> AllParts()      // depth-first, lazily
    {
        yield return this;
        foreach (var child in Children)
            foreach (var p in child.AllParts())
                yield return p;
    }
}` },
      { type: 'note', kind: 'warn', text: 'Because iterators are lazy, argument checks inside them run late: `GridPositions(0, 6, -1)` doesn’t throw until someone enumerates it. For immediate validation, check arguments in a normal method that then calls a private iterator.' },
      { type: 'note', kind: 'warn', text: 'Enumerating an iterator twice runs it twice. If it reads a file or does heavy work, call `ToList()` once and reuse the list.' },
      { type: 'quiz', question: 'What happens when you call a method containing `yield return`?', options: ['It runs to the end and returns a list', 'It returns an iterator; the body runs as values are requested', 'It runs on a background thread', 'Compile error unless it returns List<T>'], answer: 1, explain: 'Iterator methods are lazy: the body runs step by step during enumeration.' },
      { type: 'quiz', question: 'With `Fibonacci().Take(5)`, how many Fibonacci numbers are computed?', options: ['Infinitely many', '5', '10', '0'], answer: 1, explain: 'Take stops asking after 5 values, so the iterator never runs further.' },
      { type: 'exercise', task: 'Write an iterator `static IEnumerable<int> Range(int from, int to, int step)` that yields from `from` up to and including `to` (use `yield break` if step ≤ 0). Print `Range(0, 20, 5)` and the sum of `Range(1, 100, 1)`.', solution: cs`
static IEnumerable<int> Range(int from, int to, int step)
{
    if (step <= 0) yield break;
    for (int i = from; i <= to; i += step)
        yield return i;
}

Console.WriteLine(string.Join(" ", Range(0, 20, 5)));
Console.WriteLine(Range(1, 100, 1).Sum());`, output: '0 5 10 15 20\n5050' }
    ],
    keyPoints: [
      'A method with `yield return` is an iterator returning `IEnumerable<T>`.',
      'It runs lazily, pausing at each `yield return` and resuming on the next request.',
      'Lazy sequences handle huge or infinite data with little memory.',
      'LINQ operators are iterators; enumerate twice = run twice.'
    ]
  }
];
