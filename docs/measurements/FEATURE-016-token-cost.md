# FEATURE-016 — đo lường token & chi phí (provider billing)

- Ngày ghi: 2026-07-26
- Phạm vi feature: FEATURE-016 "admin xem tiến độ/chất lượng/thời gian
  học viên", risk tier `CRITICAL`, từ commit plan `600cb79` (2026-07-21)
  đến `c41252e` (2026-07-25, handoff đóng sau khi deploy production +
  smoke test PASS). 5 ngày lịch.
- Loại đo: **provider billing thực tế** (Azure/Codex), khác với
  `WORKFLOW-004-token-baseline.md` — file đó đo _mandatory-context
  bytes_ trên bộ scenario cố định, file này đo _tổng token/chi phí
  thật của một feature end-to-end_. Hai file bổ sung cho nhau; xem §5
  để biết chúng nối với nhau ở đâu.
- Nguồn số: bảng tổng hợp Azure do Human Project Owner cung cấp
  (2026-07-26). Số thô không tái tạo được từ repo ⇒ đây là **dữ liệu
  do người nhập**, không phải artifact sinh từ git. Mọi cột phái sinh
  bên dưới tính từ số thô này và có thể kiểm lại bằng số học.

## 1. Số thô (do provider báo)

| Model    | Requests | Input token | Output token (hiển thị) | Chi phí    | $/request |
| -------- | -------- | ----------- | ----------------------- | ---------- | --------- |
| Sol      | 44       | 2,43M       | 44,0K                   | $47,00     | $1,07     |
| Terra    | 283      | 18,76M      | 139,9K                  | $29,49     | $0,10     |
| Luna     | 98       | 3,43M       | 38,5K                   | $4,30      | $0,04     |
| **Tổng** | **425**  | **24,62M**  | **222,4K**              | **$80,79** | **$0,19** |

Vai trò từng model theo cấu hình đã duyệt (WORKFLOW-004B §routing +
`.codex/config.toml`):

- **Terra** (`gpt-5.6-terra`) — implementer mặc định của Codex
  (interactive/CLI, effort medium; implementer chính effort high).
- **Sol** (`gpt-5.6-sol`, effort high) — Codex self-review pass trước
  khi phát handoff.
- **Luna** (`gpt-5.6-luna`) — subagent `codex-rescue` khi Claude
  delegate (high cho việc khó, medium cho việc nhỏ).

## 2. Chỉ số phái sinh

| Chỉ số                        | Sol        | Terra      | Luna      | Tổng      |
| ----------------------------- | ---------- | ---------- | --------- | --------- |
| Input token / request         | 55 227     | 66 290     | 35 000    | 57 929    |
| Output (hiển thị) / request   | 1 000      | 494        | 393       | 523       |
| Tỉ lệ input : output hiển thị | 55 : 1     | 134 : 1    | 89 : 1    | 111 : 1   |
| $/request                     | $1,068     | $0,104     | $0,044    | $0,190    |
| $ / 1M input token (gộp)      | $19,34     | $1,57      | $1,25     | $3,28     |
| % số request                  | 10,4 %     | 66,6 %     | 23,1 %    | 100 %     |
| % input token                 | 9,9 %      | 76,2 %     | 13,9 %    | 100 %     |
| **% chi phí**                 | **58,2 %** | **36,5 %** | **5,3 %** | **100 %** |

Cột `$ / 1M input token (gộp)` quy toàn bộ chi phí về input token — đó
**không** phải đơn giá input thật, vì phần reasoning token (không hiển
thị) cũng được tính tiền nhưng không có trong bảng. Xem §4 gap 2.

## 3. Đối chiếu với sản phẩm bàn giao

| Đại lượng                                            | Giá trị                 |
| ---------------------------------------------------- | ----------------------- |
| Commit implementation `f9e43aa`                      | 24 file, +3 958 / −183  |
| Toàn nhánh feature (plan → runbook)                  | 25 file, +4 684 / −75   |
| Artifact quản trị sinh ra                            | 171 236 B ≈ 42,8K token |
| — `docs/plans/FEATURE-016.md`                        | 58 158 B / 751 dòng     |
| — `docs/handoffs/FEATURE-016-implementation.md`      | 88 647 B / 780 dòng     |
| — 2 runbook (test rollout + production rollout)      | 24 431 B / 497 dòng     |
| Vòng independent review (fresh Codex adversarial)    | 3                       |
| Vòng remediation                                     | 2 (sửa 4 bug thật)      |
| Chi phí / dòng code thêm mới (implementation commit) | ≈ $0,020                |
| Chi phí / feature `CRITICAL` hoàn chỉnh              | $80,79                  |

