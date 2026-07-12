# FEATURE-012 — Phase B, Bước 1: Gemini fact-check tổng hợp

File tổng hợp báo cáo fact-check độc lập của Gemini (`agy`) cho các bài
đã qua Phase A (thực thi) nhưng chưa qua Phase B (review + update +
commit), phạm vi `a4-l4` → `b5-l3` (62 bài, 14 unit). Ghi verbatim mọi
finding SAI/CẦN SỬA (đã tự đối chiếu với file thật trước khi ghi), tóm
tắt ngắn gọn phần ĐÚNG. Xem `docs/plans/FEATURE-012.md` mục 6 "Phase B"
(đổi 2026-07-12) để biết quy trình đầy đủ. **Bước 1 đã xong toàn bộ
14 unit — sẵn sàng cho Bước 2 (Codex `gpt-5.6-sol` update theo unit).**

## Mục lục theo Unit — số finding cần Sol xử lý

| Unit                     | Bài          | Số finding CẦN SỬA/SAI | Mức độ                                                                                                                                     |
| ------------------------ | ------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| A4 (`a4-dung-dich`)      | a4-l4, a4-l5 | 1                      | Nội dung (lệch chuẩn 24,79→22,4 ở a4-l5-c7)                                                                                                |
| A5 (`a5-oxit`)           | a5-l1..l4    | 3                      | Diễn đạt/thuật ngữ nhẹ                                                                                                                     |
| A6 (`a6-axit`)           | a6-l1..l5    | 3                      | Diễn đạt/thuật ngữ nhẹ                                                                                                                     |
| A7 (`a7-bazo`)           | a7-l1..l5    | 1                      | Chính tả                                                                                                                                   |
| A8 (`a8-muoi-phan-bon`)  | a8-l1..l5    | 2                      | 1 lỗi tính toán thật (a8-l4-c4) + 1 ký hiệu                                                                                                |
| A9 (`a9-...-vo-co`)      | a9-l1..l4    | 0                      | — (1 finding Gemini báo là false positive)                                                                                                 |
| A10 (`a10-kim-loai`)     | a10-l1..l5   | 4                      | Thuật ngữ quá hàn lâm (2) + mâu thuẫn nội bộ (1) + ký hiệu trùng (1)                                                                       |
| A11 (`a11-phi-kim`)      | a11-l1..l5   | 2                      | Thuật ngữ nhẹ (1) + lệch quy ước tỉ lệ T (1)                                                                                               |
| A12 (`a12-...-vo-co`)    | a12-l1..l4   | 1                      | Ký hiệu (Ar(M) → M)                                                                                                                        |
| B1 (`b1-...-huu-co`)     | b1-l1..l3    | 3+2 vị trí             | Danh pháp (cyclopropan×3) + thuật ngữ (2)                                                                                                  |
| B2 (`b2-...-nhien-lieu`) | b2-l1..l6    | ~10 vị trí             | **Nhiều nhất** — vượt phạm vi (sigma/pi, gốc tự do, delocalization chưa dịch) + ký hiệu lập trình (xbar/ybar/Mbar/DeltaV) + cú pháp (n nX) |
| B3 (`b3-...-chua-oxi`)   | b3-l1..l5    | 0                      | — (2 finding Gemini báo là false positive)                                                                                                 |
| B4 (`b4-gluxit...`)      | b4-l1..l6    | 2                      | 1 định dạng nhẹ + 1 lỗi chính tả lặp lại nhiều lần (do→độ)                                                                                 |
| B5 (`b5-...-huu-co`)     | b5-l1..l3    | 1 nghiêm trọng + 2 nhẹ | **Lỗi hoá học thật** (b5-l3-c2: C2H4+HCl không tạo vinyl clorua)                                                                           |

Ghi chú: một số finding do Gemini báo cáo đã được Claude tự đối chiếu
lại với nội dung file thật và bác bỏ (false positive) — xem ghi chú
trong từng mục bài học bên dưới (`a9-l2-c9`, `a10-l5-c9`, `b2-l5-c7`,
`b3-l3-c4`, `b3-l4-c8`).

---

## a4-l4

Ghi chú: agy tự động fact-check cả `a4-l4` và `a4-l5` trong cùng một
lượt gọi vì cả hai lesson nằm trong cùng file `a4-dung-dich.json` và
đều xuất hiện trong git diff — không tách gọi lại riêng, xem đầy đủ ở
mục `a4-l5` bên dưới.

Tất cả 10 thẻ (3 thẻ cơ bản mở rộng `a4-l4-c1..c3` + 7 thẻ nâng cao
mới `a4-l4-c4..c10`): **ĐÚNG** 100%. Không có finding CẦN SỬA/SAI.

Chi tiết từng thẻ:

- `a4-l4-c1` (Tinh thể ngậm nước): ĐÚNG. Ký hiệu `·` mô tả cấu trúc
  hydrat, M(X·nH2O) = M(X) + 18n; cảnh báo nhiệt phân (một số muối
  hydrat có thể thuỷ phân/phân huỷ gốc muối khi đun, không chỉ mất
  nước) là chính xác và hữu ích.
- `a4-l4-c2` (Tính mX/mnước từ tinh thể): ĐÚNG. Công thức
  mX = m·M(X)/Mtt, mnước = m·18n/Mtt, tổng = m; lưu ý lỗi kinh điển
  học sinh lấy nhầm mtt làm chất tan khi tính C%.
- `a4-l4-c3` (Bài toán kết tinh): ĐÚNG. Phân biệt đúng kết tinh muối
  khan (nước không đổi) và kết tinh dạng ngậm nước (nước dung môi
  giảm theo 18n mỗi mol tinh thể).
- `a4-l4-c4` (Nâng cao: quy đổi muối khan ↔ tinh thể): ĐÚNG. Biến đổi
  toán học chính xác; đúng dạng bài pha chế dung dịch từ tinh thể phổ
  biến trong đề HSG 8/9.
- `a4-l4-c5` (Nâng cao: xác định n bằng thực nghiệm nung): ĐÚNG. Đúng
  quy trình n = nH2O/nX; cảnh báo không vội làm tròn khi lệch nhiều
  (có thể chưa mất hết nước hoặc muối đã phân huỷ) là điểm cộng sư
  phạm.
- `a4-l4-c6` (Nâng cao: làm nguội dung dịch bão hoà): ĐÚNG. Công thức
  mkt = mw·(S1-S2)/100 và mw = 100·mdd/(100+S1) đúng theo định nghĩa
  độ tan (quy về 100 g nước).
- `a4-l4-c7` (Nâng cao: cô đặc cùng nhiệt độ): ĐÚNG về cơ chế bão hoà;
  lượng muối kết tinh = phần vượt quá S·(mw-e)/100.
- `a4-l4-c8` (Nâng cao: kết tinh dạng X·nH2O — phương trình 1 ẩn t):
  ĐÚNG, và được đánh giá là phương pháp tối ưu/ngắn gọn thường dùng
  trong đội tuyển HSG cấp tỉnh.
- `a4-l4-c9` (Nâng cao: kết tinh phân đoạn, độ tinh khiết): ĐÚNG.
  Ngoài chương trình cơ bản THCS nhưng khớp dạng câu hỏi thực hành/tách
  chất ở đề HSG tỉnh và chuyên.
- `a4-l4-c10` (Nâng cao: lập bảng trước–sau, kiểm tra đáp số): ĐÚNG,
  đánh giá "rất xuất sắc" về mặt sư phạm (rèn tư duy kiểm tra đáp số).

Khuyến nghị của Gemini: giữ nguyên toàn bộ, không cần sửa.

## a4-l5

Cả 6 thẻ nâng cao mới (`a4-l5-c4..c9`): **ĐÚNG** 100%, số liệu ví dụ
tính toán lại khớp hoàn toàn.

