import { describe, expect, it } from 'vitest';
import {
  BINARY_SEARCH_PRESETS,
  DEFAULT_BINARY_SEARCH_ARRAY,
  DEFAULT_DIJKSTRA_GRAPH,
  DEFAULT_QUICKSORT_ARRAY,
  QUICKSORT_PRESETS,
  generateBinarySearchTrace,
  generateDijkstraTrace,
  generateQuickSortTrace,
  reconstructShortestPath,
  type WeightedGraph,
} from './algoVisualizerEngine';

describe('Binary Search Step-Through Trace Engine', () => {
  it('locates a target in the right half within O(log n) comparisons', () => {
    const trace = generateBinarySearchTrace(DEFAULT_BINARY_SEARCH_ARRAY, 68);
    expect(trace.foundIndex).toBe(7);
    expect(trace.array[trace.foundIndex!]).toBe(68);
    expect(trace.totalComparisons).toBeLessThanOrEqual(Math.ceil(Math.log2(trace.array.length)) + 1);
    expect(trace.totalSwaps).toBe(0);
    expect(trace.steps[trace.steps.length - 1]?.phase).toBe('found');
  });

  it('locates the first element (index 0) and last element (index n-1)', () => {
    const first = generateBinarySearchTrace(DEFAULT_BINARY_SEARCH_ARRAY, 4);
    expect(first.foundIndex).toBe(0);
    expect(first.steps[first.steps.length - 1]?.foundIndex).toBe(0);

    const last = generateBinarySearchTrace(DEFAULT_BINARY_SEARCH_ARRAY, 118);
    expect(last.foundIndex).toBe(DEFAULT_BINARY_SEARCH_ARRAY.length - 1);
  });

  it('locates the exact initial midpoint in a single comparison', () => {
    const trace = generateBinarySearchTrace([10, 20, 30, 40, 50], 30);
    expect(trace.foundIndex).toBe(2);
    expect(trace.totalComparisons).toBe(1);
  });

  it('reports not-found when target falls in a gap, below min, or above max', () => {
    for (const missing of [-10, 50, 999]) {
      const trace = generateBinarySearchTrace(DEFAULT_BINARY_SEARCH_ARRAY, missing);
      expect(trace.foundIndex).toBeNull();
      const last = trace.steps[trace.steps.length - 1]!;
      expect(last.phase).toBe('not-found');
      expect(last.eliminatedIndices).toHaveLength(DEFAULT_BINARY_SEARCH_ARRAY.length);
    }
  });

  it('sorts unsorted input defensively and preserves low <= mid <= high invariant during probes', () => {
    const trace = generateBinarySearchTrace([90, 10, 50, 30, 70], 70);
    expect(trace.array).toEqual([10, 30, 50, 70, 90]);
    expect(trace.foundIndex).toBe(3);

    const compareSteps = trace.steps.filter((s) => s.phase === 'compare');
    expect(compareSteps.length).toBeGreaterThan(0);
    for (const step of compareSteps) {
      expect(step.mid).not.toBeNull();
      expect(step.low).toBeLessThanOrEqual(step.mid!);
      expect(step.mid!).toBeLessThanOrEqual(step.high);
    }
  });

  it('handles empty array gracefully without throwing', () => {
    const trace = generateBinarySearchTrace([], 42);
    expect(trace.foundIndex).toBeNull();
    expect(trace.totalComparisons).toBe(0);
    expect(trace.steps[trace.steps.length - 1]?.phase).toBe('not-found');
  });

  it('maintains monotonically increasing comparison counts and step indices across all presets', () => {
    for (const preset of BINARY_SEARCH_PRESETS) {
      const trace = generateBinarySearchTrace(preset.array, preset.target);
      for (let i = 0; i < trace.steps.length; i += 1) {
        expect(trace.steps[i]?.stepIndex).toBe(i);
        if (i > 0) {
          expect(trace.steps[i]!.comparisons).toBeGreaterThanOrEqual(trace.steps[i - 1]!.comparisons);
        }
      }
    }
  });
});

