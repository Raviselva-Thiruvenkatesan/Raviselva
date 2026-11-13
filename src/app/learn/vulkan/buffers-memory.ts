import { Lesson } from '../learn.types';
import { cs } from '../csharp/cs';

/**
 * Vulkan module 3. Every C# sample was run with Silk.NET 2.23 on an Intel Iris Xe (Vulkan 1.4 driver) on Windows 11;
 * the outputs are from that machine. Code blocks titled Engine/*.cs extend the engine from module 2: each sample uses the
 * latest version of every Engine file from modules 2 and 3 shown before it.
 */
export const BUFFERS_MEMORY: Lesson[] = [
  // ------------------------------------------------------------------ 1
  {
    slug: 'vertex-buffers',
    title: 'Vertex buffers and vertex input',
    summary: 'Move the triangle’s corners out of the shader and into a buffer in GPU-visible memory. Describe the vertex layout to the pipeline, bind the buffer and draw from it.',
    minutes: 20,
    blocks: [
      { type: 'p', text: 'The first triangle kept its three corners inside the vertex shader. A real model cannot work like that: a BIM model of a building has millions of corners, loaded from a file at run time. They have to live in GPU-accessible memory, in a **vertex buffer**, and the pipeline has to be told how to read them.' },
      { type: 'h2', text: 'Describing a vertex' },
      { type: 'p', text: 'A **vertex** is whatever data you store per corner. For now that is a position and a colour, as a C# struct. Its memory layout must match exactly what the GPU will read, so it is marked `[StructLayout(LayoutKind.Sequential)]`: fields in order, no reordering. A `Vector3` is three 4-byte floats, so the vertex is 24 bytes.' },
      { type: 'p', text: 'The pipeline learns the layout from two kinds of description:' },
      { type: 'table', head: ['Description', 'Says', 'For this vertex'], rows: [
        ['`VertexInputBindingDescription`', 'Which buffer slot (binding), how many bytes from one vertex to the next (**stride**), and whether to step per vertex or per instance', 'Binding 0, stride 24, per vertex'],
        ['`VertexInputAttributeDescription`', 'One shader input: its `location`, which binding it comes from, its format and its **offset** inside the vertex', 'Location 0: 3 floats at offset 0; location 1: 3 floats at offset 12']
      ] },
      { type: 'code', title: 'Engine/Vertex.cs', code: cs`
using System.Numerics;
using System.Runtime.InteropServices;
using Silk.NET.Vulkan;

/// <summary>One corner of a mesh: a position and a colour, laid out exactly as the vertex shader reads it.</summary>
[StructLayout(LayoutKind.Sequential)]
readonly struct Vertex(Vector3 position, Vector3 color)
{
    public readonly Vector3 Position = position;    // location 0
    public readonly Vector3 Color = color;          // location 1

    public Vertex(float x, float y, float z, float r, float g, float b) : this(new Vector3(x, y, z), new Vector3(r, g, b)) { }

    public static readonly VertexInputBindingDescription Binding =
        new(binding: 0, stride: (uint)Marshal.SizeOf<Vertex>(), inputRate: VertexInputRate.Vertex);

    public static readonly VertexInputAttributeDescription[] Attributes =
    [
        new(location: 0, binding: 0, format: Format.R32G32B32Sfloat, offset: (uint)Marshal.OffsetOf<Vertex>(nameof(Position))),
        new(location: 1, binding: 0, format: Format.R32G32B32Sfloat, offset: (uint)Marshal.OffsetOf<Vertex>(nameof(Color)))
    ];
}` },
      { type: 'p', text: 'The attribute formats reuse the image format names: `R32G32B32Sfloat` means three 32-bit floats, a `vec3` in GLSL. A colour could just as well be stored as `R8G8B8A8Unorm`, four bytes the hardware turns into floats from 0 to 1 as it reads them, which saves 8 bytes per vertex. Build a few layouts and compare:' },
      { type: 'widget', name: 'vertex-layout' },
      { type: 'h2', text: 'A buffer and its memory' },
      { type: 'p', text: 'In Vulkan a **buffer** (`Buffer`) is only a description: a size and a list of **usages** (vertex buffer, index buffer, copy source and so on). It owns no memory. You allocate memory separately with `AllocateMemory` and **bind** it to the buffer. That takes three steps every time:' },
      { type: 'table', head: ['Step', 'Call', 'Why separate?'], rows: [
        ['1', '`CreateBuffer`', 'The driver works out how much memory and what alignment the buffer needs'],
        ['2', '`AllocateMemory`', 'You choose the memory **type**: fast for the GPU, or writable by the CPU (next lesson)'],
        ['3', '`BindBufferMemory`', 'Many buffers can share one allocation at different offsets (lesson 7)']
      ] },
      { type: 'p', text: 'If the memory is **host-visible**, `MapMemory` gives the CPU a pointer into it, and copying vertices in is an ordinary memory copy. The pointer can stay mapped for the buffer’s whole life. Here is the engine’s buffer class; the next lesson explains `FindMemoryType`:' },
      { type: 'code', title: 'Engine/GpuBuffer.cs', code: cs`
using System.Runtime.InteropServices;
using Silk.NET.Vulkan;
using VkBuffer = Silk.NET.Vulkan.Buffer;

/// <summary>A buffer with its own memory. Host-visible buffers stay mapped, so the CPU can write them at any time.</summary>
sealed unsafe class GpuBuffer : IDisposable
{
    readonly GpuContext gpu;
    public readonly VkBuffer Handle;
    public readonly DeviceMemory Memory;
    public readonly ulong Size;
    public readonly uint MemoryType;
    public readonly byte* Mapped;                   // null unless the memory is host-visible

    public GpuBuffer(GpuContext gpu, ulong size, BufferUsageFlags usage, MemoryPropertyFlags properties)
    {
        this.gpu = gpu;
        Size = size;
        var vk = gpu.Vk;
        var info = new BufferCreateInfo { SType = StructureType.BufferCreateInfo, Size = size, Usage = usage, SharingMode = SharingMode.Exclusive };
        VkBuffer buffer;
        vk.CreateBuffer(gpu.Device, &info, null, &buffer).Check("CreateBuffer");
        Handle = buffer;

        MemoryRequirements needs;
        vk.GetBufferMemoryRequirements(gpu.Device, Handle, &needs);
        MemoryType = FindMemoryType(gpu, needs.MemoryTypeBits, properties);
        var alloc = new MemoryAllocateInfo { SType = StructureType.MemoryAllocateInfo, AllocationSize = needs.Size, MemoryTypeIndex = MemoryType };
        DeviceMemory memory;
        vk.AllocateMemory(gpu.Device, &alloc, null, &memory).Check("AllocateMemory");
        Memory = memory;
        vk.BindBufferMemory(gpu.Device, Handle, Memory, 0).Check("BindBufferMemory");

        if ((properties & MemoryPropertyFlags.HostVisibleBit) != 0)
        {
            void* p;
            vk.MapMemory(gpu.Device, Memory, 0, Vk.WholeSize, 0, &p).Check("MapMemory");
            Mapped = (byte*)p;
        }
    }

    /// <summary>The first memory type the resource may use (allowedTypes is a bit mask) that has all the wanted properties.</summary>
    public static uint FindMemoryType(GpuContext gpu, uint allowedTypes, MemoryPropertyFlags wanted)
    {
        var props = gpu.Vk.GetPhysicalDeviceMemoryProperties(gpu.PhysicalDevice);
        for (int i = 0; i < props.MemoryTypeCount; i++)
            if ((allowedTypes & (1u << i)) != 0 && (props.MemoryTypes[i].PropertyFlags & wanted) == wanted)
                return (uint)i;
        throw new NotSupportedException($"No memory type has {wanted}");
    }

    /// <summary>Copies data into a host-visible buffer at a byte offset.</summary>
    public void Write<T>(ReadOnlySpan<T> data, ulong offset = 0) where T : unmanaged
    {
        if (Mapped == null) throw new InvalidOperationException("This buffer is not host-visible: upload through a staging buffer");
        var bytes = MemoryMarshal.AsBytes(data);
        if (offset + (ulong)bytes.Length > Size) throw new ArgumentOutOfRangeException(nameof(data), "Data does not fit in the buffer");
        bytes.CopyTo(new Span<byte>(Mapped + offset, bytes.Length));
    }

    public void Dispose()
    {
        gpu.Vk.DestroyBuffer(gpu.Device, Handle, null);
        gpu.Vk.FreeMemory(gpu.Device, Memory, null);   // freeing also unmaps
    }
}` },
      { type: 'h2', text: 'Shaders and a pipeline that read vertices' },
      { type: 'p', text: 'The vertex shader now declares **inputs** with `in`, at the locations the attribute descriptions name. The fragment shader is unchanged.' },
      { type: 'code', title: 'Engine/MeshShaders.cs', code: cs`
static class MeshShaders
{
    public const string Vertex = """
        #version 450

        layout(location = 0) in vec3 inPosition;    // Vertex.Position
        layout(location = 1) in vec3 inColor;       // Vertex.Color

        layout(location = 0) out vec3 vColor;

        void main()
        {
            gl_Position = vec4(inPosition, 1.0);
            vColor = inColor;
        }
        """;

    public const string Fragment = TriangleShaders.Fragment;    // unchanged: output the interpolated colour
}` },
      { type: 'p', text: 'The engine’s new pipeline class is `TrianglePipeline` with three changes: the GLSL comes in as parameters, the vertex input state uses `Vertex.Binding` and `Vertex.Attributes`, and the pipeline layout can list descriptor set layouts and push constant ranges. Leave those two empty for now; lessons 5 and 6 fill them.' },
      { type: 'code', title: 'Engine/MeshPipeline.cs', code: cs`
using Silk.NET.Core.Native;
using Silk.NET.Shaderc;
using Silk.NET.Vulkan;

sealed unsafe class MeshPipeline : IDisposable
{
    readonly GpuContext gpu;
    public readonly PipelineLayout Layout;
    public readonly Pipeline Handle;

    public MeshPipeline(GpuContext gpu, Format colorFormat, string vertexGlsl, string fragmentGlsl,
                        DescriptorSetLayout[]? setLayouts = null, PushConstantRange[]? pushConstants = null,
                        CullModeFlags cull = CullModeFlags.None)
    {
        this.gpu = gpu;
        var vk = gpu.Vk;
        var vert = Shaders.CreateModule(gpu, Shaders.Compile(vertexGlsl, ShaderKind.VertexShader, "mesh.vert"));
        var frag = Shaders.CreateModule(gpu, Shaders.Compile(fragmentGlsl, ShaderKind.FragmentShader, "mesh.frag"));
        byte* main = (byte*)SilkMarshal.StringToPtr("main");
        var stages = stackalloc PipelineShaderStageCreateInfo[2];
        stages[0] = new() { SType = StructureType.PipelineShaderStageCreateInfo, Stage = ShaderStageFlags.VertexBit, Module = vert, PName = main };
        stages[1] = new() { SType = StructureType.PipelineShaderStageCreateInfo, Stage = ShaderStageFlags.FragmentBit, Module = frag, PName = main };

        // New: where the vertex shader's inputs come from
        var binding = Vertex.Binding;
        var attributes = stackalloc VertexInputAttributeDescription[Vertex.Attributes.Length];
        for (int i = 0; i < Vertex.Attributes.Length; i++) attributes[i] = Vertex.Attributes[i];
        var vertexInput = new PipelineVertexInputStateCreateInfo
        {
            SType = StructureType.PipelineVertexInputStateCreateInfo,
            VertexBindingDescriptionCount = 1, PVertexBindingDescriptions = &binding,
            VertexAttributeDescriptionCount = (uint)Vertex.Attributes.Length, PVertexAttributeDescriptions = attributes
        };
        var inputAssembly = new PipelineInputAssemblyStateCreateInfo { SType = StructureType.PipelineInputAssemblyStateCreateInfo, Topology = PrimitiveTopology.TriangleList };
        var viewport = new PipelineViewportStateCreateInfo { SType = StructureType.PipelineViewportStateCreateInfo, ViewportCount = 1, ScissorCount = 1 };
        var raster = new PipelineRasterizationStateCreateInfo
        {
            SType = StructureType.PipelineRasterizationStateCreateInfo,
            PolygonMode = PolygonMode.Fill, CullMode = cull, FrontFace = FrontFace.Clockwise, LineWidth = 1f
        };
        var multisample = new PipelineMultisampleStateCreateInfo { SType = StructureType.PipelineMultisampleStateCreateInfo, RasterizationSamples = SampleCountFlags.Count1Bit };
        var blendAttachment = new PipelineColorBlendAttachmentState
        {
            ColorWriteMask = ColorComponentFlags.RBit | ColorComponentFlags.GBit | ColorComponentFlags.BBit | ColorComponentFlags.ABit
        };
        var blend = new PipelineColorBlendStateCreateInfo { SType = StructureType.PipelineColorBlendStateCreateInfo, AttachmentCount = 1, PAttachments = &blendAttachment };
        var dynamicStates = stackalloc DynamicState[] { DynamicState.Viewport, DynamicState.Scissor };
        var dynamic = new PipelineDynamicStateCreateInfo { SType = StructureType.PipelineDynamicStateCreateInfo, DynamicStateCount = 2, PDynamicStates = dynamicStates };

        // New: the resources the shaders use (lesson 5) and the push constants (lesson 6)
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

        var rendering = new PipelineRenderingCreateInfo { SType = StructureType.PipelineRenderingCreateInfo, ColorAttachmentCount = 1, PColorAttachmentFormats = &colorFormat };
        var info = new GraphicsPipelineCreateInfo
        {
            SType = StructureType.GraphicsPipelineCreateInfo, PNext = &rendering,
            StageCount = 2, PStages = stages,
            PVertexInputState = &vertexInput, PInputAssemblyState = &inputAssembly,
            PViewportState = &viewport, PRasterizationState = &raster,
            PMultisampleState = &multisample, PColorBlendState = &blend,
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
      { type: 'p', text: 'Last, a helper for the samples. Module 2 drew one frame and read its pixels back with about forty lines of code. `TestFrame` packs those lines into one function and leaves the drawing to a callback: it begins rendering, sets the viewport and scissor, calls your code, then copies the image out and presents it.' },
      { type: 'code', title: 'Engine/TestFrame.cs', code: cs`
using Silk.NET.Vulkan;

/// <summary>Draws one frame into a swapchain image, copies it into a ReadbackBuffer and presents it. For checking pixels.</summary>
static unsafe class TestFrame
{
    public static void Draw(GpuContext gpu, Swapchain swapchain, ReadbackBuffer readback, Action<CommandBuffer> draw, ClearColorValue? background = null)
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
        vk.CmdBeginRendering(cmd, &rendering);
        var viewport = new Viewport(0, 0, swapchain.Extent.Width, swapchain.Extent.Height, 0, 1);
        vk.CmdSetViewport(cmd, 0, 1, &viewport);
        var scissor = new Rect2D(new Offset2D(0, 0), swapchain.Extent);
        vk.CmdSetScissor(cmd, 0, 1, &scissor);
        draw(cmd);                                              // the sample's own commands: bind and draw
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
      { type: 'h2', text: 'Drawing from the buffer' },
      { type: 'p', text: 'Now the same triangle as module 2, with its corners in a buffer. `CmdBindVertexBuffers` attaches the buffer to binding 0, and `CmdDraw(3, …)` reads vertices 0, 1 and 2 from it:' },
      { type: 'code', title: 'VertexBuffer.cs', code: cs`
using System.Runtime.InteropServices;
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
using var swapchain = new Swapchain(gpu, window.FramebufferSize);
using var readback = new ReadbackBuffer(gpu, swapchain.Extent);
using var pipeline = new MeshPipeline(gpu, swapchain.Format, MeshShaders.Vertex, MeshShaders.Fragment);

Vertex[] vertices =
[
    new(0.0f, -0.5f, 0f,  1f, 0f, 0f),     // top, red
    new(0.5f,  0.5f, 0f,  0f, 1f, 0f),     // bottom right, green
    new(-0.5f, 0.5f, 0f,  0f, 0f, 1f)      // bottom left, blue
];
ulong size = (ulong)(vertices.Length * Marshal.SizeOf<Vertex>());
using var buffer = new GpuBuffer(gpu, size, BufferUsageFlags.VertexBufferBit,
                                 MemoryPropertyFlags.HostVisibleBit | MemoryPropertyFlags.HostCoherentBit);
buffer.Write<Vertex>(vertices);
Console.WriteLine($"Vertex: {Marshal.SizeOf<Vertex>()} bytes, colour at offset {Marshal.OffsetOf<Vertex>("Color")}");
Console.WriteLine($"Buffer: {buffer.Size} bytes in memory type {buffer.MemoryType}");

TestFrame.Draw(gpu, swapchain, readback, cmd =>
{
    unsafe
    {
        var vk = gpu.Vk;
        vk.CmdBindPipeline(cmd, PipelineBindPoint.Graphics, pipeline.Handle);
        var vb = buffer.Handle;
        ulong offset = 0;
        vk.CmdBindVertexBuffers(cmd, 0, 1, &vb, &offset);     // binding 0 reads from this buffer
        vk.CmdDraw(cmd, 3, 1, 0, 0);
    }
});
foreach (var (name, x, y) in new[] { ("corner", 5, 5), ("top tip", 400, 160), ("centre", 400, 300), ("bottom left", 210, 440) })
    Console.WriteLine($"{name,-12} ({x}, {y}): {readback.Pixel(x, y)}");`, output: 'Vertex: 24 bytes, colour at offset 12\nBuffer: 72 bytes in memory type 1\ncorner       (5, 5): (0, 0, 0)\ntop tip      (400, 160): (251, 37, 34)\ncentre       (400, 300): (187, 137, 137)\nbottom left  (210, 440): (50, 26, 250)' },
      { type: 'p', text: 'The pixels are the ones module 2 measured, apart from the background, which `TestFrame` clears to black. The data now takes a different path, though: the CPU wrote 72 bytes into memory the GPU can read, and the GPU’s vertex input hardware fetched each corner and handed it to the shader.' },
      { type: 'note', kind: 'info', text: '`InputRate.Instance` makes a binding advance once per **instance** instead of once per vertex. Module 7 uses it to draw thousands of identical elements (bolts, chairs, light fittings) with one draw call, each with its own position from a second buffer.' },
      { type: 'quiz', question: 'A vertex holds a position (3 floats), a normal (3 floats) and a texture coordinate (2 floats), interleaved in one buffer. What is the stride?', options: ['8 bytes', '24 bytes', '32 bytes', '48 bytes'], answer: 2, explain: '3 + 3 + 2 = 8 floats of 4 bytes each: 32 bytes from one vertex to the next. The offsets are 0, 12 and 24.' },
      { type: 'quiz', question: 'Why does Vulkan separate creating a buffer from allocating its memory?', options: ['To make the API longer', 'So you can choose the memory type, and place many buffers in one allocation', 'Because buffers never need memory', 'For thread safety'], answer: 1, explain: 'The buffer reports its size and alignment needs; you choose where it lives. Lesson 7 uses that to put thousands of buffers in a single allocation.' },
      { type: 'exercise', task: 'Draw a **square** as two triangles from a buffer of 6 vertices: corners (−0.5, −0.5), (0.5, −0.5), (0.5, 0.5) and (−0.5, −0.5), (0.5, 0.5), (−0.5, 0.5), all white. Check one pixel inside each triangle and one outside.', hint: 'Copy VertexBuffer.cs, change the array to 6 white vertices and draw 6 vertices. Pixel (500, 250) is in the first triangle, (300, 350) in the second.', solution: cs`
using System.Runtime.InteropServices;
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600) });
window.Initialize();
using var gpu = new GpuContext(window);
using var swapchain = new Swapchain(gpu, window.FramebufferSize);
using var readback = new ReadbackBuffer(gpu, swapchain.Extent);
using var pipeline = new MeshPipeline(gpu, swapchain.Format, MeshShaders.Vertex, MeshShaders.Fragment);

Vertex[] square =
[
    new(-0.5f, -0.5f, 0f, 1f, 1f, 1f), new(0.5f, -0.5f, 0f, 1f, 1f, 1f), new(0.5f, 0.5f, 0f, 1f, 1f, 1f),
    new(-0.5f, -0.5f, 0f, 1f, 1f, 1f), new(0.5f, 0.5f, 0f, 1f, 1f, 1f), new(-0.5f, 0.5f, 0f, 1f, 1f, 1f)
];
using var buffer = new GpuBuffer(gpu, (ulong)(square.Length * Marshal.SizeOf<Vertex>()), BufferUsageFlags.VertexBufferBit,
                                 MemoryPropertyFlags.HostVisibleBit | MemoryPropertyFlags.HostCoherentBit);
buffer.Write<Vertex>(square);
TestFrame.Draw(gpu, swapchain, readback, cmd =>
{
    unsafe
    {
        gpu.Vk.CmdBindPipeline(cmd, PipelineBindPoint.Graphics, pipeline.Handle);
        var vb = buffer.Handle;
        ulong offset = 0;
        gpu.Vk.CmdBindVertexBuffers(cmd, 0, 1, &vb, &offset);
        gpu.Vk.CmdDraw(cmd, 6, 1, 0, 0);
    }
});
Console.WriteLine($"First triangle (500, 250): {readback.Pixel(500, 250)}");
Console.WriteLine($"Second triangle (300, 350): {readback.Pixel(300, 350)}");
Console.WriteLine($"Outside (100, 100): {readback.Pixel(100, 100)}");`, output: 'First triangle (500, 250): (255, 255, 255)\nSecond triangle (300, 350): (255, 255, 255)\nOutside (100, 100): (0, 0, 0)' }
    ],
    keyPoints: [
      'Vertices live in buffers; the pipeline’s vertex input state says how to read them.',
      'A binding description gives the stride and input rate; attribute descriptions give location, format and offset.',
      'Mark vertex structs [StructLayout(LayoutKind.Sequential)] so C# and the shader agree on the layout.',
      'A buffer is created, then memory is allocated and bound to it, as three separate steps.',
      'Host-visible memory can be mapped and written by the CPU like any other memory.',
      'CmdBindVertexBuffers attaches a buffer to a binding before drawing.'
    ]
  },

  // ------------------------------------------------------------------ 2
  {
    slug: 'memory-types',
    title: 'GPU memory: heaps, types and allocation',
    summary: 'Vulkan shows you the GPU’s memory as heaps and memory types. Learn what the property flags mean, how to pick a type, why reading uncached memory is slow, and why you should not allocate per object.',
    minutes: 18,
    blocks: [
      { type: 'p', text: 'Older APIs decided for you where a buffer lived. Vulkan tells you what memory exists and lets you choose. It describes memory at two levels:' },
      { type: 'table', head: ['Level', 'What it is', 'Example'], rows: [
        ['**Heap**', 'A physical pool of memory with a size', 'The graphics card’s own VRAM; the PC’s system RAM'],
        ['**Memory type**', 'A way of using one heap, described by property flags', '“VRAM, only the GPU can touch it”; “system RAM, mapped and cached for the CPU”']
      ] },
      { type: 'table', head: ['Flag', 'Meaning'], rows: [
        ['`DeviceLocal`', 'Fastest for the GPU to read and write'],
        ['`HostVisible`', 'The CPU can map it and get a pointer'],
        ['`HostCoherent`', 'CPU writes reach the GPU without an explicit flush (and GPU writes reach the CPU)'],
        ['`HostCached`', 'The CPU caches it, so reading from it is fast'],
        ['`LazilyAllocated`', 'Memory that may never exist (mobile tile memory for temporary attachments)']
      ] },
      { type: 'h2', text: 'What this GPU has' },
      { type: 'p', text: 'Every resource reports which types it may use, as a bit mask in `MemoryTypeBits` (bit `i` set means type `i` is allowed). `FindMemoryType` from the last lesson takes the first allowed type with all the flags you ask for. The driver lists types roughly from best to worst, so “first that fits” is a sensible rule.' },
      { type: 'code', title: 'MemoryTypes.cs', code: cs`
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
var vk = gpu.Vk;

var props = vk.GetPhysicalDeviceMemoryProperties(gpu.PhysicalDevice);
for (int i = 0; i < props.MemoryHeapCount; i++)
    Console.WriteLine($"Heap {i}: {props.MemoryHeaps[i].Size / (1024.0 * 1024 * 1024):F2} GiB, {props.MemoryHeaps[i].Flags}");
for (int i = 0; i < props.MemoryTypeCount; i++)
    Console.WriteLine($"Type {i}: heap {props.MemoryTypes[i].HeapIndex}, {props.MemoryTypes[i].PropertyFlags}");

using var vertexBuffer = new GpuBuffer(gpu, 72, BufferUsageFlags.VertexBufferBit, MemoryPropertyFlags.DeviceLocalBit);
MemoryRequirements needs;
unsafe { vk.GetBufferMemoryRequirements(gpu.Device, vertexBuffer.Handle, &needs); }
Console.WriteLine($"A 72-byte vertex buffer needs {needs.Size} bytes, aligned to {needs.Alignment}; allowed types: {Convert.ToString(needs.MemoryTypeBits, 2)} (binary)");

var wishes = new[]
{
    ("GPU only", MemoryPropertyFlags.DeviceLocalBit),
    ("CPU writes", MemoryPropertyFlags.HostVisibleBit | MemoryPropertyFlags.HostCoherentBit),
    ("CPU reads back", MemoryPropertyFlags.HostVisibleBit | MemoryPropertyFlags.HostCachedBit)
};
foreach (var (use, wanted) in wishes)
    Console.WriteLine($"{use,-15} -> type {GpuBuffer.FindMemoryType(gpu, needs.MemoryTypeBits, wanted)}");
Console.WriteLine($"Max separate allocations: {vk.GetPhysicalDeviceProperties(gpu.PhysicalDevice).Limits.MaxMemoryAllocationCount:N0}");`, output: 'Heap 0: 3.87 GiB, DeviceLocalBit\nType 0: heap 0, DeviceLocalBit\nType 1: heap 0, DeviceLocalBit, HostVisibleBit, HostCoherentBit\nType 2: heap 0, DeviceLocalBit, HostVisibleBit, HostCoherentBit, HostCachedBit\nA 72-byte vertex buffer needs 128 bytes, aligned to 64; allowed types: 111 (binary)\nGPU only        -> type 0\nCPU writes      -> type 1\nCPU reads back  -> type 2\nMax separate allocations: 1,047,908' },
      { type: 'p', text: 'This is an **integrated** GPU: it has no VRAM of its own and shares the PC’s RAM, so there is a single heap and every type is `DeviceLocal`. The types differ only in how the CPU sees the memory. Notice too that a 72-byte buffer takes 128 bytes, aligned to 64: you never get exactly what you asked for, which matters when you pack buffers together in lesson 7.' },
      { type: 'p', text: 'A **discrete** graphics card looks quite different. A typical one lists something like this:' },
      { type: 'table', head: ['Heap', 'Size', 'Types on it'], rows: [
        ['0: VRAM', '8 GiB, `DeviceLocal`', '`DeviceLocal`: the place for meshes and textures'],
        ['1: System RAM', '16 GiB', '`HostVisible | HostCoherent` for uploads; `HostVisible | HostCoherent | HostCached` for read-back'],
        ['2: A window into VRAM', '256 MiB (or all of VRAM with Resizable BAR)', '`DeviceLocal | HostVisible | HostCoherent`: the CPU writes straight into VRAM']
      ] },
      { type: 'p', text: 'Pick a use and a GPU, and see which type an engine should ask for:' },
      { type: 'widget', name: 'memory-types' },
      { type: 'h2', text: 'Coherent and cached' },
      { type: 'p', text: 'Without `HostCoherent`, the CPU’s writes may sit in its caches, and you must call `FlushMappedMemoryRanges` before the GPU reads them (and `InvalidateMappedMemoryRanges` before the CPU reads GPU results). Coherent memory saves you those calls, which is why the engine asks for it.' },
      { type: 'p', text: 'Coherent memory that is **not** cached is usually **write-combined**: the CPU gathers writes and sends them out in large bursts, which is fast. Reading it is another story. Every read goes all the way to memory, with no cache in between. Measure it with 64 MiB of each kind:' },
      { type: 'code', title: 'ReadSpeed.cs', code: cs`
using System.Diagnostics;
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
const int Size = 64 << 20;                          // 64 MiB

var times = new List<(double Write, double Read)>();
foreach (var (name, flags) in new[] { ("Coherent, uncached", MemoryPropertyFlags.HostVisibleBit | MemoryPropertyFlags.HostCoherentBit),
                                      ("Cached", MemoryPropertyFlags.HostVisibleBit | MemoryPropertyFlags.HostCachedBit) })
{
    using var buffer = new GpuBuffer(gpu, Size, BufferUsageFlags.TransferDstBit, flags);
    unsafe
    {
        var data = new Span<long>(buffer.Mapped, Size / sizeof(long));
        var clock = Stopwatch.StartNew();
        for (int i = 0; i < data.Length; i++) data[i] = i;
        double write = clock.Elapsed.TotalMilliseconds;
        clock.Restart();
        long sum = 0;
        foreach (long v in data) sum += v;
        double read = clock.Elapsed.TotalMilliseconds;
        times.Add((write, read));
        Console.WriteLine($"{name,-19} (type {buffer.MemoryType}): sum {sum}");
    }
}
double readRatio = times[0].Read / times[1].Read, writeRatio = times[0].Write / times[1].Write;
Console.WriteLine($"Reading uncached memory: more than 5x slower: {readRatio > 5}");
Console.WriteLine($"Writing it: a much smaller difference than reading: {writeRatio < readRatio / 2}");`, output: 'Coherent, uncached  (type 1): sum 35184367894528\nCached              (type 2): sum 35184367894528\nReading uncached memory: more than 5x slower: True\nWriting it: a much smaller difference than reading: True' },
      { type: 'p', text: 'On this PC, reading 64 MiB back from uncached memory took about a second, more than ten times longer than from cached memory. Writing was slower too, but only by a factor of two or three, and the gap changes from run to run. The rule follows: let the CPU **only write**, front to back, into uncached memory (uploads, per-frame uniforms), and use a `HostCached` type for anything it reads back, such as the pixels `ReadbackBuffer` copies out.' },
      { type: 'note', kind: 'warn', text: 'A classic slowdown: building data in mapped memory with code like `buffer[i] += x`, which reads before every write. Build the data in an ordinary C# array, then copy it into the mapped memory in one go.' },
      { type: 'h2', text: 'Do not allocate per object' },
      { type: 'p', text: '`AllocateMemory` is slow (about a tenth of a millisecond on this PC; much more on some systems), and drivers limit how many allocations may exist at once. The specification only guarantees **4,096**, and many Windows drivers report exactly that. This Intel driver allows about a million, but an engine must work everywhere. A BIM model with 50,000 elements cannot give each its own allocation. Engines allocate big blocks and place many buffers inside each one, which lesson 7 builds.' },
      { type: 'quiz', question: 'Which memory type should hold a large mesh the GPU draws every frame and the CPU never touches after loading?', options: ['HostVisible | HostCached', 'HostVisible | HostCoherent', 'DeviceLocal', 'Whatever type is first in the list'], answer: 2, explain: 'DeviceLocal is the fastest for the GPU. On a discrete card it is VRAM, which the CPU usually cannot map, so the data gets there through a staging copy (next lesson).' },
      { type: 'quiz', question: 'A buffer’s MemoryTypeBits is 0b101. Which memory types may it use?', options: ['Types 1 and 3', 'Types 0 and 2', 'Type 5', 'Types 0, 1 and 2'], answer: 1, explain: 'Bit i set means type i is allowed. 0b101 has bits 0 and 2 set.' },
      { type: 'exercise', task: 'Write a function that chooses memory for data the CPU rewrites every frame (such as camera matrices): it should prefer `DeviceLocal | HostVisible | HostCoherent` (the GPU reads it quickly and the CPU can write it), and fall back to `HostVisible | HostCoherent`. Print the type it picks on this GPU for a uniform buffer.', hint: '`FindMemoryType` throws `NotSupportedException` when nothing fits, so try the preferred flags in a `try` block. Get the allowed types from `GetBufferMemoryRequirements` of a buffer created with `UniformBufferBit`.', solution: cs`
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600) });
window.Initialize();
using var gpu = new GpuContext(window);

uint ForEveryFrameWrites(uint allowed)
{
    try { return GpuBuffer.FindMemoryType(gpu, allowed, MemoryPropertyFlags.DeviceLocalBit | MemoryPropertyFlags.HostVisibleBit | MemoryPropertyFlags.HostCoherentBit); }
    catch (NotSupportedException) { return GpuBuffer.FindMemoryType(gpu, allowed, MemoryPropertyFlags.HostVisibleBit | MemoryPropertyFlags.HostCoherentBit); }
}

using var probe = new GpuBuffer(gpu, 256, BufferUsageFlags.UniformBufferBit, MemoryPropertyFlags.HostVisibleBit);
MemoryRequirements needs;
unsafe { gpu.Vk.GetBufferMemoryRequirements(gpu.Device, probe.Handle, &needs); }
uint type = ForEveryFrameWrites(needs.MemoryTypeBits);
var flags = gpu.Vk.GetPhysicalDeviceMemoryProperties(gpu.PhysicalDevice).MemoryTypes[(int)type].PropertyFlags;
Console.WriteLine($"Per-frame data goes in type {type}: {flags}");`, output: 'Per-frame data goes in type 1: DeviceLocalBit, HostVisibleBit, HostCoherentBit' }
    ],
    keyPoints: [
      'Heaps are physical pools of memory; memory types are ways of using a heap, described by flags.',
      'DeviceLocal is fastest for the GPU; HostVisible can be mapped; HostCoherent needs no flushes; HostCached makes CPU reads fast.',
      'A resource’s MemoryTypeBits says which types it may use; take the first allowed type with the flags you need.',
      'Integrated GPUs have one shared heap; discrete GPUs have VRAM plus system RAM, and maybe a mappable window into VRAM.',
      'Only write to uncached mapped memory; read back through a HostCached type.',
      'Allocations are slow and limited in number (4,096 is guaranteed): allocate big blocks and share them.'
    ]
  },

  // ------------------------------------------------------------------ 3
  {
    slug: 'staging-buffers',
    title: 'Staging buffers and transfers',
    summary: 'Get data into memory the CPU cannot map: write it into a host-visible staging buffer, then let the GPU copy it into a device-local buffer. Add the barrier that makes the copy safe to read.',
    minutes: 18,
    blocks: [
      { type: 'p', text: 'The best home for a mesh is `DeviceLocal` memory. On a discrete graphics card that is VRAM, and often the CPU cannot map it at all. The way in is a **staging buffer**: a temporary buffer in host-visible memory that the CPU fills, followed by a copy command the GPU runs, from the staging buffer into the device-local one.' },
      { type: 'table', head: ['Buffer', 'Memory', 'Usage flags'], rows: [
        ['Staging', '`HostVisible | HostCoherent`', '`TransferSrc`: it is copied from'],
        ['Final', '`DeviceLocal`', '`TransferDst` plus the real use, such as `VertexBuffer`']
      ] },
      { type: 'p', text: 'Is the extra copy worth it? It depends on how often the GPU reads the data, and over which connection. Try some sizes:' },
      { type: 'widget', name: 'staging-flow' },
      { type: 'h2', text: 'One-off commands' },
      { type: 'p', text: 'Uploads happen while loading, not every frame, so a simple helper that records some commands, submits them and waits is fine. Its pool has the `Transient` flag, which tells the driver the command buffers are short-lived.' },
      { type: 'h2', text: 'The barrier after a copy' },
      { type: 'p', text: 'A copy is GPU work like any other, and later commands may start before it finishes. Before the vertex input stage reads the new buffer, a **buffer memory barrier** must say: wait for the copy’s writes (`Copy` stage, `TransferWrite` access) and make them visible to vertex, index and uniform reads. Waiting on a fence is not enough on its own. A fence tells the CPU the work is done, but the specification does not promise that later GPU commands see the data without a barrier, even though many drivers happen to work without one. The same goes for the CPU: before it reads data the GPU wrote, a barrier to the `Host` stage makes the writes visible.' },
      { type: 'code', title: 'Engine/Upload.cs', code: cs`
using Silk.NET.Vulkan;
using VkBuffer = Silk.NET.Vulkan.Buffer;

static unsafe class Upload
{
    /// <summary>Records commands, submits them and waits until the GPU has run them. For loading, not for every frame.</summary>
    public static void Immediate(GpuContext gpu, Action<CommandBuffer> record)
    {
        var vk = gpu.Vk;
        var poolInfo = new CommandPoolCreateInfo { SType = StructureType.CommandPoolCreateInfo, Flags = CommandPoolCreateFlags.TransientBit, QueueFamilyIndex = gpu.GraphicsFamily };
        CommandPool pool;
        vk.CreateCommandPool(gpu.Device, &poolInfo, null, &pool).Check("CreateCommandPool");
        var allocInfo = new CommandBufferAllocateInfo { SType = StructureType.CommandBufferAllocateInfo, CommandPool = pool, Level = CommandBufferLevel.Primary, CommandBufferCount = 1 };
        CommandBuffer cmd;
        vk.AllocateCommandBuffers(gpu.Device, &allocInfo, &cmd).Check("AllocateCommandBuffers");
        var begin = new CommandBufferBeginInfo { SType = StructureType.CommandBufferBeginInfo, Flags = CommandBufferUsageFlags.OneTimeSubmitBit };
        vk.BeginCommandBuffer(cmd, &begin).Check("BeginCommandBuffer");
        record(cmd);
        vk.EndCommandBuffer(cmd).Check("EndCommandBuffer");

        var fenceInfo = new FenceCreateInfo { SType = StructureType.FenceCreateInfo };
        Fence fence;
        vk.CreateFence(gpu.Device, &fenceInfo, null, &fence).Check("CreateFence");
        var cmdInfo = new CommandBufferSubmitInfo { SType = StructureType.CommandBufferSubmitInfo, CommandBuffer = cmd };
        var submit = new SubmitInfo2 { SType = StructureType.SubmitInfo2, CommandBufferInfoCount = 1, PCommandBufferInfos = &cmdInfo };
        vk.QueueSubmit2(gpu.GraphicsQueue, 1, &submit, fence).Check("QueueSubmit2");
        vk.WaitForFences(gpu.Device, 1, &fence, true, ulong.MaxValue);
        vk.DestroyFence(gpu.Device, fence, null);
        vk.DestroyCommandPool(gpu.Device, pool, null);
    }

    /// <summary>Creates a device-local buffer holding the data, through a temporary staging buffer.</summary>
    public static GpuBuffer ToDeviceLocal<T>(GpuContext gpu, ReadOnlySpan<T> data, BufferUsageFlags usage) where T : unmanaged
    {
        ulong size = (ulong)(data.Length * sizeof(T));
        using var staging = new GpuBuffer(gpu, size, BufferUsageFlags.TransferSrcBit,
                                          MemoryPropertyFlags.HostVisibleBit | MemoryPropertyFlags.HostCoherentBit);
        staging.Write(data);
        var buffer = new GpuBuffer(gpu, size, usage | BufferUsageFlags.TransferDstBit, MemoryPropertyFlags.DeviceLocalBit);
        Immediate(gpu, cmd =>
        {
            var region = new BufferCopy(srcOffset: 0, dstOffset: 0, size: size);
            gpu.Vk.CmdCopyBuffer(cmd, staging.Handle, buffer.Handle, 1, &region);
            ReadyForDrawing(gpu, cmd, buffer.Handle);
        });
        return buffer;                                  // the staging buffer is freed here: the copy has finished
    }

    /// <summary>Barrier: transfer writes to the buffer finish before vertex, index, uniform and storage reads see them.</summary>
    public static void ReadyForDrawing(GpuContext gpu, CommandBuffer cmd, VkBuffer buffer) =>
        Barrier(gpu, cmd, buffer,
            PipelineStageFlags2.VertexInputBit | PipelineStageFlags2.VertexShaderBit | PipelineStageFlags2.FragmentShaderBit,
            AccessFlags2.VertexAttributeReadBit | AccessFlags2.IndexReadBit | AccessFlags2.UniformReadBit | AccessFlags2.ShaderStorageReadBit);

    /// <summary>Barrier: transfer writes to the buffer become visible to the CPU once the fence has signalled.</summary>
    public static void ReadyForCpu(GpuContext gpu, CommandBuffer cmd, VkBuffer buffer) =>
        Barrier(gpu, cmd, buffer, PipelineStageFlags2.HostBit, AccessFlags2.HostReadBit);

    static void Barrier(GpuContext gpu, CommandBuffer cmd, VkBuffer buffer, PipelineStageFlags2 dstStage, AccessFlags2 dstAccess)
    {
        var barrier = new BufferMemoryBarrier2
        {
            SType = StructureType.BufferMemoryBarrier2,
            SrcStageMask = PipelineStageFlags2.AllTransferBit, SrcAccessMask = AccessFlags2.TransferWriteBit,
            DstStageMask = dstStage, DstAccessMask = dstAccess,
            SrcQueueFamilyIndex = Vk.QueueFamilyIgnored, DstQueueFamilyIndex = Vk.QueueFamilyIgnored,
            Buffer = buffer, Offset = 0, Size = Vk.WholeSize
        };
        var dependency = new DependencyInfo { SType = StructureType.DependencyInfo, BufferMemoryBarrierCount = 1, PBufferMemoryBarriers = &barrier };
        gpu.Vk.CmdPipelineBarrier2(cmd, &dependency);
    }
}` },
      { type: 'p', text: 'This program uploads 16 MiB of numbers into device-local memory, copies them back into a cached buffer and checks every value survived the round trip. Then it draws the triangle from a device-local vertex buffer:' },
      { type: 'code', title: 'Staging.cs', code: cs`
using System.Diagnostics;
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
using var swapchain = new Swapchain(gpu, window.FramebufferSize);
using var readback = new ReadbackBuffer(gpu, swapchain.Extent);
using var pipeline = new MeshPipeline(gpu, swapchain.Format, MeshShaders.Vertex, MeshShaders.Fragment);

// 1. A round trip: CPU -> staging -> device-local -> cached buffer -> CPU
var numbers = new float[4 << 20];                   // 4 Mi floats = 16 MiB
for (int i = 0; i < numbers.Length; i++) numbers[i] = i * 0.5f;
var clock = Stopwatch.StartNew();
using var onGpu = Upload.ToDeviceLocal<float>(gpu, numbers, BufferUsageFlags.StorageBufferBit | BufferUsageFlags.TransferSrcBit);
bool mapped;
unsafe { mapped = onGpu.Mapped != null; }
Console.WriteLine($"Uploaded {onGpu.Size >> 20} MiB into memory type {onGpu.MemoryType} (mapped: {mapped}) in under a second: {clock.Elapsed.TotalSeconds < 1}");

using var back = new GpuBuffer(gpu, onGpu.Size, BufferUsageFlags.TransferDstBit, MemoryPropertyFlags.HostVisibleBit | MemoryPropertyFlags.HostCachedBit);
Upload.Immediate(gpu, cmd =>
{
    unsafe
    {
        var region = new BufferCopy(0, 0, onGpu.Size);
        gpu.Vk.CmdCopyBuffer(cmd, onGpu.Handle, back.Handle, 1, &region);
        Upload.ReadyForCpu(gpu, cmd, back.Handle);
    }
});
unsafe
{
    bool same = new ReadOnlySpan<float>(back.Mapped, numbers.Length).SequenceEqual(numbers);
    Console.WriteLine($"Copied back into type {back.MemoryType}: all {numbers.Length:N0} values identical: {same}");
}

// 2. The triangle, from a device-local vertex buffer
Vertex[] vertices = [new(0.0f, -0.5f, 0f, 1f, 0f, 0f), new(0.5f, 0.5f, 0f, 0f, 1f, 0f), new(-0.5f, 0.5f, 0f, 0f, 0f, 1f)];
using var vertexBuffer = Upload.ToDeviceLocal<Vertex>(gpu, vertices, BufferUsageFlags.VertexBufferBit);
TestFrame.Draw(gpu, swapchain, readback, cmd =>
{
    unsafe
    {
        gpu.Vk.CmdBindPipeline(cmd, PipelineBindPoint.Graphics, pipeline.Handle);
        var vb = vertexBuffer.Handle;
        ulong offset = 0;
        gpu.Vk.CmdBindVertexBuffers(cmd, 0, 1, &vb, &offset);
        gpu.Vk.CmdDraw(cmd, 3, 1, 0, 0);
    }
});
Console.WriteLine($"Triangle from type {vertexBuffer.MemoryType}: centre {readback.Pixel(400, 300)}");`, output: 'Uploaded 16 MiB into memory type 0 (mapped: False) in under a second: True\nCopied back into type 2: all 4,194,304 values identical: True\nTriangle from type 0: centre (187, 137, 137)' },
      { type: 'p', text: 'The device-local buffers landed in type 0, which the CPU cannot map, and the data arrived intact. On this integrated GPU the staging copy is not strictly needed: type 1 is both `DeviceLocal` and `HostVisible`, so the CPU could write vertices in place. On discrete cards with **Resizable BAR** turned on, the same is true for all of VRAM. The staging path still works everywhere, so the engine uses it for anything loaded once, and keeps direct writes for small data that changes every frame.' },
      { type: 'note', kind: 'warn', text: 'Creating a staging buffer and waiting for each small upload is fine while loading a model, but far too slow during a frame. Engines that stream data in while drawing keep one large staging buffer, used as a ring, and batch many copies into one submit.' },
      { type: 'note', kind: 'tip', text: 'Many GPUs have a separate **transfer** queue family (module 1), backed by copy engines that run alongside drawing. Big engines upload on that queue so loading does not slow the frame rate. It adds queue ownership transfers to the barriers, so this course stays on the graphics queue.' },
      { type: 'quiz', question: 'Which usage flags does the device-local vertex buffer need?', options: ['VertexBuffer only', 'VertexBuffer and TransferDst', 'TransferSrc only', 'VertexBuffer and TransferSrc'], answer: 1, explain: 'It is the destination of the copy (TransferDst) and is then read as vertices (VertexBuffer). The staging buffer is the one with TransferSrc.' },
      { type: 'quiz', question: 'Why does ToDeviceLocal record a barrier after the copy?', options: ['To change the buffer’s layout', 'So later commands reading the buffer see the copied data, not stale memory', 'To free the staging buffer', 'Barriers are only for images'], answer: 1, explain: 'Buffers have no layouts, but they still need memory dependencies: the copy’s writes must be finished and visible before the vertex input stage reads them.' },
      { type: 'exercise', task: 'Change a device-local buffer after it was uploaded. `CmdUpdateBuffer` writes up to 65,536 bytes of data straight from the command buffer, with no staging buffer. Use it to turn the triangle’s top corner white (vertex 0’s colour, 12 bytes at byte offset 12), then draw and check a pixel near the top tip.', hint: 'Inside `Upload.Immediate`, call `CmdUpdateBuffer(cmd, buffer.Handle, 12, 12, &white)` with a `Vector3 white`, then `Upload.ReadyForDrawing`. Offsets and sizes must be multiples of 4.', solution: cs`
using System.Numerics;
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600) });
window.Initialize();
using var gpu = new GpuContext(window);
using var swapchain = new Swapchain(gpu, window.FramebufferSize);
using var readback = new ReadbackBuffer(gpu, swapchain.Extent);
using var pipeline = new MeshPipeline(gpu, swapchain.Format, MeshShaders.Vertex, MeshShaders.Fragment);
Vertex[] vertices = [new(0.0f, -0.5f, 0f, 1f, 0f, 0f), new(0.5f, 0.5f, 0f, 0f, 1f, 0f), new(-0.5f, 0.5f, 0f, 0f, 0f, 1f)];
using var buffer = Upload.ToDeviceLocal<Vertex>(gpu, vertices, BufferUsageFlags.VertexBufferBit);

void Draw(string label)
{
    TestFrame.Draw(gpu, swapchain, readback, cmd =>
    {
        unsafe
        {
            gpu.Vk.CmdBindPipeline(cmd, PipelineBindPoint.Graphics, pipeline.Handle);
            var vb = buffer.Handle;
            ulong offset = 0;
            gpu.Vk.CmdBindVertexBuffers(cmd, 0, 1, &vb, &offset);
            gpu.Vk.CmdDraw(cmd, 3, 1, 0, 0);
        }
    });
    Console.WriteLine($"{label}: near the top tip {readback.Pixel(400, 160)}");
}

Draw("Before");
Upload.Immediate(gpu, cmd =>
{
    unsafe
    {
        var white = new Vector3(1f, 1f, 1f);
        gpu.Vk.CmdUpdateBuffer(cmd, buffer.Handle, 12, 12, &white);   // vertex 0, field Color
        Upload.ReadyForDrawing(gpu, cmd, buffer.Handle);
    }
});
Draw("After ");`, output: 'Before: near the top tip (251, 37, 34)\nAfter : near the top tip (251, 253, 253)' }
    ],
    keyPoints: [
      'Device-local memory is fastest for the GPU but often cannot be mapped on discrete cards.',
      'Staging: the CPU fills a host-visible TransferSrc buffer; the GPU copies it into a device-local TransferDst buffer.',
      'Record a buffer memory barrier after the copy so later reads see the data; a fence alone is not enough.',
      'Before the CPU reads GPU-written data, a barrier to the Host stage makes it visible.',
      'Integrated GPUs and Resizable BAR allow direct writes into device-local memory; the staging path works everywhere.',
      'CmdUpdateBuffer is handy for small changes (up to 64 KiB) without a staging buffer.'
    ]
  },

  // ------------------------------------------------------------------ 4
  {
    slug: 'index-buffers',
    title: 'Index buffers',
    summary: 'Store each shared corner once and describe triangles with a list of indices. Build a Mesh class with a vertex and an index buffer, choose 16- or 32-bit indices, and see how much memory it saves.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'In a closed mesh, most corners belong to several triangles. A square made of two triangles has four corners, but drawing it from a vertex buffer alone needs six vertices, two of them repeated. In a grid, such as a floor slab split into cells, each inner corner is shared by **six** triangles.' },
      { type: 'p', text: 'An **index buffer** fixes that. The vertex buffer holds each distinct corner once, and the index buffer lists, three numbers per triangle, which vertices to use. `CmdDrawIndexed` then walks the indices instead of the vertices.' },
      { type: 'widget', name: 'index-grid' },
      { type: 'p', text: 'There is a second saving. The GPU keeps a small cache of recently shaded vertices, keyed by index. When the same index comes up again soon, it reuses the result instead of running the vertex shader again. Mesh optimisers reorder triangles to make the most of that cache.' },
      { type: 'table', head: ['Index type', 'Bytes per index', 'Vertices it can address'], rows: [
        ['`Uint16`', '2', '65,536'],
        ['`Uint32`', '4', 'Over 4 billion (this GPU’s limit: `maxDrawIndexedIndexValue` = 4,294,967,295)'],
        ['`Uint8` (extension)', '1', '256']
      ] },
      { type: 'p', text: 'Most meshes in a BIM model are small (a door, a pipe fitting, a beam), so the engine uses 16-bit indices whenever the vertex count allows, halving the index memory. The `Mesh` class uploads both buffers with the staging path from the last lesson:' },
      { type: 'code', title: 'Engine/Mesh.cs', code: cs`
using Silk.NET.Vulkan;

/// <summary>A vertex buffer and an index buffer in device-local memory, ready to draw.</summary>
sealed unsafe class Mesh : IDisposable
{
    readonly GpuContext gpu;
    public readonly GpuBuffer Vertices, Indices;
    public readonly uint IndexCount;
    public readonly IndexType IndexType;

    public Mesh(GpuContext gpu, Vertex[] vertices, uint[] indices)
    {
        this.gpu = gpu;
        Vertices = Upload.ToDeviceLocal<Vertex>(gpu, vertices, BufferUsageFlags.VertexBufferBit);
        IndexCount = (uint)indices.Length;
        if (vertices.Length <= 65536)                   // every index fits in 16 bits: half the memory
        {
            IndexType = IndexType.Uint16;
            Indices = Upload.ToDeviceLocal<ushort>(gpu, Array.ConvertAll(indices, i => (ushort)i), BufferUsageFlags.IndexBufferBit);
        }
        else
        {
            IndexType = IndexType.Uint32;
            Indices = Upload.ToDeviceLocal<uint>(gpu, indices, BufferUsageFlags.IndexBufferBit);
        }
    }

    public void Draw(CommandBuffer cmd)
    {
        var vb = Vertices.Handle;
        ulong offset = 0;
        gpu.Vk.CmdBindVertexBuffers(cmd, 0, 1, &vb, &offset);
        gpu.Vk.CmdBindIndexBuffer(cmd, Indices.Handle, 0, IndexType);
        gpu.Vk.CmdDrawIndexed(cmd, IndexCount, 1, 0, 0, 0);   // indexCount, instances, firstIndex, vertexOffset, firstInstance
    }

    public void Dispose()
    {
        Vertices.Dispose();
        Indices.Dispose();
    }
}` },
      { type: 'p', text: 'A square with four coloured corners, then the arithmetic for grids of different sizes:' },
      { type: 'code', title: 'Indexed.cs', code: cs`
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
using var swapchain = new Swapchain(gpu, window.FramebufferSize);
using var readback = new ReadbackBuffer(gpu, swapchain.Extent);
using var pipeline = new MeshPipeline(gpu, swapchain.Format, MeshShaders.Vertex, MeshShaders.Fragment);

Vertex[] corners =
[
    new(-0.5f, -0.5f, 0f,  1f, 0f, 0f),     // 0: top left, red
    new( 0.5f, -0.5f, 0f,  0f, 1f, 0f),     // 1: top right, green
    new( 0.5f,  0.5f, 0f,  0f, 0f, 1f),     // 2: bottom right, blue
    new(-0.5f,  0.5f, 0f,  1f, 1f, 1f)      // 3: bottom left, white
];
uint[] indices = [0, 1, 2,   2, 3, 0];      // two triangles, both clockwise on screen
using var square = new Mesh(gpu, corners, indices);
Console.WriteLine($"Square: {corners.Length} vertices, {square.IndexCount} indices of type {square.IndexType}");

TestFrame.Draw(gpu, swapchain, readback, cmd =>
{
    gpu.Vk.CmdBindPipeline(cmd, PipelineBindPoint.Graphics, pipeline.Handle);
    square.Draw(cmd);
});
foreach (var (name, x, y) in new[] { ("near top left", 205, 155), ("near bottom left", 205, 445), ("centre", 400, 300), ("outside", 100, 100) })
    Console.WriteLine($"{name,-17} ({x}, {y}): {readback.Pixel(x, y)}");

// Grids of n x n cells, 24-byte vertices
foreach (int n in new[] { 1, 10, 100, 300 })
{
    int vertexCount = (n + 1) * (n + 1), indexCount = n * n * 6;
    long plain = (long)indexCount * 24;                                  // every corner stored again
    long indexed = (long)vertexCount * 24 + (long)indexCount * (vertexCount <= 65536 ? 2 : 4);
    Console.WriteLine($"{n,3} x {n,-3} grid: {plain,10:N0} bytes as a plain list, {indexed,10:N0} indexed ({(double)indexed / plain:P0})");
}`, output: 'Square: 4 vertices, 6 indices of type Uint16\nnear top left     (205, 155): (253, 14, 37)\nnear bottom left  (205, 445): (253, 252, 253)\ncentre            (400, 300): (187, 1, 188)\noutside           (100, 100): (0, 0, 0)\n  1 x 1   grid:        144 bytes as a plain list,        108 indexed (75%)\n 10 x 10  grid:     14,400 bytes as a plain list,      4,104 indexed (28%)\n100 x 100 grid:  1,440,000 bytes as a plain list,    364,824 indexed (25%)\n300 x 300 grid: 12,960,000 bytes as a plain list,  4,334,424 indexed (33%)' },
      { type: 'p', text: 'Four vertices, six indices, and the square is complete, with each corner in its own colour. Look at the centre, though: it is half red and half blue, with no green or white. It lies on the diagonal shared by the two triangles, and along an edge only that edge’s two corners count. A quad’s colours are blended per triangle, not across all four corners. For a large grid, indexing takes about a quarter of the memory. The 300 × 300 grid has more than 65,536 vertices, so it needs 32-bit indices and saves a little less.' },
      { type: 'note', kind: 'warn', text: 'With back-face culling on, the order of the three indices decides which side is the front. Keep every triangle of a mesh wound the same way. A single flipped triangle shows up as a hole when the model is viewed from that side.' },
      { type: 'quiz', question: 'A mesh has 70,000 vertices. Which index type must it use?', options: ['Uint8', 'Uint16', 'Uint32', 'Any of them'], answer: 2, explain: 'Uint16 can only address vertices 0 to 65,535. With 70,000 vertices, some indices need more than 16 bits.' },
      { type: 'quiz', question: 'Besides saving memory, why are indexed meshes often faster to draw?', options: ['Indices are compressed', 'The GPU can reuse a recently shaded vertex when its index comes up again, skipping the vertex shader', 'Indexed draws skip rasterisation', 'They are not faster'], answer: 1, explain: 'The post-transform vertex cache is keyed by index. Without indices, every corner of every triangle is shaded again.' },
      { type: 'exercise', task: 'Build a **hexagon** as a fan of six triangles around a white centre vertex: 7 vertices (the centre at index 0, then 6 corners at radius 0.5) and 18 indices. Draw it and print the centre pixel and the index type.', hint: 'Corner `i` is at angle `i × 60°`: `(0.5 cos a, 0.5 sin a)`. Triangle `i` uses indices `0, i + 1, (i + 1) % 6 + 1`.', solution: cs`
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600) });
window.Initialize();
using var gpu = new GpuContext(window);
using var swapchain = new Swapchain(gpu, window.FramebufferSize);
using var readback = new ReadbackBuffer(gpu, swapchain.Extent);
using var pipeline = new MeshPipeline(gpu, swapchain.Format, MeshShaders.Vertex, MeshShaders.Fragment);

var vertices = new Vertex[7];
vertices[0] = new(0f, 0f, 0f, 1f, 1f, 1f);                     // centre, white
for (int i = 0; i < 6; i++)
{
    double a = i * Math.PI / 3;
    vertices[i + 1] = new((float)(0.5 * Math.Cos(a)), (float)(0.5 * Math.Sin(a)), 0f, i % 2, 0f, 1 - i % 2);
}
var indices = new uint[18];
for (uint i = 0; i < 6; i++)
{
    indices[i * 3] = 0;
    indices[i * 3 + 1] = i + 1;
    indices[i * 3 + 2] = (i + 1) % 6 + 1;
}
using var hexagon = new Mesh(gpu, vertices, indices);
TestFrame.Draw(gpu, swapchain, readback, cmd =>
{
    gpu.Vk.CmdBindPipeline(cmd, PipelineBindPoint.Graphics, pipeline.Handle);
    hexagon.Draw(cmd);
});
Console.WriteLine($"{vertices.Length} vertices, {hexagon.IndexCount} indices ({hexagon.IndexType})");
Console.WriteLine($"Centre: {readback.Pixel(400, 300)}");`, output: '7 vertices, 18 indices (Uint16)\nCentre: (255, 254, 254)' }
    ],
    keyPoints: [
      'An index buffer lets triangles share vertices: each distinct corner is stored once.',
      'CmdBindIndexBuffer plus CmdDrawIndexed draw by walking the indices.',
      'Use 16-bit indices when a mesh has at most 65,536 vertices; 32-bit otherwise.',
      'The GPU’s vertex cache reuses shaded vertices by index, saving vertex shader work.',
      'Index order sets each triangle’s winding; keep a mesh consistent for culling.'
    ]
  },

  // ------------------------------------------------------------------ 5
  {
    slug: 'uniform-buffers',
    title: 'Uniform buffers and descriptor sets',
    summary: 'Give shaders values that are the same for a whole draw, such as a transform and a tint. Learn descriptor set layouts, pools and sets, and the std140 rules that decide where each value sits in memory.',
    minutes: 22,
    blocks: [
      { type: 'p', text: 'Vertex attributes change from one corner to the next. Some values are the same for every vertex and pixel of a draw: the camera’s matrices, the time, the direction of the sun, a highlight colour. They go in a **uniform buffer**, a small buffer that shaders read as a block of named values.' },
      { type: 'h2', text: 'Descriptors' },
      { type: 'p', text: 'Shaders do not take buffer handles. They read resources through **descriptors**: small records that say “a uniform buffer, this one, from this offset”. Descriptors are grouped into **descriptor sets**, and the shader names each resource by its set and binding number, as in `layout(set = 0, binding = 0)`. Five objects and calls are involved:' },
      { type: 'table', head: ['Object or call', 'Role'], rows: [
        ['`DescriptorSetLayout`', 'The shape of a set: binding 0 is a uniform buffer, visible to the vertex and fragment stages'],
        ['`PipelineLayout`', 'Lists the set layouts a pipeline uses (the `setLayouts` parameter of `MeshPipeline`)'],
        ['`DescriptorPool`', 'Memory that sets are allocated from, sized for so many sets and descriptors of each type'],
        ['`UpdateDescriptorSets`', 'Writes the descriptors: binding 0 of this set points at that buffer'],
        ['`CmdBindDescriptorSets`', 'Makes a set current for the following draws']
      ] },
      { type: 'h2', text: 'Where each value sits: std140' },
      { type: 'p', text: 'The C# struct and the GLSL block must agree byte for byte, and GLSL lays out uniform blocks by the **std140** rules: a `float` aligns to 4 bytes, a `vec2` to 8, and a `vec3` or `vec4` to **16**. A `mat4` is four `vec4` columns. Arrays and nested structs round each element up to 16 bytes. The classic trap is `vec3`: it takes 12 bytes but starts on a 16-byte boundary, so a C# `Vector3` followed by another value ends up at the wrong offset. Build a block and see:' },
      { type: 'widget', name: 'std140-layout' },
      { type: 'p', text: 'This module’s block holds a tint colour, an offset and a scale. The vertex shader scales and moves the mesh, then multiplies its colours by the tint:' },
      { type: 'code', title: 'Engine/Transform.cs', code: cs`
using System.Numerics;
using System.Runtime.InteropServices;

/// <summary>Per-draw values for the shaders, laid out as GLSL's std140 rules place them: 32 bytes.</summary>
[StructLayout(LayoutKind.Sequential)]
struct Transform(Vector4 tint, Vector2 offset, float scale)
{
    public Vector4 Tint = tint;         // vec4  at offset 0
    public Vector2 Offset = offset;     // vec2  at offset 16
    public float Scale = scale;         // float at offset 24
    float padding = 0;                  // std140 rounds the block up to a multiple of 16 bytes
}

static class TransformShaders
{
    public const string Uniform = """
        #version 450

        layout(location = 0) in vec3 inPosition;
        layout(location = 1) in vec3 inColor;
        layout(location = 0) out vec3 vColor;

        layout(set = 0, binding = 0) uniform TransformBlock
        {
            vec4 tint;
            vec2 offset;
            float scale;
        } transform;

        void main()
        {
            gl_Position = vec4(inPosition.xy * transform.scale + transform.offset, inPosition.z, 1.0);
            vColor = inColor * transform.tint.rgb;
        }
        """;
}` },
      { type: 'p', text: 'The engine wraps one uniform buffer and its descriptor set in a class, so you can see every step in order:' },
      { type: 'code', title: 'Engine/UniformSet.cs', code: cs`
using Silk.NET.Vulkan;

/// <summary>One uniform buffer holding a T, visible to the shaders at set 0, binding 0.</summary>
sealed unsafe class UniformSet<T> : IDisposable where T : unmanaged
{
    readonly GpuContext gpu;
    public readonly DescriptorSetLayout Layout;
    public readonly DescriptorPool Pool;
    public readonly DescriptorSet Set;
    public readonly GpuBuffer Buffer;

    public UniformSet(GpuContext gpu)
    {
        this.gpu = gpu;
        var vk = gpu.Vk;

        // 1. The layout: binding 0 is one uniform buffer, read by the vertex and fragment shaders
        var binding = new DescriptorSetLayoutBinding
        {
            Binding = 0, DescriptorType = DescriptorType.UniformBuffer, DescriptorCount = 1,
            StageFlags = ShaderStageFlags.VertexBit | ShaderStageFlags.FragmentBit
        };
        var layoutInfo = new DescriptorSetLayoutCreateInfo { SType = StructureType.DescriptorSetLayoutCreateInfo, BindingCount = 1, PBindings = &binding };
        DescriptorSetLayout layout;
        vk.CreateDescriptorSetLayout(gpu.Device, &layoutInfo, null, &layout).Check("CreateDescriptorSetLayout");
        Layout = layout;

        // 2. A pool with room for one set holding one uniform-buffer descriptor
        var poolSize = new DescriptorPoolSize(DescriptorType.UniformBuffer, 1);
        var poolInfo = new DescriptorPoolCreateInfo { SType = StructureType.DescriptorPoolCreateInfo, MaxSets = 1, PoolSizeCount = 1, PPoolSizes = &poolSize };
        DescriptorPool pool;
        vk.CreateDescriptorPool(gpu.Device, &poolInfo, null, &pool).Check("CreateDescriptorPool");
        Pool = pool;

        // 3. The set itself, shaped by the layout
        var allocInfo = new DescriptorSetAllocateInfo { SType = StructureType.DescriptorSetAllocateInfo, DescriptorPool = Pool, DescriptorSetCount = 1, PSetLayouts = &layout };
        DescriptorSet set;
        vk.AllocateDescriptorSets(gpu.Device, &allocInfo, &set).Check("AllocateDescriptorSets");
        Set = set;

        // 4. The buffer, and the descriptor that points at it
        Buffer = new GpuBuffer(gpu, (ulong)sizeof(T), BufferUsageFlags.UniformBufferBit,
                               MemoryPropertyFlags.HostVisibleBit | MemoryPropertyFlags.HostCoherentBit);
        var bufferInfo = new DescriptorBufferInfo(Buffer.Handle, 0, (ulong)sizeof(T));
        var write = new WriteDescriptorSet
        {
            SType = StructureType.WriteDescriptorSet, DstSet = Set, DstBinding = 0,
            DescriptorCount = 1, DescriptorType = DescriptorType.UniformBuffer, PBufferInfo = &bufferInfo
        };
        vk.UpdateDescriptorSets(gpu.Device, 1, &write, 0, null);
    }

    /// <summary>Overwrites the buffer. Only safe while the GPU is not reading it.</summary>
    public void Write(in T value) => Buffer.Write(new ReadOnlySpan<T>(in value));

    public void Bind(CommandBuffer cmd, PipelineLayout pipelineLayout)
    {
        var set = Set;
        gpu.Vk.CmdBindDescriptorSets(cmd, PipelineBindPoint.Graphics, pipelineLayout, 0, 1, &set, 0, null);
    }

    public void Dispose()
    {
        Buffer.Dispose();
        gpu.Vk.DestroyDescriptorPool(gpu.Device, Pool, null);         // frees the sets allocated from it
        gpu.Vk.DestroyDescriptorSetLayout(gpu.Device, Layout, null);
    }
}` },
      { type: 'p', text: 'Now draw the same mesh three times with different uniform values, reading two pixels each time: the window centre, and the point (600, 300), where the triangle’s centre lands after it moves half a screen to the right:' },
      { type: 'code', title: 'Uniforms.cs', code: cs`
using System.Numerics;
using System.Runtime.InteropServices;
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
using var swapchain = new Swapchain(gpu, window.FramebufferSize);
using var readback = new ReadbackBuffer(gpu, swapchain.Extent);
using var uniforms = new UniformSet<Transform>(gpu);
using var pipeline = new MeshPipeline(gpu, swapchain.Format, TransformShaders.Uniform, MeshShaders.Fragment, setLayouts: [uniforms.Layout]);
using var triangle = new Mesh(gpu, [new(0f, -0.5f, 0f, 1f, 0f, 0f), new(0.5f, 0.5f, 0f, 0f, 1f, 0f), new(-0.5f, 0.5f, 0f, 0f, 0f, 1f)], [0, 1, 2]);
Console.WriteLine($"Transform: {Marshal.SizeOf<Transform>()} bytes, scale at offset {Marshal.OffsetOf<Transform>("Scale")}; buffer in memory type {uniforms.Buffer.MemoryType}");

void Frame(string label, Transform transform)
{
    uniforms.Write(transform);                      // safe: TestFrame waits until the GPU is idle
    TestFrame.Draw(gpu, swapchain, readback, cmd =>
    {
        gpu.Vk.CmdBindPipeline(cmd, PipelineBindPoint.Graphics, pipeline.Handle);
        uniforms.Bind(cmd, pipeline.Layout);
        triangle.Draw(cmd);
    });
    Console.WriteLine($"{label,-26} (400, 300): {readback.Pixel(400, 300),-15} (600, 300): {readback.Pixel(600, 300)}");
}

Frame("As before", new(Vector4.One, Vector2.Zero, 1f));
Frame("Half size, moved right", new(Vector4.One, new Vector2(0.5f, 0f), 0.5f));
Frame("Same, with red removed", new(new Vector4(0f, 1f, 1f, 1f), new Vector2(0.5f, 0f), 0.5f));`, output: 'Transform: 32 bytes, scale at offset 24; buffer in memory type 1\nAs before                  (400, 300): (187, 137, 137) (600, 300): (0, 0, 0)\nHalf size, moved right     (400, 300): (0, 0, 0)       (600, 300): (187, 138, 137)\nSame, with red removed     (400, 300): (0, 0, 0)       (600, 300): (0, 138, 137)' },
      { type: 'p', text: 'The mesh never changed; only 32 bytes of uniform data did. Moving and shrinking it put its centre at (600, 300), and the tint (0, 1, 1) removed the red: the stored red drops to 0 while green and blue stay. Module 4 replaces offset and scale with real 4 × 4 matrices for a 3D camera, using exactly this mechanism.' },
      { type: 'h2', text: 'Uniforms in the render loop' },
      { type: 'p', text: '`TestFrame` waits for the GPU after each frame, so rewriting the buffer between frames is safe here. In the render loop from module 2, the GPU may still be reading frame N’s uniforms while the CPU prepares frame N + 1. So the engine keeps **one uniform buffer and one descriptor set per frame in flight**, and writes only the slot whose fence it has just waited on.' },
      { type: 'note', kind: 'info', text: 'One buffer can also hold many blocks at different offsets, with a **dynamic** uniform buffer descriptor that takes the offset at bind time. Offsets must be multiples of `minUniformBufferOffsetAlignment`, 64 bytes on this GPU (up to 256 on others).' },
      { type: 'quiz', question: 'A std140 block is { vec3 a; float b; }. At which offset is b?', options: ['16', '12', '4', '24'], answer: 1, explain: 'vec3 a starts at 0 and takes 12 bytes; a float only needs 4-byte alignment, so b fits at 12. The trap is the other way round: a vec3 after a float would start at 16, not 4.' },
      { type: 'quiz', question: 'What does a DescriptorSetLayout describe?', options: ['The data inside the buffer', 'The shape of a set: what type of resource sits at each binding and which shader stages see it', 'Where the set is in memory', 'The order of draw calls'], answer: 1, explain: 'The layout is the contract between pipeline and sets. Any set allocated with that layout can be bound to a pipeline built with it.' },
      { type: 'exercise', task: 'Make the triangle **twice** as large (scale 2, no offset, white tint) and check that the pixel (100, 580), near the bottom-left corner of the window, is now covered.', hint: 'Copy Uniforms.cs and call `Frame` once with `new(Vector4.One, Vector2.Zero, 2f)`, printing `readback.Pixel(100, 580)`.', solution: cs`
using System.Numerics;
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600) });
window.Initialize();
using var gpu = new GpuContext(window);
using var swapchain = new Swapchain(gpu, window.FramebufferSize);
using var readback = new ReadbackBuffer(gpu, swapchain.Extent);
using var uniforms = new UniformSet<Transform>(gpu);
using var pipeline = new MeshPipeline(gpu, swapchain.Format, TransformShaders.Uniform, MeshShaders.Fragment, setLayouts: [uniforms.Layout]);
using var triangle = new Mesh(gpu, [new(0f, -0.5f, 0f, 1f, 0f, 0f), new(0.5f, 0.5f, 0f, 0f, 1f, 0f), new(-0.5f, 0.5f, 0f, 0f, 0f, 1f)], [0, 1, 2]);

foreach (float scale in new[] { 1f, 2f })
{
    uniforms.Write(new Transform(Vector4.One, Vector2.Zero, scale));
    TestFrame.Draw(gpu, swapchain, readback, cmd =>
    {
        gpu.Vk.CmdBindPipeline(cmd, PipelineBindPoint.Graphics, pipeline.Handle);
        uniforms.Bind(cmd, pipeline.Layout);
        triangle.Draw(cmd);
    });
    Console.WriteLine($"Scale {scale}: pixel (100, 580) = {readback.Pixel(100, 580)}");
}`, output: 'Scale 1: pixel (100, 580) = (0, 0, 0)\nScale 2: pixel (100, 580) = (50, 93, 238)' }
    ],
    keyPoints: [
      'Uniform buffers hold values that are the same for a whole draw: transforms, colours, light settings.',
      'Shaders reach resources through descriptors, grouped in sets and addressed as (set, binding).',
      'Set layout → pipeline layout; pool → set → UpdateDescriptorSets; then CmdBindDescriptorSets before drawing.',
      'std140 aligns vec3 and vec4 to 16 bytes; make the C# struct match it exactly.',
      'Keep one uniform buffer per frame in flight so the CPU never overwrites data the GPU is reading.'
    ]
  },

  // ------------------------------------------------------------------ 6
  {
    slug: 'push-constants',
    title: 'Push constants',
    summary: 'Give each draw its own small set of values by recording them straight into the command buffer. See why rewriting a uniform buffer between draws does not work, and when to use which.',
    minutes: 16,
    blocks: [
      { type: 'p', text: 'A BIM viewer draws thousands of elements per frame, each with its own position and colour (and later its own ID for picking). The uniform buffer from the last lesson holds one set of values. What if you simply rewrite it before each draw?' },
      { type: 'widget', name: 'per-draw-data' },
      { type: 'p', text: 'It cannot work. Recording a draw does not run it: the CPU finishes recording and writing long before the GPU starts, so every draw reads whatever the buffer holds at that moment, the last values written. What each draw needs is data that travels **with** the command.' },
      { type: 'h2', text: 'Push constants' },
      { type: 'p', text: '**Push constants** are exactly that: a small block of bytes recorded into the command buffer by `CmdPushConstants`. Each draw sees the values pushed most recently before it was recorded. There are no buffers, descriptors or pools. The catch is the size: the specification guarantees only **128 bytes**, which is enough for one 4 × 4 matrix plus a little more. This GPU allows 256.' },
      { type: 'p', text: 'The shader declares a block with `layout(push_constant)`; there is at most one such block per stage. The pipeline layout declares a matching `PushConstantRange`: which stages see it, and its offset and size.' },
      { type: 'code', title: 'Engine/PushShaders.cs', code: cs`
static class PushShaders
{
    /// <summary>The same transform as TransformShaders.Uniform, read from push constants instead of a uniform buffer.</summary>
    public const string Vertex = """
        #version 450

        layout(location = 0) in vec3 inPosition;
        layout(location = 1) in vec3 inColor;
        layout(location = 0) out vec3 vColor;

        layout(push_constant) uniform PushBlock
        {
            vec4 tint;
            vec2 offset;
            float scale;
        } transform;

        void main()
        {
            gl_Position = vec4(inPosition.xy * transform.scale + transform.offset, inPosition.z, 1.0);
            vColor = inColor * transform.tint.rgb;
        }
        """;
}` },
      { type: 'p', text: 'The program draws three small triangles (red on the left, green in the middle, blue on the right) twice: first by rewriting the uniform buffer between draws, then with push constants. It reads the pixel at each triangle’s centre:' },
      { type: 'code', title: 'PushConstants.cs', code: cs`
using System.Numerics;
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
using var swapchain = new Swapchain(gpu, window.FramebufferSize);
using var readback = new ReadbackBuffer(gpu, swapchain.Extent);
using var triangle = new Mesh(gpu, [new(0f, -0.5f, 0f, 1f, 1f, 1f), new(0.5f, 0.5f, 0f, 1f, 1f, 1f), new(-0.5f, 0.5f, 0f, 1f, 1f, 1f)], [0, 1, 2]);
using var uniforms = new UniformSet<Transform>(gpu);
using var withUniform = new MeshPipeline(gpu, swapchain.Format, TransformShaders.Uniform, MeshShaders.Fragment, setLayouts: [uniforms.Layout]);
uint pushSize;
unsafe { pushSize = (uint)sizeof(Transform); }
var range = new PushConstantRange(ShaderStageFlags.VertexBit, 0, pushSize);
using var withPush = new MeshPipeline(gpu, swapchain.Format, PushShaders.Vertex, MeshShaders.Fragment, pushConstants: [range]);
Console.WriteLine($"Push constants: {pushSize} bytes of {gpu.Vk.GetPhysicalDeviceProperties(gpu.PhysicalDevice).Limits.MaxPushConstantsSize} allowed");

Transform[] objects =
[
    new(new Vector4(1, 0, 0, 1), new Vector2(-0.5f, 0f), 0.4f),    // left, red
    new(new Vector4(0, 1, 0, 1), new Vector2(0f, 0f), 0.4f),       // middle, green
    new(new Vector4(0, 0, 1, 1), new Vector2(0.5f, 0f), 0.4f)      // right, blue
];
// Each triangle's centre is at offset + scale * (0, 1/6) in NDC
var centres = objects.Select(o => ((int)((o.Offset.X + 1) * 400), (int)((o.Scale / 6 + 1) * 300))).ToArray();
string Centres() => string.Join("  ", centres.Select(c => readback.Pixel(c.Item1, c.Item2)));

// 1. The tempting way: rewrite the uniform buffer before each draw
TestFrame.Draw(gpu, swapchain, readback, cmd =>
{
    gpu.Vk.CmdBindPipeline(cmd, PipelineBindPoint.Graphics, withUniform.Handle);
    uniforms.Bind(cmd, withUniform.Layout);
    foreach (var o in objects)
    {
        uniforms.Write(o);                          // runs now, on the CPU...
        triangle.Draw(cmd);                         // ...but this draw runs later, on the GPU
    }
});
Console.WriteLine($"Uniform rewritten per draw: {Centres()}");

// 2. Push constants: each draw's values are recorded with it
TestFrame.Draw(gpu, swapchain, readback, cmd =>
{
    gpu.Vk.CmdBindPipeline(cmd, PipelineBindPoint.Graphics, withPush.Handle);
    foreach (var o in objects)
    {
        var values = o;
        unsafe { gpu.Vk.CmdPushConstants(cmd, withPush.Layout, ShaderStageFlags.VertexBit, 0, pushSize, &values); }
        triangle.Draw(cmd);
    }
});
Console.WriteLine($"Push constants per draw:    {Centres()}");`, output: 'Push constants: 32 bytes of 256 allowed\nUniform rewritten per draw: (0, 0, 0)  (0, 0, 0)  (0, 0, 255)\nPush constants per draw:    (255, 0, 0)  (0, 255, 0)  (0, 0, 255)' },
      { type: 'p', text: 'With the uniform buffer, only the blue triangle on the right appears: all three draws ran with the last values written, so they were drawn on top of each other. With push constants, each triangle is where it should be, in its own colour. A white corner times a tint with one channel at 1 gives that channel at full brightness.' },
      { type: 'h2', text: 'Which one to use' },
      { type: 'table', head: ['Data', 'Changes', 'Best home'], rows: [
        ['Camera matrices, sun direction, time', 'Once per frame', 'A uniform buffer per frame in flight'],
        ['An element’s transform, colour, ID', 'Every draw', 'Push constants (up to 128 bytes to be safe)'],
        ['Thousands of elements’ data at once', 'Every frame, for many draws', 'A storage buffer indexed by draw or instance ID (module 7)']
      ] },
      { type: 'note', kind: 'tip', text: 'Push constants are often the fastest way to get a few bytes to a shader, because many GPUs load them straight into registers. Keep them small and stable in layout; pushing a full 128 bytes per draw for 50,000 draws is still 6 MB of command data per frame.' },
      { type: 'quiz', question: 'Why did all three draws use the last uniform values?', options: ['A driver bug', 'The CPU wrote all three values while recording, before the GPU ran any of the draws, so each draw read the final value', 'Descriptor sets cannot be bound twice', 'Uniform buffers only hold one draw'], answer: 1, explain: 'Draws run after submission. The buffer is read at execution time, by which point the CPU has long finished writing to it.' },
      { type: 'quiz', question: 'How many bytes of push constants can every Vulkan device take?', options: ['16', '64', '128', '65,536'], answer: 2, explain: 'The specification guarantees maxPushConstantsSize ≥ 128. Many desktop GPUs offer 256, as this one does.' },
      { type: 'exercise', task: 'Draw a **10 × 10 grid** of tiny triangles (scale 0.1) with push constants, each tinted by its row and column, in a single command buffer. Then count how many of the 100 triangle centres are covered (not black).', hint: 'Offsets `x = -0.9 + col * 0.2`, `y = -0.9 + row * 0.2`. The centre pixel of each is `((x + 1) * 400, (y + 0.1 / 6 + 1) * 300)`. Tint `(col / 9, row / 9, 1)` keeps every one visible.', solution: cs`
using System.Numerics;
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600) });
window.Initialize();
using var gpu = new GpuContext(window);
using var swapchain = new Swapchain(gpu, window.FramebufferSize);
using var readback = new ReadbackBuffer(gpu, swapchain.Extent);
using var triangle = new Mesh(gpu, [new(0f, -0.5f, 0f, 1f, 1f, 1f), new(0.5f, 0.5f, 0f, 1f, 1f, 1f), new(-0.5f, 0.5f, 0f, 1f, 1f, 1f)], [0, 1, 2]);
uint pushSize;
unsafe { pushSize = (uint)sizeof(Transform); }
using var pipeline = new MeshPipeline(gpu, swapchain.Format, PushShaders.Vertex, MeshShaders.Fragment,
                                      pushConstants: [new PushConstantRange(ShaderStageFlags.VertexBit, 0, pushSize)]);

var grid = new List<Transform>();
for (int row = 0; row < 10; row++)
    for (int col = 0; col < 10; col++)
        grid.Add(new Transform(new Vector4(col / 9f, row / 9f, 1f, 1f), new Vector2(-0.9f + col * 0.2f, -0.9f + row * 0.2f), 0.1f));

TestFrame.Draw(gpu, swapchain, readback, cmd =>
{
    gpu.Vk.CmdBindPipeline(cmd, PipelineBindPoint.Graphics, pipeline.Handle);
    foreach (var t in grid)
    {
        var values = t;
        unsafe { gpu.Vk.CmdPushConstants(cmd, pipeline.Layout, ShaderStageFlags.VertexBit, 0, pushSize, &values); }
        triangle.Draw(cmd);
    }
});
int covered = grid.Count(t => readback.Pixel((int)((t.Offset.X + 1) * 400), (int)((t.Offset.Y + t.Scale / 6 + 1) * 300)) != (0, 0, 0));
Console.WriteLine($"Drew {grid.Count} triangles in one command buffer; centres covered: {covered}");`, output: 'Drew 100 triangles in one command buffer; centres covered: 100' }
    ],
    keyPoints: [
      'Rewriting a uniform buffer between draws fails: draws run later and all read the final value.',
      'Push constants are recorded into the command buffer, so each draw keeps its own values.',
      'Declare them with layout(push_constant) in GLSL and a PushConstantRange in the pipeline layout.',
      'Only 128 bytes are guaranteed; use them for per-draw data such as a transform, colour or ID.',
      'Per-frame data belongs in uniform buffers; large per-object data in storage buffers.'
    ]
  },

  // ------------------------------------------------------------------ 7
  {
    slug: 'memory-allocator',
    title: 'Writing a simple memory allocator',
    summary: 'Allocate one big block of GPU memory and hand out aligned pieces of it to many buffers. Write a first-fit sub-allocator, measure what it saves, and see fragmentation happen.',
    minutes: 20,
    blocks: [
      { type: 'p', text: 'Lesson 2 gave two reasons not to call `AllocateMemory` for every buffer: it is slow, and the number of allocations is limited (4,096 is all the specification promises). A BIM model with tens of thousands of meshes needs another approach. Every serious engine **sub-allocates**: it allocates a few large blocks, say 64 or 256 MiB each, and places many buffers inside each block at different offsets. `BindBufferMemory` takes an offset for exactly this.' },
      { type: 'h2', text: 'The rules of a piece' },
      { type: 'table', head: ['Rule', 'Where it comes from', 'On this GPU'], rows: [
        ['The piece must be at least `Size` bytes', '`GetBufferMemoryRequirements`', 'A 72-byte vertex buffer needs 128'],
        ['Its offset must be a multiple of `Alignment`', 'The same call', '64'],
        ['Its memory type must be allowed', '`MemoryTypeBits`', 'Types 0, 1 and 2'],
        ['Buffers and optimally tiled images must not share a “page”', '`bufferImageGranularity`', '1 byte, so no restriction (other GPUs: up to 64 KiB)']
      ] },
      { type: 'h2', text: 'A first-fit allocator' },
      { type: 'p', text: 'The simplest useful design keeps a list of **free ranges**, sorted by offset. To allocate, take the first range that can hold the size once its start is rounded up to the alignment, and split off what is left. To free, put the range back and merge it with free neighbours, so the block does not crumble into tiny pieces. Try it:' },
      { type: 'widget', name: 'allocator-sim' },
      { type: 'code', title: 'Engine/SubAllocator.cs', code: cs`
using Silk.NET.Vulkan;
using VkBuffer = Silk.NET.Vulkan.Buffer;

/// <summary>A buffer placed inside a SubAllocator's block.</summary>
readonly record struct Suballocation(VkBuffer Buffer, ulong Offset, ulong Size);

/// <summary>One large DeviceMemory block, handed out in aligned pieces. First fit over a sorted list of free ranges.</summary>
sealed unsafe class SubAllocator : IDisposable
{
    readonly GpuContext gpu;
    readonly List<(ulong Offset, ulong Size)> free = [];
    public readonly DeviceMemory Memory;
    public readonly ulong Capacity;
    public readonly uint MemoryType;
    public readonly byte* Mapped;                   // null unless the block is host-visible
    public int Allocations { get; private set; }
    public ulong Used { get; private set; }
    public int FreeRanges => free.Count;
    public ulong LargestFree => free.Count == 0 ? 0 : free.Max(f => f.Size);

    public SubAllocator(GpuContext gpu, ulong capacity, MemoryPropertyFlags properties)
    {
        this.gpu = gpu;
        Capacity = capacity;
        MemoryType = GpuBuffer.FindMemoryType(gpu, ~0u, properties);
        var alloc = new MemoryAllocateInfo { SType = StructureType.MemoryAllocateInfo, AllocationSize = capacity, MemoryTypeIndex = MemoryType };
        DeviceMemory memory;
        gpu.Vk.AllocateMemory(gpu.Device, &alloc, null, &memory).Check("AllocateMemory");
        Memory = memory;
        if ((properties & MemoryPropertyFlags.HostVisibleBit) != 0)
        {
            void* p;
            gpu.Vk.MapMemory(gpu.Device, Memory, 0, Vk.WholeSize, 0, &p).Check("MapMemory");
            Mapped = (byte*)p;
        }
        free.Add((0, capacity));
    }

    /// <summary>Reserves size bytes at an offset that is a multiple of alignment.</summary>
    public ulong Allocate(ulong size, ulong alignment)
    {
        for (int i = 0; i < free.Count; i++)
        {
            var (start, length) = free[i];
            ulong aligned = (start + alignment - 1) / alignment * alignment;      // round the start up
            if (aligned + size > start + length) continue;                        // does not fit here
            free.RemoveAt(i);
            if (aligned + size < start + length) free.Insert(i, (aligned + size, start + length - aligned - size));   // the rest after it
            if (aligned > start) free.Insert(i, (start, aligned - start));                                          // the gap before it
            Allocations++;
            Used += size;
            return aligned;
        }
        throw new OutOfMemoryException($"No free range can hold {size} bytes (largest is {LargestFree})");
    }

    /// <summary>Returns a piece to the free list, merging it with free neighbours.</summary>
    public void Free(ulong offset, ulong size)
    {
        int i = 0;
        while (i < free.Count && free[i].Offset < offset) i++;
        free.Insert(i, (offset, size));
        if (i + 1 < free.Count && offset + size == free[i + 1].Offset)            // merge with the next range
        {
            free[i] = (offset, size + free[i + 1].Size);
            free.RemoveAt(i + 1);
        }
        if (i > 0 && free[i - 1].Offset + free[i - 1].Size == offset)             // merge with the previous range
        {
            free[i - 1] = (free[i - 1].Offset, free[i - 1].Size + free[i].Size);
            free.RemoveAt(i);
        }
        Allocations--;
        Used -= size;
    }

    /// <summary>Creates a buffer and binds it to a piece of this block.</summary>
    public Suballocation CreateBuffer(ulong size, BufferUsageFlags usage)
    {
        var vk = gpu.Vk;
        var info = new BufferCreateInfo { SType = StructureType.BufferCreateInfo, Size = size, Usage = usage, SharingMode = SharingMode.Exclusive };
        VkBuffer buffer;
        vk.CreateBuffer(gpu.Device, &info, null, &buffer).Check("CreateBuffer");
        MemoryRequirements needs;
        vk.GetBufferMemoryRequirements(gpu.Device, buffer, &needs);
        if ((needs.MemoryTypeBits & (1u << (int)MemoryType)) == 0) throw new NotSupportedException("This buffer cannot use the block's memory type");
        ulong offset = Allocate(needs.Size, needs.Alignment);
        vk.BindBufferMemory(gpu.Device, buffer, Memory, offset).Check("BindBufferMemory");
        return new Suballocation(buffer, offset, needs.Size);
    }

    public void DestroyBuffer(Suballocation piece)
    {
        gpu.Vk.DestroyBuffer(gpu.Device, piece.Buffer, null);
        Free(piece.Offset, piece.Size);
    }

    public void Dispose() => gpu.Vk.FreeMemory(gpu.Device, Memory, null);
}` },
      { type: 'p', text: 'The program creates 2,000 small vertex buffers twice, first with an allocation each (`GpuBuffer`), then inside one 1 MiB block. Then it shows **fragmentation**: it fills the block with 1 KiB pieces, frees every other one, and asks for 4 KiB.' },
      { type: 'code', title: 'Allocator.cs', code: cs`
using System.Diagnostics;
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
const int Count = 2000;

// 1. One allocation per buffer
var clock = Stopwatch.StartNew();
var separate = new GpuBuffer[Count];
for (int i = 0; i < Count; i++) separate[i] = new GpuBuffer(gpu, 72, BufferUsageFlags.VertexBufferBit, MemoryPropertyFlags.DeviceLocalBit);
foreach (var b in separate) b.Dispose();
double separateMs = clock.Elapsed.TotalMilliseconds;

// 2. The same buffers, all inside one block
clock.Restart();
using var block = new SubAllocator(gpu, 1 << 20, MemoryPropertyFlags.DeviceLocalBit);
var pieces = new Suballocation[Count];
for (int i = 0; i < Count; i++) pieces[i] = block.CreateBuffer(72, BufferUsageFlags.VertexBufferBit);
Console.WriteLine($"{Count} buffers in one block: {block.Allocations} pieces, {block.Used / 1024} KiB of {block.Capacity / 1024} KiB used");
Console.WriteLine($"First offsets: {string.Join(", ", pieces.Take(4).Select(p => p.Offset))} (each 72-byte buffer takes {pieces[0].Size} bytes)");
foreach (var p in pieces) block.DestroyBuffer(p);
double blockMs = clock.Elapsed.TotalMilliseconds;
Console.WriteLine($"All freed: {block.FreeRanges} free range of {block.LargestFree / 1024} KiB");
Console.WriteLine($"Separate allocations more than 3x slower: {separateMs > 3 * blockMs}");

// 3. Fragmentation
var small = new List<ulong>();
while (block.LargestFree >= 1024) small.Add(block.Allocate(1024, 256));
for (int i = 0; i < small.Count; i += 2) block.Free(small[i], 1024);
Console.WriteLine($"Filled with {small.Count} pieces of 1 KiB, freed every other one: {(block.Capacity - block.Used) / 1024} KiB free in {block.FreeRanges} ranges");
try { block.Allocate(4096, 256); }
catch (OutOfMemoryException e) { Console.WriteLine("A 4 KiB request: " + e.Message); }`, output: '2000 buffers in one block: 2000 pieces, 250 KiB of 1024 KiB used\nFirst offsets: 0, 128, 256, 384 (each 72-byte buffer takes 128 bytes)\nAll freed: 1 free range of 1024 KiB\nSeparate allocations more than 3x slower: True\nFilled with 1024 pieces of 1 KiB, freed every other one: 512 KiB free in 512 ranges\nA 4 KiB request: No free range can hold 4096 bytes (largest is 1024)' },
      { type: 'p', text: 'One block replaced 2,000 allocations, and building and freeing the buffers inside it was several times faster. The offsets also show alignment at work: each 72-byte buffer used a 128-byte piece. Freeing everything merged the pieces back into one range.' },
      { type: 'p', text: 'The last lines show the allocator’s weak spot. Half the block is free, 512 KiB, yet a 4 KiB request fails, because the free memory is scattered in 1 KiB holes. Real allocators fight fragmentation by grouping similar sizes into separate pools, by giving big resources their own blocks, and by moving (defragmenting) live resources when the GPU is idle.' },
      { type: 'note', kind: 'tip', text: 'For production, most C++ engines use AMD’s **Vulkan Memory Allocator** (VMA), which handles memory types, alignment, granularity, pools, defragmentation and memory budgets. .NET bindings for it exist. Writing this small one first means you will understand what VMA does for you.' },
      { type: 'note', kind: 'warn', text: 'Never free a piece the GPU may still be reading: wait until the frames that used it have finished (their fences). Module 5 adds a **deletion queue** that delays frees by a few frames automatically.' },
      { type: 'quiz', question: 'A free range starts at offset 100 and is 200 bytes long. Where does a 64-byte piece with alignment 64 go?', options: ['100', '128', '64', 'It does not fit'], answer: 1, explain: '100 rounded up to a multiple of 64 is 128, and 128 + 64 = 192 is within the range’s end at 300. The 28 bytes from 100 to 128 stay free.' },
      { type: 'quiz', question: 'Why does Free merge a returned piece with its neighbours?', options: ['To zero the memory', 'Without merging, the free list would fill up with small adjacent ranges that could not hold larger requests', 'It is required by Vulkan', 'To release memory to the driver'], answer: 1, explain: 'Two free 1 KiB ranges side by side are really one 2 KiB range. Merging keeps large requests possible.' },
      { type: 'exercise', task: 'Draw the triangle from a vertex buffer that lives inside a **host-visible** `SubAllocator` block: create the buffer with `CreateBuffer`, write the three vertices at `Mapped + Offset`, bind it and draw. Print the piece’s offset and the centre pixel.', hint: 'Create the block with `HostVisibleBit | HostCoherentBit`. Write with `vertices.CopyTo(new Span<Vertex>(block.Mapped + piece.Offset, 3))` inside an `unsafe` block.', solution: cs`
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600) });
window.Initialize();
using var gpu = new GpuContext(window);
using var swapchain = new Swapchain(gpu, window.FramebufferSize);
using var readback = new ReadbackBuffer(gpu, swapchain.Extent);
using var pipeline = new MeshPipeline(gpu, swapchain.Format, MeshShaders.Vertex, MeshShaders.Fragment);
using var block = new SubAllocator(gpu, 1 << 20, MemoryPropertyFlags.HostVisibleBit | MemoryPropertyFlags.HostCoherentBit);

block.Allocate(1000, 1);                            // something already in the block
Vertex[] vertices = [new(0.0f, -0.5f, 0f, 1f, 0f, 0f), new(0.5f, 0.5f, 0f, 0f, 1f, 0f), new(-0.5f, 0.5f, 0f, 0f, 0f, 1f)];
var piece = block.CreateBuffer(72, BufferUsageFlags.VertexBufferBit);
unsafe { vertices.CopyTo(new Span<Vertex>(block.Mapped + piece.Offset, vertices.Length)); }
Console.WriteLine($"Vertex buffer at offset {piece.Offset} of the block (type {block.MemoryType})");

TestFrame.Draw(gpu, swapchain, readback, cmd =>
{
    unsafe
    {
        gpu.Vk.CmdBindPipeline(cmd, PipelineBindPoint.Graphics, pipeline.Handle);
        var vb = piece.Buffer;
        ulong offset = 0;                           // offset inside the buffer, not the block
        gpu.Vk.CmdBindVertexBuffers(cmd, 0, 1, &vb, &offset);
        gpu.Vk.CmdDraw(cmd, 3, 1, 0, 0);
    }
});
Console.WriteLine($"Centre: {readback.Pixel(400, 300)}");
block.DestroyBuffer(piece);`, output: 'Vertex buffer at offset 1024 of the block (type 1)\nCentre: (187, 137, 137)' }
    ],
    keyPoints: [
      'Sub-allocate: a few big DeviceMemory blocks, many buffers bound at different offsets.',
      'Each piece needs the size and alignment from GetBufferMemoryRequirements, and an allowed memory type.',
      'A first-fit allocator over a sorted free list is simple; merging freed neighbours keeps it usable.',
      'Fragmentation can make requests fail even with plenty of free memory in total.',
      'Production engines often use VMA; never free memory the GPU may still be using.'
    ]
  },
];
