import { Lesson } from '../learn.types';
import { cs } from '../csharp/cs';

export const MASTER_GEOMETRY: Lesson[] = [
  // ------------------------------------------------------------------ 1
  {
    slug: 'robust-geometry',
    title: 'Robust geometry: epsilons, snapping and exact predicates',
    summary: 'Why geometry code that is right on paper fails on real models: rounding, tolerances that are not transitive, exact orientation tests, and welding and snapping vertices.',
    minutes: 16,
    blocks: [
      { type: 'p', text: 'Every algorithm in this course is correct with real numbers. A computer does not have real numbers: it has doubles, a finite set of values with gaps between them, and every operation rounds its answer to one of them. Most of the time the rounding is far too small to matter. Geometry code is special because it makes **yes/no decisions** from those rounded numbers: is this point left or right of that wall, do these two segments cross, is this vertex the same as that one? A tiny error can flip the answer, and one flipped answer can break the topology of a whole model: a room that does not close, a boolean that leaves a sliver, a section with a gap.' },
      { type: 'h2', text: 'Doubles have gaps' },
      { type: 'code', title: 'FloatBasics.cs', code: cs`
double a = 0.1 + 0.2;
Console.WriteLine($"0.1 + 0.2 == 0.3: {a == 0.3}, off by {a - 0.3:0.0E0}");

double x = 0;
foreach (double step in new[] { 0.1, 0.2, 0.3 }) x += step;
x -= 0.6;
Console.WriteLine($"0.1 + 0.2 + 0.3 - 0.6 = {x:0.0E0}, back at zero: {x == 0}");

Console.WriteLine("gap to the next number up:");
foreach (double v in new[] { 1.0, 1_000, 512_340, 6_000_000 })
{
    double gd = Math.BitIncrement(v) - v;
    float f = (float)v;
    double gf = MathF.BitIncrement(f) - f;
    Console.WriteLine($"  {v,9:0}: double {gd:0.0E0} m, float {gf:0.0E0} m");
}`, output: '0.1 + 0.2 == 0.3: False, off by 5.6E-17\n0.1 + 0.2 + 0.3 - 0.6 = 1.1E-16, back at zero: False\ngap to the next number up:\n          1: double 2.2E-16 m, float 1.2E-7 m\n       1000: double 1.1E-13 m, float 6.1E-5 m\n     512340: double 5.8E-11 m, float 3.1E-2 m\n    6000000: double 9.3E-10 m, float 5.0E-1 m' },
      { type: 'p', text: 'The gap grows with the size of the number. A double near 1 m can tell apart points 2 × 10⁻¹⁶ m apart, but at survey coordinates of half a million metres the gap is about 6 × 10⁻¹¹ m, and a float there cannot even resolve 3 cm. That is why the georeferencing lesson keeps models near a local origin and only adds the large survey offset at the very end.' },
      { type: 'h2', text: 'Tolerances help, but “near” is not equality' },
      { type: 'p', text: 'The usual first fix is a tolerance: treat two values as equal if they differ by less than ε. BIM programs do this everywhere (Revit’s short-curve tolerance is about 0.8 mm, many kernels use 10⁻⁶ m for points). It works, but it breaks a property equality always had: **transitivity**. If a is near b and b is near c, a need not be near c.' },
      { type: 'code', title: 'Tolerance.cs', code: cs`
Console.WriteLine($"Near(0, 0.0008) = {Near(0, 0.0008)}");
Console.WriteLine($"Near(0.0008, 0.0016) = {Near(0.0008, 0.0016)}");
Console.WriteLine($"Near(0, 0.0016) = {Near(0, 0.0016)}");

// Merging points one by one: the answer depends on the order they arrive in
Console.WriteLine($"merge 0, 0.0008, 0.0016: {Merge(0, 0.0008, 0.0016)} kept");
Console.WriteLine($"merge 0.0008, 0, 0.0016: {Merge(0.0008, 0, 0.0016)} kept");

static bool Near(double a, double b) => Math.Abs(a - b) <= 0.001;    // 1 mm

static int Merge(params double[] xs)
{
    var kept = new List<double>();
    foreach (var x in xs)
        if (!kept.Any(k => Near(k, x))) kept.Add(x);
    return kept.Count;
}`, output: 'Near(0, 0.0008) = True\nNear(0.0008, 0.0016) = True\nNear(0, 0.0016) = False\nmerge 0, 0.0008, 0.0016: 2 kept\nmerge 0.0008, 0, 0.0016: 1 kept' },
      { type: 'p', text: 'Three points, 0.8 mm apart, merge to two or to one depending only on the order they arrive in. Real models have this problem with vertices from imported files, with walls whose ends almost meet, and with rooms whose boundaries almost close. A tolerance turns “wrong” into “depends”, and code downstream must be written to survive that.' },
      { type: 'h2', text: 'The orientation test, done properly' },
      { type: 'p', text: 'Most 2D geometry decisions come down to one **predicate**: is point p left of, right of, or on the line from q to r? It is the sign of a 2 × 2 determinant, the cross product from the vectors module: **orient(p, q, r) = (q − p) × (r − p)**. Point-in-polygon, convex hulls, segment intersection, triangulation and boolean operations are all built from it. The widget computes it for a grid of points packed 2⁻⁵³ apart (about 10⁻¹⁶ m) right next to a line, and colours each point by the sign it gets.' },
      { type: 'widget', name: 'robust' },
      { type: 'p', text: 'With plain doubles the picture is not a clean diagonal but bands of noise: hundreds of points land on the wrong side, and more are called exactly collinear when they are not. A tolerance does not rescue it. The errors near the line are as big as the true values, so any ε either leaves the wrong answers in or turns everything into “maybe”. The real fix is an **exact predicate**: compute the sign without any rounding.' },
      { type: 'code', title: 'Orient.cs', code: cs`
using System.Numerics;

const double H = 1.0 / (1L << 53);       // 2^-53, the gap between doubles near 0.5
double qx = 17.3, qy = 0.5 + 0.7 * 16.8 + 20 * H, rx = 30.1, ry = 0.5 + 0.7 * 29.6 + 20 * H;

int wrong = 0, zero = 0, fallbacks = 0, adaptiveWrong = 0;
for (int j = 0; j < 40; j++)
    for (int i = 0; i < 40; i++)
    {
        double px = 0.5 + i * H, py = 0.5 + j * H;
        int truth = OrientExact(px, py, qx, qy, rx, ry);
        int plain = Math.Sign(OrientPlain(px, py, qx, qy, rx, ry));
        if (plain == 0 && truth != 0) zero++;
        else if (plain != truth) wrong++;
        if (OrientAdaptive(px, py, qx, qy, rx, ry, ref fallbacks) != truth) adaptiveWrong++;
    }
Console.WriteLine($"plain doubles: {wrong} on the wrong side, {zero} wrongly on the line, of 1600");
Console.WriteLine($"adaptive: {adaptiveWrong} wrong, exact arithmetic needed {fallbacks} times");

int f2 = 0;
Console.WriteLine($"(3, 9) against the same line: {OrientAdaptive(3, 9, qx, qy, rx, ry, ref f2)}, exact needed {f2} times");

static double OrientPlain(double px, double py, double qx, double qy, double rx, double ry) =>
    (qx - px) * (ry - py) - (qy - py) * (rx - px);

// Fast double test first; only when the result is smaller than its possible error, do it exactly.
static int OrientAdaptive(double px, double py, double qx, double qy, double rx, double ry, ref int fallbacks)
{
    double l = (qx - px) * (ry - py), r = (qy - py) * (rx - px), det = l - r;
    double bound = 3.3306690738754716e-16 * (Math.Abs(l) + Math.Abs(r));   // Shewchuk's error bound
    if (Math.Abs(det) > bound) return Math.Sign(det);
    fallbacks++;
    return OrientExact(px, py, qx, qy, rx, ry);
}

// A double is a whole number times a power of two, so scaling turns these into exact integers.
static int OrientExact(double px, double py, double qx, double qy, double rx, double ry)
{
    static BigInteger X(double v) => new BigInteger(v * Math.Pow(2, 60));
    var d = (X(qx) - X(px)) * (X(ry) - X(py)) - (X(qy) - X(py)) * (X(rx) - X(px));
    return d.Sign;
}`, output: 'plain doubles: 277 on the wrong side, 686 wrongly on the line, of 1600\nadaptive: 0 wrong, exact arithmetic needed 1600 times\n(3, 9) against the same line: 1, exact needed 0 times' },
      { type: 'p', text: 'The adaptive version is the idea behind Jonathan Shewchuk’s robust predicates, used by CGAL, Triangle, TetGen and most serious geometry kernels. Floating-point error has a provable upper bound, so if the double result is bigger than that bound its **sign** is certainly right, whatever the rounding. Only results too small to trust go to exact arithmetic. The grid here is deliberately nasty, so all 1600 points need the exact path and all 1600 come out right. For ordinary inputs like (3, 9) the fast path decides at once, so on a real model the robust test costs almost nothing extra.' },
      { type: 'note', kind: 'info', text: 'The BigInteger trick above relies on all coordinates being multiples of 2⁻⁶⁰. A general implementation uses floating-point expansions (sums of doubles that represent a number exactly) or a library such as CGAL’s exact kernels. In C#, the free Clipper2 library makes its polygon booleans robust a different way: it rounds coordinates to 64-bit integers first, then does all its tests in exact integer arithmetic.' },
      { type: 'h2', text: 'Welding and snapping' },
      { type: 'p', text: 'Exact predicates make each decision consistent. The other half of robustness is making the **input** consistent, so that points meant to be the same really are the same value. Two common techniques:' },
      { type: 'ul', items: [
        '**Snapping** rounds every coordinate to a grid (1 mm, or 2⁻²⁰ m). Afterwards equality is exact equality, and integer coordinates make exact arithmetic easy. The risk: snapping can create new problems, such as duplicate vertices, zero-length edges and three points that become collinear.',
        '**Welding** merges vertices closer than a tolerance into one shared vertex, so triangles that should share an edge actually reference the same indices. A plain “round to the grid and compare” misses pairs that straddle a grid line; a hash grid that also checks the neighbouring cells does not.'
      ] },
      { type: 'code', title: 'Weld.cs', code: cs`
// Two triangles from different sources that should share the edge (0,0)-(4,3)
var soup = new V3[]
{
    new(0, 0, 0), new(4, 0, 0), new(4, 3, 0),
    new(0.0004, 0.0002, 0), new(4.0006, 3.0001, 0), new(0, 3, 0),
};
Console.WriteLine($"rounding to the nearest mm: {WeldByRounding(soup, 0.001)} vertices");
var (verts, map) = Weld(soup, 0.001);
Console.WriteLine($"welding within 1 mm: {verts.Count} vertices");
Console.WriteLine($"triangles: ({map[0]}, {map[1]}, {map[2]}) and ({map[3]}, {map[4]}, {map[5]})");

static int WeldByRounding(V3[] pts, double tol) =>
    pts.Select(p => (Math.Round(p.X / tol), Math.Round(p.Y / tol), Math.Round(p.Z / tol))).Distinct().Count();

// Hash grid with cells one tolerance wide: a match can only be in the same cell or a neighbour.
static (List<V3> Verts, int[] Map) Weld(V3[] pts, double tol)
{
    var verts = new List<V3>();
    var grid = new Dictionary<(long, long, long), List<int>>();
    var map = new int[pts.Length];
    for (int k = 0; k < pts.Length; k++)
    {
        var p = pts[k];
        long cx = (long)Math.Floor(p.X / tol), cy = (long)Math.Floor(p.Y / tol), cz = (long)Math.Floor(p.Z / tol);
        int found = -1;
        for (long dx = -1; dx <= 1; dx++)
            for (long dy = -1; dy <= 1; dy++)
                for (long dz = -1; dz <= 1; dz++)
                    if (found < 0 && grid.TryGetValue((cx + dx, cy + dy, cz + dz), out var list))
                        foreach (int i in list)
                            if ((verts[i] - p).Length <= tol) { found = i; break; }
        if (found < 0)
        {
            found = verts.Count;
            verts.Add(p);
            if (!grid.TryGetValue((cx, cy, cz), out var cell)) grid[(cx, cy, cz)] = cell = new();
            cell.Add(found);
        }
        map[k] = found;
    }
    return (verts, map);
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
    static string F(double v) => Math.Abs(v) < 5e-4 ? "0" : v.ToString("0.###");
    public override string ToString() => $"({F(X)}, {F(Y)}, {F(Z)})";
}`, output: 'rounding to the nearest mm: 5 vertices\nwelding within 1 mm: 4 vertices\ntriangles: (0, 1, 2) and (0, 2, 3)' },
      { type: 'p', text: 'Rounding sends 4.0006 to 4.001 and 4 to 4.000, two different grid points only 0.6 mm apart, so the shared edge is lost. The hash-grid weld finds the match in the neighbouring cell, and the second triangle now uses vertices 0 and 2 of the first. After welding, the edge-pairing check from the meshes lesson passes.' },
      { type: 'h2', text: 'A practical policy' },
      { type: 'ol', items: [
        '**Work near the origin.** Subtract a project origin before doing geometry; keep large survey coordinates for input and output only.',
        '**Clean the input once.** Weld or snap vertices, remove zero-length edges and repeated points, and merge nearly collinear vertices when data comes in, not halfway through an algorithm.',
        '**Use exact or adaptive predicates for decisions.** Orientation, in-circle and segment-crossing tests should give consistent signs; quantities like lengths and areas can stay approximate.',
        '**Choose one tolerance and use it everywhere.** Two parts of a program with different ε values will disagree about whether two points are the same.',
        '**Keep topology separate from coordinates.** Decide which edges meet by index, not by comparing positions again later.'
      ] },
      { type: 'quiz', question: 'A point-in-polygon test sometimes says a point on a shared edge is inside both neighbouring rooms. What is the most robust fix?', options: ['Make the side-of-edge decisions with an exact or adaptive orientation predicate and a consistent rule for points exactly on an edge', 'Increase the tolerance until the problem goes away', 'Use float instead of double for speed', 'Test the point twice and keep the more common answer'], answer: 0, explain: 'Inconsistent decisions come from rounding errors in the orientation sign. Exact signs plus a fixed rule for boundary points (for example, count the left or bottom edge as inside) guarantee each point belongs to exactly one room.' },
      { type: 'quiz', question: 'Why is “a is within 1 mm of b” not a safe replacement for “a equals b”?', options: ['It is not transitive: a ≈ b and b ≈ c do not imply a ≈ c, so results depend on processing order', 'It is too slow to compute', 'It only works for integers', 'Doubles cannot represent 1 mm'], answer: 0, explain: 'Chains of nearly equal points can merge differently depending on which arrives first, as Tolerance.cs showed.' },
      { type: 'exercise', task: 'Snap this room outline to a 5 mm grid, then clean it: remove repeated points (including a last point equal to the first) and vertices that lie on a straight line between their neighbours. Print the vertex count and area before and after, and the cleaned outline. Points: (0, 0), (5.0012, 0.0011), (5.0018, 0.0009), (5, 2.5004), (4.9989, 4.0013), (0.0021, 3.9992).', hint: 'Snap with Math.Round(x / 0.005) · 0.005. A vertex b between a and c is collinear when the cross product (b − a) × (c − a) is (almost) zero. Keep removing until nothing changes.', solution: cs`
var poly = new V2[] { new(0, 0), new(5.0012, 0.0011), new(5.0018, 0.0009), new(5, 2.5004), new(4.9989, 4.0013), new(0.0021, 3.9992) };
const double Grid = 0.005;
var snapped = poly.Select(p => new V2(Math.Round(p.X / Grid) * Grid, Math.Round(p.Y / Grid) * Grid));

var clean = new List<V2>();
foreach (var p in snapped)
    if (clean.Count == 0 || (p - clean[^1]).Length > 1e-9) clean.Add(p);
if ((clean[0] - clean[^1]).Length <= 1e-9) clean.RemoveAt(clean.Count - 1);

for (bool changed = true; changed;)
{
    changed = false;
    for (int i = 0; i < clean.Count && !changed; i++)
    {
        V2 a = clean[(i + clean.Count - 1) % clean.Count], b = clean[i], c = clean[(i + 1) % clean.Count];
        double cross = (b.X - a.X) * (c.Y - a.Y) - (b.Y - a.Y) * (c.X - a.X);
        if (Math.Abs(cross) < 1e-9) { clean.RemoveAt(i); changed = true; }
    }
}

Console.WriteLine($"before: {poly.Length} vertices, area {Area(poly):0.000000} m2");
Console.WriteLine($"after:  {clean.Count} vertices, area {Area(clean):0.000000} m2");
Console.WriteLine(string.Join(" ", clean));

static double Area(IList<V2> p)
{
    double a = 0;
    for (int i = 0; i < p.Count; i++) { var q = p[(i + 1) % p.Count]; a += p[i].X * q.Y - q.X * p[i].Y; }
    return a / 2;
}

readonly record struct V2(double X, double Y)
{
    public static V2 operator +(V2 a, V2 b) => new(a.X + b.X, a.Y + b.Y);
    public static V2 operator -(V2 a, V2 b) => new(a.X - b.X, a.Y - b.Y);
    public static V2 operator *(V2 v, double k) => new(v.X * k, v.Y * k);
    public double Length => Math.Sqrt(X * X + Y * Y);
    static string F(double v) => Math.Abs(v) < 5e-4 ? "0" : v.ToString("0.###");
    public override string ToString() => $"({F(X)}, {F(Y)})";
}`, output: 'before: 6 vertices, area 19.995724 m2\nafter:  4 vertices, area 20.000000 m2\n(0, 0) (5, 0) (5, 4) (0, 4)' }
    ],
    keyPoints: [
      'Doubles have gaps that grow with the size of the number; geometry far from the origin loses precision.',
      'Geometric decisions (left or right, inside or outside, same point or not) can flip because of rounding, and one flipped decision breaks topology.',
      'Tolerances are not transitive, so results can depend on processing order; use one tolerance consistently.',
      'Exact and adaptive predicates give correct signs: a fast double test, with exact arithmetic only when the result is within its error bound.',
      'Clean input once by welding or snapping vertices, then decide topology by index, not by comparing coordinates again.'
    ]
  },
  // ------------------------------------------------------------------ 2
  {
    slug: 'georeferencing',
    title: 'Survey points, true north and georeferencing',
    summary: 'How a BIM model sits on the real site: project and shared coordinates, the angle to true north, why models stay near their own origin, bearings, and the grid scale factor.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'Architects draw buildings square to the screen: grid line A runs left to right and the main façade faces the bottom of the sheet. The site does not care. On the survey the same building may sit half a million metres east of the map’s origin, turned 18° from north, with its ground floor 42.5 m above sea level. **Georeferencing** is the transform between those two descriptions, and it is a plain rigid transform from the matrices module: a turn about the vertical axis plus a move.' },
      { type: 'h2', text: 'Two coordinate systems for one building' },
      { type: 'table', head: ['', 'Project (internal) coordinates', 'Shared (survey) coordinates'], rows: [
        ['Origin', 'A convenient point on the building, near the model', 'The map projection’s origin, often hundreds of kilometres away'],
        ['Axes', 'Along the building grid: “project north” is up on the plan', 'East (E) and North (N) of the survey grid'],
        ['Elevation', 'Usually 0 at a reference level such as ground floor', 'Height above a datum such as mean sea level'],
        ['Used for', 'Modelling, all geometry calculations', 'Coordination with other models, setting out on site, GIS']
      ] },
      { type: 'p', text: 'In Revit the two are linked by the **project base point** (a point in the model with known shared coordinates), the **survey point** (where the shared system is anchored), and the **angle to true north**. IFC stores the same information as an IfcMapConversion: eastings, northings, orthogonal height, the direction of the x axis, and a scale. Turn the angle in the widget and click the corners.' },
      { type: 'widget', name: 'georef' },
      { type: 'p', text: 'Write θ for the angle from true north to project north, clockwise. A project point (x, y, z) has shared coordinates' },
      { type: 'p', text: '**E = E₀ + x·cos θ + y·sin θ**, **N = N₀ − x·sin θ + y·cos θ**, **elevation = Z₀ + z**,' },
      { type: 'p', text: 'where (E₀, N₀, Z₀) are the shared coordinates of the project origin. The way back subtracts the offset and turns the other way. The building itself never changes; only the numbers describing it do.' },
      { type: 'code', title: 'Georef.cs', code: cs`
var site = new Georef(E0: 512_340, N0: 180_220, Z0: 42.5, AngleDeg: 18);

var corners = new (string Name, V3 P)[]
{
    ("A", new(0, 0, 0)), ("B", new(24, 0, 0)), ("C", new(24, 10, 0)), ("E roof", new(10, 18, 3.5))
};
foreach (var (name, p) in corners)
{
    var s = site.ToShared(p);
    Console.WriteLine($"{name,-6} project {p,-14} E {s.X:0.000}  N {s.Y:0.000}  elev {s.Z:0.000}");
}
Console.WriteLine($"C there and back: {site.ToProject(site.ToShared(new V3(24, 10, 0)))}");

readonly record struct Georef(double E0, double N0, double Z0, double AngleDeg)
{
    // Project north is AngleDeg clockwise from true (grid) north.
    public V3 ToShared(V3 p)
    {
        double t = AngleDeg * Math.PI / 180, c = Math.Cos(t), s = Math.Sin(t);
        return new(E0 + p.X * c + p.Y * s, N0 - p.X * s + p.Y * c, Z0 + p.Z);
    }

    public V3 ToProject(V3 g)
    {
        double t = AngleDeg * Math.PI / 180, c = Math.Cos(t), s = Math.Sin(t);
        double e = g.X - E0, n = g.Y - N0;
        return new(e * c - n * s, e * s + n * c, g.Z - Z0);
    }
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
    static string F(double v) => Math.Abs(v) < 5e-4 ? "0" : v.ToString("0.###");
    public override string ToString() => $"({F(X)}, {F(Y)}, {F(Z)})";
}`, output: 'A      project (0, 0, 0)      E 512340.000  N 180220.000  elev 42.500\nB      project (24, 0, 0)     E 512362.825  N 180212.584  elev 42.500\nC      project (24, 10, 0)    E 512365.916  N 180222.094  elev 42.500\nE roof project (10, 18, 3.5)  E 512355.073  N 180234.029  elev 46.000\nC there and back: (24, 10, 0)' },
      { type: 'note', kind: 'warn', text: 'Sign conventions differ between programs. Some measure the angle from project north to true north, some the other way round, and some store the direction of the x axis as a vector instead. Always test with a known point: take a corner whose survey coordinates you know, run it through your transform and compare, before trusting the angle.' },
      { type: 'h2', text: 'Why the model stays near its own origin' },
      { type: 'p', text: 'It is tempting to model directly in survey coordinates so that everything “just lines up”. The robust geometry lesson showed why not: the gaps between numbers grow with their size. Graphics cards and many file formats store vertices as 32-bit floats, and at half a million metres a float has a gap of 3 cm.' },
      { type: 'code', title: 'Precision.cs', code: cs`
var p = new V3(512_345.678, 180_223.456, 47.25);   // a point in shared coordinates
var q = new V3(512_345.679, 180_223.456, 47.25);   // 1 mm east of it

float px = (float)p.X, qx = (float)q.X;
Console.WriteLine($"stored as float: {px:0.000} and {qx:0.000}, gap {qx - px:0.000} m");

var origin = new V3(512_340, 180_220, 42.5);        // a local origin, kept in double
float lp = (float)(p.X - origin.X), lq = (float)(q.X - origin.X);
Console.WriteLine($"relative to the origin: {lp:0.000000} and {lq:0.000000}, gap {lq - lp:0.000000} m");
Console.WriteLine($"float spacing at 512345: {MathF.BitIncrement(px) - px} m, at 5.678: {MathF.BitIncrement(lp) - lp:0.0E0} m");

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
    static string F(double v) => Math.Abs(v) < 5e-4 ? "0" : v.ToString("0.###");
    public override string ToString() => $"({F(X)}, {F(Y)}, {F(Z)})";
}`, output: 'stored as float: 512345.700 and 512345.700, gap 0.000 m\nrelative to the origin: 5.678000 and 5.679000, gap 0.001000 m\nfloat spacing at 512345: 0.03125 m, at 5.678: 4.8E-7 m' },
      { type: 'p', text: 'Stored directly, the two points 1 mm apart become the same float, and every vertex of the model snaps to a 3 cm grid: curved walls look faceted and edges flicker. Subtract a local origin in double first and the float values are small, with a spacing of about half a micrometre. This is why Revit warns when geometry is more than about 20 miles from the internal origin, and why viewers such as game engines and web viewers rebase large coordinates around the camera.' },
      { type: 'h2', text: 'Bearings' },
      { type: 'p', text: 'Surveyors describe directions as **bearings**: the angle from north, measured clockwise, from 0° to 360°. That is not the mathematician’s angle (from east, anticlockwise), so atan2 takes its arguments in the other order: **bearing = atan2(ΔE, ΔN)**. Setting-out data is usually written in degrees, minutes and seconds.' },
      { type: 'code', title: 'Bearings.cs', code: cs`
double t = 18 * Math.PI / 180;              // project north is 18 deg east of north

var lines = new (string Name, double X, double Y)[]
{
    ("A to B, along project x", 24, 0), ("B to C, along project y", 0, 10), ("A to D, a diagonal", 10, 10)
};
foreach (var (name, x, y) in lines)
{
    double e = x * Math.Cos(t) + y * Math.Sin(t), n = -x * Math.Sin(t) + y * Math.Cos(t);
    double bearing = Math.Atan2(e, n) * 180 / Math.PI;     // from north, clockwise
    if (bearing < 0) bearing += 360;
    Console.WriteLine($"{name,-24} {Math.Sqrt(e * e + n * n),7:0.000} m at {bearing,8:0.0000} deg = {Dms(bearing)}");
}

static string Dms(double deg)
{
    long tenths = (long)Math.Round(deg * 36000);           // tenths of a second, rounded once
    return $"{tenths / 36000}d {tenths / 600 % 60:00}' {tenths % 600 / 10.0:00.0}\"";
}`, output: 'A to B, along project x   24.000 m at 108.0000 deg = 108d 00\' 00.0"\nB to C, along project y   10.000 m at  18.0000 deg = 18d 00\' 00.0"\nA to D, a diagonal        14.142 m at  63.0000 deg = 63d 00\' 00.0"' },
      { type: 'p', text: 'Round once, at the end, in the smallest unit you print. Splitting 107.99999999° into degrees, minutes and seconds separately can print 107° 59′ 60.0″.' },
      { type: 'h2', text: 'Grid distance is not ground distance' },
      { type: 'p', text: 'A map projection squeezes the curved Earth onto a flat grid, so distances on the grid differ slightly from distances measured on the ground. The surveyor gives a **combined scale factor** (CSF) for the site, combining the projection’s scale at that location and the height above the datum. It is usually within a few parts in ten thousand of 1, which sounds negligible until you multiply it by a long building or a railway.' },
      { type: 'code', title: 'ScaleFactor.cs', code: cs`
const double Csf = 0.99974;     // combined scale factor from the site survey

foreach (double ground in new[] { 24.0, 100, 2000 })
{
    double grid = ground * Csf;
    Console.WriteLine($"{ground,5:0} m on the ground = {grid,9:0.000} m on the grid, {(ground - grid) * 1000,4:0} mm shorter");
}
Console.WriteLine($"control points 1500 m apart on the grid are {1500 / Csf:0.000} m apart on site");`, output: '   24 m on the ground =    23.994 m on the grid,    6 mm shorter\n  100 m on the ground =    99.974 m on the grid,   26 mm shorter\n 2000 m on the ground =  1999.480 m on the grid,  520 mm shorter\ncontrol points 1500 m apart on the grid are 1500.390 m apart on site' },
      { type: 'p', text: 'BIM models are drawn at true ground size. IFC’s IfcMapConversion has a Scale attribute for exactly this, and a building model sent to a GIS or compared with survey grid coordinates must apply it, or a 2 km rail model will be off by about half a metre at its far end.' },
      { type: 'note', kind: 'info', text: 'Latitude and longitude are a different matter. Converting them to a projected grid such as UTM or a national grid needs the full projection formulas, which are best left to a library (PROJ, or ProjNET in .NET). BIM georeferencing starts once you have grid eastings and northings.' },
      { type: 'quiz', question: 'A model is placed with the angle to true north set to 25°, and every shared coordinate comes out mirrored about the north axis compared with the survey. What is the likely cause?', options: ['The angle was applied with the wrong sign: the program’s convention is the opposite of the one assumed', 'The scale factor is wrong', 'The model is too far from the origin', 'The elevation datum is wrong'], answer: 0, explain: 'Turning by −25° instead of +25° makes the building turn the wrong way. Check the convention with one known point before trusting a transform.' },
      { type: 'quiz', question: 'Why do viewers and BIM tools keep coordinates small, near a local origin, instead of storing survey coordinates directly?', options: ['Floats near 500 000 have gaps of about 3 cm, so vertices snap and flicker; small values keep sub-millimetre precision', 'Survey coordinates are secret', 'Large numbers take more memory', 'Rotations only work near the origin'], answer: 0, explain: 'Precision depends on the size of the number. Subtract the origin in double, then store or draw the small differences.' },
      { type: 'exercise', task: 'A surveyor gives you two control points in both systems: CP1 is project (5, 2) and shared (512345.373, 180220.357); CP2 is project (30, 14) and shared (512372.858, 180224.044). Work out the angle to true north θ and the shared coordinates (E₀, N₀) of the project origin, then check the result on CP3: project (12, 25) should be shared (512359.138, 180240.068). Print θ, E₀, N₀ and how far off CP3 comes out, in millimetres.', hint: 'The direction from CP1 to CP2 is atan2(Δy, Δx) in the project and atan2(ΔN, ΔE) on the survey; θ is the first minus the second. Then E₀ = E₁ − (x₁ cos θ + y₁ sin θ) and N₀ = N₁ − (−x₁ sin θ + y₁ cos θ).', solution: cs`
(double x, double y, double e, double n) cp1 = (5, 2, 512345.373, 180220.357);
(double x, double y, double e, double n) cp2 = (30, 14, 512372.858, 180224.044);

double angProject = Math.Atan2(cp2.y - cp1.y, cp2.x - cp1.x);
double angShared = Math.Atan2(cp2.n - cp1.n, cp2.e - cp1.e);
double t = angProject - angShared, c = Math.Cos(t), s = Math.Sin(t);

double e0 = cp1.e - (cp1.x * c + cp1.y * s);
double n0 = cp1.n - (-cp1.x * s + cp1.y * c);
Console.WriteLine($"angle to true north: {t * 180 / Math.PI:0.0000} deg");
Console.WriteLine($"project origin: E {e0:0.000}, N {n0:0.000}");

double x3 = 12, y3 = 25;
double e3 = e0 + x3 * c + y3 * s, n3 = n0 - x3 * s + y3 * c;
double off = Math.Sqrt((e3 - 512359.138) * (e3 - 512359.138) + (n3 - 180240.068) * (n3 - 180240.068));
Console.WriteLine($"CP3 computed: E {e3:0.000}, N {n3:0.000}, off by {off * 1000:0.0} mm");`, output: 'angle to true north: 18.0006 deg\nproject origin: E 512340.000, N 180220.000\nCP3 computed: E 512359.138, N 180240.068, off by 0.0 mm' }
    ],
    keyPoints: [
      'Project coordinates are for modelling; shared (survey) coordinates place the model on the site.',
      'Georeferencing is a rigid transform: E = E₀ + x cos θ + y sin θ, N = N₀ − x sin θ + y cos θ, elevation = Z₀ + z.',
      'Angle conventions differ between programs, so check every transform with a known point.',
      'Keep geometry near a local origin; floats at survey coordinates have centimetre-sized gaps.',
      'Bearings are measured clockwise from north: atan2(ΔE, ΔN). Ground and grid distances differ by the combined scale factor.'
    ]
  },
  // ------------------------------------------------------------------ 3
  {
    slug: 'cameras-projection',
    title: 'Cameras: view matrices, perspective and section boxes',
    summary: 'How a 3D view is made: the look-at view matrix, perspective and orthographic projection, the depth buffer, section boxes that clip the model, and turning a mouse click back into a ray.',
    minutes: 16,
    blocks: [
      { type: 'p', text: 'Every 3D view in a BIM program, from the default 3D view to a rendered walkthrough, is the same pipeline of transforms from the matrices module. Each model point goes **world → camera → clip space → screen pixels**. The camera is just another coordinate system: put it anywhere, express every point in its axes, then flatten the result onto the screen.' },
      { type: 'widget', name: 'camera' },
      { type: 'h2', text: 'The view matrix: the world as the camera sees it' },
      { type: 'p', text: 'A camera is described by an **eye** position, a **target** it looks at, and which way is **up**. From those come three axes at right angles: forward f = unit(target − eye), right r = unit(f × up), and the camera’s own up u = r × f. The view matrix is the world-to-local transform for that frame: subtract the eye, then dot with each axis. By the convention of OpenGL, WebGL and three.js, the camera looks down its own −z axis, so the third row is −f.' },
      { type: 'code', title: 'LookAt.cs', code: cs`
var eye = new V3(12, -8, 7);
var target = new V3(3, 2, 1.5);
var view = LookAt(eye, target, up: new V3(0, 0, 1));

foreach (var (name, p) in new (string, V3)[] { ("target", target), ("eye", eye), ("column top", new(0, 0, 3)), ("far corner", new(6, 4, 0)) })
    Console.WriteLine($"{name,-11} world {p,-14} camera {view.Point(p)}");
Console.WriteLine($"distance to target: {(target - eye).Length:0.###}");

static M4 LookAt(V3 eye, V3 target, V3 up)
{
    var f = (target - eye).Normalized();
    var r = V3.Cross(f, up).Normalized();
    var u = V3.Cross(r, f);
    var m = M4.Identity();
    V3[] rows = { r, u, f * -1 };                     // camera x = right, y = up, looks along -z
    for (int i = 0; i < 3; i++)
    {
        m.A[i, 0] = rows[i].X; m.A[i, 1] = rows[i].Y; m.A[i, 2] = rows[i].Z;
        m.A[i, 3] = -V3.Dot(rows[i], eye);             // move the eye to the origin
    }
    return m;
}

sealed class M4                       // 4x4, column vectors: p' = M * p
{
    public readonly double[,] A = new double[4, 4];

    public static M4 Identity()
    {
        var m = new M4();
        for (int i = 0; i < 4; i++) m.A[i, i] = 1;
        return m;
    }
    public static M4 Move(double x, double y, double z)
    {
        var m = Identity();
        m.A[0, 3] = x; m.A[1, 3] = y; m.A[2, 3] = z;
        return m;
    }
    public static M4 Scale(double x, double y, double z)
    {
        var m = Identity();
        m.A[0, 0] = x; m.A[1, 1] = y; m.A[2, 2] = z;
        return m;
    }
    public static M4 RotateZ(double degrees)
    {
        double t = degrees * Math.PI / 180, c = Math.Cos(t), s = Math.Sin(t);
        var m = Identity();
        m.A[0, 0] = c; m.A[0, 1] = -s;
        m.A[1, 0] = s; m.A[1, 1] = c;
        return m;
    }
    public static M4 operator *(M4 p, M4 q)
    {
        var m = new M4();
        for (int i = 0; i < 4; i++)
            for (int j = 0; j < 4; j++)
                for (int k = 0; k < 4; k++) m.A[i, j] += p.A[i, k] * q.A[k, j];
        return m;
    }
    public V3 Point(V3 p) => Apply(p, 1);        // w = 1: moved
    public V3 Direction(V3 v) => Apply(v, 0);    // w = 0: only turned and scaled
    V3 Apply(V3 v, double w) => new(
        A[0, 0] * v.X + A[0, 1] * v.Y + A[0, 2] * v.Z + A[0, 3] * w,
        A[1, 0] * v.X + A[1, 1] * v.Y + A[1, 2] * v.Z + A[1, 3] * w,
        A[2, 0] * v.X + A[2, 1] * v.Y + A[2, 2] * v.Z + A[2, 3] * w);
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
    static string F(double v) => Math.Abs(v) < 5e-4 ? "0" : v.ToString("0.###");
    public override string ToString() => $"({F(X)}, {F(Y)}, {F(Z)})";
}`, output: 'target      world (3, 2, 1.5)    camera (0, 0, -14.534)\neye         world (12, -8, 7)    camera (0, 0, 0)\ncolumn top  world (0, 0, 3)      camera (-3.568, 1.585, -14.448)\nfar corner  world (6, 4, 0)      camera (3.568, -1.585, -14.62)\ndistance to target: 14.534' },
      { type: 'p', text: 'The target lands on the negative z axis at exactly its distance from the eye, and the eye itself goes to the origin. Points to the camera’s left get a negative x, points above its line of sight a positive y. Orbiting, panning and zooming in a BIM viewer only ever change eye and target; the matrix is rebuilt from them every frame.' },
      { type: 'note', kind: 'warn', text: 'If the view direction is parallel to up (looking straight down in a plan view), f × up is zero and the right axis is undefined. Viewers switch to a different up vector, such as the model’s y axis, for top and bottom views.' },
      { type: 'h2', text: 'Perspective: divide by the depth' },
      { type: 'p', text: 'In a perspective view, a thing twice as far away looks half as big. The projection matrix arranges this with homogeneous coordinates: it copies the depth into the fourth coordinate w, and the graphics card divides x, y and z by w afterwards (the **perspective divide**). With f = 1 / tan(fov / 2):' },
      { type: 'table', head: ['', 'x', 'y', 'z', 'w'], rows: [
        ['row 1', 'f / aspect', '0', '0', '0'],
        ['row 2', '0', 'f', '0', '0'],
        ['row 3', '0', '0', '(n + f) / (n − f)', '2·n·f / (n − f)'],
        ['row 4', '0', '0', '−1', '0']
      ] },
      { type: 'p', text: 'Here fov is the vertical field of view, aspect is width / height, and n and f are the near and far clipping distances (the f in rows 3 and 4 is the far distance, not the focal factor). After the divide, everything visible has x, y and z between −1 and 1: the **normalised device coordinates** (NDC), which the viewport then scales to pixels.' },
      { type: 'code', title: 'Perspective.cs', code: cs`
var proj = Perspective(fovYDeg: 50, aspect: 16.0 / 9, near: 0.1, far: 1000);

foreach (double depth in new[] { 5.0, 10, 20 })
{
    var top = ToPixels(proj, new V3(1, 1.5, -depth), 1920, 1080);
    var bottom = ToPixels(proj, new V3(1, -1.5, -depth), 1920, 1080);
    Console.WriteLine($"3 m column {depth,2} m away: x = {top.X:0} px, {bottom.Y - top.Y:0} px tall");
}

Console.WriteLine("depth buffer value against distance:");
foreach (double d in new[] { 0.1, 1, 10, 100, 1000 })
    Console.WriteLine($"  {d,6} m -> z = {Ndc(proj, new V3(0, 0, -d)).Z:0.00000}");

static M4 Perspective(double fovYDeg, double aspect, double near, double far)
{
    double f = 1 / Math.Tan(fovYDeg * Math.PI / 360);
    var m = new M4();
    m.A[0, 0] = f / aspect;
    m.A[1, 1] = f;
    m.A[2, 2] = (near + far) / (near - far);
    m.A[2, 3] = 2 * near * far / (near - far);
    m.A[3, 2] = -1;                                    // w = -z: the depth in front of the camera
    return m;
}

static V3 Ndc(M4 m, V3 p)
{
    double[] c = new double[4];
    for (int i = 0; i < 4; i++) c[i] = m.A[i, 0] * p.X + m.A[i, 1] * p.Y + m.A[i, 2] * p.Z + m.A[i, 3];
    return new V3(c[0] / c[3], c[1] / c[3], c[2] / c[3]);   // the perspective divide
}

static V3 ToPixels(M4 m, V3 p, int w, int h)
{
    var n = Ndc(m, p);
    return new V3((n.X + 1) / 2 * w, (1 - n.Y) / 2 * h, n.Z);   // pixel y grows downwards
}

sealed class M4                       // 4x4, column vectors: p' = M * p
{
    public readonly double[,] A = new double[4, 4];

    public static M4 Identity()
    {
        var m = new M4();
        for (int i = 0; i < 4; i++) m.A[i, i] = 1;
        return m;
    }
    public static M4 Move(double x, double y, double z)
    {
        var m = Identity();
        m.A[0, 3] = x; m.A[1, 3] = y; m.A[2, 3] = z;
        return m;
    }
    public static M4 Scale(double x, double y, double z)
    {
        var m = Identity();
        m.A[0, 0] = x; m.A[1, 1] = y; m.A[2, 2] = z;
        return m;
    }
    public static M4 RotateZ(double degrees)
    {
        double t = degrees * Math.PI / 180, c = Math.Cos(t), s = Math.Sin(t);
        var m = Identity();
        m.A[0, 0] = c; m.A[0, 1] = -s;
        m.A[1, 0] = s; m.A[1, 1] = c;
        return m;
    }
    public static M4 operator *(M4 p, M4 q)
    {
        var m = new M4();
        for (int i = 0; i < 4; i++)
            for (int j = 0; j < 4; j++)
                for (int k = 0; k < 4; k++) m.A[i, j] += p.A[i, k] * q.A[k, j];
        return m;
    }
    public V3 Point(V3 p) => Apply(p, 1);        // w = 1: moved
    public V3 Direction(V3 v) => Apply(v, 0);    // w = 0: only turned and scaled
    V3 Apply(V3 v, double w) => new(
        A[0, 0] * v.X + A[0, 1] * v.Y + A[0, 2] * v.Z + A[0, 3] * w,
        A[1, 0] * v.X + A[1, 1] * v.Y + A[1, 2] * v.Z + A[1, 3] * w,
        A[2, 0] * v.X + A[2, 1] * v.Y + A[2, 2] * v.Z + A[2, 3] * w);
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
    static string F(double v) => Math.Abs(v) < 5e-4 ? "0" : v.ToString("0.###");
    public override string ToString() => $"({F(X)}, {F(Y)}, {F(Z)})";
}`, output: '3 m column  5 m away: x = 1192 px, 695 px tall\n3 m column 10 m away: x = 1076 px, 347 px tall\n3 m column 20 m away: x = 1018 px, 174 px tall\ndepth buffer value against distance:\n     0.1 m -> z = -1.00000\n       1 m -> z = 0.80018\n      10 m -> z = 0.98020\n     100 m -> z = 0.99820\n    1000 m -> z = 1.00000' },
      { type: 'p', text: 'Double the distance and the column’s height on screen halves, and its x moves towards the centre of the screen at 960 px: that is perspective. The second table shows something less obvious. The depth value is not proportional to distance: it climbs past 0.98 within the first 10 m, leaving a tiny slice of the range for everything further away. Two faces 1 cm apart, 300 m from the camera, can get the same depth value and flicker through each other (**z-fighting**). Keep the near plane as far out as you can, or use a **reversed-Z** depth buffer as modern engines do.' },
      { type: 'h2', text: 'Orthographic: no divide' },
      { type: 'p', text: 'Plans, sections and elevations must not shrink with distance: a 3 m wall is 3 m long whether it is near or far. An orthographic projection simply scales a box of space (left, right, bottom, top, near, far) to the −1…1 cube, and leaves w = 1, so there is no divide. In the widget, switch to orthographic and change the distance: the picture does not change, only the size of the view box does. BIM programs often let you toggle the 3D view between the two for exactly this reason.' },
      { type: 'h2', text: 'Section boxes and clipping' },
      { type: 'p', text: 'A **section box** is an axis-aligned box (or an oriented one) that hides everything outside it, and it is how BIM users look inside a model. On a graphics card it is six clipping planes; in code that has to know what was cut, such as cutting a pipe to the box or listing the elements a box touches, it is the **Liang–Barsky** algorithm. Write the segment as P(t) = A + t·(B − A). Each of the six faces cuts off the part of the t range that lies outside it; whatever survives all six is inside.' },
      { type: 'code', title: 'SectionBox.cs', code: cs`
var box = new Aabb(new V3(0, 0, 0), new V3(6, 4, 1.6));       // section box around the ground floor

var segments = new (string Name, V3 A, V3 B)[]
{
    ("pipe through the box", new(-2, 1, 1.2), new(8, 3, 1.2)),
    ("riser from below", new(5, 3, -1), new(5, 3, 4)),
    ("duct above the box", new(0, 2, 2.5), new(6, 2, 2.5)),
};
foreach (var (name, a, b) in segments)
{
    var c = Clip(a, b, box);
    Console.WriteLine(c is { } k ? $"{name,-20} kept {k.Item1} to {k.Item2}" : $"{name,-20} hidden");
}

// Liang-Barsky: each face trims the range of t in which A + t(B - A) is inside
static (V3, V3)? Clip(V3 a, V3 b, Aabb box)
{
    double t0 = 0, t1 = 1;
    var d = b - a;
    double[] start = { a.X, a.Y, a.Z }, dir = { d.X, d.Y, d.Z };
    double[] lo = { box.Min.X, box.Min.Y, box.Min.Z }, hi = { box.Max.X, box.Max.Y, box.Max.Z };
    for (int k = 0; k < 3; k++)
    {
        if (Math.Abs(dir[k]) < 1e-12)
        {
            if (start[k] < lo[k] || start[k] > hi[k]) return null;   // parallel and outside
            continue;
        }
        double ta = (lo[k] - start[k]) / dir[k], tb = (hi[k] - start[k]) / dir[k];
        t0 = Math.Max(t0, Math.Min(ta, tb));
        t1 = Math.Min(t1, Math.Max(ta, tb));
        if (t0 > t1) return null;
    }
    return (a + d * t0, a + d * t1);
}

readonly record struct Aabb(V3 Min, V3 Max);

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
    static string F(double v) => Math.Abs(v) < 5e-4 ? "0" : v.ToString("0.###");
    public override string ToString() => $"({F(X)}, {F(Y)}, {F(Z)})";
}`, output: 'pipe through the box kept (0, 1.4, 1.2) to (6, 2.6, 1.2)\nriser from below     kept (5, 3, 0) to (5, 3, 1.6)\nduct above the box   hidden' },
      { type: 'h2', text: 'From a mouse click back to the model' },
      { type: 'p', text: 'Picking runs the pipeline backwards. A click at pixel (px, py) becomes NDC coordinates, those give a direction in camera space (scaled by the field of view), and the camera’s axes turn that direction into a world ray from the eye. The ray–triangle lesson then finds what it hits. Here the ray is intersected with the floor plane z = 0 to find where on the floor the user clicked.' },
      { type: 'code', title: 'PickRay.cs', code: cs`
V3 eye = new(12, -8, 7), target = new(3, 2, 1.5), up = new(0, 0, 1);
double fovY = 50 * Math.PI / 180, aspect = 1920.0 / 1080;

var f = (target - eye).Normalized();
var r = V3.Cross(f, up).Normalized();
var u = V3.Cross(r, f);

foreach (var (px, py) in new[] { (960.0, 540.0), (1400.0, 700.0), (300.0, 900.0) })
{
    double nx = px / 1920 * 2 - 1, ny = 1 - py / 1080 * 2;              // pixels to NDC
    double tan = Math.Tan(fovY / 2);
    var dir = (f + r * (nx * tan * aspect) + u * (ny * tan)).Normalized();  // camera space to world

    double t = -eye.Z / dir.Z;                                           // where the ray meets z = 0
    var hit = eye + dir * t;
    Console.WriteLine($"pixel ({px}, {py}): ray {dir}, floor hit {hit}");
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
    static string F(double v) => Math.Abs(v) < 5e-4 ? "0" : v.ToString("0.###");
    public override string ToString() => $"({F(X)}, {F(Y)}, {F(Z)})";
}`, output: 'pixel (960, 540): ray (-0.619, 0.688, -0.378), floor hit (0.545, 4.727, 0)\npixel (1400, 700): ray (-0.28, 0.837, -0.469), floor hit (7.827, 4.489, 0)\npixel (300, 900): ray (-0.809, 0.184, -0.559), floor hit (1.869, -5.695, 0)' },
      { type: 'p', text: 'The centre pixel gives exactly the forward direction, so its ray passes through the target (3, 2, 1.5) and meets the floor beyond it. In a real viewer the same ray goes to the spatial index of the next lessons but one, to find which elements it might hit before testing their triangles.' },
      { type: 'quiz', question: 'In a perspective view, a duct 40 m from the camera shows z-fighting with a ceiling 1 cm above it, but the problem goes away when the near plane moves from 0.01 m to 0.5 m. Why?', options: ['Depth precision depends on the ratio far / near; a tiny near plane wastes almost all of the depth range on the first few centimetres', 'A bigger near plane makes the duct thicker', 'The far plane moved closer automatically', 'Orthographic projection was switched on'], answer: 0, explain: 'The NDC depth is roughly 1 − 2n / d for distances well beyond n, so its resolution at distance d gets worse as n shrinks. Push the near plane out, or use reversed-Z.' },
      { type: 'quiz', question: 'Why do plans and sections use orthographic rather than perspective projection?', options: ['Sizes on screen must not depend on distance, so dimensions can be measured and parallel lines stay parallel', 'Orthographic is cheaper to compute', 'Perspective cannot show walls', 'Orthographic hides the elements behind the section'], answer: 0, explain: 'Drawings are measured. Without the divide by depth, every element keeps its true scale.' },
      { type: 'exercise', task: 'Zoom to extents: the model’s bounding box runs from (0, 0, 0) to (60, 40, 20). With a vertical field of view of 50° and a 16:9 view, find the camera distance from the box centre at which the box’s bounding sphere just fits, then the eye position if the camera looks from the direction (1, −1, 0.6). Print the sphere radius, the horizontal field of view, the distance and the eye.', hint: 'The horizontal fov is 2·atan(tan(fovY / 2) · aspect). A sphere of radius r fits a cone of half-angle a at distance r / sin(a); use the smaller of the two fields of view.', solution: cs`
V3 lo = new(0, 0, 0), hi = new(60, 40, 20);
var centre = (lo + hi) * 0.5;
double radius = (hi - lo).Length / 2;

double fovY = 50 * Math.PI / 180, aspect = 16.0 / 9;
double fovX = 2 * Math.Atan(Math.Tan(fovY / 2) * aspect);
double half = Math.Min(fovX, fovY) / 2;
double distance = radius / Math.Sin(half);

var eye = centre + new V3(1, -1, 0.6).Normalized() * distance;
Console.WriteLine($"sphere radius {radius:0.000} m, horizontal fov {fovX * 180 / Math.PI:0.00} deg");
Console.WriteLine($"distance {distance:0.000} m, eye at {eye}");

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
    static string F(double v) => Math.Abs(v) < 5e-4 ? "0" : v.ToString("0.###");
    public override string ToString() => $"({F(X)}, {F(Y)}, {F(Z)})";
}`, output: 'sphere radius 37.417 m, horizontal fov 79.32 deg\ndistance 88.535 m, eye at (87.631, -37.631, 44.579)' }
    ],
    keyPoints: [
      'A 3D view is world → camera (view matrix) → clip space (projection) → divide by w → pixels.',
      'The look-at matrix has rows right, up and −forward, plus a move that puts the eye at the origin.',
      'Perspective copies depth into w so x and y are divided by distance; orthographic leaves w = 1.',
      'Depth precision is uneven: keep the near plane as far out as possible, or use reversed-Z.',
      'Section boxes clip with six planes (Liang–Barsky for segments); picking runs the pipeline backwards to get a world ray.'
    ]
  },
  // ------------------------------------------------------------------ 4
  {
    slug: 'brep-nurbs',
    title: 'B-rep and NURBS: how BIM kernels store solids',
    summary: 'What is inside a geometry kernel: boundary representation with faces, loops, edges and vertices, Euler–Poincaré checks, B-spline and NURBS curves, exact circles, and tessellation to a tolerance.',
    minutes: 17,
    blocks: [
      { type: 'p', text: 'The meshes of the previous module are what a viewer draws. They are not what Revit, ArchiCAD, Tekla or an IFC file usually store. A curved wall stored as triangles is only an approximation; ask for its exact area, offset it by 100 mm or cut a door into it, and the triangles get in the way. Modelling kernels (Parasolid, ACIS, Open CASCADE, and the kernels inside the BIM tools) store solids exactly as a **boundary representation (B-rep)** with **NURBS** or analytic surfaces, and only turn them into triangles when something needs drawing.' },
      { type: 'h2', text: 'B-rep: topology plus geometry' },
      { type: 'p', text: 'A B-rep separates **what is connected to what** (topology) from **where it is** (geometry):' },
      { type: 'table', head: ['Topology', 'Carries the geometry', 'Example for a curved wall'], rows: [
        ['Solid / shell', 'A closed set of faces', 'The whole wall'],
        ['Face', 'A surface (plane, cylinder, NURBS)', 'The curved inner face: a piece of a cylinder'],
        ['Loop', 'A closed ring of edges bounding a face', 'Outer boundary, plus one loop per window hole'],
        ['Edge', 'A curve (line, arc, NURBS)', 'The arc where the face meets the floor'],
        ['Vertex', 'A point', 'A corner of the wall']
      ] },
      { type: 'p', text: 'Faces are not limited to triangles: a whole wall face is one face, however large, and can have holes as extra loops. Each edge is shared by exactly two faces, and walking the loops of neighbouring faces passes along it in opposite directions, just like the edge pairing of a closed mesh. The **Euler–Poincaré formula** checks that the counts are consistent: **V − E + F − (L − F) = 2(S − G)**, where L is the number of loops, S the number of shells and G the genus (the number of through-holes).' },
      { type: 'code', title: 'BRep.cs', code: cs`
// A box: 8 vertices, 6 faces with one loop each (vertex numbers counter-clockwise from outside)
var box = new BRep(8, new[]
{
    new[] { new[] { 0, 3, 2, 1 } }, new[] { new[] { 4, 5, 6, 7 } },
    new[] { new[] { 0, 1, 5, 4 } }, new[] { new[] { 1, 2, 6, 5 } },
    new[] { new[] { 2, 3, 7, 6 } }, new[] { new[] { 3, 0, 4, 7 } },
});
box.Report("box");

// A square tube (a box with a square hole through it): the top and bottom faces have two loops each.
// Outer corners 0-3 (bottom) and 4-7 (top), hole corners 8-11 (bottom) and 12-15 (top).
var tube = new BRep(16, new[]
{
    new[] { new[] { 0, 3, 2, 1 }, new[] { 8, 9, 10, 11 } },          // bottom face with the hole
    new[] { new[] { 4, 5, 6, 7 }, new[] { 12, 15, 14, 13 } },        // top face with the hole
    new[] { new[] { 0, 1, 5, 4 } }, new[] { new[] { 1, 2, 6, 5 } },
    new[] { new[] { 2, 3, 7, 6 } }, new[] { new[] { 3, 0, 4, 7 } },
    new[] { new[] { 8, 12, 13, 9 } }, new[] { new[] { 9, 13, 14, 10 } },  // the four faces inside the hole
    new[] { new[] { 10, 14, 15, 11 } }, new[] { new[] { 11, 15, 12, 8 } },
});
tube.Report("tube");

sealed class BRep
{
    readonly int vertices;
    readonly int[][][] faces;                       // face -> loops -> vertex numbers
    public BRep(int vertices, int[][][] faces) { this.vertices = vertices; this.faces = faces; }

    public void Report(string name)
    {
        var used = new Dictionary<(int, int), int>();        // directed edge -> how often a loop walks it
        int loops = 0;
        foreach (var face in faces)
            foreach (var loop in face)
            {
                loops++;
                for (int i = 0; i < loop.Length; i++)
                {
                    var e = (loop[i], loop[(i + 1) % loop.Length]);
                    used[e] = used.GetValueOrDefault(e) + 1;
                }
            }
        int edges = used.Count / 2;
        bool paired = used.All(kv => kv.Value == 1 && used.GetValueOrDefault((kv.Key.Item2, kv.Key.Item1)) == 1);
        int v = vertices, f = faces.Length, lhs = v - edges + f - (loops - f);
        int genus = 1 - lhs / 2;                             // one shell: lhs = 2(1 - G)
        Console.WriteLine($"{name}: V {v}, E {edges}, F {f}, L {loops}; V - E + F - (L - F) = {lhs}; edges paired: {paired}; genus {genus}");
    }
}`, output: 'box: V 8, E 12, F 6, L 6; V - E + F - (L - F) = 2; edges paired: True; genus 0\ntube: V 16, E 24, F 10, L 12; V - E + F - (L - F) = 0; edges paired: True; genus 1' },
      { type: 'p', text: 'The box gives 2 and genus 0. The tube’s top and bottom faces each have an extra loop for the hole, and the formula gives 0: genus 1, one hole through the solid. Kernels run checks like these after every operation; a B-rep that fails them is “invalid” and gets refused by booleans, exporters and IFC validators.' },
      { type: 'h2', text: 'B-splines: smooth curves from control points' },
      { type: 'p', text: 'The geometry on the edges and faces is very often NURBS: **Non-Uniform Rational B-Splines**. Start with the B-spline part. A curve of degree p is a weighted average of its control points P₀…Pₙ, and the weights at each parameter t are the **basis functions** N(i, p)(t), defined recursively by the Cox–de Boor formula over a **knot vector**. Two properties make them so useful:' },
      { type: 'ul', items: [
        '**Local control**: each basis function is non-zero only over p + 1 knot spans, so moving one control point changes only a nearby piece of the curve.',
        '**Partition of unity**: the basis functions always add up to 1, so the curve stays inside the convex hull of its control points and moves with them under any affine transform.'
      ] },
      { type: 'p', text: 'A **clamped** knot vector repeats the first and last knots p + 1 times, which makes the curve start exactly at P₀ and end exactly at Pₙ. In the widget, change the degree and watch how far each basis function reaches.' },
      { type: 'widget', name: 'nurbs' },
      { type: 'code', title: 'CoxDeBoor.cs', code: cs`
var ctrl = new V2[] { new(0.4, 0.6), new(1.4, 4.2), new(3, 1), new(4.6, 4.6), new(5.8, 1.4) };
int p = 3;
double[] knots = { 0, 0, 0, 0, 0.5, 1, 1, 1, 1 };       // clamped: p + 1 zeros and ones

foreach (double t in new[] { 0.0, 0.25, 0.5, 1.0 })
{
    var n = Basis(t, p, knots, ctrl.Length);
    var point = new V2(0, 0);
    for (int i = 0; i < ctrl.Length; i++) point += ctrl[i] * n[i];
    Console.WriteLine($"t = {t,4}: N = [{string.Join(", ", n.Select(v => v.ToString("0.000")))}], sum {n.Sum():0.###}, point {point}");
}

// Cox-de Boor: start with step functions (degree 0) and blend neighbours up to degree p
static double[] Basis(double t, int p, double[] k, int count)
{
    var n = new double[k.Length - 1];
    for (int i = 0; i < n.Length; i++)
        n[i] = (t >= k[i] && t < k[i + 1]) || (t == k[^1] && k[i] < t && k[i + 1] == t) ? 1 : 0;
    for (int d = 1; d <= p; d++)
        for (int i = 0; i < k.Length - d - 1; i++)
        {
            double a = k[i + d] - k[i], b = k[i + d + 1] - k[i + 1];
            n[i] = (a > 0 ? (t - k[i]) / a * n[i] : 0) + (b > 0 ? (k[i + d + 1] - t) / b * n[i + 1] : 0);
        }
    return n[..count];
}

readonly record struct V2(double X, double Y)
{
    public static V2 operator +(V2 a, V2 b) => new(a.X + b.X, a.Y + b.Y);
    public static V2 operator -(V2 a, V2 b) => new(a.X - b.X, a.Y - b.Y);
    public static V2 operator *(V2 v, double k) => new(v.X * k, v.Y * k);
    public double Length => Math.Sqrt(X * X + Y * Y);
    static string F(double v) => Math.Abs(v) < 5e-4 ? "0" : v.ToString("0.###");
    public override string ToString() => $"({F(X)}, {F(Y)})";
}`, output: 't =    0: N = [1.000, 0.000, 0.000, 0.000, 0.000], sum 1, point (0.4, 0.6)\nt = 0.25: N = [0.125, 0.594, 0.250, 0.031, 0.000], sum 1, point (1.775, 2.963)\nt =  0.5: N = [0.000, 0.250, 0.500, 0.250, 0.000], sum 1, point (3, 2.7)\nt =    1: N = [0.000, 0.000, 0.000, 0.000, 1.000], sum 1, point (5.8, 1.4)' },
      { type: 'p', text: 'At t = 0 only N₀ is non-zero, so the curve starts exactly at P₀; at t = 1 it ends at P₄. In between, at most p + 1 = 4 functions are non-zero, and they always add up to 1. Updating n[i] in place works because each new value only uses n[i] and n[i + 1], which have not been overwritten yet.' },
      { type: 'h2', text: 'The R in NURBS: weights and exact circles' },
      { type: 'p', text: 'A plain B-spline is a polynomial, and **no polynomial curve can draw an exact circle**. That matters in BIM: pipes, round columns, curved walls and arcs in plans must be exact. NURBS add a weight wᵢ to each control point and divide: **C(t) = Σ wᵢ·Nᵢ(t)·Pᵢ / Σ wᵢ·Nᵢ(t)**. With three control points at the corners of a square, degree 2, and the middle weight set to cos 45° ≈ 0.7071, the curve is exactly a quarter circle.' },
      { type: 'code', title: 'ExactCircle.cs', code: cs`
const double R = 4.4;
var ctrl = new V2[] { new(R, 0), new(R, R), new(0, R) };

foreach (double w in new[] { 1.0, Math.Sqrt(0.5) })
{
    double worst = 0;
    for (int s = 0; s <= 100; s++)
    {
        double t = s / 100.0;
        // degree 2 on knots 0,0,0,1,1,1: the basis is (1-t)^2, 2t(1-t), t^2
        double b0 = (1 - t) * (1 - t), b1 = 2 * t * (1 - t) * w, b2 = t * t;
        var pt = (ctrl[0] * b0 + ctrl[1] * b1 + ctrl[2] * b2) * (1 / (b0 + b1 + b2));
        worst = Math.Max(worst, Math.Abs(pt.Length - R));
    }
    Console.WriteLine($"middle weight {w:0.0000}: largest distance from the circle {worst * 1000:0.000000} mm");
}

readonly record struct V2(double X, double Y)
{
    public static V2 operator +(V2 a, V2 b) => new(a.X + b.X, a.Y + b.Y);
    public static V2 operator -(V2 a, V2 b) => new(a.X - b.X, a.Y - b.Y);
    public static V2 operator *(V2 v, double k) => new(v.X * k, v.Y * k);
    public double Length => Math.Sqrt(X * X + Y * Y);
    static string F(double v) => Math.Abs(v) < 5e-4 ? "0" : v.ToString("0.###");
    public override string ToString() => $"({F(X)}, {F(Y)})";
}`, output: 'middle weight 1.0000: largest distance from the circle 266.904756 mm\nmiddle weight 0.7071: largest distance from the circle 0.000000 mm' },
      { type: 'p', text: 'With every weight 1 (a plain quadratic) the curve misses the circle by up to about a quarter of a metre; with weight cos 45° the error is only rounding. Many kernels go one step further and store planes, cylinders, cones, spheres and tori as **analytic surfaces** with exact formulas, keeping NURBS for genuinely free-form shapes. IFC has both: IfcCircle and IfcCylindricalSurface next to IfcBSplineCurveWithKnots and IfcRationalBSplineSurfaceWithKnots.' },
      { type: 'h2', text: 'Tessellation: exact shapes to triangles' },
      { type: 'p', text: 'To draw a B-rep, or to run mesh algorithms such as clash detection on it, the kernel **tessellates** each face to a tolerance. For an arc of radius r split into chords, the largest gap between chord and arc (the **sagitta**) is r·(1 − cos(θ / 2)) for a chord spanning angle θ. Fix the allowed gap and you get the number of segments.' },
      { type: 'code', title: 'Tessellate.cs', code: cs`
var shapes = new (string Name, double Radius, double AngleDeg)[]
{
    ("50 mm pipe", 0.025, 360), ("600 mm column", 0.3, 360), ("curved wall r = 12 m, 90 deg", 12, 90)
};
foreach (double tol in new[] { 0.001, 0.0001 })
    foreach (var (name, r, angle) in shapes)
    {
        double maxStep = 2 * Math.Acos(1 - Math.Min(tol / r, 1));   // the chord angle that keeps the sagitta <= tol
        int n = Math.Max(3, (int)Math.Ceiling(angle * Math.PI / 180 / maxStep));
        Console.WriteLine($"tolerance {tol * 1000,3} mm: {name,-28} {n,4} segments");
    }`, output: 'tolerance   1 mm: 50 mm pipe                     12 segments\ntolerance   1 mm: 600 mm column                  39 segments\ntolerance   1 mm: curved wall r = 12 m, 90 deg   61 segments\ntolerance 0.1 mm: 50 mm pipe                     36 segments\ntolerance 0.1 mm: 600 mm column                 122 segments\ntolerance 0.1 mm: curved wall r = 12 m, 90 deg  193 segments' },
      { type: 'p', text: 'A thin pipe needs few segments; a big radius needs many, because a long chord drifts far from the arc. Tightening the tolerance tenfold multiplies the count by about √10 ≈ 3.2, and on surfaces the triangle count grows with the square of that. This is why BIM viewers offer a “level of detail” setting, and why the triangle count of an exported model depends so much on the export tolerance.' },
      { type: 'quiz', question: 'Why do modelling kernels store a curved wall as a B-rep with a cylindrical or NURBS face rather than as a triangle mesh?', options: ['The exact surface gives exact areas, offsets and booleans; triangles are only made when something has to be drawn', 'Triangles cannot be curved, so meshes cannot show curved walls at all', 'B-reps use less memory than any mesh', 'Meshes cannot be saved to IFC'], answer: 0, explain: 'A mesh is an approximation at one fixed tolerance. Operations on the exact surface stay exact, and the mesh can be regenerated at whatever tolerance a view needs.' },
      { type: 'quiz', question: 'A NURBS curve has degree 3. How many control points affect the curve at any one value of t?', options: ['At most 4 (degree + 1)', 'All of them', 'Exactly 3', 'Only the nearest one'], answer: 0, explain: 'Each basis function is non-zero over p + 1 knot spans, so at any t at most p + 1 of them are non-zero. That is the local control property.' },
      { type: 'exercise', task: 'Tessellate a round column of radius 0.3 m with a chord tolerance of 1 mm. Print the number of segments, the largest gap between chord and circle, the area of the polygon against the exact πr², and the relative area error.', hint: 'n = ceil(2π / (2·acos(1 − tol / r))). The polygon of n equal chords has area ½·n·r²·sin(2π / n), and its largest gap is r·(1 − cos(π / n)).', solution: cs`
double r = 0.3, tol = 0.001;
int n = (int)Math.Ceiling(2 * Math.PI / (2 * Math.Acos(1 - tol / r)));
double gap = r * (1 - Math.Cos(Math.PI / n));
double polygon = 0.5 * n * r * r * Math.Sin(2 * Math.PI / n);
double exact = Math.PI * r * r;

Console.WriteLine($"{n} segments, largest gap {gap * 1000:0.000} mm");
Console.WriteLine($"polygon area {polygon:0.000000} m2, exact {exact:0.000000} m2");
Console.WriteLine($"area error {(exact - polygon) / exact * 100:0.000}%");`, output: '39 segments, largest gap 0.973 mm\npolygon area 0.281522 m2, exact 0.282743 m2\narea error 0.432%' }
    ],
    keyPoints: [
      'Kernels store solids as B-reps: shells of faces bounded by loops of edges and vertices, each carrying exact geometry.',
      'Euler–Poincaré, V − E + F − (L − F) = 2(S − G), and edge pairing check that a B-rep is valid.',
      'B-spline basis functions (Cox–de Boor) give local control and always add up to 1; clamped knots make the curve start and end at the end points.',
      'Weights make NURBS rational, so they can represent circles and conics exactly.',
      'Tessellation turns exact faces into triangles to a chord tolerance; tighter tolerances cost many more triangles.'
    ]
  },
  // ------------------------------------------------------------------ 5
  {
    slug: 'spatial-queries-scale',
    title: 'Spatial queries at scale',
    summary: 'How BIM software answers “what is here?” for hundreds of thousands of elements: uniform grids, quadtrees and bounding volume hierarchies for window queries, picking rays, clash pairs and nearest neighbours.',
    minutes: 16,
    blocks: [
      { type: 'p', text: 'A hospital model can hold half a million elements. Every interaction asks a spatial question: which elements are inside this selection window, what is under the mouse, which pairs might clash, what is the nearest sprinkler to this point. Testing every element every time is O(n) per query and O(n²) for clash pairs, which is far too slow. A **spatial index** organises the elements’ bounding boxes so that a query only looks at the few elements nearby.' },
      { type: 'widget', name: 'spatial' },
      { type: 'h2', text: 'The uniform grid' },
      { type: 'p', text: 'The simplest index divides space into equal cells and lists, for each cell, the elements whose bounding box overlaps it. A query works out which cells its own box covers and tests only the elements listed there. An element that straddles cells is listed in each of them, so the results need de-duplicating. A dictionary keyed by the cell coordinates means only cells that contain something use memory.' },
      { type: 'code', title: 'GridIndex.cs', code: cs`
var items = Site.Boxes(20_000);
var grid = new GridIndex(5.0);
for (int i = 0; i < items.Count; i++) grid.Insert(i, items[i]);

var window = new Box(100, 100, 130, 120);
int brute = items.Count(b => b.Overlaps(window));
var candidates = grid.Query(window);
int found = candidates.Count(i => items[i].Overlaps(window));

Console.WriteLine($"brute force: {items.Count} boxes tested, {brute} found");
Console.WriteLine($"grid: {grid.CellsTouched(window)} cells opened, {candidates.Count} boxes tested, {found} found");
Console.WriteLine($"{grid.CellCount} cells in use, {grid.Entries / (double)items.Count:0.00} cells per element");

sealed class GridIndex
{
    readonly double size;
    readonly Dictionary<(int, int), List<int>> cells = new();
    public GridIndex(double size) => this.size = size;
    public int Entries { get; private set; }
    public int CellCount => cells.Count;

    (int X0, int Y0, int X1, int Y1) Range(Box b) =>
        ((int)Math.Floor(b.X0 / size), (int)Math.Floor(b.Y0 / size), (int)Math.Floor(b.X1 / size), (int)Math.Floor(b.Y1 / size));

    public void Insert(int id, Box b)
    {
        var r = Range(b);
        for (int x = r.X0; x <= r.X1; x++)
            for (int y = r.Y0; y <= r.Y1; y++)
            {
                if (!cells.TryGetValue((x, y), out var list)) cells[(x, y)] = list = new();
                list.Add(id);
                Entries++;
            }
    }

    public int CellsTouched(Box b) { var r = Range(b); return (r.X1 - r.X0 + 1) * (r.Y1 - r.Y0 + 1); }

    public HashSet<int> Query(Box b)
    {
        var found = new HashSet<int>();                  // a set removes elements listed in several cells
        var r = Range(b);
        for (int x = r.X0; x <= r.X1; x++)
            for (int y = r.Y0; y <= r.Y1; y++)
                if (cells.TryGetValue((x, y), out var list)) found.UnionWith(list);
        return found;
    }
}

readonly record struct Box(double X0, double Y0, double X1, double Y1)
{
    public bool Overlaps(Box o) => X0 < o.X1 && o.X0 < X1 && Y0 < o.Y1 && o.Y0 < Y1;
}

static class Site
{
    // 20 000 elements between 0.2 m and 2 m across, spread over a 500 x 300 m site; the same every run
    public static List<Box> Boxes(int n)
    {
        uint s = 42;
        double Next() { s = s * 1664525 + 1013904223; return s / 4294967296.0; }
        var list = new List<Box>();
        for (int i = 0; i < n; i++)
        {
            double x = Next() * 500, y = Next() * 300, w = 0.2 + Next() * 1.8, h = 0.2 + Next() * 1.8;
            list.Add(new Box(x, y, x + w, y + h));
        }
        return list;
    }
}`, output: 'brute force: 20000 boxes tested, 100 found\ngrid: 35 cells opened, 136 boxes tested, 100 found\n6046 cells in use, 1.48 cells per element' },
      { type: 'p', text: 'The answer is the same, for about 1% of the tests. Choosing the cell size is the art: cells much smaller than the elements list each element many times, and cells much larger than the queries put too many elements in each cell. A good start is a cell a little bigger than a typical element. The weakness shows when the elements are unevenly spread: a plant room full of small fittings next to an empty car park. In the widget, the grid opens cells packed with the cluster and gains little there.' },
      { type: 'h2', text: 'Trees that adapt: quadtrees and BVHs' },
      { type: 'p', text: 'A **quadtree** (an **octree** in 3D) starts with one cell around everything and splits a cell into four only when it holds too many elements. Crowded areas get small cells, empty space stays one big cell, and a query walks down only the branches its box overlaps.' },
      { type: 'p', text: 'A **bounding volume hierarchy (BVH)** turns that round: instead of dividing space, it groups the elements. Each node stores the bounding box of everything below it; the root holds the whole model, and the leaves hold a few elements each. Build it top-down by sorting the elements along the longest axis of their box and splitting them in half. Node boxes may overlap, but every element is stored exactly once, so there is nothing to de-duplicate, and the tree adapts automatically to how the elements are spread. BVHs are what ray tracers, game engines and most modern clash engines use.' },
      { type: 'code', title: 'Bvh.cs', code: cs`
var items = Site.Boxes(20_000);
var bvh = new Bvh(items);
Console.WriteLine($"BVH: {bvh.Nodes} nodes, {bvh.Depth} levels");

var window = new Box(100, 100, 130, 120);
var (hits, visited, tested) = bvh.Query(window);
Console.WriteLine($"window: visited {visited} nodes, tested {tested} boxes, found {hits}");

// A pick ray in plan: from (0, 150) heading east, slightly north
double ox = 0, oy = 150, dx = 1, dy = 0.05;
var ray = bvh.Ray(ox, oy, dx, dy);
int bruteId = Enumerable.Range(0, items.Count).MinBy(i => Bvh.Slab(items[i], ox, oy, dx, dy));
Console.WriteLine($"ray: first hit element {ray.Id} at t = {ray.T:0.000}, visited {ray.Visited} nodes, tested {ray.Tested} boxes");
Console.WriteLine($"brute force agrees: {bruteId == ray.Id}");

sealed class Bvh
{
    sealed class Node { public Box B; public Node? L, R; public int[]? Items; }
    readonly List<Box> items;
    readonly Node root;
    public int Nodes { get; private set; }
    public int Depth { get; private set; }

    public Bvh(List<Box> items) { this.items = items; root = Build(Enumerable.Range(0, items.Count).ToArray(), 1); }

    Node Build(int[] ids, int depth)
    {
        Nodes++;
        Depth = Math.Max(Depth, depth);
        var b = new Box(ids.Min(i => items[i].X0), ids.Min(i => items[i].Y0), ids.Max(i => items[i].X1), ids.Max(i => items[i].Y1));
        if (ids.Length <= 4) return new Node { B = b, Items = ids };
        bool alongX = b.X1 - b.X0 >= b.Y1 - b.Y0;                 // split across the longest side
        var sorted = ids.OrderBy(i => alongX ? items[i].X0 + items[i].X1 : items[i].Y0 + items[i].Y1).ToArray();
        int mid = sorted.Length / 2;
        return new Node { B = b, L = Build(sorted[..mid], depth + 1), R = Build(sorted[mid..], depth + 1) };
    }

    public (int Hits, int Visited, int Tested) Query(Box q)
    {
        int hits = 0, visited = 0, tested = 0;
        var stack = new Stack<Node>();
        stack.Push(root);
        while (stack.Count > 0)
        {
            var n = stack.Pop();
            visited++;
            if (!n.B.Overlaps(q)) continue;                         // the whole branch is outside
            if (n.Items is null) { stack.Push(n.L!); stack.Push(n.R!); continue; }
            foreach (int i in n.Items) { tested++; if (items[i].Overlaps(q)) hits++; }
        }
        return (hits, visited, tested);
    }

    public (int Id, double T, int Visited, int Tested) Ray(double ox, double oy, double dx, double dy)
    {
        int best = -1, visited = 0, tested = 0;
        double bestT = double.PositiveInfinity;
        var stack = new Stack<Node>();
        stack.Push(root);
        while (stack.Count > 0)
        {
            var n = stack.Pop();
            visited++;
            if (Slab(n.B, ox, oy, dx, dy) >= bestT) continue;       // cannot beat the best hit so far
            if (n.Items is null)
            {
                // visit the nearer child first so a close hit prunes the other one
                double tl = Slab(n.L!.B, ox, oy, dx, dy), tr = Slab(n.R!.B, ox, oy, dx, dy);
                if (tl < tr) { stack.Push(n.R); stack.Push(n.L); } else { stack.Push(n.L); stack.Push(n.R); }
                continue;
            }
            foreach (int i in n.Items)
            {
                tested++;
                double t = Slab(items[i], ox, oy, dx, dy);
                if (t < bestT) { bestT = t; best = i; }
            }
        }
        return (best, bestT, visited, tested);
    }

    // Slab test: where the ray enters the box, or infinity if it misses
    public static double Slab(Box b, double ox, double oy, double dx, double dy)
    {
        double t0 = 0, t1 = double.PositiveInfinity;
        foreach (var (o, d, lo, hi) in new[] { (ox, dx, b.X0, b.X1), (oy, dy, b.Y0, b.Y1) })
        {
            if (Math.Abs(d) < 1e-15) { if (o < lo || o > hi) return double.PositiveInfinity; continue; }
            double a = (lo - o) / d, c = (hi - o) / d;
            t0 = Math.Max(t0, Math.Min(a, c));
            t1 = Math.Min(t1, Math.Max(a, c));
        }
        return t0 <= t1 ? t0 : double.PositiveInfinity;
    }
}

readonly record struct Box(double X0, double Y0, double X1, double Y1)
{
    public bool Overlaps(Box o) => X0 < o.X1 && o.X0 < X1 && Y0 < o.Y1 && o.Y0 < Y1;
}

static class Site
{
    public static List<Box> Boxes(int n)
    {
        uint s = 42;
        double Next() { s = s * 1664525 + 1013904223; return s / 4294967296.0; }
        var list = new List<Box>();
        for (int i = 0; i < n; i++)
        {
            double x = Next() * 500, y = Next() * 300, w = 0.2 + Next() * 1.8, h = 0.2 + Next() * 1.8;
            list.Add(new Box(x, y, x + w, y + h));
        }
        return list;
    }
}`, output: 'BVH: 15423 nodes, 14 levels\nwindow: visited 147 nodes, tested 114 boxes, found 100\nray: first hit element 3668 at t = 2.958, visited 47 nodes, tested 7 boxes\nbrute force agrees: True' },
      { type: 'p', text: 'The ray query shows the BVH’s other strength. It visits the nearer child first, and once it has a hit at distance t it skips every node whose box starts further away than t. A pick ray across 20 000 elements touches only a handful of boxes. The same structure answers 3D picking in a viewer with triangles at the leaves instead of element boxes.' },
      { type: 'h2', text: 'Clash pairs: the broad phase at scale' },
      { type: 'p', text: 'Clash detection asks for every pair of elements whose boxes overlap. Brute force tests n(n − 1) / 2 pairs: about 200 million for 20 000 elements, and 125 billion for half a million. With a grid, only elements that share a cell can overlap. A pair that shares several cells would be found several times, so each pair is reported only in the cell that holds the lower-left corner of the two boxes’ overlap.' },
      { type: 'code', title: 'ClashPairs.cs', code: cs`
var items = Site.Boxes(20_000);

long bruteTests = 0, bruteFound = 0;
for (int i = 0; i < items.Count; i++)
    for (int j = i + 1; j < items.Count; j++)
    {
        bruteTests++;
        if (items[i].Overlaps(items[j])) bruteFound++;
    }
Console.WriteLine($"brute force: {bruteTests:N0} pair tests, {bruteFound} overlapping pairs");

const double Size = 2.5;
var cells = new Dictionary<(int, int), List<int>>();
for (int i = 0; i < items.Count; i++)
{
    var b = items[i];
    for (int x = (int)Math.Floor(b.X0 / Size); x <= (int)Math.Floor(b.X1 / Size); x++)
        for (int y = (int)Math.Floor(b.Y0 / Size); y <= (int)Math.Floor(b.Y1 / Size); y++)
        {
            if (!cells.TryGetValue((x, y), out var list)) cells[(x, y)] = list = new();
            list.Add(i);
        }
}

long gridTests = 0, gridFound = 0;
foreach (var ((cx, cy), list) in cells)
    for (int a = 0; a < list.Count; a++)
        for (int b = a + 1; b < list.Count; b++)
        {
            gridTests++;
            Box p = items[list[a]], q = items[list[b]];
            if (!p.Overlaps(q)) continue;
            // report the pair only in the cell holding the lower-left corner of the overlap
            double ox = Math.Max(p.X0, q.X0), oy = Math.Max(p.Y0, q.Y0);
            if ((int)Math.Floor(ox / Size) == cx && (int)Math.Floor(oy / Size) == cy) gridFound++;
        }
Console.WriteLine($"grid: {gridTests:N0} pair tests, {gridFound} overlapping pairs, {(double)bruteTests / gridTests:0} times fewer tests");

readonly record struct Box(double X0, double Y0, double X1, double Y1)
{
    public bool Overlaps(Box o) => X0 < o.X1 && o.X0 < X1 && Y0 < o.Y1 && o.Y0 < Y1;
}

static class Site
{
    public static List<Box> Boxes(int n)
    {
        uint s = 42;
        double Next() { s = s * 1664525 + 1013904223; return s / 4294967296.0; }
        var list = new List<Box>();
        for (int i = 0; i < n; i++)
        {
            double x = Next() * 500, y = Next() * 300, w = 0.2 + Next() * 1.8, h = 0.2 + Next() * 1.8;
            list.Add(new Box(x, y, x + w, y + h));
        }
        return list;
    }
}`, output: 'brute force: 199,990,000 pair tests, 6498 overlapping pairs\ngrid: 35,297 pair tests, 6498 overlapping pairs, 5666 times fewer tests' },
      { type: 'table', head: ['Structure', 'Build', 'Strengths', 'Weaknesses'], rows: [
        ['Uniform grid', 'O(n), trivial', 'Very fast for evenly spread, similar-sized elements; easy to update when something moves', 'Wastes effort on clusters and on elements much bigger than a cell'],
        ['Quadtree / octree', 'O(n log n)', 'Adapts to clusters; simple to understand', 'Big elements straddle splits and get stored in many cells or high up'],
        ['BVH', 'O(n log n)', 'Each element stored once; excellent for rays and nearest queries; adapts to any distribution', 'Rebuilding after many edits costs time; overlapping node boxes'],
        ['R-tree', 'O(n log n)', 'A balanced BVH designed for inserting and deleting one element at a time; used by spatial databases', 'More complex to implement well']
      ] },
      { type: 'note', kind: 'tip', text: 'Do not hand-roll everything. .NET has no built-in spatial index, but NetTopologySuite includes an STRtree (a packed R-tree) and a quadtree, and the Revit API gives you BoundingBoxIntersectsFilter and ElementIntersectsSolidFilter, which use Revit’s own index. Writing your own pays off when you need a 3D index over custom geometry, such as your own clash engine.' },
      { type: 'quiz', question: 'A model has 100 000 small fittings packed into two plant rooms and almost nothing elsewhere. Which index suits it better, and why?', options: ['A BVH or quadtree, because it adapts its cells to where the elements are; a uniform grid sized for the whole site puts thousands of fittings in each crowded cell', 'A uniform grid, because it is always fastest', 'Brute force, because indexes do not help with clusters', 'Any index works the same for any distribution'], answer: 0, explain: 'Adaptive structures split finely where elements crowd together and stay coarse elsewhere; a fixed grid cannot do both.' },
      { type: 'quiz', question: 'Why does a grid-based clash search need a rule such as “report the pair only in the cell holding the corner of the overlap”?', options: ['Two elements that both span several cells meet in each of them, so without a rule the same clash is reported several times', 'To make the search faster than brute force', 'Because cells cannot hold more than two elements', 'To find clashes between elements in different cells'], answer: 0, explain: 'The rule picks exactly one of the shared cells, the one containing the corner of the overlap, so each pair is counted once without a set of pairs already seen.' },
      { type: 'exercise', task: 'Find the element nearest to a point using a grid. Put the centres of the 20 000 Site.Boxes into a 5 m grid, then search rings of cells around the query point (250.3, 150.7): first its own cell, then the 8 around it, then the next ring, and so on. Stop once the best distance found is no more than k × 5 m after finishing ring k, because every cell not yet searched is at least that far away. Print the nearest element, its distance, how many centres were examined, and whether brute force agrees.', hint: 'Ring k is every cell (cx + i, cy + j) with max(|i|, |j|) = k. The query point lies inside its own cell, so any cell in ring k + 1 or beyond is at least k cell sizes away from it.', solution: cs`
var items = Site.Boxes(20_000);
var centres = items.Select(b => ((b.X0 + b.X1) / 2, (b.Y0 + b.Y1) / 2)).ToList();
const double Size = 5;
var grid = new Dictionary<(int, int), List<int>>();
for (int i = 0; i < centres.Count; i++)
{
    var key = ((int)Math.Floor(centres[i].Item1 / Size), (int)Math.Floor(centres[i].Item2 / Size));
    if (!grid.TryGetValue(key, out var list)) grid[key] = list = new();
    list.Add(i);
}

double qx = 250.3, qy = 150.7;
int cx = (int)Math.Floor(qx / Size), cy = (int)Math.Floor(qy / Size);
int best = -1, examined = 0;
double bestD = double.PositiveInfinity;
for (int k = 0; ; k++)
{
    for (int i = -k; i <= k; i++)
        for (int j = -k; j <= k; j++)
        {
            if (Math.Max(Math.Abs(i), Math.Abs(j)) != k) continue;   // only the ring itself
            if (!grid.TryGetValue((cx + i, cy + j), out var list)) continue;
            foreach (int id in list)
            {
                examined++;
                double d = Math.Sqrt(Math.Pow(centres[id].Item1 - qx, 2) + Math.Pow(centres[id].Item2 - qy, 2));
                if (d < bestD) { bestD = d; best = id; }
            }
        }
    if (bestD <= k * Size) break;
}
int brute = Enumerable.Range(0, centres.Count).MinBy(i => Math.Pow(centres[i].Item1 - qx, 2) + Math.Pow(centres[i].Item2 - qy, 2));
Console.WriteLine($"nearest element {best}, {bestD:0.000} m away");
Console.WriteLine($"examined {examined} of {centres.Count} centres; brute force agrees: {brute == best}");

readonly record struct Box(double X0, double Y0, double X1, double Y1);

static class Site
{
    public static List<Box> Boxes(int n)
    {
        uint s = 42;
        double Next() { s = s * 1664525 + 1013904223; return s / 4294967296.0; }
        var list = new List<Box>();
        for (int i = 0; i < n; i++)
        {
            double x = Next() * 500, y = Next() * 300, w = 0.2 + Next() * 1.8, h = 0.2 + Next() * 1.8;
            list.Add(new Box(x, y, x + w, y + h));
        }
        return list;
    }
}`, output: 'nearest element 17464, 1.040 m away\nexamined 34 of 20000 centres; brute force agrees: True' }
    ],
    keyPoints: [
      'A spatial index stores bounding boxes so a query only tests elements near it, instead of all n.',
      'A uniform grid is simple and fast for evenly spread elements; pick a cell a little bigger than a typical element.',
      'Quadtrees and octrees split space where elements crowd; BVHs group elements and store each one exactly once.',
      'Ray queries on a BVH visit the nearer child first and skip nodes further away than the best hit so far.',
      'Grid-based clash search needs a de-duplication rule, such as reporting a pair only in the cell holding the corner of its overlap.'
    ]
  },
  // ------------------------------------------------------------------ 6
  {
    slug: 'mini-geometry-engine',
    title: 'Putting it together: a mini room-and-wall geometry engine',
    summary: 'The capstone: wall centrelines and thicknesses in, mitred wall outlines, rooms, areas, volumes, openings and point-in-room queries out, using the maths of the whole course.',
    minutes: 18,
    blocks: [
      { type: 'p', text: 'This lesson builds the core of what a BIM authoring tool does every time you draw a wall: turn a few centrelines and a thickness into wall outlines, find the rooms they enclose, and report areas, volumes and finishes. Almost every earlier module appears: vectors and the cross product, line intersection, polygon area and centroid, point-in-polygon, extrusion to a mesh and signed-tetrahedron volumes, and the robust-geometry habits of the first lesson in this module.' },
      { type: 'widget', name: 'room-engine' },
      { type: 'h2', text: 'Step 1: offsetting a centreline loop' },
      { type: 'p', text: 'Walls are drawn along their centrelines. The faces of the walls are those lines moved sideways by half the thickness. For a closed loop of walls going counter-clockwise, the left of each edge is inside, so moving every edge to its left by d gives the inside faces, and by −d the outside faces. Each corner is where two neighbouring offset lines meet: the line intersection from the lines module. This gives clean **mitred** corners, at convex and concave corners alike.' },
      { type: 'code', title: 'Offset.cs', code: cs`
// The outer walls of an L-shaped house, as a counter-clockwise centreline loop
var centre = new List<V2> { new(0, 0), new(10, 0), new(10, 4), new(6, 4), new(6, 7), new(0, 7) };
const double T = 0.3;

var outside = Geo.Offset(centre, -T / 2);
var inside = Geo.Offset(centre, T / 2);
Console.WriteLine($"outside face: {string.Join(" ", outside)}");
Console.WriteLine($"inside face:  {string.Join(" ", inside)}");

double ring = Geo.Area(outside) - Geo.Area(inside);
Console.WriteLine($"wall footprint {ring:0.000} m2; centreline length x thickness = {Geo.Perimeter(centre) * T:0.000} m2");

static class Geo
{
    // Move each edge d to its left, then meet each pair of neighbouring edges again
    public static List<V2> Offset(IList<V2> loop, double d)
    {
        int n = loop.Count;
        var result = new List<V2>();
        for (int i = 0; i < n; i++)
        {
            V2 a0 = loop[(i + n - 1) % n], a1 = loop[i], b1 = loop[(i + 1) % n];
            V2 u = a1 - a0, v = b1 - a1;                        // edge into the corner, edge out of it
            V2 pa = a0 + Left(u) * d, pb = a1 + Left(v) * d;    // a point on each offset line
            double den = Cross(u, v);
            if (Math.Abs(den) < 1e-12) { result.Add(pb); continue; }    // straight on: no corner
            result.Add(pa + u * (Cross(pb - pa, v) / den));
        }
        return result;
    }

    public static V2 Left(V2 v) => new V2(-v.Y, v.X) * (1 / v.Length);
    public static double Cross(V2 a, V2 b) => a.X * b.Y - a.Y * b.X;

    public static double Area(IList<V2> p)
    {
        double a = 0;
        for (int i = 0; i < p.Count; i++) a += Cross(p[i], p[(i + 1) % p.Count]);
        return a / 2;
    }

    public static double Perimeter(IList<V2> p) =>
        Enumerable.Range(0, p.Count).Sum(i => (p[(i + 1) % p.Count] - p[i]).Length);
}

readonly record struct V2(double X, double Y)
{
    public static V2 operator +(V2 a, V2 b) => new(a.X + b.X, a.Y + b.Y);
    public static V2 operator -(V2 a, V2 b) => new(a.X - b.X, a.Y - b.Y);
    public static V2 operator *(V2 v, double k) => new(v.X * k, v.Y * k);
    public double Length => Math.Sqrt(X * X + Y * Y);
    static string F(double v) => Math.Abs(v) < 5e-4 ? "0" : v.ToString("0.###");
    public override string ToString() => $"({F(X)}, {F(Y)})";
}`, output: 'outside face: (-0.15, -0.15) (10.15, -0.15) (10.15, 4.15) (6.15, 4.15) (6.15, 7.15) (-0.15, 7.15)\ninside face:  (0.15, 0.15) (9.85, 0.15) (9.85, 3.85) (5.85, 3.85) (5.85, 6.85) (0.15, 6.85)\nwall footprint 10.200 m2; centreline length x thickness = 10.200 m2' },
      { type: 'p', text: 'The wall footprint, measured as outside area minus inside area, equals the centreline length times the thickness exactly. That is a property of mitred offsets: the extra area at the convex corners is cancelled by the area missing at the concave corner. Checks like this are cheap and catch bugs early. A wrong-way loop or a missed corner breaks the equality.' },
      { type: 'h2', text: 'Step 2: rooms, areas and the schedule' },
      { type: 'p', text: 'A room is bounded by wall centrelines too. Here an internal wall at x = 4 splits the house into two rooms; each room’s centreline loop, pushed inwards by half the wall thickness, is the room’s finished outline. Its area is the shoelace formula, its perimeter is the length of skirting, and its centroid is where the room tag goes.' },
      { type: 'code', title: 'Rooms.cs', code: cs`
const double T = 0.3, Height = 3.0;
var rooms = new (string Name, List<V2> Centreline)[]
{
    ("Living", new() { new(0, 0), new(4, 0), new(4, 7), new(0, 7) }),
    ("Kitchen", new() { new(4, 0), new(10, 0), new(10, 4), new(6, 4), new(6, 7), new(4, 7) }),
};

Console.WriteLine($"{"room",-8} {"area",8} {"perimeter",10} {"volume",8}  tag at");
double total = 0;
foreach (var (name, cl) in rooms)
{
    var outline = Geo.Offset(cl, T / 2);
    double area = Geo.Area(outline);
    total += area;
    Console.WriteLine($"{name,-8} {area,8:0.000} {Geo.Perimeter(outline),10:0.000} {area * Height,8:0.000}  {Geo.Centroid(outline)}");
}

var gross = Geo.Area(Geo.Offset(new List<V2> { new(0, 0), new(10, 0), new(10, 4), new(6, 4), new(6, 7), new(0, 7) }, -T / 2));
Console.WriteLine($"rooms {total:0.000} m2 + walls {gross - total:0.000} m2 = gross {gross:0.000} m2");

static class Geo
{
    public static List<V2> Offset(IList<V2> loop, double d)
    {
        int n = loop.Count;
        var result = new List<V2>();
        for (int i = 0; i < n; i++)
        {
            V2 a0 = loop[(i + n - 1) % n], a1 = loop[i], b1 = loop[(i + 1) % n];
            V2 u = a1 - a0, v = b1 - a1;
            V2 pa = a0 + Left(u) * d, pb = a1 + Left(v) * d;
            double den = Cross(u, v);
            if (Math.Abs(den) < 1e-12) { result.Add(pb); continue; }
            result.Add(pa + u * (Cross(pb - pa, v) / den));
        }
        return result;
    }

    public static V2 Left(V2 v) => new V2(-v.Y, v.X) * (1 / v.Length);
    public static double Cross(V2 a, V2 b) => a.X * b.Y - a.Y * b.X;

    public static double Area(IList<V2> p)
    {
        double a = 0;
        for (int i = 0; i < p.Count; i++) a += Cross(p[i], p[(i + 1) % p.Count]);
        return a / 2;
    }

    public static double Perimeter(IList<V2> p) =>
        Enumerable.Range(0, p.Count).Sum(i => (p[(i + 1) % p.Count] - p[i]).Length);

    // Area-weighted centre of a polygon (the polygons module)
    public static V2 Centroid(IList<V2> p)
    {
        double a = Area(p), cx = 0, cy = 0;
        for (int i = 0; i < p.Count; i++)
        {
            V2 s = p[i], t = p[(i + 1) % p.Count];
            double k = Cross(s, t);
            cx += (s.X + t.X) * k;
            cy += (s.Y + t.Y) * k;
        }
        return new V2(cx / (6 * a), cy / (6 * a));
    }
}

readonly record struct V2(double X, double Y)
{
    public static V2 operator +(V2 a, V2 b) => new(a.X + b.X, a.Y + b.Y);
    public static V2 operator -(V2 a, V2 b) => new(a.X - b.X, a.Y - b.Y);
    public static V2 operator *(V2 v, double k) => new(v.X * k, v.Y * k);
    public double Length => Math.Sqrt(X * X + Y * Y);
    static string F(double v) => Math.Abs(v) < 5e-4 ? "0" : v.ToString("0.###");
    public override string ToString() => $"({F(X)}, {F(Y)})";
}`, output: 'room         area  perimeter   volume  tag at\nLiving     24.790     20.800   74.370  (2, 3.5)\nKitchen    26.190     24.800   78.570  (6.611, 2.652)\nrooms 50.980 m2 + walls 12.210 m2 = gross 63.190 m2' },
      { type: 'p', text: 'The schedule balances: room areas plus wall footprint equals the gross area to the last digit. The kitchen’s L-shape needs nothing special. The same offset handles its concave corner, and the centroid formula puts its tag inside the room’s centre of area.' },
      { type: 'h2', text: 'Step 3: extruding to a solid' },
      { type: 'p', text: 'Clash detection, sections and quantity take-off work on solids. Extrude each room outline to the storey height with the prism builder from the meshes lesson, check that every edge is paired, and measure its volume with signed tetrahedra. The mesh volume must match area × height; if it does not, the outline was clockwise or self-intersecting.' },
      { type: 'code', title: 'Extrude.cs', code: cs`
var kitchen = new (double X, double Y)[] { (4.15, 0.15), (9.85, 0.15), (9.85, 3.85), (5.85, 3.85), (5.85, 6.85), (4.15, 6.85) };
var mesh = Mesh.Prism(kitchen, 3.0);

var edges = new Dictionary<(int, int), int>();
foreach (var t in mesh.F)
    foreach (var e in new[] { (t.A, t.B), (t.B, t.C), (t.C, t.A) })
        edges[e] = edges.GetValueOrDefault(e) + 1;
bool closed = edges.Keys.All(e => edges.GetValueOrDefault((e.Item2, e.Item1)) == 1);

double volume = mesh.F.Sum(t => V3.Dot(mesh.V[t.A], V3.Cross(mesh.V[t.B], mesh.V[t.C]))) / 6;
double area = 0;
for (int i = 0; i < kitchen.Length; i++)
{
    var (x0, y0) = kitchen[i]; var (x1, y1) = kitchen[(i + 1) % kitchen.Length];
    area += x0 * y1 - x1 * y0;
}
area /= 2;

Console.WriteLine($"{mesh.V.Count} vertices, {mesh.F.Count} triangles, every edge paired: {closed}");
Console.WriteLine($"mesh volume {volume:0.000} m3, area x height {area * 3:0.000} m3");

sealed class Mesh
{
    public readonly List<V3> V = new();
    public readonly List<(int A, int B, int C)> F = new();   // counter-clockwise seen from outside

    public static Mesh Box(double lx, double ly, double lz) =>
        Prism(new[] { (0.0, 0.0), (lx, 0.0), (lx, ly), (0.0, ly) }, lz);

    // A counter-clockwise footprint extruded up by h (floor and roof fanned from corner 0)
    public static Mesh Prism((double X, double Y)[] poly, double h)
    {
        var m = new Mesh();
        int n = poly.Length;
        foreach (var (x, y) in poly) m.V.Add(new V3(x, y, 0));
        foreach (var (x, y) in poly) m.V.Add(new V3(x, y, h));
        for (int k = 1; k < n - 1; k++)
        {
            m.F.Add((0, k + 1, k));                 // floor, facing down
            m.F.Add((n, n + k, n + k + 1));         // roof, facing up
        }
        for (int i = 0; i < n; i++)
        {
            int j = (i + 1) % n;
            m.F.Add((i, j, j + n));                 // each wall as two triangles
            m.F.Add((i, j + n, i + n));
        }
        return m;
    }

    public static Mesh Pyramid(double b, double h)
    {
        var m = new Mesh();
        m.V.AddRange(new V3[] { new(0, 0, 0), new(b, 0, 0), new(b, b, 0), new(0, b, 0), new(b / 2, b / 2, h) });
        m.F.AddRange(new[] { (0, 1, 4), (1, 2, 4), (2, 3, 4), (3, 0, 4), (0, 2, 1), (0, 3, 2) });
        return m;
    }

    // (b - a) x (c - a): points out of the solid, and its length is twice the triangle's area
    public V3 Normal((int A, int B, int C) t) => V3.Cross(V[t.B] - V[t.A], V[t.C] - V[t.A]);
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
    static string F(double v) => Math.Abs(v) < 5e-4 ? "0" : v.ToString("0.###");
    public override string ToString() => $"({F(X)}, {F(Y)}, {F(Z)})";
}`, output: '12 vertices, 20 triangles, every edge paired: True\nmesh volume 78.570 m3, area x height 78.570 m3' },
      { type: 'note', kind: 'info', text: 'The prism builder fans the floor and roof from corner 0, which is only correct for convex outlines. It happens to work for this L-shape because corner 0 can see every other corner. A real engine triangulates the outline properly with ear clipping (the polygons module) before extruding.' },
      { type: 'h2', text: 'Step 4: the engine' },
      { type: 'p', text: 'The final program puts the pieces behind a small model: walls with thicknesses and openings, rooms found from centreline loops, and queries. It answers the questions a BIM tool answers all day: what are the room areas and volumes, how much wall finish does each room need after doors and windows are taken off, and which room is a given piece of furniture in.' },
      { type: 'code', title: 'Engine.cs', code: cs`
var model = new Model(thickness: 0.3, height: 3.0);
model.AddRoom("Living", new(0, 0), new(4, 0), new(4, 7), new(0, 7));
model.AddRoom("Kitchen", new(4, 0), new(10, 0), new(10, 4), new(6, 4), new(6, 7), new(4, 7));
model.AddOpening("door, internal", width: 0.9, height: 2.1, "Living", "Kitchen");
model.AddOpening("front door", width: 1.0, height: 2.1, "Living");
model.AddOpening("window", width: 1.5, height: 1.2, "Kitchen");
model.AddOpening("window", width: 1.2, height: 1.2, "Living");

Console.WriteLine($"{"room",-8} {"floor m2",9} {"volume m3",10} {"wall finish m2",15}");
foreach (var r in model.Rooms)
    Console.WriteLine($"{r.Name,-8} {r.Area,9:0.000} {r.Area * model.Height,10:0.000} {model.WallFinish(r),15:0.000}");

foreach (var (name, p) in new (string, V2)[] { ("sofa", new(2, 3)), ("fridge", new(8.5, 2)), ("table", new(5, 5.5)), ("bin", new(8, 6)) })
    Console.WriteLine($"{name,-6} at {p} is in: {model.RoomAt(p)?.Name ?? "no room"}");

sealed record Room(string Name, List<V2> Outline, double Area, double Perimeter);

sealed class Model
{
    readonly List<(double Area, string[] Rooms)> openings = new();
    public List<Room> Rooms { get; } = new();
    public double Thickness { get; }
    public double Height { get; }
    public Model(double thickness, double height) { Thickness = thickness; Height = height; }

    public void AddRoom(string name, params V2[] centreline)
    {
        var outline = Geo.Offset(centreline, Thickness / 2);
        Rooms.Add(new Room(name, outline, Geo.Area(outline), Geo.Perimeter(outline)));
    }

    // An opening takes area off the wall finish of every room it opens into
    public void AddOpening(string name, double width, double height, params string[] rooms) =>
        openings.Add((width * height, rooms));

    public double WallFinish(Room r) =>
        r.Perimeter * Height - openings.Where(o => o.Rooms.Contains(r.Name)).Sum(o => o.Area);

    // Crossing test: count edges that a ray going right from p crosses
    public Room? RoomAt(V2 p) => Rooms.FirstOrDefault(r =>
    {
        bool inside = false;
        var o = r.Outline;
        for (int i = 0, j = o.Count - 1; i < o.Count; j = i++)
            if ((o[i].Y > p.Y) != (o[j].Y > p.Y) &&
                p.X < o[j].X + (p.Y - o[j].Y) * (o[i].X - o[j].X) / (o[i].Y - o[j].Y))
                inside = !inside;
        return inside;
    });
}

static class Geo
{
    public static List<V2> Offset(IList<V2> loop, double d)
    {
        int n = loop.Count;
        var result = new List<V2>();
        for (int i = 0; i < n; i++)
        {
            V2 a0 = loop[(i + n - 1) % n], a1 = loop[i], b1 = loop[(i + 1) % n];
            V2 u = a1 - a0, v = b1 - a1;
            V2 pa = a0 + Left(u) * d, pb = a1 + Left(v) * d;
            double den = Cross(u, v);
            if (Math.Abs(den) < 1e-12) { result.Add(pb); continue; }
            result.Add(pa + u * (Cross(pb - pa, v) / den));
        }
        return result;
    }

    public static V2 Left(V2 v) => new V2(-v.Y, v.X) * (1 / v.Length);
    public static double Cross(V2 a, V2 b) => a.X * b.Y - a.Y * b.X;

    public static double Area(IList<V2> p)
    {
        double a = 0;
        for (int i = 0; i < p.Count; i++) a += Cross(p[i], p[(i + 1) % p.Count]);
        return a / 2;
    }

    public static double Perimeter(IList<V2> p) =>
        Enumerable.Range(0, p.Count).Sum(i => (p[(i + 1) % p.Count] - p[i]).Length);
}

readonly record struct V2(double X, double Y)
{
    public static V2 operator +(V2 a, V2 b) => new(a.X + b.X, a.Y + b.Y);
    public static V2 operator -(V2 a, V2 b) => new(a.X - b.X, a.Y - b.Y);
    public static V2 operator *(V2 v, double k) => new(v.X * k, v.Y * k);
    public double Length => Math.Sqrt(X * X + Y * Y);
    static string F(double v) => Math.Abs(v) < 5e-4 ? "0" : v.ToString("0.###");
    public override string ToString() => $"({F(X)}, {F(Y)})";
}`, output: 'room      floor m2  volume m3  wall finish m2\nLiving      24.790     74.370          56.970\nKitchen     26.190     78.570          70.710\nsofa   at (2, 3) is in: Living\nfridge at (8.5, 2) is in: Kitchen\ntable  at (5, 5.5) is in: Kitchen\nbin    at (8, 6) is in: no room' },
      { type: 'p', text: 'The table at (5, 5.5) sits in the kitchen’s upper arm and the bin at (8, 6) is outside the L, in no room at all, which a real tool would flag. The internal door comes off both rooms’ wall finish, because both sides get painted.' },
      { type: 'h2', text: 'Where a real engine goes next' },
      { type: 'ul', items: [
        '**Room detection from walls.** Here each room’s loop is given. Real tools find the loops themselves: split all wall centrelines at their intersections into a planar graph, then walk it always taking the next edge clockwise, which traces each enclosed face once (a half-edge face walk).',
        '**Wall joins.** T-junctions, walls of different thicknesses and walls meeting at shallow angles (where a mitre would shoot far out) need their own join rules; this is one of the most special-cased parts of every BIM tool.',
        '**Robust booleans.** Cutting openings into wall solids, and joining walls with floors, needs polygon and solid booleans built on exact predicates, as in the first lesson of this module.',
        '**Spatial indexing.** With thousands of rooms and elements, the point-in-room query goes through a grid or BVH before any polygon test.',
        '**Levels and georeferencing.** Each storey has its own elevation, and the whole model sits on the site through the shared-coordinates transform.'
      ] },
      { type: 'quiz', question: 'The wall footprint computed as “outside area minus inside area” no longer equals “centreline length × thickness” after you edit the loop. What is the most likely cause?', options: ['The loop is no longer counter-clockwise or no longer simple (it crosses itself), so the offsets go the wrong way or overlap', 'The thickness is too small', 'Doubles cannot represent 0.3', 'The rooms are too large'], answer: 0, explain: 'For a simple counter-clockwise loop with mitred corners the two always agree. A clockwise or self-intersecting loop breaks the equality, which is exactly why the check is worth running.' },
      { type: 'quiz', question: 'A room outline is extruded to a mesh, and its signed-tetrahedron volume comes out negative. What happened?', options: ['The outline was clockwise, so every face normal points inwards; reverse the outline before extruding', 'The room is below ground level', 'The mesh has too many triangles', 'Volumes are always negative for L-shapes'], answer: 0, explain: 'The sign of the volume follows the winding. A clockwise outline makes an inside-out solid, which is also why its normals and clash tests would be wrong.' },
      { type: 'exercise', task: 'Add a bedroom: move the internal wall so the Living room’s centreline loop runs from x = 0 to 3.5, and add a new internal wall along y = 4 inside the Living room, splitting it into “Living” (y from 0 to 4) and “Bedroom” (y from 4 to 7). The Kitchen loop now starts at x = 3.5. Print each room’s area and perimeter, and check that the three rooms plus the wall footprint add up to the gross area.', hint: 'Living is (0, 0), (3.5, 0), (3.5, 4), (0, 4); Bedroom is (0, 4), (3.5, 4), (3.5, 7), (0, 7); Kitchen is (3.5, 0), (10, 0), (10, 4), (6, 4), (6, 7), (3.5, 7). Reuse Geo.Offset, Geo.Area and Geo.Perimeter.', solution: cs`
const double T = 0.3;
var rooms = new (string Name, List<V2> Centreline)[]
{
    ("Living", new() { new(0, 0), new(3.5, 0), new(3.5, 4), new(0, 4) }),
    ("Bedroom", new() { new(0, 4), new(3.5, 4), new(3.5, 7), new(0, 7) }),
    ("Kitchen", new() { new(3.5, 0), new(10, 0), new(10, 4), new(6, 4), new(6, 7), new(3.5, 7) }),
};

double total = 0;
foreach (var (name, cl) in rooms)
{
    var outline = Geo.Offset(cl, T / 2);
    double area = Geo.Area(outline);
    total += area;
    Console.WriteLine($"{name,-8} area {area,7:0.000} m2, perimeter {Geo.Perimeter(outline),6:0.000} m");
}

var outer = new List<V2> { new(0, 0), new(10, 0), new(10, 4), new(6, 4), new(6, 7), new(0, 7) };
double gross = Geo.Area(Geo.Offset(outer, -T / 2));
Console.WriteLine($"rooms {total:0.000} + walls {gross - total:0.000} = gross {gross:0.000} m2");

static class Geo
{
    public static List<V2> Offset(IList<V2> loop, double d)
    {
        int n = loop.Count;
        var result = new List<V2>();
        for (int i = 0; i < n; i++)
        {
            V2 a0 = loop[(i + n - 1) % n], a1 = loop[i], b1 = loop[(i + 1) % n];
            V2 u = a1 - a0, v = b1 - a1;
            V2 pa = a0 + Left(u) * d, pb = a1 + Left(v) * d;
            double den = Cross(u, v);
            if (Math.Abs(den) < 1e-12) { result.Add(pb); continue; }
            result.Add(pa + u * (Cross(pb - pa, v) / den));
        }
        return result;
    }

    public static V2 Left(V2 v) => new V2(-v.Y, v.X) * (1 / v.Length);
    public static double Cross(V2 a, V2 b) => a.X * b.Y - a.Y * b.X;

    public static double Area(IList<V2> p)
    {
        double a = 0;
        for (int i = 0; i < p.Count; i++) a += Cross(p[i], p[(i + 1) % p.Count]);
        return a / 2;
    }

    public static double Perimeter(IList<V2> p) =>
        Enumerable.Range(0, p.Count).Sum(i => (p[(i + 1) % p.Count] - p[i]).Length);
}

readonly record struct V2(double X, double Y)
{
    public static V2 operator +(V2 a, V2 b) => new(a.X + b.X, a.Y + b.Y);
    public static V2 operator -(V2 a, V2 b) => new(a.X - b.X, a.Y - b.Y);
    public static V2 operator *(V2 v, double k) => new(v.X * k, v.Y * k);
    public double Length => Math.Sqrt(X * X + Y * Y);
    static string F(double v) => Math.Abs(v) < 5e-4 ? "0" : v.ToString("0.###");
    public override string ToString() => $"({F(X)}, {F(Y)})";
}`, output: 'Living   area  11.840 m2, perimeter 13.800 m\nBedroom  area   8.640 m2, perimeter 11.800 m\nKitchen  area  29.540 m2, perimeter 25.800 m\nrooms 50.020 + walls 13.170 = gross 63.190 m2' }
    ],
    keyPoints: [
      'Wall faces are centrelines offset by half the thickness; neighbouring offset lines meet at mitred corners.',
      'For a simple counter-clockwise loop, outside area minus inside area equals centreline length × thickness: a cheap correctness check.',
      'Rooms are centreline loops pushed inwards; shoelace gives the area, the perimeter gives skirting, the centroid places the tag.',
      'Extruding to a closed mesh and comparing the tetrahedron volume with area × height catches winding errors.',
      'A small model of walls, rooms and openings answers schedules, finishes and point-in-room queries; real engines add room detection, join rules, robust booleans and spatial indexes.'
    ]
  }
];
