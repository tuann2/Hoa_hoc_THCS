# WORKFLOW-013: Vá 4 advisory đang chặn `dependency-audit`

## Status

- Status: DRAFT <!-- DRAFT | APPROVED | SUPERSEDED -->
- Owner: Claude Code (Planner; dispatch của tuann2 ngày 2026-08-13, vai Planner
  được tuann2 xác nhận riêng cùng ngày)
- Approved by / date:
- Risk tier: **CRITICAL**
- Risk categories and escalation rationale: thay đổi `package.json` +
  `package-lock.json`. `docs/CONTEXT_RULES.md` xếp dependencies/lockfile vào
  hàng "CI/deploy/scripts/dependencies — control changes are CRITICAL", và
  `postcss` tham gia trực tiếp vào build sản phẩm nên bump sai có thể đổi CSS
  được phát hành.
  **Lập luận ngược, để người duyệt cân nhắc hạ xuống ELEVATED:** không hề thêm
  dependency mới (Risk Model rule 3 không áp), không đụng auth/RLS/schema/dữ
  liệu production, cả 4 gói đều nằm nhánh `[dev]` trong lockfile và
  `npm ls --omit=dev` không thấy gói nào trong cây production. Đây là bump
  patch trong cùng major, không nâng major nào. Planner đề xuất CRITICAL vì
  CONTEXT_RULES nói thẳng về lockfile; quyết định cuối là của người duyệt.
- Change type and required gate profile: **full** — `package.json` và
  `package-lock.json` thuộc profile full (`scripts/gates-manifest.ts:251`).
  Chốt bằng `npm run gates -- --changed-from=<base_sha>`.

## Objective and scope

- Objective: `dependency-audit` xanh trở lại, mở khoá job `browser` và `deploy`.
  CI trên `main` đỏ từ 2026-08-08; GitHub Pages chưa deploy từ 2026-07-27.
- In scope: ghim 4 gói qua `overrides` trong `package.json`; tạo lại
  `package-lock.json`; xác minh `npm audit` sạch phần 4 advisory này.
- Out of scope: nâng `react-router` (xem Risks); `npm audit fix` /
  `--force`; nâng `@typescript-eslint`, `eslint`, `vite`; đổi bất kỳ mã nguồn
  nào dưới `src/`; sửa `content/**`.

## Current analysis and design

- Current behavior: `npm run check:audit` FAIL với 4 advisory chưa duyệt.
  Đã xác nhận là có sẵn trên `main` từ trước nhánh FEATURE-017, tái hiện được
  bằng `npm audit --package-lock-only` (tức không phải do `node_modules` cũ)
  và tái hiện trên CI dưới `npm ci`.

  | Gói             | Lockfile | Khoảng dính | Bản vá |
  | --------------- | -------- | ----------- | ------ |
  | brace-expansion | 5.0.8    | <5.0.9      | 5.0.9  |
  | fast-uri        | 3.1.4    | <3.1.5      | 3.1.5  |
  | nanoid          | 3.3.16   | <3.3.17     | 3.3.17 |
  | postcss         | 8.5.19   | <=8.5.22    | 8.5.26 |

- Proposed design: mở rộng khối `overrides` sẵn có trong `package.json` —
  hiện đã là `{"brace-expansion": "^5.0.8"}`, tức repo vốn dùng cách này rồi:

  ```json
  "overrides": {
    "brace-expansion": "^5.0.9",
    "fast-uri": "^3.1.5",
    "nanoid": "^3.3.17",
    "postcss": "^8.5.26"
  }
  ```

  Rồi tạo lại lockfile. **Không** chạy `npm audit fix`: thử khô cho thấy nó kéo
  `@typescript-eslint` 8.38→8.65, thêm `zod`/`hermes-parser`/`cookie`, vẫn
  không vá `postcss` nếu thiếu `--force`, và sẽ đụng `react-router`.
  Riêng `brace-expansion`, caret `^5.0.8` vốn đã cho phép 5.0.9; nó kẹt chỉ vì
  lockfile chưa tạo lại — bump caret để ý định là tường minh.

- New technology: không có. Không thêm dependency mới; chỉ ghim phiên bản của
  các gói transitive đã có.
- Execution profile + degradation path: Implementer = Codex. Codex sandbox từng
  lỗi `EPERM` với `build`/`test:pwa`/`test:pwa:subpath` (FEATURE-016, 017) →
  orchestrator hoặc CI chạy các gate đó. **Lần này CI là bắt buộc** (xem
  Acceptance), nên degradation path là để CI làm trọng tài.

## Delivery plan

Execution assignment — mỗi vai cần con người xác nhận riêng khi đến lượt;
duyệt plan không đồng nghĩa duyệt việc nhận vai kế tiếp:

