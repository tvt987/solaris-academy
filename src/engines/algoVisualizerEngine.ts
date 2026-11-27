import type { BilingualText } from '../types/lms';

export type AlgorithmId = 'binary-search' | 'quicksort-lomuto' | 'dijkstra';

// ============================================================================
// 1. BINARY SEARCH — O(log n) Deterministic Step Trace
// ============================================================================

export type BinarySearchPhase =
  | 'init'
  | 'compare'
  | 'narrow-left'
  | 'narrow-right'
  | 'found'
  | 'not-found';

export interface BinarySearchStep {
  stepIndex: number;
  phase: BinarySearchPhase;
  array: number[];
  target: number;
  low: number;
  mid: number | null;
  high: number;
  eliminatedIndices: number[];
  foundIndex: number | null;
  comparisons: number;
  swaps: number;
  pseudocodeLine: number;
  message: BilingualText;
}

export interface BinarySearchTrace {
  algorithm: 'binary-search';
  array: number[];
  target: number;
  foundIndex: number | null;
  totalComparisons: number;
  totalSwaps: number;
  complexity: { time: string; space: string };
  pseudocode: string[];
  steps: BinarySearchStep[];
}

export const DEFAULT_BINARY_SEARCH_ARRAY: readonly number[] = [
  4, 11, 17, 23, 31, 42, 56, 68, 79, 91, 104, 118,
];

export const BINARY_SEARCH_PRESETS: ReadonlyArray<{
  id: string;
  label: BilingualText;
  array: number[];
  target: number;
}> = [
  {
    id: 'target-68',
    label: { en: 'Find 68 (Right Half)', vi: 'Tìm 68 (Nửa Phải)' },
    array: [...DEFAULT_BINARY_SEARCH_ARRAY],
    target: 68,
  },
  {
    id: 'target-11',
    label: { en: 'Find 11 (Left Half)', vi: 'Tìm 11 (Nửa Trái)' },
    array: [...DEFAULT_BINARY_SEARCH_ARRAY],
    target: 11,
  },
  {
    id: 'target-50',
    label: { en: 'Find 50 (Not Present)', vi: 'Tìm 50 (Không Tồn Tại)' },
    array: [...DEFAULT_BINARY_SEARCH_ARRAY],
    target: 50,
  },
];

const BINARY_SEARCH_PSEUDOCODE: string[] = [
  'low = 0; high = arr.length - 1',
  'while low <= high:',
  '  mid = low + floor((high - low) / 2)',
  '  if arr[mid] == target: return mid',
  '  else if arr[mid] < target: low = mid + 1',
  '  else: high = mid - 1',
  'return -1  // target absent',
];

function computeEliminatedOutside(length: number, low: number, high: number): number[] {
  const eliminated: number[] = [];
  for (let idx = 0; idx < length; idx += 1) {
    if (idx < low || idx > high) {
      eliminated.push(idx);
    }
  }
  return eliminated;
}

