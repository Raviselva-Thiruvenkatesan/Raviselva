import { Lesson } from '../learn.types';
import { cs } from '../csharp/cs';

export const GEOMETRY_SOLIDS: Lesson[] = [
  // ------------------------------------------------------------------ 1
  {
    slug: 'bounding-boxes',
    title: 'Bounding boxes: AABB and OBB',
    summary: 'Wrap any element in a box that is quick to build and quick to test: the world-aligned AABB and the element’s own OBB, how each is built, and when the cheap one gives false alarms.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'A wall, a duct or a whole family instance can have thousands of triangles. Before doing anything expensive with it (testing it for clashes, drawing it, picking it with the mouse), a program first asks a much cheaper question: could it possibly be involved? The answer comes from a **bounding box**, the smallest box that contains the element.' },
      { type: 'p', text: 'There are two kinds. An **axis-aligned bounding box (AABB)** has its edges along the world X, Y and Z axes, so six numbers describe it. An **oriented bounding box (OBB)** turns with the element and fits it tightly, but needs a centre, three axes and three half sizes. Turn the beam in the widget and watch the difference.' },
      { type: 'widget', name: 'bbox' },
      { type: 'h2', text: 'The AABB: six numbers' },
      { type: 'p', text: 'An AABB is just the minimum and maximum of every coordinate: **Min = (min x, min y, min z)** and **Max = (max x, max y, max z)** over all the element’s points. Two AABBs overlap only if their intervals overlap on all three axes, which is six comparisons and no arithmetic at all. That is why every BIM program, game engine and spatial index uses them for the first, rough test.' },
      { type: 'code', title: 'Aabb.cs', code: cs`
var beam = Aabb.Of(new V3(0, 0, 3), new V3(6, 0, 3), new V3(6, 0.3, 3.5), new V3(0, 0.3, 3.5));
var duct = new Aabb(new V3(2, -1, 3.2), new V3(2.4, 2, 3.6));
var pipe = new Aabb(new V3(2, -1, 3.6), new V3(2.2, 2, 3.8));

Console.WriteLine($"beam: {beam}, size {beam.Size}");
Console.WriteLine($"beam and duct overlap: {beam.Overlaps(duct)}");
Console.WriteLine($"beam and pipe overlap: {beam.Overlaps(pipe)}");
Console.WriteLine($"beam and pipe within 0.15 m: {beam.Inflate(0.15).Overlaps(pipe)}");
Console.WriteLine($"box around beam and duct: {Aabb.Union(beam, duct)}");

readonly record struct Aabb(V3 Min, V3 Max)
{
    public static Aabb Of(params V3[] pts)
    {
        V3 lo = pts[0], hi = pts[0];
        foreach (var p in pts)
        {
            lo = new(Math.Min(lo.X, p.X), Math.Min(lo.Y, p.Y), Math.Min(lo.Z, p.Z));
            hi = new(Math.Max(hi.X, p.X), Math.Max(hi.Y, p.Y), Math.Max(hi.Z, p.Z));
        }
        return new(lo, hi);
    }

    // Overlap on X, on Y and on Z. Boxes that only touch do not count.
    public bool Overlaps(Aabb o) =>
        Min.X < o.Max.X && o.Min.X < Max.X &&
        Min.Y < o.Max.Y && o.Min.Y < Max.Y &&
        Min.Z < o.Max.Z && o.Min.Z < Max.Z;

    public Aabb Inflate(double d) => new(Min - new V3(d, d, d), Max + new V3(d, d, d));
    public static Aabb Union(Aabb a, Aabb b) => Of(a.Min, a.Max, b.Min, b.Max);
    public V3 Size => Max - Min;
    public override string ToString() => $"{Min} .. {Max}";
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
}`, output: 'beam: (0, 0, 3) .. (6, 0.3, 3.5), size (6, 0.3, 0.5)\nbeam and duct overlap: True\nbeam and pipe overlap: False\nbeam and pipe within 0.15 m: True\nbox around beam and duct: (0, -1, 3) .. (6, 2, 3.6)' },
      { type: 'p', text: 'Three tools in a few lines: **Overlaps** for the clash test, **Inflate** for clearance checks (a pipe that must stay 150 mm from the beam), and **Union** for the box around a group of elements, a whole storey or a whole model. The strict `<` means boxes that only touch, like a beam sitting on a column, are not reported; the clash detection lesson comes back to that choice.' },
      { type: 'h2', text: 'What turning does to an AABB' },
      { type: 'p', text: 'An AABB is only tight while the element runs along the world axes. Turn it, and the box has to grow to keep containing it. For a beam of length L and width W turned by θ in plan, the AABB is **L·|cos θ| + W·|sin θ|** wide and **L·|sin θ| + W·|cos θ|** deep. A thin 6 m beam at 45° has an AABB about eleven times its own area, all of it empty space that can raise false alarms.' },
      { type: 'p', text: 'To get the AABB of a transformed box you can transform all eight corners and take the min and max. There is a shortcut: the new half sizes are the absolute values of the rotation matrix times the old half sizes, **h′ = |R| · h**.' },
      { type: 'code', title: 'TurnedBox.cs', code: cs`
var half = new V3(3, 0.15, 0.25);            // a 6 x 0.3 x 0.5 beam, centred on its origin

foreach (double deg in new[] { 0.0, 30, 45, 90 })
{
    var r = RotZ(deg);

    // 1: turn all 8 corners and keep the largest |x|, |y| and |z|
    double hx = 0, hy = 0, hz = 0;
    for (int i = 0; i < 8; i++)
    {
        var c = new V3(i % 2 == 0 ? -half.X : half.X, i / 2 % 2 == 0 ? -half.Y : half.Y, i < 4 ? -half.Z : half.Z);
        var p = Apply(r, c);
        hx = Math.Max(hx, Math.Abs(p.X)); hy = Math.Max(hy, Math.Abs(p.Y)); hz = Math.Max(hz, Math.Abs(p.Z));
    }

    // 2: the shortcut, |R| times the half sizes
    var h = new V3(
        Math.Abs(r[0, 0]) * half.X + Math.Abs(r[0, 1]) * half.Y + Math.Abs(r[0, 2]) * half.Z,
        Math.Abs(r[1, 0]) * half.X + Math.Abs(r[1, 1]) * half.Y + Math.Abs(r[1, 2]) * half.Z,
        Math.Abs(r[2, 0]) * half.X + Math.Abs(r[2, 1]) * half.Y + Math.Abs(r[2, 2]) * half.Z);

    double grow = h.X * h.Y * h.Z / (half.X * half.Y * half.Z);
    Console.WriteLine($"{deg,2} deg: corners {new V3(hx, hy, hz) * 2}, shortcut {h * 2}, volume x{grow:0.0}");
}

static double[,] RotZ(double d)
{
    double t = d * Math.PI / 180, c = Math.Cos(t), s = Math.Sin(t);
    return new[,] { { c, -s, 0 }, { s, c, 0 }, { 0, 0, 1 } };
}

static V3 Apply(double[,] m, V3 v) => new(
    m[0, 0] * v.X + m[0, 1] * v.Y + m[0, 2] * v.Z,
    m[1, 0] * v.X + m[1, 1] * v.Y + m[1, 2] * v.Z,
    m[2, 0] * v.X + m[2, 1] * v.Y + m[2, 2] * v.Z);

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
}`, output: ' 0 deg: corners (6, 0.3, 0.5), shortcut (6, 0.3, 0.5), volume x1.0\n30 deg: corners (5.346, 3.26, 0.5), shortcut (5.346, 3.26, 0.5), volume x9.7\n45 deg: corners (4.455, 4.455, 0.5), shortcut (4.455, 4.455, 0.5), volume x11.0\n90 deg: corners (0.3, 6, 0.5), shortcut (0.3, 6, 0.5), volume x1.0' },
      { type: 'note', kind: 'warn', text: 'Boxes of boxes keep growing. If you take the AABB of an element, then transform that box (because the element sits inside a nested family or a turned group) and take the AABB again, every turn adds more empty space. Recompute from the element’s own geometry or its own local box when you can.' },
      { type: 'h2', text: 'The OBB: a box that turns with the element' },
      { type: 'p', text: 'An OBB stores a centre, three unit axes U, V and W at right angles, and a half size along each. Testing a point is a change of coordinates, exactly the world-to-local step from the transforms module: subtract the centre, dot with each axis, and compare with the half sizes.' },
      { type: 'code', title: 'ObbContains.cs', code: cs`
// A 6 m beam turned 30 deg in plan, centred at (10, 5, 3)
double t = 30 * Math.PI / 180;
var beam = new Obb(new V3(10, 5, 3),
    new V3(Math.Cos(t), Math.Sin(t), 0), new V3(-Math.Sin(t), Math.Cos(t), 0), new V3(0, 0, 1),
    new V3(3, 0.15, 0.25));

foreach (var p in new V3[] { new(12, 6, 3), new(12, 5, 3), new(10, 5, 3.3) })
    Console.WriteLine($"{p}: local {beam.ToLocal(p)}, inside {beam.Contains(p)}");

readonly record struct Obb(V3 Centre, V3 U, V3 V, V3 W, V3 Half)
{
    public V3 ToLocal(V3 p)
    {
        var d = p - Centre;
        return new(V3.Dot(d, U), V3.Dot(d, V), V3.Dot(d, W));
    }

    public bool Contains(V3 p)
    {
        var l = ToLocal(p);
        return Math.Abs(l.X) <= Half.X && Math.Abs(l.Y) <= Half.Y && Math.Abs(l.Z) <= Half.Z;
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
}`, output: '(12, 6, 3): local (2.232, -0.134, 0), inside True\n(12, 5, 3): local (1.732, -1, 0), inside False\n(10, 5, 3.3): local (0, 0, 0.3), inside False' },
      { type: 'p', text: 'The point (12, 5, 3) is inside the beam’s AABB, but its local coordinates put it 1 m from the beam’s centre line, 0.85 m beyond its side face. Only the OBB can tell.' },
      { type: 'h2', text: 'Where does the OBB come from?' },
      { type: 'ul', items: [
        '**From the family**: in BIM you usually have it for free. A family instance has a local bounding box in its own coordinates and a transform that places it. The local box’s centre and half sizes, turned and moved by that transform, give an exact OBB.',
        '**From the geometry**: for a bare mesh, a good OBB can be found from the directions in which its points spread most (principal component analysis), or by trying the directions of its edges and keeping the smallest box. That is more work, so it is done once and stored.',
        '**From a convention**: for linear elements like beams, ducts and pipes, the axis of the element is the obvious U, and the section gives V and W.'
      ] },
      { type: 'table', head: ['', 'AABB', 'OBB'], rows: [
        ['Stored as', 'Min and Max (6 numbers)', 'Centre, 3 axes, 3 half sizes (15 numbers)'],
        ['Fit for a turned element', 'Loose, grows with the angle', 'Tight at any angle'],
        ['Overlap test', '6 comparisons', 'Separating-axis test, up to 15 axes'],
        ['Used for', 'Spatial indexes, broad phase, culling', 'Narrow phase, picking, tighter clash checks']
      ] },
      { type: 'p', text: 'The usual strategy combines them: AABBs to throw away almost every pair quickly, OBBs (or the real geometry) to decide the few that are left. The clash detection lesson builds exactly that pipeline.' },
      { type: 'quiz', question: 'A 6 m long, 0.3 m wide beam lies along the X axis. You turn it 45° in plan. What happens to its AABB?', options: ['It grows to roughly 4.5 × 4.5 m, about eleven times the beam’s own area', 'It stays 6 × 0.3 m', 'It shrinks, because the beam is now diagonal', 'It becomes an OBB'], answer: 0, explain: 'Each side becomes 6·cos 45° + 0.3·sin 45° ≈ 4.45 m. The AABB has to cover the diagonal beam, so it is mostly empty space.' },
      { type: 'quiz', question: 'Two AABBs overlap on X and on Y but not on Z. Do the elements inside them clash?', options: ['No: boxes that are apart on any one axis are apart, so the elements cannot touch', 'Maybe: test the real geometry', 'Yes: two out of three axes overlap', 'Only if they are both vertical'], answer: 0, explain: 'The elements lie inside their boxes, so if the boxes are separated on Z, the elements are too. A “maybe” only comes from boxes that overlap on all three axes.' },
      { type: 'exercise', task: 'A 6 × 0.3 m beam turns in plan. For θ = 0°, 15°, 30°, 45°, 60°, 75° and 90°, print the width and depth of its AABB and how many times the beam’s own area (1.8 m²) the AABB covers. At which angle is the AABB worst?', hint: 'Width = L·|cos θ| + W·|sin θ| and depth = L·|sin θ| + W·|cos θ|, with L = 6 and W = 0.3.', solution: cs`
double l = 6, w = 0.3;
for (int deg = 0; deg <= 90; deg += 15)
{
    double t = deg * Math.PI / 180, c = Math.Abs(Math.Cos(t)), s = Math.Abs(Math.Sin(t));
    double width = l * c + w * s, depth = l * s + w * c;
    Console.WriteLine($"{deg,2} deg: {width:0.00} x {depth:0.00} m, {width * depth / (l * w):0.0} x the beam");
}`, output: ' 0 deg: 6.00 x 0.30 m, 1.0 x the beam\n15 deg: 5.87 x 1.84 m, 6.0 x the beam\n30 deg: 5.35 x 3.26 m, 9.7 x the beam\n45 deg: 4.45 x 4.45 m, 11.0 x the beam\n60 deg: 3.26 x 5.35 m, 9.7 x the beam\n75 deg: 1.84 x 5.87 m, 6.0 x the beam\n90 deg: 0.30 x 6.00 m, 1.0 x the beam' }
    ],
    keyPoints: [
      'A bounding box answers “could this element be involved?” before any expensive test.',
      'An AABB is the min and max of every coordinate; two of them overlap only if they overlap on X, Y and Z.',
      'Turning an element makes its AABB grow: a thin beam at 45° has an AABB about eleven times its area.',
      'The AABB of a turned box has half sizes |R| · h; boxes of boxes keep growing, so recompute from the element.',
      'An OBB (centre, three axes, three half sizes) fits at any angle; in BIM it comes from the family’s local box and its transform.'
    ]
  },
  // ------------------------------------------------------------------ 2
  {
    slug: 'meshes',
    title: 'Meshes: vertices, faces and normals',
    summary: 'Store a solid as a list of corners and a list of triangles, learn why the order of a triangle’s corners matters, and see how face and vertex normals are worked out.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'Whatever a BIM program uses to model a solid internally, the moment it has to draw it, export it to IFC or glTF, or send it to a clash checker, it turns it into a **mesh**: a surface made of flat triangles. A wall becomes 12 triangles, a curved duct elbow a few hundred, a detailed family thousands.' },
      { type: 'p', text: 'A triangle is the simplest flat face there is: any three points that are not in a line lie in exactly one plane. Larger polygons can bend out of their plane, and graphics hardware only draws triangles anyway, so everything else is split into them.' },
      { type: 'widget', name: 'mesh' },
      { type: 'h2', text: 'Vertices and indices' },
      { type: 'p', text: 'A mesh is stored as two lists. The **vertex list** holds every corner once. The **index list** holds the triangles, each as three numbers that point into the vertex list. A box has 8 corners but 12 triangles, and each corner is shared by up to six of them, so storing each corner once saves memory and, more importantly, guarantees that neighbouring triangles really meet: they use the same point, not two copies that might differ in the last digit.' },
      { type: 'code', title: 'BoxMesh.cs', code: cs`
// The 8 corners of a 4 x 3 x 2.5 m box, each stored once
var v = new V3[]
{
    new(0, 0, 0), new(4, 0, 0), new(4, 3, 0), new(0, 3, 0),
    new(0, 0, 2.5), new(4, 0, 2.5), new(4, 3, 2.5), new(0, 3, 2.5)
};

// 12 triangles, each listed counter-clockwise seen from outside
var f = new (int A, int B, int C)[]
{
    (0, 2, 1), (0, 3, 2),   // floor (seen from below)
    (4, 5, 6), (4, 6, 7),   // roof
    (0, 1, 5), (0, 5, 4),   // front, y = 0
    (1, 2, 6), (1, 6, 5),   // right, x = 4
    (2, 3, 7), (2, 7, 6),   // back, y = 3
    (3, 0, 4), (3, 4, 7)    // left, x = 0
};

var edges = new HashSet<(int, int)>();
double area = 0;
foreach (var (a, b, c) in f)
{
    area += V3.Cross(v[b] - v[a], v[c] - v[a]).Length / 2;
    foreach (var (p, q) in new[] { (a, b), (b, c), (c, a) }) edges.Add((Math.Min(p, q), Math.Max(p, q)));
}

Console.WriteLine($"V = {v.Length}, E = {edges.Count}, F = {f.Length}, V - E + F = {v.Length - edges.Count + f.Length}");
Console.WriteLine($"surface area = {area} m2");
Console.WriteLine($"memory: {v.Length * 24 + f.Length * 12} bytes indexed, {f.Length * 3 * 24} bytes as separate triangles");
Console.WriteLine($"normals: floor {Normal(0)}, roof {Normal(2)}, front {Normal(4)}, right {Normal(6)}");

V3 Normal(int i) { var (a, b, c) = f[i]; return V3.Cross(v[b] - v[a], v[c] - v[a]).Normalized(); }

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
}`, output: 'V = 8, E = 18, F = 12, V - E + F = 2\nsurface area = 59 m2\nmemory: 336 bytes indexed, 864 bytes as separate triangles\nnormals: floor (0, 0, -1), roof (0, 0, 1), front (0, -1, 0), right (1, 0, 0)' },
      { type: 'p', text: '**V − E + F = 2** is Euler’s formula. It holds for every closed surface without holes, however it is triangulated, which makes it a cheap sanity check on imported geometry: a mesh with a gap or a stray triangle usually breaks it. (A solid with a hole through it, like a ring beam, gives 0 instead.)' },
      { type: 'h2', text: 'Winding: which way a triangle faces' },
      { type: 'p', text: 'The three indices of a triangle are listed in a definite order, and that order is information. By convention the corners go **counter-clockwise when you look at the triangle from outside the solid**. Then the cross product **(b − a) × (c − a)** points outwards, by the right-hand rule from the cross product lesson, and every triangle knows which side is outside without storing anything extra.' },
      { type: 'p', text: 'Turn on “Flip one triangle” in the widget. The same three corners listed the other way round give a normal pointing into the solid, and three things break:' },
      { type: 'ul', items: [
        '**Drawing**: renderers skip triangles that face away from the camera (back-face culling), so the flipped triangle vanishes and leaves a hole.',
        '**Lighting**: the light is computed from the normal, so even without culling the face is shaded as if lit from inside.',
        '**Measuring**: volumes, inside/outside tests and sections all rely on consistent winding, as the next lessons show.'
      ] },
      { type: 'p', text: 'Consistent winding has a neat test. In a closed, well-wound mesh, every edge is used by exactly two triangles, once in each direction: if one triangle goes 4 → 6, its neighbour goes 6 → 4. Count directed edges and the problems show up:' },
      { type: 'code', title: 'Winding.cs', code: cs`
var box = Mesh.Box(4, 3, 2.5);
Console.WriteLine($"box: {Check(box)}");

var (a, b, c) = box.F[3];
box.F[3] = (a, c, b);                         // one roof triangle listed clockwise
Console.WriteLine($"one triangle flipped: {Check(box)}");

box.F.RemoveAt(3);                            // and now that triangle missing
Console.WriteLine($"one triangle missing: {Check(box)}");

static string Check(Mesh m)
{
    var count = new Dictionary<(int, int), int>();
    foreach (var (a, b, c) in m.F)
        foreach (var e in new[] { (a, b), (b, c), (c, a) })
            count[e] = count.GetValueOrDefault(e) + 1;

    int same = 0, open = 0;
    foreach (var ((p, q), n) in count)
    {
        if (n > 1) same++;                                  // used twice in one direction
        else if (!count.ContainsKey((q, p))) open++;        // nothing on the other side
    }
    return same == 0 && open == 0 ? "closed and consistently wound"
         : $"{same} edges used twice in the same direction, {open} edges with no partner";
}

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
}`, output: 'box: closed and consistently wound\none triangle flipped: 3 edges used twice in the same direction, 0 edges with no partner\none triangle missing: 0 edges used twice in the same direction, 3 edges with no partner' },
      { type: 'note', kind: 'tip', text: 'Run this kind of check on every mesh you import from IFC, OBJ or STL before measuring anything. Flipped triangles can be fixed automatically: start from one triangle you trust and flip any neighbour whose shared edge runs the same way, spreading across the mesh.' },
      { type: 'h2', text: 'Face normals and vertex normals' },
      { type: 'p', text: 'A **face normal** belongs to one triangle and is the normalised cross product. A **vertex normal** belongs to a corner and is used for smooth shading: the renderer blends the normals across each triangle, so a pipe made of flat strips looks round. It is usually the normalised sum of the normals of the triangles around the corner. Using the un-normalised cross products weights bigger triangles more.' },
      { type: 'code', title: 'VertexNormal.cs', code: cs`
var box = Mesh.Box(4, 3, 2.5);
int corner = 6;                                    // the top corner at (4, 3, 2.5)

var sum = new V3(0, 0, 0);
var faces = new HashSet<V3>();
int count = 0;
foreach (var t in box.F)
{
    if (t.A != corner && t.B != corner && t.C != corner) continue;
    sum += box.Normal(t);                          // length 2 x area: big triangles weigh more
    faces.Add(box.Normal(t).Normalized());
    count++;
}

Console.WriteLine($"{count} triangles meet at {box.V[corner]}");
Console.WriteLine($"smooth vertex normal: {sum.Normalized()}");
Console.WriteLine($"flat shading needs {faces.Count} copies of the corner: {string.Join(", ", faces)}");

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
}`, output: '5 triangles meet at (4, 3, 2.5)\nsmooth vertex normal: (0.5, 0.333, 0.8)\nflat shading needs 3 copies of the corner: (0, 0, 1), (1, 0, 0), (0, 1, 0)' },
      { type: 'p', text: 'Smooth shading would make the box’s corner look rounded, which is wrong for a box. So meshes with hard edges store a corner once **per face plane**, each copy with that face’s normal: the box needs 24 vertices instead of 8, which is the “vertices with flat normals” row in the widget. Notice also that the averaged normal leans towards the right wall rather than the back wall although the back wall is bigger: only one of its two triangles touches this corner. Weighting by the angle each triangle makes at the corner avoids that dependence on how the faces happen to be split.' },
      { type: 'table', head: ['Format', 'How it stores a mesh'], rows: [
        ['IFC (IfcTriangulatedFaceSet)', 'A coordinate list and 1-based index triples, with optional normals'],
        ['glTF', 'Binary buffers of float positions, normals and indices, ready for the GPU'],
        ['OBJ', 'Text: v x y z lines, then f a b c lines with 1-based indices'],
        ['STL', 'Every triangle separately with its normal; no shared vertices at all']
      ] },
      { type: 'quiz', question: 'A triangle is stored as (2, 7, 5). Which of these describes the same triangle facing the opposite way?', options: ['(2, 5, 7)', '(7, 5, 2)', '(5, 2, 7)', '(2, 7, 5) with a minus sign'], answer: 0, explain: 'Swapping any two corners reverses the winding. (7, 5, 2) and (5, 2, 7) are just rotations of the original order, so they face the same way.' },
      { type: 'quiz', question: 'In a closed, consistently wound mesh, how is each edge used?', options: ['By exactly two triangles, once in each direction', 'By exactly one triangle', 'By two triangles in the same direction', 'By three triangles'], answer: 0, explain: 'Neighbouring triangles that both go counter-clockwise seen from outside run along their shared edge in opposite directions. An edge used once is a hole; one used twice the same way means a flipped triangle.' },
      { type: 'exercise', task: 'Build the mesh of a square pyramid: base 4 × 4 m on z = 0 and apex at (2, 2, 3). Use 5 vertices and 6 triangles, all counter-clockwise from outside. Print each triangle’s unit normal, then V − E + F and the surface area.', hint: 'The base needs two triangles that face down, for example (0, 2, 1) and (0, 3, 2). Each side is (i, i + 1, apex), going round the base counter-clockwise seen from above.', solution: cs`
var v = new V3[] { new(0, 0, 0), new(4, 0, 0), new(4, 4, 0), new(0, 4, 0), new(2, 2, 3) };
var f = new (int A, int B, int C)[] { (0, 1, 4), (1, 2, 4), (2, 3, 4), (3, 0, 4), (0, 2, 1), (0, 3, 2) };

var edges = new HashSet<(int, int)>();
double area = 0;
foreach (var (a, b, c) in f)
{
    var n = V3.Cross(v[b] - v[a], v[c] - v[a]);
    area += n.Length / 2;
    Console.WriteLine($"({a}, {b}, {c}): normal {n.Normalized()}");
    foreach (var (p, q) in new[] { (a, b), (b, c), (c, a) }) edges.Add((Math.Min(p, q), Math.Max(p, q)));
}
Console.WriteLine($"V - E + F = {v.Length} - {edges.Count} + {f.Length} = {v.Length - edges.Count + f.Length}");
Console.WriteLine($"surface area = {area:0.###} m2");

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
}`, output: '(0, 1, 4): normal (0, -0.832, 0.555)\n(1, 2, 4): normal (0.832, 0, 0.555)\n(2, 3, 4): normal (0, 0.832, 0.555)\n(3, 0, 4): normal (-0.832, 0, 0.555)\n(0, 2, 1): normal (0, 0, -1)\n(0, 3, 2): normal (0, 0, -1)\nV - E + F = 5 - 9 + 6 = 2\nsurface area = 44.844 m2' }
    ],
    keyPoints: [
      'A mesh is a vertex list plus an index list of triangles; shared vertices save memory and make neighbours meet exactly.',
      'V − E + F = 2 for any closed surface without holes: a cheap check on imported geometry.',
      'Corners are listed counter-clockwise seen from outside, so (b − a) × (c − a) points out of the solid.',
      'In a closed, well-wound mesh every edge is used exactly twice, once in each direction.',
      'Vertex normals average the face normals for smooth shading; hard edges need one vertex copy per face plane.'
    ]
  },
  // ------------------------------------------------------------------ 3
  {
    slug: 'ray-triangle',
    title: 'Ray–triangle intersection',
    summary: 'Find where a ray meets a triangle with the Möller–Trumbore method, read the answer as barycentric weights, and use it for picking, terrain heights and inside/outside tests.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'Click on a wall in a 3D view and the program has to work out which element is under the mouse. It does that by shooting a **ray** (a start point O and a direction d, from the lines lesson: P(t) = O + t·d with t ≥ 0) from the eye through the cursor, and finding the first triangle it hits. The same test drops a point onto a terrain surface, checks whether a sight line from a window is blocked, and decides whether a point is inside a solid.' },
      { type: 'widget', name: 'ray-triangle' },
      { type: 'h2', text: 'Two questions in one' },
      { type: 'p', text: 'Hitting a triangle means two things: the ray meets the triangle’s plane in front of its origin (**t > 0**), and the meeting point lies inside the triangle. You could solve them separately (line–plane intersection from the planes module, then a point-in-triangle test), but there is a neater way that answers both at once.' },
      { type: 'h2', text: 'Barycentric coordinates' },
      { type: 'p', text: 'Every point P in the plane of a triangle ABC can be written as **P = w·A + u·B + v·C** with **w + u + v = 1**. The three weights are its **barycentric coordinates**. At A they are (1, 0, 0), at the middle of edge BC (0, ½, ½), at the centroid (⅓, ⅓, ⅓). P is inside the triangle exactly when all three are between 0 and 1. A negative weight says which edge P is beyond: the one opposite that corner. The bars in the widget show this as you aim.' },
      { type: 'p', text: 'Since w = 1 − u − v, P = A + u·(B − A) + v·(C − A). Setting that equal to the ray, **O + t·d = A + u·e₁ + v·e₂** with e₁ = B − A and e₂ = C − A, gives three equations (x, y and z) for three unknowns t, u and v.' },
      { type: 'h2', text: 'Möller–Trumbore' },
      { type: 'p', text: 'Solving those equations with Cramer’s rule, and reusing cross products, gives the method Tomas Möller and Ben Trumbore published in 1997. It is still the standard. Its determinant **det = e₁ · (d × e₂)** is zero when the ray is parallel to the plane, and its sign says whether the ray hits the front or the back of the triangle.' },
      { type: 'code', title: 'RayTriangle.cs', code: cs`
V3 a = new(0, -2, 0), b = new(0, 2, 0.3), c = new(0, -0.4, 2.8);   // a panel in the plane x = 0
var o = new V3(4.5, -1.2, 2.4);

var rays = new (string Name, V3 O, V3 D)[]
{
    ("aimed at (0, 0.2, 1)", o, new V3(0, 0.2, 1) - o),
    ("aimed at (0, 1.6, 2)", o, new V3(0, 1.6, 2) - o),
    ("pointing away", o, o - new V3(0, 0.2, 1)),
    ("parallel to the panel", new V3(1.2, -3.2, 1.2), new V3(0, 1, 0.15))
};
foreach (var (name, ro, d) in rays)
    Console.WriteLine(Intersect(ro, d, a, b, c) is double t ? $"{name}: hit at t = {t:0.###}, point {ro + d * t}" : $"{name}: miss");

static double? Intersect(V3 o, V3 d, V3 a, V3 b, V3 c)
{
    const double Eps = 1e-12;
    V3 e1 = b - a, e2 = c - a;
    V3 p = V3.Cross(d, e2);
    double det = V3.Dot(e1, p);
    if (Math.Abs(det) < Eps) return null;          // parallel to the plane

    double inv = 1 / det;
    V3 s = o - a;
    double u = V3.Dot(s, p) * inv;                  // weight of B
    if (u < 0 || u > 1) return null;

    V3 q = V3.Cross(s, e1);
    double v = V3.Dot(d, q) * inv;                  // weight of C
    if (v < 0 || u + v > 1) return null;

    double t = V3.Dot(e2, q) * inv;                 // distance along the ray, in units of d
    return t > Eps ? t : null;                      // only in front of the origin
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
}`, output: 'aimed at (0, 0.2, 1): hit at t = 1, point (0, 0.2, 1)\naimed at (0, 1.6, 2): miss\npointing away: miss\nparallel to the panel: miss' },
      { type: 'p', text: 'Notice the early exits: most triangles a ray is tested against are misses, and the method gives up as soon as u or v is out of range, before computing t. The ray “pointing away” passes through the same panel point but at t = −1, behind its origin, so it is a miss.' },
      { type: 'h2', text: 'The nearest hit, and weights as an interpolator' },
      { type: 'p', text: 'Against a whole mesh, test every triangle and keep the **smallest positive t**: that is the surface the eye sees first. The barycentric weights are useful beyond the inside test: any value stored at the three corners (a height, a colour, a normal, a temperature) can be blended at the hit point as w·value_A + u·value_B + v·value_C. A terrain surface (a TIN, triangulated irregular network) uses exactly this to find the ground level under a point:' },
      { type: 'code', title: 'TerrainHeight.cs', code: cs`
// Two triangles of a surveyed terrain surface
var pts = new V3[] { new(0, 0, 10.2), new(20, 0, 11.0), new(20, 20, 12.6), new(0, 20, 10.8) };
var tris = new[] { (0, 1, 2), (0, 2, 3) };

foreach (var (x, y) in new[] { (5.0, 2.0), (12.0, 15.0), (25.0, 5.0) })
{
    var o = new V3(x, y, 1000);                       // drop a ray straight down
    var d = new V3(0, 0, -1);
    double? best = null;
    foreach (var (i, j, k) in tris)
        if (Intersect(o, d, pts[i], pts[j], pts[k]) is double t && (best is null || t < best)) best = t;
    Console.WriteLine(best is double tb ? $"({x}, {y}): ground at z = {1000 - tb:0.###}" : $"({x}, {y}): outside the survey");
}

static double? Intersect(V3 o, V3 d, V3 a, V3 b, V3 c)
{
    V3 e1 = b - a, e2 = c - a, p = V3.Cross(d, e2);
    double det = V3.Dot(e1, p);
    if (Math.Abs(det) < 1e-12) return null;
    double inv = 1 / det;
    V3 s = o - a;
    double u = V3.Dot(s, p) * inv;
    if (u < 0 || u > 1) return null;
    V3 q = V3.Cross(s, e1);
    double v = V3.Dot(d, q) * inv;
    if (v < 0 || u + v > 1) return null;
    double t = V3.Dot(e2, q) * inv;
    return t > 1e-12 ? t : null;
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
}`, output: '(5, 2): ground at z = 10.56\n(12, 15): ground at z = 11.73\n(25, 5): outside the survey' },
      { type: 'note', kind: 'warn', text: 'Rays that pass exactly through an edge or a corner shared by several triangles are the hard case. With the ≥ 0 tests above, a ray through the shared edge of two triangles can count as a hit on both, or (with rounding) on neither. Picking does not mind, but counting hits does. Robust ray tracers use “watertight” variants that guarantee exactly one hit; simpler code casts the ray in an odd direction to make exact edge hits unlikely.' },
      { type: 'h2', text: 'Speed: not every triangle' },
      { type: 'p', text: 'A model with ten million triangles cannot test every one for every mouse move. Real picking first tests the ray against bounding boxes, using a bounding volume hierarchy (BVH) or another spatial index from the DSA course’s spatial indexes lesson, and only runs Möller–Trumbore on the few triangles inside the boxes the ray passes through.' },
      { type: 'quiz', question: 'Möller–Trumbore returns u = 0.6 and v = 0.5 for a hit with t = 3. What does that mean?', options: ['A miss: u + v > 1, so the point is outside, beyond edge BC', 'A hit, 3 units along the ray', 'A hit at the centroid', 'The ray is parallel to the triangle'], answer: 0, explain: 'The third weight, w = 1 − u − v, is −0.1. A negative weight puts the point outside the triangle, on the far side of the edge opposite A, which is BC.' },
      { type: 'quiz', question: 'Why does a pick ray keep the smallest positive t rather than any hit?', options: ['The smallest t is the surface nearest the eye, the one you can see', 'It is faster to compute', 'Larger t values are always rounding errors', 'Negative t values are the nearest'], answer: 0, explain: 'Along the ray, t measures distance from the eye. The first surface the ray meets hides everything behind it, so that is the element the user clicked.' },
      { type: 'exercise', task: 'Decide whether a point is inside a closed mesh by casting a ray from it and counting how many triangles it crosses: an odd count means inside. Use Mesh.Box(4, 3, 2.5) and test (2, 1.5, 1), (5, 1, 1), (1, 1, 2.4) and (2, 1.5, −0.5). Use the direction (1, 0.123, 0.0371) so the ray does not run exactly along an edge.', hint: 'Reuse Intersect from RayTriangle.cs and count every triangle it returns a value for, not just the nearest.', solution: cs`
var box = Mesh.Box(4, 3, 2.5);
var dir = new V3(1, 0.123, 0.0371);

foreach (var p in new V3[] { new(2, 1.5, 1), new(5, 1, 1), new(1, 1, 2.4), new(2, 1.5, -0.5) })
{
    int hits = box.F.Count(t => Intersect(p, dir, box.V[t.A], box.V[t.B], box.V[t.C]) is not null);
    Console.WriteLine($"{p}: {hits} crossing{(hits == 1 ? "" : "s")} -> {(hits % 2 == 1 ? "inside" : "outside")}");
}

static double? Intersect(V3 o, V3 d, V3 a, V3 b, V3 c)
{
    V3 e1 = b - a, e2 = c - a, p = V3.Cross(d, e2);
    double det = V3.Dot(e1, p);
    if (Math.Abs(det) < 1e-12) return null;
    double inv = 1 / det;
    V3 s = o - a;
    double u = V3.Dot(s, p) * inv;
    if (u < 0 || u > 1) return null;
    V3 q = V3.Cross(s, e1);
    double v = V3.Dot(d, q) * inv;
    if (v < 0 || u + v > 1) return null;
    double t = V3.Dot(e2, q) * inv;
    return t > 1e-12 ? t : null;
}

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
}`, output: '(2, 1.5, 1): 1 crossing -> inside\n(5, 1, 1): 0 crossings -> outside\n(1, 1, 2.4): 1 crossing -> inside\n(2, 1.5, -0.5): 0 crossings -> outside' }
    ],
    keyPoints: [
      'A ray O + t·d hits a triangle when t > 0 and the plane point is inside the triangle.',
      'Barycentric weights (w, u, v) add up to 1; the point is inside when all three are between 0 and 1.',
      'Möller–Trumbore finds t, u and v together; det = e₁ · (d × e₂) is zero for a parallel ray.',
      'For picking keep the smallest positive t; the weights also interpolate values such as terrain heights.',
      'Counting crossings tells inside from outside; edge hits need care, and big models need a BVH first.'
    ]
  },
  // ------------------------------------------------------------------ 4
  {
    slug: 'clash-detection',
    title: 'Clash detection and the separating-axis theorem',
    summary: 'Find elements that run into each other: a cheap broad phase with boxes, then an exact test for convex shapes based on the separating-axis theorem, with tolerances for touching and clearance.',
    minutes: 16,
    blocks: [
      { type: 'p', text: 'Clash detection finds places where the structural, architectural and services models disagree: a duct through a beam, a pipe through a door opening, a cable tray too close to a sprinkler. A coordinated hospital can have hundreds of thousands of elements, so checking every pair (n·(n − 1)/2 pairs, about 5 × 10¹⁰ for 300 000 elements) is out of the question.' },
      { type: 'p', text: 'Every clash checker therefore works in two phases:' },
      { type: 'ol', items: [
        '**Broad phase**: compare cheap bounding boxes, using sorting or a spatial index, to find the few pairs that might touch.',
        '**Narrow phase**: run an exact test on those candidate pairs only.'
      ] },
      { type: 'h2', text: 'Broad phase: sweep and prune' },
      { type: 'p', text: 'One simple broad phase sorts the AABBs by their minimum X. Walking along that list, each box only needs comparing with the boxes that start before it ends on X; as soon as a box starts beyond its end, so do all later ones.' },
      { type: 'code', title: 'BroadPhase.cs', code: cs`
var items = new (string Name, double X0, double X1, double Y0, double Y1, double Z0, double Z1)[]
{
    ("beam B1",   0,   6,    0,   0.3, 3.0, 3.5),
    ("duct D1",   2,   2.4, -1,   2,   3.2, 3.6),
    ("pipe P1",   2,   2.2, -1,   2,   3.6, 3.8),
    ("column C1", 5.8, 6.2, -0.1, 0.3, 0,   3.0),
    ("beam B2",   7,  13,    0,   0.3, 3.0, 3.5),
    ("duct D2",  12,  12.4, -1,   2,   3.3, 3.7)
};

var order = items.OrderBy(i => i.X0).ToArray();
int tests = 0;
for (int i = 0; i < order.Length; i++)
    for (int j = i + 1; j < order.Length && order[j].X0 < order[i].X1; j++)
    {
        tests++;
        var (a, b) = (order[i], order[j]);
        if (a.Y0 < b.Y1 && b.Y0 < a.Y1 && a.Z0 < b.Z1 && b.Z0 < a.Z1)
            Console.WriteLine($"candidate: {a.Name} and {b.Name}");
    }
Console.WriteLine($"{tests} box tests instead of {items.Length * (items.Length - 1) / 2}");`, output: 'candidate: beam B1 and duct D1\ncandidate: beam B2 and duct D2\n5 box tests instead of 15' },
      { type: 'p', text: 'The column touches the underside of beam B1 (both at z = 3.0) and is correctly not a candidate, and the pipe sits just above the beam. For large models the same job is done with a uniform grid, an octree or a BVH; the DSA course’s spatial indexes lesson covers them.' },
      { type: 'h2', text: 'The separating-axis theorem' },
      { type: 'p', text: 'For the narrow phase, many elements are well approximated by convex shapes: boxes for beams, ducts, columns and slabs. For two convex shapes there is a beautiful exact test. **Two convex shapes do not overlap if and only if there is a direction in which their shadows (projections) do not overlap.** Such a direction is a **separating axis**, and a plane at right angles to it fits between the shapes.' },
      { type: 'p', text: 'The catch is that there are infinitely many directions. The theorem’s second half says which ones are enough. For two polygons in 2D, the **normals of their edges**: two rectangles have only four. Try it in the widget: pick each axis to see both shadows on it.' },
      { type: 'widget', name: 'sat' },
      { type: 'p', text: 'Projecting a box onto an axis does not need its corners. The shadow is centred on the projection of the box’s centre, with a half length (its **radius**) of hx·|U·axis| + hy·|V·axis|, using the box’s own axes U and V and half sizes:' },
      { type: 'code', title: 'Sat2D.cs', code: cs`
var duct = new Rect(new P2(3.4, 3.2), 2.2, 0.8, 20);

foreach (var (x, y, deg) in new[] { (6.0, 4.0, 60.0), (7.0, 4.6, 60.0), (6.4, 5.4, 30.0) })
    Console.WriteLine($"B at ({x}, {y}), {deg} deg: {Sat(duct, new Rect(new P2(x, y), 1.3, 0.6, deg))}");

static string Sat(Rect a, Rect b)
{
    var axes = new[] { ("A1", a.U), ("A2", a.V), ("B1", b.U), ("B2", b.V) };
    double least = double.MaxValue;
    string leastName = "";
    foreach (var (name, ax) in axes)
    {
        var (a0, a1) = a.Project(ax);
        var (b0, b1) = b.Project(ax);
        double overlap = Math.Min(a1, b1) - Math.Max(a0, b0);
        if (overlap <= 0) return $"apart (gap {-overlap:0.00} on {name})";
        if (overlap < least) (least, leastName) = (overlap, name);
    }
    return $"clash (smallest overlap {least:0.00} on {leastName})";
}

readonly record struct P2(double X, double Y);

readonly record struct Rect(P2 C, double Hx, double Hy, double Deg)
{
    double T => Deg * Math.PI / 180;
    public P2 U => new(Math.Cos(T), Math.Sin(T));
    public P2 V => new(-Math.Sin(T), Math.Cos(T));

    public (double, double) Project(P2 ax)
    {
        double c = C.X * ax.X + C.Y * ax.Y;
        double r = Hx * Math.Abs(U.X * ax.X + U.Y * ax.Y) + Hy * Math.Abs(V.X * ax.X + V.Y * ax.Y);
        return (c - r, c + r);
    }
}`, output: 'B at (6, 4), 60 deg: clash (smallest overlap 0.78 on B2)\nB at (7, 4.6), 60 deg: apart (gap 0.28 on A1)\nB at (6.4, 5.4), 30 deg: apart (gap 0.09 on B1)' },
      { type: 'p', text: 'The last case shows why both boxes’ axes are needed: on A’s two axes the shadows overlap (on A1 by just 0.01 m), and only B’s own axis B1 finds the 0.09 m gap. The test stops at the first gap, so pairs that are clearly apart cost very little. When every axis overlaps, the smallest overlap is a bonus: it is the shortest distance one shape would have to move to clear the other, which a clash report can show as the depth of the clash.' },
      { type: 'h2', text: 'Boxes in 3D: fifteen axes' },
      { type: 'p', text: 'In 3D, face normals are not enough. Two boxes can miss each other edge to edge, like two sticks crossing at different heights, with every face normal showing an overlap. The extra candidates are the **cross products of an edge direction of one box with an edge direction of the other**. For two OBBs that is 3 + 3 face axes plus 3 × 3 edge–edge axes: **15 in all**.' },
      { type: 'code', title: 'ObbClash.cs', code: cs`
var beam = new Obb(new V3(0, 0, 0), Rot(0, 0), new V3(2, 0.15, 0.3));     // 4 m beam along X

var cases = new (string Name, V3 Centre)[]
{
    ("duct through the beam", new(0, 0, 0.3)),
    ("duct just past the beam edge", new(0, -1, 0.3)),
    ("duct well above", new(0, 0, 1.6))
};
foreach (var (name, c) in cases)
{
    var duct = new Obb(c, Rot(30, 45), new V3(0.1, 1.5, 0.1));         // a sloping duct
    Console.WriteLine($"{name}: {Separating(beam, duct) ?? "clash"}");
}

static string? Separating(Obb a, Obb b)
{
    var axes = new List<(string, V3)>();
    for (int i = 0; i < 3; i++) axes.Add(($"A{"xyz"[i]}", a.Axes[i]));
    for (int i = 0; i < 3; i++) axes.Add(($"B{"xyz"[i]}", b.Axes[i]));
    for (int i = 0; i < 3; i++)
        for (int j = 0; j < 3; j++)
        {
            var c = V3.Cross(a.Axes[i], b.Axes[j]);
            if (c.Length > 1e-9) axes.Add(($"A{"xyz"[i]} x B{"xyz"[j]}", c));   // skip parallel edges
        }

    var d = b.Centre - a.Centre;
    foreach (var (name, l) in axes)
        if (Math.Abs(V3.Dot(d, l)) > a.Radius(l) + b.Radius(l)) return $"apart, separated on {name}";
    return null;
}

// Rz(z) * Rx(x), returned as the three turned axes
static V3[] Rot(double z, double x)
{
    double cz = Math.Cos(z * Math.PI / 180), sz = Math.Sin(z * Math.PI / 180);
    double cx = Math.Cos(x * Math.PI / 180), sx = Math.Sin(x * Math.PI / 180);
    return new V3[] { new(cz, sz, 0), new(-sz * cx, cz * cx, sx), new(sz * sx, -cz * sx, cx) };
}

readonly record struct Obb(V3 Centre, V3[] Axes, V3 Half)
{
    // Half the length of the box's shadow on the direction l
    public double Radius(V3 l) =>
        Half.X * Math.Abs(V3.Dot(Axes[0], l)) + Half.Y * Math.Abs(V3.Dot(Axes[1], l)) + Half.Z * Math.Abs(V3.Dot(Axes[2], l));
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
}`, output: 'duct through the beam: clash\nduct just past the beam edge: apart, separated on Ax x By\nduct well above: apart, separated on Az' },
      { type: 'p', text: 'The middle case is the one that needs the extra axes: the duct passes beside the beam’s edge, every face axis shows an overlap, and only the cross product of the beam’s length with the duct’s length finds the gap. Comparing |d · l| with the two radii avoids normalising l, because both sides scale by the same length.' },
      { type: 'h2', text: 'Touching, tolerances and clearance' },
      { type: 'ul', items: [
        '**Touching is not clashing.** A beam sitting on a column, or a duct resting on a hanger, shares a face. Exact zero overlaps are rare in floating point, so checkers treat an overlap smaller than a tolerance (for example 1 mm) as touching.',
        '**Clearance (soft) clashes.** Some elements must keep a distance: insulation around a pipe, access space in front of a panel. Inflate one shape by the clearance and test again, or compute the actual distance between the shapes and compare it with the requirement.',
        '**Duplicates.** Two identical elements on top of each other overlap completely. Reporting them separately (same type, same geometry) keeps the clash list readable.'
      ] },
      { type: 'note', kind: 'info', text: 'The separating-axis theorem only works for convex shapes. Concave elements (an L-shaped slab, a duct elbow) are split into convex pieces or tested triangle against triangle, with the same broad-phase boxes around each piece. SAT also gives no distance between shapes that are apart; for clearance on complex shapes, checkers use distance algorithms such as GJK.' },
      { type: 'quiz', question: 'Two rectangles in plan have a gap on one of their four edge-normal axes and overlap on the other three. What do you conclude?', options: ['They do not overlap: one separating axis is enough', 'They overlap: most axes say so', 'You need to test more axes', 'They touch along an edge'], answer: 0, explain: 'If the shadows on any one axis are apart, a line at right angles to that axis fits between the shapes, so they cannot overlap.' },
      { type: 'quiz', question: 'Why does the 3D box test need the nine edge × edge axes as well as the six face normals?', options: ['Two boxes can miss each other edge to edge while every face normal shows an overlap', 'To make the test faster', 'Because 3D boxes have nine faces', 'Only for boxes that are not rotated'], answer: 0, explain: 'Picture two sticks crossing at slightly different heights, both tilted. Only a direction at right angles to both sticks (their cross product) shows the gap between them.' },
      { type: 'exercise', task: 'Write a soft-clash check for two AABBs: compute the shortest distance between them (0 if they overlap) and report a clash if it is less than the required clearance. A pipe with 50 mm insulation needs 0.05 m clear. Test the box (0, 0, 3) .. (6, 0.3, 3.5) against (2, −1, 3.53) .. (2.2, 2, 3.73), (2, −1, 3.6) .. (2.2, 2, 3.8) and (6.04, 0.32, 0) .. (6.4, 0.6, 3.5).', hint: 'On each axis the gap is max(0, b.Min − a.Max, a.Min − b.Max). The distance is the length of the vector of the three gaps.', solution: cs`
var beam = (Min: new V3(0, 0, 3), Max: new V3(6, 0.3, 3.5));
var others = new (V3 Min, V3 Max)[]
{
    (new V3(2, -1, 3.53), new V3(2.2, 2, 3.73)),
    (new V3(2, -1, 3.6), new V3(2.2, 2, 3.8)),
    (new V3(6.04, 0.32, 0), new V3(6.4, 0.6, 3.5))
};
const double Clearance = 0.05;
foreach (var o in others)
{
    var gap = new V3(Gap(beam.Min.X, beam.Max.X, o.Min.X, o.Max.X),
                     Gap(beam.Min.Y, beam.Max.Y, o.Min.Y, o.Max.Y),
                     Gap(beam.Min.Z, beam.Max.Z, o.Min.Z, o.Max.Z));
    double dist = gap.Length;
    Console.WriteLine($"{o.Min} .. {o.Max}: {dist:0.000} m apart -> {(dist < Clearance ? "soft clash" : "ok")}");
}

static double Gap(double a0, double a1, double b0, double b1) => Math.Max(0, Math.Max(b0 - a1, a0 - b1));

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
}`, output: '(2, -1, 3.53) .. (2.2, 2, 3.73): 0.030 m apart -> soft clash\n(2, -1, 3.6) .. (2.2, 2, 3.8): 0.100 m apart -> ok\n(6.04, 0.32, 0) .. (6.4, 0.6, 3.5): 0.045 m apart -> soft clash' }
    ],
    keyPoints: [
      'Clash detection runs a cheap broad phase on bounding boxes, then an exact narrow phase on the few candidates.',
      'Sweep and prune sorts boxes by min X so each box is only compared with boxes that start before it ends.',
      'Separating-axis theorem: two convex shapes are apart if and only if their shadows are apart on some axis.',
      'Rectangles need their 4 edge normals; boxes in 3D need 6 face normals plus 9 edge × edge cross products.',
      'Use a tolerance so touching elements are not clashes, and clearance distances for soft clashes.'
    ]
  },
  // ------------------------------------------------------------------ 5
  {
    slug: 'volumes-areas',
    title: 'Volumes and surface areas of solids',
    summary: 'Measure any closed mesh: surface area from its triangles, volume and centre of mass from signed tetrahedra, and why the result goes wrong for open meshes or coordinates far from the origin.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'Quantity take-off turns a model into numbers people pay for: cubic metres of concrete, square metres of plasterboard and paint, the air volume of a room for ventilation. For simple shapes there are formulas, but an element with openings, chamfers and sloped faces needs a method that works for any closed mesh.' },
      { type: 'h2', text: 'Surface area' },
      { type: 'p', text: 'This part is easy. A triangle’s area is half the length of the cross product of two of its edges, from the cross product lesson, so a mesh’s surface area is **Σ ½ |(b − a) × (c − a)|** over its triangles. For a paint quantity you would add only the faces you paint, for example those whose normal is close to horizontal for walls.' },
      { type: 'h2', text: 'Volume from signed tetrahedra' },
      { type: 'p', text: 'Pick any point O. Each triangle together with O forms a tetrahedron, whose volume is **(a − O) · ((b − O) × (c − O)) / 6**. Because the triangles are wound counter-clockwise from outside, this volume is **positive** when the triangle faces away from O and **negative** when it faces towards it. Add up all of them and the parts outside the solid cancel exactly, leaving its volume.' },
      { type: 'widget', name: 'volume' },
      { type: 'p', text: 'Move O outside the box in the widget: some tetrahedra turn negative and the positive ones grow, but the total does not change. This is the 3D version of the shoelace formula from the polygon area lesson, and both are cases of the divergence theorem.' },
      { type: 'code', title: 'MeshVolume.cs', code: cs`
var shapes = new (string Name, Mesh M)[]
{
    ("box 4 x 3 x 2.5", Mesh.Box(4, 3, 2.5)),
    ("L-shaped room", Mesh.Prism(new[] { (0.0, 0.0), (4.0, 0.0), (4.0, 2.0), (2.0, 2.0), (2.0, 4.0), (0.0, 4.0) }, 3)),
    ("pyramid", Mesh.Pyramid(4, 3))
};

foreach (var (name, m) in shapes)
    Console.WriteLine($"{name}: area {Area(m):0.###} m2, volume {Volume(m, new V3(0, 0, 0)):0.###} m3, from O = (50, -20, 7): {Volume(m, new V3(50, -20, 7)):0.###} m3");

static double Area(Mesh m) => m.F.Sum(t => m.Normal(t).Length / 2);

static double Volume(Mesh m, V3 o) =>
    m.F.Sum(t => V3.Dot(m.V[t.A] - o, V3.Cross(m.V[t.B] - o, m.V[t.C] - o)) / 6);

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
}`, output: 'box 4 x 3 x 2.5: area 59 m2, volume 30 m3, from O = (50, -20, 7): 30 m3\nL-shaped room: area 72 m2, volume 36 m3, from O = (50, -20, 7): 36 m3\npyramid: area 44.844 m2, volume 16 m3, from O = (50, -20, 7): 16 m3' },
      { type: 'p', text: 'With O at the origin the formula becomes **Σ a · (b × c) / 6**, which is how it is usually written. The pyramid comes out at ⅓ × base × height = 16 m³ without any special case for sloping faces.' },
      { type: 'note', kind: 'warn', text: 'The cancellation only works for a **closed** mesh with **consistent winding**. A missing triangle leaves part of the volume uncancelled, so the result depends on where O is; a flipped triangle counts its tetrahedron with the wrong sign. Run the edge check from the meshes lesson first. A negative total for the whole mesh means it is wound inside out.' },
      { type: 'h2', text: 'Centre of mass' },
      { type: 'p', text: 'The same tetrahedra give the centre of mass (centroid) of a solid of uniform density. A tetrahedron’s centroid is the average of its four corners, so the solid’s centroid is the volume-weighted average of the tetrahedra’s centroids. Signed volumes take care of the parts outside again. That is what a lifting plan or a structural model needs for a precast element.' },
      { type: 'code', title: 'Centroid.cs', code: cs`
var footprint = new[] { (0.0, 0.0), (4.0, 0.0), (4.0, 2.0), (2.0, 2.0), (2.0, 4.0), (0.0, 4.0) };
var slab = Mesh.Prism(footprint, 0.25);                        // an L-shaped precast slab

double vol = 0;
var moment = new V3(0, 0, 0);
foreach (var t in slab.F)
{
    V3 a = slab.V[t.A], b = slab.V[t.B], c = slab.V[t.C];      // tetrahedron (origin, a, b, c)
    double v = V3.Dot(a, V3.Cross(b, c)) / 6;
    vol += v;
    moment += (a + b + c) * (v / 4);                           // its centroid is (0 + a + b + c) / 4
}

Console.WriteLine($"volume {vol:0.###} m3, mass {vol * 2400:0} kg at 2400 kg/m3");
Console.WriteLine($"centre of mass {moment * (1 / vol)}");

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
}`, output: 'volume 3 m3, mass 7200 kg at 2400 kg/m3\ncentre of mass (1.667, 1.667, 0.125)' },
      { type: 'p', text: 'Check it by hand: the L is a 4 × 2 rectangle with its centre at (2, 1) plus a 2 × 2 square with its centre at (1, 3). Weighted by area (8 and 4), x̄ = (8·2 + 4·1)/12 = 1.667 and ȳ = (8·1 + 4·3)/12 = 1.667, and the slab’s mid-depth is z = 0.125.' },
      { type: 'h2', text: 'Keep O close to the solid' },
      { type: 'p', text: 'Mathematically O can be anywhere. Numerically it should be near the solid. Projects placed in real survey coordinates have points like (512 340, 6 401 220): then every tetrahedron from the origin is enormous, the true volume is the small difference between huge positive and negative parts, and rounding errors that are tiny relative to the parts are large relative to the answer.' },
      { type: 'code', title: 'FarFromOrigin.cs', code: cs`
var box = Mesh.Box(4, 3, 2.5);
var site = new V3(512_340.37, 6_401_220.81, 35.2);         // survey coordinates
var placed = new Mesh();
placed.V.AddRange(box.V.Select(p => p + site));
placed.F.AddRange(box.F);

Console.WriteLine($"near the origin:         {Volume(box, new V3(0, 0, 0))} m3");
Console.WriteLine($"at site, O = origin:     {Volume(placed, new V3(0, 0, 0))} m3");
Console.WriteLine($"at site, O = a corner:   {Volume(placed, placed.V[0])} m3");

static double Volume(Mesh m, V3 o) =>
    m.F.Sum(t => V3.Dot(m.V[t.A] - o, V3.Cross(m.V[t.B] - o, m.V[t.C] - o)) / 6);

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
}`, output: 'near the origin:         30 m3\nat site, O = origin:     29.99652267806232 m3\nat site, O = a corner:   30 m3' },
      { type: 'p', text: 'Even in double precision the volume measured from the far-away origin is a few litres out; in single precision (float, which meshes for display often use) it would be meaningless. Measuring from one of the solid’s own corners gives the exact answer. This is one reason BIM programs keep geometry in a project coordinate system near the origin and store the survey position separately, as the georeferencing lesson explains.' },
      { type: 'table', head: ['Quantity', 'From a mesh'], rows: [
        ['Surface area', 'Σ ½ |(b − a) × (c − a)|'],
        ['Volume', 'Σ (a − O) · ((b − O) × (c − O)) / 6, O near the solid'],
        ['Centre of mass', 'Σ volume × (O + a + b + c)/4, divided by the volume'],
        ['Extruded element', 'Footprint area (shoelace) × height: no mesh needed']
      ] },
      { type: 'quiz', question: 'You compute a mesh’s volume and get −24 m³. What is the most likely cause?', options: ['All the triangles are wound inside out (clockwise from outside)', 'The mesh is very far from the origin', 'O was placed outside the solid', 'The solid has a sloped face'], answer: 0, explain: 'Reversing every triangle flips the sign of every tetrahedron, so a consistently inside-out mesh gives exactly minus the volume. O outside the solid does not matter for a closed mesh.' },
      { type: 'quiz', question: 'Why does the choice of O not change the volume of a closed, well-wound mesh?', options: ['The parts of the tetrahedra outside the solid are counted once positive and once negative, so they cancel', 'Because O is always moved to the centroid', 'It does change it, slightly', 'Because the tetrahedra never extend outside the solid'], answer: 0, explain: 'Every point outside the solid is covered by as many positive as negative tetrahedra, and every point inside by one more positive than negative. Only the solid itself remains.' },
      { type: 'exercise', task: 'A room is the L-shaped footprint (0, 0), (4, 0), (4, 2), (2, 2), (2, 4), (0, 4), 3 m high. Compute its volume twice: from the mesh with signed tetrahedra, and as the footprint’s shoelace area times the height. Then compute the area of its walls only (faces whose normal is horizontal).', hint: 'Build the mesh with Mesh.Prism. A face is a wall when the Z part of its normal is (close to) 0.', solution: cs`
var footprint = new[] { (0.0, 0.0), (4.0, 0.0), (4.0, 2.0), (2.0, 2.0), (2.0, 4.0), (0.0, 4.0) };
var room = Mesh.Prism(footprint, 3);

double fromMesh = room.F.Sum(t => V3.Dot(room.V[t.A], V3.Cross(room.V[t.B], room.V[t.C])) / 6);

double shoelace = 0;
for (int i = 0; i < footprint.Length; i++)
{
    var (x1, y1) = footprint[i];
    var (x2, y2) = footprint[(i + 1) % footprint.Length];
    shoelace += (x1 * y2 - x2 * y1) / 2;
}

double walls = room.F.Select(room.Normal).Where(n => Math.Abs(n.Z) < 1e-9).Sum(n => n.Length / 2);

Console.WriteLine($"volume from the mesh: {fromMesh:0.###} m3");
Console.WriteLine($"floor area x height: {shoelace} x 3 = {shoelace * 3} m3");
Console.WriteLine($"wall area: {walls:0.###} m2");

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
}`, output: 'volume from the mesh: 36 m3\nfloor area x height: 12 x 3 = 36 m3\nwall area: 48 m2' }
    ],
    keyPoints: [
      'Surface area is the sum of ½ |(b − a) × (c − a)| over the triangles.',
      'Volume is the sum of signed tetrahedra (a − O) · ((b − O) × (c − O)) / 6; the parts outside the solid cancel.',
      'It needs a closed mesh with consistent winding; a negative total means the mesh is inside out.',
      'The centre of mass is the volume-weighted average of the tetrahedra’s centroids.',
      'Put O near the solid: far-away coordinates lose precision even in double.'
    ]
  },
  // ------------------------------------------------------------------ 6
  {
    slug: 'sections',
    title: 'Sections: cutting a mesh with a plane',
    summary: 'Cut a mesh with a plane the way plan and section views do: signed distances, one segment per crossing triangle, joining the segments into closed loops, and measuring the cut area.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'A floor plan is a horizontal cut through the building, usually about 1.2 m above the floor, looking down. A section is a vertical cut. Both need the outline where each element meets the cutting plane, so it can be drawn with a thick line and filled with a hatch. The same cut gives the floor area of a room at a level, or the cross-section of a beam for a structural check.' },
      { type: 'widget', name: 'section' },
      { type: 'h2', text: 'One triangle against a plane' },
      { type: 'p', text: 'Write the plane as **n · p = d** with a unit normal n, as in the planes lesson. For each corner of a triangle work out the signed distance **s = n · p − d**: positive above the plane, negative below. If all three have the same sign, the triangle misses the plane. Otherwise exactly two edges cross it, and on an edge from P (distance s_P) to Q (distance s_Q) the crossing is at' },
      { type: 'p', text: '**X = P + (Q − P) · s_P / (s_P − s_Q)**' },
      { type: 'p', text: 'the same interpolation as the line–plane intersection, just with the distances already known. The two crossing points make one segment of the section.' },
      { type: 'code', title: 'TriangleCut.cs', code: cs`
var n = new V3(0, 0, 1);
double d = 1.2;                                           // the plane z = 1.2

var tris = new (string Name, V3 A, V3 B, V3 C)[]
{
    ("crosses", new(0, 0, 0), new(4, 0, 0), new(4, 0, 3)),
    ("below", new(0, 0, 0), new(4, 0, 0), new(4, 0, 1)),
    ("corner on the plane", new(0, 0, 1.2), new(4, 0, 0), new(4, 0, 3))
};
foreach (var (name, a, b, c) in tris)
{
    var pts = Cut(a, b, c, n, d);
    Console.WriteLine($"{name}: {(pts.Count == 2 ? $"{pts[0]} to {pts[1]}" : "no segment")}");
}

static List<V3> Cut(V3 a, V3 b, V3 c, V3 n, double d)
{
    var p = new[] { a, b, c };
    var s = p.Select(q => V3.Dot(n, q) - d).ToArray();    // signed distances
    var pts = new List<V3>();
    for (int k = 0; k < 3; k++)
    {
        int j = (k + 1) % 3;
        if ((s[k] >= 0) != (s[j] >= 0))                    // a corner on the plane counts as above
            pts.Add(p[k] + (p[j] - p[k]) * (s[k] / (s[k] - s[j])));
    }
    return pts;
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
}`, output: 'crosses: (4, 0, 1.2) to (1.6, 0, 1.2)\nbelow: no segment\ncorner on the plane: (0, 0, 1.2) to (4, 0, 1.2)' },
      { type: 'p', text: 'The rule “on the plane counts as above” matters. Without it, a corner exactly on the plane (very common: floors, tops of walls and sills sit at round heights) could produce one crossing, or three, or the same point twice. With it, every edge either crosses or does not, and each triangle gives exactly zero or two points. A triangle lying in the plane gives nothing, which is right: its neighbours below the plane give its edges instead.' },
      { type: 'h2', text: 'From segments to loops' },
      { type: 'p', text: 'Each crossing triangle gives one segment, in no particular order. To draw a filled outline you need **closed loops**, so the segments have to be joined end to start. If each segment is pointed along **n × (face normal)**, every loop runs counter-clockwise seen from the side the normal points to, and the next segment always starts where the previous one ended. A dictionary from start point to segment then chains them in one pass.' },
      { type: 'code', title: 'SectionLoops.cs', code: cs`
var room = Mesh.Prism(new[] { (0.0, 0.0), (4.0, 0.0), (4.0, 2.0), (2.0, 2.0), (2.0, 4.0), (0.0, 4.0) }, 3);
var up = new V3(0, 0, 1);

foreach (var (name, m, h) in new[] { ("L-shaped room", room, 1.2), ("pyramid", Mesh.Pyramid(4, 3), 1.5) })
{
    var segs = Section(m, up, h);
    var loops = Chain(segs);
    double area = segs.Sum(s => V3.Dot(up, V3.Cross(s.P, s.Q)) / 2);   // shoelace on the segments
    Console.WriteLine($"{name} at z = {h}: {segs.Count} segments, {loops.Count} loop, area {area:0.###} m2");
    foreach (var loop in loops)
        Console.WriteLine("  " + string.Join(" ", loop.Select(p => $"({p.X:0.##}, {p.Y:0.##})")));
}

static List<(V3 P, V3 Q)> Section(Mesh m, V3 n, double d)
{
    var segs = new List<(V3 P, V3 Q)>();
    foreach (var t in m.F)
    {
        var p = new[] { m.V[t.A], m.V[t.B], m.V[t.C] };
        var s = p.Select(q => V3.Dot(n, q) - d).ToArray();
        var pts = new List<V3>();
        for (int k = 0; k < 3; k++)
        {
            int j = (k + 1) % 3;
            if ((s[k] >= 0) != (s[j] >= 0)) pts.Add(p[k] + (p[j] - p[k]) * (s[k] / (s[k] - s[j])));
        }
        if (pts.Count != 2 || (pts[1] - pts[0]).Length < 1e-9) continue;
        var dir = V3.Cross(n, m.Normal(t));                     // the way the loop runs
        segs.Add(V3.Dot(pts[1] - pts[0], dir) >= 0 ? (pts[0], pts[1]) : (pts[1], pts[0]));
    }
    return segs;
}

static List<List<V3>> Chain(List<(V3 P, V3 Q)> segs)
{
    static string Key(V3 p) => $"{p.X:0.000000},{p.Y:0.000000},{p.Z:0.000000}";
    var from = new Dictionary<string, int>();
    for (int i = 0; i < segs.Count; i++) from[Key(segs[i].P)] = i;

    var used = new bool[segs.Count];
    var loops = new List<List<V3>>();
    for (int i = 0; i < segs.Count; i++)
    {
        if (used[i]) continue;
        var loop = new List<V3>();
        for (int j = i; !used[j]; j = from[Key(segs[j].Q)])
        {
            used[j] = true;
            loop.Add(segs[j].P);
        }
        loops.Add(loop);
    }
    return loops;
}

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
}`, output: 'L-shaped room at z = 1.2: 12 segments, 1 loop, area 12 m2\n  (1.6, 0) (4, 0) (4, 0.8) (4, 2) (3.2, 2) (2, 2) (2, 2.8) (2, 4) (1.2, 4) (0, 4) (0, 2.4) (0, 0)\npyramid at z = 1.5: 4 segments, 1 loop, area 4 m2\n  (1, 1) (3, 1) (3, 3) (1, 3)' },
      { type: 'p', text: 'The room’s loop has 12 points rather than 6: each wall is two triangles, so the cut crosses each wall’s diagonal too and adds a point in the middle of every edge. Those points lie on straight lines and can be merged afterwards. The area needs no loops at all: oriented segments are enough for the shoelace sum, which here gives the floor area of 12 m². The pyramid cut halfway up gives a 2 × 2 square, a quarter of its 16 m² base.' },
      { type: 'h2', text: 'Loops, holes and tilted planes' },
      { type: 'ul', items: [
        '**Several loops**: a cut through a U-shaped wall, or through two separate columns, gives several loops. They come out of the same chaining step.',
        '**Holes**: a section through a lift shaft or a hollow-core slab gives an outer loop counter-clockwise and inner loops clockwise. Their signed areas add up to the solid area, just like polygons with holes in the boolean operations lesson.',
        '**Tilted planes**: nothing above assumed a horizontal plane. To draw or measure the loops, express each point in two axes u and v lying in the plane (with u × v = n), which is what the widget does when you tilt it.',
        '**Open meshes**: a gap in the mesh leaves a loop unclosed. Chaining then stops at a segment with no follower; a robust implementation reports it instead of crashing.'
      ] },
      { type: 'note', kind: 'info', text: 'BIM programs usually cut their exact solid representation (the next module’s B-rep) rather than the display mesh, so that a section through a round column gives a true circle and not a polygon. The steps are the same: find where each face meets the plane, then join the pieces into loops.' },
      { type: 'quiz', question: 'A triangle’s corners have signed distances 0.4, −0.2 and −0.7 from the cutting plane. How many of its edges cross the plane?', options: ['Two: the edges from the positive corner to each negative one', 'One', 'Three', 'None'], answer: 0, explain: 'An edge crosses where its two ends have opposite signs. The positive corner pairs with each of the two negative ones; the edge between the two negative corners stays below.' },
      { type: 'quiz', question: 'Why is each section segment oriented along n × (face normal)?', options: ['So every loop runs the same way and each segment starts where the previous one ends', 'To make the segments shorter', 'Because the face normal is always horizontal', 'So the loop runs clockwise'], answer: 0, explain: 'With consistent winding, neighbouring triangles produce segments that point the same way round the loop, so chaining is a simple lookup and the signed area comes out positive for outer loops.' },
      { type: 'exercise', task: 'Cut through the walls of a lift shaft at z = 1: outer walls 3 × 3 m from (0, 0) and inner walls 2.4 × 2.4 m from (0.3, 0.3), both 4 m high, with the inner walls facing into the shaft. Build them as Mesh.Prism for the outer square plus Mesh.Prism for the inner square with every triangle reversed (the floor and roof triangles do not reach z = 1, so only the walls matter here). Print the number of loops, the signed area of each loop and the total.', hint: 'Reuse Section and Chain from SectionLoops.cs. Reverse a triangle (a, b, c) as (a, c, b). The signed area of one loop is Σ ½ n · (p × q) over its consecutive points.', solution: cs`
var outer = Mesh.Box(3, 3, 4);
var inner = Mesh.Prism(new[] { (0.3, 0.3), (2.7, 0.3), (2.7, 2.7), (0.3, 2.7) }, 4);
var shaft = new Mesh();
shaft.V.AddRange(outer.V);
shaft.V.AddRange(inner.V);
shaft.F.AddRange(outer.F);
int off = outer.V.Count;
shaft.F.AddRange(inner.F.Select(t => (t.A + off, t.C + off, t.B + off)));   // reversed: facing into the shaft

var up = new V3(0, 0, 1);
var loops = Chain(Section(shaft, up, 1));
double total = 0;
foreach (var loop in loops)
{
    double a = 0;
    for (int i = 0; i < loop.Count; i++) a += V3.Dot(up, V3.Cross(loop[i], loop[(i + 1) % loop.Count])) / 2;
    total += a;
    Console.WriteLine($"loop of {loop.Count} points: {a:0.###} m2");
}
Console.WriteLine($"{loops.Count} loops, wall area in plan {total:0.###} m2");

static List<(V3 P, V3 Q)> Section(Mesh m, V3 n, double d)
{
    var segs = new List<(V3 P, V3 Q)>();
    foreach (var t in m.F)
    {
        var p = new[] { m.V[t.A], m.V[t.B], m.V[t.C] };
        var s = p.Select(q => V3.Dot(n, q) - d).ToArray();
        var pts = new List<V3>();
        for (int k = 0; k < 3; k++)
        {
            int j = (k + 1) % 3;
            if ((s[k] >= 0) != (s[j] >= 0)) pts.Add(p[k] + (p[j] - p[k]) * (s[k] / (s[k] - s[j])));
        }
        if (pts.Count != 2 || (pts[1] - pts[0]).Length < 1e-9) continue;
        var dir = V3.Cross(n, m.Normal(t));
        segs.Add(V3.Dot(pts[1] - pts[0], dir) >= 0 ? (pts[0], pts[1]) : (pts[1], pts[0]));
    }
    return segs;
}

static List<List<V3>> Chain(List<(V3 P, V3 Q)> segs)
{
    static string Key(V3 p) => $"{p.X:0.000000},{p.Y:0.000000},{p.Z:0.000000}";
    var from = new Dictionary<string, int>();
    for (int i = 0; i < segs.Count; i++) from[Key(segs[i].P)] = i;
    var used = new bool[segs.Count];
    var loops = new List<List<V3>>();
    for (int i = 0; i < segs.Count; i++)
    {
        if (used[i]) continue;
        var loop = new List<V3>();
        for (int j = i; !used[j]; j = from[Key(segs[j].Q)])
        {
            used[j] = true;
            loop.Add(segs[j].P);
        }
        loops.Add(loop);
    }
    return loops;
}

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
}`, output: 'loop of 8 points: 9 m2\nloop of 8 points: -5.76 m2\n2 loops, wall area in plan 3.24 m2' }
    ],
    keyPoints: [
      'Signed distances s = n · p − d tell which corners are above and below the plane.',
      'A crossing edge from P to Q meets the plane at P + (Q − P) · s_P / (s_P − s_Q); each crossing triangle gives one segment.',
      'Count a corner on the plane as above, so every triangle gives exactly zero or two points.',
      'Orient segments along n × (face normal) and chain them end to start into counter-clockwise loops.',
      'The cut area is the shoelace sum over the oriented segments; holes come out clockwise with negative area.'
    ]
  }
];
