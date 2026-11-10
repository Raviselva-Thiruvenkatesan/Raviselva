import { Lesson } from '../learn.types';
import { cs } from '../csharp/cs';

/**
 * Vulkan module 1. Every C# sample was run with Silk.NET 2.23 on an Intel Iris Xe (Vulkan 1.4 driver);
 * the outputs are from that machine, so device names and numbers differ on other GPUs.
 */
export const FOUNDATIONS: Lesson[] = [
  // ------------------------------------------------------------------ 1
  {
    slug: 'what-is-vulkan',
    title: 'What Vulkan is, and how a GPU draws a frame',
    summary: 'Vulkan is a low-level, explicit graphics and compute API. See what a GPU does to turn triangles into pixels, what Vulkan makes you do yourself, and how this course builds a render engine step by step.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'A **GPU** (graphics processing unit) is a processor built for doing the same small job on huge amounts of data at once. A CPU has a handful of fast cores; a GPU has thousands of simpler ones. Drawing a 3D model is exactly that kind of job: transform every corner of every triangle, then colour every pixel the triangles cover, millions of times a second.' },
      { type: 'p', text: 'Your program cannot run code on the GPU directly. It talks to the **driver** through a graphics API. **Vulkan** is one of those APIs, published by the Khronos Group (who also look after OpenGL) in 2016. It runs on Windows, Linux and Android, and on macOS and iOS through a translation layer called MoltenVK.' },
      { type: 'h2', text: 'The journey of one frame' },
      { type: 'p', text: 'Every frame of a 3D view follows the same route, from your C# code to the light leaving the screen. Step through it below. For each step, switch between OpenGL and Vulkan to see who does the work: the driver, or you.' },
      { type: 'widget', name: 'gpu-frame' },
      { type: 'p', text: 'The middle of that route, from vertices to pixels, is the **graphics pipeline**. Two of its stages run small programs you write, called **shaders**: the **vertex shader** runs once per vertex and works out where it lands on the screen, and the **fragment shader** runs once per covered pixel and works out its colour. The stages in between (assembling triangles, clipping, rasterising, depth testing, blending) are fixed hardware that you configure.' },
      { type: 'h2', text: 'Explicit: you do what the driver used to do' },
      { type: 'p', text: 'Older APIs such as OpenGL and Direct3D 11 hide most of the GPU behind a simple model: you set some state, call draw, and the driver works out the rest. That is easy to learn, but the driver has to guess. It guesses when memory can be reused, when work must wait for other work, and which state combinations to compile into GPU code, and it does all this on one thread, while your frame is being drawn.' },
      { type: 'p', text: 'Vulkan removes the guessing by making you say exactly what you want:' },
      { type: 'table', head: ['Job', 'OpenGL', 'Vulkan'], rows: [
        ['Choosing the GPU', 'The system picks one', 'You list the GPUs and pick one'],
        ['GPU memory', 'Driver allocates behind each buffer', 'You allocate memory and place buffers and images in it'],
        ['Sending work', 'Each call is sent as you make it', 'You record command buffers, then submit them to a queue'],
        ['Waiting for work', 'Driver tracks what depends on what', 'You add barriers, semaphores and fences'],
        ['Pipeline state', 'Set piece by piece; compiled when you draw', 'Built in advance into pipeline objects'],
        ['Error checking', 'Always on, costs time on every call', 'Off; you turn on validation layers while developing'],
        ['Shaders', 'GLSL text, compiled by the driver', 'SPIR-V binary, compiled ahead of time'],
        ['Threads', 'One context per thread, hard to share', 'Record commands on many threads at once']
      ] },
      { type: 'p', text: 'The price is code. A program that draws one triangle takes a few dozen lines in OpenGL and several hundred in Vulkan. The reward is control: no hidden pauses, work spread over all CPU cores, and memory and synchronisation planned by someone who knows what the program will do next (you).' },
      { type: 'note', kind: 'info', text: 'Direct3D 12 (Windows and Xbox) and Metal (Apple) are explicit APIs of the same generation. The ideas in this course (command buffers, queues, pipelines, barriers, descriptors) carry over to them almost one to one.' },
      { type: 'h2', text: 'Why build your own engine for BIM?' },
      { type: 'p', text: 'A building model is a tough thing to draw. A hospital can have hundreds of thousands of elements and tens of millions of triangles, most of them repeated (the same door, the same light fitting), and users expect to orbit it smoothly, cut sections through it and click any element to select it. Doing that well needs control over memory, over how many draw calls are made and over what the GPU skips, which is exactly what Vulkan gives you.' },
      { type: 'h2', text: 'How this course is organised' },
      { type: 'table', head: ['Module', 'You will build'], rows: [
        ['Foundations (this one)', 'A program that finds the GPU, checks what it can do and opens a connection to it'],
        ['Your first triangle', 'A window, a swapchain, shaders and a pipeline: one coloured triangle, drawn every frame'],
        ['Buffers, memory and descriptors', 'Meshes in GPU memory and data the shaders can read'],
        ['Images and 3D', 'A camera, depth testing, textures and real models'],
        ['Engine architecture', 'The structure of a real engine: resources, materials, a render graph'],
        ['Lighting and shading', 'Lit, shadowed, physically based materials'],
        ['Large scenes and performance', 'Culling, instancing and GPU-driven drawing for very large models'],
        ['Master level', 'A BIM viewer: picking, section planes, outlines and transparency']
      ] },
      { type: 'p', text: 'All code is C#, using **Silk.NET**, a .NET library that exposes the Vulkan API with the same function and structure names as the official C documentation. That matters: when you read the Vulkan specification or a C++ tutorial, the calls match what you write here. The maths (vectors, matrices, transforms) is covered in the BIM Math course; this course uses it and links back when needed.' },
      { type: 'code', title: 'The shape of a Vulkan program', code: cs`
Startup (once)                     Every frame
---------------------------        ------------------------------------------
Create the instance                Wait until this frame's previous use ends
Pick a physical device (GPU)       Get the next swapchain image
Create the logical device          Record a command buffer: draw everything
Create the swapchain               Submit it to the graphics queue
Create pipelines, buffers,         Present the image on the screen
  images, descriptors
                                   Shutdown: wait for the GPU, destroy all
                                   objects in reverse order of creation` },
      { type: 'p', text: 'This module covers the first three startup steps: the **instance** (your connection to the Vulkan library), the **physical device** (the GPU you choose) and the **logical device** (your open session with that GPU). Everything else in Vulkan is created from the logical device.' },
      { type: 'quiz', question: 'In Vulkan, who decides when the GPU must wait for one piece of work to finish before starting the next?', options: ['The driver, by tracking every resource', 'Your program, with barriers, semaphores and fences', 'The operating system', 'The GPU decides at run time'], answer: 1, explain: 'Vulkan does not track dependencies for you. You state them explicitly. That is more work, but nothing waits unless you asked it to.' },
      { type: 'quiz', question: 'Which part of the graphics pipeline runs once for every pixel a triangle covers?', options: ['The vertex shader', 'The rasteriser', 'The fragment shader', 'The swapchain'], answer: 2, explain: 'The rasteriser finds which pixels a triangle covers; the fragment shader then runs once for each of them and outputs its colour.' }
    ],
    keyPoints: [
      'A GPU runs the same small program on thousands of items in parallel; drawing is that kind of job.',
      'Vulkan is an explicit API: you choose the GPU, allocate memory, record commands and synchronise work yourself.',
      'In return there is no hidden driver work, recording can use many threads, and error checking costs nothing in release builds.',
      'The graphics pipeline runs your vertex shader per vertex and fragment shader per covered pixel; the stages between are configurable hardware.',
      'Startup is instance, physical device, logical device; everything else is created from the logical device.'
    ]
  },
  // ------------------------------------------------------------------ 2
  {
    slug: 'setup-silk-net',
    title: 'Setting up: .NET, Silk.NET and your first Vulkan call',
    summary: 'Install what you need, create a project with Silk.NET.Vulkan, and make your first call: ask the Vulkan loader which version it supports.',
    minutes: 12,
    blocks: [
      { type: 'h2', text: 'What you need' },
      { type: 'ul', items: [
        '**The .NET 10 SDK** (or later). The C# course’s first lesson shows how to install it.',
        '**An up-to-date GPU driver.** The Vulkan runtime ships with the driver from NVIDIA, AMD or Intel. On Windows it puts `vulkan-1.dll` (the Vulkan **loader**) in the system folder.',
        '**The Vulkan SDK** from LunarG (vulkan.lunarg.com). You do not need it for this module, but you will from the next one: it contains the **validation layers** that check your calls, and `glslc`, the shader compiler. Install it now if you like.',
        'An editor: Visual Studio, VS Code with the C# Dev Kit, or Rider.'
      ] },
      { type: 'note', kind: 'tip', text: 'To check that Vulkan works at all, run `vulkaninfo --summary` in a terminal. It comes with the driver on most Windows PCs (and with the SDK). It lists your GPUs and the Vulkan version each one supports.' },
      { type: 'h2', text: 'Create the project' },
      { type: 'code', title: 'Terminal', code: cs`
dotnet new console -n VkEngine
cd VkEngine
dotnet add package Silk.NET.Vulkan --version 2.23.0
dotnet add package Silk.NET.Vulkan.Extensions.KHR --version 2.23.0
dotnet add package Silk.NET.Vulkan.Extensions.EXT --version 2.23.0` },
      { type: 'p', text: 'The first package is the core API. Vulkan extensions come in separate packages: `KHR` holds the window-surface and swapchain functions you need from the next module, and `EXT` holds the debug functions.' },
      { type: 'p', text: 'Vulkan is a C API, and calling it means passing pointers to structures. C# allows that inside `unsafe` code, which must be switched on in the project file:' },
      { type: 'code', title: 'VkEngine.csproj', code: cs`
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <AllowUnsafeBlocks>true</AllowUnsafeBlocks>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Silk.NET.Vulkan" Version="2.23.0" />
    <PackageReference Include="Silk.NET.Vulkan.Extensions.KHR" Version="2.23.0" />
    <PackageReference Include="Silk.NET.Vulkan.Extensions.EXT" Version="2.23.0" />
  </ItemGroup>
</Project>` },
      { type: 'p', text: '`unsafe` does not make the program dangerous by itself. It lets you use pointers, which the C# compiler cannot check, so mistakes such as reading freed memory become your responsibility, just as they are in C. Silk.NET also offers `ref`, `out` and `Span` overloads for many calls; this course uses whichever reads most clearly, and pointers where Vulkan structures contain them.' },
      { type: 'h2', text: 'Your first Vulkan call' },
      { type: 'p', text: '`Vk.GetApi()` loads the Vulkan loader and returns an object with every Vulkan function on it. The C function `vkEnumerateInstanceVersion` becomes `vk.EnumerateInstanceVersion`: Silk.NET drops the `vk` prefix and keeps the rest of the name.' },
      { type: 'code', title: 'Program.cs', code: cs`
using Silk.NET.Core;
using Silk.NET.Vulkan;

Vk vk = Vk.GetApi();

uint packed = 0;
Result result = vk.EnumerateInstanceVersion(ref packed);

var version = (Version32)packed;
Console.WriteLine($"Result: {result}");
Console.WriteLine($"Vulkan {version.Major}.{version.Minor}.{version.Patch} is available");
Console.WriteLine($"Packed as one number: {packed} (0x{packed:X8})");`, output: 'Result: Success\nVulkan 1.4.304 is available\nPacked as one number: 4210992 (0x00404130)' },
      { type: 'p', text: 'Run it with `dotnet run`. Your version will depend on your driver. Three things to notice:' },
      { type: 'ul', items: [
        'Vulkan functions return a **`Result`** instead of throwing exceptions. `Success` is 0; the next lesson shows the others and how to check them.',
        'This is the version of the **loader** and instance-level support. Each GPU reports its own version too (lesson 5), and you can only use what both support.',
        'The version is **packed** into one 32-bit number. `Version32` unpacks it. Try the widget to see how the bits are laid out.'
      ] },
      { type: 'widget', name: 'version-bits' },
      { type: 'p', text: 'You also need to pack versions yourself, to tell Vulkan which version your program is written for. Silk.NET has constants for the common ones and a helper for the rest:' },
      { type: 'code', title: 'Versions.cs', code: cs`
using Silk.NET.Core;
using Silk.NET.Vulkan;

uint v13 = Vk.Version13;
uint mine = Vk.MakeVersion(1, 3, 280);

Console.WriteLine($"Vk.Version13 = {v13}  ({((Version32)v13).Major}.{((Version32)v13).Minor}.{((Version32)v13).Patch})");
Console.WriteLine($"MakeVersion(1, 3, 280) = {mine}");
Console.WriteLine($"Is the loader at least 1.3? {LoaderVersion() >= Vk.Version13}");

static uint LoaderVersion()
{
    uint v = 0;
    Vk.GetApi().EnumerateInstanceVersion(ref v);
    return v;
}`, output: 'Vk.Version13 = 4206592  (1.3.0)\nMakeVersion(1, 3, 280) = 4206872\nIs the loader at least 1.3? True' },
      { type: 'p', text: 'Because the major number sits in the highest bits, packed versions compare correctly with `>=`. This course targets **Vulkan 1.3**, which every current desktop driver supports and which made several features core that used to be extensions: dynamic rendering (no render pass objects), synchronization2 (simpler barriers) and more.' },
      { type: 'note', kind: 'warn', text: 'If `Vk.GetApi()` throws a `FileNotFoundException` or similar, the loader was not found: update your GPU driver. In a virtual machine or on a server without a GPU there may be no Vulkan driver at all.' },
      { type: 'exercise', task: 'Unpack a version yourself, without `Version32`. Vulkan stores the **variant** in bits 29–31, the **major** version in bits 22–28, the **minor** in bits 12–21 and the **patch** in bits 0–11. Write `Unpack(uint v)` returning the four parts, and print them for `Vk.MakeVersion(1, 3, 280)` and for the loader’s version.', hint: 'Shift right to move the field down to bit 0, then AND with a mask of the field’s width: 7 bits is `0x7F`, 10 bits is `0x3FF`, 12 bits is `0xFFF`.', solution: cs`
using Silk.NET.Vulkan;

static (uint Variant, uint Major, uint Minor, uint Patch) Unpack(uint v) =>
    (v >> 29, (v >> 22) & 0x7F, (v >> 12) & 0x3FF, v & 0xFFF);

uint loader = 0;
Vk.GetApi().EnumerateInstanceVersion(ref loader);

Console.WriteLine(Unpack(Vk.MakeVersion(1, 3, 280)));
Console.WriteLine(Unpack(loader));`, output: '(0, 1, 3, 280)\n(0, 1, 4, 304)' }
    ],
    keyPoints: [
      'The Vulkan loader (vulkan-1.dll on Windows) comes with the GPU driver; the Vulkan SDK adds validation layers and tools.',
      'Silk.NET.Vulkan exposes Vulkan with the C names minus the vk prefix: vkEnumerateInstanceVersion is vk.EnumerateInstanceVersion.',
      'Turn on AllowUnsafeBlocks: Vulkan structures contain pointers.',
      'Vulkan functions return a Result code rather than throwing.',
      'Versions are packed into 32 bits (variant, major, minor, patch) and compare correctly as numbers.'
    ]
  },
  // ------------------------------------------------------------------ 3
  {
    slug: 'api-patterns',
    title: 'How the API works: create-info structs, handles and results',
    summary: 'Nearly every Vulkan call follows one of a few patterns. Learn them once: create-info structures with sType and pNext, opaque handles, Result codes, the two-call enumeration and C strings.',
    minutes: 16,
    blocks: [
      { type: 'p', text: 'Vulkan has hundreds of functions, but they come in a few shapes. Once you recognise them, the rest of the API reads easily.' },
      { type: 'h2', text: 'Pattern 1: create with a create-info structure' },
      { type: 'p', text: 'Objects are created by filling in a structure that describes them and passing a pointer to it. Every create function has the same parameters: the parent object (if any), the create-info, an optional custom memory allocator, and where to write the new handle.' },
      { type: 'code', title: 'The C declaration', code: cs`
VkResult vkCreateInstance(
    const VkInstanceCreateInfo*   pCreateInfo,   // what to create
    const VkAllocationCallbacks*  pAllocator,    // custom CPU allocator, usually NULL
    VkInstance*                   pInstance);    // receives the new handle

VkResult vkCreateDevice(
    VkPhysicalDevice              physicalDevice, // the parent
    const VkDeviceCreateInfo*     pCreateInfo,
    const VkAllocationCallbacks*  pAllocator,
    VkDevice*                     pDevice);` },
      { type: 'p', text: 'Here is the smallest instance you can create, and its destruction. Every object you create must be destroyed by the matching `Destroy` call, with the same allocator (here `null`).' },
      { type: 'code', title: 'CreateAndDestroy.cs', code: cs`
using Silk.NET.Vulkan;

Vk vk = Vk.GetApi();

unsafe
{
    var appInfo = new ApplicationInfo
    {
        SType = StructureType.ApplicationInfo,
        ApiVersion = Vk.Version13
    };
    var createInfo = new InstanceCreateInfo
    {
        SType = StructureType.InstanceCreateInfo,
        PApplicationInfo = &appInfo
    };

    Instance instance;
    Result r = vk.CreateInstance(&createInfo, null, &instance);
    Console.WriteLine($"CreateInstance: {r}");
    Console.WriteLine($"Handle is set: {instance.Handle != 0}");

    vk.DestroyInstance(instance, null);
    Console.WriteLine("Destroyed");
}`, output: 'CreateInstance: Success\nHandle is set: True\nDestroyed' },
      { type: 'ul', items: [
        '**`SType`** names the structure’s own type. It looks redundant in C#, but Vulkan is a C API: a function receiving a pointer reads `sType` first to know what it is looking at. Leaving it wrong is a classic bug. Silk.NET’s structure constructors fill it in for you (`new ApplicationInfo(apiVersion: Vk.Version13)`), but this course sets it explicitly at first so you see it.',
        '**`&appInfo`** is a pointer to a local variable. The create-info points to the app info, and the call reads both before it returns, so locals are fine. Vulkan never keeps your pointers after a call returns.',
        'The **handle** is an opaque number, not a .NET object. The garbage collector knows nothing about it, so forgetting to destroy it leaks it until the process ends.'
      ] },
      { type: 'h2', text: 'Pattern 2: pNext chains' },
      { type: 'p', text: 'Most structures also have a **`PNext`** field, a pointer to another structure. It is how Vulkan grows without breaking old programs: a new feature adds a new structure, and you link it into the chain. Each link starts with `SType` and `PNext`, so the driver can walk the chain and recognise the parts it understands.' },
      { type: 'code', title: 'A chain of three structures', code: cs`
PhysicalDeviceFeatures2  ──PNext──►  PhysicalDeviceVulkan12Features  ──PNext──►  PhysicalDeviceVulkan13Features  ──PNext──►  null
  SType = ...Features2                 SType = ...Vulkan12Features                  SType = ...Vulkan13Features
  Features (1.0 features)              TimelineSemaphore, ...                       DynamicRendering, Synchronization2, ...` },
      { type: 'p', text: 'You will use exactly this chain in lesson 5 to ask the GPU which features it has, and again in lesson 7 to switch them on.' },
      { type: 'h2', text: 'Pattern 3: check the Result' },
      { type: 'p', text: 'Every function that can fail returns a `Result`. Zero is `Success`, positive values are successes with extra information, and negative values are errors. These are the values printed by Silk.NET on the test machine for this course:' },
      { type: 'table', head: ['Result', 'Value', 'Meaning'], rows: [
        ['Success', '0', 'Done.'],
        ['Incomplete', '5', 'A success: your array was too small, so only part of the list was written.'],
        ['ErrorOutOfDeviceMemory', '-2', 'The GPU’s memory is full.'],
        ['ErrorInitializationFailed', '-3', 'The driver could not start, for an implementation-specific reason.'],
        ['ErrorDeviceLost', '-4', 'The GPU stopped responding (a hang, a crash or a driver reset).'],
        ['ErrorLayerNotPresent', '-6', 'You asked for a layer that is not installed.'],
        ['ErrorExtensionNotPresent', '-7', 'You asked for an extension that is not supported.'],
        ['ErrorFeatureNotPresent', '-8', 'You asked for a device feature the GPU does not have.'],
        ['ErrorIncompatibleDriver', '-9', 'No driver supports the Vulkan version you asked for.']
      ] },
      { type: 'p', text: 'Checking every call by hand is tedious, so engines wrap it. This small helper turns any failure into an exception with the name of the call. The rest of this lesson’s programs use it:' },
      { type: 'code', title: 'VkHelpers.cs', code: cs`
using Silk.NET.Vulkan;

static class VkHelpers
{
    /// <summary>Throws if a Vulkan call failed. Positive codes such as Incomplete are not failures.</summary>
    public static Result Check(this Result result, string call)
    {
        if (result < 0) throw new InvalidOperationException($"{call} failed: {result}");
        return result;
    }
}` },
      { type: 'h2', text: 'Pattern 4: enumerate in two calls' },
      { type: 'p', text: 'Functions that return a list (extensions, GPUs, queue families, swapchain images, …) do not allocate memory for you. You call them **twice**: first with no array, to get the count; then again with an array of that size, to fill it. Step through it:' },
      { type: 'widget', name: 'enumerate-twice' },
      { type: 'code', title: 'TwoCalls.cs', code: cs`
using Silk.NET.Core.Native;
using Silk.NET.Vulkan;

Vk vk = Vk.GetApi();

unsafe
{
    // Call 1: no array, so Vulkan only writes the count.
    uint count = 0;
    vk.EnumerateInstanceExtensionProperties((byte*)null, &count, null).Check("count");
    Console.WriteLine($"There are {count} instance extensions");

    // Call 2: an array of that size, which Vulkan fills.
    var props = new ExtensionProperties[count];
    fixed (ExtensionProperties* p = props)
        vk.EnumerateInstanceExtensionProperties((byte*)null, &count, p).Check("fill");

    foreach (var e in props.Take(3))
        Console.WriteLine($"  {SilkMarshal.PtrToString((nint)e.ExtensionName)} (revision {e.SpecVersion})");

    // Too small an array is not an error: Vulkan fills what fits and says Incomplete.
    uint two = 2;
    var small = new ExtensionProperties[2];
    fixed (ExtensionProperties* p = small)
    {
        Result r = vk.EnumerateInstanceExtensionProperties((byte*)null, &two, p).Check("small");
        Console.WriteLine($"With room for 2: {r}, wrote {two}");
    }
}`, output: 'There are 13 instance extensions\n  VK_KHR_surface (revision 25)\n  VK_KHR_win32_surface (revision 6)\n  VK_KHR_external_memory_capabilities (revision 1)\nWith room for 2: Incomplete, wrote 2' },
      { type: 'ul', items: [
        '`fixed` pins the managed array so the garbage collector cannot move it while Vulkan writes into it, and gives you a pointer to its first element.',
        'The count is passed **by pointer** both times: on the way in it is the array size, on the way out it is how many were written.',
        'Lists can change between the calls (a GPU unplugged, say). If you get `Incomplete`, a robust program simply repeats both calls.'
      ] },
      { type: 'h2', text: 'Pattern 5: C strings' },
      { type: 'p', text: 'Names in Vulkan are null-terminated UTF-8 strings (`byte*`), not .NET strings. Inside a returned structure they are fixed-size byte arrays, which `SilkMarshal.PtrToString` reads, as above. To pass a name in, convert it to unmanaged memory and free it afterwards:' },
      { type: 'code', title: 'Strings.cs', code: cs`
using Silk.NET.Core.Native;

unsafe
{
    // One string: allocate unmanaged UTF-8 bytes with a trailing zero.
    nint name = SilkMarshal.StringToPtr("My BIM Viewer");
    Console.WriteLine($"Read back: {SilkMarshal.PtrToString(name)}");
    Console.WriteLine($"Bytes: {string.Join(" ", new ReadOnlySpan<byte>((byte*)name, 14).ToArray())}");
    SilkMarshal.Free(name);

    // An array of strings (byte**), as used for lists of extension names.
    string[] wanted = ["VK_KHR_surface", "VK_KHR_win32_surface"];
    nint list = SilkMarshal.StringArrayToPtr(wanted);
    byte** names = (byte**)list;
    Console.WriteLine($"Second name: {SilkMarshal.PtrToString((nint)names[1])}");
    SilkMarshal.Free(list);
}`, output: 'Read back: My BIM Viewer\nBytes: 77 121 32 66 73 77 32 86 105 101 119 101 114 0\nSecond name: VK_KHR_win32_surface' },
      { type: 'p', text: '“My BIM Viewer” is 13 characters, so the 14th byte is the terminating zero. Forgetting to free these strings is a small leak; freeing them before the Vulkan call that reads them is a crash. Free them after the call returns.' },
      { type: 'quiz', question: 'You call EnumerateInstanceExtensionProperties with room for 2 entries but there are 13. What happens?', options: ['It returns ErrorOutOfHostMemory', 'It writes 2 entries, sets the count to 2 and returns Incomplete', 'It writes all 13 past the end of your array', 'It returns Success and a count of 13'], answer: 1, explain: 'Vulkan never writes past the count you give it. It fills what fits, sets the count to what it wrote, and returns Incomplete, which is a positive (success) code.' },
      { type: 'exercise', task: 'Write `string[] InstanceExtensionNames(Vk vk)` using the two-call pattern and the `Check` helper. Print how many there are and whether `VK_KHR_surface` is among them.', hint: 'Make the method `unsafe` (or put an `unsafe` block inside it). Use `SilkMarshal.PtrToString((nint)e.ExtensionName)` for each entry.', solution: cs`
using Silk.NET.Core.Native;
using Silk.NET.Vulkan;

string[] names = InstanceExtensionNames(Vk.GetApi());
Console.WriteLine($"{names.Length} extensions");
Console.WriteLine($"Has VK_KHR_surface: {names.Contains("VK_KHR_surface")}");

static unsafe string[] InstanceExtensionNames(Vk vk)
{
    uint count = 0;
    vk.EnumerateInstanceExtensionProperties((byte*)null, &count, null).Check("count");
    var props = new ExtensionProperties[count];
    fixed (ExtensionProperties* p = props)
        vk.EnumerateInstanceExtensionProperties((byte*)null, &count, p).Check("fill");
    return props.Select(e => SilkMarshal.PtrToString((nint)e.ExtensionName)!).ToArray();
}`, output: '13 extensions\nHas VK_KHR_surface: True' }
    ],
    keyPoints: [
      'Objects are created from a create-info structure and destroyed with the matching Destroy call; handles are opaque numbers the garbage collector does not track.',
      'Every structure starts with SType (what it is) and PNext (a chain of extension structures).',
      'Negative Result values are errors; positive ones like Incomplete are successes with extra information.',
      'Lists are read with two calls: one for the count, one to fill an array of that size.',
      'Names are null-terminated UTF-8: read them with SilkMarshal.PtrToString, pass them with StringToPtr and free them after the call.'
    ]
  },
  // ------------------------------------------------------------------ 4
  {
    slug: 'instance',
    title: 'The instance, extensions and layers',
    summary: 'The instance is your program’s connection to Vulkan. Describe your application, check which instance extensions and layers exist, enable the ones you need, and handle the errors when something is missing.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'The **instance** is the first object every Vulkan program creates. It connects your program to the Vulkan loader, records which Vulkan version you are written for, and switches on instance-level **extensions** and **layers**. GPUs are listed through it, and a window surface is created from it.' },
      { type: 'h2', text: 'The loader, layers and drivers' },
      { type: 'p', text: 'When you call a Vulkan function, it goes to the **loader** first. The loader passes it down through any **layers** you enabled, and then to the **driver** (called an ICD, installable client driver) for the GPU. A PC with two GPUs from different vendors has two drivers, and the loader talks to both.' },
      { type: 'widget', name: 'vk-loader' },
      { type: 'ul', items: [
        'An **extension** adds functions or features to Vulkan. Instance extensions are about the instance and the system, for example `VK_KHR_surface` (drawing into windows) and `VK_EXT_debug_utils` (debug messages and object names). Device extensions, such as `VK_KHR_swapchain`, are enabled later on the logical device.',
        'A **layer** sits between you and the driver and can inspect or change every call. The most important is `VK_LAYER_KHRONOS_validation`, which checks every call against the specification. Layers are installed separately (mostly by the Vulkan SDK) and cost nothing when not enabled.',
        'The prefix says who wrote it: `KHR` is approved by Khronos, `EXT` is shared by several vendors, `NV`, `AMD` or `INTEL` belong to one vendor.'
      ] },
      { type: 'h2', text: 'What is available?' },
      { type: 'code', title: 'Available.cs', code: cs`
using Silk.NET.Core.Native;
using Silk.NET.Vulkan;

Vk vk = Vk.GetApi();

unsafe
{
    uint n = 0;
    vk.EnumerateInstanceExtensionProperties((byte*)null, &n, null);
    var exts = new ExtensionProperties[n];
    fixed (ExtensionProperties* p = exts) vk.EnumerateInstanceExtensionProperties((byte*)null, &n, p);
    Console.WriteLine($"{n} instance extensions:");
    foreach (var e in exts) Console.WriteLine($"  {SilkMarshal.PtrToString((nint)e.ExtensionName)}");

    uint l = 0;
    vk.EnumerateInstanceLayerProperties(&l, null);
    var layers = new LayerProperties[l];
    fixed (LayerProperties* p = layers) vk.EnumerateInstanceLayerProperties(&l, p);
    Console.WriteLine($"{l} layers:");
    foreach (var layer in layers)
        Console.WriteLine($"  {SilkMarshal.PtrToString((nint)layer.LayerName)}: {SilkMarshal.PtrToString((nint)layer.Description)}");
}`, output: '13 instance extensions:\n  VK_KHR_surface\n  VK_KHR_win32_surface\n  VK_KHR_external_memory_capabilities\n  VK_KHR_external_semaphore_capabilities\n  VK_KHR_external_fence_capabilities\n  VK_KHR_get_physical_device_properties2\n  VK_KHR_get_surface_capabilities2\n  VK_KHR_device_group_creation\n  VK_EXT_swapchain_colorspace\n  VK_EXT_debug_utils\n  VK_EXT_debug_report\n  VK_KHR_portability_enumeration\n  VK_LUNARG_direct_driver_loading\n0 layers:' },
      { type: 'p', text: 'That output is from a Windows laptop with an Intel GPU and no Vulkan SDK, so there are **no layers** at all. Yours will differ. With the SDK installed you would see `VK_LAYER_KHRONOS_validation` and several others; tools such as Steam or OBS can add layers of their own.' },
      { type: 'h2', text: 'Creating the instance properly' },
      { type: 'p', text: '`ApplicationInfo` tells the driver who you are. Drivers sometimes recognise well-known engines and applications and apply fixes for them, so give real names. The important field is `ApiVersion`: the **highest Vulkan version your program uses**. Asking for 1.3 on a 1.4 driver is fine; you get 1.3 behaviour.' },
      { type: 'code', title: 'CreateInstance.cs', code: cs`
using Silk.NET.Core.Native;
using Silk.NET.Vulkan;

Vk vk = Vk.GetApi();
string[] wanted = ["VK_KHR_surface", "VK_KHR_win32_surface", "VK_EXT_debug_utils"];

unsafe
{
    nint appName = SilkMarshal.StringToPtr("BIM Viewer");
    nint engineName = SilkMarshal.StringToPtr("VkEngine");
    nint extNames = SilkMarshal.StringArrayToPtr(wanted);

    var appInfo = new ApplicationInfo
    {
        SType = StructureType.ApplicationInfo,
        PApplicationName = (byte*)appName,
        ApplicationVersion = Vk.MakeVersion(0, 1, 0),
        PEngineName = (byte*)engineName,
        EngineVersion = Vk.MakeVersion(0, 1, 0),
        ApiVersion = Vk.Version13
    };
    var createInfo = new InstanceCreateInfo
    {
        SType = StructureType.InstanceCreateInfo,
        PApplicationInfo = &appInfo,
        EnabledExtensionCount = (uint)wanted.Length,
        PpEnabledExtensionNames = (byte**)extNames
    };

    Instance instance;
    Result r = vk.CreateInstance(&createInfo, null, &instance);
    Console.WriteLine($"CreateInstance with {wanted.Length} extensions: {r}");

    // The strings are only read during the call, so they can be freed now.
    SilkMarshal.Free(appName);
    SilkMarshal.Free(engineName);
    SilkMarshal.Free(extNames);

    if (r == Result.Success)
    {
        // Extension functions are not part of the core API: they are loaded per instance.
        Console.WriteLine($"Debug utils functions loaded: {vk.TryGetInstanceExtension(instance, out Silk.NET.Vulkan.Extensions.EXT.ExtDebugUtils _)}");
        vk.DestroyInstance(instance, null);
    }
}`, output: 'CreateInstance with 3 extensions: Success\nDebug utils functions loaded: True' },
      { type: 'p', text: 'Enabling an extension is not the whole story: its functions (here `vkCreateDebugUtilsMessengerEXT` and friends) are not exported by the loader like core functions. You ask the instance for them. In Silk.NET each extension is a class in its own package (`Silk.NET.Vulkan.Extensions.EXT`, `…KHR`), and `TryGetInstanceExtension` loads it, returning false if the extension was not enabled.' },
      { type: 'h2', text: 'When something is missing' },
      { type: 'p', text: 'Ask for an extension or a layer the system does not have, and instance creation fails. There is no partial success:' },
      { type: 'code', title: 'Missing.cs', code: cs`
using Silk.NET.Core.Native;
using Silk.NET.Vulkan;

Vk vk = Vk.GetApi();

Console.WriteLine($"Unknown extension: {Try(extension: "VK_KHR_not_a_real_extension")}");
Console.WriteLine($"Validation layer:  {Try(layer: "VK_LAYER_KHRONOS_validation")}");

unsafe Result Try(string? extension = null, string? layer = null)
{
    nint ext = extension is null ? 0 : SilkMarshal.StringToPtr(extension);
    nint lay = layer is null ? 0 : SilkMarshal.StringToPtr(layer);
    var appInfo = new ApplicationInfo { SType = StructureType.ApplicationInfo, ApiVersion = Vk.Version13 };
    var ci = new InstanceCreateInfo
    {
        SType = StructureType.InstanceCreateInfo,
        PApplicationInfo = &appInfo,
        EnabledExtensionCount = extension is null ? 0u : 1u,
        PpEnabledExtensionNames = (byte**)&ext,
        EnabledLayerCount = layer is null ? 0u : 1u,
        PpEnabledLayerNames = (byte**)&lay
    };
    Instance instance;
    Result r = vk.CreateInstance(&ci, null, &instance);
    if (r == Result.Success) vk.DestroyInstance(instance, null);
    SilkMarshal.Free(ext);
    SilkMarshal.Free(lay);
    return r;
}`, output: 'Unknown extension: ErrorExtensionNotPresent\nValidation layer:  ErrorLayerNotPresent' },
      { type: 'p', text: 'The validation layer is reported missing here because this PC has no Vulkan SDK. On yours it may succeed. That is the general rule: **check what is available, then enable only what is there**, and decide what to do when something you would like is missing. Validation is optional (useful in development, absent on users’ machines); a surface extension is required for a window.' },
      { type: 'note', kind: 'info', text: 'On macOS, Vulkan runs on top of Metal through MoltenVK, which does not fully meet the specification. There you must also enable `VK_KHR_portability_enumeration` and set the `EnumeratePortabilityBitKhr` flag in `InstanceCreateInfo.Flags`, or no GPU is listed.' },
      { type: 'quiz', question: 'Your program asks for VK_EXT_debug_utils and VK_LAYER_KHRONOS_validation on a user’s PC that has no Vulkan SDK. What happens?', options: ['The instance is created without the layer', 'CreateInstance returns ErrorLayerNotPresent and no instance is created', 'The loader downloads the layer', 'The program crashes on the first draw call'], answer: 1, explain: 'Instance creation is all or nothing. Check the available layers first and only enable validation when it is installed, typically only in debug builds.' },
      { type: 'exercise', task: 'Write `string[] Enable(Vk vk, string[] required, string[] optional)` that lists the available instance extensions, throws an exception naming any missing **required** ones, and returns the required ones plus whichever optional ones exist. Call it with required `VK_KHR_surface` and optional `VK_EXT_debug_utils` and `VK_EXT_not_there`, and print the result.', hint: 'Get the names with the two-call pattern into a `HashSet<string>`, then filter both lists with it.', solution: cs`
using Silk.NET.Core.Native;
using Silk.NET.Vulkan;

string[] enabled = Enable(Vk.GetApi(), ["VK_KHR_surface"], ["VK_EXT_debug_utils", "VK_EXT_not_there"]);
Console.WriteLine($"Enable: {string.Join(", ", enabled)}");

static unsafe string[] Enable(Vk vk, string[] required, string[] optional)
{
    uint n = 0;
    vk.EnumerateInstanceExtensionProperties((byte*)null, &n, null);
    var props = new ExtensionProperties[n];
    fixed (ExtensionProperties* p = props) vk.EnumerateInstanceExtensionProperties((byte*)null, &n, p);
    var available = props.Select(e => SilkMarshal.PtrToString((nint)e.ExtensionName)!).ToHashSet();

    string[] missing = required.Where(r => !available.Contains(r)).ToArray();
    if (missing.Length > 0) throw new NotSupportedException($"Missing: {string.Join(", ", missing)}");

    foreach (var o in optional.Where(o => !available.Contains(o))) Console.WriteLine($"Optional {o} is not available");
    return [.. required, .. optional.Where(available.Contains)];
}`, output: 'Optional VK_EXT_not_there is not available\nEnable: VK_KHR_surface, VK_EXT_debug_utils' }
    ],
    keyPoints: [
      'The instance connects your program to the Vulkan loader; it is created first and destroyed last.',
      'Calls pass from the loader through any enabled layers to the driver (ICD) of each GPU.',
      'Instance extensions add system-level features such as surfaces and debug messages; their functions are loaded per instance.',
      'ApiVersion is the highest Vulkan version your program uses.',
      'Asking for a missing extension or layer fails the whole CreateInstance: check availability first.'
    ]
  },
  // ------------------------------------------------------------------ 5
  {
    slug: 'physical-devices',
    title: 'Choosing a GPU: properties, features, limits and memory',
    summary: 'List the GPUs Vulkan can see and read what each one is, which optional features it has, its limits and its memory, then write a function that picks the best one for your engine.',
    minutes: 18,
    blocks: [
      { type: 'p', text: 'A **physical device** is one GPU as Vulkan sees it: a discrete graphics card, a GPU built into the CPU, or even a software renderer running on the CPU. You do not create physical devices; you list them through the instance and choose one.' },
      { type: 'h2', text: 'Listing the GPUs' },
      { type: 'code', title: 'ListGpus.cs', code: cs`
using Silk.NET.Core;
using Silk.NET.Core.Native;
using Silk.NET.Vulkan;

Vk vk = Vk.GetApi();

unsafe
{
    var appInfo = new ApplicationInfo { SType = StructureType.ApplicationInfo, ApiVersion = Vk.Version13 };
    var ci = new InstanceCreateInfo { SType = StructureType.InstanceCreateInfo, PApplicationInfo = &appInfo };
    Instance instance;
    vk.CreateInstance(&ci, null, &instance);

    uint n = 0;
    vk.EnumeratePhysicalDevices(instance, &n, null);
    var gpus = new PhysicalDevice[n];
    fixed (PhysicalDevice* p = gpus) vk.EnumeratePhysicalDevices(instance, &n, p);
    Console.WriteLine($"{n} GPU(s)");

    foreach (var gpu in gpus)
    {
        PhysicalDeviceProperties props;
        vk.GetPhysicalDeviceProperties(gpu, &props);
        var api = (Version32)props.ApiVersion;
        Console.WriteLine($"Name:    {SilkMarshal.PtrToString((nint)props.DeviceName)}");
        Console.WriteLine($"Type:    {props.DeviceType}");
        Console.WriteLine($"Vulkan:  {api.Major}.{api.Minor}.{api.Patch}");
        Console.WriteLine($"Vendor:  0x{props.VendorID:X4}, device 0x{props.DeviceID:X4}");
        Console.WriteLine($"Driver:  {props.DriverVersion >> 14}.{props.DriverVersion & 0x3FFF} (Intel's Windows numbering)");
    }
    vk.DestroyInstance(instance, null);
}`, output: '1 GPU(s)\nName:    Intel(R) Iris(R) Xe Graphics\nType:    IntegratedGpu\nVulkan:  1.4.312\nVendor:  0x8086, device 0x9A49\nDriver:  101.6881 (Intel\'s Windows numbering)' },
      { type: 'ul', items: [
        '**DeviceType** is `DiscreteGpu` (a separate card with its own memory), `IntegratedGpu` (part of the CPU, sharing system memory), `VirtualGpu`, `Cpu` (a software renderer such as llvmpipe) or `Other`.',
        '**ApiVersion** is the highest Vulkan version this GPU’s driver supports. Here it is 1.4.312, newer than the loader’s 1.4.304: you can use the lower of your requested version and this one.',
        '**VendorID** identifies the maker: 0x10DE NVIDIA, 0x1002 AMD, 0x8086 Intel, 0x13B5 Arm, 0x5143 Qualcomm.',
        '**DriverVersion** is packed in a vendor-specific way. Only for display: never compare it across vendors.'
      ] },
      { type: 'h2', text: 'Features: optional abilities' },
      { type: 'p', text: '**Features** are optional abilities a GPU may or may not have, such as anisotropic texture filtering or 64-bit floats in shaders. They are all off on the logical device unless you switch them on, and you may only switch on what the GPU has. Each one is a `Bool32` (a 32-bit 0 or 1), which converts to `bool`.' },
      { type: 'code', title: 'Features.cs', code: cs`
using Silk.NET.Vulkan;

Vk vk = Vk.GetApi();

unsafe
{
    var appInfo = new ApplicationInfo { SType = StructureType.ApplicationInfo, ApiVersion = Vk.Version13 };
    var ci = new InstanceCreateInfo { SType = StructureType.InstanceCreateInfo, PApplicationInfo = &appInfo };
    Instance instance;
    vk.CreateInstance(&ci, null, &instance);
    uint n = 1;
    PhysicalDevice gpu;
    vk.EnumeratePhysicalDevices(instance, &n, &gpu);   // just the first GPU

    // Vulkan 1.0 features, plus the 1.2 and 1.3 ones through a pNext chain.
    var f13 = new PhysicalDeviceVulkan13Features { SType = StructureType.PhysicalDeviceVulkan13Features };
    var f12 = new PhysicalDeviceVulkan12Features { SType = StructureType.PhysicalDeviceVulkan12Features, PNext = &f13 };
    var all = new PhysicalDeviceFeatures2 { SType = StructureType.PhysicalDeviceFeatures2, PNext = &f12 };
    vk.GetPhysicalDeviceFeatures2(gpu, &all);
    PhysicalDeviceFeatures f = all.Features;

    Console.WriteLine($"samplerAnisotropy     {(bool)f.SamplerAnisotropy}");
    Console.WriteLine($"fillModeNonSolid      {(bool)f.FillModeNonSolid}   (wireframe)");
    Console.WriteLine($"wideLines             {(bool)f.WideLines}");
    Console.WriteLine($"multiDrawIndirect     {(bool)f.MultiDrawIndirect}");
    Console.WriteLine($"geometryShader        {(bool)f.GeometryShader}");
    Console.WriteLine($"shaderFloat64         {(bool)f.ShaderFloat64}   (doubles in shaders)");
    Console.WriteLine($"textureCompressionBC  {(bool)f.TextureCompressionBC}");
    Console.WriteLine($"1.2 timelineSemaphore {(bool)f12.TimelineSemaphore}");
    Console.WriteLine($"1.2 descriptorIndexing {(bool)f12.DescriptorIndexing}");
    Console.WriteLine($"1.3 dynamicRendering  {(bool)f13.DynamicRendering}");
    Console.WriteLine($"1.3 synchronization2  {(bool)f13.Synchronization2}");
    vk.DestroyInstance(instance, null);
}`, output: 'samplerAnisotropy     True\nfillModeNonSolid      True   (wireframe)\nwideLines             True\nmultiDrawIndirect     True\ngeometryShader        True\nshaderFloat64         False   (doubles in shaders)\ntextureCompressionBC  True\n1.2 timelineSemaphore True\n1.2 descriptorIndexing True\n1.3 dynamicRendering  True\n1.3 synchronization2  True' },
      { type: 'p', text: 'This Intel GPU has nearly everything, but not `shaderFloat64`. That matters for BIM: coordinates in a model georeferenced to a national grid can be hundreds of kilometres from the origin, too large for 32-bit floats to hold to the millimetre. Without doubles on the GPU, an engine must shift the model near the origin on the CPU first (the Master module of BIM Math explains why). Many consumer GPUs lack fast doubles, so a portable engine should not rely on them.' },
      { type: 'h2', text: 'Limits: how far you can go' },
      { type: 'p', text: '**Limits** are numbers every GPU reports: the largest texture, how much data push constants can hold, the alignment buffers need, and many more. The specification guarantees a minimum for each; real GPUs usually exceed it.' },
      { type: 'code', title: 'Limits.cs', code: cs`
using Silk.NET.Vulkan;

Vk vk = Vk.GetApi();

unsafe
{
    var appInfo = new ApplicationInfo { SType = StructureType.ApplicationInfo, ApiVersion = Vk.Version13 };
    var ci = new InstanceCreateInfo { SType = StructureType.InstanceCreateInfo, PApplicationInfo = &appInfo };
    Instance instance;
    vk.CreateInstance(&ci, null, &instance);
    uint n = 1;
    PhysicalDevice gpu;
    vk.EnumeratePhysicalDevices(instance, &n, &gpu);

    PhysicalDeviceProperties props;
    vk.GetPhysicalDeviceProperties(gpu, &props);
    PhysicalDeviceLimits l = props.Limits;
    Console.WriteLine($"maxImageDimension2D             {l.MaxImageDimension2D}");
    Console.WriteLine($"maxPushConstantsSize            {l.MaxPushConstantsSize} bytes");
    Console.WriteLine($"maxBoundDescriptorSets          {l.MaxBoundDescriptorSets}");
    Console.WriteLine($"minUniformBufferOffsetAlignment {l.MinUniformBufferOffsetAlignment}");
    Console.WriteLine($"maxMemoryAllocationCount        {l.MaxMemoryAllocationCount}");
    Console.WriteLine($"maxSamplerAnisotropy            {l.MaxSamplerAnisotropy}");
    Console.WriteLine($"framebufferColorSampleCounts    {l.FramebufferColorSampleCounts}");
    Console.WriteLine($"timestampPeriod                 {l.TimestampPeriod} ns per tick");
    vk.DestroyInstance(instance, null);
}`, output: 'maxImageDimension2D             16384\nmaxPushConstantsSize            256 bytes\nmaxBoundDescriptorSets          32\nminUniformBufferOffsetAlignment 64\nmaxMemoryAllocationCount        1047908\nmaxSamplerAnisotropy            16\nframebufferColorSampleCounts    Count1Bit, Count2Bit, Count4Bit, Count8Bit\ntimestampPeriod                 52.083332 ns per tick' },
      { type: 'table', head: ['Limit', 'Guaranteed minimum', 'Why an engine cares'], rows: [
        ['maxImageDimension2D', '4096', 'The largest texture or render target, for example a high-resolution screenshot.'],
        ['maxPushConstantsSize', '128 bytes', 'Push constants (module 3) are the fastest way to give a shader a little data, such as one matrix (64 bytes).'],
        ['minUniformBufferOffsetAlignment', 'at most 256', 'Where several objects’ data share one buffer, each part must start at a multiple of this.'],
        ['maxMemoryAllocationCount', '4096', 'How many separate memory allocations you may have. That is why engines allocate big blocks and divide them up.'],
        ['framebufferColorSampleCounts', '1 and 4 samples', 'Which multisampling (anti-aliasing) levels you can use.'],
        ['timestampPeriod', '(no minimum)', 'Converts GPU timestamp ticks to nanoseconds when you time work on the GPU.']
      ] },
      { type: 'h2', text: 'Memory: heaps and types' },
      { type: 'p', text: 'GPUs differ most in their memory. Vulkan describes it as **heaps** (physical pools of memory with a size) and **memory types** (ways of using a heap: is it fast for the GPU? can the CPU see it? does the CPU’s cache cover it?).' },
      { type: 'code', title: 'Memory.cs', code: cs`
using Silk.NET.Vulkan;

Vk vk = Vk.GetApi();

unsafe
{
    var appInfo = new ApplicationInfo { SType = StructureType.ApplicationInfo, ApiVersion = Vk.Version13 };
    var ci = new InstanceCreateInfo { SType = StructureType.InstanceCreateInfo, PApplicationInfo = &appInfo };
    Instance instance;
    vk.CreateInstance(&ci, null, &instance);
    uint n = 1;
    PhysicalDevice gpu;
    vk.EnumeratePhysicalDevices(instance, &n, &gpu);

    PhysicalDeviceMemoryProperties mem;
    vk.GetPhysicalDeviceMemoryProperties(gpu, &mem);
    for (int i = 0; i < mem.MemoryHeapCount; i++)
        Console.WriteLine($"Heap {i}: {mem.MemoryHeaps[i].Size / (1024.0 * 1024 * 1024):F2} GiB, {mem.MemoryHeaps[i].Flags}");
    for (int i = 0; i < mem.MemoryTypeCount; i++)
        Console.WriteLine($"Type {i}: heap {mem.MemoryTypes[i].HeapIndex}, {mem.MemoryTypes[i].PropertyFlags}");
    vk.DestroyInstance(instance, null);
}`, output: 'Heap 0: 3.87 GiB, DeviceLocalBit\nType 0: heap 0, DeviceLocalBit\nType 1: heap 0, DeviceLocalBit, HostVisibleBit, HostCoherentBit\nType 2: heap 0, DeviceLocalBit, HostVisibleBit, HostCoherentBit, HostCachedBit' },
      { type: 'p', text: 'An integrated GPU has **one heap**: part of the system RAM, shared with the CPU. Every memory type is device-local, and most are host-visible too, so the CPU can write straight into memory the GPU reads fast. A discrete card typically shows at least two heaps: its own fast video memory (device-local, often not visible to the CPU) and system RAM it reaches over PCI Express (host-visible, slower for the GPU). Then you upload data through a **staging buffer**, which module 3 covers.' },
      { type: 'h2', text: 'Picking the best GPU' },
      { type: 'p', text: 'A sensible rule: throw out GPUs that lack anything you require, then prefer a discrete GPU, then the one with the most device-local memory. Try different requirements in the widget, and add GPUs to the machine (only the Intel GPU is measured; the others are example data):' },
      { type: 'widget', name: 'device-picker' },
      { type: 'quiz', question: 'Why do engines allocate large blocks of GPU memory and place many buffers inside each block?', options: ['Large allocations are faster for the GPU to read', 'The number of separate allocations is limited (maxMemoryAllocationCount can be as low as 4096), and each allocation is slow', 'Vulkan only allows one buffer per allocation', 'It is required for integrated GPUs only'], answer: 1, explain: 'A BIM model can have hundreds of thousands of meshes. One allocation per mesh would hit the limit and spend a long time in the driver, so engines sub-allocate. You will write such an allocator in module 3.' },
      { type: 'exercise', task: 'Write `PhysicalDevice? PickGpu(Vk vk, Instance instance)` that skips GPUs older than Vulkan 1.3 or without `dynamicRendering` or `samplerAnisotropy`, and from the rest picks the highest score: 1000 for a discrete GPU, 100 for integrated, 0 otherwise, plus the size of the largest device-local heap in GiB. Print each GPU’s name with its score (or why it was skipped) and the winner.', hint: 'Use the features chain from the Features sample to read `dynamicRendering`. A heap is device-local when `(heap.Flags & MemoryHeapFlags.DeviceLocalBit) != 0`.', solution: cs`
using Silk.NET.Core.Native;
using Silk.NET.Vulkan;

Vk vk = Vk.GetApi();

unsafe
{
    var appInfo = new ApplicationInfo { SType = StructureType.ApplicationInfo, ApiVersion = Vk.Version13 };
    var ci = new InstanceCreateInfo { SType = StructureType.InstanceCreateInfo, PApplicationInfo = &appInfo };
    Instance instance;
    vk.CreateInstance(&ci, null, &instance);
    PhysicalDevice? best = PickGpu(vk, instance);
    Console.WriteLine(best is null ? "No suitable GPU" : $"Picked: {Name(vk, best.Value)}");
    vk.DestroyInstance(instance, null);
}

static unsafe string Name(Vk vk, PhysicalDevice gpu)
{
    PhysicalDeviceProperties p;
    vk.GetPhysicalDeviceProperties(gpu, &p);
    return SilkMarshal.PtrToString((nint)p.DeviceName)!;
}

static unsafe PhysicalDevice? PickGpu(Vk vk, Instance instance)
{
    uint n = 0;
    vk.EnumeratePhysicalDevices(instance, &n, null);
    var gpus = new PhysicalDevice[n];
    fixed (PhysicalDevice* p = gpus) vk.EnumeratePhysicalDevices(instance, &n, p);

    PhysicalDevice? best = null;
    double bestScore = -1;
    foreach (var gpu in gpus)
    {
        PhysicalDeviceProperties props;
        vk.GetPhysicalDeviceProperties(gpu, &props);
        var f13 = new PhysicalDeviceVulkan13Features { SType = StructureType.PhysicalDeviceVulkan13Features };
        var all = new PhysicalDeviceFeatures2 { SType = StructureType.PhysicalDeviceFeatures2, PNext = &f13 };
        vk.GetPhysicalDeviceFeatures2(gpu, &all);

        string name = Name(vk, gpu);
        if (props.ApiVersion < Vk.Version13) { Console.WriteLine($"{name}: skipped, Vulkan older than 1.3"); continue; }
        if (!f13.DynamicRendering || !all.Features.SamplerAnisotropy) { Console.WriteLine($"{name}: skipped, missing a feature"); continue; }

        PhysicalDeviceMemoryProperties mem;
        vk.GetPhysicalDeviceMemoryProperties(gpu, &mem);
        double largest = 0;
        for (int i = 0; i < mem.MemoryHeapCount; i++)
            if ((mem.MemoryHeaps[i].Flags & MemoryHeapFlags.DeviceLocalBit) != 0)
                largest = Math.Max(largest, mem.MemoryHeaps[i].Size / (1024.0 * 1024 * 1024));

        double score = props.DeviceType switch
        {
            PhysicalDeviceType.DiscreteGpu => 1000,
            PhysicalDeviceType.IntegratedGpu => 100,
            _ => 0
        } + largest;
        Console.WriteLine($"{name}: score {score:F1}");
        if (score > bestScore) { bestScore = score; best = gpu; }
    }
    return best;
}`, output: 'Intel(R) Iris(R) Xe Graphics: score 103.9\nPicked: Intel(R) Iris(R) Xe Graphics' }
    ],
    keyPoints: [
      'Physical devices are listed through the instance, not created; each is one GPU (discrete, integrated, virtual or CPU).',
      'Properties give the name, type, vendor and the Vulkan version the driver supports.',
      'Features are optional abilities; read them with GetPhysicalDeviceFeatures2 and a pNext chain for the 1.2 and 1.3 features.',
      'Limits are guaranteed minimums that real GPUs usually exceed; design for the minimum or check.',
      'Memory is described as heaps and types: integrated GPUs share one heap with the CPU, discrete GPUs have separate video memory.'
    ]
  },
  // ------------------------------------------------------------------ 6
  {
    slug: 'queue-families',
    title: 'Queue families: graphics, compute and transfer',
    summary: 'Work reaches the GPU through queues, grouped into families by what they can do. Read a GPU’s queue families, find the one for graphics, and look for dedicated compute and transfer queues.',
    minutes: 13,
    blocks: [
      { type: 'p', text: 'You never call a GPU function that draws immediately. You record commands into a command buffer and **submit** it to a **queue**; the GPU takes work from its queues and runs it. A GPU can have several queues, and they are grouped into **queue families**: all queues in a family can do the same kinds of work.' },
      { type: 'table', head: ['Flag', 'The family can run'], rows: [
        ['GraphicsBit', 'Draw commands: the graphics pipeline.'],
        ['ComputeBit', 'Dispatch commands: compute shaders.'],
        ['TransferBit', 'Copy commands: buffers to buffers, buffers to images.'],
        ['SparseBindingBit', 'Binding memory to sparse (partially resident) resources.'],
        ['VideoDecodeBitKhr / VideoEncodeBitKhr', 'Hardware video decoding or encoding.']
      ] },
      { type: 'code', title: 'Families.cs', code: cs`
using Silk.NET.Vulkan;

Vk vk = Vk.GetApi();

unsafe
{
    var appInfo = new ApplicationInfo { SType = StructureType.ApplicationInfo, ApiVersion = Vk.Version13 };
    var ci = new InstanceCreateInfo { SType = StructureType.InstanceCreateInfo, PApplicationInfo = &appInfo };
    Instance instance;
    vk.CreateInstance(&ci, null, &instance);
    uint n = 1;
    PhysicalDevice gpu;
    vk.EnumeratePhysicalDevices(instance, &n, &gpu);

    uint count = 0;
    vk.GetPhysicalDeviceQueueFamilyProperties(gpu, &count, null);
    var families = new QueueFamilyProperties[count];
    fixed (QueueFamilyProperties* p = families) vk.GetPhysicalDeviceQueueFamilyProperties(gpu, &count, p);

    for (int i = 0; i < count; i++)
        Console.WriteLine($"Family {i}: {families[i].QueueCount} queue(s), {families[i].QueueFlags}");

    int graphics = Array.FindIndex(families, f => (f.QueueFlags & QueueFlags.GraphicsBit) != 0);
    Console.WriteLine($"Graphics family: {graphics}");
    vk.DestroyInstance(instance, null);
}`, output: 'Family 0: 1 queue(s), GraphicsBit, ComputeBit, TransferBit, SparseBindingBit\nFamily 1: 2 queue(s), VideoDecodeBitKhr\nGraphics family: 0' },
      { type: 'p', text: 'This Intel GPU has the simplest useful layout: **one** family that does graphics, compute and transfer, with **one** queue, plus a family for video decoding that a render engine does not use. Note that `GetPhysicalDeviceQueueFamilyProperties` returns no `Result`: it cannot fail, so the two-call pattern is used without checks.' },
      { type: 'h2', text: 'Discrete GPUs have more' },
      { type: 'p', text: 'A typical discrete GPU has a big family that does everything, a **compute-only** family and a **transfer-only** family. The extra families map to separate hardware engines, so work in them can run **at the same time** as drawing:' },
      { type: 'ul', items: [
        'A **transfer** queue uses the GPU’s copy engines (DMA). An engine streaming a large model in the background can upload meshes there while the graphics queue keeps drawing smoothly.',
        'A **compute** queue lets compute work, such as culling or building lighting data, overlap with drawing. This is called **async compute**.'
      ] },
      { type: 'widget', name: 'queue-families' },
      { type: 'note', kind: 'info', text: 'Any family with GraphicsBit or ComputeBit can also run transfer commands, even if it does not report TransferBit (the specification allows leaving the flag out there). So if a GPU has no dedicated transfer family, the graphics family is always a valid fallback for copies.' },
      { type: 'h2', text: 'Presenting is a separate question' },
      { type: 'p', text: 'Showing an image in a window is called **presenting**, and which families can present depends on the window, not just the GPU. You can only ask once you have a window surface: `GetPhysicalDeviceSurfaceSupport(gpu, family, surface)`. That comes in the next module. On practically all desktop GPUs the graphics family can present, and engines prefer one family for both so no ownership transfers are needed between queues.' },
      { type: 'quiz', question: 'A GPU reports family 0 (Graphics | Compute | Transfer, 16 queues), family 1 (Transfer, 2 queues) and family 2 (Compute | Transfer, 8 queues). Which family should a background mesh upload use?', options: ['Family 0, since it can do everything', 'Family 1, the dedicated transfer family', 'Family 2, since it has the most queues after family 0', 'Any of them, there is no difference'], answer: 1, explain: 'A transfer-only family usually maps to the GPU’s copy engines, so uploads there overlap with drawing on family 0 instead of competing with it.' },
      { type: 'exercise', task: 'Write `(int Graphics, int Transfer) FindFamilies(QueueFamilyProperties[] families)`. Graphics is the first family with GraphicsBit. For transfer, prefer a family with TransferBit but neither GraphicsBit nor ComputeBit; otherwise one with TransferBit or ComputeBit but not GraphicsBit; otherwise the graphics family. Test it on this PC’s families and on a made-up array for the discrete GPU from the quiz.', hint: 'You can build `QueueFamilyProperties` values yourself: `new QueueFamilyProperties { QueueFlags = QueueFlags.TransferBit, QueueCount = 2 }`. Write the rules as three `FindIndex` calls.', solution: cs`
using Silk.NET.Vulkan;

Vk vk = Vk.GetApi();
QueueFamilyProperties[] mine;

unsafe
{
    var appInfo = new ApplicationInfo { SType = StructureType.ApplicationInfo, ApiVersion = Vk.Version13 };
    var ci = new InstanceCreateInfo { SType = StructureType.InstanceCreateInfo, PApplicationInfo = &appInfo };
    Instance instance;
    vk.CreateInstance(&ci, null, &instance);
    uint n = 1;
    PhysicalDevice gpu;
    vk.EnumeratePhysicalDevices(instance, &n, &gpu);
    uint count = 0;
    vk.GetPhysicalDeviceQueueFamilyProperties(gpu, &count, null);
    mine = new QueueFamilyProperties[count];
    fixed (QueueFamilyProperties* p = mine) vk.GetPhysicalDeviceQueueFamilyProperties(gpu, &count, p);
    vk.DestroyInstance(instance, null);
}

QueueFamilyProperties[] discrete =
[
    new() { QueueFlags = QueueFlags.GraphicsBit | QueueFlags.ComputeBit | QueueFlags.TransferBit, QueueCount = 16 },
    new() { QueueFlags = QueueFlags.TransferBit, QueueCount = 2 },
    new() { QueueFlags = QueueFlags.ComputeBit | QueueFlags.TransferBit, QueueCount = 8 }
];

Console.WriteLine($"This PC:  {FindFamilies(mine)}");
Console.WriteLine($"Discrete: {FindFamilies(discrete)}");

static (int Graphics, int Transfer) FindFamilies(QueueFamilyProperties[] families)
{
    static bool Has(QueueFamilyProperties f, QueueFlags flag) => (f.QueueFlags & flag) != 0;
    int graphics = Array.FindIndex(families, f => Has(f, QueueFlags.GraphicsBit));
    int transfer = Array.FindIndex(families, f => Has(f, QueueFlags.TransferBit) && !Has(f, QueueFlags.GraphicsBit) && !Has(f, QueueFlags.ComputeBit));
    if (transfer < 0)
        transfer = Array.FindIndex(families, f => (Has(f, QueueFlags.TransferBit) || Has(f, QueueFlags.ComputeBit)) && !Has(f, QueueFlags.GraphicsBit));
    if (transfer < 0) transfer = graphics;
    return (graphics, transfer);
}`, output: 'This PC:  (0, 0)\nDiscrete: (0, 1)' }
    ],
    keyPoints: [
      'Work is recorded into command buffers and submitted to queues; queues are grouped into families by capability.',
      'Every engine needs a family with GraphicsBit; on simple GPUs it is the only useful one.',
      'Dedicated transfer and compute families map to separate hardware and let uploads and compute overlap with drawing.',
      'Graphics and compute families can always run transfer commands, so they are valid fallbacks for copies.',
      'Whether a family can present to a window is asked separately, once you have a surface.'
    ]
  },
  // ------------------------------------------------------------------ 7
  {
    slug: 'logical-device',
    title: 'The logical device, queues and cleaning up',
    summary: 'Open a session with the chosen GPU: create the logical device with its queues, device extensions and features, fetch the queue handles, and shut everything down in the right order.',
    minutes: 17,
    blocks: [
      { type: 'p', text: 'The physical device describes a GPU; the **logical device** is your program’s open session with it. Nearly every object from now on (buffers, images, pipelines, command pools, semaphores) is created from the logical device, and its handle is the first argument of most Vulkan calls. When you create it you say, once and for all: which queues you want, which device extensions to enable and which features to switch on.' },
      { type: 'h2', text: 'Asking for queues' },
      { type: 'p', text: 'For each family you want queues from, you fill in a `DeviceQueueCreateInfo` with the family index, how many queues, and a **priority** for each (0.0 to 1.0). Priorities are hints: a GPU may give more time to higher-priority queues. You may not ask for more queues than the family has.' },
      { type: 'h2', text: 'Device extensions and features' },
      { type: 'ul', items: [
        '**Device extensions** belong to the GPU, not the instance. The one every renderer needs is `VK_KHR_swapchain`, to present images to a window. List them with `EnumerateDeviceExtensionProperties` (this Intel GPU has 148).',
        '**Features** are switched on by passing the same structures you read them with: a `PhysicalDeviceFeatures2` chain in `PNext`, with the wanted fields set to true. Everything you leave false stays off.'
      ] },
      { type: 'code', title: 'CreateDevice.cs', code: cs`
using Silk.NET.Core.Native;
using Silk.NET.Vulkan;

Vk vk = Vk.GetApi();

unsafe
{
    var appInfo = new ApplicationInfo { SType = StructureType.ApplicationInfo, ApiVersion = Vk.Version13 };
    var ci = new InstanceCreateInfo { SType = StructureType.InstanceCreateInfo, PApplicationInfo = &appInfo };
    Instance instance;
    vk.CreateInstance(&ci, null, &instance);
    uint n = 1;
    PhysicalDevice gpu;
    vk.EnumeratePhysicalDevices(instance, &n, &gpu);
    const uint graphicsFamily = 0;   // found as in the previous lesson

    // One queue from the graphics family.
    float priority = 1.0f;
    var queueInfo = new DeviceQueueCreateInfo
    {
        SType = StructureType.DeviceQueueCreateInfo,
        QueueFamilyIndex = graphicsFamily,
        QueueCount = 1,
        PQueuePriorities = &priority
    };

    // Features to switch on: Vulkan 1.3's dynamic rendering and synchronization2, and anisotropic filtering.
    var f13 = new PhysicalDeviceVulkan13Features
    {
        SType = StructureType.PhysicalDeviceVulkan13Features,
        DynamicRendering = true,
        Synchronization2 = true
    };
    var features = new PhysicalDeviceFeatures2 { SType = StructureType.PhysicalDeviceFeatures2, PNext = &f13 };
    features.Features.SamplerAnisotropy = true;

    nint ext = SilkMarshal.StringToPtr("VK_KHR_swapchain");
    var deviceInfo = new DeviceCreateInfo
    {
        SType = StructureType.DeviceCreateInfo,
        PNext = &features,
        QueueCreateInfoCount = 1,
        PQueueCreateInfos = &queueInfo,
        EnabledExtensionCount = 1,
        PpEnabledExtensionNames = (byte**)&ext
    };

    Device device;
    Console.WriteLine($"CreateDevice: {vk.CreateDevice(gpu, &deviceInfo, null, &device)}");
    SilkMarshal.Free(ext);

    // Queues are created with the device; you only fetch their handles.
    Queue graphicsQueue;
    vk.GetDeviceQueue(device, graphicsFamily, 0, &graphicsQueue);
    Console.WriteLine($"Graphics queue handle is set: {graphicsQueue.Handle != 0}");

    // Shut down: wait until the GPU is idle, then destroy in reverse order of creation.
    Console.WriteLine($"DeviceWaitIdle: {vk.DeviceWaitIdle(device)}");
    vk.DestroyDevice(device, null);
    vk.DestroyInstance(instance, null);
    Console.WriteLine("Device and instance destroyed");
}`, output: 'CreateDevice: Success\nGraphics queue handle is set: True\nDeviceWaitIdle: Success\nDevice and instance destroyed' },
      { type: 'ul', items: [
        'When `PNext` holds a `PhysicalDeviceFeatures2`, the old `PEnabledFeatures` field must stay null: the 1.0 features go in `features.Features` instead.',
        '`GetDeviceQueue(device, family, index, …)` does not create anything: the queues came into being with the device, and you collect their handles. Queues are destroyed with the device.',
        'Device layers exist in old code; they are deprecated and ignored. Enable layers on the instance only.'
      ] },
      { type: 'h2', text: 'Asking for what is not there' },
      { type: 'p', text: 'Like the instance, device creation is all or nothing. Switching on a feature the GPU lacks fails with `ErrorFeatureNotPresent`, and an unsupported extension with `ErrorExtensionNotPresent`:' },
      { type: 'code', title: 'MissingFeature.cs', code: cs`
using Silk.NET.Vulkan;

Vk vk = Vk.GetApi();

unsafe
{
    var appInfo = new ApplicationInfo { SType = StructureType.ApplicationInfo, ApiVersion = Vk.Version13 };
    var ci = new InstanceCreateInfo { SType = StructureType.InstanceCreateInfo, PApplicationInfo = &appInfo };
    Instance instance;
    vk.CreateInstance(&ci, null, &instance);
    uint n = 1;
    PhysicalDevice gpu;
    vk.EnumeratePhysicalDevices(instance, &n, &gpu);

    float priority = 1.0f;
    var queueInfo = new DeviceQueueCreateInfo { SType = StructureType.DeviceQueueCreateInfo, QueueFamilyIndex = 0, QueueCount = 1, PQueuePriorities = &priority };
    var wanted = new PhysicalDeviceFeatures { ShaderFloat64 = true };   // this GPU has no shaderFloat64
    var deviceInfo = new DeviceCreateInfo
    {
        SType = StructureType.DeviceCreateInfo,
        QueueCreateInfoCount = 1,
        PQueueCreateInfos = &queueInfo,
        PEnabledFeatures = &wanted
    };

    Device device;
    Result r = vk.CreateDevice(gpu, &deviceInfo, null, &device);
    Console.WriteLine($"CreateDevice with shaderFloat64: {r}");
    if (r == Result.Success) vk.DestroyDevice(device, null);
    vk.DestroyInstance(instance, null);
}`, output: 'CreateDevice with shaderFloat64: ErrorFeatureNotPresent' },
      { type: 'note', kind: 'warn', text: 'Not every mistake returns an error. Asking for two queues from a family that has one, or passing a priority of 2.0, breaks the rules of the specification, and Vulkan does **not** check those rules itself: the result is undefined (it may work, crash or misbehave on another GPU). Catching them is exactly the job of the validation layers in the next module.' },
      { type: 'h2', text: 'Destroying in the right order' },
      { type: 'p', text: 'Every object must be destroyed **before** the object it was created from, and only when the GPU has finished using it. The easy rule: wait for the GPU to go idle at shutdown (`DeviceWaitIdle`), then destroy everything in the reverse order of creation. Try breaking the rule in the widget:' },
      { type: 'widget', name: 'vk-lifetime' },
      { type: 'h2', text: 'Wrapping it up: a GPU context' },
      { type: 'p', text: 'Every program in this course needs the same three objects, so it is worth wrapping them in one class. Here is the first version of the engine’s `GpuContext`. It finds a GPU with a graphics family, creates the device, and cleans up in `Dispose`, so a `using` statement guarantees the shutdown order:' },
      { type: 'code', title: 'GpuContext.cs', code: cs`
using Silk.NET.Core.Native;
using Silk.NET.Vulkan;

using (var gpu = new GpuContext("BIM Viewer"))
{
    Console.WriteLine($"Running on {gpu.DeviceName}");
    Console.WriteLine($"Graphics queue family {gpu.GraphicsFamily}");
}
Console.WriteLine("Cleaned up");

sealed unsafe class GpuContext : IDisposable
{
    public readonly Vk Vk = Vk.GetApi();
    public readonly Instance Instance;
    public readonly PhysicalDevice PhysicalDevice;
    public readonly Device Device;
    public readonly Queue GraphicsQueue;
    public readonly uint GraphicsFamily;
    public readonly string DeviceName;

    public GpuContext(string appName)
    {
        nint name = SilkMarshal.StringToPtr(appName);
        var appInfo = new ApplicationInfo { SType = StructureType.ApplicationInfo, PApplicationName = (byte*)name, ApiVersion = Vk.Version13 };
        var ci = new InstanceCreateInfo { SType = StructureType.InstanceCreateInfo, PApplicationInfo = &appInfo };
        Instance instance;
        Check(Vk.CreateInstance(&ci, null, &instance), "CreateInstance");
        Instance = instance;
        SilkMarshal.Free(name);

        uint n = 0;
        Vk.EnumeratePhysicalDevices(Instance, &n, null);
        var gpus = new PhysicalDevice[n];
        fixed (PhysicalDevice* p = gpus) Vk.EnumeratePhysicalDevices(Instance, &n, p);
        foreach (var candidate in gpus)
        {
            int family = FindGraphicsFamily(candidate);
            if (family < 0) continue;
            PhysicalDevice = candidate;
            GraphicsFamily = (uint)family;
            break;
        }
        if (PhysicalDevice.Handle == 0) throw new NotSupportedException("No GPU with a graphics queue");

        PhysicalDeviceProperties props;
        Vk.GetPhysicalDeviceProperties(PhysicalDevice, &props);
        DeviceName = SilkMarshal.PtrToString((nint)props.DeviceName)!;

        float priority = 1.0f;
        var queueInfo = new DeviceQueueCreateInfo { SType = StructureType.DeviceQueueCreateInfo, QueueFamilyIndex = GraphicsFamily, QueueCount = 1, PQueuePriorities = &priority };
        var f13 = new PhysicalDeviceVulkan13Features { SType = StructureType.PhysicalDeviceVulkan13Features, DynamicRendering = true, Synchronization2 = true };
        var features = new PhysicalDeviceFeatures2 { SType = StructureType.PhysicalDeviceFeatures2, PNext = &f13 };
        var deviceInfo = new DeviceCreateInfo { SType = StructureType.DeviceCreateInfo, PNext = &features, QueueCreateInfoCount = 1, PQueueCreateInfos = &queueInfo };
        Device device;
        Check(Vk.CreateDevice(PhysicalDevice, &deviceInfo, null, &device), "CreateDevice");
        Device = device;

        Queue queue;
        Vk.GetDeviceQueue(Device, GraphicsFamily, 0, &queue);
        GraphicsQueue = queue;
    }

    int FindGraphicsFamily(PhysicalDevice gpu)
    {
        uint count = 0;
        Vk.GetPhysicalDeviceQueueFamilyProperties(gpu, &count, null);
        var families = new QueueFamilyProperties[count];
        fixed (QueueFamilyProperties* p = families) Vk.GetPhysicalDeviceQueueFamilyProperties(gpu, &count, p);
        return Array.FindIndex(families, f => (f.QueueFlags & QueueFlags.GraphicsBit) != 0);
    }

    static void Check(Result r, string call)
    {
        if (r < 0) throw new InvalidOperationException($"{call} failed: {r}");
    }

    public void Dispose()
    {
        Vk.DeviceWaitIdle(Device);
        Vk.DestroyDevice(Device, null);
        Vk.DestroyInstance(Instance, null);
        Vk.Dispose();
    }
}`, output: 'Running on Intel(R) Iris(R) Xe Graphics\nGraphics queue family 0\nCleaned up' },
      { type: 'p', text: 'This class grows throughout the course: the next module adds validation, a window surface and the swapchain. Notice that the constructor already follows the module’s order exactly: instance, physical device, queue family, logical device, queue.' },
      { type: 'quiz', question: 'You call DestroyInstance and then DestroyDevice. What is wrong?', options: ['Nothing, the order does not matter', 'The device was created from the instance (through its physical device), so it must be destroyed first', 'DestroyDevice also destroys the instance', 'Queues must be destroyed before both'], answer: 1, explain: 'Children before parents: destroy the device (and everything created from it) before the instance. Queues are not destroyed separately; they go with the device.' },
      { type: 'exercise', task: 'Extend device creation so it only switches on what the GPU has: read `samplerAnisotropy`, `fillModeNonSolid` and `shaderFloat64` with `GetPhysicalDeviceFeatures`, enable each one that is supported, print which were enabled and which were skipped, then create the device and print the result.', hint: 'Read into one `PhysicalDeviceFeatures`, build a second one with only the supported wanted fields set, and pass the second as `PEnabledFeatures`.', solution: cs`
using Silk.NET.Vulkan;

Vk vk = Vk.GetApi();

unsafe
{
    var appInfo = new ApplicationInfo { SType = StructureType.ApplicationInfo, ApiVersion = Vk.Version13 };
    var ci = new InstanceCreateInfo { SType = StructureType.InstanceCreateInfo, PApplicationInfo = &appInfo };
    Instance instance;
    vk.CreateInstance(&ci, null, &instance);
    uint n = 1;
    PhysicalDevice gpu;
    vk.EnumeratePhysicalDevices(instance, &n, &gpu);

    PhysicalDeviceFeatures has;
    vk.GetPhysicalDeviceFeatures(gpu, &has);
    var enable = new PhysicalDeviceFeatures
    {
        SamplerAnisotropy = has.SamplerAnisotropy,
        FillModeNonSolid = has.FillModeNonSolid,
        ShaderFloat64 = has.ShaderFloat64
    };
    foreach (var (name, on) in new[] { ("samplerAnisotropy", (bool)enable.SamplerAnisotropy), ("fillModeNonSolid", (bool)enable.FillModeNonSolid), ("shaderFloat64", (bool)enable.ShaderFloat64) })
        Console.WriteLine($"{name}: {(on ? "enabled" : "skipped, not supported")}");

    float priority = 1.0f;
    var queueInfo = new DeviceQueueCreateInfo { SType = StructureType.DeviceQueueCreateInfo, QueueFamilyIndex = 0, QueueCount = 1, PQueuePriorities = &priority };
    var deviceInfo = new DeviceCreateInfo { SType = StructureType.DeviceCreateInfo, QueueCreateInfoCount = 1, PQueueCreateInfos = &queueInfo, PEnabledFeatures = &enable };
    Device device;
    Result r = vk.CreateDevice(gpu, &deviceInfo, null, &device);
    Console.WriteLine($"CreateDevice: {r}");
    if (r == Result.Success) vk.DestroyDevice(device, null);
    vk.DestroyInstance(instance, null);
}`, output: 'samplerAnisotropy: enabled\nfillModeNonSolid: enabled\nshaderFloat64: skipped, not supported\nCreateDevice: Success' }
    ],
    keyPoints: [
      'The logical device is your session with one GPU; almost every other object is created from it.',
      'Queues are requested per family with priorities at device creation, then fetched with GetDeviceQueue.',
      'Device extensions (such as VK_KHR_swapchain) and features are enabled at creation; features through a PhysicalDeviceFeatures2 chain.',
      'Unsupported features or extensions fail CreateDevice; breaking other rules is undefined and only validation layers catch it.',
      'Shut down by waiting for the GPU to go idle, then destroying objects in reverse order of creation.'
    ]
  }
];