export function generateBinarySearchTrace(
  inputArray: readonly number[],
  target: number,
): BinarySearchTrace {
  const arr = [...inputArray].sort((a, b) => a - b);
  const steps: BinarySearchStep[] = [];
  let low = 0;
  let high = arr.length - 1;
  let comparisons = 0;
  let foundIndex: number | null = null;

  steps.push({
    stepIndex: 0,
    phase: 'init',
    array: [...arr],
    target,
    low,
    mid: null,
    high,
    eliminatedIndices: [],
    foundIndex: null,
    comparisons: 0,
    swaps: 0,
    pseudocodeLine: 0,
    message: {
      en: `Initialize search bounds low=0, high=${high} for target ${target}.`,
      vi: `Khởi tạo biên tìm kiếm low=0, high=${high} cho giá trị mục tiêu ${target}.`,
    },
  });

  if (arr.length === 0) {
    steps.push({
      stepIndex: 1,
      phase: 'not-found',
      array: [],
      target,
      low: 0,
      mid: null,
      high: -1,
      eliminatedIndices: [],
      foundIndex: null,
      comparisons: 0,
      swaps: 0,
      pseudocodeLine: 6,
      message: {
        en: `Empty array — target ${target} cannot be found (return -1).`,
        vi: `Mảng rỗng — không thể tìm thấy ${target} (trả về -1).`,
      },
    });
    return {
      algorithm: 'binary-search',
      array: arr,
      target,
      foundIndex: null,
      totalComparisons: 0,
      totalSwaps: 0,
      complexity: { time: 'O(log n)', space: 'O(1)' },
      pseudocode: BINARY_SEARCH_PSEUDOCODE,
      steps,
    };
  }

  while (low <= high) {
    const mid = low + Math.floor((high - low) / 2);
    const midValue = arr[mid]!;
    comparisons += 1;

    steps.push({
      stepIndex: steps.length,
      phase: 'compare',
      array: [...arr],
      target,
      low,
      mid,
      high,
      eliminatedIndices: computeEliminatedOutside(arr.length, low, high),
      foundIndex: null,
      comparisons,
      swaps: 0,
      pseudocodeLine: 2,
      message: {
        en: `Probe midpoint index ${mid}: arr[${mid}] = ${midValue} vs target ${target}.`,
        vi: `Kiểm tra phần tử giữa chỉ số ${mid}: arr[${mid}] = ${midValue} so với mục tiêu ${target}.`,
      },
    });

    if (midValue === target) {
      foundIndex = mid;
      steps.push({
        stepIndex: steps.length,
        phase: 'found',
        array: [...arr],
        target,
        low,
        mid,
        high,
        eliminatedIndices: computeEliminatedOutside(arr.length, low, high),
        foundIndex: mid,
        comparisons,
        swaps: 0,
        pseudocodeLine: 3,
        message: {
          en: `Exact match at index ${mid}! Target ${target} found in ${comparisons} comparison(s).`,
          vi: `Khớp chính xác tại chỉ số ${mid}! Tìm thấy ${target} sau ${comparisons} phép so sánh.`,
        },
      });
      break;
    }

    if (midValue < target) {
      low = mid + 1;
      steps.push({
        stepIndex: steps.length,
        phase: 'narrow-right',
        array: [...arr],
        target,
        low,
        mid,
        high,
        eliminatedIndices: computeEliminatedOutside(arr.length, low, high),
        foundIndex: null,
        comparisons,
        swaps: 0,
        pseudocodeLine: 4,
        message: {
          en: `${midValue} < ${target}: discard left half [0..${mid}], advance low to ${low}.`,
          vi: `${midValue} < ${target}: loại bỏ nửa trái [0..${mid}], dịch low lên ${low}.`,
        },
      });
    } else {
      high = mid - 1;
      steps.push({
        stepIndex: steps.length,
        phase: 'narrow-left',
        array: [...arr],
        target,
        low,
        mid,
        high,
        eliminatedIndices: computeEliminatedOutside(arr.length, low, high),
        foundIndex: null,
        comparisons,
        swaps: 0,
        pseudocodeLine: 5,
        message: {
          en: `${midValue} > ${target}: discard right half [${mid}..${arr.length - 1}], lower high to ${high}.`,
          vi: `${midValue} > ${target}: loại bỏ nửa phải [${mid}..${arr.length - 1}], hạ high xuống ${high}.`,
        },
      });
    }
  }

  if (foundIndex === null) {
    steps.push({
      stepIndex: steps.length,
      phase: 'not-found',
      array: [...arr],
      target,
      low,
      mid: null,
      high,
      eliminatedIndices: Array.from({ length: arr.length }, (_, idx) => idx),
      foundIndex: null,
      comparisons,
      swaps: 0,
      pseudocodeLine: 6,
      message: {
        en: `Bounds crossed (low=${low} > high=${high}). Target ${target} not present; return -1.`,
        vi: `Biên giao nhau (low=${low} > high=${high}). Không có ${target} trong mảng; trả về -1.`,
      },
    });
  }

  return {
    algorithm: 'binary-search',
    array: arr,
    target,
    foundIndex,
    totalComparisons: comparisons,
    totalSwaps: 0,
    complexity: { time: 'O(log n)', space: 'O(1)' },
    pseudocode: BINARY_SEARCH_PSEUDOCODE,
    steps,
  };
}

// ============================================================================
// 2. QUICKSORT (LOMUTO PARTITION) — Swap Arcs & Partition Markers
// ============================================================================

