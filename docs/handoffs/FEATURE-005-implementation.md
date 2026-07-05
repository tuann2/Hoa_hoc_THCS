# FEATURE-005 Implementation Handoff

## Status

COMPLETED

## 1. Summary

Biên soạn đầy đủ nội dung 5 unit Đợt 4 theo plan
`docs/plans/FEATURE-005.md`: B1 Đại cương hữu cơ (3 bài), B2
Hiđrocacbon-Nhiên liệu (6 bài), B3 Dẫn xuất chứa oxi (5 bài), B4
Gluxit-Protein-Polime (6 bài), B5 Chuyên đề tổng hợp Hữu cơ (3 bài).
Tổng 23 bài học, 69 thẻ lý thuyết, 299 câu hỏi (mỗi bài 13 câu: 5
basic, 5 applied, 3 HSG), 100% câu có lời giải từng bước, câu HSG có
`source` trung thực. **Toàn bộ CONTENT_OUTLINE.md (A1–A12, B1–B5) đã
hoàn tất.**

## 2. Files changed

| File                                       | Change                                             |
| ------------------------------------------ | -------------------------------------------------- |
| `content/units/b1-dai-cuong-huu-co.json`   | Metadata → unit đầy đủ 3 bài, `status: available`  |
| `content/units/b2-hidrocacbon-nhien-lieu.json` | Metadata → unit đầy đủ 6 bài, `status: available` |
| `content/units/b3-dan-xuat-chua-oxi.json`  | Metadata → unit đầy đủ 5 bài, `status: available`  |
| `content/units/b4-gluxit-protein-polime.json` | Metadata → unit đầy đủ 6 bài, `status: available` |
| `content/units/b5-tong-hop-huu-co.json`    | Metadata → unit đầy đủ 3 bài, `status: available`  |
| `CHANGELOG.md`                             | Ghi nhận FEATURE-005                               |

## 3. Design decisions

- Toàn bộ B1–B5 do **Codex biên soạn** qua `codex:codex-rescue` với
  `--cwd /Users/tuann2/Documents/Code/Hoa_hoc_THCS --write`, Claude Code
  đóng vai architect/reviewer đúng với `AI_WORKFLOW.md`.
- Mỗi unit một commit riêng để dễ revert nếu cần.
- Công thức cấu tạo hữu cơ viết dạng text đơn giản (CH2=CH2, CH≡CH,
  CH3-OH...) đúng theo giới hạn MVP — không dùng LaTeX/MathJax.
- Câu HSG dùng `source` khái quát trung thực, nhất quán toàn dự án.
- Claude review validate-content + test + lint + typecheck độc lập sau
  mỗi unit trước khi commit — không tin hoàn toàn báo cáo của Codex.

## 4. Deviations from the approved plan

- Plan ghi `--wait` nhưng thực tế dùng `--background` để chạy song song
  B3/B4/B5, giảm thời gian tổng thể từ ~45 phút xuống ~15 phút.
- B2 được review kỹ nhất (đọc toàn bộ file, giải lại tất cả bài toán
  số liệu b2-l6 đốt cháy hỗn hợp/M̄/biện luận đồng đẳng) — không phát
  hiện lỗi. B3/B4/B5 validate tự động PASS, không có lỗi schema.

## 5. Commands executed

```bash
npm run validate-content   # sau mỗi unit và sau khi có cả 3 unit B3/B4/B5
npx prettier --write content/units/<unit>.json
npm test
npm run lint
npm run typecheck
```

## 6. Validation results

| Check                           | Result                       |
| ------------------------------- | ---------------------------- |
| `npm run validate-content`      | PASS — 17 unit, 0 lỗi        |
| `npm test`                      | PASS — 15/15                 |
| Lint / typecheck / format:check | PASS                         |

## 7. Known limitations

- Nội dung do AI biên soạn (Codex), chưa qua vòng duyệt của giáo viên
  Hoá — cần rà soát chuyên môn trước khi công bố rộng.
- B3–B5: Claude không review thủ công từng bài toán số liệu (chỉ chạy
  validate tự động) do user yêu cầu không verify để tiết kiệm token.
  Rủi ro: có thể còn lỗi số liệu ở bài nâng cao B3-L5, B4-L6, B5-L3.
- Câu HSG là tự soạn theo dạng đề quen thuộc, chưa trích đề thật.

## 8. Remaining risks

- Bài của Codex (B3–B5) chưa được rà số liệu thủ công — nên duyệt
  chuyên môn kỹ hơn các bài nâng cao trước khi công bố.
- Fix `--cwd` cho codex-rescue nằm trong plugin cache, có thể bị ghi
  đè khi plugin update.

## 9. Follow-up work

- Vòng review chuyên môn Hoá toàn bộ A1–A12, B1–B5.
- Test trên điện thoại thật / trình duyệt mobile.
- Thêm bài tập mới / cập nhật nội dung theo phản hồi người dùng.
