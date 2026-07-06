# FEATURE-008: Chế độ thi thử

## Status

- Status: APPROVED <!-- DRAFT | APPROVED | SUPERSEDED -->
- Owner: Claude Code
- Approved by: tuann2
- Approved date: 2026-07-06

## 1. Objective

Học sinh tự tạo một đề thi thử (chọn phạm vi Vô cơ/Hữu cơ/tất cả hoặc
chọn chuyên đề cụ thể, 20–40 câu theo tỉ lệ ~40% Cơ bản / 40% Vận dụng
/ 20% HSG), làm bài có đồng hồ đếm ngược mà không thấy đáp án từng câu
cho tới khi nộp bài (hoặc hết giờ tự nộp), sau đó xem điểm theo từng
mức độ và xem lại từng câu kèm lời giải. Lịch sử các lần thi (điểm,
phạm vi, thời gian) được lưu vào tiến độ và đồng bộ qua Supabase như
FEATURE-006/007.

## 2. Current system analysis

- `src/lib/content.ts`: `getAllUnits`, `getUnitsByPart`, `findUnit`,
  `findLesson`, `findQuestion` (thêm ở FEATURE-007) đã đủ để duyệt và
  tra cứu câu hỏi theo `unitId/lessonId/questionId`.
- `src/lib/chemistry.ts`: có `isQuestionCorrect`, `calculateStars`,
  `groupQuestionsByLevel` (nhóm theo `basic/applied/hsg`),
  `availableLessons` — tái dùng được để xây kho câu hỏi theo mức.
  Chưa có logic chọn ngẫu nhiên có tỉ lệ hay seed.
- `src/components/QuestionRenderer.tsx`: component thuần, nhận
  `question`, `result`, `onSubmit`, `onNext`. Chỉ hiển thị hộp phản hồi
  đúng/sai khi prop `result` khác `null`. **Quan trọng cho thiết kế
  thi thử**: nếu component cha gọi `onSubmit` nhưng KHÔNG bao giờ set
  `result` (giữ `null`), rồi tự tăng `questionIndex` để đổi `question`
  - đổi `key`, thì `QuestionRenderer` remount sang câu tiếp theo mà
    không hiện đáp án — đúng yêu cầu "không hiện đáp án từng câu" mà
    **không cần sửa** component này.
- `src/components/ResultScreen.tsx`: gắn chặt với khái niệm một bài học
  (earnedXp, onNextLesson) — không tái dùng được nguyên trạng cho màn
  kết quả thi (cần bảng điểm theo mức + xem lại từng câu). Cần màn
  kết quả riêng cho thi thử.
- `src/store/progress.ts` (sau FEATURE-007): `PROGRESS_VERSION = 2`,
  đã có `wrongQuestions`, `lastMutationAt`, `migrateProgressState`.
  Chưa có khái niệm "lịch sử thi".
- `src/lib/progressSync.ts`: `ProgressSnapshot`, `normalizeProgressSnapshot`,
  `mergeProgress` đã xử lý `lessonProgress`, `wrongQuestions`. Cần mở
  rộng thêm cho `examHistory` theo cùng nguyên tắc offline-first.
- Route hiện có: `/`, `/auth`, `/learn/:unitId/:lessonId`, `/profile`,
  `/review`. Chưa có `/exam`.

## 3. Assumptions

- Thi thử **không cộng XP/sao/streak** — chỉ là công cụ tự luyện, giữ
  nguyên ngữ nghĩa "XP đến từ hoàn thành bài học" đã có (nhất quán với
  quyết định "`/review` không cộng XP" ở FEATURE-007).
- Câu hỏi trong đề chỉ lấy từ bài học có `status: 'available'` (không
  lấy nội dung "coming soon"), giống toàn bộ phần còn lại của app.
- Tỉ lệ mức 40/40/20 là mục tiêu, không phải ràng buộc cứng: nếu một
  mức không đủ câu trong phạm vi đã chọn, hệ thống bù từ mức còn lại
  (ưu tiên Vận dụng, sau đó Cơ bản) để đạt đủ tổng số câu; nếu tổng
  phạm vi vẫn không đủ số câu yêu cầu, giảm tổng số câu xuống bằng số
  câu khả dụng và báo cho học sinh biết trên màn hình.
- Thời gian làm bài = `số câu × 1 phút`, tối thiểu 15 phút (không cho
  học sinh tự chọn thời gian ở bản này, để giảm bề mặt cấu hình).
