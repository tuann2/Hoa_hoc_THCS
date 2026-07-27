# WORKFLOW-012: Làm hợp đồng vai được đọc đúng lúc, và gỡ mâu thuẫn của mục 7

## Status

- Status: DRAFT <!-- DRAFT | APPROVED | SUPERSEDED -->
- Owner: Claude Code (Planner; dispatch của tuann2 ngày 2026-07-27)
- **Revision 1 (2026-07-27) — viết lại toàn bộ theo thẩm định kế hoạch vòng 1.**
  Vòng 1 ra CHANGES_REQUESTED với 4 lỗi chặn. Bản đầu đề xuất dựng một vai
  "điều phối" mới dựa trên tiền đề **sai**; xem mục "Tiền đề sai của bản đầu".
  Bản này bỏ hẳn vai mới, thu phạm vi về đúng khoảng trống đã kiểm chứng.
- Approved by / date:
- Risk tier: ELEVATED
- Risk categories and escalation rationale: governance shim. Thay đổi này
  **siết** `AGENTS.md` cho khớp kiến trúc chứ không đổi mô hình trách nhiệm hay
  quyền hạn — nó gỡ bỏ một điều khoản đang cho phép nhiều hơn kiến trúc cho
  phép. Thẩm định vòng 1 lập luận rằng "ảnh hưởng tới kiến trúc" là CRITICAL kể
  cả khi không sửa file đó; lập luận ấy đúng với bản đầu (bản đầu **mở rộng**
  quyền, thêm vai mới). Bản này đi ngược chiều: không thêm quyền, không thêm
  vai, chỉ bỏ phần vượt quyền và sửa điều kiện kích hoạt của một câu lệnh đọc.
  Theo Risk Model rule 7, vẫn lấy tier cao hơn giữa NORMAL và ELEVATED.
  **Điểm này cần thẩm định vòng 2 phản biện trực tiếp.**
- Thẩm định kế hoạch: BẮT BUỘC (ELEVATED). Vòng 1 đã chạy — CHANGES_REQUESTED.
  Bản revision 1 này cần vòng 2.
- Change type and required gate profile: docs (governance); profile do
  `scripts/gates-manifest.ts` chọn.

## Tiền đề sai của bản đầu, ghi lại để không lặp

Bản đầu khẳng định ranh giới "việc nào tự làm, việc nào giao đi" đã bị commit
`5e4edcb` xoá và **không chuyển đi đâu**. Sai. Thẩm định vòng 1 chỉ ra, và
Planner đã kiểm chứng:

- `docs/roles/planner.md:40` — "Do not implement substantial features..."
- Responsibility Matrix, dòng Planner, cột Must not — "implement substantial
  features or give final approval"

Bản đầu còn mô tả sai nội dung cũ. Nguyên văn `CLAUDE.md` trước khi xoá là
"Substantial implementation (new features, new components, schema changes) must
be delegated to Codex" — tức một quy tắc về **loại việc**, không phải danh sách
trắng kiểu "ngoài danh sách thì phải giao".

Luật đã được chuyển đúng chỗ khi bỏ tên nhà cung cấp cụ thể. **Không có luật nào
bị mất.** Vì vậy bản đầu đi dựng lại một thứ vẫn đang tồn tại, và tệ hơn, đề
xuất một vai mới nằm ngoài danh sách 4 vai của phong bì thực thi.

## Objective and scope

- Objective: đóng hai khoảng trống đã kiểm chứng, cả hai đều là **lệch giữa
  `AGENTS.md` và kiến trúc**, không phải thiếu luật.
- In scope: `AGENTS.md` — sửa mục 2 và mục 7. Handoff của plan này.
- Out of scope: tạo vai mới; sửa `docs/architecture/AI_WORKFLOW_ARCHITECTURE.md`;
  sửa bốn hợp đồng vai; cổng thẩm định kế hoạch theo mức rủi ro (xem Follow-up).

## Current analysis and design

### Khoảng trống 1 — hợp đồng vai được đọc quá muộn

`AGENTS.md:12` hiện là:

> `2. Read the contract for assigned_role in docs/roles/<role>.md.`

Điều kiện kích hoạt là **đã có `assigned_role`**, tức sau khi vai được giao. Nhưng
hành vi cần được ràng buộc lại xảy ra **trước** đó: khi một execution soạn bảng
phân vai trong kế hoạch, hoặc nhận một dispatch của con người rồi tự hiểu mình
đang ở vai nào.

