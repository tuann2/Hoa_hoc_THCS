# FEATURE-016: Admin xem tiến độ, chất lượng và thời gian học của từng học viên

## Status

- Status: APPROVED <!-- DRAFT | APPROVED | SUPERSEDED -->
- Owner: Claude Code
- Approved by: Human Project Owner (tuann2)
- Approved date: 2026-07-24
- Risk tier: CRITICAL
- Risk categories: authentication or authorization logic; trust boundary; migration; cross-user data access
- Escalation rationale: yêu cầu này mở quyền để một tài khoản đọc dữ liệu của người dùng khác. Theo Risk Model, mọi thay đổi auth/authorization và trust boundary đều là `CRITICAL`. Repo hiện chưa có khái niệm `admin`, nên phải thêm mô hình phân quyền mới và RLS/migration tương ứng.
- Change type: Auth, security or permissions; Application source or runtime config; Migration or destructive operation
- Quality gates: `git diff --check`; `npm run format:check`; `npm run validate-content`; `npm run lint`; `npm run typecheck`; `npm test`; `npm run build`; CI trên đúng candidate commit (bao gồm `npm audit --audit-level=moderate` và `npm run check:licenses` đã có sẵn trong CI — thoả gate "dependency vulnerability checks"); fresh Gemini review; fresh Codex adversarial review; **migration dry run + forward/rollback verification trên Supabase test project riêng**; **backup và recovery procedure validation** gồm backup dữ liệu + schema/policy/grant/function liên quan, xác nhận nơi lưu an toàn, restore rehearsal trên project test và đối chiếu row-count/checksum/catalog; **production read-only drift inventory + transactional apply/abort checks + post-apply smoke test**; **manual diff review chống lộ secret** trước khi commit (repo chưa có secret-scanning tool tự động — đây là alternative cần con người duyệt cùng lúc duyệt plan, thay cho gate "secret scanning" trong bảng gate của kiến trúc). Không gate nào ở đây cho phép áp migration lên project thật trước khi candidate pass validation, hai review `CRITICAL` hoàn tất và con người duyệt release/production rollout theo mục 6.6.

## 0. Execution assignment (đề xuất, chờ xác nhận riêng từng vai trò)

| Role                     | Agent                                                        | Model/effort      | Rationale                                                                                                                                                                    |
| ------------------------ | ------------------------------------------------------------ | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Planner                  | Claude Code                                                  | high              | Cần context đa lượt để đọc toàn bộ auth/progress/migration hiện có và tổng hợp risk CRITICAL; đã hoàn thành bản DRAFT này.                                                   |
| Implementer              | Codex (`codex:codex-rescue`)                                 | high              | Việc gồm migration SQL + RLS + RPC `security definer` + UI/hook — cần `repo-rw + shell + test`, độ chính xác cao vì là trust boundary, không phải nội dung lặp lại đơn giản. |
| Independent Reviewer (1) | agy (Gemini)                                                 | High, synchronous | Reviewer mặc định cho CRITICAL theo quy ước dự án; chỉ đọc, không sửa candidate.                                                                                             |
| Independent Reviewer (2) | Codex adversarial pass (`codex:codex-rescue`, reviewer role) | high              | CRITICAL cần verification độc lập thứ hai ngoài Gemini, tập trung vào RLS/RPC/heartbeat như một trust boundary.                                                              |
| Release Assessor         | Claude Code                                                  | medium            | Chỉ đọc handoff + evidence đã snapshot-bound theo Validation Model, không rerun engineering validation; con người vẫn là approver cuối.                                      |

Mỗi chuyển vai trò (Planner → Implementer → Reviewer → Assessor) cần một xác
nhận riêng của con người; không tự cascade sang vai trò kế tiếp trong cùng
phiên chỉ vì vai trò trước vừa được duyệt.

## 1. Objective

Cho phép tài khoản admin xem tiến độ, chất lượng và thời gian học theo ngày của
từng học viên theo chế độ chỉ đọc, ngay trong SPA hiện có, mà không làm học
sinh nhìn thấy dữ liệu của nhau và không làm suy yếu RLS hiện tại.

Mục tiêu vòng này:

1. Admin đăng nhập xong có thể mở một màn hình danh sách học viên.
2. Admin xem được thống kê tóm tắt cho từng học viên.
3. Admin bấm vào từng học viên để xem chi tiết tiến độ và chất lượng học tập.
4. Admin xem được số thời gian học của từng ngày và chọn khoảng ngày cần xem.
5. Toàn bộ quyền truy cập chéo user được chặn ở tầng dữ liệu, không chỉ bằng
   ẩn/hiện UI.

## 2. Current system analysis

- App hiện là SPA Vite + React + TypeScript, deploy tĩnh, không có backend
  riêng; dữ liệu người dùng đi thẳng từ client tới Supabase.
- `src/store/auth.ts` chỉ biết trạng thái đăng nhập học sinh thông thường
  (`session`, `user`, `displayName`), chưa có `role` hay `isAdmin`.
- `supabase/migrations/0001_init.sql` chỉ có `public.profiles` và
  `public.progress`; cả hai đều bật RLS với policy `auth.uid() = id/user_id`,
  nghĩa là mỗi người chỉ đọc/ghi hàng của chính mình.
- `src/routes/ProfileRoute.tsx` đang hiển thị thống kê cho chính người đang
  học: `totalXp`, streak, số bài 3 sao, số câu cần ôn và lịch sử thi gần đây.
- `src/store/progress.ts` và `src/lib/progressSync.ts` đã có đủ dữ liệu để suy
  ra nhiều chỉ số hữu ích cho admin: tiến độ hoàn thành, độ chính xác tốt nhất,
  số câu sai chưa ôn, lịch sử thi, ngày học gần nhất.
- Dữ liệu hiện tại chỉ lưu `lastStudyDate` và timestamp của các lần thay đổi
  tiến độ; không lưu số giây/phút học. `ExamRoute` có bộ đếm cho phiên thi đang
  mở nhưng không persist thời lượng thực tế, nên không thể suy ra báo cáo thời
  gian theo ngày từ dữ liệu cũ.
- Repo chưa có khái niệm teacher/admin portal, chưa có route bảo vệ theo vai
  trò, chưa có màn hình danh sách học viên, chưa có migration cho role hoặc
  telemetry thời gian học.

## 3. Assumptions

- "Admin" trong feature này là một nhóm nhỏ tài khoản nội bộ được người duyệt
  cấp thủ công; không có self-service tạo admin trong app.
- "Chất lượng học tập" ở vòng đầu được hiểu là các chỉ số định lượng lấy từ
  dữ liệu hiện có: accuracy, số bài 3 sao, câu sai đang chờ ôn, lịch sử thi,
  không bao gồm nhận xét định tính của giáo viên.
- Vòng đầu chỉ cần quyền xem, không cần admin chỉnh sửa tiến độ, reset dữ liệu,
  nhắn tin cho học viên hay export file.
- Không thêm backend/service runtime mới; vẫn dùng Supabase + RLS hiện có. Ngoại
  lệ hạ tầng tạm thời duy nhất là Supabase project test ở mục 6a, phải được
  người duyệt chấp thuận và quản lý vòng đời riêng.
