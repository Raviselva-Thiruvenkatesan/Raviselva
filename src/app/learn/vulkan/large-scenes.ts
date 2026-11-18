import { Lesson } from '../learn.types';
import { cs } from '../csharp/cs';

/**
 * Vulkan module 7. Every C# sample was run with Silk.NET 2.23 on an Intel Iris Xe (Vulkan 1.4 driver) on Windows 11, with the
 * validation layer on; the outputs are from that machine. Code blocks titled Engine/*.cs extend the engine from modules 2 to 6:
 * each sample uses the latest version of every Engine file shown before it. GPU timings differ on every run and every PC.
 */
export const LARGE_SCENES: Lesson[] = [
  // ------------------------------------------------------------------ 1
  {
    slug: 'gpu-profiling',
    title: 'Measuring the GPU: timestamp queries and statistics',
    summary: 'Time GPU work with timestamp queries instead of CPU stopwatches, count what the pipeline did with pipeline statistics queries, and read both back a frame or two later without stalling. A small profiler for the engine, and the first measurements of a scene with 1,600 columns.',
    minutes: 24,
    blocks: [
      { type: 'p', text: 'This module is about scenes that are too big to draw naively: a BIM model has tens or hundreds of thousands of elements. Every technique in it (culling, instancing, indirect drawing, level of detail) is a bet that something will get faster. Bets need measurements, so the module starts with the tools to measure the GPU.' },
      { type: 'h2', text: 'Why a CPU stopwatch does not work' },
      { type: 'p', text: 'Recording a command buffer does no drawing, and `QueueSubmit` returns as soon as the work is queued. A `Stopwatch` around the recording measures only the CPU’s cost of recording. Waiting for the fence after the submit measures more, but includes the time the work sat in the queue behind other frames, and it destroys the overlap of frames in flight that module 5 set up.' },
      { type: 'widget', name: 'gpu-timeline' },
      { type: 'p', text: 'The GPU has its own clock. A **timestamp query** asks it to write the clock’s value into a query pool when it reaches a point in the command buffer. The difference between two timestamps is the GPU time between them, whatever the CPU was doing meanwhile.' },
      { type: 'h2', text: 'Query pools' },
      { type: 'p', text: 'Queries live in a `QueryPool`, created for one type of query with a fixed number of slots. Three commands use it:' },
      { type: 'table', head: ['Command', 'Does'], rows: [
        ['`CmdResetQueryPool`', 'Marks queries as unwritten. Required before each reuse, and only outside rendering'],
        ['`CmdWriteTimestamp2(stage, pool, i)`', 'Writes the clock into query i when all earlier commands have finished `stage`'],
        ['`CmdBeginQuery` / `CmdEndQuery`', 'Counts what happens between them (pipeline statistics, occlusion)']
      ] },
      { type: 'p', text: 'The values are **ticks**, not nanoseconds. `timestampPeriod` in the device limits says how long a tick is (52.08 ns on this GPU, as module 1 printed), and the queue family’s `timestampValidBits` says how many bits of the counter are real, so the difference must be masked before converting. With `PipelineStageFlags2.AllCommandsBit`, a timestamp is written once **everything** before it has finished, so the time between two of them is exactly what the work between them added to the frame.' },
      { type: 'note', kind: 'info', text: 'GPUs overlap work: the vertices of one draw may run while the pixels of the previous one are shaded. Timestamps at `AllCommandsBit` measure a section from “everything before it done” to “everything in it done”. Sections therefore add up to the frame’s time, but a section can look cheaper than it would be alone, because part of it hid behind the previous one.' },
      { type: 'h2', text: 'Pipeline statistics' },
      { type: 'p', text: 'A **pipeline statistics query** counts events between `CmdBeginQuery` and `CmdEndQuery`. Times change with clocks and temperature; counts do not, which makes them the better tool for checking that an optimisation did what you think. They are an optional device feature, `pipelineStatisticsQuery`, and so are two features the later lessons need. `GpuContext` now enables all of them when the GPU has them, and keeps the limits that timing needs:' },
      { type: 'table', head: ['Feature', 'Version', 'Used for'], rows: [
        ['`pipelineStatisticsQuery`', '1.0', 'This lesson’s counters'],
        ['`multiDrawIndirect`, `drawIndirectFirstInstance`', '1.0', 'Many draws from one buffer, each with its own first instance (lesson 4)'],
        ['`drawIndirectCount`', '1.2', 'A draw count the GPU writes itself (lesson 4)'],
        ['`timelineSemaphore`', '1.2', 'Counting semaphores (lesson 7)']
      ] },
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
    public readonly bool Bindless;                      // descriptor indexing is supported and enabled (module 5)
    public readonly string[] InstanceExtensions;
    public readonly PhysicalDeviceLimits Limits;        // new: timestampPeriod and the other limits of module 1
    public readonly uint TimestampBits;                 // new: valid bits of the graphics queue's timestamps
    public readonly PhysicalDeviceFeatures Features;    // new: the 1.0 features that were enabled
    public readonly bool DrawIndirectCount, TimelineSemaphores;   // new: 1.2 features (lessons 4 and 7)
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
            Limits = props.Limits;
            break;
        }
        if (PhysicalDevice.Handle == 0) throw new NotSupportedException("No GPU can draw to this window");
        uint familyCount = 0;
        Vk.GetPhysicalDeviceQueueFamilyProperties(PhysicalDevice, &familyCount, null);
        var familyProps = new QueueFamilyProperties[familyCount];
        fixed (QueueFamilyProperties* p = familyProps) Vk.GetPhysicalDeviceQueueFamilyProperties(PhysicalDevice, &familyCount, p);
        TimestampBits = familyProps[GraphicsFamily].TimestampValidBits;    // 0 would mean: no timestamps on this queue

        // 4. The logical device: one queue per distinct family, the features below, the swapchain extension
        uint[] families = GraphicsFamily == PresentFamily ? [GraphicsFamily] : [GraphicsFamily, PresentFamily];
        float priority = 1f;
        var queueInfos = stackalloc DeviceQueueCreateInfo[families.Length];
        for (int i = 0; i < families.Length; i++)
            queueInfos[i] = new() { SType = StructureType.DeviceQueueCreateInfo, QueueFamilyIndex = families[i], QueueCount = 1, PQueuePriorities = &priority };
        var supported12 = new PhysicalDeviceVulkan12Features { SType = StructureType.PhysicalDeviceVulkan12Features };
        var supported = new PhysicalDeviceFeatures2 { SType = StructureType.PhysicalDeviceFeatures2, PNext = &supported12 };
        Vk.GetPhysicalDeviceFeatures2(PhysicalDevice, &supported);
        Bindless = supported12.RuntimeDescriptorArray && supported12.DescriptorBindingPartiallyBound &&
                   supported12.ShaderSampledImageArrayNonUniformIndexing && supported12.DescriptorBindingSampledImageUpdateAfterBind;
        DrawIndirectCount = supported12.DrawIndirectCount;
        TimelineSemaphores = supported12.TimelineSemaphore;
        var f12 = new PhysicalDeviceVulkan12Features
        {
            SType = StructureType.PhysicalDeviceVulkan12Features,
            RuntimeDescriptorArray = Bindless, DescriptorBindingPartiallyBound = Bindless,
            ShaderSampledImageArrayNonUniformIndexing = Bindless, DescriptorBindingSampledImageUpdateAfterBind = Bindless,
            DrawIndirectCount = DrawIndirectCount,              // new
            TimelineSemaphore = TimelineSemaphores              // new
        };
        var f13 = new PhysicalDeviceVulkan13Features { SType = StructureType.PhysicalDeviceVulkan13Features, PNext = &f12, DynamicRendering = true, Synchronization2 = true };
        var features = new PhysicalDeviceFeatures2 { SType = StructureType.PhysicalDeviceFeatures2, PNext = &f13 };
        var has = supported.Features;
        features.Features.FillModeNonSolid = has.FillModeNonSolid;
        features.Features.PipelineStatisticsQuery = has.PipelineStatisticsQuery;    // new
        features.Features.MultiDrawIndirect = has.MultiDrawIndirect;                // new
        features.Features.DrawIndirectFirstInstance = has.DrawIndirectFirstInstance; // new
        Features = features.Features;
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
      { type: 'h2', text: 'A profiler for the engine' },
      { type: 'p', text: 'The profiler gives each frame in flight its own two pools, one for timestamps and one for statistics, so a slot’s queries are only reused after `FrameLoop` has waited for that slot’s fence. When `Begin` is called for a slot, the frame that last used it has therefore finished, and its results can be read without waiting: they are two frames old, which is fine for a profiler. A **section** writes a timestamp and starts a statistics query; disposing it ends both. Pipeline statistics queries of the same pool cannot overlap, so sections follow each other rather than nest.' },
      { type: 'code', title: 'Engine/GpuProfiler.cs', code: cs`
using Silk.NET.Vulkan;

/// <summary>One measured part of a frame: its GPU time and six pipeline counters.</summary>
sealed record GpuSection(string Name, double Milliseconds, ulong[] Counters)
{
    public ulong InputVertices => Counters[0];         // vertices read by input assembly (index count)
    public ulong InputPrimitives => Counters[1];       // triangles assembled
    public ulong VertexInvocations => Counters[2];     // vertex shader runs: fewer than the indices, thanks to the vertex cache
    public ulong ClippingInvocations => Counters[3];   // triangles that reached clipping
    public ulong ClippingPrimitives => Counters[4];    // triangles that came out of it (culling of back faces comes later)
    public ulong FragmentInvocations => Counters[5];   // fragment shader runs
}

/// <summary>GPU timestamps and pipeline statistics for each frame in flight, read back when the slot comes round again.</summary>
sealed unsafe class GpuProfiler : IDisposable
{
    public const int MaxSections = 16;
    const QueryPipelineStatisticFlags Counted =       // results come in the order of these bits
        QueryPipelineStatisticFlags.InputAssemblyVerticesBit | QueryPipelineStatisticFlags.InputAssemblyPrimitivesBit |
        QueryPipelineStatisticFlags.VertexShaderInvocationsBit | QueryPipelineStatisticFlags.ClippingInvocationsBit |
        QueryPipelineStatisticFlags.ClippingPrimitivesBit | QueryPipelineStatisticFlags.FragmentShaderInvocationsBit;
    const int CounterCount = 6;

    readonly GpuContext gpu;
    readonly QueryPool[] timestamps, statistics;
    readonly List<string>[] names;
    readonly ulong mask;
    CommandBuffer cmd;
    int slot;

    /// <summary>The sections of the frame read back most recently (two frames ago in a running loop).</summary>
    public GpuSection[] Latest { get; private set; } = [];

    public GpuProfiler(GpuContext gpu, int slots = FrameLoop.FramesInFlight)
    {
        if (gpu.TimestampBits == 0 || !gpu.Features.PipelineStatisticsQuery) throw new NotSupportedException("No timestamps or statistics on this GPU");
        this.gpu = gpu;
        mask = gpu.TimestampBits >= 64 ? ulong.MaxValue : (1UL << (int)gpu.TimestampBits) - 1;
        timestamps = new QueryPool[slots];
        statistics = new QueryPool[slots];
        names = new List<string>[slots];
        for (int i = 0; i < slots; i++)
        {
            timestamps[i] = CreatePool(QueryType.Timestamp, 2 * MaxSections, 0);
            statistics[i] = CreatePool(QueryType.PipelineStatistics, MaxSections, Counted);
            names[i] = [];
        }
    }

    QueryPool CreatePool(QueryType type, int count, QueryPipelineStatisticFlags counted)
    {
        var info = new QueryPoolCreateInfo { SType = StructureType.QueryPoolCreateInfo, QueryType = type, QueryCount = (uint)count, PipelineStatistics = counted };
        QueryPool pool;
        gpu.Vk.CreateQueryPool(gpu.Device, &info, null, &pool).Check("CreateQueryPool");
        return pool;
    }

    /// <summary>Starts a frame's measurements. Call outside rendering, after FrameLoop.Begin has waited for the slot.</summary>
    public void Begin(CommandBuffer cmd, int slot)
    {
        if (names[slot].Count > 0) Latest = Read(slot);        // the last frame in this slot has finished: no waiting
        this.cmd = cmd;
        this.slot = slot;
        names[slot].Clear();
        gpu.Vk.CmdResetQueryPool(cmd, timestamps[slot], 0, 2 * MaxSections);
        gpu.Vk.CmdResetQueryPool(cmd, statistics[slot], 0, MaxSections);
    }

    /// <summary>Measures the commands recorded until the returned scope is disposed.</summary>
    public Scope Section(string name)
    {
        int k = names[slot].Count;
        if (k == MaxSections) throw new InvalidOperationException("Too many sections");
        names[slot].Add(name);
        gpu.Vk.CmdWriteTimestamp2(cmd, PipelineStageFlags2.AllCommandsBit, timestamps[slot], (uint)(2 * k));
        gpu.Vk.CmdBeginQuery(cmd, statistics[slot], (uint)k, QueryControlFlags.None);
        return new Scope(this, k);
    }

    void End(int k)
    {
        gpu.Vk.CmdEndQuery(cmd, statistics[slot], (uint)k);
        gpu.Vk.CmdWriteTimestamp2(cmd, PipelineStageFlags2.AllCommandsBit, timestamps[slot], (uint)(2 * k + 1));
    }

    public readonly struct Scope(GpuProfiler profiler, int k) : IDisposable
    {
        public void Dispose() => profiler.End(k);
    }

    /// <summary>The results of the frame last recorded in this slot. Waits if the GPU has not finished it yet.</summary>
    public GpuSection[] Read(int slot)
    {
        int n = names[slot].Count;
        if (n == 0) return [];
        var ticks = new ulong[2 * n];
        var counts = new ulong[CounterCount * n];
        var flags = QueryResultFlags.Result64Bit | QueryResultFlags.ResultWaitBit;
        fixed (ulong* t = ticks)
            gpu.Vk.GetQueryPoolResults(gpu.Device, timestamps[slot], 0, (uint)(2 * n), (nuint)(ticks.Length * 8), t, 8, flags).Check("GetQueryPoolResults");
        fixed (ulong* c = counts)
            gpu.Vk.GetQueryPoolResults(gpu.Device, statistics[slot], 0, (uint)n, (nuint)(counts.Length * 8), c, CounterCount * 8, flags).Check("GetQueryPoolResults");
        var result = new GpuSection[n];
        for (int k = 0; k < n; k++)
        {
            ulong elapsed = (ticks[2 * k + 1] - ticks[2 * k]) & mask;         // masked: only TimestampBits are real
            result[k] = new GpuSection(names[slot][k], elapsed * gpu.Limits.TimestampPeriod / 1e6, counts[(k * CounterCount)..((k + 1) * CounterCount)]);
        }
        return result;
    }

    public void Dispose()
    {
        foreach (var p in timestamps) gpu.Vk.DestroyQueryPool(gpu.Device, p, null);
        foreach (var p in statistics) gpu.Vk.DestroyQueryPool(gpu.Device, p, null);
    }
}` },
      { type: 'h2', text: 'Measuring 1,600 columns' },
      { type: 'p', text: 'The test scene for this module is a column grid: a 80 m × 80 m slab with 40 × 40 steel columns, 0.4 m square and 3 m tall, every 2 m. It is drawn with the `SceneRenderer` of module 5, one draw per object, in two sections: the slab alone, then the columns. Six frames run; from frame 2 on, `Begin` hands back the results of the frame two before, and after the loop the last frame is read directly.' },
      { type: 'code', title: 'Profile.cs', code: cs`
using System.Numerics;
using Silk.NET.Maths;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
using var loop = new FrameLoop(gpu, window);
using var library = new PipelineLibrary(gpu, loop.Swapchain.Format);
var renderer = new SceneRenderer(gpu, library);
using var profiler = new GpuProfiler(gpu);
var (vertices, indices) = Shapes.Box(new Vector3(-0.5f), new Vector3(0.5f));
using var box = new Mesh<MeshVertex>(gpu, vertices, indices);

var slab = new Scene();
slab.Add("Slab", box, Scene.Place(new(-40f, -40f, -0.3f), new(40f, 40f, 0f)), Material.Opaque("Concrete", new(0.55f, 0.55f, 0.55f, 1f)));
var columns = new Scene();
var steel = Material.Opaque("Steel", new(0.3f, 0.4f, 0.6f, 1f));
for (int x = 0; x < 40; x++)
    for (int y = 0; y < 40; y++)
    {
        var c = new Vector3(x * 2f - 39f, y * 2f - 39f, 0f);
        columns.Add($"C{x}-{y}", box, Scene.Place(c + new Vector3(-0.2f, -0.2f, 0f), c + new Vector3(0.2f, 0.2f, 3f)), steel);
    }

var camera = new OrbitCamera { Yaw = 30f, Pitch = 35f };
float aspect = loop.Swapchain.Extent.Width / (float)loop.Swapchain.Extent.Height;
camera.Frame(new(-40f, -40f, -0.3f), new(40f, 40f, 3f), aspect);
var viewProjection = camera.View * camera.Projection(aspect);

for (int i = 0; i < 6; i++)
{
    if (!loop.Begin(out var frame)) continue;
    profiler.Begin(frame.Cmd, frame.Slot);                  // also reads the results of frame i - 2
    if (profiler.Latest.Length > 0)
        Console.WriteLine($"Frame {i}: frame {i - 2} took {profiler.Latest.Sum(s => s.Milliseconds):F3} ms on the GPU");
    loop.BeginRendering(frame);
    using (profiler.Section("Slab")) renderer.Draw(frame.Cmd, slab.Objects, viewProjection);
    using (profiler.Section("Columns")) renderer.Draw(frame.Cmd, columns.Objects, viewProjection);
    loop.EndRendering(frame);
    loop.End(frame);
}
loop.WaitIdle();

Console.WriteLine($"Last frame ({gpu.TimestampBits}-bit timestamps, {gpu.Limits.TimestampPeriod:F2} ns per tick):");
Console.WriteLine("Section   GPU time   indices  triangles  vertex runs  after clip  fragment runs");
foreach (var s in profiler.Read(5 % FrameLoop.FramesInFlight))
    Console.WriteLine($"{s.Name,-8} {s.Milliseconds,6:F3} ms {s.InputVertices,9:N0} {s.InputPrimitives,10:N0} {s.VertexInvocations,12:N0} {s.ClippingPrimitives,11:N0} {s.FragmentInvocations,14:N0}");`, output: 'Frame 2: frame 0 took 0.609 ms on the GPU\nFrame 3: frame 1 took 3.800 ms on the GPU\nFrame 4: frame 2 took 0.621 ms on the GPU\nFrame 5: frame 3 took 4.340 ms on the GPU\nLast frame (36-bit timestamps, 52.08 ns per tick):\nSection   GPU time   indices  triangles  vertex runs  after clip  fragment runs\nSlab      0.034 ms        36         12           24          12        100,824\nColumns   0.592 ms    57,600     19,200       38,400      19,200        132,924' },
      { type: 'p', text: 'The output above is one run; the times change on every run, the counts do not. The first frames are slow and uneven while the GPU’s clock rises; by the last frame the columns take about 0.6 ms. Reading the counts:' },
      { type: 'ul', items: [
        '**Indices and triangles** are exactly what was submitted: 36 indices and 12 triangles per box, × 1,600 for the columns.',
        '**Vertex runs** are fewer than the indices: 24 per box, one per distinct vertex, because the GPU’s post-transform cache reuses results for repeated indices. Every vertex of every column is transformed, wherever it is.',
        '**After clip** counts triangles that came out of clipping. All of them do here: clipping only cuts triangles that cross the edges of the view volume. Back-face culling comes after this counter, in the rasteriser, so the half of each box that faces away is still counted.',
        '**Fragment runs** are the pixels shaded. The columns shade more pixels than the slab, although they cover less of the window: they are drawn after it and pass the depth test in front of it, so many of their pixels are shaded on top of slab pixels that were already shaded. That waste is called **overdraw**.'
      ] },
      { type: 'note', kind: 'tip', text: 'Statistics answer “did my change do what I meant?” exactly; times answer “was it worth it?”. Before believing a time, run several frames and look at the spread. The first frames after start-up are often slower while the driver and the GPU clocks settle.' },
      { type: 'h2', text: 'Other ways to look inside' },
      { type: 'table', head: ['Tool', 'Shows', 'When'], rows: [
        ['Timestamp queries', 'Time of your own sections, in the running program', 'Always on in development builds; an on-screen overlay'],
        ['Pipeline statistics', 'Exact counts per section', 'Checking an optimisation'],
        ['RenderDoc', 'Every call of one captured frame, with images and buffers', 'Wrong pixels, wrong state'],
        ['Vendor profilers (Nsight, Radeon GPU Profiler, Intel GPA)', 'Hardware counters: occupancy, cache misses, stalls', 'Why a shader or pass is slow']
      ] },
      { type: 'quiz', question: 'A Stopwatch around the code that records and submits a frame shows 0.4 ms. What does that measure?', options: ['The GPU time of the frame', 'The CPU time of recording and submitting; the GPU work happens later', 'The time until the image is on screen', 'The frame time minus vsync'], answer: 1, explain: 'QueueSubmit returns once the work is queued. The GPU may take far longer, and runs while the CPU records the next frame.' },
      { type: 'quiz', question: 'Why does the profiler read a slot’s results in Begin instead of right after End?', options: ['Queries can only be read in Begin', 'Right after End the GPU has not run the frame yet: reading would have to wait for it, removing the overlap of frames in flight', 'Results are only valid once', 'To save memory'], answer: 1, explain: 'When the slot comes round again, FrameLoop has already waited on its fence, so the results are there. They are two frames old, which a profiler does not mind.' },
      { type: 'quiz', question: 'The vertex shader invocation count is lower than the number of indices. Why?', options: ['The validation layer skips some', 'Vertices shared by several triangles are reused from the post-transform cache instead of being shaded again', 'Back faces are removed before the vertex shader', 'Off-screen vertices are skipped'], answer: 1, explain: 'Culling and clipping come after the vertex shader; only the cache saves vertex work. Indexing meshes well (lesson 3 of module 3) keeps that cache effective.' },
      { type: 'exercise', task: 'Draw order matters for pixels. Draw the columns sorted **back to front** (furthest first) and then **front to back**, each in its own section of the same frame, after a pass that only clears depth. Compare the fragment shader invocations. Why do they differ, when the image is the same?', hint: 'Sort with `OrderBy(o => Vector3.DistanceSquared(camera.Eye, o.World.Translation))` and its `OrderByDescending` twin. To give both orders the same starting point, draw each into a fresh depth buffer: run them in two separate frames, each with one section, and compare the two frames’ results.', solution: cs`
using System.Numerics;
using Silk.NET.Maths;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600) });
window.Initialize();
using var gpu = new GpuContext(window);
using var loop = new FrameLoop(gpu, window);
using var library = new PipelineLibrary(gpu, loop.Swapchain.Format);
var renderer = new SceneRenderer(gpu, library);
using var profiler = new GpuProfiler(gpu);
var (vertices, indices) = Shapes.Box(new Vector3(-0.5f), new Vector3(0.5f));
using var box = new Mesh<MeshVertex>(gpu, vertices, indices);
var columns = new Scene();
var steel = Material.Opaque("Steel", new(0.3f, 0.4f, 0.6f, 1f));
for (int x = 0; x < 40; x++)
    for (int y = 0; y < 40; y++)
    {
        var c = new Vector3(x * 2f - 39f, y * 2f - 39f, 0f);
        columns.Add($"C{x}-{y}", box, Scene.Place(c + new Vector3(-0.2f, -0.2f, 0f), c + new Vector3(0.2f, 0.2f, 3f)), steel);
    }
var camera = new OrbitCamera { Yaw = 30f, Pitch = 8f };        // low, so that columns hide each other
float aspect = loop.Swapchain.Extent.Width / (float)loop.Swapchain.Extent.Height;
camera.Frame(new(-40f, -40f, 0f), new(40f, 40f, 3f), aspect);
camera.Distance *= 0.5f;
var viewProjection = camera.View * camera.Projection(aspect);
float Dist(SceneObject o) => Vector3.DistanceSquared(camera.Eye, o.World.Translation);
var orders = new[] { ("Back to front", columns.Objects.OrderByDescending(Dist).ToArray()), ("Front to back", columns.Objects.OrderBy(Dist).ToArray()) };

for (int i = 0; i < orders.Length; i++)
{
    loop.Begin(out var frame);
    profiler.Begin(frame.Cmd, frame.Slot);
    loop.BeginRendering(frame);                                    // clears colour and depth
    using (profiler.Section(orders[i].Item1)) renderer.Draw(frame.Cmd, orders[i].Item2, viewProjection);
    loop.EndRendering(frame);
    loop.End(frame);
}
loop.WaitIdle();
for (int slot = 0; slot < orders.Length; slot++)
    foreach (var s in profiler.Read(slot))
        Console.WriteLine($"{s.Name}: {s.FragmentInvocations:N0} fragment shader runs, {s.ClippingPrimitives:N0} triangles after clipping");`, output: 'Back to front: 472,380 fragment shader runs, 17,029 triangles after clipping\nFront to back: 228,192 fragment shader runs, 17,029 triangles after clipping' },
      { type: 'p', text: 'The triangles are the same; only the shaded pixels differ. Drawn front to back, the nearest columns fill the depth buffer first, and the hidden parts of columns behind them fail the depth test **before** the fragment shader runs (early depth testing, possible because the shader does not write depth). Back to front, every column is shaded and then painted over. Engines often sort opaque objects roughly front to back for this reason, or draw a depth-only **pre-pass** first.' }
    ],
    keyPoints: [
      'CPU timers measure recording and submitting, not GPU work; the GPU has its own clock.',
      'Timestamp queries write that clock at a point in the command buffer; convert ticks with timestampPeriod after masking to timestampValidBits.',
      'With AllCommandsBit, the time between two timestamps is what the work between them added to the frame.',
      'Pipeline statistics queries count vertices, invocations, triangles and fragments exactly: the reliable way to check an optimisation.',
      'Give every frame in flight its own query pools and read them when the slot comes round again, so nothing waits.',
      'Sorting opaque objects front to back lets early depth testing skip hidden pixels.'
    ]
  },

  // ------------------------------------------------------------------ 2
  {
    slug: 'frustum-culling',
    title: 'Frustum culling',
    summary: 'Skip objects the camera cannot see before they reach the GPU. Extract the six planes of the view frustum from the view-projection matrix, test world-space bounding boxes against them, and measure the result on 10,000 columns: the same image from a fraction of the draws.',
    minutes: 22,
    blocks: [
      { type: 'p', text: 'The GPU already throws away triangles outside the view: clipping drops them. But it does so **after** the draw call has been recorded and submitted, and after the vertex shader has run on every vertex. For a building seen from inside, most elements are behind the camera or outside the field of view, and all that work is wasted. **Frustum culling** decides on the CPU, per object, whether it could possibly be visible, and simply does not draw the rest.' },
      { type: 'h2', text: 'The view frustum' },
      { type: 'p', text: 'What a perspective camera sees is a **frustum**, a pyramid with its tip cut off, bounded by six planes: left, right, top, bottom, near and far. A point is visible exactly when it is on the inner side of all six. In clip space the test is simple, because the frustum becomes the box −w ≤ x ≤ w, −w ≤ y ≤ w and 0 ≤ z ≤ w (Vulkan’s depth range). Each of those six inequalities is linear in the point, so each is a plane in world space whose coefficients can be read straight from the view-projection matrix: the method of **Gribb and Hartmann**.' },
      { type: 'p', text: 'With System.Numerics a point is a row vector, clip = (x, y, z, 1) × M, so clip.x is the dot product of the point with the **first column** of M, and so on. “x ≥ −w” becomes “point · (column 4 + column 1) ≥ 0”, a plane with normal and distance taken from that sum. Normalising each plane (dividing by the length of its normal) makes the dot product a true distance in metres, which the sphere test of the exercise needs.' },
      { type: 'code', title: 'Engine/Frustum.cs', code: cs`
using System.Numerics;

/// <summary>A plane: Normal · p + D = 0. Points on the side the normal points to have a positive distance.</summary>
readonly record struct Plane(Vector3 Normal, float D)
{
    public float Distance(Vector3 p) => Vector3.Dot(Normal, p) + D;

    public static Plane Normalised(Vector4 v)
    {
        float length = new Vector3(v.X, v.Y, v.Z).Length();
        return new(new Vector3(v.X, v.Y, v.Z) / length, v.W / length);
    }
}

/// <summary>The six planes around what a camera sees, with normals pointing inwards.</summary>
sealed class Frustum
{
    public static readonly string[] Names = ["left", "right", "top", "bottom", "near", "far"];
    public readonly Plane[] Planes;

    Frustum(Plane[] planes) => Planes = planes;

    /// <summary>Gribb and Hartmann's method, for System.Numerics matrices (clip = point × matrix) and Vulkan depth (0 to w).</summary>
    public static Frustum FromViewProjection(Matrix4x4 m)
    {
        var x = new Vector4(m.M11, m.M21, m.M31, m.M41);       // column 1: point · x = clip.x
        var y = new Vector4(m.M12, m.M22, m.M32, m.M42);
        var z = new Vector4(m.M13, m.M23, m.M33, m.M43);
        var w = new Vector4(m.M14, m.M24, m.M34, m.M44);
        return new([
            Plane.Normalised(w + x), Plane.Normalised(w - x),       // -w <= x <= w
            Plane.Normalised(w + y), Plane.Normalised(w - y),       // -w <= y <= w (Vulkan's y points down: -w is the top)
            Plane.Normalised(z), Plane.Normalised(w - z)            // 0 <= z <= w
        ]);
    }

    /// <summary>False only if the box is certainly outside. Boxes near a corner of the frustum can pass while invisible.</summary>
    public bool Intersects(Bounds box)
    {
        foreach (var p in Planes)
        {
            var furthest = new Vector3(p.Normal.X >= 0 ? box.Max.X : box.Min.X,     // the corner furthest along the normal
                                       p.Normal.Y >= 0 ? box.Max.Y : box.Min.Y,
                                       p.Normal.Z >= 0 ? box.Max.Z : box.Min.Z);
            if (p.Distance(furthest) < 0) return false;                        // even that corner is outside, so all are
        }
        return true;
    }
}` },
      { type: 'h2', text: 'Bounding boxes in world space' },
      { type: 'p', text: 'Testing every triangle would cost more than drawing it, so each object is tested through a simple shape around it: an **axis-aligned bounding box** (AABB). The engine’s meshes are unit boxes stretched by world matrices, but a BIM element can also be rotated, and the box around a rotated box is larger than the box itself. Transforming all eight corners and taking their minimum and maximum works; **Arvo’s method** gets the same answer with less work: the new half-size along each world axis is the sum of the old half-sizes weighted by the absolute values of the matrix’s rotation-and-scale part.' },
      { type: 'code', title: 'Engine/Bounds.cs', code: cs`
using System.Numerics;

/// <summary>An axis-aligned box.</summary>
readonly record struct Bounds(Vector3 Min, Vector3 Max)
{
    /// <summary>The mesh space of the engine's box mesh (Shapes.Box from -0.5 to 0.5).</summary>
    public static readonly Bounds UnitBox = new(new Vector3(-0.5f), new Vector3(0.5f));

    public Vector3 Centre => (Min + Max) / 2f;
    public Vector3 HalfSize => (Max - Min) / 2f;

    /// <summary>The axis-aligned box around this box after a transform (Arvo's method: no corners needed).</summary>
    public Bounds Transform(Matrix4x4 m)
    {
        var centre = Vector3.Transform(Centre, m);
        var h = HalfSize;
        var halfSize = Vector3.Abs(new Vector3(m.M11, m.M12, m.M13)) * h.X     // row 1: where the mesh's x axis goes
                     + Vector3.Abs(new Vector3(m.M21, m.M22, m.M23)) * h.Y
                     + Vector3.Abs(new Vector3(m.M31, m.M32, m.M33)) * h.Z;
        return new(centre - halfSize, centre + halfSize);
    }

    public Bounds Union(Bounds other) => new(Vector3.Min(Min, other.Min), Vector3.Max(Max, other.Max));
}` },
      { type: 'p', text: 'The box test checks, for each plane, only the corner that lies furthest along the plane’s normal. If even that corner is outside, the whole box is outside. The test is **conservative**: it never rejects a visible object, but a box near a corner of the frustum can be outside every plane’s region together without being outside any single plane, and passes. Those few extra draws are harmless; the GPU clips them.' },
      { type: 'widget', name: 'frustum-cull' },
      { type: 'h2', text: 'Culling 10,000 columns' },
      { type: 'p', text: 'The grid now has 100 × 100 columns over 200 m × 200 m, and the camera stands among them at eye level, 25 m from the centre. The program culls once on the CPU, then draws alternate frames with all columns and with only the visible ones, captures one frame of each, and compares the two images pixel by pixel. The world boxes are computed every time here; a real engine caches them and updates only those of objects that move.' },
      { type: 'code', title: 'Culling.cs', code: cs`
using System.Diagnostics;
using System.Numerics;
using Silk.NET.Maths;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
using var loop = new FrameLoop(gpu, window);
using var library = new PipelineLibrary(gpu, loop.Swapchain.Format);
var renderer = new SceneRenderer(gpu, library);
using var profiler = new GpuProfiler(gpu);
var (vertices, indices) = Shapes.Box(new Vector3(-0.5f), new Vector3(0.5f));
using var box = new Mesh<MeshVertex>(gpu, vertices, indices);
using var allImage = new ReadbackBuffer(gpu, loop.Swapchain.Extent);
using var culledImage = new ReadbackBuffer(gpu, loop.Swapchain.Extent);

var scene = new Scene();
var steel = Material.Opaque("Steel", new(0.3f, 0.4f, 0.6f, 1f));
for (int x = 0; x < 100; x++)
    for (int y = 0; y < 100; y++)
    {
        var c = new Vector3(x * 2f - 99f, y * 2f - 99f, 0f);
        scene.Add($"C{x}-{y}", box, Scene.Place(c + new Vector3(-0.2f, -0.2f, 0f), c + new Vector3(0.2f, 0.2f, 3f)), steel);
    }
float aspect = loop.Swapchain.Extent.Width / (float)loop.Swapchain.Extent.Height;
var camera = new OrbitCamera { Yaw = 30f, Pitch = 10f };
camera.Frame(new(-100f, -100f, 0f), new(100f, 100f, 3f), aspect);   // sets near and far for the whole site
camera.Target = new(0f, 0f, 1.5f);
camera.Distance = 25f;                                                 // then stand among the columns
var viewProjection = camera.View * camera.Projection(aspect);

var frustum = Frustum.FromViewProjection(viewProjection);
SceneObject[] visible = [];
var watch = new Stopwatch();
for (int run = 0; run < 2; run++)                                      // the second run is timed: the first includes JIT compilation
{
    watch.Restart();
    visible = scene.Objects.Where(o => frustum.Intersects(Bounds.UnitBox.Transform(o.World))).ToArray();
    watch.Stop();
}
Console.WriteLine($"{scene.Objects.Count:N0} columns, {visible.Length:N0} in the frustum ({100.0 * visible.Length / scene.Objects.Count:F1}%), tested in {watch.Elapsed.TotalMilliseconds:F2} ms");

for (int i = 0; i < 8; i++)                                            // alternate, so that both are measured with a warm GPU
{
    bool cull = i % 2 == 1;
    if (!loop.Begin(out var frame)) continue;
    profiler.Begin(frame.Cmd, frame.Slot);
    loop.BeginRendering(frame);
    using (profiler.Section(cull ? "Culled" : "All")) renderer.Draw(frame.Cmd, cull ? visible : scene.Objects, viewProjection);
    loop.EndRendering(frame);
    loop.End(frame, capture: i == 6 ? allImage : i == 7 ? culledImage : null);
}
loop.WaitIdle();

foreach (var slot in new[] { 0, 1 })
    foreach (var s in profiler.Read(slot))
        Console.WriteLine($"{s.Name,-6} {s.InputPrimitives,7:N0} triangles submitted, {s.VertexInvocations,7:N0} vertex runs, {s.ClippingPrimitives,6:N0} after clipping, {s.Milliseconds:F2} ms");
int differ = 0;
for (int y = 0; y < loop.Swapchain.Extent.Height; y++)
    for (int x = 0; x < loop.Swapchain.Extent.Width; x++)
        if (allImage.Pixel(x, y) != culledImage.Pixel(x, y)) differ++;
Console.WriteLine($"Pixels that differ between the two images: {differ}");`, output: '10,000 columns, 2,434 in the frustum (24.3%), tested in 6.22 ms\nAll    120,000 triangles submitted, 240,000 vertex runs, 29,083 after clipping, 4.68 ms\nCulled  29,208 triangles submitted,  58,416 vertex runs, 29,083 after clipping, 0.45 ms\nPixels that differ between the two images: 0' },
      { type: 'p', text: 'The images are identical: culling only removed work that could not affect a pixel. The “after clipping” counts are the same too, which proves it from the GPU’s side: the triangles the culled frame no longer submits were all thrown away by clipping anyway, after their vertices had been shaded. On the GPU, the frame went from about 4.7 ms to under 0.5 ms.' },
      { type: 'note', kind: 'warn', text: 'The CPU test took about 6 ms here: as long as the GPU time it saved. That is a Debug build (`dotnet run` builds Debug by default) running LINQ over 10,000 objects and recomputing every world box. A Release build, cached boxes and the hierarchies below cut it by an order of magnitude, and lesson 4 moves it to the GPU. Measure both sides before calling an optimisation a win.' },
      { type: 'h2', text: 'Beyond one test per object' },
      { type: 'ul', items: [
        '**Hierarchies.** Testing 100,000 objects one by one still costs. Group them (per storey, per grid cell, or in a bounding volume hierarchy), test the group’s box first, and skip or accept all its members at once: a group fully inside needs no further tests.',
        '**Temporal coherence.** Remember which plane rejected an object last frame and test that plane first next frame; the camera moves little between frames.',
        '**On the GPU.** Lesson 4 moves exactly this test into a compute shader, so that the CPU does not touch objects at all.',
        '**Occlusion culling.** A column behind a wall is inside the frustum but still invisible. Skipping those needs depth information (hardware occlusion queries or a depth pyramid), beyond this module.'
      ] },
      { type: 'quiz', question: 'Why are the planes taken from the view-projection matrix rather than built from the camera’s position, direction and field of view?', options: ['It is the only correct method', 'One small function then works for any projection (perspective or orthographic, any near and far) and always matches what the GPU clips', 'It is faster to draw', 'Vulkan requires it'], answer: 1, explain: 'Building planes from angles works too, but must be kept in step with the projection by hand. The matrix is what the GPU uses, so planes from it agree with clipping by construction.' },
      { type: 'quiz', question: 'For a plane with normal (0.6, −0.8, 0), which corner of the box from (0, 0, 0) to (2, 2, 2) does the test check?', options: ['(0, 0, 0)', '(2, 0, 2)', '(2, 2, 2)', '(0, 2, 0)'], answer: 1, explain: 'Per axis, the maximum where the normal is positive or zero and the minimum where it is negative: x 2, y 0, z 2 (zero counts as positive). If that corner is behind the plane, every corner is.' },
      { type: 'quiz', question: 'The culled frame shows exactly the same pixels as the full one. What would it mean if a few pixels differed?', options: ['Nothing: culling always changes a few pixels', 'The test rejected something visible: a bug, such as a wrong bounding box or a plane pointing the wrong way', 'The GPU was too hot', 'The depth buffer was not cleared'], answer: 1, explain: 'A conservative test may keep invisible objects but must never drop visible ones. Comparing images, as the sample does, is a simple regression test for a culling system.' },
      { type: 'exercise', task: 'Implement the cheaper **bounding sphere** test: the sphere around a world box has the box’s centre and a radius equal to the length of its half-size; it is outside if its centre is more than one radius behind any plane. Count the visible columns with the sphere test and with the box test for the same camera. Which keeps more, and why?', hint: '`var b = Bounds.UnitBox.Transform(o.World);` then `frustum.Planes.All(p => p.Distance(b.Centre) >= -b.HalfSize.Length())`. The planes must be normalised for the distance to be in metres, which `Plane.Normalised` did.', solution: cs`
using System.Numerics;

var scene = new List<Matrix4x4>();
for (int x = 0; x < 100; x++)
    for (int y = 0; y < 100; y++)
    {
        var c = new Vector3(x * 2f - 99f, y * 2f - 99f, 0f);
        scene.Add(Scene.Place(c + new Vector3(-0.2f, -0.2f, 0f), c + new Vector3(0.2f, 0.2f, 3f)));
    }
var camera = new OrbitCamera { Yaw = 30f, Pitch = 10f };
camera.Frame(new(-100f, -100f, 0f), new(100f, 100f, 3f), 800f / 600f);
camera.Target = new(0f, 0f, 1.5f);
camera.Distance = 25f;
var frustum = Frustum.FromViewProjection(camera.View * camera.Projection(800f / 600f));

int boxes = 0, spheres = 0;
foreach (var world in scene)
{
    var b = Bounds.UnitBox.Transform(world);
    if (frustum.Intersects(b)) boxes++;
    float radius = b.HalfSize.Length();
    if (frustum.Planes.All(p => p.Distance(b.Centre) >= -radius)) spheres++;
}
Console.WriteLine($"Box test: {boxes:N0} visible");
Console.WriteLine($"Sphere test: {spheres:N0} visible ({spheres - boxes:N0} more)");
Console.WriteLine($"Column box 0.4 x 0.4 x 3 m: sphere radius {new Vector3(0.2f, 0.2f, 1.5f).Length():F2} m");`, output: 'Box test: 2,434 visible\nSphere test: 2,512 visible (78 more)\nColumn box 0.4 x 0.4 x 3 m: sphere radius 1.53 m' },
      { type: 'p', text: 'The sphere keeps more columns. A tall, thin column’s sphere is 1.53 m in radius although the column is only 0.2 m from its axis, so columns well to the side of the view still touch a side plane with their sphere. Spheres are cheaper (one dot product per plane, and they do not change when the object turns), so engines often test the sphere first and the box only for objects that pass.' }
    ],
    keyPoints: [
      'The GPU clips invisible triangles only after the draw is submitted and its vertices are shaded; culling skips the draw altogether.',
      'The six frustum planes come straight from the view-projection matrix (Gribb and Hartmann): sums and differences of its columns.',
      'With System.Numerics (row vectors) use the columns; with Vulkan depth the near plane is z ≥ 0.',
      'Test objects through bounding volumes; transform boxes to world space with Arvo’s method.',
      'The box test checks the corner furthest along each plane’s normal; it is conservative and never drops a visible object.',
      'Comparing images with and without culling is an easy correctness test; statistics show the work saved.'
    ]
  },

  // ------------------------------------------------------------------ 3
  {
    slug: 'instancing',
    title: 'Instancing repeated elements',
    summary: 'Draw thousands of copies of one mesh with a single call: per-instance matrices and colours in a storage buffer, read in the vertex shader through gl_InstanceIndex. Measure what 10,000 draw calls cost the CPU and the GPU compared with one instanced draw.',
    minutes: 22,
    blocks: [
      { type: 'p', text: 'Buildings repeat themselves. A tower has the same window 4,000 times, a car park the same column 600 times, a plant room the same bolt 20,000 times. In an IFC file these are often literally one geometry with many placements (`IfcMappedItem`). Drawing each copy with its own draw call works, as the previous lessons did, but every call has a cost on the CPU (recording, push constants) and on the GPU (each draw starts its own small batch of work).' },
      { type: 'p', text: '**Instancing** draws one mesh many times with **one** call: `CmdDrawIndexed(indexCount, instanceCount, ...)`. The GPU runs the vertex shader for every vertex of every instance, and gives the shader `gl_InstanceIndex`, which copy it is working on. The shader uses that number to fetch the copy’s own data: its world matrix and its colour.' },
      { type: 'h2', text: 'Where the per-instance data lives' },
      { type: 'table', head: ['Method', 'How', 'Good for'], rows: [
        ['Instance-rate vertex attributes', 'A second vertex buffer, binding with `VertexInputRate.Instance`: attributes advance once per instance', 'Fixed, small data; the classic approach'],
        ['Storage buffer + `gl_InstanceIndex`', 'An array of structs in a storage buffer, indexed in the shader', 'Any size or layout; the same buffer can be written by compute shaders (lesson 4)'],
        ['Push constants', '128 to 256 bytes per draw', 'One object per draw: what instancing replaces']
      ] },
      { type: 'p', text: 'The engine uses storage buffers. A **storage buffer** (`DescriptorType.StorageBuffer`) is like the uniform buffers of module 3 but can be very large (at least 128 MB, often the whole of memory), uses the tighter `std430` layout, and can be written by shaders. A struct of a `mat4` and a `vec4` is 80 bytes in `std430`, the same as the C# struct. A small class makes a descriptor set of storage buffers, one per binding:' },
      { type: 'code', title: 'Engine/StorageSet.cs', code: cs`
using Silk.NET.Vulkan;

/// <summary>A descriptor set with one storage buffer per binding (0, 1, ...): large arrays that shaders read and write.</summary>
sealed unsafe class StorageSet : IDisposable
{
    readonly GpuContext gpu;
    readonly DescriptorPool pool;
    public readonly DescriptorSetLayout Layout;
    public readonly DescriptorSet Set;

    public StorageSet(GpuContext gpu, ShaderStageFlags stages, params GpuBuffer[] buffers)
    {
        this.gpu = gpu;
        var vk = gpu.Vk;
        var bindings = stackalloc DescriptorSetLayoutBinding[buffers.Length];
        for (int i = 0; i < buffers.Length; i++)
            bindings[i] = new() { Binding = (uint)i, DescriptorType = DescriptorType.StorageBuffer, DescriptorCount = 1, StageFlags = stages };
        var layoutInfo = new DescriptorSetLayoutCreateInfo { SType = StructureType.DescriptorSetLayoutCreateInfo, BindingCount = (uint)buffers.Length, PBindings = bindings };
        DescriptorSetLayout layout;
        vk.CreateDescriptorSetLayout(gpu.Device, &layoutInfo, null, &layout).Check("CreateDescriptorSetLayout");
        Layout = layout;

        var size = new DescriptorPoolSize(DescriptorType.StorageBuffer, (uint)buffers.Length);
        var poolInfo = new DescriptorPoolCreateInfo { SType = StructureType.DescriptorPoolCreateInfo, MaxSets = 1, PoolSizeCount = 1, PPoolSizes = &size };
        DescriptorPool p;
        vk.CreateDescriptorPool(gpu.Device, &poolInfo, null, &p).Check("CreateDescriptorPool");
        pool = p;
        var allocInfo = new DescriptorSetAllocateInfo { SType = StructureType.DescriptorSetAllocateInfo, DescriptorPool = pool, DescriptorSetCount = 1, PSetLayouts = &layout };
        DescriptorSet set;
        vk.AllocateDescriptorSets(gpu.Device, &allocInfo, &set).Check("AllocateDescriptorSets");
        Set = set;

        var infos = stackalloc DescriptorBufferInfo[buffers.Length];
        var writes = stackalloc WriteDescriptorSet[buffers.Length];
        for (int i = 0; i < buffers.Length; i++)
        {
            infos[i] = new DescriptorBufferInfo(buffers[i].Handle, 0, Vk.WholeSize);
            writes[i] = new() { SType = StructureType.WriteDescriptorSet, DstSet = set, DstBinding = (uint)i, DescriptorCount = 1, DescriptorType = DescriptorType.StorageBuffer, PBufferInfo = &infos[i] };
        }
        vk.UpdateDescriptorSets(gpu.Device, (uint)buffers.Length, writes, 0, null);
    }

    public void Bind(CommandBuffer cmd, PipelineLayout pipelineLayout, PipelineBindPoint bindPoint = PipelineBindPoint.Graphics, uint setNumber = 0)
    {
        var set = Set;
        gpu.Vk.CmdBindDescriptorSets(cmd, bindPoint, pipelineLayout, setNumber, 1, &set, 0, null);
    }

    public void Dispose()
    {
        gpu.Vk.DestroyDescriptorPool(gpu.Device, pool, null);
        gpu.Vk.DestroyDescriptorSetLayout(gpu.Device, Layout, null);
    }
}` },
      { type: 'h2', text: 'The instanced shaders' },
      { type: 'p', text: 'The vertex shader reads its instance with `instances[gl_InstanceIndex]`. The view-projection matrix is the same for every instance, so it is the only push constant. Shading matches the scene shader of module 5, so the two methods can be compared pixel for pixel; the normal goes through the normal matrix of module 6, so rotated and stretched instances stay correct.' },
      { type: 'code', title: 'Engine/InstanceShaders.cs', code: cs`
using System.Numerics;
using System.Runtime.InteropServices;
using Silk.NET.Vulkan;

/// <summary>One copy of a mesh: 80 bytes, the same in C# and in GLSL's std430 layout.</summary>
[StructLayout(LayoutKind.Sequential)]
struct InstanceData(Matrix4x4 world, Vector4 color)
{
    public Matrix4x4 World = world;         // offset 0
    public Vector4 Color = color;           // offset 64
}

/// <summary>The push constant of instanced drawing: what all instances share.</summary>
struct ViewPush(Matrix4x4 viewProjection)
{
    public Matrix4x4 ViewProjection = viewProjection;
    public const uint Size = 64;
    public static readonly PushConstantRange Range = new(ShaderStageFlags.VertexBit, 0, Size);
}

static class InstanceShaders
{
    public const string Vertex = """
        #version 450

        layout(location = 0) in vec3 inPosition;
        layout(location = 1) in vec3 inNormal;
        layout(location = 0) out vec3 vNormal;
        layout(location = 1) out vec4 vColor;

        struct Instance { mat4 world; vec4 color; };
        layout(std430, set = 0, binding = 0) readonly buffer Instances { Instance instances[]; };
        layout(push_constant) uniform Push { mat4 viewProjection; } push;

        void main()
        {
            Instance o = instances[gl_InstanceIndex];          // includes firstInstance
            gl_Position = push.viewProjection * o.world * vec4(inPosition, 1.0);
            vNormal = transpose(inverse(mat3(o.world))) * inNormal;
            vColor = o.color;
        }
        """;

    public const string Fragment = """
        #version 450

        layout(location = 0) in vec3 vNormal;
        layout(location = 1) in vec4 vColor;
        layout(location = 0) out vec4 outColor;

        void main()
        {
            float shade = 0.7 + 0.3 * normalize(vNormal).z;    // as SceneShaders
            outColor = vec4(vColor.rgb * shade, vColor.a);
        }
        """;
}` },
      { type: 'h2', text: 'One draw instead of 10,000' },
      { type: 'p', text: 'The sample draws all 10,000 columns of the previous lesson’s grid from above, first with the module 5 renderer (one draw and one push constant per column), then with one instanced draw. A `Stopwatch` measures the CPU time of recording each command buffer; the profiler measures the GPU.' },
      { type: 'code', title: 'Instancing.cs', code: cs`
using System.Diagnostics;
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
using var profiler = new GpuProfiler(gpu);
var (vertices, indices) = Shapes.Box(new Vector3(-0.5f), new Vector3(0.5f));
using var box = new Mesh<MeshVertex>(gpu, vertices, indices);
using var separateImage = new ReadbackBuffer(gpu, loop.Swapchain.Extent);
using var instancedImage = new ReadbackBuffer(gpu, loop.Swapchain.Extent);

var scene = new Scene();
var data = new List<InstanceData>();
for (int x = 0; x < 100; x++)
    for (int y = 0; y < 100; y++)
    {
        var c = new Vector3(x * 2f - 99f, y * 2f - 99f, 0f);
        var world = Scene.Place(c + new Vector3(-0.2f, -0.2f, 0f), c + new Vector3(0.2f, 0.2f, 3f));
        var color = new Vector4(0.3f + 0.005f * x, 0.4f, 0.6f, 1f);                  // a gradient, to show per-instance data
        scene.Add($"C{x}-{y}", box, world, Material.Opaque($"Steel {x}", color));
        data.Add(new InstanceData(world, color));
    }
using var instanceBuffer = Upload.ToDeviceLocal<InstanceData>(gpu, data.ToArray(), BufferUsageFlags.StorageBufferBit);
using var instanceSet = new StorageSet(gpu, ShaderStageFlags.VertexBit, instanceBuffer);
using var instanced = new MeshPipeline(gpu, loop.Swapchain.Format, InstanceShaders.Vertex, InstanceShaders.Fragment,
    setLayouts: [instanceSet.Layout], pushConstants: [ViewPush.Range], cull: CullModeFlags.BackBit,
    depthFormat: FrameLoop.DepthFormat, vertexLayout: MeshVertex.Layout.Only(0, 1), frontFace: FrontFace.CounterClockwise);

float aspect = loop.Swapchain.Extent.Width / (float)loop.Swapchain.Extent.Height;
var camera = new OrbitCamera { Yaw = 30f, Pitch = 50f };
camera.Frame(new(-100f, -100f, 0f), new(100f, 100f, 3f), aspect);
var viewProjection = camera.View * camera.Projection(aspect);

unsafe void DrawInstanced(CommandBuffer cmd)
{
    gpu.Vk.CmdBindPipeline(cmd, PipelineBindPoint.Graphics, instanced.Handle);
    instanceSet.Bind(cmd, instanced.Layout);
    var push = new ViewPush(viewProjection);
    gpu.Vk.CmdPushConstants(cmd, instanced.Layout, ShaderStageFlags.VertexBit, 0, ViewPush.Size, &push);
    box.Bind(cmd);
    box.DrawBound(cmd, instances: (uint)data.Count);                   // 10,000 copies, one call
}

var watch = new Stopwatch();
double[] cpu = new double[2];
for (int i = 0; i < 8; i++)
{
    bool instancing = i % 2 == 1;
    if (!loop.Begin(out var frame)) continue;
    profiler.Begin(frame.Cmd, frame.Slot);
    loop.BeginRendering(frame);
    watch.Restart();
    using (profiler.Section(instancing ? "Instanced" : "Separate"))
    {
        if (instancing) DrawInstanced(frame.Cmd);
        else renderer.Draw(frame.Cmd, scene.Objects, viewProjection);
    }
    cpu[i % 2] = watch.Elapsed.TotalMilliseconds;
    loop.EndRendering(frame);
    loop.End(frame, capture: i == 6 ? separateImage : i == 7 ? instancedImage : null);
}
loop.WaitIdle();

foreach (var slot in new[] { 0, 1 })
    foreach (var s in profiler.Read(slot))
        Console.WriteLine($"{s.Name,-9}: {(slot == 0 ? "10,000 draws" : "1 draw"),-12} recorded in {cpu[slot],6:F2} ms, GPU {s.Milliseconds:F2} ms, {s.InputPrimitives:N0} triangles, {s.FragmentInvocations:N0} fragment runs");
int differ = 0;
for (int y = 0; y < loop.Swapchain.Extent.Height; y++)
    for (int x = 0; x < loop.Swapchain.Extent.Width; x++)
        if (separateImage.Pixel(x, y) != instancedImage.Pixel(x, y)) differ++;
Console.WriteLine($"Pixels that differ: {differ} of {loop.Swapchain.Extent.Width * loop.Swapchain.Extent.Height:N0}");`, output: 'Separate : 10,000 draws recorded in  64.29 ms, GPU 7.42 ms, 120,000 triangles, 150,076 fragment runs\nInstanced: 1 draw       recorded in   0.09 ms, GPU 0.59 ms, 120,000 triangles, 150,072 fragment runs\nPixels that differ: 0 of 480,000' },
      { type: 'p', text: 'Same triangles, same image, but the CPU went from recording 10,000 draws (with 10,000 pipeline-state checks, push constants and mesh binds in the renderer) to recording a handful of commands, and the GPU time fell by more than ten times: it no longer starts 10,000 separate small draws. The images match exactly. The fragment counts differ by four: the separate draws multiply world × view-projection on the CPU, the instanced shader multiplies per vertex on the GPU, and the last bits of rounding moved a triangle edge across a pixel centre in a place a nearer column covers anyway.' },
      { type: 'note', kind: 'info', text: 'The 64 ms for recording 10,000 draws is inflated: the validation layer checks every command as it is recorded. Without it, recording is several times faster, but still thousands of times slower than one instanced draw. Profile CPU costs with validation off.' },
      { type: 'widget', name: 'instancing-cost' },
      { type: 'h2', text: 'When instancing is not enough' },
      { type: 'ul', items: [
        '**Different meshes.** Instancing repeats one mesh. A model has thousands of different ones; lesson 4 draws many meshes from one buffer with **indirect** draws.',
        '**Culling instances.** One call draws all its instances. To skip invisible ones, rebuild the instance list each frame (CPU culling, then upload) or let a compute shader do it (lesson 4).',
        '**Selection and colour changes.** Changing one window’s colour means writing 16 bytes into the instance buffer, not changing a material: keep per-instance state in that buffer.'
      ] },
      { type: 'quiz', question: 'What does gl_InstanceIndex hold for the third copy in CmdDrawIndexed(36, 100, 0, 0, firstInstance: 500)?', options: ['2', '502', '3', '500'], answer: 1, explain: 'In Vulkan gl_InstanceIndex includes firstInstance, so the copies are numbered 500 to 599. (In OpenGL’s gl_InstanceID it did not.) That makes firstInstance a way to point a draw at a range of the instance buffer.' },
      { type: 'quiz', question: 'A struct holds a mat4 and a vec3 colour. Why is it safer to use a vec4 for the colour in a std430 storage buffer?', options: ['vec3 is not allowed', 'An array element is padded to the struct’s alignment: with a vec3 the struct is still 80 bytes, which a C# struct of 76 bytes would not match', 'vec4 is faster to read', 'Colours need alpha'], answer: 1, explain: 'A struct’s size is rounded up to its largest member’s alignment (16 bytes for mat4 and vec3), so the array stride is 80 either way. Declaring the fourth component explicitly keeps the C# and GLSL layouts obviously identical.' },
      { type: 'exercise', task: 'Draw the grid as two kinds of column with **two** instanced draws from **one** instance buffer: the first 5,000 entries as boxes, the next 5,000 as 16-sided cylinders (`Shapes.Cylinder(16)`, which fills the same unit box). Use `firstInstance` for the second draw. Print the triangles submitted, as counted by the profiler, and check it against 5,000 × 12 + 5,000 × the cylinder’s triangle count.', hint: '`box.DrawBound(cmd, 5000, 0)`, then bind the cylinder and `cylinder.DrawBound(cmd, 5000, 5000)`. A mesh’s triangle count is `IndexCount / 3`.', solution: cs`
using System.Numerics;
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600) });
window.Initialize();
using var gpu = new GpuContext(window);
using var loop = new FrameLoop(gpu, window);
using var profiler = new GpuProfiler(gpu);
var (bv, bi) = Shapes.Box(new Vector3(-0.5f), new Vector3(0.5f));
var (cv, ci) = Shapes.Cylinder(16);
using var box = new Mesh<MeshVertex>(gpu, bv, bi);
using var cylinder = new Mesh<MeshVertex>(gpu, cv, ci);
var data = new List<InstanceData>();
for (int x = 0; x < 100; x++)
    for (int y = 0; y < 100; y++)
    {
        var c = new Vector3(x * 2f - 99f, y * 2f - 99f, 0f);
        data.Add(new InstanceData(Scene.Place(c + new Vector3(-0.2f, -0.2f, 0f), c + new Vector3(0.2f, 0.2f, 3f)), new(0.6f, 0.5f, 0.3f, 1f)));
    }
using var buffer = Upload.ToDeviceLocal<InstanceData>(gpu, data.ToArray(), BufferUsageFlags.StorageBufferBit);
using var set = new StorageSet(gpu, ShaderStageFlags.VertexBit, buffer);
using var pipeline = new MeshPipeline(gpu, loop.Swapchain.Format, InstanceShaders.Vertex, InstanceShaders.Fragment,
    setLayouts: [set.Layout], pushConstants: [ViewPush.Range], cull: CullModeFlags.BackBit,
    depthFormat: FrameLoop.DepthFormat, vertexLayout: MeshVertex.Layout.Only(0, 1), frontFace: FrontFace.CounterClockwise);
var camera = new OrbitCamera { Yaw = 30f, Pitch = 50f };
camera.Frame(new(-100f, -100f, 0f), new(100f, 100f, 3f), 800f / 600f);
var push = new ViewPush(camera.View * camera.Projection(800f / 600f));

loop.Begin(out var frame);
profiler.Begin(frame.Cmd, frame.Slot);
loop.BeginRendering(frame);
using (profiler.Section("Two kinds"))
    unsafe
    {
        gpu.Vk.CmdBindPipeline(frame.Cmd, PipelineBindPoint.Graphics, pipeline.Handle);
        set.Bind(frame.Cmd, pipeline.Layout);
        gpu.Vk.CmdPushConstants(frame.Cmd, pipeline.Layout, ShaderStageFlags.VertexBit, 0, ViewPush.Size, &push);
        box.Bind(frame.Cmd);
        box.DrawBound(frame.Cmd, instances: 5000, firstInstance: 0);
        cylinder.Bind(frame.Cmd);
        cylinder.DrawBound(frame.Cmd, instances: 5000, firstInstance: 5000);
    }
loop.EndRendering(frame);
loop.End(frame);
loop.WaitIdle();
var s = profiler.Read(frame.Slot)[0];
Console.WriteLine($"Box: {box.IndexCount / 3} triangles, cylinder: {cylinder.IndexCount / 3} triangles");
Console.WriteLine($"Expected 5,000 x {box.IndexCount / 3} + 5,000 x {cylinder.IndexCount / 3} = {5000 * (box.IndexCount + cylinder.IndexCount) / 3:N0}");
Console.WriteLine($"Counted by the GPU: {s.InputPrimitives:N0} triangles in 2 draws");`, output: 'Box: 12 triangles, cylinder: 64 triangles\nExpected 5,000 x 12 + 5,000 x 64 = 380,000\nCounted by the GPU: 380,000 triangles in 2 draws' }
    ],
    keyPoints: [
      'Instancing draws one mesh many times in one call; the vertex shader tells copies apart with gl_InstanceIndex.',
      'In Vulkan gl_InstanceIndex includes firstInstance, so firstInstance selects a range of the per-instance data.',
      'Storage buffers hold large arrays of per-instance data in the std430 layout; keep C# and GLSL structs identical and 16-byte aligned.',
      'Replacing 10,000 draws with one cuts CPU recording time dramatically and helps the GPU too.',
      'Per-instance state (colour, selection, visibility) belongs in the instance buffer, where changing it is a small write.'
    ]
  },

  // ------------------------------------------------------------------ 4
  {
    slug: 'indirect-drawing',
    title: 'Indirect drawing and GPU-driven culling',
    summary: 'Put draw parameters in a GPU buffer and draw thousands of different meshes with one call: a mesh pool, CmdDrawIndexedIndirect and its 20-byte commands. Then let a compute shader do the frustum culling and write the commands itself, with an atomic counter and CmdDrawIndexedIndirectCount, so the CPU never touches individual objects.',
    minutes: 28,
    blocks: [
      { type: 'p', text: 'Instancing removed draw calls for copies of **one** mesh. A BIM model has thousands of **different** meshes, and lesson 2’s culling changes which ones are drawn every frame. Both problems have the same answer: move the draw parameters out of the command buffer and into a GPU buffer. An **indirect draw** says “draw what this buffer describes”; the buffer can be written by the CPU, or by the GPU itself.' },
      { type: 'h2', text: 'The indirect command' },
      { type: 'p', text: '`CmdDrawIndexedIndirect(buffer, offset, drawCount, stride)` reads `drawCount` structs of this shape and performs each as if `CmdDrawIndexed` had been called with its fields:' },
      { type: 'code', title: 'DrawIndexedIndirectCommand (20 bytes)', code: cs`
struct DrawIndexedIndirectCommand
{
    uint IndexCount;     // indices of the mesh
    uint InstanceCount;  // 1 for a single object, 0 to skip it
    uint FirstIndex;     // where the mesh's indices start in the bound index buffer
    int  VertexOffset;   // added to every index: where its vertices start
    uint FirstInstance;  // gl_InstanceIndex of its first instance: which object it is
}` },
      { type: 'p', text: 'Two device features from lesson 1 come in here: `multiDrawIndirect` allows a `drawCount` above 1, and `drawIndirectFirstInstance` allows a non-zero `FirstInstance` in the buffer. With them, `FirstInstance` becomes an **object ID**: the instanced shaders of lesson 3 read `instances[gl_InstanceIndex]`, so each command finds its own matrix and colour.' },
      { type: 'h2', text: 'All meshes in one buffer' },
      { type: 'p', text: 'One call can only use the vertex and index buffers that are bound. So the meshes go into one shared pair of buffers, a **mesh pool**, and each mesh is remembered by where it starts. Indices stay local to their mesh: `VertexOffset` shifts them, so a pooled mesh’s indices still fit in 16 bits.' },
      { type: 'code', title: 'Engine/MeshPool.cs', code: cs`
/// <summary>Where one mesh lives in a MeshPool's shared buffers: what an indirect command needs.</summary>
readonly record struct MeshRange(uint FirstIndex, uint IndexCount, int VertexOffset);

/// <summary>Collects many meshes into one vertex buffer and one index buffer, so that one call can draw any of them.</summary>
sealed class MeshPool
{
    readonly List<MeshVertex> vertices = [];
    readonly List<uint> indices = [];

    public MeshRange Add(MeshVertex[] meshVertices, uint[] meshIndices)
    {
        var range = new MeshRange((uint)indices.Count, (uint)meshIndices.Length, vertices.Count);
        vertices.AddRange(meshVertices);
        indices.AddRange(meshIndices);                  // local to the mesh: VertexOffset moves them
        return range;
    }

    /// <summary>Uploads everything added so far as one mesh. Bind it once, then draw ranges of it.</summary>
    public Mesh<MeshVertex> Build(GpuContext gpu) => new(gpu, vertices.ToArray(), indices.ToArray());
}` },
      { type: 'p', text: 'The rest of the module needs a test scene with more than one mesh, so the column grid becomes a small helper: square and round columns alternate like a chessboard, and each column gets its instance data and its world bounding box (the cylinder fills the same unit box as the box mesh).' },
      { type: 'code', title: 'Engine/ColumnGrid.cs', code: cs`
using System.Numerics;

/// <summary>The module's test scene: size × size columns, 0.4 m wide and 3 m tall, every 2 m, square and round in a chessboard pattern.</summary>
static class ColumnGrid
{
    public static (InstanceData[] Instances, Bounds[] Bounds, bool[] Round) Build(int size)
    {
        int n = size * size;
        var instances = new InstanceData[n];
        var bounds = new Bounds[n];
        var round = new bool[n];
        for (int x = 0; x < size; x++)
            for (int y = 0; y < size; y++)
            {
                int i = x * size + y;
                var c = new Vector3(x * 2f - (size - 1), y * 2f - (size - 1), 0f);
                var world = Scene.Place(c + new Vector3(-0.2f, -0.2f, 0f), c + new Vector3(0.2f, 0.2f, 3f));
                round[i] = (x + y) % 2 == 1;
                instances[i] = new InstanceData(world, round[i] ? new(0.75f, 0.55f, 0.3f, 1f) : new(0.3f, 0.4f, 0.6f, 1f));
                bounds[i] = Bounds.UnitBox.Transform(world);
            }
        return (instances, bounds, round);
    }

    /// <summary>The site's corners, for OrbitCamera.Frame.</summary>
    public static (Vector3 Min, Vector3 Max) Extent(int size) => (new(-size, -size, 0f), new(size, size, 3f));
}` },
      { type: 'h2', text: 'Indirect drawing from the CPU' },
      { type: 'p', text: 'The first program culls on the CPU as in lesson 2, writes one command per visible column into a host-visible buffer, and draws them all with one `CmdDrawIndexedIndirect`. For comparison, alternate frames record the very same draws as direct `CmdDrawIndexed` calls.' },
      { type: 'code', title: 'Indirect.cs', code: cs`
using System.Diagnostics;
using System.Numerics;
using System.Runtime.InteropServices;
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
using var loop = new FrameLoop(gpu, window);
using var profiler = new GpuProfiler(gpu);
using var directImage = new ReadbackBuffer(gpu, loop.Swapchain.Extent);
using var indirectImage = new ReadbackBuffer(gpu, loop.Swapchain.Extent);

var pool = new MeshPool();
var (bv, bi) = Shapes.Box(new Vector3(-0.5f), new Vector3(0.5f));
var (cv, ci) = Shapes.Cylinder(16);
MeshRange boxRange = pool.Add(bv, bi), cylinderRange = pool.Add(cv, ci);
using var meshes = pool.Build(gpu);
var (instances, bounds, round) = ColumnGrid.Build(100);
using var instanceBuffer = Upload.ToDeviceLocal<InstanceData>(gpu, instances, BufferUsageFlags.StorageBufferBit);
using var instanceSet = new StorageSet(gpu, ShaderStageFlags.VertexBit, instanceBuffer);
using var pipeline = new MeshPipeline(gpu, loop.Swapchain.Format, InstanceShaders.Vertex, InstanceShaders.Fragment,
    setLayouts: [instanceSet.Layout], pushConstants: [ViewPush.Range], cull: CullModeFlags.BackBit,
    depthFormat: FrameLoop.DepthFormat, vertexLayout: MeshVertex.Layout.Only(0, 1), frontFace: FrontFace.CounterClockwise);

float aspect = loop.Swapchain.Extent.Width / (float)loop.Swapchain.Extent.Height;
var camera = new OrbitCamera { Yaw = 30f, Pitch = 10f };
var (siteMin, siteMax) = ColumnGrid.Extent(100);
camera.Frame(siteMin, siteMax, aspect);
camera.Target = new(0f, 0f, 1.5f);
camera.Distance = 25f;
var viewProjection = camera.View * camera.Projection(aspect);
var frustum = Frustum.FromViewProjection(viewProjection);

var commands = new List<DrawIndexedIndirectCommand>();
for (int i = 0; i < instances.Length; i++)
{
    if (!frustum.Intersects(bounds[i])) continue;
    var mesh = round[i] ? cylinderRange : boxRange;
    commands.Add(new DrawIndexedIndirectCommand
    {
        IndexCount = mesh.IndexCount, InstanceCount = 1, FirstIndex = mesh.FirstIndex,
        VertexOffset = mesh.VertexOffset, FirstInstance = (uint)i                    // the object ID
    });
}
uint stride = (uint)Marshal.SizeOf<DrawIndexedIndirectCommand>();
using var indirect = new GpuBuffer(gpu, (ulong)commands.Count * stride, BufferUsageFlags.IndirectBufferBit,
                                   MemoryPropertyFlags.HostVisibleBit | MemoryPropertyFlags.HostCoherentBit);
indirect.Write<DrawIndexedIndirectCommand>(commands.ToArray());
Console.WriteLine($"{instances.Length:N0} columns, {commands.Count:N0} visible, {stride}-byte commands: {commands.Count * stride:N0} bytes");

unsafe void Draw(CommandBuffer cmd, bool useIndirect)
{
    gpu.Vk.CmdBindPipeline(cmd, PipelineBindPoint.Graphics, pipeline.Handle);
    instanceSet.Bind(cmd, pipeline.Layout);
    var push = new ViewPush(viewProjection);
    gpu.Vk.CmdPushConstants(cmd, pipeline.Layout, ShaderStageFlags.VertexBit, 0, ViewPush.Size, &push);
    meshes.Bind(cmd);
    if (useIndirect)
        gpu.Vk.CmdDrawIndexedIndirect(cmd, indirect.Handle, 0, (uint)commands.Count, stride);   // one call
    else
        foreach (var c in commands)
            gpu.Vk.CmdDrawIndexed(cmd, c.IndexCount, c.InstanceCount, c.FirstIndex, c.VertexOffset, c.FirstInstance);
}

var watch = new Stopwatch();
double[] cpu = new double[2];
for (int i = 0; i < 8; i++)
{
    bool useIndirect = i % 2 == 1;
    if (!loop.Begin(out var frame)) continue;
    profiler.Begin(frame.Cmd, frame.Slot);
    loop.BeginRendering(frame);
    watch.Restart();
    using (profiler.Section(useIndirect ? "Indirect" : "Direct")) Draw(frame.Cmd, useIndirect);
    cpu[i % 2] = watch.Elapsed.TotalMilliseconds;
    loop.EndRendering(frame);
    loop.End(frame, capture: i == 6 ? directImage : i == 7 ? indirectImage : null);
}
loop.WaitIdle();
foreach (var slot in new[] { 0, 1 })
    foreach (var s in profiler.Read(slot))
        Console.WriteLine($"{s.Name,-8}: {(slot == 0 ? commands.Count + " calls" : "1 call"),-11} recorded in {cpu[slot],5:F2} ms, GPU {s.Milliseconds:F2} ms, {s.InputPrimitives:N0} triangles");
int differ = 0;
for (int y = 0; y < loop.Swapchain.Extent.Height; y++)
    for (int x = 0; x < loop.Swapchain.Extent.Width; x++)
        if (directImage.Pixel(x, y) != indirectImage.Pixel(x, y)) differ++;
Console.WriteLine($"Pixels that differ: {differ}");`, output: '10,000 columns, 2,434 visible, 20-byte commands: 48,680 bytes\nDirect  : 2434 calls  recorded in  8.30 ms, GPU 0.72 ms, 92,492 triangles\nIndirect: 1 call      recorded in  0.31 ms, GPU 0.74 ms, 92,492 triangles\nPixels that differ: 0' },
      { type: 'p', text: 'One call now draws boxes and cylinders alike, each command naming its mesh range and its object. On the GPU the two are the same work, but recording shrinks to a few commands however many objects there are, and the command buffer no longer depends on the scene: it could be recorded once and reused, with only the buffer changing.' },
      { type: 'h2', text: 'A first compute shader' },
      { type: 'p', text: 'The CPU still visits every object every frame to cull it and write commands. A **compute shader** can do that instead: a program that runs on the GPU outside the graphics pipeline, many copies at once, reading and writing storage buffers. Lesson 6 covers compute shaders in depth; this one needs only the basics:' },
      { type: 'ul', items: [
        '`layout(local_size_x = 64) in;` sets the **workgroup** size: invocations run in groups of 64.',
        '`CmdDispatch(groupsX, 1, 1)` starts that many groups; `gl_GlobalInvocationID.x` numbers the invocations 0, 1, 2, … across all groups. With 10,000 objects and groups of 64 that is 157 groups, and the last 48 invocations check the count and return.',
        'A compute pipeline has one stage and no fixed-function state, so it is much simpler than `MeshPipeline`. It is bound at `PipelineBindPoint.Compute`, with its own descriptor sets and push constants.'
      ] },
      { type: 'code', title: 'Engine/ComputePipeline.cs', code: cs`
using Silk.NET.Core.Native;
using Silk.NET.Shaderc;
using Silk.NET.Vulkan;

/// <summary>A compute shader with its pipeline layout.</summary>
sealed unsafe class ComputePipeline : IDisposable
{
    readonly GpuContext gpu;
    public readonly PipelineLayout Layout;
    public readonly Pipeline Handle;

    public ComputePipeline(GpuContext gpu, string glsl, DescriptorSetLayout[] setLayouts, PushConstantRange[]? pushConstants = null)
    {
        this.gpu = gpu;
        var vk = gpu.Vk;
        var module = Shaders.CreateModule(gpu, Shaders.Compile(glsl, ShaderKind.ComputeShader, "compute.comp"));
        pushConstants ??= [];
        fixed (DescriptorSetLayout* sets = setLayouts)
        fixed (PushConstantRange* ranges = pushConstants)
        {
            var layoutInfo = new PipelineLayoutCreateInfo
            {
                SType = StructureType.PipelineLayoutCreateInfo, SetLayoutCount = (uint)setLayouts.Length, PSetLayouts = sets,
                PushConstantRangeCount = (uint)pushConstants.Length, PPushConstantRanges = ranges
            };
            PipelineLayout layout;
            vk.CreatePipelineLayout(gpu.Device, &layoutInfo, null, &layout).Check("CreatePipelineLayout");
            Layout = layout;
        }
        byte* main = (byte*)SilkMarshal.StringToPtr("main");
        var info = new ComputePipelineCreateInfo
        {
            SType = StructureType.ComputePipelineCreateInfo, Layout = Layout,
            Stage = new() { SType = StructureType.PipelineShaderStageCreateInfo, Stage = ShaderStageFlags.ComputeBit, Module = module, PName = main }
        };
        Pipeline pipeline;
        vk.CreateComputePipelines(gpu.Device, default, 1, &info, null, &pipeline).Check("CreateComputePipelines");
        Handle = pipeline;
        SilkMarshal.Free((nint)main);
        vk.DestroyShaderModule(gpu.Device, module, null);       // the pipeline keeps what it needs
    }

    /// <summary>How many workgroups of groupSize cover count items.</summary>
    public static uint Groups(uint count, uint groupSize) => (count + groupSize - 1) / groupSize;

    public void Dispose()
    {
        gpu.Vk.DestroyPipeline(gpu.Device, Handle, null);
        gpu.Vk.DestroyPipelineLayout(gpu.Device, Layout, null);
    }
}` },
      { type: 'h2', text: 'Culling on the GPU' },
      { type: 'p', text: 'The culling shader is lesson 2’s box test in GLSL, one invocation per object. Each object’s world box and mesh range sit in a storage buffer; the six planes and the object count come as a 100-byte push constant. A visible object needs a slot in the output: `atomicAdd(drawCount, 1)` increments a counter in memory and returns its old value, so every visible object gets a different slot even though thousands run at once. The result is a **compacted** list of commands with no gaps, and the number of commands is in the counter.' },
      { type: 'code', title: 'Engine/CullShaders.cs', code: cs`
using System.Numerics;
using System.Runtime.InteropServices;
using Silk.NET.Vulkan;

/// <summary>What the culling shader knows about an object: 48 bytes, as in GLSL's std430.</summary>
[StructLayout(LayoutKind.Sequential)]
struct DrawObject(Bounds bounds, MeshRange mesh)
{
    public Vector4 Min = new(bounds.Min, 0f);
    public Vector4 Max = new(bounds.Max, 0f);
    public uint IndexCount = mesh.IndexCount;
    public uint FirstIndex = mesh.FirstIndex;
    public int VertexOffset = mesh.VertexOffset;
    public uint Padding = 0;
}

/// <summary>The frustum's planes (xyz normal, w distance) and the number of objects: 100 bytes.</summary>
[StructLayout(LayoutKind.Sequential)]
struct CullPush
{
    public Vector4 Left, Right, Top, Bottom, Near, Far;
    public uint Count;
    public const uint Size = 100;
    public static readonly PushConstantRange Range = new(ShaderStageFlags.ComputeBit, 0, Size);

    public CullPush(Frustum frustum, uint count)
    {
        var p = frustum.Planes.Select(plane => new Vector4(plane.Normal, plane.D)).ToArray();
        (Left, Right, Top, Bottom, Near, Far, Count) = (p[0], p[1], p[2], p[3], p[4], p[5], count);
    }
}

static class CullShaders
{
    public const uint GroupSize = 64;

    public const string Compute = """
        #version 450
        layout(local_size_x = 64) in;

        struct DrawObject { vec4 boundsMin; vec4 boundsMax; uint indexCount; uint firstIndex; int vertexOffset; uint padding; };
        struct Command { uint indexCount; uint instanceCount; uint firstIndex; int vertexOffset; uint firstInstance; };

        layout(std430, set = 0, binding = 0) readonly buffer Objects { DrawObject objects[]; };
        layout(std430, set = 0, binding = 1) writeonly buffer Commands { Command commands[]; };
        layout(std430, set = 0, binding = 2) buffer DrawCount { uint drawCount; };
        layout(push_constant) uniform Push { vec4 planes[6]; uint count; } push;

        void main()
        {
            uint i = gl_GlobalInvocationID.x;
            if (i >= push.count) return;                         // the last group is only partly used
            DrawObject o = objects[i];
            for (int p = 0; p < 6; p++)
            {
                vec3 n = push.planes[p].xyz;
                vec3 furthest = mix(o.boundsMin.xyz, o.boundsMax.xyz, greaterThanEqual(n, vec3(0.0)));
                if (dot(n, furthest) + push.planes[p].w < 0.0) return;     // outside: no command
            }
            uint slot = atomicAdd(drawCount, 1u);                 // a unique slot per visible object
            commands[slot] = Command(o.indexCount, 1u, o.firstIndex, o.vertexOffset, i);
        }
        """;
}` },
      { type: 'p', text: 'Between the compute shader and the draw, the GPU must be told that the draw depends on what the shader wrote: by default, commands may overlap and caches need not agree. That is a **memory barrier**: wait for the compute stage’s storage writes before the stage that reads indirect commands. Lesson 7 explains barriers fully; for now a helper for a buffer-wide barrier is enough:' },
      { type: 'code', title: 'Engine/Barriers.cs', code: cs`
using Silk.NET.Vulkan;

static unsafe class Barriers
{
    /// <summary>A global memory barrier: work in dstStage waits for srcStage, and srcAccess writes become visible to dstAccess.</summary>
    public static void Memory(Vk vk, CommandBuffer cmd, PipelineStageFlags2 srcStage, AccessFlags2 srcAccess,
                              PipelineStageFlags2 dstStage, AccessFlags2 dstAccess)
    {
        var barrier = new MemoryBarrier2
        {
            SType = StructureType.MemoryBarrier2,
            SrcStageMask = srcStage, SrcAccessMask = srcAccess, DstStageMask = dstStage, DstAccessMask = dstAccess
        };
        var dependency = new DependencyInfo { SType = StructureType.DependencyInfo, MemoryBarrierCount = 1, PMemoryBarriers = &barrier };
        vk.CmdPipelineBarrier2(cmd, &dependency);
    }
}` },
      { type: 'p', text: 'Each frame then records: clear the counter, barrier, dispatch the culling shader, barrier, and inside rendering one `CmdDrawIndexedIndirectCount`. That call reads the number of draws from the counter buffer (with `maxDrawCount` as a safety limit), so the CPU never learns, or needs to learn, how many objects are visible. The program compares the result with drawing **all** 10,000 columns, and checks the GPU’s count against lesson 2’s test on the CPU.' },
      { type: 'code', title: 'GpuCulling.cs', code: cs`
using System.Numerics;
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
if (!gpu.DrawIndirectCount) throw new NotSupportedException("drawIndirectCount is needed");
using var loop = new FrameLoop(gpu, window);
using var profiler = new GpuProfiler(gpu);
using var allImage = new ReadbackBuffer(gpu, loop.Swapchain.Extent);
using var culledImage = new ReadbackBuffer(gpu, loop.Swapchain.Extent);

var pool = new MeshPool();
var (bv, bi) = Shapes.Box(new Vector3(-0.5f), new Vector3(0.5f));
var (cv, ci) = Shapes.Cylinder(16);
MeshRange boxRange = pool.Add(bv, bi), cylinderRange = pool.Add(cv, ci);
using var meshes = pool.Build(gpu);
var (instances, bounds, round) = ColumnGrid.Build(100);
uint n = (uint)instances.Length, stride = 20;
var objects = Enumerable.Range(0, (int)n).Select(i => new DrawObject(bounds[i], round[i] ? cylinderRange : boxRange)).ToArray();

// Graphics: instances, as in lesson 3
using var instanceBuffer = Upload.ToDeviceLocal<InstanceData>(gpu, instances, BufferUsageFlags.StorageBufferBit);
using var instanceSet = new StorageSet(gpu, ShaderStageFlags.VertexBit, instanceBuffer);
using var pipeline = new MeshPipeline(gpu, loop.Swapchain.Format, InstanceShaders.Vertex, InstanceShaders.Fragment,
    setLayouts: [instanceSet.Layout], pushConstants: [ViewPush.Range], cull: CullModeFlags.BackBit,
    depthFormat: FrameLoop.DepthFormat, vertexLayout: MeshVertex.Layout.Only(0, 1), frontFace: FrontFace.CounterClockwise);
// Compute: objects in, commands and their count out
using var objectBuffer = Upload.ToDeviceLocal<DrawObject>(gpu, objects, BufferUsageFlags.StorageBufferBit);
using var commandBuffer = new GpuBuffer(gpu, n * stride, BufferUsageFlags.StorageBufferBit | BufferUsageFlags.IndirectBufferBit, MemoryPropertyFlags.DeviceLocalBit);
using var countBuffer = new GpuBuffer(gpu, 4, BufferUsageFlags.StorageBufferBit | BufferUsageFlags.IndirectBufferBit | BufferUsageFlags.TransferDstBit,
                                      MemoryPropertyFlags.HostVisibleBit | MemoryPropertyFlags.HostCoherentBit);
using var cullSet = new StorageSet(gpu, ShaderStageFlags.ComputeBit, objectBuffer, commandBuffer, countBuffer);
using var cull = new ComputePipeline(gpu, CullShaders.Compute, [cullSet.Layout], [CullPush.Range]);
// For comparison: every column, one command each, written by the CPU
var everything = objects.Select((o, i) => new DrawIndexedIndirectCommand { IndexCount = o.IndexCount, InstanceCount = 1, FirstIndex = o.FirstIndex, VertexOffset = o.VertexOffset, FirstInstance = (uint)i }).ToArray();
using var allCommands = new GpuBuffer(gpu, n * stride, BufferUsageFlags.IndirectBufferBit, MemoryPropertyFlags.HostVisibleBit | MemoryPropertyFlags.HostCoherentBit);
allCommands.Write<DrawIndexedIndirectCommand>(everything);

float aspect = loop.Swapchain.Extent.Width / (float)loop.Swapchain.Extent.Height;
var camera = new OrbitCamera { Yaw = 30f, Pitch = 10f };
var (siteMin, siteMax) = ColumnGrid.Extent(100);
camera.Frame(siteMin, siteMax, aspect);
camera.Target = new(0f, 0f, 1.5f);
camera.Distance = 25f;
var viewProjection = camera.View * camera.Projection(aspect);
var frustum = Frustum.FromViewProjection(viewProjection);

unsafe void CullOnGpu(CommandBuffer cmd)
{
    var vk = gpu.Vk;
    // The previous frame may still read the commands and the count: let it finish (a write-after-read hazard)
    Barriers.Memory(vk, cmd, PipelineStageFlags2.DrawIndirectBit, AccessFlags2.None,
                    PipelineStageFlags2.AllTransferBit | PipelineStageFlags2.ComputeShaderBit, AccessFlags2.None);
    vk.CmdFillBuffer(cmd, countBuffer.Handle, 0, 4, 0);                        // drawCount = 0
    Barriers.Memory(vk, cmd, PipelineStageFlags2.AllTransferBit, AccessFlags2.TransferWriteBit,
                    PipelineStageFlags2.ComputeShaderBit, AccessFlags2.ShaderStorageReadBit | AccessFlags2.ShaderStorageWriteBit);
    vk.CmdBindPipeline(cmd, PipelineBindPoint.Compute, cull.Handle);
    cullSet.Bind(cmd, cull.Layout, PipelineBindPoint.Compute);
    var push = new CullPush(frustum, n);
    vk.CmdPushConstants(cmd, cull.Layout, ShaderStageFlags.ComputeBit, 0, CullPush.Size, &push);
    vk.CmdDispatch(cmd, ComputePipeline.Groups(n, CullShaders.GroupSize), 1, 1);
    // The draw reads the commands and the count; the CPU reads the count after the fence
    Barriers.Memory(vk, cmd, PipelineStageFlags2.ComputeShaderBit, AccessFlags2.ShaderStorageWriteBit,
                    PipelineStageFlags2.DrawIndirectBit | PipelineStageFlags2.HostBit, AccessFlags2.IndirectCommandReadBit | AccessFlags2.HostReadBit);
}

unsafe void Draw(CommandBuffer cmd, bool gpuCulled)
{
    var vk = gpu.Vk;
    vk.CmdBindPipeline(cmd, PipelineBindPoint.Graphics, pipeline.Handle);
    instanceSet.Bind(cmd, pipeline.Layout);
    var push = new ViewPush(viewProjection);
    vk.CmdPushConstants(cmd, pipeline.Layout, ShaderStageFlags.VertexBit, 0, ViewPush.Size, &push);
    meshes.Bind(cmd);
    if (gpuCulled) vk.CmdDrawIndexedIndirectCount(cmd, commandBuffer.Handle, 0, countBuffer.Handle, 0, n, stride);
    else vk.CmdDrawIndexedIndirect(cmd, allCommands.Handle, 0, n, stride);
}

for (int i = 0; i < 8; i++)
{
    bool gpuCulled = i % 2 == 1;
    if (!loop.Begin(out var frame)) continue;
    profiler.Begin(frame.Cmd, frame.Slot);
    if (gpuCulled) using (profiler.Section("Cull")) CullOnGpu(frame.Cmd);
    loop.BeginRendering(frame);
    using (profiler.Section(gpuCulled ? "Draw culled" : "Draw all")) Draw(frame.Cmd, gpuCulled);
    loop.EndRendering(frame);
    loop.End(frame, capture: i == 6 ? allImage : i == 7 ? culledImage : null);
}
loop.WaitIdle();

uint gpuCount;
unsafe { gpuCount = *(uint*)countBuffer.Mapped; }
int cpuCount = bounds.Count(b => frustum.Intersects(b));
Console.WriteLine($"Visible: {gpuCount:N0} counted by the compute shader, {cpuCount:N0} by the CPU test of lesson 2");
foreach (var slot in new[] { 0, 1 })
    foreach (var s in profiler.Read(slot))
        Console.WriteLine($"{s.Name,-11}: GPU {s.Milliseconds:F2} ms, {s.InputPrimitives,7:N0} triangles, {s.VertexInvocations,7:N0} vertex runs");
int differ = 0;
for (int y = 0; y < loop.Swapchain.Extent.Height; y++)
    for (int x = 0; x < loop.Swapchain.Extent.Width; x++)
        if (allImage.Pixel(x, y) != culledImage.Pixel(x, y)) differ++;
Console.WriteLine($"Pixels that differ from drawing everything: {differ}");`, output: 'Visible: 2,434 counted by the compute shader, 2,434 by the CPU test of lesson 2\nDraw all   : GPU 1.73 ms, 380,000 triangles, 460,000 vertex runs\nCull       : GPU 0.04 ms,       0 triangles,       0 vertex runs\nDraw culled: GPU 0.69 ms,  92,492 triangles, 111,964 vertex runs\nPixels that differ from drawing everything: 0' },
      { type: 'p', text: 'The compute shader finds exactly the columns the CPU test finds, the image is unchanged, and culling 10,000 objects takes the GPU a few hundredths of a millisecond. The CPU’s work per frame is now constant: a fill, a dispatch, a draw, whatever the size of the model. The order of the commands differs from run to run (whichever invocation reaches the atomic first gets slot 0), which does not matter for opaque objects.' },
      { type: 'widget', name: 'indirect-commands' },
      { type: 'note', kind: 'info', text: 'Without `drawIndirectCount`, the shader can write a command for **every** object, with `InstanceCount` 1 or 0, and the CPU draws all of them with `CmdDrawIndexedIndirect`. Skipped commands cost a little GPU time each, but no CPU time and no read-back.' },
      { type: 'h2', text: 'Where GPU-driven rendering goes next' },
      { type: 'ul', items: [
        '**Occlusion culling on the GPU:** test boxes against a mip pyramid of last frame’s depth (a “Hi-Z” buffer) in the same shader, so columns behind walls are dropped too.',
        '**One command per mesh instead of per object:** count visible objects per mesh, and emit instanced commands, so 4,000 identical windows become one command with `InstanceCount` 4,000.',
        '**Meshlets:** split meshes into clusters of about 64 triangles and cull those, with mesh shaders where available.'
      ] },
      { type: 'quiz', question: 'Why does the culling shader use atomicAdd to choose where to write a command?', options: ['atomicAdd is faster than a normal add', 'Thousands of invocations run at once; the atomic gives each visible object a different slot, producing a list without gaps', 'Indirect buffers can only be written atomically', 'To sort the commands'], answer: 1, explain: 'A plain read-increment-write would let two invocations read the same value and overwrite each other’s command. The atomic makes the three steps indivisible. The slots are not in object order, which is fine.' },
      { type: 'quiz', question: 'What would go wrong without the barrier between CmdDispatch and the indirect draw?', options: ['Nothing; commands run in order', 'The draw could read the commands and count before the compute shader has written them, or read stale cached values', 'The compute shader would not start', 'The validation layer would fix it'], answer: 1, explain: 'Commands in a command buffer start in order but may overlap, and writes sit in caches. The barrier makes the indirect read wait for the compute writes and see them.' },
      { type: 'quiz', question: 'With multiDrawIndirect but without drawIndirectFirstInstance, what breaks in this lesson’s design?', options: ['Nothing', 'Every command’s FirstInstance must be 0, so gl_InstanceIndex can no longer identify the object', 'Only one command can be drawn', 'Cylinders cannot be drawn'], answer: 1, explain: 'The object ID travels in FirstInstance. Without the feature, engines pass it another way, for example gl_DrawID (from shaderDrawParameters) indexing a per-draw table.' },
      { type: 'exercise', task: 'Read back the GPU’s commands after culling and check them: copy the command buffer to a host-visible buffer, sort the commands by `FirstInstance`, and verify that each one’s mesh range matches its column (round columns use the cylinder) and that no column appears twice. Print the first three commands and the result of the checks.', hint: 'Give `commandBuffer` the `TransferSrcBit` usage, then in `Upload.Immediate` record `CmdCopyBuffer` into a host-visible `GpuBuffer` after the dispatch and a barrier from compute writes to transfer reads. Read it with `new ReadOnlySpan<DrawIndexedIndirectCommand>(buffer.Mapped, count)`.', solution: cs`
using System.Numerics;
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600) });
window.Initialize();
using var gpu = new GpuContext(window);
var pool = new MeshPool();
var (bv, bi) = Shapes.Box(new Vector3(-0.5f), new Vector3(0.5f));
var (cv, ci) = Shapes.Cylinder(16);
MeshRange boxRange = pool.Add(bv, bi), cylinderRange = pool.Add(cv, ci);
var (instances, bounds, round) = ColumnGrid.Build(100);
uint n = (uint)instances.Length, stride = 20;
var objects = Enumerable.Range(0, (int)n).Select(i => new DrawObject(bounds[i], round[i] ? cylinderRange : boxRange)).ToArray();
using var objectBuffer = Upload.ToDeviceLocal<DrawObject>(gpu, objects, BufferUsageFlags.StorageBufferBit);
using var commandBuffer = new GpuBuffer(gpu, n * stride, BufferUsageFlags.StorageBufferBit | BufferUsageFlags.TransferSrcBit, MemoryPropertyFlags.DeviceLocalBit);
using var countBuffer = new GpuBuffer(gpu, 4, BufferUsageFlags.StorageBufferBit | BufferUsageFlags.TransferDstBit, MemoryPropertyFlags.HostVisibleBit | MemoryPropertyFlags.HostCoherentBit);
using var readback = new GpuBuffer(gpu, n * stride, BufferUsageFlags.TransferDstBit, MemoryPropertyFlags.HostVisibleBit | MemoryPropertyFlags.HostCoherentBit);
using var set = new StorageSet(gpu, ShaderStageFlags.ComputeBit, objectBuffer, commandBuffer, countBuffer);
using var cull = new ComputePipeline(gpu, CullShaders.Compute, [set.Layout], [CullPush.Range]);
var camera = new OrbitCamera { Yaw = 30f, Pitch = 10f };
var (siteMin, siteMax) = ColumnGrid.Extent(100);
camera.Frame(siteMin, siteMax, 800f / 600f);
camera.Target = new(0f, 0f, 1.5f);
camera.Distance = 25f;
var push = new CullPush(Frustum.FromViewProjection(camera.View * camera.Projection(800f / 600f)), n);

Upload.Immediate(gpu, cmd =>
{
    unsafe
    {
        var vk = gpu.Vk;
        vk.CmdFillBuffer(cmd, countBuffer.Handle, 0, 4, 0);
        Barriers.Memory(vk, cmd, PipelineStageFlags2.AllTransferBit, AccessFlags2.TransferWriteBit, PipelineStageFlags2.ComputeShaderBit, AccessFlags2.ShaderStorageReadBit | AccessFlags2.ShaderStorageWriteBit);
        vk.CmdBindPipeline(cmd, PipelineBindPoint.Compute, cull.Handle);
        set.Bind(cmd, cull.Layout, PipelineBindPoint.Compute);
        var p = push;
        vk.CmdPushConstants(cmd, cull.Layout, ShaderStageFlags.ComputeBit, 0, CullPush.Size, &p);
        vk.CmdDispatch(cmd, ComputePipeline.Groups(n, CullShaders.GroupSize), 1, 1);
        Barriers.Memory(vk, cmd, PipelineStageFlags2.ComputeShaderBit, AccessFlags2.ShaderStorageWriteBit,
                        PipelineStageFlags2.AllTransferBit | PipelineStageFlags2.HostBit, AccessFlags2.TransferReadBit | AccessFlags2.HostReadBit);
        var region = new BufferCopy(0, 0, n * stride);
        vk.CmdCopyBuffer(cmd, commandBuffer.Handle, readback.Handle, 1, &region);
        Barriers.Memory(vk, cmd, PipelineStageFlags2.AllTransferBit, AccessFlags2.TransferWriteBit, PipelineStageFlags2.HostBit, AccessFlags2.HostReadBit);
    }
});

DrawIndexedIndirectCommand[] commands;
unsafe
{
    uint count = *(uint*)countBuffer.Mapped;
    commands = new ReadOnlySpan<DrawIndexedIndirectCommand>(readback.Mapped, (int)count).ToArray();
}
Console.WriteLine($"{commands.Length:N0} commands, in the order the atomic handed out slots (different on every run)");
var sorted = commands.OrderBy(c => c.FirstInstance).ToArray();
foreach (var c in sorted.Take(3))
    Console.WriteLine($"  column {c.FirstInstance}: {c.IndexCount} indices from {c.FirstIndex}, vertex offset {c.VertexOffset}, {(round[c.FirstInstance] ? "round" : "square")}");
bool meshesMatch = sorted.All(c => (round[c.FirstInstance] ? cylinderRange : boxRange) == new MeshRange(c.FirstIndex, c.IndexCount, c.VertexOffset));
bool unique = sorted.Select(c => c.FirstInstance).Distinct().Count() == sorted.Length;
Console.WriteLine($"Every mesh range matches its column: {meshesMatch}; no column twice: {unique}");`, output: '2,434 commands, in the order the atomic handed out slots (different on every run)\n  column 73: 192 indices from 36, vertex offset 24, round\n  column 74: 36 indices from 0, vertex offset 0, square\n  column 75: 192 indices from 36, vertex offset 24, round\nEvery mesh range matches its column: True; no column twice: True' }
    ],
    keyPoints: [
      'An indirect draw takes its parameters from a GPU buffer of 20-byte commands; one call can draw thousands of different meshes.',
      'Indirect drawing of different meshes needs them in shared vertex and index buffers: a mesh pool, addressed by FirstIndex and VertexOffset.',
      'FirstInstance carries an object ID into gl_InstanceIndex (with drawIndirectFirstInstance).',
      'A compute shader can cull and write the commands itself; atomicAdd hands out slots for a compacted list.',
      'CmdDrawIndexedIndirectCount reads the number of draws from a buffer, so the CPU never needs to know it.',
      'Barriers order the work: clear the counter, then compute, then the indirect read; and wait for the previous frame’s reads before overwriting.'
    ]
  },

  // ------------------------------------------------------------------ 5
  {
    slug: 'level-of-detail',
    title: 'Level of detail',
    summary: 'Draw distant objects with simpler meshes. Choose a level per object from its geometric error projected to pixels, so the switch is invisible by construction; measure the triangles saved on the column site; and stop levels flickering at a threshold with hysteresis.',
    minutes: 22,
    blocks: [
      { type: 'p', text: 'After culling, every visible object is still drawn with its full mesh. A round column 80 m away covers a few pixels, yet its 48-sided cylinder sends 192 triangles through the GPU, most of them thinner than a pixel. **Level of detail** (LOD) keeps several versions of a mesh, from fine to coarse, and draws each object with the coarsest version that still looks the same at its distance.' },
      { type: 'note', kind: 'warn', text: 'In BIM, “LOD” usually means **Level of Development** (LOD 100 to 500): how much a model element is designed and specified. That is a property of the model. This lesson’s level of detail is a rendering trick, chosen per frame from the camera’s distance.' },
      { type: 'h2', text: 'Error in pixels' },
      { type: 'p', text: 'A simpler mesh differs from the true shape by some distance, its **geometric error** in metres. On screen that error shrinks with distance. For a perspective camera with vertical field of view θ and a viewport H pixels high, one metre at distance d covers' },
      { type: 'code', title: 'Pixels per metre', code: cs`
pixelsPerMetre = (H / 2) / (d × tan(θ / 2))

H = 600, θ = 45°:   2 m → 362 px/m    10 m → 72 px/m    50 m → 14 px/m` },
      { type: 'p', text: 'A level is good enough when its error × pixels per metre is below a tolerance, typically half a pixel to a pixel: the difference then cannot be seen, so switching levels cannot be seen either. The rule picks, per object and per frame, the coarsest level that passes.' },
      { type: 'p', text: 'For a cylinder the error is exact. A regular polygon with n sides inside a circle of radius r strays furthest from the circle at the middle of each side, by r × (1 − cos(π / n)). The engine’s round columns have r = 0.2 m:' },
      { type: 'table', head: ['Sides', 'Triangles', 'Error', 'Below 1 pixel beyond'], rows: [
        ['48', '192', '0.43 mm', '0.3 m'],
        ['16', '64', '3.8 mm', '2.8 m'],
        ['6', '24', '26.8 mm', '19.4 m']
      ] },
      { type: 'widget', name: 'lod-error' },
      { type: 'code', title: 'Engine/Lod.cs', code: cs`
using System.Numerics;

static class Lod
{
    /// <summary>How many pixels one metre covers at this distance, for a perspective camera.</summary>
    public static float PixelsPerMetre(float distance, float fovYDegrees, float viewportHeight) =>
        viewportHeight / 2f / (distance * MathF.Tan(fovYDegrees * MathF.PI / 360f));

    /// <summary>The distance from the eye to the nearest point of a box: conservative, since the object's error is largest there.</summary>
    public static float Distance(Vector3 eye, Bounds box) => MathF.Max(0.01f, Vector3.Distance(eye, Vector3.Clamp(eye, box.Min, box.Max)));

    /// <summary>The coarsest level whose error (in metres, finest level first) projects to at most the tolerance in pixels.</summary>
    public static int Select(float[] errors, float pixelsPerMetre, float tolerancePixels)
    {
        int level = 0;
        for (int i = 1; i < errors.Length; i++)
            if (errors[i] * pixelsPerMetre <= tolerancePixels) level = i;
        return level;
    }

    /// <summary>How far a regular polygon strays from the circle it is inscribed in.</summary>
    public static float PolygonError(float radius, int sides) => radius * (1f - MathF.Cos(MathF.PI / sides));
}` },
      { type: 'h2', text: 'LOD on the column site' },
      { type: 'p', text: 'The mesh pool now holds a box and three cylinders. The program culls on the CPU and writes one indirect command per visible column, as in lesson 4, once with every round column at 48 sides and once with levels chosen for a tolerance of one pixel; it draws both, counts how many columns use each level, and compares the images.' },
      { type: 'code', title: 'LevelOfDetail.cs', code: cs`
using System.Numerics;
using System.Runtime.InteropServices;
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
using var loop = new FrameLoop(gpu, window);
using var profiler = new GpuProfiler(gpu);
using var fullImage = new ReadbackBuffer(gpu, loop.Swapchain.Extent);
using var lodImage = new ReadbackBuffer(gpu, loop.Swapchain.Extent);

var pool = new MeshPool();
var (bv, bi) = Shapes.Box(new Vector3(-0.5f), new Vector3(0.5f));
var boxRange = pool.Add(bv, bi);
int[] sides = [48, 16, 6];
var levels = sides.Select(s => { var (v, i) = Shapes.Cylinder(s); return pool.Add(v, i); }).ToArray();
float[] errors = sides.Select(s => Lod.PolygonError(0.2f, s)).ToArray();
using var meshes = pool.Build(gpu);
var (instances, bounds, round) = ColumnGrid.Build(100);
using var instanceBuffer = Upload.ToDeviceLocal<InstanceData>(gpu, instances, BufferUsageFlags.StorageBufferBit);
using var instanceSet = new StorageSet(gpu, ShaderStageFlags.VertexBit, instanceBuffer);
using var pipeline = new MeshPipeline(gpu, loop.Swapchain.Format, InstanceShaders.Vertex, InstanceShaders.Fragment,
    setLayouts: [instanceSet.Layout], pushConstants: [ViewPush.Range], cull: CullModeFlags.BackBit,
    depthFormat: FrameLoop.DepthFormat, vertexLayout: MeshVertex.Layout.Only(0, 1), frontFace: FrontFace.CounterClockwise);

var extent = loop.Swapchain.Extent;
float aspect = extent.Width / (float)extent.Height;
var camera = new OrbitCamera { Yaw = 30f, Pitch = 10f };
var (siteMin, siteMax) = ColumnGrid.Extent(100);
camera.Frame(siteMin, siteMax, aspect);
camera.Target = new(0f, 0f, 1.5f);
camera.Distance = 25f;
var viewProjection = camera.View * camera.Projection(aspect);
var frustum = Frustum.FromViewProjection(viewProjection);

DrawIndexedIndirectCommand[] BuildCommands(bool useLod, int[] perLevel)
{
    var list = new List<DrawIndexedIndirectCommand>();
    for (int i = 0; i < instances.Length; i++)
    {
        if (!frustum.Intersects(bounds[i])) continue;
        var mesh = boxRange;                                           // boxes have only one level
        if (round[i])
        {
            int level = useLod ? Lod.Select(errors, Lod.PixelsPerMetre(Lod.Distance(camera.Eye, bounds[i]), camera.FovY, extent.Height), 1f) : 0;
            perLevel[level]++;
            mesh = levels[level];
        }
        list.Add(new() { IndexCount = mesh.IndexCount, InstanceCount = 1, FirstIndex = mesh.FirstIndex, VertexOffset = mesh.VertexOffset, FirstInstance = (uint)i });
    }
    return list.ToArray();
}
int[] fullLevels = new int[3], lodLevels = new int[3];
var fullCommands = BuildCommands(false, fullLevels);
var lodCommands = BuildCommands(true, lodLevels);
uint stride = (uint)Marshal.SizeOf<DrawIndexedIndirectCommand>();
GpuBuffer IndirectBuffer(DrawIndexedIndirectCommand[] commands)
{
    var buffer = new GpuBuffer(gpu, (ulong)commands.Length * stride, BufferUsageFlags.IndirectBufferBit, MemoryPropertyFlags.HostVisibleBit | MemoryPropertyFlags.HostCoherentBit);
    buffer.Write<DrawIndexedIndirectCommand>(commands);
    return buffer;
}
using var fullBuffer = IndirectBuffer(fullCommands);
using var lodBuffer = IndirectBuffer(lodCommands);
Console.WriteLine($"Round columns per level ({string.Join(" / ", sides)} sides): all at full detail {string.Join(" / ", fullLevels)}, with LOD {string.Join(" / ", lodLevels)}");

for (int i = 0; i < 8; i++)
{
    bool useLod = i % 2 == 1;
    if (!loop.Begin(out var frame)) continue;
    profiler.Begin(frame.Cmd, frame.Slot);
    loop.BeginRendering(frame);
    using (profiler.Section(useLod ? "LOD" : "Full"))
        unsafe
        {
            var vk = gpu.Vk;
            vk.CmdBindPipeline(frame.Cmd, PipelineBindPoint.Graphics, pipeline.Handle);
            instanceSet.Bind(frame.Cmd, pipeline.Layout);
            var push = new ViewPush(viewProjection);
            vk.CmdPushConstants(frame.Cmd, pipeline.Layout, ShaderStageFlags.VertexBit, 0, ViewPush.Size, &push);
            meshes.Bind(frame.Cmd);
            var commands = useLod ? lodCommands : fullCommands;
            vk.CmdDrawIndexedIndirect(frame.Cmd, (useLod ? lodBuffer : fullBuffer).Handle, 0, (uint)commands.Length, stride);
        }
    loop.EndRendering(frame);
    loop.End(frame, capture: i == 6 ? fullImage : i == 7 ? lodImage : null);
}
loop.WaitIdle();

foreach (var slot in new[] { 0, 1 })
    foreach (var s in profiler.Read(slot))
        Console.WriteLine($"{s.Name,-4}: {s.InputPrimitives,7:N0} triangles, {s.VertexInvocations,7:N0} vertex runs, {s.FragmentInvocations,7:N0} fragment runs, GPU {s.Milliseconds:F2} ms");
int differ = 0, worst = 0;
for (int y = 0; y < extent.Height; y++)
    for (int x = 0; x < extent.Width; x++)
    {
        var (a, b) = (fullImage.Pixel(x, y), lodImage.Pixel(x, y));
        int d = Math.Max(Math.Abs(a.R - b.R), Math.Max(Math.Abs(a.G - b.G), Math.Abs(a.B - b.B)));
        if (d > 0) differ++;
        worst = Math.Max(worst, d);
    }
Console.WriteLine($"Pixels that differ: {differ} of {extent.Width * extent.Height:N0} ({100.0 * differ / (extent.Width * extent.Height):F2}%), largest difference {worst} of 255");`, output: 'Round columns per level (48 / 16 / 6 sides): all at full detail 1217 / 0 / 0, with LOD 0 / 22 / 1195\nFull: 248,268 triangles, 267,740 vertex runs, 1,057,144 fragment runs, GPU 1.03 ms\nLOD :  44,692 triangles,  64,164 vertex runs, 863,352 fragment runs, GPU 0.53 ms\nPixels that differ: 1976 of 480,000 (0.41%), largest difference 186 of 255' },
      { type: 'p', text: 'Of the 1,217 visible round columns, 1,195 are far enough away for the 6-sided version and none is near enough to need 48 sides, so the triangles fall to under a fifth and the vertex work with them. Even the fragment work fell. GPUs shade pixels in 2 × 2 blocks, so a triangle thinner than a pixel still shades whole blocks, mostly for nothing; fewer, larger triangles waste less.' },
      { type: 'p', text: 'The image is not identical, and should not be: a 6-sided column is a different shape. 0.4% of the pixels changed, all on column edges, where a silhouette moved by less than a pixel and now covers a pixel centre it missed before, or the other way round. Such a pixel switches between column and background, hence the large largest difference. Scattered single pixels on edges are what one pixel of tolerance means; lower the tolerance to make them rarer, raise it to save more.' },
      { type: 'h2', text: 'Popping and hysteresis' },
      { type: 'p', text: 'An object exactly at a threshold distance can switch level every frame as the camera shakes by millimetres, which shows as flicker if the error is near the tolerance. **Hysteresis** gives each switch a margin: change to a coarser level only when the error has fallen well below the tolerance (say 0.75 of it), and back to a finer level only when it rises above the full tolerance. In between, keep the level the object had last frame. Engines with a visible change between levels also **cross-fade** them over a few frames, drawing both with complementary dithering patterns.' },
      { type: 'h2', text: 'Making the levels' },
      { type: 'ul', items: [
        '**Parametric shapes** (columns, pipes, ducts) can be tessellated at any resolution from their parameters, as `Shapes.Cylinder(sides)` does. IFC swept solids and extrusions are of this kind.',
        '**General meshes** are simplified by **edge collapse**: repeatedly merge the two ends of the edge whose removal changes the shape least, measured with **quadric error metrics** (Garland and Heckbert). Libraries such as meshoptimizer do this and report the error, which is what `Lod.Select` needs.',
        '**Dropping parts**: at a distance, an element’s small sub-parts (bolts, handles, mullion caps) can be left out entirely. For BIM this is often the biggest saving.',
        '**Impostors**: the coarsest level of a complex object can be a textured quad facing the camera.'
      ] },
      { type: 'quiz', question: 'A level has an error of 4 mm. With H = 600 pixels and a 45° field of view, beyond what distance is it below one pixel?', options: ['About 0.3 m', 'About 2.9 m', 'About 29 m', 'About 72 m'], answer: 1, explain: 'pixels per metre = 300 / (d × tan 22.5°) = 724 / d. The error is 0.004 × 724 / d pixels, which is 1 at d ≈ 2.9 m.' },
      { type: 'quiz', question: 'Why does the program use the distance to the nearest point of the column’s box rather than to its centre?', options: ['It is faster', 'The error is largest in pixels where the object is nearest the camera; the centre can be much further away for long objects', 'Bounding boxes have no centre', 'To match the frustum test'], answer: 1, explain: 'A 30 m beam seen end-on can have its near end at 1 m while its centre is at 15 m. Measuring at the centre would pick a coarse level that is visibly wrong at the near end.' },
      { type: 'exercise', task: 'Simulate a column 19.4 m from the camera (right at the 6-sided threshold for one pixel) while the camera shakes: distance = 19.4 + 0.02 × sin(frame × 1.7) for 200 frames. Count how often the level changes with plain `Lod.Select`, and with hysteresis: a coarser level only when its error is at most 0.75 pixel, a finer one only when the current level’s error exceeds 1 pixel.', hint: 'Keep the current level between frames. With hysteresis, compute `candidate = Lod.Select(errors, ppm, 0.75f)`; if it is coarser than the current level, switch; else if `errors[current] * ppm > 1f`, switch to `Lod.Select(errors, ppm, 1f)`.', solution: cs`
float[] errors = new[] { 48, 16, 6 }.Select(s => Lod.PolygonError(0.2f, s)).ToArray();
int plainChanges = 0, hysteresisChanges = 0, plain = -1, held = -1;
for (int frame = 0; frame < 200; frame++)
{
    float distance = 19.4f + 0.02f * MathF.Sin(frame * 1.7f);
    float ppm = Lod.PixelsPerMetre(distance, 45f, 600f);

    int level = Lod.Select(errors, ppm, 1f);
    if (plain >= 0 && level != plain) plainChanges++;
    plain = level;

    int next = held;
    if (held < 0) next = Lod.Select(errors, ppm, 1f);
    else if (Lod.Select(errors, ppm, 0.75f) > held) next = Lod.Select(errors, ppm, 0.75f);   // coarser: only with a margin
    else if (errors[held] * ppm > 1f) next = Lod.Select(errors, ppm, 1f);                  // finer: as soon as needed
    if (held >= 0 && next != held) hysteresisChanges++;
    held = next;
}
Console.WriteLine($"6-sided error at 19.4 m: {errors[2] * Lod.PixelsPerMetre(19.4f, 45f, 600f):F3} pixels");
Console.WriteLine($"Level changes in 200 frames: {plainChanges} without hysteresis, {hysteresisChanges} with");
Console.WriteLine($"Level held with hysteresis: {held} ({new[] { 48, 16, 6 }[held]} sides)");`, output: '6-sided error at 19.4 m: 1.000 pixels\nLevel changes in 200 frames: 108 without hysteresis, 0 with\nLevel held with hysteresis: 1 (16 sides)' }
    ],
    keyPoints: [
      'Level of detail draws distant objects with simpler meshes; in BIM, do not confuse it with Level of Development.',
      'Choose levels by geometric error projected to pixels: pixels per metre = (H/2) / (d tan(θ/2)).',
      'Below about one pixel of error a switch cannot be seen; measure distance to the nearest point of the object.',
      'A regular n-gon strays from its circle by r(1 − cos(π/n)), so cylinder levels can be chosen exactly.',
      'Hysteresis stops objects at a threshold from flickering between levels.',
      'Levels come from parametric re-tessellation, edge-collapse simplification, dropping small parts, or impostors.'
    ]
  },

  // ------------------------------------------------------------------ 6
  {
    slug: 'compute-shaders',
    title: 'Compute shaders in depth',
    summary: 'How compute work is organised: invocations, workgroups and subgroups, and the IDs that number them. Share data inside a workgroup with shared memory and barrier(), combine results across the GPU with atomics, and use subgroup operations. One reduction (the bounding box of a million-point scan) written three ways and timed.',
    minutes: 26,
    blocks: [
      { type: 'p', text: 'Lesson 4 used a compute shader as a parallel loop: one invocation per object, each working alone. Many useful jobs are not like that. The bounding box of a laser scan, a histogram of storey heights, the sum of a column of numbers: each needs **all** the inputs combined into a few outputs. Doing that fast means knowing how the GPU groups its invocations, and which of them can talk to each other.' },
      { type: 'h2', text: 'Invocations, workgroups, subgroups' },
      { type: 'table', head: ['Level', 'Size', 'Can share', 'Synchronise with'], rows: [
        ['Invocation', 'One run of `main`', 'Its own registers', '—'],
        ['Subgroup (wave, warp)', '8 to 64 invocations that execute in lockstep on one SIMD unit; 32 on this GPU', 'Values, through subgroup operations such as `subgroupAdd`', 'Nothing needed: they run together'],
        ['Workgroup', '`local_size_x × y × z`, up to `maxComputeWorkGroupInvocations` (1,024 here)', '`shared` variables, up to 32 KB here', '`barrier()`'],
        ['Dispatch', 'All the workgroups of one `CmdDispatch`', 'Storage buffers and images', 'Atomics, or a pipeline barrier before the next command']
      ] },
      { type: 'p', text: 'Workgroups of one dispatch run in **any order**, possibly at the same time, possibly not; one workgroup can never wait for another. Within a workgroup, all invocations exist together and can meet at a `barrier()`. These built-in IDs say where an invocation is:' },
      { type: 'table', head: ['Built-in', 'Meaning', 'For local_size 256, invocation 300'], rows: [
        ['`gl_WorkGroupID`', 'Which workgroup', '(1, 0, 0)'],
        ['`gl_LocalInvocationID`', 'Position inside its workgroup', '(44, 0, 0)'],
        ['`gl_GlobalInvocationID`', 'WorkGroupID × size + LocalInvocationID', '(300, 0, 0)'],
        ['`gl_LocalInvocationIndex`', 'The local ID flattened to one number', '44'],
        ['`gl_SubgroupInvocationID`', 'Lane within its subgroup', '12 (with subgroups of 32)']
      ] },
      { type: 'h2', text: 'Choosing the workgroup size' },
      { type: 'ul', items: [
        'Use a **multiple of the subgroup size**, or lanes sit idle: 64 or 256 are safe choices on every vendor.',
        'Larger groups share more through shared memory, but use more registers and shared memory per group, so fewer groups fit on the GPU at once to hide memory latency.',
        'For 2D work (images), 8 × 8 or 16 × 16 keeps neighbouring pixels in one group.',
        'Measure: the best size depends on the GPU and the shader.'
      ] },
      { type: 'h2', text: 'Shared memory and barrier()' },
      { type: 'p', text: '`shared` variables live in fast on-chip memory, one copy per workgroup. The classic use is a **tree reduction**: each invocation writes its value to `shared`, then in rounds, the first half combines its value with the second half’s, until element 0 holds the result for the whole group. Every round must wait until all invocations have written the previous one: that is `barrier()`, which stops each invocation until every invocation of the workgroup has reached it, and makes their `shared` writes visible to each other.' },
      { type: 'widget', name: 'workgroup-reduce' },
      { type: 'note', kind: 'warn', text: 'Every invocation of the workgroup must reach the same `barrier()`. A barrier inside an `if` that some invocations skip, or after an early `return`, is undefined behaviour: on many GPUs the group hangs. That is why the reduction below lets the extra invocations of the last group take part with a repeated point instead of returning.' },
      { type: 'h2', text: 'Atomics and subgroup operations' },
      { type: 'p', text: '**Atomic** functions (`atomicAdd`, `atomicMin`, `atomicMax`, `atomicExchange`, `atomicCompSwap`, …) read, change and write one value in memory as one indivisible step, so invocations anywhere in the dispatch can combine results in a storage buffer. They work on 32-bit integers (64-bit and float atomics are optional extensions). Each one is a round trip to memory that serialises with every other atomic on the same address, so thousands of them on one counter queue up.' },
      { type: 'p', text: '**Subgroup operations** combine values across the lanes of a subgroup directly in registers: `subgroupAdd`, `subgroupMin`, `subgroupMax`, `subgroupBallot`, and `subgroupElect`, which is true in exactly one active lane. They need no shared memory and no barrier, and are typically the fastest way to combine values. Which operations exist is reported in `PhysicalDeviceVulkan11Properties`.' },
      { type: 'h2', text: 'One reduction, three ways' },
      { type: 'p', text: 'The input is a laser scan of a site: 1,048,576 points in whole millimetres (integers, so that atomics can combine them exactly). The task is the scan’s bounding box. All three shaders end with atomics into the same six integers; they differ in how much they combine before that:' },
      { type: 'ul', items: [
        '**Global atomics:** every invocation does six atomics on global memory: 6.3 million on six addresses.',
        '**Shared memory:** each workgroup of 256 reduces its points in shared memory, then one invocation does six atomics: 24,576 in all.',
        '**Subgroups:** each subgroup reduces with `subgroupMin` and `subgroupMax`, then the elected lane does six atomics.'
      ] },
      { type: 'code', title: 'Reduction.cs', code: cs`
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
using var profiler = new GpuProfiler(gpu);

var p11 = new PhysicalDeviceVulkan11Properties { SType = StructureType.PhysicalDeviceVulkan11Properties };
var props = new PhysicalDeviceProperties2 { SType = StructureType.PhysicalDeviceProperties2 };
unsafe { props.PNext = &p11; gpu.Vk.GetPhysicalDeviceProperties2(gpu.PhysicalDevice, &props); }
bool arithmetic = (p11.SubgroupSupportedOperations & SubgroupFeatureFlags.ArithmeticBit) != 0;
Console.WriteLine($"Subgroup size {p11.SubgroupSize}, arithmetic subgroup operations: {arithmetic}");
Console.WriteLine($"Workgroups: up to {gpu.Limits.MaxComputeWorkGroupInvocations} invocations, {gpu.Limits.MaxComputeSharedMemorySize:N0} bytes of shared memory");

// A scan of a 120 m x 80 m site, 45 m high, in millimetres
const int Count = 1 << 20;
var random = new Random(7);
var points = new int[Count * 4];
for (int i = 0; i < Count; i++)
{
    points[4 * i] = random.Next(-60_000, 60_001);
    points[4 * i + 1] = random.Next(-40_000, 40_001);
    points[4 * i + 2] = random.Next(0, 45_001);
}
int[] expected = new int[6];
for (int axis = 0; axis < 3; axis++)
{
    expected[axis] = Enumerable.Range(0, Count).Min(i => points[4 * i + axis]);
    expected[axis + 3] = Enumerable.Range(0, Count).Max(i => points[4 * i + axis]);
}
Console.WriteLine($"{Count:N0} points; CPU: min ({expected[0]}, {expected[1]}, {expected[2]}) max ({expected[3]}, {expected[4]}, {expected[5]}) mm");

const string Common = """
    #version 450
    #extension GL_KHR_shader_subgroup_basic : require
    #extension GL_KHR_shader_subgroup_arithmetic : require
    layout(local_size_x = 256) in;
    layout(std430, set = 0, binding = 0) readonly buffer Points { ivec4 points[]; };
    layout(std430, set = 0, binding = 1) buffer Result { int bounds[6]; };      // min x, y, z, max x, y, z
    layout(push_constant) uniform Push { uint count; } push;

    void store(ivec3 lo, ivec3 hi)
    {
        atomicMin(bounds[0], lo.x); atomicMin(bounds[1], lo.y); atomicMin(bounds[2], lo.z);
        atomicMax(bounds[3], hi.x); atomicMax(bounds[4], hi.y); atomicMax(bounds[5], hi.z);
    }

    """;
var variants = new (string Name, string Glsl)[]
{
    ("Global atomics", Common + """
        void main()
        {
            uint i = gl_GlobalInvocationID.x;
            if (i >= push.count) return;
            ivec3 p = points[i].xyz;
            store(p, p);                                       // six atomics per point
        }
        """),
    ("Shared memory", Common + """
        shared ivec3 lo[256];
        shared ivec3 hi[256];

        void main()
        {
            uint l = gl_LocalInvocationIndex;
            ivec3 p = points[min(gl_GlobalInvocationID.x, push.count - 1)].xyz;   // spare invocations repeat the last point
            lo[l] = p;
            hi[l] = p;
            barrier();                                         // all 256 values written
            for (uint s = 128; s > 0; s >>= 1)
            {
                if (l < s)
                {
                    lo[l] = min(lo[l], lo[l + s]);
                    hi[l] = max(hi[l], hi[l + s]);
                }
                barrier();                                     // this round finished before the next reads it
            }
            if (l == 0) store(lo[0], hi[0]);                   // six atomics per workgroup
        }
        """),
    ("Subgroups", Common + """
        void main()
        {
            ivec3 p = points[min(gl_GlobalInvocationID.x, push.count - 1)].xyz;
            ivec3 lo = subgroupMin(p), hi = subgroupMax(p);    // combined across the lanes, in registers
            if (subgroupElect()) store(lo, hi);                // six atomics per subgroup
        }
        """)
};

using var pointBuffer = Upload.ToDeviceLocal<int>(gpu, points, BufferUsageFlags.StorageBufferBit);
var start = new[] { int.MaxValue, int.MaxValue, int.MaxValue, int.MinValue, int.MinValue, int.MinValue };
var results = new List<GpuBuffer>();
var sets = new List<StorageSet>();
var pipelines = new List<ComputePipeline>();
var push = new PushConstantRange(ShaderStageFlags.ComputeBit, 0, 4);
foreach (var (_, glsl) in variants)
{
    var result = new GpuBuffer(gpu, 24, BufferUsageFlags.StorageBufferBit, MemoryPropertyFlags.HostVisibleBit | MemoryPropertyFlags.HostCoherentBit);
    result.Write<int>(start);
    var set = new StorageSet(gpu, ShaderStageFlags.ComputeBit, pointBuffer, result);
    results.Add(result);
    sets.Add(set);
    pipelines.Add(new ComputePipeline(gpu, glsl, [set.Layout], [push]));
}

for (int run = 0; run < 2; run++)                                   // run 1 is timed; run 0 warms the GPU up
    Upload.Immediate(gpu, cmd =>
    {
        profiler.Begin(cmd, 0);
        for (int v = 0; v < variants.Length; v++)
            using (profiler.Section(variants[v].Name))
                unsafe
                {
                    gpu.Vk.CmdBindPipeline(cmd, PipelineBindPoint.Compute, pipelines[v].Handle);
                    sets[v].Bind(cmd, pipelines[v].Layout, PipelineBindPoint.Compute);
                    uint count = Count;
                    gpu.Vk.CmdPushConstants(cmd, pipelines[v].Layout, ShaderStageFlags.ComputeBit, 0, 4, &count);
                    gpu.Vk.CmdDispatch(cmd, ComputePipeline.Groups(Count, 256), 1, 1);
                }
        Barriers.Memory(gpu.Vk, cmd, PipelineStageFlags2.ComputeShaderBit, AccessFlags2.ShaderStorageWriteBit, PipelineStageFlags2.HostBit, AccessFlags2.HostReadBit);
    });

var timings = profiler.Read(0);
long[] atomics = [6L * Count, 6L * Count / 256, 6L * Count / p11.SubgroupSize];
for (int v = 0; v < variants.Length; v++)
{
    int[] got;
    unsafe { got = new ReadOnlySpan<int>(results[v].Mapped, 6).ToArray(); }
    Console.WriteLine($"{variants[v].Name,-15}: about {atomics[v],9:N0} atomics, bounds match the CPU: {got.SequenceEqual(expected)}, GPU {timings[v].Milliseconds:F3} ms");
}
foreach (var p in pipelines) p.Dispose();
foreach (var s in sets) s.Dispose();
foreach (var r in results) r.Dispose();`, output: 'Subgroup size 32, arithmetic subgroup operations: True\nWorkgroups: up to 1024 invocations, 32,768 bytes of shared memory\n1,048,576 points; CPU: min (-60000, -40000, 0) max (60000, 40000, 45000) mm\nGlobal atomics : about 6,291,456 atomics, bounds match the CPU: True, GPU 1.184 ms\nShared memory  : about    24,576 atomics, bounds match the CPU: True, GPU 0.927 ms\nSubgroups      : about   196,608 atomics, bounds match the CPU: True, GPU 1.171 ms' },
      { type: 'p', text: 'All three agree with the CPU exactly: integer min and max give the same answer in any order. The atomics fell from 6.3 million to 25,000 or 200,000, yet on this GPU the three take about the same time, close to a millisecond. The reason is in the numbers: the shader reads 16 MB of points, and at the memory bandwidth of an integrated GPU that alone takes about a millisecond. The shader is **memory-bound**, and the atomics hide behind the reading; this GPU also merges atomics on the same address well. On a discrete GPU, with several times the bandwidth, or in a shader that does more work per point, the global version falls behind. (The second of two runs was timed: the first includes the GPU waking up.)' },
      { type: 'note', kind: 'tip', text: 'Before optimising a compute shader, work out its floor: bytes read and written divided by the memory bandwidth. If the shader already runs near it, as here, rearranging the arithmetic cannot help; reading less data (16-bit coordinates, 12 instead of 16 bytes per point) can. Of the three versions, the subgroup one is the shortest to write, which is often the best reason to choose it.' },
      { type: 'note', kind: 'info', text: 'Floating-point sums are different: addition of floats is not associative, so a reduction’s result depends on the order in which values are combined, and atomics make that order random. For results that must be reproducible, reduce in a fixed tree, or convert to fixed-point integers first, as the millimetres here do.' },
      { type: 'h2', text: 'What else compute does in a renderer' },
      { type: 'table', head: ['Job', 'Pattern'], rows: [
        ['Culling and draw generation (lesson 4)', 'One invocation per object, atomic counter for compaction'],
        ['Auto exposure (module 6)', 'Luminance histogram with shared-memory atomics, then a small reduction'],
        ['Hi-Z depth pyramid', 'Each level reduces 2 × 2 texels of the one above with max: a 2D reduction'],
        ['Clustered lighting', 'Assign lights to a 3D grid of screen tiles, one workgroup per tile'],
        ['Skinning, particle and cloth updates', 'One invocation per vertex or particle, writing vertex buffers'],
        ['Post-processing', 'Images as `image2D` with `imageLoad` and `imageStore`, 8 × 8 groups']
      ] },
      { type: 'quiz', question: 'Workgroup 3 of a dispatch needs a value that workgroup 7 computes. What is the correct way to get it?', options: ['barrier() in both groups', 'A shared variable', 'Split into two dispatches with a pipeline barrier between them', 'subgroupBroadcast'], answer: 2, explain: 'Workgroups cannot wait for one another; barrier() and shared only work within one group. Data flows between groups through memory, ordered by a barrier between commands.' },
      { type: 'quiz', question: 'In the shared-memory reduction, what can go wrong if the barrier() inside the loop is removed?', options: ['Nothing; the if (l < s) protects it', 'An invocation can read lo[l + s] before the invocation responsible for it has finished writing the previous round, giving a wrong result', 'The shader no longer compiles', 'Shared memory overflows'], answer: 1, explain: 'Invocations of a workgroup do not run in lockstep beyond a subgroup. Each round reads values the previous round wrote; only the barrier guarantees they are written and visible.' },
      { type: 'quiz', question: 'Why does every invocation of the last workgroup take part in the reduction, even those beyond the number of points?', options: ['To keep the GPU busy', 'Every invocation must reach the same barrier() calls; returning early would leave the others waiting forever, or be undefined', 'Atomics need 256 invocations', 'gl_GlobalInvocationID cannot exceed the count'], answer: 1, explain: 'A barrier must be reached by all invocations of the workgroup. The spare ones read a real point again, which cannot change a minimum or a maximum.' },
      { type: 'exercise', task: 'Count the scan’s points per storey (3 m storeys, so 15 bins for heights up to 45 m) with a compute shader that uses a `shared uint bins[16]` histogram per workgroup: clear it, `barrier()`, `atomicAdd` each point into its bin, `barrier()`, then the first 16 invocations add the group’s bins to the global result. Check the result against the CPU.', hint: 'Points with z = 45,000 exactly would land in bin 15, which is why there are 16 bins. Every invocation must reach both barriers, so out-of-range invocations skip only the `atomicAdd` into shared memory.', solution: cs`
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600) });
window.Initialize();
using var gpu = new GpuContext(window);
const int Count = 1 << 20;
var random = new Random(7);
var points = new int[Count * 4];
for (int i = 0; i < Count; i++)
{
    points[4 * i] = random.Next(-60_000, 60_001);
    points[4 * i + 1] = random.Next(-40_000, 40_001);
    points[4 * i + 2] = random.Next(0, 45_001);
}
var expected = new uint[16];
for (int i = 0; i < Count; i++) expected[points[4 * i + 2] / 3000]++;

const string Histogram = """
    #version 450
    layout(local_size_x = 256) in;
    layout(std430, set = 0, binding = 0) readonly buffer Points { ivec4 points[]; };
    layout(std430, set = 0, binding = 1) buffer Bins { uint total[16]; };
    layout(push_constant) uniform Push { uint count; } push;
    shared uint bins[16];

    void main()
    {
        uint l = gl_LocalInvocationIndex;
        if (l < 16) bins[l] = 0;
        barrier();
        if (gl_GlobalInvocationID.x < push.count)
            atomicAdd(bins[points[gl_GlobalInvocationID.x].z / 3000], 1u);     // fast: shared memory
        barrier();
        if (l < 16 && bins[l] > 0) atomicAdd(total[l], bins[l]);              // 16 global atomics per group at most
    }
    """;
using var pointBuffer = Upload.ToDeviceLocal<int>(gpu, points, BufferUsageFlags.StorageBufferBit);
using var binBuffer = new GpuBuffer(gpu, 64, BufferUsageFlags.StorageBufferBit, MemoryPropertyFlags.HostVisibleBit | MemoryPropertyFlags.HostCoherentBit);
binBuffer.Write<uint>(new uint[16]);
using var set = new StorageSet(gpu, ShaderStageFlags.ComputeBit, pointBuffer, binBuffer);
using var pipeline = new ComputePipeline(gpu, Histogram, [set.Layout], [new PushConstantRange(ShaderStageFlags.ComputeBit, 0, 4)]);
Upload.Immediate(gpu, cmd =>
{
    unsafe
    {
        gpu.Vk.CmdBindPipeline(cmd, PipelineBindPoint.Compute, pipeline.Handle);
        set.Bind(cmd, pipeline.Layout, PipelineBindPoint.Compute);
        uint count = Count;
        gpu.Vk.CmdPushConstants(cmd, pipeline.Layout, ShaderStageFlags.ComputeBit, 0, 4, &count);
        gpu.Vk.CmdDispatch(cmd, ComputePipeline.Groups(Count, 256), 1, 1);
    }
    Barriers.Memory(gpu.Vk, cmd, PipelineStageFlags2.ComputeShaderBit, AccessFlags2.ShaderStorageWriteBit, PipelineStageFlags2.HostBit, AccessFlags2.HostReadBit);
});
uint[] got;
unsafe { got = new ReadOnlySpan<uint>(binBuffer.Mapped, 16).ToArray(); }
for (int storey = 0; storey < 3; storey++) Console.WriteLine($"Storey {storey} ({storey * 3}-{storey * 3 + 3} m): {got[storey]:N0} points");
Console.WriteLine($"Total {got.Sum(b => (long)b):N0}; all 16 bins match the CPU: {got.SequenceEqual(expected)}");`, output: 'Storey 0 (0-3 m): 69,947 points\nStorey 1 (3-6 m): 69,846 points\nStorey 2 (6-9 m): 70,020 points\nTotal 1,048,576; all 16 bins match the CPU: True' }
    ],
    keyPoints: [
      'Invocations form subgroups (lockstep lanes) and workgroups (which share memory and barriers); a dispatch is many independent workgroups.',
      'Use workgroup sizes that are multiples of the subgroup size; 64 or 256 are safe defaults.',
      'shared memory plus barrier() lets a workgroup combine values; every invocation must reach every barrier.',
      'Atomics combine results across the whole dispatch but serialise on one address: reduce locally first.',
      'Subgroup operations (subgroupMin, subgroupAdd, subgroupElect) combine values in registers with no barrier.',
      'Workgroups cannot wait for each other: pass data between them through memory and a barrier between commands.'
    ]
  },

  // ------------------------------------------------------------------ 7
  {
    slug: 'synchronization-deep-dive',
    title: 'Synchronisation in depth: barriers and timeline semaphores',
    summary: 'What a barrier really promises: execution dependencies, memory availability and visibility, and the stage and access masks that express them. Read-after-write, write-after-read and write-after-write hazards, the barrier for each common pattern, and timeline semaphores: one 64-bit counter that orders work between submissions, queues and the CPU.',
    minutes: 28,
    blocks: [
      { type: 'p', text: 'This module has placed barriers between a fill and a compute shader, between a compute shader and an indirect draw, and between the previous frame and this one. Each was a small claim about the GPU’s behaviour. This lesson makes those claims precise, because synchronisation bugs are the worst kind: the program usually works, then fails on another GPU, another driver, or one frame in a thousand.' },
      { type: 'h2', text: 'What the GPU is allowed to do' },
      { type: 'p', text: 'Commands in a queue **start** in order, but nothing makes one finish before the next starts. A draw’s fragment shading can overlap the next draw’s vertex shading; a dispatch can start while the previous one is still running. On top of that, writes go into caches (per shader core, per unit) and are not automatically seen by other units. A barrier fixes both problems for one pair of “before” and “after” sets of work:' },
      { type: 'ul', items: [
        '**Execution dependency:** work in the destination stages, recorded after the barrier, does not start until work in the source stages, recorded before it, has finished.',
        '**Memory dependency:** writes of the source access types are made **available** (flushed from the writer’s caches) and **visible** to reads or writes of the destination access types (stale lines in the reader’s caches invalidated).'
      ] },
      { type: 'p', text: 'The barrier’s scopes reach backwards and forwards through the whole queue: “before” includes earlier command buffers and submissions, “after” includes later ones. That is why the culling lesson’s first barrier protected the previous frame’s indirect reads.' },
      { type: 'h2', text: 'Stages and access types' },
      { type: 'p', text: 'With synchronization2 (core in Vulkan 1.3), stages and accesses are 64-bit flags, given in pairs. The stage says **where in the pipeline**; the access says **which kind of memory operation** in that stage. Access flags must make sense for their stage: `ShaderStorageWriteBit` belongs to a shader stage, `IndirectCommandReadBit` to `DrawIndirectBit`.' },
      { type: 'table', head: ['Stage (PipelineStageFlags2)', 'Typical accesses (AccessFlags2)'], rows: [
        ['`DrawIndirectBit`', '`IndirectCommandReadBit` (also covers the count of DrawIndirectCount)'],
        ['`IndexInputBit`, `VertexAttributeInputBit`', '`IndexReadBit`, `VertexAttributeReadBit`'],
        ['`VertexShaderBit`, `FragmentShaderBit`, `ComputeShaderBit`', '`ShaderSampledReadBit`, `ShaderStorageReadBit`, `ShaderStorageWriteBit`, `UniformReadBit`'],
        ['`EarlyFragmentTestsBit`, `LateFragmentTestsBit`', '`DepthStencilAttachmentReadBit`, `…WriteBit`'],
        ['`ColorAttachmentOutputBit`', '`ColorAttachmentReadBit`, `ColorAttachmentWriteBit`'],
        ['`AllTransferBit` (copy, blit, clear, fill)', '`TransferReadBit`, `TransferWriteBit`'],
        ['`HostBit`', '`HostReadBit`, `HostWriteBit`']
      ] },
      { type: 'h2', text: 'Three hazards' },
      { type: 'table', head: ['Hazard', 'Example', 'What the barrier needs'], rows: [
        ['Read after write (RAW)', 'Compute writes commands; the draw reads them', 'Execution and memory dependency: src stage + write access, dst stage + read access'],
        ['Write after read (WAR)', 'This frame clears the counter the previous frame’s draw still reads', 'Execution dependency only: the read must finish first. Access masks can be None'],
        ['Write after write (WAW)', 'Two dispatches write the same buffer; the second must win', 'Execution and memory dependency, write access on both sides'],
        ['Read after read', 'Two passes sample the same texture', 'Nothing']
      ] },
      { type: 'widget', name: 'barrier-builder' },
      { type: 'h2', text: 'Three kinds of barrier' },
      { type: 'ul', items: [
        '**Global memory barrier** (`MemoryBarrier2`), as in `Barriers.Memory`: applies to all memory. Simple, and on most desktop GPUs no slower than a narrower one.',
        '**Buffer memory barrier** (`BufferMemoryBarrier2`): the same, limited to a range of one buffer. Mostly needed to transfer a buffer between queue families.',
        '**Image memory barrier** (`ImageMemoryBarrier2`): for images, and the only way to change an image’s **layout**. Every layout transition of modules 2 to 6 was one.'
      ] },
      { type: 'code', title: 'A buffer barrier, for reference', code: cs`
var barrier = new BufferMemoryBarrier2
{
    SType = StructureType.BufferMemoryBarrier2,
    SrcStageMask = PipelineStageFlags2.ComputeShaderBit, SrcAccessMask = AccessFlags2.ShaderStorageWriteBit,
    DstStageMask = PipelineStageFlags2.VertexShaderBit, DstAccessMask = AccessFlags2.ShaderStorageReadBit,
    SrcQueueFamilyIndex = Vk.QueueFamilyIgnored, DstQueueFamilyIndex = Vk.QueueFamilyIgnored,
    Buffer = instances.Handle, Offset = 0, Size = Vk.WholeSize
};
var dependency = new DependencyInfo { SType = StructureType.DependencyInfo, BufferMemoryBarrierCount = 1, PBufferMemoryBarriers = &barrier };
vk.CmdPipelineBarrier2(cmd, &dependency);` },
      { type: 'h2', text: 'Common mistakes' },
      { type: 'ul', items: [
        '**Too little:** forgetting the WAR barrier between frames, or using `TopOfPipe` as a destination stage with an access mask (top of pipe does no memory access, so the memory dependency is lost).',
        '**Too much:** `AllCommandsBit` with `MemoryReadBit | MemoryWriteBit` on both sides is always correct and drains the whole GPU each time. A few in a frame are harmless; one per draw is not.',
        '**One at a time:** each `CmdPipelineBarrier2` can carry many barriers. Batch the transitions of a pass into one call, as the render graph of module 5 does.',
        '**Trusting it works:** on one GPU a missing barrier often goes unnoticed. The validation layer’s **synchronization validation** (switched on in vkconfig) reports hazards it sees in the actual command stream; run it regularly.'
      ] },
      { type: 'h2', text: 'Between submissions: semaphores' },
      { type: 'p', text: 'Barriers work inside one queue. Between queues, and between the GPU and the CPU, Vulkan has semaphores and fences. Module 2 used **binary** semaphores (signalled once, waited once, for acquire and present) and fences (for the CPU). Vulkan 1.2 added the **timeline semaphore**, which replaces most of both: a 64-bit counter that only increases.' },
      { type: 'table', head: ['Operation', 'Timeline semaphore'], rows: [
        ['GPU signals', 'A submission sets the counter to a value when it finishes'],
        ['GPU waits', 'A submission waits until the counter is at least a value, before the given stages'],
        ['CPU signals', '`SignalSemaphore`: the CPU sets the counter, releasing GPU work that waits for it'],
        ['CPU waits', '`WaitSemaphores` with a timeout, like a fence'],
        ['CPU reads', '`GetSemaphoreCounterValue`: how far the GPU has got, without waiting']
      ] },
      { type: 'p', text: 'One timeline can replace a whole set of fences: frame n signals n + 1, and before reusing frame n’s slot the CPU waits for the value of frame n − FramesInFlight. There is nothing to reset, and the counter tells at a glance how far the GPU has got. A submission may even wait for a value nobody has signalled **yet** (“wait before signal”), as long as something will signal it. Semaphores also carry a memory dependency, for the stages given in the submission.' },
      { type: 'code', title: 'Engine/Timeline.cs', code: cs`
using Silk.NET.Vulkan;
using Semaphore = Silk.NET.Vulkan.Semaphore;

/// <summary>A timeline semaphore: a 64-bit counter that the GPU and the CPU can signal and wait for.</summary>
sealed unsafe class Timeline : IDisposable
{
    readonly GpuContext gpu;
    public readonly Semaphore Handle;

    public Timeline(GpuContext gpu, ulong initialValue = 0)
    {
        if (!gpu.TimelineSemaphores) throw new NotSupportedException("timelineSemaphore is needed");
        this.gpu = gpu;
        var type = new SemaphoreTypeCreateInfo { SType = StructureType.SemaphoreTypeCreateInfo, SemaphoreType = SemaphoreType.Timeline, InitialValue = initialValue };
        var info = new SemaphoreCreateInfo { SType = StructureType.SemaphoreCreateInfo, PNext = &type };
        Semaphore semaphore;
        gpu.Vk.CreateSemaphore(gpu.Device, &info, null, &semaphore).Check("CreateSemaphore");
        Handle = semaphore;
    }

    /// <summary>The counter now, without waiting.</summary>
    public ulong Value
    {
        get { ulong v; gpu.Vk.GetSemaphoreCounterValue(gpu.Device, Handle, &v).Check("GetSemaphoreCounterValue"); return v; }
    }

    /// <summary>Waits until the counter is at least value. False if the timeout ran out first.</summary>
    public bool Wait(ulong value, TimeSpan timeout)
    {
        var semaphore = Handle;
        var info = new SemaphoreWaitInfo { SType = StructureType.SemaphoreWaitInfo, SemaphoreCount = 1, PSemaphores = &semaphore, PValues = &value };
        var result = gpu.Vk.WaitSemaphores(gpu.Device, &info, (ulong)(timeout.TotalMilliseconds * 1_000_000));
        if (result == Result.Timeout) return false;
        result.Check("WaitSemaphores");
        return true;
    }

    /// <summary>Sets the counter from the CPU, releasing GPU work that waits for this value.</summary>
    public void Signal(ulong value)
    {
        var info = new SemaphoreSignalInfo { SType = StructureType.SemaphoreSignalInfo, Semaphore = Handle, Value = value };
        gpu.Vk.SignalSemaphore(gpu.Device, &info).Check("SignalSemaphore");
    }

    /// <summary>For a submission: wait for, or signal, this value at these stages.</summary>
    public SemaphoreSubmitInfo At(ulong value, PipelineStageFlags2 stages) =>
        new() { SType = StructureType.SemaphoreSubmitInfo, Semaphore = Handle, Value = value, StageMask = stages };

    /// <summary>Submits one command buffer with any number of waits and signals, and no fence.</summary>
    public static void Submit(GpuContext gpu, CommandBuffer cmd, SemaphoreSubmitInfo[] waits, SemaphoreSubmitInfo[] signals)
    {
        var cmdInfo = new CommandBufferSubmitInfo { SType = StructureType.CommandBufferSubmitInfo, CommandBuffer = cmd };
        fixed (SemaphoreSubmitInfo* w = waits)
        fixed (SemaphoreSubmitInfo* s = signals)
        {
            var submit = new SubmitInfo2
            {
                SType = StructureType.SubmitInfo2, CommandBufferInfoCount = 1, PCommandBufferInfos = &cmdInfo,
                WaitSemaphoreInfoCount = (uint)waits.Length, PWaitSemaphoreInfos = w,
                SignalSemaphoreInfoCount = (uint)signals.Length, PSignalSemaphoreInfos = s
            };
            gpu.Vk.QueueSubmit2(gpu.GraphicsQueue, 1, &submit, default).Check("QueueSubmit2");
        }
    }

    public void Dispose() => gpu.Vk.DestroySemaphore(gpu.Device, Handle, null);
}` },
      { type: 'h2', text: 'A timeline in action' },
      { type: 'p', text: 'The program submits two compute jobs on one timeline. Job A fills a buffer with 0, 1, 2, … and signals 1. Job B doubles every number, but waits for **2**, a value only the CPU will signal; it signals 3. The CPU watches the counter, sees that B is held back, releases it, and checks the numbers. Because the command buffers are recorded by hand here, the program has a small helper for them.' },
      { type: 'code', title: 'TimelineDemo.cs', code: cs`
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
using var timeline = new Timeline(gpu);
const uint Count = 4096;
using var data = new GpuBuffer(gpu, Count * 4, BufferUsageFlags.StorageBufferBit, MemoryPropertyFlags.HostVisibleBit | MemoryPropertyFlags.HostCoherentBit);
using var set = new StorageSet(gpu, ShaderStageFlags.ComputeBit, data);
using var pipeline = new ComputePipeline(gpu, """
    #version 450
    layout(local_size_x = 64) in;
    layout(std430, set = 0, binding = 0) buffer Data { uint data[]; };
    layout(push_constant) uniform Push { uint count; uint doubling; } push;
    void main()
    {
        uint i = gl_GlobalInvocationID.x;
        if (i < push.count) data[i] = push.doubling == 1u ? data[i] * 2u : i;
    }
    """, [set.Layout], [new PushConstantRange(ShaderStageFlags.ComputeBit, 0, 8)]);

CommandPool pool;
var buffers = new CommandBuffer[2];
unsafe
{
    var poolInfo = new CommandPoolCreateInfo { SType = StructureType.CommandPoolCreateInfo, QueueFamilyIndex = gpu.GraphicsFamily };
    gpu.Vk.CreateCommandPool(gpu.Device, &poolInfo, null, &pool).Check("CreateCommandPool");
    var allocInfo = new CommandBufferAllocateInfo { SType = StructureType.CommandBufferAllocateInfo, CommandPool = pool, Level = CommandBufferLevel.Primary, CommandBufferCount = 2 };
    fixed (CommandBuffer* b = buffers) gpu.Vk.AllocateCommandBuffers(gpu.Device, &allocInfo, b).Check("AllocateCommandBuffers");
}

unsafe CommandBuffer Record(int index, uint doubling)
{
    var cmd = buffers[index];
    var begin = new CommandBufferBeginInfo { SType = StructureType.CommandBufferBeginInfo, Flags = CommandBufferUsageFlags.OneTimeSubmitBit };
    gpu.Vk.BeginCommandBuffer(cmd, &begin).Check("BeginCommandBuffer");
    gpu.Vk.CmdBindPipeline(cmd, PipelineBindPoint.Compute, pipeline.Handle);
    set.Bind(cmd, pipeline.Layout, PipelineBindPoint.Compute);
    var push = stackalloc uint[] { Count, doubling };
    gpu.Vk.CmdPushConstants(cmd, pipeline.Layout, ShaderStageFlags.ComputeBit, 0, 8, push);
    gpu.Vk.CmdDispatch(cmd, ComputePipeline.Groups(Count, 64), 1, 1);
    Barriers.Memory(gpu.Vk, cmd, PipelineStageFlags2.ComputeShaderBit, AccessFlags2.ShaderStorageWriteBit, PipelineStageFlags2.HostBit, AccessFlags2.HostReadBit);
    gpu.Vk.EndCommandBuffer(cmd).Check("EndCommandBuffer");
    return cmd;
}

var compute = PipelineStageFlags2.ComputeShaderBit;
Timeline.Submit(gpu, Record(0, 0), [], [timeline.At(1, compute)]);                        // A: fill, then signal 1
Timeline.Submit(gpu, Record(1, 1), [timeline.At(2, compute)], [timeline.At(3, compute)]); // B: wait for 2, double, signal 3
Console.WriteLine("Both submitted");                                                     // the counter may already be 1, or still 0

Console.WriteLine($"Wait for 1 (job A): {timeline.Wait(1, TimeSpan.FromSeconds(5))}, counter {timeline.Value}");
Console.WriteLine($"Wait 100 ms for 3 (job B): {timeline.Wait(3, TimeSpan.FromMilliseconds(100))}, counter {timeline.Value}: B is held back");
uint[] before;
unsafe { before = new ReadOnlySpan<uint>(data.Mapped, 4).ToArray(); }
Console.WriteLine($"Data after A only: {string.Join(", ", before)}, ...");

timeline.Signal(2);                                                                        // the CPU releases B
Console.WriteLine($"CPU signalled 2. Wait for 3: {timeline.Wait(3, TimeSpan.FromSeconds(5))}, counter {timeline.Value}");
uint[] after;
unsafe { after = new ReadOnlySpan<uint>(data.Mapped, (int)Count).ToArray(); }
Console.WriteLine($"Data after B: {string.Join(", ", after.Take(4))}, ...; every value doubled: {after.Select((v, i) => v == 2 * i).All(ok => ok)}");
unsafe { gpu.Vk.DestroyCommandPool(gpu.Device, pool, null); }`, output: 'Both submitted\nWait for 1 (job A): True, counter 1\nWait 100 ms for 3 (job B): False, counter 1: B is held back\nData after A only: 0, 1, 2, 3, ...\nCPU signalled 2. Wait for 3: True, counter 3\nData after B: 0, 2, 4, 6, ...; every value doubled: True' },
      { type: 'p', text: 'Job A ran as soon as it was submitted. Job B was in the queue the whole time but could not start: its wait value had not been reached, and `Wait` gave up after 100 ms with the counter still at 1. When the CPU signalled 2, B ran within a fraction of a millisecond and moved the counter to 3. Between A and B no barrier was needed in the command buffers: the semaphore signal at the compute stage and the wait at the compute stage carry the execution and memory dependency between the two submissions.' },
      { type: 'note', kind: 'info', text: 'CPU-signalled waits are how engines feed the GPU from other threads: a loading thread signals a value when a mesh’s data is in place, and the frame that first uses it waits for that value instead of the CPU blocking. With several queues (a separate compute or transfer queue), timelines express the whole dependency graph between them.' },
      { type: 'quiz', question: 'The draw in this frame reads an indirect buffer that a compute shader in this frame wrote. Which barrier is right?', options: ['src ComputeShaderBit + ShaderStorageWriteBit → dst DrawIndirectBit + IndirectCommandReadBit', 'src DrawIndirectBit → dst ComputeShaderBit, accesses None', 'src TopOfPipeBit → dst BottomOfPipeBit', 'src ComputeShaderBit + ShaderStorageReadBit → dst VertexShaderBit + ShaderStorageReadBit'], answer: 0, explain: 'Read after write: the writer’s stage and write access, then the stage that reads indirect commands and that access. The second option is the write-after-read barrier for the next frame.' },
      { type: 'quiz', question: 'Why can a write-after-read barrier use AccessFlags2.None on both sides?', options: ['It cannot; that is a bug', 'Reads leave nothing in caches that must be flushed; the write only has to wait until the read has finished, which the execution dependency alone guarantees', 'None means all accesses', 'Because reads are atomic'], answer: 1, explain: 'Memory dependencies are about making writes available and visible. A read produces no data to flush; it only must not see the new value early, which waiting for it to finish ensures.' },
      { type: 'quiz', question: 'A timeline semaphore’s counter is 7. A submission waits for 5. What happens?', options: ['It waits for the counter to go back to 5', 'It does not wait: the condition is “at least 5”', 'It is an error: 5 was already passed', 'It waits for 12'], answer: 1, explain: 'Waits are for “greater than or equal”. The counter only increases, so a value once reached stays reached, and late waiters pass straight through.' },
      { type: 'exercise', task: 'Replace a frame loop’s per-slot fences with one timeline. Run 6 “frames” with 2 in flight: frame n records into command buffer n % 2, adds 1 to a counter in a storage buffer with a one-invocation dispatch, and signals n + 1. Before recording frame n (from frame 2), wait for value n − 1, which says frame n − 2 has finished with that command buffer. Since every frame writes the same counter, start each command buffer with a compute-to-compute barrier. Print what each frame waited for, and the counter at the end.', hint: 'Allocate the two command buffers from a pool with `ResetCommandBufferBit`, so that `BeginCommandBuffer` may reuse them. The barrier is a write-after-write and read-after-write between frames: src and dst `ComputeShaderBit`, accesses `ShaderStorageWriteBit` to `ShaderStorageReadBit | ShaderStorageWriteBit`.', solution: cs`
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600) });
window.Initialize();
using var gpu = new GpuContext(window);
using var timeline = new Timeline(gpu);
using var counter = new GpuBuffer(gpu, 4, BufferUsageFlags.StorageBufferBit, MemoryPropertyFlags.HostVisibleBit | MemoryPropertyFlags.HostCoherentBit);
counter.Write<uint>([0u]);
using var set = new StorageSet(gpu, ShaderStageFlags.ComputeBit, counter);
using var pipeline = new ComputePipeline(gpu, """
    #version 450
    layout(local_size_x = 1) in;
    layout(std430, set = 0, binding = 0) buffer Counter { uint value; };
    void main() { value += 1u; }
    """, [set.Layout]);

const int FramesInFlight = 2;
CommandPool pool;
var buffers = new CommandBuffer[FramesInFlight];
unsafe
{
    var poolInfo = new CommandPoolCreateInfo { SType = StructureType.CommandPoolCreateInfo, Flags = CommandPoolCreateFlags.ResetCommandBufferBit, QueueFamilyIndex = gpu.GraphicsFamily };
    gpu.Vk.CreateCommandPool(gpu.Device, &poolInfo, null, &pool).Check("CreateCommandPool");
    var allocInfo = new CommandBufferAllocateInfo { SType = StructureType.CommandBufferAllocateInfo, CommandPool = pool, Level = CommandBufferLevel.Primary, CommandBufferCount = FramesInFlight };
    fixed (CommandBuffer* b = buffers) gpu.Vk.AllocateCommandBuffers(gpu.Device, &allocInfo, b).Check("AllocateCommandBuffers");
}

for (ulong n = 0; n < 6; n++)
{
    string waited = "nothing";
    if (n >= FramesInFlight)
    {
        timeline.Wait(n - 1, TimeSpan.FromSeconds(5));          // frame n - 2 signalled n - 1: its command buffer is free
        waited = $"value {n - 1}";
    }
    var cmd = buffers[n % FramesInFlight];
    unsafe
    {
        var begin = new CommandBufferBeginInfo { SType = StructureType.CommandBufferBeginInfo, Flags = CommandBufferUsageFlags.OneTimeSubmitBit };
        gpu.Vk.BeginCommandBuffer(cmd, &begin).Check("BeginCommandBuffer");
        Barriers.Memory(gpu.Vk, cmd, PipelineStageFlags2.ComputeShaderBit, AccessFlags2.ShaderStorageWriteBit,
                        PipelineStageFlags2.ComputeShaderBit, AccessFlags2.ShaderStorageReadBit | AccessFlags2.ShaderStorageWriteBit);
        gpu.Vk.CmdBindPipeline(cmd, PipelineBindPoint.Compute, pipeline.Handle);
        set.Bind(cmd, pipeline.Layout, PipelineBindPoint.Compute);
        gpu.Vk.CmdDispatch(cmd, 1, 1, 1);
        Barriers.Memory(gpu.Vk, cmd, PipelineStageFlags2.ComputeShaderBit, AccessFlags2.ShaderStorageWriteBit, PipelineStageFlags2.HostBit, AccessFlags2.HostReadBit);
        gpu.Vk.EndCommandBuffer(cmd).Check("EndCommandBuffer");
    }
    Timeline.Submit(gpu, cmd, [], [timeline.At(n + 1, PipelineStageFlags2.ComputeShaderBit)]);
    Console.WriteLine($"Frame {n}: command buffer {n % FramesInFlight}, waited for {waited}, signals {n + 1}");
}
timeline.Wait(6, TimeSpan.FromSeconds(5));
uint total;
unsafe { total = *(uint*)counter.Mapped; }
Console.WriteLine($"Timeline at {timeline.Value}, counter {total}");
unsafe { gpu.Vk.DestroyCommandPool(gpu.Device, pool, null); }`, output: 'Frame 0: command buffer 0, waited for nothing, signals 1\nFrame 1: command buffer 1, waited for nothing, signals 2\nFrame 2: command buffer 0, waited for value 1, signals 3\nFrame 3: command buffer 1, waited for value 2, signals 4\nFrame 4: command buffer 0, waited for value 3, signals 5\nFrame 5: command buffer 1, waited for value 4, signals 6\nTimeline at 6, counter 6' }
    ],
    keyPoints: [
      'Commands start in order but may overlap, and writes sit in caches: barriers add execution and memory dependencies.',
      'A barrier names source and destination stages, and the access types whose writes must be made available and visible.',
      'Read-after-write and write-after-write need a memory dependency; write-after-read needs only an execution dependency.',
      'Global memory barriers are simple and usually enough for buffers; image barriers also change layouts. Batch barriers, and avoid AllCommands everywhere.',
      'Timeline semaphores are 64-bit counters that only increase: GPU and CPU can signal them and wait for “at least” a value.',
      'One timeline can replace per-frame fences, order work between queues, and let other CPU threads release GPU work.'
    ]
  }
];
