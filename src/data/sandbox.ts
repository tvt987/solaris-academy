import type { CodingChallenge, FlashcardItem, QuizQuestion } from '../types/lms';

export const CODING_CHALLENGES: CodingChallenge[] = [
  {
    id: 'lab-dotnet-idempotency',
    courseId: 'dotnet-10',
    functionName: 'dedupeIdempotencyKeys',
    difficulty: 'advanced',
    xpReward: 150,
    title: {
      en: 'Idempotent Voucher Deduplicator',
      vi: 'Bộ Khử Trùng Lặp Voucher Idempotency',
    },
    prompt: {
      en: 'Given an array of incoming voucher redemption requests `{ key, amount }`, keep only the first request with a positive amount (`amount > 0`) for each unique `key`, preserving arrival order. Return `{ accepted, rejectedDuplicates, invalidCount, totalAmount }`.',
      vi: 'Cho mảng yêu cầu đổi voucher `{ key, amount }`, chỉ chấp nhận yêu cầu đầu tiên có `amount > 0` cho mỗi `key` duy nhất (giữ đúng thứ tự đến). Trả về `{ accepted, rejectedDuplicates, invalidCount, totalAmount }`.',
    },
    signature: 'function dedupeIdempotencyKeys(requests)',
    starterCode: `function dedupeIdempotencyKeys(requests) {
  const seen = new Set();
  const accepted = [];
  let rejectedDuplicates = 0;
  let invalidCount = 0;
  let totalAmount = 0;

  // TODO: Filter invalid amounts (<= 0 or empty key) and reject duplicate keys
  for (const req of requests) {
    if (!req || !req.key || req.amount <= 0) {
      invalidCount += 1;
      continue;
    }
    if (seen.has(req.key)) {
      rejectedDuplicates += 1;
      continue;
    }
    seen.add(req.key);
    accepted.push(req);
    totalAmount += req.amount;
  }

  return { accepted, rejectedDuplicates, invalidCount, totalAmount };
}`,
    referenceSolution: `function dedupeIdempotencyKeys(requests) {
  const seen = new Set();
  const accepted = [];
  let rejectedDuplicates = 0;
  let invalidCount = 0;
  let totalAmount = 0;

  for (const req of requests) {
    if (!req || typeof req.key !== 'string' || req.key.trim() === '' || typeof req.amount !== 'number' || req.amount <= 0) {
      invalidCount += 1;
      continue;
    }
    if (seen.has(req.key)) {
      rejectedDuplicates += 1;
      continue;
    }
    seen.add(req.key);
    accepted.push(req);
    totalAmount += req.amount;
  }

  return { accepted, rejectedDuplicates, invalidCount, totalAmount };
}`,
    hints: [
      {
        en: 'Validate `req.key` (non-empty string) and `req.amount > 0` BEFORE inserting into the `seen` Set so an invalid retry never blocks a valid key.',
        vi: 'Kiểm tra `req.key` khác rỗng và `req.amount > 0` TRƯỚC khi đưa vào `Set` để yêu cầu lỗi không chặn nhầm khóa hợp lệ.',
      },
      {
        en: 'Track `rejectedDuplicates` only when a valid request arrives with a key already present in `seen`.',
        vi: 'Chỉ tăng `rejectedDuplicates` khi một yêu cầu hợp lệ mang `key` đã tồn tại trong `seen`.',
      },
    ],
    testCases: [
      {
        id: 'tc-idem-1',
        name: { en: 'Prevents concurrent double-spend retries', vi: 'Chặn yêu cầu lặp gây double-spend' },
        args: [
          [
            { key: 'VCH-01', amount: 150000 },
            { key: 'VCH-01', amount: 150000 },
            { key: 'VCH-02', amount: 50000 },
          ],
        ],
        expected: {
          accepted: [
            { key: 'VCH-01', amount: 150000 },
            { key: 'VCH-02', amount: 50000 },
          ],
          rejectedDuplicates: 1,
          invalidCount: 0,
          totalAmount: 200000,
        },
      },
      {
        id: 'tc-idem-2',
        name: { en: 'Invalid zero/negative payload does not poison valid key', vi: 'Dữ liệu âm/0 không làm hỏng khóa hợp lệ sau đó' },
        args: [
          [
            { key: 'VCH-09', amount: 0 },
            { key: 'VCH-09', amount: 90000 },
            { key: '', amount: 40000 },
            { key: 'VCH-09', amount: 90000 },
          ],
        ],
        expected: {
          accepted: [{ key: 'VCH-09', amount: 90000 }],
          rejectedDuplicates: 1,
          invalidCount: 2,
          totalAmount: 90000,
        },
      },
      {
        id: 'tc-idem-3',
        name: { en: 'Handles empty batch deterministically', vi: 'Xử lý mảng rỗng an toàn' },
        args: [[]],
        expected: {
          accepted: [],
          rejectedDuplicates: 0,
          invalidCount: 0,
          totalAmount: 0,
        },
      },
    ],
  },
  {
    id: 'lab-react-reconciler',
    courseId: 'react-19',
    functionName: 'diffVirtualNodes',
    difficulty: 'advanced',
    xpReward: 150,
    title: {
      en: 'Keyed Virtual DOM Reconciler Diff',
      vi: 'Thuật Toán Đối Chiếu Keyed Fiber Diff',
    },
    prompt: {
      en: 'Implement `diffVirtualNodes(prevKeys, nextKeys)` returning `{ mounted, kept, removed }`: keys newly introduced in `nextKeys`, keys preserved in both (in `nextKeys` order), and keys removed from `prevKeys` (in `prevKeys` order).',
      vi: 'Cài đặt `diffVirtualNodes(prevKeys, nextKeys)` trả về `{ mounted, kept, removed }`: các khóa mới trong `nextKeys`, khóa giữ lại (theo thứ tự `nextKeys`), và khóa bị gỡ bỏ (theo thứ tự `prevKeys`).',
    },
    signature: 'function diffVirtualNodes(prevKeys, nextKeys)',
    starterCode: `function diffVirtualNodes(prevKeys, nextKeys) {
  const prevSet = new Set(prevKeys);
  const nextSet = new Set(nextKeys);

  // Return { mounted, kept, removed } in deterministic order
  const mounted = [];
  const kept = [];
  const removed = [];

  for (const key of nextKeys) {
    if (prevSet.has(key)) {
      kept.push(key);
    } else {
      mounted.push(key);
    }
  }

  for (const key of prevKeys) {
    if (!nextSet.has(key)) {
      removed.push(key);
    }
  }

  return { mounted, kept, removed };
}`,
    referenceSolution: `function diffVirtualNodes(prevKeys, nextKeys) {
  const prevSet = new Set(prevKeys);
  const nextSet = new Set(nextKeys);
  const mounted = nextKeys.filter((k) => !prevSet.has(k));
  const kept = nextKeys.filter((k) => prevSet.has(k));
  const removed = prevKeys.filter((k) => !nextSet.has(k));
  return { mounted, kept, removed };
}`,
    hints: [
      {
        en: 'Use two `Set` lookups so membership checks run in O(1), keeping the full reconciliation O(n + m).',
        vi: 'Dùng hai `Set` để kiểm tra tồn tại trong O(1), giữ tổng độ phức tạp đối chiếu là O(n + m).',
      },
      {
        en: 'Iterate `nextKeys` for `mounted` and `kept`, then iterate `prevKeys` for `removed` to preserve original order.',
        vi: 'Duyệt `nextKeys` để tách `mounted`/`kept`, sau đó duyệt `prevKeys` để gom `removed` đúng thứ tự.',
      },
    ],
    testCases: [
      {
        id: 'tc-diff-1',
        name: { en: 'Standard list reorder with insert and delete', vi: 'Đảo thứ tự kết hợp thêm và xóa phần tử' },
        args: [
          ['a', 'b', 'c', 'd'],
          ['c', 'a', 'e', 'f'],
        ],
        expected: {
          mounted: ['e', 'f'],
          kept: ['c', 'a'],
          removed: ['b', 'd'],
        },
      },
      {
        id: 'tc-diff-2',
        name: { en: 'Full unmount to empty list', vi: 'Gỡ bỏ toàn bộ danh sách' },
        args: [['k1', 'k2'], []],
        expected: {
          mounted: [],
          kept: [],
          removed: ['k1', 'k2'],
        },
      },
      {
        id: 'tc-diff-3',
        name: { en: 'Initial mount from empty tree', vi: 'Mount lần đầu từ cây rỗng' },
        args: [[], ['hero', 'catalog']],
        expected: {
          mounted: ['hero', 'catalog'],
          kept: [],
          removed: [],
        },
      },
    ],
  },
  {
    id: 'lab-rag-rrf',
    courseId: 'applied-rag',
    functionName: 'reciprocalRankFusion',
    difficulty: 'advanced',
    xpReward: 175,
    title: {
      en: 'Hybrid RAG Reciprocal Rank Fusion (RRF)',
      vi: 'Hợp Nhất Tìm Kiếm Lai RAG (RRF)',
    },
    prompt: {
      en: 'Fuse BM25 lexical rankings (`bm25Ids`) and dense vector rankings (`vectorIds`) using RRF: `score(doc) = sum(1 / (k + rank))` where `rank` is 1-based and default `k = 60`. Return top document IDs sorted by score descending (tie-break alphabetically by ID).',
      vi: 'Hợp nhất kết quả BM25 (`bm25Ids`) và tìm kiếm Vector (`vectorIds`) theo công thức RRF: `score(doc) = sum(1 / (k + rank))` với `rank` bắt đầu từ 1, mặc định `k = 60`. Trả về mảng ID sắp theo điểm giảm dần (hòa điểm thì xếp theo chữ cái ID).',
    },
    signature: 'function reciprocalRankFusion(bm25Ids, vectorIds, k = 60)',
    starterCode: `function reciprocalRankFusion(bm25Ids, vectorIds, k = 60) {
  const scores = new Map();

  // Compute RRF scores across both ranked lists (1-based rank)
  bm25Ids.forEach((id, idx) => {
    scores.set(id, (scores.get(id) || 0) + 1 / (k + idx + 1));
  });

  vectorIds.forEach((id, idx) => {
    scores.set(id, (scores.get(id) || 0) + 1 / (k + idx + 1));
  });

  return Array.from(scores.entries())
    .sort((a, b) => (b[1] !== a[1] ? b[1] - a[1] : a[0].localeCompare(b[0])))
    .map(([id]) => id);
}`,
    referenceSolution: `function reciprocalRankFusion(bm25Ids, vectorIds, k = 60) {
  const scores = new Map();
  const addList = (list) => {
    for (let i = 0; i < list.length; i += 1) {
      const docId = list[i];
      scores.set(docId, (scores.get(docId) || 0) + 1 / (k + i + 1));
    }
  };
  addList(bm25Ids);
  addList(vectorIds);
  return Array.from(scores.entries())
    .sort((a, b) => (Math.abs(b[1] - a[1]) > 1e-12 ? b[1] - a[1] : a[0].localeCompare(b[0])))
    .map(([id]) => id);
}`,
    hints: [
      {
        en: 'Remember ranks are 1-indexed (`idx + 1`), so the top hit gets `1 / (k + 1)`.',
        vi: 'Thứ hạng bắt đầu từ 1 (`idx + 1`), nên kết quả hạng nhất nhận `1 / (k + 1)`.',
      },
      {
        en: 'Documents appearing in BOTH BM25 and Vector lists accumulate contributions from both sources, naturally outranking single-source hits.',
        vi: 'Tài liệu xuất hiện ở CẢ hai danh sách sẽ được cộng dồn điểm, tự động vươn lên đầu bảng.',
      },
    ],
    testCases: [
      {
        id: 'tc-rrf-1',
        name: { en: 'Promotes consensus hit present in both retrievers', vi: 'Đẩy tài liệu đồng thuận ở cả hai bộ truy hồi lên top' },
        args: [
          ['doc-a', 'doc-b', 'doc-c'],
          ['doc-c', 'doc-d', 'doc-b'],
          60,
        ],
        expected: ['doc-c', 'doc-b', 'doc-a', 'doc-d'],
      },
      {
        id: 'tc-rrf-2',
        name: { en: 'Deterministic alphabetical tie-break on equal RRF score', vi: 'Phá vỡ hòa điểm nhất quán theo thứ tự chữ cái' },
        args: [['doc-z'], ['doc-a'], 60],
        expected: ['doc-a', 'doc-z'],
      },
      {
        id: 'tc-rrf-3',
        name: { en: 'Works when one retriever returns empty', vi: 'Hoạt động ổn định khi một nguồn rỗng' },
        args: [[], ['vec-1', 'vec-2'], 60],
        expected: ['vec-1', 'vec-2'],
      },
    ],
  },
  {
    id: 'lab-sd-token-bucket',
    courseId: 'system-design-10k',
    functionName: 'simulateTokenBucket',
    difficulty: 'architect',
    xpReward: 175,
    title: {
      en: 'Token Bucket Rate Limiter Simulator',
      vi: 'Bộ Mô Phỏng Rate Limiter Token Bucket',
    },
    prompt: {
      en: 'Simulate a Token Bucket starting full at `capacity` tokens at time `0`. Given ascending request timestamps in seconds `timestamps`, `capacity`, and `refillPerSec`, refill `elapsed * refillPerSec` (capped at `capacity`) on each request. Allow if `tokens >= 1` (consuming 1 token), else deny. Return boolean array.',
      vi: 'Mô phỏng Token Bucket khởi đầu đầy `capacity` token tại giây `0`. Với mảng mốc thời gian tăng dần `timestamps`, `capacity`, và `refillPerSec`: nạp thêm `elapsed * refillPerSec` (tối đa `capacity`) ở mỗi request. Cho phép nếu `tokens >= 1` (trừ 1 token), ngược lại từ chối. Trả về mảng boolean.',
    },
    signature: 'function simulateTokenBucket(timestamps, capacity, refillPerSec)',
    starterCode: `function simulateTokenBucket(timestamps, capacity, refillPerSec) {
  let tokens = capacity;
  let lastTs = 0;
  const decisions = [];

  for (const ts of timestamps) {
    const elapsed = Math.max(0, ts - lastTs);
    tokens = Math.min(capacity, tokens + elapsed * refillPerSec);
    lastTs = ts;

    if (tokens >= 1) {
      tokens -= 1;
      decisions.push(true);
    } else {
      decisions.push(false);
    }
  }

  return decisions;
}`,
    referenceSolution: `function simulateTokenBucket(timestamps, capacity, refillPerSec) {
  let tokens = capacity;
  let lastTs = 0;
  return timestamps.map((ts) => {
    const elapsed = Math.max(0, ts - lastTs);
    tokens = Math.min(capacity, tokens + elapsed * refillPerSec);
    lastTs = ts;
    if (tokens + 1e-9 >= 1) {
      tokens = Math.max(0, tokens - 1);
      return true;
    }
    return false;
  });
}`,
    hints: [
      {
        en: 'Cap refilled tokens with `Math.min(capacity, tokens + elapsed * refillPerSec)` before checking `tokens >= 1`.',
        vi: 'Giới hạn trần bằng `Math.min(capacity, tokens + elapsed * refillPerSec)` trước khi kiểm tra `tokens >= 1`.',
      },
      {
        en: 'Update `lastTs = ts` on EVERY request (whether allowed or denied) so elapsed time is never double-counted.',
        vi: 'Luôn cập nhật `lastTs = ts` ở MỌI request (dù cho phép hay từ chối) để không tính trùng thời gian nạp.',
      },
    ],
    testCases: [
      {
        id: 'tc-tb-1',
        name: { en: 'Absorbs burst up to capacity then throttles & refills', vi: 'Hấp thụ đợt burst theo dung lượng, chặn quá tải rồi phục hồi' },
        args: [[0, 0, 0, 0.5, 1.0], 2, 1],
        expected: [true, true, false, false, true],
      },
      {
        id: 'tc-tb-2',
        name: { en: 'Never overflows past capacity after long idle gap', vi: 'Không vượt quá trần capacity sau thời gian rảnh dài' },
        args: [[0, 100, 100, 100], 2, 5],
        expected: [true, true, true, false],
      },
      {
        id: 'tc-tb-3',
        name: { en: 'Empty traffic returns empty decisions', vi: 'Lưu lượng rỗng trả về mảng rỗng' },
        args: [[], 5, 2],
        expected: [],
      },
    ],
  },
  {
    id: 'lab-ts-validator',
    courseId: 'typescript-mastery',
    functionName: 'validateConfig',
    difficulty: 'intermediate',
    xpReward: 140,
    title: {
      en: 'Typed Service Configuration Parser',
      vi: 'Bộ Phân Tích & Kiểm Định Cấu Hình Dịch Vụ',
    },
    prompt: {
      en: 'Validate an untrusted service config object `{ port, retries, region }`. Rules: `port` integer 1024..65535 (coercible from numeric string), `retries` integer 0..5, `region` one of `"us-east" | "eu-west" | "ap-southeast"`. Return `{ ok, value, errors }` where `errors` lists failing field names in order `["port", "retries", "region"]`.',
      vi: 'Kiểm định đối tượng cấu hình `{ port, retries, region }`: `port` số nguyên 1024..65535 (cho phép ép kiểu từ chuỗi số), `retries` số nguyên 0..5, `region` thuộc `"us-east" | "eu-west" | "ap-southeast"`. Trả về `{ ok, value, errors }` với `errors` theo thứ tự `["port", "retries", "region"]`.',
    },
    signature: 'function validateConfig(input)',
    starterCode: `function validateConfig(input) {
  const errors = [];
  const allowedRegions = new Set(['us-east', 'eu-west', 'ap-southeast']);

  const portNum = Number(input?.port);
  if (!Number.isInteger(portNum) || portNum < 1024 || portNum > 65535) {
    errors.push('port');
  }

  const retriesNum = Number(input?.retries);
  if (input?.retries === '' || input?.retries === null || !Number.isInteger(retriesNum) || retriesNum < 0 || retriesNum > 5) {
    errors.push('retries');
  }

  const region = typeof input?.region === 'string' ? input.region.trim() : '';
  if (!allowedRegions.has(region)) {
    errors.push('region');
  }

  if (errors.length > 0) {
    return { ok: false, value: null, errors };
  }

  return {
    ok: true,
    value: { port: portNum, retries: retriesNum, region },
    errors: [],
  };
}`,
    referenceSolution: `function validateConfig(input) {
  const errors = [];
  const allowedRegions = new Set(['us-east', 'eu-west', 'ap-southeast']);
  const rawPort = input ? input.port : undefined;
  const portNum = typeof rawPort === 'boolean' || rawPort === '' || rawPort === null ? NaN : Number(rawPort);
  if (!Number.isInteger(portNum) || portNum < 1024 || portNum > 65535) errors.push('port');

  const rawRetries = input ? input.retries : undefined;
  const retriesNum = typeof rawRetries === 'boolean' || rawRetries === '' || rawRetries === null ? NaN : Number(rawRetries);
  if (!Number.isInteger(retriesNum) || retriesNum < 0 || retriesNum > 5) errors.push('retries');

  const region = typeof input?.region === 'string' ? input.region.trim() : '';
  if (!allowedRegions.has(region)) errors.push('region');

  if (errors.length > 0) return { ok: false, value: null, errors };
  return { ok: true, value: { port: portNum, retries: retriesNum, region }, errors: [] };
}`,
    hints: [
      {
        en: 'Guard against `Number("") === 0` and `Number(null) === 0` when checking numeric integers.',
        vi: 'Cẩn thận bẫy `Number("") === 0` và `Number(null) === 0` khi kiểm tra số nguyên.',
      },
      {
        en: 'Return `value: null` whenever `errors.length > 0` so callers never consume partially invalid configs.',
        vi: 'Luôn trả `value: null` khi có lỗi để caller không bao giờ dùng nhầm cấu hình lỗi một phần.',
      },
    ],
    testCases: [
      {
        id: 'tc-cfg-1',
        name: { en: 'Coerces valid string port and trims region', vi: 'Ép kiểu chuỗi port hợp lệ và chuẩn hóa region' },
        args: [{ port: '8080', retries: 3, region: ' ap-southeast ' }],
        expected: {
          ok: true,
          value: { port: 8080, retries: 3, region: 'ap-southeast' },
          errors: [],
        },
      },
      {
        id: 'tc-cfg-2',
        name: { en: 'Accumulates all invalid fields deterministically', vi: 'Gom đầy đủ các trường sai quy chuẩn' },
        args: [{ port: 80, retries: 9, region: 'mars-1' }],
        expected: {
          ok: false,
          value: null,
          errors: ['port', 'retries', 'region'],
        },
      },
      {
        id: 'tc-cfg-3',
        name: { en: 'Rejects empty string retries (prevents Number("") === 0 bug)', vi: 'Chặn chuỗi rỗng cho retries (tránh bẫy Number("") === 0)' },
        args: [{ port: 3000, retries: '', region: 'us-east' }],
        expected: {
          ok: false,
          value: null,
          errors: ['retries'],
        },
      },
    ],
  },
  {
    id: 'lab-sql-keyset',
    courseId: 'sql-tuning',
    functionName: 'buildKeysetPage',
    difficulty: 'intermediate',
    xpReward: 150,
    title: {
      en: 'O(log N) Keyset Cursor Pagination Engine',
      vi: 'Bộ Phân Trang Keyset Cursor O(log N)',
    },
    prompt: {
      en: 'Given rows sorted ascending by numeric `id` (`{ id, title }[]`), an optional cursor `afterId` (`null` for first page), and `limit`, return `{ items, nextCursor, hasMore }` using the `limit + 1` probe technique so `hasMore` is exact.',
      vi: 'Cho mảng bản ghi đã sắp tăng dần theo `id` số (`{ id, title }[]`), con trỏ `afterId` (`null` cho trang đầu) và `limit`. Trả về `{ items, nextCursor, hasMore }` dùng kỹ thuật lấy `limit + 1` để xác định `hasMore` chính xác.',
    },
    signature: 'function buildKeysetPage(rows, afterId, limit)',
    starterCode: `function buildKeysetPage(rows, afterId, limit) {
  const filtered = afterId === null || afterId === undefined
    ? rows
    : rows.filter((row) => row.id > afterId);

  const probe = filtered.slice(0, limit + 1);
  const hasMore = probe.length > limit;
  const items = hasMore ? probe.slice(0, limit) : probe;
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

  return { items, nextCursor, hasMore };
}`,
    referenceSolution: `function buildKeysetPage(rows, afterId, limit) {
  const filtered = afterId === null || afterId === undefined
    ? rows
    : rows.filter((row) => row.id > afterId);
  const probe = filtered.slice(0, limit + 1);
  const hasMore = probe.length > limit;
  const items = hasMore ? probe.slice(0, limit) : probe;
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;
  return { items, nextCursor, hasMore };
}`,
    hints: [
      {
        en: 'Fetch `limit + 1` rows after `row.id > afterId`. If you got more than `limit`, `hasMore` is `true` and trim to `limit`.',
        vi: 'Lấy `limit + 1` dòng có `row.id > afterId`. Nếu số dòng vượt `limit` thì `hasMore = true` rồi cắt còn đúng `limit`.',
      },
      {
        en: 'When `hasMore` is `false`, `nextCursor` must be `null`.',
        vi: 'Khi `hasMore` là `false`, `nextCursor` phải trả về `null`.',
      },
    ],
    testCases: [
      {
        id: 'tc-ks-1',
        name: { en: 'First page emits exact nextCursor and hasMore=true', vi: 'Trang đầu trả đúng nextCursor và hasMore=true' },
        args: [
          [
            { id: 10, title: 'Order #10' },
            { id: 20, title: 'Order #20' },
            { id: 30, title: 'Order #30' },
          ],
          null,
          2,
        ],
        expected: {
          items: [
            { id: 10, title: 'Order #10' },
            { id: 20, title: 'Order #20' },
          ],
          nextCursor: 20,
          hasMore: true,
        },
      },
      {
        id: 'tc-ks-2',
        name: { en: 'Terminal page returns nextCursor=null and hasMore=false', vi: 'Trang cuối trả nextCursor=null và hasMore=false' },
        args: [
          [
            { id: 10, title: 'Order #10' },
            { id: 20, title: 'Order #20' },
            { id: 30, title: 'Order #30' },
          ],
          20,
          2,
        ],
        expected: {
          items: [{ id: 30, title: 'Order #30' }],
          nextCursor: null,
          hasMore: false,
        },
      },
      {
        id: 'tc-ks-3',
        name: { en: 'Exact boundary match does not emit phantom nextCursor', vi: 'Khớp đúng giới hạn cuối không tạo nextCursor ảo' },
        args: [
          [
            { id: 1, title: 'A' },
            { id: 2, title: 'B' },
          ],
          null,
          2,
        ],
        expected: {
          items: [
            { id: 1, title: 'A' },
            { id: 2, title: 'B' },
          ],
          nextCursor: null,
          hasMore: false,
        },
      },
    ],
  },
];

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q-dotnet-1',
    courseId: 'dotnet-10',
    topic: '.NET Concurrency',
    question: {
      en: 'Under 5,000 RPS read-heavy traffic in .NET 10, why does Dapper frequently outperform default EF Core tracking queries?',
      vi: 'Ở mức tải đọc 5.000 RPS trên .NET 10, vì sao Dapper thường vượt trội hơn truy vấn EF Core tracking mặc định?',
    },
    options: [
      {
        en: 'Dapper bypasses TCP socket pooling entirely.',
        vi: 'Dapper bỏ qua hoàn toàn cơ chế TCP socket pooling.',
      },
      {
        en: 'Dapper skips Change Tracker snapshot graph allocation and dynamic LINQ expression compilation on each call.',
        vi: 'Dapper loại bỏ cấp phát đồ thị snapshot Change Tracker và chi phí biên dịch cây biểu thức LINQ.',
      },
      {
        en: 'EF Core cannot execute parameterized SQL queries.',
        vi: 'EF Core không hỗ trợ chạy truy vấn SQL có tham số.',
      },
      {
        en: 'Dapper stores all rows permanently in CPU L1 cache.',
        vi: 'Dapper lưu vĩnh viễn toàn bộ bản ghi trong bộ nhớ đệm L1 của CPU.',
      },
    ],
    correctIndex: 1,
    explanation: {
      en: 'Eliminating Change Tracker entity snapshots dramatically lowers Gen-0/Gen-2 GC pressure and shaves milliseconds off p99 tail latency.',
      vi: 'Bỏ cấp phát snapshot trong Change Tracker giúp giảm mạnh áp lực dọn rác GC và kéo giảm độ trễ đuôi p99.',
    },
  },
  {
    id: 'q-dotnet-2',
    courseId: 'dotnet-10',
    topic: 'Idempotency',
    question: {
      en: 'What is the safest atomic mechanism to stop two simultaneous requests from redeeming the exact same single-use voucher?',
      vi: 'Cơ chế nguyên tử nào an toàn nhất để chặn hai request đồng thời đổi cùng một mã voucher chỉ dùng 1 lần?',
    },
    options: [
      {
        en: 'SELECT first in C#, wait 50ms, then run UPDATE.',
        vi: 'Chạy SELECT trong C#, đợi 50ms rồi mới chạy UPDATE.',
      },
      {
        en: 'Disable the submit button in CSS only.',
        vi: 'Chỉ vô hiệu hóa nút bấm trên giao diện bằng CSS.',
      },
      {
        en: 'Atomic conditional UPDATE (`WHERE Status = "UNUSED"`) or Redis Lua `SET NX EX` lock with unique idempotency key.',
        vi: 'UPDATE có điều kiện nguyên tử (`WHERE Status = "UNUSED"`) hoặc khóa Redis Lua `SET NX EX` theo khóa idempotency duy nhất.',
      },
      {
        en: 'Use `Math.random()` as a retry delay without locking.',
        vi: 'Dùng `Math.random()` để tạo độ trễ ngẫu nhiên mà không cần khóa.',
      },
    ],
    correctIndex: 2,
    explanation: {
      en: 'Check-then-act in application memory is vulnerable to race windows; atomic database predicates or Redis Lua enforce single-winner execution.',
      vi: 'Kiểm tra rồi mới ghi ở bộ nhớ ứng dụng luôn dính khe hở race condition; chỉ ràng buộc nguyên tử ở DB hoặc Redis Lua mới đảm bảo duy nhất một luồng thắng.',
    },
  },
  {
    id: 'q-react-1',
    courseId: 'react-19',
    topic: 'React 19 Transitions',
    question: {
      en: 'When filtering a 5,000-row data table on every keystroke, how does `startTransition` keep typing responsive?',
      vi: 'Khi lọc bảng 5.000 dòng theo từng phím gõ, `startTransition` giữ việc nhập liệu mượt mà bằng cách nào?',
    },
    options: [
      {
        en: 'It marks the heavy table update as lower-priority and interruptible so urgent input renders first.',
        vi: 'Đánh dấu cập nhật bảng là ưu tiên thấp và có thể ngắt quãng để luồng gõ phím khẩn cấp vẽ trước.',
      },
      {
        en: 'It moves React DOM rendering into a Web Worker automatically.',
        vi: 'Tự động đẩy toàn bộ luồng vẽ React DOM sang Web Worker.',
      },
      {
        en: 'It cancels all state updates permanently for 500ms.',
        vi: 'Hủy bỏ vĩnh viễn mọi cập nhật trạng thái trong 500ms.',
      },
      {
        en: 'It disables browser spellcheck and CSS transitions.',
        vi: 'Tắt kiểm tra chính tả trình duyệt và hiệu ứng CSS.',
      },
    ],
    correctIndex: 0,
    explanation: {
      en: 'React Fiber schedules transition updates on lower-priority lanes and yields back to the main thread whenever urgent user input arrives.',
      vi: 'React Fiber xếp các cập nhật transition vào làn ưu tiên thấp và nhường luồng chính ngay khi có thao tác nhập khẩn cấp.',
    },
  },
  {
    id: 'q-react-2',
    courseId: 'react-19',
    topic: 'Reconciliation',
    question: {
      en: 'Why can using array index as `key` break controlled inputs inside a reorderable list?',
      vi: 'Vì sao dùng chỉ số mảng (`index`) làm `key` làm hỏng trạng thái ô input trong danh sách có thể sắp xếp lại?',
    },
    options: [
      {
        en: 'React forbids numeric keys in strict mode.',
        vi: 'React cấm dùng khóa kiểu số trong chế độ strict mode.',
      },
      {
        en: 'Fiber matches instances by key position, causing state from item A to silently stick to item B after insertion/reordering.',
        vi: 'Fiber ghép thực thể theo vị trí khóa, khiến trạng thái của mục A bị gắn nhầm sang mục B sau khi chèn hoặc đảo vị trí.',
      },
      {
        en: 'Array indices allocate 10x more heap memory than strings.',
        vi: 'Chỉ số mảng tốn bộ nhớ heap gấp 10 lần chuỗi ký tự.',
      },
      {
        en: 'Browsers cannot serialize numeric attributes in HTML.',
        vi: 'Trình duyệt không thể xử lý thuộc tính dạng số trong HTML.',
      },
    ],
    correctIndex: 1,
    explanation: {
      en: 'Stable domain IDs anchor Fiber node identity to the logical entity rather than its transient array slot.',
      vi: 'ID nghiệp vụ ổn định giúp gắn chặt danh tính nút Fiber với thực thể dữ liệu thay vì vị trí tạm trong mảng.',
    },
  },
  {
    id: 'q-rag-1',
    courseId: 'applied-rag',
    topic: 'Hybrid Retrieval',
    question: {
      en: 'Why do production RAG pipelines pair BM25 lexical search with dense vector embeddings via RRF?',
      vi: 'Vì sao hệ thống RAG thực tế kết hợp tìm kiếm từ khóa BM25 với dense vector embeddings qua RRF?',
    },
    options: [
      {
        en: 'Dense vectors capture semantic paraphrases while BM25 preserves exact SKUs, error codes, and rare domain identifiers.',
        vi: 'Vector ngữ nghĩa bắt tốt câu diễn đạt đồng nghĩa còn BM25 giữ chính xác mã SKU, mã lỗi và định danh đặc thù.',
      },
      {
        en: 'BM25 replaces the need for an LLM entirely.',
        vi: 'BM25 thay thế hoàn toàn nhu cầu dùng mô hình LLM.',
      },
      {
        en: 'RRF compresses 1536-dim embeddings down to 2 bits.',
        vi: 'RRF nén vector 1536 chiều xuống còn 2 bit.',
      },
      {
        en: 'Vector databases refuse queries shorter than 10 words.',
        vi: 'Cơ sở dữ liệu vector từ chối truy vấn ngắn hơn 10 từ.',
      },
    ],
    correctIndex: 0,
    explanation: {
      en: 'RRF merges incompatible BM25 and cosine similarity score scales cleanly using only rank positions, boosting recall on both exact codes and conceptual queries.',
      vi: 'RRF dung hòa hai thang điểm khác nhau của BM25 và độ tương đồng cosine chỉ dựa trên thứ hạng, nâng cao độ phủ cho cả mã chính xác lẫn câu hỏi ngữ nghĩa.',
    },
  },
  {
    id: 'q-rag-2',
    courseId: 'applied-rag',
    topic: 'Cross-Encoder Reranking',
    question: {
      en: 'Why is a Cross-Encoder applied only to the top 30–50 retrieved candidates rather than the full 1M-document corpus?',
      vi: 'Vì sao Cross-Encoder chỉ được chạy trên top 30–50 ứng viên thay vì toàn bộ kho 1 triệu tài liệu?',
    },
    options: [
      {
        en: 'Cross-Encoders cannot process English text longer than 10 tokens.',
        vi: 'Cross-Encoder không đọc được đoạn văn dài quá 10 token.',
      },
      {
        en: 'Cross-Encoders compute full joint query-document attention at query time, making them highly accurate yet computationally O(N) per query.',
        vi: 'Cross-Encoder tính attention chéo giữa truy vấn và từng tài liệu lúc chạy, cực kỳ chính xác nhưng tốn chi phí tuyến tính O(N).',
      },
      {
        en: 'Bi-Encoders cannot compute embeddings offline.',
        vi: 'Bi-Encoder không thể tính trước embedding ở chế độ offline.',
      },
      {
        en: 'Cross-Encoders only sort alphabetically.',
        vi: 'Cross-Encoder chỉ sắp xếp theo thứ tự bảng chữ cái.',
      },
    ],
    correctIndex: 1,
    explanation: {
      en: 'Two-stage retrieval gets the best of both worlds: fast ANN/BM25 candidate recall followed by surgical Cross-Encoder re-scoring on a small candidate pool.',
      vi: 'Truy hồi hai tầng kết hợp ưu điểm cả hai: lọc nhanh tập ứng viên nhỏ bằng ANN/BM25 rồi chấm điểm tinh bằng Cross-Encoder.',
    },
  },
  {
    id: 'q-sd-1',
    courseId: 'system-design-10k',
    topic: 'Transactional Outbox',
    question: {
      en: 'What failure mode does the Transactional Outbox pattern solve when publishing events to Kafka after a SQL write?',
      vi: 'Mẫu thiết kế Transactional Outbox giải quyết rủi ro nào khi ghi SQL rồi phát sự kiện sang Kafka?',
    },
    options: [
      {
        en: 'SQL syntax errors during migrations.',
        vi: 'Lỗi cú pháp SQL trong quá trình chạy migration.',
      },
      {
        en: 'Dual-write split-brain where the DB commits successfully but the process crashes before Kafka receives the event.',
        vi: 'Lỗi ghi kép mất đồng bộ khi DB đã commit thành công nhưng tiến trình sập trước khi Kafka nhận được sự kiện.',
      },
      {
        en: 'SSL certificate expiration on load balancers.',
        vi: 'Hết hạn chứng chỉ SSL trên bộ cân bằng tải.',
      },
      {
        en: 'Browser CORS preflight latency.',
        vi: 'Độ trễ kiểm tra CORS preflight trên trình duyệt.',
      },
    ],
    correctIndex: 1,
    explanation: {
      en: 'Writing the domain entity and outbox row inside the exact same ACID transaction guarantees a relay worker/CDC can reliably publish at-least-once.',
      vi: 'Ghi dữ liệu nghiệp vụ và bản ghi outbox trong cùng một giao dịch ACID đảm bảo tiến trình relay/CDC luôn phát sự kiện tin cậy.',
    },
  },
  {
    id: 'q-sd-2',
    courseId: 'system-design-10k',
    topic: 'Cache Stampede',
    question: {
      en: 'A viral product key expires in Redis while 2,000 concurrent users request it. Which defense prevents database collapse?',
      vi: 'Một khóa sản phẩm đang hot vừa hết hạn trên Redis đúng lúc 2.000 người cùng truy cập. Kỹ thuật nào cứu DB khỏi sập?',
    },
    options: [
      {
        en: 'Remove TTL completely from all caches.',
        vi: 'Xóa bỏ hoàn toàn thời gian hết hạn TTL cho mọi cache.',
      },
      {
        en: 'Request coalescing (Singleflight) + jittered TTL / probabilistic early recomputation so only one leader queries the DB.',
        vi: 'Gộp truy vấn (Singleflight) kết hợp TTL có độ lệch ngẫu nhiên (jitter) để chỉ duy nhất một luồng gọi xuống DB.',
      },
      {
        en: 'Return HTTP 500 to all users for 10 minutes.',
        vi: 'Trả lỗi HTTP 500 cho toàn bộ người dùng trong 10 phút.',
      },
      {
        en: 'Store the database inside browser cookies.',
        vi: 'Lưu cơ sở dữ liệu vào cookie của trình duyệt.',
      },
    ],
    correctIndex: 1,
    explanation: {
      en: 'Singleflight collapses 2,000 identical cache misses into 1 upstream DB query and shares the freshly populated result with all waiting callers.',
      vi: 'Singleflight gộp 2.000 lượt cache miss giống hệt nhau thành duy nhất 1 truy vấn DB rồi chia sẻ kết quả cho mọi luồng đang chờ.',
    },
  },
  {
    id: 'q-ts-1',
    courseId: 'typescript-mastery',
    topic: 'Exhaustiveness',
    question: {
      en: 'What does assigning an unhandled union variant to `const _exhaustive: never = value` achieve?',
      vi: 'Việc gán nhánh chưa xử lý của union cho `const _exhaustive: never = value` mang lại lợi ích gì?',
    },
    options: [
      {
        en: 'It forces a compile-time error the moment a new variant is added to the union without updating the switch/if chain.',
        vi: 'Buộc trình biên dịch báo lỗi ngay lập tức khi có nhánh mới được thêm vào union mà chưa được xử lý trong switch/if.',
      },
      {
        en: 'It strips all runtime `if` statements during Vite bundling.',
        vi: 'Xóa bỏ toàn bộ lệnh `if` lúc đóng gói Vite.',
      },
      {
        en: 'It turns TypeScript into a dynamically typed language.',
        vi: 'Biến TypeScript thành ngôn ngữ kiểu động.',
      },
      {
        en: 'It catches network timeouts automatically.',
        vi: 'Tự động bắt các lỗi timeout mạng.',
      },
    ],
    correctIndex: 0,
    explanation: {
      en: 'Only `never` is assignable to `never`; if any union member remains unnarrowed, TypeScript flags the exact missing case at compile time.',
      vi: 'Chỉ kiểu `never` mới gán được vào `never`; nếu còn sót bất kỳ nhánh nào của union, TypeScript sẽ chỉ đích danh ngay lúc biên dịch.',
    },
  },
  {
    id: 'q-sql-1',
    courseId: 'sql-tuning',
    topic: 'SARGability',
    question: {
      en: 'Why does `WHERE YEAR(CreatedAt) = 2026` prevent using a B-Tree index on `CreatedAt`, and how should you rewrite it?',
      vi: 'Vì sao `WHERE YEAR(CreatedAt) = 2026` vô hiệu hóa chỉ mục B-Tree trên `CreatedAt` và viết lại thế nào?',
    },
    options: [
      {
        en: 'SQL engines dislike integer years; cast `CreatedAt` to `VARCHAR` instead.',
        vi: 'Động cơ SQL không thích số nguyên; hãy ép `CreatedAt` sang `VARCHAR`.',
      },
      {
        en: 'Wrapping the indexed column in a function breaks B-Tree range ordering; rewrite as `CreatedAt >= "2026-01-01" AND CreatedAt < "2027-01-01"`.',
        vi: 'Bọc cột chỉ mục trong hàm phá vỡ thứ tự tìm khoảng B-Tree; viết lại thành `CreatedAt >= "2026-01-01" AND CreatedAt < "2027-01-01"`.',
      },
      {
        en: 'Indexes only work with `ORDER BY`, never with `WHERE`.',
        vi: 'Chỉ mục chỉ hoạt động với `ORDER BY`, không chạy với `WHERE`.',
      },
      {
        en: 'Add `SELECT *` to force an index seek.',
        vi: 'Thêm `SELECT *` để ép động cơ chạy index seek.',
      },
    ],
    correctIndex: 1,
    explanation: {
      en: 'SARGable range bounds allow the query optimizer to seek directly into the B-Tree leaf starting at 2026-01-01 and stop at 2027-01-01.',
      vi: 'Điều kiện khoảng SARGable giúp bộ tối ưu nhảy thẳng tới nút lá 2026-01-01 trên cây B-Tree và dừng ngay tại 2027-01-01.',
    },
  },
];

