# FEATURE-016: Admin xem tiến độ, chất lượng và thời gian học của từng học viên

## Status

- Status: DRAFT <!-- DRAFT | APPROVED | SUPERSEDED -->
- Owner: Claude Code
- Approved by:
- Approved date:
- Risk tier: CRITICAL
- Risk categories: authentication or authorization logic; trust boundary; migration; cross-user data access
- Escalation rationale: yêu cầu này mở quyền để một tài khoản đọc dữ liệu của người dùng khác. Theo Risk Model, mọi thay đổi auth/authorization và trust boundary đều là `CRITICAL`. Repo hiện chưa có khái niệm `admin`, nên phải thêm mô hình phân quyền mới và RLS/migration tương ứng.
- Change type: Auth, security or permissions; Application source or runtime config; Migration or destructive operation
- Quality gates: `git diff --check`; `npm run format:check`; `npm run validate-content`; `npm run lint`; `npm run typecheck`; `npm test`; `npm run build`; CI trên đúng candidate commit (bao gồm `npm audit --audit-level=moderate` và `npm run check:licenses` đã có sẵn trong CI — thoả gate "dependency vulnerability checks"); fresh Gemini review; fresh Codex adversarial review; **migration dry run + forward/rollback verification trên Supabase test project riêng** (gate bắt buộc cho change type "Migration or destructive operation", repo chưa có Supabase CLI/local nên dry run thực hiện bằng cách chạy `0002` trên một project Supabase free-tier riêng, tách khỏi project đang phục vụ học sinh thật); **backup/export `profiles` và `progress` trên project thật ngay trước khi áp dụng `0002`** (gate "backup and recovery procedure validation"); **manual diff review chống lộ secret** trước khi commit (repo chưa có secret-scanning tool tự động — đây là alternative cần con người duyệt cùng lúc duyệt plan, thay cho gate "secret scanning" trong bảng gate của kiến trúc)

## 0. Execution assignment (đề xuất, chờ xác nhận riêng từng vai trò)

| Role | Agent | Model/effort | Rationale |
| --- | --- | --- | --- |
| Planner | Claude Code | high | Cần context đa lượt để đọc toàn bộ auth/progress/migration hiện có và tổng hợp risk CRITICAL; đã hoàn thành bản DRAFT này. |
| Implementer | Codex (`codex:codex-rescue`) | high | Việc gồm migration SQL + RLS + RPC `security definer` + UI/hook — cần `repo-rw + shell + test`, độ chính xác cao vì là trust boundary, không phải nội dung lặp lại đơn giản. |
| Independent Reviewer (1) | agy (Gemini) | High, synchronous | Reviewer mặc định cho CRITICAL theo quy ước dự án; chỉ đọc, không sửa candidate. |
| Independent Reviewer (2) | Codex adversarial pass (`codex:codex-rescue`, reviewer role) | high | CRITICAL cần verification độc lập thứ hai ngoài Gemini, tập trung vào RLS/RPC/heartbeat như một trust boundary. |
| Release Assessor | Claude Code | medium | Chỉ đọc handoff + evidence đã snapshot-bound theo Validation Model, không rerun engineering validation; con người vẫn là approver cuối. |

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
- Không thêm backend/service mới; vẫn dùng Supabase + RLS hiện có.
- Không thay đổi schema `public.progress.data` và không bump
  `PROGRESS_VERSION` nếu không phát sinh blocker ngoài dự kiến.
- "Thời gian học" là thời gian chủ động khi học viên đã đăng nhập, đang online,
  app ở foreground/focus, đang ở màn hình bài học, ôn tập hoặc một phiên thi
  đang chạy, và chưa vượt ngưỡng idle 5 phút.
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
- Số lượng học viên ban đầu đủ nhỏ để fetch danh sách dạng client-side có phân
  trang/lọc nhẹ; nếu triển khai phát hiện quy mô lớn hơn, phải dừng và sửa plan.
