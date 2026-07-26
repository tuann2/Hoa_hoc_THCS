# WORKFLOW-008: Dọn file thừa và tàn dư của tính năng/workflow cũ

## Status

- Status: APPROVED <!-- DRAFT | APPROVED | SUPERSEDED -->
- Owner: Claude Code (Planner; dispatch của tuann2 ngày 2026-07-26)
- Approved by / date: tuann2, 2026-07-26 (duyệt nội dung plan trong PR #28;
  các vai trò ở bảng Execution assignment vẫn cần xác nhận riêng từng vai)
- Risk tier: NORMAL
- Risk categories and escalation rationale: documentation + small refactoring
  theo bảng phân loại của Risk Model. Không đụng auth/authorization,
  dependency, migration, CI/deploy, `docs/architecture/AI_WORKFLOW_ARCHITECTURE.md`
  hay giá trị số trong nội dung học — không rule leo thang nào áp dụng.
- Change type and required gate profile: docs (PR1, PR2) và application source
  (PR3); profile do `scripts/gates-manifest.ts` chọn theo đường dẫn thay đổi.

## Objective and scope

- Objective: xoá file không còn consumer hoặc chỉ phục vụ danh mục/quy trình đã
  bị thay thế, giảm nhiễu context và dung lượng repo, không đổi hành vi ứng dụng.
- In scope: 22 file trong bảng dưới, chia thành 3 PR độc lập.
- Out of scope (đã rà và quyết định giữ): `docs/content/CONTENT_OUTLINE.md` và
  `docs/content-reserve/a1-l*.md`, `a2-l*.md` (quyết định của tuann2 2026-07-26);
  `scripts/tag-question-category.ts` (còn dùng — sinh trường `category` mà
  `src/lib/contentValidation.ts:36` bắt buộc); `.github/workflows/deploy.yml`
  (deploy thủ công theo candidate SHA, runbook FEATURE-016 dùng);
  `docs/plans/**` và `docs/handoffs/**` lịch sử; thêm `CHANGELOG.md` vào rule
  docs của gate manifest (nới lỏng phạm vi gate — cần phê duyệt riêng kèm
  deviation theo `AGENTS.md` mục 6).

## Current analysis and design

Đã rà toàn bộ 251 file tracked; bằng chứng cho từng mục:

| PR  | Xoá / sửa                                                                       | Bằng chứng                                                                                                                                                                                                                                   |
| --- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `src/.gitkeep`, `tests/.gitkeep`, `docs/runbooks/.gitkeep`, `docs/api/.gitkeep` | 3 thư mục đầu đã có 39/48/8 file nên `.gitkeep` hết tác dụng; `docs/api/` rỗng và 0 tham chiếu toàn repo. Giữ `docs/trace/trivial/.gitkeep` vì thư mục đó còn rỗng và gate cần nó tồn tại.                                                   |
| 1   | sửa `docs/architecture.md`                                                      | Đang trỏ `CLAUDE.md` §"New technology adoption"; mục này không còn tồn tại (`CLAUDE.md` nay chỉ `@AGENTS.md`).                                                                                                                               |
| 2   | `docs/content-reserve/feature-015/legacy-units/*.json` (17 file, 1.4 MB)        | Nguồn danh mục A/B cho vòng R2–R4 của FEATURE-015; R4 đã đóng VALIDATED và danh mục hiện tại là n1–n11. 0 markdown link trỏ tới; mọi tham chiếu còn lại là bare path trong plan/handoff mà `scripts/check-docs.ts:220` miễn trừ.             |
| 3   | `src/lib/content.ts`                                                            | Facade 15 dòng chỉ re-export `contentCatalog` dưới tên cũ; 9 file src/test import qua nó và `LessonRoute`/`ReviewRoute`/`ExamRoute`/`progressSync` alias ngược về tên chuẩn. Đổi import trực tiếp sang `./contentCatalog` + sửa 5 test mock. |

- Proposed design: thuần xoá và đổi tên import, không đổi logic. PR3 giữ nguyên
  API của `contentCatalog`; không thêm/bớt export nào.
- New technology: không có.
- Execution profile + degradation path: Implementer cần `repo-rw + shell + test`.
  Nếu profile được giao không chạy được gate, dừng và báo blocked — không tự
  khai gate pass.