## 4. Khoảng trống đo lường (measurement gaps)

Ghi lại để lần đo sau không lặp lại; đây là hạn chế của số liệu, không
phải kết luận.

1. **Không tách được theo phase.** Bảng chỉ có tổng theo model, không
   có phase (plan / implement / review / remediation / release). Vì
   vậy không trả lời được câu hỏi đắt nhất: _2 vòng remediation tốn
   bao nhiêu?_ Suy luận gián tiếp qua model (Sol ≈ review) chỉ là xấp
   xỉ, vì Terra cũng chạy trong vòng remediation.
2. **"Output hiển thị" không phải output tính tiền.** Với model dòng
   reasoning, phần reasoning token bị ẩn nhưng vẫn tính tiền. Do đó
   không tách được `giá input × lượng input` và `giá output × lượng
output` từ bảng này, và mọi đơn giá suy ra ở §2 đều là giá gộp.
3. **Không có cột cached input.** Tỉ lệ input:output 111:1 nghĩa là
   chi phí gần như hoàn toàn nằm ở việc gửi lại context. Prompt
   caching có hoạt động hay không là đòn bẩy lớn nhất còn lại, mà bảng
   hiện tại không cho biết. Chênh lệch đơn giá gộp Terra $1,57/M vs
   Sol $19,34/M có thể một phần đến từ tỉ lệ cache hit khác nhau chứ
   không chỉ từ bậc giá model.
4. **Chưa gồm chi phí Claude (Architect).** Bảng này là billing
   Azure/Codex. Phiên Claude Code làm planning, Claude gate, review
   thay Gemini (deviation §7 của handoff) và release assessment không
   có trong đây. **Tổng chi phí thật của FEATURE-016 > $80,79.**
5. **n = 1.** Chưa đủ dữ liệu để đặt ngân sách theo tier. Cần ≥ 3
   feature đo cùng cách trước khi biến thành ngưỡng.

## 5. Đánh giá

### 5.1 CORRECTION (2026-07-26, cùng ngày viết) — FEATURE-016 chưa từng chạy trên shim 004B/004C

Bản viết đầu của mục này kết luận "đòn bẩy mandatory-context đã gần
cạn", dựa trên giả định FEATURE-016 chạy trên shim chain sau 004B/004C
(`CLAUDE.md` 35 B). **Giả định đó sai — đã kiểm tra lại bằng git và
rút lại kết luận đó.**

Bằng chứng (kiểm tra trực tiếp nội dung blob tại các commit, không suy
đoán): commit gốc của nhánh FEATURE-016 (`600cb79`, 2026-07-21) có
`CLAUDE.md` = **9 874 B**, `AGENTS.md` = **3 600 B** — khớp chính xác
hàng "Before 004B" của `WORKFLOW-004-token-baseline.md`, không phải
hàng "After". `docs/CONTEXT_RULES.md`, `docs/roles/implementer.md`,
`docs/PROJECT_CONTEXT.md` — cả ba đều **không tồn tại** trên nhánh này.
`git merge-base --is-ancestor 7d9a0fb 600cb79^` (7d9a0fb = merge PR#16,
commit đưa 004B vào `main`) trả về **false**: nhánh FEATURE-016 được
tạo từ một điểm của `main` **trước khi** 004B merge vào, dù theo ngày
tháng 004B (2026-07-18) đến trước ngày tạo plan FEATURE-016 (2026-07-21)
ba ngày — tức có sự cố thao tác nhánh (rất có thể tạo nhánh từ ref
`main` cục bộ chưa fetch, hoặc từ một điểm cũ), không phải do thiết kế.
Nhánh chỉ nhận lại `main` mới nhất (bao gồm 004B/004C) ở **`3080237`,
merge cuối cùng ngay trước khi đóng PR** — tức toàn bộ 425 request đã
tính tiền đều chạy **trước** thời điểm đó, trên chain cũ.

