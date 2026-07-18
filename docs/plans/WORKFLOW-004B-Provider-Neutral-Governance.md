# WORKFLOW-004B: Provider-neutral governance & context routing

## Status

- Status: APPROVED
- Owner: Claude Code
- Approved by: tuann2 (Owner)
- Approved date: 2026-07-18
- Risk tier: CRITICAL
- Risk categories: workflow/governance architecture (amendment v2.4);
  role and authority contracts; context policy
- Escalation rationale: Sửa chính architecture (Responsibility Matrix,
  Risk Model thêm tier TRIVIAL, Context Policy mới) và các file
  governance điều khiển hành vi mọi agent. Risk Model rule 2
  ("this architecture itself") ⇒ CRITICAL.
- Change type: Documentation only (chủ đạo) — nhưng tier do rule 2
  quyết định, không do change type
- Quality gates: profile `docs` (diff, format, docs-check) trên mọi file
  đổi + profile `full` dogfood trên candidate (vì governance đổi ⇒ full
  theo classifier 004A); tests hiện có pass.
- Phụ thuộc: 004A đã merge (dùng gates/evidence/check-docs).
  Verify Stage 0 (2026-07-18): 004A merged vào `main` qua PR #15
  (`ce5a9d4`); architecture v2.3 APPROVED; scripts `gates`, `evidence`,
  `check:docs` có mặt trong `package.json`.
- Execution models (Owner chỉ định 2026-07-18): Implementer (soạn docs)
  = Codex `gpt-5.6-terra` effort `high`; Codex self-review pass trước
  handoff = `gpt-5.6-sol` effort `high`; independent review qua `agy`:
  `Claude Opus 4.6 (Thinking)` cho phần script/config/template có cấu
  trúc, `Gemini 3.5 Flash (High)` cho nội dung governance docs.

## 1. Objective

1. Governance chuẩn (roles, risk, context, evidence, release) không phụ
   thuộc tên vendor/model. Đổi provider ⇒ chỉ đổi config/runbook, không
   đổi policy.
2. Giảm context bắt buộc bằng progressive disclosure: shim mỏng → role
   contract → chỉ tài liệu mà loại task cần.
3. Không giảm chất lượng: mọi nguyên tắc lõi của v2.2/v2.3 giữ nguyên
   hiệu lực, chỉ đổi cách tổ chức và truyền đạt.

Phát biểu chính xác kỳ vọng (theo review §2.2): mỗi runtime vẫn cần một
discovery adapter mỏng (vd. `CLAUDE.md` cho Claude Code); điều bị cấm là
policy chuẩn phụ thuộc vendor, không phải sự tồn tại của adapter.

## 2. Current system analysis

- `AGENTS.md` = "Codex Implementation Rules" — agent khác đọc sẽ nhận
  sai vai. `CLAUDE.md` ~200 dòng trộn governance + project context.
- Mechanics vendor (cờ `codex:codex-rescue`, `agy --add-dir`, model
  names) nằm trong `AI_WORKFLOW.md` (normative).
- Bảng lệnh gates lặp ở 5 file governance (sau 004A: architecture đã
  tham chiếu manifest, còn các file kia chưa).
- Vendor-specific ngoài docs: `.claude/skills/feature-delivery/SKILL.md`,
  `.codex/config.toml`, mục AI trong README.
- Context bắt buộc mỗi session ~12–15k tokens cho mọi loại task.
- FEATURE-014: hạn chế (npm network, localhost/browser, git metadata
  write) thuộc về **Codex subagent sandbox** dưới đường orchestration,
  không phải Codex CLI nói chung — không được khái quát hóa sai.

## 3. Assumptions

- 004A merged: `gates.ts`, `evidence.ts`, `check:docs` khả dụng;
  deployment invariant hiệu lực; architecture đang ở v2.3.
- Plan/handoff lịch sử bất biến (chỉ sửa link gãy nếu docs-check bắt,
  ghi chú hẹp).