| Vai trò                | Agent đề xuất           | Model / effort         | Lý do                                                        | Đã xác nhận        |
| ---------------------- | ----------------------- | ---------------------- | ------------------------------------------------------------ | ------------------ |
| Planner                | Claude Code             | Opus 5 / high          | Khảo sát cây phụ thuộc + viết plan                           | tuann2, 2026-08-13 |
| Implementer            | Codex (subagent)        | `gpt-5.6-terra` / high | Sửa `overrides` + tạo lại lockfile                           | chưa               |
| Independent Reviewer 1 | Codex (execution khác)  | `gpt-5.6-sol` / high   | CRITICAL cần 2 reviewer tách biệt, soi từng dòng             | chưa               |
| Independent Reviewer 2 | Claude Code (phiên mới) | Opus 5 / high          | Reviewer thứ hai, **adversarial** theo yêu cầu tier CRITICAL | chưa               |
| Release Assessor       | Claude Code (phiên mới) | Opus 5 / high          | Execution mới, không phải phiên Planner này                  | chưa               |

1. Implementation — sửa `overrides`, chạy `npm install` để tạo lại lockfile,
   commit cả `package.json` lẫn `package-lock.json`.
2. Validation — `npm run gates -- --changed-from=<base_sha>` (profile full),
   `npm run evidence`, bind đúng candidate SHA. Push để CI chạy trên `npm ci`.
3. Review — 2 reviewer độc lập, một trong đó adversarial; rồi Release Assessment.

## Risks and controls

| Risk                                       | Impact                            | Mitigation                                                                                  |
| ------------------------------------------ | --------------------------------- | ------------------------------------------------------------------------------------------- |
| `npm install` kéo theo bump ngoài ý muốn   | Thay đổi vượt phạm vi, khó review | So `git diff package-lock.json` và chặn mọi thay đổi ngoài 4 gói + gói phụ thuộc trực tiếp  |
| Bump `postcss` đổi CSS phát hành           | Giao diện lệch trên production    | So `dist/assets/*.css` trước/sau; `check-bundle-budget` + E2E phải xanh                     |
| Vô tình nâng `react-router`                | Tái xuất hiện 2 lỗ hổng đã vá     | Cấm tuyệt đối trong scope; reviewer kiểm `react-router*` trong lockfile diff phải không đổi |
| Bản vá làm hỏng toolchain (eslint/vite/tw) | Gate đỏ, mất thời gian            | Cả 4 là bump patch cùng major; gate full + CI trên `npm ci` là trọng tài                    |
| `npm audit` còn advisory mới xuất hiện     | Gate vẫn đỏ sau khi vá            | Chấp nhận: phạm vi là 4 advisory này; advisory mới xử lý riêng, không mở rộng thay đổi      |

## Acceptance and recovery

- [ ] `npm run check:audit` PASS — 0 gói chưa duyệt; 2 gói `react-router*` vẫn
      ở diện đã duyệt theo allowlist ngày 2026-07-25, lý do không đổi.
- [ ] `git diff package-lock.json` không chứa thay đổi nào cho `react-router`
      hoặc `react-router-dom`.
- [ ] `npm run gates -- --changed-from=<base_sha>` PASS **đủ cả 15 gate** —
      không dừng sớm. Đây là điểm mà FEATURE-017 từng bị báo cáo nhầm.
- [ ] **CI xanh trên đúng candidate commit**, gồm job `browser`
      (`e2e`/`pwa`/`pwa-subpath`) — tier CRITICAL bắt buộc, và đây cũng là thứ
      lấp lỗ hổng review UI còn treo của FEATURE-017.
- [ ] `deploy` chạy được trở lại.
- Security considerations: đây là thay đổi _tăng_ mức an toàn. Cả 4 gói chỉ
  nằm ở dev-dependency, không ra tới trình duyệt học sinh; giá trị chính là
  gỡ tắc CI/deploy chứ không phải giảm rủi ro runtime.
- API/database impact: không có.
- Test strategy: không thêm test mới. Toàn bộ suite hiện có + E2E + PWA phải
  xanh trên bộ dependency mới; đó chính là phép thử cho một thay đổi lockfile.
- Rollback plan: revert commit để khôi phục `package.json` và
  `package-lock.json` cũ; không có trạng thái nào tồn tại ngoài repo.

## Quan hệ với FEATURE-017

FEATURE-017 (`feature/017-reference-tables`, đã push, chưa có PR) đang bị chặn
merge bởi chính 4 advisory này — `docs/plans/FEATURE-017.md:13-14` (đã duyệt)
ghi phải vá chúng **trước khi bất kỳ code nào của FEATURE-017 được merge**.
Release Assessment của FEATURE-017 là READY WITH CONDITIONS, và thay đổi này
là điều kiện số 1. Làm xong việc này sẽ mở khoá đồng thời: CI xanh → CI kiểm
được đúng candidate của FEATURE-017 → lấp lỗ hổng review UI bị bỏ → merge
đúng plan → deploy chạy lại.
