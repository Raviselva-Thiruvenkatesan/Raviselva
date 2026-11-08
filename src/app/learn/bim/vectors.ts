import { Lesson } from '../learn.types';
import { cs } from '../csharp/cs';

export const VECTORS: Lesson[] = [
  // ------------------------------------------------------------------ 1
  {
    slug: 'points-vs-vectors',
    title: 'Points vs vectors',
    summary: 'A point is a position; a vector is a step with a direction and a length. Learn the four rules that connect them, and why keeping them apart prevents a whole class of bugs.',
    minutes: 12,
    blocks: [
      { type: 'p', text: 'Both are written as a list of numbers, such as (6, 3), so it is easy to treat them as the same thing. They are not. A **point** is a position: the start of a wall, the centre of a column, the corner of a slab. A **vector** is a **displacement**: “6 m east and 3 m north”. It has a **direction** and a **length**, but no position. You can draw the same vector starting anywhere.' },
      { type: 'p', text: 'Drag A and B, then move both together with the buttons. The coordinates of the points change; the vector between them does not.' },
      { type: 'widget', name: 'point-vector' },
      { type: 'h2', text: 'The four rules' },
      { type: 'table', head: ['Expression', 'Result', 'Meaning'], rows: [
        ['point − point', 'vector', 'B − A is the step that takes you from A to B'],
        ['point + vector', 'point', 'A + v is where you land after taking step v from A'],
        ['vector ± vector', 'vector', 'two steps combined, or one step undone'],
        ['point + point', 'meaningless', '“the wall start plus the column centre” is not a place']
      ] },
      { type: 'p', text: 'There is one useful exception to the last rule. A **weighted average** of points is fine as long as the weights add up to 1. The midpoint is ½A + ½B, which is really A + ½(B − A): a point plus a vector. The same idea gives any point along a wall: A + t(B − A), where t = 0 is A and t = 1 is B.' },
      { type: 'h2', text: 'Points in a BIM model, and vectors' },
      { type: 'table', head: ['Points (positions)', 'Vectors (directions and steps)'], rows: [
        ['Wall start and end points', 'A wall’s direction'],
        ['A door’s insertion point', 'A door’s facing (which way it opens)'],
        ['Column centres, slab corners', 'A face normal (which way a face points)'],
        ['The survey point, the project base point', 'The offset of a “Move” command'],
        ['Grid intersections', 'True north, the direction to the sun']
      ] },
      { type: 'p', text: 'The difference shows up as soon as you **move** something. Moving a building 10 m east changes every point in it, but a wall’s direction, a face’s normal and the direction to the sun stay exactly the same. A rotation, on the other hand, changes both. The Matrices module uses this: points and vectors are transformed by different rules, and mixing them up shifts normals off their faces.' },
      { type: 'h2', text: 'Let the compiler keep them apart' },
      { type: 'p', text: 'Many APIs use one type for both (the Revit API’s `XYZ`, `System.Numerics.Vector3`), so nothing stops you from adding two points. If you write your own types, you can make the four rules the only operations that compile:' },
      { type: 'code', title: 'PointsAndVectors.cs', code: cs`
var a = new Pt(2, 1);
var b = new Pt(8, 4);

Vec v = b - a;                        // point - point = vector
Console.WriteLine($"v = {v}");

var east = new Vec(10, 0);
Pt a2 = a + east, b2 = b + east;      // point + vector = point
Console.WriteLine($"Moved: {a2} to {b2}");
Console.WriteLine($"v after the move = {b2 - a2}");

// Pt nonsense = a + b;               // does not compile: no Pt + Pt operator

readonly record struct Pt(double X, double Y)
{
    public static Vec operator -(Pt a, Pt b) => new(a.X - b.X, a.Y - b.Y);
    public static Pt operator +(Pt p, Vec v) => new(p.X + v.X, p.Y + v.Y);
    public override string ToString() => $"({X}, {Y})";
}

readonly record struct Vec(double X, double Y)
{
    public override string ToString() => $"<{X}, {Y}>";
}`, output: 'v = <6, 3>\nMoved: (12, 1) to (18, 4)\nv after the move = <6, 3>' },
      { type: 'note', kind: 'info', text: 'Two separate types are a design choice, not a rule. Most geometry libraries use a single vector type for speed and simplicity, and you will do the same in the `Vec3` lesson at the end of this module. What matters is that **you** always know which one a variable holds; good names (`start`, `offset`, `normal`) do most of the work.' },
      { type: 'note', kind: 'tip', text: 'Graphics and BIM transforms often store points as (x, y, z, **1**) and vectors as (x, y, z, **0**). With that fourth number, a single matrix moves points but leaves vectors alone. You will meet this in the homogeneous-transforms lesson.' },
      { type: 'quiz', question: 'Which of these is a vector, not a point?', options: [
        'The corner of a floor slab',
        'The outward normal of a wall face',
        'The survey point',
        'A door’s insertion point'
      ], answer: 1, explain: 'A normal says which way a face points; it has a direction and a length but no position. The other three are locations.' },
      { type: 'quiz', question: 'You move a whole building 5 m east. What happens?', options: [
        'Wall end points change; wall directions stay the same',
        'Wall directions change; wall end points stay the same',
        'Both change',
        'Neither changes'
      ], answer: 0, explain: 'Moving (translating) shifts every position by the same vector, so B − A for each wall is unchanged. Only a rotation would change the directions.' },
      { type: 'exercise', task: 'A beam runs from (1, 2) to (9, 6). Using `Pt` and `Vec` with a new `Vec * double` operator, print the positions of three hangers at ¼, ½ and ¾ of the way along it.', hint: 'Each hanger is start + (end − start) × t, with t = 0.25, 0.5 and 0.75. Add `operator *(Vec v, double k)` to `Vec`.', solution: cs`
var start = new Pt(1, 2);
var end = new Pt(9, 6);
Vec span = end - start;

for (int i = 1; i <= 3; i++)
    Console.WriteLine($"Hanger {i}: {start + span * (i / 4.0)}");

readonly record struct Pt(double X, double Y)
{
    public static Vec operator -(Pt a, Pt b) => new(a.X - b.X, a.Y - b.Y);
    public static Pt operator +(Pt p, Vec v) => new(p.X + v.X, p.Y + v.Y);
    public override string ToString() => $"({X}, {Y})";
}

readonly record struct Vec(double X, double Y)
{
    public static Vec operator *(Vec v, double k) => new(v.X * k, v.Y * k);
}`, output: 'Hanger 1: (3, 3)\nHanger 2: (5, 4)\nHanger 3: (7, 5)' }
    ],
    keyPoints: [
      'A **point** is a position; a **vector** is a displacement with a direction and a length, but no position.',
      'point − point = vector, point + vector = point, vector ± vector = vector; point + point is meaningless.',
      'Weighted averages of points are fine when the weights add up to 1: A + t(B − A) is any point along AB.',
      'Moving a model changes its points but not its directions and normals; rotating changes both.',
      'Separate types, or at least clear names, keep the two from being mixed up.'
    ]
  },

  // ------------------------------------------------------------------ 2
  {
    slug: 'vector-arithmetic',
    title: 'Adding, subtracting and scaling vectors',
    summary: 'Add vectors head to tail, subtract them to get relative positions, and scale them to stretch or flip. Then use all three to route a pipe, lay out a column grid and set out a stair.',
    minutes: 12,
    blocks: [
      { type: 'p', text: 'Vectors have just three basic operations, and all three work **component by component**: do the same thing to the X parts, the Y parts and the Z parts. That is all the arithmetic you need for most of this course.' },
      { type: 'table', head: ['Operation', 'Rule', 'Picture'], rows: [
        ['a + b', '(a.x + b.x, a.y + b.y, a.z + b.z)', 'walk along a, then along b'],
        ['a − b', '(a.x − b.x, a.y − b.y, a.z − b.z)', 'the step from b’s tip to a’s tip'],
        ['k × a', '(k·a.x, k·a.y, k·a.z)', 'stretch by k; a negative k also flips it']
      ] },
      { type: 'widget', name: 'vector-add' },
      { type: 'h2', text: 'Adding: chaining steps' },
      { type: 'p', text: 'A pipe run is a chain of straight runs. Each run is a vector, and the pipe’s end is its start **plus** every run added up. The order does not matter for where you end up (a + b = b + a), which the widget’s parallelogram shows: both routes round it meet at the same corner.' },
      { type: 'code', title: 'PipeRun.cs', code: cs`
using V3 = (double X, double Y, double Z);

static V3 Add(V3 a, V3 b) => (a.X + b.X, a.Y + b.Y, a.Z + b.Z);

V3[] runs = { (3, 0, 0), (0, 2, 0), (0, 0, 1.5), (-1, 0, 0) };

V3 total = (0, 0, 0);
foreach (V3 run in runs) total = Add(total, run);

V3 start = (10, 4, 2.5);
Console.WriteLine($"Total displacement: {total}");
Console.WriteLine($"Pipe ends at: {Add(start, total)}");`, output: 'Total displacement: (2, 2, 1.5)\nPipe ends at: (12, 6, 4)' },
      { type: 'h2', text: 'Subtracting: where is it relative to me?' },
      { type: 'p', text: 'Subtraction answers “where is B as seen from A?”. Setting-out drawings are full of these: a column’s offset from a grid intersection, a sleeve’s position relative to a slab corner, a fixture’s position relative to a room origin.' },
      { type: 'code', title: 'Offset.cs', code: cs`
using V2 = (double X, double Y);

V2 gridC3 = (12, 6);
V2 column = (12.5, 7.25);

V2 offset = (column.X - gridC3.X, column.Y - gridC3.Y);
Console.WriteLine($"Column is {offset} from grid C/3");`, output: 'Column is (0.5, 1.25) from grid C/3' },
      { type: 'h2', text: 'Scaling: repeats and arrays' },
      { type: 'p', text: 'Scaling a vector by a whole number repeats a step. An “array” command in a BIM tool is exactly this: the i-th copy sits at **start + i × spacing**. A two-way grid uses two spacing vectors, one per direction.' },
      { type: 'code', title: 'ColumnGrid.cs', code: cs`
using V2 = (double X, double Y);

static V2 Add(V2 a, V2 b) => (a.X + b.X, a.Y + b.Y);
static V2 Scale(V2 v, double k) => (v.X * k, v.Y * k);

V2 origin = (0, 0);
V2 along = (7.5, 0);      // bay spacing in X
V2 across = (0, 6);       // bay spacing in Y

for (int j = 0; j < 2; j++)
{
    var row = new List<string>();
    for (int i = 0; i < 3; i++)
        row.Add(Add(origin, Add(Scale(along, i), Scale(across, j))).ToString());
    Console.WriteLine(string.Join("  ", row));
}`, output: '(0, 0)  (7.5, 0)  (15, 0)\n(0, 6)  (7.5, 6)  (15, 6)' },
      { type: 'note', kind: 'tip', text: 'Nothing in that loop assumes the grid is square to the axes. Make `along` and `across` point in rotated directions and the same code lays out a rotated grid. Writing positions as start + combinations of vectors, rather than as raw X and Y numbers, is what keeps geometry code general.' },
      { type: 'h2', text: 'The rules you can rely on' },
      { type: 'ul', items: [
        '**Order does not matter for adding:** a + b = b + a, and (a + b) + c = a + (b + c).',
        '**Subtracting is adding the opposite:** a − b = a + (−1)b. But a − b = −(b − a), so order matters here.',
        '**Scaling spreads over adding:** k(a + b) = ka + kb. Scaling everything about the origin keeps every shape the same, just bigger or smaller.',
        '**The zero vector** (0, 0, 0) is “no step”. It is the only vector with no direction, and it will need special care when you normalise.'
      ] },
      { type: 'quiz', question: 'a = (2, 1) and b = (−1, 3). What is a + b?', options: ['(1, 4)', '(3, −2)', '(−2, 3)', '(1, 2)'], answer: 0, explain: 'Add the components: (2 + (−1), 1 + 3) = (1, 4).' },
      { type: 'quiz', question: 'What does multiplying a vector by −0.5 do?', options: [
        'Nothing; the direction is the same',
        'Halves its length and reverses its direction',
        'Doubles its length and reverses its direction',
        'Turns it by 90°'
      ], answer: 1, explain: 'The size 0.5 halves the length and the minus sign flips it to point the opposite way.' },
      { type: 'exercise', task: 'A straight stair starts at (2, 5, 0). Each of its 12 risers moves the walking line by (0.28, 0, 0.175): 280 mm forward and 175 mm up. Print the position of the top step with three decimals, and the total going and rise with two.', hint: 'The top is start + 12 × step. Format each component with `:F3`.', solution: cs`
using V3 = (double X, double Y, double Z);

static V3 Add(V3 a, V3 b) => (a.X + b.X, a.Y + b.Y, a.Z + b.Z);
static V3 Scale(V3 v, double k) => (v.X * k, v.Y * k, v.Z * k);

V3 bottom = (2, 5, 0);
V3 step = (0.28, 0, 0.175);
V3 top = Add(bottom, Scale(step, 12));

Console.WriteLine($"Top: ({top.X:F3}, {top.Y:F3}, {top.Z:F3})");
Console.WriteLine($"Going: {12 * step.X:F2} m, rise: {12 * step.Z:F2} m");`, output: 'Top: (5.360, 5.000, 2.100)\nGoing: 3.36 m, rise: 2.10 m' }
    ],
    keyPoints: [
      'Add, subtract and scale vectors **component by component**.',
      'a + b chains two steps (head to tail); the order does not change where you end up.',
      'B − A is the position of B **relative to** A: offsets, setting-out dimensions, local positions.',
      'k × v stretches v by k; a negative k also reverses it. An array is start + i × spacing.',
      'Writing positions as start + combinations of vectors keeps code working for rotated layouts too.'
    ]
  },

  // ------------------------------------------------------------------ 3
  {
    slug: 'length-unit-vectors',
    title: 'Length, distance and unit vectors',
    summary: 'Pythagoras in 3D gives a vector’s length and the distance between points. Dividing by the length gives a unit vector, the tool for “move d metres in this direction”.',
    minutes: 13,
    blocks: [
      { type: 'h2', text: 'Length: Pythagoras in 3D' },
      { type: 'p', text: 'In 2D, the length of (x, y) is √(x² + y²): Pythagoras on the right-angled triangle formed by the two components. In 3D you use it twice, and the result is just as simple: **|v| = √(x² + y² + z²)**. The vertical bars mean “length of”; some books write ‖v‖.' },
      { type: 'p', text: 'The **distance** between two points is the length of the vector between them: **dist(A, B) = |B − A|**.' },
      { type: 'code', title: 'Distance.cs', code: cs`
using V3 = (double X, double Y, double Z);

static V3 Sub(V3 a, V3 b) => (a.X - b.X, a.Y - b.Y, a.Z - b.Z);
static double Length(V3 v) => Math.Sqrt(v.X * v.X + v.Y * v.Y + v.Z * v.Z);

V3 valve = (1, 2, 3);
V3 outlet = (4, 6, 15);

V3 pipe = Sub(outlet, valve);
Console.WriteLine($"Pipe vector: {pipe}");
Console.WriteLine($"Pipe length: {Length(pipe)} m");`, output: 'Pipe vector: (3, 4, 12)\nPipe length: 13 m' },
      { type: 'h2', text: 'Unit vectors: direction only' },
      { type: 'p', text: 'A **unit vector** has length exactly 1. It carries only a direction, which makes it the right tool for “go **d metres** that way”: d × u has length d. You get one by dividing a vector by its own length; this is called **normalising**, and the result is often written with a hat, û.' },
      { type: 'p', text: 'Below, a door is placed 1.2 m along a wall from A. Switch to the version that skips normalising and see how far off it lands.' },
      { type: 'widget', name: 'unit-vector' },
      { type: 'code', title: 'DoorOnWall.cs', code: cs`
using V2 = (double X, double Y);

V2 a = (2, 1), b = (8, 9);                 // wall location line
V2 d = (b.X - a.X, b.Y - a.Y);             // (6, 8)
double len = Math.Sqrt(d.X * d.X + d.Y * d.Y);
V2 u = (d.X / len, d.Y / len);             // length 1

double offset = 1.2;                       // door 1.2 m from A
V2 door = (a.X + u.X * offset, a.Y + u.Y * offset);

Console.WriteLine($"Wall length: {len} m");
Console.WriteLine($"Unit direction: {u}");
Console.WriteLine($"Door at: ({door.X:F2}, {door.Y:F2})");`, output: 'Wall length: 10 m\nUnit direction: (0.6, 0.8)\nDoor at: (2.72, 1.96)' },
      { type: 'note', kind: 'warn', text: 'The zero vector has length 0, so normalising it divides by zero. With doubles you do not get an exception, you get **NaN** coordinates, and they spread silently through every calculation they touch. Always check the length (against a tolerance, not against exactly 0) before dividing.' },
      { type: 'code', title: 'TryNormalize.cs', code: cs`
using V2 = (double X, double Y);

static bool TryNormalize(V2 v, out V2 unit)
{
    double len = Math.Sqrt(v.X * v.X + v.Y * v.Y);
    if (len < 1e-9) { unit = (0, 0); return false; }
    unit = (v.X / len, v.Y / len);
    return true;
}

foreach (V2 v in new V2[] { (3, 4), (0, 0) })
    Console.WriteLine(TryNormalize(v, out V2 u) ? $"{v} -> {u}" : $"{v} has no direction");`, output: '(3, 4) -> (0.6, 0.8)\n(0, 0) has no direction' },
      { type: 'h2', text: 'Squared length: skip the square root when you can' },
      { type: 'p', text: 'A square root is slow compared with a multiplication, and when you only **compare** distances you do not need it: if |a| < |b| then |a|² < |b|², and the other way round. “Which column is nearest to where the user clicked?” or “is anything within 0.5 m?” can use squared lengths throughout. Compare with 0.5² = 0.25, not with 0.5.' },
      { type: 'code', title: 'Nearest.cs', code: cs`
using V2 = (double X, double Y);

static double DistSq(V2 a, V2 b)
{
    double dx = b.X - a.X, dy = b.Y - a.Y;
    return dx * dx + dy * dy;
}

V2 click = (6.2, 3.9);
V2[] columns = { (0, 0), (7.5, 0), (0, 6), (7.5, 6), (15, 6) };

V2 best = columns[0];
foreach (V2 c in columns)
    if (DistSq(click, c) < DistSq(click, best)) best = c;

Console.WriteLine($"Nearest column: {best}, {Math.Sqrt(DistSq(click, best)):F2} m away");`, output: 'Nearest column: (7.5, 6), 2.47 m away' },
      { type: 'note', kind: 'info', text: 'BIM APIs have all of these built in. In the Revit API, an `XYZ` has `GetLength()`, `Normalize()` and `DistanceTo()`; `System.Numerics.Vector3` has `Length()`, `LengthSquared()`, `Vector3.Normalize` and `Vector3.Distance`. Knowing what they compute tells you when one is wasteful (a square root in a tight loop) or dangerous (normalising a zero vector).' },
      { type: 'quiz', question: 'What is the length of the vector (2, 3, 6)?', options: ['11', '7', '√11', '49'], answer: 1, explain: '√(4 + 9 + 36) = √49 = 7.' },
      { type: 'quiz', question: 'Why compare squared distances when looking for the nearest point?', options: [
        'They are more accurate',
        'They avoid a square root and give the same order',
        'They work for negative distances',
        'Square roots are not allowed in C#'
      ], answer: 1, explain: 'For non-negative numbers, a < b exactly when a² < b², so the nearest point is the same either way, and you skip a square root for every candidate.' },
      { type: 'exercise', task: 'A sprinkler pipe runs from (0, 0, 3) to (12, 9, 3). Place a sprinkler every 3 m along it, starting at the first end. Print each position with one decimal.', hint: 'The pipe is 15 m long and its unit direction is (0.8, 0.6, 0). Loop the distance s from 0 to the length in steps of 3; allow a tiny tolerance so the last one is not lost to rounding.', solution: cs`
using V3 = (double X, double Y, double Z);

V3 a = (0, 0, 3), b = (12, 9, 3);
V3 d = (b.X - a.X, b.Y - a.Y, b.Z - a.Z);
double len = Math.Sqrt(d.X * d.X + d.Y * d.Y + d.Z * d.Z);
V3 u = (d.X / len, d.Y / len, d.Z / len);

for (double s = 0; s <= len + 1e-9; s += 3)
    Console.WriteLine($"({a.X + u.X * s:F1}, {a.Y + u.Y * s:F1}, {a.Z + u.Z * s:F1})");`, output: '(0.0, 0.0, 3.0)\n(2.4, 1.8, 3.0)\n(4.8, 3.6, 3.0)\n(7.2, 5.4, 3.0)\n(9.6, 7.2, 3.0)\n(12.0, 9.0, 3.0)' }
    ],
    keyPoints: [
      '|v| = √(x² + y² + z²), and the distance between two points is |B − A|.',
      'A **unit vector** has length 1; normalise with v ÷ |v|. Then A + u × d is exactly d metres from A.',
      'Never normalise a zero (or nearly zero) vector: check the length against a tolerance first.',
      'Compare **squared** lengths when you only need to know which is nearer; it skips the square root.',
      'Forgetting to normalise is one of the most common geometry bugs: the step is |v| times too long.'
    ]
  },

  // ------------------------------------------------------------------ 4
  {
    slug: 'dot-product',
    title: 'The dot product: angles, projection, facing',
    summary: 'One multiplication tells you the angle between two directions, how far along a wall a point lies, and whether a face points towards the sun. The most useful line of code in geometry.',
    minutes: 16,
    blocks: [
      { type: 'p', text: 'The **dot product** of two vectors multiplies matching components and adds the results. The answer is a single number, not a vector:' },
      { type: 'p', text: '**a · b = a.x·b.x + a.y·b.y + a.z·b.z**' },
      { type: 'p', text: 'It is cheap (three multiplications and two additions), and it has a second, geometric meaning that makes it useful everywhere:' },
      { type: 'p', text: '**a · b = |a| |b| cos θ**, where θ is the angle between a and b.' },
      { type: 'widget', name: 'dot-product' },
      { type: 'h2', text: 'The sign alone says a lot' },
      { type: 'table', head: ['a · b', 'Angle', 'Meaning'], rows: [
        ['positive', 'less than 90°', 'roughly the same direction'],
        ['zero', 'exactly 90°', 'perpendicular'],
        ['negative', 'more than 90°', 'roughly opposite directions']
      ] },
      { type: 'p', text: 'You do not even need the lengths for this: the lengths are always positive, so the sign of a · b is the sign of cos θ. That makes “is this face pointing towards the camera?” or “is this wall perpendicular to that one?” a one-line check.' },
      { type: 'h2', text: 'The angle between two directions' },
      { type: 'p', text: 'Rearranging gives the angle: **θ = acos(a · b ÷ (|a| |b|))**. The result is always between 0° and 180°: the dot product does not know which way you turned, only how far. The cross product, in the next lesson, supplies the direction.' },
      { type: 'code', title: 'WallAngles.cs', code: cs`
using V2 = (double X, double Y);

static double Dot(V2 a, V2 b) => a.X * b.X + a.Y * b.Y;
static double Len(V2 v) => Math.Sqrt(Dot(v, v));

static double AngleDeg(V2 a, V2 b)
{
    double c = Dot(a, b) / (Len(a) * Len(b));
    c = Math.Clamp(c, -1, 1);          // rounding can give 1.0000000000000002
    return Math.Acos(c) * 180 / Math.PI;
}

V2 wall = (4, 0);
foreach (V2 other in new V2[] { (3, 3), (0, 5), (-2, -2) })
    Console.WriteLine($"Dot = {Dot(wall, other)}, angle = {AngleDeg(wall, other):F1} deg");`, output: 'Dot = 12, angle = 45.0 deg\nDot = 0, angle = 90.0 deg\nDot = -8, angle = 135.0 deg' },
      { type: 'note', kind: 'warn', text: '`Math.Acos` only accepts values from −1 to 1. Two nearly parallel vectors can produce a ratio of 1.0000000000000002 through rounding, and `Math.Acos` then returns NaN. Always **clamp** before calling it.' },
      { type: 'h2', text: 'Projection: how far along, how far off' },
      { type: 'p', text: 'If **u** is a unit vector, **v · u** is the length of v’s “shadow” on u’s line: how far v goes in u’s direction. That is the widget’s green arrow. In BIM terms, with u along a wall, it answers “how far along the wall is this point?”, which is how tools measure a door’s position, a pipe’s station or a dimension along a run.' },
      { type: 'p', text: 'Use the wall’s **perpendicular** instead (u turned 90°: (−u.y, u.x)) and the same dot product gives the signed distance **off** the wall line. Together, the two numbers are the point’s coordinates in the wall’s own system: a first taste of local coordinates.' },
      { type: 'code', title: 'AlongTheWall.cs', code: cs`
using V2 = (double X, double Y);

static double Dot(V2 a, V2 b) => a.X * b.X + a.Y * b.Y;

V2 a = (1, 1), b = (9, 7);                  // wall location line
V2 p = (6, 6);                              // a column centre

V2 ab = (b.X - a.X, b.Y - a.Y);             // (8, 6)
double len = Math.Sqrt(Dot(ab, ab));        // 10
V2 u = (ab.X / len, ab.Y / len);            // along the wall
V2 n = (-u.Y, u.X);                         // across it, to the left
V2 ap = (p.X - a.X, p.Y - a.Y);

double along = Dot(ap, u);
double across = Dot(ap, n);
V2 foot = (a.X + u.X * along, a.Y + u.Y * along);

Console.WriteLine($"Along the wall: {along:F2} m of {len} m");
Console.WriteLine($"Off the line: {across:F2} m (positive = left side)");
Console.WriteLine($"Nearest point on the line: ({foot.X:F2}, {foot.Y:F2})");`, output: 'Along the wall: 7.00 m of 10 m\nOff the line: 1.00 m (positive = left side)\nNearest point on the line: (6.60, 5.20)' },
      { type: 'p', text: 'If `along` is below 0 or above the wall’s length, the column lies beyond one end. The Lines and curves module turns this into a full closest-point routine for segments.' },
      { type: 'h2', text: 'Facing: which way does a face point?' },
      { type: 'p', text: 'Every face has a **normal**: a unit vector pointing straight out of it. Its dot product with another direction tells you how much the face points that way. With unit vectors, the dot product **is** cos θ, so it doubles as a “how much” score from −1 to 1. Solar studies, back-face culling in viewers and “which façade does this window belong to?” all use it.' },
      { type: 'code', title: 'SouthFacing.cs', code: cs`
using V2 = (double X, double Y);

static double Dot(V2 a, V2 b) => a.X * b.X + a.Y * b.Y;

V2 south = (0, -1);
var windows = new (string Name, V2 Normal)[]
{
    ("W1", (0, -1)), ("W2", (0.6, -0.8)), ("W3", (0.8, -0.6)), ("W4", (1, 0)), ("W5", (0, 1))
};
double limit = Math.Cos(45 * Math.PI / 180);      // within 45 deg of south

foreach (var w in windows)
{
    double d = Dot(w.Normal, south);
    string verdict = d >= limit ? "faces south" : d > 0 ? "partly south" : "no south sun";
    Console.WriteLine($"{w.Name}: dot = {d:F2} -> {verdict}");
}`, output: 'W1: dot = 1.00 -> faces south\nW2: dot = 0.80 -> faces south\nW3: dot = 0.60 -> partly south\nW4: dot = 0.00 -> no south sun\nW5: dot = -1.00 -> no south sun' },
      { type: 'note', kind: 'tip', text: 'Notice the trick: “within 45°” became “dot ≥ cos 45°”. Comparing with a precomputed cosine avoids calling `Acos` for every face, which matters when there are millions of them.' },
      { type: 'quiz', question: 'a · b is negative. What do you know about a and b?', options: [
        'They are perpendicular',
        'The angle between them is more than 90°',
        'One of them is the zero vector',
        'They have different lengths'
      ], answer: 1, explain: 'a · b = |a||b| cos θ, and cos θ is negative exactly when θ is between 90° and 180°.' },
      { type: 'quiz', question: 'u is a unit vector along a wall from A. For a point P, what does (P − A) · u give?', options: [
        'The distance from P to A',
        'How far along the wall P’s nearest point on the line is',
        'The angle between the wall and P',
        'Whether P is left or right of the wall'
      ], answer: 1, explain: 'The dot product with a unit vector is the projection: the length of P − A’s shadow on the wall’s line. Left or right needs the perpendicular (or the cross product).' },
      { type: 'exercise', task: 'Write `Relation(a, b)` that returns “perpendicular”, “parallel” or “at N deg” for two wall directions, using the dot product of their unit vectors and a tolerance of 1e-9. Test it on (4, 0) & (0, 3), (2, 2) & (−3, −3), (1, 0) & (1, 1) and (3, 4) & (−4, 3).', hint: 'Normalise both, take the dot product c. |c| near 0 means perpendicular; |c| near 1 means parallel (either way round). Otherwise clamp and use `Math.Acos`.', solution: cs`
using V2 = (double X, double Y);

static double Dot(V2 a, V2 b) => a.X * b.X + a.Y * b.Y;
static V2 Unit(V2 v) { double l = Math.Sqrt(Dot(v, v)); return (v.X / l, v.Y / l); }

static string Relation(V2 a, V2 b)
{
    const double tol = 1e-9;
    double c = Dot(Unit(a), Unit(b));
    if (Math.Abs(c) < tol) return "perpendicular";
    if (Math.Abs(Math.Abs(c) - 1) < tol) return "parallel";
    return $"at {Math.Acos(Math.Clamp(c, -1, 1)) * 180 / Math.PI:F1} deg";
}

Console.WriteLine(Relation((4, 0), (0, 3)));
Console.WriteLine(Relation((2, 2), (-3, -3)));
Console.WriteLine(Relation((1, 0), (1, 1)));
Console.WriteLine(Relation((3, 4), (-4, 3)));`, output: 'perpendicular\nparallel\nat 45.0 deg\nperpendicular' }
    ],
    keyPoints: [
      'a · b = a.x·b.x + a.y·b.y + a.z·b.z = |a||b| cos θ: one number, cheap to compute.',
      'Its **sign** says same direction (+), perpendicular (0) or opposite (−).',
      'θ = acos(a · b ÷ (|a||b|)); always **clamp** to [−1, 1] before `Acos`.',
      'With a unit vector u, v · u is v’s **projection**: how far along u it goes. With the perpendicular, how far off.',
      'With unit normals, the dot product scores how much a face points in a direction: compare it with a precomputed cosine.'
    ]
  },

  // ------------------------------------------------------------------ 5
  {
    slug: 'cross-product',
    title: 'The cross product: normals, area, left or right',
    summary: 'The cross product builds a vector perpendicular to two others. It gives face normals and areas in 3D, and in plan it tells you whether a point is left or right of a wall.',
    minutes: 16,
    blocks: [
      { type: 'p', text: 'The dot product turns two vectors into a number. The **cross product** turns two 3D vectors into a third vector:' },
      { type: 'p', text: '**a × b = (a.y·b.z − a.z·b.y,  a.z·b.x − a.x·b.z,  a.x·b.y − a.y·b.x)**' },
      { type: 'p', text: 'The formula is easiest to remember by its pattern: for the X part, use the Y and Z parts, and so on round the cycle X → Y → Z → X. What matters more is what the result **means**:' },
      { type: 'ul', items: [
        '**Direction:** a × b is perpendicular to both a and b, so it is perpendicular to the plane they lie in. That is exactly what a face normal is.',
        '**Which way:** it follows the right-hand rule. Fingers along a, curl towards b, and your thumb points along a × b. So x × y = z in a right-handed system.',
        '**Length:** |a × b| = |a| |b| sin θ, the **area of the parallelogram** spanned by a and b. Half of that is the area of the triangle.',
        '**Order matters:** b × a = −(a × b). Swapping the two flips the normal.',
        '**Parallel vectors give zero:** sin 0° = 0, so a × b = 0 is the standard test for parallel directions.'
      ] },
      { type: 'code', title: 'AxisCross.cs', code: cs`
using V3 = (double X, double Y, double Z);

static V3 Cross(V3 a, V3 b) =>
    (a.Y * b.Z - a.Z * b.Y, a.Z * b.X - a.X * b.Z, a.X * b.Y - a.Y * b.X);

Console.WriteLine($"X x Y = {Cross((1, 0, 0), (0, 1, 0))}");
Console.WriteLine($"Y x Z = {Cross((0, 1, 0), (0, 0, 1))}");
Console.WriteLine($"Y x X = {Cross((0, 1, 0), (1, 0, 0))}");`, output: 'X x Y = (0, 0, 1)\nY x Z = (1, 0, 0)\nY x X = (0, 0, -1)' },
      { type: 'h2', text: 'In plan: one number, two answers' },
      { type: 'p', text: 'For two vectors lying flat in the XY plane, the X and Y parts of the cross product are zero and only the Z part is left: **a.x·b.y − a.y·b.x**. This number is often called the **2D cross product** or the perp-dot product, and it is one of the most used expressions in plan geometry.' },
      { type: 'widget', name: 'cross-product' },
      { type: 'ul', items: [
        '**Its sign gives the turn:** positive when b is counter-clockwise from a (to its left), negative when clockwise (to its right), zero when they are parallel.',
        '**Its size gives the area:** the parallelogram’s area, or twice the triangle’s.',
        '**Side of a wall:** with a = B − A (the wall) and b = P − A, the sign says whether P is left or right of the wall as you walk from A to B. Divide by |B − A| and you get the distance from the line too.'
      ] },
      { type: 'code', title: 'WhichSide.cs', code: cs`
using V2 = (double X, double Y);

static double Cross(V2 a, V2 b) => a.X * b.Y - a.Y * b.X;

V2 a = (0, 0), b = (10, 0);                 // wall from A to B, walking east
V2[] points = { (4, 2), (4, -1.5), (12, 0) };

foreach (V2 p in points)
{
    double c = Cross((b.X - a.X, b.Y - a.Y), (p.X - a.X, p.Y - a.Y));
    string side = c > 1e-9 ? "left" : c < -1e-9 ? "right" : "on the line";
    Console.WriteLine($"{p}: cross = {c}, {side}");
}`, output: '(4, 2): cross = 20, left\n(4, -1.5): cross = -15, right\n(12, 0): cross = 0, on the line' },
      { type: 'note', kind: 'info', text: 'This little test is the engine behind a lot of later material: point-in-polygon checks, whether a polygon’s corners run clockwise, convex hulls, and segment intersection all reduce to “which side of this line is that point on?”.' },
      { type: 'h2', text: 'In 3D: the normal of a face' },
      { type: 'p', text: 'Take any three corners of a flat face, P0, P1 and P2. The two edges P1 − P0 and P2 − P0 lie in the face, so their cross product points straight out of it. Normalise it and you have the **unit normal**; take half its length and you have the **triangle’s area**. Here is a sloping roof face:' },
      { type: 'code', title: 'RoofNormal.cs', code: cs`
using V3 = (double X, double Y, double Z);

static V3 Sub(V3 a, V3 b) => (a.X - b.X, a.Y - b.Y, a.Z - b.Z);
static V3 Cross(V3 a, V3 b) =>
    (a.Y * b.Z - a.Z * b.Y, a.Z * b.X - a.X * b.Z, a.X * b.Y - a.Y * b.X);
static double Length(V3 v) => Math.Sqrt(v.X * v.X + v.Y * v.Y + v.Z * v.Z);

V3 p0 = (0, 0, 0), p1 = (4, 0, 0), p2 = (0, 4, 3);   // eaves corners and a ridge corner
V3 n = Cross(Sub(p1, p0), Sub(p2, p0));
double len = Length(n);
V3 unit = (n.X / len, n.Y / len, n.Z / len);

Console.WriteLine($"Cross: {n}");
Console.WriteLine($"Unit normal: {unit}");
Console.WriteLine($"Triangle area: {len / 2} square metres");
Console.WriteLine($"Roof slope: {Math.Acos(unit.Z) * 180 / Math.PI:F2} deg");`, output: 'Cross: (0, -12, 16)\nUnit normal: (0, -0.6, 0.8)\nTriangle area: 10 square metres\nRoof slope: 36.87 deg' },
      { type: 'p', text: 'The normal points up and towards −Y, so this roof face looks south (with Y as north): exactly what the dot-product solar check in the previous lesson needs. And the angle between the normal and straight up (0, 0, 1) is the roof’s slope: since both are unit vectors, their dot product is just `unit.Z`.' },
      { type: 'note', kind: 'warn', text: 'The direction of a computed normal depends on the **order** of the corners. Listed counter-clockwise when seen from outside, the cross product points outwards; listed clockwise, it points inwards. Mesh formats rely on this convention, and a mirrored family that reverses the order is a classic source of inside-out faces.' },
      { type: 'h2', text: 'Building a frame from one direction' },
      { type: 'p', text: 'Two cross products turn a single wall direction into a full set of axes for the wall: **side = dir × up** points to the wall’s right, and **up = side × dir** recovers a true vertical. This “frame from a direction” pattern is how tools orient doors, windows and section boxes, and you will use it in the Matrices module.' },
      { type: 'quiz', question: 'a × b = (0, 0, 6). What is b × a?', options: ['(0, 0, 6)', '(0, 0, −6)', '(6, 0, 0)', '0'], answer: 1, explain: 'The cross product is anti-commutative: swapping the order reverses the direction and keeps the length.' },
      { type: 'quiz', question: 'For a wall from A to B, the 2D cross product of B − A and P − A is negative. Where is P?', options: [
        'On the wall line',
        'To the left of the wall, walking from A to B',
        'To the right of the wall, walking from A to B',
        'Beyond B'
      ], answer: 2, explain: 'Negative means turning clockwise from the wall direction to P, which is the right-hand side. Left would be positive, and zero means on the line.' },
      { type: 'exercise', task: 'A roof plane is split into two triangles: (0,0,0)–(4,0,0)–(0,4,3) and (4,0,0)–(4,4,3)–(0,4,3). Write `TriangleArea(a, b, c)` using the cross product and print the total roof area.', hint: 'Area = |(b − a) × (c − a)| ÷ 2. Add the two areas. (Check: the plane is 4 m wide and 5 m up the slope.)', solution: cs`
using V3 = (double X, double Y, double Z);

static V3 Sub(V3 a, V3 b) => (a.X - b.X, a.Y - b.Y, a.Z - b.Z);
static V3 Cross(V3 a, V3 b) =>
    (a.Y * b.Z - a.Z * b.Y, a.Z * b.X - a.X * b.Z, a.X * b.Y - a.Y * b.X);
static double Length(V3 v) => Math.Sqrt(v.X * v.X + v.Y * v.Y + v.Z * v.Z);
static double TriangleArea(V3 a, V3 b, V3 c) => Length(Cross(Sub(b, a), Sub(c, a))) / 2;

var roof = new (V3 A, V3 B, V3 C)[]
{
    ((0, 0, 0), (4, 0, 0), (0, 4, 3)),
    ((4, 0, 0), (4, 4, 3), (0, 4, 3))
};

double total = 0;
foreach (var t in roof) total += TriangleArea(t.A, t.B, t.C);
Console.WriteLine($"Roof area: {total} square metres");`, output: 'Roof area: 20 square metres' }
    ],
    keyPoints: [
      'a × b is perpendicular to both a and b, follows the right-hand rule, and has length |a||b| sin θ.',
      'Order matters: b × a = −(a × b). Parallel vectors give the zero vector.',
      'The **2D cross product** a.x·b.y − a.y·b.x gives the turn direction (sign) and twice the triangle area (size).',
      'Its sign tells whether a point is **left or right** of a wall: the basis of point-in-polygon and intersection tests.',
      'The cross product of two edges gives a face’s **normal** and area; corner order decides which way the normal points.'
    ]
  },

  // ------------------------------------------------------------------ 6
  {
    slug: 'vec3-struct',
    title: 'Building a Vec3 struct in C#',
    summary: 'Put the whole module into one small, fast, immutable type: operators, length, normalising, dot and cross products, and tolerant comparison. It is the base for every later module.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'So far every sample has used tuples and loose helper functions. That is fine for a few lines, but real geometry code wants one well-designed type that reads like the maths: `a + b * 2`, `Vec3.Cross(e1, e2).Normalize()`. This lesson builds it, and the rest of the course uses it.' },
      { type: 'widget', name: 'vec3-calc' },
      { type: 'h2', text: 'Design decisions' },
      { type: 'table', head: ['Choice', 'Why'], rows: [
        ['`struct`, not `class`', 'Three doubles (24 bytes) copied by value: no heap allocation, no garbage collection, no null. Millions of vectors cost nothing extra.'],
        ['`readonly`', 'A vector never changes after it is made, like an `int`. No surprises when one is shared, and the compiler can skip defensive copies.'],
        ['`record struct`', 'Free equality, hashing, deconstruction and `with` expressions.'],
        ['`double`, not `float`', 'Model coordinates need the precision (see Units, precision and tolerance).'],
        ['Static `Dot` and `Cross`', 'They take two equal partners, so `Vec3.Dot(a, b)` reads better than `a.Dot(b)`. Avoid overloading `*` for them: “a * b” would be ambiguous.'],
        ['A tolerance-based `AlmostEquals`', 'The record’s `==` compares bit for bit, which is rarely what geometry wants.']
      ] },
      { type: 'h2', text: 'The struct' },
      { type: 'code', title: 'Vec3.cs', code: cs`
using System.Globalization;

var a = new Vec3(4, 3, 0);
var up = Vec3.UnitZ;

Console.WriteLine($"a          = {a}");
Console.WriteLine($"a.Length   = {a.Length}");
Console.WriteLine($"a + up * 2 = {a + up * 2}");
Console.WriteLine($"unit a     = {a.Normalize()}");
Console.WriteLine($"a . up     = {Vec3.Dot(a, up)}");
Console.WriteLine($"a x up     = {Vec3.Cross(a, up)}");
Console.WriteLine($"==         : {new Vec3(0.1 + 0.2, 0, 0) == new Vec3(0.3, 0, 0)}");
Console.WriteLine($"AlmostEquals: {new Vec3(0.1 + 0.2, 0, 0).AlmostEquals(new Vec3(0.3, 0, 0))}");

public readonly record struct Vec3(double X, double Y, double Z)
{
    public const double Tolerance = 1e-9;

    public static readonly Vec3 Zero = new(0, 0, 0);
    public static readonly Vec3 UnitX = new(1, 0, 0);
    public static readonly Vec3 UnitY = new(0, 1, 0);
    public static readonly Vec3 UnitZ = new(0, 0, 1);

    public static Vec3 operator +(Vec3 a, Vec3 b) => new(a.X + b.X, a.Y + b.Y, a.Z + b.Z);
    public static Vec3 operator -(Vec3 a, Vec3 b) => new(a.X - b.X, a.Y - b.Y, a.Z - b.Z);
    public static Vec3 operator -(Vec3 v) => new(-v.X, -v.Y, -v.Z);
    public static Vec3 operator *(Vec3 v, double k) => new(v.X * k, v.Y * k, v.Z * k);
    public static Vec3 operator *(double k, Vec3 v) => v * k;
    public static Vec3 operator /(Vec3 v, double k) => new(v.X / k, v.Y / k, v.Z / k);

    public double LengthSquared => X * X + Y * Y + Z * Z;
    public double Length => Math.Sqrt(LengthSquared);

    public static double Dot(Vec3 a, Vec3 b) => a.X * b.X + a.Y * b.Y + a.Z * b.Z;

    public static Vec3 Cross(Vec3 a, Vec3 b) =>
        new(a.Y * b.Z - a.Z * b.Y, a.Z * b.X - a.X * b.Z, a.X * b.Y - a.Y * b.X);

    public Vec3 Normalize()
    {
        double len = Length;
        if (len < Tolerance)
            throw new InvalidOperationException("Cannot normalise a zero-length vector.");
        return this / len;
    }

    public bool AlmostEquals(Vec3 o, double tol = Tolerance) =>
        Math.Abs(X - o.X) <= tol && Math.Abs(Y - o.Y) <= tol && Math.Abs(Z - o.Z) <= tol;

    public override string ToString() =>
        string.Create(CultureInfo.InvariantCulture, $"({X}, {Y}, {Z})");
}`, output: 'a          = (4, 3, 0)\na.Length   = 5\na + up * 2 = (4, 3, 2)\nunit a     = (0.8, 0.6, 0)\na . up     = 0\na x up     = (3, -4, 0)\n==         : False\nAlmostEquals: True' },
      { type: 'p', text: 'A few details are worth a second look:' },
      { type: 'ul', items: [
        '`a x up` is (3, −4, 0): the horizontal direction to the **right** of a wall running along a. Swap the order, `Cross(up, a)`, for the left side. Up to its sign, it is the perpendicular the very first widget of this course used to draw a wall’s outline.',
        '`Normalize` throws rather than returning NaNs. Code that can legitimately meet a zero vector should check `LengthSquared` first or offer a `TryNormalize`, as in the length lesson.',
        '`ToString` uses the **invariant culture**. Without it, a machine set to German or French prints “0,8”, and any file you write with it breaks.',
        '`LengthSquared` is public on purpose: distance comparisons should not pay for a square root.'
      ] },
      { type: 'note', kind: 'warn', text: 'A record struct’s `==` and `GetHashCode` use exact equality. `AlmostEquals` fixes comparisons, but tolerant equality cannot fix hashing: two points 1e-12 apart get different hash codes. To de-duplicate vertices, snap coordinates to a grid first (for example round to 0.01 mm) and hash the snapped values. The Master level’s spatial-query lesson returns to this.' },
      { type: 'h2', text: 'Why not just use System.Numerics.Vector3?' },
      { type: 'p', text: '`Vector3` is excellent for graphics: it is hardware-accelerated and has every operation above. But it stores **float**, which the precision lesson showed is not enough for coordinates a few hundred metres from the origin. Use it for rendering and for local, small-scale geometry; keep model coordinates in doubles. BIM APIs agree: the Revit API’s `XYZ` is a double-precision type with `DotProduct`, `CrossProduct`, `Normalize` and `IsAlmostEqualTo`, almost exactly the struct above.' },
      { type: 'quiz', question: 'Why is Vec3 a struct rather than a class?', options: [
        'Structs can have operators and classes cannot',
        'Small immutable values copied by value avoid heap allocations and null',
        'Records must be structs',
        'Classes cannot hold doubles'
      ], answer: 1, explain: 'A vector is a small value like a number. As a struct it lives inline (in arrays, on the stack), costs no garbage collection and can never be null. Classes can have operators too.' },
      { type: 'quiz', question: 'new Vec3(0.1 + 0.2, 0, 0) == new Vec3(0.3, 0, 0) is false. What is the right fix?', options: [
        'Use float instead of double',
        'Compare with a tolerance, as AlmostEquals does',
        'Round every coordinate to 1 decimal when it is created',
        'Make Vec3 a class'
      ], answer: 1, explain: 'Computed coordinates carry rounding error, so geometry compares within a tolerance. Rounding at creation would throw away real precision; snapping is only for hashing.' },
      { type: 'exercise', task: 'Add two members to `Vec3`: `AngleTo(Vec3 other)`, returning the angle in degrees (clamp before `Acos`), and `ProjectOnto(Vec3 onto)`, returning the part of this vector along `onto` (which need not be a unit vector). Print the angle from X to (1, 1, 0), the angle from Z to the roof normal (0, −0.6, 0.8), and (2.5, 1.25, 7) projected onto (3, 4, 0).', hint: 'Angle: acos(Dot ÷ (|a||b|)). Projection onto v: v × (Dot(this, v) ÷ v.LengthSquared). Dividing by the squared length saves normalising v.', solution: cs`
using System.Globalization;

Console.WriteLine($"{Vec3.UnitX.AngleTo(new Vec3(1, 1, 0)):F1} deg");
Console.WriteLine($"{Vec3.UnitZ.AngleTo(new Vec3(0, -0.6, 0.8)):F2} deg");
Console.WriteLine(new Vec3(2.5, 1.25, 7).ProjectOnto(new Vec3(3, 4, 0)));

public readonly record struct Vec3(double X, double Y, double Z)
{
    public static readonly Vec3 UnitX = new(1, 0, 0);
    public static readonly Vec3 UnitZ = new(0, 0, 1);

    public static Vec3 operator *(Vec3 v, double k) => new(v.X * k, v.Y * k, v.Z * k);
    public double LengthSquared => X * X + Y * Y + Z * Z;
    public double Length => Math.Sqrt(LengthSquared);
    public static double Dot(Vec3 a, Vec3 b) => a.X * b.X + a.Y * b.Y + a.Z * b.Z;

    public double AngleTo(Vec3 other)
    {
        double c = Dot(this, other) / (Length * other.Length);
        return Math.Acos(Math.Clamp(c, -1, 1)) * 180 / Math.PI;
    }

    public Vec3 ProjectOnto(Vec3 onto) => onto * (Dot(this, onto) / onto.LengthSquared);

    public override string ToString() =>
        string.Create(CultureInfo.InvariantCulture, $"({X}, {Y}, {Z})");
}`, output: '45.0 deg\n36.87 deg\n(1.5, 2, 0)' },
      { type: 'note', kind: 'tip', text: 'Next up is the Lines and curves module. A line is just a point plus a direction, P(t) = A + t·u, so everything there is built from this struct: closest points use the dot product, intersections use the cross product.' }
    ],
    keyPoints: [
      'Make `Vec3` a `readonly record struct` of three doubles: cheap, immutable, never null.',
      'Operators for +, −, unary −, × and ÷ by a number make code read like the maths; `Dot` and `Cross` are static.',
      '`Normalize` must reject zero-length vectors; expose `LengthSquared` for cheap comparisons.',
      'Exact `==` is rarely right for geometry: add a tolerance-based `AlmostEquals`, and snap before hashing.',
      'Format with the invariant culture, and keep model coordinates in double, not `Vector3`’s float.'
    ]
  }
];