Đối chiếu rộng hơn: `feature/FEATURE-014` cũng dính lỗi này
(`CLAUDE.md` = 9 874 B, thiếu `CONTEXT_RULES.md`). Bốn nhánh khác kiểm
tra được (`feature/FEATURE-015`, hai nhánh `fix/*`, một nhánh `docs/*`)
đều đúng shim (`CLAUDE.md` = 35 B, có `CONTEXT_RULES.md`) — **đây là
sự cố cục bộ ở hai nhánh dài ngày bị tạo lệch, không phải lỗi hệ
thống lặp lại trên mọi nhánh.** Nhưng đúng hai nhánh dính lỗi lại là
hai nhánh duy nhất có dữ liệu billing thật đo được.

Hệ quả: bảng "chi phí tránh được ≈ $6,6" ở bản viết đầu không sai về
mặt số học (vẫn là ước lượng cận trên đúng công thức), nhưng **diễn
giải bị đảo ngược** — đó không phải khoản 004B/004C "đã tiết kiệm được
và không còn dư địa", mà là khoản **004B/004C lẽ ra tiết kiệm được cho
FEATURE-016 nhưng KHÔNG xảy ra**, vì nhánh implementation chưa bao giờ
chạy trên shim. Kết luận "giữ nguyên `CONTEXT_RULES.md`, không còn gì
để cắt" bị rút lại — chưa có bằng chứng nào ủng hộ nó, vì mẫu duy nhất
đo được (FEATURE-016) chưa từng thử nghiệm shim.

Không kết luận lại con số chính xác ở đây — cần đo trên một feature
thực sự chạy trên shim đúng từ đầu. Việc điều tra tiếp chuyển sang
`docs/plans/WORKFLOW-006-Input-Token-Cost-Audit.md` (NORMAL — điều tra
phạm vi + dọn trực tiếp); cơ chế tự động ngăn nhánh dài ngày lệch khỏi
`main` tái diễn tách sang
`docs/plans/WORKFLOW-007-Branch-Context-Drift-Gate.md` (ELEVATED —
script/CI, phụ thuộc kết quả điều tra của 006).

**Cập nhật (2026-07-26, WORKFLOW-006 Phase A hoàn tất):** kết quả quét
đầy đủ mọi nhánh cục bộ + remote còn mở (không dừng ở mẫu thủ công) nằm
tại `docs/handoffs/WORKFLOW-006-implementation.md` §"Phase A". Xác nhận:
sự cố là cục bộ ở nhánh sống lâu bị tạo lệch thời điểm 004B merge, không
lặp lại có hệ thống trên mọi nhánh — đúng kết luận sơ bộ ở trên. Thêm một
phát hiện mới: `origin/codex/feature-015-chuan-hoa-noi-dung-hoc` (nhánh
WIP, chưa có billing data) cũng lệch, cùng kiểu với
`chore/model-routing-config`. Đồng thời sửa lại một điểm: đoạn "đối chiếu
rộng hơn" phía trên liệt kê `feature/FEATURE-014` như một nhánh lệch còn
mở — nhưng nhánh đó nay đã **merge vào `main`**, nên không còn là rủi ro
hiện hành; chỉ hai nhánh còn mở (`chore/model-routing-config`,
`origin/codex/feature-015-chuan-hoa-noi-dung-hoc`) là phát hiện còn giá
trị hành động ngay bây giờ.

### 5.2 Chi phí thật nằm ở model routing, không ở context routing

Sol chiếm **10,4 % request và 9,9 % token nhưng 58,2 % chi phí**. Một
request Sol đắt gấp ~10× Terra và ~24× Luna. Đây là biến số chi phối
duy nhất trong bảng.

Điều này _không_ tự động nghĩa là Sol dùng sai: FEATURE-016 là
`CRITICAL` và 3 vòng adversarial review đã tìm và sửa 4 bug thật
(handoff §7, §12, §14) trên đường quyền admin đọc dữ liệu người khác.
$47 để chặn 4 defect trong logic phân quyền là một trao đổi hợp lý.

