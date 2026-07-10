# FEATURE-009: Tách Lý thuyết / Giải bài tập + nút Thoát phiên

## Status

- Status: APPROVED <!-- DRAFT | APPROVED | SUPERSEDED -->
- Owner: Claude Code
- Approved by: tuann2
- Approved date: 2026-07-10

## 1. Objective

Học sinh chọn ngay từ trang chủ giữa hai chế độ độc lập cho mỗi bài
học — "Lý thuyết" (chỉ đọc thẻ) hoặc "Giải bài tập" (chỉ làm quiz),
thay vì luôn phải học tuần tự lý thuyết → quiz như hiện tại. Đồng
thời, thêm nút Thoát tường minh (có xác nhận) ở mọi màn hình đang có
phiên hoạt động — giải bài tập trong bài học, đang thi thử, đang ôn
câu sai — để học sinh quay về trang chính (`/`) bất cứ lúc nào mà
không cần dùng thanh điều hướng ngầm.

## 2. Current system analysis

- `src/routes/HomeRoute.tsx`: có toggle `activePart` (`inorganic` /
  `organic`) lọc `getUnitsByPart`, render `<LessonMap units={partUnits} ...>`.
  Chưa có khái niệm chế độ (lý thuyết/bài tập).
- `src/components/LessonMap.tsx`: mỗi bài học khả dụng+đã mở khoá là
  MỘT `<Link to={`/learn/${unit.id}/${lesson.id}`}>` bọc cả dòng. Bài
  khoá/chưa mở render `<div>` tĩnh. Logic khoá dựa trên
  `unlockedLessonIds` (từ progress store), sao dựa trên
  `lessonProgress[...].stars`.
- `src/App.tsx`: route hiện tại `<Route path="/learn/:unitId/:lessonId" element={<LessonRoute />} />`.
  Top-nav có `/`, `/exam`, `/review`, `/profile` — không đổi.
- `src/routes/LessonRoute.tsx`: 3 guard tuần tự (not-found / unit hoặc
  lesson chưa `available` / lesson chưa nằm trong `unlockedLessonIds`)
  rồi render `<LessonPlayer lesson unit units />`.
- `src/components/LessonPlayer.tsx`: state machine nội bộ
  `Phase = 'theory' | 'quiz' | 'result'`, luôn khởi tạo
  `phase = 'theory'`. Theory phase render tuần tự `TheoryCard`
  (`lesson.cards`), hết thẻ cuối tự `setPhase('quiz')`. Quiz phase
  dùng `questionQueue = [...lesson.questions, ...reviewQueue]` (retry
  queue cho câu sai lần đầu), gọi `recordWrongAnswer`/`clearWrongAnswer`
  theo từng câu ngay khi trả lời (KHÔNG đợi hoàn thành bài — dữ liệu
  này an toàn nếu người dùng thoát giữa chừng). Hết quiz gọi
  `finishLesson()` → `completeLesson(...)` (tính XP/sao, mở khoá bài
  kế) → `setPhase('result')` → render `ResultScreen` (props gồm
  `onBackHome`, `onNextLesson?`, `onReplay`). `ProgressBar` hiện dùng
  tổng `cards.length + questions.length` xuyên suốt cả hai phase.
- `src/routes/ExamRoute.tsx`: phase `'running'` (dòng ~778-838) render
  header `bg-ink` (đồng hồ đếm ngược) + `QuestionRenderer`, không gọi
  `recordExamAttempt`/lưu lịch sử cho tới khi nộp bài hoặc hết giờ —
  thoát giữa chừng vốn dĩ không lưu gì, an toàn về mặt dữ liệu.
- `src/routes/ReviewRoute.tsx`: khi còn câu trong `queue` (dòng
  ~172-198) render header `bg-ink` + `QuestionRenderer`; mỗi câu trả
  lời được `clearWrongAnswer`/`recordWrongAnswer` ngay lập tức (không
  đợi hết hàng đợi) — thoát giữa chừng chỉ mất vị trí trong phiên,
  không mất dữ liệu.
- `src/components/QuestionRenderer.tsx`, `TheoryCard.tsx`: component
  thuần (props only, không tự điều hướng) — không cần sửa.
- Không có bất kỳ pattern xác nhận/thoát nào trong codebase hiện tại
  (`grep` không ra kết quả cho `confirm(`, `beforeunload`, `Thoát`,
  `exit`, `Xác nhận`) — đây là lần đầu thêm cơ chế này.

