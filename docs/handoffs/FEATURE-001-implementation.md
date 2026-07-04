# FEATURE-001 Implementation Handoff

## Status

COMPLETED

> Cập nhật bởi Claude Code sau khi Codex bàn giao: máy dev có mạng npm, đã
> tự chạy toàn bộ validation độc lập (không tin theo báo cáo BLOCKED của
> Codex) và sửa các lỗi phát hiện được. Xem mục 4, 6, 10 đã cập nhật.

## 1. Summary

Đã scaffold SPA `Vite + React 18 + TypeScript + Tailwind`, triển khai
route `Lộ trình / Bài học / Hồ sơ`, progress store `zustand/persist`,
quiz engine 4 dạng, renderer công thức hoá học, schema/types/validator
nội dung, hai unit mẫu `A6` và `A8`, metadata toàn bộ unit còn lại,
test khung và GitHub Actions CI.

## 2. Files changed

| File                                                                              | Change                                                   |
| --------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `package.json`, `tsconfig.json`, `vite.config.ts`                                 | Khởi tạo toolchain app/test/build                        |
| `tailwind.config.js`, `postcss.config.js`, `eslint.config.js`, `.prettierrc.json` | Cấu hình CSS/lint/format                                 |
| `index.html`, `src/**`                                                            | Ứng dụng React, routes, components, store, types, loader |
| `content/units/*.json`                                                            | Metadata toàn bộ unit và nội dung đầy đủ cho A6/A8       |
| `scripts/validate-content.ts`, `src/lib/contentValidation.ts`                     | Validate schema nội dung và cân bằng PTHH                |
| `tests/**`                                                                        | Unit test và component test                              |
| `.github/workflows/ci.yml`                                                        | CI lint + typecheck + test + build                       |
| `README.md`, `CHANGELOG.md`, `.gitignore`                                         | Tài liệu vận hành và housekeeping                        |

## 3. Design decisions

- Chọn SPA tĩnh, không backend, dữ liệu bài học là JSON import tại build-time.
- Dùng `zustand` persist để lưu tiến độ trong `localStorage` với key
  `hhthcs-progress` và `version` do middleware persist quản lý.
- Chấm điểm theo độ chính xác ở lượt trả lời đầu; câu sai được đưa lại
  cuối bài nhưng không cộng thêm XP để tránh farm điểm.
- Câu cân bằng PTHH dùng schema `left/right/answer` để validator có thể
  kiểm tra số nguyên tử chính xác.

## 4. Deviations from the approved plan

- Chưa deploy công khai lên Vercel/GitHub Pages (acceptance criteria
  cuối cùng của plan) — cần quyết định của người dùng về nền tảng và
  tài khoản deploy trước khi thực hiện; đây là bước ngoài phạm vi thay
  đổi code nên để lại làm follow-up.