- `a4-l5-c4` (Nâng cao: bảng số mol trước–phản ứng–sau): ĐÚNG. Kỹ năng
  nền tảng xác định chất dư/hết; đúng lưu ý giữ nguyên ion không phản
  ứng khi tính nồng độ cuối.
- `a4-l5-c5` (Nâng cao: chất dư nhiều chất tan sau trung hoà, ví dụ
  HCl 7,3% + NaOH 4,0%): ĐÚNG. Đã giải lại độc lập: nHCl=0,20 mol,
  nNaOH=0,10 mol → NaOH hết, dư 0,10 mol HCl (3,65 g) + tạo 0,10 mol
  NaCl (5,85 g); mdd=200 g → C%(HCl dư)=1,825%, C%(NaCl)=2,925%. Khớp.
- `a4-l5-c6` (Nâng cao: kết tủa + dung dịch lọc, ví dụ BaCl2 20,8% +
  Na2SO4 14,2%): ĐÚNG. Giải lại: 0,1 mol mỗi chất → 0,1 mol BaSO4
  (23,3 g) kết tủa; mdd lọc = 200-23,3=176,7 g chứa 0,2 mol NaCl
  (11,7 g) → C%(NaCl)≈6,62%. Khớp.
- `a4-l5-c7` (Nâng cao: phản ứng sinh khí, ví dụ Na2CO3 + HCl) —
  **CẦN SỬA** (phát hiện của Claude, không phải Gemini — Gemini khen
  nhầm điểm này). Phần hoá học/số liệu đúng: 0,1 mol Na2CO3 + 0,2 mol
  HCl vừa đủ → 0,1 mol CO2 (4,4 g); mdd sau = 100+10,6-4,4=106,2 g.
  Nhưng thẻ dùng V(đkc)=0,1×24,79=2,479 L — **vi phạm trực tiếp chỉ
  dẫn Phase A "KHÔNG áp dụng đktc/22,4 → đkc/24,79"** (mục 6 Phase A
  của plan). Đã kiểm tra toàn bộ `content/units/*.json`: 163 chỗ dùng
  `22,4`, chỉ duy nhất thẻ này dùng `24,79` — gây lệch chuẩn/thiếu
  nhất quán trong toàn bộ nội dung. Đề xuất sửa: đổi lại
  V=0,1×22,4=2,24 L (đktc), bỏ câu "không dùng 22,4 L/mol".
- `a4-l5-c8` (Nâng cao: bảo toàn nguyên tố kiểm tra nhanh): ĐÚNG.
  Nhắc đúng bảo toàn nguyên tố không thay thế bước xét chất dư/hết.
- `a4-l5-c9` (Nâng cao: kim loại + dung dịch muối, ví dụ Zn + CuSO4
  16,0%): ĐÚNG. Giải lại: 0,1 mol Zn + 0,1 mol CuSO4 → 0,1 mol Cu
  (6,4 g) bám ra; mdd sau=100+6,5-6,4=100,1 g chứa 0,1 mol ZnSO4
  (16,1 g) → C%(ZnSO4)≈16,08%. Khớp.

Khuyến nghị của Gemini: giữ nguyên toàn bộ, không cần sửa.

---

## a5-l1

10 thẻ (`a5-l1-c1..c10`) + 13 câu hỏi: đa số ĐÚNG. 1 finding CẦN SỬA
(diễn đạt, không phải sai kiến thức):

- **`a5-l1-c6`** (Nâng cao: Hoá trị, số oxi hoá và công thức oxit) —
  **CẦN SỬA nhẹ**. Nội dung hiện tại: _"Nếu M chỉ có một số oxi hoá k
  thì x.k = 2y..."_. Lý do: quy tắc x·k=2y đúng với mọi oxit MxOy bất
  kể M có một hay nhiều số oxi hoá (chỉ cần xét đúng k trong oxit
  đang xét, ví dụ FeO k=II, Fe2O3 k=III — cùng một M). Đề xuất sửa:
  đổi "Nếu M chỉ có một số oxi hoá k" → "Nếu M có hoá trị (số oxi hoá)
  là k trong oxit đó".
- Các thẻ còn lại (`c1..c5`, `c7..c10`) và toàn bộ 13 câu hỏi: ĐÚNG.
  Điểm nổi bật: `c1` phân loại 4 loại oxit + ngoại lệ Al2O3/ZnO/CO/NO;
  `c7` Fe3O4 = FeO·Fe2O3, M=232; `c9` anhiđrit; `c10` biện luận
  nguyên tố từ %O (đã giải lại độc lập, khớp).

## a5-l2

10 thẻ (`a5-l2-c1..c10`) + 13 câu hỏi: **ĐÚNG 100%**, không có finding.
Điểm nổi bật: `c4` chu trình vôi CaCO3⇌CaO⇌Ca(OH)2 + hiện tượng CO2
dư "đục rồi trong"; `c6` bảo toàn khối lượng khi nung đá vôi; `c9`
khử chua bằng CaO (đã giải lại các câu hỏi tính toán, khớp).

## a5-l3

10 thẻ (`a5-l3-c1..c10`) + 13 câu hỏi: **ĐÚNG 100%**, không có finding.
Điểm nổi bật: `c4` SO2 vừa khử vừa oxi hoá (số oxi hoá +IV trung
gian), các phương trình với Br2/KMnO4/H2S cân bằng đúng; `c8` biện
luận SO2 + kiềm 1 hoá trị theo tỉ lệ T=nOH-/nSO2 (đã kiểm chứng lại
bằng hệ phương trình, khớp); `c9` quy trình sản xuất H2SO4 công
nghiệp (xúc tác V2O5, oleum).

## a5-l4

10 thẻ (`a5-l4-c1..c10`) + 13 câu hỏi: đa số ĐÚNG. 2 finding CẦN SỬA
(diễn đạt/thuật ngữ, không sai bản chất hoá học):

- **`a5-l4-c6`** (Nâng cao: Bảo toàn oxi và lượng H+ của axit) —
  **CẦN SỬA**. Nội dung hiện tại (đã đối chiếu đúng với file thật):
  _"Nếu hỗn hợp chứa a mol MxOy và b mol RpSq thì nO = ay + bq."_. Lý
  do: ký hiệu `RpSq` dùng chữ S dễ hiểu nhầm là lưu huỳnh (muối
  sunfua) trong khi ý đang nói là oxit thứ hai. Đề xuất sửa: đổi
  "RpSq" → "RpOq" trong câu đó.
- **`a5-l4-c8`** (Nâng cao: Axit thiếu và giới hạn của dữ kiện) —
  **CẦN SỬA**. Nội dung hiện tại (đã đối chiếu đúng với file thật):
  _"...hỗn hợp MgO và CuO gặp 0,20 mol HCl chỉ cho biết tổng số mol
  oxit **đơn chức** đã phản ứng là 0,10 mol..."_. Lý do: "đơn chức" là
  thuật ngữ hoá hữu cơ (ancol/axit đơn chức), dùng sai cho oxit vô cơ
  MgO/CuO (đều là oxit kim loại hoá trị II, mỗi mol cần 2 mol HCl vì
  lý do hoá trị chứ không phải "đơn chức"). Đề xuất sửa: bỏ từ "đơn
  chức", có thể thay bằng "oxit kim loại hoá trị II" hoặc chỉ "oxit".
- Các thẻ còn lại (`c1..c5`, `c7`, `c9`, `c10`) và toàn bộ 13 câu hỏi:
  ĐÚNG. Điểm nổi bật: `c4` hai cách viết aluminat/zincat (quy ước
  THCS vs phức hiđroxo); `c7` công thức tăng giảm khối lượng
  moxit+55nO / +80nO (đã giải lại ví dụ, khớp); `c9` Fe3O4 + axit tạo
  đồng thời 2 muối sắt.

---

## a6-l1

10 thẻ (`a6-l1-c1..c10`): đa số ĐÚNG. 2 finding CẦN SỬA (diễn đạt
thuật ngữ, không sai bản chất):

