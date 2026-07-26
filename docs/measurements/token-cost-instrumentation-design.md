# Thiết kế instrumentation cho đo token/billing theo phase (design-only)

- Ngày ghi: 2026-07-26
- Nguồn gốc: WORKFLOW-006 Phase B, để đóng gap 1–3 đã ghi ở
  `docs/measurements/FEATURE-016-token-cost.md` §4 (không tách được theo
  phase; không có cột cached input; "output hiển thị" không phải output
  tính tiền).
- Đây là **thiết kế**, không phải code — phiên này không có quyền truy
  cập trực tiếp Azure/Codex dashboard API để kiểm tra khả năng xuất dữ
  liệu, nên không hứa trước một khả năng chưa xác minh được (xem
  "Giới hạn chưa xác minh" bên dưới).

## Vấn đề

`WORKFLOW-005-token-cost.md` và `FEATURE-016-token-cost.md` đều gặp cùng
một giới hạn: Azure Monitor chỉ cho đọc **tổng theo model + khoảng ngày**,
không tách theo phase (plan/implement/review/remediation/release) hay
theo feature khi nhiều feature chạy chồng khoảng ngày. Cách tách hiện tại
(trừ số của feature này khỏi tổng cửa sổ, như `WORKFLOW-005-token-cost.md`
§2) chỉ cho **cận trên gián tiếp**, không phải số đo trực tiếp.

## Thiết kế đề xuất — nhật ký phiên thủ công, đối chiếu bằng khoảng thời gian hẹp

Vì không kiểm chứng được Azure/Codex có API xuất theo request-ID/session
hay không (xem giới hạn bên dưới), cơ chế khả thi nhất không cần code
mới là **ghi nhật ký thời điểm phase thủ công**, rồi đọc Azure Monitor
theo khoảng thời gian hẹp nhất có thể cho từng phase thay vì cả tuần:

1. Mỗi khi một phiên governed bắt đầu một phase (plan / implement /
   review / remediation / release), ghi một dòng vào phần "Session log"
   của plan hoặc handoff: `<ngày giờ bắt đầu> | <phase> | <agent/model>`.
   Ghi dòng kết thúc tương tự khi phase đóng.
2. Khi đọc Azure Monitor cho một feature, lọc theo khoảng
   `[thời điểm bắt đầu phase sớm nhất, thời điểm kết thúc phase muộn
nhất]` thay vì một khoảng ngày rộng cố định — thu hẹp tối đa chồng lấn
   với feature khác chạy cùng model.
3. Vẫn ghi rõ trong deviations: đây là khoanh vùng theo thời gian, không
   phải tách theo request-ID; hai feature/phase chạy đồng thời trên cùng
   model trong cùng khung giờ vẫn không tách được — nêu giới hạn, không
   che giấu.

Cờ cached-input: chưa thiết kế cơ chế, vì chưa xác minh được cột này có
tồn tại trên dashboard hay không (xem dưới). Nếu xác nhận có, bổ sung
bước 4: ghi thêm cột cached/non-cached input vào bảng §1 của mỗi file đo,
theo đúng format `FEATURE-016-token-cost.md` §1 đã dùng.

## Giới hạn chưa xác minh

- Phiên hiện tại (Claude Code, sandbox này) **không có quyền truy cập
  trực tiếp** Azure AI Foundry Monitor API hay Codex CLI billing export
  để kiểm tra xem có xuất được: (a) dữ liệu theo request-ID/session, (b)
  cột cached-input token, (c) cột reasoning/billed-output token tách
  riêng khỏi "output hiển thị". Không giả định câu trả lời cho cả ba.
- Người có quyền truy cập Azure Portal/Codex dashboard cần tự kiểm tra
  các mục trên trước khi bước 4 ở trên được thực hiện; đây là việc ngoài
  phạm vi một phiên Claude Code không có kết nối dashboard.
- Nhật ký thời điểm phase (bước 1–2) không phụ thuộc vào giới hạn này —
  có thể áp dụng ngay từ feature tiếp theo mà không cần xác minh gì
  thêm.

## Liên quan

- `docs/measurements/FEATURE-016-token-cost.md` §4 (gap 1–3), §7 (đề
  xuất 2).
- `docs/measurements/WORKFLOW-005-token-cost.md` §4 (khuyến nghị lọc
  cửa sổ hẹp hơn) — cùng ý tưởng, viết trước khi thiết kế này tồn tại.