export type QuickSortPhase =
  | 'init'
  | 'choose-pivot'
  | 'compare'
  | 'swap'
  | 'place-pivot'
  | 'partition-done'
  | 'complete';

export interface QuickSortStep {
  stepIndex: number;
  phase: QuickSortPhase;
  array: number[];
  activeRange: [number, number] | null;
  pivotIndex: number | null;
  pivotValue: number | null;
  iPointer: number | null;
  jPointer: number | null;
  swapPair: [number, number] | null;
  sortedIndices: number[];
  recursionDepth: number;
  comparisons: number;
  swaps: number;
  pseudocodeLine: number;
  message: BilingualText;
}

export interface QuickSortTrace {
  algorithm: 'quicksort-lomuto';
  initialArray: number[];
  sortedArray: number[];
  totalComparisons: number;
  totalSwaps: number;
  complexity: { time: string; space: string };
  pseudocode: string[];
  steps: QuickSortStep[];
}

export const DEFAULT_QUICKSORT_ARRAY: readonly number[] = [38, 19, 72, 11, 54, 27, 63, 15, 46];

export const QUICKSORT_PRESETS: ReadonlyArray<{
  id: string;
  label: BilingualText;
  array: number[];
}> = [
  {
    id: 'balanced',
    label: { en: 'Standard Interview (9 items)', vi: 'Mảng Phỏng Vấn Chuẩn (9 phần tử)' },
    array: [...DEFAULT_QUICKSORT_ARRAY],
  },
  {
    id: 'duplicates',
    label: { en: 'With Duplicates', vi: 'Có Phần Tử Trùng Lặp' },
    array: [42, 18, 42, 9, 65, 18, 31, 50, 27],
  },
  {
    id: 'descending',
    label: { en: 'Reverse Order (Worst-Case)', vi: 'Đảo Ngược (Worst-Case Lomuto)' },
    array: [84, 71, 59, 46, 33, 21, 12],
  },
];

const QUICKSORT_PSEUDOCODE: string[] = [
  'function quicksort(arr, low, high):',
  '  if low >= high: mark sorted & return',
  '  pivot = arr[high]; i = low - 1',
  '  for j = low to high - 1:',
  '    if arr[j] <= pivot:',
  '      i += 1; swap(arr[i], arr[j])',
  '  swap(arr[i + 1], arr[high])  // lock pivot',
  '  quicksort(low, p - 1); quicksort(p + 1, high)',
];

