# FEATURE-012: Đào sâu nội dung lý thuyết nâng cao theo từng bài học

## Status

- Status: APPROVED <!-- DRAFT | APPROVED | SUPERSEDED -->
- Owner: Claude Code
- Approved by: tuann2
- Approved date: 2026-07-10

## 1. Objective

Mở rộng nội dung 3 thẻ lý thuyết hiện có của mỗi bài học (81 bài
`available` trên 17 unit) với kiến thức nâng cao (mức HSG cấp
huyện/tỉnh), do Codex (model `gpt-5.5`) và Gemini (`agy`) cùng nghiên
cứu, Claude tổng hợp — xử lý **tuần tự từng bài một**, không xử lý
hàng loạt, để đảm bảo nội dung được đào sâu, chính xác và không bị
lặp/generic.

## 2. Current system analysis

- Mỗi bài học có đúng 3 thẻ lý thuyết (`lesson.cards: {id, heading,
body}[]`), quy định cứng ở `CLAUDE.md` §Content authoring rules
  ("3 thẻ lý thuyết + 13 câu/bài"). Body hiện tại là text ngắn, gọn
  cho di động (`TheoryCard.tsx` render trong một card cuộn dọc, không
  giới hạn độ dài code nhưng UI hướng "học được trên điện thoại").
- Sau FEATURE-011, mỗi câu hỏi có `category: 'theory' | 'calculation'`
  — 641 câu theory / 412 câu calculation trên 1053 câu. Nhiệm vụ này
  **không đổi câu hỏi**, chỉ mở rộng `body` của 3 thẻ lý thuyết.
- Danh sách 81 bài available, đúng thứ tự xử lý A1→A12 rồi B1→B5, đã
  liệt kê đầy đủ ở mục 4 (checklist tracking).
- Công cụ đã có sẵn trong dự án (theo `CLAUDE.md` §Agent delegation):
  - `codex:codex-rescue` — cần chỉ định `--model gpt-5.5` (xác nhận
    qua `codex-companion.mjs setup --json` và
    `~/.codex/models_cache.json`: model cao nhất thực tế hiện có là
    `gpt-5.5`, không tồn tại "5.6").
  - `agy --model "Gemini 3.5 Flash (High)"` — dùng để nghiên cứu độc
    lập + fact-check, chạy đồng bộ (không background).
- `scripts/validate-content.ts` hiện chỉ kiểm tra shape JSON (số thẻ,
  số câu, trường bắt buộc...), không kiểm tra tính đúng đắn hoá học
  của nội dung mở rộng — việc đó do con người (Claude + Gemini
  cross-check) đảm nhiệm.

## 3. Assumptions (đã chốt với người dùng 2026-07-10)

- **Hình thức bổ sung**: mở rộng nội dung `body` của 3 thẻ hiện có
  (không thêm thẻ mới, không đổi `heading`/số lượng thẻ) — giữ nguyên
  quy tắc "3 thẻ lý thuyết" đã có trong `CLAUDE.md`.
- **Thứ tự xử lý**: Vô cơ trước (A1→A12), rồi Hữu cơ (B1→B5), đúng thứ
  tự chương trình.
- **Model Codex**: `gpt-5.5` (frontier hiện có, không phải "5.6" —
  không tồn tại trong danh sách model thực tế của Codex CLI đã cài).
- **Xử lý tuần tự từng bài** (không batch song song nhiều bài), để mỗi
  bài được nghiên cứu/viết đủ sâu thay vì lướt nhanh cho đủ số lượng.
- **Phạm vi nâng cao = mức HSG cấp huyện/tỉnh**, nhất quán với quy ước
  đã có cho câu hỏi HSG trong `CLAUDE.md` — không vượt xa chương trình
  Hoá 8/9 sang kiến thức THPT không cần thiết.
- Không đổi câu hỏi, không đổi đáp án/lời giải — chỉ mở rộng `body`
  của 3 thẻ. Nếu trong lúc mở rộng phát hiện thẻ cũ có lỗi/thiếu, được
  sửa kèm nhưng phải ghi rõ trong commit message.