Sự cố WORKFLOW-008 chính là ca đó: execution soạn bảng phân vai và tự điền mình
vào ba dòng mà **chưa từng đọc `planner.md`** — nơi có sẵn câu cấm. Luật có, chỉ
là chưa tới mắt người đọc vào lúc nó có tác dụng.

Sửa: đổi điều kiện kích hoạt từ "sau khi được giao vai" sang "trước khi hành động
trong một vai, kể cả khi vai đến từ dispatch của con người chứ không phải phong
bì hình thức; và trước khi đề xuất phân vai cho bất kỳ ai".

### Khoảng trống 2 — mục 7 đang cho phép nhiều hơn kiến trúc

`AGENTS.md` mục 7, merge ngày 2026-07-27, có câu:

> "An agent accepting two or more roles must state every role and why when
> seeking confirmation, so the human can knowingly accept reduced independence."

Câu này ngụ ý **một execution được giữ từ hai vai trở lên** nếu có công bố.
Kiến trúc dòng 45 nói ngược lại:

> "One provider may perform different roles only in separate executions."

Và chính `AGENTS.md` đoạn cuối tự ràng buộc:

> "the new shim and roles are only a superset that cannot weaken it"

Nên mục 7 đang làm yếu kiến trúc — đúng thứ nó tự tuyên bố không được làm. Đây
là khiếm khuyết trong công việc vừa giao hôm nay, phát hiện gián tiếp qua thẩm
định vòng 1.

Sửa: bỏ phần cho phép kiêm nhiệm; thay bằng phát biểu khớp dòng 45 — vai khác
nhau phải ở execution khác nhau; nếu tình huống thật buộc phải gộp thì đó là sai
lệch so với kiến trúc, cần con người chấp thuận ở mức CRITICAL và ghi chép, chứ
không phải một câu công bố là xong. Giữ nguyên hai phần còn lại của mục 7 (phân
biệt xác nhận phạm vi với xác nhận vai; nghĩa vụ chuyển tiếp xác nhận), vì cả
hai không mâu thuẫn kiến trúc và đều đã chứng minh có tác dụng.

### Vì sao không tạo vai điều phối

Việc mà tuann2 mô tả — đọc kế hoạch, giao vai cho đúng agent, tổng hợp — **đã
thuộc Planner**: Responsibility Matrix ghi Planner sở hữu "requirements, plans,
risk classification, delegation, scope checks, review orchestration". Phần đánh
giá phát hành đã thuộc Release Assessor. Không thiếu vai nào; thêm vai thứ năm
sẽ phải sửa danh sách `assigned_role` trong phong bì, tức sửa kiến trúc, tức
CRITICAL — trả giá lớn cho thứ đã có sẵn.

Hệ quả trực tiếp: một execution **không** được vừa lập kế hoạch vừa đánh giá
phát hành. Đó chính là điều Planner đã làm ở WORKFLOW-011 và bản đầu của plan
này định hợp thức hoá.

- New technology: không có.
- Execution profile + degradation path: Implementer cần repo-rw + shell chạy
  gate docs. Sandbox chặn thì báo blocked, không tự khai gate pass.

## Delivery plan

Execution assignment — mỗi dòng cần xác nhận riêng khi đến lượt vai đó. Theo
kiến trúc dòng 45, mỗi vai phải là một execution khác nhau:

| Vai trò              | Agent đề xuất                    | Model / effort | Lý do                                                                                                                                                                             | Đã xác nhận        |
| -------------------- | -------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Planner              | Claude Code                      | high           | Đã soạn bản đầu, nhận thẩm định, kiểm chứng từng finding và viết lại.                                                                                                             | tuann2, 2026-07-27 |
| Thẩm định kế hoạch   | Codex `gpt-5.6-sol`              | high           | Vòng 1 đã bắt được tiền đề sai và mâu thuẫn với dòng 45 — đúng loại lỗi cần bắt trước khi thành cam kết.                                                                          | tuann2, 2026-07-27 |
| Implementer          | Codex (`codex:codex-rescue`)     | medium         | Không tự nhận: `AGENTS.md` ràng buộc chính hành vi Claude Code.                                                                                                                   | chưa               |
| Independent Reviewer | agy (`claude-opus-4-6-thinking`) | —              | ELEVATED cần reviewer tươi đọc từng dòng, khác Implementer.                                                                                                                       | chưa               |
| Release Assessor     | **execution riêng, chưa chọn**   | —              | Theo dòng 45 không được là execution đang giữ vai Planner. Cần tuann2 chỉ định một execution khác — đây là ràng buộc mới mà chính plan này đặt ra, nên plan phải tuân trước tiên. | chưa               |

