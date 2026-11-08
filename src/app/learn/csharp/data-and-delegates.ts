import { Lesson } from '../learn.types';
import { cs } from './cs';

export const DATA_AND_DELEGATES: Lesson[] = [
  // ------------------------------------------------------------------ generics
  {
    slug: 'generics',
    title: 'Generics',
    summary: 'Write classes and methods that work with any type while staying type-safe: generic methods, generic classes, constraints and why List<T> beats ArrayList.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'You have been using generics since the collections lessons: `List<string>`, `Dictionary<string, double>`. The `<T>` is a **type parameter**: a placeholder that is filled in with a real type when the code is used. Generics let you write code **once** that works with many types, **without** losing type safety.' },
      { type: 'h2', text: 'The problem generics solve' },
      { type: 'code', title: 'WithoutGenerics.cs', code: cs`
// Before generics: one method per type…
static int LargerInt(int a, int b) => a > b ? a : b;
static double LargerDouble(double a, double b) => a > b ? a : b;

// …or 'object', which loses type safety
var oldList = new System.Collections.ArrayList();
oldList.Add(5);
oldList.Add("five");              // compiles: anything goes
int n = (int)oldList[1]!;         // InvalidCastException at RUN time` },
      { type: 'h2', text: 'Generic methods' },
      { type: 'widget', name: 'generic-box' },
      { type: 'code', title: 'Generic.cs', code: cs`
static T Larger<T>(T a, T b) where T : IComparable<T>
    => a.CompareTo(b) >= 0 ? a : b;

static void Swap<T>(ref T a, ref T b) => (a, b) = (b, a);

Console.WriteLine(Larger(7, 12));            // T inferred as int
Console.WriteLine(Larger("Beam", "Column"));  // T = string

int x = 1, y = 2;
Swap(ref x, ref y);
Console.WriteLine($"{x} {y}");`, output: '12\nColumn\n2 1' },
      { type: 'p', text: 'Usually you don’t write `<int>` in the call: the compiler **infers** `T` from the arguments.' },
      { type: 'h2', text: 'Generic classes' },
      { type: 'code', title: 'Result.cs', code: cs`
public class Result<T>
{
    public bool Ok { get; }
    public T? Value { get; }
    public string Error { get; } = "";

    private Result(bool ok, T? value, string error) { Ok = ok; Value = value; Error = error; }

    public static Result<T> Success(T value) => new(true, value, "");
    public static Result<T> Fail(string error) => new(false, default, error);
}

Result<double> r = Result<double>.Success(42.2);
Result<Beam> b = Result<Beam>.Fail("Profile not found");
Console.WriteLine(r.Ok ? $"Value {r.Value}" : r.Error);
Console.WriteLine(b.Ok ? "ok" : b.Error);`, output: 'Value 42.2\nProfile not found' },
      { type: 'h2', text: 'Constraints' },
      { type: 'table', head: ['Constraint', 'T must…'], rows: [
        ['`where T : class`', 'be a reference type'],
        ['`where T : struct`', 'be a non-nullable value type'],
        ['`where T : new()`', 'have a parameterless constructor (so you can `new T()`)'],
        ['`where T : StructuralMember`', 'be that class or derive from it'],
        ['`where T : IComparable<T>`', 'implement that interface'],
        ['`where T : notnull`', 'not be a nullable type']
      ] },
      { type: 'p', text: 'Constraints are a two-way deal: callers can only use allowed types, and inside the method you can use everything the constraint guarantees (like `CompareTo`).' },
      { type: 'h2', text: 'default(T)' },
      { type: 'p', text: '`default` gives the default value of whatever `T` is: `0` for numbers, `false` for bool, `null` for reference types. Handy for “not found” results in generic code.' },
      { type: 'note', kind: 'info', text: 'Performance bonus: `List<int>` stores real `int`s. The old `ArrayList` stored `object`s, so every number was **boxed** (wrapped in a heap object) and unboxed again on reading, which is slow and creates garbage.' },
      { type: 'quiz', question: 'What does the compiler do when you call `Larger(3, 9)` with `static T Larger<T>(T a, T b)`?', options: ['Uses object for T', 'Infers T = int from the arguments', 'Reports an error: T must be given', 'Converts to double'], answer: 1, explain: 'Type inference picks T from the argument types.' },
      { type: 'quiz', question: 'Which constraint lets you write `new T()` inside a generic method?', options: ['`where T : class`', '`where T : struct`', '`where T : new()`', '`where T : IComparable<T>`'], answer: 2, explain: '`new()` guarantees a public parameterless constructor.' },
      { type: 'exercise', task: 'Write a generic class `Pair<TFirst, TSecond>` with two properties and a method `Pair<TSecond, TFirst> Swapped()`. Create a `Pair<string, int>("B1", 6)`, swap it and print both.', solution: cs`
public class Pair<TFirst, TSecond>
{
    public TFirst First { get; }
    public TSecond Second { get; }
    public Pair(TFirst first, TSecond second) { First = first; Second = second; }

    public Pair<TSecond, TFirst> Swapped() => new(Second, First);
    public override string ToString() => $"({First}, {Second})";
}

var p = new Pair<string, int>("B1", 6);
Console.WriteLine(p);
Console.WriteLine(p.Swapped());`, output: '(B1, 6)\n(6, B1)' }
    ],
    keyPoints: [
      'Generics use type parameters (`<T>`) to write reusable, type-safe code.',
      'The compiler usually infers `T` from the arguments.',
      'Constraints (`where T : …`) limit T and unlock members you can use.',
      'Generic collections avoid casts and boxing, so they are faster and safer.'
    ]
  },

  // ------------------------------------------------------------------ nullable
  {
    slug: 'nullable-types',
    title: 'Nullable types and null safety',
    summary: 'Represent “no value” on purpose, avoid NullReferenceException with ?. ?? and pattern checks, and let the compiler warn you before your users crash.',
    minutes: 13,
    blocks: [
      { type: 'p', text: 'Tony Hoare, who invented null references, called them his “billion-dollar mistake”: `NullReferenceException` is the most common crash in C# programs. Modern C# gives you tools to say **where** null is allowed and to handle it safely.' },
      { type: 'h2', text: 'Nullable value types: int?' },
      { type: 'code', title: 'NullableInt.cs', code: cs`
int? measured = null;        // int? = Nullable<int>: a number OR null
double? deflection = 12.5;

if (measured.HasValue)
    Console.WriteLine(measured.Value);
else
    Console.WriteLine("Not measured yet");

int shown = measured ?? 0;   // fallback when null
Console.WriteLine(shown);`, output: 'Not measured yet\n0' },
      { type: 'p', text: 'Value types like `int` can never be null on their own. Add `?` when “unknown” or “not entered” is a real possibility, like an optional database column.' },
      { type: 'h2', text: 'Nullable reference types: string?' },
      { type: 'p', text: 'New projects have **nullable reference types** turned on (`<Nullable>enable</Nullable>` in the .csproj). Then `string` means “never null” and `string?` means “may be null”, and the compiler **warns** when you might use a null.' },
      { type: 'code', code: cs`
string name = null;          // warning CS8600: assigning null to non-nullable
string? nickname = null;     // fine: declared as maybe-null
int len = nickname.Length;   // warning CS8602: possible null dereference`, title: 'Warnings.cs' },
      { type: 'note', kind: 'tip', text: 'Treat these warnings as errors. Each one is a possible crash found before the program even runs. Many teams set `<TreatWarningsAsErrors>true</TreatWarningsAsErrors>`.' },
      { type: 'h2', text: 'The null-handling operators' },
      { type: 'widget', name: 'null-safety' },
      { type: 'table', head: ['Operator', 'Meaning'], rows: [
        ['`a?.B`', 'if `a` is null, result is null; otherwise `a.B`'],
        ['`a?[i]`', 'null-safe indexing'],
        ['`a ?? b`', '`a` if not null, else `b`'],
        ['`a ??= b`', 'assign `b` to `a` only if `a` is null'],
        ['`a is null` / `a is not null`', 'the clearest null check'],
        ['`a!`', '“trust me, it isn’t null”: silences the warning, adds no safety']
      ] },
      { type: 'code', title: 'Chain.cs', code: cs`
Project? project = LoadProject("tower.json");

// Each ?. stops safely at the first null in the chain
string city = project?.Site?.Address?.City ?? "Unknown";
int beams = project?.Members?.Count ?? 0;

Console.WriteLine($"{city}, {beams} members");`, output: 'Unknown, 0 members' },
      { type: 'h2', text: 'Guarding method arguments' },
      { type: 'code', code: cs`
public void Export(Model model, string path)
{
    ArgumentNullException.ThrowIfNull(model);              // .NET 6+
    ArgumentException.ThrowIfNullOrWhiteSpace(path);       // .NET 7+
    // … safe to use model and path from here on
}`, title: 'Guards.cs' },
      { type: 'h2', text: 'Avoiding null in your design' },
      { type: 'ul', items: [
        'Return an empty collection, never `null`, from methods that return lists.',
        'Initialise properties: `public List<Beam> Beams { get; } = new();`.',
        'Use `required` or constructors so objects can’t be created half-empty.',
        'Use `TryXxx(out …)` methods when “not found” is normal.'
      ] },
      { type: 'quiz', question: 'With `string? s = null;`, what is `s?.Length ?? -1`?', options: ['0', 'null', '-1', 'NullReferenceException'], answer: 2, explain: '`s?.Length` is null because s is null, so `??` supplies -1.' },
      { type: 'quiz', question: 'What does the `!` in `s!.Length` do at run time?', options: ['Checks for null and throws a clear error', 'Nothing: it only suppresses the compiler warning', 'Converts null to an empty string', 'Makes Length return 0'], answer: 1, explain: 'The null-forgiving operator has no run-time effect; if s is null you still get NullReferenceException.' },
      { type: 'exercise', task: 'Write `static string Initials(string? fullName)` that returns the uppercase initials ("ravi selva" → "RS"), or "?" when the input is null, empty or only spaces.', solution: cs`
static string Initials(string? fullName)
{
    if (string.IsNullOrWhiteSpace(fullName)) return "?";

    var parts = fullName.Split(' ', StringSplitOptions.RemoveEmptyEntries);
    var sb = new System.Text.StringBuilder();
    foreach (string p in parts) sb.Append(char.ToUpper(p[0]));
    return sb.ToString();
}

Console.WriteLine(Initials("ravi selva"));
Console.WriteLine(Initials(null));
Console.WriteLine(Initials("   "));`, output: 'RS\n?\n?' }
    ],
    keyPoints: [
      '`int?` lets a value type hold null; check `HasValue` or use `??`.',
      'With nullable reference types on, `string?` may be null and `string` must not be.',
      'Use `?.`, `??`, `??=` and `is not null` instead of risky direct access.',
      '`!` only hides warnings; design APIs to avoid null where you can.'
    ]
  },

  // ------------------------------------------------------------------ files
  {
    slug: 'file-io',
    title: 'Files and streams',
    summary: 'Read and write text files, build paths safely, process big files line by line with streams, and release files properly with using.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'Settings, exports, logs, CSV reports, IFC models: real programs read and write files constantly. The `System.IO` namespace has everything you need, and is included in new projects by default.' },
      { type: 'widget', name: 'file-sim' },
      { type: 'h2', text: 'The quick way: File' },
      { type: 'code', title: 'QuickFile.cs', code: cs`
string path = Path.Combine(AppContext.BaseDirectory, "members.csv");

File.WriteAllText(path, "Mark,Profile,Length\n");          // create or overwrite
File.AppendAllLines(path, new[] { "B1,IPE300,6.0", "C1,HEA200,3.5" });

string[] lines = File.ReadAllLines(path);
Console.WriteLine($"{lines.Length} lines");
foreach (string line in lines.Skip(1))                      // skip the header
{
    string[] f = line.Split(',');
    Console.WriteLine($"{f[0]} is a {f[1]}");
}`, output: '3 lines\nB1 is a IPE300\nC1 is a HEA200' },
      { type: 'table', head: ['Method', 'Does'], rows: [
        ['`File.ReadAllText` / `WriteAllText`', 'whole file as one string'],
        ['`File.ReadAllLines` / `WriteAllLines`', 'whole file as a `string[]` of lines'],
        ['`File.AppendAllText` / `AppendAllLines`', 'add to the end (creates the file if needed)'],
        ['`File.ReadLines`', 'reads lazily, one line at a time (for big files)'],
        ['`File.Exists`, `File.Delete`, `File.Copy`, `File.Move`', 'manage files'],
        ['`Directory.CreateDirectory`, `Directory.GetFiles`', 'work with folders']
      ] },
      { type: 'h2', text: 'Building paths: always use Path' },
      { type: 'code', code: cs`
string folder = @"C:\Projects\Tower";
string file = Path.Combine(folder, "exports", "level2.ifc");   // adds separators correctly
Console.WriteLine(file);
Console.WriteLine(Path.GetExtension(file));
Console.WriteLine(Path.GetFileNameWithoutExtension(file));`, output: 'C:\\Projects\\Tower\\exports\\level2.ifc\n.ifc\nlevel2', title: 'Paths.cs' },
      { type: 'note', kind: 'warn', text: 'Don’t glue paths with `+ "\\" +`: you will get double or missing separators, and it breaks on Linux and macOS. `Path.Combine` handles it for every operating system.' },
      { type: 'h2', text: 'Streams for large files' },
      { type: 'p', text: '`ReadAllLines` loads the whole file into memory. For a 2 GB log or model export that is a problem. A **stream** reads or writes piece by piece, so memory stays small no matter how big the file is.' },
      { type: 'code', title: 'Stream.cs', code: cs`
// Write with a StreamWriter
using (var writer = new StreamWriter("big.csv"))
{
    for (int i = 1; i <= 1_000_000; i++)
        writer.WriteLine($"B{i},IPE200,{i % 12 + 1}");
}   // ← the file is flushed and closed here, even if an exception happened

// Read line by line, never holding the whole file
long total = 0;
foreach (string line in File.ReadLines("big.csv"))
    total += int.Parse(line.Split(',')[2]);
Console.WriteLine(total);`, output: '6499988' },
      { type: 'h2', text: 'using: always release files' },
      { type: 'p', text: 'An open file is **locked** by the operating system. If you forget to close it, other programs (and your own next write) fail with “The process cannot access the file because it is being used by another process”. A `using` statement closes it automatically at the end of the block, even when an exception is thrown.' },
      { type: 'code', code: cs`
using var reader = new StreamReader("settings.ini");   // C# 8 'using declaration'
string? first = reader.ReadLine();
// reader is closed automatically at the end of the enclosing method/block`, title: 'UsingDecl.cs' },
      { type: 'h2', text: 'Handling file errors' },
      { type: 'code', code: cs`
try
{
    string text = File.ReadAllText(path);
}
catch (FileNotFoundException) { Console.WriteLine("File is missing."); }
catch (UnauthorizedAccessException) { Console.WriteLine("No permission."); }
catch (IOException ex) { Console.WriteLine($"File problem: {ex.Message}"); }`, title: 'Errors.cs' },
      { type: 'p', text: '`File.Exists` before reading helps, but another program can still delete the file in between, so file code should still handle `IOException`.' },
      { type: 'quiz', question: 'What happens to an existing file’s contents when you call `File.WriteAllText` on it?', options: ['The new text is added at the end', 'The file is replaced with the new text', 'An IOException is thrown', 'Nothing'], answer: 1, explain: 'WriteAllText overwrites. Use AppendAllText to add to the end.' },
      { type: 'quiz', question: 'Why use `File.ReadLines` instead of `File.ReadAllLines` for a huge file?', options: ['It is shorter to type', 'It reads one line at a time instead of loading everything into memory', 'It sorts the lines', 'It can read binary files'], answer: 1, explain: 'ReadLines streams lazily, so memory use stays small.' },
      { type: 'exercise', task: 'Write a program that creates a folder "logs" (if needed) and appends a line with the current date/time and the text "Model saved" to "logs/app.log" every time it runs. Then print how many lines the log has.', solution: cs`
string folder = Path.Combine(AppContext.BaseDirectory, "logs");
Directory.CreateDirectory(folder);               // does nothing if it already exists
string logPath = Path.Combine(folder, "app.log");

File.AppendAllText(logPath, $"{DateTime.Now:yyyy-MM-dd HH:mm:ss} Model saved{Environment.NewLine}");
Console.WriteLine($"Log has {File.ReadLines(logPath).Count()} line(s)");`, output: 'Log has 1 line(s)' }
    ],
    keyPoints: [
      '`File` methods read or write a whole file in one call.',
      'Build paths with `Path.Combine`, never by string concatenation.',
      'Use streams (`StreamReader`/`StreamWriter`, `File.ReadLines`) for large files.',
      'Wrap streams in `using` so files are always closed; handle `IOException`.'
    ]
  },

  // ------------------------------------------------------------------ JSON
  {
    slug: 'json',
    title: 'JSON serialisation',
    summary: 'Turn objects into JSON text and back with System.Text.Json: options, attributes, lists, and handling bad input.',
    minutes: 13,
    blocks: [
      { type: 'p', text: '**JSON** (JavaScript Object Notation) is the most common text format for exchanging data: web APIs, configuration files, saving app state. **Serialising** turns an object into JSON text; **deserialising** turns JSON back into an object. .NET has this built in with `System.Text.Json`.' },
      { type: 'code', title: 'Basics.cs', code: cs`
using System.Text.Json;

public record Beam(string Mark, string Profile, double LengthM);

var beam = new Beam("B12", "IPE300", 6.5);
string json = JsonSerializer.Serialize(beam);
Console.WriteLine(json);

Beam? back = JsonSerializer.Deserialize<Beam>(json);
Console.WriteLine(back);`, output: '{"Mark":"B12","Profile":"IPE300","LengthM":6.5}\nBeam { Mark = B12, Profile = IPE300, LengthM = 6.5 }' },
      { type: 'widget', name: 'json-lab' },
      { type: 'h2', text: 'JSON in 30 seconds' },
      { type: 'table', head: ['JSON', 'C#'], rows: [
        ['`{ "name": value, … }` object', 'a class or record'],
        ['`[ … ]` array', '`List<T>` or `T[]`'],
        ['`"text"`', '`string`'],
        ['`12.5`', '`int`, `double`, `decimal`'],
        ['`true` / `false`', '`bool`'],
        ['`null`', '`null`']
      ] },
      { type: 'h2', text: 'Options' },
      { type: 'code', title: 'Options.cs', code: cs`
var options = new JsonSerializerOptions
{
    WriteIndented = true,                                  // human-readable
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,     // Mark → mark
    PropertyNameCaseInsensitive = true                     // when reading
};

var members = new List<Beam> { new("B1", "IPE200", 4.0), new("B2", "IPE300", 6.0) };
string json = JsonSerializer.Serialize(members, options);
Console.WriteLine(json);`, output: '[\n  {\n    "mark": "B1",\n    "profile": "IPE200",\n    "lengthM": 4\n  },\n  {\n    "mark": "B2",\n    "profile": "IPE300",\n    "lengthM": 6\n  }\n]' },
      { type: 'note', kind: 'tip', text: 'Create one `JsonSerializerOptions` object and reuse it. Creating a new one for every call is slow, because the serializer caches type information per options instance.' },
      { type: 'h2', text: 'Attributes for control' },
      { type: 'code', code: cs`
using System.Text.Json.Serialization;

public class ProjectSettings
{
    [JsonPropertyName("project_name")] public string Name { get; set; } = "";
    public int Units { get; set; }
    [JsonIgnore] public string TempPath { get; set; } = "";   // never written
}`, title: 'Attributes.cs' },
      { type: 'h2', text: 'Saving and loading a file' },
      { type: 'code', title: 'SaveLoad.cs', code: cs`
static void Save<T>(string path, T data) =>
    File.WriteAllText(path, JsonSerializer.Serialize(data, Options));

static T? Load<T>(string path) =>
    File.Exists(path) ? JsonSerializer.Deserialize<T>(File.ReadAllText(path), Options) : default;

Save("members.json", members);
var loaded = Load<List<Beam>>("members.json") ?? new List<Beam>();
Console.WriteLine(loaded.Count);`, output: '2' },
      { type: 'h2', text: 'Bad input' },
      { type: 'code', code: cs`
try
{
    var b = JsonSerializer.Deserialize<Beam>("""{ "Mark": "B1", "LengthM": "long" }""");
}
catch (JsonException ex)
{
    Console.WriteLine(ex.Message);
}`, output: 'The JSON value could not be converted to System.Double. Path: $.LengthM | LineNumber: 0 | BytePositionInLine: 33.', title: 'BadJson.cs' },
      { type: 'p', text: 'JSON that arrives from outside (files, users, other services) can always be wrong. Catch `JsonException`, and check that required values are present after deserialising.' },
      { type: 'quiz', question: 'What does deserialising do?', options: ['Turns an object into JSON text', 'Turns JSON text into an object', 'Validates a JSON schema', 'Compresses JSON'], answer: 1, explain: 'Serialise = object → text; deserialise = text → object.' },
      { type: 'quiz', question: 'With `PropertyNamingPolicy = JsonNamingPolicy.CamelCase`, how is the property `LengthM` written?', options: ['`LengthM`', '`lengthM`', '`length_m`', '`LENGTHM`'], answer: 1, explain: 'camelCase lowercases the first letter.' },
      { type: 'exercise', task: 'Create a class `AppSettings` with `Theme` (string, default "dark"), `RecentFiles` (List<string>) and `AutoSaveMinutes` (int, default 5). Load it from "settings.json" if it exists, otherwise create defaults; add "tower.ifc" to RecentFiles; save it back indented.', solution: cs`
using System.Text.Json;

var options = new JsonSerializerOptions { WriteIndented = true };
const string path = "settings.json";

AppSettings settings = File.Exists(path)
    ? JsonSerializer.Deserialize<AppSettings>(File.ReadAllText(path), options) ?? new()
    : new();

settings.RecentFiles.Add("tower.ifc");
File.WriteAllText(path, JsonSerializer.Serialize(settings, options));
Console.WriteLine(File.ReadAllText(path));

public class AppSettings
{
    public string Theme { get; set; } = "dark";
    public List<string> RecentFiles { get; set; } = new();
    public int AutoSaveMinutes { get; set; } = 5;
}`, output: '{\n  "Theme": "dark",\n  "RecentFiles": [\n    "tower.ifc"\n  ],\n  "AutoSaveMinutes": 5\n}' }
    ],
    keyPoints: [
      '`JsonSerializer.Serialize` makes JSON; `Deserialize<T>` reads it back.',
      'Options control indentation, naming (camelCase) and case-insensitive reading.',
      'Use `[JsonPropertyName]` and `[JsonIgnore]` for per-property control.',
      'Reuse one options object; catch `JsonException` for untrusted input.'
    ]
  },

  // ------------------------------------------------------------------ delegates
  {
    slug: 'delegates',
    title: 'Delegates, Func and Action',
    summary: 'Treat methods as values: store them in variables, pass them to other methods, and combine them. The foundation of lambdas, events and LINQ.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'So far, data went into methods and methods were fixed. A **delegate** is a type whose values are **methods**. With it you can pass behaviour around: “here is a list, and here is **what to do** with each item”. This idea powers events, LINQ and most modern C#.' },
      { type: 'h2', text: 'A delegate type' },
      { type: 'code', title: 'Delegate.cs', code: cs`
// a delegate type: any method taking a double and returning a double
public delegate double Operation(double x);

static double Square(double x) => x * x;
static double Half(double x) => x / 2;

Operation op = Square;          // store a method (no brackets: we don't call it)
Console.WriteLine(op(5));       // call it through the variable

op = Half;                      // swap the behaviour
Console.WriteLine(op(5));`, output: '25\n2.5' },
      { type: 'h2', text: 'Func and Action: ready-made delegate types' },
      { type: 'p', text: 'You rarely declare your own delegate types. .NET provides generic ones:' },
      { type: 'table', head: ['Type', 'Represents', 'Example'], rows: [
        ['`Action`', 'no parameters, no result', '`Action save = SaveProject;`'],
        ['`Action<T1, T2…>`', 'parameters, no result', '`Action<string> log = Console.WriteLine;`'],
        ['`Func<TResult>`', 'no parameters, returns TResult', '`Func<DateTime> now = () => DateTime.Now;`'],
        ['`Func<T1…, TResult>`', 'parameters, last type is the result', '`Func<double, double> op = Math.Sqrt;`'],
        ['`Predicate<T>`', 'a test returning bool', '`Predicate<int> isEven = n => n % 2 == 0;`']
      ] },
      { type: 'h2', text: 'Passing behaviour to a method' },
      { type: 'widget', name: 'delegate-pipe' },
      { type: 'code', title: 'Transform.cs', code: cs`
static double[] Transform(double[] values, Func<double, double> op)
{
    var result = new double[values.Length];
    for (int i = 0; i < values.Length; i++)
        result[i] = op(values[i]);       // call whatever method we were given
    return result;
}

double[] loads = { 10, 25, 40 };
Console.WriteLine(string.Join(", ", Transform(loads, Math.Sqrt)));
Console.WriteLine(string.Join(", ", Transform(loads, x => x * 1.5)));   // a lambda`, output: '3.1622776601683795, 5, 6.324555320336759\n15, 37.5, 60' },
      { type: 'p', text: '`Transform` doesn’t know or care what the operation is. The caller decides. The `x => x * 1.5` is a **lambda**: a small unnamed method written inline (next lesson).' },
      { type: 'h2', text: 'Multicast delegates' },
      { type: 'code', title: 'Multicast.cs', code: cs`
Action<string> toScreen = msg => Console.WriteLine($"[screen] {msg}");
Action<string> toLog = msg => Console.WriteLine($"[log] {msg}");

Action<string>? notify = toScreen;
notify += toLog;                 // now holds two methods
notify("Model saved");           // both run, in order

notify -= toLog;                 // remove one
notify("Exported");`, output: '[screen] Model saved\n[log] Model saved\n[screen] Exported' },
      { type: 'p', text: 'A delegate can hold a **list** of methods: `+=` adds one, `-=` removes one, and invoking it calls them all in order. This is exactly how **events** work (a later lesson).' },
      { type: 'note', kind: 'warn', text: 'A delegate variable with no methods is `null`. Invoke it with `handler?.Invoke(args)` so nothing happens instead of a `NullReferenceException`.' },
      { type: 'h2', text: 'Where you will see delegates' },
      { type: 'ul', items: [
        '`list.Sort((a, b) => a.Length.CompareTo(b.Length))`: how to compare.',
        '`list.Find(b => b.Mark == "B3")`, `list.RemoveAll(…)`: which items match.',
        'LINQ: `beams.Where(b => b.LengthM > 6).Select(b => b.Mark)`.',
        'Button clicks and other events in WPF and WinForms.',
        '`Task.Run(() => HeavyWork())`: what to run in the background.'
      ] },
      { type: 'quiz', question: 'Which delegate type matches a method `bool IsHeavy(Beam b)`?', options: ['`Action<Beam>`', '`Func<Beam, bool>`', '`Func<bool, Beam>`', '`Action<bool>`'], answer: 1, explain: 'Func lists the parameter types first and the return type last.' },
      { type: 'quiz', question: 'What is the difference between `op = Square;` and `op = Square(3);`?', options: ['None', 'The first stores the method; the second calls it and tries to store its result', 'The second stores the method', 'Both call the method'], answer: 1, explain: 'Without brackets you refer to the method itself; with brackets you call it.' },
      { type: 'exercise', task: 'Write `static int CountWhere(int[] numbers, Func<int, bool> test)` that counts how many numbers pass the test. Use it to count even numbers and numbers greater than 50 in `{ 12, 75, 40, 51, 8, 99 }`.', solution: cs`
static int CountWhere(int[] numbers, Func<int, bool> test)
{
    int count = 0;
    foreach (int n in numbers)
        if (test(n)) count++;
    return count;
}

int[] data = { 12, 75, 40, 51, 8, 99 };
Console.WriteLine(CountWhere(data, n => n % 2 == 0));
Console.WriteLine(CountWhere(data, n => n > 50));`, output: '3\n3' }
    ],
    keyPoints: [
      'A delegate is a type-safe reference to a method.',
      'Use `Func<…, TResult>` for methods that return, `Action<…>` for void methods.',
      'Passing delegates lets the caller decide behaviour (sorting, filtering, transforming).',
      'Delegates are multicast (`+=`/`-=`); invoke with `?.Invoke()`.'
    ]
  }
];
