# FEATURE-015 Implementation Handoff

## Status

- Remediation state: BLOCKED
- Risk tier / categories / escalation rationale: CRITICAL — thay đổi giá trị
  số giáo dục trên toàn bộ nội dung (22,4→24,79 L/mol); soạn lại danh mục và
  thẻ lý thuyết; reset/migration tiến độ người học (local + Supabase sync);
  thay đổi hành vi runtime (mở khoá bài, ôn câu sai, thi thử). Xem
  `docs/plans/FEATURE-015.md`.
- Base SHA / candidate SHA: base `770e091` (origin/main) / candidate
  `825d557` (nhánh `feature/FEATURE-015`, chưa push)
- Worktree state and dirty paths: sạch sau commit `825d557`; còn 1 file
  untracked không thuộc phạm vi vòng này:
  `docs/plans/WORKFLOW-005-Architecture-TRIVIAL-Reference-Fix.md` (có từ
  trước phiên làm việc, ngoài `allowed_paths` — không đụng tới).
- CI reference for exact candidate: PENDING (chưa push theo envelope R1:
  `permissions.push=false`, chỉ push sau khi hoàn thành toàn bộ nội dung)

## Summary and scope

- Requested scope and outcome: vòng R1 theo Delivery plan bước 2 của
  `docs/plans/FEATURE-015.md` — khung danh mục mới + N1 (Nguyên tử – Nguyên
  tố – CTHH) + N2 (Phản ứng hoá học) + migration tiến độ người học. Đã hoàn
  thành đúng phạm vi.
- Files changed: `content/catalog.json`, 2 unit mới
  (`content/units/n1-*.json`, `n2-*.json`), 17 unit cũ chuyển sang
  `docs/content-reserve/feature-015/legacy-units/` (nguồn cho R2-R4),
  `src/lib/contentValidation.ts`, `contentLoader.ts`, `progressSync.ts`,
  `src/store/progress.ts`, `scripts/tag-question-category.ts`, 4 file test.
- `git diff --stat` (base→candidate): 30 files changed, 2714 insertions(+),
  937 deletions(-) — chi tiết ở commit `825d557`.

### Nội dung N1, N2 (52 → còn 11 bài sau R1, 40 bài còn lại ở R2-R4)

- N1 (4 bài): tái sử dụng nguyên vẹn a1-l1..l4 (nội dung không đụng danh
  pháp acid/base/oxide hay 22,4/đktc ngoài từ "oxit"/"axit" chung chung),
  chỉ đổi id (`a1-lN`→`n1-lN`) và 2 từ khoá oxit→oxide, axit→acid.
- N2 (7 bài):
  - n2-l1 Phản ứng hoá học; các loại phản ứng — **soạn mới** từ Chủ đề I
    mục I + định nghĩa 4 loại phản ứng (nguồn a2/a3/a8).
  - n2-l2 Mol – tỉ khối chất khí — từ a1-l6, quy đổi 22,4→24,79 L/mol,
    đktc→đkc (25°C, 1 bar); 2 câu hỏi và 3 ví dụ trong thẻ nâng cao được
    thiết kế lại số liệu, giải lại độc lập bằng Python (xem log dưới).
  - n2-l3 Dung dịch; độ tan — từ a4-l1 + thêm thẻ "cách hoà tan nhanh hơn"
    (Chủ đề I mục III.3); không đụng số liệu.
  - n2-l4 Nồng độ (C%, CM); pha chế – pha loãng — chọn lọc 10/17 thẻ và
    17/26 câu hỏi từ a4-l2+a4-l3 để nằm trong giới hạn schema (≤25 thẻ,
    5-8/5-8/3-5 câu/mức); không đụng số liệu; 2 chỗ "axit"→"acid".
  - n2-l5 ĐLBTKL; PTHH — từ a1-l5 nguyên vẹn, chỉ đổi oxit/axit; không có
    bài toán khí nên không cần quy đổi 24,79.
  - n2-l6 Tính theo PTHH; chất dư – hiệu suất — từ a1-l7, quy đổi 2 câu hỏi
    và 1 ví dụ trong thẻ nâng cao dùng 22,4→24,79.
  - n2-l7 Tốc độ phản ứng và chất xúc tác — **soạn mới** từ Chủ đề I mục VI,
    định tính, không có số liệu cần quy đổi.

## Acceptance, decisions, and risks

