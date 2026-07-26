# Changelog

All notable changes to this project will be documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Initial project scaffold with AI workflow instruction files (2026-07-04).
- `FEATURE-001` MVP web app với Vite/React/TypeScript/Tailwind, lộ trình học, lesson flow, quiz engine, store tiến độ, content A6/A8, test và CI (2026-07-04).
- `FEATURE-001` deploy GitHub Pages (branch `gh-pages`) tại https://tuann2.github.io/Hoa_hoc_THCS/; câu HSG A6/A8 gắn nguồn trung thực và sửa 3 lỗi nội dung (2026-07-05).
- `FEATURE-002` biên soạn đầy đủ 3 unit cụm vô cơ: A5 Oxit (4 bài), A7 Bazơ (5 bài), A9 Mối quan hệ giữa các hợp chất vô cơ (4 bài) — 39 thẻ lý thuyết, 169 câu hỏi 3 mức có lời giải từng bước (2026-07-05).
- `FEATURE-003` biên soạn đầy đủ nốt Đợt 2: A1 Nền tảng hoá học (9 bài) và A4 Dung dịch (5 bài) — 42 thẻ lý thuyết, 182 câu hỏi 3 mức có lời giải từng bước; hoàn tất toàn bộ Đợt 2 (A1, A4, A5, A7, A9) (2026-07-05).
- `FEATURE-004` biên soạn đầy đủ Đợt 3 — phần còn lại Vô cơ: A2 Oxi-Không khí (3 bài), A3 Hiđro-Nước (4 bài), A10 Kim loại (5 bài), A11 Phi kim (5 bài), A12 Chuyên đề tổng hợp Vô cơ (4 bài) — 63 thẻ lý thuyết, 273 câu hỏi 3 mức có lời giải từng bước; **hoàn tất toàn bộ phần Vô cơ A1–A12**. A12 do Codex biên soạn (lần đầu delegate thành công), Claude review độc lập (2026-07-05).
- `FEATURE-005` biên soạn đầy đủ Đợt 4 — toàn bộ Hữu cơ: B1 Đại cương hữu cơ (3 bài), B2 Hiđrocacbon-Nhiên liệu (6 bài), B3 Dẫn xuất chứa oxi (5 bài), B4 Gluxit-Protein-Polime (6 bài), B5 Chuyên đề tổng hợp Hữu cơ (3 bài) — 69 thẻ lý thuyết, 299 câu hỏi 3 mức có lời giải từng bước; **hoàn tất toàn bộ CONTENT_OUTLINE.md (A1–A12, B1–B5)**. Toàn bộ B1–B5 do Codex biên soạn, Claude review validate độc lập (2026-07-05).
- `FEATURE-006` thêm đăng ký/đăng nhập email + mật khẩu, reset mật khẩu, hiển thị tên người học, đồng bộ tiến độ localStorage ↔ Supabase bằng merge offline-first, migration SQL + workflow env + test auth/sync (2026-07-05).
- `FEATURE-007` thêm danh sách câu sai cần ôn (`wrongQuestions`), route `/review`, badge số câu cần ôn ở header/hồ sơ, đồng bộ Supabase cho câu sai và test merge/review route tương ứng (2026-07-06).
- `FEATURE-008` thêm chế độ thi thử `/exam`: tạo đề theo phạm vi Vô cơ/Hữu cơ/chuyên đề, rút câu có seed theo tỉ lệ mục tiêu 40/40/20, đếm ngược tự nộp khi hết giờ, lưu `examHistory` đồng bộ với Supabase, hiển thị kết quả theo mức độ và lịch sử thi gần nhất trong hồ sơ (2026-07-06).
- `FEATURE-009` tách mỗi bài học thành hai chế độ chọn ngay từ trang chủ — "Lý thuyết" (chỉ đọc thẻ) và "Giải bài tập" (chỉ làm quiz) — thay cho luồng tuần tự bắt buộc; thêm nút Thoát phiên có xác nhận ở màn hình học, thi thử và ôn câu sai (2026-07-10).
- `FEATURE-011` định nghĩa lại hai chế độ theo **bản chất câu hỏi** thay vì theo loại nội dung: gắn trường `category` (`theory` / `calculation`) cho 1053 câu hỏi, "Lý thuyết" = thẻ + câu định tính, "Bài tập" = câu tính toán; tiến độ ghi nhận riêng cho từng phần (2026-07-10).
- `FEATURE-012` đào sâu nội dung lý thuyết nâng cao cho toàn bộ bài học A1–B5: nâng trần số thẻ mỗi bài từ 5 lên 25 (linh hoạt), quy trình hai phase — Phase A soạn mở rộng, Phase B fact-check độc lập rồi sửa theo review; nội dung ứng viên chưa dùng lưu vào `docs/content-reserve/` (2026-07-10 → 2026-07-12).
- `FEATURE-014` tối ưu tải và offline: code splitting theo unit, PWA cài đặt được với precache hashed + cập nhật theo prompt (`vite-plugin-pwa@1.3.0` + Workbox, Supabase giữ network-only), bộ E2E Playwright gồm kịch bản offline và deploy subpath; qua 4 candidate và 3 vòng independent/adversarial review (2026-07-17).
- `FEATURE-015` xây lại toàn bộ danh mục theo tài liệu chuẩn hoá và danh pháp GDPT 2018 (Mức 2): 11 unit `n1`–`n11`, 52 bài học, 708 câu hỏi; quy đổi thể tích mol khí 22,4 L/mol (đktc) → 24,79 L/mol (đkc, 25 °C, 1 bar) trên toàn bộ nội dung; migration tiến độ người học lên `PROGRESS_VERSION=5` (localStorage + Supabase); nội dung danh mục A/B cũ chuyển vào `docs/content-reserve/feature-015/legacy-units/` (2026-07-19 → 2026-07-20).
- `FEATURE-016` thêm khu vực admin xem tiến độ, chất lượng và thời gian học của từng học viên: migration `0002` + RLS + RPC `security definer` (kèm script rollback), quyền `isAdmin` fail-closed gắn với phiên đăng nhập, heartbeat đo thời gian học, các route báo cáo chỉ đọc; đã áp migration production và smoke test PASS (2026-07-25).

