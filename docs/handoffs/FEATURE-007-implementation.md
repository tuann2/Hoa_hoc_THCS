# FEATURE-007 Implementation Handoff

## Status

COMPLETED

## 1. Summary

Đã triển khai luồng lưu và ôn lại câu trả lời sai trên toàn app:
`wrongQuestions` được persist + sync qua Supabase, `LessonPlayer` ghi/xoá
câu sai đúng ở lần làm đầu, có route `/review` để luyện lại, và badge số
câu cần ôn xuất hiện ở header cùng trang hồ sơ.

## 2. Files changed

| File                                 | Change                                                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `src/store/progress.ts`              | Thêm `wrongQuestions`, `lastMutationAt`, migrate v2, action `recordWrongAnswer`/`clearWrongAnswer`.     |
| `src/lib/progressSync.ts`            | Normalize + merge `wrongQuestions`, lắng nghe mutation source mới, backfill `lastMutationAt` từ server. |
| `src/lib/content.ts`                 | Thêm `findQuestion(unitId, lessonId, questionId)`.                                                      |
| `src/components/LessonPlayer.tsx`    | Gọi record/clear cho câu sai/đúng ở lần làm đầu.                                                        |
| `src/App.tsx`                        | Thêm route `/review` và badge điều hướng.                                                               |
| `src/routes/ProfileRoute.tsx`        | Hiển thị số câu cần ôn và link sang `/review`.                                                          |
| `src/routes/ReviewRoute.tsx`         | Route ôn lại câu sai bằng `QuestionRenderer`.                                                           |
| `tests/store/progress.test.ts`       | Bổ sung test migrate v1→v2 và record/clear wrongQuestions.                                              |
| `tests/lib/progress-sync.test.ts`    | Bổ sung test normalize/merge wrongQuestions và cập nhật version assert.                                 |
| `tests/routes/review-route.test.tsx` | Thêm test route `/review` cho queue đúng/sai/rỗng/entry hỏng.                                           |
| `CHANGELOG.md`                       | Ghi nhận `FEATURE-007`.                                                                                 |

## 3. Design decisions

- Dùng tombstone `resolvedAt` trên từng `wrongQuestions` entry thay vì dựa
  vào timestamp mutation của cả snapshot để suy diễn một câu sai đã được
  ôn xong hay chưa.
- `recordWrongAnswer` nhận thêm option `incrementMissCount?: boolean` để
  route `/review` chỉ cập nhật `lastMissedAt` khi trả lời sai lại, không
  tăng `missCount` trái với assumption của plan.
- `ReviewRoute` chụp snapshot hàng đợi ban đầu của phiên ôn để tránh vòng
  lặp vô hạn hoặc thay đổi index khi store bị cập nhật giữa phiên.

## Post-review fix

- Review độc lập đã xác nhận một bug logic trong merge `wrongQuestions`:
  code cũ dùng `snapshot.lastMutationAt` để quyết định một entry bị thiếu ở
  một phía là "đã resolve", nên một mutation không liên quan vẫn có thể làm
  rơi mất câu sai chưa từng được trả lời đúng.
- Repro:
  - Thiết bị A trả lời sai câu Q lúc `09:00`, nên
    `wrongQuestions[Q].lastMissedAt = 09:00`.
  - Thiết bị B hoàn thành một bài học khác lúc `10:00`, nên snapshot của B
    có `lastMutationAt = 10:00` nhưng chưa hề có `wrongQuestions[Q]`.
  - Merge cũ thấy B thiếu key Q và `10:00 > 09:00`, rồi xoá Q khỏi kết quả
    merge dù học sinh chưa từng ôn đúng Q ở đâu cả.
- Fix đã áp dụng:
  - Thêm `resolvedAt?: string | null` vào `WrongQuestionEntry`.
  - `clearWrongAnswer` không xoá key nữa, mà ghi tombstone `resolvedAt`.
  - Merge `wrongQuestions` không còn dùng heuristic snapshot-level; nếu key
    chỉ có ở một phía thì giữ nguyên, nếu có ở cả hai phía thì merge
    `missCount`, `lastMissedAt`, `resolvedAt` theo max timestamp từng field.
  - Trạng thái "cần ôn" giờ được tính bằng helper
    `isWrongQuestionPending(entry)` với điều kiện
    `!resolvedAt || lastMissedAt > resolvedAt`.
  - `/review`, badge header và badge trang hồ sơ đều đã chuyển sang lọc
    theo helper này.

## 4. Deviations from the approved plan

- Không có deviation về scope code.
- Về validation:
  - `npm run validate-content` không chạy được trong sandbox vì `tsx` CLI
    bị chặn tạo IPC pipe (`EPERM` ở `/tmp/tsx-1000/*.pipe`); đã chạy lệnh
    tương đương `node --import tsx scripts/validate-content.ts` và pass.
  - `npm run format:check` toàn repo fail vì `AI_WORKFLOW.md` ngoài scope
    chưa khớp Prettier; các file thuộc `FEATURE-007` đều pass với
    `npx prettier --check ...`.

## 5. Commands executed

```bash
npx prettier --write src/store/progress.ts src/lib/progressSync.ts src/lib/content.ts src/components/LessonPlayer.tsx src/App.tsx src/routes/ProfileRoute.tsx src/routes/ReviewRoute.tsx tests/store/progress.test.ts tests/lib/progress-sync.test.ts tests/routes/review-route.test.tsx
npm test
npm run format:check
node --import tsx scripts/validate-content.ts
npm run lint
npm run typecheck
npx prettier --check src/store/progress.ts src/lib/progressSync.ts src/lib/content.ts src/components/LessonPlayer.tsx src/App.tsx src/routes/ProfileRoute.tsx src/routes/ReviewRoute.tsx tests/store/progress.test.ts tests/lib/progress-sync.test.ts tests/routes/review-route.test.tsx
npx vite build
```

## 6. Validation results

| Check                            | Result                                                   |
| -------------------------------- | -------------------------------------------------------- |
| Tests (`npm test`)               | PASS                                                     |
| Lint (`npm run lint`)            | PASS                                                     |
| Typecheck (`npm run typecheck`)  | PASS                                                     |
| Content validation               | PASS via `node --import tsx scripts/validate-content.ts` |
| Build (`npx vite build`)         | PASS                                                     |
| Formatter on FEATURE-007 files   | PASS                                                     |
| Full-repo `npm run format:check` | FAIL on pre-existing `AI_WORKFLOW.md` outside scope      |
| Security checks                  | N/A (repo không có script/check chuyên biệt)             |

## 7. Known limitations

- Nếu content đổi và để lại entry mồ côi thì `/review` sẽ bỏ qua entry đó,
  nhưng tombstone/raw entry vẫn còn trong store cho đến khi có cơ chế dọn
  dữ liệu riêng.

## 8. Remaining risks

- Tombstone `resolvedAt` đã loại bỏ bug xoá nhầm do mutation không liên
  quan, nhưng hệ hiện tại vẫn chỉ lưu metadata gọn cho mỗi câu sai, chưa có
  audit trail nếu sau này cần giải thích lịch sử resolve/re-miss chi tiết.

## 9. Follow-up work

- Nếu về sau cần analytics chi tiết cho lịch sử ôn tập, có thể mở rộng
  metadata sync per-key ngoài `missCount`, `lastMissedAt`, `resolvedAt`.
- Cần sửa `AI_WORKFLOW.md` theo Prettier ở một thay đổi riêng để
  `npm run format:check` toàn repo quay lại xanh.
