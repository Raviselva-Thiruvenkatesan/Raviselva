import { Lesson } from '../learn.types';
import { cs } from './cs';

export const OOP_BASICS: Lesson[] = [
  // ------------------------------------------------------------------ classes and objects
  {
    slug: 'classes-and-objects',
    title: 'Classes and objects',
    summary: 'Model real things in code: define a class, create objects with new, give them data and behaviour, and understand references.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'So far our programs used loose variables: `string profile`, `double length`. Real software deals with **things**: beams, columns, customers, invoices. Each thing has **data** (what it is) and **behaviour** (what it can do). **Object-oriented programming (OOP)** keeps the two together.' },
      { type: 'table', head: ['Word', 'Meaning', 'Real-world example'], rows: [
        ['**Class**', 'A blueprint: describes what data and behaviour things of this kind have', 'The drawing and spec sheet for a beam type'],
        ['**Object**', 'One actual thing built from the class (an **instance**)', 'Beam B12 on grid line 3, level 2'],
        ['**Field**', 'A variable that belongs to an object', 'its length, its profile'],
        ['**Method**', 'A function that belongs to the class', 'calculate its weight']
      ] },
      { type: 'h2', text: 'Defining a class' },
      { type: 'code', title: 'Beam.cs', code: cs`
public class Beam
{
    // fields: the data each Beam object carries
    public string Profile = "IPE200";
    public double Length;            // metres
    public double KgPerMetre = 22.4;

    // method: behaviour that uses the object's own data
    public double Weight()
    {
        return Length * KgPerMetre;
    }

    public void Print()
    {
        Console.WriteLine($"{Profile}, {Length} m, {Weight():F1} kg");
    }
}` },
      { type: 'h2', text: 'Creating and using objects' },
      { type: 'code', title: 'Program.cs', code: cs`
Beam b1 = new Beam();       // build an object from the blueprint
b1.Length = 6;              // set its fields with the dot operator
b1.Print();

Beam b2 = new Beam();       // a second, independent object
b2.Profile = "IPE300";
b2.KgPerMetre = 42.2;
b2.Length = 4.5;
b2.Print();`, output: 'IPE200, 6 m, 134.4 kg\nIPE300, 4.5 m, 189.9 kg' },
      { type: 'p', text: 'Each object has its **own copy** of every field. Changing `b2.Length` does nothing to `b1`. Inside a method, a field name like `Length` means “the Length of the object this method was called on”.' },
      { type: 'h2', text: 'Objects live on the heap; variables hold references' },
      { type: 'p', text: 'This is the most important idea in this lesson. `new` builds the object in an area of memory called the **heap** and returns its address. The variable `b1` stores only that **reference**. Try it:' },
      { type: 'widget', name: 'class-objects' },
      { type: 'code', title: 'References.cs', code: cs`
Beam a = new Beam { Length = 6 };
Beam b = a;            // copies the reference: still ONE object
b.Length = 9;
Console.WriteLine(a.Length);   // 9 — a and b point to the same Beam

Beam c = null;         // c points to nothing
// c.Print();          // NullReferenceException at run time`, output: '9' },
      { type: 'note', kind: 'warn', text: 'Calling a member on a variable that is `null` throws `NullReferenceException`, the most common runtime error in C#. Always make sure an object was created before using it.' },
      { type: 'note', kind: 'info', text: 'You never delete objects yourself. When no variable references an object any more, the **garbage collector** frees its memory automatically.' },
      { type: 'h2', text: 'The this keyword' },
      { type: 'p', text: 'Inside a method, `this` means “the current object”. You need it when a parameter has the same name as a field:' },
      { type: 'code', code: cs`
public void SetLength(double length)
{
    this.Length = length;   // field = parameter
}`, title: 'This.cs' },
      { type: 'h2', text: 'Organising classes' },
      { type: 'ul', items: [
        'Put each class in its own file with the same name: `Beam.cs`.',
        'Class names are **PascalCase** nouns: `Beam`, `SteelGrade`, `InvoiceLine`.',
        'A class should represent **one** idea. If it does many unrelated jobs, split it.'
      ] },
      { type: 'quiz', question: 'After `Beam x = new Beam(); Beam y = x; y.Length = 3;`, how many Beam objects exist?', options: ['0', '1', '2', '3'], answer: 1, explain: '`new` ran once. `y = x` copies the reference, so both variables point to the same single object.' },
      { type: 'quiz', question: 'What is the relationship between a class and an object?', options: ['They are the same thing', 'A class is a blueprint; an object is an instance built from it', 'An object is a blueprint; a class is built from it', 'A class is a kind of method'], answer: 1, explain: 'You write a class once and can create as many objects from it as you need.' },
      { type: 'exercise', task: 'Create a class `Rectangle` with fields `Width` and `Height` and methods `Area()` and `Perimeter()`. Create two rectangles (3×4 and 5×2) and print both areas and perimeters.', solution: cs`
public class Rectangle
{
    public double Width;
    public double Height;

    public double Area() => Width * Height;
    public double Perimeter() => 2 * (Width + Height);
}

var r1 = new Rectangle { Width = 3, Height = 4 };
var r2 = new Rectangle { Width = 5, Height = 2 };
Console.WriteLine($"r1: area {r1.Area()}, perimeter {r1.Perimeter()}");
Console.WriteLine($"r2: area {r2.Area()}, perimeter {r2.Perimeter()}");`, output: 'r1: area 12, perimeter 14\nr2: area 10, perimeter 14' }
    ],
    keyPoints: [
      'A class is a blueprint of data (fields) and behaviour (methods).',
      '`new` creates an object on the heap and returns a reference to it.',
      'Assigning an object variable copies the reference, not the object.',
      'Using a `null` reference throws `NullReferenceException`.'
    ]
  },

  // ------------------------------------------------------------------ constructors
  {
    slug: 'constructors',
    title: 'Constructors and object initialisers',
    summary: 'Make sure every object starts in a valid state: constructors, overloads, chaining with this(...), initialisers and required members.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'In the last lesson we created a `Beam` and then set its fields one by one. Forget one line and you have a beam with length 0. A **constructor** is a special method that runs automatically when an object is created, so it can set everything up correctly from the start.' },
      { type: 'h2', text: 'Writing a constructor' },
      { type: 'code', title: 'Beam.cs', code: cs`
public class Beam
{
    public string Profile;
    public double Length;

    // constructor: same name as the class, no return type
    public Beam(string profile, double length)
    {
        Profile = profile;
        Length = length;
    }
}

Beam b = new Beam("IPE300", 6.0);      // arguments go to the constructor
Console.WriteLine($"{b.Profile} {b.Length}");`, output: 'IPE300 6' },
      { type: 'ul', items: [
        'Its name is exactly the class name and it has **no return type** (not even `void`).',
        'It runs once, when `new` is used.',
        'If you write no constructor, C# gives you an invisible **parameterless** one. As soon as you write any constructor, that free one disappears.'
      ] },
      { type: 'note', kind: 'warn', text: 'After adding `Beam(string profile, double length)`, the call `new Beam()` gives error CS7036 (no argument given). Add a parameterless constructor too if you still need it.' },
      { type: 'h2', text: 'Overloading and chaining' },
      { type: 'p', text: 'A class can have several constructors with different parameters. To avoid repeating setup code, one constructor can call another with `: this(...)`. Step through how `new` runs them:' },
      { type: 'widget', name: 'constructor-flow' },
      { type: 'p', text: 'The order to remember: memory is allocated with default values → **field initializers** run → the base class constructor runs → constructor **bodies** run, the innermost (the one doing the real work) first.' },
      { type: 'h2', text: 'Validating in the constructor' },
      { type: 'code', code: cs`
public Beam(string profile, double length)
{
    if (length <= 0)
        throw new ArgumentOutOfRangeException(nameof(length), "Length must be positive.");
    Profile = profile;
    Length = length;
}`, title: 'Validate.cs' },
      { type: 'p', text: 'If a constructor throws, no object is created. So it is impossible to end up with an invalid beam. This is a big advantage over setting fields afterwards.' },
      { type: 'h2', text: 'Object initialisers' },
      { type: 'p', text: 'For fields or properties that are optional, an **object initialiser** sets them right after the constructor, in one expression:' },
      { type: 'code', code: cs`
var b = new Beam("IPE200", 5.0) { Mark = "B12", Level = 2 };

// with a parameterless constructor you can skip the brackets
var p = new Point { X = 3, Y = 4 };`, title: 'Initialiser.cs' },
      { type: 'h2', text: 'Primary constructors (C# 12)' },
      { type: 'code', code: cs`
public class Beam(string profile, double length)
{
    public string Profile { get; } = profile;
    public double Length { get; } = length;
}

var b = new Beam("HEA200", 3.2);`, title: 'Primary.cs' },
      { type: 'p', text: 'The parameters are written right after the class name and can be used anywhere in the class. This saves a lot of boilerplate for simple classes.' },
      { type: 'h2', text: 'required members (C# 11)' },
      { type: 'code', code: cs`
public class Column
{
    public required string Mark { get; init; }
    public double Height { get; init; } = 3.0;
}

var c = new Column { Mark = "C1" };   // OK
// var d = new Column();              // error CS9035: Mark must be set`, title: 'Required.cs' },
      { type: 'quiz', question: 'What is the return type of a constructor?', options: ['`void`', 'The class type', 'It has none', '`object`'], answer: 2, explain: 'Constructors have no return type at all; `new` gives you the reference.' },
      { type: 'quiz', question: 'What does `: this(6.0)` after a constructor’s parameter list do?', options: ['Calls the base class', 'Runs another constructor of the same class first, passing 6.0', 'Sets this to 6.0', 'Nothing'], answer: 1, explain: 'It chains to the constructor that matches `(double)`, so shared setup code lives in one place.' },
      { type: 'exercise', task: 'Create a class `BankAccount` with `Owner` (string) and `Balance` (decimal). Add a constructor that requires the owner and an optional opening balance (default 0) that must not be negative (throw `ArgumentException` otherwise). Create two accounts and print them.', solution: cs`
public class BankAccount
{
    public string Owner;
    public decimal Balance;

    public BankAccount(string owner, decimal openingBalance = 0)
    {
        if (openingBalance < 0)
            throw new ArgumentException("Opening balance cannot be negative.");
        Owner = owner;
        Balance = openingBalance;
    }
}

var a = new BankAccount("Ravi");
var b = new BankAccount("Selva", 5000m);
Console.WriteLine($"{a.Owner}: {a.Balance}");
Console.WriteLine($"{b.Owner}: {b.Balance}");`, output: 'Ravi: 0\nSelva: 5000' }
    ],
    keyPoints: [
      'A constructor has the class’s name, no return type, and runs on `new`.',
      'Writing any constructor removes the default parameterless one.',
      'Chain overloads with `: this(...)` to avoid duplicate setup code.',
      'Validate in the constructor so invalid objects can never exist.'
    ]
  },

  // ------------------------------------------------------------------ properties
  {
    slug: 'properties',
    title: 'Fields and properties',
    summary: 'Protect an object’s data with properties: get and set accessors, validation, auto-properties, read-only, computed and init-only properties.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'With public fields, any code anywhere can write `beam.Length = -50;` and your object is broken. **Properties** look like fields from the outside, but run code when they are read (`get`) or written (`set`), so the class stays in control of its data.' },
      { type: 'widget', name: 'property-guard' },
      { type: 'h2', text: 'A full property with a backing field' },
      { type: 'code', title: 'Beam.cs', code: cs`
public class Beam
{
    private double _length;            // private: only this class can touch it

    public double Length
    {
        get { return _length; }        // runs when someone reads beam.Length
        set                            // runs on beam.Length = x
        {
            if (value <= 0)            // 'value' is the new value being assigned
                throw new ArgumentOutOfRangeException(nameof(value));
            _length = value;
        }
    }
}

var b = new Beam();
b.Length = 7.5;                        // calls set with value = 7.5
Console.WriteLine(b.Length);           // calls get`, output: '7.5' },
      { type: 'note', kind: 'info', text: 'Naming convention: private fields are `_camelCase` (`_length`); properties are `PascalCase` (`Length`).' },
      { type: 'h2', text: 'Auto-properties' },
      { type: 'p', text: 'When you don’t need any logic, let the compiler create the hidden backing field for you:' },
      { type: 'code', code: cs`
public class Column
{
    public string Mark { get; set; } = "C1";     // default value
    public double Height { get; set; }
    public string Grade { get; private set; } = "S355";   // anyone reads, only the class writes
}`, title: 'Auto.cs' },
      { type: 'p', text: 'Even without logic, prefer auto-properties to public fields: you can add validation later without changing any code that uses the class.' },
      { type: 'h2', text: 'Read-only and computed properties' },
      { type: 'code', title: 'Computed.cs', code: cs`
public class Rectangle
{
    public double Width { get; }        // get-only: set in the constructor, then fixed
    public double Height { get; }

    public Rectangle(double w, double h) { Width = w; Height = h; }

    public double Area => Width * Height;        // computed on every read
    public bool IsSquare => Width == Height;
}

var r = new Rectangle(3, 3);
Console.WriteLine($"{r.Area} {r.IsSquare}");`, output: '9 True' },
      { type: 'h2', text: 'init-only setters' },
      { type: 'code', code: cs`
public class Point
{
    public double X { get; init; }
    public double Y { get; init; }
}

var p = new Point { X = 2, Y = 5 };   // allowed: during creation
// p.X = 10;                          // error CS8852: init-only`, title: 'Init.cs' },
      { type: 'p', text: '`init` lets callers set the value with an object initialiser, but never change it afterwards. Objects that can’t change (**immutable** objects) are easier to reason about and safe to share.' },
      { type: 'h2', text: 'Which one to use?' },
      { type: 'table', head: ['Need', 'Write'], rows: [
        ['Simple data, may change', '`public T Name { get; set; }`'],
        ['Set once at creation', '`public T Name { get; init; }` or `{ get; }` + constructor'],
        ['Readable by all, changed only inside', '`public T Name { get; private set; }`'],
        ['Rules on the value', 'full property with a private backing field'],
        ['Derived from other data', '`public T Name => expression;`'],
        ['Internal state', '`private` field']
      ] },
      { type: 'quiz', question: 'Inside a `set` accessor, what is `value`?', options: ['The current value of the field', 'The new value being assigned', 'A keyword for null', 'The return value'], answer: 1, explain: '`value` is the implicit parameter holding whatever the caller is assigning.' },
      { type: 'quiz', question: 'Which property can be read by anyone but only changed inside its own class?', options: ['`{ get; set; }`', '`{ get; private set; }`', '`{ private get; set; }`', '`{ set; }`'], answer: 1, explain: 'The `private` on the setter limits writing to the class itself.' },
      { type: 'exercise', task: 'Create a class `Temperature` with a property `Celsius` that rejects values below -273.15 (absolute zero), and a computed read-only property `Fahrenheit` (C × 9 / 5 + 32). Set 25 °C and print both.', solution: cs`
public class Temperature
{
    private double _celsius;

    public double Celsius
    {
        get => _celsius;
        set
        {
            if (value < -273.15)
                throw new ArgumentOutOfRangeException(nameof(value), "Below absolute zero.");
            _celsius = value;
        }
    }

    public double Fahrenheit => Celsius * 9 / 5 + 32;
}

var t = new Temperature { Celsius = 25 };
Console.WriteLine($"{t.Celsius} °C = {t.Fahrenheit} °F");`, output: '25 °C = 77 °F' }
    ],
    keyPoints: [
      'Properties look like fields but run `get`/`set` code.',
      'Keep fields `private`; expose data through properties.',
      'Auto-properties: `{ get; set; }`; restrict with `private set` or `init`.',
      'Computed properties (`=> expression`) are always up to date.'
    ]
  },

  // ------------------------------------------------------------------ access modifiers
  {
    slug: 'access-modifiers',
    title: 'Access modifiers and encapsulation',
    summary: 'Decide who can use each part of your class with public, private, protected and internal, and design classes that are hard to misuse.',
    minutes: 12,
    blocks: [
      { type: 'p', text: '**Encapsulation** means hiding the inner workings of a class and exposing only a small, safe set of members. Think of a car: you use the steering wheel and pedals (the public part); the engine internals are hidden. You can drive without knowing them, and you can’t accidentally break them.' },
      { type: 'p', text: '**Access modifiers** are the keywords that control who can see each class and member.' },
      { type: 'widget', name: 'access-matrix' },
      { type: 'h2', text: 'The ones you will use 95% of the time' },
      { type: 'table', head: ['Modifier', 'Accessible from', 'Typical use'], rows: [
        ['`public`', 'everywhere', 'the methods and properties other code is meant to use'],
        ['`private`', 'only the same class', 'fields and helper methods'],
        ['`protected`', 'the class and classes that inherit from it', 'members subclasses need to customise behaviour'],
        ['`internal`', 'anywhere in the same project (assembly)', 'classes shared inside a library but hidden from users of it']
      ] },
      { type: 'note', kind: 'info', text: 'Defaults: class **members** are `private` if you write nothing. Top-level **classes** are `internal`. Always write the modifier explicitly; it makes your intent clear.' },
      { type: 'h2', text: 'Encapsulation in practice' },
      { type: 'code', title: 'BankAccount.cs', code: cs`
public class BankAccount
{
    private decimal _balance;                       // hidden state
    private readonly List<string> _history = new();

    public string Owner { get; }
    public decimal Balance => _balance;             // read-only view

    public BankAccount(string owner) => Owner = owner;

    public void Deposit(decimal amount)
    {
        if (amount <= 0) throw new ArgumentException("Amount must be positive.");
        _balance += amount;
        Log($"Deposit {amount}");
    }

    public bool TryWithdraw(decimal amount)
    {
        if (amount <= 0 || amount > _balance) return false;
        _balance -= amount;
        Log($"Withdraw {amount}");
        return true;
    }

    private void Log(string entry) => _history.Add($"{DateTime.Now:HH:mm} {entry}");
}

var acc = new BankAccount("Ravi");
acc.Deposit(1000);
Console.WriteLine(acc.TryWithdraw(5000));   // False: rule enforced
Console.WriteLine(acc.Balance);
// acc._balance = 1_000_000;                // error CS0122: inaccessible`, output: 'False\n1000' },
      { type: 'p', text: 'There is no way for outside code to put the account into a wrong state: the balance can only change through `Deposit` and `TryWithdraw`, which apply the rules. If the rules change later, you edit one class, not every place that uses it.' },
      { type: 'h2', text: 'readonly fields' },
      { type: 'p', text: 'A `readonly` field can be assigned only in its declaration or in a constructor. In the example, `_history` always refers to the same list (though the list’s contents can still change).' },
      { type: 'h2', text: 'Guidelines' },
      { type: 'ul', items: [
        'Start with everything `private`; make something more visible only when another class truly needs it.',
        'Never make fields `public`. Use properties.',
        'Expose **operations** (`Deposit`) rather than raw setters (`SetBalance`).',
        'A small public surface means fewer ways to misuse the class and more freedom to change its internals.'
      ] },
      { type: 'quiz', question: 'What is the access level of a class member declared without a modifier?', options: ['public', 'internal', 'protected', 'private'], answer: 3, explain: 'Members default to `private`, the safest choice.' },
      { type: 'quiz', question: 'A `protected` member can be used by…', options: ['any class', 'only the same class', 'the same class and classes that inherit from it', 'only classes in the same project'], answer: 2, explain: '`protected` opens a member to derived classes, in any project.' },
      { type: 'exercise', task: 'Write a class `Counter` with a private count, a public read-only property `Value`, and public methods `Increment()`, `Decrement()` (never below 0) and `Reset()`. Show that `Decrement` at 0 keeps the value at 0.', solution: cs`
public class Counter
{
    private int _count;
    public int Value => _count;

    public void Increment() => _count++;
    public void Decrement() { if (_count > 0) _count--; }
    public void Reset() => _count = 0;
}

var c = new Counter();
c.Increment(); c.Increment(); c.Decrement(); c.Decrement(); c.Decrement();
Console.WriteLine(c.Value);`, output: '0' }
    ],
    keyPoints: [
      'Encapsulation: hide state, expose a small set of safe operations.',
      '`private` (class only), `protected` (+ subclasses), `internal` (same project), `public` (all).',
      'Members are private by default; classes are internal by default.',
      'Keep fields private and change state only through validated methods.'
    ]
  },

  // ------------------------------------------------------------------ static
  {
    slug: 'static-members',
    title: 'Static members and static classes',
    summary: 'Data and methods that belong to the class itself instead of to each object: static fields, methods, classes and constructors.',
    minutes: 12,
    blocks: [
      { type: 'p', text: 'Everything we put in classes so far belonged to **each object**: every Beam has its own Length. Sometimes data or behaviour belongs to the **class as a whole**: the total number of beams created, a conversion factor, a helper that needs no object. That is what `static` is for.' },
      { type: 'widget', name: 'static-counter' },
      { type: 'h2', text: 'Instance vs static' },
      { type: 'table', head: ['', 'Instance member', 'Static member'], rows: [
        ['Belongs to', 'each object', 'the class (one copy)'],
        ['Accessed with', '`obj.Member`', '`ClassName.Member`'],
        ['Exists when', 'after `new`', 'as soon as the class is used'],
        ['Can use `this`', 'yes', 'no (there is no current object)'],
        ['Example', '`beam.Length`', '`Math.PI`, `Console.WriteLine`, `int.Parse`']
      ] },
      { type: 'h2', text: 'Static methods' },
      { type: 'code', title: 'Units.cs', code: cs`
public static class Units
{
    public const double MmPerInch = 25.4;

    public static double InchToMm(double inches) => inches * MmPerInch;
    public static double MmToInch(double mm) => mm / MmPerInch;
}

Console.WriteLine(Units.InchToMm(10));   // no object needed
Console.WriteLine(Units.MmToInch(50.8));`, output: '254\n2' },
      { type: 'p', text: 'A static method can only use its parameters and other static members. It can’t read instance fields directly, because it has no object to read them from.' },
      { type: 'h2', text: 'Static classes' },
      { type: 'p', text: 'A class marked `static` can contain only static members and **can’t be instantiated** (`new Units()` is an error). Use it for groups of related helpers, like `Math`, `Console`, `File` or your own `Units`.' },
      { type: 'h2', text: 'Static fields: shared state' },
      { type: 'code', title: 'Ids.cs', code: cs`
public class Member
{
    private static int _nextId = 1;   // shared by all Members
    public int Id { get; }

    public Member()
    {
        Id = _nextId++;               // each new object gets the next number
    }
}

var a = new Member();
var b = new Member();
Console.WriteLine($"{a.Id}, {b.Id}");`, output: '1, 2' },
      { type: 'note', kind: 'warn', text: 'Static mutable fields are **global state**: any code can change them, and they are shared between threads. Use them sparingly. Constants and stateless helper methods are the safest kinds of static members.' },
      { type: 'h2', text: 'const vs static readonly' },
      { type: 'code', code: cs`
public class Config
{
    public const int MaxLevels = 50;                          // compile-time constant
    public static readonly DateTime Started = DateTime.Now;   // set once at run time
}`, title: 'Constants.cs' },
      { type: 'p', text: '`const` values must be known when compiling (numbers, strings). Use `static readonly` for values calculated at run time, or for objects.' },
      { type: 'h2', text: 'Static constructors' },
      { type: 'code', code: cs`
public static class SteelTable
{
    public static readonly Dictionary<string, double> KgPerMetre;

    static SteelTable()          // runs once, automatically, before first use
    {
        KgPerMetre = new() { ["IPE200"] = 22.4, ["IPE300"] = 42.2 };
    }
}`, title: 'StaticCtor.cs' },
      { type: 'quiz', question: 'Why can’t a static method use `this`?', options: ['It is a compile-time feature', 'Static methods are called on the class, so there is no current object', 'Because it is private', 'It can, with a cast'], answer: 1, explain: 'Static members belong to the class, not to any particular object.' },
      { type: 'quiz', question: 'Which of these is a static method call?', options: ['`beam.Weight()`', '`Math.Max(3, 7)`', '`list.Add(5)`', '`name.ToUpper()`'], answer: 1, explain: 'It is called on the class `Math`, not on an object.' },
      { type: 'exercise', task: 'Create a static class `Geometry` with static methods `CircleArea(double r)` and `CylinderVolume(double r, double h)` (use `Math.PI`). Print the volume of a pipe with radius 0.1 m and length 6 m, to 4 decimals.', solution: cs`
public static class Geometry
{
    public static double CircleArea(double r) => Math.PI * r * r;
    public static double CylinderVolume(double r, double h) => CircleArea(r) * h;
}

Console.WriteLine(Geometry.CylinderVolume(0.1, 6).ToString("F4"));`, output: '0.1885' }
    ],
    keyPoints: [
      'Static members belong to the class: one copy, used via `ClassName.Member`.',
      'Static methods can’t use `this` or instance fields.',
      'Static classes hold helpers and can’t be instantiated.',
      'Prefer constants and stateless static methods; avoid mutable static state.'
    ]
  },

  // ------------------------------------------------------------------ inheritance
  {
    slug: 'inheritance',
    title: 'Inheritance',
    summary: 'Build new classes from existing ones: base and derived classes, the is-a rule, base constructors, protected members and sealed.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'Beams, columns and braces are all **structural members**. They each have a mark, a material and a length, and each also has something of its own. Writing those common parts three times would be repetitive and error-prone. **Inheritance** lets a class reuse and extend another class.' },
      { type: 'code', title: 'Members.cs', code: cs`
public class StructuralMember                 // base class (parent)
{
    public string Mark { get; set; } = "";
    public string Material { get; set; } = "S355";
    public double Length { get; set; }

    public string Describe() => $"{Mark}: {Material}, {Length} m";
}

public class Beam : StructuralMember          // derived class (child)
{
    public string Profile { get; set; } = "IPE200";
}

public class Column : StructuralMember
{
    public bool IsBraced { get; set; }
}

var b = new Beam { Mark = "B1", Length = 6, Profile = "IPE300" };
Console.WriteLine(b.Describe());   // inherited method
Console.WriteLine(b.Profile);      // its own property`, output: 'B1: S355, 6 m\nIPE300' },
      { type: 'p', text: '`class Beam : StructuralMember` reads “Beam inherits from StructuralMember”. A Beam automatically has **everything** public and protected that StructuralMember has, plus what it adds itself.' },
      { type: 'widget', name: 'inheritance-tree' },
      { type: 'h2', text: 'The is-a rule' },
      { type: 'p', text: 'Use inheritance only when the child truly **is a** kind of the parent: a Beam is a StructuralMember. Because of that, a Beam can be stored in a StructuralMember variable:' },
      { type: 'code', code: cs`
StructuralMember m = new Beam { Mark = "B2" };   // OK: a Beam is a member
Console.WriteLine(m.Describe());
// Console.WriteLine(m.Profile);    // error: through m we only see member things

StructuralMember[] frame = { new Beam(), new Column(), new Beam() };   // mix them in one array`, title: 'IsA.cs' },
      { type: 'note', kind: 'tip', text: 'If the relationship is “has a” (a Building has Floors, a Car has an Engine), don’t inherit. Give the class a field or property of that type instead. This is called **composition**, and it is usually the better default.' },
      { type: 'h2', text: 'Constructors and base(...)' },
      { type: 'p', text: 'Constructors are not inherited. A derived constructor must make sure the base part is built first, by calling a base constructor with `: base(...)`. The base constructor always runs **before** the derived one.' },
      { type: 'code', title: 'BaseCtor.cs', code: cs`
public class StructuralMember
{
    public string Mark { get; }
    public StructuralMember(string mark)
    {
        Mark = mark;
        Console.WriteLine($"StructuralMember({mark})");
    }
}

public class Beam : StructuralMember
{
    public string Profile { get; }
    public Beam(string mark, string profile) : base(mark)   // pass mark up
    {
        Profile = profile;
        Console.WriteLine($"Beam({profile})");
    }
}

var b = new Beam("B7", "HEA240");`, output: 'StructuralMember(B7)\nBeam(HEA240)' },
      { type: 'h2', text: 'protected: for children only' },
      { type: 'code', code: cs`
public class StructuralMember
{
    protected double SelfWeightKn;     // children may use it, outside code may not
}

public class Beam : StructuralMember
{
    public double TotalLoad(double liveKn) => SelfWeightKn + liveKn;   // OK
}`, title: 'Protected.cs' },
      { type: 'h2', text: 'Rules and limits' },
      { type: 'ul', items: [
        'A class can inherit from **only one** base class (single inheritance). Interfaces, coming soon, cover the “many” case.',
        'Every class ultimately inherits from `object`, which is why everything has `ToString()`, `Equals()` and `GetType()`.',
        'Mark a class `sealed` to stop others from inheriting from it: `public sealed class Bolt`.',
        'Private members of the base exist in the object but can’t be used by the derived class’s code.'
      ] },
      { type: 'note', kind: 'warn', text: 'Deep hierarchies (A → B → C → D → E) become hard to understand and change. Keep them shallow, usually two or three levels.' },
      { type: 'quiz', question: 'Which line compiles, given `class Beam : StructuralMember` and `class Column : StructuralMember`?', options: ['`Beam b = new Column();`', '`StructuralMember m = new Column();`', '`Column c = new StructuralMember();`', '`Beam b = new StructuralMember();`'], answer: 1, explain: 'A Column is a StructuralMember, so it fits in that variable. Sideways (Beam ← Column) and downwards assignments don’t compile.' },
      { type: 'quiz', question: 'With `new Beam(...)`, which constructor body runs first?', options: ['Beam’s', 'StructuralMember’s', 'object’s, then StructuralMember’s, then Beam’s', 'Only Beam’s'], answer: 2, explain: 'Construction goes from the top of the family down: object → StructuralMember → Beam.' },
      { type: 'exercise', task: 'Create a base class `Shape` with a `Name` property and a constructor that takes the name. Derive `Circle` (Radius) and `Square` (Side) that pass their names to the base constructor and each add a method `double Area()`. Create one of each and print name and area.', solution: cs`
public class Shape
{
    public string Name { get; }
    public Shape(string name) => Name = name;
}

public class Circle : Shape
{
    public double Radius { get; }
    public Circle(double r) : base("Circle") => Radius = r;
    public double Area() => Math.PI * Radius * Radius;
}

public class Square : Shape
{
    public double Side { get; }
    public Square(double s) : base("Square") => Side = s;
    public double Area() => Side * Side;
}

var c = new Circle(1);
var s = new Square(3);
Console.WriteLine($"{c.Name}: {c.Area():F2}");
Console.WriteLine($"{s.Name}: {s.Area()}");`, output: 'Circle: 3.14\nSquare: 9' }
    ],
    keyPoints: [
      '`class Child : Parent` reuses and extends the parent’s members.',
      'Inherit only for true is-a relationships; prefer composition for has-a.',
      'Base constructors run first; pass arguments with `: base(...)`.',
      'Single inheritance only; every class derives from `object`; `sealed` stops inheritance.'
    ]
  }
];