## 3. Assumptions

- "Lý thuyết" và "Giải bài tập" là hai luồng độc lập hoàn toàn ở một
  bài học; không còn luồng gộp tuần tự "học lý thuyết rồi tự động
  chuyển sang quiz" như hiện tại — route gộp cũ bị xoá, không giữ lại
  để tương thích ngược (app nội bộ, không có external link cần giữ).
- Chế độ "Lý thuyết" không tính điểm/XP/sao/hoàn thành bài — nhất quán
  với nguyên tắc đã áp dụng cho `/review` và `/exam` (không cộng
  XP/sao). Chỉ chế độ "Giải bài tập" mới gọi `completeLesson` như
  logic hiện tại.
- Khoá/mở bài (`unlockedLessonIds`) áp dụng như nhau cho cả hai chế
  độ — không cho xem trước lý thuyết của bài đang khoá.
- Nút Thoát dùng `window.confirm()` gốc trình duyệt (đã chốt với
  người dùng) — không xây modal tuỳ chỉnh mới trong bản này.
- Thoát giữa chừng luôn điều hướng về `/` — không cần lưu thêm state
  nào khác vì dữ liệu câu hỏi (đúng/sai) đã được ghi nhận ngay khi trả
  lời ở cả 3 luồng (quiz trong bài học, thi thử, ôn tập); chỉ có
  "hoàn thành bài học"/"lịch sử thi" là chưa được ghi nếu thoát trước
  khi xong — đây vốn là hành vi đúng theo thiết kế hiện tại.

## 4. Scope

- `src/routes/HomeRoute.tsx`: thêm toggle chế độ (`activeMode: 'theory' | 'practice'`)
  song song với toggle Part hiện có, truyền `mode` xuống `LessonMap`.
- `src/components/LessonMap.tsx`: thêm prop `mode`, đổi đích liên kết
  mỗi bài học thành `/learn/${unit.id}/${lesson.id}/${mode}`.
- `src/App.tsx`: thay route gộp bằng hai route tường minh
  `/learn/:unitId/:lessonId/theory` và `/learn/:unitId/:lessonId/practice`,
  cùng dùng `LessonRoute` với prop `mode` khác nhau.
- `src/routes/LessonRoute.tsx`: nhận prop `mode`, giữ nguyên 3 guard,
  truyền `mode` xuống `LessonPlayer`.
- `src/components/LessonPlayer.tsx`: nhận prop `mode`; khởi tạo/reset
  `phase` theo `mode` (`theory` → bắt đầu ở `'theory'`, `practice` →
  bắt đầu thẳng ở `'quiz'`, bỏ qua thẻ lý thuyết hoàn toàn); thêm phase
  mới `'theory-done'` cho luồng theory (2 CTA: sang `/practice` của
  cùng bài, hoặc về `/`); sửa `ProgressBar` total cho từng chế độ;
  thêm `ExitButton` vào header phase `theory` và `quiz`.
- `src/components/ExitButton.tsx` (mới): nút dùng chung, nhận
  `confirmMessage`, gọi `window.confirm` rồi `navigate('/')`.
- `src/routes/ExamRoute.tsx`: thêm `ExitButton` vào header phase
  `'running'`.
- `src/routes/ReviewRoute.tsx`: thêm `ExitButton` vào header khi còn
  câu trong hàng đợi.
- Test cho: `LessonPlayer` theo từng mode, `LessonMap` đích liên kết
  theo mode, route wiring, `ExitButton` (xác nhận/huỷ).

## 5. Out of scope

- Không đổi cấu trúc/tính năng của `/exam` và `/review` ngoài việc
  thêm nút Thoát — hai tính năng này đã độc lập sẵn.
- Không xây modal xác nhận tuỳ chỉnh (dùng `window.confirm` gốc).
- Không giữ route gộp cũ `/learn/:unitId/:lessonId` để tương thích
  ngược.
- Không thay đổi cách tính XP/sao/streak, không thay đổi thuật toán
  chọn câu thi thử hay merge tiến độ Supabase.
- Không đổi kiến trúc dữ liệu Supabase — không thêm cột/bảng mới.

## 6. Proposed design

### HomeRoute — chọn chế độ ngay từ đầu

