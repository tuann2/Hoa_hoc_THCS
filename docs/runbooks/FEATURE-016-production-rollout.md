# FEATURE-016 — Hướng dẫn Human Project Owner: Production rollout

## CẢNH BÁO — đọc trước khi bắt đầu

- Runbook này thao tác trên **Supabase project production thật**, đang có
  dữ liệu học sinh thật. Khác hoàn toàn với `docs/runbooks/FEATURE-016-supabase-test-rollout.md`
  (project test) — đừng nhầm project.
- Đây là việc **chỉ con người làm**. Không dán URL/anon key/service_role
  key/connection string vào chat với agent nào (Claude/Codex/Gemini).
- Không vội. Mỗi bước có điều kiện dừng (abort condition) rõ ràng — nếu
  bất kỳ điều kiện dừng nào xảy ra, dừng ngay, không tiếp tục sang bước
  sau, báo lại cho tôi.
- Trình tự bắt buộc: **Bước 1 (preflight) → Bước 2 (backup) → Bước 3 (áp
  migration) → Bước 4 (seed admin) → Bước 5 (smoke test)**. Không đảo thứ
  tự, không bỏ bước — đúng bài học rút ra từ lần phá dữ liệu trên project
  test: luôn backup xong mới được làm gì phá hoại.
- Candidate đã duyệt: commit `f9e43aafdaf485bb3093eb9fc9cfe0eca134fff9`
  trên branch `feature/FEATURE-016`. File di chuyển là
  `supabase/migrations/0002_admin_reporting.sql` và
  `supabase/rollbacks/0002_admin_reporting_rollback.sql` — copy đúng nội
  dung từ 2 file này trong repo, không gõ lại tay.

## Bước 1 — Preflight read-only (không ghi gì)

Vào **SQL Editor** của project **production**, chạy 4 query sau (chỉ đọc),
đối chiếu với đúng những gì `0001_init.sql` tạo ra:

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

**Kỳ vọng đúng** (nếu production hiện tại đúng như thiết kế, chưa ai chỉnh
tay gì khác ngoài `0001_init.sql`):

- Bảng: chỉ `profiles` (id, display_name, created_at) và `progress`
  (user_id, data, version, updated_at). Không có `admin_users`,
  `study_tracking_state`, `study_daily_totals`.
- Policy: đúng 6 policy — `profiles_select_own`, `profiles_insert_own`,
  `profiles_update_own`, `progress_select_own`, `progress_insert_own`,
  `progress_update_own`. Không có policy nào tên `*_admin_*`.
- Function: `handle_new_user` (security definer). Không có
  `record_study_heartbeat`.
- Grant: không có gì bất thường ngoài default grant của Supabase.

**Điều kiện dừng (abort):** nếu thấy bất kỳ bảng/policy/function nào KHÔNG
khớp danh sách trên (thừa, thiếu, hoặc khác tên) — **DỪNG NGAY**, không
chạy migration, báo lại cho tôi kèm kết quả 4 query để tôi phân tích drift
trước khi tiếp tục.

## Bước 2 — Recovery point (backup) TRƯỚC migration

Chỉ tiếp tục nếu Bước 1 pass.

### 2.1. Data backup (giống hệt cách bạn đã làm trên project test)

- Table Editor → `profiles` → Export → CSV, lưu file lại (đặt tên rõ ràng
  kèm ngày giờ, ví dụ `profiles-backup-2026-07-25.csv`).
- Table Editor → `progress` → Export → CSV, lưu tương tự.
- Ghi lại checksum để đối chiếu sau này nếu cần:

```sql
select count(*) as so_hang,
  md5(string_agg(id::text || '|' || display_name, ',' order by id)) as checksum
from public.profiles;

select count(*) as so_hang,
  md5(string_agg(user_id::text || '|' || version::text || '|' || updated_at::text, ',' order by user_id)) as checksum
from public.progress;
```

### 2.2. Schema/catalog backup

