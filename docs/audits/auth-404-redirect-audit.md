# Rà soát: hai lỗi 404 trong luồng đăng nhập (xác nhận email & reset mật khẩu)

- Ngày rà soát: 2026-07-10
- Người rà soát: Claude Code
- Trạng thái: **Đã kiểm chứng bổ sung trên production — fix nằm ở
  FEATURE-010** (xem mục 10)
- Vùng ảnh hưởng: Auth (high-risk theo `CLAUDE.md`)

## 1. Triệu chứng người dùng báo

1. Người dùng bấm liên kết **xác nhận (active) email** → ra trang **404**.
2. Người dùng dùng **Quên mật khẩu**, bấm liên kết **reset** trong email
   → ra trang **404**.

## 2. Kết luận nhanh

Cả hai lỗi cùng một họ nguyên nhân: **liên kết trong email đưa trình
duyệt tới một URL mà GitHub Pages trả về 404**, do hai lỗ hổng cộng
hưởng — thiếu SPA fallback `404.html` và code không truyền URL chuyển
hướng nên phụ thuộc hoàn toàn vào cấu hình "Site URL" trên dashboard
Supabase.

## 3. Bối cảnh triển khai

- App deploy lên **GitHub Pages** tại đường dẫn con
  **`https://tuann2.github.io/Hoa_hoc_THCS/`**.
  - `.github/workflows/deploy.yml`: `VITE_BASE_PATH: /${{ github.event.repository.name }}/`
    → `/Hoa_hoc_THCS/`.
  - `vite.config.ts`: `base: process.env.VITE_BASE_PATH ?? '/'`.
- Định tuyến dùng **`BrowserRouter`** (history API), không phải
  `HashRouter`:
  - `src/main.tsx:9` → `<BrowserRouter basename={import.meta.env.BASE_URL}>`.
- **Không có** SPA fallback: không có `public/404.html`, không có bước
  build tạo `dist/404.html`, và **không có route catch-all** `path="*"`
  trong `src/App.tsx`.
- Git remote: `https://github.com/tuann2/Hoa_hoc_THCS.git`.
- Cổng dev mặc định Vite: `5173` (README dòng 45).

## 4. Nguyên nhân gốc

### Lỗ hổng 1 (Infra) — thiếu SPA fallback `404.html`

GitHub Pages là host tĩnh: URL nào không trùng một file thật sẽ trả 404. Vì dùng `BrowserRouter`, mọi **điều hướng cứng** (hard navigation
— tức trình duyệt tải lại nguyên trang, như khi bấm link trong email)
tới một đường dẫn sâu (ví dụ `/Hoa_hoc_THCS/auth`) đều 404 ngay ở tầng
server, **trước khi** React/Router kịp chạy để xử lý client-side.

Chỉ đúng đường dẫn gốc `/Hoa_hoc_THCS/` (map tới `index.html`) là được
phục vụ. Mọi route con chỉ hoạt động khi điều hướng nội bộ trong SPA
(soft navigation), không hoạt động khi vào trực tiếp/tải lại.

### Lỗ hổng 2 (Code) — không truyền URL chuyển hướng

`src/store/auth.ts`:

- `signUp()` (khoảng dòng 191–199) gọi `supabase.auth.signUp({ email,
password, options: { data: { display_name } } })` — **không có**
  `options.emailRedirectTo`.
- `resetPassword()` (khoảng dòng 300–302) gọi
  `supabase.auth.resetPasswordForEmail(email.trim())` — **không có**
  tham số thứ hai `{ redirectTo }`.

Hệ quả: đích đến sau khi bấm link email phụ thuộc **hoàn toàn** vào
"Site URL" cấu hình trên dashboard Supabase. Nếu Site URL đang là domain
gốc `https://tuann2.github.io` (thiếu `/Hoa_hoc_THCS/`), link email đưa
về `https://tuann2.github.io/...` → không có site nào ở gốc đó → **404**.
Đây đúng là điểm từng gây sự cố chuyển hướng sai về `localhost:3000`
trong FEATURE-006 (xem README phần "Thiết lập Supabase", dòng 40–50).

