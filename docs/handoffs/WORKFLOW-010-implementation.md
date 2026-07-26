# WORKFLOW-010 Implementation Handoff

## Status

- Remediation state: VALIDATED — hai blocker của Implementer đã được orchestrator
  bù theo degradation path, xem mục Degradation dưới đây.
- Risk tier / categories / escalation rationale: NORMAL; runbook documentation and interactive CLI configuration.
- Base SHA / candidate SHA: 8628f84 / UNCOMMITTED
- Worktree state and dirty paths: sạch ngoài phạm vi; 3 file tracked + handoff này.
- CI reference for exact candidate (when required/available): PENDING

## Summary and scope

- Requested scope and outcome: restore provider model/effort guidance and set interactive effort to `medium`.
- Files changed: `docs/runbooks/providers/antigravity.md`, `docs/runbooks/providers/codex.md`, `.codex/config.toml`, và handoff này.
- `git diff --stat`: xem mục Validation evidence (orchestrator chạy sau khi bù blocker).

## Acceptance, decisions, and risks

| Plan acceptance criterion                                 | Evidence / status                                                                                          |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Antigravity criteria, dated ID table, and recheck command | Met — Implementer viết tiêu chí + khung bảng và từ chối bịa ID; orchestrator điền ID thật từ `agy models`. |
| Codex model/effort and interactive/delegation boundary    | Met in `codex.md`.                                                                                         |
| Config effort is `medium`                                 | Met — orchestrator đổi `high` → `medium` kèm chú thích chỉ áp cho phiên CLI tương tác.                     |
| Handoff has verbatim `agy models` result                  | Met — cả output lỗi của Implementer lẫn output thành công của orchestrator, xem hai khối dưới.             |
| Old branch deleted after merge                            | PENDING; post-merge action outside this envelope.                                                          |

- Decisions/deviations: durable criteria are separate from IDs. Codex model name was not verifiable from session metadata.
- Blockers: đã đóng, xem mục Degradation.
- Follow-up: tên model Codex vẫn CHƯA được xác minh độc lập — `codex.md` ghi rõ
  trạng thái đó thay vì khai đã xác minh. Ai có phiên Codex CLI trực tiếp nên
  chạy `/status` và cập nhật bảng kèm ngày.

## Degradation — orchestrator bù phần Implementer thiếu năng lực

Implementer (Codex, profile `codex-claude-subagent`) bị sandbox chặn hai việc,
không phải lỗi thực thi:

1. `agy models` không khởi động được — `listen tcp 127.0.0.1:0: socket:
operation not permitted`, cộng filesystem chỉ-đọc cho thư mục log.
2. `.codex/config.toml` nằm trên filesystem chỉ-đọc, không ghi được.

Implementer xử lý đúng: ghi BLOCKED, **từ chối bịa ID model**, và vẫn hoàn thành
tầng tiêu chí chọn (phần không phụ thuộc năng lực bị thiếu).

Plan §Execution profile đặt degradation path là "để blocked". tuann2 quyết định
ngày 2026-07-26 cho orchestrator (Claude Code) bù hai phần đó thay vì để dở, và
yêu cầu ghi lại thành degradation. `docs/runbooks/providers/codex.md` vốn đã lập
sẵn đường này cho năng lực mà profile thiếu.

Orchestrator đã làm: chạy `agy models` thành công và điền bảng ID; đổi
`model_reasoning_effort` xuống `medium`; sửa tiêu đề mục vốn ghi "Verified on
2026-07-26" trong khi các dòng đều BLOCKED — mâu thuẫn nội tại đúng loại mà plan
này sinh ra để chặn.

**Ranh giới:** orchestrator không viết lại tầng tiêu chí chọn — phần thực sự
"substantial" của việc này vẫn do Implementer làm.

## `agy models` (orchestrator, thành công, 2026-07-26)

```text
gemini-3.6-flash-high
gemini-3.6-flash-medium
gemini-3.6-flash-low
gemini-3.5-flash-high
gemini-3.5-flash-medium
gemini-3.5-flash-low
gemini-3.1-pro-high
gemini-3.1-pro-low
claude-sonnet-4-6
claude-opus-4-6-thinking
gpt-oss-120b-medium
```