- Lưu lại chính kết quả 4 query ở Bước 1 (copy/paste ra file text) — đây là
  catalog inventory tham chiếu.
- Nếu máy bạn có `pg_dump` (Postgres client tools) và bạn tìm được
  connection string ở **Project Settings → Database → Connection string**:
  ```bash
  pg_dump "postgresql://...connection-string-production..." \
    --schema=public --schema-only \
    -f schema-backup-2026-07-25.sql
  ```
  Đây là bản backup schema đầy đủ nhất (constraints, indexes, mọi chi
  tiết) — làm nếu tiện, không bắt buộc nếu không có sẵn công cụ.

### 2.3. Lưu trữ

- Đặt toàn bộ file backup (CSV + catalog text + schema dump nếu có) vào
  một thư mục **mã hoá, chỉ bạn truy cập được, ngoài repo git**, ví dụ ổ
  đĩa mã hoá hoặc password manager có đính kèm file.
- Ghi chú: vị trí lưu, ngày giờ UTC, ai tạo, ngày dự kiến xoá (gợi ý: xoá
  sau khi rollout ổn định ~30 ngày, theo mục 12 của plan).
- **Xác nhận mở lại được file CSV** (mở thử bằng Excel/Numbers/text editor)
  trước khi tiếp tục — đừng giả định file export thành công mà không kiểm
  tra.

**Điều kiện dừng:** nếu không tạo được backup, không mở lại được file, hoặc
không có nơi lưu an toàn — **DỪNG**, không áp migration cho tới khi giải
quyết được việc này.

## Bước 3 — Áp migration `0002` (trong transaction)

1. Mở file `supabase/migrations/0002_admin_reporting.sql` trong repo, copy
   **toàn bộ nội dung** (đã có sẵn `begin;` ở đầu và `commit;` ở cuối — khi
   dán vào SQL Editor và Run, toàn bộ chạy như MỘT transaction; nếu có
   dòng nào lỗi, Postgres tự rollback hết, không để lại trạng thái nửa
   vời).
2. Dán vào SQL Editor project **production**, Run.
3. Nếu có bất kỳ lỗi nào hiện ra (đỏ) → **transaction đã tự rollback**,
   production vẫn nguyên trạng như trước Bước 3. Không cần restore gì.
   Copy lại thông báo lỗi, báo cho tôi, dừng ở đây.
4. Nếu chạy thành công (không lỗi) → chạy verification sau để xác nhận đủ
   object mới:

```sql
select
  exists (select 1 from information_schema.tables where table_schema='public' and table_name='admin_users') as admin_users_da_tao,
  exists (select 1 from information_schema.tables where table_schema='public' and table_name='study_tracking_state') as tracking_state_da_tao,
  exists (select 1 from information_schema.tables where table_schema='public' and table_name='study_daily_totals') as daily_totals_da_tao,
  exists (select 1 from pg_proc where proname='record_study_heartbeat') as rpc_da_tao,
  exists (select 1 from pg_policies where policyname='profiles_select_admin_read_only') as policy_admin_profiles_da_tao,
  exists (select 1 from pg_policies where policyname='progress_select_admin_read_only') as policy_admin_progress_da_tao,
  exists (select 1 from pg_policies where policyname='profiles_select_own') as policy_own_profiles_con,
  exists (select 1 from pg_policies where policyname='progress_select_own') as policy_own_progress_con;
```

Kỳ vọng: tất cả 8 cột `true` (giống hệt logic đã test trên project test,
chiều ngược lại của lúc rollback).

5. Xác nhận dữ liệu học sinh không đổi — chạy lại 2 checksum ở Bước 2.1,
   phải khớp y hệt (migration này không đụng `profiles`/`progress`, chỉ
   thêm bảng/policy/function mới):

```sql
select count(*) as so_hang,
  md5(string_agg(id::text || '|' || display_name, ',' order by id)) as checksum
from public.profiles;

select count(*) as so_hang,
  md5(string_agg(user_id::text || '|' || version::text || '|' || updated_at::text, ',' order by user_id)) as checksum
from public.progress;
```

