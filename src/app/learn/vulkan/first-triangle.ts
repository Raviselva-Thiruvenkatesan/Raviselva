import { Lesson } from '../learn.types';
import { cs } from '../csharp/cs';

/**
 * Vulkan module 2. Every C# sample was run with Silk.NET 2.23 on an Intel Iris Xe (Vulkan 1.4 driver)
 * on Windows 11; the outputs are from that machine, so formats, counts and colours can differ on other GPUs.
 * Code blocks titled Engine/*.cs are files of the engine the module builds up; each sample program uses
 * the latest version of every Engine file shown before it.
 */
export const FIRST_TRIANGLE: Lesson[] = [
  // ------------------------------------------------------------------ 1
  {
    slug: 'validation-layers',
    title: 'Validation layers and debug messages',
    summary: 'Vulkan does not check your calls, so mistakes fail silently or crash later. Turn on the validation layer while developing and route its messages to your console with a debug messenger.',
    minutes: 16,
    blocks: [
      { type: 'p', text: 'In module 1 you saw that Vulkan drivers do almost no error checking. Pass a wrong value and the call might still return `Success`, then the program draws garbage, hangs or crashes a few frames later, far from the real mistake. That is the price of a fast API: checking every argument of every call would cost time in every frame of every shipped program.' },
      { type: 'p', text: 'The checking still exists, but you switch it on only while developing. It lives in a **layer** called `VK_LAYER_KHRONOS_validation`. As you saw with the loader, a layer sits between your program and the driver and sees every call. The validation layer compares each call with the thousands of rules in the Vulkan specification (the **valid usage** rules) and reports any you break.' },
      { type: 'h2', text: 'Getting the layer' },
      { type: 'p', text: 'GPU drivers do not include the validation layer. It comes with the **Vulkan SDK** from LunarG (vulkan.lunarg.com), a free installer for Windows, Linux and macOS. The SDK also brings `vulkaninfo`, the shader compiler `glslc` and **vkconfig**, a tool for turning layers and their settings on for any program without changing its code.' },
      { type: 'note', kind: 'warn', text: 'Your users will not have the SDK, so the layer must be optional: check that it is installed before you ask for it, as the code below does. Asking for a missing layer makes `CreateInstance` fail with `ErrorLayerNotPresent`, as you saw in module 1.' },
      { type: 'h2', text: 'Receiving messages: the debug messenger' },
      { type: 'p', text: 'The layer needs somewhere to send its reports. The `VK_EXT_debug_utils` instance extension lets you register a **callback**: a function of yours that Vulkan calls with each message. You choose which **severities** you want (verbose, info, warning, error) and which **types** (general, validation, performance).' },
      { type: 'table', head: ['Type', 'What it reports'], rows: [
        ['Validation', 'A broken valid-usage rule: a wrong argument, a wrong order, an object used after it was destroyed'],
        ['Performance', 'Legal calls that are likely slow, such as a needless layout change'],
        ['General', 'Everything else, including the loader describing which drivers and layers it found']
      ] },
      { type: 'p', text: 'The callback is called from native code, so in C# it must be a static method marked `[UnmanagedCallersOnly]`, passed as a function pointer. That avoids the classic bug of a delegate being garbage-collected while Vulkan still holds a pointer to it.' },
      { type: 'p', text: 'This module builds a small engine, one file at a time, in an `Engine` folder of your project. Each sample program uses all the Engine files shown before it. The first two are a `Check` helper (as in module 1) and the debug messenger:' },
      { type: 'code', title: 'Engine/VkCheck.cs', code: cs`
using Silk.NET.Vulkan;

static class VkCheck
{
    /// <summary>Throws if a Vulkan call failed. Positive codes such as Suboptimal are not failures.</summary>
    public static Result Check(this Result result, string call)
    {
        if (result < 0) throw new InvalidOperationException($"{call} failed: {result}");
        return result;
    }
}` },
      { type: 'code', title: 'Engine/DebugMessenger.cs', code: cs`
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using Silk.NET.Core;
using Silk.NET.Core.Native;
using Silk.NET.Vulkan;

static unsafe class DebugMessenger
{
    public const string ValidationLayer = "VK_LAYER_KHRONOS_validation";
    public static int MessageCount;

    /// <summary>True if the validation layer is installed on this PC (it comes with the Vulkan SDK).</summary>
    public static bool IsLayerAvailable(Vk vk)
    {
        uint count = 0;
        vk.EnumerateInstanceLayerProperties(&count, null);
        var layers = new LayerProperties[count];
        fixed (LayerProperties* p = layers) vk.EnumerateInstanceLayerProperties(&count, p);
        return layers.Any(l => SilkMarshal.PtrToString((nint)l.LayerName) == ValidationLayer);
    }

    /// <summary>Settings for a messenger that reports validation and performance warnings and errors.</summary>
    public static DebugUtilsMessengerCreateInfoEXT CreateInfo() => new()
    {
        SType = StructureType.DebugUtilsMessengerCreateInfoExt,
        MessageSeverity = DebugUtilsMessageSeverityFlagsEXT.WarningBitExt | DebugUtilsMessageSeverityFlagsEXT.ErrorBitExt,
        MessageType = DebugUtilsMessageTypeFlagsEXT.ValidationBitExt | DebugUtilsMessageTypeFlagsEXT.PerformanceBitExt,
        PfnUserCallback = new PfnDebugUtilsMessengerCallbackEXT(&OnMessage)
    };

    [UnmanagedCallersOnly(CallConvs = [typeof(CallConvCdecl)])]
    static Bool32 OnMessage(DebugUtilsMessageSeverityFlagsEXT severity, DebugUtilsMessageTypeFlagsEXT types,
                            DebugUtilsMessengerCallbackDataEXT* data, void* userData)
    {
        MessageCount++;
        string level = severity.HasFlag(DebugUtilsMessageSeverityFlagsEXT.ErrorBitExt) ? "ERROR" : "WARNING";
        Console.WriteLine($"[{level}] {SilkMarshal.PtrToString((nint)data->PMessage)}");
        return false; // false: let the call continue. True would make it fail, which only layers' own tests need.
    }
}` },
      { type: 'p', text: 'Now a program that makes a real mistake. It creates a command pool from the device and then destroys the device without destroying the pool first, breaking the rule that children go before their parent (module 1, last lesson). The messenger is set up twice: once in the `PNext` chain of the instance info, which covers `CreateInstance` and `DestroyInstance` themselves, and once as an object for everything in between.' },
      { type: 'code', title: 'Validation.cs', code: cs`
using Silk.NET.Core.Native;
using Silk.NET.Vulkan;
using Silk.NET.Vulkan.Extensions.EXT;

unsafe
{
    var vk = Vk.GetApi();
    bool layer = DebugMessenger.IsLayerAvailable(vk);
    Console.WriteLine($"Validation layer installed: {layer}");

    string[] layers = layer ? [DebugMessenger.ValidationLayer] : [];
    string[] extensions = [ExtDebugUtils.ExtensionName];
    nint pLayers = SilkMarshal.StringArrayToPtr(layers), pExtensions = SilkMarshal.StringArrayToPtr(extensions);

    var debugInfo = DebugMessenger.CreateInfo();
    var appInfo = new ApplicationInfo { SType = StructureType.ApplicationInfo, ApiVersion = Vk.Version13 };
    var instanceInfo = new InstanceCreateInfo
    {
        SType = StructureType.InstanceCreateInfo,
        PNext = &debugInfo,                       // messages during CreateInstance / DestroyInstance
        PApplicationInfo = &appInfo,
        EnabledLayerCount = (uint)layers.Length, PpEnabledLayerNames = (byte**)pLayers,
        EnabledExtensionCount = (uint)extensions.Length, PpEnabledExtensionNames = (byte**)pExtensions
    };
    Instance instance;
    vk.CreateInstance(&instanceInfo, null, &instance).Check("CreateInstance");
    SilkMarshal.Free(pLayers); SilkMarshal.Free(pExtensions);

    vk.TryGetInstanceExtension(instance, out ExtDebugUtils debugUtils);
    DebugUtilsMessengerEXT messenger;
    debugUtils.CreateDebugUtilsMessenger(instance, &debugInfo, null, &messenger).Check("CreateDebugUtilsMessenger");

    uint n = 1;
    PhysicalDevice gpu;
    vk.EnumeratePhysicalDevices(instance, &n, &gpu);
    float priority = 1f;
    var queueInfo = new DeviceQueueCreateInfo { SType = StructureType.DeviceQueueCreateInfo, QueueFamilyIndex = 0, QueueCount = 1, PQueuePriorities = &priority };
    var deviceInfo = new DeviceCreateInfo { SType = StructureType.DeviceCreateInfo, QueueCreateInfoCount = 1, PQueueCreateInfos = &queueInfo };
    Device device;
    vk.CreateDevice(gpu, &deviceInfo, null, &device).Check("CreateDevice");

    var poolInfo = new CommandPoolCreateInfo { SType = StructureType.CommandPoolCreateInfo, QueueFamilyIndex = 0 };
    CommandPool pool;
    vk.CreateCommandPool(device, &poolInfo, null, &pool).Check("CreateCommandPool");

    vk.DestroyDevice(device, null);               // the mistake: the pool is still alive
    debugUtils.DestroyDebugUtilsMessenger(instance, messenger, null);
    vk.DestroyInstance(instance, null);
    Console.WriteLine($"Messages received: {DebugMessenger.MessageCount}");
}`, output: 'Validation layer installed: False\nMessages received: 0' },
      { type: 'p', text: 'On the PC used for this course the SDK is not installed, so this is the honest result: the mistake goes completely unnoticed. Every call returned `Success`. That is exactly why you develop with the layer on. With the SDK installed, the same program prints an `[ERROR]` line naming `vkDestroyDevice`, the command pool still alive, and the **VUID** (valid usage ID) of the rule, a code you can search for in the specification.' },
      { type: 'widget', name: 'validation-catch' },
      { type: 'h2', text: 'Reading a validation message' },
      { type: 'p', text: 'Validation messages are long, but they follow a pattern: the VUID first, then the objects involved (with their handles, and names if you gave them names), then the text of the rule from the specification. Fix the **first** message first: one early mistake often causes a cascade of later ones.' },
      { type: 'note', kind: 'tip', text: 'Give objects names with `SetDebugUtilsObjectName` (part of `VK_EXT_debug_utils`). Messages then say `"Mesh: Level 3 slab"` instead of a bare handle, and the names also show up in GPU debuggers such as RenderDoc.' },
      { type: 'h2', text: 'Debug builds only' },
      { type: 'p', text: 'Validation slows every call down, often by several times. Turn it on in debug builds and off in release builds. A simple way is a constant that follows the build configuration:' },
      { type: 'code', title: 'The switch', code: cs`
#if DEBUG
const bool UseValidation = true;
#else
const bool UseValidation = false;
#endif` },
      { type: 'quiz', question: 'A program makes an invalid call, but the validation layer is not enabled. What does the driver do?', options: ['Returns ErrorValidationFailed', 'Fixes the arguments and carries on', 'Nothing is guaranteed: it may work, misdraw, hang or crash, possibly much later', 'Prints a warning to the console'], answer: 2, explain: 'Drivers assume your calls are valid and skip the checks. Breaking a rule is undefined behaviour, which is why the sample above returned Success throughout.' },
      { type: 'quiz', question: 'Why does the sample put the messenger settings in the PNext chain of InstanceCreateInfo as well as creating a messenger object?', options: ['The object alone does not receive errors', 'The object can only exist once the instance does, so it cannot report on CreateInstance or DestroyInstance', 'PNext makes validation faster', 'It is required by the loader'], answer: 1, explain: 'A messenger object is created from an instance and destroyed before it. The copy in the PNext chain covers the instance’s own creation and destruction.' },
      { type: 'exercise', task: 'Extend the program so it also prints how many **layers** are installed in total and lists their names, before checking for the validation layer. Run it: on a PC with the SDK you will see several; on the course PC there are none.', hint: 'The two-call pattern with `EnumerateInstanceLayerProperties`, as in `DebugMessenger.IsLayerAvailable`. Print `SilkMarshal.PtrToString((nint)l.LayerName)` for each.', solution: cs`
using Silk.NET.Core.Native;
using Silk.NET.Vulkan;

unsafe
{
    var vk = Vk.GetApi();
    uint count = 0;
    vk.EnumerateInstanceLayerProperties(&count, null);
    var layers = new LayerProperties[count];
    fixed (LayerProperties* p = layers) vk.EnumerateInstanceLayerProperties(&count, p);
    Console.WriteLine($"Layers installed: {count}");
    foreach (var l in layers) Console.WriteLine("  " + SilkMarshal.PtrToString((nint)l.LayerName));
    Console.WriteLine($"Validation available: {DebugMessenger.IsLayerAvailable(vk)}");
}`, output: 'Layers installed: 0\nValidation available: False' }
    ],
    keyPoints: [
      'Drivers do not check your calls; breaking a valid-usage rule is undefined behaviour.',
      'The validation layer, VK_LAYER_KHRONOS_validation, checks every call against the specification. It comes with the Vulkan SDK, not the driver.',
      'VK_EXT_debug_utils delivers messages to your callback; choose severities and types.',
      'In C#, use a static [UnmanagedCallersOnly] method as the callback, passed as a function pointer.',
      'Put the messenger info in the instance PNext chain to cover CreateInstance and DestroyInstance too.',
      'Enable validation only if it is installed, and only in debug builds.'
    ]
  },

  // ------------------------------------------------------------------ 2
  {
    slug: 'window-surface',
    title: 'A window and a surface',
    summary: 'Open a window with Silk.NET.Windowing, connect Vulkan to it with a surface, and find a queue family that can present to it. The result is the GpuContext the rest of the engine is built on.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'Vulkan itself knows nothing about windows. Drawing works the same whether the pixels end up on a screen, in a file or in a video stream. Showing images in a window is added by **window system integration** (WSI) extensions, one per operating system, behind one common idea: the **surface**.' },
      { type: 'p', text: 'A **surface** (`SurfaceKHR`) is Vulkan’s handle for “somewhere images can be shown”: a Win32 window, an X11 or Wayland window on Linux, an Android view. It is created from the instance, so the instance must have the `VK_KHR_surface` extension plus the platform one, such as `VK_KHR_win32_surface` on Windows.' },
      { type: 'h2', text: 'Opening a window' },
      { type: 'p', text: 'Creating a window is not Vulkan’s job either. **Silk.NET.Windowing** does it on every desktop platform (it uses the GLFW library underneath) and knows which surface extensions that platform needs. Add the package:' },
      { type: 'code', title: 'Terminal', code: cs`
dotnet add package Silk.NET.Windowing --version 2.23.0` },
      { type: 'p', text: '`WindowOptions.DefaultVulkan` asks for a window with no OpenGL context, ready for Vulkan. `window.VkSurface` then gives you two things: the list of instance extensions the platform needs, and a method that creates the surface for this window.' },
      { type: 'h2', text: 'Can this queue family present?' },
      { type: 'p', text: 'Showing an image on a surface is called **presenting**, and it is done through a queue. Not every queue family can present to every surface, so you ask per family with `GetPhysicalDeviceSurfaceSupport`. On most desktop GPUs the graphics family can also present, but the API allows them to differ, so the engine keeps two indices and asks for two queues when they are different.' },
      { type: 'p', text: 'The device also needs one device extension, `VK_KHR_swapchain`, which the next lesson uses. Here is the engine’s `GpuContext`, grown from the one at the end of module 1:' },
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
        var f13 = new PhysicalDeviceVulkan13Features { SType = StructureType.PhysicalDeviceVulkan13Features, DynamicRendering = true, Synchronization2 = true };
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
      { type: 'p', text: 'Note the order in `Dispose`: the device, then the surface, then the messenger, then the instance. The surface belongs to the instance, so it must go before it. Now open a window and create the context:' },
      { type: 'code', title: 'Surface.cs', code: cs`
using Silk.NET.Maths;
using Silk.NET.Windowing;

var options = WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" };
using var window = Window.Create(options);
window.Initialize();                                  // opens the window

using (var gpu = new GpuContext(window))
{
    Console.WriteLine("Instance extensions: " + string.Join(", ", gpu.InstanceExtensions));
    Console.WriteLine($"GPU: {gpu.DeviceName}");
    Console.WriteLine($"Graphics family {gpu.GraphicsFamily}, present family {gpu.PresentFamily}");
    Console.WriteLine($"Validation: {gpu.Validation}");
    Console.WriteLine($"Window {window.Size}, framebuffer {window.FramebufferSize}");
}`, output: 'Instance extensions: VK_KHR_surface, VK_KHR_win32_surface\nGPU: Intel(R) Iris(R) Xe Graphics\nGraphics family 0, present family 0\nValidation: False\nWindow <800, 600>, framebuffer <800, 600>' },
      { type: 'p', text: 'On Windows the window needs `VK_KHR_surface` and `VK_KHR_win32_surface`. On this GPU, family 0 can both draw and present, so one queue does everything. Family 1 (video decode) cannot present.' },
      { type: 'note', kind: 'info', text: 'The **window size** is in screen coordinates; the **framebuffer size** is in pixels. They are equal at 100% display scaling but differ on high-DPI screens (at 150% scaling an 800 × 600 window can be 1200 × 900 pixels). Vulkan always works in pixels, so the engine sizes everything from `FramebufferSize`.' },
      { type: 'quiz', question: 'Why are VK_KHR_surface and VK_KHR_win32_surface instance extensions, while VK_KHR_swapchain is a device extension?', options: ['It is arbitrary', 'A surface belongs to the windowing system and is created before any device; a swapchain is GPU memory owned by one device', 'Device extensions are faster', 'Windows needs all three at instance level'], answer: 1, explain: 'You need the surface to pick a GPU (to ask which families can present to it), so it must exist before the device. The swapchain’s images are created by a specific device.' },
      { type: 'exercise', task: 'Print, for every queue family of the chosen GPU, whether it can present to the window’s surface. Use the `GpuContext` fields (`Vk`, `KhrSurface`, `PhysicalDevice`, `Surface`).', hint: 'Get the family count with `GetPhysicalDeviceQueueFamilyProperties(gpu, &count, null)`, then call `GetPhysicalDeviceSurfaceSupport` for each index. Use an `unsafe` block.', solution: cs`
using Silk.NET.Core;
using Silk.NET.Maths;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600) });
window.Initialize();
using var gpu = new GpuContext(window);
unsafe
{
    uint count = 0;
    gpu.Vk.GetPhysicalDeviceQueueFamilyProperties(gpu.PhysicalDevice, &count, null);
    for (uint i = 0; i < count; i++)
    {
        Bool32 ok;
        gpu.KhrSurface.GetPhysicalDeviceSurfaceSupport(gpu.PhysicalDevice, i, gpu.Surface, &ok);
        Console.WriteLine($"Family {i}: can present = {(bool)ok}");
    }
}`, output: 'Family 0: can present = True\nFamily 1: can present = False' }
    ],
    keyPoints: [
      'Vulkan draws without knowing about windows; WSI extensions connect it to the platform’s windows.',
      'A SurfaceKHR is created from the instance for one window; on Windows it needs VK_KHR_surface and VK_KHR_win32_surface.',
      'Silk.NET.Windowing opens the window, lists the extensions it needs and creates the surface.',
      'Ask GetPhysicalDeviceSurfaceSupport per queue family; prefer one family that both draws and presents.',
      'The device needs VK_KHR_swapchain to show images in the window.',
      'Size Vulkan images from the framebuffer size (pixels), not the window size.'
    ]
  },

  // ------------------------------------------------------------------ 3
  {
    slug: 'swapchain',
    title: 'The swapchain: images for the screen',
    summary: 'A swapchain is a small set of images that take turns being drawn into and shown. Query what the surface supports, choose a format, a present mode and a size, and create it.',
    minutes: 18,
    blocks: [
      { type: 'p', text: 'You never draw straight onto the screen. The screen shows one image while you draw the next one into another. When the new one is finished you hand it over and get back one that has left the screen. This rotating set of images is the **swapchain**, owned by the `VK_KHR_swapchain` extension.' },
      { type: 'p', text: 'Every frame then follows the same three steps, which the rest of the module builds: **acquire** an image from the swapchain, **draw** into it, **present** it back.' },
      { type: 'h2', text: 'What does the surface support?' },
      { type: 'p', text: 'Before creating a swapchain you ask the surface three questions:' },
      { type: 'table', head: ['Query', 'Answers', 'On this PC (800 × 600 window)'], rows: [
        ['`GetPhysicalDeviceSurfaceCapabilities`', 'Image count limits, current size, allowed usages, rotation', '2 to 64 images; 800 × 600; usages include colour attachment and transfer'],
        ['`GetPhysicalDeviceSurfaceFormats`', 'Pixel formats and colour spaces it can show', '4 formats: B8G8R8A8 and R8G8B8A8, each as Unorm and Srgb'],
        ['`GetPhysicalDeviceSurfacePresentModes`', 'How images are handed to the screen', 'Immediate and Fifo']
      ] },
      { type: 'h2', text: 'Choice 1: the format' },
      { type: 'p', text: 'Monitors expect colours encoded with the **sRGB** curve, which spends more of the 256 levels on dark shades, where eyes are more sensitive. Shaders, though, should do their maths (lighting, blending) on linear values. A `...Srgb` format gives you both: you write linear values and the GPU encodes them to sRGB as it stores each pixel. So the engine prefers `B8G8R8A8Srgb` with the `SrgbNonlinear` colour space, and takes the first format offered if that is missing.' },
      { type: 'h2', text: 'Choice 2: the present mode' },
      { type: 'p', text: 'The present mode decides what happens to a finished image when the screen is busy showing the previous one. The screen refreshes at a fixed rate (often 60 times a second); the moment between two refreshes is the **vertical blank**, or vblank.' },
      { type: 'widget', name: 'present-modes' },
      { type: 'table', head: ['Mode', 'Behaviour', 'Use it for'], rows: [
        ['`Fifo`', 'Images queue up and each is shown at a vblank. The frame rate is capped at the refresh rate. **Always supported.**', 'The default: no tearing, low power. Ideal for a BIM viewer on a laptop.'],
        ['`Mailbox`', 'Shown at a vblank, but a newer finished image replaces a waiting one', 'Lowest latency without tearing; the GPU keeps working flat out'],
        ['`Immediate`', 'Shown at once, even halfway through a refresh', 'Measuring raw speed; causes **tearing** (two frames on screen at once)'],
        ['`FifoRelaxed`', 'Like Fifo, but a late image is shown at once', 'Games that sometimes miss a frame']
      ] },
      { type: 'p', text: 'This Intel GPU offers only Fifo and Immediate, a good reminder to ask rather than assume. The engine uses Fifo when vsync is on and the fastest available mode when it is off.' },
      { type: 'h2', text: 'Choice 3: the size and the image count' },
      { type: 'p', text: 'On most platforms the surface reports its size in `CurrentExtent`, and the swapchain must match it. A width of `uint.MaxValue` means “you choose”, and then you clamp the framebuffer size between `MinImageExtent` and `MaxImageExtent`. For the image count, ask for one more than the minimum, so the driver never has to wait for you to release an image before it has one to give.' },
      { type: 'h2', text: 'Creating it' },
      { type: 'p', text: 'The class is `partial`: the next lesson adds image views in a second file, through the two `partial void` methods. If you have not written that file yet, C# simply removes the calls.' },
      { type: 'code', title: 'Engine/Swapchain.cs', code: cs`
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Vulkan.Extensions.KHR;

sealed unsafe partial class Swapchain : IDisposable
{
    readonly GpuContext gpu;
    public readonly SwapchainKHR Handle;
    public readonly Format Format;
    public readonly ColorSpaceKHR ColorSpace;
    public readonly PresentModeKHR PresentMode;
    public readonly Extent2D Extent;
    public readonly Image[] Images;

    public Swapchain(GpuContext gpu, Vector2D<int> framebufferSize, bool vsync = true, SwapchainKHR old = default)
    {
        this.gpu = gpu;
        var surfaceApi = gpu.KhrSurface;
        SurfaceCapabilitiesKHR caps;
        surfaceApi.GetPhysicalDeviceSurfaceCapabilities(gpu.PhysicalDevice, gpu.Surface, &caps).Check("GetSurfaceCapabilities");

        uint formatCount = 0;
        surfaceApi.GetPhysicalDeviceSurfaceFormats(gpu.PhysicalDevice, gpu.Surface, &formatCount, null);
        var formats = new SurfaceFormatKHR[formatCount];
        fixed (SurfaceFormatKHR* p = formats) surfaceApi.GetPhysicalDeviceSurfaceFormats(gpu.PhysicalDevice, gpu.Surface, &formatCount, p);

        uint modeCount = 0;
        surfaceApi.GetPhysicalDeviceSurfacePresentModes(gpu.PhysicalDevice, gpu.Surface, &modeCount, null);
        var modes = new PresentModeKHR[modeCount];
        fixed (PresentModeKHR* p = modes) surfaceApi.GetPhysicalDeviceSurfacePresentModes(gpu.PhysicalDevice, gpu.Surface, &modeCount, p);

        var format = ChooseFormat(formats);
        Format = format.Format;
        ColorSpace = format.ColorSpace;
        PresentMode = ChoosePresentMode(modes, vsync);
        Extent = ChooseExtent(caps, framebufferSize);
        uint imageCount = caps.MinImageCount + 1;
        if (caps.MaxImageCount > 0) imageCount = Math.Min(imageCount, caps.MaxImageCount);   // 0 means no limit

        bool twoFamilies = gpu.GraphicsFamily != gpu.PresentFamily;
        uint* families = stackalloc uint[] { gpu.GraphicsFamily, gpu.PresentFamily };
        var info = new SwapchainCreateInfoKHR
        {
            SType = StructureType.SwapchainCreateInfoKhr,
            Surface = gpu.Surface,
            MinImageCount = imageCount,
            ImageFormat = Format,
            ImageColorSpace = ColorSpace,
            ImageExtent = Extent,
            ImageArrayLayers = 1,                                   // 2 only for stereo (VR) displays
            ImageUsage = ImageUsageFlags.ColorAttachmentBit         // we draw into it
                       | ImageUsageFlags.TransferDstBit             // we may clear or copy into it
                       | ImageUsageFlags.TransferSrcBit,            // we may copy out of it (screenshots)
            ImageSharingMode = twoFamilies ? SharingMode.Concurrent : SharingMode.Exclusive,
            QueueFamilyIndexCount = twoFamilies ? 2u : 0u,
            PQueueFamilyIndices = families,
            PreTransform = caps.CurrentTransform,                   // no rotation (phones may rotate)
            CompositeAlpha = CompositeAlphaFlagsKHR.OpaqueBitKhr,   // ignore alpha: the window is not see-through
            PresentMode = PresentMode,
            Clipped = true,                                         // skip pixels hidden behind other windows
            OldSwapchain = old                                      // used when resizing (lesson 10)
        };
        SwapchainKHR handle;
        gpu.KhrSwapchain.CreateSwapchain(gpu.Device, &info, null, &handle).Check("CreateSwapchain");
        Handle = handle;

        uint count = 0;
        gpu.KhrSwapchain.GetSwapchainImages(gpu.Device, Handle, &count, null);
        Images = new Image[count];
        fixed (Image* p = Images) gpu.KhrSwapchain.GetSwapchainImages(gpu.Device, Handle, &count, p);
        CreateViews();
    }

    partial void CreateViews();
    partial void DestroyViews();

    static SurfaceFormatKHR ChooseFormat(SurfaceFormatKHR[] formats)
    {
        foreach (var f in formats)
            if (f.Format == Format.B8G8R8A8Srgb && f.ColorSpace == ColorSpaceKHR.SpaceSrgbNonlinearKhr) return f;
        return formats[0];
    }

    static PresentModeKHR ChoosePresentMode(PresentModeKHR[] modes, bool vsync)
    {
        if (vsync) return PresentModeKHR.FifoKhr;                   // always available
        if (modes.Contains(PresentModeKHR.MailboxKhr)) return PresentModeKHR.MailboxKhr;
        if (modes.Contains(PresentModeKHR.ImmediateKhr)) return PresentModeKHR.ImmediateKhr;
        return PresentModeKHR.FifoKhr;
    }

    static Extent2D ChooseExtent(SurfaceCapabilitiesKHR caps, Vector2D<int> size)
    {
        if (caps.CurrentExtent.Width != uint.MaxValue) return caps.CurrentExtent;
        return new Extent2D(
            Math.Clamp((uint)size.X, caps.MinImageExtent.Width, caps.MaxImageExtent.Width),
            Math.Clamp((uint)size.Y, caps.MinImageExtent.Height, caps.MaxImageExtent.Height));
    }

    public void Dispose()
    {
        DestroyViews();
        gpu.KhrSwapchain.DestroySwapchain(gpu.Device, Handle, null);  // also frees the images: you never destroy those
    }
}` },
      { type: 'code', title: 'CreateSwapchain.cs', code: cs`
using Silk.NET.Maths;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);

using (var swapchain = new Swapchain(gpu, window.FramebufferSize))
{
    Console.WriteLine($"Format:       {swapchain.Format} ({swapchain.ColorSpace})");
    Console.WriteLine($"Present mode: {swapchain.PresentMode}");
    Console.WriteLine($"Size:         {swapchain.Extent.Width} x {swapchain.Extent.Height}");
    Console.WriteLine($"Images:       {swapchain.Images.Length}");
}
using (var fast = new Swapchain(gpu, window.FramebufferSize, vsync: false))
    Console.WriteLine($"Without vsync: {fast.PresentMode}");`, output: 'Format:       B8G8R8A8Srgb (SpaceSrgbNonlinearKhr)\nPresent mode: PresentModeFifoKhr\nSize:         800 x 600\nImages:       3\nWithout vsync: PresentModeImmediateKhr' },
      { type: 'note', kind: 'info', text: 'The swapchain **owns** its images: `GetSwapchainImages` only gives you their handles, and destroying the swapchain frees them. Never call `DestroyImage` on a swapchain image.' },
      { type: 'quiz', question: 'Which present mode is guaranteed to be available on every Vulkan implementation?', options: ['Immediate', 'Mailbox', 'Fifo', 'FifoRelaxed'], answer: 2, explain: 'The specification requires Fifo. Everything else is optional; this Intel GPU, for example, has no Mailbox.' },
      { type: 'quiz', question: 'Your fragment shader outputs a linear value of 0.5 into a B8G8R8A8Srgb image. What is stored?', options: ['128', 'About 188: the GPU encodes it with the sRGB curve', '64', '0.5 as a float'], answer: 1, explain: 'An Srgb format converts on write: linear 0.5 becomes sRGB 0.735, stored as about 188 out of 255. You will see this measured in lesson 7.' },
      { type: 'exercise', task: 'Print every surface format and colour space the GPU offers for the window, and mark the one `Swapchain` would choose.', hint: 'Use the two-call pattern with `gpu.KhrSurface.GetPhysicalDeviceSurfaceFormats(gpu.PhysicalDevice, gpu.Surface, ...)` and compare with a swapchain’s `Format`.', solution: cs`
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600) });
window.Initialize();
using var gpu = new GpuContext(window);
using var swapchain = new Swapchain(gpu, window.FramebufferSize);
unsafe
{
    uint count = 0;
    gpu.KhrSurface.GetPhysicalDeviceSurfaceFormats(gpu.PhysicalDevice, gpu.Surface, &count, null);
    var formats = new SurfaceFormatKHR[count];
    fixed (SurfaceFormatKHR* p = formats) gpu.KhrSurface.GetPhysicalDeviceSurfaceFormats(gpu.PhysicalDevice, gpu.Surface, &count, p);
    foreach (var f in formats)
        Console.WriteLine($"{f.Format,-16} {f.ColorSpace}{(f.Format == swapchain.Format ? "  <- chosen" : "")}");
}`, output: 'B8G8R8A8Unorm    SpaceSrgbNonlinearKhr\nB8G8R8A8Srgb     SpaceSrgbNonlinearKhr  <- chosen\nR8G8B8A8Unorm    SpaceSrgbNonlinearKhr\nR8G8B8A8Srgb     SpaceSrgbNonlinearKhr' }
    ],
    keyPoints: [
      'A swapchain is a set of images that rotate between you (drawing) and the screen (showing).',
      'Every frame: acquire an image, draw into it, present it.',
      'Query surface capabilities, formats and present modes before creating it.',
      'Prefer an Srgb format: shaders work in linear values and the GPU encodes for the monitor.',
      'Fifo is always available and caps the frame rate at the refresh rate; Mailbox and Immediate are optional.',
      'Ask for one image more than the minimum, and match the surface’s current extent.'
    ]
  },

  // ------------------------------------------------------------------ 4
  {
    slug: 'image-views',
    title: 'Image views',
    summary: 'Shaders and attachments never use an image directly; they use a view that says which part of the image to use and how to read it. Add views to the swapchain.',
    minutes: 11,
    blocks: [
      { type: 'p', text: 'An **image** in Vulkan is a block of GPU memory with a format and a size, and possibly several **mip levels** (smaller copies for distant textures) and several **array layers** (a stack of same-size images, such as the six faces of a cube map). An image on its own cannot be drawn into or read by a shader.' },
      { type: 'p', text: 'For that you create an **image view**: a description of *which part* of the image to use and *how to interpret* it. The same image can have many views, for example one view of the whole mip chain for sampling and one view per mip level for generating them.' },
      { type: 'table', head: ['Field', 'Meaning', 'For a swapchain image'], rows: [
        ['`ViewType`', '1D, 2D, 3D, cube, or an array of them', '`Type2D`'],
        ['`Format`', 'How to read the bytes; may differ from the image if compatible', 'The swapchain format'],
        ['`Components`', 'Swizzle: read R from G, force A to 1, …', 'Identity (unchanged)'],
        ['`SubresourceRange`', 'Aspect (colour, depth, stencil), first mip and count, first layer and count', 'Colour, mip 0, 1 level, layer 0, 1 layer']
      ] },
      { type: 'p', text: 'Pick a part of an image and see what a view covers:' },
      { type: 'widget', name: 'image-view' },
      { type: 'h2', text: 'Views for the swapchain' },
      { type: 'p', text: 'The swapchain needs one view per image, since lesson 8 draws into them through views. This second part of the `Swapchain` class implements the two `partial void` methods:' },
      { type: 'code', title: 'Engine/Swapchain.Views.cs', code: cs`
using Silk.NET.Vulkan;

sealed unsafe partial class Swapchain
{
    public ImageView[] Views = [];

    partial void CreateViews()
    {
        Views = new ImageView[Images.Length];
        for (int i = 0; i < Images.Length; i++)
        {
            var info = new ImageViewCreateInfo
            {
                SType = StructureType.ImageViewCreateInfo,
                Image = Images[i],
                ViewType = ImageViewType.Type2D,
                Format = Format,
                Components = new ComponentMapping(ComponentSwizzle.Identity, ComponentSwizzle.Identity,
                                                  ComponentSwizzle.Identity, ComponentSwizzle.Identity),
                SubresourceRange = new ImageSubresourceRange
                {
                    AspectMask = ImageAspectFlags.ColorBit,
                    BaseMipLevel = 0, LevelCount = 1,
                    BaseArrayLayer = 0, LayerCount = 1
                }
            };
            ImageView view;
            gpu.Vk.CreateImageView(gpu.Device, &info, null, &view).Check("CreateImageView");
            Views[i] = view;
        }
    }

    partial void DestroyViews()
    {
        foreach (var view in Views) gpu.Vk.DestroyImageView(gpu.Device, view, null);
        Views = [];
    }
}` },
      { type: 'p', text: 'Unlike the images, the views are yours: you created them, so you destroy them, before the swapchain. `Dispose` from the last lesson already calls `DestroyViews` first.' },
      { type: 'code', title: 'Views.cs', code: cs`
using Silk.NET.Maths;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
using var swapchain = new Swapchain(gpu, window.FramebufferSize);

Console.WriteLine($"{swapchain.Images.Length} images, {swapchain.Views.Length} views");
for (int i = 0; i < swapchain.Views.Length; i++)
    Console.WriteLine($"View {i}: {(swapchain.Views[i].Handle != 0 ? "created" : "missing")}, 2D, {swapchain.Format}, mip 0, layer 0");`, output: '3 images, 3 views\nView 0: created, 2D, B8G8R8A8Srgb, mip 0, layer 0\nView 1: created, 2D, B8G8R8A8Srgb, mip 0, layer 0\nView 2: created, 2D, B8G8R8A8Srgb, mip 0, layer 0' },
      { type: 'note', kind: 'tip', text: 'Swizzles are handy for single-channel data. A BIM viewer can store a mask or an ambient-occlusion map in an `R8Unorm` image and read it in a shader as grey by mapping G and B to R in the view, with no change to the shader.' },
      { type: 'quiz', question: 'Who destroys a swapchain image’s view, and when?', options: ['The swapchain does, automatically', 'You do, before destroying the swapchain', 'You do, after destroying the swapchain', 'Nobody: views have no memory'], answer: 1, explain: 'You created the view, so you destroy it. It refers to the swapchain’s image, so it must go before the swapchain.' },
      { type: 'quiz', question: 'A texture has 10 mip levels. You want a view that only shows levels 2 to 4. What do you set?', options: ['BaseMipLevel = 2, LevelCount = 3', 'BaseMipLevel = 2, LevelCount = 4', 'BaseMipLevel = 3, LevelCount = 2', 'You need a new image'], answer: 0, explain: 'The range starts at BaseMipLevel and covers LevelCount levels: 2, 3 and 4.' }
    ],
    keyPoints: [
      'An image is memory with a format, size, mip levels and array layers; a view selects part of it and says how to read it.',
      'Attachments and shaders always go through views.',
      'The subresource range picks the aspect, the mip levels and the array layers.',
      'One image can have many views; swapchain images need one each.',
      'You destroy views you created; you never destroy swapchain images.'
    ]
  },

  // ------------------------------------------------------------------ 5
  {
    slug: 'shaders-spirv',
    title: 'Shaders: GLSL, SPIR-V and shader modules',
    summary: 'Write the vertex and fragment shaders for the first triangle in GLSL, compile them to SPIR-V from C# with shaderc, and load them into the GPU as shader modules.',
    minutes: 18,
    blocks: [
      { type: 'p', text: 'A **shader** is a small program that runs on the GPU, once per item, thousands of times in parallel. The triangle needs two: a **vertex shader**, run once per corner to say where it lands on the screen, and a **fragment shader**, run once per covered pixel to say its colour.' },
      { type: 'p', text: 'You write shaders in a C-like language, usually **GLSL** (the OpenGL Shading Language) or **HLSL** (Direct3D’s language, also supported for Vulkan). Vulkan does not accept either as text. It takes **SPIR-V**: a binary intermediate language, compiled ahead of time. Drivers no longer have to parse and optimise text while your program waits, and any language that compiles to SPIR-V can be used.' },
      { type: 'h2', text: 'The triangle’s shaders' },
      { type: 'p', text: 'For now the triangle’s three corners and colours are written straight into the vertex shader, so no vertex buffer is needed (module 3 moves them into GPU memory). `gl_VertexIndex` is the number of the vertex being processed: 0, 1 or 2.' },
      { type: 'code', title: 'Engine/TriangleShaders.cs', code: cs`
static class TriangleShaders
{
    public const string Vertex = """
        #version 450

        vec2 positions[3] = vec2[](vec2(0.0, -0.5), vec2(0.5, 0.5), vec2(-0.5, 0.5));
        vec3 colors[3]    = vec3[](vec3(1.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0), vec3(0.0, 0.0, 1.0));

        layout(location = 0) out vec3 vColor;      // passed on to the fragment shader

        void main()
        {
            gl_Position = vec4(positions[gl_VertexIndex], 0.0, 1.0);
            vColor = colors[gl_VertexIndex];
        }
        """;

    public const string Fragment = """
        #version 450

        layout(location = 0) in vec3 vColor;       // blended from the three corners
        layout(location = 0) out vec4 outColor;    // written to colour attachment 0

        void main()
        {
            outColor = vec4(vColor, 1.0);
        }
        """;
}` },
      { type: 'p', text: 'Between the two shaders, the rasteriser blends `vColor` across the triangle: a pixel near the red corner gets mostly red, one in the middle gets a mix. That blending is called **interpolation**. Outputs and inputs are matched by `location`, not by name.' },
      { type: 'h2', text: 'Where does a position land?' },
      { type: 'p', text: '`gl_Position` is in **clip space**. After dividing by `w` (1 here) you get **normalised device coordinates** (NDC): x from −1 (left) to +1 (right), and y from −1 (**top**) to +1 (**bottom**). That y-down direction is the opposite of OpenGL, a classic source of upside-down images when porting. Move the corners and see where they land:' },
      { type: 'widget', name: 'ndc-coords' },
      { type: 'h2', text: 'Compiling to SPIR-V' },
      { type: 'p', text: 'The SDK’s `glslc` tool compiles shader files on the command line. An engine can also compile at run time with **shaderc**, the library behind `glslc`, which makes hot-reloading shaders possible (module 5). Silk.NET wraps it, with the native library in a second package:' },
      { type: 'code', title: 'Terminal', code: cs`
dotnet add package Silk.NET.Shaderc --version 2.23.0
dotnet add package Silk.NET.Shaderc.Native --version 2.23.0` },
      { type: 'p', text: 'A **shader module** (`ShaderModule`) wraps SPIR-V code for the device. It is only needed while a pipeline is being built (next lesson); after that it can be destroyed.' },
      { type: 'code', title: 'Engine/Shaders.cs', code: cs`
using System.Text;
using Silk.NET.Core.Native;
using Silk.NET.Shaderc;
using Silk.NET.Vulkan;

static unsafe class Shaders
{
    static readonly Shaderc Api = Shaderc.GetApi();

    /// <summary>Compiles GLSL to SPIR-V for Vulkan 1.3. Throws with the compiler's message if the GLSL has errors.</summary>
    public static byte[] Compile(string glsl, ShaderKind kind, string fileName)
    {
        Compiler* compiler = Api.CompilerInitialize();
        CompileOptions* options = Api.CompileOptionsInitialize();
        Api.CompileOptionsSetTargetEnv(options, TargetEnv.Vulkan, (uint)EnvVersion.Vulkan13);
        Api.CompileOptionsSetOptimizationLevel(options, OptimizationLevel.Performance);
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
      { type: 'p', text: 'Compile both shaders and look inside the result. SPIR-V is a list of 32-bit words; the first is always the **magic number** `0x07230203`, and the second is the SPIR-V version. Then compile a shader with a mistake to see what an error looks like:' },
      { type: 'code', title: 'CompileShaders.cs', code: cs`
using Silk.NET.Maths;
using Silk.NET.Shaderc;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);

byte[] vert = Shaders.Compile(TriangleShaders.Vertex, ShaderKind.VertexShader, "triangle.vert");
byte[] frag = Shaders.Compile(TriangleShaders.Fragment, ShaderKind.FragmentShader, "triangle.frag");
foreach (var (name, spv) in new[] { ("triangle.vert", vert), ("triangle.frag", frag) })
{
    uint magic = BitConverter.ToUInt32(spv, 0), version = BitConverter.ToUInt32(spv, 4);
    Console.WriteLine($"{name}: {spv.Length} bytes = {spv.Length / 4} words, magic 0x{magic:X8}, SPIR-V {version >> 16}.{(version >> 8) & 0xFF}");
}

unsafe
{
    var vertModule = Shaders.CreateModule(gpu, vert);
    var fragModule = Shaders.CreateModule(gpu, frag);
    Console.WriteLine($"Shader modules created: {vertModule.Handle != 0 && fragModule.Handle != 0}");
    gpu.Vk.DestroyShaderModule(gpu.Device, vertModule, null);
    gpu.Vk.DestroyShaderModule(gpu.Device, fragModule, null);
}

try
{
    Shaders.Compile("#version 450\nvoid main()\n{\n    gl_Position = vec4(0.0, 0.0, 0.0);\n}\n", ShaderKind.VertexShader, "broken.vert");
}
catch (InvalidOperationException e)
{
    Console.WriteLine("Compile error: " + e.Message.Trim());
}`, output: 'triangle.vert: 1164 bytes = 291 words, magic 0x07230203, SPIR-V 1.6\ntriangle.frag: 432 bytes = 108 words, magic 0x07230203, SPIR-V 1.6\nShader modules created: True\nCompile error: broken.vert:4: error: \'constructor\' : not enough data provided for construction\nbroken.vert:4: error: \'assign\' :  cannot convert from \' const float\' to \' gl_Position 4-component vector of float Position\'' },
      { type: 'p', text: 'Targeting Vulkan 1.3 produces SPIR-V 1.6. The error names the file and line, just as a C# compiler would: a `vec4` needs four components, not three.' },
      { type: 'note', kind: 'tip', text: 'In a shipped program, compile shaders at build time (with `glslc` or a build step calling shaderc) and load the `.spv` files, so users never pay for compiling. Run-time compiling is for development, where editing a shader and seeing the result at once is a big time saver.' },
      { type: 'quiz', question: 'What does Vulkan’s CreateShaderModule accept?', options: ['GLSL source text', 'HLSL source text', 'SPIR-V binary code', 'Machine code for the GPU'], answer: 2, explain: 'Vulkan only takes SPIR-V. The driver then compiles SPIR-V to its own machine code when the pipeline is created.' },
      { type: 'quiz', question: 'A vertex shader outputs gl_Position = vec4(0.0, -1.0, 0.0, 1.0). Where is that on the screen in Vulkan?', options: ['Bottom centre', 'Top centre', 'The centre', 'Off screen'], answer: 1, explain: 'In Vulkan NDC, y = −1 is the top edge and y = +1 the bottom. OpenGL is the other way round.' },
      { type: 'exercise', task: 'Make the triangle point **down** instead of up, by changing only the positions in a copy of the vertex shader. Compile it to check it is valid, and print its size.', hint: 'In Vulkan, larger y is lower on the screen. Swap the sign of every y value.', solution: cs`
using Silk.NET.Shaderc;

const string DownVertex = """
    #version 450
    vec2 positions[3] = vec2[](vec2(0.0, 0.5), vec2(-0.5, -0.5), vec2(0.5, -0.5));
    vec3 colors[3]    = vec3[](vec3(1.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0), vec3(0.0, 0.0, 1.0));
    layout(location = 0) out vec3 vColor;
    void main()
    {
        gl_Position = vec4(positions[gl_VertexIndex], 0.0, 1.0);
        vColor = colors[gl_VertexIndex];
    }
    """;

byte[] spv = Shaders.Compile(DownVertex, ShaderKind.VertexShader, "down.vert");
Console.WriteLine($"Compiled: {spv.Length} bytes");`, output: 'Compiled: 1164 bytes' }
    ],
    keyPoints: [
      'Vertex shaders run per vertex and output clip-space positions; fragment shaders run per pixel and output colours.',
      'Vulkan takes SPIR-V, a binary intermediate language; GLSL and HLSL are compiled to it.',
      'shaderc (via Silk.NET.Shaderc) compiles GLSL at run time; glslc does it on the command line.',
      'SPIR-V starts with the magic number 0x07230203; Vulkan 1.3 targets SPIR-V 1.6.',
      'Vertex outputs are interpolated across the triangle and matched to fragment inputs by location.',
      'In Vulkan NDC, y = −1 is the top of the screen.'
    ]
  },

  // ------------------------------------------------------------------ 6
  {
    slug: 'graphics-pipeline',
    title: 'The graphics pipeline object',
    summary: 'Bake the shaders and every fixed-function setting into one immutable pipeline object: input assembly, rasterisation, blending, and which formats it draws into.',
    minutes: 18,
    blocks: [
      { type: 'p', text: 'In OpenGL you change state (blending on, culling off, a different shader) whenever you like, and the driver quietly recompiles GPU code when you next draw. Those hidden compiles cause the stutters that older engines are known for. Vulkan instead makes you describe **all** the state up front in a **pipeline object**, compiled once when you create it. Drawing with it later costs almost nothing.' },
      { type: 'p', text: 'A graphics pipeline is built from many small structures, one per stage:' },
      { type: 'table', head: ['State', 'Decides', 'For the triangle'], rows: [
        ['Shader stages', 'Which shader modules run, and their entry points', 'Vertex and fragment, entry `main`'],
        ['Vertex input', 'How vertex buffers are laid out', 'Empty: positions are in the shader'],
        ['Input assembly', 'How vertices form shapes', '`TriangleList`: every 3 vertices make a triangle'],
        ['Viewport and scissor', 'Where NDC maps on the image, and what is clipped', 'Dynamic: set when drawing'],
        ['Rasterisation', 'Fill or wireframe, which faces to cull, which way is front', 'Fill, no culling'],
        ['Multisampling', 'Anti-aliasing samples per pixel', '1 sample (module 4 adds MSAA)'],
        ['Depth and stencil', 'Hidden-surface tests', 'None yet (module 4)'],
        ['Colour blending', 'How the output mixes with what is already there', 'Off: overwrite'],
        ['Dynamic state', 'Which settings are left for draw time', 'Viewport and scissor'],
        ['Layout', 'What resources the shaders read', 'Empty (module 3)'],
        ['Rendering formats', 'Formats of the images it draws into', 'The swapchain format']
      ] },
      { type: 'h2', text: 'Culling and the front face' },
      { type: 'p', text: 'A closed 3D object, such as a column or a duct, never shows you the inside of its faces. Skipping triangles that face away (**back-face culling**) roughly halves the work. Which side is the front is decided by the **winding order**: whether the corners appear clockwise or counter-clockwise on screen. Try the settings:' },
      { type: 'widget', name: 'pipeline-state' },
      { type: 'h2', text: 'Dynamic state' },
      { type: 'p', text: 'If the viewport were baked in, every window resize would need new pipelines. Marking it **dynamic** leaves it to be set with a command each frame. Vulkan 1.3 allows much more state to be dynamic (cull mode, depth test and others), trading a little GPU efficiency on some hardware for far fewer pipelines.' },
      { type: 'p', text: 'Old Vulkan code also needs a **render pass** object here, describing the attachments in advance. With **dynamic rendering** (core in Vulkan 1.3, and enabled in `GpuContext`) you just list the attachment formats in a `PipelineRenderingCreateInfo` in the `PNext` chain.' },
      { type: 'code', title: 'Engine/TrianglePipeline.cs', code: cs`
using Silk.NET.Core.Native;
using Silk.NET.Shaderc;
using Silk.NET.Vulkan;

sealed unsafe class TrianglePipeline : IDisposable
{
    readonly GpuContext gpu;
    public readonly PipelineLayout Layout;
    public readonly Pipeline Handle;

    public TrianglePipeline(GpuContext gpu, Format colorFormat,
                            CullModeFlags cull = CullModeFlags.None, FrontFace front = FrontFace.Clockwise,
                            PolygonMode polygon = PolygonMode.Fill)
    {
        this.gpu = gpu;
        var vk = gpu.Vk;
        var vert = Shaders.CreateModule(gpu, Shaders.Compile(TriangleShaders.Vertex, ShaderKind.VertexShader, "triangle.vert"));
        var frag = Shaders.CreateModule(gpu, Shaders.Compile(TriangleShaders.Fragment, ShaderKind.FragmentShader, "triangle.frag"));
        byte* main = (byte*)SilkMarshal.StringToPtr("main");

        var stages = stackalloc PipelineShaderStageCreateInfo[2];
        stages[0] = new() { SType = StructureType.PipelineShaderStageCreateInfo, Stage = ShaderStageFlags.VertexBit, Module = vert, PName = main };
        stages[1] = new() { SType = StructureType.PipelineShaderStageCreateInfo, Stage = ShaderStageFlags.FragmentBit, Module = frag, PName = main };

        var vertexInput = new PipelineVertexInputStateCreateInfo { SType = StructureType.PipelineVertexInputStateCreateInfo };
        var inputAssembly = new PipelineInputAssemblyStateCreateInfo { SType = StructureType.PipelineInputAssemblyStateCreateInfo, Topology = PrimitiveTopology.TriangleList };
        var viewport = new PipelineViewportStateCreateInfo { SType = StructureType.PipelineViewportStateCreateInfo, ViewportCount = 1, ScissorCount = 1 };
        var raster = new PipelineRasterizationStateCreateInfo
        {
            SType = StructureType.PipelineRasterizationStateCreateInfo,
            PolygonMode = polygon, CullMode = cull, FrontFace = front, LineWidth = 1f
        };
        var multisample = new PipelineMultisampleStateCreateInfo { SType = StructureType.PipelineMultisampleStateCreateInfo, RasterizationSamples = SampleCountFlags.Count1Bit };
        var blendAttachment = new PipelineColorBlendAttachmentState
        {
            BlendEnable = false,
            ColorWriteMask = ColorComponentFlags.RBit | ColorComponentFlags.GBit | ColorComponentFlags.BBit | ColorComponentFlags.ABit
        };
        var blend = new PipelineColorBlendStateCreateInfo { SType = StructureType.PipelineColorBlendStateCreateInfo, AttachmentCount = 1, PAttachments = &blendAttachment };
        var dynamicStates = stackalloc DynamicState[] { DynamicState.Viewport, DynamicState.Scissor };
        var dynamic = new PipelineDynamicStateCreateInfo { SType = StructureType.PipelineDynamicStateCreateInfo, DynamicStateCount = 2, PDynamicStates = dynamicStates };

        var layoutInfo = new PipelineLayoutCreateInfo { SType = StructureType.PipelineLayoutCreateInfo };
        PipelineLayout layout;
        vk.CreatePipelineLayout(gpu.Device, &layoutInfo, null, &layout).Check("CreatePipelineLayout");
        Layout = layout;

        var rendering = new PipelineRenderingCreateInfo { SType = StructureType.PipelineRenderingCreateInfo, ColorAttachmentCount = 1, PColorAttachmentFormats = &colorFormat };
        var info = new GraphicsPipelineCreateInfo
        {
            SType = StructureType.GraphicsPipelineCreateInfo,
            PNext = &rendering,                      // dynamic rendering: formats instead of a render pass
            StageCount = 2, PStages = stages,
            PVertexInputState = &vertexInput, PInputAssemblyState = &inputAssembly,
            PViewportState = &viewport, PRasterizationState = &raster,
            PMultisampleState = &multisample, PColorBlendState = &blend,
            PDynamicState = &dynamic, Layout = Layout
        };
        Pipeline pipeline;
        vk.CreateGraphicsPipelines(gpu.Device, default, 1, &info, null, &pipeline).Check("CreateGraphicsPipelines");
        Handle = pipeline;

        vk.DestroyShaderModule(gpu.Device, vert, null);     // the pipeline has its own compiled copy
        vk.DestroyShaderModule(gpu.Device, frag, null);
        SilkMarshal.Free((nint)main);
    }

    public void Dispose()
    {
        gpu.Vk.DestroyPipeline(gpu.Device, Handle, null);
        gpu.Vk.DestroyPipelineLayout(gpu.Device, Layout, null);
    }
}` },
      { type: 'code', title: 'Pipeline.cs', code: cs`
using System.Diagnostics;
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
using var swapchain = new Swapchain(gpu, window.FramebufferSize);

var clock = Stopwatch.StartNew();
using (var pipeline = new TrianglePipeline(gpu, swapchain.Format))
{
    Console.WriteLine($"Pipeline for {swapchain.Format}: {pipeline.Handle.Handle != 0}");
    Console.WriteLine($"Built in under a second: {clock.Elapsed.TotalSeconds < 1}");
}
using (var wire = new TrianglePipeline(gpu, swapchain.Format, CullModeFlags.BackBit, polygon: PolygonMode.Line))
    Console.WriteLine($"A second pipeline, wireframe with back faces culled: {wire.Handle.Handle != 0}");`, output: 'Pipeline for B8G8R8A8Srgb: True\nBuilt in under a second: True\nA second pipeline, wireframe with back faces culled: True' },
      { type: 'p', text: 'Each different combination of state is a separate pipeline. A real engine has many (opaque, transparent, wireframe, one per material type) and builds them at startup or on a loading screen, never in the middle of a frame. Module 5 covers organising them, and **pipeline caches**, which save the compiled results to disk so the next start is faster.' },
      { type: 'note', kind: 'warn', text: '`PolygonMode.Line` (wireframe) is only allowed if the device feature `fillModeNonSolid` is enabled; the course GPU supports it, and the validation layer would flag it otherwise. Module 5 shows how to draw BIM edges properly, without relying on wireframe mode.' },
      { type: 'quiz', question: 'Why does Vulkan bake state into pipeline objects instead of letting you change it freely?', options: ['To save memory', 'So that GPU code is compiled once, when the pipeline is created, instead of unpredictably in the middle of drawing', 'Because GPUs cannot change state', 'To force one pipeline per program'], answer: 1, explain: 'Shader code and state are often compiled together into GPU instructions. Doing that at creation time removes the hidden compile stutters of older APIs.' },
      { type: 'quiz', question: 'Which settings did the triangle pipeline make dynamic, and why?', options: ['Shaders, so they can be swapped', 'Viewport and scissor, so a window resize does not need a new pipeline', 'Blending, for transparency', 'None'], answer: 1, explain: 'The viewport size follows the window. Making it dynamic means one pipeline works at any size.' }
    ],
    keyPoints: [
      'A graphics pipeline bakes the shaders and all fixed-function state into one immutable object.',
      'Creating pipelines is expensive; binding them is cheap. Build them up front.',
      'Rasterisation state sets fill mode, culling and which winding is the front face.',
      'Dynamic state (here viewport and scissor) is set at draw time instead of baked in.',
      'With dynamic rendering, the pipeline lists its attachment formats instead of needing a render pass.',
      'Shader modules can be destroyed once the pipeline is created.'
    ]
  },

  // ------------------------------------------------------------------ 7
  {
    slug: 'command-buffers',
    title: 'Command buffers, queues and your first clear',
    summary: 'Record commands into a command buffer, submit it to a queue, wait for it with a fence and present the result: the window turns blue. Then read the pixels back to see what was really stored.',
    minutes: 20,
    blocks: [
      { type: 'p', text: 'Vulkan never draws when you call a function. Instead you **record** commands into a **command buffer**, a list of work for the GPU, and then **submit** the whole list to a **queue**. The GPU works through queued buffers on its own, while your CPU code carries on. That split is what lets an engine record on many threads and keep the GPU busy.' },
      { type: 'table', head: ['Object', 'Role'], rows: [
        ['`CommandPool`', 'Memory that command buffers are allocated from; one per queue family (and per thread)'],
        ['`CommandBuffer`', 'A recorded list of commands. Primary buffers are submitted; secondary ones are called from primaries'],
        ['`Queue`', 'Where submitted buffers wait and run, in order of submission'],
        ['`Fence`', 'Signalled by the GPU when a submission finishes, so the CPU can wait for it'],
        ['`Semaphore`', 'Signalled and waited on by the GPU, to order work between queues and the swapchain (lesson 9)']
      ] },
      { type: 'h2', text: 'The life of a command buffer' },
      { type: 'p', text: 'A command buffer moves through states, and calling a function in the wrong state is a validation error. Step through them:' },
      { type: 'widget', name: 'cmd-lifecycle' },
      { type: 'h2', text: 'Layouts and barriers' },
      { type: 'p', text: 'GPUs store images differently depending on what they are being used for: compressed for drawing, arranged for the display engine, linear for copying. Each arrangement is an **image layout**. Before each new use you record a **barrier** that changes the layout. It also tells the GPU what must finish first (the **source** stage and access) and what must wait (the **destination**). Vulkan 1.3’s **synchronization2** makes barriers one structure each:' },
      { type: 'code', title: 'Engine/Commands.cs', code: cs`
using Silk.NET.Vulkan;

static unsafe class Commands
{
    /// <summary>Records a layout change for a colour image, ordering earlier work (src) before later work (dst).</summary>
    public static void Barrier(Vk vk, CommandBuffer cmd, Image image, ImageLayout oldLayout, ImageLayout newLayout,
                               PipelineStageFlags2 srcStage, AccessFlags2 srcAccess,
                               PipelineStageFlags2 dstStage, AccessFlags2 dstAccess)
    {
        var barrier = new ImageMemoryBarrier2
        {
            SType = StructureType.ImageMemoryBarrier2,
            SrcStageMask = srcStage, SrcAccessMask = srcAccess,
            DstStageMask = dstStage, DstAccessMask = dstAccess,
            OldLayout = oldLayout, NewLayout = newLayout,
            SrcQueueFamilyIndex = Vk.QueueFamilyIgnored, DstQueueFamilyIndex = Vk.QueueFamilyIgnored,
            Image = image,
            SubresourceRange = new ImageSubresourceRange(ImageAspectFlags.ColorBit, 0, 1, 0, 1)
        };
        var dependency = new DependencyInfo { SType = StructureType.DependencyInfo, ImageMemoryBarrierCount = 1, PImageMemoryBarriers = &barrier };
        vk.CmdPipelineBarrier2(cmd, &dependency);
    }
}` },
      { type: 'p', text: 'To check results, the samples copy pixels from the GPU into a buffer the CPU can read. Module 3 explains buffers and memory types properly; for now, this helper does it:' },
      { type: 'code', title: 'Engine/ReadbackBuffer.cs', code: cs`
using Silk.NET.Vulkan;
using VkBuffer = Silk.NET.Vulkan.Buffer;

/// <summary>A buffer in CPU-visible memory to copy a B8G8R8A8 image into, to check its pixels.</summary>
sealed unsafe class ReadbackBuffer : IDisposable
{
    readonly GpuContext gpu;
    readonly DeviceMemory memory;
    readonly byte* data;
    readonly Extent2D extent;
    public readonly VkBuffer Handle;

    public ReadbackBuffer(GpuContext gpu, Extent2D extent)
    {
        this.gpu = gpu;
        this.extent = extent;
        var vk = gpu.Vk;
        var info = new BufferCreateInfo { SType = StructureType.BufferCreateInfo, Size = (ulong)extent.Width * extent.Height * 4, Usage = BufferUsageFlags.TransferDstBit };
        VkBuffer buffer;
        vk.CreateBuffer(gpu.Device, &info, null, &buffer).Check("CreateBuffer");
        Handle = buffer;

        MemoryRequirements needs;
        vk.GetBufferMemoryRequirements(gpu.Device, Handle, &needs);
        var props = vk.GetPhysicalDeviceMemoryProperties(gpu.PhysicalDevice);
        var wanted = MemoryPropertyFlags.HostVisibleBit | MemoryPropertyFlags.HostCoherentBit;
        uint type = 0;
        while ((needs.MemoryTypeBits & (1u << (int)type)) == 0 || (props.MemoryTypes[(int)type].PropertyFlags & wanted) != wanted) type++;
        var alloc = new MemoryAllocateInfo { SType = StructureType.MemoryAllocateInfo, AllocationSize = needs.Size, MemoryTypeIndex = type };
        DeviceMemory mem;
        vk.AllocateMemory(gpu.Device, &alloc, null, &mem).Check("AllocateMemory");
        memory = mem;
        vk.BindBufferMemory(gpu.Device, Handle, memory, 0).Check("BindBufferMemory");
        void* p;
        vk.MapMemory(gpu.Device, memory, 0, needs.Size, 0, &p).Check("MapMemory");
        data = (byte*)p;
    }

    /// <summary>Records a copy of the whole image (in TransferSrcOptimal layout) into this buffer.</summary>
    public void CopyFrom(CommandBuffer cmd, Image image)
    {
        var region = new BufferImageCopy
        {
            ImageSubresource = new ImageSubresourceLayers(ImageAspectFlags.ColorBit, 0, 0, 1),
            ImageExtent = new Extent3D(extent.Width, extent.Height, 1)
        };
        gpu.Vk.CmdCopyImageToBuffer(cmd, image, ImageLayout.TransferSrcOptimal, Handle, 1, &region);
    }

    /// <summary>The pixel at (x, y) as R, G, B bytes (the image stores B, G, R, A).</summary>
    public (byte R, byte G, byte B) Pixel(int x, int y)
    {
        byte* p = data + ((long)y * extent.Width + x) * 4;
        return (p[2], p[1], p[0]);
    }

    public void Dispose()
    {
        gpu.Vk.UnmapMemory(gpu.Device, memory);
        gpu.Vk.DestroyBuffer(gpu.Device, Handle, null);
        gpu.Vk.FreeMemory(gpu.Device, memory, null);
    }
}` },
      { type: 'h2', text: 'Acquire, record, submit, present' },
      { type: 'p', text: 'Here is a whole frame, with the simplest possible synchronisation: the CPU waits on a fence twice, once for the swapchain image to be ready and once for the GPU to finish. Lesson 9 removes both waits. The commands clear the image to a blue, copy it to the readback buffer and leave it ready to present:' },
      { type: 'code', title: 'ClearScreen.cs', code: cs`
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
using var swapchain = new Swapchain(gpu, window.FramebufferSize);
using var readback = new ReadbackBuffer(gpu, swapchain.Extent);
var vk = gpu.Vk;

unsafe
{
    // 1. A pool for the graphics family, one primary command buffer and a fence
    var poolInfo = new CommandPoolCreateInfo { SType = StructureType.CommandPoolCreateInfo, QueueFamilyIndex = gpu.GraphicsFamily };
    CommandPool pool;
    vk.CreateCommandPool(gpu.Device, &poolInfo, null, &pool).Check("CreateCommandPool");
    var allocInfo = new CommandBufferAllocateInfo { SType = StructureType.CommandBufferAllocateInfo, CommandPool = pool, Level = CommandBufferLevel.Primary, CommandBufferCount = 1 };
    CommandBuffer cmd;
    vk.AllocateCommandBuffers(gpu.Device, &allocInfo, &cmd).Check("AllocateCommandBuffers");
    var fenceInfo = new FenceCreateInfo { SType = StructureType.FenceCreateInfo };
    Fence fence;
    vk.CreateFence(gpu.Device, &fenceInfo, null, &fence).Check("CreateFence");

    // 2. Acquire an image; for now the CPU waits for it with the fence
    uint index;
    gpu.KhrSwapchain.AcquireNextImage(gpu.Device, swapchain.Handle, ulong.MaxValue, default, fence, &index).Check("AcquireNextImage");
    vk.WaitForFences(gpu.Device, 1, &fence, true, ulong.MaxValue);
    vk.ResetFences(gpu.Device, 1, &fence);
    Console.WriteLine($"Acquired image {index} of {swapchain.Images.Length}");

    // 3. Record: clear, copy out, get ready to present
    var image = swapchain.Images[index];
    var begin = new CommandBufferBeginInfo { SType = StructureType.CommandBufferBeginInfo, Flags = CommandBufferUsageFlags.OneTimeSubmitBit };
    vk.BeginCommandBuffer(cmd, &begin).Check("BeginCommandBuffer");
    Commands.Barrier(vk, cmd, image, ImageLayout.Undefined, ImageLayout.TransferDstOptimal,
        PipelineStageFlags2.None, AccessFlags2.None, PipelineStageFlags2.ClearBit, AccessFlags2.TransferWriteBit);
    var blue = new ClearColorValue(0.2f, 0.4f, 0.8f, 1f);
    var range = new ImageSubresourceRange(ImageAspectFlags.ColorBit, 0, 1, 0, 1);
    vk.CmdClearColorImage(cmd, image, ImageLayout.TransferDstOptimal, &blue, 1, &range);
    Commands.Barrier(vk, cmd, image, ImageLayout.TransferDstOptimal, ImageLayout.TransferSrcOptimal,
        PipelineStageFlags2.ClearBit, AccessFlags2.TransferWriteBit, PipelineStageFlags2.CopyBit, AccessFlags2.TransferReadBit);
    readback.CopyFrom(cmd, image);
    Commands.Barrier(vk, cmd, image, ImageLayout.TransferSrcOptimal, ImageLayout.PresentSrcKhr,
        PipelineStageFlags2.CopyBit, AccessFlags2.None, PipelineStageFlags2.None, AccessFlags2.None);
    vk.EndCommandBuffer(cmd).Check("EndCommandBuffer");

    // 4. Submit, and wait until the GPU has finished
    var cmdInfo = new CommandBufferSubmitInfo { SType = StructureType.CommandBufferSubmitInfo, CommandBuffer = cmd };
    var submit = new SubmitInfo2 { SType = StructureType.SubmitInfo2, CommandBufferInfoCount = 1, PCommandBufferInfos = &cmdInfo };
    vk.QueueSubmit2(gpu.GraphicsQueue, 1, &submit, fence).Check("QueueSubmit2");
    vk.WaitForFences(gpu.Device, 1, &fence, true, ulong.MaxValue);

    var (r, g, b) = readback.Pixel(10, 10);
    Console.WriteLine($"Cleared to linear (0.2, 0.4, 0.8); the image stores ({r}, {g}, {b})");
    Console.WriteLine($"As sRGB fractions: ({r / 255.0:F3}, {g / 255.0:F3}, {b / 255.0:F3})");

    // 5. Present: the window turns blue
    var handle = swapchain.Handle;
    var present = new PresentInfoKHR { SType = StructureType.PresentInfoKhr, SwapchainCount = 1, PSwapchains = &handle, PImageIndices = &index };
    gpu.KhrSwapchain.QueuePresent(gpu.PresentQueue, &present).Check("QueuePresent");
    Console.WriteLine("Presented");

    vk.DeviceWaitIdle(gpu.Device);
    vk.DestroyFence(gpu.Device, fence, null);
    vk.DestroyCommandPool(gpu.Device, pool, null);   // frees its command buffers too
}`, output: 'Acquired image 0 of 3\nCleared to linear (0.2, 0.4, 0.8); the image stores (123, 169, 231)\nAs sRGB fractions: (0.482, 0.663, 0.906)\nPresented' },
      { type: 'p', text: 'Look at the stored bytes. A linear 0.2 was stored as 123, which is 0.482, not 51 (0.2 × 255). That is the sRGB encoding from lesson 3 at work: the image is `B8G8R8A8Srgb`, so the GPU encoded the linear values for the monitor. Your eyes see the result as the intended brightness.' },
      { type: 'note', kind: 'info', text: 'The old layout `Undefined` means “I do not care what is in the image”. It lets the GPU skip preserving the old contents, which is right before a clear. Using `Undefined` for an image whose contents you need would lose them.' },
      { type: 'quiz', question: 'When does the GPU actually clear the image in this program?', options: ['When CmdClearColorImage is called', 'When EndCommandBuffer is called', 'After QueueSubmit2, at some point while the CPU carries on', 'When QueuePresent is called'], answer: 2, explain: 'Cmd* functions only record. The work happens on the GPU after submission; the fence tells the CPU when it is done.' },
      { type: 'quiz', question: 'What does a fence do?', options: ['Orders two GPU submissions', 'Lets the CPU wait until the GPU has finished a submission', 'Changes an image layout', 'Protects memory from other processes'], answer: 1, explain: 'Fences are GPU-to-CPU signals. Semaphores (lesson 9) order work on the GPU side without the CPU waiting.' },
      { type: 'exercise', task: 'Clear to linear mid-grey (0.5, 0.5, 0.5) and work out what byte value you expect before running. The sRGB curve for values above 0.0031308 is `1.055 × v^(1/2.4) − 0.055`. Print your prediction and the stored value. Do not be surprised by a difference of one: the specification lets GPUs round the sRGB conversion slightly differently.', hint: 'Copy ClearScreen.cs, change the clear colour, and compute the prediction with `Math.Pow`. Round `prediction × 255`.', solution: cs`
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

double linear = 0.5;
double srgb = 1.055 * Math.Pow(linear, 1 / 2.4) - 0.055;
Console.WriteLine($"Predicted byte: {Math.Round(srgb * 255)}");

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600) });
window.Initialize();
using var gpu = new GpuContext(window);
using var swapchain = new Swapchain(gpu, window.FramebufferSize);
using var readback = new ReadbackBuffer(gpu, swapchain.Extent);
var vk = gpu.Vk;
unsafe
{
    var poolInfo = new CommandPoolCreateInfo { SType = StructureType.CommandPoolCreateInfo, QueueFamilyIndex = gpu.GraphicsFamily };
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
    vk.BeginCommandBuffer(cmd, &begin);
    Commands.Barrier(vk, cmd, image, ImageLayout.Undefined, ImageLayout.TransferDstOptimal,
        PipelineStageFlags2.None, AccessFlags2.None, PipelineStageFlags2.ClearBit, AccessFlags2.TransferWriteBit);
    var grey = new ClearColorValue((float)linear, (float)linear, (float)linear, 1f);
    var range = new ImageSubresourceRange(ImageAspectFlags.ColorBit, 0, 1, 0, 1);
    vk.CmdClearColorImage(cmd, image, ImageLayout.TransferDstOptimal, &grey, 1, &range);
    Commands.Barrier(vk, cmd, image, ImageLayout.TransferDstOptimal, ImageLayout.TransferSrcOptimal,
        PipelineStageFlags2.ClearBit, AccessFlags2.TransferWriteBit, PipelineStageFlags2.CopyBit, AccessFlags2.TransferReadBit);
    readback.CopyFrom(cmd, image);
    Commands.Barrier(vk, cmd, image, ImageLayout.TransferSrcOptimal, ImageLayout.PresentSrcKhr,
        PipelineStageFlags2.CopyBit, AccessFlags2.None, PipelineStageFlags2.None, AccessFlags2.None);
    vk.EndCommandBuffer(cmd);

    var cmdInfo = new CommandBufferSubmitInfo { SType = StructureType.CommandBufferSubmitInfo, CommandBuffer = cmd };
    var submit = new SubmitInfo2 { SType = StructureType.SubmitInfo2, CommandBufferInfoCount = 1, PCommandBufferInfos = &cmdInfo };
    vk.QueueSubmit2(gpu.GraphicsQueue, 1, &submit, fence).Check("QueueSubmit2");
    vk.WaitForFences(gpu.Device, 1, &fence, true, ulong.MaxValue);
    Console.WriteLine($"Stored byte: {readback.Pixel(0, 0).R}");

    var handle = swapchain.Handle;
    var present = new PresentInfoKHR { SType = StructureType.PresentInfoKhr, SwapchainCount = 1, PSwapchains = &handle, PImageIndices = &index };
    gpu.KhrSwapchain.QueuePresent(gpu.PresentQueue, &present);
    vk.DeviceWaitIdle(gpu.Device);
    vk.DestroyFence(gpu.Device, fence, null);
    vk.DestroyCommandPool(gpu.Device, pool, null);
}`, output: 'Predicted byte: 188\nStored byte: 187' }
    ],
    keyPoints: [
      'Cmd* functions record into a command buffer; nothing runs until the buffer is submitted to a queue.',
      'Command buffers come from a pool tied to one queue family, and move through Initial, Recording, Executable and Pending states.',
      'A fence lets the CPU wait for a submission to finish.',
      'Images have layouts; a barrier changes the layout and orders earlier work before later work.',
      'A frame is: acquire an image, record, submit, present.',
      'Srgb formats store linear values encoded for the monitor: linear 0.2 becomes 123.'
    ]
  },

  // ------------------------------------------------------------------ 8
  {
    slug: 'dynamic-rendering',
    title: 'Dynamic rendering: drawing the triangle',
    summary: 'Begin rendering into a swapchain image, bind the pipeline, set the viewport and draw three vertices. Then read pixels back to check the triangle and its blended colours.',
    minutes: 16,
    blocks: [
      { type: 'p', text: 'Everything is ready: a swapchain with views, a pipeline and a way to submit commands. Drawing needs one more idea: **where** the pipeline draws to. The images a draw writes into are its **attachments**: colour attachments for pixels, and later a depth attachment (module 4).' },
      { type: 'p', text: 'Vulkan 1.0 described attachments with **render pass** and **framebuffer** objects, created in advance and matched to every pipeline. Vulkan 1.3 adds **dynamic rendering**: you list the attachments in `CmdBeginRendering`, right where you use them. It is simpler, needs no extra objects, and is what this course uses. You will still meet render passes in older code and on some mobile GPUs, where they help the hardware save bandwidth.' },
      { type: 'h2', text: 'The attachment' },
      { type: 'table', head: ['Field', 'Meaning', 'Here'], rows: [
        ['`ImageView`', 'The view to draw into', 'The swapchain image’s view'],
        ['`ImageLayout`', 'The layout it will be in while drawing', '`ColorAttachmentOptimal`'],
        ['`LoadOp`', 'What to do with the old contents at the start', '`Clear`: fill with `ClearValue`'],
        ['`StoreOp`', 'Whether to keep the result at the end', '`Store`: it is going on screen'],
        ['`ClearValue`', 'The colour used by `Clear`', 'Near-black']
      ] },
      { type: 'p', text: '`LoadOp` and `StoreOp` matter for speed. `Clear` and `DontCare` let the GPU skip reading the old image from memory; `DontCare` on store lets it skip writing, which is right for things like a depth buffer you only need during the frame.' },
      { type: 'h2', text: 'Layouts before and after' },
      { type: 'p', text: 'The image must be in `ColorAttachmentOptimal` while drawing, and in `PresentSrcKhr` when handed to the screen. Pick the barrier for each step:' },
      { type: 'widget', name: 'image-layouts' },
      { type: 'p', text: 'This function records a whole frame into a command buffer. The next two lessons call it every frame:' },
      { type: 'code', title: 'Engine/TriangleFrame.cs', code: cs`
