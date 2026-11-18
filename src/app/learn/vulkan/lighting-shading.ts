import { Lesson } from '../learn.types';
import { cs } from '../csharp/cs';

/**
 * Vulkan module 6. Every C# sample was run with Silk.NET 2.23 on an Intel Iris Xe (Vulkan 1.4 driver) on Windows 11;
 * the outputs are from that machine. Code blocks titled Engine/*.cs extend the engine from modules 2 to 5: each sample uses
 * the latest version of every Engine file shown before it. Lighting is checked against the same formulas run on the CPU.
 */
export const LIGHTING_SHADING: Lesson[] = [
  // ------------------------------------------------------------------ 1
  {
    slug: 'blinn-phong',
    title: 'Lighting basics: normals and Blinn-Phong',
    summary: 'Light a surface from its normal, the direction to the light and the direction to the eye: ambient, diffuse and Blinn-Phong specular. Pass per-frame values in a uniform buffer per frame in flight, transform normals with the normal matrix, and check the GPU against the same formula on the CPU.',
    minutes: 24,
    blocks: [
      { type: 'p', text: 'Until now every surface has had a flat colour, darkened a little on vertical faces so that shapes read. Real shading starts from one question per pixel: **how much light leaves this point of the surface towards the eye?** The answer depends on three directions, all unit vectors at the surface point:' },
      { type: 'table', head: ['Vector', 'Meaning', 'Where it comes from'], rows: [
        ['**n**', 'The surface normal', 'The mesh’s normals, transformed to world space and interpolated'],
        ['**l**', 'Towards the light', 'For the sun (a directional light), the same everywhere'],
        ['**v**', 'Towards the eye', 'Camera position minus the point’s world position']
      ] },
      { type: 'h2', text: 'The Blinn-Phong model' },
      { type: 'p', text: 'Blinn-Phong, the standard of 1990s and 2000s real-time graphics, adds three terms:' },
      { type: 'ul', items: [
        '**Ambient:** a constant for light bounced around the room, so that faces turned away from the sun are not black.',
        '**Diffuse (Lambert):** albedo × light × max(n · l, 0). A matte surface looks equally bright from every direction, but receives less light when it is tilted away from the light, by the cosine of the angle.',
        '**Specular:** light × max(n · h, 0)^shininess, where **h** = normalise(l + v) is the **half vector**, halfway between the light and the eye. Where n lines up with h, the surface mirrors the light into the eye: a highlight. A higher shininess makes it smaller and sharper.'
      ] },
      { type: 'p', text: 'Phong’s original model compared the eye with the reflected light direction; Blinn’s half vector is cheaper and gives highlights that behave better at grazing angles. Try both:' },
      { type: 'widget', name: 'blinn-phong' },
      { type: 'p', text: 'Lighting must be computed in **linear** colour. The swapchain is sRGB, so the GPU converts the shader’s linear output when it writes the pixel, as module 4 showed with textures. Adding and multiplying sRGB values directly is a classic mistake that makes lit surfaces look washed out.' },
      { type: 'h2', text: 'Per-frame values in a uniform buffer' },
      { type: 'p', text: 'The camera and the light are the same for every object, so they go in a **uniform buffer** at set 0, written once per frame. Per-object values (the model matrix and the material) stay in push constants. The struct already has room for the shadow and image-based lighting lessons that follow. Using only `Matrix4x4` and `Vector4` keeps the C# layout identical to std140, as module 3 explained:' },
      { type: 'code', title: 'Engine/Lighting.cs', code: cs`
using System.Numerics;
using System.Runtime.InteropServices;
using Silk.NET.Vulkan;

/// <summary>Per-frame values every lit shader reads at set 0, binding 0. Only mat4 and vec4: the same layout in C# and std140.</summary>
[StructLayout(LayoutKind.Sequential)]
struct FrameUniforms
{
    public Matrix4x4 ViewProjection;
    public Matrix4x4 LightViewProjection;   // the shadow map's camera (lesson 3)
    public Vector4 CameraPosition;          // xyz
    public Vector4 LightDirection;          // xyz: unit vector towards the light
    public Vector4 LightColor;              // rgb: colour × intensity
    public Vector4 Ambient;                 // rgb; w: shadow bias (lesson 3)
}

/// <summary>Per-object push constant for lit shaders: model matrix, colour, and four material values. 96 bytes.</summary>
[StructLayout(LayoutKind.Sequential)]
struct LitPush(Matrix4x4 model, Vector4 color, Vector4 material)
{
    public Matrix4x4 Model = model;
    public Vector4 Color = color;
    public Vector4 Material = material;     // Blinn-Phong: shininess, specular strength. PBR: metallic, roughness.
    public const uint Size = 96;
    public static readonly PushConstantRange Range = new(ShaderStageFlags.VertexBit | ShaderStageFlags.FragmentBit, 0, Size);
}

/// <summary>The lighting formulas on the CPU, to check what the GPU draws.</summary>
static class Lighting
{
    public static Vector3 BlinnPhong(Vector3 normal, Vector3 toLight, Vector3 toEye, Vector3 albedo,
                                     Vector3 lightColor, Vector3 ambient, float shininess, float specular)
    {
        var n = Vector3.Normalize(normal);
        var h = Vector3.Normalize(toLight + toEye);                         // the half vector
        float diffuse = MathF.Max(Vector3.Dot(n, toLight), 0f);
        float highlight = diffuse > 0f ? MathF.Pow(MathF.Max(Vector3.Dot(n, h), 0f), shininess) * specular : 0f;
        return albedo * (ambient + lightColor * diffuse) + lightColor * highlight;
    }

    /// <summary>Linear 0..1 to an sRGB byte, as the GPU does when it writes an sRGB image.</summary>
    public static byte ToSrgb(float linear)
    {
        float c = Math.Clamp(linear, 0f, 1f);
        float s = c <= 0.0031308f ? c * 12.92f : 1.055f * MathF.Pow(c, 1f / 2.4f) - 0.055f;
        return (byte)MathF.Round(s * 255f);
    }

    public static (byte R, byte G, byte B) ToSrgb(Vector3 c) => (ToSrgb(c.X), ToSrgb(c.Y), ToSrgb(c.Z));
}` },
      { type: 'h2', text: 'Normals need their own matrix' },
      { type: 'p', text: 'A position is transformed by the model matrix. A normal is not, if the matrix scales differently along different axes. Stretch a sphere into a flat ellipsoid and transform its normals by the same matrix: they lean towards the stretched direction, while the true normals lean the other way. The correct transform is the **normal matrix**, the inverse transpose of the model matrix’s 3 × 3 part. For rotations and uniform scales it equals the model matrix (up to length), which is why the mistake hides until a model is scaled unevenly.' },
      { type: 'code', title: 'Engine/LitShaders.cs', code: cs`
static class LitShaders
{
    /// <summary>World position and world normal for the fragment shader. Used by every lit shader in this module.</summary>
    public const string Vertex = """
        #version 450

        layout(location = 0) in vec3 inPosition;
        layout(location = 1) in vec3 inNormal;
        layout(location = 2) in vec2 inUv;
        layout(location = 0) out vec3 vWorldPos;
        layout(location = 1) out vec3 vNormal;
        layout(location = 2) out vec2 vUv;

        layout(set = 0, binding = 0) uniform Frame
        {
            mat4 viewProjection; mat4 lightViewProjection;
            vec4 cameraPosition; vec4 lightDirection; vec4 lightColor; vec4 ambient;
        } frame;
        layout(push_constant) uniform Push { mat4 model; vec4 color; vec4 material; } push;

        void main()
        {
            vec4 world = push.model * vec4(inPosition, 1.0);
            vWorldPos = world.xyz;
            vNormal = transpose(inverse(mat3(push.model))) * inNormal;     // the normal matrix
            vUv = inUv;
            gl_Position = frame.viewProjection * world;
        }
        """;

    public const string BlinnPhong = """
        #version 450

        layout(location = 0) in vec3 vWorldPos;
        layout(location = 1) in vec3 vNormal;
        layout(location = 0) out vec4 outColor;

        layout(set = 0, binding = 0) uniform Frame
        {
            mat4 viewProjection; mat4 lightViewProjection;
            vec4 cameraPosition; vec4 lightDirection; vec4 lightColor; vec4 ambient;
        } frame;
        layout(push_constant) uniform Push { mat4 model; vec4 color; vec4 material; } push;

        void main()
        {
            vec3 n = normalize(vNormal);                                    // interpolation shortens it
            vec3 l = frame.lightDirection.xyz;
            vec3 v = normalize(frame.cameraPosition.xyz - vWorldPos);
            vec3 h = normalize(l + v);
            float diffuse = max(dot(n, l), 0.0);
            float specular = diffuse > 0.0 ? pow(max(dot(n, h), 0.0), push.material.x) * push.material.y : 0.0;
            vec3 color = push.color.rgb * (frame.ambient.rgb + frame.lightColor.rgb * diffuse) + frame.lightColor.rgb * specular;
            outColor = vec4(color, push.color.a);
        }
        """;
}` },
      { type: 'p', text: '`inverse` in a vertex shader costs a few dozen instructions per vertex. Engines with many vertices compute the normal matrix once per object on the CPU and pass it in, which needs another 48 bytes of push constants; here clarity wins.' },
      { type: 'p', text: 'Shading a sphere shows every term at once, so `Shapes` gains one. Like the box and the cylinder, it fills the unit box and is wound counter-clockwise seen from outside:' },
      { type: 'code', title: 'Engine/Shapes.cs', code: cs`
using System.Numerics;

static class Shapes
{
    /// <summary>An axis-aligned box: 4 vertices per face, each with the face's normal, and 36 indices.</summary>
    public static (MeshVertex[] Vertices, uint[] Indices) Box(Vector3 min, Vector3 max)
    {
        var vertices = new List<MeshVertex>();
        var indices = new List<uint>();
        Vector3 centre = (min + max) / 2f, half = (max - min) / 2f;
        foreach (var n in new[] { Vector3.UnitX, -Vector3.UnitX, Vector3.UnitY, -Vector3.UnitY, Vector3.UnitZ, -Vector3.UnitZ })
        {
            var u = MathF.Abs(n.Z) > 0 ? Vector3.UnitX : Vector3.UnitZ;     // two directions across the face
            var v = Vector3.Cross(n, u);
            uint first = (uint)vertices.Count;
            foreach (var (a, b) in new[] { (-1f, -1f), (1f, -1f), (1f, 1f), (-1f, 1f) })
                vertices.Add(new MeshVertex(centre + (n + a * u + b * v) * half, n, new Vector2((a + 1) / 2, (b + 1) / 2)));
            indices.AddRange([first, first + 1, first + 2, first, first + 2, first + 3]);
        }
        return (vertices.ToArray(), indices.ToArray());
    }

    /// <summary>A cylinder that fills the unit box: radius 0.5, z from -0.5 to 0.5, smooth sides and flat ends.</summary>
    public static (MeshVertex[] Vertices, uint[] Indices) Cylinder(int sides)
    {
        var vertices = new List<MeshVertex>();
        var indices = new List<uint>();
        for (int i = 0; i <= sides; i++)                                    // the side: a bottom and a top vertex per step
        {
            float a = 2f * MathF.PI * i / sides;
            var n = new Vector3(MathF.Cos(a), MathF.Sin(a), 0f);
            vertices.Add(new MeshVertex(n * 0.5f - Vector3.UnitZ * 0.5f, n, new Vector2((float)i / sides, 1f)));
            vertices.Add(new MeshVertex(n * 0.5f + Vector3.UnitZ * 0.5f, n, new Vector2((float)i / sides, 0f)));
        }
        for (uint i = 0; i < sides; i++)
        {
            uint b0 = 2 * i, t0 = b0 + 1, b1 = b0 + 2, t1 = b0 + 3;
            indices.AddRange([b0, b1, t1, b0, t1, t0]);
        }
        foreach (float z in new[] { 0.5f, -0.5f })                          // the two ends: a fan around the centre
        {
            var n = new Vector3(0f, 0f, MathF.Sign(z));
            uint centre = (uint)vertices.Count;
            vertices.Add(new MeshVertex(new Vector3(0f, 0f, z), n, new Vector2(0.5f, 0.5f)));
            for (int i = 0; i < sides; i++)
            {
                float a = 2f * MathF.PI * i / sides;
                vertices.Add(new MeshVertex(new Vector3(MathF.Cos(a) * 0.5f, MathF.Sin(a) * 0.5f, z), n, new Vector2(0.5f + MathF.Cos(a) * 0.5f, 0.5f + MathF.Sin(a) * 0.5f)));
            }
            for (uint i = 0; i < sides; i++)
            {
                uint a = centre + 1 + i, b = centre + 1 + (i + 1) % (uint)sides;
                indices.AddRange(z > 0 ? [centre, a, b] : [centre, b, a]);   // counter-clockwise seen from outside
            }
        }
        return (vertices.ToArray(), indices.ToArray());
    }

    /// <summary>A sphere that fills the unit box: radius 0.5, smooth normals, rings from the top (+Z) down.</summary>
    public static (MeshVertex[] Vertices, uint[] Indices) Sphere(int segments, int rings)
    {
        var vertices = new List<MeshVertex>();
        var indices = new List<uint>();
        for (int r = 0; r <= rings; r++)
        {
            float phi = MathF.PI * r / rings;                               // 0 at the top, pi at the bottom
            for (int s = 0; s <= segments; s++)
            {
                float theta = 2f * MathF.PI * s / segments;
                var n = new Vector3(MathF.Sin(phi) * MathF.Cos(theta), MathF.Sin(phi) * MathF.Sin(theta), MathF.Cos(phi));
                vertices.Add(new MeshVertex(n * 0.5f, n, new Vector2((float)s / segments, (float)r / rings)));
            }
        }
        for (int r = 0; r < rings; r++)
            for (int s = 0; s < segments; s++)
            {
                uint a = (uint)(r * (segments + 1) + s), b = a + (uint)segments + 1;      // b is the vertex below a
                indices.AddRange([a, b, a + 1, a + 1, b, b + 1]);                         // counter-clockwise seen from outside
            }
        return (vertices.ToArray(), indices.ToArray());
    }
}` },
      { type: 'h2', text: 'A uniform buffer per frame in flight' },
      { type: 'p', text: 'The frame values change every frame (the camera moves), and while the CPU writes frame n + 1’s values, the GPU may still be reading frame n’s. So there is one `UniformSet` per frame in flight, chosen by `frame.Slot`. `FrameLoop.Begin` has waited for that slot’s previous frame, so writing it is safe. The sets all have identical layouts, which Vulkan calls **compatible**, so a pipeline created with the first one’s layout works with every one of them.' },
      { type: 'code', title: 'BlinnPhong.cs', code: cs`
using System.Numerics;
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
using var loop = new FrameLoop(gpu, window);
var frameSets = Enumerable.Range(0, FrameLoop.FramesInFlight).Select(_ => new UniformSet<FrameUniforms>(gpu)).ToArray();
using var pipeline = new MeshPipeline(gpu, loop.Swapchain.Format, LitShaders.Vertex, LitShaders.BlinnPhong,
    setLayouts: [frameSets[0].Layout], pushConstants: [LitPush.Range], cull: CullModeFlags.BackBit,
    depthFormat: FrameLoop.DepthFormat, vertexLayout: MeshVertex.Layout, frontFace: FrontFace.CounterClockwise);
var (vertices, indices) = Shapes.Sphere(48, 24);
using var sphere = new Mesh<MeshVertex>(gpu, vertices, indices);
using var capture = new ReadbackBuffer(gpu, loop.Swapchain.Extent);

var eye = new Vector3(0f, -5f, 1.2f);
var toLight = Vector3.Normalize(new Vector3(-1f, -1f, 1.2f));                    // the sun: front left, above
var albedo = new Vector3(0.8f, 0.3f, 0.2f);
var (lightColor, ambient, shininess, specular) = (new Vector3(1f), new Vector3(0.05f), 32f, 0.5f);
var viewProjection = Camera.LookAt(eye, Vector3.Zero) * Camera.Perspective(35f, 800f / 600f, 0.1f, 20f);

loop.Begin(out var frame);
frameSets[frame.Slot].Write(new FrameUniforms
{
    ViewProjection = viewProjection, CameraPosition = new(eye, 1f), LightDirection = new(toLight, 0f),
    LightColor = new(lightColor, 1f), Ambient = new(ambient, 0f)
});
loop.BeginRendering(frame);
gpu.Vk.CmdBindPipeline(frame.Cmd, PipelineBindPoint.Graphics, pipeline.Handle);
frameSets[frame.Slot].Bind(frame.Cmd, pipeline.Layout);
var push = new LitPush(Scene.Place(new(-1f), new(1f)), new(albedo, 1f), new(shininess, specular, 0f, 0f));   // a sphere of radius 1
unsafe { gpu.Vk.CmdPushConstants(frame.Cmd, pipeline.Layout, LitPush.Range.StageFlags, 0, LitPush.Size, &push); }
sphere.Draw(frame.Cmd);
loop.EndRendering(frame);
loop.End(frame, capture);
loop.WaitIdle();

var highlight = toLight;                                                         // where n = h: found by repeating n = normalise(l + v)
for (int i = 0; i < 10; i++) highlight = Vector3.Normalize(toLight + Vector3.Normalize(eye - highlight));
foreach (var (name, n) in new[] { ("Facing the light", toLight), ("Highlight", highlight),
                                  ("Facing the camera", Vector3.Normalize(eye)), ("Turned away", Vector3.Normalize(new Vector3(0.8f, -0.5f, -0.3f))) })
{
    var p = Camera.Project(n, viewProjection, loop.Swapchain.Extent);                // on a unit sphere the point is its normal
    var cpu = Lighting.BlinnPhong(n, toLight, Vector3.Normalize(eye - n), albedo, lightColor, ambient, shininess, specular);
    Console.WriteLine($"{name,-17} n·l {Vector3.Dot(n, toLight),5:F2}  GPU {capture.Pixel((int)p.X, (int)p.Y),-15} CPU {Lighting.ToSrgb(cpu)}");
}
foreach (var set in frameSets) set.Dispose();`, output: 'Facing the light  n·l  1.00  GPU (237, 154, 129) CPU (237, 154, 129)\nHighlight         n·l  0.90  GPU (255, 229, 216) CPU (255, 229, 216)\nFacing the camera n·l  0.68  GPU (204, 136, 115) CPU (205, 136, 116)\nTurned away       n·l -0.36  GPU (56, 33, 25)    CPU (56, 33, 25)' },
      { type: 'p', text: 'GPU and CPU agree to within one step of 255. Facing the light, the sphere gets the full diffuse term; at the highlight, where n lines up with h, specular adds white on top and the red channel saturates at 255. The front faces the camera but leans away from the light (n · l = 0.68), so it is darker; on the far side, n · l is negative and only the ambient term remains: 5% of the albedo, which sRGB encoding turns into (56, 33, 25) rather than nearly black. The one-step difference at the front comes from the mesh: its interpolated normal is very close to, but not exactly, the true sphere normal.' },
      { type: 'h2', text: 'The normal matrix, on the GPU' },
      { type: 'p', text: 'The second sample flattens the sphere to a 2 × 2 × 0.6 m ellipsoid, lit from above, and draws it twice: with the normal matrix, and with normals transformed by the model matrix. At one point it computes both normals on the CPU (the true one is the sphere normal divided by the scale, the wrong one multiplied by it) and compares:' },
      { type: 'code', title: 'NormalMatrix.cs', code: cs`
using System.Numerics;
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
using var loop = new FrameLoop(gpu, window);
using var frameSet = new UniformSet<FrameUniforms>(gpu);
var (vertices, indices) = Shapes.Sphere(48, 24);
using var sphere = new Mesh<MeshVertex>(gpu, vertices, indices);
using var capture = new ReadbackBuffer(gpu, loop.Swapchain.Extent);

var eye = new Vector3(0f, -5f, 2f);
var toLight = Vector3.Normalize(new Vector3(0f, -0.3f, 1f));
var viewProjection = Camera.LookAt(eye, Vector3.Zero) * Camera.Perspective(35f, 800f / 600f, 0.1f, 20f);
frameSet.Write(new FrameUniforms { ViewProjection = viewProjection, CameraPosition = new(eye, 1f), LightDirection = new(toLight, 0f), LightColor = Vector4.One });
var scale = new Vector3(2f, 2f, 0.6f);
var model = Scene.Place(-scale / 2f, scale / 2f);
var d = Vector3.Normalize(new Vector3(0.3f, -0.8f, 0.5f));                     // a direction on the unit sphere
var point = d * scale / 2f;                                                     // where the mesh's vertex (0.5 d) ends up
var trueNormal = Vector3.Normalize(d / scale);
var wrongNormal = Vector3.Normalize(d * scale);
var pixel = Camera.Project(point, viewProjection, loop.Swapchain.Extent);
Console.WriteLine($"Angle between the two normals: {MathF.Acos(Vector3.Dot(trueNormal, wrongNormal)) * 180f / MathF.PI:F1} degrees");

foreach (var (label, vertexShader, normal) in new[]
{
    ("Normal matrix", LitShaders.Vertex, trueNormal),
    ("Model matrix ", LitShaders.Vertex.Replace("transpose(inverse(mat3(push.model)))", "mat3(push.model)"), wrongNormal)
})
{
    using var pipeline = new MeshPipeline(gpu, loop.Swapchain.Format, vertexShader, LitShaders.BlinnPhong,
        setLayouts: [frameSet.Layout], pushConstants: [LitPush.Range], cull: CullModeFlags.BackBit,
        depthFormat: FrameLoop.DepthFormat, vertexLayout: MeshVertex.Layout, frontFace: FrontFace.CounterClockwise);
    loop.Begin(out var frame);
    loop.BeginRendering(frame);
    gpu.Vk.CmdBindPipeline(frame.Cmd, PipelineBindPoint.Graphics, pipeline.Handle);
    frameSet.Bind(frame.Cmd, pipeline.Layout);
    var push = new LitPush(model, new(0.9f, 0.9f, 0.9f, 1f), new(1f, 0f, 0f, 0f));          // matte white: diffuse only
    unsafe { gpu.Vk.CmdPushConstants(frame.Cmd, pipeline.Layout, LitPush.Range.StageFlags, 0, LitPush.Size, &push); }
    sphere.Draw(frame.Cmd);
    loop.EndRendering(frame);
    loop.End(frame, capture);
    loop.WaitIdle();
    var cpu = Lighting.BlinnPhong(normal, toLight, Vector3.Normalize(eye - point), new(0.9f), Vector3.One, Vector3.Zero, 1f, 0f);
    Console.WriteLine($"{label}: n·l {Vector3.Dot(normal, toLight):F2}, GPU {capture.Pixel((int)pixel.X, (int)pixel.Y)}, CPU with this normal {Lighting.ToSrgb(cpu)}");
}`, output: 'Angle between the two normals: 52.9 degrees\nNormal matrix: n·l 0.98, GPU (241, 241, 241), CPU with this normal (241, 241, 241)\nModel matrix : n·l 0.43, GPU (167, 167, 167), CPU with this normal (167, 167, 167)' },
      { type: 'p', text: 'Flattening the sphere turned the true and the wrong normals 53° apart. With the normal matrix, the GPU’s pixel matches the CPU’s lighting computed with the true normal: the point faces the light almost squarely (n · l = 0.98). With the model matrix, it matches the wrong normal instead, which leans sideways and receives less than half the light. Nothing crashes and nothing warns; the shading is simply wrong.' },
      { type: 'note', kind: 'tip', text: 'BIM models are full of unevenly scaled instances: a standard door family stretched to a wider opening, a unit box scaled into a 30 m beam. The normal matrix is not optional in a BIM viewer.' },
      { type: 'quiz', question: 'Why must normals be transformed by the inverse transpose of the model matrix?', options: ['To normalise them', 'A non-uniform scale tilts transformed normals the wrong way; the inverse transpose keeps them perpendicular to the transformed surface', 'Because normals are in view space', 'It is faster than the model matrix'], answer: 1, explain: 'A normal must stay perpendicular to the surface. Under a scale S, tangents scale by S and the normal must scale by S⁻¹ to remain perpendicular; the inverse transpose does that for any matrix.' },
      { type: 'quiz', question: 'Why is there one frame uniform buffer per frame in flight?', options: ['Vulkan allows only one write per buffer', 'While the CPU writes the next frame’s camera, the GPU may still be reading the previous frame’s from the same buffer', 'To double the precision', 'Uniform buffers cannot be bound twice'], answer: 1, explain: 'With two frames in flight, one buffer would be overwritten while the GPU reads it. Each slot has its own buffer, written after Begin has waited for that slot’s previous frame.' },
      { type: 'exercise', task: 'A roof plane slopes at about 37°: its normal is (0, −0.6, 0.8). The building is placed with a model matrix that stretches y by 2 (a deeper footprint). Print the slope of the true transformed normal and of the normal transformed by the model matrix, and the error in degrees.', hint: 'The true normal is the model’s inverse transpose applied to n, which for a pure scale divides by the scale: (0, −0.6 / 2, 0.8). The wrong one multiplies: (0, −1.2, 0.8). The slope angle from horizontal is acos(n.z) after normalising.', solution: cs`
using System.Numerics;

var n = new Vector3(0f, -0.6f, 0.8f);
var scale = new Vector3(1f, 2f, 1f);
float Slope(Vector3 v) => MathF.Acos(Vector3.Normalize(v).Z) * 180f / MathF.PI;

var model = Matrix4x4.CreateScale(scale);
Matrix4x4.Invert(model, out var inverse);
var trueNormal = Vector3.Normalize(Vector3.TransformNormal(n, Matrix4x4.Transpose(inverse)));
var wrongNormal = Vector3.Normalize(Vector3.TransformNormal(n, model));
Console.WriteLine($"Roof slope before scaling:      {Slope(n):F1} degrees");
Console.WriteLine($"Normal matrix:  {trueNormal:F3}, slope {Slope(trueNormal):F1} degrees");
Console.WriteLine($"Model matrix:   {wrongNormal:F3}, slope {Slope(wrongNormal):F1} degrees");
Console.WriteLine($"Error: {Slope(wrongNormal) - Slope(trueNormal):F1} degrees");`, output: 'Roof slope before scaling:      36.9 degrees\nNormal matrix:  <0.000, -0.351, 0.936>, slope 20.6 degrees\nModel matrix:   <0.000, -0.832, 0.555>, slope 56.3 degrees\nError: 35.8 degrees' }
    ],
    keyPoints: [
      'Shading uses three unit vectors at the point: the normal n, towards the light l, towards the eye v.',
      'Blinn-Phong = ambient + albedo × light × max(n·l, 0) + light × max(n·h, 0)^shininess, with h = normalise(l + v).',
      'Compute lighting in linear colour; the sRGB swapchain converts on write.',
      'Per-frame values go in a uniform buffer per frame in flight; per-object values in push constants.',
      'Transform normals with the normal matrix (inverse transpose); the model matrix is wrong under non-uniform scale.',
      'Check the GPU against the same formula on the CPU.'
    ]
  },

  // ------------------------------------------------------------------ 2
  {
    slug: 'pbr',
    title: 'Physically based rendering (PBR)',
    summary: 'Replace shininess with physics: the Cook-Torrance microfacet model with the GGX distribution, Smith shadowing and Schlick’s Fresnel, driven by base colour, metallic and roughness. Draw a grid of spheres and check every one against the CPU.',
    minutes: 26,
    blocks: [
      { type: 'p', text: 'Blinn-Phong’s numbers have no physical meaning. A shininess of 32 under one light looks wrong under another, and artists tune every material per scene. **Physically based rendering** (PBR) describes surfaces with measurable properties instead, and uses a model that conserves energy, so a material authored once looks right under any lighting. It is also how materials arrive from the outside world: glTF, the format module 4 loaded, defines its materials with exactly the parameters below.' },
      { type: 'table', head: ['Parameter', 'Range', 'Meaning'], rows: [
        ['**Base colour**', 'RGB', 'Albedo for non-metals; the colour of the reflection for metals'],
        ['**Metallic**', '0 or 1 (blends in between)', 'Metals have no diffuse light and tinted reflections; non-metals (dielectrics) reflect about 4%, untinted'],
        ['**Roughness**', '0 to 1', 'How uneven the surface is at a microscopic scale: 0 is a mirror, 1 is fully matte']
      ] },
      { type: 'h2', text: 'Microfacets' },
      { type: 'p', text: 'The model pictures the surface as millions of tiny mirrors (**microfacets**) with normals scattered around the surface normal. Light reflects towards the eye only from facets whose normal is the half vector h. The **Cook-Torrance** specular term counts them:' },
      { type: 'p', text: '**f_spec = D · G · F / (4 (n · l)(n · v))**' },
      { type: 'table', head: ['Term', 'Function used here', 'What it models'], rows: [
        ['**D**: normal distribution', 'GGX (Trowbridge-Reitz): α² / (π ((n·h)² (α² − 1) + 1)²), with α = roughness²', 'How many facets face h. Low roughness: a tall, narrow peak (small, bright highlight)'],
        ['**G**: geometry', 'Smith with Schlick-GGX, k = (roughness + 1)² / 8', 'Facets hidden from the light or the eye by other facets, strongest at grazing angles'],
        ['**F**: Fresnel', 'Schlick: F₀ + (1 − F₀)(1 − v·h)⁵', 'More reflection at grazing angles; F₀ is the reflectance looking straight on']
      ] },
      { type: 'p', text: 'The diffuse term is Lambert’s albedo / π, scaled by (1 − F) because light that reflects specularly is not available to scatter, and by (1 − metallic) because metals have no diffuse. Non-metals use F₀ = 0.04; metals use their base colour, so gold’s reflections are gold. Explore the terms:' },
      { type: 'widget', name: 'pbr-brdf' },
      { type: 'p', text: 'The engine has the same formulas on the CPU, to check the GPU against:' },
      { type: 'code', title: 'Engine/Pbr.cs', code: cs`
using System.Numerics;

/// <summary>Cook-Torrance with GGX, Smith-Schlick and Schlick's Fresnel, exactly as PbrShaders.Fragment computes it.</summary>
static class Pbr
{
    public static Vector3 Shade(Vector3 normal, Vector3 toLight, Vector3 toEye, Vector3 baseColor, float metallic, float roughness,
                                Vector3 lightColor, Vector3 ambient)
    {
        var n = Vector3.Normalize(normal);
        var h = Vector3.Normalize(toLight + toEye);
        roughness = Math.Clamp(roughness, 0.04f, 1f);
        float a = roughness * roughness;
        float nl = MathF.Max(Vector3.Dot(n, toLight), 0f), nv = MathF.Max(Vector3.Dot(n, toEye), 1e-4f);
        float nh = MathF.Max(Vector3.Dot(n, h), 0f), vh = MathF.Max(Vector3.Dot(toEye, h), 0f);
        var f0 = Vector3.Lerp(new Vector3(0.04f), baseColor, metallic);
        var fresnel = f0 + (Vector3.One - f0) * MathF.Pow(1f - vh, 5f);
        float k = (roughness + 1f) * (roughness + 1f) / 8f;
        var specular = Distribution(nh, a) * SmithG1(nl, k) * SmithG1(nv, k) * fresnel / (4f * nl * nv + 1e-4f);
        var diffuse = (Vector3.One - fresnel) * (1f - metallic) * baseColor / MathF.PI;
        return (diffuse + specular) * lightColor * nl + ambient * baseColor;
    }

    /// <summary>GGX: the density of microfacets whose normal is h.</summary>
    public static float Distribution(float nh, float a)
    {
        float d = nh * nh * (a * a - 1f) + 1f;
        return a * a / (MathF.PI * d * d);
    }

    /// <summary>Schlick-GGX: the share of facets not hidden in one direction.</summary>
    public static float SmithG1(float nx, float k) => nx / (nx * (1f - k) + k);
}` },
      { type: 'code', title: 'Engine/PbrShaders.cs', code: cs`
static class PbrShaders
{
    /// <summary>Metallic-roughness PBR for one directional light: material.x = metallic, material.y = roughness. Use with LitShaders.Vertex.</summary>
    public const string Fragment = """
        #version 450

        layout(location = 0) in vec3 vWorldPos;
        layout(location = 1) in vec3 vNormal;
        layout(location = 0) out vec4 outColor;

        layout(set = 0, binding = 0) uniform Frame
        {
            mat4 viewProjection; mat4 lightViewProjection;
            vec4 cameraPosition; vec4 lightDirection; vec4 lightColor; vec4 ambient;
        } frame;
        layout(push_constant) uniform Push { mat4 model; vec4 color; vec4 material; } push;

        const float PI = 3.14159265;

        float Distribution(float nh, float a) { float d = nh * nh * (a * a - 1.0) + 1.0; return a * a / (PI * d * d); }
        float SmithG1(float nx, float k) { return nx / (nx * (1.0 - k) + k); }

        void main()
        {
            vec3 n = normalize(vNormal);
            vec3 l = frame.lightDirection.xyz;
            vec3 v = normalize(frame.cameraPosition.xyz - vWorldPos);
            vec3 h = normalize(l + v);
            float metallic = push.material.x, roughness = clamp(push.material.y, 0.04, 1.0), a = roughness * roughness;
            float nl = max(dot(n, l), 0.0), nv = max(dot(n, v), 1e-4), nh = max(dot(n, h), 0.0), vh = max(dot(v, h), 0.0);
            vec3 base = push.color.rgb;
            vec3 f0 = mix(vec3(0.04), base, metallic);
            vec3 fresnel = f0 + (1.0 - f0) * pow(1.0 - vh, 5.0);
            float k = (roughness + 1.0) * (roughness + 1.0) / 8.0;
            vec3 specular = Distribution(nh, a) * SmithG1(nl, k) * SmithG1(nv, k) * fresnel / (4.0 * nl * nv + 1e-4);
            vec3 diffuse = (1.0 - fresnel) * (1.0 - metallic) * base / PI;
            outColor = vec4((diffuse + specular) * frame.lightColor.rgb * nl + frame.ambient.rgb * base, 1.0);
        }
        """;
}` },
      { type: 'p', text: 'Two numbers in the code deserve a word. Lambert’s albedo / π is the fraction of light a matte surface sends into each direction, so a light’s colour is now its **intensity**: a white light of 3 makes a matte white surface facing it almost white (3 / π ≈ 0.95). And roughness is clamped at 0.04, because at 0 the GGX peak becomes infinitely narrow and a single-pixel highlight would flicker.' },
      { type: 'h2', text: 'A grid of spheres' },
      { type: 'p', text: 'The classic PBR test: one row of red plastic and one of gold, roughness rising from left to right. The sample draws all ten spheres in one frame and, for each, compares the GPU pixel with `Pbr.Shade` at the point where its highlight should peak:' },
      { type: 'code', title: 'PbrSpheres.cs', code: cs`
using System.Numerics;
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
using var loop = new FrameLoop(gpu, window);
using var frameSet = new UniformSet<FrameUniforms>(gpu);
using var pipeline = new MeshPipeline(gpu, loop.Swapchain.Format, LitShaders.Vertex, PbrShaders.Fragment,
    setLayouts: [frameSet.Layout], pushConstants: [LitPush.Range], cull: CullModeFlags.BackBit,
    depthFormat: FrameLoop.DepthFormat, vertexLayout: MeshVertex.Layout, frontFace: FrontFace.CounterClockwise);
var (vertices, indices) = Shapes.Sphere(64, 32);
using var sphere = new Mesh<MeshVertex>(gpu, vertices, indices);
using var capture = new ReadbackBuffer(gpu, loop.Swapchain.Extent);

var eye = new Vector3(0f, -7f, 0.6f);
var toLight = Vector3.Normalize(new Vector3(-0.5f, -1f, 1f));
var (lightColor, ambient) = (new Vector3(3f), new Vector3(0.03f));
var viewProjection = Camera.LookAt(eye, Vector3.Zero) * Camera.Perspective(35f, 800f / 600f, 0.1f, 20f);
frameSet.Write(new FrameUniforms { ViewProjection = viewProjection, CameraPosition = new(eye, 1f), LightDirection = new(toLight, 0f),
                                   LightColor = new(lightColor, 1f), Ambient = new(ambient, 0f) });
float[] roughness = [0.15f, 0.35f, 0.55f, 0.75f, 0.95f];
var plastic = new Vector3(0.7f, 0.08f, 0.06f);
var gold = new Vector3(1f, 0.71f, 0.29f);                                       // gold's measured F0, in linear RGB
var spheres = (from row in new[] { (Base: plastic, Metallic: 0f, Z: 0.55f), (Base: gold, Metallic: 1f, Z: -0.55f) }
               from i in Enumerable.Range(0, 5)
               select (Centre: new Vector3(i * 1.1f - 2.2f, 0f, row.Z), row.Base, row.Metallic, Roughness: roughness[i])).ToArray();

loop.Begin(out var frame);
loop.BeginRendering(frame);
gpu.Vk.CmdBindPipeline(frame.Cmd, PipelineBindPoint.Graphics, pipeline.Handle);
frameSet.Bind(frame.Cmd, pipeline.Layout);
foreach (var s in spheres)
{
    var push = new LitPush(Scene.Place(s.Centre - new Vector3(0.45f), s.Centre + new Vector3(0.45f)), new(s.Base, 1f), new(s.Metallic, s.Roughness, 0f, 0f));
    unsafe { gpu.Vk.CmdPushConstants(frame.Cmd, pipeline.Layout, LitPush.Range.StageFlags, 0, LitPush.Size, &push); }
    sphere.Draw(frame.Cmd);
}
loop.EndRendering(frame);
loop.End(frame, capture);
loop.WaitIdle();

Console.WriteLine("Roughness   Plastic: GPU     CPU              Gold: GPU         CPU");
for (int i = 0; i < 5; i++)
{
    var cells = new[] { spheres[i], spheres[i + 5] }.Select(s =>
    {
        var n = toLight;                                                         // the highlight: where n = h on this sphere
        for (int k = 0; k < 10; k++) n = Vector3.Normalize(toLight + Vector3.Normalize(eye - (s.Centre + n * 0.45f)));
        var point = s.Centre + n * 0.45f;
        var p = Camera.Project(point, viewProjection, loop.Swapchain.Extent);
        var cpu = Pbr.Shade(n, toLight, Vector3.Normalize(eye - point), s.Base, s.Metallic, s.Roughness, lightColor, ambient);
        return $"{capture.Pixel((int)p.X, (int)p.Y),-16} {Lighting.ToSrgb(cpu),-16}";
    });
    Console.WriteLine($"{roughness[i],-11:F2} {string.Join(" ", cells)}");
}`, output: 'Roughness   Plastic: GPU     CPU              Gold: GPU         CPU\n0.15        (255, 255, 255)  (255, 255, 255)  (255, 255, 255)  (255, 255, 255)\n0.35        (255, 223, 221)  (255, 224, 222)  (255, 255, 255)  (255, 255, 255)\n0.55        (219, 117, 111)  (220, 117, 111)  (255, 255, 229)  (255, 255, 229)\n0.75        (210, 89, 82)    (210, 89, 81)    (231, 198, 132)  (230, 198, 132)\n0.95        (208, 81, 72)    (208, 81, 72)    (154, 132, 86)   (154, 132, 86)' },
      { type: 'p', text: 'Every pixel agrees with the CPU to within one step. Read the columns downwards. At roughness 0.15 the highlight is so concentrated that its peak is far above 1 and clips to white. As roughness rises, the peak spreads and drops: the plastic’s highlight fades into its red diffuse colour, and by 0.95 the highlight is barely there. The gold column behaves differently in two ways that make it read as metal: its reflection is tinted (the green and blue channels fall first), and it has no diffuse colour to fall back to, so the rough gold sphere is darker than the rough plastic one.' },
      { type: 'note', kind: 'info', text: 'This model reflects one light. Real surfaces also reflect their surroundings: a smooth gold sphere in a room shows the room. Lesson 4 adds that **image-based lighting**, using the same F₀, roughness and metallic values. glTF materials also carry textures for each parameter (base colour, a metallic-roughness texture, a normal map); the shader then reads the values per pixel instead of from push constants.' },
      { type: 'quiz', question: 'Why does a metal have no diffuse term in this model?', options: ['Metals are always smooth', 'Light entering a metal is absorbed almost at once; everything that leaves is reflection, tinted by the metal', 'To save shader time', 'Because metallic = 1 sets the base colour to black'], answer: 1, explain: 'Free electrons absorb refracted light within nanometres, so metals have no subsurface scattering, which is what diffuse light is. Their reflection is coloured: F₀ is the base colour.' },
      { type: 'quiz', question: 'As roughness rises, what happens to the highlight?', options: ['It grows and gets dimmer: the same reflected energy spreads over more directions', 'It disappears at 0.5', 'It gets brighter and smaller', 'Nothing: roughness only affects diffuse'], answer: 0, explain: 'GGX spreads the microfacet normals. The total reflected light stays about the same, so a wider highlight has a lower peak.' },
      { type: 'exercise', task: 'Check energy conservation numerically: for a white specular surface (F = 1), integrate the Cook-Torrance term times n · l over the hemisphere, for roughness 0.1, 0.4, 0.7 and 1.0, looking straight down (n · v = 1) and at a grazing angle (n · v = 0.3). The result (the **directional albedo**) must never exceed 1. Where it is well below 1, the model loses energy: a rough metal looks darker than it should.', hint: 'Integrate over half vectors: draw h from the GGX distribution with cos θ_h = √((1 − u) / (1 + (α² − 1) u)) and φ = 2πw on a 512 × 512 grid of (u, w), reflect v about h to get l, and average G · (v·h) / ((n·h)(n·v)) over directions with n · l > 0. That is the standard estimator, with D cancelled by the sampling.', solution: cs`
using System.Numerics;

foreach (float nv in new[] { 1f, 0.3f })
{
    var v = new Vector3(MathF.Sqrt(1f - nv * nv), 0f, nv);                      // n = +Z
    var line = new List<string>();
    foreach (float roughness in new[] { 0.1f, 0.4f, 0.7f, 1f })
    {
        float a = roughness * roughness, k = (roughness + 1f) * (roughness + 1f) / 8f;
        double sum = 0;
        const int N = 512;
        for (int i = 0; i < N; i++)
            for (int j = 0; j < N; j++)
            {
                float u = (i + 0.5f) / N, w = (j + 0.5f) / N;
                float cosH = MathF.Sqrt((1f - u) / (1f + (a * a - 1f) * u)), sinH = MathF.Sqrt(1f - cosH * cosH), phi = 2f * MathF.PI * w;
                var h = new Vector3(sinH * MathF.Cos(phi), sinH * MathF.Sin(phi), cosH);
                var l = 2f * Vector3.Dot(v, h) * h - v;                             // v reflected about h
                if (l.Z <= 0f) continue;
                float vh = Vector3.Dot(v, h);
                sum += Pbr.SmithG1(l.Z, k) * Pbr.SmithG1(nv, k) * vh / (h.Z * nv);
            }
        line.Add($"roughness {roughness:F1}: {sum / (N * N):F3}");
    }
    Console.WriteLine($"n·v = {nv:F1}  " + string.Join("  ", line));
}`, output: 'n·v = 1.0  roughness 0.1: 1.000  roughness 0.4: 0.933  roughness 0.7: 0.638  roughness 1.0: 0.307\nn·v = 0.3  roughness 0.1: 0.546  roughness 0.4: 0.453  roughness 0.7: 0.494  roughness 1.0: 0.472' }
    ],
    keyPoints: [
      'PBR describes materials with base colour, metallic and roughness, as glTF does, and conserves energy.',
      'Cook-Torrance specular = D · G · F / (4 (n·l)(n·v)): GGX distribution, Smith geometry, Schlick Fresnel.',
      'Non-metals reflect about 4% (F₀ = 0.04) untinted; metals use their base colour as F₀ and have no diffuse.',
      'Diffuse is Lambert’s albedo / π, scaled by (1 − F)(1 − metallic); light colours become intensities.',
      'Higher roughness: wider, dimmer highlights; clamp roughness above 0 to avoid flickering one-pixel highlights.',
      'The specular term’s directional albedo stays at or below 1; with the (roughness + 1)² / 8 remapping it loses energy on rough surfaces and at grazing views.'
    ]
  },

  // ------------------------------------------------------------------ 3
  {
    slug: 'shadow-mapping',
    title: 'Shadow mapping',
    summary: 'Render the scene’s depth from the light, then ask for every pixel whether something nearer to the light covers it. Build a shadow map with a comparison sampler and soft edges (PCF), and measure shadow acne and light leaks as the bias changes.',
    minutes: 26,
    blocks: [
      { type: 'p', text: 'So far a column lit by the sun leaves no shadow on the floor, and nothing tells the eye that a beam floats above the slab. Shadows answer one question per pixel: **is there anything between this point and the light?** Ray tracing asks it directly. Rasterisers use a trick from 1978 that is still the standard: the **shadow map**.' },
      { type: 'ol', items: [
        '**Shadow pass.** Render the scene from the light’s point of view into a depth image. Each texel stores the distance to the nearest surface the light sees in that direction.',
        '**Main pass.** For each pixel, transform its world position into the light’s view and compare its depth with the stored one. If it is farther, something nearer the light covers it: it is in shadow.'
      ] },
      { type: 'p', text: 'The sun is a **directional** light, so the light’s camera is orthographic: all rays are parallel. It must cover everything that can cast a shadow into the view; the simplest choice is a sphere around the scene, as the orbit camera in module 4 used for its near and far planes.' },
      { type: 'h2', text: 'Sampled images in a descriptor set' },
      { type: 'p', text: 'The main pass reads the shadow map as a texture. Module 4’s `TextureSet` only takes a `Texture`; this module samples shadow maps, environment maps, G-buffers and HDR images, so a general set of “view plus sampler” bindings is worth having:' },
      { type: 'code', title: 'Engine/ImageSet.cs', code: cs`
using Silk.NET.Vulkan;

/// <summary>A descriptor set of sampled images at bindings 0, 1, 2…, for the fragment shader. All in ShaderReadOnlyOptimal.</summary>
sealed unsafe class ImageSet : IDisposable
{
    readonly GpuContext gpu;
    readonly DescriptorPool pool;
    public readonly DescriptorSetLayout Layout;
    public readonly DescriptorSet Set;

    public ImageSet(GpuContext gpu, params (ImageView View, Sampler Sampler)[] images)
    {
        this.gpu = gpu;
        var vk = gpu.Vk;
        var bindings = images.Select((_, i) => new DescriptorSetLayoutBinding
        {
            Binding = (uint)i, DescriptorType = DescriptorType.CombinedImageSampler, DescriptorCount = 1, StageFlags = ShaderStageFlags.FragmentBit
        }).ToArray();
        fixed (DescriptorSetLayoutBinding* b = bindings)
        {
            var layoutInfo = new DescriptorSetLayoutCreateInfo { SType = StructureType.DescriptorSetLayoutCreateInfo, BindingCount = (uint)bindings.Length, PBindings = b };
            DescriptorSetLayout layout;
            vk.CreateDescriptorSetLayout(gpu.Device, &layoutInfo, null, &layout).Check("CreateDescriptorSetLayout");
            Layout = layout;
        }
        var size = new DescriptorPoolSize(DescriptorType.CombinedImageSampler, (uint)images.Length);
        var poolInfo = new DescriptorPoolCreateInfo { SType = StructureType.DescriptorPoolCreateInfo, MaxSets = 1, PoolSizeCount = 1, PPoolSizes = &size };
        DescriptorPool p;
        vk.CreateDescriptorPool(gpu.Device, &poolInfo, null, &p).Check("CreateDescriptorPool");
        pool = p;
        var setLayout = Layout;
        var allocInfo = new DescriptorSetAllocateInfo { SType = StructureType.DescriptorSetAllocateInfo, DescriptorPool = pool, DescriptorSetCount = 1, PSetLayouts = &setLayout };
        DescriptorSet set;
        vk.AllocateDescriptorSets(gpu.Device, &allocInfo, &set).Check("AllocateDescriptorSets");
        Set = set;

        var infos = images.Select(im => new DescriptorImageInfo(im.Sampler, im.View, ImageLayout.ShaderReadOnlyOptimal)).ToArray();
        var writes = new WriteDescriptorSet[infos.Length];
        fixed (DescriptorImageInfo* info = infos)
        fixed (WriteDescriptorSet* w = writes)
        {
            for (int i = 0; i < infos.Length; i++)
                writes[i] = new WriteDescriptorSet
                {
                    SType = StructureType.WriteDescriptorSet, DstSet = Set, DstBinding = (uint)i, DescriptorCount = 1,
                    DescriptorType = DescriptorType.CombinedImageSampler, PImageInfo = info + i
                };
            vk.UpdateDescriptorSets(gpu.Device, (uint)writes.Length, w, 0, null);
        }
    }

    /// <summary>Binds the set at the given set number of the pipeline layout.</summary>
    public void Bind(CommandBuffer cmd, PipelineLayout pipelineLayout, uint setNumber)
    {
        var set = Set;
        gpu.Vk.CmdBindDescriptorSets(cmd, PipelineBindPoint.Graphics, pipelineLayout, setNumber, 1, &set, 0, null);
    }

    public void Dispose()
    {
        gpu.Vk.DestroyDescriptorPool(gpu.Device, pool, null);
        gpu.Vk.DestroyDescriptorSetLayout(gpu.Device, Layout, null);
    }
}` },
      { type: 'h2', text: 'The shadow map' },
      { type: 'p', text: 'Three details make the shadow map more than a depth image:' },
      { type: 'ul', items: [
        '**A comparison sampler.** With `CompareEnable` and `CompareOp.LessOrEqual`, the sampler does the depth test itself: GLSL’s `sampler2DShadow` takes the pixel’s depth with the coordinates and returns 1 (lit) or 0 (shadow). With linear filtering, many GPUs compare the four nearest texels and blend the results, which softens edges for free.',
        '**A white border.** Points outside the light’s view should be lit, so the address mode is `ClampToBorder` with an opaque white border: depth 1, the far plane, which nothing is behind.',
        '**A depth-only pipeline.** The shadow pass writes no colour. The pipeline is created with colour format `Undefined` and a fragment shader that does nothing, and rendering begins with a colour attachment whose view is null, so the attachment counts still match.'
      ] },
      { type: 'code', title: 'Engine/ShadowMap.cs', code: cs`
using System.Numerics;
using Silk.NET.Vulkan;

/// <summary>Depth seen from a directional light, with a comparison sampler for sampler2DShadow.</summary>
sealed unsafe class ShadowMap : IDisposable
{
    readonly GpuContext gpu;
    public readonly GpuImage Image;
    public readonly Sampler Sampler;
    public readonly uint Size;
    public Matrix4x4 LightViewProjection { get; private set; }

    public ShadowMap(GpuContext gpu, uint size)
    {
        this.gpu = gpu;
        Size = size;
        Image = new GpuImage(gpu, new Extent2D(size, size), Format.D32Sfloat, ImageUsageFlags.DepthStencilAttachmentBit | ImageUsageFlags.SampledBit, ImageAspectFlags.DepthBit);
        var info = new SamplerCreateInfo
        {
            SType = StructureType.SamplerCreateInfo, MagFilter = Filter.Linear, MinFilter = Filter.Linear,
            AddressModeU = SamplerAddressMode.ClampToBorder, AddressModeV = SamplerAddressMode.ClampToBorder, AddressModeW = SamplerAddressMode.ClampToBorder,
            BorderColor = BorderColor.FloatOpaqueWhite,             // outside the map: depth 1, so lit
            CompareEnable = true, CompareOp = CompareOp.LessOrEqual, MaxAnisotropy = 1
        };
        Sampler sampler;
        gpu.Vk.CreateSampler(gpu.Device, &info, null, &sampler).Check("CreateSampler");
        Sampler = sampler;
    }

    /// <summary>Aims an orthographic camera along the light so that it covers a sphere around the shadow casters.</summary>
    public void Fit(Vector3 towardLight, Vector3 centre, float radius)
    {
        var eye = centre + towardLight * (radius * 2f);
        var up = MathF.Abs(towardLight.Z) > 0.99f ? Vector3.UnitY : Vector3.UnitZ;
        var view = Matrix4x4.CreateLookAt(eye, centre, up);
        var projection = Matrix4x4.CreateOrthographicOffCenter(-radius, radius, -radius, radius, radius, radius * 3f);   // depth 0..1 over the sphere
        LightViewProjection = view * projection;
    }

    /// <summary>The shadow pass: clears the map, lets draw record the casters, and leaves the map ready to be sampled.</summary>
    public void Render(CommandBuffer cmd, Action<CommandBuffer> draw)
    {
        var tests = PipelineStageFlags2.EarlyFragmentTestsBit | PipelineStageFlags2.LateFragmentTestsBit;
        Image.Transition(cmd, ImageLayout.Undefined, ImageLayout.DepthAttachmentOptimal,       // after last frame's sampling
            PipelineStageFlags2.FragmentShaderBit, AccessFlags2.None, tests, AccessFlags2.DepthStencilAttachmentReadBit | AccessFlags2.DepthStencilAttachmentWriteBit);
        var noColor = new RenderingAttachmentInfo { SType = StructureType.RenderingAttachmentInfo };     // a null view: no colour output
        var depth = new RenderingAttachmentInfo
        {
            SType = StructureType.RenderingAttachmentInfo, ImageView = Image.View, ImageLayout = ImageLayout.DepthAttachmentOptimal,
            LoadOp = AttachmentLoadOp.Clear, StoreOp = AttachmentStoreOp.Store, ClearValue = new ClearValue(depthStencil: new ClearDepthStencilValue(1f, 0))
        };
        var extent = new Extent2D(Size, Size);
        var rendering = new RenderingInfo
        {
            SType = StructureType.RenderingInfo, RenderArea = new Rect2D(new Offset2D(0, 0), extent), LayerCount = 1,
            ColorAttachmentCount = 1, PColorAttachments = &noColor, PDepthAttachment = &depth
        };
        gpu.Vk.CmdBeginRendering(cmd, &rendering);
        var viewport = new Viewport(0, 0, Size, Size, 0, 1);
        gpu.Vk.CmdSetViewport(cmd, 0, 1, &viewport);
        var scissor = new Rect2D(new Offset2D(0, 0), extent);
        gpu.Vk.CmdSetScissor(cmd, 0, 1, &scissor);
        draw(cmd);
        gpu.Vk.CmdEndRendering(cmd);
        Image.Transition(cmd, ImageLayout.DepthAttachmentOptimal, ImageLayout.ShaderReadOnlyOptimal,
            PipelineStageFlags2.LateFragmentTestsBit, AccessFlags2.DepthStencilAttachmentWriteBit, PipelineStageFlags2.FragmentShaderBit, AccessFlags2.ShaderSampledReadBit);
    }

    /// <summary>The depth-only pipeline for shadow casters: one matrix in a push constant, no colour output.</summary>
    public static MeshPipeline CreatePipeline(GpuContext gpu) =>
        new(gpu, Format.Undefined, ModelShaders.Vertex, "#version 450\nvoid main() { }", pushConstants: [new(ShaderStageFlags.VertexBit, 0, 64)],
            depthFormat: Format.D32Sfloat, vertexLayout: MeshVertex.Layout);

    public void Dispose()
    {
        gpu.Vk.DestroySampler(gpu.Device, Sampler, null);
        Image.Dispose();
    }
}` },
      { type: 'h2', text: 'Reading the shadow map' },
      { type: 'p', text: 'The main pass’s fragment shader is Blinn-Phong with one change: the diffuse and specular light are multiplied by a **shadow factor**. It projects the world position with the light’s matrix, turns NDC into texture coordinates, and asks the comparison sampler. Taking nine samples one texel apart and averaging them (**percentage-closer filtering**, PCF) blurs the shadow edge over a few texels instead of showing the map’s staircase:' },
      { type: 'code', title: 'Engine/ShadowShaders.cs', code: cs`
static class ShadowShaders
{
    /// <summary>Blinn-Phong whose direct light is scaled by a 3 x 3 PCF shadow factor. frame.ambient.w is the depth bias.</summary>
    public const string Fragment = """
        #version 450

        layout(location = 0) in vec3 vWorldPos;
        layout(location = 1) in vec3 vNormal;
        layout(location = 0) out vec4 outColor;

        layout(set = 0, binding = 0) uniform Frame
        {
            mat4 viewProjection; mat4 lightViewProjection;
            vec4 cameraPosition; vec4 lightDirection; vec4 lightColor; vec4 ambient;
        } frame;
        layout(set = 1, binding = 0) uniform sampler2DShadow shadowMap;
        layout(push_constant) uniform Push { mat4 model; vec4 color; vec4 material; } push;

        float Shadow(vec3 worldPos)
        {
            vec4 clip = frame.lightViewProjection * vec4(worldPos, 1.0);
            vec3 p = clip.xyz / clip.w;                                     // orthographic: w = 1
            vec2 uv = p.xy * 0.5 + 0.5;
            vec2 texel = 1.0 / vec2(textureSize(shadowMap, 0));
            float lit = 0.0;
            for (int x = -1; x <= 1; x++)
                for (int y = -1; y <= 1; y++)
                    lit += texture(shadowMap, vec3(uv + vec2(x, y) * texel, p.z - frame.ambient.w));   // 1 if not behind the stored depth
            return lit / 9.0;
        }

        void main()
        {
            vec3 n = normalize(vNormal);
            vec3 l = frame.lightDirection.xyz;
            vec3 v = normalize(frame.cameraPosition.xyz - vWorldPos);
            float diffuse = max(dot(n, l), 0.0);
            float specular = diffuse > 0.0 ? pow(max(dot(n, normalize(l + v)), 0.0), push.material.x) * push.material.y : 0.0;
            float shadow = diffuse > 0.0 ? Shadow(vWorldPos) : 0.0;
            vec3 color = push.color.rgb * (frame.ambient.rgb + frame.lightColor.rgb * diffuse * shadow) + frame.lightColor.rgb * specular * shadow;
            outColor = vec4(color, push.color.a);
        }
        """;
}` },
      { type: 'h2', text: 'Acne, leaks and the bias' },
      { type: 'p', text: 'A surface compared with its own stored depth should be exactly equal, but the map stores one depth per texel, and a sloped surface’s depth varies across the texel. Half the comparisons come out “behind” and the lit surface fills with dark stripes: **shadow acne**. The fix is a **bias**: subtract a little from the pixel’s depth before comparing. Too little leaves acne; too much pushes shadows away from the objects that cast them, so light leaks under a column’s base (**peter-panning**: the object seems to float). See it in cross-section:' },
      { type: 'widget', name: 'shadow-bias' },
      { type: 'p', text: 'The sample draws a slab, a column and a beam floating 2.5 m up, with the sun low in the west-south-west. It renders the frame with three biases. For each it tests two groups of slab points with an exact ray cast on the CPU: points the sun reaches (any drawn dark there are acne), and points in the column’s shadow right next to its base (any drawn lit there are leaks), keeping only points the camera can see. It also checks four single points:' },
      { type: 'code', title: 'Shadows.cs', code: cs`
using System.Numerics;
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
using var loop = new FrameLoop(gpu, window);
using var frameSet = new UniformSet<FrameUniforms>(gpu);
using var shadowMap = new ShadowMap(gpu, 2048);
using var shadowSet = new ImageSet(gpu, (shadowMap.Image.View, shadowMap.Sampler));
using var shadowPipeline = ShadowMap.CreatePipeline(gpu);
using var pipeline = new MeshPipeline(gpu, loop.Swapchain.Format, LitShaders.Vertex, ShadowShaders.Fragment,
    setLayouts: [frameSet.Layout, shadowSet.Layout], pushConstants: [LitPush.Range], cull: CullModeFlags.BackBit,
    depthFormat: FrameLoop.DepthFormat, vertexLayout: MeshVertex.Layout, frontFace: FrontFace.CounterClockwise);
var (vertices, indices) = Shapes.Box(new Vector3(-0.5f), new Vector3(0.5f));
using var box = new Mesh<MeshVertex>(gpu, vertices, indices);
using var capture = new ReadbackBuffer(gpu, loop.Swapchain.Extent);

(Vector3 Min, Vector3 Max, Vector3 Color)[] boxes =
[
    (new(-8f, -8f, -0.3f), new(8f, 8f, 0f), new(0.6f, 0.6f, 0.6f)),             // slab
    (new(-0.3f, -0.3f, 0f), new(0.3f, 0.3f, 4f), new(0.75f, 0.3f, 0.2f)),       // column
    (new(2f, -4f, 2.5f), new(5f, -3.5f, 3f), new(0.2f, 0.4f, 0.8f))             // floating beam
];
var toLight = Vector3.Normalize(new Vector3(-1f, -0.4f, 0.8f));
var eye = new Vector3(12f, -12f, 10f);
var viewProjection = Camera.LookAt(eye, new(1f, -1f, 0f)) * Camera.Perspective(40f, 800f / 600f, 0.5f, 60f);
shadowMap.Fit(toLight, new(0f, 0f, 1.5f), 12f);
var (light, ambient, slabColor) = (new Vector3(1f), new Vector3(0.15f), boxes[0].Color);

bool Hits(Vector3 p, Vector3 direction, float distance)                       // exact ray test against the boxes standing on the slab
{
    foreach (var (min, max, _) in boxes.Skip(1))
    {
        float t0 = 1e-4f, t1 = distance;
        for (int axis = 0; axis < 3; axis++)
        {
            float o = p[axis], d = direction[axis], lo = min[axis], hi = max[axis];
            if (MathF.Abs(d) < 1e-6f) { if (o < lo || o > hi) { t0 = 1; t1 = 0; } continue; }
            float a = (lo - o) / d, b = (hi - o) / d;
            t0 = MathF.Max(t0, MathF.Min(a, b)); t1 = MathF.Min(t1, MathF.Max(a, b));
        }
        if (t0 <= t1) return true;
    }
    return false;
}
bool InShadow(Vector3 p) => Hits(p, toLight, float.MaxValue);
bool Visible(Vector3 p) => !Hits(p, Vector3.Normalize(eye - p), Vector3.Distance(eye, p));
var lit = Lighting.ToSrgb(Lighting.BlinnPhong(Vector3.UnitZ, toLight, Vector3.UnitZ, slabColor, light, ambient, 1f, 0f));
var dark = Lighting.ToSrgb(slabColor * ambient);
var litPoints = (from x in Enumerable.Range(0, 20) from y in Enumerable.Range(0, 20) select new Vector3(1f + x * 0.25f, -7f + y * 0.25f, 0f)).Where(p => Visible(p) && !InShadow(p)).ToArray();
var away = -Vector3.Normalize(new Vector3(toLight.X, toLight.Y, 0f));          // along the ground, away from the sun
var side = new Vector3(-away.Y, away.X, 0f);
var basePoints = (from i in Enumerable.Range(0, 16) from j in Enumerable.Range(0, 4) select away * (0.45f + i * 0.05f) + side * (j * 0.08f - 0.12f)).Where(p => Visible(p) && InShadow(p)).ToArray();

(byte R, byte G, byte B) Render(float bias)
{
    loop.Begin(out var frame);
    frameSet.Write(new FrameUniforms
    {
        ViewProjection = viewProjection, LightViewProjection = shadowMap.LightViewProjection, CameraPosition = new(eye, 1f),
        LightDirection = new(toLight, 0f), LightColor = new(light, 1f), Ambient = new(ambient, bias)
    });
    shadowMap.Render(frame.Cmd, cmd =>
    {
        gpu.Vk.CmdBindPipeline(cmd, PipelineBindPoint.Graphics, shadowPipeline.Handle);
        foreach (var (min, max, _) in boxes)
        {
            Camera.Push(gpu, cmd, shadowPipeline.Layout, Scene.Place(min, max) * shadowMap.LightViewProjection);
            box.Draw(cmd);
        }
    });
    loop.BeginRendering(frame);
    gpu.Vk.CmdBindPipeline(frame.Cmd, PipelineBindPoint.Graphics, pipeline.Handle);
    frameSet.Bind(frame.Cmd, pipeline.Layout);
    shadowSet.Bind(frame.Cmd, pipeline.Layout, 1);
    foreach (var (min, max, color) in boxes)
    {
        var push = new LitPush(Scene.Place(min, max), new(color, 1f), new(1f, 0f, 0f, 0f));
        unsafe { gpu.Vk.CmdPushConstants(frame.Cmd, pipeline.Layout, LitPush.Range.StageFlags, 0, LitPush.Size, &push); }
        box.Draw(frame.Cmd);
    }
    loop.EndRendering(frame);
    loop.End(frame, capture);
    loop.WaitIdle();
    return lit;
}

(byte R, byte G, byte B) Pixel(Vector3 p) { var s = Camera.Project(p, viewProjection, loop.Swapchain.Extent); return capture.Pixel((int)s.X, (int)s.Y); }
bool LooksLit((byte R, byte G, byte B) c) => c.R > (lit.R + dark.R) / 2;

Console.WriteLine($"Lit slab {lit}, slab in shadow {dark}; test points the camera sees: {litPoints.Length} lit, {basePoints.Length} shadowed at the column's base");
foreach (float bias in new[] { 0f, 0.002f, 0.06f })
{
    Render(bias);
    int acne = litPoints.Count(p => !LooksLit(Pixel(p)));
    int leaks = basePoints.Count(p => LooksLit(Pixel(p)));
    Console.WriteLine($"Bias {bias,-6}: acne {acne,3} of {litPoints.Length}, light leaks {leaks,2} of {basePoints.Length}");
}
Render(0.002f);
var beamShadow = new Vector3(3.5f, -3.75f, 2.75f) - toLight * (2.75f / toLight.Z);  // the beam's centre, followed down to the slab
foreach (var (name, p) in new[] { ("In the column's shadow", away * 2.5f), ("Under the beam", beamShadow), ("Open slab", new Vector3(-4f, -5f, 0f)), ("Beside the column", new Vector3(0.5f, -1.5f, 0f)) })
    Console.WriteLine($"{name,-23} CPU: {(InShadow(p) ? "shadow" : "lit   ")}, seen {Visible(p),-5}  GPU {Pixel(p)}");`, output: 'Lit slab (178, 178, 178), slab in shadow (85, 85, 85); test points the camera sees: 391 lit, 58 shadowed at the column\'s base\nBias 0     : acne  65 of 391, light leaks  0 of 58\nBias 0.002 : acne   0 of 391, light leaks  0 of 58\nBias 0.06  : acne   0 of 391, light leaks 27 of 58\nIn the column\'s shadow  CPU: shadow, seen True   GPU (84, 84, 84)\nUnder the beam          CPU: shadow, seen True   GPU (84, 84, 84)\nOpen slab               CPU: lit   , seen True   GPU (178, 178, 178)\nBeside the column       CPU: lit   , seen True   GPU (178, 178, 178)' },
      { type: 'p', text: 'The light camera covers 24 m of depth, so one unit of bias is 24 m. With no bias, 65 of the 391 sunlit points are drawn dark: acne. A bias of 0.002 (about 5 cm) removes all of it and keeps every shadow point next to the column dark. At 0.06 (about 1.4 m), 27 of the 58 points at the column’s base are drawn lit: the shadow has come loose from the column. Between those extremes there is a range that works for this scene. The four single points agree with the ray cast: the column’s shadow and the beam’s shadow, which lies 4 m away from the beam on the open slab, are both dark; the open slab and the sunny side of the column are lit.' },
      { type: 'note', kind: 'info', text: 'One map stretched over a whole building site gives blocky shadows near the camera. **Cascaded shadow maps** split the view into distance ranges, each with its own map fitted to that slice, so nearby shadows get most of the texels. Fitting the light camera to the view rather than the scene, and moving it only in whole texels, also stops shadow edges from shimmering as the camera moves.' },
      { type: 'quiz', question: 'What does a comparison sampler return for `texture(shadowMap, vec3(uv, depth))`?', options: ['The stored depth', 'The result of comparing depth with the stored depth: 1 when it passes (lit), 0 when not, blended across texels by linear filtering', 'The distance to the light', 'The colour of the shadow'], answer: 1, explain: 'With CompareEnable, the sampler compares the reference depth with each texel it reads and filters the 0 or 1 results, not the depths. That is why filtering a shadow map softens the edge.' },
      { type: 'quiz', question: 'Shadows appear slightly detached from the base of every column. What is the likely cause?', options: ['The shadow map is too large', 'The depth bias is too large, so points just behind the caster’s base pass the test (peter-panning)', 'PCF is disabled', 'The light is a point light'], answer: 1, explain: 'A large bias moves every comparison towards the light, so the shadow starts a little away from where the object meets the ground. Reduce the bias, or use a slope-scaled bias and a normal offset instead.' },
      { type: 'exercise', task: 'Work out how big one shadow-map texel is on the ground: for a light camera covering a sphere of radius 20 m, 100 m and 400 m (a house, a block, a campus), with maps of 1024, 2048 and 4096 texels. Print a table in centimetres, and the number of 2048 maps (cascades) of equal size you would need to keep 400 m at the 2 cm a 20 m house gets.', hint: 'The orthographic view is 2 × radius wide, so one texel is 2r / size. For the last question, compare the texel sizes of 400 m and 20 m: cascades of equal size would each cover a part of the range, and the count is the ratio of the areas, which grows with the square of the distance ratio.', solution: cs`
int[] sizes = [1024, 2048, 4096];
Console.WriteLine($"{"Radius",-8}" + string.Join("", sizes.Select(s => $"{s + " texels",14}")));
foreach (float radius in new[] { 20f, 100f, 400f })
    Console.WriteLine($"{radius + " m",-8}" + string.Join("", sizes.Select(s => $"{2f * radius / s * 100f,11:F1} cm")));
float ratio = 400f / 20f;
Console.WriteLine($"400 m at the texel size of 20 m: {ratio * ratio:F0} maps of 2048 x 2048 tiled over the area");`, output: 'Radius     1024 texels   2048 texels   4096 texels\n20 m            3.9 cm        2.0 cm        1.0 cm\n100 m          19.5 cm        9.8 cm        4.9 cm\n400 m          78.1 cm       39.1 cm       19.5 cm\n400 m at the texel size of 20 m: 400 maps of 2048 x 2048 tiled over the area' }
    ],
    keyPoints: [
      'A shadow map is the scene’s depth from the light; a point is in shadow if it is farther from the light than the stored depth.',
      'Directional lights use an orthographic light camera fitted around the shadow casters.',
      'A comparison sampler (sampler2DShadow) compares in hardware; a white border keeps points outside the map lit.',
      'A depth-only pipeline has colour format Undefined and renders with a null colour attachment.',
      'PCF averages several comparisons for soft edges.',
      'The depth bias trades shadow acne (too small) against light leaks and peter-panning (too large).'
    ]
  },

  // ------------------------------------------------------------------ 4
  {
    slug: 'image-based-lighting',
    title: 'Environment maps and image-based lighting',
    summary: 'Light objects with their whole surroundings, not just the sun. Store a sky in an HDR cube map, compress its diffuse light into nine spherical-harmonic coefficients, and reflect it specularly from the cube map’s mip levels, chosen by roughness.',
    minutes: 26,
    blocks: [
      { type: 'p', text: 'Outdoors, the sun is not the only light. The whole sky shines, blue from above, pale near the horizon, and the ground bounces warm light from below. Lessons 1 to 3 squeezed all of that into one constant ambient colour, which is why the shadowed side of everything looks flat and grey. **Image-based lighting** (IBL) replaces the constant with the actual surroundings, stored as an image of everything visible from a point: an **environment map**.' },
      { type: 'p', text: 'The light a surface receives from an environment splits the same way as before:' },
      { type: 'ul', items: [
        '**Diffuse:** light from the whole hemisphere around the normal, weighted by the cosine. This **irradiance** changes slowly with the normal, so it can be stored very compactly: nine numbers per colour channel.',
        '**Specular:** light from around the reflection direction, spread more widely as roughness rises. Read from the environment map itself, blurrier for rougher surfaces.'
      ] },
      { type: 'h2', text: 'A sky, in a cube map' },
      { type: 'p', text: 'An environment map is usually a **cube map**: six square images, one per face of a cube around the viewer, sampled with a direction instead of texture coordinates. In Vulkan it is a 2D image with six array layers, created with `CubeCompatible` and viewed with `ImageViewType.Cube`. Its texels are HDR: the sky can be far brighter than 1, so the format is 16-bit float.' },
      { type: 'p', text: 'A real viewer loads a photographed HDR panorama. To keep the sample self-contained and checkable, the engine uses a procedural sky: a gradient from a pale horizon to a blue zenith, and a dark warm ground below:' },
      { type: 'code', title: 'Engine/Sky.cs', code: cs`
using System.Numerics;

/// <summary>A procedural sky as a function of direction (Z-up), and spherical-harmonic lighting from any such function.</summary>
static class Sky
{
    public static Vector3 Radiance(Vector3 d)
    {
        var zenith = new Vector3(0.15f, 0.35f, 0.9f);
        var horizon = new Vector3(0.8f, 0.85f, 0.9f);
        var ground = new Vector3(0.25f, 0.2f, 0.15f);
        return d.Z >= 0f ? Vector3.Lerp(horizon, zenith, MathF.Sqrt(d.Z))
                         : Vector3.Lerp(horizon * 0.5f, ground, MathF.Min(1f, -d.Z * 4f));
    }

    /// <summary>The 9 real spherical-harmonic basis functions of bands 0 to 2 at a unit direction.</summary>
    public static float[] Basis(Vector3 d) =>
    [
        0.282095f,
        0.488603f * d.Y, 0.488603f * d.Z, 0.488603f * d.X,
        1.092548f * d.X * d.Y, 1.092548f * d.Y * d.Z, 0.315392f * (3f * d.Z * d.Z - 1f), 1.092548f * d.X * d.Z, 0.546274f * (d.X * d.X - d.Y * d.Y)
    ];

    /// <summary>Direction i of n spread evenly over the sphere (a Fibonacci spiral).</summary>
    public static Vector3 Spread(int i, int n)
    {
        float z = 1f - 2f * (i + 0.5f) / n, r = MathF.Sqrt(1f - z * z), phi = i * MathF.PI * (3f - MathF.Sqrt(5f));
        return new Vector3(r * MathF.Cos(phi), r * MathF.Sin(phi), z);
    }

    /// <summary>Projects radiance onto 9 coefficients per channel, from n evenly spread directions.</summary>
    public static Vector3[] Project(Func<Vector3, Vector3> radiance, int n = 4096)
    {
        var sh = new Vector3[9];
        for (int i = 0; i < n; i++)
        {
            var d = Spread(i, n);
            var c = radiance(d);
            var y = Basis(d);
            for (int k = 0; k < 9; k++) sh[k] += c * y[k] * (4f * MathF.PI / n);       // each direction stands for 4 pi / n steradians
        }
        return sh;
    }

    /// <summary>Irradiance at normal n divided by pi: multiplied by an albedo, it is the diffuse light. Bands scaled by pi, 2 pi / 3, pi / 4.</summary>
    public static Vector3 Irradiance(Vector3[] sh, Vector3 n)
    {
        var y = Basis(n);
        float[] band = [MathF.PI, 2f * MathF.PI / 3f, 2f * MathF.PI / 3f, 2f * MathF.PI / 3f, MathF.PI / 4f, MathF.PI / 4f, MathF.PI / 4f, MathF.PI / 4f, MathF.PI / 4f];
        var e = Vector3.Zero;
        for (int k = 0; k < 9; k++) e += sh[k] * y[k] * band[k];
        return e / MathF.PI;
    }

    /// <summary>The share of environment light reflected specularly, an analytic fit (Karis 2014) of the split-sum lookup table.</summary>
    public static Vector3 EnvBrdf(Vector3 f0, float roughness, float nv)
    {
        var r = roughness * new Vector4(-1f, -0.0275f, -0.572f, 0.022f) + new Vector4(1f, 0.0425f, 1.04f, -0.04f);
        float a004 = MathF.Min(r.X * r.X, MathF.Pow(2f, -9.28f * nv)) * r.X + r.Y;
        float scale = -1.04f * a004 + r.Z, bias = 1.04f * a004 + r.W;
        return f0 * scale + new Vector3(bias);
    }
}` },
      { type: 'h2', text: 'Diffuse light in nine numbers' },
      { type: 'p', text: '**Spherical harmonics** (SH) are to functions on a sphere what a Fourier series is to a signal: a sum of basis functions of rising frequency. Irradiance is so smooth that the first three bands, nine functions, describe it to within a few per cent (Ramamoorthi and Hanrahan, 2001). Projecting the sky onto them takes thousands of samples once, on the CPU; evaluating irradiance for a normal in the shader is a handful of multiply-adds. Each band is scaled by a constant (π, 2π/3, π/4) that performs the cosine-weighted integral over the hemisphere. See how the bands build up:' },
      { type: 'widget', name: 'sh-irradiance' },
      { type: 'h2', text: 'Specular light from the mip levels' },
      { type: 'p', text: 'A mirror reflects exactly the environment in the reflection direction **r** = reflect(−v, n). A rough surface reflects a blurred version, the blur growing with roughness. Engines store increasingly blurred copies of the environment in the cube map’s mip levels and pick the level from the roughness. Properly, each level is the environment convolved with the GGX lobe; this engine takes the cheap route of plain mip-mapping (box-filtered blits, as module 4’s textures), which blurs in roughly the right way but not with the right shape.' },
      { type: 'p', text: 'The other half of the specular term, how much of that light the surface reflects, depends on F₀, roughness and n·v. It is precomputed into a small 2D lookup table in most engines (the **split-sum** approximation); `Sky.EnvBrdf` uses an analytic fit of that table from Unreal Engine’s mobile renderer instead, so no extra texture is needed.' },
      { type: 'code', title: 'Engine/CubeTexture.cs', code: cs`
using System.Numerics;
using Silk.NET.Vulkan;

/// <summary>An HDR cube map (R16G16B16A16 float) filled from a function of direction, with mip levels made by blits.</summary>
sealed unsafe class CubeTexture : IDisposable
{
    readonly GpuContext gpu;
    readonly DeviceMemory memory;
    public readonly Image Image;
    public readonly ImageView View;
    public readonly Sampler Sampler;
    public readonly uint Size, Levels;

    /// <summary>The direction through point (u, v) of a face, both from -1 to 1. Faces in Vulkan's order: +X, -X, +Y, -Y, +Z, -Z.</summary>
    public static Vector3 Direction(int face, float u, float v) => Vector3.Normalize(face switch
    {
        0 => new(1f, -v, -u), 1 => new(-1f, -v, u), 2 => new(u, 1f, v), 3 => new(u, -1f, -v), 4 => new(u, -v, 1f), _ => new(-u, -v, -1f)
    });

    public CubeTexture(GpuContext gpu, uint size, Func<Vector3, Vector3> radiance)
    {
        this.gpu = gpu;
        Size = size;
        Levels = (uint)BitOperations.Log2(size) + 1;
        var vk = gpu.Vk;
        var info = new ImageCreateInfo
        {
            SType = StructureType.ImageCreateInfo, Flags = ImageCreateFlags.CreateCubeCompatibleBit, ImageType = ImageType.Type2D,
            Format = Format.R16G16B16A16Sfloat, Extent = new Extent3D(size, size, 1), MipLevels = Levels, ArrayLayers = 6,
            Samples = SampleCountFlags.Count1Bit, Tiling = ImageTiling.Optimal, InitialLayout = ImageLayout.Undefined,
            Usage = ImageUsageFlags.TransferDstBit | ImageUsageFlags.TransferSrcBit | ImageUsageFlags.SampledBit
        };
        Image image;
        vk.CreateImage(gpu.Device, &info, null, &image).Check("CreateImage");
        Image = image;
        MemoryRequirements needs;
        vk.GetImageMemoryRequirements(gpu.Device, Image, &needs);
        var alloc = new MemoryAllocateInfo { SType = StructureType.MemoryAllocateInfo, AllocationSize = needs.Size, MemoryTypeIndex = GpuBuffer.FindMemoryType(gpu, needs.MemoryTypeBits, MemoryPropertyFlags.DeviceLocalBit) };
        DeviceMemory mem;
        vk.AllocateMemory(gpu.Device, &alloc, null, &mem).Check("AllocateMemory");
        memory = mem;
        vk.BindImageMemory(gpu.Device, Image, memory, 0).Check("BindImageMemory");
        var viewInfo = new ImageViewCreateInfo
        {
            SType = StructureType.ImageViewCreateInfo, Image = Image, ViewType = ImageViewType.TypeCube, Format = info.Format,
            SubresourceRange = new ImageSubresourceRange(ImageAspectFlags.ColorBit, 0, Levels, 0, 6)
        };
        ImageView view;
        vk.CreateImageView(gpu.Device, &viewInfo, null, &view).Check("CreateImageView");
        View = view;

        var texels = new Half[6 * size * size * 4];                                // level 0 of every face, face after face
        for (int face = 0; face < 6; face++)
            for (int y = 0; y < size; y++)
                for (int x = 0; x < size; x++)
                {
                    var c = radiance(Direction(face, (x + 0.5f) / size * 2f - 1f, (y + 0.5f) / size * 2f - 1f));
                    long at = ((face * size + y) * size + x) * 4;
                    (texels[at], texels[at + 1], texels[at + 2], texels[at + 3]) = ((Half)c.X, (Half)c.Y, (Half)c.Z, (Half)1f);
                }
        using var staging = new GpuBuffer(gpu, (ulong)texels.Length * 2, BufferUsageFlags.TransferSrcBit, MemoryPropertyFlags.HostVisibleBit | MemoryPropertyFlags.HostCoherentBit);
        staging.Write<Half>(texels);
        Upload.Immediate(gpu, cmd =>
        {
            Barrier(cmd, 0, Levels, ImageLayout.Undefined, ImageLayout.TransferDstOptimal, PipelineStageFlags2.None, AccessFlags2.None, PipelineStageFlags2.AllTransferBit, AccessFlags2.TransferWriteBit);
            var region = new BufferImageCopy { ImageSubresource = new ImageSubresourceLayers(ImageAspectFlags.ColorBit, 0, 0, 6), ImageExtent = new Extent3D(size, size, 1) };
            vk.CmdCopyBufferToImage(cmd, staging.Handle, Image, ImageLayout.TransferDstOptimal, 1, &region);
            int s = (int)size;
            for (uint level = 1; level < Levels; level++, s /= 2)                    // each level: the one above, halved, all six faces at once
            {
                Barrier(cmd, level - 1, 1, ImageLayout.TransferDstOptimal, ImageLayout.TransferSrcOptimal, PipelineStageFlags2.AllTransferBit, AccessFlags2.TransferWriteBit, PipelineStageFlags2.BlitBit, AccessFlags2.TransferReadBit);
                var blit = new ImageBlit
                {
                    SrcSubresource = new ImageSubresourceLayers(ImageAspectFlags.ColorBit, level - 1, 0, 6),
                    DstSubresource = new ImageSubresourceLayers(ImageAspectFlags.ColorBit, level, 0, 6)
                };
                blit.SrcOffsets[1] = new Offset3D(s, s, 1);
                blit.DstOffsets[1] = new Offset3D(s / 2, s / 2, 1);
                vk.CmdBlitImage(cmd, Image, ImageLayout.TransferSrcOptimal, Image, ImageLayout.TransferDstOptimal, 1, &blit, Filter.Linear);
                Barrier(cmd, level - 1, 1, ImageLayout.TransferSrcOptimal, ImageLayout.ShaderReadOnlyOptimal, PipelineStageFlags2.BlitBit, AccessFlags2.TransferReadBit, PipelineStageFlags2.FragmentShaderBit, AccessFlags2.ShaderSampledReadBit);
            }
            Barrier(cmd, Levels - 1, 1, ImageLayout.TransferDstOptimal, ImageLayout.ShaderReadOnlyOptimal, PipelineStageFlags2.AllTransferBit, AccessFlags2.TransferWriteBit, PipelineStageFlags2.FragmentShaderBit, AccessFlags2.ShaderSampledReadBit);
        });

        var samplerInfo = new SamplerCreateInfo
        {
            SType = StructureType.SamplerCreateInfo, MagFilter = Filter.Linear, MinFilter = Filter.Linear, MipmapMode = SamplerMipmapMode.Linear,
            AddressModeU = SamplerAddressMode.ClampToEdge, AddressModeV = SamplerAddressMode.ClampToEdge, AddressModeW = SamplerAddressMode.ClampToEdge,
            MaxLod = Levels, MaxAnisotropy = 1
        };
        Sampler sampler;
        vk.CreateSampler(gpu.Device, &samplerInfo, null, &sampler).Check("CreateSampler");
        Sampler = sampler;
    }

    void Barrier(CommandBuffer cmd, uint baseMip, uint mips, ImageLayout from, ImageLayout to,
                 PipelineStageFlags2 srcStage, AccessFlags2 srcAccess, PipelineStageFlags2 dstStage, AccessFlags2 dstAccess)
    {
        var barrier = new ImageMemoryBarrier2
        {
            SType = StructureType.ImageMemoryBarrier2, SrcStageMask = srcStage, SrcAccessMask = srcAccess, DstStageMask = dstStage, DstAccessMask = dstAccess,
            OldLayout = from, NewLayout = to, SrcQueueFamilyIndex = Vk.QueueFamilyIgnored, DstQueueFamilyIndex = Vk.QueueFamilyIgnored,
            Image = Image, SubresourceRange = new ImageSubresourceRange(ImageAspectFlags.ColorBit, baseMip, mips, 0, 6)
        };
        var dependency = new DependencyInfo { SType = StructureType.DependencyInfo, ImageMemoryBarrierCount = 1, PImageMemoryBarriers = &barrier };
        gpu.Vk.CmdPipelineBarrier2(cmd, &dependency);
    }

    public void Dispose()
    {
        gpu.Vk.DestroySampler(gpu.Device, Sampler, null);
        gpu.Vk.DestroyImageView(gpu.Device, View, null);
        gpu.Vk.DestroyImage(gpu.Device, Image, null);
        gpu.Vk.FreeMemory(gpu.Device, memory, null);
    }
}` },
      { type: 'h2', text: 'The IBL shader' },
      { type: 'p', text: 'The nine coefficients travel with the frame values, after the struct from lesson 1, so they are one more uniform block member: `vec4 sh[9]`. The cube map is set 1. `material.z` switches the specular part on and off, which the sample uses to check the diffuse part on its own:' },
      { type: 'code', title: 'Engine/IblShaders.cs', code: cs`
using System.Numerics;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;

/// <summary>Nine SH coefficients, one vec4 each (std140 arrays have a 16-byte stride).</summary>
[InlineArray(9)]
struct Sh9 { Vector4 first; }

/// <summary>The frame values followed by the sky's SH coefficients: 336 bytes at set 0, binding 0.</summary>
[StructLayout(LayoutKind.Sequential)]
struct IblUniforms
{
    public FrameUniforms Frame;
    public Sh9 Sh;
}

static class IblShaders
{
    /// <summary>PBR lit only by the environment: SH irradiance for diffuse, the cube map's mips for specular.
    /// material: x metallic, y roughness, z 1 to include specular.</summary>
    public const string Fragment = """
        #version 450

        layout(location = 0) in vec3 vWorldPos;
        layout(location = 1) in vec3 vNormal;
        layout(location = 0) out vec4 outColor;

        layout(set = 0, binding = 0) uniform Frame
        {
            mat4 viewProjection; mat4 lightViewProjection;
            vec4 cameraPosition; vec4 lightDirection; vec4 lightColor; vec4 ambient;
            vec4 sh[9];
        } frame;
        layout(set = 1, binding = 0) uniform samplerCube environment;
        layout(push_constant) uniform Push { mat4 model; vec4 color; vec4 material; } push;

        const float PI = 3.14159265;

        vec3 Irradiance(vec3 n)                                             // divided by pi, like Sky.Irradiance
        {
            vec3 e = PI * 0.282095 * frame.sh[0].rgb
                   + (2.0 * PI / 3.0) * 0.488603 * (frame.sh[1].rgb * n.y + frame.sh[2].rgb * n.z + frame.sh[3].rgb * n.x)
                   + (PI / 4.0) * (1.092548 * (frame.sh[4].rgb * n.x * n.y + frame.sh[5].rgb * n.y * n.z + frame.sh[7].rgb * n.x * n.z)
                                   + 0.315392 * frame.sh[6].rgb * (3.0 * n.z * n.z - 1.0) + 0.546274 * frame.sh[8].rgb * (n.x * n.x - n.y * n.y));
            return e / PI;
        }

        vec3 EnvBrdf(vec3 f0, float roughness, float nv)
        {
            vec4 r = roughness * vec4(-1.0, -0.0275, -0.572, 0.022) + vec4(1.0, 0.0425, 1.04, -0.04);
            float a004 = min(r.x * r.x, exp2(-9.28 * nv)) * r.x + r.y;
            return f0 * (-1.04 * a004 + r.z) + (1.04 * a004 + r.w);
        }

        void main()
        {
            vec3 n = normalize(vNormal);
            vec3 v = normalize(frame.cameraPosition.xyz - vWorldPos);
            float metallic = push.material.x, roughness = push.material.y, nv = max(dot(n, v), 1e-4);
            vec3 base = push.color.rgb;
            vec3 specularShare = EnvBrdf(mix(vec3(0.04), base, metallic), roughness, nv);
            vec3 diffuse = (1.0 - specularShare) * (1.0 - metallic) * base * Irradiance(n);
            float level = roughness * float(textureQueryLevels(environment) - 1);
            vec3 reflected = textureLod(environment, reflect(-v, n), level).rgb;
            outColor = vec4(diffuse + push.material.z * reflected * specularShare, 1.0);
        }
        """;
}` },
      { type: 'h2', text: 'Three spheres under the sky' },
      { type: 'p', text: 'The sample projects the sky onto SH, builds a 64 × 64 cube map, and draws three spheres lit only by the environment: matte white with specular off, polished chrome, and rough steel. On the white sphere it compares four points with `Sky.Irradiance` on the CPU; on the chrome sphere it reports what the top and the bottom reflect:' },
      { type: 'code', title: 'Ibl.cs', code: cs`
using System.Numerics;
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
using var loop = new FrameLoop(gpu, window);
var sh = Sky.Project(Sky.Radiance);
Console.WriteLine($"SH band 0 (the average): {sh[0] * 0.282095f:F3}   band 1, z: {sh[2]:F3}");
using var environment = new CubeTexture(gpu, 64, Sky.Radiance);
Console.WriteLine($"Cube map: 6 faces of {environment.Size} x {environment.Size}, {environment.Levels} mip levels");
using var frameSet = new UniformSet<IblUniforms>(gpu);
using var environmentSet = new ImageSet(gpu, (environment.View, environment.Sampler));
using var pipeline = new MeshPipeline(gpu, loop.Swapchain.Format, LitShaders.Vertex, IblShaders.Fragment,
    setLayouts: [frameSet.Layout, environmentSet.Layout], pushConstants: [LitPush.Range], cull: CullModeFlags.BackBit,
    depthFormat: FrameLoop.DepthFormat, vertexLayout: MeshVertex.Layout, frontFace: FrontFace.CounterClockwise);
var (vertices, indices) = Shapes.Sphere(64, 32);
using var sphere = new Mesh<MeshVertex>(gpu, vertices, indices);
using var capture = new ReadbackBuffer(gpu, loop.Swapchain.Extent);

var eye = new Vector3(0f, -6f, 0.5f);
var viewProjection = Camera.LookAt(eye, Vector3.Zero) * Camera.Perspective(40f, 800f / 600f, 0.1f, 20f);
var uniforms = new IblUniforms { Frame = new FrameUniforms { ViewProjection = viewProjection, CameraPosition = new(eye, 1f) } };
for (int k = 0; k < 9; k++) uniforms.Sh[k] = new Vector4(sh[k], 0f);
frameSet.Write(uniforms);
var white = (Centre: new Vector3(-2f, 0f, 0f), Base: new Vector3(0.8f), Metallic: 0f, Roughness: 1f, Specular: 0f);
var spheres = new[] { white, (new Vector3(0f, 0f, 0f), new Vector3(0.95f), 1f, 0.05f, 1f), (new Vector3(2f, 0f, 0f), new Vector3(0.6f), 1f, 0.6f, 1f) };

loop.Begin(out var frame);
loop.BeginRendering(frame);
gpu.Vk.CmdBindPipeline(frame.Cmd, PipelineBindPoint.Graphics, pipeline.Handle);
frameSet.Bind(frame.Cmd, pipeline.Layout);
environmentSet.Bind(frame.Cmd, pipeline.Layout, 1);
foreach (var (centre, baseColor, metallic, roughness, specular) in spheres)
{
    var push = new LitPush(Scene.Place(centre - new Vector3(0.8f), centre + new Vector3(0.8f)), new(baseColor, 1f), new(metallic, roughness, specular, 0f));
    unsafe { gpu.Vk.CmdPushConstants(frame.Cmd, pipeline.Layout, LitPush.Range.StageFlags, 0, LitPush.Size, &push); }
    sphere.Draw(frame.Cmd);
}
loop.EndRendering(frame);
loop.End(frame, capture);
loop.WaitIdle();

(byte R, byte G, byte B) Pixel(Vector3 p) { var s = Camera.Project(p, viewProjection, loop.Swapchain.Extent); return capture.Pixel((int)s.X, (int)s.Y); }
foreach (var (name, n) in new[] { ("up", Vector3.Normalize(new Vector3(0f, -0.3f, 1f))), ("towards the camera", -Vector3.UnitY),
                                  ("sideways", Vector3.Normalize(new Vector3(1f, -0.6f, 0f))), ("down", Vector3.Normalize(new Vector3(0f, -0.6f, -0.8f))) })
{
    var point = white.Centre + n * 0.8f;
    var share = Sky.EnvBrdf(new Vector3(0.04f), 1f, MathF.Max(Vector3.Dot(n, Vector3.Normalize(eye - point)), 1e-4f));
    var cpu = (Vector3.One - share) * white.Base * Sky.Irradiance(sh, n);
    Console.WriteLine($"White, normal {name,-18} GPU {Pixel(point),-15} CPU {Lighting.ToSrgb(cpu)}");
}
foreach (var (name, n) in new[] { ("top", Vector3.Normalize(new Vector3(0f, -0.4f, 0.9f))), ("bottom", Vector3.Normalize(new Vector3(0f, -0.6f, -0.8f))) })
{
    var point = n * 0.8f;                                                        // on the chrome sphere at the origin
    var v = Vector3.Normalize(eye - point);
    var r = Vector3.Reflect(-v, n);
    Console.WriteLine($"Chrome, {name,-6} reflects {r:F2}: GPU {Pixel(point),-15} sky in that direction {Lighting.ToSrgb(Sky.Radiance(r))}");
}`, output: 'SH band 0 (the average): <0.318, 0.372, 0.544>   band 1, z: <0.041, 0.377, 1.142>\nCube map: 6 faces of 64 x 64, 7 mip levels\nWhite, normal up                 GPU (132, 162, 218) CPU (132, 162, 218)\nWhite, normal towards the camera GPU (141, 151, 176) CPU (141, 151, 176)\nWhite, normal sideways           GPU (141, 151, 176) CPU (141, 151, 176)\nWhite, normal down               GPU (131, 124, 121) CPU (131, 124, 121)\nChrome, top    reflects <0.00, 0.70, 0.71>: GPU (132, 169, 236) sky in that direction (137, 175, 243)\nChrome, bottom reflects <0.00, 0.47, -0.88>: GPU (132, 119, 104) sky in that direction (137, 124, 108)' },
      { type: 'p', text: 'The white sphere matches the CPU exactly at all four normals, and it is no longer one flat colour. Facing up, it is lit by the blue zenith; facing sideways (towards the camera, or to the side), it sees half sky and half ground, a paler grey-blue; facing down, mostly the warm ground. The sky has no variation around the vertical axis, so the two horizontal normals get identical light, and band 1’s z coefficient, the up-down difference, is by far the largest in the blue channel. The chrome sphere shows the sky at the top and the ground at the bottom, at about 96% of their brightness: the share `EnvBrdf` gives a polished metal with F₀ = 0.95. The rough steel sphere on the right reads a blurrier level of the same map.' },
      { type: 'note', kind: 'tip', text: 'For a BIM viewer, a neutral studio environment (soft light from above, a grey floor) often works better than a photographed sky: it shows the shape of every element without colouring it. Combine it with the sun from lesson 3 for exteriors: IBL gives the shadowed sides their colour, and the sun gives direction and shadows.' },
      { type: 'quiz', question: 'Why can diffuse environment lighting be stored in only nine SH coefficients per channel?', options: ['Because environments are small', 'Irradiance integrates over a whole hemisphere with a cosine, which removes all fine detail; three SH bands describe what is left to within a few per cent', 'Nine is the most a uniform buffer can hold', 'Because diffuse light is grey'], answer: 1, explain: 'The cosine-weighted integral is a strong low-pass filter: higher SH bands are multiplied by almost zero. Specular light keeps detail, so it needs the full cube map.' },
      { type: 'quiz', question: 'How does the shader choose which mip level of the environment to read for specular light?', options: ['From the distance to the camera', 'From the roughness: rough surfaces read a blurrier, smaller level', 'Always level 0', 'From the screen-space derivative of the UV'], answer: 1, explain: 'Each level is a blurrier copy, so roughness × (levels − 1) picks how much blur the surface’s microfacets would produce. textureLod chooses the level explicitly.' },
      { type: 'exercise', task: 'Measure how good nine coefficients are. For the normals up, horizontal (+X) and down, compute the sky’s irradiance by brute force (sum radiance × max(n·d, 0) over 200,000 evenly spread directions) and with `Sky.Irradiance`, and print both and the error in per cent.', hint: 'Use `Sky.Spread(i, 200_000)` for the directions; each stands for 4π / 200,000 steradians. Divide the brute-force sum by π so that it matches `Sky.Irradiance`, which also returns irradiance / π. Compare the green channels.', solution: cs`
using System.Numerics;

var sh = Sky.Project(Sky.Radiance);
const int N = 200_000;
foreach (var (name, n) in new[] { ("up", Vector3.UnitZ), ("horizontal", Vector3.UnitX), ("down", -Vector3.UnitZ) })
{
    var exact = Vector3.Zero;
    for (int i = 0; i < N; i++)
    {
        var d = Sky.Spread(i, N);
        exact += Sky.Radiance(d) * MathF.Max(Vector3.Dot(n, d), 0f) * (4f * MathF.PI / N);
    }
    exact /= MathF.PI;
    var approx = Sky.Irradiance(sh, n);
    Console.WriteLine($"{name,-11} exact {exact:F3}  SH {approx:F3}  error {(approx.Y - exact.Y) / exact.Y * 100f,5:F1} %");
}`, output: 'up          exact <0.280, 0.450, 0.900>  SH <0.287, 0.457, 0.904>  error   1.5 %\nhorizontal  exact <0.339, 0.390, 0.549>  SH <0.340, 0.392, 0.550>  error   0.4 %\ndown        exact <0.253, 0.205, 0.156>  SH <0.260, 0.211, 0.161>  error   3.3 %' }
    ],
    keyPoints: [
      'Image-based lighting lights objects with their surroundings, stored as an environment map (usually an HDR cube map).',
      'A cube map is a 2D image with 6 layers, CubeCompatible, viewed as ImageViewType.Cube and sampled with a direction.',
      'Diffuse irradiance is smooth: 9 spherical-harmonic coefficients per channel describe it to within a few per cent.',
      'Specular light comes from the reflection direction, read from a blurrier mip level as roughness rises.',
      'The reflected share of environment light (split sum) comes from a lookup table or an analytic fit such as EnvBrdf.',
      'Combine IBL with a direct sun and its shadows for exteriors.'
    ]
  },

  // ------------------------------------------------------------------ 5
  {
    slug: 'deferred-shading',
    title: 'Deferred shading',
    summary: 'Split rendering in two: first write each pixel’s surface (albedo, normal, depth) into a G-buffer, then light every pixel once in a fullscreen pass. Light a floor with 48 point lights both ways and compare the two images pixel by pixel.',
    minutes: 26,
    blocks: [
      { type: 'p', text: 'An interior at night has dozens of lights: ceiling lights, desk lamps, emergency signs. In everything so far, the fragment shader lights each fragment while drawing it. That is **forward** rendering, and with many lights it wastes work twice over. Every fragment loops over every light, and many fragments are later covered by nearer surfaces (**overdraw**), so their lighting was computed for nothing.' },
      { type: 'p', text: '**Deferred shading** separates the two jobs:' },
      { type: 'ol', items: [
        '**Geometry pass:** draw the scene once, writing what each pixel’s surface **is** into several images, the **G-buffer**: albedo, normal and depth (more in production: roughness, metallic, emissive, motion).',
        '**Lighting pass:** draw one triangle that covers the screen. For each pixel, read the G-buffer, rebuild the world position from the depth, and add up the lights. Each visible pixel is lit exactly once, whatever the overdraw.'
      ] },
      { type: 'widget', name: 'gbuffer-view' },
      { type: 'table', head: ['', 'Forward', 'Deferred'], rows: [
        ['Lighting cost', 'fragments drawn × lights', 'screen pixels × lights (plus one G-buffer write per fragment)'],
        ['Memory', 'Colour and depth', 'G-buffer: here 16 bytes per pixel, 31.6 MiB at 1920 × 1080'],
        ['Transparency', 'Natural: blend as you draw', 'Not possible in the G-buffer: transparent objects get a forward pass afterwards'],
        ['MSAA', 'Natural', 'Expensive: every G-buffer image must be multisampled'],
        ['Materials', 'Any shader per object', 'One lighting shader for everything; material differences must fit in the G-buffer']
      ] },
      { type: 'h2', text: 'More than one colour attachment' },
      { type: 'p', text: 'The geometry pass writes two colour images at once: `layout(location = 0)` and `layout(location = 1)` outputs go to colour attachments 0 and 1. The pipeline must list both formats, and the lighting pass needs a pipeline without any vertex buffer, because it makes its triangle from `gl_VertexIndex`. `MeshPipeline` gains `moreColorFormats` and `VertexLayout.None`:' },
      { type: 'code', title: 'Engine/MeshPipeline.cs', code: cs`
using Silk.NET.Core.Native;
using Silk.NET.Shaderc;
using Silk.NET.Vulkan;

/// <summary>How the vertex shader's inputs are laid out in a vertex buffer.</summary>
sealed record VertexLayout(VertexInputBindingDescription Binding, VertexInputAttributeDescription[] Attributes)
{
    /// <summary>No vertex buffer at all: the vertex shader makes its positions from gl_VertexIndex (fullscreen passes).</summary>
    public static readonly VertexLayout None = new(default, []);
}

sealed unsafe class MeshPipeline : IDisposable
{
    readonly GpuContext gpu;
    public readonly PipelineLayout Layout;
    public readonly Pipeline Handle;

    public MeshPipeline(GpuContext gpu, Format colorFormat, string vertexGlsl, string fragmentGlsl,
                        DescriptorSetLayout[]? setLayouts = null, PushConstantRange[]? pushConstants = null,
                        CullModeFlags cull = CullModeFlags.None,
                        Format depthFormat = Format.Undefined, CompareOp depthCompare = CompareOp.Less,
                        VertexLayout? vertexLayout = null, SampleCountFlags samples = SampleCountFlags.Count1Bit,
                        bool blend = false,                                 // new: mix with what is behind, by alpha
                        bool depthWrite = true,                             // new: false for transparent surfaces
                        FrontFace frontFace = FrontFace.Clockwise,          // new: which winding faces the camera
                        PipelineCache cache = default,
                        Format[]? moreColorFormats = null)                  // new: extra colour attachments (G-buffers)
    {
        this.gpu = gpu;
        var vk = gpu.Vk;
        var vert = Shaders.CreateModule(gpu, Shaders.Compile(vertexGlsl, ShaderKind.VertexShader, "mesh.vert"));
        var frag = Shaders.CreateModule(gpu, Shaders.Compile(fragmentGlsl, ShaderKind.FragmentShader, "mesh.frag"));
        byte* main = (byte*)SilkMarshal.StringToPtr("main");
        var stages = stackalloc PipelineShaderStageCreateInfo[2];
        stages[0] = new() { SType = StructureType.PipelineShaderStageCreateInfo, Stage = ShaderStageFlags.VertexBit, Module = vert, PName = main };
        stages[1] = new() { SType = StructureType.PipelineShaderStageCreateInfo, Stage = ShaderStageFlags.FragmentBit, Module = frag, PName = main };

        vertexLayout ??= new VertexLayout(Vertex.Binding, Vertex.Attributes);
        var binding = vertexLayout.Binding;
        var attributes = stackalloc VertexInputAttributeDescription[vertexLayout.Attributes.Length];
        for (int i = 0; i < vertexLayout.Attributes.Length; i++) attributes[i] = vertexLayout.Attributes[i];
        var vertexInput = new PipelineVertexInputStateCreateInfo
        {
            SType = StructureType.PipelineVertexInputStateCreateInfo,
            VertexBindingDescriptionCount = vertexLayout.Attributes.Length > 0 ? 1u : 0u, PVertexBindingDescriptions = &binding,
            VertexAttributeDescriptionCount = (uint)vertexLayout.Attributes.Length, PVertexAttributeDescriptions = attributes
        };
        var inputAssembly = new PipelineInputAssemblyStateCreateInfo { SType = StructureType.PipelineInputAssemblyStateCreateInfo, Topology = PrimitiveTopology.TriangleList };
        var viewport = new PipelineViewportStateCreateInfo { SType = StructureType.PipelineViewportStateCreateInfo, ViewportCount = 1, ScissorCount = 1 };
        var raster = new PipelineRasterizationStateCreateInfo
        {
            SType = StructureType.PipelineRasterizationStateCreateInfo,
            PolygonMode = PolygonMode.Fill, CullMode = cull, FrontFace = frontFace, LineWidth = 1f
        };
        var multisample = new PipelineMultisampleStateCreateInfo { SType = StructureType.PipelineMultisampleStateCreateInfo, RasterizationSamples = samples };
        var depthStencil = new PipelineDepthStencilStateCreateInfo
        {
            SType = StructureType.PipelineDepthStencilStateCreateInfo,
            DepthTestEnable = depthFormat != Format.Undefined,
            DepthWriteEnable = depthFormat != Format.Undefined && depthWrite,
            DepthCompareOp = depthCompare
        };
        Format[] colorFormats = [colorFormat, .. moreColorFormats ?? []];
        var blendAttachments = stackalloc PipelineColorBlendAttachmentState[colorFormats.Length];
        for (int i = 0; i < colorFormats.Length; i++) blendAttachments[i] = new PipelineColorBlendAttachmentState
        {
            BlendEnable = blend,
            SrcColorBlendFactor = BlendFactor.SrcAlpha, DstColorBlendFactor = BlendFactor.OneMinusSrcAlpha, ColorBlendOp = BlendOp.Add,   // a·src + (1 - a)·dst
            SrcAlphaBlendFactor = BlendFactor.One, DstAlphaBlendFactor = BlendFactor.OneMinusSrcAlpha, AlphaBlendOp = BlendOp.Add,
            ColorWriteMask = ColorComponentFlags.RBit | ColorComponentFlags.GBit | ColorComponentFlags.BBit | ColorComponentFlags.ABit
        };
        var blendState = new PipelineColorBlendStateCreateInfo { SType = StructureType.PipelineColorBlendStateCreateInfo, AttachmentCount = (uint)colorFormats.Length, PAttachments = blendAttachments };
        var dynamicStates = stackalloc DynamicState[] { DynamicState.Viewport, DynamicState.Scissor };
        var dynamic = new PipelineDynamicStateCreateInfo { SType = StructureType.PipelineDynamicStateCreateInfo, DynamicStateCount = 2, PDynamicStates = dynamicStates };

        setLayouts ??= [];
        pushConstants ??= [];
        fixed (DescriptorSetLayout* sets = setLayouts)
        fixed (PushConstantRange* push = pushConstants)
        {
            var layoutInfo = new PipelineLayoutCreateInfo
            {
                SType = StructureType.PipelineLayoutCreateInfo,
                SetLayoutCount = (uint)setLayouts.Length, PSetLayouts = sets,
                PushConstantRangeCount = (uint)pushConstants.Length, PPushConstantRanges = push
            };
            PipelineLayout layout;
            vk.CreatePipelineLayout(gpu.Device, &layoutInfo, null, &layout).Check("CreatePipelineLayout");
            Layout = layout;
        }

        var formats = stackalloc Format[colorFormats.Length];
        for (int i = 0; i < colorFormats.Length; i++) formats[i] = colorFormats[i];
        var rendering = new PipelineRenderingCreateInfo
        {
            SType = StructureType.PipelineRenderingCreateInfo, ColorAttachmentCount = (uint)colorFormats.Length, PColorAttachmentFormats = formats,
            DepthAttachmentFormat = depthFormat
        };
        var info = new GraphicsPipelineCreateInfo
        {
            SType = StructureType.GraphicsPipelineCreateInfo, PNext = &rendering,
            StageCount = 2, PStages = stages,
            PVertexInputState = &vertexInput, PInputAssemblyState = &inputAssembly,
            PViewportState = &viewport, PRasterizationState = &raster,
            PMultisampleState = &multisample, PDepthStencilState = &depthStencil, PColorBlendState = &blendState,
            PDynamicState = &dynamic, Layout = Layout
        };
        Pipeline pipeline;
        vk.CreateGraphicsPipelines(gpu.Device, cache, 1, &info, null, &pipeline).Check("CreateGraphicsPipelines");
        Handle = pipeline;
        vk.DestroyShaderModule(gpu.Device, vert, null);
        vk.DestroyShaderModule(gpu.Device, frag, null);
        SilkMarshal.Free((nint)main);
    }

    public void Dispose()
    {
        gpu.Vk.DestroyPipeline(gpu.Device, Handle, null);
        gpu.Vk.DestroyPipelineLayout(gpu.Device, Layout, null);
    }
}` },
      { type: 'h2', text: 'The G-buffer' },
      { type: 'p', text: 'Albedo is stored as 8-bit sRGB, enough for colours. Normals need more precision and negative values, so they use 16-bit floats. Depth is the depth buffer itself, created with `Sampled` usage so that the lighting pass can read it. The class owns the three images, a nearest-neighbour sampler (the lighting pass reads exactly one texel per pixel) and the `ImageSet` that binds all three:' },
      { type: 'code', title: 'Engine/GBuffer.cs', code: cs`
using Silk.NET.Vulkan;

/// <summary>Albedo, normal and depth images for deferred shading, and a descriptor set that samples all three.</summary>
sealed unsafe class GBuffer : IDisposable
{
    public const Format AlbedoFormat = Format.R8G8B8A8Srgb, NormalFormat = Format.R16G16B16A16Sfloat, DepthFormat = Format.D32Sfloat;
    public const int BytesPerPixel = 4 + 8 + 4;
    readonly GpuContext gpu;
    public readonly GpuImage Albedo, Normal, Depth;
    public readonly Sampler Sampler;
    public readonly ImageSet Set;
    public readonly Extent2D Extent;

    public GBuffer(GpuContext gpu, Extent2D extent)
    {
        this.gpu = gpu;
        Extent = extent;
        var color = ImageUsageFlags.ColorAttachmentBit | ImageUsageFlags.SampledBit;
        Albedo = new GpuImage(gpu, extent, AlbedoFormat, color, ImageAspectFlags.ColorBit);
        Normal = new GpuImage(gpu, extent, NormalFormat, color, ImageAspectFlags.ColorBit);
        Depth = new GpuImage(gpu, extent, DepthFormat, ImageUsageFlags.DepthStencilAttachmentBit | ImageUsageFlags.SampledBit, ImageAspectFlags.DepthBit);
        var info = new SamplerCreateInfo
        {
            SType = StructureType.SamplerCreateInfo, MagFilter = Filter.Nearest, MinFilter = Filter.Nearest,
            AddressModeU = SamplerAddressMode.ClampToEdge, AddressModeV = SamplerAddressMode.ClampToEdge, AddressModeW = SamplerAddressMode.ClampToEdge, MaxAnisotropy = 1
        };
        Sampler sampler;
        gpu.Vk.CreateSampler(gpu.Device, &info, null, &sampler).Check("CreateSampler");
        Sampler = sampler;
        Set = new ImageSet(gpu, (Albedo.View, Sampler), (Normal.View, Sampler), (Depth.View, Sampler));
    }

    /// <summary>Begins rendering into albedo (location 0), normal (location 1) and depth, all cleared, with a full viewport.</summary>
    public void BeginRendering(CommandBuffer cmd)
    {
        var colors = stackalloc RenderingAttachmentInfo[2];
        int i = 0;
        foreach (var image in new[] { Albedo, Normal })
            colors[i++] = new RenderingAttachmentInfo
            {
                SType = StructureType.RenderingAttachmentInfo, ImageView = image.View, ImageLayout = ImageLayout.ColorAttachmentOptimal,
                LoadOp = AttachmentLoadOp.Clear, StoreOp = AttachmentStoreOp.Store, ClearValue = new ClearValue(new ClearColorValue(0f, 0f, 0f, 0f))
            };
        var depth = new RenderingAttachmentInfo
        {
            SType = StructureType.RenderingAttachmentInfo, ImageView = Depth.View, ImageLayout = ImageLayout.DepthAttachmentOptimal,
            LoadOp = AttachmentLoadOp.Clear, StoreOp = AttachmentStoreOp.Store,                  // Store: the lighting pass reads it
            ClearValue = new ClearValue(depthStencil: new ClearDepthStencilValue(1f, 0))
        };
        var rendering = new RenderingInfo
        {
            SType = StructureType.RenderingInfo, RenderArea = new Rect2D(new Offset2D(0, 0), Extent), LayerCount = 1,
            ColorAttachmentCount = 2, PColorAttachments = colors, PDepthAttachment = &depth
        };
        gpu.Vk.CmdBeginRendering(cmd, &rendering);
        var viewport = new Viewport(0, 0, Extent.Width, Extent.Height, 0, 1);
        gpu.Vk.CmdSetViewport(cmd, 0, 1, &viewport);
        var scissor = new Rect2D(new Offset2D(0, 0), Extent);
        gpu.Vk.CmdSetScissor(cmd, 0, 1, &scissor);
    }

    public void Dispose()
    {
        Set.Dispose();
        gpu.Vk.DestroySampler(gpu.Device, Sampler, null);
        Depth.Dispose();
        Normal.Dispose();
        Albedo.Dispose();
    }
}` },
      { type: 'h2', text: 'Point lights, and the shaders' },
      { type: 'p', text: 'A point light’s intensity falls with the square of the distance, but in theory never reaches zero, so every light would touch every pixel. Engines give each light a **radius** and multiply by a window that fades smoothly to zero there: ((1 − (d / r)⁴)⁺)² / (d² + 1). The lights go in the frame uniform buffer after the lesson 1 values, as 64 pairs of vec4: position and radius, then colour. The same light loop serves the forward shader and the deferred lighting pass, so the two can be compared:' },
      { type: 'code', title: 'Engine/DeferredShaders.cs', code: cs`
using System.Numerics;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;

/// <summary>Up to 64 point lights: element 2i is position (xyz) and radius (w), element 2i + 1 is colour.</summary>
[InlineArray(128)]
struct LightArray { Vector4 first; }

/// <summary>The frame values, the inverse view-projection (to rebuild positions from depth) and the lights. 2,320 bytes.</summary>
[StructLayout(LayoutKind.Sequential)]
struct DeferredUniforms
{
    public FrameUniforms Frame;
    public Matrix4x4 InverseViewProjection;
    public Vector4 LightsAndBackground;         // x: number of lights; yzw: the colour of empty pixels
    public LightArray Lights;
}

static class DeferredShaders
{
    const string FrameBlock = """
        layout(set = 0, binding = 0) uniform Frame
        {
            mat4 viewProjection; mat4 lightViewProjection;
            vec4 cameraPosition; vec4 lightDirection; vec4 lightColor; vec4 ambient;
            mat4 inverseViewProjection; vec4 lightsAndBackground; vec4 lights[128];
        } frame;

        """;

    const string LightLoop = """
        vec3 Shade(vec3 p, vec3 n, vec3 albedo)
        {
            vec3 sum = frame.ambient.rgb * albedo;
            for (int i = 0; i < int(frame.lightsAndBackground.x); i++)
            {
                vec3 toLight = frame.lights[2 * i].xyz - p;
                float d = length(toLight), window = clamp(1.0 - pow(d / frame.lights[2 * i].w, 4.0), 0.0, 1.0);
                sum += albedo * frame.lights[2 * i + 1].rgb * max(dot(n, toLight / d), 0.0) * window * window / (d * d + 1.0);
            }
            return sum;
        }

        """;

    /// <summary>Forward: light each fragment as it is drawn. Use with LitShaders.Vertex.</summary>
    public const string Forward = "#version 450\n" + FrameBlock + LightLoop + """
        layout(location = 0) in vec3 vWorldPos;
        layout(location = 1) in vec3 vNormal;
        layout(location = 0) out vec4 outColor;
        layout(push_constant) uniform Push { mat4 model; vec4 color; vec4 material; } push;

        void main() { outColor = vec4(Shade(vWorldPos, normalize(vNormal), push.color.rgb), 1.0); }
        """;

    /// <summary>Geometry pass: albedo to attachment 0, the world normal to attachment 1. Use with LitShaders.Vertex.</summary>
    public const string GBuffer = """
        #version 450

        layout(location = 1) in vec3 vNormal;
        layout(location = 0) out vec4 outAlbedo;
        layout(location = 1) out vec4 outNormal;
        layout(push_constant) uniform Push { mat4 model; vec4 color; vec4 material; } push;

        void main()
        {
            outAlbedo = vec4(push.color.rgb, 1.0);
            outNormal = vec4(normalize(vNormal), 0.0);
        }
        """;

    /// <summary>One triangle that covers the screen, with texture coordinates 0..1 across it. No vertex buffer.</summary>
    public const string Fullscreen = """
        #version 450

        layout(location = 0) out vec2 vUv;

        void main()
        {
            vUv = vec2((gl_VertexIndex << 1) & 2, gl_VertexIndex & 2);         // (0,0), (2,0), (0,2)
            gl_Position = vec4(vUv * 2.0 - 1.0, 0.0, 1.0);
        }
        """;

    /// <summary>Lighting pass: read the G-buffer, rebuild the world position from depth, light it.</summary>
    public const string Lighting = "#version 450\n" + FrameBlock + LightLoop + """
        layout(location = 0) in vec2 vUv;
        layout(location = 0) out vec4 outColor;
        layout(set = 1, binding = 0) uniform sampler2D gAlbedo;
        layout(set = 1, binding = 1) uniform sampler2D gNormal;
        layout(set = 1, binding = 2) uniform sampler2D gDepth;

        void main()
        {
            float depth = texture(gDepth, vUv).r;
            if (depth == 1.0) { outColor = vec4(frame.lightsAndBackground.yzw, 1.0); return; }   // nothing drawn here
            vec4 world = frame.inverseViewProjection * vec4(vUv * 2.0 - 1.0, depth, 1.0);
            vec3 p = world.xyz / world.w;
            outColor = vec4(Shade(p, texture(gNormal, vUv).xyz, texture(gAlbedo, vUv).rgb), 1.0);
        }
        """;

    /// <summary>The light loop on the CPU, to check the GPU.</summary>
    public static Vector3 Shade(Vector3 p, Vector3 n, Vector3 albedo, Vector3 ambient, (Vector3 Position, float Radius, Vector3 Color)[] lights)
    {
        var sum = ambient * albedo;
        foreach (var (position, radius, color) in lights)
        {
            var toLight = position - p;
            float d = toLight.Length(), window = Math.Clamp(1f - MathF.Pow(d / radius, 4f), 0f, 1f);
            sum += albedo * color * MathF.Max(Vector3.Dot(n, toLight / d), 0f) * window * window / (d * d + 1f);
        }
        return sum;
    }
}` },
      { type: 'p', text: 'Rebuilding the position is the key trick of the lighting pass. The pixel’s texture coordinate gives its NDC x and y, the depth buffer gives its NDC z, and multiplying by the inverse of the view-projection matrix, then dividing by w, undoes the projection: the world position, without having stored it.' },
      { type: 'h2', text: '48 lights, two ways' },
      { type: 'p', text: 'The sample lights a slab with 16 columns using 48 coloured point lights, first forward, then deferred, with module 5’s render graph scheduling the G-buffer’s barriers. Then it compares the two frames pixel by pixel, and checks three slab points against the CPU:' },
      { type: 'code', title: 'Deferred.cs', code: cs`
using System.Numerics;
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
using var loop = new FrameLoop(gpu, window);
var extent = loop.Swapchain.Extent;
using var frameSet = new UniformSet<DeferredUniforms>(gpu);
using var gbuffer = new GBuffer(gpu, extent);
var lit = new { setLayouts = new[] { frameSet.Layout }, push = new[] { LitPush.Range } };
using var forward = new MeshPipeline(gpu, loop.Swapchain.Format, LitShaders.Vertex, DeferredShaders.Forward, setLayouts: lit.setLayouts, pushConstants: lit.push,
    cull: CullModeFlags.BackBit, depthFormat: FrameLoop.DepthFormat, vertexLayout: MeshVertex.Layout, frontFace: FrontFace.CounterClockwise);
using var geometry = new MeshPipeline(gpu, GBuffer.AlbedoFormat, LitShaders.Vertex, DeferredShaders.GBuffer, setLayouts: lit.setLayouts, pushConstants: lit.push,
    cull: CullModeFlags.BackBit, depthFormat: GBuffer.DepthFormat, vertexLayout: MeshVertex.Layout, frontFace: FrontFace.CounterClockwise,
    moreColorFormats: [GBuffer.NormalFormat]);
using var lighting = new MeshPipeline(gpu, loop.Swapchain.Format, DeferredShaders.Fullscreen, DeferredShaders.Lighting,
    setLayouts: [frameSet.Layout, gbuffer.Set.Layout], vertexLayout: VertexLayout.None);
var (vertices, indices) = Shapes.Box(new Vector3(-0.5f), new Vector3(0.5f));
using var box = new Mesh<MeshVertex>(gpu, vertices, indices);
using var capture = new ReadbackBuffer(gpu, extent);

var objects = new List<(Matrix4x4 World, Vector3 Color)> { (Scene.Place(new(-10f, -10f, -0.3f), new(10f, 10f, 0f)), new(0.7f)) };
foreach (float x in new[] { -6f, -2f, 2f, 6f })
    foreach (float y in new[] { -6f, -2f, 2f, 6f })
        objects.Add((Scene.Place(new(x - 0.25f, y - 0.25f, 0f), new(x + 0.25f, y + 0.25f, 3f)), new(0.85f, 0.82f, 0.78f)));
var random = new Random(3);
var lights = Enumerable.Range(0, 48).Select(_ => (Position: new Vector3(random.NextSingle() * 18f - 9f, random.NextSingle() * 18f - 9f, 0.5f + random.NextSingle() * 1.5f),
                                                 Radius: 5f, Color: new Vector3(0.2f + random.NextSingle(), 0.2f + random.NextSingle(), 0.2f + random.NextSingle()) * 2f)).ToArray();
var eye = new Vector3(0f, -16f, 14f);
var viewProjection = Camera.LookAt(eye, Vector3.Zero) * Camera.Perspective(45f, 800f / 600f, 1f, 60f);
Matrix4x4.Invert(viewProjection, out var inverse);
var uniforms = new DeferredUniforms
{
    Frame = new FrameUniforms { ViewProjection = viewProjection, CameraPosition = new(eye, 1f), Ambient = new(0.02f, 0.02f, 0.02f, 0f) },
    InverseViewProjection = inverse, LightsAndBackground = new(lights.Length, loop.Background.Float32_0, loop.Background.Float32_1, loop.Background.Float32_2)
};
for (int i = 0; i < lights.Length; i++) (uniforms.Lights[2 * i], uniforms.Lights[2 * i + 1]) = (new(lights[i].Position, lights[i].Radius), new(lights[i].Color, 0f));
frameSet.Write(uniforms);

void DrawObjects(CommandBuffer cmd, MeshPipeline pipeline)
{
    gpu.Vk.CmdBindPipeline(cmd, PipelineBindPoint.Graphics, pipeline.Handle);
    frameSet.Bind(cmd, pipeline.Layout);
    foreach (var (world, color) in objects)
    {
        var push = new LitPush(world, new(color, 1f), Vector4.Zero);
        unsafe { gpu.Vk.CmdPushConstants(cmd, pipeline.Layout, LitPush.Range.StageFlags, 0, LitPush.Size, &push); }
        box.Draw(cmd);
    }
}
(byte, byte, byte)[] Pixels() => Enumerable.Range(0, 800 * 600).Select(i => capture.Pixel(i % 800, i / 800)).ToArray();

loop.Begin(out var frame);                                                       // forward: one pass
loop.BeginRendering(frame);
DrawObjects(frame.Cmd, forward);
loop.EndRendering(frame);
loop.End(frame, capture);
loop.WaitIdle();
var forwardImage = Pixels();

loop.Begin(out frame);                                                           // deferred: two passes, scheduled by the render graph
var graph = new RenderGraph();
var albedo = graph.Import("albedo", gbuffer.Albedo.Handle, ImageAspectFlags.ColorBit);
var normal = graph.Import("normal", gbuffer.Normal.Handle, ImageAspectFlags.ColorBit);
var depth = graph.Import("depth", gbuffer.Depth.Handle, ImageAspectFlags.DepthBit);
var backbuffer = graph.Import("backbuffer", frame.Image, ImageAspectFlags.ColorBit, frame.Layout, frame.Stage, frame.Access);
graph.AddPass("Geometry", [], [(albedo, ImageUse.ColorAttachment), (normal, ImageUse.ColorAttachment), (depth, ImageUse.DepthAttachment)], cmd =>
{
    gbuffer.BeginRendering(cmd);
    DrawObjects(cmd, geometry);
    gpu.Vk.CmdEndRendering(cmd);
});
graph.AddPass("Lighting", [(albedo, ImageUse.Sampled), (normal, ImageUse.Sampled), (depth, ImageUse.Sampled)], [(backbuffer, ImageUse.ColorAttachment)], cmd =>
{
    Attachments.BeginRendering(gpu.Vk, cmd, frame.View, default, extent, loop.Background);          // no depth attachment
    gpu.Vk.CmdBindPipeline(cmd, PipelineBindPoint.Graphics, lighting.Handle);
    frameSet.Bind(cmd, lighting.Layout);
    gbuffer.Set.Bind(cmd, lighting.Layout, 1);
    gpu.Vk.CmdDraw(cmd, 3, 1, 0, 0);                                             // the fullscreen triangle
    gpu.Vk.CmdEndRendering(cmd);
});
graph.Output(backbuffer);
foreach (var line in graph.Compile()) Console.WriteLine(line);
graph.Execute(gpu.Vk, frame.Cmd);
(frame.Layout, frame.Stage, frame.Access) = (backbuffer.Layout, backbuffer.Stage, backbuffer.Access);
loop.End(frame, capture);
loop.WaitIdle();
var deferredImage = Pixels();

int differ = 0, worst = 0;
for (int i = 0; i < forwardImage.Length; i++)
{
    var (a, b) = (forwardImage[i], deferredImage[i]);
    int d = Math.Max(Math.Abs(a.Item1 - b.Item1), Math.Max(Math.Abs(a.Item2 - b.Item2), Math.Abs(a.Item3 - b.Item3)));
    if (d > 0) differ++;
    worst = Math.Max(worst, d);
}
Console.WriteLine($"Forward vs deferred: {differ} of {forwardImage.Length} pixels differ, by at most {worst}");
Console.WriteLine($"G-buffer: {GBuffer.BytesPerPixel} bytes per pixel, {GBuffer.BytesPerPixel * 800 * 600 / 1048576.0:F1} MiB here, {GBuffer.BytesPerPixel * 1920 * 1080 / 1048576.0:F1} MiB at 1920 x 1080");
foreach (var p in new[] { new Vector3(-4f, -4f, 0f), new Vector3(0f, 0f, 0f), new Vector3(4f, -8f, 0f) })
{
    var s = Camera.Project(p, viewProjection, extent);
    var cpu = DeferredShaders.Shade(p, Vector3.UnitZ, new(0.7f), new(0.02f), lights);
    Console.WriteLine($"Slab at {p}: deferred {deferredImage[(int)s.Y * 800 + (int)s.X],-15} CPU {Lighting.ToSrgb(cpu)}");
}`, output: 'Geometry: albedo Undefined -> ColorAttachmentOptimal, normal Undefined -> ColorAttachmentOptimal, depth Undefined -> DepthAttachmentOptimal\nLighting: albedo ColorAttachmentOptimal -> ShaderReadOnlyOptimal, normal ColorAttachmentOptimal -> ShaderReadOnlyOptimal, depth DepthAttachmentOptimal -> ShaderReadOnlyOptimal, backbuffer Undefined -> ColorAttachmentOptimal\nForward vs deferred: 147327 of 480000 pixels differ, by at most 1\nG-buffer: 16 bytes per pixel, 7.3 MiB here, 31.6 MiB at 1920 x 1080\nSlab at <-4, -4, 0>: deferred (155, 202, 222) CPU (154, 201, 222)\nSlab at <0, 0, 0>: deferred (196, 225, 179) CPU (195, 224, 178)\nSlab at <4, -8, 0>: deferred (225, 164, 218) CPU (225, 164, 218)' },
      { type: 'p', text: 'The render graph produced the barriers: the geometry pass takes the three images out of `Undefined`, and the lighting pass moves all three to `ShaderReadOnlyOptimal`, depth included. The two frames agree everywhere to within one step of 255. About a third of the pixels differ by exactly that one step, because the G-buffer stores albedo in 8 bits while the forward shader uses the exact value from the push constant. The slab points match the CPU to within one step as well. At 800 × 600 the G-buffer takes 7.3 MiB; at full HD 31.6 MiB, read and written every frame, which is the price of lighting each pixel only once.' },
      { type: 'note', kind: 'info', text: 'Looping over every light in every pixel still costs pixels × lights. Large deferred renderers go one step further: **tiled** or **clustered** shading divides the screen (or the view volume) into cells, finds on the GPU which lights reach each cell, and loops only over those. The same light lists work for forward rendering too (Forward+), which keeps transparency and MSAA easy.' },
      { type: 'quiz', question: 'How does the lighting pass find each pixel’s world position without storing it?', options: ['From the normal', 'NDC x and y come from the pixel’s texture coordinate and z from the depth buffer; the inverse view-projection matrix, then a divide by w, undoes the projection', 'From the vertex shader', 'It reads it from the shadow map'], answer: 1, explain: 'Depth plus screen position fully determines the point. Storing positions would cost 12 to 16 bytes per pixel more.' },
      { type: 'quiz', question: 'Why do engines with a deferred renderer still need a forward pass?', options: ['For shadows', 'For transparent surfaces: the G-buffer holds one surface per pixel, so glass behind which another surface shows cannot be stored', 'For the sky', 'Deferred cannot draw boxes'], answer: 1, explain: 'Each G-buffer pixel describes a single surface. Glass needs blending with what is behind it, so it is drawn forward after the lighting pass, using the lit image and the G-buffer depth.' },
      { type: 'exercise', task: 'Compare the lighting work of forward and deferred rendering for a 1920 × 1080 view where each pixel is covered on average by 3 fragments (overdraw 3), for 1, 8, 64 and 256 lights. Count light evaluations, and for deferred add the G-buffer traffic: 16 bytes written per fragment and 16 bytes read per pixel.', hint: 'Forward: pixels × overdraw × lights evaluations. Deferred: pixels × lights evaluations, plus (pixels × overdraw × 16 + pixels × 16) bytes. Print evaluations in millions and traffic in MiB.', solution: cs`
const long pixels = 1920L * 1080;
const int overdraw = 3, bytes = 16;
Console.WriteLine("Lights   Forward evaluations   Deferred evaluations   Deferred G-buffer traffic");
foreach (int lights in new[] { 1, 8, 64, 256 })
{
    double forward = pixels * overdraw * (double)lights / 1e6, deferred = pixels * (double)lights / 1e6;
    double traffic = (pixels * overdraw * bytes + pixels * bytes) / 1048576.0;
    Console.WriteLine($"{lights,-8} {forward,15:F1} M      {deferred,15:F1} M      {traffic,15:F1} MiB");
}`, output: 'Lights   Forward evaluations   Deferred evaluations   Deferred G-buffer traffic\n1                    6.2 M                  2.1 M                126.6 MiB\n8                   49.8 M                 16.6 M                126.6 MiB\n64                 398.1 M                132.7 M                126.6 MiB\n256               1592.5 M                530.8 M                126.6 MiB' }
    ],
    keyPoints: [
      'Deferred shading writes surface data (albedo, normal, depth) to a G-buffer, then lights each pixel once in a fullscreen pass.',
      'Lighting cost becomes pixels × lights instead of fragments × lights: overdraw no longer multiplies it.',
      'Several colour attachments: list every format in the pipeline and write layout(location = i) outputs.',
      'Rebuild world positions from depth with the inverse view-projection matrix.',
      'Point lights need a radius with a smooth window so that each light touches a limited area.',
      'Costs: G-buffer memory and bandwidth, no MSAA or transparency in the G-buffer; tiled or clustered lists cut the light loop.'
    ]
  },

  // ------------------------------------------------------------------ 6
  {
    slug: 'post-processing',
    title: 'HDR, tone mapping and post-processing',
    summary: 'Render light as it is, brighter than white, into a 16-bit float image, then map it to the screen in a post-processing pass. Compare clamping, Reinhard and ACES on a chart of known brightnesses, on the GPU and the CPU, and set the exposure automatically.',
    minutes: 22,
    blocks: [
      { type: 'p', text: 'Physically based lighting produces physically scaled numbers. A sunlit white wall can reach a value of 3, a window seen from inside 20, a lamp 100; a room corner might be 0.02. The swapchain stores 0 to 1, so until now everything above 1 was simply cut off: the sunlit wall and the window became the same flat white, and all detail in bright areas was lost.' },
      { type: 'p', text: 'The fix splits the frame in two, like a camera that records a raw image and develops it afterwards:' },
      { type: 'ol', items: [
        '**Render in HDR.** Draw the scene into an off-screen image with a floating-point format, `R16G16B16A16Sfloat`, which holds values up to 65,504 with about three significant digits at every scale.',
        '**Tone-map.** A fullscreen **post-processing** pass reads that image and maps each value into 0 to 1 with a curve that compresses highlights smoothly instead of clipping them, after scaling by an **exposure**.'
      ] },
      { type: 'h2', text: 'Tone-mapping curves' },
      { type: 'table', head: ['Operator', 'Formula (x = exposure × value)', 'Character'], rows: [
        ['Clamp', 'min(x, 1)', 'Everything above 1 is lost'],
        ['**Reinhard**', 'x / (1 + x)', 'Never clips, but compresses everything: midtones look flat and greyish'],
        ['**ACES** (Narkowicz’s fit)', 'x(2.51x + 0.03) / (x(2.43x + 0.59) + 0.14)', 'Film-like: a toe in the shadows, contrast in the midtones, a soft shoulder; the usual default']
      ] },
      { type: 'widget', name: 'tone-curves' },
      { type: 'p', text: 'Tone mapping happens in linear light, before the sRGB conversion, which the sRGB swapchain still does when the pass writes its output. The curves are applied to each colour channel separately here; that is simple and common, though it shifts the hue of very bright saturated colours towards white.' },
      { type: 'code', title: 'Engine/ToneMapping.cs', code: cs`
using System.Runtime.InteropServices;
using Silk.NET.Vulkan;

/// <summary>Exposure and operator for the tone-mapping pass: 8 bytes of push constants.</summary>
[StructLayout(LayoutKind.Sequential)]
struct ToneMapPush(float exposure, ToneMapping.Operator op)
{
    public float Exposure = exposure;
    public int Operator = (int)op;
    public const uint Size = 8;
    public static readonly PushConstantRange Range = new(ShaderStageFlags.FragmentBit, 0, Size);
}

static class ToneMapping
{
    public enum Operator { Clamp, Reinhard, Aces }

    /// <summary>One channel, exactly as the shader computes it.</summary>
    public static float Apply(float value, Operator op, float exposure)
    {
        float x = value * exposure;
        return op switch
        {
            Operator.Clamp => Math.Clamp(x, 0f, 1f),
            Operator.Reinhard => x / (1f + x),
            _ => Math.Clamp(x * (2.51f * x + 0.03f) / (x * (2.43f * x + 0.59f) + 0.14f), 0f, 1f)
        };
    }

    /// <summary>The post-processing pass: read the HDR image, expose, tone-map. Use with DeferredShaders.Fullscreen.</summary>
    public const string Fragment = """
        #version 450

        layout(location = 0) in vec2 vUv;
        layout(location = 0) out vec4 outColor;
        layout(set = 0, binding = 0) uniform sampler2D hdr;
        layout(push_constant) uniform Push { float exposure; int op; } push;

        void main()
        {
            vec3 x = texture(hdr, vUv).rgb * push.exposure;
            vec3 mapped = push.op == 0 ? clamp(x, 0.0, 1.0)
                        : push.op == 1 ? x / (1.0 + x)
                        : clamp(x * (2.51 * x + 0.03) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
            outColor = vec4(mapped, 1.0);                                   // linear; the sRGB swapchain encodes it
        }
        """;

    /// <summary>A surface that gives off light: colour × material.x, unlit. For test charts and light fixtures. Use with LitShaders.Vertex.</summary>
    public const string Emissive = """
        #version 450

        layout(location = 0) out vec4 outColor;
        layout(push_constant) uniform Push { mat4 model; vec4 color; vec4 material; } push;

        void main() { outColor = vec4(push.color.rgb * push.material.x, 1.0); }
        """;
}` },
      { type: 'code', title: 'Engine/HdrTarget.cs', code: cs`
using Silk.NET.Vulkan;

/// <summary>An off-screen R16G16B16A16 float colour image to render into, and a set to sample it in a post-processing pass.</summary>
sealed unsafe class HdrTarget : IDisposable
{
    public const Format ImageFormat = Format.R16G16B16A16Sfloat;
    readonly GpuContext gpu;
    public readonly GpuImage Image;
    public readonly Sampler Sampler;
    public readonly ImageSet Set;

    public HdrTarget(GpuContext gpu, Extent2D extent)
    {
        this.gpu = gpu;
        Image = new GpuImage(gpu, extent, ImageFormat, ImageUsageFlags.ColorAttachmentBit | ImageUsageFlags.SampledBit, ImageAspectFlags.ColorBit);
        var info = new SamplerCreateInfo
        {
            SType = StructureType.SamplerCreateInfo, MagFilter = Filter.Nearest, MinFilter = Filter.Nearest,
            AddressModeU = SamplerAddressMode.ClampToEdge, AddressModeV = SamplerAddressMode.ClampToEdge, AddressModeW = SamplerAddressMode.ClampToEdge, MaxAnisotropy = 1
        };
        Sampler sampler;
        gpu.Vk.CreateSampler(gpu.Device, &info, null, &sampler).Check("CreateSampler");
        Sampler = sampler;
        Set = new ImageSet(gpu, (Image.View, Sampler));
    }

    public void Dispose()
    {
        Set.Dispose();
        gpu.Vk.DestroySampler(gpu.Device, Sampler, null);
        Image.Dispose();
    }
}` },
      { type: 'h2', text: 'A brightness chart' },
      { type: 'p', text: 'To test a tone mapper you need known input values, so the sample draws a chart rather than a lit scene: eight emissive grey patches whose values double from 0.125 to 16, rendered into the HDR image. A render graph runs the scene pass and the tone-mapping pass. For each operator the sample compares every patch’s pixel with `ToneMapping.Apply` and sRGB encoding on the CPU, and counts how many of the eight patches can still be told apart:' },
      { type: 'code', title: 'ToneMap.cs', code: cs`
using System.Numerics;
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
using var loop = new FrameLoop(gpu, window);
var extent = loop.Swapchain.Extent;
using var frameSet = new UniformSet<FrameUniforms>(gpu);
using var hdr = new HdrTarget(gpu, extent);
using var emissive = new MeshPipeline(gpu, HdrTarget.ImageFormat, LitShaders.Vertex, ToneMapping.Emissive,
    setLayouts: [frameSet.Layout], pushConstants: [LitPush.Range], depthFormat: FrameLoop.DepthFormat, vertexLayout: MeshVertex.Layout);
using var toneMap = new MeshPipeline(gpu, loop.Swapchain.Format, DeferredShaders.Fullscreen, ToneMapping.Fragment,
    setLayouts: [hdr.Set.Layout], pushConstants: [ToneMapPush.Range], vertexLayout: VertexLayout.None);
var (vertices, indices) = Shapes.Box(new Vector3(-0.5f), new Vector3(0.5f));
using var box = new Mesh<MeshVertex>(gpu, vertices, indices);
using var capture = new ReadbackBuffer(gpu, extent);

var eye = new Vector3(0f, -12f, 0f);
var viewProjection = Camera.LookAt(eye, Vector3.Zero) * Camera.Perspective(45f, 800f / 600f, 1f, 30f);
frameSet.Write(new FrameUniforms { ViewProjection = viewProjection, CameraPosition = new(eye, 1f) });
var patches = Enumerable.Range(0, 8).Select(i => (Centre: new Vector3(i * 1.8f - 6.3f, 0f, 0f), Value: MathF.Pow(2f, i - 3))).ToArray();

(byte R, byte G, byte B)[] Render(ToneMapping.Operator op, float exposure)
{
    loop.Begin(out var frame);
    var graph = new RenderGraph();
    var image = graph.Import("hdr", hdr.Image.Handle, ImageAspectFlags.ColorBit);
    var depth = graph.Import("depth", loop.Depth.Handle, ImageAspectFlags.DepthBit, stage: PipelineStageFlags2.LateFragmentTestsBit, access: AccessFlags2.DepthStencilAttachmentWriteBit);
    var backbuffer = graph.Import("backbuffer", frame.Image, ImageAspectFlags.ColorBit, frame.Layout, frame.Stage, frame.Access);
    graph.AddPass("Scene (HDR)", [], [(image, ImageUse.ColorAttachment), (depth, ImageUse.DepthAttachment)], cmd =>
    {
        Attachments.BeginRendering(gpu.Vk, cmd, hdr.Image.View, loop.Depth.View, extent, new ClearColorValue(0f, 0f, 0f, 1f));
        gpu.Vk.CmdBindPipeline(cmd, PipelineBindPoint.Graphics, emissive.Handle);
        frameSet.Bind(cmd, emissive.Layout);
        foreach (var (centre, value) in patches)
        {
            var push = new LitPush(Scene.Place(centre - new Vector3(0.8f, 0.05f, 0.8f), centre + new Vector3(0.8f, 0.05f, 0.8f)), Vector4.One, new(value, 0f, 0f, 0f));
            unsafe { gpu.Vk.CmdPushConstants(cmd, emissive.Layout, LitPush.Range.StageFlags, 0, LitPush.Size, &push); }
            box.Draw(cmd);
        }
        gpu.Vk.CmdEndRendering(cmd);
    });
    graph.AddPass("Tone map", [(image, ImageUse.Sampled)], [(backbuffer, ImageUse.ColorAttachment)], cmd =>
    {
        Attachments.BeginRendering(gpu.Vk, cmd, frame.View, default, extent, loop.Background);
        gpu.Vk.CmdBindPipeline(cmd, PipelineBindPoint.Graphics, toneMap.Handle);
        hdr.Set.Bind(cmd, toneMap.Layout, 0);
        var push = new ToneMapPush(exposure, op);
        unsafe { gpu.Vk.CmdPushConstants(cmd, toneMap.Layout, ShaderStageFlags.FragmentBit, 0, ToneMapPush.Size, &push); }
        gpu.Vk.CmdDraw(cmd, 3, 1, 0, 0);
        gpu.Vk.CmdEndRendering(cmd);
    });
    graph.Output(backbuffer);
    graph.Compile();
    graph.Execute(gpu.Vk, frame.Cmd);
    (frame.Layout, frame.Stage, frame.Access) = (backbuffer.Layout, backbuffer.Stage, backbuffer.Access);
    loop.End(frame, capture);
    loop.WaitIdle();
    return patches.Select(p => { var s = Camera.Project(p.Centre - new Vector3(0f, 0.05f, 0f), viewProjection, extent); return capture.Pixel((int)s.X, (int)s.Y); }).ToArray();
}

Console.WriteLine("Value     " + string.Join("", patches.Select(p => $"{p.Value,8}")));
foreach (var (op, exposure) in new[] { (ToneMapping.Operator.Clamp, 1f), (ToneMapping.Operator.Reinhard, 1f), (ToneMapping.Operator.Aces, 1f), (ToneMapping.Operator.Aces, 0.25f) })
{
    var gpuValues = Render(op, exposure).Select(c => c.G).ToArray();
    var cpuValues = patches.Select(p => Lighting.ToSrgb(ToneMapping.Apply(p.Value, op, exposure))).ToArray();
    Console.WriteLine($"{op + " x" + exposure,-10}" + string.Join("", gpuValues.Select(v => $"{v,8}")) +
                      $"   largest difference from CPU: {gpuValues.Zip(cpuValues).Max(p => Math.Abs(p.First - p.Second))}, distinct: {gpuValues.Distinct().Count()}");
}`, output: 'Value        0.125    0.25     0.5       1       2       4       8      16\nClamp x1        99     137     187     255     255     255     255     255   largest difference from CPU: 1, distinct: 4\nReinhard x1      94     123     156     187     213     231     242     248   largest difference from CPU: 1, distinct: 8\nAces x1        115     165     206     232     245     252     255     255   largest difference from CPU: 0, distinct: 7\nAces x0.25      40      71     115     165     206     232     245     252   largest difference from CPU: 0, distinct: 8' },
      { type: 'p', text: 'Clamping shows the problem plainly: the five patches from 1 to 16 all become 255, so a lamp sixteen times brighter than a white wall looks the same, and only 4 of the 8 patches can be told apart. Reinhard keeps all 8 apart but squeezes them: the brightest four span only 213 to 248, and the midtones are dull. ACES gives the darker patches more contrast and rolls the brightest off to white, with 7 distinct values; lowering the exposure to 0.25 shifts the curve so that all 8 are distinct, at the price of a darker image. The GPU agrees with the CPU everywhere to within one step; the one-step cases are values of exactly 0.5, which encode to sRGB 187.5, and the GPU rounds down where the CPU rounds up.' },
      { type: 'h2', text: 'Exposure, and the rest of post-processing' },
      { type: 'p', text: 'A fixed exposure suits one scene. Walking from a dark corridor into a sunlit atrium, the eye adapts, and so should the viewer. **Automatic exposure** measures the frame’s average brightness, usually the average of log luminance (so a few very bright pixels do not dominate), and sets the exposure to bring it to a mid grey of about 0.18. On the GPU this is a compute pass that reduces the HDR image to one number (module 7), with the exposure changing gradually over a second or so.' },
      { type: 'p', text: 'The same pass structure hosts the other post-processing effects. Each is a fullscreen pass that reads the previous image:' },
      { type: 'ul', items: [
        '**Bloom:** blur the parts above a threshold and add them back, so bright lights glow. It works best on the HDR image, before tone mapping.',
        '**Anti-aliasing:** FXAA smooths edges in the final image cheaply; TAA blends with previous frames and is the standard in games, at the cost of some blur.',
        '**Colour grading:** a 3D lookup table that maps colours for a look, after tone mapping.',
        '**Outlines and selection highlights** for a BIM viewer, which module 9 builds from the depth and an ID buffer.'
      ] },
      { type: 'note', kind: 'tip', text: 'Keep the HDR image at 16-bit float. `B10G11R11UfloatPack32` uses half the memory and suits many games, but it has no sign bit, and its 5- and 6-bit mantissas produce visible banding in the smooth gradients of large flat walls and ceilings, which BIM models are full of.' },
      { type: 'quiz', question: 'Why is the scene rendered into a floating-point image instead of directly into the sRGB swapchain?', options: ['Float images are faster', 'Lit values can exceed 1; an 8-bit 0..1 image clips them before a tone-mapping curve can compress them', 'The swapchain cannot be a colour attachment', 'To enable MSAA'], answer: 1, explain: 'Tone mapping needs the real values. Writing to the swapchain first clips everything above 1 to white, and that information cannot be recovered.' },
      { type: 'quiz', question: 'Why does automatic exposure average the logarithm of luminance rather than luminance itself?', options: ['It is faster', 'So that a few extremely bright pixels (a lamp, the sun) do not dominate the average and darken the whole image', 'Logarithms are required by Vulkan', 'To avoid negative values'], answer: 1, explain: 'The log average is the geometric mean: it behaves like perceived brightness. An arithmetic mean would be pulled up strongly by small bright areas.' },
      { type: 'exercise', task: 'Compute an automatic exposure for the chart. Treat it as an image where each of the eight patches covers the same area, take the log average of their values, and set the exposure so that the average maps to 0.18. Then print each patch after ACES with that exposure, as sRGB bytes.', hint: 'The log average is exp(mean(log(value))). The exposure is 0.18 / logAverage. Use `ToneMapping.Apply` with `Operator.Aces` and `Lighting.ToSrgb`.', solution: cs`
float[] values = Enumerable.Range(0, 8).Select(i => MathF.Pow(2f, i - 3)).ToArray();
float logAverage = MathF.Exp(values.Average(v => MathF.Log(v)));
float exposure = 0.18f / logAverage;
Console.WriteLine($"Log average {logAverage:F3}, arithmetic average {values.Average():F3}, exposure {exposure:F3}");
Console.WriteLine("ACES: " + string.Join(" ", values.Select(v => Lighting.ToSrgb(ToneMapping.Apply(v, ToneMapping.Operator.Aces, exposure)))));`, output: 'Log average 1.414, arithmetic average 3.984, exposure 0.127\nACES: 21 40 72 116 166 207 232 245' }
    ],
    keyPoints: [
      'Render lit scenes into a 16-bit float (HDR) image: physically scaled light exceeds 1.',
      'A fullscreen post-processing pass exposes and tone-maps the HDR image into 0..1 before sRGB encoding.',
      'Clamping loses highlights; Reinhard never clips but flattens; ACES gives film-like contrast with a soft shoulder.',
      'Automatic exposure maps the log-average luminance to mid grey (about 0.18), adapting gradually.',
      'Bloom, anti-aliasing, colour grading and outlines are more fullscreen passes in the same chain.',
      'A render graph schedules the passes and their barriers.'
    ]
  },
];
