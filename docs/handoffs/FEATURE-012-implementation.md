# FEATURE-012 Implementation Handoff

## Status

- Remediation state: RELEASE_READY
- Risk tier: NORMAL
- Risk categories: non-numeric learning content (lý thuyết định tính);
  sửa nội dung `content/units/*.json` đã duyệt trước đây
- Escalation rationale: n/a — nội dung nâng cao là văn bản lý thuyết
  định tính, khớp ví dụ "non-numeric learning content" (NORMAL) trong
  `CLAUDE.md`; không chạm public API, migration, auth hay logic tính
  toán phức tạp của ứng dụng.

## 1. Summary

Bổ sung kiến thức nâng cao (mức HSG cấp huyện/tỉnh) vào thẻ lý thuyết
của toàn bộ 81 bài học `available` trên 17 unit (Vô cơ A1→A12, Hữu cơ
B1→B5). Thực hiện qua 2 giai đoạn:

- **Phase A** (thực thi, nhiều phiên trước): Codex (`gpt-5.5` /
  `gpt-5.6-terra`, một số bài Claude tự viết khi Codex hết quota) viết
  thẳng nội dung nâng cao vào `content/units/*.json`.
- **Phase B** (review, phiên này — workflow đổi 2026-07-12 theo yêu
  cầu người dùng): Gemini `agy` fact-check tuần tự 62 bài còn lại
  (`a4-l4` → `b5-l3`), dồn kết quả vào file tổng hợp duy nhất
  `docs/reviews/FEATURE-012-phase-b-review.md`; sau đó Codex
  `gpt-5.6-sol` (effort `high`) đọc kết quả và tự cập nhật nội dung
  theo từng Unit; Claude xác nhận phạm vi và commit 1 unit/1 commit
  (thay vì 1 bài/1 commit như trước).

Kết quả: sửa được 1 lỗi hoá học thật (`b5-l3-c2` — vinyl clorua),
1 lỗi tính toán thật (`a8-l4-c4` — %N của NH4Cl), 1 mâu thuẫn nội bộ
(`a10-l1-c11` vs `a10-l4-c2`), cùng ~20 điểm thuật ngữ/ký hiệu/chính tả
khác. Rà soát cuối cùng phát hiện thêm và sửa lỗi chính tả "do"→"độ"
(đơn vị độ rượu) lan rộng ở unit B3/B4 (một phần trong diff Phase A,
một phần là câu hỏi cũ ngoài phạm vi feature nhưng cùng lỗi rõ ràng,
được người dùng xác nhận sửa luôn).

## 2. Files changed

Toàn bộ diff tích luỹ từ `main` (bao gồm cả các phiên trước —
checklist 81 bài, workflow v2.1 migration):

| File                                                                                                                                                                          | Change                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `content/units/a1-nen-tang-hoa-hoc.json` … `content/units/b5-tong-hop-huu-co.json` (14 unit chạm trong phiên này: A4–A12, B1–B5; 3 unit A1–A3 đã xong ở phiên trước)          | Mở rộng `cards[].body` / thêm thẻ "Nâng cao: ..." theo từng lesson; không đổi `questions`, `id`/`heading` thẻ cơ bản |
| `docs/reviews/FEATURE-012-phase-b-review.md`                                                                                                                                  | Mới — file tổng hợp Bước 1 Phase B (62 bài review)                                                                   |
| `docs/plans/FEATURE-012.md`                                                                                                                                                   | Checklist 81/81 bài đã đánh dấu; workflow revision 2026-07-12                                                        |
| `docs/content-reserve/a1-l*.md`, `docs/content-reserve/a2-l*.md`                                                                                                              | Nội dung dự trữ từ phiên A1/A2 trước (không đổi trong phiên này)                                                     |
| `docs/architecture/AI_WORKFLOW_ARCHITECTURE.md`, `docs/handoffs/_TEMPLATE.md`, `docs/plans/_TEMPLATE.md`, `docs/runbooks/AGENT_TOOLS_SETUP.md`, `docs/DOCUMENTATION_RULES.md` | Migrate workflow v2.1 (phiên trước, ngoài phạm vi nội dung feature này)                                              |
| `src/lib/contentValidation.ts`                                                                                                                                                | Nâng trần `cards.length` 5→25 (phiên trước, đã duyệt)                                                                |

