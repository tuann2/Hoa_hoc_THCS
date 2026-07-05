# FEATURE-003: Biên soạn nội dung Đợt 2 (phần còn lại) — A1 Nền tảng hoá học, A4 Dung dịch

## Status

- Status: APPROVED
- Owner: Claude Code
- Approved by: tuann2 (uỷ quyền tiếp tục biên soạn nội dung theo đúng thứ tự ưu tiên trong CONTENT_OUTLINE.md, phiên 2026-07-05, người dùng rời máy)
- Approved date: 2026-07-05

## 1. Objective

Hoàn thiện nốt phần còn lại của Đợt 2 theo `docs/content/CONTENT_OUTLINE.md`:

1. **A1. Nền tảng hoá học** — 9 bài (gộp SGK Hoá 8 chương 1–3)
2. **A4. Dung dịch** — 5 bài (SGK Hoá 8 chương 6, trọng tâm HSG)

Sau feature này, toàn bộ Đợt 2 (A1, A4, A5, A7, A9) hoàn tất; cụm hợp
chất vô cơ Hoá 9 (A5–A9) và nền tảng Hoá 8 (A1, A4) học được trọn vẹn.

## 2. Current system analysis

- FEATURE-001, FEATURE-002 đã hoàn thành và deploy: app chạy ổn định,
  A6, A8 (FEATURE-001) và A5, A7, A9 (FEATURE-002) đã có nội dung đầy
  đủ, dùng chung chuẩn schema và mật độ (3 thẻ + 13 câu/bài).
- `a1-nen-tang-hoa-hoc.json` và `a4-dung-dich.json` hiện chỉ có
  metadata với `status: "coming-soon"`, lessons rỗng.

## 3. Assumptions

- Không đổi code app — chỉ thêm dữ liệu JSON theo schema hiện có.
- Câu mức HSG dùng `source: "Tự biên soạn theo dạng bài quen thuộc
trong đề thi HSG Hoá 9 cấp huyện/tỉnh"` (quy ước thống nhất từ
  FEATURE-001/002), không bịa tên đề/tỉnh/năm cụ thể.
- A1 là kiến thức nền (khái niệm, mol, %m, hiệu suất) nên basic/applied
  thiên về tính toán chuẩn SGK; A4 là trọng tâm HSG (nồng độ, pha chế,
  tinh thể ngậm nước) nên có nhiều câu nâng cao hơn theo đúng mô tả
  trong CONTENT_OUTLINE.md.
- Mỗi bài toán số liệu được giải lại độc lập trước khi chốt đáp án.

## 4. Scope

### A1. Nền tảng hoá học (9 bài, theo CONTENT_OUTLINE.md)

1. Chất – hỗn hợp – tách chất; nguyên tử, p – n – e
2. Nguyên tố hoá học – nguyên tử khối; sơ lược bảng tuần hoàn
3. Đơn chất – hợp chất – phân tử; CTHH và ý nghĩa
4. Hoá trị; lập CTHH theo hoá trị
5. Phản ứng hoá học; định luật bảo toàn khối lượng; cân bằng PTHH
6. Mol – khối lượng mol – thể tích mol khí; tỉ khối chất khí
7. Tính theo CTHH và PTHH: %m, chất dư – chất hết, hiệu suất
8. Nâng cao: biện luận tìm nguyên tố/CTHH; cân bằng phản ứng phức tạp
9. Nâng cao: bài toán hỗn hợp (hệ phương trình, M̄); tăng – giảm khối
   lượng; bảo toàn nguyên tố, bảo toàn khối lượng

### A4. Dung dịch (5 bài, theo CONTENT_OUTLINE.md)

1. Độ tan; các yếu tố ảnh hưởng
2. Nồng độ % và nồng độ mol; chuyển đổi
3. Pha chế – pha loãng dung dịch; quy tắc đường chéo
4. Nâng cao: tinh thể ngậm nước (CuSO4·5H2O...); bài toán kết tinh
5. Nâng cao: bài toán dung dịch tổng hợp (trộn nhiều dung dịch, C% sau
   phản ứng)