- Không thay đổi schema `public.progress.data` và không bump
  `PROGRESS_VERSION` nếu không phát sinh blocker ngoài dự kiến.
- "Thời gian học" là ước lượng wall-clock giữa các heartbeat hợp lệ khi học viên
  đã đăng nhập, đang online, app ở foreground/focus, đang ở màn hình bài học,
  ôn tập hoặc một phiên thi đang chạy, và chưa vượt ngưỡng idle 5 phút. Các
  điều kiện client chỉ là best effort, không chứng minh người dùng thật sự chú
  ý hoặc chủ động trong toàn bộ khoảng được cộng.
- Báo cáo ngày dùng múi giờ `Asia/Ho_Chi_Minh` (GMT+7) cho toàn hệ thống. Khoảng
  ngày là inclusive, mặc định 7 ngày gần nhất và khoảng tùy chọn tối đa 365
  ngày.
- Dữ liệu thời gian chỉ bắt đầu có sau khi feature được deploy; không suy diễn
  hoặc hồi tố thời gian từ `updated_at`, XP hay lịch sử bài làm.
- Vòng đầu chỉ ghi nhận thời gian online. Việc học offline vẫn lưu tiến độ theo
  cơ chế hiện có nhưng chưa cộng vào báo cáo thời gian.
- Số liệu là telemetry hỗ trợ theo dõi, không phải bằng chứng chấm công hoặc
  giám sát thi có tính đối soát; client-side app không thể chứng minh học viên
  thực sự tập trung nếu họ chủ động can thiệp request.
- Danh tính học viên trên màn hình admin ở vòng đầu dùng `display_name` và ID;
  việc hiển thị email của user khác nằm ngoài scope cho tới khi có thiết kế
  riêng cho trust boundary đó.
- Thiết kế client-side chỉ được dùng khi số `profiles` thực tế không quá 1.000
  tại preflight. Query phải phân trang tường minh (page tối đa 500 hàng), fetch
  đến trang cuối và đối chiếu số hàng nhận được với `count`; không được coi
  response bị giới hạn mặc định của Supabase/PostgREST là danh sách đầy đủ.
  Test phải có fixture nhiều trang. Nếu count lớn hơn 1.000 hoặc không chứng
  minh được completeness, dừng và sửa plan sang server-side projection.
- Hiện chỉ có **một** Supabase project (free tier), đang phục vụ học sinh thật
  qua `profiles`/`progress`; không có project test/staging tách biệt (đã xác
  nhận với người duyệt). Vì `0002` sửa RLS trên hai bảng này, phải tạo một
  Supabase project test riêng (free tier, mirror `0001` + `0002`) chỉ để dry
  run/rollback/recovery rehearsal trước khi áp dụng lên project thật; project
  test này cũng dùng cho kịch bản Manual ở mục 11 và tuân thủ vòng đời mục 6a.
- `lastStudyDate`/`streakCurrent` hiện có (`src/store/progress.ts`) tính ranh
  giới ngày theo UTC (`date.toISOString().slice(0, 10)`), không phải theo
  GMT+7. Báo cáo thời gian học mới của feature này dùng GMT+7. Hai khái niệm
  "ngày" khác nhau này sẽ hiển thị cạnh nhau trong cùng màn hình admin
  (`lastStudyDate` cạnh `dailyStudyTime`); vòng đầu chấp nhận sự lệch này (tối
  đa 7 giờ quanh nửa đêm GMT+7) thay vì đổi lại cách tính `lastStudyDate` hiện
  có, vì đó là hành vi đã tồn tại độc lập với feature này. Ngoài lệch múi giờ,
  `lastStudyDate` hiện chỉ cập nhật khi ghi nhận kết quả phần lesson; làm bài
  thi hoặc ghi/giải quyết câu sai có thể cập nhật `progress.updated_at` và
  `examHistory` nhưng không cập nhật `lastStudyDate`. Vì vậy trường này không
  đại diện đầy đủ cho "ngày học gần nhất"; UI phải đặt nhãn/tooltip là "ngày
  học lesson gần nhất (UTC)" và hiển thị `lastSyncedAt`/lịch sử thi riêng,
  không suy diễn một mốc hoạt động gần nhất duy nhất.

## 4. Scope

- Thêm mô hình nhận diện admin tách biệt với `profiles` để học sinh không thể
  tự nâng quyền bằng API client hiện có.
- Thêm migration SQL cho bảng/quyền admin và policy đọc chéo user dành riêng
  cho admin.
- Mở rộng auth store để biết tài khoản hiện tại có phải admin hay không.
- Thêm route admin chỉ đọc:
  - danh sách học viên với thống kê tóm tắt
  - trang chi tiết một học viên
- Dùng lại dữ liệu `profiles` + `progress` hiện có để suy ra chỉ số:
  - tiến độ: tổng XP, số bài hoàn thành, phần trăm hoàn thành, streak,
    ngày học gần nhất
  - chất lượng: số bài 3 sao, accuracy trung bình/tốt nhất theo bài,
    số câu cần ôn, lịch sử thi gần đây
- Ghi nhận thời gian học chủ động bằng heartbeat được tính theo đồng hồ
  Supabase, tổng hợp thành số giây theo từng ngày GMT+7.
- Cho admin xem tổng thời gian, thời gian mỗi ngày và chọn nhanh 7/30 ngày hoặc
  khoảng ngày tùy chỉnh trên trang chi tiết học viên.
- Thêm test cho guard, helper tổng hợp số liệu và hành vi chặn truy cập khi
  không phải admin; thêm test timer/idle/visibility và tổng hợp thời gian theo
  ngày.
- Cập nhật tài liệu cấu hình/migration tối thiểu để người duyệt biết cách seed
  admin đầu tiên.

## 5. Out of scope

- UI quản trị để tạo/xóa admin hoặc phân quyền tự phục vụ.
- Export CSV/Excel/PDF, in báo cáo, gửi email hay thông báo cho học viên.
- Chỉnh sửa tiến độ, sửa hồ sơ, xóa tài khoản, impersonate user hoặc login as
  student.
- Bình luận/feedback định tính của giáo viên.
- Dashboard tổng hợp theo lớp/trường, leaderboard, biểu đồ so sánh nhiều học
  viên, analytics nâng cao.
- Theo dõi màn hình chi tiết, nội dung học viên đã đọc trong từng phút, quay
  màn hình hoặc giám sát hiện diện mang tính thi cử.
- Hồi tố thời gian học trước ngày deploy hoặc backfill thời gian học offline.
- Tùy chỉnh múi giờ theo từng học viên/admin ở vòng đầu.
- Hiển thị email của học viên khác, trừ khi plan sửa đổi sau này duyệt rõ.
- Realtime update giữa nhiều admin tabs hay subscription Realtime.

## 6. Proposed design

### 6.1. Authorization model

Không thêm cột `role` vào `public.profiles`, vì bảng này hiện cho phép user tự
`update` hàng của mình; làm vậy sẽ tạo đường tự nâng quyền.

