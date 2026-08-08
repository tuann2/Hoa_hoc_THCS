# FEATURE-017: Trang tra cứu — bảng tuần hoàn, bảng tính tan và hằng số

## Status

- Status: DRAFT <!-- DRAFT | APPROVED | SUPERSEDED -->
- Owner: Claude Code (Planner; dispatch của tuann2 ngày 2026-08-07)
- Approved by / date:
- Risk tier: NORMAL
- Risk categories and escalation rationale: nội dung giáo dục (giá trị số) +
  UI/React + một dòng cấu hình PWA. Không auth/RLS/schema/dependency. Dữ liệu
  chỉ đọc, không ghi vào tiến độ học viên. Rủi ro thực chất là sai số liệu,
  kiểm soát bằng schema validation + fact-check độc lập theo nguồn nêu rõ.
- Change type and required gate profile: **full** — `/tra-cuu` phải thêm vào
  `appRouteAllowlist` (`vite.config.ts:26-28`), mà `vite.config.ts` thuộc
  profile full (`scripts/gates-manifest.ts:250`). Chốt bằng
  `npm run gates -- --changed-from=<base_sha>`.

## Objective and scope

- Objective: học sinh tra được nguyên tử khối, tính tan, hoá trị, dãy hoạt
  động và hằng số ngay trong app, offline, không phải mở sách.
- In scope: route `/tra-cuu` nạp lazy + nav + allowlist PWA; 6 dataset dưới
  `content/reference/`; module `src/lib/referenceValidation.ts` + gọi từ
  `scripts/validate-content.ts`; unit test; E2E offline cho route mới.
- Out of scope: mở bảng tra trong phiên học/thi thử (quyết định tuann2
  2026-08-07); máy tính phân tử khối; đủ 118 nguyên tố; đồng bộ Supabase.
  **Đã loại bỏ sau review**: ý tưởng validator tự động đối chiếu nguyên tử
  khối với lời giải câu hỏi — xem mục dưới.

## Current analysis and design

- Current behavior: repo đã có nguyên tử khối và hằng số nằm rải trong thẻ lý
  thuyết và lời giải; **chưa có dataset tra cứu có cấu trúc và chưa có route
  tra cứu**. `src/lib/chemistry.ts` có `parseFormula` nhưng không có bảng khối
  lượng nguyên tử.
- Proposed design:
  - 6 file JSON dưới `content/reference/`: `elements.json` (~30 nguyên tố:
    20 nguyên tố đầu GDPT 2018 + Fe, Cu, Zn, Ag, Ba, Mn, Br, I…),
    `solubility.json`, `valences.json`, `activity-series.json`,
    `constants.json`, `precipitates.json`.
  - **Mỗi dataset bắt buộc khai `source`, `edition/version` và `conditions`**
    (bảng tính tan phụ thuộc nhiệt độ; hằng số phụ thuộc đkc/đktc). Khi nguồn
    chuẩn khác lời giải cũ: nguồn chuẩn thắng, ghi lệch vào handoff, **không**
    tự sửa `content/units/**` trong feature này.
  - Nạp bằng `import()` như `contentLoader`, **không dùng `fetch`**:
    `globPatterns` (`vite.config.ts:71`) không bao gồm `json`, nên chỉ dữ liệu
    được Vite gói thành chunk JS mới vào precache.
  - Bảng tuần hoàn: danh sách tìm kiếm được là mặc định; lưới chu kì/nhóm chỉ
    bật ở breakpoint đủ rộng, kèm cuộn ngang + sticky header. Nguyên tố ngoài
    phạm vi phải hiển thị trạng thái rõ ràng, không để trống gây hiểu nhầm.
  - Bảng tính tan: enum ô đóng `T | K | I | B | -`, có chú giải.
  - Validation đặt trong module thuần `src/lib/referenceValidation.ts`;
    `scripts/validate-content.ts` chỉ đọc file và gọi module. Phạm vi kiểm:
    schema, ký hiệu trùng, khối lượng ngoài khoảng hợp lệ, enum độ tan, thiếu
    `source`, ma trận tính tan khuyết ô.
  - **Không** tự động đối chiếu số liệu với lời giải: lời giải là văn bản tự
    do (`nS = 3,2/32` không có metadata nói `32` là khối lượng nguyên tử S),
    regex không thể vừa đủ vừa không báo nhầm; và phép so đó chỉ kiểm tính
    nhất quán chứ không kiểm tính đúng — bảng và lời giải có thể cùng sai.
    Thay bằng audit một lần có báo cáo + fact-check độc lập theo nguồn.
