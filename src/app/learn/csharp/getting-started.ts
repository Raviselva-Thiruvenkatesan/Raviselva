import { Lesson } from '../learn.types';
import { cs } from './cs';

export const GETTING_STARTED: Lesson[] = [
  // ------------------------------------------------------------------ 1
  {
    slug: 'what-is-csharp',
    title: 'What is C# and .NET?',
    summary: 'Before writing code, understand what C# is, what .NET does for you, and how your text file becomes a running program.',
    minutes: 8,
    blocks: [
      { type: 'p', text: 'A computer’s processor only understands machine code: long lists of numbers. Writing that by hand is almost impossible, so we write in a **programming language** that people can read, and a tool translates it for the machine. **C#** (pronounced “C sharp”) is one of those languages.' },
      { type: 'h2', text: 'C# in one paragraph' },
      { type: 'p', text: 'C# was created by Microsoft in 2000 and is now open source. It is a **general-purpose, strongly typed, object-oriented** language. In simple words: you can build almost anything with it, every value has a clear type (number, text, true/false…), and you organise code into objects that model real things.' },
      { type: 'table', head: ['You can build…', 'With…'], rows: [
        ['Windows desktop apps', 'WPF, WinForms, WinUI'],
        ['Websites and web APIs', 'ASP.NET Core'],
        ['Mobile apps', '.NET MAUI'],
        ['Games', 'Unity'],
        ['Engineering / BIM / 3D software', '.NET with libraries like VTK, Revit and Tekla APIs'],
        ['Cloud services and tools', 'Azure, console apps, background services']
      ] },
      { type: 'h2', text: 'C# vs .NET: what is the difference?' },
      { type: 'p', text: 'Freshers often mix these up. **C# is the language** (the grammar and words you write). **.NET is the platform** that compiles and runs your C# code. .NET gives you three big things:' },
      { type: 'ul', items: [
        '**A compiler** that checks and translates your code.',
        '**A runtime (the CLR)** that runs your program and manages memory automatically.',
        '**A huge class library**: ready-made code for files, text, maths, networking, dates and much more, so you don’t write everything yourself.'
      ] },
      { type: 'note', kind: 'info', text: 'You may see names like “.NET Framework”, “.NET Core” and “.NET 8/9”. .NET Framework is the older Windows-only version. Modern .NET (5 and later) runs on Windows, Linux and macOS. Always start new projects on the latest modern .NET.' },
      { type: 'h2', text: 'How your code runs' },
      { type: 'p', text: 'C# goes through **two translation steps**. First at build time, then again when the program runs. Step through the diagram:' },
      { type: 'widget', name: 'dotnet-pipeline' },
      { type: 'p', text: 'Why two steps? IL is the same on every computer, so one `.dll` can run anywhere .NET is installed. The JIT then produces machine code tuned for the exact CPU it is running on.' },
      { type: 'h2', text: 'Words to know' },
      { type: 'table', head: ['Term', 'Meaning'], rows: [
        ['Source code', 'The C# text you write, saved in `.cs` files.'],
        ['Compiler', 'The tool that checks your code and translates it to IL.'],
        ['IL', 'Intermediate Language: CPU-independent instructions.'],
        ['Assembly', 'The `.dll` or `.exe` file that contains IL.'],
        ['CLR', 'Common Language Runtime: runs your program, manages memory.'],
        ['JIT', 'Just-In-Time compiler: turns IL into machine code while running.'],
        ['Garbage collector', 'Part of the CLR that frees memory you no longer use.'],
        ['SDK', 'Software Development Kit: everything needed to build .NET apps.']
      ] },
      { type: 'quiz', question: 'Which part turns IL into machine code for your CPU?', options: ['The C# compiler (Roslyn)', 'The JIT compiler inside the CLR', 'Visual Studio', 'The garbage collector'], answer: 1, explain: 'The C# compiler makes IL at build time. The JIT, part of the CLR, makes machine code at run time.' },
      { type: 'quiz', question: 'Is C# the same thing as .NET?', options: ['Yes, they are two names for one thing', 'No: C# is a language, .NET is the platform that builds and runs it', 'No: .NET is a language and C# is an editor'], answer: 1, explain: 'C# is the language. .NET provides the compiler, runtime and libraries. (Other languages like F# and VB.NET also run on .NET.)' }
    ],
    keyPoints: [
      'C# is a strongly typed, object-oriented, general-purpose language.',
      '.NET is the platform: compiler + runtime (CLR) + class library.',
      'Build time: C# → IL in a `.dll`. Run time: the JIT turns IL into machine code.',
      'The garbage collector frees unused memory for you.'
    ]
  },

  // ------------------------------------------------------------------ 2
  {
    slug: 'first-program',
    title: 'Your first C# program',
    summary: 'Install the tools, create a console app, and understand every line of “Hello, World!”.',
    minutes: 10,
    blocks: [
      { type: 'h2', text: 'Install the tools' },
      { type: 'ol', items: [
        'Install **Visual Studio Community** (free) and tick the “.NET desktop development” workload. It includes the .NET SDK. Alternatively install the **.NET SDK** plus **VS Code** with the C# Dev Kit extension.',
        'Open a terminal and run `dotnet --version`. If you see a number like `9.0.100`, the SDK is installed.'
      ] },
      { type: 'h2', text: 'Create and run a console app' },
      { type: 'p', text: 'A **console app** runs in a text window. It is the best way to learn because there is no UI to distract you. In a terminal:' },
      { type: 'code', title: 'Terminal', code: cs`
dotnet new console -n HelloApp
cd HelloApp
dotnet run`, output: 'Hello, World!' },
      { type: 'p', text: 'In Visual Studio: **Create a new project → Console App → Next**, give it a name, then press **F5** (run with debugger) or **Ctrl+F5** (run without debugger).' },
      { type: 'h2', text: 'Every line explained' },
      { type: 'p', text: 'Here is the classic, complete form of the program. Click each part to see what it does:' },
      { type: 'widget', name: 'code-anatomy' },
      { type: 'h2', text: 'The short version: top-level statements' },
      { type: 'p', text: 'New projects (.NET 6+) generate a much shorter `Program.cs`. The compiler adds the namespace, class and `Main` method for you behind the scenes. Both versions do exactly the same thing.' },
      { type: 'code', code: cs`
// Program.cs (top-level statements)
Console.WriteLine("Hello, World!");`, output: 'Hello, World!' },
      { type: 'note', kind: 'info', text: 'Lessons use the short form for small examples. When we learn classes and methods, you will see why the full structure exists.' },
      { type: 'h2', text: 'Write vs WriteLine' },
      { type: 'code', code: cs`
Console.Write("Hello, ");
Console.Write("Ravi");
Console.WriteLine("!");      // ends the line
Console.WriteLine("Next line");`, output: 'Hello, Ravi!\nNext line' },
      { type: 'h2', text: 'Rules C# is strict about' },
      { type: 'ul', items: [
        'C# is **case-sensitive**: `Console` works, `console` does not.',
        'Every statement ends with a semicolon `;`.',
        'Text (strings) goes in double quotes: `"Hello"`.',
        'Every `{` needs a matching `}`.'
      ] },
      { type: 'note', kind: 'warn', text: 'The most common first error is a missing semicolon: “error CS1002: ; expected”. Read the line number in the error and look at the end of that line (or the line before).' },
      { type: 'h2', text: 'Comments' },
      { type: 'code', code: cs`
// A single-line comment

/* A comment that
   spans several lines */

/// <summary>XML documentation comment, shown in IntelliSense.</summary>`, title: 'Comments.cs' },
      { type: 'quiz', question: 'Which method runs first when a classic C# program starts?', options: ['`Start()`', '`Program()`', '`Main()`', '`Run()`'], answer: 2, explain: '`Main` is the entry point. With top-level statements, the compiler generates `Main` from your top-level code.' },
      { type: 'quiz', question: 'What is wrong with `console.WriteLine("Hi")`?', options: ['Nothing', 'Lowercase `console` (C# is case-sensitive) and the missing `;`', 'Strings must use single quotes', 'WriteLine must be lowercase'], answer: 1, explain: 'It must be `Console.WriteLine("Hi");` with a capital C and a semicolon.' },
      { type: 'exercise', task: 'Write a program that prints your name on the first line, your city on the second line, and “I am learning C#” on the third line.', solution: cs`
Console.WriteLine("Raviselva");
Console.WriteLine("Salem");
Console.WriteLine("I am learning C#");`, output: 'Raviselva\nSalem\nI am learning C#' }
    ],
    keyPoints: [
      'Create and run a console app with `dotnet new console` and `dotnet run` (or F5 in Visual Studio).',
      '`Main` is the entry point; top-level statements are a shorter way to write it.',
      '`Console.WriteLine` prints and starts a new line; `Console.Write` does not.',
      'C# is case-sensitive, statements end with `;`, blocks use `{ }`.'
    ]
  },

  // ------------------------------------------------------------------ 3
  {
    slug: 'variables-and-data-types',
    title: 'Variables and data types',
    summary: 'Store values in named boxes, choose the right type for each value, and learn the rules for names, constants and var.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'Programs need to remember things: a user’s age, a price, a name. A **variable** is a named box in memory that holds one value. In C#, every box has a **type** that decides what can go in it and how much memory it uses.' },
      { type: 'code', code: cs`
int age = 25;            // type  name  =  value;
string name = "Ravi";
double height = 1.75;
bool isStudent = true;

Console.WriteLine(name + " is " + age);`, output: 'Ravi is 25' },
      { type: 'h2', text: 'See it in memory' },
      { type: 'widget', name: 'variable-boxes' },
      { type: 'h2', text: 'The built-in types you will use most' },
      { type: 'table', head: ['Type', 'Holds', 'Size', 'Example'], rows: [
        ['`int`', 'Whole numbers (±2.1 billion)', '4 bytes', '`int count = 10;`'],
        ['`long`', 'Very large whole numbers', '8 bytes', '`long views = 9000000000L;`'],
        ['`double`', 'Decimal numbers (15–16 digits)', '8 bytes', '`double pi = 3.14159;`'],
        ['`float`', 'Decimals, less precise (7 digits)', '4 bytes', '`float speed = 2.5f;`'],
        ['`decimal`', 'Exact decimals for money', '16 bytes', '`decimal price = 199.99m;`'],
        ['`bool`', '`true` or `false`', '1 byte', '`bool isOpen = false;`'],
        ['`char`', 'One character', '2 bytes', "`char grade = 'A';`"],
        ['`string`', 'Text of any length', 'reference', '`string city = "Salem";`']
      ] },
      { type: 'note', kind: 'tip', text: 'Simple rule: whole numbers → `int`, decimals → `double`, money → `decimal`, yes/no → `bool`, text → `string`.' },
      { type: 'h2', text: 'Declare, assign, change' },
      { type: 'code', code: cs`
int score;          // declare (create the box)
score = 50;         // assign (put a value in)
score = score + 10; // change it: read 50, add 10, store 60
Console.WriteLine(score);`, output: '60' },
      { type: 'note', kind: 'warn', text: 'You must assign a value before reading a local variable. `int x; Console.WriteLine(x);` gives “error CS0165: Use of unassigned local variable”.' },
      { type: 'h2', text: 'Naming rules and conventions' },
      { type: 'ul', items: [
        'Must start with a letter or `_`, then letters, digits or `_`. No spaces.',
        'Cannot be a keyword like `int` or `class`.',
        'Case-sensitive: `age` and `Age` are different variables.',
        'Convention: local variables use **camelCase**: `firstName`, `totalPrice`.',
        'Use meaningful names: `studentCount` is far better than `sc` or `x`.'
      ] },
      { type: 'h2', text: 'var: let the compiler work out the type' },
      { type: 'code', code: cs`
var count = 10;        // int
var price = 99.5;      // double
var name = "Ravi";     // string
// count = "ten";      // error: count is still an int!`, title: 'Var.cs' },
      { type: 'p', text: '`var` is not a “any type” box. The type is fixed at compile time from the value on the right. Use it when the type is obvious from the right-hand side.' },
      { type: 'h2', text: 'Constants' },
      { type: 'code', code: cs`
const double Pi = 3.14159;
const int MaxStudents = 60;
// MaxStudents = 70;   // error: a const can never change`, title: 'Const.cs' },
      { type: 'h2', text: 'Value types and reference types (first look)' },
      { type: 'p', text: '`int`, `double`, `bool`, `char` and `decimal` are **value types**: the box holds the value itself. `string` is a **reference type**: the box holds a reference (an address) to the text stored elsewhere, on the heap. You will see why this matters when we study classes and memory.' },
      { type: 'quiz', question: 'Which type should you use for a bank balance?', options: ['`float`', '`double`', '`decimal`', '`int`'], answer: 2, explain: '`decimal` stores decimal numbers exactly, so money calculations don’t pick up tiny rounding errors.' },
      { type: 'quiz', question: 'What is the type of `x` in `var x = 5.0;`?', options: ['`int`', '`double`', '`decimal`', 'It can hold any type'], answer: 1, explain: 'A number with a decimal point and no suffix is a `double` literal, so `x` is a `double`.' },
      { type: 'exercise', task: 'Create variables for a product: its name (text), price (money), quantity in stock (whole number) and whether it is available (yes/no). Print them on one line each.', solution: cs`
string productName = "Steel Beam";
decimal price = 1499.50m;
int stock = 12;
bool isAvailable = true;

Console.WriteLine(productName);
Console.WriteLine(price);
Console.WriteLine(stock);
Console.WriteLine(isAvailable);`, output: 'Steel Beam\n1499.50\n12\nTrue' }
    ],
    keyPoints: [
      'A variable is a named, typed box: `type name = value;`.',
      'Pick the type by the data: `int`, `double`, `decimal`, `bool`, `char`, `string`.',
      'Assign before you read; names are camelCase and case-sensitive.',
      '`var` infers a fixed type; `const` values never change.'
    ]
  },

  // ------------------------------------------------------------------ 4
  {
    slug: 'type-conversion',
    title: 'Type conversion and parsing',
    summary: 'Move values between types safely: implicit and explicit casts, Parse, TryParse and Convert, and what happens when it goes wrong.',
    minutes: 12,
    blocks: [
      { type: 'p', text: 'Values often arrive in the “wrong” type. A user types `"25"` (a string) but you need the number `25`. Or you have a `double` but a method needs an `int`. Converting between types is called **type conversion**.' },
      { type: 'h2', text: 'Implicit conversion: safe and automatic' },
      { type: 'p', text: 'When no data can be lost, C# converts for you. A small box fits inside a bigger box.' },
      { type: 'code', code: cs`
int small = 100;
long big = small;        // int → long: always fits
double d = small;        // int → double: always fits
Console.WriteLine(d);`, output: '100' },
      { type: 'h2', text: 'Explicit conversion (casting): you take responsibility' },
      { type: 'p', text: 'When data might be lost, the compiler refuses unless you write a **cast**: the target type in brackets.' },
      { type: 'code', code: cs`
double price = 9.99;
// int whole = price;    // error CS0266: cannot implicitly convert
int whole = (int)price;  // cast: the .99 is cut off
Console.WriteLine(whole);`, output: '9' },
      { type: 'note', kind: 'warn', text: 'A cast from `double` to `int` **truncates**: it does not round. `(int)9.99` is `9`, and `(int)-2.7` is `-2`.' },
      { type: 'h2', text: 'From text to numbers' },
      { type: 'p', text: 'Text never converts to a number by casting. Use one of these methods, and see how they behave with good and bad input:' },
      { type: 'widget', name: 'conversion-lab' },
      { type: 'table', head: ['Method', 'Bad input', 'Use it when'], rows: [
        ['`int.Parse(s)`', 'Throws `FormatException`', 'You are sure the text is valid'],
        ['`int.TryParse(s, out int n)`', 'Returns `false`', 'Input comes from users or files (most of the time)'],
        ['`Convert.ToInt32(x)`', 'Throws; `null` gives 0', 'Converting between many types, including from `object`']
      ] },
      { type: 'code', title: 'SafeInput.cs', code: cs`
Console.Write("Enter your age: ");
string? input = Console.ReadLine();

if (int.TryParse(input, out int age))
{
    Console.WriteLine($"Next year you will be {age + 1}");
}
else
{
    Console.WriteLine("That is not a valid number.");
}`, output: 'Enter your age: 24\nNext year you will be 25' },
      { type: 'h2', text: 'Numbers to text' },
      { type: 'code', code: cs`
int count = 42;
string a = count.ToString();       // "42"
string b = 3.14159.ToString("F2"); // "3.14" (2 decimal places)
string c = $"Count: {count}";      // string interpolation
Console.WriteLine(b);`, output: '3.14' },
      { type: 'h2', text: 'Overflow when casting' },
      { type: 'code', code: cs`
int big = 300;
byte b = (byte)big;       // byte max is 255
Console.WriteLine(b);     // wraps around: 300 - 256 = 44

checked
{
    byte c = (byte)big;   // throws OverflowException instead
}`, output: '44\nUnhandled exception. System.OverflowException' },
      { type: 'quiz', question: 'What does `(int)7.9` give?', options: ['8', '7', '7.9', 'A compile error'], answer: 1, explain: 'Casting a double to int drops the decimal part. Use `Math.Round` if you want rounding.' },
      { type: 'quiz', question: 'A user types “abc” where you expect a number. Which call will NOT crash your program?', options: ['`int.Parse("abc")`', '`Convert.ToInt32("abc")`', '`int.TryParse("abc", out int n)`'], answer: 2, explain: '`TryParse` returns `false` instead of throwing an exception.' },
      { type: 'exercise', task: 'Ask the user for two whole numbers and print their sum. If either input is not a valid number, print “Please enter whole numbers only.”', hint: 'Use two `int.TryParse` calls joined with `&&` inside one `if`.', solution: cs`
Console.Write("First number: ");
string? a = Console.ReadLine();
Console.Write("Second number: ");
string? b = Console.ReadLine();

if (int.TryParse(a, out int x) && int.TryParse(b, out int y))
    Console.WriteLine($"Sum = {x + y}");
else
    Console.WriteLine("Please enter whole numbers only.");`, output: 'First number: 12\nSecond number: 30\nSum = 42' }
    ],
    keyPoints: [
      'Implicit conversions happen automatically when nothing can be lost (int → double).',
      'Casts like `(int)x` are explicit, may lose data, and truncate decimals.',
      'Use `int.TryParse` for user input; `Parse` and `Convert` throw on bad text.',
      'Use `ToString()` or string interpolation `$"..."` to turn values into text.'
    ]
  },

  // ------------------------------------------------------------------ 5
  {
    slug: 'operators',
    title: 'Operators and expressions',
    summary: 'Arithmetic, comparison, logical and assignment operators, integer division, remainders, precedence and increment.',
    minutes: 13,
    blocks: [
      { type: 'p', text: 'An **operator** is a symbol that does something with values, like `+` or `>`. An **expression** is any piece of code that produces a value: `price * quantity`, `age >= 18`, or just `5`.' },
      { type: 'h2', text: 'Try the operators' },
      { type: 'widget', name: 'operator-lab' },
      { type: 'h2', text: 'Arithmetic operators' },
      { type: 'table', head: ['Operator', 'Meaning', 'Example', 'Result'], rows: [
        ['`+`', 'Add (also joins strings)', '`7 + 2`', '`9`'],
        ['`-`', 'Subtract', '`7 - 2`', '`5`'],
        ['`*`', 'Multiply', '`7 * 2`', '`14`'],
        ['`/`', 'Divide', '`7 / 2` · `7.0 / 2`', '`3` · `3.5`'],
        ['`%`', 'Remainder (modulus)', '`7 % 2`', '`1`']
      ] },
      { type: 'note', kind: 'warn', text: '**Integer division** catches everyone: `int / int` always gives an `int`. `5 / 2` is `2`. To get `2.5`, make at least one side a double: `5 / 2.0` or `(double)a / b`.' },
      { type: 'code', title: 'Average.cs', code: cs`
int total = 245;
int count = 3;

double wrong = total / count;          // 81 (int division first!)
double right = (double)total / count;  // 81.666...

Console.WriteLine(wrong);
Console.WriteLine(right.ToString("F2"));`, output: '81\n81.67' },
      { type: 'h2', text: 'Comparison operators give a bool' },
      { type: 'table', head: ['Operator', 'Meaning'], rows: [
        ['`==`', 'equal to (two equals signs!)'],
        ['`!=`', 'not equal to'],
        ['`<` `>`', 'less than, greater than'],
        ['`<=` `>=`', 'less/greater than or equal']
      ] },
      { type: 'note', kind: 'warn', text: '`=` assigns a value; `==` compares. `if (age = 18)` is a compile error in C#, which saves you from a classic bug.' },
      { type: 'h2', text: 'Logical operators combine conditions' },
      { type: 'table', head: ['Operator', 'Name', 'True when…'], rows: [
        ['`&&`', 'AND', 'both sides are true'],
        ['`||`', 'OR', 'at least one side is true'],
        ['`!`', 'NOT', 'flips true ↔ false']
      ] },
      { type: 'code', code: cs`
int age = 22;
bool hasId = true;

bool canEnter = age >= 18 && hasId;      // true
bool discount = age < 12 || age > 60;    // false
bool isMinor = !(age >= 18);             // false

Console.WriteLine($"{canEnter} {discount} {isMinor}");`, output: 'True False False' },
      { type: 'p', text: '`&&` and `||` are **short-circuit**: if the left side already decides the answer, the right side is not evaluated. `x != 0 && 10 / x > 1` is safe even when `x` is 0.' },
      { type: 'h2', text: 'Assignment shortcuts and ++ / --' },
      { type: 'code', code: cs`
int score = 10;
score += 5;   // score = score + 5   → 15
score -= 3;   // → 12
score *= 2;   // → 24
score /= 4;   // → 6
score %= 4;   // → 2
score++;      // add 1 → 3
score--;      // subtract 1 → 2

int a = 5;
int b = a++;  // b = 5, then a becomes 6 (post-increment)
int c = ++a;  // a becomes 7 first, then c = 7 (pre-increment)
Console.WriteLine($"{score} {a} {b} {c}");`, output: '2 7 5 7' },
      { type: 'h2', text: 'Precedence: which runs first?' },
      { type: 'p', text: 'Like maths: `*`, `/`, `%` before `+` and `-`; then comparisons; then `&&`; then `||`; assignment last. When in doubt, add brackets. They make code clearer even when not required.' },
      { type: 'code', code: cs`
int r1 = 2 + 3 * 4;      // 14, not 20
int r2 = (2 + 3) * 4;    // 20
bool ok = 5 > 3 && 2 > 1 || false;  // (true && true) || false → true`, title: 'Precedence.cs' },
      { type: 'quiz', question: 'What is `17 % 5`?', options: ['3.4', '3', '2', '12'], answer: 2, explain: '17 = 5 × 3 + 2, so the remainder is 2.' },
      { type: 'quiz', question: 'With `int a = 9, b = 2;`, what is `a / b`?', options: ['4.5', '4', '5', '4.0'], answer: 1, explain: 'Both are int, so integer division drops the .5.' },
      { type: 'exercise', task: 'Given `int totalMinutes = 135;`, print it as hours and minutes, like “2 h 15 min”.', hint: 'Hours = totalMinutes / 60 (integer division). Minutes = the remainder.', solution: cs`
int totalMinutes = 135;
int hours = totalMinutes / 60;
int minutes = totalMinutes % 60;
Console.WriteLine($"{hours} h {minutes} min");`, output: '2 h 15 min' }
    ],
    keyPoints: [
      '`int / int` is integer division; cast one side to `double` for decimals.',
      '`%` gives the remainder: great for even/odd checks and splitting units.',
      'Comparisons give `bool`; combine them with `&&`, `||`, `!` (short-circuit).',
      '`=` assigns, `==` compares. Use brackets to make precedence obvious.'
    ]
  },

  // ------------------------------------------------------------------ 6
  {
    slug: 'strings-and-console',
    title: 'Strings, input and output',
    summary: 'Read input from the user, build text with interpolation, and use the most important string methods.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'Almost every program works with text: names, messages, file paths, user input. In C# text is a `string`, a sequence of characters.' },
      { type: 'h2', text: 'Reading input' },
      { type: 'code', title: 'Greeting.cs', code: cs`
Console.Write("What is your name? ");
string? name = Console.ReadLine();   // waits until Enter is pressed
Console.WriteLine("Hello, " + name + "!");`, output: 'What is your name? Ravi\nHello, Ravi!' },
      { type: 'note', kind: 'info', text: '`Console.ReadLine()` always returns a `string` (or `null` if input ends). The `?` in `string?` says “this may be null”. To get a number, convert it with `int.TryParse` (previous lesson).' },
      { type: 'h2', text: 'Building strings' },
      { type: 'code', code: cs`
string first = "Ravi";
int age = 25;

string a = "Name: " + first + ", age " + age;   // concatenation
string b = $"Name: {first}, age {age}";          // interpolation (preferred)
string c = $"Next year: {age + 1}";              // any expression in { }
string d = $"Price: {1499.5:F2}";                // format: 2 decimals

Console.WriteLine(b);
Console.WriteLine(d);`, output: 'Name: Ravi, age 25\nPrice: 1499.50' },
      { type: 'h2', text: 'Escape sequences and verbatim strings' },
      { type: 'table', head: ['Write', 'To get'], rows: [
        ['`\\n`', 'a new line'],
        ['`\\t`', 'a tab'],
        ['`\\"`', 'a double quote inside a string'],
        ['`\\\\`', 'a backslash']
      ] },
      { type: 'code', code: cs`
Console.WriteLine("Line 1\nLine 2");
Console.WriteLine("She said \"Hi\"");
string path = @"C:\Projects\Steel\model.ifc";   // @ = verbatim: \ is literal
Console.WriteLine(path);`, output: 'Line 1\nLine 2\nShe said "Hi"\nC:\\Projects\\Steel\\model.ifc' },
      { type: 'h2', text: 'Inside a string: indexes and methods' },
      { type: 'widget', name: 'string-lab' },
      { type: 'table', head: ['Member', 'What it does'], rows: [
        ['`s.Length`', 'number of characters'],
        ['`s[i]`', 'the character at index `i` (a `char`)'],
        ['`s.ToUpper()` / `s.ToLower()`', 'change case'],
        ['`s.Trim()`', 'remove spaces at both ends'],
        ['`s.Contains(x)`', '`true` if `x` appears in `s`'],
        ['`s.IndexOf(x)`', 'position of `x`, or `-1`'],
        ['`s.Substring(start, length)`', 'part of the string'],
        ['`s.Replace(a, b)`', 'replace every `a` with `b`'],
        ['`s.Split(sep)`', 'cut into a `string[]`'],
        ['`string.IsNullOrWhiteSpace(s)`', 'true for null, empty or only spaces']
      ] },
      { type: 'note', kind: 'warn', text: 'Strings are **immutable**: methods never change the original, they return a new string. `name.ToUpper();` alone does nothing useful. Write `name = name.ToUpper();`.' },
      { type: 'h2', text: 'Comparing strings' },
      { type: 'code', code: cs`
string a = "Steel";
string b = "steel";

Console.WriteLine(a == b);                                              // False
Console.WriteLine(a.Equals(b, StringComparison.OrdinalIgnoreCase));     // True`, output: 'False\nTrue' },
      { type: 'quiz', question: 'What does `"Hello".Substring(1, 3)` return?', options: ['"Hel"', '"ell"', '"ello"', '"el"'], answer: 1, explain: 'Start at index 1 (“e”) and take 3 characters: “ell”.' },
      { type: 'quiz', question: 'After `string s = "hi"; s.ToUpper();` what is `s`?', options: ['"HI"', '"hi"', 'null', 'A compile error'], answer: 1, explain: 'Strings are immutable. `ToUpper` returned a new string, but it was not stored.' },
      { type: 'exercise', task: 'Ask the user for their full name (e.g. “  ravi selva  ”). Print it trimmed and in capitals, then print how many characters it has (without the outer spaces), and the first letter.', solution: cs`
Console.Write("Full name: ");
string name = (Console.ReadLine() ?? "").Trim();

Console.WriteLine(name.ToUpper());
Console.WriteLine($"Length: {name.Length}");
if (name.Length > 0)
    Console.WriteLine($"First letter: {name[0]}");`, output: 'Full name:   ravi selva\nRAVI SELVA\nLength: 10\nFirst letter: r' }
    ],
    keyPoints: [
      '`Console.ReadLine()` returns a string; convert it for numbers.',
      'Prefer interpolation: `$"Hello {name}"`, with formats like `{x:F2}`.',
      'Indexes start at 0; the last index is `Length - 1`.',
      'Strings are immutable: store the result of `ToUpper`, `Trim`, `Replace`…'
    ]
  }
];
