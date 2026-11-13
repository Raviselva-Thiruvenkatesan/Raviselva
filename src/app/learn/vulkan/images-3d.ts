import { Lesson } from '../learn.types';
import { cs } from '../csharp/cs';

/**
 * Vulkan module 4. Every C# sample was run with Silk.NET 2.23 on an Intel Iris Xe (Vulkan 1.4 driver) on Windows 11;
 * the outputs are from that machine. Code blocks titled Engine/*.cs extend the engine from modules 2 and 3: each sample uses
 * the latest version of every Engine file shown before it.
 */
export const IMAGES_3D: Lesson[] = [
  // ------------------------------------------------------------------ 1
  {
    slug: 'camera-transforms',
    title: 'Model, view and projection matrices for Vulkan',
    summary: 'Turn 3D world coordinates into pixels with three 4 × 4 matrices. Learn Vulkan’s conventions (Y down, depth from 0 to 1), how System.Numerics matrices reach GLSL, and check the GPU against the same maths on the CPU.',
    minutes: 22,
    blocks: [
      { type: 'p', text: 'So far every position has been in **normalised device coordinates** (NDC): x and y from −1 to 1 across the window. A building is described in metres, in a world with its own origin. Getting from one to the other is the vertex shader’s main job, and it is done with three matrices.' },
      { type: 'table', head: ['Matrix', 'From', 'To', 'In a BIM viewer'], rows: [
        ['**Model**', 'Object space: the element’s own coordinates', 'World space', 'Places a door family instance in the building'],
        ['**View**', 'World space', 'View space: the camera at the origin, looking down −Z', 'Where the user is standing and looking'],
        ['**Projection**', 'View space', 'Clip space; dividing by w then gives NDC', 'Field of view, near and far planes']
      ] },
      { type: 'p', text: 'After the vertex shader, the GPU does two fixed steps. The **perspective divide** divides x, y and z by w, so distant points move towards the centre. The **viewport transform** maps NDC to pixels: x from −1 to 1 becomes 0 to 800, y from −1 to 1 becomes 0 to 600, and z is kept as the **depth**. Follow one point through every stage:' },
      { type: 'widget', name: 'mvp-pipeline' },
      { type: 'h2', text: 'Vulkan’s conventions' },
      { type: 'p', text: 'Matrix code written for OpenGL produces a mirrored or broken image in Vulkan, because the two APIs define clip space differently:' },
      { type: 'table', head: ['', 'OpenGL', 'Vulkan', 'What to do'], rows: [
        ['NDC y', 'Up', '**Down** (y = −1 is the top of the window)', 'Negate the projection’s y scale'],
        ['NDC depth', '−1 to 1', '**0 to 1**', 'Use a projection built for 0 to 1; `Matrix4x4.CreatePerspectiveFieldOfView` already is'],
        ['Handedness', 'Right-handed view space, looking down −Z', 'Whatever your matrices say', 'Keep the usual right-handed convention']
      ] },
      { type: 'p', text: 'BIM models are **Z-up**: floors are horizontal in x and y, and storeys stack up in z. The view matrix takes the world’s up direction as a parameter, so a Z-up world needs nothing more than passing `Vector3.UnitZ`. The engine’s `Camera` class puts these rules in one place, together with a CPU copy of what the GPU does to a point, so the samples can check the GPU’s pixels:' },
      { type: 'code', title: 'Engine/Camera.cs', code: cs`
using System.Numerics;
using Silk.NET.Vulkan;

/// <summary>Matrices for Vulkan's conventions, and a CPU copy of what the GPU does to a point.</summary>
static class Camera
{
    /// <summary>A view matrix: the camera at eye, looking at target. The world is Z-up, as BIM models are.</summary>
    public static Matrix4x4 LookAt(Vector3 eye, Vector3 target) => Matrix4x4.CreateLookAt(eye, target, Vector3.UnitZ);

    /// <summary>A perspective projection with depth 0 at the near plane and 1 at the far plane, and y flipped for Vulkan.</summary>
    public static Matrix4x4 Perspective(float fovYDegrees, float aspect, float near, float far)
    {
        var p = Matrix4x4.CreatePerspectiveFieldOfView(fovYDegrees * MathF.PI / 180f, aspect, near, far);
        p.M22 = -p.M22;                                 // Vulkan's NDC y points down
        return p;
    }

    /// <summary>Where a point lands: pixel coordinates and depth, computed as the GPU computes them.</summary>
    public static (float X, float Y, float Depth) Project(Vector3 point, Matrix4x4 modelViewProjection, Extent2D screen)
    {
        var clip = Vector4.Transform(new Vector4(point, 1f), modelViewProjection);       // the vertex shader
        var ndc = new Vector3(clip.X, clip.Y, clip.Z) / clip.W;                          // the perspective divide
        return ((ndc.X + 1f) / 2f * screen.Width, (ndc.Y + 1f) / 2f * screen.Height, ndc.Z);   // the viewport transform
    }

    /// <summary>Records a matrix as the vertex shader's push constant: the first 64 bytes.</summary>
    public static unsafe void Push(GpuContext gpu, CommandBuffer cmd, PipelineLayout layout, Matrix4x4 matrix) =>
        gpu.Vk.CmdPushConstants(cmd, layout, ShaderStageFlags.VertexBit, 0, 64, &matrix);
}` },
      { type: 'h2', text: 'Matrix order in C# and in GLSL' },
      { type: 'p', text: 'There is one more trap. `System.Numerics` treats a point as a **row** vector multiplied on the left (`v × M`), so transforms combine left to right: `model * view * projection` applies the model matrix first. GLSL treats it as a **column** vector multiplied on the right (`M × v`), and stores matrices column by column. The two differences cancel: the 64 bytes of a C# `Matrix4x4`, read by GLSL as a `mat4`, are exactly the matrix GLSL needs. Upload the C# matrix as it is and write `mvp * vec4(position, 1.0)` in the shader. Do not transpose it.' },
      { type: 'p', text: 'One `mat4` is 64 bytes, well inside the 128 bytes of push constants every GPU guarantees, so the combined matrix goes in a push constant. `Camera.Push` above records it with `CmdPushConstants`. It takes the matrix as a parameter because C# does not let a lambda (such as a `TestFrame` callback) take the address of a local variable it captures.' },
      { type: 'code', title: 'Engine/CameraShaders.cs', code: cs`
static class CameraShaders
{
    /// <summary>Transforms each vertex by one model-view-projection matrix from a push constant.</summary>
    public const string Vertex = """
        #version 450

        layout(location = 0) in vec3 inPosition;
        layout(location = 1) in vec3 inColor;
        layout(location = 0) out vec3 vColor;

        layout(push_constant) uniform Push { mat4 mvp; } push;

        void main()
        {
            gl_Position = push.mvp * vec4(inPosition, 1.0);
            vColor = inColor;
        }
        """;
}` },
      { type: 'h2', text: 'A floor slab in perspective' },
      { type: 'p', text: 'The sample draws a 4 m × 4 m floor slab at z = 0, seen from 8 m in front of it and 5 m up. It projects the slab’s corners on the CPU, then checks the GPU agrees: a point just inside each corner must be covered, and a point just outside must be background.' },
      { type: 'code', title: 'Projection.cs', code: cs`
using System.Numerics;
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
using var swapchain = new Swapchain(gpu, window.FramebufferSize);
using var readback = new ReadbackBuffer(gpu, swapchain.Extent);
var push = new PushConstantRange(ShaderStageFlags.VertexBit, 0, 64);
using var pipeline = new MeshPipeline(gpu, swapchain.Format, CameraShaders.Vertex, MeshShaders.Fragment, pushConstants: [push]);

// A 4 m x 4 m slab at z = 0, a different colour at each corner
using var slab = new Mesh(gpu,
[
    new(-2f, -2f, 0f, 1f, 0f, 0f), new(2f, -2f, 0f, 0f, 1f, 0f),
    new(2f, 2f, 0f, 0f, 0f, 1f), new(-2f, 2f, 0f, 1f, 1f, 1f)
], [0, 1, 2, 0, 2, 3]);

var model = Matrix4x4.Identity;
var view = Camera.LookAt(eye: new Vector3(0f, -8f, 5f), target: Vector3.Zero);
var projection = Camera.Perspective(60f, swapchain.Extent.Width / (float)swapchain.Extent.Height, 0.1f, 100f);
var mvp = model * view * projection;                    // C# order: the model matrix applies first

TestFrame.Draw(gpu, swapchain, readback, cmd =>
{
    gpu.Vk.CmdBindPipeline(cmd, PipelineBindPoint.Graphics, pipeline.Handle);
    Camera.Push(gpu, cmd, pipeline.Layout, mvp);        // CmdPushConstants with the matrix's 64 bytes
    slab.Draw(cmd);
});

foreach (var (x, y) in new[] { (-2f, -2f), (2f, -2f), (2f, 2f), (-2f, 2f) })
{
    var corner = Camera.Project(new Vector3(x, y, 0f), mvp, swapchain.Extent);
    var inside = Camera.Project(new Vector3(x * 0.95f, y * 0.95f, 0f), mvp, swapchain.Extent);
    var outside = Camera.Project(new Vector3(x * 1.05f, y * 1.05f, 0f), mvp, swapchain.Extent);
    Console.WriteLine($"({x,2}, {y,2}, 0) -> pixel ({corner.X,5:F1}, {corner.Y,5:F1}), depth {corner.Depth:F4}" +
                      $"   inside {readback.Pixel((int)inside.X, (int)inside.Y)}, outside {readback.Pixel((int)outside.X, (int)outside.Y)}");
}`, output: '(-2, -2, 0) -> pixel (265.7, 371.2), depth 0.9881   inside (252, 12, 46), outside (0, 0, 0)\n( 2, -2, 0) -> pixel (534.3, 371.2), depth 0.9881   inside (42, 249, 46), outside (0, 0, 0)\n( 2,  2, 0) -> pixel (493.4, 250.5), depth 0.9920   inside (43, 2, 252), outside (0, 0, 0)\n(-2,  2, 0) -> pixel (306.6, 250.5), depth 0.9920   inside (252, 250, 252), outside (0, 0, 0)' },
      { type: 'p', text: 'The near edge of the slab (y = −2) spans more pixels than the far edge, though both are 4 m long: that is perspective, produced entirely by the divide by w. The depths are close to 1 even though the slab is only 8 to 11 m away, with the far plane at 100 m. The next lesson explains why depth is spread so unevenly and what that means for a large model.' },
      { type: 'note', kind: 'warn', text: 'If a model appears upside down, or vanishes as soon as you add depth testing, check the two Vulkan conventions first: the flipped y scale and the 0-to-1 depth range. Matrices from an OpenGL tutorial or library break both.' },
      { type: 'quiz', question: 'In C#, which product gives the matrix that applies the model matrix first, then the view, then the projection?', options: ['projection * view * model', 'model * view * projection', 'view * model * projection', 'It does not matter'], answer: 1, explain: 'System.Numerics multiplies a row vector on the left (v × M), so the leftmost matrix applies first. In GLSL’s column-vector notation the same product is written P × V × M.' },
      { type: 'quiz', question: 'A point has clip coordinates (2, −1, 3, 4). Where is it in NDC?', options: ['(2, −1, 3)', '(0.5, −0.25, 0.75)', '(8, −4, 12)', '(0.5, 0.25, 0.75)'], answer: 1, explain: 'Divide x, y and z by w = 4. y = −0.25 is a little above the window centre in Vulkan, because NDC y points down. The depth is 0.75.' },
      { type: 'exercise', task: 'Replace the perspective projection with an **orthographic** one, 12 m tall, and print the pixel length of the slab’s near edge (y = −2) and far edge (y = 2) for both projections. In an orthographic view they should be equal.', hint: '`Matrix4x4.CreateOrthographic(width, height, near, far)` also maps depth to 0 to 1; negate `M22` for Vulkan as `Camera.Perspective` does. Project the two ends of each edge with `Camera.Project` and subtract the x values. No drawing is needed.', solution: cs`
using System.Numerics;
using Silk.NET.Vulkan;

var screen = new Extent2D(800, 600);
float aspect = 800f / 600f;
var view = Camera.LookAt(new Vector3(0f, -8f, 5f), Vector3.Zero);
var orthographic = Matrix4x4.CreateOrthographic(12f * aspect, 12f, 0.1f, 100f);
orthographic.M22 = -orthographic.M22;

foreach (var (name, projection) in new[] { ("Perspective", Camera.Perspective(60f, aspect, 0.1f, 100f)), ("Orthographic", orthographic) })
{
    var mvp = view * projection;
    float Edge(float y) => Camera.Project(new Vector3(2f, y, 0f), mvp, screen).X - Camera.Project(new Vector3(-2f, y, 0f), mvp, screen).X;
    Console.WriteLine($"{name,-13} near edge {Edge(-2f),5:F1} px, far edge {Edge(2f),5:F1} px");
}`, output: 'Perspective   near edge 268.6 px, far edge 186.7 px\nOrthographic  near edge 200.0 px, far edge 200.0 px' }
    ],
    keyPoints: [
      'Model, view and projection matrices take a point from object space to world, view and clip space.',
      'The GPU then divides by w (perspective) and maps NDC to pixels (viewport), keeping z as depth.',
      'Vulkan’s NDC y points down and its depth runs from 0 to 1: negate the projection’s y scale.',
      'BIM worlds are Z-up: pass Vector3.UnitZ as the up direction of the view matrix.',
      'In C# write model * view * projection; upload the Matrix4x4 as it is and write mvp * v in GLSL.',
      'A 64-byte matrix fits in a push constant.'
    ]
  },

  // ------------------------------------------------------------------ 2
  {
    slug: 'depth-buffer',
    title: 'The depth buffer',
    summary: 'Draw a solid cube and watch hidden faces show through. Create a depth image, add it to rendering and to the pipeline, and see why depth precision matters for large models.',
    minutes: 22,
    blocks: [
      { type: 'p', text: 'Draw a cube with the camera from the last lesson. Each face has its own colour, and the faces are stored in an order an exporter might produce: the three that face the camera first, then the three at the back. Read the pixels at the centres of the three visible faces:' },
      { type: 'code', title: 'NoDepth.cs', code: cs`
using System.Numerics;
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
using var swapchain = new Swapchain(gpu, window.FramebufferSize);
using var readback = new ReadbackBuffer(gpu, swapchain.Extent);
var push = new PushConstantRange(ShaderStageFlags.VertexBit, 0, 64);
using var pipeline = new MeshPipeline(gpu, swapchain.Format, CameraShaders.Vertex, MeshShaders.Fragment, pushConstants: [push]);

// A 2 m cube centred on the origin. Front faces (-Y blue, +X red, +Z white) first, back faces after.
(Vector3 Normal, Vector3 Color)[] faces =
[
    (-Vector3.UnitY, new(0, 0, 1)), (Vector3.UnitX, new(1, 0, 0)), (Vector3.UnitZ, new(1, 1, 1)),
    (Vector3.UnitY, new(0, 1, 0)), (-Vector3.UnitX, new(0, 1, 1)), (-Vector3.UnitZ, new(1, 1, 0))
];
var vertices = new List<Vertex>();
var indices = new List<uint>();
foreach (var (n, color) in faces)
{
    // Two axes across the face, so its corners are n + a*u + b*v
    var u = MathF.Abs(n.Z) > 0 ? Vector3.UnitX : Vector3.UnitZ;
    var v = Vector3.Cross(n, u);
    uint first = (uint)vertices.Count;
    foreach (var (a, b) in new[] { (-1, -1), (1, -1), (1, 1), (-1, 1) })
        vertices.Add(new Vertex(n + a * u + b * v, color));
    indices.AddRange([first, first + 1, first + 2, first, first + 2, first + 3]);
}
using var cube = new Mesh(gpu, vertices.ToArray(), indices.ToArray());

var mvp = Camera.LookAt(new Vector3(4f, -6f, 3f), Vector3.Zero) * Camera.Perspective(45f, 800f / 600f, 0.1f, 100f);
TestFrame.Draw(gpu, swapchain, readback, cmd =>
{
    gpu.Vk.CmdBindPipeline(cmd, PipelineBindPoint.Graphics, pipeline.Handle);
    Camera.Push(gpu, cmd, pipeline.Layout, mvp);
    cube.Draw(cmd);
});
foreach (var (name, centre) in new[] { ("front (-Y, blue)", -Vector3.UnitY), ("right (+X, red)", Vector3.UnitX), ("top (+Z, white)", Vector3.UnitZ) })
{
    var p = Camera.Project(centre, mvp, swapchain.Extent);
    Console.WriteLine($"{name,-17} at ({p.X:F0}, {p.Y:F0}): {readback.Pixel((int)p.X, (int)p.Y)}");
}`, output: 'front (-Y, blue)  at (343, 333): (0, 255, 255)\nright (+X, red)   at (483, 321): (0, 255, 0)\ntop (+Z, white)   at (400, 210): (0, 255, 0)' },
      { type: 'p', text: 'Every visible face shows the colour of the face behind it. Without help, the GPU simply paints triangles in the order it receives them, and the last one to cover a pixel wins. The back faces came last, so they win everywhere.' },
      { type: 'h2', text: 'The depth test' },
      { type: 'p', text: 'The fix is a **depth buffer**: an image the size of the window holding, for each pixel, the depth of the nearest surface drawn so far. Before writing a fragment, the GPU compares its depth with the stored one. If it is nearer, the colour is written and the depth updated; otherwise the fragment is thrown away. The drawing order stops mattering.' },
      { type: 'p', text: 'A depth buffer needs a **depth format**. Vulkan guarantees that one of `D32Sfloat` and `D24UnormS8Uint` works; the `S8` formats add 8 bits of **stencil**, used later for outlines and section caps. Ask the driver what it supports for optimal tiling:' },
      { type: 'code', title: 'DepthFormats.cs', code: cs`
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);

foreach (var format in new[] { Format.D32Sfloat, Format.D32SfloatS8Uint, Format.D24UnormS8Uint, Format.D16Unorm })
{
    var props = gpu.Vk.GetPhysicalDeviceFormatProperties(gpu.PhysicalDevice, format);
    bool ok = (props.OptimalTilingFeatures & FormatFeatureFlags.DepthStencilAttachmentBit) != 0;
    Console.WriteLine($"{format,-16} {(ok ? "supported" : "not supported")}");
}`, output: 'D32Sfloat        supported\nD32SfloatS8Uint  supported\nD24UnormS8Uint   supported\nD16Unorm         supported' },
      { type: 'h2', text: 'Images and their memory' },
      { type: 'p', text: 'A depth buffer is an `Image`, created and bound to memory in the same three steps as a buffer: create it, ask for its memory requirements, allocate and bind. An image also needs an **image view** saying which part of it to use and how (here: the depth **aspect**). The engine’s `GpuImage` class does all of that. It takes a mip level count and a sample count as well, which lessons 5 and 6 use, and it records layout transitions with a barrier over any range of mip levels:' },
      { type: 'code', title: 'Engine/GpuImage.cs', code: cs`
using Silk.NET.Vulkan;

/// <summary>A 2D image with its own device-local memory and a view of all its mip levels.</summary>
sealed unsafe class GpuImage : IDisposable
{
    readonly GpuContext gpu;
    public readonly Image Handle;
    public readonly DeviceMemory Memory;
    public readonly ImageView View;
    public readonly Format Format;
    public readonly Extent2D Extent;
    public readonly ImageAspectFlags Aspect;
    public readonly uint MipLevels;
    public readonly SampleCountFlags Samples;

    public GpuImage(GpuContext gpu, Extent2D extent, Format format, ImageUsageFlags usage, ImageAspectFlags aspect,
                    uint mipLevels = 1, SampleCountFlags samples = SampleCountFlags.Count1Bit)
    {
        this.gpu = gpu;
        (Extent, Format, Aspect, MipLevels, Samples) = (extent, format, aspect, mipLevels, samples);
        var vk = gpu.Vk;
        var info = new ImageCreateInfo
        {
            SType = StructureType.ImageCreateInfo, ImageType = ImageType.Type2D, Format = format,
            Extent = new Extent3D(extent.Width, extent.Height, 1), MipLevels = mipLevels, ArrayLayers = 1,
            Samples = samples, Tiling = ImageTiling.Optimal, Usage = usage,
            SharingMode = SharingMode.Exclusive, InitialLayout = ImageLayout.Undefined
        };
        Image image;
        vk.CreateImage(gpu.Device, &info, null, &image).Check("CreateImage");
        Handle = image;

        MemoryRequirements needs;
        vk.GetImageMemoryRequirements(gpu.Device, Handle, &needs);
        var alloc = new MemoryAllocateInfo
        {
            SType = StructureType.MemoryAllocateInfo, AllocationSize = needs.Size,
            MemoryTypeIndex = GpuBuffer.FindMemoryType(gpu, needs.MemoryTypeBits, MemoryPropertyFlags.DeviceLocalBit)
        };
        DeviceMemory memory;
        vk.AllocateMemory(gpu.Device, &alloc, null, &memory).Check("AllocateMemory");
        Memory = memory;
        vk.BindImageMemory(gpu.Device, Handle, Memory, 0).Check("BindImageMemory");

        var viewInfo = new ImageViewCreateInfo
        {
            SType = StructureType.ImageViewCreateInfo, Image = Handle, ViewType = ImageViewType.Type2D, Format = format,
            SubresourceRange = new ImageSubresourceRange(aspect, 0, mipLevels, 0, 1)
        };
        ImageView view;
        vk.CreateImageView(gpu.Device, &viewInfo, null, &view).Check("CreateImageView");
        View = view;
    }

    /// <summary>Records a layout change for some mip levels (all of them by default), ordering src work before dst work.</summary>
    public void Transition(CommandBuffer cmd, ImageLayout oldLayout, ImageLayout newLayout,
                           PipelineStageFlags2 srcStage, AccessFlags2 srcAccess, PipelineStageFlags2 dstStage, AccessFlags2 dstAccess,
                           uint baseMip = 0, uint mipCount = Vk.RemainingMipLevels)
    {
        var barrier = new ImageMemoryBarrier2
        {
            SType = StructureType.ImageMemoryBarrier2,
            SrcStageMask = srcStage, SrcAccessMask = srcAccess, DstStageMask = dstStage, DstAccessMask = dstAccess,
            OldLayout = oldLayout, NewLayout = newLayout,
            SrcQueueFamilyIndex = Vk.QueueFamilyIgnored, DstQueueFamilyIndex = Vk.QueueFamilyIgnored,
            Image = Handle, SubresourceRange = new ImageSubresourceRange(Aspect, baseMip, mipCount, 0, 1)
        };
        var dependency = new DependencyInfo { SType = StructureType.DependencyInfo, ImageMemoryBarrierCount = 1, PImageMemoryBarriers = &barrier };
        gpu.Vk.CmdPipelineBarrier2(cmd, &dependency);
    }

    public void Dispose()
    {
        gpu.Vk.DestroyImageView(gpu.Device, View, null);
        gpu.Vk.DestroyImage(gpu.Device, Handle, null);
        gpu.Vk.FreeMemory(gpu.Device, Memory, null);
    }
}` },
      { type: 'h2', text: 'Depth in the pipeline and in rendering' },
      { type: 'p', text: 'Two places change. The pipeline gets a **depth-stencil state** (test on, write on, compare with `Less`) and names the depth format in its rendering info. The engine’s `MeshPipeline` gains these as optional parameters, plus two more that the next lessons use: a vertex layout for meshes with different vertex data, and a sample count for multisampling.' },
      { type: 'code', title: 'Engine/MeshPipeline.cs', code: cs`
using Silk.NET.Core.Native;
using Silk.NET.Shaderc;
using Silk.NET.Vulkan;

/// <summary>How the vertex shader's inputs are laid out in a vertex buffer.</summary>
sealed record VertexLayout(VertexInputBindingDescription Binding, VertexInputAttributeDescription[] Attributes);

sealed unsafe class MeshPipeline : IDisposable
{
    readonly GpuContext gpu;
    public readonly PipelineLayout Layout;
    public readonly Pipeline Handle;

    public MeshPipeline(GpuContext gpu, Format colorFormat, string vertexGlsl, string fragmentGlsl,
                        DescriptorSetLayout[]? setLayouts = null, PushConstantRange[]? pushConstants = null,
                        CullModeFlags cull = CullModeFlags.None,
                        Format depthFormat = Format.Undefined,              // new: Undefined means no depth buffer
                        CompareOp depthCompare = CompareOp.Less,            // new: which fragments pass the depth test
                        VertexLayout? vertexLayout = null,                  // new: defaults to Vertex (lesson 3)
                        SampleCountFlags samples = SampleCountFlags.Count1Bit)  // new: multisampling (lesson 6)
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
            VertexBindingDescriptionCount = 1, PVertexBindingDescriptions = &binding,
            VertexAttributeDescriptionCount = (uint)vertexLayout.Attributes.Length, PVertexAttributeDescriptions = attributes
        };
        var inputAssembly = new PipelineInputAssemblyStateCreateInfo { SType = StructureType.PipelineInputAssemblyStateCreateInfo, Topology = PrimitiveTopology.TriangleList };
        var viewport = new PipelineViewportStateCreateInfo { SType = StructureType.PipelineViewportStateCreateInfo, ViewportCount = 1, ScissorCount = 1 };
        var raster = new PipelineRasterizationStateCreateInfo
        {
            SType = StructureType.PipelineRasterizationStateCreateInfo,
            PolygonMode = PolygonMode.Fill, CullMode = cull, FrontFace = FrontFace.Clockwise, LineWidth = 1f
        };
        var multisample = new PipelineMultisampleStateCreateInfo { SType = StructureType.PipelineMultisampleStateCreateInfo, RasterizationSamples = samples };
        var depthStencil = new PipelineDepthStencilStateCreateInfo
        {
            SType = StructureType.PipelineDepthStencilStateCreateInfo,
            DepthTestEnable = depthFormat != Format.Undefined,          // compare each fragment with the stored depth
            DepthWriteEnable = depthFormat != Format.Undefined,         // and store it if it passes
            DepthCompareOp = depthCompare
        };
        var blendAttachment = new PipelineColorBlendAttachmentState
        {
            ColorWriteMask = ColorComponentFlags.RBit | ColorComponentFlags.GBit | ColorComponentFlags.BBit | ColorComponentFlags.ABit
        };
        var blend = new PipelineColorBlendStateCreateInfo { SType = StructureType.PipelineColorBlendStateCreateInfo, AttachmentCount = 1, PAttachments = &blendAttachment };
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

        var rendering = new PipelineRenderingCreateInfo
        {
            SType = StructureType.PipelineRenderingCreateInfo, ColorAttachmentCount = 1, PColorAttachmentFormats = &colorFormat,
            DepthAttachmentFormat = depthFormat
        };
        var info = new GraphicsPipelineCreateInfo
        {
            SType = StructureType.GraphicsPipelineCreateInfo, PNext = &rendering,
            StageCount = 2, PStages = stages,
            PVertexInputState = &vertexInput, PInputAssemblyState = &inputAssembly,
            PViewportState = &viewport, PRasterizationState = &raster,
            PMultisampleState = &multisample, PDepthStencilState = &depthStencil, PColorBlendState = &blend,
            PDynamicState = &dynamic, Layout = Layout
        };
        Pipeline pipeline;
        vk.CreateGraphicsPipelines(gpu.Device, default, 1, &info, null, &pipeline).Check("CreateGraphicsPipelines");
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
      { type: 'p', text: 'In rendering, the depth image is a **depth attachment** beside the colour attachment. It is cleared to 1.0, the far plane, at the start of each frame, so the first surface drawn at any pixel always passes. Its contents are not needed after the frame, so its store operation is `DontCare`, which lets tiled GPUs skip writing it to memory at all. Before use, a barrier moves it to the `DepthAttachmentOptimal` layout. `TestFrame` takes the depth image as an optional parameter:' },
      { type: 'code', title: 'Engine/TestFrame.cs', code: cs`
using Silk.NET.Vulkan;

/// <summary>Draws one frame into a swapchain image, copies it into a ReadbackBuffer and presents it. For checking pixels.</summary>
static unsafe class TestFrame
{
    public static void Draw(GpuContext gpu, Swapchain swapchain, ReadbackBuffer readback, Action<CommandBuffer> draw,
                            ClearColorValue? background = null, GpuImage? depth = null)
    {
        var vk = gpu.Vk;
        var poolInfo = new CommandPoolCreateInfo { SType = StructureType.CommandPoolCreateInfo, Flags = CommandPoolCreateFlags.TransientBit, QueueFamilyIndex = gpu.GraphicsFamily };
        CommandPool pool;
        vk.CreateCommandPool(gpu.Device, &poolInfo, null, &pool).Check("CreateCommandPool");
        var allocInfo = new CommandBufferAllocateInfo { SType = StructureType.CommandBufferAllocateInfo, CommandPool = pool, Level = CommandBufferLevel.Primary, CommandBufferCount = 1 };
        CommandBuffer cmd;
        vk.AllocateCommandBuffers(gpu.Device, &allocInfo, &cmd).Check("AllocateCommandBuffers");
        var fenceInfo = new FenceCreateInfo { SType = StructureType.FenceCreateInfo };
        Fence fence;
        vk.CreateFence(gpu.Device, &fenceInfo, null, &fence).Check("CreateFence");

        uint index;
        gpu.KhrSwapchain.AcquireNextImage(gpu.Device, swapchain.Handle, ulong.MaxValue, default, fence, &index).Check("AcquireNextImage");
        vk.WaitForFences(gpu.Device, 1, &fence, true, ulong.MaxValue);
        vk.ResetFences(gpu.Device, 1, &fence);

        var image = swapchain.Images[index];
        var begin = new CommandBufferBeginInfo { SType = StructureType.CommandBufferBeginInfo, Flags = CommandBufferUsageFlags.OneTimeSubmitBit };
        vk.BeginCommandBuffer(cmd, &begin).Check("BeginCommandBuffer");
        Commands.Barrier(vk, cmd, image, ImageLayout.Undefined, ImageLayout.ColorAttachmentOptimal,
            PipelineStageFlags2.ColorAttachmentOutputBit, AccessFlags2.None, PipelineStageFlags2.ColorAttachmentOutputBit, AccessFlags2.ColorAttachmentWriteBit);
        var color = new RenderingAttachmentInfo
        {
            SType = StructureType.RenderingAttachmentInfo, ImageView = swapchain.Views[index], ImageLayout = ImageLayout.ColorAttachmentOptimal,
            LoadOp = AttachmentLoadOp.Clear, StoreOp = AttachmentStoreOp.Store, ClearValue = new ClearValue(background ?? new ClearColorValue(0f, 0f, 0f, 1f))
        };
        var rendering = new RenderingInfo { SType = StructureType.RenderingInfo, RenderArea = new Rect2D(new Offset2D(0, 0), swapchain.Extent), LayerCount = 1, ColorAttachmentCount = 1, PColorAttachments = &color };

        // New: the depth attachment, cleared to 1.0 (the far plane) and thrown away after the frame
        var depthStages = PipelineStageFlags2.EarlyFragmentTestsBit | PipelineStageFlags2.LateFragmentTestsBit;
        var depthAttachment = new RenderingAttachmentInfo { SType = StructureType.RenderingAttachmentInfo };
        if (depth != null)
        {
            depth.Transition(cmd, ImageLayout.Undefined, ImageLayout.DepthAttachmentOptimal,
                depthStages, AccessFlags2.DepthStencilAttachmentWriteBit,
                depthStages, AccessFlags2.DepthStencilAttachmentReadBit | AccessFlags2.DepthStencilAttachmentWriteBit);
            depthAttachment.ImageView = depth.View;
            depthAttachment.ImageLayout = ImageLayout.DepthAttachmentOptimal;
            depthAttachment.LoadOp = AttachmentLoadOp.Clear;
            depthAttachment.StoreOp = AttachmentStoreOp.DontCare;
            depthAttachment.ClearValue = new ClearValue(depthStencil: new ClearDepthStencilValue(1f, 0));
            rendering.PDepthAttachment = &depthAttachment;
        }

        vk.CmdBeginRendering(cmd, &rendering);
        var viewport = new Viewport(0, 0, swapchain.Extent.Width, swapchain.Extent.Height, 0, 1);
        vk.CmdSetViewport(cmd, 0, 1, &viewport);
        var scissor = new Rect2D(new Offset2D(0, 0), swapchain.Extent);
        vk.CmdSetScissor(cmd, 0, 1, &scissor);
        draw(cmd);
        vk.CmdEndRendering(cmd);
        Commands.Barrier(vk, cmd, image, ImageLayout.ColorAttachmentOptimal, ImageLayout.TransferSrcOptimal,
            PipelineStageFlags2.ColorAttachmentOutputBit, AccessFlags2.ColorAttachmentWriteBit, PipelineStageFlags2.CopyBit, AccessFlags2.TransferReadBit);
        readback.CopyFrom(cmd, image);
        Commands.Barrier(vk, cmd, image, ImageLayout.TransferSrcOptimal, ImageLayout.PresentSrcKhr,
            PipelineStageFlags2.CopyBit, AccessFlags2.None, PipelineStageFlags2.None, AccessFlags2.None);
        vk.EndCommandBuffer(cmd).Check("EndCommandBuffer");

        var cmdInfo = new CommandBufferSubmitInfo { SType = StructureType.CommandBufferSubmitInfo, CommandBuffer = cmd };
        var submit = new SubmitInfo2 { SType = StructureType.SubmitInfo2, CommandBufferInfoCount = 1, PCommandBufferInfos = &cmdInfo };
        vk.QueueSubmit2(gpu.GraphicsQueue, 1, &submit, fence).Check("QueueSubmit2");
        vk.WaitForFences(gpu.Device, 1, &fence, true, ulong.MaxValue);
        var handle = swapchain.Handle;
        var present = new PresentInfoKHR { SType = StructureType.PresentInfoKhr, SwapchainCount = 1, PSwapchains = &handle, PImageIndices = &index };
        gpu.KhrSwapchain.QueuePresent(gpu.PresentQueue, &present);
        vk.DeviceWaitIdle(gpu.Device);
        vk.DestroyFence(gpu.Device, fence, null);
        vk.DestroyCommandPool(gpu.Device, pool, null);
    }
}` },
      { type: 'p', text: 'The transition’s source stage is the fragment tests, not “nothing”, because the previous frame’s depth tests may still be running when this frame starts. The old layout is `Undefined`, which tells the driver the old contents can be thrown away; the clear overwrites them anyway.' },
      { type: 'h2', text: 'The cube, solid' },
      { type: 'p', text: 'Now draw the same cube, in the same order, with a depth buffer. The program also prints the depth of the front face’s centre and of the point behind it on the back face:' },
      { type: 'code', title: 'Depth.cs', code: cs`
using System.Numerics;
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
using var swapchain = new Swapchain(gpu, window.FramebufferSize);
using var readback = new ReadbackBuffer(gpu, swapchain.Extent);
using var depth = new GpuImage(gpu, swapchain.Extent, Format.D32Sfloat, ImageUsageFlags.DepthStencilAttachmentBit, ImageAspectFlags.DepthBit);
var push = new PushConstantRange(ShaderStageFlags.VertexBit, 0, 64);
using var pipeline = new MeshPipeline(gpu, swapchain.Format, CameraShaders.Vertex, MeshShaders.Fragment, pushConstants: [push],
                                      depthFormat: depth.Format);

(Vector3 Normal, Vector3 Color)[] faces =
[
    (-Vector3.UnitY, new(0, 0, 1)), (Vector3.UnitX, new(1, 0, 0)), (Vector3.UnitZ, new(1, 1, 1)),
    (Vector3.UnitY, new(0, 1, 0)), (-Vector3.UnitX, new(0, 1, 1)), (-Vector3.UnitZ, new(1, 1, 0))
];
var vertices = new List<Vertex>();
var indices = new List<uint>();
foreach (var (n, color) in faces)
{
    var u = MathF.Abs(n.Z) > 0 ? Vector3.UnitX : Vector3.UnitZ;
    var v = Vector3.Cross(n, u);
    uint first = (uint)vertices.Count;
    foreach (var (a, b) in new[] { (-1, -1), (1, -1), (1, 1), (-1, 1) })
        vertices.Add(new Vertex(n + a * u + b * v, color));
    indices.AddRange([first, first + 1, first + 2, first, first + 2, first + 3]);
}
using var cube = new Mesh(gpu, vertices.ToArray(), indices.ToArray());

var mvp = Camera.LookAt(new Vector3(4f, -6f, 3f), Vector3.Zero) * Camera.Perspective(45f, 800f / 600f, 0.1f, 100f);
TestFrame.Draw(gpu, swapchain, readback, cmd =>
{
    gpu.Vk.CmdBindPipeline(cmd, PipelineBindPoint.Graphics, pipeline.Handle);
    Camera.Push(gpu, cmd, pipeline.Layout, mvp);
    cube.Draw(cmd);
}, depth: depth);
foreach (var (name, centre) in new[] { ("front (-Y, blue)", -Vector3.UnitY), ("right (+X, red)", Vector3.UnitX), ("top (+Z, white)", Vector3.UnitZ) })
{
    var p = Camera.Project(centre, mvp, swapchain.Extent);
    Console.WriteLine($"{name,-17} at ({p.X:F0}, {p.Y:F0}): {readback.Pixel((int)p.X, (int)p.Y)}");
}
var front = Camera.Project(-Vector3.UnitY, mvp, swapchain.Extent);
var behind = Camera.Project(new Vector3(-1f, 0.25f, -0.75f), mvp, swapchain.Extent);    // on the -X face, along the same ray
Console.WriteLine($"Depth of the front face {front.Depth:F5}, of the back face behind it {behind.Depth:F5}");`, output: 'front (-Y, blue)  at (343, 333): (0, 0, 255)\nright (+X, red)   at (483, 321): (255, 0, 0)\ntop (+Z, white)   at (400, 210): (255, 255, 255)\nDepth of the front face 0.98679, of the back face behind it 0.98963' },
      { type: 'p', text: 'All three faces now show their own colours. Look at the depths, though. The cube is 6 to 9 m from the camera, with the far plane at 100 m, yet both depths are above 0.98, and the front and back of a 2 m cube differ only in the third decimal place.' },
      { type: 'h2', text: 'Depth precision' },
      { type: 'p', text: 'Perspective depth is proportional to 1/distance, not to distance. Most of the range from 0 to 1 is spent just beyond the near plane, and everything far away is squeezed close to 1. With 24-bit or 32-bit depth that runs out of distinct values for distant surfaces, and two nearly coplanar surfaces (a wall and its finish layer, a ceiling and a slab) flicker through each other. That is **z-fighting**, a constant problem in BIM viewers, where models are hundreds of metres long and users zoom in to millimetres. Move the near plane and see how much it matters:' },
      { type: 'widget', name: 'depth-precision' },
      { type: 'p', text: 'Two rules follow. Keep the near plane as far out as you can, since it matters far more than the far plane: lesson 7 sets it from the camera’s distance to the model. And on any GPU with `D32Sfloat`, use **reversed Z**: map the near plane to 1 and the far plane to 0, clear depth to 0, and compare with `Greater`. Floating-point numbers are densest near 0, which is exactly where reversed Z puts distant surfaces, and the two non-linear effects nearly cancel.' },
      { type: 'note', kind: 'info', text: 'Depth testing also saves work. Modern GPUs run the test **before** the fragment shader whenever the shader does not change the depth (early fragment tests), so hidden surfaces cost little more than their rasterisation. Drawing near objects first lets more fragments fail early.' },
      { type: 'quiz', question: 'What should a depth buffer be cleared to each frame, with a normal (not reversed) depth range and compare op Less?', options: ['0.0', '0.5', '1.0', 'It does not need clearing'], answer: 2, explain: '1.0 is the far plane. Anything drawn is nearer than that, so the first surface at each pixel always passes the test.' },
      { type: 'quiz', question: 'Two coplanar surfaces flicker in the distance (z-fighting). Which change helps most?', options: ['Move the far plane from 1,000 m to 500 m', 'Move the near plane from 0.01 m to 0.5 m', 'Use a larger window', 'Draw the surfaces in a different order'], answer: 1, explain: 'Precision depends mostly on the ratio far/near and above all on the near plane. Moving it out 50 times helps far more than halving the far plane. Reversed Z with a float depth buffer helps even more.' },
      { type: 'exercise', task: 'Compare normal and **reversed Z** on the CPU. For the front-face point and the back-face point behind it, print the depth under both projections, and the gap between that depth and the next larger `float`: the smallest depth step a `D32Sfloat` buffer can store there.', hint: 'Reversed depth is 1 − depth. Because clip z is divided by w, that means replacing clip z with w − z: multiply the projection by a matrix whose third column is (0, 0, −1, 1). For the gap, add 1 to the float’s bits: `BitConverter.Int32BitsToSingle(BitConverter.SingleToInt32Bits(x) + 1) - x`.', solution: cs`
using System.Numerics;
using Silk.NET.Vulkan;

var view = Camera.LookAt(new Vector3(4f, -6f, 3f), Vector3.Zero);
var screen = new Extent2D(800, 600);
var normal = view * Camera.Perspective(45f, 800f / 600f, 0.1f, 100f);
// Reversed Z: z' = w - z, so depth' = 1 - depth. As a matrix applied after the projection:
var flip = new Matrix4x4(1, 0, 0, 0,  0, 1, 0, 0,  0, 0, -1, 0,  0, 0, 1, 1);
var reversed = normal * flip;
foreach (var (name, point) in new[] { ("front face", -Vector3.UnitY), ("back face", new Vector3(-1f, 0.25f, -0.75f)) })
{
    float d = Camera.Project(point, normal, screen).Depth, r = Camera.Project(point, reversed, screen).Depth;
    // How far apart the nearest representable float values are at that depth
    float Gap(float x) => BitConverter.Int32BitsToSingle(BitConverter.SingleToInt32Bits(x) + 1) - x;
    Console.WriteLine($"{name}: normal depth {d:F6} (float step {Gap(d):E1}), reversed {r:F6} (float step {Gap(r):E1})");
}`, output: 'front face: normal depth 0.986786 (float step 6.0E-008), reversed 0.013214 (float step 9.3E-010)\nback face: normal depth 0.989629 (float step 6.0E-008), reversed 0.010371 (float step 9.3E-010)' }
    ],
    keyPoints: [
      'Without a depth buffer, the last triangle drawn at a pixel wins, whatever its distance.',
      'A depth image stores the nearest depth per pixel; the depth test discards fragments behind it.',
      'Images are created, given memory and bound like buffers, and accessed through image views.',
      'The pipeline enables the test in its depth-stencil state and names the depth format; rendering attaches the image.',
      'Clear depth to 1.0 (the far plane) and store DontCare: the depth is not needed after the frame.',
      'Perspective depth is non-linear: push the near plane out, and prefer reversed Z with D32Sfloat.'
    ]
  },
  // ------------------------------------------------------------------ 3
  {
    slug: 'textures-samplers',
    title: 'Textures, image layouts and samplers',
    summary: 'Upload pixels into an image, move it through the layouts a copy and a shader need, and read it in the fragment shader through a sampler. Compare nearest and linear filtering on the GPU, and see why sRGB matters.',
    minutes: 24,
    blocks: [
      { type: 'p', text: 'A **texture** is an image the shaders read: a brick pattern, a timber grain, a manufacturer’s logo. Reading one involves three objects: the **image** holding the pixels (called **texels** in a texture), an **image view**, and a **sampler** that says how to turn a texture coordinate into a colour. Texture coordinates, usually called **UV**, run from 0 to 1 across the image, with (0, 0) at the top-left texel in Vulkan.' },
      { type: 'h2', text: 'A vertex with texture coordinates' },
      { type: 'p', text: 'Every corner now needs a UV, and later lessons need a **normal** too: the direction the surface faces, for lighting. The engine’s second vertex type holds all three, 32 bytes, and describes itself with the `VertexLayout` that `MeshPipeline` accepts. `Mesh<T>` is the `Mesh` class from module 3, made generic over the vertex type:' },
      { type: 'code', title: 'Engine/MeshVertex.cs', code: cs`
using System.Numerics;
using System.Runtime.InteropServices;
using Silk.NET.Vulkan;

/// <summary>A corner of a model: position, normal and texture coordinate. 32 bytes.</summary>
[StructLayout(LayoutKind.Sequential)]
readonly struct MeshVertex(Vector3 position, Vector3 normal, Vector2 uv)
{
    public readonly Vector3 Position = position;    // location 0
    public readonly Vector3 Normal = normal;        // location 1
    public readonly Vector2 Uv = uv;                // location 2

    public static readonly VertexLayout Layout = new(
        new VertexInputBindingDescription(0, (uint)Marshal.SizeOf<MeshVertex>(), VertexInputRate.Vertex),
        [
            new(location: 0, binding: 0, format: Format.R32G32B32Sfloat, offset: (uint)Marshal.OffsetOf<MeshVertex>(nameof(Position))),
            new(location: 1, binding: 0, format: Format.R32G32B32Sfloat, offset: (uint)Marshal.OffsetOf<MeshVertex>(nameof(Normal))),
            new(location: 2, binding: 0, format: Format.R32G32Sfloat, offset: (uint)Marshal.OffsetOf<MeshVertex>(nameof(Uv)))
        ]);
}` },
      { type: 'code', title: 'Engine/Mesh.Generic.cs', code: cs`
using Silk.NET.Vulkan;

/// <summary>Vertex and index buffers in device-local memory for any vertex type.</summary>
sealed unsafe class Mesh<TVertex> : IDisposable where TVertex : unmanaged
{
    readonly GpuContext gpu;
    public readonly GpuBuffer Vertices, Indices;
    public readonly uint IndexCount;
    public readonly IndexType IndexType;

    public Mesh(GpuContext gpu, TVertex[] vertices, uint[] indices)
    {
        this.gpu = gpu;
        Vertices = Upload.ToDeviceLocal<TVertex>(gpu, vertices, BufferUsageFlags.VertexBufferBit);
        IndexCount = (uint)indices.Length;
        IndexType = vertices.Length <= 65536 ? IndexType.Uint16 : IndexType.Uint32;
        Indices = IndexType == IndexType.Uint16
            ? Upload.ToDeviceLocal<ushort>(gpu, Array.ConvertAll(indices, i => (ushort)i), BufferUsageFlags.IndexBufferBit)
            : Upload.ToDeviceLocal<uint>(gpu, indices, BufferUsageFlags.IndexBufferBit);
    }

    public void Draw(CommandBuffer cmd)
    {
        var vb = Vertices.Handle;
        ulong offset = 0;
        gpu.Vk.CmdBindVertexBuffers(cmd, 0, 1, &vb, &offset);
        gpu.Vk.CmdBindIndexBuffer(cmd, Indices.Handle, 0, IndexType);
        gpu.Vk.CmdDrawIndexed(cmd, IndexCount, 1, 0, 0, 0);
    }

    public void Dispose()
    {
        Vertices.Dispose();
        Indices.Dispose();
    }
}` },
      { type: 'p', text: 'The vertex shader passes the normal and UV on. There are two fragment shaders: one samples a texture, the other paints each surface by the direction it faces (a common debugging view, used in the next lessons). In GLSL a texture with its sampler is a `sampler2D`, and `texture(t, uv)` reads it:' },
      { type: 'code', title: 'Engine/ModelShaders.cs', code: cs`
static class ModelShaders
{
    public const string Vertex = """
        #version 450

        layout(location = 0) in vec3 inPosition;
        layout(location = 1) in vec3 inNormal;
        layout(location = 2) in vec2 inUv;
        layout(location = 0) out vec3 vNormal;
        layout(location = 1) out vec2 vUv;

        layout(push_constant) uniform Push { mat4 mvp; } push;

        void main()
        {
            gl_Position = push.mvp * vec4(inPosition, 1.0);
            vNormal = inNormal;         // world space while the model matrix has no rotation (module 6 handles rotation)
            vUv = inUv;
        }
        """;

    /// <summary>The colour of the texture bound at set 0, binding 0.</summary>
    public const string Textured = """
        #version 450

        layout(location = 1) in vec2 vUv;
        layout(location = 0) out vec4 outColor;
        layout(set = 0, binding = 0) uniform sampler2D albedo;

        void main()
        {
            outColor = texture(albedo, vUv);
        }
        """;

    /// <summary>The normal as a colour: x, y and z from -1..1 mapped to red, green and blue 0..1.</summary>
    public const string Normals = """
        #version 450

        layout(location = 0) in vec3 vNormal;
        layout(location = 0) out vec4 outColor;

        void main()
        {
            outColor = vec4(normalize(vNormal) * 0.5 + 0.5, 1.0);
        }
        """;
}` },
      { type: 'h2', text: 'Uploading an image: three layouts' },
      { type: 'p', text: 'Pixels reach an image the same way vertices reached device-local memory: through a staging buffer and a copy, this time `CmdCopyBufferToImage`. Images add one complication, the **layout** from module 2. A freshly created image is `Undefined`; a copy needs `TransferDstOptimal`; a shader read needs `ShaderReadOnlyOptimal`. Each change is a barrier, and each barrier also orders the work: the copy must wait for the first transition, and the fragment shader must wait for the copy.' },
      { type: 'table', head: ['Transition', 'Waits for (src)', 'Before (dst)'], rows: [
        ['`Undefined` → `TransferDstOptimal`', 'Nothing: the image is new', 'The copy’s writes'],
        ['`TransferDstOptimal` → `ShaderReadOnlyOptimal`', 'The copy’s writes', 'Fragment shader sampling']
      ] },
      { type: 'h2', text: 'Samplers' },
      { type: 'p', text: 'A UV rarely lands exactly on a texel centre. The sampler decides what to return:' },
      { type: 'table', head: ['Setting', 'Options', 'Effect'], rows: [
        ['Filter (mag, min)', '`Nearest`, `Linear`', 'Nearest returns the closest texel: sharp, blocky up close. Linear blends the four nearest texels by distance: smooth'],
        ['Address mode', '`Repeat`, `MirroredRepeat`, `ClampToEdge`, `ClampToBorder`', 'What a UV outside 0 to 1 reads: tiling (brick walls), mirrored tiling, or the edge texel'],
        ['Mipmap mode and LOD', '`Nearest`, `Linear`; min and max LOD', 'Which smaller copy of the image to read (lesson 5)'],
        ['Anisotropy', 'Off, or up to `maxSamplerAnisotropy`', 'Extra samples for surfaces seen at a grazing angle, such as a floor'],
      ] },
      { type: 'p', text: 'A sampler is independent of any image, so one sampler can serve many textures. Try the filters and address modes on a 4 × 4 texture:' },
      { type: 'widget', name: 'texture-sampler' },
      { type: 'h2', text: 'sRGB: two kinds of colour numbers' },
      { type: 'p', text: 'Image files store colours **gamma-encoded** (sRGB): the byte values are spaced for the eye, with more steps for dark shades. Blending and lighting maths, though, must use **linear** values, proportional to light. Give a texture the format `R8G8B8A8Srgb` and the GPU decodes each texel to linear as it samples, before filtering. The swapchain is sRGB too, so the GPU encodes again on output. Pure colours pass through unchanged, and blends come out correct.' },
      { type: 'p', text: 'The engine’s `Texture` class creates the image, uploads the pixels with both transitions, and makes a sampler:' },
      { type: 'code', title: 'Engine/Texture.cs', code: cs`
using Silk.NET.Vulkan;

/// <summary>An sRGB colour image uploaded through a staging buffer, and the sampler the shaders read it with.</summary>
sealed unsafe class Texture : IDisposable
{
    readonly GpuContext gpu;
    public readonly GpuImage Image;
    public readonly Sampler Sampler;

    public Texture(GpuContext gpu, uint width, uint height, ReadOnlySpan<byte> rgba,
                   Filter filter = Filter.Linear, SamplerAddressMode address = SamplerAddressMode.Repeat)
    {
        this.gpu = gpu;
        if (rgba.Length != width * height * 4) throw new ArgumentException("Expected 4 bytes per texel", nameof(rgba));
        var image = Image = new GpuImage(gpu, new Extent2D(width, height), Format.R8G8B8A8Srgb,
                                         ImageUsageFlags.TransferDstBit | ImageUsageFlags.SampledBit, ImageAspectFlags.ColorBit);
        using var staging = new GpuBuffer(gpu, (ulong)rgba.Length, BufferUsageFlags.TransferSrcBit,
                                          MemoryPropertyFlags.HostVisibleBit | MemoryPropertyFlags.HostCoherentBit);
        staging.Write(rgba);
        Upload.Immediate(gpu, cmd =>
        {
            image.Transition(cmd, ImageLayout.Undefined, ImageLayout.TransferDstOptimal,
                PipelineStageFlags2.None, AccessFlags2.None, PipelineStageFlags2.CopyBit, AccessFlags2.TransferWriteBit);
            var region = new BufferImageCopy
            {
                ImageSubresource = new ImageSubresourceLayers(ImageAspectFlags.ColorBit, 0, 0, 1),
                ImageExtent = new Extent3D(width, height, 1)        // rows are tightly packed in the buffer
            };
            gpu.Vk.CmdCopyBufferToImage(cmd, staging.Handle, image.Handle, ImageLayout.TransferDstOptimal, 1, &region);
            image.Transition(cmd, ImageLayout.TransferDstOptimal, ImageLayout.ShaderReadOnlyOptimal,
                PipelineStageFlags2.CopyBit, AccessFlags2.TransferWriteBit, PipelineStageFlags2.FragmentShaderBit, AccessFlags2.ShaderSampledReadBit);
        });

        var info = new SamplerCreateInfo
        {
            SType = StructureType.SamplerCreateInfo,
            MagFilter = filter, MinFilter = filter,                   // texels larger / smaller than pixels
            MipmapMode = SamplerMipmapMode.Linear,
            AddressModeU = address, AddressModeV = address, AddressModeW = address,
            MinLod = 0, MaxLod = Image.MipLevels, MaxAnisotropy = 1
        };
        Sampler sampler;
        gpu.Vk.CreateSampler(gpu.Device, &info, null, &sampler).Check("CreateSampler");
        Sampler = sampler;
    }

    public void Dispose()
    {
        gpu.Vk.DestroySampler(gpu.Device, Sampler, null);
        Image.Dispose();
    }
}` },
      { type: 'p', text: 'The shader reaches the texture through a descriptor of type `CombinedImageSampler`, which holds the image view, the sampler and the layout the image will be in. `TextureSet` is `UniformSet` from module 3 with that descriptor type, visible to the fragment shader:' },
      { type: 'code', title: 'Engine/TextureSet.cs', code: cs`
using Silk.NET.Vulkan;

/// <summary>A descriptor set with one texture (image view + sampler) at binding 0, for the fragment shader.</summary>
sealed unsafe class TextureSet : IDisposable
{
    readonly GpuContext gpu;
    public readonly DescriptorSetLayout Layout;
    public readonly DescriptorPool Pool;
    public readonly DescriptorSet Set;

    public TextureSet(GpuContext gpu, Texture texture)
    {
        this.gpu = gpu;
        var vk = gpu.Vk;
        var binding = new DescriptorSetLayoutBinding
        {
            Binding = 0, DescriptorType = DescriptorType.CombinedImageSampler, DescriptorCount = 1, StageFlags = ShaderStageFlags.FragmentBit
        };
        var layoutInfo = new DescriptorSetLayoutCreateInfo { SType = StructureType.DescriptorSetLayoutCreateInfo, BindingCount = 1, PBindings = &binding };
        DescriptorSetLayout layout;
        vk.CreateDescriptorSetLayout(gpu.Device, &layoutInfo, null, &layout).Check("CreateDescriptorSetLayout");
        Layout = layout;

        var poolSize = new DescriptorPoolSize(DescriptorType.CombinedImageSampler, 1);
        var poolInfo = new DescriptorPoolCreateInfo { SType = StructureType.DescriptorPoolCreateInfo, MaxSets = 1, PoolSizeCount = 1, PPoolSizes = &poolSize };
        DescriptorPool pool;
        vk.CreateDescriptorPool(gpu.Device, &poolInfo, null, &pool).Check("CreateDescriptorPool");
        Pool = pool;

        var allocInfo = new DescriptorSetAllocateInfo { SType = StructureType.DescriptorSetAllocateInfo, DescriptorPool = Pool, DescriptorSetCount = 1, PSetLayouts = &layout };
        DescriptorSet set;
        vk.AllocateDescriptorSets(gpu.Device, &allocInfo, &set).Check("AllocateDescriptorSets");
        Set = set;

        var imageInfo = new DescriptorImageInfo { Sampler = texture.Sampler, ImageView = texture.Image.View, ImageLayout = ImageLayout.ShaderReadOnlyOptimal };
        var write = new WriteDescriptorSet
        {
            SType = StructureType.WriteDescriptorSet, DstSet = Set, DstBinding = 0,
            DescriptorCount = 1, DescriptorType = DescriptorType.CombinedImageSampler, PImageInfo = &imageInfo
        };
        vk.UpdateDescriptorSets(gpu.Device, 1, &write, 0, null);
    }

    public void Bind(CommandBuffer cmd, PipelineLayout pipelineLayout)
    {
        var set = Set;
        gpu.Vk.CmdBindDescriptorSets(cmd, PipelineBindPoint.Graphics, pipelineLayout, 0, 1, &set, 0, null);
    }

    public void Dispose()
    {
        gpu.Vk.DestroyDescriptorPool(gpu.Device, Pool, null);
        gpu.Vk.DestroyDescriptorSetLayout(gpu.Device, Layout, null);
    }
}` },
      { type: 'h2', text: 'A 2 × 2 texture across the window' },
      { type: 'p', text: 'The smallest test that shows filtering: a texture of four texels (red, green; blue, white) stretched over the whole window, so each texel covers 400 × 300 pixels. The quad is in NDC already, so the matrix is the identity. The program draws it with a nearest sampler and a linear one and reads the same pixels each time:' },
      { type: 'code', title: 'Textures.cs', code: cs`
using System.Numerics;
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
using var swapchain = new Swapchain(gpu, window.FramebufferSize);
using var readback = new ReadbackBuffer(gpu, swapchain.Extent);

byte[] texels =
[
    255, 0, 0, 255,     0, 255, 0, 255,         // top row: red, green
    0, 0, 255, 255,     255, 255, 255, 255      // bottom row: blue, white
];
var n = new Vector3(0, 0, -1);
using var quad = new Mesh<MeshVertex>(gpu,
[
    new(new(-1, -1, 0), n, new(0, 0)), new(new(1, -1, 0), n, new(1, 0)),     // top of the window: v = 0
    new(new(1, 1, 0), n, new(1, 1)), new(new(-1, 1, 0), n, new(0, 1))
], [0, 1, 2, 0, 2, 3]);
var push = new PushConstantRange(ShaderStageFlags.VertexBit, 0, 64);
(int X, int Y)[] points = [(200, 150), (600, 150), (200, 450), (600, 450), (300, 150), (400, 300)];

foreach (var filter in new[] { Filter.Nearest, Filter.Linear })
{
    using var texture = new Texture(gpu, 2, 2, texels, filter);
    using var set = new TextureSet(gpu, texture);
    using var pipeline = new MeshPipeline(gpu, swapchain.Format, ModelShaders.Vertex, ModelShaders.Textured,
                                          setLayouts: [set.Layout], pushConstants: [push], vertexLayout: MeshVertex.Layout);
    TestFrame.Draw(gpu, swapchain, readback, cmd =>
    {
        gpu.Vk.CmdBindPipeline(cmd, PipelineBindPoint.Graphics, pipeline.Handle);
        set.Bind(cmd, pipeline.Layout);
        Camera.Push(gpu, cmd, pipeline.Layout, Matrix4x4.Identity);
        quad.Draw(cmd);
    });
    Console.WriteLine($"{filter}:");
    foreach (var (x, y) in points) Console.WriteLine($"  ({x}, {y}) uv ({(x + 0.5f) / 800:F3}, {(y + 0.5f) / 600:F3}): {readback.Pixel(x, y)}");
}`, output: 'Nearest:\n  (200, 150) uv (0.251, 0.251): (255, 0, 0)\n  (600, 150) uv (0.751, 0.251): (0, 255, 0)\n  (200, 450) uv (0.251, 0.751): (0, 0, 255)\n  (600, 450) uv (0.751, 0.751): (255, 255, 255)\n  (300, 150) uv (0.376, 0.251): (255, 0, 0)\n  (400, 300) uv (0.501, 0.501): (255, 255, 255)\nLinear:\n  (200, 150) uv (0.251, 0.251): (255, 0, 0)\n  (600, 150) uv (0.751, 0.251): (0, 255, 0)\n  (200, 450) uv (0.251, 0.751): (0, 0, 255)\n  (600, 450) uv (0.751, 0.751): (255, 255, 255)\n  (300, 150) uv (0.376, 0.251): (225, 137, 0)\n  (400, 300) uv (0.501, 0.501): (187, 187, 187)' },
      { type: 'p', text: 'With `Nearest`, every pixel takes one texel’s exact colour, and the window is four flat blocks. With `Linear`, the quadrant centres sit on texel centres and still read pure colours, but in between the texels blend. At (300, 150), a quarter of the way from red to green, the result is 75% red and 25% green **in linear light**, which re-encodes as 225 and 137, not 191 and 64. At the centre all four texels mix equally, to linear 0.5, which sRGB stores as 187. Had the texture used a `Unorm` format, the GPU would have averaged the encoded bytes and the blends would be visibly too dark.' },
      { type: 'note', kind: 'warn', text: 'Only colour textures are sRGB. Data stored in images (normal maps, roughness, heights, the object IDs used for picking in module 9) must use `Unorm` or integer formats, or the GPU will “decode” numbers that were never gamma-encoded.' },
      { type: 'quiz', question: 'A texture is drawn with UVs from 0 to 3 and the address mode Repeat. What do you see?', options: ['The texture once, stretched', 'The texture tiled 3 × 3 times', 'The texture once, then its edge texels smeared', 'Nothing: UVs above 1 are invalid'], answer: 1, explain: 'Repeat uses only the fractional part of the UV, so 0 to 3 covers the image three times in each direction. ClampToEdge would show it once and then repeat the edge texels.' },
      { type: 'quiz', question: 'Why is the image moved to ShaderReadOnlyOptimal after the copy, in a barrier, rather than just left as it is?', options: ['The layout is only a hint and could be skipped', 'Shaders may only sample images in a read-only layout, and the barrier also makes the fragment shader wait until the copy has finished', 'To free the staging buffer', 'To generate mipmaps'], answer: 1, explain: 'The layout must match what the descriptor says, and the barrier carries the synchronisation: without it a draw could sample the image before the copy completes.' },
      { type: 'exercise', task: 'Use a 2 × 2 **black and white checker** texture with **nearest** filtering on a quad whose UVs run from 0 to 2. Draw it once with `Repeat` and once with `ClampToEdge`, and print the four pixels (100, 150), (300, 150), (500, 150) and (700, 150).', hint: 'Copy Textures.cs, multiply each UV by 2, and loop over the two address modes instead of the filters. With Repeat the colours alternate across the row; with ClampToEdge every UV above 1 reads the right-hand texel.', solution: cs`
using System.Numerics;
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600) });
window.Initialize();
using var gpu = new GpuContext(window);
using var swapchain = new Swapchain(gpu, window.FramebufferSize);
using var readback = new ReadbackBuffer(gpu, swapchain.Extent);
byte[] checker = [0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 255];
var n = new Vector3(0, 0, -1);
using var quad = new Mesh<MeshVertex>(gpu,
[
    new(new(-1, -1, 0), n, new(0, 0)), new(new(1, -1, 0), n, new(2, 0)),
    new(new(1, 1, 0), n, new(2, 2)), new(new(-1, 1, 0), n, new(0, 2))
], [0, 1, 2, 0, 2, 3]);
var push = new PushConstantRange(ShaderStageFlags.VertexBit, 0, 64);

foreach (var address in new[] { SamplerAddressMode.Repeat, SamplerAddressMode.ClampToEdge })
{
    using var texture = new Texture(gpu, 2, 2, checker, Filter.Nearest, address);
    using var set = new TextureSet(gpu, texture);
    using var pipeline = new MeshPipeline(gpu, swapchain.Format, ModelShaders.Vertex, ModelShaders.Textured,
                                          setLayouts: [set.Layout], pushConstants: [push], vertexLayout: MeshVertex.Layout);
    TestFrame.Draw(gpu, swapchain, readback, cmd =>
    {
        gpu.Vk.CmdBindPipeline(cmd, PipelineBindPoint.Graphics, pipeline.Handle);
        set.Bind(cmd, pipeline.Layout);
        Camera.Push(gpu, cmd, pipeline.Layout, Matrix4x4.Identity);
        quad.Draw(cmd);
    });
    Console.WriteLine($"{address,-12} " + string.Join(" ", new[] { 100, 300, 500, 700 }.Select(x => readback.Pixel(x, 150).R == 0 ? "black" : "white")));
}`, output: 'Repeat       white black white black\nClampToEdge  white black black black' }
    ],
    keyPoints: [
      'A texture is an image, an image view and a sampler; the shader reads it as a sampler2D.',
      'Upload with a staging buffer and CmdCopyBufferToImage, transitioning Undefined → TransferDst → ShaderReadOnly.',
      'The sampler chooses filtering (Nearest or Linear) and what UVs outside 0 to 1 read (Repeat, Clamp, Mirror).',
      'Colour textures use an sRGB format so filtering and blending happen in linear light.',
      'Data textures (normals, IDs, roughness) must use Unorm or integer formats.',
      'A CombinedImageSampler descriptor gives the fragment shader the view, sampler and layout together.'
    ]
  },

  // ------------------------------------------------------------------ 4
  {
    slug: 'loading-models',
    title: 'Loading meshes: OBJ and glTF',
    summary: 'Write an OBJ reader that triangulates polygons and merges identical corners, and a glTF reader that follows accessors and buffer views into binary data. Convert both to the engine’s Z-up world and draw them.',
    minutes: 24,
    blocks: [
      { type: 'p', text: 'Typing vertices into arrays stops at cubes. Real geometry comes from files exported by Revit, Tekla, Blender or an IFC converter. Two formats cover most needs: **OBJ**, a plain-text format that every tool can write, and **glTF**, the modern format designed to be loaded straight into GPU buffers.' },
      { type: 'h2', text: 'OBJ: lines of text' },
      { type: 'p', text: 'An OBJ file is a list of lines, each starting with a keyword. A viewer needs four of them:' },
      { type: 'table', head: ['Line', 'Meaning', 'Example'], rows: [
        ['`v x y z`', 'A position', '`v 1.0 -1.0 0.0`'],
        ['`vt u v`', 'A texture coordinate (v points **up**, unlike Vulkan)', '`vt 0.5 1.0`'],
        ['`vn x y z`', 'A normal', '`vn 0 0 1`'],
        ['`f a b c …`', 'A polygon face; each corner is `v`, `v/vt`, `v//vn` or `v/vt/vn`, numbered from 1 (negative numbers count back from the end)', '`f 1/1/1 2/2/1 6/3/1 5/4/1`']
      ] },
      { type: 'p', text: 'Two things separate OBJ from what the GPU wants. Faces can have any number of corners, but the GPU draws triangles, so each polygon is split into a **fan**: corners (0, 1, 2), (0, 2, 3), (0, 3, 4) and so on. And OBJ indexes positions, UVs and normals separately, while a vertex buffer needs one index per complete vertex. A cube has 8 positions, but each corner of the cube belongs to three faces with three different normals, so it becomes three vertices. The reader keeps a dictionary from each `(position, uv, normal)` combination to its vertex index, so identical corners are stored once.' },
      { type: 'widget', name: 'obj-parser' },
      { type: 'code', title: 'Engine/ObjLoader.cs', code: cs`
using System.Globalization;
using System.Numerics;

/// <summary>Reads positions, texture coordinates, normals and polygon faces from Wavefront OBJ text.</summary>
static class ObjLoader
{
    public sealed record Result(MeshVertex[] Vertices, uint[] Indices, int Positions, int Corners);

    public static Result Parse(string text)
    {
        var positions = new List<Vector3>();
        var uvs = new List<Vector2>();
        var normals = new List<Vector3>();
        var vertices = new List<MeshVertex>();
        var indices = new List<uint>();
        var unique = new Dictionary<(int P, int T, int N), uint>();
        int corners = 0;

        foreach (var raw in text.Split('\n'))
        {
            var parts = raw.Split((char[])[' ', '\t', '\r'], StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 0 || parts[0].StartsWith('#')) continue;
            switch (parts[0])
            {
                case "v": positions.Add(new(F(parts[1]), F(parts[2]), F(parts[3]))); break;
                case "vt": uvs.Add(new(F(parts[1]), 1f - F(parts[2]))); break;     // OBJ's v points up, Vulkan's down
                case "vn": normals.Add(new(F(parts[1]), F(parts[2]), F(parts[3]))); break;
                case "f":
                    var face = parts.Skip(1).Select(Corner).ToArray();
                    for (int i = 1; i + 1 < face.Length; i++)                      // a fan: (0, i, i + 1)
                        indices.AddRange([face[0], face[i], face[i + 1]]);
                    break;
            }
        }
        var result = vertices.ToArray();
        if (normals.Count == 0) ComputeNormals(result, indices);
        return new Result(result, indices.ToArray(), positions.Count, corners);

        uint Corner(string token)
        {
            corners++;
            var ids = token.Split('/');
            int p = Index(ids[0], positions.Count);
            int t = ids.Length > 1 && ids[1] != "" ? Index(ids[1], uvs.Count) : -1;
            int n = ids.Length > 2 && ids[2] != "" ? Index(ids[2], normals.Count) : -1;
            if (unique.TryGetValue((p, t, n), out uint existing)) return existing;
            uint index = (uint)vertices.Count;
            vertices.Add(new MeshVertex(positions[p], n >= 0 ? normals[n] : Vector3.Zero, t >= 0 ? uvs[t] : Vector2.Zero));
            unique[(p, t, n)] = index;
            return index;
        }
    }

    /// <summary>OBJ numbers from 1; negative numbers count back from the latest element.</summary>
    static int Index(string s, int count) { int i = int.Parse(s, CultureInfo.InvariantCulture); return i > 0 ? i - 1 : count + i; }
    static float F(string s) => float.Parse(s, CultureInfo.InvariantCulture);      // always "1.5", whatever the PC's culture

    /// <summary>No normals in the file: give each vertex the area-weighted average of its triangles' normals.</summary>
    static void ComputeNormals(MeshVertex[] vertices, List<uint> indices)
    {
        var sums = new Vector3[vertices.Length];
        for (int i = 0; i < indices.Count; i += 3)
        {
            var (a, b, c) = (vertices[indices[i]].Position, vertices[indices[i + 1]].Position, vertices[indices[i + 2]].Position);
            var normal = Vector3.Cross(b - a, c - a);                   // its length is twice the triangle's area
            sums[indices[i]] += normal; sums[indices[i + 1]] += normal; sums[indices[i + 2]] += normal;
        }
        for (int i = 0; i < vertices.Length; i++)
            vertices[i] = new MeshVertex(vertices[i].Position, Vector3.Normalize(sums[i]), vertices[i].Uv);
    }
}` },
      { type: 'p', text: 'Note `CultureInfo.InvariantCulture`. On a PC set to German or French, `float.Parse("1.5")` fails or reads 15, because those cultures write a decimal comma. File formats always use a point, so every parser must say so explicitly.' },
      { type: 'p', text: 'Load a cube written as six quads, each corner with a position, UV and normal, and draw it with depth and the normal-colour shader:' },
      { type: 'code', title: 'LoadObj.cs', code: cs`
using System.Numerics;
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

const string cubeObj = """
    # A 2 m cube centred on the origin, Z up
    v -1 -1 -1
    v  1 -1 -1
    v  1  1 -1
    v -1  1 -1
    v -1 -1  1
    v  1 -1  1
    v  1  1  1
    v -1  1  1
    vt 0 0
    vt 1 0
    vt 1 1
    vt 0 1
    vn  0 -1  0
    vn  1  0  0
    vn  0  1  0
    vn -1  0  0
    vn  0  0  1
    vn  0  0 -1
    f 1/1/1 2/2/1 6/3/1 5/4/1
    f 2/1/2 3/2/2 7/3/2 6/4/2
    f 3/1/3 4/2/3 8/3/3 7/4/3
    f 4/1/4 1/2/4 5/3/4 8/4/4
    f 5/1/5 6/2/5 7/3/5 8/4/5
    f 1/1/6 4/2/6 3/3/6 2/4/6
    """;

var obj = ObjLoader.Parse(cubeObj);
Console.WriteLine($"{obj.Positions} positions, {obj.Corners} face corners -> {obj.Vertices.Length} vertices, {obj.Indices.Length / 3} triangles");

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
using var swapchain = new Swapchain(gpu, window.FramebufferSize);
using var readback = new ReadbackBuffer(gpu, swapchain.Extent);
using var depth = new GpuImage(gpu, swapchain.Extent, Format.D32Sfloat, ImageUsageFlags.DepthStencilAttachmentBit, ImageAspectFlags.DepthBit);
using var pipeline = new MeshPipeline(gpu, swapchain.Format, ModelShaders.Vertex, ModelShaders.Normals,
                                      pushConstants: [new(ShaderStageFlags.VertexBit, 0, 64)], depthFormat: depth.Format, vertexLayout: MeshVertex.Layout);
using var cube = new Mesh<MeshVertex>(gpu, obj.Vertices, obj.Indices);

var mvp = Camera.LookAt(new Vector3(4f, -6f, 3f), Vector3.Zero) * Camera.Perspective(45f, 800f / 600f, 0.1f, 100f);
TestFrame.Draw(gpu, swapchain, readback, cmd =>
{
    gpu.Vk.CmdBindPipeline(cmd, PipelineBindPoint.Graphics, pipeline.Handle);
    Camera.Push(gpu, cmd, pipeline.Layout, mvp);
    cube.Draw(cmd);
}, depth: depth);
foreach (var (name, normal) in new[] { ("front, normal -Y", -Vector3.UnitY), ("right, normal +X", Vector3.UnitX), ("top, normal +Z", Vector3.UnitZ) })
{
    var p = Camera.Project(normal, mvp, swapchain.Extent);
    Console.WriteLine($"{name}: {readback.Pixel((int)p.X, (int)p.Y)}");
}`, output: '8 positions, 24 face corners -> 24 vertices, 12 triangles\nfront, normal -Y: (187, 0, 187)\nright, normal +X: (255, 187, 187)\ntop, normal +Z: (187, 187, 255)' },
      { type: 'p', text: 'The 24 face corners became 24 vertices: no two corners of this cube share a position and a normal. On a smooth mesh, such as a pipe, neighbouring faces share their normals, and the dictionary merges six or more corners into each vertex. Each face’s colour is its normal: −Y gives red 0.5, green 0, blue 0.5, stored in sRGB as (187, 0, 187).' },
      { type: 'h2', text: 'glTF: JSON plus binary buffers' },
      { type: 'p', text: 'glTF (GL Transmission Format) is built for loading speed. A `.gltf` file is JSON describing the scene, and the vertex data sits in binary **buffers**, either separate `.bin` files, base64 inside the JSON, or appended to a binary `.glb` file. The binary data is already in GPU-friendly arrays, so loading is mostly following references:' },
      { type: 'table', head: ['Object', 'Says', 'Example'], rows: [
        ['`mesh.primitives[i]`', 'Which accessor holds each attribute, and which holds the indices', '`"attributes": { "POSITION": 0, "NORMAL": 1 }, "indices": 2`'],
        ['`accessor`', 'How to read the elements: component type, element type, count, and which buffer view', 'Accessor 0: 4 × `VEC3` of `FLOAT` (5126)'],
        ['`bufferView`', 'A byte range of a buffer, and the stride between elements if they are interleaved', 'Bytes 0 to 47 of buffer 0'],
        ['`buffer`', 'The raw bytes', 'A data URI, or a `.bin` file']
      ] },
      { type: 'p', text: 'glTF also fixes conventions that OBJ leaves open: lengths in metres, **Y up**, and UVs with (0, 0) at the top-left, as in Vulkan. A BIM engine is Z-up, so the loader turns (x, y, z) into (x, −z, y), a 90° rotation about the x axis that keeps the coordinate system right-handed. This reader handles one primitive with embedded buffers, enough to understand the format; for production use a library such as SharpGLTF, which handles materials, scenes, skins and `.glb` files.' },
      { type: 'code', title: 'Engine/GltfLoader.cs', code: cs`
using System.Numerics;
using System.Text.Json;

/// <summary>Reads the first primitive of the first mesh of a .gltf file whose buffers are embedded as base64 data URIs.</summary>
static class GltfLoader
{
    const int Float = 5126, UnsignedByte = 5121, UnsignedShort = 5123, UnsignedInt = 5125;

    public static (MeshVertex[] Vertices, uint[] Indices) Load(string json)
    {
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        byte[][] buffers = root.GetProperty("buffers").EnumerateArray()
            .Select(b => Convert.FromBase64String(b.GetProperty("uri").GetString()!.Split(',')[1]))   // "data:...;base64,<data>"
            .ToArray();
        var primitive = root.GetProperty("meshes")[0].GetProperty("primitives")[0];
        var attributes = primitive.GetProperty("attributes");

        float[] positions = Floats(root, buffers, attributes.GetProperty("POSITION").GetInt32(), 3);
        int count = positions.Length / 3;
        float[] normals = attributes.TryGetProperty("NORMAL", out var n) ? Floats(root, buffers, n.GetInt32(), 3) : new float[count * 3];
        float[] uvs = attributes.TryGetProperty("TEXCOORD_0", out var t) ? Floats(root, buffers, t.GetInt32(), 2) : new float[count * 2];

        var vertices = new MeshVertex[count];
        for (int i = 0; i < count; i++)
            vertices[i] = new MeshVertex(ZUp(positions, i), ZUp(normals, i), new Vector2(uvs[2 * i], uvs[2 * i + 1]));
        uint[] indices = primitive.TryGetProperty("indices", out var ix)
            ? Indices(root, buffers, ix.GetInt32())
            : Enumerable.Range(0, count).Select(i => (uint)i).ToArray();     // no indices: vertices in order
        return (vertices, indices);
    }

    /// <summary>glTF is Y-up, the engine Z-up: (x, y, z) becomes (x, -z, y).</summary>
    static Vector3 ZUp(float[] v, int i) => new(v[3 * i], 0f - v[3 * i + 2], v[3 * i + 1]);   // 0 - z, not -z: no "-0"

    /// <summary>accessor -> bufferView -> buffer: the bytes, the first element's offset, the stride (0 = tightly packed), the count.</summary>
    static (byte[] Data, int Start, int Stride, int Count, int ComponentType) Locate(JsonElement root, byte[][] buffers, int accessorIndex)
    {
        var accessor = root.GetProperty("accessors")[accessorIndex];
        var view = root.GetProperty("bufferViews")[accessor.GetProperty("bufferView").GetInt32()];
        int start = Optional(view, "byteOffset") + Optional(accessor, "byteOffset");
        return (buffers[view.GetProperty("buffer").GetInt32()], start, Optional(view, "byteStride"),
                accessor.GetProperty("count").GetInt32(), accessor.GetProperty("componentType").GetInt32());
    }

    static int Optional(JsonElement e, string name) => e.TryGetProperty(name, out var v) ? v.GetInt32() : 0;

    static float[] Floats(JsonElement root, byte[][] buffers, int accessor, int components)
    {
        var (data, start, stride, count, type) = Locate(root, buffers, accessor);
        if (type != Float) throw new NotSupportedException($"Component type {type}: expected FLOAT");
        if (stride == 0) stride = components * 4;
        var result = new float[count * components];
        for (int i = 0; i < count; i++)
            for (int c = 0; c < components; c++)
                result[i * components + c] = BitConverter.ToSingle(data, start + i * stride + c * 4);
        return result;
    }

    static uint[] Indices(JsonElement root, byte[][] buffers, int accessor)
    {
        var (data, start, stride, count, type) = Locate(root, buffers, accessor);
        int size = type switch { UnsignedByte => 1, UnsignedShort => 2, UnsignedInt => 4, _ => throw new NotSupportedException($"Index type {type}") };
        if (stride == 0) stride = size;
        var result = new uint[count];
        for (int i = 0; i < count; i++)
        {
            int at = start + i * stride;
            result[i] = size switch { 1 => data[at], 2 => BitConverter.ToUInt16(data, at), _ => BitConverter.ToUInt32(data, at) };
        }
        return result;
    }
}` },
      { type: 'p', text: 'Here is a complete glTF file for a wall 2 m wide and 2 m tall, modelled Y-up as glTF requires, with its normal along +Z. Its 108-byte buffer holds 4 positions, 4 normals and 6 16-bit indices. After loading, the wall should stand up in the engine’s world, from z = 0 to z = 2, facing −Y towards the camera:' },
      { type: 'code', title: 'LoadGltf.cs', code: cs`
using System.Numerics;
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

const string wallGltf = """
    {
      "asset": { "version": "2.0" },
      "meshes": [ { "primitives": [ { "attributes": { "POSITION": 0, "NORMAL": 1 }, "indices": 2 } ] } ],
      "accessors": [
        { "bufferView": 0, "componentType": 5126, "count": 4, "type": "VEC3", "min": [-1, 0, 0], "max": [1, 2, 0] },
        { "bufferView": 1, "componentType": 5126, "count": 4, "type": "VEC3" },
        { "bufferView": 2, "componentType": 5123, "count": 6, "type": "SCALAR" }
      ],
      "bufferViews": [
        { "buffer": 0, "byteOffset": 0, "byteLength": 48 },
        { "buffer": 0, "byteOffset": 48, "byteLength": 48 },
        { "buffer": 0, "byteOffset": 96, "byteLength": 12 }
      ],
      "buffers": [ { "byteLength": 108, "uri": "data:application/octet-stream;base64,AACAvwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAEAAAAAAAACAvwAAAEAAAAAAAAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAABAAIAAAACAAMA" } ]
    }
    """;

var (vertices, indices) = GltfLoader.Load(wallGltf);
foreach (var v in vertices) Console.WriteLine($"position {v.Position}, normal {v.Normal}");
Console.WriteLine($"indices {string.Join(", ", indices)}");

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
using var swapchain = new Swapchain(gpu, window.FramebufferSize);
using var readback = new ReadbackBuffer(gpu, swapchain.Extent);
using var depth = new GpuImage(gpu, swapchain.Extent, Format.D32Sfloat, ImageUsageFlags.DepthStencilAttachmentBit, ImageAspectFlags.DepthBit);
using var pipeline = new MeshPipeline(gpu, swapchain.Format, ModelShaders.Vertex, ModelShaders.Normals,
                                      pushConstants: [new(ShaderStageFlags.VertexBit, 0, 64)], depthFormat: depth.Format, vertexLayout: MeshVertex.Layout);
using var wall = new Mesh<MeshVertex>(gpu, vertices, indices);
var mvp = Camera.LookAt(new Vector3(4f, -6f, 3f), new Vector3(0f, 0f, 1f)) * Camera.Perspective(45f, 800f / 600f, 0.1f, 100f);
TestFrame.Draw(gpu, swapchain, readback, cmd =>
{
    gpu.Vk.CmdBindPipeline(cmd, PipelineBindPoint.Graphics, pipeline.Handle);
    Camera.Push(gpu, cmd, pipeline.Layout, mvp);
    wall.Draw(cmd);
}, depth: depth);
var centre = Camera.Project(new Vector3(0f, 0f, 1f), mvp, swapchain.Extent);
var above = Camera.Project(new Vector3(0f, 0f, 2.2f), mvp, swapchain.Extent);
Console.WriteLine($"Wall centre (0, 0, 1): {readback.Pixel((int)centre.X, (int)centre.Y)}; above the wall (0, 0, 2.2): {readback.Pixel((int)above.X, (int)above.Y)}");`, output: 'position <-1, 0, 0>, normal <0, -1, 0>\nposition <1, 0, 0>, normal <0, -1, 0>\nposition <1, 0, 2>, normal <0, -1, 0>\nposition <-1, 0, 2>, normal <0, -1, 0>\nindices 0, 1, 2, 0, 2, 3\nWall centre (0, 0, 1): (187, 0, 187); above the wall (0, 0, 2.2): (0, 0, 0)' },
      { type: 'p', text: 'The positions came out Z-up, with the top edge at z = 2, and the normal (0, 0, 1) became (0, −1, 0), so the wall faces the camera and shows the same purple as the cube’s front face. Real files are the same, only bigger: the accessor `min` and `max` give each mesh’s bounding box without reading its data, which lesson 7 uses to frame the model.' },
      { type: 'note', kind: 'tip', text: 'Neither format carries BIM information (element IDs, categories, properties). Viewers usually convert IFC or Revit data into glTF for the geometry, plus a side table keyed by the same element IDs. Module 9 uses those IDs for picking.' },
      { type: 'quiz', question: 'An OBJ face is written f 1 2 3 4 5. How many triangles does the fan make?', options: ['1', '3', '4', '5'], answer: 1, explain: 'A fan from corner 0 makes (0,1,2), (0,2,3), (0,3,4): a polygon with n corners becomes n − 2 triangles.' },
      { type: 'quiz', question: 'Why does the OBJ reader key its dictionary on (position, uv, normal) rather than on the position alone?', options: ['To save memory', 'Because a GPU vertex is the whole combination: the same position with a different normal or UV must be a different vertex', 'Because OBJ files have no positions', 'To sort the vertices'], answer: 1, explain: 'A vertex buffer has one index per complete vertex. A cube corner shared by three faces with three normals must be stored three times, or the faces would share one normal and shade wrongly.' },
      { type: 'exercise', task: 'An L-shaped floor slab is exported as one 6-sided OBJ face. Fan triangulation is only safe for **convex** polygons. Parse the face starting from corner (4, 0) and print each triangle’s signed area (positive for counter-clockwise, seen from above). A negative area means the fan cut outside the L.', hint: 'Use `ObjLoader.Parse` on six `v` lines and `f 1 2 3 4 5 6`. For triangle (a, b, c), the signed area is half the z component of `Vector3.Cross(b - a, c - a)`.', solution: cs`
using System.Numerics;

const string lShape = """
    v 4 0 0
    v 4 2 0
    v 2 2 0
    v 2 4 0
    v 0 4 0
    v 0 0 0
    f 1 2 3 4 5 6
    """;
var obj = ObjLoader.Parse(lShape);
float total = 0;
for (int i = 0; i < obj.Indices.Length; i += 3)
{
    var (a, b, c) = (obj.Vertices[obj.Indices[i]].Position, obj.Vertices[obj.Indices[i + 1]].Position, obj.Vertices[obj.Indices[i + 2]].Position);
    float area = Vector3.Cross(b - a, c - a).Z / 2f;
    total += Math.Abs(area);
    Console.WriteLine($"Triangle {obj.Indices[i]}-{obj.Indices[i + 1]}-{obj.Indices[i + 2]}: {area,5:F1} m²{(area < 0 ? "  <- outside the L" : "")}");
}
Console.WriteLine($"Triangles cover {total} m²; the L is 12 m²");`, output: 'Triangle 0-1-2:   2.0 m²\nTriangle 0-2-3:  -2.0 m²  <- outside the L\nTriangle 0-3-4:   4.0 m²\nTriangle 0-4-5:   8.0 m²\nTriangles cover 16 m²; the L is 12 m²' }
    ],
    keyPoints: [
      'OBJ is text: v, vt and vn lists, and faces that index each list separately, numbered from 1.',
      'Triangulate polygons as fans (n − 2 triangles), which is only correct for convex faces.',
      'Merge corners with a dictionary keyed on (position, uv, normal): one GPU vertex per combination.',
      'Parse numbers with CultureInfo.InvariantCulture, or decimal commas break the reader.',
      'glTF is JSON plus binary buffers: primitive → accessor → buffer view → buffer.',
      'glTF is Y-up: convert (x, y, z) to (x, −z, y) for a Z-up BIM world.'
    ]
  },
  // ------------------------------------------------------------------ 5
  {
    slug: 'mipmaps',
    title: 'Mipmaps',
    summary: 'A detailed texture seen from far away shimmers and shows false patterns. Build a chain of smaller copies with GPU blits, let the sampler pick the right one, and measure the difference on the GPU.',
    minutes: 20,
    blocks: [
      { type: 'p', text: 'Magnifying a texture, as in the last lesson, is easy: neighbouring pixels sample neighbouring points and filtering smooths them. **Minifying** it is the hard case. When a texture is drawn smaller than its size, so that several texels fall inside one pixel, each pixel still takes one sample, and which texel it hits depends on exact sub-pixel positions. Fine detail such as a brick pattern on a far facade or tiles on a distant floor turns into noise, and **moiré** patterns crawl across it as the camera moves.' },
      { type: 'p', text: 'The fix is to prepare the average in advance. A **mipmap chain** stores the image at full size, then half size, quarter size, and so on down to 1 × 1, each level the average of 2 × 2 texels of the one above. The sampler estimates how many texels a pixel covers, takes log₂ of that as the **level of detail** (LOD), and reads the matching level. With `SamplerMipmapMode.Linear` it blends the two nearest levels as well (**trilinear filtering**).' },
      { type: 'widget', name: 'mip-chain' },
      { type: 'p', text: 'A 256 × 256 texture has ⌊log₂ 256⌋ + 1 = 9 levels. The whole chain costs only a third more memory than level 0: ¼ + ¹⁄₁₆ + … approaches ⅓.' },
      { type: 'h2', text: 'Generating the chain on the GPU' },
      { type: 'p', text: 'Image files rarely contain mipmaps (KTX2 and DDS files can). The usual way is to upload level 0 and let the GPU shrink it level by level with `CmdBlitImage`, a copy that can scale and filter. Each step reads level i − 1 and writes level i, so the barriers move one level at a time:' },
      { type: 'ol', items: [
        'Transition **all** levels from `Undefined` to `TransferDstOptimal`, and copy the pixels into level 0.',
        'For each level i: move level i − 1 to `TransferSrcOptimal`, blit it into level i at half the size, then move level i − 1 to `ShaderReadOnlyOptimal`; it is finished.',
        'Move the last level, which was only ever written, to `ShaderReadOnlyOptimal`.'
      ] },
      { type: 'p', text: 'Linear filtering in a blit is optional for a format, so check `SampledImageFilterLinear` in its format properties first. Here is `Texture` again with a `mipmaps` parameter; the new code is the level count, the check, the extra `TransferSrc` usage and `GenerateMips`:' },
      { type: 'code', title: 'Engine/Texture.cs', code: cs`
using System.Numerics;
using Silk.NET.Vulkan;

/// <summary>An sRGB colour image uploaded through a staging buffer, optionally with a full mipmap chain, and its sampler.</summary>
sealed unsafe class Texture : IDisposable
{
    readonly GpuContext gpu;
    public readonly GpuImage Image;
    public readonly Sampler Sampler;
    const Format TextureFormat = Format.R8G8B8A8Srgb;

    public Texture(GpuContext gpu, uint width, uint height, ReadOnlySpan<byte> rgba,
                   Filter filter = Filter.Linear, SamplerAddressMode address = SamplerAddressMode.Repeat, bool mipmaps = false)
    {
        this.gpu = gpu;
        if (rgba.Length != width * height * 4) throw new ArgumentException("Expected 4 bytes per texel", nameof(rgba));
        uint levels = mipmaps ? (uint)BitOperations.Log2(Math.Max(width, height)) + 1 : 1;    // 256 -> 9 levels
        if (mipmaps)
        {
            var props = gpu.Vk.GetPhysicalDeviceFormatProperties(gpu.PhysicalDevice, TextureFormat);
            if ((props.OptimalTilingFeatures & FormatFeatureFlags.SampledImageFilterLinearBit) == 0)
                throw new NotSupportedException($"{TextureFormat} cannot be blitted with linear filtering on this GPU");
        }
        var image = Image = new GpuImage(gpu, new Extent2D(width, height), TextureFormat,
            ImageUsageFlags.TransferDstBit | ImageUsageFlags.TransferSrcBit | ImageUsageFlags.SampledBit, ImageAspectFlags.ColorBit, levels);
        using var staging = new GpuBuffer(gpu, (ulong)rgba.Length, BufferUsageFlags.TransferSrcBit,
                                          MemoryPropertyFlags.HostVisibleBit | MemoryPropertyFlags.HostCoherentBit);
        staging.Write(rgba);
        Upload.Immediate(gpu, cmd =>
        {
            image.Transition(cmd, ImageLayout.Undefined, ImageLayout.TransferDstOptimal,          // every level
                PipelineStageFlags2.None, AccessFlags2.None, PipelineStageFlags2.AllTransferBit, AccessFlags2.TransferWriteBit);
            var region = new BufferImageCopy
            {
                ImageSubresource = new ImageSubresourceLayers(ImageAspectFlags.ColorBit, 0, 0, 1),
                ImageExtent = new Extent3D(width, height, 1)
            };
            gpu.Vk.CmdCopyBufferToImage(cmd, staging.Handle, image.Handle, ImageLayout.TransferDstOptimal, 1, &region);
            GenerateMips(gpu, cmd, image);                // with one level, only the final transition runs
        });

        var info = new SamplerCreateInfo
        {
            SType = StructureType.SamplerCreateInfo,
            MagFilter = filter, MinFilter = filter,
            MipmapMode = SamplerMipmapMode.Linear,                    // blend the two nearest levels: trilinear
            AddressModeU = address, AddressModeV = address, AddressModeW = address,
            MinLod = 0, MaxLod = levels, MaxAnisotropy = 1
        };
        Sampler sampler;
        gpu.Vk.CreateSampler(gpu.Device, &info, null, &sampler).Check("CreateSampler");
        Sampler = sampler;
    }

    /// <summary>Fills levels 1.. by halving the level above with a linear blit; leaves every level ShaderReadOnlyOptimal.</summary>
    static void GenerateMips(GpuContext gpu, CommandBuffer cmd, GpuImage image)
    {
        int w = (int)image.Extent.Width, h = (int)image.Extent.Height;
        for (uint level = 1; level < image.MipLevels; level++)
        {
            image.Transition(cmd, ImageLayout.TransferDstOptimal, ImageLayout.TransferSrcOptimal,
                PipelineStageFlags2.AllTransferBit, AccessFlags2.TransferWriteBit, PipelineStageFlags2.BlitBit, AccessFlags2.TransferReadBit,
                baseMip: level - 1, mipCount: 1);
            int halfW = Math.Max(1, w / 2), halfH = Math.Max(1, h / 2);
            var blit = new ImageBlit
            {
                SrcSubresource = new ImageSubresourceLayers(ImageAspectFlags.ColorBit, level - 1, 0, 1),
                DstSubresource = new ImageSubresourceLayers(ImageAspectFlags.ColorBit, level, 0, 1)
            };
            blit.SrcOffsets[1] = new Offset3D(w, h, 1);                 // the whole of level - 1 ...
            blit.DstOffsets[1] = new Offset3D(halfW, halfH, 1);         // ... into the whole of level
            gpu.Vk.CmdBlitImage(cmd, image.Handle, ImageLayout.TransferSrcOptimal, image.Handle, ImageLayout.TransferDstOptimal, 1, &blit, Filter.Linear);
            image.Transition(cmd, ImageLayout.TransferSrcOptimal, ImageLayout.ShaderReadOnlyOptimal,
                PipelineStageFlags2.BlitBit, AccessFlags2.TransferReadBit, PipelineStageFlags2.FragmentShaderBit, AccessFlags2.ShaderSampledReadBit,
                baseMip: level - 1, mipCount: 1);
            (w, h) = (halfW, halfH);
        }
        image.Transition(cmd, ImageLayout.TransferDstOptimal, ImageLayout.ShaderReadOnlyOptimal,          // the last level
            PipelineStageFlags2.AllTransferBit, AccessFlags2.TransferWriteBit, PipelineStageFlags2.FragmentShaderBit, AccessFlags2.ShaderSampledReadBit,
            baseMip: image.MipLevels - 1, mipCount: 1);
    }

    public void Dispose()
    {
        gpu.Vk.DestroySampler(gpu.Device, Sampler, null);
        Image.Dispose();
    }
}` },
      { type: 'h2', text: 'Measuring the difference' },
      { type: 'p', text: 'The hardest case for a sampler is a checkerboard of single texels: at a distance it should look like an even grey. The sample draws a 256 × 256 checker onto a 100 × 100-pixel square, about 2.6 texels per pixel, once without mipmaps and once with them. Then it examines the square’s pixels: their range, their mean, and how many different values appear.' },
      { type: 'code', title: 'Mipmaps.cs', code: cs`
using System.Numerics;
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
using var swapchain = new Swapchain(gpu, window.FramebufferSize);
using var readback = new ReadbackBuffer(gpu, swapchain.Extent);

const int size = 256;
var texels = new byte[size * size * 4];
for (int y = 0; y < size; y++)
    for (int x = 0; x < size; x++)
    {
        byte c = (byte)((x + y) % 2 == 0 ? 255 : 0);                 // single-texel checker
        texels[(y * size + x) * 4 + 0] = texels[(y * size + x) * 4 + 1] = texels[(y * size + x) * 4 + 2] = c;
        texels[(y * size + x) * 4 + 3] = 255;
    }

// A square of 100 x 100 pixels in the middle of the 800 x 600 window
float hx = 100f / 800f, hy = 100f / 600f;
var n = new Vector3(0, 0, -1);
using var quad = new Mesh<MeshVertex>(gpu,
[
    new(new(-hx, -hy, 0), n, new(0, 0)), new(new(hx, -hy, 0), n, new(1, 0)),
    new(new(hx, hy, 0), n, new(1, 1)), new(new(-hx, hy, 0), n, new(0, 1))
], [0, 1, 2, 0, 2, 3]);
var push = new PushConstantRange(ShaderStageFlags.VertexBit, 0, 64);

foreach (bool mipmaps in new[] { false, true })
{
    using var texture = new Texture(gpu, size, size, texels, Filter.Linear, mipmaps: mipmaps);
    using var set = new TextureSet(gpu, texture);
    using var pipeline = new MeshPipeline(gpu, swapchain.Format, ModelShaders.Vertex, ModelShaders.Textured,
                                          setLayouts: [set.Layout], pushConstants: [push], vertexLayout: MeshVertex.Layout);
    TestFrame.Draw(gpu, swapchain, readback, cmd =>
    {
        gpu.Vk.CmdBindPipeline(cmd, PipelineBindPoint.Graphics, pipeline.Handle);
        set.Bind(cmd, pipeline.Layout);
        Camera.Push(gpu, cmd, pipeline.Layout, Matrix4x4.Identity);
        quad.Draw(cmd);
    });
    var values = new List<int>();
    for (int y = 252; y < 348; y++)
        for (int x = 352; x < 448; x++) values.Add(readback.Pixel(x, y).R);
    Console.WriteLine($"{(mipmaps ? "With mipmaps" : "No mipmaps"),-13} levels {texture.Image.MipLevels}: " +
                      $"red from {values.Min(),3} to {values.Max(),3}, mean {values.Average(),5:F1}, {values.Distinct().Count(),3} different values");
}`, output: 'No mipmaps    levels 1: red from  55 to 251, mean 184.1,  93 different values\nWith mipmaps  levels 9: red from 187 to 187, mean 187.0,   1 different values' },
      { type: 'p', text: 'Without mipmaps the square holds 93 different shades, from 55 to 251, in a pattern that has nothing to do with the texture and would crawl as the square moved. With mipmaps every pixel is the same grey, 187 in sRGB, which is exactly 50% light: the true average of a black and white checker.' },
      { type: 'note', kind: 'info', text: 'Mipmaps also make rendering **faster**. A minified texture without them makes neighbouring pixels read texels far apart in memory, which defeats the texture cache. With them, neighbouring pixels read neighbouring texels of a small level.' },
      { type: 'p', text: 'Mipmaps choose one LOD per pixel from the larger of the two directions. For a floor seen at a grazing angle, texels are squashed in one direction only, so the sampler picks a level that is too blurry along the other. **Anisotropic filtering** takes several samples along the squashed direction instead. Enable the `samplerAnisotropy` device feature, then set `AnisotropyEnable` and `MaxAnisotropy` (commonly 8 or 16) in the sampler.' },
      { type: 'quiz', question: 'How many mip levels does a full chain for a 1024 × 512 texture have?', options: ['10', '11', '9', '512'], answer: 1, explain: '⌊log₂ 1024⌋ + 1 = 11: 1024 × 512, 512 × 256, … , 2 × 1, 1 × 1. The larger dimension decides; the smaller one stops at 1.' },
      { type: 'quiz', question: 'During mip generation, why is level i − 1 moved to TransferSrcOptimal right before the blit that writes level i?', options: ['Blits need every level in the same layout', 'It was just written as a blit (or copy) destination; the barrier makes that write finish and puts it in the layout a blit source needs', 'To free its memory', 'It is not necessary'], answer: 1, explain: 'Each level is written as a destination, then read as a source. The per-level barrier orders the write before the read and changes the layout.' },
      { type: 'exercise', task: 'Print the size of every level in the mipmap chain of a **1000 × 600** texture, and the total number of texels compared with level 0.', hint: 'Halve each dimension with integer division but never go below 1, and stop after ⌊log₂ max(w, h)⌋ + 1 levels.', solution: cs`
using System.Numerics;

int w = 1000, h = 600;
int levels = BitOperations.Log2((uint)Math.Max(w, h)) + 1;
long total = 0, level0 = (long)w * h;
for (int i = 0; i < levels; i++)
{
    Console.WriteLine($"Level {i,2}: {w,4} x {h,3}");
    total += (long)w * h;
    (w, h) = (Math.Max(1, w / 2), Math.Max(1, h / 2));
}
Console.WriteLine($"{levels} levels, {total:N0} texels: {100.0 * total / level0:F1}% of level 0");`, output: 'Level  0: 1000 x 600\nLevel  1:  500 x 300\nLevel  2:  250 x 150\nLevel  3:  125 x  75\nLevel  4:   62 x  37\nLevel  5:   31 x  18\nLevel  6:   15 x   9\nLevel  7:    7 x   4\nLevel  8:    3 x   2\nLevel  9:    1 x   1\n10 levels, 799,897 texels: 133.3% of level 0' }
    ],
    keyPoints: [
      'Minifying a texture without mipmaps aliases: shimmering, moiré and wasted texture cache.',
      'A mip chain halves the image down to 1 × 1: ⌊log₂ max(w, h)⌋ + 1 levels, one third more memory.',
      'The sampler chooses the level from the texels per pixel; MipmapMode.Linear blends two levels (trilinear).',
      'Generate levels with CmdBlitImage, moving each level from TransferDst to TransferSrc to ShaderReadOnly.',
      'Check the format supports linear filtering before blitting with Filter.Linear.',
      'Anisotropic filtering fixes surfaces seen at grazing angles, such as floors and long walls.'
    ]
  },

  // ------------------------------------------------------------------ 6
  {
    slug: 'msaa',
    title: 'Multisampling (MSAA)',
    summary: 'Smooth jagged edges by testing several points per pixel. Render into a multisampled image, resolve it into the swapchain with dynamic rendering, and count the edge pixels and the memory at 1, 4 and 8 samples.',
    minutes: 20,
    blocks: [
      { type: 'p', text: 'Every image so far tested coverage at one point per pixel, the centre. A pixel is either inside a triangle or outside, so edges become staircases (**aliasing**). In a BIM viewer the long, thin, nearly horizontal edges of beams, mullions and floor slabs make the stairs very visible, and they flicker as the camera moves.' },
      { type: 'h2', text: 'How multisampling works' },
      { type: 'p', text: 'With **MSAA**, each pixel has several **samples** at fixed positions inside it, and the rasteriser tests coverage and depth at every sample. The fragment shader still runs **once** per pixel per triangle, and its colour is stored in every covered sample. At the end, a **resolve** averages the samples into an ordinary image. An edge pixel half covered by a white triangle becomes 50% white. Try it:' },
      { type: 'widget', name: 'msaa-coverage' },
      { type: 'p', text: 'Running the shader once per pixel is what makes MSAA cheap compared with rendering at a higher resolution. Its cost is memory: a 4× colour image and its depth buffer are four times the size. It only smooths geometric edges, not detail inside a texture (that was mipmapping’s job) and not shading that changes sharply inside a triangle.' },
      { type: 'h2', text: 'What this GPU supports' },
      { type: 'p', text: 'The limits list the sample counts that work for colour and for depth attachments. A depth buffer used with a multisampled colour image must have the same count, so take the counts both support:' },
      { type: 'code', title: 'SampleCounts.cs', code: cs`
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);

var limits = gpu.Vk.GetPhysicalDeviceProperties(gpu.PhysicalDevice).Limits;
var both = limits.FramebufferColorSampleCounts & limits.FramebufferDepthSampleCounts;
Console.WriteLine($"Colour: {limits.FramebufferColorSampleCounts}");
Console.WriteLine($"Depth:  {limits.FramebufferDepthSampleCounts}");
var counts = Enum.GetValues<SampleCountFlags>().Where(c => c != 0 && both.HasFlag(c)).Select(c => (int)c).Distinct();   // some counts have two names
Console.WriteLine($"Usable sample counts: {string.Join(", ", counts)}");`, output: 'Colour: Count1Bit, Count2Bit, Count4Bit, Count8Bit\nDepth:  Count1Bit, Count2Bit, Count4Bit, Count8Bit\nUsable sample counts: 1, 2, 4, 8' },
      { type: 'h2', text: 'Rendering into a multisampled image' },
      { type: 'p', text: 'The swapchain image cannot be multisampled, so the frame needs a separate colour image with the chosen sample count, created with `TransientAttachment` usage: its samples are only needed during rendering. The pipeline’s `RasterizationSamples` must match (the `samples` parameter of `MeshPipeline`), and so must the depth image.' },
      { type: 'p', text: 'Dynamic rendering resolves for you. The colour attachment is the multisampled image, and `ResolveMode` with `ResolveImageView` names the swapchain image to average into when rendering ends. The multisampled image itself is then not needed, so its store operation is `DontCare`; on tiled mobile GPUs the samples never leave the chip. `TestFrame` takes the multisampled image as a new optional parameter:' },
      { type: 'code', title: 'Engine/TestFrame.cs', code: cs`
using Silk.NET.Vulkan;

/// <summary>Draws one frame into a swapchain image, copies it into a ReadbackBuffer and presents it. For checking pixels.</summary>
static unsafe class TestFrame
{
    public static void Draw(GpuContext gpu, Swapchain swapchain, ReadbackBuffer readback, Action<CommandBuffer> draw,
                            ClearColorValue? background = null, GpuImage? depth = null, GpuImage? msaa = null)
    {
        var vk = gpu.Vk;
        var poolInfo = new CommandPoolCreateInfo { SType = StructureType.CommandPoolCreateInfo, Flags = CommandPoolCreateFlags.TransientBit, QueueFamilyIndex = gpu.GraphicsFamily };
        CommandPool pool;
        vk.CreateCommandPool(gpu.Device, &poolInfo, null, &pool).Check("CreateCommandPool");
        var allocInfo = new CommandBufferAllocateInfo { SType = StructureType.CommandBufferAllocateInfo, CommandPool = pool, Level = CommandBufferLevel.Primary, CommandBufferCount = 1 };
        CommandBuffer cmd;
        vk.AllocateCommandBuffers(gpu.Device, &allocInfo, &cmd).Check("AllocateCommandBuffers");
        var fenceInfo = new FenceCreateInfo { SType = StructureType.FenceCreateInfo };
        Fence fence;
        vk.CreateFence(gpu.Device, &fenceInfo, null, &fence).Check("CreateFence");

        uint index;
        gpu.KhrSwapchain.AcquireNextImage(gpu.Device, swapchain.Handle, ulong.MaxValue, default, fence, &index).Check("AcquireNextImage");
        vk.WaitForFences(gpu.Device, 1, &fence, true, ulong.MaxValue);
        vk.ResetFences(gpu.Device, 1, &fence);

        var image = swapchain.Images[index];
        var begin = new CommandBufferBeginInfo { SType = StructureType.CommandBufferBeginInfo, Flags = CommandBufferUsageFlags.OneTimeSubmitBit };
        vk.BeginCommandBuffer(cmd, &begin).Check("BeginCommandBuffer");
        var colorStage = PipelineStageFlags2.ColorAttachmentOutputBit;
        Commands.Barrier(vk, cmd, image, ImageLayout.Undefined, ImageLayout.ColorAttachmentOptimal,
            colorStage, AccessFlags2.None, colorStage, AccessFlags2.ColorAttachmentWriteBit);
        var color = new RenderingAttachmentInfo
        {
            SType = StructureType.RenderingAttachmentInfo, ImageView = swapchain.Views[index], ImageLayout = ImageLayout.ColorAttachmentOptimal,
            LoadOp = AttachmentLoadOp.Clear, StoreOp = AttachmentStoreOp.Store, ClearValue = new ClearValue(background ?? new ClearColorValue(0f, 0f, 0f, 1f))
        };
        if (msaa != null)
        {
            // New: draw into the multisampled image, and average its samples into the swapchain image at the end
            msaa.Transition(cmd, ImageLayout.Undefined, ImageLayout.ColorAttachmentOptimal,
                colorStage, AccessFlags2.ColorAttachmentWriteBit, colorStage, AccessFlags2.ColorAttachmentWriteBit);
            color.ImageView = msaa.View;
            color.StoreOp = AttachmentStoreOp.DontCare;                 // only the resolved result is kept
            color.ResolveMode = ResolveModeFlags.AverageBit;
            color.ResolveImageView = swapchain.Views[index];
            color.ResolveImageLayout = ImageLayout.ColorAttachmentOptimal;
        }
        var rendering = new RenderingInfo { SType = StructureType.RenderingInfo, RenderArea = new Rect2D(new Offset2D(0, 0), swapchain.Extent), LayerCount = 1, ColorAttachmentCount = 1, PColorAttachments = &color };

        var depthStages = PipelineStageFlags2.EarlyFragmentTestsBit | PipelineStageFlags2.LateFragmentTestsBit;
        var depthAttachment = new RenderingAttachmentInfo { SType = StructureType.RenderingAttachmentInfo };
        if (depth != null)
        {
            depth.Transition(cmd, ImageLayout.Undefined, ImageLayout.DepthAttachmentOptimal,
                depthStages, AccessFlags2.DepthStencilAttachmentWriteBit,
                depthStages, AccessFlags2.DepthStencilAttachmentReadBit | AccessFlags2.DepthStencilAttachmentWriteBit);
            depthAttachment.ImageView = depth.View;
            depthAttachment.ImageLayout = ImageLayout.DepthAttachmentOptimal;
            depthAttachment.LoadOp = AttachmentLoadOp.Clear;
            depthAttachment.StoreOp = AttachmentStoreOp.DontCare;
            depthAttachment.ClearValue = new ClearValue(depthStencil: new ClearDepthStencilValue(1f, 0));
            rendering.PDepthAttachment = &depthAttachment;
        }

        vk.CmdBeginRendering(cmd, &rendering);
        var viewport = new Viewport(0, 0, swapchain.Extent.Width, swapchain.Extent.Height, 0, 1);
        vk.CmdSetViewport(cmd, 0, 1, &viewport);
        var scissor = new Rect2D(new Offset2D(0, 0), swapchain.Extent);
        vk.CmdSetScissor(cmd, 0, 1, &scissor);
        draw(cmd);
        vk.CmdEndRendering(cmd);                                        // the resolve happens here
        Commands.Barrier(vk, cmd, image, ImageLayout.ColorAttachmentOptimal, ImageLayout.TransferSrcOptimal,
            colorStage, AccessFlags2.ColorAttachmentWriteBit, PipelineStageFlags2.CopyBit, AccessFlags2.TransferReadBit);
        readback.CopyFrom(cmd, image);
        Commands.Barrier(vk, cmd, image, ImageLayout.TransferSrcOptimal, ImageLayout.PresentSrcKhr,
            PipelineStageFlags2.CopyBit, AccessFlags2.None, PipelineStageFlags2.None, AccessFlags2.None);
        vk.EndCommandBuffer(cmd).Check("EndCommandBuffer");

        var cmdInfo = new CommandBufferSubmitInfo { SType = StructureType.CommandBufferSubmitInfo, CommandBuffer = cmd };
        var submit = new SubmitInfo2 { SType = StructureType.SubmitInfo2, CommandBufferInfoCount = 1, PCommandBufferInfos = &cmdInfo };
        vk.QueueSubmit2(gpu.GraphicsQueue, 1, &submit, fence).Check("QueueSubmit2");
        vk.WaitForFences(gpu.Device, 1, &fence, true, ulong.MaxValue);
        var handle = swapchain.Handle;
        var present = new PresentInfoKHR { SType = StructureType.PresentInfoKhr, SwapchainCount = 1, PSwapchains = &handle, PImageIndices = &index };
        gpu.KhrSwapchain.QueuePresent(gpu.PresentQueue, &present);
        vk.DeviceWaitIdle(gpu.Device);
        vk.DestroyFence(gpu.Device, fence, null);
        vk.DestroyCommandPool(gpu.Device, pool, null);
    }
}` },
      { type: 'p', text: 'The resolve writes the swapchain image as a colour attachment write, in the colour attachment output stage, so the barrier after rendering is the same as before.' },
      { type: 'h2', text: 'Counting edge pixels' },
      { type: 'p', text: 'The sample draws a white triangle with two slanted edges on black, at 1, 4 and 8 samples. It prints nine pixels across the left edge along the middle row, counts the pixels in the whole frame that are neither black nor white (the smoothed edge pixels), and works out the memory the colour and depth images need:' },
      { type: 'code', title: 'Msaa.cs', code: cs`
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
using var swapchain = new Swapchain(gpu, window.FramebufferSize);
using var readback = new ReadbackBuffer(gpu, swapchain.Extent);
using var triangle = new Mesh(gpu, [new(0f, -0.8f, 0f, 1f, 1f, 1f), new(0.7f, 0.8f, 0f, 1f, 1f, 1f), new(-0.7f, 0.8f, 0f, 1f, 1f, 1f)], [0, 1, 2]);
var extent = swapchain.Extent;

foreach (var samples in new[] { SampleCountFlags.Count1Bit, SampleCountFlags.Count4Bit, SampleCountFlags.Count8Bit })
{
    using var depth = new GpuImage(gpu, extent, Format.D32Sfloat, ImageUsageFlags.DepthStencilAttachmentBit, ImageAspectFlags.DepthBit, samples: samples);
    using var msaa = samples == SampleCountFlags.Count1Bit ? null
        : new GpuImage(gpu, extent, swapchain.Format, ImageUsageFlags.ColorAttachmentBit | ImageUsageFlags.TransientAttachmentBit,
                       ImageAspectFlags.ColorBit, samples: samples);
    using var pipeline = new MeshPipeline(gpu, swapchain.Format, MeshShaders.Vertex, MeshShaders.Fragment,
                                          depthFormat: depth.Format, samples: samples);
    TestFrame.Draw(gpu, swapchain, readback, cmd =>
    {
        gpu.Vk.CmdBindPipeline(cmd, PipelineBindPoint.Graphics, pipeline.Handle);
        triangle.Draw(cmd);
    }, depth: depth, msaa: msaa);

    int edges = 0;
    for (int y = 0; y < extent.Height; y++)
        for (int x = 0; x < extent.Width; x++)
            if (readback.Pixel(x, y).R is > 0 and < 255) edges++;
    var row = Enumerable.Range(256, 9).Select(x => readback.Pixel(x, 300).R);
    long bytes = (long)extent.Width * extent.Height * 4 * (int)samples * (msaa == null ? 1 : 2);    // colour + depth, 4 bytes each
    Console.WriteLine($"{(int)samples} sample(s): row 300, x 256-264: {string.Join(" ", row.Select(r => r.ToString().PadLeft(3)))} | {edges,4} edge pixels | {bytes / 1048576.0,5:F1} MiB");
}`, output: '1 sample(s): row 300, x 256-264:   0   0   0   0 255 255 255 255 255 |    0 edge pixels |   1.8 MiB\n4 sample(s): row 300, x 256-264:   0   0   0 187 255 255 255 255 255 |  720 edge pixels |  14.6 MiB\n8 sample(s): row 300, x 256-264:   0   0   0 137 255 255 255 255 255 | 1000 edge pixels |  29.3 MiB' },
      { type: 'p', text: 'At 1 sample the edge is a hard step from 0 to 255 and no pixel in the frame is in between. With 4 samples the edge pixels take intermediate values, and with 8 there are finer steps still. The memory figures count the multisampled colour and depth images; at 1 sample there is no extra colour image, only depth. At a 4K resolution, 8× MSAA costs over 500 MiB, which is why many engines prefer 4×, or post-process anti-aliasing (FXAA, TAA) that works on the final image.' },
      { type: 'note', kind: 'info', text: 'MSAA leaves aliasing *inside* triangles alone. If a shader produces sharp detail (thin lines in a texture without mipmaps, or specular highlights), enable the `sampleRateShading` feature and set `MinSampleShading` in the multisample state to run the shader per sample, at a much higher cost.' },
      { type: 'quiz', question: 'With 4× MSAA, how many times does the fragment shader run for a pixel fully inside one triangle?', options: ['Once', 'Four times', 'Twice', 'It depends on the depth format'], answer: 0, explain: 'Coverage and depth are tested per sample, but the shader runs once per pixel per triangle and its result is copied to every covered sample. That is the saving over rendering at 4 times the resolution.' },
      { type: 'quiz', question: 'Why can the multisampled colour image use StoreOp DontCare?', options: ['MSAA images cannot be stored', 'The resolve at the end of rendering produces the final image, so the individual samples are never needed again', 'DontCare is faster to clear', 'It is required by the swapchain'], answer: 1, explain: 'After the resolve only the averaged image matters. DontCare lets tiled GPUs keep the samples on chip and never write them to memory.' },
      { type: 'exercise', task: 'For **1, 2, 4 and 8** samples, count how many **different shades** appear in the frame. With n samples per pixel, a white-on-black edge can produce at most n + 1 shades.', hint: 'Copy Msaa.cs, add `Count2Bit`, and replace the edge count with a `HashSet<byte>` of the red values of every pixel.', solution: cs`
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600) });
window.Initialize();
using var gpu = new GpuContext(window);
using var swapchain = new Swapchain(gpu, window.FramebufferSize);
using var readback = new ReadbackBuffer(gpu, swapchain.Extent);
using var triangle = new Mesh(gpu, [new(0f, -0.8f, 0f, 1f, 1f, 1f), new(0.7f, 0.8f, 0f, 1f, 1f, 1f), new(-0.7f, 0.8f, 0f, 1f, 1f, 1f)], [0, 1, 2]);
var extent = swapchain.Extent;

foreach (var samples in new[] { SampleCountFlags.Count1Bit, SampleCountFlags.Count2Bit, SampleCountFlags.Count4Bit, SampleCountFlags.Count8Bit })
{
    using var depth = new GpuImage(gpu, extent, Format.D32Sfloat, ImageUsageFlags.DepthStencilAttachmentBit, ImageAspectFlags.DepthBit, samples: samples);
    using var msaa = samples == SampleCountFlags.Count1Bit ? null
        : new GpuImage(gpu, extent, swapchain.Format, ImageUsageFlags.ColorAttachmentBit | ImageUsageFlags.TransientAttachmentBit,
                       ImageAspectFlags.ColorBit, samples: samples);
    using var pipeline = new MeshPipeline(gpu, swapchain.Format, MeshShaders.Vertex, MeshShaders.Fragment, depthFormat: depth.Format, samples: samples);
    TestFrame.Draw(gpu, swapchain, readback, cmd =>
    {
        gpu.Vk.CmdBindPipeline(cmd, PipelineBindPoint.Graphics, pipeline.Handle);
        triangle.Draw(cmd);
    }, depth: depth, msaa: msaa);
    var shades = new HashSet<byte>();
    for (int y = 0; y < extent.Height; y++)
        for (int x = 0; x < extent.Width; x++) shades.Add(readback.Pixel(x, y).R);
    Console.WriteLine($"{(int)samples} sample(s): {shades.Count} shades: {string.Join(" ", shades.Order())}");
}`, output: '1 sample(s): 2 shades: 0 255\n2 sample(s): 3 shades: 0 187 255\n4 sample(s): 5 shades: 0 137 187 225 255\n8 sample(s): 9 shades: 0 99 137 165 187 207 225 241 255' }
    ],
    keyPoints: [
      'MSAA tests coverage and depth at several samples per pixel but runs the fragment shader once per pixel.',
      'Render into a multisampled image (TransientAttachment, StoreOp DontCare) and resolve it into the swapchain.',
      'Dynamic rendering resolves via ResolveMode and ResolveImageView on the colour attachment.',
      'The pipeline’s sample count and the depth image’s must match the colour image’s.',
      'Usable counts are FramebufferColorSampleCounts & FramebufferDepthSampleCounts.',
      'Memory grows with the sample count; MSAA smooths geometric edges only.'
    ]
  },

  // ------------------------------------------------------------------ 7
  {
    slug: 'camera-controls',
    title: 'An orbit camera for navigating a model',
    summary: 'Build the camera every BIM viewer has: orbit around a target, pan, zoom and zoom-to-fit. Connect it to the mouse with Silk.NET.Input, set near and far planes from the model, and check it on the GPU.',
    minutes: 22,
    blocks: [
      { type: 'p', text: 'People inspect a building model by turning it around, sliding it sideways and zooming in to details. An **orbit camera** gives exactly that. Instead of storing the eye position, it stores a **target** point and the camera’s position around it, in **spherical coordinates**:' },
      { type: 'table', head: ['Value', 'Meaning', 'Mouse'], rows: [
        ['Target', 'The point the camera looks at and orbits around', 'Right-drag pans: moves the target sideways'],
        ['Yaw', 'Angle around the vertical (Z) axis', 'Left-drag left and right'],
        ['Pitch', 'Angle above the horizontal, kept between −89° and 89°', 'Left-drag up and down'],
        ['Distance', 'From the target to the eye', 'The wheel zooms by a fixed ratio per notch']
      ] },
      { type: 'p', text: 'The eye is the target plus the distance along a direction built from yaw and pitch: (sin yaw · cos pitch, −cos yaw · cos pitch, sin pitch). At yaw 0 the camera stands on the −Y side, looking north along +Y, the usual front view of a Z-up model. Turn and tilt it here:' },
      { type: 'widget', name: 'orbit-camera' },
      { type: 'h2', text: 'Details that matter' },
      { type: 'ul', items: [
        '**Clamp the pitch.** At exactly ±90° the view direction is parallel to the up vector, and `CreateLookAt` divides by zero. The exercise shows the result.',
        '**Zoom by a ratio, not a step.** Multiplying the distance by 0.9 per wheel notch feels the same at 1,000 m and at 1 m. A fixed step is far too slow when far away and overshoots the target up close.',
        '**Pan by the right amount.** For the model under the cursor to follow the mouse exactly, convert pixels to metres at the target’s distance: the view is 2 · distance · tan(fov / 2) metres tall.',
        '**Frame the model.** For zoom-to-fit, put the target at the centre of the bounding box and back off until its bounding sphere fits the narrower field of view: distance = radius / sin(fov / 2).',
        '**Set near and far from the model.** With the scene’s bounding sphere known, the near plane can sit just in front of it and the far plane just behind it, which keeps depth precision high at any zoom.'
      ] },
      { type: 'code', title: 'Engine/OrbitCamera.cs', code: cs`
using System.Numerics;

/// <summary>A camera circling a target in a Z-up world: orbit, pan, zoom and zoom-to-fit, with near and far set from the scene.</summary>
sealed class OrbitCamera
{
    public Vector3 Target;
    public float Distance = 10f;
    public float Yaw;                           // degrees around +Z; 0 looks along +Y from the -Y side
    public float Pitch = 30f;                   // degrees above the horizontal
    public float FovY = 45f;                    // vertical field of view, degrees
    public float DegreesPerPixel = 0.3f;
    Vector3 sceneCentre;
    float sceneRadius = 1f;

    public Vector3 Eye
    {
        get
        {
            float yaw = Yaw * MathF.PI / 180f, pitch = Pitch * MathF.PI / 180f;
            var direction = new Vector3(MathF.Sin(yaw) * MathF.Cos(pitch), -MathF.Cos(yaw) * MathF.Cos(pitch), MathF.Sin(pitch));
            return Target + direction * Distance;
        }
    }

    public Matrix4x4 View => Camera.LookAt(Eye, Target);

    /// <summary>Near and far hug the scene's bounding sphere, so depth precision stays high at any zoom.</summary>
    public Matrix4x4 Projection(float aspect)
    {
        float toCentre = Vector3.Distance(Eye, sceneCentre);
        float far = toCentre + sceneRadius;
        float near = MathF.Max(far / 10_000f, toCentre - sceneRadius);     // inside the sphere: as close as precision allows
        return Camera.Perspective(FovY, aspect, near, far);
    }

    /// <summary>Left-drag: turn around the target. Dragging right turns the model to the right.</summary>
    public void Orbit(float dxPixels, float dyPixels)
    {
        Yaw -= dxPixels * DegreesPerPixel;
        Pitch = Math.Clamp(Pitch + dyPixels * DegreesPerPixel, -89f, 89f);
    }

    /// <summary>Wheel: move 10% closer per notch, never through the target.</summary>
    public void Zoom(float notches) => Distance = MathF.Max(0.01f, Distance * MathF.Pow(0.9f, notches));

    /// <summary>Right-drag: slide the target so the point under the cursor follows it.</summary>
    public void Pan(float dxPixels, float dyPixels, float viewportHeight)
    {
        var forward = Vector3.Normalize(Target - Eye);
        var right = Vector3.Normalize(Vector3.Cross(forward, Vector3.UnitZ));
        var up = Vector3.Cross(right, forward);
        float metresPerPixel = 2f * Distance * MathF.Tan(FovY * MathF.PI / 360f) / viewportHeight;
        Target += (-dxPixels * right + dyPixels * up) * metresPerPixel;
    }

    /// <summary>Zoom to fit: aim at the box's centre from far enough away that its bounding sphere fills the view.</summary>
    public void Frame(Vector3 min, Vector3 max, float aspect)
    {
        sceneCentre = Target = (min + max) / 2f;
        sceneRadius = Vector3.Distance(min, max) / 2f;
        float halfY = FovY * MathF.PI / 360f;
        float halfX = MathF.Atan(MathF.Tan(halfY) * aspect);
        Distance = sceneRadius / MathF.Sin(MathF.Min(halfX, halfY));         // the narrower field of view decides
    }
}` },
      { type: 'h2', text: 'Connecting the mouse' },
      { type: 'p', text: 'Silk.NET’s input package (`dotnet add package Silk.NET.Input`) gives each window a set of mice and keyboards with events. The camera needs the movement since the last event, so the handler remembers the previous position:' },
      { type: 'code', title: 'Engine/OrbitInput.cs', code: cs`
using System.Numerics;
using Silk.NET.Input;
using Silk.NET.Windowing;

static class OrbitInput
{
    /// <summary>Left-drag orbits, right-drag pans, the wheel zooms. Dispose the result when the window closes.</summary>
    public static IInputContext Attach(IWindow window, OrbitCamera camera)
    {
        var input = window.CreateInput();
        foreach (var mouse in input.Mice)
        {
            Vector2 last = mouse.Position;
            mouse.MouseMove += (m, position) =>
            {
                var delta = position - last;
                last = position;
                if (m.IsButtonPressed(MouseButton.Left)) camera.Orbit(delta.X, delta.Y);
                else if (m.IsButtonPressed(MouseButton.Right)) camera.Pan(delta.X, delta.Y, window.FramebufferSize.Y);
            };
            mouse.Scroll += (_, wheel) => camera.Zoom(wheel.Y);
        }
        return input;
    }
}` },
      { type: 'p', text: 'In the render loop from module 2, the camera simply replaces the fixed matrix. Each frame computes `camera.View * camera.Projection(aspect)` and pushes it, and because the input events update the camera between frames, the model moves as the mouse does.' },
      { type: 'h2', text: 'Checking it on the GPU' },
      { type: 'p', text: 'The sample frames a box the size of a small building, 20 × 10 × 6 m, from three directions. For each view it prints the eye position, the colour at the window centre (the normal colour of the face the camera sees) and the rectangle of pixels the building covers, which must sit inside the window. Then it pans by 100 pixels and checks the building’s centre moved by 100 pixels. The building is built by a small engine helper:' },
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
}` },
      { type: 'code', title: 'Orbit.cs', code: cs`
using System.Numerics;
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
using var swapchain = new Swapchain(gpu, window.FramebufferSize);
using var readback = new ReadbackBuffer(gpu, swapchain.Extent);
using var depth = new GpuImage(gpu, swapchain.Extent, Format.D32Sfloat, ImageUsageFlags.DepthStencilAttachmentBit, ImageAspectFlags.DepthBit);
using var pipeline = new MeshPipeline(gpu, swapchain.Format, ModelShaders.Vertex, ModelShaders.Normals,
                                      pushConstants: [new(ShaderStageFlags.VertexBit, 0, 64)], depthFormat: depth.Format, vertexLayout: MeshVertex.Layout);
Vector3 min = new(-10f, -5f, 0f), max = new(10f, 5f, 6f);
var (vertices, indices) = Shapes.Box(min, max);
using var building = new Mesh<MeshVertex>(gpu, vertices, indices);
float aspect = swapchain.Extent.Width / (float)swapchain.Extent.Height;
var camera = new OrbitCamera { Pitch = 25f };
camera.Frame(min, max, aspect);
Console.WriteLine($"Frame: target {camera.Target}, distance {camera.Distance:F1} m");

void Render(string label)
{
    var mvp = camera.View * camera.Projection(aspect);
    TestFrame.Draw(gpu, swapchain, readback, cmd =>
    {
        gpu.Vk.CmdBindPipeline(cmd, PipelineBindPoint.Graphics, pipeline.Handle);
        Camera.Push(gpu, cmd, pipeline.Layout, mvp);
        building.Draw(cmd);
    }, depth: depth);
    int x0 = 800, x1 = -1, y0 = 600, y1 = -1;
    for (int y = 0; y < 600; y++)
        for (int x = 0; x < 800; x++)
            if (readback.Pixel(x, y) != (0, 0, 0)) { x0 = Math.Min(x0, x); x1 = Math.Max(x1, x); y0 = Math.Min(y0, y); y1 = Math.Max(y1, y); }
    var eye = camera.Eye;
    Console.WriteLine($"{label,-9} eye ({eye.X,6:F1}, {eye.Y,6:F1}, {eye.Z,5:F1})  centre {readback.Pixel(400, 300),-15} covers x {x0}-{x1}, y {y0}-{y1}");
}

foreach (float yaw in new[] { 0f, 90f, 200f })
{
    camera.Yaw = yaw;
    Render($"yaw {yaw}");
}
camera.Yaw = 0f;
var before = Camera.Project(camera.Target, camera.View * camera.Projection(aspect), swapchain.Extent);
camera.Pan(100f, 0f, 600f);
var mvpAfter = camera.View * camera.Projection(aspect);
var after = Camera.Project((min + max) / 2f, mvpAfter, swapchain.Extent);
Console.WriteLine($"Pan 100 px right: building centre moved from x {before.X:F1} to {after.X:F1}");
camera.Zoom(3f);
Console.WriteLine($"Zoom 3 notches: distance {camera.Distance:F1} m");`, output: 'Frame: target <0, 0, 3>, distance 30.2 m\nyaw 0     eye (   0.0,  -27.4,  15.8)  centre (187, 0, 187)   covers x 104-695, y 196-429\nyaw 90    eye (  27.4,    0.0,  15.8)  centre (187, 187, 255) covers x 218-581, y 168-523\nyaw 200   eye (  -9.4,   25.8,  15.8)  centre (187, 255, 187) covers x 111-666, y 177-483\nPan 100 px right: building centre moved from x 400.0 to 500.0\nZoom 3 notches: distance 22.1 m' },
      { type: 'p', text: 'Zoom-to-fit put the building in the window from every side, with a margin, because a bounding sphere is a little larger than the box it contains. From yaw 0 the window centre shows the −Y face (purple) and from yaw 200 the +Y face (green). From yaw 90 the camera looks at the narrow 10 m end, so the ray through the centre passes above it and lands on the roof (+Z, blue). The pan moved the building exactly 100 pixels, as the metres-per-pixel calculation intended.' },
      { type: 'note', kind: 'tip', text: 'Good viewers add a few more controls on top of this camera: double-click to set the target to the surface point under the cursor (module 9’s picking provides the point), zoom towards the cursor instead of the window centre, and preset views (top, front, isometric) that animate the yaw and pitch rather than jumping.' },
      { type: 'quiz', question: 'A model’s bounding sphere has a radius of 30 m and the narrower field of view is 45°. What distance frames it?', options: ['30 m', 'About 78 m', 'About 72 m', '60 m'], answer: 1, explain: 'distance = radius / sin(fov / 2) = 30 / sin 22.5° ≈ 30 / 0.383 ≈ 78 m. At that distance the sphere just touches the edges of the view.' },
      { type: 'quiz', question: 'Why does the camera zoom by multiplying the distance by 0.9 per wheel notch instead of subtracting 1 m?', options: ['Multiplication is faster', 'So each notch is the same fraction of the distance: useful at 1,000 m and at 1 m', 'Because the wheel reports fractions', 'To avoid negative pitch'], answer: 1, explain: 'A fixed step would take hundreds of notches to approach a large site, then jump through the target up close. A ratio feels the same at every scale.' },
      { type: 'exercise', task: 'Show why the pitch is clamped. Build `Camera.LookAt` from a target at the origin to an eye 10 m away at pitch 89° and at exactly 90°, and print the view matrix’s first row and whether it contains NaN.', hint: 'Compute the eye as (sin yaw · cos pitch, −cos yaw · cos pitch, sin pitch) × 10 with yaw 0. At 90° the direction is exactly +Z, parallel to the up vector, so the cross product inside CreateLookAt is zero. In single precision cos 90° is not quite 0, so build that eye directly as (0, 0, 10).', solution: cs`
using System.Numerics;

foreach (var (label, eye) in new[]
{
    ("Pitch 89", new Vector3(0f, -MathF.Cos(89f * MathF.PI / 180f), MathF.Sin(89f * MathF.PI / 180f)) * 10f),
    ("Pitch 90", new Vector3(0f, 0f, 10f))
})
{
    var view = Camera.LookAt(eye, Vector3.Zero);
    bool broken = float.IsNaN(view.M11) || float.IsNaN(view.M12) || float.IsNaN(view.M13);
    Console.WriteLine($"{label}: first row ({view.M11:F3}, {view.M12:F3}, {view.M13:F3}){(broken ? "  <- NaN: the view is undefined" : "")}");
}`, output: 'Pitch 89: first row (1.000, 0.000, -0.000)\nPitch 90: first row (NaN, NaN, -0.000)  <- NaN: the view is undefined' }
    ],
    keyPoints: [
      'An orbit camera stores a target, yaw, pitch and distance; the eye is computed from them.',
      'Clamp the pitch below ±90°, where the view direction is parallel to the up vector.',
      'Zoom by a ratio per wheel notch; pan by pixels converted to metres at the target’s distance.',
      'Zoom-to-fit: target the bounding box centre, distance = radius / sin(half the narrower field of view).',
      'Set near and far from the scene’s bounding sphere to keep depth precision at every zoom level.',
      'Silk.NET.Input’s mouse events drive the camera; the render loop pushes View × Projection each frame.'
    ]
  },
];