- Trả lời đúng một câu trong đề thi cũng xoá câu đó khỏi danh sách cần
  ôn nếu đang pending (nhất quán với hành vi `LessonPlayer`); trả lời
  sai thì ghi nhận vào `wrongQuestions` giống hệt luồng học bài thường.
- Chọn ngẫu nhiên câu hỏi dùng seed để có thể viết test xác định kết
  quả; sinh đề thật trên UI dùng seed ngẫu nhiên theo thời điểm bắt
  đầu làm bài.
- Lịch sử thi lưu tối đa 20 lần gần nhất (cắt bớt lần cũ nhất khi vượt)
  để tránh phình payload JSONB đồng bộ lên Supabase.
- Không lưu lại toàn bộ đề bài đã ra (danh sách question ID) vào lịch
  sử vĩnh viễn — chỉ lưu tại thời điểm làm bài trong phiên (state cục
  bộ của route) để hiển thị màn xem lại; lịch sử persist chỉ lưu số
  liệu tổng hợp (điểm, phạm vi, thời gian, breakdown theo mức). Xem
  lại chi tiết từng câu chỉ khả dụng ngay sau khi nộp bài trong cùng
  phiên, không phục hồi lại được sau khi rời trang.

## 4. Scope

- Thư viện logic mới `src/lib/exam.ts`:
  - `createSeededRandom(seed: number)`: PRNG xác định (mulberry32 hoặc
    tương đương), không phụ thuộc `Math.random`.
  - `buildExamQuestionPool(units, scope)`: trả về danh sách
    `{ unit, lesson, question }` theo phạm vi đã chọn.
  - `pickExamQuestions(pool, totalQuestions, random)`: chọn ngẫu nhiên
    theo tỉ lệ 40/40/20, xử lý thiếu hụt theo mục 3, không trùng câu.
  - `gradeExamAttempt(items, responses)`: chấm điểm, trả về accuracy
    tổng và breakdown theo từng mức (`basic/applied/hsg`: đúng/tổng).
- Mở rộng progress store (`src/store/progress.ts`): thêm
  `ExamAttempt` type, `examHistory: ExamAttempt[]`, action
  `recordExamAttempt`, bump `PROGRESS_VERSION` 2 → 3 kèm migrate.
- Mở rộng `progressSync.ts`: normalize + merge `examHistory` (union
  theo `id`, sort theo `finishedAt` giảm dần, cắt còn 20 phần tử mới
  nhất), thêm mutation source `recordExamAttempt` vào danh sách được
  đồng bộ.
- Route mới `/exam` (`src/routes/ExamRoute.tsx`), 3 giai đoạn nội bộ:
  1. **Cấu hình**: chọn phạm vi (tất cả / Vô cơ / Hữu cơ / chọn chuyên
     đề cụ thể) + số câu (20/30/40, mặc định 20).
  2. **Làm bài**: đồng hồ đếm ngược, tái dùng `QuestionRenderer` ở chế
     độ "không lộ đáp án" (theo cơ chế ở mục 2 — cha không set
     `result`, tự tăng index khi có `onSubmit`); hết giờ tự nộp toàn
     bộ câu chưa trả lời là sai.
  3. **Kết quả**: tổng điểm, breakdown theo mức, danh sách từng câu với
     đáp án học sinh chọn / đáp án đúng / lời giải (`explanation`).
- Component mới `src/components/CountdownTimer.tsx` (hoặc inline
  trong `ExamRoute` nếu đủ gọn — quyết định lúc code theo mức độ tái
  sử dụng thực tế).
- Cập nhật `ProfileRoute.tsx`: hiển thị 3–5 lần thi gần nhất (điểm,
  phạm vi, thời gian) với link `/exam` để thi tiếp.
- Cập nhật `App.tsx`: route `/exam`, thêm mục điều hướng.
- Test cho `lib/exam.ts` (chọn câu theo tỉ lệ, seed xác định, xử lý
  thiếu hụt, chấm điểm), progress store (migrate v2→v3,
  `recordExamAttempt`, cắt còn 20 phần tử), `progressSync.ts` (merge
  `examHistory`), và `ExamRoute` (luồng cấu hình → làm bài → kết quả,
  hết giờ tự nộp, câu sai vào `wrongQuestions`).

## 5. Out of scope

- Không cộng XP/sao/streak khi thi thử.
- Không cho học sinh tự chỉnh thời gian làm bài.
- Không lưu lại chi tiết từng câu của các lần thi cũ (chỉ số liệu tổng
  hợp trong lịch sử; xem lại chi tiết chỉ có ngay sau khi nộp bài).