using Silk.NET.Vulkan;

static unsafe class TriangleFrame
{
    public static void Record(GpuContext gpu, CommandBuffer cmd, Swapchain swapchain, uint imageIndex,
                              TrianglePipeline pipeline, ClearColorValue background)
    {
        var vk = gpu.Vk;
        var image = swapchain.Images[imageIndex];
        var extent = swapchain.Extent;

        // Undefined -> ColorAttachmentOptimal: we overwrite everything, so the old contents do not matter
        Commands.Barrier(vk, cmd, image, ImageLayout.Undefined, ImageLayout.ColorAttachmentOptimal,
            PipelineStageFlags2.ColorAttachmentOutputBit, AccessFlags2.None,
            PipelineStageFlags2.ColorAttachmentOutputBit, AccessFlags2.ColorAttachmentWriteBit);

        var color = new RenderingAttachmentInfo
        {
            SType = StructureType.RenderingAttachmentInfo,
            ImageView = swapchain.Views[imageIndex],
            ImageLayout = ImageLayout.ColorAttachmentOptimal,
            LoadOp = AttachmentLoadOp.Clear,
            StoreOp = AttachmentStoreOp.Store,
            ClearValue = new ClearValue(background)
        };
        var rendering = new RenderingInfo
        {
            SType = StructureType.RenderingInfo,
            RenderArea = new Rect2D(new Offset2D(0, 0), extent),
            LayerCount = 1,
            ColorAttachmentCount = 1, PColorAttachments = &color
        };
        vk.CmdBeginRendering(cmd, &rendering);
        vk.CmdBindPipeline(cmd, PipelineBindPoint.Graphics, pipeline.Handle);
        var viewport = new Viewport(0, 0, extent.Width, extent.Height, 0, 1);
        vk.CmdSetViewport(cmd, 0, 1, &viewport);
        var scissor = new Rect2D(new Offset2D(0, 0), extent);
        vk.CmdSetScissor(cmd, 0, 1, &scissor);
        vk.CmdDraw(cmd, 3, 1, 0, 0);                  // 3 vertices, 1 instance, starting at vertex 0
        vk.CmdEndRendering(cmd);

        // ColorAttachmentOptimal -> PresentSrcKhr: drawing must finish before presenting
        Commands.Barrier(vk, cmd, image, ImageLayout.ColorAttachmentOptimal, ImageLayout.PresentSrcKhr,
            PipelineStageFlags2.ColorAttachmentOutputBit, AccessFlags2.ColorAttachmentWriteBit,
            PipelineStageFlags2.None, AccessFlags2.None);
    }
}` },
      { type: 'p', text: '`CmdDraw(cmd, 3, 1, 0, 0)` runs the vertex shader three times, with `gl_VertexIndex` 0, 1 and 2. There is no vertex buffer: the shader looks the positions up itself.' },
      { type: 'h2', text: 'The first triangle' },
      { type: 'p', text: 'This program draws one frame, as in the last lesson, then copies the image back and checks pixels: the corner (background), the centre, and points near each corner of the triangle.' },
      { type: 'code', title: 'Triangle.cs', code: cs`
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
using var swapchain = new Swapchain(gpu, window.FramebufferSize);
using var pipeline = new TrianglePipeline(gpu, swapchain.Format);
using var readback = new ReadbackBuffer(gpu, swapchain.Extent);
var vk = gpu.Vk;

