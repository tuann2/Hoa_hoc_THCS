# Hoá học THCS nâng cao

SPA mobile-first kiểu Duolingo để ôn luyện Hoá học THCS nâng cao theo
lộ trình `Vô cơ` / `Hữu cơ`. Phiên bản hiện tại triển khai MVP của
`FEATURE-001`: bản đồ unit, màn bài học, quiz 4 dạng, XP/streak/sao,
trang hồ sơ và hai chuyên đề mẫu hoàn chỉnh `A6 Axit`, `A8 Muối – Phân
bón hoá học`.

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS
- `react-router-dom`
- `zustand` + persist (`hhthcs-progress`)
- Vitest + Testing Library

## Chạy cục bộ

```bash
npm install
npm run validate-content
npm run dev
```

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
src/routes/                   # Lộ trình / Bài học / Hồ sơ
src/store/progress.ts         # XP, streak, sao, mở khoá
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
