# FEATURE-014: Tối ưu tải (code splitting), PWA offline và E2E

## Status

- Status: APPROVED <!-- DRAFT | APPROVED | SUPERSEDED -->
- Owner: Claude Code (tách từ draft FEATURE-013 của Codex sau review
  2026-07-13; phần dependency security nằm ở `docs/plans/FEATURE-013.md`)
- Approved by: nt0 (plan + risk tier CRITICAL + cả hai công nghệ mục 6a:
  `vite-plugin-pwa@1.3.0`, `@playwright/test@1.61.1`)
- Approved date: 2026-07-16
- Depends on: FEATURE-013 (vá dependency + CI audit/license/format gate)
  phải merge trước khi feature này bắt đầu implement.
- Risk tier: CRITICAL
- Risk categories: production availability; runtime caching/offline
  behavior; deployment and CI configuration; new technology adoption
- Escalation rationale: service worker chi phối asset được phục vụ ở
  production (trust boundary + production availability); thêm dependency
  mới (`vite-plugin-pwa`, `@playwright/test`) là architecture change; mở
  rộng CI là infrastructure. Theo Risk Model, các thay đổi này ở mức
  CRITICAL.
- Change type: Application source or runtime config; Tests only;
  Infrastructure or deployment; Dependencies or lockfiles
- Quality gates: `git diff --check`; `npm run format:check`;
  `npm run validate-content`; `npm run check:content-catalog`;
  `npm run lint`; `npm run typecheck`; `npm test`; `npm run build`;
  `npm run check:bundle`; `npm run check:licenses`;
  `npm audit --audit-level=moderate`; `npm run test:e2e`;
  `npm run test:pwa`; CI trên đúng candidate commit; fresh Gemini review và
  fresh Codex adversarial review. Các script mới phải tồn tại trước
  validation; thiếu bất kỳ gate nào là blocker.

> Governance note: bản nháp để con người duyệt. Không được triển khai, cài
> dependency hoặc đổi kiến trúc trước khi Status chuyển thành `APPROVED` và
> hai lựa chọn công nghệ ở mục 6a được duyệt rõ ràng.

## 1. Objective

Hoàn thiện nhóm P0 còn lại sau FEATURE-013, không bao gồm rà soát chuyên môn
Hoá học do người dùng tự thực hiện:

1. Giảm tải JavaScript ban đầu bằng route-level code splitting và tải nội
   dung theo unit thay vì bundle đồng bộ toàn bộ 17 unit.
2. Cho phép cài web app lên điện thoại, mở được app và học toàn bộ nội dung
   đã cache khi mất mạng, với update flow không làm gián đoạn phiên học/thi.
3. Bổ sung E2E cho các luồng học, thi, persistence, auth/sync mock và PWA
   offline; bắt buộc chạy trong CI.

Kết quả phải giữ nguyên hành vi nghiệp vụ hiện tại: lộ trình/mở khoá, XP,
streak, sao, ôn câu sai, thi thử, local persistence và Supabase sync.

## 2. Current system analysis

### Bundle và content loading baseline

- `src/lib/content.ts` import eager cả 17 file JSON, tổng kích thước nguồn
  khoảng 1.4 MB, rồi cung cấp API đồng bộ cho mọi route.
- Production build hiện tạo một JavaScript chunk khoảng 1,330.58 kB
  minified, 389.62 kB gzip và phát cảnh báo chunk vượt 500 kB.
- `App`, `HomeRoute`, `ProfileRoute`, `LessonRoute`, `ReviewRoute`,
  `ExamRoute`, progress store và progress sync đều phụ thuộc
  `UnitContent[]`; việc chỉ thêm `React.lazy` cho route sẽ không tách được
  nội dung nếu `App` vẫn import eager `getAllUnits()`.
- Không có loading/error state cho việc tải nội dung vì dữ liệu hiện luôn
  nằm sẵn trong bundle.

### PWA/offline baseline

- Chưa có Web App Manifest, app icon, service worker, install CTA, trạng
  thái online/offline hoặc UI báo có bản cập nhật.
