import { Lesson } from '../learn.types';
import { cs } from './cs';

export const EXPERT: Lesson[] = [
  // ------------------------------------------------------------------ unsafe and interop
  {
    slug: 'unsafe-and-interop',
    title: 'unsafe code, pointers and native interop',
    summary: 'Step outside the safety net when you must: pointers, fixed, stackalloc and native memory, and calling C/C++ and Windows APIs with P/Invoke (LibraryImport), SafeHandle and COM.',
    minutes: 17,
    blocks: [
      { type: 'p', text: 'Normally C# protects you: arrays check their bounds, the GC manages memory and you can’t read random addresses. Sometimes you must leave that protection: to call a C++ library, a Windows API, a vendor SDK, or to squeeze the last bit of speed from image or mesh processing. C# allows it, but only inside code explicitly marked `unsafe`.' },
      { type: 'widget', name: 'pointer-memory' },

      { type: 'h2', text: 'Turning on unsafe code' },
      { type: 'code', title: 'SteelTools.csproj', code: cs`
<PropertyGroup>
  <AllowUnsafeBlocks>true</AllowUnsafeBlocks>
</PropertyGroup>` },
      { type: 'h2', text: 'Pointers' },
      { type: 'code', title: 'Pointers.cs', code: cs`
unsafe
{
    int x = 42;
    int* p = &x;                 // & = address of x
    Console.WriteLine(*p);       // * = value at that address → 42
    *p = 50;                     // writes to x through the pointer
    Console.WriteLine(x);

    Console.WriteLine(sizeof(double));   // 8 bytes
}`, output: '42\n50\n8' },
      { type: 'table', head: ['Syntax', 'Meaning'], rows: [
        ['`int* p`', 'p holds the address of an int'],
        ['`&x`', 'address of variable x'],
        ['`*p`', 'the value at the address (dereference)'],
        ['`p[i]` or `*(p + i)`', 'the int i positions after p'],
        ['`p++`', 'move to the next int: the address grows by `sizeof(int)` = 4'],
        ['`p->Field`', 'member of a struct through a pointer']
      ] },

      { type: 'h2', text: 'fixed: pinning managed memory' },
      { type: 'p', text: 'The GC may **move** arrays and objects while compacting memory. To take a pointer to managed data, pin it with `fixed`. The GC won’t move it until the block ends.' },
      { type: 'code', title: 'Fixed.cs', code: cs`
static unsafe double SumZ(float[] vertices)       // x, y, z, x, y, z, …
{
    double sum = 0;
    fixed (float* start = vertices)              // pinned for this block only
    {
        float* end = start + vertices.Length;
        for (float* p = start + 2; p < end; p += 3)   // jump to every z
            sum += *p;
    }
    return sum;
}

Console.WriteLine(SumZ([0, 0, 3.5f, 1, 0, 4.5f]));`, output: '8' },
      { type: 'note', kind: 'warn', text: 'Keep `fixed` blocks short. Pinned objects stop the GC compacting memory around them. And never keep a pointer after the block: the data may move.' },

      { type: 'h2', text: 'stackalloc and native memory' },
      { type: 'code', title: 'Native.cs', code: cs`
using System.Runtime.InteropServices;

Span<int> small = stackalloc int[64];           // on the stack, freed automatically (no unsafe needed)

unsafe
{
    // a big buffer the GC never sees: YOU must free it
    nuint count = 1_000_000;
    float* buffer = (float*)NativeMemory.Alloc(count, sizeof(float));
    try
    {
        new Span<float>(buffer, (int)count).Fill(0f);
        buffer[10] = 1.5f;
    }
    finally
    {
        NativeMemory.Free(buffer);              // forget this → memory leak
    }
}` },
      { type: 'note', kind: 'tip', text: 'Most code that once needed pointers can now use `Span<T>` safely and just as fast. Reach for `unsafe` only when a profiler or a native API really requires it.' },

      { type: 'h2', text: 'P/Invoke: calling native functions' },
      { type: 'p', text: '**Platform Invoke** lets C# call functions exported from native DLLs: Windows APIs or a C/C++ library from a vendor. Since .NET 7, `[LibraryImport]` generates the marshalling code at compile time (using a source generator).' },
      { type: 'code', title: 'Native.cs', code: cs`
using System.Runtime.InteropServices;

internal static partial class Win32
{
    [LibraryImport("kernel32.dll")]
    internal static partial ulong GetTickCount64();

    [LibraryImport("user32.dll", EntryPoint = "MessageBoxW", StringMarshalling = StringMarshalling.Utf16)]
    internal static partial int MessageBox(nint hWnd, string text, string caption, uint type);
}

Console.WriteLine($"Windows has been up for {Win32.GetTickCount64() / 3_600_000} hours");
Win32.MessageBox(0, "Export finished", "SteelTools", 0);`, output: 'Windows has been up for 37 hours   (depends on your PC)' },
      { type: 'ul', items: [
        'The class and method are `partial`: the generator writes the method body.',
        '`LibraryImport` needs `AllowUnsafeBlocks` in the project, because the generated code uses pointers.',
        'Older code uses `[DllImport]` with `extern`. It still works, but marshalling happens at run time.',
        'Types must match the native signature exactly: C `int` → `int`, `HANDLE` → `nint`, `wchar_t*` → `string` with UTF-16.'
      ] },

      { type: 'h2', text: 'Calling your own C++ library' },
      { type: 'code', title: 'mesh.h (C++)', code: cs`
extern "C" __declspec(dllexport)
int TriangleCount(const float* vertices, int vertexCount, double tolerance);` },
      { type: 'code', title: 'MeshNative.cs', code: cs`
internal static partial class MeshNative
{
    [LibraryImport("mesh.dll")]
    internal static partial int TriangleCount(ReadOnlySpan<float> vertices, int vertexCount, double tolerance);
}

float[] verts = LoadVertices("slab.obj");
int n = MeshNative.TriangleCount(verts, verts.Length / 3, 0.001);   // span is pinned for the call` },
      { type: 'note', kind: 'info', text: '`extern "C"` stops C++ from renaming (“mangling”) the function, so .NET can find it by name. The DLL must be next to your .exe (or on the PATH) and match the process: a 64-bit app needs a 64-bit DLL.' },

      { type: 'h2', text: 'SafeHandle: never leak native resources' },
      { type: 'code', title: 'SafeHandle.cs', code: cs`
internal sealed class ModelHandle : SafeHandleZeroOrMinusOneIsInvalid
{
    public ModelHandle() : base(ownsHandle: true) { }
    protected override bool ReleaseHandle() => VendorSdk.CloseModel(handle) == 0;
}

internal static partial class VendorSdk
{
    [LibraryImport("vendor.dll", StringMarshalling = StringMarshalling.Utf16)]
    internal static partial ModelHandle OpenModel(string path);

    [LibraryImport("vendor.dll")]
    internal static partial int CloseModel(nint handle);
}

using ModelHandle model = VendorSdk.OpenModel("tower.dat");   // closed even if an exception happens` },
      { type: 'p', text: 'A `SafeHandle` wraps a raw native handle, works with `using`, and is released by the runtime even in edge cases where a plain `IntPtr` would leak.' },

      { type: 'h2', text: 'COM interop' },
      { type: 'p', text: 'Many Windows applications expose **COM** APIs: Excel, older CAD tools and many engineering programs. You usually reference a provided interop assembly (or add a COM reference in Visual Studio) and call it like normal .NET objects. The runtime marshals the calls for you. Release COM objects you create in loops promptly (`Marshal.FinalReleaseComObject`), or the external application may stay open in the background.' },

      { type: 'h2', text: 'Safety checklist' },
      { type: 'table', head: ['Rule', 'Why'], rows: [
        ['keep `unsafe` blocks tiny and wrap them in a safe API', 'the rest of the app stays protected'],
        ['check lengths before every pointer loop', 'there is no bounds check to save you'],
        ['always free what you allocate (`try`/`finally`, `SafeHandle`)', 'the GC doesn’t know about native memory'],
        ['match 32/64-bit and calling conventions', 'mismatches cause crashes, not exceptions'],
        ['test with large and malformed inputs', 'memory bugs often appear only with real data']
      ] },

      { type: 'quiz', question: 'After `int* p = arr;` (an int array), what does `p++` do?', options: ['Adds 1 to arr[0]', 'Moves the address forward by 4 bytes, to arr[1]', 'Moves the address by 1 byte', 'Throws if past the end'], answer: 1, explain: 'Pointer arithmetic moves by sizeof(T). There is no bounds check.' },
      { type: 'quiz', question: 'Why must you use `fixed` to get a pointer to a managed array?', options: ['To make it read-only', 'So the GC can’t move it while you use the pointer', 'To make it faster', 'To allocate it on the stack'], answer: 1, explain: 'Without pinning, a GC compaction could move the array and your pointer would point at garbage.' },
      { type: 'exercise', task: 'Write an `unsafe` method `static int CountAbove(int[] values, int limit)` that uses `fixed` and a pointer loop to count values greater than `limit`. Test it with `{ 5, 12, 8, 30, 15 }` and limit 10.', solution: cs`
static unsafe int CountAbove(int[] values, int limit)
{
    int count = 0;
    fixed (int* start = values)
    {
        for (int* p = start, end = start + values.Length; p < end; p++)
            if (*p > limit) count++;
    }
    return count;
}

Console.WriteLine(CountAbove([5, 12, 8, 30, 15], 10));`, output: '3' }
    ],
    keyPoints: [
      '`unsafe` enables pointers (`&`, `*`, `->`, pointer arithmetic) with no bounds checks.',
      '`fixed` pins managed memory; `NativeMemory` and `stackalloc` give memory outside the GC heap.',
      '`[LibraryImport]` (P/Invoke) calls native DLLs; use `SafeHandle` for native resources.',
      'Prefer `Span<T>`; keep unsafe code tiny, wrapped and well tested.'
    ]
  },

  // ------------------------------------------------------------------ source generators
  {
    slug: 'source-generators',
    title: 'Source generators',
    summary: 'Let the compiler write the boring code: using built-in generators (GeneratedRegex, JSON, LibraryImport, MVVM Toolkit) and building your own incremental generator.',
    minutes: 17,
    blocks: [
      { type: 'p', text: 'Some code is pure boilerplate: `INotifyPropertyChanged` properties, `ToString`, mapping, serialisation. You could generate it at **run time** with reflection (slow, and it breaks trimming and AOT), or write it by hand (boring, and easy to get wrong). A **source generator** is a plugin for the C# compiler that reads your code **while it compiles** and adds new C# files to the build.' },
      { type: 'widget', name: 'source-gen' },

      { type: 'h2', text: 'Generators you can use today' },
      { type: 'table', head: ['Generator', 'You write', 'It generates'], rows: [
        ['`[GeneratedRegex]`', 'a partial method with a pattern', 'a compiled, fast regex'],
        ['`[JsonSerializable]`', 'a `JsonSerializerContext`', 'serialisation code without reflection'],
        ['`[LibraryImport]`', 'a partial native method', 'P/Invoke marshalling code'],
        ['`[LoggerMessage]`', 'a partial logging method', 'fast, allocation-free logging'],
        ['CommunityToolkit.Mvvm `[ObservableProperty]`, `[RelayCommand]`', 'fields and methods', 'bindable properties and `ICommand`s for WPF']
      ] },
      { type: 'code', title: 'Builtins.cs', code: cs`
using System.Text.RegularExpressions;

public static partial class Patterns
{
    [GeneratedRegex(@"^(IPE|HEA|HEB)(\d{2,4})$", RegexOptions.IgnoreCase)]
    public static partial Regex ISection();
}

Match m = Patterns.ISection().Match("ipe300");
Console.WriteLine($"{m.Groups[1].Value.ToUpper()} depth {m.Groups[2].Value} mm");`, output: 'IPE depth 300 mm' },
      { type: 'code', title: 'Json.cs', code: cs`
[JsonSerializable(typeof(List<Beam>))]
internal partial class ModelJsonContext : JsonSerializerContext { }

string json = JsonSerializer.Serialize(beams, ModelJsonContext.Default.ListBeam);   // no reflection` },

      { type: 'h2', text: 'MVVM without boilerplate' },
      { type: 'code', title: 'BeamViewModel.cs', code: cs`
// dotnet add package CommunityToolkit.Mvvm
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;

public partial class BeamViewModel : ObservableObject
{
    [ObservableProperty]
    private string _mark = "";          // generates public string Mark { get; set; } with change notification

    [ObservableProperty]
    private double _lengthM;

    [RelayCommand]
    private void Check() => Status = LengthM > 24 ? "Too long" : "OK";   // generates CheckCommand

    [ObservableProperty]
    private string _status = "";
}` },
      { type: 'p', text: 'In XAML you bind to `{Binding Mark}` and `{Binding CheckCommand}`. The toolkit wrote the properties and the command for you.' },

      { type: 'h2', text: 'Writing your own generator' },
      { type: 'p', text: 'A generator lives in its own class library that targets **netstandard2.0** (the compiler loads it) and references the Roslyn packages.' },
      { type: 'code', title: 'Gen.csproj', code: cs`
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>netstandard2.0</TargetFramework>
    <LangVersion>latest</LangVersion>
    <EnforceExtendedAnalyzerRules>true</EnforceExtendedAnalyzerRules>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.CodeAnalysis.CSharp" Version="4.8.0" PrivateAssets="all" />
  </ItemGroup>
</Project>` },
      { type: 'code', title: 'ToStringGenerator.cs', code: cs`
using System.Linq;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp.Syntax;

[Generator]
public class ToStringGenerator : IIncrementalGenerator
{
    public void Initialize(IncrementalGeneratorInitializationContext context)
    {
        // 1. add the [AutoToString] attribute itself to the user's project
        context.RegisterPostInitializationOutput(ctx => ctx.AddSource("AutoToStringAttribute.g.cs",
            "namespace Gen { [System.AttributeUsage(System.AttributeTargets.Class)] public sealed class AutoToStringAttribute : System.Attribute { } }"));

        // 2. find classes marked with it, and collect what we need
        var classes = context.SyntaxProvider.ForAttributeWithMetadataName(
            "Gen.AutoToStringAttribute",
            predicate: (node, _) => node is ClassDeclarationSyntax,
            transform: (ctx, _) =>
            {
                var type = (INamedTypeSymbol)ctx.TargetSymbol;
                var props = type.GetMembers().OfType<IPropertySymbol>()
                                .Where(p => p.DeclaredAccessibility == Accessibility.Public && !p.IsStatic && !p.IsIndexer)
                                .Select(p => p.Name).ToArray();
                string ns = type.ContainingNamespace.IsGlobalNamespace ? "" : type.ContainingNamespace.ToDisplayString();
                return (Ns: ns, Name: type.Name, Props: new EquatableArray(props));
            });

        // 3. write one file per class
        context.RegisterSourceOutput(classes, (spc, c) =>
        {
            string body = c.Props.Items.Length == 0
                ? "\"\""                                                   // no properties: still valid C#
                : string.Join(" + \", \" + ", c.Props.Items.Select(p => $"\"{p} = \" + {p}"));
            string nsLine = c.Ns == "" ? "" : $"namespace {c.Ns};";      // classes without a namespace
            spc.AddSource($"{c.Name}.ToString.g.cs", $$"""
                {{nsLine}}
                partial class {{c.Name}}
                {
                    public override string ToString() => "{{c.Name}} { " + {{body}} + " }";
                }
                """);
        });
    }
}` },
      { type: 'p', text: '`EquatableArray` is a small wrapper (not shown) that compares arrays by their contents. The generator is **incremental**: Roslyn caches each step and reruns it only when its input changes, so typing in the editor stays fast. That only works if the values passed between steps compare by value. That is why we use tuples of strings and an equatable array, never Roslyn symbols or syntax nodes.' },

      { type: 'h2', text: 'Using it' },
      { type: 'code', title: 'SteelTools.csproj', code: cs`
<ItemGroup>
  <ProjectReference Include="..\Gen\Gen.csproj" OutputItemType="Analyzer" ReferenceOutputAssembly="false" />
</ItemGroup>` },
      { type: 'code', title: 'Beam.cs', code: cs`
using Gen;

namespace SteelTools;

[AutoToString]
public partial class Beam            // partial: the generator adds the other half
{
    public string Mark { get; set; } = "";
    public double LengthM { get; set; }
}` },
      { type: 'code', title: 'Program.cs', code: cs`
Console.WriteLine(new SteelTools.Beam { Mark = "B12", LengthM = 6.5 });   // calls the generated ToString()`, output: 'Beam { Mark = B12, LengthM = 6.5 }' },
      { type: 'note', kind: 'tip', text: 'To see generated files, expand **Dependencies → Analyzers → Gen** in Solution Explorer, or add `<EmitCompilerGeneratedFiles>true</EmitCompilerGeneratedFiles>` to write them to the `obj` folder. You can set breakpoints in generated code.' },

      { type: 'h2', text: 'Generator rules' },
      { type: 'ul', items: [
        'Generators can only **add** code, never change or delete yours. That is why the target class must be `partial`.',
        'Use `IIncrementalGenerator`. The older `ISourceGenerator` reruns on every keystroke and makes the IDE slow.',
        'Report problems with diagnostics (`spc.ReportDiagnostic`) instead of throwing.',
        'Test generators with snapshot tests: compile sample code and compare the generated output.'
      ] },

      { type: 'quiz', question: 'When does a source generator run?', options: ['Every time the app starts', 'During compilation, adding C# files to the build', 'Only in Debug builds', 'When reflection is called'], answer: 1, explain: 'Generators are compiler plugins; the generated code is compiled into the assembly like your own.' },
      { type: 'quiz', question: 'Why must a class be `partial` for a generator to add a method to it?', options: ['Generators can only add new files, so the class must be allowed to span several files', 'partial makes it faster', 'It isn’t required', 'To hide it from reflection'], answer: 0, explain: 'The generated file declares another part of the same partial class.' },
      { type: 'exercise', task: 'Use `[GeneratedRegex]` to write `Patterns.Grid()` that matches grid labels like "A-3", "C-12" (one capital letter, a dash, 1–2 digits). Print whether "B-7", "b-7" and "AB-1" match.', solution: cs`
public static partial class Patterns
{
    [GeneratedRegex(@"^[A-Z]-\d{1,2}$")]
    public static partial Regex Grid();
}

foreach (var s in new[] { "B-7", "b-7", "AB-1" })
    Console.WriteLine($"{s}: {Patterns.Grid().IsMatch(s)}");`, output: 'B-7: True\nb-7: False\nAB-1: False' }
    ],
    keyPoints: [
      'Source generators add C# code at compile time: fast, AOT-friendly, no reflection.',
      'Use the built-ins: `[GeneratedRegex]`, `[JsonSerializable]`, `[LibraryImport]`, `[LoggerMessage]`, MVVM Toolkit.',
      'Your own generator: netstandard2.0 library, `IIncrementalGenerator`, `ForAttributeWithMetadataName`, `AddSource`.',
      'Generators only add code, so targets must be `partial`; keep pipeline values equatable.'
    ]
  },

  // ------------------------------------------------------------------ clean architecture
  {
    slug: 'clean-architecture',
    title: 'Structuring a real application',
    summary: 'Put it all together: a layered solution (Domain, Application, Infrastructure, Presentation), the dependency rule, MVVM for WPF, configuration, logging and tests, plus where to go after this course.',
    minutes: 19,
    blocks: [
      { type: 'p', text: 'A 200-line console app can live in one file. A real tool used by a team for years cannot. This final lesson combines everything in the course (classes, interfaces, DI, async, tests, SOLID) into a structure that stays understandable as it grows.' },

      { type: 'h2', text: 'The dependency rule' },
      { type: 'p', text: 'Arrange the code in layers like an onion. **Dependencies point inwards only.** The centre holds your engineering knowledge and depends on nothing; the outer layers hold replaceable details: database, files, UI.' },
      { type: 'widget', name: 'architecture-layers' },

      { type: 'h2', text: 'Solution layout' },
      { type: 'code', title: 'Folder structure', code: cs`
SteelTools.sln
├─ src/
│  ├─ SteelTools.Domain/            Beam, Connection, LoadCase, rules (no references)
│  ├─ SteelTools.Application/       use cases, IBeamRepository, IReportWriter (→ Domain)
│  ├─ SteelTools.Infrastructure/    EF Core, IFC reader, PDF, email (→ Application)
│  └─ SteelTools.Wpf/               views, view models, App.xaml.cs (→ Application, Infrastructure)
└─ tests/
   ├─ SteelTools.Domain.Tests/
   └─ SteelTools.Application.Tests/` },
      { type: 'p', text: 'Separate **projects** (not just folders) let the compiler enforce the rule: if Domain doesn’t reference Infrastructure, nobody can accidentally use EF Core inside a beam.' },

      { type: 'h2', text: 'Domain: the engineering core' },
      { type: 'code', title: 'Domain/Beam.cs', code: cs`
namespace SteelTools.Domain;

public sealed class Beam
{
    public string Mark { get; }
    public double LengthM { get; }
    public double KgPerM { get; }

    public Beam(string mark, double lengthM, double kgPerM)
    {
        if (string.IsNullOrWhiteSpace(mark)) throw new ArgumentException("Mark is required", nameof(mark));
        if (lengthM <= 0) throw new ArgumentOutOfRangeException(nameof(lengthM));
        (Mark, LengthM, KgPerM) = (mark, lengthM, kgPerM);
    }

    public double WeightKg() => Math.Round(LengthM * KgPerM, 1);
    public bool IsOverUtilised(double utilisation) => utilisation > 1.0;
}` },
      { type: 'p', text: 'Entities protect their own rules: you can’t create a beam with no mark or a negative length. No `using` of databases, JSON or WPF.' },

      { type: 'h2', text: 'Application: use cases' },
      { type: 'code', title: 'Application/CheckBeams.cs', code: cs`
namespace SteelTools.Application;

public interface IBeamRepository
{
    Task<IReadOnlyList<Beam>> GetByLevelAsync(int level, CancellationToken ct);
}

public record BeamResult(string Mark, double WeightKg, bool Ok);

public class CheckBeamsHandler(IBeamRepository repo, ILogger<CheckBeamsHandler> log)
{
    public async Task<IReadOnlyList<BeamResult>> HandleAsync(int level, CancellationToken ct)
    {
        var beams = await repo.GetByLevelAsync(level, ct);
        log.LogInformation("Checking {Count} beams on level {Level}", beams.Count, level);
        return beams.Select(b => new BeamResult(b.Mark, b.WeightKg(), b.WeightKg() < 2000)).ToList();
    }
}` },
      { type: 'p', text: 'The handler orchestrates: get data through an interface, apply domain rules, return simple results. It is easy to unit test with a fake repository.' },

      { type: 'h2', text: 'Infrastructure: the details' },
      { type: 'code', title: 'Infrastructure/SqlBeamRepository.cs', code: cs`
namespace SteelTools.Infrastructure;

public class SqlBeamRepository(SteelDbContext db) : IBeamRepository
{
    public async Task<IReadOnlyList<Beam>> GetByLevelAsync(int level, CancellationToken ct) =>
        await db.BeamRows.Where(b => b.Level == level)          // BeamRow: the table's shape, not the domain class
                      .Select(b => new Beam(b.Mark, b.LengthM, b.KgPerM))
                      .ToListAsync(ct);
}

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        services.AddDbContext<SteelDbContext>(o => o.UseSqlServer(config.GetConnectionString("Steel")));
        services.AddScoped<IBeamRepository, SqlBeamRepository>();
        services.AddTransient<IReportWriter, PdfReportWriter>();
        return services;
    }
}` },

      { type: 'h2', text: 'Presentation: WPF with MVVM' },
      { type: 'p', text: '**MVVM** (Model-View-ViewModel) keeps the window (View, XAML) thin. All state and actions live in a ViewModel that the View binds to, and it can be tested without opening a window.' },
      { type: 'code', title: 'Wpf/BeamListViewModel.cs', code: cs`
public partial class BeamListViewModel(CheckBeamsHandler handler) : ObservableObject
{
    public ObservableCollection<BeamResult> Results { get; } = new();

    [ObservableProperty] private int _level = 1;
    [ObservableProperty] private bool _isBusy;

    [RelayCommand]
    private async Task CheckAsync(CancellationToken ct)
    {
        IsBusy = true;
        try
        {
            Results.Clear();
            foreach (var r in await handler.HandleAsync(Level, ct)) Results.Add(r);
        }
        finally { IsBusy = false; }
    }
}` },
      { type: 'code', title: 'Wpf/App.xaml.cs (composition root)', code: cs`
public partial class App : Application
{
    private IHost _host = null!;

    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);
        var builder = Host.CreateApplicationBuilder();
        builder.Services.AddInfrastructure(builder.Configuration);   // appsettings.json
        builder.Services.AddTransient<CheckBeamsHandler>();
        builder.Services.AddTransient<BeamListViewModel>();
        builder.Services.AddTransient<MainWindow>();
        _host = builder.Build();

        _host.Services.GetRequiredService<MainWindow>().Show();
    }

    protected override void OnExit(ExitEventArgs e)
    {
        _host.Dispose();
        base.OnExit(e);
    }
}

// MainWindow.xaml.cs: the view model arrives through the constructor
public partial class MainWindow : Window
{
    public MainWindow(BeamListViewModel vm)
    {
        InitializeComponent();
        DataContext = vm;
    }
}` },
      { type: 'note', kind: 'warn', text: 'Delete `StartupUri="MainWindow.xaml"` from `App.xaml` (the WPF template adds it). Otherwise WPF also tries to create `MainWindow` itself with a parameterless constructor: you get a XamlParseException, or two windows.' },
      { type: 'note', kind: 'info', text: 'The **composition root** is the only place that knows every concrete class. Swap SQL Server for a JSON file? Change `AddInfrastructure`. Nothing in Domain or Application moves.' },

      { type: 'h2', text: 'Cross-cutting essentials' },
      { type: 'table', head: ['Concern', 'Use', 'Notes'], rows: [
        ['Configuration', '`appsettings.json` + `IConfiguration` / `IOptions<T>`', 'no hard-coded paths or connection strings; secrets in user-secrets or environment variables'],
        ['Logging', '`ILogger<T>` (+ Serilog for files)', 'structured messages: `"{Count} beams"`, not string concatenation'],
        ['Errors', 'validate at the edges, exceptions for the unexpected', 'one global handler that logs and shows a friendly message'],
        ['Tests', 'unit tests for Domain/Application, a few integration tests for Infrastructure', 'the inner layers are the easiest and most valuable to test'],
        ['Async', '`async` all the way from the view model to the database', 'pass `CancellationToken` through every layer']
      ] },

      { type: 'h2', text: 'Keep it proportional' },
      { type: 'note', kind: 'warn', text: 'Four projects for a 300-line utility is over-engineering. Start with one project and folders named after the layers. Split into projects when the app, the team or the number of front-ends (WPF + Revit add-in + web API) grows. The **dependency rule** matters more than the number of projects.' },

      { type: 'h2', text: 'You finished the C# course' },
      { type: 'p', text: 'You went from `Console.WriteLine("Hello")` to layered, tested, dependency-injected applications. Practise by building a real tool from start to finish. Some ideas, roughly in order of difficulty:' },
      { type: 'ol', items: [
        'A **console BOM tool**: read a CSV of members, group by profile with LINQ, write totals to JSON.',
        'A **WPF beam checker** with MVVM, async loading and unit tests for the checks.',
        'A **Revit or Tekla add-in** that reads model elements through the vendor API and reuses your Domain project.',
        'An **ASP.NET Core web API** serving the same Application layer to a browser front-end.'
      ] },
      { type: 'p', text: 'Next tracks on this site: **Data structures and algorithms**, **BIM math** and **SQL**. They build directly on what you learned here.' },

      { type: 'quiz', question: 'Which reference breaks the dependency rule?', options: ['Infrastructure → Application', 'Application → Domain', 'Domain → Infrastructure', 'Presentation → Application'], answer: 2, explain: 'The Domain is the centre and must not depend on any outer layer.' },
      { type: 'quiz', question: '`CheckBeamsHandler` needs to load beams from SQL Server. Where should the interface `IBeamRepository` be declared?', options: ['Infrastructure, next to the SQL code', 'Application, next to the code that uses it', 'Presentation', 'In the database'], answer: 1, explain: 'Declaring it in Application lets Application stay free of SQL; Infrastructure implements it (dependency inversion).' },
      { type: 'exercise', task: 'Write a unit test for `CheckBeamsHandler` with a fake `IBeamRepository` that returns two beams: B1 (6 m × 42.2 kg/m) and B2 (30 m × 122 kg/m). Assert that B1 is OK and B2 is not. Use `NullLogger<CheckBeamsHandler>.Instance` for the logger.', hint: '30 × 122 = 3660 kg, which is above the 2000 kg limit in the handler.', solution: cs`
class FakeRepo(params Beam[] beams) : IBeamRepository
{
    public Task<IReadOnlyList<Beam>> GetByLevelAsync(int level, CancellationToken ct) =>
        Task.FromResult<IReadOnlyList<Beam>>(beams);
}

public class CheckBeamsHandlerTests
{
    [Fact]
    public async Task Heavy_beam_is_flagged()
    {
        var repo = new FakeRepo(new Beam("B1", 6, 42.2), new Beam("B2", 30, 122));
        var handler = new CheckBeamsHandler(repo, NullLogger<CheckBeamsHandler>.Instance);

        var results = await handler.HandleAsync(level: 1, CancellationToken.None);

        Assert.True(results.Single(r => r.Mark == "B1").Ok);
        Assert.False(results.Single(r => r.Mark == "B2").Ok);
    }
}`, output: 'Passed!  - Failed: 0, Passed: 1, Skipped: 0, Total: 1' }
    ],
    keyPoints: [
      'Layers: Domain (rules) ← Application (use cases, interfaces) ← Infrastructure and Presentation (details).',
      'Dependencies point inwards; interfaces live with the code that needs them.',
      'One composition root wires everything with DI; MVVM keeps WPF views thin and testable.',
      'Scale the structure to the app; keep the dependency rule from day one.'
    ]
  }
];