unsafe
{
    var poolInfo = new CommandPoolCreateInfo { SType = StructureType.CommandPoolCreateInfo, QueueFamilyIndex = gpu.GraphicsFamily };
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

    var begin = new CommandBufferBeginInfo { SType = StructureType.CommandBufferBeginInfo, Flags = CommandBufferUsageFlags.OneTimeSubmitBit };
    vk.BeginCommandBuffer(cmd, &begin).Check("BeginCommandBuffer");
    TriangleFrame.Record(gpu, cmd, swapchain, index, pipeline, new ClearColorValue(0.02f, 0.02f, 0.03f, 1f));
    // Extra, for checking: copy the finished image out, then put it back in the present layout
    var image = swapchain.Images[index];
    Commands.Barrier(vk, cmd, image, ImageLayout.PresentSrcKhr, ImageLayout.TransferSrcOptimal,
        PipelineStageFlags2.ColorAttachmentOutputBit, AccessFlags2.ColorAttachmentWriteBit, PipelineStageFlags2.CopyBit, AccessFlags2.TransferReadBit);
    readback.CopyFrom(cmd, image);
    Commands.Barrier(vk, cmd, image, ImageLayout.TransferSrcOptimal, ImageLayout.PresentSrcKhr,
        PipelineStageFlags2.CopyBit, AccessFlags2.None, PipelineStageFlags2.None, AccessFlags2.None);
    vk.EndCommandBuffer(cmd).Check("EndCommandBuffer");

    var cmdInfo = new CommandBufferSubmitInfo { SType = StructureType.CommandBufferSubmitInfo, CommandBuffer = cmd };
    var submit = new SubmitInfo2 { SType = StructureType.SubmitInfo2, CommandBufferInfoCount = 1, PCommandBufferInfos = &cmdInfo };
    vk.QueueSubmit2(gpu.GraphicsQueue, 1, &submit, fence).Check("QueueSubmit2");
    vk.WaitForFences(gpu.Device, 1, &fence, true, ulong.MaxValue);

    // NDC (x, y) -> pixel: ((x + 1) / 2 * width, (y + 1) / 2 * height)
    foreach (var (name, x, y) in new[] { ("corner", 5, 5), ("top tip", 400, 160), ("bottom right", 590, 440), ("bottom left", 210, 440), ("centre", 400, 300), ("outside, right", 600, 200) })
        Console.WriteLine($"{name,-15} ({x}, {y}): {readback.Pixel(x, y)}");

    var handle = swapchain.Handle;
    var present = new PresentInfoKHR { SType = StructureType.PresentInfoKhr, SwapchainCount = 1, PSwapchains = &handle, PImageIndices = &index };
    gpu.KhrSwapchain.QueuePresent(gpu.PresentQueue, &present).Check("QueuePresent");
    vk.DeviceWaitIdle(gpu.Device);
    vk.DestroyFence(gpu.Device, fence, null);
    vk.DestroyCommandPool(gpu.Device, pool, null);
}`, output: 'corner          (5, 5): (39, 39, 48)\ntop tip         (400, 160): (251, 37, 34)\nbottom right    (590, 440): (50, 251, 22)\nbottom left     (210, 440): (50, 26, 250)\ncentre          (400, 300): (187, 137, 137)\noutside, right  (600, 200): (39, 39, 48)' },
      { type: 'p', text: 'The pixels confirm the picture: near-black outside, nearly pure red at the top tip, green at the bottom right, blue at the bottom left, and a blend in the middle. The centre is exactly halfway down, so it gets half the weight of the top (red) corner and a quarter from each bottom corner: linear (0.5, 0.25, 0.25), which sRGB-encodes to (188, 137, 137). The GPU stored (187, 137, 137). The background is (39, 39, 48), not 5, 5, 8 (0.02 × 255), for the same reason: sRGB encoding brightens dark values the most.' },
      { type: 'h2', text: 'Which way is the front?' },
      { type: 'p', text: 'On screen, the triangle’s corners 0 → 1 → 2 (top, bottom right, bottom left) go **clockwise**. The pipeline in lesson 6 left culling off. Turn back-face culling on and test both front-face settings, drawing one frame each and checking the centre pixel:' },
      { type: 'code', title: 'Culling.cs', code: cs`
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
using var swapchain = new Swapchain(gpu, window.FramebufferSize);
using var readback = new ReadbackBuffer(gpu, swapchain.Extent);
var vk = gpu.Vk;