- `vite.config.ts` chỉ tạo `404.html` để GitHub Pages fallback. PWA phải
  tiếp tục hoạt động với cả base `/` và base `/Hoa_hoc_THCS/`.
- Progress local dùng Zustand persist/localStorage và Supabase sync đã có
  offline fallback. Service worker không cần và không được truy cập/copy
  dữ liệu tiến độ hay token auth.

### Test/CI baseline (sau FEATURE-013)

- Formatter, content validation, lint, typecheck, 87 unit/component tests
  và production build pass; CI đã có format:check, audit và license gate.
- Chưa có Playwright/Cypress, chưa có E2E, chưa test service worker hoặc
  offline navigation.
- CI chưa có bundle budget, browser install hoặc E2E.

## 3. Assumptions

- FEATURE-013 đã merge: dependency đã vá, CI đã có audit/license/format
  gate.
- GitHub Pages tiếp tục là production hosting trong feature này.
- Supabase Auth/PostgREST và schema database không đổi.
- Toàn bộ 17 unit/81 lesson hiện tại phải học được offline sau khi PWA báo
  "Đã sẵn sàng học offline".
- Lần truy cập đầu tiên vẫn cần mạng để tải app và hoàn tất cache; app phải
  nói rõ trạng thái này, không hứa offline trước khi cache hoàn tất.
- Người dùng đang làm quiz/thi không bị reload tự động khi service worker
  mới được phát hiện.
- Browser E2E chỉ dùng fixture và mock endpoint; không dùng production
  secret, account thật hoặc Supabase production.
- Không thay đổi nội dung/đáp án Hoá học. Phần giáo viên rà soát chuyên môn
  là công việc độc lập do người dùng tự thực hiện.
- Không thêm analytics, push notification, teacher portal, adaptive
  learning hoặc app-store wrapper trong scope này.
- Node 22 trong CI vẫn là runtime chuẩn. Công cụ mới phải tương thích
  Node 22.

## 4. Scope

### A. Route và content code splitting

- Lazy-load các route không phải home bằng `React.lazy` + `Suspense`; có
  loading UI nhất quán, có retry/error UI khi chunk tải thất bại.
- Tách metadata lộ trình khỏi nội dung đầy đủ:
  - Catalog nhẹ chứa unit/lesson id, part, order, title, description,
    status và metadata tối thiểu cần cho map/progress.
  - Full cards/questions vẫn nằm trong 17 JSON hiện tại và được dynamic
    import theo unit.
- Dùng explicit loader map hoặc `import.meta.glob` với `eager: false`;
  tuyệt đối không tạo lại một barrel eager làm mọi JSON quay về entry chunk.
- Catalog được generate có chủ đích từ JSON và commit vào repo. Lệnh check
  catalog stale là `npm run check:content-catalog` (chạy generator ở chế độ
  `--check`, chỉ so sánh, không tự sửa working tree); CI và final commands
  gọi đích danh lệnh này.
- Chuyển API nội bộ:
  - API đồng bộ chỉ phục vụ catalog (`getUnitCatalog`,
    `findLessonSummary`, ...).
  - API tải nội dung là async (`loadUnit`, `loadUnits`, `loadQuestion`,
    ...), có cache Promise theo unit để tránh fetch/import lặp.
- Refactor progress store và unlock logic chỉ phụ thuộc catalog, không phụ
  thuộc cards/questions.
- Refactor progress sync normalization để dùng catalog/lesson metadata;
  không import eager full content ở module scope.
- Route behavior:
  - Home/Profile chỉ tải catalog.
  - Lesson chỉ tải unit đang mở.
  - Review chỉ tải các unit xuất hiện trong queue câu sai.
  - Exam tải các unit thuộc scope sau khi người dùng bấm bắt đầu; UI thể
    hiện trạng thái đang tạo đề và xử lý lỗi tải an toàn.
