# FEATURE-001: Nền tảng web ôn luyện Hoá học THCS nâng cao (MVP)

## Status

- Status: APPROVED
- Owner: Claude Code
- Approved by: tuann2
- Approved date: 2026-07-04

## 1. Objective

Xây dựng phiên bản đầu tiên (MVP) của web ôn luyện Hoá học cho học sinh
lớp 8–9 định hướng HSG/thi chuyên, gồm:

1. **Khung nội dung** 2 phần Vô cơ / Hữu cơ, chia chuyên đề bám SGK
   (đã định nghĩa tại `docs/content/CONTENT_OUTLINE.md`).
2. **Web tĩnh kiểu Duolingo**: lộ trình học dạng bản đồ node, bài học =
   thẻ lý thuyết + chuỗi câu hỏi tương tác, có XP – streak – tiến độ.
3. **2 chuyên đề mẫu hoàn chỉnh** (A6 Axit, A8 Muối – Phân bón hoá học)
   để chạy trọn vòng học, làm chuẩn biên soạn cho các chuyên đề sau.

## 2. Current system analysis

Repository mới chỉ có khung chỉ dẫn AI workflow (CLAUDE.md, AGENTS.md,
AI_WORKFLOW.md, docs/), `src/` và `tests/` trống, chưa chốt stack, chưa
có nội dung. Không có hệ thống cũ cần tương thích.

## 3. Assumptions

- Người dùng học trên điện thoại là chính → thiết kế mobile-first.
- Giai đoạn đầu **không cần tài khoản/đăng nhập**; tiến độ lưu
  `localStorage` trên máy học sinh.
- Nội dung do con người biên soạn/duyệt (AI hỗ trợ soạn nháp); độ chính
  xác hoá học do người duyệt chịu trách nhiệm cuối.
- Deploy miễn phí trên Vercel hoặc GitHub Pages, chưa cần domain riêng.
- Node.js sẽ được cài trên máy dev (`brew install node`) trước khi bắt đầu.

## 4. Scope

### 4.1. Nội dung

- Hoàn thiện schema nội dung (JSON) cho: chuyên đề (unit), bài học
  (lesson), thẻ lý thuyết (card), câu hỏi (question) với 4 dạng MVP:
  trắc nghiệm 1 đáp án, trắc nghiệm nhiều đáp án, điền số/từ, điền hệ số
  cân bằng PTHH.
- Biên soạn đầy đủ 2 chuyên đề mẫu: **A6 Axit** (5 bài: tính chất chung,
  HCl, H₂SO₄ loãng/đặc, 2 bài nâng cao) và **A8 Muối – Phân bón hoá học**
  (5 bài: tính chất muối – phản ứng trao đổi, muối quan trọng, muối
  axit/trung hoà, phân bón, 1 bài nâng cao biện luận) theo quy ước trong
  CONTENT_OUTLINE.md.
- Tạo sẵn metadata (tên, mô tả, thứ tự, trạng thái "sắp ra mắt") cho
  toàn bộ chuyên đề còn lại để bản đồ lộ trình hiển thị đủ 2 phần.

### 4.2. Web app

- **Trang chủ / Lộ trình học**: 2 tab Vô cơ – Hữu cơ, bản đồ node các
  chuyên đề → bài học; bài học mở khoá tuần tự trong chuyên đề.
- **Màn hình bài học**: lướt thẻ lý thuyết → làm lần lượt câu hỏi; phản
  hồi đúng/sai tức thì + lời giải; thanh tiến độ; kết thúc có màn tổng
  kết (XP, số câu đúng).
- **Gamification MVP**: XP theo câu đúng, streak theo ngày học, mức
  thành thạo mỗi bài (0–3 sao theo % đúng), lưu `localStorage`.
- **Trang tổng quan cá nhân**: tổng XP, streak, % hoàn thành từng phần.
- Hiển thị tốt công thức hoá học (chỉ số dưới/trên, mũi tên phản ứng).
- Responsive mobile-first; tiếng Việt toàn bộ UI.

### 4.3. Hạ tầng

- Khởi tạo dự án Vite + React + TypeScript + Tailwind CSS trong `src/`.
- Nội dung là file JSON tĩnh trong `content/`, được validate bằng script.
- CI đơn giản (GitHub Actions): lint + typecheck + test + build.
- Deploy Vercel (hoặc GitHub Pages nếu Vercel vướng).

