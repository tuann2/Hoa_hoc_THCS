# WORKFLOW-012 Implementation Handoff

## Status

- Remediation state: RELEASE_READY — thay đổi đã áp dụng đúng nguyên văn bản mà
  tuann2 duyệt; chờ merge.
- Risk tier / categories / escalation rationale: CRITICAL. Không sửa file kiến
  trúc, nhưng gỡ bỏ một điều khoản `AGENTS.md` mà con người đã phê duyệt sáng
  cùng ngày. Đảo ngược một quyết định quản trị đã duyệt thì đi đường nặng, bất
  kể chiều thay đổi. Xem `docs/plans/WORKFLOW-012-Coordinator-Role.md`.
- Base SHA / candidate SHA: `c3cc5ee` / UNCOMMITTED khi soạn; ghi bổ sung sau
  khi commit.
- Worktree state and dirty paths: sạch ngoài phạm vi; 4 file (2 file thay đổi,
  plan, handoff này).
- CI reference for exact candidate (when required/available): PENDING

## Summary and scope

- Requested scope and outcome: gỡ hai lệch giữa `AGENTS.md` và kiến trúc. Hoàn
  thành đủ, không phát sinh.
- Files changed: `AGENTS.md` (mục 2 và mục 7),
  `docs/handoffs/_TEMPLATE.md` (đoạn dưới bảng Role execution log),
  `docs/plans/WORKFLOW-012-Coordinator-Role.md`, và handoff này.
- `git diff --stat`: 2 file quy tắc — 11 insertions(+), 6 deletions(-).

## Role execution log

| Role                 | Executing agent               | Model / effort | Human confirmer + timestamp | Execution evidence                                        |
| -------------------- | ----------------------------- | -------------- | --------------------------- | --------------------------------------------------------- |
| Planner              | Claude Code (execution A)     | high           | tuann2, 2026-07-27          | Soạn plan, nhận 2 vòng thẩm định kế hoạch, viết lại 2 lần |
| Implementer          | Claude Code (execution A)     | —              | tuann2, 2026-07-27          | Chép nguyên văn câu chữ đã duyệt; xem sai lệch 2          |
| Independent Reviewer | **không thực hiện**           | —              | —                           | Xem sai lệch 1                                            |
| Release Assessor     | **không thực hiện bởi agent** | —              | —                           | tuann2 thực thi quyền Human Approver trực tiếp; xem dưới  |

**Ngoại lệ được ghi nhận theo đúng quy tắc mới vừa thêm.** Quy tắc mới trong
chính `_TEMPLATE.md` này viết: _"Each row must name a different execution; one
execution holding two roles is an architecture deviation requiring recorded
CRITICAL-level human approval."_ Biên bản này có hai dòng cùng execution A. Điều
kiện ngoại lệ đã thoả: tier là CRITICAL và tuann2 phê duyệt trực tiếp sau khi
đọc nguyên văn diff. Đây là ca đầu tiên đi qua đường ngoại lệ đó, và nó được ghi
ra chứ không lách.

## Acceptance, decisions, and risks

| Plan acceptance criterion                                                   | Evidence / status                                                                                                                                    |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mục 2 kích hoạt trước khi hành động trong vai và trước khi đề xuất phân vai | Đạt — câu mới nêu cả ba tình huống: vai từ dispatch của con người, tự điền tên mình vào bảng phân vai, và giới hạn chỉ đọc hợp đồng vai mình sắp giữ |
| Mục 7 không còn cho phép một execution giữ nhiều vai                        | Đạt — câu cũ bị thay bằng phát biểu khớp kiến trúc dòng 45                                                                                           |
| `_TEMPLATE.md` không còn câu cho phép kiêm nhiệm                            | Đạt — dòng 26–28 đã thay; bảng 4 dòng vai giữ nguyên                                                                                                 |
| Không thêm vai mới, không sửa kiến trúc, không sửa hợp đồng vai             | Đạt — `git diff --stat` chỉ có 2 file quy tắc                                                                                                        |
| Hai vòng independent review, một adversarial                                | **KHÔNG đạt** — sai lệch 1, tuann2 duyệt trực tiếp thay thế                                                                                          |

- Design decisions: giữ nguyên hai phần còn lại của mục 7 (phân biệt xác nhận
  phạm vi với xác nhận vai; nghĩa vụ chuyển tiếp xác nhận) vì cả hai không mâu
  thuẫn kiến trúc và đã chứng minh có tác dụng thật trong phiên 2026-07-26/27.
- Deviations: hai cái, ghi đầy đủ trong plan §Status — bỏ qua yêu cầu thẩm định
  của chính plan, và Implementer là Claude Code thay vì Codex.
- Blockers: không.
- Remaining risks / follow-up: câu chữ mới chưa qua bất kỳ vòng thẩm định agent
  nào. Rủi ro chính là diễn giải sai trong tương lai chứ không phải sai hôm nay,
  vì con người đã đọc nguyên văn. Nếu về sau thấy mơ hồ, sửa là việc TRIVIAL/
  NORMAL nhỏ.

## Validation evidence

Sẽ điền sau khi commit, đo trên worktree sạch để snapshot bind đúng candidate.

## Independent verification

- Verifier / execution identifier / independence method: **không có.** Plan yêu
  cầu hai reviewer ở tier CRITICAL; tuann2 chọn duyệt trực tiếp nguyên văn diff.
  Ghi thành sai lệch 1 thay vì bỏ qua im lặng.
- Exact candidate CI status: PENDING
- Findings and disposition: n/a — không có vòng thẩm định nào để sinh finding.
- Batch-content exception authorization: n/a

## Release Assessment

**Không thực hiện bởi agent, và đây là lựa chọn có chủ đích.**

Nếu Claude Code nhận thêm vai này thì đó là execution A giữ **ba** vai, làm ngoại
lệ phình rộng hơn mức cần. Thay vào đó ghi nhận: tuann2 đã đọc nguyên văn ba
thay đổi câu chữ và duyệt trực tiếp ngày 2026-07-27. Đó là quyền Human Approver
— theo Responsibility Matrix, quyền này cao hơn và không thể thay thế bằng đánh
giá của agent. Nói cách khác bước đánh giá phát hành không bị bỏ qua; nó được
thực hiện ở cấp cao hơn.

Quyền merge vẫn thuộc tuann2.