- Thêm bundle budget tự động (`npm run check:bundle`) dựa trên
  output/manifest của Vite:
  - Không có content unit nào trong initial entry chunk.
  - Không có JavaScript chunk nào vượt 500 kB minified.
  - Tổng JavaScript cần cho lần render home đầu tiên không vượt 250 kB gzip.
  - Có ít nhất 17 content chunks hoặc mapping tương đương chứng minh mỗi
    unit có thể tải độc lập.

### B. Installable PWA và offline toàn bộ nội dung

- Thêm `vite-plugin-pwa@1.3.0` với Workbox do plugin quản lý, cấu hình
  base-aware cho localhost và GitHub Pages subpath.
- Thêm manifest hợp lệ: `id`, `name`, `short_name`, `description`,
  `start_url`, `scope`, `display: standalone`, theme/background colors và
  icon 192/512/maskable.
- Precache app shell, route chunks thiết yếu, catalog và toàn bộ content
  chunks đã build. Việc precache chạy nền; first render không chờ tải xong
  toàn bộ.
- Chỉ cache same-origin static assets có hash. Không cache:
  - Supabase URL, Auth hoặc PostgREST request/response.
  - token/session, profile, progress payload hoặc bất kỳ request có
    credential.
  - response opaque/cross-origin không nằm trong allowlist.
- Navigation fallback phải hoạt động offline cho `/`, `/learn/...`,
  `/review`, `/exam`, `/profile` và `/auth`, đồng thời không phá cơ chế
  `404.html` của GitHub Pages.
- Thêm trạng thái người dùng:
  - "Đang chuẩn bị học offline" khi service worker đang cache.
  - "Đã sẵn sàng học offline" chỉ sau tín hiệu cache hoàn tất.
  - Banner offline khi mất mạng; học/local persistence vẫn hoạt động.
  - CTA cài app khi browser hỗ trợ `beforeinstallprompt`; hướng dẫn Add to
    Home Screen riêng cho iOS thay vì giả lập prompt không được hỗ trợ.
  - Banner "Có phiên bản mới" với nút cập nhật. Không `skipWaiting` +
    reload tự động trong khi người dùng đang học hoặc thi.
- Sau khi online trở lại, giữ nguyên cơ chế Supabase sync hiện tại; lỗi
  sync không được chặn học offline.

### C. E2E và CI

- Thêm `@playwright/test@1.61.1`, pin exact version; CI chỉ cài Chromium
  cần thiết bằng lệnh chính thức của Playwright.
- E2E chạy trên production build qua Vite preview, không chạy trên dev
  server.
- Tạo fixture/reset helper để mỗi test có localStorage tách biệt và
  deterministic.
- Mock Supabase ở network boundary; không thêm backdoor/test mode vào
  production auth/progress logic nếu route interception đủ dùng.
- Phủ tối thiểu các luồng:
  1. Home render catalog, chuyển Vô cơ/Hữu cơ và mở đúng lesson.
  2. Hoàn thành theory/practice, ghi XP/sao/streak/câu sai và giữ dữ liệu
     sau reload.
  3. Review câu sai: đúng thì resolve, sai thì còn trong queue.
  4. Exam: cấu hình scope, trả lời, hết giờ bằng fake clock, chấm điểm và
     lưu history.
  5. Auth/sync mock: sign-in, merge local/remote, push và sign-out không
     làm lẫn dữ liệu giữa user.
  6. Manifest/installability và service worker registration trên production
     build.
  7. Warm cache rồi offline reload trực tiếp các route chính; không có
     request Supabase nào được service worker trả từ cache.
  8. Update available không tự reload một phiên lesson/exam đang chạy.
- Có project viewport desktop và mobile 390x844 cho các smoke flow chính.
- CI thêm bundle budget, catalog check, browser job chạy E2E/PWA và upload
  Playwright report khi fail (audit/license/format đã có từ FEATURE-013).

## 5. Out of scope

- Nâng dependency bảo mật (đã xử lý ở FEATURE-013).
- Rà soát/fact-check nội dung bởi giáo viên Hoá; người dùng tự thực hiện.
- Sửa nội dung, đáp án, lời giải, nguồn hoặc schema câu hỏi Hoá học.
- Push notification/nhắc học, background sync mới hoặc app badge.
- Analytics, telemetry, Sentry hoặc thu thập dữ liệu hành vi.
- React Native, Flutter, Capacitor, App Store hoặc Google Play release.
- Teacher/parent portal, leaderboard, adaptive learning và spaced
  repetition.
