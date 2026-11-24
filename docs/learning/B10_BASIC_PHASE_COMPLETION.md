# Bài học kiến trúc B10 — Basic Phase Completion & Phase Gate

## 1. Tổng kết Chặng đường Phase 1: Basic (B01 → B10)

Phase 1 (Basic) đã hoàn thành toàn bộ mục tiêu đề ra: **Xây dựng một AI Research Agent hoàn chỉnh từ con số không (From Scratch) bằng TypeScript/NestJS mà không phụ thuộc vào bất kỳ framework điều phối AI bên thứ ba nào (như LangChain hay CrewAI)**.

Bằng cách tự tay xây dựng từng khối kiến trúc theo nguyên lý **Clean Architecture / Hexagonal Architecture**, toàn bộ hệ thống đạt được:
- Tính kiểm soát tuyệt đối (100% Deterministic & Observable).
- Khả năng kiểm thử toàn diện (**27 test suites, 132 unit/integration tests + 2 E2E suites PASS 100%**).
- Khả năng phòng thủ vững chắc trước Prompt Injection, SSRF, và các vòng lặp vô tận (Infinite Loops).

---

## 2. Bảng đối chiếu 10 Cột mốc Milestone

| Milestone | Trọng tâm Kỹ thuật | Deliverables & Thiết kế Cốt lõi |
|---|---|---|
| **B01** | **Backend Foundation** | NestJS 10, pnpm, Zod config validation (`env.schema.ts`), Global Exception Filter, Swagger docs, Docker. |
| **B02** | **LLM Integration** | Cổng `ILlmProviderPort`, `GeminiProviderAdapter` (`@google/genai` với model `gemini-3.5-flash`), `MockLlmAdapter`, Zod Structured Output, chuẩn hóa lỗi LLM (Timeout, RateLimit). |
| **B03** | **Tool Calling Foundations** | Hợp đồng `ITool`, `ToolRegistry`, `ToolDispatcher` (kiểm tra quyền hạn backend authority, parse Zod schema, timeout isolation), starter tools (`CalculatorTool` an toàn zero-eval). |
| **B04** | **Agent Loop** | Discriminated union `AgentDecision` (`tool_call`, `final_answer`, `request_clarification`), `AgentRunState`, ngân sách có giới hạn `AgentBudgetConfig`, `EventRecorder` ghi nhận 19 loại sự kiện, `NoProgressDetector` chống lặp vô tận. |
| **B05** | **Planning & Step Execution** | Phân rã mục tiêu thành DAG steps (`PlanDraftSchema`), kiểm soát trạng thái bước bằng FSM (`StepStateMachine`), `PlanValidator` kiểm tra tính toàn vẹn phụ thuộc, `AgentPlannerService` & `PlanExecutorService`. |
| **B06** | **Evaluation & Recovery** | `AgentEvaluatorService` 5 nhánh quyết định (`continue`, `retry_step`, `replan`, `complete`, `fail`), `RetryPolicy` phân biệt lỗi tạm thời (exponential backoff) và lỗi vĩnh viễn (replan v2 tự phục hồi). |
| **B07** | **Research Tools** | `SourceEvidence` data model, `ISearchProviderAdapter` (Mock & Tavily), `WebSearchTool` lọc trùng lặp URL, `UrlSecurityValidator` chặn SSRF (RFC 1918, loopback, cloud metadata), `PageReaderTool` bọc nội dung bằng tag `[EXTERNAL_UNTRUSTED_CONTENT]`. |
| **B08** | **Research Workflow & Synthesis** | `ResearchReportSchema` nghiêm ngặt, `ResearchSynthesizerService` (bảo đảm trích dẫn thực tế, chống bịa URL - Anti-Hallucination), render Markdown chuẩn GitHub, `ResearchWorkflowService` khép kín, rubric đánh giá 100 điểm `ResearchBenchmark`. |
| **B09** | **Persistence & History** | ADR-005 (Relational + JSONB), `ITaskRepository` & `IEventRepository`, `InMemoryTaskRepository`, PostgreSQL DDL migration `001_initial_schema.sql`, `TaskStateMachine` chống vi phạm trạng thái terminal, REST API `/api/v1/tasks`. |
| **B10** | **Phase Gate & Acceptance** | Bộ kiểm thử Acceptance Gate đạt 100% tiêu chí `TESTING_STRATEGY.md`, rà soát giới hạn kỹ thuật `KNOWN_LIMITATIONS.md`, hoàn thiện `README.md`, gắn nhãn release tag `v0.1.0-basic`. |