**Điều kiện dừng (abort — làm theo mục "Nếu cần huỷ" bên dưới ngay):** lỗi
ở bước 4 (thiếu object), hoặc checksum ở bước 5 khác với Bước 2.1 (nghĩa là
dữ liệu học sinh bị đổi ngoài dự kiến).

## Bước 4 — Seed admin đầu tiên (mục 6.5 của plan)

**Chỉ làm nếu Bước 3 pass hoàn toàn.**

1. Xác định tài khoản sẽ là admin đầu tiên (chính bạn, hoặc người bạn tin
   tưởng).
2. **Xác minh 2 người** (bạn + 1 người khác nếu có, hoặc tự bạn double-check
   nếu làm một mình): vào **Authentication → Users**, tìm đúng email, copy
   `UUID`, đối chiếu lại email hiển thị đúng người trước khi cấp quyền —
   không tự tin nhớ UUID mà không xác minh lại trên dashboard.
3. Chạy:

```sql
insert into public.admin_users (user_id) values ('<uuid-admin-that>');
```

4. **Ghi audit tối thiểu ngoài repo** (không ghi vào Git): ai yêu cầu, ai
   duyệt/thực hiện, UUID nào, lý do, UTC timestamp. Lưu cùng chỗ với backup
   ở Bước 2.3.

## Bước 5 — Smoke test

Đăng nhập app thật (production URL) bằng tài khoản vừa cấp admin và ít
nhất một tài khoản học sinh thường đã có sẵn:

- [ ] Tài khoản học sinh thường: vào `/profile`, tiến độ/XP hiển thị đúng
      như trước (không đổi hành vi). Không thấy CTA admin.
- [ ] Tài khoản học sinh thường: học 1 bài bất kỳ, không có lỗi phát sinh
      (đúng luồng cũ).
- [ ] Tài khoản admin: vào `/admin/learners`, thấy danh sách học viên
      (thấy được dữ liệu chéo user — xác nhận RLS admin hoạt động thật,
      không chỉ trên project test).
- [ ] Tài khoản admin: vào chi tiết 1 học viên, số liệu hiển thị hợp lý.
- [ ] Kiểm tra anon (không đăng nhập) không đọc được `profiles` — mở
      tab ẩn danh, gõ thẳng URL `/admin/learners`, phải bị chặn ngay ở UI;
      không cần test REST trực tiếp trên production vì logic RLS/RPC đã
      được xác minh đầy đủ trên project test với cùng file migration.

**Điều kiện dừng/rollback:** nếu smoke test fail, có dấu hiệu truy cập trái
phép, checksum đổi ngoài dự kiến, hoặc lỗi app nghiêm trọng ảnh hưởng học
sinh thường:

1. Revoke admin vừa seed: `delete from public.admin_users where user_id = '<uuid>';`
2. Chạy `supabase/rollbacks/0002_admin_reporting_rollback.sql` (đã test kỹ
   trên project test, pass 8/8).
3. Nếu dữ liệu `profiles`/`progress` bị đổi/mất: restore từ CSV backup ở
   Bước 2.1 theo đúng kỹ thuật đã học ở project test (xoá sạch bảng rồi
   import lại CSV — import thẳng lên bảng còn dữ liệu sẽ lỗi duplicate key).
4. Báo lại cho tôi toàn bộ diễn biến để ghi vào handoff và xác định
   nguyên nhân trước khi thử lại.

## Sau khi hoàn tất

Báo lại cho tôi kết quả từng bước (pass/fail, timestamp UTC, checksum) —
**không gửi URL/key/UUID thật** — tôi sẽ ghi vào
`docs/handoffs/FEATURE-016-implementation.md` làm evidence chính thức cho
việc production rollout đã hoàn tất theo đúng plan §6.6 bước 7-8.