### Lỗ hổng 3 (UX phụ) — reset mật khẩu chỉ hiện form ở route `/auth`

Ngay cả khi vào được app, form "nhập mật khẩu mới" chỉ được render bên
trong `AuthRoute` khi `isPasswordRecovery === true`
(`src/routes/AuthRoute.tsx:36`, và điều kiện hiển thị dòng 160–226).
Cờ này được bật qua `detectPasswordRecoveryFromUrl()` (đọc `type=recovery`
trong hash/search) và sự kiện `PASSWORD_RECOVERY` của `onAuthStateChange`
(`src/store/auth.ts:60–69, 136–142`). Nhưng nếu link reset chuyển hướng
về `/` (HomeRoute) thay vì `/auth`, cờ vẫn bật mà **không có form nào
hiện ra** → người dùng mắc kẹt (dù không phải 404).

## 5. Vì sao mỗi lỗi ra đúng 404

- **Xác nhận email**: Supabase verify token rồi redirect (hard
  navigation) về Site URL kèm token ở hash (`#access_token=...&type=signup`).
  Nếu Site URL thiếu subpath `/Hoa_hoc_THCS/` → về gốc domain → 404
  (Lỗ hổng 2). Nếu Site URL/redirect trỏ tới route con mà không có
  `404.html` → 404 (Lỗ hổng 1).
- **Reset mật khẩu**: `resetPasswordForEmail` không có `redirectTo` →
  redirect_to = Site URL → cùng cơ chế 404 như trên.

## 6. Hướng sửa đề xuất (3 phần khớp nhau — cần cả 3)

### Phần A — Infra: thêm SPA fallback `404.html`

Thêm bước build tạo `dist/404.html` là bản sao của `dist/index.html`.
Vite chèn URL asset theo `base` nên bản sao 404.html tải đúng bundle;
khi GitHub Pages phục vụ `404.html` cho đường dẫn thiếu, thanh URL vẫn
giữ nguyên đường dẫn sâu → `BrowserRouter basename` định tuyến đúng, và
hash/query chứa token được giữ nguyên.

- Cách gọn nhất: một plugin Vite nhỏ dùng hook `writeBundle` copy
  `index.html` → `404.html` (không thêm dependency, chạy đa nền tảng).
  Đặt trong `vite.config.ts`.
- (Tuỳ chọn) Cân nhắc thêm route catch-all `path="*"` trong `App.tsx`
  để hiển thị màn "không tìm thấy" thân thiện cho các route sai
  client-side.

### Phần B — Code: truyền URL chuyển hướng tường minh

Trong `src/store/auth.ts`, thêm helper (guard `typeof window`):

```ts
function getAuthRedirectUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  // BASE_URL luôn kết thúc bằng '/'; prod -> /Hoa_hoc_THCS/, dev -> /
  return `${window.location.origin}${import.meta.env.BASE_URL}auth`;
}
```

- `signUp`: `options: { data: {...}, emailRedirectTo: getAuthRedirectUrl() }`.
- `resetPassword`: `supabase.auth.resetPasswordForEmail(email.trim(),
{ redirectTo: getAuthRedirectUrl() })`.

Kết quả: luôn về đúng `.../auth` trên đúng origin (prod hoặc dev), và
vá luôn Lỗ hổng 3 (reset về đúng route `/auth` để hiện form).

### Phần C — Config Supabase dashboard (chỉ người dùng làm được)

**Authentication → URL Configuration:**

- **Site URL**: `https://tuann2.github.io/Hoa_hoc_THCS/`
- **Redirect URLs** (thêm cả prod và dev):
  - `https://tuann2.github.io/Hoa_hoc_THCS/auth`
  - `https://tuann2.github.io/Hoa_hoc_THCS/**` (dự phòng)
  - `http://localhost:5173/auth`

