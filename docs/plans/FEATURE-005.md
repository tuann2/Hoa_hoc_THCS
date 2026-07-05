# FEATURE-005: Biên soạn nội dung Đợt 4 — toàn bộ Hữu cơ (B1–B5)

## Status

- Status: APPROVED
- Owner: Claude Code
- Approved by: tuann2 (uỷ quyền tiếp tục biên soạn toàn bộ các đợt còn lại theo đúng thứ tự ưu tiên CONTENT_OUTLINE.md, phiên 2026-07-05)
- Approved date: 2026-07-05

## 1. Objective

Hoàn thiện Đợt 4 (đợt cuối cùng) theo `docs/content/CONTENT_OUTLINE.md`:

1. **B1. Đại cương về hợp chất hữu cơ** — 3 bài
2. **B2. Hiđrocacbon – Nhiên liệu** — 6 bài
3. **B3. Dẫn xuất chứa oxi** — 5 bài
4. **B4. Gluxit – Protein – Polime** — 6 bài
5. **B5. Chuyên đề tổng hợp Hữu cơ** — 3 bài

Sau feature này, toàn bộ nội dung Vô cơ + Hữu cơ (A1–A12, B1–B5) hoàn
tất theo đúng phạm vi CONTENT_OUTLINE.md.

## 2. Current system analysis

- FEATURE-001 → 004 đã hoàn thành: toàn bộ phần Vô cơ (A1–A12) có nội
  dung đầy đủ theo chuẩn 3 thẻ + 13 câu (5 basic, 5 applied, 3 hsg)
  mỗi bài, dùng chung schema/validator/component `<Chem>` hiện có.
- `b1-dai-cuong-huu-co.json`, `b2-hidrocacbon-nhien-lieu.json`,
  `b3-dan-xuat-chua-oxi.json`, `b4-gluxit-protein-polime.json`,
  `b5-tong-hop-huu-co.json` hiện chỉ có metadata `status: "coming-soon"`.
- Codex rescue subagent nay đã dùng được cho repo này qua cờ `--cwd`
  (đã sửa và verify ở phiên 2026-07-05) — feature này sẽ giao phần lớn
  việc biên soạn cho Codex thay vì Claude Code tự viết, đúng vai trò
  kiến trúc sư/reviewer.

## 3. Assumptions

- Không đổi code app — chỉ thêm dữ liệu JSON theo schema hiện có.
  Component `<Chem>` hiện dùng quy ước text thường (H2O, CH4, ->) nên
  công thức hữu cơ (CTCT, liên kết đôi/ba) cần viết ở dạng text đơn
  giản hoá phù hợp (ví dụ CH2=CH2, CH≡CH viết bằng kí tự có sẵn, hoặc
  mô tả bằng lời trong "explanation"/"body" nếu công thức cấu tạo quá
  phức tạp để biểu diễn thuần văn bản).
- Giữ nguyên mật độ 3 thẻ + 13 câu/bài (5 basic, 5 applied, 3 hsg) như
  toàn bộ phần Vô cơ.
- Câu HSG dùng `source: "Tự biên soạn theo dạng bài quen thuộc trong
đề thi HSG Hoá 9 cấp huyện/tỉnh"`.
- Mỗi bài toán số liệu (đốt cháy hiđrocacbon, hiệu suất este hoá/lên
  men, độ rượu...) phải được giải lại độc lập trước khi chốt — rủi ro
  sai sót cao nhất trong toàn dự án vì hoá hữu cơ có nhiều phản ứng
  phụ (trùng hợp, thuỷ phân, lên men) dễ nhầm hệ số/tỉ lệ mol.
- Giao việc biên soạn cho Codex qua `Agent(subagent_type:
"codex:codex-rescue")` với `--cwd /Users/tuann2/Documents/Code/Hoa_hoc_THCS --write --wait`,
  theo từng unit một (5 lượt). Claude Code review diff, tự chạy lại
  validate độc lập trước khi merge, không tin hoàn toàn báo cáo của
  Codex.

## 4. Scope

### B1. Đại cương về hợp chất hữu cơ (3 bài)

1. Khái niệm; phân loại hiđrocacbon/dẫn xuất
2. Cấu tạo phân tử hợp chất hữu cơ; CTCT
3. Nâng cao: lập CTPT từ % khối lượng, sản phẩm đốt cháy; độ bất bão hoà

### B2. Hiđrocacbon – Nhiên liệu (6 bài)

1. Metan: cấu tạo, phản ứng thế
2. Etilen: liên kết đôi, phản ứng cộng, trùng hợp
3. Axetilen: liên kết ba, phản ứng cộng; điều chế
4. Benzen: cấu tạo vòng, thế/cộng
5. Dầu mỏ – khí thiên nhiên – nhiên liệu
6. Nâng cao: bài toán đốt cháy hiđrocacbon, hỗn hợp khí

### B3. Dẫn xuất chứa oxi (5 bài)

1. Rượu etylic: cấu tạo, tính chất, độ rượu
2. Axit axetic: tính chất axit, phản ứng este hoá
3. Mối liên hệ etilen – rượu etylic – axit axetic
4. Chất béo; xà phòng hoá
5. Nâng cao: hiệu suất este hoá/lên men; bài toán độ rượu

### B4. Gluxit – Protein – Polime (6 bài)

1. Glucozơ; phản ứng tráng gương; lên men
2. Saccarozơ; thuỷ phân
3. Tinh bột và xenlulozơ
4. Protein
5. Polime – chất dẻo, tơ, cao su
6. Nâng cao: chuỗi chuyển hoá gluxit; bài toán lên men – hiệu suất nhiều giai đoạn

