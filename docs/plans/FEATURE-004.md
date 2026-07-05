# FEATURE-004: Biên soạn nội dung Đợt 3 — phần còn lại Vô cơ (A2, A3, A10, A11, A12)

## Status

- Status: APPROVED
- Owner: Claude Code
- Approved by: tuann2 (uỷ quyền tiếp tục biên soạn toàn bộ các đợt còn lại theo đúng thứ tự ưu tiên CONTENT_OUTLINE.md, phiên 2026-07-05)
- Approved date: 2026-07-05

## 1. Objective

Hoàn thiện Đợt 3 theo `docs/content/CONTENT_OUTLINE.md`:

1. **A2. Oxi – Không khí** — 3 bài
2. **A3. Hiđro – Nước** — 4 bài
3. **A10. Kim loại** — 5 bài
4. **A11. Phi kim** — 5 bài
5. **A12. Chuyên đề tổng hợp Vô cơ** — 4 bài

Sau feature này, toàn bộ phần Vô cơ (A1–A12) hoàn tất, chỉ còn Đợt 4
(Hữu cơ B1–B5).

## 2. Current system analysis

- FEATURE-001/002/003 đã hoàn thành: A1, A5, A6, A7, A8, A9 có nội
  dung đầy đủ theo chuẩn 3 thẻ + 13 câu (5 basic, 5 applied, 3 hsg)
  mỗi bài; A4 cũng đã hoàn tất.
- `a2-oxi-khong-khi.json`, `a3-hidro-nuoc.json`, `a10-kim-loai.json`,
  `a11-phi-kim.json`, `a12-tong-hop-vo-co.json` hiện chỉ có metadata
  với `status: "coming-soon"`.

## 3. Assumptions

- Không đổi code app — chỉ thêm dữ liệu JSON theo schema hiện có.
- Giữ nguyên mật độ và văn phong đã dùng cho A1, A5, A7, A9: 3 thẻ lý
  thuyết, 13 câu/bài, câu HSG dùng `source: "Tự biên soạn theo dạng
bài quen thuộc trong đề thi HSG Hoá 9 cấp huyện/tỉnh"`.
- A12 là chuyên đề tổng hợp (chỉ dành HSG/chuyên theo CONTENT_OUTLINE)
  nên trọng tâm câu hỏi thiên về vận dụng/HSG hơn, nhưng vẫn giữ đủ
  5/5/3 theo ràng buộc validator.
- Mỗi bài toán số liệu được giải lại độc lập trước khi chốt đáp án.
- Codex rescue subagent không dùng được cho dự án này (giới hạn
  sandbox writable root đã ghi nhận từ FEATURE-002/003); Claude Code
  tự biên soạn trực tiếp.

## 4. Scope

### A2. Oxi – Không khí (3 bài)

1. Tính chất – điều chế oxi; phản ứng hoá hợp, phân huỷ
2. Oxit: phân loại, gọi tên (mở đầu)
3. Không khí – sự cháy; nâng cao: bài toán đốt cháy hỗn hợp

### A3. Hiđro – Nước (4 bài)

1. Tính chất – điều chế hiđro; phản ứng thế; khử oxit kim loại
2. Nước: tính chất; phản ứng với kim loại/oxit
3. Axit – bazơ – muối: định nghĩa, phân loại, gọi tên (mở đầu)
4. Nâng cao: khử hỗn hợp oxit, bài toán H2 + CuO/Fe2O3

### A10. Kim loại (5 bài)

1. Tính chất chung; dãy hoạt động hoá học
2. Nhôm; sắt; hợp kim gang – thép
3. Ăn mòn kim loại và bảo vệ
4. Nâng cao: kim loại + dung dịch muối (biện luận)
5. Nâng cao: bài toán hỗn hợp kim loại + axit; kim loại dư/axit dư

### A11. Phi kim (5 bài)

1. Tính chất chung của phi kim
2. Clo; điều chế và ứng dụng; nước Gia-ven, clorua vôi
3. Cacbon và các oxit của cacbon; muối cacbonat
4. Silic – công nghiệp silicat
5. Nâng cao: CO khử oxit; bài toán muối cacbonat + axit

### A12. Chuyên đề tổng hợp Vô cơ (4 bài)