- Không cần third runtime thật để nghiệm thu — mock adapter chấp nhận
  được (§11).

## 4. Scope

- Amendment architecture **v2.4**:
  - Responsibility Matrix theo vai trò trung lập: Planner, Implementer,
    Independent Reviewer, Release Assessor, Human Approver (Human giữ
    final authority; một provider có thể giữ vai khác nhau ở các
    execution tách biệt).
  - Mỗi role contract khai `capabilities_required` (vd. Implementer:
    repository-write, shell, test-execution; Reviewer: repository-read,
    fresh execution, KHÔNG kế thừa transcript của implementer) và
    `permissions` (may_commit/push/merge/deploy mặc định false trừ khi
    envelope cấp).
  - Execution envelope (§6.3) thành yêu cầu normative; thiếu/mơ hồ ⇒
    least privilege.
  - Thêm tier **TRIVIAL** vào Risk Model (định nghĩa §6.5 — chỉ policy;
    enforcement ở 004C).
  - Context Policy: tham chiếu `docs/CONTEXT_RULES.md`.
- File mới: `docs/PROJECT_CONTEXT.md` (tách context sản phẩm/kỹ thuật
  từ CLAUDE.md, trung lập vendor); `docs/CONTEXT_RULES.md`;
  `docs/roles/planner.md`, `implementer.md`, `independent-reviewer.md`,
  `release-assessor.md`; `docs/runbooks/providers/claude-code.md`,
  `codex.md`, `antigravity.md` (mechanics + execution profiles + known
  restrictions, gồm bài học FEATURE-014 gắn đúng cho subagent sandbox).
- Viết lại `AGENTS.md` thành canonical shim trung lập (§6.1);
  `CLAUDE.md` thành discovery adapter tối thiểu (§6.3).
- `AI_WORKFLOW.md`: giữ pipeline + ground rules; mechanics vendor dời
  sang provider runbooks; bảng gates thay bằng tham chiếu manifest.
- `docs/DOCUMENTATION_RULES.md`: trung lập hóa (rule cho vai
  "docs-drafting", không cho "Gemini"); tham chiếu manifest.
- `.claude/skills/feature-delivery/SKILL.md`: cập nhật để trỏ role
  contract + envelope, không chứa rule riêng không có trong governance.
- README: mục AI tooling chuyển thành "current tooling" (informational,
  không normative).
- Rút template: `docs/plans/_TEMPLATE.md` (NORMAL ≤ 60 dòng nội dung),
  `docs/handoffs/_TEMPLATE.md` (≤ 50 dòng + evidence JSON đính kèm do
  máy sinh; bỏ mục chép bảng lệnh).

## 5. Out of scope

- Không sửa `src/`, `content/`, tests ứng dụng, CI/deploy (đã xong
  004A).
- Không build capability resolver máy / `.agents/providers.json` bắt
  buộc (HIGH-01 Modified — xem OVERVIEW §3; có thể thêm sau nếu số
  provider tăng).
- Không enforce TRIVIAL bằng code (004C).
- Không xóa `.codex/config.toml` (provider adapter hợp lệ, không phải
  governance).

## 6. Proposed design

### 6.1 `AGENTS.md` — canonical shim

Mục tiêu ≤ ~50 dòng (hoàn chỉnh và không mơ hồ quan trọng hơn số dòng
tuyệt đối). Nội dung:

1. Repo có governed AI workflow; nguồn chân lý:
   `docs/architecture/AI_WORKFLOW_ARCHITECTURE.md`. Chỉ đọc full khi
   ELEVATED/CRITICAL, khi được envelope yêu cầu, hoặc khi gặp conflict.
2. Bạn hành động theo **execution envelope** được cấp (§6.3). Không có
   envelope ⇒ chế độ read-only, không sửa file, không tự nhận vai.
3. Theo `assigned_role`, đọc đúng `docs/roles/<role>.md`.
4. Trước khi sửa file: đọc `docs/CONTEXT_RULES.md`; xác định gates bằng
   `npm run gates -- --changed-from=<base_sha>`; evidence bằng
   `npm run evidence`.
