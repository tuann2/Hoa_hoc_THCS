# FEATURE-008 Implementation Handoff

## Status

COMPLETED

## 1. Summary

Đã triển khai chế độ thi thử `/exam` theo plan APPROVED: cấu hình phạm vi,
rút đề ngẫu nhiên có seed với mục tiêu 40/40/20, làm bài với đồng hồ đếm
ngược không lộ đáp án từng câu, tự nộp khi hết giờ, chấm điểm theo từng
mức độ, lưu lịch sử thi vào progress store/Supabase sync và hiển thị lịch
sử thi gần nhất trong hồ sơ.

## 2. Files changed

| File                                          | Change                                                                                 |
| --------------------------------------------- | -------------------------------------------------------------------------------------- |
| `src/lib/exam.ts`                             | Thêm thư viện logic thi thử: PRNG có seed, build pool, pick câu theo tỉ lệ, chấm điểm. |
| `src/routes/ExamRoute.tsx`                    | Thêm route `/exam` với 3 pha cấu hình → làm bài → kết quả.                             |
| `src/store/progress.ts`                       | Thêm `ExamAttempt`, `examHistory`, `recordExamAttempt`, migrate v3.                    |
| `src/lib/progressSync.ts`                     | Normalize/merge `examHistory`, thêm mutation source đồng bộ.                           |
| `src/App.tsx`                                 | Thêm route và mục điều hướng “Thi thử”.                                                |
| `src/routes/ProfileRoute.tsx`                 | Hiển thị 5 lần thi gần nhất và CTA sang `/exam`.                                       |
| `tests/lib/exam.test.ts`                      | Unit test cho thư viện thi thử.                                                        |
| `tests/routes/exam-route.test.tsx`            | Integration test cho luồng `/exam`, tự nộp khi hết giờ, cập nhật `wrongQuestions`.     |
| `tests/store/progress.test.ts`                | Test migrate v2→v3 và cắt `examHistory` còn 20 phần tử.                                |
| `tests/lib/progress-sync.test.ts`             | Test normalize/merge `examHistory`.                                                    |
| `CHANGELOG.md`                                | Ghi nhận `FEATURE-008` trong changelog.                                                |
| `docs/handoffs/FEATURE-008-implementation.md` | Handoff triển khai.                                                                    |

## 3. Design decisions

- Tái dùng `QuestionRenderer` ở chế độ `result={null}` để không lộ đáp án
  từng câu, đúng như plan và tránh sửa component chung.
- Dùng key phản hồi theo `unitId::lessonId::questionId` để tránh đụng độ
  `question.id` giữa các bài/chuyên đề khác nhau.
- Lưu `examHistory` tối đa 20 bản ghi, merge theo `id`, ưu tiên bản có
  `finishedAt` mới hơn khi sync local/server.
- Không tạo component timer riêng; countdown giữ inline trong `ExamRoute`
  vì phạm vi tái sử dụng hiện tại chỉ có route thi thử.

## 4. Deviations from the approved plan

- Không có sai lệch chức năng trong scope.
- Về validation:
  - `npm run validate-content` và `npm run build` không chạy nguyên script
    package trong sandbox vì `tsx` CLI cố mở IPC pipe ở `/tmp` và bị `EPERM`.
    Đã chạy tương đương bằng `node --import tsx scripts/validate-content.ts`
    và `npx vite build` sau khi `typecheck` pass.
  - `npm run format:check` fail do nhiều file ngoài scope đã lệch Prettier từ
    trước (`docs/...`, `src/routes/AuthRoute.tsx`, `src/store/auth.ts`). Theo
    rule “không sửa file unrelated”, đã chạy `npx prettier --check` trên toàn
    bộ file thuộc FEATURE-008 và pass.

## 5. Commands executed

```bash
npx prettier --write src/lib/exam.ts src/store/progress.ts src/lib/progressSync.ts src/routes/ExamRoute.tsx src/App.tsx src/routes/ProfileRoute.tsx tests/lib/exam.test.ts tests/store/progress.test.ts tests/lib/progress-sync.test.ts tests/routes/exam-route.test.tsx
npm run typecheck
npm test
npm run lint
npm run format:check
node --import tsx scripts/validate-content.ts
npx prettier --check src/lib/exam.ts src/store/progress.ts src/lib/progressSync.ts src/routes/ExamRoute.tsx src/App.tsx src/routes/ProfileRoute.tsx tests/lib/exam.test.ts tests/store/progress.test.ts tests/lib/progress-sync.test.ts tests/routes/exam-route.test.tsx
npx vite build
```

## 6. Validation results

| Check                                 | Result                                                   |
| ------------------------------------- | -------------------------------------------------------- |
| Scoped Prettier check                 | PASS                                                     |
| Repo-wide `npm run format:check`      | FAIL (pre-existing unrelated files)                      |
| Lint                                  | PASS                                                     |
| Typecheck                             | PASS                                                     |
| Unit + integration tests (`npm test`) | PASS                                                     |
| Content validation                    | PASS via `node --import tsx scripts/validate-content.ts` |
| Build                                 | PASS via `npx vite build`                                |
| Security checks                       | N/A (repo không có script riêng)                         |

## 7. Known limitations

- Chi tiết từng câu của một đề chỉ xem lại được ngay trong phiên vừa nộp;
  `examHistory` persist chỉ lưu số liệu tổng hợp, không lưu toàn bộ đề.
- Build hiện vẫn ra cảnh báo chunk JS > 500 kB; đây là tình trạng chung của
  app hiện tại, không do riêng FEATURE-008.

## 8. Remaining risks

- `npm run validate-content`/`npm run build` phụ thuộc cách `tsx` CLI hoạt
  động trong môi trường; trên sandbox bị vướng IPC permission, cần xác nhận
  lại trên môi trường CI/terminal chuẩn của repo.
- `format:check` repo-wide đang đỏ bởi file ngoài scope; nếu pipeline bắt buộc
  check toàn repo, Claude/human cần xử lý debt formatting riêng.

## 9. Follow-up work

- Nếu cần lịch sử thi chi tiết sau khi rời trang, mở rộng model để persist
  `questionIds` và đáp án đã chọn theo chính sách lưu trữ rõ ràng.
- Xem xét code-splitting route để giảm cảnh báo bundle size của `vite build`.

## Post-review fix

- Điều chỉnh UX ở chế độ thi thử: `QuestionRenderer` hỗ trợ `submitLabel`
  tuỳ chọn và `ExamRoute` dùng nhãn `Lưu & câu tiếp theo` thay cho
  `Kiểm tra`, vì nhãn cũ gợi ý có phản hồi đúng/sai ngay theo câu, trái với
  thiết kế “không lộ đáp án từng câu cho tới khi nộp bài”.