Thiết kế tối thiểu đề xuất:

```text
auth.users
   |
   +--> public.profiles        (user tự đọc/ghi hồ sơ của mình)
   +--> public.progress        (user tự đọc/ghi tiến độ của mình)
   +--> public.admin_users     (chỉ dùng để xác định ai là admin)
```

- Tạo bảng `public.admin_users`:
  - `user_id uuid primary key references auth.users(id) on delete cascade`
  - `created_at timestamptz not null default timezone('utc', now())`
- Bật RLS cho `admin_users`.
- Không cấp policy `insert/update/delete` từ client cho bảng này.
- Chỉ cho phép user hiện tại `select` hàng của chính mình trong
  `admin_users`, để client kiểm tra `isAdmin`.
- Thêm policy `select` mới cho `profiles` và `progress` theo điều kiện:
  tồn tại hàng tương ứng trong `admin_users` của `auth.uid()`.
- Policy admin mới này phải là policy **riêng, tên khác** với
  `profiles_select_own`/`progress_select_own` đã tạo ở `0001_init.sql`
  (nhiều permissive policy trên cùng lệnh được Postgres OR lại). Migration
  `0002` không được `drop`/`alter` hai policy đó — chỉ `create policy` mới,
  để không có rủi ro vô tình khoá quyền tự đọc của học sinh khi review RLS.
- Admin chỉ có quyền đọc chéo user; không thêm quyền ghi chéo user.
- `isAdmin` phải fail-closed: khi chưa resolve xong, network lỗi, hoặc query
  `admin_users` trả lỗi, giá trị hiệu lực là `false` (không phải
  `null`/`undefined` được coi là "chưa biết nên tạm cho qua"). UI admin và
  route guard chỉ render khi `isAdmin === true` đã resolve xong.
- Mọi async resolve `displayName`/`isAdmin` và fetch báo cáo phải bind với
  generation + `user.id` của session đã khởi tạo request. Khi auth event đổi
  session/user, tăng generation, reset ngay `isAdmin=false` và dữ liệu admin,
  hủy request nếu API hỗ trợ; response cũ chỉ được commit nếu generation và
  `user.id` vẫn khớp session hiện tại. Điều này ngăn response bay lơ lửng của
  admin A làm lộ UI/dữ liệu sau khi chuyển nhanh sang tài khoản học sinh B.

### 6.2. Read model và metric derivation

Để giảm rủi ro drift logic giữa client học sinh và client admin:

- Không tạo schema progress mới.
- Không encode thêm aggregate vào database ở vòng đầu.
- Client admin fetch `profiles` + `progress` theo quyền admin rồi dùng helper
  TypeScript chung để suy ra số liệu hiển thị.
- Cột `progress.version` của học viên khác có thể thấp hơn `PROGRESS_VERSION`
  hiện tại (học viên đó chưa đăng nhập lại để client tự migrate và ghi đè).
  Helper admin phải chạy `migrateProgressState(data, storedVersion)` với
  đúng `version` lấy từ hàng đó trước khi `normalizeProgressSnapshot`, không
  được giả định mọi hàng `progress` đã ở schema hiện tại — nếu không sẽ tính
  sai hoặc crash với dữ liệu học viên cũ chưa migrate.

Helper mới nên tách riêng, ví dụ `src/lib/adminReports.ts`, với hai lớp dữ liệu:

- `AdminLearnerSummary`
  - `userId`
  - `displayName`
  - `totalXp`
  - `completedLessons`
  - `availableLessons`
  - `completionPercent`
  - `masteredLessons`
  - `pendingReviewCount`
  - `streakCurrent`
  - `lastStudyDate`
  - `lastSyncedAt`
  - `studySecondsToday`
  - `studySecondsLast7Days`
- `AdminLearnerDetail`
  - toàn bộ trường summary
  - breakdown theo phần `inorganic` / `organic`
  - danh sách bài đã hoàn thành/gần hoàn thành
  - recent exam history
  - accuracy stats từ `lessonProgress`
  - chuỗi `dailyStudyTime` theo khoảng ngày đã chọn, gồm cả ngày có giá trị 0

Nguồn metric:

- Tiến độ hoàn thành: từ `lessonProgress[*].completed`
- Chất lượng bài học: từ `stars`, `bestAccuracy`, `theory/practice.accuracy`
- Câu cần ôn: từ `wrongQuestions` với `isWrongQuestionPending`
- Chất lượng thi: từ `examHistory`
- Hoạt động gần nhất: hiển thị riêng `lastStudyDate` (chỉ lesson, UTC),
  `progress.updated_at` và thời điểm thi gần nhất nếu có; không hợp nhất thành
  một "ngày học gần nhất" có vẻ đầy đủ.
- Thời gian học: từ `study_daily_totals.active_seconds`, không suy ra từ số
  lần mutation trong progress.

Các metric này không phải dữ liệu đã được server xác thực về thành tích. Policy
`0001` cho phép học viên tự `update` `profiles` và tự `insert/update` hàng
`progress` của mình; client hiện có cũng upsert toàn bộ snapshot. Vì vậy học
viên có thể sửa `display_name`, XP, sao, accuracy, exam history hoặc dữ liệu
khác bằng client/request của chính họ mà không cần khai thác RPC heartbeat.
Dashboard phải ghi chú đây là dữ liệu tự khai từ client phục vụ hỗ trợ học tập,
không dùng cho chấm điểm/kỷ luật/đối soát danh tính; việc tạo metric
server-authoritative nằm ngoài scope.

### 6.3. Ghi nhận thời gian học

Không cho client gửi trực tiếp số phút cần cộng vì request có thể bị sửa để
làm sai báo cáo. Migration tạo hai bảng:

- `public.study_tracking_state`
  - `user_id uuid primary key references auth.users(id) on delete cascade`
  - `last_heartbeat_at timestamptz not null`
  - chỉ giữ trạng thái kỹ thuật mới nhất, không phải lịch sử chi tiết
- `public.study_daily_totals`
  - `user_id uuid references auth.users(id) on delete cascade`
  - `study_date date`
  - `active_seconds integer not null default 0`
  - `updated_at timestamptz not null`
  - primary key `(user_id, study_date)`
  - check `active_seconds between 0 and 86400`

Ba bảng mới đều bật RLS. Migration phải `REVOKE ALL` trên từng bảng khỏi
`anon`/`authenticated`, rồi chỉ `GRANT` lại đúng ma trận dưới đây; không dựa
vào default grant của project:

