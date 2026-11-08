import { Lesson } from '../learn.types';
import { cs } from '../csharp/cs';

export const TREES: Lesson[] = [
  // ------------------------------------------------------------------ 25
  {
    slug: 'trees-basics',
    title: 'Trees and binary trees',
    summary: 'Learn the vocabulary of trees (root, parent, child, leaf, depth, height, subtree), build a general tree in C#, and meet binary trees and why their height matters.',
    minutes: 13,
    blocks: [
      { type: 'p', text: 'Arrays, lists, stacks and queues are **linear**: every item has at most one item before it and one after it. Much real data is not like that. A project has buildings, a building has levels, a level has columns. A folder has files and sub-folders. A web page has elements inside elements. This shape, one thing branching into several, is a **tree**.' },
      { type: 'h2', text: 'The vocabulary' },
      { type: 'table', head: ['Term', 'Meaning'], rows: [
        ['Node', 'One item in the tree (Project, Level 1, C1…)'],
        ['Edge', 'The link from a parent to a child'],
        ['Root', 'The single node at the top; it has no parent'],
        ['Parent / child', 'A node directly above / directly below another'],
        ['Siblings', 'Nodes with the same parent'],
        ['Leaf', 'A node with no children'],
        ['Subtree', 'A node together with everything below it'],
        ['Depth of a node', 'Number of edges from the root down to it (the root has depth 0)'],
        ['Height of a node', 'Number of edges on the longest path from it down to a leaf (a leaf has height 0)'],
        ['Height of the tree', 'The height of the root']
      ] },
      { type: 'widget', name: 'tree-anatomy' },
      { type: 'p', text: 'Two facts hold for every tree: every node except the root has **exactly one parent**, and there are no loops. So a tree with n nodes always has **n − 1 edges**. If any node had two parents, or you could walk in a circle, it would be a **graph** (covered in the Graphs module).' },
      { type: 'h2', text: 'A general tree in C#' },
      { type: 'p', text: 'A node stores its data and a list of children. Because each child is itself the root of a smaller tree, almost every tree algorithm is naturally **recursive**: handle this node, then call yourself on each child.' },
      { type: 'code', title: 'GeneralTree.cs', code: cs`
var project = new TreeNode("Project");
var a = project.Add("Building A");
var a1 = a.Add("Level 1");
a1.Add("C1");
a1.Add("C2");
a.Add("Level 2").Add("C3");
project.Add("Building B").Add("Level 1").Add("B1");

Print(project, 0);
Console.WriteLine($"Nodes: {Count(project)}, height: {Height(project)}");

static void Print(TreeNode node, int depth)
{
    Console.WriteLine(new string(' ', depth * 2) + node.Name);   // indent by depth
    foreach (var child in node.Children)
        Print(child, depth + 1);
}

static int Count(TreeNode node) => 1 + node.Children.Sum(c => Count(c));

static int Height(TreeNode node) =>
    node.Children.Count == 0 ? 0 : 1 + node.Children.Max(c => Height(c));

class TreeNode
{
    public string Name { get; }
    public List<TreeNode> Children { get; } = new();
    public TreeNode(string name) => Name = name;

    public TreeNode Add(string name)
    {
        var child = new TreeNode(name);
        Children.Add(child);
        return child;                       // so calls can be chained
    }
}`, output: 'Project\n  Building A\n    Level 1\n      C1\n      C2\n    Level 2\n      C3\n  Building B\n    Level 1\n      B1\nNodes: 10, height: 3' },
      { type: 'p', text: 'You use trees like this every day: `System.IO.Directory` (folders), XML and JSON documents (`XElement`, `JsonNode`), the HTML DOM, menus, an organisation chart, and Revit or Tekla model hierarchies.' },
      { type: 'h2', text: 'Binary trees' },
      { type: 'p', text: 'In a **binary tree** every node has at most two children, called **left** and **right**. The order matters: a node with only a left child is different from one with only a right child. Binary trees are the base of binary search trees, heaps and expression trees in the next lessons.' },
      { type: 'code', title: 'BinaryNode.cs', code: cs`
//        8
//      /   \
//     4     12
//    / \
//   2   6
var root = new Node(8,
    new Node(4, new Node(2), new Node(6)),
    new Node(12));

Console.WriteLine(root.Left!.Right!.Value);   // 8 → left → right

record Node(int Value, Node? Left = null, Node? Right = null);`, output: '6' },
      { type: 'h2', text: 'Why height is the number to watch' },
      { type: 'p', text: 'Most tree operations walk from the root down one path, so they cost O(height). How tall a binary tree with n nodes is depends entirely on its **shape**:' },
      { type: 'ul', items: [
        '**Perfect / complete** (every level full, or full except the last, filled from the left): height ≈ log₂ n. A million nodes fit in about 20 levels.',
        '**Degenerate** (every node has one child): it is really a linked list, height n − 1. Walking it is O(n).'
      ] },
      { type: 'table', head: ['Height h', 'Most nodes a binary tree can hold (2ʰ⁺¹ − 1)'], rows: [
        ['0', '1'], ['3', '15'], ['9', '1,023'], ['19', '1,048,575'], ['29', 'about 1 billion']
      ] },
      { type: 'p', text: 'Keeping trees short (“balanced”) is what makes them fast. The whole Trees module is about that idea.' },
      { type: 'note', kind: 'warn', text: 'Recursion goes one call deeper per level. On a balanced tree that is about 20 to 30 calls, no problem. On a degenerate tree of 100,000 nodes it can throw `StackOverflowException`, which cannot be caught. For trees that might be very deep, use an explicit `Stack<T>` (next lesson).' },
      { type: 'quiz', question: 'A tree has 25 nodes. How many edges does it have?', options: ['24', '25', '26', 'It depends on the shape'], answer: 0, explain: 'Every node except the root has exactly one edge to its parent: n − 1 = 24, whatever the shape.' },
      { type: 'quiz', question: 'In the Project tree printed above, what is the depth of C3 and the height of Building A?', options: ['Depth 3, height 2', 'Depth 2, height 3', 'Depth 3, height 3', 'Depth 4, height 2'], answer: 0, explain: 'Project → Building A → Level 2 → C3 is 3 edges. From Building A the longest way down (to C1, C2 or C3) is 2 edges.' },
      { type: 'exercise', task: 'Using the `TreeNode` class above, write `Leaves(TreeNode node)` that counts the leaves, and `Find(TreeNode node, string name)` that returns the first node with that name (or null), searching depth first. For the Project tree: 4 leaves, and `Find(project, "C3")` returns the node named C3.', hint: 'A leaf counts 1; any other node is the sum over its children. For Find, check the node itself, then search each child and return the first non-null result.', solution: cs`
var project = new TreeNode("Project");
var a = project.Add("Building A");
var a1 = a.Add("Level 1");
a1.Add("C1");
a1.Add("C2");
a.Add("Level 2").Add("C3");
project.Add("Building B").Add("Level 1").Add("B1");

Console.WriteLine(Leaves(project));
Console.WriteLine(Find(project, "C3")?.Name ?? "not found");
Console.WriteLine(Find(project, "C9")?.Name ?? "not found");

static int Leaves(TreeNode node) =>
    node.Children.Count == 0 ? 1 : node.Children.Sum(c => Leaves(c));

static TreeNode? Find(TreeNode node, string name)
{
    if (node.Name == name) return node;
    foreach (var child in node.Children)
    {
        var hit = Find(child, name);
        if (hit is not null) return hit;
    }
    return null;
}

class TreeNode
{
    public string Name { get; }
    public List<TreeNode> Children { get; } = new();
    public TreeNode(string name) => Name = name;
    public TreeNode Add(string name) { var c = new TreeNode(name); Children.Add(c); return c; }
}`, output: '4\nC3\nnot found' }
    ],
    keyPoints: [
      'A tree is a hierarchy: one root, every other node has exactly one parent, no loops, n − 1 edges.',
      'Depth counts edges from the root; height counts edges down to the deepest leaf.',
      'Tree code is naturally recursive: do the node, then recurse into the children.',
      'Operations cost O(height): about log₂ n for a balanced binary tree, n for a degenerate one.'
    ]
  },

  // ------------------------------------------------------------------ 26
  {
    slug: 'tree-traversals',
    title: 'Tree traversals: pre, in, post and level order',
    summary: 'Visit every node of a tree in pre-order, in-order, post-order and level order, recursively and with an explicit stack or queue, and know which order solves which problem.',
    minutes: 14,
    blocks: [
      { type: 'p', text: 'An array has one natural order: index 0, 1, 2… A tree does not. When you visit every node (to print, copy, sum or search), you must choose an order. Four orders cover almost every need.' },
      { type: 'h2', text: 'Depth first: pre, in and post' },
      { type: 'p', text: 'The three depth-first orders all go as deep as possible before coming back. They differ only in **when** the node itself is visited compared with its two subtrees:' },
      { type: 'ul', items: [
        '**Pre-order**: node, then left subtree, then right subtree.',
        '**In-order**: left subtree, then node, then right subtree.',
        '**Post-order**: left subtree, then right subtree, then node.'
      ] },
      { type: 'widget', name: 'traversal-stepper' },
      { type: 'code', title: 'DepthFirst.cs', code: cs`
var root = new Node(8,
    new Node(4, new Node(2, new Node(1)), new Node(6, null, new Node(7))),
    new Node(12, new Node(10), new Node(14)));

var pre = new List<int>();
var ino = new List<int>();
var post = new List<int>();
PreOrder(root, pre);
InOrder(root, ino);
PostOrder(root, post);
Console.WriteLine("Pre:  " + string.Join(" ", pre));
Console.WriteLine("In:   " + string.Join(" ", ino));
Console.WriteLine("Post: " + string.Join(" ", post));

static void PreOrder(Node? n, List<int> result)
{
    if (n is null) return;
    result.Add(n.Value);            // node first
    PreOrder(n.Left, result);
    PreOrder(n.Right, result);
}

static void InOrder(Node? n, List<int> result)
{
    if (n is null) return;
    InOrder(n.Left, result);
    result.Add(n.Value);            // node in the middle
    InOrder(n.Right, result);
}

static void PostOrder(Node? n, List<int> result)
{
    if (n is null) return;
    PostOrder(n.Left, result);
    PostOrder(n.Right, result);
    result.Add(n.Value);            // node last
}

record Node(int Value, Node? Left = null, Node? Right = null);`, output: 'Pre:  8 4 2 1 6 7 12 10 14\nIn:   1 2 4 6 7 8 10 12 14\nPost: 1 2 7 6 4 10 14 12 8' },
      { type: 'p', text: 'Each traversal visits every node once: **O(n) time**. The recursion uses **O(height)** stack space.' },
      { type: 'h2', text: 'Without recursion: an explicit stack' },
      { type: 'p', text: 'Recursion uses the call stack behind the scenes. You can use a `Stack<T>` yourself instead, which never overflows the call stack on a very deep tree. For pre-order, push the right child before the left, so the left one comes off the stack first:' },
      { type: 'code', title: 'PreOrderIterative.cs', code: cs`
// same root and Node record as above
Console.WriteLine(string.Join(" ", PreOrderIterative(root)));

static List<int> PreOrderIterative(Node root)
{
    var result = new List<int>();
    var stack = new Stack<Node>();
    stack.Push(root);
    while (stack.Count > 0)
    {
        var n = stack.Pop();
        result.Add(n.Value);
        if (n.Right is not null) stack.Push(n.Right);   // right first…
        if (n.Left is not null) stack.Push(n.Left);     // …so left is popped first
    }
    return result;
}`, output: '8 4 2 1 6 7 12 10 14' },
      { type: 'h2', text: 'Breadth first: level order' },
      { type: 'p', text: 'Level order visits the root, then all nodes at depth 1, then depth 2, and so on. It uses a **queue**: take a node from the front, visit it, add its children at the back. Reading the queue size at the start of each round lets you handle one level at a time.' },
      { type: 'code', title: 'LevelOrder.cs', code: cs`
// same root and Node record as above
LevelOrder(root);

static void LevelOrder(Node root)
{
    var queue = new Queue<Node>();
    queue.Enqueue(root);
    int level = 0;
    while (queue.Count > 0)
    {
        int count = queue.Count;                    // nodes on this level
        var line = new List<int>();
        for (int i = 0; i < count; i++)
        {
            var n = queue.Dequeue();
            line.Add(n.Value);
            if (n.Left is not null) queue.Enqueue(n.Left);
            if (n.Right is not null) queue.Enqueue(n.Right);
        }
        Console.WriteLine($"Level {level++}: {string.Join(" ", line)}");
    }
}`, output: 'Level 0: 8\nLevel 1: 4 12\nLevel 2: 2 6 10 14\nLevel 3: 1 7' },
      { type: 'h2', text: 'Post-order in action: evaluating an expression' },
      { type: 'p', text: 'A calculation like (3 + 4) × (10 − 8) is a tree: operators are internal nodes, numbers are leaves. To evaluate an operator you first need both of its operands, so evaluation is post-order. Printing it with brackets is in-order (left, operator, right).' },
      { type: 'code', title: 'ExpressionTree.cs', code: cs`
Expr e = new Op('*',
    new Op('+', new Num(3), new Num(4)),
    new Op('-', new Num(10), new Num(8)));

Console.WriteLine(Show(e));
Console.WriteLine(Eval(e));

static string Show(Expr e) => e switch            // in-order
{
    Num n => n.Value.ToString(),
    Op o => $"({Show(o.Left)} {o.Symbol} {Show(o.Right)})",
    _ => throw new ArgumentException("Unknown node")
};

static double Eval(Expr e) => e switch            // post-order: children first
{
    Num n => n.Value,
    Op o => Apply(o.Symbol, Eval(o.Left), Eval(o.Right)),
    _ => throw new ArgumentException("Unknown node")
};

static double Apply(char op, double a, double b) => op switch
{
    '+' => a + b,
    '-' => a - b,
    '*' => a * b,
    '/' => a / b,
    _ => throw new ArgumentException($"Unknown operator {op}")
};

abstract record Expr;
record Num(double Value) : Expr;
record Op(char Symbol, Expr Left, Expr Right) : Expr;`, output: '((3 + 4) * (10 - 8))\n14' },
      { type: 'h2', text: 'Which order for which job?' },
      { type: 'table', head: ['Order', 'Typical uses'], rows: [
        ['Pre-order', 'Copy or save a tree (parents before children), print an indented outline, a folder listing'],
        ['In-order', 'Binary search tree: keys come out **sorted**; print an expression with brackets'],
        ['Post-order', 'Anything that needs the children’s results first: folder sizes, evaluating expressions, deleting a tree'],
        ['Level order', 'Process by distance from the root, print level by level, find the nearest node with some property']
      ] },
      { type: 'quiz', question: 'Which traversal of a binary search tree gives the keys in sorted order?', options: ['Pre-order', 'In-order', 'Post-order', 'Level order'], answer: 1, explain: 'Smaller keys are in the left subtree and bigger keys in the right one, so left, node, right visits them from smallest to largest.' },
      { type: 'quiz', question: 'You need the total size of each folder, including all its sub-folders. Which order fits?', options: ['Pre-order', 'In-order', 'Post-order', 'Level order'], answer: 2, explain: 'A folder’s total depends on the totals of its children, so the children must be finished first.' },
      { type: 'exercise', task: 'Write `HasPathSum(Node? n, int target)` that returns true if some path from the root down to a **leaf** has values adding up to `target`. For the tree in this lesson, the root-to-leaf sums are 15 (8-4-2-1), 25 (8-4-6-7), 30 (8-12-10) and 34 (8-12-14), so 25 → True and 20 → False.', hint: 'Subtract the node’s value from the target as you go down. At a leaf, check whether what remains is exactly 0. Otherwise try the left subtree or the right subtree.', solution: cs`
var root = new Node(8,
    new Node(4, new Node(2, new Node(1)), new Node(6, null, new Node(7))),
    new Node(12, new Node(10), new Node(14)));

Console.WriteLine(HasPathSum(root, 25));
Console.WriteLine(HasPathSum(root, 20));
Console.WriteLine(HasPathSum(root, 34));

static bool HasPathSum(Node? n, int target)
{
    if (n is null) return false;
    int remaining = target - n.Value;
    if (n.Left is null && n.Right is null) return remaining == 0;   // a leaf
    return HasPathSum(n.Left, remaining) || HasPathSum(n.Right, remaining);
}

record Node(int Value, Node? Left = null, Node? Right = null);`, output: 'True\nFalse\nTrue' }
    ],
    keyPoints: [
      'Pre-order: node, left, right. In-order: left, node, right. Post-order: left, right, node.',
      'Level order uses a queue and visits the tree level by level.',
      'All traversals are O(n); recursion uses O(height) stack, an explicit Stack<T> avoids stack overflow.',
      'In-order of a BST is sorted; post-order suits work that needs the children’s results first.'
    ]
  },

  // ------------------------------------------------------------------ 27
  {
    slug: 'binary-search-trees',
    title: 'Binary search trees',
    summary: 'Keep keys in order inside a tree so that search, insert and delete follow one path from the root, handle the three delete cases, see how sorted input breaks it, and use SortedSet and SortedDictionary.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'A sorted array gives fast binary search but slow inserts (everything after the new item must shift). A linked list gives fast inserts but slow search. A **binary search tree** (BST) aims for both: O(log n) search **and** O(log n) insert, as long as it stays balanced.' },
      { type: 'h2', text: 'The BST rule' },
      { type: 'p', text: 'For **every** node: all keys in its left subtree are smaller, all keys in its right subtree are bigger. Searching is then binary search on a tree: compare with the node, go left if smaller, right if bigger. Each comparison throws away a whole subtree.' },
      { type: 'widget', name: 'bst-lab' },
      { type: 'code', title: 'Bst.cs', code: cs`
var bst = new Bst();
foreach (int x in new[] { 50, 30, 70, 20, 40, 60, 80 }) bst.Insert(x);

Console.WriteLine(bst.Contains(60));
Console.WriteLine(bst.Contains(65));
Console.WriteLine(string.Join(" ", bst.InOrder()));

class Bst
{
    private class Node
    {
        public int Key;
        public Node? Left, Right;
        public Node(int key) => Key = key;
    }
    private Node? _root;

    public void Insert(int key) => _root = Insert(_root, key);

    private static Node Insert(Node? n, int key)
    {
        if (n is null) return new Node(key);          // fell off the tree: attach here
        if (key < n.Key) n.Left = Insert(n.Left, key);
        else if (key > n.Key) n.Right = Insert(n.Right, key);
        return n;                                     // equal: already present
    }

    public bool Contains(int key)
    {
        var n = _root;
        while (n is not null)
        {
            if (key == n.Key) return true;
            n = key < n.Key ? n.Left : n.Right;       // one way only
        }
        return false;
    }

    public List<int> InOrder()
    {
        var result = new List<int>();
        Walk(_root, result);
        return result;
    }

    private static void Walk(Node? n, List<int> result)
    {
        if (n is null) return;
        Walk(n.Left, result);
        result.Add(n.Key);
        Walk(n.Right, result);
    }
}`, output: 'True\nFalse\n20 30 40 50 60 70 80' },
      { type: 'p', text: 'The smallest key is found by going left until you cannot; the largest by going right. In-order traversal lists every key in sorted order, for free.' },
      { type: 'h2', text: 'Deleting: three cases' },
      { type: 'ol', items: [
        '**A leaf**: just remove it.',
        '**One child**: the child takes the deleted node’s place.',
        '**Two children**: find the **in-order successor**, the smallest key in the right subtree. Copy its key into this node, then delete the successor from the right subtree. The successor has no left child, so that second delete is case 1 or 2.'
      ] },
      { type: 'code', title: 'BstRemove.cs', code: cs`
// inside the Bst class
public void Remove(int key) => _root = Remove(_root, key);

private static Node? Remove(Node? n, int key)
{
    if (n is null) return null;                       // not found
    if (key < n.Key) n.Left = Remove(n.Left, key);
    else if (key > n.Key) n.Right = Remove(n.Right, key);
    else
    {
        if (n.Left is null) return n.Right;           // leaf or one child
        if (n.Right is null) return n.Left;

        var s = n.Right;                              // two children:
        while (s.Left is not null) s = s.Left;        // smallest key on the right
        n.Key = s.Key;                                // copy the successor up…
        n.Right = Remove(n.Right, s.Key);             // …and delete it below
    }
    return n;
}`, output: '' },
      { type: 'h2', text: 'The catch: insertion order decides the shape' },
      { type: 'p', text: 'Insert 10, 20, 30, 40, 50 in that order and every new key is bigger than all before it, so it always goes right. The “tree” is a chain of height n − 1, and every operation is O(n), no better than a linked list. Sorted or nearly sorted input (IDs, dates, timestamps) is very common in practice. Try “Sorted order” in the widget.' },
      { type: 'table', head: ['Operation', 'Balanced BST', 'Degenerate BST'], rows: [
        ['Search, insert, delete', 'O(log n)', 'O(n)'],
        ['Min / max', 'O(log n)', 'O(n)'],
        ['All keys in order', 'O(n)', 'O(n)']
      ] },
      { type: 'p', text: 'The fix is a **self-balancing** tree that reshapes itself after inserts and deletes (next lesson). Unless you are learning or have a special need, never write your own BST for production. Use the balanced ones .NET provides.' },
      { type: 'h2', text: 'BSTs in .NET: SortedSet and SortedDictionary' },
      { type: 'p', text: '`SortedSet<T>` and `SortedDictionary<TKey, TValue>` are **red-black trees**: balanced BSTs with guaranteed O(log n) operations. Unlike `HashSet` and `Dictionary`, they keep keys in order, so you can ask for the minimum, the maximum or everything in a range.' },
      { type: 'code', title: 'SortedCollections.cs', code: cs`
var levels = new SortedSet<double> { 12.0, 0.0, 4.0, 8.0, 16.0 };
Console.WriteLine(levels.Min + " " + levels.Max);
Console.WriteLine(string.Join(" ", levels.GetViewBetween(4.0, 12.0)));   // a range, inclusive

var beams = new SortedDictionary<string, double>
{
    ["B-20"] = 6.0,
    ["B-03"] = 4.5,
    ["B-11"] = 7.2
};
foreach (var (id, length) in beams)          // always in key order
    Console.WriteLine($"{id}: {length}");`, output: '0 16\n4 8 12\nB-03: 4.5\nB-11: 7.2\nB-20: 6' },
      { type: 'table', head: ['Need', 'Use'], rows: [
        ['Fast lookup by key, order does not matter', '`Dictionary` / `HashSet`: O(1)'],
        ['Keys kept sorted, min/max, ranges', '`SortedDictionary` / `SortedSet`: O(log n)'],
        ['Sorted, built once, then mostly read', '`SortedList` or a sorted array + binary search (less memory)']
      ] },
      { type: 'quiz', question: 'You insert 5, 3, 8, 1, 4 into an empty BST. What is the parent of 4?', options: ['5', '3', '1', '8'], answer: 1, explain: '4 < 5 goes left to 3; 4 > 3 goes right of 3. So 3 is its parent.' },
      { type: 'quiz', question: 'You delete a node with two children. Which key replaces it?', options: ['Its left child', 'The largest key in the whole tree', 'The smallest key in its right subtree (its in-order successor)', 'Its parent'], answer: 2, explain: 'The successor is bigger than everything on the left and smaller than everything else on the right, so the BST rule still holds. (The largest key of the left subtree works too.)' },
      { type: 'exercise', task: 'Write `IsBst(Node? n)` that checks whether a binary tree follows the BST rule. Careful: checking only each node against its own children is not enough. In `50 → left 30 → right 60`, 60 is bigger than its parent 30, but it sits in the left subtree of 50, so the tree is **not** a BST.', hint: 'Pass down the range a key is allowed to be in. Going left, the current key becomes the upper bound; going right, it becomes the lower bound. Use `long` bounds so `int.MinValue` and `int.MaxValue` keys still work.', solution: cs`
var good = new Node(50, new Node(30, new Node(20), new Node(40)), new Node(70));
var bad = new Node(50, new Node(30, new Node(20), new Node(60)), new Node(70));

Console.WriteLine(IsBst(good));
Console.WriteLine(IsBst(bad));

static bool IsBst(Node? n, long min = long.MinValue, long max = long.MaxValue)
{
    if (n is null) return true;
    if (n.Key <= min || n.Key >= max) return false;          // outside its allowed range
    return IsBst(n.Left, min, n.Key) && IsBst(n.Right, n.Key, max);
}

record Node(int Key, Node? Left = null, Node? Right = null);`, output: 'True\nFalse' }
    ],
    keyPoints: [
      'BST rule: left subtree smaller, right subtree bigger, at every node.',
      'Search, insert and delete follow one root-to-leaf path: O(height).',
      'Delete has three cases; with two children, swap in the in-order successor.',
      'Sorted input makes a plain BST degenerate (O(n)). Use SortedSet / SortedDictionary, which are balanced red-black trees.'
    ]
  },

  // ------------------------------------------------------------------ 28
  {
    slug: 'balanced-trees',
    title: 'Balanced trees: AVL, red-black and B-trees',
    summary: 'See how self-balancing trees keep their height at O(log n): balance factors and rotations in AVL trees, the rules of red-black trees, and why databases use wide B-trees.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'The last lesson ended with a problem: a BST is only fast while it is short, and real data (sorted IDs, timestamps) easily makes it tall. A **self-balancing** tree fixes its shape automatically after every insert and delete, so its height always stays O(log n), whatever order the keys arrive in.' },
      { type: 'h2', text: 'Rotations: reshaping without breaking the order' },
      { type: 'p', text: 'The basic tool is a **rotation**. A right rotation around node Y lifts its left child X up: X becomes the parent, Y becomes X’s right child, and X’s old right subtree moves across to become Y’s left subtree. The in-order sequence of keys does not change, so the BST rule still holds, but one side gets one level shorter. A left rotation is the mirror image. A rotation only changes a few pointers: O(1).' },
      { type: 'code', title: 'Rotation.txt', code: cs`
      Y                    X
     / \     rotate       / \
    X   C    right       A   Y
   / \       ───→           / \
  A   B                     B   C

in-order before: A X B Y C     in-order after: A X B Y C`, output: '' },
      { type: 'h2', text: 'AVL trees' },
      { type: 'p', text: 'The AVL tree (1962, named after Adelson-Velsky and Landis) was the first self-balancing BST. Every node stores its height. Its **balance factor** is height(left) − height(right). The rule: every balance factor must be −1, 0 or +1. After an insert, walk back up the path; the first node whose factor became ±2 is fixed with one of four cases:' },
      { type: 'table', head: ['Case', 'Where the new key went', 'Fix'], rows: [
        ['Left-left', 'Left subtree of the left child', 'One right rotation'],
        ['Right-right', 'Right subtree of the right child', 'One left rotation'],
        ['Left-right', 'Right subtree of the left child', 'Left rotation on the child, then right rotation'],
        ['Right-left', 'Left subtree of the right child', 'Right rotation on the child, then left rotation']
      ] },
      { type: 'widget', name: 'avl-viz' },
      { type: 'code', title: 'AvlTree.cs', code: cs`
var tree = new AvlTree();
for (int i = 1; i <= 1000; i++) tree.Insert(i);               // sorted: worst case for a BST
Console.WriteLine($"1,000 sorted inserts: height {tree.Height}");
for (int i = 1001; i <= 1_000_000; i++) tree.Insert(i);
Console.WriteLine($"1,000,000 sorted inserts: height {tree.Height}");

class AvlTree
{
    private class Node
    {
        public int Key, Height = 1;                 // height counted in nodes here
        public Node? Left, Right;
        public Node(int key) => Key = key;
    }
    private Node? _root;

    public int Height => H(_root) - 1;              // in edges, like the rest of the course

    private static int H(Node? n) => n?.Height ?? 0;
    private static void Update(Node n) => n.Height = 1 + Math.Max(H(n.Left), H(n.Right));
    private static int Balance(Node n) => H(n.Left) - H(n.Right);

    private static Node RotateRight(Node y)
    {
        var x = y.Left!;
        y.Left = x.Right;
        x.Right = y;
        Update(y);
        Update(x);
        return x;                                   // x is the new subtree root
    }

    private static Node RotateLeft(Node x)
    {
        var y = x.Right!;
        x.Right = y.Left;
        y.Left = x;
        Update(x);
        Update(y);
        return y;
    }

    public void Insert(int key) => _root = Insert(_root, key);

    private static Node Insert(Node? n, int key)
    {
        if (n is null) return new Node(key);
        if (key < n.Key) n.Left = Insert(n.Left, key);
        else if (key > n.Key) n.Right = Insert(n.Right, key);
        else return n;

        Update(n);
        int b = Balance(n);
        if (b > 1 && key < n.Left!.Key) return RotateRight(n);                  // left-left
        if (b < -1 && key > n.Right!.Key) return RotateLeft(n);                 // right-right
        if (b > 1) { n.Left = RotateLeft(n.Left!); return RotateRight(n); }     // left-right
        if (b < -1) { n.Right = RotateRight(n.Right!); return RotateLeft(n); }  // right-left
        return n;
    }
}`, output: '1,000 sorted inserts: height 9\n1,000,000 sorted inserts: height 19' },
      { type: 'p', text: 'A plain BST would have heights 999 and 999,999 for the same input (and would overflow the stack long before that). The AVL tree stays at about log₂ n.' },
      { type: 'h2', text: 'Red-black trees' },
      { type: 'p', text: 'A red-black tree colours every node red or black and keeps these rules:' },
      { type: 'ul', items: [
        'The root is black, and the empty (null) leaves count as black.',
        'A red node never has a red child.',
        'Every path from a node down to an empty leaf passes through the **same number of black nodes**.'
      ] },
      { type: 'p', text: 'Together these guarantee that the longest path is at most twice the shortest, so the height is at most about 2 log₂ n. That is a looser balance than AVL, so lookups can be slightly slower, but inserts and deletes need fewer rotations (at most 2 for an insert, 3 for a delete). That trade-off is why most libraries choose red-black trees: .NET’s `SortedSet` and `SortedDictionary`, Java’s `TreeMap`, and C++’s `std::map`.' },
      { type: 'h2', text: 'B-trees: balanced trees for disks' },
      { type: 'p', text: 'Reading from disk or SSD is slow compared with memory, and data comes in **pages** (often 4 or 8 KB). A **B-tree** makes each node one page holding **hundreds of keys** and hundreds of children. With 500 children per node, three levels hold 500³ = 125 million keys, so any key is found in 3 or 4 page reads. All leaves are at the same depth, and nodes split or merge to stay balanced.' },
      { type: 'p', text: 'Almost every database index is a B-tree (more exactly a **B+ tree**, where all values live in the leaves and leaves are linked for fast range scans): SQL Server, PostgreSQL, SQLite, as well as file systems such as NTFS. When you create an index on a column, you are building one.' },
      { type: 'table', head: ['Tree', 'Height guarantee', 'Strength', 'Where you meet it'], rows: [
        ['Plain BST', 'none (up to n)', 'simple', 'teaching, random data'],
        ['AVL', '≈ 1.44 log₂ n', 'fastest lookups', 'read-heavy in-memory indexes'],
        ['Red-black', '≤ 2 log₂ n', 'cheap inserts and deletes', '`SortedSet`, `SortedDictionary`, `TreeMap`'],
        ['B-tree / B+ tree', 'log base ~hundreds', 'few disk reads', 'database indexes, file systems']
      ] },
      { type: 'quiz', question: 'A node’s left subtree has height 3 and its right subtree height 1 (counted the same way). What is its balance factor, and is it allowed in an AVL tree?', options: ['+2, not allowed', '−2, not allowed', '+2, allowed', '+1, allowed'], answer: 0, explain: '3 − 1 = +2. AVL allows only −1, 0 and +1, so a rotation is needed.' },
      { type: 'quiz', question: 'Why do databases use B-trees instead of red-black trees for indexes?', options: ['B-trees use less memory', 'Each node holds many keys, so the tree is very short and needs few slow disk reads', 'Red-black trees cannot store strings', 'B-trees are not balanced, so they are faster'], answer: 1, explain: 'A red-black tree of a million keys is about 20–40 levels: 20+ disk reads. A B-tree with hundreds of keys per node needs 3 or 4.' },
      { type: 'exercise', task: 'Write `IsBalanced(Node? root)`: true if, at every node, the heights of the left and right subtrees differ by at most 1. Do it in **O(n)**: do not call a separate height function for every node (that is O(n²) on a chain). A 3-node tree 2 / 1 3 is balanced; the chain 1 → 2 → 3 (all right children) is not.', hint: 'Write one recursive function that returns the height, or −1 to mean “this subtree is not balanced”. As soon as a child returns −1, pass −1 straight up.', solution: cs`
var perfect = new Node(2, new Node(1), new Node(3));
var chain = new Node(1, null, new Node(2, null, new Node(3)));

Console.WriteLine(IsBalanced(perfect));
Console.WriteLine(IsBalanced(chain));

static bool IsBalanced(Node? root) => CheckedHeight(root) != -1;

static int CheckedHeight(Node? n)              // height in nodes, or -1 if unbalanced
{
    if (n is null) return 0;
    int left = CheckedHeight(n.Left);
    if (left == -1) return -1;
    int right = CheckedHeight(n.Right);
    if (right == -1) return -1;
    if (Math.Abs(left - right) > 1) return -1;
    return 1 + Math.Max(left, right);
}

record Node(int Key, Node? Left = null, Node? Right = null);`, output: 'True\nFalse' }
    ],
    keyPoints: [
      'Self-balancing trees keep height O(log n) whatever order keys arrive in.',
      'Rotations reshape a subtree in O(1) without changing the in-order sequence.',
      'AVL: balance factor in {−1, 0, +1}, fixed with single or double rotations. Red-black: colour rules, height ≤ 2 log₂ n, used by SortedSet/SortedDictionary.',
      'B-trees store hundreds of keys per node to minimise disk reads; they power database indexes.'
    ]
  },

  // ------------------------------------------------------------------ 29
  {
    slug: 'heaps-priority-queues',
    title: 'Heaps and priority queues',
    summary: 'Store a complete binary tree in an array, keep the smallest item on top with sift-up and sift-down in O(log n), and use .NET’s PriorityQueue for scheduling, top-k and merging sorted data.',
    minutes: 15,
    blocks: [
      { type: 'p', text: 'A queue serves items in arrival order. Often you need something else: **the most urgent item first**. The next site inspection by priority, the closest unvisited node in a route search, the job with the earliest deadline. A **priority queue** supports exactly three things: add an item, look at the best item, remove the best item. The standard way to build one is a **binary heap**.' },
      { type: 'h2', text: 'The heap rule' },
      { type: 'p', text: 'A **min-heap** is a binary tree where every parent is ≤ its children. So the smallest item is always at the root. Unlike a BST, there is **no** left/right order: siblings can be in any order. That weaker rule is what makes it cheap to maintain.' },
      { type: 'p', text: 'A heap is also always a **complete** tree: every level is full except possibly the last, which fills from the left. A complete tree fits perfectly into an array with no gaps and no pointers:' },
      { type: 'table', head: ['For the item at index i', 'Index'], rows: [
        ['Parent', '(i − 1) / 2'],
        ['Left child', '2i + 1'],
        ['Right child', '2i + 2']
      ] },
      { type: 'widget', name: 'heap-viz' },
      { type: 'h2', text: 'Push: add at the end, sift up' },
      { type: 'p', text: 'Put the new item in the next free slot (the end of the array), so the tree stays complete. It may be smaller than its parent, so swap it upwards while it is. At most one swap per level: **O(log n)**.' },
      { type: 'h2', text: 'Pop: take the root, sift down' },
      { type: 'p', text: 'The minimum is at index 0. Move the **last** item into its place (again keeping the tree complete), then swap it down with its **smaller** child while it is bigger than that child. Also **O(log n)**. Looking at the minimum without removing it (`Peek`) is O(1).' },
      { type: 'code', title: 'MinHeap.cs', code: cs`
var heap = new MinHeap();
foreach (int x in new[] { 9, 4, 7, 1, 8, 2 }) heap.Push(x);

var order = new List<int>();
while (heap.Count > 0) order.Add(heap.Pop());
Console.WriteLine(string.Join(" ", order));

class MinHeap
{
    private readonly List<int> _a = new();
    public int Count => _a.Count;
    public int Peek() => _a[0];

    public void Push(int x)
    {
        _a.Add(x);                                      // add at the end…
        int i = _a.Count - 1;
        while (i > 0)
        {
            int parent = (i - 1) / 2;
            if (_a[parent] <= _a[i]) break;             // …sift up while smaller than the parent
            (_a[parent], _a[i]) = (_a[i], _a[parent]);
            i = parent;
        }
    }

    public int Pop()
    {
        int min = _a[0];
        _a[0] = _a[^1];                                 // move the last item to the root…
        _a.RemoveAt(_a.Count - 1);
        int i = 0;
        while (true)                                    // …and sift it down
        {
            int l = 2 * i + 1, r = l + 1, smallest = i;
            if (l < _a.Count && _a[l] < _a[smallest]) smallest = l;
            if (r < _a.Count && _a[r] < _a[smallest]) smallest = r;
            if (smallest == i) break;
            (_a[smallest], _a[i]) = (_a[i], _a[smallest]);
            i = smallest;
        }
        return min;
    }
}`, output: '1 2 4 7 8 9' },
      { type: 'p', text: 'Pushing everything and then popping everything sorts the data: that is **heap sort**, O(n log n) and in place when done inside the array itself. Building a heap from n items at once (“heapify”, sifting down from the middle of the array backwards) is only **O(n)**.' },
      { type: 'h2', text: 'PriorityQueue in .NET' },
      { type: 'p', text: '.NET 6 added `PriorityQueue<TElement, TPriority>`, a min-heap where each element has a separate priority. The smallest priority comes out first.' },
      { type: 'code', title: 'PriorityQueue.cs', code: cs`
var jobs = new PriorityQueue<string, int>();
jobs.Enqueue("Check crane certificate", 2);
jobs.Enqueue("Fix missing safety rail", 1);
jobs.Enqueue("Order extra bolts", 4);
jobs.Enqueue("Inspect welds on level 3", 3);

Console.WriteLine($"Next: {jobs.Peek()}");
while (jobs.TryDequeue(out var job, out int priority))
    Console.WriteLine($"{priority}: {job}");`, output: 'Next: Fix missing safety rail\n1: Fix missing safety rail\n2: Check crane certificate\n3: Inspect welds on level 3\n4: Order extra bolts' },
      { type: 'note', kind: 'warn', text: '`PriorityQueue` is **not stable**: two items with the same priority can come out in any order, not first-in-first-out. If order matters for ties, use a tuple priority such as `(priority, sequenceNumber)`. For a max-heap, pass a reversed comparer: `new PriorityQueue<string, int>(Comparer<int>.Create((a, b) => b.CompareTo(a)))`.' },
      { type: 'h2', text: 'Classic use: the k largest' },
      { type: 'p', text: 'To find the 3 longest beams out of a million, sorting everything costs O(n log n). Instead keep a **min-heap of size k**: push each item, and when the heap holds more than k, pop the smallest. The heap always holds the k largest seen so far. Cost: O(n log k), and only k items of memory.' },
      { type: 'code', title: 'TopK.cs', code: cs`
static List<int> TopK(IEnumerable<int> values, int k)
{
    var heap = new PriorityQueue<int, int>();   // min-heap of the k largest so far
    foreach (int v in values)
    {
        heap.Enqueue(v, v);
        if (heap.Count > k) heap.Dequeue();     // drop the smallest
    }
    var result = new List<int>();
    while (heap.Count > 0) result.Add(heap.Dequeue());
    result.Reverse();                           // largest first
    return result;
}

Console.WriteLine(string.Join(" ", TopK(new[] { 5, 12, 3, 41, 7, 19, 8, 26 }, 3)));`, output: '41 26 19' },
      { type: 'table', head: ['Operation', 'Binary heap', 'Sorted list', 'Unsorted list'], rows: [
        ['Add', 'O(log n)', 'O(n)', 'O(1)'],
        ['Peek best', 'O(1)', 'O(1)', 'O(n)'],
        ['Remove best', 'O(log n)', 'O(1) from the end', 'O(n)'],
        ['Search for any item', 'O(n)', 'O(log n)', 'O(n)']
      ] },
      { type: 'quiz', question: 'In a heap stored in an array, where are the children of the item at index 4?', options: ['8 and 9', '9 and 10', '5 and 6', '1 and 2'], answer: 1, explain: '2 × 4 + 1 = 9 and 2 × 4 + 2 = 10. Its parent is (4 − 1) / 2 = 1.' },
      { type: 'quiz', question: 'Is a min-heap’s array sorted?', options: ['Yes, always ascending', 'Only the first half', 'No: only “parent ≤ children” holds, siblings and cousins are in any order', 'Yes, but descending'], answer: 2, explain: 'For example { 1, 5, 2, 6, 7, 3 } is a valid min-heap but not sorted. Only the root is guaranteed to be the minimum.' },
      { type: 'exercise', task: 'Merge k sorted arrays into one sorted list using a `PriorityQueue`. For `{ 1, 4, 9 }`, `{ 2, 3, 10 }`, `{ 5, 6 }` the result is `1 2 3 4 5 6 9 10`. With N items in total and k arrays, aim for O(N log k).', hint: 'Put the first item of each array into the queue, with a note of which array and index it came from. Repeatedly dequeue the smallest, add it to the result, and enqueue the next item from the same array.', solution: cs`
var parts = new List<int[]> { new[] { 1, 4, 9 }, new[] { 2, 3, 10 }, new[] { 5, 6 } };
Console.WriteLine(string.Join(" ", MergeK(parts)));

static List<int> MergeK(List<int[]> lists)
{
    var pq = new PriorityQueue<(int list, int index), int>();
    for (int i = 0; i < lists.Count; i++)
        if (lists[i].Length > 0) pq.Enqueue((i, 0), lists[i][0]);

    var result = new List<int>();
    while (pq.TryDequeue(out var pos, out int value))
    {
        result.Add(value);
        int next = pos.index + 1;
        if (next < lists[pos.list].Length)
            pq.Enqueue((pos.list, next), lists[pos.list][next]);   // next item from the same array
    }
    return result;
}`, output: '1 2 3 4 5 6 9 10' }
    ],
    keyPoints: [
      'A min-heap keeps every parent ≤ its children, so the minimum is at the root.',
      'A heap is a complete tree stored in an array: parent (i − 1) / 2, children 2i + 1 and 2i + 2.',
      'Push sifts up, pop sifts down: O(log n). Peek is O(1); heapify is O(n).',
      '`PriorityQueue<TElement, TPriority>` is .NET’s min-heap; it is not stable. Use a size-k heap for top-k.'
    ]
  },

  // ------------------------------------------------------------------ 30
  {
    slug: 'tries',
    title: 'Tries (prefix trees)',
    summary: 'Store words letter by letter in a tree so that lookups and prefix searches cost O(length of the word), build autocomplete, and know when a trie beats a HashSet.',
    minutes: 13,
    blocks: [
      { type: 'p', text: 'Type “bo” into a search box and it suggests “bolt” and “bolts”. A `HashSet<string>` can tell you instantly whether “bolt” exists, but it cannot answer “which words **start with** bo?” without checking every word. A **trie** (from re**trie**val, usually said “try”) answers prefix questions directly.' },
      { type: 'h2', text: 'One letter per edge' },
      { type: 'p', text: 'The root represents the empty string. Each edge adds one letter, so every node represents the prefix spelled by the path to it. A node is marked when a complete word ends there. Words that share a beginning share that part of the path: “beam” and “bear” share b-e-a, and “bolt” is a marked node on the way to “bolts”.' },
      { type: 'widget', name: 'trie-viz' },
      { type: 'h2', text: 'A trie in C#' },
      { type: 'p', text: 'Each node holds a dictionary from letter to child node, and a flag for “a word ends here”. Insert walks the word, creating missing nodes. Lookup walks the word and fails as soon as a letter is missing.' },
      { type: 'code', title: 'Trie.cs', code: cs`
using System.Text;

var trie = new Trie();
foreach (var w in new[] { "beam", "bear", "bolt", "bolts", "brace", "column" })
    trie.Insert(w);

Console.WriteLine(trie.Contains("bolt"));
Console.WriteLine(trie.Contains("bea"));       // only a prefix, not a word
Console.WriteLine(trie.StartsWith("bea"));
Console.WriteLine(string.Join(", ", trie.WordsWithPrefix("b")));

class Trie
{
    private class Node
    {
        public Dictionary<char, Node> Children { get; } = new();
        public bool IsWord;
    }
    private readonly Node _root = new();

    public void Insert(string word)
    {
        var n = _root;
        foreach (char c in word)
        {
            if (!n.Children.TryGetValue(c, out var next))
                n.Children[c] = next = new Node();     // create the missing step
            n = next;
        }
        n.IsWord = true;
    }

    private Node? Find(string prefix)
    {
        var n = _root;
        foreach (char c in prefix)
        {
            if (!n.Children.TryGetValue(c, out var next)) return null;   // path breaks off
            n = next;
        }
        return n;
    }

    public bool Contains(string word) => Find(word)?.IsWord == true;
    public bool StartsWith(string prefix) => Find(prefix) is not null;

    public List<string> WordsWithPrefix(string prefix)
    {
        var result = new List<string>();
        var start = Find(prefix);
        if (start is not null) Collect(start, new StringBuilder(prefix), result);
        return result;
    }

    private static void Collect(Node n, StringBuilder sb, List<string> result)
    {
        if (n.IsWord) result.Add(sb.ToString());
        foreach (var (c, child) in n.Children.OrderBy(p => p.Key))   // alphabetical
        {
            sb.Append(c);
            Collect(child, sb, result);
            sb.Length--;                                              // undo the letter
        }
    }
}`, output: 'True\nFalse\nTrue\nbeam, bear, bolt, bolts, brace' },
      { type: 'h2', text: 'How fast is it?' },
      { type: 'p', text: 'Insert, lookup and prefix check cost **O(L)**, where L is the length of the word or prefix, no matter how many words are stored. Listing all words with a prefix costs O(L) to reach the prefix node, plus the size of that subtree. A hash set lookup is also O(L) in practice (computing the hash reads every character), so tries do not win on plain lookups. They win on everything to do with **prefixes**.' },
      { type: 'table', head: ['Question', 'HashSet<string>', 'Sorted array + binary search', 'Trie'], rows: [
        ['Is “bolt” a word?', 'O(L), fastest', 'O(L log n)', 'O(L)'],
        ['Any word starting with “bo”?', 'O(n · L): check all', 'O(L log n)', 'O(L)'],
        ['All words starting with “bo”', 'O(n · L)', 'O(L log n + k)', 'O(L + size of answer)'],
        ['Memory', 'low', 'lowest', 'high: a node per letter']
      ] },
      { type: 'note', kind: 'info', text: 'Tries can use a lot of memory: a node object and a dictionary for every letter that is not shared. For lowercase English only, an array `Node?[26]` per node is faster than a dictionary but bigger. Compressed tries (radix trees) merge chains of single children into one edge, like “olumn” after “c”.' },
      { type: 'h2', text: 'Where tries are used' },
      { type: 'ul', items: [
        '**Autocomplete** and search suggestions, spell checkers (“did you mean…”).',
        '**Routing tables**: an internet router finds the longest matching prefix of an IP address, stored bit by bit in a binary trie.',
        '**Word games and puzzles**: stop searching a path the moment no word starts with the letters so far.',
        '**Prefix codes**: Huffman compression decodes bits by walking a binary trie.'
      ] },
      { type: 'quiz', question: 'A trie holds 100,000 words. How many steps does `StartsWith("colu")` take?', options: ['About 4', 'About log₂ 100,000 ≈ 17', 'About 100,000', 'It depends on how many words start with “colu”'], answer: 0, explain: 'One step per letter of the prefix, independent of how many words are stored.' },
      { type: 'quiz', question: 'Why does each trie node need an “is a word” flag?', options: ['To save memory', 'Because a word can end at a node that also continues to longer words, like “bolt” inside “bolts”', 'To keep the children sorted', 'It does not need one; leaves are words'], answer: 1, explain: 'Without the flag, “bolt” and the mere prefix “bol” would look the same: both are inner nodes on the path to “bolts”.' },
      { type: 'exercise', task: 'Build a `CountingTrie` where `CountWithPrefix(string prefix)` returns how many inserted words start with `prefix`, in O(length of the prefix), without walking the subtree. Words: beam, bear, bolt, bolts, brace. Expected: b → 5, bo → 2, bea → 2, c → 0. (Assume each word is inserted once.)', hint: 'Store a counter in every node: how many words pass through it. Increment it for each node on the path during Insert. The answer is the counter of the node at the end of the prefix.', solution: cs`
var t = new CountingTrie();
foreach (var w in new[] { "beam", "bear", "bolt", "bolts", "brace" }) t.Insert(w);
foreach (var p in new[] { "b", "bo", "bea", "c" })
    Console.WriteLine($"{p}: {t.CountWithPrefix(p)}");

class CountingTrie
{
    private class Node
    {
        public Dictionary<char, Node> Children { get; } = new();
        public int Count;                           // words that pass through this node
    }
    private readonly Node _root = new();

    public void Insert(string word)
    {
        var n = _root;
        foreach (char c in word)
        {
            if (!n.Children.TryGetValue(c, out var next))
                n.Children[c] = next = new Node();
            next.Count++;
            n = next;
        }
    }

    public int CountWithPrefix(string prefix)
    {
        var n = _root;
        foreach (char c in prefix)
        {
            if (!n.Children.TryGetValue(c, out var next)) return 0;
            n = next;
        }
        return n.Count;
    }
}`, output: 'b: 5\nbo: 2\nbea: 2\nc: 0' }
    ],
    keyPoints: [
      'A trie stores strings letter by letter; each node is a prefix, shared by all words that start with it.',
      'Insert, lookup and prefix checks are O(length of the word), independent of how many words are stored.',
      'Mark word ends explicitly: a word can end in the middle of a longer word’s path.',
      'Tries shine for prefix queries (autocomplete, routing) but use more memory than a HashSet.'
    ]
  }
];