Mỗi bài: ≤ 5 thẻ lý thuyết; 5 câu Cơ bản; 5 câu Vận dụng; 3 câu HSG
(theo đúng mật độ đã dùng ở A5/A7/A9); 100% câu có lời giải từng bước.
Đổi `status` hai unit này thành `"available"`.

## 5. Out of scope

- Đợt 3 (A2, A3, A10, A11, A12) và Đợt 4 (B1–B5).
- Dạng câu hỏi mới (ghép cặp, sắp xếp thứ tự).
- Mọi thay đổi code app, store, UI.

## 6. Proposed design

Chỉ thêm dữ liệu JSON theo schema hiện có (`src/types/content.ts`), noi
theo cấu trúc, mật độ và văn phong của A5/A6/A7/A8/A9. Do Codex rescue
subagent không ghi được vào repo này (sandbox writable root là thư mục
session, đã ghi nhận ở FEATURE-002 handoff), Claude Code tự biên soạn
trực tiếp. Chia theo unit (A1 rồi A4), mỗi unit validate + commit riêng.

## 7. Files to create

Không có file mới.

## 8. Files to modify

- `content/units/a1-nen-tang-hoa-hoc.json` (metadata → nội dung đầy đủ)
- `content/units/a4-dung-dich.json` (metadata → nội dung đầy đủ)
- `CHANGELOG.md`

## 9. API and database impact

Không có. Schema tiến độ localStorage không đổi (unit id giữ nguyên).

## 10. Implementation steps

1. Biên soạn A1 (9 bài) → validate + rà số liệu → commit.
2. Biên soạn A4 (5 bài) → validate + rà số liệu → commit.
3. Chạy độc lập: validate-content, lint, typecheck, test, build.
4. Cập nhật CHANGELOG; handoff `docs/handoffs/FEATURE-003-implementation.md`.
5. Merge main, deploy (tự động qua GitHub Actions từ FEATURE-002).

## 11. Test strategy

- `npm run validate-content` bắt lỗi schema, đáp án ngoài options,
  thiếu lời giải, PTHH không cân bằng (đã có sẵn).
- Toàn bộ test hiện có phải tiếp tục pass (regression thuần, không đổi
  code).
- Rà thủ công: giải lại từng bài toán số liệu trước khi chốt.

## 12. Security considerations

Chỉ thêm dữ liệu JSON tĩnh; không code mới, không dependency mới,
không dữ liệu người dùng.

## 13. Risks

| Risk                                                                                            | Impact     | Mitigation                                                                            |
| ----------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------- |
| Nội dung hoá học sai (đặc biệt mol, %m, hiệu suất ở A1 — nền tảng dễ lan lỗi sang các unit sau) | Cao        | validate-content tự động; lời giải từng bước; giải lại độc lập mỗi câu trước khi chốt |
| Khối lượng lớn (14 bài, ~180 câu hỏi) làm chất lượng không đều                                  | Trung bình | Biên soạn theo từng unit, validate + rà soát riêng từng lượt                          |
| Nguồn câu HSG không xác thực được                                                               | Trung bình | Dùng source khái quát trung thực, nhất quán với FEATURE-001/002                       |

## 14. Rollback plan

Mỗi unit một commit riêng; revert commit của unit lỗi là đủ. Không có
migration — unit quay lại `coming-soon` không ảnh hưởng tiến độ đã lưu
của unit khác.

## 15. Acceptance criteria

- [ ] A1 (9 bài), A4 (5 bài) đầy đủ thẻ lý thuyết + 3 mức câu hỏi theo quy ước, `status: "available"`.
- [ ] 100% câu hỏi có `explanation` từng bước; câu HSG có `source` trung thực.
- [ ] `npm run validate-content && npm run lint && npm run typecheck && npm test && npm run build` pass toàn bộ.
- [ ] Deploy bản mới lên GitHub Pages thành công qua GitHub Actions.
