# FEATURE-007: Ôn lại câu sai

## Status

- Status: APPROVED <!-- DRAFT | APPROVED | SUPERSEDED -->
- Owner: Claude Code
- Approved by: tuann2
- Approved date: 2026-07-06

## 1. Objective

Học sinh trả lời sai một câu trong bất kỳ bài học nào thì câu đó được
lưu vào danh sách "cần ôn". Có một trang `/review` gom toàn bộ câu sai
trên toàn app để học sinh luyện lại; trả lời đúng trong phiên ôn thì
câu đó biến mất khỏi danh sách. Dữ liệu này đồng bộ qua cơ chế Supabase
đã có ở FEATURE-006 (không cần dependency/service mới).

## 2. Current system analysis

- `src/store/progress.ts` quản lý `ProgressState` (Zustand + persist,
  `PROGRESS_VERSION = 1`), lưu `lessonProgress`, `unlockedLessonIds`,
  `totalXp`, streak. Không có khái niệm "câu sai".
- `src/components/LessonPlayer.tsx` đã có logic phát hiện câu sai ở
  lần làm đầu tiên (`firstAttemptSeen`, `retryIds`) nhưng chỉ dùng nội
  bộ trong một phiên học — không lưu lại, không tồn tại sau khi rời
  bài học.
- `src/lib/progressSync.ts` (FEATURE-006) định nghĩa `ProgressSnapshot`,
  `normalizeProgressSnapshot`, `mergeProgress` (max theo lesson, union
  unlockedLessonIds) và debounce push khi có mutation
  `completeLesson`/`reset`. Đây là cơ chế cần mở rộng để đồng bộ câu
  sai theo cùng nguyên tắc offline-first.
- `src/lib/content.ts` có `findUnit`, `findLesson` nhưng chưa có hàm
  tra một `Question` cụ thể theo `unitId/lessonId/questionId`.
- Route hiện có: `/`, `/auth`, `/learn/:unitId/:lessonId`, `/profile`
  (`src/App.tsx`). Chưa có `/review`.
- `QuestionRenderer` là component thuần (nhận `question`, `result`,
  `onSubmit`, `onNext`) — tái dùng được cho màn ôn tập mà không cần
  sửa.

## 3. Assumptions

- "Câu sai" được tính ở lần làm đầu tiên của câu đó trong một bài học
  (giống logic `firstAttemptSeen` hiện có), không tính các lần làm lại
  ngay trong bài (retry queue).
- Trả lời đúng trong chính phiên ôn `/review` thì xoá khỏi danh sách
  ngay; trả lời sai trong phiên ôn thì giữ lại (không tăng gấp đôi số
  liệu thống kê `missCount`, chỉ cập nhật `lastMissedAt`).
- Phiên ôn không cộng thêm XP — tránh học sinh cày XP ảo bằng cách cố
  tình trả lời sai rồi ôn lại nhiều lần.
- Câu hỏi có thể bị xoá/đổi ID nếu nội dung được chỉnh sửa sau này;
  cần xử lý phòng thủ (bỏ qua entry không tìm thấy câu hỏi tương ứng)
  thay vì crash.
- Không giới hạn số câu ôn mỗi phiên (học sinh THCS thường không có
  hàng trăm câu sai cùng lúc); nếu danh sách rỗng thì `/review` hiển
  thị trạng thái "không có câu cần ôn".

## 4. Scope

- Mở rộng `ProgressState`/`ProgressSnapshot`: thêm `wrongQuestions`
  (map theo khoá `unitId::lessonId::questionId`), bump
  `PROGRESS_VERSION` lên 2 kèm hàm `migrate` cho dữ liệu cũ.
  Bump version sẽ trực tiếp phá vỡ `wrongQuestions` normalize hiện có
  trong `progressSync.ts` — phải cập nhật đồng thời cả hai file.
- Action mới trên progress store: `recordWrongAnswer`,
  `clearWrongAnswer`.
- `LessonPlayer`: khi câu sai ở lần làm đầu → gọi `recordWrongAnswer`;
  khi câu đúng ở lần làm đầu và câu đó từng nằm trong danh sách sai
  (học sinh tự sửa được ngay trong bài) → gọi `clearWrongAnswer`.
- Mở rộng `progressSync.ts`: `normalizeProgressSnapshot` validate
  `wrongQuestions`; `mergeProgress` hợp nhất theo khoá (giữ
  `missCount` lớn hơn, `lastMissedAt` mới hơn); thêm 2 mutation source
  mới vào danh sách trigger debounce push.