foreach (var front in new[] { FrontFace.Clockwise, FrontFace.CounterClockwise })
{
    using var pipeline = new TrianglePipeline(gpu, swapchain.Format, CullModeFlags.BackBit, front);
    unsafe
    {
        var poolInfo = new CommandPoolCreateInfo { SType = StructureType.CommandPoolCreateInfo, QueueFamilyIndex = gpu.GraphicsFamily };
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

        var begin = new CommandBufferBeginInfo { SType = StructureType.CommandBufferBeginInfo };
        vk.BeginCommandBuffer(cmd, &begin);
        TriangleFrame.Record(gpu, cmd, swapchain, index, pipeline, new ClearColorValue(0f, 0f, 0f, 1f));
        var image = swapchain.Images[index];
        Commands.Barrier(vk, cmd, image, ImageLayout.PresentSrcKhr, ImageLayout.TransferSrcOptimal,
            PipelineStageFlags2.ColorAttachmentOutputBit, AccessFlags2.ColorAttachmentWriteBit, PipelineStageFlags2.CopyBit, AccessFlags2.TransferReadBit);
        readback.CopyFrom(cmd, image);
        Commands.Barrier(vk, cmd, image, ImageLayout.TransferSrcOptimal, ImageLayout.PresentSrcKhr,
            PipelineStageFlags2.CopyBit, AccessFlags2.None, PipelineStageFlags2.None, AccessFlags2.None);
        vk.EndCommandBuffer(cmd);
        var cmdInfo = new CommandBufferSubmitInfo { SType = StructureType.CommandBufferSubmitInfo, CommandBuffer = cmd };
        var submit = new SubmitInfo2 { SType = StructureType.SubmitInfo2, CommandBufferInfoCount = 1, PCommandBufferInfos = &cmdInfo };
        vk.QueueSubmit2(gpu.GraphicsQueue, 1, &submit, fence).Check("QueueSubmit2");
        vk.WaitForFences(gpu.Device, 1, &fence, true, ulong.MaxValue);
        var handle = swapchain.Handle;
        var present = new PresentInfoKHR { SType = StructureType.PresentInfoKhr, SwapchainCount = 1, PSwapchains = &handle, PImageIndices = &index };
        gpu.KhrSwapchain.QueuePresent(gpu.PresentQueue, &present);
        vk.DeviceWaitIdle(gpu.Device);

        var centre = readback.Pixel(400, 300);
        Console.WriteLine($"Cull back faces, front = {front,-16}: centre {centre} -> {(centre == (0, 0, 0) ? "culled" : "drawn")}");
        vk.DestroyFence(gpu.Device, fence, null);
        vk.DestroyCommandPool(gpu.Device, pool, null);
    }
}`, output: 'Cull back faces, front = Clockwise       : centre (187, 137, 137) -> drawn\nCull back faces, front = CounterClockwise: centre (0, 0, 0) -> culled' },
      { type: 'p', text: 'So `FrontFace.Clockwise` means clockwise **as you see it on screen**, and back-face culling removed the triangle once its on-screen clockwise winding counted as the back. Most 3D model formats (glTF, IFC exports, OBJ) store front faces counter-clockwise in their own y-up coordinates; module 4’s projection matrix flips y for Vulkan, which also flips the apparent winding, so engines usually choose the front face to match their projection. When a model suddenly shows only its inside, the winding is the first thing to check.' },
      { type: 'note', kind: 'tip', text: 'To see what a frame really did, use **RenderDoc** (free, renderdoc.org). It captures one frame of your program and lets you step through every command, inspect each attachment, the pipeline state and the shader inputs and outputs. It is the most useful debugging tool for any Vulkan engine.' },
      { type: 'quiz', question: 'With dynamic rendering, where do you say which image a draw writes into?', options: ['In the pipeline', 'In a framebuffer object', 'In the RenderingInfo passed to CmdBeginRendering', 'In the swapchain'], answer: 2, explain: 'The attachments are listed when rendering begins. The pipeline only records their formats, so it works with any image of that format.' },
      { type: 'quiz', question: 'Which LoadOp should a frame use if it is about to draw over every pixel anyway, such as a full-screen sky?', options: ['Load', 'Clear', 'DontCare', 'Store'], answer: 2, explain: 'DontCare tells the GPU the old contents will not be used, so it can skip reading or clearing them. Clear is the safe choice when some pixels are not drawn.' },
      { type: 'exercise', task: 'Draw the triangle in a **wireframe** pipeline (`polygon: PolygonMode.Line`) and check that the centre pixel now shows the background while a point on an edge does not. The top tip is at NDC (0, −0.5), pixel (400, 150).', hint: 'Create `new TrianglePipeline(gpu, swapchain.Format, polygon: PolygonMode.Line)` and read `Pixel(400, 300)` and `Pixel(400, 151)`.', solution: cs`
