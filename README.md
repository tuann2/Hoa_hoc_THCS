# Hoá học THCS nâng cao

SPA mobile-first kiểu Duolingo để ôn luyện Hoá học THCS nâng cao theo
lộ trình `Vô cơ` / `Hữu cơ`. Phiên bản hiện tại là MVP đầy đủ
(`FEATURE-001`–`FEATURE-008`): bản đồ unit, màn bài học, quiz 4 dạng,
XP/streak/sao, trang hồ sơ, đăng nhập email + mật khẩu và đồng bộ tiến
độ lên Supabase khi env được cấu hình, ôn lại câu trả lời sai
(`/review`), và chế độ thi thử có đếm giờ theo phạm vi tự chọn
(`/exam`).

## Current AI tooling

This repository uses a governed, role-based AI workflow. The approved workflow
architecture, role contracts, context policy, and snapshot-bound handoffs are
the source of truth; current provider adapters are documented separately in
[`docs/runbooks/providers/`](docs/runbooks/providers/). Tooling may change
without changing governance policy.

Historical feature plans and handoffs retain the execution details applicable
when they were created. They are audit records, not current role assignments.

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS
- `react-router-dom`
- `@supabase/supabase-js` cho Supabase Auth + PostgREST
- `zustand` + persist (`hhthcs-progress`)
- Vitest + Testing Library
- `vite-plugin-pwa` + Workbox for installable, same-origin static offline cache
- `@playwright/test` for production-build desktop/mobile E2E

## Chạy cục bộ

```bash
npm install
npm run validate-content
npm run check:content-catalog
npm run dev
```

### PWA/offline và E2E

Production build precache app shell, catalog, route chunks và toàn bộ 17
content chunks. Lần mở đầu cần mạng; chỉ sau khi thấy “Đã sẵn sàng học
offline” mới có thể mở toàn bộ nội dung khi mất mạng. Supabase/Auth/progress
không nằm trong cache service worker. Khi có worker mới, app hiện banner để
người dùng tự xác nhận cập nhật; không reload tự động giữa lesson/exam.

```bash
npm run build
npm run check:bundle
npx playwright install chromium
npm run test:e2e
npm run test:pwa
```

## Thiết lập Supabase

1. Tạo project Supabase free tier.
2. Mở SQL Editor và chạy [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql).
3. Sao chép `.env.example` thành `.env.local` rồi điền:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

4. Trong Supabase Auth, đặt mật khẩu tối thiểu 8 ký tự.
5. **Bắt buộc** — vào **Authentication → URL Configuration** và cập nhật:
   - **Site URL**: `https://tuann2.github.io/Hoa_hoc_THCS/`.
   - **Redirect URLs**: thêm
     `https://tuann2.github.io/Hoa_hoc_THCS/auth`,
     `https://tuann2.github.io/Hoa_hoc_THCS/**` (fallback), và
     `http://localhost:5173/auth` cho dev cục bộ.

   Mặc định Supabase để `Site URL = http://localhost:3000` (giá trị
   mẫu khi tạo project, không phải cổng dev thật của app này). Nếu bỏ
   qua bước này, email xác nhận đăng ký / đặt lại mật khẩu sẽ luôn
   điều hướng sai chỗ (`localhost:3000`) bất kể app đang chạy ở đâu.
   Nếu `redirectTo` không nằm trong allowlist **Redirect URLs**,
   Supabase sẽ âm thầm quay về **Site URL**, nên phải cấu hình đúng cả
   hai mục.
   Build hiện cũng tự tạo `dist/404.html` làm SPA fallback cho GitHub
   Pages, để hard navigation tới `/Hoa_hoc_THCS/auth` vẫn nạp được app.

6. Với GitHub Pages / CI, khai báo hai secret cùng tên:
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

Nếu hai env bị thiếu, app tự rơi về chế độ local-only và vẫn học bình
thường như trước.

### Báo cáo admin và thời gian học (FEATURE-016)

Chỉ Human Project Owner được phép áp
[`0002_admin_reporting.sql`](supabase/migrations/0002_admin_reporting.sql)
sau khi candidate đã qua đầy đủ dry-run/rollback trên project test, hai review
`CRITICAL` và phê duyệt rollout. Không chạy migration, seed hoặc thử SQL vào
project học sinh thật chỉ để kiểm tra code.

Sau rollout đã được duyệt, cấp admin đầu tiên bằng SQL Editor/quyền vận hành
(không dùng anon client). Hai người phải đối chiếu UUID với đúng tài khoản và
email trong Auth dashboard trước khi chạy lệnh; không dùng UUID do người yêu
cầu tự cung cấp khi chưa xác minh:

```sql
insert into public.admin_users (user_id)
values ('UUID-DA-XAC-MINH')
on conflict (user_id) do nothing;
```

Ghi ngoài repo: người yêu cầu, người duyệt/thực hiện, UUID, lý do và UTC
timestamp. Thu hồi quyền thông thường bằng quyền vận hành rồi xác nhận request
đọc chéo user bị từ chối:

```sql
delete from public.admin_users
where user_id = 'UUID-DA-XAC-MINH';
```

Nếu nghi ngờ tài khoản admin bị chiếm, đồng thời xóa row admin, vô hiệu hóa/đăng
xuất mọi session của tài khoản trong Supabase Auth, reset/rotate credential có
liên quan, kiểm tra Auth/database logs và lập incident record. Không chờ cache
client hết hạn.

