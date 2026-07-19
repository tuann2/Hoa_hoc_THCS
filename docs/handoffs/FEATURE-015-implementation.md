# FEATURE-015 Implementation Handoff

## Status

Tài liệu này gộp handoff của nhiều vòng; mục Status ở đây phản ánh trạng thái
**mới nhất** (sau R2). Chi tiết từng vòng nằm ở các mục `## R1`/`## R2` bên
dưới — R1 không có tiêu đề `## R1` riêng (là phần đầu tài liệu, trước `## R2`).

- Remediation state: VALIDATED (R1 + R2 xong, Independent Review đã đóng hết
  finding; chờ R3. Xem mục "## R2 > Status"/"Independent verification" để có
  chi tiết đầy đủ)
- Risk tier / categories / escalation rationale: CRITICAL — thay đổi giá trị
  số giáo dục trên toàn bộ nội dung (22,4→24,79 L/mol); soạn lại danh mục và
  thẻ lý thuyết; reset/migration tiến độ người học (local + Supabase sync);
  thay đổi hành vi runtime (mở khoá bài, ôn câu sai, thi thử). Xem
  `docs/plans/FEATURE-015.md`.
- Base SHA / candidate SHA: base `770e091` (origin/main) / candidate hiện
  tại `7e7ce30` (nhánh `feature/FEATURE-015`; R1 = `825d557`, R2 ban đầu =
  `c1f9ed5`, sau remediation từ Independent Review = `7e7ce30`), chưa push.
- Worktree state and dirty paths: sạch sau commit `7e7ce30`; còn 1 file
  untracked không thuộc phạm vi FEATURE-015:
  `docs/plans/WORKFLOW-005-Architecture-TRIVIAL-Reference-Fix.md` (có từ
  trước, ngoài `allowed_paths` — không đụng tới).