| DB role / principal      | `admin_users`                                                                     | `study_tracking_state`                     | `study_daily_totals`                              | `record_study_heartbeat()`                               |
| ------------------------ | --------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------- | -------------------------------------------------------- |
| `anon`                   | Không quyền                                                                       | Không quyền                                | Không quyền                                       | Không execute                                            |
| `authenticated` học viên | `SELECT` hàng chính mình qua RLS; không ghi                                       | Không quyền trực tiếp, kể cả `SELECT`      | `SELECT` hàng chính mình qua RLS; không ghi       | Được execute                                             |
| `authenticated` admin    | Chỉ `SELECT` hàng chính mình để resolve role; không liệt kê admin khác, không ghi | Không quyền trực tiếp, kể cả `SELECT`      | `SELECT` mọi học viên qua policy admin; không ghi | Được execute cho session của chính admin như user thường |
| `service_role`           | `SELECT/INSERT/UPDATE/DELETE` cho vận hành                                        | `SELECT/INSERT/UPDATE/DELETE` cho vận hành | `SELECT/INSERT/UPDATE/DELETE` cho vận hành        | Không execute; không giả heartbeat vận hành              |

`service_role` không bao giờ được đưa vào SPA; table owner/SQL dashboard vẫn
dùng cho migration/bootstrap. Không có policy client ghi
`study_tracking_state` hoặc `study_daily_totals`, và việc cấm mọi truy cập trực
tiếp `study_tracking_state` từ `authenticated` là yêu cầu bắt buộc. Function
phải `REVOKE ALL ... FROM PUBLIC, anon, service_role` rồi chỉ grant tường minh
cho `authenticated`.

Tạo RPC `public.record_study_heartbeat()` với các đặc tính:

- `security definer`, đặt `search_path` rỗng (`SET search_path = ''`) hoặc một
  whitelist tối thiểu được review; mọi object/function trong body phải
  schema-qualify đầy đủ (`public.*`, `auth.uid()`, `pg_catalog.*`). Không được
  dựa vào object lookup từ schema do caller kiểm soát.
- Kiểm tra `auth.uid()` khác null; chỉ các role trong ma trận trên được execute.
- Dùng timestamp của database; client không truyền ngày hoặc số giây.
- Xử lý cả race khi hàng state chưa tồn tại: sau khi lấy `auth.uid()`, RPC phải
  lấy transaction-scoped advisory lock theo UUID user (hoặc cơ chế
  insert-and-lock tương đương đã được test), `INSERT ... ON CONFLICT DO
NOTHING` để bảo đảm hàng tồn tại, rồi `SELECT ... FOR UPDATE` hàng đó. Chỉ
  lấy `pg_catalog.clock_timestamp()` **sau khi đã có khóa**. Không được chỉ
  `SELECT FOR UPDATE` một hàng chưa tồn tại, vì hai heartbeat đầu tiên có thể
  cùng đi qua.
- Lần gọi đầu chỉ thiết lập mốc. Lần gọi kế tiếp chỉ cộng chênh lệch nếu gap
  chính xác (trước làm tròn) từ 1 đến 60 giây inclusive; gap dài hơn được xem
  là gián đoạn và không cộng.
- Số giây ghi nhận luôn là `floor` của gap hợp lệ, không làm tròn lên. Nếu qua
  nửa đêm GMT+7, lấy `floor` số giây trước mốc nửa đêm cho ngày cũ và gán phần
  nguyên còn lại (`floor(totalGap) - oldDaySeconds`) cho ngày mới; tổng hai
  ngày phải đúng bằng `floor(totalGap)` và không âm.
- Nếu khoảng hợp lệ đi qua nửa đêm GMT+7, chia số giây đúng vào hai ngày.
- Tổng mỗi ngày được cap ở 86.400 giây và update atomically.
- Nếu gap dưới 1 giây (gọi dồn dập bất thường từ script), RPC chỉ cập nhật
  `last_heartbeat_at` và trả về sớm, không ghi thêm vào `study_daily_totals`,
  để resync mốc. Nhánh này tránh write vào bảng totals nhưng vẫn khóa và ghi
  một lần vào `study_tracking_state` cho mỗi request; không được mô tả nó như
  biện pháp rate-limit hoặc chống spam (xem risk tương ứng ở mục 13).

Client thêm helper/hook tracking dùng heartbeat mỗi 30 giây. Tracking chỉ bật
khi đồng thời thỏa:

- Supabase configured, user đã đăng nhập và browser online.
- Route đang ở bài học, ôn tập, hoặc `ExamRoute` có phase `running`.
- `document.visibilityState === 'visible'`, cửa sổ đang focus.
- Có tương tác bàn phím/pointer/touch/scroll trong 5 phút gần nhất.

Khi scope vừa bật, app gọi heartbeat để thiết lập mốc; khi scope tắt/ẩn/mất
focus, app gọi một heartbeat cuối theo best effort để giảm phần thời gian bị
thiếu rồi dừng timer. Không queue hoặc backfill heartbeat offline ở vòng đầu.

### 6.4. UI flow

- Thêm route `/admin/learners`
  - chỉ admin mới vào được
  - hỗ trợ loading, empty state, unauthorized state, fetch error state
  - có tìm kiếm/lọc nhẹ theo `displayName`
  - hiển thị thêm thời gian hôm nay và tổng 7 ngày gần nhất
- Thêm route `/admin/learners/:userId`
  - hiển thị chi tiết tiến độ và chất lượng của một học viên
  - mặc định hiển thị thời gian từng ngày trong 7 ngày gần nhất
  - có preset 7 ngày, 30 ngày và hai input ngày cho khoảng tùy chỉnh
  - validate `from <= to`, khoảng inclusive không quá 365 ngày
  - hiển thị tổng thời gian trong khoảng và bảng/biểu đồ theo từng ngày; ngày
    chưa ghi nhận hiển thị `0 phút`
  - ghi chú rõ múi giờ GMT+7 và phạm vi chỉ tính thời gian online sau rollout
  - giữ read-only hoàn toàn
- Header/Profile chỉ hiện CTA vào admin khi `isAdmin === true`.
- Route guard phía client chỉ để UX; truy cập thật vẫn phải được chặn bằng RLS
  nếu user không phải admin.

### 6.5. Bootstrap admin đầu tiên

- Migration chỉ tạo cấu trúc + policies.
- Việc thêm admin đầu tiên được người duyệt làm thủ công bằng SQL hoặc
  dashboard Supabase sau khi biết `auth.users.id` của tài khoản cần cấp quyền.
- Trước khi grant, hai người (owner và người duyệt) phải đối chiếu UUID với
  email/tài khoản trong Auth dashboard và xác nhận người nhận quyền; không seed
  UUID do người yêu cầu tự cung cấp mà chưa xác minh.
- README/runbook phải ghi rõ thao tác grant/revoke, cảnh báo không dùng anon
  client, và lưu audit tối thiểu ngoài repo: ai yêu cầu, ai duyệt/thực hiện,
  UUID nào, lý do và UTC timestamp.
- Revoke thông thường xóa row `admin_users` bằng quyền vận hành rồi kiểm tra
  request chéo user bị từ chối. Nếu tài khoản/session admin bị nghi chiếm,
  owner phải đồng thời revoke row, vô hiệu hóa/đăng xuất mọi session của tài
  khoản trong Supabase Auth, reset/rotate credential liên quan, kiểm tra Auth/
  database logs và ghi incident. Không chờ client cache tự hết hạn; auth store
  phải fail-closed/reset dữ liệu như mục 6.1.

### 6.6. Migration rollout safety (dry run, rollback, backup)