Điều nó nghĩa là: **quyết định routing Sol là quyết định ngân sách,
phải gắn với tier.** Nếu Sol chạy self-review ở tier `NORMAL`/
`ELEVATED` giống hệt như ở `CRITICAL` thì phần lớn chi phí đó không
mua thêm gì. Giảm 1/3 số request Sol trên một feature cỡ này tiết kiệm
≈ $15,7 — lớn hơn hẳn ước lượng cận trên ≈ $6,6 của khoản context-drift
ở §5.1, dù khoản đó còn chưa xác nhận được nguyên nhân chính xác.

### 5.3 Artifact quản trị tự bồi thêm chi phí

Handoff FEATURE-016 dài **88 647 B / 780 dòng ≈ 22,2K token** — vì
append-only, mỗi vòng review sau lại phải đọc lại toàn bộ vòng trước,
kể cả các mục đã đánh dấu `STALE`. Với 3 vòng review, riêng handoff có
thể chiếm hàng trăm nghìn input token.

Đây là chi phí _đi kèm chất lượng_, không nên xoá — nhưng nên tách:
các vòng đã đóng (§7 ROUND 1 STALE, §12, §14) có thể chuyển sang một
file phụ trong cùng thư mục handoff, để handoff chính chỉ giữ trạng
thái hiện hành + con trỏ. Đây là thay đổi quy trình, cần plan riêng,
không tự làm.

### 5.4 So với target của 004C

Target trong `WORKFLOW-004-token-baseline.md` (read-only ≤1,5K;
TRIVIAL ≤2,5K; NORMAL ≤5K; CRITICAL không cap) là target cho
**mandatory context**; `CRITICAL` không cap nên về hình thức không
target nào bị vi phạm — nhưng theo §5.1 đã sửa, con số áp dụng thực tế
cho FEATURE-016 chưa bao giờ là 507-token shim mà mục tiêu đó nhắm tới;
target chưa từng được kiểm chứng trên nhánh này.

Vẫn nên bổ sung một lớp chỉ số thứ hai — _chi phí thật theo feature
theo tier_ — không thay thế lớp cũ: lớp cũ vẫn là thứ duy nhất kiểm
tra được tự động và fail-closed, và giờ nên thêm cả bước xác nhận
nhánh implementation có thực sự đứng trên baseline `main` mới nhất
trước khi tính bytes.

## 6. Rà soát workflow — lãng phí quan sát được từ artifact

Mục §5 nói tiền nằm ở đâu. Mục này soi ngược vào handoff FEATURE-016 để
tìm phần chi phí **không mua được gì** — tức có thể cắt mà không đụng
tới chất lượng hay tier. Mỗi mục đều có dẫn chứng trong repo; không mục
nào ước tính bằng cảm tính. Không mục nào quy ra được đô-la, vì §4 gap 1
(không tag phase) chặn việc quy nạp — xếp hạng dưới đây theo **độ chắc
của bằng chứng**, không theo số tiền.

### 6.1 Sandbox Codex chặn gate — lặp lại 3 lần (bằng chứng chắc nhất)

Cả ba vòng validation (§4, §12, §14 của handoff) đều gặp **đúng cùng một
bộ blocker môi trường**, không liên quan gì tới code:

| Blocker                                  | Gate bị chặn                                                     | Số vòng gặp |
| ---------------------------------------- | ---------------------------------------------------------------- | ----------- |
| `tsx` IPC `EPERM` trên `/tmp/tsx-*.pipe` | `validate-content`, `build`, `test:pwa`, 2 test `check-licenses` | 3/3         |
| `.git` mount read-only                   | `git add -A && git stash create` (evidence anchor)               | 3/3         |

Hệ quả mỗi vòng: chạy thêm 3–4 lệnh thay thế chẩn đoán (`npx vite
build`, `node --import tsx scripts/validate-content.ts`, `npx vitest run
--exclude …`), rồi viết prose giải thích trong handoff. Riêng vòng 1 còn
kéo theo **Claude chạy lại toàn bộ canonical suite** (§4a, 9 lệnh) —
đúng loại "validation rerun" mà architecture §Session Lifecycle đặt mục
tiêu bằng 0.

Đây là **lỗi cấu hình môi trường, không phải chi phí quy trình**. Sửa
sandbox profile `codex-claude-subagent` (cho tạo IPC pipe, cho ghi
`.git`) là cắt sạch. Riêng `git-metadata-write` đã được ghi là hạn chế
đã biết trong `docs/runbooks/providers/codex.md`; `tsx` IPC `EPERM` thì
**chưa** — nên nó bị phát hiện lại từ đầu ở cả 3 vòng.

