# FEATURE-010: Sửa lỗi 404 khi xác nhận email và reset mật khẩu

## Status

- Status: APPROVED <!-- DRAFT | APPROVED | SUPERSEDED -->
- Owner: Claude Code
- Approved by: tuann2
- Approved date: 2026-07-10

## 1. Objective

Người dùng bấm liên kết **xác nhận email** hoặc liên kết **đặt lại mật
khẩu** trong email do Supabase gửi hiện ra trang 404 trên GitHub Pages
thay vì vào đúng màn hình `/auth` của app. Fix để cả hai luồng đưa
người dùng về đúng `.../Hoa_hoc_THCS/auth` và hiển thị đúng form (đăng
nhập thành công / nhập mật khẩu mới), trên cả bản deploy production
lẫn dev cục bộ.

Toàn bộ phân tích gốc đã được ghi lại ở
`docs/audits/auth-404-redirect-audit.md` (rà soát ngày 2026-07-10) —
kế hoạch này hiện thực hoá hướng sửa đã đề xuất ở đó.

## 2. Current system analysis

- App deploy GitHub Pages tại subpath `https://tuann2.github.io/Hoa_hoc_THCS/`
  (`.github/workflows/deploy.yml`: `VITE_BASE_PATH: /${{ github.event.repository.name }}/`,
  `vite.config.ts`: `base: process.env.VITE_BASE_PATH ?? '/'`).
- Định tuyến dùng `BrowserRouter` (`src/main.tsx:9`,
  `basename={import.meta.env.BASE_URL}`) — history API, không phải hash
  router.
- **Không có SPA fallback**: không có `public/404.html`, không có bước
  build tạo `dist/404.html`. GitHub Pages là host tĩnh — bất kỳ URL nào
  không khớp file thật sẽ trả 404 ngay ở tầng server, trước khi
  React/Router kịp chạy. Điều hướng cứng (hard navigation, như khi bấm
  link email) tới đường dẫn sâu (`/Hoa_hoc_THCS/auth`) luôn 404.
- `src/store/auth.ts`:
  - `signUp()` (~dòng 191) gọi `supabase.auth.signUp({ email, password,
options: { data: { display_name } } })` — **không có**
    `options.emailRedirectTo`.
  - `resetPassword()` (~dòng 300) gọi
    `supabase.auth.resetPasswordForEmail(email.trim())` — **không có**
    tham số thứ hai `{ redirectTo }`.
  - Hệ quả: đích đến sau khi bấm link email phụ thuộc hoàn toàn vào
    "Site URL" cấu hình trên dashboard Supabase (đã từng gây sự cố
    tương tự ở FEATURE-006, xem README hiện tại).
  - `detectPasswordRecoveryFromUrl()` (~dòng 60) đọc `type=recovery` từ
    hash/query để bật `isPasswordRecovery`; sự kiện `PASSWORD_RECOVERY`
    của `onAuthStateChange` (~dòng 136) cũng bật cờ này.
- `src/routes/AuthRoute.tsx`: form "nhập mật khẩu mới" chỉ render khi
  route hiện tại là `/auth` **và** `isPasswordRecovery === true`
  (dòng 36, 160–226). Nếu link đưa về route khác (`/`), cờ vẫn bật
  nhưng không có UI nào hiển thị — người dùng mắc kẹt.
- `README.md` (~dòng 39–50) đã có hướng dẫn cấu hình Site URL/Redirect
  URLs trên dashboard Supabase (bổ sung sau sự cố FEATURE-006), nhưng
  chưa đề cập cụ thể phải trỏ vào subpath `/Hoa_hoc_THCS/auth`, và
  chưa có phần describe cơ chế `404.html`.

## 3. Assumptions

- App chỉ deploy chính thức lên GitHub Pages tại
  `https://tuann2.github.io/Hoa_hoc_THCS/` — không có domain tuỳ chỉnh
  khác cần hỗ trợ trong bản sửa này.
- Cách sửa `404.html` phải hoạt động **không phụ thuộc CDN/host cụ
  thể** ngoài quy ước chuẩn của GitHub Pages (phục vụ `404.html` khi
  không khớp path) — không thêm dependency mới.
- `redirectTo`/`emailRedirectTo` phải tính động theo
  `window.location.origin` + `import.meta.env.BASE_URL`, không hardcode
  domain, để cùng một code chạy đúng ở cả prod và dev
  (`http://localhost:5173/auth`).
- Việc cập nhật Site URL/Redirect URLs trên dashboard Supabase (Phần C
  trong audit) do người dùng tự thực hiện — Claude Code không có quyền
  truy cập dashboard đó. Task này chỉ triển khai Phần A (404.html) và
  Phần B (code truyền redirectTo), đồng thời cập nhật README nêu chính
  xác giá trị cần điền ở Phần C.
- Không thêm route catch-all `path="*"` cho các URL sai tuỳ tiện khác —
  ngoài phạm vi của hai lỗi được báo cáo, giữ thay đổi tối thiểu.