- Hiện chỉ có **một** Supabase project (free tier), đang phục vụ học sinh thật
  qua `profiles`/`progress`; không có project test/staging tách biệt (đã xác
  nhận với người duyệt). Vì `0002` sửa RLS trên hai bảng này, phải tạo một
  Supabase project test riêng (free tier, mirror `0001` + `0002`) chỉ để dry
  run/rollback-test trước khi áp dụng lên project thật; project test này cũng
  dùng cho kịch bản Manual ở mục 11.
- `lastStudyDate`/`streakCurrent` hiện có (`src/store/progress.ts`) tính ranh
  giới ngày theo UTC (`date.toISOString().slice(0, 10)`), không phải theo
  GMT+7. Báo cáo thời gian học mới của feature này dùng GMT+7. Hai khái niệm
  "ngày" khác nhau này sẽ hiển thị cạnh nhau trong cùng màn hình admin
  (`lastStudyDate` cạnh `dailyStudyTime`); vòng đầu chấp nhận sự lệch này (tối
  đa 7 giờ quanh nửa đêm GMT+7) thay vì đổi lại cách tính `lastStudyDate` hiện
  có, vì đó là hành vi đã tồn tại độc lập với feature này — nhưng UI phải ghi
  chú rõ để admin không hiểu nhầm hai chỉ số cùng một mốc thời gian.

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
- Hoạt động gần nhất: từ `lastStudyDate` và `progress.updated_at`
- Thời gian học: từ `study_daily_totals.active_seconds`, không suy ra từ số
  lần mutation trong progress.

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

Hai bảng đều bật RLS. Client không được `insert/update/delete` trực tiếp:

- Học viên chỉ được đọc tổng thời gian của chính mình.
- Admin được đọc tổng thời gian của mọi học viên.
- Không có policy cho client ghi `study_tracking_state` hoặc
  `study_daily_totals`.

Tạo RPC `public.record_study_heartbeat()` với các đặc tính:

- `security definer`, cố định `search_path`, kiểm tra `auth.uid()` và chỉ grant
  `execute` cho role `authenticated`.
- Dùng timestamp của database; client không truyền ngày hoặc số giây.
- Khóa/serialize hàng `study_tracking_state` theo user để heartbeat đồng thời
  từ nhiều tab/thiết bị không cộng trùng cùng một khoảng thời gian.
- Lần gọi đầu chỉ thiết lập mốc. Lần gọi kế tiếp chỉ cộng chênh lệch nếu gap
  hợp lệ từ 1 đến 60 giây; gap dài hơn được xem là gián đoạn và không cộng.
- Nếu khoảng hợp lệ đi qua nửa đêm GMT+7, chia số giây đúng vào hai ngày.
- Tổng mỗi ngày được cap ở 86.400 giây và update atomically.
- Thu hồi quyền execute mặc định của `public`/`anon`.
- Nếu gap dưới 1 giây (gọi dồn dập bất thường từ script), RPC chỉ cập nhật
  `last_heartbeat_at` và trả về sớm, không ghi thêm vào `study_daily_totals`,
  để giảm write amplification khi client bị gọi ngoài luồng UI bình thường.

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
- README/runbook phải ghi rõ thao tác seed này và cảnh báo không dùng anon
  client để làm việc đó.

### 6.6. Migration rollout safety (dry run, rollback, backup)

Vì hiện chỉ có một Supabase project dùng chung cho học sinh thật, và `0002`
sửa RLS trên `profiles`/`progress` (bảng đang có dữ liệu thật), rollout phải
đi qua các bước sau, theo đúng thứ tự, trước khi chạm vào project thật:

1. Tạo một Supabase project test riêng (free tier), chạy `0001_init.sql` rồi
   `0002_admin_reporting.sql` trên đó để dry run — xác nhận áp dụng sạch,
   không lỗi, và các policy/RPC hoạt động đúng như thiết kế (admin đọc được
   chéo user, non-admin không đọc được).
