# FEATURE-002 Implementation Handoff

## Status

COMPLETED

## 1. Summary

Biên soạn đầy đủ nội dung 3 unit cụm hợp chất vô cơ theo plan
`docs/plans/FEATURE-002.md`: A5 Oxit (4 bài), A7 Bazơ (5 bài), A9 Mối
quan hệ giữa các hợp chất vô cơ (4 bài). Tổng 13 bài học, 39 thẻ lý
thuyết, 169 câu hỏi (mỗi bài 13 câu: 5 basic, 5 applied, 3 HSG), 100%
câu có lời giải từng bước, câu HSG có `source` trung thực. Không thay
đổi code app.

## 2. Files changed

| File                                               | Change                                                                |
| -------------------------------------------------- | --------------------------------------------------------------------- |
| `content/units/a5-oxit.json`                       | Metadata → unit đầy đủ 4 bài, `status: available`                     |
| `content/units/a7-bazo.json`                       | Metadata → unit đầy đủ 5 bài, `status: available`                     |
| `content/units/a9-moi-quan-he-hop-chat-vo-co.json` | Metadata → unit đầy đủ 4 bài, `status: available`                     |
| `CHANGELOG.md`                                     | Ghi nhận FEATURE-002 và các thay đổi deploy/nguồn HSG của FEATURE-001 |

## 3. Design decisions

- Noi đúng chuẩn A6: mỗi bài 3 thẻ + 13 câu, phân bổ dạng câu
  (single-choice, multi-choice, fill-blank, balance) giống A6.
- Câu HSG dùng `source` khái quát trung thực ("Tự biên soạn theo dạng
  bài quen thuộc trong đề thi HSG Hoá 9 cấp huyện/tỉnh") theo phương
  án đã được chấp thuận ở FEATURE-001, không bịa tên đề/tỉnh/năm.
- Mỗi bài toán số liệu được giải lại độc lập trước khi chốt đáp án
  (rút kinh nghiệm từ lỗi a6-l1-q11 của lần biên soạn trước).
- Nội dung nâng cao đúng trọng tâm HSG: %O trong oxit tìm nguyên tố,
  biện luận CO2/SO2 + kiềm (T = nOH-/nCO2, hai đáp số của V), kết tủa
  Al(OH)3 với kiềm dư, bảo toàn nguyên tố O cho oxit + axit, tăng
  giảm khối lượng.

## 4. Deviations from the approved plan

- **Codex không thực hiện được việc biên soạn** dù plan giao cho Codex:
  sandbox của Codex companion chỉ ghi được trong thư mục session
  (namecard), không ghi được vào repo này. Đây cũng là nguyên nhân task
  Codex sửa câu HSG A6/A8 trước đó treo im lặng ~30 phút. Claude Code
  đã tự biên soạn toàn bộ nội dung (đã được người dùng uỷ quyền chạy
  qua đêm). Cần cấu hình lại Codex working directory cho các lần sau.
- Các commit được thực hiện bởi Claude Code thay vì con người (uỷ
  quyền rõ ràng của người dùng trong phiên đêm 2026-07-05).

## 5. Commands executed

```bash
npm run validate-content   # sau mỗi unit
npx prettier --write content/units/<unit>.json
npm test
npm run lint
npm run format:check
npm run build              # trước deploy
```

## 6. Validation results

| Check                      | Result                                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| `npm run validate-content` | PASS — 17 unit, 0 lỗi schema/PTHH (chạy sau từng unit)                                    |
| `npm test`                 | PASS — 15/15 (chạy sau từng unit)                                                         |
| Lint / format:check        | PASS                                                                                      |
| Build (`vite build`)       | PASS                                                                                      |
| Rà số liệu thủ công        | Toàn bộ bài toán trong 39 câu HSG và 60+ câu applied được giải lại độc lập trước khi viết |

## 7. Known limitations

- Nội dung do AI biên soạn, chưa qua vòng duyệt của giáo viên Hoá —
  nên rà soát chuyên môn trước khi công bố rộng (đặc biệt câu HSG).
- Câu HSG là tự soạn theo dạng đề quen thuộc, chưa trích đề thật có
  nguồn cụ thể (giống hiện trạng A6/A8 đã được chấp thuận).
- Chưa test UI thủ công từng bài của 3 unit mới trên trình duyệt
  (validate schema + PTHH tự động và regression test đã pass; các unit
  dùng chung engine với A6/A8 đã test).

## 8. Remaining risks

- Sai sót hoá học tinh vi mà validator không bắt được (đáp án đúng
  nhưng cách diễn đạt gây hiểu lầm) — giảm thiểu bằng lời giải từng
  bước nhưng vẫn cần người duyệt.

## 9. Follow-up work

- FEATURE-003: nửa sau Đợt 2 — A1 Nền tảng hoá học (9 bài) và A4 Dung
  dịch (5 bài).
- Người dùng chạy `gh auth refresh -h github.com -s workflow` rồi
  commit + push `.github/workflows/` (ci.yml, deploy.yml) để có CI và
  deploy tự động; hiện deploy thủ công qua branch `gh-pages`.
- Vòng review chuyên môn Hoá cho A5/A7/A9 (và A6/A8).
- Đi thử trọn vẹn 1 bài mỗi unit mới trên điện thoại thật.
