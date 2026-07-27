# WORKFLOW-011 Implementation Handoff

## Status

- Remediation state: RELEASE_READY — review ELEVATED APPROVE, không finding chặn. Chờ Human Approval để merge.
- Risk tier / categories / escalation rationale: ELEVATED — governance-enforcement tooling; path-to-gate classification controls required validation.
- Base SHA / candidate SHA: 2c8ad38e584fdb3b9c0d058772b57ac71c9597a2 / UNCOMMITTED
- Worktree state and dirty paths: DIRTY — tests/scripts/classify-change.test.ts, docs/handoffs/WORKFLOW-011-implementation.md
- CI reference for exact candidate (when required/available): PENDING

## Summary and scope

- Requested scope and outcome: Classify all 24 previously unmatched tracked paths explicitly and prevent unclassified tracked paths from recurring.
- Files changed: scripts/gates-manifest.ts; tests/scripts/gates-manifest.test.ts; tests/scripts/classify-change.test.ts; docs/handoffs/WORKFLOW-011-implementation.md
- `git diff --stat`: current working tree changes only the two envelope-allowed files; the completed rule and coverage-test changes are already in the candidate branch history.

## Role execution log

| Role                 | Executing agent                  | Model / effort | Human confirmer + timestamp | Execution evidence                                                |
| -------------------- | -------------------------------- | -------------- | --------------------------- | ----------------------------------------------------------------- |
| Planner              | Claude Code                      | high           | tuann2, 2026-07-26          | confirmed by tuann2                                               |
| Implementer          | Codex                            | high           | tuann2, 2026-07-27          | relayed role confirmation                                         |
| Independent Reviewer | agy (`claude-opus-4-6-thinking`) | —              | tuann2, 2026-07-27          | Verdict APPROVE, không finding chặn; xem Independent verification |
| Release Assessor     | Claude Code                      | low            | tuann2, 2026-07-27          | Đánh giá ở mục Release Assessment                                 |

## Acceptance, decisions, and risks

| Plan acceptance criterion                        | Evidence / status                                                |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| Explicitly classify all tracked paths            | Measured before: 24/235 unmatched; after: 0/237 unmatched        |
| Group A remains full                             | Unit tests added; targeted fixture test passes                   |
| Group B maps to web                              | Unit tests added; suite has sandbox spawn limitation below       |
| Group C maps only the two approved files to docs | Unit tests added; suite has sandbox spawn limitation below       |
| First matching rule wins                         | Unit test added for each new regex; suite has sandbox limitation |

- Design decisions: Kept every existing rule in its original order; appended three anchored rules for Groups A, B, and C.
- Deviations: Gate scope narrowed from full to docs only for CHANGELOG.md and PROJECT_STORY.md; approver tuann2, 2026-07-27.
- Scope history: The preceding Implementer execution stopped because `tests/scripts/classify-change.test.ts` was outside its envelope after it found the expired Supabase-migration fixture. Plan revision 2 expanded scope to that file; tuann2 approved the expansion separately on 2026-07-27. The fixture now uses `unclassified/example.bin`, a synthetic path that matches no `PATH_GATE_RULES` pattern and does not exist in the repository, preserving the fail-closed assertion.
- Blockers: No scope or implementation blocker remains. In this sandbox, full `npm test` reports 281 passed and 1 failed because `tests/scripts/gates-manifest.test.ts` cannot spawn `git` (`spawnSync git EPERM`); direct `git ls-files -z` measurement succeeds. This is an environment validation limitation, not a failing classification assertion.
- Orchestrator verification (2026-07-27): rerun `npm test` in the unrestricted
  environment — **35/35 test files, 282/282 tests pass**, including
  `tests/scripts/gates-manifest.test.ts`. This confirms the Implementer's single
  reported failure was the sandbox `spawnSync git EPERM` limitation, not a code
  defect. Orchestrator also re-measured independently with `git ls-files -z`
  against `PATH_GATE_RULES`: **0 unclassified paths out of 237 tracked files**.
