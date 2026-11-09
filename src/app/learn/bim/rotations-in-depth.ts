import { Lesson } from '../learn.types';
import { cs } from '../csharp/cs';

export const ROTATIONS_IN_DEPTH: Lesson[] = [
  // ------------------------------------------------------------------ 1
  {
    slug: 'euler-gimbal-lock',
    title: 'Euler angles and gimbal lock',
    summary: 'Describe an orientation with three angles (yaw, pitch and roll), learn why the order of the three turns matters, and see why one pitch angle makes two of them do the same thing.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'A rotation in 3D has three degrees of freedom, so the most obvious way to store one is as three angles. A camera in a walkthrough has a heading, a tilt up or down and maybe a bank. An inclined column might be stored as a turn in plan followed by a lean. These three-angle descriptions are called **Euler angles**. They are easy to type and easy to read, which is why dialogs and file formats use them.' },
      { type: 'p', text: 'The widget shows the same idea the way a physical gimbal (the frame of rings that holds a ship’s compass or a camera stabiliser) does: each ring turns about one axis and carries the rings inside it.' },
      { type: 'widget', name: 'gimbal' },
      { type: 'h2', text: 'Yaw, pitch and roll' },
      { type: 'p', text: 'With Z up, the usual convention in BIM is:' },
      { type: 'ul', items: [
        '**Yaw** (heading): a turn about the vertical Z axis, the angle you see in plan.',
        '**Pitch**: a turn about the object’s own Y axis, after the yaw. It tips the nose up or down.',
        '**Roll** (bank): a turn about the object’s own X axis, the nose, after both of the others.'
      ] },
      { type: 'p', text: 'As one matrix this is **R = Rz(yaw) · Ry(pitch) · Rx(roll)**. Read from the right it says “roll about world X, then pitch about world Y, then yaw about world Z”. Read from the left it says “yaw, then pitch about the turned Y, then roll about the turned X”. Both readings give the same matrix, so you will see the convention described both ways: as turns about fixed axes in one order, or about moving axes in the reverse order.' },
      { type: 'h2', text: 'The order matters' },
      { type: 'p', text: 'Three angles mean nothing until you also know the order and the axes. There are twelve possible conventions (ZYX, XYZ, ZXZ and so on), and different programs, file formats and libraries pick different ones. The same three numbers in a different order give a different orientation:' },
      { type: 'code', title: 'EulerOrder.cs', code: cs`
var nose = new V3(1, 0, 0);
double yaw = 90, pitch = 30;

var zyx = Mul(Rz(yaw), Ry(pitch));      // yaw, then pitch about the turned Y
var yzx = Mul(Ry(pitch), Rz(yaw));      // pitch about world Y first, then yaw
Console.WriteLine($"Rz * Ry: nose -> {Apply(zyx, nose)}");
Console.WriteLine($"Ry * Rz: nose -> {Apply(yzx, nose)}");

static double[,] Rz(double d) { double c = Cos(d), s = Sin(d); return new[,] { { c, -s, 0 }, { s, c, 0 }, { 0, 0, 1 } }; }
static double[,] Ry(double d) { double c = Cos(d), s = Sin(d); return new[,] { { c, 0, s }, { 0, 1, 0 }, { -s, 0, c } }; }
static double Cos(double d) => Math.Cos(d * Math.PI / 180);
static double Sin(double d) => Math.Sin(d * Math.PI / 180);

static double[,] Mul(double[,] a, double[,] b)
{
    var m = new double[3, 3];
    for (int i = 0; i < 3; i++)
        for (int j = 0; j < 3; j++)
            for (int k = 0; k < 3; k++) m[i, j] += a[i, k] * b[k, j];
    return m;
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
}`, output: 'Rz * Ry: nose -> (0, 0.866, -0.5)\nRy * Rz: nose -> (0, 1, 0)' },
      { type: 'p', text: 'In the first order the nose swings round to +Y and then tips down by 30°. In the second, the pitch happens while the nose still points along X, but the yaw then carries it to +Y, and the pitch was about world Y, which is now the nose itself: the tilt has turned into a roll and the nose stays level. (With Z up, a positive turn about Y tips the nose **down**, because the right-hand rule carries X towards −Z.)' },
      { type: 'note', kind: 'warn', text: 'When you read rotations from another program or a file, find out the convention: which axes, in which order, about fixed or moving axes, degrees or radians, and which way is positive. Swapping two of these is the classic cause of objects that import “almost right”.' },
      { type: 'h2', text: 'Gimbal lock' },
      { type: 'p', text: 'Set the pitch in the widget to 90° and move the yaw and roll sliders. They now do the same thing. The pitch has tipped the red roll ring into the plane of the blue yaw ring, so both turn the body about the same vertical line. Three angles, but only two independent ways to turn: this is **gimbal lock**.' },
      { type: 'p', text: 'You can see it in the matrix. At pitch = 90°, Ry turns the X axis onto −Z, so a roll about the turned X is a turn about −Z, which is a yaw in the opposite direction. Only **yaw − roll** has any effect:' },
      { type: 'code', title: 'GimbalLock.cs', code: cs`
var pairs = new (double[] A, double[] B)[]
{
    (new double[] { 30, 90, 0 }, new double[] { 0, 90, -30 }),
    (new double[] { 30, 90, 0 }, new double[] { 50, 90, 20 }),
    (new double[] { 30, 89, 0 }, new double[] { 0, 89, -30 })
};
foreach (var (a, b) in pairs)
{
    bool same = Same(Euler(a[0], a[1], a[2]), Euler(b[0], b[1], b[2]));
    Console.WriteLine($"({string.Join(", ", a)}) and ({string.Join(", ", b)}): same orientation = {same}");
}

static double[,] Euler(double yaw, double pitch, double roll) => Mul(Rz(yaw), Mul(Ry(pitch), Rx(roll)));
static double[,] Rx(double d) { double c = Cos(d), s = Sin(d); return new[,] { { 1, 0, 0 }, { 0, c, -s }, { 0, s, c } }; }
static double[,] Ry(double d) { double c = Cos(d), s = Sin(d); return new[,] { { c, 0, s }, { 0, 1, 0 }, { -s, 0, c } }; }
static double[,] Rz(double d) { double c = Cos(d), s = Sin(d); return new[,] { { c, -s, 0 }, { s, c, 0 }, { 0, 0, 1 } }; }
static double Cos(double d) => Math.Cos(d * Math.PI / 180);
static double Sin(double d) => Math.Sin(d * Math.PI / 180);

static double[,] Mul(double[,] a, double[,] b)
{
    var m = new double[3, 3];
    for (int i = 0; i < 3; i++)
        for (int j = 0; j < 3; j++)
            for (int k = 0; k < 3; k++) m[i, j] += a[i, k] * b[k, j];
    return m;
}

static bool Same(double[,] a, double[,] b)
{
    for (int i = 0; i < 3; i++)
        for (int j = 0; j < 3; j++)
            if (Math.Abs(a[i, j] - b[i, j]) > 1e-9) return false;
    return true;
}`, output: '(30, 90, 0) and (0, 90, -30): same orientation = True\n(30, 90, 0) and (50, 90, 20): same orientation = True\n(30, 89, 0) and (0, 89, -30): same orientation = False' },
      { type: 'p', text: 'Nothing is wrong with the orientation itself: the body can still point anywhere. What breaks is the **description**. Near pitch = ±90°:' },
      { type: 'ul', items: [
        'Going back from a matrix to angles has no unique answer, so a round trip through a file or a dialog can change yaw and roll even though the object has not moved.',
        'A small change in orientation can need a huge jump in yaw and roll, so animations and camera paths that blend the angles spin wildly.',
        'One direction of turning simply cannot be reached by a small change of the three angles.'
      ] },
      { type: 'p', text: 'Every three-angle convention has a pitch like this somewhere; choosing a different order only moves the problem. In BIM it bites for things that really do point straight up or down: a camera looking straight down for a plan view, a vertical pipe or duct segment, a column whose “nose” is its axis.' },
      { type: 'h2', text: 'Where Euler angles are still the right tool' },
      { type: 'ul', items: [
        '**User input and display**: “rotate 30° in plan, tilt 5°” is how people think. Keep the angles for the dialog.',
        '**Rotations that stay well away from the lock**: a family that only turns in plan and tilts a few degrees never gets near pitch = 90°.',
        '**Storage formats** that ask for them. Convert once on import, then work with a matrix or a quaternion.'
      ] },
      { type: 'p', text: 'For composing, interpolating and storing rotations inside a program, the next two lessons use **quaternions**, which have no lock and no special angle.' },
      { type: 'quiz', question: 'With R = Rz(yaw) · Ry(pitch) · Rx(roll) and Z up, which pitch causes gimbal lock?', options: ['±90°', '0°', '±45°', '180°'], answer: 0, explain: 'At pitch = ±90° the turned X axis, about which roll happens, lines up with Z, about which yaw happens. Both angles then turn about the same line.' },
      { type: 'quiz', question: 'Two programs both store a rotation as three angles (10, 20, 30). Will the objects be oriented the same way?', options: [
        'Only if both use the same axes, order and sign conventions',
        'Yes: three angles always define one orientation',
        'Yes, as long as both use degrees',
        'No, never'
      ], answer: 0, explain: 'There are twelve axis orders, and each can be applied about fixed or moving axes. The same three numbers in two conventions are usually two different orientations.' },
      { type: 'exercise', task: 'Write ToEuler, which takes a rotation matrix and returns (yaw, pitch, roll) for the convention R = Rz·Ry·Rx. Use pitch = asin(−R[2,0]), yaw = atan2(R[1,0], R[0,0]) and roll = atan2(R[2,1], R[2,2]). At gimbal lock (|R[2,0]| close to 1) set roll to 0 and take yaw = atan2(−R[0,1], R[1,1]). Round-trip (40, 25, −60), (−120, −10, 170) and (75, 90, 15).', hint: 'Build the matrix with Euler from GimbalLock.cs, convert back, and print the three angles rounded to one decimal. The third set cannot come back unchanged: only yaw − roll survives.', solution: cs`
foreach (var a in new[] { (40.0, 25.0, -60.0), (-120.0, -10.0, 170.0), (75.0, 90.0, 15.0) })
{
    var (y, p, r) = ToEuler(Euler(a.Item1, a.Item2, a.Item3));
    Console.WriteLine($"{a} -> ({y:0.#}, {p:0.#}, {r:0.#})");
}

static (double Yaw, double Pitch, double Roll) ToEuler(double[,] m)
{
    double sp = Math.Clamp(-m[2, 0], -1, 1);
    double pitch = Deg(Math.Asin(sp));
    if (Math.Abs(sp) > 0.99999)                                  // gimbal lock: only yaw - roll is known
        return (Deg(Math.Atan2(-m[0, 1], m[1, 1])), pitch, 0);
    return (Deg(Math.Atan2(m[1, 0], m[0, 0])), pitch, Deg(Math.Atan2(m[2, 1], m[2, 2])));
}

static double Deg(double r) => r * 180 / Math.PI;
static double[,] Euler(double yaw, double pitch, double roll) => Mul(Rz(yaw), Mul(Ry(pitch), Rx(roll)));
static double[,] Rx(double d) { double c = Cos(d), s = Sin(d); return new[,] { { 1, 0, 0 }, { 0, c, -s }, { 0, s, c } }; }
static double[,] Ry(double d) { double c = Cos(d), s = Sin(d); return new[,] { { c, 0, s }, { 0, 1, 0 }, { -s, 0, c } }; }
static double[,] Rz(double d) { double c = Cos(d), s = Sin(d); return new[,] { { c, -s, 0 }, { s, c, 0 }, { 0, 0, 1 } }; }
static double Cos(double d) => Math.Cos(d * Math.PI / 180);
static double Sin(double d) => Math.Sin(d * Math.PI / 180);

static double[,] Mul(double[,] a, double[,] b)
{
    var m = new double[3, 3];
    for (int i = 0; i < 3; i++)
        for (int j = 0; j < 3; j++)
            for (int k = 0; k < 3; k++) m[i, j] += a[i, k] * b[k, j];
    return m;
}`, output: '(40, 25, -60) -> (40, 25, -60)\n(-120, -10, 170) -> (-120, -10, 170)\n(75, 90, 15) -> (60, 90, 0)' }
    ],
    keyPoints: [
      'Euler angles describe an orientation as three turns, such as yaw about Z, pitch about the turned Y and roll about the turned X.',
      'The meaning depends on the axes, their order and the sign convention; the same three numbers in another convention are another orientation.',
      'Rz·Ry·Rx can be read as fixed axes from the right or moving axes from the left: it is the same matrix.',
      'At pitch = ±90° yaw and roll turn about the same line (gimbal lock): angles are not unique and small moves can need big jumps.',
      'Use Euler angles for input and display; compose, store and interpolate with matrices or quaternions.'
    ]
  },

  // ------------------------------------------------------------------ 2
  {
    slug: 'quaternions',
    title: 'Quaternions without fear',
    summary: 'Store a rotation as four numbers, an axis and half the angle. Rotate points with q·v·q*, combine rotations by multiplying, and see why q and −q are the same rotation.',
    minutes: 16,
    blocks: [
      { type: 'p', text: 'Quaternions have a reputation for being mysterious, mostly because of how they are usually introduced: as four-dimensional numbers with three different square roots of −1. You do not need any of that to use them well. For rotations, a quaternion is just **an axis and an angle, packed into four numbers in a clever way**.' },
      { type: 'widget', name: 'quaternion' },
      { type: 'h2', text: 'Four numbers from an axis and an angle' },
      { type: 'p', text: 'To turn by θ about a unit axis k = (kx, ky, kz), write:' },
      { type: 'p', text: '**q = (w, x, y, z) = (cos θ/2, kx·sin θ/2, ky·sin θ/2, kz·sin θ/2)**' },
      { type: 'p', text: 'The axis sits in the last three numbers, scaled down by sin θ/2, and w says how far to turn. Because cos² + sin² = 1 and k has length 1, w² + x² + y² + z² = 1: a rotation is always a **unit quaternion**. No angle is special. There is no lock, and every orientation is reached by a small change of the four numbers from any nearby orientation.' },
      { type: 'table', head: ['Rotation', 'w', 'x', 'y', 'z'], rows: [
        ['None (identity)', '1', '0', '0', '0'],
        ['90° about Z', '0.707', '0', '0', '0.707'],
        ['180° about X', '0', '1', '0', '0'],
        ['120° about (1, 1, 1)', '0.5', '0.5', '0.5', '0.5'],
        ['360° about any axis', '−1', '0', '0', '0']
      ] },
      { type: 'h2', text: 'Multiplying quaternions' },
      { type: 'p', text: 'Quaternions have their own multiplication (the **Hamilton product**, after the mathematician who invented them). You can treat it as a formula to copy: it is the operator * in the Q struct below. What matters is what it does: **a · b is the rotation b followed by a**, just as with matrices. Like matrices it is associative but not commutative.' },
      { type: 'p', text: 'To rotate a vector v, write it as a quaternion with w = 0 and compute **q · v · q***, where q* = (w, −x, −y, −z) is the **conjugate**. For a unit quaternion the conjugate is also the inverse, the turn back. You do not need to know why the vector is sandwiched like this, only that the result again has w = 0 and its x, y, z are the rotated vector.' },
      { type: 'code', title: 'QuaternionRotate.cs', code: cs`
var turnZ = Q.FromAxisAngle(new V3(0, 0, 1), 90);
var turnX = Q.FromAxisAngle(new V3(1, 0, 0), 90);
Console.WriteLine($"90 deg about Z: {turnZ}");
Console.WriteLine($"(1, 0, 0) -> {turnZ.Rotate(new V3(1, 0, 0))}");

var both = turnZ * turnX;                      // turn about X first, then about Z
Console.WriteLine($"X then Z: {both}");
foreach (var v in new V3[] { new(1, 0, 0), new(0, 1, 0), new(0, 0, 1) })
    Console.WriteLine($"  {v} -> {both.Rotate(v)}");

var (axis, angle) = ToAxisAngle(both);
Console.WriteLine($"One turn of {angle:0.#} deg about {axis}");

static (V3 Axis, double Degrees) ToAxisAngle(Q q)
{
    if (q.W < 0) q = -q;                                       // pick the turn of 180 deg or less
    double half = Math.Acos(Math.Min(1, q.W)), s = Math.Sin(half);
    if (s < 1e-9) return (new V3(1, 0, 0), 0);                 // no turn: any axis will do
    return (new V3(q.X / s, q.Y / s, q.Z / s), 2 * half * 180 / Math.PI);
}

readonly record struct Q(double W, double X, double Y, double Z)
{
    public static Q FromAxisAngle(V3 axis, double degrees)
    {
        var k = axis.Normalized();
        double h = degrees * Math.PI / 360, s = Math.Sin(h);     // half the angle, in radians
        return new(Math.Cos(h), k.X * s, k.Y * s, k.Z * s);
    }
    public static Q operator *(Q a, Q b) => new(               // b first, then a
        a.W * b.W - a.X * b.X - a.Y * b.Y - a.Z * b.Z,
        a.W * b.X + a.X * b.W + a.Y * b.Z - a.Z * b.Y,
        a.W * b.Y - a.X * b.Z + a.Y * b.W + a.Z * b.X,
        a.W * b.Z + a.X * b.Y - a.Y * b.X + a.Z * b.W);
    public static Q operator -(Q q) => new(-q.W, -q.X, -q.Y, -q.Z);
    public static double Dot(Q a, Q b) => a.W * b.W + a.X * b.X + a.Y * b.Y + a.Z * b.Z;
    public Q Conjugate => new(W, -X, -Y, -Z);
    public double Length => Math.Sqrt(Dot(this, this));
    public Q Normalized() { double l = Length; return new(W / l, X / l, Y / l, Z / l); }
    public V3 Rotate(V3 v)                                     // q * v * conjugate(q)
    {
        var p = this * new Q(0, v.X, v.Y, v.Z) * Conjugate;
        return new(p.X, p.Y, p.Z);
    }
    static string F(double v) => Math.Abs(v) < 5e-4 ? "0" : v.ToString("0.###");
    public override string ToString() => $"({F(W)}, {F(X)}, {F(Y)}, {F(Z)})";
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
}`, output: '90 deg about Z: (0.707, 0, 0, 0.707)\n(1, 0, 0) -> (0, 1, 0)\nX then Z: (0.5, 0.5, 0.5, 0.5)\n  (1, 0, 0) -> (0, 1, 0)\n  (0, 1, 0) -> (0, 0, 1)\n  (0, 0, 1) -> (1, 0, 0)\nOne turn of 120 deg about (0.577, 0.577, 0.577)' },
      { type: 'p', text: 'A quarter turn about X followed by a quarter turn about Z is a single turn of 120° about the diagonal (1, 1, 1), which cycles the axes X → Y → Z → X. Getting the axis and angle back out is just the first formula backwards: half the angle is acos w, and the axis is (x, y, z) divided by sin of that half angle.' },
      { type: 'h2', text: 'q and −q are the same rotation' },
      { type: 'p', text: 'In the widget, turn the angle up to 360°. The box is back where it started, but q = (−1, 0, 0, 0), not (1, 0, 0, 0). Because the formula uses **half** the angle, the quaternion goes round only halfway while the object makes a full turn, and needs 720° to come back to where it started. Every rotation therefore has exactly two quaternions, q and −q. Tick “Use −q” to see that flipping all four signs does not move the box.' },
      { type: 'code', title: 'DoubleCover.cs', code: cs`
var q = Q.FromAxisAngle(new V3(0, 0.6, 0.8), 70);
var full = Q.FromAxisAngle(new V3(0, 0, 1), 360);
var v = new V3(2, 1, 0.5);

Console.WriteLine($"q          = {q}");
Console.WriteLine($"-q         = {-q}");
Console.WriteLine($"q rotates  {v} -> {q.Rotate(v)}");
Console.WriteLine($"-q rotates {v} -> {(-q).Rotate(v)}");
Console.WriteLine($"360 deg about Z: {full}, rotates {v} -> {full.Rotate(v)}");
Console.WriteLine($"q . (-q) = {Q.Dot(q, -q):0.###}");

readonly record struct Q(double W, double X, double Y, double Z)
{
    public static Q FromAxisAngle(V3 axis, double degrees)
    {
        var k = axis.Normalized();
        double h = degrees * Math.PI / 360, s = Math.Sin(h);     // half the angle, in radians
        return new(Math.Cos(h), k.X * s, k.Y * s, k.Z * s);
    }
    public static Q operator *(Q a, Q b) => new(               // b first, then a
        a.W * b.W - a.X * b.X - a.Y * b.Y - a.Z * b.Z,
        a.W * b.X + a.X * b.W + a.Y * b.Z - a.Z * b.Y,
        a.W * b.Y - a.X * b.Z + a.Y * b.W + a.Z * b.X,
        a.W * b.Z + a.X * b.Y - a.Y * b.X + a.Z * b.W);
    public static Q operator -(Q q) => new(-q.W, -q.X, -q.Y, -q.Z);
    public static double Dot(Q a, Q b) => a.W * b.W + a.X * b.X + a.Y * b.Y + a.Z * b.Z;
    public Q Conjugate => new(W, -X, -Y, -Z);
    public double Length => Math.Sqrt(Dot(this, this));
    public Q Normalized() { double l = Length; return new(W / l, X / l, Y / l, Z / l); }
    public V3 Rotate(V3 v)                                     // q * v * conjugate(q)
    {
        var p = this * new Q(0, v.X, v.Y, v.Z) * Conjugate;
        return new(p.X, p.Y, p.Z);
    }
    static string F(double v) => Math.Abs(v) < 5e-4 ? "0" : v.ToString("0.###");
    public override string ToString() => $"({F(W)}, {F(X)}, {F(Y)}, {F(Z)})";
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
}`, output: 'q          = (0.819, 0, 0.344, 0.459)\n-q         = (-0.819, 0, -0.344, -0.459)\nq rotates  (2, 1, 0.5) -> (0.214, 2.24, -0.43)\n-q rotates (2, 1, 0.5) -> (0.214, 2.24, -0.43)\n360 deg about Z: (-1, 0, 0, 0), rotates (2, 1, 0.5) -> (2, 1, 0.5)\nq . (-q) = -1' },
      { type: 'p', text: 'This matters in two places. When you **compare** two orientations, q and −q must count as equal: test |q₁ · q₂| close to 1 (the dot product of the four numbers), not the numbers themselves. And when you **interpolate**, the sign decides whether you take the short or the long way round, as the next lesson shows.' },
      { type: 'h2', text: 'Why programs prefer quaternions' },
      { type: 'table', head: ['', 'Euler angles', '3×3 matrix', 'Quaternion'], rows: [
        ['Numbers stored', '3', '9', '4'],
        ['Gimbal lock', 'Yes', 'No', 'No'],
        ['Combine two rotations', 'Hard', 'Matrix product (27 multiplications)', 'Hamilton product (16)'],
        ['Rotate a point', 'Build a matrix first', 'Cheapest (9 multiplications)', 'More work; convert to a matrix for many points'],
        ['Fix rounding drift', 'Not needed', 'Re-orthonormalise the columns', 'Divide by the length'],
        ['Smooth interpolation', 'Poor', 'Poor', 'Slerp (next lesson)']
      ] },
      { type: 'p', text: 'The usual pattern is to keep a quaternion as the master copy of an orientation, combine and interpolate with it, and convert it to a matrix only when many points have to be transformed. Rounding is the other reason. Every product adds a little error, so after thousands of small turns a rotation is no longer exactly a rotation. Here is a 0.1° turn applied 36,000 times in single precision (float, as graphics code uses):' },
      { type: 'code', title: 'Drift.cs', code: cs`
float h = 0.05f * MathF.PI / 180;                       // half of 0.1 deg
float qs = MathF.Sin(h), qc = MathF.Cos(h);
float[] step = { qc, 0, 0.6f * qs, 0.8f * qs };         // 0.1 deg about (0, 0.6, 0.8)
float[] q = { 1, 0, 0, 0 };

for (int i = 0; i < 36000; i++)                          // ten full turns
    q = Mul(step, q);

Console.WriteLine($"After 36,000 steps |q| = {Len(q):0.000000}");
float l = Len(q);
for (int i = 0; i < 4; i++) q[i] /= l;
Console.WriteLine($"After dividing by it  = {Len(q):0.000000}");

static float Len(float[] q) => MathF.Sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]);

static float[] Mul(float[] a, float[] b) => new[]
{
    a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
    a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
    a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
    a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]
};`, output: 'After 36,000 steps |q| = 1.000723\nAfter dividing by it  = 1.000000' },
      { type: 'p', text: 'The quaternion has grown 0.07% too long, and because q appears twice in q·v·q*, every point it rotates is now scaled by |q|², about 1.0014: a 30 m building would grow by 4 cm. The fix is one division. Repairing a drifted matrix means making three columns unit length and at right angles again (the Gram–Schmidt process), which is more work and easier to get wrong.' },
      { type: 'h2', text: 'Quaternions in .NET' },
      { type: 'p', text: '.NET has a ready-made float quaternion in **System.Numerics**, the same library that provides Vector3 and Matrix4x4. Its CreateFromAxisAngle takes **radians**, and Quaternion.Concatenate(a, b) means “a, then b”, which is b · a in the Hamilton order used above.' },
      { type: 'code', title: 'NumericsQuaternion.cs', code: cs`
using System.Numerics;

var turnX = Quaternion.CreateFromAxisAngle(Vector3.UnitX, MathF.PI / 2);
var turnZ = Quaternion.CreateFromAxisAngle(Vector3.UnitZ, MathF.PI / 2);

var both = Quaternion.Concatenate(turnX, turnZ);        // X first, then Z
Console.WriteLine($"Same as turnZ * turnX: {Quaternion.Dot(both, turnZ * turnX) > 0.99999f}");
Console.WriteLine($"(0, 1, 0) -> {F(Vector3.Transform(Vector3.UnitY, both))}");

var m = Matrix4x4.CreateFromQuaternion(both);           // for transforming many points
Console.WriteLine($"Matrix gives the same: {F(Vector3.Transform(Vector3.UnitY, m))}");

static string F(Vector3 v) => $"({R(v.X)}, {R(v.Y)}, {R(v.Z)})";
static string R(float x) => MathF.Abs(x) < 5e-4f ? "0" : x.ToString("0.###");`, output: 'Same as turnZ * turnX: True\n(0, 1, 0) -> (0, 0, 1)\nMatrix gives the same: (0, 0, 1)' },
      { type: 'note', kind: 'info', text: 'Some libraries and file formats store quaternions as (x, y, z, w) and others as (w, x, y, z). System.Numerics stores X, Y, Z, W. Check the order before you read four numbers from a file, as with Euler angle conventions.' },
      { type: 'quiz', question: 'What is the quaternion for a 180° turn about the Z axis?', options: ['(0, 0, 0, 1)', '(1, 0, 0, 0)', '(−1, 0, 0, 0)', '(0.707, 0, 0, 0.707)'], answer: 0, explain: 'w = cos 90° = 0 and (x, y, z) = sin 90° · (0, 0, 1) = (0, 0, 1). (0.707, 0, 0, 0.707) is the quarter turn.' },
      { type: 'quiz', question: 'Two stored orientations have quaternions q₁ and q₂ with q₁ · q₂ = −1 (dot product). What does that mean?', options: [
        'They are the same orientation',
        'They are opposite orientations, 180° apart',
        'One of them is not a unit quaternion',
        'They are at right angles'
      ], answer: 0, explain: 'A dot product of −1 between unit quaternions means q₂ = −q₁, and −q is the same rotation as q. Compare orientations with |q₁ · q₂| ≈ 1.' },
      { type: 'exercise', task: 'Turn Euler angles into a quaternion by multiplying three single-axis quaternions in the same order as the matrices: q = qZ(yaw) · qY(pitch) · qX(roll). For yaw 30°, pitch 20° and roll 10°, rotate the nose (1, 0, 0) and the up vector (0, 0, 1) with it, and check the answers against the Euler matrix Rz·Ry·Rx.', hint: 'Use Q.FromAxisAngle for the three single turns. For the matrix, reuse Euler, Mul and the rotation matrices from GimbalLock.cs and write a small Apply.', solution: cs`
double yaw = 30, pitch = 20, roll = 10;
var q = Q.FromAxisAngle(new V3(0, 0, 1), yaw)
      * Q.FromAxisAngle(new V3(0, 1, 0), pitch)
      * Q.FromAxisAngle(new V3(1, 0, 0), roll);
var m = Euler(yaw, pitch, roll);
Console.WriteLine($"q = {q}");

foreach (var v in new V3[] { new(1, 0, 0), new(0, 0, 1) })
{
    V3 a = q.Rotate(v), b = Apply(m, v);
    Console.WriteLine($"{v}: quaternion {a}, matrix {b}, match {(a - b).Length < 1e-12}");
}

static V3 Apply(double[,] m, V3 v) => new(
    m[0, 0] * v.X + m[0, 1] * v.Y + m[0, 2] * v.Z,
    m[1, 0] * v.X + m[1, 1] * v.Y + m[1, 2] * v.Z,
    m[2, 0] * v.X + m[2, 1] * v.Y + m[2, 2] * v.Z);
static double[,] Euler(double yaw, double pitch, double roll) => Mul(Rz(yaw), Mul(Ry(pitch), Rx(roll)));
static double[,] Rx(double d) { double c = Cos(d), s = Sin(d); return new[,] { { 1, 0, 0 }, { 0, c, -s }, { 0, s, c } }; }
static double[,] Ry(double d) { double c = Cos(d), s = Sin(d); return new[,] { { c, 0, s }, { 0, 1, 0 }, { -s, 0, c } }; }
static double[,] Rz(double d) { double c = Cos(d), s = Sin(d); return new[,] { { c, -s, 0 }, { s, c, 0 }, { 0, 0, 1 } }; }
static double Cos(double d) => Math.Cos(d * Math.PI / 180);
static double Sin(double d) => Math.Sin(d * Math.PI / 180);
static double[,] Mul(double[,] a, double[,] b)
{
    var r = new double[3, 3];
    for (int i = 0; i < 3; i++)
        for (int j = 0; j < 3; j++)
            for (int k = 0; k < 3; k++) r[i, j] += a[i, k] * b[k, j];
    return r;
}

readonly record struct Q(double W, double X, double Y, double Z)
{
    public static Q FromAxisAngle(V3 axis, double degrees)
    {
        var k = axis.Normalized();
        double h = degrees * Math.PI / 360, s = Math.Sin(h);     // half the angle, in radians
        return new(Math.Cos(h), k.X * s, k.Y * s, k.Z * s);
    }
    public static Q operator *(Q a, Q b) => new(               // b first, then a
        a.W * b.W - a.X * b.X - a.Y * b.Y - a.Z * b.Z,
        a.W * b.X + a.X * b.W + a.Y * b.Z - a.Z * b.Y,
        a.W * b.Y - a.X * b.Z + a.Y * b.W + a.Z * b.X,
        a.W * b.Z + a.X * b.Y - a.Y * b.X + a.Z * b.W);
    public static Q operator -(Q q) => new(-q.W, -q.X, -q.Y, -q.Z);
    public static double Dot(Q a, Q b) => a.W * b.W + a.X * b.X + a.Y * b.Y + a.Z * b.Z;
    public Q Conjugate => new(W, -X, -Y, -Z);
    public double Length => Math.Sqrt(Dot(this, this));
    public Q Normalized() { double l = Length; return new(W / l, X / l, Y / l, Z / l); }
    public V3 Rotate(V3 v)                                     // q * v * conjugate(q)
    {
        var p = this * new Q(0, v.X, v.Y, v.Z) * Conjugate;
        return new(p.X, p.Y, p.Z);
    }
    static string F(double v) => Math.Abs(v) < 5e-4 ? "0" : v.ToString("0.###");
    public override string ToString() => $"({F(W)}, {F(X)}, {F(Y)}, {F(Z)})";
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
}`, output: 'q = (0.952, 0.038, 0.189, 0.239)\n(1, 0, 0): quaternion (0.814, 0.47, -0.342), matrix (0.814, 0.47, -0.342), match True\n(0, 0, 1): quaternion (0.379, 0.018, 0.925), matrix (0.379, 0.018, 0.925), match True' }
    ],
    keyPoints: [
      'A rotation of θ about the unit axis k is the unit quaternion (cos θ/2, k·sin θ/2).',
      'a · b means b, then a; rotate a vector with q · v · q*, where q* = (w, −x, −y, −z) is the inverse.',
      'q and −q are the same rotation; compare orientations with |q₁ · q₂| ≈ 1.',
      'Quaternions have no gimbal lock, are cheap to combine and are repaired by dividing by their length.',
      'In .NET use System.Numerics.Quaternion: angles in radians, Concatenate(a, b) is a then b, and storage order is X, Y, Z, W.'
    ]
  },

  // ------------------------------------------------------------------ 3
  {
    slug: 'slerp',
    title: 'Interpolating rotations: lerp vs slerp',
    summary: 'Blend smoothly from one orientation to another for camera paths, door swings and construction sequences. See why blending matrices or angles goes wrong, and how slerp turns at a constant speed along the shortest arc.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'A walkthrough camera moving between two saved views, a door swing drawn as a sequence of positions, a crane jib turning in a 4D construction sequence: all of them need the orientations **between** a start A and an end B. Moving a point from A to B is easy: A + t·(B − A), for t from 0 to 1. Orientations are harder. Try the four methods in the widget on each end orientation.' },
      { type: 'widget', name: 'slerp' },
      { type: 'h2', text: 'Why blending matrices fails' },
      { type: 'p', text: 'The obvious idea is to blend each of the nine numbers of the matrix. Halfway between “no turn” and “90° about Z”, the first column is halfway between (1, 0, 0) and (0, 1, 0): (0.5, 0.5, 0), which has length 0.707, not 1. The blend is not a rotation. Objects shrink in the middle of the move, and for a turn of 180° the halfway matrix squashes everything flat.' },
      { type: 'h2', text: 'Why blending Euler angles is not much better' },
      { type: 'p', text: 'Blending yaw, pitch and roll separately does give a rotation at every step. But the path depends on the convention rather than on the two orientations, so it is usually not the shortest one, the speed changes along the way, and near gimbal lock it can swing wildly. It also wraps badly: blending a yaw of 350° to one of 10° goes the long way through 180°, turning 340° instead of 20°.' },
      { type: 'h2', text: 'Nlerp: blend the quaternion and rescale' },
      { type: 'p', text: 'Blend the four quaternion numbers and divide by the length so the result is a unit quaternion again. This **nlerp** (normalised lerp) follows the right path, the shortest arc from A to B, and is cheap. Its only flaw is speed: it moves faster in the middle than at the ends, and the larger the turn, the more uneven it is.' },
      { type: 'h2', text: 'Slerp: constant speed on the shortest arc' },
      { type: 'p', text: 'Unit quaternions lie on a sphere (in four dimensions, but the idea is the same as on a globe). **Slerp**, spherical linear interpolation, walks along the great-circle arc between A and B at a constant speed. If Ω is the angle between the two quaternions (cos Ω = A·B):' },
      { type: 'p', text: '**slerp(A, B, t) = A · sin((1 − t)Ω) / sin Ω + B · sin(tΩ) / sin Ω**' },
      { type: 'p', text: 'At t = 0.25 the object has turned exactly a quarter of the way. The angle Ω between the quaternions is half the angle the object turns through, because of the half angle in the quaternion. Two details make slerp robust:' },
      { type: 'ul', items: [
        '**Shortest path**: if A·B < 0, use −B instead. It is the same orientation, but it is on the near side of the sphere, so the turn is at most 180°.',
        '**Nearly equal ends**: when A·B is close to 1, sin Ω is close to 0 and the formula divides by almost nothing. Use nlerp there; for tiny turns the two are the same.'
      ] },
      { type: 'code', title: 'LerpVsSlerp.cs', code: cs`
var a = new Q(1, 0, 0, 0);
var b = Q.FromAxisAngle(new V3(0, 0, 1), 90);

Console.WriteLine("  t   nlerp    slerp   matrix-lerp column length");
foreach (double t in new[] { 0, 0.25, 0.5, 0.75, 1 })
{
    double n = TurnedFrom(a, Nlerp(a, b, t)), s = TurnedFrom(a, Slerp(a, b, t));
    double col = Math.Sqrt((1 - t) * (1 - t) + t * t);   // first column: (1 - t, t, 0)
    Console.WriteLine($"{t,4:0.00} {n,6:0.0} deg {s,5:0.0} deg  {col:0.000}");
}

static Q Nlerp(Q a, Q b, double t) =>
    new Q(a.W + (b.W - a.W) * t, a.X + (b.X - a.X) * t, a.Y + (b.Y - a.Y) * t, a.Z + (b.Z - a.Z) * t).Normalized();

static Q Slerp(Q a, Q b, double t)
{
    double d = Q.Dot(a, b);
    if (d < 0) { b = -b; d = -d; }                      // shortest path
    if (d > 0.9995) return Nlerp(a, b, t);             // nearly equal: avoid dividing by ~0
    double om = Math.Acos(d), s = Math.Sin(om);
    double ka = Math.Sin((1 - t) * om) / s, kb = Math.Sin(t * om) / s;
    return new(a.W * ka + b.W * kb, a.X * ka + b.X * kb, a.Y * ka + b.Y * kb, a.Z * ka + b.Z * kb);
}

static double TurnedFrom(Q a, Q q) => 2 * Math.Acos(Math.Min(1, Math.Abs(Q.Dot(a, q)))) * 180 / Math.PI;

readonly record struct Q(double W, double X, double Y, double Z)
{
    public static Q FromAxisAngle(V3 axis, double degrees)
    {
        var k = axis.Normalized();
        double h = degrees * Math.PI / 360, s = Math.Sin(h);     // half the angle, in radians
        return new(Math.Cos(h), k.X * s, k.Y * s, k.Z * s);
    }
    public static Q operator *(Q a, Q b) => new(               // b first, then a
        a.W * b.W - a.X * b.X - a.Y * b.Y - a.Z * b.Z,
        a.W * b.X + a.X * b.W + a.Y * b.Z - a.Z * b.Y,
        a.W * b.Y - a.X * b.Z + a.Y * b.W + a.Z * b.X,
        a.W * b.Z + a.X * b.Y - a.Y * b.X + a.Z * b.W);
    public static Q operator -(Q q) => new(-q.W, -q.X, -q.Y, -q.Z);
    public static double Dot(Q a, Q b) => a.W * b.W + a.X * b.X + a.Y * b.Y + a.Z * b.Z;
    public Q Conjugate => new(W, -X, -Y, -Z);
    public double Length => Math.Sqrt(Dot(this, this));
    public Q Normalized() { double l = Length; return new(W / l, X / l, Y / l, Z / l); }
    public V3 Rotate(V3 v)                                     // q * v * conjugate(q)
    {
        var p = this * new Q(0, v.X, v.Y, v.Z) * Conjugate;
        return new(p.X, p.Y, p.Z);
    }
    static string F(double v) => Math.Abs(v) < 5e-4 ? "0" : v.ToString("0.###");
    public override string ToString() => $"({F(W)}, {F(X)}, {F(Y)}, {F(Z)})";
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
}`, output: '  t   nlerp    slerp   matrix-lerp column length\n0.00    0.0 deg   0.0 deg  1.000\n0.25   21.6 deg  22.5 deg  0.791\n0.50   45.0 deg  45.0 deg  0.707\n0.75   68.4 deg  67.5 deg  0.791\n1.00   90.0 deg  90.0 deg  1.000' },
      { type: 'p', text: 'For a 90° turn nlerp is never more than about 1° behind or ahead of slerp, which nobody notices in a door swing (the exercise measures it exactly). The matrix blend, meanwhile, has shrunk the object to 71% of its size halfway through.' },
      { type: 'h2', text: 'The shortest-path check' },
      { type: 'p', text: 'In the widget, choose “Yaw 270°” and switch the shortest-path check off. A yaw of 270° is the same orientation as −90°, but its quaternion has w = cos 135° < 0, so it lies on the far side of the sphere from the identity. Without the check, slerp faithfully turns 270° the long way round. With it, slerp uses −B and turns 90° the other way.' },
      { type: 'code', title: 'ShortestPath.cs', code: cs`
var from = Q.FromAxisAngle(new V3(0, 0, 1), 350);       // a door at 350 deg ...
var to = Q.FromAxisAngle(new V3(0, 0, 1), 10);          // ... opening to 10 deg
Console.WriteLine($"from . to = {Q.Dot(from, to):0.###}");

Console.WriteLine($"Euler blend, halfway:      yaw {(350 + 10) / 2.0:0} deg");
Console.WriteLine($"Slerp without the check:   yaw {Yaw(SlerpRaw(from, to, 0.5)):0} deg");
Console.WriteLine($"Slerp with the check:      yaw {Yaw(SlerpRaw(from, Q.Dot(from, to) < 0 ? -to : to, 0.5)):0} deg");

static Q SlerpRaw(Q a, Q b, double t)                    // no shortest-path check
{
    double om = Math.Acos(Math.Clamp(Q.Dot(a, b), -1, 1)), s = Math.Sin(om);
    double ka = Math.Sin((1 - t) * om) / s, kb = Math.Sin(t * om) / s;
    return new(a.W * ka + b.W * kb, a.X * ka + b.X * kb, a.Y * ka + b.Y * kb, a.Z * ka + b.Z * kb);
}

static double Yaw(Q q)                                   // where the X axis ends up, in plan
{
    var x = q.Rotate(new V3(1, 0, 0));
    double d = Math.Atan2(x.Y, x.X) * 180 / Math.PI;
    return Math.Abs(d) < 1e-9 ? 0 : (d + 360) % 360;
}

readonly record struct Q(double W, double X, double Y, double Z)
{
    public static Q FromAxisAngle(V3 axis, double degrees)
    {
        var k = axis.Normalized();
        double h = degrees * Math.PI / 360, s = Math.Sin(h);     // half the angle, in radians
        return new(Math.Cos(h), k.X * s, k.Y * s, k.Z * s);
    }
    public static Q operator *(Q a, Q b) => new(               // b first, then a
        a.W * b.W - a.X * b.X - a.Y * b.Y - a.Z * b.Z,
        a.W * b.X + a.X * b.W + a.Y * b.Z - a.Z * b.Y,
        a.W * b.Y - a.X * b.Z + a.Y * b.W + a.Z * b.X,
        a.W * b.Z + a.X * b.Y - a.Y * b.X + a.Z * b.W);
    public static Q operator -(Q q) => new(-q.W, -q.X, -q.Y, -q.Z);
    public static double Dot(Q a, Q b) => a.W * b.W + a.X * b.X + a.Y * b.Y + a.Z * b.Z;
    public Q Conjugate => new(W, -X, -Y, -Z);
    public double Length => Math.Sqrt(Dot(this, this));
    public Q Normalized() { double l = Length; return new(W / l, X / l, Y / l, Z / l); }
    public V3 Rotate(V3 v)                                     // q * v * conjugate(q)
    {
        var p = this * new Q(0, v.X, v.Y, v.Z) * Conjugate;
        return new(p.X, p.Y, p.Z);
    }
    static string F(double v) => Math.Abs(v) < 5e-4 ? "0" : v.ToString("0.###");
    public override string ToString() => $"({F(W)}, {F(X)}, {F(Y)}, {F(Z)})";
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
}`, output: 'from . to = -0.985\nEuler blend, halfway:      yaw 180 deg\nSlerp without the check:   yaw 180 deg\nSlerp with the check:      yaw 0 deg' },
      { type: 'p', text: 'Halfway from 350° to 10°, the door should be at 0°. Blending the angle sends it to 180°, and slerp without the check does too. Only slerp with the check turns the 20° a person expects.' },
      { type: 'h2', text: 'Slerp in .NET' },
      { type: 'p', text: 'System.Numerics provides **Quaternion.Slerp** and **Quaternion.Lerp** (which, despite the name, is nlerp: it normalises the result). Both already include the shortest-path check.' },
      { type: 'code', title: 'DoorSwing.cs', code: cs`
using System.Numerics;

var closed = Quaternion.Identity;
var open = Quaternion.CreateFromAxisAngle(Vector3.UnitZ, 100 * MathF.PI / 180);

for (int frame = 0; frame <= 5; frame++)
{
    float t = frame / 5f;
    var q = Quaternion.Slerp(closed, open, t);
    var leaf = Vector3.Transform(new Vector3(0.9f, 0, 0), q);   // a 900 mm leaf, hinge at the origin
    Console.WriteLine($"t = {t:0.0}: {2 * MathF.Acos(MathF.Min(1, q.W)) * 180 / MathF.PI,5:0.0} deg, " +
                      $"leaf end ({leaf.X:0.000}, {leaf.Y:0.000})");
}`, output: 't = 0.0:   0.0 deg, leaf end (0.900, 0.000)\nt = 0.2:  20.0 deg, leaf end (0.846, 0.308)\nt = 0.4:  40.0 deg, leaf end (0.689, 0.579)\nt = 0.6:  60.0 deg, leaf end (0.450, 0.779)\nt = 0.8:  80.0 deg, leaf end (0.156, 0.886)\nt = 1.0: 100.0 deg, leaf end (-0.156, 0.886)' },
      { type: 'note', kind: 'tip', text: 'Slerp gives constant speed between two orientations, but at each keyframe of a longer path the direction of turning changes suddenly. For a smooth camera path through many keyframes, animation tools use splines on the quaternion sphere (often called squad). For door swings and two-view transitions, slerp is all you need.' },
      { type: 'quiz', question: 'Halfway between the identity and a 180° turn about Z, what does blending the matrix entries give?', options: [
        'A matrix that squashes everything to a line, not a rotation',
        'A 90° turn about Z',
        'The identity',
        'A 180° turn about Z'
      ], answer: 0, explain: 'The halfway matrix is (I + Rz(180°)) / 2. Its first two columns are (0, 0, 0): X and Y are squashed to nothing and only Z survives. It is not a rotation at all.' },
      { type: 'quiz', question: 'Why does slerp replace B with −B when A·B < 0?', options: [
        'So the blend takes the shorter way round; −B is the same orientation',
        'Because negative quaternions are not valid rotations',
        'To make the speed constant',
        'To avoid dividing by zero'
      ], answer: 0, explain: 'q and −q are the same orientation, but only one of them is on the near side of A. Using that one keeps the turn at 180° or less.' },
      { type: 'exercise', task: 'Find the worst speed error of nlerp. For a turn of 90° and one of 170° about Z, sample t from 0 to 1 in steps of 0.01 and find the largest difference between the angle nlerp has turned and the angle slerp has turned. Print both.', hint: 'Reuse Nlerp, Slerp and TurnedFrom from LerpVsSlerp.cs. Keep the largest absolute difference.', solution: cs`
var a = new Q(1, 0, 0, 0);
foreach (double turn in new[] { 90.0, 170.0 })
{
    var b = Q.FromAxisAngle(new V3(0, 0, 1), turn);
    double worst = 0, at = 0;
    for (int i = 0; i <= 100; i++)
    {
        double t = i / 100.0;
        double err = Math.Abs(TurnedFrom(a, Nlerp(a, b, t)) - TurnedFrom(a, Slerp(a, b, t)));
        if (err > worst) { worst = err; at = t; }
    }
    Console.WriteLine($"{turn} deg turn: nlerp is off by up to {worst:0.00} deg (at t = {at:0.00})");
}

static Q Nlerp(Q a, Q b, double t) =>
    new Q(a.W + (b.W - a.W) * t, a.X + (b.X - a.X) * t, a.Y + (b.Y - a.Y) * t, a.Z + (b.Z - a.Z) * t).Normalized();

static Q Slerp(Q a, Q b, double t)
{
    double d = Q.Dot(a, b);
    if (d < 0) { b = -b; d = -d; }
    if (d > 0.9995) return Nlerp(a, b, t);
    double om = Math.Acos(d), s = Math.Sin(om);
    double ka = Math.Sin((1 - t) * om) / s, kb = Math.Sin(t * om) / s;
    return new(a.W * ka + b.W * kb, a.X * ka + b.X * kb, a.Y * ka + b.Y * kb, a.Z * ka + b.Z * kb);
}

static double TurnedFrom(Q a, Q q) => 2 * Math.Acos(Math.Min(1, Math.Abs(Q.Dot(a, q)))) * 180 / Math.PI;

readonly record struct Q(double W, double X, double Y, double Z)
{
    public static Q FromAxisAngle(V3 axis, double degrees)
    {
        var k = axis.Normalized();
        double h = degrees * Math.PI / 360, s = Math.Sin(h);     // half the angle, in radians
        return new(Math.Cos(h), k.X * s, k.Y * s, k.Z * s);
    }
    public static Q operator *(Q a, Q b) => new(               // b first, then a
        a.W * b.W - a.X * b.X - a.Y * b.Y - a.Z * b.Z,
        a.W * b.X + a.X * b.W + a.Y * b.Z - a.Z * b.Y,
        a.W * b.Y - a.X * b.Z + a.Y * b.W + a.Z * b.X,
        a.W * b.Z + a.X * b.Y - a.Y * b.X + a.Z * b.W);
    public static Q operator -(Q q) => new(-q.W, -q.X, -q.Y, -q.Z);
    public static double Dot(Q a, Q b) => a.W * b.W + a.X * b.X + a.Y * b.Y + a.Z * b.Z;
    public Q Conjugate => new(W, -X, -Y, -Z);
    public double Length => Math.Sqrt(Dot(this, this));
    public Q Normalized() { double l = Length; return new(W / l, X / l, Y / l, Z / l); }
    public V3 Rotate(V3 v)                                     // q * v * conjugate(q)
    {
        var p = this * new Q(0, v.X, v.Y, v.Z) * Conjugate;
        return new(p.X, p.Y, p.Z);
    }
    static string F(double v) => Math.Abs(v) < 5e-4 ? "0" : v.ToString("0.###");
    public override string ToString() => $"({F(W)}, {F(X)}, {F(Y)}, {F(Z)})";
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
}`, output: '90 deg turn: nlerp is off by up to 0.92 deg (at t = 0.22)\n170 deg turn: nlerp is off by up to 6.75 deg (at t = 0.24)' }
    ],
    keyPoints: [
      'Blending matrix entries does not give rotations: objects shrink, and a 180° blend collapses.',
      'Blending Euler angles gives rotations, but along a path set by the convention, at uneven speed and with wrap-around trouble.',
      'Nlerp (blend the quaternion, then normalise) follows the shortest arc; it is cheap but faster in the middle.',
      'Slerp turns at constant speed along the shortest arc: A·sin((1 − t)Ω)/sin Ω + B·sin(tΩ)/sin Ω.',
      'Flip B to −B when A·B < 0, and fall back to nlerp when A and B are nearly equal.'
    ]
  }
];