- Không có chế độ thi thử nhiều người / bảng xếp hạng (đã có trong
  backlog riêng, không thuộc phạm vi này).
- Không thay đổi kiến trúc Supabase — `examHistory` nằm trong cùng cột
  `data JSONB` của bảng `progress` đã có.

## 6. Proposed design

### `src/lib/exam.ts`

```ts
export interface ExamScope {
  mode: 'all' | 'part' | 'units';
  part?: PartId;
  unitIds?: string[];
}

export interface ExamPoolItem {
  unit: UnitContent;
  lesson: Lesson;
  question: Question;
}

export function createSeededRandom(seed: number): () => number {
  // mulberry32 — trả về hàm sinh số [0,1) xác định theo seed
}

export function buildExamQuestionPool(
  units: UnitContent[],
  scope: ExamScope
): ExamPoolItem[] {
  // lọc theo scope, chỉ lesson.status === 'available'
}

export function pickExamQuestions(
  pool: ExamPoolItem[],
  totalQuestions: number,
  random: () => number
): { items: ExamPoolItem[]; actualTotal: number } {
  // chia pool theo level, lấy tỉ lệ 40/40/20 (Math.round + bù thiếu
  // hụt theo thứ tự ưu tiên applied -> basic), fisher-yates shuffle
  // bằng `random` trong từng nhóm trước khi cắt số lượng cần.
}

export interface ExamGradeResult {
  correctCount: number;
  totalQuestions: number;
  accuracy: number;
  breakdown: Record<QuestionLevel, { correct: number; total: number }>;
}

export function gradeExamAttempt(
  items: ExamPoolItem[],
  responses: Record<string, string | number[] | number | undefined>
): ExamGradeResult {
  // dùng isQuestionCorrect cho từng câu, câu chưa trả lời = sai
}
```

### Progress store

```ts
export interface ExamAttempt {
  id: string; // uuid ngắn, sinh bằng crypto.randomUUID() hoặc tương đương
  startedAt: string;
  finishedAt: string;
  scope: ExamScope;
  totalQuestions: number;
  correctCount: number;
  accuracy: number;
  breakdown: Record<QuestionLevel, { correct: number; total: number }>;
}

// ProgressState/ProgressSnapshot thêm:
examHistory: ExamAttempt[];

recordExamAttempt: (attempt: ExamAttempt) => void;
// set: giữ tối đa 20 phần tử mới nhất theo finishedAt, prepend + slice(0, 20)
```

`migrateProgressState`: `version < 3` → thêm `examHistory: []` (không
đổi field khác); giữ nguyên nhánh `version < 2` đã có.

### `progressSync.ts`

- `normalizeExamAttempt(value)`: validate đủ field, loại bỏ entry hỏng
  (giống `normalizeWrongQuestionEntry`).
- `mergeProgress`: hợp nhất `examHistory` theo `id` (nếu trùng id giữ
  bản có `finishedAt` mới hơn — thực tế hiếm khi trùng vì id sinh theo
  UUID), union rồi sort giảm dần theo `finishedAt`, cắt còn 20 phần tử.
  Không có heuristic nguy hiểm kiểu "xoá theo mutation toàn cục" như
  bug đã sửa ở FEATURE-007 — lịch sử thi chỉ append, không bao giờ bị
  xoá bởi phía còn lại, nên phép hợp nhất này an toàn hơn `wrongQuestions`.
- Thêm `recordExamAttempt` vào danh sách mutation source kích hoạt
  `scheduleProgressPush`.

### `ExamRoute.tsx` — luồng 3 giai đoạn

```
config -> (bấm "Bắt đầu") -> running -> (nộp bài / hết giờ) -> result
```

- **config**: chọn `scope` (radio: Tất cả / Vô cơ / Hữu cơ / chọn
  chuyên đề — checkbox multi-select khi chọn "chuyên đề cụ thể") và
  số câu (20/30/40). Bấm "Bắt đầu" → `pickExamQuestions` với seed
  `Date.now()`, chuyển sang `running`.
- **running**: đồng hồ đếm ngược bằng `useEffect` interval 1s; state
  `responses: Record<questionId, response>`; render
  `QuestionRenderer` với `result={null}` luôn luôn — khi
  `onSubmit(response)` được gọi, lưu response và tăng
  `questionIndex` ngay (không set `result`) để chuyển câu mà không lộ
  đáp án. Hết câu hoặc hết giờ → gọi `finishExam()`.