5. `validate-content` là thẩm quyền cho bất biến cấu trúc/catalog máy
   kiểm được; tính đúng chuyên môn hóa học, chất lượng đáp án và sư
   phạm vẫn cần review có chủ đích (wording theo MEDIUM-03).
6. Cấm tuyệt đối: commit/push/merge/deploy ngoài permissions của
   envelope; sửa ngoài `allowed_paths`; tắt/sửa gate.

Không chứa tên vendor/model.

### 6.2 Provider runbooks & execution profiles (thay capability resolver)

Mỗi file `docs/runbooks/providers/<name>.md` gồm: cách gọi; cờ bắt
buộc; execution profiles đã biết dạng bảng, ví dụ Codex:

| Profile               | Adapter       | Effective capabilities                                       | Known restrictions                                           |
| --------------------- | ------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| codex-direct-terminal | CLI trực tiếp | repo-rw, shell, test, network, localhost, git-metadata-write | —                                                            |
| codex-claude-subagent | codex-rescue  | repo-rw, shell, test, git-metadata-read                      | network, localhost/browser, git-metadata-write (FEATURE-014) |

Nguyên tắc normative (ghi trong v2.4): chọn execution cho một vai phải
thỏa `capabilities_required` của vai đó **theo profile thực tế của
phiên**, không theo danh tiếng provider; thiếu capability ⇒ đường
degrade được ghi rõ (vd. browser gates chạy ở CI; evidence do
orchestrator sinh). Đây là cùng nguyên tắc HIGH-01 yêu cầu, thực thi
bằng tài liệu + kiểm tra của Planner thay vì resolver máy.

### 6.3 Execution envelope & discovery shims

Envelope (YAML, do orchestrator/human cấp đầu phiên):

```yaml
request_class: read-only | change | independent-review | release-assessment
assigned_role: planner | implementer | independent-reviewer | release-assessor
risk_tier: TRIVIAL | NORMAL | ELEVATED | CRITICAL
scope: { allowed_paths: [...], forbidden_paths: [...] }
candidate_sha: <sha|null>
permissions: { repository_write: bool, commit: bool, push: bool }
```

Thiếu trường/mơ hồ ⇒ least privilege (read-only). Independent Reviewer
bắt buộc fresh execution, chỉ nhận candidate snapshot + plan, không
nhận transcript implementer, không tự sửa candidate (trừ ngoại lệ
batch-content đã có ở v2.2, giữ nguyên).

`CLAUDE.md` mới:

```md
# Project Instructions

@AGENTS.md
```

(cộng tối thiểu cú pháp runtime cần). Project context chuyển sang
`docs/PROJECT_CONTEXT.md`, chỉ được CONTEXT_RULES trỏ tới khi liên quan.

### 6.4 `docs/CONTEXT_RULES.md`

Một bảng, hai lớp:

Lớp 1 — theo request class × domain (retrieval triggers):

| Task đụng                  | Phải đọc                                                                                           | Không đọc mặc định                 |
| -------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Chemistry content (1 unit) | shim, plan, schema/rules content, unit đích, validator output, tests đích                          | 16 unit còn lại, architecture full |
| UI/React/PWA               | shim, plan, docs/architecture.md, component/store đích, config Vite/PWA liên quan, tests liên quan | governance ngoài shim              |
| Supabase/auth/sync         | shim, plan, architecture + ADR liên quan, migration/schema, code auth/progress, ràng buộc RLS      | — (tier tự động CRITICAL)          |
| CI/deploy/scripts/deps     | shim, plan, YAML liên quan, manifest/runner, package.json+lockfile khi liên quan                   | — (control change ⇒ CRITICAL)      |
| Governance/architecture    | shim, architecture full, role contracts liên quan, migration history                               | — (CRITICAL)                       |
| Read-only question         | shim                                                                                               | mọi thứ khác trừ file được hỏi     |