- **`a6-l1-c1`** (Axit là gì?, bổ sung) — **CẦN SỬA nhẹ**. Câu _"...
  không thể kết luận dung dịch nào có axit mạnh hơn chỉ từ pH nếu
  chưa biết nồng độ"_ lẫn lộn "lực axit" (đặc tính của chất, ví dụ
  HCl luôn mạnh hơn CH3COOH) với "độ axit của dung dịch" (phụ thuộc
  nồng độ). Đề xuất sửa: đổi "axit mạnh hơn" → "chất nào là axit mạnh
  hơn (lực axit lớn hơn)".
- **`a6-l1-c4`** (Nâng cao: Lực axit, nồng độ và pH) — **CẦN SỬA
  nhẹ**. Hai chỗ diễn đạt lỏng lẻo: (1) "axit mạnh là axit phân li
  rất nhiều trong nước" → nên là "phân li hoàn toàn"; (2) "pH giảm 1
  đơn vị nghĩa là nồng độ H+ tăng xấp xỉ 10 lần" → ở dung dịch loãng
  bậc phổ thông là tăng chính xác 10 lần, không phải "xấp xỉ".
- Các thẻ còn lại (`c2`, `c3`, `c5..c10`): ĐÚNG. Điểm nổi bật: `c7`
  cacbonat/hiđrocacbonat gặp axit (CO3²⁻ cần 2H+, HCO3⁻ cần 1H+);
  `c10` bảo toàn H+ trong bài toán axit — dùng hằng số 22,4 L/mol,
  đúng theo convention 22,4 nhất quán của toàn dự án (không phải
  24,79, khác với lỗi ở `a4-l5-c7` đã ghi ở trên).

## a6-l2

9 thẻ (`a6-l2-c1..c9`): **ĐÚNG 100%**, không có finding. Điểm nổi
bật: `c2` tính chất kết tủa AgCl (không tan HNO3 loãng, tan trong
NH3, hoá đen ngoài sáng); `c4` điều chế HCl bằng phương pháp sunfat
(NaCl rắn + H2SO4 đặc, t<250°C); `c6` HCl đặc + MnO2 điều chế Cl2
(vai trò vừa môi trường vừa chất khử); `c7` mẹo loại nhiễu CO3²⁻ khi
nhận biết Cl⁻ (axit hoá bằng HNO3, không dùng HCl).

## a6-l3

9 thẻ (`a6-l3-c1..c9`): **ĐÚNG 100%**, không có finding. Điểm nổi
bật: `c4` phân biệt háo nước (vật lý) và tách nước (hoá học, tỉ lệ
H:O=2:1) của H2SO4 đặc với đường; `c6` thụ động hoá Fe/Al trong
H2SO4 đặc nguội; `c7` quy trình nhận biết SO4²⁻ chắc chắn (axit hoá
loại CO3²⁻/SO3²⁻ trước); `c9` Zn + H2SO4 đặc nóng có thể cho sản
phẩm khử khác ngoài SO2 (S, H2S) — lưu ý không mặc định.

## a6-l4

9 thẻ (`a6-l4-c1..c9`): **ĐÚNG 100%**, không có finding. Điểm nổi
bật: `c6` biện luận CO2 theo 3 trường hợp khi nhỏ từ từ axit vào hỗn
hợp cacbonat/hiđrocacbonat (x≤a; a<x<2a+b; x≥2a+b), đánh giá là "nội
dung vàng" của đề thi HSG; `c9` phân biệt CO2/SO2/H2S bằng nước vôi/
nước brom/giấy tẩm chì.

## a6-l5

7 thẻ (`a6-l5-c4..c10`): đa số ĐÚNG. 1 finding CẦN SỬA (thiếu lưu ý
thực nghiệm, không sai công thức):

- **`a6-l5-c7`** (Nâng cao: Ghép khí H2 với chuẩn độ phần axit dư) —
  **CẦN SỬA (bổ sung lưu ý)**. Công thức nH+ ban đầu = 2a+b (a=nH2,
  b=nNaOH trung hoà axit dư) đúng về toán học, nhưng khi dung dịch
  có ion kim loại như Al³⁺/Fe²⁺/Zn²⁺/Mg²⁺, NaOH nhỏ vào để chuẩn độ
  có thể phản ứng phụ tạo kết tủa hiđroxit (tốn thêm NaOH). Đề xuất
  bổ sung câu lưu ý: "Công thức này giả định phép chuẩn độ chỉ phản
  ứng với H+ dư, dừng trước khi ion kim loại kết tủa (hoặc đề bài
  giả thiết bỏ qua sự cạnh tranh này)."
- Các thẻ còn lại (`c4..c6`, `c8..c10`): ĐÚNG. Điểm nổi bật: `c5`
  công thức tính nhanh khối lượng muối khan; `c9` bảo toàn electron
  với H2SO4 đặc nóng; `c10` cảnh báo không trộn mô hình axit loãng
  (phân li) với axit đặc nóng (oxi hoá-khử).

---

## a7-l1 → a7-l5 (unit a7-bazo)

Đã kiểm tra riêng: **không có thẻ nào dùng hằng số 24,79 L/mol** (toàn
bộ câu hỏi tính toán vẫn dùng 22,4 L/mol nhất quán với dự án — không
lặp lại lỗi như `a4-l5-c7`).

- **a7-l1** (9 thẻ mở rộng/nâng cao, thiếu c3 vì không đổi): **ĐÚNG
  100%**. Điểm nổi bật: `c1` phân biệt độ tan vs độ mạnh bazơ của
  Ca(OH)2 (ít tan nhưng phần tan phân li hoàn toàn → vẫn là bazơ
  mạnh); `c6` màu kết tủa hiđroxit kim loại (Cu(OH)2 xanh, Fe(OH)2
  trắng xanh hoá nâu đỏ ngoài không khí, Al(OH)3 trắng keo); `c9`
  bảo toàn khối lượng khi nhiệt phân hiđroxit.
- **a7-l2** (9 thẻ `c1..c10` trừ `c9`... thực tế đủ 9 thẻ `c1..c9`):
  **ĐÚNG 100%** — Gemini báo 1 finding ở `a7-l2-c9` ("bảo quan kín"
  → "bảo quản kín") nhưng **đã đối chiếu lại file thật lúc Bước 2: sai,
  chữ đã viết đúng "bảo quản kín" sẵn** — false positive (giống các
  trường hợp `a9-l2-c9`, `a10-l5-c9`, `b2-l5-c7`, `b3-l3-c4`,
  `b3-l4-c8`), không cần sửa.
  - Còn lại ĐÚNG: `c4`/`c5` điện phân dung dịch NaCl có màng ngăn
    (vai trò từng điện cực, vai trò màng ngăn); `c7` tỉ lệ khối
    lượng 71 Cl2 : 2 H2 : 80 NaOH; `c8` ne=2nCl2=2nH2=nNaOH.
- **a7-l3** (10 thẻ `c1..c10`): **ĐÚNG 100%**. Điểm nổi bật: `c6` quy
  tắc số mol CO2–Ca(OH)2 theo 3 mốc (b≤a; a<b<2a; b≥2a); `c7` biện
  luận 2 nghiệm khi biết cùng lượng kết tủa (kiềm dư/CO2 dư); `c8`
  làm mềm nước cứng tạm thời bằng Ca(OH)2 (kể cả Mg(HCO3)2 → Mg(OH)2
  kết tủa, không phải MgCO3 — đã kiểm tra đúng vì Mg(OH)2 ít tan
  hơn).
- **a7-l4** (10 thẻ `c1..c10`): **ĐÚNG 100%**. Điểm nổi bật: `c6` đồ
  thị kết tủa CO2 vào Ca(OH)2; `c7` truy ngược thành phần cacbonat
  bằng axit dư; `c10` nhận biết HCO3⁻ bằng nhiệt phân.
