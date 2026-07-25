# FEATURE-015: Xây lại danh mục bài học theo tài liệu chuẩn hoá, danh pháp GDPT 2018

## Status

- Status: APPROVED <!-- DRAFT | APPROVED | SUPERSEDED -->
- Owner: Claude Code (Planner, dispatch của nt0 ngày 2026-07-19; dàn ý 11 unit
  và "Mức 2 — GDPT 2018 toàn diện" đã được nt0 chốt trong phiên 2026-07-19)
- Approved by / date: nt0, 2026-07-19 (plan + risk tier CRITICAL + dàn ý 11
  unit ở Phụ lục A + quy ước GDPT 2018 Mức 2)
- Risk tier: CRITICAL
- Risk categories and escalation rationale: thay đổi công thức/đáp án/giá trị
  số giáo dục trên toàn bộ nội dung (hard trigger; quy đổi 22,4 L/mol đktc →
  24,79 L/mol đkc 25°C, 1 bar); soạn lại toàn bộ danh mục và thẻ lý thuyết;
  reset/migration tiến độ người học (localStorage + Supabase sync — hàng
  Supabase/sync trong `docs/CONTEXT_RULES.md` là CRITICAL); thay đổi hành vi
  runtime (mở khoá bài, ôn câu sai, thi thử theo unit mới); cập nhật kỳ vọng
  test unit + E2E.
- Change type and required gate profile: Content; Application source or
  runtime config; Tests only — full profile theo `scripts/gates-manifest.ts`
  (dự kiến: `git diff --check`, `format:check`, `validate-content`,
  `check:content-catalog`, `lint`, `typecheck`, `test`, `build`,
  `check:bundle`, `test:e2e`, `test:pwa`, CI trên đúng candidate, review độc
  lập + adversarial theo tier CRITICAL).

> Governance note: bản nháp để con người duyệt. Duyệt plan đồng nghĩa duyệt
> dàn ý 11 unit (Phụ lục A), bảng quy ước GDPT 2018 (mục Design) và chiến
> lược tiến độ người học. Không implement trước khi Status = APPROVED.
> `validate-content` không kiểm được đúng/sai hoá học: nội dung sau khi soạn
> phải qua vòng review chuyên môn của giáo viên (nt0 xác nhận nội dung cũ đã
> được giáo viên hoá review và yêu cầu làm lại theo cấu trúc này).

## Objective and scope

- Objective: thay 17 unit / 81 bài hiện tại bằng danh mục mới 11 unit / 52
  bài bám cấu trúc bộ tài liệu chuẩn hoá (nhánh
  `codex/feature-015-chuan-hoa-noi-dung-hoc`), toàn bộ nội dung theo danh
  pháp và quy ước số của GDPT 2018, tái sử dụng nội dung cũ ở những bài còn
  phù hợp.
- In scope:
  1. `content/catalog.json` + `content/units/`: danh mục mới theo Phụ lục A;
     id mới `n1`–`n11`, `n<k>-l<j>`; xoá 17 file unit cũ.
  2. Thẻ lý thuyết: soạn từ 7 file tài liệu chuẩn hoá (quy đổi sang GDPT 2018) + chất liệu cũ được giữ theo Phụ lục A; ≤25 thẻ/bài.
  3. Câu hỏi: tái sử dụng câu cũ khớp bài mới sau khi quy đổi danh pháp/số
     liệu; soạn bổ sung cho bài thiếu; mọi bài toán số phải được giải lại
     độc lập trước khi commit (quy tắc repo).
  4. Tiến độ người học: giữ XP, streak, lịch sử thi; reset tiến độ theo bài
     (không tồn tại ánh xạ 1-1); backup snapshot cũ trước khi ghi đè; bump
     version snapshot, migration một chiều áp dụng cho cả snapshot sync.
  5. Cập nhật test unit/E2E theo id và nội dung mới;
     `scripts/tag-question-category.ts` thêm keyword `đkc`.
  6. Đưa 8 file .md tài liệu chuẩn hoá (không kèm 41 ảnh gốc) vào
     `docs/content-reserve/feature-015/` làm nguồn tham chiếu có kiểm soát.
- Out of scope: merge 41 ảnh chụp sách (giữ trên nhánh codex); hiệu đính
  ngược bộ tài liệu chuẩn hoá sang GDPT 2018 (tài liệu là nguồn chất liệu,
  không phải sản phẩm); thay đổi schema thẻ/câu hỏi, logic XP/streak/thi
  thử, Supabase schema phía server.

## Current analysis and design

- Current behavior / relevant context: 17 unit, 81 bài; "22,4"/"đktc" xuất
  hiện trong cả 17 file unit; không có hằng số 22,4 trong `src/` (nội dung
  quyết định đáp án). Tiến độ lưu khoá `unitId::lessonId::questionId`
  (`src/store/progress.ts:245`), mở khoá theo `lessonId`, đồng bộ qua
  `src/lib/progressSync.ts`. E2E và test loader tham chiếu id cũ.