### 6.2 File bẩn có sẵn làm hỏng `format:check` — cũng 3/3 vòng

`npm run format:check` exit 1 ở **cả ba vòng**, luôn vì đúng hai file
FEATURE-016 không hề đụng tới: `docs/plans/_TEMPLATE.md` và bản nháp
plan WORKFLOW-005 (lúc đó chưa commit — xem §4/§12/§14 của handoff để
biết tên đầy đủ). Mỗi vòng phải: chạy lại prettier có phạm vi, viết
giải trình vào handoff, rồi reviewer phải đọc và xác nhận lại lời giải
trình đó.

Cả hai **vẫn đang bẩn ở thời điểm ghi tài liệu này** (2026-07-26, đã
kiểm bằng `npx prettier --check`). Chi phí để dọn: một lệnh
`prettier --write`. Nên thêm tiền điều kiện vào plan: worktree sạch
trước khi implementation bắt đầu, hoặc phần bẩn được liệt kê và miễn
trừ **một lần** trong plan thay vì tranh luận lại mỗi vòng.

### 6.3 Plan không khai trước degradation path

`docs/runbooks/providers/codex.md` đã quy định: nếu profile thiếu
capability thì **planner phải ghi sẵn đường degradation an toàn**. Plan
FEATURE-016 không ghi, dù profile `codex-claude-subagent` đã biết là
thiếu `git-metadata-write` từ FEATURE-014. Kết quả là mỗi vòng lại phát
hiện lại, giải thích lại, và để evidence anchor ở trạng thái thiếu.

Sửa: mục "execution profile + degradation path" thành trường bắt buộc
trong `docs/plans/_TEMPLATE.md`. Không đổi governance, chỉ đổi template.

### 6.4 Candidate để `UNCOMMITTED` suốt vòng 1 và 2

Cả §3, §12, §14 đều ghi `Candidate commit SHA: UNCOMMITTED`. Hệ quả dây
chuyền:

- Evidence binding phải đi đường vòng `git add -A && git stash create`
  — chính là lệnh mà sandbox chặn (§6.1).
- `CI run reference: PENDING` — CI không thể validate candidate, nên
  mất luôn một nguồn evidence miễn phí và phải bù bằng người/agent.
- Reviewer phải đọc worktree bẩn thay vì một diff so với commit.
- Handoff phải nhúng **hai bảng liệt kê 26 dòng dirty paths** chỉ để
  mô tả trạng thái mà một SHA đã mô tả đủ.

Nguyên nhân là quy tắc `<action_safety>Không commit, không push</action_safety>`
áp cho mọi dispatch Codex. Nới thành "Codex được commit lên nhánh
feature, không bao giờ push, không bao giờ đụng `main`" sẽ xoá cả bốn
hệ quả trên. Đây là **thay đổi governance**, cần Human quyết.

### 6.5 Vòng remediation 2 lẽ ra không cần tồn tại

Theo §7 handoff, finding của vòng 2 là: bản sửa của vòng 1 chỉ vá
`online-check` ở nhánh cleanup của effect chính, bỏ sót nhánh còn lại —
tức **vòng 2 sinh ra từ việc vòng 1 sửa thiếu phạm vi của chính finding
vòng 1**, không phải từ một khiếm khuyết mới.

Chi phí của một vòng thừa ở tier `CRITICAL` là rất đắt: theo
architecture §Remediation State Machine, mọi thay đổi release-artifact
làm **toàn bộ** evidence và **mọi** review theo tier thành STALE ⇒ chạy
lại validation đầy đủ + 2 reviewer đầy đủ, dù chỉ sửa một dòng ở một
file.

Sửa rẻ nhất, không đụng governance: buộc execution remediation phải
liệt kê **mọi code path mà finding áp dụng** trước khi sửa, và ghi danh
sách đó vào handoff để reviewer đối chiếu. Không nới lỏng review — làm
cho vòng đầu đúng ngay.

### 6.6 Cấu hình routing model chưa được quản trị

`.codex/config.toml` trên `main` hiện là `model = "gpt-5.4"`,
`model_reasoning_effort = "high"` cho **mọi** việc. Cấu hình
Sol/Terra/Luna nói ở §1 chỉ tồn tại trên nhánh **chưa merge**
`chore/model-routing-config`, cộng thêm một bản sửa cục bộ chưa commit.

