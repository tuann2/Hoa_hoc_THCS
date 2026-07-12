# FEATURE-012: Đào sâu nội dung lý thuyết nâng cao theo từng bài học

## Status

- Status: APPROVED <!-- DRAFT | APPROVED | SUPERSEDED -->
- Owner: Claude Code
- Approved by: tuann2
- Approved date: 2026-07-10
- Workflow revision (2026-07-11): mục 6 cập nhật theo
  `docs/architecture/AI_WORKFLOW_ARCHITECTURE.md` v2.1 — mục tiêu,
  phạm vi (mục 1–5) và yêu cầu nghiệp vụ giữ nguyên, không đổi. Chờ
  người dùng duyệt lại riêng phần workflow trước khi áp dụng cho các
  bài còn lại.
- Workflow revision (2026-07-12, do người dùng yêu cầu trực tiếp): đổi
  lại Phase B (mục 6) cho phần còn lại (`a4-l4` → `b5-l3`, 62 bài,
  đã qua Phase A/thực thi, chưa qua Phase B/review). Không còn Gemini
  fact-check + Codex sol review + Codex terra fix tách rời theo từng
  bài; thay bằng: (1) Gemini `agy` fact-check tuần tự từng bài, ghi
  dồn kết quả vào **một file duy nhất**
  `docs/reviews/FEATURE-012-phase-b-review.md`; (2) sau khi file này có
  đủ kết quả review cho toàn bộ 62 bài, giao Codex `gpt-5.6-sol` effort
  `high` đọc phần review tương ứng và **tự cập nhật nội dung**
  `content/units/<file>.json` theo từng Unit (không phải Codex chỉ báo
  cáo/reviewer thuần nữa — theo yêu cầu người dùng, chấp nhận đổi vai
  trò so với nguyên tắc reviewer-only mặc định của kiến trúc); (3)
  commit theo từng Unit (ví dụ A4, A5...) thay vì từng bài. Chi tiết ở
  mục 6 "Phase B" (đã viết lại).
- Architecture version applied: 2.1
  (`docs/architecture/AI_WORKFLOW_ARCHITECTURE.md`, `Status: APPROVED`)
- Risk tier: NORMAL
- Risk categories: non-numeric learning content (lý thuyết định tính,
  không phải bài toán số liệu); sửa nội dung `content/units/*.json` đã
  duyệt trước đây
- Escalation rationale: n/a — nội dung nâng cao là văn bản lý thuyết
  định tính, khớp ví dụ "non-numeric learning content" (NORMAL) trong
  `CLAUDE.md`; không chạm public API, migration, auth hay logic tính
  toán phức tạp. Quy trình 3 lớp Codex soạn → Gemini fact-check →
  Codex chọn lọc (mục 6) là rigor tự nguyện đặc thù của feature này,
  không phải yêu cầu bắt buộc của tier `ELEVATED`.
- Change type: Learning content or content schema (theo bảng
  quality-gates của kiến trúc)