- **result**: `gradeExamAttempt` chấm điểm, gọi `recordExamAttempt`
  lưu vào progress store; với mỗi câu sai gọi `recordWrongAnswer`,
  mỗi câu đúng gọi `clearWrongAnswer` (an toàn nếu chưa từng pending);
  hiển thị bảng breakdown theo mức + danh sách từng câu (prompt, đáp
  án học sinh chọn, đáp án đúng, `explanation`) bằng cách render lại
  nội dung câu hỏi ở chế độ chỉ đọc (không phải `QuestionRenderer`
  tương tác — dùng markup tĩnh tái dùng `Chem`/`ChemParagraph`).

### UI điều hướng

- `App.tsx`: thêm mục "Thi thử" trỏ `/exam`.
- `ProfileRoute.tsx`: thêm khối "Lịch sử thi thử" liệt kê tối đa 5 lần
  gần nhất (điểm, phạm vi, thời gian), link "Thi thử ngay" tới `/exam`.

## 7. Files to create

- `src/lib/exam.ts`
- `src/routes/ExamRoute.tsx`
- `tests/lib/exam.test.ts`
- `tests/routes/exam-route.test.tsx`

## 8. Files to modify

- `src/store/progress.ts` (`ExamAttempt`, `examHistory`,
  `recordExamAttempt`, `PROGRESS_VERSION` = 3, migrate)
- `src/lib/progressSync.ts` (normalize/merge `examHistory`, mutation
  source)
- `src/App.tsx` (route `/exam`, điều hướng)
- `src/routes/ProfileRoute.tsx` (lịch sử thi thử)
- `tests/store/progress.test.ts` (migrate v2→v3, `recordExamAttempt`
  cắt 20 phần tử)
- `tests/lib/progress-sync.test.ts` (merge `examHistory`)
- `CHANGELOG.md`

## 9. API and database impact

Không đổi schema Supabase. `examHistory` nằm trong cột `data JSONB`
hiện có của bảng `public.progress`. Không cần migration SQL mới.

## 10. Implementation steps

1. Viết `src/lib/exam.ts` (seeded random, pool, pick theo tỉ lệ, chấm
   điểm) kèm test trước khi nối UI.
2. Mở rộng `ExamAttempt`/`examHistory`/`recordExamAttempt`, bump
   `PROGRESS_VERSION` = 3 + migrate trong `src/store/progress.ts`.
3. Mở rộng `normalizeProgressSnapshot`/`mergeProgress` trong
   `progressSync.ts` cho `examHistory`; thêm mutation source.
4. Viết `ExamRoute.tsx` (3 giai đoạn), nối `recordWrongAnswer`/
   `clearWrongAnswer` cho từng câu khi chấm.
5. Cập nhật `App.tsx` (route + điều hướng) và `ProfileRoute.tsx`
   (lịch sử thi thử).
6. Viết/cập nhật toàn bộ test theo mục 6 test strategy.
7. Chạy đủ 5 lệnh validation, tự giải lại bằng tay ít nhất 1 kịch bản
   chọn câu theo tỉ lệ và 1 kịch bản hết giờ tự nộp.
8. Cập nhật `CHANGELOG.md`, tạo
   `docs/handoffs/FEATURE-008-implementation.md`.

## 11. Test strategy

- **Unit — `lib/exam.ts`**:
  - `createSeededRandom` cho cùng seed → cùng chuỗi số (xác định).
  - `pickExamQuestions` với pool đủ 3 mức → đúng tỉ lệ 40/40/20 (làm
    tròn hợp lý) và không trùng câu.
  - `pickExamQuestions` khi một mức thiếu hụt → bù đúng thứ tự ưu
    tiên (Vận dụng trước, Cơ bản sau) mà không vượt tổng pool.
  - `pickExamQuestions` khi tổng pool nhỏ hơn số câu yêu cầu → trả về
    `actualTotal` bằng đúng kích thước pool, không lỗi/không trùng.
  - `gradeExamAttempt`: câu đúng/sai/chưa trả lời tính đúng breakdown
    theo từng mức.
- **Unit — progress store**: migrate v2→v3 thêm `examHistory: []`
  không phá dữ liệu cũ; `recordExamAttempt` prepend đúng thứ tự và cắt
  còn tối đa 20 phần tử khi vượt.
- **Unit — progressSync**: `mergeProgress` hợp nhất `examHistory` từ 2
  phía theo `id`, sort đúng theo `finishedAt`, cắt còn 20; entry hỏng
  bị loại mà không phá cả snapshot.