| Plan acceptance criterion                                                              | Evidence / status                                                                                            |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Danh mục đúng Phụ lục A, mỗi bài ≤25 thẻ, qua validate-content + check:content-catalog | PASS cho n1, n2 (2/2 unit của vòng này) — xem log gate dưới. 9 unit còn lại thuộc R2-R4.                     |
| Không còn "đktc"/"22,4" và danh pháp cũ ngoài chú thích đối chiếu (phạm vi N1, N2)     | PASS — grep xác nhận 0 "đktc", 0 "22,4" trong n1/n2; oxit/axit đã đổi hết trong nội dung tái sử dụng         |
| Mọi bài toán khí dùng 24,79 L/mol (đkc)                                                | PASS trong phạm vi N2 (n2-l2, n2-l6) — giá trị giải lại độc lập, xem log Python bên dưới                     |
| Snapshot cũ được backup; XP/streak/lịch sử thi giữ nguyên sau migration                | PASS — test unit + tích hợp (`tests/store/progress.test.ts`, `tests/lib/progress-sync.test.ts`)              |
| Toàn bộ gate profile xanh trên đúng candidate                                          | MỘT PHẦN — xem "Blockers"                                                                                    |
| Vòng review chuyên môn của giáo viên                                                   | CHƯA — dự kiến sau khi đủ 11 unit (cuối R4) theo Delivery plan; có thể yêu cầu review sớm N1/N2 nếu nt0 muốn |

- Design decisions:
  1. `content/catalog.json` chỉ liệt kê unit đã soạn xong trong vòng hiện
     tại (2/11); 17 unit cũ chuyển nguyên trạng sang
     `docs/content-reserve/feature-015/legacy-units/` làm nguồn cho R2-R4,
     không xoá hẳn.
  2. Tiến độ người học: **reset lessonProgress/unlockedLessonIds/
     wrongQuestions** (không có ánh xạ 1-1 do lessonId đổi/gộp), **giữ
     totalXp/streak/lastStudyDate/examHistory**. `PROGRESS_VERSION` 4→5;
     snapshot cũ được backup vào `localStorage['hhthcs-progress-backup-v4']`
     (ghi một lần, không đè nếu đã có) trước khi reset.
  3. Phát hiện khi cài migration: `mergeProgress` trong `progressSync.ts`
     vốn tính lại `totalXp` hoàn toàn từ tổng `lessonProgress[*].bestXp`
     (không tin trực tiếp field `totalXp`) — nếu giữ nguyên logic này, XP
     tích luỹ trước migration sẽ về 0 ngay lần sync đầu tiên sau khi
     lessonProgress bị reset rỗng. Đã sửa thành
     `Math.max(recompute, local.totalXp, server.totalXp)` để không phá vỡ
     bất biến hiện có (ở trạng thái ổn định, recompute vốn đã bằng các giá
     trị này nên hành vi cũ không đổi).
  4. Thêm `merge` tuỳ biến vào cấu hình `persist` của progress store: nếu
     sau migrate `unlockedLessonIds` rỗng và `lessonProgress` rỗng, dùng lại
     giá trị mặc định mới vừa khởi tạo (`createInitialProgressState(units)`)
     thay vì để người dùng không mở khoá được bài nào.
- Deviations:
  - **E2E/PWA (`test:e2e`, `test:pwa`) không chạy ở vòng này** — quyết định
    của nt0 trong phiên: chia vòng chỉ để kiểm soát chất lượng nội dung,
    không phải gate hoá từng phần; E2E dồn về cuối R4. Đã cập nhật vào
    `docs/plans/FEATURE-015.md`.
- Blockers:
  1. `npm run check:bundle` FAIL: `scripts/check-bundle-budget.ts` hard-code
     danh sách 17 unit id cũ để xác nhận code-splitting; với danh mục 2 unit
     hiện tại, gate báo "Chỉ tìm thấy 0/17 content chunks". File này **không
     nằm trong `allowed_paths` của envelope R1** (chỉ được cấp
     `scripts/tag-question-category.ts`). Cần một trong hai: (a) envelope
     bổ sung quyền sửa `scripts/check-bundle-budget.ts` để cập nhật danh
     sách unit id theo từng vòng (giống cách đã làm với
     `EXPECTED_UNIT_IDS`), hoặc (b) nt0 xác nhận gate này tạm hoãn đến khi
     đủ danh mục (giống E2E) và tự cập nhật script.
  2. `npm run format:check` FAIL ở phạm vi toàn repo: vấp
     `docs/plans/WORKFLOW-005-Architecture-TRIVIAL-Reference-Fix.md` — file
     untracked có từ trước phiên làm việc này, không thuộc FEATURE-015 và
     ngoài `allowed_paths`. `prettier --check` chạy trên các file đã đổi
     của vòng này (đã chạy riêng, xem log) đều sạch.