Bắt buộc: nếu `redirectTo` (Phần B) không nằm trong allowlist Redirect
URLs, Supabase **âm thầm bỏ qua** nó và quay lại dùng Site URL → Phần B
vô hiệu. Vì vậy Phần C là điều kiện để Phần B có tác dụng.

> Lưu ý: người rà soát không truy cập được dashboard Supabase nên không
> xác nhận được giá trị Site URL hiện tại đang sai cụ thể ra sao. Tuy
> nhiên Phần A và B là lỗ hổng thật trong repo, cần vá bất kể giá trị
> hiện tại.

## 7. Kiểm thử sau khi sửa

- Build và kiểm tra `dist/404.html` tồn tại và giống `dist/index.html`.
- Test đơn vị (`tests/`): khẳng định `signUp` truyền `emailRedirectTo`
  và `resetPasswordForEmail` truyền `redirectTo` đúng dạng
  `${origin}${BASE_URL}auth` (mock `window.location`).
- Thủ công trên bản deploy thật:
  1. Đăng ký tài khoản mới → mở email → bấm xác nhận → phải vào
     `.../Hoa_hoc_THCS/auth` và đăng nhập được (không 404).
  2. Quên mật khẩu → mở email → bấm reset → phải vào `.../auth` và
     **thấy form nhập mật khẩu mới** (không 404, không kẹt ở trang chủ).
  3. Thử lại trên dev `http://localhost:5173` để xác nhận redirect
     origin-agnostic hoạt động.

## 8. Quy trình khi thực thi (theo CLAUDE.md)

- Vùng auth là high-risk → chạy **review chéo** (Codex + Gemini `agy`)
  trước khi commit.
- Không thêm dependency mới (plugin 404.html tự viết) → không kích hoạt
  cổng "New technology adoption".
- Tạo `docs/plans/FEATURE-0xx.md` khi bắt đầu thực thi; cập nhật README
  phần "Thiết lập Supabase" cho khớp Phần C.

## 9. File liên quan (tham chiếu nhanh)

- `src/store/auth.ts` — `signUp` (~191), `resetPassword` (~300),
  `detectPasswordRecoveryFromUrl` (~60), `onAuthStateChange` (~126).
- `src/routes/AuthRoute.tsx` — hiển thị form recovery (~36, ~160–226).
- `src/main.tsx:9` — `BrowserRouter basename`.
- `vite.config.ts` — `base` / nơi thêm plugin `404.html`.
- `.github/workflows/deploy.yml` — `VITE_BASE_PATH`, build GitHub Pages.
- `README.md` (~40–50) — hướng dẫn Site URL / Redirect URLs hiện có.

## 10. Kiểm chứng bổ sung trên production (2026-07-10, sau khi người dùng xác nhận dashboard đã cấu hình đúng từ trước)

Người dùng xác nhận Site URL + Redirect URLs trên dashboard Supabase
đã được đặt đúng (`https://tuann2.github.io/Hoa_hoc_THCS/`, kèm
`.../auth`, `.../**`, `http://localhost:5173/auth`) **từ trước khi lỗi
xuất hiện** → giả thuyết "Site URL sai" ở mục 4/Lỗ hổng 2 không phải
nguyên nhân kích hoạt. Kiểm chứng trực tiếp cho kết quả:

### Bằng chứng đo được trên hạ tầng thật

