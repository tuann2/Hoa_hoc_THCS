# FEATURE-003 Implementation Handoff

## Status

COMPLETED

## 1. Summary

Biên soạn đầy đủ nội dung 2 unit còn lại của Đợt 2 theo plan
`docs/plans/FEATURE-003.md`: A1 Nền tảng hoá học (9 bài) và A4 Dung
dịch (5 bài). Tổng 14 bài học, 42 thẻ lý thuyết, 182 câu hỏi (mỗi bài
13 câu: 5 basic, 5 applied, 3 HSG), 100% câu có lời giải từng bước,
câu HSG có `source` trung thực. Không thay đổi code app. Sau feature
này, toàn bộ Đợt 2 (A1, A4, A5, A7, A9) đã hoàn tất.

## 2. Files changed

| File                                     | Change                                            |
| ---------------------------------------- | ------------------------------------------------- |
| `content/units/a1-nen-tang-hoa-hoc.json` | Metadata → unit đầy đủ 9 bài, `status: available` |
| `content/units/a4-dung-dich.json`        | Metadata → unit đầy đủ 5 bài, `status: available` |
| `CHANGELOG.md`                           | Ghi nhận FEATURE-003                              |

## 3. Design decisions

- Noi đúng chuẩn A5/A7/A9: mỗi bài 3 thẻ + 13 câu, phân bổ 4 dạng câu
  hiện có (single-choice, multi-choice, fill-blank, balance).
- Với các bài thuần khái niệm (không có PTHH tự nhiên, ví dụ A1-L1 về
  cấu tạo nguyên tử, A1-L2/L3 về nguyên tố/CTHH), không ép dùng dạng
  `balance` — chỉ dùng dạng `balance` ở những bài có phản ứng hoá học
  thực sự (A1-L5 trở đi).
- Câu HSG dùng `source` khái quát trung thực (nhất quán từ
  FEATURE-001/002): "Tự biên soạn theo dạng bài quen thuộc trong đề
  thi HSG Hoá 9 cấp huyện/tỉnh".
- Mỗi bài toán số liệu (mol, %m, hiệu suất, nồng độ, độ tan, tinh thể
  ngậm nước, kết tinh...) được giải lại độc lập trước khi chốt đáp án
  để tránh lỗi tương tự đã gặp ở FEATURE-001 (a6-l1-q11).
- A1 là kiến thức nền nên trọng tâm là mol, %m, hiệu suất, cân bằng
  PTHH cơ bản; A4 là trọng tâm HSG thật sự (nồng độ, pha chế, đường
  chéo, tinh thể ngậm nước, kết tinh, dung dịch tổng hợp) nên các câu
  applied/hsg có độ khó cao hơn, đúng mô tả trong CONTENT_OUTLINE.md.

## 4. Deviations from the approved plan

- Không có deviation. Codex rescue subagent vẫn không dùng được cho
  dự án này (giới hạn sandbox writable root đã ghi nhận từ
  FEATURE-002), Claude Code tiếp tục tự biên soạn trực tiếp.
- Commit được thực hiện bởi Claude Code (uỷ quyền của người dùng khi
  rời máy, phiên 2026-07-05, yêu cầu tiếp tục biên soạn nội dung theo
  đúng plan).

## 5. Commands executed

```bash
npm run validate-content   # sau mỗi unit
npx prettier --write content/units/<unit>.json
npm test
npm run lint
npm run typecheck
npm run format:check
npm run build
```

## 6. Validation results

| Check                           | Result                                                                                                                                   |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run validate-content`      | PASS — 17 unit, 0 lỗi schema/PTHH (chạy sau từng unit)                                                                                   |
| `npm test`                      | PASS — 15/15                                                                                                                             |
| Lint / typecheck / format:check | PASS                                                                                                                                     |
| Build (`vite build`)            | PASS                                                                                                                                     |
| Rà số liệu thủ công             | Toàn bộ 42 câu HSG và phần lớn câu applied (mol, %m, hiệu suất, nồng độ, độ tan, kết tinh) được giải lại độc lập trước khi viết vào file |

## 7. Known limitations

- Nội dung do AI biên soạn, chưa qua vòng duyệt của giáo viên Hoá —
  giống hiện trạng A5/A7/A9/A6/A8, cần rà soát chuyên môn trước khi
  công bố rộng.
- Câu HSG là tự soạn theo dạng đề quen thuộc, chưa trích đề thật có
  nguồn cụ thể.
- Chưa test UI thủ công từng bài của 2 unit mới trên trình duyệt hoặc
  điện thoại thật (dùng chung engine với các unit đã có, validate +
  regression test đã pass).

## 8. Remaining risks

- Sai sót hoá học tinh vi mà validator không bắt được (đáp án đúng
  nhưng cách diễn đạt gây hiểu lầm, đặc biệt bài toán kết tinh/tinh
  thể ngậm nước ở A4-L4 vốn dễ nhầm lẫn) — cần người duyệt kiểm tra.

## 9. Follow-up work

- Toàn bộ Đợt 2 đã hoàn tất (A1, A4, A5, A7, A9). Đợt 3 tiếp theo
  (A2 Oxi-Không khí, A3 Hiđro-Nước, A10 Kim loại, A11 Phi kim, A12
  Tổng hợp vô cơ) theo đúng thứ tự ưu tiên trong CONTENT_OUTLINE.md,
  cần lập plan FEATURE-004 riêng khi tiếp tục.
- Vòng review chuyên môn Hoá cho tất cả unit đã biên soạn (A1, A4-A9).
- Test trên điện thoại thật.
- Cân nhắc bổ sung câu HSG có nguồn thật (đề thi công khai) nếu muốn
  đạt đúng mục tiêu ban đầu của CONTENT_OUTLINE.md.