export function generateQuickSortTrace(inputArray: readonly number[]): QuickSortTrace {
  const arr = [...inputArray];
  const steps: QuickSortStep[] = [];
  const sortedSet = new Set<number>();
  let comparisons = 0;
  let swaps = 0;

  const snapshotSorted = () => Array.from(sortedSet).sort((a, b) => a - b);

  steps.push({
    stepIndex: 0,
    phase: 'init',
    array: [...arr],
    activeRange: arr.length > 0 ? [0, arr.length - 1] : null,
    pivotIndex: null,
    pivotValue: null,
    iPointer: null,
    jPointer: null,
    swapPair: null,
    sortedIndices: [],
    recursionDepth: 0,
    comparisons: 0,
    swaps: 0,
    pseudocodeLine: 0,
    message: {
      en: `Begin Lomuto QuickSort on ${arr.length} element(s). Last element of each slice serves as pivot.`,
      vi: `Bắt đầu QuickSort phân hoạch Lomuto trên ${arr.length} phần tử. Phần tử cuối mỗi đoạn làm pivot.`,
    },
  });

  function sort(low: number, high: number, depth: number): void {
    if (low > high) return;

    if (low === high) {
      sortedSet.add(low);
      steps.push({
        stepIndex: steps.length,
        phase: 'partition-done',
        array: [...arr],
        activeRange: [low, high],
        pivotIndex: low,
        pivotValue: arr[low]!,
        iPointer: low,
        jPointer: null,
        swapPair: null,
        sortedIndices: snapshotSorted(),
        recursionDepth: depth,
        comparisons,
        swaps,
        pseudocodeLine: 1,
        message: {
          en: `Base case slice [${low}..${high}]: element ${arr[low]} is already in its final sorted slot.`,
          vi: `Trường hợp cơ sở [${low}..${high}]: phần tử ${arr[low]} đã nằm đúng vị trí cuối cùng.`,
        },
      });
      return;
    }

    const pivotValue = arr[high]!;
    let i = low - 1;

    steps.push({
      stepIndex: steps.length,
      phase: 'choose-pivot',
      array: [...arr],
      activeRange: [low, high],
      pivotIndex: high,
      pivotValue,
      iPointer: i,
      jPointer: low,
      swapPair: null,
      sortedIndices: snapshotSorted(),
      recursionDepth: depth,
      comparisons,
      swaps,
      pseudocodeLine: 2,
      message: {
        en: `Partition slice [${low}..${high}]: select Lomuto pivot arr[${high}] = ${pivotValue}, set i = ${i}.`,
        vi: `Phân hoạch đoạn [${low}..${high}]: chọn pivot Lomuto arr[${high}] = ${pivotValue}, đặt i = ${i}.`,
      },
    });

    for (let j = low; j < high; j += 1) {
      comparisons += 1;
      const valJ = arr[j]!;
      const shouldSwap = valJ <= pivotValue;

      steps.push({
        stepIndex: steps.length,
        phase: 'compare',
        array: [...arr],
        activeRange: [low, high],
        pivotIndex: high,
        pivotValue,
        iPointer: i,
        jPointer: j,
        swapPair: null,
        sortedIndices: snapshotSorted(),
        recursionDepth: depth,
        comparisons,
        swaps,
        pseudocodeLine: 4,
        message: shouldSwap
          ? {
              en: `Compare arr[${j}]=${valJ} <= pivot ${pivotValue}: advance boundary i to ${i + 1}.`,
              vi: `So sánh arr[${j}]=${valJ} <= pivot ${pivotValue}: tăng biên nhỏ hơn i lên ${i + 1}.`,
            }
          : {
              en: `Compare arr[${j}]=${valJ} > pivot ${pivotValue}: keep right of boundary.`,
              vi: `So sánh arr[${j}]=${valJ} > pivot ${pivotValue}: giữ bên phải biên phân hoạch.`,
            },
      });

      if (shouldSwap) {
        i += 1;
        if (i !== j) {
          const tmp = arr[i]!;
          arr[i] = arr[j]!;
          arr[j] = tmp;
          swaps += 1;
          steps.push({
            stepIndex: steps.length,
            phase: 'swap',
            array: [...arr],
            activeRange: [low, high],
            pivotIndex: high,
            pivotValue,
            iPointer: i,
            jPointer: j,
            swapPair: [i, j],
            sortedIndices: snapshotSorted(),
            recursionDepth: depth,
            comparisons,
            swaps,
            pseudocodeLine: 5,
            message: {
              en: `Swap arr[${i}] and arr[${j}] to move ${valJ} into the <= pivot partition.`,
              vi: `Hoán đổi arr[${i}] và arr[${j}] để đưa ${valJ} vào vùng <= pivot.`,
            },
          });
        }
      }
    }

    const pivotFinal = i + 1;
    if (pivotFinal !== high) {
      const tmp = arr[pivotFinal]!;
      arr[pivotFinal] = arr[high]!;
      arr[high] = tmp;
      swaps += 1;
    }
    sortedSet.add(pivotFinal);

    steps.push({
      stepIndex: steps.length,
      phase: 'place-pivot',
      array: [...arr],
      activeRange: [low, high],
      pivotIndex: pivotFinal,
      pivotValue,
      iPointer: i,
      jPointer: null,
      swapPair: pivotFinal !== high ? [pivotFinal, high] : null,
      sortedIndices: snapshotSorted(),
      recursionDepth: depth,
      comparisons,
      swaps,
      pseudocodeLine: 6,
      message: {
        en: `Place pivot ${pivotValue} at final index ${pivotFinal}. Elements left are <= ${pivotValue}, right are > ${pivotValue}.`,
        vi: `Cố định pivot ${pivotValue} tại vị trí cuối ${pivotFinal}. Bên trái <= ${pivotValue}, bên phải > ${pivotValue}.`,
      },
    });

    sort(low, pivotFinal - 1, depth + 1);
    sort(pivotFinal + 1, high, depth + 1);
  }

  if (arr.length > 0) {
    sort(0, arr.length - 1, 1);
  }

  for (let idx = 0; idx < arr.length; idx += 1) {
    sortedSet.add(idx);
  }

  steps.push({
    stepIndex: steps.length,
    phase: 'complete',
    array: [...arr],
    activeRange: null,
    pivotIndex: null,
    pivotValue: null,
    iPointer: null,
    jPointer: null,
    swapPair: null,
    sortedIndices: snapshotSorted(),
    recursionDepth: 0,
    comparisons,
    swaps,
    pseudocodeLine: 7,
    message: {
      en: `QuickSort complete! Sorted ${arr.length} elements using ${comparisons} comparisons and ${swaps} swaps.`,
      vi: `Hoàn tất QuickSort! Đã sắp xếp ${arr.length} phần tử với ${comparisons} phép so sánh và ${swaps} lần hoán đổi.`,
    },
  });

  return {
    algorithm: 'quicksort-lomuto',
    initialArray: [...inputArray],
    sortedArray: [...arr],
    totalComparisons: comparisons,
    totalSwaps: swaps,
    complexity: { time: 'O(n log n) avg / O(n²) worst', space: 'O(log n) stack' },
    pseudocode: QUICKSORT_PSEUDOCODE,
    steps,
  };
}

