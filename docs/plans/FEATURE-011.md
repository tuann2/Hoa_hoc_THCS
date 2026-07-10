# FEATURE-011: Định nghĩa lại Lý thuyết / Bài tập theo bản chất câu hỏi

## Status

- Status: APPROVED <!-- DRAFT | APPROVED | SUPERSEDED -->
- Owner: Claude Code
- Approved by: tuann2
- Approved date: 2026-07-10

## 1. Objective

FEATURE-009 tách "Lý thuyết" = chỉ đọc thẻ và "Giải bài tập" = làm toàn
bộ 13 câu quiz. Người dùng làm rõ đây là cách hiểu sai. Định nghĩa
đúng:

- **Lý thuyết** = thẻ ôn tập **+ các câu luyện tập KHÔNG tính toán**
  (định tính: khái niệm, tính chất, nhận biết, chuỗi phản ứng, cân
  bằng phương trình).
- **Bài tập** = các câu **tính toán** (bài toán số liệu: mol, gam,
  lít, C%, CM, hiệu suất, hỗn hợp...).

Học sinh chọn chế độ từ trang chủ như F009, nhưng nội dung mỗi chế độ
chia theo bản chất câu hỏi. Cả hai chế độ đều tính XP/sao cho phần câu
của mình; bài học được tính **hoàn thành (mở khoá bài sau) khi xong cả
hai phần**.

## 2. Current system analysis

