# WORKFLOW-012: Dựng lại vai điều phối và bắt buộc thẩm định kế hoạch theo mức rủi ro

## Status

- Status: DRAFT <!-- DRAFT | APPROVED | SUPERSEDED -->
- Owner: Claude Code (Planner; dispatch của tuann2 ngày 2026-07-27)
- Approved by / date:
- Risk tier: ELEVATED
- Risk categories and escalation rationale: governance policy điều khiển cách mọi
  execution sau này nhận vai và cách kế hoạch được thẩm định. Không sửa
  `docs/architecture/AI_WORKFLOW_ARCHITECTURE.md`, không đụng CI/deploy/auth nên
  không CRITICAL. Theo rule 7, phân loại còn dao động giữa NORMAL và ELEVATED thì
  lấy tier cao hơn — cùng lớp với WORKFLOW-009.
- **Thẩm định kế hoạch: BẮT BUỘC** theo chính quy tắc mà plan này đặt ra
  (ELEVATED trở lên). Plan này là ca đầu tiên áp dụng quy tắc của chính nó.
- Change type and required gate profile: docs (governance); profile do
  `scripts/gates-manifest.ts` chọn.

## Objective and scope

- Objective: đóng lỗ hổng gốc còn lại sau WORKFLOW-008 — ranh giới "việc nào
  trợ lý tự làm, việc nào phải giao đi" đã bị xoá và không được chuyển đi đâu;
  đồng thời đặt điều kiện thẩm định kế hoạch theo mức rủi ro để lỗi thiết kế bị
  bắt ở giai đoạn rẻ.
- In scope: `AGENTS.md` (thêm đúng một mục), `docs/roles/coordinator.md` (file
  mới), `docs/plans/_TEMPLATE.md` (thêm một trường), và handoff của chính plan
  này.
- Out of scope: sửa `docs/architecture/AI_WORKFLOW_ARCHITECTURE.md` — Risk Model
  và Responsibility Matrix đã đủ, vấn đề là chưa ai cưỡng chế; đổi bốn hợp đồng
  vai hiện có; ba việc treo còn lại (bằng chứng gắn theo mã băm cây, cảnh báo
  Node 20, câu kiểm thử tautology).

## Current analysis and design

### Vì sao ranh giới cũ mất hiệu lực

`CLAUDE.md` từng có mục "What Claude may edit directly" liệt kê rõ những gì trợ
lý được sửa trực tiếp — ngầm hiểu mọi thứ ngoài danh sách phải giao đi. Commit
`5e4edcb` (WORKFLOW-004B) xoá mục đó và **không chuyển sang tài liệu nào**. Thứ
duy nhất còn lại là một ô trong Responsibility Matrix ghi Planner không được
"implement substantial features" — quá mờ để nhớ lúc soạn bảng phân vai.

Hậu quả đã xảy ra thật ở WORKFLOW-008: một execution tự nhận cả ba vai Planner,
Implementer, Release Assessor rồi bỏ luôn vai cuối; con người phát hiện, không
phải quy trình.

### Bẫy bootstrap quyết định chỗ ghi

`AGENTS.md:12` chỉ yêu cầu đọc `docs/roles/<role>.md` **khi có vai được giao qua
phong bì**. Nhưng vai điều phối là thứ execution mang **trước khi** có phong bì —
ngay lúc mở phiên. Nên một hợp đồng đặt hoàn toàn trong `docs/roles/coordinator.md`
sẽ không bao giờ được nạp: rẻ tuyệt đối và vô hiệu vì cùng một lý do.

Vì vậy chia đôi:

| Chỗ                                    | Nội dung                                                                                                                                     | Chi phí                                                  |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `AGENTS.md` — thêm 1 mục (~40 từ)      | Tuyên bố vai mặc định, ba việc vai đó làm, hai việc vai đó **không** làm, và lệnh đọc hợp đồng chi tiết                                      | Nạp mọi phiên; tăng ~10% chi phí cố định của file 380 từ |
| `docs/roles/coordinator.md` — file mới | Chi tiết: chuyển tiếp xác nhận vai, xử lý khi agent bị chặn quyền, chạy cổng kiểm tra thay agent, ghi sai lệch, điều kiện thẩm định kế hoạch | Chỉ nạp khi thật sự điều phối                            |

