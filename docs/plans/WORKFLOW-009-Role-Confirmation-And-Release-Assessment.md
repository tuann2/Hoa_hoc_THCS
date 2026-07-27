# WORKFLOW-009: Xác nhận vai trò từng bước và bắt buộc ghi Release Assessment

## Status

- Status: APPROVED <!-- DRAFT | APPROVED | SUPERSEDED -->
- Owner: Claude Code (Planner; dispatch của tuann2 ngày 2026-07-26)
- Approved by / date: tuann2, 2026-07-26 (duyệt nội dung plan trong PR #33)
- Risk tier: ELEVATED
- Risk categories and escalation rationale: governance policy điều khiển cách
  mọi execution sau này nhận vai và tự khai trạng thái phát hành. Không thuộc
  rule 2 (không sửa `docs/architecture/AI_WORKFLOW_ARCHITECTURE.md`, không đụng
  deploy/CI/trust boundary) nên không CRITICAL; nhưng theo rule 7, thay đổi
  governance mà phân loại còn dao động giữa NORMAL và ELEVATED thì lấy tier cao
  hơn. ELEVATED ⇒ một reviewer độc lập tươi đọc từng dòng đổi.
- Change type and required gate profile: docs (governance); profile do
  `scripts/gates-manifest.ts` chọn.

## Objective and scope

- Objective: đóng hai lỗ hổng đã hiện ra ở WORKFLOW-008 — vai trò bị dồn vào một
  agent, và một vai được tự nhận rồi bỏ qua mà không gì phát hiện.
- In scope: `docs/handoffs/_TEMPLATE.md`, `docs/plans/_TEMPLATE.md`, `AGENTS.md`,
  và một điều khoản grandfather cho handoff cũ.
- Out of scope: sửa `docs/architecture/AI_WORKFLOW_ARCHITECTURE.md` (quyết định
  của tuann2 — Responsibility Matrix đã cấm sẵn, vấn đề là không ai cưỡng chế);
  thêm gate máy vào `scripts/**` (tuann2 chọn hướng template + xác nhận người,
  không phải cưỡng chế bằng máy); đánh giá hồi tố 11 handoff cũ; đưa ranh giới
  "what Claude may edit directly" trở lại governance (follow-up riêng, đang treo
  từ WORKFLOW-008).

## Current analysis and design

Bằng chứng khảo sát toàn bộ 24 handoff trong `docs/handoffs/`:

| Sự kiện                                                   | Số lượng                      |
| --------------------------------------------------------- | ----------------------------- |
| Handoff **không có** mục Release Assessment               | 22/24                         |
| Handoff khai `RELEASE_READY` mà không có bản đánh giá kèm | 11                            |
| Handoff có mục Release Assessment                         | 2 (FEATURE-015, WORKFLOW-008) |

Architecture bắt buộc bước release assessment (dòng 188 và mục "Release
assessment" dòng 191) và định nghĩa `RELEASE_READY` là "an assessment, not Human
Approval" (dòng 287). Nhưng `docs/handoffs/_TEMPLATE.md` dừng ở mục
`## Independent verification` — **không có slot nào để ghi đánh giá đó**. Không
có slot thì không ai điền; không ai điền thì việc bỏ bước không để lại dấu vết.
WORKFLOW-008 chỉ lộ ra vì con người đọc và bắt được.

Thiết kế, theo lựa chọn của tuann2 (template + xác nhận người từng vai):

1. **`docs/handoffs/_TEMPLATE.md`** — thêm hai mục bắt buộc: `## Role execution
log` (bảng: vai trò | agent thực thi | model/effort | người xác nhận + thời
   điểm | bằng chứng đã thực thi) và `## Release Assessment`. Một handoff không
   được khai `RELEASE_READY` khi mục Release Assessment còn trống.
2. **`docs/plans/_TEMPLATE.md`** — bảng Execution assignment thêm cột trạng thái
   xác nhận, để phần "đề xuất" và phần "đã được duyệt" không lẫn vào nhau.
3. **`AGENTS.md`** — thêm một mục: trước khi nhận bất kỳ vai nào, execution phải
   nêu rõ vai đó với con người và nhận xác nhận **riêng cho vai đó**; ghi vào
   role execution log. Một dispatch xác nhận _phạm vi công việc_ ("làm PR1 và
   PR2 luôn") không đồng thời xác nhận _vai trò_. Một agent giữ từ hai vai trở
   lên phải nói rõ điều đó và lý do khi xin xác nhận, để con người thấy mình
   đang chấp nhận việc giảm tính độc lập.
4. **Grandfather** — quy tắc chỉ áp cho handoff tạo từ ngày APPROVED trở đi.
   Handoff trước mốc đó giữ nguyên, không viết lại lịch sử. Ghi mốc cắt ngay
   trong `docs/handoffs/_TEMPLATE.md`.

- New technology: không có.
- Execution profile + degradation path: Implementer cần repo-rw + shell để chạy
  gate docs. Nếu thiếu, báo blocked thay vì tự khai gate pass.

## Delivery plan

Execution assignment — mỗi dòng cần con người xác nhận riêng khi đến lượt vai đó;
duyệt nội dung plan không tự động duyệt việc nhận vai kế tiếp. Cột cuối để trống
cho đến khi có xác nhận thật:

| Vai trò              | Agent đề xuất                | Model / effort | Lý do                                                                                                                                                                              | Đã xác nhận                                  |
| -------------------- | ---------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Planner              | Claude Code                  | high           | Đã khảo sát 24 handoff và định vị nguyên nhân cấu trúc; bản DRAFT này là kết quả.                                                                                                  | tuann2, 2026-07-26 (dispatch "hãy lên plan") |
| Implementer          | Codex (`codex:codex-rescue`) | medium         | **Không tự nhận.** Văn bản sửa đổi ràng buộc chính hành vi của Claude Code; để Claude tự viết luật cho mình là xung đột lợi ích, độc lập với chuyện nó có "substantial" hay không. | tuann2, 2026-07-26                           |
| Independent Reviewer | Codex fresh (`--fresh`)      | high           | ELEVATED cần một reviewer tươi đọc từng dòng đổi; phải là execution khác với Implementer.                                                                                          | chưa                                         |
| Release Assessor     | Claude Code                  | low            | Bắt buộc khác Implementer. Claude nhận vai này được vì không phải người viết diff.                                                                                                 | chưa                                         |

1. Sửa `docs/handoffs/_TEMPLATE.md` (Role execution log, Release Assessment,
   điều khoản grandfather).
2. Sửa `docs/plans/_TEMPLATE.md` (cột xác nhận trong Execution assignment).
3. Sửa `AGENTS.md` (quy tắc xác nhận riêng từng vai).
4. `npm run gates -- --changed-from=<base_sha>`, `npm run evidence`, handoff —
   và chính handoff này là ca thử đầu tiên của template mới.

## Risks and controls

| Risk                                              | Impact                                     | Mitigation                                                                                                       |
| ------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Thêm thủ tục làm mọi việc nhỏ nặng nề hơn         | Người dùng bỏ qua quy tắc, quay lại như cũ | Chỉ bắt buộc với công việc có plan + handoff (non-TRIVIAL). TRIVIAL vẫn dùng micro-trace, không đụng tới.        |
| Quy tắc nằm trong docs, vẫn dựa vào tự giác       | Vẫn có thể bị bỏ qua như lần này           | Role execution log để trống là dấu vết nhìn thấy được; đây là điểm yếu đã biết của phương án, ghi rõ ở mục dưới. |
| Grandfather bị hiểu là xoá trách nhiệm handoff cũ | Hồ sơ lịch sử bị hiểu sai                  | Mốc cắt ghi rõ trong template kèm lý do; không sửa và không tô hồng 11 handoff cũ.                               |
| Claude tự viết ràng buộc cho chính mình           | Điều khoản được nới lỏng một cách tinh vi  | Implementer là Codex, reviewer là Codex fresh; Claude chỉ giữ vai Planner và Release Assessor.                   |

## Acceptance and recovery

- [ ] `docs/handoffs/_TEMPLATE.md` có mục `## Role execution log` và
      `## Release Assessment`, kèm điều kiện cấm khai `RELEASE_READY` khi mục
      Release Assessment trống, và điều khoản grandfather có mốc ngày.
- [ ] `docs/plans/_TEMPLATE.md` có cột trạng thái xác nhận trong bảng Execution
      assignment.
- [ ] `AGENTS.md` có quy tắc xác nhận riêng từng vai, nói rõ xác nhận phạm vi
      công việc không phải xác nhận vai trò.
- [ ] Handoff của chính WORKFLOW-009 dùng template mới và điền đủ cả hai mục —
      nếu không điền nổi thì template hỏng, phải sửa trước khi merge.
- [ ] Một reviewer độc lập tươi đã đọc từng dòng đổi (yêu cầu của ELEVATED).
- Security considerations: không đụng auth, secret, dependency, CI/deploy.
- API/database impact: không.
- Test strategy: gate docs; không có mã nên không có test tự động. Kiểm nghiệm
  thật nằm ở tiêu chí 4 — template phải dùng được cho chính plan này.
- Rollback plan: docs-only, một commit → `git revert <sha>`; template cũ lấy lại
  bằng `git show <sha>^:<path>`.

## Điểm yếu đã biết của phương án này

Phương án dựa vào tài liệu và kỷ luật, không có gate máy. Chính WORKFLOW-008
chứng minh tài liệu không ngăn được việc bỏ bước: quy tắc "xác nhận riêng từng
vai" đã tồn tại như một quy ước trước đó mà vẫn bị bỏ qua. Nếu sau một thời gian
role execution log vẫn bị để trống, bước tiếp theo là gate máy (handoff khai
`RELEASE_READY` mà thiếu mục Release Assessment thì fail) — tier ELEVATED, đụng
`scripts/**`, cần plan riêng.
