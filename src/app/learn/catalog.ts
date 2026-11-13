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
      { slug: 'string-builder-formatting', title: 'StringBuilder and string formatting', ready: true },
      { slug: 'date-time', title: 'Dates and times', ready: true },
      { slug: 'exceptions', title: 'Exceptions: try, catch, finally, throw', ready: true },
      { slug: 'list-and-dictionary', title: 'Collections: List and Dictionary', ready: true },
      { slug: 'hashset-queue-stack', title: 'HashSet, Queue and Stack', ready: true },
      { slug: 'generics', title: 'Generics', ready: true },
      { slug: 'nullable-types', title: 'Nullable types and null safety', ready: true },
      { slug: 'file-io', title: 'Files and streams', ready: true },
      { slug: 'json', title: 'JSON serialisation', ready: true }
    ]
  },
  {
    title: 'Functional C# and LINQ',
    level: 'Intermediate',
    topics: [
      { slug: 'delegates', title: 'Delegates, Func and Action', ready: true },
      { slug: 'lambdas', title: 'Lambda expressions', ready: true },
      { slug: 'events', title: 'Events', ready: true },
      { slug: 'extension-methods', title: 'Extension methods', ready: true },
      { slug: 'linq-basics', title: 'LINQ basics: Where, Select, OrderBy', ready: true },
      { slug: 'linq-advanced', title: 'LINQ: grouping, joins and deferred execution', ready: true },
      { slug: 'pattern-matching', title: 'Pattern matching', ready: true },
      { slug: 'tuples-deconstruction', title: 'Tuples and deconstruction', ready: true }
    ]
  },
  {
    title: 'Advanced C#',
    level: 'Advanced',
    topics: [
      { slug: 'memory-and-gc', title: 'Memory: stack, heap and garbage collection', ready: true },
      { slug: 'idisposable', title: 'IDisposable and using', ready: true },
      { slug: 'iterators-yield', title: 'Iterators and yield', ready: true },
      { slug: 'async-await', title: 'async and await', ready: true },
      { slug: 'tasks-parallel', title: 'Tasks and parallel programming', ready: true },
      { slug: 'threads-and-locks', title: 'Threads, locks and thread safety', ready: true },
      { slug: 'reflection-attributes', title: 'Reflection and attributes', ready: true },
      { slug: 'span-memory', title: 'Span<T>, Memory<T> and low-allocation code', ready: true }
    ]
  },
  {
    title: 'Master level',
    level: 'Master',
    topics: [
      { slug: 'solid-principles', title: 'SOLID principles', ready: true },
      { slug: 'design-patterns', title: 'Design patterns in C#', ready: true },
      { slug: 'dependency-injection', title: 'Dependency injection', ready: true },
      { slug: 'unit-testing', title: 'Unit testing with xUnit', ready: true },
      { slug: 'performance-profiling', title: 'Performance: profiling and benchmarking', ready: true },
      { slug: 'unsafe-and-interop', title: 'unsafe code, pointers and native interop', ready: true },
      { slug: 'source-generators', title: 'Source generators', ready: true },
      { slug: 'clean-architecture', title: 'Structuring a real application', ready: true }
    ]
  }
];