Vì hiện chỉ có một Supabase project dùng chung cho học sinh thật, và `0002`
thêm RLS trên `profiles`/`progress` (bảng đang có dữ liệu thật), rollout phải
đi đúng thứ tự dưới đây. Bước 1–5 chỉ tác động repo/project test; **không được
ghi/migrate/seed project thật trước khi bước 6 hoàn tất**.

1. Hoàn tất và freeze candidate implementation + handoff draft; ghi evidence
   anchor theo Validation Model. Trên project test tạm thời, chạy
   `0001_init.sql`, nạp fixture tổng hợp (không dùng dữ liệu học sinh thật) và
   ghi pre-migration inventory baseline của tables, columns, constraints,
   functions, policies, grants.
2. Tạo recovery point **trước migration** trên project test, không chỉ export
   thô:
   - gồm data dump của `profiles`/`progress`, DDL/schema dump có thể tái tạo
     tables, constraints, policies, grants, functions liên quan, và catalog
     inventory độc lập để đối chiếu; ghi UTC timestamp, tool/version, row count
     và checksum ổn định của dữ liệu sắp xếp theo primary key;
   - lưu artifact mã hóa ở vị trí access-controlled do Human Project Owner
     quản lý, ngoài repo và ngoài output/log của agent; ghi location reference,
     owner, access list, retention/deletion date, tuyệt đối không ghi secret;
   - xác nhận artifact có thể mở/đọc trước khi tiếp tục.
3. Chạy `0002_admin_reporting.sql` của đúng candidate trên project test. Xác
   nhận forward apply sạch và chạy toàn bộ ma trận role/CRUD/RPC ở mục 11, gồm
   revoke admin, race heartbeat đầu tiên và boundary 1/60 giây.
4. Viết/chạy `supabase/rollbacks/0002_admin_reporting_rollback.sql` (revoke
   execute, drop RPC, drop policy admin, drop 3 bảng mới theo thứ tự phụ thuộc
   ngược) ở `supabase/rollbacks/`, **không** đặt trong
   `supabase/migrations/`. So inventory sau rollback với baseline `0001`; sau
   đó cố ý thay đổi/xóa fixture, restore recovery point và đối chiếu row count
   - checksum + catalog policy/grant/function với baseline. Dư/thiếu object hay
     dữ liệu đều gate fail; chỉ rehearsal pass mới thoả recovery validation.
5. Chạy mọi quality gate còn lại và CI trên đúng candidate snapshot, hoàn tất
   handoff bound evidence. Sau đó fresh Gemini review và fresh Codex adversarial
   review phải cùng pass; finding hoặc thay đổi release artifact làm candidate
   quay lại remediation và lặp bước 1–5. Claude chỉ assessment release
   readiness từ evidence đã bind.
6. Con người xem candidate/evidence/review và duyệt rõ release **cùng quyền áp
   `0002` lên project thật**. Không có duyệt này thì dừng; test-project success
   không phải quyền production rollout.
7. Chỉ sau bước 6, người vận hành chạy preflight read-only trên project thật:
   - inventory tables/columns/constraints/policies/grants/functions hiện có và
     diff với pre-migration baseline đã test cùng các precondition mà `0002`
     giả định; drift không giải thích được, policy own thiếu/đổi, function trùng
     tên hoặc grant rộng hơn dự kiến => abort, không chạy migration và quay lại
     sửa plan/candidate;
   - tạo recovery point production ngay trước migration: data backup của
     `profiles`/`progress`, DDL/schema dump có thể khôi phục
     table/constraint/policy/grant/function bị ảnh hưởng **và** catalog
     inventory để kiểm tra. Ghi row count + checksum, xác nhận artifact mở/đọc
     được, mã hóa và lưu ở vị trí access-controlled ngoài repo theo mục 12.
     Đây là recovery point dữ liệu chính thức, không chỉ là CSV export.
8. Áp `0002` trong explicit transaction nếu Supabase SQL surface cho phép; chạy
   catalog assertions trước `COMMIT` và `ROLLBACK` ngay nếu statement/assertion
   nào lỗi. Sau commit, seed admin theo mục 6.5 rồi smoke test bằng session
   anon/student/admin: own-read của học sinh còn hoạt động, cross-user student
   bị chặn, admin chỉ đọc đúng scope, direct write/tracking-state access bị
   chặn và heartbeat hoạt động. Nếu smoke test fail, có truy cập trái phép,
   row count/checksum đổi ngoài dự kiến hoặc lỗi app nghiêm trọng: dừng rollout,
   không deploy/enable client feature, revoke admin vừa seed, chạy rollback đã
   test; nếu dữ liệu bị đổi/mất thì restore recovery point và đối chiếu lại
   checksum/catalog trước khi mở lại.

Đây là gate bắt buộc theo bảng "Required gates" của kiến trúc cho change type
"Migration or destructive operation". Repo hiện không có Supabase CLI/local
nên các bước project test/production do người vận hành chạy thủ công; từng bước,
UTC timestamp, người thực hiện, artifact reference không chứa secret, kết quả
assertion/count/checksum và exit/pass-fail phải ghi trong implementation
handoff/rollout record. Production rollout là hành động sau review + human
approval, không phải cách validate candidate.

## 6a. New technology (bỏ qua nếu không áp dụng)

Không thêm dependency hoặc service runtime mới. Tuy nhiên Supabase project test
riêng là **hạ tầng tạm thời mới** và việc duyệt plan này phải bao gồm duyệt ngoại
lệ đó:

- Human Project Owner tạo/sở hữu project trong organization do họ kiểm soát,
  chịu trách nhiệm quota/chi phí (mục tiêu free tier) và thao tác destroy.
- Chỉ dùng fixture tổng hợp; không copy production row, email hay backup học
  sinh vào project test. Project URL/key/DB credential chỉ do owner giữ, không
  commit vào repo, không đưa cho agent và không ghi vào handoff/log.
- Project chỉ phục vụ dry run, role tests, rollback và restore rehearsal ở mục
  6.6/11; không nhận traffic học sinh hoặc dùng làm staging lâu dài.
- Xóa project và credential trong vòng 7 ngày sau production smoke test pass và
  hết nhu cầu điều tra/rollback. Nếu rollout bị hủy, xóa trong vòng 7 ngày sau
  khi evidence cần thiết đã được lưu an toàn; ghi UTC deletion trong rollout
  record.

## 7. Files to create

- `docs/plans/FEATURE-016.md`
- `supabase/migrations/0002_admin_reporting.sql`
- `supabase/rollbacks/0002_admin_reporting_rollback.sql`
- `src/lib/adminReports.ts`
- `src/lib/studyTime.ts`
- `src/hooks/useStudyTimeTracker.ts`
- `src/routes/AdminLearnersRoute.tsx`
- `src/routes/AdminLearnerDetailRoute.tsx`
- `tests/lib/admin-reports.test.ts`
- `tests/lib/study-time.test.ts`
- `tests/hooks/use-study-time-tracker.test.tsx`
- `tests/routes/admin-routes.test.tsx`

## 8. Files to modify

