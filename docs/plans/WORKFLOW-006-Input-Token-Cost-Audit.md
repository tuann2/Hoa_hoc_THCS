# WORKFLOW-006: Rà soát nguyên nhân input token cao & dọn drift trực tiếp

## Status

- Status: DRAFT
- Owner: Claude Code
- Approved by / date: pending
- Risk tier: NORMAL
- Risk categories and escalation rationale: chỉ đụng `docs/**` +
  `.codex/config.toml` (config, không phải architecture/policy —
  `AGENTS.md` post-004B chủ động provider-neutral, không nêu tên model
  nào, nên sửa model string là config correction, không phải governance
  change). Không đụng `scripts/**`, `.github/**`,
  `docs/architecture/AI_WORKFLOW_ARCHITECTURE.md`. Phần script/CI (dò
  drift tự động) tách sang `WORKFLOW-007` (ELEVATED) vì đó là
  governance-enforcement tooling thật, khác lớp rủi ro với dọn docs.
- Change type and required gate profile: Documentation + small config;
  `scripts/gates-manifest.ts` profile `docs`.

## Objective and scope

- Objective: xác định bằng bằng chứng (không suy đoán) input token của
  FEATURE-016 ($80,79 / 24,62M input token) đã đi đâu, phân biệt phần
  **lãng phí thuần** (không mua thêm gì, ví dụ context bị lệch nhánh)
  khỏi phần **chi phí đi kèm chất lượng** (review CRITICAL); dọn ngay
  phần lãng phí không cần script/CI mới; giao phần cần script/CI cho
  `WORKFLOW-007`; khoanh phần đụng governance sang amendment riêng.
- Motivating finding (đã xác nhận bằng git, không phải giả thuyết): toàn
  bộ nhánh `feature/FEATURE-016` — tức toàn bộ 425 request đã tính
  tiền — chạy trên `CLAUDE.md` 9 874 B / `AGENTS.md` 3 600 B, **không có**
  `docs/CONTEXT_RULES.md` / `docs/roles/*` / `docs/PROJECT_CONTEXT.md`.
  Đây đúng là bộ mandatory-context "trước 004B" mà
  `docs/measurements/WORKFLOW-004-token-baseline.md` dùng làm baseline
  "before", không phải "after" như giả định ban đầu trong
  `docs/measurements/FEATURE-016-token-cost.md` §5.1 (mục đó đã tự sửa
  lại, xem "CORRECTION" trong file đó). Nguyên nhân: nhánh được tạo từ
  một điểm của `main` trước khi PR#16 (WORKFLOW-004B, merge `7d9a0fb`)
  vào — xác nhận bằng `git merge-base --is-ancestor 7d9a0fb 600cb79^` =
  false. Nhánh chỉ nhận lại `main` mới nhất ở merge cuối cùng
  (`3080237`), sau khi toàn bộ implementation đã xong.