Lớp 2 — hard triggers bất kể path/số file (leo tier + leo context):
đổi policy/governance; CI/deploy; dependency/lockfile; security/auth/
RLS; schema/migration; hành vi runtime; kỳ vọng test; public API; công
thức/đáp án/giá trị số trong content giáo dục; thêm/xóa/đổi tên file.

Escalation: mơ hồ hoặc conflict ⇒ đọc architecture full và/hoặc dừng
hỏi Owner — đường leo thang luôn mở, budget không phải trần cứng cho
ELEVATED/CRITICAL.

### 6.5 Tier TRIVIAL (policy — enforce ở 004C)

Allowlist khởi điểm hẹp: prose docs phi-governance; sửa chính tả/format
không đổi lệnh, path, policy, ví dụ, hành vi kỹ thuật hay nghĩa giáo
dục. `content/units/*.json` giữ NORMAL đợt đầu. Hard denylist: AGENTS/
CLAUDE/AI_WORKFLOW, docs/architecture/**, docs/roles/**, CONTEXT_RULES,
DOCUMENTATION_RULES, docs/plans/**, docs/handoffs/**, .github/**,
scripts/**, package\*.json, src/**, tests, supabase/**, config build/
test/lint, schema/catalog. Hard triggers §6.4 lớp 2 áp dụng. TRIVIAL bỏ
plan/handoff đầy đủ nhưng bắt buộc micro-trace snapshot-bound (schema ở
004C). Path lạ ⇒ escalate NORMAL.

## 6a. New technology

Không có.

## 7. Files to create

- `docs/PROJECT_CONTEXT.md`
- `docs/CONTEXT_RULES.md`
- `docs/roles/planner.md`, `docs/roles/implementer.md`,
  `docs/roles/independent-reviewer.md`, `docs/roles/release-assessor.md`
- `docs/runbooks/providers/claude-code.md`, `codex.md`, `antigravity.md`

## 8. Files to modify

- `AGENTS.md`, `CLAUDE.md`, `AI_WORKFLOW.md`, `README.md`
- `docs/architecture/AI_WORKFLOW_ARCHITECTURE.md` (amendment v2.4)
- `docs/DOCUMENTATION_RULES.md`
- `.claude/skills/feature-delivery/SKILL.md`
- `docs/plans/_TEMPLATE.md`, `docs/handoffs/_TEMPLATE.md`
- `.codex/config.toml` chỉ nếu adapter cần đổi hành vi (mặc định:
  không đụng)

## 9. API and database impact

Không có.

## 10. Implementation steps

Thứ tự để shim không bao giờ trỏ file chưa tồn tại (review Stage 7):

1. Stage 0 — verify HEAD + xác nhận 004A merged, v2.3 APPROVED.
2. Tạo `PROJECT_CONTEXT.md` (di trú nội dung từ CLAUDE.md) → role
   contracts → `CONTEXT_RULES.md` → provider runbooks.
3. Amendment v2.4 (roles trung lập, envelope, TRIVIAL policy, Context
   Policy) — DRAFT.
4. Viết lại `AGENTS.md`; rút `CLAUDE.md`; dọn `AI_WORKFLOW.md`,
   `DOCUMENTATION_RULES.md`, SKILL.md, README; rút templates; khử
   duplication bảng gates (grep-proof).
5. Chạy `gates` profile full dogfood + `check:docs --all`.
6. Conformance tests (§11).
7. Independent review CRITICAL (fresh reviewer + adversarial) trên
   exact snapshot; remediation nếu có findings.
8. Human approve v2.4 → merge.

## 11. Test strategy

- `check:docs --all` pass (mọi link/path/command trong bộ docs mới).
- Grep-proof: bảng lệnh gates chỉ còn ở manifest (+ tham chiếu);
  `AGENTS.md` và mọi file trong `docs/roles/`, `docs/CONTEXT_RULES.md`,
  architecture v2.4 không chứa tên vendor/model (README/runbooks/config
  được phép — MEDIUM-04).
- Conformance scenarios (mỗi cái ghi: role nhận, files đã đọc, bytes
  bắt buộc, hành vi trái phép nếu có): (1) read-only question; (2) docs
  typo phi-governance; (3) NORMAL content change 1 unit; (4) NORMAL UI
  change; (5) CRITICAL governance question; (6) envelope thiếu ⇒ phải
  tự về read-only; (7) sandbox hạn chế ⇒ phải chọn đường degrade đúng.
  Chạy với Claude Code + Codex + 1 mock adapter (đọc AGENTS.md như
  agent lạ).
- Đo context bắt buộc (bytes + ước lượng tokens) cho scenario 1–4;
  mục tiêu: read-only ≤ 1.5k, NORMAL ≤ 5k observed tokens; lệch thì ghi
  lý do, không nới bằng cách cắt nội dung cần thiết.
- Regression: toàn bộ tests trên candidate pass (số thực tế từ CI).

## 12. Security considerations

- Envelope chống agent tự cấp quyền; default least privilege.
- Reviewer độc lập không nhận transcript ⇒ chống review bias và chống
  "tự chấm bài mình".
- Rủi ro chính: viết lại governance làm mất một rule đang có hiệu lực.
  Chốt: reviewer đối chiếu checklist "mọi ground rule v2.2/v2.3 còn
  hiệu lực hoặc được supersede có chủ đích, liệt kê từng cái" trong
  handoff.

## 13. Risks

| Risk                                                         | Impact               | Mitigation                                                                                  |
| ------------------------------------------------------------ | -------------------- | ------------------------------------------------------------------------------------------- |
| Shim quá mỏng gây mơ hồ                                      | Agent làm sai vai    | Conformance scenario 6–7; đường escalation luôn mở; cho phép shim >40 dòng nếu cần đủ nghĩa |
| Session đang mở dựa trên AGENTS.md cũ                        | Lạc hướng giữa chừng | 1 PR nguyên tử; role contract giữ nguyên nội dung rule cũ dưới tên mới                      |
| Mất rule khi di trú                                          | Suy yếu governance   | Checklist đối chiếu rule-by-rule trong review (mục 12)                                      |
| CONTEXT_RULES quá lạc quan, thiếu context gây lỗi chất lượng | Bug lọt              | Hard triggers leo tier/context; theo dõi qua 004C measurement, nới rule nếu có bằng chứng   |

## 14. Rollback plan

Revert 1 merge commit ⇒ toàn bộ governance cũ trở lại (docs trong git).
Không state ngoài git ngoại trừ nhận thức của Owner.

## 15. Acceptance criteria

- [ ] Governance chuẩn (architecture v2.4, AGENTS.md, roles/,
      CONTEXT_RULES, DOCUMENTATION_RULES) không gán vai cho vendor/model
      nào; grep-proof theo phạm vi §11 (README/runbooks/config miễn).
- [ ] `CLAUDE.md` chỉ còn discovery adapter, không chứa rule riêng.
- [ ] Envelope là yêu cầu normative; scenario "không envelope" cho kết
      quả read-only.
- [ ] Đổi provider (mô phỏng bằng mock) không đòi sửa file policy nào —
      chỉ runbook/config.
- [ ] FEATURE-014 được ghi đúng là hạn chế subagent sandbox trong
      runbook Codex, không phải hạn chế provider.
- [ ] Bảng lệnh gates tồn tại đúng 1 nơi thực thi (manifest) —
      grep-proof.
- [ ] Context đo được: read-only ≤ 1.5k, NORMAL ≤ 5k tokens quan sát
      (hoặc deviation có giải trình).
- [ ] Mọi ground rule v2.2/v2.3 được đối chiếu từng mục: còn hiệu lực
      hoặc supersede có chủ đích.
- [ ] `check:docs --all` pass; toàn bộ tests trên candidate pass.
- [ ] Review CRITICAL hoàn tất; human approve v2.4 trước merge.
