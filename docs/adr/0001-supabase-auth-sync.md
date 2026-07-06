# ADR-0001: Dùng Supabase free tier cho Auth và đồng bộ tiến độ

- Status: ACCEPTED
- Date: 2026-07-05
- Related feature: FEATURE-006

## Context

App Hoá học THCS là một SPA tĩnh (Vite + React + TypeScript), deploy
trên GitHub Pages, không có server riêng. Trước FEATURE-006, tiến độ
học (XP, streak, sao, bài đã mở khoá) chỉ lưu trong `localStorage` của
trình duyệt — học sinh đổi thiết bị hoặc xoá dữ liệu trình duyệt là
mất toàn bộ tiến độ.

Yêu cầu đặt ra: cho học sinh đăng nhập bằng email + mật khẩu để xác
định danh tính và đồng bộ tiến độ giữa nhiều thiết bị, mà **không**
được thêm chi phí vận hành server, không được lộ credentials nhạy cảm
trong client, và phải giữ nguyên khả năng học offline-only khi chưa
đăng nhập hoặc chưa cấu hình backend.

## Decision

Dùng **Supabase free tier** làm backend duy nhất:

- **Auth**: Supabase Auth quản lý `auth.users` (email + mật khẩu, xác
  nhận email, reset mật khẩu có sẵn), không tự viết cơ chế xác thực.
- **Lưu trữ**: Postgres của Supabase, bảng `public.profiles` (tên hiển
  thị) và `public.progress` (JSONB tiến độ), gọi trực tiếp từ client
  qua `@supabase/supabase-js` — không có API trung gian tự viết.
- **Bảo vệ dữ liệu**: Row Level Security (RLS) trên cả hai bảng, mỗi
  user chỉ đọc/ghi được hàng của chính mình (`auth.uid()`); anon key
  công khai trong bundle client là chấp nhận được vì RLS mới là lớp
  bảo vệ thật sự, không phải việc giấu key.
- **Offline-first**: khi thiếu env (`VITE_SUPABASE_URL`/
  `VITE_SUPABASE_ANON_KEY`) hoặc mất mạng, app rơi về chế độ
  local-only, không crash, không ép đăng nhập.

## Alternatives considered

| Phương án                                                             | Ưu điểm                                                    | Nhược điểm                                                                                                                                                                                          | Lý do loại                                                                                                       |
| --------------------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Tự dựng backend riêng (Node/Express + Postgres, host trên VPS/Render) | Toàn quyền kiểm soát logic và schema                       | Tốn chi phí vận hành + bảo trì liên tục; phải tự viết auth, migration, RLS-tương-đương; vượt quá nhu cầu của một app tiến độ học đơn giản                                                           | Chi phí/độ phức tạp vận hành không tương xứng với lợi ích cho một SPA tĩnh miễn phí                              |
| AWS S3 (lưu file JSON tiến độ theo user)                              | Rẻ, đơn giản để lưu blob                                   | Không có auth per-user gắn liền; phải tự dựng cơ chế xác thực + ký URL truy cập, hoặc lộ credentials AWS trong client nếu gọi trực tiếp; không có RLS tương đương ở mức hàng dữ liệu                | Không có auth per-user sẵn có — buộc phải lộ credentials hoặc dựng thêm API trung gian, đúng vấn đề cần tránh    |
| Firebase (Auth + Firestore)                                           | Tương tự Supabase về mô hình BaaS, có auth per-user sẵn có | Vendor khác hệ sinh thái Postgres/SQL mà dự án ưu tiên (dễ viết migration SQL tường minh, RLS chuẩn Postgres); phần lớn tính năng free tier tương đương Supabase nên không có lợi thế rõ rệt để đổi | Không có ưu thế đủ lớn để chọn thay Supabase; Supabase cho phép viết RLS/migration bằng SQL chuẩn, dễ review hơn |

## Consequences

- App vẫn là SPA tĩnh 100%, không cần server riêng, giữ nguyên mô hình
  deploy GitHub Pages hiện có.
- Toàn bộ bảo mật dữ liệu người dùng phụ thuộc vào RLS được viết đúng
  — mọi thay đổi RLS bắt buộc phải qua adversarial review (đã ghi trong
  `CLAUDE.md` mục "High-risk changes requiring dual-agent review").
- Phụ thuộc vào Supabase free tier: có giới hạn (số lượng user, băng
  thông, thời gian tồn tại dự án miễn phí) — nếu vượt giới hạn free
  tier trong tương lai cần đánh giá lại (nâng cấp gói trả phí hoặc
  cân nhắc lại kiến trúc).
- Việc merge tiến độ giữa local và server (offline-first) là logic tự
  viết, không phải tính năng có sẵn của Supabase — rủi ro logic riêng
  (đã phát sinh và được sửa ở FEATURE-007, xem
  `docs/handoffs/FEATURE-007-implementation.md`).
