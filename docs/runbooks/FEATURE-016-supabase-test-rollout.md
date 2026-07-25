# FEATURE-016 — Hướng dẫn Human Project Owner: Supabase test project rollout

Runbook này thực hiện đúng mục 6.6 và 6a của `docs/plans/FEATURE-016.md`
(APPROVED). Đây là việc **chỉ con người làm** — không giao cho Codex/Claude vì
cần tài khoản/credential Supabase thật. Không dán URL/key/JWT vào chat với
agent nào.

Điều kiện tiên quyết đã xác nhận: Supabase free tier cho phép **2 active free
project** trong 1 organization (tính chung mọi thành viên Owner/Admin, project
paused không tính vào quota) — theo Supabase Billing FAQ chính thức. Nếu
project production hiện tại đã chiếm 1 slot, bạn còn 1 slot để tạo project
test; nếu đã đủ 2, tạo thêm một **organization free mới** (miễn phí, không cần
thẻ) rồi tạo project test trong org đó.

## 0. Trước khi bắt đầu

- [ ] Xác nhận `git status` sạch/đúng snapshot bạn định dùng làm candidate
      (xem `docs/handoffs/FEATURE-016-implementation.md` để lấy dirty-worktree
      evidence SHA hiện tại).
- [ ] Có sẵn: `supabase/migrations/0001_init.sql`,
      `supabase/migrations/0002_admin_reporting.sql`,
      `supabase/rollbacks/0002_admin_reporting_rollback.sql`.
- [ ] Chuẩn bị nơi lưu kết quả rehearsal (không commit key/JWT vào repo) — ví
      dụ một file text riêng ngoài repo hoặc ghi trực tiếp vào handoff (chỉ
      ghi kết quả/số liệu, không ghi secret).

## 1. Tạo project test

1. Vào <https://supabase.com/dashboard> → **New project**.
2. Đặt tên rõ ràng, ví dụ `hoa-hoc-thcs-test` (không dùng tên dễ nhầm với
   production).
3. Chọn region bất kỳ (không cần trùng production vì chỉ rehearsal schema).
4. Sau khi project tạo xong, vào **Project Settings → API** lấy:
   - `Project URL`
   - `anon public` key
   - `service_role` key (chỉ dùng ở bước vận hành/dashboard, **không** đưa vào
     app/client, không đưa cho agent nào).
5. Ghi lại `Project ref` (phần đầu của URL) để tiện tham chiếu — đây không phải
   secret.

## 2. Baseline: áp `0001_init.sql`

1. Vào **SQL Editor** trong project test.
2. Copy toàn bộ nội dung `supabase/migrations/0001_init.sql`, chạy.
3. Xác nhận không lỗi. Ghi lại baseline inventory bằng query sau (chạy trong
   SQL Editor, copy kết quả ra để đối chiếu sau này):

```sql
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;

select schemaname, tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

select routine_name, security_type
from information_schema.routines
where routine_schema = 'public';

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
order by table_name, grantee;
```

Lưu 4 kết quả này lại (ví dụ paste vào file text tạm) — đây là **baseline**
để so sánh sau rollback.

## 3. Tạo fixture học viên/admin tổng hợp (không dùng dữ liệu học sinh thật)

1. Vào **Authentication → Users → Add user** (hoặc "Invite"), tạo 3 tài khoản
   test bằng email giả, ví dụ:
   - `test-admin@example.invalid`
   - `test-student-a@example.invalid`
   - `test-student-b@example.invalid`
   - Đặt mật khẩu tạm biết trước (để đăng nhập test qua app sau này).
2. Trigger `handle_new_user` (đã có từ `0001`) tự tạo `profiles` row cho mỗi
   user. Kiểm tra trong **Table Editor → profiles** thấy đủ 3 hàng.
3. Thêm dữ liệu `progress` giả cho 2 học viên (student-a, student-b) qua Table
   Editor → progress → Insert row, hoặc SQL:

```sql
insert into public.progress (user_id, data, version, updated_at)
values
  ('<uuid-student-a>', '{"schemaVersion": 1}'::jsonb, 1, now()),
  ('<uuid-student-b>', '{"schemaVersion": 1}'::jsonb, 1, now());
```

(Lấy `<uuid-...>` từ cột `id` trong Authentication → Users. Giá trị `data`
JSON ở đây chỉ cần hợp lệ đủ để không lỗi constraint — không cần khớp schema
đầy đủ của app cho bước rehearsal RLS/RPC này.)

## 4. Forward apply `0002_admin_reporting.sql`

1. SQL Editor → copy toàn bộ `supabase/migrations/0002_admin_reporting.sql` →
   chạy.
2. Xác nhận **không lỗi** (transaction `begin...commit` sẽ tự rollback nếu có
   lỗi giữa chừng — an toàn).
3. Grant quyền admin cho `test-admin`:

