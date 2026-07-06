# Hoá học THCS nâng cao

SPA mobile-first kiểu Duolingo để ôn luyện Hoá học THCS nâng cao theo
lộ trình `Vô cơ` / `Hữu cơ`. Phiên bản hiện tại là MVP đầy đủ
(`FEATURE-001`–`FEATURE-008`): bản đồ unit, màn bài học, quiz 4 dạng,
XP/streak/sao, trang hồ sơ, đăng nhập email + mật khẩu và đồng bộ tiến
độ lên Supabase khi env được cấu hình, ôn lại câu trả lời sai
(`/review`), và chế độ thi thử có đếm giờ theo phạm vi tự chọn
(`/exam`).

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS
- `react-router-dom`
- `@supabase/supabase-js` cho Supabase Auth + PostgREST
- `zustand` + persist (`hhthcs-progress`)
- Vitest + Testing Library

## Chạy cục bộ

```bash
npm install
npm run validate-content
npm run dev
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
5. Với GitHub Pages / CI, khai báo hai secret cùng tên:
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

Nếu hai env bị thiếu, app tự rơi về chế độ local-only và vẫn học bình
thường như trước.

Các lệnh kiểm tra chính:

```bash
npm run format
npm run lint
npm run typecheck
npm test
npm run build
```

## Cấu trúc quan trọng

```text
content/units/                # nội dung JSON cho tất cả unit
scripts/validate-content.ts   # kiểm tra schema + logic PTHH
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
