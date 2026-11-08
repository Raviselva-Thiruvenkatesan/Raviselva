import { Lesson } from '../learn.types';
import { cs } from '../csharp/cs';

export const LINES_CURVES: Lesson[] = [
  // ------------------------------------------------------------------ 1
  {
    slug: 'parametric-lines',
    title: 'Lines, rays and segments in parametric form',
    summary: 'One formula, P(t) = A + t·d, describes a line, a ray and a segment: only the allowed range of t changes. Learn to read t, to walk along a wall by distance, and why BIM tools never use y = mx + c.',
    minutes: 13,
    blocks: [
      { type: 'p', text: 'At school a line is **y = mx + c**. Geometry software almost never uses that form. It cannot describe a vertical line (m would be infinite), and in a plan, north–south walls are everywhere. It also has no simple 3D version. Instead, software uses the **parametric form**: a start point plus a multiple of a direction.' },
      { type: 'p', text: '**P(t) = A + t·d**. With d = B − A, the number t says how far along you are: t = 0 is A, t = 1 is B, t = 0.5 is the midpoint, t = 2 is as far past B as B is from A, and a negative t is behind A. Switch between line, ray and segment and watch which values of t are allowed.' },
      { type: 'widget', name: 'param-line' },
      { type: 'h2', text: 'One formula, three shapes' },
      { type: 'table', head: ['Shape', 'Allowed t', 'In a BIM model'], rows: [
        ['Line', 'any t', 'grid lines, reference planes seen in plan, axes of symmetry'],
        ['Ray', 't ≥ 0', 'a pick ray from the mouse, a line of sight, the ray in a point-in-polygon test'],
        ['Segment', '0 ≤ t ≤ 1', 'a wall’s location line, a pipe or duct run, a beam, a dimension']
      ] },
      { type: 'p', text: 'This is why the Revit API has a single `Line` class with `Line.CreateBound(p1, p2)` and `Line.CreateUnbound(origin, direction)`, and a `Curve.IsBound` property. A bound line is a segment and an unbound one is infinite: the same formula with a different range of t.' },
      { type: 'h2', text: 'Two choices of direction' },
      { type: 'table', head: ['Direction d', 't means', 'B is at', 'Use it when you think in'], rows: [
        ['B − A', 'a fraction of the way from A to B', 't = 1', 'proportions: the midpoint, thirds, 40% along'],
        ['the unit vector u', 'a distance from A, in model units', 't = |B − A|', 'distances: a door 1.2 m from the corner, a hanger every 1.5 m']
      ] },
      { type: 'p', text: 'The samples in this module use a small `V2` struct, the 2D cousin of the `Vec3` from the last module. It is repeated at the bottom of each sample, so every sample runs on its own.' },
      { type: 'code', title: 'Stations.cs', code: cs`
var a = new V2(2, 1);
var b = new V2(10, 7);
V2 d = b - a;                             // (8, 6): a 10 m wall

foreach (double t in new[] { 0, 0.25, 0.5, 1, 1.5 })
    Console.WriteLine($"t = {t,-4}  P = {a + d * t}");

V2 u = d * (1 / d.Length);                // unit direction (0.8, 0.6)
Console.WriteLine($"1.2 m along: {a + u * 1.2}");
Console.WriteLine($"3 m along:   {a + u * 3}");

readonly record struct V2(double X, double Y)
{
    public static V2 operator +(V2 a, V2 b) => new(a.X + b.X, a.Y + b.Y);
    public static V2 operator -(V2 a, V2 b) => new(a.X - b.X, a.Y - b.Y);
    public static V2 operator *(V2 v, double k) => new(v.X * k, v.Y * k);
    public static double Dot(V2 a, V2 b) => a.X * b.X + a.Y * b.Y;
    public static double Cross(V2 a, V2 b) => a.X * b.Y - a.Y * b.X;
    public double Length => Math.Sqrt(X * X + Y * Y);
    public override string ToString() => $"({X:0.###}, {Y:0.###})";
}`, output: 't = 0     P = (2, 1)\nt = 0.25  P = (4, 2.5)\nt = 0.5   P = (6, 4)\nt = 1     P = (10, 7)\nt = 1.5   P = (14, 10)\n1.2 m along: (2.96, 1.72)\n3 m along:   (4.4, 2.8)' },
      { type: 'h2', text: 'Finding t for a point' },
      { type: 'p', text: 'The reverse question comes up just as often: here is a point on the wall, how far along is it? Take the step from A to the point and **project** it onto d with the dot product: **t = (Q − A)·d ÷ (d·d)**. With d = B − A, comparing t with 0 and 1 then tells you whether the point is behind A, on the wall, or past B.' },
      { type: 'code', title: 'WhereOnTheWall.cs', code: cs`
var a = new V2(2, 1);
var b = new V2(10, 7);
V2 d = b - a;

foreach (var q in new V2[] { new(6, 4), new(14, 10), new(-2, -2) })
{
    double t = V2.Dot(q - a, d) / V2.Dot(d, d);
    string where = t < 0 ? "behind A" : t > 1 ? "past B" : "on the wall";
    Console.WriteLine($"{q}: t = {t}, {where}");
}

readonly record struct V2(double X, double Y)
{
    public static V2 operator +(V2 a, V2 b) => new(a.X + b.X, a.Y + b.Y);
    public static V2 operator -(V2 a, V2 b) => new(a.X - b.X, a.Y - b.Y);
    public static V2 operator *(V2 v, double k) => new(v.X * k, v.Y * k);
    public static double Dot(V2 a, V2 b) => a.X * b.X + a.Y * b.Y;
    public static double Cross(V2 a, V2 b) => a.X * b.Y - a.Y * b.X;
    public double Length => Math.Sqrt(X * X + Y * Y);
    public override string ToString() => $"({X:0.###}, {Y:0.###})";
}`, output: '(6, 4): t = 0.5, on the wall\n(14, 10): t = 1.5, past B\n(-2, -2): t = -0.5, behind A' },
      { type: 'p', text: 'These three points lie exactly on the line. A point that is slightly off it still gets a t: the t of the nearest point on the line. That is the subject of the next lesson.' },
      { type: 'note', kind: 'warn', text: 'Comparing t with exactly 0 and 1 has the usual floating-point problem: a point “at” B can come out as t = 1.0000000000000002 and be rejected. Use a tolerance in model units and convert it to t by dividing by the length: accept −ε ÷ L ≤ t ≤ 1 + ε ÷ L.' },
      { type: 'h2', text: 'Lines in 3D: nothing changes' },
      { type: 'p', text: 'The formula is the same with three coordinates. A sloping drain, a ramp and a ray from the camera into the model are all A + t·d. Here is the invert level of a drain at 5 m intervals, between a manhole and an outfall 0.5 m lower and 20 m away (a 1 in 40 fall):' },
      { type: 'code', title: 'DrainFall.cs', code: cs`
var start = new V3(0, 0, 3.0);            // invert level at the manhole
var end = new V3(20, 0, 2.5);             // 0.5 m lower, 20 m away: a 1:40 fall
V3 d = end - start;

for (double x = 0; x <= 20; x += 5)
{
    V3 p = start + d * (x / d.X);         // t from the horizontal distance
    Console.WriteLine($"Station {x,2} m: invert {p.Z:F3} m");
}

readonly record struct V3(double X, double Y, double Z)
{
    public static V3 operator +(V3 a, V3 b) => new(a.X + b.X, a.Y + b.Y, a.Z + b.Z);
    public static V3 operator -(V3 a, V3 b) => new(a.X - b.X, a.Y - b.Y, a.Z - b.Z);
    public static V3 operator *(V3 v, double k) => new(v.X * k, v.Y * k, v.Z * k);
    public static double Dot(V3 a, V3 b) => a.X * b.X + a.Y * b.Y + a.Z * b.Z;
    public double Length => Math.Sqrt(Dot(this, this));
    public override string ToString() => $"({X:0.###}, {Y:0.###}, {Z:0.###})";
}`, output: 'Station  0 m: invert 3.000 m\nStation  5 m: invert 2.875 m\nStation 10 m: invert 2.750 m\nStation 15 m: invert 2.625 m\nStation 20 m: invert 2.500 m' },
      { type: 'note', kind: 'tip', text: 'Dividing by d.X works here only because this drain runs along X. In general, find t from the horizontal distance along the run: the length of (x, y) travelled, divided by the length of d’s (x, y) part.' },
      { type: 'quiz', question: 'P(t) = A + t(B − A). Which t gives the point one third of the way back from B towards A?', options: ['1/3', '2/3', '−1/3', '4/3'], answer: 1, explain: 'One third of the way back from B is two thirds of the way from A, so t = 2/3.' },
      { type: 'quiz', question: 'Why do BIM tools avoid y = mx + c for walls?', options: [
        'It cannot describe a vertical (north–south) line, and has no simple 3D form',
        'It is slower to evaluate',
        'It only works for segments',
        'It needs angles in radians'
      ], answer: 0, explain: 'A north–south wall has an infinite slope m. The parametric form A + t·d handles every direction, in 2D and 3D, with the same code.' },
      { type: 'exercise', task: 'A sloping beam runs from (1, 2, 3) to (9, 2, 9). Write `PointAt(a, b, s)` that returns the point s metres along the beam, measured along its own length. Print the beam’s length and a bolt position every 2.5 m from one end to the other.', hint: 'Divide d = b − a by its length to get the unit direction, then multiply by s. The beam is 10 m long (8 across and 6 up), so the bolts are at s = 0, 2.5, 5, 7.5 and 10.', solution: cs`
var a = new V3(1, 2, 3);
var b = new V3(9, 2, 9);
double length = (b - a).Length;
Console.WriteLine($"Length: {length} m");

for (double s = 0; s <= length + 1e-9; s += 2.5)
    Console.WriteLine($"{s,4} m: {PointAt(a, b, s)}");

static V3 PointAt(V3 a, V3 b, double s)
{
    V3 d = b - a;
    return a + d * (s / d.Length);        // unit direction times distance
}

readonly record struct V3(double X, double Y, double Z)
{
    public static V3 operator +(V3 a, V3 b) => new(a.X + b.X, a.Y + b.Y, a.Z + b.Z);
    public static V3 operator -(V3 a, V3 b) => new(a.X - b.X, a.Y - b.Y, a.Z - b.Z);
    public static V3 operator *(V3 v, double k) => new(v.X * k, v.Y * k, v.Z * k);
    public static double Dot(V3 a, V3 b) => a.X * b.X + a.Y * b.Y + a.Z * b.Z;
    public double Length => Math.Sqrt(Dot(this, this));
    public override string ToString() => $"({X:0.###}, {Y:0.###}, {Z:0.###})";
}`, output: 'Length: 10 m\n   0 m: (1, 2, 3)\n 2.5 m: (3, 2, 4.5)\n   5 m: (5, 2, 6)\n 7.5 m: (7, 2, 7.5)\n  10 m: (9, 2, 9)' }
    ],
    keyPoints: [
      'A line in parametric form is P(t) = A + t·d: a start point plus a multiple of a direction.',
      'Line, ray and segment are the same formula; t is unrestricted, t ≥ 0, or 0 ≤ t ≤ 1.',
      'With d = B − A, t is a fraction of the way; with a unit d, t is a distance in model units.',
      'Find the t of a point with a projection: t = (Q − A)·d ÷ (d·d).',
      'It works unchanged in 3D, and it handles vertical lines that y = mx + c cannot.'
    ]
  },

  // ------------------------------------------------------------------ 2
  {
    slug: 'closest-point',
    title: 'Closest point and distance to a line or segment',
    summary: 'Project a point onto a line with one dot product, clamp t for a segment, and you have the closest point and the distance. This is how snapping, hit-testing and simple clash checks work.',
    minutes: 13,
    blocks: [
      { type: 'p', text: 'Hover near a wall in any BIM tool and it highlights. Move the cursor close to a pipe and it snaps to it. Both features answer the same question: **which point on this line is closest to P, and how far away is it?** The answer takes one dot product.' },
      { type: 'widget', name: 'closest-point' },
      { type: 'h2', text: 'Projecting onto a line' },
      { type: 'p', text: 'For the line A + t·d, the closest point Q is where PQ meets the line at a **right angle**. A right angle means (P − Q)·d = 0, and solving that for t gives the projection from the last lesson:' },
      { type: 'ol', items: [
        'w = P − A: the step from the start of the line to P.',
        't = (w·d) ÷ (d·d): how far along the closest point is, as a fraction of d.',
        'Q = A + t·d: the foot of the perpendicular.',
        'distance = |P − Q|.'
      ] },
      { type: 'h2', text: 'Segments: clamp t' },
      { type: 'p', text: 'For a segment, a t outside 0…1 means the foot of the perpendicular is off the end. The closest point of the segment is then that end itself, so **clamp t to [0, 1]** before computing Q. Forgetting the clamp is a classic bug: the cursor snaps to a point in empty space past the end of a wall. Try it in the widget by switching to the infinite line.' },
      { type: 'code', title: 'ClosestOnSegment.cs', code: cs`
var a = new V2(0, 0);
var b = new V2(8, 0);                     // a wall along X, 8 m long

foreach (var p in new V2[] { new(3, 2), new(10, 1.5), new(-2, -1) })
{
    var (q, t) = Closest(a, b, p);
    Console.WriteLine($"P {p}: t = {t}, closest {q}, distance {(p - q).Length:F3}");
}

static (V2 Point, double T) Closest(V2 a, V2 b, V2 p)
{
    V2 d = b - a;
    double len2 = V2.Dot(d, d);
    if (len2 < 1e-12) return (a, 0);      // a zero-length segment is just a point
    double t = Math.Clamp(V2.Dot(p - a, d) / len2, 0, 1);
    return (a + d * t, t);
}

readonly record struct V2(double X, double Y)
{
    public static V2 operator +(V2 a, V2 b) => new(a.X + b.X, a.Y + b.Y);
    public static V2 operator -(V2 a, V2 b) => new(a.X - b.X, a.Y - b.Y);
    public static V2 operator *(V2 v, double k) => new(v.X * k, v.Y * k);
    public static double Dot(V2 a, V2 b) => a.X * b.X + a.Y * b.Y;
    public static double Cross(V2 a, V2 b) => a.X * b.Y - a.Y * b.X;
    public double Length => Math.Sqrt(X * X + Y * Y);
    public override string ToString() => $"({X:0.###}, {Y:0.###})";
}`, output: 'P (3, 2): t = 0.375, closest (3, 0), distance 2.000\nP (10, 1.5): t = 1, closest (8, 0), distance 2.500\nP (-2, -1): t = 0, closest (0, 0), distance 2.236' },
      { type: 'h2', text: 'Snapping to the nearest wall' },
      { type: 'p', text: 'A snap is the closest point on the nearest element, as long as it is within a tolerance. Comparing **squared** distances avoids a square root for every candidate. The station along the wall, t × length, is what a dimension or a hosted element’s offset would show.' },
      { type: 'code', title: 'SnapToWall.cs', code: cs`
var walls = new (string Name, V2 A, V2 B)[]
{
    ("W1", new(0, 0), new(10, 0)),
    ("W2", new(10, 0), new(10, 6)),
    ("W3", new(0, 0), new(0, 6)),
};
const double SnapRadius = 0.3;

foreach (var cursor in new V2[] { new(9.8, 3.1), new(4, 0.25), new(5, 3) })
{
    string found = "nothing";
    double bestD2 = SnapRadius * SnapRadius;
    V2 snap = cursor;
    foreach (var w in walls)
    {
        V2 d = w.B - w.A;
        double t = Math.Clamp(V2.Dot(cursor - w.A, d) / V2.Dot(d, d), 0, 1);
        V2 q = w.A + d * t;
        double d2 = V2.Dot(cursor - q, cursor - q);
        if (d2 <= bestD2) { bestD2 = d2; snap = q; found = $"{w.Name} at {t * d.Length:0.##} m"; }
    }
    Console.WriteLine($"Cursor {cursor} snaps to {found}: {snap}");
}

readonly record struct V2(double X, double Y)
{
    public static V2 operator +(V2 a, V2 b) => new(a.X + b.X, a.Y + b.Y);
    public static V2 operator -(V2 a, V2 b) => new(a.X - b.X, a.Y - b.Y);
    public static V2 operator *(V2 v, double k) => new(v.X * k, v.Y * k);
    public static double Dot(V2 a, V2 b) => a.X * b.X + a.Y * b.Y;
    public static double Cross(V2 a, V2 b) => a.X * b.Y - a.Y * b.X;
    public double Length => Math.Sqrt(X * X + Y * Y);
    public override string ToString() => $"({X:0.###}, {Y:0.###})";
}`, output: 'Cursor (9.8, 3.1) snaps to W2 at 3.1 m: (10, 3.1)\nCursor (4, 0.25) snaps to W1 at 4 m: (4, 0)\nCursor (5, 3) snaps to nothing: (5, 3)' },
      { type: 'h2', text: 'Distance to a line, with no foot needed' },
      { type: 'p', text: 'If you only need the distance to an infinite line in 2D, the cross product gives it in one step: **distance = |d × (P − A)| ÷ |d|**. The cross product is the area of the parallelogram on d and P − A, and dividing an area by its base gives the height. Without the absolute value, its sign tells you which side of the line P is on: the “which side of the wall?” test from the cross-product lesson.' },
      { type: 'note', kind: 'info', text: 'Every formula here works unchanged with `Vec3`: the dot product does not care how many coordinates there are. A point is within a pipe of radius r when its distance to the pipe’s centreline segment is less than r. That is the simplest clash test there is, and the exercise uses it.' },
      { type: 'quiz', question: 'Segment AB has A = (0, 0) and B = (4, 0). What is its closest point to P = (6, 3)?', options: ['(6, 0)', '(4, 0)', '(4, 3)', '(0, 0)'], answer: 1, explain: 't = (6·4 + 3·0) ÷ 16 = 1.5, which is past B. Clamped to 1, the closest point is B = (4, 0). (6, 0) is the closest point of the infinite line, not of the segment.' },
      { type: 'quiz', question: 'Why is t computed as (w·d) ÷ (d·d), not (w·d) ÷ |d|?', options: [
        'Dividing by d·d makes t a fraction of d, with no square root needed',
        'The two are the same',
        'To make t positive',
        'Because d must be a unit vector'
      ], answer: 0, explain: '(w·d) ÷ |d| is the projected length in model units. Dividing once more by |d| turns it into a fraction of d, and |d|² = d·d needs no square root. If d is a unit vector, d·d = 1 and t is the distance itself.' },
      { type: 'exercise', task: 'A sprinkler pipe runs from (0, 1, 3) to (12, 1, 3). A sprinkler head is connected if it is within 0.15 m of the pipe’s centreline. Write `DistanceToSegment(a, b, p)` for 3D points and report the heads at (2, 1.1, 2.9), (6, 1.3, 3) and (12.1, 1, 3).', hint: 'Use the same clamped projection as `Closest`, with `V3.Dot`. The last head is past the end of the pipe, so its closest point is the end itself.', solution: cs`
var a = new V3(0, 1, 3);
var b = new V3(12, 1, 3);

foreach (var head in new V3[] { new(2, 1.1, 2.9), new(6, 1.3, 3), new(12.1, 1, 3) })
{
    double dist = DistanceToSegment(a, b, head);
    Console.WriteLine($"{head}: {dist:F3} m, {(dist <= 0.15 ? "connected" : "too far")}");
}

static double DistanceToSegment(V3 a, V3 b, V3 p)
{
    V3 d = b - a;
    double t = Math.Clamp(V3.Dot(p - a, d) / V3.Dot(d, d), 0, 1);
    return (p - (a + d * t)).Length;
}

readonly record struct V3(double X, double Y, double Z)
{
    public static V3 operator +(V3 a, V3 b) => new(a.X + b.X, a.Y + b.Y, a.Z + b.Z);
    public static V3 operator -(V3 a, V3 b) => new(a.X - b.X, a.Y - b.Y, a.Z - b.Z);
    public static V3 operator *(V3 v, double k) => new(v.X * k, v.Y * k, v.Z * k);
    public static double Dot(V3 a, V3 b) => a.X * b.X + a.Y * b.Y + a.Z * b.Z;
    public double Length => Math.Sqrt(Dot(this, this));
    public override string ToString() => $"({X:0.###}, {Y:0.###}, {Z:0.###})";
}`, output: '(2, 1.1, 2.9): 0.141 m, connected\n(6, 1.3, 3): 0.300 m, too far\n(12.1, 1, 3): 0.100 m, connected' }
    ],
    keyPoints: [
      'The closest point on a line is the foot of the perpendicular: t = (P − A)·d ÷ (d·d), Q = A + t·d.',
      'For a segment, clamp t to [0, 1] first; otherwise you snap to empty space past the end.',
      'Compare squared distances when searching for the nearest element; take the root only for the winner.',
      'In 2D, |d × (P − A)| ÷ |d| is the distance to the line, and its sign is the side.',
      'The same code works in 3D, and distance-to-segment is the basis of simple pipe clash tests.'
    ]
  },

  // ------------------------------------------------------------------ 3
  {
    slug: 'line-intersections',
    title: 'Line intersections in 2D, and skew lines in 3D',
    summary: 'Intersect two lines with the 2D cross product, tell segments that cross from lines that only would, handle parallel and collinear cases, and find where two skew lines in 3D come closest.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'Wall joins, trimming a wall to another, splitting a pipe where it crosses a duct, placing a column where two grid lines meet: all of them start with **where do these two lines intersect?** In 2D the answer takes three cross products.' },
      { type: 'widget', name: 'line-intersect' },
      { type: 'h2', text: 'Two lines, two unknowns' },
      { type: 'p', text: 'Write the walls as A + t·r and C + u·s, with r = B − A and s = D − C. They meet where A + t·r = C + u·s. Taking the 2D cross product of both sides with s removes u (because s × s = 0), and taking it with r removes t:' },
      { type: 'ul', items: [
        '**t = ((C − A) × s) ÷ (r × s)**: how far along AB the meeting point is.',
        '**u = ((C − A) × r) ÷ (r × s)**: how far along CD it is.',
        'The point itself is A + t·r, which is the same point as C + u·s.'
      ] },
      { type: 'p', text: 'The denominator r × s is zero when the walls are parallel, so test it **before** dividing. Make the test scale-aware: |r × s| ≤ ε·|r|·|s| says the sine of the angle between them is below ε, whatever the walls’ lengths.' },
      { type: 'table', head: ['Result', 'Meaning', 'In a BIM model'], rows: [
        ['r × s ≈ 0 and (C − A) × r ≈ 0', 'collinear: both on one line', 'overlapping walls to merge, duplicated pipes'],
        ['r × s ≈ 0, otherwise', 'parallel: they never meet', 'two faces of a corridor: no join'],
        ['0 ≤ t ≤ 1 and 0 ≤ u ≤ 1', 'the segments cross', 'split a pipe at a duct; a clash in plan'],
        ['anything else', 'the lines meet beyond an end', 'extend a wall to meet another: a trim/extend join']
      ] },
      { type: 'code', title: 'Intersect.cs', code: cs`
Report("Crossing walls", new(0, 0), new(4, 4), new(0, 4), new(4, 0));
Report("Wall stops short", new(0, 0), new(2, 0), new(4, -1), new(4, 3));
Report("Parallel walls", new(0, 0), new(4, 0), new(0, 2), new(4, 2));

static void Report(string name, V2 a, V2 b, V2 c, V2 d)
{
    V2 r = b - a, s = d - c, ca = c - a;
    double den = V2.Cross(r, s);
    if (Math.Abs(den) <= 1e-9 * r.Length * s.Length)
    {
        bool collinear = Math.Abs(V2.Cross(ca, r)) <= 1e-9 * r.Length * ca.Length;
        Console.WriteLine($"{name}: {(collinear ? "collinear" : "parallel, no intersection")}");
        return;
    }
    double t = V2.Cross(ca, s) / den;
    double u = V2.Cross(ca, r) / den;
    bool onBoth = t >= 0 && t <= 1 && u >= 0 && u <= 1;
    Console.WriteLine($"{name}: lines meet at {a + r * t}, t = {t}, u = {u}, {(onBoth ? "segments cross" : "segments do not")}");
}

readonly record struct V2(double X, double Y)
{
    public static V2 operator +(V2 a, V2 b) => new(a.X + b.X, a.Y + b.Y);
    public static V2 operator -(V2 a, V2 b) => new(a.X - b.X, a.Y - b.Y);
    public static V2 operator *(V2 v, double k) => new(v.X * k, v.Y * k);
    public static double Dot(V2 a, V2 b) => a.X * b.X + a.Y * b.Y;
    public static double Cross(V2 a, V2 b) => a.X * b.Y - a.Y * b.X;
    public double Length => Math.Sqrt(X * X + Y * Y);
    public override string ToString() => $"({X:0.###}, {Y:0.###})";
}`, output: 'Crossing walls: lines meet at (2, 2), t = 0.5, u = 0.5, segments cross\nWall stops short: lines meet at (4, 0), t = 2, u = 0.25, segments do not\nParallel walls: parallel, no intersection' },
      { type: 'p', text: 'The second case is the useful one. t = 2 says the first wall would have to be twice as long to reach the second, and u = 0.25 says it would arrive a quarter of the way along the second wall. Moving B to A + 2r = (4, 0) makes a T-junction: that is all a trim/extend join does.' },
      { type: 'note', kind: 'warn', text: 'Walls that meet exactly at their ends compute t = 1 or u = 0 up to rounding, and 1.0000000000000002 fails the test t ≤ 1. Allow a tolerance in model units, divided by the length as before: −ε ÷ |r| ≤ t ≤ 1 + ε ÷ |r|.' },
      { type: 'h2', text: 'Skew lines in 3D' },
      { type: 'p', text: 'In 3D, two lines that are not parallel usually do not meet at all: think of a pipe passing over a duct. Such lines are **skew**. The useful question becomes where they come **closest**, and how far apart they are there. That is the clearance between the pipe and the duct, or a clash if it is less than the sum of their radii.' },
      { type: 'p', text: 'The closest points P = A + t·r and Q = C + u·s are where PQ is at right angles to **both** lines, so (P − Q)·r = 0 and (P − Q)·s = 0. With w = A − C and five dot products, rr = r·r, rs = r·s, ss = s·s, rw = r·w and sw = s·w, the two equations solve to:' },
      { type: 'ul', items: [
        '**t = (rs·sw − ss·rw) ÷ (rr·ss − rs²)**',
        '**u = (rr·sw − rs·rw) ÷ (rr·ss − rs²)**',
        'The denominator equals |r × s|², so it is zero exactly when the lines are parallel.'
      ] },
      { type: 'code', title: 'PipeOverDuct.cs', code: cs`
var pipeA = new V3(0, 0, 3.2);  var pipeB = new V3(10, 0, 3.2);   // pipe, radius 0.05
var ductA = new V3(2, -3, 2.6); var ductB = new V3(8, 5, 2.6);    // round duct, radius 0.4

var (p, q) = ClosestPoints(pipeA, pipeB - pipeA, ductA, ductB - ductA);
double gap = (p - q).Length;
Console.WriteLine($"Closest on pipe: {p}");
Console.WriteLine($"Closest on duct: {q}");
Console.WriteLine($"Centre distance {gap:F3} m, clearance {gap - 0.05 - 0.4:F3} m");

static (V3, V3) ClosestPoints(V3 a, V3 r, V3 c, V3 s)
{
    V3 w = a - c;
    double rr = V3.Dot(r, r), rs = V3.Dot(r, s), ss = V3.Dot(s, s);
    double rw = V3.Dot(r, w), sw = V3.Dot(s, w);
    double den = rr * ss - rs * rs;                // |r x s|^2: zero when parallel
    if (den <= 1e-12 * rr * ss) throw new ArgumentException("The lines are parallel");
    double t = (rs * sw - ss * rw) / den;
    double u = (rr * sw - rs * rw) / den;
    return (a + r * t, c + s * u);
}

readonly record struct V3(double X, double Y, double Z)
{
    public static V3 operator +(V3 a, V3 b) => new(a.X + b.X, a.Y + b.Y, a.Z + b.Z);
    public static V3 operator -(V3 a, V3 b) => new(a.X - b.X, a.Y - b.Y, a.Z - b.Z);
    public static V3 operator *(V3 v, double k) => new(v.X * k, v.Y * k, v.Z * k);
    public static double Dot(V3 a, V3 b) => a.X * b.X + a.Y * b.Y + a.Z * b.Z;
    public double Length => Math.Sqrt(Dot(this, this));
    public override string ToString() => $"({X:0.###}, {Y:0.###}, {Z:0.###})";
}`, output: 'Closest on pipe: (4.25, 0, 3.2)\nClosest on duct: (4.25, 0, 2.6)\nCentre distance 0.600 m, clearance 0.150 m' },
      { type: 'note', kind: 'info', text: 'This finds the closest points of the two infinite lines. For segments, clamp t to [0, 1]; if it was clamped, recompute u by projecting the clamped point onto the other segment (the last lesson), clamp u, and project back once more. Clash-detection engines run exactly this between every pair of pipe and duct centrelines that their bounding boxes say might be close.' },
      { type: 'quiz', question: 'r × s = 0, but (C − A) × r is not 0. What are the two lines?', options: ['Parallel, never meeting', 'Collinear', 'Crossing at a right angle', 'Skew'], answer: 0, explain: 'r × s = 0 means the directions are parallel. (C − A) × r ≠ 0 means C is not on the first line, so the lines are side by side and never meet. (In 2D there are no skew lines.)' },
      { type: 'quiz', question: 'Two wall segments give t = 1.4 and u = 0.5. What does that mean?', options: [
        'The first wall would reach the middle of the second if it were extended by 40% of its length',
        'The walls cross',
        'The walls are parallel',
        'The first wall is hit 40% of the way along'
      ], answer: 0, explain: 'u = 0.5 is inside the second segment, at its midpoint. t = 1.4 is past B, so the first wall stops short. Extending it to t = 1.4 makes a T-junction.' },
      { type: 'exercise', task: 'Write `Extend(a, b, c, d)` for a wall join: if the line of wall AB meets wall CD (0 ≤ u ≤ 1) beyond B (t > 1), return the extended end point; otherwise leave B unchanged. Test it with AB = (0, 0)→(3, 0) against CD = (5, −2)→(5, 2), and against CD = (5, 1)→(5, 4).', hint: 'Compute t and u as in `Report`. Only t > 1 together with 0 ≤ u ≤ 1 is a join; in the second test the line of AB passes below wall CD, so u is negative.', solution: cs`
var a = new V2(0, 0);
var b = new V2(3, 0);
Console.WriteLine(Extend(a, b, new(5, -2), new(5, 2)));
Console.WriteLine(Extend(a, b, new(5, 1), new(5, 4)));

static string Extend(V2 a, V2 b, V2 c, V2 d)
{
    V2 r = b - a, s = d - c, ca = c - a;
    double den = V2.Cross(r, s);
    if (Math.Abs(den) <= 1e-9 * r.Length * s.Length) return $"Parallel: {b} unchanged";
    double t = V2.Cross(ca, s) / den;
    double u = V2.Cross(ca, r) / den;
    if (t > 1 && u >= 0 && u <= 1) return $"Extended to {a + r * t}";
    return $"No join: {b} unchanged";
}

readonly record struct V2(double X, double Y)
{
    public static V2 operator +(V2 a, V2 b) => new(a.X + b.X, a.Y + b.Y);
    public static V2 operator -(V2 a, V2 b) => new(a.X - b.X, a.Y - b.Y);
    public static V2 operator *(V2 v, double k) => new(v.X * k, v.Y * k);
    public static double Dot(V2 a, V2 b) => a.X * b.X + a.Y * b.Y;
    public static double Cross(V2 a, V2 b) => a.X * b.Y - a.Y * b.X;
    public double Length => Math.Sqrt(X * X + Y * Y);
    public override string ToString() => $"({X:0.###}, {Y:0.###})";
}`, output: 'Extended to (5, 0)\nNo join: (3, 0) unchanged' }
    ],
    keyPoints: [
      'For A + t·r and C + u·s: t = ((C − A) × s) ÷ (r × s) and u = ((C − A) × r) ÷ (r × s).',
      'Test r × s against a scale-aware tolerance before dividing: zero means parallel or collinear.',
      'The segments cross only if both t and u are in [0, 1]; otherwise t and u say which wall to extend, and by how much.',
      'In 3D, non-parallel lines are usually skew; find their closest points with two dot-product equations.',
      'The distance between centrelines, minus the radii, is the clearance used in clash detection.'
    ]
  },

  // ------------------------------------------------------------------ 4
  {
    slug: 'circles-arcs',
    title: 'Circles and arcs: 3-point arcs and tangents',
    summary: 'Describe arcs by centre, radius and angles; build an arc through three points; get arc length, sagitta and bulge; and find the tangent points from a point to a circle.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'Curved walls, round columns, pipe bends, arched openings and road alignments are circles or arcs. BIM and CAD tools store them in several interchangeable forms, and much of the work is converting between them.' },
      { type: 'table', head: ['Form', 'Stored as', 'Where you meet it'], rows: [
        ['Centre, radius, angles', 'C, r, start and end angle', 'Revit’s `Arc.Create(plane, radius, start, end)`, DXF ARC entities'],
        ['Three points', 'start, a point on the arc, end', 'the 3-point arc drawing tool, survey data'],
        ['Start, end, bulge', 'two points and tan(sweep ÷ 4)', 'DXF and DWG polylines'],
        ['Start, end, radius', 'two points, r, and which side', 'wall and road alignment tools']
      ] },
      { type: 'h2', text: 'A point on a circle' },
      { type: 'p', text: 'The point at angle θ on a circle with centre C and radius r is **C + r(cos θ, sin θ)**. An arc is the same formula with θ limited to a range, which is the parametric idea from the first lesson again. Two facts follow directly:' },
      { type: 'ul', items: [
        '**Arc length = r × sweep**, with the sweep in **radians**. In degrees, multiply by π ÷ 180 first.',
        'The **tangent** at θ is (−sin θ, cos θ) for counterclockwise travel: at right angles to the radius.'
      ] },
      { type: 'widget', name: 'three-point-arc' },
      { type: 'h2', text: 'An arc through three points' },
      { type: 'p', text: 'The centre is the same distance from all three points, so it lies on the **perpendicular bisector** of P1P2 and on that of P2P3: the dashed lines in the widget. Intersecting them gives a closed formula. Work relative to P1 to keep the numbers small, and check the denominator: it is zero when the points are in a line.' },
      { type: 'code', title: 'ThreePointArc.cs', code: cs`
var p1 = new V2(0, 0);
var p2 = new V2(4, 2);
var p3 = new V2(8, 0);

var (c, r) = Circumcircle(p1, p2, p3);
double a1 = Math.Atan2(p1.Y - c.Y, p1.X - c.X);
double a3 = Math.Atan2(p3.Y - c.Y, p3.X - c.X);
bool ccw = V2.Cross(p2 - p1, p3 - p2) > 0;        // does the path turn left?
double sweep = ccw ? Wrap(a3 - a1) : -Wrap(a1 - a3);

Console.WriteLine($"Centre {c}, radius {r}");
Console.WriteLine($"Sweep {sweep * 180 / Math.PI:F2} deg ({(ccw ? "counterclockwise" : "clockwise")})");
Console.WriteLine($"Arc length {r * Math.Abs(sweep):F3} m, chord {(p3 - p1).Length} m");

static double Wrap(double a) => a < 0 ? a + 2 * Math.PI : a;   // into [0, 2 pi)

static (V2 Centre, double Radius) Circumcircle(V2 a, V2 b, V2 c)
{
    V2 ab = b - a, ac = c - a;
    double d = 2 * V2.Cross(ab, ac);
    if (Math.Abs(d) < 1e-12) throw new ArgumentException("The points are collinear: no arc");
    double ab2 = V2.Dot(ab, ab), ac2 = V2.Dot(ac, ac);
    var centre = new V2(ac.Y * ab2 - ab.Y * ac2, ab.X * ac2 - ac.X * ab2) * (1 / d);
    return (a + centre, centre.Length);
}

readonly record struct V2(double X, double Y)
{
    public static V2 operator +(V2 a, V2 b) => new(a.X + b.X, a.Y + b.Y);
    public static V2 operator -(V2 a, V2 b) => new(a.X - b.X, a.Y - b.Y);
    public static V2 operator *(V2 v, double k) => new(v.X * k, v.Y * k);
    public static double Dot(V2 a, V2 b) => a.X * b.X + a.Y * b.Y;
    public static double Cross(V2 a, V2 b) => a.X * b.Y - a.Y * b.X;
    public double Length => Math.Sqrt(X * X + Y * Y);
    public override string ToString() => $"({X:0.###}, {Y:0.###})";
}`, output: 'Centre (4, -3), radius 5\nSweep -106.26 deg (clockwise)\nArc length 9.273 m, chord 8 m' },
      { type: 'note', kind: 'tip', text: 'Nearly collinear points do not fail the test, but give a huge radius and a centre kilometres away, and tiny changes in input move it wildly. Compare |d| with the squared chord length, as the widget does, and treat a “very flat arc” as a straight segment.' },
      { type: 'h2', text: 'Sagitta, bulge and radius from a chord' },
      { type: 'p', text: 'Site information often gives a chord and a rise: “an arched opening 2.4 m wide that rises 0.4 m”. The rise in the middle is called the **sagitta** s. With the half-chord h, the radius is **r = (h² + s²) ÷ (2s)**. DXF polylines store arcs as a **bulge**, which is tan(sweep ÷ 4), and also equals s ÷ h. Its sign gives the direction: positive is counterclockwise.' },
      { type: 'code', title: 'ArchedOpening.cs', code: cs`
double width = 2.4, rise = 0.4;           // an arched opening
double h = width / 2;

double r = (h * h + rise * rise) / (2 * rise);
double bulge = rise / h;
double sweep = 4 * Math.Atan(bulge);      // tan(sweep / 4) = bulge
Console.WriteLine($"Radius {r:F3} m");
Console.WriteLine($"Sweep {sweep * 180 / Math.PI:F2} deg, bulge {bulge:F4}");
Console.WriteLine($"Arc length {r * sweep:F3} m (the chord is {width} m)");`, output: 'Radius 2.000 m\nSweep 73.74 deg, bulge 0.3333\nArc length 2.574 m (the chord is 2.4 m)' },
      { type: 'h2', text: 'Tangents from a point' },
      { type: 'p', text: 'Where should a straight pipe leave a round tank so that it heads straight for a valve? From a point P outside a circle there are two lines that just touch it, at two **tangent points**. The radius to a tangent point T is at right angles to the tangent, so C, T and P form a right-angled triangle. Its long side is |P − C|, so the tangent length is √(|P − C|² − r²), and the angle at the centre is acos(r ÷ |P − C|).' },
      { type: 'code', title: 'TangentPoints.cs', code: cs`
var c = new V2(0, 0);
double r = 3;                             // a round tank
var p = new V2(5, 0);                     // a valve outside it

V2 cp = p - c;
double dist = cp.Length;
if (dist <= r) { Console.WriteLine("The point is inside the circle: no tangents"); return; }

double alpha = Math.Acos(r / dist);       // angle at the centre
double toP = Math.Atan2(cp.Y, cp.X);
foreach (double sign in new[] { 1.0, -1.0 })
{
    double angle = toP + sign * alpha;
    Console.WriteLine($"Tangent point {c + new V2(Math.Cos(angle), Math.Sin(angle)) * r}");
}
Console.WriteLine($"Tangent length {Math.Sqrt(dist * dist - r * r)} m");

readonly record struct V2(double X, double Y)
{
    public static V2 operator +(V2 a, V2 b) => new(a.X + b.X, a.Y + b.Y);
    public static V2 operator -(V2 a, V2 b) => new(a.X - b.X, a.Y - b.Y);
    public static V2 operator *(V2 v, double k) => new(v.X * k, v.Y * k);
    public static double Dot(V2 a, V2 b) => a.X * b.X + a.Y * b.Y;
    public static double Cross(V2 a, V2 b) => a.X * b.Y - a.Y * b.X;
    public double Length => Math.Sqrt(X * X + Y * Y);
    public override string ToString() => $"({X:0.###}, {Y:0.###})";
}`, output: 'Tangent point (1.8, 2.4)\nTangent point (1.8, -2.4)\nTangent length 4 m' },
      { type: 'quiz', question: 'An arc has a radius of 5 m and sweeps 90°. How long is it?', options: ['7.854 m', '5 m', '450 m', '15.708 m'], answer: 0, explain: 'Length = r × sweep in radians = 5 × π ÷ 2 ≈ 7.854 m. Multiplying by the angle in degrees would give the nonsense answer 450.' },
      { type: 'quiz', question: 'Why is there no arc through three points that lie in a line?', options: [
        'Their perpendicular bisectors are parallel, so there is no centre',
        'The radius would be zero',
        'Atan2 is undefined for them',
        'The sweep would be 360°'
      ], answer: 0, explain: 'The centre is where the bisectors cross. For collinear points they are parallel, which is the same as saying the radius is infinite: the “arc” is a straight line.' },
      { type: 'exercise', task: 'A curved wall is an arc with centre (10, 0) and radius 10 m, running counterclockwise from 90° to 180°. Print its start and end points, its length, and the positions of three windows at ¼, ½ and ¾ of the way along it.', hint: 'Convert the angles to radians. Evenly spaced along the length means evenly spaced in angle, so window i is at start + (end − start) × i ÷ 4.', solution: cs`
var c = new V2(10, 0);
double r = 10, start = 90 * Math.PI / 180, end = 180 * Math.PI / 180;

V2 At(double angle) => c + new V2(Math.Cos(angle), Math.Sin(angle)) * r;

Console.WriteLine($"Start {At(start)}, end {At(end)}");
Console.WriteLine($"Length {r * (end - start):F3} m");
for (int i = 1; i <= 3; i++)
    Console.WriteLine($"Window {i}: {At(start + (end - start) * i / 4)}");

readonly record struct V2(double X, double Y)
{
    public static V2 operator +(V2 a, V2 b) => new(a.X + b.X, a.Y + b.Y);
    public static V2 operator -(V2 a, V2 b) => new(a.X - b.X, a.Y - b.Y);
    public static V2 operator *(V2 v, double k) => new(v.X * k, v.Y * k);
    public static double Dot(V2 a, V2 b) => a.X * b.X + a.Y * b.Y;
    public static double Cross(V2 a, V2 b) => a.X * b.Y - a.Y * b.X;
    public double Length => Math.Sqrt(X * X + Y * Y);
    public override string ToString() => $"({X:0.###}, {Y:0.###})";
}`, output: 'Start (10, 10), end (0, 0)\nLength 15.708 m\nWindow 1: (6.173, 9.239)\nWindow 2: (2.929, 7.071)\nWindow 3: (0.761, 3.827)' }
    ],
    keyPoints: [
      'A point on a circle is C + r(cos θ, sin θ); an arc limits θ to a range.',
      'Arc length is r × sweep in radians; the tangent is at right angles to the radius.',
      'The centre of a 3-point arc is where the perpendicular bisectors cross; collinear points have no arc.',
      'From a chord and a rise: r = (h² + s²) ÷ (2s); the DXF bulge is tan(sweep ÷ 4) = s ÷ h.',
      'Tangents from an outside point P touch the circle at an angle acos(r ÷ |P − C|) either side of CP.'
    ]
  },

  // ------------------------------------------------------------------ 5
  {
    slug: 'polylines',
    title: 'Polylines: length, offsetting and fillets',
    summary: 'A polyline is a list of points joined by segments. Measure it, find the point at a given distance along it, offset it into a wall’s two faces, and round its corners with fillets.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'Wall chains, pipe and duct runs, room boundaries, slab edges, cable trays and road centrelines are all **polylines**: points joined by straight segments, sometimes with arcs at the corners. Everything from the last four lessons now gets applied one segment at a time.' },
      { type: 'widget', name: 'polyline-lab' },
      { type: 'h2', text: 'Length, and the point at a distance' },
      { type: 'p', text: 'The length is the sum of the segment lengths. To find the point at distance s along it (“the 10 m mark of this duct run”), walk the segments, subtracting each length from s until s falls inside one, then interpolate within that segment. Roads and railways call this distance **chainage** or **stationing**.' },
      { type: 'code', title: 'Chainage.cs', code: cs`
var run = new V2[] { new(0, 0), new(6, 0), new(6, 8), new(12, 8) };

double total = 0;
for (int i = 1; i < run.Length; i++) total += (run[i] - run[i - 1]).Length;
Console.WriteLine($"Length {total} m");

foreach (double s in new[] { 3.0, 10.0, 17.5 })
    Console.WriteLine($"{s,4} m: {PointAt(run, s)}");

static V2 PointAt(V2[] pts, double s)
{
    for (int i = 1; i < pts.Length; i++)
    {
        V2 d = pts[i] - pts[i - 1];
        double len = d.Length;
        if (s <= len) return pts[i - 1] + d * (s / len);
        s -= len;                         // on to the next segment
    }
    return pts[^1];                       // past the end: clamp to the last point
}

readonly record struct V2(double X, double Y)
{
    public static V2 operator +(V2 a, V2 b) => new(a.X + b.X, a.Y + b.Y);
    public static V2 operator -(V2 a, V2 b) => new(a.X - b.X, a.Y - b.Y);
    public static V2 operator *(V2 v, double k) => new(v.X * k, v.Y * k);
    public static double Dot(V2 a, V2 b) => a.X * b.X + a.Y * b.Y;
    public static double Cross(V2 a, V2 b) => a.X * b.Y - a.Y * b.X;
    public double Length => Math.Sqrt(X * X + Y * Y);
    public override string ToString() => $"({X:0.###}, {Y:0.###})";
}`, output: 'Length 20 m\n   3 m: (3, 0)\n  10 m: (6, 4)\n17.5 m: (9.5, 8)' },
      { type: 'note', kind: 'tip', text: 'For many lookups on a long polyline, store the running total of lengths at each vertex once, then find the right segment with `Array.BinarySearch` instead of walking from the start every time.' },
      { type: 'h2', text: 'Offsetting: a wall’s two faces' },
      { type: 'p', text: 'A wall is drawn along a location line, often its centreline. Its two faces are that polyline **offset** by half the thickness to each side. Move each segment along its left normal n = (−d.y, d.x) ÷ |d| by a distance δ, using a negative δ for the right side. The moved segments no longer meet: they overlap at an inside corner and leave a gap at an outside one. Join them where the two offset lines cross. This is called a **miter** join.' },
      { type: 'p', text: 'There is a short formula for the miter point at a vertex V, where the normals of the two segments are n1 and n2: **V + (n1 + n2) × δ ÷ (1 + n1·n2)**. At a right angle n1·n2 = 0, and the corner moves δ along each normal. As the corner gets sharper, 1 + n1·n2 approaches 0 and the miter point shoots off into a spike. Drawing programs cap this with a **miter limit** and cut the corner off (a bevel) instead.' },
      { type: 'code', title: 'WallFaces.cs', code: cs`
var centre = new V2[] { new(0, 0), new(6, 0), new(6, 4) };   // an L-shaped wall
double half = 0.15;                                          // 300 mm thick

Console.WriteLine("Left face:  " + string.Join(" ", Offset(centre, half)));
Console.WriteLine("Right face: " + string.Join(" ", Offset(centre, -half)));

static V2[] Offset(V2[] pts, double delta)
{
    var n = new V2[pts.Length - 1];               // left normal of each segment
    for (int i = 0; i < n.Length; i++)
    {
        V2 d = pts[i + 1] - pts[i];
        n[i] = new V2(-d.Y, d.X) * (1 / d.Length);
    }
    var result = new V2[pts.Length];
    result[0] = pts[0] + n[0] * delta;
    result[^1] = pts[^1] + n[^1] * delta;
    for (int i = 1; i < pts.Length - 1; i++)      // miter joins at the inner vertices
        result[i] = pts[i] + (n[i - 1] + n[i]) * (delta / (1 + V2.Dot(n[i - 1], n[i])));
    return result;
}

readonly record struct V2(double X, double Y)
{
    public static V2 operator +(V2 a, V2 b) => new(a.X + b.X, a.Y + b.Y);
    public static V2 operator -(V2 a, V2 b) => new(a.X - b.X, a.Y - b.Y);
    public static V2 operator *(V2 v, double k) => new(v.X * k, v.Y * k);
    public static double Dot(V2 a, V2 b) => a.X * b.X + a.Y * b.Y;
    public static double Cross(V2 a, V2 b) => a.X * b.Y - a.Y * b.X;
    public double Length => Math.Sqrt(X * X + Y * Y);
    public override string ToString() => $"({X:0.###}, {Y:0.###})";
}`, output: 'Left face:  (0, 0.15) (5.85, 0.15) (5.85, 4)\nRight face: (0, -0.15) (6.15, -0.15) (6.15, 4)' },
      { type: 'note', kind: 'warn', text: 'Offsetting by more than the size of a feature makes the result fold over itself, for example on the inside of a tight U-bend. Production offset algorithms find and trim those loops. For wall faces it is rarely a problem, because walls are much longer than they are thick.' },
      { type: 'h2', text: 'Fillets: rounding the corners' },
      { type: 'p', text: 'A **fillet** replaces a sharp corner with an arc of radius r that touches both segments: pipe bends, rounded slab corners, kerb lines. If the path turns by an angle φ at the corner, the arc starts and ends a distance **T = r·tan(φ ÷ 2)** back from the corner along each segment, and it is r·φ long.' },
      { type: 'ol', items: [
        'u1 and u2: the unit directions into and out of the corner V.',
        'φ = acos(u1·u2): how far the path turns. φ = 0 means straight on, with nothing to fillet.',
        'T = r·tan(φ ÷ 2); the tangent points are V − u1·T and V + u2·T.',
        'Check T against the segment lengths. If it does not fit, the radius is too big for that corner.'
      ] },
      { type: 'code', title: 'PipeBend.cs', code: cs`
var a = new V2(0, 0);
var v = new V2(4, 0);                     // the corner
var b = new V2(4, 3);
double r = 0.5;                           // bend radius

V2 u1 = Unit(v - a), u2 = Unit(b - v);
double phi = Math.Acos(Math.Clamp(V2.Dot(u1, u2), -1, 1));
double t = r * Math.Tan(phi / 2);

Console.WriteLine($"Turn {phi * 180 / Math.PI:F1} deg, tangent distance {t:F3} m");
Console.WriteLine($"Bend from {v - u1 * t} to {v + u2 * t}, arc length {r * phi:F3} m");
Console.WriteLine($"The run is {2 * t - r * phi:F3} m shorter");

static V2 Unit(V2 d) => d * (1 / d.Length);

readonly record struct V2(double X, double Y)
{
    public static V2 operator +(V2 a, V2 b) => new(a.X + b.X, a.Y + b.Y);
    public static V2 operator -(V2 a, V2 b) => new(a.X - b.X, a.Y - b.Y);
    public static V2 operator *(V2 v, double k) => new(v.X * k, v.Y * k);
    public static double Dot(V2 a, V2 b) => a.X * b.X + a.Y * b.Y;
    public static double Cross(V2 a, V2 b) => a.X * b.Y - a.Y * b.X;
    public double Length => Math.Sqrt(X * X + Y * Y);
    public override string ToString() => $"({X:0.###}, {Y:0.###})";
}`, output: 'Turn 90.0 deg, tangent distance 0.500 m\nBend from (3.5, 0) to (4, 0.5), arc length 0.785 m\nThe run is 0.215 m shorter' },
      { type: 'note', kind: 'info', text: 'A DXF or DWG polyline stores each fillet as a bulge on the segment between the two tangent points: tan(φ ÷ 4), the same number as in the last lesson.' },
      { type: 'quiz', question: 'A polyline turns 90° at a corner, and you fillet it with r = 2 m. How far back from the corner are the tangent points?', options: ['2 m', '1 m', '2√2 m', 'π m'], answer: 0, explain: 'T = r·tan(φ ÷ 2) = 2 × tan 45° = 2 m. At a right angle the tangent distance always equals the radius.' },
      { type: 'quiz', question: 'You offset each segment of a polyline but do not join them. What happens at an outside corner?', options: ['A gap opens between the offset segments', 'The segments overlap', 'Nothing: they still meet', 'The corner moves inwards'], answer: 0, explain: 'On the outside of a turn the offset segments move apart and leave a gap; on the inside they overlap. A miter join fixes both by meeting where the two offset lines cross.' },
      { type: 'exercise', task: 'A duct run goes (0, 0) → (5, 0) → (8, 4) and needs a bend of radius 1 m at the corner. Print the turn angle, the two tangent points and the centre of the bend. Because this run turns left, the centre is r along the left normal of the first segment from the first tangent point.', hint: 'u1 = (1, 0) and u2 = (0.6, 0.8), so φ = acos(0.6). Use the sign of `V2.Cross(u1, u2)` to choose the side: positive means a left turn.', solution: cs`
var a = new V2(0, 0);
var v = new V2(5, 0);
var b = new V2(8, 4);
double r = 1;

V2 u1 = Unit(v - a), u2 = Unit(b - v);
double phi = Math.Acos(Math.Clamp(V2.Dot(u1, u2), -1, 1));
double t = r * Math.Tan(phi / 2);
V2 t1 = v - u1 * t, t2 = v + u2 * t;
bool turnsLeft = V2.Cross(u1, u2) > 0;
V2 left = new(-u1.Y, u1.X);
V2 centre = t1 + left * (turnsLeft ? r : -r);

Console.WriteLine($"Turn {phi * 180 / Math.PI:F2} deg");
Console.WriteLine($"Tangent points {t1} and {t2}");
Console.WriteLine($"Centre {centre}");

static V2 Unit(V2 d) => d * (1 / d.Length);

readonly record struct V2(double X, double Y)
{
    public static V2 operator +(V2 a, V2 b) => new(a.X + b.X, a.Y + b.Y);
    public static V2 operator -(V2 a, V2 b) => new(a.X - b.X, a.Y - b.Y);
    public static V2 operator *(V2 v, double k) => new(v.X * k, v.Y * k);
    public static double Dot(V2 a, V2 b) => a.X * b.X + a.Y * b.Y;
    public static double Cross(V2 a, V2 b) => a.X * b.Y - a.Y * b.X;
    public double Length => Math.Sqrt(X * X + Y * Y);
    public override string ToString() => $"({X:0.###}, {Y:0.###})";
}`, output: 'Turn 53.13 deg\nTangent points (4.5, 0) and (5.3, 0.4)\nCentre (4.5, 1)' }
    ],
    keyPoints: [
      'A polyline’s length is the sum of its segments; the point at distance s comes from walking the segments.',
      'Offset each segment along its normal and join neighbours at a miter: V + (n1 + n2) × δ ÷ (1 + n1·n2).',
      'Sharp corners make miter spikes; real tools apply a miter limit and bevel instead.',
      'A fillet of radius r at a turn of φ cuts back T = r·tan(φ ÷ 2) on each side and adds an arc of length r·φ.',
      'Check that T fits on both segments; otherwise the radius is too big for that corner.'
    ]
  },

  // ------------------------------------------------------------------ 6
  {
    slug: 'bezier-splines',
    title: 'Bézier curves and splines',
    summary: 'Bézier curves bend smoothly towards control points without passing through them. Evaluate them with de Casteljau’s algorithm, find their tangents and lengths, and chain them into smooth splines.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'Freeform roofs, curved façades, handrails and the spline tools in Revit, Rhino and AutoCAD all use curves defined by **control points**. The simplest and most widespread is the **Bézier curve**: the same curve behind fonts and the pen tool in every drawing program.' },
      { type: 'p', text: 'A **cubic** Bézier has four control points, P0 to P3. It starts at P0 heading towards P1, and ends at P3 arriving from the direction of P2. It does not pass through P1 and P2: they pull the curve towards them, like magnets.' },
      { type: 'widget', name: 'bezier' },
      { type: 'h2', text: 'De Casteljau: interpolate, and repeat' },
      { type: 'p', text: 'To find the point at t, interpolate between each pair of neighbouring control points with A + t(B − A), the formula from the first lesson of this module. That gives three points. Do the same to them to get two, and once more to get one: that last point is on the curve. The widget’s purple and orange lines are those stages.' },
      { type: 'code', title: 'DeCasteljau.cs', code: cs`
var pts = new V2[] { new(0, 0), new(1, 3), new(4, 3), new(5, 0) };

foreach (double t in new[] { 0, 0.25, 0.5, 0.75, 1 })
    Console.WriteLine($"t = {t,-4}  {Bezier(pts, t)}");

static V2 Bezier(V2[] control, double t)
{
    var p = (V2[])control.Clone();
    for (int n = p.Length - 1; n > 0; n--)          // each pass leaves one point fewer
        for (int i = 0; i < n; i++)
            p[i] = p[i] + (p[i + 1] - p[i]) * t;
    return p[0];
}

readonly record struct V2(double X, double Y)
{
    public static V2 operator +(V2 a, V2 b) => new(a.X + b.X, a.Y + b.Y);
    public static V2 operator -(V2 a, V2 b) => new(a.X - b.X, a.Y - b.Y);
    public static V2 operator *(V2 v, double k) => new(v.X * k, v.Y * k);
    public static double Dot(V2 a, V2 b) => a.X * b.X + a.Y * b.Y;
    public static double Cross(V2 a, V2 b) => a.X * b.Y - a.Y * b.X;
    public double Length => Math.Sqrt(X * X + Y * Y);
    public override string ToString() => $"({X:0.###}, {Y:0.###})";
}`, output: 't = 0     (0, 0)\nt = 0.25  (1.063, 1.688)\nt = 0.5   (2.5, 2.25)\nt = 0.75  (3.938, 1.688)\nt = 1     (5, 0)' },
      { type: 'p', text: 'The same function works for any number of control points: three gives a quadratic Bézier, four a cubic. It is also numerically very stable, because it only ever takes weighted averages of points.' },
      { type: 'h2', text: 'The formula behind it' },
      { type: 'p', text: 'Multiplying out the interpolations gives the **Bernstein form**: B(t) = (1 − t)³·P0 + 3(1 − t)²t·P1 + 3(1 − t)t²·P2 + t³·P3. The four weights always add up to 1, so B(t) is a weighted average of points, as in the points-vs-vectors lesson. As a result, the curve always stays inside the polygon of its control points (the **convex hull property**). That gives a cheap bounding box for clash pre-checks.' },
      { type: 'h2', text: 'Tangent and length' },
      { type: 'p', text: 'The derivative is another Bézier, built from the differences: **B′(t) = 3[(1 − t)²(P1 − P0) + 2(1 − t)t(P2 − P1) + t²(P3 − P2)]**. At t = 0 it is 3(P1 − P0), which is why the curve leaves P0 heading straight at P1. It also equals 3 × the last segment of the de Casteljau construction: the widget’s green arrow.' },
      { type: 'p', text: 'There is no closed formula for a Bézier curve’s length. Sample it at n + 1 points, add up the n chord lengths, and increase n until the answer stops changing. Chords always cut corners, so the estimate only ever grows towards the true length:' },
      { type: 'code', title: 'BezierLength.cs', code: cs`
var pts = new V2[] { new(0, 0), new(1, 3), new(4, 3), new(5, 0) };

for (int n = 4; n <= 256; n *= 4)
{
    double length = 0;
    V2 prev = pts[0];
    for (int i = 1; i <= n; i++)
    {
        V2 p = Bezier(pts, (double)i / n);
        length += (p - prev).Length;
        prev = p;
    }
    Console.WriteLine($"{n,3} segments: {length:F4}");
}

static V2 Bezier(V2[] control, double t)
{
    var p = (V2[])control.Clone();
    for (int n = p.Length - 1; n > 0; n--)
        for (int i = 0; i < n; i++)
            p[i] = p[i] + (p[i + 1] - p[i]) * t;
    return p[0];
}

readonly record struct V2(double X, double Y)
{
    public static V2 operator +(V2 a, V2 b) => new(a.X + b.X, a.Y + b.Y);
    public static V2 operator -(V2 a, V2 b) => new(a.X - b.X, a.Y - b.Y);
    public static V2 operator *(V2 v, double k) => new(v.X * k, v.Y * k);
    public static double Dot(V2 a, V2 b) => a.X * b.X + a.Y * b.Y;
    public static double Cross(V2 a, V2 b) => a.X * b.Y - a.Y * b.X;
    public double Length => Math.Sqrt(X * X + Y * Y);
    public override string ToString() => $"({X:0.###}, {Y:0.###})";
}`, output: '  4 segments: 7.0755\n 16 segments: 7.1835\n 64 segments: 7.1902\n256 segments: 7.1906' },
      { type: 'note', kind: 'tip', text: 'A quick sanity check: the length always lies between the chord |P3 − P0| and the length of the control polygon, |P1 − P0| + |P2 − P1| + |P3 − P2|. Here that is between 5 and 9.325.' },
      { type: 'h2', text: 'Splines: chaining curves' },
      { type: 'p', text: 'One cubic can only make a simple bend, so longer shapes chain several into a **spline**. Sharing the end point makes the chain continuous, but there is a kink unless the tangents line up: the control points on either side of a joint must be **in line** with it. If they are also the same distance from it, the curve is smooth in speed as well as direction. Many spline tools never show you Bézier control points at all:' },
      { type: 'table', head: ['Spline', 'Passes through its points?', 'Typical use'], rows: [
        ['Bézier chain', 'only at the joints', 'pen tools, fonts, freeform edges'],
        ['Catmull-Rom', 'yes, every one', 'a smooth path through surveyed points, camera paths'],
        ['B-spline and NURBS', 'no (usually only the ends)', 'Rhino, Revit’s spline, IFC curves; NURBS can also draw exact circles'],
        ['Hermite', 'yes, with given tangents', 'road and rail transitions, animation']
      ] },
      { type: 'p', text: 'A **Catmull-Rom** span between the points P(i) and P(i+1) is a cubic Bézier with the control points P(i) + (P(i+1) − P(i−1)) ÷ 6 and P(i+1) − (P(i+2) − P(i)) ÷ 6. With that, the code above draws a smooth handrail through surveyed points. For the first and last spans, repeat the end points.' },
      { type: 'code', title: 'CatmullRom.cs', code: cs`
var p = new V2[] { new(0, 0), new(2, 2), new(5, 2), new(7, 0) };   // surveyed points

// The span from p[1] to p[2], as a cubic Bezier
V2 c1 = p[1] + (p[2] - p[0]) * (1.0 / 6);
V2 c2 = p[2] - (p[3] - p[1]) * (1.0 / 6);
var span = new[] { p[1], c1, c2, p[2] };

Console.WriteLine($"Control points {c1} and {c2}");
Console.WriteLine($"Halfway: {Bezier(span, 0.5)}");

static V2 Bezier(V2[] control, double t)
{
    var q = (V2[])control.Clone();
    for (int n = q.Length - 1; n > 0; n--)
        for (int i = 0; i < n; i++)
            q[i] = q[i] + (q[i + 1] - q[i]) * t;
    return q[0];
}

readonly record struct V2(double X, double Y)
{
    public static V2 operator +(V2 a, V2 b) => new(a.X + b.X, a.Y + b.Y);
    public static V2 operator -(V2 a, V2 b) => new(a.X - b.X, a.Y - b.Y);
    public static V2 operator *(V2 v, double k) => new(v.X * k, v.Y * k);
    public static double Dot(V2 a, V2 b) => a.X * b.X + a.Y * b.Y;
    public static double Cross(V2 a, V2 b) => a.X * b.Y - a.Y * b.X;
    public double Length => Math.Sqrt(X * X + Y * Y);
    public override string ToString() => $"({X:0.###}, {Y:0.###})";
}`, output: 'Control points (2.833, 2.333) and (4.167, 2.333)\nHalfway: (3.5, 2.25)' },
      { type: 'note', kind: 'tip', text: 'Next up is the Planes and polygons module: planes, polygon area and orientation, point-in-polygon tests and triangulation. Those are the foundations of rooms, slabs and every face of a 3D model.' },
      { type: 'quiz', question: 'Which control points does a cubic Bézier curve always pass through?', options: ['P0 and P3 only', 'All four', 'P1 and P2', 'None of them'], answer: 0, explain: 'At t = 0 all the weight is on P0, and at t = 1 all of it is on P3. P1 and P2 only pull the curve towards them.' },
      { type: 'quiz', question: 'Two cubic Bézier curves share the end point J. When is the joint free of a kink?', options: [
        'When the control points on either side of J are in line with J',
        'When both curves have the same length',
        'Always: sharing the point is enough',
        'When J is at t = 0.5'
      ], answer: 0, explain: 'The tangent leaving a curve at its end points along its last control-polygon leg. If the two legs at J are in line, the tangent directions match and the joint is smooth.' },
      { type: 'exercise', task: 'Write `Tangent(control, t)` for a cubic Bézier using the derivative formula. For the control points (0, 0), (0, 2), (3, 3) and (4, 3), print the curve point and the unit tangent at t = 0, 0.5 and 1.', hint: 'With s = 1 − t, B′(t) = 3[s²(P1 − P0) + 2st(P2 − P1) + t²(P3 − P2)]. Divide by its length to get the unit tangent. At the ends it should point along the first and last legs of the control polygon.', solution: cs`
var pts = new V2[] { new(0, 0), new(0, 2), new(3, 3), new(4, 3) };

foreach (double t in new[] { 0, 0.5, 1 })
{
    V2 d = Tangent(pts, t);
    Console.WriteLine($"t = {t}: point {Bezier(pts, t)}, tangent {d * (1 / d.Length)}");
}

static V2 Tangent(V2[] p, double t)
{
    double s = 1 - t;
    return ((p[1] - p[0]) * (s * s) + (p[2] - p[1]) * (2 * s * t) + (p[3] - p[2]) * (t * t)) * 3;
}

static V2 Bezier(V2[] control, double t)
{
    var p = (V2[])control.Clone();
    for (int n = p.Length - 1; n > 0; n--)
        for (int i = 0; i < n; i++)
            p[i] = p[i] + (p[i + 1] - p[i]) * t;
    return p[0];
}

readonly record struct V2(double X, double Y)
{
    public static V2 operator +(V2 a, V2 b) => new(a.X + b.X, a.Y + b.Y);
    public static V2 operator -(V2 a, V2 b) => new(a.X - b.X, a.Y - b.Y);
    public static V2 operator *(V2 v, double k) => new(v.X * k, v.Y * k);
    public static double Dot(V2 a, V2 b) => a.X * b.X + a.Y * b.Y;
    public static double Cross(V2 a, V2 b) => a.X * b.Y - a.Y * b.X;
    public double Length => Math.Sqrt(X * X + Y * Y);
    public override string ToString() => $"({X:0.###}, {Y:0.###})";
}`, output: 't = 0: point (0, 0), tangent (0, 1)\nt = 0.5: point (1.625, 2.25), tangent (0.868, 0.496)\nt = 1: point (4, 3), tangent (1, 0)' }
    ],
    keyPoints: [
      'A cubic Bézier starts at P0 towards P1 and ends at P3 from P2; it passes through neither P1 nor P2.',
      'De Casteljau’s algorithm evaluates it by repeated interpolation: 4 points, then 3, 2 and 1.',
      'The Bernstein weights add up to 1, so the curve stays inside its control polygon.',
      'The tangent is B′(t); the length has no formula, so sum chords and increase the count until it settles.',
      'Splines chain curves; line up the control points at each joint to avoid kinks. Catmull-Rom passes through every point.'
    ]
  }
];
