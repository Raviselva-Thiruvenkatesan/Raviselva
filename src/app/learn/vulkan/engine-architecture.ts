import { Lesson } from '../learn.types';
import { cs } from '../csharp/cs';

/**
 * Vulkan module 5. Every C# sample was run with Silk.NET 2.23 on an Intel Iris Xe (Vulkan 1.4 driver) on Windows 11;
 * the outputs are from that machine. Code blocks titled Engine/*.cs extend the engine from modules 2 to 4: each sample uses
 * the latest version of every Engine file shown before it.
 */
export const ENGINE_ARCHITECTURE: Lesson[] = [
  // ------------------------------------------------------------------ 1
  {
    slug: 'engine-structure',
    title: 'Structuring a render engine in C#',
    summary: 'Organise the engine into layers that depend only downwards: device, resources, frames, scene and renderer. Replace module 2’s Renderer with a FrameLoop that knows nothing about what is drawn, and draw a small structure from one shared mesh.',
    minutes: 24,
    blocks: [
      { type: 'p', text: 'Four modules have produced about thirty engine classes, and every sample has wired them together by hand. That works for a program that draws one frame and quits. A BIM viewer runs for hours: models are opened and closed, elements are selected and edited, the window is resized, and shaders change while you develop them. Before adding those features, the engine needs a shape that keeps each class’s job small and makes clear **who creates what, who may call whom, and who destroys what**.' },
      { type: 'h2', text: 'Layers' },
      { type: 'p', text: 'The usual answer is a stack of **layers**. Each layer may use the layers below it and never the ones above. The lower a layer is, the less often its objects change:' },
      { type: 'table', head: ['Layer', 'Engine classes', 'Lives for', 'Makes Vulkan calls?'], rows: [
        ['**Platform**', 'IWindow, IInputContext (Silk.NET)', 'The whole run', 'No'],
        ['**Device**', '`GpuContext`', 'The whole run', 'Yes: instance, device, queues'],
        ['**Resources**', '`GpuBuffer`, `GpuImage`, `Mesh<T>`, `Texture`, `MeshPipeline`', 'From loading until no longer used', 'Yes: create and destroy'],
        ['**Frames**', '`FrameLoop`, `Frame`', 'One frame (the loop itself: the whole run)', 'Yes: synchronisation, submit, present'],
        ['**Scene**', '`Scene`, `SceneObject`, `OrbitCamera`', 'Edited by the application at any time', 'No: plain C# data'],
        ['**Rendering**', '`SceneRenderer`', 'The whole run', 'Yes: records commands'],
        ['**Application**', '`Program.cs`', 'The whole run', 'Creates and connects the rest']
      ] },
      { type: 'p', text: 'Click a class to see what it owns and what it uses. Arrows only ever point downwards:' },
      { type: 'widget', name: 'engine-layers' },
      { type: 'ul', items: [
        '**Dependencies point down.** A `Mesh` does not know there is a renderer; the renderer knows meshes. If a lower class needs to tell a higher one something, it raises an event that the higher one subscribes to.',
        '**The scene is plain data.** A `SceneObject` refers to a mesh, but it holds no command buffers, fences or descriptor sets, and changing it makes no Vulkan call. The application (or a file loader, or an undo stack) can edit it freely; the renderer reads it once per frame.',
        '**Whoever creates an object disposes of it.** The application creates the device, the loop and the meshes, so it destroys them, in the reverse order of creation. C#’s `using var` does exactly that.',
        '**Meshes are shared; objects are not.** A building has hundreds of identical windows. They are one mesh and hundreds of scene objects, each with its own world matrix.'
      ] },
      { type: 'h2', text: 'The frame loop' },
      { type: 'p', text: 'Module 2’s `Renderer` did two jobs: it ran the frames (fences, semaphores, acquire, submit, present, resizing), and it drew a triangle with a pipeline it created itself. The first job is the same for every program; the second is different every time. `FrameLoop` keeps only the first job. Between `Begin` and `End`, whoever owns the drawing records whatever it wants into the frame’s command buffer.' },
      { type: 'p', text: 'A `Frame` carries the command buffer, the swapchain image and that image’s **current layout, stage and access**. Every barrier needs to know what the image went through last. Module 4’s `TestFrame` knew this because the whole frame was in one method; once several classes record parts of a frame, the state has to travel with it. The loop also owns the depth buffer, because its size follows the swapchain.' },
      { type: 'code', title: 'Engine/FrameLoop.cs', code: cs`
using Silk.NET.Vulkan;
using Silk.NET.Windowing;
using VkSemaphore = Silk.NET.Vulkan.Semaphore;

/// <summary>One frame being recorded: its command buffer, its swapchain image, and what has happened to that image so far.</summary>
sealed class Frame
{
    public CommandBuffer Cmd;
    public long Number;                         // 0, 1, 2, ... for the whole run
    public int Slot;                            // which set of per-frame objects it uses: Number % FramesInFlight
    public uint ImageIndex;
    public Image Image;
    public ImageView View;
    public Extent2D Extent;
    public ImageLayout Layout;                  // the image's layout after the commands recorded so far ...
    public PipelineStageFlags2 Stage;           // ... and the last stage and access that touched it
    public AccessFlags2 Access;
}

/// <summary>Runs frames: swapchain, frames in flight, depth buffer, resizing. It does not know what the frames draw.</summary>
sealed unsafe class FrameLoop : IDisposable
{
    public const int FramesInFlight = 2;
    public const Format DepthFormat = Format.D32Sfloat;
    /// <summary>The stages that wait for the acquired image: drawing into it or copying into it.</summary>
    const PipelineStageFlags2 AcquireStages = PipelineStageFlags2.ColorAttachmentOutputBit | PipelineStageFlags2.AllTransferBit;

    readonly GpuContext gpu;
    readonly IWindow window;
    readonly bool vsync;
    readonly CommandPool pool;
    readonly CommandBuffer[] commandBuffers = new CommandBuffer[FramesInFlight];
    readonly VkSemaphore[] imageAvailable = new VkSemaphore[FramesInFlight];
    readonly Fence[] inFlight = new Fence[FramesInFlight];
    VkSemaphore[] renderFinished = [];
    bool resized;
    long completed = -1;                        // the newest frame known to have finished on the GPU

    public Swapchain Swapchain { get; private set; }
    public GpuImage Depth { get; private set; }
    public long FrameNumber { get; private set; }           // the frame being recorded, or the next one
    public ClearColorValue Background = new(0.02f, 0.02f, 0.03f, 1f);
    /// <summary>Raised by Begin with the newest frame number the GPU has finished (lesson 2 uses it).</summary>
    public event Action<long>? FrameCompleted;
    /// <summary>Raised after the swapchain and the depth buffer were rebuilt for a new window size.</summary>
    public event Action? Resized;

    public FrameLoop(GpuContext gpu, IWindow window, bool vsync = true)
    {
        this.gpu = gpu; this.window = window; this.vsync = vsync;
        Swapchain = new Swapchain(gpu, window.FramebufferSize, vsync);
        Depth = CreateDepth();
        window.FramebufferResize += _ => resized = true;

        var vk = gpu.Vk;
        var poolInfo = new CommandPoolCreateInfo { SType = StructureType.CommandPoolCreateInfo, Flags = CommandPoolCreateFlags.ResetCommandBufferBit, QueueFamilyIndex = gpu.GraphicsFamily };
        CommandPool p;
        vk.CreateCommandPool(gpu.Device, &poolInfo, null, &p).Check("CreateCommandPool");
        pool = p;
        var allocInfo = new CommandBufferAllocateInfo { SType = StructureType.CommandBufferAllocateInfo, CommandPool = pool, Level = CommandBufferLevel.Primary, CommandBufferCount = FramesInFlight };
        fixed (CommandBuffer* cb = commandBuffers) vk.AllocateCommandBuffers(gpu.Device, &allocInfo, cb).Check("AllocateCommandBuffers");
        var semInfo = new SemaphoreCreateInfo { SType = StructureType.SemaphoreCreateInfo };
        var fenceInfo = new FenceCreateInfo { SType = StructureType.FenceCreateInfo, Flags = FenceCreateFlags.SignaledBit };
        for (int i = 0; i < FramesInFlight; i++)
        {
            fixed (VkSemaphore* s = &imageAvailable[i]) vk.CreateSemaphore(gpu.Device, &semInfo, null, s).Check("CreateSemaphore");
            fixed (Fence* f = &inFlight[i]) vk.CreateFence(gpu.Device, &fenceInfo, null, f).Check("CreateFence");
        }
        CreateRenderFinished();
    }

    /// <summary>Waits for this slot's previous frame, acquires an image and begins recording. False: skip this frame.</summary>
    public bool Begin(out Frame frame)
    {
        frame = null!;
        var size = window.FramebufferSize;
        if (size.X == 0 || size.Y == 0) return false;                       // minimised: nothing to draw into
        var vk = gpu.Vk;
        int slot = (int)(FrameNumber % FramesInFlight);
        var fence = inFlight[slot];
        vk.WaitForFences(gpu.Device, 1, &fence, true, ulong.MaxValue);
        completed = Math.Max(completed, FrameNumber - FramesInFlight);      // this slot's last frame, and every frame before it
        FrameCompleted?.Invoke(completed);

        uint index;
        var acquired = gpu.KhrSwapchain.AcquireNextImage(gpu.Device, Swapchain.Handle, ulong.MaxValue, imageAvailable[slot], default, &index);
        if (acquired == Result.ErrorOutOfDateKhr) { Recreate(); return false; }   // fence not reset: still signalled
        acquired.Check("AcquireNextImage");
        vk.ResetFences(gpu.Device, 1, &fence);

        var cmd = commandBuffers[slot];
        vk.ResetCommandBuffer(cmd, 0);
        var begin = new CommandBufferBeginInfo { SType = StructureType.CommandBufferBeginInfo, Flags = CommandBufferUsageFlags.OneTimeSubmitBit };
        vk.BeginCommandBuffer(cmd, &begin).Check("BeginCommandBuffer");
        frame = new Frame
        {
            Cmd = cmd, Number = FrameNumber, Slot = slot, ImageIndex = index,
            Image = Swapchain.Images[index], View = Swapchain.Views[index], Extent = Swapchain.Extent,
            Layout = ImageLayout.Undefined, Stage = AcquireStages, Access = AccessFlags2.None
        };
        return true;
    }

    /// <summary>Records a barrier taking the frame's image from its current state to a new one.</summary>
    public void Transition(Frame frame, ImageLayout layout, PipelineStageFlags2 stage, AccessFlags2 access)
    {
        Commands.Barrier(gpu.Vk, frame.Cmd, frame.Image, frame.Layout, layout, frame.Stage, frame.Access, stage, access);
        (frame.Layout, frame.Stage, frame.Access) = (layout, stage, access);
    }

    /// <summary>Begins dynamic rendering into the frame's image and the depth buffer, both cleared.
    /// secondary: the draws will come from secondary command buffers (lesson 7), which set their own viewport.</summary>
    public void BeginRendering(Frame frame, bool secondary = false)
    {
        Transition(frame, ImageLayout.ColorAttachmentOptimal, PipelineStageFlags2.ColorAttachmentOutputBit, AccessFlags2.ColorAttachmentWriteBit);
        var depthStages = PipelineStageFlags2.EarlyFragmentTestsBit | PipelineStageFlags2.LateFragmentTestsBit;
        Depth.Transition(frame.Cmd, ImageLayout.Undefined, ImageLayout.DepthAttachmentOptimal,      // the previous frame's depth writes first
            depthStages, AccessFlags2.DepthStencilAttachmentWriteBit,
            depthStages, AccessFlags2.DepthStencilAttachmentReadBit | AccessFlags2.DepthStencilAttachmentWriteBit);
        var color = new RenderingAttachmentInfo
        {
            SType = StructureType.RenderingAttachmentInfo, ImageView = frame.View, ImageLayout = ImageLayout.ColorAttachmentOptimal,
            LoadOp = AttachmentLoadOp.Clear, StoreOp = AttachmentStoreOp.Store, ClearValue = new ClearValue(Background)
        };
        var depth = new RenderingAttachmentInfo
        {
            SType = StructureType.RenderingAttachmentInfo, ImageView = Depth.View, ImageLayout = ImageLayout.DepthAttachmentOptimal,
            LoadOp = AttachmentLoadOp.Clear, StoreOp = AttachmentStoreOp.DontCare, ClearValue = new ClearValue(depthStencil: new ClearDepthStencilValue(1f, 0))
        };
        var rendering = new RenderingInfo
        {
            SType = StructureType.RenderingInfo, Flags = secondary ? RenderingFlags.ContentsSecondaryCommandBuffersBit : 0,
            RenderArea = new Rect2D(new Offset2D(0, 0), frame.Extent), LayerCount = 1,
            ColorAttachmentCount = 1, PColorAttachments = &color, PDepthAttachment = &depth
        };
        gpu.Vk.CmdBeginRendering(frame.Cmd, &rendering);
        if (!secondary) SetViewport(frame.Cmd, frame.Extent);
    }

    public void EndRendering(Frame frame) => gpu.Vk.CmdEndRendering(frame.Cmd);

    /// <summary>Sets a viewport and scissor covering the whole extent (both are dynamic state in every engine pipeline).</summary>
    public void SetViewport(CommandBuffer cmd, Extent2D extent)
    {
        var viewport = new Viewport(0, 0, extent.Width, extent.Height, 0, 1);
        gpu.Vk.CmdSetViewport(cmd, 0, 1, &viewport);
        var scissor = new Rect2D(new Offset2D(0, 0), extent);
        gpu.Vk.CmdSetScissor(cmd, 0, 1, &scissor);
    }

    /// <summary>Optionally copies the image into capture, then submits the frame and presents it.</summary>
    public void End(Frame frame, ReadbackBuffer? capture = null)
    {
        var vk = gpu.Vk;
        if (capture != null)
        {
            Transition(frame, ImageLayout.TransferSrcOptimal, PipelineStageFlags2.CopyBit, AccessFlags2.TransferReadBit);
            capture.CopyFrom(frame.Cmd, frame.Image);
        }
        Transition(frame, ImageLayout.PresentSrcKhr, PipelineStageFlags2.None, AccessFlags2.None);
        vk.EndCommandBuffer(frame.Cmd).Check("EndCommandBuffer");

        var wait = new SemaphoreSubmitInfo { SType = StructureType.SemaphoreSubmitInfo, Semaphore = imageAvailable[frame.Slot], StageMask = AcquireStages };
        var signal = new SemaphoreSubmitInfo { SType = StructureType.SemaphoreSubmitInfo, Semaphore = renderFinished[frame.ImageIndex], StageMask = PipelineStageFlags2.AllCommandsBit };
        var cmdInfo = new CommandBufferSubmitInfo { SType = StructureType.CommandBufferSubmitInfo, CommandBuffer = frame.Cmd };
        var submit = new SubmitInfo2
        {
            SType = StructureType.SubmitInfo2, WaitSemaphoreInfoCount = 1, PWaitSemaphoreInfos = &wait,
            CommandBufferInfoCount = 1, PCommandBufferInfos = &cmdInfo, SignalSemaphoreInfoCount = 1, PSignalSemaphoreInfos = &signal
        };
        vk.QueueSubmit2(gpu.GraphicsQueue, 1, &submit, inFlight[frame.Slot]).Check("QueueSubmit2");

        var finished = renderFinished[frame.ImageIndex];
        var handle = Swapchain.Handle;
        uint index = frame.ImageIndex;
        var present = new PresentInfoKHR { SType = StructureType.PresentInfoKhr, WaitSemaphoreCount = 1, PWaitSemaphores = &finished, SwapchainCount = 1, PSwapchains = &handle, PImageIndices = &index };
        var presented = gpu.KhrSwapchain.QueuePresent(gpu.PresentQueue, &present);
        FrameNumber++;
        if (presented == Result.ErrorOutOfDateKhr || presented == Result.SuboptimalKhr || resized) Recreate();
        else presented.Check("QueuePresent");
    }

    /// <summary>True once the GPU has finished frame n.</summary>
    public bool IsComplete(long n)
    {
        if (n <= completed) return true;
        if (n >= FrameNumber) return false;                                 // not submitted yet
        return gpu.Vk.GetFenceStatus(gpu.Device, inFlight[n % FramesInFlight]) == Result.Success;
    }

    /// <summary>Waits until the GPU has finished every frame submitted so far: before reading a capture, and before shutting down.</summary>
    public void WaitIdle()
    {
        gpu.Vk.DeviceWaitIdle(gpu.Device);
        completed = FrameNumber - 1;
    }

    GpuImage CreateDepth() => new(gpu, Swapchain.Extent, DepthFormat, ImageUsageFlags.DepthStencilAttachmentBit, ImageAspectFlags.DepthBit);

    void Recreate()
    {
        resized = false;
        var size = window.FramebufferSize;
        if (size.X == 0 || size.Y == 0) return;                             // minimised: try again when restored
        WaitIdle();
        var old = Swapchain;
        Swapchain = new Swapchain(gpu, size, vsync, old.Handle);
        old.Dispose();
        Depth.Dispose();
        Depth = CreateDepth();
        DestroyRenderFinished();
        CreateRenderFinished();                                             // the image count may have changed
        Resized?.Invoke();
    }

    void CreateRenderFinished()
    {
        var semInfo = new SemaphoreCreateInfo { SType = StructureType.SemaphoreCreateInfo };
        renderFinished = new VkSemaphore[Swapchain.Images.Length];
        for (int i = 0; i < renderFinished.Length; i++)
            fixed (VkSemaphore* s = &renderFinished[i]) gpu.Vk.CreateSemaphore(gpu.Device, &semInfo, null, s).Check("CreateSemaphore");
    }

    void DestroyRenderFinished()
    {
        foreach (var s in renderFinished) gpu.Vk.DestroySemaphore(gpu.Device, s, null);
    }

    public void Dispose()
    {
        var vk = gpu.Vk;
        WaitIdle();
        DestroyRenderFinished();
        foreach (var s in imageAvailable) vk.DestroySemaphore(gpu.Device, s, null);
        foreach (var f in inFlight) vk.DestroyFence(gpu.Device, f, null);
        vk.DestroyCommandPool(gpu.Device, pool, null);
        Depth.Dispose();
        Swapchain.Dispose();
    }
}` },
      { type: 'p', text: 'Three details are new compared with module 2. `AcquireStages` makes both drawing and copying wait for the acquired image, because lesson 6 will copy into it instead of drawing. `FrameCompleted` and `IsComplete` report which frames the GPU has finished; nothing uses them yet, but lesson 2 builds safe deletion on them. And the `secondary` flag of `BeginRendering` prepares for lesson 7, where several threads record the draws.' },
      { type: 'h2', text: 'The scene and the renderer' },
      { type: 'p', text: 'Every object is drawn with the same small shader pair. The vertex shader takes the `MeshVertex` layout from module 4 and one 80-byte push constant: the object’s model-view-projection matrix and its colour. The fragment shader darkens vertical faces a little, so boxes read as solids before module 6 adds real lighting:' },
      { type: 'code', title: 'Engine/SceneShaders.cs', code: cs`
using System.Numerics;
using System.Runtime.InteropServices;
using Silk.NET.Vulkan;

static class SceneShaders
{
    public const string Vertex = """
        #version 450

        layout(location = 0) in vec3 inPosition;
        layout(location = 1) in vec3 inNormal;
        layout(location = 0) out vec3 vNormal;

        layout(push_constant) uniform Push { mat4 mvp; vec4 color; } push;

        void main()
        {
            gl_Position = push.mvp * vec4(inPosition, 1.0);
            vNormal = inNormal;
        }
        """;

    /// <summary>The object's colour: full on faces pointing up, 70% on vertical faces.</summary>
    public const string Fragment = """
        #version 450

        layout(location = 0) in vec3 vNormal;
        layout(location = 0) out vec4 outColor;

        layout(push_constant) uniform Push { mat4 mvp; vec4 color; } push;

        void main()
        {
            float shade = 0.7 + 0.3 * normalize(vNormal).z;
            outColor = vec4(push.color.rgb * shade, push.color.a);
        }
        """;
}

/// <summary>The per-object push constant both scene shaders read: 80 bytes.</summary>
[StructLayout(LayoutKind.Sequential)]
struct ObjectPush(Matrix4x4 mvp, Vector4 color)
{
    public Matrix4x4 Mvp = mvp;             // offset 0
    public Vector4 Color = color;           // offset 64
    public const uint Size = 80;
    public static readonly PushConstantRange Range = new(ShaderStageFlags.VertexBit | ShaderStageFlags.FragmentBit, 0, Size);
}` },
      { type: 'code', title: 'Engine/Scene.cs', code: cs`
using System.Numerics;

/// <summary>Something to draw: a mesh (which many objects may share), where it is, and its colour.</summary>
sealed class SceneObject(string name, Mesh<MeshVertex> mesh, Matrix4x4 world, Vector4 color)
{
    public readonly string Name = name;
    public Mesh<MeshVertex> Mesh = mesh;
    public Matrix4x4 World = world;
    public Vector4 Color = color;
}

/// <summary>What the application edits. Plain data: changing it makes no Vulkan call.</summary>
sealed class Scene
{
    public readonly List<SceneObject> Objects = [];

    public SceneObject Add(string name, Mesh<MeshVertex> mesh, Matrix4x4 world, Vector4 color)
    {
        var o = new SceneObject(name, mesh, world, color);
        Objects.Add(o);
        return o;
    }

    /// <summary>The world matrix that stretches a unit box (-0.5 to 0.5) to fill the box from min to max.</summary>
    public static Matrix4x4 Place(Vector3 min, Vector3 max) => Matrix4x4.CreateScale(max - min) * Matrix4x4.CreateTranslation((min + max) / 2f);
}` },
      { type: 'code', title: 'Engine/SceneRenderer.cs', code: cs`
using System.Numerics;
using Silk.NET.Vulkan;

/// <summary>Records draws for scene objects. Owns its pipeline; borrows the meshes, which the application owns.</summary>
sealed unsafe class SceneRenderer : IDisposable
{
    readonly GpuContext gpu;
    readonly MeshPipeline pipeline;

    public SceneRenderer(GpuContext gpu, Format colorFormat)
    {
        this.gpu = gpu;
        pipeline = new MeshPipeline(gpu, colorFormat, SceneShaders.Vertex, SceneShaders.Fragment, pushConstants: [ObjectPush.Range],
                                    depthFormat: FrameLoop.DepthFormat, vertexLayout: MeshVertex.Layout);
    }

    /// <summary>Draws each object with its own matrix and colour. Returns the number of draw calls.</summary>
    public int Draw(CommandBuffer cmd, IEnumerable<SceneObject> objects, Matrix4x4 viewProjection)
    {
        gpu.Vk.CmdBindPipeline(cmd, PipelineBindPoint.Graphics, pipeline.Handle);
        int draws = 0;
        foreach (var o in objects)
        {
            var push = new ObjectPush(o.World * viewProjection, o.Color);
            gpu.Vk.CmdPushConstants(cmd, pipeline.Layout, ObjectPush.Range.StageFlags, 0, ObjectPush.Size, &push);
            o.Mesh.Draw(cmd);
            draws++;
        }
        return draws;
    }

    public void Dispose() => pipeline.Dispose();
}` },
      { type: 'h2', text: 'Putting it together' },
      { type: 'p', text: 'The program below is the application layer. It creates one unit-box mesh and places it four times as a floor slab, two columns and a beam, frames them with the orbit camera from module 4, and runs five frames. In an interactive viewer the body of the loop goes into `window.Render`, and `window.Run()` calls it once per screen refresh; the sample runs a fixed number of frames so that it can check the last one.' },
      { type: 'code', title: 'Engine.cs', code: cs`
using System.Numerics;
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);                                     // device
using var loop = new FrameLoop(gpu, window);                                 // frames
using var renderer = new SceneRenderer(gpu, loop.Swapchain.Format);          // rendering
var (vertices, indices) = Shapes.Box(new Vector3(-0.5f), new Vector3(0.5f));
using var box = new Mesh<MeshVertex>(gpu, vertices, indices);               // resources: one mesh ...
using var capture = new ReadbackBuffer(gpu, loop.Swapchain.Extent);

var scene = new Scene();                                                     // ... placed four times
scene.Add("Slab", box, Scene.Place(new(-6f, -4f, -0.3f), new(6f, 4f, 0f)), new(0.55f, 0.55f, 0.55f, 1f));
scene.Add("Column A", box, Scene.Place(new(-4.2f, -0.2f, 0f), new(-3.8f, 0.2f, 3f)), new(0.8f, 0.25f, 0.2f, 1f));
scene.Add("Column B", box, Scene.Place(new(3.8f, -0.2f, 0f), new(4.2f, 0.2f, 3f)), new(0.8f, 0.25f, 0.2f, 1f));
scene.Add("Beam", box, Scene.Place(new(-4.2f, -0.25f, 3f), new(4.2f, 0.25f, 3.5f)), new(0.2f, 0.4f, 0.8f, 1f));

var camera = new OrbitCamera { Yaw = 20f, Pitch = 30f };
float aspect = loop.Swapchain.Extent.Width / (float)loop.Swapchain.Extent.Height;
camera.Frame(new(-6f, -4f, -0.3f), new(6f, 4f, 3.5f), aspect);
var viewProjection = camera.View * camera.Projection(aspect);

for (int i = 0; i < 5; i++)
{
    if (!loop.Begin(out var frame)) continue;
    loop.BeginRendering(frame);
    int draws = renderer.Draw(frame.Cmd, scene.Objects, viewProjection);
    loop.EndRendering(frame);
    loop.End(frame, capture: i == 4 ? capture : null);                       // keep the last frame's pixels
    Console.WriteLine($"Frame {frame.Number}: slot {frame.Slot}, swapchain image {frame.ImageIndex}, {draws} draws");
}
loop.WaitIdle();                                                             // before reading the capture, and before disposing

foreach (var (name, point) in new[] { ("Slab", new Vector3(0f, -3f, 0f)), ("Column A", new Vector3(-4f, -0.2f, 1.5f)),
                                      ("Column B", new Vector3(4f, -0.2f, 1.5f)), ("Beam", new Vector3(0f, 0f, 3.5f)) })
{
    var p = Camera.Project(point, viewProjection, loop.Swapchain.Extent);
    Console.WriteLine($"{name,-8} at pixel ({p.X,3:F0}, {p.Y,3:F0}): {capture.Pixel((int)p.X, (int)p.Y)}");
}`, output: 'Frame 0: slot 0, swapchain image 0, 4 draws\nFrame 1: slot 1, swapchain image 1, 4 draws\nFrame 2: slot 0, swapchain image 2, 4 draws\nFrame 3: slot 1, swapchain image 0, 4 draws\nFrame 4: slot 0, swapchain image 1, 4 draws\nSlab     at pixel (358, 413): (196, 196, 196)\nColumn A at pixel (265, 282): (197, 116, 104)\nColumn B at pixel (547, 334): (197, 116, 104)\nBeam     at pixel (400, 236): (123, 169, 231)' },
      { type: 'p', text: 'The slots alternate 0, 1, 0, 1: with two frames in flight, frame 2 reuses frame 0’s command buffer and fence, after waiting for frame 0. The swapchain image indices are chosen by the driver and need not follow the slots; this swapchain has three images. The four objects were drawn with four draw calls of the same mesh, and each pixel has its object’s colour: grey for the top of the slab, red on the front faces of the columns at 70%, blue for the top of the beam.' },
      { type: 'note', kind: 'tip', text: 'Keep `Program.cs` short. If wiring the layers together grows beyond a screen, put it in an `Engine` or `Viewer` class with a constructor that creates the layers in order and a `Dispose` that destroys them in reverse. The layers themselves should not create each other.' },
      { type: 'quiz', question: 'A designer wants a `Mesh` to remove itself from the renderer’s draw list when it is disposed. Why does that break the layering?', options: ['Meshes cannot be disposed', 'Mesh is in the resource layer and the renderer is above it: the mesh would have to know about the renderer', 'Draw lists must be sorted', 'It makes the mesh larger'], answer: 1, explain: 'Lower layers must not depend on higher ones. If the renderer needs to react, the mesh can raise an event, or the application, which owns both, removes the objects that use the mesh before disposing it.' },
      { type: 'quiz', question: 'Why does `Frame` carry the swapchain image’s current layout, stage and access?', options: ['Vulkan requires it in QueueSubmit', 'So that each piece of code recording part of the frame can write a correct barrier from whatever happened to the image before', 'To choose the present mode', 'To resize the window'], answer: 1, explain: 'A barrier needs the old layout and the stages and accesses to wait for. Once several classes record parts of one frame, that information has to travel with the frame.' },
      { type: 'exercise', task: 'Zoom-to-fit needs the box around the whole scene. Write a method that computes it from the objects’ world matrices: transform the 8 corners of the unit box by each matrix and keep the smallest and largest x, y and z. Test it on the slab and beam from the sample and a 0.4 m column turned 45° about Z, standing at (0, 3).', hint: 'Corner i of the unit box is ((i & 1) − 0.5, ((i >> 1) & 1) − 0.5, ((i >> 2) & 1) − 0.5). Use `Vector3.Transform(corner, world)`, `Vector3.Min` and `Vector3.Max`. For the turned column, multiply `Scene.Place(...)` by `Matrix4x4.CreateRotationZ` and a translation: the column’s corners then reach 0.4 / √2 ≈ 0.283 m from its centre line, further than the unturned 0.2 m.', solution: cs`
using System.Numerics;

static (Vector3 Min, Vector3 Max) Bounds(IEnumerable<Matrix4x4> worlds)
{
    var min = new Vector3(float.MaxValue);
    var max = new Vector3(float.MinValue);
    foreach (var world in worlds)
        for (int i = 0; i < 8; i++)
        {
            var corner = new Vector3((i & 1) - 0.5f, ((i >> 1) & 1) - 0.5f, ((i >> 2) & 1) - 0.5f);
            var p = Vector3.Transform(corner, world);
            min = Vector3.Min(min, p);
            max = Vector3.Max(max, p);
        }
    return (min, max);
}

var slab = Scene.Place(new(-6f, -4f, -0.3f), new(6f, 4f, 0f));
var beam = Scene.Place(new(-4.2f, -0.25f, 3f), new(4.2f, 0.25f, 3.5f));
var turned = Scene.Place(new(-0.2f, -0.2f, 0f), new(0.2f, 0.2f, 4.5f))           // a 4.5 m column at the origin ...
           * Matrix4x4.CreateRotationZ(MathF.PI / 4f) * Matrix4x4.CreateTranslation(0f, 3f, 0f);   // ... turned, then moved

var (min, max) = Bounds([slab, beam]);
Console.WriteLine($"Slab and beam:      {min:F2} to {max:F2}");
(min, max) = Bounds([turned]);
Console.WriteLine($"Turned column:      {min:F3} to {max:F3}");
(min, max) = Bounds([slab, beam, turned]);
Console.WriteLine($"Everything:         {min:F2} to {max:F2}");`, output: 'Slab and beam:      <-6.00, -4.00, -0.30> to <6.00, 4.00, 3.50>\nTurned column:      <-0.283, 2.717, 0.000> to <0.283, 3.283, 4.500>\nEverything:         <-6.00, -4.00, -0.30> to <6.00, 4.00, 4.50>' }
    ],
    keyPoints: [
      'Layers: platform, device, resources, frames, scene, rendering, application. Each uses only the layers below it.',
      'The scene is plain C# data; the renderer reads it each frame and records commands.',
      'One mesh can be placed many times: a scene object is a mesh reference plus a world matrix.',
      'FrameLoop runs frames (fences, semaphores, acquire, submit, present, resize) and knows nothing about drawing.',
      'A Frame carries the command buffer and the swapchain image’s current layout, stage and access for later barriers.',
      'Whoever creates an object disposes of it, in reverse order: using var does this.'
    ]
  },

  // ------------------------------------------------------------------ 2
  {
    slug: 'resource-lifetime',
    title: 'Resource lifetime and deletion queues',
    summary: 'Destroying a buffer while a frame in flight still reads it is a use-after-free on the GPU. See the danger with fence status, then build a deletion queue that destroys objects only once every frame that might use them has finished.',
    minutes: 20,
    blocks: [
      { type: 'p', text: 'In a viewer, GPU objects come and go all the time. The user closes a model, and its meshes and textures should be freed. They drag an element, and its mesh is rebuilt. They resize the window, and the depth buffer is replaced. In C# you would call `Dispose` and move on. In Vulkan that can be a serious bug.' },
      { type: 'p', text: 'The reason is frames in flight. When the CPU records frame 10, the GPU may still be executing frame 9, which draws the very mesh you are about to destroy. Vulkan does not track that for you: destroying a buffer or image that a pending command buffer uses is **undefined behaviour**, a use-after-free on the GPU. It may draw garbage, crash the driver, or (worst) work on your PC and fail on a user’s.' },
      { type: 'widget', name: 'deletion-timeline' },
      { type: 'h2', text: 'Seeing the danger' },
      { type: 'p', text: '`FrameLoop.IsComplete(n)` asks the fence of frame n whether the GPU has finished it. The sample submits three frames and asks straight after each `End`, then again after waiting for the GPU:' },
      { type: 'code', title: 'InFlight.cs', code: cs`
using System.Numerics;
using Silk.NET.Maths;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
using var loop = new FrameLoop(gpu, window);
using var renderer = new SceneRenderer(gpu, loop.Swapchain.Format);
var (vertices, indices) = Shapes.Box(new Vector3(-0.5f), new Vector3(0.5f));
using var box = new Mesh<MeshVertex>(gpu, vertices, indices);
var scene = new Scene();
for (int i = 0; i < 10_000; i++)                                             // enough work to keep the GPU busy for a while
    scene.Add($"Box {i}", box, Scene.Place(new(i % 100 - 50f, i / 100 - 50f, 0f), new(i % 100 - 49.2f, i / 100 - 49.2f, 1f)), Vector4.One);
var camera = new OrbitCamera();
camera.Frame(new(-50f, -50f, 0f), new(50f, 50f, 1f), 800f / 600f);

for (int i = 0; i < 4; i++)
{
    loop.Begin(out var frame);
    loop.BeginRendering(frame);
    renderer.Draw(frame.Cmd, scene.Objects, camera.View * camera.Projection(800f / 600f));
    loop.EndRendering(frame);
    loop.End(frame);
    if (frame.Number > 0)                                                    // the first present may wait for its frame
        Console.WriteLine($"Frame {frame.Number} submitted. Finished already? {loop.IsComplete(frame.Number)}");
}
loop.WaitIdle();
Console.WriteLine($"After WaitIdle: frames 1, 2, 3 finished? {loop.IsComplete(1)}, {loop.IsComplete(2)}, {loop.IsComplete(3)}");`, output: 'Frame 1 submitted. Finished already? False\nFrame 2 submitted. Finished already? False\nFrame 3 submitted. Finished already? False\nAfter WaitIdle: frames 1, 2, 3 finished? True, True, True' },
      { type: 'p', text: 'Right after `End` returns, the frame is still queued or running on the GPU. Disposing the box mesh at that moment would free memory that the GPU is about to read. Only once the frame’s fence has signalled is it safe.' },
      { type: 'h2', text: 'Three ways to destroy safely' },
      { type: 'table', head: ['Approach', 'How', 'Cost', 'Use it for'], rows: [
        ['**Wait for the GPU**', '`DeviceWaitIdle`, then destroy', 'Stops the CPU and the GPU until everything is done: a visible hitch', 'Closing a model, shutting down, recreating the swapchain'],
        ['**Deletion queue**', 'Note the current frame number with the object; destroy it once that frame has finished', 'A list and a comparison per frame', 'Anything replaced while the viewer keeps drawing'],
        ['**Reference counting**', 'Count the users of a shared object; queue it for deletion when the count drops to zero', 'Bookkeeping on every share and release', 'Meshes and textures shared by many objects or models']
      ] },
      { type: 'p', text: 'The deletion queue is the workhorse. Fences signal in submission order on one queue, so when `Begin` has waited for frame n’s fence, frame n and every frame before it are finished. An object retired while frame n was being recorded can therefore be destroyed as soon as `FrameCompleted` reports n:' },
      { type: 'code', title: 'Engine/DeletionQueue.cs', code: cs`
/// <summary>Objects waiting to be destroyed until every frame that might use them has finished on the GPU.</summary>
sealed class DeletionQueue(Func<long> currentFrame)
{
    readonly List<(long Frame, string Name, Action Destroy)> pending = [];
    public int Pending => pending.Count;
    /// <summary>Called after each destruction with the object's name and the frame it waited for.</summary>
    public event Action<string, long>? Destroyed;

    /// <summary>Destroys the object once the frame being recorded now (or the next one, between frames) has finished.</summary>
    public void Retire(string name, Action destroy) => pending.Add((currentFrame(), name, destroy));
    public void Retire(string name, IDisposable resource) => Retire(name, resource.Dispose);

    /// <summary>Destroys everything retired in completedFrame or earlier. Subscribe it to FrameLoop.FrameCompleted.</summary>
    public void Flush(long completedFrame)
    {
        var ready = pending.Where(p => p.Frame <= completedFrame).ToList();
        pending.RemoveAll(p => p.Frame <= completedFrame);
        foreach (var (frame, name, destroy) in ready)
        {
            destroy();
            Destroyed?.Invoke(name, frame);
        }
    }

    /// <summary>Destroys everything. Call it only after FrameLoop.WaitIdle, at shutdown.</summary>
    public void FlushAll() => Flush(long.MaxValue);
}` },
      { type: 'p', text: 'The queue does not know about `FrameLoop`. It asks a function for the current frame number and is told when frames finish, so it can be tested without a GPU (the exercise does). The application connects the two with one line: `loop.FrameCompleted += deletions.Flush`.' },
      { type: 'h2', text: 'Replacing a mesh every frame' },
      { type: 'p', text: 'While the user drags an element, a viewer rebuilds its mesh every frame. The sample does that for six frames: each frame creates a new box mesh one metre further along, draws it, and retires the previous one. The log shows when each old mesh is really destroyed:' },
      { type: 'code', title: 'Deletions.cs', code: cs`
using System.Numerics;
using Silk.NET.Maths;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
using var loop = new FrameLoop(gpu, window);
using var renderer = new SceneRenderer(gpu, loop.Swapchain.Format);
var deletions = new DeletionQueue(() => loop.FrameNumber);
loop.FrameCompleted += deletions.Flush;
deletions.Destroyed += (name, frame) =>
    Console.WriteLine($"  destroyed {name}: it waited for frame {frame}, which is finished: {loop.IsComplete(frame)}");

var camera = new OrbitCamera();
camera.Frame(new(-3f, -1f, 0f), new(3f, 1f, 1f), 800f / 600f);
var viewProjection = camera.View * camera.Projection(800f / 600f);
Mesh<MeshVertex>? dragged = null;

for (int i = 0; i < 6; i++)
{
    if (!loop.Begin(out var frame)) continue;                                // Begin flushes the queue
    if (dragged != null) deletions.Retire($"mesh {i - 1}", dragged);           // frame i - 1 may still be drawing it
    var (vertices, indices) = Shapes.Box(new(i - 3f, -1f, 0f), new(i - 2f, 1f, 1f));
    dragged = new Mesh<MeshVertex>(gpu, vertices, indices);
    var element = new SceneObject($"mesh {i}", dragged, Matrix4x4.Identity, new(0.9f, 0.6f, 0.1f, 1f));
    loop.BeginRendering(frame);
    renderer.Draw(frame.Cmd, [element], viewProjection);
    loop.EndRendering(frame);
    loop.End(frame);
    Console.WriteLine($"Frame {frame.Number} drew mesh {i}; waiting to be destroyed: {deletions.Pending}");
}
loop.WaitIdle();                                                            // shutdown: nothing is in flight now
dragged!.Dispose();                                                          // so the last mesh can go directly
deletions.FlushAll();
Console.WriteLine($"At shutdown: {deletions.Pending} waiting");`, output: 'Frame 0 drew mesh 0; waiting to be destroyed: 0\nFrame 1 drew mesh 1; waiting to be destroyed: 1\nFrame 2 drew mesh 2; waiting to be destroyed: 2\n  destroyed mesh 0: it waited for frame 1, which is finished: True\nFrame 3 drew mesh 3; waiting to be destroyed: 2\n  destroyed mesh 1: it waited for frame 2, which is finished: True\nFrame 4 drew mesh 4; waiting to be destroyed: 2\n  destroyed mesh 2: it waited for frame 3, which is finished: True\nFrame 5 drew mesh 5; waiting to be destroyed: 2\n  destroyed mesh 3: it waited for frame 4, which is finished: True\n  destroyed mesh 4: it waited for frame 5, which is finished: True\nAt shutdown: 0 waiting' },
      { type: 'p', text: 'Mesh 0 was retired while frame 1 was being recorded, so it waited for frame 1, not frame 0: retiring always uses the frame being recorded, which is never too early. It was destroyed when frame 3 began, the first moment the loop knew frame 1 was finished. In steady state two meshes wait at any time, one per frame in flight: that is the memory a deletion queue costs.' },
      { type: 'note', kind: 'warn', text: 'With the Vulkan SDK installed, the validation layer catches the mistake this lesson avoids: destroying a buffer still used by a pending command buffer is reported as a broken valid-usage rule of `vkDestroyBuffer`. This PC has no SDK, so the sample proves safety with the fence instead. Develop with the layer on whenever you can.' },
      { type: 'h2', text: 'Who owns a shared mesh?' },
      { type: 'p', text: 'In a BIM model, one window type’s mesh is used by hundreds of scene objects, and maybe by two open models. No single object can dispose of it. Two common designs:' },
      { type: 'ul', items: [
        '**An asset cache owns it.** Meshes and textures are loaded through a cache keyed by file and element type. Scene objects only borrow them. When a model closes, the cache drops the assets no remaining model uses and retires them through the deletion queue.',
        '**Reference counting.** Each scene object that uses a mesh adds one to its count and subtracts one when removed; at zero the mesh is retired. It is more automatic, but every share and release must be paired, which C# does not enforce.'
      ] },
      { type: 'p', text: 'Either way the final step is the same: the object goes into the deletion queue, never straight to `Dispose`, unless the GPU is known to be idle.' },
      { type: 'quiz', question: 'With three frames in flight, an object is retired while frame 20 is being recorded. When is the deletion queue first allowed to destroy it?', options: ['Immediately', 'When frame 21 begins', 'When the loop knows frame 20 has finished, at the start of frame 23', 'Never'], answer: 2, explain: 'Begin of frame n waits for the fence of frame n − 3 (same slot). Frame 20’s fence is waited for when frame 23 begins, and FrameCompleted then reports 20.' },
      { type: 'quiz', question: 'Why is DeviceWaitIdle acceptable before recreating the swapchain but not for deleting a mesh while dragging?', options: ['It is never acceptable', 'Resizing is rare and already interrupts drawing; dragging happens every frame, and waiting idle each time would stall the CPU and GPU in turn', 'DeviceWaitIdle cannot wait for meshes', 'The swapchain has no memory'], answer: 1, explain: 'Waiting for idle empties the pipeline: the CPU waits for the GPU, then the GPU waits for the CPU’s next frame. Fine once in a while, a halved frame rate if done every frame.' },
      { type: 'exercise', task: 'Test the deletion queue without a GPU. Simulate frames 0 to 6 with **three** frames in flight: at the start of each frame, flush with the frame that has just finished (frame − 3). Retire “old texture” in frame 1 and “old mesh” and “old pipeline” in frame 2. Print each destruction with the frame number in which it happens.', hint: 'Create the queue with a lambda that returns a local `frame` variable, so changing the variable moves the queue’s clock. `Retire` has an overload that takes an `Action`, so `() => { }` stands in for a real object.', solution: cs`
const int framesInFlight = 3;
long frame = 0;
var deletions = new DeletionQueue(() => frame);
deletions.Destroyed += (name, retiredIn) => Console.WriteLine($"Frame {frame}: destroyed {name} (retired in frame {retiredIn})");

for (frame = 0; frame <= 6; frame++)
{
    deletions.Flush(frame - framesInFlight);         // what FrameLoop.Begin reports after waiting for this slot's fence
    if (frame == 1) deletions.Retire("old texture", () => { });
    if (frame == 2) { deletions.Retire("old mesh", () => { }); deletions.Retire("old pipeline", () => { }); }
    Console.WriteLine($"Frame {frame}: {deletions.Pending} waiting");
}`, output: 'Frame 0: 0 waiting\nFrame 1: 1 waiting\nFrame 2: 3 waiting\nFrame 3: 3 waiting\nFrame 4: destroyed old texture (retired in frame 1)\nFrame 4: 2 waiting\nFrame 5: destroyed old mesh (retired in frame 2)\nFrame 5: destroyed old pipeline (retired in frame 2)\nFrame 5: 0 waiting\nFrame 6: 0 waiting' }
    ],
    keyPoints: [
      'Destroying an object that a frame in flight still uses is undefined behaviour: a GPU use-after-free.',
      'A frame is finished once its fence has signalled; FrameLoop.IsComplete asks the fence.',
      'Fences signal in order, so after waiting for frame n’s fence every earlier frame is finished too.',
      'A deletion queue records the current frame number with each retired object and destroys it once that frame has finished.',
      'DeviceWaitIdle is fine for rare events (closing a model, resizing, shutdown), not for every frame.',
      'Shared meshes and textures are owned by an asset cache or reference counted, and still retired through the queue.'
    ]
  },

  // ------------------------------------------------------------------ 3
  {
    slug: 'materials-pipelines',
    title: 'Materials, pipeline caches and pipeline variants',
    summary: 'Describe surfaces with materials, create each pipeline variant once in a pipeline library, keep the driver’s compiled pipelines between runs with a VkPipelineCache, and sort draws so the GPU changes state as rarely as possible.',
    minutes: 24,
    blocks: [
      { type: 'p', text: 'A BIM model has many surface types: concrete, steel, brick, timber, glass. Some differences are only values (a colour, a texture), and some change how the GPU draws: glass is blended over what is behind it and does not write depth; a roof membrane is visible from both sides. In Vulkan, how the GPU draws is baked into a **pipeline**, and creating one compiles shaders, which can take milliseconds. An engine therefore separates two ideas:' },
      { type: 'table', head: ['Concept', 'What it holds', 'How many in a model', 'Cost to switch'], rows: [
        ['**Pipeline variant**', 'Shaders and fixed state: culling, blending, depth writes, formats', 'A handful', 'High: `CmdBindPipeline` may flush GPU state'],
        ['**Material**', 'A variant plus values: colour, textures, roughness', 'Dozens to hundreds', 'Low: push constants or a descriptor set']
      ] },
      { type: 'p', text: 'The fixed state that tells variants apart goes into a **pipeline key**, a small value type that can be compared and used as a dictionary key. A material refers to a key; many materials share one.' },
      { type: 'h2', text: 'More pipeline state' },
      { type: 'p', text: '`MeshPipeline` gains four parameters: alpha **blending**, whether to **write depth**, which winding is the **front face**, and a **pipeline cache**. The engine’s meshes are wound counter-clockwise seen from outside, and the projection flips y, so with culling on, the front face must be `CounterClockwise`:' },
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
                        Format depthFormat = Format.Undefined, CompareOp depthCompare = CompareOp.Less,
                        VertexLayout? vertexLayout = null, SampleCountFlags samples = SampleCountFlags.Count1Bit,
                        bool blend = false,                                 // new: mix with what is behind, by alpha
                        bool depthWrite = true,                             // new: false for transparent surfaces
                        FrontFace frontFace = FrontFace.Clockwise,          // new: which winding faces the camera
                        PipelineCache cache = default)                      // new: reuse the driver's earlier compilations
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
        var blendAttachment = new PipelineColorBlendAttachmentState
        {
            BlendEnable = blend,
            SrcColorBlendFactor = BlendFactor.SrcAlpha, DstColorBlendFactor = BlendFactor.OneMinusSrcAlpha, ColorBlendOp = BlendOp.Add,   // a·src + (1 - a)·dst
            SrcAlphaBlendFactor = BlendFactor.One, DstAlphaBlendFactor = BlendFactor.OneMinusSrcAlpha, AlphaBlendOp = BlendOp.Add,
            ColorWriteMask = ColorComponentFlags.RBit | ColorComponentFlags.GBit | ColorComponentFlags.BBit | ColorComponentFlags.ABit
        };
        var blendState = new PipelineColorBlendStateCreateInfo { SType = StructureType.PipelineColorBlendStateCreateInfo, AttachmentCount = 1, PAttachments = &blendAttachment };
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
      { type: 'h2', text: 'A pipeline library' },
      { type: 'p', text: 'The library maps keys to pipelines and creates each one the first time it is asked for. Every shader pair in it reads the same 80-byte `ObjectPush`, so all its pipelines have compatible layouts: push constants survive a pipeline change, and later lessons can bind descriptor sets once for all of them. The `lock` makes `Get` safe to call from the recording threads of lesson 7.' },
      { type: 'code', title: 'Engine/PipelineLibrary.cs', code: cs`
using Silk.NET.Vulkan;

/// <summary>Everything that makes one pipeline differ from another. A small value: cheap to compare and hash.</summary>
readonly record struct PipelineKey(string Shader, CullModeFlags Cull = CullModeFlags.BackBit, bool Blend = false);

/// <summary>Creates each pipeline variant once, on first use, through a VkPipelineCache that can be saved between runs.</summary>
sealed unsafe class PipelineLibrary : IDisposable
{
    readonly GpuContext gpu;
    readonly Format colorFormat;
    readonly Dictionary<string, (string Vertex, string Fragment)> shaders = [];
    readonly Dictionary<PipelineKey, MeshPipeline> pipelines = [];
    readonly Lock sync = new();
    public readonly PipelineCache Cache;
    public int Count => pipelines.Count;

    /// <summary>savedCache: bytes from SaveCache in an earlier run. A driver that cannot use them just starts empty.</summary>
    public PipelineLibrary(GpuContext gpu, Format colorFormat, byte[]? savedCache = null)
    {
        this.gpu = gpu;
        this.colorFormat = colorFormat;
        fixed (byte* data = savedCache)
        {
            var info = new PipelineCacheCreateInfo { SType = StructureType.PipelineCacheCreateInfo, InitialDataSize = (nuint)(savedCache?.Length ?? 0), PInitialData = data };
            PipelineCache cache;
            gpu.Vk.CreatePipelineCache(gpu.Device, &info, null, &cache).Check("CreatePipelineCache");
            Cache = cache;
        }
        AddShader("scene", SceneShaders.Vertex, SceneShaders.Fragment);
    }

    public void AddShader(string name, string vertexGlsl, string fragmentGlsl) => shaders[name] = (vertexGlsl, fragmentGlsl);

    /// <summary>The pipeline for this key, created now if it does not exist yet.</summary>
    public MeshPipeline Get(PipelineKey key)
    {
        lock (sync)
        {
            if (pipelines.TryGetValue(key, out var pipeline)) return pipeline;
            var (vertex, fragment) = shaders[key.Shader];
            pipeline = new MeshPipeline(gpu, colorFormat, vertex, fragment, pushConstants: [ObjectPush.Range],
                cull: key.Cull, depthFormat: FrameLoop.DepthFormat, vertexLayout: MeshVertex.Layout,
                blend: key.Blend, depthWrite: !key.Blend,                   // transparent surfaces do not hide what is behind them
                frontFace: FrontFace.CounterClockwise, cache: Cache);
            pipelines[key] = pipeline;
            return pipeline;
        }
    }

    /// <summary>The driver's compiled pipelines as bytes: save them to a file and pass them to the next run.</summary>
    public byte[] SaveCache()
    {
        nuint size = 0;
        gpu.Vk.GetPipelineCacheData(gpu.Device, Cache, &size, null).Check("GetPipelineCacheData");
        var data = new byte[size];
        fixed (byte* p = data) gpu.Vk.GetPipelineCacheData(gpu.Device, Cache, &size, p).Check("GetPipelineCacheData");
        return data;
    }

    public void Dispose()
    {
        foreach (var pipeline in pipelines.Values) pipeline.Dispose();
        gpu.Vk.DestroyPipelineCache(gpu.Device, Cache, null);
    }
}` },
      { type: 'h2', text: 'Materials in the scene' },
      { type: 'p', text: 'A material names its pipeline key and its values, and a scene object now has a material instead of a bare colour:' },
      { type: 'code', title: 'Engine/Material.cs', code: cs`
using System.Numerics;

/// <summary>How a surface looks: the pipeline variant that draws it and the values it pushes.</summary>
sealed record Material(string Name, PipelineKey Pipeline, Vector4 Color)
{
    public bool Transparent => Pipeline.Blend;

    public static Material Opaque(string name, Vector4 color) => new(name, new PipelineKey("scene"), color);
    public static Material Glass(string name, Vector4 color) => new(name, new PipelineKey("scene", CullModeFlags.None, Blend: true), color);
}` },
      { type: 'code', title: 'Engine/Scene.cs', code: cs`
using System.Numerics;

/// <summary>Something to draw: a mesh (which many objects may share), where it is, and what it is made of.</summary>
sealed class SceneObject(string name, Mesh<MeshVertex> mesh, Matrix4x4 world, Material material)
{
    public readonly string Name = name;
    public Mesh<MeshVertex> Mesh = mesh;
    public Matrix4x4 World = world;
    public Material Material = material;
}

/// <summary>What the application edits. Plain data: changing it makes no Vulkan call.</summary>
sealed class Scene
{
    public readonly List<SceneObject> Objects = [];

    public SceneObject Add(string name, Mesh<MeshVertex> mesh, Matrix4x4 world, Material material)
    {
        var o = new SceneObject(name, mesh, world, material);
        Objects.Add(o);
        return o;
    }

    /// <summary>The world matrix that stretches a unit box (-0.5 to 0.5) to fill the box from min to max.</summary>
    public static Matrix4x4 Place(Vector3 min, Vector3 max) => Matrix4x4.CreateScale(max - min) * Matrix4x4.CreateTranslation((min + max) / 2f);
}` },
      { type: 'p', text: 'To count how often the vertex and index buffers change, `Mesh<T>` splits `Draw` into `Bind` and `DrawBound`, and `Shapes` gains a cylinder for round columns. Both are wound counter-clockwise seen from outside:' },
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

    /// <summary>Binds the vertex and index buffers. Draws of the same mesh can then skip it.</summary>
    public void Bind(CommandBuffer cmd)
    {
        var vb = Vertices.Handle;
        ulong offset = 0;
        gpu.Vk.CmdBindVertexBuffers(cmd, 0, 1, &vb, &offset);
        gpu.Vk.CmdBindIndexBuffer(cmd, Indices.Handle, 0, IndexType);
    }

    /// <summary>Draws the mesh whose buffers are bound: once, or several instances (module 7).</summary>
    public void DrawBound(CommandBuffer cmd, uint instances = 1, uint firstInstance = 0) =>
        gpu.Vk.CmdDrawIndexed(cmd, IndexCount, instances, 0, 0, firstInstance);

    public void Draw(CommandBuffer cmd)
    {
        Bind(cmd);
        DrawBound(cmd);
    }

    public void Dispose()
    {
        Vertices.Dispose();
        Indices.Dispose();
    }
}` },
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
}` },
      { type: 'h2', text: 'Sorting the draws' },
      { type: 'p', text: 'Changing pipeline is the most expensive state change; changing vertex buffers is cheaper but not free; push constants are almost free. So the renderer sorts opaque objects by pipeline, then material, then mesh, and skips binds that would repeat the current state. Transparent objects are different: blending is order-dependent, so they are drawn **after** all opaque objects, **farthest first**, and they are tested against the opaque depth without writing their own:' },
      { type: 'widget', name: 'draw-sort' },
      { type: 'code', title: 'Engine/SceneRenderer.cs', code: cs`
using System.Numerics;
using System.Runtime.CompilerServices;
using Silk.NET.Vulkan;

/// <summary>What one Draw call cost: draws, and how often the pipeline and the mesh buffers changed.</summary>
record struct DrawStats(int Draws, int PipelineBinds, int MeshBinds);

/// <summary>Records draws for scene objects, with pipelines from a library. Borrows meshes, materials and pipelines.</summary>
sealed unsafe class SceneRenderer(GpuContext gpu, PipelineLibrary library)
{
    /// <summary>Opaque objects grouped by pipeline, material and mesh; then transparent ones from farthest to nearest.</summary>
    public static SceneObject[] Sort(IEnumerable<SceneObject> objects, Vector3 eye)
    {
        var opaque = objects.Where(o => !o.Material.Transparent)
            .OrderBy(o => o.Material.Pipeline.Shader).ThenBy(o => o.Material.Pipeline.Cull)
            .ThenBy(o => o.Material.Name).ThenBy(o => RuntimeHelpers.GetHashCode(o.Mesh));
        var transparent = objects.Where(o => o.Material.Transparent)
            .OrderByDescending(o => Vector3.DistanceSquared(eye, o.World.Translation));
        return [.. opaque, .. transparent];
    }

    /// <summary>Draws the objects in the order given, binding a pipeline or mesh only when it changes.</summary>
    public DrawStats Draw(CommandBuffer cmd, IEnumerable<SceneObject> objects, Matrix4x4 viewProjection)
    {
        var stats = new DrawStats();
        MeshPipeline? boundPipeline = null;
        Mesh<MeshVertex>? boundMesh = null;
        foreach (var o in objects)
        {
            var pipeline = library.Get(o.Material.Pipeline);
            if (pipeline != boundPipeline)
            {
                gpu.Vk.CmdBindPipeline(cmd, PipelineBindPoint.Graphics, pipeline.Handle);
                boundPipeline = pipeline;
                stats.PipelineBinds++;
            }
            if (o.Mesh != boundMesh)
            {
                o.Mesh.Bind(cmd);
                boundMesh = o.Mesh;
                stats.MeshBinds++;
            }
            var push = new ObjectPush(o.World * viewProjection, o.Material.Color);
            gpu.Vk.CmdPushConstants(cmd, pipeline.Layout, ObjectPush.Range.StageFlags, 0, ObjectPush.Size, &push);
            o.Mesh.DrawBound(cmd);
            stats.Draws++;
        }
        return stats;
    }
}` },
      { type: 'p', text: 'The renderer no longer owns a pipeline, so it is no longer disposable: the library owns the pipelines, the application owns the library.' },
      { type: 'h2', text: 'Drawing a bay of a building' },
      { type: 'p', text: 'The sample builds a slab, four round steel columns, a brick wall behind them and two glass panels in front of the wall, adding the objects in a mixed order, as a file loader might. It draws the scene twice, in the order added and sorted, and compares the state changes and two pixels: one on the glass in front of the wall, and one on a column.' },
      { type: 'code', title: 'Materials.cs', code: cs`
using System.Numerics;
using Silk.NET.Maths;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
using var loop = new FrameLoop(gpu, window);
using var library = new PipelineLibrary(gpu, loop.Swapchain.Format);
var renderer = new SceneRenderer(gpu, library);
var (bv, bi) = Shapes.Box(new Vector3(-0.5f), new Vector3(0.5f));
var (cv, ci) = Shapes.Cylinder(24);
using var box = new Mesh<MeshVertex>(gpu, bv, bi);
using var cylinder = new Mesh<MeshVertex>(gpu, cv, ci);
using var capture = new ReadbackBuffer(gpu, loop.Swapchain.Extent);

var concrete = Material.Opaque("Concrete", new(0.55f, 0.55f, 0.55f, 1f));
var steel = Material.Opaque("Steel", new(0.3f, 0.35f, 0.45f, 1f));
var brick = Material.Opaque("Brick", new(0.7f, 0.3f, 0.2f, 1f));
var glass = Material.Glass("Glass", new(0.6f, 0.85f, 1f, 0.3f));

var scene = new Scene();
scene.Add("Glass screen", box, Scene.Place(new(-1.5f, 0.5f, 0f), new(1.5f, 0.55f, 2.5f)), glass);
scene.Add("Column 1", cylinder, Scene.Place(new(-6.25f, -3.25f, 0f), new(-5.75f, -2.75f, 3f)), steel);
scene.Add("Slab", box, Scene.Place(new(-8f, -5f, -0.3f), new(8f, 5f, 0f)), concrete);
scene.Add("Column 2", cylinder, Scene.Place(new(-2.25f, -3.25f, 0f), new(-1.75f, -2.75f, 3f)), steel);
scene.Add("Wall", box, Scene.Place(new(-8f, 3f, 0f), new(8f, 3.3f, 3f)), brick);
scene.Add("Column 3", cylinder, Scene.Place(new(1.75f, -3.25f, 0f), new(2.25f, -2.75f, 3f)), steel);
scene.Add("Glass door", box, Scene.Place(new(2.5f, 0.5f, 0f), new(5f, 0.55f, 2.5f)), glass);
scene.Add("Column 4", cylinder, Scene.Place(new(5.75f, -3.25f, 0f), new(6.25f, -2.75f, 3f)), steel);

var camera = new OrbitCamera { Yaw = 0f, Pitch = 20f };
camera.Frame(new(-8f, -5f, -0.3f), new(8f, 5f, 3.3f), 800f / 600f);
var viewProjection = camera.View * camera.Projection(800f / 600f);
var glassPixel = Camera.Project(new(0f, 0.5f, 1.5f), viewProjection, loop.Swapchain.Extent);
var columnPixel = Camera.Project(new(-2f, -3.25f, 1.5f), viewProjection, loop.Swapchain.Extent);

foreach (var (label, order) in new[] { ("As added", scene.Objects.ToArray()), ("Sorted", SceneRenderer.Sort(scene.Objects, camera.Eye)) })
{
    loop.Begin(out var frame);
    loop.BeginRendering(frame);
    var stats = renderer.Draw(frame.Cmd, order, viewProjection);
    loop.EndRendering(frame);
    loop.End(frame, capture);
    loop.WaitIdle();
    Console.WriteLine($"{label,-8}: {stats.Draws} draws, {stats.PipelineBinds} pipeline binds, {stats.MeshBinds} mesh binds | " +
                      $"glass {capture.Pixel((int)glassPixel.X, (int)glassPixel.Y)}, column {capture.Pixel((int)columnPixel.X, (int)columnPixel.Y)}");
}
Console.WriteLine($"Order: {string.Join(", ", SceneRenderer.Sort(scene.Objects, camera.Eye).Select(o => o.Name))}");
Console.WriteLine($"Pipelines created: {library.Count}");`, output: 'As added: 8 draws, 4 pipeline binds, 8 mesh binds | glass (186, 126, 104), column (126, 136, 152)\nSorted  : 8 draws, 2 pipeline binds, 3 mesh binds | glass (179, 170, 174), column (126, 136, 152)\nOrder: Wall, Slab, Column 1, Column 2, Column 3, Column 4, Glass door, Glass screen\nPipelines created: 2' },
      { type: 'p', text: 'Sorting halved the pipeline binds and cut the mesh binds from 8 to 3: the wall and the slab share the box mesh, the four columns share the cylinder, and the two glass panels come last. More important is the glass pixel. In the order added, the glass screen was drawn first, blended with the dark background, and then the wall, drawn later, passed the depth test (the glass wrote no depth) and painted over it: (186, 126, 104) is plain brick. Sorted, the glass is blended over the finished wall and the brick takes a pale blue tint. The farther door comes before the nearer screen. Only two pipelines were ever created, however many objects use them.' },
      { type: 'h2', text: 'Keeping compiled pipelines between runs' },
      { type: 'p', text: 'Creating a pipeline turns SPIR-V into the GPU’s own machine code. A large viewer may have dozens of variants, and compiling them all at start-up, or worse the first time each material appears, causes hitches. A **`VkPipelineCache`** lets the driver keep what it compiled. `GetPipelineCacheData` returns it as bytes; save them to a file and pass them back next time, and the driver can skip work it has done before.' },
      { type: 'p', text: 'The bytes start with a header the driver checks: its length, a version, the GPU’s vendor and device IDs, and a 16-byte **cache UUID** that changes with the driver version. If anything differs (a new driver, another GPU), the driver ignores the data and starts empty, so loading a stale file is safe. The sample saves a cache, reads the header and compares it with this GPU:' },
      { type: 'code', title: 'PipelineCacheFile.cs', code: cs`
using System.Buffers.Binary;
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
string file = Path.Combine(Path.GetTempPath(), "bim-viewer.pipelines");
File.Delete(file);

byte[]? saved = File.Exists(file) ? File.ReadAllBytes(file) : null;          // what a viewer does at start-up
using (var library = new PipelineLibrary(gpu, Format.B8G8R8A8Srgb, saved))
{
    Console.WriteLine($"Empty cache: {library.SaveCache().Length} bytes");
    library.Get(new PipelineKey("scene"));
    library.Get(new PipelineKey("scene", CullModeFlags.None, Blend: true));
    File.WriteAllBytes(file, library.SaveCache());                             // ... and at shutdown
}

byte[] data = File.ReadAllBytes(file);
uint U32(int at) => BinaryPrimitives.ReadUInt32LittleEndian(data.AsSpan(at));
var props = gpu.Vk.GetPhysicalDeviceProperties(gpu.PhysicalDevice);
var uuid = new Guid(data.AsSpan(16, 16));
Guid deviceUuid;
unsafe { deviceUuid = new Guid(new ReadOnlySpan<byte>(props.PipelineCacheUuid, 16)); }
Console.WriteLine($"Saved {data.Length} bytes for 2 pipelines");
Console.WriteLine($"Header: {U32(0)} bytes, version {U32(4)}, vendor 0x{U32(8):X4}, device 0x{U32(12):X4}");
Console.WriteLine($"This GPU: vendor 0x{props.VendorID:X4}, device 0x{props.DeviceID:X4}, cache UUID matches: {uuid == deviceUuid}");

using (var library = new PipelineLibrary(gpu, Format.B8G8R8A8Srgb, data))      // the next run
    Console.WriteLine($"Reloaded cache: {library.SaveCache().Length} bytes before creating any pipeline");`, output: 'Empty cache: 52 bytes\nSaved 7492 bytes for 2 pipelines\nHeader: 32 bytes, version 1, vendor 0x8086, device 0x9A49\nThis GPU: vendor 0x8086, device 0x9A49, cache UUID matches: True\nReloaded cache: 7492 bytes before creating any pipeline' },
      { type: 'p', text: 'An empty cache is just its 52-byte container; two pipelines make it about 7 KB. The 32-byte header names vendor 0x8086 (Intel) and this GPU’s device ID, and its UUID matches the one the driver reports in `PipelineCacheUuid`. The reloaded cache already holds all 7,492 bytes before any pipeline is created: the driver accepted the file, and creating the same two pipelines again can reuse their compiled code.' },
      { type: 'note', kind: 'info', text: 'Vulkan 1.3 made much of the fixed state **dynamic**: cull mode, front face, depth test and write, the depth compare op and the topology can be set with commands such as `CmdSetCullMode` instead of being baked in. An engine that uses them needs fewer variants. Blending is not yet dynamic in core Vulkan, and shaders, vertex layout and attachment formats never are, so a pipeline library is still needed.' },
      { type: 'quiz', question: 'Glass is drawn before the wall behind it, with depth writes off. What does the frame show where the glass covers the wall?', options: ['Correctly tinted wall', 'The wall without any tint: it is drawn later and overwrites the blended colour', 'Only the glass colour', 'Nothing: the depth test fails'], answer: 1, explain: 'Blending mixes with what is already in the image. When the glass is drawn first, it blends with the background; the wall then passes the depth test (glass wrote no depth) and replaces that colour. Transparent objects must come after the opaque ones.' },
      { type: 'quiz', question: 'Why does the pipeline cache store the driver’s UUID in its header?', options: ['To identify the user', 'Compiled GPU code is only valid for the exact GPU and driver that produced it; a mismatch makes the driver ignore the data', 'To encrypt the data', 'Vulkan requires a UUID in every file'], answer: 1, explain: 'The data is machine code for one GPU and driver build. After a driver update the UUID changes, and the driver starts with an empty cache instead of loading incompatible code.' },
      { type: 'exercise', task: 'Count the cost of not sorting at scale. Simulate 1,000 objects, each with one of 3 pipeline keys and one of 20 meshes chosen at random (`new Random(42)`). Count pipeline binds and mesh binds in random order, sorted by pipeline only, and sorted by pipeline then mesh.', hint: 'You do not need a GPU: represent each object by its (pipeline, mesh) pair and count how often a value differs from the previous one. Sort with `OrderBy(o => o.Pipeline).ThenBy(o => o.Mesh)`.', solution: cs`
var random = new Random(42);
var objects = Enumerable.Range(0, 1000).Select(_ => (Pipeline: random.Next(3), Mesh: random.Next(20))).ToArray();

static (int Pipelines, int Meshes) Count(IEnumerable<(int Pipeline, int Mesh)> order)
{
    int pipelines = 0, meshes = 0, lastPipeline = -1, lastMesh = -1;
    foreach (var (pipeline, mesh) in order)
    {
        if (pipeline != lastPipeline) { pipelines++; lastPipeline = pipeline; }
        if (mesh != lastMesh) { meshes++; lastMesh = mesh; }
    }
    return (pipelines, meshes);
}

foreach (var (label, order) in new[]
{
    ("Random order", objects.AsEnumerable()),
    ("By pipeline", objects.OrderBy(o => o.Pipeline)),
    ("By pipeline, then mesh", objects.OrderBy(o => o.Pipeline).ThenBy(o => o.Mesh))
})
{
    var (pipelines, meshes) = Count(order);
    Console.WriteLine($"{label,-23} {pipelines,4} pipeline binds, {meshes,4} mesh binds");
}`, output: 'Random order             640 pipeline binds,  958 mesh binds\nBy pipeline                3 pipeline binds,  954 mesh binds\nBy pipeline, then mesh     3 pipeline binds,   60 mesh binds' }
    ],
    keyPoints: [
      'A pipeline variant is shaders plus fixed state; a material is a variant plus values. Many materials share a variant.',
      'A pipeline key (shader, culling, blending) identifies a variant; a library creates each one once, on first use.',
      'Pipelines that share one push-constant and descriptor layout keep those bindings across pipeline changes.',
      'Sort opaque draws by pipeline, material and mesh; draw transparent ones afterwards, farthest first, without depth writes.',
      'A VkPipelineCache saved to disk lets the driver skip recompiling; its header (vendor, device, UUID) makes stale data harmless.',
      'Vulkan 1.3 dynamic state (cull mode, depth test and write) reduces the number of variants.'
    ]
  },

  // ------------------------------------------------------------------ 4
  {
    slug: 'descriptor-management',
    title: 'Descriptor management and bindless resources',
    summary: 'Organise descriptor sets by how often they change, allocate them from pools that grow, and then skip most of that work: put every texture in one bindless array, bind it once per frame and choose textures by index.',
    minutes: 24,
    blocks: [
      { type: 'p', text: 'Module 3 created one descriptor pool and one set for each uniform buffer, and module 4 did the same for each texture. That is fine for a sample with one texture. A BIM model can have hundreds of materials with textures, objects appear and disappear, and a viewer that creates a pool per texture or binds a new set for every draw spends its time on bookkeeping. Engines use two techniques: they **organise** sets by how often they change, and they **allocate** them from shared pools. Or they go **bindless** and avoid most sets altogether.' },
      { type: 'h2', text: 'Sets by frequency' },
      { type: 'p', text: 'A pipeline layout can have several sets (at least 4 on every GPU, 32 on this one), bound separately. Binding set 1 leaves set 0 in place as long as the layouts agree on set 0. So engines order the sets from the least to the most often changed:' },
      { type: 'table', head: ['Set', 'Changes', 'Typical contents', 'Binds per frame'], rows: [
        ['0', 'Once per frame', 'Camera matrices, lights, time', '1'],
        ['1', 'Per material', 'Material textures, material parameters', 'One per material used'],
        ['2', 'Per object (if needed)', 'Skinning matrices, per-object buffers', 'Up to one per draw'],
        ['Push constants', 'Per draw', 'World matrix, object ID, a few indices', 'Free: part of the command stream']
      ] },
      { type: 'h2', text: 'Pools that grow' },
      { type: 'p', text: 'A descriptor pool is created with a fixed number of sets and descriptors. When it is full, `AllocateDescriptorSets` returns `ErrorOutOfPoolMemory`. Instead of guessing a size up front, an allocator keeps a list of pools and starts a new one when the current one is full. For sets that are rebuilt every frame, `Reset` empties all the pools at once with `ResetDescriptorPool`, which is much cheaper than freeing sets one by one:' },
      { type: 'code', title: 'Engine/DescriptorAllocator.cs', code: cs`
using Silk.NET.Vulkan;

/// <summary>Allocates descriptor sets from a list of pools, adding a pool when the current one is full.</summary>
sealed unsafe class DescriptorAllocator(GpuContext gpu, uint setsPerPool, params DescriptorPoolSize[] perSet) : IDisposable
{
    readonly List<DescriptorPool> pools = [];
    int current;                                        // the pool to try first
    public int Pools => pools.Count;
    public int Allocated { get; private set; }

    public DescriptorSet Allocate(DescriptorSetLayout layout)
    {
        while (true)
        {
            if (current == pools.Count) pools.Add(CreatePool());
            var info = new DescriptorSetAllocateInfo { SType = StructureType.DescriptorSetAllocateInfo, DescriptorPool = pools[current], DescriptorSetCount = 1, PSetLayouts = &layout };
            DescriptorSet set;
            var result = gpu.Vk.AllocateDescriptorSets(gpu.Device, &info, &set);
            if (result is Result.ErrorOutOfPoolMemory or Result.ErrorFragmentedPool) { current++; continue; }   // full: try the next pool
            result.Check("AllocateDescriptorSets");
            Allocated++;
            return set;
        }
    }

    /// <summary>Frees every set from every pool at once. Only when no frame in flight still uses them.</summary>
    public void Reset()
    {
        foreach (var pool in pools) gpu.Vk.ResetDescriptorPool(gpu.Device, pool, 0).Check("ResetDescriptorPool");
        current = 0;
        Allocated = 0;
    }

    DescriptorPool CreatePool()
    {
        var sizes = perSet.Select(s => new DescriptorPoolSize(s.Type, s.DescriptorCount * setsPerPool)).ToArray();
        fixed (DescriptorPoolSize* p = sizes)
        {
            var info = new DescriptorPoolCreateInfo { SType = StructureType.DescriptorPoolCreateInfo, MaxSets = setsPerPool, PoolSizeCount = (uint)sizes.Length, PPoolSizes = p };
            DescriptorPool pool;
            gpu.Vk.CreateDescriptorPool(gpu.Device, &info, null, &pool).Check("CreateDescriptorPool");
            return pool;
        }
    }

    public void Dispose()
    {
        foreach (var pool in pools) gpu.Vk.DestroyDescriptorPool(gpu.Device, pool, null);
    }
}` },
      { type: 'p', text: 'The sample allocates 20 single-texture sets from pools of 8, resets, and allocates again:' },
      { type: 'code', title: 'Pools.cs', code: cs`
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
var binding = new DescriptorSetLayoutBinding { Binding = 0, DescriptorType = DescriptorType.CombinedImageSampler, DescriptorCount = 1, StageFlags = ShaderStageFlags.FragmentBit };
DescriptorSetLayout layout;
unsafe
{
    var info = new DescriptorSetLayoutCreateInfo { SType = StructureType.DescriptorSetLayoutCreateInfo, BindingCount = 1, PBindings = &binding };
    gpu.Vk.CreateDescriptorSetLayout(gpu.Device, &info, null, &layout).Check("CreateDescriptorSetLayout");
}

using (var allocator = new DescriptorAllocator(gpu, setsPerPool: 8, new DescriptorPoolSize(DescriptorType.CombinedImageSampler, 1)))
{
    for (int i = 0; i < 20; i++) allocator.Allocate(layout);
    Console.WriteLine($"20 sets: {allocator.Pools} pools");
    allocator.Reset();
    for (int i = 0; i < 5; i++) allocator.Allocate(layout);
    Console.WriteLine($"After Reset, 5 sets: still {allocator.Pools} pools, {allocator.Allocated} sets allocated");
}
unsafe { gpu.Vk.DestroyDescriptorSetLayout(gpu.Device, layout, null); }`, output: '20 sets: 3 pools\nAfter Reset, 5 sets: still 3 pools, 5 sets allocated' },
      { type: 'h2', text: 'Bindless: one array for every texture' },
      { type: 'p', text: 'Sets per material still mean one `CmdBindDescriptorSets` per material change and one set to create for every material. **Bindless** rendering removes both. All textures go into **one** large array in one set, bound once per frame; a draw tells the shader which element to use, as an index in a push constant. Adding a texture means writing one array element. Try it, including what happens to a slot when its texture is unloaded:' },
      { type: 'widget', name: 'bindless-table' },
      { type: 'p', text: 'The GLSL declares the array without a size:' },
      { type: 'code', title: 'Engine/BindlessShaders.cs', code: cs`
using System.Numerics;
using System.Runtime.InteropServices;
using Silk.NET.Vulkan;

static class BindlessShaders
{
    public const string Vertex = """
        #version 450

        layout(location = 0) in vec3 inPosition;
        layout(location = 2) in vec2 inUv;
        layout(location = 0) out vec2 vUv;

        layout(push_constant) uniform Push { mat4 mvp; uint textureIndex; } push;

        void main()
        {
            gl_Position = push.mvp * vec4(inPosition, 1.0);
            vUv = inUv;
        }
        """;

    public const string Fragment = """
        #version 450
        #extension GL_EXT_nonuniform_qualifier : require

        layout(location = 0) in vec2 vUv;
        layout(location = 0) out vec4 outColor;

        layout(set = 0, binding = 0) uniform sampler2D textures[];          // every texture the engine has loaded
        layout(push_constant) uniform Push { mat4 mvp; uint textureIndex; } push;

        void main()
        {
            outColor = texture(textures[nonuniformEXT(push.textureIndex)], vUv);
        }
        """;
}

/// <summary>A matrix and the index of the texture to use, padded to 80 bytes.</summary>
[StructLayout(LayoutKind.Sequential)]
struct TexturedPush(Matrix4x4 mvp, uint textureIndex)
{
    public Matrix4x4 Mvp = mvp;
    public uint TextureIndex = textureIndex;
    uint pad0, pad1, pad2;
    public const uint Size = 80;
    public static readonly PushConstantRange Range = new(ShaderStageFlags.VertexBit | ShaderStageFlags.FragmentBit, 0, Size);
}` },
      { type: 'p', text: '`nonuniformEXT` tells the compiler that the index might differ between pixels of the same draw (if it came from a vertex attribute, for example). With a push constant it is the same for the whole draw, so it is not strictly needed, but it costs nothing here and prevents a subtle bug when the index later comes from per-instance data.' },
      { type: 'p', text: 'Arrays like this need **descriptor indexing**, a Vulkan 1.2 feature set that must be enabled when the device is created. `GpuContext` now checks four of those features and enables them when they are all present:' },
      { type: 'code', title: 'Engine/GpuContext.cs', code: cs`
using Silk.NET.Core.Native;
using Silk.NET.Vulkan;
using Silk.NET.Vulkan.Extensions.EXT;
using Silk.NET.Vulkan.Extensions.KHR;
using Silk.NET.Windowing;

/// <summary>Instance, window surface, GPU, logical device and queues: what every renderer starts from.</summary>
sealed unsafe class GpuContext : IDisposable
{
    public readonly Vk Vk = Vk.GetApi();
    public readonly Instance Instance;
    public readonly KhrSurface KhrSurface;
    public readonly SurfaceKHR Surface;
    public readonly PhysicalDevice PhysicalDevice;
    public readonly string DeviceName = "";
    public readonly Device Device;
    public readonly KhrSwapchain KhrSwapchain;
    public readonly uint GraphicsFamily, PresentFamily;
    public readonly Queue GraphicsQueue, PresentQueue;
    public readonly bool Validation;
    public readonly bool Bindless;                      // new: descriptor indexing is supported and enabled (lesson 4)
    public readonly string[] InstanceExtensions;
    readonly ExtDebugUtils? debugUtils;
    readonly DebugUtilsMessengerEXT messenger;

    public GpuContext(IWindow window, bool validation = true)
    {
        // 1. The instance, with the extensions this platform's windows need
        byte** windowExtensions = window.VkSurface!.GetRequiredExtensions(out uint windowCount);
        var extensions = new List<string>();
        for (int i = 0; i < windowCount; i++) extensions.Add(SilkMarshal.PtrToString((nint)windowExtensions[i])!);
        Validation = validation && DebugMessenger.IsLayerAvailable(Vk);
        if (Validation) extensions.Add(ExtDebugUtils.ExtensionName);
        InstanceExtensions = extensions.ToArray();
        string[] layers = Validation ? [DebugMessenger.ValidationLayer] : [];

        var appInfo = new ApplicationInfo { SType = StructureType.ApplicationInfo, ApiVersion = Vk.Version13 };
        var debugInfo = DebugMessenger.CreateInfo();
        nint pExtensions = SilkMarshal.StringArrayToPtr(InstanceExtensions), pLayers = SilkMarshal.StringArrayToPtr(layers);
        var instanceInfo = new InstanceCreateInfo
        {
            SType = StructureType.InstanceCreateInfo, PNext = Validation ? &debugInfo : null, PApplicationInfo = &appInfo,
            EnabledExtensionCount = (uint)InstanceExtensions.Length, PpEnabledExtensionNames = (byte**)pExtensions,
            EnabledLayerCount = (uint)layers.Length, PpEnabledLayerNames = (byte**)pLayers
        };
        Instance instance;
        Vk.CreateInstance(&instanceInfo, null, &instance).Check("CreateInstance");
        Instance = instance;
        SilkMarshal.Free(pExtensions); SilkMarshal.Free(pLayers);
        if (Validation && Vk.TryGetInstanceExtension(Instance, out ExtDebugUtils utils))
        {
            debugUtils = utils;
            DebugUtilsMessengerEXT m;
            utils.CreateDebugUtilsMessenger(Instance, &debugInfo, null, &m).Check("CreateDebugUtilsMessenger");
            messenger = m;
        }

        // 2. The surface for this window
        if (!Vk.TryGetInstanceExtension(Instance, out KhrSurface)) throw new NotSupportedException("VK_KHR_surface missing");
        Surface = window.VkSurface.Create<AllocationCallbacks>(Instance.ToHandle(), null).ToSurface();

        // 3. A GPU with the swapchain extension, a graphics family and a family that can present
        uint gpuCount = 0;
        Vk.EnumeratePhysicalDevices(Instance, &gpuCount, null);
        var gpus = new PhysicalDevice[gpuCount];
        fixed (PhysicalDevice* p = gpus) Vk.EnumeratePhysicalDevices(Instance, &gpuCount, p);
        foreach (var gpu in gpus.OrderBy(g => Vk.GetPhysicalDeviceProperties(g).DeviceType == PhysicalDeviceType.DiscreteGpu ? 0 : 1))
        {
            if (!Vk.IsDeviceExtensionPresent(gpu, KhrSwapchain.ExtensionName)) continue;
            var (graphics, present) = FindFamilies(gpu);
            if (graphics < 0 || present < 0) continue;
            PhysicalDevice = gpu; GraphicsFamily = (uint)graphics; PresentFamily = (uint)present;
            var props = Vk.GetPhysicalDeviceProperties(gpu);
            DeviceName = SilkMarshal.PtrToString((nint)props.DeviceName)!;
            break;
        }
        if (PhysicalDevice.Handle == 0) throw new NotSupportedException("No GPU can draw to this window");

        // 4. The logical device: one queue per distinct family, Vulkan 1.3 features, the swapchain extension
        uint[] families = GraphicsFamily == PresentFamily ? [GraphicsFamily] : [GraphicsFamily, PresentFamily];
        float priority = 1f;
        var queueInfos = stackalloc DeviceQueueCreateInfo[families.Length];
        for (int i = 0; i < families.Length; i++)
            queueInfos[i] = new() { SType = StructureType.DeviceQueueCreateInfo, QueueFamilyIndex = families[i], QueueCount = 1, PQueuePriorities = &priority };
        // New: the descriptor-indexing features that bindless textures need, if this GPU has them
        var supported12 = new PhysicalDeviceVulkan12Features { SType = StructureType.PhysicalDeviceVulkan12Features };
        var supported = new PhysicalDeviceFeatures2 { SType = StructureType.PhysicalDeviceFeatures2, PNext = &supported12 };
        Vk.GetPhysicalDeviceFeatures2(PhysicalDevice, &supported);
        Bindless = supported12.RuntimeDescriptorArray && supported12.DescriptorBindingPartiallyBound &&
                   supported12.ShaderSampledImageArrayNonUniformIndexing && supported12.DescriptorBindingSampledImageUpdateAfterBind;
        var f12 = new PhysicalDeviceVulkan12Features
        {
            SType = StructureType.PhysicalDeviceVulkan12Features,
            RuntimeDescriptorArray = Bindless,                      // arrays without a size in GLSL: textures[]
            DescriptorBindingPartiallyBound = Bindless,             // array slots may stay empty
            ShaderSampledImageArrayNonUniformIndexing = Bindless,   // the index may differ between pixels of one draw
            DescriptorBindingSampledImageUpdateAfterBind = Bindless // slots may be written while the set is bound
        };
        var f13 = new PhysicalDeviceVulkan13Features { SType = StructureType.PhysicalDeviceVulkan13Features, PNext = &f12, DynamicRendering = true, Synchronization2 = true };
        var features = new PhysicalDeviceFeatures2 { SType = StructureType.PhysicalDeviceFeatures2, PNext = &f13 };
        nint deviceExtensions = SilkMarshal.StringArrayToPtr([KhrSwapchain.ExtensionName]);
        var deviceInfo = new DeviceCreateInfo
        {
            SType = StructureType.DeviceCreateInfo, PNext = &features,
            QueueCreateInfoCount = (uint)families.Length, PQueueCreateInfos = queueInfos,
            EnabledExtensionCount = 1, PpEnabledExtensionNames = (byte**)deviceExtensions
        };
        Device device;
        Vk.CreateDevice(PhysicalDevice, &deviceInfo, null, &device).Check("CreateDevice");
        Device = device;
        SilkMarshal.Free(deviceExtensions);

        GraphicsQueue = Vk.GetDeviceQueue(Device, GraphicsFamily, 0);
        PresentQueue = Vk.GetDeviceQueue(Device, PresentFamily, 0);
        if (!Vk.TryGetDeviceExtension(Instance, Device, out KhrSwapchain)) throw new NotSupportedException("VK_KHR_swapchain missing");
    }

    (int Graphics, int Present) FindFamilies(PhysicalDevice gpu)
    {
        uint count = 0;
        Vk.GetPhysicalDeviceQueueFamilyProperties(gpu, &count, null);
        var families = new QueueFamilyProperties[count];
        fixed (QueueFamilyProperties* p = families) Vk.GetPhysicalDeviceQueueFamilyProperties(gpu, &count, p);
        int graphics = -1, present = -1;
        for (int i = 0; i < count; i++)
        {
            bool canDraw = (families[i].QueueFlags & QueueFlags.GraphicsBit) != 0;
            Bool32 canPresent;
            KhrSurface.GetPhysicalDeviceSurfaceSupport(gpu, (uint)i, Surface, &canPresent);
            if (canDraw && canPresent) return (i, i);          // best case: one family does both
            if (canDraw && graphics < 0) graphics = i;
            if (canPresent && present < 0) present = i;
        }
        return (graphics, present);
    }

    public void Dispose()
    {
        Vk.DeviceWaitIdle(Device);
        Vk.DestroyDevice(Device, null);
        KhrSurface.DestroySurface(Instance, Surface, null);
        debugUtils?.DestroyDebugUtilsMessenger(Instance, messenger, null);
        Vk.DestroyInstance(Instance, null);
    }
}` },
      { type: 'table', head: ['Feature or flag', 'Allows'], rows: [
        ['`runtimeDescriptorArray`', 'An array without a size in GLSL: its size comes from the set layout'],
        ['`PartiallyBound` binding flag', 'Array elements nobody has written yet, as long as shaders never read them'],
        ['`UpdateAfterBind` binding flag', 'Writing new elements while the set is bound in command buffers, so textures can stream in during drawing'],
        ['`shaderSampledImageArrayNonUniformIndexing`', 'An index that varies within one draw (with `nonuniformEXT`)']
      ] },
      { type: 'code', title: 'Engine/BindlessTextures.cs', code: cs`
using Silk.NET.Vulkan;

/// <summary>One descriptor set with an array of up to Capacity textures, bound once. Shaders choose a texture by index.</summary>
sealed unsafe class BindlessTextures : IDisposable
{
    public const uint Capacity = 4096;
    readonly GpuContext gpu;
    readonly DescriptorPool pool;
    readonly Stack<uint> freeSlots = new();
    uint nextSlot;
    public readonly DescriptorSetLayout Layout;
    public readonly DescriptorSet Set;
    public int Count { get; private set; }

    public BindlessTextures(GpuContext gpu)
    {
        if (!gpu.Bindless) throw new NotSupportedException("This GPU does not support descriptor indexing");
        this.gpu = gpu;
        var vk = gpu.Vk;
        var binding = new DescriptorSetLayoutBinding { Binding = 0, DescriptorType = DescriptorType.CombinedImageSampler, DescriptorCount = Capacity, StageFlags = ShaderStageFlags.FragmentBit };
        var bindingFlags = DescriptorBindingFlags.PartiallyBoundBit | DescriptorBindingFlags.UpdateAfterBindBit;
        var flagsInfo = new DescriptorSetLayoutBindingFlagsCreateInfo { SType = StructureType.DescriptorSetLayoutBindingFlagsCreateInfo, BindingCount = 1, PBindingFlags = &bindingFlags };
        var layoutInfo = new DescriptorSetLayoutCreateInfo
        {
            SType = StructureType.DescriptorSetLayoutCreateInfo, PNext = &flagsInfo,
            Flags = DescriptorSetLayoutCreateFlags.UpdateAfterBindPoolBit, BindingCount = 1, PBindings = &binding
        };
        DescriptorSetLayout layout;
        vk.CreateDescriptorSetLayout(gpu.Device, &layoutInfo, null, &layout).Check("CreateDescriptorSetLayout");
        Layout = layout;

        var size = new DescriptorPoolSize(DescriptorType.CombinedImageSampler, Capacity);
        var poolInfo = new DescriptorPoolCreateInfo
        {
            SType = StructureType.DescriptorPoolCreateInfo, Flags = DescriptorPoolCreateFlags.UpdateAfterBindBit,
            MaxSets = 1, PoolSizeCount = 1, PPoolSizes = &size
        };
        DescriptorPool p;
        vk.CreateDescriptorPool(gpu.Device, &poolInfo, null, &p).Check("CreateDescriptorPool");
        pool = p;
        var allocInfo = new DescriptorSetAllocateInfo { SType = StructureType.DescriptorSetAllocateInfo, DescriptorPool = pool, DescriptorSetCount = 1, PSetLayouts = &layout };
        DescriptorSet set;
        vk.AllocateDescriptorSets(gpu.Device, &allocInfo, &set).Check("AllocateDescriptorSets");
        Set = set;
    }

    /// <summary>Writes the texture into a free slot and returns the slot number, for a shader to index with.</summary>
    public uint Add(Texture texture)
    {
        uint slot = freeSlots.Count > 0 ? freeSlots.Pop() : nextSlot++;
        if (slot >= Capacity) throw new InvalidOperationException("All texture slots are in use");
        var imageInfo = new DescriptorImageInfo { Sampler = texture.Sampler, ImageView = texture.Image.View, ImageLayout = ImageLayout.ShaderReadOnlyOptimal };
        var write = new WriteDescriptorSet
        {
            SType = StructureType.WriteDescriptorSet, DstSet = Set, DstBinding = 0, DstArrayElement = slot,
            DescriptorCount = 1, DescriptorType = DescriptorType.CombinedImageSampler, PImageInfo = &imageInfo
        };
        gpu.Vk.UpdateDescriptorSets(gpu.Device, 1, &write, 0, null);
        Count++;
        return slot;
    }

    /// <summary>Makes a slot free for reuse. Call it through the deletion queue: frames in flight may still read the old texture.</summary>
    public void Remove(uint slot)
    {
        freeSlots.Push(slot);
        Count--;
    }

    public void Bind(CommandBuffer cmd, PipelineLayout pipelineLayout)
    {
        var set = Set;
        gpu.Vk.CmdBindDescriptorSets(cmd, PipelineBindPoint.Graphics, pipelineLayout, 0, 1, &set, 0, null);
    }

    public void Dispose()
    {
        gpu.Vk.DestroyDescriptorPool(gpu.Device, pool, null);
        gpu.Vk.DestroyDescriptorSetLayout(gpu.Device, Layout, null);
    }
}` },
      { type: 'p', text: 'Reusing a slot needs the same care as destroying a buffer. If frame 10 still reads slot 3 and you write a new texture into slot 3 while recording frame 11, frame 10 may sample the wrong image. So `Remove` goes through lesson 2’s deletion queue: `deletions.Retire("texture slot 3", () => bindless.Remove(3))`.' },
      { type: 'h2', text: 'Four materials, one bind' },
      { type: 'p', text: 'The sample loads four 2 × 2 textures (brick, concrete, timber and glass colours) into the bindless array and draws four boxes facing the camera, each with its own texture index. Then it removes the timber texture and adds a steel one, which takes the freed slot:' },
      { type: 'code', title: 'Bindless.cs', code: cs`
using System.Numerics;
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
using var loop = new FrameLoop(gpu, window);
using var bindless = new BindlessTextures(gpu);
using var pipeline = new MeshPipeline(gpu, loop.Swapchain.Format, BindlessShaders.Vertex, BindlessShaders.Fragment,
    setLayouts: [bindless.Layout], pushConstants: [TexturedPush.Range], depthFormat: FrameLoop.DepthFormat, vertexLayout: MeshVertex.Layout);
using var capture = new ReadbackBuffer(gpu, loop.Swapchain.Extent);
var (vertices, indices) = Shapes.Box(new Vector3(-0.5f), new Vector3(0.5f));
using var box = new Mesh<MeshVertex>(gpu, vertices, indices);

Texture Solid(byte r, byte g, byte b) => new(gpu, 2, 2, Enumerable.Repeat(new[] { r, g, b, (byte)255 }, 4).SelectMany(t => t).ToArray());
var textures = new List<Texture> { Solid(178, 74, 52), Solid(160, 160, 155), Solid(150, 105, 60), Solid(120, 180, 210) };
var slots = textures.Select(bindless.Add).ToArray();
Console.WriteLine($"Slots: {string.Join(", ", slots)}");

var props12 = new PhysicalDeviceVulkan12Properties { SType = StructureType.PhysicalDeviceVulkan12Properties };
var props = new PhysicalDeviceProperties2 { SType = StructureType.PhysicalDeviceProperties2 };
unsafe { props.PNext = &props12; gpu.Vk.GetPhysicalDeviceProperties2(gpu.PhysicalDevice, &props); }
Console.WriteLine($"Sampled images per stage: {props.Properties.Limits.MaxPerStageDescriptorSampledImages} classic, " +
                  $"{props12.MaxPerStageDescriptorUpdateAfterBindSampledImages:N0} with update-after-bind");

var camera = new OrbitCamera { Pitch = 0f };
camera.Frame(new(-4f, -0.5f, -0.5f), new(4f, 0.5f, 0.5f), 800f / 600f);
var viewProjection = camera.View * camera.Projection(800f / 600f);

void Render(uint[] textureOf)
{
    loop.Begin(out var frame);
    loop.BeginRendering(frame);
    gpu.Vk.CmdBindPipeline(frame.Cmd, PipelineBindPoint.Graphics, pipeline.Handle);
    bindless.Bind(frame.Cmd, pipeline.Layout);                                   // once for every draw
    box.Bind(frame.Cmd);
    for (int i = 0; i < 4; i++)
    {
        var push = new TexturedPush(Matrix4x4.CreateTranslation(i * 2f - 3f, 0f, 0f) * viewProjection, textureOf[i]);
        unsafe { gpu.Vk.CmdPushConstants(frame.Cmd, pipeline.Layout, TexturedPush.Range.StageFlags, 0, TexturedPush.Size, &push); }
        box.DrawBound(frame.Cmd);
    }
    loop.EndRendering(frame);
    loop.End(frame, capture);
    loop.WaitIdle();
    var colours = Enumerable.Range(0, 4).Select(i =>
    {
        var p = Camera.Project(new(i * 2f - 3f, -0.5f, 0f), viewProjection, loop.Swapchain.Extent);
        return capture.Pixel((int)p.X, (int)p.Y).ToString();
    });
    Console.WriteLine($"Box colours: {string.Join(" ", colours)}");
}

Render(slots);
bindless.Remove(slots[2]);                                                       // safe here: the GPU is idle
textures[2].Dispose();
textures[2] = Solid(90, 100, 115);
slots[2] = bindless.Add(textures[2]);
Console.WriteLine($"Timber removed, steel added in slot {slots[2]}; {bindless.Count} textures");
Render(slots);
foreach (var t in textures) t.Dispose();`, output: 'Slots: 0, 1, 2, 3\nSampled images per stage: 200 classic, 1,048,576 with update-after-bind\nBox colours: (178, 74, 52) (160, 160, 155) (150, 105, 60) (120, 180, 210)\nTimber removed, steel added in slot 2; 4 textures\nBox colours: (178, 74, 52) (160, 160, 155) (90, 100, 115) (120, 180, 210)' },
      { type: 'p', text: 'One descriptor set bind served all four draws, each box showing its own texture exactly. The steel texture reused slot 2, so nothing else had to change: any object that refers to slot 2 now shows steel. On this GPU a classic set layout may give one shader stage only 200 sampled images, but with update-after-bind the limit is over a million, so a single array can hold every texture of a large model.' },
      { type: 'note', kind: 'tip', text: 'Bindless works for buffers too. Vulkan 1.2’s **buffer device address** gives a buffer a 64-bit GPU address that can be passed in a push constant or stored inside another buffer, so a shader can read per-object data without any descriptor at all. Module 7 uses that for GPU-driven drawing.' },
      { type: 'quiz', question: 'Why does a bindless texture array need the PartiallyBound flag?', options: ['To make the array larger', 'Most of its 4,096 slots hold no texture yet, and without the flag every slot would have to be valid when the set is used', 'To allow linear filtering', 'To bind it to several pipelines'], answer: 1, explain: 'Without PARTIALLY_BOUND, every descriptor in a bound set must be valid when a draw uses the set. With it, only the elements the shader actually reads must be valid.' },
      { type: 'quiz', question: 'Which set should hold the camera matrices, given sets ordered by frequency of change?', options: ['Set 2, per object', 'Set 1, per material', 'Set 0, bound once per frame', 'A push constant per draw'], answer: 2, explain: 'The camera changes once per frame and is used by every draw. Set 0 is bound once, and binding higher sets for materials leaves it in place.' },
      { type: 'exercise', task: 'Compare descriptor binds for 10,000 objects using 300 materials (one set per material) chosen at random (`new Random(7)`): in random order, sorted by material, and with bindless textures.', hint: 'With one set per material, each change of material between consecutive draws costs one `CmdBindDescriptorSets`. Count changes as in the previous lesson’s exercise. With bindless the set is bound once and each draw pushes its texture index.', solution: cs`
var random = new Random(7);
int[] materialOf = Enumerable.Range(0, 10_000).Select(_ => random.Next(300)).ToArray();

static int Binds(IEnumerable<int> materials)
{
    int binds = 0, last = -1;
    foreach (int m in materials)
        if (m != last) { binds++; last = m; }
    return binds;
}

Console.WriteLine($"Set per material, random order: {Binds(materialOf),5} binds");
Console.WriteLine($"Set per material, sorted:       {Binds(materialOf.Order()),5} binds");
Console.WriteLine($"Bindless:                       {1,5} bind, {materialOf.Length} push constants");
Console.WriteLine($"Materials actually used: {materialOf.Distinct().Count()}");`, output: 'Set per material, random order:  9960 binds\nSet per material, sorted:         300 binds\nBindless:                           1 bind, 10000 push constants\nMaterials actually used: 300' }
    ],
    keyPoints: [
      'Order descriptor sets by frequency of change: per frame, per material, per object; per-draw values go in push constants.',
      'A descriptor allocator grows a list of pools when AllocateDescriptorSets reports ErrorOutOfPoolMemory, and resets them all at once.',
      'Bindless: one array of every texture in one set, bound once per frame; draws pass a texture index.',
      'It needs descriptor indexing: runtime arrays, PartiallyBound, UpdateAfterBind and non-uniform indexing, enabled at device creation.',
      'Use nonuniformEXT when the index can vary within a draw.',
      'Freeing a bindless slot is a deletion like any other: retire it through the deletion queue.'
    ]
  },

  // ------------------------------------------------------------------ 5
  {
    slug: 'shader-hot-reload',
    title: 'Shader compilation, reflection and hot reload',
    summary: 'Build shader variants with preprocessor defines, read a SPIR-V module’s bindings and inputs with a small reflection parser, and reload shaders while the viewer runs: watch the files, recompile, swap the pipeline, and keep the old one when the new code has an error.',
    minutes: 24,
    blocks: [
      { type: 'p', text: 'Shaders are where most rendering work happens, and they need many small edits: a lighting term, a colour, a debug view. Restarting the viewer and reloading a large model for every edit wastes minutes. This lesson gives the engine three tools: **variants** of one shader source, **reflection** to see what a compiled shader expects, and **hot reload** to swap shaders while the viewer keeps running.' },
      { type: 'h2', text: 'When to compile' },
      { type: 'table', head: ['Approach', 'Pros', 'Cons'], rows: [
        ['At build time (`glslc` or `glslangValidator` in the build)', 'No compiler shipped; errors found before running', 'Every edit needs a rebuild; no hot reload'],
        ['At run time (shaderc, as this engine does)', 'Edit and reload while running; variants built on demand', 'The compiler ships with the program (a few MB); compile time at start-up'],
        ['Both', 'Development compiles at run time; release builds load precompiled SPIR-V', 'Two paths to keep working']
      ] },
      { type: 'p', text: 'Most engines do both. The engine here compiles at run time, which is what makes hot reload possible.' },
      { type: 'h2', text: 'Variants with defines, and keeping names' },
      { type: 'p', text: 'One source often serves several variants: with and without a texture, with and without clipping planes. Instead of copying the file, the compiler is given `#define`s, and the GLSL uses `#ifdef`. `Shaders.Compile` gains a `defines` parameter, and an `optimize` switch: the optimiser removes the names of variables, which a debugger such as RenderDoc, and the reflection below, would like to show.' },
      { type: 'code', title: 'Engine/Shaders.cs', code: cs`
using System.Text;
using Silk.NET.Core.Native;
using Silk.NET.Shaderc;
using Silk.NET.Vulkan;

static unsafe class Shaders
{
    static readonly Shaderc Api = Shaderc.GetApi();

    /// <summary>Compiles GLSL to SPIR-V for Vulkan 1.3. Throws with the compiler's message if the GLSL has errors.
    /// defines: a #define NAME VALUE for each entry. optimize: false keeps variable names, for debuggers and reflection.</summary>
    public static byte[] Compile(string glsl, ShaderKind kind, string fileName,
                                 IReadOnlyDictionary<string, string>? defines = null, bool optimize = true)
    {
        Compiler* compiler = Api.CompilerInitialize();
        CompileOptions* options = Api.CompileOptionsInitialize();
        Api.CompileOptionsSetTargetEnv(options, TargetEnv.Vulkan, (uint)EnvVersion.Vulkan13);
        Api.CompileOptionsSetOptimizationLevel(options, optimize ? OptimizationLevel.Performance : OptimizationLevel.Zero);
        foreach (var (name, value) in defines ?? new Dictionary<string, string>())
            Api.CompileOptionsAddMacroDefinition(options, name, (nuint)name.Length, value, (nuint)value.Length);
        CompilationResult* result = Api.CompileIntoSpv(compiler, glsl, (nuint)Encoding.UTF8.GetByteCount(glsl), kind, fileName, "main", options);
        try
        {
            if (Api.ResultGetCompilationStatus(result) != CompilationStatus.Success)
                throw new InvalidOperationException(SilkMarshal.PtrToString((nint)Api.ResultGetErrorMessage(result)));
            return new Span<byte>(Api.ResultGetBytes(result), (int)Api.ResultGetLength(result)).ToArray();
        }
        finally
        {
            Api.ResultRelease(result);
            Api.CompileOptionsRelease(options);
            Api.CompilerRelease(compiler);
        }
    }

    public static ShaderModule CreateModule(GpuContext gpu, byte[] spirv)
    {
        fixed (byte* code = spirv)
        {
            var info = new ShaderModuleCreateInfo { SType = StructureType.ShaderModuleCreateInfo, CodeSize = (nuint)spirv.Length, PCode = (uint*)code };
            ShaderModule module;
            gpu.Vk.CreateShaderModule(gpu.Device, &info, null, &module).Check("CreateShaderModule");
            return module;
        }
    }
}` },
      { type: 'h2', text: 'Reading SPIR-V' },
      { type: 'p', text: 'A SPIR-V module is a list of 32-bit words. Five words of header (the magic number 0x07230203, the version, the generator, the ID bound and a zero) are followed by **instructions**. Each instruction’s first word holds its length in the high 16 bits and its **opcode** in the low 16; the rest are operands, mostly IDs that refer to other instructions. Explore a real module, compiled by shaderc from module 2’s triangle fragment shader:' },
      { type: 'widget', name: 'spirv-words' },
      { type: 'p', text: '**Reflection** reads those instructions back to learn what the shader expects: which descriptor sets and bindings, how large the push-constant block is, which inputs and outputs at which locations. Libraries such as SPIRV-Reflect do it thoroughly; the core of it fits in one class. It records names (`OpName`), decorations such as `Location`, `Binding` and `DescriptorSet` (`OpDecorate`), member offsets (`OpMemberDecorate`), types, constants, and the global variables (`OpVariable`) with their **storage class**: `Input`, `Output`, `Uniform`, `UniformConstant` (textures), `PushConstant`.' },
      { type: 'code', title: 'Engine/SpirvReflect.cs', code: cs`
using System.Runtime.InteropServices;
using System.Text;

/// <summary>Reads what a SPIR-V module expects: descriptor bindings, the push-constant size, and inputs and outputs by location.</summary>
static class SpirvReflect
{
    public sealed record Resource(string Kind, string Name, string Type, uint Set = 0, uint Binding = 0, uint Location = 0, uint Size = 0)
    {
        public override string ToString() => Kind switch
        {
            "input" or "output" => $"{Kind,-14} location {Location}: {Type} {Name}",
            "push constant" => $"{Kind,-14} {Size} bytes: {Name}",
            _ => $"{Kind,-14} set {Set}, binding {Binding}: {Type} {Name}"
        };
    }

    // Opcodes, storage classes and decorations from the SPIR-V specification
    const uint OpName = 5, OpConstant = 43, OpVariable = 59, OpDecorate = 71, OpMemberDecorate = 72;
    const uint Input = 1, Uniform = 2, Output = 3, UniformConstant = 0, PushConstant = 9, StorageBuffer = 12;
    const uint Location = 30, Binding = 33, DescriptorSet = 34, Offset = 35;

    public static List<Resource> Read(byte[] spirv)
    {
        var words = MemoryMarshal.Cast<byte, uint>(spirv).ToArray();
        if (words[0] != 0x07230203) throw new InvalidDataException("Not a SPIR-V module");
        var names = new Dictionary<uint, string>();
        var decorations = new Dictionary<(uint Id, uint Decoration), uint>();
        var offsets = new Dictionary<(uint Struct, uint Member), uint>();
        var types = new Dictionary<uint, uint[]>();                         // a type's whole instruction, by its result ID
        var constants = new Dictionary<uint, uint>();
        var variables = new List<(uint Id, uint PointerType, uint Storage)>();

        for (int i = 5; i < words.Length; i += (int)(words[i] >> 16))
        {
            uint op = words[i] & 0xFFFF;
            var ins = words.AsSpan(i, (int)(words[i] >> 16));
            if (op == OpName) names[ins[1]] = Text(ins[2..]);
            else if (op == OpDecorate) decorations[(ins[1], ins[2])] = ins.Length > 3 ? ins[3] : 0;
            else if (op == OpMemberDecorate && ins[3] == Offset) offsets[(ins[1], ins[2])] = ins[4];
            else if (op is >= 19 and <= 39) types[ins[1]] = ins.ToArray();      // OpTypeVoid ... OpTypeForwardPointer
            else if (op == OpConstant) constants[ins[2]] = ins[3];
            else if (op == OpVariable) variables.Add((ins[2], ins[1], ins[3]));
        }

        var result = new List<Resource>();
        foreach (var (id, pointer, storage) in variables)
        {
            uint type = types[pointer][3];                                  // OpTypePointer: result, storage class, pointee
            string name = names.GetValueOrDefault(id) ?? names.GetValueOrDefault(type) ?? "(no name)";
            uint Decoration(uint d) => decorations.GetValueOrDefault((id, d));
            bool hasLocation = decorations.ContainsKey((id, Location));
            Resource? r = storage switch
            {
                Input when hasLocation => new("input", name, TypeName(type), Location: Decoration(Location)),
                Output when hasLocation => new("output", name, TypeName(type), Location: Decoration(Location)),
                PushConstant => new("push constant", name, TypeName(type), Size: SizeOf(type)),
                UniformConstant => new("texture", name, TypeName(type), Decoration(DescriptorSet), Decoration(Binding)),
                Uniform => new("uniform buffer", name, TypeName(type), Decoration(DescriptorSet), Decoration(Binding), Size: SizeOf(type)),
                StorageBuffer => new("storage buffer", name, TypeName(type), Decoration(DescriptorSet), Decoration(Binding)),
                _ => null                                                   // built-ins such as gl_Position, and function locals
            };
            if (r != null) result.Add(r);
        }
        return result.OrderBy(r => r.Kind).ThenBy(r => r.Set).ThenBy(r => r.Binding).ThenBy(r => r.Location).ToList();

        string TypeName(uint t)
        {
            var w = types[t];
            return (w[0] & 0xFFFF) switch
            {
                21 => w[3] == 1 ? "int" : "uint",
                22 => "float",
                23 => ((types[w[2]][0] & 0xFFFF) == 22 ? "vec" : "uvec") + w[3],
                24 => $"mat{w[3]}",
                27 => "sampler2D",
                28 => $"{TypeName(w[2])}[{constants[w[3]]}]",
                29 => $"{TypeName(w[2])}[]",
                30 => names.GetValueOrDefault(t) ?? "block",
                _ => $"type {w[0] & 0xFFFF}"
            };
        }

        uint SizeOf(uint t)
        {
            var w = types[t];
            return (w[0] & 0xFFFF) switch
            {
                21 or 22 => 4,
                23 => 4 * w[3],
                24 => w[3] * SizeOf(w[2]),
                30 => Enumerable.Range(0, w.Length - 2).Max(m => offsets[(t, (uint)m)] + SizeOf(w[2 + m])),   // last byte of any member
                _ => 0
            };
        }
    }

    /// <summary>A literal string: UTF-8 bytes packed into words, ending with a zero byte.</summary>
    static string Text(ReadOnlySpan<uint> words)
    {
        var bytes = MemoryMarshal.AsBytes(words);
        return Encoding.UTF8.GetString(bytes[..bytes.IndexOf((byte)0)]);
    }
}` },
      { type: 'p', text: 'The sample reflects the bindless fragment shader from the previous lesson twice, optimised and not, and the scene vertex shader:' },
      { type: 'code', title: 'Reflect.cs', code: cs`
using Silk.NET.Shaderc;

foreach (var (label, glsl, kind, optimize) in new[]
{
    ("Bindless fragment, optimised", BindlessShaders.Fragment, ShaderKind.FragmentShader, true),
    ("Bindless fragment, not optimised", BindlessShaders.Fragment, ShaderKind.FragmentShader, false),
    ("Scene vertex, not optimised", SceneShaders.Vertex, ShaderKind.VertexShader, false)
})
{
    var spirv = Shaders.Compile(glsl, kind, "reflect.glsl", optimize: optimize);
    Console.WriteLine($"{label}: {spirv.Length / 4} words");
    foreach (var resource in SpirvReflect.Read(spirv)) Console.WriteLine($"  {resource}");
}`, output: 'Bindless fragment, optimised: 215 words\n  input          location 0: vec2 (no name)\n  output         location 0: vec4 (no name)\n  push constant  68 bytes: (no name)\n  texture        set 0, binding 0: sampler2D[] (no name)\nBindless fragment, not optimised: 280 words\n  input          location 0: vec2 vUv\n  output         location 0: vec4 outColor\n  push constant  68 bytes: push\n  texture        set 0, binding 0: sampler2D[] textures\nScene vertex, not optimised: 337 words\n  input          location 0: vec3 inPosition\n  input          location 1: vec3 inNormal\n  output         location 0: vec3 vNormal\n  push constant  80 bytes: push' },
      { type: 'p', text: 'Sets, bindings and locations survive optimisation, because the pipeline needs them; only the names go. The push-constant block of the bindless shader is 68 bytes (a 64-byte matrix and a 4-byte index), smaller than the 80-byte range the C# struct declares. That is allowed: a range may be larger than what a shader reads, never smaller. An engine can use reflection to build pipeline layouts automatically, or, as here, to **check** hand-written layouts and catch mismatches when a shader changes.' },
      { type: 'h2', text: 'Hot reload' },
      { type: 'p', text: 'Hot reload has four steps: notice that a shader file changed, recompile it, build a new pipeline, and swap it in. Each step has a trap:' },
      { type: 'ul', items: [
        '**Noticing.** `FileSystemWatcher` raises events on a thread-pool thread, often several for one save, and some editors save by writing a temporary file and renaming it. The watcher only collects paths; the render loop takes them once they have been quiet for a moment.',
        '**Reading.** The editor may still have the file open. Open it with `FileShare.ReadWrite` and retry briefly.',
        '**Compiling.** You will save code with typos. A failed compile must keep the **old** pipeline and show the error, not crash the viewer.',
        '**Swapping.** Frames in flight still use the old pipeline, so it goes to the deletion queue from lesson 2.'
      ] },
      { type: 'code', title: 'Engine/ShaderWatcher.cs', code: cs`
using System.Collections.Concurrent;

/// <summary>Collects shader files that changed on disk. Events arrive on other threads; the render loop takes the paths.</summary>
sealed class ShaderWatcher : IDisposable
{
    readonly FileSystemWatcher watcher;
    readonly ConcurrentDictionary<string, DateTime> changed = new();

    public ShaderWatcher(string folder, params string[] patterns)
    {
        watcher = new FileSystemWatcher(folder) { NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.FileName | NotifyFilters.Size };
        foreach (var pattern in patterns) watcher.Filters.Add(pattern);
        watcher.Changed += (_, e) => changed[e.FullPath] = DateTime.UtcNow;
        watcher.Created += (_, e) => changed[e.FullPath] = DateTime.UtcNow;
        watcher.Renamed += (_, e) => changed[e.FullPath] = DateTime.UtcNow;    // editors that save a temporary file, then rename it
        watcher.EnableRaisingEvents = true;
    }

    /// <summary>Files that changed and have then been quiet for at least settle: one save often raises several events.</summary>
    public List<string> TakeChanges(TimeSpan settle)
    {
        var ready = new List<string>();
        foreach (var (path, time) in changed)
            if (DateTime.UtcNow - time >= settle && changed.TryRemove(new(path, time))) ready.Add(path);
        return ready;
    }

    public void Dispose() => watcher.Dispose();
}` },
      { type: 'code', title: 'Engine/HotPipeline.cs', code: cs`
using Silk.NET.Shaderc;

/// <summary>A pipeline built from two shader files. Reload rebuilds it when they change and keeps the old one if the new code fails.</summary>
sealed class HotPipeline : IDisposable
{
    readonly string vertexPath, fragmentPath;
    readonly DeletionQueue deletions;
    readonly Func<string, string, MeshPipeline> build;
    public MeshPipeline Current { get; private set; }
    public int Version { get; private set; } = 1;
    public string? LastError { get; private set; }

    public HotPipeline(string vertexPath, string fragmentPath, DeletionQueue deletions, Func<string, string, MeshPipeline> build)
    {
        (this.vertexPath, this.fragmentPath, this.deletions, this.build) = (Path.GetFullPath(vertexPath), Path.GetFullPath(fragmentPath), deletions, build);
        Current = build(ReadShared(vertexPath), ReadShared(fragmentPath));
    }

    /// <summary>Rebuilds if one of the changed paths is a file of this pipeline. True if a new pipeline replaced the old one.</summary>
    public bool Reload(IEnumerable<string> changedPaths)
    {
        if (!changedPaths.Select(Path.GetFullPath).Any(p => p == vertexPath || p == fragmentPath)) return false;
        try
        {
            string vertex = ReadShared(vertexPath), fragment = ReadShared(fragmentPath);
            Shaders.Compile(vertex, ShaderKind.VertexShader, Path.GetFileName(vertexPath));         // first, so errors name the file
            Shaders.Compile(fragment, ShaderKind.FragmentShader, Path.GetFileName(fragmentPath));
            var next = build(vertex, fragment);
            deletions.Retire($"pipeline version {Version}", Current);        // frames in flight may still use it
            (Current, LastError) = (next, null);
            Version++;
            return true;
        }
        catch (InvalidOperationException e)
        {
            LastError = e.Message.Trim();                                   // a typo: keep drawing with the old pipeline
            return false;
        }
    }

    /// <summary>Reads a file that an editor may still have open, retrying briefly.</summary>
    static string ReadShared(string path)
    {
        for (int attempt = 0; ; attempt++)
        {
            try
            {
                using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete);
                return new StreamReader(stream).ReadToEnd();
            }
            catch (IOException) when (attempt < 10) { Thread.Sleep(20); }
        }
    }

    public void Dispose() => Current.Dispose();
}` },
      { type: 'h2', text: 'Editing a shader while the viewer runs' },
      { type: 'p', text: 'The sample writes the scene shaders into a folder, draws a box, then edits the fragment shader twice, as you would in an editor: first a real change (show the normal as a colour), then a typo. After each save it waits for the watcher, reloads and draws again:' },
      { type: 'code', title: 'HotReload.cs', code: cs`
using System.Diagnostics;
using System.Numerics;
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
using var loop = new FrameLoop(gpu, window);
var deletions = new DeletionQueue(() => loop.FrameNumber);
loop.FrameCompleted += deletions.Flush;
deletions.Destroyed += (name, _) => Console.WriteLine($"  (destroyed {name})");
using var capture = new ReadbackBuffer(gpu, loop.Swapchain.Extent);
var (vertices, indices) = Shapes.Box(new Vector3(-0.5f), new Vector3(0.5f));
using var box = new Mesh<MeshVertex>(gpu, vertices, indices);

string folder = Path.Combine(Path.GetTempPath(), "bim-shaders");
Directory.CreateDirectory(folder);
string vertPath = Path.Combine(folder, "scene.vert"), fragPath = Path.Combine(folder, "scene.frag");
File.WriteAllText(vertPath, SceneShaders.Vertex);
File.WriteAllText(fragPath, SceneShaders.Fragment);

using var watcher = new ShaderWatcher(folder, "*.vert", "*.frag");
using var hot = new HotPipeline(vertPath, fragPath, deletions, (v, f) => new MeshPipeline(gpu, loop.Swapchain.Format, v, f,
    pushConstants: [ObjectPush.Range], cull: CullModeFlags.BackBit, depthFormat: FrameLoop.DepthFormat,
    vertexLayout: MeshVertex.Layout, frontFace: FrontFace.CounterClockwise));

var camera = new OrbitCamera { Yaw = 30f, Pitch = 30f };
camera.Frame(new(-0.5f), new(0.5f), 800f / 600f);
var viewProjection = camera.View * camera.Projection(800f / 600f);
var top = Camera.Project(new(0f, 0f, 0.5f), viewProjection, loop.Swapchain.Extent);
var front = Camera.Project(new(0f, -0.5f, 0f), viewProjection, loop.Swapchain.Extent);

void Render()
{
    loop.Begin(out var frame);
    loop.BeginRendering(frame);
    gpu.Vk.CmdBindPipeline(frame.Cmd, PipelineBindPoint.Graphics, hot.Current.Handle);
    var push = new ObjectPush(viewProjection, new(0.9f, 0.6f, 0.1f, 1f));
    unsafe { gpu.Vk.CmdPushConstants(frame.Cmd, hot.Current.Layout, ObjectPush.Range.StageFlags, 0, ObjectPush.Size, &push); }
    box.Draw(frame.Cmd);
    loop.EndRendering(frame);
    loop.End(frame, capture);
    loop.WaitIdle();
    Console.WriteLine($"Version {hot.Version}: top {capture.Pixel((int)top.X, (int)top.Y)}, front {capture.Pixel((int)front.X, (int)front.Y)}");
}

void Edit(string description, string fragmentSource)
{
    Console.WriteLine(description);
    File.WriteAllText(fragPath, fragmentSource);                                 // what the editor does when you save
    var clock = Stopwatch.StartNew();
    List<string> changes;
    while ((changes = watcher.TakeChanges(TimeSpan.FromMilliseconds(100))).Count == 0 && clock.ElapsedMilliseconds < 5000)
        Thread.Sleep(10);                                                        // in a viewer: once per frame
    Console.WriteLine($"  watcher reported: {string.Join(", ", changes.Select(Path.GetFileName))}");
    bool swapped = hot.Reload(changes);
    var errors = hot.LastError?.Split('\n') ?? [];
    Console.WriteLine(swapped ? "  reloaded" : $"  kept the old pipeline. First of {errors.Length} errors:\n  {errors[0]}");
}

Render();
Edit("Edit 1: show the normal as a colour", SceneShaders.Fragment.Replace("push.color.rgb * shade", "normalize(vNormal) * 0.5 + 0.5"));
Render();
Edit("Edit 2: a typo", SceneShaders.Fragment.Replace("push.color.rgb", "push.colour.rgb"));
Render();`, output: 'Version 1: top (244, 203, 89), front (208, 173, 75)\nEdit 1: show the normal as a colour\n  watcher reported: scene.frag\n  reloaded\nVersion 2: top (187, 187, 255), front (187, 0, 187)\nEdit 2: a typo\n  watcher reported: scene.frag\n  kept the old pipeline. First of 5 errors:\n  scene.frag:11: error: \'colour\' : no such field in structure \'push\'\n  (destroyed pipeline version 1)\nVersion 2: top (187, 187, 255), front (187, 0, 187)' },
      { type: 'p', text: 'The first edit was picked up and compiled, and the next frame used the new pipeline: the top face became (187, 187, 255), the normal (0, 0, 1) mapped to a colour, and the front face (0, −1, 0) purple. The typo was reported with the file name and line number (the compiler adds follow-on errors; the first is the one to read), and the viewer kept drawing with version 2. Version 1 was retired when the first edit was loaded and destroyed by the deletion queue as soon as a new frame began after the frame that might still use it had finished.' },
      { type: 'note', kind: 'tip', text: 'Show `LastError` on screen, not only in the console: when a reload fails, a viewer that silently keeps the old shader makes you think your edit had no effect. Many engines draw the error text over the frame, or tint the affected objects magenta, until the next successful reload.' },
      { type: 'quiz', question: 'Why does HotPipeline compile both shaders before calling build, even though building the pipeline compiles them again?', options: ['To make them faster', 'So that a compile error names the real file being edited, and nothing is created or retired when the code is wrong', 'Vulkan requires two compilations', 'To fill the pipeline cache'], answer: 1, explain: 'MeshPipeline compiles with generic names such as mesh.frag. Compiling first with the real file name gives a useful error, and if it fails, nothing has been created yet and the current pipeline stays untouched.' },
      { type: 'quiz', question: 'Which survives the optimiser in a compiled SPIR-V module?', options: ['Variable names', 'Comments', 'Descriptor set, binding and location decorations', 'The GLSL source'], answer: 2, explain: 'The pipeline needs the decorations to connect resources, so they always remain. Names (OpName) are only for debugging and the optimiser strips them; compile without optimisation to keep them.' },
      { type: 'exercise', task: 'Use reflection to check that two shaders fit together. Compare the outputs of `ModelShaders.Vertex` (module 4) with the inputs of a fragment shader that expects a `vec3` at location 1, and report every input that the vertex shader does not provide with the same type.', hint: 'Compile both with `optimize: false`, read them with `SpirvReflect.Read`, and look up each fragment input in a dictionary of the vertex outputs keyed by location. The vertex shader writes a `vec2` (the UV) at location 1.', solution: cs`
using Silk.NET.Shaderc;

const string fragment = """
    #version 450
    layout(location = 0) in vec3 vNormal;
    layout(location = 1) in vec3 vTint;
    layout(location = 0) out vec4 outColor;
    void main() { outColor = vec4(vNormal * vTint, 1.0); }
    """;

var outputs = SpirvReflect.Read(Shaders.Compile(ModelShaders.Vertex, ShaderKind.VertexShader, "model.vert", optimize: false))
    .Where(r => r.Kind == "output").ToDictionary(r => r.Location);
var inputs = SpirvReflect.Read(Shaders.Compile(fragment, ShaderKind.FragmentShader, "tint.frag", optimize: false))
    .Where(r => r.Kind == "input");

foreach (var input in inputs)
{
    if (!outputs.TryGetValue(input.Location, out var output))
        Console.WriteLine($"Location {input.Location}: {input.Name} ({input.Type}) is never written by the vertex shader");
    else if (output.Type != input.Type)
        Console.WriteLine($"Location {input.Location}: {input.Name} expects {input.Type}, but the vertex shader writes {output.Type} {output.Name}");
    else
        Console.WriteLine($"Location {input.Location}: {input.Name} ({input.Type}) OK");
}`, output: 'Location 0: vNormal (vec3) OK\nLocation 1: vTint expects vec3, but the vertex shader writes vec2 vUv' }
    ],
    keyPoints: [
      'Compile at run time while developing (it enables hot reload); ship precompiled SPIR-V if you prefer.',
      'Build variants from one source with #define and #ifdef; compile without optimisation to keep names for debuggers.',
      'SPIR-V is words: a 5-word header, then instructions whose first word holds length and opcode.',
      'Reflection reads OpName, OpDecorate (set, binding, location), types and OpVariable storage classes.',
      'Hot reload: watch files, wait until they are quiet, read them shared, compile, swap, and retire the old pipeline.',
      'A failed compile keeps the old pipeline and shows the error; it must never crash the viewer.'
    ]
  },

  // ------------------------------------------------------------------ 6
  {
    slug: 'render-graph',
    title: 'A simple render graph: passes and barriers',
    summary: 'Let each rendering pass declare which images it reads and writes, and let a render graph work out the rest: drop passes whose results nobody uses, catch reads of images nobody wrote, and insert every layout transition and barrier.',
    minutes: 26,
    blocks: [
      { type: 'p', text: 'So far every frame has been one pass: draw into the swapchain image. Real frames have several. Module 6 will render a **shadow map**, then the scene into off-screen images, then light it, then **tone-map** the result into the swapchain image; a BIM viewer adds an ID buffer for picking and an outline pass for the selection. Each pass reads images that earlier passes wrote, and between them come barriers with the right layouts, stages and accesses.' },
      { type: 'p', text: 'Writing those barriers by hand is the most error-prone part of Vulkan. Insert a pass in the middle, or turn one off, and the barriers around it are wrong. A **render graph** (also called a frame graph) fixes this by turning the question around. Each pass only **declares** what it reads and writes and how; the graph then:' },
      { type: 'ol', items: [
        '**Culls** passes whose results nothing uses, working backwards from the outputs (the swapchain image).',
        '**Validates** the frame: a pass that reads an image no earlier pass wrote is a bug, reported before anything runs.',
        '**Schedules barriers** by following each image’s state through the passes: its layout and the last stages and accesses that touched it.',
        'Then **executes** the surviving passes with their barriers.'
      ] },
      { type: 'p', text: 'Production graphs (Frostbite’s FrameGraph is the well-known example) also reorder passes, allocate short-lived images and let several share memory. This one keeps passes in the order added and uses images the application created, which is enough to remove hand-written barriers.' },
      { type: 'widget', name: 'render-graph' },
      { type: 'h2', text: 'From a use to a barrier' },
      { type: 'p', text: 'Every way a pass can use an image implies a layout, the pipeline stages that touch it, and the kind of access:' },
      { type: 'table', head: ['Use', 'Layout', 'Stages', 'Access'], rows: [
        ['Colour attachment', '`ColorAttachmentOptimal`', 'Colour attachment output', 'Colour attachment write'],
        ['Depth attachment', '`DepthAttachmentOptimal`', 'Early and late fragment tests', 'Depth read and write'],
        ['Sampled in a shader', '`ShaderReadOnlyOptimal`', 'Fragment shader', 'Sampled read'],
        ['Copy or blit source', '`TransferSrcOptimal`', 'All transfer', 'Transfer read'],
        ['Copy, blit or clear destination', '`TransferDstOptimal`', 'All transfer', 'Transfer write']
      ] },
      { type: 'p', text: 'Between two uses of the same image, a barrier is needed if the layout changes, if the earlier use wrote (read-after-write, write-after-write) or if the new use writes (write-after-read). Two reads in the same layout need no barrier, as long as the earlier barrier already covers the new stage.' },
      { type: 'code', title: 'Engine/RenderGraph.cs', code: cs`
using System.Runtime.InteropServices;
using Silk.NET.Vulkan;

/// <summary>How a pass uses an image. Each use implies a layout, the stages that touch the image, and the access.</summary>
enum ImageUse { ColorAttachment, DepthAttachment, Sampled, TransferSrc, TransferDst }

/// <summary>An image the graph tracks: its handle, and its layout, stages and accesses after the passes so far.</summary>
sealed class GraphImage(string name, Image image, ImageAspectFlags aspect, bool hasContent)
{
    public readonly string Name = name;
    public readonly Image Image = image;
    public readonly ImageAspectFlags Aspect = aspect;
    public readonly bool HasContent = hasContent;                 // imported with pixels worth reading
    public ImageLayout Layout;
    public PipelineStageFlags2 Stage;
    public AccessFlags2 Access;
}

/// <summary>Passes declare the images they read and write; the graph culls unused passes, validates reads and inserts the barriers.</summary>
sealed unsafe class RenderGraph
{
    sealed record Use(GraphImage Image, ImageUse How, bool Writes);
    sealed class Pass(string name, Action<CommandBuffer> execute)
    {
        public readonly string Name = name;
        public readonly Action<CommandBuffer> Execute = execute;
        public readonly List<Use> Uses = [];
        public readonly List<ImageMemoryBarrier2> Barriers = [];
        public bool Culled;
    }

    const AccessFlags2 Writes = AccessFlags2.ColorAttachmentWriteBit | AccessFlags2.DepthStencilAttachmentWriteBit |
                                AccessFlags2.TransferWriteBit | AccessFlags2.ShaderStorageWriteBit;
    readonly List<GraphImage> images = [];
    readonly List<Pass> passes = [];
    readonly HashSet<GraphImage> outputs = [];
    Dictionary<GraphImage, (ImageLayout Layout, PipelineStageFlags2 Stage, AccessFlags2 Access)> final = [];

    /// <summary>Adds an image the application created, in its current state. hasContent: false if its pixels are not worth keeping.</summary>
    public GraphImage Import(string name, Image image, ImageAspectFlags aspect, ImageLayout layout = ImageLayout.Undefined,
                             PipelineStageFlags2 stage = PipelineStageFlags2.None, AccessFlags2 access = AccessFlags2.None, bool hasContent = false)
    {
        var graphImage = new GraphImage(name, image, aspect, hasContent) { Layout = layout, Stage = stage, Access = access };
        images.Add(graphImage);
        return graphImage;
    }

    public void AddPass(string name, (GraphImage Image, ImageUse How)[] reads, (GraphImage Image, ImageUse How)[] writes, Action<CommandBuffer> execute)
    {
        var pass = new Pass(name, execute);
        pass.Uses.AddRange(reads.Select(r => new Use(r.Image, r.How, false)));
        pass.Uses.AddRange(writes.Select(w => new Use(w.Image, w.How, true)));
        passes.Add(pass);
    }

    /// <summary>Marks an image the frame exists to produce, such as the swapchain image.</summary>
    public void Output(GraphImage image) => outputs.Add(image);

    /// <summary>Culls, validates and schedules barriers. Returns one line per pass describing the plan.</summary>
    public List<string> Compile()
    {
        // 1. Cull, from the last pass back: a pass is needed if it writes a needed image; what it reads is then needed too
        var needed = new HashSet<GraphImage>(outputs);
        for (int i = passes.Count - 1; i >= 0; i--)
        {
            var pass = passes[i];
            pass.Culled = !pass.Uses.Any(u => u.Writes && needed.Contains(u.Image));
            if (!pass.Culled) needed.UnionWith(pass.Uses.Where(u => !u.Writes).Select(u => u.Image));
        }

        // 2. Validate and schedule barriers, from the first pass forward, following each image's state
        var state = images.ToDictionary(im => im, im => (im.Layout, im.Stage, im.Access));
        var written = images.Where(im => im.HasContent).ToHashSet();
        var plan = new List<string>();
        foreach (var pass in passes)
        {
            pass.Barriers.Clear();
            if (pass.Culled) { plan.Add($"{pass.Name}: culled (nothing uses what it writes)"); continue; }
            var notes = new List<string>();
            foreach (var use in pass.Uses)
            {
                if (!use.Writes && !written.Contains(use.Image))
                    throw new InvalidOperationException($"Pass '{pass.Name}' reads '{use.Image.Name}', but no earlier pass writes it");
                var (layout, stage, access) = Target(use.How);
                var old = state[use.Image];
                bool layoutChanges = old.Layout != layout, oldWrote = (old.Access & Writes) != 0;
                if (layoutChanges || oldWrote || use.Writes || (old.Stage & stage) != stage)
                {
                    pass.Barriers.Add(new ImageMemoryBarrier2
                    {
                        SType = StructureType.ImageMemoryBarrier2,
                        SrcStageMask = old.Stage, SrcAccessMask = old.Access & Writes,          // only writes need to be made available
                        DstStageMask = stage, DstAccessMask = access,
                        OldLayout = old.Layout, NewLayout = layout,
                        SrcQueueFamilyIndex = Vk.QueueFamilyIgnored, DstQueueFamilyIndex = Vk.QueueFamilyIgnored,
                        Image = use.Image.Image,
                        SubresourceRange = new ImageSubresourceRange(use.Image.Aspect, 0, Vk.RemainingMipLevels, 0, Vk.RemainingArrayLayers)
                    });
                    notes.Add(layoutChanges ? $"{use.Image.Name} {Name(old.Layout)} -> {Name(layout)}" : $"{use.Image.Name} {(oldWrote ? "write" : "read")} -> {(use.Writes ? "write" : "read")}");
                }
                bool merge = !layoutChanges && !oldWrote && !use.Writes;                    // another reader: remember both
                state[use.Image] = merge ? (layout, old.Stage | stage, old.Access | access) : (layout, stage, access);
                if (use.Writes) written.Add(use.Image);
            }
            plan.Add($"{pass.Name}: {(notes.Count == 0 ? "no barriers" : string.Join(", ", notes))}");
        }
        final = state;
        return plan;
    }

    /// <summary>Records each surviving pass after its barriers, then leaves every image's state as the last pass left it.</summary>
    public void Execute(Vk vk, CommandBuffer cmd)
    {
        foreach (var pass in passes.Where(p => !p.Culled))
        {
            if (pass.Barriers.Count > 0)
                fixed (ImageMemoryBarrier2* barriers = CollectionsMarshal.AsSpan(pass.Barriers))
                {
                    var dependency = new DependencyInfo { SType = StructureType.DependencyInfo, ImageMemoryBarrierCount = (uint)pass.Barriers.Count, PImageMemoryBarriers = barriers };
                    vk.CmdPipelineBarrier2(cmd, &dependency);
                }
            pass.Execute(cmd);
        }
        foreach (var (image, s) in final) (image.Layout, image.Stage, image.Access) = s;
    }

    /// <summary>Some layouts have two names in Silk.NET (core and KHR); print the core one.</summary>
    static string Name(ImageLayout layout) => layout.ToString().Replace("OptimalKhr", "Optimal");

    static (ImageLayout, PipelineStageFlags2, AccessFlags2) Target(ImageUse use) => use switch
    {
        ImageUse.ColorAttachment => (ImageLayout.ColorAttachmentOptimal, PipelineStageFlags2.ColorAttachmentOutputBit, AccessFlags2.ColorAttachmentWriteBit),
        ImageUse.DepthAttachment => (ImageLayout.DepthAttachmentOptimal, PipelineStageFlags2.EarlyFragmentTestsBit | PipelineStageFlags2.LateFragmentTestsBit,
                                     AccessFlags2.DepthStencilAttachmentReadBit | AccessFlags2.DepthStencilAttachmentWriteBit),
        ImageUse.Sampled => (ImageLayout.ShaderReadOnlyOptimal, PipelineStageFlags2.FragmentShaderBit, AccessFlags2.ShaderSampledReadBit),
        ImageUse.TransferSrc => (ImageLayout.TransferSrcOptimal, PipelineStageFlags2.AllTransferBit, AccessFlags2.TransferReadBit),
        _ => (ImageLayout.TransferDstOptimal, PipelineStageFlags2.AllTransferBit, AccessFlags2.TransferWriteBit)
    };
}` },
      { type: 'p', text: 'Two choices keep the graph small. The barrier’s source access contains only the earlier **writes**, because only writes have to be made available; reads leave nothing to flush. And a pass that begins dynamic rendering still calls `CmdBeginRendering` itself: the graph only promises that the images are in the right layouts when the pass starts. A helper for that goes with it:' },
      { type: 'code', title: 'Engine/Attachments.cs', code: cs`
using Silk.NET.Vulkan;

static unsafe class Attachments
{
    /// <summary>Begins dynamic rendering into a colour image and a depth image, both cleared, and sets a full viewport.</summary>
    public static void BeginRendering(Vk vk, CommandBuffer cmd, ImageView color, ImageView depth, Extent2D extent, ClearColorValue background)
    {
        var colorInfo = new RenderingAttachmentInfo
        {
            SType = StructureType.RenderingAttachmentInfo, ImageView = color, ImageLayout = ImageLayout.ColorAttachmentOptimal,
            LoadOp = AttachmentLoadOp.Clear, StoreOp = AttachmentStoreOp.Store, ClearValue = new ClearValue(background)
        };
        var depthInfo = new RenderingAttachmentInfo
        {
            SType = StructureType.RenderingAttachmentInfo, ImageView = depth, ImageLayout = ImageLayout.DepthAttachmentOptimal,
            LoadOp = AttachmentLoadOp.Clear, StoreOp = AttachmentStoreOp.DontCare, ClearValue = new ClearValue(depthStencil: new ClearDepthStencilValue(1f, 0))
        };
        var rendering = new RenderingInfo
        {
            SType = StructureType.RenderingInfo, RenderArea = new Rect2D(new Offset2D(0, 0), extent), LayerCount = 1,
            ColorAttachmentCount = 1, PColorAttachments = &colorInfo, PDepthAttachment = &depthInfo
        };
        vk.CmdBeginRendering(cmd, &rendering);
        var viewport = new Viewport(0, 0, extent.Width, extent.Height, 0, 1);
        vk.CmdSetViewport(cmd, 0, 1, &viewport);
        var scissor = new Rect2D(new Offset2D(0, 0), extent);
        vk.CmdSetScissor(cmd, 0, 1, &scissor);
    }
}` },
      { type: 'h2', text: 'A frame with three passes' },
      { type: 'p', text: 'The sample draws the scene into an off-screen colour image, as module 6’s post-processing will need, then copies it into the swapchain image. A third pass clears a debug image that nothing reads, as a forgotten debug view would. The swapchain image is imported with the state `FrameLoop.Begin` gave it, and handed back to the frame afterwards so that `End` can take over:' },
      { type: 'code', title: 'Graph.cs', code: cs`
using System.Numerics;
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
using var loop = new FrameLoop(gpu, window);
using var library = new PipelineLibrary(gpu, loop.Swapchain.Format);
var renderer = new SceneRenderer(gpu, library);
var (vertices, indices) = Shapes.Box(new Vector3(-0.5f), new Vector3(0.5f));
using var box = new Mesh<MeshVertex>(gpu, vertices, indices);
var scene = new Scene();
scene.Add("Slab", box, Scene.Place(new(-6f, -4f, -0.3f), new(6f, 4f, 0f)), Material.Opaque("Concrete", new(0.55f, 0.55f, 0.55f, 1f)));
scene.Add("Core", box, Scene.Place(new(-1.5f, -1.5f, 0f), new(1.5f, 1.5f, 4f)), Material.Opaque("Brick", new(0.7f, 0.3f, 0.2f, 1f)));
var camera = new OrbitCamera { Yaw = 30f, Pitch = 35f };
camera.Frame(new(-6f, -4f, -0.3f), new(6f, 4f, 4f), 800f / 600f);
var viewProjection = camera.View * camera.Projection(800f / 600f);

var extent = loop.Swapchain.Extent;
using var sceneColor = new GpuImage(gpu, extent, loop.Swapchain.Format, ImageUsageFlags.ColorAttachmentBit | ImageUsageFlags.TransferSrcBit, ImageAspectFlags.ColorBit);
using var debugImage = new GpuImage(gpu, extent, Format.R8G8B8A8Unorm, ImageUsageFlags.TransferDstBit, ImageAspectFlags.ColorBit);
using var capture = new ReadbackBuffer(gpu, extent);

loop.Begin(out var frame);
var graph = new RenderGraph();
var color = graph.Import("sceneColor", sceneColor.Handle, ImageAspectFlags.ColorBit);
var depth = graph.Import("depth", loop.Depth.Handle, ImageAspectFlags.DepthBit,             // the last frame's depth writes come first
    stage: PipelineStageFlags2.LateFragmentTestsBit, access: AccessFlags2.DepthStencilAttachmentWriteBit);
var debug = graph.Import("debug", debugImage.Handle, ImageAspectFlags.ColorBit);
var backbuffer = graph.Import("backbuffer", frame.Image, ImageAspectFlags.ColorBit, frame.Layout, frame.Stage, frame.Access);

graph.AddPass("Scene", reads: [], writes: [(color, ImageUse.ColorAttachment), (depth, ImageUse.DepthAttachment)], cmd =>
{
    Attachments.BeginRendering(gpu.Vk, cmd, sceneColor.View, loop.Depth.View, extent, loop.Background);
    renderer.Draw(cmd, SceneRenderer.Sort(scene.Objects, camera.Eye), viewProjection);
    gpu.Vk.CmdEndRendering(cmd);
});
graph.AddPass("Debug view", reads: [], writes: [(debug, ImageUse.TransferDst)], cmd =>
{
    var magenta = new ClearColorValue(1f, 0f, 1f, 1f);
    var range = new ImageSubresourceRange(ImageAspectFlags.ColorBit, 0, 1, 0, 1);
    unsafe { gpu.Vk.CmdClearColorImage(cmd, debugImage.Handle, ImageLayout.TransferDstOptimal, &magenta, 1, &range); }
});
graph.AddPass("Copy to screen", reads: [(color, ImageUse.TransferSrc)], writes: [(backbuffer, ImageUse.TransferDst)], cmd =>
{
    var region = new ImageCopy
    {
        SrcSubresource = new ImageSubresourceLayers(ImageAspectFlags.ColorBit, 0, 0, 1),
        DstSubresource = new ImageSubresourceLayers(ImageAspectFlags.ColorBit, 0, 0, 1),
        Extent = new Extent3D(extent.Width, extent.Height, 1)
    };
    unsafe { gpu.Vk.CmdCopyImage(cmd, sceneColor.Handle, ImageLayout.TransferSrcOptimal, frame.Image, ImageLayout.TransferDstOptimal, 1, &region); }
});
graph.Output(backbuffer);

foreach (var line in graph.Compile()) Console.WriteLine(line);
graph.Execute(gpu.Vk, frame.Cmd);
(frame.Layout, frame.Stage, frame.Access) = (backbuffer.Layout, backbuffer.Stage, backbuffer.Access);
Console.WriteLine($"Handed back to the frame: {frame.Layout}");
loop.End(frame, capture);
loop.WaitIdle();

var slab = Camera.Project(new(-4f, -3f, 0f), viewProjection, extent);
var core = Camera.Project(new(0f, 0f, 4f), viewProjection, extent);
Console.WriteLine($"On screen: slab {capture.Pixel((int)slab.X, (int)slab.Y)}, top of core {capture.Pixel((int)core.X, (int)core.Y)}, corner {capture.Pixel(2, 2)}");`, output: 'Scene: sceneColor Undefined -> ColorAttachmentOptimal, depth Undefined -> DepthAttachmentOptimal\nDebug view: culled (nothing uses what it writes)\nCopy to screen: sceneColor ColorAttachmentOptimal -> TransferSrcOptimal, backbuffer Undefined -> TransferDstOptimal\nHanded back to the frame: TransferDstOptimal\nOn screen: slab (196, 196, 196), top of core (218, 149, 123), corner (39, 39, 48)' },
      { type: 'p', text: 'The plan reads like the barriers you would have written by hand. The scene pass moves both attachments out of `Undefined`; the debug view was culled because nothing reads `debug`, so its clear never ran and costs nothing; the copy pass moves `sceneColor` from attachment to copy source and the swapchain image to copy destination. The frame got the swapchain image back in `TransferDstOptimal`, and `End` took it on from there, to the capture copy and to presentation. The pixels are the scene’s, copied: the slab’s grey as in lesson 1, the brick core’s top, and the dark background in the corner.' },
      { type: 'note', kind: 'info', text: 'Real graphs go further in three directions. They **allocate** transient images themselves, sized from the swapchain, and let images whose lifetimes do not overlap share memory (aliasing). They **reorder** independent passes or send them to an async compute queue. And they **merge** barriers: all of a pass’s barriers already go out in one `CmdPipelineBarrier2` here, but a graph can also move each barrier as early as possible to give the GPU more room.' },
      { type: 'quiz', question: 'Pass A writes image X, pass B samples X in a fragment shader, pass C samples X in a fragment shader too. Which need barriers for X?', options: ['B and C', 'Only B: C reads in the same layout at a stage the barrier before B already covers', 'Only C', 'Neither'], answer: 1, explain: 'B needs the write-to-read barrier with the layout change. C is another read at the same stage in the same layout: the barrier before B already made A’s writes visible to fragment-shader reads.' },
      { type: 'quiz', question: 'Why does the graph cull from the outputs backwards?', options: ['It is faster than forwards', 'Whether a pass is needed depends on later passes: a pass matters only if something that leads to an output reads what it writes', 'Vulkan executes passes in reverse', 'To find the first pass'], answer: 1, explain: 'Start from what the frame must produce, keep the passes that write it, then the passes that write what those read, and so on. Anything not reached contributes nothing.' },
      { type: 'exercise', task: 'Preview module 6 on the CPU: build a graph of six passes without a GPU (use `default(Image)` for the handles). Shadow map writes `shadowMap` (depth); G-buffer writes `albedo`, `normal` (colour) and `depth`; SSAO samples `normal` and `depth` and writes `ao`; Lighting samples `albedo`, `normal`, `shadowMap` and `ao` and writes `hdr`; Debug normals samples `normal` and writes `debug`; Tone map samples `hdr` and writes `backbuffer`. Print the plan, then remove the shadow-map pass and print the error.', hint: 'Only `Compile` is called, which needs no GPU. Put the graph construction in a function with a `bool withShadows` parameter, and wrap the second `Compile` in try/catch for `InvalidOperationException`. For a sampled depth image the use is `ImageUse.Sampled`.', solution: cs`
using Silk.NET.Vulkan;

static RenderGraph Build(bool withShadows)
{
    var g = new RenderGraph();
    GraphImage Colour(string name) => g.Import(name, default, ImageAspectFlags.ColorBit);
    GraphImage Depth(string name) => g.Import(name, default, ImageAspectFlags.DepthBit);
    var (shadowMap, albedo, normal, depth) = (Depth("shadowMap"), Colour("albedo"), Colour("normal"), Depth("depth"));
    var (ao, hdr, debug, backbuffer) = (Colour("ao"), Colour("hdr"), Colour("debug"), Colour("backbuffer"));
    Action<CommandBuffer> nothing = _ => { };
    if (withShadows) g.AddPass("Shadow map", [], [(shadowMap, ImageUse.DepthAttachment)], nothing);
    g.AddPass("G-buffer", [], [(albedo, ImageUse.ColorAttachment), (normal, ImageUse.ColorAttachment), (depth, ImageUse.DepthAttachment)], nothing);
    g.AddPass("SSAO", [(normal, ImageUse.Sampled), (depth, ImageUse.Sampled)], [(ao, ImageUse.ColorAttachment)], nothing);
    g.AddPass("Lighting", [(albedo, ImageUse.Sampled), (normal, ImageUse.Sampled), (shadowMap, ImageUse.Sampled), (ao, ImageUse.Sampled)],
              [(hdr, ImageUse.ColorAttachment)], nothing);
    g.AddPass("Debug normals", [(normal, ImageUse.Sampled)], [(debug, ImageUse.ColorAttachment)], nothing);
    g.AddPass("Tone map", [(hdr, ImageUse.Sampled)], [(backbuffer, ImageUse.ColorAttachment)], nothing);
    g.Output(backbuffer);
    return g;
}

foreach (var line in Build(withShadows: true).Compile()) Console.WriteLine(line);
try { Build(withShadows: false).Compile(); }
catch (InvalidOperationException e) { Console.WriteLine($"Without the shadow pass: {e.Message}"); }`, output: 'Shadow map: shadowMap Undefined -> DepthAttachmentOptimal\nG-buffer: albedo Undefined -> ColorAttachmentOptimal, normal Undefined -> ColorAttachmentOptimal, depth Undefined -> DepthAttachmentOptimal\nSSAO: normal ColorAttachmentOptimal -> ShaderReadOnlyOptimal, depth DepthAttachmentOptimal -> ShaderReadOnlyOptimal, ao Undefined -> ColorAttachmentOptimal\nLighting: albedo ColorAttachmentOptimal -> ShaderReadOnlyOptimal, shadowMap DepthAttachmentOptimal -> ShaderReadOnlyOptimal, ao ColorAttachmentOptimal -> ShaderReadOnlyOptimal, hdr Undefined -> ColorAttachmentOptimal\nDebug normals: culled (nothing uses what it writes)\nTone map: hdr ColorAttachmentOptimal -> ShaderReadOnlyOptimal, backbuffer Undefined -> ColorAttachmentOptimal\nWithout the shadow pass: Pass \'Lighting\' reads \'shadowMap\', but no earlier pass writes it' }
    ],
    keyPoints: [
      'A render graph lets passes declare which images they read and write, and how; the graph derives the rest.',
      'Culling walks back from the outputs: passes that write nothing needed are skipped.',
      'Validation catches a pass reading an image that no earlier pass wrote.',
      'Each use implies a layout, stages and accesses; a barrier is needed on a layout change, after a write, or before a write.',
      'Two reads in the same layout at an already covered stage need no barrier.',
      'Imported images bring their current state in; the final state is handed back (the swapchain image to FrameLoop.End).'
    ]
  },

  // ------------------------------------------------------------------ 7
  {
    slug: 'multithreaded-recording',
    title: 'Recording commands on several threads',
    summary: 'Split a frame’s draws across threads: one command pool per thread per frame in flight, secondary command buffers that inherit the dynamic rendering formats, and one CmdExecuteCommands. Check that four threads draw exactly what one thread draws.',
    minutes: 22,
    blocks: [
      { type: 'p', text: 'A BIM model has tens or hundreds of thousands of elements. Even after culling (module 7), a view can need tens of thousands of draws, and recording each one costs CPU time: looking up the pipeline and mesh, pushing constants, calling into the driver. On one thread that can take longer than the frame. Vulkan was designed for this: unlike OpenGL, any thread can record commands, as long as you follow its rules on **external synchronisation**.' },
      { type: 'h2', text: 'The rules' },
      { type: 'table', head: ['Object', 'Thread rule', 'What the engine does'], rows: [
        ['`VkCommandPool`', 'Externally synchronised: one thread at a time, including for every buffer allocated from it', 'One pool per worker thread **per frame in flight**'],
        ['`VkCommandBuffer`', 'Recorded by one thread at a time', 'Each worker records its own'],
        ['`VkQueue`', 'Externally synchronised for submit and present', 'Only the main thread submits'],
        ['`VkDevice`, pipelines, meshes', 'Safe to use from several threads', 'Shared freely; the pipeline library locks its dictionary'],
        ['Descriptor set updates', 'Externally synchronised per set', 'Done on the main thread before recording']
      ] },
      { type: 'p', text: 'The pool rule is why the pools are per frame in flight too. A pool can be reset as a whole, which is the cheapest way to recycle its buffers, but only when none of them is still pending on the GPU. With a pool for each (slot, worker) pair, `FrameLoop.Begin` has already waited for the slot’s previous frame, so the worker can reset its pool for this slot at once.' },
      { type: 'h2', text: 'Secondary command buffers' },
      { type: 'p', text: 'Workers record **secondary** command buffers, which cannot be submitted alone; the primary buffer runs them with `CmdExecuteCommands`. Because they run inside the primary’s dynamic rendering, they must say what they will draw into: the colour and depth formats and the sample count, in `CommandBufferInheritanceRenderingInfo`, and the `RenderPassContinue` flag. The primary in turn begins rendering with the `ContentsSecondaryCommandBuffers` flag, which is what lesson 1’s `BeginRendering(frame, secondary: true)` sets, and records nothing else inside it.' },
      { type: 'p', text: 'One more rule catches everyone once: **state is not inherited**. A secondary buffer starts with no pipeline bound and no viewport, so each worker binds its own pipeline and sets its own viewport and scissor.' },
      { type: 'widget', name: 'parallel-recording' },
      { type: 'code', title: 'Engine/ParallelRecorder.cs', code: cs`
using Silk.NET.Vulkan;

/// <summary>Records secondary command buffers on several threads. Each worker has its own command pool for every frame in flight.</summary>
sealed unsafe class ParallelRecorder : IDisposable
{
    readonly GpuContext gpu;
    readonly CommandPool[,] pools = new CommandPool[FrameLoop.FramesInFlight, 0];
    readonly CommandBuffer[,] buffers = new CommandBuffer[FrameLoop.FramesInFlight, 0];
    public readonly int Workers;
    /// <summary>The managed thread that recorded each worker's range last time.</summary>
    public int[] ThreadIds { get; private set; } = [];

    public ParallelRecorder(GpuContext gpu, int workers)
    {
        this.gpu = gpu;
        Workers = workers;
        pools = new CommandPool[FrameLoop.FramesInFlight, workers];
        buffers = new CommandBuffer[FrameLoop.FramesInFlight, workers];
        for (int slot = 0; slot < FrameLoop.FramesInFlight; slot++)
            for (int w = 0; w < workers; w++)
            {
                var poolInfo = new CommandPoolCreateInfo { SType = StructureType.CommandPoolCreateInfo, Flags = CommandPoolCreateFlags.TransientBit, QueueFamilyIndex = gpu.GraphicsFamily };
                CommandPool pool;
                gpu.Vk.CreateCommandPool(gpu.Device, &poolInfo, null, &pool).Check("CreateCommandPool");
                pools[slot, w] = pool;
                var allocInfo = new CommandBufferAllocateInfo { SType = StructureType.CommandBufferAllocateInfo, CommandPool = pool, Level = CommandBufferLevel.Secondary, CommandBufferCount = 1 };
                CommandBuffer cmd;
                gpu.Vk.AllocateCommandBuffers(gpu.Device, &allocInfo, &cmd).Check("AllocateCommandBuffers");
                buffers[slot, w] = cmd;
            }
    }

    /// <summary>Splits count items into one contiguous range per worker; sizes differ by at most one.</summary>
    public static (int Start, int End)[] Split(int count, int workers) =>
        Enumerable.Range(0, workers).Select(w => (count * w / workers, count * (w + 1) / workers)).ToArray();

    /// <summary>Inside rendering begun with BeginRendering(frame, secondary: true): calls record(cmd, worker, start, end)
    /// for each range on its own thread, waits for all of them, then executes their buffers in worker order.</summary>
    public void Record(FrameLoop loop, Frame frame, int count, Action<CommandBuffer, int, int, int> record)
    {
        var vk = gpu.Vk;
        var ranges = Split(count, Workers);
        var ids = new int[Workers];
        var threads = new Thread[Workers];
        for (int w = 0; w < Workers; w++)
        {
            int worker = w;
            threads[w] = new Thread(() =>
            {
                ids[worker] = Environment.CurrentManagedThreadId;
                vk.ResetCommandPool(gpu.Device, pools[frame.Slot, worker], 0).Check("ResetCommandPool");   // Begin waited for this slot
                var cmd = buffers[frame.Slot, worker];
                var colorFormat = loop.Swapchain.Format;
                var rendering = new CommandBufferInheritanceRenderingInfo
                {
                    SType = StructureType.CommandBufferInheritanceRenderingInfo,
                    ColorAttachmentCount = 1, PColorAttachmentFormats = &colorFormat, DepthAttachmentFormat = FrameLoop.DepthFormat,
                    RasterizationSamples = SampleCountFlags.Count1Bit
                };
                var inheritance = new CommandBufferInheritanceInfo { SType = StructureType.CommandBufferInheritanceInfo, PNext = &rendering };
                var begin = new CommandBufferBeginInfo
                {
                    SType = StructureType.CommandBufferBeginInfo, PInheritanceInfo = &inheritance,
                    Flags = CommandBufferUsageFlags.OneTimeSubmitBit | CommandBufferUsageFlags.RenderPassContinueBit
                };
                vk.BeginCommandBuffer(cmd, &begin).Check("BeginCommandBuffer");
                loop.SetViewport(cmd, frame.Extent);                                // not inherited from the primary
                record(cmd, worker, ranges[worker].Start, ranges[worker].End);
                vk.EndCommandBuffer(cmd).Check("EndCommandBuffer");
            });
            threads[w].Start();
        }
        foreach (var thread in threads) thread.Join();
        ThreadIds = ids;

        var secondaries = stackalloc CommandBuffer[Workers];
        for (int w = 0; w < Workers; w++) secondaries[w] = buffers[frame.Slot, w];
        vk.CmdExecuteCommands(frame.Cmd, (uint)Workers, secondaries);
    }

    public void Dispose()
    {
        foreach (var pool in pools) gpu.Vk.DestroyCommandPool(gpu.Device, pool, null);     // frees its buffers
    }
}` },
      { type: 'p', text: 'Starting threads every frame keeps the example readable but costs tens of microseconds per thread. Real engines keep their workers alive in a **job system** and hand them ranges through a queue; the Vulkan side, one pool per worker per frame in flight and one secondary buffer per range, stays exactly the same.' },
      { type: 'h2', text: 'Four threads, one picture' },
      { type: 'p', text: 'The sample places 400 columns on a 20 × 20 grid, in four colour bands of 100, and draws them first with one worker, then with four. With four, each worker records one band. Multithreading must not change the picture, so the sample compares every pixel of the two frames:' },
      { type: 'code', title: 'Parallel.cs', code: cs`
using System.Numerics;
using Silk.NET.Maths;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
using var loop = new FrameLoop(gpu, window);
using var library = new PipelineLibrary(gpu, loop.Swapchain.Format);
var renderer = new SceneRenderer(gpu, library);
var (vertices, indices) = Shapes.Box(new Vector3(-0.5f), new Vector3(0.5f));
using var box = new Mesh<MeshVertex>(gpu, vertices, indices);
using var capture = new ReadbackBuffer(gpu, loop.Swapchain.Extent);

Vector4[] bands = [new(0.8f, 0.25f, 0.2f, 1f), new(0.9f, 0.7f, 0.2f, 1f), new(0.3f, 0.7f, 0.35f, 1f), new(0.25f, 0.45f, 0.85f, 1f)];
var scene = new Scene();
for (int i = 0; i < 400; i++)
{
    float x = i % 20 * 2f - 19f, y = i / 20 * 2f - 19f;
    scene.Add($"Column {i}", box, Scene.Place(new(x - 0.3f, y - 0.3f, 0f), new(x + 0.3f, y + 0.3f, 3f)),
              Material.Opaque($"Band {i / 100}", bands[i / 100]));
}
var objects = scene.Objects.ToArray();
library.Get(objects[0].Material.Pipeline);                                       // create the pipeline before the threads start
var camera = new OrbitCamera { Pitch = 60f };
camera.Frame(new(-20f, -20f, 0f), new(20f, 20f, 3f), 800f / 600f);
var viewProjection = camera.View * camera.Projection(800f / 600f);

(byte R, byte G, byte B)[] Render(int workers)
{
    using var recorder = new ParallelRecorder(gpu, workers);
    var stats = new DrawStats[workers];
    loop.Begin(out var frame);
    loop.BeginRendering(frame, secondary: true);
    recorder.Record(loop, frame, objects.Length, (cmd, worker, start, end) =>
        stats[worker] = renderer.Draw(cmd, new ArraySegment<SceneObject>(objects, start, end - start), viewProjection));
    loop.EndRendering(frame);
    loop.End(frame, capture);
    loop.WaitIdle();
    Console.WriteLine($"{workers} worker(s) on {recorder.ThreadIds.Distinct().Count()} thread(s): draws {string.Join(" + ", stats.Select(s => s.Draws))}, " +
                      $"pipeline binds {stats.Sum(s => s.PipelineBinds)}, mesh binds {stats.Sum(s => s.MeshBinds)}");
    var pixels = new (byte, byte, byte)[800 * 600];
    for (int y = 0; y < 600; y++)
        for (int x = 0; x < 800; x++) pixels[y * 800 + x] = capture.Pixel(x, y);
    return pixels;
}

var one = Render(1);
var four = Render(4);
Console.WriteLine($"Identical frames: {one.AsSpan().SequenceEqual(four)}");
foreach (int band in new[] { 0, 1, 2, 3 })
{
    var p = Camera.Project(new(-1f, band * 10f - 15f, 3f), viewProjection, loop.Swapchain.Extent);    // the top of a column in each band
    Console.WriteLine($"Band {band}: {four[(int)p.Y * 800 + (int)p.X]}");
}`, output: '1 worker(s) on 1 thread(s): draws 400, pipeline binds 1, mesh binds 1\n4 worker(s) on 4 thread(s): draws 100 + 100 + 100 + 100, pipeline binds 4, mesh binds 4\nIdentical frames: True\nBand 0: (231, 137, 123)\nBand 1: (244, 218, 123)\nBand 2: (149, 218, 160)\nBand 3: (137, 179, 237)' },
      { type: 'p', text: 'With four workers, four different threads each recorded 100 draws, and the two frames are identical down to the last pixel. Each secondary buffer bound the pipeline and the mesh again, because state is not inherited: 4 binds of each instead of 1, a small price for recording in parallel. The tops of the columns show the four bands’ colours.' },
      { type: 'note', kind: 'warn', text: 'Order matters. `CmdExecuteCommands` runs the secondaries in the order given, so draws that depend on order (transparent objects, sorted back to front) must stay in order across workers: give each worker a contiguous range of the sorted list and execute them in worker order, as `ParallelRecorder` does. Opaque draws with depth testing produce the same picture in any order.' },
      { type: 'quiz', question: 'Why does each worker need its own command pool for each frame in flight, not just one pool per worker?', options: ['Pools hold at most one buffer', 'A pool is reset as a whole; while frame n is still on the GPU, the pool its buffers came from must not be reset to record frame n + 1', 'Threads cannot share memory', 'Secondary buffers need a special pool'], answer: 1, explain: 'With one pool per worker, recording frame n + 1 would reset buffers that frame n is still executing. With a pool per slot, the worker resets only the slot whose previous frame FrameLoop.Begin has just waited for.' },
      { type: 'quiz', question: 'A worker’s secondary command buffer draws nothing visible, though the same calls work in the primary. What is the most likely cause?', options: ['Secondary buffers cannot draw', 'It did not set its own viewport and scissor (and bind its own pipeline): state is not inherited from the primary', 'Too many threads', 'The pool was reset'], answer: 1, explain: 'A secondary buffer starts with no pipeline and no dynamic state. Each one must bind its pipeline and set the viewport and scissor itself.' },
      { type: 'exercise', task: 'Estimate when threads pay off. Suppose recording one draw takes 1.5 µs, starting and joining a worker costs 40 µs, and executing each secondary buffer costs 5 µs on the main thread. For 100, 5,000 and 100,000 draws, find the number of workers from 1 to 16 that gives the shortest recording time, and that time.', hint: 'With w workers the time is about w × 40 + (draws / w) × 1.5 + w × 5 µs: the start-up cost and the execute cost grow with w, the recording shrinks. Try every w and keep the smallest.', solution: cs`
const double perDraw = 1.5, perWorker = 40, perExecute = 5;

foreach (int draws in new[] { 100, 5_000, 100_000 })
{
    double Time(int workers) => workers * perWorker + Math.Ceiling(draws / (double)workers) * perDraw + workers * perExecute;
    int best = Enumerable.Range(1, 16).MinBy(Time);
    Console.WriteLine($"{draws + " draws:",-14} 1 worker {Time(1),7:F0} µs, best {best,2} workers {Time(best),6:F0} µs");
}`, output: '100 draws:     1 worker     195 µs, best  2 workers    165 µs\n5000 draws:    1 worker    7545 µs, best 13 workers   1162 µs\n100000 draws:  1 worker  150045 µs, best 16 workers  10095 µs' }
    ],
    keyPoints: [
      'Any thread can record Vulkan commands; pools, command buffers and queues need external synchronisation.',
      'Use one command pool per worker thread per frame in flight, and reset it whole once its frame has finished.',
      'Workers record secondary buffers that inherit the rendering formats; the primary runs them with CmdExecuteCommands.',
      'The primary begins rendering with ContentsSecondaryCommandBuffers and records nothing else inside it.',
      'State is not inherited: each secondary binds its pipeline and sets its viewport and scissor.',
      'Keep order-dependent draws in contiguous ranges, executed in order; threads pay off only with many draws.'
    ]
  },
];