const DSA_MODULES: Module[] = [
  {
    title: 'Foundations',
    level: 'Beginner',
    topics: [
      { slug: 'what-is-dsa', title: 'What are data structures and algorithms?', ready: true },
      { slug: 'big-o', title: 'Measuring speed: Big-O notation', ready: true },
      { slug: 'analysing-code', title: 'Counting steps in real code', ready: true },
      { slug: 'space-complexity', title: 'Memory cost: space complexity', ready: true },
      { slug: 'recursion-for-dsa', title: 'Recursion, call trees and memoisation', ready: true }
    ]
  },
  {
    title: 'Linear data structures',
    level: 'Beginner',
    topics: [
      { slug: 'arrays-in-memory', title: 'Arrays in memory', ready: true },
      { slug: 'dynamic-arrays', title: 'Dynamic arrays: how List<T> grows', ready: true },
      { slug: 'linked-lists', title: 'Singly linked lists', ready: true },
      { slug: 'doubly-linked-lists', title: 'Doubly and circular linked lists', ready: true },
      { slug: 'stacks', title: 'Stacks and their uses', ready: true },
      { slug: 'queues', title: 'Queues, circular buffers and deques', ready: true }
    ]
  },
  {
    title: 'Searching and sorting',
    level: 'Intermediate',
    topics: [
      { slug: 'linear-binary-search', title: 'Linear search and binary search', ready: true },
      { slug: 'binary-search-variants', title: 'Binary search: bounds and searching for answers', ready: true },
      { slug: 'simple-sorts', title: 'Bubble, selection and insertion sort', ready: true },
      { slug: 'merge-sort', title: 'Merge sort', ready: true },
      { slug: 'quick-sort', title: 'Quick sort', ready: true },
      { slug: 'counting-radix-sort', title: 'Counting sort and radix sort', ready: true },
      { slug: 'sorting-in-dotnet', title: 'Sorting in .NET: stability and comparers', ready: true }
    ]
  },
  {
    title: 'Hashing and problem-solving techniques',
    level: 'Intermediate',
    topics: [
      { slug: 'hash-tables', title: 'How hash tables work', ready: true },
      { slug: 'hashing-problems', title: 'Solving problems with HashSet and Dictionary', ready: true },
      { slug: 'two-pointers', title: 'Two pointers', ready: true },
      { slug: 'sliding-window', title: 'Sliding window', ready: true },
      { slug: 'prefix-sums', title: 'Prefix sums and difference arrays', ready: true },
      { slug: 'bit-manipulation', title: 'Bit manipulation', ready: true }
    ]
  },
  {
    title: 'Trees',
    level: 'Intermediate',
    topics: [
      { slug: 'trees-basics', title: 'Trees and binary trees', ready: true },
      { slug: 'tree-traversals', title: 'Tree traversals: pre, in, post and level order', ready: true },
      { slug: 'binary-search-trees', title: 'Binary search trees', ready: true },
      { slug: 'balanced-trees', title: 'Balanced trees: AVL, red-black and B-trees', ready: true },
      { slug: 'heaps-priority-queues', title: 'Heaps and priority queues', ready: true },
      { slug: 'tries', title: 'Tries (prefix trees)', ready: true }
    ]
  },
  {
    title: 'Graphs',
    level: 'Advanced',
    topics: [
      { slug: 'graph-basics', title: 'Graphs and how to store them', ready: true },
      { slug: 'bfs', title: 'Breadth-first search', ready: true },
      { slug: 'dfs', title: 'Depth-first search', ready: true },
      { slug: 'topological-sort', title: 'Topological sort', ready: true },
      { slug: 'dijkstra', title: 'Shortest paths: Dijkstra', ready: true },
      { slug: 'bellman-ford-floyd', title: 'Bellman-Ford and Floyd-Warshall', ready: true },
      { slug: 'minimum-spanning-trees', title: 'Minimum spanning trees', ready: true },
      { slug: 'union-find', title: 'Union-find (disjoint sets)', ready: true }
    ]
  },
  {
    title: 'Algorithm design',
    level: 'Advanced',
    topics: [
      { slug: 'greedy', title: 'Greedy algorithms', ready: true },
      { slug: 'divide-and-conquer', title: 'Divide and conquer', ready: true },
      { slug: 'backtracking', title: 'Backtracking', ready: true },
      { slug: 'dp-intro', title: 'Dynamic programming: the idea', ready: true },
      { slug: 'dp-classic', title: 'Dynamic programming: grids and sequences', ready: true },
      { slug: 'dp-advanced', title: 'Dynamic programming: knapsack, LCS and edit distance', ready: true }
    ]
  },
  {
    title: 'Master level',
    level: 'Master',
    topics: [
      { slug: 'segment-fenwick-trees', title: 'Segment trees and Fenwick trees', ready: true },
      { slug: 'string-matching', title: 'String matching: KMP and Rabin-Karp', ready: true },
      { slug: 'spatial-indexes', title: 'Spatial indexes: grids, quadtrees and BVH', ready: true },
      { slug: 'computational-geometry', title: 'Computational geometry basics', ready: true },
      { slug: 'np-complete', title: 'Hard problems: P, NP and approximation', ready: true },
      { slug: 'problem-solving-strategy', title: 'How to solve any DSA problem', ready: true }
    ]
  }
];

