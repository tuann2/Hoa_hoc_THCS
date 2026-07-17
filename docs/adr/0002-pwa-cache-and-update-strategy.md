# ADR-0002: PWA cache và chiến lược cập nhật

## Status

Accepted — FEATURE-014, 2026-07-16

## Context

Ứng dụng là SPA tĩnh chạy trên localhost và GitHub Pages subpath. Người học
cần cài app và học toàn bộ nội dung đã tải khi mất mạng, nhưng service worker
không được lưu hoặc phục vụ token, session, tiến độ hay response Supabase.
Một worker mới cũng không được reload giữa lesson hoặc exam.

## Decision

Sử dụng `vite-plugin-pwa@1.3.0` với Workbox generateSW. Vite precache các
asset tĩnh same-origin có hash, catalog, route chunks và content chunks;
không cấu hình runtime cache cho Supabase hoặc request có credential.
Manifest lấy base path từ `VITE_BASE_PATH`, có icon 192, 512 và maskable.

Đăng ký worker ở chế độ `prompt`: worker mới chờ, UI báo “Có phiên bản mới”
và chỉ gọi update sau khi người dùng bấm nút. Không dùng `skipWaiting` hoặc
reload tự động. Trạng thái offline-ready chỉ được phát sau
`onOfflineReady`/service-worker readiness; trước đó UI nói rõ đang chuẩn bị.

## Alternatives considered

- Service worker viết tay: loại vì lifecycle/cache invalidation dễ tạo stale
  asset hoặc cache nhầm request.
- Không làm PWA: không đáp ứng mục tiêu P0 offline.
- Capacitor/native wrapper: vượt phạm vi static web app và app store.

## Consequences

Ưu điểm là manifest/precache hash và lifecycle được Workbox quản lý, đồng
thời code runtime không có quyền sở hữu user data. Đổi lại build/deploy phải
giữ các asset hashed đủ lâu cho worker cũ, CI phải chạy browser offline và
update tests, và GitHub Pages base path phải được kiểm tra riêng.