Cách này khớp mẫu sẵn có của bốn vai kia (một dòng trỏ + hợp đồng riêng); khác
duy nhất là dòng trỏ phải **vô điều kiện**, không phụ thuộc phong bì.

### Vai điều phối gồm gì

Theo quyết định của tuann2 ngày 2026-07-27:

1. Đọc kế hoạch đã duyệt và giao từng vai trong đó cho đúng agent.
2. Tổng hợp kết quả các agent và thực hiện đánh giá phát hành sau cùng.
3. **Được phép tự lập kế hoạch** — vì lập kế hoạch là việc ngốn ngữ cảnh nhất,
   giao cho agent khởi động lạnh thường đắt hơn và cho kết quả nông hơn.
4. **Không** tự viết mã ứng dụng và **không** tự thẩm định độc lập.

Vì mục 3 giữ lại chồng lấn Planner + Release Assessor, hợp đồng phải bắt buộc
hai điều bù lại:

- Bản đánh giá phát hành **phải tự công bố** rằng người đánh giá chính là người
  đã lập kế hoạch và điều phối. Công bố không xoá được xung đột lợi ích, nhưng
  làm nó hiện ra thay vì ẩn đi.
- Kế hoạch từ ELEVATED trở lên **phải qua thẩm định trước khi duyệt**.

### Vì sao bắt buộc thẩm định kế hoạch từ ELEVATED

Bằng chứng từ chính phiên 2026-07-26/27:

| Kế hoạch     | Có thẩm định kế hoạch | Kết quả                                                                                                                                    |
| ------------ | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| WORKFLOW-011 | Có                    | Bắt 2 lỗi chặn + 2 lỗi nặng **trước khi** viết mã, gồm việc xếp nhầm `tests/security/**` — một security control — xuống nhóm gate thấp hơn |
| WORKFLOW-009 | Không                 | Lỗi thiết kế cấp kế hoạch lọt tới vòng thẩm định mã: điều kiện `"empty"` quá lỏng, phải sửa chữa rồi thẩm định lại                         |

Cùng loại lỗi; bắt ở giai đoạn kế hoạch rẻ hơn hẳn bắt ở giai đoạn mã.

Quy tắc đề xuất: **TRIVIAL** không có kế hoạch nên không áp dụng; **NORMAL**
khuyến khích, không bắt buộc; **ELEVATED và CRITICAL** bắt buộc một execution
khác thẩm định kế hoạch trước khi con người duyệt. Ghi điều kiện này vào
`docs/roles/coordinator.md` và thêm một trường vào `docs/plans/_TEMPLATE.md` để
mỗi kế hoạch tự khai đã thẩm định hay chưa.

- New technology: không có.
- Execution profile + degradation path: Implementer cần repo-rw + shell chạy gate
  docs. Nếu sandbox chặn, báo blocked và để orchestrator chạy — không tự khai
  gate pass.

## Delivery plan

Execution assignment — mỗi dòng cần xác nhận riêng khi đến lượt vai đó:

| Vai trò              | Agent đề xuất                    | Model / effort | Lý do                                                                                                                       | Đã xác nhận        |
| -------------------- | -------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Planner              | Claude Code (điều phối)          | high           | Theo quyết định của tuann2: điều phối được tự lập kế hoạch. Bù lại bằng thẩm định kế hoạch bắt buộc ở dòng dưới.            | tuann2, 2026-07-27 |
| Thẩm định kế hoạch   | Codex (`codex:codex-rescue`)     | high           | ELEVATED nên bắt buộc. Codex đã bắt được lỗi phân loại bảo mật ở kế hoạch WORKFLOW-011, đúng loại lỗi cần bắt sớm.          | chưa               |
| Implementer          | Codex (`codex:codex-rescue`)     | medium         | Không tự nhận: `AGENTS.md` là văn bản ràng buộc chính hành vi Claude Code; để nó tự viết luật cho mình là xung đột lợi ích. | chưa               |
| Independent Reviewer | agy (`claude-opus-4-6-thinking`) | —              | ELEVATED cần một reviewer tươi đọc từng dòng, và phải khác Implementer.                                                     | chưa               |
| Release Assessor     | Claude Code (điều phối)          | low            | Khác Implementer. Bắt buộc công bố kiêm nhiệm Planner theo đúng quy tắc plan này đặt ra.                                    | chưa               |