- Quality gates: `git diff --check`; `npm run format:check`;
  `npm run validate-content`; `npm test`; `npm run build` (nội dung
  được import tĩnh vào bundle Vite)

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
- **Model Codex (đổi 2026-07-11, xem mục 6 Phase A/B)**: hai vai trò
  Codex dùng hai model khác nhau, cùng effort `high`:
  - **Thực thi** (nghiên cứu và viết thẳng vào `content/units`, gộp
    vai trò nghiên cứu và viết thẻ cuối trước đây thành một bước):
    `gpt-5.6-terra`, effort `high`.
  - **Review** (đọc lại nội dung đã thực thi, báo cáo phát hiện — CHỈ
    BÁO CÁO, không tự sửa): `gpt-5.6-sol`, effort `high`.

  9 bài A1 đầu tiên đã soạn bằng `gpt-5.5`/Claude tự chọn lọc; 15 bài
  A2→a4-l1 đã soạn bằng `gpt-5.6-terra` (effort `medium` cho nghiên
  cứu, `high` cho viết thẻ cuối) theo quy trình cũ 3 lớp cũ — không
  cần chạy lại. Từ `a4-l2` trở đi áp dụng model/effort mới này.

  **Điều chỉnh 2026-07-12 (giữa batch Phase A)**: Codex báo hết quota
  sử dụng tại `b3-l2` (lúc 03:28 UTC, hẹn reset ~07:01). 48/64 bài
  Phase A còn lại đã xong trước thời điểm này (toàn bộ A4→A12, B1, B2)
  bằng `gpt-5.6-terra` effort `high` — không cần chạy lại. Theo quyết
  định người dùng:
  - Trong lúc chờ Codex reset quota: các bài Phase A còn lại tạm thời
    do **Claude (Sonnet 5) tự viết trực tiếp** thay Codex (qua
    `Agent(subagent_type="claude")`), giữ nguyên yêu cầu nội dung/format
    như Phase A gốc (đọc thẻ/câu hỏi hiện có, không lặp/mâu thuẫn,
    không đktc→đkc, không đổi `questions`/thẻ cơ bản/lesson khác, tự
    chạy validate-content + prettier).
  - Sau khi Codex reset quota: quay lại dùng Codex nhưng đổi model —
    **Thực thi**: `gpt-5.5`, effort `medium` (hạ từ `gpt-5.6-terra`
    effort `high`); **Review** (Phase B): `gpt-5.6-sol`, effort
    `medium` (hạ từ effort `high`) — để tiết kiệm quota sau sự cố hết
    hạn mức.

- **Tách 2 lượt riêng: thực thi rồi mới review** (đổi 2026-07-11).
  Lượt 1 (Phase A) thực thi hết toàn bộ các bài còn lại, tuần tự từng
  bài, KHÔNG dừng review giữa chừng. Lượt 2 (Phase B) mới review, sửa
  và commit — vẫn xử lý **từng bài một** (không gộp nhiều bài vào một
  lần gọi Gemini/Codex review), để mỗi bài được kiểm định đủ sâu thay
  vì lướt nhanh cho đủ số lượng. Không batch song song nhiều bài trong
  cùng một lần gọi agent, ở cả hai lượt.
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
duy nhất.

Với các bài từ `a4-l4` trở đi (theo Phase B đã đổi 2026-07-12, xem mục
6): checklist được đánh dấu **theo Unit**, cùng lúc với commit của
unit đó ở Bước 2 — không đánh dấu từng bài riêng lẻ ngay sau khi
Gemini review xong ở Bước 1 (lúc đó bài mới có review, chưa update +
commit).

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
- [x] `a2-l2` — Oxit: phân loại, gọi tên (mở đầu)
- [x] `a2-l3` — Không khí – sự cháy; nâng cao: bài toán đốt cháy hỗn hợp

### A3 · Hiđro – Nước (`a3-hidro-nuoc`)

- [x] `a3-l1` — Tính chất – điều chế hiđro; phản ứng thế; khử oxit kim loại
- [x] `a3-l2` — Nước: tính chất; phản ứng với kim loại/oxit
- [x] `a3-l3` — Axit – bazơ – muối: định nghĩa, phân loại, gọi tên (mở đầu)
- [x] `a3-l4` — Nâng cao: khử hỗn hợp oxit, bài toán H2 + oxit kim loại

### A4 · Dung dịch (`a4-dung-dich`)

- [x] `a4-l1` — Độ tan; các yếu tố ảnh hưởng
- [x] `a4-l2` — Nồng độ % và nồng độ mol; chuyển đổi
- [x] `a4-l3` — Pha chế – pha loãng dung dịch; quy tắc đường chéo
- [x] `a4-l4` — Nâng cao: tinh thể ngậm nước; bài toán kết tinh
- [x] `a4-l5` — Nâng cao: bài toán dung dịch tổng hợp

### A5 · Oxit (`a5-oxit`)

- [x] `a5-l1` — Phân loại oxit và gọi tên
- [x] `a5-l2` — Tính chất hoá học của oxit bazơ; CaO – vôi
- [x] `a5-l3` — Tính chất hoá học của oxit axit; SO2
- [x] `a5-l4` — Nâng cao: oxit lưỡng tính; bài toán oxit + axit/kiềm