### B5. Chuyên đề tổng hợp Hữu cơ (3 bài)

1. Biện luận công thức phân tử hợp chất hữu cơ
2. Chuỗi phản ứng hữu cơ; nhận biết chất hữu cơ
3. Đề tổng hợp hữu cơ theo cấu trúc đề thi chuyên

Mỗi bài: ≤ 5 thẻ lý thuyết; 5 câu Cơ bản; 5 câu Vận dụng; 3 câu HSG;
100% câu có lời giải từng bước. Đổi `status` 5 unit này thành
`"available"`.

## 5. Out of scope

- Mọi thay đổi code app, store, UI, component `<Chem>`.
- Dạng câu hỏi mới ngoài 4 dạng hiện có.
- LaTeX/hiển thị công thức cấu tạo đồ hoạ (đúng theo giới hạn MVP ban
  đầu của FEATURE-001: không dùng LaTeX/MathJax).

## 6. Proposed design

Giao Codex biên soạn từng unit một (B1 → B2 → B3 → B4 → B5) qua
`codex:codex-rescue` với `--cwd` trỏ đúng repo, theo mẫu văn phong của
các unit Vô cơ đã có (ví dụ `content/units/a10-kim-loai.json`). Sau mỗi
lượt, Claude Code:

1. Đọc diff, kiểm tra định tính vài câu (đặc biệt câu tính toán).
2. Tự chạy `npm run validate-content && npm run lint && npm run typecheck && npm test` độc lập.
3. Sửa trực tiếp nếu phát hiện lỗi nhỏ; giao lại Codex nếu lỗi lớn/nhiều.
4. Commit riêng theo unit.

## 7. Files to create

Không có file mới.

## 8. Files to modify

- `content/units/b1-dai-cuong-huu-co.json`
- `content/units/b2-hidrocacbon-nhien-lieu.json`
- `content/units/b3-dan-xuat-chua-oxi.json`
- `content/units/b4-gluxit-protein-polime.json`
- `content/units/b5-tong-hop-huu-co.json`
- `CHANGELOG.md`

## 9. API and database impact

Không có. Schema tiến độ localStorage không đổi (unit id giữ nguyên).

## 10. Implementation steps

1. Giao Codex biên soạn B1 (3 bài) → Claude review + validate độc lập → commit.
2. Giao Codex biên soạn B2 (6 bài) → review + validate → commit.
3. Giao Codex biên soạn B3 (5 bài) → review + validate → commit.
4. Giao Codex biên soạn B4 (6 bài) → review + validate → commit.
5. Giao Codex biên soạn B5 (3 bài) → review + validate → commit.
6. Chạy độc lập toàn bộ: validate-content, lint, typecheck, test, build.
7. Cập nhật CHANGELOG; handoff `docs/handoffs/FEATURE-005-implementation.md`.
8. Merge main, deploy tự động qua GitHub Actions.

## 11. Test strategy

- `npm run validate-content` bắt lỗi schema, đáp án ngoài options,
  thiếu lời giải, PTHH không cân bằng.
- Toàn bộ test hiện có phải tiếp tục pass (regression thuần).
- Rà thủ công: giải lại từng bài toán đốt cháy/hiệu suất/lên men trước
  khi chốt, đặc biệt các bài nâng cao B2-L6, B3-L5, B4-L6, B5.

## 12. Security considerations

Chỉ thêm dữ liệu JSON tĩnh; không code mới, không dependency mới.

## 13. Risks

| Risk                                                                                                            | Impact     | Mitigation                                                                                                           |
| --------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------- |
| Hoá hữu cơ có nhiều phản ứng đặc thù (trùng hợp, thuỷ phân, lên men, este hoá) dễ sai hệ số/tỉ lệ mol hơn vô cơ | Cao        | Giải lại độc lập mọi bài toán trước khi chốt; validate-content tự động; review kỹ hơn các bài nâng cao               |
| Biểu diễn công thức cấu tạo hữu cơ (liên kết đôi/ba, mạch vòng) khó viết bằng text thuần                        | Trung bình | Dùng quy ước text đơn giản (CH2=CH2, C6H6...) và mô tả cấu tạo bằng lời trong thẻ lý thuyết thay vì công thức đồ hoạ |
| Khối lượng lớn nhất từ trước tới nay (23 bài, ~299 câu hỏi)                                                     | Trung bình | Giao Codex theo từng unit, Claude review + validate riêng từng lượt, không dồn hết một lượt                          |
| Codex mới được sửa để dùng `--cwd`, chưa có nhiều lần chạy thực tế quy mô lớn                                   | Trung bình | Bắt đầu với unit nhỏ nhất (B1, 3 bài) để kiểm chứng trước khi giao các unit lớn hơn                                  |

## 14. Rollback plan

Mỗi unit một commit riêng; revert commit của unit lỗi là đủ. Không có
migration — unit quay lại `coming-soon` không ảnh hưởng tiến độ đã lưu
của unit khác.

## 15. Acceptance criteria

- [ ] B1 (3 bài), B2 (6 bài), B3 (5 bài), B4 (6 bài), B5 (3 bài) đầy đủ thẻ lý thuyết + 3 mức câu hỏi theo quy ước, `status: "available"`.
- [ ] 100% câu hỏi có `explanation` từng bước; câu HSG có `source` trung thực.
- [ ] `npm run validate-content && npm run lint && npm run typecheck && npm test && npm run build` pass toàn bộ.
- [ ] Deploy bản mới lên GitHub Pages thành công qua GitHub Actions.
- [ ] Toàn bộ CONTENT_OUTLINE.md (A1–A12, B1–B5) đã được biên soạn đầy đủ.
