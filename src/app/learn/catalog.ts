import { Module, Topic, Track } from './learn.types';

/**
 * All learning tracks and their full syllabus, basic to master. Topics without `ready: true`
 * are shown as "coming soon". When a lesson is written, add it to the track's lesson map
 * (e.g. csharp/lessons.ts) and set `ready: true` here; it is then pre-rendered automatically.
 */
const CSHARP_MODULES: Module[] = [
  {
    title: 'Getting started',
    level: 'Beginner',
    topics: [
      { slug: 'what-is-csharp', title: 'What is C# and .NET?', ready: true },
      { slug: 'first-program', title: 'Your first C# program', ready: true },
      { slug: 'variables-and-data-types', title: 'Variables and data types', ready: true },
      { slug: 'type-conversion', title: 'Type conversion and parsing', ready: true },
      { slug: 'operators', title: 'Operators and expressions', ready: true },
      { slug: 'strings-and-console', title: 'Strings, input and output', ready: true }
    ]
  },
  {
    title: 'Control flow',
    level: 'Beginner',
    topics: [
      { slug: 'if-else', title: 'Decisions with if / else', ready: true },
      { slug: 'switch', title: 'switch statements and expressions', ready: true },
      { slug: 'loops', title: 'Loops: for, while, do-while, foreach', ready: true },
      { slug: 'break-continue', title: 'break, continue and nested loops', ready: true }
    ]
  },
  {
    title: 'Arrays and methods',
    level: 'Beginner',
    topics: [
      { slug: 'arrays', title: 'Arrays', ready: true },
      { slug: 'multidimensional-arrays', title: 'Multi-dimensional and jagged arrays', ready: true },
      { slug: 'methods', title: 'Methods and the call stack', ready: true },
      { slug: 'method-parameters', title: 'Parameters: ref, out, in, params, optional, named', ready: true },
      { slug: 'recursion', title: 'Recursion', ready: true },
      { slug: 'debugging', title: 'Debugging in Visual Studio', ready: true }
    ]
  },
  {
    title: 'Object-oriented programming',
    level: 'Intermediate',
    topics: [
      { slug: 'classes-and-objects', title: 'Classes and objects', ready: true },
      { slug: 'constructors', title: 'Constructors and object initialisers', ready: true },
      { slug: 'properties', title: 'Fields and properties', ready: true },
      { slug: 'access-modifiers', title: 'Access modifiers and encapsulation', ready: true },
      { slug: 'static-members', title: 'Static members and static classes', ready: true },
      { slug: 'inheritance', title: 'Inheritance', ready: true },
      { slug: 'polymorphism', title: 'Polymorphism: virtual and override', ready: true },
      { slug: 'abstract-classes', title: 'Abstract classes', ready: true },
      { slug: 'interfaces', title: 'Interfaces', ready: true },
      { slug: 'structs-and-records', title: 'Structs, records and value vs reference types', ready: true },
      { slug: 'enums', title: 'Enums', ready: true }
    ]
  },
  {
    title: 'Working with data',
    level: 'Intermediate',
    topics: [
      { slug: 'string-builder-formatting', title: 'StringBuilder and string formatting' },
      { slug: 'date-time', title: 'Dates and times' },
      { slug: 'exceptions', title: 'Exceptions: try, catch, finally, throw' },
      { slug: 'list-and-dictionary', title: 'Collections: List and Dictionary' },
      { slug: 'hashset-queue-stack', title: 'HashSet, Queue and Stack' },
      { slug: 'generics', title: 'Generics' },
      { slug: 'nullable-types', title: 'Nullable types and null safety' },
      { slug: 'file-io', title: 'Files and streams' },
      { slug: 'json', title: 'JSON serialisation' }
    ]
  },
  {
    title: 'Functional C# and LINQ',
    level: 'Intermediate',
    topics: [
      { slug: 'delegates', title: 'Delegates, Func and Action' },
      { slug: 'lambdas', title: 'Lambda expressions' },
      { slug: 'events', title: 'Events' },
      { slug: 'extension-methods', title: 'Extension methods' },
      { slug: 'linq-basics', title: 'LINQ basics: Where, Select, OrderBy' },
      { slug: 'linq-advanced', title: 'LINQ: grouping, joins and deferred execution' },
      { slug: 'pattern-matching', title: 'Pattern matching' },
      { slug: 'tuples-deconstruction', title: 'Tuples and deconstruction' }
    ]
  },
  {
    title: 'Advanced C#',
    level: 'Advanced',
    topics: [
      { slug: 'memory-and-gc', title: 'Memory: stack, heap and garbage collection' },
      { slug: 'idisposable', title: 'IDisposable and using' },
      { slug: 'iterators-yield', title: 'Iterators and yield' },
      { slug: 'async-await', title: 'async and await' },
      { slug: 'tasks-parallel', title: 'Tasks and parallel programming' },
      { slug: 'threads-and-locks', title: 'Threads, locks and thread safety' },
      { slug: 'reflection-attributes', title: 'Reflection and attributes' },
      { slug: 'span-memory', title: 'Span<T>, Memory<T> and low-allocation code' }
    ]
  },
  {
    title: 'Master level',
    level: 'Master',
    topics: [
      { slug: 'solid-principles', title: 'SOLID principles' },
      { slug: 'design-patterns', title: 'Design patterns in C#' },
      { slug: 'dependency-injection', title: 'Dependency injection' },
      { slug: 'unit-testing', title: 'Unit testing with xUnit' },
      { slug: 'performance-profiling', title: 'Performance: profiling and benchmarking' },
      { slug: 'unsafe-and-interop', title: 'unsafe code, pointers and native interop' },
      { slug: 'source-generators', title: 'Source generators' },
      { slug: 'clean-architecture', title: 'Structuring a real application' }
    ]
  }
];

export const TRACKS: Track[] = [
  {
    slug: 'csharp',
    title: 'C# Programming',
    short: 'C#',
    icon: 'bi-hash',
    description:
      'Learn C# from your very first line of code to advanced, high-performance .NET. Every topic in order, ' +
      'with interactive diagrams that show what your code really does.',
    live: true,
    modules: CSHARP_MODULES
  },
  {
    slug: 'dsa',
    title: 'Data Structures & Algorithms',
    short: 'DSA',
    icon: 'bi-diagram-3',
    description: 'Arrays, linked lists, trees, graphs, sorting and searching, explained with step-by-step visuals in C#.',
    live: false,
    modules: []
  },
  {
    slug: 'bim-math',
    title: 'BIM Math',
    short: 'BIM Math',
    icon: 'bi-rulers',
    description: 'The maths behind 3D and BIM software: vectors, matrices, transforms, planes and intersections.',
    live: false,
    modules: []
  },
  {
    slug: 'sql',
    title: 'SQL Server',
    short: 'SQL',
    icon: 'bi-database',
    description: 'Tables, queries, joins, indexes, stored procedures and database design.',
    live: false,
    modules: []
  },
  {
    slug: 'wpf',
    title: 'WPF & MVVM',
    short: 'WPF',
    icon: 'bi-window-stack',
    description: 'Build Windows desktop apps with XAML, data binding, commands and the MVVM pattern.',
    live: false,
    modules: []
  }
];

export function findTrack(slug: string): Track | undefined {
  return TRACKS.find(t => t.slug === slug);
}

/** Topics of a track in syllabus order. */
export function allTopics(track: Track): Topic[] {
  return track.modules.flatMap(m => m.topics);
}

export function readyTopics(track: Track): Topic[] {
  return allTopics(track).filter(t => t.ready);
}