2. Viết file rollback tương ứng
   `supabase/rollbacks/0002_admin_reporting_rollback.sql` (revoke execute,
   drop RPC, drop policy admin, drop 3 bảng mới theo đúng thứ tự phụ thuộc
   ngược) và test áp dụng thử trên project test — xác nhận sau rollback,
   project test quay lại đúng trạng thái như chỉ có `0001`. Đặt ở thư mục
   riêng `supabase/rollbacks/`, **không** để trong `supabase/migrations/` —
   nếu repo sau này dùng Supabase CLI (tự áp mọi file trong `migrations/`
   theo thứ tự tên), một file rollback nằm cạnh `0002_admin_reporting.sql`
   sẽ bị tự động chạy ngay sau migration, tự huỷ thay đổi vừa áp.
3. Trên project thật, trước khi chạy `0002`: backup/export `public.profiles`
   và `public.progress` (Table Editor → export CSV, hoặc `copy ... to` qua
   SQL Editor) làm điểm khôi phục nếu migration hoặc policy mới gây sự cố
   không lường trước trên dữ liệu học sinh đang hoạt động.
4. Áp dụng `0002` lên project thật, seed admin đầu tiên theo mục 6.5, rồi mới
   tiếp tục review/release.

Đây là gate bắt buộc theo bảng "Required gates" của kiến trúc cho change type
"Migration or destructive operation" (migration dry run; forward/rollback
verification; backup and recovery procedure validation) — repo hiện không có
Supabase CLI/local nên gate này chạy thủ công theo quy trình trên, không phải
một lệnh npm; kết quả từng bước phải ghi lại trong implementation handoff.

## 6a. New technology (bỏ qua nếu không áp dụng)

Không áp dụng. Feature này không thêm dependency, service hoặc infra mới;
trọng tâm là migration + RLS/RPC + UI/reporting.

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
   `0002_admin_reporting_rollback.sql` đi kèm. Tạo Supabase project test,
   dry run cả hai file theo mục 6.6, ghi lại kết quả.
2. Backup `profiles`/`progress` trên project thật rồi áp dụng `0002` lên
   project thật theo đúng thứ tự ở mục 6.6.
3. Mở rộng `src/store/auth.ts` để resolve `isAdmin` sau khi có session, đồng
   thời reset cờ này đúng khi logout/session hết hạn.
4. Tạo `studyTime.ts` và `useStudyTimeTracker.ts` cho heartbeat, online state,
   visibility/focus và idle timeout; tích hợp đúng scope vào Lesson/Review/Exam.
5. Tạo helper tổng hợp báo cáo trong `src/lib/adminReports.ts`, tái dùng logic
   hiện có của progress/content (kể cả `migrateProgressState` theo đúng
   `version` từng hàng) và điền chuỗi ngày thiếu bằng 0.
6. Tạo route danh sách học viên `/admin/learners` với search/lọc nhẹ, loading,
   unauthorized, fetch error và thời gian học gần đây.
7. Tạo route chi tiết `/admin/learners/:userId` để xem breakdown tiến độ/chất
   lượng, chọn khoảng ngày và xem thời gian từng ngày.
8. Cập nhật `App.tsx` và `ProfileRoute.tsx` để gắn route/CTA admin nhưng không
   làm rối luồng học của học sinh thường.
9. Viết test cho:
   - auth store `isAdmin`
   - helper aggregate metrics
   - heartbeat lifecycle, idle/visibility/online và date-range aggregation
   - route guard và render admin routes
10. Cập nhật README/runbook cho bước seed admin đầu tiên, định nghĩa cách tính
    thời gian và giới hạn online/no-history của vòng đầu.
11. Chạy full quality gates + thực hiện review bắt buộc cho `CRITICAL`.

## 11. Test strategy