using Silk.NET.Maths;
using Silk.NET.Vulkan;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600) });
window.Initialize();
using var gpu = new GpuContext(window);
using var swapchain = new Swapchain(gpu, window.FramebufferSize);
using var pipeline = new TrianglePipeline(gpu, swapchain.Format, polygon: PolygonMode.Line);
using var readback = new ReadbackBuffer(gpu, swapchain.Extent);
var vk = gpu.Vk;
unsafe
{
    var poolInfo = new CommandPoolCreateInfo { SType = StructureType.CommandPoolCreateInfo, QueueFamilyIndex = gpu.GraphicsFamily };
    CommandPool pool;
    vk.CreateCommandPool(gpu.Device, &poolInfo, null, &pool);
    var allocInfo = new CommandBufferAllocateInfo { SType = StructureType.CommandBufferAllocateInfo, CommandPool = pool, Level = CommandBufferLevel.Primary, CommandBufferCount = 1 };
    CommandBuffer cmd;
    vk.AllocateCommandBuffers(gpu.Device, &allocInfo, &cmd);
    var fenceInfo = new FenceCreateInfo { SType = StructureType.FenceCreateInfo };
    Fence fence;
    vk.CreateFence(gpu.Device, &fenceInfo, null, &fence);
    uint index;
    gpu.KhrSwapchain.AcquireNextImage(gpu.Device, swapchain.Handle, ulong.MaxValue, default, fence, &index);
    vk.WaitForFences(gpu.Device, 1, &fence, true, ulong.MaxValue);
    vk.ResetFences(gpu.Device, 1, &fence);

    var begin = new CommandBufferBeginInfo { SType = StructureType.CommandBufferBeginInfo };
    vk.BeginCommandBuffer(cmd, &begin);
    TriangleFrame.Record(gpu, cmd, swapchain, index, pipeline, new ClearColorValue(0f, 0f, 0f, 1f));
    var image = swapchain.Images[index];
    Commands.Barrier(vk, cmd, image, ImageLayout.PresentSrcKhr, ImageLayout.TransferSrcOptimal,
        PipelineStageFlags2.ColorAttachmentOutputBit, AccessFlags2.ColorAttachmentWriteBit, PipelineStageFlags2.CopyBit, AccessFlags2.TransferReadBit);
    readback.CopyFrom(cmd, image);
    vk.EndCommandBuffer(cmd);
    var cmdInfo = new CommandBufferSubmitInfo { SType = StructureType.CommandBufferSubmitInfo, CommandBuffer = cmd };
    var submit = new SubmitInfo2 { SType = StructureType.SubmitInfo2, CommandBufferInfoCount = 1, PCommandBufferInfos = &cmdInfo };
    vk.QueueSubmit2(gpu.GraphicsQueue, 1, &submit, fence);
    vk.WaitForFences(gpu.Device, 1, &fence, true, ulong.MaxValue);

    Console.WriteLine($"Centre: {readback.Pixel(400, 300)}");
    Console.WriteLine($"Near the top tip: {readback.Pixel(400, 151)}");
    vk.DestroyFence(gpu.Device, fence, null);
    vk.DestroyCommandPool(gpu.Device, pool, null);
}`, output: 'Centre: (0, 0, 0)\nNear the top tip: (254, 13, 0)' }
    ],
    keyPoints: [
      'Dynamic rendering lists the attachments in CmdBeginRendering; no render pass or framebuffer objects.',
      'LoadOp and StoreOp say whether old contents are loaded or cleared and whether results are kept.',
      'Transition the swapchain image to ColorAttachmentOptimal before drawing and to PresentSrcKhr after.',
      'A draw: bind the pipeline, set the dynamic viewport and scissor, CmdDraw.',
      'Vertex outputs are interpolated: corners keep their colours, the middle is a blend.',
      'RenderDoc captures a frame so you can inspect every command and attachment.'
    ]
  },

  // ------------------------------------------------------------------ 9
  {
    slug: 'frames-in-flight',
    title: 'The render loop and frames in flight',
    summary: 'Draw every frame without the CPU waiting for the GPU: semaphores order the work on the GPU, and two frames in flight let the CPU prepare one frame while the GPU draws the other.',
    minutes: 20,
    blocks: [
      { type: 'p', text: 'The last two programs drew one frame and stopped. They also waited twice: for the swapchain image, then for the GPU to finish. In a loop, those waits mean the CPU and the GPU take turns, each idle half the time. A render loop should keep both busy.' },
      { type: 'h2', text: 'Semaphores: waiting on the GPU, not the CPU' },
      { type: 'p', text: 'A **semaphore** is a signal from one piece of GPU work to another. The CPU never waits on it; it only says, when submitting, “this work must wait for that signal”. A frame needs two kinds:' },
      { type: 'table', head: ['Semaphore', 'Signalled by', 'Waited on by'], rows: [
        ['Image available', '`AcquireNextImage`, when the screen has let go of the image', 'The submit, before writing colour (`ColorAttachmentOutput` stage)'],
        ['Render finished', 'The submit, when drawing ends', '`QueuePresent`, before showing the image']
      ] },
      { type: 'p', text: 'The wait on “image available” is only at the colour-output stage, so the GPU can already run the vertex shaders before the image is free. Small details like this are where Vulkan gets its speed.' },
      { type: 'h2', text: 'Frames in flight' },
      { type: 'p', text: 'The CPU still needs to know when it may reuse a command buffer: re-recording one the GPU is still reading is an error. So each frame **slot** gets its own command buffer, its own “image available” semaphore and a **fence**. With **two** slots, the CPU records frame N+1 while the GPU draws frame N, and only waits if it gets two whole frames ahead. Compare one, two and three frames in flight:' },
      { type: 'widget', name: 'frames-in-flight' },
      { type: 'p', text: 'Two is the usual choice. A third slot rarely helps and adds a frame of **latency**: the time between moving the mouse and seeing the model move. The “render finished” semaphores are kept **per swapchain image**, not per slot, because presenting an image is what releases them.' },
      { type: 'code', title: 'Engine/Renderer.cs', code: cs`