- Thêm `findQuestion(unitId, lessonId, questionId)` vào
  `src/lib/content.ts`.
- Route mới `/review` (`src/routes/ReviewRoute.tsx`): gom toàn bộ
  entry hợp lệ trong `wrongQuestions`, hiển thị bằng
  `QuestionRenderer` theo tuần tự, trả lời đúng thì loại khỏi hàng đợi
  và gọi `clearWrongAnswer`; hết hàng đợi thì hiển thị màn hoàn thành
  đơn giản (không xuyên qua `ResultScreen`/không tính sao/XP vì đây
  không phải một "bài học").
- Badge số câu cần ôn: hiển thị trên header (`App.tsx`) và
  `ProfileRoute`, link sang `/review`.
- Test: migrate v1 → v2 không crash; record/clear hoạt động đúng;
  merge hợp nhất đúng; ReviewRoute vòng lặp chấm đúng/sai và loại câu
  khi trả lời đúng.

## 5. Out of scope

- Không giới hạn/soft-cap số câu ôn mỗi ngày (có thể cân nhắc ở
  backlog nếu học sinh có quá nhiều câu sai).
- Không thêm chế độ ôn theo chuyên đề riêng lẻ (chỉ có một hàng đợi
  gộp toàn app trong bản này).
- Không thay đổi cách tính XP/sao của bài học gốc.
- Không đổi kiến trúc Supabase hay thêm bảng mới — `wrongQuestions`
  nằm trong cùng cột `data JSONB` của bảng `progress` đã có.

## 6. Proposed design

### Data model

```ts
export interface WrongQuestionEntry {
  unitId: string;
  lessonId: string;
  questionId: string;
  missCount: number;
  lastMissedAt: string; // ISO date
}

// key = `${unitId}::${lessonId}::${questionId}`
wrongQuestions: Record<string, WrongQuestionEntry>;
```

Thêm vào `ProgressState` và `ProgressSnapshot`. Khoá tổ hợp tránh đụng
độ nếu về sau câu hỏi trùng ID giữa các bài (id câu hỏi hiện chỉ duy
nhất trong phạm vi 1 bài).

### Progress store actions

```ts
recordWrongAnswer(unitId, lessonId, questionId, date = new Date()) {
  // upsert entry: missCount += 1 (hoặc 1 nếu mới), lastMissedAt = date
}

clearWrongAnswer(unitId, lessonId, questionId) {
  // xoá key khỏi wrongQuestions nếu tồn tại
}
```

Cả hai set `lastMutationSource` tương ứng để `progressSync`
subscribe và debounce push giống `completeLesson`.

### Persist migration

```ts
persist(..., {
  name: PROGRESS_STORAGE_KEY,
  version: PROGRESS_VERSION, // 2
  migrate: (persistedState, version) => {
    if (version < 2) {
      return { ...persistedState, wrongQuestions: {} };
    }
    return persistedState;
  },
  storage: createSafeStorage()
})
```

### LessonPlayer integration

Trong `handleSubmit`, khi `isFirstAttempt`:

```ts
if (correct) {
  setCorrectFirstTry(...);
  clearWrongAnswer(unit.id, lesson.id, currentQuestion.id); // an toàn nếu chưa từng sai
} else {
  setRetryIds(...);
  recordWrongAnswer(unit.id, lesson.id, currentQuestion.id);
}
```

### progressSync.ts mở rộng

- `normalizeProgressSnapshot`: validate `wrongQuestions` là object,
  mỗi entry có `missCount` (number ≥ 0), `lastMissedAt` (string),
  `unitId`/`lessonId`/`questionId` (string); entry hỏng bị loại thay
  vì làm hỏng toàn bộ snapshot.
- `mergeProgress`: với mỗi khoá xuất hiện ở local hoặc server, giữ
  `missCount = Math.max(...)`, `lastMissedAt` = giá trị mới hơn (so
  sánh ISO string). Nếu một bên đã xoá (không có khoá) mà bên kia còn
  — đây là trường hợp học sinh đã ôn đúng trên máy A nhưng máy B chưa
  đồng bộ; giữ nguyên tắc "không mất câu cần ôn" của hệ thiết kế hiện
  tại nghĩa là **union theo khoá còn tồn tại ở ít nhất một bên** (nếu
  một bên đã xoá do ôn đúng thì kết quả merge cũng nên xoá, vì xoá là
  hành động có chủ đích mới hơn). Quyết định: dùng nguyên tắc "khoá chỉ
  bị xoá khi cả hai bên đều không có nó, HOẶC bên có `lastMissedAt` mới
  hơn đã xoá nó" — cụ thể: nếu một bên thiếu khoá nhưng
  `updated_at`/timestamp tổng thể của bên đó mới hơn thời điểm
  `lastMissedAt` còn lưu ở bên kia, thì coi là đã ôn xong và loại khỏi
  kết quả merge. (Chi tiết thuật toán do Codex triển khai và phải có
  test cho đúng 3 case: cả hai sai giống nhau → giữ, chỉ một bên sai →
  giữ, một bên đã ôn xong sau khi bên kia ghi nhận sai → xoá.)