- Đổi Supabase provider, auth flow, RLS, database schema hoặc migration.
- Thay GitHub Pages bằng hosting/service khác.
- Redesign toàn bộ UI hoặc accessibility audit toàn diện; chỉ thêm UI cần
  cho loading, offline, install và update.
- Nâng React 18 lên React 19, React Router 6 lên 7, Vite 6 (6.4.3 sau
  FEATURE-013) lên major mới nếu không có blocker được người dùng duyệt
  lại.

## 6. Proposed design

### 6.1. Kiến trúc tải nội dung

```text
content/units/*.json
       |
       +-- explicit generate command --> committed lightweight catalog
       |                                  |
       |                                  +--> Home/Profile/progress/unlock
       |
       +-- Vite dynamic import map ------> loadUnit(unitId)
                                             |
                                             +--> Lesson: one unit
                                             +--> Review: queue unit set
                                             +--> Exam: selected scope units
```

Catalog và full content dùng type riêng. `UnitSummary`/`LessonSummary`
không được chứa `cards` hoặc `questions`, nhờ đó TypeScript ngăn route nhẹ
vô tình phụ thuộc full content. Loader validate module shape trước khi
cache Promise; module lỗi phải trả typed error để route hiển thị retry,
không render trắng.

Không generate catalog tự động trong `npm run build`, vì build/validation
phải read-only đối với implementation snapshot. Khi content thay đổi ở
feature sau, author chạy explicit generate command;
`npm run check:content-catalog` chỉ so sánh và fail nếu stale.

### 6.2. PWA cache/update strategy

```text
First visit
  -> render shell + catalog
  -> service worker installs in background
  -> precache immutable build assets/content chunks
  -> UI receives CACHE_READY
  -> show "Đã sẵn sàng học offline"

New deployment
  -> new worker waits
  -> UI shows update banner
  -> user confirms at safe point
  -> activate worker + reload once
```

Workbox precache manifest chỉ chứa build assets có revision/hash. Runtime
route cho Supabase phải là network-only/bypass. Không dùng cache-first cho
HTML không versioned ngoài navigation fallback, tránh giữ `index.html` cũ
trỏ tới chunk đã bị deploy xoá.

Nếu GitHub Pages không thể bảo đảm atomic asset retention giữa hai
deployment, update flow phải được E2E/smoke test với asset 404 scenario;
nếu không xử lý an toàn trong scope, đây là blocker chứ không được ẩn cảnh
báo.

### 6.3. CI structure

```text
quality job
  -> npm ci
  -> canonical gates (kèm audit + license từ FEATURE-013)
  -> npm run check:content-catalog
  -> production build + npm run check:bundle

browser job (needs quality/build artifact)
  -> install Chromium
  -> serve exact production artifact
  -> E2E + PWA/offline tests
  -> upload report on failure
```

CI evidence phải bind đúng candidate commit. Do risk tier `CRITICAL`, sau
handoff cần một fresh Gemini review và một fresh Codex adversarial review,
cả hai kiểm tra toàn bộ diff và các failure mode: cache nhầm auth/progress,
stale worker, offline route fail, update làm mất phiên.

## 6a. New technology (bỏ qua nếu không áp dụng)

### Lựa chọn 1: `vite-plugin-pwa@1.3.0` + Workbox

- Công nghệ đề xuất: `vite-plugin-pwa@1.3.0` (bản mới nhất đã xác minh
  2026-07-13); dùng Workbox versions do plugin pin/resolve tương thích,
  không import API Workbox nội bộ ngoài public contract.
- Lý do lựa chọn: tích hợp trực tiếp Vite, generate precache manifest theo
  asset hash, hỗ trợ base path và update registration; giảm rủi ro tự viết
  service worker/cache invalidation.