1. Thẩm định kế hoạch này trước khi tuann2 duyệt — plan là ca đầu áp dụng quy
   tắc của chính nó.
2. `AGENTS.md`: thêm đúng một mục cho vai điều phối, viết bằng tiếng Anh cho
   đồng bộ, không viết lại các mục cũ.
3. `docs/roles/coordinator.md`: hợp đồng vai theo đúng cấu trúc bốn file hiện có
   (Capabilities required / Permissions / Responsibilities / Restrictions).
4. `docs/plans/_TEMPLATE.md`: thêm trường khai trạng thái thẩm định kế hoạch.
5. Gate, bằng chứng, handoff. Handoff của chính plan này phải điền đủ
   `Role execution log` và `Release Assessment` theo template hiện hành.

## Risks and controls

| Risk                                                    | Impact                                 | Mitigation                                                                                                                                               |
| ------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Thêm chữ vào `AGENTS.md` làm tốn token mọi phiên        | Chi phí cố định tăng vĩnh viễn         | Giới hạn đúng một mục ~40 từ; mọi chi tiết đẩy sang file chỉ nạp khi cần.                                                                                |
| Điều phối vẫn kiêm Planner và Release Assessor          | Tự chấm điểm việc mình chỉ đạo         | Bắt buộc công bố kiêm nhiệm trong bản đánh giá; bắt buộc thẩm định kế hoạch từ ELEVATED; con người vẫn duyệt cuối.                                       |
| Thẩm định kế hoạch thành thủ tục hình thức              | Tốn lượt dispatch mà không bắt được gì | Hợp đồng yêu cầu thẩm định phải nêu rõ đã kiểm gì và **không kiểm được gì**; verdict phải là APPROVE hoặc CHANGES_REQUESTED, không có trạng thái mập mờ. |
| Quy tắc mới mâu thuẫn ngầm với bốn hợp đồng vai hiện có | Agent nhận chỉ thị trái nhau           | Thẩm định kế hoạch phải đối chiếu file mới với cả bốn hợp đồng cũ và Responsibility Matrix.                                                              |

## Acceptance and recovery

- [ ] `AGENTS.md` có đúng một mục mới cho vai điều phối, nêu cả việc vai đó
      **không** được làm, và lệnh đọc `docs/roles/coordinator.md` là vô điều kiện.
- [ ] `docs/roles/coordinator.md` tồn tại, theo đúng cấu trúc bốn hợp đồng vai
      hiện có, và ghi rõ hai ràng buộc bù: công bố kiêm nhiệm, và thẩm định kế
      hoạch bắt buộc từ ELEVATED trở lên.
- [ ] `docs/plans/_TEMPLATE.md` có trường khai trạng thái thẩm định kế hoạch.
- [ ] Không mâu thuẫn với `docs/roles/{planner,implementer,independent-reviewer,release-assessor}.md`
      và Responsibility Matrix — thẩm định kế hoạch xác nhận điều này.
- [ ] Handoff của plan này điền đủ `Role execution log` và `Release Assessment`.
- Security considerations: không đụng auth, secret, dependency, CI/deploy.
- API/database impact: không.
- Test strategy: gate docs; không có mã nên không có kiểm thử tự động. Phép thử
  thật là tiêu chí 4 — quy tắc mới phải sống chung được với luật cũ.
- Rollback plan: docs-only, `git revert <sha>`; file mới xoá bằng một commit.