## 5. Out of scope (các phase sau)

- Tài khoản người dùng, đồng bộ tiến độ đa thiết bị, backend/API.
- Bảng xếp hạng, giải đấu, hearts/lives, cửa hàng vật phẩm.
- Bảng tuần hoàn tương tác; mô phỏng thí nghiệm.
- Chế độ thi thử theo đề (sẽ làm sau khi phủ đủ nội dung).
- Ứng dụng mobile native / PWA offline.
- Biên soạn các chuyên đề ngoài A4, A7 (chỉ tạo metadata).

## 6. Proposed design

### 6.1. Kiến trúc

SPA tĩnh, không backend:

```text
Vite + React 18 + TypeScript
├── Tailwind CSS            # UI nhanh, mobile-first
├── react-router            # /  /learn/:unitId/:lessonId  /profile
├── zustand + persist       # state tiến độ ↔ localStorage
└── content/*.json          # nội dung, import build-time
```

Lý do chọn: đơn giản – nhanh đúng yêu cầu; không chi phí server; quiz
tương tác cần SPA; sau này thêm backend không phải viết lại UI.

### 6.2. Schema nội dung (rút gọn)

```jsonc
// content/units/a6-axit.json
{
  "id": "a6-axit",
  "part": "inorganic",            // inorganic | organic
  "title": "Axit",
  "order": 6,
  "status": "available",          // available | coming-soon
  "lessons": [{
    "id": "a6-l1",
    "title": "Tính chất hoá học chung của axit",
    "cards": [{ "heading": "...", "body": "markdown + hoá học" }],
    "questions": [{
      "type": "single-choice",    // multi-choice | fill-blank | balance
      "level": "hsg",             // basic | applied | hsg
      "prompt": "...",
      "options": ["..."],
      "answer": 2,
      "explanation": "lời giải từng bước",
      "source": "Đề HSG tỉnh X 2024"   // với câu sưu tầm
    }]
  }]
}
```

Công thức hoá học viết dạng text quy ước (`H2SO4`, `->`) và được
component `<Chem>` render thành chỉ số dưới/mũi tên; không dùng
LaTeX/MathJax ở MVP để giữ nhẹ.

### 6.3. Luồng học (tham khảo Duolingo)

1. Bản đồ chuyên đề → chọn bài đang mở khoá.
2. Xem thẻ lý thuyết (swipe/next).
3. Trả lời từng câu; sai → hiện lời giải, câu đó được hỏi lại cuối bài.
4. Hoàn thành → +XP, cập nhật sao (≥90% = 3★, ≥70% = 2★, đạt = 1★),
   mở khoá bài kế tiếp, cập nhật streak ngày.

### 6.4. Validate nội dung

Script `scripts/validate-content.ts` (chạy trong CI): kiểm tra schema,
id trùng, đáp án nằm trong options, mọi câu có `explanation`, PTHH trong
câu `balance` cân bằng đúng về mặt số nguyên tử mỗi vế.

## 7. Files to create

