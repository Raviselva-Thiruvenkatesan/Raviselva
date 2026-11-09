import { Lesson } from '../learn.types';
import { cs } from '../csharp/cs';

export const PLANES_POLYGONS: Lesson[] = [
  // ------------------------------------------------------------------ 1
  {
    slug: 'planes',
    title: 'Planes: point and normal, ax + by + cz + d',
    summary: 'A plane is a flat surface that goes on for ever: a floor level, a wall face, a roof slope, a section cut. Store it as a point and a normal, or as four numbers a, b, c and d, and build one from three points.',
    minutes: 13,
    blocks: [
      { type: 'p', text: 'Levels, wall faces, roof slopes, work planes and section cuts are all **planes**: flat surfaces that go on for ever in every direction. A BIM model is full of them, and most 3D questions (“how high is the roof here?”, “where does this pipe cross the slab?”) start with one.' },
      { type: 'p', text: 'A plane needs just two things: **a point P0 on it** and a **normal n**, a vector at right angles to it. Change the normal’s tilt and direction and the value d below, and watch how the equation changes.' },
      { type: 'widget', name: 'plane-eq' },
      { type: 'h2', text: 'Point and normal' },
      { type: 'p', text: 'A point X is on the plane when the step from P0 to X lies flat in the plane, which means it is at right angles to the normal: **(X − P0)·n = 0**. This is the dot-product test for “perpendicular” from the Vectors module.' },
      { type: 'h2', text: 'The equation ax + by + cz + d = 0' },
      { type: 'p', text: 'Multiply out (X − P0)·n = 0 and you get n·X − n·P0 = 0. Write n = (a, b, c) and **d = −n·P0**, and it becomes **ax + by + cz + d = 0**. Four numbers describe the whole plane. If n is a **unit** vector, they mean something useful:' },
      { type: 'ul', items: [
        '(a, b, c) is the direction the plane faces.',
        '|d| is the plane’s distance from the origin, and −d·n is its closest point to the origin (P0 in the widget).',
        'Putting any point into ax + by + cz + d gives its **signed distance** from the plane. That is the subject of the next lesson.'
      ] },
      { type: 'table', head: ['Plane', 'Unit normal (a, b, c)', 'd', 'Equation'], rows: [
        ['Level 2 floor at 3.6 m', '(0, 0, 1)', '−3.6', 'z − 3.6 = 0'],
        ['Wall face along X at y = 5', '(0, 1, 0)', '−5', 'y − 5 = 0'],
        ['Roof rising north at 36.87° from eaves at z = 3', '(0, −0.6, 0.8)', '−2.4', '−0.6y + 0.8z − 2.4 = 0'],
        ['Section cut at x = 12', '(1, 0, 0)', '−12', 'x − 12 = 0']
      ] },
      { type: 'h2', text: 'A plane from three points' },
      { type: 'p', text: 'Survey data and modelling tools often give a plane as three points on it, such as three corners of a roof. Two edges from the first point lie in the plane, so their **cross product** is a normal. Normalise it, then d = −n·A.' },
      { type: 'code', title: 'PlaneFromPoints.cs', code: cs`
var a = new V3(0, 0, 3);                  // eaves, one end
var b = new V3(10, 0, 3);                 // eaves, other end
var c = new V3(0, 4, 6);                  // a point on the ridge

V3 n = V3.Cross(b - a, c - a).Normalized();
double d = -V3.Dot(n, a);
Console.WriteLine($"n = {n}, d = {d:0.###}");
Console.WriteLine($"Pitch {Math.Acos(n.Z) * 180 / Math.PI:F2} deg");

foreach (var q in new V3[] { new(5, 2, 4.5), new(5, 2, 5) })
{
    double s = V3.Dot(n, q) + d;
    Console.WriteLine($"{q}: {(Math.Abs(s) < 1e-9 ? "on the roof plane" : "off the plane")}");
}

readonly record struct V3(double X, double Y, double Z)
{
    public static V3 operator +(V3 a, V3 b) => new(a.X + b.X, a.Y + b.Y, a.Z + b.Z);
    public static V3 operator -(V3 a, V3 b) => new(a.X - b.X, a.Y - b.Y, a.Z - b.Z);
    public static V3 operator *(V3 v, double k) => new(v.X * k, v.Y * k, v.Z * k);
    public static double Dot(V3 a, V3 b) => a.X * b.X + a.Y * b.Y + a.Z * b.Z;
    public static V3 Cross(V3 a, V3 b) =>
        new(a.Y * b.Z - a.Z * b.Y, a.Z * b.X - a.X * b.Z, a.X * b.Y - a.Y * b.X);
    public double Length => Math.Sqrt(Dot(this, this));
    public V3 Normalized() => this * (1 / Length);
    public override string ToString() => $"({X:0.###}, {Y:0.###}, {Z:0.###})";
}`, output: 'n = (0, -0.6, 0.8), d = -2.4\nPitch 36.87 deg\n(5, 2, 4.5): on the roof plane\n(5, 2, 5): off the plane' },
      { type: 'p', text: 'The pitch comes free: the angle between the roof’s normal and straight up equals the angle between the roof and the horizontal, and n·(0, 0, 1) is just n.z.' },
      { type: 'note', kind: 'warn', text: 'If the three points are in a line, the cross product is (almost) zero and `Normalized` divides by zero. Check its length against a tolerance first, exactly as with a 3-point arc.' },
      { type: 'h2', text: 'Which way does the normal point?' },
      { type: 'p', text: 'n and −n describe the same plane, with d changing sign. The choice still matters, because it says which side is “in front”. BIM and mesh formats use one convention: **face normals point out of the solid**, so a floor’s top face points up and a wall’s exterior face points outdoors. The order of the three points sets the direction: seen from the side the normal points to, A → B → C runs counterclockwise. The polygon-winding lesson in this module builds on that.' },
      { type: 'quiz', question: 'What is the plane z − 3.6 = 0?', options: ['A horizontal level 3.6 m up', 'A vertical wall 3.6 m from the origin', 'A plane sloping at 3.6°', 'A plane through the origin'], answer: 0, explain: 'The normal is (0, 0, 1), straight up, so the plane is horizontal. It holds every point with z = 3.6.' },
      { type: 'quiz', question: 'n = (0, 0, 1) with d = −3, and n = (0, 0, −1) with d = 3. What are they?', options: [
        'The same plane, facing opposite ways',
        'Two parallel planes 6 m apart',
        'Two planes that cross at right angles',
        'Not valid planes'
      ], answer: 0, explain: 'Both say z = 3. Flipping both the normal and d describes the same set of points; only the side that counts as “in front” changes.' },
      { type: 'exercise', task: 'A wall face runs at 45° in plan through the point (2, 0, 0), with normal (1, 1, 0). Normalise the normal, compute d, and test whether the points (0, 2, 5) and (2, 2, 0) lie on the face, with a tolerance of 1e-6. For a point that is off it, print how far off it is.', hint: 'n = (1, 1, 0) ÷ √2 and d = −n·(2, 0, 0). Because n is a unit vector, n·q + d is the distance itself.', solution: cs`
var p0 = new V3(2, 0, 0);
V3 n = new V3(1, 1, 0).Normalized();
double d = -V3.Dot(n, p0);
Console.WriteLine($"n = {n}, d = {d:0.###}");

foreach (var q in new V3[] { new(0, 2, 5), new(2, 2, 0) })
{
    double s = V3.Dot(n, q) + d;
    Console.WriteLine(Math.Abs(s) < 1e-6 ? $"{q}: on the plane" : $"{q}: {s:0.###} m off");
}

readonly record struct V3(double X, double Y, double Z)
{
    public static V3 operator +(V3 a, V3 b) => new(a.X + b.X, a.Y + b.Y, a.Z + b.Z);
    public static V3 operator -(V3 a, V3 b) => new(a.X - b.X, a.Y - b.Y, a.Z - b.Z);
    public static V3 operator *(V3 v, double k) => new(v.X * k, v.Y * k, v.Z * k);
    public static double Dot(V3 a, V3 b) => a.X * b.X + a.Y * b.Y + a.Z * b.Z;
    public static V3 Cross(V3 a, V3 b) =>
        new(a.Y * b.Z - a.Z * b.Y, a.Z * b.X - a.X * b.Z, a.X * b.Y - a.Y * b.X);
    public double Length => Math.Sqrt(Dot(this, this));
    public V3 Normalized() => this * (1 / Length);
    public override string ToString() => $"({X:0.###}, {Y:0.###}, {Z:0.###})";
}`, output: 'n = (0.707, 0.707, 0), d = -1.414\n(0, 2, 5): on the plane\n(2, 2, 0): 1.414 m off' }
    ],
    keyPoints: [
      'A plane is a point P0 and a normal n; X is on it when (X − P0)·n = 0.',
      'Expanded, that is ax + by + cz + d = 0 with (a, b, c) = n and d = −n·P0.',
      'With a unit normal, |d| is the distance from the origin and ax + by + cz + d is a signed distance.',
      'Three points give a plane: n = (B − A) × (C − A), normalised; check for collinear points first.',
      'n and −n give the same plane; by convention, face normals point out of the solid.'
    ]
  },

  // ------------------------------------------------------------------ 2
  {
    slug: 'point-plane',
    title: 'Point-to-plane distance and projection',
    summary: 'With a unit normal, one dot product gives a point’s signed distance from a plane and its closest point on it. Learn when to project along the normal and when to drop vertically, and how to mirror in a plane.',
    minutes: 13,
    blocks: [
      { type: 'p', text: 'Is this duct above the ceiling? How much insulation fits between the rafters and the services? Where does a rooftop unit sit on the roof? Each of these is a question about a point and a plane, and with a **unit** normal the answer takes a single dot product.' },
      { type: 'widget', name: 'point-plane' },
      { type: 'h2', text: 'Signed distance' },
      { type: 'p', text: 'For a plane n·X + d = 0 with |n| = 1, the **signed distance** of a point P is **s = n·P + d**:' },
      { type: 'ul', items: [
        's > 0: P is on the side the normal points to (above a floor, outside a wall face).',
        's < 0: P is on the other side (below the floor, inside the wall).',
        's = 0: P is on the plane. In practice, |s| < a tolerance.'
      ] },
      { type: 'p', text: 'The closest point of the plane, the **foot of the perpendicular**, is **Q = P − s·n**: move back along the normal by exactly the distance. This is the 3D version of the closest-point lesson in the last module, and it needs no clamping, because a plane has no ends.' },
      { type: 'code', title: 'DistanceToRoof.cs', code: cs`
var n = new V3(0, -0.6, 0.8);             // unit normal of the roof from the last lesson
double d = -2.4;

foreach (var p in new V3[] { new(4, 1, 5), new(4, 2, 3) })
{
    double s = V3.Dot(n, p) + d;          // signed distance
    V3 q = p - n * s;                     // foot of the perpendicular
    Console.WriteLine($"{p}: s = {s:0.###}, {(s > 0 ? "above" : "below")} the roof, closest point {q}");
}

readonly record struct V3(double X, double Y, double Z)
{
    public static V3 operator +(V3 a, V3 b) => new(a.X + b.X, a.Y + b.Y, a.Z + b.Z);
    public static V3 operator -(V3 a, V3 b) => new(a.X - b.X, a.Y - b.Y, a.Z - b.Z);
    public static V3 operator *(V3 v, double k) => new(v.X * k, v.Y * k, v.Z * k);
    public static double Dot(V3 a, V3 b) => a.X * b.X + a.Y * b.Y + a.Z * b.Z;
    public static V3 Cross(V3 a, V3 b) =>
        new(a.Y * b.Z - a.Z * b.Y, a.Z * b.X - a.X * b.Z, a.X * b.Y - a.Y * b.X);
    public double Length => Math.Sqrt(Dot(this, this));
    public V3 Normalized() => this * (1 / Length);
    public override string ToString() => $"({X:0.###}, {Y:0.###}, {Z:0.###})";
}`, output: '(4, 1, 5): s = 1, above the roof, closest point (4, 1.6, 4.2)\n(4, 2, 3): s = -1.2, below the roof, closest point (4, 1.28, 3.96)' },
      { type: 'note', kind: 'warn', text: 'If n is not a unit vector, n·P + d is the distance multiplied by |n|. Either normalise n (and d) once when you build the plane, or divide by |n| every time. Mixing the two is a classic source of “almost right” clearances.' },
      { type: 'h2', text: 'Dropping vertically instead' },
      { type: 'p', text: 'To place a rooftop unit, a lamp post on a sloping site or a pile on the terrain, you do not want the closest point of the plane: you want the point **directly below**. Solve ax + by + cz + d = 0 for z at the plan position (x, y): **z = −(ax + by + d) ÷ c**. Switch the widget to “Drop vertically” to compare: on a slope, the vertical gap is always longer than the perpendicular distance (gap = s ÷ cos pitch).' },
      { type: 'code', title: 'RoofHeight.cs', code: cs`
var n = new V3(0, -0.6, 0.8);
double d = -2.4;
if (Math.Abs(n.Z) < 1e-9) throw new InvalidOperationException("A vertical plane has no height at a plan point");

foreach (var (x, y) in new[] { (4.0, 1.0), (4.0, 3.0), (7.5, 0.0) })
{
    double z = -(n.X * x + n.Y * y + d) / n.Z;      // solve ax + by + cz + d = 0 for z
    Console.WriteLine($"Roof above ({x}, {y}) is at z = {z:F3}");
}

readonly record struct V3(double X, double Y, double Z)
{
    public static V3 operator +(V3 a, V3 b) => new(a.X + b.X, a.Y + b.Y, a.Z + b.Z);
    public static V3 operator -(V3 a, V3 b) => new(a.X - b.X, a.Y - b.Y, a.Z - b.Z);
    public static V3 operator *(V3 v, double k) => new(v.X * k, v.Y * k, v.Z * k);
    public static double Dot(V3 a, V3 b) => a.X * b.X + a.Y * b.Y + a.Z * b.Z;
    public static V3 Cross(V3 a, V3 b) =>
        new(a.Y * b.Z - a.Z * b.Y, a.Z * b.X - a.X * b.Z, a.X * b.Y - a.Y * b.X);
    public double Length => Math.Sqrt(Dot(this, this));
    public V3 Normalized() => this * (1 / Length);
    public override string ToString() => $"({X:0.###}, {Y:0.###}, {Z:0.###})";
}`, output: 'Roof above (4, 1) is at z = 3.750\nRoof above (4, 3) is at z = 5.250\nRoof above (7.5, 0) is at z = 3.000' },
      { type: 'h2', text: 'Projecting a direction onto a plane' },
      { type: 'p', text: 'Vectors can be projected too. Remove the part of v along the normal and what is left lies in the plane: **v − (v·n)·n**. Project “straight down” onto a roof and you get the direction rainwater runs, the **line of steepest slope**, which is what a drainage designer needs.' },
      { type: 'code', title: 'FallLine.cs', code: cs`
var n = new V3(0, -0.6, 0.8);             // the roof's unit normal
var down = new V3(0, 0, -1);

V3 along = down - n * V3.Dot(down, n);    // remove the part along the normal
V3 u = along.Normalized();
Console.WriteLine($"Water runs along {u}");
Console.WriteLine($"Slope of that line: {Math.Asin(-u.Z) * 180 / Math.PI:F2} deg");

readonly record struct V3(double X, double Y, double Z)
{
    public static V3 operator +(V3 a, V3 b) => new(a.X + b.X, a.Y + b.Y, a.Z + b.Z);
    public static V3 operator -(V3 a, V3 b) => new(a.X - b.X, a.Y - b.Y, a.Z - b.Z);
    public static V3 operator *(V3 v, double k) => new(v.X * k, v.Y * k, v.Z * k);
    public static double Dot(V3 a, V3 b) => a.X * b.X + a.Y * b.Y + a.Z * b.Z;
    public static V3 Cross(V3 a, V3 b) =>
        new(a.Y * b.Z - a.Z * b.Y, a.Z * b.X - a.X * b.Z, a.X * b.Y - a.Y * b.X);
    public double Length => Math.Sqrt(Dot(this, this));
    public V3 Normalized() => this * (1 / Length);
    public override string ToString() => $"({X:0.###}, {Y:0.###}, {Z:0.###})";
}`, output: 'Water runs along (0, -0.8, -0.6)\nSlope of that line: 36.87 deg' },
      { type: 'p', text: 'The water runs towards −Y, to the eaves, and the fall line is exactly as steep as the roof’s pitch. Any other line drawn on the roof is flatter.' },
      { type: 'quiz', question: 'A floor plane has the unit normal (0, 0, 1) and d = −3. What is the signed distance of P = (2, 5, 2.5)?', options: ['−0.5: half a metre below the floor', '0.5: half a metre above', '2.5', '−3'], answer: 0, explain: 's = n·P + d = 2.5 − 3 = −0.5. It is negative, so P is on the side opposite the normal: below the floor.' },
      { type: 'quiz', question: 'You place a mast on a sloping roof. Which projection gives its base?', options: [
        'Dropping vertically: z = −(ax + by + d) ÷ c',
        'Projecting along the normal: P − s·n',
        'Either: they give the same point',
        'Neither works on a slope'
      ], answer: 0, explain: 'A mast stands vertically, so its base is straight below its plan position. Projecting along the normal would move it sideways, down the slope.' },
      { type: 'exercise', task: 'Mirroring in a plane is a projection taken twice as far: P′ = P − 2s·n. Write `Mirror(p, n, d)` and mirror a light fitting at (2, 3, 2.5) in the wall plane x = 5, and the point (4, 1, 5) in the roof plane from this lesson.', hint: 'The wall has n = (1, 0, 0) and d = −5. Compute s = n·p + d inside `Mirror`; it is negative for the light because the light is behind the wall’s normal.', solution: cs`
var light = new V3(2, 3, 2.5);
Console.WriteLine($"In the wall x = 5: {Mirror(light, new V3(1, 0, 0), -5)}");
var dish = new V3(4, 1, 5);
Console.WriteLine($"In the roof: {Mirror(dish, new V3(0, -0.6, 0.8), -2.4)}");

static V3 Mirror(V3 p, V3 n, double d) => p - n * (2 * (V3.Dot(n, p) + d));

readonly record struct V3(double X, double Y, double Z)
{
    public static V3 operator +(V3 a, V3 b) => new(a.X + b.X, a.Y + b.Y, a.Z + b.Z);
    public static V3 operator -(V3 a, V3 b) => new(a.X - b.X, a.Y - b.Y, a.Z - b.Z);
    public static V3 operator *(V3 v, double k) => new(v.X * k, v.Y * k, v.Z * k);
    public static double Dot(V3 a, V3 b) => a.X * b.X + a.Y * b.Y + a.Z * b.Z;
    public static V3 Cross(V3 a, V3 b) =>
        new(a.Y * b.Z - a.Z * b.Y, a.Z * b.X - a.X * b.Z, a.X * b.Y - a.Y * b.X);
    public double Length => Math.Sqrt(Dot(this, this));
    public V3 Normalized() => this * (1 / Length);
    public override string ToString() => $"({X:0.###}, {Y:0.###}, {Z:0.###})";
}`, output: 'In the wall x = 5: (8, 3, 2.5)\nIn the roof: (4, 2.2, 3.4)' }
    ],
    keyPoints: [
      'With a unit normal, s = n·P + d is the signed distance: positive in front, negative behind.',
      'The closest point of the plane is Q = P − s·n; there is nothing to clamp.',
      'To set something down on a roof or terrain, drop vertically: z = −(ax + by + d) ÷ c, if c ≠ 0.',
      'v − (v·n)·n projects a direction into the plane; projecting “down” gives the fall line.',
      'Mirroring in a plane is P − 2s·n.'
    ]
  },

  // ------------------------------------------------------------------ 3
  {
    slug: 'plane-intersections',
    title: 'Line–plane and plane–plane intersection',
    summary: 'Find where a pipe passes through a slab, or a pick ray hits a work plane, with one division. Then intersect two planes to get ridges, hips and valleys, and see why a hip is always flatter than the roof.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'Where does this pipe pass through the floor, so a sleeve can be placed? Where does the mouse ray hit the work plane? Where do two roof slopes meet? These are **intersections**: a line with a plane, and a plane with a plane.' },
      { type: 'widget', name: 'line-plane' },
      { type: 'h2', text: 'A line and a plane' },
      { type: 'p', text: 'Write the line as A + t·u and the plane as n·X + d = 0. Substitute the line into the plane: n·(A + t·u) + d = 0, so **t = −(n·A + d) ÷ (n·u)**. The top is the signed distance of A (times |n|), and the bottom says how fast the line approaches the plane.' },
      { type: 'table', head: ['Result', 'Meaning'], rows: [
        ['n·u ≈ 0 and n·A + d ≈ 0', 'the line lies in the plane'],
        ['n·u ≈ 0, otherwise', 'the line is parallel to the plane and never meets it'],
        ['0 ≤ t ≤ 1 (with u = B − A)', 'the segment AB passes through the plane at A + t·u'],
        ['t < 0 or t > 1', 'the line meets the plane, but beyond an end of the segment']
      ] },
      { type: 'code', title: 'SleevePosition.cs', code: cs`
var a = new V3(1, 2, 0.5);                // pipe start
var b = new V3(4, 6, 5.5);                // pipe end
var up = new V3(0, 0, 1);

foreach (var (name, level) in new[] { ("Slab top", 3.0), ("Slab soffit", 2.75) })
{
    double? t = Hit(a, b - a, up, -level);
    Console.WriteLine(t is double v && v >= 0 && v <= 1
        ? $"{name}: t = {v}, at {a + (b - a) * v}"
        : $"{name}: no crossing");
}

static double? Hit(V3 a, V3 u, V3 n, double d)
{
    double nu = V3.Dot(n, u);
    if (Math.Abs(nu) < 1e-12) return null;   // parallel to the plane
    return -(V3.Dot(n, a) + d) / nu;
}

readonly record struct V3(double X, double Y, double Z)
{
    public static V3 operator +(V3 a, V3 b) => new(a.X + b.X, a.Y + b.Y, a.Z + b.Z);
    public static V3 operator -(V3 a, V3 b) => new(a.X - b.X, a.Y - b.Y, a.Z - b.Z);
    public static V3 operator *(V3 v, double k) => new(v.X * k, v.Y * k, v.Z * k);
    public static double Dot(V3 a, V3 b) => a.X * b.X + a.Y * b.Y + a.Z * b.Z;
    public static V3 Cross(V3 a, V3 b) =>
        new(a.Y * b.Z - a.Z * b.Y, a.Z * b.X - a.X * b.Z, a.X * b.Y - a.Y * b.X);
    public double Length => Math.Sqrt(Dot(this, this));
    public V3 Normalized() => this * (1 / Length);
    public override string ToString() => $"({X:0.###}, {Y:0.###}, {Z:0.###})";
}`, output: 'Slab top: t = 0.5, at (2.5, 4, 3)\nSlab soffit: t = 0.45, at (2.35, 3.8, 2.75)' },
      { type: 'p', text: 'The two points are offset in plan because the pipe is sloping: the opening has to be long enough to cover both, plus the pipe’s radius and insulation. A **pick ray** works the same way: the mouse position gives a ray from the camera, and t says how far along it the work plane is.' },
      { type: 'note', kind: 'tip', text: 'Keep the tolerance in the parallel test relative to the lengths: |n·u| < ε·|u| for a unit n. An absolute 1e-12 is fine for this example, but not for a 0.05 m pipe stub in a model measured in millimetres.' },
      { type: 'h2', text: 'Two planes' },
      { type: 'p', text: 'Two planes that are not parallel meet in a **line**. Its direction lies in both planes, so it is at right angles to both normals: **n1 × n2**. For a point on it, write the planes as n·X = h (h = −d) and look for the point that is a mix c1·n1 + c2·n2 of the two normals. Putting that into both equations gives:' },
      { type: 'ul', items: [
        'c1 = (h1·(n2·n2) − h2·(n1·n2)) ÷ |n1 × n2|²',
        'c2 = (h2·(n1·n1) − h1·(n1·n2)) ÷ |n1 × n2|²',
        'The point c1·n1 + c2·n2 is the point of the line closest to the origin. If n1 × n2 ≈ 0, the planes are parallel.'
      ] },
      { type: 'code', title: 'RoofLines.cs', code: cs`
var slopeA = (N: new V3(0, -0.6, 0.8), H: 2.4);   // n.X = h, rising from eaves at y = 0
var slopeB = (N: new V3(0, 0.6, 0.8), H: 7.2);    // the opposite slope, eaves at y = 8
var endC = (N: new V3(0.6, 0, 0.8), H: 2.4);      // the hipped end, eaves at x = 0

Report("Ridge", slopeA.N, slopeA.H, slopeB.N, slopeB.H);
Report("Hip", slopeA.N, slopeA.H, endC.N, endC.H);

static void Report(string name, V3 n1, double h1, V3 n2, double h2)
{
    V3 dir = V3.Cross(n1, n2);
    double det = V3.Dot(dir, dir);
    if (det < 1e-12) { Console.WriteLine($"{name}: parallel planes"); return; }
    double n12 = V3.Dot(n1, n2);
    double c1 = (h1 * V3.Dot(n2, n2) - h2 * n12) / det;
    double c2 = (h2 * V3.Dot(n1, n1) - h1 * n12) / det;
    V3 p = n1 * c1 + n2 * c2;                     // the point of the line nearest the origin
    V3 u = dir.Normalized();
    Console.WriteLine($"{name}: through {p}, direction {u}, slope {Math.Asin(Math.Abs(u.Z)) * 180 / Math.PI:F2} deg");
}

readonly record struct V3(double X, double Y, double Z)
{
    public static V3 operator +(V3 a, V3 b) => new(a.X + b.X, a.Y + b.Y, a.Z + b.Z);
    public static V3 operator -(V3 a, V3 b) => new(a.X - b.X, a.Y - b.Y, a.Z - b.Z);
    public static V3 operator *(V3 v, double k) => new(v.X * k, v.Y * k, v.Z * k);
    public static double Dot(V3 a, V3 b) => a.X * b.X + a.Y * b.Y + a.Z * b.Z;
    public static V3 Cross(V3 a, V3 b) =>
        new(a.Y * b.Z - a.Z * b.Y, a.Z * b.X - a.X * b.Z, a.X * b.Y - a.Y * b.X);
    public double Length => Math.Sqrt(Dot(this, this));
    public V3 Normalized() => this * (1 / Length);
    public override string ToString() => $"({X:0.###}, {Y:0.###}, {Z:0.###})";
}`, output: 'Ridge: through (0, 4, 6), direction (-1, 0, 0), slope 0.00 deg\nHip: through (0.878, -0.878, 2.341), direction (-0.625, 0.625, 0.469), slope 27.94 deg' },
      { type: 'p', text: 'The ridge is level, 6 m up and 4 m in from both eaves. The hip runs at 45° in plan (both slopes have the same pitch), but it rises at only about 27.9°, against 36.87° for the roof. A hip or valley is always **flatter** than the slopes it joins, because it covers more ground for the same rise. The printed point is just the point of the line nearest the origin, which here is outside the building; the hip also passes through the corner (0, 0, 3), where the two eaves meet.' },
      { type: 'note', kind: 'info', text: 'Three planes usually meet in a single point: intersect two to get a line, then intersect that line with the third. That is how a roof’s apex, or the corner where two walls meet a floor, is found.' },
      { type: 'quiz', question: 'For a line A + t·u and a plane, n·u = 0. What does that tell you?', options: [
        'The line is parallel to the plane: it never meets it, or lies in it',
        'The line meets the plane at A',
        'The line is at right angles to the plane',
        'The plane passes through the origin'
      ], answer: 0, explain: 'n·u = 0 means u is at right angles to the normal, so the line runs parallel to the plane. Then n·A + d decides between “in the plane” (0) and “never meets it”.' },
      { type: 'quiz', question: 'Why is the direction of the line where two planes meet n1 × n2?', options: [
        'It must lie in both planes, so it is at right angles to both normals',
        'Because the cross product is always vertical',
        'It is the average of the two normals',
        'It is not: the direction is n1 + n2'
      ], answer: 0, explain: 'Any direction within a plane is perpendicular to that plane’s normal. A direction in both planes is perpendicular to both normals, and the cross product is exactly such a vector.' },
      { type: 'exercise', task: 'A wall face is the plane x = 4. Write a function that tests a pipe from A to B against it and prints the crossing point, “parallel to the wall” or “does not reach the wall”. Try the pipes (1, 1, 3) → (7, 3, 3) and (1, 1, 3) → (1, 5, 3).', hint: 'The wall has n = (1, 0, 0) and d = −4. Compute n·u first: for the second pipe it is 0.', solution: cs`
var wallN = new V3(1, 0, 0);
double wallD = -4;                        // the wall face x = 4

Test(new V3(1, 1, 3), new V3(7, 3, 3));
Test(new V3(1, 1, 3), new V3(1, 5, 3));

void Test(V3 a, V3 b)
{
    V3 u = b - a;
    double nu = V3.Dot(wallN, u);
    if (Math.Abs(nu) < 1e-12) { Console.WriteLine($"{a} to {b}: parallel to the wall"); return; }
    double t = -(V3.Dot(wallN, a) + wallD) / nu;
    Console.WriteLine(t >= 0 && t <= 1 ? $"{a} to {b}: crosses at {a + u * t}" : $"{a} to {b}: does not reach the wall");
}

readonly record struct V3(double X, double Y, double Z)
{
    public static V3 operator +(V3 a, V3 b) => new(a.X + b.X, a.Y + b.Y, a.Z + b.Z);
    public static V3 operator -(V3 a, V3 b) => new(a.X - b.X, a.Y - b.Y, a.Z - b.Z);
    public static V3 operator *(V3 v, double k) => new(v.X * k, v.Y * k, v.Z * k);
    public static double Dot(V3 a, V3 b) => a.X * b.X + a.Y * b.Y + a.Z * b.Z;
    public static V3 Cross(V3 a, V3 b) =>
        new(a.Y * b.Z - a.Z * b.Y, a.Z * b.X - a.X * b.Z, a.X * b.Y - a.Y * b.X);
    public double Length => Math.Sqrt(Dot(this, this));
    public V3 Normalized() => this * (1 / Length);
    public override string ToString() => $"({X:0.###}, {Y:0.###}, {Z:0.###})";
}`, output: '(1, 1, 3) to (7, 3, 3): crosses at (4, 2, 3)\n(1, 1, 3) to (1, 5, 3): parallel to the wall' }
    ],
    keyPoints: [
      'Line A + t·u meets plane n·X + d = 0 at t = −(n·A + d) ÷ (n·u).',
      'n·u ≈ 0 means parallel: test it before dividing, with a tolerance relative to |u|.',
      'For a segment, only 0 ≤ t ≤ 1 is a real crossing: that is where sleeves and openings go.',
      'Two planes meet along n1 × n2; a point on the line comes from mixing the two normals.',
      'Ridges, hips and valleys are plane–plane intersections, and hips are flatter than the roof.'
    ]
  },

  // ------------------------------------------------------------------ 4
  {
    slug: 'polygon-area-normal',
    title: 'Polygon area, normal and winding',
    summary: 'The shoelace formula gives a room’s area from its corners, with a sign that says which way round the boundary goes. Use the sign for holes, find the centroid, and extend it to sloping 3D faces with Newell’s method.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'Room areas, slab areas, finishes takeoffs and fire compartments all come down to one question: **what is the area inside this boundary?** The answer is a short loop over the corners called the **shoelace formula**, and it gives you the boundary’s direction for free.' },
      { type: 'widget', name: 'shoelace' },
      { type: 'h2', text: 'The shoelace formula' },
      { type: 'p', text: 'For corners P0 … P(n−1), **area = ½ Σ (x_i·y_(i+1) − x_(i+1)·y_i)**, wrapping round so the last corner pairs with the first. Each term is the 2D cross product P_i × P_(i+1): twice the signed area of the triangle from the origin to that edge. Triangles on the far side of the polygon come out negative, so everything outside the room cancels and the room’s area is left. That is what the widget’s blue and red triangles show.' },
      { type: 'code', title: 'RoomArea.cs', code: cs`
var room = new V2[] { new(0, 0), new(8, 0), new(8, 3), new(3, 3), new(3, 6), new(0, 6) };

double twice = 0, perimeter = 0, cx = 0, cy = 0;
for (int i = 0; i < room.Length; i++)
{
    V2 a = room[i], b = room[(i + 1) % room.Length];
    double cross = a.X * b.Y - b.X * a.Y;      // twice the signed area of triangle (O, a, b)
    twice += cross;
    cx += (a.X + b.X) * cross;
    cy += (a.Y + b.Y) * cross;
    perimeter += (b - a).Length;
}
double area = twice / 2;
Console.WriteLine($"Signed area {area} m2 ({(area > 0 ? "counterclockwise" : "clockwise")})");
Console.WriteLine($"Perimeter {perimeter} m");
Console.WriteLine($"Centroid ({cx / (6 * area):F3}, {cy / (6 * area):F3})");

readonly record struct V2(double X, double Y)
{
    public static V2 operator +(V2 a, V2 b) => new(a.X + b.X, a.Y + b.Y);
    public static V2 operator -(V2 a, V2 b) => new(a.X - b.X, a.Y - b.Y);
    public static V2 operator *(V2 v, double k) => new(v.X * k, v.Y * k);
    public static double Dot(V2 a, V2 b) => a.X * b.X + a.Y * b.Y;
    public static double Cross(V2 a, V2 b) => a.X * b.Y - a.Y * b.X;
    public double Length => Math.Sqrt(X * X + Y * Y);
    public override string ToString() => $"({X:0.###}, {Y:0.###})";
}`, output: 'Signed area 33 m2 (counterclockwise)\nPerimeter 28 m\nCentroid (3.318, 2.318)' },
      { type: 'p', text: 'The **centroid** comes from the same loop: it is the balance point of the shape, the place to put a room tag or the centre of a load. For an L-shaped room it is pulled towards the bigger wing, and it can even lie outside a strongly concave shape.' },
      { type: 'h2', text: 'Winding: the sign means something' },
      { type: 'p', text: 'The sign of the sum says which way round the corners go: **positive is counterclockwise**, negative is clockwise (seen from above, with Y up). Reverse the order in the widget and only the sign changes. File formats use this deliberately: in IFC profiles, GIS shapes and many CAD tools, the outer boundary runs one way and **holes run the other way**, so simply adding the signed areas subtracts the holes.' },
      { type: 'code', title: 'Holes.cs', code: cs`
var outer = new V2[] { new(0, 0), new(10, 0), new(10, 8), new(0, 8) };          // counterclockwise
var column = new V2[] { new(5, 4), new(5, 4.4), new(5.4, 4.4), new(5.4, 4) };   // clockwise: a hole

Console.WriteLine($"Outer {SignedArea(outer)}, column {SignedArea(column):0.##}");
Console.WriteLine($"Net floor area {SignedArea(outer) + SignedArea(column):0.##} m2");

static double SignedArea(V2[] p)
{
    double s = 0;
    for (int i = 0; i < p.Length; i++) s += V2.Cross(p[i], p[(i + 1) % p.Length]);
    return s / 2;
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
}`, output: 'Outer 80, column -0.16\nNet floor area 79.84 m2' },
      { type: 'note', kind: 'warn', text: 'The formula assumes a **simple** polygon: no edge crosses another. For a self-intersecting “bow tie” the two loops have opposite signs and partly cancel, giving a number that is not an area at all. Drag a corner across the opposite edge in the widget to see it. Validate boundaries before you report areas from them.' },
      { type: 'h2', text: 'Sloping faces in 3D: Newell’s method' },
      { type: 'p', text: 'A roof face or a sloping soffit is a polygon in 3D. Sum the **3D cross products** P_i × P_(i+1) around the loop, and you get a vector that is the face’s normal, with a length of twice its area. This is **Newell’s method**. It is robust even when the corners are not perfectly flat, which in real survey data they never are.' },
      { type: 'code', title: 'SlopedFace.cs', code: cs`
var face = new V3[] { new(0, 0, 3), new(10, 0, 3), new(10, 4, 6), new(0, 4, 6) };

var sum = new V3(0, 0, 0);
for (int i = 0; i < face.Length; i++)
    sum += V3.Cross(face[i], face[(i + 1) % face.Length]);

Console.WriteLine($"Area {sum.Length / 2} m2");
Console.WriteLine($"Normal {sum.Normalized()}");

readonly record struct V3(double X, double Y, double Z)
{
    public static V3 operator +(V3 a, V3 b) => new(a.X + b.X, a.Y + b.Y, a.Z + b.Z);
    public static V3 operator -(V3 a, V3 b) => new(a.X - b.X, a.Y - b.Y, a.Z - b.Z);
    public static V3 operator *(V3 v, double k) => new(v.X * k, v.Y * k, v.Z * k);
    public static double Dot(V3 a, V3 b) => a.X * b.X + a.Y * b.Y + a.Z * b.Z;
    public static V3 Cross(V3 a, V3 b) =>
        new(a.Y * b.Z - a.Z * b.Y, a.Z * b.X - a.X * b.Z, a.X * b.Y - a.Y * b.X);
    public double Length => Math.Sqrt(Dot(this, this));
    public V3 Normalized() => this * (1 / Length);
    public override string ToString() => $"({X:0.###}, {Y:0.###}, {Z:0.###})";
}`, output: 'Area 50 m2\nNormal (0, -0.6, 0.8)' },
      { type: 'p', text: 'The face is 10 m along the eaves and 5 m up the slope (4 across and 3 up), so 50 m² is right, and the normal is the roof normal from the first lesson. Its plan area, the area of its shadow on the floor, is the area times n.z: 40 m².' },
      { type: 'quiz', question: 'The shoelace sum for a room comes out at −24. What do you know?', options: [
        'The area is 24 and the corners run clockwise',
        'The polygon is invalid',
        'The area is −24 square metres',
        'The room has a hole'
      ], answer: 0, explain: 'The size of the result is the area; the sign is the winding. Negative means clockwise, which is fine for a room, or expected for a hole in some formats.' },
      { type: 'quiz', question: 'What does Newell’s method give for a 3D polygon?', options: [
        'A normal vector whose length is twice the area',
        'The perimeter',
        'The centroid',
        'Only whether it is flat'
      ], answer: 0, explain: 'Σ P_i × P_(i+1) points along the face’s normal (following the winding), and its length is twice the area: normalise it for the normal, halve its length for the area.' },
      { type: 'exercise', task: 'Write `EnsureCounterClockwise(pts)` that returns the polygon unchanged if its signed area is positive, and a reversed copy otherwise. Test it on the slab (0, 0), (0, 5), (6, 5), (6, 0): print the signed area before and after, and the first two corners after.', hint: 'Copy the array with `Clone` and reverse it with `Array.Reverse`, so the caller’s array is not changed behind its back.', solution: cs`
var slab = new V2[] { new(0, 0), new(0, 5), new(6, 5), new(6, 0) };
Console.WriteLine($"Before: {SignedArea(slab)}");
slab = EnsureCounterClockwise(slab);
Console.WriteLine($"After:  {SignedArea(slab)}, starting {slab[0]}, {slab[1]}");

static V2[] EnsureCounterClockwise(V2[] p)
{
    if (SignedArea(p) >= 0) return p;
    var copy = (V2[])p.Clone();
    Array.Reverse(copy);
    return copy;
}

static double SignedArea(V2[] p)
{
    double s = 0;
    for (int i = 0; i < p.Length; i++) s += V2.Cross(p[i], p[(i + 1) % p.Length]);
    return s / 2;
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
}`, output: 'Before: -30\nAfter:  30, starting (6, 0), (6, 5)' }
    ],
    keyPoints: [
      'Shoelace: area = ½ Σ (x_i·y_(i+1) − x_(i+1)·y_i), wrapping round to the first corner.',
      'Positive means counterclockwise, negative clockwise; |sum ÷ 2| is the area.',
      'Holes wound the opposite way subtract themselves when you add signed areas.',
      'The same loop gives the centroid; the formula is meaningless for self-intersecting boundaries.',
      'In 3D, Σ P_i × P_(i+1) (Newell’s method) gives the normal, with length twice the area.'
    ]
  },

  // ------------------------------------------------------------------ 5
  {
    slug: 'point-in-polygon-triangulation',
    title: 'Point in polygon and triangulation',
    summary: 'Decide whether a point is inside a room by counting crossings along a ray, handle the awkward cases, and cut any simple polygon into triangles with ear clipping.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'Which room is this sprinkler in? Is the column inside the slab boundary? Which zone does this click select? All of these are **point in polygon** tests. And before a floor can be rendered, analysed or meshed, it has to be cut into **triangles**. Both work on any simple polygon, concave rooms included.' },
      { type: 'widget', name: 'pip-triangulate' },
      { type: 'h2', text: 'Ray casting: count the crossings' },
      { type: 'p', text: 'Send a ray from the point in any fixed direction (to the right is easiest) and count how many edges it crosses. Each crossing switches between outside and inside, and far away you are outside, so **an odd count means inside** and an even count means outside. This is also called the **even–odd rule**.' },
      { type: 'p', text: 'The tricky case is a ray that passes exactly through a corner, which could count as two edges or none. The standard fix is the **half-open rule**: an edge counts only if one end is strictly above the ray and the other is not. A corner then counts once if the boundary passes through it, and zero or two times if the boundary just touches the ray and turns back.' },
      { type: 'code', title: 'PointInRoom.cs', code: cs`
var room = new V2[] { new(0, 0), new(8, 0), new(8, 3), new(3, 3), new(3, 6), new(0, 6) };

foreach (var p in new V2[] { new(2, 5), new(5, 5), new(5, 1), new(1, 3) })
    Console.WriteLine($"{p}: {(Inside(room, p) ? "inside" : "outside")}");

static bool Inside(V2[] poly, V2 p)
{
    bool inside = false;
    for (int i = 0, j = poly.Length - 1; i < poly.Length; j = i++)
    {
        V2 a = poly[i], b = poly[j];
        if ((a.Y > p.Y) != (b.Y > p.Y) &&                          // the edge spans the ray's height
            p.X < a.X + (p.Y - a.Y) * (b.X - a.X) / (b.Y - a.Y))   // and crosses it to the right of p
            inside = !inside;
    }
    return inside;
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
}`, output: '(2, 5): inside\n(5, 5): outside\n(5, 1): inside\n(1, 3): inside' },
      { type: 'p', text: 'The last point is level with the room’s inner corner (3, 3), and its ray runs along the edge from (8, 3) to (3, 3). The half-open rule ignores that horizontal edge and counts the corner once, so the answer is still right.' },
      { type: 'note', kind: 'warn', text: 'Ray casting gives an arbitrary answer for points **exactly on** the boundary. In BIM that matters: a sprinkler on a room’s edge, or a wall end on another wall. Test the boundary first, with the distance-to-segment function from the last module and a tolerance, and only then cast the ray.' },
      { type: 'h2', text: 'Ear clipping' },
      { type: 'p', text: 'Any simple polygon with n corners can be cut into **n − 2 triangles**. The easiest way to do it is **ear clipping**. An **ear** is a corner where the boundary turns the “inside” way (left, for a counterclockwise polygon) and whose triangle with its two neighbours contains no other corner. Cut the ear off and the polygon has one corner fewer. Repeat until a single triangle is left. Every simple polygon with more than three corners has at least two ears, so this always finishes.' },
      { type: 'code', title: 'EarClipping.cs', code: cs`
var room = new V2[] { new(0, 0), new(8, 0), new(8, 3), new(3, 3), new(3, 6), new(0, 6) };

var tris = EarClip(room);
double total = 0;
foreach (var (i, j, k) in tris)
{
    double area = V2.Cross(room[j] - room[i], room[k] - room[i]) / 2;
    total += area;
    Console.WriteLine($"Triangle {i}-{j}-{k}: area {area}");
}
Console.WriteLine($"{tris.Count} triangles, total area {total}");

static List<(int, int, int)> EarClip(V2[] p)       // p must be counterclockwise
{
    var idx = Enumerable.Range(0, p.Length).ToList();
    var result = new List<(int, int, int)>();
    while (idx.Count > 3)
    {
        bool clipped = false;
        for (int k = 0; k < idx.Count && !clipped; k++)
        {
            int a = idx[(k + idx.Count - 1) % idx.Count], b = idx[k], c = idx[(k + 1) % idx.Count];
            if (V2.Cross(p[b] - p[a], p[c] - p[b]) <= 0) continue;     // reflex corner: not an ear
            if (idx.Any(m => m != a && m != b && m != c && InTriangle(p[m], p[a], p[b], p[c])))
                continue;                                              // another corner is in the way
            result.Add((a, b, c));
            idx.RemoveAt(k);
            clipped = true;
        }
        if (!clipped) throw new InvalidOperationException("No ear found: does the boundary cross itself?");
    }
    result.Add((idx[0], idx[1], idx[2]));
    return result;
}

static bool InTriangle(V2 q, V2 a, V2 b, V2 c) =>
    V2.Cross(b - a, q - a) >= 0 && V2.Cross(c - b, q - b) >= 0 && V2.Cross(a - c, q - c) >= 0;

readonly record struct V2(double X, double Y)
{
    public static V2 operator +(V2 a, V2 b) => new(a.X + b.X, a.Y + b.Y);
    public static V2 operator -(V2 a, V2 b) => new(a.X - b.X, a.Y - b.Y);
    public static V2 operator *(V2 v, double k) => new(v.X * k, v.Y * k);
    public static double Dot(V2 a, V2 b) => a.X * b.X + a.Y * b.Y;
    public static double Cross(V2 a, V2 b) => a.X * b.Y - a.Y * b.X;
    public double Length => Math.Sqrt(X * X + Y * Y);
    public override string ToString() => $"({X:0.###}, {Y:0.###})";
}`, output: 'Triangle 0-1-2: area 12\nTriangle 0-2-3: area 7.5\nTriangle 5-0-3: area 9\nTriangle 3-4-5: area 4.5\n4 triangles, total area 33' },
      { type: 'p', text: 'The ears are corners 1, 2 and 0 in turn (the middle number of each triangle), which leaves the triangle 3-4-5. Corner 3, the room’s inside corner, is reflex, so it is never an ear itself. The four triangles add up to the 33 m² from the shoelace formula: a good self-check for any triangulation.' },
      { type: 'note', kind: 'tip', text: 'This simple version takes about n³ steps, which is fine for rooms and slabs with tens of corners. For thousands of corners, or polygons with holes, use a library: Earcut ports and LibTessDotNet exist for .NET. For well-shaped triangles (no long slivers) for analysis meshes, look up **constrained Delaunay** triangulation.' },
      { type: 'quiz', question: 'A ray from P crosses the room’s boundary 4 times. Where is P?', options: ['Outside', 'Inside', 'On the boundary', 'It depends on the ray’s direction'], answer: 0, explain: 'An even number of crossings means P is outside: every time the ray enters the room, it leaves again.' },
      { type: 'quiz', question: 'How many triangles does ear clipping make from a simple polygon with 9 corners?', options: ['7', '9', '8', '3'], answer: 0, explain: 'Always n − 2. Each ear removes one corner, and the last three corners make the final triangle.' },
      { type: 'exercise', task: 'For a **convex** polygon, every corner is an ear, so you can simply fan out from the first corner: triangles (0, 1, 2), (0, 2, 3) and so on. Build a regular hexagon of radius 2 (corners at 2(cos 60i°, sin 60i°)), fan-triangulate it, and compare the total area with the formula (3√3 ÷ 2) × r².', hint: 'Loop i from 1 to n − 2 and add V2.Cross(P_i − P_0, P_(i+1) − P_0) ÷ 2.', solution: cs`
var hex = new V2[6];
for (int i = 0; i < 6; i++)
    hex[i] = new V2(2 * Math.Cos(i * Math.PI / 3), 2 * Math.Sin(i * Math.PI / 3));

double total = 0;
for (int i = 1; i < hex.Length - 1; i++)
    total += V2.Cross(hex[i] - hex[0], hex[i + 1] - hex[0]) / 2;   // triangle (0, i, i + 1)

Console.WriteLine($"{hex.Length - 2} triangles, area {total:F3}");
Console.WriteLine($"Formula: {3 * Math.Sqrt(3) / 2 * 4:F3}");

readonly record struct V2(double X, double Y)
{
    public static V2 operator +(V2 a, V2 b) => new(a.X + b.X, a.Y + b.Y);
    public static V2 operator -(V2 a, V2 b) => new(a.X - b.X, a.Y - b.Y);
    public static V2 operator *(V2 v, double k) => new(v.X * k, v.Y * k);
    public static double Dot(V2 a, V2 b) => a.X * b.X + a.Y * b.Y;
    public static double Cross(V2 a, V2 b) => a.X * b.Y - a.Y * b.X;
    public double Length => Math.Sqrt(X * X + Y * Y);
    public override string ToString() => $"({X:0.###}, {Y:0.###})";
}`, output: '4 triangles, area 10.392\nFormula: 10.392' }
    ],
    keyPoints: [
      'Cast a ray and count edge crossings: odd means inside, even means outside.',
      'The half-open rule (one end strictly above, the other not) makes corners count correctly.',
      'Check “on the boundary” separately, with a distance tolerance, before casting the ray.',
      'Ear clipping cuts any simple polygon into n − 2 triangles by repeatedly removing a convex, empty corner.',
      'Convex polygons can simply be fanned from one corner; large or holed polygons deserve a library.'
    ]
  },

  // ------------------------------------------------------------------ 6
  {
    slug: 'polygon-offsets-booleans',
    title: 'Polygon offsets and boolean operations',
    summary: 'Offset a closed boundary in or out, clip one polygon against another, and combine them with union, intersection and difference to get net areas, slab edges and overlaps.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'A slab edge is the outer wall line offset outwards. A finish boundary is a room offset inwards by the skirting. A net floor area is the room **minus** columns and shafts. A fire compartment check is an **intersection**. These operations on whole polygons are the bread and butter of quantity takeoff and model checking.' },
      { type: 'widget', name: 'poly-boolean' },
      { type: 'h2', text: 'Offsetting a closed polygon' },
      { type: 'p', text: 'This is the polyline offset from the last module, with two changes. Every corner now has two neighbours, so the indices wrap round. And “outwards” depends on the winding: for a **counterclockwise** polygon, the right-hand normal of each edge points out. The miter formula V + (n1 + n2)·δ ÷ (1 + n1·n2) is unchanged.' },
      { type: 'code', title: 'SlabEdge.cs', code: cs`
var room = new V2[] { new(0, 0), new(8, 0), new(8, 3), new(3, 3), new(3, 6), new(0, 6) };
var slabEdge = OffsetOutwards(room, 0.5);

Console.WriteLine(string.Join(" ", slabEdge));
Console.WriteLine($"Area {Area(room)} m2 -> {Area(slabEdge)} m2");

static V2[] OffsetOutwards(V2[] p, double delta)    // p counterclockwise
{
    int n = p.Length;
    var normals = new V2[n];                          // outward normal of edge i
    for (int i = 0; i < n; i++)
    {
        V2 d = p[(i + 1) % n] - p[i];
        normals[i] = new V2(d.Y, -d.X) * (1 / d.Length);   // right of a counterclockwise edge is outside
    }
    var result = new V2[n];
    for (int i = 0; i < n; i++)
    {
        V2 n1 = normals[(i + n - 1) % n], n2 = normals[i];
        result[i] = p[i] + (n1 + n2) * (delta / (1 + V2.Dot(n1, n2)));
    }
    return result;
}

static double Area(V2[] p)
{
    double s = 0;
    for (int i = 0; i < p.Length; i++) s += V2.Cross(p[i], p[(i + 1) % p.Length]);
    return s / 2;
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
}`, output: '(-0.5, -0.5) (8.5, -0.5) (8.5, 3.5) (3.5, 3.5) (3.5, 6.5) (-0.5, 6.5)\nArea 33 m2 -> 48 m2' },
      { type: 'p', text: 'The area grew from 33 to 48 m². Most of that is the perimeter times the offset (28 × 0.5 = 14 m²). The rest comes from the corners: each convex corner adds a δ × δ square and each reflex corner takes one away, so 5 − 1 = 4 corners × 0.25 = 1 m². The widget’s table shows the same split for any shape.' },
      { type: 'note', kind: 'warn', text: 'An inward offset can make a narrow part of a polygon vanish, or turn inside out. Offset an L-shaped room inwards by more than half the width of its thinner wing and that wing has to disappear. Simple miter code does not notice; libraries such as **Clipper2** detect it and return the correct, possibly split, result.' },
      { type: 'h2', text: 'Clipping: Sutherland–Hodgman' },
      { type: 'p', text: 'To find the part of a shape inside a **convex** polygon, clip it against each edge of the convex polygon in turn. For each edge, walk round the shape: keep the corners on the inside, and wherever an edge of the shape crosses the clipping line, add the crossing point (a line intersection, from the last module). After the last edge, what is left is the **intersection**. That is all you need for union and difference areas too:' },
      { type: 'ul', items: [
        '**Area of A ∩ B**: clip A by B (B must be convex for this algorithm).',
        '**Area of A − B** = area of A − area of (A ∩ B).',
        '**Area of A ∪ B** = area of A + area of B − area of (A ∩ B).'
      ] },
      { type: 'code', title: 'NetArea.cs', code: cs`
var room = Rect(0, 0, 10, 8);
var deductions = new (string Name, V2[] Shape)[]
{
    ("Column C1", Rect(4.8, 3.8, 5.2, 4.2)),     // free-standing
    ("Column C2", Rect(-0.2, -0.2, 0.2, 0.2)),   // in the corner: only a quarter is in the room
    ("Shaft S1", Rect(7, 5, 9, 7)),
};

double net = Area(room);
Console.WriteLine($"Gross {net} m2");
foreach (var (name, shape) in deductions)
{
    double inside = Area(Clip(shape, room));
    net -= inside;
    Console.WriteLine($"{name}: -{inside:0.###} m2");
}
Console.WriteLine($"Net {net:0.###} m2");

static V2[] Rect(double x0, double y0, double x1, double y1) =>
    new V2[] { new(x0, y0), new(x1, y0), new(x1, y1), new(x0, y1) };

static V2[] Clip(V2[] subject, V2[] clipper)      // Sutherland-Hodgman; clipper convex and counterclockwise
{
    var output = new List<V2>(subject);
    for (int i = 0; i < clipper.Length && output.Count > 0; i++)
    {
        V2 a = clipper[i], e = clipper[(i + 1) % clipper.Length] - a;
        var input = output;
        output = new List<V2>();
        for (int j = 0; j < input.Count; j++)
        {
            V2 p = input[j], q = input[(j + 1) % input.Count];
            double sp = V2.Cross(e, p - a), sq = V2.Cross(e, q - a);   // >= 0: inside
            if (sp >= 0) output.Add(p);
            if ((sp >= 0) != (sq >= 0)) output.Add(p + (q - p) * (sp / (sp - sq)));
        }
    }
    return output.ToArray();
}

static double Area(V2[] p)
{
    if (p.Length < 3) return 0;
    double s = 0;
    for (int i = 0; i < p.Length; i++) s += V2.Cross(p[i], p[(i + 1) % p.Length]);
    return s / 2;
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
}`, output: 'Gross 80 m2\nColumn C1: -0.16 m2\nColumn C2: -0.04 m2\nShaft S1: -4 m2\nNet 75.8 m2' },
      { type: 'p', text: 'Clipping each deduction against the room means only the part inside the room is deducted. Without it, column C2 would remove 0.16 m² instead of 0.04 m², a small error that adds up over a few hundred columns on a large floor plate.' },
      { type: 'h2', text: 'General booleans: use a library' },
      { type: 'p', text: 'Sutherland–Hodgman needs a convex clipper, and it only gives one result polygon. General booleans of concave polygons, with holes and with results that split into several pieces, need algorithms such as **Weiler–Atherton**, **Greiner–Hormann** or **Vatti**. They are notoriously hard to get right with floating point. In practice, use a tested library: **Clipper2** (C#, C++ and Delphi) is the usual choice for 2D and also does robust offsetting. It works with integer coordinates internally, so scale model units to millimetres or set its precision.' },
      { type: 'quiz', question: 'Room A has 50 m², shape B has 12 m², and they overlap by 5 m². What is the area of A ∪ B?', options: ['57 m²', '62 m²', '45 m²', '67 m²'], answer: 0, explain: 'A + B − overlap = 50 + 12 − 5 = 57 m². Without subtracting the overlap it would be counted twice.' },
      { type: 'quiz', question: 'Why must the clipping polygon be convex in Sutherland–Hodgman?', options: [
        'It keeps the inside of each edge’s line in turn, and only for a convex polygon is the inside the same as being on the inner side of every edge line',
        'Because concave polygons have no area',
        'Because the subject must be convex too',
        'It does not: any polygon works'
      ], answer: 0, explain: 'The algorithm intersects half-planes, one per clipping edge. The intersection of those half-planes is exactly a convex polygon; for a concave clipper it would cut away parts that are actually inside.' },
      { type: 'exercise', task: 'Rectangle A runs from (0, 0) to (6, 4) and rectangle B from (4, 2) to (9, 7). Using `Clip`, `Area` and `Rect` from NetArea.cs, print the area of their overlap, their union and A − B.', hint: 'Clip A by B for the overlap. Then union = A + B − overlap and A − B = A − overlap.', solution: cs`
var a = Rect(0, 0, 6, 4);
var b = Rect(4, 2, 9, 7);

double overlap = Area(Clip(a, b));
Console.WriteLine($"Overlap: {overlap} m2");
Console.WriteLine($"Union: {Area(a) + Area(b) - overlap} m2");
Console.WriteLine($"A - B: {Area(a) - overlap} m2");

static V2[] Rect(double x0, double y0, double x1, double y1) =>
    new V2[] { new(x0, y0), new(x1, y0), new(x1, y1), new(x0, y1) };

static V2[] Clip(V2[] subject, V2[] clipper)
{
    var output = new List<V2>(subject);
    for (int i = 0; i < clipper.Length && output.Count > 0; i++)
    {
        V2 a = clipper[i], e = clipper[(i + 1) % clipper.Length] - a;
        var input = output;
        output = new List<V2>();
        for (int j = 0; j < input.Count; j++)
        {
            V2 p = input[j], q = input[(j + 1) % input.Count];
            double sp = V2.Cross(e, p - a), sq = V2.Cross(e, q - a);
            if (sp >= 0) output.Add(p);
            if ((sp >= 0) != (sq >= 0)) output.Add(p + (q - p) * (sp / (sp - sq)));
        }
    }
    return output.ToArray();
}

static double Area(V2[] p)
{
    if (p.Length < 3) return 0;
    double s = 0;
    for (int i = 0; i < p.Length; i++) s += V2.Cross(p[i], p[(i + 1) % p.Length]);
    return s / 2;
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
}`, output: 'Overlap: 4 m2\nUnion: 45 m2\nA - B: 20 m2' },
      { type: 'note', kind: 'tip', text: 'Next up is the Matrices and transforms module: moving, rotating and scaling everything you have built so far, and placing family instances in the world.' }
    ],
    keyPoints: [
      'Offset a closed polygon with wrap-around miters; for counterclockwise winding the right normal points out.',
      'An offset changes the area by about perimeter × δ, plus a δ² term from each corner.',
      'Sutherland–Hodgman clips any polygon by a convex one, one edge line at a time.',
      'A − B = A − (A ∩ B) and A ∪ B = A + B − (A ∩ B), as areas.',
      'For general booleans and robust offsets of concave shapes, use a library such as Clipper2.'
    ]
  }
];