## `agy models` (Implementer, thất bại vì sandbox)

```text
E0726 13:45:11.822553    36 main.go:337] Failed to redirect output for CLI: creating log file: opening log file: open /home/code_agent/.gemini/antigravity-cli/log/cli-20260726_134511.log: read-only file system
I0726 13:45:11.822660    36 server.go:1423] Starting language server process with pid 36
E0726 13:45:11.822739    36 server.go:1408] Failed to initialize crash reporter: failed to setup crash output: open /home/code_agent/.gemini/antigravity-cli/crashes/crash_36_04a54eb6-c94c-494c-afff-e18a187c34c5.log: read-only file system
I0726 13:45:11.824155    36 server.go:1473] Language server version: 1.1.7
I0726 13:45:11.824180    36 server.go:545] Language server will attempt to listen on host localhost
E0726 13:45:11.825139    36 main.go:452] CLI failed to start - listen tcp 127.0.0.1:0: socket: operation not permitted
(1) attached stack trace
  -- stack trace:
  | google3/third_party/jetski/language_server/language_server.setUpServerPortListeners
  | 	third_party/jetski/language_server/server.go:557
  | 	third_party/jetski/language_server/language_server.CreateLanguageServerAndServe
  | 	third_party/jetski/language_server/server.go:1484
  | main.main.func4
  | runtime.goexit
  | 	third_party/go/gc/src/runtime/asm_amd64.s:1264
Wraps: (2) listen tcp 127.0.0.1:0
Wraps: (3) socket
Wraps: (4) operation not permitted
Error types: (1) *withstack.withStack (2) *net.OpError (3) *os.SyscallError (4) syscall.Errno
```

## Validation evidence

Implementer chạy được `git-diff-check`, `format-check`, `docs-check` nhưng
evidence phải dùng manifest fallback vì sandbox không cho Git tạo temporary
index — nên bản đó không bind được snapshot, và bị thay bằng bản dưới đây.

Orchestrator chạy lại trên worktree đã bù blocker:
`npm run evidence -- --changed-from=8628f84`, snapshot git-tree
`109832d3811b3f816c5a592535f1d867c838e5b9`, **15/15 gate exit 0**, UTC
2026-07-26T13:57:57.591Z → 2026-07-26T14:00:18.210Z.

Classifier chọn profile `full` chứ không phải `docs`: `.codex/config.toml`
không khớp rule nào trong `PATH_GATE_RULES` nên rơi vào nhánh fail-closed
`'unrecognized path; fail closed to full'`. Đúng thiết kế. Đây là lần thứ ba
gặp cùng nguyên nhân (trước đó: `CHANGELOG.md`, `.gitkeep`) — đã có follow-up
mở về việc này trong handoff WORKFLOW-008.

