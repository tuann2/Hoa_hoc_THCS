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