- Thêm `recordWrongAnswer`/`clearWrongAnswer` vào danh sách
  `source` được `subscribeProgressPush` lắng nghe.

### `/review` route

- `findQuestion(unitId, lessonId, questionId)` trong `lib/content.ts`
  trả về `Question | undefined`.
- `ReviewRoute.tsx`: đọc `wrongQuestions` từ progress store, resolve
  từng entry thành `{ unit, lesson, question }` qua `findQuestion`,
  bỏ qua entry không resolve được (nội dung đã đổi). Danh sách rỗng →
  hiển thị "Không có câu nào cần ôn, học tiếp bài mới nhé!" kèm link
  `/`.
- Nếu có câu: chạy tuần tự bằng `QuestionRenderer` (component thuần,
  tái dùng nguyên trạng); trả lời đúng → `clearWrongAnswer` + chuyển
  câu tiếp; trả lời sai → cập nhật `lastMissedAt` qua
  `recordWrongAnswer`, vẫn chuyển câu tiếp (không lặp vô hạn ngay
  trong phiên, tránh gây khó chịu — học sinh có thể mở lại `/review`
  sau).
- Hết hàng đợi ban đầu → màn hoàn thành đơn giản, không có sao/XP,
  chỉ có nút "Quay về lộ trình" và số câu đã ôn đúng/còn sai trong
  phiên.

### UI badge

- `App.tsx` header: thêm mục điều hướng `/review` kèm số đếm
  `Object.keys(wrongQuestions).length` nếu > 0 (badge nhỏ).
- `ProfileRoute.tsx`: hiển thị số câu cần ôn + link `/review`.

## 7. Files to create

- `src/routes/ReviewRoute.tsx`
- `tests/routes/review-route.test.tsx`

## 8. Files to modify

- `src/store/progress.ts` (wrongQuestions, actions, migrate, version 2)
- `src/lib/progressSync.ts` (normalize, merge, mutation source list)
- `src/lib/content.ts` (`findQuestion`)
- `src/components/LessonPlayer.tsx` (gọi record/clear khi chấm câu)
- `src/App.tsx` (route `/review`, badge header)
- `src/routes/ProfileRoute.tsx` (badge + link)
- `tests/store/progress.test.ts` (test action mới + migrate)
- `tests/lib/progress-sync.test.ts` (test merge wrongQuestions)
- `CHANGELOG.md`

## 9. API and database impact

Không đổi schema Supabase. `wrongQuestions` nằm trong cột `data JSONB`
hiện có của bảng `public.progress` (đã tạo ở FEATURE-006). Không cần
migration SQL mới.

## 10. Implementation steps

1. Thêm `WrongQuestionEntry`, mở rộng `ProgressState`/
   `ProgressSnapshot`, bump `PROGRESS_VERSION` = 2 kèm `migrate`.
2. Thêm action `recordWrongAnswer`/`clearWrongAnswer`, cập nhật
   `lastMutationSource`.
3. Thêm `findQuestion` vào `lib/content.ts`.
4. Nối `LessonPlayer.handleSubmit` với 2 action trên.
5. Mở rộng `normalizeProgressSnapshot` và `mergeProgress` trong
   `progressSync.ts`; thêm mutation source mới vào
   `subscribeProgressPush`.
6. Viết `ReviewRoute.tsx` + đăng ký route trong `App.tsx` + badge.
7. Cập nhật `ProfileRoute.tsx` badge/link.
8. Viết/':cập nhật test cho toàn bộ phần trên.
9. Chạy đủ 5 lệnh validation, tự giải lại các case merge bằng tay để
   xác nhận đúng 3 kịch bản nêu ở mục 6.
10. Cập nhật `CHANGELOG.md`, tạo
    `docs/handoffs/FEATURE-007-implementation.md`.

## 11. Test strategy

- **Unit — progress store**: `recordWrongAnswer` tạo mới/tăng
  `missCount`; `clearWrongAnswer` xoá đúng khoá, không ảnh hưởng khoá
  khác; migrate từ state v1 (không có `wrongQuestions`) lên v2 không
  crash và trả về object rỗng.
