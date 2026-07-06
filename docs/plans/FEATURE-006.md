# FEATURE-006: Đăng nhập và đồng bộ tiến độ lên server (Supabase)

## Status

- Status: APPROVED
- Owner: Claude Code
- Approved by: tuann2
- Approved date: 2026-07-05

## 1. Objective

Cho phép học sinh đăng nhập bằng **email + mật khẩu** để:

1. Xác định tên người học (hiển thị trong app).
2. Lưu tiến độ học (XP, streak, sao, bài đã mở khoá) lên **server
   storage** thay vì chỉ localStorage — học trên nhiều thiết bị không
   mất tiến độ.

Backend dùng **Supabase free tier** (quyết định đã chốt với người
duyệt: không dùng S3 vì S3 không có auth per-user, phải lộ credentials
hoặc dựng thêm API trung gian). App vẫn là SPA tĩnh trên GitHub Pages,
gọi Supabase trực tiếp qua `@supabase/supabase-js`; **không có server
riêng**.

## 2. Current system analysis

- App SPA Vite + React + TS, không backend; tiến độ lưu localStorage
  qua zustand `persist` (`src/store/progress.ts`, key
  `hhthcs-progress`, version 1).
- `ProgressState`: `totalXp`, `streakCurrent`, `streakLongest`,
  `lastStudyDate`, `lessonProgress` (map lessonId → sao/độ chính
  xác/XP), `unlockedLessonIds`.
- Không có khái niệm user; `ProfileRoute` chỉ hiển thị số liệu local.
- Deploy GitHub Pages qua `.github/workflows/deploy.yml`.

## 3. Assumptions

- Người duyệt tự tạo project Supabase (free tier), cung cấp
  `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` qua GitHub Secrets
  (deploy) và `.env.local` (dev). Không có giá trị nào trong repo.
- Anon key là public-by-design; bảo vệ dữ liệu bằng Row Level
  Security, không dựa vào việc giấu key. `service_role` key không bao
  giờ xuất hiện ở client/repo.
- Đăng nhập là **tuỳ chọn**: chưa đăng nhập thì app hoạt động như hiện
  tại (localStorage). Không chặn tính năng nào sau login-wall.
- Email học sinh có thật để nhận email xác nhận/reset mật khẩu
  (dùng email template mặc định của Supabase, có thể Việt hoá sau).

## 4. Scope

### 4.1. Supabase schema (SQL migration trong repo)

- `public.profiles`: `id uuid PK` (FK `auth.users`, on delete
  cascade), `display_name text not null`, `created_at timestamptz`.
  Tạo tự động khi đăng ký (trigger `on_auth_user_created`).
- `public.progress`: `user_id uuid PK` (FK `auth.users`),
  `data jsonb not null`, `version int not null`,
  `updated_at timestamptz not null`.
- RLS bật trên cả 2 bảng; policy: user chỉ
  `select / insert / update` hàng có `id`/`user_id` = `auth.uid()`.
  Không có policy `delete` (xoá qua cascade khi xoá tài khoản).

### 4.2. Client

- `src/lib/supabase.ts`: khởi tạo client từ env; nếu env thiếu →
  export `null` và app chạy chế độ offline-only (không crash).
- `src/store/auth.ts` (zustand): session, user, displayName, các
  action `signUp(email, password, displayName)`, `signIn`, `signOut`,
  `resetPassword`; lắng nghe `onAuthStateChange`.
- `src/lib/progressSync.ts`:
  - `pullProgress()` / `pushProgress()` đọc/ghi bảng `progress`.
  - `mergeProgress(local, server)`: per-lesson lấy max
    (`stars`, `bestAccuracy`, `bestXp`, `completed` OR); `totalXp`
    tính lại từ tổng `bestXp` sau merge; `unlockedLessonIds` = union;
    streak/`lastStudyDate` lấy theo bản có `lastStudyDate` mới hơn.
  - Khi đăng nhập: pull → merge → ghi cả localStorage lẫn server.
  - Sau mỗi `completeLesson`/`reset`: push lên server (debounce ~2s);
    thất bại (offline) thì bỏ qua, lần push sau ghi đè bằng bản merge
    mới nhất.