```sql
insert into public.admin_users (user_id) values ('<uuid-test-admin>');
```

## 5. Test ma trận role/CRUD/RPC (mục 11 Manual + Negative/security)

Cách đơn giản nhất **không cần viết script**: trỏ tạm app dev vào project
test rồi đăng nhập lần lượt 3 tài khoản.

1. Tạo file `.env.local` ở root repo (đã bị gitignore, không commit):

   ```
   VITE_SUPABASE_URL=https://<project-ref-test>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon-key-test>
   ```

2. Chạy `npm run dev`, mở app.
3. Đăng nhập `test-student-a`:
   - [ ] Không thấy CTA/route admin ở Profile/header.
   - [ ] Gõ thẳng URL `/admin/learners` → bị chặn (route guard).
   - [ ] Học một bài (Lesson/Review/Exam) ít nhất 2 phút, để tab active — sau
         đó vào Table Editor → `study_daily_totals`, xác nhận có hàng
         `active_seconds > 0` cho user này.
   - [ ] Chuyển tab ẩn/để idle > 5 phút, xác nhận `active_seconds` không tăng
         thêm trong lúc đó (so sánh trước/sau).
4. Đăng xuất, đăng nhập `test-admin`:
   - [ ] Vào `/admin/learners`, thấy cả `test-student-a` và `test-student-b`.
   - [ ] Vào chi tiết từng học viên, thấy đúng số liệu tương ứng.
   - [ ] Đổi preset 7/30 ngày và khoảng tuỳ chỉnh, số liệu cập nhật đúng.
5. Đăng xuất, đăng nhập `test-student-b`:
   - [ ] Không thấy CTA admin, không truy cập được `/admin/learners`.
   - [ ] (Kiểm tra chéo dữ liệu) Không có cách nào qua UI để xem dữ liệu của
         `test-student-a`.
6. Revoke quyền admin đang sống:

   ```sql
   delete from public.admin_users where user_id = '<uuid-test-admin>';
   ```

   - [ ] Refresh app trong phiên `test-admin` đang đăng nhập → route
         admin/CTA biến mất ngay (không cần đăng xuất).

### Test trực tiếp qua REST/RPC (đúng ma trận anon/authenticated/service_role)

Dùng `curl` để test tầng dưới UI (đảm bảo policy/grant đúng, không chỉ dựa vào
route guard phía client):

```bash
# 1) anon không đọc được profiles người khác
curl -s "https://<project-ref-test>.supabase.co/rest/v1/profiles" \
  -H "apikey: <anon-key-test>" -H "Authorization: Bearer <anon-key-test>"
# Kỳ vọng: mảng rỗng [] (RLS chặn, không có session)

# 2) lấy JWT của student-a (đăng nhập qua API để lấy access_token)
curl -s -X POST "https://<project-ref-test>.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: <anon-key-test>" -H "Content-Type: application/json" \
  -d '{"email":"test-student-a@example.invalid","password":"<mật khẩu test>"}'
# Lấy access_token trong response, đặt vào biến STUDENT_A_JWT

# 3) student-a gọi heartbeat — kỳ vọng 204/thành công
curl -s -X POST "https://<project-ref-test>.supabase.co/rest/v1/rpc/record_study_heartbeat" \
  -H "apikey: <anon-key-test>" -H "Authorization: Bearer $STUDENT_A_JWT" -i

# 4) gọi lần 2 ngay lập tức (gap < 1s) — kỳ vọng vẫn 2xx nhưng KHÔNG cộng thêm
#    active_seconds (kiểm tra qua Table Editor)
curl -s -X POST "https://<project-ref-test>.supabase.co/rest/v1/rpc/record_study_heartbeat" \
  -H "apikey: <anon-key-test>" -H "Authorization: Bearer $STUDENT_A_JWT" -i

# 5) student-a thử đọc study_tracking_state trực tiếp — kỳ vọng bị chặn (RLS/grant)
curl -s "https://<project-ref-test>.supabase.co/rest/v1/study_tracking_state" \
  -H "apikey: <anon-key-test>" -H "Authorization: Bearer $STUDENT_A_JWT"
# Kỳ vọng: [] hoặc lỗi quyền — không được thấy hàng của chính mình

# 6) student-a thử đọc progress của student-b — kỳ vọng rỗng
curl -s "https://<project-ref-test>.supabase.co/rest/v1/progress?user_id=eq.<uuid-student-b>" \
  -H "apikey: <anon-key-test>" -H "Authorization: Bearer $STUDENT_A_JWT"
# Kỳ vọng: []
```

Test boundary gap 1s/60s và qua nửa đêm GMT+7: chỉnh trực tiếp
`study_tracking_state.last_heartbeat_at` bằng SQL trước khi gọi heartbeat lần
kế, để giả lập khoảng gap mong muốn:

