# FEATURE-012: Đào sâu nội dung lý thuyết nâng cao theo từng bài học

## Status

- Status: APPROVED <!-- DRAFT | APPROVED | SUPERSEDED -->
- Owner: Claude Code
- Approved by: tuann2
- Approved date: 2026-07-10

## 1. Objective

Bổ sung kiến thức nâng cao (mức HSG cấp huyện/tỉnh) vào thẻ lý thuyết
của mỗi bài học (81 bài `available` trên 17 unit), do Codex (model
`gpt-5.6-terra`) và Gemini (`agy`) cùng nghiên cứu, Claude tổng hợp — xử lý
**tuần tự từng bài một**, không xử lý hàng loạt, để đảm bảo nội dung
được đào sâu, chính xác và không bị lặp/generic. Số thẻ mỗi bài không
cố định 3 — tuỳ độ dài/số chủ đề nâng cao mà mở rộng `body` thẻ có sẵn
hoặc thêm thẻ mới (tối đa 25 thẻ/bài, xem mục 3).

## 2. Current system analysis

- Mỗi bài học hiện có `lesson.cards: {id, heading, body}[]`; ban đầu
  quy ước ở `CLAUDE.md` §Content authoring rules ghi cứng "3 thẻ lý
  thuyết", và `src/lib/contentValidation.ts` (dòng ~131–137) chặn cứng
  `cards.length > 5`. `TheoryCard.tsx`/`LessonPlayer.tsx` đều lấy
  `total = lesson.cards.length` động nên không cần đổi UI. Sau 2 lần
  điều chỉnh theo yêu cầu người dùng (đầu tiên bỏ ràng buộc "luôn 3
  thẻ" → 1–5 thẻ tuỳ nội dung; sau đó nâng trần lên 1–25) —
  `contentValidation.ts` đã sửa để chặn ở `> 25` thay vì `> 5`.
  `CLAUDE.md` đã cập nhật theo đúng giới hạn mới.
- Sau FEATURE-011, mỗi câu hỏi có `category: 'theory' | 'calculation'`
  — 641 câu theory / 412 câu calculation trên 1053 câu. Nhiệm vụ này
  **không đổi câu hỏi**, chỉ đổi `cards` (mở rộng `body` thẻ có sẵn
  hoặc thêm thẻ mới).
- Danh sách 81 bài available, đúng thứ tự xử lý A1→A12 rồi B1→B5, đã
  liệt kê đầy đủ ở mục 4 (checklist tracking).
- Công cụ đã có sẵn trong dự án (theo `CLAUDE.md` §Agent delegation):
  - `codex:codex-rescue` — cần chỉ định `--model gpt-5.6-terra`. Ban
    đầu (10/07) cache model chỉ thấy tới `gpt-5.5`, không có "5.6";
    sau khi cache CLI tự làm mới (11/07), họ `gpt-5.6` (sol/terra/
    luna) xuất hiện — đã đổi từ `gpt-5.5` (dùng cho 9 bài A1) sang
    `gpt-5.6-terra` theo lựa chọn của người dùng cho các bài từ A2 trở
    đi. Xác nhận hoạt động qua `codex exec -m gpt-5.6-terra`.
  - `agy --model "Gemini 3.5 Flash (High)"` — dùng để nghiên cứu độc
    lập + fact-check, chạy đồng bộ (không background).
- `scripts/validate-content.ts` hiện chỉ kiểm tra shape JSON (số thẻ,
  số câu, trường bắt buộc...), không kiểm tra tính đúng đắn hoá học
  của nội dung mở rộng — việc đó do con người (Claude + Gemini
  cross-check) đảm nhiệm.

## 3. Assumptions (đã chốt với người dùng 2026-07-10)

- **Hình thức bổ sung (đã điều chỉnh 2026-07-10 sau đợt thí điểm)**:
  không còn cố định giữ đúng 3 thẻ. Số thẻ mỗi bài dao động 1–25 (giới
  hạn cứng của schema, xem `src/lib/contentValidation.ts`) tuỳ độ dài
  và số chủ đề nâng cao thực sự cần thêm. Khi một mảng kiến thức nâng
  cao đủ dài/độc lập (ví dụ một kĩ thuật biện luận riêng), **tách
  thành thẻ mới** (heading dạng "Nâng cao: ...") thay vì nhồi thêm vào
  cuối một thẻ cơ bản đã có — chỉ nhồi thêm vào thẻ cũ khi phần bổ
  sung ngắn, thực sự thuộc cùng chủ đề với thẻ đó. `CLAUDE.md` §Content
  authoring rules đã cập nhật theo quy tắc này.
- **Thứ tự xử lý**: Vô cơ trước (A1→A12), rồi Hữu cơ (B1→B5), đúng thứ
  tự chương trình.
- **Model Codex**: `gpt-5.6-terra` cho cả hai vai trò Codex, khác nhau
  ở effort — Bước 1 (nghiên cứu/soạn ứng viên) dùng effort `medium`;
  Bước 3 (chọn lọc + viết thẻ cuối, giao cho Codex thay Claude từ bài
  A2) dùng effort `high`. Đổi từ `gpt-5.5` sau khi cache model CLI tự
  làm mới ngày 11/07 và lộ ra họ `gpt-5.6`. 9 bài A1 đã soạn bằng
  `gpt-5.5` mặc định với Claude tự chọn lọc, không cần chạy lại.
- **Xử lý tuần tự từng bài** (không batch song song nhiều bài), để mỗi
  bài được nghiên cứu/viết đủ sâu thay vì lướt nhanh cho đủ số lượng.
- **Phạm vi nâng cao = mức HSG cấp huyện/tỉnh**, nhất quán với quy ước
  đã có cho câu hỏi HSG trong `CLAUDE.md` — không vượt xa chương trình
  Hoá 8/9 sang kiến thức THPT không cần thiết.
- Không đổi câu hỏi, không đổi đáp án/lời giải — chỉ đổi `cards` (mở
  rộng `body` thẻ có sẵn hoặc thêm thẻ mới). Nếu trong lúc mở rộng
  phát hiện thẻ cũ có lỗi/thiếu, được sửa kèm nhưng phải ghi rõ trong
  commit message.
- Vì đây là **sửa nội dung đã duyệt trước đây** (rủi ro cao hơn thêm
  mới), mỗi bài vẫn qua đủ 3 lớp: Codex soạn → Gemini fact-check độc
  lập → Codex chọn lọc/viết thẻ cuối (từ A2 trở đi, effort `high`) —
  nhưng Claude **không** tự đọc kỹ từng diff/đối chiếu hoá học mỗi bài
  nữa (khác 9 bài A1 đầu). Rà soát sâu dồn vào **một lần duy nhất sau
  khi cả 81 bài xong** (xem "Rà soát cuối cùng" ở mục 6).

## 4. Scope — Checklist tracking 81 bài (theo thứ tự xử lý)

Đánh dấu `[x]` khi bài đã hoàn thành đủ chu trình (Codex soạn + Gemini
fact-check + Codex chọn lọc/viết thẻ + Codex tự validate-content +
Claude xác nhận phạm vi + commit). File này là nguồn theo dõi tiến độ
duy nhất — cập nhật ngay sau mỗi bài, không đợi
xong cả unit.

### A1 · Nền tảng hoá học (`a1-nen-tang-hoa-hoc`)

- [x] `a1-l1` — Chất – hỗn hợp – tách chất; nguyên tử, p – n – e
- [x] `a1-l2` — Nguyên tố hoá học – nguyên tử khối; sơ lược bảng tuần hoàn
- [x] `a1-l3` — Đơn chất – hợp chất – phân tử; CTHH và ý nghĩa
- [x] `a1-l4` — Hoá trị; lập CTHH theo hoá trị
- [x] `a1-l5` — Phản ứng hoá học; định luật bảo toàn khối lượng; cân bằng PTHH
- [x] `a1-l6` — Mol – khối lượng mol – thể tích mol khí; tỉ khối chất khí
- [x] `a1-l7` — Tính theo CTHH và PTHH: %m, chất dư – chất hết, hiệu suất
- [x] `a1-l8` — Nâng cao: biện luận tìm nguyên tố/CTHH; cân bằng phản ứng phức tạp
- [x] `a1-l9` — Nâng cao: bài toán hỗn hợp; tăng – giảm khối lượng; bảo toàn

### A2 · Oxi – Không khí (`a2-oxi-khong-khi`)

- [x] `a2-l1` — Tính chất – điều chế oxi; phản ứng hoá hợp, phân huỷ
- [ ] `a2-l2` — Oxit: phân loại, gọi tên (mở đầu)
- [ ] `a2-l3` — Không khí – sự cháy; nâng cao: bài toán đốt cháy hỗn hợp

### A3 · Hiđro – Nước (`a3-hidro-nuoc`)

- [ ] `a3-l1` — Tính chất – điều chế hiđro; phản ứng thế; khử oxit kim loại
- [ ] `a3-l2` — Nước: tính chất; phản ứng với kim loại/oxit
- [ ] `a3-l3` — Axit – bazơ – muối: định nghĩa, phân loại, gọi tên (mở đầu)
- [ ] `a3-l4` — Nâng cao: khử hỗn hợp oxit, bài toán H2 + oxit kim loại

### A4 · Dung dịch (`a4-dung-dich`)

- [ ] `a4-l1` — Độ tan; các yếu tố ảnh hưởng
- [ ] `a4-l2` — Nồng độ % và nồng độ mol; chuyển đổi
- [ ] `a4-l3` — Pha chế – pha loãng dung dịch; quy tắc đường chéo
- [ ] `a4-l4` — Nâng cao: tinh thể ngậm nước; bài toán kết tinh
- [ ] `a4-l5` — Nâng cao: bài toán dung dịch tổng hợp

### A5 · Oxit (`a5-oxit`)

- [ ] `a5-l1` — Phân loại oxit và gọi tên
- [ ] `a5-l2` — Tính chất hoá học của oxit bazơ; CaO – vôi
- [ ] `a5-l3` — Tính chất hoá học của oxit axit; SO2
- [ ] `a5-l4` — Nâng cao: oxit lưỡng tính; bài toán oxit + axit/kiềm

### A6 · Axit (`a6-axit`)

- [ ] `a6-l1` — Tính chất hoá học chung của axit
- [ ] `a6-l2` — Axit clohiđric HCl
- [ ] `a6-l3` — Axit sunfuric: loãng và đặc
- [ ] `a6-l4` — Nâng cao: axit tác dụng kim loại và muối
- [ ] `a6-l5` — Nâng cao: bài toán hỗn hợp axit, axit đặc – loãng

### A7 · Bazơ (`a7-bazo`)

- [ ] `a7-l1` — Tính chất hoá học chung của bazơ; bazơ tan và không tan
- [ ] `a7-l2` — Natri hiđroxit NaOH; điều chế
- [ ] `a7-l3` — Canxi hiđroxit Ca(OH)2; ứng dụng
- [ ] `a7-l4` — Nâng cao: CO2/SO2 tác dụng với dung dịch kiềm
- [ ] `a7-l5` — Nâng cao: hiđroxit lưỡng tính Al(OH)3, Zn(OH)2

### A8 · Muối – Phân bón hoá học (`a8-muoi-phan-bon`)

- [ ] `a8-l1` — Tính chất hoá học của muối; phản ứng trao đổi
- [ ] `a8-l2` — Một số muối quan trọng: NaCl, KNO3, muối cacbonat
- [ ] `a8-l3` — Muối axit và muối trung hoà; chuyển đổi qua lại
- [ ] `a8-l4` — Phân bón hoá học
- [ ] `a8-l5` — Nâng cao: bài toán muối + muối/axit/kiềm

### A9 · Mối quan hệ giữa các hợp chất vô cơ (`a9-moi-quan-he-hop-chat-vo-co`)

- [ ] `a9-l1` — Sơ đồ mối quan hệ oxit – axit – bazơ – muối
- [ ] `a9-l2` — Chuỗi phản ứng vô cơ; điều chế nhiều bước
- [ ] `a9-l3` — Nâng cao: nhận biết – tách – tinh chế chất vô cơ
- [ ] `a9-l4` — Nâng cao: bài tập tổng hợp 4 loại hợp chất

### A10 · Kim loại (`a10-kim-loai`)

- [ ] `a10-l1` — Tính chất chung; dãy hoạt động hoá học
- [ ] `a10-l2` — Nhôm; sắt; hợp kim gang – thép
- [ ] `a10-l3` — Ăn mòn kim loại và bảo vệ
- [ ] `a10-l4` — Nâng cao: kim loại + dung dịch muối (biện luận)
- [ ] `a10-l5` — Nâng cao: hỗn hợp kim loại + axit; chất dư

### A11 · Phi kim (`a11-phi-kim`)

- [ ] `a11-l1` — Tính chất chung của phi kim
- [ ] `a11-l2` — Clo; điều chế và ứng dụng; nước Gia-ven, clorua vôi
- [ ] `a11-l3` — Cacbon và các oxit của cacbon; muối cacbonat
- [ ] `a11-l4` — Silic – công nghiệp silicat
- [ ] `a11-l5` — Nâng cao: CO khử oxit; muối cacbonat + axit

### A12 · Chuyên đề tổng hợp Vô cơ (`a12-tong-hop-vo-co`)

- [ ] `a12-l1` — Chuỗi phản ứng – điều chế nhiều bước
- [ ] `a12-l2` — Nhận biết không giới hạn/giới hạn thuốc thử; tách chất
- [ ] `a12-l3` — Bài tập biện luận theo điều kiện
- [ ] `a12-l4` — Đề tổng hợp vô cơ theo cấu trúc đề thi chuyên

### B1 · Đại cương về hợp chất hữu cơ (`b1-dai-cuong-huu-co`)

- [ ] `b1-l1` — Khái niệm; phân loại hiđrocacbon/dẫn xuất
- [ ] `b1-l2` — Cấu tạo phân tử hợp chất hữu cơ; CTCT
- [ ] `b1-l3` — Nâng cao: lập CTPT từ % khối lượng, sản phẩm đốt cháy

### B2 · Hiđrocacbon – Nhiên liệu (`b2-hidrocacbon-nhien-lieu`)

- [ ] `b2-l1` — Metan: cấu tạo, phản ứng thế
- [ ] `b2-l2` — Etilen: liên kết đôi, phản ứng cộng, trùng hợp
- [ ] `b2-l3` — Axetilen: liên kết ba, phản ứng cộng; điều chế
- [ ] `b2-l4` — Benzen: cấu tạo vòng, thế/cộng
- [ ] `b2-l5` — Dầu mỏ – khí thiên nhiên – nhiên liệu
- [ ] `b2-l6` — Nâng cao: bài toán đốt cháy hiđrocacbon, hỗn hợp khí

### B3 · Dẫn xuất chứa oxi (`b3-dan-xuat-chua-oxi`)

- [ ] `b3-l1` — Rượu etylic: cấu tạo, tính chất, độ rượu
- [ ] `b3-l2` — Axit axetic: tính chất axit, phản ứng este hoá
- [ ] `b3-l3` — Mối liên hệ etilen – rượu etylic – axit axetic
- [ ] `b3-l4` — Chất béo; xà phòng hoá
- [ ] `b3-l5` — Nâng cao: hiệu suất este hoá/lên men; bài toán độ rượu

### B4 · Gluxit – Protein – Polime (`b4-gluxit-protein-polime`)

- [ ] `b4-l1` — Glucozơ; phản ứng tráng gương; lên men
- [ ] `b4-l2` — Saccarozơ; thuỷ phân
- [ ] `b4-l3` — Tinh bột và xenlulozơ
- [ ] `b4-l4` — Protein
- [ ] `b4-l5` — Polime – chất dẻo, tơ, cao su
- [ ] `b4-l6` — Nâng cao: chuỗi chuyển hoá gluxit; bài toán lên men – hiệu suất nhiều giai đoạn

### B5 · Chuyên đề tổng hợp Hữu cơ (`b5-tong-hop-huu-co`)

- [ ] `b5-l1` — Biện luận công thức phân tử hợp chất hữu cơ
- [ ] `b5-l2` — Chuỗi phản ứng hữu cơ; nhận biết chất hữu cơ
- [ ] `b5-l3` — Đề tổng hợp hữu cơ theo cấu trúc đề thi chuyên

## 5. Out of scope

- Không thêm/bớt số lượng thẻ lý thuyết (giữ đúng 3/bài).
- Không đổi câu hỏi, đáp án, lời giải, `category` đã gắn ở FEATURE-011.
- Không đổi cấu trúc schema `TheoryCard` (`{id, heading, body}`).
- Không đổi các bài `status: 'coming-soon'` (chưa biên soạn, ngoài
  phạm vi 81 bài available).
- Không tự động hoá hoàn toàn không giám sát — mỗi bài vẫn qua Claude
  đọc lại trước khi commit (không giao phó 100% cho agent).

## 6. Proposed design — quy trình 1 bài học (đã đổi 11/07: Codex viết thẳng, Claude chỉ điều phối)

**Thay đổi quan trọng so với 9 bài A1 đầu tiên**: từ bài A2 trở đi,
bước "chọn lọc + viết thẻ cuối" (trước đây Claude tự đọc từng ứng
viên và gõ lại) được **giao cho Codex** để giảm token/thời gian của
Claude. Vẫn giữ đủ 3 vai trò (Codex nghiên cứu → Gemini fact-check →
chọn lọc/viết thẻ cuối), chỉ đổi ai làm vai trò thứ 3. Claude giờ chỉ
**điều phối** (gửi task, chờ, xác nhận hoàn thành, cập nhật checklist,
commit) — KHÔNG tự đọc/viết lại nội dung thẻ mỗi bài nữa, và KHÔNG rà
soát sâu (đọc kỹ diff, tự kiểm tra hoá học) sau mỗi bài. Việc rà soát
sâu dồn lại làm **một lần duy nhất sau khi cả 81 bài đã xong** (xem
"Rà soát cuối cùng" bên dưới).

### Bước 1 — Codex nghiên cứu/soạn ứng viên (model `gpt-5.6-terra`, effort `medium`)

```
Agent(subagent_type="codex:codex-rescue",
      prompt="--cwd /data/Projects/Hoa_hoc_THCS --write --model gpt-5.6-terra
              --effort medium
              <task: nghiên cứu và soạn CÀNG NHIỀU kiến thức nâng cao
              càng tốt cho lesson <id>, viết ra file nháp riêng trước>")
```

Yêu cầu như cũ: đọc thẻ + câu hỏi hiện có để không lặp/mâu thuẫn; viết
thoải mái không tự giới hạn số lượng (kiến thức hoá học là tri thức
phổ thông, không bản quyền, nhưng phải viết lại bằng lời văn riêng);
ghi ra file nháp `/tmp/feature-012-draft-<lesson-id>.json` (mảng
`{suggestedHeading, body, relatedBaseCard, standalone}`); KHÔNG chạm
`content/units/*.json` ở bước này.

### Bước 2 — Gemini fact-check độc lập

```bash
agy --model "Gemini 3.5 Flash (High)" \
    --add-dir /data/Projects/Hoa_hoc_THCS \
    -p "Fact-check TOÀN BỘ ứng viên trong file nháp
        /tmp/feature-012-draft-<lesson-id>.json cho bài <id>, đối
        chiếu chương trình Hoá 8/9 và đề thi HSG cấp huyện/tỉnh Việt
        Nam. CHỈ BÁO CÁO — không tự sửa file. Với mỗi ứng viên: ĐÚNG/
        SAI/CẦN SỬA kèm lý do cụ thể nếu có vấn đề."
```

Nếu file nháp quá dài (>15 ứng viên), chia theo `relatedBaseCard`
thành 2-3 lần gọi để tránh treo (đã có tiền lệ ở 9 bài A1). Lưu output
text của Gemini lại (không cần file riêng, giữ trong ngữ cảnh điều
phối) để chuyển cho Codex ở Bước 3.

### Bước 3 — Codex chọn lọc + viết thẻ cuối (model `gpt-5.6-terra`, effort `high`)

```
Agent(subagent_type="codex:codex-rescue",
      prompt="--cwd /data/Projects/Hoa_hoc_THCS --write --model gpt-5.6-terra
              --effort high
              <task: đọc file nháp /tmp/feature-012-draft-<lesson-id>.json
              + báo cáo fact-check của Gemini (dán kèm trong prompt),
              chọn lọc và ghi thẳng vào content/units/<file>.json>")
```

Yêu cầu cụ thể trong prompt:

- Dán nguyên văn báo cáo fact-check của Gemini vào prompt (Codex không
  tự gọi Gemini).
- Loại bỏ ứng viên bị Gemini chỉ SAI không sửa được đơn giản; tự sửa
  lỗi nhỏ (CẦN SỬA) theo đúng ghi chú trước khi dùng.
- Gộp ý trùng lặp, ưu tiên nội dung khớp trực tiếp câu hỏi HSG có sẵn
  trong bài, tránh nhồi hết mọi ứng viên nếu trùng ý — mục tiêu khoảng
  **5–8 thẻ nâng cao/bài** (linh hoạt theo độ phong phú thật của nội
  dung, không ép cứng).
- Áp dụng đúng quy tắc format thẻ: chủ đề ngắn/cùng mạch → nối vào
  cuối `body` thẻ cơ bản liên quan; chủ đề dài/kĩ thuật riêng → thẻ
  mới `heading` dạng "Nâng cao: ...". Tổng số thẻ (gốc + mới) không
  vượt 25 (trần schema).
- Nếu ứng viên đã fact-check ĐÚNG nhưng không được chọn (trùng ý, hoặc
  vượt trần), ghi vào `docs/content-reserve/<lesson-id>.md` theo đúng
  format đã dùng ở các bài A1 (xem file mẫu `docs/content-reserve/
a1-l1.md`) — không xoá bỏ.
- KHÔNG áp dụng đề xuất đổi đktc/22,4 → đkc/24,79 nếu Gemini gợi ý
  (toàn app dùng nhất quán đktc/22,4).
- Không đổi `questions`, `id`/`heading` thẻ cơ bản, không đổi lesson
  khác trong cùng file.
- Tự chạy `npm run validate-content && npx prettier --write
content/units/<file>.json` và sửa lỗi nếu có trước khi báo hoàn
  thành. Xoá file nháp sau khi xử lý xong.
- Báo cáo ngắn gọn: số thẻ cuối cùng, có tạo file dự trữ hay không.

### Bước 4 — Claude điều phối: xác nhận + commit (KHÔNG đọc sâu)

- Xác nhận task Codex báo thành công + `git status --short` chỉ đổi
  đúng file/lesson dự kiến (không lan sang bài/unit khác) — đây là
  kiểm tra phạm vi nhẹ, không phải đọc nội dung.
- Cập nhật checklist mục 4 (đánh dấu `[x]`).
- Commit 1 bài/1 commit (dễ revert), message ngắn gọn nêu số thẻ cuối
  và có/không file dự trữ — KHÔNG cần liệt kê chi tiết nội dung từng
  thẻ như các bài A1 trước đó (giảm tải, để dành chi tiết cho lúc rà
  soát cuối).
- KHÔNG tự chạy lại `npm test/lint/typecheck` sau mỗi bài (đã do Codex
  tự chạy validate-content) — việc này dồn vào rà soát cuối cùng.

### Rà soát cuối cùng (sau khi CẢ 81 bài đã commit)

- Đọc lại toàn bộ diff tích luỹ (`git diff main...feature/FEATURE-012`
  cho `content/units/`) — không cần đọc từng bài riêng lẻ nhưng phải
  lướt qua toàn bộ để bắt lỗi rõ ràng (định dạng, thẻ trống, lặp lộ
  liễu).
- Chạy đầy đủ một lần: `npm run validate-content && npm test && npm
run lint && npm run typecheck && npm run format:check`.
- Chạy Gemini spot-check một mẫu ngẫu nhiên (ví dụ 8-10 bài rải đều
  Vô cơ/Hữu cơ) để kiểm tra lại chất lượng tổng thể của quy trình mới
  (Codex tự chọn lọc thay Claude) — nếu phát hiện vấn đề hệ thống, cân
  nhắc rà soát thêm các bài cùng loại.
- Sửa các lỗi phát hiện được, chạy `npm run dev` thử một vài bài trên
  UI thật để chắc chắn không vỡ layout.
- Chỉ sau bước này mới coi FEATURE-012 hoàn thành, sẵn sàng push/PR.

### Vận hành ở quy mô 81 bài

- File plan này (đặc biệt checklist mục 4) là nguồn trạng thái bền
  vững — phiên sau đọc lại đúng chỗ đang dang dở.
- Chạy tuần tự từng bài (không song song nhiều bài trong cùng file để
  tránh xung đột ghi), nhưng KHÔNG dừng hỏi lại người dùng giữa các
  bài — chỉ dừng nếu Codex báo lỗi không tự xử lý được, hoặc phát hiện
  vấn đề hệ thống ở bước rà soát cuối.

## 6a. New technology

Không có — không thêm dependency, service hay infra mới. `--model
gpt-5.5` là tham số của Codex CLI đã cài, không phải công nghệ mới.

## 7. Files to create

- `docs/content-reserve/<lesson-id>.md` — chỉ tạo khi một bài có
  nhiều hơn 25 thẻ ứng viên đã fact-check; lưu phần nội dung nâng cao
  đã xác minh đúng nhưng không được chọn vào bài (do vượt trần 25),
  kèm ghi chú ngắn lý do. Không tạo trước cho tất cả 81 bài — chỉ tạo
  khi thực sự phát sinh.
- `docs/content-reserve/README.md` — mục lục ngắn các file dự trữ đã
  tạo (nếu có), để dễ tra cứu sau này. Tạo lần đầu khi có file dự trữ
  đầu tiên.

## 8. Files to modify

- `content/units/*.json` (tối đa 17 file, thay đổi dần theo tiến độ
  81 bài) — chỉ đổi `cards` (mở rộng `body` thẻ có sẵn hoặc thêm thẻ
  mới).
- `docs/plans/FEATURE-012.md` (cập nhật checklist sau mỗi bài).

## 9. API and database impact

Không có — chỉ sửa nội dung tĩnh trong `content/units/*.json`, không
đổi schema, không đổi API/DB.

## 10. Implementation steps

1. Tạo nhánh `feature/FEATURE-012` từ `main`.
2. Thí điểm 3 bài đầu (`a1-l1`, `a1-l2`, `a1-l3`) theo quy trình mục 6,
   trình bày kết quả cho người dùng xác nhận chất lượng.
3. Sau xác nhận: tiếp tục tuần tự hết A1 (`a1-l4`…`a1-l9`), rồi A2…A12,
   B1…B5 theo đúng checklist.
4. Sau mỗi bài: cập nhật checklist, chạy validate-content, commit.
5. Sau mỗi vài bài (ví dụ hết 1 unit): chạy lại toàn bộ
   `npm test && npm run lint && npm run typecheck && npm run
format:check` để chắc chắn không phá vỡ gì ở tầng UI/test (dù chỉ
   sửa nội dung, `LessonPlayer`/`TheoryCard` render `body` trực tiếp
   nên text quá dài hoặc ký tự lạ có thể ảnh hưởng hiển thị — cần mắt
   người xem thử qua `npm run dev` định kỳ, không chỉ dựa vào test).
6. Khi xong toàn bộ 81 bài: chạy validation đầy đủ một lần cuối, tổng
   kết số bài đã sửa, xin xác nhận trước khi push/mở PR.

## 11. Test strategy

- `npm run validate-content` sau mỗi bài (bắt lỗi schema JSON).
- `npx prettier --check` sau mỗi bài (giữ format nhất quán).
- Định kỳ (mỗi unit) chạy `npm run dev`, mở thử 1-2 bài đã sửa trên
  UI thật để xem thẻ hiển thị ổn (không tràn, không vỡ layout với
  text dài hơn).
- Không cần thêm test tự động mới — đây là thay đổi nội dung tĩnh,
  không đổi logic/component.

## 12. Security considerations

Không có rủi ro bảo mật — thay đổi nội dung JSON tĩnh, không có input
người dùng, không đổi luồng auth/API.

## 13. Risks

| Risk                                                                                  | Impact                                          | Mitigation                                                                                                                     |
| ------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Nội dung nâng cao sai kiến thức hoá học (phương trình sai, khái niệm sai)             | Cao — ảnh hưởng trực tiếp việc học của học sinh | 3 lớp kiểm định bắt buộc mỗi bài: Codex soạn → Gemini fact-check độc lập → Claude đọc lại + kiểm tra thủ công trước khi commit |
| Nội dung nâng cao vượt quá phạm vi HSG THCS (lấn sang kiến thức THPT không cần thiết) | Trung bình                                      | Giới hạn rõ trong prompt: mức HSG cấp huyện/tỉnh, nhất quán quy ước `source` đã có cho câu hỏi HSG                             |
| Thẻ quá dài, vỡ layout di động                                                        | Thấp                                            | Giới hạn độ dài tăng thêm trong prompt (60–120%); kiểm tra UI định kỳ qua `npm run dev`                                        |
| Khối lượng 81 bài kéo dài nhiều phiên, dễ mất dấu tiến độ                             | Trung bình                                      | Checklist trong chính file plan này là nguồn trạng thái bền vững, cập nhật ngay sau mỗi bài                                    |
| `agy` treo với prompt phức tạp (đã ghi nhận trong bộ nhớ dự án)                       | Thấp                                            | Giữ prompt Gemini gọn, một nhiệm vụ rõ ràng mỗi lần gọi, không gộp nhiều bài                                                   |

## 14. Rollback plan

Mỗi bài học là một commit riêng trên nhánh `feature/FEATURE-012` —
revert commit tương ứng nếu phát hiện lỗi ở một bài cụ thể, không ảnh
hưởng các bài khác. Chưa merge `main` cho tới khi được xác nhận.

## 15. Acceptance criteria

- [ ] Toàn bộ 81 bài trong checklist mục 4 được đánh dấu hoàn thành.
- [ ] Mỗi bài có nội dung nâng cao đã qua Gemini fact-check, không còn
      vấn đề hoá học chưa xử lý.
- [ ] `npm run validate-content && npm test && npm run lint && npm run
typecheck && npm run format:check` pass ở lần chạy cuối.
- [ ] Không thẻ nào vượt quá độ dài hợp lý cho hiển thị di động (kiểm
      tra thủ công qua `npm run dev`).
- [ ] Không có thay đổi ngoài phạm vi `cards[].body` trong
      `content/units/*.json`.