- UI:
  - Route `/auth`: form đăng ký (tên hiển thị + email + mật khẩu),
    đăng nhập, quên mật khẩu — toàn bộ tiếng Việt, mobile-first.
  - `ProfileRoute`: hiện tên người học + email + nút đăng xuất; nút
    "Đăng nhập để lưu tiến độ" khi chưa đăng nhập.
  - Header (App): trạng thái đăng nhập gọn (tên/nút đăng nhập).

### 4.3. Hạ tầng

- `supabase/migrations/0001_init.sql` (schema + trigger + RLS) — chạy
  thủ công trong Supabase SQL editor (chưa cần supabase CLI).
- `.env.example`; README mục "Thiết lập Supabase".
- `deploy.yml` + `ci.yml`: inject 2 env từ GitHub Secrets khi build
  (CI dùng giá trị giả để build không cần secrets thật).

## 5. Out of scope

- Đăng nhập Google/OAuth; đổi email; xoá tài khoản tự phục vụ.
- Realtime sync giữa 2 thiết bị đang mở đồng thời.
- Leaderboard, so sánh giữa các user, vai trò giáo viên/admin.
- Việt hoá email template Supabase (làm thủ công sau nếu cần).
- Ôn câu sai (FEATURE-007), thi thử (FEATURE-008).

## 6. Proposed design

```text
Browser (GitHub Pages SPA)
├── zustand progress store ↔ localStorage   (như hiện tại, offline-first)
├── zustand auth store ↔ supabase-js Auth   (session tự persist)
└── progressSync: login → pull+merge; completeLesson → debounce push
                                  │
                        Supabase (free tier)
                        ├── auth.users            (danh sách user)
                        ├── public.profiles (RLS) (tên hiển thị)
                        └── public.progress (RLS) (data jsonb, version)
```

Nguyên tắc: localStorage là nguồn chạy app; server là bản sao đồng
bộ. Merge thiên về "không mất thành tích" (lấy max/union). `version`
trong bảng `progress` = `PROGRESS_VERSION` để migrate sau này.

## 7. Files to create

- `supabase/migrations/0001_init.sql`
- `src/lib/supabase.ts`
- `src/lib/progressSync.ts`
- `src/store/auth.ts`
- `src/routes/AuthRoute.tsx`
- `.env.example`
- `tests/lib/progress-sync.test.ts` (merge logic)
- `tests/store/auth.test.ts` (mock supabase client)

## 8. Files to modify

- `src/store/progress.ts` (export helper cho sync; subscribe push)
- `src/App.tsx` (route `/auth`, header auth state)
- `src/routes/ProfileRoute.tsx` (tên người học, đăng xuất)
- `package.json` (`@supabase/supabase-js`)
- `.github/workflows/deploy.yml`, `.github/workflows/ci.yml` (env)
- `README.md`, `CHANGELOG.md`

## 9. API and database impact

- DB mới trên Supabase: 2 bảng + 1 trigger + RLS policies (migration
  SQL ở mục 4.1). Không đổi schema localStorage (version giữ 1).
- Không có API tự viết; toàn bộ qua PostgREST/Auth của Supabase.

## 10. Implementation steps