- `src/store/auth.ts`
- `src/App.tsx`
- `src/routes/LessonRoute.tsx`
- `src/routes/ReviewRoute.tsx`
- `src/routes/ExamRoute.tsx`
- `src/routes/ProfileRoute.tsx`
- `tests/store/auth.test.ts`
- `README.md`

## 9. API and database impact

- Database:
  - thêm bảng `public.admin_users`
  - thêm bảng `public.study_tracking_state` và `public.study_daily_totals`
  - thêm RPC `public.record_study_heartbeat()` dùng database clock để cộng thời
    gian atomically
  - thêm/điều chỉnh policy `select` trên `public.profiles` và
    `public.progress` cho admin
  - thêm policy chỉ đọc phù hợp trên `public.study_daily_totals`; không mở
    client write trên hai bảng tracking
- Không đổi `public.progress.data` JSON shape.
- Không thêm backend API riêng; app tiếp tục gọi Supabase trực tiếp bằng
  `@supabase/supabase-js`.
- Nếu implementation phát hiện cần RPC báo cáo khác ngoài heartbeat hoặc cần
  service nền để backfill/cleanup, phải dừng và cập nhật plan trước khi làm
  tiếp vì đó là mở rộng trust boundary.

## 10. Implementation steps

1. Viết migration `0002_admin_reporting.sql` cho `admin_users`, hai bảng thời
   gian học, RPC heartbeat và toàn bộ RLS/grants liên quan; viết
   `0002_admin_reporting_rollback.sql` đi kèm.
2. Mở rộng `src/store/auth.ts` để resolve `isAdmin` sau khi có session, reset
   fail-closed khi logout/session hết hạn và chống stale async response bằng
   generation + `user.id` binding.
3. Tạo `studyTime.ts` và `useStudyTimeTracker.ts` cho heartbeat, online state,
   visibility/focus và idle timeout; tích hợp đúng scope vào Lesson/Review/Exam.
4. Tạo helper tổng hợp báo cáo trong `src/lib/adminReports.ts`, tái dùng logic
   hiện có của progress/content (kể cả `migrateProgressState` theo đúng
   `version` từng hàng) và điền chuỗi ngày thiếu bằng 0.
5. Tạo route danh sách học viên `/admin/learners` với search/lọc nhẹ, loading,
   unauthorized, fetch error và thời gian học gần đây.
6. Tạo route chi tiết `/admin/learners/:userId` để xem breakdown tiến độ/chất
   lượng, chọn khoảng ngày và xem thời gian từng ngày.
7. Cập nhật `App.tsx` và `ProfileRoute.tsx` để gắn route/CTA admin nhưng không
   làm rối luồng học của học sinh thường.
8. Viết test cho:
   - auth store `isAdmin`
   - helper aggregate metrics
   - heartbeat lifecycle, idle/visibility/online và date-range aggregation
   - route guard, session-switch race và render admin routes
   - role/CRUD/RPC matrix, revoke admin và concurrency/boundary của heartbeat
9. Cập nhật README/runbook cho bước seed admin đầu tiên, định nghĩa cách tính
   thời gian, giới hạn trust/online/no-history, admin incident/revoke, telemetry
   retention/deletion/audit và backup handling.
10. Freeze candidate; tạo Supabase project test theo mục 6a, chạy
    forward/rollback, role matrix và backup/restore rehearsal; chạy full quality
    gates + CI trên cùng snapshot và hoàn tất handoff evidence không chứa secret.
11. Chạy fresh Gemini review và fresh Codex adversarial review cho `CRITICAL`;
    mọi finding quay lại remediation và lặp bước 10 + cả hai review.
12. Claude assessment release readiness, sau đó con người duyệt release và cấp
    quyền production rollout rõ ràng.
13. Chỉ sau bước 12 mới chạy production read-only drift preflight, tạo recovery
    point production, áp `0002`, seed admin và smoke/abort checks theo mục 6.6.
    Không gộp hoặc đưa bước này lên trước validation/review/approval.

## 11. Test strategy

- Unit:
  - helper aggregate đúng với snapshot rỗng, snapshot đủ dữ liệu, snapshot có
    entry lỗi/missing
  - fetch phân trang qua ít nhất 3 page, đối chiếu count/completeness và không
    cắt ở giới hạn hàng mặc định của Supabase/PostgREST
  - date range inclusive, điền ngày 0, giới hạn 365 ngày và format giây/phút
  - heartbeat chỉ chạy khi đủ điều kiện; pause/resume đúng theo online,
    visibility, focus, idle và route scope bằng fake timers
  - `isAdmin` transition đúng khi initialize, sign-in, sign-out, session đổi
  - `isAdmin` fail-closed về `false` khi query `admin_users` lỗi/timeout,
    không giữ trạng thái "chưa biết" cho phép render admin UI
  - đổi nhanh admin A → student B trong khi resolve/fetch của A còn pending;
    response A về sau phải bị bỏ, không restore `isAdmin` hoặc data cũ
- Route/component:
  - non-admin bị chặn khỏi `/admin/learners`
  - admin thấy danh sách học viên và điều hướng vào trang chi tiết
  - admin đổi preset/custom range và thấy đúng tổng + từng ngày
  - range sai hoặc dài hơn 365 ngày bị chặn trước khi query
  - fetch lỗi/không có dữ liệu hiển thị state phù hợp
- Regression:
  - luồng học sinh thường (`/`, `/learn`, `/review`, `/exam`, `/profile`,
    `/auth`) không đổi hành vi
  - sync tiến độ hiện tại không bị ảnh hưởng
  - app local-only/offline vẫn học được dù không gửi heartbeat
- Negative/security:
  - user thường không thấy CTA admin và bị chặn khi gõ URL trực tiếp
  - request chéo user từ tài khoản không phải admin bị RLS chặn
  - admin chỉ đọc được dữ liệu cần thiết, không có đường ghi chéo user
  - chạy ma trận CRUD/RPC bằng JWT/session thật của từng role:
    - `anon`: không `SELECT/INSERT/UPDATE/DELETE` được cả ba bảng mới, không
      execute heartbeat
    - student `authenticated`: chỉ select own row ở `admin_users` (thường rỗng)
      và own totals; không direct read/write `study_tracking_state`, không ghi
      bảng nào, không đọc totals/profiles/progress của user khác; execute
      heartbeat chỉ cho chính `auth.uid()`
    - admin `authenticated`: select chéo `profiles`/`progress`/totals nhưng
      không ghi chéo, không đọc/ghi trực tiếp tracking state và không liệt kê
      row admin khác
    - `service_role`: thao tác vận hành đúng grants nhưng key không xuất hiện
      trong client bundle/diff/log
  - grant admin rồi revoke row ngay trong lúc session còn sống; request tiếp
    theo phải mất quyền cross-user và UI phải fail-closed sau refresh auth
  - hai heartbeat đầu đồng thời khi chưa có state row chỉ tạo một row/mốc và
    không cộng trùng; lặp lại concurrency khi row đã tồn tại
  - test gap chính xác dưới 1 giây, đúng 1 giây, phân số trên 1 giây, đúng 60
    giây và trên 60 giây; xác nhận quy tắc floor, cap và không cộng gap invalid
  - heartbeat qua nửa đêm GMT+7 được chia đúng hai ngày