## 4. Scope

- `vite.config.ts`: thêm một Vite plugin nhỏ (viết tay, không thêm
  dependency) copy `dist/index.html` → `dist/404.html` sau khi build,
  để GitHub Pages phục vụ SPA fallback cho mọi đường dẫn sâu.
- `src/store/auth.ts`:
  - Thêm helper `getAuthRedirectUrl()` tính
    `${window.location.origin}${import.meta.env.BASE_URL}auth` (guard
    `typeof window === 'undefined'`).
  - `signUp`: truyền `options.emailRedirectTo: getAuthRedirectUrl()`.
  - `resetPassword`: truyền tham số thứ hai
    `{ redirectTo: getAuthRedirectUrl() }` cho
    `resetPasswordForEmail`.
- `README.md`: cập nhật phần "Thiết lập Supabase" ghi rõ Site URL và
  Redirect URLs phải trỏ đúng subpath (`https://<user>.github.io/<repo>/`
  và `.../auth`), và một dòng giải thích ngắn về `404.html` fallback.
- Test:
  - `vite.config.ts` plugin: có thể test bằng cách build thực tế
    (script/CI) kiểm tra `dist/404.html` tồn tại và có nội dung giống
    `dist/index.html` — không cần unit test riêng nếu build đã là bước
    validate chuẩn của dự án (`npm run build`).
  - `src/store/auth.ts`: test `signUp` gọi
    `supabase.auth.signUp` với `options.emailRedirectTo` đúng định dạng
    (mock `window.location`, mock `import.meta.env.BASE_URL`); test
    `resetPassword` gọi `resetPasswordForEmail` với `redirectTo` đúng
    định dạng.

## 5. Out of scope

- Không thay đổi cơ chế hiển thị form recovery trong `AuthRoute.tsx`
  (đã đúng route `/auth` sau khi Phần B sửa xong, không cần sửa thêm).
- Không thêm route catch-all `path="*"` cho lỗi 404 client-side khác.
- Không tự sửa cấu hình Supabase dashboard (Site URL/Redirect URLs) —
  chỉ cập nhật README hướng dẫn, người dùng tự thực hiện trên dashboard.
- Không đổi domain deploy, không thêm custom domain/CNAME.
- Không đổi luồng `signIn`/`signOut`/`updatePassword` — các hàm này
  không liên quan tới link email.

## 6. Proposed design

### Vite plugin tạo `404.html` (SPA fallback cho GitHub Pages)

```ts
// vite.config.ts
import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function spaFallback404(): Plugin {
  return {
    name: 'spa-fallback-404',
    apply: 'build',
    closeBundle() {
      const outDir = resolve(__dirname, 'dist');
      copyFileSync(resolve(outDir, 'index.html'), resolve(outDir, '404.html'));
    }
  };
}

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [react(), spaFallback404()]
  // ...giữ nguyên phần test/coverage hiện có
});
```

`closeBundle` chạy sau khi Vite ghi xong toàn bộ output — đảm bảo
`index.html` đã tồn tại khi copy. `apply: 'build'` để không chạy trong
`vite dev`/test.

### Helper `getAuthRedirectUrl` trong `auth.ts`

```ts
function getAuthRedirectUrl(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return `${window.location.origin}${import.meta.env.BASE_URL}auth`;
}
```

Áp dụng:

```ts
// signUp
const { data, error } = await supabase.auth.signUp({
  email: trimmedEmail,
  password,
  options: {
    data: { display_name: trimmedName },
    emailRedirectTo: getAuthRedirectUrl()
  }
});

// resetPassword
const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
  redirectTo: getAuthRedirectUrl()
});
```

`import.meta.env.BASE_URL` luôn kết thúc bằng `/` (Vite đảm bảo) →
prod: `https://tuann2.github.io/Hoa_hoc_THCS/auth`, dev:
`http://localhost:5173/auth`.

### README — hướng dẫn Phần C (dashboard)

Cập nhật đoạn hiện có (~dòng 39–50) để nêu chính xác:

- **Site URL**: `https://tuann2.github.io/Hoa_hoc_THCS/`
- **Redirect URLs**: thêm
  `https://tuann2.github.io/Hoa_hoc_THCS/auth`,
  `https://tuann2.github.io/Hoa_hoc_THCS/**` (dự phòng), và
  `http://localhost:5173/auth` cho dev.
- Ghi chú: nếu `redirectTo` không nằm trong allowlist Redirect URLs,
  Supabase bỏ qua nó và dùng lại Site URL — nên cấu hình cả hai.

## 7. Files to create

- (Không có file mới — chỉ sửa file hiện có)

## 8. Files to modify

- `vite.config.ts`
- `src/store/auth.ts`
- `README.md`
- File test tương ứng cho `src/store/auth.ts` (theo cấu trúc test hiện
  có, ví dụ `tests/store/auth.test.ts` nếu đã tồn tại, hoặc tạo mới
  theo đúng convention thư mục `tests/`).

