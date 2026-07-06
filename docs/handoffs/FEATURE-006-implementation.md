# FEATURE-006 Implementation Handoff

## Status

COMPLETED

## 1. Summary

Triển khai đăng ký/đăng nhập email + mật khẩu, reset và đặt lại mật khẩu,
hiển thị người học trong UI, đồng bộ tiến độ localStorage ↔ Supabase bằng
merge offline-first, migration SQL/RLS, env + workflow build wiring và
test cho auth/progress sync.

### Post-review fixes

- Sửa merge streak để không làm mất `streakCurrent` khi hai bên có cùng
  `lastStudyDate`, và luôn giữ `streakLongest` lịch sử cao nhất.
- Bổ sung flow đặt mật khẩu mới sau email khôi phục bằng
  `supabase.auth.updateUser({ password })` và UI "Nhập mật khẩu mới".
- Chặn lộ thông báo lỗi kỹ thuật bằng fallback tiếng Việt chung cho auth.

## 2. Files changed

| File | Change |
| --- | --- |
| `supabase/migrations/0001_init.sql` | Tạo schema `profiles` / `progress`, trigger tạo profile, RLS policies |
| `src/lib/supabase.ts` | Official `@supabase/supabase-js` client với offline fallback khi thiếu env |
| `src/lib/progressSync.ts` | Pull/merge/push tiến độ, debounce push, sync khi đăng nhập, sửa merge streak |
| `src/store/auth.ts` | Zustand auth store, initialize, sign up/in/out, reset password, update password sau recovery |
| `src/store/progress.ts` | Export snapshot helpers, source tracking cho sync subscription |
| `src/routes/AuthRoute.tsx` | UI đăng nhập / tạo tài khoản / quên mật khẩu / nhập mật khẩu mới |
| `src/routes/ProfileRoute.tsx` | Hiển thị tên/email, CTA login, đăng xuất, trạng thái sync |
| `src/App.tsx` | Route `/auth`, header auth state, bootstrap auth + sync |
| `.env.example` | Mẫu env Supabase |
| `tests/lib/progress-sync.test.ts` | Test merge logic, malformed server data, debounce push, edge case streak |
| `tests/store/auth.test.ts` | Test auth store với mock Supabase, gồm update password |
| `package.json` | Thêm dependency Supabase |
| `.github/workflows/ci.yml` | Inject env giả để build CI |
| `.github/workflows/deploy.yml` | Inject env từ GitHub Secrets khi deploy |
| `README.md` | Hướng dẫn thiết lập Supabase và ghi chú quyền riêng tư |
| `CHANGELOG.md` | Ghi nhận FEATURE-006 |
| `docs/handoffs/FEATURE-006-implementation.md` | Handoff này |

## 3. Design decisions

- Giữ localStorage là nguồn chạy chính; server chỉ là bản sao đồng bộ để
  app vẫn dùng được khi thiếu env hoặc mất mạng.
- Merge tiến độ theo nguyên tắc không mất thành tích: max theo lesson,
  union bài mở khoá, streak lấy theo bản có `lastStudyDate` mới hơn.
- Dùng trực tiếp `@supabase/supabase-js` như plan yêu cầu; wrapper cục bộ chỉ
  còn nhiệm vụ khởi tạo client và fallback `null` khi thiếu env để app không crash.

## 4. Deviations from the approved plan

- None

## 5. Commands executed

```bash
npm run validate-content
npm test
npm run lint
npm run typecheck
npm run build
```

Re-run độc lập bởi Claude Code (ngoài sandbox của Codex) sau khi sửa dùng SDK
thật — toàn bộ 5 lệnh PASS trực tiếp, không cần workaround.

## 6. Validation results

| Check | Result |
| --- | --- |
| `npm run validate-content` | PASS (17 unit, không lỗi schema/nội dung) |
| `npm test` | PASS (7 file, 28 test) |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |

## 7. Known limitations

- Chưa có realtime sync giữa hai tab / hai thiết bị đang mở đồng thời.
- Trong sandbox riêng của Codex, `tsx scripts/validate-content.ts` từng báo lỗi
  `listen EPERM` khi tạo IPC pipe ở `/tmp` (giới hạn của sandbox đó, không phải
  lỗi thật); Claude Code đã verify độc lập ngoài sandbox và cả 5 lệnh đều pass.

## 8. Remaining risks

- RLS cần được kiểm tra thủ công bằng anon key + JWT thật sau khi migration
  được chạy trên project Supabase.

## 9. Follow-up work

- Chạy adversarial review đúng checklist của plan: RLS bypass, merge ảo XP,
  xác nhận bundle không chứa `service_role`.
- Thêm component test cho `AuthRoute` nếu muốn khóa chặt thông báo/điều hướng UI.
