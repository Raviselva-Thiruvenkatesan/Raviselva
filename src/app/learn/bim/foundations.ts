import { Lesson } from '../learn.types';
import { cs } from '../csharp/cs';

export const FOUNDATIONS: Lesson[] = [
  // ------------------------------------------------------------------ 1
  {
    slug: 'why-bim-math',
    title: 'Why BIM software runs on maths',
    summary: 'A BIM model looks like walls, doors and slabs, but it is stored as a handful of numbers. See what the software computes from them, and how this course is organised.',
    minutes: 10,
    blocks: [
      { type: 'p', text: 'Open a model in any BIM tool and you see walls, doors, slabs and pipes. The file does not store pictures of them. A straight wall is stored as little more than **two points** (its location line), a **thickness**, a **height** and a few settings. Everything else you see is calculated from those numbers, again and again, every time something changes.' },
      { type: 'p', text: 'Drag the two ends of the wall below. Every value in the panel, including the four corners of the outline, is computed from just the two points and the thickness.' },
      { type: 'widget', name: 'wall-anatomy' },
      { type: 'p', text: 'The corners come from a small piece of vector maths: take the wall’s direction, turn it 90° to get the **perpendicular**, and step half the thickness to each side. You will write exactly that code in the Vectors module. For now, notice how much the software derives from so little data.' },
      { type: 'h2', text: 'What a BIM tool computes all day' },
      { type: 'table', head: ['What you do', 'The maths underneath', 'Module'], rows: [
        ['Draw a wall and see its outline', 'Direction vectors, perpendicular offsets', 'Vectors'],
        ['Join two walls at a corner', 'Line–line intersection', 'Lines and curves'],
        ['Place a room and read its area', 'Polygon area (the shoelace formula)', 'Planes and polygons'],
        ['Host a door in a wall', 'Local and world coordinates, transforms', 'Matrices and transforms'],
        ['Rotate a family or a whole building', 'Rotation matrices and quaternions', 'Rotations in depth'],
        ['Run a clash check', 'Bounding boxes, the separating-axis theorem', '3D geometry and solids'],
        ['Cut a plan or a section', 'Plane–mesh intersection, projection', '3D geometry and solids'],
        ['Share coordinates with the site survey', 'Survey points, true north, map projections', 'Master level']
      ] },
      { type: 'h2', text: 'A wall as data' },
      { type: 'p', text: 'Here is the same idea in C#. A wall is two points, a thickness and a height. Its length, face area and volume are not stored; they are computed.' },
      { type: 'code', title: 'WallAsData.cs', code: cs`
using Pt = (double X, double Y);

Pt start = (0, 0);
Pt end = (6, 8);
double thickness = 0.2, height = 3.0;

double dx = end.X - start.X, dy = end.Y - start.Y;
double length = Math.Sqrt(dx * dx + dy * dy);

Console.WriteLine($"Length: {length} m");
Console.WriteLine($"Face area: {length * height} square metres");
Console.WriteLine($"Volume: {length * thickness * height} cubic metres");`, output: 'Length: 10 m\nFace area: 30 square metres\nVolume: 6 cubic metres' },
      { type: 'p', text: '`Math.Sqrt(dx * dx + dy * dy)` is Pythagoras: the wall runs 6 m in X and 8 m in Y, so its length is √(36 + 64) = 10 m. If the model changes either end, the length, area and volume all follow automatically. That is the core idea of parametric modelling: store the few numbers that **define** an element and compute the rest.' },
      { type: 'note', kind: 'info', text: 'You do not need a maths degree for this course. If you remember school algebra (solving `2x + 3 = 11`) and the idea of a right-angled triangle, you have enough. Everything else is introduced when it is needed, with a picture first and a formula second.' },
      { type: 'h2', text: 'Why learn it if the software already does it?' },
      { type: 'ul', items: [
        '**Automation:** as soon as you write a plug-in, a Dynamo or Grasshopper script, or an IFC tool, the software stops doing the geometry for you. You get points and vectors and have to work out the rest.',
        '**Debugging:** “the wall join is off by half a millimetre” or “the family rotates the wrong way when mirrored” are maths bugs. Knowing the maths turns them from mysteries into five-minute fixes.',
        '**Performance:** a clash check over a large model is millions of geometric tests. Knowing which test is cheap (a box overlap) and which is expensive (a full solid intersection) is the difference between seconds and hours.',
        '**Interviews:** BIM and AEC software roles routinely ask about vectors, transforms and intersections.'
      ] },
      { type: 'h2', text: 'How this course is organised' },
      { type: 'table', head: ['Module', 'What you will learn'], rows: [
        ['Foundations', 'Coordinate systems, units and tolerance, angles, trigonometry on site'],
        ['Vectors', 'Points vs vectors, dot and cross products, your own `Vec3` type'],
        ['Lines and curves', 'Parametric lines, closest points, intersections, arcs, polylines, Bézier curves'],
        ['Planes and polygons', 'Planes, projections, polygon area and winding, triangulation'],
        ['Matrices and transforms', 'Rotation, 4×4 transforms, composing them, local vs world, mirroring'],
        ['Rotations in depth', 'Euler angles and gimbal lock, quaternions, smooth interpolation'],
        ['3D geometry and solids', 'Bounding boxes, meshes, ray casting, clash detection, volumes, sections'],
        ['Master level', 'Robust geometry, georeferencing, cameras, B-rep and NURBS, a mini geometry engine']
      ] },
      { type: 'note', kind: 'tip', text: 'All code in this course is plain C# with no BIM software required: it runs anywhere .NET runs. The free C# course on this site covers everything used here, and the Computational geometry lesson of the DSA course is a good companion to the Lines and Planes modules.' },
      { type: 'quiz', question: 'A straight wall in a BIM model is mainly stored as…', options: [
        'a 3D mesh of every face, saved once when you draw it',
        'a location line (two points) plus a thickness, a height and settings',
        'a picture of the wall in each view',
        'its length, area and volume'
      ], answer: 1, explain: 'The software stores the defining parameters and computes the outline, faces, area, volume and every view from them. That is why changing one end point updates everything.' },
      { type: 'quiz', question: 'Which maths does a BIM tool need to report a room’s floor area?', options: ['Line–line intersection', 'Polygon area', 'Quaternions', 'The separating-axis theorem'], answer: 1, explain: 'A room’s boundary is a polygon, and its area comes from the shoelace formula, covered in the Planes and polygons module.' },
      { type: 'exercise', task: 'Write `WallVolume(Pt a, Pt b, double thickness, double height)` that returns the volume of a straight wall. Print the length and volume of a wall from (2, 1) to (2, 7), 0.3 m thick and 2.7 m high, both with two decimals.', hint: 'Compute the length with Pythagoras, then multiply by thickness and height. Format with `:F2`.', solution: cs`
using Pt = (double X, double Y);

static double Length(Pt a, Pt b)
{
    double dx = b.X - a.X, dy = b.Y - a.Y;
    return Math.Sqrt(dx * dx + dy * dy);
}

static double WallVolume(Pt a, Pt b, double thickness, double height)
    => Length(a, b) * thickness * height;

Pt a = (2, 1), b = (2, 7);
Console.WriteLine($"Length: {Length(a, b):F2} m");
Console.WriteLine($"Volume: {WallVolume(a, b, 0.3, 2.7):F2} cubic metres");`, output: 'Length: 6.00 m\nVolume: 4.86 cubic metres' }
    ],
    keyPoints: [
      'BIM elements are stored as a few **defining numbers**; outlines, areas, volumes and views are computed from them.',
      'Every everyday action in a BIM tool, from joining walls to clash checks, rests on a small set of geometric ideas.',
      'Plug-ins, scripts and IFC tools have to do that geometry themselves, which is why this maths matters in practice.',
      'The course goes from coordinates and vectors up to transforms, solids and georeferencing, all in plain C#.'
    ]
  },

  // ------------------------------------------------------------------ 2
  {
    slug: 'coordinate-systems',
    title: 'Coordinate systems: 2D, 3D, right-handed, Z-up',
    summary: 'Origins, axes and coordinates; why BIM uses a right-handed Z-up system; how to convert from Y-up formats such as glTF; and why the screen’s Y axis points down.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'To describe where something is, you need three things: an **origin** (the zero point), a set of **axes** (directions to measure along) and a **unit** (how long “1” is). A **coordinate** is just the distance from the origin along each axis.' },
      { type: 'h2', text: 'In plan: X and Y' },
      { type: 'p', text: 'On a floor plan, the usual convention is **X to the right** (east on a north-up drawing) and **Y up the page** (north). A column at (6, 4) sits 6 m east and 4 m north of the origin. Negative values are simply west of or south of it.' },
      { type: 'h2', text: 'In 3D: add Z for height' },
      { type: 'p', text: 'BIM tools (Revit, ArchiCAD, IFC files, AutoCAD, Rhino) add a third axis, **Z, pointing up**. So a point on level 2 at 3.5 m might be (6, 4, 3.5). Plans look straight down the Z axis; elevations look along X or Y.' },
      { type: 'p', text: 'Turn the axes below, move the point and switch between conventions. The dashed lines walk from the origin to the point: across the floor first, then straight up. Notice which letter “up” has in each convention.' },
      { type: 'widget', name: 'axes-3d' },
      { type: 'h2', text: 'Right-handed and left-handed' },
      { type: 'p', text: 'Once X and Y are fixed there are two choices for the third axis. In a **right-handed** system, point the fingers of your right hand along +X, curl them towards +Y, and your thumb points along +Z. A left-handed system uses the left hand, so its Z points the other way.' },
      { type: 'ul', items: [
        'Handedness also fixes which way is a **positive rotation**: in a right-handed system, a positive angle about Z turns counter-clockwise when you look down from above. That is the convention used throughout this course.',
        'It decides the direction of the **cross product** (coming in the Vectors module), which is how software finds a face’s outward normal.',
        'Mixing the two silently mirrors a model: left becomes right, and every door swings the wrong way.'
      ] },
      { type: 'table', head: ['Software or format', 'Up axis', 'Handedness'], rows: [
        ['Revit, IFC, AutoCAD, Rhino, ArchiCAD', 'Z', 'Right-handed'],
        ['glTF, three.js, OpenGL convention', 'Y', 'Right-handed'],
        ['Unity', 'Y', 'Left-handed'],
        ['Unreal Engine', 'Z', 'Left-handed']
      ] },
      { type: 'h2', text: 'Converting Y-up to Z-up' },
      { type: 'p', text: 'Exporting a model to a web viewer or a game engine, or importing a glTF file, means converting between conventions. For two right-handed systems the rule is short: the Y-up “up” becomes Z, and the Y-up “towards the viewer” axis becomes **minus** Y.' },
      { type: 'code', title: 'YUpToZUp.cs', code: cs`
using P3 = (double X, double Y, double Z);

static P3 YUpToZUp(P3 p) => (p.X, -p.Z, p.Y);
static P3 ZUpToYUp(P3 p) => (p.X, p.Z, -p.Y);

P3 columnTop = (4, 3, -2);          // from a glTF file: Y is up
P3 inModel = YUpToZUp(columnTop);
Console.WriteLine($"Z-up: {inModel}");
Console.WriteLine($"Back: {ZUpToYUp(inModel)}");`, output: 'Z-up: (4, 2, 3)\nBack: (4, 3, -2)' },
      { type: 'note', kind: 'warn', text: 'Swapping Y and Z **without** the minus sign, `(x, z, y)`, is a common bug. It looks almost right, but it turns a right-handed system into a left-handed one, so the whole model comes out mirrored.' },
      { type: 'h2', text: 'Screens point Y down' },
      { type: 'p', text: 'Screens, images, SVG and WPF all put the origin at the **top-left** with **Y growing downwards**. To draw a plan you flip Y and scale from metres to pixels. Every widget on this page does exactly this.' },
      { type: 'code', title: 'ToScreen.cs', code: cs`
// Plan (metres, Y up) to a canvas (pixels, Y down) that is 'height' pixels tall.
static (double X, double Y) ToScreen(double x, double y, double scale, double height)
    => (x * scale, height - y * scale);

Console.WriteLine(ToScreen(0, 0, 50, 400));     // origin: bottom-left corner
Console.WriteLine(ToScreen(6, 4, 50, 400));`, output: '(0, 400)\n(300, 200)' },
      { type: 'h2', text: 'Several origins in one project' },
      { type: 'p', text: 'A real project has more than one coordinate system. The **internal origin** is where the software measures from; a **project base point** gives the building a convenient origin (often a grid intersection); the **survey point** ties the model to real-world site coordinates. Elements inside a family or block have their own **local** coordinates too. The Matrices module shows how to move between all of them.' },
      { type: 'quiz', question: 'In a right-handed system with X east and Y north, where does +Z point?', options: ['Down', 'Up', 'West', 'It depends on the units'], answer: 1, explain: 'Right hand: fingers along X (east), curl towards Y (north), thumb points up. That is why BIM’s right-handed systems are Z-up.' },
      { type: 'quiz', question: 'A point is (5, 2, 7) in a right-handed Y-up file. Where is it in a right-handed Z-up model?', options: ['(5, 7, 2)', '(5, -7, 2)', '(5, 2, 7)', '(-5, 7, 2)'], answer: 1, explain: 'Up (Y = 2) becomes Z, and the Y-up Z axis (7) becomes minus Y: (5, −7, 2). Plain `(5, 7, 2)` would mirror the model.' },
      { type: 'exercise', task: 'A glTF export (Y-up) contains three points: (1, 3.5, -2), (4, 7.2, -1) and (2, 6, -5). Convert them to Z-up and print the highest point (largest Z).', hint: 'Convert with `(x, -z, y)`, then keep the point whose Z is largest.', solution: cs`
using P3 = (double X, double Y, double Z);

static P3 YUpToZUp(P3 p) => (p.X, -p.Z, p.Y);

P3[] fromFile = { (1, 3.5, -2), (4, 7.2, -1), (2, 6, -5) };

P3 highest = YUpToZUp(fromFile[0]);
foreach (P3 p in fromFile)
{
    P3 q = YUpToZUp(p);
    if (q.Z > highest.Z) highest = q;
}
Console.WriteLine($"Highest: {highest}");`, output: 'Highest: (4, 1, 7.2)' }
    ],
    keyPoints: [
      'A coordinate system is an **origin**, **axes** and a **unit**; a coordinate is the distance along each axis.',
      'BIM tools and IFC use a **right-handed, Z-up** system: X east, Y north, Z up, positive rotation counter-clockwise from above.',
      'Right-handed Y-up to Z-up is `(x, y, z) → (x, −z, y)`; dropping the minus sign mirrors the model.',
      'Screens put Y **down**: flip and scale to draw a plan.',
      'Projects have several origins (internal, project base, survey, local), connected by transforms.'
    ]
  },

  // ------------------------------------------------------------------ 3
  {
    slug: 'units-precision-tolerance',
    title: 'Units, precision and tolerance',
    summary: 'Internal units vs display units, why 0.1 + 0.2 is not 0.3, why float is dangerous far from the origin, and how to compare coordinates with a tolerance.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'Every number in a model has a unit, and every number in a computer has limited precision. Both cause real bugs: a wall that is 304.8 times too long, two points that “should” be equal but are not, a model that jitters in a viewer. This lesson covers the three habits that prevent them.' },
      { type: 'h2', text: 'Internal units and display units' },
      { type: 'p', text: 'BIM software stores lengths in **one internal unit** and converts only when it shows or reads a value. Revit, for example, stores every length in **decimal feet**, even in a metric project; the millimetres you type are converted on the way in. IFC files declare their units in the file, and a reader must apply them.' },
      { type: 'table', head: ['Conversion', 'Exact factor'], rows: [
        ['1 inch', '25.4 mm (exact by definition)'],
        ['1 foot', '304.8 mm (12 × 25.4)'],
        ['1 metre', '1000 mm ≈ 3.28084 ft'],
        ['1 square foot', '0.09290304 m²']
      ] },
      { type: 'code', title: 'Units.cs', code: cs`
const double MmPerFoot = 304.8;

static double MmToFeet(double mm) => mm / MmPerFoot;
static double FeetToMm(double ft) => ft * MmPerFoot;

double wallFt = MmToFeet(3000);
Console.WriteLine(wallFt);
Console.WriteLine(FeetToMm(wallFt));`, output: '9.84251968503937\n3000' },
      { type: 'note', kind: 'tip', text: 'Convert **once**, at the boundary: when reading input or an API value, and when displaying. Inside your code, keep everything in one unit and say which in the name (`lengthFt`, `offsetMm`). Most unit bugs come from converting twice or not at all. Every round trip can also add a tiny error: 3000 mm survives the trip to feet and back exactly, but 1000 mm comes back as 1000.0000000000001.' },
      { type: 'h2', text: 'Floating point is not exact' },
      { type: 'p', text: 'A `double` stores about 15–17 significant digits in binary. Many simple decimals, such as 0.1, have no exact binary form, just as 1/3 has no exact decimal form. Each operation rounds to the nearest representable value, and those tiny errors add up.' },
      { type: 'code', title: 'Drift.cs', code: cs`
double sum = 0;
for (int i = 0; i < 10; i++) sum += 0.1;

Console.WriteLine(sum);
Console.WriteLine(sum == 1.0);
Console.WriteLine(0.1 + 0.2);`, output: '0.9999999999999999\nFalse\n0.30000000000000004' },
      { type: 'p', text: 'Geometry hits this constantly. Rotate a point a quarter turn and the X that should be zero is not quite zero:' },
      { type: 'code', title: 'AlmostZero.cs', code: cs`
double angle = Math.PI / 2;                     // 90 degrees
double x = 10 * Math.Cos(angle), y = 10 * Math.Sin(angle);

Console.WriteLine($"({x}, {y})");
Console.WriteLine(x == 0);`, output: '(6.123233995736766E-16, 10)\nFalse' },
      { type: 'h2', text: 'Compare with a tolerance' },
      { type: 'p', text: 'The fix is to never test computed coordinates with `==`. Ask instead whether they are **close enough**: within a tolerance chosen for the job.' },
      { type: 'code', title: 'Tolerance.cs', code: cs`
using P3 = (double X, double Y, double Z);

const double Tol = 1e-9;

static bool Near(double a, double b) => Math.Abs(a - b) <= Tol;
static bool SamePoint(P3 p, P3 q) => Near(p.X, q.X) && Near(p.Y, q.Y) && Near(p.Z, q.Z);

double x = 10 * Math.Cos(Math.PI / 2);
P3 wallEnd = (x, 10, 0);
P3 nextWallStart = (0, 10, 0);

Console.WriteLine(wallEnd == nextWallStart);
Console.WriteLine(SamePoint(wallEnd, nextWallStart));`, output: 'False\nTrue' },
      { type: 'p', text: 'Picking the tolerance is a modelling decision, not a maths one:' },
      { type: 'ul', items: [
        '**Too small** (say 1e-15) and normal rounding errors make equal points look different, so walls fail to join.',
        '**Too large** (say 1 mm in a model measured in mm) and genuinely different points merge, so small details vanish.',
        'A good absolute tolerance sits far above rounding noise and far below the smallest real detail. For building-scale models in metres, 1e-9 to 1e-6 is typical; BIM kernels use a fixed tolerance tied to their internal unit.',
        'For values that span huge ranges (areas of a bolt and of a site), a **relative** tolerance, `Math.Abs(a - b) <= tol * Math.Max(Math.Abs(a), Math.Abs(b))`, works better.'
      ] },
      { type: 'h2', text: 'float vs double: precision depends on distance from the origin' },
      { type: 'p', text: 'Floating-point numbers are dense near zero and sparse far away. The gap between neighbouring representable values grows with the size of the number. A `float` has only about 7 significant digits, so 10 km from the origin, measured in millimetres, it cannot even represent a whole-millimetre step reliably.' },
      { type: 'code', title: 'FarFromOrigin.cs', code: cs`
float farF = 10_000_000f;          // 10 km in millimetres, as float
double farD = 10_000_000.0;        // the same, as double

Console.WriteLine(farF + 0.3f == farF);
Console.WriteLine(farD + 0.3 == farD);`, output: 'True\nFalse' },
      { type: 'p', text: 'Adding 0.3 mm to the `float` changes nothing at all: the detail is lost. Try it below: move the slider from the origin out to site scale and watch the gap between representable values.' },
      { type: 'widget', name: 'tolerance-lab' },
      { type: 'note', kind: 'warn', text: 'Graphics cards and many viewers use `float`. That is why a model placed at real survey coordinates (hundreds of kilometres from 0, 0) jitters or z-fights in a viewer, and why BIM tools keep geometry near the internal origin and store the offset to the survey point separately. Use `double` for all geometry calculations.' },
      { type: 'h2', text: 'Round for display, not for storage' },
      { type: 'p', text: 'Show `6.12E-16` as `0.00` with `:F2`, but keep the stored value as it is. Rounding stored coordinates every time adds a new error on each edit and can push points across a tolerance boundary.' },
      { type: 'quiz', question: 'Why does `sum == 1.0` print False after adding 0.1 ten times?', options: [
        'C# has a bug in its addition',
        '0.1 has no exact binary form, so each addition rounds and the errors add up',
        '`double` can only hold whole numbers exactly up to 10',
        'The loop runs 11 times'
      ], answer: 1, explain: '0.1 is stored as the nearest binary fraction, very slightly off. Ten roundings later the sum is 0.9999999999999999, one tiny step below 1.' },
      { type: 'quiz', question: 'A model in millimetres uses a tolerance of 5 mm to decide whether two points are the same. What can go wrong?', options: [
        'Nothing; bigger tolerances are always safer',
        'Real details smaller than 5 mm (a 3 mm joint, say) collapse into a single point',
        'Floating-point errors become larger',
        'Walls will never join'
      ], answer: 1, explain: 'A tolerance should be far below the smallest real feature. 5 mm merges genuinely different points, so small joints and offsets disappear.' },
      { type: 'quiz', question: 'Why do models placed at real-world survey coordinates often jitter in viewers?', options: [
        'Survey coordinates are stored in feet',
        'Viewers draw with `float`, which has large gaps between values far from the origin',
        'Survey points are always negative',
        'The model is too big to fit on screen'
      ], answer: 1, explain: '`float` keeps about 7 significant digits. Hundreds of kilometres from the origin, the gap between representable values is centimetres or more, so vertices snap around.' },
      { type: 'exercise', task: 'Write `ToFeetInches(double mm)` that formats a length in feet and whole inches, rounded to the nearest inch, like `9\' 10"`. Test it with 3000 mm and 2743 mm. Watch out for a value that rounds up to 12 inches.', hint: 'Convert to total inches first (`mm / 25.4`), round that, then split into feet (`/ 12`) and inches (`% 12`). Rounding the total first means you can never get 12 inches.', solution: cs`
static string ToFeetInches(double mm)
{
    int totalInches = (int)Math.Round(mm / 25.4);
    int feet = totalInches / 12;
    int inches = totalInches % 12;
    return $"{feet}' {inches}\"";
}

Console.WriteLine(ToFeetInches(3000));
Console.WriteLine(ToFeetInches(2743));`, output: '9\' 10"\n9\' 0"' }
    ],
    keyPoints: [
      'Store lengths in **one internal unit** and convert only at the edges; Revit uses decimal feet internally.',
      'Doubles round: `0.1 + 0.2` is `0.30000000000000004`, and computed coordinates are rarely exactly equal.',
      'Never compare computed coordinates with `==`; use a **tolerance** far above rounding noise and far below real details.',
      'Precision falls with distance from the origin; `float` loses millimetres at site scale, so use `double` and keep geometry near the origin.',
      'Round when you display, not when you store.'
    ]
  },

  // ------------------------------------------------------------------ 4
  {
    slug: 'angles-atan2',
    title: 'Angles: degrees, radians and Atan2',
    summary: 'Radians and why C# uses them, finding a direction’s angle correctly with Atan2, normalising angles, and converting between maths angles and compass bearings.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'Drawings use **degrees**: a 90° corner, a 45° chamfer, a wall at 30°. C#’s `Math.Sin`, `Math.Cos` and `Math.Tan` use **radians**. Mixing them up is one of the most common geometry bugs, so it is worth understanding what a radian is.' },
      { type: 'h2', text: 'What is a radian?' },
      { type: 'p', text: 'Draw a circle of radius 1. Walk around its edge a distance of 1: the angle you have turned is **one radian** (about 57.3°). A full circle is 2π ≈ 6.283 radians, because the circumference of a unit circle is 2π. So 360° = 2π, 180° = π and 90° = π/2.' },
      { type: 'table', head: ['Degrees', '0°', '30°', '45°', '90°', '180°', '270°', '360°'], rows: [
        ['Radians', '0', 'π/6', 'π/4', 'π/2', 'π', '3π/2', '2π'],
        ['Decimal', '0', '0.524', '0.785', '1.571', '3.142', '4.712', '6.283']
      ] },
      { type: 'code', title: 'Radians.cs', code: cs`
static double ToRadians(double deg) => deg * Math.PI / 180;
static double ToDegrees(double rad) => rad * 180 / Math.PI;

Console.WriteLine(Math.Sin(90));                          // the bug: 90 radians
Console.WriteLine(Math.Sin(ToRadians(90)));               // what was meant
Console.WriteLine($"{ToDegrees(1):F4}");                  // one radian in degrees`, output: '0.8939966636005579\n1\n57.2958' },
      { type: 'note', kind: 'tip', text: 'Name angle variables with their unit (`angleDeg`, `rotationRad`) and convert at the edges, exactly as with lengths. Since .NET 8 you can also call `double.DegreesToRadians` and `double.RadiansToDegrees`.' },
      { type: 'h2', text: 'The angle of a direction: use Atan2' },
      { type: 'p', text: 'A wall runs from (x₁, y₁) to (x₂, y₂). What angle does it make with the X axis? The slope is `dy / dx`, and the tangent of the angle is that slope, so it is tempting to write `Math.Atan(dy / dx)`. That is wrong in two ways:' },
      { type: 'ul', items: [
        '`dy / dx` loses the signs: a wall going up-right (2, 2) and one going down-left (−2, −2) have the same slope, 1, so `Atan` gives 45° for both, though they point in opposite directions.',
        'A vertical wall has `dx = 0`. With `double` coordinates the division gives ±∞, which `Atan` happens to survive; with `int` coordinates it throws a `DivideByZeroException`, and a zero-length wall gives `NaN`.'
      ] },
      { type: 'p', text: '`Math.Atan2(dy, dx)` takes the two values separately, so it knows the quadrant and handles `dx = 0`. It returns an angle between −π and π. Drag the point around the dial to compare the two.' },
      { type: 'widget', name: 'angle-dial' },
      { type: 'code', title: 'Direction.cs', code: cs`
// Angle of a direction, counter-clockwise from +X, in [0, 360).
static double DirectionDeg(double dx, double dy)
{
    double deg = Math.Atan2(dy, dx) * 180 / Math.PI;
    return deg < 0 ? deg + 360 : deg;
}

Console.WriteLine($"{Math.Atan(-2.0 / -2.0) * 180 / Math.PI:0.##}");  // Atan: wrong quadrant
Console.WriteLine(DirectionDeg(-2, -2));
Console.WriteLine(DirectionDeg(0, 5));
Console.WriteLine(DirectionDeg(3, -3));`, output: '45\n225\n90\n315' },
      { type: 'note', kind: 'warn', text: 'The argument order is `Atan2(y, x)`, Y first. Swapping them is the classic mistake: it reflects every angle across the 45° line, so 0° becomes 90°.' },
      { type: 'h2', text: 'Normalising angles' },
      { type: 'p', text: 'Angles wrap: 370°, 10° and −350° are the same direction. Before comparing angles or showing them, bring them into one standard range. Two ranges are common: **[0, 360)** for directions, and **(−180, 180]** for turns, where the sign tells you left (+) or right (−).' },
      { type: 'code', title: 'Normalise.cs', code: cs`
static double To360(double deg)
{
    deg %= 360;                      // C#'s % keeps the sign: -350 % 360 = -350
    return deg < 0 ? deg + 360 : deg;
}

static double ToPlusMinus180(double deg)
{
    deg = To360(deg);
    return deg > 180 ? deg - 360 : deg;
}

Console.WriteLine(To360(370));
Console.WriteLine(To360(-350));
Console.WriteLine(ToPlusMinus180(270));        // a 270 left turn is a 90 right turn
Console.WriteLine(ToPlusMinus180(350 - 10));   // turn from 10 to 350`, output: '10\n10\n-90\n-20' },
      { type: 'p', text: 'The last line is the important one: the turn from heading 10° to heading 350° is not +340°, it is 20° to the right. Taking the difference and normalising it to (−180, 180] always gives the short way round.' },
      { type: 'h2', text: 'Maths angles vs compass bearings' },
      { type: 'p', text: 'Maths measures angles **counter-clockwise from east** (+X). Surveyors and site plans use **bearings**: **clockwise from north** (+Y). Both describe the same direction, so converting is one line: `bearing = 90 − angle`, normalised to [0, 360).' },
      { type: 'table', head: ['Direction', 'Maths angle', 'Bearing'], rows: [
        ['East', '0°', '90°'],
        ['North', '90°', '0°'],
        ['West', '180°', '270°'],
        ['South-west', '225°', '225°'],
        ['South-east', '315°', '135°']
      ] },
      { type: 'quiz', question: 'What does `Math.Cos(60)` compute?', options: ['cos 60°, which is 0.5', 'The cosine of 60 radians', 'An error, because 60 is too large', 'cos 60° rounded to an integer'], answer: 1, explain: 'C#’s trig functions always take radians. For 60° you need `Math.Cos(60 * Math.PI / 180)`.' },
      { type: 'quiz', question: 'A wall runs from (5, 5) to (1, 5). What does `Math.Atan2(dy, dx)` return, in degrees?', options: ['0', '90', '180', '−90'], answer: 2, explain: 'dx = −4, dy = 0: the wall points straight along −X, which is 180°. `Math.Atan(0 / -4)` would say 0°, the opposite direction.' },
      { type: 'quiz', question: 'A path heads 350° and then turns to head 20°. What is the turn, normalised to (−180, 180]?', options: ['−330°', '330°', '30°', '−30°'], answer: 2, explain: '20 − 350 = −330, which normalises to +30: a 30° turn to the left (counter-clockwise), the short way round.' },
      { type: 'exercise', task: 'A run of walls goes through the points (0, 0) → (6, 0) → (6, 4) → (2, 7). At each inner corner, print how far the run turns and whether it turns left or right, to one decimal place.', hint: 'Find each wall’s direction with `Atan2`, take the difference between consecutive directions, normalise it to (−180, 180], and use the sign: positive is left.', solution: cs`
using Pt = (double X, double Y);

static double Dir(Pt a, Pt b) => Math.Atan2(b.Y - a.Y, b.X - a.X) * 180 / Math.PI;

static double ToPlusMinus180(double deg)
{
    deg %= 360;
    if (deg < 0) deg += 360;
    return deg > 180 ? deg - 360 : deg;
}

Pt[] run = { (0, 0), (6, 0), (6, 4), (2, 7) };

for (int i = 1; i < run.Length - 1; i++)
{
    double turn = ToPlusMinus180(Dir(run[i], run[i + 1]) - Dir(run[i - 1], run[i]));
    string side = turn >= 0 ? "left" : "right";
    Console.WriteLine($"At {run[i]}: {side} {Math.Abs(turn):F1} deg");
}`, output: 'At (6, 0): left 90.0 deg\nAt (6, 4): left 53.1 deg' }
    ],
    keyPoints: [
      'C# trig functions use **radians**: 360° = 2π. Convert with `deg * Math.PI / 180`.',
      'Find a direction’s angle with `Math.Atan2(dy, dx)` (Y first). `Atan(dy / dx)` gets the quadrant wrong and fails on vertical lines.',
      'Normalise angles before comparing them: [0, 360) for directions, (−180, 180] for turns.',
      'Maths angles run counter-clockwise from east; bearings run clockwise from north: `bearing = 90 − angle`.'
    ]
  },

  // ------------------------------------------------------------------ 5
  {
    slug: 'trigonometry-on-site',
    title: 'Trigonometry on site: slopes, pitches, rise and run',
    summary: 'Sine, cosine and tangent on right-angled triangles; the four ways to write a slope; roof pitches, ramps and stairs; and checking a corner is square with the cosine rule.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'Roofs, ramps, stairs, drains and setting out on site all come down to one shape: the **right-angled triangle**. Builders call its sides **run** (horizontal), **rise** (vertical) and the sloping side, for a roof, the **rafter**.' },
      { type: 'h2', text: 'Pythagoras, sine, cosine and tangent' },
      { type: 'p', text: 'For a right-angled triangle with slope angle θ (measured from the horizontal):' },
      { type: 'table', head: ['Relation', 'Formula', 'Use it when you know…'], rows: [
        ['Pythagoras', 'rafter² = run² + rise²', 'two sides, and want the third'],
        ['Tangent', 'tan θ = rise / run', 'the angle and the run, and want the rise'],
        ['Cosine', 'cos θ = run / rafter', 'the angle and the run, and want the rafter'],
        ['Sine', 'sin θ = rise / rafter', 'the angle and the rafter, and want the rise'],
        ['Inverse', 'θ = Atan(rise / run)', 'two sides, and want the angle']
      ] },
      { type: 'note', kind: 'info', text: 'Here `Atan(rise / run)` is fine, unlike in the previous lesson: rise and run are both positive lengths, so there is no quadrant to lose.' },
      { type: 'code', title: 'Rafter.cs', code: cs`
static double Rad(double deg) => deg * Math.PI / 180;

static double Rise(double run, double pitchDeg) => run * Math.Tan(Rad(pitchDeg));
static double Rafter(double run, double pitchDeg) => run / Math.Cos(Rad(pitchDeg));

double run = 4.0, pitch = 30;                 // half the span of an 8 m roof
Console.WriteLine($"Rise:   {Rise(run, pitch):F3} m");
Console.WriteLine($"Rafter: {Rafter(run, pitch):F3} m");`, output: 'Rise:   2.309 m\nRafter: 4.619 m' },
      { type: 'h2', text: 'Four ways to write a slope' },
      { type: 'p', text: 'The same slope is written differently by different trades, and converting between them is everyday work:' },
      { type: 'ul', items: [
        '**Angle** in degrees, from the horizontal: “a 30° roof”.',
        '**Ratio** rise : run, usually with the rise as 1: “a 1:12 ramp” rises 1 for every 12 along.',
        '**Percentage**, rise ÷ run × 100: “a 2% fall” on a flat roof or a drain drops 2 cm per metre.',
        '**Pitch** in inches of rise per 12 inches of run, common for roofs in the US: “a 6 in 12 roof”.'
      ] },
      { type: 'widget', name: 'roof-pitch' },
      { type: 'note', kind: 'warn', text: 'A 100% slope is **45°**, not 90°: rise equals run. A vertical wall would be an infinite percentage. Mixing up percentages and degrees on a drawing is a costly mistake: a 10% ramp is about 5.7°, but a 10° ramp is about 17.6%.' },
      { type: 'code', title: 'Slopes.cs', code: cs`
static double PercentToDeg(double pct) => Math.Atan(pct / 100) * 180 / Math.PI;
static double RatioToPercent(double rise, double run) => rise / run * 100;

double ramp = RatioToPercent(1, 12);
Console.WriteLine($"1:12 ramp    = {ramp:F2}% = {PercentToDeg(ramp):F2} deg");

double roof = RatioToPercent(6, 12);
Console.WriteLine($"6 in 12 roof = {roof:F2}% = {PercentToDeg(roof):F2} deg");

Console.WriteLine($"100% slope   = {PercentToDeg(100):F2} deg");`, output: '1:12 ramp    = 8.33% = 4.76 deg\n6 in 12 roof = 50.00% = 26.57 deg\n100% slope   = 45.00 deg' },
      { type: 'p', text: 'Many accessibility codes, for example the US ADA standards, set **1:12** as the steepest allowed ramp, which is the 8.33% above. Check your local code: limits and landing rules vary by country.' },
      { type: 'h2', text: 'Is the corner square? The cosine rule' },
      { type: 'p', text: 'Setting-out crews check a right angle with the **3-4-5 rule**: measure 3 m along one side, 4 m along the other, and the diagonal must be exactly 5 m, because 3² + 4² = 5². If the diagonal is a little off, the **cosine rule** tells you the actual angle. It works for any triangle, not only right-angled ones:' },
      { type: 'p', text: '`c² = a² + b² − 2ab·cos C`, so `C = Acos((a² + b² − c²) / (2ab))`, where C is the angle opposite side c.' },
      { type: 'code', title: 'Square.cs', code: cs`
static double AngleDeg(double a, double b, double c)
    => Math.Acos((a * a + b * b - c * c) / (2 * a * b)) * 180 / Math.PI;

Console.WriteLine($"{AngleDeg(6, 8, 10):F2}");       // perfect 6-8-10
Console.WriteLine($"{AngleDeg(6, 8, 10.012):F2}");   // diagonal 12 mm long`, output: '90.00\n90.14' },
      { type: 'p', text: 'A 12 mm error on a 10 m diagonal means the corner is open by about 0.14°. Over a 30 m wall that is a 75 mm error at the far end: exactly the kind of number worth catching on the first day.' },
      { type: 'quiz', question: 'A roof has a 3 m run and a 1.5 m rise. What is its slope as a percentage?', options: ['20%', '50%', '26.6%', '200%'], answer: 1, explain: 'Rise ÷ run × 100 = 1.5 ÷ 3 × 100 = 50%. That is also 6 in 12, or about 26.57°.' },
      { type: 'quiz', question: 'Which is steeper: a 10% ramp or a 10° ramp?', options: ['The 10% ramp', 'The 10° ramp', 'They are the same', 'It depends on the length'], answer: 1, explain: '10% is Atan(0.10) ≈ 5.7°, so the 10° ramp is almost twice as steep.' },
      { type: 'quiz', question: 'You know a rafter’s length and its angle. Which function gives the rise?', options: ['Tangent', 'Cosine', 'Sine', 'Pythagoras'], answer: 2, explain: 'sin θ = rise / rafter, so rise = rafter × sin θ.' },
      { type: 'exercise', task: 'A stair must climb 3000 mm, with no riser taller than 180 mm and a going (tread depth) of 250 mm. Work out the number of risers, the actual riser height (one decimal), the pitch in degrees (one decimal) and the total horizontal run. A stair has one fewer going than risers.', hint: 'Risers = `Math.Ceiling(3000 / 180.0)`. Riser height = 3000 / risers. Pitch = `Atan(riser / going)`. Run = (risers − 1) × going.', solution: cs`
double totalRise = 3000, maxRiser = 180, going = 250;

int risers = (int)Math.Ceiling(totalRise / maxRiser);
double riser = totalRise / risers;
double pitch = Math.Atan(riser / going) * 180 / Math.PI;
double run = (risers - 1) * going;

Console.WriteLine($"{risers} risers of {riser:F1} mm");
Console.WriteLine($"Going {going} mm, pitch {pitch:F1} deg");
Console.WriteLine($"Horizontal run {run} mm");`, output: '17 risers of 176.5 mm\nGoing 250 mm, pitch 35.2 deg\nHorizontal run 4000 mm' }
    ],
    keyPoints: [
      'Roofs, ramps and stairs are right-angled triangles: **run**, **rise** and the sloping side.',
      'tan θ = rise / run, cos θ = run / slope length, sin θ = rise / slope length.',
      'A slope can be an angle, a ratio (1:12), a percentage (rise ÷ run × 100) or a pitch (6 in 12); 100% is 45°.',
      'The **cosine rule** gives any angle of a triangle from its three sides, which is how site crews check corners are square.'
    ]
  }
];