## 9. API and database impact

Không có — không đổi schema Supabase, không đổi bảng/migration. Chỉ
thay đổi tham số truyền vào 2 lời gọi Supabase Auth SDK sẵn có
(`signUp`, `resetPasswordForEmail`) và thêm một bước copy file tĩnh sau
build.

## 10. Implementation steps

1. Sửa `vite.config.ts`: thêm plugin `spaFallback404`.
2. Sửa `src/store/auth.ts`: thêm `getAuthRedirectUrl()`, áp dụng vào
   `signUp` và `resetPassword`.
3. Viết/cập nhật test cho `src/store/auth.ts` (mock
   `window.location`/`import.meta.env.BASE_URL`, assert tham số
   `emailRedirectTo`/`redirectTo` đúng định dạng).
4. Chạy `npm run build` cục bộ, xác nhận `dist/404.html` tồn tại và nội
   dung giống `dist/index.html`.
5. Cập nhật `README.md` phần "Thiết lập Supabase" theo mục 6.
6. Chạy `npm run validate-content && npm test && npm run lint && npm run typecheck`.
7. Vì đây là vùng auth (high-risk theo `CLAUDE.md`) — chạy review chéo
   Gemini (`agy`) trước khi commit.

## 11. Test strategy

- Unit test `src/store/auth.ts`: `signUp` gọi
  `supabase.auth.signUp` với `options.emailRedirectTo` khớp
  `${origin}${BASE_URL}auth`; `resetPassword` gọi
  `resetPasswordForEmail` với `{ redirectTo }` khớp cùng định dạng.
  Test cả trường hợp `BASE_URL` là `/` (dev) và `/Hoa_hoc_THCS/` (mô
  phỏng prod, nếu môi trường test cho phép override).
- Regression: các test hiện có cho `signIn`, `signOut`, `updatePassword`
  không được vỡ (các hàm này không đổi).
- Build thật (`npm run build`): xác nhận `dist/404.html` được tạo và
  giống hệt `dist/index.html` (không tạo thêm nội dung sai lệch bundle
  path).

## 12. Security considerations

- `redirectTo`/`emailRedirectTo` tính từ `window.location.origin` —
  không nhận input tự do từ người dùng, không có rủi ro open-redirect
  do code (Supabase còn chặn thêm bằng allowlist Redirect URLs phía
  server).
- Không log, không expose thêm thông tin nhạy cảm. Không đổi luồng xác
  thực (password, session) — chỉ đổi đích điều hướng sau khi Supabase
  xác thực token trong link email.
- `404.html` là bản sao tĩnh của `index.html`, không chứa logic hay
  secret nào khác ngoài những gì đã public trong bundle hiện tại.

## 13. Risks

| Risk                                                                                                                                                                                      | Impact                        | Mitigation                                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------- |
| Người dùng chưa cập nhật Redirect URLs trên dashboard Supabase (Phần C) thì Phần B vẫn không có tác dụng, link vẫn 404                                                                    | Cao nếu bỏ qua bước dashboard | README nêu rõ giá trị chính xác cần điền; nhắc lại trong summary bàn giao                                |
| Plugin `404.html` chạy sai thời điểm nếu Vite thay đổi hook lifecycle ở bản nâng cấp sau này                                                                                              | Thấp                          | Dùng `closeBundle` (hook ổn định, chạy sau khi ghi file xong), `apply: 'build'` tránh ảnh hưởng dev/test |
| Quên guard `typeof window` khiến `getAuthRedirectUrl` lỗi khi chạy test (jsdom vẫn có `window` nên rủi ro thấp, nhưng cần nhất quán với `detectPasswordRecoveryFromUrl` đã có cùng guard) | Thấp                          | Theo đúng pattern guard đã có sẵn trong file                                                             |

## 14. Rollback plan

Thay đổi nằm trên nhánh `feature/FEATURE-010`, tách biệt hoàn toàn khỏi
`feature/FEATURE-009` (đã stash riêng) và chưa merge `main`. Nếu phát
sinh lỗi sau khi merge: `git revert` commit merge tương ứng — không có
migration DB nào cần rollback riêng, không đổi schema.

## 15. Acceptance criteria

- [ ] `npm run build` tạo ra `dist/404.html` giống `dist/index.html`.
- [ ] `signUp` gọi Supabase với `emailRedirectTo` trỏ đúng
      `${origin}${BASE_URL}auth`.
- [ ] `resetPassword` gọi Supabase với `redirectTo` trỏ đúng
      `${origin}${BASE_URL}auth`.
- [ ] README nêu chính xác Site URL + Redirect URLs cần cấu hình trên
      dashboard Supabase cho cả prod và dev.
- [ ] `npm test && npm run lint && npm run typecheck && npm run validate-content` pass.
- [ ] (Thủ công, sau khi người dùng cập nhật dashboard) Bấm link xác
      nhận email và link reset mật khẩu trên bản deploy thật không còn 404.