- **a7-l5** (9 thẻ mở rộng/nâng cao trong diff, `c1`,`c3..c10`; `c2`
  không đổi): **ĐÚNG 100%**. Điểm nổi bật: `c4` hai cách viết
  aluminat/kẽmat (THCS vs GDPT2018 phức hiđroxo); `c5` đồ thị kết
  tủa Al³⁺/Zn²⁺ (độ dốc khác nhau vì Al(OH)3 cần 1 mol OH- để tan,
  Zn(OH)2 cần 2 mol); `c8` dùng NH3 dư phân biệt Al³⁺/Zn²⁺ (tạo phức
  [Zn(NH3)4]²⁺ tan, Al(OH)3 không tan trong NH3).

---

## a8-l1 → a8-l5 (unit a8-muoi-phan-bon)

Đã kiểm tra riêng: **không có thẻ nào dùng hằng số 24,79 L/mol** —
toàn bộ vẫn dùng 22,4 L/mol nhất quán với dự án.

- **a8-l1** (11 thẻ mở rộng/mới `c1..c11`): **ĐÚNG 100%**. Điểm nổi
  bật: `c1` loại trừ kim loại kiềm/kiềm thổ khi xét kim loại + muối
  (phản ứng với nước trước); `c7` Fe + CuSO4 tăng khối lượng thanh
  kim loại (Cu 64g bám > Fe 56g tan); `c9` nhận biết CO3²⁻/SO4²⁻ bằng
  Ba²⁺ + HCl.
- **a8-l2** (10 thẻ `c1`,`c4..c11`... thực tế `c1`,`c4-c11` theo review,
  9 thẻ liệt kê): **ĐÚNG 100%**. Điểm nổi bật: `c7` CO3²⁻ thuỷ phân
  tạo môi trường kiềm; `c9` biện luận hỗn hợp Na2CO3/NaHCO3 (đặt ẩn
  x,y theo khối lượng + khí thoát ra); `c10` điện phân dd NaCl có
  màng ngăn.
- **a8-l3** (10 thẻ `c1..c10`): **ĐÚNG 100%**. Điểm nổi bật: `c1`
  phân biệt muối axit/trung hoà theo đúng gốc axit còn H (NaHPO4²⁻
  loại muối axit vs NH4Cl không phải vì H ở cation); `c8` muối axit
  không đồng nghĩa dung dịch axit (NaHSO4 axit nhưng NaHCO3 kiềm yếu
  do thuỷ phân ion).
- **a8-l4** (11 thẻ `c1..c11`): đa số ĐÚNG. 1 finding CẦN SỬA (lỗi
  tính toán thật, đã đối chiếu đúng với file):
  - **`a8-l4-c4`** (Nâng cao: Hàm lượng dinh dưỡng của phân đạm) —
    **CẦN SỬA**. Nội dung hiện tại: _"NH4Cl có 28/53,5 x 100% =
    26,17% N"_. NH4Cl chỉ có 1 nguyên tử N (M=14), không phải 2 (M
    N=28 chỉ đúng cho urê/NH4NO3/(NH4)2SO4 vì các chất đó có 2 N/phân
    tử). Tử số đúng phải là 14, tức 14/53,5×100%=26,17% — kết quả %
    ghi đã đúng nhưng tử số "28" là lỗi (có vẻ copy nhầm từ ví dụ
    trước). Đề xuất sửa: đổi "28/53,5" → "14/53,5" (giữ nguyên kết
    quả 26,17%).
  - Còn lại (`c1..c3`, `c5..c11`) ĐÚNG. Điểm nổi bật: `c5` quy đổi
    N-P2O5-K2O sang % nguyên tố (%P=%P2O5×62/142, %K=%K2O×78/94);
    `c7` thất thoát đạm amoni khi bón chung vôi.
- **a8-l5** (6 thẻ `c4..c9`): đa số ĐÚNG. 1 finding CẦN SỬA (ký hiệu
  gây nhầm lẫn, không sai bản chất):
  - **`a8-l5-c4`** (Nâng cao: Một lần trộn có thể tạo hai kết tủa) —
    **CẦN SỬA (ký hiệu)**. Công thức "m = x x (90 + 233)" dùng "x"
    liền hai lần (biến số mol và dấu nhân) dễ gây hiểu lầm là lỗi gõ
    lặp. Đề xuất đổi dấu nhân thành "×" hoặc "·": "m = x × (90+233)".
  - Còn lại (`c5..c9`) ĐÚNG. Điểm nổi bật: `c7` hỗn hợp Na2CO3+FeS +
    HCl dư tạo CO2+H2S (đã kiểm tra hệ phương trình 106x+88y=m,
    x+y=V/22,4 — khớp); `c9` phân biệt độ giảm khối lượng rắn (=
    mBaCO3) và độ giảm khối lượng dung dịch (=mCO2) khi có hỗn hợp
    BaCO3+BaSO4 gặp axit.

---

## a9-l1 → a9-l4 (unit a9-moi-quan-he-hop-chat-vo-co)

Đã kiểm tra riêng: **không có thẻ nào dùng hằng số 24,79 L/mol** —
toàn bộ vẫn dùng 22,4 L/mol, `a9-l2-c10` còn chủ động nhắc học sinh
không đổi sang 24,79.

**ĐÚNG 100%** cho cả 4 bài (`a9-l1-c4..c11`, `a9-l2-c1..c11`,
`a9-l3-c4..c11`, `a9-l4-c4..c10`) — không có finding thật sự nào.
Gemini có báo 1 finding ở `a9-l2-c9` (nói thẻ còn sót từ tiếng Anh
"If" chưa dịch) nhưng **đã đối chiếu lại với file thật: sai — nội
dung đã viết đúng "Nếu hiệu suất các bước lần lượt là..." bằng tiếng
Việt, không có "If"** — false positive của Gemini, không cần sửa.

Điểm nổi bật (không có vấn đề): `a9-l1-c9`/`a9-l2-c10` tỉ lệ
T=nOH-/nCO2; `a9-l2-c5` chuỗi oxi hoá Fe→FeCl2→FeCl3 (không dùng Cl2
trực tiếp tạo FeCl2); `a9-l3-c5` axit hoá đúng thuốc thử khi nhận
biết SO4²⁻ (dùng HCl) và Cl⁻ (dùng HNO3, không dùng HCl); `a9-l3-c10`
thứ tự rửa khí CO2 qua NaHCO3 bão hoà rồi mới làm khô qua H2SO4 đặc;
`a9-l4-c6` 3 mốc khi axit hoá hỗn hợp kiềm-cacbonat (đã kiểm tra công
thức, khớp).

---

## a10-l1 → a10-l5 (unit a10-kim-loai)

Đã kiểm tra riêng: **không có thẻ nào dùng hằng số 24,79 L/mol** —
toàn bộ vẫn dùng 22,4 L/mol (`a10-l5-c10` còn nhắc lại V=22,4n).

