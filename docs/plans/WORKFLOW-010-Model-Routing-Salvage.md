# WORKFLOW-010: Cứu hướng dẫn chọn model vào runbook, chống mục theo thời gian

## Status

- Status: APPROVED <!-- DRAFT | APPROVED | SUPERSEDED -->
- Owner: Claude Code (Planner; dispatch của tuann2 ngày 2026-07-26)
- Approved by / date: tuann2, 2026-07-26 (duyệt nội dung plan trong PR #34)
- Risk tier: NORMAL
- Risk categories and escalation rationale: documentation (runbook) + config nhỏ
  của công cụ agent. Không đụng mã ứng dụng, gate, CI/deploy, architecture hay
  trust boundary. Tiền lệ WORKFLOW-006 cũng sửa `.codex/config.toml` ở NORMAL.
  TRIVIAL bị cấm cho `docs/runbooks/**` nên NORMAL là mức thấp nhất hợp lệ.
- Change type and required gate profile: docs; profile do
  `scripts/gates-manifest.ts` chọn.

## Objective and scope

- Objective: cứu hướng dẫn chọn model/effort đang mắc kẹt trên nhánh
  `chore/model-routing-config` vào đúng chỗ theo kiến trúc provider-neutral, và
  viết lại sao cho khi tên model đổi thì tài liệu tự lộ ra là đã cũ.
- In scope: `docs/runbooks/providers/antigravity.md`,
  `docs/runbooks/providers/codex.md`, `.codex/config.toml`, xoá nhánh
  `chore/model-routing-config` sau khi cứu xong.
- Out of scope: nhánh `codex/feature-015-chuan-hoa-noi-dung-hoc` (158 MB ảnh —
  việc riêng, cần tuann2 xác nhận đã có bản sao trước); sửa
  `AI_WORKFLOW.md`/`AGENTS.md` (mục agy ở đó đã bị WORKFLOW-004B xoá có chủ ý để
  provider-neutral, không khôi phục); WORKFLOW-009 đang mở ở PR #33.

## Current analysis and design

Nhánh `chore/model-routing-config` (1 commit, 2026-07-16) đã bị main vượt qua
gần hết: `.codex/config.toml` trên main có `gpt-5.6-terra` rồi (qua
WORKFLOW-006); phần `CLAUDE.md` sửa một cấu trúc không còn tồn tại (rút thành
`@AGENTS.md` ở `5e4edcb`); phần `AI_WORKFLOW.md` sửa mục "Invoking Gemini (agy)"
mà WORKFLOW-004B đã xoá.

Còn đúng hai thứ có giá trị và **không tồn tại ở bất kỳ đâu trên main**:

1. Tiêu chí chọn reviewer `agy`: model lớp "code/diff/lockfile" so với lớp
   "tài liệu/learning content".
2. Phân biệt model+effort cho **phiên CLI tương tác** và cho **delegation qua
   subagent** — `.codex/config.toml` chỉ áp cho vế đầu.

`docs/runbooks/providers/antigravity.md` hiện chỉ nói dùng `agy models` để xem
model có sẵn, không có tiêu chí chọn. `docs/runbooks/providers/codex.md` không
nói gì về model hay effort.

**Vấn đề tên model mục nhanh.** Chạy `agy models` ngày 2026-07-26 trả về ID thật
dạng `claude-opus-4-6-thinking`, `gemini-3.6-flash-high`, trong khi mọi tài liệu
trong repo ghi dạng `"Claude Opus 4.6 (Thinking)"`, `"Gemini 3.5 Flash (High)"`
— và `gemini-3.6` đã ra trong khi docs vẫn khuyên `3.5`. `gpt-5.4` từng chết 404
(WORKFLOW-005). Nên thiết kế phải tách hai tầng:

- **Tiêu chí chọn** (bền): việc gì cần lớp model nào. Không nhắc tên cụ thể.
- **Bảng tên đã xác minh** (mau cũ): ID chính xác + ngày xác minh + lệnh tự
  kiểm lại (`agy models`, Codex `/status`). Ai đọc thấy ngày cũ thì biết phải
  kiểm lại trước khi dùng.

Implementer phải chạy `agy models` và kiểm model Codex tại thời điểm thực thi,
dán kết quả vào handoff — không chép tên từ plan này hay từ nhánh cũ.

**Quyết định của tuann2 (2026-07-26):** `.codex/config.toml` đổi
`model_reasoning_effort` từ `"high"` xuống `"medium"`. Chỉ áp cho phiên CLI
tương tác; delegation qua subagent truyền effort riêng theo từng việc.

- New technology: không có.
- Execution profile + degradation path: Implementer cần repo-rw + shell để chạy
  `agy models`. Nếu `agy` không chạy được, ghi blocked cho phần bảng tên và vẫn
  làm được phần tiêu chí chọn — không được bịa ID.

## Delivery plan

Execution assignment — mỗi dòng cần xác nhận riêng khi đến lượt vai đó:

| Vai trò              | Agent đề xuất                | Model / effort | Lý do                                                                                                                               | Đã xác nhận                                      |
| -------------------- | ---------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Planner              | Claude Code                  | high           | Đã đối chiếu nhánh cũ với main và chạy `agy models` để phát hiện độ lệch tên.                                                       | tuann2, 2026-07-26 (dispatch "làm việc 1 trước") |
| Implementer          | Codex (`codex:codex-rescue`) | medium         | Không tự nhận: runbook này quy định chính việc tôi dispatch ai. Codex chạy được `agy models` để lấy ID thật.                        | tuann2, 2026-07-26                               |
| Independent Reviewer | agy                          | xem ghi chú    | NORMAL không bắt buộc reviewer, nhưng đây là tài liệu về **chính agy** — nó tự liệt kê được model của mình, kiểm ID rẻ và đáng tin. | chưa                                             |
| Release Assessor     | Claude Code                  | low            | Khác Implementer, đúng yêu cầu tách vai.                                                                                            | chưa                                             |

1. Chạy `agy models` và kiểm model Codex hiện hành; ghi nguyên văn vào handoff.
2. `docs/runbooks/providers/antigravity.md` — thêm mục chọn model: tiêu chí
   theo loại việc, bảng ID đã xác minh kèm ngày, lệnh tự kiểm lại.
3. `docs/runbooks/providers/codex.md` — thêm mục model/effort, nói rõ
   `.codex/config.toml` chỉ áp cho phiên CLI tương tác, không áp cho delegation.
4. `.codex/config.toml` — áp quyết định effort của tuann2, ghi chú phân biệt
   tương tác/delegation.
5. Gate + evidence + handoff. Sau khi merge, xoá nhánh `chore/model-routing-config`.

## Risks and controls

| Risk                                          | Impact                               | Mitigation                                                                                            |
| --------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Chép lại tên model đã chết                    | Runbook dẫn người dùng tới model 404 | Bắt buộc chạy `agy models` lúc thực thi; cấm chép tên từ plan hoặc nhánh cũ; dán kết quả vào handoff. |
| Bảng tên lại mục sau vài tuần                 | Lặp lại đúng vấn đề đang sửa         | Tách tiêu chí chọn (bền) khỏi bảng tên (mau cũ); bảng có ngày xác minh + lệnh tự kiểm.                |
| Xoá nhánh làm mất nội dung chưa cứu hết       | Mất thông tin                        | Chỉ xoá sau khi merge; commit `00d1224` vẫn lấy lại được nếu ref còn, và diff đã trích đủ trong plan. |
| Đổi effort xuống `medium` làm giảm chất lượng | Phiên Codex tương tác kém đi         | Quyết định thuộc tuann2 khi duyệt plan; chỉ áp cho phiên tương tác, delegation truyền effort riêng.   |

## Acceptance and recovery

- [ ] `antigravity.md` có tiêu chí chọn model theo loại việc + bảng ID đã xác
      minh kèm ngày + lệnh tự kiểm lại.
- [ ] `codex.md` có mục model/effort và nói rõ ranh giới tương tác vs delegation.
- [ ] `.codex/config.toml` phản ánh quyết định effort của tuann2.
- [ ] Handoff có kết quả `agy models` nguyên văn tại thời điểm thực thi.
- [ ] Nhánh `chore/model-routing-config` đã xoá sau khi merge.
- Security considerations: không đụng auth, secret, dependency, CI/deploy.
- API/database impact: không.
- Test strategy: gate docs; không có mã nên không có test tự động.
- Rollback plan: docs-only → `git revert <sha>`.