### A6 · Axit (`a6-axit`)

- [x] `a6-l1` — Tính chất hoá học chung của axit
- [x] `a6-l2` — Axit clohiđric HCl
- [x] `a6-l3` — Axit sunfuric: loãng và đặc
- [x] `a6-l4` — Nâng cao: axit tác dụng kim loại và muối
- [x] `a6-l5` — Nâng cao: bài toán hỗn hợp axit, axit đặc – loãng

### A7 · Bazơ (`a7-bazo`)

- [x] `a7-l1` — Tính chất hoá học chung của bazơ; bazơ tan và không tan
- [x] `a7-l2` — Natri hiđroxit NaOH; điều chế
- [x] `a7-l3` — Canxi hiđroxit Ca(OH)2; ứng dụng
- [x] `a7-l4` — Nâng cao: CO2/SO2 tác dụng với dung dịch kiềm
- [x] `a7-l5` — Nâng cao: hiđroxit lưỡng tính Al(OH)3, Zn(OH)2

### A8 · Muối – Phân bón hoá học (`a8-muoi-phan-bon`)

- [x] `a8-l1` — Tính chất hoá học của muối; phản ứng trao đổi
- [x] `a8-l2` — Một số muối quan trọng: NaCl, KNO3, muối cacbonat
- [x] `a8-l3` — Muối axit và muối trung hoà; chuyển đổi qua lại
- [x] `a8-l4` — Phân bón hoá học
- [x] `a8-l5` — Nâng cao: bài toán muối + muối/axit/kiềm

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

## 6. Proposed design — quy trình 1 bài học (đã đổi 2026-07-11: tách lượt thực thi/review, đổi model)

**Thay đổi so với 15 bài A2→a4-l1 (quy trình 3-bước-1-lượt)**: thay vì
xen kẽ nghiên cứu → fact-check → viết cho từng bài rồi mới sang bài kế
tiếp, quy trình mới tách hẳn thành **2 lượt tuần tự**: Phase A chạy
thực thi (viết thẳng) hết toàn bộ các bài còn lại trước; chỉ sau khi
Phase A xong toàn bộ, Phase B mới quay lại review + sửa + commit —
vẫn xử lý từng bài một, không gộp/song song. Claude vẫn chỉ **điều
phối** (gửi task, chờ, xác nhận phạm vi, cập nhật checklist, commit)
— KHÔNG tự đọc/viết lại nội dung thẻ, KHÔNG rà soát sâu từng bài. Rà
soát sâu vẫn dồn vào **một lần duy nhất sau khi cả 81 bài đã xong**
(xem "Rà soát cuối cùng" bên dưới).

### Phase A — Thực thi toàn bộ các bài còn lại (model `gpt-5.6-terra`, effort `high`)

Gộp vai trò nghiên cứu + viết thẻ cuối (trước đây là 2 bước riêng)
thành một bước, viết thẳng vào `content/units/<file>.json` — không
qua file nháp trung gian. Lặp tuần tự từng bài theo đúng thứ tự
checklist mục 4, một `Agent` call/bài, không dừng lại review giữa
chừng, không gộp nhiều bài vào một lần gọi, không chạy song song.

```
Agent(subagent_type="codex:codex-rescue",
      prompt="--cwd /data/Projects/Hoa_hoc_THCS --write --model gpt-5.6-terra
              --effort high
              <task: nghiên cứu và viết thẳng CÀNG NHIỀU kiến thức nâng cao
              càng tốt cho lesson <id> vào content/units/<file>.json>")
```