- Remaining risks / follow-up: obtain the fresh ELEVATED independent review and a
  separate release assessment; both roles are still unconfirmed.

## Validation evidence

Do orchestrator chạy, theo degradation path đã ghi ở
`docs/runbooks/providers/codex.md`: profile `codex-claude-subagent` bị EPERM khi
tsx tạo IPC pipe và khi Vitest spawn `git`, nên Implementer không tự chạy được
gate/evidence đầy đủ.

`npm run gates -- --changed-from=0830c780` → **pass, 15/15 gate, profile `full`**
(đúng như plan dự đoán vì thay đổi nằm ở `scripts/**`).

`npm run evidence -- --changed-from=0830c780`, đo trên worktree sạch ngay sau
commit `148111e7c1ca226e017ba77b350ebe6d30eeb967`: `snapshot_fallback_reason:
null`, `candidate_sha: 148111e7...` (không phải `UNCOMMITTED` vì worktree sạch),
snapshot git-tree `1ff3e947dec10076554232e2f0a463ec9536879a` **bằng đúng tree của
commit đó**.

Độ lệch còn lại là chính khối JSON này, thêm ở commit kế tiếp — giới hạn cố hữu
của handoff nằm trong cây mã, đã ghi thành follow-up mở ở handoff WORKFLOW-008.

```json
{
  "base_sha": "148111e7c1ca226e017ba77b350ebe6d30eeb967",
  "build_inputs": [
    {
      "path": ".env.example",
      "sha256": "6fda9c2a4670086a9b4784c5f146ae59df4ecb2f00410b89973483837bd16198"
    }
  ],
  "candidate_sha": "148111e7c1ca226e017ba77b350ebe6d30eeb967",
  "finished_at": "2026-07-27T01:23:41.222Z",
  "gate_results": [
    {
      "id": "git-diff-check",
      "command": ["git", "diff", "--check"],
      "durationMs": 6,
      "exitCode": 0
    },
    {
      "id": "format-check",
      "command": ["npm", "run", "format:check"],
      "durationMs": 7406,
      "exitCode": 0
    },
    {
      "id": "content-catalog",
      "command": ["npm", "run", "check:content-catalog"],
      "durationMs": 370,
      "exitCode": 0
    },
    {
      "id": "content-validation",
      "command": ["npm", "run", "validate-content"],
      "durationMs": 371,
      "exitCode": 0
    },
    {
      "id": "lint",
      "command": ["npm", "run", "lint"],
      "durationMs": 13773,
      "exitCode": 0
    },
    {
      "id": "typecheck",
      "command": ["npm", "run", "typecheck"],
      "durationMs": 6302,
      "exitCode": 0
    },
    {
      "id": "unit-tests",
      "command": ["npm", "test"],
      "durationMs": 22739,
      "exitCode": 0
    },
    {
      "id": "production-build",
      "command": ["npm", "run", "build:app"],
      "durationMs": 5511,
      "exitCode": 0
    },
    {
      "id": "bundle-check",
      "command": ["npm", "run", "check:bundle"],
      "durationMs": 352,
      "exitCode": 0
    },
    {
      "id": "dependency-audit",
      "command": ["node", "--import", "tsx", "scripts/check-audit.ts"],
      "durationMs": 1129,
      "exitCode": 0
    },
    {
      "id": "license-check",
      "command": ["npm", "run", "check:licenses"],
      "durationMs": 497,
      "exitCode": 0
    },
    {
      "id": "e2e",
      "command": ["npm", "run", "test:e2e"],
      "durationMs": 44160,
      "exitCode": 0
    },
    {
      "id": "pwa",
      "command": ["npm", "run", "test:pwa"],
      "durationMs": 24711,
      "exitCode": 0
    },
    {
      "id": "pwa-subpath",
      "command": ["npm", "run", "test:pwa:subpath"],
      "durationMs": 16432,
      "exitCode": 0
    },
    {
      "id": "docs-check",
      "command": ["npm", "run", "check:docs", "--", "--all"],
      "durationMs": 460,
      "exitCode": 0
    }
  ],
  "lockfile_sha256": "fcb9e26c85ffd1a43eec0a56a0cd2cb9b0a6d3a543e68f941989f03416f9c656",
  "node_version": "v24.16.0",
  "npm_version": "11.13.0",
  "result": "pass",
  "snapshot_fallback_reason": null,
  "schema_version": 1,
  "started_at": "2026-07-27T01:21:16.861Z",
  "validated_snapshot": {
    "id": "1ff3e947dec10076554232e2f0a463ec9536879a",
    "kind": "git-tree"
  }
}
```