- New technology: không có.
- Execution profile + degradation path: Implementer = Codex (chạm `src/`,
  `scripts/`, `vite.config.ts`). Profile `codex-claude-subagent` từng gặp
  `EPERM` với `validate-content`/`build`/`test:pwa` (FEATURE-016) → dùng
  direct-terminal, hoặc để orchestrator/CI chạy các gate đó.

## Delivery plan

Execution assignment — mỗi vai cần con người xác nhận riêng khi đến lượt;
duyệt plan không đồng nghĩa duyệt việc nhận vai kế tiếp:

| Vai trò              | Agent đề xuất           | Model / effort         | Lý do                                            | Đã xác nhận        |
| -------------------- | ----------------------- | ---------------------- | ------------------------------------------------ | ------------------ |
| Planner              | Claude Code             | Sonnet 5 / medium      | Khảo sát + viết plan                             | tuann2, 2026-08-07 |
| Implementer          | Codex (direct-terminal) | `gpt-5.6-terra` / high | 6 dataset + route + validator + cấu hình PWA     | chưa               |
| Fact-checker         | agy                     | medium                 | Kiểm số liệu hoá học theo nguồn, không chạy gate | chưa               |
| Independent Reviewer | Codex (execution khác)  | `gpt-5.6-sol` / high   | Cần shell + chạy test, đúng role contract        | chưa               |
| Release Assessor     | Claude Code (phiên mới) | Sonnet 5 / medium      | Execution mới, không phải phiên Planner này      | chưa               |

1. Implementation — 6 dataset, `src/types/reference.ts`,
   `src/lib/referenceLoader.ts`, `src/lib/referenceValidation.ts`,
   `src/routes/ReferenceRoute.tsx`, nav + allowlist, unit test, E2E offline.
2. Validation — `npm run gates -- --changed-from=<base_sha>` (profile full),
   `npm run evidence`, bind đúng candidate SHA.
3. Review — fact-check toàn bộ số liệu theo nguồn (không lấy mẫu), rồi review
   độc lập, remediation, Release Assessment.

## Risks and controls

| Risk                                   | Impact                          | Mitigation                                                          |
| -------------------------------------- | ------------------------------- | ------------------------------------------------------------------- |
| Số liệu sai (khối lượng, ô tính tan)   | Học sinh học sai, mất niềm tin  | Nguồn khai báo bắt buộc + fact-check toàn bộ + validator enum/range |
| Bảng lệch với lời giải trong bài       | Mâu thuẫn nội bộ nội dung       | Audit một lần có báo cáo; nguồn chuẩn thắng; ghi lệch vào handoff   |
| Lưới bảng tuần hoàn vỡ trên điện thoại | Tính năng chính không dùng được | Mặc định danh sách; test tại 640/768/desktop                        |
| Dữ liệu không vào precache             | Mất offline                     | Bắt buộc `import()`; E2E offline cho `/tra-cuu` ở root và subpath   |

## Acceptance and recovery

- [ ] `/tra-cuu` vào được từ nav; sau khi app báo offline-ready, mở lại được
      khi offline, cả direct navigation lẫn deploy subpath.
- [ ] Mỗi dataset có `source`/`version`/`conditions`; validator FAIL khi
      thiếu, khi trùng ký hiệu, khi khối lượng ngoài khoảng, khi ô độ tan
      ngoài enum, hoặc khi ma trận tính tan khuyết ô.
- [ ] `elements.json` chứa đủ tập ký hiệu bắt buộc đã liệt kê; nguyên tố
      ngoài phạm vi hiển thị trạng thái rõ ràng.
- [ ] Bảng tuần hoàn đọc được ở 640px, 768px và desktop.
- [ ] `check-bundle-budget` PASS.
- Security considerations: dữ liệu tĩnh chỉ đọc, không PII, không auth/RLS.
- API/database impact: không có.
- Test strategy: unit test `referenceValidation` với ca FAIL xác định
  (duplicate symbol, mass ngoài range, thiếu source, enum sai, khuyết ô);
  test loader; E2E offline root + subpath; kiểm layout 3 kích thước.
- Rollback plan: revert commit; dữ liệu chỉ đọc nên không để lại trạng thái sai.