using Silk.NET.Vulkan;
using VkSemaphore = Silk.NET.Vulkan.Semaphore;

sealed unsafe class Renderer : IDisposable
{
    public const int FramesInFlight = 2;
    public ClearColorValue Background = new(0.02f, 0.02f, 0.03f, 1f);
    public long FramesDrawn;

    readonly GpuContext gpu;
    readonly Swapchain swapchain;
    readonly TrianglePipeline pipeline;
    readonly CommandPool pool;
    readonly CommandBuffer[] commandBuffers = new CommandBuffer[FramesInFlight];
    readonly VkSemaphore[] imageAvailable = new VkSemaphore[FramesInFlight];
    readonly Fence[] inFlight = new Fence[FramesInFlight];
    readonly VkSemaphore[] renderFinished;           // one per swapchain image
    int slot;

    public Renderer(GpuContext gpu, Swapchain swapchain, TrianglePipeline pipeline)
    {
        this.gpu = gpu; this.swapchain = swapchain; this.pipeline = pipeline;
        var vk = gpu.Vk;
        var poolInfo = new CommandPoolCreateInfo
        {
            SType = StructureType.CommandPoolCreateInfo,
            Flags = CommandPoolCreateFlags.ResetCommandBufferBit,     // re-record each buffer every frame
            QueueFamilyIndex = gpu.GraphicsFamily
        };
        CommandPool p;
        vk.CreateCommandPool(gpu.Device, &poolInfo, null, &p).Check("CreateCommandPool");
        pool = p;
        var allocInfo = new CommandBufferAllocateInfo { SType = StructureType.CommandBufferAllocateInfo, CommandPool = pool, Level = CommandBufferLevel.Primary, CommandBufferCount = FramesInFlight };
        fixed (CommandBuffer* cb = commandBuffers) vk.AllocateCommandBuffers(gpu.Device, &allocInfo, cb).Check("AllocateCommandBuffers");

        var semInfo = new SemaphoreCreateInfo { SType = StructureType.SemaphoreCreateInfo };
        var fenceInfo = new FenceCreateInfo { SType = StructureType.FenceCreateInfo, Flags = FenceCreateFlags.SignaledBit }; // so the first wait passes
        for (int i = 0; i < FramesInFlight; i++)
        {
            fixed (VkSemaphore* s = &imageAvailable[i]) vk.CreateSemaphore(gpu.Device, &semInfo, null, s).Check("CreateSemaphore");
            fixed (Fence* f = &inFlight[i]) vk.CreateFence(gpu.Device, &fenceInfo, null, f).Check("CreateFence");
        }
        renderFinished = new VkSemaphore[swapchain.Images.Length];
        for (int i = 0; i < renderFinished.Length; i++)
            fixed (VkSemaphore* s = &renderFinished[i]) vk.CreateSemaphore(gpu.Device, &semInfo, null, s).Check("CreateSemaphore");
    }

