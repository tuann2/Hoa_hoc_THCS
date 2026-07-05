# FEATURE-004 Implementation Handoff

## Status

COMPLETED

## 1. Summary

Biên soạn đầy đủ nội dung 5 unit Đợt 3 theo plan
`docs/plans/FEATURE-004.md`: A2 Oxi-Không khí (3 bài), A3 Hiđro-Nước
(4 bài), A10 Kim loại (5 bài), A11 Phi kim (5 bài), A12 Chuyên đề tổng
hợp Vô cơ (4 bài). Tổng 21 bài học, 63 thẻ lý thuyết, 273 câu hỏi
(mỗi bài 13 câu: 5 basic, 5 applied, 3 HSG), 100% câu có lời giải từng
bước, câu HSG có `source` trung thực. Không thay đổi code app.
**Toàn bộ phần Vô cơ (A1–A12) đã hoàn tất.**

## 2. Files changed

| File                                    | Change                                            |
| --------------------------------------- | ------------------------------------------------- |
| `content/units/a2-oxi-khong-khi.json`   | Metadata → unit đầy đủ 3 bài, `status: available` |
| `content/units/a3-hidro-nuoc.json`      | Metadata → unit đầy đủ 4 bài, `status: available` |
| `content/units/a10-kim-loai.json`       | Metadata → unit đầy đủ 5 bài, `status: available` |
| `content/units/a11-phi-kim.json`        | Metadata → unit đầy đủ 5 bài, `status: available` |
| `content/units/a12-tong-hop-vo-co.json` | Metadata → unit đầy đủ 4 bài, `status: available` |
| `CHANGELOG.md`                          | Ghi nhận FEATURE-004                              |

## 3. Design decisions

- Noi đúng chuẩn các unit trước: mỗi bài 3 thẻ + 13 câu, 4 dạng câu.
- A2/A3/A10/A11 do Claude Code tự biên soạn (khi đó Codex chưa dùng
  được cho repo này). **A12 do Codex biên soạn** — lần đầu delegate
  content-authoring thành công sau khi sửa lỗi `--cwd` của subagent
  `codex:codex-rescue` (xem mục 4).
- Câu HSG dùng `source` khái quát trung thực, nhất quán toàn dự án.
- Mọi bài toán số liệu được giải lại độc lập trước khi chốt/commit.

## 4. Deviations from the approved plan

- Plan ghi nhận Codex không dùng được (giới hạn sandbox từ
  FEATURE-002/003). Trong quá trình thực hiện, theo yêu cầu người dùng
  "kiểm tra toàn bộ luồng để giao task cho Codex được", đã điều tra và
  sửa được nguyên nhân gốc: file hướng dẫn subagent
  `~/.claude/plugins/cache/openai-codex/codex/1.0.5/agents/codex-rescue.md`
  không nhận diện/forward cờ `--cwd` dù `codex-companion.mjs` hỗ trợ
  sẵn. Sau khi sửa + verify, **A12 được giao cho Codex biên soạn**
  đúng vai trò implementer trong AI_WORKFLOW.md; A2/A3/A10/A11 đã do
  Claude Code viết trước khi có fix.
- Claude Code review độc lập bài của Codex: phát hiện và sửa **1 lỗi
  số liệu** ở a12-l3-q8 (hỗn hợp Mg/Zn ghi 12,4 g nhưng nghiệm hệ
  phương trình chỉ khớp với 10,1 g) — đã sửa dữ kiện thành 10,1 g.
  Các câu còn lại của A12 (20+ bài toán) đã được giải lại và xác nhận
  đúng.
- Commit được thực hiện bởi Claude Code (uỷ quyền của người dùng,
  phiên 2026-07-05).

## 5. Commands executed

```bash
npm run validate-content   # sau mỗi unit
npx prettier --write content/units/<unit>.json
npm test
npm run lint
npm run typecheck
npm run build
```

## 6. Validation results

| Check                           | Result                                                                                                          |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `npm run validate-content`      | PASS — 17 unit, 0 lỗi schema/PTHH (chạy sau từng unit)                                                          |
| `npm test`                      | PASS — 15/15                                                                                                    |
| Lint / typecheck / format:check | PASS                                                                                                            |
| Rà số liệu thủ công             | Toàn bộ câu HSG + applied có số liệu được giải lại độc lập; riêng A12 (bài của Codex) rà 100% và bắt được 1 lỗi |

## 7. Known limitations

- Nội dung do AI biên soạn (Claude + Codex), chưa qua vòng duyệt của
  giáo viên Hoá — cần rà soát chuyên môn trước khi công bố rộng.
- Câu HSG là tự soạn theo dạng đề quen thuộc, chưa trích đề thật.
- Chưa test UI thủ công từng bài mới trên trình duyệt/điện thoại thật.

## 8. Remaining risks

- Bài của Codex (A12) tuy đã được rà 100% số liệu nhưng vẫn nên có
  người duyệt chuyên môn như mọi unit khác.
- Fix `--cwd` cho codex-rescue nằm trong plugin cache, có thể bị ghi
  đè khi plugin update — nếu delegate Codex thất bại trở lại với lỗi
  writable root, áp dụng lại fix (đã ghi trong bộ nhớ dự án).

## 9. Follow-up work

- FEATURE-005 (Đợt 4 — Hữu cơ B1-B5, plan đã APPROVED tại
  `docs/plans/FEATURE-005.md`): giao Codex biên soạn từng unit
  (B1 → B5), Claude review + validate độc lập từng lượt.
- Vòng review chuyên môn Hoá toàn bộ A1-A12.
- Test trên điện thoại thật.