| Kiểm tra                                             | Kết quả                                                                                         |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `curl -I https://tuann2.github.io/Hoa_hoc_THCS/`     | **200** — site sống, bản deploy cuối 2026-07-06 15:33                                           |
| `curl -I https://tuann2.github.io/Hoa_hoc_THCS/auth` | **404** — body là trang "Page not found · GitHub Pages" mặc định                                |
| `curl -I .../Hoa_hoc_THCS/404.html`                  | **404 mặc định** — artifact đang deploy KHÔNG có `404.html`                                     |
| `gh api repos/tuann2/Hoa_hoc_THCS/pages`             | `build_type: "workflow"` — site phục vụ từ artifact GitHub Actions, không phải nhánh `gh-pages` |
| Nhánh `origin/gh-pages` (deploy cũ)                  | **CÓ `404.html`** (bản sao index.html), commit cuối `41d9b1d` 2026-07-05 "deploy: FEATURE-002"  |
| `git log -- .github/workflows/deploy.yml`            | Workflow deploy thêm ở `90522b9` 2026-07-05, hoàn thiện ở FEATURE-006 `11797c1` 2026-07-06      |

### Kết luận đã hiệu chỉnh: đây là REGRESSION khi đổi pipeline deploy

Dòng thời gian:

1. **Trước 2026-07-05**: deploy thủ công/cũ lên nhánh `gh-pages`,
   pipeline đó **có kèm `404.html`** làm SPA fallback → deep-link
   (kể cả link email đưa về route con) hoạt động bình thường, khớp
   với việc dashboard đã cấu hình đúng mà không gặp lỗi.
2. **2026-07-05/06**: chuyển sang deploy bằng GitHub Actions
   (`actions/deploy-pages` từ `dist/`). Bước tạo `404.html` **bị rơi
   mất** trong pipeline mới — `vite build` không tự sinh file này.
   Nhánh `gh-pages` (còn `404.html`) trở thành đồ thừa, bị bỏ qua vì
   Pages đã chuyển sang chế độ `workflow`.
3. **Từ bản deploy workflow đầu tiên**: mọi hard-navigation tới route
   con trả 404 mặc định của GitHub → hai lỗi người dùng báo xuất
   hiện, **dù dashboard Supabase đúng**.

Như vậy: Lỗ hổng 1 (thiếu `404.html` trong artifact) là **nguyên nhân
kích hoạt thực tế**; Lỗ hổng 2 (code không truyền `redirectTo`) vẫn là
lỗ hổng thật cần vá để không phụ thuộc cấu hình ngoài code, nhưng
không phải thứ làm lỗi bùng phát. Fix FEATURE-010 (plugin Vite tạo
`404.html` ngay trong build + `redirectTo` tường minh) vá đúng cả gốc
lẫn phòng thủ, và bền hơn cách cũ vì `404.html` giờ được sinh tự động
trong mọi bản build thay vì phụ thuộc thao tác deploy thủ công.

### Lưu ý khi kiểm thử lại

- **Fix chưa deploy** (còn nằm ở nhánh `feature/FEATURE-010` cục bộ).
  Production hiện tại vẫn 404 với deep-link — kiểm thử lại trước khi
  merge + deploy sẽ vẫn thấy lỗi, không có nghĩa fix sai.
- Với bản production hiện tại (chưa có `redirectTo`): link reset đưa
  về Site URL gốc (`/`) — trang chủ nạp được (không 404) nhưng form
  "nhập mật khẩu mới" chỉ hiển thị ở `/auth` → người dùng kẹt im lặng
  (Lỗ hổng 3). Sau khi deploy fix, link sẽ về thẳng `/auth`.
- Phân biệt chữ ký lỗi khi test: trang "Page not found · GitHub Pages"
  = thiếu SPA fallback (đã vá); còn bị đưa về app kèm
  `#error=access_denied&error_code=otp_expired` = token đã bị email
  client prefetch tiêu mất (hiện tượng đã ghi nhận ở FEATURE-006,
  không liên quan fix này) — cần gửi lại email mới và bấm link nhanh.
- Nhánh `gh-pages` giờ là tàn dư của pipeline cũ, không còn được
  phục vụ — cân nhắc xoá để tránh nhầm lẫn về sau (cần người dùng
  quyết định).