    public void DrawFrame()
    {
        var vk = gpu.Vk;
        var fence = inFlight[slot];
        var cmd = commandBuffers[slot];

        // 1. Wait until the GPU has finished the last frame that used this slot
        vk.WaitForFences(gpu.Device, 1, &fence, true, ulong.MaxValue);

        // 2. Ask for an image; the semaphore is signalled when it is really free
        uint index;
        gpu.KhrSwapchain.AcquireNextImage(gpu.Device, swapchain.Handle, ulong.MaxValue, imageAvailable[slot], default, &index).Check("AcquireNextImage");
        vk.ResetFences(gpu.Device, 1, &fence);

        // 3. Record this frame
        vk.ResetCommandBuffer(cmd, 0);
        var begin = new CommandBufferBeginInfo { SType = StructureType.CommandBufferBeginInfo, Flags = CommandBufferUsageFlags.OneTimeSubmitBit };
        vk.BeginCommandBuffer(cmd, &begin).Check("BeginCommandBuffer");
        TriangleFrame.Record(gpu, cmd, swapchain, index, pipeline, Background);
        vk.EndCommandBuffer(cmd).Check("EndCommandBuffer");

        // 4. Submit: wait for the image before writing colour; signal when done; the fence frees the slot
        var wait = new SemaphoreSubmitInfo { SType = StructureType.SemaphoreSubmitInfo, Semaphore = imageAvailable[slot], StageMask = PipelineStageFlags2.ColorAttachmentOutputBit };
        var signal = new SemaphoreSubmitInfo { SType = StructureType.SemaphoreSubmitInfo, Semaphore = renderFinished[index], StageMask = PipelineStageFlags2.AllCommandsBit };
        var cmdInfo = new CommandBufferSubmitInfo { SType = StructureType.CommandBufferSubmitInfo, CommandBuffer = cmd };
        var submit = new SubmitInfo2
        {
            SType = StructureType.SubmitInfo2,
            WaitSemaphoreInfoCount = 1, PWaitSemaphoreInfos = &wait,
            CommandBufferInfoCount = 1, PCommandBufferInfos = &cmdInfo,
            SignalSemaphoreInfoCount = 1, PSignalSemaphoreInfos = &signal
        };
        vk.QueueSubmit2(gpu.GraphicsQueue, 1, &submit, fence).Check("QueueSubmit2");

        // 5. Present once drawing has finished
        var finished = renderFinished[index];
        var handle = swapchain.Handle;
        var present = new PresentInfoKHR
        {
            SType = StructureType.PresentInfoKhr,
            WaitSemaphoreCount = 1, PWaitSemaphores = &finished,
            SwapchainCount = 1, PSwapchains = &handle, PImageIndices = &index
        };
        gpu.KhrSwapchain.QueuePresent(gpu.PresentQueue, &present).Check("QueuePresent");

        slot = (slot + 1) % FramesInFlight;
        FramesDrawn++;
    }

    public void Dispose()
    {
        var vk = gpu.Vk;
        vk.DeviceWaitIdle(gpu.Device);               // nothing may be destroyed while the GPU uses it
        foreach (var s in imageAvailable) vk.DestroySemaphore(gpu.Device, s, null);
        foreach (var s in renderFinished) vk.DestroySemaphore(gpu.Device, s, null);
        foreach (var f in inFlight) vk.DestroyFence(gpu.Device, f, null);
        vk.DestroyCommandPool(gpu.Device, pool, null);
    }
}` },
      { type: 'p', text: 'Note step 2 comes **before** the fence is reset. If acquiring fails, the fence stays signalled and the next frame does not wait forever on it. Lesson 10 relies on that.' },
      { type: 'h2', text: 'Running the loop' },
      { type: 'p', text: 'A real program would call `window.Run()`, which pumps window events and calls your render handler until the window closes. To measure, this program pumps the events itself and draws 300 frames, first with vsync (Fifo), then without:' },
      { type: 'code', title: 'RenderLoop.cs', code: cs`
using System.Diagnostics;
using Silk.NET.Maths;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);

double Measure(bool vsync)
{
    using var swapchain = new Swapchain(gpu, window.FramebufferSize, vsync);
    using var pipeline = new TrianglePipeline(gpu, swapchain.Format);
    using var renderer = new Renderer(gpu, swapchain, pipeline);
    for (int i = 0; i < 30; i++) { window.DoEvents(); renderer.DrawFrame(); }   // warm up
    var clock = Stopwatch.StartNew();
    for (int i = 0; i < 300; i++) { window.DoEvents(); renderer.DrawFrame(); }
    double fps = 300 / clock.Elapsed.TotalSeconds;
    Console.WriteLine($"{swapchain.PresentMode}: {renderer.FramesDrawn} frames drawn");
    return fps;
}