const BIM_MODULES: Module[] = [
  {
    title: 'Foundations',
    level: 'Beginner',
    topics: [
      { slug: 'why-bim-math', title: 'Why BIM software runs on maths', ready: true },
      { slug: 'coordinate-systems', title: 'Coordinate systems: 2D, 3D, right-handed, Z-up', ready: true },
      { slug: 'units-precision-tolerance', title: 'Units, precision and tolerance', ready: true },
      { slug: 'angles-atan2', title: 'Angles: degrees, radians and Atan2', ready: true },
      { slug: 'trigonometry-on-site', title: 'Trigonometry on site: slopes, pitches, rise and run', ready: true }
    ]
  },
  {
    title: 'Vectors',
    level: 'Beginner',
    topics: [
      { slug: 'points-vs-vectors', title: 'Points vs vectors', ready: true },
      { slug: 'vector-arithmetic', title: 'Adding, subtracting and scaling vectors', ready: true },
      { slug: 'length-unit-vectors', title: 'Length, distance and unit vectors', ready: true },
      { slug: 'dot-product', title: 'The dot product: angles, projection, facing', ready: true },
      { slug: 'cross-product', title: 'The cross product: normals, area, left or right', ready: true },
      { slug: 'vec3-struct', title: 'Building a Vec3 struct in C#', ready: true }
    ]
  },
  {
    title: 'Lines and curves',
    level: 'Intermediate',
    topics: [
      { slug: 'parametric-lines', title: 'Lines, rays and segments in parametric form', ready: true },
      { slug: 'closest-point', title: 'Closest point and distance to a line or segment', ready: true },
      { slug: 'line-intersections', title: 'Line intersections in 2D, and skew lines in 3D', ready: true },
      { slug: 'circles-arcs', title: 'Circles and arcs: 3-point arcs and tangents', ready: true },
      { slug: 'polylines', title: 'Polylines: length, offsetting and fillets', ready: true },
      { slug: 'bezier-splines', title: 'Bézier curves and splines', ready: true }
    ]
  },
  {
    title: 'Planes and polygons',
    level: 'Intermediate',
    topics: [
      { slug: 'planes', title: 'Planes: point and normal, ax + by + cz + d', ready: true },
      { slug: 'point-plane', title: 'Point-to-plane distance and projection', ready: true },
      { slug: 'plane-intersections', title: 'Line–plane and plane–plane intersection', ready: true },
      { slug: 'polygon-area-normal', title: 'Polygon area, normal and winding', ready: true },
      { slug: 'point-in-polygon-triangulation', title: 'Point in polygon and triangulation', ready: true },
      { slug: 'polygon-offsets-booleans', title: 'Polygon offsets and boolean operations', ready: true }
    ]
  },
  {
    title: 'Matrices and transforms',
    level: 'Advanced',
    topics: [
      { slug: 'matrices', title: 'Matrices and matrix multiplication', ready: true },
      { slug: 'rotation', title: 'Rotation in 2D, 3D and about any axis', ready: true },
      { slug: 'homogeneous-transforms', title: 'Homogeneous coordinates and 4×4 transforms', ready: true },
      { slug: 'composing-transforms', title: 'Composing transforms: order and inverses', ready: true },
      { slug: 'local-world', title: 'Local vs world: families, instances and nested placement', ready: true },
      { slug: 'mirroring-handedness', title: 'Mirroring and handedness', ready: true }
    ]
  },
  {
    title: 'Rotations in depth',
    level: 'Advanced',
    topics: [
      { slug: 'euler-gimbal-lock', title: 'Euler angles and gimbal lock', ready: true },
      { slug: 'quaternions', title: 'Quaternions without fear', ready: true },
      { slug: 'slerp', title: 'Interpolating rotations: lerp vs slerp', ready: true }
    ]
  },
  {
    title: '3D geometry and solids',
    level: 'Advanced',
    topics: [
      { slug: 'bounding-boxes', title: 'Bounding boxes: AABB and OBB', ready: true },
      { slug: 'meshes', title: 'Meshes: vertices, faces and normals', ready: true },
      { slug: 'ray-triangle', title: 'Ray–triangle intersection', ready: true },
      { slug: 'clash-detection', title: 'Clash detection and the separating-axis theorem', ready: true },
      { slug: 'volumes-areas', title: 'Volumes and surface areas of solids', ready: true },
      { slug: 'sections', title: 'Sections: cutting a mesh with a plane', ready: true }
    ]
  },
  {
    title: 'Master level',
    level: 'Master',
    topics: [
      { slug: 'robust-geometry', title: 'Robust geometry: epsilons, snapping and exact predicates', ready: true },
      { slug: 'georeferencing', title: 'Survey points, true north and georeferencing', ready: true },
      { slug: 'cameras-projection', title: 'Cameras: view matrices, perspective and section boxes', ready: true },
      { slug: 'brep-nurbs', title: 'B-rep and NURBS: how BIM kernels store solids', ready: true },
      { slug: 'spatial-queries-scale', title: 'Spatial queries at scale', ready: true },
      { slug: 'mini-geometry-engine', title: 'Putting it together: a mini room-and-wall geometry engine', ready: true }
    ]
  }
];

