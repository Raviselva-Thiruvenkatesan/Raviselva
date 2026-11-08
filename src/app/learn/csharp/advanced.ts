import { Lesson } from '../learn.types';
import { cs } from './cs';

export const ADVANCED: Lesson[] = [
  // ------------------------------------------------------------------ async/await
  {
    slug: 'async-await',
    title: 'async and await',
    summary: 'Keep apps responsive while waiting for files, networks and databases: Task, async methods, await, running waits together, cancellation and the classic mistakes.',
    minutes: 16,
    blocks: [
      { type: 'p', text: 'Downloading a model, reading a big file or querying a database involves **waiting**, often for seconds. If the UI thread waits, the window freezes. `async` and `await` let a method pause while it waits **without blocking the thread**, and continue when the result arrives.' },
      { type: 'widget', name: 'async-timeline' },
      { type: 'h2', text: 'Task and Task<T>' },
      { type: 'p', text: 'A `Task` represents work that will finish in the future. `Task<T>` will also produce a value of type `T`. Asynchronous .NET methods return tasks and are named with the suffix `Async`: `File.ReadAllTextAsync`, `HttpClient.GetStringAsync`.' },
      { type: 'h2', text: 'Writing an async method' },
      { type: 'code', title: 'LoadModel.cs', code: cs`
public async Task<int> CountMembersAsync(string path)
{
    string json = await File.ReadAllTextAsync(path);   // thread is free while the disk works
    var model = JsonSerializer.Deserialize<Model>(json)!;
    return model.Members.Count;                       // wrapped in Task<int> automatically
}

// caller (in a WPF button handler)
private async void LoadButton_Click(object sender, RoutedEventArgs e)
{
    StatusText.Text = "Loading…";
    int n = await CountMembersAsync("tower.json");
    StatusText.Text = $"{n} members";                  // back on the UI thread
}` },
      { type: 'ul', items: [
        'Mark the method `async`; return `Task`, `Task<T>` (or `ValueTask`).',
        '`await` pauses **this method** until the task completes; the thread goes off to do other work (like repainting the UI).',
        'After the await, code continues, on the UI thread in desktop apps, so you can update controls.',
        '`async void` is only for event handlers. Everywhere else return `Task`, so callers can await and catch errors.'
      ] },
      { type: 'h2', text: 'Waiting for several things together' },
      { type: 'code', title: 'WhenAll.cs', code: cs`
var http = new HttpClient();

Task<string> a = http.GetStringAsync("https://example.com/a");
Task<string> b = http.GetStringAsync("https://example.com/b");   // both requests in flight

string[] results = await Task.WhenAll(a, b);       // total ≈ the slower one
Console.WriteLine(results[0].Length + results[1].Length);

Task<string> first = await Task.WhenAny(a, b);     // whichever finishes first` },
      { type: 'h2', text: 'Cancellation' },
      { type: 'code', title: 'Cancel.cs', code: cs`
var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));   // auto-cancel after 10 s
CancelButton.Click += (_, _) => cts.Cancel();

try
{
    await ExportAsync("tower.ifc", cts.Token);
}
catch (OperationCanceledException)
{
    StatusText.Text = "Export cancelled";
}

async Task ExportAsync(string path, CancellationToken token)
{
    foreach (var member in members)
    {
        token.ThrowIfCancellationRequested();           // check regularly
        await WriteMemberAsync(member, token);         // pass the token down
    }
}` },
      { type: 'h2', text: 'Classic mistakes' },
      { type: 'table', head: ['Mistake', 'Why it hurts', 'Instead'], rows: [
        ['`task.Result` or `task.Wait()`', 'blocks the thread; can deadlock in UI apps', '`await task`'],
        ['`async void` methods', 'exceptions can’t be caught by the caller and can crash the app', 'return `Task`'],
        ['forgetting `await`', 'the method continues before the work is done; errors are lost', 'always await (or store and await later)'],
        ['`await` in a loop for independent work', 'runs one by one', 'start all, then `Task.WhenAll`'],
        ['`Task.Run` around I/O methods', 'wastes a thread just to wait', 'await the real `…Async` method']
      ] },
      { type: 'note', kind: 'info', text: 'async/await is about **waiting efficiently** (I/O). It doesn’t make CPU-heavy calculations faster. For those, see the next lesson on tasks and parallel programming.' },
      { type: 'quiz', question: 'What does `await` do while the awaited task is still running?', options: ['Blocks the current thread', 'Pauses the method and frees the thread to do other work', 'Starts a new process', 'Throws an exception'], answer: 1, explain: 'The method is suspended; the thread is released; the method resumes when the task completes.' },
      { type: 'quiz', question: 'Three independent downloads take 1 s each. Roughly how long does `await Task.WhenAll(a, b, c)` take if all three were started first?', options: ['3 s', '1 s', '0 s', '6 s'], answer: 1, explain: 'The waits overlap, so the total is about the longest single download.' },
      { type: 'exercise', task: 'Write `static async Task<long> TotalSizeAsync(string[] paths)` that reads all files concurrently with `File.ReadAllBytesAsync` and returns the total number of bytes. Print the result for two files.', solution: cs`
static async Task<long> TotalSizeAsync(string[] paths)
{
    Task<byte[]>[] reads = paths.Select(p => File.ReadAllBytesAsync(p)).ToArray();
    byte[][] contents = await Task.WhenAll(reads);
    return contents.Sum(c => (long)c.Length);
}

long total = await TotalSizeAsync(new[] { "a.ifc", "b.ifc" });
Console.WriteLine($"{total:N0} bytes");`, output: '4,812,330 bytes' }
    ],
    keyPoints: [
      '`async` methods return `Task`/`Task<T>` and use `await` to wait without blocking.',
      'Await I/O to keep UIs responsive and servers scalable.',
      'Start independent work first, then `await Task.WhenAll(...)`.',
      'Avoid `.Result`, `.Wait()` and `async void` (except event handlers); support cancellation.'
    ]
  },

  // ------------------------------------------------------------------ tasks and parallel
  {
    slug: 'tasks-parallel',
    title: 'Tasks and parallel programming',
    summary: 'Use every CPU core for heavy calculations: Task.Run, Parallel.For/ForEach, PLINQ, and when parallelism helps or hurts.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'Your PC probably has 8 or more CPU cores, but a normal loop uses only one. For **CPU-bound** work (clash detection, mesh generation, structural checks on thousands of members) splitting the work across cores can make it several times faster.' },
      { type: 'widget', name: 'parallel-cores' },
      { type: 'h2', text: 'I/O-bound vs CPU-bound' },
      { type: 'table', head: ['', 'I/O-bound', 'CPU-bound'], rows: [
        ['Time spent', 'waiting for disk, network, database', 'calculating'],
        ['Tool', '`async`/`await` with `…Async` methods', '`Task.Run`, `Parallel`, PLINQ'],
        ['Example', 'download a file, query SQL Server', 'triangulate a mesh, check 50,000 connections']
      ] },
      { type: 'h2', text: 'Task.Run: move heavy work off the UI thread' },
      { type: 'code', title: 'TaskRun.cs', code: cs`
private async void AnalyseButton_Click(object sender, RoutedEventArgs e)
{
    AnalyseButton.IsEnabled = false;
    var report = await Task.Run(() => RunClashDetection(model));   // runs on a pool thread
    ResultsGrid.ItemsSource = report.Clashes;                        // back on the UI thread
    AnalyseButton.IsEnabled = true;
}` },
      { type: 'h2', text: 'Parallel.For and Parallel.ForEach' },
      { type: 'code', title: 'Parallel.cs', code: cs`
double[] utilisation = new double[members.Length];

Parallel.For(0, members.Length, i =>
{
    utilisation[i] = CheckCapacity(members[i]);   // each index written by one thread only: safe
});

Parallel.ForEach(drawings, new ParallelOptions { MaxDegreeOfParallelism = 4 }, d =>
{
    d.Render();
});` },
      { type: 'p', text: '`Parallel.For` splits the index range into chunks and runs them on several thread-pool threads, then waits until all are done.' },
      { type: 'h2', text: 'PLINQ' },
      { type: 'code', code: cs`
var overloaded = members
    .AsParallel()                         // the rest of the query runs on many cores
    .Where(m => CheckCapacity(m) > 1.0)
    .Select(m => m.Mark)
    .ToList();`, title: 'Plinq.cs' },
      { type: 'h2', text: 'When parallel makes things worse' },
      { type: 'ul', items: [
        '**Tiny work per item**: the overhead of scheduling is bigger than the work. Summing 1,000 numbers is faster on one thread.',
        '**Shared state**: threads writing the same variable or list need locks, and waiting on locks kills the speed-up (next lesson).',
        '**Not thread-safe code**: `List<T>`, `Dictionary` and many libraries must not be modified from several threads at once. Use `ConcurrentBag`, `ConcurrentDictionary`, or per-thread results.',
        '**Order matters**: parallel loops finish items in unpredictable order.',
        '**UI objects**: WPF controls may only be touched from the UI thread.'
      ] },
      { type: 'code', title: 'ThreadSafeTotal.cs', code: cs`
// ✗ data race: many threads doing total += …
// ✓ give each thread its own subtotal, combine once at the end
double total = 0;
object gate = new();
Parallel.ForEach(members,
    () => 0.0,                                        // thread-local start value
    (m, _, local) => local + m.WeightKg,              // no sharing inside the loop
    local => { lock (gate) total += local; });        // combine once per thread
Console.WriteLine(total);` },
      { type: 'note', kind: 'tip', text: 'Measure before and after with `Stopwatch` (or BenchmarkDotNet). Parallel code is harder to debug, so use it where profiling shows a real CPU bottleneck.' },
      { type: 'quiz', question: 'Which tool fits a 20-second mesh calculation in a WPF app?', options: ['`await File.ReadAllTextAsync`', '`await Task.Run(() => BuildMesh())`', 'A `foreach` on the UI thread', '`Thread.Sleep`'], answer: 1, explain: 'It is CPU-bound: move it to a pool thread with Task.Run so the UI stays responsive.' },
      { type: 'quiz', question: 'Why can `Parallel.For` with `list.Add(...)` inside it crash or lose items?', options: ['Parallel.For can’t call methods', 'List<T> is not thread-safe for concurrent writes', 'It always runs in reverse', 'Lists are read-only'], answer: 1, explain: 'Concurrent Add calls corrupt the list’s internal state; use a concurrent collection or per-index arrays.' },
      { type: 'exercise', task: 'Count the prime numbers below 2,000,000 with a normal loop and with `Parallel.For` using thread-local counters, and print both results and times with Stopwatch.', solution: cs`
using System.Diagnostics;

static bool IsPrime(int n)
{
    if (n < 2) return false;
    for (int d = 2; (long)d * d <= n; d++) if (n % d == 0) return false;
    return true;
}

const int N = 2_000_000;
var sw = Stopwatch.StartNew();
int seq = 0;
for (int i = 0; i < N; i++) if (IsPrime(i)) seq++;
Console.WriteLine($"Sequential: {seq} in {sw.ElapsedMilliseconds} ms");

sw.Restart();
int par = 0;
Parallel.For(0, N, () => 0,
    (i, _, local) => IsPrime(i) ? local + 1 : local,
    local => Interlocked.Add(ref par, local));
Console.WriteLine($"Parallel:   {par} in {sw.ElapsedMilliseconds} ms");`, output: 'Sequential: 148933 in 610 ms\nParallel:   148933 in 105 ms' }
    ],
    keyPoints: [
      'CPU-bound work benefits from multiple cores; I/O-bound work needs async instead.',
      '`Task.Run` moves heavy work off the UI thread.',
      '`Parallel.For`/`ForEach` and PLINQ split work across cores.',
      'Avoid shared mutable state; measure the real speed-up.'
    ]
  },

  // ------------------------------------------------------------------ threads and locks
  {
    slug: 'threads-and-locks',
    title: 'Threads, locks and thread safety',
    summary: 'Why code that works on one thread breaks on two: race conditions, lock, Interlocked, concurrent collections, deadlocks and immutable data.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'Once several threads run at the same time (async continuations, `Task.Run`, `Parallel`, timers), any data they **share and change** is at risk. The bugs are nasty: they depend on timing, appear rarely, and often vanish in the debugger.' },
      { type: 'widget', name: 'race-condition' },
      { type: 'h2', text: 'lock' },
      { type: 'code', title: 'Lock.cs', code: cs`
public class ProgressTracker
{
    private readonly object _gate = new();      // a private object used only for locking
    private int _done;
    private readonly List<string> _log = new();

    public void Complete(string mark)
    {
        lock (_gate)                              // one thread at a time in here
        {
            _done++;
            _log.Add($"{mark} finished");
        }
    }

    public int Done { get { lock (_gate) return _done; } }
}` },
      { type: 'ul', items: [
        'Lock on a **private** object (never `this`, a `Type` or a string).',
        'Keep the locked section **short**: no I/O, no awaits, no calls to unknown code inside it.',
        'Every access (reads too) to the shared data must use the same lock.',
        '`await` is not allowed inside `lock`. For async code use `SemaphoreSlim` with `WaitAsync`.'
      ] },
      { type: 'h2', text: 'Interlocked: atomic operations on numbers' },
      { type: 'code', code: cs`
private int _count;
Interlocked.Increment(ref _count);
Interlocked.Add(ref _bytes, chunk.Length);
int old = Interlocked.Exchange(ref _state, 2);`, title: 'Interlocked.cs' },
      { type: 'h2', text: 'Concurrent collections' },
      { type: 'code', title: 'Concurrent.cs', code: cs`
using System.Collections.Concurrent;

var cache = new ConcurrentDictionary<string, Section>();
Section s = cache.GetOrAdd("IPE300", name => LoadSection(name));   // thread-safe

var results = new ConcurrentBag<ClashResult>();
Parallel.ForEach(pairs, p => { if (Clashes(p)) results.Add(new ClashResult(p)); });

var queue = new ConcurrentQueue<string>();   // producer/consumer` },
      { type: 'h2', text: 'Deadlocks' },
      { type: 'code', title: 'Deadlock.cs', code: cs`
// Thread 1                       // Thread 2
lock (a)                          lock (b)
{                                 {
    lock (b) { … }   // waits         lock (a) { … }   // waits
}                                 }
// each holds what the other needs: both wait forever` },
      { type: 'p', text: 'Avoid deadlocks by always taking multiple locks **in the same order**, by holding locks briefly, and by never blocking on async code (`.Result`) on a UI thread.' },
      { type: 'h2', text: 'The best lock is no lock' },
      { type: 'ul', items: [
        '**Don’t share**: give each thread its own data and combine results at the end.',
        '**Immutable data**: records with `init` properties, `ImmutableList<T>`. Objects that never change can be read by any number of threads safely.',
        '**Confine** mutable state to one thread (e.g. only the UI thread touches the view model) and pass messages to it.'
      ] },
      { type: 'note', kind: 'warn', text: 'WPF and WinForms controls belong to the UI thread. Changing them from another thread throws `InvalidOperationException`. After `await` you are back on the UI thread automatically; from other threads use `Dispatcher.Invoke`.' },
      { type: 'quiz', question: 'Why can `counter++` lose updates when two threads run it at once?', options: ['++ is slow', 'It is read, add, write: another thread can read the old value in between', 'Integers are read-only', 'The garbage collector resets it'], answer: 1, explain: 'Without synchronisation the three steps of two threads can interleave.' },
      { type: 'quiz', question: 'Which is the right way to protect a shared Dictionary that many threads add to?', options: ['Make it static', '`ConcurrentDictionary` or a lock around every access', 'Use `async`', 'Nothing is needed'], answer: 1, explain: 'Dictionary isn’t thread-safe; use a concurrent collection or consistent locking.' },
      { type: 'exercise', task: 'Fix this class so `Deposit` and `Withdraw` are safe when called from many threads, and `Withdraw` never makes the balance negative.\n`class Account { decimal _b; public void Deposit(decimal a) => _b += a; public bool Withdraw(decimal a) { if (_b < a) return false; _b -= a; return true; } }`', hint: 'The check and the subtraction in Withdraw must happen inside the SAME lock, or another thread can withdraw in between.', solution: cs`
public class Account
{
    private readonly object _gate = new();
    private decimal _balance;

    public void Deposit(decimal amount)
    {
        lock (_gate) _balance += amount;
    }

    public bool Withdraw(decimal amount)
    {
        lock (_gate)
        {
            if (_balance < amount) return false;   // check…
            _balance -= amount;                    // …and act, as one unit
            return true;
        }
    }

    public decimal Balance { get { lock (_gate) return _balance; } }
}` }
    ],
    keyPoints: [
      'Shared mutable data + several threads = race conditions.',
      'Protect it with `lock` (short, private lock object) or `Interlocked` for numbers.',
      'Use concurrent collections for shared collections; take locks in a fixed order.',
      'Prefer not sharing, immutable data, and confining state to one thread.'
    ]
  },

  // ------------------------------------------------------------------ reflection and attributes
  {
    slug: 'reflection-attributes',
    title: 'Reflection and attributes',
    summary: 'Inspect types at run time, attach metadata with attributes, and build things like validators, serializers and plug-in loaders.',
    minutes: 13,
    blocks: [
      { type: 'p', text: '**Reflection** lets a program examine types, properties and methods while it runs. **Attributes** are labels in square brackets that attach extra information to code. Together they power serializers (JSON), validation, ORMs like Entity Framework, test frameworks and plug-in systems.' },
      { type: 'widget', name: 'reflection-inspector' },
      { type: 'h2', text: 'Inspecting a type' },
      { type: 'code', title: 'Inspect.cs', code: cs`
using System.Reflection;

Type t = typeof(Beam);                     // or obj.GetType()
Console.WriteLine(t.FullName);

foreach (PropertyInfo p in t.GetProperties())
    Console.WriteLine($"{p.Name} : {p.PropertyType.Name}");

var beam = new Beam { Mark = "B1", LengthM = 6 };
PropertyInfo prop = t.GetProperty("LengthM")!;
Console.WriteLine(prop.GetValue(beam));    // read a property by name
prop.SetValue(beam, 7.5);                  // and write it`, output: 'Beam\nMark : String\nProfile : String\nLengthM : Double\nLevel : Int32\n6' },
      { type: 'h2', text: 'Attributes' },
      { type: 'code', title: 'Attributes.cs', code: cs`
using System.ComponentModel.DataAnnotations;

public class Beam
{
    [Required, MaxLength(6)]
    public string Mark { get; set; } = "";

    [Range(0.5, 24)]
    public double LengthM { get; set; }

    [Obsolete("Use LengthM")]               // compiler warns anyone who uses it
    public double Length => LengthM;
}` },
      { type: 'p', text: 'You have already used attributes: `[Flags]`, `[JsonIgnore]`, `[JsonPropertyName]`. On their own attributes do nothing. They are metadata that some code (the compiler, a serializer, your own validator) reads via reflection.' },
      { type: 'h2', text: 'Your own attribute and a tiny validator' },
      { type: 'code', title: 'Validator.cs', code: cs`
[AttributeUsage(AttributeTargets.Property)]
public sealed class PositiveAttribute : Attribute { }

public class Column
{
    [Positive] public double HeightM { get; set; }
    [Positive] public int Count { get; set; }
}

static List<string> Validate(object obj)
{
    var errors = new List<string>();
    foreach (var p in obj.GetType().GetProperties())
    {
        if (p.GetCustomAttribute<PositiveAttribute>() is null) continue;
        double value = Convert.ToDouble(p.GetValue(obj));
        if (value <= 0) errors.Add($"{p.Name} must be positive");
    }
    return errors;
}

Console.WriteLine(string.Join("; ", Validate(new Column { HeightM = 3.2, Count = 0 })));`, output: 'Count must be positive' },
      { type: 'h2', text: 'Creating objects and calling methods dynamically' },
      { type: 'code', title: 'Plugins.cs', code: cs`
// Load every class implementing IExporter from a plug-in DLL
Assembly asm = Assembly.LoadFrom("Exporters.dll");
var exporters = asm.GetTypes()
    .Where(t => typeof(IExporter).IsAssignableFrom(t) && !t.IsAbstract)
    .Select(t => (IExporter)Activator.CreateInstance(t)!)
    .ToList();` },
      { type: 'h2', text: 'Costs and cautions' },
      { type: 'ul', items: [
        'Reflection is **slow** compared to normal calls. Cache `PropertyInfo` objects, and don’t use reflection in hot loops.',
        'It skips compile-time checks: a typo in `GetProperty("Lenght")` returns `null` at run time.',
        'It can read private members, which breaks encapsulation. Use with care.',
        'Trimming and native AOT can remove members only used via reflection. **Source generators** (Master module) are the modern, fast alternative for many reflection uses.'
      ] },
      { type: 'quiz', question: 'What does an attribute like `[Range(0.5, 24)]` do on its own?', options: ['Validates the property automatically everywhere', 'Nothing until some code reads it via reflection', 'Makes the property read-only', 'Throws on invalid values'], answer: 1, explain: 'Attributes are metadata; frameworks or your own code must inspect them.' },
      { type: 'quiz', question: 'How do you get the Type object of an existing object `x`?', options: ['`typeof(x)`', '`x.GetType()`', '`Type(x)`', '`x.Type`'], answer: 1, explain: '`typeof` takes a type name; `GetType()` is called on an instance.' },
      { type: 'exercise', task: 'Write `static string Describe(object o)` that uses reflection to return “TypeName { Prop1 = …, Prop2 = … }” for any object’s public properties. Test it on an anonymous object `new { Mark = "B1", Kg = 253 }`.', solution: cs`
static string Describe(object o)
{
    var t = o.GetType();
    var parts = t.GetProperties().Select(p => $"{p.Name} = {p.GetValue(o)}");
    string name = t.Name.StartsWith("<>") ? "Anonymous" : t.Name;
    return $"{name} {{ {string.Join(", ", parts)} }}";
}

Console.WriteLine(Describe(new { Mark = "B1", Kg = 253 }));`, output: 'Anonymous { Mark = B1, Kg = 253 }' }
    ],
    keyPoints: [
      'Reflection inspects types and members at run time (`GetType`, `GetProperties`, `GetValue`).',
      'Attributes attach metadata; code reads them with `GetCustomAttribute`.',
      'Frameworks (JSON, validation, EF, tests) are built on reflection + attributes.',
      'Reflection is slow and unchecked: cache results and use it sparingly.'
    ]
  },

  // ------------------------------------------------------------------ Span<T>
  {
    slug: 'span-memory',
    title: 'Span<T>, Memory<T> and low-allocation code',
    summary: 'Work with slices of arrays, strings and buffers without copying or allocating: Span, ReadOnlySpan, stackalloc, ArrayPool and Memory.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'High-performance code (parsers, file importers, geometry kernels, render loops) spends a surprising amount of time creating small temporary arrays and strings. `Span<T>` lets you work with **part of existing memory** without copying it and without allocating anything on the heap.' },
      { type: 'widget', name: 'span-slice' },
      { type: 'h2', text: 'Span<T> basics' },
      { type: 'code', title: 'Span.cs', code: cs`
int[] data = { 10, 20, 30, 40, 50, 60 };

Span<int> middle = data.AsSpan(2, 3);     // view of 30, 40, 50: no copy
middle[0] = 99;                           // writes into data!
Console.WriteLine(data[2]);

Span<int> tail = middle.Slice(1);         // slicing a slice: still no copy
foreach (int v in tail) Console.Write(v + " ");`, output: '99\n40 50 ' },
      { type: 'ul', items: [
        'A span is a reference to memory plus a length. It can point into an array, a string, a stack buffer or native memory.',
        '`ReadOnlySpan<T>` is the read-only version; strings give you `ReadOnlySpan<char>`.',
        'Spans are `ref struct`s: they live only on the stack. You can’t store them in fields of classes, put them in lists, or use them across `await`.'
      ] },
      { type: 'h2', text: 'Parsing without allocations' },
      { type: 'code', title: 'Parse.cs', code: cs`
// "B12,IPE300,6.5" → mark, profile, length without Split (which allocates)
static double ParseLength(ReadOnlySpan<char> line)
{
    int first = line.IndexOf(',');
    ReadOnlySpan<char> rest = line[(first + 1)..];
    int second = rest.IndexOf(',');
    ReadOnlySpan<char> lengthText = rest[(second + 1)..];
    return double.Parse(lengthText, CultureInfo.InvariantCulture);   // parses straight from the span
}

Console.WriteLine(ParseLength("B12,IPE300,6.5"));`, output: '6.5' },
      { type: 'h2', text: 'stackalloc' },
      { type: 'code', code: cs`
Span<double> temp = stackalloc double[16];     // on the stack: free and instant
for (int i = 0; i < temp.Length; i++) temp[i] = i * 0.5;
// use only for SMALL sizes (stack is ~1 MB): a few hundred elements at most`, title: 'StackAlloc.cs' },
      { type: 'h2', text: 'ArrayPool: borrow big buffers' },
      { type: 'code', title: 'Pool.cs', code: cs`
using System.Buffers;

byte[] buffer = ArrayPool<byte>.Shared.Rent(64 * 1024);   // may be bigger than asked
try
{
    int read = await stream.ReadAsync(buffer.AsMemory(0, 64 * 1024));
    Process(buffer.AsSpan(0, read));
}
finally
{
    ArrayPool<byte>.Shared.Return(buffer);                 // give it back for reuse
}` },
      { type: 'h2', text: 'Memory<T>: when you need to store it or await' },
      { type: 'p', text: '`Memory<T>` is like a span that **can** live on the heap: store it in a field, keep it across `await`, put it in a collection. When you need to do the actual work, get a span from it with `.Span`.' },
      { type: 'table', head: ['Type', 'Lives', 'Use'], rows: [
        ['`Span<T>` / `ReadOnlySpan<T>`', 'stack only', 'fast synchronous processing of a slice'],
        ['`Memory<T>` / `ReadOnlyMemory<T>`', 'anywhere', 'async APIs, storing a slice for later'],
        ['`T[]`', 'heap', 'owning data long-term']
      ] },
      { type: 'note', kind: 'tip', text: 'Many .NET APIs already accept spans: `int.Parse(ReadOnlySpan<char>)`, `Stream.Read(Span<byte>)`, `string.Concat`, `MemoryExtensions.Split` (.NET 8). Using them in hot paths removes allocations with very small code changes.' },
      { type: 'note', kind: 'warn', text: 'Don’t sprinkle spans everywhere. Use them where a profiler shows allocation pressure or copying costs: file importers, network protocols, per-frame render code. Elsewhere, readable code wins.' },
      { type: 'quiz', question: 'After `var s = arr.AsSpan(1, 2); s[0] = 5;`, what is `arr[1]`?', options: ['Unchanged', '5', '0', 'Error: spans are read-only'], answer: 1, explain: 'The span is a view over the same array memory.' },
      { type: 'quiz', question: 'Why can’t a `Span<T>` be a field of a class?', options: ['It is too large', 'It is a ref struct that must stay on the stack', 'Classes can’t hold structs', 'It can, freely'], answer: 1, explain: 'Spans can point to stack memory, so the compiler keeps them on the stack. Use Memory<T> for fields.' },
      { type: 'exercise', task: 'Write `static int SumCsv(ReadOnlySpan<char> line)` that sums comma-separated integers like "12,5,30,8" without using Split or Substring (use IndexOf and slicing).', solution: cs`
static int SumCsv(ReadOnlySpan<char> line)
{
    int sum = 0;
    while (!line.IsEmpty)
    {
        int comma = line.IndexOf(',');
        ReadOnlySpan<char> part = comma < 0 ? line : line[..comma];
        sum += int.Parse(part);
        line = comma < 0 ? ReadOnlySpan<char>.Empty : line[(comma + 1)..];
    }
    return sum;
}

Console.WriteLine(SumCsv("12,5,30,8"));`, output: '55' }
    ],
    keyPoints: [
      '`Span<T>` is a no-copy, no-allocation view over arrays, strings or stack memory.',
      'Slice with `.Slice` or ranges; writes go to the original memory.',
      'Spans are stack-only; use `Memory<T>` for fields and async code.',
      'Use `stackalloc` (small) and `ArrayPool` (large) to avoid temporary arrays.'
    ]
  }
];