- **a10-l1** (10 thẻ `c2..c11`): đa số ĐÚNG. 2 finding CẦN SỬA:
  - **`a10-l1-c8`** (Nâng cao: Khối lượng thanh kim loại sau phản ứng
    thế) — **CẦN SỬA (thuật ngữ quá hàn lâm)**. Dùng "mức tiến triển
    k" + công thức Δm=k×(bM(B)-aM(A)) — thuật ngữ "extent of
    reaction" bậc đại học, không quen thuộc với học sinh THCS (vốn
    quen đặt ẩn số mol trực tiếp là x). Đề xuất sửa: đổi cách diễn
    đạt sang đặt ẩn số mol thông thường (x = số mol kim loại phản
    ứng) thay vì "mức tiến triển k".
  - **`a10-l1-c11`** (Nâng cao: Hỗn hợp muối và chiến lược giải bài
    tập) — **CẦN SỬA (mâu thuẫn nội bộ, đã đối chiếu 2 file)**. Câu
    _"Không được tự chọn một ion 'phản ứng trước' chỉ vì kim loại của
    nó đứng thấp hơn trong dãy nếu đề không cho cơ sở cho lựa chọn
    ấy"_ **mâu thuẫn trực tiếp** với `a10-l4-c2` (cùng unit, bài sau)
    vốn khẳng định: _"M sẽ phản ứng lần lượt với muối của kim loại có
    tính oxi hoá mạnh hơn trước... 'phản ứng trước' là quy ước biện
    luận"_ — tức xác nhận thứ tự ưu tiên theo dãy hoạt động LÀ quy
    ước mặc định hợp lệ ở THCS. Hai thẻ đưa ra hướng dẫn trái ngược
    nhau cho học sinh. Đề xuất sửa: sửa `a10-l1-c11` để thống nhất
    với `a10-l4-c2` — khẳng định thứ tự ưu tiên theo dãy hoạt động
    LÀ công cụ biện luận mặc định hợp lệ ở THCS (trừ khi đề bài có
    dữ kiện đặc biệt bác bỏ).
  - Còn lại (`c2..c7`, `c9`, `c10`) ĐÚNG.
- **a10-l2** (10 thẻ `c1..c11`, trừ không rõ 1 id): **ĐÚNG 100%**.
  Điểm nổi bật: `c6` tỉ lệ khối lượng phản ứng nhiệt nhôm 54:160:112;
  `c8` Fe3O4 + axit tạo 2 muối sắt; `c11` tách Al/Fe bằng kiềm.
- **a10-l3** (10 thẻ `c1..c11`): **ĐÚNG 100%**. Điểm nổi bật: `c5`
  bán phản ứng ăn mòn điện hoá (anot Fe→Fe2++2e, catot O2+2H2O+4e→
  4OH- môi trường trung tính); `c8` mạ kẽm vs mạ thiếc khi xước (vai
  trò anot/catot đổi chỗ); `c9` anot hi sinh.
- **a10-l4** (9 thẻ `c2..c10`): đa số ĐÚNG. 2 finding CẦN SỬA (thuật
  ngữ, không sai bản chất):
  - **`a10-l4-c7`** — cùng vấn đề như `a10-l1-c8`: dùng ký hiệu "mức
    tiến hành xi mol" (chữ Hy Lạp ξ viết ASCII "xi") + công thức tổng
    quát, quá hàn lâm. Đề xuất sửa tương tự: đặt ẩn số mol thông
    thường.
  - **`a10-l4-c9`** — chữ "xi" ở "điều kiện 0 <= xi <= số mol ion ban
    đầu" (ý là x1, x2,... mỗi ion) dễ nhầm với ký hiệu ξ (mức tiến
    hành) vừa dùng ở `c7` liền trước. Đề xuất sửa: đổi thành "x1, x2,
    ... (số mol kim loại bám ra thứ i)" cho rõ, tránh trùng ký hiệu.
  - Còn lại (`c3..c6`, `c8`, `c10`) ĐÚNG.
- **a10-l5** (7 thẻ `c4..c10`): **ĐÚNG 100%** — Gemini báo 1 finding ở
  `a10-l5-c9` (nói còn sót cụm tiếng Anh "in which M") nhưng **đã đối
  chiếu lại file thật: sai, toàn bộ thẻ đã viết bằng tiếng Việt, không
  có "in which M"** — false positive, không cần sửa. Điểm nổi bật:
  `c9` trung bình đương lượng m(kim loại tan)/n(H2) nằm giữa các giá
  trị 2M/z của kim loại đã phản ứng (phép thử nhanh kiểm tra nghiệm).

---

## a11-l1 → a11-l5 (unit a11-phi-kim)

Đã kiểm tra riêng: **không có thẻ nào dùng hằng số 24,79 L/mol**
(`a11-l2-c11` dùng đúng 22,4). Không có câu tiếng Anh sót lại.

- **a11-l1** (10 thẻ `c1..c10`): **ĐÚNG 100%**. Điểm nổi bật: `c6` S
  đốt trực tiếp chỉ tạo SO2 (không tạo SO3, lỗi hay gặp); `c9` C khử
  được oxit kim loại trung bình/yếu, không khử được Al2O3/MgO.