const SQL_MODULES: Module[] = [
  {
    title: 'Foundations',
    level: 'Beginner',
    topics: [
      { slug: 'what-is-a-database', title: 'What is a database? SQL Server, SSMS and the BuildMart sample', ready: true },
      { slug: 'tables-and-data-types', title: 'Tables, rows, columns and data types', ready: true },
      { slug: 'select-basics', title: 'Your first SELECT: columns, aliases and expressions', ready: true },
      { slug: 'where-filtering', title: 'Filtering rows with WHERE', ready: true },
      { slug: 'null-values', title: 'NULL and three-valued logic', ready: true },
      { slug: 'sorting-and-paging', title: 'Sorting and paging: ORDER BY, TOP, OFFSET and DISTINCT', ready: true }
    ]
  },
  {
    title: 'Creating and changing data',
    level: 'Beginner',
    topics: [
      { slug: 'create-table', title: 'Creating tables and choosing types', ready: true },
      { slug: 'insert', title: 'Adding rows with INSERT', ready: true },
      { slug: 'update-delete', title: 'Changing and removing rows: UPDATE and DELETE', ready: true },
      { slug: 'constraints', title: 'Constraints: primary keys, UNIQUE, CHECK and DEFAULT', ready: true },
      { slug: 'identity-sequences', title: 'IDENTITY, sequences and generated keys', ready: true },
      { slug: 'alter-drop', title: 'Changing tables safely: ALTER and DROP', ready: true }
    ]
  },
  {
    title: 'Functions and expressions',
    level: 'Beginner',
    topics: [
      { slug: 'string-functions', title: 'Working with text: string functions', ready: true },
      { slug: 'numbers-and-maths', title: 'Numbers: integer division, rounding and decimal precision', ready: true },
      { slug: 'dates-and-times', title: 'Dates and times', ready: true },
      { slug: 'case-expressions', title: 'Decisions inside a query: CASE and IIF', ready: true },
      { slug: 'conversion', title: 'Converting types: CAST, CONVERT and TRY_CAST', ready: true }
    ]
  },
  {
    title: 'Joins and combining tables',
    level: 'Intermediate',
    topics: [
      { slug: 'relationships-keys', title: 'Relationships and foreign keys', ready: true },
      { slug: 'inner-join', title: 'INNER JOIN: matching rows across tables', ready: true },
      { slug: 'outer-joins', title: 'LEFT, RIGHT and FULL OUTER JOIN', ready: true },
      { slug: 'self-cross-joins', title: 'Self joins and CROSS JOIN', ready: true },
      { slug: 'set-operators', title: 'UNION, INTERSECT and EXCEPT', ready: true },
      { slug: 'normalisation', title: 'Designing tables: normalisation', ready: true }
    ]
  },
  {
    title: 'Grouping and subqueries',
    level: 'Intermediate',
    topics: [
      { slug: 'aggregates', title: 'Aggregates: COUNT, SUM, AVG, MIN and MAX', ready: true },
      { slug: 'group-by-having', title: 'GROUP BY and HAVING', ready: true },
      { slug: 'subqueries', title: 'Subqueries: scalar, list and correlated', ready: true },
      { slug: 'exists', title: 'EXISTS and NOT EXISTS', ready: true },
      { slug: 'ctes', title: 'Common table expressions (WITH)', ready: true },
      { slug: 'recursive-ctes', title: 'Recursive CTEs: hierarchies and bills of materials', ready: true }
    ]
  },
  {
    title: 'Advanced querying',
    level: 'Advanced',
    topics: [
      { slug: 'window-ranking', title: 'Window functions: ROW_NUMBER, RANK and NTILE', ready: true },
      { slug: 'window-aggregates', title: 'Running totals, moving averages, LAG and LEAD', ready: true },
      { slug: 'pivot-unpivot', title: 'PIVOT and UNPIVOT', ready: true },
      { slug: 'apply', title: 'CROSS APPLY and OUTER APPLY', ready: true },
      { slug: 'json-in-sql', title: 'JSON in SQL Server', ready: true },
      { slug: 'merge-upsert', title: 'MERGE, upserts and the OUTPUT clause', ready: true }
    ]
  },
  {
    title: 'Programmability',
    level: 'Advanced',
    topics: [
      { slug: 'views', title: 'Views', ready: true },
      { slug: 'tsql-batches-variables', title: 'T-SQL batches, variables and control flow', ready: true },
      { slug: 'stored-procedures', title: 'Stored procedures and parameters', ready: true },
      { slug: 'user-defined-functions', title: 'Scalar and table-valued functions', ready: true },
      { slug: 'error-handling', title: 'Error handling: TRY...CATCH and THROW', ready: true },
      { slug: 'triggers', title: 'Triggers', ready: true }
    ]
  },
  {
    title: 'Indexes and performance',
    level: 'Advanced',
    topics: [
      { slug: 'how-data-is-stored', title: 'How SQL Server stores data: pages, heaps and B-trees', ready: true },
      { slug: 'clustered-indexes', title: 'Clustered indexes', ready: true },
      { slug: 'nonclustered-indexes', title: 'Nonclustered and covering indexes', ready: true },
      { slug: 'execution-plans', title: 'Reading execution plans', ready: true },
      { slug: 'sargability-statistics', title: 'Sargable queries and statistics', ready: true },
      { slug: 'query-tuning', title: 'Finding and fixing slow queries', ready: true }
    ]
  },
  {
    title: 'Master level',
    level: 'Master',
    topics: [
      { slug: 'transactions-acid', title: 'Transactions and ACID', ready: true },
      { slug: 'isolation-locking', title: 'Isolation levels, locking and blocking', ready: true },
      { slug: 'deadlocks-snapshot', title: 'Deadlocks and row versioning (snapshot isolation)', ready: true },
      { slug: 'temporal-tables', title: 'Temporal tables: history and point-in-time queries', ready: true },
      { slug: 'security-injection', title: 'Security: logins, roles, permissions and SQL injection', ready: true },
      { slug: 'csharp-data-access', title: 'Calling SQL Server from C#: ADO.NET, Dapper and EF Core', ready: true },
      { slug: 'database-capstone', title: 'Putting it together: designing an order-management database', ready: true }
    ]
  }
];

