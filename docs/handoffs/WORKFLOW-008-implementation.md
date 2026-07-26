# WORKFLOW-008 Implementation Handoff

Tài liệu này gộp handoff của cả 3 PR trong `docs/plans/WORKFLOW-008-Repo-Cleanup.md`.
Mỗi PR có mục Status, evidence và verification riêng ở dưới; không mục nào ghi đè
mục nào.

## PR1 — xoá placeholder thừa (MERGED)

### Status

- Remediation state: RELEASE_READY — đã merge vào `main` qua PR #29
  (merge commit `1180941`), tuann2 duyệt ngày 2026-07-26.
- Risk tier / categories / escalation rationale: NORMAL — documentation +
  xoá file placeholder không có consumer. Không đụng auth, dependency,
  migration, CI/deploy, architecture hay giá trị số trong nội dung học.
- Base SHA / candidate SHA: `7548bc8cf27c8e0951fad7ec64bae49648ef9939` /
  `2193429173e8335a136b50ed042834568707e51a` (nhánh `chore/cleanup-placeholders`,
  PR #29). Evidence chạy trên worktree trước khi commit — nội dung mã của
  snapshot và của candidate là một; file handoff này thêm sau nên nằm ngoài.
- Worktree state and dirty paths: sạch ngoài phạm vi PR1; chỉ 5 file dưới đây.
- CI reference for exact candidate (when required/available): run
  [30198813843](https://github.com/tuann2/Hoa_hoc_THCS/actions/runs/30198813843)
  trên `2193429` — `web`, `browser`, `trivial-verify`, `branch-context-drift`
  đều pass; `deploy` skip đúng thiết kế (chỉ chạy khi push vào `main`).

### Summary and scope

- Requested scope and outcome: bước 1 của `docs/plans/WORKFLOW-008-Repo-Cleanup.md`
  — xoá 4 file `.gitkeep` đã hết tác dụng cùng thư mục `docs/api/` rỗng, và sửa
  tham chiếu chết trong `docs/architecture.md`. Hoàn thành đủ, không phát sinh.
- Files changed: `src/.gitkeep`, `tests/.gitkeep`, `docs/runbooks/.gitkeep`,
  `docs/api/.gitkeep` (xoá — `docs/api/` biến mất theo vì không còn file nào);
  `docs/architecture.md` (sửa 1 câu).
- `git diff --stat`: 5 files changed, 3 insertions(+), 2 deletions(-).

### Acceptance, decisions, and risks

| Plan acceptance criterion                       | Evidence / status                                                                                                                                  |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4 `.gitkeep` và `docs/api/` đã xoá              | `git diff --stat` ở trên; `ls docs/api` → No such file or directory                                                                                |
| `docs/architecture.md` không còn trỏ mục đã mất | Câu cũ trỏ `CLAUDE.md` §"New technology adoption" (mục không còn tồn tại) nay trỏ Risk Model trong `docs/architecture/AI_WORKFLOW_ARCHITECTURE.md` |
| Gate pass                                       | 15/15 gate exit 0, profile `full` — xem Validation evidence                                                                                        |
| `docs/trace/trivial/.gitkeep` còn nguyên        | `git ls-files docs/trace/` → `docs/trace/trivial/.gitkeep`                                                                                         |

- Design decisions: giữ `docs/trace/trivial/.gitkeep` vì thư mục đó vẫn rỗng và
  gate TRIVIAL cần nó tồn tại. Thay vì xoá câu tham chiếu chết trong
  `docs/architecture.md`, trỏ lại đúng nguồn normative hiện hành — quy tắc
  "công nghệ mới cần người duyệt" vẫn còn hiệu lực, chỉ là đã chuyển chỗ.
- Deviations: không.
- Blockers: không.
- Remaining risks / follow-up: classifier chọn profile `full` thay vì `docs` vì
  đường dẫn `.gitkeep` không khớp rule nào trong `PATH_GATE_RULES`
  (`unrecognized path; fail closed to full`). Fail-closed đúng thiết kế, không
  phải lỗi; ghi lại vì cùng nguyên nhân với `CHANGELOG.md` ở PR trước.

### Validation evidence

`npm run evidence -- --changed-from=7548bc8cf27c8e0951fad7ec64bae49648ef9939`,
snapshot git-tree `bc29b0c170072f05ee5a3655e08edf3499edbaf6`, 15/15 gate exit 0,
UTC 2026-07-26T10:38:05.350Z → 2026-07-26T10:40:25.415Z, node v24.16.0 / npm
11.13.0. Snapshot này bind vào cây mã của thay đổi PR1; file handoff này được
viết sau đó nên không nằm trong snapshot.

```json
{
  "base_sha": "7548bc8cf27c8e0951fad7ec64bae49648ef9939",
  "build_inputs": [
    {
      "path": ".env.example",
      "sha256": "6fda9c2a4670086a9b4784c5f146ae59df4ecb2f00410b89973483837bd16198"
    }
  ],
  "candidate_sha": "UNCOMMITTED",
  "finished_at": "2026-07-26T10:40:25.415Z",
  "gate_results": [
    {
      "id": "git-diff-check",
      "command": ["git", "diff", "--check"],
      "durationMs": 8,
      "exitCode": 0
    },
    {
      "id": "format-check",
      "command": ["npm", "run", "format:check"],
      "durationMs": 7728,
      "exitCode": 0
    },
    {
      "id": "content-catalog",
      "command": ["npm", "run", "check:content-catalog"],
      "durationMs": 352,
      "exitCode": 0
    },
    {
      "id": "content-validation",
      "command": ["npm", "run", "validate-content"],
      "durationMs": 363,
      "exitCode": 0
    },
    {
      "id": "lint",
      "command": ["npm", "run", "lint"],
      "durationMs": 12937,
      "exitCode": 0
    },
    {
      "id": "typecheck",
      "command": ["npm", "run", "typecheck"],
      "durationMs": 5998,
      "exitCode": 0
    },
    {
      "id": "unit-tests",
      "command": ["npm", "test"],
      "durationMs": 22586,
      "exitCode": 0
    },
    {
      "id": "production-build",
      "command": ["npm", "run", "build:app"],
      "durationMs": 5277,
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
      "durationMs": 1085,
      "exitCode": 0
    },
    {
      "id": "license-check",
      "command": ["npm", "run", "check:licenses"],
      "durationMs": 527,
      "exitCode": 0
    },
    {
      "id": "e2e",
      "command": ["npm", "run", "test:e2e"],
      "durationMs": 42528,
      "exitCode": 0
    },
    {
      "id": "pwa",
      "command": ["npm", "run", "test:pwa"],
      "durationMs": 23896,
      "exitCode": 0
    },
    {
      "id": "pwa-subpath",
      "command": ["npm", "run", "test:pwa:subpath"],
      "durationMs": 15848,
      "exitCode": 0
    },
    {
      "id": "docs-check",
      "command": ["npm", "run", "check:docs", "--", "--all"],
      "durationMs": 398,
      "exitCode": 0
    }
  ],
  "lockfile_sha256": "fcb9e26c85ffd1a43eec0a56a0cd2cb9b0a6d3a543e68f941989f03416f9c656",
  "node_version": "v24.16.0",
  "npm_version": "11.13.0",
  "result": "pass",
  "snapshot_fallback_reason": null,
  "schema_version": 1,
  "started_at": "2026-07-26T10:38:05.350Z",
  "validated_snapshot": {
    "id": "bc29b0c170072f05ee5a3655e08edf3499edbaf6",
    "kind": "git-tree"
  }
}
```

### Independent verification

- Verifier / execution identifier / independence method: tier NORMAL —
  `docs/architecture/AI_WORKFLOW_ARCHITECTURE.md` cho phép CI trên đúng candidate
  commit thay cho một reviewer độc lập; plan §Delivery plan chọn đường CI cho PR1.
- Exact candidate CI status: PASS trên `2193429` (run 30198813843).
- Findings and disposition: không có finding; không cần vòng remediation.
- Batch-content exception authorization: n/a

## PR2 — xoá nội dung danh mục A/B cũ

### Status

- Remediation state: RELEASE_READY (chờ người duyệt merge PR #30)
- Risk tier / categories / escalation rationale: NORMAL — documentation. Xoá nội
  dung tham chiếu đã hết vai trò; không đụng mã ứng dụng, nội dung đang phát cho
  học viên, auth, dependency, migration hay CI/deploy.
- Base SHA / candidate SHA: `1180941b5bdf9421d4946ab7d5a605b79cf3e258` /
  `16b3edef94e4d6d040eb6ebb33f163a21b37a800` (nhánh
  `chore/drop-feature-015-legacy-units`, PR #30).
- Worktree state and dirty paths: sạch ngoài phạm vi PR2.
- CI reference for exact candidate (when required/available): run
  [30199388510](https://github.com/tuann2/Hoa_hoc_THCS/actions/runs/30199388510)
  trên `16b3ede` — `web`, `browser`, `trivial-verify`, `branch-context-drift`
  đều pass.

### Summary and scope

- Requested scope and outcome: bước 2 của plan — xoá 17 file JSON dưới
  `docs/content-reserve/feature-015/legacy-units/`. Hoàn thành đủ.
- Files changed: 17 file JSON đã xoá (thư mục `feature-015/` biến mất theo vì
  không còn file nào); `CHANGELOG.md` thêm mục `### Removed`.
- `git diff --stat`: 17 file JSON — 17277 deletions(-); `CHANGELOG.md` — 4
  insertions(+). `docs/content-reserve/` giảm từ 1,5 MB xuống 84 KB.

### Acceptance, decisions, and risks

| Plan acceptance criterion          | Evidence / status                                                                 |
| ---------------------------------- | --------------------------------------------------------------------------------- |
| 17 file `legacy-units/` đã xoá     | `git ls-files docs/content-reserve` chỉ còn `README.md` + 9 file `a1-l*/a2-l*.md` |
| `npm run check:docs -- --all` pass | gate `docs-check` exit 0 trong evidence dưới đây                                  |
| repo giảm ~1,4 MB                  | `du -sh docs/content-reserve`: 1,5 MB → 84 KB                                     |

- Design decisions: chỉ xoá phần JSON chiếm dung lượng. Giữ `README.md` và 9 file
  `a1-l*.md`/`a2-l*.md` theo quyết định của tuann2 ngày 2026-07-26 — nội dung lý
  thuyết dự trữ đó còn tái dùng được cho danh mục `n1`–`n11`, khác với JSON vốn
  chỉ là bản sao danh mục cũ.
- Deviations: **hai điểm.** (1) Thêm mục `### Removed` vào `CHANGELOG.md`, ngoài
  phạm vi "xoá 17 file" của plan. Lý do: `CHANGELOG.md:24` trỏ tới chính thư mục
  vừa xoá, để nguyên là ghi sai sự thật; `docs/DOCUMENTATION_RULES.md` yêu cầu cập
  nhật changelog khi thay đổi thuộc phạm vi đã duyệt. (2) Plan ghi "PR3 bắt đầu
  sau khi PR2 merge"; theo dispatch của tuann2 ngày 2026-07-26, PR3 làm ngay và
  xếp chồng lên nhánh PR2 (base là `chore/drop-feature-015-legacy-units`) để mỗi
  diff vẫn đứng độc lập và revert được riêng.
- Blockers: không.
- Remaining risks / follow-up: `CHANGELOG.md:24` và
  `docs/handoffs/FEATURE-015-implementation.md` còn nhắc đường dẫn đã xoá như ghi
  chép lịch sử. Gate không báo lỗi: `DOCUMENT_REFERENCE_PATTERN` chỉ kiểm
  `docs/{plans,handoffs,architecture,runbooks,adr}/`, và handoff được miễn trừ
  bare-path. Giữ nguyên vì đó là mô tả đúng tại thời điểm FEATURE-015.

### Validation evidence

`npm run evidence -- --changed-from=1180941b5bdf9421d4946ab7d5a605b79cf3e258`,
snapshot git-tree `8cc72e9be3702db8eaac72a96f29f1b4fef9a189`, 15/15 gate exit 0,
UTC 2026-07-26T10:56:21.962Z → 2026-07-26T10:58:43.872Z.

```json
{
  "base_sha": "1180941b5bdf9421d4946ab7d5a605b79cf3e258",
  "build_inputs": [
    {
      "path": ".env.example",
      "sha256": "6fda9c2a4670086a9b4784c5f146ae59df4ecb2f00410b89973483837bd16198"
    }
  ],
  "candidate_sha": "UNCOMMITTED",
  "finished_at": "2026-07-26T10:58:43.872Z",
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
      "durationMs": 6647,
      "exitCode": 0
    },
    {
      "id": "content-catalog",
      "command": ["npm", "run", "check:content-catalog"],
      "durationMs": 343,
      "exitCode": 0
    },
    {
      "id": "content-validation",
      "command": ["npm", "run", "validate-content"],
      "durationMs": 386,
      "exitCode": 0
    },
    {
      "id": "lint",
      "command": ["npm", "run", "lint"],
      "durationMs": 13476,
      "exitCode": 0
    },
    {
      "id": "typecheck",
      "command": ["npm", "run", "typecheck"],
      "durationMs": 6523,
      "exitCode": 0
    },
    {
      "id": "unit-tests",
      "command": ["npm", "test"],
      "durationMs": 22429,
      "exitCode": 0
    },
    {
      "id": "production-build",
      "command": ["npm", "run", "build:app"],
      "durationMs": 5617,
      "exitCode": 0
    },
    {
      "id": "bundle-check",
      "command": ["npm", "run", "check:bundle"],
      "durationMs": 334,
      "exitCode": 0
    },
    {
      "id": "dependency-audit",
      "command": ["node", "--import", "tsx", "scripts/check-audit.ts"],
      "durationMs": 1058,
      "exitCode": 0
    },
    {
      "id": "license-check",
      "command": ["npm", "run", "check:licenses"],
      "durationMs": 539,
      "exitCode": 0
    },
    {
      "id": "e2e",
      "command": ["npm", "run", "test:e2e"],
      "durationMs": 43642,
      "exitCode": 0
    },
    {
      "id": "pwa",
      "command": ["npm", "run", "test:pwa"],
      "durationMs": 23879,
      "exitCode": 0
    },
    {
      "id": "pwa-subpath",
      "command": ["npm", "run", "test:pwa:subpath"],
      "durationMs": 16502,
      "exitCode": 0
    },
    {
      "id": "docs-check",
      "command": ["npm", "run", "check:docs", "--", "--all"],
      "durationMs": 388,
      "exitCode": 0
    }
  ],
  "lockfile_sha256": "fcb9e26c85ffd1a43eec0a56a0cd2cb9b0a6d3a543e68f941989f03416f9c656",
  "node_version": "v24.16.0",
  "npm_version": "11.13.0",
  "result": "pass",
  "snapshot_fallback_reason": null,
  "schema_version": 1,
  "started_at": "2026-07-26T10:56:21.962Z",
  "validated_snapshot": {
    "id": "8cc72e9be3702db8eaac72a96f29f1b4fef9a189",
    "kind": "git-tree"
  }
}
```

### Independent verification

- Verifier / execution identifier / independence method: tier NORMAL — CI trên
  đúng candidate commit thay cho reviewer độc lập, theo plan §Delivery plan.
- Exact candidate CI status: PASS trên `16b3ede` (run 30199388510).
- Findings and disposition: không có finding; không cần vòng remediation.
- Batch-content exception authorization: n/a

## PR3 — gỡ facade `src/lib/content.ts`

### Status

- Remediation state: VALIDATED — chờ Independent Reviewer (plan yêu cầu cho
  PR3) rồi mới chuyển RELEASE_READY.
- Risk tier / categories / escalation rationale: NORMAL — small refactoring giữ
  nguyên hành vi. Chỉ đổi đường import và tên gọi; không đổi logic, không đổi
  API của `contentCatalog`, không đụng auth, dependency, migration hay CI/deploy.
- Base SHA / candidate SHA: `16b3edef94e4d6d040eb6ebb33f163a21b37a800` (đỉnh
  nhánh PR2) / `5ae3769ee0ae113a4f912167815a83f66129bbb9` (nhánh
  `refactor/drop-content-facade`, PR #31).
- Worktree state and dirty paths: sạch ngoài phạm vi PR3.
- CI reference for exact candidate (when required/available): run
  [30199547218](https://github.com/tuann2/Hoa_hoc_THCS/actions/runs/30199547218)
  trên `5ae3769` — `web`, `browser`, `trivial-verify`, `branch-context-drift`
  đều pass. Job `browser` là nơi ba gate `e2e`/`pwa`/`pwa-subpath` chạy, bù cho
  việc profile `web` cục bộ không bao gồm chúng.

### Summary and scope

- Requested scope and outcome: bước 3 của plan — xoá facade `src/lib/content.ts`
  và cho mọi consumer import thẳng `src/lib/contentCatalog.ts`. Hoàn thành đủ.
- Files changed: 14 file — xoá `src/lib/content.ts`; đổi import ở 8 file nguồn
  (`App.tsx`, `HomeRoute`, `LessonRoute`, `ReviewRoute`, `ProfileRoute`,
  `ExamRoute`, `adminReports.ts`, `progressSync.ts`) và 5 file test (1 import
  trực tiếp trong `admin-reports.test.ts`, 4 khối `vi.mock` trong
  `exam-route`, `lesson-route`, `review-route`, `progress-sync`).
- `git diff --stat`: 14 files changed, 45 insertions(+), 50 deletions(-).

### Acceptance, decisions, and risks

| Plan acceptance criterion                | Evidence / status                           |
| ---------------------------------------- | ------------------------------------------- |
| `src/lib/content.ts` đã xoá              | có trong `git diff --stat` ở trên           |
| `grep -rn "lib/content'" src tests` rỗng | chạy sau khi sửa: không còn kết quả         |
| profile web pass                         | 11/11 gate exit 0 — xem Validation evidence |

- Design decisions: ba tên cũ được ánh xạ về tên chuẩn của `contentCatalog` —
  `getAllUnits` → `getUnitCatalog`, `findUnit` → `findUnitSummary`,
  `findLesson` → `findLessonSummary`. Bốn module trước đây import tên cũ rồi
  alias ngược về đúng tên chuẩn (`getAllUnits as getUnitCatalog`); nay import
  thẳng nên khối import ngắn lại. Không thêm/bớt export nào của `contentCatalog`.
- Deviations: PR3 xếp chồng trên nhánh PR2 thay vì chờ PR2 merge (xem deviation
  (2) ở mục PR2). Base của PR là `chore/drop-feature-015-legacy-units`; sau khi
  PR2 merge, GitHub tự trỏ base về `main`.
- Blockers: không.
- Remaining risks / follow-up: 4 khối `vi.mock` nay mock thẳng
  `src/lib/contentCatalog`. Vì `contentLoader` không đi qua module này nên phạm
  vi mock không đổi so với trước; đã xác nhận bằng bộ test route pass đầy đủ.

### Validation evidence

`npm run evidence -- --changed-from=16b3edef94e4d6d040eb6ebb33f163a21b37a800`,
snapshot git-tree `8576426c53d8a6894d92cc7a7a1d0f9410af2f04`, profile `web`,
11/11 gate exit 0, UTC 2026-07-26T11:05:19.069Z → 2026-07-26T11:06:17.281Z.
Ba gate browser (`e2e`, `pwa`, `pwa-subpath`) không nằm trong profile `web` nên
chạy ở job `browser` của CI trên đúng candidate.

```json
{
  "base_sha": "16b3edef94e4d6d040eb6ebb33f163a21b37a800",
  "build_inputs": [
    {
      "path": ".env.example",
      "sha256": "6fda9c2a4670086a9b4784c5f146ae59df4ecb2f00410b89973483837bd16198"
    }
  ],
  "candidate_sha": "UNCOMMITTED",
  "finished_at": "2026-07-26T11:06:17.281Z",
  "gate_results": [
    {
      "id": "git-diff-check",
      "command": ["git", "diff", "--check"],
      "durationMs": 8,
      "exitCode": 0
    },
    {
      "id": "format-check",
      "command": ["npm", "run", "format:check"],
      "durationMs": 6812,
      "exitCode": 0
    },
    {
      "id": "content-catalog",
      "command": ["npm", "run", "check:content-catalog"],
      "durationMs": 361,
      "exitCode": 0
    },
    {
      "id": "content-validation",
      "command": ["npm", "run", "validate-content"],
      "durationMs": 366,
      "exitCode": 0
    },
    {
      "id": "lint",
      "command": ["npm", "run", "lint"],
      "durationMs": 13524,
      "exitCode": 0
    },
    {
      "id": "typecheck",
      "command": ["npm", "run", "typecheck"],
      "durationMs": 6230,
      "exitCode": 0
    },
    {
      "id": "unit-tests",
      "command": ["npm", "test"],
      "durationMs": 23196,
      "exitCode": 0
    },
    {
      "id": "production-build",
      "command": ["npm", "run", "build:app"],
      "durationMs": 5495,
      "exitCode": 0
    },
    {
      "id": "bundle-check",
      "command": ["npm", "run", "check:bundle"],
      "durationMs": 362,
      "exitCode": 0
    },
    {
      "id": "dependency-audit",
      "command": ["node", "--import", "tsx", "scripts/check-audit.ts"],
      "durationMs": 1149,
      "exitCode": 0
    },
    {
      "id": "license-check",
      "command": ["npm", "run", "check:licenses"],
      "durationMs": 567,
      "exitCode": 0
    }
  ],
  "lockfile_sha256": "fcb9e26c85ffd1a43eec0a56a0cd2cb9b0a6d3a543e68f941989f03416f9c656",
  "node_version": "v24.16.0",
  "npm_version": "11.13.0",
  "result": "pass",
  "snapshot_fallback_reason": null,
  "schema_version": 1,
  "started_at": "2026-07-26T11:05:19.069Z",
  "validated_snapshot": {
    "id": "8576426c53d8a6894d92cc7a7a1d0f9410af2f04",
    "kind": "git-tree"
  }
}
```

### Independent verification

- Verifier / execution identifier / independence method: Codex, execution
  `ae5bdf3c20d643303`, effort medium — thread mới (`--fresh`), envelope
  `request_class: independent-review`, mọi quyền ghi = false, không nhận
  transcript của implementer. Đúng vai đề xuất trong plan, tuann2 xác nhận
  ngày 2026-07-26.
- Exact candidate CI status: PASS trên `5ae3769` (run 30199547218).
- Findings and disposition: verdict CHANGES_REQUESTED, **1 finding Medium**, xem
  vòng remediation dưới đây. Reviewer xác nhận không có finding nào về mã:
  ánh xạ ba tên là alias đúng của facade đã xoá, `contentCatalog.ts` không đổi;
  không còn import/dynamic import/require nào tới `lib/content`; bốn khối
  `vi.mock` giữ nguyên phạm vi cũ vì `contentLoader` không import
  `contentCatalog`, nên không consumer nào bị mock ngoài ý định.
- Batch-content exception authorization: n/a

### Remediation round 1 — snapshot binding

**Finding (Medium).** Evidence không bind vào đúng cây của candidate.
Handoff ghi evidence tree `8576426c53d8a6894d92cc7a7a1d0f9410af2f04`, trong khi
candidate `5ae3769` có tree `c6bee4d958cf5a6150bdc41a3297d3fbd6eeb548`.

**Xác minh lại (orchestrator, độc lập với báo cáo).**
`git diff --stat 8576426… 5ae3769^{tree}` → đúng 1 file khác nhau:
`docs/handoffs/WORKFLOW-008-implementation.md`, 157 insertions(+), 1 deletion(-).
Mọi đường dẫn thuộc bề mặt rủi ro (`src/`, `tests/`, `content/`, file cấu hình,
lockfile) giống nhau từng byte. Reviewer kết luận: không cần sửa mã.

**Disposition: chấp nhận có điều kiện, không chạy lại evidence.**

1. Không rerun evidence: mã không đổi, và role contract của Independent Reviewer
   cấm chạy lại validation đã pass chỉ để tạo lại log.
2. Nguyên nhân là tính chất hệ thống, không phải sai sót của PR này: handoff nằm
   trong chính cây mã, nên ghi hash của cây vào handoff sẽ làm đổi hash đó. Không
   một handoff in-tree nào tự bind chính xác vào cây chứa nó được.
3. Điều đóng khoảng trống này là **CI trên đúng commit** — run 30199547218 trên
   `5ae3769`, và run tiếp theo trên `ea59ce2`. CI bind theo SHA commit nên là
   ràng buộc chính xác thật sự. Risk Model tier NORMAL chấp nhận "CI validates
   the exact candidate commit" làm đường verification, và ở đây nó có sẵn.

**Còn lại cần con người quyết:** mục 2 áp cho cả PR1 và PR2 của plan này và cho
mọi handoff trước đó trong repo. Nếu muốn đóng triệt để thì phải đổi thiết kế
evidence (ví dụ tách bản ghi evidence ra ngoài cây mã, hoặc bind theo commit SHA
thay vì tree hash) — đó là thay đổi `scripts/evidence.ts` + kiến trúc, phải là
plan riêng, không nằm trong phạm vi WORKFLOW-008.