describe('QuickSort Lomuto Partition Step-Through Engine', () => {
  it('sorts the default 9-element array cleanly and locks all sorted indices at completion', () => {
    const trace = generateQuickSortTrace(DEFAULT_QUICKSORT_ARRAY);
    const expected = [...DEFAULT_QUICKSORT_ARRAY].sort((a, b) => a - b);
    expect(trace.sortedArray).toEqual(expected);
    expect(trace.totalComparisons).toBeGreaterThan(0);
    expect(trace.totalSwaps).toBeGreaterThan(0);

    const last = trace.steps[trace.steps.length - 1]!;
    expect(last.phase).toBe('complete');
    expect(last.array).toEqual(expected);
    expect(last.sortedIndices).toEqual(expected.map((_, idx) => idx));
  });

  it('preserves multiset elements including duplicate values across all presets', () => {
    for (const preset of QUICKSORT_PRESETS) {
      const trace = generateQuickSortTrace(preset.array);
      expect(trace.sortedArray).toEqual([...preset.array].sort((a, b) => a - b));
      expect(trace.sortedArray).toHaveLength(preset.array.length);
    }
  });

  it('emits valid swapPair coordinates on swap phases and preserves Lomuto pivot partition invariant', () => {
    const trace = generateQuickSortTrace(DEFAULT_QUICKSORT_ARRAY);
    const swapSteps = trace.steps.filter((s) => s.phase === 'swap');
    expect(swapSteps.length).toBeGreaterThan(0);
    for (const step of swapSteps) {
      expect(step.swapPair).not.toBeNull();
      const [a, b] = step.swapPair!;
      expect(a).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(step.array.length);
      expect(a).not.toBe(b);
    }

    const pivotPlacements = trace.steps.filter((s) => s.phase === 'place-pivot');
    expect(pivotPlacements.length).toBeGreaterThan(0);
    for (const step of pivotPlacements) {
      const [low, high] = step.activeRange!;
      const p = step.pivotIndex!;
      const pivotVal = step.array[p]!;
      for (let left = low; left < p; left += 1) {
        expect(step.array[left]!).toBeLessThanOrEqual(pivotVal);
      }
      for (let right = p + 1; right <= high; right += 1) {
        expect(step.array[right]!).toBeGreaterThan(pivotVal);
      }
      expect(step.sortedIndices).toContain(p);
    }
  });

  it('handles already-sorted input with zero unnecessary element swaps', () => {
    const trace = generateQuickSortTrace([5, 10, 15, 20, 25]);
    expect(trace.sortedArray).toEqual([5, 10, 15, 20, 25]);
    expect(trace.totalSwaps).toBe(0);
    expect(trace.totalComparisons).toBe(10); // 4 + 3 + 2 + 1 in Lomuto worst-case sorted input
  });

  it('handles reverse-sorted input deterministically', () => {
    const trace = generateQuickSortTrace([50, 40, 30, 20, 10]);
    expect(trace.sortedArray).toEqual([10, 20, 30, 40, 50]);
    expect(trace.totalSwaps).toBeGreaterThan(0);
  });

  it('handles empty and single-element arrays cleanly', () => {
    const emptyTrace = generateQuickSortTrace([]);
    expect(emptyTrace.sortedArray).toEqual([]);
    expect(emptyTrace.totalComparisons).toBe(0);
    expect(emptyTrace.totalSwaps).toBe(0);

    const singleTrace = generateQuickSortTrace([77]);
    expect(singleTrace.sortedArray).toEqual([77]);
    expect(singleTrace.totalComparisons).toBe(0);
    expect(singleTrace.totalSwaps).toBe(0);
    expect(singleTrace.steps[singleTrace.steps.length - 1]?.sortedIndices).toEqual([0]);
  });

  it('records monotonically non-decreasing comparisons and swaps on every step', () => {
    const trace = generateQuickSortTrace(DEFAULT_QUICKSORT_ARRAY);
    for (let i = 1; i < trace.steps.length; i += 1) {
      expect(trace.steps[i]!.comparisons).toBeGreaterThanOrEqual(trace.steps[i - 1]!.comparisons);
      expect(trace.steps[i]!.swaps).toBeGreaterThanOrEqual(trace.steps[i - 1]!.swaps);
      expect(trace.steps[i]!.sortedIndices.length).toBeGreaterThanOrEqual(
        trace.steps[i - 1]!.sortedIndices.length,
      );
    }
  });
});