## Independent verification

- Verifier / execution identifier / independence method: `agy`, model
  `claude-opus-4-6-thinking` — lớp "strong structural reasoning" theo tiêu chí ở
  `docs/runbooks/providers/antigravity.md`, đúng loại việc (review logic regex và
  test). Execution mới, không thừa hưởng transcript của Implementer (Codex),
  envelope read-only. Vai do tuann2 xác nhận riêng ngày 2026-07-27.
- Giới hạn về cách cấp nội dung: agy headless tự từ chối tool cần quyền
  `command`; orchestrator không dùng `--dangerously-skip-permissions` vì cờ đó
  cấp cả quyền ghi, trái envelope read-only. Thay vào đó dán nguyên văn: diff
  thực thi, **toàn bộ** `PATH_GATE_RULES` sau thay đổi theo đúng thứ tự, định
  nghĩa các profile, cơ chế fail-closed trong `classify-change.ts`, và tiêu chí
  acceptance của plan. Reviewer tự ghi những gì nó không kiểm được.
- Exact candidate CI status: PR #38, 4/4 job pass trên candidate.
- **Findings and disposition — verdict APPROVE, không finding chặn.** Sáu trọng
  tâm đều đạt:
  - Regex neo `^...$` đầy đủ, mọi dấu chấm literal đã escape; alternation tên
    script kèm `\.ts` nên `cli-other.ts` không lọt; `(?:postcss|tailwind)\.config\.js`
    không khớp `postcss.config.jsx` hay `foo-postcss.config.js`.
  - Rule Nhóm C khớp **đúng hai** file `CHANGELOG.md` và `PROJECT_STORY.md`,
    không hơn — tôn trọng đúng ranh giới phê duyệt của con người.
  - Thứ tự rule: reviewer dựng bảng đối chiếu từng đường dẫn mới với **mọi** rule
    đứng trước và kết luận không rule nào bị che; các rule mới cũng không che
    nhau. Không đường dẫn nào từ profile cao rơi xuống profile thấp do chèn rule.
  - Nhóm B mất 4 gate so với `full` (`e2e`, `pwa`, `pwa-subpath`, `docs-check`);
    reviewer đối chiếu từng gate và kết luận không gate nào liên quan tới
    `tests/hooks/**` hay `tests/fixtures/check-licenses/**`.
  - Test chống mọc lại dùng `git ls-files -z` với `encoding: 'buffer'`, tách theo
    `\0`, assert tập không-khớp bằng `[]` — **không thể xanh rỗng tuếch**.
  - `classify-change.ts` **không có thay đổi nào**; fail-closed còn nguyên.
