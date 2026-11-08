import { Lesson } from '../learn.types';
import { cs } from './cs';

export const WORKING_WITH_DATA: Lesson[] = [
  // ------------------------------------------------------------------ StringBuilder & formatting
  {
    slug: 'string-builder-formatting',
    title: 'StringBuilder and string formatting',
    summary: 'Format numbers and text exactly the way you want, and build long strings efficiently with StringBuilder.',
    minutes: 13,
    blocks: [
      { type: 'p', text: 'Reports, labels, logs and exports are all text. This lesson covers the two skills you need: **formatting** values (decimals, separators, padding) and **building** large strings without slowing your program down.' },
      { type: 'widget', name: 'format-lab' },
      { type: 'h2', text: 'Standard numeric formats' },
      { type: 'table', head: ['Format', 'Meaning', '`1234.5678` →'], rows: [
        ['`F2`', 'fixed-point, 2 decimals', '`1234.57`'],
        ['`N2`', 'number with group separators', '`1,234.57`'],
        ['`N0`', 'separators, no decimals', '`1,235`'],
        ['`E2`', 'scientific', '`1.23E+003`'],
        ['`P1`', 'percent (value × 100)', '`0.25` → `25.0 %`'],
        ['`C`', 'currency of the current culture', '`₹1,234.57` (en-IN)'],
        ['`D5`', 'integer padded with zeros', '`42` → `00042`'],
        ['`X`', 'hexadecimal integer', '`255` → `FF`']
      ] },
      { type: 'code', title: 'Formats.cs', code: cs`
double weight = 1234.5678;
int qty = 42;

Console.WriteLine(weight.ToString("F2"));        // 1234.57
Console.WriteLine($"{weight:N1} kg");            // format inside interpolation
Console.WriteLine($"Item {qty:D4}");             // Item 0042
Console.WriteLine($"{0.075:P1} tax");            // 7.5 % tax
Console.WriteLine($"{weight:0.0} / {weight:#,##0}");   // custom patterns`, output: '1234.57\n1,234.6 kg\nItem 0042\n7.5 % tax\n1234.6 / 1,235' },
      { type: 'note', kind: 'info', text: 'Number formats depend on the **culture** (language and region settings) of the computer. In India `N2` may give `12,34,567.89`; in Germany the decimal point is a comma. For files that other programs read (CSV, IFC, JSON) always use `CultureInfo.InvariantCulture`: `weight.ToString("F2", CultureInfo.InvariantCulture)`.' },
      { type: 'h2', text: 'Alignment: making columns' },
      { type: 'code', title: 'Table.cs', code: cs`
var rows = new[] { ("B1", 6.0, 134.4), ("C12", 3.5, 147.7), ("BR3", 4.24, 31.8) };

Console.WriteLine($"{"Mark",-6}{"Length",8}{"Weight",10}");
foreach (var (mark, len, kg) in rows)
    Console.WriteLine($"{mark,-6}{len,8:F2}{kg,10:F1}");`, output: 'Mark    Length    Weight\nB1        6.00     134.4\nC12       3.50     147.7\nBR3       4.24      31.8' },
      { type: 'p', text: '`{value,8}` right-aligns in 8 characters, `{value,-6}` left-aligns in 6. Combine with a format: `{value,8:F2}`.' },
      { type: 'h2', text: 'Why += in a loop is slow' },
      { type: 'p', text: 'Strings are **immutable**. `s += "x"` can’t change `s`; it creates a new string containing all of the old text plus the new piece. In a loop of 10,000 iterations that means 10,000 strings and millions of characters copied (switch the diagram to “+ vs StringBuilder”).' },
      { type: 'h2', text: 'StringBuilder' },
      { type: 'code', title: 'Builder.cs', code: cs`
using System.Text;

var sb = new StringBuilder();
sb.AppendLine("Mark,Length");
for (int i = 1; i <= 3; i++)
{
    sb.Append('B').Append(i).Append(',').Append(i * 1.5).AppendLine();
}
sb.Insert(0, "# Beam list\n");
sb.Replace(",", ";");

string csv = sb.ToString();     // build the final string once
Console.Write(csv);`, output: '# Beam list\nMark;Length\nB1;1.5\nB2;3\nB3;4.5' },
      { type: 'table', head: ['Use…', 'When'], rows: [
        ['`+` or interpolation', 'joining a few pieces once'],
        ['`string.Join(", ", items)`', 'joining a collection with a separator'],
        ['`StringBuilder`', 'building text in a loop or in many steps']
      ] },
      { type: 'quiz', question: 'What does `$"{7.5:F3}"` produce?', options: ['7.5', '7.500', '7.50', '007.5'], answer: 1, explain: '`F3` means fixed-point with exactly 3 decimal places.' },
      { type: 'quiz', question: 'Why is StringBuilder faster than `+=` inside a large loop?', options: ['It uses less precise characters', 'It appends into a growing buffer instead of creating a new string every time', 'It runs on the GPU', 'It skips Unicode'], answer: 1, explain: 'Strings are immutable, so each `+=` copies everything built so far. StringBuilder just adds to its buffer.' },
      { type: 'exercise', task: 'Use a StringBuilder to build a multiplication table for 9 (1 to 10) where each line looks like ` 9 x  3 =  27` with the numbers right-aligned in 2 and 3 characters. Print it once at the end.', solution: cs`
using System.Text;

var sb = new StringBuilder();
for (int i = 1; i <= 10; i++)
    sb.AppendLine($"{9,2} x {i,2} = {9 * i,3}");
Console.Write(sb.ToString());`, output: ' 9 x  1 =   9\n 9 x  2 =  18\n...\n 9 x 10 =  90' }
    ],
    keyPoints: [
      'Format with `ToString("F2")` or `$"{x:N2}"`; align with `{x,8}` / `{x,-8}`.',
      'Formats depend on culture; use `InvariantCulture` for files and data exchange.',
      'Strings are immutable: `+=` in a loop creates many temporary strings.',
      'Use `StringBuilder` to build text step by step, then `ToString()` once.'
    ]
  },

  // ------------------------------------------------------------------ DateTime
  {
    slug: 'date-time',
    title: 'Dates and times',
    summary: 'Work with DateTime, TimeSpan, DateOnly and time zones: create dates, do date maths, format and parse them safely.',
    minutes: 13,
    blocks: [
      { type: 'p', text: 'Deadlines, delivery dates, log timestamps, project durations: almost every business program handles dates. .NET gives you `DateTime` for a moment in time and `TimeSpan` for a length of time.' },
      { type: 'widget', name: 'date-lab' },
      { type: 'h2', text: 'Creating dates' },
      { type: 'code', title: 'Create.cs', code: cs`
DateTime now = DateTime.Now;          // local date and time
DateTime today = DateTime.Today;      // today at 00:00
DateTime utc = DateTime.UtcNow;       // universal time (for storing)
var handover = new DateTime(2026, 12, 15, 17, 30, 0);   // year, month, day, h, m, s

Console.WriteLine(handover.DayOfWeek);
Console.WriteLine(handover.ToString("dd-MM-yyyy HH:mm"));`, output: 'Tuesday\n15-12-2026 17:30' },
      { type: 'h2', text: 'Date maths' },
      { type: 'code', title: 'Maths.cs', code: cs`
var start = new DateTime(2026, 11, 8);
DateTime due = start.AddDays(45);          // also AddMonths, AddYears, AddHours…
TimeSpan left = due - start;               // subtracting dates gives a TimeSpan

Console.WriteLine(due.ToString("d MMM yyyy"));
Console.WriteLine(left.TotalDays);
Console.WriteLine(due > start);            // dates compare normally

TimeSpan shift = TimeSpan.FromHours(8.5);
Console.WriteLine(shift);                  // 08:30:00`, output: '23 Dec 2026\n45\nTrue\n08:30:00' },
      { type: 'note', kind: 'warn', text: '`DateTime` is immutable, like string. `start.AddDays(45);` on its own does nothing; you must use the returned value: `start = start.AddDays(45);`.' },
      { type: 'h2', text: 'Custom format specifiers' },
      { type: 'table', head: ['Specifier', 'Meaning', 'Example'], rows: [
        ['`yyyy` / `yy`', 'year', '2026 / 26'],
        ['`MM` / `MMM` / `MMMM`', 'month number / short / full name', '11 / Nov / November'],
        ['`dd` / `ddd` / `dddd`', 'day / short / full weekday', '08 / Sun / Sunday'],
        ['`HH` / `hh`', 'hour 24-h / 12-h', '17 / 05'],
        ['`mm` / `ss`', 'minutes / seconds', '30 / 00'],
        ['`tt`', 'AM / PM', 'PM']
      ] },
      { type: 'note', kind: 'warn', text: 'Case matters: `MM` is **months**, `mm` is **minutes**. `"dd-mm-yyyy"` is a classic bug that prints minutes where the month should be.' },
      { type: 'h2', text: 'Parsing user input safely' },
      { type: 'code', title: 'Parse.cs', code: cs`
using System.Globalization;

string text = "15-12-2026";
if (DateTime.TryParseExact(text, "dd-MM-yyyy", CultureInfo.InvariantCulture,
                           DateTimeStyles.None, out DateTime d))
    Console.WriteLine($"Valid: {d:dddd}");
else
    Console.WriteLine("Please use dd-MM-yyyy");`, output: 'Valid: Tuesday' },
      { type: 'p', text: 'Is “03/04/2026” the 3rd of April or the 4th of March? It depends on the culture. With `TryParseExact` you state the format, so there is no guessing.' },
      { type: 'h2', text: 'DateOnly and TimeOnly (.NET 6+)' },
      { type: 'code', code: cs`
DateOnly birthday = new DateOnly(1999, 5, 14);   // just a date, no time
TimeOnly opens = new TimeOnly(9, 30);            // just a time of day
Console.WriteLine(birthday.AddYears(27).ToString("d MMM yyyy"));`, output: '14 May 2026', title: 'DateOnly.cs' },
      { type: 'h2', text: 'Time zones in one rule' },
      { type: 'p', text: '**Store and calculate in UTC; show in local time.** Servers, users and databases can be in different time zones. `DateTime.UtcNow` for timestamps, `.ToLocalTime()` when displaying, and `DateTimeOffset` when you must keep the original offset (like `+05:30` for India).' },
      { type: 'h2', text: 'Measuring how long code takes' },
      { type: 'code', code: cs`
using System.Diagnostics;

var sw = Stopwatch.StartNew();
LoadModel();                            // the work you want to time
sw.Stop();
Console.WriteLine($"Loaded in {sw.ElapsedMilliseconds} ms");`, title: 'Stopwatch.cs' },
      { type: 'p', text: 'Use `Stopwatch`, not `DateTime.Now` subtraction, for timing: it is far more precise. It is the first tool for performance work.' },
      { type: 'quiz', question: 'What type do you get from `date2 - date1`?', options: ['`DateTime`', '`int`', '`TimeSpan`', '`double`'], answer: 2, explain: 'Subtracting two DateTimes gives the duration between them, a TimeSpan.' },
      { type: 'quiz', question: 'Which format prints 8 November 2026 as “08-11-2026”?', options: ['`dd-mm-yyyy`', '`dd-MM-yyyy`', '`DD-MM-YYYY`', '`d-M-yy`'], answer: 1, explain: 'Uppercase `MM` is the month; lowercase `mm` would be minutes.' },
      { type: 'exercise', task: 'A project starts on 1 Dec 2026 and takes 90 working days (Monday to Friday only). Write a loop that finds the finish date and prints it as “dddd, d MMMM yyyy”.', hint: 'Start from the start date, add one day at a time, and only count days whose DayOfWeek isn’t Saturday or Sunday.', solution: cs`
var date = new DateTime(2026, 12, 1);
int worked = 1;                     // the start day counts as day 1
while (worked < 90)
{
    date = date.AddDays(1);
    if (date.DayOfWeek != DayOfWeek.Saturday && date.DayOfWeek != DayOfWeek.Sunday)
        worked++;
}
Console.WriteLine(date.ToString("dddd, d MMMM yyyy"));`, output: 'Monday, 5 April 2027' }
    ],
    keyPoints: [
      '`DateTime` is a moment; `TimeSpan` is a duration; both are immutable.',
      'Use `AddDays`/`AddMonths` and subtraction for date maths.',
      '`MM` = month, `mm` = minutes; parse with `TryParseExact` and a known format.',
      'Store UTC, display local; time code with `Stopwatch`.'
    ]
  },

  // ------------------------------------------------------------------ exceptions
  {
    slug: 'exceptions',
    title: 'Exceptions: try, catch, finally, throw',
    summary: 'Handle errors without crashing: catch specific exceptions, clean up with finally, throw your own and know when not to catch.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'Files go missing, users type letters into number fields, networks drop. When .NET hits a problem it can’t handle on the spot, it **throws an exception**: an object describing what went wrong. If nothing **catches** it, the program crashes. Exception handling lets you respond sensibly instead.' },
      { type: 'widget', name: 'exception-flow' },
      { type: 'h2', text: 'try / catch / finally' },
      { type: 'ul', items: [
        '**try**: the code that might fail. As soon as an exception is thrown, the rest of the block is skipped.',
        '**catch (Type ex)**: runs only if the exception matches that type (or a subclass). Checked top to bottom; the first match wins.',
        '**finally**: always runs, success or failure. Used to release resources (close files, connections).'
      ] },
      { type: 'note', kind: 'warn', text: 'Order catch blocks from **most specific to most general**. `catch (Exception)` catches everything, so if it comes first the specific blocks below it can never run (the compiler reports error CS0160).' },
      { type: 'h2', text: 'Common exception types' },
      { type: 'table', head: ['Exception', 'Typical cause'], rows: [
        ['`NullReferenceException`', 'using a member of a `null` reference'],
        ['`IndexOutOfRangeException`', 'array index outside 0..Length-1'],
        ['`ArgumentOutOfRangeException`', 'a list index or argument out of the allowed range'],
        ['`FormatException`', '`int.Parse("abc")`'],
        ['`DivideByZeroException`', 'integer division by 0'],
        ['`InvalidOperationException`', 'the object isn’t in the right state (e.g. `Pop()` on an empty stack)'],
        ['`FileNotFoundException`', 'opening a file that doesn’t exist'],
        ['`KeyNotFoundException`', '`dict[key]` with a missing key']
      ] },
      { type: 'h2', text: 'The exception object' },
      { type: 'code', title: 'Details.cs', code: cs`
try
{
    string text = File.ReadAllText("model.ifc");
}
catch (FileNotFoundException ex)
{
    Console.WriteLine($"Missing file: {ex.FileName}");
    Console.WriteLine(ex.Message);        // human-readable description
    // ex.StackTrace shows where it happened: log it for developers
}`, output: 'Missing file: D:\\Work\\model.ifc\nCould not find file \'D:\\Work\\model.ifc\'.' },
      { type: 'h2', text: 'Throwing your own' },
      { type: 'code', title: 'Throw.cs', code: cs`
public class Beam
{
    public Beam(double lengthM)
    {
        if (lengthM <= 0)
            throw new ArgumentOutOfRangeException(nameof(lengthM), lengthM, "Length must be positive.");
        LengthM = lengthM;
    }
    public double LengthM { get; }
}

// Custom exception for your own domain errors
public class ClashDetectedException : Exception
{
    public ClashDetectedException(string a, string b) : base($"{a} clashes with {b}") { }
}`, },
      { type: 'p', text: 'Throw when a method **can’t do what its name promises**: invalid arguments, impossible state. Prefer the built-in types (`ArgumentException`, `InvalidOperationException`) and create custom ones (always ending in `Exception`) for domain-specific errors that callers might want to catch separately.' },
      { type: 'h2', text: 'Re-throwing correctly' },
      { type: 'code', code: cs`
try
{
    SaveProject();
}
catch (IOException ex)
{
    Log(ex);          // record it…
    throw;            // …and let it continue upwards with its ORIGINAL stack trace
    // throw ex;      // ✗ resets the stack trace: you lose where it really happened
}`, title: 'Rethrow.cs' },
      { type: 'h2', text: 'Exception filters' },
      { type: 'code', code: cs`
catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
{
    Console.WriteLine("Not found on the server");
}`, title: 'Filter.cs' },
      { type: 'h2', text: 'Good practice' },
      { type: 'ul', items: [
        '**Prevent before you catch**: use `TryParse`, check for `null`, check `Count`. Exceptions are for exceptional situations, and they are slow.',
        'Catch only what you can handle meaningfully. Never write an empty `catch { }` that silently hides errors.',
        'Catch `Exception` (everything) only at the top level of the app, to log the error and show a friendly message.',
        'Use `using` (next module) or `finally` to release files and connections.'
      ] },
      { type: 'quiz', question: 'When does a `finally` block run?', options: ['Only when no exception happens', 'Only when an exception is caught', 'Always, whether or not an exception happened', 'Only when an exception is NOT caught'], answer: 2, explain: '`finally` always runs when leaving the try statement, which makes it right for clean-up.' },
      { type: 'quiz', question: 'Which is the best way to re-throw a caught exception?', options: ['`throw ex;`', '`throw;`', '`throw new Exception();`', '`return ex;`'], answer: 1, explain: '`throw;` keeps the original stack trace, so you can still see where the error started.' },
      { type: 'exercise', task: 'Write `static double SafeAverage(string[] inputs)` that converts each string with `double.Parse` and returns the average. Catch `FormatException` per item (skip it and print a warning) and throw `InvalidOperationException` if no valid numbers remain. Test with `{ "10", "x", "20" }`.', solution: cs`
using System.Globalization;

static double SafeAverage(string[] inputs)
{
    double sum = 0;
    int count = 0;
    foreach (string s in inputs)
    {
        try
        {
            sum += double.Parse(s, CultureInfo.InvariantCulture);
            count++;
        }
        catch (FormatException)
        {
            Console.WriteLine($"Skipping '{s}'");
        }
    }
    if (count == 0) throw new InvalidOperationException("No valid numbers.");
    return sum / count;
}

Console.WriteLine(SafeAverage(new[] { "10", "x", "20" }));`, output: 'Skipping \'x\'\n15' }
    ],
    keyPoints: [
      'Exceptions are objects thrown when something goes wrong; uncaught ones crash the program.',
      'Catch specific types first; `finally` always runs.',
      'Throw meaningful exceptions for invalid input or state; re-throw with `throw;`.',
      'Prevent common errors (`TryParse`, null checks) instead of relying on catch.'
    ]
  },

  // ------------------------------------------------------------------ List and Dictionary
  {
    slug: 'list-and-dictionary',
    title: 'Collections: List and Dictionary',
    summary: 'The two collections you will use every day: List<T> for ordered items that grow and shrink, Dictionary<TKey, TValue> for fast lookups by key.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'Arrays have a fixed size. Real data grows: members get added to a model, rows get loaded from a file. .NET’s **collections** handle that for you. The two most important are `List<T>` and `Dictionary<TKey, TValue>`.' },
      { type: 'note', kind: 'info', text: 'The `<T>` means “of some type”: `List<string>` is a list of strings, `List<Beam>` a list of beams. This is called **generics**, and it gets its own lesson soon.' },
      { type: 'widget', name: 'list-dict' },
      { type: 'h2', text: 'List<T>' },
      { type: 'code', title: 'List.cs', code: cs`
var marks = new List<string> { "B1", "B2" };   // collection initialiser
marks.Add("C1");
marks.AddRange(new[] { "C2", "BR1" });
marks.Insert(0, "F1");
marks.Remove("B2");                // first match
marks.RemoveAt(marks.Count - 1);   // last item

Console.WriteLine(marks.Count);
Console.WriteLine(marks[0]);
Console.WriteLine(marks.Contains("C1"));
Console.WriteLine(string.Join(", ", marks));

marks.Sort();
foreach (string m in marks) Console.Write(m + " ");`, output: '4\nF1\nTrue\nF1, B1, C1, C2\nB1 C1 C2 F1' },
      { type: 'table', head: ['Member', 'Does'], rows: [
        ['`Add(x)`, `AddRange(xs)`', 'append at the end'],
        ['`Insert(i, x)`', 'insert at index (shifts later items)'],
        ['`Remove(x)`, `RemoveAt(i)`, `Clear()`', 'remove items'],
        ['`Count`', 'number of items (arrays use `Length`)'],
        ['`list[i]`', 'read or replace by index'],
        ['`Contains`, `IndexOf`, `Find`, `Exists`', 'search (checks items one by one)'],
        ['`Sort()`, `Reverse()`', 'reorder in place'],
        ['`ToArray()`', 'copy to an array']
      ] },
      { type: 'note', kind: 'warn', text: 'Don’t add or remove items while looping over the same list with `foreach`: you get `InvalidOperationException: Collection was modified`. Loop backwards with `for`, or use `list.RemoveAll(x => …)`.' },
      { type: 'h2', text: 'Dictionary<TKey, TValue>' },
      { type: 'p', text: 'A dictionary stores **key → value** pairs, like a phone book. Looking up by key is almost instant, no matter how many entries there are, because the key’s hash code points straight to its bucket.' },
      { type: 'code', title: 'Dictionary.cs', code: cs`
var kgPerMetre = new Dictionary<string, double>
{
    ["IPE200"] = 22.4,
    ["IPE300"] = 42.2
};
kgPerMetre.Add("HEA200", 42.3);         // Add throws if the key exists
kgPerMetre["IPE300"] = 42.3;            // indexer: add or replace

if (kgPerMetre.TryGetValue("IPE200", out double kg))
    Console.WriteLine($"IPE200: {kg} kg/m");

Console.WriteLine(kgPerMetre.ContainsKey("UB305"));

foreach (var (profile, w) in kgPerMetre)       // KeyValuePair deconstruction
    Console.WriteLine($"{profile} = {w}");`, output: 'IPE200: 22.4 kg/m\nFalse\nIPE200 = 22.4\nIPE300 = 42.3\nHEA200 = 42.3' },
      { type: 'h2', text: 'A classic: counting things' },
      { type: 'code', title: 'Count.cs', code: cs`
string[] profiles = { "IPE200", "HEA200", "IPE200", "IPE300", "IPE200" };
var counts = new Dictionary<string, int>();

foreach (string p in profiles)
{
    counts.TryGetValue(p, out int n);   // n is 0 if missing
    counts[p] = n + 1;
}
foreach (var (p, n) in counts) Console.WriteLine($"{p}: {n}");`, output: 'IPE200: 3\nHEA200: 1\nIPE300: 1' },
      { type: 'h2', text: 'Which one?' },
      { type: 'table', head: ['Need', 'Use', 'Lookup speed'], rows: [
        ['Ordered items, access by position', '`List<T>`', 'by index: O(1); by value: O(n)'],
        ['Find a value by a unique key', '`Dictionary<K, V>`', 'by key: O(1)'],
        ['Fixed size, maximum speed', 'array `T[]`', 'by index: O(1)']
      ] },
      { type: 'p', text: '**O(1)** means “constant time”: the same speed with 10 or 10 million items. **O(n)** means the time grows with the number of items. Choosing a Dictionary instead of searching a List is one of the easiest big performance wins.' },
      { type: 'quiz', question: 'What happens with `dict.Add("A", 1)` when "A" is already a key?', options: ['The value is replaced', 'ArgumentException', 'Nothing', 'A second "A" entry is added'], answer: 1, explain: '`Add` requires a new key. Use the indexer `dict["A"] = 1` to add or replace.' },
      { type: 'quiz', question: 'For 1 million items, which finds an item fastest?', options: ['`list.Contains(x)`', '`dict.ContainsKey(x)`', 'They are the same', 'A foreach loop'], answer: 1, explain: 'Dictionary lookups are O(1) using hashing; List.Contains checks items one by one.' },
      { type: 'exercise', task: 'Given a list of words, build a `Dictionary<char, List<string>>` that groups the words by their first letter, then print each letter with its words. Use `{ "beam", "bolt", "column", "brace", "cleat" }`.', solution: cs`
var words = new List<string> { "beam", "bolt", "column", "brace", "cleat" };
var groups = new Dictionary<char, List<string>>();

foreach (string w in words)
{
    char first = w[0];
    if (!groups.TryGetValue(first, out var list))
    {
        list = new List<string>();
        groups[first] = list;
    }
    list.Add(w);
}

foreach (var (letter, list) in groups)
    Console.WriteLine($"{letter}: {string.Join(", ", list)}");`, output: 'b: beam, bolt, brace\nc: column, cleat' }
    ],
    keyPoints: [
      '`List<T>` is a resizable array: `Add`, `Insert`, `Remove`, `Count`, `[i]`.',
      '`Dictionary<K, V>` maps unique keys to values with O(1) lookups.',
      'Use `TryGetValue` instead of `dict[key]` when a key may be missing.',
      'Don’t modify a collection while iterating over it with `foreach`.'
    ]
  },

  // ------------------------------------------------------------------ HashSet, Queue, Stack
  {
    slug: 'hashset-queue-stack',
    title: 'HashSet, Queue and Stack',
    summary: 'Three specialised collections: unique items with fast lookups, first-in-first-out processing, and last-in-first-out undo history.',
    minutes: 12,
    blocks: [
      { type: 'p', text: 'List and Dictionary cover most needs. Three more collections solve specific problems so well that every developer should know them.' },
      { type: 'widget', name: 'stack-queue-set' },
      { type: 'h2', text: 'HashSet<T>: unique items' },
      { type: 'code', title: 'HashSet.cs', code: cs`
var used = new HashSet<string> { "IPE200", "HEA200" };
Console.WriteLine(used.Add("IPE200"));   // False: already there
Console.WriteLine(used.Add("IPE300"));   // True
Console.WriteLine(used.Contains("HEA200"));
Console.WriteLine(used.Count);

// remove duplicates from any list in one line
var unique = new HashSet<int>(new[] { 3, 1, 3, 2, 1 });
Console.WriteLine(string.Join(" ", unique));`, output: 'False\nTrue\nTrue\n3\n3 1 2' },
      { type: 'p', text: 'Sets also do maths: `a.UnionWith(b)` (everything in either), `a.IntersectWith(b)` (only in both), `a.ExceptWith(b)` (in a but not b). Great for “which profiles are in model A but not in model B?”.' },
      { type: 'h2', text: 'Queue<T>: first in, first out' },
      { type: 'code', title: 'Queue.cs', code: cs`
var jobs = new Queue<string>();
jobs.Enqueue("Export IFC");
jobs.Enqueue("Generate drawings");
jobs.Enqueue("Send report");

while (jobs.Count > 0)
{
    string job = jobs.Dequeue();          // oldest first
    Console.WriteLine($"Running: {job}");
}`, output: 'Running: Export IFC\nRunning: Generate drawings\nRunning: Send report' },
      { type: 'p', text: 'Use a queue whenever work must be handled **in arrival order**: print jobs, messages, requests, and the breadth-first search algorithm you will meet in the DSA course.' },
      { type: 'h2', text: 'Stack<T>: last in, first out' },
      { type: 'code', title: 'Undo.cs', code: cs`
var undo = new Stack<string>();
undo.Push("Draw beam B1");
undo.Push("Add bolt group");
undo.Push("Move column C3");

Console.WriteLine($"Undo: {undo.Pop()}");     // most recent first
Console.WriteLine($"Undo: {undo.Pop()}");
Console.WriteLine($"Next to undo: {undo.Peek()}");`, output: 'Undo: Move column C3\nUndo: Add bolt group\nNext to undo: Draw beam B1' },
      { type: 'p', text: 'Stacks fit anything that must be reversed or nested: undo/redo, the browser Back button, checking matching brackets, and the call stack itself.' },
      { type: 'h2', text: 'Safe versions' },
      { type: 'code', code: cs`
if (undo.TryPop(out string? action)) Console.WriteLine(action);
if (jobs.TryDequeue(out string? next)) Console.WriteLine(next);`, title: 'Try.cs' },
      { type: 'p', text: '`Pop`, `Peek` and `Dequeue` throw `InvalidOperationException` when the collection is empty; the `Try` versions return `false` instead.' },
      { type: 'h2', text: 'Collection cheat sheet' },
      { type: 'table', head: ['Collection', 'Order', 'Duplicates', 'Best at'], rows: [
        ['`List<T>`', 'insertion order, by index', 'yes', 'general ordered data'],
        ['`Dictionary<K,V>`', 'not guaranteed', 'unique keys', 'lookup by key'],
        ['`HashSet<T>`', 'not guaranteed', 'no', 'membership tests, de-duplication'],
        ['`Queue<T>`', 'FIFO', 'yes', 'process in arrival order'],
        ['`Stack<T>`', 'LIFO', 'yes', 'undo, nesting, backtracking'],
        ['`SortedDictionary<K,V>`', 'sorted by key', 'unique keys', 'ordered lookups']
      ] },
      { type: 'quiz', question: 'You push 1, 2, 3 onto a Stack and then Pop once. What comes out?', options: ['1', '2', '3', 'Nothing'], answer: 2, explain: 'Last in, first out: 3 was pushed last.' },
      { type: 'quiz', question: 'Which collection automatically ignores duplicates?', options: ['`List<T>`', '`Queue<T>`', '`HashSet<T>`', '`Stack<T>`'], answer: 2, explain: '`HashSet.Add` returns false and changes nothing if the item is already present.' },
      { type: 'exercise', task: 'Use a Stack<char> to check whether the brackets in a string are balanced, e.g. `"(a[b]{c})"` is balanced and `"(a[b)]"` is not.', hint: 'Push every opening bracket. For a closing bracket, the stack must not be empty and its top must be the matching opener; pop it. At the end the stack must be empty.', solution: cs`
static bool Balanced(string s)
{
    var stack = new Stack<char>();
    foreach (char c in s)
    {
        if (c is '(' or '[' or '{') stack.Push(c);
        else if (c is ')' or ']' or '}')
        {
            if (stack.Count == 0) return false;
            char open = stack.Pop();
            if ((c == ')' && open != '(') || (c == ']' && open != '[') || (c == '}' && open != '{'))
                return false;
        }
    }
    return stack.Count == 0;
}

Console.WriteLine(Balanced("(a[b]{c})"));
Console.WriteLine(Balanced("(a[b)]"));`, output: 'True\nFalse' }
    ],
    keyPoints: [
      '`HashSet<T>`: unique items, O(1) `Contains`, set operations.',
      '`Queue<T>`: FIFO with `Enqueue`/`Dequeue`.',
      '`Stack<T>`: LIFO with `Push`/`Pop`/`Peek`.',
      'Use `TryPop`/`TryDequeue` to avoid exceptions on empty collections.'
    ]
  }
];
