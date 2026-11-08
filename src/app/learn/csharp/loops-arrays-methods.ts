import { Lesson } from '../learn.types';
import { cs } from './cs';

export const LOOPS_ARRAYS_METHODS: Lesson[] = [
  // ------------------------------------------------------------------ break / continue
  {
    slug: 'break-continue',
    title: 'break, continue and nested loops',
    summary: 'Control a loop from the inside: stop it early with break, skip one round with continue, and put loops inside loops.',
    minutes: 12,
    blocks: [
      { type: 'p', text: 'Sometimes you don’t want every iteration. You might want to **stop as soon as you find something**, or **skip items you don’t care about**. Two keywords do this: `break` and `continue`.' },
      { type: 'table', head: ['Keyword', 'What it does'], rows: [
        ['`break`', 'Leaves the loop immediately. Execution continues after the loop’s closing brace.'],
        ['`continue`', 'Skips the rest of this iteration and jumps to the next one (in a `for`, the update `i++` still runs).']
      ] },
      { type: 'widget', name: 'loop-control' },
      { type: 'h2', text: 'break: stop when you have the answer' },
      { type: 'code', title: 'FindFirst.cs', code: cs`
int[] loads = { 12, 18, 25, 40, 33 };
int limit = 30;
int position = -1;

for (int i = 0; i < loads.Length; i++)
{
    if (loads[i] > limit)
    {
        position = i;
        break;          // found it: no need to check the rest
    }
}
Console.WriteLine(position >= 0 ? $"First overload at index {position}" : "All OK");`, output: 'First overload at index 3' },
      { type: 'p', text: 'Without `break` the loop would carry on to the end and `position` would end up as the **last** match, not the first.' },
      { type: 'h2', text: 'continue: skip what you don’t need' },
      { type: 'code', title: 'SkipInvalid.cs', code: cs`
string[] inputs = { "10", "abc", "25", "", "5" };
int sum = 0;

foreach (string s in inputs)
{
    if (!int.TryParse(s, out int n))
        continue;       // ignore anything that isn't a number

    sum += n;
}
Console.WriteLine($"Sum of valid numbers: {sum}");`, output: 'Sum of valid numbers: 40' },
      { type: 'note', kind: 'tip', text: '`continue` near the top of a loop (a “guard”) keeps the main code un-indented and easy to read, instead of wrapping everything in a big `if`.' },
      { type: 'h2', text: 'Loops inside loops' },
      { type: 'p', text: 'A **nested loop** is a loop inside the body of another loop. For **every single** iteration of the outer loop, the inner loop runs completely.' },
      { type: 'code', title: 'Table.cs', code: cs`
for (int row = 1; row <= 3; row++)
{
    for (int col = 1; col <= 4; col++)
    {
        Console.Write($"{row * col,4}");   // ,4 = right-align in 4 spaces
    }
    Console.WriteLine();                     // new line after each row
}`, output: '   1   2   3   4\n   2   4   6   8\n   3   6   9  12' },
      { type: 'p', text: 'The outer loop runs 3 times and the inner loop 4 times for each, so the inner body runs **3 × 4 = 12** times. Nested loops multiply, so keep an eye on performance with big data.' },
      { type: 'h2', text: 'Patterns with nested loops' },
      { type: 'code', title: 'Triangle.cs', code: cs`
int height = 4;
for (int i = 1; i <= height; i++)
{
    for (int j = 1; j <= i; j++)
        Console.Write("* ");
    Console.WriteLine();
}`, output: '* \n* * \n* * * \n* * * * ' },
      { type: 'h2', text: 'break only leaves ONE loop' },
      { type: 'p', text: 'In nested loops, `break` exits only the **innermost** loop it is in. To stop both, use a flag variable, or put the loops in a method and `return`.' },
      { type: 'code', title: 'FindPair.cs', code: cs`
int[] nums = { 3, 8, 1, 6 };
int target = 9;
bool found = false;

for (int i = 0; i < nums.Length && !found; i++)
{
    for (int j = i + 1; j < nums.Length; j++)
    {
        if (nums[i] + nums[j] == target)
        {
            Console.WriteLine($"{nums[i]} + {nums[j]} = {target}");
            found = true;
            break;      // leaves the inner loop; the flag stops the outer one
        }
    }
}`, output: '3 + 6 = 9' },
      { type: 'note', kind: 'warn', text: 'In a `while` loop, putting `continue` before the line that updates the counter creates an infinite loop, because the update is skipped every time. In `for` loops the update is in the header, so this can’t happen.' },
      { type: 'quiz', question: 'What does this print?\n`for (int i = 1; i <= 5; i++) { if (i == 3) continue; Console.Write(i); }`', options: ['12', '1245', '12345', '345'], answer: 1, explain: 'When i is 3, `continue` skips the Write, then the loop carries on with 4 and 5.' },
      { type: 'quiz', question: 'An outer loop runs 5 times and its inner loop runs 10 times per outer iteration. How many times does the inner body run?', options: ['15', '10', '50', '5'], answer: 2, explain: 'Nested loops multiply: 5 × 10 = 50.' },
      { type: 'exercise', task: 'Print all numbers from 1 to 30, but skip numbers divisible by 3, and stop completely when you reach a number greater than 20 that is divisible by 7.', hint: 'Check the stop condition first (`i > 20 && i % 7 == 0` → break), then the skip condition (`i % 3 == 0` → continue).', solution: cs`
for (int i = 1; i <= 30; i++)
{
    if (i > 20 && i % 7 == 0) break;
    if (i % 3 == 0) continue;
    Console.Write(i + " ");
}`, output: '1 2 4 5 7 8 10 11 13 14 16 17 19 20' }
    ],
    keyPoints: [
      '`break` leaves the loop now; `continue` skips to the next iteration.',
      'In nested loops the inner loop runs fully for every outer iteration.',
      '`break` exits only the innermost loop; use a flag or `return` to leave all.',
      'In `while` loops, update the counter before any `continue`.'
    ]
  },

  // ------------------------------------------------------------------ 2D arrays
  {
    slug: 'multidimensional-arrays',
    title: 'Multi-dimensional and jagged arrays',
    summary: 'Store tables and grids with 2D arrays, rows of different lengths with jagged arrays, and loop through both.',
    minutes: 13,
    blocks: [
      { type: 'p', text: 'A normal array is one row of values. Many things are **tables**: seats in a theatre, pixels in an image, a chess board, the floors and grid lines of a building. C# has two ways to store them.' },
      { type: 'widget', name: 'grid-2d' },
      { type: 'h2', text: 'Rectangular (2D) arrays: int[,]' },
      { type: 'p', text: 'One comma inside the brackets means two dimensions: **rows** and **columns**. Every row has the same number of columns.' },
      { type: 'code', code: cs`
int[,] grid = new int[3, 4];     // 3 rows, 4 columns, all 0

int[,] seats =
{
    { 1, 2, 3, 4 },
    { 5, 6, 7, 8 },
    { 9, 10, 11, 12 }
};

Console.WriteLine(seats[1, 2]);          // row 1, column 2 → 7
seats[0, 0] = 100;
Console.WriteLine(seats.GetLength(0));   // rows: 3
Console.WriteLine(seats.GetLength(1));   // columns: 4
Console.WriteLine(seats.Length);         // all cells: 12`, output: '7\n3\n4\n12' },
      { type: 'note', kind: 'warn', text: 'For a 2D array, `Length` is the **total** number of cells (12), not the number of rows. Use `GetLength(0)` for rows and `GetLength(1)` for columns.' },
      { type: 'h2', text: 'Looping through a 2D array' },
      { type: 'code', title: 'RowTotals.cs', code: cs`
int[,] sales =
{
    { 5, 3, 8 },    // shop 0: Mon, Tue, Wed
    { 2, 7, 4 },    // shop 1
};

for (int r = 0; r < sales.GetLength(0); r++)
{
    int rowTotal = 0;
    for (int c = 0; c < sales.GetLength(1); c++)
    {
        rowTotal += sales[r, c];
    }
    Console.WriteLine($"Shop {r}: {rowTotal}");
}`, output: 'Shop 0: 16\nShop 1: 13' },
      { type: 'p', text: 'The outer loop walks the rows and the inner loop walks the columns of the current row. That is called **row-major order**; press “Nested loop order” in the diagram to watch it.' },
      { type: 'h2', text: 'Jagged arrays: int[][]' },
      { type: 'p', text: 'A jagged array is an **array of arrays**. Each row is its own separate array, so rows can have different lengths, like floors of a building with different numbers of rooms.' },
      { type: 'code', code: cs`
int[][] rooms = new int[3][];   // 3 rows, not created yet (null)
rooms[0] = new int[] { 101, 102 };
rooms[1] = new int[] { 201, 202, 203, 204 };
rooms[2] = new int[] { 301 };

Console.WriteLine(rooms[1][3]);       // 204 (note: [row][col])
Console.WriteLine(rooms.Length);      // 3 rows
Console.WriteLine(rooms[1].Length);   // 4 in row 1

foreach (int[] floor in rooms)
{
    Console.WriteLine(string.Join(" ", floor));
}`, output: '204\n3\n4\n101 102\n201 202 203 204\n301' },
      { type: 'table', head: ['', '2D array `int[,]`', 'Jagged array `int[][]`'], rows: [
        ['Shape', 'Perfect rectangle', 'Each row any length'],
        ['Access', '`a[r, c]`', '`a[r][c]`'],
        ['Rows / columns', '`GetLength(0)` / `GetLength(1)`', '`a.Length` / `a[r].Length`'],
        ['Created', 'All at once', 'Outer array first, then each row'],
        ['Typical use', 'Grids, matrices, boards', 'Uneven data, lines of text']
      ] },
      { type: 'note', kind: 'warn', text: 'With `new int[3][]` only the outer array exists. Using `rooms[0][0]` before `rooms[0] = new int[...]` throws a `NullReferenceException`.' },
      { type: 'h2', text: 'A matrix example' },
      { type: 'p', text: 'In BIM and 3D software, positions and rotations are stored in **matrices**: 2D arrays of numbers. Here is a 3×3 identity matrix, which leaves points unchanged:' },
      { type: 'code', title: 'Identity.cs', code: cs`
int size = 3;
double[,] identity = new double[size, size];
for (int i = 0; i < size; i++)
    identity[i, i] = 1;      // 1 on the diagonal, 0 elsewhere

for (int r = 0; r < size; r++)
{
    for (int c = 0; c < size; c++)
        Console.Write(identity[r, c] + " ");
    Console.WriteLine();
}`, output: '1 0 0 \n0 1 0 \n0 0 1 ' },
      { type: 'quiz', question: 'For `int[,] m = new int[4, 5];`, what is `m.Length`?', options: ['4', '5', '9', '20'], answer: 3, explain: '`Length` counts every cell: 4 × 5 = 20.' },
      { type: 'quiz', question: 'How do you read row 2, column 1 of a jagged array `j`?', options: ['`j[2, 1]`', '`j[2][1]`', '`j(2)(1)`', '`j[1][2]`'], answer: 1, explain: 'A jagged array is an array of arrays: pick the row array `j[2]`, then its element `[1]`.' },
      { type: 'exercise', task: 'Create a 3×3 `int[,]` with the values 1 to 9 and print the sum of the main diagonal (top-left to bottom-right) and the sum of each column.', solution: cs`
int[,] m =
{
    { 1, 2, 3 },
    { 4, 5, 6 },
    { 7, 8, 9 }
};

int diagonal = 0;
for (int i = 0; i < 3; i++) diagonal += m[i, i];
Console.WriteLine($"Diagonal: {diagonal}");

for (int c = 0; c < m.GetLength(1); c++)
{
    int colSum = 0;
    for (int r = 0; r < m.GetLength(0); r++) colSum += m[r, c];
    Console.WriteLine($"Column {c}: {colSum}");
}`, output: 'Diagonal: 15\nColumn 0: 12\nColumn 1: 15\nColumn 2: 18' }
    ],
    keyPoints: [
      '`int[,]` is a rectangular grid accessed with `a[row, col]`.',
      '`GetLength(0)` = rows, `GetLength(1)` = columns, `Length` = all cells.',
      '`int[][]` is an array of arrays; each row can be a different length.',
      'Use nested loops: outer over rows, inner over columns.'
    ]
  },

  // ------------------------------------------------------------------ parameters
  {
    slug: 'method-parameters',
    title: 'Parameters: ref, out, in, params, optional, named',
    summary: 'Understand how arguments are passed to methods and use every kind of parameter C# offers.',
    minutes: 16,
    blocks: [
      { type: 'p', text: 'In the methods lesson every parameter was a simple input. C# gives you more control: change the caller’s variable, return several values, accept any number of arguments, and skip arguments that have sensible defaults.' },
      { type: 'h2', text: 'By value (the default)' },
      { type: 'p', text: 'Normally a method receives a **copy** of each argument. Changing the parameter inside the method does not change the caller’s variable. Step through the diagram, then switch to `ref` and `out`:' },
      { type: 'widget', name: 'param-passing' },
      { type: 'h2', text: 'ref: let the method change your variable' },
      { type: 'code', title: 'Swap.cs', code: cs`
static void Swap(ref int a, ref int b)
{
    int temp = a;
    a = b;
    b = temp;
}

int x = 1, y = 2;
Swap(ref x, ref y);           // ref is required at the call too
Console.WriteLine($"x={x}, y={y}");`, output: 'x=2, y=1' },
      { type: 'ul', items: [
        'The variable must have a value **before** the call.',
        'You must write `ref` in both the method and the call, so readers can see the variable may change.'
      ] },
      { type: 'h2', text: 'out: return extra values' },
      { type: 'p', text: 'An `out` parameter is an output. The method **must** assign it before returning, and the caller doesn’t need to set it first. You have already used this: `int.TryParse(text, out int n)`.' },
      { type: 'code', title: 'MinMax.cs', code: cs`
static void MinMax(int[] values, out int min, out int max)
{
    min = values[0];
    max = values[0];
    foreach (int v in values)
    {
        if (v < min) min = v;
        if (v > max) max = v;
    }
}

MinMax(new[] { 7, 2, 9, 4 }, out int lo, out int hi);   // declare inline
Console.WriteLine($"min {lo}, max {hi}");`, output: 'min 2, max 9' },
      { type: 'note', kind: 'tip', text: 'For returning several values, modern C# often uses a **tuple** instead: `static (int Min, int Max) MinMax(int[] v)`. You will meet tuples in a later lesson. `out` is still everywhere in the `TryXxx` pattern.' },
      { type: 'h2', text: 'in: read-only by reference' },
      { type: 'p', text: '`in` passes a reference (no copy) but the method may **not** change it. It is a performance tool for large structs, such as a 3D matrix, that would be expensive to copy. For `int` or `double` it brings no benefit.' },
      { type: 'code', code: cs`
static double Length(in Vector3 v)    // no copy of the struct
{
    // v.X = 0;  // error: an 'in' parameter is read-only
    return Math.Sqrt(v.X * v.X + v.Y * v.Y + v.Z * v.Z);
}`, title: 'In.cs' },
      { type: 'h2', text: 'params: any number of arguments' },
      { type: 'code', title: 'Params.cs', code: cs`
static int Sum(params int[] numbers)
{
    int total = 0;
    foreach (int n in numbers) total += n;
    return total;
}

Console.WriteLine(Sum());                 // 0
Console.WriteLine(Sum(5));                // 5
Console.WriteLine(Sum(1, 2, 3, 4));       // 10
Console.WriteLine(Sum(new[] { 10, 20 })); // an array works too`, output: '0\n5\n10\n30' },
      { type: 'p', text: '`params` must be the **last** parameter, and there can be only one. `Console.WriteLine("{0} {1}", a, b)` and `string.Join` use it.' },
      { type: 'h2', text: 'Optional parameters' },
      { type: 'code', title: 'Optional.cs', code: cs`
static void Greet(string name, string greeting = "Hello", int times = 1)
{
    for (int i = 0; i < times; i++)
        Console.WriteLine($"{greeting}, {name}!");
}

Greet("Ravi");                    // uses both defaults
Greet("Ravi", "Welcome");         // times = 1
Greet("Ravi", "Hi", 2);`, output: 'Hello, Ravi!\nWelcome, Ravi!\nHi, Ravi!\nHi, Ravi!' },
      { type: 'p', text: 'Optional parameters have a default value and must come **after** all required ones. The default must be a compile-time constant (a number, string, `null`, `true`…).' },
      { type: 'h2', text: 'Named arguments' },
      { type: 'code', code: cs`
Greet("Ravi", times: 3);                       // skip greeting, set times
Greet(times: 2, name: "Selva");                // any order
CreateBeam(length: 6.0, depth: 0.45, width: 0.2);   // self-explaining call`, title: 'Named.cs' },
      { type: 'p', text: 'Naming arguments lets you skip optional ones in the middle, and makes calls with several numbers much easier to read: compare `CreateBeam(6.0, 0.45, 0.2)`.' },
      { type: 'h2', text: 'Summary' },
      { type: 'table', head: ['Kind', 'Caller writes', 'Must be set before call?', 'Method may change it?'], rows: [
        ['value (default)', '`F(x)`', 'yes', 'only its own copy'],
        ['`ref`', '`F(ref x)`', 'yes', 'yes, changes the caller’s variable'],
        ['`out`', '`F(out x)`', 'no', 'must assign it'],
        ['`in`', '`F(x)` or `F(in x)`', 'yes', 'no (read-only)'],
        ['`params`', '`F(1, 2, 3)`', '–', 'it is a new array'],
        ['optional', '`F()` or `F(5)`', '–', 'its own copy']
      ] },
      { type: 'note', kind: 'info', text: 'Arrays and objects are reference types. Passing one by value copies the **reference**, so the method can still change the elements of the caller’s array. `ref` would additionally let it replace the whole array.' },
      { type: 'quiz', question: 'Which parameter kind must the method assign before it returns?', options: ['`ref`', '`out`', '`in`', '`params`'], answer: 1, explain: 'An `out` parameter is a promise to produce a value, so the compiler checks it is always assigned.' },
      { type: 'quiz', question: 'Is `static void F(int a = 1, int b)` valid?', options: ['Yes', 'No: optional parameters must come after required ones', 'Only with `params`'], answer: 1, explain: 'Required parameters come first, then the optional ones.' },
      { type: 'exercise', task: 'Write `static bool TryDivide(int a, int b, out int result)` that returns false (and sets result to 0) when b is 0, otherwise stores a / b in result and returns true. Call it for 10 / 2 and 5 / 0.', solution: cs`
static bool TryDivide(int a, int b, out int result)
{
    if (b == 0)
    {
        result = 0;
        return false;
    }
    result = a / b;
    return true;
}

if (TryDivide(10, 2, out int r1)) Console.WriteLine(r1);
if (!TryDivide(5, 0, out _)) Console.WriteLine("Cannot divide by zero");`, output: '5\nCannot divide by zero' }
    ],
    keyPoints: [
      'By default arguments are copied (passed by value).',
      '`ref` shares the caller’s variable; `out` returns an extra value; `in` is read-only by reference.',
      '`params` accepts any number of arguments as an array (last parameter only).',
      'Optional parameters have defaults; named arguments make calls clear.'
    ]
  },

  // ------------------------------------------------------------------ recursion
  {
    slug: 'recursion',
    title: 'Recursion',
    summary: 'A method that calls itself: base cases, recursive cases, how the call stack handles it, and when to use a loop instead.',
    minutes: 14,
    blocks: [
      { type: 'p', text: '**Recursion** means a method calls itself to solve a smaller version of the same problem. It sounds strange at first, but many problems are naturally defined this way: folders contain folders, a tree’s branches have branches, and a structure’s assembly contains sub-assemblies.' },
      { type: 'h2', text: 'The two parts of every recursive method' },
      { type: 'ol', items: [
        '**Base case**: a simple input answered directly, without calling itself. This is what stops the recursion.',
        '**Recursive case**: the method calls itself with a **smaller** input that moves toward the base case.'
      ] },
      { type: 'p', text: 'Factorial is the classic example: `5! = 5 × 4 × 3 × 2 × 1`, which is the same as `5 × 4!`. So `n! = n × (n-1)!`, and `1! = 1` is the base case.' },
      { type: 'widget', name: 'recursion' },
      { type: 'p', text: 'Notice the two phases. On the way **down**, each call waits for the next. When the base case returns, the answers travel back **up**, and each waiting call finishes its multiplication. Every waiting call is a frame on the call stack.' },
      { type: 'h2', text: 'More examples' },
      { type: 'code', title: 'SumDigits.cs', code: cs`
// Sum of digits: 4096 → 4 + 0 + 9 + 6 = 19
static int SumDigits(int n)
{
    if (n < 10) return n;                // base case: one digit
    return n % 10 + SumDigits(n / 10);   // last digit + sum of the rest
}

Console.WriteLine(SumDigits(4096));`, output: '19' },
      { type: 'code', title: 'Power.cs', code: cs`
// x to the power of n, halving n each time (fast!)
static double Power(double x, int n)
{
    if (n == 0) return 1;
    double half = Power(x, n / 2);
    return n % 2 == 0 ? half * half : half * half * x;
}

Console.WriteLine(Power(2, 10));`, output: '1024' },
      { type: 'h2', text: 'When recursion goes wrong' },
      { type: 'code', code: cs`
static int Broken(int n)
{
    return n * Broken(n - 1);   // no base case!
}
// Broken(5) → Broken(4) → … → Broken(-10000) → …
// Process terminated: Stack overflow.`, title: 'Broken.cs' },
      { type: 'note', kind: 'warn', text: 'Every call adds a frame to the stack, and the stack is small (about 1 MB by default). A missing or unreachable base case, or very deep recursion (hundreds of thousands of levels), crashes with a `StackOverflowException`, which **cannot be caught**.' },
      { type: 'h2', text: 'Beware of repeated work' },
      { type: 'code', title: 'Fibonacci.cs', code: cs`
// Fibonacci: 0, 1, 1, 2, 3, 5, 8, 13 …
static long FibSlow(int n) => n < 2 ? n : FibSlow(n - 1) + FibSlow(n - 2);

static long FibFast(int n)
{
    long a = 0, b = 1;
    for (int i = 0; i < n; i++)
    {
        (a, b) = (b, a + b);
    }
    return a;
}

Console.WriteLine(FibFast(50));   // instant
// FibSlow(50) makes billions of calls: it takes minutes.`, output: '12586269025' },
      { type: 'p', text: '`FibSlow` calls itself twice per level, so it recomputes the same values again and again. The loop version computes each value once. Later, in the DSA course, you will learn **memoization**, which fixes this while keeping the recursive style.' },
      { type: 'h2', text: 'Recursion or a loop?' },
      { type: 'table', head: ['Use recursion when…', 'Use a loop when…'], rows: [
        ['The data is a tree or nested structure (folders, menus, assemblies, JSON)', 'You simply repeat steps over a range or list'],
        ['The problem splits into smaller copies of itself (divide and conquer, sorting)', 'The depth could be very large'],
        ['The recursive version is much clearer', 'Performance matters and the loop is just as clear']
      ] },
      { type: 'code', title: 'FolderSize.cs', code: cs`
// A natural fit: total size of a folder and all its sub-folders
static long FolderSize(DirectoryInfo dir)
{
    long size = 0;
    foreach (FileInfo f in dir.GetFiles())
        size += f.Length;
    foreach (DirectoryInfo sub in dir.GetDirectories())
        size += FolderSize(sub);        // the same problem, one level down
    return size;
}`, },
      { type: 'quiz', question: 'What stops a recursive method from calling itself forever?', options: ['The return type', 'The base case', 'The garbage collector', 'A try/catch block'], answer: 1, explain: 'The base case answers directly without another call. Each recursive call must move closer to it.' },
      { type: 'quiz', question: 'What does `SumDigits(305)` return with the method above?', options: ['8', '305', '35', '15'], answer: 0, explain: '5 + SumDigits(30) = 5 + (0 + SumDigits(3)) = 5 + 0 + 3 = 8.' },
      { type: 'exercise', task: 'Write a recursive method `static string Reverse(string s)` that returns the string reversed (e.g. "steel" → "leets").', hint: 'Base case: a string of length 0 or 1 is its own reverse. Recursive case: the last character + Reverse(everything except the last character).', solution: cs`
static string Reverse(string s)
{
    if (s.Length <= 1) return s;
    return s[^1] + Reverse(s[..^1]);   // last char + reverse of the rest
}

Console.WriteLine(Reverse("steel"));`, output: 'leets' }
    ],
    keyPoints: [
      'A recursive method calls itself on a smaller input.',
      'Always have a base case, and make every call move toward it.',
      'Each pending call is a stack frame; too deep means StackOverflowException.',
      'Prefer recursion for nested/tree data; prefer loops for simple repetition.'
    ]
  },

  // ------------------------------------------------------------------ debugging
  {
    slug: 'debugging',
    title: 'Debugging in Visual Studio',
    summary: 'Stop guessing: pause your program with breakpoints, step line by line, inspect variables and find bugs fast.',
    minutes: 13,
    blocks: [
      { type: 'p', text: 'Every programmer writes bugs. Good programmers find them quickly. Adding `Console.WriteLine` everywhere works for tiny programs, but a **debugger** lets you pause a running program at any line and look inside it: every variable, every call.' },
      { type: 'h2', text: 'Three kinds of errors' },
      { type: 'table', head: ['Kind', 'When you see it', 'Example'], rows: [
        ['Compile error', 'Before the program runs (red squiggles, Error List)', 'missing `;`, wrong type, typo in a name'],
        ['Runtime exception', 'The program crashes while running', '`IndexOutOfRangeException`, `DivideByZeroException`'],
        ['Logic error', 'It runs but gives the wrong answer', 'wrong loop start, integer division, `<` instead of `<=`']
      ] },
      { type: 'p', text: 'Logic errors are the hardest because nothing tells you about them. The debugger is the tool for exactly this. Try it: the program below should print an average of 133.33, but it doesn’t.' },
      { type: 'widget', name: 'debugger' },
      { type: 'h2', text: 'Breakpoints' },
      { type: 'p', text: 'A **breakpoint** tells the debugger: “pause here, before running this line”. In Visual Studio click in the grey margin left of a line, or press **F9**. A red dot appears. Then start with **F5** (Start Debugging).' },
      { type: 'h2', text: 'The keys you will use every day' },
      { type: 'table', head: ['Key', 'Command', 'What it does'], rows: [
        ['**F5**', 'Start / Continue', 'Run until the next breakpoint (or the end)'],
        ['**F9**', 'Toggle Breakpoint', 'Add or remove a breakpoint on the current line'],
        ['**F10**', 'Step Over', 'Run the current line, including any method it calls, and pause on the next line'],
        ['**F11**', 'Step Into', 'If the line calls your method, go inside it'],
        ['**Shift+F11**', 'Step Out', 'Finish the current method and pause back in the caller'],
        ['**Shift+F5**', 'Stop Debugging', 'End the program'],
        ['**Ctrl+F10**', 'Run to Cursor', 'Run until the line where your cursor is']
      ] },
      { type: 'h2', text: 'Look inside while paused' },
      { type: 'ul', items: [
        '**Hover** over any variable to see its value in a tooltip (DataTip). You can even pin it.',
        '**Locals** window: all variables in the current method.',
        '**Autos** window: variables used on the current and previous lines.',
        '**Watch** window: type any variable or expression (like `total / 3.0`) and see its value update as you step.',
        '**Call Stack** window: which methods called which to get here (the stack frames you saw in the methods lesson). Double-click a frame to see its variables.',
        '**Immediate** window: run small expressions while paused, e.g. `prices.Length`.'
      ] },
      { type: 'h2', text: 'Conditional breakpoints' },
      { type: 'p', text: 'If a bug happens only on the 500th loop iteration, stopping 500 times is painful. Right-click the red dot → **Conditions** and enter something like `i == 499` or `total < 0`. The debugger then pauses only when the condition is true.' },
      { type: 'h2', text: 'When an exception is thrown' },
      { type: 'p', text: 'While debugging, an unhandled exception pauses execution on the exact line that failed and shows the **Exception Helper**: the exception type, its message and a “View Details” link with the stack trace. Read the message carefully. It usually names the problem exactly.' },
      { type: 'code', code: cs`
int[] data = { 1, 2, 3 };
for (int i = 0; i <= data.Length; i++)   // <= is the bug
{
    Console.WriteLine(data[i]);          // debugger stops here when i == 3
}`, output: '1\n2\n3\nSystem.IndexOutOfRangeException: Index was outside the bounds of the array.', title: 'Crash.cs' },
      { type: 'h2', text: 'A debugging routine that works' },
      { type: 'ol', items: [
        '**Reproduce** the bug reliably: find the exact input that causes it.',
        '**Form a guess**: where could the wrong value come from?',
        '**Pause before** that point with a breakpoint and check your guess in Locals or Watch.',
        '**Step** forward until a value differs from what you expected. The bug is in the line you just ran.',
        '**Fix** one thing, then run again to confirm, including the inputs that worked before.'
      ] },
      { type: 'note', kind: 'tip', text: 'Explaining your code line by line, out loud, to someone else (or to a rubber duck on your desk) often reveals the bug before you even open the debugger. Programmers really call this “rubber duck debugging”.' },
      { type: 'note', kind: 'info', text: 'Debug vs Release: Visual Studio builds in **Debug** configuration by default, which keeps your code easy to step through. Ship the **Release** build: it is optimised and faster, but harder to debug.' },
      { type: 'quiz', question: 'You are paused on a line that calls your own method `CalculateTax()`. Which key goes inside that method?', options: ['F5', 'F10', 'F11', 'F9'], answer: 2, explain: 'F11 (Step Into) enters the method. F10 (Step Over) would run it completely and stop on the next line.' },
      { type: 'quiz', question: 'A program runs without crashing but prints a wrong total. What kind of error is this?', options: ['Compile error', 'Runtime exception', 'Logic error'], answer: 2, explain: 'It runs and finishes, but the logic is wrong. The debugger helps you find where values go wrong.' },
      { type: 'exercise', task: 'This method should return the largest number in an array, but `Largest(new[] { -5, -2, -9 })` returns 0. Find the bug (you can reason it through like a debugger: what is `max` before the loop?) and fix it.\n`static int Largest(int[] a) { int max = 0; foreach (int x in a) if (x > max) max = x; return max; }`', hint: 'Step through it mentally with the input -5, -2, -9. Is any number greater than the starting value of max?', solution: cs`
static int Largest(int[] a)
{
    int max = a[0];              // start from a real element, not 0
    foreach (int x in a)
        if (x > max) max = x;
    return max;
}

Console.WriteLine(Largest(new[] { -5, -2, -9 }));`, output: '-2' }
    ],
    keyPoints: [
      'Compile errors stop the build; exceptions crash at run time; logic errors give wrong results.',
      'F9 sets a breakpoint, F5 runs to it, F10 steps over, F11 steps into.',
      'Use Locals, Watch and Call Stack to see what the program really holds.',
      'Reproduce → guess → pause → step → fix → re-test.'
    ]
  }
];