- Unit:
  - helper aggregate đúng với snapshot rỗng, snapshot đủ dữ liệu, snapshot có
    entry lỗi/missing
  - date range inclusive, điền ngày 0, giới hạn 365 ngày và format giây/phút
  - heartbeat chỉ chạy khi đủ điều kiện; pause/resume đúng theo online,
    visibility, focus, idle và route scope bằng fake timers
  - `isAdmin` transition đúng khi initialize, sign-in, sign-out, session đổi
  - `isAdmin` fail-closed về `false` khi query `admin_users` lỗi/timeout,
    không giữ trạng thái "chưa biết" cho phép render admin UI
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
  - anon không execute được heartbeat; authenticated user không ghi trực tiếp
    hoặc đọc tổng thời gian của user khác
  - heartbeat gọi đồng thời không cộng trùng; gap trên 60 giây không được cộng
  - heartbeat qua nửa đêm GMT+7 được chia đúng hai ngày
- Manual:
  - trên Supabase test project riêng (mục 6.6): áp dụng `0002`, seed 1 admin +
    2 học sinh; xác minh admin xem được cả hai, học sinh A không xem được dữ
    liệu học sinh B
  - trên project test: áp dụng `0002_admin_reporting_rollback.sql`, xác nhận
    quay lại đúng trạng thái chỉ có `0001` trước khi áp dụng lên project thật
  - học online ít nhất 2 phút, chuyển tab/để idle rồi kiểm tra chỉ phần active
    được cộng; đổi date range trên admin và đối chiếu số liệu

## 12. Security considerations

- Vì đây là feature đọc dữ liệu của người khác, mọi kiểm soát thật phải nằm ở
  Supabase RLS; client guard chỉ là trải nghiệm người dùng.
- Không dùng `profiles.role` hoặc field nào user tự cập nhật để quyết định
  quyền admin.
- Không cấp policy ghi chéo user cho admin ở vòng đầu.
- Không mở rộng scope sang email hay thông tin nhạy cảm khác của học sinh nếu
  chưa có thiết kế được duyệt riêng.
- Client không được gửi số giây hoặc ngày để cộng; RPC dùng database clock,
  serialize theo user, giới hạn gap và cap tổng ngày để giảm khả năng giả mạo
  hoặc cộng trùng.
- Chỉ lưu tổng số giây theo ngày, không lưu lịch sử URL/nội dung hoặc timeline
  chi tiết, nhằm giảm lượng telemetry nhạy cảm mà admin có thể đọc.
- RPC `security definer` phải có `search_path` cố định, quyền execute tối thiểu
  và được review adversarial như một trust boundary `CRITICAL`.
- Các helper tổng hợp phải xử lý dữ liệu `progress` hỏng/missing theo hướng
  fail-safe, không crash toàn bộ dashboard.

## 13. Risks