- **Unit — progressSync**: `normalizeProgressSnapshot` loại entry
  thiếu field mà không loại cả snapshot; `mergeProgress` đúng 3 case
  nêu ở mục 6 (cả hai sai → giữ, một bên sai → giữ, một bên đã ôn
  xong sau → xoá).
- **Integration — LessonPlayer**: trả lời sai lần đầu → gọi
  `recordWrongAnswer` (mock store, assert call); trả lời đúng lần
  đầu sau khi từng sai (trong retry queue của cùng phiên không tính,
  chỉ test qua lần học lại bài) → gọi `clearWrongAnswer`.
- **Integration — ReviewRoute**: hàng đợi 2 câu, trả lời đúng câu 1 →
  còn lại 1 câu trong hàng đợi UI, `clearWrongAnswer` được gọi; hàng
  đợi rỗng → hiển thị màn hoàn thành; danh sách sai rỗng từ đầu →
  hiển thị "không có câu cần ôn".
- **Regression**: 28 test hiện có của FEATURE-006 phải tiếp tục pass
  sau khi đổi `ProgressSnapshot`/`PROGRESS_VERSION`.
- **Negative case**: entry trong `wrongQuestions` trỏ tới câu hỏi đã
  bị xoá khỏi content JSON → `ReviewRoute` bỏ qua, không crash.

## 12. Security considerations

- Không có rủi ro bảo mật mới (không có input nhạy cảm, không gọi
  API bên ngoài ngoài Supabase đã có). Dữ liệu `wrongQuestions` vẫn đi
  qua đường ống RLS hiện có của FEATURE-006 — mỗi user chỉ đọc/ghi
  hàng `progress` của chính mình.
- Rủi ro duy nhất là logic: dữ liệu `wrongQuestions` sai định dạng từ
  server (do version cũ hoặc lỗi ghi) không được để phá vỡ toàn bộ
  `normalizeProgressSnapshot` — xử lý bằng cách loại từng entry hỏng
  thay vì trả `null` cho cả snapshot khi chỉ phần này lỗi.

## 13. Risks

| Risk                                                                                       | Impact                                                                                              | Mitigation                                                                                                                    |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Logic merge 3 chiều (giữ/giữ/xoá) sai lệch làm mất câu cần ôn hoặc hồi sinh câu đã ôn xong | Trung bình — trải nghiệm khó chịu, không mất dữ liệu học tập cốt lõi (XP/sao)                       | Test rõ 3 case; Gemini review độc lập phần merge trước khi commit (thuộc nhóm "numeric/logic" cần dual-review theo CLAUDE.md) |
| Bump `PROGRESS_VERSION` phá vỡ dữ liệu localStorage cũ của học sinh đang dùng              | Cao nếu migrate sai — mất tiến độ hiển thị (dữ liệu gốc vẫn còn trong localStorage, chỉ là đọc sai) | Viết `migrate` tường minh, test riêng cho migrate v1→v2, không đổi field cũ                                                   |
| Badge số câu sai gây phân tâm nếu quá nhiều                                                | Thấp                                                                                                | Chỉ hiển thị số đếm đơn giản, không ép buộc học sinh vào `/review`                                                            |

## 14. Rollback plan

- Đây là thay đổi thuần client + JSONB column đã có sẵn, không có
  migration SQL. Rollback bằng cách revert commit — dữ liệu
  `wrongQuestions` cũ trong JSONB không gây lỗi cho code trước đó (vì
  code cũ không đọc field này).
- Nếu migrate v1→v2 có vấn đề sau khi merge, phát hành hotfix sửa hàm
  `migrate` thay vì bump thêm version, để tránh chuỗi migrate dài.

## 15. Acceptance criteria

- [ ] Trả lời sai một câu trong bài học → câu đó xuất hiện trong
      `/review`.
- [ ] Trả lời đúng câu đó trong `/review` → biến mất khỏi danh sách,
      không xuất hiện lại ở lần tải trang sau.
- [ ] Badge số câu cần ôn hiển thị đúng trên header và trang cá nhân.
- [ ] Dữ liệu câu sai đồng bộ đúng giữa 2 thiết bị (khi đã đăng nhập
      theo FEATURE-006).
- [ ] Dữ liệu localStorage cũ (v1) không bị mất khi nâng cấp lên v2.
- [ ] 5 lệnh validation (`validate-content`, `test`, `lint`,
      `typecheck`, `build`) pass; test mới cho merge logic pass.
- [ ] Không có dependency/service mới được thêm (đúng scope, không
      cần cập nhật `docs/architecture.md`).
