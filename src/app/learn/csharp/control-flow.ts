import { Lesson } from '../learn.types';
import { cs } from './cs';

export const CONTROL_FLOW: Lesson[] = [
  // ------------------------------------------------------------------ 7
  {
    slug: 'if-else',
    title: 'Decisions with if / else',
    summary: 'Make your program choose: if, else, else if, nested conditions, the ternary operator and common traps.',
    minutes: 12,
    blocks: [
      { type: 'p', text: 'So far every line ran from top to bottom. Real programs must **decide**: show an error if the password is wrong, give a discount if the total is high. The `if` statement runs code only when a condition is `true`.' },
      { type: 'code', code: cs`
int temperature = 38;

if (temperature > 35)
{
    Console.WriteLine("It's hot. Drink water!");
}
Console.WriteLine("Done");`, output: 'It\'s hot. Drink water!\nDone' },
      { type: 'h2', text: 'if / else: one of two paths' },
      { type: 'code', code: cs`
int age = 16;

if (age >= 18)
{
    Console.WriteLine("You can vote.");
}
else
{
    Console.WriteLine($"Wait {18 - age} more years.");
}`, output: 'Wait 2 more years.' },
      { type: 'h2', text: 'else if: many paths, first match wins' },
      { type: 'p', text: 'Chain conditions with `else if`. C# checks them in order and runs **only the first** branch whose condition is true; the rest are skipped. Drag the slider and watch:' },
      { type: 'widget', name: 'if-flow' },
      { type: 'note', kind: 'warn', text: 'Order matters. If you checked `marks >= 50` first, a student with 95 would get “C”, because that condition is already true and the others are never checked. Put the most specific (highest) condition first.' },
      { type: 'h2', text: 'Combining conditions' },
      { type: 'code', code: cs`
int age = 25;
bool hasLicence = true;

if (age >= 18 && hasLicence)
    Console.WriteLine("You may drive.");

string day = "Sunday";
if (day == "Saturday" || day == "Sunday")
    Console.WriteLine("Weekend!");`, output: 'You may drive.\nWeekend!' },
      { type: 'h2', text: 'Nested if' },
      { type: 'code', code: cs`
bool loggedIn = true;
bool isAdmin = false;

if (loggedIn)
{
    if (isAdmin)
        Console.WriteLine("Admin dashboard");
    else
        Console.WriteLine("User dashboard");
}
else
{
    Console.WriteLine("Please log in");
}`, output: 'User dashboard' },
      { type: 'note', kind: 'tip', text: 'Braces `{ }` are optional when a branch has a single statement, but many teams always use them. It prevents bugs when someone later adds a second line that looks indented but is not inside the `if`.' },
      { type: 'h2', text: 'The ternary operator ? :' },
      { type: 'p', text: 'For a simple “choose one of two values”, `condition ? valueIfTrue : valueIfFalse` is shorter than a full if/else.' },
      { type: 'code', code: cs`
int stock = 0;
string label = stock > 0 ? "In stock" : "Sold out";
Console.WriteLine(label);`, output: 'Sold out' },
      { type: 'h2', text: 'Common mistakes' },
      { type: 'ul', items: [
        '`if (x = 5)`: assignment, not comparison. Use `==`. (C# reports an error here.)',
        '`if (x > 5);` with a semicolon: the `if` controls an empty statement, and the block below always runs.',
        'Comparing decimals with `==`: `0.1 + 0.2 == 0.3` is `false` for `double`. Compare with a tolerance or use `decimal`.'
      ] },
      { type: 'quiz', question: 'With `int x = 80;`, what prints?\n`if (x > 50) Console.Write("A"); else if (x > 70) Console.Write("B"); else Console.Write("C");`', options: ['A', 'B', 'AB', 'C'], answer: 0, explain: '`x > 50` is already true, so “A” prints and the remaining branches are skipped.' },
      { type: 'quiz', question: 'What does `int n = 7; string s = n % 2 == 0 ? "even" : "odd";` store in `s`?', options: ['"even"', '"odd"', '"7"', 'true'], answer: 1, explain: '7 % 2 is 1, so the condition is false and the second value, “odd”, is chosen.' },
      { type: 'exercise', task: 'Read a year from the user and print whether it is a leap year. A year is a leap year if it is divisible by 4, except years divisible by 100, unless they are also divisible by 400 (2000 is, 1900 is not).', hint: '`(year % 4 == 0 && year % 100 != 0) || year % 400 == 0`', solution: cs`
Console.Write("Year: ");
if (int.TryParse(Console.ReadLine(), out int year))
{
    bool leap = (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;
    Console.WriteLine(leap ? $"{year} is a leap year" : $"{year} is not a leap year");
}
else
{
    Console.WriteLine("Invalid year");
}`, output: 'Year: 2024\n2024 is a leap year' }
    ],
    keyPoints: [
      '`if` runs a block only when its condition is `true`; `else` handles the rest.',
      'In an `else if` chain only the first true branch runs, so order matters.',
      'Combine conditions with `&&`, `||`, `!`.',
      'Use `cond ? a : b` to choose between two values.'
    ]
  },

  // ------------------------------------------------------------------ 8
  {
    slug: 'switch',
    title: 'switch statements and expressions',
    summary: 'Pick one of many cases cleanly with switch, use the modern switch expression, and match ranges with patterns.',
    minutes: 11,
    blocks: [
      { type: 'p', text: 'When one value can match many exact options (a menu choice, a day number, a status code), a long `else if` chain gets hard to read. `switch` compares one value against a list of **cases**.' },
      { type: 'widget', name: 'switch-match' },
      { type: 'h2', text: 'The switch statement' },
      { type: 'code', title: 'Menu.cs', code: cs`
Console.Write("Choose 1-3: ");
string? choice = Console.ReadLine();

switch (choice)
{
    case "1":
        Console.WriteLine("New project");
        break;
    case "2":
        Console.WriteLine("Open project");
        break;
    case "3":
        Console.WriteLine("Exit");
        break;
    default:
        Console.WriteLine("Unknown option");
        break;
}`, output: 'Choose 1-3: 2\nOpen project' },
      { type: 'ul', items: [
        'Each `case` ends with `break` (or `return` / `throw`). C# does not let one case “fall through” into the next by accident.',
        '`default` runs when no case matches. It is optional, but almost always a good idea.',
        'You can switch on `int`, `string`, `char`, `enum`, `bool` and more.'
      ] },
      { type: 'h2', text: 'Several cases, one action' },
      { type: 'code', code: cs`
char grade = 'B';
switch (grade)
{
    case 'A':
    case 'B':
        Console.WriteLine("Great work");
        break;
    case 'C':
        Console.WriteLine("Good");
        break;
    default:
        Console.WriteLine("Keep practising");
        break;
}`, output: 'Great work' },
      { type: 'h2', text: 'The switch expression (C# 8+)' },
      { type: 'p', text: 'When each case just **produces a value**, the switch expression is much shorter. Each arm is `pattern => result`, arms are separated by commas, and `_` is the “anything else” arm.' },
      { type: 'code', code: cs`
int day = 6;
string type = day switch
{
    6 or 7 => "Weekend",
    >= 1 and <= 5 => "Weekday",
    _ => "Invalid"
};
Console.WriteLine(type);`, output: 'Weekend' },
      { type: 'p', text: 'Patterns like `>= 1 and <= 5` (relational patterns) and `6 or 7` let one arm match a range or several values.' },
      { type: 'code', title: 'Shipping.cs', code: cs`
decimal weightKg = 3.2m;
decimal cost = weightKg switch
{
    <= 1m => 50m,
    <= 5m => 120m,
    <= 20m => 300m,
    _ => 800m
};
Console.WriteLine($"Shipping: Rs {cost}");`, output: 'Shipping: Rs 120' },
      { type: 'note', kind: 'tip', text: 'Use if/else for conditions on different variables or complex logic. Use switch when you test one value against many options.' },
      { type: 'quiz', question: 'In a switch expression, what does the `_` arm mean?', options: ['An error', 'Match anything not matched above', 'Match an empty string', 'Match zero'], answer: 1, explain: '`_` is the discard pattern: the catch-all, like `default`.' },
      { type: 'quiz', question: 'What happens if you leave out `break` at the end of a non-empty `case` in C#?', options: ['It falls through to the next case', 'Compile error', 'The program crashes at run time', 'Nothing'], answer: 1, explain: 'C# requires each non-empty section to end with break, return, throw or goto (error CS0163).' },
      { type: 'exercise', task: 'Write a switch expression that converts a month number (1–12) into its number of days in a non-leap year. Return -1 for invalid input.', hint: 'Group months: `2 => 28`, `4 or 6 or 9 or 11 => 30`, `>= 1 and <= 12 => 31`.', solution: cs`
int month = 9;
int days = month switch
{
    2 => 28,
    4 or 6 or 9 or 11 => 30,
    >= 1 and <= 12 => 31,
    _ => -1
};
Console.WriteLine(days);`, output: '30' }
    ],
    keyPoints: [
      '`switch` compares one value to many cases; `default` catches the rest.',
      'Every case section ends with `break` (no accidental fall-through).',
      'Switch expressions (`x switch { ... }`) return a value and are concise.',
      'Patterns: `or`, `and`, `<`, `>=` and `_` (anything).'
    ]
  },

  // ------------------------------------------------------------------ 9
  {
    slug: 'loops',
    title: 'Loops: for, while, do-while, foreach',
    summary: 'Repeat work without copying code. See exactly how a loop runs, step by step, and learn which loop to choose.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'Printing 1 to 100 with 100 `WriteLine` lines would be silly. A **loop** repeats a block of code while a condition is true. Each repetition is called an **iteration**.' },
      { type: 'h2', text: 'The for loop' },
      { type: 'p', text: 'Use `for` when you know how many times to repeat. Its header has three parts separated by semicolons: **start**; **condition**; **update**.' },
      { type: 'code', code: cs`
for (int i = 1; i <= 5; i++)
{
    Console.Write(i + " ");
}`, output: '1 2 3 4 5' },
      { type: 'p', text: 'The order is the important part: start runs once, then **check → body → update → check → body → update…** until the check is false. Step through it yourself:' },
      { type: 'widget', name: 'loop-stepper' },
      { type: 'h2', text: 'The while loop' },
      { type: 'p', text: 'Use `while` when you don’t know in advance how many times to repeat. You only know when to stop.' },
      { type: 'code', title: 'Doubling.cs', code: cs`
int money = 1000;
int years = 0;

while (money < 2000)
{
    money += money * 10 / 100;   // 10% interest
    years++;
}
Console.WriteLine($"Doubled after {years} years: {money}");`, output: 'Doubled after 8 years: 2142' },
      { type: 'note', kind: 'warn', text: 'An **infinite loop** happens when the condition never becomes false, usually because you forgot to update the variable (`i++`). The program freezes. Press Ctrl+C to stop a console app.' },
      { type: 'h2', text: 'The do-while loop' },
      { type: 'p', text: '`do...while` checks the condition **after** the body, so the body always runs at least once. Perfect for “ask until the input is valid”.' },
      { type: 'code', title: 'AskAge.cs', code: cs`
int age;
do
{
    Console.Write("Enter age (1-120): ");
} while (!int.TryParse(Console.ReadLine(), out age) || age < 1 || age > 120);

Console.WriteLine($"Thanks! Age = {age}");`, output: 'Enter age (1-120): abc\nEnter age (1-120): 200\nEnter age (1-120): 24\nThanks! Age = 24' },
      { type: 'h2', text: 'The foreach loop' },
      { type: 'p', text: '`foreach` visits every item of a collection (an array, a list, the characters of a string) without any index counting. It is the simplest and safest loop for reading items.' },
      { type: 'code', code: cs`
string[] members = { "Column", "Beam", "Brace" };
foreach (string m in members)
{
    Console.WriteLine($"Checking {m}");
}

foreach (char ch in "C#")
    Console.WriteLine(ch);`, output: 'Checking Column\nChecking Beam\nChecking Brace\nC\n#' },
      { type: 'h2', text: 'Which loop should I use?' },
      { type: 'table', head: ['Loop', 'Use when', 'Runs at least once?'], rows: [
        ['`for`', 'You know the count, or need the index', 'No'],
        ['`while`', 'You repeat until something happens', 'No'],
        ['`do-while`', 'The body must run once first (menus, input)', 'Yes'],
        ['`foreach`', 'You read every item of a collection', 'No']
      ] },
      { type: 'h2', text: 'Counting down and stepping' },
      { type: 'code', code: cs`
for (int i = 10; i >= 0; i -= 2)
    Console.Write(i + " ");`, output: '10 8 6 4 2 0' },
      { type: 'quiz', question: 'How many times does `for (int i = 0; i < 5; i++)` run its body?', options: ['4', '5', '6', 'Forever'], answer: 1, explain: 'i takes the values 0, 1, 2, 3, 4: five iterations. When i becomes 5, `i < 5` is false.' },
      { type: 'quiz', question: 'Which loop always runs its body at least once?', options: ['`for`', '`while`', '`do-while`', '`foreach`'], answer: 2, explain: '`do-while` checks its condition after the body.' },
      { type: 'exercise', task: 'Print the multiplication table of a number entered by the user, from 1 to 10, like “7 x 3 = 21”.', solution: cs`
Console.Write("Number: ");
int n = int.Parse(Console.ReadLine() ?? "0");

for (int i = 1; i <= 10; i++)
{
    Console.WriteLine($"{n} x {i} = {n * i}");
}`, output: 'Number: 7\n7 x 1 = 7\n7 x 2 = 14\n...\n7 x 10 = 70' },
      { type: 'exercise', task: 'Using a while loop, find how many digits a positive number has (e.g. 40512 has 5 digits).', hint: 'Keep dividing by 10 with integer division and count how many times until the number becomes 0.', solution: cs`
int number = 40512;
int digits = 0;
while (number > 0)
{
    number /= 10;
    digits++;
}
Console.WriteLine(digits);`, output: '5' }
    ],
    keyPoints: [
      '`for (start; condition; update)`: check → body → update, repeated.',
      '`while` repeats while a condition is true; `do-while` runs at least once.',
      '`foreach` reads every item in a collection without an index.',
      'Always make sure the condition can become false, or the loop never ends.'
    ]
  },

  // ------------------------------------------------------------------ 10
  {
    slug: 'arrays',
    title: 'Arrays',
    summary: 'Store many values of the same type in one variable, access them by index, loop through them, and use the Array helpers.',
    minutes: 13,
    blocks: [
      { type: 'p', text: 'Imagine storing the marks of 60 students in 60 separate variables. An **array** solves this: one variable holding a fixed-size, ordered row of values of the **same type**. Each value is an **element**, reached by its **index**, starting at 0.' },
      { type: 'widget', name: 'array-viz' },
      { type: 'h2', text: 'Creating arrays' },
      { type: 'code', code: cs`
int[] scores = new int[5];                 // 5 slots, all 0
string[] names = new string[3];            // 3 slots, all null
int[] marks = { 45, 80, 62, 90, 73 };      // create and fill
double[] prices = new double[] { 9.5, 12.0 };

Console.WriteLine(marks.Length);   // 5
Console.WriteLine(marks[0]);       // first: 45
Console.WriteLine(marks[^1]);      // last (index from end): 73`, output: '5\n45\n73' },
      { type: 'note', kind: 'info', text: 'New arrays are filled with **default values**: `0` for numbers, `false` for bool, `\\0` for char and `null` for strings and other reference types.' },
      { type: 'h2', text: 'Reading and writing elements' },
      { type: 'code', code: cs`
int[] marks = { 45, 80, 62, 90, 73 };
marks[2] = 65;             // change the third element
int first = marks[0];
// marks[5] = 10;          // IndexOutOfRangeException: last index is 4
Console.WriteLine(string.Join(", ", marks));`, output: '45, 80, 65, 90, 73' },
      { type: 'note', kind: 'warn', text: 'An array of length N has indexes **0 to N-1**. Using `array[array.Length]` is the classic off-by-one error.' },
      { type: 'h2', text: 'Looping through an array' },
      { type: 'code', title: 'Stats.cs', code: cs`
int[] marks = { 45, 80, 62, 90, 73 };

int total = 0;
int highest = marks[0];
foreach (int m in marks)
{
    total += m;
    if (m > highest) highest = m;
}
double average = (double)total / marks.Length;

Console.WriteLine($"Total {total}, average {average:F1}, highest {highest}");

// Use for when you need the index:
for (int i = 0; i < marks.Length; i++)
    Console.WriteLine($"Student {i + 1}: {marks[i]}");`, output: 'Total 350, average 70.0, highest 90\nStudent 1: 45\nStudent 2: 80\n...' },
      { type: 'h2', text: 'Useful Array helpers' },
      { type: 'table', head: ['Code', 'Does'], rows: [
        ['`Array.Sort(a)`', 'sorts the array in place (smallest first)'],
        ['`Array.Reverse(a)`', 'reverses the order in place'],
        ['`Array.IndexOf(a, x)`', 'index of `x`, or -1'],
        ['`a.Contains(x)`', '`true` if found (needs `using System.Linq;`, included by default)'],
        ['`a.Max()`, `a.Min()`, `a.Sum()`, `a.Average()`', 'quick statistics (LINQ)'],
        ['`string.Join(", ", a)`', 'turn the array into one string']
      ] },
      { type: 'h2', text: 'Arrays are reference types' },
      { type: 'code', code: cs`
int[] a = { 1, 2, 3 };
int[] b = a;        // b points to the SAME array, not a copy
b[0] = 99;
Console.WriteLine(a[0]);   // 99!

int[] c = (int[])a.Clone();  // a real copy
c[1] = 0;
Console.WriteLine(a[1]);   // still 2`, output: '99\n2' },
      { type: 'note', kind: 'tip', text: 'Arrays have a fixed size. When you need to add and remove items, use `List<T>`, covered in the collections lesson.' },
      { type: 'quiz', question: 'For `int[] a = new int[4];`, what is the last valid index?', options: ['4', '3', '5', '0'], answer: 1, explain: 'Indexes go from 0 to Length - 1, so 0 to 3.' },
      { type: 'quiz', question: 'What is in `new bool[3]` right after creation?', options: ['null, null, null', 'true, true, true', 'false, false, false', 'Nothing, it is empty'], answer: 2, explain: 'Elements get the default value of their type, and `default(bool)` is `false`.' },
      { type: 'exercise', task: 'Given `int[] nums = { 4, 9, 2, 7, 9, 1 };`, count how many numbers are even and print the largest value and its index.', solution: cs`
int[] nums = { 4, 9, 2, 7, 9, 1 };
int evens = 0, maxIndex = 0;

for (int i = 0; i < nums.Length; i++)
{
    if (nums[i] % 2 == 0) evens++;
    if (nums[i] > nums[maxIndex]) maxIndex = i;
}
Console.WriteLine($"Even numbers: {evens}");
Console.WriteLine($"Largest: {nums[maxIndex]} at index {maxIndex}");`, output: 'Even numbers: 2\nLargest: 9 at index 1' }
    ],
    keyPoints: [
      'An array holds a fixed number of same-type values: `int[] a = { 1, 2, 3 };`.',
      'Indexes run from 0 to `Length - 1`; outside that throws `IndexOutOfRangeException`.',
      'Loop with `foreach` to read, `for` when you need the index.',
      'Assigning an array copies the reference, not the elements.'
    ]
  },

  // ------------------------------------------------------------------ 11
  {
    slug: 'methods',
    title: 'Methods and the call stack',
    summary: 'Package code into reusable methods with parameters and return values, and see how the call stack runs them.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'A **method** is a named block of code that does one job. You write it once and **call** it whenever you need it. Methods make programs shorter, easier to read and easier to fix: a bug fixed in a method is fixed everywhere it is used.' },
      { type: 'h2', text: 'Anatomy of a method' },
      { type: 'code', title: 'Area.cs', code: cs`
//  return type   name      parameters
static double RectangleArea(double width, double height)
{
    double area = width * height;
    return area;              // send the result back to the caller
}

double a = RectangleArea(4, 2.5);   // call it with arguments
Console.WriteLine(a);
Console.WriteLine(RectangleArea(10, 3));`, output: '10\n30' },
      { type: 'table', head: ['Part', 'Meaning'], rows: [
        ['`static`', 'can be called without creating an object (explained in the OOP module)'],
        ['return type', 'the type of value it gives back, or `void` for nothing'],
        ['name', 'PascalCase verb phrase: `CalculateTax`, `PrintReport`'],
        ['parameters', 'inputs the method needs, each with a type'],
        ['`return`', 'ends the method and hands a value back']
      ] },
      { type: 'h2', text: 'Parameters vs arguments' },
      { type: 'p', text: '**Parameters** are the variables in the method definition (`width`, `height`). **Arguments** are the actual values you pass in the call (`4`, `2.5`). Arguments are matched to parameters by position.' },
      { type: 'h2', text: 'void methods' },
      { type: 'code', code: cs`
static void PrintLine(char symbol, int length)
{
    Console.WriteLine(new string(symbol, length));
}

PrintLine('=', 20);
Console.WriteLine("  REPORT");
PrintLine('=', 20);`, output: '====================\n  REPORT\n====================' },
      { type: 'h2', text: 'What happens when you call a method' },
      { type: 'p', text: 'The CLR keeps a **call stack**. Each call pushes a **frame** holding that call’s parameters and local variables. When the method returns, its frame is popped and those variables disappear. Step through a program that calls methods inside methods:' },
      { type: 'widget', name: 'call-stack' },
      { type: 'note', kind: 'info', text: 'This is why a local variable in one method can’t be seen from another: it lives in that method’s own frame. It is also why infinite recursion ends in a `StackOverflowException`: frames keep being pushed until the stack is full.' },
      { type: 'h2', text: 'Expression-bodied methods' },
      { type: 'code', code: cs`
static int Square(int x) => x * x;
static bool IsEven(int n) => n % 2 == 0;

Console.WriteLine(Square(7));
Console.WriteLine(IsEven(7));`, output: '49\nFalse' },
      { type: 'h2', text: 'Overloading: same name, different parameters' },
      { type: 'code', code: cs`
static int Add(int a, int b) => a + b;
static double Add(double a, double b) => a + b;
static int Add(int a, int b, int c) => a + b + c;

Console.WriteLine(Add(2, 3));       // int version
Console.WriteLine(Add(2.5, 1.2));   // double version
Console.WriteLine(Add(1, 2, 3));    // three-parameter version`, output: '5\n3.7\n6' },
      { type: 'h2', text: 'Good method habits' },
      { type: 'ul', items: [
        'One method, one job. If you need “and” to describe it, split it.',
        'Keep methods short: ideally they fit on one screen.',
        'Name methods with verbs: `GetTotal`, `ValidateInput`, `SaveFile`.',
        'Return results instead of printing inside calculation methods, so they can be reused.'
      ] },
      { type: 'quiz', question: 'What does a `void` method return?', options: ['0', 'null', 'Nothing', 'An empty string'], answer: 2, explain: '`void` means the method returns no value. You call it for what it does, not for a result.' },
      { type: 'quiz', question: 'Method A calls B, and B calls C. While C is running, how many frames for these methods are on the call stack?', options: ['1', '2', '3', '0'], answer: 2, explain: 'A, B and C each have a frame. C is on top; B and A are waiting for their calls to return.' },
      { type: 'exercise', task: 'Write a method `static bool IsPrime(int n)` that returns true if n is a prime number, then print all primes from 1 to 30 using a loop.', hint: 'Numbers below 2 are not prime. Try dividing n by every number from 2 up to the square root of n; if any divides exactly, it is not prime.', solution: cs`
static bool IsPrime(int n)
{
    if (n < 2) return false;
    for (int d = 2; d * d <= n; d++)
    {
        if (n % d == 0) return false;
    }
    return true;
}

for (int i = 1; i <= 30; i++)
{
    if (IsPrime(i)) Console.Write(i + " ");
}`, output: '2 3 5 7 11 13 17 19 23 29' }
    ],
    keyPoints: [
      'A method is reusable code: `returnType Name(parameters) { ... return value; }`.',
      'Parameters are placeholders; arguments are the values passed in the call.',
      'Each call gets a stack frame for its locals, removed when it returns.',
      'Overloads share a name but have different parameter lists.'
    ]
  }
];