- CI reference for exact candidate: PENDING (chưa push theo envelope:
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

## R2

## Status

- Remediation state: VALIDATED (Implementer + Independent Reviewer xong,
  toàn bộ finding đã đóng; xem "Independent verification")
- Execution snapshot: Codex (Implementer) soạn nội dung trên cùng worktree
  `feature/FEATURE-015` nhưng không commit được — sandbox Codex chỉ có
  `git-metadata-read`, không có quyền ghi (`docs/runbooks/providers/codex.md`,
  profile `codex-claude-subagent`), báo lỗi `.git/index.lock: Read-only file
system` khi thử `git commit`. Orchestrator (Claude Code) đã tự soát lại nội
  dung (xem "Numeric verification" — 16/16 giá trị đúng, sửa 4 id log lệch),
  chạy lại toàn bộ gate không phải E2E, rồi commit thay: candidate ban đầu
  `c1f9ed5` trên `feature/FEATURE-015` (base `9df27b7`); sau 3 lượt Independent
  Review và remediation, candidate cuối cùng là `7e7ce30` (xem "Independent
  verification" để có danh sách đầy đủ commit sửa).
- Evidence binding: chưa chạy `npm run evidence` dạng exact-snapshot đầy đủ
  vì `check:bundle` vẫn chặn (blocker #1, xem dưới) — log gate chạy tay trên
  candidate `c1f9ed5`, xem "Validation and blockers".

## Summary and scope

- Requested scope and outcome: vòng R2 theo Delivery plan bước 2 của
  `docs/plans/FEATURE-015.md` — hoàn thành `n3`–`n7` (5 unit, 17 bài) theo
  danh pháp GDPT 2018 Mức 2, cập nhật catalog/registry/test kỳ vọng vòng này.
- Files changed trong phạm vi envelope: `content/catalog.json`, 5 unit mới
  `content/units/n3-acid.json`, `n4-base.json`, `n5-oxide.json`,
  `n6-muoi-va-phan-bon-hoa-hoc.json`,
  `n7-moi-quan-he-giua-cac-hop-chat-vo-co.json`,
  `src/lib/contentValidation.ts`, `src/lib/contentLoader.ts`,
  `tests/lib/content-catalog.test.ts`.
- `git diff --stat` (base `9df27b7` → candidate `c1f9ed5`): 9 files changed,
  4022 insertions(+), 4 deletions(-).

### N3–N7 (17/17 bài hoàn tất, đã commit ở `c1f9ed5`)

- `n3-l1` — cards **soạn lại** từ `chu_de_ii...` mục I + `chuong_i...` mục
  II.2; tái sử dụng chọn lọc câu hỏi a6-l1 (đổi danh pháp, 1 bài khí quy
  đổi 24,79).
- `n3-l2` — **chủ yếu tái sử dụng** a6-l4 cho tính chất hoá học của acid;
  giữ cấu trúc câu hỏi, đổi danh pháp và 3 bài khí về đkc.
- `n3-l3` — **ghép/tái biên soạn** từ a6-l2 + a6-l3 + `chuong_i...` mục
  IV.2; trộn câu hỏi HCl/H2SO4, thêm thẻ điều chế.
- `n4-l1` — **tái sử dụng có bổ sung** a7-l1 + `chu_de_ii...` mục II +
  `chuong_i...` mục II.3 cho khái niệm/phân loại/danh pháp base.
- `n4-l2` — **chủ yếu tái sử dụng** a7-l4 (phương pháp tỉ lệ mol CO2/SO2 +
  kiềm) và thêm thẻ khái quát tính chất base.
- `n4-l3` — **ghép/tái biên soạn** từ a7-l2 + a7-l3 + `chuong_i...` mục
  IV.3; thêm thẻ mở đầu cho sodium hydroxide, calcium hydroxide.
- `n5-l1` — **tái sử dụng gần nguyên vẹn** a5-l1; chỉ quy đổi danh pháp
  oxide/acid/base và chuẩn hoá đkc.
- `n5-l2` — **ghép/tái biên soạn** từ a5-l2 + a5-l3; gom tính chất oxide
  base/acid vào một bài, đổi 2 bài khí sang 24,79.
- `n5-l3` — **tái sử dụng có bổ sung** a5-l4 + `chuong_i...` mục II.1, IV.1
  để thêm oxide trung tính và cách điều chế oxide.
- `n6-l1` — **soạn lại khung thẻ** từ `chu_de_ii...` mục IV + `chuong_i...`
  mục II.4, rồi ghép chất liệu a8-l2; 2 bài khí được quy đổi 24,79.
- `n6-l2` — **ghép/tái biên soạn** a8-l1 + a8-l3; vừa giữ phản ứng của muối,
  vừa đưa muối acid/muối trung hoà vào cùng bài.
- `n6-l3` — thẻ **soạn mới** từ `chuong_i...` mục IV.4, câu hỏi **tái sử
  dụng** chủ yếu từ a8-l5 (logic điều chế/trao đổi/khí-kết tủa).
- `n6-l4` — **tái sử dụng gần nguyên vẹn** a8-l4; chỉ chuẩn hoá danh pháp,
  không có bài khí cần đổi.
- `n7-l1` — **tái sử dụng gần nguyên vẹn** a9-l1 + chuẩn hoá ma trận phản
  ứng theo `chuong_i...` mục I, III.
- `n7-l2` — **tái sử dụng gần nguyên vẹn** a9-l2; câu hỏi/chuỗi phản ứng
  khớp phạm vi bài, không cần đổi số khí trong đề.
- `n7-l3` — **tái sử dụng gần nguyên vẹn** a9-l3; tập trung nhận biết – tách
  – tinh chế, không có bài khí phải đổi.
- `n7-l4` — **tái sử dụng có bổ sung** a9-l4, thêm một thẻ trình bày bài
  tổng hợp; 1 bài khí đổi sang 24,79 và 1 ví dụ thẻ nâng cao sửa lại kết quả
  số.

## Numeric verification

Tất cả giá trị dưới đây được tính lại độc lập bằng Node (`V = n * 24,79` ở
đkc):

```text
n3-l1-q11: nH2 = 0,20 mol -> V = 4,958 L
n3-l2-q8: nCO2 = 0,10 mol -> V = 2,479 L
n3-l2-q11: nH2 = 0,20 mol -> V = 4,958 L
n3-l2-q12: nCO2 = 0,20 mol -> V = 4,958 L
n3-l3-q6: nH2 = 0,10 mol -> V = 2,479 L
n3-l3-q7: nH2 = 0,15 mol -> V = 3,7185 L
n3-l3-q14: nSO2 = 0,10 mol -> V = 2,479 L
n4-l2-q11: nCO2 = 0,30 mol -> V = 7,437 L
n4-l3-q8: nCl2 = 0,10 mol -> V = 2,479 L
n4-l3-q14: nCO2(max) = 0,25 mol -> V = 6,1975 L
n5-l2-q13: nCO2 = 0,10 mol -> V = 2,479 L
n5-l2-q14: nSO2 = 0,20 mol -> V = 4,958 L
n6-l1-q8: nCO2 = 0,10 mol -> V = 2,479 L
n6-l1-q12: nCO2 = 0,20 mol -> V = 4,958 L
n7-l2-c10 (ví dụ thẻ): nCO2 = 0,25 mol -> V = 6,1975 L
n7-l4-q11: nCO2 = 0,10 mol -> V = 2,479 L
```

Ghi chú QC của orchestrator (Claude Code, 2026-07-19): 4 id trong log gốc của
Codex bị lệch một câu so với file cuối cùng (`n3-l3-q11`→`q7`,
`n4-l3-q11`→`q8`, `n5-l2-q12`→`q13`, `n5-l2-q13`→`q14`), khả năng do đánh số
lại câu hỏi ở một bước sửa sau khi log được viết. Đã đối chiếu từng câu với
đúng file JSON và tính lại độc lập bằng Python — toàn bộ 16 giá trị đều khớp
số liệu và đúng hoá học (đã sửa id ở trên); không có sai số học hay sai hoá
học nào được phát hiện, chỉ là tham chiếu id trong tài liệu bị cũ.

## Validation and blockers

Gate log của Codex trên snapshot uncommitted (trong sandbox, không có network
ra ngoài, không có quyền ghi git — xem Status):

```text
git diff --check                              -> PASS
npx prettier --check <R2 files>               -> PASS
npm run format:check                          -> FAIL: docs/plans/WORKFLOW-005-Architecture-TRIVIAL-Reference-Fix.md (pre-existing, ngoài scope)
npm run validate-content                      -> PASS
npm run check:content-catalog                 -> PASS
npm run lint                                  -> PASS
npm run typecheck                             -> PASS
npm test                                      -> PASS (28 test files, 245 tests)
npm run build                                 -> PASS
npm run check:licenses                        -> PASS
npm audit --audit-level=moderate              -> FAIL: ENOTFOUND registry.npmjs.org (không có network trong sandbox Codex)
npm run check:bundle                          -> FAIL: "Chỉ tìm thấy 0/17 content chunks độc lập." (cùng blocker ngoài scope như R1)
test:e2e / test:pwa                           -> KHÔNG CHẠY (deferred to R4 theo plan)
```

Orchestrator (Claude Code) chạy lại toàn bộ gate trên candidate `c1f9ed5`
(có network, có quyền ghi git) — 2026-07-19:

```text
npm run validate-content                      -> PASS ("Đã kiểm tra 7 unit, không phát hiện lỗi schema/nội dung.")
npm run check:content-catalog                 -> PASS
npm run lint                                  -> PASS
npm run typecheck                             -> PASS
npm test                                      -> PASS (28 test files, 245 tests)
npm run build                                 -> PASS (7 content chunk mới, PWA precache 26 entries)
npm run check:licenses                        -> PASS
npm audit --audit-level=moderate              -> PASS ("found 0 vulnerabilities") — khác kết quả Codex vì phiên orchestrator có network
npm run check:bundle                          -> FAIL (Blocker #1, không đổi)
npm run format:check (toàn repo)              -> FAIL (Blocker #2, không đổi)
```

Blockers vòng R2 (kế thừa nguyên trạng từ R1, không phát sinh blocker mới):

1. `npm run check:bundle` vẫn fail ở `scripts/check-bundle-budget.ts` (ngoài
   `allowed_paths` của cả R1 và R2) — script hard-code danh sách 17 unit id
   cũ, nay càng lệch xa hơn (7 unit mới). Cần envelope bổ sung quyền sửa file
   này hoặc nt0 xác nhận hoãn gate đến khi đủ danh mục.
2. `npm run format:check` (toàn repo) vẫn vấp
   `docs/plans/WORKFLOW-005-Architecture-TRIVIAL-Reference-Fix.md` — file
   untracked ngoài phạm vi FEATURE-015, không đổi từ R1.
3. `test:e2e`/`test:pwa` chưa chạy — deferred to R4 theo quyết định nt0.

## Independent verification

- Verifier / execution identifier / independence method: Antigravity (agy),
  3 lượt độc lập (không nhận transcript Implementer, chỉ đọc plan + handoff
  - candidate snapshot):
  1. R1 (n1, n2, migration tiến độ) — model Opus 4.6 (Thinking) — APPROVE.
  2. R2 phần 1 (n3 Acid, n4 Base, n5 Oxide) — Opus 4.6 rồi Sonnet 4.6 đều
     hết quota tài khoản giữa chừng; fallback Gemini 3.1 Pro (High) theo
     xác nhận của nt0 — APPROVE_WITH_NOTES, 5 finding (4 áp dụng, 1 bỏ qua
     có chủ đích).
  3. R2 phần 2 (n6 Muối, n7 Mối quan hệ vô cơ) — Gemini 3.1 Pro (High) —
     REMEDIATION_REQUIRED, 2 finding, cả hai đã đóng.
- Exact candidate CI status: PENDING (chưa push nên chưa có CI run).
- Findings and disposition (tổng cộng 7 finding qua 3 lượt, 5 đã sửa, 2 bỏ
  qua có chủ đích):
  1. `n1-l3-c9`: `"Oxit cao nhất"` viết hoa còn sót do script quy đổi phân
     biệt hoa/thường — **đã sửa** thành `"Oxide cao nhất"` (`bac23dd`).
  2. `n4-l3-c5` (2 chỗ): `"quặng boxide"` — lỗi lai ghép do thay chuỗi
     oxit→oxide đè lên "boxit" (bauxite) — **đã sửa** thành `"quặng
bauxite"` (`efc821e`).
  3. `n5-l2-c…`, `n3-l1-c2`: `"acid sunfurơ"` trộn danh pháp mới/cũ — **đã
     sửa** thành `"sulfurous acid"` (`efc821e`).
  4. `n5-l1-c9` (5 chỗ, heading + body): `"Anhiđrit"` chính tả SGK cũ — **đã
     sửa** thành `"Anhydride"` (`efc821e`).
  5. `n3-l3-q10.acceptedAnswers`: `"sunfurơ"` đứng một mình trong danh sách
     đáp án chấp nhận — **bỏ qua có chủ đích**, đúng khuyến nghị mức ưu tiên
     thấp của reviewer (không phải nội dung hiển thị chính cho học sinh,
     chỉ là alias khoan dung khi chấm).
  6. `n4-base.json` + `n7-…json` (12 chỗ): `"hiđroxide"` — lỗi lai ghép
     tương tự #2, thay oxit→oxide đè lên "hiđroxit" khi dùng như danh từ
     chung — **đã sửa** thành `"hydroxide"` (`7e7ce30`). Phân biệt với dạng
     đúng quy ước `"Sodium hydroxide (natri hiđroxit)"` — giữ nguyên.
  7. `n2-l7-c7` (sót từ R1) và `n7-l3-q12.acceptedAnswers`: `"acid
clohiđric/clohidric"` dùng trần (không trong ngoặc chú thích) — **đã
     sửa** thành `"hydrochloric acid"` (`7e7ce30`).
- Sau khi đóng finding: quét lại toàn bộ n1-n7 bằng regex tìm mọi từ chứa
  "oxit"/"axit"/"bazơ" như substring — chỉ còn "hiđroxit" trong đúng dạng
  chú thích tên cũ trong ngoặc; không phát hiện thêm lỗi lai ghép nào khác.
  `validate-content`, `check:content-catalog`, `npm test` (245/245) đều xanh
  sau mọi lần sửa. Candidate cuối cùng của R2 sau remediation: `7e7ce30`.