Thêm state `activeMode` và một hàng toggle thứ hai (cùng pattern nút
bo tròn `rounded-full` đã dùng cho `activePart`), nhãn "Lý thuyết" /
"Giải bài tập". Kết hợp với toggle Part hiện có tạo hiệu quả 4 lựa
chọn (Vô cơ·Lý thuyết, Vô cơ·Bài tập, Hữu cơ·Lý thuyết, Hữu cơ·Bài
tập) mà không cần 4 nút cứng riêng biệt (dễ mở rộng nếu thêm Part sau
này).

### Routing tường minh theo mode

```
/learn/:unitId/:lessonId/theory    -> LessonRoute mode="theory"   -> LessonPlayer mode="theory"
/learn/:unitId/:lessonId/practice  -> LessonRoute mode="practice" -> LessonPlayer mode="practice"
```

`LessonMap` build link theo `mode` prop nhận từ `HomeRoute`; guard
khoá/mở bài trong `LessonRoute` không đổi.

### LessonPlayer theo mode

- `mode="practice"`: `phase` khởi tạo `'quiz'` ngay, bỏ qua nhánh
  render theory-card hoàn toàn. Toàn bộ logic còn lại (retry queue,
  `finishLesson`, `completeLesson`, `ResultScreen`) giữ nguyên 100%.
- `mode="theory"`: `phase` khởi tạo `'theory'`. Ở thẻ cuối, thay vì
  `setPhase('quiz')`, chuyển sang phase mới `'theory-done'`:
  ```
  "Em đã đọc xong lý thuyết bài {lesson.title}!"
  [Giải bài tập ngay] -> navigate(`/learn/${unit.id}/${lesson.id}/practice`)
  [Về lộ trình]        -> navigate('/')
  ```
  Không gọi `completeLesson`, không tính XP/sao.
- `resetLesson()`: reset về đúng phase khởi đầu theo `mode` thay vì
  hardcode `'theory'`.
- `ProgressBar`: `mode="theory"` → total = `lesson.cards.length`;
  `mode="practice"` → total = `questionQueue.length`.

### ExitButton dùng chung

```tsx
interface ExitButtonProps {
  confirmMessage: string;
  className?: string;
}

export function ExitButton({ confirmMessage, className }: ExitButtonProps) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => {
        if (window.confirm(confirmMessage)) {
          navigate('/');
        }
      }}
      className={
        className ??
        'rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/25'
      }
    >
      ✕ Thoát
    </button>
  );
}
```

Gắn vào 4 vị trí (đặt trong header `bg-ink` sẵn có, đổi layout header
sang `flex items-start justify-between` để nhét nút vào góc phải):

| Vị trí                               | Message                                                                                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `LessonPlayer` phase `theory`        | "Thoát học lý thuyết? Tiến trình đọc thẻ hiện tại sẽ không được lưu."                                                                       |
| `LessonPlayer` phase `quiz`          | "Thoát giải bài tập? Bài học sẽ chưa được tính hoàn thành (không cộng XP/sao), nhưng các câu đã trả lời vẫn được ghi vào danh sách cần ôn." |
| `ExamRoute` phase `running`          | "Thoát bài thi? Lần thi này sẽ không được lưu vào lịch sử."                                                                                 |
| `ReviewRoute` còn câu trong hàng đợi | "Thoát ôn tập? Câu đã làm vẫn được lưu, các câu còn lại vẫn ở trong danh sách cần ôn."                                                      |

Không cần gọi thêm store action nào khi thoát — dữ liệu câu hỏi đã
được ghi nhận theo từng câu; việc không gọi `completeLesson`/
`recordExamAttempt` khi thoát giữa chừng là hành vi đúng theo thiết
kế hiện tại (chỉ tính khi hoàn thành).

## 7. Files to create

- `src/components/ExitButton.tsx`

## 8. Files to modify

- `src/routes/HomeRoute.tsx`
- `src/components/LessonMap.tsx`
- `src/App.tsx`
- `src/routes/LessonRoute.tsx`
- `src/components/LessonPlayer.tsx`
- `src/routes/ExamRoute.tsx`
- `src/routes/ReviewRoute.tsx`
- File test tương ứng cho các component/route trên (theo cấu trúc test hiện có của dự án)

## 9. API and database impact

Không có — không đổi schema Supabase, không đổi `ProgressSnapshot`
hay `progressSync.ts`. Đây thuần là thay đổi routing + UI phía client.

## 10. Implementation steps

1. Thêm `ExitButton.tsx` (component thuần, không phụ thuộc gì ngoài
   `react-router-dom`).