- Proposed design:
  - Danh mục 11 unit / 52 bài theo Phụ lục A (nt0 đã duyệt dàn ý sơ bộ).
  - Quy ước GDPT 2018 (Mức 2, áp dụng thống nhất cho thẻ + câu hỏi + đáp án):
    1. Danh pháp: acid/base/oxide/muối; tên nguyên tố và hợp chất tiếng Anh
       (sodium hydroxide, chlorine, sulfuric acid, ethylic alcohol,
       carbohydrate, polymer…); ghi kèm tên cũ trong ngoặc ở lần xuất hiện
       đầu mỗi bài khi cần đối chiếu SGK cũ.
    2. Thể tích mol khí: 24,79 L/mol ở đkc (25°C, 1 bar); mọi bài toán khí
       giải lại theo 24,79; thuật ngữ "đkc" thay "đktc".
    3. Giữ quy ước công thức text thuần của tài liệu chuẩn hoá (H2SO4,
       "->", "⇌", điều kiện trong ngoặc).
    4. Dãy hoạt động hoá học bản đầy đủ; các hiệu đính chuyên môn trong
       "Nhật ký hiệu đính" của tài liệu chuẩn hoá được giữ nguyên.
  - Tiến độ: `SNAPSHOT_VERSION` bump; khi gặp snapshot cũ: sao lưu nguyên
    trạng vào khoá backup, giữ XP/streak/lịch sử thi, khởi tạo lại
    lessonProgress/unlockedLessonIds theo catalog mới; luồng sync nhận
    snapshot cũ từ server xử lý cùng cách, ghi lại theo version mới.
- New technology: không có.

## Delivery plan

Execution assignment (R2-R4) — mỗi dòng cần nt0 xác nhận riêng khi đến lượt
vai trò đó; duyệt plan không tự động duyệt việc nhận vai kế tiếp. R1 đã làm
xong với Planner=Implementer=Claude Code trong cùng phiên (chưa tách vai);
từ R2 áp dụng phân công dưới đây để tách vai thật và tiết kiệm token phiên
orchestrator:

| Vai trò                                | Agent đề xuất                                   | Model / effort đề xuất                                                                                                       | Lý do theo khối lượng công việc                                                                                                                                   |
| -------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Planner / orchestrator                 | Claude Code (phiên hiện tại)                    | Claude Fable 5, effort cao                                                                                                   | Giữ toàn bộ ngữ cảnh nhiều lượt, phân rã khối lượng nội dung từng vòng, xác minh số liệu hoá học ở checkpoint — việc không lặp lại, cần suy luận sâu              |
| Implementer R2 (N3–N7, 17 bài vô cơ)   | Codex                                           | GPT-5.6-terra, effort cao                                                                                                    | Khối lượng lớn nhất trong 3 vòng còn lại, có tính lặp/cơ khí (tuân schema, quy đổi danh pháp) nhưng vẫn cần độ chính xác hoá học cao                              |
| Implementer R3 (N8–N9, 9 bài)          | Codex                                           | GPT-5.6-terra, effort cao                                                                                                    | Khối lượng vừa; giữ cùng agent với R2 để nhất quán văn phong/quy ước đã thiết lập                                                                                 |
| Implementer R4 (N10–N11, 13 bài + E2E) | Codex                                           | GPT-5.6-terra, effort cao (riêng phần sửa E2E: effort trung bình, việc cập nhật id máy móc)                                  | Khối lượng lớn thứ nhì; phần E2E là cập nhật id/luồng đã có, effort thấp hơn phần soạn nội dung                                                                   |
| Independent Reviewer (mỗi vòng R2–R4)  | Antigravity (agy)                               | Opus 4.6, effort medium; fallback Claude Sonnet 4.6 (Thinking) khi Opus 4.6 hết quota (nt0 xác nhận 2026-07-19, xem handoff) | Review CRITICAL yêu cầu soát từng dòng thay đổi; execution độc lập, không thấy transcript implementer; đúng quy ước reviewer CRITICAL đã dùng ở các feature trước |
| Release Assessor (cuối R4)             | Claude Code (phiên orchestrator) hoặc Codex đọc | Claude Haiku 4.5 (nếu tách phiên riêng) hoặc Codex effort thấp                                                               | Chỉ đọc handoff/evidence, đối chiếu tiêu chí — khối lượng nhỏ, không cần model đắt                                                                                |

Model/effort trên là đề xuất của Planner tại thời điểm viết plan; Implementer
phải xác nhận lại theo mục "capabilities required" của role contract và
profile thực tế của phiên tại thời điểm dispatch (`docs/roles/*.md`,
`docs/runbooks/providers/*.md`), ghi sai lệch (nếu có) vào handoff.

