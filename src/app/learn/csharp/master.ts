import { Lesson } from '../learn.types';
import { cs } from './cs';

export const MASTER: Lesson[] = [
  // ------------------------------------------------------------------ SOLID
  {
    slug: 'solid-principles',
    title: 'SOLID principles',
    summary: 'Five design rules that keep code easy to change: single responsibility, open/closed, Liskov substitution, interface segregation and dependency inversion, each with a before and after.',
    minutes: 18,
    blocks: [
      { type: 'p', text: 'Code that works is only half the job. Real projects keep changing: a new export format, a different database, a new design code. **SOLID** is five principles (collected by Robert C. Martin) that make those changes small and safe instead of scary.' },
      { type: 'widget', name: 'solid-impact' },
      { type: 'table', head: ['Letter', 'Principle', 'In one sentence'], rows: [
        ['S', 'Single Responsibility', 'a class should have only one reason to change'],
        ['O', 'Open/Closed', 'add new behaviour by adding code, not by editing working code'],
        ['L', 'Liskov Substitution', 'a derived class must work anywhere its base class is expected'],
        ['I', 'Interface Segregation', 'many small interfaces beat one big one'],
        ['D', 'Dependency Inversion', 'depend on abstractions (interfaces), not on concrete classes']
      ] },

      { type: 'h2', text: 'S: Single Responsibility' },
      { type: 'p', text: 'If a class reads files **and** calculates **and** formats reports, then a change to any one of those risks breaking the others. Split it so each class has one job, and one reason to change.' },
      { type: 'code', title: 'Before.cs', code: cs`
public class ReportManager
{
    public void Run(string path)
    {
        var json = File.ReadAllText(path);                        // job 1: reading
        var beams = JsonSerializer.Deserialize<List<Beam>>(json)!;
        double total = beams.Sum(b => b.LengthM * b.KgPerM);     // job 2: calculating
        var pdf = new PdfDocument(); pdf.AddText($"{total} kg");  // job 3: formatting
        new SmtpClient("mail.office").Send(/* … */);              // job 4: sending
    }
}` },
      { type: 'code', title: 'After.cs', code: cs`
public class WeightCalculator
{
    public double TotalKg(IEnumerable<Beam> beams) => beams.Sum(b => b.LengthM * b.KgPerM);
}

public record Report(IReadOnlyList<Beam> Beams, double TotalKg);

public class ReportService(IModelSource source, WeightCalculator calc, IReportWriter writer, INotifier notifier)
{
    public void Run()
    {
        var beams = source.LoadBeams();
        var report = new Report(beams, calc.TotalKg(beams));
        byte[] file = writer.Write(report);
        notifier.Send("Weight report", $"Total steel {report.TotalKg:N0} kg ({file.Length:N0} byte {writer.Extension} file)");
    }
}` },
      { type: 'note', kind: 'info', text: '`IReportWriter` and `INotifier` are small interfaces; their full definitions appear in the O and D sections below.' },
      { type: 'p', text: '`ReportService` now only **coordinates**. Each step lives in its own small class you can read, change and test on its own. (The `(IModelSource source, …)` after the class name is a C# 12 primary constructor.)' },

      { type: 'h2', text: 'O: Open/Closed' },
      { type: 'p', text: 'A class is **open for extension, closed for modification**. A long `switch` that grows with every new case is the classic warning sign.' },
      { type: 'code', title: 'OpenClosed.cs', code: cs`
// ✗ every new format means editing (and retesting) this method
public byte[] Export(Report r, string format) => format switch
{
    "pdf" => ToPdf(r),
    "csv" => ToCsv(r),
    _ => throw new NotSupportedException(format)
};

// ✓ a new format is a new class; existing ones are never touched
public interface IReportWriter { string Extension { get; } byte[] Write(Report r); }
public class PdfReportWriter : IReportWriter { public string Extension => ".pdf"; public byte[] Write(Report r) => /* … */ []; }
public class ExcelReportWriter : IReportWriter { public string Extension => ".xlsx"; public byte[] Write(Report r) => /* … */ []; }` },

      { type: 'h2', text: 'L: Liskov Substitution' },
      { type: 'p', text: 'If code works with a `Model`, it must also work with **any** class derived from `Model`, without surprises. A subclass that throws for methods its base promises, or quietly changes their meaning, breaks this.' },
      { type: 'code', title: 'Liskov.cs', code: cs`
public class Model
{
    public virtual void Save(string path) { /* write file */ }
}

// ✗ breaks every caller that calls Save on "a Model"
public class ReadOnlyModel : Model
{
    public override void Save(string path) => throw new NotSupportedException();
}

// ✓ model the real capability instead
public interface IReadableModel { IReadOnlyList<Beam> Beams { get; } }
public interface IEditableModel : IReadableModel { void Save(string path); }` },
      { type: 'note', kind: 'tip', text: 'A quick test: if you need `if (x is ReadOnlyModel)` before calling a method, the inheritance is probably wrong.' },

      { type: 'h2', text: 'I: Interface Segregation' },
      { type: 'code', title: 'Segregation.cs', code: cs`
// ✗ one fat interface: a Grid must implement Weight and Paint it doesn't have
public interface IModelElement
{
    string Id { get; }
    double WeightKg();
    void Paint(string colour);
    Bounds GetBounds();
}

// ✓ small, focused interfaces; classes pick what they really support
public interface IElement  { string Id { get; } Bounds GetBounds(); }
public interface IHasWeight { double WeightKg(); }
public interface IPaintable { void Paint(string colour); }

public class Beam : IElement, IHasWeight, IPaintable { /* … */ }
public class Grid : IElement { /* … */ }` },

      { type: 'h2', text: 'D: Dependency Inversion' },
      { type: 'p', text: 'High-level code (the business rules) should not depend on low-level details (SQL, SMTP, file paths). Both depend on an **interface**, and the concrete class is passed in from outside.' },
      { type: 'code', title: 'Inversion.cs', code: cs`
// ✗ impossible to test without a real mail server, impossible to swap
public class AlertService
{
    private readonly SmtpClient _smtp = new("mail.office");
    public void Overloaded(Beam b) => _smtp.Send("eng@firm.com", "Overload", b.Mark);
}

// ✓ depends on an abstraction; the caller decides which implementation
public interface INotifier { void Send(string subject, string body); }

public class AlertService(INotifier notifier)
{
    public void Overloaded(Beam b) => notifier.Send("Overload", b.Mark);
}` },
      { type: 'p', text: 'Passing dependencies in through the constructor is called **dependency injection**, and it has its own lesson next.' },

      { type: 'h2', text: 'Don’t overdo it' },
      { type: 'note', kind: 'warn', text: 'SOLID is a guide, not a law. A 40-line script doesn’t need six interfaces. Apply the principles where change is **likely** or where testing is **hard**. Adding abstractions “just in case” makes code harder to follow.' },

      { type: 'quiz', question: 'A `ProjectExporter` class has a `switch` on file type that you edit every time a new format is added. Which principle does that violate most directly?', options: ['Single Responsibility', 'Open/Closed', 'Liskov Substitution', 'Interface Segregation'], answer: 1, explain: 'Adding behaviour forces edits to existing, tested code. Use one class per format behind an interface.' },
      { type: 'quiz', question: '`Square : Rectangle` where setting `Width` also changes `Height`. Code that sets width 4 and height 5 then expects area 20 gets 25. Which principle is broken?', options: ['Liskov Substitution', 'Dependency Inversion', 'Single Responsibility', 'None'], answer: 0, explain: 'Square can’t be used safely wherever Rectangle is expected: it changes the meaning of the base class’s setters.' },
      { type: 'exercise', task: 'This class mixes calculation and console output. Split it into a `ConnectionChecker` (returns a result) and a `ConsoleReporter` (prints it), then use both.\n\n`class Checker { public void Check(double load, double capacity) { double u = load / capacity; Console.WriteLine(u <= 1 ? $"OK {u:P0}" : $"FAIL {u:P0}"); } }`', hint: 'Return a small record such as `CheckResult(double Utilisation, bool Ok)`.', solution: cs`
public record CheckResult(double Utilisation, bool Ok);

public class ConnectionChecker
{
    public CheckResult Check(double load, double capacity)
    {
        double u = load / capacity;
        return new CheckResult(u, u <= 1);
    }
}

public class ConsoleReporter
{
    public void Print(CheckResult r) =>
        Console.WriteLine(r.Ok ? $"OK {r.Utilisation:P0}" : $"FAIL {r.Utilisation:P0}");
}

var result = new ConnectionChecker().Check(load: 180, capacity: 240);
new ConsoleReporter().Print(result);`, output: 'OK 75%' }
    ],
    keyPoints: [
      'S: one reason to change per class. O: extend by adding classes, not editing them.',
      'L: subclasses must honour the base class’s promises.',
      'I: prefer small interfaces. D: depend on interfaces and receive implementations from outside.',
      'Use SOLID where change and testing matter; don’t add abstractions you don’t need.'
    ]
  },

  // ------------------------------------------------------------------ design patterns
  {
    slug: 'design-patterns',
    title: 'Design patterns in C#',
    summary: 'Proven solutions to common design problems: Strategy, Factory, Decorator, Observer, Builder, Adapter and Singleton, written in modern C# with real examples.',
    minutes: 18,
    blocks: [
      { type: 'p', text: 'A **design pattern** is a named, proven shape for solving a problem that keeps coming up. Knowing the names lets a team say “put a decorator around the repository” instead of explaining it for ten minutes. Most patterns come from the 1994 “Gang of Four” book; here are the ones you will meet most in C#.' },
      { type: 'widget', name: 'pattern-lab' },
      { type: 'table', head: ['Pattern', 'Kind', 'Problem it solves'], rows: [
        ['Strategy', 'behavioural', 'swap an algorithm at run time'],
        ['Factory', 'creational', 'decide which class to create from data'],
        ['Builder', 'creational', 'create a complex object step by step'],
        ['Decorator', 'structural', 'add behaviour around an object without changing it'],
        ['Adapter', 'structural', 'make an existing class fit the interface you need'],
        ['Observer', 'behavioural', 'notify many listeners when something happens'],
        ['Singleton', 'creational', 'exactly one instance for the whole app']
      ] },

      { type: 'h2', text: 'Strategy' },
      { type: 'code', title: 'Strategy.cs', code: cs`
public interface ITensionCheck
{
    string Name { get; }
    double DesignStrengthN(double areaMm2, double fyMpa);
}

public class Is800Check : ITensionCheck
{
    public string Name => "IS 800";
    public double DesignStrengthN(double a, double fy) => a * fy / 1.10;
}

public class Eurocode3Check : ITensionCheck
{
    public string Name => "EN 1993";
    public double DesignStrengthN(double a, double fy) => a * fy / 1.00;
}

public class MemberReport(ITensionCheck check)
{
    public string Run(double a, double fy) => $"{check.Name}: {check.DesignStrengthN(a, fy) / 1000:F1} kN";
}

Console.WriteLine(new MemberReport(new Is800Check()).Run(5000, 250));
Console.WriteLine(new MemberReport(new Eurocode3Check()).Run(5000, 250));`, output: 'IS 800: 1136.4 kN\nEN 1993: 1250.0 kN' },
      { type: 'note', kind: 'tip', text: 'For a tiny strategy, a delegate is enough: `Func<double, double, double> check = (a, fy) => a * fy / 1.1;`. Use an interface when the strategy has several members or needs its own dependencies.' },

      { type: 'h2', text: 'Factory' },
      { type: 'code', title: 'Factory.cs', code: cs`
public abstract record Section(string Name);
public record ISection(string Name) : Section(Name);
public record HollowRectSection(string Name) : Section(Name);

public static class SectionFactory
{
    public static Section Create(string name) => name.ToUpperInvariant() switch
    {
        var n when n.StartsWith("IPE") || n.StartsWith("HEA") => new ISection(n),
        var n when n.StartsWith("RHS") || n.StartsWith("SHS") => new HollowRectSection(n),
        _ => throw new ArgumentException($"Unknown section \"{name}\"")
    };
}

Section s = SectionFactory.Create("ipe300");
Console.WriteLine(s);`, output: 'ISection { Name = IPE300 }' },
      { type: 'p', text: 'Callers depend only on `Section`. All the “which class?” knowledge lives in one place.' },

      { type: 'h2', text: 'Builder' },
      { type: 'code', title: 'Builder.cs', code: cs`
var report = new ReportBuilder()
    .WithTitle("Level 2 steel")
    .AddSection("Beams", beams)
    .AddSection("Columns", columns)
    .WithLogo("logo.png")
    .Build();

public class ReportBuilder
{
    private readonly Report _r = new();
    public ReportBuilder WithTitle(string t) { _r.Title = t; return this; }   // return this → chaining
    public ReportBuilder AddSection(string name, IEnumerable<Beam> rows) { _r.Sections.Add(new(name, rows.ToList())); return this; }
    public ReportBuilder WithLogo(string path) { _r.LogoPath = path; return this; }
    public Report Build() => string.IsNullOrEmpty(_r.Title) ? throw new InvalidOperationException("Title required") : _r;
}` },
      { type: 'p', text: 'You already use builders: `StringBuilder`, `WebApplication.CreateBuilder()`, and `UriBuilder` all follow this idea.' },

      { type: 'h2', text: 'Decorator' },
      { type: 'code', title: 'Decorator.cs', code: cs`
public interface IBeamRepository { Beam? Get(string mark); }

public class CachingRepository(IBeamRepository inner) : IBeamRepository
{
    private readonly Dictionary<string, Beam?> _cache = new();

    public Beam? Get(string mark)
    {
        if (_cache.TryGetValue(mark, out var hit)) return hit;   // fast path
        var beam = inner.Get(mark);                              // delegate to the wrapped object
        _cache[mark] = beam;
        return beam;
    }
}

IBeamRepository repo = new LoggingRepository(new CachingRepository(new SqlBeamRepository(conn)));` },
      { type: 'p', text: 'Each decorator implements the **same interface** as the object it wraps, so wrappers stack in any order and callers never know. `Stream` in .NET works this way: `new GZipStream(new BufferedStream(fileStream), …)`.' },

      { type: 'h2', text: 'Adapter' },
      { type: 'code', title: 'Adapter.cs', code: cs`
// A third-party library we can't change
public class VendorIfcReader { public VendorElement[] ReadAll(string file) => /* … */ []; }

// Our app wants IModelSource
public class IfcModelSource(VendorIfcReader reader, string file) : IModelSource
{
    public IReadOnlyList<Beam> LoadBeams() =>
        reader.ReadAll(file)
              .Where(e => e.Category == "IfcBeam")
              .Select(e => new Beam(e.Tag, e.Length / 1000.0, e.MassPerLength))
              .ToList();
}` },

      { type: 'h2', text: 'Observer and Singleton' },
      { type: 'p', text: 'You already know **Observer**: C# events are the built-in version (see the events lesson). **Singleton** means “one instance for the whole app”:' },
      { type: 'code', title: 'Singleton.cs', code: cs`
public sealed class UnitSettings
{
    public static UnitSettings Instance { get; } = new();   // created once, thread-safe
    private UnitSettings() { }                              // nobody else can call new
    public string Length { get; set; } = "mm";
}` },
      { type: 'note', kind: 'warn', text: 'A static `Instance` is global state: any code can change it and tests can’t replace it. In modern apps prefer registering the class as a **singleton in the DI container**. You get one instance without the global access.' },

      { type: 'h2', text: 'Using patterns well' },
      { type: 'ul', items: [
        'Start with plain code. Introduce a pattern when the problem it solves actually appears.',
        'Name classes after the pattern when it helps: `SectionFactory`, `CachingRepository`, `ReportBuilder`.',
        'Patterns combine: a factory can return strategies; decorators wrap repositories created by DI.'
      ] },

      { type: 'quiz', question: 'You need to add timing logs around every call to an existing `IModelSource` without editing it. Which pattern fits?', options: ['Singleton', 'Decorator', 'Builder', 'Factory'], answer: 1, explain: 'A decorator implements IModelSource, wraps the real one, and adds behaviour before and after each call.' },
      { type: 'quiz', question: 'A vendor library returns `VendorElement[]` but your code needs `IModelSource`. Which pattern connects them?', options: ['Adapter', 'Observer', 'Strategy', 'Builder'], answer: 0, explain: 'An adapter converts one interface into the one your code expects.' },
      { type: 'exercise', task: 'Write a `TimingRepository` decorator for `IBeamRepository` that measures each `Get` call with `Stopwatch` and prints `Get(B12) took N ms`, then returns the inner result.', solution: cs`
public class TimingRepository(IBeamRepository inner) : IBeamRepository
{
    public Beam? Get(string mark)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            return inner.Get(mark);
        }
        finally
        {
            Console.WriteLine($"Get({mark}) took {sw.ElapsedMilliseconds} ms");
        }
    }
}

IBeamRepository repo = new TimingRepository(new SqlBeamRepository(conn));
repo.Get("B12");`, output: 'Get(B12) took 14 ms' }
    ],
    keyPoints: [
      'Strategy swaps algorithms; Factory chooses classes; Builder assembles complex objects.',
      'Decorator wraps an object with extra behaviour behind the same interface; Adapter converts interfaces.',
      'C# events are the Observer pattern; prefer DI singletons to static Singleton classes.',
      'Use a pattern when its problem appears, not before.'
    ]
  },

  // ------------------------------------------------------------------ dependency injection
  {
    slug: 'dependency-injection',
    title: 'Dependency injection',
    summary: 'Let a container create your objects: constructor injection, IServiceCollection, Singleton/Scoped/Transient lifetimes, captive dependencies and using DI in console and WPF apps.',
    minutes: 17,
    blocks: [
      { type: 'p', text: 'In the SOLID lesson, classes received their dependencies through the constructor. Someone still has to create all those objects in the right order. In a real app that is dozens of classes. A **DI container** does it for you: you register which class implements which interface, and the container builds whole object graphs on request.' },

      { type: 'h2', text: 'Constructor injection' },
      { type: 'code', title: 'Services.cs', code: cs`
public interface IClock { DateTime Now { get; } }
public class SystemClock : IClock { public DateTime Now => DateTime.Now; }

public class ReportBuilder(IUnitOfWork uow, IClock clock) : IReportBuilder
{
    public Report Build() => new(uow.Beams.ToList(), clock.Now);
}` },
      { type: 'p', text: '`ReportBuilder` just **asks** for what it needs. It doesn’t know which clock or which database it gets, so tests can pass a fake clock showing any date.' },

      { type: 'h2', text: 'Registering and resolving' },
      { type: 'code', title: 'Program.cs', code: cs`
using Microsoft.Extensions.DependencyInjection;   // dotnet add package Microsoft.Extensions.DependencyInjection

var services = new ServiceCollection();
services.AddSingleton<IClock, SystemClock>();
services.AddScoped<IUnitOfWork, UnitOfWork>();
services.AddTransient<IReportBuilder, ReportBuilder>();

using ServiceProvider provider = services.BuildServiceProvider(validateScopes: true);

using (IServiceScope scope = provider.CreateScope())
{
    var builder = scope.ServiceProvider.GetRequiredService<IReportBuilder>();
    Report r = builder.Build();     // the container created UnitOfWork and SystemClock for us
}` },

      { type: 'h2', text: 'Lifetimes' },
      { type: 'widget', name: 'di-lifetimes' },
      { type: 'table', head: ['Lifetime', 'One instance per…', 'Typical use'], rows: [
        ['`AddSingleton`', 'application', 'settings, caches, `HttpClient` factories, clocks'],
        ['`AddScoped`', 'scope (one web request, one window or one operation)', '`DbContext`, unit of work, the current user'],
        ['`AddTransient`', 'every time it is requested', 'lightweight, stateless services']
      ] },
      { type: 'note', kind: 'warn', text: '**Captive dependency:** a service must not depend on something with a **shorter** lifetime. A singleton holding a scoped `DbContext` keeps one request’s context for ever. With `validateScopes: true` (on by default in ASP.NET Core Development) the container throws instead of letting this bug through.' },

      { type: 'h2', text: 'Using the generic host' },
      { type: 'p', text: 'Most .NET apps set up DI, configuration and logging together with the **host**:' },
      { type: 'code', title: 'Program.cs', code: cs`
using Microsoft.Extensions.Hosting;   // dotnet add package Microsoft.Extensions.Hosting

var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddSingleton<IClock, SystemClock>();
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddTransient<IReportBuilder, ReportBuilder>();
builder.Services.AddTransient<ExportCommand>();

using IHost host = builder.Build();

using var scope = host.Services.CreateScope();
await scope.ServiceProvider.GetRequiredService<ExportCommand>().RunAsync();` },
      { type: 'p', text: 'In ASP.NET Core this is `WebApplication.CreateBuilder(args)`, and the framework creates one scope per HTTP request for you. In WPF you build the host in `App.OnStartup` and resolve the main window: `host.Services.GetRequiredService<MainWindow>().Show();`.' },

      { type: 'h2', text: 'Registering several implementations' },
      { type: 'code', title: 'Many.cs', code: cs`
services.AddTransient<IReportWriter, PdfReportWriter>();
services.AddTransient<IReportWriter, ExcelReportWriter>();

public class ExportService(IEnumerable<IReportWriter> writers)   // gets BOTH
{
    public IEnumerable<string> Formats => writers.Select(w => w.Extension);
}` },

      { type: 'h2', text: 'Good habits' },
      { type: 'table', head: ['Do', 'Avoid'], rows: [
        ['ask for interfaces in the constructor', 'calling `provider.GetService` inside classes (the “service locator” anti-pattern hides dependencies)'],
        ['keep constructors cheap: just store the dependencies', 'doing I/O or heavy work in constructors'],
        ['register everything in one place at startup', '`new`-ing services deep inside business code'],
        ['treat many constructor parameters (6+) as a warning', 'one class that needs everything: split it (SRP)']
      ] },

      { type: 'quiz', question: 'Inside one web request, a controller and a repository both ask for `AppDbContext`, registered with `AddScoped`. What do they get?', options: ['Two different instances', 'The same instance', 'An exception', 'null'], answer: 1, explain: 'Scoped means one instance per scope, and ASP.NET Core creates one scope per request.' },
      { type: 'quiz', question: 'Why is a singleton that depends on a scoped service a problem?', options: ['It is slower', 'The singleton keeps the first scoped instance for the whole app’s life', 'Singletons can’t have constructors', 'It isn’t a problem'], answer: 1, explain: 'This is a captive dependency: the scoped object outlives its scope and gets shared across requests and threads.' },
      { type: 'exercise', task: 'Register `IClock` as a singleton (`SystemClock`) and `Greeter` as transient. `Greeter` takes `IClock` and has `string Hello()` returning "Good morning" before 12:00, otherwise "Good afternoon". Resolve and print it. Then write a `FixedClock` you could use in a test.', solution: cs`
public interface IClock { DateTime Now { get; } }
public class SystemClock : IClock { public DateTime Now => DateTime.Now; }
public class FixedClock(DateTime now) : IClock { public DateTime Now => now; }

public class Greeter(IClock clock)
{
    public string Hello() => clock.Now.Hour < 12 ? "Good morning" : "Good afternoon";
}

var services = new ServiceCollection()
    .AddSingleton<IClock, SystemClock>()
    .AddTransient<Greeter>();
using var provider = services.BuildServiceProvider();
Console.WriteLine(provider.GetRequiredService<Greeter>().Hello());

// in a test: no container needed
Console.WriteLine(new Greeter(new FixedClock(new DateTime(2025, 1, 1, 9, 0, 0))).Hello());`, output: 'Good afternoon   (depends on when you run it)\nGood morning' }
    ],
    keyPoints: [
      'Classes ask for interfaces in their constructor; the container creates and wires them.',
      'Singleton: one per app. Scoped: one per scope/request. Transient: new each time.',
      'Never let a longer-lived service capture a shorter-lived one; enable scope validation.',
      'Register at startup with the host; avoid resolving services by hand inside business code.'
    ]
  },

  // ------------------------------------------------------------------ unit testing
  {
    slug: 'unit-testing',
    title: 'Unit testing with xUnit',
    summary: 'Write code that checks your code: test projects, Arrange-Act-Assert, [Fact] and [Theory], testing exceptions and async code, fakes for dependencies, and what makes a good test.',
    minutes: 18,
    blocks: [
      { type: 'p', text: 'A **unit test** is a small method that calls your code with known inputs and checks the result. Run hundreds of them in a few seconds after every change and you will know at once if something broke. That safety net is what lets you refactor and add features with confidence.' },
      { type: 'widget', name: 'test-runner' },

      { type: 'h2', text: 'Creating a test project' },
      { type: 'code', title: 'Terminal', code: cs`
dotnet new classlib -n SteelTools
dotnet new xunit    -n SteelTools.Tests
dotnet add SteelTools.Tests reference SteelTools
dotnet new sln && dotnet sln add SteelTools SteelTools.Tests
dotnet test` },
      { type: 'p', text: 'The test project references the project it tests. In Visual Studio, **Test Explorer** shows every test with a green or red icon; `dotnet test` does the same from the terminal or a CI pipeline.' },

      { type: 'h2', text: 'Arrange, Act, Assert' },
      { type: 'code', title: 'BeamMathTests.cs', code: cs`
using Xunit;

public class BeamMathTests
{
    [Fact]
    public void Weight_of_6_5m_IPE300_is_274_3()
    {
        // Arrange: set up inputs
        double length = 6.5, kgPerM = 42.2;

        // Act: call the code under test (one call)
        double kg = BeamMath.MemberWeightKg(length, kgPerM);

        // Assert: check the result
        Assert.Equal(274.3, kg, precision: 1);
    }
}` },
      { type: 'ul', items: [
        '`[Fact]` marks a test with no parameters.',
        'Name tests as a sentence about the behaviour: `Method_condition_expected` or plain words.',
        'One behaviour per test, so a red test tells you exactly what broke.',
        'For `double`, compare with a `precision` (decimal places) or tolerance, because of floating-point rounding.'
      ] },

      { type: 'h2', text: '[Theory]: one test, many inputs' },
      { type: 'code', title: 'Theory.cs', code: cs`
[Theory]
[InlineData(1, 42.2, 42.2)]
[InlineData(10, 36.1, 361)]
[InlineData(0.5, 10, 5)]
public void Weight_is_length_times_mass(double length, double kgPerM, double expected)
{
    Assert.Equal(expected, BeamMath.MemberWeightKg(length, kgPerM), precision: 1);
}` },

      { type: 'h2', text: 'Testing exceptions and async code' },
      { type: 'code', title: 'Exceptions.cs', code: cs`
[Fact]
public void Throws_for_zero_length()
{
    var ex = Assert.Throws<ArgumentOutOfRangeException>(() => BeamMath.MemberWeightKg(0, 42.2));
    Assert.Equal("lengthM", ex.ParamName);
}

[Fact]
public async Task Loads_three_beams_from_file()
{
    var source = new JsonModelSource("TestData/three-beams.json");
    var beams = await source.LoadBeamsAsync();
    Assert.Equal(3, beams.Count);
}` },

      { type: 'h2', text: 'Common assertions' },
      { type: 'table', head: ['Assertion', 'Checks'], rows: [
        ['`Assert.Equal(expected, actual)`', 'values are equal (order: expected first)'],
        ['`Assert.True(cond)` / `Assert.False(cond)`', 'a condition'],
        ['`Assert.Null(x)` / `Assert.NotNull(x)`', 'null-ness'],
        ['`Assert.Contains(item, list)` / `Assert.Empty(list)`', 'collections'],
        ['`Assert.Throws<T>(() => …)`', 'that code throws exactly `T`'],
        ['`Assert.IsType<T>(obj)`', 'the exact run-time type']
      ] },

      { type: 'h2', text: 'Fakes: testing code with dependencies' },
      { type: 'p', text: 'Thanks to dependency inversion, a class like `AlertService(INotifier notifier)` can be tested with a **fake** notifier that records calls instead of sending emails.' },
      { type: 'code', title: 'AlertServiceTests.cs', code: cs`
class FakeNotifier : INotifier
{
    public List<string> Sent { get; } = new();
    public void Send(string subject, string body) => Sent.Add($"{subject}: {body}");
}

[Fact]
public void Overloaded_beam_sends_one_alert()
{
    var fake = new FakeNotifier();
    var service = new AlertService(fake);

    service.Overloaded(new Beam("B12", 6.5, 42.2));

    string sent = Assert.Single(fake.Sent);      // exactly one message
    Assert.Equal("Overload: B12", sent);
}` },
      { type: 'note', kind: 'info', text: 'Libraries like **NSubstitute** or **Moq** create fakes for you: `var n = Substitute.For<INotifier>(); … n.Received(1).Send("Overload", "B12");`. Hand-written fakes are perfectly fine for small interfaces.' },

      { type: 'h2', text: 'What makes a good unit test' },
      { type: 'table', head: ['Quality', 'Meaning'], rows: [
        ['Fast', 'milliseconds: no real database, network or disk where avoidable'],
        ['Independent', 'tests don’t share state or depend on run order'],
        ['Repeatable', 'same result every run: inject clocks and random seeds'],
        ['Clear', 'a failure message tells you what broke without debugging'],
        ['Covers edges', 'zero, negative, empty, null, maximum and the boundary values']
      ] },
      { type: 'note', kind: 'tip', text: 'Found a bug? First write a test that fails because of it, then fix the code. The test stays and the bug can never come back silently.' },

      { type: 'quiz', question: 'What is the role of the “Act” step?', options: ['Create fake objects', 'Call the code being tested', 'Check the result', 'Clean up files'], answer: 1, explain: 'Arrange sets up, Act performs the single action under test, Assert verifies the outcome.' },
      { type: 'quiz', question: 'All tests pass, but users report that lengths over 24 m are rejected. What does that tell you?', options: ['The tests are broken', 'No test checks lengths over 24 m', 'xUnit has a bug', 'The code must be correct'], answer: 1, explain: 'Tests only prove what they check. Add a test for that rule (whatever the correct behaviour is).' },
      { type: 'exercise', task: 'Write xUnit tests for `static string Grade(double utilisation)` that returns "OK" for values up to 0.9, "WARN" up to 1.0 and "FAIL" above 1.0. Use one `[Theory]` that covers both sides of each boundary.', hint: 'Boundaries are where bugs hide: test 0.9, a value just above it, 1.0 and just above that.', solution: cs`
public class GradeTests
{
    [Theory]
    [InlineData(0.0, "OK")]
    [InlineData(0.9, "OK")]
    [InlineData(0.91, "WARN")]
    [InlineData(1.0, "WARN")]
    [InlineData(1.01, "FAIL")]
    public void Grade_by_utilisation(double u, string expected)
    {
        Assert.Equal(expected, Checks.Grade(u));
    }
}`, output: 'Passed!  - Failed: 0, Passed: 5, Skipped: 0, Total: 5' }
    ],
    keyPoints: [
      'Unit tests call your code with known inputs and assert the result: Arrange, Act, Assert.',
      '`[Fact]` for one case, `[Theory]` + `[InlineData]` for many; `Assert.Throws` for errors.',
      'Use fakes for dependencies, which DI and interfaces make easy.',
      'Good tests are fast, independent, repeatable, clear and cover the edges.'
    ]
  },

  // ------------------------------------------------------------------ performance
  {
    slug: 'performance-profiling',
    title: 'Performance: profiling and benchmarking',
    summary: 'Make code fast the professional way: measure first, use Stopwatch and BenchmarkDotNet correctly, find hot spots with profilers, and fix the common causes of slow .NET code.',
    minutes: 17,
    blocks: [
      { type: 'p', text: 'The golden rule of performance: **measure, don’t guess**. Developers are famously bad at predicting where time goes. Usually a few lines (the **hot path**) take most of it, and optimising anything else just makes the code harder to read.' },

      { type: 'h2', text: 'The workflow' },
      { type: 'ol', items: [
        'Define the goal: “opening a 50 MB model must take under 3 s”.',
        'Measure in a **Release** build on realistic data.',
        'Profile to find the hot spot (the method using most time or memory).',
        'Fix that one thing, then measure again to prove it helped.',
        'Stop when the goal is met.'
      ] },

      { type: 'h2', text: 'Quick timing with Stopwatch' },
      { type: 'code', title: 'Timing.cs', code: cs`
using System.Diagnostics;

var sw = Stopwatch.StartNew();
var model = await loader.LoadAsync("tower.ifc");
sw.Stop();
Console.WriteLine($"Load: {sw.ElapsedMilliseconds} ms, {model.Count:N0} elements");`, output: 'Load: 1840 ms, 48,210 elements' },
      { type: 'note', kind: 'warn', text: 'Never measure performance in a **Debug** build or with the debugger attached: optimisations are off and results can be several times slower. Use `dotnet run -c Release` or Ctrl+F5 in Visual Studio.' },
      { type: 'p', text: 'Stopwatch is fine for whole operations taking milliseconds or more. For small methods (nanoseconds to microseconds), the first run includes JIT compilation and results jump around. That is what BenchmarkDotNet is for.' },

      { type: 'h2', text: 'BenchmarkDotNet' },
      { type: 'widget', name: 'benchmark-lab' },
      { type: 'code', title: 'StringBench.cs', code: cs`
// dotnet new console -n Bench && dotnet add package BenchmarkDotNet
using BenchmarkDotNet.Attributes;
using BenchmarkDotNet.Running;

BenchmarkRunner.Run<StringBench>();

[MemoryDiagnoser]                       // also report allocations
public class StringBench
{
    [Params(100, 1000)]
    public int N;

    [Benchmark(Baseline = true)]
    public string Concat()
    {
        string s = "";
        for (int i = 0; i < N; i++) s += "B" + i + ";";
        return s;
    }

    [Benchmark]
    public string Builder()
    {
        var sb = new StringBuilder();
        for (int i = 0; i < N; i++) sb.Append('B').Append(i).Append(';');
        return sb.ToString();
    }
}` },
      { type: 'p', text: 'Run it with `dotnet run -c Release`. BenchmarkDotNet warms up the JIT, runs each method many times, removes outliers and prints a table with **Mean**, **Ratio** to the baseline and **Allocated** memory.' },

      { type: 'h2', text: 'Profilers: finding the hot spot' },
      { type: 'table', head: ['Tool', 'Use it to'], rows: [
        ['Visual Studio **Performance Profiler** (Alt+F2): CPU Usage', 'see which methods use the most CPU time, as a call tree'],
        ['Visual Studio: .NET Object Allocation', 'find what allocates the most objects'],
        ['Diagnostic Tools window (while debugging)', 'watch memory and GC events live'],
        ['`dotnet-counters monitor -n MyApp`', 'live CPU, GC and allocation rate from the terminal'],
        ['`dotnet-trace collect -n MyApp`', 'record a trace to open in Visual Studio or PerfView']
      ] },
      { type: 'p', text: 'In a CPU profile, sort by **inclusive** time (the method plus everything it calls) to find the slow feature, then by **exclusive** (self) time to find the actual line doing the work.' },

      { type: 'h2', text: 'Common causes and fixes' },
      { type: 'table', head: ['Symptom', 'Usual cause', 'Fix'], rows: [
        ['slow loops over big collections', '`List.Contains`/`First` inside a loop (O(n²))', 'build a `Dictionary`/`HashSet` once'],
        ['high GC time', 'many temporary objects: string `+=`, boxing, LINQ in hot loops', '`StringBuilder`, generics, spans, pooling'],
        ['UI freezes', 'heavy work on the UI thread', '`await` I/O, `Task.Run` for CPU work'],
        ['slow database screens', 'N+1 queries (one query per row)', 'load related data in one query'],
        ['slow startup', 'loading everything up front', 'lazy loading, caching, async loading'],
        ['a single core at 100%', 'CPU-bound work in one thread', '`Parallel.For`, PLINQ']
      ] },
      { type: 'code', title: 'Nsquared.cs', code: cs`
// ✗ O(n × m): for 20,000 beams × 20,000 IDs that is 400 million comparisons
var clashing = beams.Where(b => clashIds.Contains(b.Id)).ToList();   // clashIds is a List<string>

// ✓ O(n + m): one HashSet, then fast lookups
var clashSet = clashIds.ToHashSet();
var clashing2 = beams.Where(b => clashSet.Contains(b.Id)).ToList();` },
      { type: 'note', kind: 'tip', text: 'Algorithms beat micro-tuning. Turning O(n²) into O(n) can save minutes; rewriting LINQ as a loop usually saves microseconds. Fix the big-O first.' },

      { type: 'quiz', question: 'Why should you not benchmark a Debug build?', options: ['Debug builds can’t run Stopwatch', 'JIT optimisations are disabled, so results are misleading', 'It uses more disk', 'There is no difference'], answer: 1, explain: 'Debug builds keep code easy to step through, not fast. Always measure Release.' },
      { type: 'quiz', question: 'A profile shows `FindBeam` with 80% inclusive time but only 2% exclusive time. Where is the time really spent?', options: ['Inside FindBeam’s own lines', 'In methods that FindBeam calls', 'In the garbage collector only', 'Nowhere: profilers lie'], answer: 1, explain: 'Inclusive includes callees; low exclusive means FindBeam itself is cheap, so drill into what it calls.' },
      { type: 'exercise', task: 'Write a BenchmarkDotNet class comparing `List<int>.Contains` with `HashSet<int>.Contains` for checking 1,000 random IDs against a collection of `N` = 1,000 and 100,000 IDs. Build the collections in a `[GlobalSetup]` method so setup isn’t measured.', solution: cs`
[MemoryDiagnoser]
public class LookupBench
{
    [Params(1_000, 100_000)] public int N;
    private List<int> _list = null!;
    private HashSet<int> _set = null!;
    private int[] _queries = null!;

    [GlobalSetup]
    public void Setup()
    {
        var rnd = new Random(42);                    // fixed seed: repeatable
        _list = Enumerable.Range(0, N).ToList();
        _set = _list.ToHashSet();
        _queries = Enumerable.Range(0, 1000).Select(_ => rnd.Next(2 * N)).ToArray();
    }

    [Benchmark(Baseline = true)]
    public int ListContains() => _queries.Count(q => _list.Contains(q));

    [Benchmark]
    public int SetContains() => _queries.Count(q => _set.Contains(q));
}`, output: '| Method       | N      | Mean       | Ratio |\n|------------- |------- |-----------:|------:|\n| ListContains | 100000 | 7,410.2 μs |  1.00 |\n| SetContains  | 100000 |     6.1 μs |  0.00 |' }
    ],
    keyPoints: [
      'Measure first, in Release, on realistic data; fix the hot path, then measure again.',
      'Stopwatch for whole operations; BenchmarkDotNet with `[MemoryDiagnoser]` for small methods.',
      'Profilers show where time and allocations go: inclusive vs exclusive time.',
      'Big wins come from better algorithms and fewer allocations, not micro-tweaks.'
    ]
  }
];