1. `AGENTS.md` mục 2: sửa điều kiện kích hoạt việc đọc hợp đồng vai.
2. `AGENTS.md` mục 7: bỏ phần cho phép kiêm nhiệm, thay bằng phát biểu khớp
   kiến trúc dòng 45. Giữ nguyên phần phân biệt phạm vi/vai và phần chuyển tiếp.
3. Gate, bằng chứng, handoff.

## Risks and controls

| Risk                                                         | Impact                      | Mitigation                                                                                                 |
| ------------------------------------------------------------ | --------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Siết mục 7 làm nhiều việc thường ngày bị chặn                | Người dùng bỏ qua quy tắc   | Ràng buộc chỉ áp cho **vai**, không áp cho thao tác thường. Việc không có kế hoạch/handoff không đụng tới. |
| Sửa mục 2 làm mọi phiên phải đọc thêm file                   | Tốn token                   | Chỉ đọc hợp đồng của vai sắp hành động, đúng một file ~180–380 từ, và chỉ khi thật sự nhận vai.            |
| Bản viết lại vẫn còn tiền đề sai chưa lộ                     | Lặp lại thất bại của vòng 1 | Bắt buộc thẩm định vòng 2; plan tự nêu điểm yếu nhất (lập luận về tier) để reviewer công kích trực tiếp.   |
| Ràng buộc "execution riêng" khiến không ai làm được đánh giá | Việc tắc                    | Nếu không tạo được execution độc lập thì trạng thái là BLOCKED và con người quyết, **không** tự miễn trừ.  |

## Acceptance and recovery

- [ ] `AGENTS.md` mục 2 kích hoạt trước khi hành động trong một vai và trước khi
      đề xuất phân vai, không phụ thuộc việc đã có phong bì hình thức hay chưa.
- [ ] `AGENTS.md` mục 7 không còn câu cho phép một execution giữ nhiều vai; có
      phát biểu khớp kiến trúc dòng 45; giữ nguyên phần phân biệt phạm vi/vai và
      phần nghĩa vụ chuyển tiếp.
- [ ] Không thêm vai mới, không sửa file kiến trúc, không sửa hợp đồng vai nào.
- [ ] `AGENTS.md` sau sửa không mâu thuẫn với bất kỳ dòng nào trong Responsibility
      Matrix và Execution envelope — thẩm định vòng 2 và Independent Reviewer
      cùng xác nhận.
- [ ] Release Assessor của chính plan này là execution khác với Planner.
- Security considerations: không đụng auth, secret, dependency, CI/deploy.
- API/database impact: không.
- Test strategy: gate docs. Phép thử thật là tiêu chí 4 — quy tắc mới phải sống
  chung được với luật cũ mà không cần diễn giải.
- Rollback plan: docs-only, `git revert <sha>`.

## Follow-up tách riêng, không làm trong plan này

Cổng thẩm định kế hoạch theo mức rủi ro. Thẩm định vòng 1 kết luận ngưỡng
ELEVATED hợp lý về chính sách nhưng chưa có cơ chế khả thi: chưa có vai
`plan-reviewer` trong danh sách `assigned_role` của phong bì; hợp đồng
Independent Reviewer hiện chỉ nhận "approved plan", không hợp để thẩm định bản
DRAFT; verdict chưa gắn với mã băm của kế hoạch nên sửa sau khi duyệt là thoát;
và người lập kế hoạch tự phân mức NORMAL là né được chính cổng đó. Thêm một vai
vào phong bì là sửa kiến trúc ⇒ CRITICAL. Cần plan riêng.

Ghi chú: hai vòng thẩm định kế hoạch đã chạy trong thực tế (WORKFLOW-011 và
plan này) đều bắt được lỗi chặn, nên giá trị của cổng này đã được chứng minh —
chỉ là cần dựng cho đúng luật.
