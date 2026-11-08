import { Lesson } from '../learn.types';
import { cs } from './cs';

export const FUNCTIONAL: Lesson[] = [
  // ------------------------------------------------------------------ lambdas
  {
    slug: 'lambdas',
    title: 'Lambda expressions',
    summary: 'Write small methods inline with =>, understand type inference and closures, and use lambdas with List, sorting and LINQ.',
    minutes: 12,
    blocks: [
      { type: 'p', text: 'In the delegates lesson you passed methods like `Math.Sqrt` to other methods. Writing a whole named method just to say “length greater than 6” is clumsy. A **lambda expression** is an unnamed method written right where it is needed.' },
      { type: 'widget', name: 'lambda-builder' },
      { type: 'h2', text: 'Lambda syntax' },
      { type: 'table', head: ['Form', 'Example'], rows: [
        ['no parameters', '`() => DateTime.Now`'],
        ['one parameter', '`x => x * x`'],
        ['several parameters', '`(a, b) => a + b`'],
        ['explicit types', '`(int a, int b) => a + b`'],
        ['statement body', '`b => { var kg = b.Length * 42.2; return kg > 300; }`']
      ] },
      { type: 'p', text: 'Read `=>` as “goes to”. The left side lists parameters, the right side is the body. A lambda has no type of its own: it becomes whatever delegate type the place it is used expects (`Func<…>`, `Action<…>`, `Predicate<…>`).' },
      { type: 'h2', text: 'Lambdas everywhere' },
      { type: 'code', title: 'Everyday.cs', code: cs`
var beams = new List<Beam>
{
    new("B1", 6.0), new("B2", 4.5), new("B3", 7.2), new("B4", 8.0)
};

Beam? b3 = beams.Find(b => b.Mark == "B3");
bool anyShort = beams.Exists(b => b.Length < 5);
int removed = beams.RemoveAll(b => b.Length > 7.5);
beams.Sort((x, y) => y.Length.CompareTo(x.Length));      // longest first

Console.WriteLine(b3);
Console.WriteLine(anyShort);
Console.WriteLine(removed);
beams.ForEach(b => Console.Write(b.Mark + " "));

record Beam(string Mark, double Length);`, output: 'Beam { Mark = B3, Length = 7.2 }\nTrue\n1\nB3 B1 B2' },
      { type: 'h2', text: 'Closures: capturing variables' },
      { type: 'p', text: 'A lambda can use local variables from the method around it. It doesn’t copy them: it **captures** the variable itself, so it sees later changes.' },
      { type: 'code', title: 'Closure.cs', code: cs`
int clicks = 0;
Action onClick = () => clicks++;     // captures 'clicks'

onClick();
onClick();
Console.WriteLine(clicks);           // the lambda changed the real variable

Func<int> makeCounter()
{
    int count = 0;
    return () => ++count;            // count lives on inside the lambda
}
var next = makeCounter();
Console.WriteLine($"{next()} {next()} {next()}");`, output: '2\n1 2 3' },
      { type: 'note', kind: 'warn', text: 'Because lambdas capture variables (not values), a lambda created in a loop and run later sees the variable’s **final** value if the variable was declared outside the loop. `foreach` variables are fresh each iteration, so they are safe.' },
      { type: 'h2', text: 'static lambdas and discards' },
      { type: 'code', code: cs`
Func<double, double> square = static x => x * x;   // 'static': can't capture anything (no hidden allocations)
button.Click += (_, _) => Save();                   // _ = parameter you don't use`, title: 'Static.cs' },
      { type: 'quiz', question: 'Which lambda matches `Func<int, int, int>`?', options: ['`x => x * 2`', '`(a, b) => a * b`', '`() => 5`', '`(a, b) => Console.WriteLine(a + b)`'], answer: 1, explain: 'Two int parameters and an int result. The last option returns nothing, so it matches `Action<int, int>`.' },
      { type: 'quiz', question: 'After `int n = 1; Func<int> f = () => n * 10; n = 5;`, what is `f()`?', options: ['10', '50', '0', 'Compile error'], answer: 1, explain: 'The lambda captured the variable n, which is 5 when f runs.' },
      { type: 'exercise', task: 'Given `List<string> files = new() { "plan.dwg", "model.ifc", "notes.txt", "level2.ifc" };`, use lambdas to (1) remove all files that are not .ifc, (2) sort the rest alphabetically, and (3) print them.', solution: cs`
var files = new List<string> { "plan.dwg", "model.ifc", "notes.txt", "level2.ifc" };

files.RemoveAll(f => !f.EndsWith(".ifc", StringComparison.OrdinalIgnoreCase));
files.Sort((a, b) => string.Compare(a, b, StringComparison.Ordinal));
files.ForEach(f => Console.WriteLine(f));`, output: 'level2.ifc\nmodel.ifc' }
    ],
    keyPoints: [
      'A lambda is an inline, unnamed method: `(parameters) => body`.',
      'Its delegate type is inferred from where it is used.',
      'Lambdas capture outside variables by reference (closures).',
      'Use them with `Find`, `RemoveAll`, `Sort`, events and LINQ.'
    ]
  },

  // ------------------------------------------------------------------ events
  {
    slug: 'events',
    title: 'Events',
    summary: 'Let objects announce that something happened without knowing who is listening: declaring, raising, subscribing to and unsubscribing from events.',
    minutes: 13,
    blocks: [
      { type: 'p', text: 'When a model is saved, the viewport should refresh, the status bar should update and a backup might run. The `Model` class shouldn’t need to know about any of them. **Events** let one object (the **publisher**) announce “this happened” and any number of other objects (**subscribers**) react.' },
      { type: 'widget', name: 'event-bus' },
      { type: 'h2', text: 'Declaring and raising an event' },
      { type: 'code', title: 'Model.cs', code: cs`
public class SavedEventArgs : EventArgs
{
    public string Path { get; }
    public SavedEventArgs(string path) => Path = path;
}

public class Model
{
    public event EventHandler<SavedEventArgs>? Saved;   // the event

    public void Save(string path)
    {
        // … write the file …
        OnSaved(new SavedEventArgs(path));
    }

    protected virtual void OnSaved(SavedEventArgs e)
        => Saved?.Invoke(this, e);                       // raise it (if anyone listens)
}` },
      { type: 'h2', text: 'Subscribing' },
      { type: 'code', title: 'Subscribe.cs', code: cs`
var model = new Model();

model.Saved += (sender, e) => Console.WriteLine($"Status: saved to {e.Path}");
model.Saved += OnSavedBackup;

model.Save("tower.ifc");

model.Saved -= OnSavedBackup;          // unsubscribe
model.Save("tower-v2.ifc");

static void OnSavedBackup(object? sender, SavedEventArgs e)
    => Console.WriteLine($"Backup: copying {e.Path}");`, output: 'Status: saved to tower.ifc\nBackup: copying tower.ifc\nStatus: saved to tower-v2.ifc' },
      { type: 'h2', text: 'The standard pattern' },
      { type: 'ul', items: [
        'Use `EventHandler` (no data) or `EventHandler<TEventArgs>` (with data).',
        'Handlers receive `(object? sender, TEventArgs e)`: who raised it, and the details.',
        'Event-data classes derive from `EventArgs` and end in `EventArgs`.',
        'Raise through a `protected virtual void OnXxx(…)` method so subclasses can extend it.',
        'Name events with a verb: `Saved`, `SelectionChanged`, `Clicked` (past tense for “after”, `-ing` like `Closing` for “before”).'
      ] },
      { type: 'h2', text: 'Why “event” and not a public delegate?' },
      { type: 'p', text: 'The `event` keyword restricts outside code to `+=` and `-=`. Other classes can’t raise the event themselves or wipe everyone else’s subscriptions with `=`. Try the two buttons in the diagram to see the errors.' },
      { type: 'h2', text: 'Events in desktop apps' },
      { type: 'code', title: 'Wpf.xaml.cs', code: cs`
// WPF / WinForms controls expose events for user actions
saveButton.Click += (sender, e) => model.Save(currentPath);
membersList.SelectionChanged += OnSelectionChanged;
this.Closing += (s, e) => { if (HasUnsavedChanges) e.Cancel = !ConfirmClose(); };` },
      { type: 'note', kind: 'warn', text: 'A subscription keeps the subscriber alive: the publisher holds a reference to it. If a short-lived window subscribes to a long-lived service and never unsubscribes, the window can never be garbage collected, a classic **memory leak**. Unsubscribe (`-=`) when the subscriber closes.' },
      { type: 'quiz', question: 'From outside the Model class, which line compiles?', options: ['`model.Saved = null;`', '`model.Saved?.Invoke(model, e);`', '`model.Saved += Handler;`', 'All of them'], answer: 2, explain: 'Outside the declaring class, an event only supports `+=` and `-=`.' },
      { type: 'quiz', question: 'What are the two parameters of a standard event handler?', options: ['`(string name, int value)`', '`(object? sender, EventArgs e)`', '`(Model model)`', 'None'], answer: 1, explain: 'The sender and an EventArgs (or derived) object with the details.' },
      { type: 'exercise', task: 'Create a class `Thermometer` with a `Temperature` property. When it is set above 40, raise an event `Overheated` carrying the temperature. Subscribe a handler that prints a warning and set the temperature to 35, then 42.', solution: cs`
var t = new Thermometer();
t.Overheated += (_, e) => Console.WriteLine($"Warning: {e.Value} °C!");
t.Temperature = 35;
t.Temperature = 42;

public class ValueEventArgs : EventArgs
{
    public double Value { get; }
    public ValueEventArgs(double v) => Value = v;
}

public class Thermometer
{
    public event EventHandler<ValueEventArgs>? Overheated;
    private double _temp;

    public double Temperature
    {
        get => _temp;
        set
        {
            _temp = value;
            if (value > 40) Overheated?.Invoke(this, new ValueEventArgs(value));
        }
    }
}`, output: 'Warning: 42 °C!' }
    ],
    keyPoints: [
      'Events let a publisher notify any number of subscribers without knowing them.',
      'Declare with `event EventHandler<T>`; raise with `Xxx?.Invoke(this, e)`.',
      'Subscribers use `+=` and `-=`; outside code can’t raise or reset the event.',
      'Unsubscribe when done to avoid memory leaks.'
    ]
  },

  // ------------------------------------------------------------------ extension methods
  {
    slug: 'extension-methods',
    title: 'Extension methods',
    summary: 'Add your own methods to existing types, even ones you can’t change, and understand how LINQ is built from them.',
    minutes: 10,
    blocks: [
      { type: 'p', text: 'You can’t edit the `string` class or a third-party library. But you can **extend** them: an extension method is a static method that you call as if it were an instance method of the type.' },
      { type: 'widget', name: 'extension-chain' },
      { type: 'h2', text: 'Writing one' },
      { type: 'code', title: 'Extensions.cs', code: cs`
public static class DoubleExtensions          // 1. a static class
{
    // 2. a static method  3. 'this' before the first parameter
    public static double MmToM(this double mm) => mm / 1000.0;

    public static bool IsBetween(this double value, double min, double max)
        => value >= min && value <= max;
}

double depth = 300;
Console.WriteLine(depth.MmToM());              // reads naturally
Console.WriteLine(4.5.IsBetween(3, 6));`, output: '0.3\nTrue' },
      { type: 'ul', items: [
        'The class must be `static` and not nested; the method must be `static`.',
        'The first parameter, marked `this`, is the object the method is “called on”.',
        'The namespace containing the class must be imported with `using` to see the methods.',
        'Extension methods can only use the type’s **public** members: they don’t break encapsulation.'
      ] },
      { type: 'h2', text: 'Extending interfaces' },
      { type: 'code', title: 'IEnumerableExt.cs', code: cs`
public static class MemberExtensions
{
    public static double TotalWeight(this IEnumerable<Beam> beams)
    {
        double sum = 0;
        foreach (var b in beams) sum += b.Kg;
        return sum;
    }
}

List<Beam> level1 = LoadLevel(1);
Beam[] picked = GetSelection();
Console.WriteLine(level1.TotalWeight());    // works on a List…
Console.WriteLine(picked.TotalWeight());    // …and an array: both are IEnumerable<Beam>` },
      { type: 'p', text: 'This is exactly how **LINQ** works: `Where`, `Select`, `OrderBy` and friends are extension methods on `IEnumerable<T>` in the `System.Linq` namespace. That is why every collection gets them for free.' },
      { type: 'h2', text: 'Rules of thumb' },
      { type: 'ul', items: [
        'If a type has an instance method with the same signature, the instance method wins.',
        'Use extensions for small, general helpers. Don’t hide important business logic in them.',
        'Group them in classes named after what they extend: `StringExtensions`, `GeometryExtensions`.'
      ] },
      { type: 'quiz', question: 'What makes a static method an extension method?', options: ['The `extension` keyword', '`this` before its first parameter, in a static class', 'Being public', 'Being in the System namespace'], answer: 1, explain: 'The `this` modifier on the first parameter, inside a non-nested static class.' },
      { type: 'quiz', question: '`text.WordCount()` is compiled as…', options: ['`text.WordCount()` on the string class', '`StringExtensions.WordCount(text)`', 'A virtual call', 'A lambda'], answer: 1, explain: 'It is only syntax: the compiler calls the static method with the object as the first argument.' },
      { type: 'exercise', task: 'Write an extension method `string Repeat(this string s, int times)` and `bool IsPalindrome(this string s)` (ignore case). Test with "ab".Repeat(3) and "Level".IsPalindrome().', solution: cs`
public static class StringExtensions
{
    public static string Repeat(this string s, int times)
        => string.Concat(Enumerable.Repeat(s, times));

    public static bool IsPalindrome(this string s)
    {
        string lower = s.ToLowerInvariant();
        for (int i = 0, j = lower.Length - 1; i < j; i++, j--)
            if (lower[i] != lower[j]) return false;
        return true;
    }
}

Console.WriteLine("ab".Repeat(3));
Console.WriteLine("Level".IsPalindrome());`, output: 'ababab\nTrue' }
    ],
    keyPoints: [
      'Extension methods are static methods called like instance methods.',
      'Declare them in a static class with `this` on the first parameter.',
      'Extending an interface gives the method to every type that implements it.',
      'LINQ is a set of extension methods on `IEnumerable<T>`.'
    ]
  },

  // ------------------------------------------------------------------ LINQ basics
  {
    slug: 'linq-basics',
    title: 'LINQ basics: Where, Select, OrderBy',
    summary: 'Query collections like a database: filter, sort, transform, take and summarise data in a few readable lines.',
    minutes: 15,
    blocks: [
      { type: 'p', text: '**LINQ** (Language Integrated Query) lets you ask questions about collections: “all IPE300 beams longer than 6 m, heaviest first, top 3”. Instead of writing loops with `if`s and temporary lists, you describe **what** you want and LINQ does the looping.' },
      { type: 'widget', name: 'linq-pipeline' },
      { type: 'h2', text: 'Loop vs LINQ' },
      { type: 'code', title: 'Compare.cs', code: cs`
// With a loop
var marks1 = new List<string>();
foreach (var b in beams)
    if (b.Length > 6)
        marks1.Add(b.Mark);
marks1.Sort();

// With LINQ: same result, and it reads like the requirement
var marks2 = beams
    .Where(b => b.Length > 6)
    .Select(b => b.Mark)
    .OrderBy(m => m)
    .ToList();` },
      { type: 'h2', text: 'The core operators' },
      { type: 'table', head: ['Operator', 'Does', 'Example'], rows: [
        ['`Where`', 'keep items that pass a test', '`.Where(b => b.Level == 2)`'],
        ['`Select`', 'transform each item', '`.Select(b => b.Mark)`'],
        ['`OrderBy` / `OrderByDescending`', 'sort by a key', '`.OrderByDescending(b => b.Kg)`'],
        ['`ThenBy`', 'second sort key', '`.OrderBy(b => b.Level).ThenBy(b => b.Mark)`'],
        ['`Take` / `Skip`', 'first n / skip n (paging)', '`.Skip(20).Take(10)`'],
        ['`Distinct`', 'remove duplicates', '`.Select(b => b.Profile).Distinct()`'],
        ['`ToList` / `ToArray`', 'run the query and store results', '`.ToList()`']
      ] },
      { type: 'h2', text: 'Single results and checks' },
      { type: 'code', title: 'Single.cs', code: cs`
Beam? first = beams.FirstOrDefault(b => b.Profile == "HEA200");   // null if none
bool anyHeavy = beams.Any(b => b.Kg > 300);
bool allValid = beams.All(b => b.Length > 0);
int count = beams.Count(b => b.Level == 1);

double totalKg = beams.Sum(b => b.Kg);
double avgLen = beams.Average(b => b.Length);
double longest = beams.Max(b => b.Length);
Beam heaviest = beams.MaxBy(b => b.Kg)!;                            // .NET 6+

Console.WriteLine($"{count} on level 1, {totalKg} kg total, heaviest {heaviest.Mark}");`, output: '3 on level 1, 1773 kg total, heaviest B4' },
      { type: 'note', kind: 'warn', text: '`First()` and `Single()` throw if nothing matches (and `Single` also throws if more than one matches). Use `FirstOrDefault()` when “not found” is possible, and check for `null`.' },
      { type: 'h2', text: 'Anonymous types in Select' },
      { type: 'code', code: cs`
var report = beams
    .Where(b => b.Level == 2)
    .Select(b => new { b.Mark, Tonnes = b.Kg / 1000.0 });   // a type made on the fly

foreach (var r in report)
    Console.WriteLine($"{r.Mark}: {r.Tonnes:F3} t");`, output: 'B4: 0.338 t\nB5: 0.067 t\nB6: 0.233 t', title: 'Anonymous.cs' },
      { type: 'h2', text: 'Query syntax' },
      { type: 'p', text: 'LINQ also has an SQL-like syntax. It compiles to the same method calls; most teams use the method syntax, but you will see both.' },
      { type: 'code', code: cs`
var q = from b in beams
        where b.Length > 6
        orderby b.Kg descending
        select b.Mark;`, title: 'QuerySyntax.cs' },
      { type: 'quiz', question: 'What does `.Select(b => b.Mark)` return for a list of beams?', options: ['The beams with a Mark', 'A sequence of the Mark strings', 'The first Mark', 'A bool'], answer: 1, explain: 'Select transforms each item; here each Beam becomes its Mark string.' },
      { type: 'quiz', question: 'Which call is safe when no beam matches?', options: ['`First(b => …)`', '`Single(b => …)`', '`FirstOrDefault(b => …)`', '`Max(b => …)` on an empty list'], answer: 2, explain: 'FirstOrDefault returns null (default) instead of throwing.' },
      { type: 'exercise', task: 'From `int[] scores = { 72, 45, 90, 61, 88, 39, 77 };`, use LINQ to print: the passing scores (≥ 50) sorted highest first, how many failed, and the average of the passing scores to 1 decimal.', solution: cs`
int[] scores = { 72, 45, 90, 61, 88, 39, 77 };

var passed = scores.Where(s => s >= 50).OrderByDescending(s => s).ToList();
int failed = scores.Count(s => s < 50);

Console.WriteLine(string.Join(", ", passed));
Console.WriteLine($"Failed: {failed}");
Console.WriteLine($"Average pass: {passed.Average():F1}");`, output: '90, 88, 77, 72, 61\nFailed: 2\nAverage pass: 77.6' }
    ],
    keyPoints: [
      'LINQ queries collections with `Where`, `Select`, `OrderBy`, `Take`…',
      'Chain operators; finish with `ToList()` to get a stored result.',
      'Use `Any`, `Count`, `Sum`, `Average`, `Max`, `MaxBy` for answers.',
      'Prefer `FirstOrDefault` when nothing may match.'
    ]
  },

  // ------------------------------------------------------------------ LINQ advanced
  {
    slug: 'linq-advanced',
    title: 'LINQ: grouping, joins and deferred execution',
    summary: 'Group and summarise data, join two collections, flatten nested lists, and understand when a query actually runs.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'Basic LINQ filters and sorts. Real reports need more: totals **per** profile, beams **joined** with their section data, all bolts from all connections. And to use LINQ well you must know **when** a query really executes.' },
      { type: 'widget', name: 'linq-group' },
      { type: 'h2', text: 'GroupBy' },
      { type: 'code', title: 'Group.cs', code: cs`
var byProfile = beams
    .GroupBy(b => b.Profile)
    .Select(g => new
    {
        Profile = g.Key,                    // the value grouped on
        Count = g.Count(),
        TotalKg = g.Sum(b => b.Kg)
    })
    .OrderByDescending(x => x.TotalKg);

foreach (var p in byProfile)
    Console.WriteLine($"{p.Profile,-7} {p.Count} beams {p.TotalKg,6} kg");`, output: 'IPE300  3 beams    865 kg\nHEA200  2 beams    538 kg\nIPE200  3 beams    370 kg' },
      { type: 'p', text: 'Each group `g` is itself a sequence of the beams with that key, plus a `Key` property. `ToDictionary` and `ToLookup` are handy relatives: `beams.ToDictionary(b => b.Mark)` gives instant lookup by mark.' },
      { type: 'h2', text: 'Join' },
      { type: 'code', title: 'Join.cs', code: cs`
var sections = new[]
{
    new { Name = "IPE200", DepthMm = 200 },
    new { Name = "IPE300", DepthMm = 300 },
    new { Name = "HEA200", DepthMm = 190 }
};

var withDepth = beams.Join(
    sections,
    b => b.Profile,          // key from the beam
    s => s.Name,             // matching key from the section
    (b, s) => $"{b.Mark}: {s.DepthMm} mm deep");

Console.WriteLine(string.Join(" | ", withDepth.Take(3)));`, output: 'B1: 300 mm deep | B2: 200 mm deep | B3: 190 mm deep' },
      { type: 'h2', text: 'SelectMany: flattening' },
      { type: 'code', title: 'Flatten.cs', code: cs`
var connections = new[]
{
    new { Id = "C1", Bolts = new[] { "M20", "M20", "M20", "M20" } },
    new { Id = "C2", Bolts = new[] { "M16", "M16" } }
};

var allBolts = connections.SelectMany(c => c.Bolts);       // one flat sequence
Console.WriteLine(allBolts.Count());
Console.WriteLine(string.Join(", ", allBolts.Distinct()));`, output: '6\nM20, M16' },
      { type: 'h2', text: 'Deferred execution' },
      { type: 'p', text: 'Most LINQ operators don’t do anything when you call them. `beams.Where(...)` returns an object that **remembers the query**. The work happens only when something **enumerates** it: a `foreach`, `ToList()`, `Count()`, `First()` and so on. Toggle `.ToList()` in the diagram to see the difference.' },
      { type: 'table', head: ['Deferred (lazy)', 'Immediate (runs now)'], rows: [
        ['`Where`, `Select`, `OrderBy`, `Take`, `Skip`, `GroupBy`, `Join`, `SelectMany`', '`ToList`, `ToArray`, `ToDictionary`, `Count`, `Sum`, `Max`, `First`, `Any`, `foreach`']
      ] },
      { type: 'note', kind: 'warn', text: 'Enumerating a deferred query twice runs it twice. If the query is expensive (reading a file, calling a database, heavy filtering) and you need the result more than once, call `ToList()` once and reuse the list.' },
      { type: 'code', title: 'Twice.cs', code: cs`
var heavy = beams.Where(b => ExpensiveCheck(b));   // nothing runs yet

int n = heavy.Count();          // runs ExpensiveCheck for every beam
var first = heavy.First();      // runs it AGAIN

var cached = heavy.ToList();    // run once…
int n2 = cached.Count;          // …then reuse for free` },
      { type: 'h2', text: 'LINQ and performance' },
      { type: 'ul', items: [
        'LINQ is fast enough for almost all business code. Readability usually wins.',
        'In tight inner loops (millions of items per frame, like 3D rendering), a plain `for` loop over an array avoids small allocations. Measure with a profiler before optimising.',
        '`Any()` is better than `Count() > 0`: it stops at the first match.'
      ] },
      { type: 'quiz', question: 'When does `var q = list.Where(x => x > 5);` filter the list?', options: ['Immediately on that line', 'When q is enumerated (foreach, ToList, Count…)', 'Never', 'When the program ends'], answer: 1, explain: 'Where is deferred: it builds the query and runs it on enumeration.' },
      { type: 'quiz', question: 'Which operator turns a list of lists into one flat sequence?', options: ['`Select`', '`GroupBy`', '`SelectMany`', '`Join`'], answer: 2, explain: 'SelectMany projects each item to a sequence and concatenates them.' },
      { type: 'exercise', task: 'Given a list of `(string Profile, int Level, double Kg)` tuples, print the total weight per level, sorted by level, as “Level 1: 659 kg”. Use the beams from the diagram: (IPE300,1,253) (IPE200,1,101) (HEA200,1,305) (IPE300,2,338) (IPE200,2,67) (HEA200,2,233) (IPE300,3,274) (IPE200,3,202).', solution: cs`
var beams = new List<(string Profile, int Level, double Kg)>
{
    ("IPE300", 1, 253), ("IPE200", 1, 101), ("HEA200", 1, 305),
    ("IPE300", 2, 338), ("IPE200", 2, 67),  ("HEA200", 2, 233),
    ("IPE300", 3, 274), ("IPE200", 3, 202)
};

var perLevel = beams
    .GroupBy(b => b.Level)
    .OrderBy(g => g.Key)
    .Select(g => $"Level {g.Key}: {g.Sum(b => b.Kg)} kg");

foreach (string line in perLevel) Console.WriteLine(line);`, output: 'Level 1: 659 kg\nLevel 2: 638 kg\nLevel 3: 476 kg' }
    ],
    keyPoints: [
      '`GroupBy` groups by a key; aggregate each group with `Count`, `Sum`, `Max`…',
      '`Join` matches two collections by key; `SelectMany` flattens nested ones.',
      'Most operators are deferred: they run when the query is enumerated.',
      'Call `ToList()` to run once and reuse; enumerating again re-runs the query.'
    ]
  }
];