## Delivery plan

Execution assignment — đề xuất agent/model/effort theo khối lượng công việc
từng vai trò; mỗi dòng cần con người xác nhận riêng khi đến lượt vai trò đó,
duyệt nội dung plan không tự động duyệt luôn việc nhận vai kế tiếp:

| Vai trò              | Agent đề xuất                | Model / effort đề xuất | Lý do                                                                                                                              |
| -------------------- | ---------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Planner              | Claude Code                  | high                   | Đã rà toàn bộ file tracked và thu thập bằng chứng consumer cho từng ứng viên; bản DRAFT này là kết quả.                            |
| Implementer          | Claude Code                  | medium                 | Thay đổi cơ học phạm vi hẹp (xoá file, đổi tên import); cần shell chạy gate, không cần suy luận thiết kế.                          |
| Independent Reviewer | Codex (`codex:codex-rescue`) | medium                 | NORMAL cần một reviewer đọc-only với context tươi; chỉ bắt buộc cho PR3 (đụng src), PR1/PR2 dựa vào CI trên đúng candidate commit. |
| Release Assessor     | Claude Code                  | low                    | Phạm vi NORMAL, 3 PR nhỏ, chủ yếu đối chiếu acceptance và evidence.                                                                |

1. PR1 `chore/cleanup-placeholders` — xoá 4 `.gitkeep` + thư mục `docs/api/`,
   sửa tham chiếu chết trong `docs/architecture.md`.
2. PR2 `chore/drop-feature-015-legacy-units` — xoá 17 file `legacy-units/`.
3. PR3 `refactor/drop-content-facade` — xoá `src/lib/content.ts`, đổi import ở
   9 file nguồn/test, cập nhật 5 test mock `vi.mock('.../lib/content')`.

Mỗi PR: `npm run gates -- --changed-from=<base_sha>` rồi `npm run evidence -- --changed-from=<base_sha>`,
handoff theo `docs/handoffs/_TEMPLATE.md` ghi base/candidate SHA. PR2 chỉ bắt
đầu sau khi PR1 merge, PR3 sau khi PR2 merge, để mỗi diff đứng độc lập.

## Risks and controls

| Risk                           | Impact                          | Mitigation                                                                                                                                    |
| ------------------------------ | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Xoá nhầm file còn consumer     | Gãy build hoặc gate             | Mỗi PR chạy profile do classifier chọn; PR3 kéo profile web đầy đủ (lint, typecheck, test, build, e2e).                                       |
| Xoá file làm gãy link docs     | `check:docs` fail               | Đã xác minh trước: 0 markdown link trỏ tới target, bare path trong plan/handoff được miễn trừ; `check:docs --all` vẫn chạy trong mọi profile. |
| Cần lại nội dung dự trữ đã xoá | Phải soạn lại nội dung          | Nội dung truy hồi được bằng `git show <sha>^:<path>`; handoff ghi SHA ngay trước khi xoá.                                                     |
| PR3 làm lệch hành vi route     | Học viên điều hướng/mất tiến độ | Chỉ đổi tên import, không đổi logic; 5 test route + E2E phủ luồng; reviewer đọc từng dòng diff.                                               |

## Acceptance and recovery

- [ ] PR1: 4 `.gitkeep` và `docs/api/` đã xoá; `docs/architecture.md` không còn
      trỏ mục đã mất; gate pass; `docs/trace/trivial/.gitkeep` còn nguyên.
- [ ] PR2: 17 file `legacy-units/` đã xoá; `npm run check:docs -- --all` pass;
      repo giảm ~1.4 MB.
- [ ] PR3: `src/lib/content.ts` đã xoá; không còn kết quả cho
      `grep -rn "lib/content'" src tests`; profile web pass.
- [ ] Mỗi PR có handoff riêng với base/candidate SHA và evidence tương ứng.
- Security considerations: không đụng auth, RLS, secret, dependency, CI/deploy.
- API/database impact: không.
- Test strategy: gate do classifier chọn cho từng PR; PR3 rà thêm thủ công 5
  test mock `vi.mock` để chắc chúng mock đúng module mới.
- Rollback plan: mỗi PR là một commit độc lập trên `main` → `git revert <sha>`;
  file đã xoá lấy lại bằng `git show <sha>^:<path> > <path>`.