Yêu cầu nội dung giữ nguyên như quy trình cũ: đọc thẻ + câu hỏi hiện
có để không lặp/mâu thuẫn; viết lại bằng lời văn riêng; áp dụng đúng
quy tắc format thẻ (chủ đề ngắn/cùng mạch → nối vào cuối `body` thẻ cơ
bản liên quan; chủ đề dài/kĩ thuật riêng → thẻ mới `heading` dạng
"Nâng cao: ..."); tổng số thẻ không vượt 25 (trần schema); mục tiêu
khoảng 5–8 thẻ nâng cao/bài (linh hoạt theo nội dung thật, không ép
cứng); KHÔNG áp dụng đktc/22,4 → đkc/24,79; không đổi `questions`,
`id`/`heading` thẻ cơ bản, không đổi lesson khác trong cùng file. Tự
chạy `npm run validate-content && npx prettier --write
content/units/<file>.json` ngay sau mỗi bài, trước khi sang bài kế
tiếp, để lỗi shape lộ ra sớm thay vì dồn tới cuối lượt.

**Chưa** cập nhật checklist mục 4, **chưa** commit trong Phase A —
nội dung ở trạng thái "đã thực thi, chưa review" trong working tree
(nhiều file `content/units/*.json` dirty cùng lúc) cho tới khi qua
Phase B. Nếu phiên bị ngắt giữa Phase A, dùng
`git status --short -- content/units/` để biết bài nào đã thực thi
(file dirty, chưa commit) mà chưa qua Phase B — không cần file theo
dõi riêng, checklist mục 4 vẫn là nguồn trạng thái "đã hoàn thành đủ
chu trình" duy nhất.

### Phase B — Review (agy, 1 file tổng) rồi Codex sol update + commit theo Unit (đổi 2026-07-12, chỉ áp dụng cho phần còn lại `a4-l4` → `b5-l3`)

**Đã đổi so với 3 bài `a4-l1`…`a4-l3`** (dùng quy trình cũ: Gemini
fact-check + Codex sol review-only + Codex terra fix, cả 3 bước và
commit đều theo từng bài) — không chạy lại cho 3 bài đó. Từ `a4-l4`
trở đi, tách thành 2 bước lớn: **Bước 1** review tuần tự từng bài,
dồn hết vào một file; **Bước 2** chỉ bắt đầu sau khi Bước 1 xong toàn
bộ 62 bài, cập nhật nội dung + commit theo từng Unit.

**Bước 1 — Gemini `agy` fact-check tuần tự từng bài, ghi vào 1 file
duy nhất**

File kết quả: `docs/reviews/FEATURE-012-phase-b-review.md` (tạo mới,
xem mục 7). Với mỗi bài, theo đúng thứ tự checklist mục 4 (`a4-l4` →
`b5-l3`), một lời gọi `agy` riêng (không gộp nhiều bài/lần gọi, không
chạy song song — giữ nguyên rủi ro "agy treo với prompt phức tạp" ở
mục 13):

```bash
agy --model "Gemini 3.5 Flash (High)" \
    --add-dir /data/Projects/Hoa_hoc_THCS \
    -p "Fact-check các thẻ 'Nâng cao'/nội dung mở rộng vừa thêm trong
        content/units/<file>.json cho bài <id> (xem git diff của file
        để biết đúng phần mới — nội dung đã thực thi ở Phase A, chưa
        qua review), đối chiếu chương trình Hoá 8/9 và đề thi HSG cấp
        huyện/tỉnh Việt Nam. CHỈ BÁO CÁO — không tự sửa file. Với mỗi
        thẻ: ĐÚNG/SAI/CẦN SỬA kèm lý do cụ thể nếu có vấn đề."
```

Sau mỗi lần gọi, Claude nối kết quả vào cuối
`docs/reviews/FEATURE-012-phase-b-review.md` dưới một heading riêng
cho bài đó (`## <lesson-id>`): giữ **verbatim** mọi finding
SAI/CẦN SỬA (nguyên văn lý do + đề xuất sửa của Gemini, đối chiếu lại
với nội dung thật trong file trước khi ghi để tránh false
positive/negative giữa các lượt gọi agy), tóm tắt ngắn gọn (không bịa
thêm ý) cho các thẻ ĐÚNG — tránh file phình quá lớn qua 62 bài trong
khi vẫn giữ đủ thông tin để Codex sol áp dụng ở Bước 2. KHÔNG cập nhật
checklist mục 4, KHÔNG sửa
`content/units/*.json`, KHÔNG commit trong Bước 1 — chỉ tích luỹ
review. Nếu phiên bị ngắt giữa Bước 1, xem file review đã có heading
tới bài nào để biết resume từ đâu (file này là nguồn trạng thái resume
cho Bước 1, tương tự cách `git status --short -- content/units/` dùng
cho Phase A).