// ============================================================================
// 3. DIJKSTRA SHORTEST PATH — Interactive 7-Node Weighted SVG Graph
// ============================================================================

export interface GraphNode {
  id: string;
  label: string;
  role: BilingualText;
  x: number;
  y: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  weight: number;
}

export interface WeightedGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface PriorityQueueEntry {
  node: string;
  dist: number;
}

export type DijkstraPhase =
  | 'init'
  | 'pop-min'
  | 'relax-check'
  | 'relax-update'
  | 'complete';

export interface DijkstraStep {
  stepIndex: number;
  phase: DijkstraPhase;
  sourceId: string;
  targetId: string;
  currentNode: string | null;
  activeEdge: [string, string] | null;
  visitedNodes: string[];
  distances: Record<string, number | null>;
  previous: Record<string, string | null>;
  priorityQueue: PriorityQueueEntry[];
  shortestPathNodes: string[];
  shortestPathEdges: Array<[string, string]>;
  comparisons: number;
  relaxations: number;
  pseudocodeLine: number;
  message: BilingualText;
}

export interface DijkstraTrace {
  algorithm: 'dijkstra';
  graph: WeightedGraph;
  sourceId: string;
  targetId: string;
  finalDistances: Record<string, number | null>;
  finalPrevious: Record<string, string | null>;
  shortestPathNodes: string[];
  shortestPathEdges: Array<[string, string]>;
  shortestDistance: number | null;
  totalComparisons: number;
  totalRelaxations: number;
  complexity: { time: string; space: string };
  pseudocode: string[];
  steps: DijkstraStep[];
}

/**
 * 7-node weighted engineering service mesh designed so greedy hops lose
 * and Dijkstra demonstrates 5 explicit edge relaxations (A->C->B->D->F->G = 13).
 */
export const DEFAULT_DIJKSTRA_GRAPH: WeightedGraph = {
  nodes: [
    { id: 'A', label: 'A', role: { en: 'API Gateway', vi: 'Cổng API' }, x: 82, y: 175 },
    { id: 'B', label: 'B', role: { en: 'Auth Mesh', vi: 'Xác Thực' }, x: 225, y: 68 },
    { id: 'C', label: 'C', role: { en: 'Redis Edge', vi: 'Bộ Đệm Edge' }, x: 225, y: 282 },
    { id: 'D', label: 'D', role: { en: 'Core Router', vi: 'Bộ Định Tuyến' }, x: 400, y: 175 },
    { id: 'E', label: 'E', role: { en: 'Vector Shard', vi: 'Shard Vector' }, x: 575, y: 68 },
    { id: 'F', label: 'F', role: { en: 'SQL Replica', vi: 'Bản Sao SQL' }, x: 575, y: 282 },
    { id: 'G', label: 'G', role: { en: 'Ledger Sink', vi: 'Sổ Cái Đích' }, x: 718, y: 175 },
  ],
  edges: [
    { from: 'A', to: 'B', weight: 4 },
    { from: 'A', to: 'C', weight: 2 },
    { from: 'B', to: 'C', weight: 1 },
    { from: 'B', to: 'D', weight: 5 },
    { from: 'B', to: 'E', weight: 10 },
    { from: 'C', to: 'D', weight: 8 },
    { from: 'C', to: 'F', weight: 12 },
    { from: 'D', to: 'E', weight: 2 },
    { from: 'D', to: 'F', weight: 3 },
    { from: 'E', to: 'G', weight: 6 },
    { from: 'F', to: 'G', weight: 2 },
  ],
};