1. Human duyệt plan này (dàn ý + quy ước + chiến lược tiến độ).
2. Implementer nhận envelope riêng (allowed_paths: `content/`, `src/`,
   `tests/`, `scripts/tag-question-category.ts`,
   `docs/content-reserve/feature-015/`, `docs/handoffs/`), làm trên nhánh
   `feature/FEATURE-015`, chia vòng theo khối để kiểm soát chất lượng:
   R1 danh mục khung + N1–N2 + migration tiến độ + test migration;
   R2 N3–N7 (vô cơ); R3 N8–N9 (kim loại, phi kim); R4 N10–N11 (hữu cơ).
   `content/catalog.json` chỉ liệt kê unit đã soạn xong trong vòng hiện tại
   (2 unit sau R1 → 7 sau R2 → 9 sau R3 → đủ 11 sau R4); không thêm unit
   rỗng/dở dang, để mỗi vòng vẫn là một app mạch lạc phục vụ kiểm soát chất
   lượng theo vòng. Chia vòng chỉ để kiểm soát chất lượng nội dung, không
   phải để gate hoá từng phần: mỗi vòng chạy gate nội dung/mã nguồn
   (`format:check`, `validate-content`, `check:content-catalog`, `lint`,
   `typecheck`, `test`, `build`, `check:bundle`) và test migration liên
   quan; **`test:e2e`/`test:pwa` chỉ chạy đầy đủ một lần ở cuối R4**, sau
   khi toàn bộ 11 unit đã được cập nhật, cùng với full gate profile và
   evidence exact-snapshot cho candidate cuối cùng. Handoff mỗi vòng nêu rõ
   bài nào tái sử dụng câu hỏi cũ và bài toán nào đã giải lại.
3. Sau R4: full gate profile + evidence exact-snapshot trên candidate cuối.
4. Review độc lập theo tier CRITICAL (fresh reviewer + adversarial, không
   nhận transcript implementer) + vòng review chuyên môn hoá học của giáo
   viên qua nt0; remediation loop đến khi đóng finding.
5. Release Assessor đánh giá; nt0 phê duyệt cuối và cho phép merge.

## Risks and controls

| Risk                                                            | Impact                             | Mitigation                                                                                                                                           |
| --------------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sai đáp án sau quy đổi 24,79 / danh pháp mới                    | Cao                                | giải lại độc lập từng bài toán; reviewer độc lập tính lại mẫu; vòng review giáo viên trước release                                                   |
| Danh pháp mới/cũ trộn lẫn trong nội dung                        | Cao                                | bảng quy ước cố định trong plan; kiểm tra grep danh sách từ cũ cấm (axit, bazơ, đktc, 22,4…) trong evidence từng vòng                                |
| Người học mất tiến độ theo bài                                  | Trung bình (chấp nhận có chủ đích) | giữ XP/streak/lịch sử thi; backup snapshot; thông báo trong app khi phát hiện migration (nếu UI hiện có hỗ trợ, ngược lại ghi rõ trong release note) |
| Client PWA cũ ghi snapshot version cũ sau khi server có bản mới | Trung bình                         | cơ chế version snapshot + xử lý một chiều khi nhận; E2E offline/update của FEATURE-014 phải xanh                                                     |
| Khối lượng soạn 52 bài gây trôi chất lượng cuối kỳ              | Trung bình                         | chia 4 vòng, gate + handoff từng vòng; không dịch vòng sau khi vòng trước còn finding mở                                                             |
| Câu hỏi cũ tái sử dụng còn dấu vết quy ước cũ                   | Trung bình                         | quy trình quy đổi bắt buộc theo checklist; grep từ cấm áp dụng cho cả `questions`                                                                    |

## Acceptance and recovery

- [ ] Danh mục đúng Phụ lục A: 11 unit, 52 bài, mỗi bài ≤25 thẻ, catalog và
      unit files qua `validate-content` + `check:content-catalog`.
- [ ] Không còn "đktc", "22,4" và danh pháp cũ ngoài chú thích đối chiếu
      được phép; mọi bài toán khí dùng 24,79 L/mol (đkc).
- [ ] Snapshot cũ được backup; XP/streak/lịch sử thi giữ nguyên sau
      migration; test migration cover local + sync.
- [ ] Toàn bộ gate profile xanh trên đúng candidate; E2E cập nhật pass CI.
- [ ] Vòng review chuyên môn của giáo viên (qua nt0) xác nhận nội dung.
- Security considerations: không đổi bề mặt auth/RLS; chỉ đổi nội dung và
  xử lý snapshot phía client.
- API/database impact: không đổi schema server; payload snapshot đổi cấu
  trúc id qua version mới.