Dashboard chỉ đọc `display_name` và snapshot `progress` mà học viên có thể tự
sửa qua quyền own-write hiện có; đây không phải dữ liệu server-authoritative và
không được dùng để chấm điểm, kỷ luật hoặc xác minh danh tính. Thời gian học là
ước lượng wall-clock do RPC dùng database clock ghi giữa heartbeat hợp lệ khi
app online, foreground/focus và có tương tác gần đây; không có dữ liệu offline,
hồi tố hay bằng chứng người học thực sự tập trung.

Telemetry chỉ lưu tổng số giây theo ngày GMT+7 (rolling 365 ngày) và mốc
heartbeat hiện tại, không lưu URL/nội dung/timeline chi tiết. Vì vòng đầu chưa
có scheduler, owner phải chạy cleanup có kiểm soát ít nhất hằng tháng, lưu UTC
và row count trước/sau; account deletion/erasure phải bao gồm state/totals qua
FK cascade. Nếu không vận hành được cleanup, dừng release và sửa plan. Backup,
CSV hoặc dump chứa dữ liệu học viên phải mã hóa, access-controlled, có owner và
access audit ngoài repo/log agent; xóa trong 30 ngày sau rollout thành công hoặc
khi incident/rollback liên quan đóng (mốc nào đến sau), và ghi UTC deletion.
Vòng đầu không có audit log cho từng lượt xem dashboard; dùng Supabase
Auth/database logs cùng change record cho grant/revoke, migration/rollback,
backup access và telemetry cleanup.

### Nếu gặp lỗi `access_denied&error_code=otp_expired` khi bấm link email

- Nguyên nhân thường gặp nhất: một số email client (Gmail, Outlook Safe
  Links...) tự động "prefetch" link trong email để quét an toàn, vô
  tình dùng luôn link xác nhận (chỉ dùng được 1 lần) trước khi người
  dùng bấm — link luôn báo hết hạn dù mới nhận được.
- Kiểm tra lại bước 5 ở trên (Site URL/Redirect URLs) trước, vì cấu
  hình sai chỗ cũng khiến lỗi tương tự xuất hiện.
- Nếu vẫn lặp lại, thử tạo tài khoản test bằng email cá nhân (Gmail cá
  nhân thường không bật link-scanning mạnh như email công ty).

Danh sách gate, lệnh chính xác và profile chạy nằm duy nhất trong
`scripts/gates-manifest.ts`; runner và CI dùng cùng nguồn này. `npm run build`
vẫn là lệnh gộp thuận tiện cho phát triển cục bộ.

## Cấu trúc quan trọng

```text
content/units/                # nội dung JSON cho tất cả unit
content/catalog.json           # catalog nhẹ đã commit, không chứa cards/questions
scripts/validate-content.ts   # kiểm tra schema + logic PTHH
scripts/generate-content-catalog.ts # generate/check catalog từ source JSON
scripts/check-bundle-budget.ts     # budget initial JS và content chunks
src/components/               # UI học tập, quiz, Chem renderer
src/lib/supabase.ts           # official @supabase/supabase-js client + offline fallback
src/lib/progressSync.ts       # pull/merge/push tiến độ
src/lib/exam.ts               # chọn câu theo tỉ lệ mức, chấm điểm đề thi thử
src/routes/                   # Lộ trình / Bài học / Hồ sơ / Ôn lại (/review) / Thi thử (/exam)
src/routes/ReviewRoute.tsx    # ôn lại câu trả lời sai (FEATURE-007)
src/routes/ExamRoute.tsx      # chế độ thi thử có đếm giờ (FEATURE-008)
src/store/auth.ts             # session + đăng nhập/đăng xuất/reset
src/store/progress.ts         # XP, streak, sao, mở khoá, câu sai (wrongQuestions),
                               # lịch sử thi (examHistory), snapshot sync
tests/                        # unit test và component test
tests/e2e/                    # Playwright E2E trên production preview
scripts/gates-manifest.ts     # nguồn chuẩn gate ID/lệnh/profile (WORKFLOW-004A)
scripts/gates.ts              # runner chạy gates theo profile hoặc classifier
scripts/evidence.ts           # sinh evidence gắn snapshot chính xác
.github/workflows/ci.yml      # web (gates runner) + browser (E2E/PWA) + deploy (chỉ main)
.github/workflows/deploy.yml  # deploy manual dự phòng, có guard candidate_sha
docs/runbooks/DEPLOYMENT.md   # quy trình deploy chính / dự phòng / rollback
```

## Quy ước nội dung

- Mỗi unit là một file JSON trong `content/units/`.
- Lesson `available` phải có 1–25 thẻ lý thuyết.
- Mỗi lesson khả dụng phải có đủ 3 mức câu hỏi:
  `basic` 5–8, `applied` 5–8, `hsg` 3–5.
- 100% câu hỏi phải có `explanation`.
- Câu `balance` khai báo theo dạng:

```json
{
  "type": "balance",
  "left": ["Fe", "HCl"],
  "right": ["FeCl2", "H2"],
  "answer": [1, 2, 1, 1]
}
```

## Quy trình làm việc với agent

Đọc theo thứ tự:

1. `AGENTS.md` (shim)
2. Execution envelope
3. `docs/roles/<assigned_role>.md`
4. Approved plan: `docs/plans/<FEATURE-ID>.md` (khi task thuộc một feature
   có plan; read-only/TRIVIAL không cần plan)
5. `docs/CONTEXT_RULES.md`

`AI_WORKFLOW.md` là chỉ mục pipeline; sau các bước trên, đọc plan/handoff áp
dụng cho task khi Context Rules yêu cầu.

## Quyền riêng tư

- Ứng dụng chỉ lưu email và tên hiển thị khi em tự tạo tài khoản.
- Không có analytics hay service role key trong client.
- Anon key là public-by-design; quyền dữ liệu được chặn bằng RLS trong Supabase.
