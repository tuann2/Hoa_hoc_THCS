# WORKFLOW-005 — đo lường token (provider dashboard)

- Ngày ghi: 2026-07-26
- Phạm vi feature: WORKFLOW-005 "đóng self-reference cũ trỏ tới
  WORKFLOW-004C", risk tier `CRITICAL` (Risk Model rule 2 — mọi thay đổi
  `docs/architecture/AI_WORKFLOW_ARCHITECTURE.md` là CRITICAL bất kể quy
  mô), thực chất là một sửa wording docs-only.
- Loại đo: provider dashboard, cùng loại với
  `docs/measurements/FEATURE-016-token-cost.md`, khác với
  `WORKFLOW-004-token-baseline.md` (file đó đo mandatory-context bytes
  trên scenario cố định).
- **Chỉ đo số lượng token, không dùng cột chi phí ($).** Azure Monitor tự
  ghi chi phí hiển thị là ước tính ("Estimated total cost"); đơn giá quy
  đổi có thể đổi khác nhau giữa các lần đọc/loại token (cache hay không,
  input/output/reasoning) nên không dùng để so sánh giữa các feature. Số
  lượng token là số đếm được, ổn định hơn cho mục tiêu giảm chi phí.
- Nguồn số: ảnh chụp Azure AI Foundry Monitor do Human Project Owner
  cung cấp (2026-07-26), deployment `gpt-5.6-terra`, khoảng ngày hiển thị
  trên UI **7/19/2026–7/26/2026** (chủ sở hữu đã xác nhận đây đúng là bộ
  lọc đang áp dụng). Số thô không tái tạo được từ repo ⇒ dữ liệu do người
  nhập, cùng ngoại lệ đã ghi ở `FEATURE-016-token-cost.md` §8.

## 1. Số thô (toàn bộ cửa sổ 7 ngày, KHÔNG lọc riêng WORKFLOW-005)

| Model         | Requests | Input token | Output token | Tổng token |
| ------------- | -------- | ----------- | ------------ | ---------- |
| gpt-5.6-terra | 350      | 21,36M      | 180,78K      | 21,54M     |

Đây là tổng của cả cửa sổ 7/19–7/26, không phải số đã lọc riêng cho
WORKFLOW-005. WORKFLOW-005 chỉ là một phần công việc chạy trên
`gpt-5.6-terra` trong khoảng đó.

## 2. Đối chiếu với FEATURE-016 — nhất quán khi chỉ xét token

`docs/measurements/FEATURE-016-token-cost.md` §1 ghi riêng phần **Terra**
(`gpt-5.6-terra`) của FEATURE-016 — chạy 2026-07-21 đến 2026-07-25, nằm
trọn trong cửa sổ 7/19–7/26 ở trên — là:

| Nguồn                     | Requests | Input token | Output token |
| ------------------------- | -------- | ----------- | ------------ |
| Cửa sổ 7 ngày (§1)        | 350      | 21,36M      | 180,78K      |
| FEATURE-016 · Terra       | 283      | 18,76M      | 139,9K       |
| **Phần còn lại (suy ra)** | **67**   | **~2,60M**  | **~40,9K**   |

Khác với lần đọc trước dùng cột $ (khi đó $29,49 của riêng FEATURE-016 ·
Terra đã vượt tổng $8,44 của cả cửa sổ — vô lý), khi chỉ xét **token**
hai nguồn số này **nhất quán**: 18,76M ≤ 21,36M và 283 ≤ 350, còn dư
~2,60M input token / ~67 request cho phần việc khác trên `gpt-5.6-terra`
trong cùng cửa sổ, gồm WORKFLOW-005. Kết luận: cột $ ở lần đọc trước
không đáng tin (đúng như Azure tự ghi là ước tính); cột token thì đáng
tin và không có mâu thuẫn.

## 3. Số cho WORKFLOW-005

Hàng "Phần còn lại (suy ra)" ở §2 (~67 request, ~2,60M input token,
~40,9K output token) là **cận trên**, không phải số riêng của
WORKFLOW-005 — nó gồm cả mọi việc khác chạy trên `gpt-5.6-terra` trong
cùng cửa sổ 7/19–7/26 ngoài FEATURE-016 · Terra (có thể có việc khác
ngoài WORKFLOW-005). Không có cách tách chính xác hơn từ dữ liệu hiện
có.

So với mandatory-context baseline ở `WORKFLOW-004-token-baseline.md`
(shim chain sau 004B/004C ước tính ~507 token/request cho một câu hỏi
NORMAL đơn giản): nếu WORKFLOW-005 chiếm phần lớn trong ~67 request /
~2,60M input token cận trên đó, input token/request trung bình
(~2,60M / 67 ≈ 38 800) lớn hơn nhiều so với baseline mandatory-context —
phù hợp với thực tế WORKFLOW-005 là việc CRITICAL (đọc toàn bộ kiến
trúc + 2 vòng review độc lập), không phải một câu hỏi NORMAL đơn giản.

## 4. Khuyến nghị

- Cần truy vấn Azure Monitor theo cửa sổ hẹp hơn (đúng ngày/giờ
  WORKFLOW-005 chạy), hoặc theo request-ID/session nếu Azure hỗ trợ, để
  tách số liệu chính xác thay vì suy ra bằng phép trừ.
- Không dùng cột $ của Azure Monitor để so sánh chi phí giữa các
  feature/plan — chỉ dùng cho ước lượng thô, một-lần, không dùng làm
  chỉ số theo dõi liên tục.
- Muốn giảm token: tập trung vào số lượng request và input token/request
  (cột đáng tin), không phải $/request.

## 5. Deviations

- Số ở §1 do người nhập từ ảnh chụp dashboard provider, không sinh từ
  repo và không tái tạo được bằng lệnh trong repo.
- §1 là tổng cửa sổ 7 ngày, không phải số đã lọc riêng cho WORKFLOW-005;
  hàng "Phần còn lại" ở §2 là suy ra bằng phép trừ, không phải số đo
  trực tiếp.
- Cột chi phí ($) của Azure Monitor bị loại khỏi tài liệu này theo yêu
  cầu của Human Project Owner (2026-07-26): Azure tự ghi chi phí hiển
  thị là ước tính, đơn giá quy đổi thay đổi giữa các dự án/lần đọc nên
  không đáng tin để so sánh.