- Vì đây là **sửa nội dung đã duyệt trước đây** (rủi ro cao hơn thêm
  mới), mỗi bài đều qua đủ 3 lớp kiểm định trước khi commit: Codex
  soạn → Gemini nghiên cứu/fact-check độc lập → Claude đọc lại toàn bộ
  diff và đối chiếu kiến thức hoá học trước khi chấp nhận.

## 4. Scope — Checklist tracking 81 bài (theo thứ tự xử lý)

Đánh dấu `[x]` khi bài đã hoàn thành đủ chu trình (Codex soạn + Gemini
review + Claude duyệt + validate-content pass + commit). File này là
nguồn theo dõi tiến độ duy nhất — cập nhật ngay sau mỗi bài, không đợi
xong cả unit.

### A1 · Nền tảng hoá học (`a1-nen-tang-hoa-hoc`)

- [x] `a1-l1` — Chất – hỗn hợp – tách chất; nguyên tử, p – n – e
- [x] `a1-l2` — Nguyên tố hoá học – nguyên tử khối; sơ lược bảng tuần hoàn
- [ ] `a1-l3` — Đơn chất – hợp chất – phân tử; CTHH và ý nghĩa
- [ ] `a1-l4` — Hoá trị; lập CTHH theo hoá trị
- [ ] `a1-l5` — Phản ứng hoá học; định luật bảo toàn khối lượng; cân bằng PTHH
- [ ] `a1-l6` — Mol – khối lượng mol – thể tích mol khí; tỉ khối chất khí
- [ ] `a1-l7` — Tính theo CTHH và PTHH: %m, chất dư – chất hết, hiệu suất
- [ ] `a1-l8` — Nâng cao: biện luận tìm nguyên tố/CTHH; cân bằng phản ứng phức tạp
- [ ] `a1-l9` — Nâng cao: bài toán hỗn hợp; tăng – giảm khối lượng; bảo toàn

### A2 · Oxi – Không khí (`a2-oxi-khong-khi`)

- [ ] `a2-l1` — Tính chất – điều chế oxi; phản ứng hoá hợp, phân huỷ
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

## 6. Proposed design — quy trình 1 bài học

Mỗi bài học đi qua đúng trình tự sau (lặp lại cho từng bài trong
checklist, KHÔNG chạy song song nhiều bài để giữ chất lượng):

### Bước 1 — Codex soạn thảo (model `gpt-5.5`)

```
Agent(subagent_type="codex:codex-rescue",
      prompt="--cwd /data/Projects/Hoa_hoc_THCS --write --model gpt-5.5
              <task: mở rộng body của 3 thẻ lesson <id> trong
              content/units/<file>.json>")
```

Yêu cầu cụ thể trong prompt cho mỗi bài:

- Đọc `body` hiện tại của cả 3 thẻ + toàn bộ câu hỏi của bài (để không
  lặp lại/mâu thuẫn nội dung quiz).
- Mở rộng mỗi `body`: giữ phần cơ bản gốc, bổ sung thêm đoạn kiến thức
  nâng cao mức HSG cấp huyện/tỉnh (cơ chế phản ứng sâu hơn, trường hợp
  đặc biệt, mẹo biện luận, lưu ý hay gặp trong đề thi HSG) — đánh dấu
  rõ ranh giới phần nâng cao trong text (ví dụ tiền tố "Nâng cao:" hay
  đoạn riêng) để học sinh đại trà vẫn đọc được phần cơ bản trước.
- Format: text đơn giản, công thức viết dạng CH2=CH2/CH≡CH (không
  LaTeX), giữ giọng văn phù hợp học sinh THCS, không quá dài cho một
  card cuộn trên điện thoại (khuyến nghị mỗi thẻ tăng thêm khoảng
  60–120% độ dài gốc, không nhân đôi lên gấp nhiều lần).
- KHÔNG chạm vào `questions`, `id`, `heading`, cấu trúc file khác.
- Tự chạy `npm run validate-content` sau khi sửa.

