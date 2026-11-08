import { Lesson } from '../learn.types';
import { cs } from '../csharp/cs';

export const GRAPHS: Lesson[] = [
  // ------------------------------------------------------------------ 31
  {
    slug: 'graph-basics',
    title: 'Graphs and how to store them',
    summary: 'Learn what a graph is (vertices, edges, directed, weighted, cycles), where graphs appear in real software, and how to store one as an adjacency list, an adjacency matrix or an edge list.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'A tree has one root and every node has one parent. Many real networks are messier: roads connect places in loops, a task can depend on several other tasks, a beam is connected to two columns and three secondary beams. A **graph** is the general model for “things and the connections between them”, and the rest of this module is about the algorithms that work on it.' },
      { type: 'h2', text: 'The vocabulary' },
      { type: 'table', head: ['Term', 'Meaning'], rows: [
        ['Vertex (node)', 'A thing: a place, a task, a beam, a web page'],
        ['Edge', 'A connection between two vertices'],
        ['Undirected / directed', 'A two-way road vs a one-way street (“A depends on B” is directed)'],
        ['Weighted', 'Each edge has a number: distance, time, cost, capacity'],
        ['Degree', 'Number of edges at a vertex (directed: in-degree and out-degree)'],
        ['Path', 'A sequence of vertices joined by edges'],
        ['Cycle', 'A path that returns to where it started'],
        ['Connected', 'Every vertex can reach every other one'],
        ['DAG', 'Directed acyclic graph: directed, with no cycles (dependencies, schedules)'],
        ['V and E', 'The number of vertices and of edges, used in every complexity formula']
      ] },
      { type: 'p', text: 'A tree is just a special graph: connected, with no cycles, and exactly V − 1 edges.' },
      { type: 'p', text: 'Graphs are everywhere: road and rail networks, the internet, project dependencies in a .NET solution, task schedules, social networks, electrical circuits, pipe networks, and the connections between elements in a structural model.' },
      { type: 'widget', name: 'graph-store' },
      { type: 'h2', text: 'Adjacency list: each vertex knows its neighbours' },
      { type: 'p', text: 'The most common representation: for every vertex, a list of its neighbours (with weights if needed). It uses memory proportional to V + E and lists a vertex’s neighbours directly, which is exactly what most algorithms need.' },
      { type: 'code', title: 'AdjacencyList.cs', code: cs`
var roads = new Dictionary<string, List<(string To, int Minutes)>>();

void AddRoad(string a, string b, int minutes)
{
    if (!roads.ContainsKey(a)) roads[a] = new();
    if (!roads.ContainsKey(b)) roads[b] = new();
    roads[a].Add((b, minutes));          // undirected: store both directions
    roads[b].Add((a, minutes));
}

AddRoad("Gate", "Store", 4);
AddRoad("Gate", "Office", 2);
AddRoad("Store", "Yard", 3);
AddRoad("Office", "Yard", 5);

foreach (var (place, list) in roads)
    Console.WriteLine($"{place}: {string.Join(", ", list.Select(r => $"{r.To} ({r.Minutes})"))}");

Console.WriteLine($"Degree of Yard: {roads["Yard"].Count}");`, output: 'Gate: Store (4), Office (2)\nStore: Gate (4), Yard (3)\nOffice: Gate (2), Yard (5)\nYard: Store (3), Office (5)\nDegree of Yard: 2' },
      { type: 'p', text: 'Algorithms usually number the vertices 0 to V − 1 and use an array of lists, which is faster than a dictionary of strings. Keep a separate `string[] names` if you need the labels back.' },
      { type: 'h2', text: 'Adjacency matrix: a V × V table' },
      { type: 'p', text: '`m[i, j]` holds 1 (or the weight) if there is an edge from i to j. Checking one particular connection is O(1), but the table always uses V² cells, even when there are few edges, and listing the neighbours of a vertex means scanning a whole row.' },
      { type: 'code', title: 'ListAndMatrix.cs', code: cs`
int n = 5;
int[][] edges = { new[] { 0, 1 }, new[] { 0, 2 }, new[] { 1, 3 }, new[] { 2, 3 }, new[] { 3, 4 } };

var adj = new List<int>[n];                     // adjacency list
for (int i = 0; i < n; i++) adj[i] = new List<int>();
var matrix = new bool[n, n];                    // adjacency matrix

foreach (var e in edges)
{
    adj[e[0]].Add(e[1]); adj[e[1]].Add(e[0]);
    matrix[e[0], e[1]] = matrix[e[1], e[0]] = true;
}

for (int i = 0; i < n; i++)
    Console.WriteLine($"{i}: {string.Join(" ", adj[i])}");
Console.WriteLine(matrix[3, 4]);                // is there an edge 3-4? O(1)
Console.WriteLine(matrix[0, 4]);`, output: '0: 1 2\n1: 0 3\n2: 0 3\n3: 1 2 4\n4: 3\nTrue\nFalse' },
      { type: 'table', head: ['', 'Adjacency list', 'Adjacency matrix', 'Edge list'], rows: [
        ['Memory', 'O(V + E)', 'O(V²)', 'O(E)'],
        ['Is there an edge u–v?', 'O(degree of u)', 'O(1)', 'O(E)'],
        ['All neighbours of u', 'O(degree of u)', 'O(V)', 'O(E)'],
        ['Best for', 'Most graphs (sparse)', 'Small or very dense graphs', 'Algorithms that just loop over edges (Kruskal, Bellman-Ford)']
      ] },
      { type: 'note', kind: 'info', text: 'Real graphs are almost always **sparse**: a road junction has a handful of roads, not thousands. A road network of 1 million junctions needs a few million list entries, but a matrix of 10¹² cells (a terabyte). Default to adjacency lists.' },
      { type: 'h2', text: 'Graphs you never build' },
      { type: 'p', text: 'Sometimes the graph is **implicit**: you compute the neighbours when you need them. A grid is a graph where each cell’s neighbours are the cells above, below, left and right. A puzzle is a graph where each state’s neighbours are the states one move away. You will see this in the BFS lesson.' },
      { type: 'quiz', question: 'An undirected graph has 11 edges. How many entries does its adjacency list hold in total?', options: ['11', '22', '121', 'It depends on V'], answer: 1, explain: 'Each undirected edge appears twice: in the list of both of its ends. In general 2E.' },
      { type: 'quiz', question: 'Which representation would you choose for a city map with 200,000 junctions?', options: ['Adjacency matrix', 'Adjacency list', 'Either; they use the same memory', 'A 2D array of strings'], answer: 1, explain: 'A matrix needs 200,000² = 40 billion cells. The graph is sparse, so a list needs only O(V + E).' },
      { type: 'exercise', task: 'Construction dependencies are given as (before, after) pairs. Compute the **in-degree** (number of prerequisites) of every task and print the tasks that can start immediately (in-degree 0), in the order they first appear. Pairs: Survey→Excavate, Excavate→Footings, Order steel→Fabricate, Fabricate→Columns, Footings→Columns.', hint: 'Use a `Dictionary<string, int>`. For each pair, make sure the first task exists with `TryAdd(task, 0)`, and add 1 to the second task.', solution: cs`
var deps = new (string Before, string After)[]
{
    ("Survey", "Excavate"), ("Excavate", "Footings"), ("Order steel", "Fabricate"),
    ("Fabricate", "Columns"), ("Footings", "Columns")
};

var inDegree = new Dictionary<string, int>();
foreach (var (a, b) in deps)
{
    inDegree.TryAdd(a, 0);
    inDegree[b] = inDegree.GetValueOrDefault(b) + 1;
}

foreach (var (task, d) in inDegree)
    Console.WriteLine($"{task}: {d}");

var starts = inDegree.Where(p => p.Value == 0).Select(p => p.Key);
Console.WriteLine("Can start now: " + string.Join(", ", starts));`, output: 'Survey: 0\nExcavate: 1\nFootings: 1\nOrder steel: 0\nFabricate: 1\nColumns: 2\nCan start now: Survey, Order steel' }
    ],
    keyPoints: [
      'A graph is vertices plus edges; edges can be directed and/or weighted.',
      'Adjacency lists use O(V + E) memory and list neighbours fast: the default choice.',
      'An adjacency matrix answers “is there an edge?” in O(1) but costs O(V²) memory.',
      'Grids and puzzles are implicit graphs: compute neighbours on the fly.'
    ]
  },

  // ------------------------------------------------------------------ 32
  {
    slug: 'bfs',
    title: 'Breadth-first search',
    summary: 'Explore a graph in rings of increasing distance with a queue, find shortest paths in unweighted graphs and grids, rebuild the path, and use multi-source BFS.',
    minutes: 15,
    blocks: [
      { type: 'p', text: '**Breadth-first search** (BFS) explores a graph like a ripple spreading on water: first the start, then everything one step away, then everything two steps away, and so on. That order gives it a special power: in a graph where every edge counts as one step, the first time BFS reaches a vertex, it has found a **shortest path** to it.' },
      { type: 'h2', text: 'The algorithm' },
      { type: 'ol', items: [
        'Put the start in a **queue** and mark it visited with distance 0.',
        'Take the vertex at the front of the queue.',
        'For each neighbour not yet visited: mark it visited, set its distance to this vertex’s distance + 1, remember where it came from, and add it at the back of the queue.',
        'Repeat until the queue is empty (or until you reach the target).'
      ] },
      { type: 'p', text: 'Because the queue is first-in-first-out, every vertex at distance 1 is processed before any at distance 2. Each vertex enters the queue once and each edge is looked at once (twice if undirected): **O(V + E)**.' },
      { type: 'widget', name: 'bfs-grid' },
      { type: 'code', title: 'Bfs.cs', code: cs`
var adj = new Dictionary<char, char[]>
{
    ['A'] = new[] { 'B', 'D' },
    ['B'] = new[] { 'A', 'C', 'E' },
    ['C'] = new[] { 'B', 'E', 'F' },
    ['D'] = new[] { 'A', 'E', 'G' },
    ['E'] = new[] { 'B', 'C', 'D', 'F', 'G' },
    ['F'] = new[] { 'C', 'E', 'G' },
    ['G'] = new[] { 'D', 'E', 'F' }
};

var (steps, cameFrom) = Bfs(adj, 'A');
foreach (var (node, d) in steps) Console.Write($"{node}:{d} ");
Console.WriteLine();
Console.WriteLine(string.Join(" → ", PathTo(cameFrom, 'F')));

static (Dictionary<char, int>, Dictionary<char, char>) Bfs(Dictionary<char, char[]> adj, char start)
{
    var dist = new Dictionary<char, int> { [start] = 0 };   // doubles as the "visited" set
    var parent = new Dictionary<char, char>();
    var queue = new Queue<char>();
    queue.Enqueue(start);
    while (queue.Count > 0)
    {
        char u = queue.Dequeue();
        foreach (char v in adj[u])
        {
            if (dist.ContainsKey(v)) continue;       // already discovered
            dist[v] = dist[u] + 1;
            parent[v] = u;
            queue.Enqueue(v);
        }
    }
    return (dist, parent);
}

static List<char> PathTo(Dictionary<char, char> parent, char target)
{
    var path = new List<char> { target };
    while (parent.TryGetValue(path[^1], out char p)) path.Add(p);   // walk back to the start
    path.Reverse();
    return path;
}`, output: 'A:0 B:1 D:1 C:2 E:2 G:2 F:3 \nA → B → C → F' },
      { type: 'note', kind: 'warn', text: 'Mark a vertex as visited when you **add** it to the queue, not when you take it out. Otherwise the same vertex can be added many times by different neighbours, and on a big grid the queue explodes.' },
      { type: 'h2', text: 'BFS on a grid' },
      { type: 'p', text: 'A site plan, a game map or a floor layout is an implicit graph: each free cell is a vertex, and its neighbours are the free cells next to it. You do not build any lists; you compute the four neighbours as you go.' },
      { type: 'code', title: 'GridBfs.cs', code: cs`
string[] plan =
{
    "S..#......",
    "...#..#...",
    ".#....#.#.",
    "...#..#..T"
};
Console.WriteLine(ShortestWalk(plan));

static int ShortestWalk(string[] g)
{
    int rows = g.Length, cols = g[0].Length;
    var dist = new int[rows, cols];
    var queue = new Queue<(int R, int C)>();
    for (int r = 0; r < rows; r++)
        for (int c = 0; c < cols; c++)
        {
            dist[r, c] = -1;                                       // -1 = not visited
            if (g[r][c] == 'S') { dist[r, c] = 0; queue.Enqueue((r, c)); }
        }

    (int Dr, int Dc)[] moves = { (-1, 0), (1, 0), (0, -1), (0, 1) };
    while (queue.Count > 0)
    {
        var (r, c) = queue.Dequeue();
        if (g[r][c] == 'T') return dist[r, c];
        foreach (var (dr, dc) in moves)
        {
            int nr = r + dr, nc = c + dc;
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;   // off the plan
            if (g[nr][nc] == '#' || dist[nr, nc] != -1) continue;         // blocked or seen
            dist[nr, nc] = dist[r, c] + 1;
            queue.Enqueue((nr, nc));
        }
    }
    return -1;                                                           // T cannot be reached
}`, output: '16' },
      { type: 'h2', text: 'Many starting points at once' },
      { type: 'p', text: '“How far is every desk from its **nearest** fire exit?” Running one BFS per exit repeats work. Instead, put **all** exits in the queue at distance 0 before starting. The rings then grow from all exits at the same time, and each cell is reached first from its nearest exit. This is **multi-source BFS**, still O(V + E).' },
      { type: 'h2', text: 'What BFS is good for' },
      { type: 'ul', items: [
        'Shortest path when every step costs the same: fewest moves, fewest transfers, fewest hops in a network.',
        'Everything within k steps: “people you may know” (friends of friends), all rooms within 3 doors.',
        'Flood fill: the “paint bucket” tool, finding all connected cells.',
        'Level-by-level processing of trees (level-order traversal is BFS).'
      ] },
      { type: 'note', kind: 'info', text: 'BFS does **not** find shortest paths when edges have different weights: a route of 2 long roads might be slower than one of 5 short roads. That needs Dijkstra’s algorithm (two lessons from now).' },
      { type: 'quiz', question: 'Why does BFS find the shortest path in an unweighted graph?', options: ['It tries every possible path', 'It processes vertices in order of distance, so the first time it reaches one is via a shortest route', 'It uses a stack', 'It only works on trees'], answer: 1, explain: 'The queue holds distance d before distance d + 1. A vertex is discovered from the earliest possible ring.' },
      { type: 'quiz', question: 'What is the running time of BFS on a graph stored as an adjacency list?', options: ['O(V)', 'O(E log V)', 'O(V + E)', 'O(V²)'], answer: 2, explain: 'Each vertex is queued once and each adjacency list is read once.' },
      { type: 'exercise', task: 'A plate layout is a grid of `#` (steel) and `.` (gap). Count the **separate plates**: groups of `#` cells connected up, down, left or right. For the layout below the answer is 4. Use BFS from every `#` cell you have not visited yet.', hint: 'Loop over all cells. When you find an unvisited `#`, add 1 to the count and run a BFS from it that marks every `#` it can reach as visited.', solution: cs`
string[] layout =
{
    "##..#",
    "#...#",
    "..#..",
    "....#"
};
Console.WriteLine(CountPlates(layout));

static int CountPlates(string[] g)
{
    int rows = g.Length, cols = g[0].Length, count = 0;
    var seen = new bool[rows, cols];
    (int Dr, int Dc)[] moves = { (-1, 0), (1, 0), (0, -1), (0, 1) };

    for (int r0 = 0; r0 < rows; r0++)
        for (int c0 = 0; c0 < cols; c0++)
        {
            if (g[r0][c0] != '#' || seen[r0, c0]) continue;
            count++;                                    // a new plate: flood it
            var queue = new Queue<(int, int)>();
            queue.Enqueue((r0, c0));
            seen[r0, c0] = true;
            while (queue.Count > 0)
            {
                var (r, c) = queue.Dequeue();
                foreach (var (dr, dc) in moves)
                {
                    int nr = r + dr, nc = c + dc;
                    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
                    if (g[nr][nc] != '#' || seen[nr, nc]) continue;
                    seen[nr, nc] = true;
                    queue.Enqueue((nr, nc));
                }
            }
        }
    return count;
}`, output: '4' }
    ],
    keyPoints: [
      'BFS uses a queue and explores in rings of increasing distance: O(V + E).',
      'In unweighted graphs the first visit is by a shortest path; store parents to rebuild it.',
      'Mark vertices visited when you enqueue them.',
      'Grids are implicit graphs; multi-source BFS starts from many points at once.'
    ]
  },

  // ------------------------------------------------------------------ 33
  {
    slug: 'dfs',
    title: 'Depth-first search',
    summary: 'Explore as deep as possible before backing up, recursively or with a stack, and use DFS to find connected components, detect cycles and reason about dependencies.',
    minutes: 14,
    blocks: [
      { type: 'p', text: '**Depth-first search** (DFS) explores like someone walking a maze with one hand on the wall: keep going forward to a new place as long as you can; when you hit a dead end, back up to the last junction with an unexplored way and continue from there. It visits the same vertices as BFS, in a very different order, and the order itself turns out to be useful.' },
      { type: 'widget', name: 'dfs-stepper' },
      { type: 'h2', text: 'Recursive DFS' },
      { type: 'p', text: 'The call stack does the backing up for you: when the recursive call for a neighbour returns, you are back at the previous vertex and continue with its next neighbour.' },
      { type: 'code', title: 'Dfs.cs', code: cs`
var adj = new Dictionary<char, char[]>
{
    ['A'] = new[] { 'B', 'D' },
    ['B'] = new[] { 'A', 'C', 'E' },
    ['C'] = new[] { 'B', 'E', 'F' },
    ['D'] = new[] { 'A', 'E', 'G' },
    ['E'] = new[] { 'B', 'C', 'D', 'F', 'G' },
    ['F'] = new[] { 'C', 'E', 'G' },
    ['G'] = new[] { 'D', 'E', 'F' }
};

var visited = new HashSet<char>();
var order = new List<char>();
Visit('A');
Console.WriteLine(string.Join(" ", order));

void Visit(char u)
{
    visited.Add(u);
    order.Add(u);
    foreach (char v in adj[u])
        if (!visited.Contains(v))
            Visit(v);                    // go deeper; when it returns, we are back at u
}`, output: 'A B C E D G F' },
      { type: 'p', text: 'Compare with BFS on the same graph (A B D C E G F): DFS dives down one long path A → B → C → E → D → G → F before it ever looks at A’s second neighbour. Time is the same **O(V + E)**; memory is O(depth) for the recursion.' },
      { type: 'h2', text: 'Iterative DFS with a stack' },
      { type: 'p', text: 'On a very large graph the recursion can be thousands of calls deep and overflow the stack. Swap the queue in BFS for a `Stack<T>` and you get a depth-first order without recursion:' },
      { type: 'code', title: 'DfsIterative.cs', code: cs`
var adj = new Dictionary<char, char[]>
{
    ['A'] = new[] { 'B', 'D' },
    ['B'] = new[] { 'A', 'C', 'E' },
    ['C'] = new[] { 'B', 'E', 'F' },
    ['D'] = new[] { 'A', 'E', 'G' },
    ['E'] = new[] { 'B', 'C', 'D', 'F', 'G' },
    ['F'] = new[] { 'C', 'E', 'G' },
    ['G'] = new[] { 'D', 'E', 'F' }
};

var visited = new HashSet<char>();
var order = new List<char>();
var stack = new Stack<char>();
stack.Push('A');
while (stack.Count > 0)
{
    char u = stack.Pop();
    if (!visited.Add(u)) continue;              // already visited via another route
    order.Add(u);
    foreach (char v in adj[u].Reverse())         // reversed, so the first neighbour is popped first
        if (!visited.Contains(v)) stack.Push(v);
}
Console.WriteLine(string.Join(" ", order));`, output: 'A B C E D G F' },
      { type: 'h2', text: 'Connected components' },
      { type: 'p', text: 'Is the site network in one piece, or are some places cut off? Start a DFS from every vertex that is not visited yet. Each start discovers one whole **connected component**. The number of starts is the number of components.' },
      { type: 'code', title: 'Components.cs', code: cs`
int n = 8;
int[][] links = { new[] { 0, 1 }, new[] { 1, 2 }, new[] { 3, 4 }, new[] { 5, 6 }, new[] { 6, 7 }, new[] { 5, 7 } };

var adj = new List<int>[n];
for (int i = 0; i < n; i++) adj[i] = new List<int>();
foreach (var e in links) { adj[e[0]].Add(e[1]); adj[e[1]].Add(e[0]); }

var group = new int[n];
Array.Fill(group, -1);
int groups = 0;
for (int s = 0; s < n; s++)
{
    if (group[s] != -1) continue;
    Mark(s, groups++);                       // a new component starts here
}
Console.WriteLine($"{groups} components: {string.Join(" ", group)}");

void Mark(int u, int id)
{
    group[u] = id;
    foreach (int v in adj[u])
        if (group[v] == -1) Mark(v, id);
}`, output: '3 components: 0 0 0 1 1 2 2 2' },
      { type: 'h2', text: 'Finding cycles in dependencies' },
      { type: 'p', text: 'In a **directed** graph of dependencies, a cycle means an impossible plan: A needs B, B needs C, C needs A. DFS finds it by remembering which vertices are on the **current path**. If DFS reaches a vertex that is still on the current path, it has walked in a circle. (Visited-but-finished vertices are fine: that is just two routes to the same task.)' },
      { type: 'code', title: 'CycleCheck.cs', code: cs`
var deps = new Dictionary<string, string[]>
{
    ["Excavate"] = new[] { "Footings" },
    ["Footings"] = new[] { "Columns" },
    ["Columns"] = new[] { "Beams" },
    ["Beams"] = new[] { "Deck" },
    ["Deck"] = new[] { "Roof" },
    ["Roof"] = Array.Empty<string>()
};
Console.WriteLine(HasCycle(deps));

deps["Roof"] = new[] { "Excavate" };            // a wrong dependency
Console.WriteLine(HasCycle(deps));

static bool HasCycle(Dictionary<string, string[]> g)
{
    var state = new Dictionary<string, int>();  // missing = new, 1 = on the current path, 2 = finished
    foreach (var node in g.Keys)
        if (Visit(node)) return true;
    return false;

    bool Visit(string u)
    {
        int s = state.GetValueOrDefault(u);
        if (s == 1) return true;                // back on the current path: a cycle
        if (s == 2) return false;               // already fully explored
        state[u] = 1;
        foreach (var v in g[u])
            if (Visit(v)) return true;
        state[u] = 2;                           // leaving u: no longer on the path
        return false;
    }
}`, output: 'False\nTrue' },
      { type: 'h2', text: 'BFS or DFS?' },
      { type: 'table', head: ['Need', 'Use'], rows: [
        ['Shortest path by number of steps', 'BFS'],
        ['Nearest something', 'BFS'],
        ['Just “can I reach it?” / visit everything', 'Either (DFS is often simpler to write)'],
        ['Connected components, flood fill', 'Either'],
        ['Cycle detection, topological order, dependency checks', 'DFS'],
        ['Explore all solutions of a puzzle (backtracking)', 'DFS']
      ] },
      { type: 'quiz', question: 'In the CycleCheck code, why is reaching a vertex with state 2 (finished) not a cycle?', options: ['Because state 2 vertices have no edges', 'Because a finished vertex is not on the current path; reaching it again just means two routes lead to the same task', 'It is a cycle; that is a bug', 'Because the graph is undirected'], answer: 1, explain: 'Example: A → B, A → C, B → C. C is finished when we come from B, but there is no loop.' },
      { type: 'quiz', question: 'What replaces the queue of BFS in an iterative DFS?', options: ['A priority queue', 'A stack', 'A hash set', 'A sorted list'], answer: 1, explain: 'Last in, first out: the most recently discovered vertex is explored first, which goes deep.' },
      { type: 'exercise', task: 'Write `CountComponents(int n, int[][] links)` using DFS with an explicit `Stack<int>` (no recursion). For n = 7 and links (0,1), (1,2), (3,4), (5,5) the answer is 4: {0,1,2}, {3,4}, {5} and {6}.', hint: 'Build the adjacency list. For each unvisited vertex, add 1 to the count, push it, and pop/push until the stack is empty, marking vertices as visited.', solution: cs`
Console.WriteLine(CountComponents(7, new[] { new[] { 0, 1 }, new[] { 1, 2 }, new[] { 3, 4 }, new[] { 5, 5 } }));

static int CountComponents(int n, int[][] links)
{
    var adj = new List<int>[n];
    for (int i = 0; i < n; i++) adj[i] = new List<int>();
    foreach (var e in links) { adj[e[0]].Add(e[1]); adj[e[1]].Add(e[0]); }

    var seen = new bool[n];
    int count = 0;
    for (int s = 0; s < n; s++)
    {
        if (seen[s]) continue;
        count++;
        var stack = new Stack<int>();
        stack.Push(s);
        seen[s] = true;
        while (stack.Count > 0)
        {
            int u = stack.Pop();
            foreach (int v in adj[u])
                if (!seen[v]) { seen[v] = true; stack.Push(v); }
        }
    }
    return count;
}`, output: '4' }
    ],
    keyPoints: [
      'DFS goes as deep as possible, then backs up; recursion or an explicit stack, O(V + E).',
      'One DFS per unvisited vertex finds the connected components.',
      'In directed graphs, reaching a vertex still on the current path means a cycle.',
      'Use BFS for shortest steps; DFS for cycles, ordering, dependencies and backtracking.'
    ]
  },

  // ------------------------------------------------------------------ 34
  {
    slug: 'topological-sort',
    title: 'Topological sort',
    summary: 'Order the vertices of a directed acyclic graph so every edge points forward: Kahn’s algorithm with in-degrees, the DFS method, cycle detection, and critical-path scheduling.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'You cannot place beams before the columns are up, and you cannot fabricate steel before it is ordered. Given a list of “X before Y” rules, a **topological order** is a sequence of all tasks where every task comes after everything it depends on. The same problem appears in build systems (which project to compile first), package managers, course prerequisites and spreadsheet recalculation.' },
      { type: 'p', text: 'A topological order exists **only if there is no cycle**. The graph must be a DAG (directed acyclic graph). There are usually several valid orders.' },
      { type: 'h2', text: 'Kahn’s algorithm' },
      { type: 'ol', items: [
        'Count each vertex’s **in-degree**: how many prerequisites it has.',
        'Put every vertex with in-degree 0 in a queue: they can start now.',
        'Take one from the queue and add it to the order. For each vertex that depended on it, subtract 1 from its in-degree; if that reaches 0, put it in the queue.',
        'When the queue is empty: if every vertex is in the order, done. Otherwise the leftovers are stuck in a cycle.'
      ] },
      { type: 'widget', name: 'topo-sort' },
      { type: 'code', title: 'Kahn.cs', code: cs`
string[] tasks = { "Survey", "Excavate", "Footings", "Order steel", "Fabricate", "Columns", "Beams", "Deck", "Roof" };
(string Before, string After)[] deps =
{
    ("Survey", "Excavate"), ("Excavate", "Footings"), ("Footings", "Columns"),
    ("Order steel", "Fabricate"), ("Fabricate", "Columns"), ("Fabricate", "Beams"),
    ("Columns", "Beams"), ("Beams", "Deck"), ("Deck", "Roof")
};

var plan = TopoSort(tasks, deps);
Console.WriteLine(plan is null ? "Cycle: no valid order" : string.Join(" → ", plan));

static List<string>? TopoSort(string[] nodes, (string Before, string After)[] edges)
{
    var next = nodes.ToDictionary(n => n, _ => new List<string>());
    var inDegree = nodes.ToDictionary(n => n, _ => 0);
    foreach (var (a, b) in edges) { next[a].Add(b); inDegree[b]++; }

    var ready = new Queue<string>(nodes.Where(n => inDegree[n] == 0));
    var order = new List<string>();
    while (ready.Count > 0)
    {
        var u = ready.Dequeue();
        order.Add(u);
        foreach (var v in next[u])
            if (--inDegree[v] == 0) ready.Enqueue(v);   // its last prerequisite is done
    }
    return order.Count == nodes.Length ? order : null;  // leftovers mean a cycle
}`, output: 'Survey → Order steel → Excavate → Fabricate → Footings → Columns → Beams → Deck → Roof' },
      { type: 'p', text: 'Every vertex is queued once and every edge decreases one counter once: **O(V + E)**. Using a `PriorityQueue` instead of a `Queue` gives a specific order among tasks that are ready at the same time (for example alphabetical, or by priority), at O(log V) extra per step.' },
      { type: 'h2', text: 'The DFS method' },
      { type: 'p', text: 'Run DFS; when a vertex **finishes** (all its dependants explored), add it to a list. Every task finishes after all tasks that depend on it, so the **reversed** finish order is a topological order. Combined with the “on the current path” check from the last lesson, it reports cycles too.' },
      { type: 'code', title: 'TopoDfs.cs', code: cs`
var next = new Dictionary<string, string[]>
{
    ["Underwear"] = new[] { "Trousers" },
    ["Socks"] = new[] { "Boots" },
    ["Trousers"] = new[] { "Boots", "Belt" },
    ["Shirt"] = new[] { "Belt" },
    ["Belt"] = Array.Empty<string>(),
    ["Boots"] = Array.Empty<string>()
};

var done = new HashSet<string>();
var finished = new List<string>();
foreach (var task in next.Keys) Visit(task);
finished.Reverse();
Console.WriteLine(string.Join(", ", finished));

void Visit(string u)
{
    if (!done.Add(u)) return;
    foreach (var v in next[u]) Visit(v);
    finished.Add(u);                       // u finishes after everything that needs it
}`, output: 'Shirt, Socks, Underwear, Trousers, Belt, Boots' },
      { type: 'h2', text: 'Scheduling: the critical path' },
      { type: 'p', text: 'With durations, a topological order also tells you how long the whole project takes. Process tasks in order; each task can start when its **latest** prerequisite finishes. The longest chain of dependent tasks is the **critical path**: any delay on it delays the whole project. This is the CPM method used in construction planning, and it is just “longest path in a DAG”, which is easy once the vertices are in topological order (on a general graph, longest path is a very hard problem).' },
      { type: 'note', kind: 'tip', text: 'In .NET you meet topological sorting in the build: MSBuild orders projects by their `ProjectReference`s, and a circular reference is reported as an error, exactly the “leftover vertices” case.' },
      { type: 'quiz', question: 'Kahn’s algorithm ends with 9 of 12 tasks in the order. What does that mean?', options: ['The order is still valid for those 9', 'The remaining 3 are part of, or depend on, a cycle', 'The queue was too small', 'The graph is undirected'], answer: 1, explain: 'A task never reaches in-degree 0 if it waits, directly or indirectly, for itself.' },
      { type: 'quiz', question: 'In the DFS method, why is the finish order reversed?', options: ['To make it alphabetical', 'A task finishes only after all tasks that depend on it, so it appears after them; reversing puts it before them', 'Reversing is optional', 'Because DFS uses a stack'], answer: 1, explain: 'Finish order lists dependants first. Reversed, every task precedes its dependants.' },
      { type: 'exercise', task: 'Compute the project duration (the critical path length) for the task network in Kahn.cs, with durations in days: Survey 2, Excavate 5, Footings 4, Order steel 10, Fabricate 6, Columns 3, Beams 4, Deck 3, Roof 2. A task starts when all its prerequisites have finished. Expected: 28 days.', hint: 'Get a topological order first. Then, in that order, finish[task] = duration[task] + the largest finish of its prerequisites (0 if it has none). The answer is the largest finish time.', solution: cs`
string[] tasks = { "Survey", "Excavate", "Footings", "Order steel", "Fabricate", "Columns", "Beams", "Deck", "Roof" };
int[] days = { 2, 5, 4, 10, 6, 3, 4, 3, 2 };
(string Before, string After)[] deps =
{
    ("Survey", "Excavate"), ("Excavate", "Footings"), ("Footings", "Columns"),
    ("Order steel", "Fabricate"), ("Fabricate", "Columns"), ("Fabricate", "Beams"),
    ("Columns", "Beams"), ("Beams", "Deck"), ("Deck", "Roof")
};

var duration = tasks.Zip(days).ToDictionary(p => p.First, p => p.Second);
var inDegree = tasks.ToDictionary(t => t, _ => 0);
var next = tasks.ToDictionary(t => t, _ => new List<string>());
foreach (var (a, b) in deps) { next[a].Add(b); inDegree[b]++; }

var finish = tasks.ToDictionary(t => t, _ => 0);
var start = tasks.ToDictionary(t => t, _ => 0);        // earliest start
var ready = new Queue<string>(tasks.Where(t => inDegree[t] == 0));
while (ready.Count > 0)
{
    var u = ready.Dequeue();
    finish[u] = start[u] + duration[u];
    foreach (var v in next[u])
    {
        start[v] = Math.Max(start[v], finish[u]);      // wait for the latest prerequisite
        if (--inDegree[v] == 0) ready.Enqueue(v);
    }
}

Console.WriteLine($"Project: {finish.Values.Max()} days");
Console.WriteLine($"Columns can start on day {start["Columns"]}");`, output: 'Project: 28 days\nColumns can start on day 16' }
    ],
    keyPoints: [
      'A topological order puts every task after its prerequisites; it exists only for DAGs.',
      'Kahn’s algorithm repeatedly takes tasks with in-degree 0: O(V + E). Leftovers mean a cycle.',
      'Reversed DFS finish order is also a topological order.',
      'With durations, processing in topological order gives earliest starts and the critical path.'
    ]
  },

  // ------------------------------------------------------------------ 35
  {
    slug: 'dijkstra',
    title: 'Shortest paths: Dijkstra',
    summary: 'Find the quickest routes from one place to all others in a weighted graph: Dijkstra’s greedy idea, a PriorityQueue implementation, rebuilding the route, why negative weights break it, and A*.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'BFS counts steps. Real routes have **weights**: a road takes 2 minutes or 7 minutes, a cable run costs per metre. The route with the fewest roads is not always the quickest. **Dijkstra’s algorithm** (1956) finds the shortest weighted path from one source to every other vertex, as long as no weight is negative.' },
      { type: 'h2', text: 'The greedy idea' },
      { type: 'ol', items: [
        'Give every vertex a tentative distance: 0 for the source, ∞ for the rest.',
        'Pick the unfinished vertex with the **smallest** tentative distance. Its distance is now **final**.',
        'For each of its neighbours, check whether going through it is shorter (“relax the edge”): if `dist[u] + w < dist[v]`, update `dist[v]` and remember u as v’s predecessor.',
        'Repeat until every reachable vertex is final.'
      ] },
      { type: 'p', text: 'Why is the smallest one safe to finalise? Any other route to it would have to leave the finished area through some vertex that is already at least as far away, and then add non-negative weights. It can only be longer or equal.' },
      { type: 'widget', name: 'dijkstra-viz' },
      { type: 'h2', text: 'Dijkstra with PriorityQueue' },
      { type: 'p', text: 'Finding the smallest tentative distance is a job for a min-heap. .NET’s `PriorityQueue` has no “decrease priority” operation, so the standard trick is to **add the vertex again** with the new distance, and skip outdated entries when they come out (“lazy deletion”).' },
      { type: 'code', title: 'Dijkstra.cs', code: cs`
var graph = new Dictionary<char, List<(char To, int W)>>();
void Road(char a, char b, int w)
{
    if (!graph.ContainsKey(a)) graph[a] = new();
    if (!graph.ContainsKey(b)) graph[b] = new();
    graph[a].Add((b, w));
    graph[b].Add((a, w));
}
Road('A', 'B', 4); Road('A', 'D', 2); Road('B', 'E', 3); Road('B', 'C', 6);
Road('D', 'E', 5); Road('C', 'E', 2); Road('C', 'F', 3); Road('E', 'G', 4);
Road('D', 'G', 7); Road('F', 'G', 1); Road('E', 'F', 6);

var (dist, prev) = Dijkstra(graph, 'A');
foreach (var place in dist.Keys.Order()) Console.Write($"{place}:{dist[place]} ");
Console.WriteLine();

var route = new List<char> { 'F' };
while (prev.TryGetValue(route[^1], out char p)) route.Add(p);
route.Reverse();
Console.WriteLine(string.Join(" → ", route));

static (Dictionary<char, int>, Dictionary<char, char>) Dijkstra(Dictionary<char, List<(char To, int W)>> g, char source)
{
    var best = new Dictionary<char, int> { [source] = 0 };
    var from = new Dictionary<char, char>();
    var pq = new PriorityQueue<char, int>();
    pq.Enqueue(source, 0);
    while (pq.TryDequeue(out char u, out int d))
    {
        if (d > best[u]) continue;                     // outdated entry: u was improved later
        foreach (var (v, w) in g[u])
        {
            int nd = d + w;
            if (nd < best.GetValueOrDefault(v, int.MaxValue))
            {
                best[v] = nd;
                from[v] = u;
                pq.Enqueue(v, nd);                     // no decrease-key: just add it again
            }
        }
    }
    return (best, from);
}`, output: 'A:0 B:4 C:9 D:2 E:7 F:10 G:9 \nA → D → G → F' },
      { type: 'p', text: 'With a binary heap the cost is **O((V + E) log V)**. For a road network with a million junctions that is a fraction of a second. The `prev` map is a **shortest-path tree**: the best route from the source to every place at once.' },
      { type: 'h2', text: 'Negative weights break it' },
      { type: 'p', text: 'Dijkstra finalises a vertex as soon as it is the closest. If some edge has a negative weight, a longer-looking route could become shorter **later**, after the vertex was already finalised. Example: S → A costs 2, S → B costs 5, B → A costs −4. Dijkstra finalises A at 2, but S → B → A costs 1. For negative weights, use Bellman-Ford (next lesson).' },
      { type: 'h2', text: 'A*: Dijkstra with a sense of direction' },
      { type: 'p', text: 'Dijkstra spreads in all directions equally. When you only need the route to **one** target and can estimate the remaining distance (for example the straight-line distance on a map), **A\\*** orders the queue by `distance so far + estimate`. It heads towards the target and explores far fewer vertices. As long as the estimate never overestimates, the route is still optimal. Navigation apps and game path-finding use A* and its variants.' },
      { type: 'table', head: ['Situation', 'Algorithm'], rows: [
        ['All edges cost the same', 'BFS: O(V + E)'],
        ['Non-negative weights, one source', 'Dijkstra: O((V + E) log V)'],
        ['Non-negative weights, one target, good estimate', 'A*'],
        ['Negative weights', 'Bellman-Ford: O(V · E)'],
        ['All pairs, small graph', 'Floyd-Warshall: O(V³)']
      ] },
      { type: 'quiz', question: 'Dijkstra has just finalised vertex X at distance 12. Can a shorter route to X be found later, if all weights are ≥ 0?', options: ['Yes, if X has many neighbours', 'No: every unfinished vertex is at least 12 away, and adding non-negative edges cannot get below 12', 'Only in directed graphs', 'Yes, that is why we keep relaxing'], answer: 1, explain: 'This is the reason the greedy choice is safe, and also why it fails with negative weights.' },
      { type: 'quiz', question: 'Why does the code skip entries with `d > best[u]`?', options: ['They are errors', 'Because the same vertex can be in the queue several times; only its smallest entry is current', 'To save memory', 'To handle negative weights'], answer: 1, explain: 'When a vertex improves, a new entry is added; the older, larger entries are outdated.' },
      { type: 'exercise', task: 'A site is a grid of ground costs (effort to drive over each cell). Moving up, down, left or right **into** a cell costs that cell’s value; the start cell is free. Find the cheapest total cost from the top-left to the bottom-right of `{ {1,3,1,2}, {1,5,1,9}, {4,2,1,1} }`. Expected: 7.', hint: 'Each cell is a vertex; its neighbours are the 4 cells around it, and the edge weight is the cost of the cell you move into. Run Dijkstra with a `PriorityQueue<(int R, int C), int>`.', solution: cs`
int[,] cost = { { 1, 3, 1, 2 }, { 1, 5, 1, 9 }, { 4, 2, 1, 1 } };
Console.WriteLine(CheapestCrossing(cost));

static int CheapestCrossing(int[,] cost)
{
    int rows = cost.GetLength(0), cols = cost.GetLength(1);
    var best = new int[rows, cols];
    for (int r = 0; r < rows; r++)
        for (int c = 0; c < cols; c++) best[r, c] = int.MaxValue;
    best[0, 0] = 0;

    var pq = new PriorityQueue<(int R, int C), int>();
    pq.Enqueue((0, 0), 0);
    (int Dr, int Dc)[] moves = { (-1, 0), (1, 0), (0, -1), (0, 1) };
    while (pq.TryDequeue(out var cell, out int d))
    {
        if (d > best[cell.R, cell.C]) continue;
        if (cell == (rows - 1, cols - 1)) return d;
        foreach (var (dr, dc) in moves)
        {
            int nr = cell.R + dr, nc = cell.C + dc;
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
            int nd = d + cost[nr, nc];
            if (nd < best[nr, nc]) { best[nr, nc] = nd; pq.Enqueue((nr, nc), nd); }
        }
    }
    return -1;
}`, output: '7' }
    ],
    keyPoints: [
      'Dijkstra repeatedly finalises the closest unfinished vertex and relaxes its edges.',
      'With a PriorityQueue and lazy deletion it runs in O((V + E) log V).',
      'Store predecessors to rebuild routes; together they form a shortest-path tree.',
      'It requires non-negative weights. A* adds a distance estimate to reach one target faster.'
    ]
  },

  // ------------------------------------------------------------------ 36
  {
    slug: 'bellman-ford-floyd',
    title: 'Bellman-Ford and Floyd-Warshall',
    summary: 'Handle negative edge weights and detect negative cycles with Bellman-Ford, and compute the shortest distance between every pair of vertices with Floyd-Warshall.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'Dijkstra is fast but has two limits: weights must not be negative, and it answers “from one source”. This lesson covers the two classic algorithms for the other cases. Both are simpler to write than Dijkstra; they are just slower.' },
      { type: 'h2', text: 'When are weights negative?' },
      { type: 'p', text: 'Distances and times are never negative, but **costs** can be: a route that earns a refund, a crane move that recovers energy, a currency exchange that gains money (exchange rates become negative weights after taking logarithms). And sometimes negative cycles are exactly what you want to **detect**: a loop of trades that makes money for nothing is an arbitrage opportunity, or a bug in the data.' },
      { type: 'h2', text: 'Bellman-Ford' },
      { type: 'p', text: 'Forget priority queues: relax **every edge**, and repeat the whole pass V − 1 times. After pass k, every shortest path that uses at most k edges is correct. A shortest path never needs more than V − 1 edges (it visits each vertex at most once), so V − 1 passes are enough. If anything still improves in an extra pass, there must be a **negative cycle**: a loop you could go round for ever, getting cheaper each time.' },
      { type: 'widget', name: 'bellman-floyd' },
      { type: 'code', title: 'BellmanFord.cs', code: cs`
string[] names = { "S", "A", "B", "C", "D" };
var edges = new List<(int From, int To, int W)>
{
    (3, 4, 2), (1, 4, 5), (1, 3, -4), (2, 3, 4), (2, 1, 3), (0, 2, 2), (0, 1, 6)
};

var dist = BellmanFord(names.Length, edges, 0);
Console.WriteLine(dist is null ? "Negative cycle!" : string.Join(" ", names.Zip(dist, (n, d) => $"{n}:{d}")));

edges.Add((4, 1, -6));                           // D → A: closes the loop A → C → D → A (−8)
dist = BellmanFord(names.Length, edges, 0);
Console.WriteLine(dist is null ? "Negative cycle!" : string.Join(" ", names.Zip(dist, (n, d) => $"{n}:{d}")));

static long[]? BellmanFord(int n, List<(int From, int To, int W)> edges, int source)
{
    var d = new long[n];
    Array.Fill(d, long.MaxValue);
    d[source] = 0;
    for (int pass = 1; pass < n; pass++)                       // V − 1 passes
    {
        bool changed = false;
        foreach (var (u, v, w) in edges)
            if (d[u] != long.MaxValue && d[u] + w < d[v]) { d[v] = d[u] + w; changed = true; }
        if (!changed) return d;                                // nothing moved: done early
    }
    foreach (var (u, v, w) in edges)                           // one extra pass
        if (d[u] != long.MaxValue && d[u] + w < d[v]) return null;   // still improving: negative cycle
    return d;
}`, output: 'S:0 A:5 B:2 C:1 D:3\nNegative cycle!' },
      { type: 'p', text: 'Cost: **O(V · E)**, much slower than Dijkstra on big graphs, but it handles negative weights and tells you when the question has no answer. Note the `!= long.MaxValue` check: “∞ + a negative weight” must stay ∞, not wrap around to a huge negative number.' },
      { type: 'h2', text: 'Floyd-Warshall: every pair at once' },
      { type: 'p', text: 'Sometimes you need a full distance table: the travel time between every pair of sites. Floyd-Warshall builds it with three nested loops. The idea: allow the vertices as stopovers one at a time. After considering stopover k, `d[i, j]` is the shortest route from i to j that only stops at vertices 0…k. The update is one line: is going via k better?' },
      { type: 'code', title: 'FloydWarshall.cs', code: cs`
const int INF = int.MaxValue / 2;                 // half, so INF + INF does not overflow
int n = 4;
var d = new int[n, n];
for (int i = 0; i < n; i++)
    for (int j = 0; j < n; j++)
        d[i, j] = i == j ? 0 : INF;

foreach (var (a, b, w) in new[] { (0, 1, 3), (0, 3, 7), (1, 0, 8), (1, 2, 2), (2, 0, 5), (2, 3, 1), (3, 0, 2) })
    d[a, b] = w;

for (int k = 0; k < n; k++)                       // allow k as a stopover
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++)
            if (d[i, k] + d[k, j] < d[i, j])
                d[i, j] = d[i, k] + d[k, j];

for (int i = 0; i < n; i++)
{
    var row = new List<string>();
    for (int j = 0; j < n; j++) row.Add(d[i, j] >= INF ? "∞" : d[i, j].ToString());
    Console.WriteLine(string.Join("\t", row));
}`, output: '0\t3\t5\t6\n5\t0\t2\t3\n3\t6\t0\t1\n2\t5\t7\t0' },
      { type: 'p', text: '**O(V³)** time and O(V²) memory: perfect for a few hundred vertices, impossible for a road network of millions. It also works with negative edges; a negative number on the diagonal (`d[i, i] < 0`) reveals a negative cycle.' },
      { type: 'note', kind: 'warn', text: 'The loop order matters: **k must be the outer loop**. With i or j outside, the algorithm uses routes through vertices whose distances are not finished yet, and gives wrong answers.' },
      { type: 'table', head: ['Algorithm', 'Question', 'Negative weights', 'Time'], rows: [
        ['BFS', 'One source, unweighted', '–', 'O(V + E)'],
        ['Dijkstra', 'One source', 'No', 'O((V + E) log V)'],
        ['Bellman-Ford', 'One source', 'Yes, detects negative cycles', 'O(V · E)'],
        ['Floyd-Warshall', 'All pairs', 'Yes, detects negative cycles', 'O(V³)']
      ] },
      { type: 'quiz', question: 'Bellman-Ford runs on a graph with 6 vertices. How many passes over all edges does it need at most (before the negative-cycle check)?', options: ['1', '5', '6', '36'], answer: 1, explain: 'V − 1 = 5. A shortest path without cycles has at most 5 edges.' },
      { type: 'quiz', question: 'Why is INF set to `int.MaxValue / 2` in Floyd-Warshall?', options: ['To save memory', 'So that INF + INF does not overflow into a negative number', 'Because distances are halved', 'It must be odd'], answer: 1, explain: 'int.MaxValue + int.MaxValue wraps to −2, which would look like a fantastic shortcut.' },
      { type: 'exercise', task: 'Use Floyd-Warshall on the undirected site graph from this module (roads A–B 4, A–D 2, B–E 3, B–C 6, D–E 5, C–E 2, C–F 3, E–G 4, D–G 7, F–G 1, E–F 6) to find the best place for a site first-aid station: the place whose **farthest** other place is closest. Expected: E, with every place within 7 minutes.', hint: 'Fill the matrix with both directions of every road, run the triple loop, then for each row take the maximum; pick the row with the smallest maximum.', solution: cs`
const int INF = int.MaxValue / 2;
string names = "ABCDEFG";
int n = names.Length;
var d = new int[n, n];
for (int i = 0; i < n; i++)
    for (int j = 0; j < n; j++) d[i, j] = i == j ? 0 : INF;

var roads = new[] { ("AB", 4), ("AD", 2), ("BE", 3), ("BC", 6), ("DE", 5), ("CE", 2), ("CF", 3), ("EG", 4), ("DG", 7), ("FG", 1), ("EF", 6) };
foreach (var (r, w) in roads)
{
    int a = names.IndexOf(r[0]), b = names.IndexOf(r[1]);
    d[a, b] = d[b, a] = w;
}

for (int k = 0; k < n; k++)
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++)
            if (d[i, k] + d[k, j] < d[i, j]) d[i, j] = d[i, k] + d[k, j];

int bestPlace = 0, bestWorst = INF;
for (int i = 0; i < n; i++)
{
    int worst = 0;
    for (int j = 0; j < n; j++) worst = Math.Max(worst, d[i, j]);
    if (worst < bestWorst) { bestWorst = worst; bestPlace = i; }
}
Console.WriteLine($"{names[bestPlace]}: every place within {bestWorst} minutes");`, output: 'E: every place within 7 minutes' }
    ],
    keyPoints: [
      'Bellman-Ford relaxes every edge V − 1 times: O(V · E), works with negative weights.',
      'If an extra pass still improves something, there is a negative cycle.',
      'Floyd-Warshall computes all pairs with three loops (k outermost): O(V³).',
      'Pick the algorithm by question (one source / all pairs) and weights (unweighted / non-negative / negative).'
    ]
  },

  // ------------------------------------------------------------------ 37
  {
    slug: 'minimum-spanning-trees',
    title: 'Minimum spanning trees',
    summary: 'Connect every vertex with the least total edge weight: what a spanning tree is, Kruskal’s and Prim’s algorithms, why greedy works here, and how an MST differs from shortest paths.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'The site needs temporary power to all seven places, and cable can only run along the roads. Which roads should carry cable so that every place is connected, using the **least total cable**? This is the **minimum spanning tree** (MST) problem. The same question appears for pipe networks, fibre and road building, and in clustering data.' },
      { type: 'h2', text: 'Spanning trees' },
      { type: 'p', text: 'A **spanning tree** of a connected graph uses some of its edges to connect all V vertices with **no cycles**. It always has exactly **V − 1 edges**: fewer cannot connect everything, and one more would close a loop. A graph has many spanning trees; the minimum one has the smallest total weight.' },
      { type: 'widget', name: 'mst-viz' },
      { type: 'h2', text: 'Kruskal: cheapest edges first' },
      { type: 'p', text: 'Sort all edges by weight. Go through them from cheapest to most expensive and take each edge **unless** both ends are already connected (it would close a loop). Stop after V − 1 edges. To check “already connected?” quickly, Kruskal uses a union-find structure (explained in full in the next lesson; here it is a few lines).' },
      { type: 'code', title: 'Kruskal.cs', code: cs`
string names = "ABCDEFG";
var roads = new List<(char A, char B, int W)>
{
    ('E', 'G', 4), ('C', 'E', 2), ('C', 'F', 3), ('A', 'B', 4), ('A', 'D', 2), ('B', 'E', 3),
    ('B', 'C', 6), ('D', 'E', 5), ('D', 'G', 7), ('F', 'G', 1), ('E', 'F', 6)
};

var parent = Enumerable.Range(0, names.Length).ToArray();
int Find(int x) => parent[x] == x ? x : parent[x] = Find(parent[x]);

int total = 0;
var chosen = new List<string>();
foreach (var (a, b, w) in roads.OrderBy(r => r.W))  // stable: equal weights keep list order
{
    int ra = Find(names.IndexOf(a)), rb = Find(names.IndexOf(b));
    if (ra == rb)                                 // already connected: would make a loop
    {
        Console.WriteLine($"Skip {a}{b}({w}): {a} and {b} are already connected");
        continue;
    }
    parent[ra] = rb;                              // merge the two groups
    chosen.Add($"{a}{b}({w})");
    total += w;
    if (chosen.Count == names.Length - 1) break;  // V − 1 edges: done
}
Console.WriteLine(string.Join(" ", chosen));
Console.WriteLine($"Total: {total}");`, output: 'Skip EG(4): E and G are already connected\nFG(1) CE(2) AD(2) CF(3) BE(3) AB(4)\nTotal: 15' },
      { type: 'p', text: 'E–G costs 4, the same as A–B, but by then E and G are already joined through E–C–F–G, so taking it would close a loop. Sorting dominates the running time: **O(E log E)**. The union-find checks are almost O(1) each.' },
      { type: 'h2', text: 'Prim: grow one tree' },
      { type: 'p', text: 'Start from any vertex. Repeatedly add the **cheapest edge that leaves the tree** (one end inside, one outside). A priority queue holds the candidate edges, just like Dijkstra, except the priority is the edge weight alone, not the distance from the start.' },
      { type: 'code', title: 'Prim.cs', code: cs`
var graph = new Dictionary<char, List<(char To, int W)>>();
void Road(char a, char b, int w)
{
    if (!graph.ContainsKey(a)) graph[a] = new();
    if (!graph.ContainsKey(b)) graph[b] = new();
    graph[a].Add((b, w));
    graph[b].Add((a, w));
}
Road('A', 'B', 4); Road('A', 'D', 2); Road('B', 'E', 3); Road('B', 'C', 6);
Road('D', 'E', 5); Road('C', 'E', 2); Road('C', 'F', 3); Road('E', 'G', 4);
Road('D', 'G', 7); Road('F', 'G', 1); Road('E', 'F', 6);

var inTree = new HashSet<char>();
var pq = new PriorityQueue<(char From, char To), int>();
pq.Enqueue(('A', 'A'), 0);                       // start at A
int total = 0;
var added = new List<string>();
while (pq.TryDequeue(out var edge, out int w))
{
    if (!inTree.Add(edge.To)) continue;           // already in the tree: skip
    total += w;
    if (edge.From != edge.To) added.Add($"{edge.From}{edge.To}({w})");
    foreach (var (next, nw) in graph[edge.To])
        if (!inTree.Contains(next)) pq.Enqueue((edge.To, next), nw);
}
Console.WriteLine(string.Join(" ", added));
Console.WriteLine($"Total: {total}");`, output: 'AD(2) AB(4) BE(3) EC(2) CF(3) FG(1)\nTotal: 15' },
      { type: 'p', text: '**O(E log V)** with a heap. Both algorithms give a minimum total; if several edges share a weight, they may pick different (equally cheap) trees.' },
      { type: 'h2', text: 'Why does greedy work here?' },
      { type: 'p', text: 'The **cut property**: split the vertices into any two groups. The cheapest edge crossing between the groups belongs to some minimum spanning tree. If an MST did not use it, you could add it (making a loop that crosses the split twice), remove the more expensive crossing edge on that loop, and get a cheaper or equal tree. Both Kruskal and Prim only ever take such a cheapest crossing edge.' },
      { type: 'note', kind: 'warn', text: 'An MST is **not** the same as shortest paths. In the site MST, the cable route from A to F goes A–B–E–C–F = 12 minutes of road, but the quickest drive is A–D–G–F = 10. The MST minimises the **total** of all edges, not the distance between any two places.' },
      { type: 'quiz', question: 'A connected graph has 50 vertices and 300 edges. How many edges does its minimum spanning tree have?', options: ['49', '50', '250', '300'], answer: 0, explain: 'Every spanning tree has V − 1 edges.' },
      { type: 'quiz', question: 'Kruskal looks at an edge whose two ends are already in the same group. What does it do?', options: ['Takes it and removes a more expensive edge', 'Skips it, because it would close a cycle', 'Stops the algorithm', 'Swaps the groups'], answer: 1, explain: 'The ends are already connected through cheaper edges; adding this one would create a loop.' },
      { type: 'exercise', task: 'Points on a site plan must all be connected by cable trenches; a trench between two points costs their **Manhattan distance** |x₁ − x₂| + |y₁ − y₂|. Every pair can be connected. Find the minimum total cost for points (0,0), (2,2), (3,10), (5,2), (7,0). Expected: 20. Since the graph is complete (dense), use the simple O(V²) version of Prim with an array instead of a heap.', hint: 'Keep `best[i]` = cheapest known connection from point i to the tree. Repeat V times: pick the unused point with the smallest best[i], add it, then update best[] for the others using distances from the new point.', solution: cs`
int[][] pts = { new[] { 0, 0 }, new[] { 2, 2 }, new[] { 3, 10 }, new[] { 5, 2 }, new[] { 7, 0 } };
Console.WriteLine(MinTrenchCost(pts));

static int MinTrenchCost(int[][] p)
{
    int n = p.Length, total = 0;
    var best = new int[n];
    var used = new bool[n];
    Array.Fill(best, int.MaxValue);
    best[0] = 0;
    for (int step = 0; step < n; step++)
    {
        int u = -1;
        for (int i = 0; i < n; i++)
            if (!used[i] && (u == -1 || best[i] < best[u])) u = i;
        used[u] = true;
        total += best[u];
        for (int v = 0; v < n; v++)
        {
            int cost = Math.Abs(p[u][0] - p[v][0]) + Math.Abs(p[u][1] - p[v][1]);
            if (!used[v] && cost < best[v]) best[v] = cost;
        }
    }
    return total;
}`, output: '20' }
    ],
    keyPoints: [
      'A spanning tree connects all V vertices with V − 1 edges and no cycles; the MST has the least total weight.',
      'Kruskal: sort edges, take each one that joins two different groups (union-find): O(E log E).',
      'Prim: grow one tree, always adding the cheapest edge leaving it: O(E log V).',
      'Greedy works because of the cut property. An MST does not give shortest paths.'
    ]
  },

  // ------------------------------------------------------------------ 38
  {
    slug: 'union-find',
    title: 'Union-find (disjoint sets)',
    summary: 'Track which items belong to the same group as groups merge, with a parent array, union by rank and path compression, in almost O(1) per operation.',
    minutes: 13,
    blocks: [
      { type: 'p', text: 'Beams get bolted together one connection at a time. After each new connection you want to know: are beam 3 and beam 8 now part of the same assembly? How many separate assemblies are there? Re-running BFS after every connection would be slow. **Union-find** (also called a disjoint-set union, DSU) answers these questions in practically constant time while the groups keep merging.' },
      { type: 'h2', text: 'Two operations' },
      { type: 'ul', items: [
        '**Find(x)**: which group is x in? Returns a representative item (the group’s “root”). Two items are in the same group if and only if they have the same root.',
        '**Union(x, y)**: merge the groups of x and y into one.'
      ] },
      { type: 'p', text: 'Each group is stored as a tree, but all you keep is one array: `parent[i]` is the item above i, and a root is its own parent. Find walks up the parents to the root. Union finds both roots and makes one the parent of the other: one array write.' },
      { type: 'widget', name: 'union-find' },
      { type: 'h2', text: 'Two tricks that make it fast' },
      { type: 'p', text: 'Done naively, unions can build a long chain, and Find becomes O(n). Two simple improvements fix that:' },
      { type: 'ul', items: [
        '**Union by rank (or size)**: attach the shorter tree under the taller one, never the other way round. Trees then stay at most log₂ n tall.',
        '**Path compression**: after Find walks up to the root, point every item on that path directly at the root. The next Find for any of them is one step.'
      ] },
      { type: 'p', text: 'With both, a sequence of m operations takes O(m · α(n)), where α is the inverse Ackermann function. It grows so slowly that α(n) ≤ 4 for any n you could ever store. In practice: **constant time**.' },
      { type: 'code', title: 'DisjointSet.cs', code: cs`
var beams = new DisjointSet(10);
int[][] bolts = { new[] { 1, 2 }, new[] { 3, 4 }, new[] { 2, 4 }, new[] { 5, 6 }, new[] { 7, 8 }, new[] { 6, 8 } };
foreach (var b in bolts) beams.Union(b[0], b[1]);

Console.WriteLine($"Assemblies: {beams.Count}");
Console.WriteLine($"1 and 3 connected? {beams.Connected(1, 3)}");
Console.WriteLine($"1 and 5 connected? {beams.Connected(1, 5)}");
Console.WriteLine($"Union(4, 4) merged anything? {beams.Union(4, 4)}");

class DisjointSet
{
    private readonly int[] _parent, _rank;
    public int Count { get; private set; }          // number of separate groups

    public DisjointSet(int n)
    {
        _parent = new int[n];
        _rank = new int[n];
        for (int i = 0; i < n; i++) _parent[i] = i;  // everyone starts alone
        Count = n;
    }

    public int Find(int x)
    {
        if (_parent[x] != x)
            _parent[x] = Find(_parent[x]);           // path compression
        return _parent[x];
    }

    public bool Union(int a, int b)
    {
        int ra = Find(a), rb = Find(b);
        if (ra == rb) return false;                  // already in the same group
        if (_rank[ra] < _rank[rb]) (ra, rb) = (rb, ra);
        _parent[rb] = ra;                            // shorter tree under the taller one
        if (_rank[ra] == _rank[rb]) _rank[ra]++;
        Count--;
        return true;
    }

    public bool Connected(int a, int b) => Find(a) == Find(b);
}`, output: 'Assemblies: 4\n1 and 3 connected? True\n1 and 5 connected? False\nUnion(4, 4) merged anything? False' },
      { type: 'p', text: 'Ten beams, six bolts, four assemblies: {0}, {1, 2, 3, 4}, {5, 6, 7, 8} and {9}. `Union` returning false is a useful signal on its own: it means the two items were **already** connected, so this new connection closes a loop.' },
      { type: 'h2', text: 'Where union-find is used' },
      { type: 'ul', items: [
        '**Kruskal’s MST**: “are the ends of this edge already connected?”',
        '**Cycle detection** in undirected graphs as edges arrive.',
        '**Dynamic connectivity**: network links coming up one by one, “are these two computers connected yet?”',
        '**Grouping equal things**: merging duplicate customer records that share an email or phone number, or labelling connected regions in an image.'
      ] },
      { type: 'note', kind: 'info', text: 'Union-find can only **merge** groups. It cannot split them again. If connections are also removed, you need other structures (or rebuild from scratch).' },
      { type: 'quiz', question: '`parent = { 0, 0, 1, 2 }` (no path compression yet). What does Find(3) return, and how many steps does it take?', options: ['3, zero steps', '2, one step', '0, three steps (3 → 2 → 1 → 0)', '1, two steps'], answer: 2, explain: 'Follow parents until an item is its own parent: 3 → 2 → 1 → 0. With path compression, 3, 2 and 1 would then all point directly at 0.' },
      { type: 'quiz', question: 'Why attach the shorter tree under the taller one in Union?', options: ['It is required for correctness', 'It keeps the trees short, so Find stays fast', 'It makes Union O(1) instead of O(n)', 'To keep the roots sorted'], answer: 1, explain: 'Attaching the taller under the shorter would make the result one level taller each time; this way height grows only when both are equal.' },
      { type: 'exercise', task: 'Connections between beams arrive one by one. Return the **first connection that closes a loop** (both beams were already in the same assembly). For connections (1,2), (2,3), (3,4), (1,4), (1,5) the answer is (1, 4). Beams are numbered 1 to 5.', hint: 'Use the DisjointSet class (size n + 1 so that numbers 1…n are valid indexes). Return the first connection for which `Union` returns false.', solution: cs`
int[][] links = { new[] { 1, 2 }, new[] { 2, 3 }, new[] { 3, 4 }, new[] { 1, 4 }, new[] { 1, 5 } };
var loop = FirstLoop(5, links);
Console.WriteLine(loop is null ? "no loop" : $"({loop[0]}, {loop[1]})");

static int[]? FirstLoop(int n, int[][] links)
{
    var ds = new DisjointSet(n + 1);
    foreach (var link in links)
        if (!ds.Union(link[0], link[1])) return link;   // already connected: this closes a loop
    return null;
}

class DisjointSet
{
    private readonly int[] _parent, _rank;
    public DisjointSet(int n)
    {
        _parent = new int[n];
        _rank = new int[n];
        for (int i = 0; i < n; i++) _parent[i] = i;
    }
    public int Find(int x) => _parent[x] == x ? x : _parent[x] = Find(_parent[x]);
    public bool Union(int a, int b)
    {
        int ra = Find(a), rb = Find(b);
        if (ra == rb) return false;
        if (_rank[ra] < _rank[rb]) (ra, rb) = (rb, ra);
        _parent[rb] = ra;
        if (_rank[ra] == _rank[rb]) _rank[ra]++;
        return true;
    }
}`, output: '(1, 4)' }
    ],
    keyPoints: [
      'Union-find tracks merging groups with one parent array; a root represents its group.',
      'Find walks up to the root; Union links one root under the other.',
      'Union by rank plus path compression make both operations practically O(1).',
      'Used by Kruskal, cycle detection, dynamic connectivity and record merging.'
    ]
  }
];
