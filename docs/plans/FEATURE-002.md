# FEATURE-002: Biên soạn nội dung Đợt 2 — cụm hợp chất vô cơ (A5, A7, A9)

## Status

- Status: APPROVED
- Owner: Claude Code
- Approved by: tuann2 (uỷ quyền trước bằng chỉ thị "lên plan cho các tính năng còn lại và chạy tiếp", phiên làm việc đêm 2026-07-05)
- Approved date: 2026-07-05

## 1. Objective

Biên soạn đầy đủ nội dung cho 3 chuyên đề tiếp theo của cụm hợp chất vô
cơ Hoá 9 theo thứ tự ưu tiên trong `docs/content/CONTENT_OUTLINE.md`
(Đợt 2, nửa đầu):

1. **A5. Oxit** — 4 bài học
2. **A7. Bazơ** — 5 bài học
3. **A9. Mối quan hệ giữa các hợp chất vô cơ** — 4 bài học

Sau feature này, toàn bộ cụm hợp chất vô cơ Hoá 9 chương 1
(A5 → A9) học được trọn vẹn trên web.

## 2. Current system analysis

- FEATURE-001 đã hoàn thành: app Vite + React + TS chạy được, quiz
  engine 4 dạng câu, store tiến độ, validate-content, CI, deploy
  GitHub Pages.
- `content/units/a6-axit.json` và `a8-muoi-phan-bon.json` là chuẩn mẫu
  biên soạn (schema, mật độ thẻ/câu hỏi, quy ước `<Chem>`).
- `a5-oxit.json`, `a7-bazo.json`, `a9-moi-quan-he-hop-chat-vo-co.json`
  hiện chỉ có metadata với `status: "coming-soon"`.

## 3. Assumptions

- Không cần thay đổi code app: schema 4 dạng câu hiện có đủ cho nội
  dung A5/A7/A9 (dạng ghép cặp/sắp xếp thứ tự để phase sau).