const DIJKSTRA_PSEUDOCODE: string[] = [
  'dist[*] = Infinity; dist[source] = 0',
  'pq.push((0, source))',
  'while pq is not empty:',
  '  (d, u) = pq.popMin(); if u in visited: continue',
  '  visited.add(u)',
  '  for (v, weight) in adj[u]:',
  '    if d + weight < dist[v]: dist[v] = d + weight; prev[v] = u; pq.push',
  'reconstructPath(prev, source, target)',
];

export function reconstructShortestPath(
  previous: Record<string, string | null>,
  sourceId: string,
  targetId: string,
): { nodes: string[]; edges: Array<[string, string]> } {
  if (sourceId === targetId) {
    return { nodes: [sourceId], edges: [] };
  }
  const nodes: string[] = [];
  let cursor: string | null = targetId;
  const guard = new Set<string>();

  while (cursor !== null) {
    if (guard.has(cursor)) break;
    guard.add(cursor);
    nodes.push(cursor);
    if (cursor === sourceId) break;
    cursor = previous[cursor] ?? null;
  }

  if (nodes[nodes.length - 1] !== sourceId) {
    return { nodes: [], edges: [] };
  }

  nodes.reverse();
  const edges: Array<[string, string]> = [];
  for (let i = 0; i < nodes.length - 1; i += 1) {
    edges.push([nodes[i]!, nodes[i + 1]!]);
  }
  return { nodes, edges };
}

function normalizeQueue(pq: PriorityQueueEntry[]): PriorityQueueEntry[] {
  return [...pq]
    .sort((a, b) => (a.dist !== b.dist ? a.dist - b.dist : a.node.localeCompare(b.node)))
    .map((entry) => ({ ...entry }));
}