| Risk                                                            | Impact                                    | Mitigation                                                                                                              |
| --------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Đặt role admin vào bảng user tự sửa được                        | Học sinh tự nâng quyền                    | Tách `admin_users` riêng, không có client write policy                                                                  |
| Policy admin viết sai                                           | Lộ dữ liệu chéo user hoặc chặn nhầm admin | CRITICAL review bắt buộc, manual RLS verification với admin và non-admin                                                |
| Logic tổng hợp metric lệch logic app học sinh                   | Báo cáo admin sai số                      | Dùng helper chung từ dữ liệu hiện có, test snapshot cụ thể, tránh duplicate rule                                        |
| Tab mở nền/không tương tác làm tăng thời gian                   | Báo cáo cao hơn thực tế                   | Chỉ heartbeat khi visible + focused + chưa idle 5 phút; gap server tối đa 60 giây                                       |
| Nhiều tab/thiết bị cùng gửi heartbeat                           | Cộng trùng thời gian                      | Serialize một `study_tracking_state` theo user và cộng chênh lệch server time atomically                                |
| Học viên chủ động tự động hóa heartbeat                         | Số liệu cao hơn thời gian học thật        | Giới hạn theo server wall-clock và ghi rõ đây là telemetry tham khảo; chống gian lận cần backend/proctoring ngoài scope |
| Học offline hoặc trước rollout không có telemetry               | Báo cáo thấp hơn thực tế                  | Ghi chú rõ giới hạn trong UI/runbook; không suy diễn/backfill dữ liệu không đáng tin                                    |
| Lệch ngày quanh nửa đêm                                         | Thời gian vào sai ngày                    | Database chia interval theo `Asia/Ho_Chi_Minh`; test boundary GMT+7                                                     |
| RPC `security definer` cấu hình sai                             | Leo quyền hoặc sửa dữ liệu ngoài scope    | Fixed `search_path`, revoke public/anon, validate `auth.uid()`, CRITICAL adversarial review                             |
| Tải toàn bộ progress client-side kém hiệu năng khi số user tăng | Dashboard chậm                            | Giới hạn scope quy mô nhỏ; thêm search/lọc nhẹ; dừng sửa plan nếu cần server-side projection                            |
| Admin route làm rối UI học sinh                                 | UX giảm                                   | Ẩn hoàn toàn CTA/route affordance với non-admin; giữ entry admin gọn trong Profile/header                               |
| Chỉ có 1 Supabase project dùng chung, `0002` sửa RLS bảng đã có dữ liệu thật | Migration lỗi có thể khoá quyền tự đọc của học sinh hoặc gây downtime | Dry run + rollback test trên Supabase project test riêng trước (mục 6.6); backup `profiles`/`progress` ngay trước khi áp dụng lên project thật; policy admin mới là policy riêng, không sửa policy `0001` |
| `lastStudyDate`/streak (UTC) và báo cáo thời gian mới (GMT+7) lệch ranh giới ngày | Admin hiểu nhầm hai chỉ số cùng phản ánh một ngày | Ghi chú rõ trong UI/README rằng hai chỉ số dùng quy ước ngày khác nhau; không gộp chung một cột ngày duy nhất |

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
      nhận thời gian chủ động; tab ẩn, mất focus, offline hoặc idle trên 5 phút
      không tiếp tục cộng.
- [ ] Admin thấy thời gian hôm nay và 7 ngày gần nhất ở danh sách học viên.
- [ ] Trong chi tiết học viên, admin chọn được preset 7/30 ngày hoặc khoảng tùy
      chỉnh tối đa 365 ngày và thấy tổng thời gian cùng số giờ/phút từng ngày,
      gồm cả ngày 0 phút.
- [ ] Báo cáo ngày dùng GMT+7, chia đúng thời gian qua nửa đêm và ghi chú rõ
      không có dữ liệu hồi tố/offline trong vòng đầu.
- [ ] Tài khoản học sinh thường không thấy affordance admin và không truy cập
      được dữ liệu học viên khác bằng UI hoặc request trực tiếp.
- [ ] Client không thể ghi trực tiếp số giây/ngày; heartbeat dùng database
      clock, chống cộng trùng giữa nhiều tab và không nhận gap trên 60 giây.
- [ ] Feature không đổi schema `public.progress.data`, không làm hỏng sync hoặc
      luồng học hiện tại của học sinh.
- [ ] `git diff --check`, `npm run format:check`, `npm run validate-content`,
      `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` pass.
- [ ] Fresh Gemini review và fresh Codex adversarial review cho candidate
      `CRITICAL` hoàn tất trước release.
- [ ] Migration `0002` và rollback tương ứng đã dry-run thành công trên một
      Supabase project test riêng (không phải project đang phục vụ học sinh
      thật) trước khi áp dụng lên project thật; kết quả ghi trong handoff.
- [ ] Đã backup/export `profiles` và `progress` trên project thật ngay trước
      khi áp dụng `0002`.
- [ ] Migration `0002` không `drop`/`alter` hai policy `profiles_select_own`
      và `progress_select_own` đã có từ `0001`.