```text
$ git diff --stat main...HEAD
 (81 bài, 17 unit content/units/*.json + docs liên quan)
 41 files changed, 6580 insertions(+), 357 deletions(-)
```

Diff riêng nội dung sửa trong **phiên này** (14 unit A4→B5, Bước 2
Phase B + rà soát cuối cùng): xem `git log --oneline` từ commit
`894aeb9` (Unit A4) đến `8174cb4` (fix "do"→"độ" B3) trên nhánh
`feature/FEATURE-012`.

## 3. Evidence binding

- Base commit SHA (`main`): `5a323213853a5df8bd06b4aec2e1b0f92cc4fe83`
- Candidate commit SHA: `8174cb4472500a106f324e7e278e8e38d8bddcd9`
- Validated implementation-tree SHA: `8174cb4472500a106f324e7e278e8e38d8bddcd9`
  (working tree sạch — không có thay đổi chưa commit tại thời điểm
  validate)
- Implementation-tree exclusions: file handoff này (tạo sau khi
  validate)
- Dirty-worktree state and exact dirty paths: sạch (`git status
--short` rỗng)
- Validation start (UTC): 2026-07-12T13:45:00Z
- Validation completion (UTC): 2026-07-12T13:58:40Z
- Runtime / package-manager versions: Node v22.22.1, npm 10.9.4
- Validation-tool versions: `vite@5.4.19`, `tsc` theo `devDependencies`
  trong `package.json` (không pin version riêng ngoài lockfile)

## 4. Validation commands and gates

| Command                    | Exit status | Quality gate satisfied                                                |
| -------------------------- | ----------- | --------------------------------------------------------------------- |
| `npm run validate-content` | 0           | Content/schema (17 unit, 0 lỗi)                                       |
| `npm test`                 | 0           | Unit/component tests (16 test files, 87 tests pass)                   |
| `npm run lint`             | 0           | Lint (eslint)                                                         |
| `npm run typecheck`        | 0           | Type safety (`tsc --noEmit`)                                          |
| `npm run build`            | 0           | Production build (`vite build`, bao gồm validate-content + typecheck) |
| `npm run format:check`     | 0           | Prettier style (sau khi `--write` 2 file docs)                        |

Ngoài canonical gates, đã chạy thêm (rigor tự nguyện của feature này,
không bắt buộc với tier `NORMAL`):

- Gemini `agy` fact-check độc lập cho toàn bộ 62 bài Phase B (Bước 1,
  xem `docs/reviews/FEATURE-012-phase-b-review.md`).
- Gemini `agy` spot-check tổng thể cuối cùng trên mẫu 9 bài rải đều
  Vô cơ/Hữu cơ (gồm cả bài từ phiên trước và bài vừa sửa hôm nay) —
  kết quả PASS cả 9/9, không phát hiện lỗi hoá học/LaTeX sót/nội dung
  generic.
- Kiểm tra UI thật qua Playwright (dev server + headless Chromium):
  mở `a10-l1` (unit vừa sửa nhiều thẻ dài hôm nay, thẻ 8/11 và 11/11),
  xác nhận layout không tràn/vỡ với text thẻ dài hơn thẻ cơ bản, không
  có console error.

## 5. Design decisions

- Đổi workflow Phase B giữa chừng (2026-07-12, theo yêu cầu trực tiếp
  của người dùng): thay vì review→sửa→commit theo từng bài (quy trình
  cũ áp dụng cho 15 bài A2→a4-l3), chuyển sang review dồn 1 file →
  Codex `sol` tự cập nhật + commit theo Unit. Ghi chi tiết ở
  `docs/plans/FEATURE-012.md` mục Status (Workflow revision
  2026-07-12) và mục 6 "Phase B".
- Đổi vai trò Codex `gpt-5.6-sol` từ "chỉ báo cáo, không tự sửa"
  (nguyên tắc reviewer-only mặc định của kiến trúc) sang "tự cập nhật
  nội dung" — chấp nhận đổi khác nguyên tắc mặc định theo yêu cầu rõ
  ràng của người dùng, ghi rõ trong plan.
