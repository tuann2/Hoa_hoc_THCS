# WORKFLOW-007: Branch-hygiene gate chống context drift

## Status

- Status: APPROVED
- Owner: Claude Code
- Approved by / date: tuann2, 2026-07-26
- Risk tier: ELEVATED
- Risk categories and escalation rationale: script + CI mới quyết định
  cảnh báo/chặn dựa trên logic phức tạp (so sánh nội dung/tuổi nhánh) —
  governance-enforcement tooling, cùng lớp rủi ro với 004C (classifier
  TRIVIAL). Không sửa `docs/architecture/AI_WORKFLOW_ARCHITECTURE.md`;
  nếu sau này cần bật fail-closed hoặc đổi thành rule bắt buộc trong
  architecture, đó là quyết định/leo thang riêng, không tự động trong
  plan này.
- Change type and required gate profile: `scripts/**` + `.github/**`;
  `scripts/gates-manifest.ts` profile `full`.
- Phụ thuộc: `docs/plans/WORKFLOW-006-Input-Token-Cost-Audit.md` Phase
  A (bảng nhánh lệch/không lệch) dùng làm fixture test thực tế cho
  script này. Có thể triển khai song song nếu cần, nhưng nên đợi Phase
  A xong để có fixture thật thay vì bịa case.

## Objective and scope

- Objective: tự động phát hiện khi một nhánh feature dài ngày có
  `CLAUDE.md`/`AGENTS.md`/`docs/CONTEXT_RULES.md` lệch khỏi `main`, để
  bắt lại đúng sự cố đã gây ra ở `feature/FEATURE-016` (toàn bộ $80,79
  chạy trên mandatory-context "trước 004B" vì nhánh tạo lệch thời điểm
  merge — xem `WORKFLOW-006` "Motivating finding") tự động, trước khi
  nó tốn tiền lần nữa, thay vì phải phát hiện thủ công sau khi feature
  đã đóng.
- In scope:
  - Script so `CLAUDE.md`, `AGENTS.md`, sự tồn tại của
    `docs/CONTEXT_RULES.md` giữa một nhánh và `main` tại thời điểm CI
    chạy.
  - Ngưỡng tuổi nhánh (ví dụ 3 ngày hoặc 5 commit kể từ khi `main` cập
    nhật các file đó lần cuối) — dưới ngưỡng thì im lặng, tránh làm ồn
    nhánh mới tạo đang đồng bộ bình thường.
  - CI job **warn-only** ở lần triển khai đầu: in cảnh báo rõ ràng
    (nhánh nào, lệch từ commit nào, cách sửa — rebase/merge từ `main`),
    không fail build.
  - Unit test script dùng fixture lấy từ bảng nhánh của `WORKFLOW-006`
    Phase A (nhánh đã biết lệch: `FEATURE-014`, `FEATURE-016`; nhánh
    đã biết không lệch: ít nhất 2 trong số 4 nhánh sạch đã ghi).
- Out of scope:
  - Bật fail-closed (chặn merge) — quyết định riêng sau ≥ 2 tuần quan
    sát không có false-positive, ghi trong handoff của lần bật, không
    tự động trong plan này.
  - Biến ngưỡng/hành vi này thành rule trong architecture — nếu muốn,
    đó là amendment CRITICAL riêng (tiền lệ 004C: enforcement tooling
    không tự nó sửa architecture).
  - Tự động gắn label/comment lên PR GitHub — output chỉ ở CI log, theo
    đúng quy mô hiện tại của repo (tiền lệ 004C cũng bỏ qua auto-label).

## Current analysis and design

- Current behavior: không có cơ chế nào phát hiện một nhánh feature bị
  tạo/rebase lệch khỏi các file mandatory-context của `main`. Sự cố chỉ
  lộ ra khi đo billing sau khi feature đã đóng (`WORKFLOW-006`).
- Proposed design: `scripts/check-branch-context-drift.ts` (tên tạm),
  input là base ref (mặc định `origin/main`) + nhánh hiện tại; dùng
  `git cat-file`/`git show` đọc nội dung `CLAUDE.md`, `AGENTS.md`, và
  test tồn tại `docs/CONTEXT_RULES.md` ở cả hai phía; nếu khác nhau,
  tính tuổi nhánh bằng commit đầu tiên khác `main` (`git merge-base`);
  vượt ngưỡng thì in cảnh báo có cấu trúc (nhánh, base, file lệch, gợi ý
  lệnh sửa: `git merge origin/main` hoặc `git rebase origin/main`).
  Không dùng LLM — thuần đọc git object, deterministic, test được, cùng
  triết lý với `classify-trivial.ts` của 004C.