### Bước 2 — Gemini nghiên cứu/fact-check độc lập

```bash
agy --model "Gemini 3.5 Flash (High)" \
    --add-dir /data/Projects/Hoa_hoc_THCS \
    -p "Nghiên cứu độc lập + fact-check nội dung nâng cao vừa thêm vào
        3 thẻ lý thuyết bài <id> (đọc git diff), đối chiếu chương
        trình Hoá 8/9 và đề thi HSG cấp huyện/tỉnh Việt Nam. Chỉ ra
        lỗi hoá học (phương trình sai/không cân bằng, khái niệm sai,
        vượt quá phạm vi HSG THCS, mâu thuẫn với câu hỏi có sẵn trong
        bài), và đề xuất bổ sung nếu thấy nội dung còn thiếu góc quan
        trọng. Không cần khen, chỉ liệt kê vấn đề cụ thể."
```

Chạy đồng bộ (không `run_in_background`), theo đúng lưu ý đã có trong
bộ nhớ dự án (agy có thể treo với prompt nhiều phần — giữ prompt gọn,
một nhiệm vụ).

### Bước 3 — Claude tổng hợp và duyệt

- Đọc diff thực tế (`git diff content/units/<file>.json`), đối chiếu
  phát hiện của Gemini.
- Áp dụng sửa trực tiếp nếu Gemini chỉ ra lỗi hoá học cụ thể (thuộc
  quyền "sửa lỗi số liệu/nội dung đã xác nhận" của Claude theo
  `CLAUDE.md`).
- Kiểm tra thủ công: phương trình cân bằng đúng, không mâu thuẫn với
  câu hỏi/đáp án hiện có của bài, độ dài hợp lý cho di động.
- Chạy `npm run validate-content && npx prettier --check
content/units/<file>.json` độc lập.

### Bước 4 — Commit theo từng bài

- 1 commit / 1 bài học (dễ revert riêng lẻ nếu phát hiện lỗi sau này),
  message dạng:
  `content: FEATURE-012 — mở rộng lý thuyết nâng cao <lesson-id>`.
- Cập nhật checklist ở mục 4 (đánh dấu `[x]`) trong CÙNG commit hoặc
  commit theo dõi riêng mỗi vài bài — quyết định lúc chạy để không vỡ
  nhịp, miễn checklist luôn phản ánh đúng trạng thái thật trước khi
  kết thúc phiên làm việc.

### Vận hành ở quy mô 81 bài

- Vì khối lượng lớn, việc chạy toàn bộ 81 bài trải dài qua nhiều lượt
  tương tác/nhiều phiên. File plan này (đặc biệt checklist mục 4) là
  nguồn trạng thái bền vững — phiên sau đọc lại đúng chỗ đang dang dở.
- Đề xuất **thí điểm 2-3 bài đầu tiên** (`a1-l1`, `a1-l2`, `a1-l3`)
  trước, cho người dùng xem kết quả thực tế (diff + nhận xét chất
  lượng) để xác nhận đúng "độ sâu" mong muốn, trước khi chạy tiếp hàng
  loạt phần còn lại của A1 rồi các unit sau.
- Không cần dừng hỏi lại người dùng giữa mỗi bài sau khi đã xác nhận
  chất lượng ở bước thí điểm — chỉ dừng nếu Gemini/Claude phát hiện
  vấn đề không tự xử lý được (ví dụ nội dung mơ hồ về mặt hoá học cần
  người có chuyên môn quyết định).

## 6a. New technology

Không có — không thêm dependency, service hay infra mới. `--model
gpt-5.5` là tham số của Codex CLI đã cài, không phải công nghệ mới.

## 7. Files to create

- Không có file mới ngoài chính `docs/plans/FEATURE-012.md` này (dùng
  luôn làm checklist tracking, không tạo file riêng).

## 8. Files to modify

- `content/units/*.json` (tối đa 17 file, thay đổi dần theo tiến độ
  81 bài) — chỉ mở rộng `body` của các thẻ trong `cards`.
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