describe('Dijkstra 7-Node Weighted Graph Shortest-Path Engine', () => {
  it('ships a valid 7-node connected weighted graph with strictly positive edge weights', () => {
    expect(DEFAULT_DIJKSTRA_GRAPH.nodes).toHaveLength(7);
    expect(DEFAULT_DIJKSTRA_GRAPH.edges.length).toBeGreaterThanOrEqual(10);
    const nodeIds = new Set(DEFAULT_DIJKSTRA_GRAPH.nodes.map((n) => n.id));
    for (const edge of DEFAULT_DIJKSTRA_GRAPH.edges) {
      expect(nodeIds.has(edge.from)).toBe(true);
      expect(nodeIds.has(edge.to)).toBe(true);
      expect(edge.weight).toBeGreaterThan(0);
    }
  });

  it('computes exact optimal shortest distances from A to all 7 nodes', () => {
    const trace = generateDijkstraTrace(DEFAULT_DIJKSTRA_GRAPH, 'A', 'G');
    expect(trace.finalDistances).toEqual({
      A: 0,
      B: 3,
      C: 2,
      D: 8,
      E: 10,
      F: 11,
      G: 13,
    });
    expect(trace.shortestDistance).toBe(13);
    expect(trace.shortestPathNodes).toEqual(['A', 'C', 'B', 'D', 'F', 'G']);
    expect(trace.shortestPathEdges).toEqual([
      ['A', 'C'],
      ['C', 'B'],
      ['B', 'D'],
      ['D', 'F'],
      ['F', 'G'],
    ]);
  });

  it('demonstrates genuine edge relaxation updates where shorter indirect paths beat direct edges', () => {
    const trace = generateDijkstraTrace(DEFAULT_DIJKSTRA_GRAPH, 'A', 'G');
    const relaxEvents = trace.steps.filter((s) => s.phase === 'relax-update');
    // B relaxed via C (4 -> 3), D relaxed via B (10 -> 8), E via D (13 -> 10), F via D (14 -> 11), G via F (16 -> 13)
    expect(relaxEvents.some((s) => s.activeEdge?.[0] === 'C' && s.activeEdge?.[1] === 'B' && s.distances.B === 3)).toBe(true);
    expect(relaxEvents.some((s) => s.activeEdge?.[0] === 'B' && s.activeEdge?.[1] === 'D' && s.distances.D === 8)).toBe(true);
    expect(relaxEvents.some((s) => s.activeEdge?.[0] === 'D' && s.activeEdge?.[1] === 'F' && s.distances.F === 11)).toBe(true);
    expect(relaxEvents.some((s) => s.activeEdge?.[0] === 'F' && s.activeEdge?.[1] === 'G' && s.distances.G === 13)).toBe(true);
  });

  it('supports dynamic target selection (e.g. A -> E and A -> D)', () => {
    const traceE = generateDijkstraTrace(DEFAULT_DIJKSTRA_GRAPH, 'A', 'E');
    expect(traceE.shortestDistance).toBe(10);
    expect(traceE.shortestPathNodes).toEqual(['A', 'C', 'B', 'D', 'E']);

    const traceD = generateDijkstraTrace(DEFAULT_DIJKSTRA_GRAPH, 'A', 'D');
    expect(traceD.shortestDistance).toBe(8);
    expect(traceD.shortestPathNodes).toEqual(['A', 'C', 'B', 'D']);
  });

  it('keeps priority queue sorted in non-decreasing distance order at every step', () => {
    const trace = generateDijkstraTrace(DEFAULT_DIJKSTRA_GRAPH, 'A', 'G');
    for (const step of trace.steps) {
      for (let i = 1; i < step.priorityQueue.length; i += 1) {
        expect(step.priorityQueue[i]!.dist).toBeGreaterThanOrEqual(step.priorityQueue[i - 1]!.dist);
      }
    }
  });

  it('monotonically grows the visited node set until all reachable nodes are settled', () => {
    const trace = generateDijkstraTrace(DEFAULT_DIJKSTRA_GRAPH, 'A', 'G');
    for (let i = 1; i < trace.steps.length; i += 1) {
      expect(trace.steps[i]!.visitedNodes.length).toBeGreaterThanOrEqual(
        trace.steps[i - 1]!.visitedNodes.length,
      );
    }
    const last = trace.steps[trace.steps.length - 1]!;
    expect(last.phase).toBe('complete');
    expect(last.visitedNodes).toHaveLength(7);
  });

  it('handles unreachable target nodes cleanly when a graph is disconnected', () => {
    const disconnected: WeightedGraph = {
      nodes: [
        { id: 'A', label: 'A', role: { en: 'Src', vi: 'Nguồn' }, x: 50, y: 50 },
        { id: 'B', label: 'B', role: { en: 'Mid', vi: 'Giữa' }, x: 150, y: 50 },
        { id: 'Z', label: 'Z', role: { en: 'Isolated', vi: 'Cô lập' }, x: 250, y: 50 },
      ],
      edges: [{ from: 'A', to: 'B', weight: 3 }],
    };
    const trace = generateDijkstraTrace(disconnected, 'A', 'Z');
    expect(trace.finalDistances.B).toBe(3);
    expect(trace.finalDistances.Z).toBeNull();
    expect(trace.shortestDistance).toBeNull();
    expect(trace.shortestPathNodes).toEqual([]);
  });

  it('reconstructs trivial single-node path when source equals target', () => {
    const trivial = reconstructShortestPath({ A: null }, 'A', 'A');
    expect(trivial).toEqual({ nodes: ['A'], edges: [] });
  });
});