- New technology: none.

## Delivery plan

Execution assignment:

| Vai trò              | Agent đề xuất                                      | Model / effort đề xuất              | Lý do                                                                                                                                                          |
| -------------------- | -------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Planner              | Claude (đã làm)                                    | —                                   | Plan này                                                                                                                                                       |
| Implementer          | Codex qua `codex:codex-rescue`                     | effort medium (script nhỏ, có test) | Script + CI wiring là "substantial implementation", phải delegate theo CLAUDE.md; tên model cụ thể xác minh hiện hành trước khi gọi, theo D.1 của WORKFLOW-006 |
| Independent Reviewer | Codex adversarial (fresh) qua `codex:codex-rescue` | effort high                         | ELEVATED cần 1 fresh reviewer đọc mọi dòng đổi                                                                                                                 |
| Release Assessor     | Claude                                             | —                                   | Theo Responsibility Matrix                                                                                                                                     |

1. **Implementation (Codex, delegate):** viết
   `scripts/check-branch-context-drift.ts` + unit test (fixture từ
   `WORKFLOW-006` Phase A) + wiring CI job warn-only theo "Proposed
   design". `<action_safety>Không commit, không push.</action_safety>`
2. **Validation and evidence:** gate profile `full` trên các file đổi
   (`scripts/**`, `.github/**`); toàn bộ test hiện có vẫn pass.
3. **Review / handoff:** fresh Codex adversarial review — tập trung:
   script có false-positive (báo động nhánh không thực sự lệch, ví dụ
   do rename file) hay false-negative (bỏ sót lệch thực sự, ví dụ khác
   nội dung nhưng cùng kích thước byte) rõ ràng không; warn-only có
   thực sự không chặn CI khi test tự thất bại không (tránh biến "warn"
   thành "fail" ngoài ý muốn). Handoff tại
   `docs/handoffs/WORKFLOW-007-implementation.md`. Human Approval trước
   khi merge (thay đổi CI).

## Risks and controls

| Risk                                                                                           | Impact                                                  | Mitigation                                                                                             |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| False-positive chặn nhánh dài ngày hợp lệ đang làm CRITICAL                                    | Áp lực bypass gate, giảm tin cậy vào cảnh báo tương lai | Warn-only ở lần triển khai đầu; fail-closed là quyết định duyệt riêng sau quan sát                     |
| False-negative (script không bắt được kiểu lệch khác, ví dụ chỉ `docs/roles/*` thiếu)          | Sự cố tương tự tái diễn dưới dạng khác                  | Review adversarial nhắm đúng chỗ này; test case dựa trên toàn bộ 3 file mandatory, không chỉ CLAUDE.md |
| Script tự nó trở thành nguồn drift (không cập nhật khi 004-series đổi thêm file mandatory nữa) | Gate lỗi thời, báo sai                                  | Ghi rõ trong comment script: danh sách file kiểm phải đồng bộ tay với Context Policy khi có amendment  |

## Acceptance and recovery

- [ ] Script phát hiện đúng mọi nhánh đã biết lệch trong bảng
      `WORKFLOW-006` Phase A, không báo động nhánh đã biết sạch.
- [ ] CI job chạy warn-only, không fail build hiện tại của bất kỳ nhánh
      nào đang mở.
- [ ] Unit test cho ít nhất: nhánh lệch quá ngưỡng, nhánh lệch dưới
      ngưỡng (im lặng), nhánh không lệch, nhánh không tồn tại
      `docs/CONTEXT_RULES.md` ở cả hai phía (không phải lỗi).
- [ ] Independent Reviewer không còn finding mở.
- Security considerations: script chỉ đọc git metadata/object, không
  chạy input tự do qua shell; không đổi RLS/auth/deploy.
- API/database impact: none.
- Test strategy: unit test script (case bảng trên); CI xanh trên
  candidate.
- Rollback plan: một script + một CI job riêng biệt; tắt job hoặc revert
  1 commit không ảnh hưởng gate nào khác.