- Sau FEATURE-009 (đã merge, PR #8): route
  `/learn/:unitId/:lessonId/theory|practice`; mode `theory` chỉ hiển
  thị `lesson.cards` rồi dừng ở màn `theory-done` (không XP); mode
  `practice` chạy toàn bộ `lesson.questions` rồi `completeLesson`
  (XP/sao/mở khoá). `ExitButton` đã có ở cả hai mode.
- `src/types/content.ts`: `BaseQuestion` có `id/type/level/prompt/
explanation/source?` — **chưa có** trường phân loại lý thuyết/tính
  toán. `QuestionType`: single-choice (521), multi-choice (182),
  fill-blank (253), balance (97) — tổng 1053 câu / 17 unit / 81 bài
  available.
- Heuristic (số liệu + đơn vị trong prompt): ~398 câu dạng tính toán;
  ~11/81 bài không có câu tính toán nào; 0 bài toàn câu tính toán.
- `src/store/progress.ts`: `PROGRESS_VERSION = 3`;
  `lessonProgress[lessonId] = { completed, stars, accuracy, ... }` một
  bản ghi duy nhất mỗi bài (kiểm tra shape chính xác khi triển khai);
  `completeLesson(lesson, nextLessonId, accuracy, xp)` cộng XP, tính
  sao, mở khoá bài kế. Migration pattern đã có sẵn từ v1→v2→v3.
- `src/lib/progressSync.ts`: `normalizeProgressSnapshot` +
  `mergeProgress` (max theo bài) — cần mở rộng cho shape mới.
- `src/lib/contentValidation.ts` + `scripts/validate-content.ts`:
  validate schema câu hỏi — cần thêm trường mới.
- `/exam`, `/review`: rút câu từ toàn bộ `lesson.questions` — không
  phụ thuộc phân loại, không đổi.

## 3. Assumptions (đã chốt với người dùng 2026-07-10)

- **Câu `balance` (cân bằng phương trình) thuộc Lý thuyết** — toàn bộ
  97 câu.
- **Mỗi chế độ tính XP/sao riêng cho phần câu của mình; hoàn thành bài
  = xong cả hai phần.** Phần không có câu hỏi (ví dụ bài không có câu
  tính toán) tự tính là xong.
- **Phân loại bằng trường tag trong JSON**: script heuristic gợi ý
  trước, rà soát lại sau — không phân loại tự động lúc chạy app.
- Tiến độ cũ của học sinh (đã hoàn thành bài theo model cũ) được bảo
  toàn khi migrate: bài đã `completed` ⇒ cả hai phần đều tính là xong,
  giữ nguyên sao/accuracy cũ. Không ai bị khoá lại bài đã mở.
- Sao của bài = tính trên độ chính xác lượt đầu **gộp cả hai phần**
  (trọng số theo số câu mỗi phần), cập nhật lại mỗi khi một phần được
  hoàn thành/làm lại.

## 4. Scope

### A. Content schema + gắn tag (nền tảng)

- `src/types/content.ts`: thêm trường **bắt buộc**
  `category: 'theory' | 'calculation'` vào `BaseQuestion`.
- `src/lib/contentValidation.ts` + `scripts/validate-content.ts`:
  validate `category` hợp lệ trên mọi câu; cảnh báo nếu câu `balance`
  bị tag `calculation` (trái quy ước đã chốt).
- Script mới `scripts/tag-question-category.ts` (giữ lại trong repo để
  tái dùng cho content mới): gắn tag toàn bộ 1053 câu —
  `balance` ⇒ `theory`; prompt khớp mẫu số liệu + đơn vị
  (gam/g/lít/ml/mol/%/đvC/kg/tấn/dm3/cm3/m3/mol/l/M...) ⇒
  `calculation`; còn lại ⇒ `theory`. In báo cáo phân bố theo
  unit/lesson để rà soát.
- Rà soát tag sau khi script chạy (xem mục 10, bước 2–3): kiểm tra
  các trường hợp ranh giới (câu có số nhưng là lý thuyết như "3 lớp
  electron", câu toán thiếu đơn vị chuẩn) — chốt bằng review chéo trên
  diff content.
- `CLAUDE.md` mục "Content authoring rules": bổ sung quy tắc mọi câu
  mới phải có `category`.

### B. Progress store v3 → v4

- `lessonProgress[lessonId]` chuyển sang lưu tiến độ **theo phần**:

  ```ts
  interface LessonPartProgress {
    completed: boolean;
    accuracy: number; // % lượt đầu của phần
  }
  interface LessonProgressEntry {
    theory: LessonPartProgress;
    practice: LessonPartProgress;
    completed: boolean; // = theory.completed && practice.completed
    stars: 0 | 1 | 2 | 3; // theo accuracy gộp trọng số câu
    // giữ các trường hiện có khác nếu đang tồn tại (kiểm tra khi code)
  }
  ```

- Action mới `completeLessonPart(lesson, mode, accuracy, xp, nextLessonId)`
  thay cho `completeLesson`: cập nhật phần tương ứng, cộng XP của
  phần, tính lại `completed` tổng + `stars` gộp; chỉ khi `completed`
  tổng chuyển true mới mở khoá `nextLessonId` (và streak ghi nhận như
  hành vi `completeLesson` hiện tại).
- Phần rỗng (0 câu): tự set `completed: true, accuracy: 100` ngay khi
  phần còn lại hoàn thành (hoặc khi vào bài — quyết định khi code,
  miễn là bài không bị kẹt khoá).
- `PROGRESS_VERSION = 4` + `migrate`: entry v3
  `{ completed, stars, accuracy }` ⇒ cả `theory` và `practice` nhận
  `{ completed, accuracy }` như cũ, giữ `stars`. Test migrate kỹ.
- `src/lib/progressSync.ts`: normalize shape mới (entry hỏng bị loại,
  entry v3 từ server cũ được nâng cấp qua cùng hàm migrate logic);
  merge theo từng phần (completed = OR, accuracy = max, stars = max).
  Thêm `completeLessonPart` vào danh sách mutation source được push.

### C. UI theo phân loại

- `src/lib/content.ts` (hoặc `chemistry.ts`): helper
  `getQuestionsByCategory(lesson, category)`.
- `LessonPlayer`:
  - mode `theory`: thẻ lý thuyết → quiz **các câu `theory`** (retry
    queue như cũ) → `ResultScreen` với XP/sao phần lý thuyết. Bỏ màn
    `theory-done` (thay bằng ResultScreen); CTA phụ trên ResultScreen:
    "Làm phần Bài tập" nếu phần practice chưa xong và có câu.
  - mode `practice`: quiz **các câu `calculation`** → `ResultScreen`
    phần bài tập; CTA phụ: "Ôn phần Lý thuyết" nếu chưa xong.
  - Bài không có câu `calculation`: mode practice hiển thị màn "Bài
    này không có bài tập tính toán" + CTA sang phần Lý thuyết / về lộ
    trình (không crash, không kẹt).
  - `ResultScreen`: "Sang bài tiếp theo" chỉ hiện khi bài **đã hoàn
    thành cả hai phần** và có bài kế đã mở.
- `LessonMap`: hiển thị trạng thái từng phần trên mỗi bài (ví dụ chip
  nhỏ "LT ✓ / BT ✓" hoặc tương đương tối giản theo style hiện có) —
  sao tổng giữ nguyên vị trí cũ. Ở chế độ xem "Giải bài tập", bài
  không có câu tính toán hiển thị mờ/ghi chú "không có bài tập".
- `HomeRoute`: toggle giữ nguyên như F009.
- `ExitButton`, `/exam`, `/review`: không đổi.

### D. Test

- Store: migrate v3→v4 (bài xong cũ ⇒ hai phần xong, không khoá lại);
  `completeLessonPart` từng phần; mở khoá chỉ khi xong cả hai; phần
  rỗng tự hoàn thành; merge sync hai chiều (máy A xong LT, máy B xong
  BT ⇒ merge = bài hoàn thành).
- Content: validator bắt câu thiếu/sai `category`; script tag chạy
  idempotent.
- UI: theory mode chỉ ra câu theory, practice chỉ ra câu calculation;
  bài không có câu tính toán không kẹt; ResultScreen CTA đúng điều
  kiện; regression exam/review không đổi.

## 5. Out of scope

- Không đổi thuật toán rút đề `/exam`, hàng đợi `/review`.
- Không thay đổi `ExitButton`, route paths, toggle trang chủ (giữ từ
  F009).
- Không GIẢI LẠI 1053 bài toán — chỉ phân loại; đáp án/lời giải giữ
  nguyên.
- Không thêm dependency mới.
- Không làm UI thống kê riêng theo phần trong Profile (có thể là
  feature sau).

## 6. Proposed design

(Chi tiết chính đã nêu ở mục 4; điểm thiết kế then chốt:)

- **`category` là trường bắt buộc** để validator chặn content mới
  thiếu tag — tránh lặp lại lỗi phân loại ngầm.
- **Sao gộp trọng số**: `accuracy_tổng = (đúng_LT + đúng_BT) /
(câu_LT + câu_BT)` trên lượt đầu mỗi phần, dùng `calculateStars`
  hiện có — không đổi thang sao.
- **Migration bảo toàn quyền lợi học sinh**: mọi bài `completed` v3
  giữ nguyên trạng thái hoàn thành, sao, XP đã cộng (XP tổng không
  tính lại).
- **Merge sync theo phần** giữ nguyên triết lý offline-first hiện có
  (max/OR từng trường, không mất tiến độ).

## 6a. New technology

Không có — không thêm dependency, service hay infra mới.

## 7. Files to create

- `scripts/tag-question-category.ts`

## 8. Files to modify

- `content/units/*.json` (17 file — gắn `category` cho 1053 câu)
- `src/types/content.ts`
- `src/lib/contentValidation.ts`, `scripts/validate-content.ts`
- `src/lib/content.ts` (helper lọc theo category)
- `src/store/progress.ts` (v4 + `completeLessonPart`)
- `src/lib/progressSync.ts`
- `src/components/LessonPlayer.tsx`, `ResultScreen.tsx`,
  `LessonMap.tsx`
- `CLAUDE.md` (content authoring rules)
- Test tương ứng trong `tests/`

## 9. API and database impact

Không đổi schema Supabase (bảng `progress` vẫn là cột `data JSONB`).
Payload JSONB đổi shape theo v4 — xử lý bằng normalize/migrate phía
client như các lần nâng version trước, server không cần migration.

## 10. Implementation steps

1. **Codex #1 (code nền)**: schema `category` + validator + script tag
   - helper lọc; chạy script gắn tag toàn bộ content; validate pass.
2. **Rà soát tag (Claude)**: đọc báo cáo phân bố, kiểm tra tay các
   câu ranh giới (câu theory chứa số, câu calculation thiếu đơn vị);
   sửa tag sai trực tiếp (thuộc quyền sửa content của Claude).
3. **Review chéo tag (Gemini)**: `agy` kiểm tra mẫu ngẫu nhiên
   ~50–80 câu trên diff content, đối chiếu định nghĩa
   theory/calculation.
4. **Codex #2 (store + sync + UI)**: progress v4, migrate, merge,
   LessonPlayer/ResultScreen/LessonMap, tests.
5. **Claude đọc diff + chạy validation độc lập** (validate-content,
   test, lint, typecheck, build).
6. **Gemini review chéo store/sync** (migration tiến độ người dùng =
   high-risk: mất dữ liệu học tập nếu sai).
7. Cập nhật `CLAUDE.md` authoring rules; commit theo từng đơn vị
   logic; push; PR khi được yêu cầu.

## 11. Test strategy

Xem mục 4D. Bổ sung negative case: content thiếu `category` phải làm
validate-content fail; snapshot server v3 (production hiện tại) merge
với local v4 không mất bài đã hoàn thành.

## 12. Security considerations

Không thay đổi auth/RLS/API. Rủi ro chính là **toàn vẹn dữ liệu tiến
độ** khi migrate/merge — xử lý bằng test migration + review chéo
(mục 10.6).

## 13. Risks

| Risk                                                           | Impact                                                                 | Mitigation                                                                                                                                                       |
| -------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tag sai câu (theory ↔ calculation) làm nội dung 2 chế độ lệch | Trung bình — học sinh gặp bài toán trong phần lý thuyết hoặc ngược lại | Heuristic + rà soát tay + Gemini sample review; tag nằm trong JSON nên sửa từng câu rất rẻ                                                                       |
| Migration v3→v4 lỗi làm mất/khoá tiến độ học sinh              | Cao                                                                    | Test migrate + merge kỹ (bài xong cũ phải giữ nguyên); review chéo Gemini; rollback = revert commit, localStorage client cũ vẫn đọc được nhờ normalize phòng thủ |
| Bài không có câu tính toán gây kẹt luồng hoàn thành            | Trung bình                                                             | Phần rỗng tự hoàn thành + test riêng cho 11 bài đã biết                                                                                                          |
| Payload sync to hơn (shape per-part)                           | Thấp                                                                   | Shape gọn (2 phần × 2 trường), không lưu lịch sử từng câu                                                                                                        |

## 14. Rollback plan

Nhánh `feature/FEATURE-011`, chưa merge. Sau merge nếu lỗi: revert
commit merge. Dữ liệu localStorage/JSONB đã nâng v4 trên máy học sinh:
bản revert (v3) sẽ thấy version cao hơn — normalize phòng thủ hiện có
bỏ qua snapshot không hợp lệ và giữ local, không crash (xác nhận lại
hành vi này trong bước test trước khi merge).

## 15. Acceptance criteria

- [ ] 1053 câu đều có `category`; validator chặn câu thiếu tag; 97 câu
      `balance` đều là `theory`.
- [ ] Mode Lý thuyết = thẻ + đúng các câu `theory`, có XP/sao phần
      mình; mode Bài tập = đúng các câu `calculation`, có XP/sao phần
      mình.
- [ ] Bài chỉ hoàn thành (mở khoá bài sau) khi xong cả hai phần; bài
      không có câu tính toán hoàn thành được chỉ bằng phần Lý thuyết.
- [ ] Học sinh có tiến độ cũ: bài đã xong vẫn xong, sao giữ nguyên,
      không bài nào bị khoá lại (test migrate + merge với snapshot v3).
- [ ] `/exam`, `/review` hành vi không đổi.
- [ ] Toàn bộ validation pass; review chéo Gemini cho tag content và
      store/sync hoàn tất.