- Manual:
  - trên Supabase test project riêng (mục 6.6): áp dụng `0002`, seed 1 admin +
    2 học sinh; xác minh admin xem được cả hai, học sinh A không xem được dữ
    liệu học sinh B
  - trên project test: áp dụng `0002_admin_reporting_rollback.sql`, xác nhận
    catalog quay lại đúng trạng thái chỉ có `0001`
  - tạo recovery point trên fixture test, phá dữ liệu/catalog theo kịch bản,
    restore thử và xác nhận row-count/checksum + policy/grant/function inventory
    khớp trước khi candidate được review
  - học online ít nhất 2 phút, chuyển tab/để idle rồi kiểm tra chỉ phần active
    theo điều kiện client được ước lượng; đổi date range và đối chiếu số liệu
  - sau human approval: production drift inventory, backup verification,
    transactional apply/catalog assertions và smoke/abort test đúng thứ tự mục
    6.6; không dùng production để thay thế bất kỳ test nào phía trên

## 12. Security considerations

- Vì đây là feature đọc dữ liệu của người khác, mọi kiểm soát thật phải nằm ở
  Supabase RLS; client guard chỉ là trải nghiệm người dùng.
- Không dùng `profiles.role` hoặc field nào user tự cập nhật để quyết định
  quyền admin.
- Không cấp policy ghi chéo user cho admin ở vòng đầu.
- Không mở rộng scope sang email hay thông tin nhạy cảm khác của học sinh nếu
  chưa có thiết kế được duyệt riêng.
- `display_name` và toàn bộ metric lấy từ `progress` (XP, sao, accuracy,
  exam history...) là dữ liệu user có thể tự update/upsert theo `0001`; admin
  dashboard không được trình bày chúng như thành tích hoặc danh tính đã được
  server xác minh. Giới hạn trust phải hiện trong UI và runbook như mục 6.2.
- Client không được gửi số giây hoặc ngày để cộng; RPC dùng database clock,
  serialize theo user, giới hạn gap và cap tổng ngày để giảm khả năng giả mạo
  hoặc cộng trùng.
- Chỉ lưu tổng số giây theo ngày, không lưu lịch sử URL/nội dung hoặc timeline
  chi tiết, nhằm giảm lượng telemetry nhạy cảm mà admin có thể đọc.
- Retention telemetry: `study_tracking_state` chỉ giữ mốc hiện tại; totals chỉ
  giữ rolling 365 ngày để khớp khoảng báo cáo tối đa. Vì vòng đầu không thêm
  scheduler, owner chạy cleanup có kiểm soát ít nhất mỗi tháng, ghi UTC + row
  count trước/sau; account deletion/erasure phải xóa cả state/totals (FK
  cascade được test). Nếu không vận hành được cleanup này, dừng release và sửa
  plan thay vì giữ dữ liệu vô hạn.
- Recovery point/CSV/dump chứa dữ liệu học sinh phải mã hóa, access-controlled,
  nằm ngoài repo/agent logs, có owner và access audit. Xóa trong 30 ngày sau
  rollout thành công hoặc ngay khi incident/rollback liên quan đóng, tùy mốc
  nào đến sau; ghi UTC deletion. Không dùng backup production làm fixture test.
- Audit vòng đầu dùng Supabase Auth/database logs kết hợp change record do owner
  giữ cho grant/revoke admin, migration/rollback/restore, backup access và
  telemetry cleanup/deletion. Feature chưa có per-read application audit log;
  UI/runbook phải công khai giới hạn này, và nếu cần audit từng lượt xem phải
  sửa plan/trust boundary trước khi triển khai.
- RPC `security definer` phải có `search_path` rỗng/whitelist an toàn, mọi
  reference schema-qualified, quyền execute đúng ma trận mục 6.3 và được review
  adversarial như một trust boundary `CRITICAL`.
- Các helper tổng hợp phải xử lý dữ liệu `progress` hỏng/missing theo hướng
  fail-safe, không crash toàn bộ dashboard.

## 13. Risks

| Risk                                                                            | Impact                                                         | Mitigation                                                                                                                                         |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Đặt role admin vào bảng user tự sửa được                                        | Học sinh tự nâng quyền                                         | Tách `admin_users` riêng, không có client write policy                                                                                             |
| Policy admin viết sai                                                           | Lộ dữ liệu chéo user hoặc chặn nhầm admin                      | CRITICAL review bắt buộc, manual RLS verification với admin và non-admin                                                                           |
| Logic tổng hợp metric lệch logic app học sinh                                   | Báo cáo admin sai số                                           | Dùng helper chung từ dữ liệu hiện có, test snapshot cụ thể, tránh duplicate rule                                                                   |
| Học viên tự sửa snapshot `progress`/`display_name` qua quyền own-write hiện có  | Admin hiểu dữ liệu tự khai là thành tích/danh tính đã xác minh | Gắn nhãn trust limitation trong UI/runbook; không dùng cho quyết định chấm điểm/kỷ luật; server-authoritative metrics ngoài scope                  |
| Tab mở nền/không tương tác làm tăng thời gian                                   | Báo cáo cao hơn thực tế                                        | Chỉ heartbeat khi visible + focused + chưa idle 5 phút; gap server tối đa 60 giây                                                                  |
| Nhiều tab/thiết bị cùng gửi heartbeat                                           | Cộng trùng thời gian                                           | Serialize một `study_tracking_state` theo user và cộng chênh lệch server time atomically                                                           |
| Hai heartbeat đầu cùng chạy khi state row chưa tồn tại                          | Duplicate/race hoặc cộng sai mốc đầu                           | Advisory transaction lock + insert-on-conflict + row lock; lấy clock sau khóa; test concurrent first-call                                          |
| Học viên chủ động tự động hóa heartbeat                                         | Số liệu cao hơn thời gian học thật                             | Giới hạn theo server wall-clock và ghi rõ đây là telemetry tham khảo; chống gian lận cần backend/proctoring ngoài scope                            |
| Request heartbeat dưới 1 giây vẫn khóa/ghi state mỗi lần                        | Write amplification, nghẽn DB hoặc vượt quota free tier        | Ghi nhận đây không phải rate limit; test/monitor request và DB write load, abort rollout nếu vượt quota; rate limiting cần plan mới                |
| Học offline hoặc trước rollout không có telemetry                               | Báo cáo thấp hơn thực tế                                       | Ghi chú rõ giới hạn trong UI/runbook; không suy diễn/backfill dữ liệu không đáng tin                                                               |
| Lệch ngày quanh nửa đêm                                                         | Thời gian vào sai ngày                                         | Database chia interval theo `Asia/Ho_Chi_Minh`; test boundary GMT+7                                                                                |
| RPC `security definer` cấu hình sai                                             | Leo quyền hoặc sửa dữ liệu ngoài scope                         | Empty/safe-whitelist `search_path`, fully-qualified references, explicit grants, validate `auth.uid()`, CRITICAL review                            |
| Tải toàn bộ progress client-side thiếu/chậm khi số user tăng                    | Dashboard sai hoặc chậm                                        | Ngưỡng 1.000, page <=500, count/completeness test; dừng sửa plan nếu cần server-side projection                                                    |
| Async response của session admin cũ về sau khi đổi account                      | Lộ dữ liệu/quyền admin trong UI user mới                       | Bind generation + user ID, reset fail-closed, bỏ/cancel stale responses và test race                                                               |
| Cấp nhầm hoặc chiếm tài khoản admin                                             | Truy cập trái phép dữ liệu học sinh                            | Hai người xác minh identity; runbook revoke session/row, rotate credential, inspect logs và ghi incident                                           |
| Telemetry/backup giữ quá lâu hoặc truy cập không được audit                     | Tăng tác động khi lộ dữ liệu học sinh                          | Rolling 365 ngày, cleanup/deletion record; encrypted backup 30-day policy, access-controlled ngoài repo                                            |
| Admin route làm rối UI học sinh                                                 | UX giảm                                                        | Ẩn hoàn toàn CTA/route affordance với non-admin; giữ entry admin gọn trong Profile/header                                                          |
| Chỉ có 1 Supabase project dùng chung, `0002` thêm RLS trên bảng có dữ liệu thật | Migration lỗi có thể khoá own-read hoặc gây downtime           | Validate/review/human approve trước production; drift preflight, schema+data recovery point, transactional apply, smoke/abort/restore theo mục 6.6 |
| `lastStudyDate` chỉ phản ánh lesson theo UTC, không phản ánh exam/review đầy đủ | Admin hiểu nhầm đây là ngày hoạt động gần nhất                 | Nhãn rõ "lesson/UTC", hiển thị sync/exam riêng; không gộp với daily time GMT+7 thành một mốc duy nhất                                              |