1. Người duyệt tạo project Supabase, chạy `0001_init.sql`, đặt
   secrets (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
2. Codex lượt 1: migration SQL + `supabase.ts` + `auth.ts` +
   `AuthRoute` + test auth (mock).
3. Codex lượt 2: `progressSync.ts` (pull/merge/push) + tích hợp store
   - Profile/header UI + test merge.
4. Gemini: `.env.example`, README, CHANGELOG.
5. Claude: validate độc lập (lint/typecheck/test/build), inspect diff.
6. **Adversarial review** (bắt buộc — auth): RLS bypass, lộ
   service_role, XSS qua display_name, merge làm mất/tăng ảo tiến độ.
7. Handoff `docs/handoffs/FEATURE-006-implementation.md`; xin duyệt merge.

## 11. Test strategy

- **Unit:** `mergeProgress` (local mới hơn / server mới hơn / lệch
  từng lesson / một bên rỗng / dữ liệu hỏng); debounce push; store
  auth với supabase mock (đăng ký/đăng nhập/đăng xuất/lỗi mạng).
- **Component:** AuthRoute — validate form, thông báo lỗi tiếng Việt,
  điều hướng sau đăng nhập.
- **Regression:** toàn bộ test hiện có pass; app không có env Supabase
  vẫn chạy đủ tính năng cũ.
- **Negative:** sai mật khẩu, email đã tồn tại, mất mạng khi push
  (không crash, không mất dữ liệu local), JSON `data` trên server hỏng
  → bỏ qua bản server, giữ local.
- **Manual (2 trình duyệt):** học máy A → đăng nhập máy B thấy đúng
  tiến độ; dùng anon key gọi REST đọc `progress` của user khác → RLS
  chặn (0 rows).

## 12. Security considerations

- Đối tượng là trẻ em: chỉ thu thập email + tên hiển thị, không
  analytics; nêu rõ trong README.
- RLS là lớp bảo vệ duy nhất phía dữ liệu → policy phải được
  adversarial review; test thủ công truy cập chéo user.
- Anon key/URL nằm trong bundle là chấp nhận được; cấm mọi giá trị
  secrets thật trong repo; `.env.local` đã nằm trong `.gitignore`
  (kiểm tra lại, bổ sung nếu thiếu).
- Mật khẩu tối thiểu 8 ký tự (cấu hình Supabase Auth mặc định 6 →
  nâng lên 8); rate limit đăng ký/đăng nhập dùng mặc định Supabase.
- `display_name` render qua React (auto-escape), không `innerHTML`;
  giới hạn độ dài 50 ký tự cả client lẫn CHECK constraint trong DB.

## 13. Risks

| Risk                                                        | Impact     | Mitigation                                                                                      |
| ----------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------- |
| RLS policy sai → đọc/ghi chéo tiến độ user khác             | Cao        | Adversarial review bắt buộc; test thủ công truy cập chéo bằng anon key; policy chỉ `auth.uid()` |
| Merge sai làm mất hoặc tăng ảo tiến độ                      | Trung bình | Merge thuần hàm, test unit dày; nguyên tắc max/union "không mất thành tích"                     |
| Supabase free tier pause project sau 7 ngày không hoạt động | Trung bình | App offline-first vẫn chạy; README ghi cách resume; cân nhắc cron ping sau                      |
| Email xác nhận vào spam / học sinh không nhận được          | Thấp       | Cho phép dùng app không cần login; hướng dẫn trong UI; có nút gửi lại email                     |
| Env thiếu khi build Pages → app trắng                       | Thấp       | `supabase.ts` fallback offline-mode; CI build với env giả để bắt lỗi sớm                        |

## 14. Rollback plan

- Client: revert commit + redeploy Pages; app quay về
  localStorage-only, không mất dữ liệu local của học sinh.
- DB: bảng `profiles`/`progress` giữ nguyên không ảnh hưởng gì khi
  client cũ chạy; nếu cần bỏ hẳn thì disable signup trong Supabase
  dashboard rồi drop bảng (có backup export trước).
- Không đổi version localStorage nên không cần migrate ngược.

## 15. Acceptance criteria

- [ ] Đăng ký (tên + email + mật khẩu ≥ 8 ký tự), xác nhận email, đăng nhập, quên mật khẩu, đăng xuất — toàn bộ UI tiếng Việt, chạy tốt viewport 375px.
- [ ] Học 1 bài trên trình duyệt A, đăng nhập trình duyệt B → thấy đúng XP/sao/bài mở khoá; học tiếp trên B rồi quay lại A → merge không mất thành tích.
- [ ] Chưa đăng nhập hoặc thiếu env Supabase: app hoạt động đầy đủ như trước (regression 0).
- [ ] Gọi REST bằng anon key không kèm JWT user → không đọc/ghi được bất kỳ hàng `progress`/`profiles` nào; kèm JWT user A → không đọc được hàng của user B.
- [ ] Không có secrets thật trong repo; bundle build không chứa service_role key.
- [ ] `npm run validate-content && npm run lint && npm run typecheck && npm test && npm run build` pass; CI xanh.
- [ ] Adversarial review hoàn tất, các phát hiện đã xử lý; handoff đầy đủ.