Nghĩa là đòn bẩy chi phí lớn nhất (§5.2 — Sol chiếm 58,2 % tiền) hiện
**không nằm trong nguồn sự thật nào**. Ai chạy workflow từ `main` sẽ
nhận một cấu hình khác hẳn cái đã tạo ra hoá đơn này, và kết quả đo sẽ
không so sánh được giữa các feature. Cần merge và gắn vào risk tier
trước khi đo feature tiếp theo, nếu không §6 này tự vô hiệu.

### 6.7 Những thứ KHÔNG nên cắt

Ghi rõ để lần sau không ai cắt nhầm:

- **Số vòng review và yêu cầu 2 reviewer của `CRITICAL`.** Đã tìm và
  sửa 4 bug thật trong đường phân quyền admin đọc dữ liệu người khác,
  với giá $47. Cắt chỗ này là chỗ duy nhất trong bảng có thể tốn nhiều
  hơn số tiết kiệm được.
- **Độ sâu của plan cho `CRITICAL`.** Plan 58 KB đắt để sinh, nhưng nó
  là thứ giữ cho 3 vòng review cùng nói về một phạm vi.
- **Rào chắn mandatory-context của 004B/004C.** §5.1 đã chỉ ra không
  còn gì để cắt ở đó; siết thêm chỉ đổi lấy rủi ro escalate sai.

## 7. Đề xuất (chưa thực hiện — chờ Human Project Owner quyết)

Xếp theo tỉ lệ (giá trị × độ chắc) / công sức:

| #   | Việc                                                        | Nguồn      | Đụng governance? |
| --- | ----------------------------------------------------------- | ---------- | ---------------- |
| 1   | Sửa sandbox `codex-claude-subagent` (IPC pipe + `.git` ghi) | §6.1       | Không            |
| 2   | Dọn 2 file bẩn + thêm tiền điều kiện worktree sạch vào plan | §6.2       | Không            |
| 3   | Thêm trường "profile + degradation path" vào plan template  | §6.3       | Không            |
| 4   | Merge + gắn routing model vào risk tier                     | §6.6, §5.2 | **Có**           |
| 5   | Bắt remediation liệt kê đủ code path của finding            | §6.5       | Không            |
| 6   | Cho Codex commit lên nhánh feature (không push, không main) | §6.4       | **Có**           |
| 7   | Tách các vòng đã đóng khỏi handoff chính                    | §5.3       | **Có**           |

Kèm theo, về bản thân việc đo:

1. **Ghi cost/token cho mỗi feature từ nay** theo đúng bảng §1 + §2 ở
   trên, đặt tại `docs/measurements/<FEATURE-ID>-token-cost.md`. Chi
   phí ghi chép ~10 phút/feature.
2. **Bổ sung cột thiếu vào lần xuất số sau**: cached input token,
   reasoning/billed output token, và phase tag. Cần kiểm tra Azure/
   Codex có xuất được không trước khi hứa.
3. **Gắn routing Sol vào risk tier** — self-review Sol effort high chỉ
   cho `CRITICAL`; `ELEVATED` dùng Terra high; `NORMAL`/`TRIVIAL`
   không self-review Sol. Đây là sửa `.codex/config.toml` +
   `WORKFLOW-004B` routing ⇒ thay đổi governance, cần plan riêng.
4. **Cộng chi phí Claude vào bảng** để có tổng thật; hiện chỉ có một
   nửa bức tranh (§4 gap 4).
5. **Chưa đặt ngân sách theo tier** cho tới khi có ≥ 3 feature đo
   cùng cách (§4 gap 5).

## 8. Deviations

- Số ở §1 do người nhập từ dashboard provider, không sinh từ repo và
  không tái tạo được bằng lệnh trong repo — khác với quy ước "Metrics
  MUST be derived from repository artifacts" của architecture §Success
  Metrics. Ghi nhận là ngoại lệ có chủ đích: billing của provider là
  nguồn duy nhất cho lớp chỉ số này.
- Mọi số ở §5.1 là **ước lượng cận trên**, dùng đơn giá gộp của §2 —
  không phải hoá đơn.