- **Một ghi nhận informational, không chặn:** trong test "first matching rule",
  assertion `PATH_GATE_RULES.filter(...)[0]).toBe(firstMatch)` là **tautology** —
  `.find()` và `.filter()[0]` cho cùng kết quả trên cùng mảng khi regex không có
  cờ `/g`. Assertion theo `reason` ngay trước đó mới là cái mang ý nghĩa thật.
  Reviewer đề xuất thay bằng phép đếm số rule khớp, để bắt được trường hợp một
  đường dẫn vô tình khớp nhiều rule. **Disposition: chấp nhận, ghi thành
  follow-up.** Không chặn phát hành vì assertion thừa không làm test yếu đi,
  và phần bảo vệ thật (assert theo `reason` + assert tập rỗng) vẫn nguyên. Nếu
  làm tiếp, đó là một sửa test nhỏ nên gộp vào lần chạm `gates-manifest` kế tiếp.
- Reviewer tự nêu không kiểm được: số file tracked thực tế, giá trị runtime của
  `WEB_CLASSIFIER_GATES`, danh sách 24 đường dẫn cũ, và trạng thái CI — vì không
  chạy được lệnh. Những hạng mục đó do orchestrator đo và do CI xác nhận.
- Batch-content exception authorization: n/a

## Release Assessment

Thực hiện bởi Claude Code, vai do tuann2 xác nhận riêng ngày 2026-07-27, khác
Implementer (Codex) đúng ràng buộc tách vai. **Công bố kiêm nhiệm theo `AGENTS.md`
mục 7:** cùng execution này giữ cả vai Planner của WORKFLOW-011. Không vi phạm
Responsibility Matrix — điều bị cấm là Planner _implement_, và việc đó do Codex
làm. Nhưng người đọc cần biết assessor không độc lập với thiết kế đang được đánh
giá; điều bù lại là kết luận dựa trên một vòng review độc lập thật, không dựa
trên phán đoán của assessor.

**Kết luận: RELEASE_READY** — đây là đánh giá, không phải Human Approval.

| Hạng mục                 | Kết quả                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| Phạm vi khớp plan        | Đúng 4 file trong In scope sau revision 2; không file nào ngoài                             |
| Thu hẹp gate             | Đúng 2 đường dẫn được phê duyệt đích danh; reviewer xác nhận regex không khớp rộng hơn      |
| Mục tiêu chính           | 24/235 → **0/237** đường dẫn chưa phân loại; orchestrator đo độc lập bằng `git ls-files -z` |
| Nhóm A không đổi hành vi | Vẫn ra `full`, có test khẳng định                                                           |
| Fail-closed              | `classify-change.ts` không có thay đổi nào; reviewer xác nhận                               |
| Test                     | 282/282 pass trong môi trường không hạn chế                                                 |
| Gate                     | 15/15 exit 0, profile `full`                                                                |
| Evidence                 | Bind chính xác: `candidate_sha 148111e`, snapshot `1ff3e947` = tree của commit đó           |
| Review theo tier         | ELEVATED cần 1 reviewer tươi đọc từng dòng — đã có, verdict APPROVE                         |

### Deviation ghi nhận

1. **Thu hẹp phạm vi gate** cho `CHANGELOG.md` và `PROJECT_STORY.md`, theo
   `AGENTS.md` mục 6, approver tuann2 ngày 2026-07-27, duyệt đích danh tách rời
   khỏi việc duyệt plan.
2. **Mở rộng phạm vi giữa chừng** (revision 2): thêm
   `tests/scripts/classify-change.test.ts`. Nguyên nhân là thiếu sót của Planner
   khi soạn plan, phát hiện bởi Implementer lúc chạy test. Implementer dừng đúng
   envelope thay vì tự sửa file ngoài phạm vi. tuann2 duyệt riêng.
3. **Orchestrator chạy gate/evidence thay Implementer** theo degradation path đã
   ghi trong `docs/runbooks/providers/codex.md`: sandbox chặn cả tsx IPC pipe lẫn
   Vitest spawn `git`.

### Rủi ro tồn dư

Assertion tautology trong test "first matching rule" (xem Independent
verification). Không làm yếu phần bảo vệ thật, đã ghi thành follow-up.

Quyền merge và phê duyệt phát hành thuộc tuann2.