- In scope:
  - Phase A — Điều tra phạm vi sự cố: quét mọi nhánh cục bộ + remote còn
    mở, so `CLAUDE.md`/`AGENTS.md`/sự tồn tại của
    `docs/CONTEXT_RULES.md` với `main` hiện tại; phân loại nhánh nào bị
    lệch, từ thời điểm nào, tạo từ commit nào. Không giới hạn ở
    FEATURE-016/014 đã biết. Kết quả Phase A cũng làm fixture test cho
    script của `WORKFLOW-007`.
  - Phase B — Instrumentation cho lần đo sau: thiết kế (không nhất thiết
    code nếu Azure/Codex không xuất được) cách gắn nhãn phase
    (plan/implement/review/remediation/release) và cờ cached-input vào
    số liệu billing tương lai, để đóng gap 1–3 đã ghi trong
    `docs/measurements/FEATURE-016-token-cost.md` §4.
  - Phase D — Dọn trực tiếp (trong "What Claude may edit directly"):
    - D.1: cập nhật tên model trong `.codex/config.toml` — hiện là
      `gpt-5.4`, chính comment đầu file đã tự ghi "model names deprecate
      fast, check `/status`/docs trước khi khoá". Đây thuần là config
      correction: `AGENTS.md` (SSOT hành vi agent sau 004B) chủ động
      provider-neutral, không nêu tên model nào, nên việc này không đổi
      policy. **Không** merge/hoà giải theo nhánh
      `chore/model-routing-config` — nhánh đó là một commit `chore` lẻ
      (`00d1224`), chưa từng qua plan/approval nào, không phải nguồn sự
      thật đã duyệt; dùng nó làm tham khảo, không sao chép mù.
    - D.2: dọn 2 file đang bẩn (`docs/plans/_TEMPLATE.md`,
      `docs/plans/WORKFLOW-005-Architecture-TRIVIAL-Reference-Fix.md`)
      — cùng 2 file đã làm hỏng `format:check` cả 3 vòng validation của
      FEATURE-016 (đã ghi trong `FEATURE-016-token-cost.md` §6.2).
    - D.3: thêm trường "execution profile + degradation path" bắt buộc
      vào `docs/plans/_TEMPLATE.md`.
    - D.4: thêm dòng bắt remediation liệt kê đủ code path của finding
      vào `docs/roles/implementer.md`.
    - D.5: ghi hạn chế `tsx` IPC `EPERM` vào
      `docs/runbooks/providers/codex.md`, cạnh hạn chế
      `git-metadata-write` đã ghi.
  - Phase E — Báo cáo cuối: cập nhật
    `docs/measurements/FEATURE-016-token-cost.md` với số liệu Phase A.