- Trong khi xử lý Bước 2, Claude tự phát hiện và bổ sung 2 finding
  ngoài báo cáo Gemini gốc (không phải do Gemini báo mà do Claude tự
  đối chiếu số liệu/quy ước dự án): (1) `a4-l5-c7` dùng sai hằng số
  24,79 thay vì 22,4; (2) nhiều finding "sót tiếng Anh"/"lỗi chính tả"
  do Gemini báo cáo hoá ra là false positive khi đối chiếu lại file
  thật — đã ghi rõ trong file review, không áp dụng sửa mù quáng theo
  báo cáo AI.
- Lỗi "do"→"độ" (đơn vị độ rượu) phát hiện lan rộng ở B3/B4: phần
  thuộc diff Phase A (thẻ mới) được sửa trong phạm vi Unit tương ứng;
  phần thuộc câu hỏi CŨ (ngoài diff Phase A, ngoài phạm vi feature)
  được người dùng xác nhận trực tiếp cho phép sửa luôn — coi là
  trivial content fix theo `CLAUDE.md` §What Claude may edit directly.

## 6. Deviations from the approved plan

- Phase B workflow đổi giữa chừng theo yêu cầu người dùng (xem mục 5)
  — đã cập nhật lại `docs/plans/FEATURE-012.md` mục 6 trước khi thực
  thi, không phải deviation ngầm.
- 2 câu hỏi cũ `b4-l6-q11`, `b4-l6-q12` (lỗi "do"→"độ") nằm ngoài
  phạm vi "không đổi câu hỏi" đã duyệt ở mục 5 "Out of scope" của
  plan — sửa theo xác nhận trực tiếp của người dùng trong phiên, ghi
  lại tại đây làm bằng chứng ngoại lệ có chủ đích.

## 7. Independent verification

- Verifier identity: Gemini (`agy`, model "Gemini 3.5 Flash (High)") —
  fresh, độc lập với Codex (đơn vị đã tạo/sửa nội dung)
- Execution identifier: spot-check cuối cùng trên 9 bài
  (`a1-l5`, `a3-l4`, `a5-l1`, `a8-l4`, `a10-l1`, `a12-l3`, `b2-l4`,
  `b3-l1`, `b5-l3`) — xem transcript trong phiên, kết quả tóm tắt ở
  mục 4
- Independence method: fresh Gemini spot-check (trước khi push) +
  GitHub Actions CI trên candidate commit sau khi push, theo đúng
  `.claude/skills/feature-delivery/SKILL.md` §NORMAL
- CI commit SHA and status: `49f3b18b9cd7554bc82e2217693c8eab9c4f3d1b`
  — **success** (run `29195536489`, nhánh `feature/FEATURE-012`, xác
  nhận qua `gh run view`)
- Review findings and disposition: Gemini spot-check 9/9 bài PASS,
  không có finding mới cần xử lý; CI (build + test + lint + typecheck
  - validate-content + format:check) pass cho đúng candidate commit

## 8. Blockers

- None

## 9. Known limitations

- `scripts/validate-content.ts` chỉ kiểm tra shape JSON (số thẻ, số
  câu, trường bắt buộc...), không kiểm tra tính đúng đắn hoá học —
  việc đó do Gemini fact-check + Claude đối chiếu thủ công đảm nhiệm,
  không phải gate tự động.
- Đã push và CI pass cho candidate commit cuối
  (`49f3b18b9cd7554bc82e2217693c8eab9c4f3d1b`, xem mục 7).

## 10. Remaining risks

- Thấp. Nội dung là văn bản lý thuyết tĩnh, không đổi API/schema/logic
  ứng dụng ngoài `contentValidation.ts` (đã đổi ở phiên trước, đã
  duyệt). Rủi ro chính là sai sót hoá học nhỏ còn sót trong ~700+ thẻ
  — đã giảm thiểu qua 2 lớp fact-check (Gemini theo từng unit + spot-
  check cuối) nhưng không loại trừ hoàn toàn 100%.

## 11. Follow-up work

- Đã push nhánh `feature/FEATURE-012` và CI pass (mục 7). Theo yêu cầu
  người dùng, mở PR vào `main` để deploy nội dung mới — người dùng vẫn
  là người duyệt merge cuối cùng (Claude không tự merge).