**Bước 2 — Codex `gpt-5.6-sol` (effort `high`) đọc review + tự cập
nhật nội dung + commit, theo từng Unit** (chỉ bắt đầu sau khi Bước 1
đã có review cho đủ toàn bộ 62 bài còn lại)

Với mỗi Unit theo thứ tự A4 → A12 → B1 → B5 (dùng đúng khối lessons
còn lại của unit đó, ví dụ A4 chỉ còn `a4-l4`, `a4-l5`):

1. Trích phần review tương ứng các bài của unit đó từ
   `docs/reviews/FEATURE-012-phase-b-review.md`, dán kèm trong prompt
   Codex (không phải gửi nguyên cả file nếu unit khác không liên
   quan).
2. Giao Codex:

   ```
   Agent(subagent_type="codex:codex-rescue",
         prompt="--cwd /data/Projects/Hoa_hoc_THCS --model gpt-5.6-sol
                 --effort high
                 <task: đọc content/units/<unit-file>.json (các lesson
                 <id...> của unit <UNIT>, xem git diff để biết đúng
                 phần Phase A mới thêm) + báo cáo fact-check Gemini dán
                 kèm trong prompt cho từng bài. Với mỗi finding
                 SAI/CẦN SỬA đã Gemini xác nhận: TỰ SỬA trực tiếp trong
                 file (loại bỏ ứng viên SAI không sửa được đơn giản;
                 sửa lỗi nhỏ theo đúng ghi chú CẦN SỬA). Ứng viên ĐÚNG
                 nhưng không được chọn (trùng ý/vượt trần 25 thẻ/bài):
                 ghi vào docs/content-reserve/<lesson-id>.md theo format
                 file mẫu docs/content-reserve/a1-l1.md — không xoá bỏ.
                 Không đổi questions, id/heading thẻ cơ bản, không đổi
                 lesson ngoài unit này. Chạy npm run validate-content &&
                 npx prettier --write content/units/<unit-file>.json sau
                 khi sửa xong toàn bộ các bài trong unit.>
                 <action_safety>Không commit, không push.</action_safety>")
   ```

3. **Claude Release Readiness Gate cấp Unit (NORMAL, KHÔNG đọc sâu)** —
   xác nhận `git status --short` chỉ đổi đúng file unit dự kiến (kiểm
   tra phạm vi nhẹ, không đọc nội dung); evidence đầy đủ và Independent
   Verification vẫn dồn vào "Rà soát cuối cùng" (dưới).
4. Cập nhật checklist mục 4 (`[x]`) cho **tất cả** các bài của unit đó
   cùng lúc; commit **1 unit/1 commit** (không phải 1 bài/1 commit —
   đổi theo yêu cầu người dùng 2026-07-12), message ngắn gọn nêu số
   bài đã cập nhật trong unit và có/không file dự trữ.

Sang Unit tiếp theo, lặp lại các bước của Bước 2. KHÔNG tự chạy lại
`npm test/lint/typecheck` sau mỗi unit trong Phase B — rerun đầy đủ vẫn
dồn vào "Rà soát cuối cùng" sau khi cả 14 unit còn lại qua hết Bước 2.

### Rà soát cuối cùng (sau khi CẢ 81 bài đã commit) — Validation Model, Evidence Binding, Handoff, Release Readiness

Điểm áp dụng đầy đủ workflow v2.1 cho toàn bộ feature (khác Bước 4 —
chỉ ở cấp từng bài):