---

## 3. Các Bài học Kiến trúc Cốt lõi Rút ra

### 3.1. Tại sao không dùng LangChain / CrewAI cho lõi Orchestrator?
1. **Quyền kiểm soát (Authority):** Các framework thường đóng gói sẵn prompt và cơ chế parsing ẩn. Khi model trả về định dạng sai hoặc bị timeout, việc debug và can thiệp vào máy trạng thái cực kỳ khó khăn.
2. **Bảo mật và SSRF:** Trong KRA, việc quyết định công cụ nào được chạy, giới hạn tham số ra sao, và kiểm tra URL có thuộc dải mạng nội bộ hay không đều do backend Node.js toàn quyền quyết định thông qua `ToolDispatcher` và `UrlSecurityValidator`, hoàn toàn không tin tưởng vào model.
3. **Tính độc lập nhà cung cấp (Vendor Independence):** Nhờ Hexagonal Port `ILlmProviderPort`, hệ thống có thể chuyển đổi giữa Google Gemini, OpenAI, Claude hoặc Local Ollama mà không phải sửa một dòng code nào trong Agent Loop.

### 3.2. Bounded Autonomy (Tự chủ có Giới hạn)
Một Agent không được phép có quyền tự do vô hạn. KRA áp dụng 4 lớp phòng vệ đồng tâm:
- **Lớp 1 - Ngân sách:** Giới hạn cứng số lượt lặp (`maxIterations`), số lần gọi công cụ (`maxToolCalls`), thời gian tối đa (`maxTotalDurationMs`).
- **Lớp 2 - Phát hiện bế tắc:** `NoProgressDetector` ngắt ngay lập tức khi Agent gọi lặp lại một công cụ với cùng tham số hoặc gặp lỗi liên tiếp quá ngưỡng.
- **Lớp 3 - Máy trạng thái (FSM):** `TaskStateMachine` và `StepStateMachine` bảo đảm trạng thái chỉ đi một chiều; một tác vụ đã `completed`, `failed` hoặc `cancelled` vĩnh viễn không thể bị ghi đè.
- **Lớp 4 - Bọc dữ liệu ngoại lai:** Mọi trang web tải về đều được gọt sạch mã độc và bao bọc trong nhãn cảnh báo để ngăn Prompt Injection.

---

## 4. Kế hoạch Chuyển tiếp sang Phase 2: Advanced
Sau khi vượt qua Phase Gate B10, nền tảng cơ bản đã vững chắc. Phase 2 (Advanced) sẽ tập trung vào các năng lực thích ứng nâng cao:
1. **Dynamic Hierarchical Planning:** Kế hoạch phân cấp nhiều tầng, cho phép Agent tự động rẽ nhánh các câu hỏi con và thực thi song song.
2. **Bộ nhớ Ngữ nghĩa & RAG (Memory & RAG Pipeline):** Tích hợp Vector Database (pgvector / Chroma), lưu trữ thông tin học được qua các phiên làm việc và tìm kiếm tri thức ngữ nghĩa lai (Hybrid Search).
3. **Multi-Agent Collaboration:** Mô hình điều phối nhiều chuyên gia (Specialist Agents) và tranh biện phản biện (Adversarial Critique / Devil's Advocate) để nâng cao chất lượng báo cáo nghiên cứu.