- Câu mức HSG: ưu tiên phỏng theo dạng bài kinh điển trong đề HSG/chuyên
  đã công bố; trường `source` ghi trung thực — ghi nguồn cụ thể chỉ khi
  chắc chắn, nếu không thì ghi khái quát ("Dạng bài phổ biến trong đề
  HSG Hoá 9 cấp tỉnh"), tuyệt đối không bịa nguồn chi tiết.
- Người duyệt (tuann2) rà soát nội dung hoá học sau khi test.

## 4. Scope

Theo đúng dàn bài trong CONTENT_OUTLINE.md:

### A5. Oxit (4 bài)

1. Phân loại oxit: bazơ, axit, lưỡng tính, trung tính; gọi tên
2. Tính chất hoá học của oxit bazơ; CaO – vôi
3. Tính chất hoá học của oxit axit; SO₂
4. Nâng cao: oxit lưỡng tính (Al₂O₃, ZnO); bài toán oxit + axit/kiềm

### A7. Bazơ (5 bài)

1. Tính chất hoá học chung của bazơ; bazơ tan và không tan
2. Natri hiđroxit NaOH; điều chế
3. Canxi hiđroxit Ca(OH)₂; ứng dụng
4. Nâng cao: bài toán CO₂/SO₂ + dung dịch kiềm (biện luận 2 muối)
5. Nâng cao: hiđroxit lưỡng tính (Al(OH)₃, Zn(OH)₂)

### A9. Mối quan hệ giữa các hợp chất vô cơ (4 bài)

1. Sơ đồ mối quan hệ oxit – axit – bazơ – muối
2. Chuỗi phản ứng vô cơ; điều chế nhiều bước
3. Nâng cao: nhận biết – tách – tinh chế chất vô cơ
4. Nâng cao: bài tập tổng hợp 4 loại hợp chất (đề HSG)

Mỗi bài tuân thủ quy ước biên soạn: ≤ 5 thẻ lý thuyết; 5–8 câu Cơ bản;
5–8 câu Vận dụng; 3–5 câu HSG; 100% câu có lời giải từng bước.
Đổi `status` các unit này thành `"available"`.

## 5. Out of scope

- A1 (Nền tảng), A4 (Dung dịch) — nửa sau Đợt 2, để FEATURE-003.
- Đợt 3 (A2, A3, A10, A11, A12) và Đợt 4 (B1–B5).
- Dạng câu hỏi mới (ghép cặp, sắp xếp thứ tự).
- Mọi thay đổi code app, store, UI.

## 6. Proposed design

Chỉ thêm dữ liệu JSON theo schema hiện có (`src/types/content.ts`),
noi theo cấu trúc và mật độ của `a6-axit.json`. Không đổi code.
Chia 3 lượt biên soạn (mỗi unit một lượt Codex riêng) để dễ review và
giữ mỗi diff nhỏ.

## 7. Files to create

Không có file mới.

## 8. Files to modify

- `content/units/a5-oxit.json` (metadata → nội dung đầy đủ)
- `content/units/a7-bazo.json` (metadata → nội dung đầy đủ)
- `content/units/a9-moi-quan-he-hop-chat-vo-co.json` (metadata → nội dung đầy đủ)
- `CHANGELOG.md`

## 9. API and database impact

Không có. Schema tiến độ localStorage không đổi (unit id giữ nguyên).

## 10. Implementation steps

1. Codex biên soạn A5 (4 bài) → validate + review.
2. Codex biên soạn A7 (5 bài) → validate + review.
3. Codex biên soạn A9 (4 bài) → validate + review.
4. Claude chạy độc lập: validate-content, lint, typecheck, test, build.
5. Spot-check nội dung hoá học (PTHH, đáp án, lời giải).
6. Cập nhật CHANGELOG; handoff `docs/handoffs/FEATURE-002-implementation.md`.
7. Commit, push, deploy qua workflow Pages có sẵn.

## 11. Test strategy

- `npm run validate-content` bắt lỗi schema, đáp án ngoài options,
  thiếu lời giải, PTHH không cân bằng (đã có sẵn, chạy trong build).
- Toàn bộ test hiện có phải tiếp tục pass (không đổi code nên là
  regression thuần).
- Manual: mở từng unit mới trên dev server, đi hết ít nhất 1 bài/unit.

## 12. Security considerations

Chỉ thêm dữ liệu JSON tĩnh; không code mới, không dependency mới,
không dữ liệu người dùng.

## 13. Risks

| Risk                                                           | Impact     | Mitigation                                                                                   |
| -------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------- |
| Nội dung hoá học sai (PTHH, đáp án)                            | Cao        | validate-content tự động; lời giải từng bước bắt buộc; người duyệt rà trước khi công bố rộng |
| Nguồn câu HSG không xác thực được                              | Trung bình | Quy ước ghi nguồn trung thực (khái quát nếu không chắc), như đã thống nhất ở FEATURE-001     |
| Khối lượng lớn (13 bài, ~200 câu hỏi) làm chất lượng không đều | Trung bình | Chia 3 lượt Codex, mỗi lượt validate + review riêng; noi chuẩn A6/A8                         |

## 14. Rollback plan

Mỗi unit một commit riêng; revert commit của unit lỗi là đủ. Không có
migration — unit quay lại `coming-soon` không ảnh hưởng tiến độ đã lưu
của unit khác.

## 15. Acceptance criteria

- [ ] A5 (4 bài), A7 (5 bài), A9 (4 bài) đầy đủ thẻ lý thuyết + 3 mức câu hỏi theo quy ước, `status: "available"`.
- [ ] 100% câu hỏi có `explanation` từng bước; câu HSG có `source` trung thực.
- [ ] `npm run validate-content && npm run lint && npm run typecheck && npm test && npm run build` pass toàn bộ.
- [ ] Trên web: 3 unit mới mở khoá được, học trọn ít nhất 1 bài mỗi unit.
- [ ] Deploy bản mới lên GitHub Pages thành công.
