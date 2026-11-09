import { Lesson } from '../learn.types';
import { cs } from '../csharp/cs';

export const MATRICES_TRANSFORMS: Lesson[] = [
  // ------------------------------------------------------------------ 1
  {
    slug: 'matrices',
    title: 'Matrices and matrix multiplication',
    summary: 'A matrix is a grid of numbers that moves every point of the plane or of space at once. Read its columns as “where the axes go”, multiply matrices row by column, and use the determinant to see what happens to areas.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'Every time a BIM tool moves, rotates, scales or mirrors something, it multiplies coordinates by a **matrix**: a rectangular grid of numbers. One matrix holds the whole recipe, so the same few lines of code can place a door, rotate a building footprint or turn model coordinates into screen pixels.' },
      { type: 'p', text: 'A 2×2 matrix acts on 2D points. Pick a preset or move the four sliders, and watch the grid, the “F” and the point P all move together.' },
      { type: 'widget', name: 'matrix-2d' },
      { type: 'h2', text: 'A matrix times a point' },
      { type: 'p', text: 'Write the matrix with entries a, c on the top row and b, d on the bottom row, and the point P = (x, y) as a column. Then **x′ = a·x + c·y** and **y′ = b·x + d·y**: each output is one row of the matrix dotted with the point.' },
      { type: 'p', text: 'There is a more useful way to read the same sum: M·P = **x × (first column) + y × (second column)**. The point (1, 0) lands on the first column and (0, 1) on the second. So **the columns are where the X and Y axes go**, and every other point follows, because it is a mix of the two axes. That is what the green and purple arrows in the widget show, and it is how you can write down a matrix just by thinking about where the axes should end up.' },
      { type: 'table', head: ['Transform', 'First column (X goes to)', 'Second column (Y goes to)', 'det'], rows: [
        ['Identity (no change)', '(1, 0)', '(0, 1)', '1'],
        ['Scale by s', '(s, 0)', '(0, s)', 's²'],
        ['Stretch X by 2', '(2, 0)', '(0, 1)', '2'],
        ['Shear: Y leans over by 0.8', '(1, 0)', '(0.8, 1)', '1'],
        ['Rotate by θ', '(cos θ, sin θ)', '(−sin θ, cos θ)', '1'],
        ['Mirror in the Y axis', '(−1, 0)', '(0, 1)', '−1']
      ] },
      { type: 'h2', text: 'Multiplying two matrices' },
      { type: 'p', text: 'To do one transform and then another, multiply their matrices. Entry (i, j) of A·B is **row i of A dotted with column j of B**. The sizes must fit: an m×n matrix can multiply an n×p one, and the result is m×p. A point written as a column is just an n×1 matrix, so the same function handles both.' },
      { type: 'code', title: 'MatrixMultiply.cs', code: cs`
double[,] rotate90 = { { 0, -1 }, { 1, 0 } };
double[,] stretchX = { { 2, 0 }, { 0, 1 } };

Print("Stretch, then rotate (R * S)", Multiply(rotate90, stretchX));
Print("Rotate, then stretch (S * R)", Multiply(stretchX, rotate90));

double[,] p = { { 1 }, { 1 } };          // the point (1, 1) as a 2x1 column
Print("(R * S) * p", Multiply(Multiply(rotate90, stretchX), p));

static double[,] Multiply(double[,] a, double[,] b)
{
    int n = a.GetLength(0), m = a.GetLength(1), q = b.GetLength(1);
    if (b.GetLength(0) != m)
        throw new ArgumentException($"Cannot multiply {n}x{m} by {b.GetLength(0)}x{q}");
    var c = new double[n, q];
    for (int i = 0; i < n; i++)
        for (int j = 0; j < q; j++)
            for (int k = 0; k < m; k++)
                c[i, j] += a[i, k] * b[k, j];      // row i of a, dotted with column j of b
    return c;
}

static void Print(string title, double[,] m)
{
    Console.WriteLine(title + ":");
    for (int i = 0; i < m.GetLength(0); i++)
    {
        var row = new string[m.GetLength(1)];
        for (int j = 0; j < row.Length; j++) row[j] = m[i, j].ToString("0.###").PadLeft(3);
        Console.WriteLine("  [" + string.Join(" ", row) + " ]");
    }
}`, output: 'Stretch, then rotate (R * S):\n  [  0  -1 ]\n  [  2   0 ]\nRotate, then stretch (S * R):\n  [  0  -2 ]\n  [  1   0 ]\n(R * S) * p:\n  [ -1 ]\n  [  2 ]' },
      { type: 'p', text: 'The two products are different matrices. **Matrix multiplication is not commutative**: A·B is usually not B·A, just as “stretch, then rotate” is not “rotate, then stretch”. It is, however, **associative**: (A·B)·C = A·(B·C). That is what lets a program multiply a long chain of transforms into one matrix once, then apply that single matrix to thousands of points.' },
      { type: 'note', kind: 'info', text: 'In M·P the matrix nearest the point acts first. In R·S·P, S is applied first, then R. The Composing transforms lesson comes back to this, because getting it backwards is the most common transform bug.' },
      { type: 'h2', text: 'The determinant' },
      { type: 'p', text: 'For a 2×2 matrix, **det = a·d − b·c**. It is the factor by which the matrix scales every area: the unit square becomes a parallelogram of area |det|, and every room, slab and hatch scales the same way. The sign carries meaning too:' },
      { type: 'ul', items: [
        '**det > 0**: shapes keep their orientation. Rotations have det = 1, so they keep areas exactly.',
        '**det < 0**: the transform includes a mirror. Outlines reverse their winding, and an “F” reads backwards.',
        '**det = 0**: the plane is squashed onto a line (or a point). Areas become 0, and the matrix has no inverse: you cannot undo it.'
      ] },
      { type: 'code', title: 'ScaleArea.cs', code: cs`
var room = new V2[] { new(0, 0), new(6, 0), new(6, 4), new(0, 4) };
var matrices = new (string Name, double A, double B, double C, double D)[]
{
    ("Scale x2", 2, 0, 0, 2),
    ("Shear 0.5", 1, 0, 0.5, 1),
    ("Mirror in Y", -1, 0, 0, 1),
    ("Squash", 1, 0.5, 2, 1)
};

Console.WriteLine($"Room: {Area(room)} m2");
foreach (var (name, a, b, c, d) in matrices)
{
    var moved = room.Select(p => new V2(a * p.X + c * p.Y, b * p.X + d * p.Y)).ToArray();
    Console.WriteLine($"{name,-12} det {a * d - b * c,3}   signed area {Area(moved),4} m2");
}

static double Area(V2[] p)
{
    double s = 0;
    for (int i = 0; i < p.Length; i++)
    {
        V2 u = p[i], v = p[(i + 1) % p.Length];
        s += u.X * v.Y - v.X * u.Y;
    }
    return s / 2;
}

readonly record struct V2(double X, double Y)
{
    public static V2 operator +(V2 a, V2 b) => new(a.X + b.X, a.Y + b.Y);
    public static V2 operator -(V2 a, V2 b) => new(a.X - b.X, a.Y - b.Y);
    public static V2 operator *(V2 v, double k) => new(v.X * k, v.Y * k);
    public double Length => Math.Sqrt(X * X + Y * Y);
    static string F(double v) => Math.Abs(v) < 5e-4 ? "0" : v.ToString("0.###");
    public override string ToString() => $"({F(X)}, {F(Y)})";
}`, output: 'Room: 24 m2\nScale x2     det   4   signed area   96 m2\nShear 0.5    det   1   signed area   24 m2\nMirror in Y  det  -1   signed area  -24 m2\nSquash       det   0   signed area    0 m2' },
      { type: 'p', text: 'Every signed area is exactly det × 24. The mirror gives −24: the same size, but the corners now run clockwise, which is the shoelace formula’s way of saying “mirrored”.' },
      { type: 'quiz', question: 'A matrix has columns (0, 1) and (−1, 0). Where does the point (3, 0) go?', options: ['(0, 3)', '(3, 0)', '(0, −3)', '(−3, 0)'], answer: 0, explain: 'M·(3, 0) = 3 × (first column) + 0 × (second column) = 3 × (0, 1) = (0, 3). This matrix is a 90° counterclockwise rotation.' },
      { type: 'quiz', question: 'A transform has det = −0.5. What does it do to a 10 m² room?', options: [
        'Mirrors it and makes it 5 m²',
        'Makes it −5 m², which is impossible',
        'Rotates it and makes it 5 m²',
        'Squashes it to a line'
      ], answer: 0, explain: 'The size of det is the area factor (10 × 0.5 = 5 m²), and the negative sign means the transform includes a mirror.' },
      { type: 'exercise', task: 'Write `Det2` for a 2×2 matrix given as a, b, c, d (columns (a, b) and (c, d)), and use it to classify these: a 30° rotation, a 1:100 drawing scale (0.01 on the diagonal), a mirror in the X axis, the matrix with columns (1, 0.5) and (2, 1), and a shear with columns (1, 0) and (0.5, 1). Print whether each keeps areas, scales them, mirrors, or squashes.', hint: 'Compare |det| with a small tolerance before you look at its sign, so that a squash is caught first.', solution: cs`
double c30 = Math.Cos(Math.PI / 6), s30 = Math.Sin(Math.PI / 6);
var tests = new (string Name, double A, double B, double C, double D)[]
{
    ("Rotate 30", c30, s30, -s30, c30),
    ("Drawing 1:100", 0.01, 0, 0, 0.01),
    ("Mirror in X", 1, 0, 0, -1),
    ("Columns (1,0.5) (2,1)", 1, 0.5, 2, 1),
    ("Shear", 1, 0, 0.5, 1)
};

foreach (var (name, a, b, c, d) in tests)
{
    double det = Det2(a, b, c, d);
    string kind =
        Math.Abs(det) < 1e-9 ? "squashes onto a line, no inverse" :
        det < 0 ? $"mirrors, areas x {Math.Abs(det):0.####}" :
        Math.Abs(det - 1) < 1e-9 ? "keeps areas" :
        $"scales areas by {det:0.####}";
    Console.WriteLine($"{name}: {kind}");
}

static double Det2(double a, double b, double c, double d) => a * d - b * c;`, output: 'Rotate 30: keeps areas\nDrawing 1:100: scales areas by 0.0001\nMirror in X: mirrors, areas x 1\nColumns (1,0.5) (2,1): squashes onto a line, no inverse\nShear: keeps areas' }
    ],
    keyPoints: [
      'A matrix times a point is a mix of its columns: the columns are where the axes go.',
      'Entry (i, j) of A·B is row i of A dotted with column j of B; an m×n matrix multiplies an n×p one.',
      'Matrix multiplication is associative but not commutative: A·B ≠ B·A in general.',
      'In M·P the matrix nearest the point acts first.',
      'The determinant is the area (or volume) factor: negative means mirrored, zero means squashed and not invertible.'
    ]
  },

  // ------------------------------------------------------------------ 2
  {
    slug: 'rotation',
    title: 'Rotation in 2D, 3D and about any axis',
    summary: 'Rotate a point in the plane with cos and sin, rotate about a pivot by moving it to the origin first, and in 3D rotate about X, Y, Z or any axis with Rodrigues’ formula.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'Rotating a building footprint to true north, swinging a door, turning a family instance, tilting a window about its sill: rotation is the transform BIM software uses most. In 2D it is one angle. In 3D it needs an axis as well, and the direction of that axis decides which way “positive” turns.' },
      { type: 'widget', name: 'rotation' },
      { type: 'h2', text: 'Rotation in 2D' },
      { type: 'p', text: 'Use the columns idea from the last lesson. Turning by θ sends the X axis to (cos θ, sin θ) and the Y axis to (−sin θ, cos θ), a quarter turn further on. Those are the two columns, so:' },
      { type: 'p', text: '**x′ = x·cos θ − y·sin θ** and **y′ = x·sin θ + y·cos θ**.' },
      { type: 'p', text: 'A positive angle turns **counterclockwise** when you look down on the XY plane with Z pointing at you. Plans are drawn that way, which is why a positive rotation in most BIM tools turns an instance counterclockwise in plan.' },
      { type: 'h2', text: 'Rotating about a pivot' },
      { type: 'p', text: 'The formula turns points about the origin. To turn about another point C, such as a building corner or a door hinge, **move C to the origin, rotate, and move back**: P′ = C + R·(P − C). In the widget, drag C and watch Q circle round it.' },
      { type: 'code', title: 'RotateAbout.cs', code: cs`
var pivot = new V2(2, 3);                    // the building corner that stays put
var corners = new V2[] { new(2, 3), new(12, 3), new(12, 9), new(2, 9) };

foreach (var c in corners)
    Console.WriteLine($"{c} -> {RotateAbout(c, pivot, 30)}");

static V2 Rotate(V2 v, double degrees)
{
    double t = degrees * Math.PI / 180, c = Math.Cos(t), s = Math.Sin(t);
    return new(v.X * c - v.Y * s, v.X * s + v.Y * c);
}

static V2 RotateAbout(V2 p, V2 pivot, double degrees) => pivot + Rotate(p - pivot, degrees);

readonly record struct V2(double X, double Y)
{
    public static V2 operator +(V2 a, V2 b) => new(a.X + b.X, a.Y + b.Y);
    public static V2 operator -(V2 a, V2 b) => new(a.X - b.X, a.Y - b.Y);
    public static V2 operator *(V2 v, double k) => new(v.X * k, v.Y * k);
    public double Length => Math.Sqrt(X * X + Y * Y);
    static string F(double v) => Math.Abs(v) < 5e-4 ? "0" : v.ToString("0.###");
    public override string ToString() => $"({F(X)}, {F(Y)})";
}`, output: '(2, 3) -> (2, 3)\n(12, 3) -> (10.66, 8)\n(12, 9) -> (7.66, 13.196)\n(2, 9) -> (-1, 8.196)' },
      { type: 'note', kind: 'tip', text: 'Math.Cos and Math.Sin take **radians**. Convert with θ × π ÷ 180 in one place (a helper, as here) and keep degrees everywhere else, because degrees are what users type and what files such as IFC usually store.' },
      { type: 'h2', text: 'Rotation in 3D about X, Y and Z' },
      { type: 'p', text: 'Rotating about the Z axis is the 2D rotation with z left alone. Rotating about X or Y works the same way in the other two planes. The rows of each 3×3 matrix are:' },
      { type: 'table', head: ['About', 'Row 1', 'Row 2', 'Row 3', 'Turns'], rows: [
        ['X', '1, 0, 0', '0, cos θ, −sin θ', '0, sin θ, cos θ', 'Y towards Z'],
        ['Y', 'cos θ, 0, sin θ', '0, 1, 0', '−sin θ, 0, cos θ', 'Z towards X'],
        ['Z', 'cos θ, −sin θ, 0', 'sin θ, cos θ, 0', '0, 0, 1', 'X towards Y']
      ] },
      { type: 'p', text: 'The minus sign sits in a different place for Y because the cycle runs X → Y → Z → X: turning about Y takes Z towards X, not X towards Z. All three follow the **right-hand rule**: point your right thumb along the axis, and your fingers curl the way a positive angle turns.' },
      { type: 'h2', text: 'Rotation about any axis' },
      { type: 'p', text: 'A hinge is rarely exactly on a coordinate axis. To rotate a vector v by θ about a **unit** axis k, split v into a part along k, which does not move, and a part at right angles to k, which turns like a 2D rotation. The result is **Rodrigues’ formula**:' },
      { type: 'p', text: '**v′ = v·cos θ + (k × v)·sin θ + k·(k·v)·(1 − cos θ)**' },
      { type: 'p', text: 'As with the pivot, an axis that does not pass through the origin is handled by subtracting a point on it first and adding it back afterwards.' },
      { type: 'code', title: 'RotateAboutAxis.cs', code: cs`
// A tilt-and-turn window tilts about its sill: an axis along X, through (0, 0, 1)
var sillPoint = new V3(0, 0, 1);
var sillDir = new V3(1, 0, 0);
var topCorner = new V3(1.2, 0, 2.4);
Console.WriteLine($"Top corner tilted 10 deg: {RotateAbout(topCorner, sillPoint, sillDir, 10)}");

// 120 deg about (1, 1, 1) cycles the axes: X -> Y -> Z -> X
var diagonal = new V3(1, 1, 1).Normalized();
foreach (var v in new V3[] { new(1, 0, 0), new(0, 1, 0), new(0, 0, 1) })
    Console.WriteLine($"{v} -> {Rotate(v, diagonal, 120)}");

static V3 Rotate(V3 v, V3 k, double degrees)          // Rodrigues; k must be a unit vector
{
    double t = degrees * Math.PI / 180, c = Math.Cos(t), s = Math.Sin(t);
    return v * c + V3.Cross(k, v) * s + k * (V3.Dot(k, v) * (1 - c));
}

static V3 RotateAbout(V3 p, V3 pointOnAxis, V3 axis, double degrees) =>
    pointOnAxis + Rotate(p - pointOnAxis, axis.Normalized(), degrees);

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
}`, output: 'Top corner tilted 10 deg: (1.2, -0.243, 2.379)\n(1, 0, 0) -> (0, 1, 0)\n(0, 1, 0) -> (0, 0, 1)\n(0, 0, 1) -> (1, 0, 0)' },
      { type: 'p', text: 'The top of the window moves to −Y as it tilts: by the right-hand rule, a positive turn about +X carries +Z towards −Y. If the room is on the +Y side, tilt by −10° instead, or reverse the axis direction.' },
      { type: 'h2', text: 'What every rotation matrix has in common' },
      { type: 'ul', items: [
        'Its columns are unit vectors at right angles to each other (the turned axes). Such a matrix is called **orthonormal**.',
        'Lengths and angles do not change, and det = +1.',
        'Its inverse is its **transpose** Rᵀ: swap rows and columns to undo the turn, with no division needed.'
      ] },
      { type: 'note', kind: 'warn', text: 'Multiplying many small rotations together slowly loses these properties to rounding: the columns drift away from unit length and from right angles, and objects begin to shear. Store the angle (or, as the next module shows, a quaternion) and rebuild the matrix, or re-orthonormalise it now and then.' },
      { type: 'quiz', question: 'Rotating (1, 0) by 90° counterclockwise gives…', options: ['(0, 1)', '(0, −1)', '(−1, 0)', '(1, 1)'], answer: 0, explain: 'x′ = 1·cos 90° − 0 = 0 and y′ = 1·sin 90° + 0 = 1. The X axis turns onto the Y axis.' },
      { type: 'quiz', question: 'How do you rotate a door leaf about its hinge H?', options: [
        'Subtract H, rotate, then add H back',
        'Rotate the leaf about the origin; the hinge does not matter',
        'Rotate H instead of the leaf',
        'Add H, rotate, then subtract H'
      ], answer: 0, explain: 'The rotation formula turns points about the origin. Moving H to the origin first, and back afterwards, makes H the centre of the turn: P′ = H + R·(P − H).' },
      { type: 'exercise', task: 'Build the 3×3 matrix for a 40° turn about the axis (0, 0.6, 0.8) by rotating the three unit axes with Rodrigues’ formula (they are its columns). Check that the columns have length 1, are at right angles to each other, and that det = (X × Y)·Z is 1.', hint: 'Reuse `Rotate` from RotateAboutAxis.cs. The axis (0, 0.6, 0.8) already has length 1.', solution: cs`
var k = new V3(0, 0.6, 0.8);
V3 x = Rotate(new V3(1, 0, 0), k, 40);
V3 y = Rotate(new V3(0, 1, 0), k, 40);
V3 z = Rotate(new V3(0, 0, 1), k, 40);
Console.WriteLine($"Columns: {x} {y} {z}");

bool unit = new[] { x, y, z }.All(c => Math.Abs(c.Length - 1) < 1e-12);
bool square = Math.Abs(V3.Dot(x, y)) < 1e-12 && Math.Abs(V3.Dot(y, z)) < 1e-12 && Math.Abs(V3.Dot(z, x)) < 1e-12;
Console.WriteLine($"Unit columns: {unit}, at right angles: {square}");
Console.WriteLine($"det = {V3.Dot(V3.Cross(x, y), z):F6}");

static V3 Rotate(V3 v, V3 k, double degrees)
{
    double t = degrees * Math.PI / 180, c = Math.Cos(t), s = Math.Sin(t);
    return v * c + V3.Cross(k, v) * s + k * (V3.Dot(k, v) * (1 - c));
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
}`, output: 'Columns: (0.766, 0.514, -0.386) (-0.514, 0.85, 0.112) (0.386, 0.112, 0.916)\nUnit columns: True, at right angles: True\ndet = 1.000000' }
    ],
    keyPoints: [
      '2D: x′ = x·cos θ − y·sin θ, y′ = x·sin θ + y·cos θ; positive is counterclockwise in plan.',
      'To rotate about a pivot C: P′ = C + R·(P − C).',
      'In 3D, rotations about X, Y and Z follow the right-hand rule; the cycle X → Y → Z puts the minus sign of the Y matrix in a different place.',
      'Rodrigues’ formula rotates about any unit axis: v·cos θ + (k × v)·sin θ + k·(k·v)·(1 − cos θ).',
      'Rotation matrices are orthonormal with det = 1, and their inverse is their transpose.'
    ]
  },

  // ------------------------------------------------------------------ 3
  {
    slug: 'homogeneous-transforms',
    title: 'Homogeneous coordinates and 4×4 transforms',
    summary: 'A 3×3 matrix can rotate and scale but cannot move. Add a fourth coordinate w and a 4×4 matrix does all three; w = 1 marks a point and w = 0 a direction, which is why normals and offsets must be transformed differently from positions.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'A matrix always maps the origin to the origin: M·(0, 0, 0) = (0, 0, 0). So no 3×3 matrix can **move** (translate) anything, and placing a family instance at (5, 3, 0) needs something more. The standard trick is to give every point a fourth coordinate, **w**, and use 4×4 matrices. These are **homogeneous coordinates**.' },
      { type: 'widget', name: 'homogeneous' },
      { type: 'h2', text: 'The 4×4 transform' },
      { type: 'p', text: 'A transform that rotates or scales with a 3×3 matrix R and then moves by t = (tx, ty, tz) is written as one 4×4 matrix. R fills the top-left block, t is the last column, and the bottom row is 0, 0, 0, 1:' },
      { type: 'table', head: ['', 'x', 'y', 'z', 'w'], rows: [
        ['x′', 'R₁₁', 'R₁₂', 'R₁₃', 'tx'],
        ['y′', 'R₂₁', 'R₂₂', 'R₂₃', 'ty'],
        ['z′', 'R₃₁', 'R₃₂', 'R₃₃', 'tz'],
        ['w′', '0', '0', '0', '1']
      ] },
      { type: 'p', text: 'Multiply it by (x, y, z, w) and the move is added **w times**: x′ = R₁₁x + R₁₂y + R₁₃z + tx·w. The columns still mean something: the first three are where the X, Y and Z axes go, and the last is where the origin goes. That is exactly what a BIM placement stores: Revit’s `Transform` has `BasisX`, `BasisY`, `BasisZ` and `Origin`, and an IFC `IfcAxis2Placement3D` stores a location plus two axis directions.' },
      { type: 'h2', text: 'Points have w = 1, directions have w = 0' },
      { type: 'ul', items: [
        '**A point** (a corner, an insertion point, a hinge) has w = 1, so it is moved.',
        '**A direction** (a face normal, an axis, an offset, a velocity) has w = 0, so it is only turned and scaled. Moving a building does not change which way its walls face.',
        'The difference of two points has w = 1 − 1 = 0: it is a direction, and the move cancels out.',
        'A point plus a direction has w = 1: still a point. Adding two points (w = 2) has no meaning on its own, which is a useful sanity check.'
      ] },
      { type: 'p', text: 'Libraries usually give two methods instead of making you write w. In the code below they are `Point` and `Direction`; in Revit they are `OfPoint` and `OfVector`.' },
      { type: 'code', title: 'Homogeneous.cs', code: cs`
// A column family placed at (5, 3, 0) and turned 90 deg
M4 place = M4.Move(5, 3, 0) * M4.RotateZ(90);

var corner = new V3(0.2, 0.1, 0);       // a corner of the column, in its own coordinates
var faceNormal = new V3(1, 0, 0);       // the way its +X face points

Console.WriteLine($"Corner (w = 1):       {place.Point(corner)}");
Console.WriteLine($"Normal (w = 0):       {place.Direction(faceNormal)}");
Console.WriteLine($"Normal used as point: {place.Point(faceNormal)}  <- wrong");

// The step between two points is a direction: the move cancels out
var a = new V3(0, 0, 0);
var b = new V3(0.4, 0, 0);
Console.WriteLine($"Width: {place.Point(b) - place.Point(a)} = {place.Direction(b - a)}");

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
}`, output: 'Corner (w = 1):       (4.9, 3.2, 0)\nNormal (w = 0):       (0, 1, 0)\nNormal used as point: (5, 4, 0)  <- wrong\nWidth: (0, 0.4, 0) = (0, 0.4, 0)' },
      { type: 'note', kind: 'info', text: 'This course writes points as **columns** and multiplies M·p, so the move is in the last column. Some libraries use **rows** instead: .NET’s `System.Numerics.Matrix4x4` and DirectX compute p·M, keep the move in the bottom row (M41, M42, M43) and multiply chains in the opposite order. The numbers are the transpose of ours. Check which one a library uses before copying matrices between them.' },
      { type: 'h2', text: 'Normals under non-uniform scale' },
      { type: 'p', text: 'Treating a normal as a direction is right for rotations and moves. With a **non-uniform** scale, though, it fails: stretch a 45° wall face to twice its length in X, and its old normal, stretched the same way, is no longer at right angles to the face. Normals must be transformed by the **inverse transpose** of the 3×3 part. For a scale that simply means dividing by the scale factors instead of multiplying.' },
      { type: 'code', title: 'NormalScale.cs', code: cs`
// A wall face at 45 deg in plan, stretched to twice its length in X
M4 stretch = M4.Scale(2, 1, 1);
var along = new V3(1, -1, 0);                 // runs along the face
var normal = new V3(1, 1, 0).Normalized();    // at right angles to it

V3 newAlong = stretch.Direction(along).Normalized();
V3 naive = stretch.Direction(normal).Normalized();
V3 right = new V3(normal.X / 2, normal.Y / 1, normal.Z / 1).Normalized();   // inverse transpose: divide

Console.WriteLine($"Face now runs along {newAlong}");
Console.WriteLine($"Naive normal {naive}: {Angle(naive, newAlong):F2} deg to the face");
Console.WriteLine($"Inverse-transpose normal {right}: {Angle(right, newAlong):F2} deg to the face");

static double Angle(V3 a, V3 b) => Math.Acos(V3.Dot(a, b)) * 180 / Math.PI;

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
}`, output: 'Face now runs along (0.894, -0.447, 0)\nNaive normal (0.894, 0.447, 0): 53.13 deg to the face\nInverse-transpose normal (0.447, 0.894, 0): 90.00 deg to the face' },
      { type: 'p', text: 'For rotations and uniform scales the inverse transpose points the same way as the matrix itself, which is why the shortcut usually works. Placements in BIM are almost always rotation plus move, but scaled blocks, stretched imported meshes and family types with non-uniform scale do occur, and that is where shading and clash normals go wrong.' },
      { type: 'quiz', question: 'A transform moves by (10, 0, 0) and turns 90° about Z. What happens to the direction (1, 0, 0)?', options: ['It becomes (0, 1, 0)', 'It becomes (10, 1, 0)', 'It becomes (11, 0, 0)', 'It stays (1, 0, 0)'], answer: 0, explain: 'A direction has w = 0, so the move is ignored and only the turn applies: X turns onto Y.' },
      { type: 'quiz', question: 'Which of these should be transformed with w = 0?', options: ['A face normal', 'A door’s hinge point', 'A survey point', 'A column’s insertion point'], answer: 0, explain: 'A normal is a direction: it says which way a face points, not where it is. Moving the building must not change it.' },
      { type: 'exercise', task: 'A door family is placed at (8, 2, 0) and turned 180°. In the family, the hinge is at (0, 0, 0), the handle at (0.9, 0.05, 1) and the leaf opens towards (0, 1, 0). Print the hinge, the handle and the opening direction in world coordinates.', hint: 'Build the placement as Move · RotateZ, then use `Point` for the hinge and the handle and `Direction` for the opening direction.', solution: cs`
M4 place = M4.Move(8, 2, 0) * M4.RotateZ(180);

Console.WriteLine($"Hinge:  {place.Point(new V3(0, 0, 0))}");
Console.WriteLine($"Handle: {place.Point(new V3(0.9, 0.05, 1))}");
Console.WriteLine($"Opens towards {place.Direction(new V3(0, 1, 0))}");

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
}`, output: 'Hinge:  (8, 2, 0)\nHandle: (7.1, 1.95, 1)\nOpens towards (0, -1, 0)' }
    ],
    keyPoints: [
      'No 3×3 matrix can move the origin; a 4×4 matrix with the move in its last column can.',
      'The columns of a placement are the instance’s X, Y and Z axes and its origin.',
      'Points have w = 1 and are moved; directions, normals and offsets have w = 0 and are not.',
      'Some libraries use row vectors (p·M) with the move in the bottom row: the transpose of the column form.',
      'Under non-uniform scale, transform normals with the inverse transpose (for a scale, divide instead of multiply).'
    ]
  },

  // ------------------------------------------------------------------ 4
  {
    slug: 'composing-transforms',
    title: 'Composing transforms: order and inverses',
    summary: 'Chain transforms by multiplying their matrices, read right to left. Scale, then rotate, then move is the usual order. Undo a chain with the inverses in reverse order, and invert a rigid placement cheaply with the transpose.',
    minutes: 13,
    blocks: [
      { type: 'p', text: 'Real placements are chains: scale a block, turn it, move it into position, then carry it along with its storey and its building. Multiplying the matrices gives one matrix for the whole chain. The catch is the **order**, because, as the matrices lesson showed, A·B is usually not B·A.' },
      { type: 'widget', name: 'compose' },
      { type: 'h2', text: 'Read right to left' },
      { type: 'p', text: 'In M = B·A, a point is multiplied as B·(A·p): **A acts first**, then B. The transform written nearest the point happens first. In the widget, the blue F is B·A and the orange outline is the other order, A·B. “Rotate 90°, then move (2, 1)” and “move (2, 1), then rotate 90°” end up in different places, because in the second case the move itself gets rotated.' },
      { type: 'code', title: 'Order.cs', code: cs`
var p = new V3(1, 0, 0);
M4 rotate = M4.RotateZ(90), move = M4.Move(2, 1, 0);

Console.WriteLine($"Rotate, then move (move * rotate): {(move * rotate).Point(p)}");
Console.WriteLine($"Move, then rotate (rotate * move): {(rotate * move).Point(p)}");

// The usual order for placing an object: scale, then rotate, then move
M4 place = M4.Move(10, 5, 0) * M4.RotateZ(30) * M4.Scale(2, 2, 2);
Console.WriteLine($"Scaled, turned and placed: {place.Point(p)}");

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
}`, output: 'Rotate, then move (move * rotate): (2, 2, 0)\nMove, then rotate (rotate * move): (-1, 3, 0)\nScaled, turned and placed: (11.732, 6, 0)' },
      { type: 'h2', text: 'Scale, rotate, move' },
      { type: 'p', text: 'The standard placement is **M = T·R·S**: scale first, then rotate, then move (translate). Scaling and rotating happen while the object is still at its own origin, so they act about the insertion point, and the move comes last so it is not itself scaled or turned. Swap any two and the result changes: T·S would scale the move, and R·T would swing the object round the world origin.' },
      { type: 'p', text: 'Some pairs do commute: two rotations about the same axis, two moves, a uniform scale with a rotation, or two scales. In the widget, try a stretch with a mirror in the Y axis. They are the exceptions; assume order matters unless you know otherwise.' },
      { type: 'h2', text: 'Inverses: undo in reverse order' },
      { type: 'p', text: 'The inverse M⁻¹ undoes M: M⁻¹·M = I, the identity. For a chain, **(B·A)⁻¹ = A⁻¹·B⁻¹**: undo the last step first, just as you take off your shoes before your socks. Each simple transform has an easy inverse: move by −t, rotate by −θ, scale by 1/s, and a mirror is its own inverse.' },
      { type: 'p', text: 'Most BIM placements are **rigid**: rotation plus move, no scale. For those you never need a general matrix inverse. With M = [R | t], the inverse is **[Rᵀ | −Rᵀ·t]**: transpose the rotation, and rotate the negated move by it. It is exact, cheap and never divides by a near-zero determinant.' },
      { type: 'code', title: 'RigidInverse.cs', code: cs`
M4 place = M4.Move(10, 5, 0) * M4.RotateZ(30);
M4 inverse = RigidInverse(place);

var local = new V3(1.5, 0.5, 0);
V3 world = place.Point(local);
Console.WriteLine($"Local {local} -> world {world} -> back {inverse.Point(world)}");
Console.WriteLine($"inverse * place is the identity: {IsIdentity(inverse * place)}");

static M4 RigidInverse(M4 m)            // rotation + move only: the inverse is [R^T | -R^T t]
{
    var r = M4.Identity();
    for (int i = 0; i < 3; i++)
        for (int j = 0; j < 3; j++) r.A[i, j] = m.A[j, i];          // transpose the rotation
    for (int i = 0; i < 3; i++)
        r.A[i, 3] = -(r.A[i, 0] * m.A[0, 3] + r.A[i, 1] * m.A[1, 3] + r.A[i, 2] * m.A[2, 3]);
    return r;
}

static bool IsIdentity(M4 m, double eps = 1e-12)
{
    for (int i = 0; i < 4; i++)
        for (int j = 0; j < 4; j++)
            if (Math.Abs(m.A[i, j] - (i == j ? 1 : 0)) > eps) return false;
    return true;
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
}`, output: 'Local (1.5, 0.5, 0) -> world (11.049, 6.183, 0) -> back (1.5, 0.5, 0)\ninverse * place is the identity: True' },
      { type: 'note', kind: 'warn', text: 'Do not apply an edit as “multiply the current matrix by a small extra rotation” thousands of times, for example while a user drags a rotate grip. Rounding errors build up and the matrix stops being a pure rotation. Keep the angle and position as the source of truth and rebuild the matrix from them.' },
      { type: 'quiz', question: 'In M = T·R·S, which transform is applied to a point first?', options: ['S, the scale', 'T, the move', 'R, the rotation', 'All at once, so order does not matter'], answer: 0, explain: 'M·p = T·(R·(S·p)): the matrix nearest the point acts first, so the scale happens first and the move last.' },
      { type: 'quiz', question: 'A placement is P = T·R. What is P⁻¹?', options: ['R⁻¹·T⁻¹', 'T⁻¹·R⁻¹', 'T·R⁻¹', 'R·T'], answer: 0, explain: 'Undo in reverse order: first take away the move (T⁻¹ acts first), then undo the turn. Written as a product, that is R⁻¹·T⁻¹.' },
      { type: 'exercise', task: 'Build “rotate 90° about the pivot (4, 2, 0)” as one matrix, T·R·T⁻¹, where T moves by the pivot. Apply it to (4, 2, 0), (6, 2, 0) and (4, 5, 0).', hint: 'T⁻¹ moves the pivot to the origin (it acts first), R turns, and T moves it back. The pivot itself must not move.', solution: cs`
var pivot = new V3(4, 2, 0);
M4 about = M4.Move(pivot.X, pivot.Y, pivot.Z) * M4.RotateZ(90) * M4.Move(-pivot.X, -pivot.Y, -pivot.Z);

foreach (var p in new V3[] { new(4, 2, 0), new(6, 2, 0), new(4, 5, 0) })
    Console.WriteLine($"{p} -> {about.Point(p)}");

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
}`, output: '(4, 2, 0) -> (4, 2, 0)\n(6, 2, 0) -> (4, 4, 0)\n(4, 5, 0) -> (1, 2, 0)' }
    ],
    keyPoints: [
      'In M = B·A, A acts first: read a chain of transforms from right to left.',
      'Place objects with M = T·R·S: scale, then rotate, then move.',
      'Only a few pairs commute; assume order matters.',
      '(B·A)⁻¹ = A⁻¹·B⁻¹: undo the last step first.',
      'A rigid transform [R | t] has the cheap, exact inverse [Rᵀ | −Rᵀ·t].'
    ]
  },

  // ------------------------------------------------------------------ 5
  {
    slug: 'local-world',
    title: 'Local vs world: families, instances and nested placement',
    summary: 'A family is drawn once in its own local coordinates; each instance stores a placement that maps local to world. Nested families multiply placements down the chain, and the inverse takes world points back into an object’s own coordinates.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'A door family, a desk block or a light fixture type is modelled once, around its own origin, in **local coordinates**: the door’s hinge at (0, 0, 0), its width along local X. Every instance in the project stores only a **placement**, a transform from that local space to the **world** (project) space. A hundred doors share one geometry and keep a hundred small matrices.' },
      { type: 'widget', name: 'local-world' },
      { type: 'h2', text: 'Local to world' },
      { type: 'p', text: '**world = Placement · local**. The placement’s columns are the instance’s own X, Y and Z axes, seen in the world, plus its origin. Revit exposes this as `FamilyInstance.GetTransform()`, with `BasisX`, `BasisY`, `BasisZ` and `Origin`. IFC stores each element’s `ObjectPlacement` as an `IfcLocalPlacement`, a position and axes **relative to** another placement.' },
      { type: 'h2', text: 'Nested placement' },
      { type: 'p', text: 'Placements nest. A chair inside a desk family is placed relative to the desk, the desk relative to its storey, the storey relative to the building and the building relative to the site. To get world coordinates, **multiply down the chain**, outermost on the left:' },
      { type: 'p', text: '**world = Building · Storey · Desk · Chair · local**' },
      { type: 'p', text: 'This is why IFC placements form a chain through `PlacementRelTo`, and why moving a storey up by 100 mm moves everything on it without touching a single element. In the widget, turn the desk and the chair turns with it, while its position inside the desk stays the same.' },
      { type: 'code', title: 'NestedPlacement.cs', code: cs`
M4 storey = M4.Move(0, 0, 3.6);                       // level 2, in the building
M4 desk = M4.Move(10, 4, 0) * M4.RotateZ(30);         // the desk instance, on the storey
M4 chair = M4.Move(1.2, -0.7, 0);                     // the chair, nested in the desk family

var seatCorner = new V3(0.4, 0.4, 0.45);              // in the chair's own coordinates
M4 chairToWorld = storey * desk * chair;

Console.WriteLine($"In the desk:   {chair.Point(seatCorner)}");
Console.WriteLine($"On the storey: {(desk * chair).Point(seatCorner)}");
Console.WriteLine($"In the world:  {chairToWorld.Point(seatCorner)}");
Console.WriteLine($"Chair faces    {chairToWorld.Direction(new V3(0, 1, 0))}");

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
}`, output: 'In the desk:   (1.6, -0.3, 0.45)\nOn the storey: (11.536, 4.54, 0.45)\nIn the world:  (11.536, 4.54, 4.05)\nChair faces    (-0.5, 0.866, 0)' },
      { type: 'h2', text: 'World to local' },
      { type: 'p', text: 'Going the other way answers many everyday questions: is this clicked point on the desk? Which side of the wall is that pipe? Is this point inside the room’s bounding box? Bring the world point into the object’s own coordinates with the **inverse placement**, and the test becomes simple there, because in local coordinates the desk is just 0 ≤ x ≤ 2.4 and 0 ≤ y ≤ 1.2. For a nested object, apply the inverses in reverse order: Chair⁻¹ · Desk⁻¹ · world.' },
      { type: 'code', title: 'WorldToLocal.cs', code: cs`
M4 desk = M4.Move(10, 4, 3.6) * M4.RotateZ(30);
M4 toDesk = RigidInverse(desk);

foreach (var w in new V3[] { new(11, 5, 4.35), new(9, 6, 4.35) })
{
    V3 p = toDesk.Point(w);
    bool over = p.X >= 0 && p.X <= 2.4 && p.Y >= 0 && p.Y <= 1.2;
    Console.WriteLine($"{w} is {p} in desk coordinates: {(over ? "over the desk" : "not over the desk")}");
}

static M4 RigidInverse(M4 m)
{
    var r = M4.Identity();
    for (int i = 0; i < 3; i++)
        for (int j = 0; j < 3; j++) r.A[i, j] = m.A[j, i];
    for (int i = 0; i < 3; i++)
        r.A[i, 3] = -(r.A[i, 0] * m.A[0, 3] + r.A[i, 1] * m.A[1, 3] + r.A[i, 2] * m.A[2, 3]);
    return r;
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
}`, output: '(11, 5, 4.35) is (1.366, 0.366, 0.75) in desk coordinates: over the desk\n(9, 6, 4.35) is (0.134, 2.232, 0.75) in desk coordinates: not over the desk' },
      { type: 'note', kind: 'tip', text: 'Keep geometry in local coordinates near its own origin, and apply the placement only when you need world positions. Georeferenced world coordinates can be hundreds of thousands of metres; a `float` (as used by graphics cards) has only about 7 significant digits, so at 500 000 m it cannot resolve anything finer than about 3 cm. Local coordinates keep full precision where it matters.' },
      { type: 'quiz', question: 'A chair is nested in a desk, which is placed on a storey. Which product takes the chair’s local points to the world?', options: ['Storey · Desk · Chair', 'Chair · Desk · Storey', 'Desk · Chair · Storey', 'Storey⁻¹ · Desk⁻¹ · Chair⁻¹'], answer: 0, explain: 'Outermost on the left: the chair’s placement acts first (into desk space), then the desk’s (onto the storey), then the storey’s (into the world).' },
      { type: 'quiz', question: 'Why are families modelled in local coordinates?', options: [
        'One geometry can be shared by every instance, each storing only a placement',
        'Because world coordinates cannot be negative',
        'Because matrices only work near the origin',
        'So that instances cannot be rotated'
      ], answer: 0, explain: 'The family’s geometry is stored once; each instance is just a transform. It also keeps the geometry’s numbers small and precise.' },
      { type: 'exercise', task: 'Three desks have their chair nested at (1.2, −0.7, 0) in desk coordinates. The desks are at (0, 0, 0), (5, 0, 0) and (10, 0, 0), turned 0°, 90° and 180°. Print where the chair’s seat corner, (0.4, 0.4, 0) in chair coordinates, ends up for each desk.', hint: 'For each desk, multiply Move · RotateZ · chairInDesk, and apply it to the corner with `Point`.', solution: cs`
M4 chairInDesk = M4.Move(1.2, -0.7, 0);
var corner = new V3(0.4, 0.4, 0);
var desks = new (V3 At, double Turn)[] { (new(0, 0, 0), 0), (new(5, 0, 0), 90), (new(10, 0, 0), 180) };

foreach (var (at, turn) in desks)
{
    M4 chairToWorld = M4.Move(at.X, at.Y, at.Z) * M4.RotateZ(turn) * chairInDesk;
    Console.WriteLine($"Desk at {at}, turned {turn} deg: corner at {chairToWorld.Point(corner)}");
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
}`, output: 'Desk at (0, 0, 0), turned 0 deg: corner at (1.6, -0.3, 0)\nDesk at (5, 0, 0), turned 90 deg: corner at (5.3, 1.6, 0)\nDesk at (10, 0, 0), turned 180 deg: corner at (8.4, 0.3, 0)' }
    ],
    keyPoints: [
      'Families are modelled once in local coordinates; each instance stores a placement.',
      'world = Placement · local; the placement’s columns are the instance’s axes and origin.',
      'Nested placements multiply down the chain, outermost on the left.',
      'The inverse placement takes world points into an object’s own coordinates, where tests are simple.',
      'Keeping geometry local keeps its coordinates small and precise.'
    ]
  },

  // ------------------------------------------------------------------ 6
  {
    slug: 'mirroring-handedness',
    title: 'Mirroring and handedness',
    summary: 'A mirror is a transform with determinant −1. It turns a right-handed frame into a left-handed one, reverses the winding of every outline and flips normals inwards. Detect it with the determinant and fix the faces, or store it as a flip.',
    minutes: 13,
    blocks: [
      { type: 'p', text: 'Mirroring is common in BIM: mirrored apartments on either side of a corridor, a left-hand door copied as a right-hand one, a symmetrical facade. It looks like just another transform, but it is the one that breaks things: a mirrored door changes its **hand**, outlines run the other way round, and solids turn inside out unless the software notices.' },
      { type: 'widget', name: 'mirror' },
      { type: 'h2', text: 'The mirror matrix' },
      { type: 'p', text: 'Mirroring a point P in a plane with unit normal n and offset d moves it twice its signed distance back through the plane: **P′ = P − 2(n·P + d)·n**. A direction only loses twice its component along n: **v′ = v − 2(n·v)·n**. As a matrix, the 3×3 part is **I − 2·n·nᵀ**. In 2D, the mirror in a line at angle φ has columns (cos 2φ, sin 2φ) and (sin 2φ, −cos 2φ).' },
      { type: 'code', title: 'MirrorPlane.cs', code: cs`
// Mirror a door across the grid line x = 5: the plane with unit normal (1, 0, 0) and d = -5
var n = new V3(1, 0, 0);
double d = -5;

var hinge = new V3(3, 2, 0);
var across = new V3(1, 0, 0);       // from the hinge across the opening
var swing = new V3(0, 1, 0);        // the way the leaf opens

Console.WriteLine($"Hinge  {hinge} -> {MirrorPoint(hinge, n, d)}");
Console.WriteLine($"Across {across} -> {MirrorDirection(across, n)}");
Console.WriteLine($"Swing  {swing} -> {MirrorDirection(swing, n)}");

static V3 MirrorPoint(V3 p, V3 n, double d) => p - n * (2 * (V3.Dot(n, p) + d));   // n is a unit normal
static V3 MirrorDirection(V3 v, V3 n) => v - n * (2 * V3.Dot(n, v));

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
}`, output: 'Hinge  (3, 2, 0) -> (7, 2, 0)\nAcross (1, 0, 0) -> (-1, 0, 0)\nSwing  (0, 1, 0) -> (0, 1, 0)' },
      { type: 'p', text: 'The hinge lands on the other side of the grid line and “across” now points the other way, while “swing” is unchanged. The door now opens from its other side: a left-hand door has become a right-hand one. **No rotation can do that**, which you can check in the widget by switching to “Rotate”.' },
      { type: 'h2', text: 'Handedness and the determinant' },
      { type: 'p', text: 'A frame is **right-handed** when X × Y = Z, as in every BIM tool. After a mirror, the transformed axes satisfy X′ × Y′ = −Z′: the frame is **left-handed**. The test is the determinant of the 3×3 part, which equals the triple product (X′ × Y′)·Z′: **positive for rotations, negative whenever an odd number of mirrors is involved**. Two mirrors make a rotation again.' },
      { type: 'code', title: 'Handedness.cs', code: cs`
var instances = new (string Name, M4 M)[]
{
    ("D1, turned 90", M4.Move(4, 0, 0) * M4.RotateZ(90)),
    ("D2, mirrored", M4.Move(10, 0, 0) * M4.Scale(-1, 1, 1)),
    ("D3, mirrored and turned", M4.Move(14, 0, 0) * M4.RotateZ(90) * M4.Scale(1, -1, 1)),
    ("D4, mirrored twice", M4.Scale(-1, 1, 1) * M4.Scale(1, -1, 1))
};

foreach (var (name, m) in instances)
{
    V3 x = m.Direction(new V3(1, 0, 0)), y = m.Direction(new V3(0, 1, 0)), z = m.Direction(new V3(0, 0, 1));
    double triple = V3.Dot(V3.Cross(x, y), z);
    Console.WriteLine($"{name,-24} (X x Y).Z = {triple,2}  {(triple < 0 ? "mirrored" : "not mirrored")}");
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
}`, output: 'D1, turned 90            (X x Y).Z =  1  not mirrored\nD2, mirrored             (X x Y).Z = -1  mirrored\nD3, mirrored and turned  (X x Y).Z = -1  mirrored\nD4, mirrored twice       (X x Y).Z =  1  not mirrored' },
      { type: 'h2', text: 'What breaks, and how to fix it' },
      { type: 'ul', items: [
        '**Winding reverses.** A counterclockwise outline becomes clockwise, so signed areas turn negative and the outer/hole convention is swapped.',
        '**Normals flip inwards.** A face normal computed as (B − A) × (C − A) from the mirrored corners points into the solid, so lighting, clash tests and volume signs go wrong.',
        '**Hands and text swap.** Doors, stairs and other “handed” families change hand, and any text or symbol modelled in 3D reads backwards.'
      ] },
      { type: 'p', text: 'The fix for geometry is mechanical: **when det < 0, reverse the order of every face’s vertices** after transforming them. Mesh exporters, IFC viewers and game engines all do this.' },
      { type: 'code', title: 'FixWinding.cs', code: cs`
// The top face of a slab, counterclockwise seen from above, so its normal points up
var face = new V3[] { new(0, 0, 0.2), new(4, 0, 0.2), new(4, 3, 0.2), new(0, 3, 0.2) };
M4 mirror = M4.Scale(-1, 1, 1);

var moved = face.Select(mirror.Point).ToArray();
Console.WriteLine($"Before:   normal {Normal(face)}");
Console.WriteLine($"Mirrored: normal {Normal(moved)}  <- points into the slab");

if (Det3(mirror) < 0) Array.Reverse(moved);
Console.WriteLine($"Reversed: normal {Normal(moved)}");

static V3 Normal(V3[] p) => V3.Cross(p[1] - p[0], p[2] - p[0]).Normalized();

static double Det3(M4 m) =>
      m.A[0, 0] * (m.A[1, 1] * m.A[2, 2] - m.A[1, 2] * m.A[2, 1])
    - m.A[0, 1] * (m.A[1, 0] * m.A[2, 2] - m.A[1, 2] * m.A[2, 0])
    + m.A[0, 2] * (m.A[1, 0] * m.A[2, 1] - m.A[1, 1] * m.A[2, 0]);

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
}`, output: 'Before:   normal (0, 0, 1)\nMirrored: normal (0, 0, -1)  <- points into the slab\nReversed: normal (0, 0, 1)' },
      { type: 'h2', text: 'Storing a mirror as a flip' },
      { type: 'p', text: 'Every mirror can be written as **a flip of one local axis followed by a rotation**; the widget shows the angle. BIM tools use this to keep placements as tidy rotations. Revit, for example, reports `Mirrored`, `HandFlipped` and `FacingFlipped` on a `FamilyInstance`, so you can ask whether a door has been mirrored rather than digging the sign out of its matrix. When reading placements from any source, still check the determinant: it is the one test that never lies.' },
      { type: 'quiz', question: 'What is the determinant of any mirror?', options: ['−1', '1', '0', '2'], answer: 0, explain: 'A mirror keeps sizes (|det| = 1) but reverses orientation, so det = −1. A rotation has det = +1.' },
      { type: 'quiz', question: 'An instance is mirrored in X and then mirrored in Y. What is it now?', options: ['A 180° rotation: not mirrored', 'Still mirrored', 'Mirrored twice as much', 'Squashed flat'], answer: 0, explain: 'det = (−1) × (−1) = +1. Two mirrors make a rotation; here diag(−1, −1, 1) is a half turn about Z.' },
      { type: 'exercise', task: 'A room has corners (1, 1, 0), (5, 1, 0), (5, 4, 0) and (1, 4, 0), counterclockwise. Mirror it in the plane x = 0 with M4.Scale(−1, 1, 1). Print its signed area (shoelace on X and Y) before and after mirroring, then reverse the mirrored corners and print it again.', hint: 'The shoelace sum is Σ (x_i·y_(i+1) − x_(i+1)·y_i) ÷ 2. Use `Array.Reverse` on the mirrored array.', solution: cs`
var room = new V3[] { new(1, 1, 0), new(5, 1, 0), new(5, 4, 0), new(1, 4, 0) };
M4 mirror = M4.Scale(-1, 1, 1);

var moved = room.Select(mirror.Point).ToArray();
Console.WriteLine($"Before: {Area(room)}");
Console.WriteLine($"Mirrored: {Area(moved)}");
Array.Reverse(moved);
Console.WriteLine($"Reversed: {Area(moved)}");

static double Area(V3[] p)
{
    double s = 0;
    for (int i = 0; i < p.Length; i++)
    {
        V3 a = p[i], b = p[(i + 1) % p.Length];
        s += a.X * b.Y - b.X * a.Y;
    }
    return s / 2;
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
}`, output: 'Before: 12\nMirrored: -12\nReversed: 12' },
      { type: 'note', kind: 'tip', text: 'Next up is the Rotations in depth module: Euler angles and gimbal lock, quaternions, and smooth interpolation between orientations.' }
    ],
    keyPoints: [
      'Mirror a point in a plane with P′ = P − 2(n·P + d)·n; the matrix is I − 2·n·nᵀ.',
      'A mirror has det = −1 and turns a right-handed frame left-handed; two mirrors make a rotation.',
      'Check the determinant (or the triple product of the axes) to detect mirrored instances.',
      'After a mirror, reverse each face’s vertex order so normals point outwards again.',
      'Tools often store a mirror as a flip plus a rotation, but the determinant is the reliable test.'
    ]
  }
];
