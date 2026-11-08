import { Lesson } from '../learn.types';
import { cs } from './cs';

export const OOP_ADVANCED: Lesson[] = [
  // ------------------------------------------------------------------ polymorphism
  {
    slug: 'polymorphism',
    title: 'Polymorphism: virtual and override',
    summary: 'Let each class respond to the same method call in its own way: virtual, override, base calls, method hiding and why it matters.',
    minutes: 15,
    blocks: [
      { type: 'p', text: '**Polymorphism** (Greek for “many forms”) means one call, many behaviours. You call `member.Check()` without knowing whether `member` is a Beam, a Column or a Brace, and each object runs **its own** check. It is what makes inheritance truly useful.' },
      { type: 'h2', text: 'virtual and override' },
      { type: 'code', title: 'Check.cs', code: cs`
public class StructuralMember
{
    public string Mark { get; init; } = "";

    // virtual: "child classes may replace this"
    public virtual string Check() => $"{Mark}: generic check";
}

public class Beam : StructuralMember
{
    public override string Check() => $"{Mark}: bending and deflection";
}

public class Column : StructuralMember
{
    public override string Check() => $"{Mark}: axial load and buckling";
}

StructuralMember[] frame =
{
    new Beam { Mark = "B1" },
    new Column { Mark = "C1" },
    new StructuralMember { Mark = "X1" }
};

foreach (StructuralMember m in frame)
    Console.WriteLine(m.Check());      // each object picks its own version`, output: 'B1: bending and deflection\nC1: axial load and buckling\nX1: generic check' },
      { type: 'p', text: 'The loop only knows about `StructuralMember`. At run time C# looks at the **actual object** and calls the most specific override. Add a `Brace` class next year and this loop works without any change.' },
      { type: 'widget', name: 'virtual-dispatch' },
      { type: 'h2', text: 'Calling the base version' },
      { type: 'p', text: 'An override can extend the parent’s behaviour instead of replacing it, using `base.Method()`:' },
      { type: 'code', title: 'Base.cs', code: cs`
public class StructuralMember
{
    public virtual string Describe() => $"Mark {Mark}, {Material}";
    public string Mark { get; init; } = "";
    public string Material { get; init; } = "S355";
}

public class Beam : StructuralMember
{
    public string Profile { get; init; } = "IPE200";
    public override string Describe() => base.Describe() + $", profile {Profile}";
}

Console.WriteLine(new Beam { Mark = "B4" }.Describe());`, output: 'Mark B4, S355, profile IPE200' },
      { type: 'h2', text: 'Overriding ToString, Equals and friends' },
      { type: 'p', text: 'Every class inherits virtual methods from `object`. Overriding `ToString()` is the most common one: it controls how your object looks when printed or seen in the debugger.' },
      { type: 'code', code: cs`
public class Beam
{
    public string Mark { get; init; } = "";
    public double Length { get; init; }

    public override string ToString() => $"Beam {Mark} ({Length} m)";
}

Console.WriteLine(new Beam { Mark = "B9", Length = 7.2 });   // WriteLine calls ToString()`, output: 'Beam B9 (7.2 m)', title: 'ToString.cs' },
      { type: 'h2', text: 'Hiding with new: usually a mistake' },
      { type: 'p', text: 'If a child declares a method with the same name **without** `override`, it **hides** the parent’s method. Which one runs then depends on the **variable’s** type, not the object’s, as the diagram showed. The compiler warns you (CS0108); adding `new` only silences the warning. Prefer `virtual`/`override`.' },
      { type: 'h2', text: 'sealed override' },
      { type: 'code', code: cs`
public class Beam : StructuralMember
{
    public sealed override string Check() => "...";   // subclasses of Beam can't override again
}`, title: 'Sealed.cs' },
      { type: 'h2', text: 'Overloading vs overriding' },
      { type: 'table', head: ['', 'Overloading', 'Overriding'], rows: [
        ['What', 'Same name, different parameters', 'Same signature, new implementation in a child class'],
        ['Where', 'Usually in the same class', 'Base class (virtual) + derived class (override)'],
        ['Decided', 'At compile time, from the argument types', 'At run time, from the object’s real type'],
        ['Example', '`Add(int, int)` and `Add(double, double)`', '`Beam.Check()` replacing `StructuralMember.Check()`']
      ] },
      { type: 'quiz', question: '`StructuralMember m = new Beam(); m.Check();` with `Check` virtual in StructuralMember and overridden in Beam. Which runs?', options: ['StructuralMember.Check', 'Beam.Check', 'Both', 'Compile error'], answer: 1, explain: 'Virtual calls use the real object’s type at run time, and the object is a Beam.' },
      { type: 'quiz', question: 'Which keyword must the base method have so a child can override it?', options: ['`override`', '`new`', '`virtual` (or `abstract`)', '`static`'], answer: 2, explain: 'Only virtual or abstract members can be overridden. Static methods never can.' },
      { type: 'exercise', task: 'Create a base class `Employee` with `Name` and a virtual method `decimal MonthlyPay()` returning 30000. Derive `Manager` (pay = base pay + 15000 bonus, using `base.MonthlyPay()`) and `Intern` (pay = 12000). Put one of each in an `Employee[]` and print each name with its pay.', solution: cs`
public class Employee
{
    public string Name { get; init; } = "";
    public virtual decimal MonthlyPay() => 30000m;
}

public class Manager : Employee
{
    public override decimal MonthlyPay() => base.MonthlyPay() + 15000m;
}

public class Intern : Employee
{
    public override decimal MonthlyPay() => 12000m;
}

Employee[] staff =
{
    new Employee { Name = "Asha" },
    new Manager { Name = "Ravi" },
    new Intern { Name = "Kumar" }
};
foreach (var e in staff)
    Console.WriteLine($"{e.Name}: {e.MonthlyPay()}");`, output: 'Asha: 30000\nRavi: 45000\nKumar: 12000' }
    ],
    keyPoints: [
      'Polymorphism: one call, and each object runs its own version.',
      'Mark the base method `virtual`, the child method `override`.',
      'The real object’s type decides which override runs (at run time).',
      '`base.Method()` reuses the parent’s code; avoid hiding with `new`.'
    ]
  },

  // ------------------------------------------------------------------ abstract
  {
    slug: 'abstract-classes',
    title: 'Abstract classes',
    summary: 'Base classes that describe an idea but can’t be created themselves, with abstract members every child must implement.',
    minutes: 12,
    blocks: [
      { type: 'p', text: 'What is the area of “a shape”? There is no answer until you know which shape. Some base classes represent an **idea**, not a real thing. Mark them `abstract`: they can’t be created with `new`, and they can declare **abstract members** that every concrete child **must** implement.' },
      { type: 'code', title: 'Shapes.cs', code: cs`
public abstract class Shape
{
    public string Name { get; }
    protected Shape(string name) => Name = name;

    public abstract double Area();          // no body: children MUST provide it

    public override string ToString() => $"{Name}: {Area():F2}";   // normal method using it
}

public class Rectangle : Shape
{
    public double Width { get; }
    public double Height { get; }
    public Rectangle(double w, double h) : base("Rectangle") { Width = w; Height = h; }
    public override double Area() => Width * Height;
}

public class Circle : Shape
{
    public double Radius { get; }
    public Circle(double r) : base("Circle") => Radius = r;
    public override double Area() => Math.PI * Radius * Radius;
}

var shapes = new List<Shape> { new Rectangle(4, 3), new Circle(1.5) };
foreach (var s in shapes) Console.WriteLine(s);
// var x = new Shape("?");   // error CS0144: cannot create an abstract class`, output: 'Rectangle: 12.00\nCircle: 7.07' },
      { type: 'widget', name: 'abstract-shapes' },
      { type: 'h2', text: 'The rules' },
      { type: 'ul', items: [
        'An `abstract` class can’t be instantiated, but it can have constructors (called by children through `base(...)`), fields, properties and normal methods.',
        'An `abstract` method has no body and is implicitly virtual. Only abstract classes can contain abstract members.',
        'A non-abstract child must `override` **every** abstract member, or the code won’t compile (CS0534).',
        'You can still use the abstract type for variables, parameters and lists: `List<Shape>`.'
      ] },
      { type: 'h2', text: 'The template method pattern' },
      { type: 'p', text: 'A powerful use of abstract classes: the base class defines the **steps** of an algorithm and children fill in the details.' },
      { type: 'code', title: 'Exporter.cs', code: cs`
public abstract class ReportExporter
{
    // the fixed overall process
    public void Export(string path)
    {
        string body = BuildBody();
        File.WriteAllText(path, Header() + body + Footer());
        Console.WriteLine($"Saved {path}");
    }

    protected virtual string Header() => "Steel Report\n";    // optional to change
    protected abstract string BuildBody();                     // must be supplied
    protected virtual string Footer() => "\n-- end --";
}

public class CsvExporter : ReportExporter
{
    protected override string BuildBody() => "Mark,Length\nB1,6.0\n";
}

new CsvExporter().Export("report.csv");`, output: 'Saved report.csv' },
      { type: 'h2', text: 'virtual vs abstract' },
      { type: 'table', head: ['', '`virtual`', '`abstract`'], rows: [
        ['Has a body?', 'Yes, a default implementation', 'No'],
        ['Child must override?', 'No, optional', 'Yes, required'],
        ['Allowed in', 'Any non-sealed class', 'Abstract classes only']
      ] },
      { type: 'quiz', question: 'What happens with `new Shape()` when `Shape` is abstract?', options: ['It creates an empty shape', 'Compile error', 'Runtime exception', 'It creates a Rectangle'], answer: 1, explain: 'Abstract classes can’t be instantiated: error CS0144.' },
      { type: 'quiz', question: 'A class inherits from an abstract class but doesn’t implement one abstract method. What must be true for it to compile?', options: ['Nothing, it compiles anyway', 'The class must itself be marked abstract', 'The method must be static', 'It must be sealed'], answer: 1, explain: 'Only an abstract class may leave abstract members unimplemented.' },
      { type: 'exercise', task: 'Create an abstract class `Vehicle` with a `Name` and an abstract method `double CostPerKm()`, plus a normal method `double TripCost(double km)` that uses it. Implement `Truck` (₹28 / km) and `Car` (₹9 / km), and print the cost of a 120 km trip for each.', solution: cs`
public abstract class Vehicle
{
    public string Name { get; }
    protected Vehicle(string name) => Name = name;
    public abstract double CostPerKm();
    public double TripCost(double km) => km * CostPerKm();
}

public class Truck : Vehicle
{
    public Truck() : base("Truck") { }
    public override double CostPerKm() => 28;
}

public class Car : Vehicle
{
    public Car() : base("Car") { }
    public override double CostPerKm() => 9;
}

foreach (Vehicle v in new Vehicle[] { new Truck(), new Car() })
    Console.WriteLine($"{v.Name}: Rs {v.TripCost(120)}");`, output: 'Truck: Rs 3360\nCar: Rs 1080' }
    ],
    keyPoints: [
      'An abstract class is an incomplete base class; you can’t `new` it.',
      'Abstract members have no body and must be overridden by concrete children.',
      'Abstract classes can still hold shared fields, constructors and methods.',
      'Use them when related classes share code but each must fill in some parts.'
    ]
  },

  // ------------------------------------------------------------------ interfaces
  {
    slug: 'interfaces',
    title: 'Interfaces',
    summary: 'Contracts that any class can sign: define interfaces, implement several at once, program against them, and choose between interfaces and abstract classes.',
    minutes: 16,
    blocks: [
      { type: 'p', text: 'A Beam, a Bolt and a Drawing have nothing in common as **things**, so they shouldn’t share a base class. Yet all three can be **exported to IFC**. An **interface** describes a capability (“can be exported”) that any class can promise to provide, regardless of its family.' },
      { type: 'code', title: 'IExportable.cs', code: cs`
public interface IExportable          // by convention, names start with I
{
    string ToIfc();                    // a promise: no body, no access modifier needed
}

public class Bolt : IExportable        // "Bolt implements IExportable"
{
    public string Grade { get; init; } = "8.8";
    public string ToIfc() => $"IFCMECHANICALFASTENER('{Grade}')";
}

public class Beam : StructuralMember, IExportable   // base class first, then interfaces
{
    public string ToIfc() => $"IFCBEAM('{Mark}')";
}` },
      { type: 'widget', name: 'interface-plug' },
      { type: 'h2', text: 'Programming to the interface' },
      { type: 'code', title: 'Export.cs', code: cs`
static void ExportAll(IEnumerable<IExportable> items)
{
    foreach (IExportable item in items)
        Console.WriteLine(item.ToIfc());
}

var model = new List<IExportable>
{
    new Beam { Mark = "B1" },
    new Bolt { Grade = "10.9" }
};
ExportAll(model);`, output: 'IFCBEAM(\'B1\')\nIFCMECHANICALFASTENER(\'10.9\')' },
      { type: 'p', text: '`ExportAll` doesn’t know or care about beams or bolts. It only needs “something that can `ToIfc()`”. New exportable classes will work with it without changing a line. This is how large applications stay flexible.' },
      { type: 'h2', text: 'Several interfaces at once' },
      { type: 'code', code: cs`
public interface IWeighable { double WeightKg { get; } }
public interface IPrintable { void Print(); }

public class Beam : StructuralMember, IExportable, IWeighable, IPrintable
{
    public double WeightKg => Length * 42.2;
    public string ToIfc() => $"IFCBEAM('{Mark}')";
    public void Print() => Console.WriteLine($"{Mark}: {WeightKg:F1} kg");
}`, title: 'Many.cs' },
      { type: 'p', text: 'A class can inherit from only **one** class, but can implement **any number** of interfaces. This is how C# avoids the problems of multiple inheritance while still allowing an object to play many roles.' },
      { type: 'h2', text: 'Interfaces you already use' },
      { type: 'table', head: ['Interface', 'Capability', 'Enables'], rows: [
        ['`IEnumerable<T>`', 'can be iterated', '`foreach`, LINQ'],
        ['`IComparable<T>`', 'can be ordered', '`List.Sort()`, `Array.Sort()`'],
        ['`IDisposable`', 'holds resources to release', '`using` statements'],
        ['`IEquatable<T>`', 'typed equality', 'fast `Equals`, dictionary keys']
      ] },
      { type: 'code', title: 'Sort.cs', code: cs`
public class Beam : IComparable<Beam>
{
    public string Mark { get; init; } = "";
    public double Length { get; init; }
    public int CompareTo(Beam? other) => Length.CompareTo(other?.Length ?? 0);
}

var beams = new List<Beam> { new() { Mark = "B1", Length = 7 }, new() { Mark = "B2", Length = 4 } };
beams.Sort();                                   // uses CompareTo
Console.WriteLine(string.Join(", ", beams.Select(b => b.Mark)));`, output: 'B2, B1' },
      { type: 'h2', text: 'Interface or abstract class?' },
      { type: 'table', head: ['', 'Interface', 'Abstract class'], rows: [
        ['Describes', 'a capability (“can do”)', 'a family (“is a”)'],
        ['A class can have', 'many', 'one'],
        ['Fields / state', 'no', 'yes'],
        ['Constructors', 'no', 'yes'],
        ['Shared code', 'limited (default methods, C# 8+)', 'yes, normal methods'],
        ['Use when', 'unrelated classes share a behaviour; for testability and plug-ins', 'closely related classes share code and data']
      ] },
      { type: 'note', kind: 'tip', text: 'Many teams start with an interface. It keeps classes loosely connected, and makes it easy to swap real implementations for fake ones in unit tests (covered in the Master module).' },
      { type: 'note', kind: 'info', text: 'Since C# 8, interfaces can contain **default implementations** of methods. Use this sparingly, mostly to add a method to an existing interface without breaking every class that implements it.' },
      { type: 'quiz', question: 'How many interfaces can a C# class implement?', options: ['None', 'Exactly one', 'As many as it needs', 'Two at most'], answer: 2, explain: 'One base class, but any number of interfaces.' },
      { type: 'quiz', question: 'What does `IExportable x = new Bolt();` require?', options: ['Bolt inherits from IExportable’s base class', 'Bolt implements IExportable', 'Bolt is abstract', 'Nothing'], answer: 1, explain: 'A variable of an interface type can hold any object whose class implements that interface.' },
      { type: 'exercise', task: 'Define an interface `IDiscountable` with a method `decimal ApplyDiscount(decimal price)`. Implement it in `StudentDiscount` (20% off) and `FestivalDiscount` (₹500 off, never below 0). Write a method that takes an `IDiscountable` and prints the final price of ₹2000.', solution: cs`
public interface IDiscountable
{
    decimal ApplyDiscount(decimal price);
}

public class StudentDiscount : IDiscountable
{
    public decimal ApplyDiscount(decimal price) => price * 0.8m;
}

public class FestivalDiscount : IDiscountable
{
    public decimal ApplyDiscount(decimal price) => Math.Max(0, price - 500);
}

static void Show(IDiscountable d) =>
    Console.WriteLine($"{d.GetType().Name}: {d.ApplyDiscount(2000m)}");

Show(new StudentDiscount());
Show(new FestivalDiscount());`, output: 'StudentDiscount: 1600.0\nFestivalDiscount: 1500' }
    ],
    keyPoints: [
      'An interface is a contract of members a class promises to implement.',
      'One base class, many interfaces: `class Beam : Member, IExportable, IPrintable`.',
      'Write methods that accept interfaces so any implementing class works.',
      'Interface = capability across families; abstract class = shared code within a family.'
    ]
  },

  // ------------------------------------------------------------------ structs and records
  {
    slug: 'structs-and-records',
    title: 'Structs, records and value vs reference types',
    summary: 'The two kinds of types in C#, when to write a struct, and how records give you value equality and immutability for free.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'Every C# type is either a **value type** or a **reference type**. You have met both already: `int` and `double` are value types; `string`, arrays and classes are reference types. This lesson shows how to create your own value types (**structs**) and the modern **records**.' },
      { type: 'widget', name: 'value-ref' },
      { type: 'h2', text: 'Value types vs reference types' },
      { type: 'table', head: ['', 'Value type', 'Reference type'], rows: [
        ['Examples', '`int`, `double`, `bool`, `char`, `DateTime`, `enum`, your `struct`s', '`string`, arrays, `List<T>`, your `class`es and `record`s'],
        ['Variable holds', 'the data itself', 'a reference to the data on the heap'],
        ['Assignment copies', 'all the data', 'only the reference'],
        ['Can be null', 'no (unless `int?`)', 'yes'],
        ['Default value', '0 / false / all fields zero', '`null`']
      ] },
      { type: 'h2', text: 'Structs' },
      { type: 'code', title: 'Point3.cs', code: cs`
public struct Point3
{
    public double X { get; }
    public double Y { get; }
    public double Z { get; }

    public Point3(double x, double y, double z) { X = x; Y = y; Z = z; }

    public double DistanceTo(Point3 o) =>
        Math.Sqrt((X - o.X) * (X - o.X) + (Y - o.Y) * (Y - o.Y) + (Z - o.Z) * (Z - o.Z));

    public override string ToString() => $"({X}, {Y}, {Z})";
}

var a = new Point3(0, 0, 0);
var b = new Point3(3, 4, 12);
Console.WriteLine($"{a} → {b}: {a.DistanceTo(b)}");`, output: '(0, 0, 0) → (3, 4, 12): 13' },
      { type: 'p', text: 'Use a struct for **small, simple values** that are naturally copied: points, vectors, colours, coordinates, money amounts. 3D and BIM code uses structs everywhere for points and vectors, because millions of them can be stored in arrays without creating millions of heap objects.' },
      { type: 'ul', items: [
        'Keep structs small (roughly 16 bytes or less is the usual guideline) and preferably **immutable** (`readonly struct`).',
        'Structs can’t inherit from other structs or classes, but they can implement interfaces.',
        'Use a class when the data is large, needs identity (“this exact beam”), or must be shared and changed in one place.'
      ] },
      { type: 'note', kind: 'warn', text: 'Changing a mutable struct inside a list doesn’t work as you might expect: `points[0].X = 5;` is an error (CS1612), because `points[0]` returns a **copy**. This is one reason to make structs immutable.' },
      { type: 'h2', text: 'Records: data classes in one line' },
      { type: 'code', title: 'Records.cs', code: cs`
public record Section(string Name, double DepthMm, double KgPerMetre);

var s1 = new Section("IPE300", 300, 42.2);
var s2 = new Section("IPE300", 300, 42.2);

Console.WriteLine(s1);             // readable ToString for free
Console.WriteLine(s1 == s2);       // value equality: same data → equal
var heavier = s1 with { KgPerMetre = 49.1 };   // copy with one change
Console.WriteLine(heavier.KgPerMetre);`, output: 'Section { Name = IPE300, DepthMm = 300, KgPerMetre = 42.2 }\nTrue\n49.1' },
      { type: 'p', text: 'That single line generates a constructor, read-only (`init`) properties, `Equals`/`==` based on the values, `GetHashCode`, a nice `ToString` and deconstruction. Records are ideal for data that is passed around and compared: DTOs, settings, messages, results.' },
      { type: 'h2', text: 'Choosing' },
      { type: 'table', head: ['Write a…', 'When'], rows: [
        ['`class`', 'objects with identity and behaviour that change over time (a Project, a Viewport, a BankAccount)'],
        ['`record`', 'immutable data compared by value (a Section from a catalogue, an API response, a settings snapshot)'],
        ['`struct` / `readonly record struct`', 'tiny values used in large numbers (Point3, Vector3, Colour)']
      ] },
      { type: 'quiz', question: 'With `struct P { public int X; }`, after `P a = new P(); a.X = 1; P b = a; b.X = 2;`, what is `a.X`?', options: ['1', '2', '0', 'Compile error'], answer: 0, explain: 'Assigning a struct copies the whole value; changing `b` doesn’t affect `a`.' },
      { type: 'quiz', question: 'Two separate `record` objects contain the same values. What does `==` return?', options: ['False, they are different objects', 'True, records compare values', 'It doesn’t compile'], answer: 1, explain: 'Records generate value-based equality.' },
      { type: 'exercise', task: 'Create a `record Money(decimal Amount, string Currency)` and a method `Money Add(Money a, Money b)` that throws `InvalidOperationException` if the currencies differ. Add 1500 INR and 750 INR, print the result, and check equality with a new `Money(2250, "INR")`.', solution: cs`
public record Money(decimal Amount, string Currency);

static Money Add(Money a, Money b)
{
    if (a.Currency != b.Currency)
        throw new InvalidOperationException("Currencies differ.");
    return a with { Amount = a.Amount + b.Amount };
}

var total = Add(new Money(1500, "INR"), new Money(750, "INR"));
Console.WriteLine(total);
Console.WriteLine(total == new Money(2250, "INR"));`, output: 'Money { Amount = 2250, Currency = INR }\nTrue' }
    ],
    keyPoints: [
      'Value types hold their data and are copied on assignment; reference types share one object.',
      'Use small, immutable structs for simple values like points and vectors.',
      'Records give value equality, `ToString`, `with` copies and immutability for free.',
      'class = identity and behaviour; record = data; struct = tiny values.'
    ]
  },

  // ------------------------------------------------------------------ enums
  {
    slug: 'enums',
    title: 'Enums',
    summary: 'Replace magic numbers and strings with named constants: declaring enums, converting them, switching on them and combining flags.',
    minutes: 11,
    blocks: [
      { type: 'p', text: 'Code like `if (status == 3)` or `if (status == "aproved")` is fragile. What was 3 again? And that typo will never be caught. An **enum** (enumeration) is a type with a fixed set of **named values**, checked by the compiler.' },
      { type: 'code', title: 'Status.cs', code: cs`
public enum MemberStatus
{
    Draft,        // 0
    InReview,     // 1
    Approved,     // 2
    Fabricated,   // 3
    Erected       // 4
}

MemberStatus s = MemberStatus.Approved;
if (s == MemberStatus.Approved)
    Console.WriteLine("Send to the workshop");

Console.WriteLine(s);          // the name
Console.WriteLine((int)s);     // the number underneath`, output: 'Send to the workshop\nApproved\n2' },
      { type: 'widget', name: 'enum-flags' },
      { type: 'h2', text: 'Choosing the numbers' },
      { type: 'code', code: cs`
public enum HttpStatus
{
    Ok = 200,
    NotFound = 404,
    ServerError = 500
}`, title: 'Values.cs' },
      { type: 'p', text: 'By default values start at 0 and go up by one. You can assign specific numbers, which matters when values are saved in a database or file: never reorder or renumber an enum that has already been stored.' },
      { type: 'h2', text: 'Converting' },
      { type: 'code', title: 'Convert.cs', code: cs`
MemberStatus a = (MemberStatus)3;                         // int → enum
string name = MemberStatus.InReview.ToString();           // enum → "InReview"

if (Enum.TryParse("Erected", out MemberStatus parsed))    // string → enum, safely
    Console.WriteLine(parsed);

foreach (MemberStatus v in Enum.GetValues<MemberStatus>())  // list all values
    Console.Write(v + " ");`, output: 'Erected\nDraft InReview Approved Fabricated Erected' },
      { type: 'note', kind: 'warn', text: 'Casting doesn’t validate: `(MemberStatus)99` compiles and runs, giving a value with no name. Check with `Enum.IsDefined(typeof(MemberStatus), value)` when the number comes from outside.' },
      { type: 'h2', text: 'Enums and switch' },
      { type: 'code', code: cs`
string Colour(MemberStatus s) => s switch
{
    MemberStatus.Draft => "grey",
    MemberStatus.InReview => "orange",
    MemberStatus.Approved => "green",
    MemberStatus.Fabricated or MemberStatus.Erected => "blue",
    _ => "unknown"
};
Console.WriteLine(Colour(MemberStatus.InReview));`, output: 'orange', title: 'Switch.cs' },
      { type: 'h2', text: '[Flags]: combining options' },
      { type: 'p', text: 'When several options can be on at the same time, give each value its own **bit** (1, 2, 4, 8…) and add the `[Flags]` attribute. Combine with `|`, test with `HasFlag` or `&`.' },
      { type: 'code', title: 'Flags.cs', code: cs`
[Flags]
public enum Permission
{
    None = 0,
    Read = 1,
    Write = 2,
    Export = 4,
    Delete = 8,
    Editor = Read | Write | Export     // a named combination
}

Permission p = Permission.Read | Permission.Export;
Console.WriteLine(p);                              // Read, Export
Console.WriteLine(p.HasFlag(Permission.Write));    // False
p |= Permission.Write;                             // add
p &= ~Permission.Export;                           // remove
Console.WriteLine(p);`, output: 'Read, Export\nFalse\nRead, Write' },
      { type: 'quiz', question: 'In `enum Size { Small, Medium, Large }`, what is `(int)Size.Large`?', options: ['1', '2', '3', 'It has no number'], answer: 1, explain: 'Values start at 0: Small = 0, Medium = 1, Large = 2.' },
      { type: 'quiz', question: 'Why do [Flags] values use 1, 2, 4, 8 instead of 1, 2, 3, 4?', options: ['Tradition only', 'Each value needs its own bit so combinations don’t overlap', 'C# requires powers of two for all enums', 'To save memory'], answer: 1, explain: 'With 1, 2, 3, the value 3 would be ambiguous: Read|Write or the third option?' },
      { type: 'exercise', task: 'Create an enum `TrafficLight { Red, Yellow, Green }` and a method that returns the next light (Red → Green → Yellow → Red) using a switch expression. Starting from Red, print the next 4 lights.', solution: cs`
public enum TrafficLight { Red, Yellow, Green }

static TrafficLight Next(TrafficLight t) => t switch
{
    TrafficLight.Red => TrafficLight.Green,
    TrafficLight.Green => TrafficLight.Yellow,
    TrafficLight.Yellow => TrafficLight.Red,
    _ => throw new ArgumentOutOfRangeException(nameof(t))
};

var light = TrafficLight.Red;
for (int i = 0; i < 4; i++)
{
    light = Next(light);
    Console.Write(light + " ");
}`, output: 'Green Yellow Red Green' }
    ],
    keyPoints: [
      'An enum is a type with a fixed set of named integer constants.',
      'Values start at 0 unless you assign them; don’t renumber stored enums.',
      'Convert with casts, `ToString()`, `Enum.TryParse` and `Enum.GetValues`.',
      '`[Flags]` enums use powers of two and combine with `|`.'
    ]
  }
];