```json
{
  "base_sha": "8628f84427f4861bb90f6b25269868f6ca3fdbe2",
  "build_inputs": [
    {
      "path": ".env.example",
      "sha256": "6fda9c2a4670086a9b4784c5f146ae59df4ecb2f00410b89973483837bd16198"
    }
  ],
  "candidate_sha": "UNCOMMITTED",
  "finished_at": "2026-07-26T14:00:18.210Z",
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
      "durationMs": 6911,
      "exitCode": 0
    },
    {
      "id": "content-catalog",
      "command": ["npm", "run", "check:content-catalog"],
      "durationMs": 350,
      "exitCode": 0
    },
    {
      "id": "content-validation",
      "command": ["npm", "run", "validate-content"],
      "durationMs": 348,
      "exitCode": 0
    },
    {
      "id": "lint",
      "command": ["npm", "run", "lint"],
      "durationMs": 12822,
      "exitCode": 0
    },
    {
      "id": "typecheck",
      "command": ["npm", "run", "typecheck"],
      "durationMs": 6306,
      "exitCode": 0
    },
    {
      "id": "unit-tests",
      "command": ["npm", "test"],
      "durationMs": 23087,
      "exitCode": 0
    },
    {
      "id": "production-build",
      "command": ["npm", "run", "build:app"],
      "durationMs": 5545,
      "exitCode": 0
    },
    {
      "id": "bundle-check",
      "command": ["npm", "run", "check:bundle"],
      "durationMs": 351,
      "exitCode": 0
    },
    {
      "id": "dependency-audit",
      "command": ["node", "--import", "tsx", "scripts/check-audit.ts"],
      "durationMs": 1084,
      "exitCode": 0
    },
    {
      "id": "license-check",
      "command": ["npm", "run", "check:licenses"],
      "durationMs": 608,
      "exitCode": 0
    },
    {
      "id": "e2e",
      "command": ["npm", "run", "test:e2e"],
      "durationMs": 42564,
      "exitCode": 0
    },
    {
      "id": "pwa",
      "command": ["npm", "run", "test:pwa"],
      "durationMs": 24019,
      "exitCode": 0
    },
    {
      "id": "pwa-subpath",
      "command": ["npm", "run", "test:pwa:subpath"],
      "durationMs": 16091,
      "exitCode": 0
    },
    {
      "id": "docs-check",
      "command": ["npm", "run", "check:docs", "--", "--all"],
      "durationMs": 389,
      "exitCode": 0
    }
  ],
  "lockfile_sha256": "fcb9e26c85ffd1a43eec0a56a0cd2cb9b0a6d3a543e68f941989f03416f9c656",
  "node_version": "v24.16.0",
  "npm_version": "11.13.0",
  "result": "pass",
  "snapshot_fallback_reason": null,
  "schema_version": 1,
  "started_at": "2026-07-26T13:57:57.591Z",
  "validated_snapshot": {
    "id": "109832d3811b3f816c5a592535f1d867c838e5b9",
    "kind": "git-tree"
  }
}
```

## Independent verification

- Verifier / execution identifier / independence method: `agy`, model
  `gemini-3.6-flash-high`, execution mới không thừa hưởng transcript của
  Implementer. Envelope `request_class: independent-review`, mọi quyền ghi =
  false. Vai này do tuann2 xác nhận ngày 2026-07-26. Chọn lớp model nhanh theo
  đúng tiêu chí vừa viết trong `antigravity.md` cho việc review tài liệu — lần
  dùng thực tế đầu tiên của chính hướng dẫn này.
- **Giới hạn về cách cấp nội dung, ghi để người đọc sau đánh giá đúng mức độ
  độc lập:** `agy` ở chế độ headless tự từ chối tool cần quyền `command`, nên
  reviewer không tự duyệt được repo. Orchestrator KHÔNG dùng
  `--dangerously-skip-permissions` vì cờ đó cấp luôn quyền ghi, mâu thuẫn với
  envelope read-only. Thay vào đó dán nguyên văn toàn bộ diff của cả 4 file cùng
  handoff vào prompt, sau khi đã kiểm `git diff --name-only 8628f84 HEAD` xác
  nhận đúng 4 file đó thay đổi và không file nào khác. Reviewer vì vậy chỉ thấy
  những gì orchestrator cấp; phạm vi cấp là toàn bộ thay đổi, không cắt xén.
- Exact candidate CI status: PASS trên `6ee4092` (run 30205306609) — `web`,
  `browser`, `trivial-verify`, `branch-context-drift`.
- Findings and disposition: **APPROVE, không có finding.** Reviewer xác nhận:
  toàn bộ 11 model ID trong `antigravity.md` khớp nguyên văn output `agy models`
  ở handoff, không ID nào bị bịa; `codex.md` đặt tiêu đề `Model IDs` chứ không
  phải `Verified model IDs` và ghi rõ `not independently verified`, tức không
  khai khống; tầng tiêu chí chọn ở cả hai runbook không lẫn tên model cụ thể;
  chú thích trong `.codex/config.toml` đồng bộ với runbook.
- Reviewer tự nêu hai điều không kiểm được: (1) không tự chạy `agy models` nên
  chỉ đối chiếu được với output đã dán; (2) không kiểm được `/status` của Codex.
  Cả hai đã được ghi là chưa xác minh trong runbook, không phải phát hiện mới.
- Batch-content exception authorization: n/a