- **Toàn bộ 30 câu hỏi mức HSG (bao gồm cả A6, A8) đều để `source: null`
  — không có câu nào thực sự trích dẫn từ đề thi HSG/chuyên đã công bố
  như CONTENT_OUTLINE.md mô tả.** Codex đã tự soạn các câu mức HSG thay
  vì sưu tầm, để tránh rủi ro trích dẫn sai nguồn/số liệu đề thi có
  thật. Nội dung về mặt hoá học đã được rà soát và chính xác, nhưng đây
  là một sai lệch so với chủ đích ban đầu ("nâng cao phục vụ thi học
  sinh giỏi... đề thi công khai"). Cần người dùng quyết định: giữ
  nguyên (câu tự soạn chất lượng tương đương), hay bổ sung câu thật có
  nguồn ở vòng biên soạn tiếp theo.
- `README.md` được viết lại hoàn toàn (không chỉ cập nhật) để mô tả
  đúng stack, cấu trúc và quy ước nội dung thực tế; `CHANGELOG.md` được
  cập nhật; không có thay đổi tài liệu ngoài phạm vi này.

## 5. Commands executed

```bash
git branch --show-current
git status --short
rg --files
sed -n '1,220p' AGENTS.md
sed -n '1,260p' AI_WORKFLOW.md
sed -n '1,320p' docs/plans/FEATURE-001.md
sed -n '1,320p' docs/content/CONTENT_OUTLINE.md
node -e "const fs=require('fs'); const path=require('path'); const dir='content/units'; for (const file of fs.readdirSync(dir)) { JSON.parse(fs.readFileSync(path.join(dir,file),'utf8')); } console.log('JSON OK');"
npm install --verbose
```

## 6. Validation results

Chạy độc lập bởi Claude Code sau khi có mạng npm (không dựa vào báo cáo
của Codex):

| Check                                | Result                                                                                                                                                                     |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run validate-content`           | PASS (17 unit, 0 lỗi schema/PTHH)                                                                                                                                          |
| Lint (`eslint .`)                    | PASS (sau khi sửa 5 lỗi — xem mục Files changed bổ sung)                                                                                                                   |
| Typecheck (`tsc --noEmit`)           | PASS (sau khi sửa 2 lỗi cú pháp JSX + 1 lỗi kiểu persist storage)                                                                                                          |
| Unit + component tests (`vitest`)    | PASS — 15/15 (sau khi sửa polyfill `localStorage` và thiếu cleanup RTL trong `tests/setup.ts`)                                                                             |
| Build (`vite build`)                 | PASS                                                                                                                                                                       |
| Manual UI (mobile 375px, dev server) | PASS — lộ trình 2 tab, thẻ lý thuyết, công thức hoá học (chỉ số dưới), quiz single/multi-choice/fill-blank với feedback đúng/sai + lời giải, trang Hồ sơ đều hiển thị đúng |
| Security checks                      | Không phát hiện secret/token trong diff; không dùng `innerHTML` thô                                                                                                        |

### Lỗi phát hiện và đã sửa (bởi Claude Code, phạm vi nhỏ theo CLAUDE.md)

1. `src/routes/ProfileRoute.tsx` — cú pháp JSX sai (`as const}.map` thay vì
   bọc trong ngoặc), khiến lint/typecheck fail.
2. `src/lib/contentValidation.ts` — 3 import type không dùng tới
   (`no-unused-vars`).
3. `src/store/progress.ts` — dùng type `PersistedValue<T>` tự định nghĩa
   không khớp chữ ký `PersistStorage` của zustand, gây lỗi type ở
   `setItem`; đổi sang `StorageValue<T>` chuẩn của thư viện.
4. `tests/components/question-renderer.test.tsx` — hàm helper
   `submitQuestion` khai báo `async` nhưng không có `await` nào bên
   trong, và code gọi `await submitQuestion(...)` dù hàm không async —
   gây lỗi lint và lỗi test "await of non-Promise".
5. `tests/setup.ts` — Node ≥ 22 tự khai báo `globalThis.localStorage`
   (experimental) đè lên bản của jsdom khiến `localStorage.clear()` là
   `undefined` trong test; thêm polyfill `MemoryStorage` và
   `afterEach(cleanup)` của Testing Library (thiếu nên nhiều lần render
   không dọn dẹp, gây lỗi "multiple elements with role button").

## 7. Known limitations

- Chưa deploy công khai (Vercel/GitHub Pages) — cần chọn nền tảng/tài
  khoản trước khi thực hiện.
- Toàn bộ câu hỏi mức HSG là tự soạn, không có câu nào trích từ đề thi
  thật đã công bố kèm nguồn, khác với mô tả trong CONTENT_OUTLINE.md.
- `package-lock.json` được tạo trong lần `npm install` của Claude Code;
  CI (`.github/workflows/ci.yml`) do Codex viết dùng `npm install` —
  nên đổi sang `npm ci` giờ đã có lockfile.

## 8. Remaining risks

- Nội dung hoá học A6/A8 đã được rà soát tự động (validate PTHH) và
  spot-check thủ công (đúng, chính xác về mặt hoá học) nhưng vẫn nên có
  một vòng review của người dạy Hoá trước khi công bố rộng rãi cho học
  sinh, đặc biệt các câu mức HSG.
- Giá trị "đề thi HSG/chuyên thật có nguồn" mà CONTENT_OUTLINE.md đề ra
  chưa đạt được — nếu mục tiêu là học sinh cọ xát với đề thi thật, cần
  một vòng biên soạn bổ sung.
- Chưa test trên thiết bị di động thật (chỉ test viewport mô phỏng
  375×812 qua trình duyệt dev).

## 9. Follow-up work

- Đổi `.github/workflows/ci.yml` sang `npm ci` (đã có `package-lock.json`).
- Quyết định nền tảng deploy (Vercel/GitHub Pages) và thực hiện.
- Cân nhắc bổ sung câu hỏi HSG có nguồn thật cho A6/A8 và các unit sau.
- Review nội dung hoá học A6/A8 bởi người có chuyên môn trước khi công bố.
- Test trên điện thoại thật.