```sql
update public.study_tracking_state
set last_heartbeat_at = now() - interval '65 seconds'
where user_id = '<uuid-student-a>';
-- gọi lại RPC qua curl ở trên → kỳ vọng KHÔNG cộng (gap > 60s)

update public.study_tracking_state
set last_heartbeat_at = now() - interval '30 seconds'
where user_id = '<uuid-student-a>';
-- gọi lại RPC → kỳ vọng CÓ cộng ~30 giây vào study_daily_totals hôm nay

-- test qua nửa đêm GMT+7 (UTC 17:00 hôm trước ~ 00:00 GMT+7 hôm sau):
update public.study_tracking_state
set last_heartbeat_at = (date_trunc('day', now() at time zone 'Asia/Ho_Chi_Minh')
  at time zone 'Asia/Ho_Chi_Minh') - interval '10 seconds'
where user_id = '<uuid-student-a>';
-- gọi lại RPC ngay sau đó → kỳ vọng active_seconds được chia đúng vào 2 ngày
-- (kiểm tra 2 hàng study_daily_totals cho student-a, tổng = gap thật)
```

Test race lần gọi đầu (2 request đồng thời khi chưa có `study_tracking_state`
row): xoá row hiện có của 1 user rồi bắn 2 request `curl` gần như đồng thời
(chạy nền `&` trong cùng lệnh shell):

```sql
delete from public.study_tracking_state where user_id = '<uuid-student-a>';
```

```bash
curl -s -X POST ".../rpc/record_study_heartbeat" -H "apikey: <anon-key-test>" \
  -H "Authorization: Bearer $STUDENT_A_JWT" -i &
curl -s -X POST ".../rpc/record_study_heartbeat" -H "apikey: <anon-key-test>" \
  -H "Authorization: Bearer $STUDENT_A_JWT" -i &
wait
```

Kỳ vọng: chỉ 1 hàng `study_tracking_state` cho user này sau đó (không lỗi
duplicate key, không exception) — advisory lock hoạt động đúng.

## 6. Rollback rehearsal

1. SQL Editor → chạy toàn bộ
   `supabase/rollbacks/0002_admin_reporting_rollback.sql`.
2. Chạy lại 4 query inventory ở bước 2, so sánh với baseline đã lưu — phải
   **khớp hệt** (không thừa/thiếu bảng, policy, function, grant nào của
   `0001`).
3. Ghi kết quả pass/fail vào handoff.

## 7. Recovery point / restore rehearsal

1. Áp lại `0002_admin_reporting.sql` (forward apply lại, vì bước 6 đã
   rollback).
2. Xuất dữ liệu: **Table Editor → profiles/progress → Export → CSV** cho từng
   bảng, hoặc dùng SQL Editor:
   ```sql
   copy (select * from public.profiles) to stdout with csv header;
   copy (select * from public.progress) to stdout with csv header;
   ```
   (Trong Supabase SQL Editor, dùng nút "Export" trên kết quả query thay vì
   `copy ... to stdout` nếu editor không hỗ trợ output trực tiếp ra file.)
3. Ghi lại row count và một checksum ổn định, ví dụ:
   ```sql
   select count(*), md5(string_agg(id::text, ',' order by id)) from public.profiles;
   select count(*), md5(string_agg(user_id::text, ',' order by user_id)) from public.progress;
   ```
4. **Phá dữ liệu có chủ đích** để rehearsal restore: xoá 1 hàng `progress` bất
   kỳ.
5. Restore lại từ CSV đã export (Table Editor → Insert → import CSV, hoặc SQL
   `insert into ... values (...)` từ dữ liệu đã lưu).
6. Chạy lại query checksum ở bước 3, xác nhận khớp với trước khi phá.
7. Ghi kết quả (row count, checksum trước/sau, thời gian restore) vào handoff.

## 8. Dọn dẹp

- [ ] Sau khi mọi rehearsal pass và evidence đã ghi vào handoff: xoá
      `.env.local` khỏi máy local (không commit).
- [ ] Theo mục 6a: xoá project test trong vòng 7 ngày sau khi production
      rollout thành công, hoặc sau khi huỷ rollout. Ghi UTC timestamp lúc xoá
      vào handoff.

## 9. Ghi evidence vào handoff

Cập nhật `docs/handoffs/FEATURE-016-implementation.md` mục "Remaining risks" /
thêm một mục mới "Supabase test rehearsal" với: ngày giờ UTC thực hiện, kết
quả từng bước ở trên (pass/fail), baseline vs post-rollback inventory khớp
hay không, checksum trước/sau restore. **Không ghi URL/key/JWT** vào handoff —
chỉ ghi kết quả.

Sau khi hoàn tất runbook này, quay lại workflow: candidate vẫn cần fresh
Gemini review + (lặp lại) fresh Codex adversarial review trên snapshot hiện
tại trước khi Claude làm release-readiness assessment và bạn duyệt release.