1. Chuỗi phản ứng – điều chế nhiều bước (tổng hợp toàn phần Vô cơ)
2. Nhận biết không giới hạn/giới hạn thuốc thử; tách chất
3. Bài tập biện luận (xác định chất, lượng chất theo điều kiện)
4. Đề tổng hợp vô cơ theo cấu trúc đề thi chuyên

Mỗi bài: ≤ 5 thẻ lý thuyết; 5 câu Cơ bản; 5 câu Vận dụng; 3 câu HSG;
100% câu có lời giải từng bước. Đổi `status` 5 unit này thành
`"available"`.

## 5. Out of scope

- Đợt 4 (B1–B5 Hữu cơ) — để FEATURE-005.
- Dạng câu hỏi mới (ghép cặp, sắp xếp thứ tự).
- Mọi thay đổi code app, store, UI.

## 6. Proposed design

Chỉ thêm dữ liệu JSON theo schema hiện có (`src/types/content.ts`),
noi theo cấu trúc, mật độ và văn phong của A1/A5/A7/A9. Chia theo unit
(A2 → A3 → A10 → A11 → A12), mỗi unit validate + commit riêng để dễ
review và giữ diff nhỏ.

## 7. Files to create

Không có file mới.

## 8. Files to modify

- `content/units/a2-oxi-khong-khi.json`
- `content/units/a3-hidro-nuoc.json`
- `content/units/a10-kim-loai.json`
- `content/units/a11-phi-kim.json`
- `content/units/a12-tong-hop-vo-co.json`
- `CHANGELOG.md`

## 9. API and database impact

Không có. Schema tiến độ localStorage không đổi (unit id giữ nguyên).

## 10. Implementation steps

1. Biên soạn A2 (3 bài) → validate + rà số liệu → commit.
2. Biên soạn A3 (4 bài) → validate + rà số liệu → commit.
3. Biên soạn A10 (5 bài) → validate + rà số liệu → commit.
4. Biên soạn A11 (5 bài) → validate + rà số liệu → commit.
5. Biên soạn A12 (4 bài) → validate + rà số liệu → commit.
6. Chạy độc lập: validate-content, lint, typecheck, test, build.
7. Cập nhật CHANGELOG; handoff `docs/handoffs/FEATURE-004-implementation.md`.
8. Merge main, deploy tự động qua GitHub Actions.

## 11. Test strategy

- `npm run validate-content` bắt lỗi schema, đáp án ngoài options,
  thiếu lời giải, PTHH không cân bằng (đã có sẵn).
- Toàn bộ test hiện có phải tiếp tục pass (regression thuần).
- Rà thủ công: giải lại từng bài toán số liệu trước khi chốt.

## 12. Security considerations

Chỉ thêm dữ liệu JSON tĩnh; không code mới, không dependency mới.

## 13. Risks

| Risk                                                                                                                   | Impact     | Mitigation                                                                              |
| ---------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------- |
| Nội dung hoá học sai (đặc biệt dãy hoạt động hoá học kim loại, ăn mòn, muối cacbonat + axit thứ tự phản ứng — dễ nhầm) | Cao        | validate-content tự động; lời giải từng bước; giải lại độc lập mỗi câu trước khi chốt   |
| Khối lượng lớn (21 bài, ~273 câu hỏi) làm chất lượng không đều                                                         | Trung bình | Biên soạn theo từng unit, validate + rà soát riêng từng lượt                            |
| A12 tổng hợp dễ trùng lặp ý với các bài nâng cao ở A1-A11                                                              | Thấp       | Ưu tiên dạng bài tổng hợp nhiều bước, chuỗi phản ứng dài hơn thay vì lặp lại bài đơn lẻ |

## 14. Rollback plan

Mỗi unit một commit riêng; revert commit của unit lỗi là đủ. Không có
migration — unit quay lại `coming-soon` không ảnh hưởng tiến độ đã lưu
của unit khác.

## 15. Acceptance criteria

- [ ] A2 (3 bài), A3 (4 bài), A10 (5 bài), A11 (5 bài), A12 (4 bài) đầy đủ thẻ lý thuyết + 3 mức câu hỏi theo quy ước, `status: "available"`.
- [ ] 100% câu hỏi có `explanation` từng bước; câu HSG có `source` trung thực.
- [ ] `npm run validate-content && npm run lint && npm run typecheck && npm test && npm run build` pass toàn bộ.
- [ ] Deploy bản mới lên GitHub Pages thành công qua GitHub Actions.