export function generateDijkstraTrace(
  graph: WeightedGraph = DEFAULT_DIJKSTRA_GRAPH,
  sourceId: string = 'A',
  targetId: string = 'G',
): DijkstraTrace {
  const adjacency = new Map<string, Array<{ to: string; weight: number }>>();
  const distances: Record<string, number | null> = {};
  const previous: Record<string, string | null> = {};

  for (const node of graph.nodes) {
    adjacency.set(node.id, []);
    distances[node.id] = node.id === sourceId ? 0 : null;
    previous[node.id] = null;
  }

  for (const edge of graph.edges) {
    adjacency.get(edge.from)?.push({ to: edge.to, weight: edge.weight });
    adjacency.get(edge.to)?.push({ to: edge.from, weight: edge.weight });
  }

  for (const list of adjacency.values()) {
    list.sort((a, b) => a.to.localeCompare(b.to));
  }

  const visited = new Set<string>();
  const pq: PriorityQueueEntry[] = [{ node: sourceId, dist: 0 }];
  const steps: DijkstraStep[] = [];
  let comparisons = 0;
  let relaxations = 0;

  const snapshot = (
    phase: DijkstraPhase,
    currentNode: string | null,
    activeEdge: [string, string] | null,
    pseudocodeLine: number,
    message: BilingualText,
    includePath: boolean,
  ) => {
    const path = includePath
      ? reconstructShortestPath(previous, sourceId, targetId)
      : { nodes: [], edges: [] };
    steps.push({
      stepIndex: steps.length,
      phase,
      sourceId,
      targetId,
      currentNode,
      activeEdge,
      visitedNodes: Array.from(visited),
      distances: { ...distances },
      previous: { ...previous },
      priorityQueue: normalizeQueue(pq),
      shortestPathNodes: path.nodes,
      shortestPathEdges: path.edges,
      comparisons,
      relaxations,
      pseudocodeLine,
      message,
    });
  };

  snapshot(
    'init',
    sourceId,
    null,
    0,
    {
      en: `Initialize dist[${sourceId}]=0, all other nodes Infinity. Seed Min-Heap PQ with (${sourceId}, 0).`,
      vi: `Khởi tạo dist[${sourceId}]=0, các đỉnh còn lại bằng vô cực. Đưa (${sourceId}, 0) vào hàng đợi ưu tiên.`,
    },
    false,
  );

  while (pq.length > 0) {
    pq.sort((a, b) => (a.dist !== b.dist ? a.dist - b.dist : a.node.localeCompare(b.node)));
    const popped = pq.shift()!;

    if (visited.has(popped.node)) {
      continue;
    }

    visited.add(popped.node);
    snapshot(
      'pop-min',
      popped.node,
      null,
      3,
      {
        en: `Pop minimum node ${popped.node} (dist=${popped.dist}) from priority queue and settle it.`,
        vi: `Lấy đỉnh có chi phí nhỏ nhất ${popped.node} (dist=${popped.dist}) từ Min-Heap và chốt khoảng cách.`,
      },
      false,
    );

    const neighbors = adjacency.get(popped.node) ?? [];
    for (const neighbor of neighbors) {
      if (visited.has(neighbor.to)) continue;
      comparisons += 1;
      const candidate = popped.dist + neighbor.weight;
      const currentDist = distances[neighbor.to] ?? null;

      if (currentDist === null || candidate < currentDist) {
        const oldLabel = currentDist === null ? 'INF' : String(currentDist);
        distances[neighbor.to] = candidate;
        previous[neighbor.to] = popped.node;
        relaxations += 1;
        // Replace any stale entry in displayed queue or insert updated priority
        const existingIdx = pq.findIndex((item) => item.node === neighbor.to);
        if (existingIdx >= 0) {
          pq[existingIdx] = { node: neighbor.to, dist: candidate };
        } else {
          pq.push({ node: neighbor.to, dist: candidate });
        }

        snapshot(
          'relax-update',
          popped.node,
          [popped.node, neighbor.to],
          6,
          {
            en: `Relax edge ${popped.node} -> ${neighbor.to} (w=${neighbor.weight}): ${candidate} < ${oldLabel}. Update dist[${neighbor.to}]=${candidate}.`,
            vi: `Nới lỏng cạnh ${popped.node} -> ${neighbor.to} (w=${neighbor.weight}): ${candidate} < ${oldLabel}. Cập nhật dist[${neighbor.to}]=${candidate}.`,
          },
          false,
        );
      } else {
        snapshot(
          'relax-check',
          popped.node,
          [popped.node, neighbor.to],
          5,
          {
            en: `Check edge ${popped.node} -> ${neighbor.to} (w=${neighbor.weight}): candidate ${candidate} >= current ${currentDist}. Keep existing path.`,
            vi: `Kiểm tra cạnh ${popped.node} -> ${neighbor.to} (w=${neighbor.weight}): ${candidate} >= ${currentDist}. Giữ nguyên đường cũ.`,
          },
          false,
        );
      }
    }
  }

  const finalPath = reconstructShortestPath(previous, sourceId, targetId);
  const shortestDistance = distances[targetId] ?? null;

  snapshot(
    'complete',
    targetId,
    null,
    7,
    shortestDistance !== null
      ? {
          en: `Optimal path ${finalPath.nodes.join(' -> ')} locked at total latency ${shortestDistance}ms (${relaxations} relaxations).`,
          vi: `Chốt đường đi ngắn nhất ${finalPath.nodes.join(' -> ')} với tổng chi phí ${shortestDistance}ms (${relaxations} lần nới lỏng).`,
        }
      : {
          en: `Node ${targetId} is unreachable from ${sourceId}.`,
          vi: `Đỉnh ${targetId} không thể đi tới từ ${sourceId}.`,
        },
    true,
  );

  return {
    algorithm: 'dijkstra',
    graph,
    sourceId,
    targetId,
    finalDistances: { ...distances },
    finalPrevious: { ...previous },
    shortestPathNodes: finalPath.nodes,
    shortestPathEdges: finalPath.edges,
    shortestDistance,
    totalComparisons: comparisons,
    totalRelaxations: relaxations,
    complexity: { time: 'O((V + E) log V)', space: 'O(V + E)' },
    pseudocode: DIJKSTRA_PSEUDOCODE,
    steps,
  };
}
