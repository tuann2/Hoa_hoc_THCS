# FEATURE-018: Sửa chuỗi ngày học — streak hiển thị đúng và tính đủ hoạt động

## Status

- Status: APPROVED <!-- DRAFT | APPROVED | SUPERSEDED -->
- Owner: Claude Code (Planner; dispatch của tuann2 ngày 2026-08-07)
- Approved by / date: tuann2, 2026-08-08 (duyệt nội dung plan trong PR #41)
- Deviation (ghi theo AGENTS.md mục 6): PR này được merge trong khi gate
  `dependency-audit` đang FAIL. Nguyên nhân là 4 advisory mới chưa duyệt
  (`brace-expansion`, `fast-uri`, `nanoid` — high; `postcss` — moderate) đã
  có sẵn trên `main` từ trước PR; thay đổi ở đây chỉ là Markdown nên không
  thể là nguyên nhân. Phê duyệt bỏ qua: tuann2, 2026-08-08. Gate **không bị
  sửa hay tắt**. Follow-up bắt buộc: vá 4 advisory này trong một thay đổi
  riêng trước khi bất kỳ code nào của FEATURE-018 được merge.
- Risk tier: NORMAL
- Risk categories and escalation rationale: UI/React + logic đọc trong store.
  **Phạm vi đã cắt sau review vòng 1** để rủi ro thấp một cách chính đáng:
  bản này **không migration, không thêm trường lưu trữ, không đổi
  `PROGRESS_VERSION`, không sửa merge trong `progressSync.ts`** — nên không
  chạm sàn ELEVATED của Risk Model rule 5 (migration) hay rule 6 (merge/
  timezone logic). Bối cảnh đã ghi nhận: Supabase hiện **không chứa dữ liệu
  học viên thật** (tuann2, 2026-08-07); điều này giảm hậu quả nhưng không
  phải là căn cứ hạ tier — căn cứ hạ tier là việc cắt phạm vi ở trên.
- Change type and required gate profile: web classifier profile (chỉ `src/**`
  và `tests/**` → `WEB_CLASSIFIER_GATES`, `scripts/gates-manifest.ts:222`).
  Chốt bằng `npm run gates -- --changed-from=<base_sha>`.

## Objective and scope

- Objective: học sinh thấy đúng số ngày học liên tục của mình, và mọi hoạt
  động học thật đều giữ được chuỗi.
- In scope: (1) streak tụt đúng khi nghỉ học; (2) thi thử và ôn câu sai tính
  là ngày có học; (3) nhắc giữ chuỗi ở Trang chủ; (4) mốc chúc mừng dạng nhãn
  tĩnh suy ra từ số ngày.
- Out of scope — **chuyển sang FEATURE-019 (ELEVATED)**: lịch chuỗi 30 ngày và
  trường `studyDates`; đổi khoá ngày từ UTC sang `Asia/Ho_Chi_Minh`; sửa merge
  đa thiết bị. Cả ba đều kéo theo migration hoặc merge logic.

## Current analysis and design

- Current behavior — streak đã tồn tại nhưng **đang hỏng**:
  1. **Không bao giờ tụt.** Chỉ tính lại trong `completeLessonPart`
     (`src/store/progress.ts:656`); không chỗ nào tính lại lúc đọc. Học sinh
     nghỉ 3 tuần vẫn thấy "Streak hiện tại: 1 ngày" ở `HomeRoute.tsx:52` và
     `ProfileRoute.tsx:149`. `adminReports.ts:355` đọc cùng giá trị nên
     **giáo viên cũng đang nhìn số sai**.
  2. **Thi thử và ôn câu sai không tính là ngày học.** `recordExamAttempt`
     (`progress.ts:805`) chỉ cập nhật mutation timestamp và exam history.
  3. `toDateKey` (`progress.ts:156`) dùng khoá ngày **UTC**.
- Proposed design:
  - Hàm thuần dùng chung `deriveStreak(snapshot, now)` (không phải Zustand
    selector — `adminReports` xử lý snapshot với `now` được tiêm, nằm ngoài
    React store): trả 0 nếu `lastStudyDate` cũ hơn hôm qua, ngược lại trả
    `streakCurrent`. Home/Profile bọc nó trong selector; admin gọi trực tiếp.
    **Cả ba consumer test bằng cùng fixture.**
  - Một hàm nội bộ `markStudyDay(state, at)` gom phần cập nhật
    `lastStudyDate`/`streakCurrent`/`streakLongest` đang nằm trong
    `completeLessonPart`, rồi gọi từ ba nơi.
  - **Trigger phải xác định, gọi đúng một lần:** hoàn thành một phần bài học
    (như hiện tại); nộp bài thi thử trong `recordExamAttempt`; và ở luồng ôn
    câu sai là **khi học sinh trả lời câu đầu tiên của phiên**, không phải khi
    mở route. Không gắn vào `recordWrongAnswer`/`clearWrongAnswer` vì hai hàm
    đó cũng bị gọi từ luồng bài học và thi thử.
  - Giữ nguyên khoá ngày UTC. **Known limitation ghi rõ**: học khuya sau 07:00
    UTC (14:00 giờ VN) vẫn đúng, nhưng hoạt động từ 00:00–07:00 giờ VN bị tính
    sang ngày UTC trước. Sửa ở FEATURE-019 cùng bài toán chuyển đổi dữ liệu cũ.
  - Nhắc giữ chuỗi: chỉ hiện ở Trang chủ, khi hôm nay chưa học và
    `deriveStreak > 0`. Không popup, không dismiss state.
  - Mốc 3/7/14/30/100: nhãn tĩnh suy ra từ số ngày mỗi lần render, không lưu
    trạng thái "đã chúc mừng" → không có lifecycle cần quản.
- New technology: không có.
- Execution profile + degradation path: Implementer = Codex (chạm
  `src/store/progress.ts`; Planner không tự nhận vai này). Logic biên ngày dễ
  sai âm thầm → bắt buộc unit test với `now` được tiêm trước khi qua review.

## Delivery plan

Execution assignment — mỗi vai cần con người xác nhận riêng khi đến lượt;
duyệt plan không đồng nghĩa duyệt việc nhận vai kế tiếp:

| Vai trò              | Agent đề xuất           | Model / effort         | Lý do                                       | Đã xác nhận        |
| -------------------- | ----------------------- | ---------------------- | ------------------------------------------- | ------------------ |
| Planner              | Claude Code             | Sonnet 5 / medium      | Khảo sát + viết plan                        | tuann2, 2026-08-07 |
| Implementer          | Codex (direct-terminal) | `gpt-5.6-terra` / high | Đụng store; logic biên ngày dễ sai ngầm     | chưa               |
| Independent Reviewer | Codex (execution khác)  | `gpt-5.6-sol` / high   | Cần shell + chạy test theo role contract    | chưa               |
| Release Assessor     | Claude Code (phiên mới) | Sonnet 5 / medium      | Execution mới, không phải phiên Planner này | chưa               |

1. Implementation — `deriveStreak`, `markStudyDay`, ba trigger, chuyển
   Home/Profile/adminReports sang hàm chung, nhắc giữ chuỗi, nhãn mốc, test.
2. Validation — `npm run test -- tests/store/progress`, `tests/lib/adminReports`,
   `tests/routes`; rồi `npm run gates -- --changed-from=<base_sha>` và
   `npm run evidence` bind đúng candidate SHA.
3. Review — review độc lập tập trung biên ngày và trigger; remediation;
   Release Assessment.

## Risks and controls

| Risk                                      | Impact                          | Mitigation                                                         |
| ----------------------------------------- | ------------------------------- | ------------------------------------------------------------------ |
| Logic biên ngày sai → mất chuỗi oan       | Ngược mục tiêu tính năng        | Unit test tiêm `now`: cùng ngày, đúng 1 ngày, 2 ngày, đổi ngày UTC |
| Trigger ôn câu sai gọi nhầm từ luồng khác | Ngày học bị tính sai            | Không gắn vào `recordWrongAnswer`; test riêng từng luồng           |
| Ba consumer lệch nhau                     | Giáo viên và học sinh thấy khác | Một hàm thuần duy nhất, test cả ba bằng cùng fixture               |
| Known limitation UTC bị hiểu là đã xong   | Kỳ vọng sai, bug báo lại        | Ghi rõ trong plan, handoff và CHANGELOG; FEATURE-019 xử lý         |

## Acceptance and recovery

- [ ] Nghỉ quá 1 ngày → streak hiện 0 ở Trang chủ, Hồ sơ và báo cáo admin.
- [ ] Nộp bài thi thử giữ được chuỗi.
- [ ] Trả lời câu đầu tiên trong phiên ôn câu sai giữ được chuỗi; chỉ mở route
      rồi thoát thì không tính.
- [ ] Chuỗi không bị cộng hai lần khi học nhiều hoạt động trong cùng một ngày.
- [ ] Nhắc giữ chuỗi chỉ hiện khi hôm nay chưa học và chuỗi > 0.
- [ ] Anonymous / chưa cấu hình Supabase: streak vẫn tăng và giữ qua reload.
- [ ] Đăng nhập nhưng offline: hoạt động vẫn ghi được vào tiến độ cục bộ.
- [ ] `PROGRESS_VERSION` vẫn là 5; không có trường lưu trữ mới.
- Security considerations: không đụng auth, RLS hay quyền admin.
- API/database impact: không có — không migration SQL, không migration dữ
  liệu client, không đổi hình dạng payload sync.
- Test strategy: unit test store với `now` tiêm; test ba trigger tách biệt;
  test `deriveStreak` dùng chung cho Home/Profile/adminReports; test render
  nhắc nhở và nhãn mốc.
- Rollback plan: revert commit. Không có trường mới nên không có dữ liệu tồn
  đọng; snapshot học viên giữ nguyên hình dạng v5 trước và sau.