- Out of scope (đề xuất, không làm trong plan này):
  - Script/CI dò branch-context-drift tự động — chuyển sang
    `WORKFLOW-007` (ELEVATED, governance-enforcement tooling, khác lớp
    rủi ro).
  - Gắn model self-review vào risk tier trong governance như một rule
    bắt buộc — hiện chưa từng là rule đã duyệt ở đâu (chỉ là
    execution-assignment riêng của chính plan 004B khi soạn 004B, không
    phải standing policy); biến nó thành rule là thay đổi Independent
    Verification → CRITICAL.
  - Cho phép Codex commit lên nhánh feature (đổi `action_safety` mặc
    định) — đổi execution envelope/trust boundary → CRITICAL.
  - Tách các vòng review đã đóng khỏi handoff chính thành file phụ — đổi
    Documentation Contract (kiến trúc quy định handoff là "the only
    post-implementation orchestration artifact") → CRITICAL.
  - Sửa sandbox runtime `codex-claude-subagent` (IPC pipe, quyền ghi
    `.git`) — cấu hình đó nằm trong plugin ngoài repo này
    (`~/.claude/plugins/marketplaces/openai-codex/...`), ngoài phạm vi
    sửa của bất kỳ plan nào trong repo `Hoa_hoc_THCS`; D.5 chỉ ghi hạn
    chế đã biết vào runbook, không sửa được gốc.

## Current analysis and design

- Current behavior: xem "Motivating finding" ở trên. Đối chiếu nhanh các
  nhánh khác (đã kiểm thủ công, Phase A làm lại đầy đủ + ghi vào
  handoff): `feature/FEATURE-014` cũng lệch (`CLAUDE.md` 9 874 B, thiếu
  `CONTEXT_RULES.md`); `chore/model-routing-config` lệch theo kiểu khác
  (`CLAUDE.md` 10 443 B — một bản rich thứ ba, và bản thân nó chưa từng
  duyệt — xem D.1); bốn nhánh khác kiểm tra được
  (`feature/FEATURE-015`, `fix/FEATURE-016-progress-version-drift`,
  `fix/audit-brace-expansion`, `docs/FEATURE-016-production-smoke-test`)
  đều đúng shim hiện hành. Kết luận sơ bộ: sự cố cục bộ ở các nhánh sống
  lâu bị tạo/rebase lệch thời điểm 004B merge, không phải lỗi hệ thống
  lặp lại — Phase A phải xác nhận đầy đủ, không dừng ở mẫu thủ công này.
- New technology: none.

## Delivery plan

Execution assignment:

| Vai trò              | Agent đề xuất    | Model / effort đề xuất | Lý do                                                                                                |
| -------------------- | ---------------- | ---------------------- | ---------------------------------------------------------------------------------------------------- |
| Planner              | Claude (đã làm)  | —                      | Plan này                                                                                             |
| Implementer          | Claude trực tiếp | —                      | Toàn bộ scope nằm trong "What Claude may edit directly" (docs, plan template, runbook, small config) |
| Independent Reviewer | Không bắt buộc   | —                      | NORMAL: CI validate candidate là đủ khi có sẵn; không nhân đôi việc CI đã làm                        |
| Release Assessor     | Claude           | —                      | Theo Responsibility Matrix                                                                           |

1. **Phase A (Claude, đọc-only + ghi báo cáo):** liệt kê mọi nhánh cục
   bộ + `git branch -r`; với mỗi nhánh còn mở (chưa merge/xoá), so
   `CLAUDE.md`/`AGENTS.md`/tồn tại `docs/CONTEXT_RULES.md` với `main`
   hiện tại bằng `git cat-file`; với nhánh lệch, tìm điểm rẽ nhánh bằng
   `git merge-base --is-ancestor 7d9a0fb <branch>`. Ghi bảng đầy đủ vào
   handoff.
2. **Phase D (Claude trực tiếp), theo thứ tự D.2 trước:** dọn 2 file
   bẩn trước (để không nhiễu prettier/docs-check của các bước sau); rồi
   D.1 (model string), D.3, D.4, D.5. Mỗi bước chạy
   `npx prettier --check` + `npm run check:docs`.
3. **Phase B (Claude, thiết kế + ghi, không code nếu không cần):** viết
   một mục ngắn vào `docs/measurements/` mô tả cách gắn phase-tag cho
   lần đo billing kế tiếp — kiểm tra trước xem Azure/Codex dashboard có
   xuất được cached-input token không; nếu không, ghi rõ là giới hạn
   còn lại, không hứa quá.
4. **Phase E (Claude):** cập nhật
   `docs/measurements/FEATURE-016-token-cost.md` với kết quả Phase A;
   handoff tại `docs/handoffs/WORKFLOW-006-implementation.md`; release
   assessment; CI trên candidate commit là independent verification đủ
   cho NORMAL.

## Risks and controls

| Risk                                                                                                   | Impact                           | Mitigation                                                                                  |
| ------------------------------------------------------------------------------------------------------ | -------------------------------- | ------------------------------------------------------------------------------------------- |
| D.1 vô tình khoá lại một model tên sai/đã ngừng                                                        | Codex fail ngay lần chạy kế tiếp | Xác minh tên model hiện hành qua `/status`/tài liệu chính thức trước khi ghi, không đoán    |
| Phase A không tìm hết nhánh bị lệch (nhánh đã xoá cục bộ nhưng còn remote, hoặc PR đang mở không sync) | Kết luận phạm vi sự cố thiếu     | Quét cả `git branch -r`; ghi rõ giới hạn "chỉ xét nhánh còn tồn tại tại thời điểm điều tra" |
| Kết luận Phase A/E bị đọc nhầm thành lý do nới lỏng Independent Verification                           | Vi phạm Trust Model              | Plan này không đổi bất kỳ yêu cầu review nào; ghi rõ trong Out of scope                     |

## Acceptance and recovery

- [ ] Bảng đầy đủ mọi nhánh còn mở, phân loại lệch/không lệch, điểm rẽ
      nhánh, có trong handoff (Phase A).
- [ ] `.codex/config.toml` dùng tên model hiện hành, đã xác minh
      (D.1) — không sao chép từ nhánh chưa duyệt.
- [ ] Hai file bẩn trước đó pass `prettier --check`; template có trường
      profile+degradation; role contract có dòng remediation-scope;
      runbook Codex ghi hạn chế `tsx` IPC (D.2–D.5).
- [ ] `docs/measurements/FEATURE-016-token-cost.md` cập nhật kết quả
      Phase A, không còn dựa trên giả định đã sai (Phase E).
- [ ] CI xanh trên candidate commit.
- Security considerations: none — docs + một dòng config, không đổi
  RLS/auth/deploy.
- API/database impact: none.
- Test strategy: `npx prettier --check`, `npm run check:docs`, CI docs
  profile trên candidate.
- Rollback plan: mọi thay đổi là docs-only + 1 dòng config; revert từng
  file độc lập nếu cần.
