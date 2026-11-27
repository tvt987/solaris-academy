import type { Course } from '../types/lms';

export const COURSES: Course[] = [
  {
    id: 'dotnet-10',
    code: 'DN10',
    slug: 'full-stack-dotnet-10',
    category: 'backend',
    difficulty: 'advanced',
    accentHex: '#1d4ed8',
    title: {
      en: 'Full-Stack .NET 10',
      vi: 'Full-Stack .NET 10 Thực Chiến',
    },
    subtitle: {
      en: 'Native AOT Minimal APIs, Dapper zero-allocation queries, Redis optimistic locks & OpenTelemetry.',
      vi: 'Minimal APIs chuẩn Native AOT, truy vấn Dapper tối ưu bộ nhớ, Redis Lock & OpenTelemetry.',
    },
    summary: {
      en: 'Architect mission-critical retail and fintech backends engineered to sustain 5,000+ RPS with deterministic sub-45ms p99 latency, zero voucher double-spending, and zero-downtime deployments.',
      vi: 'Thiết kế hệ thống backend bán lẻ & fintech chịu tải trên 5.000 RPS với độ trễ p99 dưới 45ms, triệt tiêu hoàn toàn race condition và vận hành không gián đoạn.',
    },
    instructor: 'Truong Van Tinh',
    instructorRole: {
      en: 'Principal .NET Architect · Ex-Con Cung (700+ Stores)',
      vi: 'Kiến Trúc Sư .NET Trưởng · Cựu Con Cung (700+ Siêu Thị)',
    },
    durationHours: 14,
    rating: 4.96,
    enrolledCount: 1840,
    priceVnd: 3_490_000,
    originalPriceVnd: 4_800_000,
    skills: ['.NET 10 AOT', 'Dapper', 'Redis Lua', 'OpenTelemetry', 'Clean Arch'],
    outcomes: [
      {
        en: 'Eliminate EF Core change-tracker GC spikes using compiled Dapper micro-ORM pipelines.',
        vi: 'Triệt tiêu nghẽn GC Pause của Change Tracker bằng pipeline Dapper tối ưu bộ nhớ.',
      },
      {
        en: 'Implement idempotent payment & voucher endpoints resilient to retry storms.',
        vi: 'Xây dựng API thanh toán & voucher chuẩn Idempotency chống bão request lặp.',
      },
      {
        en: 'Instrument distributed traces, structured metrics, and live p99 latency alerts.',
        vi: 'Gắn hệ thống Distributed Tracing, metric chuẩn xác và cảnh báo p99 thời gian thực.',
      },
    ],
    featuredLabId: 'lab-dotnet-idempotency',
    modules: [
      {
        id: 'dotnet-m1',
        title: { en: 'High-Throughput Runtime & Native AOT', vi: 'Runtime Tải Cao & Biên Dịch Native AOT' },
        lessons: [
          {
            id: 'dotnet-m1-l1',
            title: { en: 'ThreadPool Starvation & Async State Machines', vi: 'Nghẽn ThreadPool & Máy Trạng Thái Async' },
            durationMin: 32,
            type: 'architecture',
            keyConcept: { en: 'ValueTask & zero-allocation async hot paths', vi: 'ValueTask & giảm cấp phát Heap trên luồng nóng' },
          },
          {
            id: 'dotnet-m1-l2',
            title: { en: 'Minimal APIs with Source-Generated JSON', vi: 'Minimal APIs kết hợp Source-Generated JSON' },
            durationMin: 28,
            type: 'concept',
            keyConcept: { en: 'JsonSerializerContext eliminating reflection', vi: 'Loại bỏ reflection với JsonSerializerContext' },
          },
          {
            id: 'dotnet-m1-l3',
            title: { en: 'Span<T>, MemoryPool & Buffer Pooling', vi: 'Span<T>, MemoryPool & Tái Sử Dụng Bộ Đệm' },
            durationMin: 35,
            type: 'lab',
            keyConcept: { en: 'Stack allocation preventing Gen-2 GC pauses', vi: 'Cấp phát trên Stack tránh Gen-2 GC pause' },
          },
        ],
      },
      {
        id: 'dotnet-m2',
        title: { en: 'Dapper Data Access & Concurrency Control', vi: 'Truy Cập Dữ Liệu Dapper & Kiểm Soát Đồng Thời' },
        lessons: [
          {
            id: 'dotnet-m2-l1',
            title: { en: 'Parameter Sniffing & Plan Cache Stability', vi: 'Parameter Sniffing & Ổn Định Execution Plan' },
            durationMin: 30,
            type: 'concept',
            keyConcept: { en: 'DbString exact ANSI/length typing', vi: 'Định kiểu DbString chuẩn xác chiều dài' },
          },
          {
            id: 'dotnet-m2-l2',
            title: { en: 'Optimistic Concurrency & RowVersion Guards', vi: 'Khóa Lạc Quan & Kiểm Tra RowVersion' },
            durationMin: 40,
            type: 'lab',
            keyConcept: { en: 'Atomic UPDATE WHERE RowVersion = @v', vi: 'Cập nhật nguyên tử kiểm tra phiên bản bản ghi' },
          },
          {
            id: 'dotnet-m2-l3',
            title: { en: 'Redis Lua Idempotency Store', vi: 'Kho Idempotency Nguyên Tử Bằng Redis Lua' },
            durationMin: 38,
            type: 'architecture',
            keyConcept: { en: 'Single-roundtrip SET NX EX state locks', vi: 'Khóa trạng thái nguyên tử một vòng gọi mạng' },
          },
        ],
      },
      {
        id: 'dotnet-m3',
        title: { en: 'Resilience, Observability & Production Rollout', vi: 'Chịu Lỗi, Giám Sát & Triển Khai Production' },
        lessons: [
          {
            id: 'dotnet-m3-l1',
            title: { en: 'Polly v8 Hedging, Circuit Breakers & Jitter', vi: 'Polly v8 Hedging, Circuit Breaker & Jitter' },
            durationMin: 26,
            type: 'concept',
            keyConcept: { en: 'Preventing cascading downstream failures', vi: 'Ngăn hiệu ứng domino sập dịch vụ phụ thuộc' },
          },
          {
            id: 'dotnet-m3-l2',
            title: { en: 'OpenTelemetry Trace Context Across Queues', vi: 'Truy Vết OpenTelemetry Xuyên Hàng Đợi' },
            durationMin: 34,
            type: 'lab',
            keyConcept: { en: 'W3C Traceparent propagation end-to-end', vi: 'Lan truyền W3C Traceparent xuyên suốt hệ thống' },
          },
          {
            id: 'dotnet-m3-l3',
            title: { en: 'Production Load Verification & Checkpoint', vi: 'Kiểm Định Tải Thực Tế & Bài Thi Chốt' },
            durationMin: 25,
            type: 'quiz',
            keyConcept: { en: 'p95/p99 latency SLO verification', vi: 'Xác minh cam kết SLO độ trễ p95/p99' },
          },
        ],
      },
    ],
  },
  {
    id: 'react-19',
    code: 'RC19',
    slug: 'react-19-architecture',
    category: 'frontend',
    difficulty: 'advanced',
    accentHex: '#10b981',
    title: {
      en: 'React 19 Architecture',
      vi: 'Kiến Trúc React 19 Chuyên Sâu',
    },
    subtitle: {
      en: 'Concurrent Fiber rendering, Actions, Optimistic UI, React Compiler & accessible design systems.',
      vi: 'Render đồng thời Fiber, Server Actions, Optimistic UI, React Compiler & hệ thống giao diện.',
    },
    summary: {
      en: 'Go beyond hooks into React 19 internals: build lag-free 60fps interactive workspaces with deterministic state transitions, React Compiler memoization, and resilient client-server data boundaries.',
      vi: 'Đi sâu vào lõi vận hành React 19: xây dựng ứng dụng tương tác mượt 60fps với quản trị trạng thái nhất quán, tối ưu tự động qua React Compiler và ranh giới dữ liệu client-server.',
    },
    instructor: 'Truong Van Tinh',
    instructorRole: {
      en: 'Frontend Systems Architect · Solaris Academy',
      vi: 'Kiến Trúc Sư Hệ Thống Frontend · Solaris Academy',
    },
    durationHours: 12,
    rating: 4.94,
    enrolledCount: 2190,
    priceVnd: 2_990_000,
    originalPriceVnd: 4_100_000,
    skills: ['React 19', 'Fiber Diffing', 'useOptimistic', 'React Compiler', 'A11y Systems'],
    outcomes: [
      {
        en: 'Master keyed reconciliation, transition scheduling, and eliminating layout thrashing.',
        vi: 'Làm chủ thuật toán đối chiếu khóa (reconciliation), lịch chuyển trạng thái và triệt tiêu giật khung hình.',
      },
      {
        en: 'Build optimistic mutations with automatic rollback using useActionState and useOptimistic.',
        vi: 'Thiết kế luồng cập nhật tức thì (Optimistic UI) tự động hoàn tác khi mạng lỗi.',
      },
      {
        en: 'Design composable headless primitives with strict keyboard & screen-reader semantics.',
        vi: 'Thiết kế thư viện component không ràng buộc kiểu dáng chuẩn tiếp cận bàn phím & A11y.',
      },
    ],
    featuredLabId: 'lab-react-reconciler',
    modules: [
      {
        id: 'react-m1',
        title: { en: 'Fiber Internals & Reconciliation Mechanics', vi: 'Lõi Fiber & Cơ Chế Đối Chiếu DOM Ảo' },
        lessons: [
          {
            id: 'react-m1-l1',
            title: { en: 'Work Loops, Lanes & Interruptible Rendering', vi: 'Vòng Lặp Work Loop, Lanes & Render Ngắt Quãng' },
            durationMin: 28,
            type: 'architecture',
            keyConcept: { en: 'Priority lanes separating typing from heavy renders', vi: 'Phân làn ưu tiên tách biệt thao tác gõ phím và vẽ nặng' },
          },
          {
            id: 'react-m1-l2',
            title: { en: 'Key Stability & Subtree Identity Pitfalls', vi: 'Tính Ổn Định Của Key & Bẫy Mất Trạng Thái Cây' },
            durationMin: 24,
            type: 'lab',
            keyConcept: { en: 'Deterministic O(n) keyed list diffing', vi: 'Đối chiếu danh sách theo khóa độ phức tạp O(n)' },
          },
          {
            id: 'react-m1-l3',
            title: { en: 'React Compiler Auto-Memoization Semantics', vi: 'Ngữ Nghĩa Tự Động Ghi Nhớ Của React Compiler' },
            durationMin: 30,
            type: 'concept',
            keyConcept: { en: 'Pure render rules enabling compile-time caching', vi: 'Quy tắc hàm thuần giúp trình biên dịch cache tự động' },
          },
        ],
      },
      {
        id: 'react-m2',
        title: { en: 'Actions, Optimistic Mutations & Streaming', vi: 'Actions, Cập Nhật Lạc Quan & Streaming' },
        lessons: [
          {
            id: 'react-m2-l1',
            title: { en: 'useTransition, useActionState & Pending Coordination', vi: 'useTransition, useActionState & Đồng Bộ Trạng Thái Chờ' },
            durationMin: 32,
            type: 'concept',
            keyConcept: { en: 'Eliminating race conditions in rapid form submits', vi: 'Loại bỏ xung đột dữ liệu khi người dùng gửi liên tiếp' },
          },
          {
            id: 'react-m2-l2',
            title: { en: 'Zero-Latency UX with useOptimistic Rollbacks', vi: 'Trải Nghiệm 0ms Với useOptimistic Tự Hoàn Tác' },
            durationMin: 36,
            type: 'lab',
            keyConcept: { en: 'Declarative temporary overlays during async mutations', vi: 'Lớp phủ trạng thái tạm khai báo khi chờ API' },
          },
          {
            id: 'react-m2-l3',
            title: { en: 'Suspense Boundaries & Error Recovery Trees', vi: 'Biên Suspense & Cây Phục Hồi Lỗi Có Kiểm Soát' },
            durationMin: 28,
            type: 'architecture',
            keyConcept: { en: 'Preventing request waterfalls with preload patterns', vi: 'Chống thác nước request bằng kỹ thuật nạp trước' },
          },
        ],
      },
      {
        id: 'react-m3',
        title: { en: 'Scalable Design System & Performance Audits', vi: 'Hệ Thống Thiết Kế & Kiểm Định Hiệu Năng' },
        lessons: [
          {
            id: 'react-m3-l1',
            title: { en: 'Compound Components & Controlled State Inversion', vi: 'Compound Components & Đảo Ngược Quyền Kiểm Soát' },
            durationMin: 30,
            type: 'concept',
            keyConcept: { en: 'Flexible API surfaces without prop explosion', vi: 'API mở rộng linh hoạt không phình to danh sách props' },
          },
          {
            id: 'react-m3-l2',
            title: { en: 'Profiler Flamegraphs & INP Optimization', vi: 'Biểu Đồ Flamegraph & Tối Ưu Chỉ Số INP' },
            durationMin: 34,
            type: 'lab',
            keyConcept: { en: 'Keeping Interaction to Next Paint below 100ms', vi: 'Giữ độ trễ tương tác INP ổn định dưới 100ms' },
          },
          {
            id: 'react-m3-l3',
            title: { en: 'Architecture Review & Graded Quiz', vi: 'Đánh Giá Kiến Trúc & Trắc Nghiệm Thực Chiến' },
            durationMin: 22,
            type: 'quiz',
            keyConcept: { en: 'End-to-end rendering trade-offs', vi: 'Cân bằng đánh đổi kiến trúc hiển thị' },
          },
        ],
      },
    ],
  },
  {
    id: 'applied-rag',
    code: 'RAG2',
    slug: 'applied-rag-ai-agents',
    category: 'ai',
    difficulty: 'advanced',
    accentHex: '#f59e0b',
    title: {
      en: 'Applied RAG & AI Agents',
      vi: 'Ứng Dụng RAG & AI Agents Doanh Nghiệp',
    },
    subtitle: {
      en: 'Hybrid BM25 + Vector search, Reciprocal Rank Fusion, rerankers, tool-use loops & LLM evals.',
      vi: 'Tìm kiếm lai BM25 + Vector, hợp nhất xếp hạng RRF, Reranker, Tool-Calling & hệ đo kiểm LLM.',
    },
    summary: {
      en: 'Move past toy notebook demos and engineer deterministic production RAG systems with verifiable citations, hybrid recall fusion, prompt caching, structured schemas, and automated hallucination guardrails.',
      vi: 'Vượt xa các bản demo thử nghiệm để xây dựng hệ thống RAG thực chiến: trích dẫn xác thực, hợp nhất tìm kiếm lai, prompt caching, kiểm định đầu ra cấu trúc và chặn ảo giác.',
    },
    instructor: 'Truong Van Tinh',
    instructorRole: {
      en: 'Applied AI Engineer · LLM Systems & Evals',
      vi: 'Kỹ Sư AI Ứng Dụng · Hệ Thống LLM & Đánh Giá',
    },
    durationHours: 16,
    rating: 4.98,
    enrolledCount: 2560,
    priceVnd: 3_890_000,
    originalPriceVnd: 5_200_000,
    skills: ['Hybrid RRF', 'Semantic Chunking', 'Cross-Encoder', 'Agent Loops', 'RAG Evals'],
    outcomes: [
      {
        en: 'Fuse sparse BM25 lexical rankings with dense embeddings using Reciprocal Rank Fusion.',
        vi: 'Kết hợp tìm kiếm từ khóa BM25 và vector ngữ nghĩa bằng thuật toán Reciprocal Rank Fusion.',
      },
      {
        en: 'Design bounded multi-step tool-calling agents with strict JSON schema validation & retries.',
        vi: 'Thiết kế Agent gọi công cụ đa bước có giới hạn ngân sách token và kiểm định schema nghiêm ngặt.',
      },
      {
        en: 'Build automated retrieval recall@k and faithfulness evaluation pipelines.',
        vi: 'Xây dựng quy trình đo lường tự động độ phủ Recall@K và độ trung thực trích dẫn.',
      },
    ],
    featuredLabId: 'lab-rag-rrf',
    modules: [
      {
        id: 'rag-m1',
        title: { en: 'Document Ingestion & Semantic Chunking', vi: 'Nạp Tài Liệu & Phân Đoạn Ngữ Nghĩa' },
        lessons: [
          {
            id: 'rag-m1-l1',
            title: { en: 'Layout-Aware Parsing & Structural Boundaries', vi: 'Phân Tích Bố Cục Tài Liệu & Ranh Giới Mục' },
            durationMin: 34,
            type: 'concept',
            keyConcept: { en: 'Preserving tables, headers, and hierarchy metadata', vi: 'Bảo toàn bảng biểu, tiêu đề và ngữ cảnh phân cấp' },
          },
          {
            id: 'rag-m1-l2',
            title: { en: 'Contextual Chunking & Overlap Calibration', vi: 'Phân Đoạn Ngữ Cảnh & Hiệu Chỉnh Độ Gối Đầu' },
            durationMin: 38,
            type: 'lab',
            keyConcept: { en: 'Balancing retrieval precision against context window budget', vi: 'Cân bằng độ chính xác truy hồi và ngân sách cửa sổ ngữ cảnh' },
          },
          {
            id: 'rag-m1-l3',
            title: { en: 'Embedding Quantization & HNSW Index Tuning', vi: 'Lượng Tử Hóa Embedding & Tinh Chỉnh Chỉ Mục HNSW' },
            durationMin: 32,
            type: 'architecture',
            keyConcept: { en: 'efSearch vs recall latency frontiers', vi: 'Đường biên đánh đổi giữa efSearch và độ trễ truy vấn' },
          },
        ],
      },
      {
        id: 'rag-m2',
        title: { en: 'Hybrid Retrieval, RRF & Cross-Encoder Reranking', vi: 'Truy Hồi Lai, RRF & Xếp Hạng Lại Cross-Encoder' },
        lessons: [
          {
            id: 'rag-m2-l1',
            title: { en: 'Reciprocal Rank Fusion (RRF) Mathematics', vi: 'Toán Học Thuật Toán Reciprocal Rank Fusion' },
            durationMin: 36,
            type: 'lab',
            keyConcept: { en: 'Rank-invariant score merging with k=60 smoothing', vi: 'Hợp nhất thứ hạng không phụ thuộc thang điểm với k=60' },
          },
          {
            id: 'rag-m2-l2',
            title: { en: 'Two-Stage Retrieval with Cross-Encoder Rerankers', vi: 'Truy Hồi Hai Tầng Với Bộ Xếp Hạng Cross-Encoder' },
            durationMin: 30,
            type: 'concept',
            keyConcept: { en: 'Promoting top-5 precision from 62% to 91%', vi: 'Nâng độ chính xác top-5 từ 62% lên 91%' },
          },
          {
            id: 'rag-m2-l3',
            title: { en: 'Prompt Caching, Token Budgets & Citation Enforcement', vi: 'Prompt Caching, Ngân Sách Token & Ép Trích Dẫn' },
            durationMin: 34,
            type: 'architecture',
            keyConcept: { en: 'Cutting inference spend up to 70% with stable prefixes', vi: 'Giảm tới 70% chi phí suy luận nhờ tiền tố ổn định' },
          },
        ],
      },
      {
        id: 'rag-m3',
        title: { en: 'Deterministic AI Agents & Eval Harnesses', vi: 'AI Agents Có Kiểm Soát & Hệ Thống Đánh Giá' },
        lessons: [
          {
            id: 'rag-m3-l1',
            title: { en: 'Tool Schemas, Retry Backoff & Loop Guards', vi: 'Schema Công Cụ, Retry Backoff & Giới Hạn Vòng Lặp' },
            durationMin: 36,
            type: 'lab',
            keyConcept: { en: 'Preventing runaway agent spend and malformed arguments', vi: 'Ngăn Agent lặp vô hạn và sai kiểu tham số công cụ' },
          },
          {
            id: 'rag-m3-l2',
            title: { en: 'Golden Datasets & Faithfulness Regression Suites', vi: 'Tập Dữ Liệu Chuẩn & Kiểm Thử Hồi Quy Trung Thực' },
            durationMin: 32,
            type: 'concept',
            keyConcept: { en: 'CI-gated quality gates before prompt deployment', vi: 'Cổng kiểm định chất lượng tự động trước khi đẩy prompt' },
          },
          {
            id: 'rag-m3-l3',
            title: { en: 'Applied RAG Production Assessment', vi: 'Kiểm Định Năng Lực RAG Production' },
            durationMin: 24,
            type: 'quiz',
            keyConcept: { en: 'Diagnosing retrieval vs generation failure modes', vi: 'Chẩn đoán lỗi tầng truy hồi hay tầng sinh văn bản' },
          },
        ],
      },
    ],
  },
  {
    id: 'system-design-10k',
    code: 'SD10',
    slug: 'system-design-10k-rps',
    category: 'backend',
    difficulty: 'architect',
    accentHex: '#6366f1',
    title: {
      en: 'System Design 10K RPS',
      vi: 'Thiết Kế Hệ Thống 10.000 RPS',
    },
    subtitle: {
      en: 'Distributed rate limiting, consistent hashing, CQRS, outbox patterns & chaos failover drills.',
      vi: 'Giới hạn lưu lượng phân tán, Consistent Hashing, CQRS, Outbox Pattern & diễn tập chịu lỗi.',
    },
    summary: {
      en: 'Think like a Staff Systems Architect. Quantify back-of-the-envelope capacity, protect hot partitions, design token buckets, and architect resilient read/write pipelines that survive regional outages.',
      vi: 'Tư duy như một Staff Systems Architect: ước lượng năng lực tải chuẩn xác, bảo vệ phân vùng nóng, thiết kế Token Bucket và kiến trúc đọc/ghi chịu lỗi vùng.',
    },
    instructor: 'Truong Van Tinh',
    instructorRole: {
      en: 'Solution Architect · Distributed High-Concurrency',
      vi: 'Kiến Trúc Sư Giải Pháp · Hệ Thống Phân Tán Tải Cao',
    },
    durationHours: 15,
    rating: 4.97,
    enrolledCount: 1620,
    priceVnd: 3_690_000,
    originalPriceVnd: 5_000_000,
    skills: ['Token Bucket', 'Outbox Pattern', 'Consistent Hash', 'CQRS', 'Backpressure'],
    outcomes: [
      {
        en: 'Implement distributed Token Bucket & Sliding Window rate limiters with burst control.',
        vi: 'Triển khai bộ giới hạn tốc độ Token Bucket & Sliding Window kiểm soát đột biến lưu lượng.',
      },
      {
        en: 'Eliminate dual-write inconsistency using Transactional Outbox & CDC relays.',
        vi: 'Loại bỏ sai lệch ghi kép bằng mẫu Transactional Outbox và luồng CDC.',
      },
      {
        en: 'Design multi-tier caching with singleflight deduplication against thundering herds.',
        vi: 'Thiết kế bộ nhớ đệm đa tầng chống hiệu ứng đàn voi (Thundering Herd) bằng Singleflight.',
      },
    ],
    featuredLabId: 'lab-sd-token-bucket',
    modules: [
      {
        id: 'sd-m1',
        title: { en: 'Capacity Math, Load Shedding & Rate Limiting', vi: 'Tính Toán Tải, Xả Tải & Giới Hạn Tốc Độ' },
        lessons: [
          {
            id: 'sd-m1-l1',
            title: { en: 'Little’s Law, Queue Depth & Tail Latency Amplification', vi: 'Định Luật Little, Độ Sâu Hàng Đợi & Khuếch Đại Độ Trễ Đuôi' },
            durationMin: 32,
            type: 'architecture',
            keyConcept: { en: 'Why 90% utilization explodes p99 latency', vi: 'Vì sao mức tải 90% khiến độ trễ p99 tăng dựng đứng' },
          },
          {
            id: 'sd-m1-l2',
            title: { en: 'Token Bucket vs Leaky Bucket Simulation', vi: 'Mô Phỏng Token Bucket So Với Leaky Bucket' },
            durationMin: 40,
            type: 'lab',
            keyConcept: { en: 'Controlled burst absorption with continuous refill', vi: 'Hấp thụ đột biến có kiểm soát với tốc độ nạp liên tục' },
          },
          {
            id: 'sd-m1-l3',
            title: { en: 'Adaptive Load Shedding & Priority Admission', vi: 'Xả Tải Thích Ứng & Ưu Tiên Luồng Quan Trọng' },
            durationMin: 28,
            type: 'concept',
            keyConcept: { en: 'Protecting checkout traffic over background analytics', vi: 'Ưu tiên lưu lượng thanh toán trước báo cáo nền' },
          },
        ],
      },
      {
        id: 'sd-m2',
        title: { en: 'Partitioning, Caching & Eventual Consistency', vi: 'Phân Mảnh, Bộ Nhớ Đệm & Nhất Quán Cuối Cùng' },
        lessons: [
          {
            id: 'sd-m2-l1',
            title: { en: 'Consistent Hashing Rings & Virtual Nodes', vi: 'Vòng Consistent Hashing & Các Nút Ảo' },
            durationMin: 34,
            type: 'architecture',
            keyConcept: { en: 'Minimizing key movement during cluster scaling', vi: 'Tối thiểu hóa dịch chuyển khóa khi mở rộng cụm' },
          },
          {
            id: 'sd-m2-l2',
            title: { en: 'Cache Stampede Prevention & Request Coalescing', vi: 'Chống Sập Cache Đồng Loạt & Gộp Truy Vấn' },
            durationMin: 32,
            type: 'lab',
            keyConcept: { en: 'Singleflight locking and probabilistic early refresh', vi: 'Khóa Singleflight và làm mới sớm theo xác suất' },
          },
          {
            id: 'sd-m2-l3',
            title: { en: 'Transactional Outbox & Exactly-Once Consumers', vi: 'Transactional Outbox & Người Tiêu Thụ Đúng Một Lần' },
            durationMin: 36,
            type: 'concept',
            keyConcept: { en: 'Atomic DB commits coupled with idempotent message keys', vi: 'Gắn kết giao dịch DB và khóa khử trùng lặp tin nhắn' },
          },
        ],
      },
      {
        id: 'sd-m3',
        title: { en: 'Multi-Region Failover & Architecture Defense', vi: 'Chuyển Đổi Đa Vùng & Bảo Vệ Kiến Trúc' },
        lessons: [
          {
            id: 'sd-m3-l1',
            title: { en: 'Read Replicas, Replication Lag & Read-Your-Writes', vi: 'Bản Sao Đọc, Độ Trễ Đồng Bộ & Đọc Dữ Liệu Vừa Ghi' },
            durationMin: 30,
            type: 'concept',
            keyConcept: { en: 'Session stickiness & LSN watermark routing', vi: 'Định tuyến theo dấu mốc LSN tránh đọc dữ liệu cũ' },
          },
          {
            id: 'sd-m3-l2',
            title: { en: 'Game-Day Chaos Engineering Scenarios', vi: 'Kịch Bản Diễn Tập Sự Cố Chaos Engineering' },
            durationMin: 34,
            type: 'architecture',
            keyConcept: { en: 'Graceful degradation when Redis or payment gateways drop', vi: 'Hạ cấp duyên dáng khi Redis hoặc cổng thanh toán mất kết nối' },
          },
          {
            id: 'sd-m3-l3',
            title: { en: 'Staff-Level System Design Quiz', vi: 'Bài Đánh Giá Thiết Kế Hệ Thống Cấp Staff' },
            durationMin: 26,
            type: 'quiz',
            keyConcept: { en: 'High-stakes architectural decision matrix', vi: 'Ma trận ra quyết định kiến trúc thực tế' },
          },
        ],
      },
    ],
  },
  {
    id: 'typescript-mastery',
    code: 'TS58',
    slug: 'typescript-mastery',
    category: 'frontend',
    difficulty: 'intermediate',
    accentHex: '#0ea5e9',
    title: {
      en: 'TypeScript Mastery',
      vi: 'Làm Chủ TypeScript Nâng Cao',
    },
    subtitle: {
      en: 'Branded types, discriminated unions, conditional inference, runtime parsers & strict API contracts.',
      vi: 'Branded Types, Discriminated Unions, suy luận kiểu điều kiện, bộ phân tích runtime & hợp đồng API.',
    },
    summary: {
      en: 'Turn the TypeScript compiler into a zero-cost verification engine. Make illegal states unrepresentable, craft ergonomic generic SDKs, and bridge runtime JSON boundaries safely.',
      vi: 'Biến trình biên dịch TypeScript thành công cụ kiểm chứng không tốn chi phí runtime: loại bỏ trạng thái phi lý ngay lúc biên dịch và xây dựng lớp xác thực dữ liệu chặt chẽ.',
    },
    instructor: 'Truong Van Tinh',
    instructorRole: {
      en: 'Type-Safe Full-Stack Engineer · Solaris Academy',
      vi: 'Kỹ Sư Full-Stack An Toàn Kiểu · Solaris Academy',
    },
    durationHours: 10,
    rating: 4.93,
    enrolledCount: 2410,
    priceVnd: 2_490_000,
    originalPriceVnd: 3_500_000,
    skills: ['Branded Types', 'Conditional Types', 'Exhaustiveness', 'Runtime Guards', 'SDK Generics'],
    outcomes: [
      {
        en: 'Model domain invariants using branded nominal IDs and exhaustive discriminated unions.',
        vi: 'Mô hình hóa bất biến nghiệp vụ bằng Branded ID và Discriminated Union vét cạn.',
      },
      {
        en: 'Write composable runtime configuration & API schema validators with typed errors.',
        vi: 'Xây dựng bộ xác thực cấu hình và API runtime trả về danh sách lỗi rõ ràng có định kiểu.',
      },
      {
        en: 'Eliminate type-checker slowdowns in monorepos via explicit return boundaries.',
        vi: 'Triệt tiêu hiện tượng chậm trình kiểm tra kiểu trong dự án lớn bằng ranh giới kiểu tường minh.',
      },
    ],
    featuredLabId: 'lab-ts-validator',
    modules: [
      {
        id: 'ts-m1',
        title: { en: 'Algebraic Domain Modeling & Narrowing', vi: 'Mô Hình Hóa Miền Đại Số & Thu Hẹp Kiểu' },
        lessons: [
          {
            id: 'ts-m1-l1',
            title: { en: 'Discriminated Unions & never Exhaustiveness', vi: 'Discriminated Unions & Kiểm Tra Vét Cạn never' },
            durationMin: 26,
            type: 'concept',
            keyConcept: { en: 'Compile-time proof that all state variants are handled', vi: 'Chứng minh lúc biên dịch mọi nhánh trạng thái đều được xử lý' },
          },
          {
            id: 'ts-m1-l2',
            title: { en: 'Branded Nominal Types for Money & IDs', vi: 'Branded Types Cho Tiền Tệ & Định Danh Thực Thể' },
            durationMin: 24,
            type: 'lab',
            keyConcept: { en: 'Preventing accidental swaps between UserId and OrderId', vi: 'Ngăn lỗi truyền nhầm UserId vào tham số OrderId' },
          },
          {
            id: 'ts-m1-l3',
            title: { en: 'Type Predicates & Assertion Functions', vi: 'Hàm Vị Từ Kiểu & Hàm Khẳng Định Kiểu' },
            durationMin: 28,
            type: 'concept',
            keyConcept: { en: 'Sound control-flow narrowing across async boundaries', vi: 'Thu hẹp luồng điều khiển an toàn qua ranh giới bất đồng bộ' },
          },
        ],
      },
      {
        id: 'ts-m2',
        title: { en: 'Type-Level Programming & Runtime Validation', vi: 'Lập Trình Mức Kiểu & Kiểm Định Runtime' },
        lessons: [
          {
            id: 'ts-m2-l1',
            title: { en: 'Distributive Conditional Types & infer Patterns', vi: 'Kiểu Điều Kiện Phân Phối & Mẫu Suy Luận infer' },
            durationMin: 30,
            type: 'architecture',
            keyConcept: { en: 'Extracting route params and return payloads dynamically', vi: 'Trích xuất tham số đường dẫn và kiểu dữ liệu trả về tự động' },
          },
          {
            id: 'ts-m2-l2',
            title: { en: 'Deterministic Runtime Schema & Config Parsing', vi: 'Phân Tích & Kiểm Định Cấu Hình Runtime Nhất Quán' },
            durationMin: 35,
            type: 'lab',
            keyConcept: { en: 'Parse, don’t validate — structured error accumulation', vi: 'Phân tích tạo kiểu an toàn cùng danh sách lỗi chi tiết' },
          },
          {
            id: 'ts-m2-l3',
            title: { en: 'Variance Annotations (in / out) & Inference Speed', vi: 'Chú Thích Biến Thiên (in / out) & Tốc Độ Suy Luận' },
            durationMin: 26,
            type: 'concept',
            keyConcept: { en: 'Cutting tsc check latency in 100k+ LOC codebases', vi: 'Giảm mạnh thời gian kiểm tra tsc trên dự án trên 100k dòng code' },
          },
        ],
      },
      {
        id: 'ts-m3',
        title: { en: 'End-to-End API Contracts & Mastery Exam', vi: 'Hợp Đồng API Toàn Trình & Kiểm Tra Năng Lực' },
        lessons: [
          {
            id: 'ts-m3-l1',
            title: { en: 'Typed Event Buses & Plugin Registries', vi: 'Hệ Thống Sự Kiện & Plugin Định Kiểu Chặt' },
            durationMin: 28,
            type: 'lab',
            keyConcept: { en: 'Mapped handler signatures with zero any escapes', vi: 'Ánh xạ chữ ký hàm xử lý không dùng any' },
          },
          {
            id: 'ts-m3-l2',
            title: { en: 'Strict tsconfig Flags Every Team Should Enforce', vi: 'Cấu Hình tsconfig Nghiêm Ngặt Cho Dự Án Production' },
            durationMin: 20,
            type: 'concept',
            keyConcept: { en: 'noUncheckedIndexedAccess & exactOptionalPropertyTypes', vi: 'Bắt lỗi truy cập mảng rỗng và thuộc tính tùy chọn' },
          },
          {
            id: 'ts-m3-l3',
            title: { en: 'TypeScript Type-System Checkpoint', vi: 'Bài Kiểm Tra Hệ Thống Kiểu TypeScript' },
            durationMin: 22,
            type: 'quiz',
            keyConcept: { en: 'Reasoning about soundness and inference limits', vi: 'Lập luận về tính chặt chẽ và giới hạn suy luận kiểu' },
          },
        ],
      },
    ],
  },
  {
    id: 'sql-tuning',
    code: 'SQL9',
    slug: 'sql-performance-tuning',
    category: 'data',
    difficulty: 'intermediate',
    accentHex: '#14b8a6',
    title: {
      en: 'SQL Performance Tuning',
      vi: 'Tối Ưu Hiệu Năng SQL Chuyên Sâu',
    },
    subtitle: {
      en: 'B-Tree covering indexes, execution plan forensics, SARGable predicates, lock isolation & keyset paging.',
      vi: 'Chỉ mục phủ B-Tree, giải phẫu Execution Plan, truy vấn SARGable, khóa giao dịch & phân trang Keyset.',
    },
    summary: {
      en: 'Turn 12-second table scans into 4-millisecond index seeks. Read real SQL Server & PostgreSQL execution plans, eliminate OFFSET slowdowns, and resolve deadlocks under heavy OLTP concurrency.',
      vi: 'Biến truy vấn quét bảng 12 giây thành tìm chỉ mục 4 mili-giây. Đọc thông thạo Execution Plan trên SQL Server & PostgreSQL, loại bỏ chậm OFFSET và hóa giải deadlock OLTP.',
    },
    instructor: 'Truong Van Tinh',
    instructorRole: {
      en: 'Database Performance Specialist · SQL Server & Postgres',
      vi: 'Chuyên Gia Tối Ưu Cơ Sở Dữ Liệu · SQL Server & Postgres',
    },
    durationHours: 11,
    rating: 4.95,
    enrolledCount: 1930,
    priceVnd: 2_790_000,
    originalPriceVnd: 3_900_000,
    skills: ['B-Tree Indexes', 'Execution Plans', 'Keyset Paging', 'MVCC & Locks', 'SARGability'],
    outcomes: [
      {
        en: 'Design composite & INCLUDE covering indexes eliminating expensive key lookups.',
        vi: 'Thiết kế chỉ mục tổ hợp và cột INCLUDE loại bỏ hoàn toàn chi phí Key Lookup.',
      },
      {
        en: 'Replace O(N) OFFSET pagination with deterministic O(log N) keyset cursor seeks.',
        vi: 'Thay thế phân trang OFFSET O(N) bằng phân trang Keyset Cursor độ phức tạp O(log N).',
      },
      {
        en: 'Diagnose lock escalation, RCSI isolation snapshots, and deadlock graphs systematically.',
        vi: 'Chẩn đoán leo thang khóa, chế độ cô lập RCSI và sơ đồ deadlock một cách hệ thống.',
      },
    ],
    featuredLabId: 'lab-sql-keyset',
    modules: [
      {
        id: 'sql-m1',
        title: { en: 'B-Tree Anatomy & Covering Index Design', vi: 'Giải Phẫu Cây B-Tree & Thiết Kế Chỉ Mục Phủ' },
        lessons: [
          {
            id: 'sql-m1-l1',
            title: { en: 'Index Seek vs Scan & Leftmost Prefix Rules', vi: 'Index Seek Hay Scan & Quy Tắc Tiền Tố Bên Trái' },
            durationMin: 28,
            type: 'concept',
            keyConcept: { en: 'Equality columns first, range columns second', vi: 'Đặt cột so sánh bằng trước, cột khoảng giá trị sau' },
          },
          {
            id: 'sql-m1-l2',
            title: { en: 'Eliminating Key Lookups with INCLUDE Columns', vi: 'Triệt Tiêu Key Lookup Bằng Cột INCLUDE' },
            durationMin: 32,
            type: 'architecture',
            keyConcept: { en: 'Keeping non-key payload at leaf pages only', vi: 'Lưu cột dữ liệu phụ ở tầng lá giảm độ sâu cây' },
          },
          {
            id: 'sql-m1-l3',
            title: { en: 'SARGable Predicates & Implicit Conversion Traps', vi: 'Biểu Thức SARGable & Bẫy Ép Kiểu Ngầm' },
            durationMin: 26,
            type: 'lab',
            keyConcept: { en: 'Why YEAR(CreatedAt) = 2026 disables index seeks', vi: 'Vì sao hàm bọc cột khiến động cơ phải quét toàn bảng' },
          },
        ],
      },
      {
        id: 'sql-m2',
        title: { en: 'Execution Plan Forensics & Keyset Pagination', vi: 'Giải Phẫu Execution Plan & Phân Trang Keyset' },
        lessons: [
          {
            id: 'sql-m2-l1',
            title: { en: 'Nested Loops, Hash Match & Merge Join Costs', vi: 'Chi Phí Nested Loops, Hash Match & Merge Join' },
            durationMin: 34,
            type: 'architecture',
            keyConcept: { en: 'Spotting memory spills to tempdb / disk', vi: 'Phát hiện tràn bộ nhớ sang đĩa tempdb trong kế hoạch thực thi' },
          },
          {
            id: 'sql-m2-l2',
            title: { en: 'O(log N) Keyset Cursor Pagination Engine', vi: 'Xây Dựng Bộ Phân Trang Keyset Cursor O(log N)' },
            durationMin: 36,
            type: 'lab',
            keyConcept: { en: 'Stable cursor paging across live-mutating datasets', vi: 'Phân trang con trỏ ổn định trên tập dữ liệu biến động' },
          },
          {
            id: 'sql-m2-l3',
            title: { en: 'Statistics Freshness & Cardinality Misestimates', vi: 'Độ Tươi Thống Kê & Sai Số Ước Lượng Lực Lượng' },
            durationMin: 28,
            type: 'concept',
            keyConcept: { en: 'Fixing row-estimate skew by 1000x', vi: 'Khắc phục sai lệch ước lượng số dòng lên tới 1000 lần' },
          },
        ],
      },
      {
        id: 'sql-m3',
        title: { en: 'Concurrency, Isolation & Deadlock Resolution', vi: 'Đồng Thời, Cô Lập Giao Dịch & Hóa Giải Deadlock' },
        lessons: [
          {
            id: 'sql-m3-l1',
            title: { en: 'RCSI & MVCC: Readers Never Blocking Writers', vi: 'RCSI & MVCC: Luồng Đọc Không Chặn Luồng Ghi' },
            durationMin: 30,
            type: 'concept',
            keyConcept: { en: 'Version store trade-offs vs dirty reads (NOLOCK)', vi: 'Đánh đổi vùng lưu phiên bản so với đọc bẩn NOLOCK' },
          },
          {
            id: 'sql-m3-l2',
            title: { en: 'Consistent Lock Ordering & Short Transactions', vi: 'Thứ Tự Khóa Nhất Quán & Giao Dịch Ngắn Gọn' },
            durationMin: 30,
            type: 'lab',
            keyConcept: { en: 'Eliminating cyclic waits in high-volume order tables', vi: 'Triệt tiêu vòng chờ khóa trên bảng đơn hàng tải lớn' },
          },
          {
            id: 'sql-m3-l3',
            title: { en: 'SQL Optimization Diagnostic Quiz', vi: 'Bài Kiểm Tra Chẩn Đoán Tối Ưu SQL' },
            durationMin: 22,
            type: 'quiz',
            keyConcept: { en: 'Production query rescue drills', vi: 'Bài tập cứu hộ truy vấn chậm thực chiến' },
          },
        ],
      },
    ],
  },
];

export function getCourseById(courseId: string): Course | undefined {
  return COURSES.find((c) => c.id === courseId);
}