const VULKAN_MODULES: Module[] = [
  {
    title: 'Foundations: talking to the GPU',
    level: 'Beginner',
    topics: [
      { slug: 'what-is-vulkan', title: 'What Vulkan is, and how a GPU draws a frame', ready: true },
      { slug: 'setup-silk-net', title: 'Setting up: .NET, Silk.NET and your first Vulkan call', ready: true },
      { slug: 'api-patterns', title: 'How the API works: create-info structs, handles and results', ready: true },
      { slug: 'instance', title: 'The instance, extensions and layers', ready: true },
      { slug: 'physical-devices', title: 'Choosing a GPU: properties, features, limits and memory', ready: true },
      { slug: 'queue-families', title: 'Queue families: graphics, compute and transfer', ready: true },
      { slug: 'logical-device', title: 'The logical device, queues and cleaning up', ready: true }
    ]
  },
  {
    title: 'Your first triangle',
    level: 'Beginner',
    topics: [
      { slug: 'validation-layers', title: 'Validation layers and debug messages', ready: true },
      { slug: 'window-surface', title: 'A window and a surface', ready: true },
      { slug: 'swapchain', title: 'The swapchain: images for the screen', ready: true },
      { slug: 'image-views', title: 'Image views', ready: true },
      { slug: 'shaders-spirv', title: 'Shaders: GLSL, SPIR-V and shader modules', ready: true },
      { slug: 'graphics-pipeline', title: 'The graphics pipeline object', ready: true },
      { slug: 'command-buffers', title: 'Command buffers, queues and your first clear', ready: true },
      { slug: 'dynamic-rendering', title: 'Dynamic rendering: drawing the triangle', ready: true },
      { slug: 'frames-in-flight', title: 'The render loop and frames in flight', ready: true },
      { slug: 'swapchain-recreation', title: 'Resizing: recreating the swapchain', ready: true }
    ]
  },
  {
    title: 'Buffers, memory and descriptors',
    level: 'Intermediate',
    topics: [
      { slug: 'vertex-buffers', title: 'Vertex buffers and vertex input', ready: true },
      { slug: 'memory-types', title: 'GPU memory: heaps, types and allocation', ready: true },
      { slug: 'staging-buffers', title: 'Staging buffers and transfers', ready: true },
      { slug: 'index-buffers', title: 'Index buffers', ready: true },
      { slug: 'uniform-buffers', title: 'Uniform buffers and descriptor sets', ready: true },
      { slug: 'push-constants', title: 'Push constants', ready: true },
      { slug: 'memory-allocator', title: 'Writing a simple memory allocator', ready: true }
    ]
  },
  {
    title: 'Images and 3D',
    level: 'Intermediate',
    topics: [
      { slug: 'camera-transforms', title: 'Model, view and projection matrices for Vulkan', ready: true },
      { slug: 'depth-buffer', title: 'The depth buffer', ready: true },
      { slug: 'textures-samplers', title: 'Textures, image layouts and samplers', ready: true },
      { slug: 'loading-models', title: 'Loading meshes: OBJ and glTF', ready: true },
      { slug: 'mipmaps', title: 'Mipmaps', ready: true },
      { slug: 'msaa', title: 'Multisampling (MSAA)', ready: true },
      { slug: 'camera-controls', title: 'An orbit camera for navigating a model', ready: true }
    ]
  },
  {
    title: 'Engine architecture',
    level: 'Advanced',
    topics: [
      { slug: 'engine-structure', title: 'Structuring a render engine in C#', ready: true },
      { slug: 'resource-lifetime', title: 'Resource lifetime and deletion queues', ready: true },
      { slug: 'materials-pipelines', title: 'Materials, pipeline caches and pipeline variants', ready: true },
      { slug: 'descriptor-management', title: 'Descriptor management and bindless resources', ready: true },
      { slug: 'shader-hot-reload', title: 'Shader compilation, reflection and hot reload', ready: true },
      { slug: 'render-graph', title: 'A simple render graph: passes and barriers', ready: true },
      { slug: 'multithreaded-recording', title: 'Recording commands on several threads', ready: true }
    ]
  },
  {
    title: 'Lighting and shading',
    level: 'Advanced',
    topics: [
      { slug: 'blinn-phong', title: 'Lighting basics: normals and Blinn-Phong' },
      { slug: 'pbr', title: 'Physically based rendering (PBR)' },
      { slug: 'shadow-mapping', title: 'Shadow mapping' },
      { slug: 'image-based-lighting', title: 'Environment maps and image-based lighting' },
      { slug: 'deferred-shading', title: 'Deferred shading' },
      { slug: 'post-processing', title: 'HDR, tone mapping and post-processing' }
    ]
  },
  {
    title: 'Large scenes and performance',
    level: 'Master',
    topics: [
      { slug: 'gpu-profiling', title: 'Measuring the GPU: timestamp queries and statistics' },
      { slug: 'frustum-culling', title: 'Frustum culling' },
      { slug: 'instancing', title: 'Instancing repeated elements' },
      { slug: 'indirect-drawing', title: 'Indirect drawing and GPU-driven culling' },
      { slug: 'level-of-detail', title: 'Level of detail' },
      { slug: 'compute-shaders', title: 'Compute shaders in depth' },
      { slug: 'synchronization-deep-dive', title: 'Synchronisation in depth: barriers and timeline semaphores' }
    ]
  },
  {
    title: 'Master level: a BIM viewer engine',
    level: 'Master',
    topics: [
      { slug: 'bim-model-rendering', title: 'Rendering a large BIM model' },
      { slug: 'object-picking', title: 'Picking elements with an ID buffer' },
      { slug: 'section-planes', title: 'Section planes and section boxes' },
      { slug: 'edges-outlines', title: 'Edges, outlines and selection highlights' },
      { slug: 'transparency', title: 'Transparency: glass and order-independent methods' },
      { slug: 'engine-capstone', title: 'Putting it together: a BIM viewer on your engine' }
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
    description:
      'Arrays, linked lists, trees, graphs, sorting, searching and dynamic programming, from Big-O basics to ' +
      'master-level structures. Every algorithm explained with step-by-step visuals and C# code.',
    live: true,
    modules: DSA_MODULES
  },
  {
    slug: 'bim-math',
    title: 'BIM Math',
    short: 'BIM Math',
    icon: 'bi-rulers',
    description:
      'The maths behind 3D and BIM software: coordinates, vectors, lines, planes, transforms, rotations and solids, ' +
      'up to clash detection and georeferencing. Every idea drawn interactively and coded in C#.',
    live: true,
    modules: BIM_MODULES
  },
  {
    slug: 'sql',
    title: 'SQL Server',
    short: 'SQL',
    icon: 'bi-database',
    description:
      'Query, change and design databases with T-SQL, from your first SELECT to indexes, execution plans and ' +
      'transactions. Every query runs against one sample database, with interactive diagrams of what SQL Server does.',
    live: true,
    modules: SQL_MODULES
  },
  {
    slug: 'wpf',
    title: 'WPF & MVVM',
    short: 'WPF',
    icon: 'bi-window-stack',
    description: 'Build Windows desktop apps with XAML, data binding, commands and the MVVM pattern.',
    live: false,
    modules: []
  },
  {
    slug: 'vulkan',
    title: 'Vulkan Render Engine',
    short: 'Vulkan',
    icon: 'bi-gpu-card',
    description:
      'Build a real-time 3D render engine on Vulkan in C# with Silk.NET: devices, swapchains, pipelines, buffers, ' +
      'descriptors and synchronisation, up to lighting and drawing large BIM models. Every sample runs on a real GPU.',
    live: true,
    modules: VULKAN_MODULES
  },
  {
    slug: 'csg',
    title: 'Constructive Solid Geometry (CSG)',
    short: 'CSG',
    icon: 'bi-intersect',
    description:
      'Model solids by combining simple shapes with union, difference and intersection: CSG trees, ' +
      'mesh booleans and the robustness problems behind them, coded in C#.',
    live: false,
    modules: []
  },
  {
    slug: 'aspnet-core',
    title: 'ASP.NET Core Web APIs',
    short: 'ASP.NET Core',
    icon: 'bi-cloud-arrow-up',
    description:
      'Build and ship web APIs with ASP.NET Core: routing, minimal APIs and controllers, EF Core, validation, ' +
      'authentication, testing and deployment.',
    live: false,
    modules: []
  },
  {
    slug: 'design-patterns',
    title: 'Design Patterns & Clean Architecture in C#',
    short: 'Patterns',
    icon: 'bi-bricks',
    description:
      'Write code that stays easy to change: SOLID, the classic design patterns, dependency injection, ' +
      'and Clean Architecture layers, with C# examples and tests.',
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