- Test strategy: test migration snapshot; test loader/catalog theo danh mục
  mới; spot-check đáp án số trong test nội dung nếu có; E2E học/thi/
  persistence/offline.
- Rollback plan: revert merge commit; client chưa nhận bản mới không bị ảnh
  hưởng; snapshot backup cho phép khôi phục tiến độ cũ nếu phải quay lui
  sau khi đã phát hành.

## Phụ lục A: dàn ý danh mục (11 unit / 52 bài, nt0 duyệt sơ bộ 2026-07-19)

| Unit                                         | Bài                                                                                                                                                                                                              | Nguồn chất liệu                                                     |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| n1 Nguyên tử – Nguyên tố – Công thức hoá học | 1 Chất – hỗn hợp – tách chất; cấu tạo nguyên tử · 2 Nguyên tố hoá học; sơ lược bảng tuần hoàn · 3 Đơn chất – hợp chất – phân tử; CTHH · 4 Hoá trị; lập CTHH                                                      | a1-l1..l4 (quy đổi GDPT 2018)                                       |
| n2 Phản ứng hoá học                          | 1 Phản ứng hoá học; các loại phản ứng · 2 Mol – tỉ khối chất khí · 3 Dung dịch; độ tan · 4 Nồng độ C% – C_M; pha chế · 5 ĐLBTKL; PTHH · 6 Tính theo PTHH; chất dư – hiệu suất · 7 Tốc độ phản ứng – chất xúc tác | Chủ đề I + a4-l1..l3 + a1-l5..l7 + khái niệm loại phản ứng từ a2/a3 |
| n3 Acid                                      | 1 Khái niệm – phân loại – danh pháp · 2 Tính chất hoá học · 3 HCl, H2SO4; điều chế                                                                                                                               | Chủ đề II.I, Chương I + a6                                          |
| n4 Base                                      | 1 Khái niệm – phân loại – danh pháp · 2 Tính chất hoá học; CO2/SO2 + kiềm · 3 NaOH, Ca(OH)2; điều chế                                                                                                            | Chủ đề II.II, Chương I + a7                                         |
| n5 Oxide                                     | 1 Khái niệm – phân loại – danh pháp · 2 Tính chất oxide base/acid · 3 Oxide lưỡng tính/trung tính; điều chế                                                                                                      | Chủ đề II.III, Chương I + a5                                        |
| n6 Muối và Phân bón hoá học                  | 1 Khái niệm – danh pháp – tính tan – màu dung dịch; muối quan trọng · 2 Tính chất; trao đổi; muối acid/trung hoà · 3 Điều chế muối · 4 Phân bón hoá học                                                          | Chủ đề II.IV–V, Chương I + a8                                       |
| n7 Mối quan hệ giữa các hợp chất vô cơ       | 1 Sơ đồ phân loại; ma trận 16 phản ứng · 2 Chuỗi phản ứng; điều chế nhiều bước · 3 Nhận biết – tách – tinh chế · 4 Luyện tập tổng hợp vô cơ                                                                      | Chương I mục I+III + a9 + a12                                       |
| n8 Kim loại                                  | 1 Tính chất vật lí – hoá học · 2 Dãy hoạt động · 3 Nhôm – sắt · 4 Điều chế; hợp kim gang – thép · 5 Ăn mòn · 6 Nâng cao: kim loại + muối/acid                                                                    | Chương II + a10                                                     |
| n9 Phi kim                                   | 1 Tính chất chung · 2 Chlorine · 3 Carbon – silicon và hợp chất · 4 Bảng tuần hoàn: biến đổi tuần hoàn                                                                                                           | Chương III + a11                                                    |
| n10 Hiđrocacbon và nhiên liệu                | 1 Đại cương hữu cơ · 2 Alkane – methane · 3 Alkene – ethylene · 4 Alkyne – acetylene · 5 Arene – benzene · 6 Dầu mỏ – khí thiên nhiên – nhiên liệu; sự cháy · 7 Nâng cao: lập CTPT; đốt cháy                     | Chương IV + b1 + b2                                                 |
| n11 Dẫn xuất hiđrocacbon và polime           | 1 Ethylic alcohol · 2 Acetic acid; acid no đơn chức · 3 Ester – chất béo · 4 Carbohydrate · 5 Protein · 6 Polymer; chất dẻo – tơ – cao su · 7 Nâng cao: chuỗi chuyển hoá – nhận biết; lên men – ester hoá        | Chương V + b3 + b4 + b5-l1/l2                                       |

Nội dung cũ bỏ hẳn: a2-l1, a2-l3, a3-l1, a3-l2 (bài riêng oxi/hiđro/nước);
a1-l8, a1-l9; a4-l4, a4-l5 (giữ ý chính trong n2); b5-l3 (luyện đề do tính
năng thi thử đảm nhiệm).