- Remaining risks / follow-up:
  - R2 (N3-N7 vô cơ), R3 (N8-N9), R4 (N10-N11 + E2E) còn lại theo Delivery
    plan; mỗi vòng cần envelope Implementer riêng.
  - `EXPECTED_UNIT_IDS` (`src/lib/contentValidation.ts`) và `loaders`
    (`src/lib/contentLoader.ts`) phải mở rộng dần theo từng vòng — đã ghi
    chú trực tiếp trong code.
  - Review chuyên môn hoá học của giáo viên cho N1/N2 nên làm sớm (không
    đợi hết R4) để phát hiện sai sót danh pháp/số liệu càng sớm càng tốt,
    vì đây là nội dung mới soạn phần lớn.

## Validation evidence

`npm run evidence` (exact-snapshot, toàn bộ profile) **chưa chạy** vì gate
`check:bundle` chặn (Blocker #1) và bộ chạy gate không hỗ trợ loại trừ một
gate đơn lẻ khỏi profile — chạy evidence lúc này sẽ cho kết quả FAIL do lý
do ngoài phạm vi envelope, không phản ánh đúng chất lượng nội dung đã làm.
Dưới đây là log chạy tay từng gate trên candidate `825d557` (2026-07-19,
UTC), Node/npm theo `package.json`/lockfile hiện có:

```
git diff --check                              -> exit 0
npm run format:check (chỉ file đã đổi)         -> "Checking formatting..." không có [warn], exit 0
npm run validate-content                       -> "Đã kiểm tra 2 unit, không phát hiện lỗi schema/nội dung."
npm run check:content-catalog                  -> "Content catalog khớp với content/units/*.json."
npm run lint                                   -> exit 0, không có output lỗi
npm run typecheck                               -> exit 0
npm test                                        -> Test Files 28 passed (28); Tests 245 passed (245)
npm run build                                   -> vite build thành công, PWA precache 21 entries
npm run check:licenses                          -> "License allowlist check passed for 673 packages."
npm audit --audit-level=moderate                -> "found 0 vulnerabilities"
npm run check:bundle                            -> FAIL: "Chỉ tìm thấy 0/17 content chunks độc lập." (Blocker #1)
npm run format:check (toàn repo)                -> FAIL: WORKFLOW-005-...md (Blocker #2, ngoài phạm vi)
test:e2e / test:pwa                             -> KHÔNG CHẠY (deferred to R4, quyết định nt0)
```

Kiểm tra độc lập giá trị 24,79 L/mol (Python, không dùng lại logic ứng
dụng):

```
q6/q8 (n2-l2): n=0,5 mol -> V = 0,5 * 24,79 = 12,395 lít
q13 (n2-l2): nCH4 = 3,2/16 = 0,2 mol -> V(CO2) = 0,2 * 24,79 = 4,958 lít
q7 (n2-l6): nFe = 5,6/56 = 0,1 mol -> V(H2) = 0,1 * 24,79 = 2,479 lít
q13 (n2-l6): nAl = 5,4/27 = 0,2 mol; nH2 = 0,2*1,5 = 0,3 mol
            -> V(H2) = 0,3 * 24,79 = 7,437 lít
thẻ n2-l2-c5 (ví dụ đổi đơn vị): 2479 ml = 2,479 lít -> n = 2,479/24,79 = 0,1 mol
thẻ n2-l6-c6 (ví dụ chất dư): nH2 = 0,15 mol -> V(H2) = 0,15 * 24,79 = 3,7185 lít
```

## Independent verification

- Verifier / execution identifier / independence method: PENDING (chưa gọi
  review độc lập — plan yêu cầu review CRITICAL sau khi gate profile đầy
  đủ xanh hoặc tại điểm dừng do nt0 quyết định; nt0 đã yêu cầu dừng ở cuối
  R1 để chỉnh workflow trước khi tiếp tục).
- Exact candidate CI status: PENDING (chưa push, chưa có CI run).
- Findings and disposition: PENDING.
- Batch-content exception authorization: n/a.