- **a11-l2** (8 thẻ `c4..c11`): đa số ĐÚNG. 1 finding CẦN SỬA (thuật
  ngữ, đã đối chiếu đúng với file):
  - **`a11-l2-c4`** (Nâng cao: Clo trong nước và sự tẩy màu) — **CẦN
    SỬA nhẹ**. Nội dung hiện tại: _"đây là phản ứng tự oxi hoá - khử
    (phân hủy không đều)"_. Cụm "phân hủy không đều" không phải thuật
    ngữ chuẩn trong SGK Hoá Việt Nam (thuật ngữ chuẩn là "tự oxi hoá –
    khử", đôi khi gọi "phản ứng dị phân"). Đề xuất sửa: bỏ cụm "(phân
    hủy không đều)" hoặc đổi thành "(còn gọi là phản ứng dị phân)".
  - Còn lại (`c5..c11`) ĐÚNG. Điểm nổi bật: `c8` sản phẩm Cl2+NaOH
    phụ thuộc nhiệt độ (lạnh→NaClO, nóng→NaClO3); `c9` clorua vôi
    CaOCl2 là muối hỗn tạp (gốc Cl⁻ và ClO⁻).
- **a11-l3** (11 thẻ `c1..c11`): đa số ĐÚNG. 1 finding CẦN SỬA (nhất
  quán quy ước trong dự án, đã đối chiếu đúng với file thật và với
  `a7-bazo.json`):
  - **`a11-l3-c7`** (Nâng cao: CO2 tác dụng với kiềm theo tỉ lệ mol)
    — **CẦN SỬA (nhất quán quy ước)**. Thẻ này lập tỉ lệ theo
    nCO2/nNaOH (≤1/2 → chỉ Na2CO3; giữa 1/2 và 1 → hỗn hợp; =1 → chỉ
    NaHCO3) — về toán học đúng, nhưng **ngược chiều quy ước** đang
    dùng thống nhất ở các unit khác trong dự án (ví dụ
    `a7-bazo.json`, `a9-...json`: T = nOH-/nCO2, T≥2 → trung hoà,
    1<T<2 → hỗn hợp, T≤1 → muối axit). Học sinh dễ nhầm khi chuyển
    giữa hai bài dùng hai chiều tỉ lệ ngược nhau cho cùng một dạng
    toán. Đề xuất sửa: đổi lại theo chiều T=nNaOH/nCO2 (hoặc
    nOH-/nCO2) cho nhất quán toàn dự án.
  - Còn lại (`c1..c6`, `c8..c11`) ĐÚNG. Điểm nổi bật: `c4` Mg cháy
    được trong CO2 (không dùng bình CO2 chữa cháy kim loại mạnh);
    `c10` HCO3⁻ lưỡng tính (vừa axit vừa bazơ theo Bronsted).
- **a11-l4** (11 thẻ `c1..c11`): **ĐÚNG 100%**. Điểm nổi bật: `c4`
  giải thích SiO2 rắn (mạng lưới cộng hoá trị) vs CO2 khí dù cùng
  dạng EO2; `c6` HF ăn mòn thuỷ tinh (SiO2+4HF→SiF4+2H2O); `c9` vai
  trò thạch cao điều chỉnh thời gian đông kết xi măng.
- **a11-l5** (8 thẻ `c4..c11`): **ĐÚNG 100%**. Điểm nổi bật: `c4` khử
  oxit sắt qua các bậc trung gian Fe2O3→Fe3O4→FeO→Fe (không hoàn
  toàn ngay một bước); `c8` công thức nCO2=min(y, x/2) khi nhỏ
  cacbonat vào lượng axit hữu hạn (đã kiểm tra đúng, có thể diễn giải
  thêm bằng lời cho dễ hiểu nhưng không bắt buộc sửa); `c11` dùng HCl
  chứ không dùng H2SO4 loãng để nhận biết cacbonat Ca/Ba (tránh kết
  tủa sunfat bao bọc).

---

## a12-l1 → a12-l4 (unit a12-tong-hop-vo-co)

Đã kiểm tra riêng: **không có thẻ nào dùng hằng số 24,79 L/mol**
(`a12-l1-c6`, `a12-l4-c11` dùng đúng 22,4). Không sót tiếng Anh. Không
phát hiện mâu thuẫn quy ước T=nOH-/nCO2 (khác với lỗi ở `a11-l3-c7`).

- **a12-l1** (10 thẻ `c1..c10`): **ĐÚNG 100%**. Điểm nổi bật: `c2`
  điều chế clorua vôi (Cl2 khô + Ca(OH)2 khô); `c7` điều chế HCl từ
  NaCl phụ thuộc nhiệt độ (NaHSO4 ở nhiệt thấp, Na2SO4 ở nhiệt cao);
  `c9` quy về chất trung gian chung ở nút ghép chuỗi phân nhánh +
  hiệu suất nối tiếp h1×h2.
- **a12-l2** (10 thẻ `c1..c10`): **ĐÚNG 100%**. Điểm nổi bật: `c5`
  phá nhiễu CO3²⁻ khi nhận biết SO4²⁻ (axit hoá bằng HCl trước, không
  dùng H2SO4); `c9` kết tinh phân đoạn không cần cô cạn tới khô.
- **a12-l3** (8 thẻ `c4..c11`): đa số ĐÚNG. 1 finding CẦN SỬA (ký
  hiệu, không sai bản chất, đã đối chiếu đúng với file):
  - **`a12-l3-c10`** (Nâng cao: Biện luận oxit và muối bằng tỉ lệ
    mol) — **CẦN SỬA (ký hiệu)**. Dùng "Ar(M)" cho nguyên tử khối,
    không đồng nhất với ký hiệu "M" dùng ở các thẻ khác trong cùng
    bài (ví dụ `a12-l3-c3`), và viết liền "Ar" dễ gây nhầm với
    nguyên tố khí hiếm Argon. Đề xuất sửa: đổi "Ar(M)" → "M" (hoặc
    "M_M") trong công thức nM=mM/Ar(M) và mM:mO=x.Ar(M):16y.
  - Còn lại (`c4..c9`, `c11`) ĐÚNG. Điểm nổi bật: `c9` công thức muối
    clorua 35,5·z·n(M phản ứng); `c11` dùng nguyên tử khối trung bình
    để loại nhanh nghiệm sai.
- **a12-l4** (8 thẻ `c4..c11`): **ĐÚNG 100%**. Điểm nổi bật: `c7`
  bảo toàn Fe qua nung thành Fe2O3 cuối (nFe tổng = 2×nFe2O3); `c10`
  điều kiện chặn miền nghiệm 0≤x≤min(n/hệ số).

---

## b1-l1 → b1-l3 (unit b1-dai-cuong-huu-co)

Đã kiểm tra riêng: **không có thẻ nào dùng 24,79 L/mol** (`b1-l3-c10`
dùng đúng 22,4). Không sót tiếng Anh (trừ _cis/trans_ là thuật ngữ
quốc tế bắt buộc giữ nguyên). Công thức CTPT/CTCT đều ở dạng text đơn
giản (CH2=CH2, CH≡CH...), đúng quy tắc.

- **b1-l1** (10 thẻ `c1..c10`): đa số ĐÚNG. 3 finding CẦN SỬA (thuật
  ngữ/ký hiệu, đã đối chiếu đúng với file):
  - **`b1-l1-c4`, `c5`, `c10`** — cả 3 thẻ dùng "**cyclopropan**"
    (nửa Anh nửa Việt) thay vì "**xiclopropan**" — không nhất quán
    với "xicloankan" đã dùng ngay trong cùng thẻ `c5`. Đề xuất sửa:
    đổi "cyclopropan" → "xiclopropan" ở cả 3 chỗ.
  - **`b1-l1-c6`** (Nâng cao: Độ bất bão hoà) — **CẦN SỬA nhẹ**. Ký
    hiệu "I" cho độ bất bão hoà (I=(2C+2+N-H-X)/2) không phổ biến ở
    tài liệu ôn HSG Việt Nam và dễ nhầm với nguyên tố Iot (I). Đề
    xuất đổi ký hiệu thành "k" (độ bất bão hoà k = ...).
  - Còn lại (`c1..c3`, `c7..c9`) ĐÚNG. Điểm nổi bật: `c1` CCl4 không
    có H vẫn là hợp chất hữu cơ; `c8` R-OH vs R-O-R (rượu etylic vs
    đimetyl ete, cùng C2H6O).
- **b1-l2** (10 thẻ `c1..c10`): đa số ĐÚNG. 1 finding CẦN SỬA (thuật
  ngữ quá hàn lâm, đã đối chiếu đúng với file):
  - **`b1-l2-c4`** (Nâng cao: Hai phép kiểm tra bắt buộc của CTCT) —
    **CẦN SỬA**. Dùng "bậc các liên kết"/"tổng bậc liên kết" (ví dụ
    "Mỗi C đều có tổng bậc liên kết bằng 4") — thuật ngữ "bậc liên
    kết" (bond order) là khái niệm bậc đại học/MO, quá phức tạp cho
    THCS và dễ nhầm với "bậc của cacbon". Đề xuất sửa: đổi "bậc liên
    kết" → "số liên kết" (ví dụ "mỗi nguyên tử C phải có tổng số liên
    kết bằng 4, tính liên kết đôi=2, ba=3").
  - Còn lại (`c1..c3`, `c5..c10`) ĐÚNG — kể cả `c9` (đồng phân hình
    học cis/trans, Gemini lưu ý đây vốn là kiến thức THPT nhưng vẫn
    phù hợp gắn nhãn "Nâng cao" cho HSG/chuyên, không phải lỗi).
    Điểm nổi bật: `c6` 3 đồng phân C3H8O; `c7` 7 đồng phân C4H10O.
- **b1-l3** (7 thẻ `c4..c10`): **ĐÚNG 100%**. Điểm nổi bật: `c5`
  mH=mH2O/9 (công thức tính nhanh khối lượng H từ nước); `c8` tỉ lệ
  H/C=2nH2O/nCO2 để nhận diện hiđrocacbon (CH2, CH4...); `c10` đổi
  V(đktc) dùng đúng 22,4.

---

## b2-l1 → b2-l6 (unit b2-hidrocacbon-nhien-lieu)

Đã kiểm tra riêng: **không có thẻ nào dùng 24,79 L/mol** (`b2-l4-c9`,
`b2-l6-c8` dùng đúng 22,4). Đây là unit có **nhiều finding nhất** —
chủ yếu 2 nhóm: (A) thuật ngữ/cơ chế vượt phạm vi THCS (THPT/đại
học), (B) ký hiệu biến kiểu lập trình (xbar/ybar/Mbar/DeltaV) và lỗi
cú pháp thiếu dấu nhân — cả hai nhóm đã đối chiếu đúng với file thật.

- **b2-l1** (10 thẻ `c1..c10`): đa số ĐÚNG. 1 finding CẦN SỬA (vượt
  phạm vi chương trình):
  - **`b2-l1-c5`** (Nâng cao: Cơ chế gốc tự do của phản ứng thế) —
    **CẦN SỬA (vượt phạm vi)**. Dùng "cơ chế gốc tự do", "phân cắt
    đồng li", ký hiệu electron độc thân "Cl•", "CH3•" — kiến thức cơ
    chế phản ứng hữu cơ bậc THPT chuyên/đại học, ngoài phạm vi "HSG
    cấp huyện/tỉnh" đã thống nhất cho dự án. Đề xuất: bỏ thẻ hoặc
    viết lại đơn giản hoá (chỉ nói "phản ứng xảy ra theo nhiều nấc,
    tạo hỗn hợp sản phẩm thế"), bỏ cơ chế gốc tự do và ký hiệu chấm
    electron.
  - Còn lại (`c1..c4`, `c6..c10`) ĐÚNG. Điểm nổi bật: `c7` công thức
    CH(4-x)Clx cho bài toán tỉ lượng thế; `c9` số oxi hoá C trong
    CH4(-4)/CO2(+4).
- **b2-l2** (9 thẻ `c2..c10`): đa số ĐÚNG. 1 finding CẦN SỬA (vượt
  phạm vi):
  - **`b2-l2-c4`** (Nâng cao: Bản chất liên kết đôi C=C) — **CẦN SỬA
    (vượt phạm vi)**. Dùng "liên kết sigma", "liên kết pi", "đồng
    phân cis-trans", "quay tự do quanh liên kết đôi" — kiến thức lớp
    10/11. Đề xuất: đổi "sigma"→"liên kết bền", "pi"→"liên kết kém
    bền", bỏ phần cis-trans (đã có thẻ riêng b1-l2-c9 nói về cis/
    trans một cách vừa phải, không cần lặp sâu hơn ở đây).
  - Còn lại (`c2`,`c3`,`c5..c10`) ĐÚNG. Điểm nổi bật: `c6` oxi hoá
    nhẹ bằng KMnO4 (3C2H4+2KMnO4+4H2O→3C2H6O2+2MnO2+2KOH); `c10` tỉ
    lệ đốt cháy etilen 1:3:2:2.
- **b2-l3** (9 thẻ `c1..c10` trừ 1): đa số ĐÚNG. 2 finding CẦN SỬA
  (cùng vấn đề sigma/pi):
  - **`b2-l3-c1`**, **`b2-l3-c5`** — dùng "liên kết sigma và liên kết
    pi" / "liên kết pi" — đề xuất đổi thành "1 liên kết bền + 2 liên
    kết kém bền" (cho liên kết ba).
  - Còn lại (`c2..c4`, `c6..c10`) ĐÚNG. Điểm nổi bật: `c6` cộng nước
    tạo CH3CHO (không phải rượu không bền); `c8` Ag2C2 kết tủa vàng
    nhạt nhận biết axetilen (AgNO3/NH3).
- **b2-l4** (10 thẻ `c1..c10`): đa số ĐÚNG. 3 finding CẦN SỬA (vượt
  phạm vi + tiếng Anh sót):
  - **`b2-l4-c1`**, **`b2-l4-c3`** — cả 2 thẻ còn nguyên từ tiếng Anh
    **"delocalization"** chưa dịch (đã đối chiếu đúng với file: "Sự
    delocalization này là nguyên nhân..." và "...hệ electron pi
    delocalization bền"), cộng với thuật ngữ "electron pi" quá hàn
    lâm. Đề xuất: Việt hoá thành "sự giải toả electron/phân bố đều
    electron trên vòng" và giải thích đơn giản là 6 liên kết C-C dài
    bằng nhau nên vòng bền, bỏ "electron pi"/"delocalization".
  - **`b2-l4-c2`** — "làm phân cực phân tử Br2", "khôi phục hệ
    electron pi" — cơ chế thế electrophin (THPT lớp 11), đề xuất đơn
    giản hoá còn "phản ứng thế được ưu tiên vì giữ nguyên vòng bền
    benzen".
  - Còn lại (`c4..c10`) ĐÚNG. Điểm nổi bật: `c7` o-/m-/p- đồng phân
    vị trí; `c8` thế Br2 (xúc tác Fe) vs cộng Cl2 (as sáng, tạo 666).
- **b2-l5** (11 thẻ `c1..c11`): **ĐÚNG 100%** — Gemini báo 1 finding
  ở `c7` ("phần trạng" thay vì "phần trăm") nhưng **đã đối chiếu lại
  file thật: sai, chữ đã viết đúng "phần trăm"** — false positive.
  Điểm nổi bật: `c6` phân biệt cracking/reforming (hoá học) với chưng
  cất (vật lý); `c9` phân biệt LPG/CNG/LNG/biogas.
- **b2-l6** (7 thẻ `c4..c10`): đa số ĐÚNG. 3 finding CẦN SỬA (ký hiệu
  kiểu lập trình + lỗi cú pháp, đã đối chiếu đúng với file — các ký
  hiệu này xuất hiện cả trong câu hỏi/explanation, không chỉ trong
  card):
  - **`b2-l6-c5`**, và rải khắp cả bài (thẻ + câu hỏi) — dùng
    "xbar", "ybar", "Mbar" (ví dụ "Mbar = m hỗn hợp / n hỗn hợp",
    "CxbarHybar") kiểu ký hiệu lập trình, không phải danh pháp SGK
    Việt Nam. Đề xuất: đổi "Mbar"→"M_tb" (hoặc ghi chữ "M trung
    bình"), "xbar"/"ybar"→"x_tb"/"y_tb", áp dụng nhất quán cho toàn
    bộ thẻ VÀ câu hỏi liên quan trong `b2-l6` (không chỉ card, vì
    "Mbar" cũng xuất hiện trong `prompt`/`explanation` của câu hỏi ở
    dòng ~1210, 1241, 1277 — Sol cần rà cả phần `questions` khi sửa
    dù nhiệm vụ chính là `cards`, để tránh thẻ và câu hỏi lệch ký
    hiệu nhau trong cùng bài).
  - **`b2-l6-c6`** — lỗi cú pháp thiếu dấu nhân: "b = nCO2 - n nX"
    (hai chữ "n" liền nhau, dễ đọc nhầm biến lạ). Đề xuất sửa: "b =
    nCO2 - n×nX" (n là số C của chất nhỏ hơn, nX là tổng số mol hỗn
    hợp).
  - **`b2-l6-c8`** — dùng "DeltaV" thay vì ký hiệu "ΔV". Đề xuất đổi
    "DeltaV/22,4" → "ΔV/22,4".
  - Còn lại (`c4`, `c7`, `c9`) ĐÚNG. Điểm nổi bật: `c7` lưu ý bình
    KOH hấp thụ cả CO2 lẫn H2O nên phải hút nước trước.

---

## b3-l1 → b3-l5 (unit b3-dan-xuat-chua-oxi)

Đã kiểm tra riêng: **không có thẻ nào dùng 24,79 L/mol** (`b3-l1-c5`,
`b3-l3-c7/c8` dùng đúng 22,4). Không có thuật ngữ quá hàn lâm (không
sigma/pi, không ký hiệu kiểu xbar/Mbar) — unit này sạch hơn hẳn B2.

**ĐÚNG 100%** cho cả 5 bài (`b3-l1-c4..c10`, `b3-l2-c4..c8`,
`b3-l3-c4..c9`, `b3-l4-c4..c8`, `b3-l5-c4..c8`) — không có finding
thật sự nào. Gemini báo 2 finding "sót tiếng Anh 'and'" ở `b3-l3-c4`
và `b3-l4-c8` nhưng **đã đối chiếu lại file thật: sai cả hai — nội
dung đã viết đúng "và" bằng tiếng Việt, không có "and"** — false
positive (giống trường hợp `a9-l2-c9`, `a10-l5-c9`, `b2-l5-c7` đã gặp
ở các unit trước). Gemini cũng góp ý nhỏ về văn phong ở `b3-l5-c5`
("cho" → "ta được") — chỉ là gợi ý văn phong, không sai ngữ pháp,
không bắt buộc sửa.

Điểm nổi bật (không có vấn đề): `b3-l1-c10` hiệu suất lên men
glucozơ; `b3-l2-c4` HCOOH có phản ứng tráng gương (do còn nhóm -CHO)
— điểm phân biệt quan trọng với các axit cacboxylic khác; `b3-l3-c9`
gộp 2 nguồn nguyên liệu (etilen + glucozơ) cùng tạo rượu etylic;
`b3-l4-c5` bảo toàn khối lượng xà phòng hoá (đã kiểm tra số liệu ví
dụ 17,8+2,4-1,84=18,36 g, khớp); `b3-l5-c5` quy tắc đường chéo cho độ
rượu (đã kiểm tra công thức, khớp).

---

## b4-l1 → b4-l6 (unit b4-gluxit-protein-polime)

Đã kiểm tra riêng: **không có thẻ nào dùng 24,79 L/mol**. Không sót
tiếng Anh thật sự (đã tự đối chiếu, không lặp lại kiểu false positive
"and"/"if" như các unit trước).

- **b4-l1** (thẻ `c5` trong số các thẻ mở rộng): 1 finding CẦN SỬA
  (định dạng, nhỏ, đã đối chiếu đúng với file):
  - **`b4-l1-c5`** (Nâng cao: CO2 sinh ra từ lên men tác dụng với
    dung dịch kiềm) — phép tính "2x0,30" thiếu khoảng trắng quanh
    dấu nhân (không nhất quán với cách viết "2 x 0,30" có khoảng
    trắng dùng ở phần lớn thẻ khác trong dự án). Đề xuất sửa: "2x0,30"
    → "2 x 0,30". Không phải lỗi hoá học/số liệu (kết quả 0,10 mol
    vẫn đúng).
  - Các thẻ mở rộng khác của `b4-l1` không có finding.
- **b4-l2..b4-l5**: không phát hiện finding hoá học/thuật ngữ nghiêm
  trọng (2 thuật ngữ hơi cao — "liên kết glicozit" ở `b4-l2-c2` và
  "phương pháp Kjeldahl" ở `b4-l4-c7" — Gemini đánh giá chấp nhận
  được như thông tin bổ trợ, không cần sửa).
- **b4-l6** (thẻ `c4`, `c5`): 1 finding CẦN SỬA quan trọng (lỗi chính
  tả thật, lặp lại nhiều lần, đã đối chiếu đúng với file — đếm được
  ít nhất 8 chỗ trong 2 thẻ này):
  - **`b4-l6-c4`, `b4-l6-c5`** (Nâng cao: Độ rượu và quy đổi; Pha
    trộn hai dung dịch rượu khác độ) — **CẦN SỬA (lỗi chính tả, thiếu
    dấu)**. Từ "**độ**" (đơn vị độ rượu) bị gõ thiếu dấu thành "**do**"
    lặp lại nhiều lần: "đơn vị 'do'", "độ rượu a do", "rượu 46 do",
    "rượu 60 do", "rượu 20 do", "rượu 40 do"... "do" (không dấu) là
    một từ khác nghĩa trong tiếng Việt (giới từ "do", như "do đó"),
    gây khó đọc/sai chính tả rõ ràng. Đề xuất sửa: thay toàn bộ "do"
    (khi đứng sau số chỉ độ rượu) thành "độ" trong cả 2 thẻ.
  - Công thức "V1(a-c) = V2(c-b)" ở `b4-l6-c5`: Gemini có nêu "thiếu
    dấu nhân" nhưng **cách viết biến số liền dấu ngoặc là ký hiệu đại
    số chuẩn (V1 nhân (a-c)), không mơ hồ như "n nX" đã gặp ở
    `b2-l6-c6`** — không cần sửa.

**Ghi chú follow-up ngoài phạm vi FEATURE-012** (phát hiện khi Bước 2
xử lý unit B4, KHÔNG sửa trong feature này vì đụng tới `questions` —
plan mục 5 "Out of scope" nêu rõ "không đổi câu hỏi"): cùng lỗi "do"
thiếu dấu (phải là "độ") còn xuất hiện ở 2 câu hỏi CŨ, không thuộc
diff Phase A — `b4-l6-q12` ("rượu 46 do") và `b4-l6-q13` ("rượu 40
do"). Nên sửa trong một thay đổi nhỏ riêng, ngoài phạm vi FEATURE-012.

---

## b5-l1 → b5-l3 (unit b5-tong-hop-huu-co)

Đã kiểm tra riêng: **không có thẻ nào dùng 24,79 L/mol**. Đây là unit
có finding **nghiêm trọng nhất trong toàn bộ Phase B** — 1 lỗi kiến
thức hoá học thật sự (không phải chỉ thuật ngữ/chính tả), đã đối
chiếu đúng với file:

- **`b5-l3-c2`** (Dạng câu ghép nhiều phát biểu) — **SAI, CẦN SỬA
  (lỗi hoá học thật)**. Nội dung hiện tại: _"'PVC được trùng hợp trực
  tiếp từ etilen' là sai, vì monome của PVC là vinyl clorua CH2=CHCl,
  chỉ điều chế gián tiếp **từ C2H2 hoặc C2H4** qua một bước cộng HCl
  trước khi trùng hợp."_ Vế "hoặc C2H4" **sai**: C2H4 + HCl chỉ tạo
  etyl clorua C2H5Cl (ankyl halogenua no, cộng vào liên kết đôi duy
  nhất sẽ no hoá hoàn toàn), không thể tạo vinyl clorua CH2=CHCl bằng
  một bước cộng HCl. Vinyl clorua chỉ tạo trực tiếp bằng cộng HCl vào
  C2H2 (giữ lại 1 liên kết đôi); từ C2H4 muốn ra vinyl clorua phải
  qua quy trình nhiều bước khác (clo hoá tạo đicloetan rồi tách HCl),
  không phải "một bước cộng HCl". Đề xuất sửa: bỏ nhánh "hoặc C2H4",
  chỉ giữ "chỉ điều chế gián tiếp từ C2H2 qua một bước cộng HCl trước
  khi trùng hợp."

Các finding khác (nhẹ hơn, thuật ngữ/độ chặt chẽ diễn đạt):

- **b5-l1** (6 thẻ `c4..c9`): đa số ĐÚNG. 3 finding CẦN SỬA:
  - **`b5-l1-c4`, `c5`** — dùng "liên kết pi", "ankin", "anđehit" như
    danh pháp đã biết — thuật ngữ "liên kết pi" hơi vượt phạm vi
    (tương tự các unit B khác), đề xuất đổi "độ bất bão hoà (số liên
    kết pi + số vòng)" → "độ không no (số liên kết đôi/ba + số
    vòng)". Không phải lỗi sai, chỉ là mức độ thuật ngữ.
  - **`b5-l1-c9`** — câu "axit hai chức thì số O phải chia hết cho 2...
    không thể chọn công thức chỉ có một O" — đúng nhưng **chưa đủ
    chặt chẽ**: chỉ loại được O=1, chưa loại rõ O=2 (axit 2 chức với
    2 nhóm COOH cần tối thiểu 4 O, không phải chỉ "chia hết cho 2").
    Đề xuất sửa rõ thành "phải có ít nhất 4 nguyên tử O (ứng với 2
    nhóm COOH), không thể chọn công thức chỉ có 1 hoặc 2 nguyên tử
    O".
  - Còn lại (`c6..c8`) ĐÚNG.
- **b5-l2** (7 thẻ `c1..c7`): **ĐÚNG 100%** về hoá học. 1 góp ý nhỏ
  không bắt buộc: `c4` dùng "->" một chiều để viết riêng 2 phương
  trình thuận/nghịch (thay vì "<=>") — cách trình bày chấp nhận được,
  không sai, có thể cân nhắc đổi sang "<=>" cho chuẩn hơn nhưng không
  bắt buộc.
- **b5-l3** (7 thẻ `c1..c7`, trừ `c2` đã nêu lỗi ở trên): ĐÚNG. Điểm
  nổi bật: `c4` mO=mhh-mC-mH cho hỗn hợp tạp chức; `c6` hỗn hợp axit+
  este cùng tác dụng NaOH (đã kiểm tra hệ phương trình, khớp a=0,2
  b=0,1).