double withVsync = Measure(vsync: true);
double without = Measure(vsync: false);
Console.WriteLine($"With vsync: about {Math.Round(withVsync / 10) * 10} frames per second (the display's refresh rate)");
Console.WriteLine($"Without vsync: more than 5 times faster: {without > 5 * withVsync}");`, output: 'PresentModeFifoKhr: 330 frames drawn\nPresentModeImmediateKhr: 330 frames drawn\nWith vsync: about 60 frames per second (the display\'s refresh rate)\nWithout vsync: more than 5 times faster: True' },
      { type: 'p', text: 'With Fifo, the loop runs at the screen’s refresh rate: the GPU finishes a frame in well under a millisecond, then waits for the vblank. Without vsync, the same loop runs many times faster, which would only burn battery: nobody can see frames the screen never shows. For a BIM viewer, keep vsync on, and later (module 5) draw only when something changes.' },
      { type: 'note', kind: 'warn', text: 'Never call `DeviceWaitIdle` or wait on a fence right after every submit inside the loop. It is the easiest way to make Vulkan as slow as the simplest OpenGL program, because the CPU and GPU then take turns instead of working at the same time.' },
      { type: 'quiz', question: 'What is the difference between a fence and a semaphore?', options: ['None; they are aliases', 'A fence is waited on by the CPU; a semaphore is waited on by GPU work (a submit or a present)', 'Semaphores are faster fences', 'Fences order queues; semaphores order threads'], answer: 1, explain: 'Fences report GPU progress to the CPU. Semaphores chain GPU operations together without involving the CPU.' },
      { type: 'quiz', question: 'With 2 frames in flight, when does the CPU have to wait in DrawFrame?', options: ['Every frame', 'Only when it is two frames ahead of the GPU, at the fence of the slot it wants to reuse', 'Never', 'Only at present'], answer: 1, explain: 'The fence of slot N is waited on only when slot N comes round again, which is two frames later. If the GPU has finished by then, the wait returns immediately.' },
      { type: 'exercise', task: 'Count how long the CPU spends waiting at the fence in step 1, over 120 frames with vsync on, and print what fraction of the time it was waiting. Add a `Stopwatch` around `WaitForFences` by copying `DrawFrame`’s first step into your own loop, or measure the whole `DrawFrame` call and compare it with the frame time.', hint: 'Simplest: time each `DrawFrame()` call and sum them. With Fifo, most of each frame is spent inside it, waiting (either at the fence or in AcquireNextImage).', solution: cs`
using System.Diagnostics;
using Silk.NET.Maths;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600) });
window.Initialize();
using var gpu = new GpuContext(window);
using var swapchain = new Swapchain(gpu, window.FramebufferSize, vsync: true);
using var pipeline = new TrianglePipeline(gpu, swapchain.Format);
using var renderer = new Renderer(gpu, swapchain, pipeline);
for (int i = 0; i < 30; i++) { window.DoEvents(); renderer.DrawFrame(); }

var total = Stopwatch.StartNew();
var inDraw = new Stopwatch();
for (int i = 0; i < 120; i++)
{
    window.DoEvents();
    inDraw.Start(); renderer.DrawFrame(); inDraw.Stop();
}
double share = inDraw.Elapsed / total.Elapsed;
Console.WriteLine($"Time inside DrawFrame: more than 80%: {share > 0.8}");`, output: 'Time inside DrawFrame: more than 80%: True' }
    ],
    keyPoints: [
      'Semaphores order GPU work (acquire → draw → present) without the CPU waiting.',
      'Fences tell the CPU when a frame slot’s command buffer may be reused.',
      'Two frames in flight let the CPU record one frame while the GPU draws another.',
      'Keep “render finished” semaphores per swapchain image; the rest per frame slot.',
      'Reset the fence only after a successful acquire.',
      'With Fifo the loop runs at the refresh rate; without vsync it runs flat out for no visible gain.'
    ]
  },

  // ------------------------------------------------------------------ 10
  {
    slug: 'swapchain-recreation',
    title: 'Resizing: recreating the swapchain',
    summary: 'When the window changes size the swapchain no longer fits. Detect it from OutOfDate and Suboptimal results and the resize event, rebuild the swapchain, and skip drawing while the window is minimised.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'A swapchain is made for one size. When the user resizes the window, maximises it or drags it to a screen with different scaling, the images no longer match the window. Vulkan tells you in two ways:' },
      { type: 'table', head: ['Result', 'From', 'Meaning', 'What to do'], rows: [
        ['`ErrorOutOfDateKhr`', 'Acquire or present', 'The swapchain can no longer be used', 'Recreate it; skip this frame'],
        ['`SuboptimalKhr`', 'Acquire or present', 'It still works, but no longer matches exactly', 'Finish the frame, then recreate'],
        ['(nothing)', '', 'Some platforms report neither on resize', 'Also listen to the window’s resize event']
      ] },
      { type: 'p', text: '`SuboptimalKhr` is a positive (success) code, so `Check` lets it through. The third row is why the engine also watches the window’s `FramebufferResize` event.' },
      { type: 'h2', text: 'Recreating' },
      { type: 'p', text: 'Recreating means: wait until the GPU is idle, create a new swapchain (passing the old one as `OldSwapchain`, which lets the driver reuse resources and keep showing the old images until the new ones are ready), then destroy the old one. The pipeline can stay: its viewport is dynamic, and the format does not change on a resize.' },
      { type: 'h2', text: 'Minimised windows' },
      { type: 'p', text: 'A minimised window has a framebuffer of 0 × 0, and a swapchain cannot have size zero. The renderer simply skips frames until the window is restored.' },
      { type: 'p', text: 'Here is the renderer again, now owning its swapchain and pipeline and handling all three cases. Replace the previous `Renderer.cs` with it:' },
      { type: 'code', title: 'Engine/Renderer.cs', code: cs`
using Silk.NET.Vulkan;
using Silk.NET.Windowing;
using VkSemaphore = Silk.NET.Vulkan.Semaphore;

sealed unsafe class Renderer : IDisposable
{
    public const int FramesInFlight = 2;
    public ClearColorValue Background = new(0.02f, 0.02f, 0.03f, 1f);
    public long FramesDrawn, FramesSkipped;
    public int Recreations;

    readonly GpuContext gpu;
    readonly IWindow window;
    readonly bool vsync;
    Swapchain swapchain;
    readonly TrianglePipeline pipeline;
    readonly CommandPool pool;
    readonly CommandBuffer[] commandBuffers = new CommandBuffer[FramesInFlight];
    readonly VkSemaphore[] imageAvailable = new VkSemaphore[FramesInFlight];
    readonly Fence[] inFlight = new Fence[FramesInFlight];
    VkSemaphore[] renderFinished = [];
    bool resized;
    int slot;

    public Extent2D Extent => swapchain.Extent;

    public Renderer(GpuContext gpu, IWindow window, bool vsync = true)
    {
        this.gpu = gpu; this.window = window; this.vsync = vsync;
        swapchain = new Swapchain(gpu, window.FramebufferSize, vsync);
        pipeline = new TrianglePipeline(gpu, swapchain.Format);
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

    /// <summary>Draws one frame. Returns false if the frame was skipped (minimised, or the swapchain was rebuilt).</summary>
    public bool DrawFrame()
    {
        var size = window.FramebufferSize;
        if (size.X == 0 || size.Y == 0) { FramesSkipped++; return false; }    // minimised: nothing to draw into

        var vk = gpu.Vk;
        var fence = inFlight[slot];
        var cmd = commandBuffers[slot];
        vk.WaitForFences(gpu.Device, 1, &fence, true, ulong.MaxValue);

        uint index;
        var acquired = gpu.KhrSwapchain.AcquireNextImage(gpu.Device, swapchain.Handle, ulong.MaxValue, imageAvailable[slot], default, &index);
        if (acquired == Result.ErrorOutOfDateKhr) { Recreate(); FramesSkipped++; return false; }  // fence not reset: still signalled
        acquired.Check("AcquireNextImage");                                    // Success or SuboptimalKhr
        vk.ResetFences(gpu.Device, 1, &fence);

        vk.ResetCommandBuffer(cmd, 0);
        var begin = new CommandBufferBeginInfo { SType = StructureType.CommandBufferBeginInfo, Flags = CommandBufferUsageFlags.OneTimeSubmitBit };
        vk.BeginCommandBuffer(cmd, &begin).Check("BeginCommandBuffer");
        TriangleFrame.Record(gpu, cmd, swapchain, index, pipeline, Background);
        vk.EndCommandBuffer(cmd).Check("EndCommandBuffer");

        var wait = new SemaphoreSubmitInfo { SType = StructureType.SemaphoreSubmitInfo, Semaphore = imageAvailable[slot], StageMask = PipelineStageFlags2.ColorAttachmentOutputBit };
        var signal = new SemaphoreSubmitInfo { SType = StructureType.SemaphoreSubmitInfo, Semaphore = renderFinished[index], StageMask = PipelineStageFlags2.AllCommandsBit };
        var cmdInfo = new CommandBufferSubmitInfo { SType = StructureType.CommandBufferSubmitInfo, CommandBuffer = cmd };
        var submit = new SubmitInfo2
        {
            SType = StructureType.SubmitInfo2,
            WaitSemaphoreInfoCount = 1, PWaitSemaphoreInfos = &wait,
            CommandBufferInfoCount = 1, PCommandBufferInfos = &cmdInfo,
            SignalSemaphoreInfoCount = 1, PSignalSemaphoreInfos = &signal
        };
        vk.QueueSubmit2(gpu.GraphicsQueue, 1, &submit, fence).Check("QueueSubmit2");

        var finished = renderFinished[index];
        var handle = swapchain.Handle;
        var present = new PresentInfoKHR { SType = StructureType.PresentInfoKhr, WaitSemaphoreCount = 1, PWaitSemaphores = &finished, SwapchainCount = 1, PSwapchains = &handle, PImageIndices = &index };
        var presented = gpu.KhrSwapchain.QueuePresent(gpu.PresentQueue, &present);
        slot = (slot + 1) % FramesInFlight;
        FramesDrawn++;

        if (presented == Result.ErrorOutOfDateKhr || presented == Result.SuboptimalKhr || resized) Recreate();
        else presented.Check("QueuePresent");
        return true;
    }

    void Recreate()
    {
        resized = false;
        var size = window.FramebufferSize;
        if (size.X == 0 || size.Y == 0) return;                 // minimised: try again when restored
        gpu.Vk.DeviceWaitIdle(gpu.Device);
        var old = swapchain;
        swapchain = new Swapchain(gpu, size, vsync, old.Handle);
        old.Dispose();
        DestroyRenderFinished();
        CreateRenderFinished();                                 // the image count may have changed
        Recreations++;
    }

    void CreateRenderFinished()
    {
        var semInfo = new SemaphoreCreateInfo { SType = StructureType.SemaphoreCreateInfo };
        renderFinished = new VkSemaphore[swapchain.Images.Length];
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
        vk.DeviceWaitIdle(gpu.Device);
        DestroyRenderFinished();
        foreach (var s in imageAvailable) vk.DestroySemaphore(gpu.Device, s, null);
        foreach (var f in inFlight) vk.DestroyFence(gpu.Device, f, null);
        vk.DestroyCommandPool(gpu.Device, pool, null);
        pipeline.Dispose();
        swapchain.Dispose();
    }
}` },
      { type: 'p', text: 'The program resizes the window from code, as a user dragging its border would, then minimises and restores it, drawing frames all along:' },
      { type: 'code', title: 'Resize.cs', code: cs`
using Silk.NET.Maths;
using Silk.NET.Windowing;

using var window = Window.Create(WindowOptions.DefaultVulkan with { Size = new Vector2D<int>(800, 600), Title = "BIM Viewer" });
window.Initialize();
using var gpu = new GpuContext(window);
using var renderer = new Renderer(gpu, window);

void Frames(int n) { for (int i = 0; i < n; i++) { window.DoEvents(); renderer.DrawFrame(); } }
void Report(string step) =>
    Console.WriteLine($"{step,-22} swapchain {renderer.Extent.Width} x {renderer.Extent.Height}, rebuilt {renderer.Recreations}x, drawn {renderer.FramesDrawn}, skipped {renderer.FramesSkipped}");

Frames(30);  Report("Start");
window.Size = new Vector2D<int>(1024, 640);
Frames(30);  Report("Resized to 1024 x 640");
window.WindowState = WindowState.Minimized;
Frames(30);  Report("Minimised");
window.WindowState = WindowState.Normal;
Frames(30);  Report("Restored");`, output: 'Start                  swapchain 800 x 600, rebuilt 0x, drawn 30, skipped 0\nResized to 1024 x 640  swapchain 1024 x 640, rebuilt 1x, drawn 60, skipped 0\nMinimised              swapchain 1024 x 640, rebuilt 1x, drawn 60, skipped 30\nRestored               swapchain 1024 x 640, rebuilt 2x, drawn 90, skipped 30' },
      { type: 'p', text: 'The resize is caught and the swapchain rebuilt at 1024 × 640. While minimised, all 30 frames are skipped and the swapchain is left alone. Restoring fires the resize event again, so it is rebuilt once more, at the same size: harmless, and simpler than tracking whether the size really changed.' },
      { type: 'note', kind: 'info', text: 'A resize by dragging produces many size changes in a row. Recreating on each one is fine on modern drivers (passing `OldSwapchain` keeps it cheap), but some engines wait until the size has been stable for a frame or two.' },
      { type: 'h2', text: 'What you have built' },
      { type: 'p', text: 'This is the complete skeleton of every Vulkan renderer: a context (instance, surface, device, queues), a swapchain that follows the window, a pipeline, and a loop that keeps two frames in flight. From here on the frame gets richer (vertex buffers, a camera, depth, textures, lighting), but this structure stays the same.' },
      { type: 'quiz', question: 'AcquireNextImage returns SuboptimalKhr. What should the renderer do?', options: ['Throw an exception', 'Skip the frame', 'Draw and present this frame, then recreate the swapchain', 'Ignore it forever'], answer: 2, explain: 'Suboptimal is a success code: the image is valid and the semaphore will be signalled. Finish the frame normally, then rebuild.' },
      { type: 'quiz', question: 'Why must the fence not be reset before AcquireNextImage succeeds?', options: ['Resetting is slow', 'If acquire fails and the frame is skipped, nothing would signal the fence again, and the next wait on it would hang', 'Fences cannot be reset twice', 'It is required by the swapchain'], answer: 1, explain: 'An unsignalled fence with no submit pending is never signalled. Resetting only after a successful acquire keeps the skip path safe.' }
    ],
    keyPoints: [
      'A swapchain is made for one size; resizing the window makes it out of date.',
      'ErrorOutOfDateKhr: recreate and skip the frame. SuboptimalKhr: finish the frame, then recreate.',
      'Also watch the window’s framebuffer-resize event; not every platform reports OutOfDate.',
      'Recreate by waiting for the GPU, creating a new swapchain with OldSwapchain set, then destroying the old one.',
      'Skip frames while the framebuffer is 0 × 0 (minimised).',
      'With a dynamic viewport the pipeline survives resizes unchanged.'
    ]
  },
];