1. **Validation Model** (canonical gates cho change type "Learning
   content or content schema", xem mục Status ở trên và kiến trúc
   §Validation Model): chạy đầy đủ một lần
   `npm run validate-content && npm test && npm run lint && npm run
typecheck && npm run build && npm run format:check`.
2. Đọc lại toàn bộ diff tích luỹ (`git diff main...feature/FEATURE-012`
   cho `content/units/`) — không cần đọc từng bài riêng lẻ nhưng phải
   lướt qua toàn bộ để bắt lỗi rõ ràng (định dạng, thẻ trống, lặp lộ
   liễu).
3. Chạy Gemini spot-check một mẫu ngẫu nhiên (ví dụ 8-10 bài rải đều
   Vô cơ/Hữu cơ) để kiểm tra lại chất lượng tổng thể của quy trình mới
   (Codex tự chọn lọc thay Claude) — bổ sung ngoài yêu cầu bắt buộc
   của tier `NORMAL`, không thay thế Independent Verification ở bước 5.
4. Sửa các lỗi phát hiện được ở bước 1–3 (lặp lại bước 1 nếu có sửa).
   Chạy `npm run dev` thử một vài bài trên UI thật để chắc chắn không
   vỡ layout.
5. **Independent verification** (`NORMAL`, kiến trúc §Independent
   Verification; xem `.claude/skills/feature-delivery/SKILL.md`
   §NORMAL): sau khi push commit cuối lên `feature/FEATURE-012`, xác
   nhận GitHub Actions CI (`.github/workflows/ci.yml`) pass cho đúng
   candidate commit SHA. Nếu CI chưa chạy cho commit đó, dùng fallback
   của kiến trúc: một fresh read-only reviewer soi targeted diff và
   rerun gate liên quan.
6. **Evidence Binding + Implementation handoff**: tạo
   `docs/handoffs/FEATURE-012-implementation.md` theo
   `docs/handoffs/_TEMPLATE.md` (bản v2.1) — ghi base commit SHA,
   candidate commit SHA (hoặc `UNCOMMITTED`), dirty-worktree paths,
   thời điểm UTC, phiên bản tool, từng lệnh ở bước 1 kèm exit status và
   gate tương ứng, kết quả Independent Verification ở bước 5.
7. **Claude Release Readiness Gate**: dựa trên handoff ở bước 6, đưa ra
   đánh giá `READY` / `READY WITH RISKS` / `NOT READY` theo kiến trúc.
   Chỉ sau bước này mới coi FEATURE-012 hoàn thành, trình người dùng
   quyết định push/mở PR — Claude không phải người duyệt cuối cùng.

### Vận hành ở quy mô 81 bài

- File plan này (đặc biệt checklist mục 4) là nguồn trạng thái bền
  vững cho các Unit **đã qua Phase B Bước 2** (đã update + commit theo
  unit) — phiên sau đọc lại đúng chỗ đang dang dở. Với các bài **mới
  qua Phase A** (đã thực thi, chưa review), dùng `git status --short --
  content/units/` để biết đang dở ở đâu (xem ghi chú resume ở Phase A).
  Với Phase B **Bước 1** (review, chưa update/commit), dùng số heading
  `## <lesson-id>` đã có trong
  `docs/reviews/FEATURE-012-phase-b-review.md` để biết đã review tới
  bài nào.
- Chạy tuần tự từng bài (Phase A, Phase B Bước 1) hoặc từng unit (Phase
  B Bước 2) trong mỗi lượt (không song song nhiều bài/unit trong cùng
  file để tránh xung đột ghi), nhưng KHÔNG dừng hỏi lại người dùng giữa
  các bài/unit hay giữa các Phase — chỉ dừng nếu Codex/Gemini báo lỗi
  không tự xử lý được, hoặc phát hiện vấn đề hệ thống ở bước rà soát
  cuối.

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
- `docs/reviews/FEATURE-012-phase-b-review.md` (mới, 2026-07-12) —
  file tổng hợp duy nhất chứa báo cáo fact-check Gemini `agy` cho toàn
  bộ 62 bài còn lại (`a4-l4` → `b5-l3`) của Phase B Bước 1, một
  heading `## <lesson-id>` mỗi bài, tạo khi bắt đầu Bước 1.

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