### Changed

- `WORKFLOW-002` chuyển quy trình AI sang `docs/architecture/AI_WORKFLOW_ARCHITECTURE.md` v2.1 làm nguồn chuẩn (2026-07-11).
- `WORKFLOW-003` sửa đổi kiến trúc v2.1 → v2.2 sau rà soát toàn bộ corpus (hiệu chỉnh phần chi phí token) (2026-07-13).
- `WORKFLOW-004A` cơ giới hoá quality gate: `scripts/gates-manifest.ts`, classifier theo đường dẫn thay đổi, `check-docs`, gates runner và evidence gắn đúng snapshot; CI chuyển sang chạy gate theo profile, deploy chỉ nhận candidate SHA đã pass CI; kiến trúc v2.3 (2026-07-19).
- `WORKFLOW-004B` chuyển governance sang provider-neutral: role contract trong `docs/roles/`, execution envelope bắt buộc, context policy `docs/CONTEXT_RULES.md`; kiến trúc v2.4 (2026-07-19).
- `WORKFLOW-004C` cưỡng chế tier TRIVIAL bằng máy: `classify-trivial` / `trivial-policy` / `npm run trace:trivial`, trace append-only và job CI `trivial-verify` bác bỏ khai báo TRIVIAL sai; kèm baseline đo token 8 kịch bản (2026-07-19).
- `WORKFLOW-005` kiến trúc v2.5 — đóng self-reference cũ còn trỏ tới WORKFLOW-004C (2026-07-26).
- `WORKFLOW-006` rà soát nguyên nhân input token cao và dọn drift giữa các nhánh (2026-07-26).
- `WORKFLOW-007` thêm gate CI `branch-context-drift` cảnh báo khi context bắt buộc của nhánh đã lệch so với base (warn-only, không chặn PR) (2026-07-26).

### Removed

- `WORKFLOW-008` xoá 17 file nội dung danh mục A/B cũ dưới `docs/content-reserve/feature-015/legacy-units/` (1,4 MB) — đây là nguồn tham chiếu cho các vòng R2–R4 của FEATURE-015, đã hết vai trò khi danh mục `n1`–`n11` hoàn tất. Nội dung vẫn truy hồi được từ git history (2026-07-26).

### Fixed

- `FEATURE-010` sửa lỗi 404 khi bấm liên kết xác nhận email / đặt lại mật khẩu do Supabase gửi: cả hai luồng nay vào đúng màn hình `/auth` trên bản deploy GitHub Pages lẫn dev cục bộ (2026-07-10).

### Security

- `FEATURE-013` vá các advisory dependency (bao gồm nâng Vite lên 6.4.3) và bổ sung gate `npm audit`, `check:licenses`, `format:check` vào CI (2026-07-14).
- Vá `fast-uri` và `brace-expansion` (qua `eslint` / `vite-plugin-pwa`), nâng `react-router-dom` lên 7.18.1 để đóng lỗ hổng open redirect; thêm cơ chế allowlist có thời hạn cho gate `dependency-audit` (2026-07-25).