- **Integration — ExamRoute**:
  - Luồng cấu hình → làm hết N câu → màn kết quả hiển thị đúng điểm.
  - Hết giờ (giả lập bằng fake timer) tự nộp bài với câu chưa trả lời
    tính là sai.
  - Trả lời sai một câu trong đề → xuất hiện trong `wrongQuestions`
    (`isWrongQuestionPending` = true) sau khi nộp bài.
  - Trả lời đúng một câu đang pending trong `wrongQuestions` → được
    xoá (tombstone `resolvedAt`) sau khi nộp bài.
- **Regression**: toàn bộ test hiện có (40 test tính đến FEATURE-007)
  phải tiếp tục pass sau khi đổi `ProgressSnapshot`/`PROGRESS_VERSION`.
- **Negative case**: phạm vi chọn ra pool rỗng (VD chọn riêng một
  chuyên đề "coming soon") → màn cấu hình báo không đủ câu, không cho
  bấm "Bắt đầu" thay vì crash.

## 12. Security considerations

Không có rủi ro bảo mật mới — không có input nhạy cảm, không gọi API
ngoài Supabase đã có, dữ liệu `examHistory` đi qua RLS hiện có của
FEATURE-006 (mỗi user chỉ đọc/ghi hàng `progress` của chính mình). Rủi
ro duy nhất là logic (xem mục 13), không phải bảo mật.

## 13. Risks

| Risk                                                                                                                                                                 | Impact                                             | Mitigation                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Thuật toán chọn câu theo tỉ lệ sai lệch (lặp câu, sai tỉ lệ, crash khi pool nhỏ)                                                                                     | Trung bình — đề thi không công bằng hoặc app crash | Test riêng từng nhánh (đủ/thiếu/rỗng) trước khi nối UI; Gemini review độc lập phần `pickExamQuestions`/`gradeExamAttempt` (thuộc nhóm "numeric/logic" cần dual-review theo CLAUDE.md) |
| Cơ chế "không lộ đáp án" dựa vào không set `result` có thể vô tình bị phá nếu sau này có người sửa `QuestionRenderer` giả định `result` luôn được set sau `onSubmit` | Thấp hiện tại, rủi ro tăng dần theo thời gian      | Ghi chú rõ trong code comment tại `ExamRoute.tsx` về việc cố ý không set `result`; cân nhắc thêm test integration khẳng định hành vi này                                              |
| Bump `PROGRESS_VERSION` lần 2 (2 → 3) có thể lặp lại rủi ro migrate như FEATURE-007                                                                                  | Trung bình nếu migrate sai                         | Test riêng migrate v2→v3, không đổi field cũ, theo đúng pattern đã dùng ở FEATURE-007                                                                                                 |
| Lịch sử thi phình payload nếu học sinh thi nhiều                                                                                                                     | Thấp                                               | Cắt cứng còn 20 phần tử mới nhất mỗi lần ghi                                                                                                                                          |

## 14. Rollback plan

- Thay đổi thuần client + cột JSONB đã có sẵn, không có migration SQL.
  Rollback bằng revert commit; dữ liệu `examHistory` cũ trong JSONB
  không ảnh hưởng code trước đó (code cũ không đọc field này).
- Nếu migrate v2→v3 có vấn đề sau khi merge, phát hành hotfix sửa hàm
  `migrateProgressState` thay vì bump thêm version.

## 15. Acceptance criteria

- [ ] Tạo đề theo phạm vi + số câu chọn, đúng tỉ lệ mức trong điều
      kiện bình thường (pool đủ câu).
- [ ] Làm bài không thấy đáp án/lời giải cho tới khi nộp.
- [ ] Hết giờ tự động nộp bài với câu chưa trả lời tính là sai.
- [ ] Màn kết quả hiển thị điểm tổng, breakdown theo mức, và xem lại
      từng câu kèm lời giải.
- [ ] Câu sai trong đề xuất hiện ở `/review`; câu đúng một câu đang
      pending thì biến mất khỏi `/review`.
- [ ] Lịch sử thi hiển thị ở trang cá nhân, đồng bộ đúng giữa 2 thiết
      bị khi đã đăng nhập.
- [ ] Dữ liệu localStorage cũ (v1/v2) không bị mất khi nâng cấp lên v3.
- [ ] 5 lệnh validation (`validate-content`, `test`, `lint`,
      `typecheck`, `build`) pass; test mới cho `lib/exam.ts` và merge
      `examHistory` pass.
- [ ] Không có dependency/service mới được thêm (không cần cập nhật
      `docs/architecture.md`).