## 14. Rollback plan

- Client: revert route/helper/auth-store changes rồi redeploy; học sinh quay về
  luồng cũ, không đụng dữ liệu local hiện có.
- Database: revoke/drop RPC heartbeat, drop policy admin + các bảng
  `admin_users`, `study_tracking_state`, `study_daily_totals` nếu cần vô hiệu
  feature. Vì feature không đổi `progress.data`, rollback không cần migrate
  ngược tiến độ.
- Nếu đã seed admin rows, xóa các row tương ứng khỏi `admin_users` trước hoặc
  cùng lúc rollback policy.
- Việc drop `study_daily_totals` làm mất lịch sử thời gian đã ghi nhận; trước
  rollback production cần người duyệt quyết định export hoặc chấp nhận xóa.

## 15. Acceptance criteria

- [ ] Có thể seed ít nhất 1 tài khoản admin bằng thao tác thủ công được tài liệu
      hóa rõ ràng.
- [ ] Tài khoản admin đăng nhập vào app thấy được màn hình danh sách học viên
      và mở được chi tiết từng học viên.
- [ ] Mỗi học viên có ít nhất các chỉ số: tổng XP, tiến độ hoàn thành, số bài
      3 sao, số câu cần ôn, streak, ngày học gần nhất, lịch sử thi gần đây.
- [ ] Khi học viên đăng nhập và học online ở lesson/review/exam, hệ thống ghi
      nhận ước lượng wall-clock giữa heartbeat hợp lệ theo điều kiện client;
      tab ẩn, mất focus, offline hoặc idle trên 5 phút không tiếp tục phát
      heartbeat định kỳ. UI nêu rõ telemetry này không chứng minh focus/idle
      thật và có thể bị user can thiệp như risk mục 13.
- [ ] Admin thấy thời gian hôm nay và 7 ngày gần nhất ở danh sách học viên.
- [ ] Trong chi tiết học viên, admin chọn được preset 7/30 ngày hoặc khoảng tùy
      chỉnh tối đa 365 ngày và thấy tổng thời gian cùng số giờ/phút từng ngày,
      gồm cả ngày 0 phút.
- [ ] Báo cáo ngày dùng GMT+7, chia đúng thời gian qua nửa đêm và ghi chú rõ
      không có dữ liệu hồi tố/offline trong vòng đầu.
- [ ] UI gọi `lastStudyDate` là ngày lesson gần nhất theo UTC, không trình bày
      nó như ngày hoạt động đầy đủ; sync time và exam history hiển thị riêng.
- [ ] UI/runbook nêu rõ `display_name` và metric progress là dữ liệu client có
      thể tự sửa, không phải danh tính/thành tích server-authoritative.
- [ ] Tài khoản học sinh thường không thấy affordance admin và không truy cập
      được dữ liệu học viên khác bằng UI hoặc request trực tiếp.
- [ ] Client không thể ghi trực tiếp số giây/ngày; heartbeat dùng database
      clock sau khi khóa, chống race cả lần gọi đầu/nhiều tab, floor giây và
      chỉ nhận raw gap từ 1 đến 60 giây inclusive.
- [ ] Ma trận GRANT/REVOKE/RLS mục 6.3 pass cho anon/student/admin/service_role;
      `authenticated` không truy cập trực tiếp `study_tracking_state`, và
      revoke admin có hiệu lực với request tiếp theo của session còn sống.
- [ ] Đổi nhanh session không cho stale `isAdmin`/report response của user cũ
      commit vào state của user mới.
- [ ] Feature không đổi schema `public.progress.data`, không làm hỏng sync hoặc
      luồng học hiện tại của học sinh.
- [ ] `git diff --check`, `npm run format:check`, `npm run validate-content`,
      `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` pass.
- [ ] Fresh Gemini review và fresh Codex adversarial review cho candidate
      `CRITICAL` hoàn tất trước release.
- [ ] Migration `0002` và rollback tương ứng đã dry-run thành công trên một
      Supabase project test riêng (không phải project đang phục vụ học sinh
      thật); restore rehearsal khôi phục đúng row-count/checksum và catalog
      policy/grant/function; kết quả ghi trong handoff.
- [ ] Candidate pass full gates/CI, cả hai review `CRITICAL`, Claude release
      readiness assessment và human release/production approval **trước** mọi
      thao tác migration/seed trên project thật.
- [ ] Sau human approval, production read-only inventory không có drift chưa
      giải thích; recovery point ngay trước migration gồm data
      `profiles`/`progress` và schema/policy/grant/function liên quan, có
      row-count/checksum, mở đọc được và lưu mã hóa/access-controlled ngoài repo.
- [ ] Chỉ sau các gate trên, `0002` được áp transactionally nếu platform cho
      phép, seed admin đã xác minh và pass smoke test anon/student/admin; mọi
      abort condition ở mục 6.6 kích hoạt dừng/rollback/restore tương ứng.
- [ ] Admin grant/revoke/compromise runbook và telemetry/backup
      retention/deletion/audit policy ở mục 6.5/12 được tài liệu hóa, có owner.
- [ ] Migration `0002` không `drop`/`alter` hai policy `profiles_select_own`
      và `progress_select_own` đã có từ `0001`.