- Phương án khác đã xem xét và lý do loại:
  - Service worker viết tay: ít dependency hơn nhưng cache lifecycle/update
    phức tạp, dễ gây stale asset hoặc cache nhầm request.
  - Chưa làm PWA: không đạt mục tiêu install/offline P0.
  - Capacitor/native wrapper: vượt scope, chưa cần API native/app store.
- Trade-off chấp nhận: thêm build dependency và Workbox transitive; service
  worker làm deployment/cache khó debug hơn; cần kiểm tra advisory/license
  và E2E offline/update bắt buộc.
- **Cần con người duyệt lựa chọn này trước khi triển khai.**

### Lựa chọn 2: `@playwright/test@1.61.1`

- Công nghệ đề xuất: Playwright Test (bản mới nhất đã xác minh 2026-07-13),
  ban đầu chỉ cài/chạy Chromium trong CI.
- Lý do lựa chọn: kiểm tra được production build, mobile viewport, fake
  clock, service worker, offline context và network interception trong
  cùng runner.
- Phương án khác đã xem xét và lý do loại:
  - Cypress: đáp ứng E2E thông thường nhưng không có lợi thế rõ hơn cho
    offline service worker của scope này và thêm một stack test song song.
  - Chỉ Testing Library/Vitest: không chứng minh được installability,
    service worker, offline navigation hay production bundle hoạt động
    trong browser.
  - Browser kiểm thử thủ công: không deterministic và không làm CI gate.
- Trade-off chấp nhận: Chromium binary làm CI chậm/tốn cache; test browser
  có thể flaky nếu locator/timer không deterministic; phải dùng fixture,
  webServer readiness và artifact-on-failure.
- **Cần con người duyệt lựa chọn này trước khi triển khai.**

Sau khi hai lựa chọn được duyệt và implementation pass review: cập nhật
`docs/architecture.md`; tạo ADR cho chiến lược PWA/cache vì đây là quyết
định runtime/production không tầm thường.

## 7. Files to create

Tên file có thể được Claude điều chỉnh trước approval nhưng trách nhiệm
phải giữ nguyên:

- `content/catalog.json` hoặc `src/generated/contentCatalog.ts`
- `scripts/generate-content-catalog.ts` (kèm chế độ `--check` cho
  `npm run check:content-catalog`)
- `scripts/check-bundle-budget.ts`
- `src/lib/contentCatalog.ts`
- `src/lib/contentLoader.ts`
- `src/components/ContentLoading.tsx`
- `src/components/ContentLoadError.tsx`
- `src/components/PwaStatus.tsx`
- `src/lib/pwa.ts`
- `public/icons/pwa-192.png`
- `public/icons/pwa-512.png`
- `public/icons/pwa-maskable-512.png`
- `playwright.config.ts`
- `tests/e2e/learning.spec.ts`
- `tests/e2e/review.spec.ts`
- `tests/e2e/exam.spec.ts`
- `tests/e2e/auth-sync.spec.ts`
- `tests/e2e/pwa-offline.spec.ts`
- `tests/e2e/fixtures.ts`
- `docs/adr/0002-pwa-cache-and-update-strategy.md` (sau approval)
- `docs/handoffs/FEATURE-014-implementation.md`

## 8. Files to modify

- `package.json`
- `package-lock.json`
- `vite.config.ts`
- `index.html`
- `src/main.tsx`
- `src/App.tsx`
- `src/lib/content.ts` (thu hẹp hoặc thay bằng compatibility facade có
  thời hạn)