export const FLASHCARDS: FlashcardItem[] = [
  {
    id: 'fc-dotnet-1',
    courseId: 'dotnet-10',
    tag: 'Dapper · GC',
    front: {
      en: 'Why specify `DbString` with explicit `Length` and `IsAnsi` in high-RPS Dapper queries?',
      vi: 'Vì sao cần khai báo `DbString` rõ `Length` và `IsAnsi` khi truy vấn Dapper tải cao?',
    },
    back: {
      en: 'Prevents SQL Server implicit `NVARCHAR` ↔ `VARCHAR` conversion scans and stops plan-cache bloat caused by varying string lengths.',
      vi: 'Tránh ép kiểu ngầm `NVARCHAR` ↔ `VARCHAR` gây quét bảng và ngăn phình Plan Cache do độ dài chuỗi biến thiên.',
    },
    codeSnippet: 'new DbString { Value = code, IsAnsi = true, Length = 32 }',
  },
  {
    id: 'fc-dotnet-2',
    courseId: 'dotnet-10',
    tag: '.NET 10 · AOT',
    front: {
      en: 'How does `JsonSerializerContext` accelerate .NET 10 Minimal API serialization?',
      vi: '`JsonSerializerContext` tăng tốc tuần tự hóa JSON trong .NET 10 Minimal API bằng cách nào?',
    },
    back: {
      en: 'It emits static serialization metadata at compile time via C# Source Generators, eliminating runtime reflection startup overhead and enabling Native AOT.',
      vi: 'Sinh mã tuần tự hóa tĩnh ngay lúc biên dịch bằng Source Generator, triệt tiêu chi phí reflection và tương thích 100% Native AOT.',
    },
    codeSnippet: '[JsonSerializable(typeof(OrderDto))] partial class AppJsonCtx : JsonSerializerContext {}',
  },
  {
    id: 'fc-dotnet-3',
    courseId: 'dotnet-10',
    tag: 'Redis · Locks',
    front: {
      en: 'Why wrap Redis check-and-set idempotency logic in a Lua script instead of two client commands?',
      vi: 'Vì sao nên gộp logic kiểm tra-khóa Idempotency Redis vào một Lua script thay vì hai lệnh rời?',
    },
    back: {
      en: 'Redis executes Lua scripts atomically on its single command thread, eliminating race windows and cutting network RTT in half.',
      vi: 'Redis chạy Lua script nguyên tử trên luồng lệnh đơn, triệt tiêu khe hở race condition và giảm một nửa vòng gọi mạng RTT.',
    },
    codeSnippet: 'EVAL "if redis.call(\'EXISTS\', KEYS[1])==0 then return redis.call(\'SET\', KEYS[1], ARGV[1], \'EX\', 300) end"',
  },
  {
    id: 'fc-react-1',
    courseId: 'react-19',
    tag: 'React 19 · UX',
    front: {
      en: 'How does `useOptimistic` automatically recover when an async server mutation throws an error?',
      vi: '`useOptimistic` tự động phục hồi trạng thái thế nào khi lệnh ghi bất đồng bộ lên server thất bại?',
    },
    back: {
      en: 'The optimistic overlay only lives for the duration of the active transition; once the action settles without committing new base state, React automatically reverts to the source-of-truth state.',
      vi: 'Trạng thái lạc quan chỉ tồn tại trong thời gian transition đang chạy; khi tác vụ kết thúc mà không cập nhật state gốc, React tự hoàn tác về dữ liệu chuẩn.',
    },
    codeSnippet: 'const [optItems, addOpt] = useOptimistic(items, (cur, next) => [...cur, next]);',
  },
  {
    id: 'fc-react-2',
    courseId: 'react-19',
    tag: 'Fiber · Keys',
    front: {
      en: 'What triggers React Fiber to preserve vs destroy a component’s internal state across renders?',
      vi: 'Điều kiện nào khiến React Fiber giữ lại hay hủy bỏ trạng thái nội bộ của một component giữa các lần render?',
    },
    back: {
      en: 'Matching `(element.type, element.key)` at the same tree level preserves the Fiber instance; changing either destroys the old subtree and mounts fresh state.',
      vi: 'Khớp cả `(element.type, element.key)` tại cùng tầng cây sẽ giữ nguyên thực thể Fiber; đổi một trong hai sẽ hủy cây cũ và mount mới.',
    },
  },
  {
    id: 'fc-react-3',
    courseId: 'react-19',
    tag: 'Compiler · Purity',
    front: {
      en: 'Why must components avoid mutating props or external variables during render under React Compiler?',
      vi: 'Vì sao component không được sửa trực tiếp props hay biến ngoài khi render dưới React Compiler?',
    },
    back: {
      en: 'React Compiler memoizes values assuming idempotent pure renders; hidden mutations violate cache invariants and cause stale UI glitches.',
      vi: 'React Compiler tự động cache dựa trên giả định hàm render thuần túy; biến đổi ngầm phá vỡ tính đúng đắn của cache và gây lệch giao diện.',
    },
  },
  {
    id: 'fc-rag-1',
    courseId: 'applied-rag',
    tag: 'RAG · RRF',
    front: {
      en: 'Write the Reciprocal Rank Fusion (RRF) formula and explain the role of constant `k = 60`.',
      vi: 'Nêu công thức Reciprocal Rank Fusion (RRF) và vai trò của hằng số `k = 60`.',
    },
    back: {
      en: '`RRF(d) = Σ 1 / (k + rank_i(d))`. The smoothing constant `k = 60` dampens outlier rank-1 noise while rewarding documents consistently ranked across multiple retrievers.',
      vi: '`RRF(d) = Σ 1 / (k + rank_i(d))`. Hằng số làm mượt `k = 60` tránh thiên lệch cực đoan vào hạng 1 đơn lẻ và thưởng cao cho tài liệu đồng thuận nhiều nguồn.',
    },
    codeSnippet: 'score += 1 / (60 + rank); // 1-based rank',
  },
  {
    id: 'fc-rag-2',
    courseId: 'applied-rag',
    tag: 'LLM · Caching',
    front: {
      en: 'How should you structure prompts to maximize LLM Prompt Cache hit rates in multi-turn RAG agents?',
      vi: 'Cần sắp xếp cấu trúc prompt thế nào để tối đa hóa tỷ lệ trúng Prompt Cache trên AI Agent đa lượt?',
    },
    back: {
      en: 'Place static system instructions, tool schemas, and stable reference docs at the exact beginning (prefix), and append dynamic user queries / timestamps strictly at the end.',
      vi: 'Đặt chỉ thị hệ thống tĩnh, schema công cụ và tài liệu nền ở đúng phần đầu (tiền tố), còn câu hỏi động và thời gian đặt hoàn toàn ở cuối.',
    },
  },
  {
    id: 'fc-rag-3',
    courseId: 'applied-rag',
    tag: 'RAG · Evals',
    front: {
      en: 'Distinguish between Context Recall and Answer Faithfulness in RAG evaluation.',
      vi: 'Phân biệt giữa Context Recall và Answer Faithfulness khi đánh giá hệ thống RAG.',
    },
    back: {
      en: 'Context Recall measures whether the retriever fetched the ground-truth facts; Faithfulness measures whether the LLM answer stays strictly grounded in the retrieved chunks without hallucinating.',
      vi: 'Context Recall đo xem bộ tìm kiếm có lấy đủ dữ kiện đúng hay không; Faithfulness đo xem câu trả lời LLM có bám sát đoạn trích mà không bịa thêm hay không.',
    },
  },
  {
    id: 'fc-sd-1',
    courseId: 'system-design-10k',
    tag: 'Rate Limiting',
    front: {
      en: 'Compare Token Bucket vs Fixed Window Counter rate limiting under boundary burst traffic.',
      vi: 'So sánh Token Bucket và Fixed Window Counter khi gặp đột biến lưu lượng ngay ranh giới khung thời gian.',
    },
    back: {
      en: 'Fixed Window suffers 2x burst spikes straddling window boundaries; Token Bucket smoothly refills continuously while enforcing an exact maximum burst `capacity`.',
      vi: 'Fixed Window dễ dính đỉnh tải gấp đôi ngay mép chuyển phút; Token Bucket nạp đều liên tục và khống chế chính xác trần đột biến `capacity`.',
    },
  },
  {
    id: 'fc-sd-2',
    courseId: 'system-design-10k',
    tag: 'Consistency',
    front: {
      en: 'How do you guarantee "Read-Your-Own-Writes" when serving reads from asynchronous DB replicas?',
      vi: 'Làm thế nào đảm bảo tính chất "Đọc Được Dữ Liệu Vừa Ghi" khi hệ thống đọc từ bản sao bất đồng bộ?',
    },
    back: {
      en: 'Route the writer’s immediate subsequent reads to the primary (or pass the commit LSN / timestamp watermark and wait until the replica catches up).',
      vi: 'Định tuyến lượt đọc kế tiếp của chính người ghi về nút chính (hoặc đính kèm mốc LSN vừa commit để chỉ đọc bản sao đã đồng bộ tới mốc đó).',
    },
  },
  {
    id: 'fc-sd-3',
    courseId: 'system-design-10k',
    tag: 'Sharding',
    front: {
      en: 'Why do Consistent Hashing rings deploy Virtual Nodes (vnodes) per physical server?',
      vi: 'Vì sao vòng Consistent Hashing cần triển khai nhiều nút ảo (Virtual Nodes) cho mỗi máy chủ vật lý?',
    },
    back: {
      en: 'Virtual nodes smooth out hash-ring skew so key distribution stays balanced and when a node fails, its load spreads evenly across all surviving servers instead of overloading one neighbor.',
      vi: 'Nút ảo làm đều phân phối khóa trên vòng băm và khi một máy chủ chết, tải của nó được chia đều ra toàn cụm thay vì dồn vào một máy kế cận.',
    },
  },
  {
    id: 'fc-ts-1',
    courseId: 'typescript-mastery',
    tag: 'Nominal Types',
    front: {
      en: 'How do Branded Types simulate nominal typing inside TypeScript’s structural type system?',
      vi: 'Branded Types mô phỏng hệ kiểu định danh (nominal) bên trong hệ kiểu cấu trúc của TypeScript như thế nào?',
    },
    back: {
      en: 'Intersect a primitive with a phantom `unique symbol` tag property so two string IDs (`UserId` vs `OrderId`) cannot be interchanged without an explicit smart constructor.',
      vi: 'Giao kiểu nguyên thủy với một thuộc tính nhãn `unique symbol` ảo để `UserId` và `OrderId` không thể truyền nhầm cho nhau.',
    },
    codeSnippet: 'type OrderId = string & { readonly __brand: unique symbol };',
  },
  {
    id: 'fc-ts-2',
    courseId: 'typescript-mastery',
    tag: 'Strict Config',
    front: {
      en: 'What hidden runtime crash does `noUncheckedIndexedAccess: true` prevent?',
      vi: 'Cờ `noUncheckedIndexedAccess: true` ngăn chặn lỗi sập runtime ngầm nào?',
    },
    back: {
      en: 'It types array/record index lookups `arr[i]` as `T | undefined`, forcing callers to check bounds before dereferencing properties.',
      vi: 'Ép kết quả truy cập chỉ mục `arr[i]` có kiểu `T | undefined`, buộc lập trình viên kiểm tra tồn tại trước khi đọc thuộc tính.',
    },
  },
  {
    id: 'fc-ts-3',
    courseId: 'typescript-mastery',
    tag: 'Generics',
    front: {
      en: 'How do you prevent a conditional type `T extends U ? X : Y` from distributing over a union `T`?',
      vi: 'Làm thế nào để ngăn kiểu điều kiện `T extends U ? X : Y` phân phối tách từng phần tử của union `T`?',
    },
    back: {
      en: 'Wrap both sides in a single-element tuple: `[T] extends [U] ? X : Y`.',
      vi: 'Bọc cả hai vế trong tuple một phần tử: `[T] extends [U] ? X : Y`.',
    },
    codeSnippet: 'type IsExactUnion<T, U> = [T] extends [U] ? true : false;',
  },
  {
    id: 'fc-sql-1',
    courseId: 'sql-tuning',
    tag: 'Indexes',
    front: {
      en: 'What is a Covering Index and how does it eliminate Key Lookups?',
      vi: 'Covering Index (Chỉ mục phủ) là gì và làm sao nó triệt tiêu thao tác Key Lookup?',
    },
    back: {
      en: 'A non-clustered index whose key + `INCLUDE` leaf columns contain every column referenced by the query, letting the engine satisfy the query without hopping back to the clustered table.',
      vi: 'Chỉ mục chứa đủ toàn bộ cột truy vấn cần ở tầng lá (khóa + `INCLUDE`), giúp động cơ trả kết quả ngay mà không cần nhảy về bảng chính.',
    },
    codeSnippet: 'CREATE INDEX IX_Orders_User ON Orders(UserId, CreatedAt) INCLUDE (TotalVnd, Status);',
  },
  {
    id: 'fc-sql-2',
    courseId: 'sql-tuning',
    tag: 'Pagination',
    front: {
      en: 'Why does `OFFSET 500000 FETCH NEXT 20 ROWS` degrade linearly while Keyset pagination stays constant?',
      vi: 'Vì sao `OFFSET 500000 FETCH NEXT 20` chậm dần tuyến tính còn phân trang Keyset giữ tốc độ ổn định?',
    },
    back: {
      en: 'OFFSET still scans and discards 500,000 rows every page; Keyset (`WHERE Id > @lastId`) seeks directly down the B-Tree in O(log N) regardless of page depth.',
      vi: 'OFFSET vẫn phải quét và vứt bỏ 500.000 dòng mỗi lần; Keyset (`WHERE Id > @lastId`) nhảy thẳng tới vị trí trên cây B-Tree trong O(log N) bất kể độ sâu trang.',
    },
  },
  {
    id: 'fc-sql-3',
    courseId: 'sql-tuning',
    tag: 'Isolation',
    front: {
      en: 'Why prefer Read Committed Snapshot Isolation (RCSI) over sprinkling `WITH (NOLOCK)` on OLTP queries?',
      vi: 'Vì sao nên bật RCSI thay vì rải `WITH (NOLOCK)` trên truy vấn hệ thống OLTP?',
    },
    back: {
      en: 'RCSI gives non-blocking reads from committed row versions without dirty reads, phantom duplicates, or torn financial totals that `NOLOCK` can silently expose.',
      vi: 'RCSI cho phép đọc không bị chặn từ bản ghi đã commit mà không dính đọc bẩn, trùng dòng hay lệch số tiền như `NOLOCK`.',
    },
  },
];