2. Sửa `LessonPlayer.tsx`: thêm prop `mode`, phase `theory-done`,
   khởi tạo/reset phase theo mode, bỏ nhánh theory khi `mode="practice"`,
   sửa `ProgressBar` total, gắn `ExitButton` vào 2 header liên quan.
3. Sửa `LessonRoute.tsx`: nhận và truyền `mode`.
4. Sửa `App.tsx`: đổi route gộp thành 2 route `/theory` và `/practice`.
5. Sửa `LessonMap.tsx`: thêm prop `mode`, đổi đích Link.
6. Sửa `HomeRoute.tsx`: thêm toggle mode, truyền xuống `LessonMap`.
7. Gắn `ExitButton` vào `ExamRoute.tsx` (phase running) và
   `ReviewRoute.tsx` (còn câu trong hàng đợi).
8. Viết/cập nhật test cho tất cả các thay đổi trên.
9. Chạy `npm run validate-content && npm test && npm run lint && npm run typecheck`.

## 11. Test strategy

- Unit test `LessonPlayer`: `mode="theory"` dừng đúng ở `theory-done`,
  không gọi `completeLesson`; CTA "Giải bài tập ngay" điều hướng đúng
  route; `mode="practice"` bỏ qua theory, hành vi quiz/XP/sao giống hệt
  hành vi cũ (regression).
- Unit test `LessonMap`: link đích đổi đúng theo prop `mode` cho cả
  bài mở khoá; bài khoá/chưa mở vẫn render tĩnh như cũ.
- Test route wiring (`App.tsx`/`LessonRoute`): cả `/theory` và
  `/practice` đi qua đúng 3 guard cũ (not-found, chưa mở, đang khoá).
- Unit test `ExitButton`: mock `window.confirm` trả `true` → gọi
  `navigate('/')`; trả `false` → không điều hướng.
- Regression: đảm bảo luồng `/exam` và `/review` không đổi hành vi
  chấm điểm/lưu lịch sử, chỉ thêm nút Thoát.

## 12. Security considerations

Không có thay đổi liên quan bảo mật — không đổi auth, không đổi RLS,
không đổi bề mặt API. `ExitButton` chỉ điều hướng phía client bằng
`react-router-dom`, không có input người dùng cần escape.

## 13. Risks

| Risk                                                                          | Impact                                  | Mitigation                                                                  |
| ----------------------------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------- |
| Xoá route gộp cũ có thể phá bookmark/link cũ nếu người dùng đã lưu            | Thấp — app cá nhân, chưa phát hành rộng | Chấp nhận rủi ro (đã xác nhận out of scope giữ tương thích ngược)           |
| Quên gắn `ExitButton` nhất quán ở cả 4 vị trí khiến trải nghiệm không đồng bộ | Trung bình                              | Checklist rõ trong mục 6, review diff đối chiếu đủ 4 vị trí trước khi merge |
| `ProgressBar` tính sai tổng số khi tách mode (off-by-N)                       | Thấp                                    | Test riêng cho từng mode ở mục 11                                           |

## 14. Rollback plan

Thay đổi chỉ nằm trong nhánh `feature/FEATURE-009`, chưa merge vào
`main`. Nếu phát sinh lỗi sau khi merge: `git revert` commit merge
tương ứng (không có migration DB nào cần rollback riêng).

## 15. Acceptance criteria

- [ ] Từ `/`, chọn "Lý thuyết" (bất kỳ Part) rồi bấm một bài đã mở →
      chỉ thấy thẻ lý thuyết, không thấy quiz.
- [ ] Đọc hết thẻ lý thuyết → màn "theory-done" với 2 CTA hoạt động
      đúng đích.
- [ ] Từ `/`, chọn "Giải bài tập" rồi bấm bài đã mở → vào thẳng quiz,
      hoàn thành nhận XP/sao như hành vi hiện tại (không regressions).
- [ ] Bài khoá/chưa mở vẫn bị chặn đúng như cũ ở cả hai mode.
- [ ] Nút "✕ Thoát" xuất hiện và hoạt động đúng ở: quiz trong bài học,
      lý thuyết trong bài học, `/exam` lúc đang thi, `/review` lúc còn
      câu — huỷ xác nhận thì ở lại, đồng ý thì về `/`.
- [ ] `npm test && npm run lint && npm run typecheck && npm run validate-content` pass.