- `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `index.html`
- `src/main.tsx`, `src/App.tsx`, `src/routes/{Home,Lesson,Profile}.tsx`
- `src/components/` (LessonMap, TheoryCard, QuestionRenderer + 4 dạng câu, Chem, ProgressBar, ResultScreen)
- `src/store/progress.ts` (zustand + persist)
- `src/lib/content.ts` (load + type nội dung), `src/types/content.ts`
- `content/units/*.json` (a6-axit, a8-muoi-phan-bon đầy đủ; các unit khác metadata)
- `scripts/validate-content.ts`
- `tests/` (unit test cho scoring, unlock logic, validate-content, Chem renderer)
- `.github/workflows/ci.yml`

## 8. Files to modify

- `README.md` (hướng dẫn chạy dev, cấu trúc content, quy trình thêm bài)
- `CHANGELOG.md`
- `.gitignore` (bổ sung nếu cần)

## 9. API and database impact

Không có API/DB. Tiến độ chỉ nằm trong `localStorage`
(key `hhthcs-progress`, có version để migrate về sau).

## 10. Implementation steps

1. Khởi tạo Vite + React + TS + Tailwind; cấu trúc thư mục; CI.
2. Định nghĩa types + schema nội dung; viết `validate-content.ts` + test.
3. Component `<Chem>` render công thức/PTHH + test.
4. Store tiến độ (XP, streak, sao, unlock) + test logic.
5. UI lộ trình học (2 tab, node map, trạng thái khoá/mở/sao).
6. UI bài học: thẻ lý thuyết → quiz engine 4 dạng câu → màn tổng kết.
7. Trang tổng quan cá nhân.
8. Biên soạn nội dung A6 Axit (5 bài) + A8 Muối (5 bài); metadata các unit còn lại.
9. Chạy validate + toàn bộ test + build; rà soát nội dung hoá học.
10. Deploy Vercel, kiểm tra trên mobile thật.

## 11. Test strategy

- **Unit tests (vitest):** scoring/sao, unlock tuần tự, streak qua ngày
  (mock Date), parser `<Chem>`, validate-content bắt được lỗi mẫu.
- **Component tests (testing-library):** 4 dạng câu hỏi — chọn đúng/sai,
  hiện lời giải, câu sai lặp lại cuối bài.
- **Negative cases:** JSON hỏng schema → validate fail; localStorage
  trống/hỏng → app không crash, reset tiến độ an toàn.
- **Manual:** đi hết 1 bài trên mobile viewport; kiểm tra hiển thị PTHH.

## 12. Security considerations

- Không thu thập dữ liệu cá nhân, không cookie, không analytics ở MVP —
  phù hợp đối tượng trẻ em (không cần consent phụ huynh ở giai đoạn này).
- Nội dung markdown render qua thư viện có sanitize (không `innerHTML` thô).
- Không secrets trong repo; deploy token chỉ nằm ở GitHub/Vercel settings.

## 13. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Nội dung hoá học sai (nguy hiểm nhất với app học tập) | Cao | Quy ước lời giải từng bước; validate PTHH tự động; người duyệt rà trước khi merge; ghi nguồn câu HSG |
| Biên soạn 10 bài mẫu (A6: 5, A8: 5) tốn công hơn dự kiến | Trung bình | Acceptance chỉ yêu cầu tối thiểu 3 bài/chuyên đề; ưu tiên chất lượng hơn số lượng |
| Bản quyền đề thi sưu tầm | Trung bình | Chỉ dùng đề đã công bố công khai, ghi nguồn; lời giải tự viết |
| localStorage mất khi xoá cache → mất tiến độ | Thấp | Chấp nhận ở MVP; schema có version, thêm export/import hoặc account ở phase sau |
| Duolingo-style dễ thành "làm quiz chay" thiếu chiều sâu HSG | Trung bình | Mỗi bài bắt buộc có mức HSG với lời giải chi tiết; thẻ lý thuyết cô đọng phương pháp giải |

## 14. Rollback plan

Web tĩnh không có DB nên rollback = revert commit / redeploy bản trước
trên Vercel (giữ lịch sử deployment). Thay đổi schema tiến độ phải tăng
`version` trong localStorage và có hàm migrate; nếu lỗi, app tự reset về
tiến độ trống thay vì crash.

## 15. Acceptance criteria

- [ ] `npm run dev` chạy được; `npm run lint && npm run typecheck && npm test && npm run build` pass toàn bộ.
- [ ] Bản đồ lộ trình hiển thị đủ 2 phần Vô cơ/Hữu cơ với toàn bộ chuyên đề trong CONTENT_OUTLINE.md (unit chưa soạn hiện "sắp ra mắt").
- [ ] Học được trọn vẹn ≥ 3 bài của A6 (Axit) và ≥ 3 bài của A8 (Muối): thẻ lý thuyết → quiz 4 dạng câu → tổng kết XP/sao; câu sai được hỏi lại.
- [ ] Mỗi bài có đủ 3 mức câu hỏi và 100% câu có lời giải; câu sưu tầm có ghi nguồn.
- [ ] XP, streak, sao, mở khoá bài giữ nguyên sau khi đóng/mở lại trình duyệt.
- [ ] Công thức hoá học và PTHH hiển thị đúng (chỉ số dưới, mũi tên) trên mobile 375px.
- [ ] `validate-content` chặn được: đáp án ngoài options, thiếu lời giải, PTHH không cân bằng.
- [ ] Deploy công khai trên Vercel/GitHub Pages, truy cập được từ điện thoại.