- `src/lib/progressSync.ts`
- `src/store/progress.ts`
- `src/routes/HomeRoute.tsx`
- `src/routes/ProfileRoute.tsx`
- `src/routes/LessonRoute.tsx`
- `src/routes/ReviewRoute.tsx`
- `src/routes/ExamRoute.tsx`
- Các test unit/component bị ảnh hưởng bởi API content async
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml` chỉ khi cần thay đổi build/base/PWA
  validation; không thay permissions/deploy authority ngoài scope
- `README.md`
- `docs/architecture.md` (chỉ sau khi con người duyệt công nghệ)

Không được sửa `content/units/*.json`, Supabase migration hoặc auth/RLS
logic.

## 9. API and database impact

- Không có public HTTP API mới.
- Không có database migration, table/policy/RLS change.
- Internal content API đổi từ đồng bộ/eager sang catalog đồng bộ + full
  content async. Đây là breaking internal API và mọi consumer/test phải
  migrate trong cùng feature; không để hai source of truth dài hạn.
- Progress snapshot schema/version không đổi. Nếu implementation phát hiện
  bắt buộc đổi persisted schema, dừng và sửa plan/risk review trước khi
  tiếp tục.
- Service worker tạo browser runtime boundary mới nhưng chỉ quản lý static
  same-origin assets; không sở hữu user data.

## 10. Implementation steps

1. Claude xác nhận FEATURE-013 đã merge, chốt tên file/catalog design và
   xin người dùng duyệt `vite-plugin-pwa` + Playwright (mục 6a).
2. Tạo branch `feature/FEATURE-014`; ghi base SHA và baseline evidence
   (bundle sizes, test count). Không làm trực tiếp trên `main`.
3. Thêm catalog generator/check, types và unit tests cho catalog drift,
   duplicate/missing id và loader unknown/failure/cache cases.
4. Refactor progress/unlock/sync sang catalog; bảo toàn snapshot schema và
   merge behavior bằng regression tests hiện có.
5. Chuyển Lesson/Review/Exam sang async loader, sau đó lazy-load route;
   thêm loading/error/retry state và tests.
6. Thêm Vite output manifest + bundle budget script; xác nhận budget pass
   và không có eager content import qua bundle inspection.
7. Tích hợp PWA manifest/icons/service worker, cache allowlist, offline
   status, install CTA và safe update prompt.
8. Thêm Playwright config/fixtures và E2E theo scope; kiểm tra production
   build ở base `/` và `/Hoa_hoc_THCS/`.
9. Mở rộng CI với catalog check/bundle/E2E/PWA. Nếu sửa deploy workflow,
   validate syntax/policy và chạy dry-run tương đương trên artifact không
   deploy.
10. Chạy một lần toàn bộ gate trên snapshot cuối, ghi Evidence Binding đầy
    đủ và tạo handoff từ template.
11. Fresh Gemini + fresh Codex adversarial review. Mọi finding làm thay
    đổi candidate phải quay lại remediation, rerun toàn bộ applicable gates
    và cập nhật handoff; không tái sử dụng evidence cũ.
12. Claude đánh giá release readiness. Chỉ human quyết định commit/push/
    PR/merge/deploy theo quyền được cấp; Codex không tự thực hiện các hành
    động đó.

## 11. Test strategy

### Unit/component tests

- Catalog generation deterministic và `npm run check:content-catalog` phát
  hiện stale output.
- Dynamic loader: valid unit, unknown unit, module reject, retry và
  Promise cache.
- Progress unlock/next lesson dùng catalog cho cả Vô cơ/Hữu cơ.
- Progress sync normalize/merge không cần full question content và không
  đổi snapshot persisted.
- Loading/error/retry UI của Lesson/Review/Exam.
- PWA registration state machine: unsupported, installing, ready, offline,
  update waiting và user-confirmed activation.
- Cache policy helper từ chối Supabase/cross-origin/authenticated requests.

### Integration/E2E

- Tám nhóm E2E ở mục 4.C trên production build.
- Base path matrix: `/` và `/Hoa_hoc_THCS/` cho manifest, start URL, asset
  URL, direct navigation và offline fallback.
- Mobile viewport 390x844 không horizontal overflow ở home/lesson/exam và
  CTA install/update không che control chính.
- Network failure giữa lúc load unit trả retry UI; retry thành công không
  làm mất progress hiện có.
- Worker update giữa phiên không reload; sau khi rời safe point và xác
  nhận thì reload đúng một lần.

### Security/dependency

- `npm audit --audit-level=moderate` và `npm run check:licenses` exit 0
  trên exact lockfile sau khi thêm 2 dependency mới.
- Kiểm tra bundle/service worker manifest không chứa Supabase key ngoài
  anon key public-by-design, token test, fixture credential hoặc source
  map ngoài chính sách deploy.
- E2E chứng minh Supabase/Auth/PostgREST request không được phục vụ từ
  cache.
- Review lockfile xác nhận không có install script/native binary ngoài
  Playwright browser install đã khai báo.

### Required final commands

```bash
git diff --check
npm run format:check
npm run validate-content
npm run check:content-catalog
npm run lint
npm run typecheck
npm test
npm run build
npm run check:bundle
npm run check:licenses
npm audit --audit-level=moderate
npm run test:e2e
npm run test:pwa
```

Nếu `test:pwa` được triển khai như subset/tag của `test:e2e`, handoff phải
ghi rõ một command composite cung cấp hai gate mà không chạy trùng
snapshot.

## 12. Security considerations

- Không cache request/response Supabase, credentialed request, auth
  callback, token, profile hoặc progress payload.
- Không log email, access/refresh token, localStorage content hoặc full
  progress snapshot trong browser report/trace/screenshot CI.
- Playwright trace/video/screenshot chỉ bật khi fail và phải dùng
  account/mock data giả; artifact retention theo mặc định CI, không chứa
  secret.
- PWA update phải chống cache poisoning/stale asset: chỉ precache asset
  trong build manifest có revision/hash, scope đúng base path và không
  dùng wildcard cross-origin.
- `navigateFallback` không được biến external redirect thành same-origin
  route; thêm regression test cho URL/path bất thường liên quan advisory
  React Router (đã vá ở FEATURE-013).
- Không nới CSP/permissions GitHub Actions. Third-party actions tiếp tục
  pin major hiện có; nếu thêm action mới phải review permissions và
  provenance.
- Không thêm secret production cho E2E. Supabase CI env dùng endpoint giả
  và network interception.
- Install CTA chỉ xuất hiện sau user interaction phù hợp; không tự yêu cầu
  notification vì notification ngoài scope.
- Nếu dependency mới kéo advisory hoặc license ngoài allowlist, dừng và
  xin duyệt revised plan thay vì override/ignore không giải thích.

## 13. Risks

| Risk                                                      | Impact                                          | Mitigation                                                                                                       |
| --------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Service worker giữ HTML/chunk cũ sau deploy               | App trắng hoặc lỗi chunk trên production        | Hashed precache, waiting update, base-path E2E, asset-404 test và rollback worker/manifest                       |
| Cache nhầm Supabase/Auth/progress                         | Rò hoặc trả dữ liệu sai user                    | Same-origin static allowlist, explicit bypass, security unit + E2E, adversarial review                           |
| Update tự reload giữa quiz/exam                           | Mất câu trả lời/phiên đang làm                  | Prompt update, không auto `skipWaiting`, test update giữa active session                                         |
| Catalog stale so với JSON                                 | Route sai, thiếu bài hoặc unlock sai            | Generator deterministic, committed artifact, `check:content-catalog` CI, duplicate/missing-id tests              |
| Async loader làm đổi progress schema                      | Mất/không merge dữ liệu cũ                      | Giữ version/schema, regression test migration/sync; dừng sửa plan nếu bắt buộc đổi schema                        |
| Code splitting hình thức nhưng entry vẫn kéo full content | Không cải thiện tải đầu                         | Bundle manifest assertion và budget gate, cấm eager barrel                                                       |
| Precache toàn bộ nội dung tốn data lần đầu                | Người dùng mobile tải nền nhiều hơn             | Render trước, cache nền, hiển thị trạng thái; tổng content baseline chỉ ~1.4 MB raw nhưng đo artifact cuối       |
| Playwright E2E flaky                                      | CI chậm/không tin cậy                           | Deterministic fixtures, fake clock, role/test-id locator, no arbitrary sleep, report-on-failure                  |
| Dependency mới kéo advisory/license vi phạm gate          | Candidate bị block bởi gate FEATURE-013         | Kiểm tra audit/license ngay sau khi cài; remediation hoặc revised plan, không ignore âm thầm                     |
| GitHub Pages subpath khác localhost                       | Manifest/start_url/offline route lỗi production | Test hai base path trên production artifact và direct-navigation smoke                                           |
| Scope vẫn rộng (3 workstream)                             | Review/rollback khó                             | Thực hiện theo workstream, diff giới hạn, giữ một final snapshot; Claude có thể tách tiếp trước approval nếu cần |

## 14. Rollback plan

- Rollback content splitting: khôi phục `src/lib/content.ts` eager import
  và các consumer đồng bộ cùng snapshot; catalog/generated file bị xoá
  cùng feature.
- Rollback PWA:
  - Gỡ registration/plugin/manifest khỏi build.
  - Phát hành một cleanup service worker cùng scope để unregister và xoá
    cache `hhthcs-*`; chỉ gỡ file worker có thể để client cũ tiếp tục bị
    worker cũ kiểm soát nên không được coi là rollback đầy đủ.
  - Xác minh online/direct navigation vẫn hoạt động qua `404.html` sau
    cleanup.
- Rollback dependency mới: gỡ `vite-plugin-pwa`/`@playwright/test` khỏi
  `package.json` + lockfile cùng snapshot với code dùng chúng.
- Rollback CI/E2E: chỉ gỡ job sau khi runtime/dependency tương ứng đã
  rollback; không tắt gate để đưa candidate lỗi qua release.
- Không có database rollback vì không có migration/schema change.
- Rollback production do human/Claude thực hiện theo quyền được cấp; Codex
  chỉ chuẩn bị patch/handoff, không deploy.

## 15. Acceptance criteria

### Performance/loading

- [ ] Home render không tải full cards/questions của 17 unit.
- [ ] Lesson tải một unit; Review chỉ tải queue unit set; Exam tải selected
      scope.
- [ ] Unknown/chunk-load failure có error/retry UI và không làm mất
      progress.
- [ ] Không JavaScript chunk nào >500 kB minified; initial home JS <=250 kB
      gzip; bundle gate chứng minh content tách theo unit.
- [ ] Lộ trình, unlock, XP, streak, sao, review, exam, persistence và sync
      giữ behavior qua unit/integration/E2E regression.

### PWA/offline

- [ ] Manifest installable, icon 192/512/maskable và standalone mode đúng
      ở localhost lẫn GitHub Pages subpath.
- [ ] Sau tín hiệu cache-ready, toàn bộ 17 unit/81 lesson mở và học được
      offline.
- [ ] Direct offline navigation tới route chính hoạt động; không có
      blank/default browser offline page.
- [ ] Supabase/Auth/PostgREST/token/progress không nằm trong cache storage
      và không được service worker trả từ cache.
- [ ] Worker mới không tự reload lesson/exam; update chỉ kích hoạt sau
      user confirmation tại safe point.
- [ ] Install/offline/update UI hoạt động trên mobile viewport và có
      fallback phù hợp khi browser không hỗ trợ install prompt.

### Quality/release

- [ ] Hai công nghệ ở mục 6a được con người duyệt trước khi cài.
- [ ] Tất cả canonical + added gates ở mục 11 pass một lần trên exact
      final implementation snapshot với Evidence Binding đầy đủ.
- [ ] E2E/PWA chạy trên production build trong CI và pass trên candidate
      commit.
- [ ] README mô tả install/offline/update, giới hạn first-load và cách
      local test.
- [ ] `docs/architecture.md` và ADR 0002 được cập nhật sau khi công nghệ
      được duyệt.
- [ ] Handoff FEATURE-014 đầy đủ, không có blocker/PENDING release
      evidence bị trình bày như pass.
- [ ] Fresh Gemini và fresh Codex adversarial review không còn finding
      chưa xử lý; mọi remediation đã invalidate/rerun evidence đúng quy
      trình.
- [ ] Người dùng phê duyệt release cuối; không agent nào tự merge/deploy
      ngoài quyền được cấp.
