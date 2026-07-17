# Hoá học THCS nâng cao

SPA mobile-first kiểu Duolingo để ôn luyện Hoá học THCS nâng cao theo
lộ trình `Vô cơ` / `Hữu cơ`. Phiên bản hiện tại là MVP đầy đủ
(`FEATURE-001`–`FEATURE-008`): bản đồ unit, màn bài học, quiz 4 dạng,
XP/streak/sao, trang hồ sơ, đăng nhập email + mật khẩu và đồng bộ tiến
độ lên Supabase khi env được cấu hình, ôn lại câu trả lời sai
(`/review`), và chế độ thi thử có đếm giờ theo phạm vi tự chọn
(`/exam`).

## AI Tools Used: OpenAI Codex & GPT-5.6

This project is built end-to-end under a documented, multi-agent AI
engineering workflow (`docs/architecture/AI_WORKFLOW_ARCHITECTURE.md`),
where **every feature in this codebase was implemented by OpenAI Codex
running on GPT-5.6**, orchestrated by Claude Code as the planning/review
layer and independently checked by Gemini for high-risk changes.

**Role split:**

| Agent                | Model            | Responsibility                                                                                           |
| -------------------- | ---------------- | -------------------------------------------------------------------------------------------------------- |
| Claude Code          | Claude Sonnet 5  | Architect — turns requirements into risk-tiered plans, runs release gates, orchestrates the other agents |
| **OpenAI Codex**     | **GPT-5.6**      | **Engineering engine — writes and validates every line of application code, tests, and CI changes**      |
| Gemini (Antigravity) | Gemini 3.5 Flash | Independent reviewer — fresh, context-free adversarial review required for high-risk (`CRITICAL`) work   |

**What Codex/GPT-5.6 actually built in this repo**, feature by feature:

- **FEATURE-001** — the entire MVP: unit map, lesson player, the four
  quiz types (single-choice, multi-choice, fill-in-the-blank, and
  chemical **equation balancing** with real coefficient grading), the
  XP/streak/star progression engine, and the profile screen.
- **FEATURE-002 to FEATURE-005** — authored and schema-validated all 17
  units / 81 lessons of Vietnamese THCS Chemistry curriculum content
  (inorganic chapters A1–A12, organic chapters B1–B5).
- **FEATURE-006** — Supabase email/password authentication and
  cross-device progress sync (pull/merge/push reconciliation logic).
- **FEATURE-007** — the "review missed questions" (`/review`) loop.
- **FEATURE-008** — the timed mock-exam mode (`/exam`) with configurable
  scope and countdown grading.
- **FEATURE-009 / FEATURE-011** — reworked the theory/practice split and
  the `theory` vs. `calculation` question taxonomy across the entire
  question bank.
- **FEATURE-012** — deepened advanced-theory content across every
  lesson.
- **FEATURE-013** — a full dependency security remediation: patched a
  critical Vitest advisory, a high-severity React Router XSS advisory,
  and Vite/PostCSS advisories down to **zero known vulnerabilities**;
  designed and implemented a from-scratch license-allowlist CI gate
  (`scripts/check-licenses.ts`) with fail-closed handling for tampered
  lockfiles; added `npm audit` and `format:check` gates to CI.

Beyond writing the code, **GPT-5.6 was also used as a second, independent
adversarial reviewer** on the highest-risk changes — a fresh Codex
session with no memory of the implementation is deliberately re-invoked
to challenge the diff for security and design flaws before release. On
FEATURE-013 this caught two real defects in code Codex itself had
written minutes earlier (a lockfile path-traversal gap and a fail-open
license check for platform-specific packages), both of which were then
fixed and re-verified before merge. Every implementation is captured in
a snapshot-bound handoff document under `docs/handoffs/`, so the exact
scope, validation evidence, and review findings for each Codex
contribution are traceable and auditable.

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

### Nếu gặp lỗi `access_denied&error_code=otp_expired` khi bấm link email

- Nguyên nhân thường gặp nhất: một số email client (Gmail, Outlook Safe
  Links...) tự động "prefetch" link trong email để quét an toàn, vô
  tình dùng luôn link xác nhận (chỉ dùng được 1 lần) trước khi người
  dùng bấm — link luôn báo hết hạn dù mới nhận được.
- Kiểm tra lại bước 5 ở trên (Site URL/Redirect URLs) trước, vì cấu
  hình sai chỗ cũng khiến lỗi tương tự xuất hiện.
- Nếu vẫn lặp lại, thử tạo tài khoản test bằng email cá nhân (Gmail cá
  nhân thường không bật link-scanning mạnh như email công ty).

Các lệnh kiểm tra chính:

```bash
npm run format
npm run lint
npm run typecheck
npm test
npm run build
npm run check:bundle
npm run check:licenses
npm audit --audit-level=moderate
```

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
.github/workflows/ci.yml      # lint + typecheck + test + build
```

## Quy ước nội dung

- Mỗi unit là một file JSON trong `content/units/`.
- Lesson `available` phải có tối đa 5 thẻ lý thuyết.
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

1. `AI_WORKFLOW.md`
2. `AGENTS.md`
3. `docs/plans/<FEATURE-ID>.md`
4. `docs/handoffs/<FEATURE-ID>-implementation.md`

## Quyền riêng tư

- Ứng dụng chỉ lưu email và tên hiển thị khi em tự tạo tài khoản.
- Không có analytics hay service role key trong client.
- Anon key là public-by-design; quyền dữ liệu được chặn bằng RLS trong Supabase.
